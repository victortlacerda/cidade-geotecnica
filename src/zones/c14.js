import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person, WET, CURED } from './fund.js';

// ---------------------------------------------------------------------------
// C14 — Bloco de coroamento sobre 2 estacas. Seção em x = X1 pelo eixo das estacas.
// Escala exagerada (estacas de 1,0 m, bloco de 6 m) para ficar legível.
// ---------------------------------------------------------------------------
const X1 = -40, PZ = 20, R = 0.5, PD = 9.0, SPZ = 1.5;      // estacas em PZ ± 1,5
const PIT_X = 2.4, PIT_Z = 3.6, PIT_D = 1.6;                  // cava
const BY0 = -1.5, BY1 = -0.2, CUT = -1.4, BARTOP = -0.8;      // base e topo do bloco, cota de arrasamento
const T = {
  exIn0: 0.4, exIn1: 2.6, dig0: 3, dig1: 17, exOut0: 17.2, exOut1: 19, s2: 19,
  brkA0: 20.5, brkA1: 27, brkB0: 27.5, brkB1: 34, clean0: 34.2, clean1: 37, s3: 37,
  la0: 37.2, la1: 40, form0: 40.5, form1: 45.5, bot0: 46, bot1: 49.5, top0: 49.5, top1: 52, pil0: 52, pil1: 55.5, s4: 57,
  truckIn0: 57, truckIn1: 59.5, pour0: 60, pour1: 70, trOut0: 70.5, trOut1: 72.5, END: 80,
};
export const C14 = { box: { x0: -125, x1: X1, z0: 8, z1: 32 } };
export const C14_STEP_STARTS = [0, T.s2, T.s3, T.s4];
export const C14_STEPS = [
  { t: 'Escavar em volta das estacas', d: 'Com as estacas já executadas, a escavadeira abre uma cava rasa ao redor das cabeças, até a cota de fundo do bloco. O que sobra junto das estacas é limpo à mão, para não danificá-las. As cabeças das estacas ficam expostas, ainda com o concreto contaminado e irregular do topo.' },
  { t: 'Arrasar as estacas', d: 'O concreto da cabeça de cada estaca é quebrado com rompedor até a cota de arrasamento, onde o concreto é bom. As barras da armadura ficam de pé, expostas, e vão ficar embutidas no bloco: é isso que liga estaca e bloco. As estacas entram cerca de 5 a 10 cm no bloco.' },
  { t: 'Armar o bloco com os arranques', d: 'Sobre o fundo regularizado com uma camada de concreto magro, montam-se as fôrmas laterais, escoradas contra o terreno, e a armação do bloco, apoiada em espaçadores. Por último sobem as barras de arranque do pilar, amarradas com estribos, que vão continuar acima do bloco.' },
  { t: 'Concretar o bloco', d: 'O concreto é lançado e vibrado com agulha, para preencher todos os cantos entre as barras e a cabeça das estacas, sem vazios. O bloco cura e passa a receber a carga do pilar, repartindo-a entre as duas estacas.' },
];
export const C14_LABELS = [
  { k: 'estacas', t: 'Estacas' },
  { k: 'arras', t: 'Cabeça a arrasar' },
  { k: 'barras', t: 'Barras da estaca' },
  { k: 'lastro', t: 'Concreto magro' },
  { k: 'forma', t: 'Fôrma' },
  { k: 'arm', t: 'Armação do bloco' },
  { k: 'pilar', t: 'Arranque do pilar' },
  { k: 'bloco', t: 'Bloco de coroamento' },
  { k: 'na', t: 'Nível d’água (abaixo das pontas)' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const C14_CAM = { tx: -39, ty: -2.2, tz: PZ, yaw: -1.3, pitch: 0.2, dist: 21 };
export const C14_MCAM = { tx: -39, ty: -5.5, tz: PZ, yaw: -1.3, pitch: 0.2, dist: 36 };

export function createC14(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const dark = mat(0x2f3237, { r: 0.6, m: 0.3 });
  const wood = mat(0xb08a55, { r: 0.9 });
  const soilW = mat(0x6b4f33, { r: 1, e: 0x1c130b });
  const bx = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; return o; };
  const vplane = (w, m) => { const g = new THREE.PlaneGeometry(w, 1); g.rotateY(-Math.PI / 2); g.translate(0, 0.5, 0); return new THREE.Mesh(g, m); };
  const baseBox = (sx, sy, sz, m) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(0, sy / 2, 0); return new THREE.Mesh(g, m); };
  const strut = (a, b, th, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(th, th, a.distanceTo(b)), m); o.position.copy(a).add(b).multiplyScalar(0.5); o.lookAt(b); return o; };

  // ----------------------------------------------------------- cava
  const floorM = mat(0x86683f, { r: 1, e: 0x1a1308 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * PIT_X, 2 * PIT_Z), floorM); floor.rotation.x = -Math.PI / 2; floor.position.set(X1, -0.01, PZ); floor.visible = false; root.add(floor);
  const wallE = vplane(2 * PIT_Z, soilW); wallE.position.set(X1 + PIT_X, -PIT_D, PZ); wallE.visible = false; root.add(wallE);
  const wallsZ = [-1, 1].map((s) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(2 * PIT_X, 1), soilW); w.geometry.translate(0, 0.5, 0); w.position.set(X1, -PIT_D, PZ + s * PIT_Z); w.visible = false; root.add(w); return w; });

  // ----------------------------------------------------------- estacas
  const concM = mat(0x85827a, { r: 0.95 });
  const planeM = noclip(0xc9c5ba, { r: 1, e: 0x25231f });
  const piles = [-1, 1].map((s) => {
    const z = PZ + s * SPZ;
    const body = vplane(2 * (R - 0.02), planeM); body.position.set(X1 - 0.05, -PD, z); body.renderOrder = 4; root.add(body);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.02, R - 0.02, 1, 20), concM); cyl.geometry.translate(0, 0.5, 0); cyl.position.set(X1, -3, z); root.add(cyl);
    for (const dz of [-0.33, 0.33]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.01, BARTOP + 8, 0.03), noclip(0x4a4d52)); l.position.set(X1 - 0.056, (BARTOP - 8) / 2, z + dz); l.renderOrder = 5; root.add(l); }
    return { s, z, body, cyl };
  });

  // entulho do arrasamento e fragmentos
  const rubble = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.8, 7), mat(0x9c988e, { r: 1 })); rubble.geometry.translate(0, 0.4, 0); rubble.position.set(X1 + 1.3, -PIT_D, PZ); rubble.visible = false; root.add(rubble);
  const frag = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.1, 0.12), mat(0xb4b0a6, { r: 1 }), 14); frag.frustumCulled = false; frag.visible = false; root.add(frag);

  // ----------------------------------------------------------- lastro, fôrmas
  const lastroM = mat(0xaaa69b, { r: 1, e: 0x1e1c18 });
  const lastro = baseBox(2 * PIT_X, 0.1, 2 * PIT_Z, lastroM); lastro.position.set(X1, -PIT_D, PZ); lastro.visible = false; root.add(lastro);
  const lastroCapM = noclip(0xaaa69b, { e: 0x3a3833 });
  const lastroCap = vplane(2 * PIT_Z - 0.2, lastroCapM); lastroCap.position.set(X1 - 0.012, -PIT_D, PZ); lastroCap.visible = false; root.add(lastroCap);
  const forms = new THREE.Group(); root.add(forms); forms.visible = false;
  const formH = BY1 + 0.2 - BY0;
  const fz = [-1, 1].map((s) => { const f = baseBox(3.1, formH, 0.07, wood); f.position.set(X1, BY0, PZ + s * 3.05); forms.add(f); return f; });
  const fe = baseBox(0.07, formH, 6.1, wood); fe.position.set(X1 + 1.55, BY0, PZ); forms.add(fe);
  const braces = new THREE.Group(); forms.add(braces);
  for (const s of [-1, 1]) for (const x of [0.3, 1.2]) braces.add(strut(new THREE.Vector3(X1 + x, BY1 + 0.1, PZ + s * 3.1), new THREE.Vector3(X1 + x, -PIT_D + 0.1, PZ + s * 3.55), 0.07, wood));
  for (const z of [-1.8, 0, 1.8]) braces.add(strut(new THREE.Vector3(X1 + 1.6, BY1 + 0.1, PZ + z), new THREE.Vector3(X1 + 2.35, -PIT_D + 0.1, PZ + z), 0.07, wood));

  // ----------------------------------------------------------- armação do bloco (seção, em frente)
  const rbM = noclip(0x24272b);
  const SZ = 2.8, ND = 15;
  const dotG = new THREE.CircleGeometry(0.05, 8); dotG.rotateY(-Math.PI / 2);
  const mkDots = (y) => { const im = new THREE.InstancedMesh(dotG, rbM, ND); const m4 = new THREE.Matrix4(); for (let i = 0; i < ND; i++) { m4.makeTranslation(X1 - 0.031, y, PZ - SZ + (2 * SZ * i) / (ND - 1)); im.setMatrixAt(i, m4); } im.count = 0; im.frustumCulled = false; root.add(im); return im; };
  const dotsB = mkDots(-1.37), dotsT = mkDots(-0.33);
  const lineB = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 2 * SZ + 0.1), rbM); lineB.position.set(X1 - 0.031, -1.3, PZ); lineB.visible = false; root.add(lineB);
  const lineT = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 2 * SZ + 0.1), rbM); lineT.position.set(X1 - 0.031, -0.26, PZ); lineT.visible = false; root.add(lineT);
  const stirG = new THREE.BoxGeometry(0.012, BY1 - BY0 - 0.2, 0.035); stirG.translate(0, (BY1 - BY0 - 0.2) / 2, 0);
  const stirs = [-1, 1].map((s) => { const m = new THREE.Mesh(stirG, rbM); m.position.set(X1 - 0.031, BY0 + 0.07, PZ + s * (SZ + 0.04)); m.visible = false; root.add(m); return m; });
  const spacM = noclip(0xd8d4c8);
  const spacers = [-2, -0.7, 0.7, 2].map((z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.12), spacM); m.position.set(X1 - 0.03, -PIT_D + 0.15, PZ + z); m.visible = false; root.add(m); return m; });
  // pilar: barras de arranque + estribos
  const PIL_TOP = 1.9, PB = BY0 + 0.1;
  const pilBarG = new THREE.BoxGeometry(0.02, PIL_TOP - PB, 0.03); pilBarG.translate(0, (PIL_TOP - PB) / 2, 0);
  const pilBars = [-0.35, 0.35].map((dz) => { const m = new THREE.Mesh(pilBarG, rbM); m.position.set(X1 - 0.031, PB, PZ + dz); m.visible = false; root.add(m); return m; });
  const pil3d = [];
  for (const dx of [0.35]) for (const dz of [-0.35, 0.35]) { const g = new THREE.CylinderGeometry(0.025, 0.025, PIL_TOP - PB, 6); g.translate(0, (PIL_TOP - PB) / 2, 0); const m = new THREE.Mesh(g, mat(0x3a3d42, { r: 0.5, m: 0.5 })); m.position.set(X1 + dx, PB, PZ + dz); m.visible = false; root.add(m); pil3d.push(m); }
  const NT = 9;
  const tieG = new THREE.BoxGeometry(0.012, 0.025, 0.74);
  const ties = new THREE.InstancedMesh(tieG, rbM, NT); { const m4 = new THREE.Matrix4(); for (let i = 0; i < NT; i++) { m4.makeTranslation(X1 - 0.031, -1.15 + i * 0.36, PZ); ties.setMatrixAt(i, m4); } } ties.count = 0; ties.frustumCulled = false; root.add(ties);

  // ----------------------------------------------------------- concreto do bloco
  const bcM = mat(0x85827a, { r: 0.95 });
  const bloco = baseBox(3.0, BY1 - BY0, 6.0, bcM); bloco.position.set(X1, BY0, PZ); bloco.visible = false; root.add(bloco);
  const capM = noclip(0x85827a, { e: 0x57554f });
  const blocoCap = vplane(6.0, capM); blocoCap.position.set(X1 - 0.01, BY0, PZ); blocoCap.visible = false; root.add(blocoCap);

  // ----------------------------------------------------------- máquinas e pessoas
  const exc = M.excavator(0.55); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.position.set(X1 + 6.2, 0, PZ - 0.5); excW.visible = false; root.add(excW);
  const spoil = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1, 12), mat(0x7a5a3a, { r: 1 })); spoil.geometry.translate(0, 0.5, 0); spoil.position.set(X1 + 3.4, 0, PZ + 5.4); spoil.visible = false; root.add(spoil);
  const truck = M.mixerTruck(); truck.scale.setScalar(0.62); truck.visible = false; root.add(truck);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1), mat(0x9aa0a8, { m: 0.4 })); chute.visible = false; root.add(chute);
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 6, 5), mat(0x8b8880, { r: 1 }), 14); drops.frustumCulled = false; drops.visible = false; root.add(drops);
  const wA = person(0xe8742c), wB = person(0x4a8fd0), vib = person(0xf2b705, 0xffffff), tr = person(0x3a3d42, 0xf2b705), hand = person(0xe8742c);
  [wA, wB, vib, tr, hand].forEach((p) => { p.group.visible = false; root.add(p.group); });
  const toolM = mat(0x4a4d52, { m: 0.5, r: 0.5 });
  const breaker = [0, 1].map(() => { const g = new THREE.Group(); g.add(bx(0.1, 0.1, 0.9, toolM, 0, 0, 0), bx(0.3, 0.06, 0.06, dark, 0, 0.1, -0.3)); g.visible = false; root.add(g); return g; });
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), mat(0xd23b2e)); needle.visible = false; root.add(needle);
  const pA = person(0xe8742c), pB = person(0x4a8fd0); [pA, pB].forEach((p) => root.add(p.group));

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(C14_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};
  const pop = (t, a, b, f = 0.5) => ease((t - a) / f) * ease((b - t) / f);
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
  const depthAt = (t) => PIT_D * ease(win(t, T.dig0, T.dig1));
  const topOf = (i, t) => 0.3 + (CUT - 0.3) * ease(win(t, i ? T.brkB0 : T.brkA0, i ? T.brkB1 : T.brkA1));
  const lvlAt = (t) => BY0 + (BY1 - BY0) * ease(win(t, T.pour0, T.pour1));
  function info(t) {
    if (t < T.s2) return { step: 0, p: win(t, 0, T.s2), note: t < T.dig0 ? 'Escavadeira chegando' : t < T.dig1 ? `Escavando · ${depthAt(t).toFixed(1).replace('.', ',')} m de ${PIT_D.toFixed(1).replace('.', ',')} m` : 'Limpando junto às estacas' };
    if (t < T.s3) return { step: 1, p: win(t, T.s2, T.s3), note: t < T.brkA1 ? 'Rompendo a cabeça da 1ª estaca' : t < T.brkB1 ? 'Rompendo a cabeça da 2ª estaca' : 'Removendo o entulho · barras expostas' };
    if (t < T.s4) return { step: 2, p: win(t, T.s3, T.s4), note: t < T.la1 ? 'Lançando o concreto magro' : t < T.form1 ? 'Montando as fôrmas' : t < T.top1 ? 'Armando o bloco sobre espaçadores' : 'Subindo os arranques do pilar' };
    return { step: 3, p: win(t, T.s4, T.END), note: t < T.pour0 ? 'Caminhão betoneira chegando' : t < T.pour1 ? 'Lançando e vibrando o concreto' : t < T.trOut1 ? 'Alisando a superfície' : 'Bloco curando' };
  }

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    // cava
    const d = depthAt(t);
    terrainHoles[0].set(X1 - PIT_X, X1 + PIT_X, PZ - PIT_Z, PZ + PIT_Z);
    if (d > 0.02) section.setBand(0, PZ - PIT_Z, PZ + PIT_Z, -d, 0.05); else section.setBand(0, 0, 0, 0, 0);
    const on = d > 0.02;
    floor.visible = wallE.visible = on; wallsZ.forEach((w) => { w.visible = on; w.scale.y = Math.max(0.001, d); w.position.y = -d; });
    floor.position.y = -d - 0.005; wallE.position.y = -d; wallE.scale.y = Math.max(0.001, d);
    // cor do fundo: solo -> concreto magro
    floorM.color.set(0x86683f);

    // escavadeira e solo
    const eS = pop(t, T.exIn0, T.exOut1, 0.8);
    excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); exc.update(t * 1.4);
    const sv = clamp01(d / PIT_D);
    spoil.visible = sv > 0.03; spoil.scale.set(0.8 + 0.9 * sv, 0.2 + 1.2 * sv, 0.8 + 0.9 * sv);

    // estacas e arrasamento
    piles.forEach((p, i) => {
      const top = topOf(i, t);
      p.body.scale.y = Math.max(0.001, top + PD); p.cyl.scale.y = Math.max(0.001, top + 3);
    });
    const brk = (i) => t > (i ? T.brkB0 : T.brkA0) && t < (i ? T.brkB1 : T.brkA1);
    const bw = [wA, wB];
    breaker.forEach((b, i) => {
      const act = brk(i); const w = bw[i]; const dirz = i ? 1 : -1; // pilha A (z-) / B (z+)
      const windowOn = t > (i ? T.brkB0 : T.brkA0) - 1.2 && t < (i ? T.brkB1 : T.brkA1) + 1.0;
      w.group.visible = windowOn; b.visible = windowOn;
      const zw = PZ + dirz * SPZ * -0.2;
      w.group.position.set(X1 + 0.5, -PIT_D, PZ + dirz * 0.25); w.group.rotation.y = dirz < 0 ? Math.PI : 0; w.upper.rotation.x = act ? 0.5 + 0.1 * Math.sin(tAbs * 40) : 0.2; void zw;
      const top = topOf(i, t), zc = PZ + dirz * SPZ;
      b.position.set(X1 + 0.5, Math.max(-PIT_D + 0.8, top - 0.1), PZ + dirz * (SPZ - 0.1 - R + 0.45)); b.rotation.y = 0; b.position.z += (act ? 0.04 * Math.sin(tAbs * 45) : 0); void zc;
    });
    // fragmentos
    const ba = brk(0), bb = brk(1);
    frag.visible = ba || bb;
    if (frag.visible) { const i0 = ba ? 0 : 1, zc = PZ + (i0 ? 1 : -1) * SPZ, top = topOf(i0, t); for (let i = 0; i < 14; i++) { const u = (tAbs * 1.3 + i / 14) % 1, a = i * 2.3; v.set(X1 + 0.4 + Math.cos(a) * 0.9 * u, top + 0.3 + 1.3 * u - 3.2 * u * u, zc + Math.sin(a) * 0.9 * u); if (v.y < -PIT_D + 0.05) v.y = -PIT_D + 0.05; m4.makeTranslation(v.x, v.y, v.z); frag.setMatrixAt(i, m4); } frag.instanceMatrix.needsUpdate = true; }
    const rb = clamp01((ease(win(t, T.brkA0, T.brkA1)) + ease(win(t, T.brkB0, T.brkB1))) / 2) * (1 - ease(win(t, T.clean0 + 0.5, T.clean1 - 0.5)));
    rubble.visible = rb > 0.03; rubble.scale.set(0.5 + 0.9 * rb, 0.15 + 1.1 * rb, 0.5 + 0.9 * rb);
    // faxineiros
    const cl = pop(t, T.clean0, T.clean1, 0.6);
    hand.group.visible = cl > 0.05; hand.group.position.set(X1 + 1.2, -PIT_D, PZ + 1.0 * Math.sin(tAbs * 0.9)); hand.group.rotation.y = -Math.PI / 2; hand.upper.rotation.x = 0.35 + 0.15 * Math.sin(tAbs * 3);

    // lastro e fôrmas
    const la = ease(win(t, T.la0, T.la1));
    lastro.visible = lastroCap.visible = la > 0.01; lastro.scale.set(la, 1, la); lastroCap.scale.set(1, 0.1, Math.max(0.001, la));
    forms.visible = t >= T.form0 - 0.2;
    const f1 = ease(win(t, T.form0, T.form1 - 2)), f2 = ease(win(t, T.form0 + 1.5, T.form1));
    fz[0].scale.y = Math.max(0.001, f1); fz[1].scale.y = Math.max(0.001, f1); fe.scale.y = Math.max(0.001, f2);
    braces.visible = t > T.form1 - 2.5; braces.scale.setScalar(1);

    // armação
    const bb1 = win(t, T.bot0, T.bot1), tt1 = win(t, T.top0, T.top1);
    dotsB.count = Math.floor(ND * clamp01(bb1 * 1.1)); lineB.visible = bb1 > 0.05; lineB.scale.z = Math.max(0.001, ease(bb1));
    spacers.forEach((s, i) => { s.visible = bb1 > 0.1 + i * 0.15; });
    dotsT.count = Math.floor(ND * clamp01(tt1 * 1.1)); lineT.visible = tt1 > 0.05; lineT.scale.z = Math.max(0.001, ease(tt1));
    stirs.forEach((s) => { s.visible = tt1 > 0.3; s.scale.y = Math.max(0.001, ease(win(t, T.top0 + 0.8, T.top1))); });
    const pp = ease(win(t, T.pil0, T.pil1 - 1));
    pilBars.forEach((m) => { m.visible = pp > 0.01; m.scale.y = Math.max(0.001, pp); });
    pil3d.forEach((m) => { m.visible = pp > 0.01; m.scale.y = Math.max(0.001, pp); });
    ties.count = Math.floor(NT * clamp01(win(t, T.pil0 + 1.2, T.pil1)));

    // concretagem
    const lvl = lvlAt(t), pourOn = t > T.pour0 - 0.1;
    bloco.visible = blocoCap.visible = pourOn && lvl > BY0 + 0.02; bloco.scale.y = blocoCap.scale.y = Math.max(0.001, (lvl - BY0) / (BY1 - BY0));
    bcM.color.copy(WET).lerp(CURED, clamp01((t - T.pour1) / 8)); capM.color.copy(bcM.color);
    const trIn = ease(win(t, T.truckIn0, T.truckIn1)), trOut = ease(win(t, T.trOut0, T.trOut1));
    const tVis = t >= T.truckIn0 && t < T.trOut1 + 0.2;
    truck.visible = tVis; truck.position.set(-30.5 + 9 * (1 - trIn) + 9 * trOut, 0, 27.0); truck.userData.spin.rotation.x = tAbs * 2.5;
    chute.visible = tVis && t > T.truckIn1 - 0.4 && t < T.pour1 + 0.6;
    { const c0 = new THREE.Vector3(truck.position.x - 3.0, 1.55, 27.0), c1 = new THREE.Vector3(X1 + 0.6, 1.9, PZ + 1.2); chute.position.copy(c0).add(c1).multiplyScalar(0.5); chute.scale.z = Math.max(0.01, c0.distanceTo(c1)); chute.lookAt(c1); }
    const pouring = t > T.pour0 && t < T.pour1 + 0.3;
    drops.visible = pouring;
    if (pouring) { for (let i = 0; i < 14; i++) { const f = (tAbs * 1.4 + i / 14) % 1; v.set(X1 + 0.6 + Math.sin(i * 3.1) * 0.12, 1.8 + (lvl + 0.05 - 1.8) * f, PZ + 1.2 + Math.cos(i * 2.3) * 0.12); m4.makeTranslation(v.x, v.y, v.z); drops.setMatrixAt(i, m4); } drops.instanceMatrix.needsUpdate = true; }
    // vibrador: homem na borda leste com agulha
    const vOn = t > T.pour0 + 1 && t < T.pour1 + 1.2;
    vib.group.visible = vOn; needle.visible = vOn;
    const vz = PZ + 2.3 * Math.sin(tAbs * 0.55);
    vib.group.position.set(X1 + 2.9, 0, vz); vib.group.rotation.y = Math.PI / 2; vib.upper.rotation.x = 0.35;
    if (vOn) { const a0 = new THREE.Vector3(X1 + 2.7, 0.9, vz), a1 = new THREE.Vector3(X1 + 0.5 + 0.12 * Math.sin(tAbs * 20), Math.max(BY0 + 0.1, lvl - 0.5), vz); needle.position.copy(a0).add(a1).multiplyScalar(0.5); needle.scale.z = Math.max(0.01, a0.distanceTo(a1)); needle.lookAt(a1); }
    // pedreiro alisando
    const trV = t > T.pour1 && t < T.trOut1 + 1.5;
    tr.group.visible = trV; tr.group.position.set(X1 + 2.9, 0, PZ + 1.8 * Math.sin(tAbs * 0.7)); tr.group.rotation.y = Math.PI / 2; tr.upper.rotation.x = 0.45;
    // pessoas de apoio
    const pw = (p, x0, x1, z, sp_, bend, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp_ + ph); p.group.position.set(x0 + (x1 - x0) * u, 0, z); p.group.rotation.y = Math.cos(tAbs * sp_ + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = bend; };
    pw(pA, -34, -29.5, 15.2, 0.5, 0.12, 0); pw(pB, -33, -28.5, 25.0, 0.45, 0.12, 1.7);

    const a = anchors;
    a.estacas.set(X1 - 0.06, -5, PZ - SPZ - R - 0.04);
    a.arras.set(X1 - 0.06, topOf(0, t) - 0.1, PZ - SPZ - R - 0.04);
    a.barras.set(X1 - 0.06, -2.8, PZ - SPZ + 0.33);
    a.lastro.set(X1 - 0.06, -PIT_D + 0.05, PZ + PIT_Z - 0.2);
    a.forma.set(X1 - 0.03, -0.9, PZ + 3.1);
    a.arm.set(X1 - 0.06, -0.3, PZ + 2.5);
    a.pilar.set(X1 - 0.06, 0.9, PZ + 0.35);
    a.bloco.set(X1 - 0.06, -0.9, PZ - 2.6);
    a.na.set(X1 - 0.06, -9.55, PZ - 5);
    a.solo.set(X1, -15, PZ);
  }
  function labelVis(k, t = st.tc) {
    switch (k) {
      case 'estacas': return t > T.dig1 - 4;
      case 'arras': return t > T.dig1 - 1 && t < T.brkB1;
      case 'barras': return t > T.brkA1 + 0.5 && t < T.s4;
      case 'lastro': return t > T.la1 - 0.5 && t < T.s4;
      case 'forma': return t > T.form1 - 1 && t < T.pour0 + 4;
      case 'arm': return t > T.top1 - 1 && t < T.pour0 + 5;
      case 'pilar': return t > T.pil1 - 1;
      case 'bloco': return t > T.pour0 + 6;
      case 'na': return t > T.dig1;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hidden.g = engine.scene.getObjectByName('c-rig'); if (hidden.g) hidden.g.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); if (hidden.g) hidden.g.visible = true; },
  };
}
