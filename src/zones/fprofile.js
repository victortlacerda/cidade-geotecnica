import * as THREE from 'three';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person } from './fund.js';
import { X1F, HOLE_F } from './fterra.js';

// ---------------------------------------------------------------------------
// Motor de perfil (zona F). A seção em x = X1F mostra um corte vertical do terreno ao longo de z; o perfil é o mesmo
// ao longo de x (prisma). Cada obra fornece `column(z, t, o)`, que devolve as faixas de material (de baixo para cima)
// e a cor da superfície, e `update(c)`, que posiciona máquinas, textos e âncoras.
// ---------------------------------------------------------------------------
export const Z0 = -58, Z1 = -6, DZ = 0.5, NZ = Math.round((Z1 - Z0) / DZ) + 1, NB = 10;
export const XB = X1F - 0.05, XC = X1F - 0.02, XEP = -5.5, XP = X1F - 0.045;
export const ZCF = -32;
export const col = (h) => new THREE.Color(h);

export function createProfile(engine, section, cfg) {
  const geo = cfg.geo || { x1: X1F, xe: XEP, hole: HOLE_F };
  const X1 = geo.x1, XE = geo.xe, HOLE = geo.hole, XB = X1 - 0.05, XC = X1 - 0.02, XP = X1 - 0.045;
  const root = new THREE.Group(); root.visible = false;
  const YB = cfg.yb ?? 0, zo = cfg.zo || 0;   // zo: deslocamento do perfil em z (zona G fica em z > 0)
  const ZS = Array.from({ length: NZ }, (_, i) => Z0 + zo + i * DZ), ys = new Float32Array(NZ);
  const surf = (z) => { const f = clamp01((z - zo - Z0) / (Z1 - Z0)) * (NZ - 1), i = Math.min(NZ - 2, Math.floor(f)), q = f - i; return ys[i] * (1 - q) + ys[i + 1] * q; };

  const mkGeo = (nv) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nv * 3), 3)); return g; };
  const vm = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide });
  const topG = mkGeo(NZ * 2), capG = mkGeo(NB * NZ * 2), bkG = mkGeo(NB * NZ * 2);
  const idx = (nb, flip) => { const a = []; for (let b = 0; b < nb; b++) for (let i = 0; i < NZ - 1; i++) { const o = (b * NZ + i) * 2, A = o, B = o + 1, C = o + 2, D = o + 3; if (flip) a.push(A, C, B, B, C, D); else a.push(A, B, C, B, D, C); } return a; };
  topG.setIndex(idx(1, true)); capG.setIndex(idx(NB, false)); bkG.setIndex(idx(NB, true));
  const topM = vm(), capM = vm(), bkM = vm(); capM.userData.noClip = true; capM.emissive = new THREE.Color(0x3a2a18);
  const top = new THREE.Mesh(topG, topM), cap = new THREE.Mesh(capG, capM), bk = new THREE.Mesh(bkG, bkM);
  top.receiveShadow = true; top.castShadow = true; cap.renderOrder = 2; [top, cap, bk].forEach((m) => { m.frustumCulled = false; root.add(m); });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(HOLE[1] - HOLE[0], HOLE[3] - HOLE[2]), mat(0x6f9c50, { r: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set((HOLE[0] + HOLE[1]) / 2, -0.004, (HOLE[2] + HOLE[3]) / 2); ground.receiveShadow = true; root.add(ground);

  // --- ajudantes para as obras
  const place = (o, x, z, yaw, dy = 0) => { const y = surf(z), s = surf(z + 0.6) - surf(z - 0.6); o.position.set(x, y + dy, z); o.rotation.set(Math.atan(-s / 1.2), yaw, 0); };
  const bar2 = (z0, y0, z1, y1, th, m, ro = 7, x = XP) => {
    const a = new THREE.Vector3(x, y0, z0), b = new THREE.Vector3(x, y1, z1);
    const o = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), m); o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.z = Math.max(0.001, a.distanceTo(b)); o.lookAt(b); o.renderOrder = ro; return o;
  };
  const dash = (pts, th, m, ro = 8, seg = 0.75) => {
    const out = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const [za, ya] = pts[k], [zb, yb] = pts[k + 1], L = Math.hypot(zb - za, yb - ya), n = Math.max(1, Math.round(L / seg));
      for (let j = 0; j < n; j++) { const a = (j + 0.1) / n, b = (j + 0.75) / n, m1 = bar2(za + (zb - za) * a, ya + (yb - ya) * a, za + (zb - za) * b, ya + (yb - ya) * b, th, m, ro); m1.visible = false; root.add(m1); out.push(m1); }
    }
    return out;
  };
  const tree = (x, z, y, s = 1) => {
    const gr = new THREE.Group(), tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.3, 6), mat(0x6a4a2c)); tr.position.y = 0.65; gr.add(tr);
    const fo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0 * s, 0), mat(0x3f8a45, { r: 1 })); fo.position.y = 2.0; fo.castShadow = true; gr.add(fo); gr.position.set(x, y, z); root.add(gr); return gr;
  };
  const stake = (x, z, y) => {
    const g = new THREE.Group(), p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 6), mat(0xf3e9d2)); p.position.y = 0.65; g.add(p);
    const tp = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 6), mat(0xd8332a)); tp.position.y = 1.4; g.add(tp); g.position.set(x, y, z); g.visible = false; root.add(g); return g;
  };
  const H = { root, surf, place, bar2, dash, tree, stake, ZS, engine, section, person, X1, XE, XP };

  const W = cfg.build(H);                                   // { column, update, anchors, vis, hs }
  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(cfg.labels.map((l) => [l.k, new THREE.Vector3()]));
  const o = { lo: new Float32Array(NB), hi: new Float32Array(NB), c: Array.from({ length: NB }, () => new THREE.Color()), top: 0, topC: new THREE.Color() };
  const cp = capG.attributes.position, cc = capG.attributes.color, bp = bkG.attributes.position, bc = bkG.attributes.color, tp = topG.attributes.position, tc = topG.attributes.color;

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < cfg.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= cfg.END && st.hold <= 0) { st.tc = cfg.END - 0.001; st.hold = 3.5; }
    const t = st.tc;
    terrainHoles[0].set(HOLE[0], HOLE[1], HOLE[2], HOLE[3]); section.setBand(0, 0, 0, 0, 0);
    for (let i = 0; i < NZ; i++) {
      const z = ZS[i]; o.lo.fill(0); o.hi.fill(0); o.top = 0;
      W.column(z, t, o);
      ys[i] = o.top + 0.002;
      for (let b = 0; b < NB; b++) {
        const v = (b * NZ + i) * 2, lo = o.lo[b], hi = Math.max(lo, o.hi[b]);
        cp.setXYZ(v, XC, lo, z); cp.setXYZ(v + 1, XC, hi, z); bp.setXYZ(v, XE, lo, z); bp.setXYZ(v + 1, XE, hi, z);
        const cl = o.c[b]; cc.setXYZ(v, cl.r, cl.g, cl.b); cc.setXYZ(v + 1, cl.r, cl.g, cl.b); bc.setXYZ(v, cl.r * 0.8, cl.g * 0.8, cl.b * 0.8); bc.setXYZ(v + 1, cl.r * 0.8, cl.g * 0.8, cl.b * 0.8);
      }
      tp.setXYZ(2 * i, XB, ys[i], z); tp.setXYZ(2 * i + 1, XE, ys[i], z); tc.setXYZ(2 * i, o.topC.r, o.topC.g, o.topC.b); tc.setXYZ(2 * i + 1, o.topC.r, o.topC.g, o.topC.b);
    }
    [capG, bkG, topG].forEach((g) => { g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; }); topG.computeVertexNormals();
    const c = { t, tAbs, st, note: '', label: null };
    W.update(c);
    const S = cfg.starts; let step = 0; for (let i = 0; i < S.length; i++) if (t >= S[i]) step = i;
    st.step = step; st.progress = win(t, S[step], S[step + 1] ?? cfg.END);
    st.note = c.note || (W.idle ? W.idle(t) : '');
    W.anchors(anchors, t);
  }
  const labelVis = (kx, t = st.tc) => { const f = W.vis[kx]; return f ? f(t) : true; };
  const hideName = cfg.hide || 'f-terra';
  return {
    group: root, state: st, anchors, update, labelVis, surf,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; const g = engine.scene.getObjectByName(hideName); if (g) g.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); const g = engine.scene.getObjectByName(hideName); if (g) g.visible = true; },
  };
}
export { ease, clamp01, win, mat, noclip, person };
