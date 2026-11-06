import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { E_XF, xfPt } from '../config.js';
import { ease, clamp01, win, mat, noclip, person, stream } from './fund.js';
import { baseBox } from './dsite.js';
import { X1E, XE, LEN, E_BOX, makeGrader, makeTanker } from './eroad.js';

// ---------------------------------------------------------------------------
// E4 — Estrada com corte e aterro. A seção em x = X1E atravessa a estrada de lado a lado (z). O terreno é uma encosta
// que sobe para o norte (z menor). O corte fica à esquerda da tela, o aterro à direita; o perfil é o mesmo ao longo de x.
// Escala exagerada: greide a 4,2 m, talude de corte 1:1, talude de aterro 1:1,5, valeta ao pé do corte.
// ---------------------------------------------------------------------------
const YG = 4.2, SL = 0.3, Z0 = 8, Z1 = 52, DZ = 0.5, NZ = Math.round((Z1 - Z0) / DZ) + 1;
const ZW0 = 27, ZW1 = 37, ZD0 = 27, ZD1 = 28.2;
const nat = (z) => Math.max(0, SL * (46 - z));
const ZCR = (YG + ZW0 - SL * 46) / (1 - SL);                       // crista do talude de corte
const ZTO = (YG + ZW1 / 1.5 - SL * 46) / (1 / 1.5 - SL);           // pé do talude de aterro
const ditch = (z) => 0.45 * (1 - Math.abs(2 * (z - ZD0) / (ZD1 - ZD0) - 1));
const fin = (z) => (z <= ZCR ? nat(z) : z < ZW0 ? YG + (ZW0 - z) : z < ZD1 ? YG - ditch(z) : z <= ZW1 ? YG : z < ZTO ? YG - (z - ZW1) / 1.5 : nat(z));
const HC0 = nat(ZCR), HF0 = nat(ZTO) - 0.05;
const T = { topo: [0, 16], line: [5, 12], clear: [16, 32], cutL: [[34, 44], [46, 56], [58, 68]], fillStart: 50, fillP: 9, fillN: 6, grade: [104, 112], ditchT: [108, 114], hidro: [114, 127], END: 134 };
export const E4_CAM = { tx: X1E, ty: 3.0, tz: 32, yaw: -1.3, pitch: 0.2, dist: 46 };
export const E4_MCAM = { tx: X1E, ty: 2.5, tz: 32, yaw: -1.3, pitch: 0.2, dist: 84 };
export const E4_STEPS = [
  { t: 'Levantamento topográfico e locação', d: 'A equipe de topografia marca no terreno o eixo da estrada, o pé do talude de aterro e a crista do corte, com as cotas de projeto (o greide). As estacas dizem onde cortar e onde aterrar. A linha tracejada no corte mostra a seção final: a plataforma da pista e os taludes.' },
  { t: 'Limpeza do terreno', d: 'O trator de esteira derruba a vegetação e remove a camada superficial de solo orgânico, que é fraca e não serve de apoio para o aterro. Esse solo é estocado para ser reposto depois nos taludes, onde ajuda a grama a pegar.' },
  { t: 'Corte em bancadas e transporte', d: 'A escavadeira corta o terreno em degraus, de cima para baixo, até o greide. O talude de corte é feito na inclinação que o solo aguenta, aqui de 1 na vertical para 1 na horizontal. Os caminhões levam o solo aproveitável para o aterro, e o que sobra vai para bota-fora.' },
  { t: 'Aterro em camadas compactadas', d: 'O aterro sobe em camadas finas, espalhadas pelo trator e compactadas pelo rolo pé de carneiro até o grau de compactação de projeto, controlado por ensaio de densidade. Na primeira camada o terreno natural é escarificado em degraus, para o aterro se amarrar a ele. O talude de aterro é mais suave, de 1 para 1,5.' },
  { t: 'Acabamento, drenagem e proteção', d: 'A motoniveladora regulariza a plataforma no greide. A valeta ao pé do talude de corte leva a água para longe da pista. Os taludes recebem hidrossemeadura, uma mistura de sementes, adubo e fibras, que protege contra a erosão. Água é o maior inimigo de um talude.' },
];
export const E4_STEP_STARTS = [0, 16, 32, 50, 104];
export const E4_LABELS = [
  { k: 'topo', t: 'Estacas e greide de projeto' }, { k: 'natural', t: 'Terreno natural' }, { k: 'corte', t: 'Talude de corte' }, { k: 'aterro', t: 'Talude de aterro' }, { k: 'plat', t: 'Plataforma (greide)' },
  { k: 'valeta', t: 'Valeta de drenagem' }, { k: 'escav', t: 'Escavadeira' }, { k: 'dozer', t: 'Trator de esteira' }, { k: 'cam', t: 'Caminhão basculante' }, { k: 'rolo', t: 'Rolo pé de carneiro' },
  { k: 'ensaio', t: 'Controle de compactação' }, { k: 'moto', t: 'Motoniveladora' }, { k: 'hidro', t: 'Hidrossemeadura' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const E4 = { box: E_BOX };

const bar2 = (z0, y0, z1, y1, th, m, ro = 7) => {
  const a = new THREE.Vector3(X1E - 0.045, y0, z0), b = new THREE.Vector3(X1E - 0.045, y1, z1);
  const o = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), m); o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.z = a.distanceTo(b); o.lookAt(b); o.renderOrder = ro; return o;
};
export function makeDozer() {
  const g = new THREE.Group();
  const Y = mat(0xe8b300, { r: 0.6 }), D = mat(0x2f3237, { r: 0.6 }), G = mat(0x9ec3da, { r: 0.3 });
  const add = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  for (const z of [-1.1, 1.1]) add(4.0, 1.0, 0.9, D, 0, 0.5, z);
  add(3.2, 1.0, 2.0, Y, -0.2, 1.4, 0); add(1.3, 1.1, 1.6, G, -0.8, 2.5, 0); add(0.35, 1.3, 3.8, D, 2.5, 0.8, 0);
  for (const z of [-1.2, 1.2]) add(1.3, 0.2, 0.2, D, 1.8, 0.8, z);
  g.scale.setScalar(0.9); return g;
}

