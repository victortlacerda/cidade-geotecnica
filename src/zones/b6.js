import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, piece, capRect, person, plateCompactor, stream, barSet, WET, CURED } from './fund.js';
import { cellsAround } from './b1.js';

// ---------------------------------------------------------------------------
// B6 — Melhoria do solo sob fundação rasa: troca do solo mole por camadas de
// brita e solo-cimento, compactação, ensaio de placa e sapata. Seção em x = X1.
// ---------------------------------------------------------------------------
const X1 = -92, CZ = 48, DV = 2.3, LAY0 = -2.3, LAYTOP = -0.8, NL = 4;
const HX = 2.4, HZ = 2.4;
const PIT = { x0: X1 - HX, x1: X1 + HX, z0: CZ - HZ, z1: CZ + HZ };
const TH = (LAYTOP - LAY0) / NL;
const LENS = { z0: 40.4, z1: 55.6, y0: -2.3, y1: -0.3 };
const FT = { h: 1.3, y0: LAYTOP, y1: -0.2 }, COL = { s: 0.4, top: 2.0 };
const LB = 7.4, LS = 4.4; // início da 1ª camada e passo
const T = {
  dig0: 0.6, dig1: 6.4, rig0: 25.2, rig1: 26.4, st0: 26.6, stD: 1.5, unl: 34.1, rig2: 35.0, rig3: 36.0, s5: 36.2,
  form0: 36.4, form1: 38.0, bars0: 38.0, bars1: 40.0, pb0: 40.0, pb1: 41.4, truckIn: 41.4 + 0.2, pf0: 42.8, pf1: 45.2, pc1: 46.8, truckOut: 48.6, un0: 47.6, un1: 48.8, fill0: 49.0, fill1: 51.0, arrow: 51.2, END: 54.5,
};
const LOADS = [50, 100, 150, 200, 250], SETT = [0.8, 1.9, 3.4, 5.4, 8.1];
export const B6 = { box: { x0: -125, x1: X1, z0: 39, z1: 57 } };
export const B6_STEP_STARTS = [0, LB, LB + 1.9, T.rig0, T.s5];
export const B6_STEPS = [
  { t: 'Escavar o solo mole', d: 'O sondador achou uma lente de argila mole sob a sapata: ela recalcaria demais. A escavadeira remove o solo ruim em toda a profundidade da lente, mais a largura que a sapata precisa.' },
  { t: 'Substituir por camadas de brita e solo-cimento', d: 'Em vez de concretar direto, o cavado é preenchido com material bom, em camadas finas e controladas: brita no fundo e solo-cimento perto da superfície. O caminhão basculante lança cada camada solta.' },
  { t: 'Compactar cada camada', d: 'Cada camada é compactada antes de receber a próxima (rolo nas primeiras e placa vibratória nas últimas): solta, ela ocupa mais volume; compactada, afina e ganha rigidez. Camadas grossas ou mal compactadas deixariam bolsões moles.' },
  { t: 'Ensaio de placa', d: 'Uma placa de aço é carregada por macaco hidráulico, reagindo contra um pórtico com blocos de concreto. A cada estágio de carga mede-se o recalque. Se o resultado ficar dentro do previsto, o solo melhorado está aprovado.' },
  { t: 'Executar a sapata', d: 'Sobre o solo melhorado e aprovado, a sapata é feita como de costume: formas, armação, concreto e reaterro. O bulbo de tensões agora fica dentro de material controlado.' },
];
export const B6_LABELS = [
  { k: 'mole', t: 'Solo mole' },
  { k: 'cam', t: 'Camadas' },
  { k: 'comp', t: 'Compactação' },
  { k: 'placa', t: 'Ensaio de placa' },
  { k: 'sap', t: 'Sapata' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const B6_CAM = { tx: -91, ty: -1.2, tz: CZ, yaw: -1.3, pitch: 0.25, dist: 17.5 };
export const B6_MCAM = { tx: -91, ty: -3.6, tz: CZ, yaw: -1.3, pitch: 0.22, dist: 32 };

export function createB6(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const capX = (o) => X1 + o;
  const soilW = mat(0x9c7b56, { r: 1 }), soilF = mat(0x86683f, { r: 1 });
  const matConc = mat(0x85827a, { r: 0.95 }), matWood = mat(0xc9a26a, { r: 0.8 }), matFill = mat(0xb59568, { r: 1 });
  const dk = mat(0x24272b);

  // cava
  const wz = new THREE.PlaneGeometry(1, 1); wz.translate(0, -0.5, 0);
  const wx = new THREE.PlaneGeometry(1, 1); wx.rotateY(Math.PI / 2); wx.translate(0, -0.5, 0);
  const walls = [];
  const aw = (axis, pos, a, b) => { const m = new THREE.Mesh(axis === 'z' ? wz : wx, soilW); if (axis === 'z') m.position.set((a + b) / 2, 0, pos); else m.position.set(pos, 0, (a + b) / 2); m.userData = { axis, len: b - a }; root.add(m); walls.push(m); };
  aw('z', PIT.z0, PIT.x0, PIT.x1); aw('z', PIT.z1, PIT.x0, PIT.x1); aw('x', PIT.x0, PIT.z0, PIT.z1); aw('x', PIT.x1, PIT.z0, PIT.z1);
  const floorG = new THREE.PlaneGeometry(1, 1); floorG.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorG, soilF); floor.position.set(X1, 0, CZ); floor.scale.set(PIT.x1 - PIT.x0, 1, PIT.z1 - PIT.z0); root.add(floor);
  function setDepth(d) {
    walls.forEach((m) => { m.visible = d > 0.01; if (m.userData.axis === 'z') m.scale.set(m.userData.len, Math.max(0.001, d), 1); else m.scale.set(1, Math.max(0.001, d), m.userData.len); });
    floor.visible = d > 0.01; floor.position.y = -d + 0.002;
  }

  // lente de argila mole (desenhada no plano, em frente à parede do corte)
  const lensMat = noclip(0x8aa0a4, { r: 1 });
  const lensL = capRect(root, X1 - 0.05, LENS.z0, PIT.z0, LENS.y0, LENS.y1, lensMat), lensR = capRect(root, X1 - 0.05, PIT.z1, LENS.z1, LENS.y0, LENS.y1, lensMat);
  const lensM = capRect(root, X1 - 0.05, PIT.z0, PIT.z1, LENS.y0, LENS.y1, lensMat);
  [lensL, lensR, lensM].forEach((m) => { m.renderOrder = 4; });
  // textura simples da lente: faixas mais escuras
  const lensLines = new THREE.Group(); root.add(lensLines);
  for (const [z0, z1] of [[LENS.z0, PIT.z0], [PIT.z1, LENS.z1]]) for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, z1 - z0 - 0.3), noclip(0x6d8185)); l.position.set(X1 - 0.056, LENS.y0 + 0.3 + k * 0.45, (z0 + z1) / 2); l.renderOrder = 4; lensLines.add(l); }

  // camadas
  const LCOL = [0x8f8d88, 0x9d9b96, 0xb3a58a, 0xbcae94];
  const layers = LCOL.map((c, i) => piece(root, [{ axis: 'x', c: CZ, a: PIT.x0, b: PIT.x1 }], -HZ, HZ, LAY0 + i * TH, LAY0 + (i + 1) * TH, mat(c, { r: 1, e: 0x2c2b29 }), { x: capX(0.03) }));
  // linhas de compactação (passadas) em cada camada
  // sapata
  const fz0 = CZ - FT.h, fz1 = CZ + FT.h;
  const sapata = piece(root, [{ axis: 'x', c: CZ, a: X1 - FT.h, b: X1 + FT.h }], -FT.h, FT.h, FT.y0, FT.y1, matConc, { x: capX(0.02) });
  const pil = piece(root, [{ axis: 'x', c: CZ, a: X1 - COL.s / 2, b: X1 + COL.s / 2 }], -COL.s / 2, COL.s / 2, FT.y1, COL.top, matConc, { x: capX(0.02) });
  const fForm = piece(root, [{ axis: 'x', c: fz0 - 0.04, a: X1 - FT.h - 0.08, b: X1 + FT.h + 0.08 }, { axis: 'x', c: fz1 + 0.04, a: X1 - FT.h - 0.08, b: X1 + FT.h + 0.08 }, { axis: 'z', c: X1 - FT.h - 0.04, a: fz0, b: fz1 }, { axis: 'z', c: X1 + FT.h + 0.04, a: fz0, b: fz1 }], -0.04, 0.04, FT.y0, FT.y1 + 0.05, matWood, { x: capX(0.015) });
  const bars = barSet(root, 10, 0x3a3d42, 0.04);
  const secBars = new THREE.Group(); root.add(secBars);
  const bz = Array.from({ length: 5 }, (_, i) => fz0 + 0.25 + i * ((2 * FT.h - 0.5) / 4));
  for (const z of bz) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8), dk); d.rotation.z = Math.PI / 2; d.position.set(capX(0.005), FT.y0 + 0.1, z); secBars.add(d); }
  { const ln = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 2 * FT.h - 0.3), dk); ln.position.set(capX(0.008), FT.y0 + 0.18, CZ); secBars.add(ln); }
  const vbarGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6); vbarGeo.translate(0, 0.5, 0);
  const vb = []; const off = COL.s / 2 - 0.08;
  for (const [dx, dz] of [[-off, -off], [off, -off], [-off, off], [off, off]]) { const m = new THREE.Mesh(vbarGeo, mat(0x3a3d42, { r: 0.5, m: 0.5 })); m.position.set(X1 + dx, FT.y0 + 0.15, CZ + dz); root.add(m); vb.push(m); }
  const secV = new THREE.Group(); root.add(secV);
  for (const dz of [-off, off]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, COL.top + 0.2 - (FT.y0 + 0.15), 0.06), dk); l.position.set(capX(0.006), (COL.top + 0.2 + FT.y0 + 0.15) / 2, CZ + dz); secV.add(l); }
  // reaterro final
  const fills = [];
  const addCells = (cells, y0, y1) => cells.forEach((cl) => {
    const cap = cl.x0 < X1 && cl.x1 > X1 ? { x: capX(0.035) } : undefined;
    const pc = piece(root, [{ axis: 'x', c: (cl.z0 + cl.z1) / 2, a: cl.x0, b: cl.x1 }], -(cl.z1 - cl.z0) / 2, (cl.z1 - cl.z0) / 2, y0, y1, matFill, cap);
    fills.push({ pc, y0, y1 });
  });
  addCells(cellsAround(PIT, [{ x0: X1 - FT.h, x1: X1 + FT.h, z0: fz0, z1: fz1 }]), FT.y0, FT.y1);
  addCells(cellsAround(PIT, [{ x0: X1 - COL.s / 2, x1: X1 + COL.s / 2, z0: CZ - COL.s / 2, z1: CZ + COL.s / 2 }]), FT.y1, 0);
  const arrowMat = noclip(0xe8742c, { e: 0xe8742c, ei: 0.4 });
  const arrow = new THREE.Group(); { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 8), arrowMat); st.position.y = 0.8; const cn = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 10), arrowMat); cn.rotation.x = Math.PI; arrow.add(st, cn); }
  arrow.position.set(X1 - 0.12, COL.top + 0.45, CZ); arrow.visible = false; root.add(arrow);

  // pórtico do ensaio de placa
  const rig = new THREE.Group(); rig.visible = false; root.add(rig);
  const RX = X1 + 0.9;
  const stack = (z) => { for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.0), mat(i ? 0xb2aea4 : 0xa3a095)); b.position.set(RX, 0.25 + i * 0.5, z); b.castShadow = true; rig.add(b); } };
  stack(CZ - 2.95); stack(CZ + 2.95);
  const rbeam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 7.2), mat(0x3b6fb0, { m: 0.4 })); rbeam.position.set(RX, 1.15, CZ); rbeam.castShadow = true; rig.add(rbeam);
  const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.45, 12), mat(0xe8742c)); jack.position.set(RX, 0.78, CZ); rig.add(jack);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), mat(0x9aa0a8, { m: 0.6 })); rig.add(rod);
  const plateM = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 20), mat(0x6f757c, { m: 0.6 })); rig.add(plateM);
  const dial = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16), mat(0xf4f1ea)); b.rotation.z = Math.PI / 2; const pv = new THREE.Group(); pv.position.set(-0.04, 0, 0); const nd = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.11), mat(0xd23b2e)); nd.position.z = 0.05; pv.add(nd); dial.userData.nd = pv; dial.add(b, pv); const stand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.04), mat(0x2f3237)); stand.position.y = -0.45; dial.add(stand); }
  dial.position.set(RX, 0.9, CZ + 0.9); rig.add(dial);

  // máquinas
  const EX = X1 + HX + 3.9;
  const exc = M.excavator(0.5); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.position.set(EX, 0, CZ); excW.visible = false; root.add(excW);
  const dump = M.dumpTruck(); dump.scale.setScalar(0.6); dump.visible = false; root.add(dump);
  const rol = M.roller(); const rolW = new THREE.Group(); rol.scale.setScalar(0.42); rolW.add(rol); rolW.visible = false; root.add(rolW);
  const plate = plateCompactor(); plate.group.visible = false; root.add(plate.group);
  const flowB = stream(root, 18, 0x9d9b96);
  const mixer = M.mixerTruck(); mixer.scale.setScalar(0.62); mixer.visible = false; root.add(mixer);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1), mat(0x9aa0a8, { m: 0.4 })); chute.visible = false; root.add(chute);
  const flowC = stream(root, 18, 0x8b8880);
  const pA = person(0xe8742c), pB = person(0x4a8fd0), pC = person(0xf4f1ea, 0x3b7bd0);
  [pA, pB, pC].forEach((p) => root.add(p.group));

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(B6_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};
  const lb = (i) => LB + LS * i;
  const pop = (t, a, b, f = 0.5) => ease((t - a) / f) * ease((b - t) / f);
  function layerIdx(t) { return clamp01((t - LB) / (LS * NL)) < 1 ? Math.floor((t - LB) / LS) : NL; }
  function info(t) {
    if (t < LB) return { step: 0, p: t / LB, note: t < T.dig0 + 0.5 ? 'Sondagem indicou argila mole' : 'Retirando a lente de solo mole' };
    if (t < T.rig0) {
      const i = Math.min(NL - 1, layerIdx(t)), tl = t - lb(i), mat_ = i < 2 ? 'brita' : 'solo-cimento';
      return tl < 1.9 ? { step: 1, p: clamp01(tl / 1.8), note: `Camada ${i + 1} de ${NL} · lançando ${mat_}` } : { step: 2, p: clamp01((tl - 1.9) / 2), note: `Camada ${i + 1} de ${NL} · compactando${i < 2 ? ' com rolo' : ' com placa'}` };
    }
    if (t < T.s5) {
      const k = Math.floor((t - T.st0) / T.stD);
      if (t < T.st0) return { step: 3, p: 0, note: 'Montando o pórtico de reação' };
      if (t < T.unl) { const kk = Math.min(4, k); return { step: 3, p: clamp01((t - T.rig0) / (T.unl - T.rig0)), note: `Estágio ${kk + 1} de 5 · ${LOADS[kk]} kPa · recalque ${String(SETT[kk]).replace('.', ',')} mm` }; }
      return { step: 3, p: 1, note: 'Descarregando e liberando a área' };
    }
    return { step: 4, p: clamp01((t - T.s5) / (T.END - T.s5)), note: t < T.bars0 ? 'Formas da sapata' : t < T.pb0 ? 'Malha de armação' : t < T.pf0 ? 'Arranque do pilar' : t < T.pc1 ? 'Concretando sapata e pilar' : t < T.fill0 ? 'Desforma' : t < T.arrow ? 'Reaterro' : 'Carga sobre o solo melhorado' };
  }
  const m4 = new THREE.Matrix4();

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    const d = DV * ease(win(t, T.dig0, T.dig1));
    setDepth(d);
    terrainHoles[0].set(PIT.x0, PIT.x1, PIT.z0, PIT.z1);
    if (d > 0.02) section.setBand(0, PIT.z0, PIT.z1, -d, 0.05); else section.setBand(0, 0, 0, 0, 0);
    // lente remanescente sob o piso da cava
    const mh = Math.min(LENS.y1, -d) - LENS.y0;
    lensM.visible = mh > 0.01; lensM.scale.set(1, Math.max(0.001, mh), PIT.z1 - PIT.z0);

    // camadas
    layers.forEach((L, i) => {
      const b = lb(i), pf = win(t, b, b + 1.8), cf = win(t, b + 1.9, b + 3.9);
      L.set(pf * (1.12 - 0.12 * ease(cf)));
    });
    // máquinas — escavadeira
    const eS = pop(t, T.dig0 - 0.3, T.dig1 + 0.6, 0.6);
    excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); exc.update(t * 1.4); excW.position.z = CZ + Math.sin(t * 0.9) * 0.9;
    // caminhão basculante e brita
    const i = Math.min(NL - 1, Math.max(0, layerIdx(t))), tl = t - lb(i), placing = t >= LB && t < T.rig0 && tl < 1.9;
    const dtx = X1 + HX + 3.85 + 0.3;
    dump.visible = placing || (t >= LB && t < T.rig0 && tl < 2.4 && tl >= 1.9);
    const inP = ease(tl / 0.5), outP = ease((tl - 1.5) / 0.4);
    dump.position.set(dtx + 8 * (1 - inP) + 8 * outP, 0, CZ); dump.rotation.y = 0;
    const tip = ease(win(tl, 0.4, 1.0)) * (1 - ease(win(tl, 1.4, 1.8)));
    dump.userData.bed.rotation.z = 0.55 * tip;
    flowB.set(new THREE.Vector3(dtx - 1.9, 1.2 + 0.0, CZ), new THREE.Vector3(X1 + HX - 0.4, LAY0 + (i + 0.6) * TH, CZ + Math.sin(tAbs * 2) * 1.6), placing && tl > 0.5 && tl < 1.5, tAbs, 0.3);
    // compactação
    const cp = t >= LB && t < T.rig0 && tl >= 1.9, ph = clamp01((tl - 1.9) / 2);
    const useRoller = i < 2;
    rolW.visible = cp && useRoller; plate.group.visible = cp && !useRoller;
    const sweep = Math.abs(((ph * 3) % 2) - 1), zl = CZ - 1.5 + 3.0 * (0.5 + 0.5 * Math.sin(ph * 7));
    if (cp) {
      const ylev = LAY0 + (i + 1) * TH;
      if (useRoller) { rolW.position.set(PIT.x0 + 1.2 + (PIT.x1 - PIT.x0 - 2.4) * sweep, ylev - 0.12 * (1 - ease(ph)), zl); rolW.rotation.y = ((ph * 3) % 2) < 1 ? 0 : Math.PI; }
      else { plate.group.position.set(PIT.x0 + 0.7 + (PIT.x1 - PIT.x0 - 1.4) * sweep, ylev, zl); plate.group.rotation.y = Math.PI / 2; plate.shake(tAbs); }
    }
    // ensaio de placa
    const rigOn = t > T.rig0 && t < T.rig3;
    rig.visible = rigOn; const rs = ease(win(t, T.rig0, T.rig1)) * (1 - ease(win(t, T.rig2, T.rig3)));
    rig.scale.set(1, Math.max(0.001, rs), 1);
    if (rigOn) {
      const kk = (t - T.st0) / T.stD; let settle = 0;
      for (let s = 0; s < 5; s++) settle += ease(clamp01(kk - s)) * (SETT[s] - (s ? SETT[s - 1] : 0));
      const unl = 1 - ease(win(t, T.unl, T.unl + 0.8)); const sv = settle * 0.012 * (0.15 + 0.85 * unl);
      const py = LAYTOP + 0.025 - sv;
      plateM.position.set(RX, py, CZ);
      const top = jack.position.y - 0.22, len = Math.max(0.01, top - (py + 0.03)); rod.scale.y = len; rod.position.set(RX, py + 0.03 + len / 2, CZ);
      dial.userData.nd.rotation.x = -settle * 0.5 * unl;
    }
    // sapata
    const ff = win(t, T.form0, T.form1) * (1 - win(t, T.un0, T.un1));
    fForm.set(ff);
    const fb = win(t, T.bars0, T.bars1), hide = t > T.pf0 + 1.5;
    let bi = 0;
    bz.forEach((z, j) => { const g = ease(clamp01(fb * 1.5 - (j / 5) * 0.5)); const len = (2 * FT.h - 0.2) * g; bars.put(bi++, 'x', X1 + FT.h - 0.1 - len / 2, FT.y0 + 0.1, z, len); });
    [-1, -0.5, 0, 0.5, 1].forEach((dx, j) => { const g = ease(clamp01(fb * 1.5 - (j / 5) * 0.5 - 0.1)); const len = (2 * FT.h - 0.2) * g; bars.put(bi++, 'z', X1 + dx * (FT.h - 0.25), FT.y0 + 0.18, fz1 - 0.1 - len / 2, len); });
    bars.done(); bars.im.visible = fb > 0.01 && !hide; secBars.visible = fb > 0.15 && !hide;
    const fp = win(t, T.pb0, T.pb1);
    vb.forEach((m) => { m.visible = fp > 0.01; m.scale.y = Math.max(0.001, (COL.top + 0.2 - (FT.y0 + 0.15)) * ease(fp)); });
    secV.visible = fp > 0.3;
    sapata.set(win(t, T.pf0, T.pf0 + (T.pf1 - T.pf0) * 0.6)); pil.set(win(t, T.pf0 + (T.pf1 - T.pf0) * 0.6, T.pc1));
    matConc.color.copy(WET).lerp(CURED, clamp01((t - T.pf0 - 2) / 12));
    const lv = LAYTOP + (0 - LAYTOP) * ease(win(t, T.fill0, T.fill1));
    fills.forEach((f) => f.pc.set(clamp01((lv - f.y0) / (f.y1 - f.y0))));
    arrow.visible = t > T.arrow; arrow.position.y = COL.top + 0.45 + 0.1 * Math.sin(tAbs * 3);
    // betoneira
    const tx0 = X1 + HX + 4.2;
    const tx = t < T.pb1 ? tx0 + 9 : t < T.truckIn + 0.6 ? tx0 + 9 - 9 * ease((t - T.pb1) / (T.truckIn + 0.6 - T.pb1)) : t < T.pc1 + 0.2 ? tx0 : tx0 + 9 * ease((t - T.pc1 - 0.2) / (T.truckOut - T.pc1 - 0.2));
    const tVis = t >= T.pb1 && t < T.truckOut + 0.4;
    mixer.visible = tVis; mixer.position.set(tx, 0, CZ); mixer.userData.spin.rotation.x = tAbs * 2.5;
    const pouring = t > T.pf0 && t < T.pc1; const inPil = t > T.pf0 + (T.pf1 - T.pf0) * 0.6;
    chute.visible = tVis && t >= T.pf0 - 0.4 && t < T.pc1 + 0.4;
    const ch0 = new THREE.Vector3(tx - 3.0, 1.55, CZ), ch1 = new THREE.Vector3(inPil ? X1 + 0.45 : X1 + 0.9, inPil ? 2.4 : FT.y1 + 0.5, CZ + (inPil ? 0 : Math.sin(win(t, T.pf0, T.pf1) * 6) * 0.9));
    chute.position.copy(ch0).add(ch1).multiplyScalar(0.5); chute.scale.z = ch0.distanceTo(ch1); chute.lookAt(ch1);
    flowC.set(ch1, new THREE.Vector3(ch1.x - 0.25, inPil ? 0.4 + 0.6 * win(t, T.pf0 + 0.6 * (T.pf1 - T.pf0), T.pc1) : FT.y0 + 0.5 * win(t, T.pf0, T.pf1), ch1.z), pouring, tAbs, 0.1);

    const pw = (p, x0, x1, z, sp, bend, ph_) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp + ph_); p.group.position.set(x0 + (x1 - x0) * u, 0, z); p.group.rotation.y = Math.cos(tAbs * sp + ph_) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = bend; };
    pw(pA, X1 + 3.2, X1 + 7.4, CZ - 4.4, 0.6, t > LB && t < T.rig0 ? 0.35 : 0.1, 0);
    pw(pB, X1 + 3.2, X1 + 6.8, CZ + 4.4, 0.5, t > T.bars0 && t < T.pc1 ? 0.5 : 0.15, 1.7);
    pC.group.position.set(X1 + 3.6, 0, CZ + 3.9); pC.group.rotation.y = Math.PI / 2 + Math.sin(tAbs * 0.4) * 0.6; pC.upper.rotation.x = 0.05;

    const a = anchors;
    a.mole.set(X1 - 0.06, -1.3, 42.6);
    a.cam.set(X1 - 0.04, LAY0 + 0.7 * TH * 2, CZ - 1.6);
    a.comp.set(X1 - 0.04, LAY0 + (Math.min(NL, i + 1)) * TH, CZ + 1.8);
    a.placa.set(RX, 0.4, CZ - 0.9);
    a.sap.set(X1, -0.5, CZ + 1.0);
    a.solo.set(X1, -5.2, CZ - 0.5);
  }
  function labelVis(k, t = st.tc) {
    switch (k) {
      case 'mole': return t < T.dig1 - 0.2 || true;
      case 'cam': return t > lb(1) + 1.9;
      case 'comp': return t >= LB + 2.2 && t < T.rig0 && ((t - LB) % LS) >= 2.2 && ((t - LB) % LS) < 3.9;
      case 'placa': return t > T.st0 && t < T.unl;
      case 'sap': return t > T.pf1;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hidden.g = engine.scene.getObjectByName('b-isol'); if (hidden.g) hidden.g.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); if (hidden.g) hidden.g.visible = true; },
  };
}
