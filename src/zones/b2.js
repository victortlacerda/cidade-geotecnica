import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, piece, person, plateCompactor, stream, barSet, WET, CURED } from './fund.js';

// ---------------------------------------------------------------------------
// B2 — Sapata corrida (seção em x = X1, vista do oeste; as faixas correm ao longo de x)
// ---------------------------------------------------------------------------
const X1 = -70;
export const B2 = { box: { x0: -125, x1: X1, z0: 4, z1: 28 } };
const ZN = 11.5, ZS = 20.5, XE = -65.4, XW = -74.6, WID = 1.5, DV = 1.6;
const STRIPS = [
  { axis: 'x', c: ZN, a: -75.35, b: -64.65 }, { axis: 'x', c: ZS, a: -75.35, b: -64.65 },
  { axis: 'z', c: XE, a: 10.75, b: 21.25 }, { axis: 'z', c: XW, a: 10.75, b: 21.25 },
];
const OUT = { x0: -75.35, x1: -64.65, z0: 10.75, z1: 21.25 }, INN = { x0: -73.85, x1: -66.15, z0: 12.25, z1: 19.75 };

const T = {
  stakes: 1.6, dig1: 6.2, s1: 7, comp1: 8.6, last1: 10.5, s2: 11, bars1: 14.5, stir0: 13, stir1: 16.2, form0: 15.5, form1: 17.8,
  s3: 18, truckIn: 19.2, pb0: 19.4, pb1: 21.3, pn1: 23.2, truckOut: 24.4, s4: 24, un0: 25, un1: 26.2, END: 34,
};
const LIFTS = [[26.4, 28.0, -0.75], [28.0, 29.6, -0.4], [29.6, 31.2, 0]];
export const B2_STEP_STARTS = [0, T.s1, T.s2, T.s3, T.s4];
export const B2_STEPS = [
  { t: 'Locação e abertura da vala', d: 'A topografia marca o eixo da fundação com estacas e linhas. A retroescavadeira abre a vala na largura e na profundidade de projeto, abaixo da camada superficial de solo.' },
  { t: 'Apiloar e lançar o lastro', d: 'O fundo da vala é apiloado para nivelar e compactar. Sobre ele vai uma camada fina de concreto magro, o lastro, que dá uma base limpa e plana para a armação e protege o concreto do contato com o solo.' },
  { t: 'Armação e forma', d: 'As barras longitudinais e os estribos formam a gaiola de aço da sapata e da viga baldrame, com cobrimento mínimo de concreto. As formas de madeira fecham o pescoço da viga.' },
  { t: 'Concretar e adensar', d: 'O caminhão betoneira lança o concreto na vala. Primeiro a base alargada da sapata, depois o pescoço e o baldrame. O adensamento tira os vazios e o concreto começa a curar.' },
  { t: 'Desformar, reaterrar e compactar', d: 'As formas saem, e o reaterro é feito em camadas finas, cada uma compactada com a placa vibratória. A sapata distribui a carga da parede sobre o solo em uma faixa larga; o bulbo mostra até onde as tensões chegam.' },
];
export const B2_LABELS = [
  { k: 'vala', t: 'Vala' },
  { k: 'lastro', t: 'Lastro' },
  { k: 'arm', t: 'Armação' },
  { k: 'forma', t: 'Forma' },
  { k: 'conc', t: 'Concreto' },
  { k: 'reat', t: 'Reaterro' },
  { k: 'bulbo', t: 'Bulbo de tensões' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];

export function createB2(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const soilW = mat(0x9c7b56, { r: 1 }), soilF = mat(0x86683f, { r: 1 });

  // ------------------------------------------------------------ vala (paredes e piso)
  const wallZ = new THREE.PlaneGeometry(1, 1); wallZ.translate(0, -0.5, 0);
  const wallX = new THREE.PlaneGeometry(1, 1); wallX.rotateY(Math.PI / 2); wallX.translate(0, -0.5, 0);
  const floorG = new THREE.PlaneGeometry(1, 1); floorG.rotateX(-Math.PI / 2);
  const walls = [], floors = [];
  const addWall = (axis, pos, a, b) => {
    const m = new THREE.Mesh(axis === 'z' ? wallZ : wallX, soilW); m.receiveShadow = true;
    if (axis === 'z') { m.position.set((a + b) / 2, 0, pos); m.userData.len = b - a; } else { m.position.set(pos, 0, (a + b) / 2); m.userData.len = b - a; }
    m.userData.axis = axis; root.add(m); walls.push(m);
  };
  addWall('z', OUT.z0, OUT.x0, OUT.x1); addWall('z', OUT.z1, OUT.x0, OUT.x1);
  addWall('z', INN.z0, INN.x0, INN.x1); addWall('z', INN.z1, INN.x0, INN.x1);
  addWall('x', OUT.x0, OUT.z0, OUT.z1); addWall('x', OUT.x1, OUT.z0, OUT.z1);
  addWall('x', INN.x0, INN.z0, INN.z1); addWall('x', INN.x1, INN.z0, INN.z1);
  const addFloor = (x0, x1, z0, z1) => { const m = new THREE.Mesh(floorG, soilF); m.receiveShadow = true; m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); m.scale.set(x1 - x0, 1, z1 - z0); root.add(m); floors.push(m); };
  addFloor(OUT.x0, OUT.x1, OUT.z0, INN.z0); addFloor(OUT.x0, OUT.x1, INN.z1, OUT.z1);
  addFloor(OUT.x0, INN.x0, INN.z0, INN.z1); addFloor(INN.x1, OUT.x1, INN.z0, INN.z1);
  const holes = [[OUT.x0, OUT.x1, OUT.z0, INN.z0], [OUT.x0, OUT.x1, INN.z1, OUT.z1], [OUT.x0, INN.x0, INN.z0, INN.z1], [INN.x1, OUT.x1, INN.z0, INN.z1]];
  function setDepth(d) {
    walls.forEach((m) => { m.visible = d > 0.01; if (m.userData.axis === 'z') m.scale.set(m.userData.len, Math.max(0.001, d), 1); else m.scale.set(1, Math.max(0.001, d), m.userData.len); });
    floors.forEach((m) => { m.visible = d > 0.01; m.position.y = -d + 0.002; });
  }

  // ------------------------------------------------------------ peças em seção
  const capX = (o) => X1 + o;
  const matLastro = mat(0xb6b2a8, { r: 1 }), matConc = mat(0x85827a, { r: 0.95 }), matWood = mat(0xc9a26a, { r: 0.8 });
  const matFill = mat(0xb59568, { r: 1 });
  const lastro = piece(root, STRIPS, -0.75, 0.75, -DV, -DV + 0.12, matLastro, { x: capX(0.03) });
  const base = piece(root, STRIPS, -0.6, 0.6, -DV + 0.12, -1.08, matConc, { x: capX(0.02) });
  const neck = piece(root, STRIPS, -0.2, 0.2, -1.08, 0.25, matConc, { x: capX(0.02) });
  const formA = piece(root, STRIPS, 0.2, 0.26, -1.08, 0.32, matWood, { x: capX(0.015) });
  const formB = piece(root, STRIPS, -0.26, -0.2, -1.08, 0.32, matWood, { x: capX(0.015) });
  const fillLowA = piece(root, STRIPS, 0.6, 0.75, -DV + 0.12, -1.08, matFill, { x: capX(0.035) });
  const fillLowB = piece(root, STRIPS, -0.75, -0.6, -DV + 0.12, -1.08, matFill, { x: capX(0.035) });
  const fillHiA = piece(root, STRIPS, 0.26, 0.6, -1.08, 0, matFill, { x: capX(0.035) });
  const fillHiB = piece(root, STRIPS, -0.6, -0.26, -1.08, 0, matFill, { x: capX(0.035) });
  const wall = piece(root, STRIPS, -0.15, 0.15, 0.25, 1.7, mat(0xcf8a63, { r: 0.9 }), { x: capX(0.02) });

  // ------------------------------------------------------------ armação
  const BAR = [[-0.45, -1.36], [-0.225, -1.36], [0, -1.36], [0.225, -1.36], [0.45, -1.36], [-0.11, -0.95], [0.11, -0.95], [-0.11, 0.08], [0.11, 0.08]];
  const bars = barSet(root, BAR.length * STRIPS.length, 0x3a3d42, 0.05);
  const frame = (w, y0, y1) => {
    const t = 0.035, parts = [];
    const b = (sx, sy, sz, x, y, z) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); parts.push(g); };
    b(t, t, w, 0, y0, 0); b(t, t, w, 0, y1, 0); b(t, y1 - y0, t, 0, (y0 + y1) / 2, -w / 2); b(t, y1 - y0, t, 0, (y0 + y1) / 2, w / 2);
    return mergeGeometries(parts);
  };
  const NST = 19, stirMat = mat(0x2f3237, { r: 0.5, m: 0.5 });
  const stB = new THREE.InstancedMesh(frame(1.0, -1.42, -1.16), stirMat, NST * STRIPS.length), stN = new THREE.InstancedMesh(frame(0.3, -1.4, 0.14), stirMat, NST * STRIPS.length);
  stB.frustumCulled = stN.frustumCulled = false; root.add(stB, stN);
  const m4 = new THREE.Matrix4(), qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), q0 = new THREE.Quaternion(), pv = new THREE.Vector3(), ones = new THREE.Vector3(1, 1, 1);
  // desenho das barras e estribos no plano da seção
  const secBars = new THREE.Group(), secStir = new THREE.Group(); root.add(secBars, secStir);
  for (const c of [ZN, ZS]) {
    for (const [u, y] of BAR) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), mat(0x24272b)); d.rotation.z = Math.PI / 2; d.position.set(capX(0.005), y, c + u); secBars.add(d); }
    for (const [w, y0, y1] of [[1.0, -1.42, -1.16], [0.3, -1.4, 0.14]]) {
      const t = 0.03; const mk = (sy, sz, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, sy, sz), mat(0x24272b)); m.position.set(capX(0.008), y, c + z); secStir.add(m); };
      mk(t, w, y0, 0); mk(t, w, y1, 0); mk(y1 - y0, t, (y0 + y1) / 2, -w / 2); mk(y1 - y0, t, (y0 + y1) / 2, w / 2);
    }
  }

  // ------------------------------------------------------------ bulbo de tensões (no plano, à frente da parede)
  const bulbMats = [noclip(0xf2c14e, { op: 0, dw: false, r: 1 }), noclip(0xf0a43a, { op: 0, dw: false, r: 1 }), noclip(0xe0782c, { op: 0, dw: false, r: 1 })];
  const bulbs = [];
  for (const c of [ZN, ZS]) {
    [[3.4, 4.6], [2.3, 3.1], [1.3, 1.8]].forEach(([rz, ry], i) => {
      const sh = new THREE.Shape(); sh.absellipse(0, 0, rz, ry, Math.PI, Math.PI * 2, false); sh.closePath();
      const g = new THREE.ShapeGeometry(sh, 24); g.rotateY(-Math.PI / 2);
      const m = new THREE.Mesh(g, bulbMats[i]); m.position.set(X1 - 0.04 - i * 0.002, -DV + 0.12, c); m.renderOrder = 5; root.add(m); bulbs.push(m);
    });
  }

  // ------------------------------------------------------------ locação (estacas e linhas)
  const stakes = new THREE.Group(); root.add(stakes);
  for (const [x, z] of [[-62.9, 8.9], [-62.9, 23.1], [-62.9, 16]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), mat(0xcaa36a)); s.position.set(x, 0.5, z); stakes.add(s);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.14), mat(0xd23b2e)); t.position.set(x, 1.0, z); stakes.add(t);
  }
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 14.2), mat(0xf4f1ea)); line.position.set(-62.9, 0.85, 16); stakes.add(line);

  // ------------------------------------------------------------ máquinas e pessoas
  const exc = M.excavator(0.5); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.position.set(-60.4, 0, 16); excW.visible = false; root.add(excW);
  const truck = M.mixerTruck(); truck.scale.setScalar(0.62); truck.visible = false; root.add(truck);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1), mat(0x9aa0a8, { m: 0.4 })); chute.visible = false; root.add(chute);
  const flow = stream(root, 18, 0x8b8880);
  const plate = plateCompactor(); plate.group.visible = false; root.add(plate.group);
  const pA = person(0xe8742c), pB = person(0x4a8fd0), pC = person(0xf4f1ea, 0x3b7bd0);
  [pA, pB, pC].forEach((p) => root.add(p.group));
  const wallLine = null;

  // ------------------------------------------------------------ estado
  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(B2_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};

  function info(t) {
    if (t < T.s1) return { step: 0, p: t / T.s1, note: t < T.stakes ? 'Locação do eixo' : 'Escavando a vala' };
    if (t < T.s2) return { step: 1, p: (t - T.s1) / (T.s2 - T.s1), note: t < T.comp1 ? 'Apiloamento do fundo' : 'Lastro de concreto magro' };
    if (t < T.s3) return { step: 2, p: (t - T.s2) / (T.s3 - T.s2), note: t < T.form0 ? 'Barras e estribos' : 'Formas do pescoço' };
    if (t < T.s4) return { step: 3, p: (t - T.s3) / (T.s4 - T.s3), note: t < T.pb0 ? 'Caminhão posicionado' : t < T.pb1 ? 'Concretando a base' : 'Concretando o baldrame' };
    const k = LIFTS.findIndex((l) => t < l[1]);
    return { step: 4, p: Math.min(1, (t - T.s4) / (T.END - T.s4)), note: t < T.un1 ? 'Desforma' : k >= 0 ? `Reaterro · camada ${k + 1} de 3` : 'Parede sobe sobre o baldrame' };
  }
  function level(t) {
    if (t <= LIFTS[0][0]) return -DV + 0.12;
    let from = -DV + 0.12;
    for (const [a, b, to] of LIFTS) { if (t < b) return from + (to - from) * ease((t - a) / (b - a)); from = to; }
    return 0;
  }
  const pop = (t, a, b, f = 0.5) => ease((t - a) / f) * ease((b - t) / f);

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    // vala
    const d = DV * ease((t - T.stakes) / (T.dig1 - T.stakes));
    setDepth(d);
    holes.forEach((h, i) => terrainHoles[i].set(h[0], h[1], h[2], h[3]));
    for (let i = 0; i < 2; i++) { const c = i ? ZS : ZN; if (d > 0.02) section.setBand(i, c - WID / 2, c + WID / 2, -d, 0.05); else section.setBand(i, 0, 0, 0, 0); }
    stakes.visible = t < T.s1 + 0.5; stakes.scale.setScalar(ease((t - 0.2) / 0.6) * ease((T.s2 - t) / 0.6));

    // lastro, armação, formas, concreto, reaterro
    lastro.set(win(t, T.comp1, T.last1));
    const fb = win(t, T.s2, T.bars1), fs = win(t, T.stir0, T.stir1);
    BAR.forEach(([u, y], bi) => STRIPS.forEach((s, si) => {
      const i = si * BAR.length + bi, len = Math.abs(s.b - s.a) * 0.97 * ease(fb);
      if (s.axis === 'x') bars.put(i, 'x', s.b - 0.15 - len / 2, y, s.c + u, len); else bars.put(i, 'z', s.c + u, y, s.b - 0.15 - len / 2, len);
    }));
    bars.done();
    secBars.visible = fb > 0.2; secStir.visible = fs > 0.1;
    STRIPS.forEach((s, si) => {
      for (let j = 0; j < NST; j++) {
        const on = j / NST < fs, i = si * NST + j, pos = s.b - 0.6 - j * ((Math.abs(s.b - s.a) - 1.2) / NST);
        if (!on) { m4.makeScale(0, 0, 0); stB.setMatrixAt(i, m4); stN.setMatrixAt(i, m4); continue; }
        if (s.axis === 'x') pv.set(pos, 0, s.c); else pv.set(s.c, 0, pos);
        m4.compose(pv, s.axis === 'x' ? q0 : qz, ones); stB.setMatrixAt(i, m4); stN.setMatrixAt(i, m4);
      }
    });
    stB.instanceMatrix.needsUpdate = stN.instanceMatrix.needsUpdate = true;
    const ff = win(t, T.form0, T.form1) * (1 - win(t, T.un0, T.un1));
    formA.set(ff); formB.set(ff);
    const fBase = win(t, T.pb0, T.pb1), fNeck = win(t, T.pb1, T.pn1);
    base.set(fBase); neck.set(fNeck);
    matConc.color.copy(WET).lerp(CURED, clamp01((t - T.pb0 - 2) / 12));
    const lv = level(t);
    const fLow = clamp01((lv + DV - 0.12) / 0.4), fHi = clamp01((lv + 1.08) / 1.08);
    fillLowA.set(fLow); fillLowB.set(fLow); fillHiA.set(fHi); fillHiB.set(fHi);
    wall.set(win(t, 31.4, 33.6));
    const bulbA = win(t, T.pn1 + 0.5, T.pn1 + 2.5) * 0.3;
    bulbMats.forEach((m, i) => { m.opacity = bulbA * (0.7 + i * 0.25); });

    // retroescavadeira
    const eS = pop(t, 0.4, T.s1 + 0.2, 0.6);
    excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); exc.update(t * 1.4);
    excW.position.z = 16 + Math.sin(t * 0.8) * 1.2;

    // caminhão betoneira
    const tx = t < T.s3 ? -52 : t < T.truckIn ? -52 + (-60.4 + 52) * ease((t - T.s3) / (T.truckIn - T.s3)) : t < T.pn1 + 0.2 ? -60.4 : -60.4 + (8.4) * ease((t - T.pn1 - 0.2) / (T.truckOut - T.pn1 - 0.2 + 0.001));
    const tVis = t >= T.s3 && t < T.truckOut + 0.5;
    truck.visible = tVis; truck.position.set(tx, 0, 16); truck.rotation.y = 0;
    truck.userData.spin.rotation.x = tAbs * 2.5;
    const pouring = t > T.pb0 && t < T.pn1;
    chute.visible = tVis && t >= T.truckIn - 0.2 && t < T.pn1 + 0.4;
    const ch0 = new THREE.Vector3(tx - 3.0, 1.55, 16), ch1 = new THREE.Vector3(XE + 0.2, 0.55, 16);
    chute.position.copy(ch0).add(ch1).multiplyScalar(0.5); chute.scale.z = ch0.distanceTo(ch1); chute.lookAt(ch1);
    const fl0 = ch1.clone(), fl1 = new THREE.Vector3(XE, t < T.pb1 ? -DV + 0.4 : -0.3, 16);
    flow.set(fl0, fl1, pouring, tAbs);

    // placa vibratória: fundo (lastro) e camadas do reaterro
    const pOn = (t > T.s1 + 0.2 && t < T.comp1 + 0.2) || (t > LIFTS[0][0] + 0.9 && t < 31.6);
    plate.group.visible = pOn;
    if (pOn) {
      let y = -DV + 0.14, x, z = ZN, ph;
      if (t < T.comp1 + 0.3) { ph = win(t, T.s1 + 0.2, T.comp1 + 0.2); y = -DV; } else {
        const li = LIFTS.findIndex((l) => t < l[1] + 0.6); const L = LIFTS[Math.max(0, li)]; ph = clamp01((t - (L[0] + 0.6)) / 1.6); y = level(t) - 0.0; z = li % 2 ? ZS - 0.5 : ZN + 0.5;
      }
      x = -73 + 8 * Math.abs(((ph * 2) % 2) - 1);
      plate.group.position.set(x, y, z); plate.group.rotation.y = Math.PI / 2; plate.shake(tAbs);
    }

    // pessoas
    const pw = (p, x0, x1, z, sp, bend, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp + ph); p.group.position.set(x0 + (x1 - x0) * u, 0, z); p.group.rotation.y = x1 > x0 ? (Math.cos(tAbs * sp + ph) > 0 ? -Math.PI / 2 : Math.PI / 2) : 0; p.upper.rotation.x = bend; };
    pw(pA, -67, -62, 9.6, 0.6, t > T.s2 && t < T.form1 ? 0.7 : 0.1, 0);
    pw(pB, -68, -62.5, 22.5, 0.5, t > T.pb0 && t < T.un0 ? 0.45 : 0.15, 1.7);
    pC.group.position.set(-68.4, 0, 16); pC.group.rotation.y = -Math.PI / 2 + Math.sin(tAbs * 0.4) * 0.6; pC.upper.rotation.x = 0.05;

    // âncoras
    anchors.vala.set(X1, -0.7, ZN - 0.7);
    anchors.lastro.set(X1, -DV + 0.06, ZS);
    anchors.arm.set(X1, -1.35, ZS + 0.4);
    anchors.forma.set(X1, -0.3, ZS + 0.23);
    anchors.conc.set(X1, 0.15, ZN);
    anchors.reat.set(X1, -0.6, ZN - 0.5);
    anchors.bulbo.set(X1 - 0.04, -DV - 1.6, ZS + 1.4);
    anchors.solo.set(X1, -4.5, 15.5);
  }
  function labelVis(k, t = st.tc) {
    switch (k) {
      case 'vala': return t > T.stakes + 1.2 && t < T.s2 + 3;
      case 'lastro': return t > T.comp1 + 0.8 && t < T.s3;
      case 'arm': return t > T.s2 + 1.5 && t < T.pb0 + 1;
      case 'forma': return t > T.form0 + 1.2 && t < T.un0 + 0.5;
      case 'conc': return t > T.pb1 + 1;
      case 'reat': return t > LIFTS[0][1];
      case 'bulbo': return t > T.pn1 + 2.4;
      default: return true;
    }
  }

  return {
    group: root, state: st, anchors, update, labelVis,
    enter() {
      st.active = true; root.visible = true; st.tc = 0; st.hold = 0;
      for (const n of ['b-sapata']) { hidden[n] = engine.scene.getObjectByName(n); if (hidden[n]) hidden[n].visible = false; }
    },
    exit() {
      st.active = false; root.visible = false;
      terrainHoles.forEach((h) => h.set(0, 0, 0, 0));
      for (const k of Object.keys(hidden)) if (hidden[k]) hidden[k].visible = true;
    },
  };
}
