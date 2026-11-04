import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, piece, capRect, person, plateCompactor, stream, barSet, WET, CURED } from './fund.js';
import { cellsAround } from './b1.js';

// ---------------------------------------------------------------------------
// B3 — Sapata de divisa: pilar excêntrico junto ao muro do vizinho (z = 43,7),
// escoramento de pranchas, viga de equilíbrio ligando ao pilar interno.
// Seção em x = X1 ao longo de z.
// ---------------------------------------------------------------------------
const X1 = -92, DV = 1.7, Y0 = -1.6, Y1 = -0.9;
const PIT = { x0: X1 - 2, x1: X1 + 2, z0: 43.95, z1: 51.0 };
const F1 = { z0: 44.05, z1: 46.25 }, F2 = { z0: 47.9, z1: 50.1 }, FX = 1.1;
const C1 = { z: 44.55, s: 0.4, top: 2.0 }, C2 = { z: 49.0, s: 0.4, top: 2.0 };
const BM = { z0: F1.z1, z1: F2.z0, hw: 0.2 };
const WALLZ = 43.7;
const T = {
  dig0: 0.8, dig1: 5.6, sh0: 3.0, wale0: 5.8, wale1: 6.8, rk0: 7.0, rk1: 8.8, comp1: 10.6, last1: 12.4, s2: 13.2,
  form0: 13.6, form1: 15.6, bf0: 15.8, bf1: 19.0, cb0: 19.2, cb1: 21.8, bmb0: 22.0, bmb1: 24.0, cf0: 24.2, cf1: 25.8, s3: 26.4,
  truckIn: 27.6, p1a: 27.8, p1b: 29.6, p2b: 31.4, pcb: 33.4, pbb: 36.0, truckOut: 38.0, s4: 38.6, un0: 38.8, un1: 40.2,
  rkOut0: 43.0, rkOut1: 44.2, pl0: 49.2, pl1: 50.6, END: 53,
};
const LIFTS = [[40.4, 41.9, -1.3], [41.9, 43.4, -0.9], [43.4, 44.9, -0.5], [44.9, 46.4, -0.2], [46.4, 47.9, 0]];
export const B3 = { box: { x0: -125, x1: X1, z0: 39, z1: 57 } };
export const B3_STEP_STARTS = [0, T.s2, T.s3, T.s4];
export const B3_STEPS = [
  { t: 'Escavar junto ao muro do vizinho, com escoramento', d: 'O pilar de divisa nasce rente à divisa, e o muro do vizinho tem fundação rasa ao lado. Ao escavar, o solo do outro lado perderia apoio. Por isso a escavação desce com pranchas de madeira, longarina e escoras inclinadas que seguram o terreno e o muro.' },
  { t: 'Armar a sapata excêntrica e a viga de equilíbrio', d: 'Como o pilar fica na borda da sapata, a carga é excêntrica e tenderia a girá-la. A viga de equilíbrio liga esse pilar ao pilar interno e usa o peso dele para contrabalançar o momento. Armam-se as duas sapatas, os arranques e a viga.' },
  { t: 'Concretar', d: 'O caminhão betoneira lança o concreto nas duas sapatas, depois nos pilares e por fim na viga de equilíbrio, formando um conjunto monolítico. A prancha do lado da divisa serve de forma.' },
  { t: 'Reaterrar e remover o escoramento', d: 'O reaterro sobe em camadas compactadas. As escoras saem à medida que o solo volta a apoiar o terreno do vizinho; só no final as pranchas são retiradas, sem que o muro tenha se movido.' },
];
export const B3_LABELS = [
  { k: 'muro', t: 'Muro do vizinho' },
  { k: 'esc', t: 'Escoramento' },
  { k: 'sap', t: 'Sapata excêntrica' },
  { k: 'viga', t: 'Viga de equilíbrio' },
  { k: 'arm', t: 'Armação' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const B3_CAM = { tx: -91, ty: -1.0, tz: 47.2, yaw: -1.3, pitch: 0.25, dist: 17 };
export const B3_MCAM = { tx: -91, ty: -3.0, tz: 47.2, yaw: -1.3, pitch: 0.22, dist: 34 };

export function createB3(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const capX = (o) => X1 + o;
  const soilW = mat(0x9c7b56, { r: 1 }), soilF = mat(0x86683f, { r: 1 });
  const matLastro = mat(0xb6b2a8, { r: 1 }), matConc = mat(0x85827a, { r: 0.95 }), matWood = mat(0xc9a26a, { r: 0.8 }), matFill = mat(0xb59568, { r: 1 });
  const dk = mat(0x24272b);

  // cava
  const wz = new THREE.PlaneGeometry(1, 1); wz.translate(0, -0.5, 0);
  const wx = new THREE.PlaneGeometry(1, 1); wx.rotateY(Math.PI / 2); wx.translate(0, -0.5, 0);
  const walls = [];
  const aw = (axis, pos, a, b) => { const m = new THREE.Mesh(axis === 'z' ? wz : wx, soilW); if (axis === 'z') m.position.set((a + b) / 2, 0, pos); else m.position.set(pos, 0, (a + b) / 2); m.userData = { axis, len: b - a }; root.add(m); walls.push(m); };
  aw('z', PIT.z0, PIT.x0, PIT.x1); aw('z', PIT.z1, PIT.x0, PIT.x1); aw('x', PIT.x0, PIT.z0, PIT.z1); aw('x', PIT.x1, PIT.z0, PIT.z1);
  const floorG = new THREE.PlaneGeometry(1, 1); floorG.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorG, soilF); floor.position.set(X1, 0, (PIT.z0 + PIT.z1) / 2); floor.scale.set(PIT.x1 - PIT.x0, 1, PIT.z1 - PIT.z0); root.add(floor);
  function setDepth(d) {
    walls.forEach((m) => { m.visible = d > 0.01; if (m.userData.axis === 'z') m.scale.set(m.userData.len, Math.max(0.001, d), 1); else m.scale.set(1, Math.max(0.001, d), m.userData.len); });
    floor.visible = d > 0.01; floor.position.y = -d + 0.002;
  }
  const subOverlay = capRect(root, X1 - 0.04, PIT.z0, PIT.z1, -DV - 0.25, -DV, noclip(0x5a432c, { op: 0, dw: false, r: 1 })); subOverlay.renderOrder = 5;

  // muro do vizinho + fundação (desenhada no plano)
  const brick = mat(0xcf8a63, { r: 0.9 });
  const nWall = piece(root, [{ axis: 'x', c: WALLZ, a: X1 - 4.5, b: X1 + 4.5 }], -0.125, 0.125, 0, 2.4, brick, { x: capX(0.02) }); nWall.set(1);
  const nFoot = capRect(root, X1 - 0.05, 43.3, 43.9, -0.85, -0.3, noclip(0xb8b3a8, { r: 1 })); nFoot.renderOrder = 4;

  // lastro
  const lastroF = (f) => piece(root, [{ axis: 'x', c: (f.z0 + f.z1) / 2, a: X1 - FX - 0.1, b: X1 + FX + 0.1 }], -(f.z1 - f.z0) / 2 - 0.0, (f.z1 - f.z0) / 2 + 0.1, Y0 - 0.1, Y0, matLastro, { x: capX(0.03) });
  const lastro = [lastroF(F1), lastroF(F2)];
  const lastroB = piece(root, [{ axis: 'z', c: X1, a: BM.z0, b: BM.z1 }], -0.35, 0.35, Y0 - 0.1, Y0, matLastro);
  const lastroBcap = capRect(root, capX(0.03), BM.z0, BM.z1, Y0 - 0.1, Y0, matLastro);

  // concreto
  const foot = (f) => piece(root, [{ axis: 'x', c: (f.z0 + f.z1) / 2, a: X1 - FX, b: X1 + FX }], -(f.z1 - f.z0) / 2, (f.z1 - f.z0) / 2, Y0, Y1, matConc, { x: capX(0.02) });
  const sap = [foot(F1), foot(F2)];
  const col = [C1, C2].map((c) => piece(root, [{ axis: 'x', c: c.z, a: X1 - c.s / 2, b: X1 + c.s / 2 }], -c.s / 2, c.s / 2, Y1, c.top, matConc, { x: capX(0.02) }));
  const beam = piece(root, [{ axis: 'z', c: X1, a: BM.z0, b: BM.z1 }], -BM.hw, BM.hw, Y0, Y1, matConc);
  const beamCap = capRect(root, capX(0.02), BM.z0, BM.z1, Y0, Y1, matConc);

  // formas
  const fForm1 = piece(root, [{ axis: 'x', c: F1.z1 + 0.04, a: X1 - FX - 0.08, b: X1 + FX + 0.08 }, { axis: 'z', c: X1 - FX - 0.04, a: F1.z0, b: F1.z1 }, { axis: 'z', c: X1 + FX + 0.04, a: F1.z0, b: F1.z1 }], -0.04, 0.04, Y0, Y1 + 0.05, matWood, { x: capX(0.015) });
  const fForm2 = piece(root, [{ axis: 'x', c: F2.z0 - 0.04, a: X1 - FX - 0.08, b: X1 + FX + 0.08 }, { axis: 'x', c: F2.z1 + 0.04, a: X1 - FX - 0.08, b: X1 + FX + 0.08 }, { axis: 'z', c: X1 - FX - 0.04, a: F2.z0, b: F2.z1 }, { axis: 'z', c: X1 + FX + 0.04, a: F2.z0, b: F2.z1 }], -0.04, 0.04, Y0, Y1 + 0.05, matWood, { x: capX(0.015) });
  const bForm = piece(root, [{ axis: 'z', c: X1 - BM.hw - 0.04, a: BM.z0, b: BM.z1 }, { axis: 'z', c: X1 + BM.hw + 0.04, a: BM.z0, b: BM.z1 }], -0.04, 0.04, Y0, Y1 + 0.05, matWood);
  const cForm = [C1, C2].map((c) => { const h = c.s / 2 + 0.04; return piece(root, [{ axis: 'x', c: c.z - h, a: X1 - h - 0.04, b: X1 + h + 0.04 }, { axis: 'x', c: c.z + h, a: X1 - h - 0.04, b: X1 + h + 0.04 }, { axis: 'z', c: X1 - h, a: c.z - h, b: c.z + h }, { axis: 'z', c: X1 + h, a: c.z - h, b: c.z + h }], -0.04, 0.04, Y1, c.top - 0.15, matWood, { x: capX(0.012) }); });

  // escoramento: pranchas, longarina, escoras
  const planks = piece(root, [{ axis: 'x', c: 43.99, a: PIT.x0 + 0.02, b: PIT.x1 - 0.02 }], -0.04, 0.04, -DV, 0.12, mat(0xb98b52, { r: 0.9 }), { x: capX(0.0105) });
  const wale = piece(root, [{ axis: 'x', c: 44.11, a: PIT.x0 + 0.02, b: PIT.x1 - 0.02 }], -0.06, 0.06, -0.55, -0.35, matWood, { x: capX(0.011) });
  const rakers = [];
  for (const dx of [-1.6, 1.6]) {
    const g = new THREE.Group(); const a = new THREE.Vector3(X1 + dx, -0.45, 44.17), b = new THREE.Vector3(X1 + dx, -1.62, 45.7);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, a.distanceTo(b)), matWood); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.castShadow = true;
    const blk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.4), mat(0xa7a39a)); blk.position.set(X1 + dx, -DV + 0.09, 45.75);
    g.add(m, blk); root.add(g); rakers.push({ g, m, a, b });
  }

  // armação
  const FXS = [-0.75, -0.25, 0.25, 0.75];
  const bars = barSet(root, 8 * 2 + 4, 0x3a3d42, 0.04);
  const secBars = new THREE.Group(); root.add(secBars);
  const fz = (f) => (f.z0 + f.z1) / 2;
  for (const f of [F1, F2]) {
    const n = 4, zs = Array.from({ length: n }, (_, i) => f.z0 + 0.25 + i * ((f.z1 - f.z0 - 0.5) / (n - 1)));
    f.zs = zs;
    for (const z of zs) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8), dk); d.rotation.z = Math.PI / 2; d.position.set(capX(0.005), Y0 + 0.1, z); secBars.add(d); }
    const ln = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, f.z1 - f.z0 - 0.3), dk); ln.position.set(capX(0.008), Y0 + 0.18, fz(f)); secBars.add(ln);
  }
  for (const y of [Y0 + 0.12, Y1 - 0.12]) { const ln = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, C2.z - C1.z + 0.5), dk); ln.position.set(capX(0.009), y, (C1.z + C2.z) / 2); secBars.add(ln); }
  for (let j = 0; j < 9; j++) { const z = C1.z + 0.4 + j * ((C2.z - C1.z - 0.8) / 8); const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, Y1 - Y0 - 0.18, 0.03), dk); l.position.set(capX(0.007), (Y0 + Y1) / 2, z); secBars.add(l); }
  // pilares: barras verticais e estribos
  const vbarGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6); vbarGeo.translate(0, 0.5, 0);
  const stirG = (s) => { const t = 0.03, parts = [], h = s / 2 - 0.05; const b = (sx, sy, sz, x, y, z) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); parts.push(g); }; b(2 * h, t, t, 0, 0, -h); b(2 * h, t, t, 0, 0, h); b(t, t, 2 * h, -h, 0, 0); b(t, t, 2 * h, h, 0, 0); return mergeGeometries(parts); };
  const vb = [], stirr = []; const secV = new THREE.Group(); root.add(secV);
  [C1, C2].forEach((c) => {
    const off = c.s / 2 - 0.08, grp = [];
    for (const [dx, dz] of [[-off, -off], [off, -off], [-off, off], [off, off]]) { const m = new THREE.Mesh(vbarGeo, mat(0x3a3d42, { r: 0.5, m: 0.5 })); m.position.set(X1 + dx, Y0 + 0.15, c.z + dz); root.add(m); grp.push(m); }
    vb.push(grp);
    const ns = 10, im = new THREE.InstancedMesh(stirG(c.s), mat(0x2f3237, { r: 0.5, m: 0.5 }), ns); im.frustumCulled = false; root.add(im); stirr.push({ im, ns, c });
    for (const dz of [-off, off]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, c.top + 0.2 - (Y0 + 0.15), 0.06), dk); l.position.set(capX(0.006), (c.top + 0.2 + Y0 + 0.15) / 2, c.z + dz); secV.add(l); }
  });

  // máquinas, pessoas
  const EX = X1 + 5.9;
  const exc = M.excavator(0.5); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.position.set(EX, 0, 47.4); excW.visible = false; root.add(excW);
  const truck = M.mixerTruck(); truck.scale.setScalar(0.62); truck.visible = false; root.add(truck);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1), mat(0x9aa0a8, { m: 0.4 })); chute.visible = false; root.add(chute);
  const flow = stream(root, 18, 0x8b8880);
  const plate = plateCompactor(); plate.group.visible = false; root.add(plate.group);
  const pA = person(0xe8742c), pB = person(0x4a8fd0), pC = person(0xf4f1ea, 0x3b7bd0);
  [pA, pB, pC].forEach((p) => root.add(p.group));

  // reaterro
  const fills = [];
  const addCells = (cells, y0, y1) => cells.forEach((cl) => {
    const cap = cl.x0 < X1 && cl.x1 > X1 ? { x: capX(0.035) } : undefined;
    const pc = piece(root, [{ axis: 'x', c: (cl.z0 + cl.z1) / 2, a: cl.x0, b: cl.x1 }], -(cl.z1 - cl.z0) / 2, (cl.z1 - cl.z0) / 2, y0, y1, matFill, cap);
    fills.push({ pc, y0, y1 });
  });
  const bx = { x0: X1 - FX, x1: X1 + FX };
  addCells(cellsAround(PIT, [{ ...bx, ...F1 }, { x0: X1 - BM.hw, x1: X1 + BM.hw, z0: BM.z0, z1: BM.z1 }, { ...bx, ...F2 }]), Y0, Y1);
  addCells(cellsAround(PIT, [C1, C2].map((c) => ({ x0: X1 - c.s / 2, x1: X1 + c.s / 2, z0: c.z - c.s / 2, z1: c.z + c.s / 2 }))), Y1, 0);

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(B3_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};
  const lvlAt = (t) => { if (t <= LIFTS[0][0]) return Y0; let from = Y0; for (const [a, b, to] of LIFTS) { if (t < b) return from + (to - from) * ease((t - a) / (b - a)); from = to; } return 0; };
  const pop = (t, a, b, f = 0.5) => ease((t - a) / f) * ease((b - t) / f);
  function info(t) {
    if (t < T.s2) return { step: 0, p: t / T.s2, note: t < T.sh0 ? 'Locação rente à divisa' : t < T.wale0 ? 'Escavando e pranchando' : t < T.rk1 ? 'Longarina e escoras inclinadas' : t < T.comp1 ? 'Apiloamento do fundo' : 'Lastro de concreto magro' };
    if (t < T.s3) return { step: 1, p: (t - T.s2) / (T.s3 - T.s2), note: t < T.bf0 ? 'Formas das sapatas' : t < T.cb0 ? 'Malhas das sapatas' : t < T.bmb0 ? 'Arranque dos pilares' : t < T.cf0 ? 'Armadura da viga de equilíbrio' : 'Formas dos pilares e da viga' };
    if (t < T.s4) return { step: 2, p: (t - T.s3) / (T.s4 - T.s3), note: t < T.p1a ? 'Caminhão posicionado' : t < T.p1b ? 'Concretando a sapata de divisa' : t < T.p2b ? 'Concretando a sapata interna' : t < T.pcb ? 'Concretando os pilares' : t < T.pbb ? 'Concretando a viga de equilíbrio' : 'Caminhão sai' };
    const k = LIFTS.findIndex((l) => t < l[1]);
    return { step: 3, p: Math.min(1, (t - T.s4) / (T.END - T.s4)), note: t < T.un1 ? 'Desforma' : k >= 0 ? `Reaterro · camada ${k + 1} de 5` : t < T.pl0 ? 'Retirando as escoras' : 'Retirando as pranchas' };
  }
  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), q0 = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    const d = DV * ease((t - T.dig0) / (T.dig1 - T.dig0));
    setDepth(d);
    terrainHoles[0].set(PIT.x0, PIT.x1, PIT.z0, PIT.z1);
    if (d > 0.02) section.setBand(0, PIT.z0, PIT.z1, -d, 0.05); else section.setBand(0, 0, 0, 0, 0);
    const comp = ease(win(t, T.rk1, T.comp1)); soilF.color.set(0x86683f).lerp(new THREE.Color(0x5b4529), comp); subOverlay.material.opacity = comp * 0.7;

    // escoramento
    planks.set(t < T.pl0 ? win(t, T.sh0, T.dig1) : 1 - ease(win(t, T.pl0, T.pl1)));
    wale.set((t < T.rkOut0 ? win(t, T.wale0, T.wale1) : 1 - win(t, T.rkOut0 - 0.1, T.rkOut0 + 0.6)) * (t < T.pl0 ? 1 : 1 - win(t, T.pl0, T.pl0 + 0.4)));
    rakers.forEach((r, i) => { const f = t < T.rkOut0 + i * 0.4 ? ease(win(t, T.rk0 + i * 0.4, T.rk1)) : 1 - ease(win(t, T.rkOut0 + i * 0.4, T.rkOut1 + i * 0.3)); r.g.visible = f > 0.01; r.m.scale.z = Math.max(0.001, f); r.m.position.copy(r.a).lerp(r.b, f / 2); });

    // lastro e formas
    const lf = win(t, T.comp1, T.last1);
    lastro.forEach((l) => l.set(lf)); lastroB.set(lf); lastroBcap.visible = lf > 0.01; lastroBcap.scale.set(1, 0.1 * Math.max(0.001, lf), BM.z1 - BM.z0);
    const unf = 1 - win(t, T.un0, T.un1);
    fForm1.set(win(t, T.form0, T.form1) * unf); fForm2.set(win(t, T.form0 + 0.4, T.form1) * unf);
    bForm.set(win(t, T.cf0, T.cf1) * unf);
    cForm.forEach((c, i) => c.set(win(t, T.cf0 + i * 0.3, T.cf1) * unf));
    // malhas
    const fb = win(t, T.bf0, T.bf1), hide = t > T.p1a + 0.8;
    let bi = 0;
    for (const f of [F1, F2]) {
      FXS.forEach((x, i) => { const g = ease(clamp01(fb * 1.5 - (i / 4) * 0.5)); const len = (f.z1 - f.z0 - 0.2) * g; bars.put(bi++, 'z', X1 + x, Y0 + 0.18, f.z1 - 0.1 - len / 2, len); });
      f.zs.forEach((z, i) => { const g = ease(clamp01(fb * 1.5 - (i / 4) * 0.5 - 0.1)); const len = (2 * FX - 0.2) * g; bars.put(bi++, 'x', X1 + FX - 0.1 - len / 2, Y0 + 0.1, z, len); });
    }
    const fbm = win(t, T.bmb0, T.bmb1);
    for (const [dx, y] of [[-0.12, Y0 + 0.12], [0.12, Y0 + 0.12], [-0.12, Y1 - 0.12], [0.12, Y1 - 0.12]]) { const len = (C2.z - C1.z + 0.5) * ease(fbm); bars.put(bi++, 'z', X1 + dx, y, C2.z + 0.25 - len / 2, len); }
    bars.done(); bars.im.visible = fb > 0.01 && t < T.p2b + 1; secBars.visible = fb > 0.15 && t < T.p2b + 1;
    // arranques
    const fp = win(t, T.cb0, T.cb1);
    [C1, C2].forEach((c, ci) => {
      const top = c.top + 0.2 - (Y0 + 0.15);
      vb[ci].forEach((m) => { m.visible = fp > 0.01; m.scale.y = Math.max(0.001, top * ease(fp)); });
      const { im, ns } = stirr[ci];
      for (let j = 0; j < ns; j++) {
        const on = j / ns < clamp01((fp - 0.25) / 0.75), y = Y1 - 0.05 + j * ((c.top - Y1 - 0.1) / (ns - 1));
        if (!on) { m4.makeScale(0, 0, 0); im.setMatrixAt(j, m4); continue; }
        m4.compose(v3.set(X1, y, c.z), q0, one); im.setMatrixAt(j, m4);
      }
      im.instanceMatrix.needsUpdate = true;
    });
    secV.visible = fp > 0.3;
    // concretagem
    sap[0].set(win(t, T.p1a, T.p1b)); sap[1].set(win(t, T.p1b, T.p2b));
    col[0].set(win(t, T.p2b + 0.2, T.p2b + 1.1)); col[1].set(win(t, T.p2b + 1.1, T.pcb));
    const bf = win(t, T.pcb + 0.2, T.pbb); beam.set(bf); beamCap.visible = bf > 0.01; beamCap.scale.set(1, (Y1 - Y0) * Math.max(0.001, bf), BM.z1 - BM.z0);
    matConc.color.copy(WET).lerp(CURED, clamp01((t - T.p1a - 2) / 14));
    const lv = lvlAt(t);
    fills.forEach((f) => f.pc.set(clamp01((lv - f.y0) / (f.y1 - f.y0))));

    // retroescavadeira
    const eS = pop(t, 0.4, T.rk0 + 0.2, 0.6);
    excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); exc.update(t * 1.4); excW.position.z = 47.4 + Math.sin(t * 0.8) * 1.0;
    // betoneira
    const tx0 = X1 + 8.2;
    const tx = t < T.s3 ? tx0 + 8 : t < T.truckIn ? tx0 + 8 - 8 * ease((t - T.s3) / (T.truckIn - T.s3)) : t < T.pbb + 0.2 ? tx0 : tx0 + 8 * ease((t - T.pbb - 0.2) / (T.truckOut - T.pbb - 0.2));
    const tVis = t >= T.s3 && t < T.truckOut + 0.4;
    const tz = 47.4;
    truck.visible = tVis; truck.position.set(tx, 0, tz); truck.userData.spin.rotation.x = tAbs * 2.5;
    // alvo do bico
    let tgt, yEnd;
    if (t < T.p1b) { tgt = fz(F1); yEnd = Y0 + 0.7 * win(t, T.p1a, T.p1b); } else if (t < T.p2b) { tgt = fz(F2); yEnd = Y0 + 0.7 * win(t, T.p1b, T.p2b); } else if (t < T.p2b + 1.1) { tgt = C1.z; yEnd = 1.0; } else if (t < T.pcb) { tgt = C2.z; yEnd = 1.0; } else { tgt = (BM.z0 + BM.z1) / 2; yEnd = Y0 + 0.7 * win(t, T.pcb, T.pbb); }
    const high = t >= T.p2b && t < T.pcb;
    const pouring = t > T.p1a && t < T.pbb;
    chute.visible = tVis && t >= T.truckIn - 0.2 && t < T.pbb + 0.4;
    const ch0 = new THREE.Vector3(tx - 3.0, 1.55, tz), ch1 = new THREE.Vector3(high ? X1 + 0.45 : X1 + 0.9, high ? 2.4 : Y1 + 0.5, tgt);
    chute.position.copy(ch0).add(ch1).multiplyScalar(0.5); chute.scale.z = ch0.distanceTo(ch1); chute.lookAt(ch1);
    flow.set(ch1, new THREE.Vector3(ch1.x - 0.25, yEnd, tgt), pouring, tAbs, 0.1);
    // placa vibratória
    const pOn = (t > T.dig1 + 0.4 && t < T.comp1 + 0.2) || (t > LIFTS[0][0] + 0.7 && t < LIFTS[4][1] + 0.2);
    plate.group.visible = pOn;
    if (pOn) {
      const bottom = t < T.comp1 + 0.3; let y, ph;
      if (bottom) { ph = win(t, T.dig1 + 0.4, T.comp1 + 0.2); y = -DV; } else { const li = Math.max(0, LIFTS.findIndex((l) => t < l[1] + 0.4)); ph = clamp01((t - (LIFTS[li][0] + 0.5)) / 1.3); y = lvlAt(t); }
      const sweep = Math.abs(((ph * 2) % 2) - 1);
      const zl = bottom ? 45.2 + (PIT.z1 - 45.2 - 0.8) * (0.5 + 0.5 * Math.sin(ph * 6)) : (ph < 0.5 ? 46.9 : 50.6 - 0.1);
      plate.group.position.set(PIT.x0 + 0.6 + (PIT.x1 - PIT.x0 - 1.2) * sweep, y, zl); plate.group.rotation.y = Math.PI / 2; plate.shake(tAbs);
    }
    const pw = (p, x0, x1, z, sp, bend, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp + ph); p.group.position.set(x0 + (x1 - x0) * u, 0, z); p.group.rotation.y = Math.cos(tAbs * sp + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = bend; };
    pw(pA, X1 + 2.8, X1 + 7.2, 52.6, 0.6, t > T.s2 && t < T.cf1 ? 0.7 : 0.1, 0);
    pw(pB, X1 + 2.8, X1 + 6.5, 42.4, 0.5, t > T.p1a && t < T.un0 ? 0.45 : 0.15, 1.7);
    pC.group.position.set(X1 + 3.2, 0, 53.2); pC.group.rotation.y = Math.PI / 2 + Math.sin(tAbs * 0.4) * 0.6; pC.upper.rotation.x = 0.05;

    const a = anchors;
    a.muro.set(X1 - 0.02, 1.5, WALLZ);
    a.esc.set(X1, -1.0, 44.0);
    a.sap.set(X1, -1.45, F1.z1 - 0.3);
    a.viga.set(X1, -1.25, (BM.z0 + BM.z1) / 2);
    a.arm.set(X1, Y0 + 0.1, F2.zs[1]);
    a.solo.set(X1, -4.5, 47.5);
  }
  function labelVis(k, t = st.tc) {
    switch (k) {
      case 'muro': return true;
      case 'esc': return t > T.rk0 + 1.0 && t < T.pl0;
      case 'sap': return t > T.p1b - 0.5;
      case 'viga': return t > T.pcb + 1.2;
      case 'arm': return t > T.bf0 + 1.5 && t < T.p1a + 0.8;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hidden.g = engine.scene.getObjectByName('b-isol'); if (hidden.g) hidden.g.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); if (hidden.g) hidden.g.visible = true; },
  };
}
