import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip } from './fund.js';
import { X1, PZ, SITE_BOX, vplane, buildSurroundings } from './dsite.js';
import { createPitKit, rigPlacer, wallFaceStd } from './dkit.js';
import { hideDPit, showDPit } from './dpit.js';

// ---------------------------------------------------------------------------
// D4 — Cortina de estacas em balanço (sem escoras nem tirantes). Escavação de 3,6 m;
// a cortina se desloca para dentro da cava (deslocamento ampliado) e aparecem os diagramas de empuxo.
// ---------------------------------------------------------------------------
const HW = 7.5, PX = 13, R = 0.5, P = 1.2, ZP = HW + R - 0.05, TOPB = -0.7, LEN = 9, DMAX = 3.6, YP = -8.0, DTOP = 0.5;
const T = { p0: 2, dt: 0.5, beam0: 24, beam1: 29, s2: 30, exc: [30, 34], crane: [36, 40], wins: [[40, 56], [60, 68]], deps: [2.2, 1.4], s3: 68, END: 100 };
export const D4 = { box: SITE_BOX };
export const D4_STEP_STARTS = [0, T.s2, T.s3];
export const D4_STEPS = [
  { t: 'Executar a cortina com bastante embutimento', d: 'A cortina em balanço não tem escoras nem tirantes: ela se sustenta só pela parte enterrada, a ficha. Por isso as estacas descem bem mais abaixo do fundo da escavação do que nas outras cortinas, e a viga de coroamento liga as cabeças das estacas.' },
  { t: 'Escavar sem apoio', d: 'A escavação desce em poucas etapas, sem nenhum apoio. A cortina fica livre como uma haste engastada no solo. Como não tem apoio, só serve para escavações rasas: quanto mais fundo, maior o empuxo e o deslocamento do topo.' },
  { t: 'Empuxo, deslocamento e embutimento', d: 'O solo de trás empurra a cortina (empuxo ativo). O solo abaixo do fundo da cava resiste (empuxo passivo) e segura a ficha. Mesmo estável, a cortina se inclina para dentro da cava; no desenho esse deslocamento está ampliado. O terreno atrás trinca e recalca, e é isso que ameaça o que está por perto.' },
];
export const D4_LABELS = [
  { k: 'cortina', t: 'Cortina em balanço' },
  { k: 'ficha', t: 'Ficha (embutimento)' },
  { k: 'ativo', t: 'Empuxo ativo (solo empurra)' },
  { k: 'passivo', t: 'Empuxo passivo (solo resiste)' },
  { k: 'desloc', t: 'Deslocamento do topo' },
  { k: 'trinca', t: 'Trincas no terreno' },
  { k: 'cacamba', t: 'Caçamba içada' },
  { k: 'predio', t: 'Prédio vizinho' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const D4_CAM = { tx: X1, ty: 3, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 57 };
export const D4_MCAM = { tx: X1, ty: -1, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 120 };

export function createD4(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const sur = buildSurroundings(root);
  const piles = [];
  for (let i = 0; i <= 10; i++) piles.push({ x: X1 + P * i, z: PZ - ZP, w: 0, s: -1 });
  for (let i = 0; i <= 10; i++) piles.push({ x: X1 + P * i, z: PZ + ZP, w: 1, s: 1 });
  for (let i = 0; i <= 11; i++) piles.push({ x: X1 + PX + R - 0.05, z: PZ - HW + 0.5 + 1.2 * i, w: 2, s: 0 });
  const NP = piles.length;
  const ts = []; { let t = T.p0; piles.forEach((p, k) => { if (k > 0 && p.w !== piles[k - 1].w) t += 2; ts.push(t); t += T.dt; }); }
  const kit = createPitKit(root, section, { HW, PX, dmax: DMAX, wins: T.wins, deps: T.deps, levels: [], exc: T.exc, crane: T.crane });
  const concM = mat(0x9a968c, { r: 0.95 }), capM = noclip(0xc9c5ba, { r: 1, e: 0x25231f });
  const pg = new THREE.CylinderGeometry(R - 0.03, R - 0.03, 1, 18); pg.translate(0, -0.5, 0);
  const pim = new THREE.InstancedMesh(pg, concM, NP); pim.frustumCulled = false; pim.castShadow = true; root.add(pim);
  const cuts = [-1, 1].map((s) => { const m = vplane(2 * (R - 0.03), capM); m.matrixAutoUpdate = false; m.position.set(X1 - 0.05, 0, PZ + s * ZP); m.renderOrder = 4; root.add(m); return m; });
  const beamBody = (z) => { const g = new THREE.BoxGeometry(PX + 1.4, 0.73, 1.3); g.translate((PX + 1.4) / 2, 0.365, 0); const m = new THREE.Mesh(g, concM); m.position.set(X1, TOPB, z); m.castShadow = true; m.visible = false; root.add(m); return m; };
  const beams = [beamBody(PZ - ZP), beamBody(PZ + ZP)];
  const beamE = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.73, 2 * ZP + 1.3), concM); beamE.position.set(X1 + PX + R - 0.05, TOPB + 0.365, PZ); beamE.visible = false; root.add(beamE);
  const beamCaps = [-1, 1].map((s) => { const m = vplane(1.3, capM); m.position.set(X1 - 0.012, TOPB, PZ + s * ZP); m.scale.y = 0.73; m.visible = false; m.renderOrder = 3; root.add(m); return m; });
  const rig = M.pilingRig(); rig.group.scale.setScalar(0.6); rig.group.visible = false; root.add(rig.group);
  const place = rigPlacer(rig, piles, ts, wallFaceStd);

  // diagramas de empuxo no plano da seção
  const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0, -1); tri.lineTo(1, -1); tri.closePath();
  const tg = new THREE.ShapeGeometry(tri); tg.rotateY(-Math.PI / 2);
  const actM = noclip(0xd23b2e, { op: 0.5, dw: false, e: 0x4a0f0a }), pasM = noclip(0x3a9d5d, { op: 0.5, dw: false, e: 0x0f3a1f });
  const mkTri = (m) => { const o = new THREE.Mesh(tg, m); o.position.x = X1 - 0.07; o.renderOrder = 7; o.visible = false; root.add(o); return o; };
  const act = [mkTri(actM), mkTri(actM)], pas = [mkTri(pasM), mkTri(pasM)];
  // setas do empuxo ativo (instanciadas)
  const arrG = new THREE.ConeGeometry(0.16, 0.5, 6); arrG.rotateX(Math.PI / 2);
  const arrM = noclip(0xb0291d); const arr = new THREE.InstancedMesh(arrG, arrM, 12); arr.frustumCulled = false; arr.visible = false; root.add(arr);
  // trincas no terreno atrás da cortina
  const crackM = mat(0x2a1f16, { r: 1 });
  const cracks = [[-1, 1.3], [-1, 2.6], [1, 1.5], [1, 3.0]].map(([s, off]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(PX + 1, 0.04, 0.09), crackM); m.position.set(X1 + PX / 2 + 0.5, 0.03, PZ + s * (HW + 1.0 + off)); m.visible = false; root.add(m); return m; });
  const pegs = [];
  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(D4_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const m4 = new THREE.Matrix4(), mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), mC = new THREE.Matrix4(), vs = new THREE.Vector3();
  const fmt = (x, n = 1) => x.toFixed(n).replace('.', ',');
  const defl = (t, d) => DTOP * Math.pow(clamp01(d / DMAX), 2) * 0.9 + DTOP * 0.1 * ease(win(t, T.s3 + 2, 90)) * (d > DMAX - 0.05 ? 1 : 0);
  // matriz da estaca/cap inclinada em torno de y = YP
  const tilt = (x, z, phi, topY, len, sx, sz, out) => {
    mA.makeTranslation(x, YP, z); mB.makeRotationX(phi); mC.makeTranslation(0, topY - YP, 0);
    out.multiplyMatrices(mA, mB).multiply(mC); vs.set(sx, len, sz); mA.makeScale(vs.x, vs.y, vs.z); out.multiply(mA); return out;
  };
  function info(t, d, wi) {
    if (t < T.s2) return { step: 0, p: win(t, 0, T.s2), note: t < ts[0] ? 'Perfuratriz chegando' : t < T.beam0 ? `Estacas · ${ts.filter((x) => x < t).length} de ${NP}` : 'Concretando a viga de coroamento' };
    if (t < T.s3) return { step: 1, p: win(t, T.s2, T.s3), note: wi >= 0 ? `Escavando · ${fmt(d)} m de ${fmt(DMAX)} m, sem apoio` : t < T.wins[0][0] ? 'Escavadeira e guindaste chegando' : 'Pausa entre etapas de escavação' };
    return { step: 2, p: win(t, T.s3, T.END), note: `Topo deslocou ${fmt(defl(t, d) * 100 / 10)} cm (desenho ampliado 10×)` };
  }
  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc;
    sur.update(tAbs);
    const kr = kit.update(t, tAbs), d = kr.d;
    const inf = info(t, d, kr.winI); st.step = inf.step; st.progress = inf.p; st.note = inf.note;
    const dl = defl(t, d), phi = dl / (0 - YP + 0.0);   // ângulo de rotação (norte: +; sul: -)
    for (let i = 0; i < NP; i++) {
      const p = piles[i], u = ease(win(t, ts[i], ts[i] + 0.8));
      if (p.w === 2) { m4.makeTranslation(p.x, TOPB, p.z); mA.makeScale(1, Math.max(0.0001, LEN * u), 1); m4.multiply(mA); }
      else tilt(p.x, p.z, p.w === 0 ? phi : -phi, TOPB, Math.max(0.0001, LEN * u), 1, 1, m4);
      pim.setMatrixAt(i, m4);
    }
    pim.instanceMatrix.needsUpdate = true;
    cuts.forEach((c, i) => { const s = i ? 1 : -1, u = ease(win(t, ts[i * 11], ts[i * 11] + 0.8)); c.visible = u > 0.01; tilt(X1 - 0.05, PZ + s * ZP, s < 0 ? phi : -phi, TOPB - LEN * u, Math.max(0.001, LEN * u), 1, 1, c.matrix); c.matrixWorldNeedsUpdate = true; });
    const bm = ease(win(t, T.beam0, T.beam1));
    beams.forEach((m, i) => { m.visible = bm > 0.01; m.scale.x = Math.max(0.001, bm); m.position.z = PZ + (i ? 1 : -1) * ZP + (i ? -dl : dl); });
    beamE.visible = bm > 0.5; beamE.scale.y = Math.max(0.001, ease((bm - 0.5) * 2));
    beamCaps.forEach((c, i) => { c.visible = bm > 0.3; c.position.z = PZ + (i ? 1 : -1) * ZP + (i ? -dl : dl); });
    place(t, tAbs, T.beam0 + 1);

    // diagramas
    const dg = ease(win(t, T.s3, T.s3 + 6)), Lt = LEN + 0.7;
    [-1, 1].forEach((s, i) => {
      const zo = PZ + s * (ZP + R), zi = PZ + s * HW;
      act[i].visible = dg > 0.01; act[i].position.set(X1 - 0.07, 0, zo); act[i].scale.set(1, Lt, s * 2.6 * dg); // ativo: do topo até a ponta
      const h = Math.max(0.01, Lt - d - 0.0);
      pas[i].visible = dg > 0.01; pas[i].position.set(X1 - 0.07, -d, zi); pas[i].scale.set(1, h, -s * 2.8 * dg * (h / Lt) * 1.0);
    });
    arr.visible = dg > 0.3;
    if (arr.visible) { let n = 0; [-1, 1].forEach((s) => { for (let j = 0; j < 6; j++) { const y = -0.8 - j * 1.4; const w = 0.4 + 0.4 * (-y / Lt) * 2.6; mA.makeRotationY(s > 0 ? Math.PI : 0); mA.setPosition(X1 - 0.08, y, PZ + s * (ZP + R + w * 0.5 + 0.15)); arr.setMatrixAt(n++, mA); } }); arr.instanceMatrix.needsUpdate = true; }
    cracks.forEach((c, i) => { const u = ease(win(t, T.s3 + 4 + i * 2, T.s3 + 10 + i * 2)); c.visible = u > 0.05; c.scale.x = Math.max(0.001, u); });

    const a = anchors, pf = X1 - 0.06;
    a.cortina.set(pf, -2.5, PZ - ZP); a.ficha.set(pf, -d - 3, PZ + ZP); a.ativo.set(pf, -3.5, PZ - ZP - R - 1.4); a.passivo.set(pf, -d - 2.2, PZ - HW + 1.2);
    a.desloc.set(pf, TOPB + 0.5, PZ - ZP + dl); a.trinca.set(X1 + 4, 0.1, PZ - HW - 3.0);
    a.cacamba.set(kr.cyc.x, kr.cyc.y - 0.6, kr.cyc.z); a.predio.set(pf, 9.5, -46); a.solo.set(X1, -15, PZ);
  }
  function labelVis(kx, t = st.tc) {
    switch (kx) {
      case 'cortina': return t > T.beam1;
      case 'ficha': return t > T.wins[0][0] + 6;
      case 'ativo': case 'passivo': return t > T.s3 + 4;
      case 'desloc': return t > T.s3 + 8;
      case 'trinca': return t > T.s3 + 10;
      case 'cacamba': return kit.winIdx(t) >= 0 && t > T.crane[1];
      case 'predio': return t > 2;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hideDPit(engine); },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); showDPit(engine); },
  };
}