export function createE4(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  root.rotation.y = E_XF.rot; root.position.set(E_XF.ox, 0, E_XF.oz);   // avenida central
  const ZS = Array.from({ length: NZ }, (_, i) => Z0 + i * DZ), ys = new Float32Array(NZ), Nc = new Float32Array(NZ);
  const XC = X1E - 0.02, XB = X1E - 0.05;
  const surf = (z) => { const f = clamp01((z - Z0) / (Z1 - Z0)) * (NZ - 1), i = Math.min(NZ - 2, Math.floor(f)), q = f - i; return ys[i] * (1 - q) + ys[i + 1] * q; };

  // --- terreno deformável
  const mkGeo = (nv) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nv * 3), 3)); return g; };
  const topG = mkGeo(NZ * 2), capG = mkGeo(NZ * 2), bkG = mkGeo(NZ * 2), sdG = mkGeo(4);
  const idxStrip = (n, flip) => { const a = []; for (let i = 0; i < n - 1; i++) { const A = 2 * i, B = 2 * i + 1, C = 2 * i + 2, D = 2 * i + 3; if (flip) a.push(A, C, B, B, C, D); else a.push(A, B, C, B, D, C); } return a; };
  topG.setIndex(idxStrip(NZ, true)); capG.setIndex(idxStrip(NZ, false)); bkG.setIndex(idxStrip(NZ, true)); sdG.setIndex([0, 1, 2, 1, 3, 2]);
  const vm = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide });
  const topM = vm(), bkM = vm(), sdM = vm(), capM = vm(); capM.userData.noClip = true; capM.emissive = new THREE.Color(0x3a2a18);
  const top = new THREE.Mesh(topG, topM), cap = new THREE.Mesh(capG, capM), bk = new THREE.Mesh(bkG, bkM), sd = new THREE.Mesh(sdG, sdM);
  top.receiveShadow = true; top.castShadow = true; cap.renderOrder = 2; [top, cap, bk, sd].forEach((m) => { m.frustumCulled = false; root.add(m); });
  const cG = new THREE.Color(0x6f9c50), cS = new THREE.Color(0x8c6c48), cF = new THREE.Color(0xa38660), cB = new THREE.Color(0xbcb8ac), cC = new THREE.Color(0xb9b6ab), cH = new THREE.Color(0x7dbb5c), cT = new THREE.Color(0x94704a), cD = new THREE.Color(0xb48e62), cSt = new THREE.Color(0x5e8a43);
  const col = new THREE.Color();
  const setCol = (g, i, c) => { const a = g.attributes.color; a.setXYZ(i, c.r, c.g, c.b); };

  // --- árvores
  const trees = [12, 14, 16, 18, 20, 22, 28, 30, 31.5, 34, 38, 40, 43, 45].map((z, i) => {
    const x = X1E + 4 + ((i * 7) % 13) * 2.7 + (i % 3) * 0.6, gr = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.3, 6), mat(0x6a4a2c)); tr.position.y = 0.65; gr.add(tr);
    const fo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0 + (i % 3) * 0.12, 0), mat(0x3f8a45, { r: 1 })); fo.position.y = 2.0; fo.castShadow = true; gr.add(fo);
    gr.position.set(x, nat(z), z); root.add(gr); return { gr, z, gone: z > 22 ? 20 + ((i * 3) % 9) : null };
  });
  // --- estacas
  const stakes = []; for (const xs of [X1E + 8, X1E + 20, X1E + 32]) for (const z of [ZCR, ZW0, ZW1, ZTO]) {
    const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 6), mat(0xf3e9d2)); p.position.y = 0.65; g.add(p); const tp = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 6), mat(0xd8332a)); tp.position.y = 1.4; g.add(tp);
    g.position.set(xs, nat(z), z); g.visible = false; root.add(g); stakes.push({ g, z, keep: z === ZCR || z === ZTO });
  }
  // --- linhas tracejadas no corte (projeto e terreno natural)
  const dashLine = (pts, th, m, ro) => { const out = []; for (let k = 0; k < pts.length - 1; k++) { const [za, ya] = pts[k], [zb, yb] = pts[k + 1]; const L = Math.hypot(zb - za, yb - ya), n = Math.max(1, Math.round(L / 0.75)); for (let j = 0; j < n; j++) { const a = (j + 0.1) / n, b = (j + 0.75) / n; const m1 = bar2(za + (zb - za) * a, ya + (yb - ya) * a, za + (zb - za) * b, ya + (yb - ya) * b, th, m, ro); m1.visible = false; root.add(m1); out.push(m1); } } return out; };
  const designD = dashLine([[ZCR, nat(ZCR)], [ZW0, YG], [ZW1, YG], [ZTO, nat(ZTO)]], 0.09, noclip(0xf5c518, { r: 0.6, e: 0x4a3a00 }), 8);
  const naturalD = dashLine([[ZCR, nat(ZCR)], [ZTO, nat(ZTO)]], 0.06, noclip(0xffffff, { r: 0.6, e: 0x333333 }), 8);
  // --- topografia
  const topo = person(0x2f6fd0, 0xffffff), help = person(0xe8742c); [topo, help].forEach((p) => { p.group.visible = false; root.add(p.group); });
  const tri = new THREE.Group(); { const m = mat(0x2a2c30); for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5), m); l.position.set(Math.cos(k * 2.1) * 0.35, 0.7, Math.sin(k * 2.1) * 0.35); l.rotation.z = Math.cos(k * 2.1) * 0.25; l.rotation.x = -Math.sin(k * 2.1) * 0.25; tri.add(l); } const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.24), mat(0xe8b300)); b.position.y = 1.55; tri.add(b); } tri.visible = false; root.add(tri);
  // --- máquinas
  const dozer = makeDozer(); dozer.visible = false; root.add(dozer);
  const exc = M.excavator(0.8); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI / 2; excW.add(exc.group); excW.visible = false; root.add(excW);
  const truck = M.dumpTruck(0xe8b300); truck.scale.setScalar(0.85); truck.visible = false; root.add(truck);
  const load = baseBox(3.8, 1, 2.4, mat(0x8c6c48, { r: 1 })); load.position.set(2.1, 0.15, 0); load.visible = false; truck.userData.bed.add(load);
  const roller = M.roller(); roller.scale.setScalar(0.7); roller.visible = false; root.add(roller);
  const grader = makeGrader(); grader.visible = false; root.add(grader);
  const tanker = makeTanker(0x3a9a4a); tanker.visible = false; root.add(tanker); const seedS = stream(root, 40, 0x7ac45a);
  const tech = person(0xf2b705, 0xffffff); tech.group.visible = false; root.add(tech.group); const tbox = baseBox(0.4, 0.25, 0.4, mat(0xe8742c)); tbox.visible = false; root.add(tbox);
  const pileG = new THREE.ConeGeometry(1, 1, 9), dumpPile = new THREE.Mesh(pileG, mat(0x8c6c48, { r: 1 })); dumpPile.castShadow = true; dumpPile.visible = false; root.add(dumpPile);
  const stock = new THREE.Mesh(pileG, mat(0x4f3a22, { r: 1 })); stock.castShadow = true; stock.visible = false; root.add(stock);
  const place = (o, x, z, yaw, dy = 0) => { const y = surf(z), s = surf(z + 0.6) - surf(z - 0.6); o.position.set(x, y + dy, z); o.rotation.set(Math.atan(-s / 1.2), yaw, 0); };

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(E4_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const XP = X1E - 0.045, v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const lifts = () => { let c = 0; T.cutL.forEach(([a, b]) => { c += ease(win(st.tc, a, b)); }); return c / 3; };
  const fillLevel = () => { let c = 0; for (let k = 0; k < T.fillN; k++) { const a = T.fillStart + k * T.fillP; c += ease(win(st.tc, a, a + T.fillP * 0.5)); } return c / T.fillN; };
  const XD = X1E + 30, XL = X1E + 12, ZL = 30.5, ZDMP = 35.5, PER = 11;

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc;
    let note = '', label = null;
    // perfil
    const clearP = ease(win(t, 22, 32)), cutP = lifts(), fillQ = fillLevel();
    const Hc = HC0 + (YG - HC0) * cutP, Hf = HF0 + (YG - HF0) * fillQ;
    const hsL = ease(win(t, T.hidro[0], T.hidro[0] + 6.5)), hsR = ease(win(t, T.hidro[0] + 6.5, T.hidro[1])), dP = ease(win(t, T.ditchT[0], T.ditchT[1])), gP = ease(win(t, T.grade[0], T.grade[1]));
    for (let i = 0; i < NZ; i++) {
      const z = ZS[i], n0 = nat(z), nc = (z > 20 && z < 47) ? n0 - 0.25 * clearP : n0; Nc[i] = nc; const F = fin(z);
      let y = nc;
      if (nc > F + 1e-4) y = Math.max(F, Math.min(nc, Hc)); else if (nc < F - 1e-4) y = Math.min(F, Math.max(nc, Hf));
      ys[i] = y + 0.002;
      // cor
      const mod = Math.abs(y - nc) > 0.02, strip = clearP > 0 && z > 20 && z < 47;
      col.copy(cG); if (strip) col.lerp(cS, clearP); if (mod) col.copy(cS);
      if (mod && z > ZW1 - 0.3 && F > nc) col.copy(cF);
      if (z <= ZCR + 0.01 || z >= ZTO - 0.01) { /* terreno natural */ }
      const slopeL = z > ZCR - 0.2 && z < ZW0 + 0.05, slopeR = z > ZW1 - 0.05 && z < ZTO + 0.2, plat = z >= ZW0 && z <= ZW1 + 0.05;
      if (slopeL) col.lerp(cH, hsL * 0.9); if (slopeR) col.lerp(cH, hsR * 0.9);
      if (plat && z >= ZD1) col.lerp(cB, gP);
      if (z >= ZD0 && z < ZD1) col.lerp(cC, dP);
      setCol(topG, 2 * i, col); setCol(topG, 2 * i + 1, col);
      setCol(bkG, 2 * i, cD); setCol(bkG, 2 * i + 1, cT);
      setCol(capG, 2 * i, cD); setCol(capG, 2 * i + 1, cT);
      topG.attributes.position.setXYZ(2 * i, XB, ys[i], z); topG.attributes.position.setXYZ(2 * i + 1, XE, ys[i], z);
      capG.attributes.position.setXYZ(2 * i, XC, 0, z); capG.attributes.position.setXYZ(2 * i + 1, XC, ys[i], z);
      bkG.attributes.position.setXYZ(2 * i, XE, 0, z); bkG.attributes.position.setXYZ(2 * i + 1, XE, ys[i], z);
    }
    const y0 = ys[0]; sdG.attributes.position.setXYZ(0, XB, 0, Z0); sdG.attributes.position.setXYZ(1, XB, y0, Z0); sdG.attributes.position.setXYZ(2, XE, 0, Z0); sdG.attributes.position.setXYZ(3, XE, y0, Z0);
    for (let i = 0; i < 4; i++) setCol(sdG, i, i % 2 ? cT : cD);
    [topG, capG, bkG, sdG].forEach((g) => { g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; });
    topG.computeVertexNormals();
    // árvores, estacas, linhas
    trees.forEach((tr) => { const s = tr.gone === null ? 1 : 1 - ease(win(t, tr.gone, tr.gone + 2.2)); tr.gr.visible = s > 0.01; tr.gr.scale.setScalar(Math.max(0.01, s)); });
    stakes.forEach((s, i) => { const u = ease(win(t, 1.5 + i * 0.9, 2.3 + i * 0.9)), gone = s.keep ? 1 : 1 - ease(win(t, T.cutL[0][0] - 2, T.cutL[0][0])); s.g.visible = u > 0.01 && gone > 0.01; s.g.scale.setScalar(Math.max(0.01, u * gone)); });
    const dl = ease(win(t, T.line[0], T.line[1])), nl = ease(win(t, T.cutL[0][0] - 2, T.cutL[0][0] + 2));
    designD.forEach((d, i) => { d.visible = dl > (i + 1) / (designD.length + 1); }); naturalD.forEach((d, i) => { d.visible = nl > (i + 1) / (naturalD.length + 1) && t < T.fillStart + T.fillP * 5; });
    // topografia
    const tOn = t < 18; topo.group.visible = help.group.visible = tri.visible = tOn;
    if (tOn) { const f = win(t, 1, 16), sx = X1E + 8 + 12 * Math.min(2, Math.floor(f * 3)); topo.group.position.set(sx, surf(29.2), 29.2); topo.group.rotation.y = -0.6; tri.position.set(sx + 0.8, surf(29.2), 29.2); const hz = ZCR + (ZTO - ZCR) * (0.5 + 0.5 * Math.sin(tAbs * 0.5)); help.group.position.set(sx, surf(hz), hz); help.group.rotation.y = Math.PI; note = 'Marcando o eixo, os pés dos taludes e as cotas do greide'; label = 'topo'; }
    // trator: limpeza e espalhamento
    let dzOn = false, dzx = 0, dzz = 30, dzy = 0;
    if (t >= 17 && t < 31) { dzOn = true; const f = win(t, 17, 31), sw = f * 3; dzx = X1E + 6 + 28 * (Math.floor(sw) % 2 === 0 ? sw % 1 : 1 - (sw % 1)); dzy = (Math.floor(sw) % 2 === 0) ? 0 : Math.PI; dzz = 30 + 2.5 * Math.sin(f * 9); note = 'Removendo a vegetação e o solo orgânico'; label = 'dozer'; }
    stock.visible = t > 22 && t < T.hidro[0] + 8; { const g = ease(win(t, 22, 31)) * (1 - ease(win(t, T.hidro[0], T.hidro[0] + 8))); stock.scale.set(Math.max(0.01, 3.2 * g), Math.max(0.01, 1.8 * g), Math.max(0.01, 3.2 * g)); stock.position.set(XE - 8, nat(18) + 0.9 * g, 18); }
    // escavadeira e caminhão
    const cutOn = t >= 33 && t < 69, exOn = cutOn;
    excW.visible = exOn; if (exOn) { place(excW, XL, ZL, 0, 0); exc.update(tAbs * 1.1); }
    let tkOn = false, tkx = 0, tkz = 0, tkTilt = 0, loaded = false, dumpG = 0;
    if (t >= 36 && t < 103) {
      const u = (((t - 36) % PER) + PER) % PER / PER, ext = t >= 69, xl = ext ? XE + 9 : XL;
      if (u < 0.25) { const f = ease(u / 0.25); tkOn = true; tkx = xl + (XD - xl) * f; tkz = (ext ? ZDMP : ZL + 1.6) + (ZDMP - (ZL + 1.6)) * (ext ? 0 : f); loaded = true; }
      else if (u < 0.45) { tkOn = true; tkx = XD; tkz = ZDMP; tkTilt = ease((u - 0.25) / 0.1) * (1 - ease((u - 0.37) / 0.08)); loaded = u < 0.33; dumpG = ease((u - 0.28) / 0.1); }
      else if (u < 0.7) { const f = ease((u - 0.45) / 0.25); tkOn = true; tkx = XD + (xl - XD) * f; tkz = ZDMP + ((ext ? ZDMP : ZL + 1.6) - ZDMP) * (ext ? 0 : f); }
      else if (!ext) { tkOn = true; tkx = xl; tkz = ZL + 1.6; loaded = u > 0.85; }
      if (tkOn && t < 103) { note = ext ? 'Caminhão trazendo material do empréstimo' : 'Caminhão levando o solo do corte para o aterro'; label = 'cam'; }
      dumpPile.visible = u >= 0.28 && u < 0.78 && t >= 50; { const g = u < 0.4 ? ease((u - 0.28) / 0.12) : 1 - ease((u - 0.5) / 0.28); dumpPile.scale.set(Math.max(0.01, 1.7 * g), Math.max(0.01, 1.0 * g), Math.max(0.01, 1.7 * g)); dumpPile.position.set(XD, surf(ZDMP) + 0.45 * g, ZDMP); }
      if (t >= 50 && u >= 0.5 && u < 0.78) { dzOn = true; const f = (u - 0.5) / 0.28; dzx = XD + 3 - 6 * f; dzy = Math.PI; dzz = ZDMP + 0.4 + Math.sin(f * 6) * 1.2; note = 'Espalhando a camada de aterro'; label = 'dozer'; }
    } else dumpPile.visible = false;
    truck.visible = tkOn && tkx < XE + 9.5; if (tkOn) { place(truck, tkx, tkz, 0, 0.02); truck.userData.bed.rotation.z = tkTilt * 0.5; }
    load.visible = tkOn && loaded && tkTilt < 0.5; load.scale.y = Math.max(0.01, 1.1 * (1 - dumpG));
    dozer.visible = dzOn; if (dzOn) place(dozer, dzx, dzz, dzy);
    // rolo e ensaio (aterro)
    let rOn = false, tcOn = false;
    for (let kk = 0; kk < T.fillN; kk++) { const a = T.fillStart + kk * T.fillP, u = (t - a) / T.fillP; if (u >= 0.55 && u < 1) { const f = (u - 0.55) / 0.45; if (f < 0.8) { rOn = true; const pp = Math.min(2, Math.floor(f / 0.8 * 3)), q = f / 0.8 * 3 - pp; place(roller, X1E + 3 + (LEN - 6) * (pp % 2 === 0 ? q : 1 - q), 34 + pp * 1.4, pp % 2 === 0 ? 0 : Math.PI); note = `Compactando a camada ${kk + 1} de ${T.fillN} · GC ${Math.round(88 + 12 * f / 0.8)}%`; label = 'rolo'; } else { tcOn = true; tech.group.position.set(X1E + 20, surf(35.8), 35.8); tech.group.rotation.y = 0.6; tech.upper.rotation.x = 0.35; tbox.position.set(X1E + 20.7, surf(35.8), 35.6); note = 'Controle: ensaio de densidade no local'; label = 'ensaio'; } } }
    roller.visible = rOn; tech.group.visible = tbox.visible = tcOn;
    // motoniveladora
    const gOn = t >= T.grade[0] && t < T.grade[1] + 1; grader.visible = gOn; if (gOn) { const f = win(t, T.grade[0], T.grade[1]), sw = f * 2; const gx = X1E + 3 + (LEN - 6) * (sw < 1 ? sw : 2 - sw); place(grader, gx, 32.5, sw < 1 ? 0 : Math.PI); note = 'Regularizando a plataforma no greide'; label = 'moto'; }
    if (t >= T.ditchT[0] && t < T.ditchT[1]) { note = note || 'Abrindo e revestindo a valeta ao pé do talude'; }
    // hidrossemeadura
    const hs = win(t, T.hidro[0], T.hidro[1]), hOn = hs > 0 && hs < 1; tanker.visible = hOn; seedS.set(v1, v1, false, 0);
    if (hOn) { const left = hs < 0.5, f = left ? hs * 2 : hs * 2 - 1, x = X1E - 3 + (LEN + 6.5) * f, z = left ? 29.2 : 35.6; place(tanker, x, z, 0, 0.0); tanker.rotation.y = 0; v1.set(x - 0.5, surf(z) + 2.4, z); v2.set(x - 0.5, surf(left ? 25.6 : 38.6) + 0.4, left ? 25.6 : 38.6); seedS.set(v1, v2, x > X1E + 1, tAbs, 0.25); note = 'Hidrossemeadura: sementes, adubo e fibras sobre o talude'; label = 'hidro'; }
    // etapas, notas e âncoras
    const S = E4_STEP_STARTS; let step = 0; for (let i = 0; i < S.length; i++) if (t >= S[i]) step = i;
    st.step = step; st.progress = win(t, S[step], S[step + 1] ?? T.END);
    st.note = note || (t < 16 ? 'Terreno natural' : t < 33 ? 'Limpando o terreno' : t < 104 ? (t < 69 ? 'Cortando e aterrando' : 'Aterrando em camadas') : 'Obra pronta');
    const a = anchors;
    a.topo.set(XP, nat(ZCR) + 0.5, ZCR); a.natural.set(XP, nat(17) + 0.05, 17); a.corte.set(XP, fin(26) + 0.05, 26); a.aterro.set(XP, fin(39.2) + 0.05, 39.2); a.plat.set(XP, YG + 0.05, 33.5); a.valeta.set(XP, YG - 0.3, 27.6); a.solo.set(X1E, -15, 32);
    a.escav.set(excW.position.x, excW.position.y + 3.6, excW.position.z); a.dozer.set(dozer.position.x, dozer.position.y + 3.4, dozer.position.z); a.cam.set(truck.position.x, truck.position.y + 3.9, truck.position.z); a.rolo.set(roller.position.x, roller.position.y + 3.2, roller.position.z); a.ensaio.set(tech.group.position.x, tech.group.position.y + 2.0, tech.group.position.z); a.moto.set(grader.position.x, grader.position.y + 3.4, grader.position.z); a.hidro.set(tanker.position.x, tanker.position.y + 3.6, tanker.position.z);
    for (const k in a) { const [wx, wz] = xfPt(E_XF, a[k].x, a[k].z); a[k].x = wx; a[k].z = wz; }
    void label;
  }
  const VIS = {
    topo: (t) => t > T.line[1] && t < T.cutL[0][0] + 8, natural: (t) => t > T.cutL[0][0] + 2 && t < 100, corte: (t) => t > T.cutL[2][0], aterro: (t) => t > T.fillStart + T.fillP * 4, plat: (t) => t > T.grade[0] + 4, valeta: (t) => t > T.ditchT[1],
    escav: () => excW.visible, dozer: () => dozer.visible, cam: () => truck.visible, rolo: () => roller.visible, ensaio: () => tech.group.visible && tbox.visible, moto: () => grader.visible, hidro: () => tanker.visible,
  };
  const labelVis = (kx, t = st.tc) => { const f = VIS[kx]; return f ? f(t) : true; };
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; const o = engine.scene.getObjectByName('e-road'); if (o) o.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); const o = engine.scene.getObjectByName('e-road'); if (o) o.visible = true; },
  };
}
