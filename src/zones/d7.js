import * as THREE from 'three';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip } from './fund.js';
import { X1, PZ, SITE_BOX, vplane, bx, buildSurroundings } from './dsite.js';
import { createPitKit } from './dkit.js';
import { hideDPit, showDPit } from './dpit.js';

// ---------------------------------------------------------------------------
// D7 — Solo grampeado. Cava de 6 m escavada em 4 trechos de 1,5 m, de cima para baixo.
// Em cada trecho: escavar, furar, instalar o grampo com calda, projetar concreto. Seção em x = X1.
// ---------------------------------------------------------------------------
const HW = 7.5, PX = 13, LIFT = 1.5, NLIFT = 4, NL = 6.0, ALP = (15 * Math.PI) / 180, DMAX = LIFT * NLIFT;
const aK = (k) => 6 + 27 * k;
const L = (k) => { const a = aK(k); return { dig: [a, a + 8], rigIn: [a + 8, a + 11], drill: [a + 11, a + 17], inst: [a + 17, a + 21], rigOut: [a + 19, a + 22], shot: [a + 21, a + 27], y0: -1.1 - LIFT * k }; };
const LV = Array.from({ length: NLIFT }, (_, k) => L(k));
const T = { END: LV[NLIFT - 1].shot[1] + 10, s2: LV[0].rigIn[1] - 1, s3: LV[0].shot[0], s4: aK(1) };
export const D7 = { box: SITE_BOX };
export const D7_STEP_STARTS = [0, T.s2, T.s3, T.s4];
export const D7_STEPS = [
  { t: 'Escavar o primeiro trecho', d: 'A escavação é feita de cima para baixo, em trechos de cerca de 1,5 m. Escava-se só o primeiro trecho: o solo precisa ter coesão para ficar em pé por algumas horas, sem apoio. Não se escava o trecho seguinte antes de reforçar esse.' },
  { t: 'Furar e instalar os grampos', d: 'Uma perfuratriz pequena faz furos inclinados para baixo, alguns graus abaixo da horizontal. Em cada furo desce uma barra de aço, e o furo é preenchido com calda de cimento. O grampo costura o solo para dentro do maciço e é passivo: só trabalha quando o solo tenta se mover.' },
  { t: 'Projetar o concreto', d: 'A face é coberta com concreto projetado (jateado) sobre uma tela de aço, que prende as cabeças dos grampos e evita que o solo da face desprenda. A camada é fina e flexível; ela não é o que segura o solo, os grampos é que seguram.' },
  { t: 'Repetir de cima para baixo', d: 'O ciclo se repete trecho a trecho até a cota final: escava, fura, grampeia, projeta. O solo reforçado se comporta como um bloco, quase como um muro de gravidade, ao lado do prédio vizinho, sem necessidade de cortina, escoras ou muita máquina.' },
];
export const D7_LABELS = [
  { k: 'grampo', t: 'Grampo (barra de aço)' },
  { k: 'calda', t: 'Calda de cimento' },
  { k: 'proj', t: 'Concreto projetado' },
  { k: 'cabeca', t: 'Cabeça do grampo' },
  { k: 'perf', t: 'Perfuratriz' },
  { k: 'cacamba', t: 'Caçamba içada' },
  { k: 'predio', t: 'Prédio vizinho' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const D7_CAM = { tx: X1, ty: 3, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 52 };
export const D7_MCAM = { tx: X1, ty: -1, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 118 };

export function createD7(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const sur = buildSurroundings(root);
  const kit = createPitKit(root, section, { HW, PX, dmax: DMAX, wins: LV.map((l) => l.dig), deps: LV.map(() => LIFT), levels: [], exc: [0, 4], crane: [0, 4] });
  const XP = X1 - 0.045;
  const flat = (a, b, th, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), m); o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.z = Math.max(0.001, a.distanceTo(b)); o.lookAt(b); o.renderOrder = 6; return o; };
  const setFlat = (o, a, b) => { o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.z = Math.max(0.001, a.distanceTo(b)); o.lookAt(b); };
  const holeM = noclip(0x2c2018), groutM = noclip(0xd8d2bf, { r: 1, e: 0x2c2a24 }), barM = noclip(0x6f7a86, { m: 0.4, r: 0.4 }), rodM = noclip(0xe9eef2, { m: 0.5 }), headM = noclip(0x30343a);
  const NB = [];
  LV.forEach((lv, k) => [-1, 1].forEach((s) => {
    const dz = s * Math.cos(ALP), dy = -Math.sin(ALP), P = (l) => new THREE.Vector3(XP, lv.y0 + dy * l, PZ + s * HW + dz * l);
    const hole = flat(P(0), P(NL), 0.34, holeM), grout = flat(P(0), P(NL), 0.34, groutM), bar = flat(P(0), P(NL), 0.14, barM), rod = flat(P(0), P(NL), 0.12, rodM);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.1), headM); head.position.copy(P(-0.03)); head.renderOrder = 8;
    [hole, grout, bar, rod, head].forEach((o) => { o.visible = false; root.add(o); });
    NB.push({ lv, k, s, P, hole, grout, bar, rod, head });
  }));
  // concreto projetado: faces norte, sul e leste + faixa no plano do corte
  const shM = mat(0xbdbab0, { r: 1 }), shCapM = noclip(0xcfccc2, { r: 1, e: 0x2a2924 });
  const boxTop = (sx, sz, x, z) => { const g = new THREE.BoxGeometry(sx, 1, sz); g.translate(0, -0.5, 0); const m = new THREE.Mesh(g, shM); m.position.set(x, 0, z); m.castShadow = true; m.visible = false; root.add(m); return m; };
  const covers = [boxTop(PX, 0.14, X1 + PX / 2, PZ - HW + 0.07), boxTop(0.14, 2 * HW, X1 + PX - 0.07, PZ), boxTop(PX, 0.14, X1 + PX / 2, PZ + HW - 0.07)];
  const shCaps = [-1, 1].map((s) => { const m = vplane(0.14, shCapM); m.position.set(X1 - 0.03, 0, PZ + s * (HW - 0.07)); m.renderOrder = 5; m.visible = false; root.add(m); return m; });
  const spray = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 5, 4), shM, 36); spray.frustumCulled = false; spray.visible = false; root.add(spray);
  const nozzles = [0, 1, 2].map(() => { const o = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.6), mat(0x3a3d42, { r: 0.5 })); o.visible = false; root.add(o); return o; });
  // perfuratrizes pequenas (uma por parede)
  const dark = mat(0x3a3d42, { r: 0.6, m: 0.3 }), yel = mat(0xf2b705, { r: 0.6 });
  const rigs = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.visible = false; root.add(g);
    g.add(bx(2.6, 0.7, 2.0, dark, 0, 0.35, 0), bx(1.8, 1.0, 1.6, yel, -0.3, 1.2, 0), bx(0.9, 0.8, 1.2, mat(0x9fc4d8, { r: 0.3 }), 0.6, 1.6, 0.4));
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1), yel); mast.castShadow = true; mast.visible = false; root.add(mast);
    return { g, mast, s };
  });
  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(D7_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const m4 = new THREE.Matrix4(), vp = new THREE.Vector3();
  const fmt = (x) => x.toFixed(1).replace('.', ',');
  const inR = (t, r) => t >= r[0] && t < r[1];
  function info(t, d) {
    let k = 0; LV.forEach((lv, i) => { if (t >= lv.dig[0] - 1) k = i; });
    const lv = LV[k], n = `trecho ${k + 1} de ${NLIFT}`;
    const note = t < LV[0].dig[0] ? 'Escavadeira e guindaste chegando' : inR(t, lv.dig) || t < lv.dig[1] ? `Escavando o ${n} · ${fmt(d)} m de ${fmt(DMAX)} m` : t < lv.drill[0] ? 'Perfuratrizes chegando' : t < lv.drill[1] ? `Furando o ${n}` : t < lv.inst[1] ? 'Instalando as barras e injetando calda' : t < lv.shot[0] ? 'Aguardando a calda' : t < lv.shot[1] ? `Projetando concreto · ${n}` : k === NLIFT - 1 ? 'Cava grampeada pronta' : 'Concreto curando';
    const step = t < T.s2 ? 0 : t < T.s3 ? 1 : t < T.s4 ? 2 : 3;
    return { step, p: step === 0 ? win(t, 0, T.s2) : step === 1 ? win(t, T.s2, T.s3) : step === 2 ? win(t, T.s3, T.s4) : win(t, T.s4, T.END), note };
  }
  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc;
    sur.update(tAbs);
    const kr = kit.update(t, tAbs), d = kr.d;
    const inf = info(t, d); st.step = inf.step; st.progress = inf.p; st.note = inf.note;
    // grampos
    NB.forEach((b) => {
      const { lv } = b, dr = ease(win(t, lv.drill[0], lv.drill[1])), ins = ease(win(t, lv.inst[0], lv.inst[1]));
      b.hole.visible = dr > 0.01 && ins < 0.999; if (b.hole.visible) setFlat(b.hole, b.P(0), b.P(NL * dr));
      b.rod.visible = dr > 0.01 && dr < 0.999; if (b.rod.visible) setFlat(b.rod, b.P(0), b.P(NL * dr));
      b.bar.visible = ins > 0.01; if (b.bar.visible) setFlat(b.bar, b.P(0), b.P(NL * clamp01(ins * 1.6)));
      b.grout.visible = ins > 0.4; if (b.grout.visible) setFlat(b.grout, b.P(0), b.P(NL * ease((ins - 0.4) / 0.6)));
      b.head.visible = ins > 0.9 || t > lv.inst[1];
    });
    // concreto projetado
    let h = 0, front = null;
    LV.forEach((lv, i) => { const u = ease(win(t, lv.shot[0], lv.shot[1])); h += LIFT * u; if (inR(t, lv.shot)) front = { y: -(LIFT * i + LIFT * u) }; });
    covers.forEach((c) => { c.visible = h > 0.01; c.scale.y = Math.max(0.001, h); });
    shCaps.forEach((c) => { c.visible = h > 0.01; c.scale.y = Math.max(0.001, h); c.position.y = -h; });
    spray.visible = !!front; nozzles.forEach((n) => { n.visible = !!front; });
    if (front) {
      const y = front.y;
      for (let i = 0; i < 36; i++) {
        const w = i % 3, f = (tAbs * 1.7 + i / 36) % 1, a = ((i * 7) % 13) / 13; let x, z;
        if (w === 1) { x = X1 + PX - 0.1 - 0.9 * (1 - f); z = PZ - HW + 0.5 + (2 * HW - 1) * a; } else { x = X1 + 0.8 + (PX - 1.6) * a; z = w === 0 ? PZ - HW + 0.1 + 0.9 * (1 - f) : PZ + HW - 0.1 - 0.9 * (1 - f); }
        vp.set(x, y + 0.5 * Math.sin(i * 1.3), z); m4.makeTranslation(vp.x, vp.y, vp.z); spray.setMatrixAt(i, m4);
      }
      spray.instanceMatrix.needsUpdate = true;
      nozzles.forEach((n, w) => {
        const sw = Math.sin(tAbs * 0.9 + w) * 0.5 + 0.5;
        const base = w === 1 ? new THREE.Vector3(X1 + PX - 2.4, y + 0.2, PZ - 4 + 8 * sw) : new THREE.Vector3(X1 + 1 + (PX - 2) * sw, y + 0.2, w === 0 ? PZ - HW + 2.4 : PZ + HW - 2.4);
        const tip = w === 1 ? new THREE.Vector3(X1 + PX - 0.3, y, base.z) : new THREE.Vector3(base.x, y, w === 0 ? PZ - HW + 0.3 : PZ + HW - 0.3);
        n.position.copy(base).add(tip).multiplyScalar(0.5); n.scale.z = Math.max(0.01, base.distanceTo(tip) / 1.6); n.lookAt(tip);
      });
    }
    // perfuratrizes
    let curLv = LV[0], rigE = 0;
    LV.forEach((lv) => { const e = ease(win(t, lv.rigIn[0], lv.rigIn[1])) * (1 - ease(win(t, lv.rigOut[0], lv.rigOut[1]))); if (e > rigE || t >= lv.rigIn[0] - 0.01 && t < lv.rigOut[1]) { rigE = e; curLv = lv; } });
    rigs.forEach((rg) => {
      const s = rg.s; rg.g.visible = rg.mast.visible = rigE > 0.01; if (!rg.g.visible) return;
      rg.g.scale.setScalar(Math.max(0.001, rigE)); rg.g.position.set(X1 + 2.6, -d, PZ + s * (HW - 4.9)); rg.g.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      const head = new THREE.Vector3(X1 + 2.6, curLv.y0, PZ + s * HW), dirB = new THREE.Vector3(0, Math.sin(ALP), -s * Math.cos(ALP));
      const a = head.clone().addScaledVector(dirB, 4.6), b = head.clone().addScaledVector(dirB, -0.4);
      rg.mast.position.copy(a).add(b).multiplyScalar(0.5); rg.mast.scale.set(1, 1, a.distanceTo(b)); rg.mast.lookAt(b);
    });
    const A = anchors, pf = X1 - 0.06, lv0 = LV[0];
    A.grampo.set(XP, lv0.y0 - 1.0, PZ - HW - 3.0); A.calda.set(XP, LV[1].y0 - 1.6, PZ + HW + 3.6); A.proj.set(pf, -1.0, PZ - HW + 0.07); A.cabeca.set(XP, LV[2].y0, PZ + HW);
    A.perf.set(X1 + 2.6, curLv.y0 + 2.6, PZ + HW - 3.4);
    A.cacamba.set(kr.cyc.x, kr.cyc.y - 0.6, kr.cyc.z); A.predio.set(pf, 9.5, -46); A.solo.set(X1, -15, PZ);
  }
  function labelVis(kx, t = st.tc) {
    switch (kx) {
      case 'grampo': return t > LV[0].inst[0] + 2;
      case 'calda': return t > LV[1].inst[0] + 2;
      case 'proj': return t > LV[0].shot[0] + 2;
      case 'cabeca': return t > LV[2].inst[1];
      case 'perf': return t > LV[0].drill[0] && t < LV[0].rigOut[0];
      case 'cacamba': return kit.winIdx(t) >= 0 && t > 4;
      case 'predio': return t > 2;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hideDPit(engine); },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); showDPit(engine); },
  };
}
