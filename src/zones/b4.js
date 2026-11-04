import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, piece, capRect, person, stream, barSet, WET, CURED } from './fund.js';

// ---------------------------------------------------------------------------
// B4 — Radier (seção em x = X1; a laje se estende de z = 27,5 a 36,5)
// ---------------------------------------------------------------------------
const X1 = -70;
export const B4 = { box: { x0: -125, x1: X1, z0: 22, z1: 42 } };
const ZC = 32, PIT = { x0: -75.75, x1: -64.25, z0: 27, z1: 37 }, SLAB = { x0: -75.25, x1: -64.75, z0: 27.5, z1: 36.5 }, DEP = 0.4;
const S_ = { x: 'x', c: ZC };
const T = { dig0: 0.6, dig1: 3.5, roll0: 4.0, roll1: 7.6, s1: 8, br0: 8.6, br1: 11, lona0: 11.2, lona1: 12.8, s2: 13, form0: 13.4, form1: 15.6, bars0: 15.8, bars1: 20, s3: 21, truckIn: 22.2, pour0: 22.4, pour1: 26, scr0: 26.2, scr1: 27.8, truckOut: 28.6, s4: 28, tro0: 28.4, tro1: 34, cure0: 31, un0: 36.4, END: 38.5 };
export const B4_STEP_STARTS = [0, T.s1, T.s2, T.s3, T.s4];
export const B4_STEPS = [
  { t: 'Terraplenagem e compactação', d: 'A escavadeira retira a camada superficial de solo orgânico e nivela o terreno. O rolo compacta o fundo da cava para que o solo sob a laje seja uniforme e resistente, sem trechos fofos que recalquem mais que o resto.' },
  { t: 'Brita e lona plástica', d: 'Uma camada de brita regulariza a base e corta a subida de umidade por capilaridade. Sobre ela, a lona plástica impede que a água do concreto fresco escape para o solo.' },
  { t: 'Formas de borda e armação', d: 'As formas de madeira definem o contorno da laje. Espaçadores levantam as telas de aço para que fiquem no meio da espessura, com cobrimento de concreto, e as barras se cruzam formando a malha.' },
  { t: 'Concretar e sarrafear', d: 'O caminhão betoneira lança o concreto e ele é espalhado até a altura das formas. A régua (o sarrafo) corre sobre as formas e nivela a superfície.' },
  { t: 'Acabamento e cura', d: 'A desempenadeira mecânica fecha a superfície. Depois a laje é mantida úmida por vários dias: a cura evita fissuras e deixa o concreto atingir a resistência de projeto.' },
];
export const B4_LABELS = [
  { k: 'sub', t: 'Solo compactado' },
  { k: 'brita', t: 'Brita' },
  { k: 'lona', t: 'Lona' },
  { k: 'forma', t: 'Forma' },
  { k: 'arm', t: 'Armação' },
  { k: 'conc', t: 'Concreto' },
  { k: 'cura', t: 'Cura' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];

export function createB4(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const soilW = mat(0x9c7b56, { r: 1 }), soilF = mat(0x86683f, { r: 1 });
  const capX = (o) => X1 + o;

  // ------------------------------------------------------------ cava
  const wz = new THREE.PlaneGeometry(1, 1); wz.translate(0, -0.5, 0);
  const wx = new THREE.PlaneGeometry(1, 1); wx.rotateY(Math.PI / 2); wx.translate(0, -0.5, 0);
  const walls = [];
  const aw = (axis, pos, a, b) => { const m = new THREE.Mesh(axis === 'z' ? wz : wx, soilW); if (axis === 'z') m.position.set((a + b) / 2, 0, pos); else m.position.set(pos, 0, (a + b) / 2); m.userData = { axis, len: b - a }; root.add(m); walls.push(m); };
  aw('z', PIT.z0, PIT.x0, PIT.x1); aw('z', PIT.z1, PIT.x0, PIT.x1); aw('x', PIT.x0, PIT.z0, PIT.z1); aw('x', PIT.x1, PIT.z0, PIT.z1);
  const floorG = new THREE.PlaneGeometry(1, 1); floorG.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorG, soilF); floor.position.set((PIT.x0 + PIT.x1) / 2, 0, ZC); floor.scale.set(PIT.x1 - PIT.x0, 1, PIT.z1 - PIT.z0); root.add(floor);
  function setDepth(d) {
    walls.forEach((m) => { m.visible = d > 0.01; if (m.userData.axis === 'z') m.scale.set(m.userData.len, Math.max(0.001, d), 1); else m.scale.set(1, Math.max(0.001, d), m.userData.len); });
    floor.visible = d > 0.01; floor.position.y = -d + 0.002;
  }
  const subOverlay = capRect(root, X1 - 0.04, PIT.z0, PIT.z1, -DEP - 0.18, -DEP, noclip(0x5a432c, { op: 0, dw: false, r: 1 }));
  subOverlay.renderOrder = 5;

  // ------------------------------------------------------------ camadas e peças
  const A = [{ axis: 'x', c: ZC, a: -75.7, b: -64.3 }];
  const matBrita = mat(0x9d9b96, { r: 1, e: 0x2c2b29 }), matWood = mat(0xc9a26a, { r: 0.8 }), matConc = mat(0x85827a, { r: 0.95, e: 0x3a3935 });
  const brita = piece(root, A, -4.95, 4.95, -DEP, -0.2, matBrita, { x: capX(0.03) });
  // lona (desenrola de sul para norte)
  const lonaMat = mat(0x1c1e22, { r: 0.4 });
  const boxU = new THREE.BoxGeometry(1, 1, 1);
  const lonaBody = new THREE.Mesh(boxU, lonaMat), lonaCap = capRect(root, capX(0.01), 0, 1, -0.2, -0.17, lonaMat);
  root.add(lonaBody);
  const FS = [
    { axis: 'x', c: SLAB.z0 - 0.04, a: SLAB.x0 - 0.06, b: SLAB.x1 + 0.06 }, { axis: 'x', c: SLAB.z1 + 0.04, a: SLAB.x0 - 0.06, b: SLAB.x1 + 0.06 },
    { axis: 'z', c: SLAB.x0 - 0.04, a: SLAB.z0, b: SLAB.z1 }, { axis: 'z', c: SLAB.x1 + 0.04, a: SLAB.z0, b: SLAB.z1 },
  ];
  const forms = piece(root, FS, -0.04, 0.04, -0.2, 0.3, matWood, { x: capX(0.015) });
  const slab = piece(root, [{ axis: 'x', c: ZC, a: SLAB.x0, b: SLAB.x1 }], -4.5, 4.5, -0.2, 0.2, matConc, { x: capX(0.02) });

  // espaçadores
  const SPX = [-74, -72, -70, -68, -66], SPZ = [28.5, 30.5, 32.5, 34.5];
  const spac = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.1, 0.14), mat(0xd7d2c4), SPX.length * SPZ.length); spac.frustumCulled = false; root.add(spac);
  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), q0 = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  SPX.forEach((x, i) => SPZ.forEach((z, j) => { m4.compose(v3.set(x, -0.15, z), q0, one); spac.setMatrixAt(i * SPZ.length + j, m4); }));
  // malha de armação (duas camadas)
  const BZ = Array.from({ length: 18 }, (_, i) => 27.75 + i * 0.5), BX = Array.from({ length: 21 }, (_, i) => -75 + i * 0.5), LY = [-0.1, 0.1];
  const bars = barSet(root, (BZ.length + BX.length) * 2, 0x3a3d42, 0.035);
  const secBars = new THREE.Group(); root.add(secBars);
  for (const y of LY) {
    for (const z of BZ) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 8), mat(0x24272b)); d.rotation.z = Math.PI / 2; d.position.set(capX(0.005), y, z); secBars.add(d); }
    const ln = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 8.5), mat(0x24272b)); ln.position.set(capX(0.008), y, 32); secBars.add(ln);
  }
  SPZ.forEach((z) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.14), mat(0xd7d2c4)); s.position.set(capX(0.01), -0.15, z); secBars.add(s); });

  // ------------------------------------------------------------ máquinas e pessoas
  const exc = M.excavator(0.5); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.position.set(-60.4, 0, ZC); excW.visible = false; root.add(excW);
  const rol = M.roller(); const rolW = new THREE.Group(); rol.scale.setScalar(0.42); rolW.add(rol); rolW.visible = false; root.add(rolW);
  const dump = M.dumpTruck(); dump.scale.setScalar(0.6); dump.visible = false; root.add(dump);
  const mixer = M.mixerTruck(); mixer.scale.setScalar(0.62); mixer.visible = false; root.add(mixer);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1), mat(0x9aa0a8, { m: 0.4 })); chute.visible = false; root.add(chute);
  const flowBrita = stream(root, 18, 0x9d9b96), flowConc = stream(root, 18, 0x8b8880);
  const screed = new THREE.Mesh(new THREE.BoxGeometry(10.9, 0.1, 0.14), mat(0xc9ccd1, { m: 0.5 })); screed.visible = false; root.add(screed);
  const trowel = new THREE.Group(); { const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 16), mat(0x7b8088, { m: 0.5 })); const mot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat(0xe8742c)); mot.position.y = 0.3; const hd = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.3), mat(0x2f3237)); hd.position.set(0, 0.6, -0.8); hd.rotation.x = 0.5; trowel.add(disc, mot, hd); trowel.userData.disc = disc; }
  trowel.visible = false; root.add(trowel);
  const water = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 5), mat(0x7fc0e8, { op: 0.8 }), 44); water.frustumCulled = false; root.add(water);
  const pA = person(0xe8742c), pB = person(0x4a8fd0), pC = person(0xf4f1ea, 0x3b7bd0);
  [pA, pB, pC].forEach((p) => root.add(p.group));

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(B4_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};

  function info(t) {
    if (t < T.s1) return { step: 0, p: t / T.s1, note: t < T.roll0 ? 'Escavando o terreno' : 'Compactando o fundo' };
    if (t < T.s2) return { step: 1, p: (t - T.s1) / (T.s2 - T.s1), note: t < T.lona0 ? 'Lançando a brita' : 'Estendendo a lona' };
    if (t < T.s3) return { step: 2, p: (t - T.s2) / (T.s3 - T.s2), note: t < T.bars0 ? 'Formas de borda' : 'Espaçadores e telas' };
    if (t < T.s4) return { step: 3, p: (t - T.s3) / (T.s4 - T.s3), note: t < T.pour0 ? 'Caminhão posicionado' : t < T.pour1 ? 'Lançando o concreto' : 'Sarrafeando a superfície' };
    return { step: 4, p: Math.min(1, (t - T.s4) / (T.END - T.s4)), note: t < T.tro1 ? 'Desempenadeira mecânica' : 'Cura úmida' };
  }
  const pop = (t, a, b, f = 0.5) => ease((t - a) / f) * ease((b - t) / f);
  const face = (o, dx, dz) => { o.rotation.y = Math.atan2(dx, dz); };
  const walk = (p, ax_, az_, bx_, bz_, sp, ph, bend, tAbs) => {
    const u = 0.5 + 0.5 * Math.sin(tAbs * sp + ph), c = Math.cos(tAbs * sp + ph);
    p.group.position.set(ax_ + (bx_ - ax_) * u, 0, az_ + (bz_ - az_) * u);
    const dx = (bx_ - ax_) * c, dz = (bz_ - az_) * c; if (Math.abs(dx) + Math.abs(dz) > 1e-3) face(p.group, dx, dz);
    p.upper.rotation.x = bend;
  };

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    const d = DEP * ease(win(t, T.dig0, T.dig1));
    setDepth(d);
    terrainHoles[0].set(PIT.x0, PIT.x1, PIT.z0, PIT.z1);
    if (d > 0.02) section.setBand(0, PIT.z0, PIT.z1, -d, 0.05); else section.setBand(0, 0, 0, 0, 0);
    const comp = ease(win(t, T.roll0 + 0.5, T.roll1));
    soilF.color.set(0x86683f).lerp(new THREE.Color(0x5b4529), comp);
    subOverlay.material.opacity = comp * 0.7;

    brita.set(win(t, T.br0, T.br1));
    // lona
    const lf = ease(win(t, T.lona0, T.lona1));
    lonaBody.visible = lonaCap.visible = lf > 0.01;
    const lz1 = 36.95, len = 9.9 * lf;
    lonaBody.scale.set(11.2, 0.025, Math.max(0.001, len)); lonaBody.position.set(-70, -0.19, lz1 - len / 2);
    lonaCap.scale.set(1, 0.03, Math.max(0.001, len)); lonaCap.position.set(capX(0.01), -0.2, lz1 - len / 2);

    forms.set(win(t, T.form0, T.form1) * (1 - win(t, T.un0, T.un0 + 1.4)));
    const fb = win(t, T.bars0, T.bars1);
    spac.visible = t > T.form1 - 0.5 && t < T.pour0 + 1.5;
    secBars.visible = fb > 0.15 || (t > T.form1 && t < T.pour0 + 1.5);
    let bi = 0;
    for (const y of LY) {
      BZ.forEach((z, i) => { const f = ease(clamp01(fb * 1.4 - (i / BZ.length) * 0.4)); const len = 10.2 * f; bars.put(bi++, 'x', -64.8 - len / 2, y, z, len); });
      BX.forEach((x, i) => { const f = ease(clamp01(fb * 1.4 - (i / BX.length) * 0.4 - 0.1)); const len = 8.7 * f; bars.put(bi++, 'z', x, y, 36.3 - len / 2, len); });
    }
    bars.done();
    const hideBars = t > T.pour1 - 1.5; // sob o concreto
    bars.im.visible = !hideBars || t < T.pour0;

    const lvl = win(t, T.pour0 + 0.2, T.pour1);
    slab.set(lvl);
    const cure = clamp01((t - T.pour1) / 10);
    matConc.color.copy(WET).lerp(CURED, cure);

    // máquinas
    const eS = pop(t, T.dig0 - 0.4, T.dig1 + 1.0, 0.6);
    excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); exc.update(t * 1.4); excW.position.z = ZC + Math.sin(t) * 1.5;
    const rOn = t > T.roll0 - 0.3 && t < T.roll1 + 0.4;
    rolW.visible = rOn;
    if (rOn) { const ph = win(t, T.roll0, T.roll1); const x = -74.6 + 9 * Math.abs(((ph * 3) % 2) - 1); rolW.position.set(x, -d + 0.003, 30.2 + 3.2 * Math.abs(((ph * 1.5) % 2) - 1) - 1.6 * 0); rolW.rotation.y = ((ph * 3) % 2) < 1 ? 0 : Math.PI; }
    // caminhão de brita
    const dIn = t < T.s1 + 0.2 ? 0 : t < T.s1 + 0.8 ? ease((t - T.s1 - 0.2) / 0.6) : 1, dOut = ease((t - T.br1 - 0.2) / 0.8);
    dump.visible = t > T.s1 + 0.1 && t < T.br1 + 1.2;
    dump.position.set(-52 + (-60.4 + 52) * dIn + 8.4 * dOut, 0, ZC); dump.rotation.y = 0;
    const tip = ease(win(t, T.br0 - 0.2, T.br0 + 0.8)) * (1 - ease(win(t, T.br1 - 0.3, T.br1 + 0.3)));
    dump.userData.bed.rotation.z = 0.55 * tip;
    const brOn = t > T.br0 && t < T.br1;
    flowBrita.set(new THREE.Vector3(-62.4, 1.2, ZC), new THREE.Vector3(-64.6 - win(t, T.br0, T.br1) * 0.0, -0.1, ZC + Math.sin(t * 2) * 2.5), brOn, tAbs, 0.3);
    // betoneira
    const mIn = ease(win(t, T.s3, T.truckIn)), mOut = ease(win(t, T.pour1 + 1.4, T.truckOut));
    mixer.visible = t >= T.s3 && t < T.truckOut + 0.5;
    mixer.position.set(-52 + (-60.4 + 52) * mIn + 8.4 * mOut, 0, ZC); mixer.userData.spin.rotation.x = tAbs * 2.5;
    const zt = ZC + 3.6 * Math.sin(win(t, T.pour0, T.pour1) * Math.PI * 3);
    const pouring = t > T.pour0 && t < T.pour1;
    chute.visible = mixer.visible && t > T.truckIn - 0.3 && t < T.pour1 + 0.4;
    const c0 = new THREE.Vector3(mixer.position.x - 3.0, 1.55, ZC), c1 = new THREE.Vector3(-64.3, 0.7, zt);
    chute.position.copy(c0).add(c1).multiplyScalar(0.5); chute.scale.z = c0.distanceTo(c1); chute.lookAt(c1);
    flowConc.set(c1, new THREE.Vector3(c1.x - 0.4, -0.2 + 0.4 * lvl, zt), pouring, tAbs, 0.15);
    // régua
    const sf = win(t, T.scr0, T.scr1);
    screed.visible = sf > 0 && sf < 1; screed.position.set(-70, 0.3, 36.7 - 9.4 * ease(sf));
    // desempenadeira
    const trOn = t > T.tro0 && t < T.tro1 + 0.6;
    trowel.visible = trOn;
    if (trOn) { const ph = win(t, T.tro0, T.tro1); const x = -74.4 + 9.4 * Math.abs(((ph * 3) % 2) - 1), z = 28.2 + 7.6 * ph; trowel.position.set(x, 0.2, z); trowel.rotation.y = ((ph * 3) % 2) < 1 ? -Math.PI / 2 : Math.PI / 2; trowel.userData.disc.rotation.y = tAbs * 14; }
    // cura (aspersão)
    const wOn = t > T.cure0 && t < T.END - 0.3;
    const m4w = new THREE.Matrix4(), vv = new THREE.Vector3();
    for (let i = 0; i < 44; i++) {
      if (!wOn) { m4w.makeScale(0, 0, 0); water.setMatrixAt(i, m4w); continue; }
      const f = (tAbs * 1.1 + i / 44) % 1, a = (i * 2.399) % (Math.PI * 2);
      const R = 0.8 + 3.4 * f; vv.set(-68.2 + Math.cos(a) * R * 0.9, 1.1 + 1.4 * Math.sin(f * Math.PI) - 1.0 * f, 32 + Math.sin(a) * R);
      m4w.makeTranslation(vv.x, Math.max(0.22, vv.y), vv.z); water.setMatrixAt(i, m4w);
    }
    water.instanceMatrix.needsUpdate = true;

    // pessoas
    walk(pA, -74, 26.0, -65, 26.0, 0.5, 0, t > T.form0 && t < T.bars1 ? 0.7 : 0.15, tAbs);
    walk(pB, -66, 38.0, -73, 38.0, 0.45, 1.9, t > T.pour0 && t < T.scr1 ? 0.5 : 0.15, tAbs);
    pC.group.position.set(-62.2, 0, 35.5); pC.group.rotation.y = -Math.PI / 2 + Math.sin(tAbs * 0.4) * 0.5; pC.upper.rotation.x = 0.05;

    anchors.sub.set(X1 - 0.04, -DEP - 0.09, 29);
    anchors.brita.set(X1, -0.3, 35);
    anchors.lona.set(X1 - 0.02, -0.19, 33);
    anchors.forma.set(X1, 0.05, SLAB.z0 - 0.04);
    anchors.arm.set(X1, 0.1, 31);
    anchors.conc.set(X1, 0.1, 29.5);
    anchors.cura.set(-68.2, 1.3, 32);
    anchors.solo.set(X1, -4, 32);
  }
  function labelVis(k, t = st.tc) {
    switch (k) {
      case 'sub': return t > T.roll1 - 0.5;
      case 'brita': return t > T.br1 + 0.2;
      case 'lona': return t > T.lona1 + 0.2 && t < T.pour0;
      case 'forma': return t > T.form1 + 0.2 && t < T.un0;
      case 'arm': return t > T.bars0 + 1.5 && t < T.pour0 + 1.5;
      case 'conc': return t > T.pour1;
      case 'cura': return t > T.cure0 + 0.5;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hidden.r = engine.scene.getObjectByName('b-radier'); if (hidden.r) hidden.r.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); if (hidden.r) hidden.r.visible = true; },
  };
}
