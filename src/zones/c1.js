import * as THREE from 'three';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person, WET, CURED } from './fund.js';

// ---------------------------------------------------------------------------
// C1 — Estaca broca (trado manual) + ligação ao baldrame. Seção em x = X1 pelo eixo da estaca.
// Diâmetro exagerado (0,6 m) para ficar legível. Furo sem revestimento, acima do nível d'água.
// ---------------------------------------------------------------------------
const X1 = -40, PZ = 20, R = 0.3, DEPTH = 4.5, NB = 3.0;          // vizinhas em PZ ± 3,0
const HAND = 1.3, NC = 3, CY = 6.5, D0 = 10;
const BB0 = -0.5, BB1 = 0.2, HTOP = 0.35, HCUT = -0.1;             // viga baldrame e cabeça da estaca
const T = {
  stk1: 5, mark1: 9, s2: 10, drill1: D0 + CY * NC,                 // 29.5
  s3: 31.5, cage0: 32, cage1: 36.5, fun0: 36.8, pour0: 38.5, pour1: 54.2,
  s4: 58, brk0: 58.5, brk1: 63.5, dig0: 64, dig1: 69.5, form0: 70, form1: 73, reb0: 73.3, reb1: 77.5, pr0: 78, pr1: 88.4, END: 95,
};
const LC = 5.2;                                                   // ciclo do carrinho de mão
export const C1 = { box: { x0: -125, x1: X1, z0: 8, z1: 32 } };
export const C1_STEP_STARTS = [0, T.s2, T.s3, T.s4];
export const C1_STEPS = [
  { t: 'Locação', d: 'A topografia marca o ponto: uma estaca de madeira no centro, outras ao redor, e um cordel entre elas. É esse ponto que garante que a estaca saia no lugar do projeto, sob o pilar ou sobre a linha da viga baldrame.' },
  { t: 'Perfurar com o trado manual', d: 'Um operário gira o trado, preso a uma haste com cabo em T, enquanto ele desce. Quando as lâminas enchem, o trado sobe (as hastes de extensão vão sendo retiradas), é virado para o lado e o solo é sacudido na pilha. Três ciclos chegam à profundidade de projeto. Sem revestimento, só serve em solo que se sustenta sozinho e acima do nível d’água.' },
  { t: 'Armar e concretar com funil', d: 'A gaiola de armação é baixada à mão, com as barras de arranque saindo acima do terreno. Um funil guia o concreto da betoneira, trazido em carrinho de mão, em três lançamentos. Como o furo é pequeno e raso, o concreto cai direto, sem tubo, e a estaca é concretada de uma vez.' },
  { t: 'Arrasar e ligar ao baldrame', d: 'Depois da cura, a cabeça da estaca é quebrada com ponteira e marreta até o concreto são, deixando as barras de fora. Abre-se a vala entre as estacas, montam-se fôrmas e armação da viga baldrame, com as barras da estaca dobradas para dentro, e o concreto da viga amarra as estacas entre si e recebe a parede.' },
];
export const C1_LABELS = [
  { k: 'trado', t: 'Trado manual' },
  { k: 'haste', t: 'Hastes de extensão' },
  { k: 'solo_t', t: 'Solo retirado' },
  { k: 'furo', t: 'Furo sem revestimento' },
  { k: 'arm', t: 'Armação' },
  { k: 'funil', t: 'Funil' },
  { k: 'conc', t: 'Concreto' },
  { k: 'viz', t: 'Estacas vizinhas' },
  { k: 'cab', t: 'Cabeça arrasada' },
  { k: 'bald', t: 'Viga baldrame' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const C1_CAM = { tx: -39, ty: -0.9, tz: PZ, yaw: -1.3, pitch: 0.2, dist: 16 };
export const C1_MCAM = { tx: -39, ty: -2.6, tz: PZ, yaw: -1.3, pitch: 0.2, dist: 28 };

function helixRibbon(L, r0, r1, pitch, seg = 14) {
  const N = Math.round((L / pitch) * seg), pos = [], idx = [];
  for (let i = 0; i <= N; i++) { const y = (i / N) * L, a = (y / pitch) * Math.PI * 2; pos.push(r0 * Math.cos(a), y, r0 * Math.sin(a), r1 * Math.cos(a), y, r1 * Math.sin(a)); }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function createC1(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const dark = mat(0x2f3237, { r: 0.6, m: 0.3 });
  const wood = mat(0xb08a55, { r: 0.9 });
  const soilW = mat(0x6b4f33, { r: 1, e: 0x1c130b });
  const bx = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; return o; };
  const vplane = (w, m) => { const g = new THREE.PlaneGeometry(w, 1); g.rotateY(-Math.PI / 2); g.translate(0, 0.5, 0); return new THREE.Mesh(g, m); };
  const baseBox = (sx, sy, sz, m) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(0, sy / 2, 0); return new THREE.Mesh(g, m); };

  // ----------------------------------------------------------- furo
  const holeWall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1, 20, 1, true), mat(0x4a3827, { r: 1, side: THREE.BackSide, e: 0x2c1f12 })); holeWall.geometry.translate(0, -0.5, 0); holeWall.position.set(X1, 0, PZ); holeWall.visible = false; root.add(holeWall);
  const cs = new THREE.Shape(); cs.moveTo(-0.6, -0.6); cs.lineTo(0.6, -0.6); cs.lineTo(0.6, 0.6); cs.lineTo(-0.6, 0.6); cs.lineTo(-0.6, -0.6);
  const hp = new THREE.Path(); hp.absarc(0, 0, R, 0, Math.PI * 2, true); cs.holes.push(hp);
  const cg = new THREE.ShapeGeometry(cs, 20); cg.rotateX(-Math.PI / 2);
  const collar = new THREE.Mesh(cg, mat(0x6d5238, { r: 1 })); collar.position.set(X1, 0.03, PZ); collar.visible = false; root.add(collar);

  // ----------------------------------------------------------- locação
  const stakes = new THREE.Group(); root.add(stakes);
  const stakeG = new THREE.BoxGeometry(0.08, 0.7, 0.08); stakeG.translate(0, 0.35, 0);
  const stakeList = [[X1, PZ, 0], [X1 + 0.9, PZ - 1.6, 1], [X1 + 0.9, PZ + 1.6, 2]].map(([x, z], i) => { const s = new THREE.Mesh(stakeG, mat(i ? 0xcaa36a : 0xd23b2e)); s.position.set(x, 0, z); stakes.add(s); return s; });
  const string = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 3.2), mat(0xf2f0e6)); string.position.set(X1 + 0.9, 0.55, PZ); stakes.add(string);
  const markDisc = new THREE.Mesh(new THREE.RingGeometry(R + 0.04, R + 0.12, 24), mat(0xffffff)); markDisc.rotation.x = -Math.PI / 2; markDisc.position.set(X1, 0.04, PZ); stakes.add(markDisc);

  // ----------------------------------------------------------- vizinhas
  const doneM = noclip(0xc9c5ba, { r: 1, e: 0x25231f });
  for (const s of [-1, 1]) {
    const z = PZ + s * NB;
    const g = new THREE.PlaneGeometry(2 * (R - 0.02), DEPTH + HCUT); g.rotateY(-Math.PI / 2); g.translate(0, (HCUT - DEPTH) / 2, 0);
    const r = new THREE.Mesh(g, doneM); r.position.set(X1 - 0.05, 0, z); r.renderOrder = 4; root.add(r);
    for (const dz of [-0.2, 0.2]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.01, DEPTH - 0.3 + HTOP, 0.025), noclip(0x4a4d52)); l.position.set(X1 - 0.056, (HTOP - DEPTH + 0.3) / 2 - 0.15 + 0.15, z + dz); l.renderOrder = 5; root.add(l); }
    const head = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.02, R - 0.02, 0.5, 14), mat(0xc9c5ba)); head.position.set(X1, HCUT - 0.25, z); root.add(head);
  }

  // ----------------------------------------------------------- estaca
  const concM = mat(0x85827a, { r: 0.95 });
  const capM = noclip(0x85827a, { e: 0x57554f });
  const conc = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.015, R - 0.015, 1, 20), concM); conc.geometry.translate(0, 0.5, 0); conc.position.set(X1, -DEPTH, PZ); conc.visible = false; root.add(conc);
  const concCap = vplane(2 * (R - 0.015), capM); concCap.position.set(X1 - 0.01, -DEPTH, PZ); concCap.visible = false; root.add(concCap);

  // ----------------------------------------------------------- trado e hastes
  const augM = mat(0x8a8e95, { r: 0.5, m: 0.5, side: THREE.DoubleSide });
  const aug = new THREE.Group(); root.add(aug);
  const spin = new THREE.Group(); aug.add(spin);
  const rodG = new THREE.CylinderGeometry(0.035, 0.035, 1, 8); rodG.translate(0, 0.5, 0);
  const rod = new THREE.Mesh(rodG, mat(0x6f737a, { r: 0.5, m: 0.5 })); spin.add(rod);
  const rib = new THREE.Mesh(helixRibbon(0.65, 0.04, R - 0.03, 0.32), augM); rib.position.y = 0.1; spin.add(rib);
  const tipC = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 8), mat(0x4a4d52, { m: 0.5 })); tipC.rotation.x = Math.PI; tipC.position.y = 0.0; spin.add(tipC);
  const barG = new THREE.Group(); root.add(barG);
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), noclip(0x3a3d42, { r: 0.5, m: 0.5 })); b.rotation.z = Math.PI / 2; barG.add(b); }
  const grains = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 5), mat(0x7a5a3a, { r: 1 }), 14); grains.frustumCulled = false; grains.visible = false; root.add(grains);
  const spoil = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1, 12), mat(0x7a5a3a, { r: 1 })); spoil.geometry.translate(0, 0.5, 0); spoil.position.set(X1 + 0.5, 0, PZ + 1.8); spoil.visible = false; root.add(spoil);

  // ----------------------------------------------------------- gaiola
  const cage = new THREE.Group(); cage.visible = false; root.add(cage);
  const CL = DEPTH - 0.1 + 0.5, cageM = mat(0x3a3d42, { r: 0.5, m: 0.5 });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, CL, 5), cageM); b.position.set(Math.cos(a) * 0.2, -CL / 2, Math.sin(a) * 0.2); cage.add(b); }
  const NRG = 14;
  const rg = new THREE.TorusGeometry(0.2, 0.008, 5, 14); rg.rotateX(Math.PI / 2);
  const rings = new THREE.InstancedMesh(rg, cageM, NRG); rings.frustumCulled = false; cage.add(rings);
  { const m4 = new THREE.Matrix4(); for (let i = 0; i < NRG; i++) { m4.makeTranslation(0, -0.2 - i * 0.34, 0); rings.setMatrixAt(i, m4); } }
  const secCage = new THREE.Group(); root.add(secCage); secCage.visible = false;
  const secM = noclip(0x24272b);
  for (const dz of [-0.2, 0.2]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.014, CL, 0.022), secM); l.position.set(X1 - 0.03, -CL / 2, PZ + dz); secCage.add(l); }
  const stir = new THREE.InstancedMesh(new THREE.BoxGeometry(0.01, 0.018, 0.4), secM, NRG); stir.frustumCulled = false; secCage.add(stir);
  { const m4 = new THREE.Matrix4(); for (let i = 0; i < NRG; i++) { m4.makeTranslation(X1 - 0.031, -0.2 - i * 0.34, PZ); stir.setMatrixAt(i, m4); } }

  // ----------------------------------------------------------- funil, betoneira, carrinho
  const funnel = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 14, 1, true), mat(0xe8742c, { side: THREE.DoubleSide })); funnel.rotation.x = Math.PI; funnel.position.set(X1, 0.45, PZ); funnel.visible = false; root.add(funnel);
  const BETO = new THREE.Vector3(X1 + 3.0, 0, PZ + 2.3), FUN = new THREE.Vector3(X1 + 0.8, 0, PZ + 0.5), FUN2 = new THREE.Vector3(X1 + 0.9, 0, PZ + 0.9);
  const beto = new THREE.Group(); beto.visible = false; root.add(beto);
  beto.add(bx(1.0, 0.1, 0.8, dark, 0, 0.5, 0), bx(0.08, 0.6, 0.08, dark, -0.35, 0.25, 0.3), bx(0.08, 0.6, 0.08, dark, 0.35, 0.25, 0.3), bx(0.08, 0.6, 0.08, dark, -0.35, 0.25, -0.3), bx(0.08, 0.6, 0.08, dark, 0.35, 0.25, -0.3));
  const drum = new THREE.Group(); drum.position.set(0, 0.95, 0); drum.rotation.z = 0.5; beto.add(drum);
  { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.28, 0.9, 14), mat(0xe8742c)); drum.add(d); const sp = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, 0.04), dark); sp.position.y = 0.2; drum.add(sp); }
  beto.position.set(BETO.x, 0, BETO.z);
  const barrow = new THREE.Group(); barrow.visible = false; root.add(barrow);
  const tray = new THREE.Group(); tray.position.set(0, 0.4, 0); barrow.add(tray);
  tray.add(bx(0.45, 0.22, 0.7, mat(0x9aa0a8, { m: 0.4 }), 0, 0, 0));
  const load = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.62), mat(0x85827a, { r: 1 })); load.position.set(0, 0.1, 0); tray.add(load);
  barrow.add(bx(0.04, 0.04, 0.8, dark, 0.2, 0.55, -0.6), bx(0.04, 0.04, 0.8, dark, -0.2, 0.55, -0.6));
  { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 12), dark); w.rotation.z = Math.PI / 2; w.position.set(0, 0.17, 0.4); barrow.add(w); }
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 5), mat(0x8b8880, { r: 1 }), 10); drops.frustumCulled = false; drops.visible = false; root.add(drops);

  // ----------------------------------------------------------- arrasamento e baldrame
  const frag = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.06, 0.07), mat(0xb4b0a6, { r: 1 }), 10); frag.frustumCulled = false; frag.visible = false; root.add(frag);
  const TW = 0.26, TZ = 3.3;
  const tFloor = new THREE.Mesh(new THREE.PlaneGeometry(2 * TW, 2 * TZ), soilW); tFloor.rotation.x = -Math.PI / 2; tFloor.position.set(X1, BB0, PZ); tFloor.visible = false; root.add(tFloor);
  const tWall = vplane(2 * TZ, soilW); tWall.position.set(X1 + TW, BB0, PZ); tWall.visible = false; root.add(tWall);
  const forms = new THREE.Group(); forms.visible = false; root.add(forms);
  const fPlank = baseBox(0.04, BB1 - BB0 + 0.1, 6.4, wood); fPlank.position.set(X1 + 0.22, BB0, PZ); forms.add(fPlank);
  for (const z of [-2.6, -1.0, 1.0, 2.6]) { forms.add(bx(0.05, 0.9, 0.05, wood, X1 + 0.3, BB0 + 0.3, PZ + z)); }
  const bl = [-0.38, 0.08].map((y) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 2 * NB + 0.6), secM); l.position.set(X1 - 0.031, y, PZ); l.visible = false; root.add(l); return l; });
  const NS = 16;
  const bStirG = new THREE.BoxGeometry(0.01, BB1 - BB0 - 0.1, 0.02);
  const bStirs = new THREE.InstancedMesh(bStirG, secM, NS); { const m4 = new THREE.Matrix4(); for (let i = 0; i < NS; i++) { m4.makeTranslation(X1 - 0.031, (BB0 + BB1) / 2, PZ - NB - 0.2 + ((2 * NB + 0.4) * i) / (NS - 1)); bStirs.setMatrixAt(i, m4); } } bStirs.count = 0; bStirs.frustumCulled = false; root.add(bStirs);
  const beamConc = baseBox(0.4, BB1 - BB0, 2 * NB + 0.8, concM); beamConc.position.set(X1, BB0, PZ); beamConc.visible = false; root.add(beamConc);
  const beamCap = vplane(2 * NB + 0.8, capM); beamCap.position.set(X1 - 0.012, BB0, PZ); beamCap.visible = false; root.add(beamCap);
  // ----------------------------------------------------------- pessoas
  const wA = person(0xe8742c), wB = person(0x4a8fd0), wC = person(0xf2b705, 0xffffff), wD = person(0x3a3d42, 0xf2b705);
  [wA, wB, wC, wD].forEach((p) => { p.group.visible = false; root.add(p.group); });
  const hammer = new THREE.Group(); hammer.add(bx(0.05, 0.05, 0.5, dark, 0, 0, 0), bx(0.14, 0.1, 0.1, dark, 0, 0, 0.25)); hammer.visible = false; root.add(hammer);

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(C1_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
  const DK = (k) => (DEPTH * (k + 1)) / NC;
  const SW = 1.1;

  function tool(t) {
    if (t < D0) return { tip: 0.2, off: 0, rot: 0, dump: 0, dig: 0 };
    if (t < T.drill1) {
      const k = Math.min(NC - 1, Math.floor((t - D0) / CY)), u = t - D0 - k * CY, dk = DK(k);
      if (u < 2.4) return { tip: 0.2 - (0.2 + dk) * ease(u / 2.4), off: 0, rot: 1, dump: 0, dig: 1, k };
      if (u < 4.0) return { tip: -dk + (dk + 0.2) * ease((u - 2.4) / 1.6), off: 0, rot: 0, dump: 0, dig: 0, k };
      if (u < 4.5) return { tip: 0.2, off: SW * ease((u - 4.0) / 0.5), rot: 0, dump: 0, dig: 0, k };
      if (u < 5.5) return { tip: 0.2, off: SW, rot: 0, dump: (u - 4.5), dig: 0, k };
      return { tip: 0.2, off: SW * (1 - ease((u - 5.5) / 1.0)), rot: 0, dump: 0, dig: 0, k };
    }
    return { tip: 0.2, off: 0, rot: 0, dump: 0, dig: 0 };
  }
  function holeDepthAt(t) {
    if (t < D0) return 0;
    if (t >= T.drill1) return DEPTH;
    const k = Math.min(NC - 1, Math.floor((t - D0) / CY)), u = t - D0 - k * CY, dk = DK(k), dp = k ? DK(k - 1) : 0;
    const tp = u < 2.4 ? 0.2 - (0.2 + dk) * ease(u / 2.4) : -dk;
    return Math.max(dp, Math.min(dk, -tp));
  }
  const loadAt = (t0, i) => t0 + LC * i;
  const pourLvl = (t) => { let s = 0; for (let i = 0; i < 3; i++) { const a = loadAt(T.pour0, i) + LC * 0.5; s += ease(win(t, a, a + 1.2)); } return s / 3; };
  const beamLvl = (t) => { let s = 0; for (let i = 0; i < 2; i++) { const a = loadAt(T.pr0, i) + LC * 0.5; s += ease(win(t, a, a + 1.2)); } return s / 2; };
  const topOf = (t) => HTOP + (HCUT - HTOP) * ease(win(t, T.brk0, T.brk1));
  function info(t) {
    if (t < T.s2) return { step: 0, p: win(t, 0, T.s2), note: t < T.stk1 ? 'Cravando a estaca de locação' : 'Marcando o ponto com cordel e cal' };
    if (t < T.s3) { const k = Math.min(NC, Math.floor((t - D0) / CY) + 1), d = holeDepthAt(t); return { step: 1, p: win(t, T.s2, T.s3), note: t < T.drill1 ? `Ciclo ${k} de ${NC} · furo com ${d.toFixed(1).replace('.', ',')} m de ${DEPTH.toFixed(1).replace('.', ',')} m` : 'Furo pronto, profundidade conferida' }; }
    if (t < T.s4) return { step: 2, p: win(t, T.s3, T.s4), note: t < T.cage1 ? 'Descendo a gaiola à mão' : t < T.pour0 ? 'Instalando o funil' : t < T.pour1 ? `Lançamento ${Math.min(3, Math.floor((t - T.pour0) / LC) + 1)} de 3` : 'Concreto adensado e curando' };
    return { step: 3, p: win(t, T.s4, T.END), note: t < T.brk1 ? 'Arrasando a cabeça com ponteira' : t < T.dig1 ? 'Abrindo a vala do baldrame' : t < T.form1 ? 'Montando as fôrmas' : t < T.reb1 ? 'Armando a viga' : t < T.pr1 ? 'Concretando a viga baldrame' : 'Viga curando, estacas ligadas' };
  }
  let t = 0;

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    t = st.tc; const inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    // locação
    const stk = ease(win(t, 0.4, T.stk1 - 1));
    stakes.visible = t < T.s2 + 0.3;
    stakeList.forEach((s, i) => { s.visible = stk > 0.05 + i * 0.1; s.scale.y = Math.max(0.01, i ? 1 : stk); });
    string.visible = t > T.stk1 - 0.8; string.scale.z = Math.max(0.01, ease(win(t, T.stk1 - 0.8, T.mark1 - 2)));
    markDisc.visible = t > T.mark1 - 3;

    // furo
    const holeD = holeDepthAt(t), tl = tool(t);
    holeWall.visible = holeD > 0.02; holeWall.scale.y = Math.max(0.001, holeD); collar.visible = holeD > 0.02;
    terrainHoles[0].set(X1 - 0.6, X1 + 0.6, PZ - 0.6, PZ + 0.6);
    if (holeD > 0.02) section.setBand(0, PZ - R, PZ + R, -holeD, 0.05); else section.setBand(0, 0, 0, 0, 0);

    // trado: hastes, cabo em T e operário girando
    const augOn = t >= D0 - 1 && t < T.drill1 + 0.5;
    aug.visible = barG.visible = augOn;
    aug.position.set(X1, tl.tip, PZ + tl.off);
    const th = tl.rot ? 1.2 * Math.sin((t - D0) * 2.6) : 0;
    spin.rotation.y = -th; rod.scale.y = Math.max(0.05, HAND - tl.tip);
    barG.position.set(X1, HAND, PZ + tl.off); barG.rotation.y = -th;
    wA.group.visible = augOn;
    wA.group.position.set(X1 + 1.0 * Math.cos(th), 0, PZ + tl.off + 1.0 * Math.sin(th)); wA.group.rotation.y = th; wA.upper.rotation.x = 0.35 + (tl.rot ? 0.1 * Math.sin(tAbs * 6) : 0);
    // grãos e pilha de solo
    grains.visible = tl.dump > 0 && tl.dump < 1;
    if (grains.visible) { for (let i = 0; i < 14; i++) { const u = clamp01(tl.dump * 1.1 - (i % 5) * 0.07), a = i * 2.3; v.set(X1 + 0.5 + Math.cos(a) * 0.35 * u, 0.9 - 0.85 * u * u, PZ + SW + Math.sin(a) * 0.35 * u); m4.makeTranslation(v.x, v.y, v.z); grains.setMatrixAt(i, m4); } grains.instanceMatrix.needsUpdate = true; }
    const sp = clamp01(holeD / DEPTH);
    spoil.visible = sp > 0.03; spoil.position.z = PZ + 1.8; spoil.scale.set(0.5 + 0.7 * sp, 0.12 + 0.5 * sp, 0.5 + 0.7 * sp);
    // ajudante do furo
    wB.group.visible = t > D0 - 1 && t < T.s3 + 1;
    { const u = 0.5 + 0.5 * Math.sin(tAbs * 0.8); wB.group.position.set(X1 + 1.9, 0, PZ + 1.0 + 1.2 * u); wB.group.rotation.y = Math.cos(tAbs * 0.8) > 0 ? 0 : Math.PI; wB.upper.rotation.x = 0.3; }

    // gaiola
    const cgp = ease(win(t, T.cage0, T.cage1)), cageTop = 3.2 - (3.2 - 0.5) * cgp;
    cage.visible = t >= T.cage0 - 0.2; cage.position.set(X1, cageTop, PZ); secCage.visible = cage.visible && cgp > 0.05; secCage.position.y = cageTop;
    wC.group.visible = t > T.cage0 - 1 && t < T.fun0 + 1; wC.group.position.set(X1 + 0.9, 0, PZ - 0.9); wC.group.rotation.y = -Math.PI / 4 * 3; wC.upper.rotation.x = 0.5 * (1 - cgp);
    funnel.visible = t >= T.fun0 && t < T.pour1 + 1.0;

    // betoneira e carrinho (concretagem da estaca e da viga)
    const betoOn = (t > T.pour0 - 2 && t < T.pour1 + 1.5) || (t > T.pr0 - 2 && t < T.pr1 + 1.5);
    beto.visible = betoOn; if (betoOn) drum.children[1].rotation.y = tAbs * 3;
    const pile = t >= T.pour0 && t < T.pour1 + 0.3, beam = t >= T.pr0 && t < T.pr1 + 0.3;
    const t0 = pile ? T.pour0 : T.pr0, dest = pile ? FUN : FUN2;
    barrow.visible = wD.group.visible = pile || beam;
    if (pile || beam) {
      const u = ((t - t0) % LC) / LC;
      let f, tilt = 0, hasLoad = true;
      if (u < 0.15) f = 0; else if (u < 0.5) f = ease((u - 0.15) / 0.35); else if (u < 0.65) { f = 1; tilt = ease((u - 0.5) / 0.08) * (1 - ease((u - 0.6) / 0.05)); hasLoad = u < 0.56; } else { f = 1 - ease((u - 0.65) / 0.35); hasLoad = false; }
      const dir = new THREE.Vector3().subVectors(dest, BETO).setY(0); const dn = dir.clone().normalize();
      barrow.position.set(BETO.x + dir.x * f - dn.x * 0.55, 0, BETO.z + dir.z * f - dn.z * 0.55);
      const fw = u < 0.65 ? 1 : -1;
      barrow.rotation.y = Math.atan2(dn.x * fw, dn.z * fw);
      tray.rotation.x = tilt * 0.8; load.visible = hasLoad;
      wD.group.position.set(barrow.position.x - dn.x * fw * 0.95, 0, barrow.position.z - dn.z * fw * 0.95); wD.group.rotation.y = Math.atan2(-dn.x * fw, dn.z * fw); wD.upper.rotation.x = 0.4;
    }
    const dropOn = (pile || beam) && (((t - t0) % LC) / LC > 0.5 && ((t - t0) % LC) / LC < 0.66);
    drops.visible = dropOn;
    if (dropOn) { for (let i = 0; i < 10; i++) { const fr = (tAbs * 2 + i / 10) % 1; const tgt = pile ? new THREE.Vector3(X1, 0.5, PZ) : new THREE.Vector3(X1 + 0.45, 0.7, PZ + 0.8); v.set(tgt.x + Math.sin(i * 3.1) * 0.08, tgt.y - 1.0 * fr, tgt.z + Math.cos(i * 2.3) * 0.08); m4.makeTranslation(v.x, v.y, v.z); drops.setMatrixAt(i, m4); } drops.instanceMatrix.needsUpdate = true; }

    // concreto da estaca
    const pl = pourLvl(t), lvl = -DEPTH + (DEPTH + HTOP) * pl;
    conc.visible = concCap.visible = pl > 0.005;
    const top = t < T.brk0 ? lvl : topOf(t);
    conc.scale.y = concCap.scale.y = Math.max(0.001, top + DEPTH);
    concM.color.copy(WET).lerp(CURED, clamp01((t - T.pour1) / 8)); capM.color.copy(concM.color);

    // arrasamento
    const brk = t > T.brk0 && t < T.brk1;
    wC.group.visible = wC.group.visible || brk || (t > T.brk0 - 1 && t < T.brk1 + 1);
    if (t >= T.s4 - 0.1 && t < T.dig0 + 2) { wC.group.visible = true; wC.group.position.set(X1 + 0.8, 0, PZ - 0.5); wC.group.rotation.y = -Math.PI * 0.8; wC.upper.rotation.x = 0.6 + (brk ? 0.2 * Math.sin(tAbs * 14) : 0); }
    hammer.visible = t > T.brk0 - 1 && t < T.brk1 + 1; hammer.position.set(X1 + 0.5, Math.max(0.2, top + 0.3), PZ - 0.3 + (brk ? 0.05 * Math.sin(tAbs * 14) : 0)); hammer.rotation.y = 0.4;
    frag.visible = brk;
    if (brk) { for (let i = 0; i < 10; i++) { const u = (tAbs * 1.4 + i / 10) % 1, a = i * 2.4; v.set(X1 + 0.35 + Math.cos(a) * 0.5 * u, top + 0.25 + 0.7 * u - 2.4 * u * u, PZ + Math.sin(a) * 0.5 * u); if (v.y < 0.03) v.y = 0.03; m4.makeTranslation(v.x, v.y, v.z); frag.setMatrixAt(i, m4); } frag.instanceMatrix.needsUpdate = true; }
    // vala do baldrame
    const dg = ease(win(t, T.dig0, T.dig1)), td = (-BB0) * dg;
    terrainHoles[1].set(X1 - TW, X1 + TW, PZ - TZ, PZ + TZ);
    if (dg > 0.02) section.setBand(1, PZ - TZ, PZ + TZ, -td, 0.05); else section.setBand(1, 0, 0, 0, 0);
    if (dg <= 0.02) terrainHoles[1].set(0, 0, 0, 0);
    tFloor.visible = tWall.visible = dg > 0.02; tFloor.position.y = -td; tWall.position.y = -td; tWall.scale.y = Math.max(0.001, td);
    forms.visible = t >= T.form0 - 0.2; { const fp = ease(win(t, T.form0, T.form1)); fPlank.scale.y = Math.max(0.001, fp); forms.children.forEach((c, i) => { if (i) c.visible = fp > 0.5; }); }
    const rb = ease(win(t, T.reb0, T.reb1 - 1));
    bl.forEach((l, i) => { l.visible = rb > 0.05 + i * 0.2; l.scale.z = Math.max(0.001, rb); });
    bStirs.count = Math.floor(NS * clamp01(win(t, T.reb0 + 1.5, T.reb1)));
    const bl2 = beamLvl(t);
    beamConc.visible = beamCap.visible = bl2 > 0.005; beamConc.scale.y = beamCap.scale.y = Math.max(0.001, bl2);
    // a viga cobre a vala: esconde parede/piso depois de concretada
    tFloor.visible = tWall.visible = tFloor.visible && bl2 < 0.995;

    // pessoas de apoio no baldrame (cavando)
    wC.group.visible = wC.group.visible && true;
    if (t >= T.dig0 && t < T.dig1 + 0.5) { wC.group.visible = true; wC.group.position.set(X1 + 0.7, 0, PZ + 2.5 * Math.sin(tAbs * 0.4)); wC.group.rotation.y = -Math.PI / 2; wC.upper.rotation.x = 0.55 + 0.15 * Math.sin(tAbs * 3); hammer.visible = false; }

    const a = anchors;
    a.trado.set(X1 - 0.03, tl.tip + 0.5, PZ + tl.off + R + 0.05);
    a.haste.set(X1 - 0.03, Math.min(HAND - 0.2, Math.max(tl.tip + 1.5, -DEPTH + 1.0)), PZ + tl.off - 0.05);
    a.solo_t.set(X1 + 0.5, 0.5, PZ + 1.8);
    a.furo.set(X1 - 0.06, -DEPTH + 1.2, PZ - R - 0.04);
    a.arm.set(X1 - 0.06, cageTop - 2.5, PZ + 0.2);
    a.funil.set(X1 - 0.03, 0.75, PZ - 0.4);
    a.conc.set(X1 - 0.06, Math.min(-1.6, Math.max(-DEPTH + 0.8, lvl - 1.0)), PZ - R - 0.04);
    a.viz.set(X1 - 0.06, -2.5, PZ - NB - R - 0.03);
    a.cab.set(X1 - 0.06, HCUT - 0.05, PZ + R + 0.05);
    a.bald.set(X1 - 0.06, (BB0 + BB1) / 2, PZ + 2.2);
    a.solo.set(X1, -9, PZ);
  }
  function labelVis(k, tt = st.tc) {
    switch (k) {
      case 'trado': return tt > D0 + 1 && tt < T.drill1;
      case 'haste': return tt > D0 + 1 && tt < T.drill1 && (((tt - D0) % CY) < 4.2);
      case 'solo_t': return tt > D0 + 7 && tt < T.dig0;
      case 'furo': return tt > T.drill1 - 1.5 && tt < T.cage0 + 2;
      case 'arm': return tt > T.cage1 - 1 && tt < T.pour0 + 2;
      case 'funil': return tt > T.fun0 + 0.5 && tt < T.pour1;
      case 'conc': return tt > T.pour0 + 5 && tt < T.s4 + 8;
      case 'viz': return tt > T.cage0 - 2 && tt < T.pour0;
      case 'cab': return tt > T.brk1 && tt < T.dig1;
      case 'bald': return tt > T.pr0 + 5;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hidden.g = engine.scene.getObjectByName('c-rig'); if (hidden.g) hidden.g.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); if (hidden.g) hidden.g.visible = true; },
  };
}
