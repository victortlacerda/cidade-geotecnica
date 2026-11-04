import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { box, cyl } from '../kit/primitives.js';
import { COL } from '../config.js';
import { H, Hraw, PORTAL, portalProfile, portalFaceS, portalFaceN, colorOf, sstep } from '../scene/terrain.js';

// ---------------------------------------------------------------------------
// A5 — Emboque em encosta (corte em bancadas, grampos, concreto projetado,
// enfilagens e início do túnel). Seção em x = ax; o norte é -z.
// O terreno da colina é uma malha dinâmica: superfície = max(final, min(natural, L)),
// com L descendo lance por lance (escavação de cima para baixo).
// ---------------------------------------------------------------------------
const ax = PORTAL.x, zp = PORTAL.zp;
export const EMB = { box: { x0: -125, x1: -90, z0: -58.5, z1: -12 }, LV: [19, 14, 9.4, 4.7, 0] };
const LV = EMB.LV;

// tempos (s a 1×)
const T0 = 3.0, D = 2.8, N = 2.6, S = 2.2, LIFT = D + N + S;
const TP = T0 + 4 * LIFT, TPD = 8.0, TN = TP + TPD, TUN = 23.8, END = TN + TUN;
const liftT = (i) => T0 + i * LIFT;
export const EMB_STEP_STARTS = [0, T0, T0 + D, TP, TN, TN + 12.2];

export const EMB_STEPS = [
  { t: 'Mobilização e acesso', d: 'A topografia marca os limites do corte na superfície, o acesso é aberto e os equipamentos chegam ao topo da encosta.' },
  { t: 'Escavar o talude em bancadas', d: 'A escavadeira desce o talude de cima para baixo, um lance por vez (4 lances). A frente nunca fica mais alta do que o terreno aguenta sem suporte.' },
  { t: 'Grampear e projetar concreto', d: 'Em cada lance, antes de descer ao próximo: a perfuratriz crava os grampos, que costuram o solo instável ao maciço, e o robô projeta o concreto sobre a face. Só então a escavação continua.' },
  { t: 'Instalar as enfilagens', d: 'Com o talude frontal estabilizado, tubos de aço são cravados em arco acima da futura seção do túnel e formam um guarda-chuva que protege a escavação sob cobertura rasa.' },
  { t: 'Iniciar a escavação sob o guarda-chuva', d: 'A escavadeira avança a calota debaixo das enfilagens, só uma volta de cada vez, e o material sai pelo portal.' },
  { t: 'Primeiro avanço: projetado e cambota', d: 'O robô projeta concreto na calota e a cambota de aço apoia as enfilagens. Os chumbadores costuram o revestimento ao terreno. O túnel está iniciado e segue pelo ciclo do NATM (obra A2).' },
];
export const EMB_LABELS = [
  { k: 'bancada', t: 'Bancada' },
  { k: 'grampo', t: 'Grampo' },
  { k: 'shot', t: 'Concreto projetado' },
  { k: 'rup', t: 'Superfície de ruptura', fixed: [-10, -60] },
  { k: 'enf', t: 'Enfilagem' },
  { k: 'boca', t: 'Boca do túnel' },
  { k: 'cover', t: 'Cobertura rasa', fixed: [0, 0] },
];

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const Y = COL.yellow, DK = COL.dark, G = COL.glass;
const noclipMat = (c, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.6, metalness: o.m ?? 0.2, emissive: o.e ?? 0, emissiveIntensity: o.ei ?? 1, side: THREE.DoubleSide }); m.userData.noClip = true; return m; };

// topo do talude na seção (onde o perfil final encontra a colina natural)
const yTop0 = (() => { for (let s = 6.3; s < 14; s += 0.01) { if (Hraw(ax, zp - s) <= portalProfile(s)) return portalProfile(s); } return 17.9; })();

