import * as THREE from 'three';
import { bounds } from '../scene/terrain.js';

// ---------------------------------------------------------------------------
// A1 — Túnel TBM (EPB) em corte
// Eixo do túnel ao longo de z (de sul para norte, z decrescente), cortado em x = tx.
// Convenção: s = distância avançada a partir da parede norte do poço (m).
// Referencial da máquina: z local positivo = atrás da cabeça de corte.
// ---------------------------------------------------------------------------
export const TBM = {
  tx: -70, yc: -12.2, z0: -26.6,
  Rb: 3.3, Rs: 3.2, Rl: 2.95, Ri: 2.65, // furo, escudo, anel (ext.), anel (int.)
  L: 1.4, Lt: 6.4, Ov: 1.5, // anel, comprimento do escudo, trespasse da cauda
  shaft: { zc: -22, r: 4.6 },
  box: { x0: -125, x1: -70, z0: -58.5, z1: -10 },
  N0: 3, NMAX: 16, // anéis iniciais e último anel do trecho
};
const T = { stroke: 5.2, asm: 5.0, grout: 2.4, rest: 1.2 };
export const TBM_STEP_STARTS = [0, 5.2, 10.2, 12.6];
const CYCLE = T.stroke + T.asm + T.grout + T.rest;
const BT = TBM.Lt - TBM.Ov; // posição (atrás da face) dos apoios dos macacos

export const TBM_STEPS = [
  { t: 'Escavar e propulsar', d: 'A cabeça de corte gira e desagrega o solo; os macacos empurram a máquina contra o último anel, um anel de cada vez (1,4 m). A pressão do solo na câmara equilibra a pressão da frente e do lençol freático.' },
  { t: 'Parar e montar o anel de aduelas', d: 'Com os macacos recuados, o erector pega as aduelas do trem de apoio e posiciona uma a uma, de baixo para cima, até fechar o anel com a aduela de fecho.' },
  { t: 'Injetar o graute', d: 'Argamassa é injetada pela cauda do escudo no vazio entre o anel e o solo. Isso prende o anel e evita recalques na superfície.' },
  { t: 'Avançar de novo', d: 'Os macacos voltam a se apoiar no anel recém-montado e o ciclo recomeça. O solo escavado sai o tempo todo pela rosca e pela correia, até o poço.' },
];
export const TBM_LABELS = [
  { k: 'head', t: 'Cabeça de corte' },
  { k: 'chamber', t: 'Câmara de pressão' },
  { k: 'screw', t: 'Rosca de extração' },
  { k: 'jacks', t: 'Macacos' },
  { k: 'rings', t: 'Aduelas' },
  { k: 'grout', t: 'Graute' },
  { k: 'train', t: 'Trem de apoio' },
  { k: 'shaft', t: 'Poço de ataque', fixed: [0, -70] },
  { k: 'water', t: 'Lençol freático', fixed: [0, 0] },
  { k: 'settle', t: 'Marcos de recalque', fixed: [0, -64] },
];

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));

const dm = (c, o = {}) => new THREE.MeshStandardMaterial({
  color: c, roughness: o.r ?? 0.6, metalness: o.m ?? 0.12, side: THREE.DoubleSide,
  transparent: o.t != null, opacity: o.t ?? 1, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
});
function cylZ(rt, rb, h, mat, open = false, seg = 36) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  g.rotateX(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}
const noShadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } }); return o; };

