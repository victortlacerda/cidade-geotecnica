import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { PORTAL } from '../scene/terrain.js';

// ---------------------------------------------------------------------------
// A2 — Túnel NATM em corte
// Eixo ao longo de z (do portal para o norte), cortado em x = ax.
// s = distância escavada a partir do portal (m). "Volta" = um avanço de 1,2 m.
// ---------------------------------------------------------------------------
export const NATM = {
  ax: -90, fl: 0, R: 4.2, sp: 3.0, t: 0.3, invD: 1.1, Lr: 1.2,
  zp: PORTAL.zp, N0: 14, NMAX: 20, lagB: 8, lagI: 12,
  box: { x0: -125, x1: -90, z0: -58.5, z1: -12 },
};
const T = { dig: 4.2, muck: 8.0, shot: 7.0, supp: 4.6, inv: 3.6 };
const STARTS = [0, T.dig, T.dig + T.muck, T.dig + T.muck + T.shot, T.dig + T.muck + T.shot + T.supp];
const CYCLE = STARTS[4] + T.inv;
export const NATM_STEP_STARTS = STARTS;

export const NATM_STEPS = [
  { t: 'Escavar o avanço', d: 'A escavadeira desmonta o maciço na calota, a parte de cima da seção, avançando só uma volta de 1,2 m por vez. Avanço curto é o que deixa o terreno se sustentar sozinho por um tempo.' },
  { t: 'Remover a marinha', d: 'O material escavado, a marinha, é carregado nos caminhões e levado para fora pelo portal.' },
  { t: 'Concreto projetado', d: 'O robô projeta concreto sobre a superfície recém-aberta e sela o terreno antes que ele se solte. É o revestimento primário.' },
  { t: 'Cambotas e chumbadores', d: 'Cambotas de aço dão forma e rigidez à seção. Os chumbadores costuram o concreto ao maciço e formam um anel que trabalha junto com o terreno.' },
  { t: 'Fechar o inverso e repetir', d: 'Atrás da frente, a bancada é escavada e o inverso, o fundo da seção, é concretado e fecha o anel. Alvos topográficos medem a convergência, e o ciclo recomeça.' },
];
export const NATM_LABELS = [
  { k: 'calota', t: 'Calota' },
  { k: 'bancada', t: 'Bancada' },
  { k: 'inverso', t: 'Inverso' },
  { k: 'shot', t: 'Concreto projetado' },
  { k: 'girder', t: 'Cambota' },
  { k: 'bolt', t: 'Chumbador' },
  { k: 'conv', t: 'Convergência' },
  { k: 'soil', t: 'Solo residual', fixed: [0, 0] },
  { k: 'rock', t: 'Rocha alterada', fixed: [0, 0] },
  { k: 'cover', t: 'Cobertura', fixed: [0, 0] },
];

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const dm = (c, o = {}) => new THREE.MeshStandardMaterial({
  color: c, roughness: o.r ?? 0.8, metalness: o.m ?? 0.1, side: THREE.DoubleSide, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
});