// geometria das bancadas (lances): face de cada lance
const lifts = [0, 1, 2, 3].map((i) => {
  const yHi = i === 0 ? yTop0 : LV[i], yLo = LV[i + 1];
  const zTop = zp - portalFaceS(yHi), zBot = zp - portalFaceN(yLo);
  return { i, yHi, yLo, zTop, zBot, rows: [yLo + 0.72 * (yHi - yLo), yLo + 0.3 * (yHi - yLo)] };
});

function padEdges(L) {
  const Le = Math.min(L, yTop0);
  const edgeN = zp - portalFaceN(Le);
  let edgeS = edgeN + 4.2;
  if (L < yTop0) {
    edgeS = zp + 6;
    for (let z = edgeN; z < zp + 6; z += 0.1) if (Hraw(ax, z) <= L) { edgeS = z; break; }
  }
  return { edgeN, edgeS };
}

export function createEmboque(engine, section, natm) {
  const root = new THREE.Group(); root.visible = false;

  // ------------------------------------------------------------ malha dinâmica do terreno
  const X0 = -92, X1 = -72, Z0 = -40, Z1 = -16, NX = X1 - X0, NZ = Z1 - Z0;
  const GW = NX + 3, GH = NZ + 3;
  const hrG = new Float32Array(GW * GH), hfG = new Float32Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = X0 - 1 + i, z = Z0 - 1 + j; hrG[j * GW + i] = Hraw(x, z); hfG[j * GW + i] = H(x, z);
  }
  const gi = (i, j) => (j + 1) * GW + (i + 1);
  const pos = new Float32Array((NX + 1) * (NZ + 1) * 3), col = new Float32Array((NX + 1) * (NZ + 1) * 3);
  const idx = [];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const v00 = j * (NX + 1) + i, v10 = v00 + 1, v01 = v00 + NX + 1, v11 = v01 + 1;
    idx.push(v00, v01, v10, v10, v01, v11);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  pg.setIndex(idx);
  const patch = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  patch.receiveShadow = true; patch.castShadow = true; patch.frustumCulled = false; root.add(patch);
  const SHOTC = new THREE.Color(0xaaa69c), cc = new THREE.Color();
  let curL = 99, shotKey = -1;
  const surf = (x, z) => Math.max(H(x, z), Math.min(Hraw(x, z), curL));
  const Sg = (i, j, L) => Math.max(hfG[gi(i, j)], Math.min(hrG[gi(i, j)], L));
  function refreshPatch(L, shots) {
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const x = X0 + i, z = Z0 + j, y = Sg(i, j, L), k = j * (NX + 1) + i;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      const cut = y < hrG[gi(i, j)] - 0.08;
      colorOf(x, y, z, cc, cut);
      if (y > -0.25) {
        const sl = Math.abs(Sg(i + 1, j, L) - Sg(i - 1, j, L)) + Math.abs(Sg(i, j + 1, L) - Sg(i, j - 1, L));
        cc.multiplyScalar(1 - Math.min(0.28, sl * 0.075));
        if (cut && sl > 1.6) for (const lf of lifts) if (shots[lf.i] && y >= lf.yLo - 0.05 && y <= lf.yHi + 0.05) cc.lerp(SHOTC, 0.85);
      }
      col[k * 3] = cc.r; col[k * 3 + 1] = cc.g; col[k * 3 + 2] = cc.b;
    }
    pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    pg.computeVertexNormals();
  }

  // ------------------------------------------------------------ marcos topográficos
  const stakes = [];
  for (const x of [-89.6, -86.4, -83.2]) {
    const g = new THREE.Group();
    g.add(cyl(0.1, 0.1, 3.2, 0xf4f1ea, 0, 1.6, 0, 8), cyl(0.105, 0.105, 0.7, 0xd23b2e, 0, 2.85, 0, 8), cyl(0.105, 0.105, 0.7, 0xd23b2e, 0, 1.45, 0, 8));
    const z = zp - portalFaceS(yTop0) - 1.0;
    g.position.set(x, Hraw(x, z), z); root.add(g); stakes.push(g);
  }

  // ------------------------------------------------------------ máquinas
  const place = (w, x, z, L, sc, lift = 0) => {
    const y = Math.max(H(x, z), Math.min(Hraw(x, z), L));
    const y1 = Math.max(H(x, z - 1.4), Math.min(Hraw(x, z - 1.4), L)), y2 = Math.max(H(x, z + 1.4), Math.min(Hraw(x, z + 1.4), L));
    w.position.set(x, y + lift, z); w.rotation.x = Math.atan2(y1 - y2, 2.8) * 0.9;
    w.scale.setScalar(Math.max(0.001, sc)); w.visible = sc > 0.01;
  };
  const wrap = (inner, rotY = 0) => { const w = new THREE.Group(); inner.rotation.y = rotY; w.add(inner); w.visible = false; root.add(w); return w; };

  const exc = M.excavator(0.55); const excW = wrap(exc.group, Math.PI / 2);

  function makeRig(sc) {
    const g = new THREE.Group(), body = new THREE.Group(); body.scale.setScalar(sc); g.add(body);
    body.add(box(0.9, 0.6, 3.8, DK, -1.1, 0.4, 0), box(0.9, 0.6, 3.8, DK, 1.1, 0.4, 0), box(2.6, 0.9, 3.2, Y, 0, 1.2, -0.2), box(1.3, 1.0, 1.2, G, 0.5, 2.0, -1.0), box(1.4, 0.8, 1.3, DK, -0.4, 1.8, 0.9));
    const pivot = new THREE.Group(); pivot.position.set(0, 1.8, 1.2); body.add(pivot);
    pivot.add(box(0.28, 0.28, 5.2, DK, 0, 0, 2.6), box(0.5, 0.5, 0.9, Y, 0, 0.3, 1.0));
    const head = new THREE.Group(); pivot.add(head);
    head.add(box(0.55, 0.55, 0.8, Y, 0, 0.3, 0));
    const rod = cyl(0.07, 0.07, 3.0, 0x8a8e95, 0, 0, 1.9, 6); rod.rotation.x = Math.PI / 2; head.add(rod);
    return { g, pivot, head, rod, body };
  }
  const nailRig = makeRig(0.6), nailW = wrap(nailRig.g, Math.PI);
  const pipeRig = makeRig(0.8), pipeW = wrap(pipeRig.g, Math.PI);

  // robô de concreto projetado (frente para o norte = -z)
  const robot = new THREE.Group(); const robW = wrap(robot, 0);
  { const yel = new THREE.MeshStandardMaterial({ color: Y, roughness: 0.55 }), dk = new THREE.MeshStandardMaterial({ color: DK, roughness: 0.6 }), gr = new THREE.MeshStandardMaterial({ color: 0x8d939b, roughness: 0.6 });
    const rb = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); robot.add(o); return o; };
    rb(1.7, 0.8, 4.6, yel, 0, 0.95, 0); rb(1.8, 0.25, 4.7, dk, 0, 0.5, 0);
    for (const sx of [-0.85, 0.85]) for (const sz of [-1.6, 1.6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), dk); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.42, sz); robot.add(w); }
    rb(1.3, 1.3, 1.4, gr, 0, 1.9, 1.5); rb(0.9, 0.7, 0.05, new THREE.MeshStandardMaterial({ color: 0x86b8d8 }), 0, 2.0, 0.78);
    const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.55, 14), dk); tur.position.set(0, 1.6, -1.4); robot.add(tur); }
  const armM = noclipMat(Y, { r: 0.55, m: 0.1 }), nozM = noclipMat(DK);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1), armM), nozz = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.5, 8), nozM);
  arm.visible = nozz.visible = false; root.add(arm, nozz);
  const NSP = 40, sprayM = noclipMat(0x9a968c, { r: 1, m: 0 });
  const spray = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 5), sprayM, NSP); spray.frustumCulled = false; root.add(spray);

  // ------------------------------------------------------------ grampos (no plano da seção, à frente da parede)
  const NCOL = [-90.12, -87.9, -85.7, -83.5, -81.3], NLEN = 6.0, NANG = 12 * Math.PI / 180;
  const nDir = new THREE.Vector3(0, -Math.sin(NANG), -Math.cos(NANG));
  const nailM = noclipMat(0x2a2d31, { r: 0.5, m: 0.6 });
  const nNails = 4 * 2 * NCOL.length;
  const nails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.085, 0.085, NLEN, 6), nailM, nNails);
  const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.4, 0.07), nailM, nNails);
  nails.frustumCulled = plates.frustumCulled = false; root.add(nails, plates);
  const mx = new THREE.Matrix4(), qa = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const qp = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.12, 0.99).normalize());
  function setNail(idxN, x, y, z, f) {
    if (f <= 0) { nails.setMatrixAt(idxN, zero); plates.setMatrixAt(idxN, zero); return; }
    qa.setFromUnitVectors(up, nDir);
    const slide = (1 - f) * NLEN * 0.85;
    pv.set(x, y, z).addScaledVector(nDir, NLEN / 2 - slide + 0.02);
    mx.compose(pv, qa, one); nails.setMatrixAt(idxN, mx);
    pv.set(x, y, z).addScaledVector(nDir, -slide - 0.03);
    mx.compose(pv, qp, one); plates.setMatrixAt(idxN, mx);
  }

  // ------------------------------------------------------------ faixas de concreto projetado (seção)
  const WET = new THREE.Color(0x77736a), CURED = new THREE.Color(0xb9b4a8);
  const strips = lifts.map((lf) => {
    const len = Math.hypot(lf.zBot - lf.zTop, lf.yHi - lf.yLo);
    const g = new THREE.BoxGeometry(0.9, len, 0.34); g.translate(0, -len / 2, 0);
    const m = noclipMat(0x77736a, { r: 1, m: 0 });
    const mesh = new THREE.Mesh(g, m); mesh.visible = false;
    const d = new THREE.Vector3(0, lf.yLo - lf.yHi, lf.zBot - lf.zTop).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
    const n = new THREE.Vector3(0, d.z, -d.y).normalize(); // para fora do solo (sul e para cima)
    mesh.position.set(ax - 0.05, lf.yHi, lf.zTop).addScaledVector(n, 0.17);
    mesh.userData = { len, d, n };
    root.add(mesh); return mesh;
  });

  // ------------------------------------------------------------ enfilagens (guarda-chuva)
  const PR = 4.8, NPIPE = 8, PLEN = 12.5, PANG = 6 * Math.PI / 180;
  const pDir = new THREE.Vector3(0, Math.sin(PANG), -Math.cos(PANG));
  const pipeM = noclipMat(0x59626c, { r: 0.45, m: 0.6 });
  const pipes = [];
  for (let o = 0; o < NPIPE; o++) {
    const th = (90 - o * (90 / (NPIPE - 1))) * Math.PI / 180;
    const y = 3.0 + PR * Math.sin(th);
    const z0 = zp - portalFaceS(Math.min(y, 9.3)) - 0.05;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, PLEN, 8), pipeM);
    m.quaternion.setFromUnitVectors(up, pDir); m.visible = false; root.add(m);
    pipes.push({ m, y, z0, o });
  }

  // superfície potencial de ruptura (tracejado)
  const NDASH = 34, dashM = noclipMat(0xe0432d, { e: 0xe0432d, ei: 0.5, r: 0.8, m: 0 });
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.5), dashM, NDASH); dashes.frustumCulled = false; root.add(dashes);
  const CZ = -21.5, CY = 16.5, CR = 17.6, PH0 = 175 * Math.PI / 180, PH1 = 262 * Math.PI / 180;
  const arcPt = (u) => { const ph = PH0 + (PH1 - PH0) * u; return [CZ + CR * Math.cos(ph), CY + CR * Math.sin(ph), ph]; };
  for (let k = 0; k < NDASH; k++) {
    const [z, y, ph] = arcPt((k + 0.5) / NDASH);
    const tz = -Math.sin(ph), ty = Math.cos(ph); // tangente (dz,dy)
    qa.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, ty, tz).normalize());
    mx.compose(new THREE.Vector3(ax - 0.2, y, z), qa, new THREE.Vector3(1, 1, k % 2 ? 0.0001 : 1.7));
    dashes.setMatrixAt(k, mx);
  }
  dashes.visible = false;

  // ------------------------------------------------------------ estado
  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(EMB_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};
  let tunnelOn = false;

  function info(tc) {
    if (tc < T0) return { step: 0, p: tc / T0, note: 'Marcação e equipamentos' };
    if (tc < TP) {
      const i = Math.min(3, Math.floor((tc - T0) / LIFT)), ts = tc - liftT(i), pre = `Lance ${i + 1} de 4 · `;
      if (ts < D) return { step: 1, p: ts / D, note: pre + 'escavando' };
      if (ts < D + N) return { step: 2, p: (ts - D) / N, note: pre + 'grampos' };
      return { step: 2, p: (ts - D - N) / S, note: pre + 'concreto projetado' };
    }
    if (tc < TN) return { step: 3, p: (tc - TP) / TPD, note: 'Tubos de aço em arco sobre a seção' };
    const tn = tc - TN;
    if (tn < 12.2) return { step: 4, p: tn / 12.2, note: 'Calota sob o guarda-chuva' };
    return { step: 5, p: Math.min(1, (tn - 12.2) / 11.6), note: 'Volta de 1,2 m revestida' };
  }
  function Lof(tc) {
    let L = LV[0];
    for (let i = 0; i < 4; i++) {
      const t = tc - liftT(i);
      if (t <= 0) return L;
      if (t < D) return LV[i] + (LV[i + 1] - LV[i]) * ease(t / D);
      L = LV[i + 1];
    }
    return L;
  }
  const popWin = (t, a, b, f = 0.4) => ease((t - a) / f) * ease((b - t) / f);

  function update(dt) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < END - 0.05) st.hold = 0; // o usuário pulou para outra etapa
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= END && st.hold <= 0) { st.tc = END - 0.001; st.hold = 3.5; }
    const tc = st.tc;
    const inf = info(tc); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    // ---- terreno
    const L = Lof(tc);
    const shots = lifts.map((lf) => tc >= liftT(lf.i) + D + N + 1.6);
    const key = shots.reduce((a, b, i) => a + (b ? 1 << i : 0), 0);
    if (Math.abs(L - curL) > 0.004 || key !== shotKey) {
      curL = L; shotKey = key; refreshPatch(L, shots); section.rebuildFace();
    }
    stakes.forEach((g, i) => { const e = ease((tc - 0.2 - i * 0.35) / 0.5); g.scale.set(1, Math.max(0.001, e), 1); g.visible = e > 0.01 && Math.abs(surf(g.position.x, g.position.z) - g.position.y) < 0.15; });
    const tail = hidden.platform; if (tail) tail.visible = tc >= liftT(3) + D;
    if (hidden.portal) hidden.portal.visible = tc >= TN;

    // ---- escavadeira
    let digClock = 0, exS = 0;
    for (let i = 0; i < 4; i++) digClock += clamp01((tc - liftT(i)) / D) * D;
    if (tc < T0) exS = ease((tc - 0.4) / 0.9);
    else if (tc < liftT(3) + D + 0.4) {
      const i = Math.min(3, Math.floor((tc - T0) / LIFT)), ts = tc - liftT(i);
      exS = ts < D ? (i === 0 ? 1 : ease(ts / 0.45)) : Math.max(0, 1 - (ts - D) / 0.4);
    }
    const ee = padEdges(L), exZ = Math.min((ee.edgeN + ee.edgeS) / 2, ee.edgeN + 3.2);
    place(excW, -87.2, exZ, L, exS);
    exc.update(digClock * 1.3);

    // ---- grampos e perfuratriz
    let rigS = 0, rigAim = null, rigZ = 0, rigL = 0, rigDrill = 0;
    for (const lf of lifts) {
      const t0 = liftT(lf.i) + D;
      lf.rows.forEach((yr, r) => {
        const f = clamp01((tc - (t0 + 0.2 + r * 1.1)) / 1.0);
        const zf = zp - portalFaceS(yr);
        NCOL.forEach((x, c) => setNail(((lf.i * 2 + r) * NCOL.length) + c, x, yr, zf, ease(f)));
        if (f > 0 && f < 1) { rigAim = new THREE.Vector3(NCOL[0], yr, zf); rigDrill = f; }
      });
      const w = popWin(tc, t0, t0 + N, 0.4);
      if (w > 0.01) { rigS = w; rigL = LV[lf.i + 1]; const e = padEdges(rigL); rigZ = e.edgeN + 2.4; if (!rigAim) rigAim = new THREE.Vector3(NCOL[0], lf.rows[0], zp - portalFaceS(lf.rows[0])); }
    }
    nails.instanceMatrix.needsUpdate = true; plates.instanceMatrix.needsUpdate = true;
    place(nailW, -88.4, rigZ, rigL, rigS);
    if (rigS > 0.01 && rigAim) {
      nailW.updateMatrixWorld(true);
      nailRig.pivot.lookAt(rigAim);
      nailRig.head.position.z = 1.0 + 1.6 * (0.5 + 0.5 * Math.sin(rigDrill * 40)) * (rigDrill > 0 ? 1 : 0.2);
    }

    // ---- concreto projetado (robô e faixas)
    let robS = 0, robL = 0, robZ = 0, sprayOn = false, sprayFrom = new THREE.Vector3(), sprayTo = new THREE.Vector3();
    strips.forEach((m, i) => {
      const lf = lifts[i], t0 = liftT(i) + D + N, f = clamp01((tc - t0 - 0.35) / 1.5);
      m.visible = f > 0.001; m.scale.y = Math.max(0.001, f);
      m.material.color.copy(WET).lerp(CURED, clamp01((tc - (t0 + 1.9)) / 14));
      const w = popWin(tc, t0, t0 + S, 0.4);
      if (w > 0.01) {
        robS = w; robL = LV[i + 1]; const e = padEdges(robL); robZ = e.edgeN + 2.9;
        sprayOn = f > 0 && f < 1;
        const { len, d, n } = m.userData;
        sprayTo.copy(m.position).addScaledVector(d, len * f).addScaledVector(n, 0.2);
      }
    });
    place(robW, -87.0, robZ, robL, robS);
    if (robS > 0.01) {
      robW.updateMatrixWorld(true);
      const base = new THREE.Vector3(-87.0, 0, robZ - 1.4); robot.localToWorld(base.set(0, 1.9, -1.4));
      const np = sprayOn ? sprayTo.clone().add(new THREE.Vector3(0, 0.1, 1.6)) : base.clone().add(new THREE.Vector3(0, 1.0, -1.6));
      arm.visible = nozz.visible = true;
      arm.position.copy(base).add(np).multiplyScalar(0.5); arm.scale.z = base.distanceTo(np); arm.lookAt(np);
      nozz.position.copy(np); nozz.lookAt(sprayOn ? sprayTo : np.clone().add(new THREE.Vector3(0, 0, -1))); nozz.rotateX(Math.PI / 2);
      sprayFrom.copy(np);
    } else { arm.visible = nozz.visible = false; }
    for (let i = 0; i < NSP; i++) {
      if (!sprayOn || robS < 0.5) { mx.makeScale(0, 0, 0); spray.setMatrixAt(i, mx); continue; }
      const f = (tc * 2.4 + i / NSP) % 1;
      pv.lerpVectors(sprayFrom, sprayTo, f); pv.x += Math.sin(i * 12.9 + f * 9) * 0.25; pv.y += Math.cos(i * 7.3) * 0.12;
      mx.makeTranslation(pv.x, pv.y, pv.z); spray.setMatrixAt(i, mx);
    }
    spray.instanceMatrix.needsUpdate = true;

    // ---- enfilagens
    let ppS = 0, ppO = -1, ppF = 0;
    for (const p of pipes) {
      const f = clamp01((tc - TP - 0.3 - p.o * 0.85) / 0.8);
      p.m.visible = f > 0.001;
      const slide = (1 - ease(f)) * PLEN;
      p.m.position.set(ax - 0.12, p.y, p.z0).addScaledVector(pDir, PLEN / 2 - slide);
      if (f > 0 && f < 1) { ppO = p.o; ppF = f; }
    }
    ppS = popWin(tc, TP, TP + TPD, 0.5);
    place(pipeW, -87.6, zp + 5.4, 0, ppS);
    if (ppS > 0.01) {
      const p = pipes[Math.max(0, ppO >= 0 ? ppO : Math.min(NPIPE - 1, Math.floor((tc - TP) / 0.85)))];
      pipeW.updateMatrixWorld(true);
      pipeRig.pivot.lookAt(new THREE.Vector3(ax - 0.12, p.y, p.z0 + 1.0));
      pipeRig.head.position.z = 1.0 + 1.3 * (0.5 + 0.5 * Math.sin(ppF * 40));
    }

    // ---- túnel NATM (primeiras voltas)
    const wantTunnel = tc >= TN;
    if (wantTunnel && !tunnelOn) { natm.enter({ n0: 0 }); tunnelOn = true; }
    if (!wantTunnel && tunnelOn) { natm.exit(); section.clearBands(); tunnelOn = false; }
    if (tunnelOn) {
      natm.state.paused = st.paused; natm.state.speed = st.speed;
      natm.state.tc = Math.min(Math.max(0, tc - TN), TUN - 0.01);
      natm.state.hold = 0;
    }

    // ---- luz e âncoras
    dashes.visible = labelVis('rup', tc);
    const ci = Math.min(3, Math.max(0, Math.floor((tc - T0) / LIFT)));
    const lf = lifts[tc < T0 ? 0 : ci];
    const ym = (lf.yHi + lf.yLo) / 2;
    anchors.bancada.set(ax - 0.1, ym, zp - portalFaceS(ym) + 0.2);
    const nl = lifts.filter((l) => tc > liftT(l.i) + D + 0.3).pop() || lifts[0];
    anchors.grampo.set(NCOL[0], nl.rows[0] - 0.5, zp - portalFaceS(nl.rows[0]) - 3.2);
    const sl = lifts.filter((l) => tc > liftT(l.i) + D + N + 0.4).pop() || lifts[0];
    anchors.shot.set(ax - 0.1, (sl.yHi + sl.yLo) / 2, zp - portalFaceS((sl.yHi + sl.yLo) / 2) + 0.35);
    const ar = arcPt(0.3); anchors.rup.set(ax, ar[1], ar[0]);
    anchors.enf.set(ax - 0.1, 3 + PR, zp - 1.4 - 9);
    anchors.boca.set(ax, 3.2, zp - 0.2);
    anchors.cover.set(ax, 8.6, zp - 3.4);
  }
  function labelVis(k, tc = st.tc) {
    switch (k) {
      case 'bancada': return tc >= T0 + 0.3;
      case 'grampo': return tc >= liftT(0) + D + 0.8;
      case 'shot': return tc >= liftT(0) + D + N + 0.8;
      case 'rup': return tc >= liftT(0) + D + 0.5;
      case 'enf': return tc >= TP + 0.8;
      case 'boca': return tc >= TN + 0.3;
      case 'cover': return tc >= TP + 0.3;
      default: return true;
    }
  }

  return {
    group: root, state: st, anchors, update, labelVis,
    enter() {
      st.active = true; root.visible = true; st.tc = 0; st.hold = 0; tunnelOn = false;
      for (const [k, n] of [['platform', 'a-platform'], ['portal', 'a-portal'], ['truck', 'a-truck']]) { hidden[k] = engine.scene.getObjectByName(n); if (hidden[k]) hidden[k].visible = false; }
      curL = 99; shotKey = -1;
      section.setSurface(surf);
    },
    exit() {
      st.active = false; root.visible = false;
      if (tunnelOn) { natm.exit(); tunnelOn = false; }
      for (const k of Object.keys(hidden)) if (hidden[k]) hidden[k].visible = true;
    },
  };
}
