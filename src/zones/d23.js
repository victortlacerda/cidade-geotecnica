import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip } from './fund.js';
import { X1, PZ, SITE_BOX, vplane, buildSurroundings } from './dsite.js';
import { createPitKit, rigPlacer, wallFaceStd } from './dkit.js';
import { hideDPit, showDPit } from './dpit.js';

// ---------------------------------------------------------------------------
// D2 — Cortina de estacas secantes e D3 — Cortina de estacas tangentes.
// Mesma cava das outras obras da Zona D (seção em x = X1). As cabeças das estacas aparecem
// como discos no terreno, para ver em planta a interseção (D2) ou as frestas (D3).
// ---------------------------------------------------------------------------
const HW = 7.5, PX = 13;
const LEN = 11, DMAX = 6.5;
export const D2 = { box: SITE_BOX }, D3 = { box: SITE_BOX };
export const D2_CAM = { tx: X1, ty: 3, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 57 };
export const D2_MCAM = { tx: X1, ty: -1, tz: PZ - 1, yaw: -1.3, pitch: 0.2, dist: 120 };

const makePiles = (kind) => {
  const L = [];
  if (kind === 'secant') {
    const R = 0.58, P = 1.0, cN = (i) => X1 + P * i, zN = PZ - HW - R + 0.03, zS = PZ + HW + R - 0.03, xE = X1 + PX + R - 0.03;
    const all = [];
    for (let i = 0; i <= 12; i++) all.push({ x: cN(i), z: zN, w: 0, i });
    for (let i = 0; i <= 12; i++) all.push({ x: cN(i), z: zS, w: 1, i });
    for (let i = 0; i <= 14; i++) all.push({ x: xE, z: PZ - HW + 0.5 + P * i, w: 2, i });
    for (const k of ['p', 's']) all.filter((p) => (p.i % 2 === 0) === (k === 'p')).forEach((p) => L.push({ ...p, kind: k, R }));
  } else {
    const R = 0.47, P = 1.1, zN = PZ - HW - R + 0.03, zS = PZ + HW + R - 0.03, xE = X1 + PX + R - 0.03;
    for (let i = 0; i <= 10; i++) L.push({ x: X1 + P * i, z: zN, w: 0, i, kind: 't', R });
    for (let i = 0; i <= 10; i++) L.push({ x: X1 + P * i, z: zS, w: 1, i, kind: 't', R });
    for (let i = 0; i <= 12; i++) L.push({ x: xE, z: PZ - HW + 0.6 + P * i, w: 2, i, kind: 't', R });
  }
  return L;
};

