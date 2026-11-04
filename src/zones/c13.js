import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person, WET, CURED } from './fund.js';

// ---------------------------------------------------------------------------
// C13 — Estacão / barrete (painel escavado com clamshell sob lama bentonítica).
// Seção em x = X1 ao longo do comprimento do painel (z). Escala exagerada: painel de 3,0 x 1,2 m.
// ---------------------------------------------------------------------------
const X1 = -40, PZ = 20, PL = 1.5, PW = 0.6, DEPTH = 17, NC = 5, CYC = 8.4, CLN = 16;
const GWX = 0.6, GWT = 0.35, GWH = 1.2, TRZ = 3.4, TRX = 1.0;
const T = {
  tIn0: 0.4, tIn1: 2.4, trDig0: 2.4, trDig1: 9, form0: 9.5, form1: 14, gwPour0: 14, gwPour1: 18, strut0: 18.2, s2: 21,
  crIn0: 21, crIn1: 23.5, ex0: 23.5, ex1: 23.5 + CYC * NC, s3: 66,
  cA0: 66, cA1: 74.5, cB0: 77, cB1: 80.5, splice1: 85, low0: 85.5, low1: 93, crOut: 94, s4: 96,
  tr0: 96, tr1: 101.5, tkIn0: 99, tkIn1: 102, pour0: 103, pour1: 127, tkOut0: 127.5, tkOut1: 130, trOut0: 127, trOut1: 130.5, END: 140,
};
export const C13 = { box: { x0: -125, x1: X1, z0: 8, z1: 32 } };
export const C13_STEP_STARTS = [0, T.s2, T.s3, T.s4];
export const C13_STEPS = [
  { t: 'Muretas-guia', d: 'Antes do painel, abre-se uma vala rasa e concretam-se duas muretas paralelas, no alinhamento do painel. Elas guiam a caçamba, mantêm o painel no prumo e seguram o solo do topo, a parte mais frágil. Escoras de madeira entre as muretas as mantêm no lugar até o concreto das duas ser coberto.' },
  { t: 'Escavar com clamshell e lama bentonítica', d: 'O clamshell (caçamba articulada) desce aberto, fecha mordendo o solo, sobe cheio e descarrega ao lado. O furo é mantido sempre cheio de lama bentonítica, mais densa que a água: ela empurra as paredes e forma uma crosta fina nelas (a torta de lama), e assim o painel não desmorona, nem abaixo do nível d’água. A lama circula por uma usina que recupera a que está limpa.' },
  { t: 'Descer a armadura', d: 'A gaiola é longa demais para descer inteira: o primeiro trecho desce e fica pendurado nas muretas, o segundo é içado e emendado, e então os dois descem juntos até 1 m do fundo. Espaçadores nas laterais mantêm o cobrimento mesmo dentro da lama.' },
  { t: 'Concretar com tremonha, deslocando a lama', d: 'Dois tubos de concretagem descem até o fundo. O concreto, mais pesado que a lama, entra pelo funil e sobe de baixo para cima, empurrando a lama para o alto, de onde ela é bombeada de volta para a usina. A ponta dos tubos fica sempre mergulhada no concreto, para a lama não se misturar com ele. Os tubos são retirados aos poucos.' },
];
export const C13_LABELS = [
  { k: 'mureta', t: 'Mureta-guia' },
  { k: 'clam', t: 'Clamshell' },
  { k: 'lama', t: 'Lama bentonítica' },
  { k: 'solo_t', t: 'Solo escavado' },
  { k: 'usina', t: 'Usina de lama' },
  { k: 'arm', t: 'Gaiola de armação' },
  { k: 'trem', t: 'Tubos de concretagem' },
  { k: 'conc', t: 'Concreto' },
  { k: 'na', t: 'Nível d’água', fixed: [0, 0] },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const C13_CAM = { tx: -39, ty: -4.6, tz: PZ, yaw: -1.3, pitch: 0.14, dist: 47 };
export const C13_MCAM = { tx: -39, ty: -4.5, tz: PZ, yaw: -1.3, pitch: 0.12, dist: 86 };

export function createC13(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const dark = mat(0x2f3237, { r: 0.6, m: 0.3 }), yel = mat(0xf2b705, { r: 0.7 }), wood = mat(0xb08a55, { r: 0.9 });
  const soilW = mat(0x6b4f33, { r: 1, e: 0x1c130b });
  const bx = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; return o; };
  const vplane = (w, m) => { const g = new THREE.PlaneGeometry(w, 1); g.rotateY(-Math.PI / 2); g.translate(0, 0.5, 0); return new THREE.Mesh(g, m); };
  const strut = (a, b, th, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(th, th, a.distanceTo(b)), m); o.position.copy(a).add(b).multiplyScalar(0.5); o.lookAt(b); return o; };
  const setStrut = (o, a, b) => { o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.z = Math.max(0.01, a.distanceTo(b)); o.lookAt(b); };

  // ----------------------------------------------------------- vala, muretas e painel
  const tFloor = new THREE.Mesh(new THREE.PlaneGeometry(2 * TRX, 2 * TRZ), soilW); tFloor.rotation.x = -Math.PI / 2; tFloor.visible = false; root.add(tFloor);
  const tWall = vplane(2 * TRZ, soilW); tWall.position.set(X1 + TRX, -GWH, PZ); tWall.visible = false; root.add(tWall);
  const holeWall = new THREE.Mesh(new THREE.BoxGeometry(2 * PW, 1, 2 * PL), mat(0x4a3827, { r: 1, side: THREE.BackSide, e: 0x2c1f12 })); holeWall.geometry.translate(0, -0.5, 0); holeWall.position.set(X1, 0, PZ); holeWall.visible = false; root.add(holeWall);
  const gwM = mat(0xb9b5aa, { r: 0.95 });
  const gw = new THREE.Mesh(new THREE.BoxGeometry(GWT, GWH + 0.15, 2 * TRZ - 0.2), gwM); gw.geometry.translate(0, (GWH + 0.15) / 2, 0); gw.position.set(X1 + GWX + GWT / 2, -GWH, PZ); gw.visible = false; root.add(gw);
  const formsG = new THREE.Group(); formsG.visible = false; root.add(formsG);
  const gwForm = new THREE.Mesh(new THREE.BoxGeometry(0.04, GWH + 0.15, 2 * TRZ - 0.2), wood); gwForm.geometry.translate(0, (GWH + 0.15) / 2, 0); gwForm.position.set(X1 + GWX + GWT + 0.03, -GWH, PZ); formsG.add(gwForm);
  const struts = [-2.2, 0, 2.2].map((z) => { const s = bx(2 * GWX, 0.12, 0.12, wood, X1 + 0.3, -0.35, PZ + z); s.visible = false; root.add(s); return s; });
  const gwTopCap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 2 * TRZ - 0.2), mat(0xc9c5ba)); gwTopCap.visible = false;

  // ----------------------------------------------------------- lama bentonítica (seção translúcida)
  const slurryM = noclip(0xb4dccf, { op: 0.42, dw: false, r: 0.3, e: 0x3a6a5e });
  const slurry = vplane(2 * PL, slurryM); slurry.position.set(X1 - 0.02, -1, PZ); slurry.visible = false; slurry.renderOrder = 6; root.add(slurry);

  // ----------------------------------------------------------- concreto
  const concM = mat(0x85827a, { r: 0.95 }), capM = noclip(0x85827a, { e: 0x57554f });
  const conc = new THREE.Mesh(new THREE.BoxGeometry(2 * PW - 0.04, 1, 2 * PL - 0.04), concM); conc.geometry.translate(0, 0.5, 0); conc.position.set(X1, -DEPTH, PZ); conc.visible = false; root.add(conc);
  const concCap = vplane(2 * PL - 0.04, capM); concCap.position.set(X1 - 0.012, -DEPTH, PZ); concCap.visible = false; concCap.renderOrder = 5; root.add(concCap);

  // ----------------------------------------------------------- guindaste e clamshell
  const crane = new THREE.Group(); crane.visible = false; root.add(crane);
  const CB = new THREE.Vector3(-33.5, 2.2, 11.5), CT = new THREE.Vector3(X1, 20, PZ - 0.6);
  crane.add(bx(4.6, 1.1, 2.8, dark, -33.0, 0.65, 11.0), bx(2.4, 1.8, 2.6, yel, -32.0, 2.0, 11.0), bx(1.4, 1.2, 1.4, mat(0x9fc4d8, { r: 0.3 }), -34.0, 2.7, 10.4));
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, CB.distanceTo(CT)), yel); boom.position.copy(CB).add(CT).multiplyScalar(0.5); boom.lookAt(CT); crane.add(boom);
  crane.add(bx(0.3, 8, 0.3, yel, -34.6, 6, 11.0));
  const cable = strut(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1), 0.05, dark); cable.visible = false; root.add(cable);
  const clam = new THREE.Group(); clam.visible = false; root.add(clam);
  const jawM = mat(0x5b5f66, { r: 0.5, m: 0.5 });
  const jawA = new THREE.Group(), jawB = new THREE.Group(); clam.add(jawA, jawB);
  jawA.add(bx(0.8, 1.0, 0.18, jawM, 0, 0.5, 0), bx(0.8, 0.14, 0.5, jawM, 0, 0.07, 0.2));
  jawB.add(bx(0.8, 1.0, 0.18, jawM, 0, 0.5, 0), bx(0.8, 0.14, 0.5, jawM, 0, 0.07, -0.2));
  clam.add(bx(0.7, 0.5, 0.6, dark, 0, 1.2, 0));
  const load = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.9), mat(0x7a5a3a, { r: 1 })); load.position.set(0, 0.35, 0); clam.add(load);
  const spoil = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1, 12), mat(0x7a5a3a, { r: 1 })); spoil.geometry.translate(0, 0.5, 0); spoil.position.set(X1 + 1.6, 0, PZ + 5.0); spoil.visible = false; root.add(spoil);
  const dumpT = M.dumpTruck(); dumpT.scale.setScalar(0.7); dumpT.visible = false; root.add(dumpT);

  // ----------------------------------------------------------- usina de lama
  const plant = new THREE.Group(); plant.visible = false; root.add(plant);
  plant.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.2, 14), mat(0xd9d6cd)).translateY(1.6), bx(2.6, 1.3, 1.5, mat(0x3b8fd6), 2.2, 0.65, 0), bx(1.4, 1.0, 1.0, dark, 3.7, 0.5, 0));
  plant.position.set(X1 + 5.4, 0, PZ - 4.8);
  const hoseC = new THREE.CatmullRomCurve3([new THREE.Vector3(X1 + 6.6, 1.1, PZ - 4.8), new THREE.Vector3(X1 + 4, 0.5, PZ - 3.6), new THREE.Vector3(X1 + 1.2, 0.5, PZ - 2.0), new THREE.Vector3(X1 + 0.25, 0.1, PZ - 1.25)]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseC, 30, 0.1, 8), mat(0x3b8fd6, { r: 0.7 })); hose.visible = false; root.add(hose);
  const hdrops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 5), mat(0x8fb8ac, { r: 0.4 }), 16); hdrops.frustumCulled = false; hdrops.visible = false; root.add(hdrops);

  // ----------------------------------------------------------- gaiola (seção + 3D) em dois trechos
  const secM = noclip(0x24272b), spacM = noclip(0xd8d4c8);
  const mkCage = (len, n) => {
    const g = new THREE.Group(); g.visible = false; root.add(g);
    const s = new THREE.Group(); s.visible = false; root.add(s);
    for (const dz of [-1.2, 1.2]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, len, 0.04), secM); l.position.set(X1 - 0.03, -len / 2, PZ + dz); s.add(l); }
    const st = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.03, 2.4), secM, n); st.frustumCulled = false; s.add(st);
    const m4 = new THREE.Matrix4(); for (let i = 0; i < n; i++) { m4.makeTranslation(X1 - 0.031, -0.25 - i * 0.5, PZ); st.setMatrixAt(i, m4); }
    for (let i = 0; i < 3; i++) for (const dz of [-1.2, 1.2]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.14), spacM); sp.position.set(X1 - 0.03, -len * (0.2 + 0.3 * i), PZ + dz); s.add(sp); }
    for (const dz of [-1.2, 0, 1.2]) for (const dx of [0.3]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 5), mat(0x3a3d42, { r: 0.5, m: 0.5 })); b.position.set(X1 + dx, -len / 2, PZ + dz); g.add(b); }
    return { g, s, len };
  };
  const cgA = mkCage(8.5, 17), cgB = mkCage(8.0, 16);
  const tieMan = person(0xf2b705, 0xffffff); tieMan.group.visible = false; root.add(tieMan.group);

  // ----------------------------------------------------------- tubos de concretagem, caminhão
  const tremM = noclip(0x3a3d42, { r: 0.5, m: 0.5 });
  const HOP = 1.6;
  const trems = [-0.8, 0.8].map((dz) => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1, 0.22), tremM); t.geometry.translate(0, 0.5, 0); t.position.set(X1 - 0.045, 0, PZ + dz); t.visible = false; root.add(t); return t; });
  const funnels = [-0.8, 0.8].map((dz) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 12, 1, true), mat(0xe8742c, { side: THREE.DoubleSide })); f.rotation.x = Math.PI; f.position.set(X1, HOP + 0.35, PZ + dz); f.visible = false; root.add(f); return f; });
  const truck = M.mixerTruck(); truck.scale.setScalar(0.62); truck.visible = false; root.add(truck);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1), mat(0x9aa0a8, { m: 0.4 })); chute.visible = false; root.add(chute);
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 6, 5), mat(0x8b8880, { r: 1 }), 12); drops.frustumCulled = false; drops.visible = false; root.add(drops);
  const exc = M.excavator(0.55); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.position.set(X1 + 4.6, 0, PZ + 0.5); excW.visible = false; root.add(excW);
  const pA = person(0xe8742c), pB = person(0x4a8fd0); [pA, pB].forEach((p) => root.add(p.group));

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(C13_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
  const DK = (k) => (DEPTH * (k + 1)) / NC;
  const SWZ = 4.4, SWY = 4.0;
  const A0 = 8.0; // topo da gaiola A em repouso nas muretas (y)

  // estado do clamshell
  function clamAt(t) {
    if (t < T.ex0) return null;
    const e = t - T.ex0, k = Math.min(NC - 1, Math.floor(e / CYC)), u = e - k * CYC, dp = k ? DK(k - 1) : 0, dk = DK(k);
    const bottomPrev = -dp;
    let off = 0, y = SWY, open = 1, ld = 0, depth = dp, dump = 0;
    if (u < 0.9) { off = 1 - ease(u / 0.9); y = SWY; open = 1; }
    else if (u < 4.2) { off = 0; y = SWY + (bottomPrev - SWY) * ease((u - 0.9) / 3.3); open = 1; }
    else if (u < 5.2) { off = 0; y = bottomPrev; open = 1 - ease(u - 4.2); depth = dp + (dk - dp) * ease(u - 4.2); ld = 1; }
    else if (u < 7.4) { off = 0; y = bottomPrev + (SWY - bottomPrev) * ease((u - 5.2) / 2.2); open = 0; depth = dk; ld = 1; }
    else if (u < 8.4) { off = ease((u - 7.4) / 1.0); y = SWY; open = u > 8.0 ? ease((u - 8.0) / 0.4) : 0; depth = dk; ld = u > 8.0 ? 0 : 1; dump = u > 8.0 ? 1 : 0; }
    return { off, y, open, ld, depth, k, dump };
  }
  const exDepth = (t) => { const c = clamAt(t); if (!c) return t >= T.ex1 ? DEPTH : 0; return c.depth; };
  const depthAll = (t) => (t >= T.ex1 ? DEPTH : t < T.ex0 ? 0 : exDepth(t));
  const concLvl = (t) => -DEPTH + (DEPTH + 0.3) * ease(win(t, T.pour0, T.pour1));
  function info(t) {
    if (t < T.s2) return { step: 0, p: win(t, 0, T.s2), note: t < T.trDig1 ? 'Escavando a vala das muretas' : t < T.form1 ? 'Montando fôrmas e armação das muretas' : t < T.gwPour1 ? 'Concretando as muretas' : 'Escorando as muretas' };
    if (t < T.s3) { const c = clamAt(t), k = c ? c.k + 1 : 1, d = depthAll(t); return { step: 1, p: win(t, T.s2, T.s3), note: !c ? 'Guindaste e usina de lama chegando' : `Mordida ${k} de ${NC} · painel com ${d.toFixed(1).replace('.', ',')} m de ${DEPTH} m` }; }
    if (t < T.s4) return { step: 2, p: win(t, T.s3, T.s4), note: t < T.cA1 ? 'Descendo o 1º trecho da gaiola' : t < T.cB1 ? 'Içando o 2º trecho' : t < T.splice1 ? 'Emendando os trechos' : t < T.low1 ? 'Descendo a gaiola completa' : 'Gaiola suspensa, a 1 m do fundo' };
    return { step: 3, p: win(t, T.s4, T.END), note: t < T.tr1 ? 'Descendo os tubos de concretagem' : t < T.pour0 ? 'Caminhão betoneira posicionado' : t < T.pour1 ? 'Concreto sobe e desloca a lama' : t < T.trOut1 ? 'Retirando os tubos' : 'Painel curando' };
  }

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    // ---- vala e muretas
    const td = GWH * ease(win(t, T.trDig0, T.trDig1)), dd = depthAll(t);
    if (td > 0.02) terrainHoles[0].set(X1 - TRX, X1 + TRX, PZ - TRZ, PZ + TRZ); else terrainHoles[0].set(0, 0, 0, 0);
    if (td > 0.02) section.setBand(0, PZ - TRZ, PZ + TRZ, -td, 0.05); else section.setBand(0, 0, 0, 0, 0);
    if (dd > 0.02) { section.setBand(1, PZ - PL, PZ + PL, -dd, 0.05); terrainHoles[1].set(X1 - PW, X1 + PW, PZ - PL, PZ + PL); } else { section.setBand(1, 0, 0, 0, 0); terrainHoles[1].set(0, 0, 0, 0); }
    tFloor.visible = tWall.visible = td > 0.02; tFloor.position.set(X1, -td, PZ); tWall.position.y = -td; tWall.scale.y = Math.max(0.001, td);
    holeWall.visible = dd > 0.02; holeWall.scale.y = Math.max(0.001, dd);
    formsG.visible = t >= T.form0 - 0.2 && t < T.gwPour1 + 3.5;
    const fp = ease(win(t, T.form0, T.form1)); gwForm.scale.y = Math.max(0.001, fp);
    const gp = ease(win(t, T.gwPour0, T.gwPour1));
    gw.visible = gp > 0.01 || t > T.gwPour1; gw.scale.y = Math.max(0.001, gp);
    struts.forEach((s, i) => { s.visible = t > T.strut0 + i * 0.7; });

    // ---- lama
    const sl = dd > 0.3 ? dd : 0;
    let sBase = -dd, sTop = -0.3;
    if (t >= T.pour0) { sBase = concLvl(t); }
    slurry.visible = sl > 0 && sTop > sBase + 0.02; slurry.position.y = sBase; slurry.scale.y = Math.max(0.001, sTop - sBase);

    // ---- máquinas de escavação
    const cr = ease(win(t, T.crIn0, T.crIn1)) * (1 - ease(win(t, T.crOut, T.crOut + 2.5)));
    crane.visible = cr > 0.01; crane.scale.setScalar(Math.max(0.001, cr));
    const exE = t > T.tIn0 && t < T.s2 - 1;
    const eS = clamp01(ease(win(t, T.tIn0, T.tIn1)) * (1 - ease(win(t, T.gwPour0 - 1, T.gwPour0 + 0.5))));
    excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); exc.update(t * 1.4); void exE;
    const c = clamAt(t);
    clam.visible = !!c && t < T.ex1 + 6; cable.visible = clam.visible;
    if (c) {
      const z = PZ + SWZ * c.off, y = c.y;
      clam.position.set(X1, y, z);
      const sp = 0.1 + 0.95 * c.open; jawA.position.z = -sp * 0.75; jawB.position.z = sp * 0.75;
      jawA.rotation.x = -0.18 * c.open; jawB.rotation.x = 0.18 * c.open;
      load.visible = c.ld > 0.5;
      setStrut(cable, new THREE.Vector3(CT.x, CT.y, CT.z), new THREE.Vector3(X1, y + 1.5, z));
    } else if (t >= T.ex1) { clam.visible = false; cable.visible = false; }
    // pilha de solo e caminhão
    const dug = clamp01(dd / DEPTH);
    spoil.visible = dug > 0.02 && t < T.s3 + 20; spoil.scale.set(0.5 + 1.0 * dug, 0.15 + 1.5 * dug * (1 - ease(win(t, T.s3 + 4, T.s3 + 16))), 0.5 + 1.0 * dug);
    const dtv = ease(win(t, T.s3 + 2, T.s3 + 5)) * (1 - ease(win(t, T.s3 + 14, T.s3 + 18)));
    dumpT.visible = t > T.s3 + 1.8 && t < T.s3 + 18.2; void dtv;
    dumpT.position.set(X1 + 3.4 + 9 * (1 - ease(win(t, T.s3 + 2, T.s3 + 5))) + 9 * ease(win(t, T.s3 + 14, T.s3 + 18)), 0, PZ + 7.6);
    dumpT.rotation.y = Math.PI;
    // usina
    plant.visible = t >= T.crIn0 - 1; hose.visible = plant.visible && t > T.crIn1;
    const circ = hose.visible && (t < T.s3 || (t >= T.pour0 && t < T.pour1 + 3));
    hdrops.visible = circ;
    if (circ) { const rev = t >= T.pour0; for (let i = 0; i < 16; i++) { let u = (tAbs * 0.4 + i / 16) % 1; if (!rev) u = 1 - u; hoseC.getPoint(u, v); m4.makeTranslation(v.x, v.y + 0.12, v.z); hdrops.setMatrixAt(i, m4); } hdrops.instanceMatrix.needsUpdate = true; }

    // ---- gaiola
    const aTopY = t < T.cA1 ? 12 - (12 - A0 + 7.6) * ease(win(t, T.cA0, T.cA1)) : A0 - 7.6;   // A para em A0-7.6 = 0.4
    const lowK = ease(win(t, T.low0, T.low1));
    const aTop = t < T.low0 ? aTopY : 0.4 + (-7.5 - 0.4) * lowK;
    const bTop = t < T.cB0 ? 16 : t < T.cB1 ? 16 - (16 - 8.4) * ease(win(t, T.cB0, T.cB1)) : t < T.low0 ? 8.4 : 8.4 + (0.5 - 8.4) * lowK;
    cgA.g.visible = t >= T.cA0 - 0.2; cgA.g.position.set(0, aTop, 0); cgA.s.visible = cgA.g.visible && t > T.cA0 + 0.5; cgA.s.position.y = aTop;
    cgB.g.visible = t >= T.cB0 - 0.2; cgB.g.position.set(0, bTop, 0); cgB.s.visible = cgB.g.visible; cgB.s.position.y = bTop;
    // posicionamento 3D: grupos 3D usam X1/PZ já nas posições internas dos filhos
    tieMan.group.visible = t > T.cB1 - 0.5 && t < T.splice1 + 0.5; tieMan.group.position.set(X1 + 1.3, 0, PZ + 0.5); tieMan.group.rotation.y = -Math.PI / 2 - 0.5; tieMan.upper.rotation.x = 0.5 + 0.15 * Math.sin(tAbs * 4);

    // ---- tubos, caminhão de concreto
    const trLow = ease(win(t, T.tr0, T.tr1));
    const lvl = concLvl(t);
    const botT = t < T.pour0 ? 8 + (-DEPTH + 0.5 - 8) * trLow : Math.min(HOP, Math.max(-DEPTH + 0.5, lvl - 1.2)) + 14 * ease(win(t, T.trOut0, T.trOut1));
    const topT = t < T.pour0 ? Math.min(botT + 17, 14 - (14 - HOP) * trLow) : HOP;
    trems.forEach((m) => { m.visible = t >= T.tr0 - 0.3 && t < T.trOut1 + 0.1; m.position.y = botT; m.scale.y = Math.max(0.01, (t < T.pour0 ? topT : HOP) - botT); });
    funnels.forEach((f) => { f.visible = t >= T.tr1 - 0.3 && t < T.trOut0 + 0.5; });
    const tkIn = ease(win(t, T.tkIn0, T.tkIn1)), tkOut = ease(win(t, T.tkOut0, T.tkOut1));
    const tkVis = t >= T.tkIn0 && t < T.tkOut1 + 0.2;
    truck.visible = tkVis; truck.position.set(-30.5 + 9 * (1 - tkIn) + 9 * tkOut, 0, 27.4); truck.userData.spin.rotation.x = tAbs * 2.5;
    chute.visible = tkVis && t > T.tkIn1 - 0.3 && t < T.pour1 + 0.6;
    { const c0 = new THREE.Vector3(truck.position.x - 3.0, 1.55, 27.4), c1 = new THREE.Vector3(X1 + 0.5, HOP + 0.8, PZ + 0.2); chute.position.copy(c0).add(c1).multiplyScalar(0.5); chute.scale.z = Math.max(0.01, c0.distanceTo(c1)); chute.lookAt(c1); }
    const pouring = t > T.pour0 && t < T.pour1 + 0.3;
    drops.visible = pouring;
    if (pouring) { for (let i = 0; i < 12; i++) { const f = (tAbs * 1.5 + i / 12) % 1; v.set(X1 + Math.sin(i * 3.1) * 0.12, HOP + 0.4 + (-1 - HOP) * f, PZ - 0.8 + (i % 2) * 1.6 + Math.cos(i * 2.3) * 0.1); m4.makeTranslation(v.x, v.y, v.z); drops.setMatrixAt(i, m4); } drops.instanceMatrix.needsUpdate = true; }

    // ---- concreto
    conc.visible = concCap.visible = t >= T.pour0 && lvl > -DEPTH + 0.02; conc.scale.y = concCap.scale.y = Math.max(0.001, lvl + DEPTH);
    concM.color.copy(WET).lerp(CURED, clamp01((t - T.pour1) / 8)); capM.color.copy(concM.color);

    // ---- pessoas
    const pw = (p, x0, x1, z, sp_, bend, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp_ + ph); p.group.position.set(x0 + (x1 - x0) * u, 0, z); p.group.rotation.y = Math.cos(tAbs * sp_ + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = bend; };
    pw(pA, -35, -31, 15.5, 0.5, 0.12, 0); pw(pB, -36.5, -32, 26, 0.45, 0.12, 1.7);

    const a = anchors;
    a.mureta.set(X1 + GWX + GWT + 0.04, -0.6, PZ + 2.5);
    a.clam.set(X1 - 0.03, c ? c.y + 1.4 : 2, PZ + (c ? SWZ * c.off : 0) + 0.9);
    a.lama.set(X1 - 0.06, -5.5, PZ - PL + 0.1);
    a.solo_t.set(X1 + 1.6, 1.4, PZ + 5.0);
    a.usina.set(X1 + 5.4, 3.4, PZ - 4.8);
    a.arm.set(X1 - 0.06, aTop - 5, PZ + 1.2);
    a.trem.set(X1 - 0.06, Math.max(-9, Math.min(-2, botT + 6)), PZ - 0.8 - 0.12);
    a.conc.set(X1 - 0.06, Math.min(-3, Math.max(-DEPTH + 2, lvl - 2)), PZ + PL - 0.1);
    a.na.set(X1 - 0.06, -9.55, PZ - 8);
    a.solo.set(X1, -21, PZ);
  }
  function labelVis(k, t = st.tc) {
    switch (k) {
      case 'mureta': return t > T.gwPour1 - 1 && t < T.ex0 + 8;
      case 'clam': return t > T.ex0 + 1 && t < T.ex1;
      case 'lama': return t > T.ex0 + 12 && t < T.s3 + 3 || (t > T.pour0 && t < T.pour1);
      case 'solo_t': return t > T.ex0 + 10 && t < T.s3 + 16;
      case 'usina': return t > T.crIn1 && t < T.ex0 + 8;
      case 'arm': return t > T.cA1 - 3 && t < T.s4 + 6;
      case 'trem': return t > T.tr1 && t < T.trOut0;
      case 'conc': return t > T.pour0 + 6;
      case 'na': return t > T.ex0 + 10;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hidden.g = engine.scene.getObjectByName('c-rig'); if (hidden.g) hidden.g.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); if (hidden.g) hidden.g.visible = true; },
  };
}
