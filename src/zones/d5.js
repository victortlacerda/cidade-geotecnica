import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person } from './fund.js';
import { X1, PZ, SITE_BOX, vplane, bx, baseBox, depthMat, strataQuad, soilColorAt, buildSurroundings, buildCraneBucket } from './dsite.js';
import { hideDPit, showDPit } from './dpit.js';

// ---------------------------------------------------------------------------
// D5 — Cortina de estacas atirantada. Mesma cava da D1, sem escoras: tirantes inclinados
// ancorados no solo atrás da cortina, em dois níveis. Seção em x = X1, vista do oeste.
// ---------------------------------------------------------------------------
const HW = 7.5, PX = 13, R = 0.5, ZP = HW + R - 0.05, SP = 1.2, NPX = 11, NPZ = 12;
const TOP = -0.7, PLEN = 13.5, DMAX = 8;
const ALP = (20 * Math.PI) / 180, TL = 12.5, BL = 5;                 // inclinação, comprimento total e do bulbo
const LV = [
  { y0: -2.6, rig0: 22, rig1: 26, dr0: 26, dr1: 36, in0: 36, in1: 41, gr0: 41, gr1: 47, jk0: 52, jk1: 62, lock: 64, rigOut: 50, rigOutE: 54 },
  { y0: -5.8, rig0: 82, rig1: 86, dr0: 86, dr1: 92, in0: 92, in1: 95, gr0: 95, gr1: 98, jk0: 98, jk1: 101, lock: 101.5, rigOut: 102, rigOutE: 106 },
];
const WINS = [[5, 21], [66, 82], [102, 110]];
const DEP = [3.4, 3.1, 1.5];
const TC = 8, KN = 300;
const T = { END: 120, s2: 22, s3: 50, s4: 66 };
export const D5 = { box: SITE_BOX };
export const D5_STEP_STARTS = [0, T.s2, T.s3, T.s4];
export const D5_STEPS = [
  { t: 'Escavar até o 1º nível', d: 'A cortina de estacas já está pronta e ligada pela viga de coroamento. Escava-se só até cerca de 80 cm abaixo do nível do primeiro tirante, o bastante para a máquina trabalhar. Escavar mais do que isso, sem apoio, faria a cortina ceder para dentro da cava.' },
  { t: 'Perfurar e injetar o tirante', d: 'Uma perfuratriz pequena, inclinada para baixo, fura o solo atrás da cortina, passando da cunha de solo que tende a escorregar. Desce-se a barra de aço e injeta-se calda de cimento. A ponta, o bulbo, endurece no solo firme e é ela que segura o tirante; o trecho livre fica solto para poder ser esticado.' },
  { t: 'Protender o tirante', d: 'Com a calda curada, um macaco hidráulico estica o tirante contra a cabeça, apoiada na cortina. A carga sobe até o valor de projeto e é travada com a porca. A cortina passa a ser puxada para trás pelo solo firme, sem escoras atravessando a cava.' },
  { t: 'Repetir nos próximos níveis', d: 'A escavação continua nível por nível: escava, fura, injeta, protende. No fim a cava fica livre de escoras, o que facilita a entrada das máquinas e a construção da estrutura. Cada tirante é ensaiado e a cortina é monitorada durante toda a obra.' },
];
export const D5_LABELS = [
  { k: 'cortina', t: 'Cortina de estacas' },
  { k: 'livre', t: 'Trecho livre' },
  { k: 'bulbo', t: 'Bulbo (trecho ancorado)' },
  { k: 'cabeca', t: 'Cabeça do tirante' },
  { k: 'macaco', t: 'Macaco hidráulico' },
  { k: 'perfuratriz', t: 'Perfuratriz inclinada' },
  { k: 'cacamba', t: 'Caçamba içada' },
  { k: 'fundo', t: 'Fundo da escavação' },
  { k: 'predio', t: 'Prédio vizinho' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const D5_CAM = { tx: X1, ty: 2.5, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 60 };
export const D5_MCAM = { tx: X1, ty: -2, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 128 };

export function createD5(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const concM = mat(0x9a968c, { r: 0.95 });
  const capM = noclip(0xc9c5ba, { r: 1, e: 0x25231f });
  const U = { value: 0 };
  const sur = buildSurroundings(root);
  const flat = (a, b, th, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), m); o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.z = Math.max(0.001, a.distanceTo(b)); o.lookAt(b); o.renderOrder = 6; return o; };
  const setFlat = (o, a, b) => { const l = a.distanceTo(b); o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.z = Math.max(0.001, l); o.lookAt(b); };

  // ---- cava (paredes em camadas que crescem com a escavação)
  const wm = depthMat(U);
  const walls = [
    strataQuad(X1, PZ - HW, X1 + PX, PZ - HW, -DMAX - 0.3, 0.0), strataQuad(X1, PZ + HW, X1 + PX, PZ + HW, -DMAX - 0.3, 0.0), strataQuad(X1 + PX, PZ - HW, X1 + PX, PZ + HW, -DMAX - 0.3, 0.0),
  ].map((g) => { const m = new THREE.Mesh(g, wm); m.visible = false; m.receiveShadow = true; root.add(m); return m; });
  const floorM = mat(0x86683f, { r: 1, e: 0x1a1308 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(PX, 2 * HW), floorM); floor.rotation.x = -Math.PI / 2; floor.visible = false; floor.receiveShadow = true; root.add(floor);

  // ---- cortina pronta
  const piles = [];
  for (let i = 0; i < NPX; i++) piles.push({ x: X1 + SP * i, z: PZ - ZP });
  for (let i = 0; i < NPX; i++) piles.push({ x: X1 + SP * i, z: PZ + ZP });
  for (let i = 0; i < NPZ; i++) piles.push({ x: X1 + PX + R - 0.05, z: PZ - HW + 0.3 + (2 * HW - 0.6) * (i / (NPZ - 1)) });
  const pg = new THREE.CylinderGeometry(R - 0.03, R - 0.03, 1, 18); pg.translate(0, -0.5, 0);
  const pim = new THREE.InstancedMesh(pg, concM, piles.length); pim.frustumCulled = false; pim.castShadow = true; root.add(pim);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, PLEN, 1), p = new THREE.Vector3(); piles.forEach((pl, i) => { p.set(pl.x, TOP, pl.z); m4.compose(p, q, s); pim.setMatrixAt(i, m4); }); }
  [-1, 1].forEach((s) => { const m = vplane(2 * (R - 0.03), capM); m.position.set(X1 - 0.05, TOP - PLEN, PZ + s * ZP); m.scale.y = PLEN; m.renderOrder = 4; root.add(m); });
  [-1, 1].forEach((s) => {
    const g = new THREE.BoxGeometry(PX + 1.4, 0.73, 1.3); g.translate((PX + 1.4) / 2, 0.365, 0);
    const m = new THREE.Mesh(g, concM); m.position.set(X1, TOP, PZ + s * ZP); m.castShadow = true; root.add(m);
    const c = vplane(1.3, capM); c.position.set(X1 - 0.012, TOP, PZ + s * ZP); c.scale.y = 0.73; c.renderOrder = 3; root.add(c);
  });
  const bE = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.73, 2 * ZP + 1.3), concM); bE.position.set(X1 + PX + R - 0.05, TOP + 0.365, PZ); root.add(bE);

  // ---- tirantes (desenhados no plano da seção)
  const XP = X1 - 0.045;
  const holeM = noclip(0x2c2018), tendM = noclip(0x9aa8b6, { m: 0.4, r: 0.4 }), groutM = noclip(0xd8d2bf, { r: 1, e: 0x2c2a24 }), rodM = noclip(0xe9eef2, { m: 0.5, r: 0.4 });
  const headM = noclip(0x30343a), jackM = noclip(0xf2b705, { e: 0x3a2d00 }), gaugeM = noclip(0xd23b2e, { e: 0x400000 });
  const TB = [];
  LV.forEach((lv, li) => [-1, 1].forEach((s) => {
    const dz = s * Math.cos(ALP), dy = -Math.sin(ALP);
    const P = (l) => new THREE.Vector3(XP, lv.y0 + dy * l, PZ + s * HW + dz * l);
    const hole = flat(P(0), P(TL), 0.45, holeM); hole.visible = false; root.add(hole);
    const tend = flat(P(0), P(TL), 0.2, tendM); tend.visible = false; root.add(tend);
    const bulb = flat(P(TL - BL), P(TL), 0.8, groutM); bulb.visible = false; bulb.renderOrder = 5; root.add(bulb);
    const rod = flat(P(0), P(TL), 0.16, rodM); rod.visible = false; rod.renderOrder = 7; root.add(rod);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.8, 0.12), headM); head.position.copy(P(-0.05)); head.rotation.x = s * ALP * 0 + (s > 0 ? -ALP : ALP) * 0; head.visible = false; head.renderOrder = 8; root.add(head);
    const jack = flat(P(-0.2), P(-1.3), 0.42, jackM); jack.visible = false; jack.renderOrder = 8; root.add(jack);
    const gauge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.28), gaugeM); gauge.position.copy(P(-0.7)).add(new THREE.Vector3(0, 0.5, 0)); gauge.visible = false; gauge.renderOrder = 9; root.add(gauge);
    TB.push({ lv, li, s, P, hole, tend, bulb, rod, head, jack, gauge });
  }));
  const yHead = (lv) => lv.y0;

  // ---- perfuratrizes inclinadas (uma por parede)
  const dark = mat(0x3a3d42, { r: 0.6, m: 0.3 }), yel = mat(0xf2b705, { r: 0.6 });
  const rigs = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.visible = false; root.add(g);
    g.add(bx(2.6, 0.7, 2.0, dark, 0, 0.35, 0), bx(1.8, 1.0, 1.6, yel, -0.3, 1.2, 0), bx(0.9, 0.8, 1.2, mat(0x9fc4d8, { r: 0.3 }), 0.6, 1.6, 0.4));
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1), yel); mast.castShadow = true; root.add(mast); mast.visible = false;
    return { g, mast, s };
  });
  // ---- máquinas
  const exc = M.excavator(0.5); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.visible = false; root.add(excW);
  const cr = buildCraneBucket(root, { pit: [X1 + 6.2, PZ], dump: [X1 + 12.5, -16.3] });
  const truck = M.dumpTruck(0xe8b300); truck.scale.setScalar(0.9); truck.rotation.y = Math.PI; truck.visible = false; root.add(truck);
  const tfill = baseBox(3.8, 1, 2.4, mat(0x7a5a3a, { r: 1 })); tfill.position.set(2.1, 0.15, 0); tfill.visible = false; truck.userData.bed.add(tfill);
  const wA = person(0xe8742c), wB = person(0x4a8fd0), wC = person(0xf2b705, 0xffffff); [wA, wB, wC].forEach((p) => root.add(p.group));

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(D5_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const dAt = (t) => WINS.reduce((s, [a, b], i) => s + DEP[i] * ease(win(t, a, b)), 0);
  const winIdx = (t) => WINS.findIndex(([a, b]) => t >= a && t < b);
  const loadAt = (lv, t) => KN * ease(win(t, lv.jk0, lv.jk1));
  const fmt = (v, n = 1) => v.toFixed(n).replace('.', ',');
  function info(t) {
    const wi = winIdx(t), l0 = LV[0], l1 = LV[1];
    if (t < T.s2) return { step: 0, p: win(t, 0, T.s2), note: wi >= 0 ? `Escavando · ${fmt(dAt(t))} m (1º nível)` : 'Cava no 1º nível' };
    if (t < T.s3) return { step: 1, p: win(t, T.s2, T.s3), note: t < l0.dr0 ? 'Perfuratrizes chegando' : t < l0.dr1 ? 'Perfurando, inclinada para baixo' : t < l0.in1 ? 'Descendo a barra do tirante' : t < l0.gr1 ? 'Injetando calda de cimento (bulbo)' : 'Calda curando' };
    if (t < T.s4) return { step: 2, p: win(t, T.s3, T.s4), note: t < l0.jk0 ? 'Posicionando o macaco' : t < l0.jk1 ? `Protendendo · ${Math.round(loadAt(l0, t))} kN de ${KN} kN` : t < l0.lock ? 'Travando a cabeça' : 'Tirante protendido' };
    const n2 = wi >= 0 ? `Escavando · ${fmt(dAt(t))} m de ${fmt(DMAX)} m` : t < l1.dr0 ? 'Perfuratrizes de volta' : t < l1.dr1 ? 'Perfurando o 2º nível' : t < l1.gr1 ? 'Instalando e injetando o 2º tirante' : t < l1.lock ? `Protendendo · ${Math.round(loadAt(l1, t))} kN de ${KN} kN` : t < WINS[2][0] ? '2º nível protendido' : 'Cava pronta, livre de escoras';
    return { step: 3, p: win(t, T.s4, T.END), note: n2 };
  }

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;
    sur.update(tAbs);

    const d = dAt(t); U.value = d; const on = d > 0.02;
    if (on) terrainHoles[0].set(X1 - 1, X1 + PX, PZ - HW, PZ + HW); else terrainHoles[0].set(0, 0, 0, 0);
    if (on) section.setBand(0, PZ - HW, PZ + HW, -d, 0.05); else section.setBand(0, 0, 0, 0, 0);
    walls.forEach((w) => { w.visible = on; });
    floor.visible = on; floor.position.set(X1 + PX / 2, -d - 0.01, PZ); soilColorAt(-d - 0.3, floorM.color); floorM.emissive.copy(floorM.color).multiplyScalar(0.25);

    // escavadeira, guindaste, caminhão
    const eS = ease(win(t, 0.5, 4));
    excW.visible = eS > 0.01 && on; excW.scale.setScalar(Math.max(0.001, eS)); excW.position.set(X1 + 10.2, -d, PZ + 1.5); exc.update(tAbs * 1.3);
    cr.group.visible = eS > 0.01; cr.group.scale.setScalar(Math.max(0.001, eS));
    const wi = winIdx(t), act = wi >= 0;
    const e = act ? (t - WINS[wi][0]) / TC : 0;
    const cyc = cr.cycle(act ? e - Math.floor(e) : 0.14, -d);
    cr.setHook(cyc.x, cyc.y, cyc.z, cyc.fl, cyc.tl);
    { // caminhão: uma passagem por janela
      let tx = null, fillT = 0;
      WINS.forEach(([a, b], i) => {
        if (t >= a - 5 && t < b + 5) {
          tx = t < a ? X1 + 36 + (X1 + 11.8 - (X1 + 36)) * ease(win(t, a - 5, a)) : t < b ? X1 + 11.8 : X1 + 11.8 + (X1 + 3.2 - (X1 + 11.8)) * ease(win(t, b, b + 5));
          const nc = (b - a) / TC, ee = (t - a) / TC;
          fillT = t < a ? 0 : t < b ? clamp01((Math.floor(ee) + clamp01(((ee - Math.floor(ee)) - 0.88) / 0.05)) / nc) : 1;
        }
      });
      truck.visible = tx !== null && tx > X1 + 3.25; if (truck.visible) truck.position.set(tx, 0.05, -16.3);
      tfill.visible = fillT > 0.02; tfill.scale.y = Math.max(0.01, 1.1 * fillT);
    }

    // tirantes
    let rigAct = [false, false], jackOn = null;
    TB.forEach((b, i) => {
      const { lv } = b;
      const drill = ease(win(t, lv.dr0, lv.dr1)), ins = ease(win(t, lv.in0, lv.in1)), gr = ease(win(t, lv.gr0, lv.gr1));
      const L = TL * drill;
      b.hole.visible = drill > 0.01 && gr < 0.999;
      if (b.hole.visible) { setFlat(b.hole, b.P(0), b.P(L)); }
      b.rod.visible = drill > 0.01 && drill < 0.999 || (t > lv.dr1 - 0.1 && t < lv.in0 + 0.5 && drill > 0.9 && false);
      if (drill > 0.01 && drill < 0.999) setFlat(b.rod, b.P(0), b.P(L));
      b.tend.visible = ins > 0.01; if (b.tend.visible) setFlat(b.tend, b.P(0), b.P(TL * ins));
      b.bulb.visible = gr > 0.01; if (b.bulb.visible) { const Lb = BL * gr; setFlat(b.bulb, b.P(TL - Lb), b.P(TL)); }
      // livre cinza e bulbo curando
      groutM.color.set(0xb9b2a0).lerp(new THREE.Color(0xe2ddcc), clamp01((t - lv.gr1) / 6));
      // tensão
      const ld = loadAt(lv, t) / KN, afterLock = t >= lv.lock;
      b.tend.material = tendM;
      const showHead = t > lv.in0 + 1;
      b.head.visible = showHead;
      const jk = t >= lv.jk0 - 1.5 && t < lv.lock + 1.5;
      b.jack.visible = jk; b.gauge.visible = jk;
      if (jk) { const sh = ease(win(t, lv.jk0 - 1.5, lv.jk0)) * (1 - ease(win(t, lv.lock, lv.lock + 1.5))); const bb = b.P(-0.2 - 1.1 * sh); setFlat(b.jack, b.P(-0.2), bb); b.jack.scale.y = Math.max(0.01, sh); b.gauge.scale.y = 0.5 + 1.2 * ld; gaugeM.color.set(0xd23b2e).lerp(new THREE.Color(0x56c26b), afterLock ? 1 : 0); jackOn = b; }
      // perfuratriz desta parede (dois tirantes por parede; um por nível)
      if (t >= lv.rig0 && t < lv.rigOutE + 0) { }
    });
    // cor da barra: aço -> alaranjado sob carga
    tendM.color.set(0x9aa8b6);
    const maxLd = Math.max(loadAt(LV[0], t), loadAt(LV[1], t)) / KN;
    void maxLd;
    // perfuratrizes
    rigs.forEach((rg, ri) => {
      const s = rg.s;
      let lvI = -1;
      LV.forEach((lv, li) => { if (t >= lv.rig0 && t < lv.rigOutE) lvI = li; });
      const lv = LV[Math.max(0, lvI)];
      const ein = lvI < 0 ? 0 : ease(win(t, lv.rig0, lv.rig1)) * (1 - ease(win(t, lv.rigOut, lv.rigOutE)));
      rg.g.visible = ein > 0.01; rg.mast.visible = rg.g.visible;
      if (!rg.g.visible) return;
      const yFloor = -d;
      rg.g.scale.setScalar(Math.max(0.001, ein));
      rg.g.position.set(X1 + 2.6, yFloor, PZ + s * (HW - 4.9)); rg.g.rotation.y = s > 0 ? -Math.PI / 2 * 0 + Math.PI / 2 : -Math.PI / 2;
      // mastro: da cabeça do furo para trás, na direção do furo
      const head = new THREE.Vector3(X1 + 2.6, lv.y0, PZ + s * HW), dirB = new THREE.Vector3(0, Math.sin(ALP), -s * Math.cos(ALP));
      const a = head.clone().addScaledVector(dirB, 0.4 + 4.2), b = head.clone().addScaledVector(dirB, -0.4);
      rg.mast.position.copy(a).add(b).multiplyScalar(0.5); rg.mast.scale.set(1, 1, a.distanceTo(b)); rg.mast.lookAt(b);
    });

    // pessoas
    const pw = (p, xa, xb, z, sp, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp + ph); p.group.position.set(xa + (xb - xa) * u, 0.07, z); p.group.rotation.y = Math.cos(tAbs * sp + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = 0.1; };
    pw(wA, X1 + 2, X1 + 8, -17.4, 0.4, 0); pw(wB, X1 + 15, X1 + 20, -15.2, 0.35, 2); pw(wC, X1 + 22, X1 + 28, -17.0, 0.3, 4);

    // âncoras
    const a = anchors, pf = X1 - 0.06;
    const l0 = LV[0], lvA = t >= LV[1].dr0 ? LV[1] : l0;
    a.cortina.set(pf, -8.5, PZ - ZP);
    a.livre.set(XP, l0.y0 - Math.sin(ALP) * 3.5, PZ - HW - Math.cos(ALP) * 3.5);
    a.bulbo.set(XP, l0.y0 - Math.sin(ALP) * 10, PZ - HW - Math.cos(ALP) * 10);
    a.cabeca.set(XP, l0.y0, PZ + HW);
    a.macaco.set(XP, l0.y0 + 0.4, PZ + HW + 1.3);
    a.perfuratriz.set(X1 + 2.6, lvA.y0 + 2.6, PZ + HW - 3.4);
    a.cacamba.set(cyc.x, cyc.y - 0.6, cyc.z);
    a.fundo.set(X1 + 0.5, -d, PZ - 3);
    a.predio.set(pf, 9.5, -46);
    a.solo.set(X1, -15, PZ);
  }
  function labelVis(kx, t = st.tc) {
    switch (kx) {
      case 'cortina': return true;
      case 'livre': return t > LV[0].in0 + 2;
      case 'bulbo': return t > LV[0].gr0 + 1;
      case 'cabeca': return t > LV[0].jk1;
      case 'macaco': return t > LV[0].jk0 - 0.5 && t < LV[0].lock + 1.5;
      case 'perfuratriz': return t > LV[0].rig1 && t < LV[0].dr1;
      case 'cacamba': return winIdx(t) >= 0 && t > 6;
      case 'fundo': return t > WINS[2][1] - 2;
      case 'predio': return true;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hideDPit(engine); },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); showDPit(engine); },
  };
}