const SEC = {
  id: 'D2', kind: 'secant', dt: 0.5, p0: 2, kindGap: 3, s2: 19, s3: 38,
  T: { exc: [38, 42], pre: [40, 46, 1.5], wins: [[56, 72], [84, 92]], deps: [2.9, 2.1], crane: [52, 56], lv: [{ y: -0.8, inset: 0.55, wt: [46, 50], st: [47, 53] }, { y: -3.8, inset: 0.55, wt: [72, 76], st: [76, 82] }], END: 106 },
  steps: [
    { t: 'Estacas primárias', d: 'Primeiro executam-se as estacas alternadas, com um intervalo livre entre uma e outra. São de concreto de baixa resistência e, em geral, sem armadura, porque só servem de vedação. Ficam endurecendo, mas ainda macias, para serem cortadas pelas vizinhas.' },
    { t: 'Estacas secundárias cortando as primárias', d: 'As estacas do intervalo são perfuradas cortando um pouco as primárias que ainda estão macias. Elas são armadas e de concreto estrutural, e carregam a carga da parede. As interseções entre as estacas fecham a parede, sem nenhuma fresta: ela fica estanque.' },
    { t: 'Escavar revelando a parede', d: 'Com a parede pronta, a escavação desce em etapas, com escoras. A face da parede aparece contínua, sem aberturas por onde passem solo ou água. Por isso as estacas secantes são usadas onde o nível d’água é alto ou o solo escoa com facilidade.' },
  ],
  labels: [
    { k: 'prim', t: 'Estaca primária (sem armadura)' }, { k: 'sec', t: 'Estaca secundária (armada)' }, { k: 'inter', t: 'Interseção das estacas' },
    { k: 'escora', t: 'Escora e longarina' }, { k: 'cacamba', t: 'Caçamba içada' }, { k: 'predio', t: 'Prédio vizinho' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
  ],
  nome: 'Estacas secantes',
};
const TAN = {
  id: 'D3', kind: 'tangent', dt: 0.55, p0: 2, kindGap: 0, s2: 28, s3: 84,
  T: { exc: [28, 32], pre: [30, 36, 1.5], wins: [[46, 62], [74, 82]], deps: [2.9, 2.1], crane: [42, 46], lv: [{ y: -0.8, inset: 0.55, wt: [36, 40], st: [37, 43] }, { y: -3.8, inset: 0.55, wt: [62, 66], st: [66, 72] }], sp: [84, 102], END: 114 },
  steps: [
    { t: 'Estacas lado a lado', d: 'As estacas são executadas encostadas umas nas outras, com o menor afastamento que a perfuratriz consegue manter. Mesmo assim, ficam pequenas frestas entre elas, porque o prumo de cada furo nunca é perfeito.' },
    { t: 'Escavar e escorar', d: 'A escavação desce em etapas, com escoras, e deixa a parede à vista. Entre as estacas aparecem as frestas, por onde o solo pode escapar (solo carreado) e, se houver água, ela pode entrar. Por isso as tangentes são usadas em solo com alguma coesão e acima do nível d’água.' },
    { t: 'Fechar as frestas', d: 'As frestas são fechadas com concreto projetado (jateado) sobre uma tela de aço, que regulariza a face da parede e impede a saída do solo entre as estacas.' },
  ],
  labels: [
    { k: 'estaca', t: 'Estaca' }, { k: 'fresta', t: 'Fresta entre estacas' }, { k: 'carreado', t: 'Solo escapando' }, { k: 'proj', t: 'Concreto projetado' },
    { k: 'escora', t: 'Escora e longarina' }, { k: 'cacamba', t: 'Caçamba içada' }, { k: 'predio', t: 'Prédio vizinho' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
  ],
  nome: 'Estacas tangentes',
};
export const D2_STEPS = SEC.steps, D2_LABELS = SEC.labels, D2_STEP_STARTS = [0, SEC.s2, SEC.s3];
export const D3_STEPS = TAN.steps, D3_LABELS = TAN.labels, D3_STEP_STARTS = [0, TAN.s2, TAN.s3];

function createWall(engine, section, V) {
  const root = new THREE.Group(); root.visible = false;
  const sec = V.kind === 'secant', Tm = V.T;
  const sur = buildSurroundings(root);
  const piles = makePiles(V.kind), NP = piles.length;
  const ts = []; { let t = V.p0; piles.forEach((p, k) => { if (k > 0) { if (p.w !== piles[k - 1].w) t += 2; if (p.kind !== piles[k - 1].kind) t += V.kindGap; } ts.push(t); t += V.dt; }); }
  const pend = ts[NP - 1] + 0.8;
  const kit = createPitKit(root, section, { HW, PX, dmax: DMAX, pre: Tm.pre, wins: Tm.wins, deps: Tm.deps, levels: Tm.lv, exc: Tm.exc, crane: Tm.crane });
  const colOf = { p: new THREE.Color(0xe9e2c8), s: new THREE.Color(0x5f5c57), t: new THREE.Color(0xa7a399) };
  const pg = new THREE.CylinderGeometry(1, 1, 1, 20); pg.translate(0, -0.5, 0);
  const pm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  const pim = new THREE.InstancedMesh(pg, pm, NP); pim.frustumCulled = false; pim.castShadow = true; root.add(pim);
  piles.forEach((p, i) => pim.setColorAt(i, colOf[p.kind]));
  const dg = new THREE.CircleGeometry(1, 24); dg.rotateX(-Math.PI / 2);
  const dm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const dim = new THREE.InstancedMesh(dg, dm, NP); dim.frustumCulled = false; dim.receiveShadow = true; root.add(dim);
  piles.forEach((p, i) => dim.setColorAt(i, colOf[p.kind].clone()));
  // cortes das estacas na seção (a estaca 0 das paredes norte e sul)
  const capMs = { p: noclip(0xdedacb, { r: 1, e: 0x2a2924 }), s: noclip(0xa09c92, { r: 1, e: 0x28261f }), t: noclip(0xc9c5ba, { r: 1, e: 0x25231f }) };
  const caps = piles.map((p, i) => ({ p, i })).filter(({ p }) => p.x === X1 && p.w < 2).map(({ p, i }) => { const m = vplane(2 * (p.R - 0.03), capMs[p.kind]); m.position.set(X1 - 0.05, -LEN, p.z); m.renderOrder = 4; root.add(m); return { m, i, z: p.z }; });
  const rig = M.pilingRig(); rig.group.scale.setScalar(0.6); rig.group.visible = false; root.add(rig.group);
  const place = rigPlacer(rig, piles, ts, wallFaceStd);

  // --- D3: concreto projetado e solo escapando pelas frestas
  let sp = null;
  if (!sec) {
    const sm = mat(0xbdbab0, { r: 1 });
    const boxTop = (sx, sz, x, z) => { const g = new THREE.BoxGeometry(sx, 1, sz); g.translate(0, -0.5, 0); const m = new THREE.Mesh(g, sm); m.position.set(x, 0, z); m.castShadow = true; m.visible = false; root.add(m); return m; };
    const covers = [boxTop(PX, 0.14, X1 + PX / 2, PZ - HW + 0.07 - 0.0), boxTop(0.14, 2 * HW, X1 + PX - 0.07, PZ), boxTop(PX, 0.14, X1 + PX / 2, PZ + HW - 0.07)];
    const spray = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 5, 4), sm, 30); spray.frustumCulled = false; spray.visible = false; root.add(spray);
    const nozzleM = mat(0x3a3d42, { r: 0.5 });
    const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.6), nozzleM); nozzle.visible = false; root.add(nozzle);
    const leakM = mat(0x7a5a3a, { r: 1 });
    const leaks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 5, 4), leakM, 18); leaks.frustumCulled = false; leaks.visible = false; root.add(leaks);
    const gapZ = []; for (let i = 3; i <= 9; i += 2) gapZ.push(PZ - HW + 0.6 + 1.1 * i + 0.55);
    sp = { covers, spray, nozzle, leaks, gapZ };
  }

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(V.labels.map((l) => [l.k, new THREE.Vector3()]));
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), vs = new THREE.Vector3(), vp = new THREE.Vector3();
  const fmt = (x) => x.toFixed(1).replace('.', ',');
  const midI = piles.findIndex((p) => p.w === 2 && p.i === 5), midI2 = piles.findIndex((p) => p.w === 2 && p.i === 6);
  function info(t, d, winI) {
    if (sec) {
      if (t < V.s2) return { step: 0, p: win(t, 0, V.s2), note: t < ts[0] ? 'Perfuratriz chegando' : `Estacas primárias · ${Math.min(piles.filter((p) => p.kind === 'p').length, ts.filter((x, i) => x < t && piles[i].kind === 'p').length)} de ${piles.filter((p) => p.kind === 'p').length}` };
      if (t < V.s3) return { step: 1, p: win(t, V.s2, V.s3), note: `Estacas secundárias · ${ts.filter((x, i) => x < t && piles[i].kind === 's').length} de ${piles.filter((p) => p.kind === 's').length}` };
      return { step: 2, p: win(t, V.s3, Tm.END), note: winI >= 0 ? `Escavando · ${fmt(d)} m de ${fmt(DMAX)} m` : t < Tm.pre[0] ? 'Escavadeira chegando' : t < Tm.lv[0].st[1] ? 'Escoras do 1º nível' : t >= Tm.wins[1][1] ? 'Parede estanque à vista' : 'Escoras do 2º nível' };
    }
    if (t < V.s2) return { step: 0, p: win(t, 0, V.s2), note: t < ts[0] ? 'Perfuratriz chegando' : `Estacas · ${ts.filter((x) => x < t).length} de ${NP}` };
    if (t < V.s3) return { step: 1, p: win(t, V.s2, V.s3), note: winI >= 0 ? `Escavando · ${fmt(d)} m de ${fmt(DMAX)} m` : t < Tm.lv[0].st[1] ? 'Escoras do 1º nível' : t >= Tm.wins[1][1] ? 'Frestas à mostra, solo escapando' : 'Escoras do 2º nível' };
    return { step: 2, p: win(t, V.s3, Tm.END), note: t < Tm.sp[1] ? 'Projetando concreto sobre a tela' : 'Parede regularizada, frestas fechadas' };
  }

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < Tm.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= Tm.END && st.hold <= 0) { st.tc = Tm.END - 0.001; st.hold = 3.5; }
    const t = st.tc;
    sur.update(tAbs);
    const kr = kit.update(t, tAbs);
    const inf = info(t, kr.d, kr.winI); st.step = inf.step; st.progress = inf.p; st.note = inf.note;
    for (let i = 0; i < NP; i++) {
      const p = piles[i], u = ease(win(t, ts[i], ts[i] + 0.8));
      vs.set(p.R - 0.03, Math.max(0.0001, LEN * u), p.R - 0.03); vp.set(p.x, 0, p.z); m4.compose(vp, q0, vs); pim.setMatrixAt(i, m4);
      const du = u > 0.5 ? 1 : 0; const r = p.R + (p.kind === 's' ? 0.01 : 0);
      vs.set(Math.max(0.0001, r * du), 1, Math.max(0.0001, r * du)); vp.set(p.x, p.kind === 's' ? 0.05 : 0.04, p.z); m4.compose(vp, q0, vs); dim.setMatrixAt(i, m4);
    }
    pim.instanceMatrix.needsUpdate = true; dim.instanceMatrix.needsUpdate = true;
    caps.forEach((c) => { const u = ease(win(t, ts[c.i], ts[c.i] + 0.8)); c.m.visible = u > 0.01; c.m.scale.y = Math.max(0.001, LEN * u); c.m.position.y = -LEN * u; });
    place(t, tAbs, sec ? V.s3 - 0.5 : V.s2 - 0.5);

    if (sp) {
      const d = kr.d;
      // solo escapando pelas frestas (entre o fim da 2ª escavação e o início da projeção)
      const lk = t > Tm.wins[0][1] && t < Tm.sp[0] + 4;
      sp.leaks.visible = lk;
      if (lk) for (let i = 0; i < 18; i++) { const g = sp.gapZ[i % sp.gapZ.length], u = (tAbs * 0.35 + i * 0.37) % 1; vp.set(X1 + PX - 0.12, -0.3 - (Math.max(0.5, d) - 0.5) * u, g + ((i * 13) % 5) * 0.004); m4.makeTranslation(vp.x, vp.y, vp.z); sp.leaks.setMatrixAt(i, m4); sp.leaks.instanceMatrix.needsUpdate = true; }
      const segs = [[Tm.sp[0], Tm.sp[0] + 6], [Tm.sp[0] + 6, Tm.sp[0] + 12], [Tm.sp[0] + 12, Tm.sp[1]]], order = [0, 1, 2];
      let front = null;
      order.forEach((w, n) => { const [a, b] = segs[n], u = ease(win(t, a, b)); const cv = sp.covers[w]; cv.visible = u > 0.01; cv.scale.y = Math.max(0.001, (d - 0.0) * u); if (t >= a && t < b) front = { w, y: -d * u }; });
      sp.spray.visible = !!front; sp.nozzle.visible = !!front;
      if (front) {
        const { w, y } = front;
        for (let i = 0; i < 30; i++) { const f = (tAbs * 1.6 + i / 30) % 1, a = ((i * 7) % 13) / 13; let x, z; if (w === 1) { x = X1 + PX - 0.1 - 0.9 * (1 - f); z = PZ - HW + 0.5 + (2 * HW - 1) * a; } else { x = X1 + 0.8 + (PX - 1.6) * a; z = (w === 0 ? PZ - HW + 0.1 + 0.9 * (1 - f) : PZ + HW - 0.1 - 0.9 * (1 - f)); } vp.set(x, y + 0.3 * Math.sin(i), z); m4.makeTranslation(vp.x, vp.y, vp.z); sp.spray.setMatrixAt(i, m4); }
        sp.spray.instanceMatrix.needsUpdate = true;
        const sw = Math.sin(tAbs * 0.9) * 0.5 + 0.5;
        const base = w === 1 ? new THREE.Vector3(X1 + PX - 2.4, y + 0.2, PZ - 4 + 8 * sw) : new THREE.Vector3(X1 + 1 + (PX - 2) * sw, y + 0.2, w === 0 ? PZ - HW + 2.4 : PZ + HW - 2.4);
        const tip = w === 1 ? new THREE.Vector3(X1 + PX - 0.3, y, base.z) : new THREE.Vector3(base.x, y, w === 0 ? PZ - HW + 0.3 : PZ + HW - 0.3);
        sp.nozzle.position.copy(base).add(tip).multiplyScalar(0.5); sp.nozzle.scale.z = Math.max(0.01, base.distanceTo(tip) / 1.6); sp.nozzle.lookAt(tip);
      }
    }

    const a = anchors, pf = X1 - 0.06;
    if (sec) {
      a.prim.set(pf, -4, piles[0].z); a.sec.set(X1 + 1.0, 0.2, piles[0].z + 0.0);
      a.inter.set(X1 + PX - 0.1, -2, (piles[midI]?.z ?? PZ) + 0.5);
    } else {
      a.estaca.set(pf, -4, piles[0].z); a.fresta.set(X1 + PX - 0.1, -2.5, sp.gapZ[1]); a.carreado.set(X1 + PX - 0.12, -3.6, sp.gapZ[2]); a.proj.set(X1 + PX - 0.2, -2, PZ + 5);
    }
    a.escora.set(kit.ROWS[1], Tm.lv[0].y, PZ + 2);
    a.cacamba.set(kr.cyc.x, kr.cyc.y - 0.6, kr.cyc.z);
    a.predio.set(pf, 9.5, -46); a.solo.set(X1, -15, PZ);
    void midI2;
  }
  function labelVis(kx, t = st.tc) {
    const W = Tm.wins;
    if (sec) switch (kx) {
      case 'prim': return t > 10;
      case 'sec': return t > V.s2 + 8 && t < V.s3 + 12;
      case 'inter': return t > Tm.pre[1];
      case 'escora': return t > Tm.lv[0].st[1] + 1;
      case 'cacamba': return kit.winIdx(t) >= 0 && t > Tm.crane[1];
      case 'predio': return t > 2;
      default: return true;
    }
    switch (kx) {
      case 'estaca': return t > 10 && t < V.s2 + 6;
      case 'fresta': return t > Tm.pre[1] + 4 && t < Tm.sp[0] + 4;
      case 'carreado': return t > W[0][1] && t < Tm.sp[0] + 4;
      case 'proj': return t > Tm.sp[0] + 4;
      case 'escora': return t > Tm.lv[0].st[1] + 1 && t < V.s3;
      case 'cacamba': return kit.winIdx(t) >= 0 && t > Tm.crane[1];
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
export const createD2 = (engine, section) => createWall(engine, section, SEC);
export const createD3 = (engine, section) => createWall(engine, section, TAN);