export function createNATM(engine, section) {
  const { ax, fl, R, sp, t, invD, Lr, zp } = NATM;
  const root = new THREE.Group(); root.visible = false;
  const NS = NATM.NMAX + 2;

  // ------------------------------------------------------------ geometrias (só a metade leste aparece no corte)
  const D = Lr - 0.04;
  const ex = (shape) => new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false, curveSegments: 14 });
  const archShape = (r0, r1) => { const s = new THREE.Shape(); s.absarc(0, sp, r1, 0, Math.PI / 2, false); s.absarc(0, sp, r0, Math.PI / 2, 0, true); s.closePath(); return s; };
  const wallShape = (x0, x1) => { const s = new THREE.Shape(); s.moveTo(x0, fl); s.lineTo(x1, fl); s.lineTo(x1, fl + sp); s.lineTo(x0, fl + sp); s.closePath(); return s; };
  const invR = (R * R + invD * invD) / (2 * invD), invC = fl - invD + invR, invA = Math.asin(R / invR);
  const invShape = () => { const s = new THREE.Shape(); s.absarc(0, invC, invR, -Math.PI / 2, -Math.PI / 2 + invA, false); s.absarc(0, invC, invR - 0.45, -Math.PI / 2 + invA, -Math.PI / 2, true); s.closePath(); return s; };
  const geoArch = ex(archShape(R, R + t)), geoWall = ex(wallShape(R, R + t)), geoInv = ex(invShape());
  const gShape = (r0, r1) => { const s = new THREE.Shape(); s.absarc(0, sp, r1, 0, Math.PI / 2, false); s.absarc(0, sp, r0, Math.PI / 2, 0, true); s.closePath(); return s; };
  const geoGA = new THREE.ExtrudeGeometry(gShape(R - 0.28, R - 0.04), { depth: 0.2, bevelEnabled: false, curveSegments: 14 });
  const geoGW = new THREE.ExtrudeGeometry(wallShape(R - 0.28, R - 0.04), { depth: 0.2, bevelEnabled: false });

  // superfície escavada (sem revestimento) e faces da frente: evitam ver através do túnel
  const rawArch = (() => { const sh = new THREE.Shape(); sh.absarc(0, sp, R + t + 0.3, 0, Math.PI / 2, false); sh.absarc(0, sp, R + t, Math.PI / 2, 0, true); sh.closePath(); return ex(sh); })();
  const rawWall = ex(wallShape(R + t, R + t + 0.3));
  const rawInv = (() => { const sh = new THREE.Shape(); sh.absarc(0, invC, invR + 0.35, -Math.PI / 2, -Math.PI / 2 + invA, false); sh.absarc(0, invC, invR, -Math.PI / 2 + invA, -Math.PI / 2, true); sh.closePath(); return ex(sh); })();
  const rawMat = dm(0x9d7d5b, { r: 1, m: 0 }), rawMatR = dm(0xa59a88, { r: 1, m: 0 });
  const faceShapeC = (() => { const sh = new THREE.Shape(); sh.moveTo(0, fl + sp); sh.lineTo(R + t, fl + sp); sh.absarc(0, fl + sp, R + t, 0, Math.PI / 2, false); sh.lineTo(0, fl + sp); return sh; })();
  const faceShapeB = (() => { const sh = new THREE.Shape(); sh.moveTo(0, fl); sh.lineTo(R + t, fl); sh.lineTo(R + t, fl + sp); sh.lineTo(0, fl + sp); sh.closePath(); return sh; })();
  const faceShapeI = (() => { const sh = new THREE.Shape(); sh.moveTo(0, fl); sh.lineTo(R, fl); sh.absarc(0, invC, invR, -Math.PI / 2 + invA, -Math.PI / 2, true); sh.closePath(); return sh; })();
  const faceC = new THREE.Mesh(new THREE.ShapeGeometry(faceShapeC, 14), dm(0xa6845f, { r: 1, m: 0 }));
  const faceB = new THREE.Mesh(new THREE.ShapeGeometry(faceShapeB), rawMatR);
  const faceI = new THREE.Mesh(new THREE.ShapeGeometry(faceShapeI, 10), rawMatR);
  const planeG = new THREE.PlaneGeometry(1, 1); planeG.rotateX(-Math.PI / 2);
  const benchTop = new THREE.Mesh(planeG, dm(0xa89a84, { r: 1, m: 0 })), floorP = new THREE.Mesh(planeG, dm(0x9a8f7e, { r: 1, m: 0 }));
  [faceC, faceB, faceI, benchTop, floorP].forEach((m) => { m.position.x = ax; root.add(m); });
  benchTop.position.x = ax + (R + t) / 2; floorP.position.x = ax + (R + t) / 2;
  benchTop.scale.x = floorP.scale.x = R + t;

  const ramp = new THREE.Mesh(planeG, dm(0xa89a84, { r: 1, m: 0 }));
  const RAMP_L = 3.5, rampAng = Math.atan(sp / RAMP_L);
  ramp.rotation.x = rampAng; ramp.scale.set(R + t - 0.2, 1, Math.hypot(RAMP_L, sp)); root.add(ramp);
  const floorY = (sPos, sBench) => (sPos >= sBench + RAMP_L ? sp : sPos <= sBench ? 0 : sp * (sPos - sBench) / RAMP_L);

  const WET = new THREE.Color(0x77736a), CURED = new THREE.Color(0xb9b4a8), INVC = new THREE.Color(0x9a958b);
  const cGirder = dm(0x3b4047, { r: 0.5, m: 0.5 });
  const slots = [];
  for (let k = 0; k < NS; k++) {
    const zS = zp - (k + 1) * Lr + 0.02;
    const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.position.set(ax, 0, zS); m.visible = false; root.add(m); return m; };
    const mA = dm(0xb9b4a8), mW = dm(0xb9b4a8), mI = dm(0x9a958b);
    const gz = zS + 0.4;
    const ga = new THREE.Mesh(geoGA, cGirder), gw = new THREE.Mesh(geoGW, cGirder);
    [ga, gw].forEach((g) => { g.position.set(ax, 0, gz); g.visible = false; root.add(g); });
    slots.push({
      zS, zMid: zp - (k + 0.5) * Lr,
      arch: mk(geoArch, mA), wall: mk(geoWall, mW), inv: mk(geoInv, mI), ga, gw,
      rawA: mk(rawArch, rawMat), rawW: mk(rawWall, rawMat), rawI: mk(rawInv, rawMat),
      mA, mW, mI, tA: -999, tW: -999, tI: -999,
    });
  }
  // chumbadores (5 por volta, lado leste) e alvos de convergência
  const boltDefs = [];
  for (const a of [0.26, 0.78, 1.3]) boltDefs.push({ dx: Math.cos(a), dy: Math.sin(a), cx: 0, cy: sp, r0: R - 0.15, wall: false });
  for (const y of [0.9, 2.1]) boltDefs.push({ dx: 1, dy: 0, cx: 0, cy: y, r0: R - 0.15 - 0, wall: true });
  const NB = NS * boltDefs.length;
  const bolts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.065, 0.065, 2.9, 6), dm(0x25282c, { r: 0.5, m: 0.6 }), NB);
  const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.34, 0.34), dm(0x25282c, { r: 0.5, m: 0.6 }), NB);
  bolts.frustumCulled = plates.frustumCulled = false; root.add(bolts, plates);
  const bm = new THREE.Matrix4(), qa = new THREE.Quaternion(), vz = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  function setBolt(k, j, f) {
    const b = boltDefs[j], i = k * boltDefs.length + j;
    if (f <= 0) { bm.makeScale(0, 0, 0); bolts.setMatrixAt(i, bm); plates.setMatrixAt(i, bm); return; }
    const dir = new THREE.Vector3(b.dx, b.dy, 0);
    qa.setFromUnitVectors(vz, dir);
    const slide = (1 - f) * 2.0; // entra de dentro para fora
    const c = b.r0 + 1.45 - slide;
    pos.set(ax + b.cx + dir.x * c, fl + b.cy + dir.y * c, slots[k].zMid);
    bm.compose(pos, qa, sc); bolts.setMatrixAt(i, bm);
    const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    pos.set(ax + b.cx + dir.x * (b.r0 + 0.02 - slide), fl + b.cy + dir.y * (b.r0 + 0.02 - slide), slots[k].zMid);
    bm.compose(pos, q2, sc); plates.setMatrixAt(i, bm);
  }
  const tgMat = dm(0xe23b2e, { e: 0xe23b2e, ei: 0.7 });
  const targets = [];
  for (let k = 0; k < NS; k += 4) {
    const grp = new THREE.Group();
    for (const [x, y] of [[R - 0.1, fl + 1.5], [R * Math.cos(0.8) - 0.1, fl + sp + R * Math.sin(0.8) - 0.1]]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), tgMat); m.position.set(ax + x, y, slots[k].zMid); grp.add(m);
    }
    grp.visible = false; root.add(grp); targets.push({ k, grp });
  }

  // ------------------------------------------------------------ máquinas
  const exc = M.excavator(0.64); exc.group.rotation.y = Math.PI / 2; root.add(exc.group);
  const truck = M.dumpTruck(); truck.scale.setScalar(0.7); root.add(truck);
  const load = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.0, 2.4), dm(0x8a6f52, { r: 1, m: 0 })); load.position.set(2.1, 1.4, 0);
  truck.userData.bed.add(load);
  const pile = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), dm(0x8a6f52, { r: 1, m: 0 })); root.add(pile);

  const robot = new THREE.Group(); root.add(robot);
  const yel = dm(0xf2b705, { r: 0.55 }), dk = dm(0x2f3237, { r: 0.6 }), gry = dm(0x8d939b, { r: 0.6 });
  const rb = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); robot.add(o); return o; };
  rb(1.7, 0.8, 4.6, yel, 0, 0.95, 0); rb(1.8, 0.25, 4.7, dk, 0, 0.5, 0);
  for (const sx of [-0.85, 0.85]) for (const sz of [-1.6, 1.6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), dk); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.42, sz); robot.add(w); }
  rb(1.3, 1.3, 1.4, gry, 0, 1.9, 1.5); rb(0.9, 0.7, 0.05, new THREE.MeshStandardMaterial({ color: 0x86b8d8 }), 0, 2.0, 0.78);
  const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.55, 14), dk); tur.position.set(0, 1.6, -1.4); robot.add(tur);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1), yel); root.add(arm);
  const nozz = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.5, 8), dk); root.add(nozz);
  const NSP = 46, spray = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 6, 5), dm(0x9a968c, { r: 1, m: 0 }), NSP);
  spray.frustumCulled = false; root.add(spray);
  const tmp = new THREE.Vector3(), tm = new THREE.Matrix4();

  noShadow(root);
  function noShadow(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } }); }

  // luz suave dentro do túnel
  const lamp = new THREE.PointLight(0xfff1d6, 22, 30, 1.8); root.add(lamp);

  // ------------------------------------------------------------ estado
  const st = { active: false, speed: 1, paused: false, n0: NATM.N0, nC: NATM.N0, tc: 0, simT: 0, hold: 0, tDig: 0, step: 0, progress: 0, sC: 0 };
  const anchors = Object.fromEntries(NATM_LABELS.map((l) => [l.k, new THREE.Vector3()]));

  function reset() {
    st.nC = st.n0; st.tc = 0; st.hold = 0;
    slots.forEach((s) => { s.tA = s.tW = s.tI = -999; });
  }
  const wetMix = (mat, t0, cured, now) => { const f = clamp01((now - t0) / 20); mat.color.copy(WET).lerp(cured, f); };

  function update(dt) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    st.simT += k;
    if (st.hold > 0 && st.tc < CYCLE - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) reset(); } else st.tc += k;
    if (st.tc >= CYCLE) {
      st.tc -= CYCLE; st.nC += 1;
      if (st.nC >= NATM.NMAX) { st.hold = 3.5; st.nC = NATM.NMAX - 1; st.tc = CYCLE - 0.001; }
    }
    const tc = st.tc, nC = st.nC;
    let phase = 4;
    for (let i = 0; i < 4; i++) if (tc < STARTS[i + 1]) { phase = i; break; }
    const ts = tc - STARTS[phase], dur = [T.dig, T.muck, T.shot, T.supp, T.inv][phase];
    st.step = phase; st.progress = ts / dur;

    const u = phase === 0 ? ease(ts / T.dig) : 1;
    const sC = (nC + u) * Lr; st.sC = sC;
    const w = phase === 4 ? ease(ts / T.inv) : 0;
    const sB = Math.max(0, (nC - NATM.lagB + w) * Lr), sI = Math.max(0, (nC - NATM.lagI + w) * Lr);
    const zf = zp - sC;
    section.setBand(0, zf, zp + 0.05, fl + sp, fl + sp + R + t);
    section.setBand(1, zp - sB, zp + 0.05, fl, fl + sp);
    section.setBand(2, zp - sI, zp + 0.05, fl - invD, fl);

    // ---- faces da frente e pisos de escavação
    faceC.position.z = zf + 0.02; faceB.position.z = zp - sB + 0.02; faceI.position.z = zp - sI + 0.02;
    faceB.visible = sB > 0.05 && sB < sC - 0.05; faceI.visible = sI > 0.05 && sI < sB - 0.05; faceC.visible = true;
    const lenT = Math.max(0, sC - sB), lenF = Math.max(0, sB - sI);
    benchTop.visible = lenT > 0.05; benchTop.scale.z = Math.max(0.01, lenT); benchTop.position.set(ax + (R + t) / 2, fl + sp + 0.01, zp - sB - lenT / 2);
    floorP.visible = lenF > 0.05; floorP.scale.z = Math.max(0.01, lenF); floorP.position.set(ax + (R + t) / 2, fl + 0.01, zp - sI - lenF / 2);

    ramp.visible = sB > 0.05 && sC > sB + RAMP_L + 0.5;
    ramp.position.set(ax + 0.2 + (R + t - 0.2) / 2, fl + sp / 2 + 0.02, zp - sB - RAMP_L / 2);
    faceB.visible = false;
    benchTop.visible = (sC - sB - RAMP_L) > 0.05;
    const lenT2 = Math.max(0, sC - sB - RAMP_L);
    benchTop.scale.z = Math.max(0.01, lenT2); benchTop.position.set(ax + (R + t) / 2, fl + sp + 0.01, zp - sB - RAMP_L - lenT2 / 2);

    // ---- escavadeira
    if (phase === 0) st.tDig += k;
    exc.group.position.set(ax + 2.75, fl + 0.05 + floorY(sC - 5.2, sB), zf + 5.2);
    exc.update(st.tDig * 1.3);

    // ---- marinha e caminhão
    let pileS = phase === 0 ? 0.12 + 0.88 * u : 0;
    const park = zp + 10.5, laneX = ax + 1.0;
    let tz = park, tRy = Math.PI / 2, loaded = 0;
    const zLoad = zf + 4.4;
    if (phase === 1) {
      const a = T.muck, tIn = 3.0, tLd = 1.6;
      if (ts < tIn) { tz = park + (zLoad - park) * ease(ts / tIn); pileS = 1; }
      else if (ts < tIn + tLd) { tz = zLoad; const f = (ts - tIn) / tLd; pileS = 1 - f; loaded = f; tRy = Math.PI / 2 + (-Math.PI) * ease((f - 0.6) / 0.4); }
      else { const f = ease((ts - tIn - tLd) / (a - tIn - tLd)); tz = zLoad + (park - zLoad) * f; tRy = -Math.PI / 2; loaded = 1; pileS = 0; }
      if (ts >= tIn + tLd) tRy = -Math.PI / 2;
    }
    if (phase === 1) { /* tRy já calculado */ }
    else if (phase === 2) tRy = -Math.PI / 2 + Math.PI * ease(ts / 1.2);
    else tRy = Math.PI / 2;
    truck.position.set(laneX, fl + 0.35 + floorY(zp - tz, sB), tz); truck.rotation.y = tRy;
    load.visible = loaded > 0.05; load.scale.y = Math.max(0.05, loaded);
    truck.userData.bed.rotation.z = 0;
    pile.visible = pileS > 0.03;
    pile.position.set(ax + 1.3, fl, zf + 1.6); pile.scale.set(2.0 * pileS, 1.1 * pileS, 2.0 * pileS);

    // ---- robô de concreto projetado
    const rParkX = ax + 5.6, rParkZ = zp + 7.0, rZ = zf + 4.3, rX = ax + 1.0;
    let rx = rParkX, rz = rParkZ;
    const mv = (a, b, f) => a + (b - a) * f;
    if (phase === 2) {
      const f = ease(ts / 2.8);
      if (f < 0.25) { rx = mv(rParkX, rX, f / 0.25); rz = rParkZ; } else { rx = rX; rz = mv(rParkZ, rZ, (f - 0.25) / 0.75); }
      if (ts >= 2.8) { rx = rX; rz = rZ; }
    } else if (phase === 3) {
      const f = ease(ts / 2.8);
      if (ts >= 2.8) { rx = rParkX; rz = rParkZ; }
      else if (f < 0.75) { rx = rX; rz = mv(rZ, rParkZ, f / 0.75); } else { rz = rParkZ; rx = mv(rX, rParkX, (f - 0.75) / 0.25); }
    }
    robot.position.set(rx, fl + 0.02 + floorY(zp - rz, sB), rz); robot.rotation.y = 0;
    // braço e jato
    const spraying = phase === 2 && ts > 3.0 && ts < 6.6;
    const slot = slots[Math.min(nC, NS - 1)];
    const q = ((ts - 3.0) / 3.4) * 2, tri = 1 - Math.abs((((q % 2) + 2) % 2) - 1);
    const phi = (spraying ? tri : 0.5) * (Math.PI / 2) * 0.96 + 0.06;
    const ry0 = floorY(zp - rz, sB);
    const pv = new THREE.Vector3(rx, fl + 1.95 + ry0, rz - 1.4);
    const nzp = new THREE.Vector3(ax + (R - 1.5) * Math.cos(phi), fl + sp + (R - 1.5) * Math.sin(phi), slot.zMid + 0.3);
    const tgt = new THREE.Vector3(ax + R * Math.cos(phi), fl + sp + R * Math.sin(phi), slot.zMid);
    const armOn = phase === 2 && ts > 2.0 || (phase === 3 && ts < 2.0);
    if (armOn && !(phase === 2 && ts < 2.8 && false)) {
      const e = phase === 2 ? clamp01((ts - 2.0) / 1.0) : 1 - clamp01(ts / 2.0);
      const hold = new THREE.Vector3(rx, fl + 2.8 + ry0, rz - 3.4);
      const np = new THREE.Vector3().lerpVectors(hold, nzp, ease(e));
      arm.visible = nozz.visible = true;
      arm.position.copy(pv).add(np).multiplyScalar(0.5); arm.scale.z = pv.distanceTo(np); arm.lookAt(np);
      nozz.position.copy(np); nozz.lookAt(tgt); nozz.rotateX(Math.PI / 2);
    } else {
      const np = new THREE.Vector3(rx, fl + 2.8 + ry0, rz - 3.4);
      arm.visible = nozz.visible = true;
      arm.position.copy(pv).add(np).multiplyScalar(0.5); arm.scale.z = pv.distanceTo(np); arm.lookAt(np);
      nozz.position.copy(np); nozz.rotation.set(Math.PI / 2, 0, 0);
    }
    for (let i = 0; i < NSP; i++) {
      if (!spraying) { tm.makeScale(0, 0, 0); spray.setMatrixAt(i, tm); continue; }
      const f = (st.simT * 2.4 + i / NSP) % 1;
      tmp.lerpVectors(nzp, tgt, f); tmp.x += Math.sin(i * 12.9 + f * 9) * 0.12; tmp.z += Math.cos(i * 7.3) * 0.18;
      tm.makeTranslation(tmp.x, tmp.y, tmp.z); spray.setMatrixAt(i, tm);
    }
    spray.instanceMatrix.needsUpdate = true;

    // ---- revestimento, cambotas, chumbadores, alvos
    const wallDone = nC - NATM.lagB, invDone = nC - NATM.lagI;
    for (let i = 0; i < NS; i++) {
      const s = slots[i];
      let archOn = i < nC, girOn = i < nC;
      if (i === nC && phase >= 2) {
        if (phase === 2 && ts > 4.4) { archOn = true; if (s.tA < -900) s.tA = st.simT; }
        if (phase >= 3) { archOn = true; if (s.tA < -900) s.tA = st.simT; }
        if (phase >= 3) girOn = true;
      }
      if (i < nC && s.tA < -900) s.tA = st.simT - 25;
      s.arch.visible = archOn; if (archOn) wetMix(s.mA, s.tA, CURED, st.simT);
      s.rawA.visible = i < nC || (i === nC && (phase >= 1 || u > 0.3));
      let gs = 1;
      if (i === nC && phase === 3) gs = ease(ts / 1.0);
      s.ga.visible = girOn;
      s.gw.visible = girOn && (i < wallDone || (i === wallDone && phase === 4 && w > 0.25));
      s.ga.scale.set(gs, gs, 1); s.gw.scale.set(gs, gs, 1);
      s.ga.position.x = s.gw.position.x = ax;

      let wallOn = i < wallDone;
      if (i === wallDone && phase === 4 && w > 0.25) { wallOn = true; if (s.tW < -900) s.tW = st.simT; }
      if (i < wallDone && s.tW < -900) s.tW = st.simT - 25;
      s.wall.visible = wallOn; if (wallOn) wetMix(s.mW, s.tW, CURED, st.simT);
      s.rawW.visible = i < wallDone || (i === wallDone && phase === 4 && w > 0.02);
      let invOn = i < invDone;
      if (i === invDone && phase === 4 && w > 0.5) { invOn = true; if (s.tI < -900) s.tI = st.simT; }
      if (i < invDone && s.tI < -900) s.tI = st.simT - 25;
      s.inv.visible = invOn; if (invOn) wetMix(s.mI, s.tI, INVC, st.simT);
      s.rawI.visible = i < invDone || (i === invDone && phase === 4 && w > 0.02);

      for (let j = 0; j < boltDefs.length; j++) {
        let f = i < nC ? 1 : 0;
        if (i === nC && phase === 3) f = clamp01((ts - 1.0 - j * 0.4) / 0.4);
        if (i === nC && phase === 4) f = 1;
        if (boltDefs[j].wall) { const okW = i < wallDone || (i === wallDone && phase === 4 && w > 0.25); if (!okW) f = 0; }
        setBolt(i, j, ease(f));
      }
    }
    bolts.instanceMatrix.needsUpdate = true; plates.instanceMatrix.needsUpdate = true;
    for (const tg of targets) tg.grp.visible = tg.k < nC && tg.k < wallDone;

    // ---- luz e âncoras de rótulos
    lamp.position.set(ax - 4, fl + 4, zf + 8);
    const last = slots[Math.max(0, nC - 1)], prev = slots[Math.max(0, nC - 3)];
    anchors.calota.set(ax, fl + sp + R * 0.8, zf + 3.2);
    anchors.bancada.set(ax, fl + 1.5, zp - sB + 1.6);
    anchors.inverso.set(ax, fl - 0.6, zp - sI + 1.4);
    anchors.shot.set(ax + 0.1, fl + sp + R + 0.15, prev.zMid);
    anchors.girder.set(ax + 1.2, fl + sp + R * 0.96, last.zMid);
    anchors.bolt.set(ax + (R + 2.1) * Math.cos(0.78), fl + sp + (R + 2.1) * Math.sin(0.78), prev.zMid);
    const tk = Math.max(0, Math.floor((nC - 2) / 4) * 4);
    anchors.conv.set(ax + R - 0.1, fl + 1.5, slots[tk].zMid);
    anchors.soil.set(ax, fl + 6.0, zf - 4.5);
    anchors.rock.set(ax, fl + 0.6, zf - 4.5);
    anchors.cover.set(ax, fl + 8.3, zp - 2.2);
  }

  return {
    group: root, state: st, anchors, update,
    enter(o) { st.n0 = o?.n0 ?? NATM.N0; st.active = true; root.visible = true; reset(); st.simT = 0; st.tDig = 0; },
    exit() { st.active = false; root.visible = false; },
  };
}
