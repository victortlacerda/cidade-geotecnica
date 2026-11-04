import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person } from './fund.js';
import { X1, PZ, SITE_BOX, vplane, bx, baseBox, depthMat, strataQuad, soilColorAt, buildSurroundings, buildCraneBucket } from './dsite.js';
import { hideDPit, showDPit } from './dpit.js';

// ---------------------------------------------------------------------------
// D1 — Escavação urbana com cortina de estacas escorada (2 níveis de escoras).
// Seção em x = X1 (81) pelo meio da cava, vista do oeste. Escala exagerada (estacas de 1 m).
// ---------------------------------------------------------------------------
const HW = 7.5, PX = 13, R = 0.5, ZP = HW + R - 0.05, SP = 1.2, NPX = 11, NPZ = 12;
const TOP = -0.7, PLEN = 13.5, DMAX = 8, D1L = 4.7, SL1 = -0.35, SL2 = -4.2;
const T = { p0: 2, dt: 0.7, dur: 0.9, gap: 2, beam0: 31, beam1: 37, pre0: 36, pre1: 42, st1a: 42, st1b: 47.5, exIn: 32, exInE: 36, crIn: 44, crInE: 48, w1a: 48, w1b: 72, wal0: 72, wal1: 78, st2a: 78, st2b: 86, w2a: 88, w2b: 112, END: 124, s2: 31, s3: 48, s4: 88 };
const TC = 8;
export const D1 = { box: SITE_BOX };
export const D1_STEP_STARTS = [0, T.s2, T.s3, T.s4];
export const D1_STEPS = [
  { t: 'Executar a cortina de estacas', d: 'Antes de escavar, uma perfuratriz executa as estacas de concreto em volta da futura cava, uma ao lado da outra, de fora para dentro do terreno que vai ser retirado. Elas descem bem abaixo do fundo final da escavação: essa parte enterrada (a ficha) é o que segura a cortina embaixo.' },
  { t: 'Viga de coroamento e 1ª escora', d: 'As cabeças das estacas são ligadas por uma viga de concreto armado, a viga de coroamento, que faz as estacas trabalharem juntas. Em seguida, escoras de aço atravessam a cava de um lado a outro, travando a cortina no topo antes de a escavação começar.' },
  { t: 'Escavar e instalar a 2ª escora', d: 'A escavadeira abre o primeiro trecho e uma caçamba içada pelo guindaste leva o solo para os caminhões. Ao chegar ao nível do segundo apoio, escava-se um pouco abaixo dele e se instalam a longarina e as escoras. A cada etapa, a cortina é escorada antes de a escavação continuar.' },
  { t: 'Escavar até o fundo', d: 'Com a cortina travada em dois níveis, a escavação segue até a cota final, a poucos metros do prédio vizinho. O fundo é regularizado e fica pronto para a fundação do novo edifício. A cortina e as escoras seguram o empuxo do solo e protegem a rua e o prédio ao lado.' },
];
export const D1_LABELS = [
  { k: 'estacas', t: 'Cortina de estacas' },
  { k: 'ficha', t: 'Ficha (parte enterrada)' },
  { k: 'viga', t: 'Viga de coroamento' },
  { k: 'escora1', t: 'Escora (1º nível)' },
  { k: 'escora2', t: 'Escora e longarina (2º nível)' },
  { k: 'cacamba', t: 'Caçamba içada' },
  { k: 'fundo', t: 'Fundo da escavação' },
  { k: 'predio', t: 'Prédio vizinho' },
  { k: 'sapata', t: 'Fundação do vizinho' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const D1_CAM = { tx: X1, ty: 2.5, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 60 };
export const D1_MCAM = { tx: X1, ty: -2, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 128 };

export function createD1(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const dark = mat(0x3a3d42, { r: 0.6, m: 0.3 });
  const concM = mat(0x9a968c, { r: 0.95 });
  const capM = noclip(0xc9c5ba, { r: 1, e: 0x25231f });
  const steelM = mat(0xd9772b, { r: 0.55, m: 0.3 });
  const walM = mat(0x4a5a6a, { r: 0.55, m: 0.3 });
  const U = { value: 0 };
  const sur = buildSurroundings(root);

  // ------------------------------------------------------------ paredes e fundo da cava
  const wm = depthMat(U);
  const walls = [
    strataQuad(X1, PZ - HW, X1 + PX, PZ - HW, -DMAX - 0.3, 0.0), strataQuad(X1, PZ + HW, X1 + PX, PZ + HW, -DMAX - 0.3, 0.0), strataQuad(X1 + PX, PZ - HW, X1 + PX, PZ + HW, -DMAX - 0.3, 0.0),
  ].map((g) => { const m = new THREE.Mesh(g, wm); m.visible = false; m.receiveShadow = true; root.add(m); return m; });
  const floorM = mat(0x86683f, { r: 1, e: 0x1a1308 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(PX, 2 * HW), floorM); floor.rotation.x = -Math.PI / 2; floor.position.set(X1 + PX / 2, -0.01, PZ); floor.visible = false; floor.receiveShadow = true; root.add(floor);

  // ------------------------------------------------------------ estacas (instanciadas)
  const piles = [];
  for (let i = 0; i < NPX; i++) piles.push({ x: X1 + SP * i, z: PZ - ZP, w: 0 });
  for (let i = 0; i < NPX; i++) piles.push({ x: X1 + SP * i, z: PZ + ZP, w: 1 });
  for (let i = 0; i < NPZ; i++) piles.push({ x: X1 + PX + R - 0.05, z: PZ - HW + 0.3 + (2 * HW - 0.6) * (i / (NPZ - 1)), w: 2 });
  const NP = piles.length;
  const ts = []; { let t = T.p0; piles.forEach((p, k) => { if (k > 0 && p.w !== piles[k - 1].w) t += T.gap; ts.push(t); t += T.dt; }); }
  const pg = new THREE.CylinderGeometry(R - 0.03, R - 0.03, 1, 18); pg.translate(0, -0.5, 0);
  const pim = new THREE.InstancedMesh(pg, concM, NP); pim.frustumCulled = false; pim.castShadow = true; root.add(pim);
  // faces cortadas das duas estacas da seção
  const cuts = [-1, 1].map((s) => { const m = vplane(2 * (R - 0.03), capM); m.position.set(X1 - 0.05, TOP - PLEN, PZ + s * ZP); m.scale.y = 0.001; m.renderOrder = 4; root.add(m); return m; });
  // viga de coroamento
  const beamG = (len) => { const g = new THREE.BoxGeometry(len, 0.73, 1.3); g.translate(len / 2, 0.365, 0); return g; };
  const beamBody = (z) => { const m = new THREE.Mesh(beamG(PX + 1.4), concM); m.position.set(X1, TOP, z); m.castShadow = true; m.visible = false; root.add(m); return m; };
  const beams = [beamBody(PZ - ZP), beamBody(PZ + ZP)];
  const beamE = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.73, 2 * ZP + 1.3), concM); beamE.position.set(X1 + PX + R - 0.05, TOP + 0.365, PZ); beamE.visible = false; root.add(beamE);
  const beamCaps = [-1, 1].map((s) => { const m = vplane(1.3, capM); m.position.set(X1 - 0.012, TOP, PZ + s * ZP); m.scale.y = 0.73; m.visible = false; m.renderOrder = 3; root.add(m); return m; });

  // ------------------------------------------------------------ escoras
  const ROWS = [0.5, 4.3, 8.1, 11.9].map((d) => X1 + d);
  const strutG = (len) => { const g = new THREE.BoxGeometry(0.45, 0.45, len); g.translate(0, 0, len / 2); return g; };
  const mkStruts = (y, inset) => ROWS.map((x) => { const len = 2 * (HW - inset); const m = new THREE.Mesh(strutG(len), steelM); m.position.set(x, y, PZ - HW + inset); m.castShadow = true; m.visible = false; root.add(m); return m; });
  const struts1 = mkStruts(SL1, 0.2), struts2 = mkStruts(SL2, 0.55);
  const walG = new THREE.BoxGeometry(PX, 0.5, 0.5); walG.translate(PX / 2, 0, 0);
  const wal2 = [-1, 1].map((s) => { const m = new THREE.Mesh(walG, walM); m.position.set(X1, SL2, PZ + s * (HW - 0.3)); m.castShadow = true; m.visible = false; root.add(m); return m; });

  // ------------------------------------------------------------ máquinas e pessoas
  const exc = M.excavator(0.5); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.visible = false; root.add(excW);
  const cr = buildCraneBucket(root, { pit: [X1 + 6.2, PZ], dump: [X1 + 12.5, -16.3] });
  const truck = M.dumpTruck(0xe8b300); truck.scale.setScalar(0.9); truck.rotation.y = Math.PI; truck.visible = false; root.add(truck);
  const tfill = baseBox(3.8, 1, 2.4, mat(0x7a5a3a, { r: 1 })); tfill.position.set(2.1, 0.15, 0); tfill.visible = false; truck.userData.bed.add(tfill);
  const wA = person(0xe8742c), wB = person(0x4a8fd0), wC = person(0xf2b705, 0xffffff); [wA, wB, wC].forEach((p) => root.add(p.group));
  const rig = M.pilingRig(); rig.group.scale.setScalar(0.6); rig.group.visible = false; root.add(rig.group);

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(D1_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), vs = new THREE.Vector3(), vp = new THREE.Vector3();
  const dAt = (t) => 1.0 * ease(win(t, T.pre0, T.pre1)) + (D1L - 1.0) * ease(win(t, T.w1a, T.w1b)) + (DMAX - D1L) * ease(win(t, T.w2a, T.w2b));
  const inW1 = (t) => t >= T.w1a && t < T.w1b, inW2 = (t) => t >= T.w2a && t < T.w2b;
  function info(t) {
    if (t < T.s2) return { step: 0, p: win(t, 0, T.s2), note: t < ts[0] ? 'Perfuratriz chegando' : `Executando estacas · ${Math.min(NP, Math.max(0, ts.filter((x) => x < t).length))} de ${NP}` };
    if (t < T.s3) return { step: 1, p: win(t, T.s2, T.s3), note: t < T.beam1 ? 'Concretando a viga de coroamento' : t < T.pre1 ? 'Escavadeira abre o 1º trecho' : t < T.st1b ? 'Instalando as escoras do 1º nível' : 'Guindaste chegando' };
    if (t < T.s4) return { step: 2, p: win(t, T.s3, T.s4), note: inW1(t) ? `Escavando · ${dAt(t).toFixed(1).replace('.', ',')} m de ${DMAX.toFixed(1).replace('.', ',')} m` : t < T.wal1 ? 'Instalando a longarina do 2º nível' : t < T.st2a + 8 && t >= T.st2a ? 'Instalando as escoras do 2º nível' : 'Escoras do 2º nível travadas' };
    return { step: 3, p: win(t, T.s4, T.END), note: inW2(t) ? `Escavando · ${dAt(t).toFixed(1).replace('.', ',')} m de ${DMAX.toFixed(1).replace('.', ',')} m` : t < T.w2b + 4 ? 'Regularizando o fundo' : 'Cava pronta para a fundação' };
  }

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;
    sur.update(tAbs);

    // ---- cava
    const d = dAt(t); U.value = d;
    const on = d > 0.02;
    if (on) terrainHoles[0].set(X1 - 1, X1 + PX, PZ - HW, PZ + HW); else terrainHoles[0].set(0, 0, 0, 0);
    if (on) section.setBand(0, PZ - HW, PZ + HW, -d, 0.05); else section.setBand(0, 0, 0, 0, 0);
    walls.forEach((w) => { w.visible = on; });
    floor.visible = on; floor.position.y = -d - 0.01; soilColorAt(-d - 0.3, floorM.color);
    floorM.emissive.copy(floorM.color).multiplyScalar(0.25);

    // ---- estacas
    for (let i = 0; i < NP; i++) {
      const p = piles[i], u = ease(win(t, ts[i], ts[i] + T.dur));
      vs.set(1, Math.max(0.0001, PLEN * u), 1); vp.set(p.x, TOP, p.z); m4.compose(vp, q0, vs); pim.setMatrixAt(i, m4);
    }
    pim.instanceMatrix.needsUpdate = true;
    cuts.forEach((c, s) => { const u = ease(win(t, ts[s * NPX], ts[s * NPX] + T.dur)); c.visible = u > 0.01; c.scale.y = Math.max(0.001, PLEN * u); c.position.y = TOP - PLEN * u; });
    // ---- perfuratriz
    {
      const tv = (i) => (i === 0 || piles[i].w !== piles[i - 1].w ? 1.9 : 0.3);
      let kk = 0; for (let i = 0; i < NP; i++) if (ts[i] - tv(i) <= t) kk = i;
      const face = (w) => (w === 0 ? Math.PI / 2 : w === 1 ? -Math.PI / 2 : 0);
      const pos = (i) => { const p = piles[i], th = face(p.w); return [p.x - Math.cos(th) * 1.92, p.z + Math.sin(th) * 1.92, th]; };
      const a = kk === 0 ? [X1 + 14, piles[0].z + 1.92, face(0)] : pos(kk - 1), b = pos(kk), e = ease((t - (ts[kk] - tv(kk))) / tv(kk));
      rig.group.visible = t < T.beam0 - 0.5;
      rig.group.position.set(a[0] + (b[0] - a[0]) * e, 0, a[1] + (b[1] - a[1]) * e); rig.group.rotation.y = a[2] + (b[2] - a[2]) * e;
      rig.update(tAbs * 1.6);
    }
    // ---- viga e escoras
    const bm = ease(win(t, T.beam0, T.beam1));
    beams.forEach((m) => { m.visible = bm > 0.01; m.scale.x = Math.max(0.001, bm); });
    beamE.visible = bm > 0.5; beamE.scale.y = Math.max(0.001, ease((bm - 0.5) * 2));
    beamCaps.forEach((c) => { c.visible = bm > 0.3; });
    const n1 = ROWS.length;
    struts1.forEach((m, i) => { const u = ease(win(t, T.st1a + (i * (T.st1b - T.st1a - 2)) / n1, T.st1a + 2 + (i * (T.st1b - T.st1a - 2)) / n1)); m.visible = u > 0.01; m.scale.z = Math.max(0.001, u); });
    wal2.forEach((m) => { const u = ease(win(t, T.wal0, T.wal1)); m.visible = u > 0.01; m.scale.x = Math.max(0.001, u); });
    struts2.forEach((m, i) => { const u = ease(win(t, T.st2a + (i * (T.st2b - T.st2a - 2)) / n1, T.st2a + 2 + (i * (T.st2b - T.st2a - 2)) / n1)); m.visible = u > 0.01; m.scale.z = Math.max(0.001, u); });

    // ---- escavadeira, guindaste, caminhão
    const eS = ease(win(t, T.exIn, T.exInE));
    excW.visible = eS > 0.01 && on; excW.scale.setScalar(Math.max(0.001, eS)); excW.position.set(X1 + 10.2, -d, PZ + 1.5); exc.update(tAbs * 1.3);
    const cS = ease(win(t, T.crIn, T.crInE));
    cr.group.visible = cS > 0.01; cr.group.scale.setScalar(Math.max(0.001, cS)); 
    const w0 = inW1(t) ? T.w1a : inW2(t) ? T.w2a : t >= T.w1b && t < T.w2a ? -1 : null;
    const act = inW1(t) || inW2(t);
    const e = act ? (t - w0) / TC : 0;
    const cyc = cr.cycle(act ? e - Math.floor(e) : 0.14, -d);
    cr.setHook(cyc.x, cyc.y, cyc.z, cyc.fl, cyc.tl);
    // caminhão: 2 passagens (uma por janela de escavação)
    const pass = (a0, a1, b0, b1) => (t < a0 ? null : t < a1 ? (X1 + 36) + (X1 + 11.8 - (X1 + 36)) * ease(win(t, a0, a1)) : t < b0 ? X1 + 11.8 : X1 + 11.8 + (X1 + 3.2 - (X1 + 11.8)) * ease(win(t, b0, b1)));
    let tx = pass(T.w1a - 5, T.w1a, T.w1b, T.w1b + 5), fillT = 0;
    if (t >= T.w1b + 5) tx = null;
    if (t >= T.w2a - 5) { tx = pass(T.w2a - 5, T.w2a, T.w2b, T.w2b + 5); }
    if (t < T.w2a - 5) fillT = clamp01(inW1(t) ? (Math.floor(e) + clamp01(((e - Math.floor(e)) - 0.88) / 0.05)) / 3 : t >= T.w1b ? 1 : 0);
    else fillT = clamp01(inW2(t) ? (Math.floor(e) + clamp01(((e - Math.floor(e)) - 0.88) / 0.05)) / 3 : t >= T.w2b ? 1 : 0);
    truck.visible = tx !== null && tx > X1 + 3.25;
    if (truck.visible) { truck.position.set(tx, 0.05, -16.3); }
    tfill.visible = fillT > 0.02; tfill.scale.y = Math.max(0.01, 1.1 * fillT);
    truck.userData.bed.rotation.z = 0;
    // pessoas
    const pw = (p, xa, xb, z, sp, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp + ph); p.group.position.set(xa + (xb - xa) * u, 0.07, z); p.group.rotation.y = Math.cos(tAbs * sp + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = 0.1; };
    pw(wA, X1 + 2, X1 + 8, -17.4, 0.4, 0); pw(wB, X1 + 15, X1 + 20, -15.2, 0.35, 2); pw(wC, X1 + 22, X1 + 28, -17.0, 0.3, 4);

    // ---- âncoras dos rótulos
    const a = anchors, pf = X1 - 0.06;
    a.estacas.set(pf, -6, PZ - ZP);
    a.ficha.set(pf, -11, PZ + ZP);
    a.viga.set(pf, TOP + 0.4, PZ - ZP + 0.0);
    a.escora1.set(ROWS[1], SL1, PZ + 1);
    a.escora2.set(ROWS[1], SL2, PZ + 3);
    a.cacamba.set(cyc.x, cyc.y - 0.6, cyc.z);
    a.fundo.set(X1 + 0.5, -d, PZ - 3);
    a.predio.set(pf, 9.5, -46);
    a.sapata.set(pf, -1.5, -41.5);
    a.solo.set(X1, -15, PZ);
  }
  function labelVis(kx, t = st.tc) {
    switch (kx) {
      case 'estacas': return t > 12;
      case 'ficha': return t > T.w2a;
      case 'viga': return t > T.beam1;
      case 'escora1': return t > T.st1b;
      case 'escora2': return t > T.st2b;
      case 'cacamba': return t > T.crInE && (inW1(t) || inW2(t));
      case 'fundo': return t > T.w2b - 3;
      case 'predio': return t > 2;
      case 'sapata': return t > T.w2a - 2;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hideDPit(engine); },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); showDPit(engine); },
  };
}
