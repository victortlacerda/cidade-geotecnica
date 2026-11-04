import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person, WET, CURED } from './fund.js';
import { X1, PZ, SITE_BOX, vplane, bx, baseBox, depthMat, strataQuad, soilColorAt, buildSurroundings, buildCraneBucket } from './dsite.js';
import { hideDPit, showDPit } from './dpit.js';

// ---------------------------------------------------------------------------
// D6 — Parede diafragma. Seção em x = X1 (perpendicular à parede), cortando o painel 1 da parede norte.
// Fase A: muretas-guia, escavação do painel com clamshell e lama, gaiola, concretagem com tremonha.
// Fase B: demais painéis, viga de coroamento e escavação da cava com 3 níveis de escoras, passando do nível d'água.
// Escala exagerada: parede de 1,2 m de espessura, painéis de 2,8 m, 15 m de profundidade.
// ---------------------------------------------------------------------------
const HW = 7.5, PX = 13, TW = 1.2, ZC = PZ - HW - TW / 2 + 0.04, PHL = 1.4, DEPTH = 15, NC = 4, CYC = 7, CLN = 15;
const GWT = 0.35, GWH = 1.2, TRX = 2.3, TRZ = 1.5;
const TOPB = -0.7, DMAX = 11;
const SLV = [-0.35, -4.5, -8.4];
const WINS = [[136, 152], [166, 182], [196, 204]];
const DEP = [4.0, 3.9, 2.1];
const TC = 8;
const T = {
  tIn0: 0.4, tIn1: 2.4, trDig0: 2.4, trDig1: 8, form0: 8.5, form1: 12.5, gwPour0: 12.5, gwPour1: 16, strut0: 16.2, s2: 19,
  crIn0: 19, crIn1: 21.5, ex0: 21.5, ex1: 21.5 + CYC * NC, s3: 51,
  cA0: 51, cA1: 58, cB0: 60, cB1: 64, splice1: 68, low0: 68.5, low1: 75, crOut: 76, s4: 78,
  tr0: 78, tr1: 83, tkIn0: 80, tkIn1: 83.5, pour0: 84.5, pour1: 100, tkOut0: 100.5, tkOut1: 103, trOut0: 100, trOut1: 103.5,
  pan0: 104, pan1: 116, s5: 118, beam0: 118, beam1: 123, exIn: 120, exInE: 124, pre0: 122, pre1: 127, st1a: 127, st1b: 133, crIn: 131, crInE: 135,
  wal2: 152, wal2e: 156, st2a: 156, st2b: 164, wal3: 182, wal3e: 186, st3a: 186, st3b: 194, END: 214,
};
export const D6 = { box: SITE_BOX };
export const D6_STEP_STARTS = [0, T.s2, T.s3, T.s4, T.s5];
export const D6_STEPS = [
  { t: 'Muretas-guia', d: 'Antes do primeiro painel, abre-se uma vala rasa e concretam-se duas muretas paralelas, no alinhamento da parede. Elas guiam a caçamba, mantêm o painel no prumo e seguram o solo do topo, a parte mais frágil. Escoras de madeira entre as muretas as mantêm no lugar enquanto o concreto ganha resistência.' },
  { t: 'Escavar o painel com clamshell e lama', d: 'O clamshell (caçamba articulada) desce aberto, fecha mordendo o solo, sobe cheio e descarrega ao lado. O furo é mantido sempre cheio de lama bentonítica, mais densa que a água: ela empurra as paredes e forma uma crosta fina nelas, e assim o painel não desmorona, nem abaixo do nível d’água. A lama circula por uma usina que recupera a que está limpa.' },
  { t: 'Descer a gaiola de armação', d: 'A gaiola é longa demais para descer inteira: o primeiro trecho desce e fica pendurado nas muretas, o segundo é içado e emendado, e então os dois descem juntos até cerca de 1 m do fundo. Espaçadores nas laterais mantêm o cobrimento do concreto mesmo dentro da lama.' },
  { t: 'Concretar o painel com tremonha', d: 'Tubos de concretagem descem até o fundo. O concreto, mais pesado que a lama, entra pelo funil e sobe de baixo para cima, empurrando a lama para o alto, de onde ela volta para a usina. A ponta dos tubos fica sempre mergulhada no concreto. Os tubos são retirados aos poucos. Painel por painel, a parede se completa, com juntas entre eles.' },
  { t: 'Escavar a cava e escorar', d: 'Com a parede pronta e ligada pela viga de coroamento, a cava é escavada em etapas, escorando a cada nível. Como a parede é contínua, profunda e quase impermeável, a escavação passa do nível d’água sem que a água de fora entre na cava: a parede segura o solo e também a água.' },
];
export const D6_LABELS = [
  { k: 'mureta', t: 'Mureta-guia' },
  { k: 'clam', t: 'Clamshell' },
  { k: 'lama', t: 'Lama bentonítica' },
  { k: 'solo_t', t: 'Solo escavado' },
  { k: 'usina', t: 'Usina de lama' },
  { k: 'arm', t: 'Gaiola de armação' },
  { k: 'trem', t: 'Tubos de concretagem' },
  { k: 'conc', t: 'Concreto do painel' },
  { k: 'parede', t: 'Parede diafragma' },
  { k: 'escora', t: 'Escoras' },
  { k: 'cacamba', t: 'Caçamba içada' },
  { k: 'predio', t: 'Prédio vizinho' },
  { k: 'na', t: 'Nível d’água', fixed: [0, 0] },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const D6_CAM = { tx: X1, ty: 1.5, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 58 };
export const D6_MCAM = { tx: X1, ty: 0, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 135 };

export function createD6(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const dark = mat(0x2f3237, { r: 0.6, m: 0.3 }), yel = mat(0xf2b705, { r: 0.7 }), wood = mat(0xb08a55, { r: 0.9 });
  const soilW = mat(0x6b4f33, { r: 1, e: 0x1c130b });
  const steelM = mat(0xd9772b, { r: 0.55, m: 0.3 }), walM = mat(0x4a5a6a, { r: 0.55, m: 0.3 });
  const strut = (a, b, th, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(th, th, a.distanceTo(b)), m); o.position.copy(a).add(b).multiplyScalar(0.5); o.lookAt(b); return o; };
  const setStrut = (o, a, b) => { o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.z = Math.max(0.01, a.distanceTo(b)); o.lookAt(b); };
  const sur = buildSurroundings(root);

  // ----------------------------------------------------------- vala, muretas e painel 1
  const tFloor = new THREE.Mesh(new THREE.PlaneGeometry(2 * TRX, 2 * TRZ), soilW); tFloor.rotation.x = -Math.PI / 2; tFloor.visible = false; root.add(tFloor);
  const tWall = vplane(2 * TRZ, soilW); tWall.position.set(X1 + TRX, -GWH, ZC); tWall.visible = false; root.add(tWall);
  const holeWall = new THREE.Mesh(new THREE.BoxGeometry(2 * PHL, 1, TW), mat(0x4a3827, { r: 1, side: THREE.BackSide, e: 0x2c1f12 })); holeWall.geometry.translate(0, -0.5, 0); holeWall.position.set(X1, 0, ZC); holeWall.visible = false; root.add(holeWall);
  const gwM = mat(0xb9b5aa, { r: 0.95 }), gwCapM = noclip(0xc9c5ba, { r: 1, e: 0x25231f });
  const GZ = TW / 2 + 0.05 + GWT / 2;
  const gws = [-1, 1].map((s) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2 * TRX - 0.2, GWH + 0.15, GWT), gwM); b.geometry.translate(0, (GWH + 0.15) / 2, 0); b.position.set(X1, -GWH, ZC + s * GZ); b.visible = false; root.add(b);
    const c = vplane(GWT, gwCapM); c.position.set(X1 - 0.012, -GWH, ZC + s * GZ); c.visible = false; c.renderOrder = 3; root.add(c);
    return { b, c };
  });
  const formsG = new THREE.Group(); formsG.visible = false; root.add(formsG);
  const gwForms = [-1, 1].map((s) => { const f = new THREE.Mesh(new THREE.BoxGeometry(2 * TRX - 0.2, GWH + 0.15, 0.04), wood); f.geometry.translate(0, (GWH + 0.15) / 2, 0); f.position.set(X1, -GWH, ZC + s * (GZ + GWT / 2 + 0.04)); formsG.add(f); return f; });
  const struts = [-1.0, 0.9].map((x) => { const s = bx(0.12, 0.12, 2 * GZ + 0.3, wood, X1 + x + 0.6, -0.35, ZC); s.visible = false; root.add(s); return s; });

  const slurryM = noclip(0xb4dccf, { op: 0.42, dw: false, r: 0.3, e: 0x3a6a5e });
  const slurry = vplane(TW, slurryM); slurry.position.set(X1 - 0.02, -1, ZC); slurry.visible = false; slurry.renderOrder = 6; root.add(slurry);
  const concM = mat(0x85827a, { r: 0.95 }), capM = noclip(0x85827a, { e: 0x57554f });
  const conc = new THREE.Mesh(new THREE.BoxGeometry(2 * PHL - 0.04, 1, TW - 0.04), concM); conc.geometry.translate(0, 0.5, 0); conc.position.set(X1, -DEPTH, ZC); conc.visible = false; root.add(conc);
  const concCap = vplane(TW - 0.04, capM); concCap.position.set(X1 - 0.012, -DEPTH, ZC); concCap.visible = false; concCap.renderOrder = 5; root.add(concCap);

  // ----------------------------------------------------------- guindaste e clamshell
  const crane = new THREE.Group(); crane.visible = false; root.add(crane);
  const CB = new THREE.Vector3(X1 + 6.5, 2.2, ZC + 8.2), CT = new THREE.Vector3(X1, 17, ZC + 0.6);
  crane.add(bx(4.6, 1.1, 2.8, dark, X1 + 7, 0.65, ZC + 8.7), bx(2.4, 1.8, 2.6, yel, X1 + 8, 2.0, ZC + 8.7), bx(1.4, 1.2, 1.4, mat(0x9fc4d8, { r: 0.3 }), X1 + 6, 2.7, ZC + 8.2));
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, CB.distanceTo(CT)), yel); boom.position.copy(CB).add(CT).multiplyScalar(0.5); boom.lookAt(CT); crane.add(boom);
  crane.add(bx(0.3, 9, 0.3, yel, X1 + 5.4, 6.5, ZC + 8.2));
  const cable = strut(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1), 0.05, dark); cable.visible = false; root.add(cable);
  const clam = new THREE.Group(); clam.visible = false; root.add(clam);
  const jawM = mat(0x5b5f66, { r: 0.5, m: 0.5 });
  const jawA = new THREE.Group(), jawB = new THREE.Group(); clam.add(jawA, jawB);
  jawA.add(bx(2.2, 1.0, 0.14, jawM, 0, 0.5, 0), bx(2.2, 0.14, 0.4, jawM, 0, 0.07, 0.15));
  jawB.add(bx(2.2, 1.0, 0.14, jawM, 0, 0.5, 0), bx(2.2, 0.14, 0.4, jawM, 0, 0.07, -0.15));
  clam.add(bx(1.8, 0.5, 0.6, dark, 0, 1.2, 0));
  const load = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.7), mat(0x7a5a3a, { r: 1 })); load.position.set(0, 0.35, 0); clam.add(load);
  const spoil = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1, 12), mat(0x7a5a3a, { r: 1 })); spoil.geometry.translate(0, 0.5, 0); spoil.position.set(X1 + 2.4, 0, ZC + 4.6); spoil.visible = false; root.add(spoil);
  const dumpT = M.dumpTruck(); dumpT.scale.setScalar(0.7); dumpT.visible = false; root.add(dumpT);

  // ----------------------------------------------------------- usina de lama
  const plant = new THREE.Group(); plant.visible = false; root.add(plant);
  plant.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.2, 14), mat(0xd9d6cd)).translateY(1.6), bx(2.6, 1.3, 1.5, mat(0x3b8fd6), 2.2, 0.65, 0), bx(1.4, 1.0, 1.0, dark, 3.7, 0.5, 0));
  plant.position.set(X1 + 8.8, 0, ZC + 3.4);
  const hoseC = new THREE.CatmullRomCurve3([new THREE.Vector3(X1 + 15.4, 1.1, ZC + 3.4), new THREE.Vector3(X1 + 11, 0.5, ZC + 3.0), new THREE.Vector3(X1 + 5, 0.4, ZC + 2.0), new THREE.Vector3(X1 + 1.1, 0.15, ZC + 0.5)]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseC, 30, 0.1, 8), mat(0x3b8fd6, { r: 0.7 })); hose.visible = false; root.add(hose);
  const hdrops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 5), mat(0x8fb8ac, { r: 0.4 }), 16); hdrops.frustumCulled = false; hdrops.visible = false; root.add(hdrops);

  // ----------------------------------------------------------- gaiola
  const secM = noclip(0x24272b), spacM = noclip(0xd8d4c8);
  const mkCage = (len, n) => {
    const g = new THREE.Group(); g.visible = false; root.add(g);
    const s = new THREE.Group(); s.visible = false; root.add(s);
    for (const dz of [-0.42, 0.42]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, len, 0.04), secM); l.position.set(X1 - 0.03, -len / 2, ZC + dz); s.add(l); }
    const st = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.03, 0.84), secM, n); st.frustumCulled = false; s.add(st);
    const m4 = new THREE.Matrix4(); for (let i = 0; i < n; i++) { m4.makeTranslation(X1 - 0.031, -0.25 - i * 0.5, ZC); st.setMatrixAt(i, m4); }
    for (let i = 0; i < 3; i++) for (const dz of [-0.42, 0.42]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.14), spacM); sp.position.set(X1 - 0.03, -len * (0.2 + 0.3 * i), ZC + dz); s.add(sp); }
    for (const dz of [-0.42, 0.42]) for (const dx of [-1.0, -0.33, 0.33, 1.0]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 5), mat(0x3a3d42, { r: 0.5, m: 0.5 })); b.position.set(X1 + dx, -len / 2, ZC + dz); g.add(b); }
    return { g, s, len };
  };
  const LA = 7.5, LB = 7.0;
  const cgA = mkCage(LA, 15), cgB = mkCage(LB, 14);
  const tieMan = person(0xf2b705, 0xffffff); tieMan.group.visible = false; root.add(tieMan.group);

  // ----------------------------------------------------------- tubos e caminhão de concreto
  const tremM = noclip(0x3a3d42, { r: 0.5, m: 0.5 });
  const HOP = 1.6;
  const trem = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1, 0.24), tremM); trem.geometry.translate(0, 0.5, 0); trem.position.set(X1 - 0.045, 0, ZC); trem.visible = false; root.add(trem);
  const trem2 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 8), mat(0x3a3d42, { r: 0.5, m: 0.5 })); trem2.geometry.translate(0, 0.5, 0); trem2.position.set(X1 + 0.9, 0, ZC); trem2.visible = false; root.add(trem2);
  const funnels = [0, 0.9].map((dx) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 12, 1, true), mat(0xe8742c, { side: THREE.DoubleSide })); f.rotation.x = Math.PI; f.position.set(X1 + dx, HOP + 0.35, ZC); f.visible = false; root.add(f); return f; });
  const truck = M.mixerTruck(); truck.scale.setScalar(0.62); truck.visible = false; root.add(truck);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1), mat(0x9aa0a8, { m: 0.4 })); chute.visible = false; root.add(chute);
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 6, 5), mat(0x8b8880, { r: 1 }), 12); drops.frustumCulled = false; drops.visible = false; root.add(drops);
  const exA = M.excavator(0.5); const excA = new THREE.Group(); exA.group.rotation.y = Math.PI; excA.add(exA.group); excA.position.set(X1 + 4.6, 0, ZC + 4.5); excA.visible = false; root.add(excA);
  const pA = person(0xe8742c), pB = person(0x4a8fd0), pC = person(0xf2b705, 0xffffff), pD = person(0xe8742c); [pA, pB, pC, pD].forEach((p) => root.add(p.group));

  // ----------------------------------------------------------- fase B: demais painéis, viga, escoras
  const U = { value: 0 };
  const wm = depthMat(U);
  const pwalls = [
    strataQuad(X1, PZ - HW, X1 + PX, PZ - HW, -DMAX - 0.3, 0.0), strataQuad(X1, PZ + HW, X1 + PX, PZ + HW, -DMAX - 0.3, 0.0), strataQuad(X1 + PX, PZ - HW, X1 + PX, PZ + HW, -DMAX - 0.3, 0.0),
  ].map((g) => { const m = new THREE.Mesh(g, wm); m.visible = false; m.receiveShadow = true; root.add(m); return m; });
  const floorM = mat(0x86683f, { r: 1, e: 0x1a1308 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(PX, 2 * HW), floorM); floor.rotation.x = -Math.PI / 2; floor.visible = false; floor.receiveShadow = true; root.add(floor);
  const pcM = mat(0x9a968c, { r: 0.95 });
  // painéis: N (já tem o 1), S e L
  const panels = [];
  for (let i = 1; i < 5; i++) panels.push({ x: X1 + 2.8 * i, z: ZC, sx: 2.74, sz: TW });
  for (let i = 0; i < 5; i++) panels.push({ x: X1 + 2.8 * i, z: PZ + HW + TW / 2 - 0.04, sx: 2.74, sz: TW });
  for (let i = 0; i < 5; i++) panels.push({ x: X1 + PX + TW / 2 - 0.04, z: PZ - HW + 1.5 + 3 * i, sx: TW, sz: 2.94 });
  const pg = new THREE.BoxGeometry(1, 1, 1); pg.translate(0, -0.5, 0);
  const pim = new THREE.InstancedMesh(pg, pcM, panels.length); pim.frustumCulled = false; pim.castShadow = true; root.add(pim);
  const pct = vplane(TW - 0.04, capM); pct.position.set(X1 - 0.05, TOPB - DEPTH, PZ + HW + TW / 2 - 0.04); pct.scale.y = 0.001; pct.renderOrder = 4; root.add(pct);
  const beamC = mat(0x9a968c, { r: 0.95 }), beamCapM = noclip(0xc9c5ba, { r: 1, e: 0x25231f });
  const beamBody = (z) => { const g = new THREE.BoxGeometry(PX + 1.4, 0.73, 1.5); g.translate((PX + 1.4) / 2, 0.365, 0); const m = new THREE.Mesh(g, beamC); m.position.set(X1, TOPB, z); m.castShadow = true; m.visible = false; root.add(m); return m; };
  const beams = [beamBody(PZ - HW - TW / 2 + 0.04), beamBody(PZ + HW + TW / 2 - 0.04)];
  const beamE = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.73, 2 * HW + 2.5), beamC); beamE.position.set(X1 + PX + TW / 2 - 0.04, TOPB + 0.365, PZ); beamE.visible = false; root.add(beamE);
  const beamCaps = [-1, 1].map((s) => { const m = vplane(1.5, beamCapM); m.position.set(X1 - 0.012, TOPB, PZ + s * (HW + TW / 2 - 0.04)); m.scale.y = 0.73; m.visible = false; m.renderOrder = 3; root.add(m); return m; });
  const ROWS = [0.5, 4.3, 8.1, 11.9].map((d) => X1 + d);
  const strutG = (len) => { const g = new THREE.BoxGeometry(0.45, 0.45, len); g.translate(0, 0, len / 2); return g; };
  const mkStruts = (y, inset) => ROWS.map((x) => { const len = 2 * (HW - inset); const m = new THREE.Mesh(strutG(len), steelM); m.position.set(x, y, PZ - HW + inset); m.castShadow = true; m.visible = false; root.add(m); return m; });
  const struts1 = mkStruts(SLV[0], 0.2), struts2 = mkStruts(SLV[1], 0.55), struts3 = mkStruts(SLV[2], 0.55);
  const walG = new THREE.BoxGeometry(PX, 0.5, 0.5); walG.translate(PX / 2, 0, 0);
  const mkWal = (y) => [-1, 1].map((s) => { const m = new THREE.Mesh(walG, walM); m.position.set(X1, y, PZ + s * (HW - 0.3)); m.castShadow = true; m.visible = false; root.add(m); return m; });
  const wal2 = mkWal(SLV[1]), wal3 = mkWal(SLV[2]);
  const exc = M.excavator(0.5); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.visible = false; root.add(excW);
  const cr = buildCraneBucket(root, { pit: [X1 + 6.2, PZ], dump: [X1 + 12.5, -16.3] });
  const truckB = M.dumpTruck(0xe8b300); truckB.scale.setScalar(0.9); truckB.rotation.y = Math.PI; truckB.visible = false; root.add(truckB);
  const tfill = baseBox(3.8, 1, 2.4, mat(0x7a5a3a, { r: 1 })); tfill.position.set(2.1, 0.15, 0); tfill.visible = false; truckB.userData.bed.add(tfill);
  const wE = person(0xe8742c), wF = person(0x4a8fd0); [wE, wF].forEach((p) => root.add(p.group));

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(D6_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q0 = new THREE.Quaternion(), vs = new THREE.Vector3(), vp = new THREE.Vector3();
  const DK = (k) => (DEPTH * (k + 1)) / NC;
  const SWZ = 4.6, SWY = 4.0;
  const fmt = (x) => x.toFixed(1).replace('.', ',');
  function clamAt(t) {
    if (t < T.ex0) return null;
    const e = t - T.ex0, k = Math.min(NC - 1, Math.floor(e / CYC)), u = e - k * CYC, dp = k ? DK(k - 1) : 0, dk = DK(k);
    const bottomPrev = -dp, s = CYC / 8.4; const uu = u / s;
    let off = 0, y = SWY, open = 1, ld = 0, depth = dp;
    if (uu < 0.9) { off = 1 - ease(uu / 0.9); y = SWY; }
    else if (uu < 4.2) { y = SWY + (bottomPrev - SWY) * ease((uu - 0.9) / 3.3); }
    else if (uu < 5.2) { y = bottomPrev; open = 1 - ease(uu - 4.2); depth = dp + (dk - dp) * ease(uu - 4.2); ld = 1; }
    else if (uu < 7.4) { y = bottomPrev + (SWY - bottomPrev) * ease((uu - 5.2) / 2.2); open = 0; depth = dk; ld = 1; }
    else { off = ease((uu - 7.4) / 1.0); y = SWY; open = uu > 8.0 ? ease((uu - 8.0) / 0.4) : 0; depth = dk; ld = uu > 8.0 ? 0 : 1; }
    return { off, y, open, ld, depth, k };
  }
  const depthAll = (t) => (t >= T.ex1 ? DEPTH : t < T.ex0 ? 0 : clamAt(t).depth);
  const concLvl = (t) => -DEPTH + (DEPTH - 0.1) * ease(win(t, T.pour0, T.pour1));
  const dAt = (t) => 1.0 * ease(win(t, T.pre0, T.pre1)) + DEP.reduce((s, d, i) => s + d * ease(win(t, WINS[i][0], WINS[i][1])), 0);
  const winIdx = (t) => WINS.findIndex(([a, b]) => t >= a && t < b);
  function info(t) {
    if (t < T.s2) return { step: 0, p: win(t, 0, T.s2), note: t < T.trDig1 ? 'Escavando a vala das muretas' : t < T.form1 ? 'Montando fôrmas e armação das muretas' : t < T.gwPour1 ? 'Concretando as muretas' : 'Escorando as muretas' };
    if (t < T.s3) { const c = clamAt(t), k = c ? c.k + 1 : 1; return { step: 1, p: win(t, T.s2, T.s3), note: !c ? 'Guindaste e usina de lama chegando' : `Mordida ${k} de ${NC} · painel com ${fmt(depthAll(t))} m de ${DEPTH} m` }; }
    if (t < T.s4) return { step: 2, p: win(t, T.s3, T.s4), note: t < T.cA1 ? 'Descendo o 1º trecho da gaiola' : t < T.cB1 ? 'Içando o 2º trecho' : t < T.splice1 ? 'Emendando os trechos' : t < T.low1 ? 'Descendo a gaiola completa' : 'Gaiola suspensa, a 1 m do fundo' };
    if (t < T.s5) return { step: 3, p: win(t, T.s4, T.s5), note: t < T.tr1 ? 'Descendo os tubos de concretagem' : t < T.pour0 ? 'Caminhão betoneira posicionado' : t < T.pour1 ? 'Concreto sobe e desloca a lama' : t < T.pan0 ? 'Retirando os tubos · painel curando' : 'Executando os painéis vizinhos' };
    const wi = winIdx(t), d = dAt(t);
    return { step: 4, p: win(t, T.s5, T.END), note: wi >= 0 ? `Escavando · ${fmt(d)} m de ${fmt(DMAX)} m` : t < T.beam1 ? 'Viga de coroamento' : t < T.st1b ? 'Escoras do 1º nível' : t >= WINS[2][1] ? 'Cava seca abaixo do nível d’água' : t < T.st2b ? 'Escoras do 2º nível' : 'Escoras do 3º nível' };
  }

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;
    sur.update(tAbs);

    // ---- vala, muretas, painel
    const td = GWH * ease(win(t, T.trDig0, T.trDig1)), dd = depthAll(t);
    if (td > 0.02) { terrainHoles[0].set(X1 - TRX, X1 + TRX, ZC - TRZ, ZC + TRZ); section.setBand(0, ZC - TRZ, ZC + TRZ, -td, 0.05); } else { terrainHoles[0].set(0, 0, 0, 0); section.setBand(0, 0, 0, 0, 0); }
    if (dd > 0.02) { section.setBand(1, ZC - TW / 2, ZC + TW / 2, -dd, 0.05); terrainHoles[1].set(X1 - PHL, X1 + PHL, ZC - TW / 2, ZC + TW / 2); } else { section.setBand(1, 0, 0, 0, 0); terrainHoles[1].set(0, 0, 0, 0); }
    tFloor.visible = tWall.visible = td > 0.02 && t < T.gwPour1 + 0.1; tFloor.position.set(X1, -td, ZC); tWall.position.y = -td; tWall.scale.y = Math.max(0.001, td);
    holeWall.visible = dd > 0.02 && t < T.pour1; holeWall.scale.y = Math.max(0.001, dd);
    formsG.visible = t >= T.form0 - 0.2 && t < T.gwPour1 + 3.5;
    const fp = ease(win(t, T.form0, T.form1)); gwForms.forEach((f) => { f.scale.y = Math.max(0.001, fp); });
    const gp = ease(win(t, T.gwPour0, T.gwPour1));
    gws.forEach(({ b, c }) => { b.visible = c.visible = gp > 0.01; b.scale.y = Math.max(0.001, gp); c.scale.y = GWH * Math.max(0.001, gp); });
    struts.forEach((s, i) => { s.visible = t > T.strut0 + i * 0.7 && t < T.s5; });

    // ---- lama
    let sBase = -dd; const sTop = -0.3;
    if (t >= T.pour0) sBase = concLvl(t);
    slurry.visible = dd > 0.3 && sTop > sBase + 0.02; slurry.position.y = sBase; slurry.scale.y = Math.max(0.001, sTop - sBase);

    // ---- escavação do painel
    const cr0 = ease(win(t, T.crIn0, T.crIn1)) * (1 - ease(win(t, T.crOut, T.crOut + 2.5)));
    crane.visible = cr0 > 0.01; crane.scale.setScalar(Math.max(0.001, cr0));
    const eS = clamp01(ease(win(t, T.tIn0, T.tIn1)) * (1 - ease(win(t, T.gwPour0 - 1, T.gwPour0 + 0.5))));
    excA.visible = eS > 0.01; excA.scale.setScalar(Math.max(0.001, eS)); exA.update(t * 1.4);
    const c = clamAt(t);
    clam.visible = !!c && t < T.ex1 + 6; cable.visible = clam.visible;
    if (c) {
      const z = ZC + SWZ * c.off, y = c.y;
      clam.position.set(X1, y, z);
      const sp = 0.05 + 0.5 * c.open; jawA.position.z = -sp * 0.75; jawB.position.z = sp * 0.75; jawA.rotation.x = -0.18 * c.open; jawB.rotation.x = 0.18 * c.open;
      load.visible = c.ld > 0.5;
      setStrut(cable, CT, new THREE.Vector3(X1, y + 1.5, z));
    } else if (t >= T.ex1) { clam.visible = false; cable.visible = false; }
    const dug = clamp01(dd / DEPTH);
    spoil.visible = dug > 0.02 && t < T.s3 + 20; spoil.scale.set(0.5 + 1.0 * dug, 0.15 + 1.5 * dug * (1 - ease(win(t, T.s3 + 4, T.s3 + 16))), 0.5 + 1.0 * dug);
    dumpT.visible = t > T.s3 + 1.8 && t < T.s3 + 18.2;
    dumpT.position.set(X1 + 4.4 + 9 * (1 - ease(win(t, T.s3 + 2, T.s3 + 5))) + 9 * ease(win(t, T.s3 + 14, T.s3 + 18)), 0, ZC + 9.2); dumpT.rotation.y = Math.PI;
    plant.visible = t >= T.crIn0 - 1 && t < T.s5; hose.visible = plant.visible && t > T.crIn1;
    const circ = hose.visible && (t < T.s3 || (t >= T.pour0 && t < T.pour1 + 3));
    hdrops.visible = circ;
    if (circ) { const rev = t >= T.pour0; for (let i = 0; i < 16; i++) { let u = (tAbs * 0.4 + i / 16) % 1; if (!rev) u = 1 - u; hoseC.getPoint(u, v); m4.makeTranslation(v.x, v.y + 0.12, v.z); hdrops.setMatrixAt(i, m4); } hdrops.instanceMatrix.needsUpdate = true; }

    // ---- gaiola
    const aTopY = t < T.cA1 ? 12 - (12 - 8.0 + 7.1) * ease(win(t, T.cA0, T.cA1)) : 0.4;
    const lowK = ease(win(t, T.low0, T.low1));
    const aTop = t < T.low0 ? aTopY : 0.4 - LB * lowK;
    const bTop = t < T.cB0 ? 15 : t < T.cB1 ? 15 - (15 - (0.4 + LB)) * ease(win(t, T.cB0, T.cB1)) : t < T.low0 ? 0.4 + LB : 0.4 + LB - LB * lowK;
    cgA.g.visible = t >= T.cA0 - 0.2; cgA.g.position.set(0, aTop, 0); cgA.s.visible = cgA.g.visible && t > T.cA0 + 0.5; cgA.s.position.y = aTop;
    cgB.g.visible = t >= T.cB0 - 0.2; cgB.g.position.set(0, bTop, 0); cgB.s.visible = cgB.g.visible; cgB.s.position.y = bTop;
    tieMan.group.visible = t > T.cB1 - 0.5 && t < T.splice1 + 0.5; tieMan.group.position.set(X1 + 1.8, 0, ZC + 1.6); tieMan.group.rotation.y = -Math.PI / 2 - 0.5; tieMan.upper.rotation.x = 0.5 + 0.15 * Math.sin(tAbs * 4);
    // a gaiola some quando o painel já está concretado (fica embutida): esconder só os 3D de cima após o pour
    // ---- tubos
    const trLow = ease(win(t, T.tr0, T.tr1)), lvl = concLvl(t);
    const botT = t < T.pour0 ? 8 + (-DEPTH + 0.5 - 8) * trLow : Math.min(HOP, Math.max(-DEPTH + 0.5, lvl - 1.2)) + 14 * ease(win(t, T.trOut0, T.trOut1));
    const topT = t < T.pour0 ? Math.min(botT + 15, 14 - (14 - HOP) * trLow) : HOP;
    const tOn = t >= T.tr0 - 0.3 && t < T.trOut1 + 0.1;
    [trem, trem2].forEach((m) => { m.visible = tOn; m.position.y = botT; m.scale.y = Math.max(0.01, (t < T.pour0 ? topT : HOP) - botT); });
    funnels.forEach((f) => { f.visible = t >= T.tr1 - 0.3 && t < T.trOut0 + 0.5; });
    const tkIn = ease(win(t, T.tkIn0, T.tkIn1)), tkOut = ease(win(t, T.tkOut0, T.tkOut1)), tkVis = t >= T.tkIn0 && t < T.tkOut1 + 0.2;
    truck.visible = tkVis; truck.position.set(X1 + 9.5 + 9 * (1 - tkIn) + 9 * tkOut, 0, ZC + 6.2); truck.userData.spin.rotation.x = tAbs * 2.5;
    chute.visible = tkVis && t > T.tkIn1 - 0.3 && t < T.pour1 + 0.6;
    { const c0 = new THREE.Vector3(truck.position.x - 3.0, 1.55, ZC + 6.2), c1 = new THREE.Vector3(X1 + 0.5, HOP + 0.8, ZC + 0.2); chute.position.copy(c0).add(c1).multiplyScalar(0.5); chute.scale.z = Math.max(0.01, c0.distanceTo(c1)); chute.lookAt(c1); }
    const pouring = t > T.pour0 && t < T.pour1 + 0.3; drops.visible = pouring;
    if (pouring) { for (let i = 0; i < 12; i++) { const f = (tAbs * 1.5 + i / 12) % 1; v.set(X1 + (i % 2) * 0.9 + Math.sin(i * 3.1) * 0.1, HOP + 0.4 + (-1 - HOP) * f, ZC + Math.cos(i * 2.3) * 0.1); m4.makeTranslation(v.x, v.y, v.z); drops.setMatrixAt(i, m4); } drops.instanceMatrix.needsUpdate = true; }
    conc.visible = concCap.visible = t >= T.pour0 && lvl > -DEPTH + 0.02; conc.scale.y = concCap.scale.y = Math.max(0.001, lvl + DEPTH);
    concM.color.copy(WET).lerp(CURED, clamp01((t - T.pour1) / 8)); capM.color.copy(concM.color);
    const ph = t >= T.s5 ? 0 : 1;
    pA.group.visible = pB.group.visible = ph === 1;
    const pw = (p, x0, x1, z, sp_, bend, ph_) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp_ + ph_); p.group.position.set(x0 + (x1 - x0) * u, 0, z); p.group.rotation.y = Math.cos(tAbs * sp_ + ph_) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = bend; };
    pw(pA, X1 + 6, X1 + 12, ZC + 3.4, 0.5, 0.12, 0); pw(pB, X1 + 9, X1 + 14, ZC + 11.2, 0.45, 0.12, 1.7);
    pC.group.visible = pD.group.visible = false;

    // ---- fase B
    const d = dAt(t), on = d > 0.02; U.value = d;
    if (on) { terrainHoles[2].set(X1 - 1, X1 + PX, PZ - HW, PZ + HW); section.setBand(2, PZ - HW, PZ + HW, -d, 0.05); } else { terrainHoles[2].set(0, 0, 0, 0); section.setBand(2, 0, 0, 0, 0); }
    pwalls.forEach((w) => { w.visible = on; });
    floor.visible = on; floor.position.set(X1 + PX / 2, -d - 0.01, PZ); soilColorAt(-d - 0.3, floorM.color); floorM.emissive.copy(floorM.color).multiplyScalar(0.25);
    for (let i = 0; i < panels.length; i++) {
      const p = panels[i], idx = i, u = ease(win(t, T.pan0 + (idx * (T.pan1 - T.pan0 - 1.2)) / panels.length, T.pan0 + 1.2 + (idx * (T.pan1 - T.pan0 - 1.2)) / panels.length));
      vs.set(p.sx, Math.max(0.0001, DEPTH * u), p.sz); vp.set(p.x, TOPB, p.z); m4.compose(vp, q0, vs); pim.setMatrixAt(i, m4);
    }
    pim.instanceMatrix.needsUpdate = true;
    { const u = ease(win(t, T.pan0 + (4 * (T.pan1 - T.pan0 - 1.2)) / panels.length, T.pan0 + 1.2 + (4 * (T.pan1 - T.pan0 - 1.2)) / panels.length)); pct.visible = u > 0.01; pct.scale.y = Math.max(0.001, DEPTH * u); pct.position.y = TOPB - DEPTH * u; }
    const bm = ease(win(t, T.beam0, T.beam1));
    beams.forEach((m) => { m.visible = bm > 0.01; m.scale.x = Math.max(0.001, bm); });
    beamE.visible = bm > 0.5; beamE.scale.y = Math.max(0.001, ease((bm - 0.5) * 2)); beamCaps.forEach((cc) => { cc.visible = bm > 0.3; });
    const n1 = ROWS.length;
    const sg = (arr, a0, b0) => arr.forEach((m, i) => { const u = ease(win(t, a0 + (i * (b0 - a0 - 2)) / n1, a0 + 2 + (i * (b0 - a0 - 2)) / n1)); m.visible = u > 0.01; m.scale.z = Math.max(0.001, u); });
    sg(struts1, T.st1a, T.st1b); sg(struts2, T.st2a, T.st2b); sg(struts3, T.st3a, T.st3b);
    wal2.forEach((m) => { const u = ease(win(t, T.wal2, T.wal2e)); m.visible = u > 0.01; m.scale.x = Math.max(0.001, u); });
    wal3.forEach((m) => { const u = ease(win(t, T.wal3, T.wal3e)); m.visible = u > 0.01; m.scale.x = Math.max(0.001, u); });
    const eB = ease(win(t, T.exIn, T.exInE));
    excW.visible = eB > 0.01 && on; excW.scale.setScalar(Math.max(0.001, eB)); excW.position.set(X1 + 10.2, -d, PZ + 1.5); exc.update(tAbs * 1.3);
    const cB = ease(win(t, T.crIn, T.crInE));
    cr.group.visible = cB > 0.01; cr.group.scale.setScalar(Math.max(0.001, cB));
    const wi = winIdx(t), act = wi >= 0, e = act ? (t - WINS[wi][0]) / TC : 0;
    const cyc = cr.cycle(act ? e - Math.floor(e) : 0.14, -d);
    cr.setHook(cyc.x, cyc.y, cyc.z, cyc.fl, cyc.tl);
    {
      let tx = null, fillT = 0;
      WINS.forEach(([a, b]) => {
        if (t >= a - 5 && t < b + 5) {
          tx = t < a ? X1 + 36 + (X1 + 11.8 - (X1 + 36)) * ease(win(t, a - 5, a)) : t < b ? X1 + 11.8 : X1 + 11.8 + (X1 + 3.2 - (X1 + 11.8)) * ease(win(t, b, b + 5));
          const nc = (b - a) / TC, ee = (t - a) / TC;
          fillT = t < a ? 0 : t < b ? clamp01((Math.floor(ee) + clamp01(((ee - Math.floor(ee)) - 0.88) / 0.05)) / nc) : 1;
        }
      });
      truckB.visible = tx !== null && tx > X1 + 3.25; if (truckB.visible) truckB.position.set(tx, 0.05, -16.3);
      tfill.visible = fillT > 0.02; tfill.scale.y = Math.max(0.01, 1.1 * fillT);
    }
    const pwB = (p, xa, xb, z, sp, ph_) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp + ph_); p.group.position.set(xa + (xb - xa) * u, 0.07, z); p.group.rotation.y = Math.cos(tAbs * sp + ph_) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = 0.1; p.group.visible = t >= T.s5 - 3; };
    pwB(wE, X1 + 2, X1 + 8, -17.4, 0.4, 0); pwB(wF, X1 + 15, X1 + 20, -15.2, 0.35, 2);

    // ---- âncoras
    const a = anchors, pf = X1 - 0.06;
    a.mureta.set(X1 - 0.06, -0.6, ZC + GZ);
    a.clam.set(X1 - 0.03, c ? c.y + 1.4 : 2, ZC + (c ? SWZ * c.off : 0) + 0.9);
    a.lama.set(X1 - 0.06, -5.5, ZC - 0.1);
    a.solo_t.set(X1 + 2.4, 1.4, ZC + 4.6);
    a.usina.set(X1 + 8.8, 3.4, ZC + 3.4);
    a.arm.set(X1 - 0.06, aTop - 4, ZC + 0.42);
    a.trem.set(X1 - 0.06, Math.max(-9, Math.min(-2, botT + 6)), ZC);
    a.conc.set(X1 - 0.06, Math.min(-3, Math.max(-DEPTH + 2, lvl - 2)), ZC + TW / 2 - 0.1);
    a.parede.set(pf, -11, PZ + HW + TW / 2 - 0.04);
    a.escora.set(ROWS[1], SLV[1], PZ + 2);
    a.cacamba.set(cyc.x, cyc.y - 0.6, cyc.z);
    a.predio.set(pf, 9.5, -46);
    a.na.set(pf, -9.55, PZ + HW + 4);
    a.solo.set(X1, -21, PZ);
  }
  function labelVis(kx, t = st.tc) {
    switch (kx) {
      case 'mureta': return t > T.gwPour1 - 1 && t < T.ex0 + 8;
      case 'clam': return t > T.ex0 + 1 && t < T.ex1;
      case 'lama': return (t > T.ex0 + 12 && t < T.s3 + 3) || (t > T.pour0 && t < T.pour1);
      case 'solo_t': return t > T.ex0 + 10 && t < T.s3 + 16;
      case 'usina': return t > T.crIn1 && t < T.ex0 + 8;
      case 'arm': return t > T.cA1 - 3 && t < T.s4 + 6;
      case 'trem': return t > T.tr1 && t < T.trOut0;
      case 'conc': return t > T.pour0 + 6 && t < T.pan1 + 4;
      case 'parede': return t > T.pan1;
      case 'escora': return t > T.st2b;
      case 'cacamba': return winIdx(t) >= 0 && t > T.crInE;
      case 'predio': return t > 2;
      case 'na': return t > T.ex0 + 10;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hideDPit(engine); },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); showDPit(engine); },
  };
}