export function createTBM(engine, section) {
  const { tx, yc, z0, Rb, Rs, Rl, Ri, L, Lt } = TBM;
  const root = new THREE.Group();
  root.visible = false;

  // ------------------------------------------------------------ poço
  const sh = TBM.shaft, shBottom = yc - Rb - 1.0, shTop = 1.2;
  const shaftWall = new THREE.Mesh(new THREE.CylinderGeometry(sh.r, sh.r, shTop - shBottom, 48, 1, true), dm(0xbab6ad, { r: 0.9, m: 0 }));
  shaftWall.position.set(tx, (shTop + shBottom) / 2, sh.zc);
  const shaftFloor = new THREE.Mesh(new THREE.CircleGeometry(sh.r, 48), dm(0x8d8a83, { r: 1, m: 0 }));
  shaftFloor.rotation.x = -Math.PI / 2; shaftFloor.position.set(tx, shBottom + 0.02, sh.zc);
  root.add(shaftWall, shaftFloor);

  // ------------------------------------------------------------ máquina
  const M = new THREE.Group(); root.add(M);
  const cOrange = dm(0xe8742c, { r: 0.5, m: 0.2 }), cDark = dm(0x3a3e45, { r: 0.5, m: 0.4 }), cYel = dm(0xf2b705, { r: 0.55, m: 0.15 });
  const cYelD = dm(0xc99700, { r: 0.6, m: 0.15 }), cSteel = dm(0x9aa3ad, { r: 0.45, m: 0.5 }), cGray = dm(0x8d939b, { r: 0.7, m: 0.3 });

  // cabeça de corte (gira)
  const head = new THREE.Group(); head.position.z = 0.3; M.add(head);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.24, 10, 44), cOrange); head.add(ring);
  for (let i = 0; i < 6; i++) {
    const a = new THREE.Group(); a.rotation.z = (i * Math.PI) / 3;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.0, 0.38), cOrange); spoke.position.y = 1.55; a.add(spoke);
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.34), cDark); tooth.position.set(0, 2.9, -0.2); a.add(tooth);
    const tooth2 = tooth.clone(); tooth2.position.set(0, 1.8, -0.2); a.add(tooth2);
    head.add(a);
  }
  head.add(cylZ(0.85, 0.85, 0.7, cDark, false, 20));
  // escudo
  const skin = cylZ(Rs, Rs, Lt - 0.5, cYel, true, 48); skin.position.z = 0.5 + (Lt - 0.5) / 2; M.add(skin);
  const artic = cylZ(Rs + 0.03, Rs + 0.03, 0.14, cYelD, true, 48); artic.position.z = 3.4; M.add(artic);
  const bulk = cylZ(3.1, 3.1, 0.26, cGray, false, 40); bulk.position.z = 2.0; M.add(bulk);
  const fill = cylZ(2.9, 2.9, 1.45, dm(0x8a6f52, { r: 1, m: 0 }), false, 40); fill.position.z = 1.25; M.add(fill);
  const bulkF = cylZ(3.1, 3.1, 0.2, cGray, false, 40); bulkF.position.z = 0.5; M.add(bulkF);
  // rosca de extração
  const P0 = new THREE.Vector3(0, -2.1, 1.4), P1 = new THREE.Vector3(0.9, -1.0, 6.3);
  const sd = P1.clone().sub(P0), slen = sd.length();
  const screw = new THREE.Group();
  screw.position.copy(P0).add(P1).multiplyScalar(0.5);
  screw.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sd.clone().normalize());
  const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, slen, 18, 1, true), dm(0xaeb6bf, { t: 0.4, r: 0.4, m: 0.4 }));
  const helixPts = [];
  for (let i = 0; i <= 140; i++) { const a = (i / 140) * Math.PI * 2 * 6; helixPts.push(new THREE.Vector3(Math.cos(a) * 0.4, -slen / 2 + (i / 140) * slen, Math.sin(a) * 0.4)); }
  const helix = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 220, 0.075, 6, false), cDark);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, slen, 8), cSteel);
  const screwSpin = new THREE.Group(); screwSpin.add(helix, axle);
  screw.add(casing, screwSpin); M.add(screw);
  // macacos
  const jacks = [];
  const thrust = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.14, 8, 44), cGray); thrust.position.z = BT - 0.05; M.add(thrust);
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6 + Math.PI / 12;
    const x = Math.cos(a) * 2.75, y = Math.sin(a) * 2.75;
    const body = cylZ(0.19, 0.19, 0.95, cGray, false, 10); body.position.set(x, y, BT - 0.5);
    const rod = cylZ(0.09, 0.09, 1, cSteel, false, 8);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.12), cDark);
    M.add(body, rod, pad); jacks.push({ rod, pad, x, y });
  }
  // erector
  const erector = new THREE.Group(); M.add(erector);
  const cBlue = dm(0x2f7fc1, { r: 0.5, m: 0.2 });
  const eArm = new THREE.Mesh(new THREE.BoxGeometry(1, 0.34, 0.34), cBlue); eArm.geometry.translate(0.5, 0, 0);
  const eGrip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.95, 1.3), cBlue);
  const eHub = cylZ(0.5, 0.5, 0.9, cBlue, false, 16);
  const eRot = new THREE.Group(); eRot.add(eArm, eGrip); erector.add(eHub, eRot);
  // bicos de graute
  const nozzles = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + 0.2;
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), dm(0x3d86b8, { e: 0x3d86b8, ei: 0.0 }));
    n.position.set(Math.cos(a) * (Rs + 0.05), Math.sin(a) * (Rs + 0.05), Lt - 0.15);
    M.add(n); nozzles.push(n);
  }
  // trem de apoio
  const train = new THREE.Group(); M.add(train);
  const deckM = dm(0x5a5e66, { r: 0.7, m: 0.3 });
  for (const [b, len] of [[Lt + 2.6, 3.8], [Lt + 7.4, 3.8]]) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, len), deckM); deck.position.set(0, -1.75, b); train.add(deck);
    for (const sx of [-1.55, 1.55]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 0.16), cYel);
      for (const dz of [-1.7, 1.7]) { const p = post.clone(); p.position.set(sx, -0.9, b + dz); train.add(p); }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, len), cYel); rail.position.set(sx, -0.1, b); train.add(rail);
    }
  }
  const stackM = dm(0xcfcac0, { r: 0.9, m: 0 });
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 1.3), stackM); s.position.set(0, -1.4 + i * 0.44, Lt + 2.6 + (i - 1) * 0.0); s.scale.z = 1 - i * 0.0; train.add(s);
  }
  const trafo = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.3, 2.2), dm(0x3d86b8, { r: 0.6, m: 0.2 })); trafo.position.set(0, -1.0, Lt + 7.4); train.add(trafo);

  // ------------------------------------------------------------ revestimento (aduelas) e graute
  const SEG_W = (Math.PI / 3) * 0.98, SEG_D = L - 0.06;
  const segGeo = [];
  for (let j = 0; j < 6; j++) {
    const c = -Math.PI / 2 + (j * Math.PI) / 3, a0 = c - SEG_W / 2, a1 = c + SEG_W / 2;
    const s = new THREE.Shape();
    s.absarc(0, 0, Rl, a0, a1, false); s.absarc(0, 0, Ri, a1, a0, true); s.closePath();
    segGeo.push(new THREE.ExtrudeGeometry(s, { depth: SEG_D, bevelEnabled: false, curveSegments: 6 }));
  }
  const segMats = [dm(0xe4dfd3, { r: 0.9, m: 0 }), dm(0xb7b0a2, { r: 0.9, m: 0 })];
  const keyMat = dm(0xf3efe6, { r: 0.9, m: 0 });
  const moveMat = dm(0xffa83a, { r: 0.6, m: 0, e: 0x7a3d00, ei: 0.8 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x4a4740 });
  const segEdges = segGeo.map((g) => new THREE.EdgesGeometry(g, 20));
  const gShape = new THREE.Shape(); gShape.absarc(0, 0, Rb, 0, Math.PI * 2, false);
  const gHole = new THREE.Path(); gHole.absarc(0, 0, Rl, 0, Math.PI * 2, true); gShape.holes.push(gHole);
  const groutGeo = new THREE.ExtrudeGeometry(gShape, { depth: L - 0.02, bevelEnabled: false, curveSegments: 40 });
  const FRESH = new THREE.Color(0x7fd0e8), SET = new THREE.Color(0xb3ada0);
  const NS = TBM.NMAX + 2;
  const slots = [];
  const order = [0, 1, 5, 2, 4, 3]; // de baixo para cima; a aduela de fecho é a do topo
  for (let k = 0; k < NS; k++) {
    const zStart = z0 - (k + 1) * L + 0.03, stagger = (k % 2) * (Math.PI / 6);
    const segs = [];
    for (let j = 0; j < 6; j++) {
      const base = j === 3 ? keyMat : segMats[(j + k) % 2];
      const m = new THREE.Mesh(segGeo[j], base); m.userData.base = base;
      m.add(new THREE.LineSegments(segEdges[j], edgeMat));
      m.position.set(tx, yc, zStart); m.rotation.z = stagger; m.visible = false;
      root.add(m); segs.push(m);
    }
    const gm = dm(0xb3ada0, { r: 1, m: 0 });
    const g = new THREE.Mesh(groutGeo, gm); g.position.set(tx, yc, z0 - (k + 1) * L + 0.01); g.visible = false; root.add(g);
    slots.push({ segs, grout: g, gm, zStart, stagger, t0: -999 });
  }

  // ------------------------------------------------------------ correia, piso, duto, elevador
  const beltM = dm(0x2c2f34, { r: 0.8, m: 0.2 });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 1), beltM); root.add(belt);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.2, 1), dm(0x9a968d, { r: 0.95, m: 0 })); root.add(floor);
  const duct = cylZ(0.5, 0.5, 1, dm(0xe8742c, { r: 0.6, m: 0.1 }), false, 14); root.add(duct);
  const Q1 = new THREE.Vector3(tx + 0.9, yc - 0.82, z0), Q2 = new THREE.Vector3(tx + 0.9, 2.4, -17.3);
  const incl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, Q1.distanceTo(Q2)), beltM);
  incl.position.copy(Q1).add(Q2).multiplyScalar(0.5); incl.lookAt(Q2); root.add(incl);
  const hopper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.2), cGray); hopper.position.set(tx + 0.9, 1.0, -16.1); root.add(hopper);
  const pile = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.6, 14), dm(0x8a6f52, { r: 1, m: 0 })); pile.position.set(tx + 0.9, 0.8, -14.0); root.add(pile);
  const NB = 44, blobs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 8, 6), dm(0x8a6f52, { r: 1, m: 0 }), NB);
  blobs.frustumCulled = false; root.add(blobs);
  const bm = new THREE.Matrix4(), qq = new THREE.Vector3();

  // luzes internas
  const lamp1 = new THREE.PointLight(0xfff1d6, 70, 40, 1.8); root.add(lamp1);
  const lamp2 = new THREE.PointLight(0xfff1d6, 30, 30, 1.8); lamp2.position.set(tx - 4, -4, -22); root.add(lamp2);

  noShadow(root);

  // ------------------------------------------------------------ estado da animação
  const st = {
    active: false, speed: 1, paused: false,
    n: TBM.N0, tc: 0, simT: 0, hold: 0, omega: 0, step: 0, progress: 0, sHead: 0, zHead: 0, rings: TBM.N0,
  };
  const anchors = Object.fromEntries(TBM_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const bNA = bounds(tx, -45).naTop;
  anchors.water.set(tx, bNA, -50);
  anchors.shaft.set(tx, 4.4, sh.zc);
  // marcos de recalque na superfície sobre o traçado (afundam depois da passagem da máquina, exagerado)
  const pinZ = Array.from({ length: 9 }, (_, i) => z0 - 4 - i * 3.2);
  const pins = pinZ.map((z) => {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0xf4f1ea }));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xd23b2e }));
    post.position.y = 1.2; cap.position.y = 2.0; g.add(post, cap);
    g.position.set(tx + 1.6, 0, z); root.add(g); return g;
  });
  anchors.settle.set(tx + 1.6, 2.4, pinZ[4]);

  function resetRings() {
    st.n = TBM.N0; st.tc = 0; st.hold = 0;
    slots.forEach((s, k) => {
      const built = k < TBM.N0;
      s.segs.forEach((m) => { m.visible = built; m.scale.set(1, 1, 1); m.rotation.z = s.stagger; m.position.z = s.zStart; });
      s.grout.visible = built; s.gm.color.copy(SET); s.t0 = -999;
    });
  }
  const settleSeg = (slot, m) => { m.visible = true; m.material = m.userData.base; m.scale.set(1, 1, 1); m.rotation.z = slot.stagger; m.position.z = slot.zStart; };
  function placeSeg(slot, j, zHead, p, nowAngleOut) {
    // posição da aduela j do anel 'slot' durante a montagem (p de 0 a 1)
    const m = slot.segs[j];
    const slotAng = -Math.PI / 2 + (j * Math.PI) / 3 + slot.stagger;
    const pickB = Lt + 2.7, slotB = BT + L / 2;
    let ang, r, b;
    if (p < 0.38) { const q = ease(p / 0.38); ang = -Math.PI / 2; r = 1.8 + ((Rl + Ri) / 2 - 1.8) * q; b = pickB + (slotB - pickB) * q; }
    else {
      const q = ease((p - 0.38) / 0.62);
      let d = slotAng - -Math.PI / 2; d = Math.atan2(Math.sin(d), Math.cos(d));
      ang = -Math.PI / 2 + d * q; r = (Rl + Ri) / 2; b = slotB;
    }
    const rr = Math.max(0.5, r) / ((Rl + Ri) / 2);
    m.visible = true; m.material = moveMat; m.scale.set(rr, rr, 1);
    m.rotation.z = slot.stagger + (ang - slotAng);
    m.position.z = zHead + b - SEG_D / 2;
    nowAngleOut.ang = ang; nowAngleOut.r = Math.max(0.5, r); nowAngleOut.b = b;
  }

  const tmpA = { ang: -Math.PI / 2, r: 1.6, b: Lt - 0.8 };
  function update(dt, t) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    st.simT += k;
    // ---- máquina de estados do ciclo
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) resetRings(); }
    else st.tc += k;
    if (st.tc >= CYCLE) {
      st.tc -= CYCLE;
      st.n += 1;
      if (st.n > TBM.NMAX) { st.hold = 3.5; st.n = TBM.NMAX; st.tc = CYCLE - 0.001; }
    }
    const tc = st.tc;
    let phase, u = 1, ext = 0, ta = 0;
    if (tc < T.stroke) { phase = 0; u = ease(tc / T.stroke); ext = u * L; }
    else if (tc < T.stroke + T.asm) { phase = 1; ta = tc - T.stroke; ext = L * (1 - ease(ta / 0.6)); }
    else if (tc < T.stroke + T.asm + T.grout) { phase = 2; ta = tc - T.stroke - T.asm; }
    else { phase = 3; ta = tc - T.stroke - T.asm - T.grout; }
    st.step = phase; st.progress = phase === 0 ? tc / T.stroke : phase === 1 ? ta / T.asm : phase === 2 ? ta / T.grout : ta / T.rest;
    const n = st.n;
    const sHead = n * L + u * L + BT; st.sHead = sHead;
    const zHead = z0 - sHead; st.zHead = zHead;
    M.position.set(tx, yc, zHead);
    pins.forEach((g, i) => { const d = pinZ[i] - zHead; g.position.y = -0.9 * ease((d + 3) / 12); });
    section.setBand(1, zHead - 0.02, z0, yc - Rb, yc + Rb);

    // ---- cabeça, rosca
    const wT = phase === 0 ? 1.5 : phase === 3 ? 0.9 * ease(ta / T.rest) : 0.0;
    st.omega += (wT - st.omega) * (1 - Math.exp(-k * 3 / Math.max(st.speed, 1) - 0.0001));
    head.rotation.z -= st.omega * k;
    screwSpin.rotation.y += (phase === 0 ? 5 : 2.2) * k;

    // ---- macacos
    const brk = (phase === 3 || phase === 2) ? 0 : ext;
    for (const j of jacks) {
      j.rod.scale.z = Math.max(0.001, brk); j.rod.position.set(j.x, j.y, BT + brk / 2);
      j.pad.position.set(j.x, j.y, BT + brk + 0.06);
    }

    // ---- aduelas
    const slot = slots[n];
    let eAng = -Math.PI / 2, eR = 1.6, eB = Lt - 0.9, grip = 0;
    if (phase === 0) { slot.segs.forEach((m) => (m.visible = false)); slot.grout.visible = false; }
    if (phase === 1) {
      const ts = Math.max(0, ta - 0.6), dS = (T.asm - 0.9) / 6;
      const idx = Math.min(6, Math.floor(ts / dS));
      for (let i = 0; i < 6; i++) {
        const j = order[i];
        if (i < idx) settleSeg(slot, slot.segs[j]);
        else if (i === idx && ta >= 0.6) { placeSeg(slot, j, zHead, (ts - idx * dS) / dS, tmpA); eAng = tmpA.ang; eR = tmpA.r; eB = tmpA.b; grip = 1; }
        else slot.segs[j].visible = false;
      }
      if (idx >= 6) slot.segs.forEach((m) => settleSeg(slot, m));
    }
    if (phase >= 2) slot.segs.forEach((m) => settleSeg(slot, m));
    erector.position.set(0, 0, eB);
    eRot.rotation.z = eAng; eArm.scale.x = eR; eGrip.position.set(eR, 0, 0); eGrip.rotation.z = 0; eGrip.visible = grip > 0 || true;

    // ---- graute
    for (const nz of nozzles) { nz.material.emissiveIntensity = phase === 2 ? 1.2 + Math.sin(st.simT * 14) * 0.8 : 0; nz.scale.setScalar(phase === 2 ? 1.25 : 1); }
    if (phase === 2 && ta > 0.35 && !slot.grout.visible) { slot.grout.visible = true; slot.t0 = st.simT; }
    for (let i = 0; i <= n; i++) {
      const s = slots[i];
      if (!s.grout.visible) continue;
      const f = clamp01((st.simT - s.t0) / 22);
      s.gm.color.copy(FRESH).lerp(SET, f);
    }
    st.rings = n + (phase >= 1 ? (phase === 1 ? 0 : 1) : 0);

    // ---- correia, piso, duto
    const tailZ = zHead + Lt;
    // trecho da correia no túnel: de (zHead + 6.3) até o poço (z0), z decrescente
    const bStart = zHead + 6.3, bLen = Math.max(0.2, z0 - bStart);
    belt.scale.z = bLen; belt.position.set(tx + 0.9, yc - 0.95, bStart + bLen / 2);
    floor.scale.z = Math.max(0.2, z0 - tailZ); floor.position.set(tx, yc - 2.0, tailZ + floor.scale.z / 2 - 0.0);
    // (o piso fica abaixo do trem de apoio)
    duct.scale.z = Math.max(0.2, z0 - tailZ); duct.position.set(tx + 1.0, yc + 1.95, tailZ + duct.scale.z / 2);
    // blocos de solo na correia e no elevador
    const seg1 = bLen, seg2 = Q1.distanceTo(Q2), tot = seg1 + seg2;
    const spd = 3.2, gap = 1.9, Lmax = NB * gap;
    for (let i = 0; i < NB; i++) {
      const q = ((st.simT * spd + i * gap) % Lmax);
      if (q > tot) { bm.makeScale(0, 0, 0); blobs.setMatrixAt(i, bm); continue; }
      if (q < seg1) qq.set(tx + 0.9, yc - 0.78, bStart + q);
      else { const f = (q - seg1) / seg2; qq.copy(Q1).lerp(Q2, f); qq.y += 0.22; }
      bm.makeTranslation(qq.x, qq.y, qq.z); blobs.setMatrixAt(i, bm);
    }
    blobs.instanceMatrix.needsUpdate = true;

    // ---- luzes e âncoras de rótulos
    lamp1.position.set(tx - 4.5, yc + 0.5, zHead + 7);
    anchors.head.set(tx, yc + 3.3, zHead + 0.3);
    anchors.chamber.set(tx, yc + 3.3, zHead + 1.3);
    anchors.screw.set(tx + 0.4, yc - 1.5, zHead + 3.9);
    anchors.jacks.set(tx, yc + 2.8, zHead + BT + 0.4);
    anchors.rings.set(tx, yc + 2.8, z0 - (Math.max(1, n - 1) + 0.5) * L);
    anchors.grout.set(tx, yc + 3.12, z0 - (Math.max(1, n - 3) + 0.5) * L);
    anchors.train.set(tx, yc - 0.4, zHead + Lt + 2.6);
  }

  return {
    group: root, state: st, anchors, update,
    enter() { st.active = true; root.visible = true; section.setBand(0, sh.zc - sh.r, sh.zc + sh.r, shBottom, 1e3); resetRings(); st.simT = 0; st.omega = 0; },
    exit() { st.active = false; root.visible = false; },
  };
}
