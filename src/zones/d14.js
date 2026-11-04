import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person, plateCompactor } from './fund.js';
import { X1, PZ, SITE_BOX, vplane, baseBox, depthMat, strataQuad, soilColorAt, buildSurroundings } from './dsite.js';
import { hideDPit, showDPit } from './dpit.js';
import { bar2 } from './dwall.js';

// ---------------------------------------------------------------------------
// D14 — Vala urbana escorada (rede de água/esgoto sob a rua). A vala corre ao longo de x e a seção em x = X1
// a corta de lado a lado: pavimento, blindagem metálica, berço, tubo e reaterro compactado em camadas.
// Escala exagerada: vala de 3 m de largura e 3,6 m de profundidade, tubo de 0,8 m.
// ---------------------------------------------------------------------------
const ZT0 = -28, ZT1 = -25, ZC = -26.5, HW = 1.5, PXT = 14, XT = X1 + PXT + 0.5, DMAX = 3.6, BEDH = 0.35, FB = -3.25, NLY = 8, LYH = 3.25 / NLY;
const HS = 4.1, ML = 4.2, MX = [X1 + 2.1, X1 + 6.5, X1 + 10.9], PY = FB + 0.4, XP = X1 - 0.045;
const T = { cones: [1, 4], cut: [3, 12], dig1: [14, 22], ins: [23, 24.6, 26.2], dig2: [29, 41], haul: [41, 50], bed: [46, 50], pipes: [53, 60, 67], F0: 74, dtL: 5, pull: [114, 118], close: 118.5, pav: 119, END: 142 };
T.free = T.pav + 17;
export const D14 = { box: SITE_BOX };
export const D14_STEP_STARTS = [0, 14, 46, 74, 119];
export const D14_STEPS = [
  { t: 'Sinalizar, desviar o trânsito e cortar o pavimento', d: 'Antes de abrir a vala, cones e barreiras isolam o trecho e um sinaleiro orienta os carros pela faixa livre. O asfalto é serrado nas bordas e quebrado, para a vala ter bordas limpas e o pavimento vizinho não se danificar.' },
  { t: 'Escavar e instalar a blindagem', d: 'A escavadeira abre a vala até cerca de 1,5 m e o solo é levado por caminhão. Em vala funda, as paredes podem desmoronar sobre quem trabalha embaixo. Por isso entra a blindagem metálica: caixas de aço com escoras hidráulicas, que descem à medida que a escavação avança.' },
  { t: 'Berço e assentamento do tubo', d: 'O fundo recebe um berço de areia, que apoia o tubo por igual. O caminhão com guindaste levanta cada tubo, gira e o desce na vala, onde o encaixe é feito junto ao tubo anterior e a junta é vedada. Tubo mal apoiado ou mal encaixado vaza e se deforma.' },
  { t: 'Reaterro compactado, retirando a blindagem', d: 'O reaterro sobe em camadas de cerca de 40 cm, compactadas com o compactador de placa. As primeiras camadas, ao lado do tubo, são compactadas com cuidado para não danificá-lo. A blindagem sobe junto com o aterro, nunca antes. Uma fita de aviso marca a rede, acima do tubo.' },
  { t: 'Repor o pavimento e liberar o trânsito', d: 'Sobre o aterro vai a base de brita compactada e depois o asfalto quente, espalhado pela vibroacabadora e compactado pelo rolo. Com o pavimento pronto, os cones saem e a faixa fechada volta a ser usada.' },
];
export const D14_LABELS = [
  { k: 'cone', t: 'Cones e barreiras' }, { k: 'pav', t: 'Pavimento (asfalto e base)' }, { k: 'vala', t: 'Vala' }, { k: 'blind', t: 'Blindagem metálica' }, { k: 'escora', t: 'Escora hidráulica' },
  { k: 'berco', t: 'Berço de areia' }, { k: 'tubo', t: 'Tubo' }, { k: 'junta', t: 'Junta do tubo' }, { k: 'fita', t: 'Fita de aviso' }, { k: 'aterro', t: 'Aterro compactado' },
  { k: 'placa', t: 'Compactador de placa' }, { k: 'escav', t: 'Escavadeira' }, { k: 'munck', t: 'Caminhão com guindaste' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const D14_CAM = { tx: X1, ty: 0.6, tz: -27, yaw: -1.3, pitch: 0.2, dist: 30 };
export const D14_MCAM = { tx: X1, ty: -0.5, tz: -27, yaw: -1.3, pitch: 0.2, dist: 66 };

const earthL = new THREE.Color(0xc29a64), earthC = new THREE.Color(0x8a6a43);

export function createD14(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const sur = buildSurroundings(root, { building: false, street: false });

  // --- rua: pavimento em duas camadas (base + asfalto) e calçadas, com corte no plano da seção
  const XR = X1 + 24;
  function slab(z0, z1, cols, hs, x1 = XR) {
    const layers = []; let y = 0;
    cols.forEach((c, i) => {
      const bm = mat(c, { r: 0.95 }), cm = noclip(c, { r: 1, e: 0x1a1816 });
      const b = baseBox(x1 - X1, hs[i], z1 - z0, bm); b.position.set((X1 + x1) / 2, y, (z0 + z1) / 2); b.receiveShadow = true; root.add(b);
      const cp = vplane(z1 - z0, cm); cp.position.set(X1 - 0.02, y, (z0 + z1) / 2); cp.scale.y = hs[i]; cp.renderOrder = 3; root.add(cp);
      layers.push({ b, cp, h: hs[i] }); y += hs[i];
    });
    return layers;
  }
  const BASEC = 0x8e8a80, ASPC = 0x3f4248, WALK = 0xcfcac0;
  slab(-35, ZT0, [BASEC, ASPC], [0.14, 0.06]); slab(ZT1, -18, [BASEC, ASPC], [0.14, 0.06]);
  slab(-38, -35, [WALK], [0.2]); slab(-18, -15, [WALK], [0.2]);
  const oldP = slab(ZT0, ZT1, [BASEC, ASPC], [0.14, 0.06]);
  const newP = slab(ZT0, ZT1, [BASEC, ASPC], [0.14, 0.06], XR);
  for (let x = 1; x < 23; x += 4) { const l = baseBox(2, 0.02, 0.15, mat(0xf2efe6)); l.position.set(X1 + x, 0.2, -26.5 - 5); root.add(l); const l2 = baseBox(2, 0.02, 0.15, mat(0xf2efe6)); l2.position.set(X1 + x, 0.2, -21.5); root.add(l2); }

  // --- cones, barreira e placa
  const coneG = new THREE.ConeGeometry(0.28, 0.75, 8); coneG.translate(0, 0.375, 0);
  const cones = new THREE.InstancedMesh(coneG, mat(0xf26b1d), 18); cones.frustumCulled = false; cones.castShadow = true; root.add(cones);
  const conePos = []; for (let i = 0; i < 7; i++) { conePos.push([X1 + 1.5 + i * 2, -28.7], [X1 + 1.5 + i * 2, -24.3]); } for (const z of [-28.7, -27.5, -26.5, -25.5]) conePos.push([X1 + 15.5, z]);
  const barr = new THREE.Group(); for (let i = 0; i < 6; i++) { const b = baseBox(0.12, 0.35, 0.55, mat(i % 2 ? 0xf2efe6 : 0xe0482b)); b.position.set(X1 + 16.4, 0.7, -29.2 + i * 0.55 + 0.0); barr.add(b); }
  const barP = baseBox(0.1, 0.7, 3.4, mat(0xf2efe6)); barP.position.set(X1 + 16.4, 0.2, -27.5); barr.add(barP);
  const sign = new THREE.Group(); { const pole = baseBox(0.08, 1.6, 0.08, mat(0x555a60)); sign.add(pole); const pl = baseBox(0.06, 0.8, 1.0, mat(0xf2b705)); pl.position.y = 1.3; sign.add(pl); sign.position.set(X1 + 17.2, 0.2, -30.0); }
  barr.add(sign); root.add(barr);
  const flag = person(0xf26b1d, 0xf2b705); root.add(flag.group);

  // --- carros pela faixa livre (norte) e, no fim, também pela faixa reaberta (sul)
  const glass = mat(0x9ec3da, { r: 0.3, e: 0x20323f });
  const mkCar = (col) => { const c = new THREE.Group(); const bxm = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; return o; }; c.add(bxm(3.4, 0.7, 1.6, mat(col, { r: 0.4, m: 0.2 }), 0, 0.6, 0), bxm(1.8, 0.6, 1.4, glass, -0.2, 1.2, 0)); for (const x of [-1.1, 1.1]) for (const z of [-0.8, 0.8]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 10), mat(0x222428)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.33, z); c.add(w); } c.rotation.y = Math.PI; root.add(c); return c; };
  const cars = [[0xd84a3a, 0, -33.2, 6, 0], [0x3a79c4, 11, -33.2, 6, 0], [0xe9c43a, 4, -19.6, 5.5, 1], [0x6aa36a, 15, -19.6, 5.5, 1]].map(([col, x0, z, sp, s]) => ({ c: mkCar(col), x0, z, sp, s }));

  // --- vala
  const U = { value: 0 }, wm = depthMat(U);
  const tw = [strataQuad(X1, ZT0, XT, ZT0, -DMAX - 0.3, 0), strataQuad(X1, ZT1, XT, ZT1, -DMAX - 0.3, 0), strataQuad(XT, ZT0, XT, ZT1, -DMAX - 0.3, 0)].map((g) => { const m = new THREE.Mesh(g, wm); m.visible = false; m.receiveShadow = true; root.add(m); return m; });
  const floorM = mat(0x86683f, { r: 1, e: 0x1a1308 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(XT - X1, ZT1 - ZT0), floorM); floor.rotation.x = -Math.PI / 2; floor.visible = false; floor.receiveShadow = true; root.add(floor);
  const dAt = (t) => 1.5 * ease(win(t, T.dig1[0], T.dig1[1])) + 2.1 * ease(win(t, T.dig2[0], T.dig2[1]));

  // --- blindagem metálica: 3 módulos com escoras hidráulicas; módulo 0 também desenhado no corte
  const plateM = mat(0x2d7d9a, { r: 0.45, m: 0.4 }), strutM = mat(0xe0a030, { r: 0.5, m: 0.3 }), plateC = noclip(0x2d7d9a, { r: 0.5, e: 0x0c2630 }), strutC = noclip(0xe0a030, { r: 0.5, e: 0x3a2808 });
  const mods = MX.map((xc) => {
    const g = new THREE.Group(); g.visible = false; root.add(g);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(ML, HS, 0.16), plateM); p.position.set(xc, -HS / 2, ZC + s * (HW - 0.1)); p.castShadow = true; g.add(p); }
    for (const yl of [-0.8, -2.3]) for (const dx of [-1.3, 1.3]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2 * (HW - 0.2), 8), strutM); c.rotation.x = Math.PI / 2; c.position.set(xc + dx, yl, ZC); c.castShadow = true; g.add(c); }
    return g;
  });
  const planeG = new THREE.Group(); planeG.visible = false; root.add(planeG);
  for (const s of [-1, 1]) { const c = vplane(0.16, plateC); c.scale.y = HS; c.position.set(X1 - 0.03, -HS, ZC + s * (HW - 0.1)); c.renderOrder = 5; planeG.add(c); }
  for (const yl of [-0.8, -2.3]) planeG.add(bar2(ZC - HW + 0.2, yl, ZC + HW - 0.2, yl, 0.14, strutC, 6));

  // --- berço, tubos, juntas e camadas do reaterro
  const bedM = mat(0xd2b87a, { r: 1 }), bedC = noclip(0xd2b87a, { r: 1, e: 0x2a2210 });
  const bed = baseBox(PXT, BEDH, 3.0, bedM); bed.position.set(X1 + PXT / 2, -DMAX, ZC); bed.visible = false; root.add(bed);
  const bedCap = vplane(3.0, bedC); bedCap.position.set(X1 - 0.02, -DMAX, ZC); bedCap.renderOrder = 3; bedCap.visible = false; root.add(bedCap);
  const pipeG = new THREE.CylinderGeometry(0.4, 0.4, 4.1, 20); pipeG.rotateZ(Math.PI / 2);
  const pipeM = mat(0xb8b4aa, { r: 0.8 }), jointM = mat(0x4a4f57, { r: 0.6 });
  const pipes = MX.map((xc) => { const m = new THREE.Mesh(pipeG, pipeM); m.castShadow = true; m.visible = false; root.add(m); return m; });
  const joints = [0, 1].map((i) => { const g = new THREE.CylinderGeometry(0.46, 0.46, 0.35, 20); g.rotateZ(Math.PI / 2); const m = new THREE.Mesh(g, jointM); m.position.set(X1 + 4.3 + 4.4 * i, PY, ZC); m.visible = false; root.add(m); return m; });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.4, 24), noclip(0xb8b4aa, { r: 0.9, e: 0x25231f })); ring.rotation.y = -Math.PI / 2; ring.position.set(X1 - 0.05, PY, ZC); ring.renderOrder = 6; ring.visible = false; root.add(ring);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), noclip(0x1c1e22, { r: 1 })); hole.rotation.y = -Math.PI / 2; hole.position.set(X1 - 0.047, PY, ZC); hole.renderOrder = 6; hole.visible = false; root.add(hole);
  const layers = [];
  for (let k = 0; k < NLY; k++) {
    const bM = mat(0xc29a64, { r: 1 }), cM = noclip(0xc29a64, { r: 1, e: 0x20190f });
    const b = baseBox(PXT, LYH, 3.0, bM); b.position.set(X1 + PXT / 2, FB + k * LYH, ZC); b.visible = false; b.receiveShadow = true; root.add(b);
    const c = vplane(3.0, cM); c.position.set(X1 - 0.012, FB + k * LYH, ZC); c.renderOrder = 2; c.visible = false; root.add(c);
    layers.push({ b, c, bM, cM });
  }
  const tapeY = FB + 6 * LYH + 0.06;
  const tapeM = noclip(0xf2c500, { r: 0.7, e: 0x5a4a00 }); const tape3 = new THREE.Mesh(new THREE.BoxGeometry(PXT, 0.03, 0.4), mat(0xf2c500)); tape3.position.set(X1 + PXT / 2, tapeY + 0.02, ZC); tape3.visible = false; root.add(tape3);
  const tape2 = bar2(ZC - 0.35, tapeY, ZC + 0.35, tapeY, 0.06, tapeM, 8); tape2.visible = false; root.add(tape2);
  const plate = plateCompactor(); plate.group.visible = false; root.add(plate.group); const wP = person(0xf2b705, 0xffffff); wP.group.visible = false; root.add(wP.group);

  // --- máquinas: escavadeira, monte de solo, caminhão de bota-fora, caminhão com guindaste, vibroacabadora e rolo
  const exc = M.excavator(0.8); const excW = new THREE.Group(); exc.group.rotation.y = -Math.PI / 2; excW.add(exc.group); excW.visible = false; root.add(excW);
  const heap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.5, 10), mat(0x7a5a3a, { r: 1 })); heap.castShadow = true; heap.visible = false; root.add(heap);
  const dtruck = M.dumpTruck(0xe8b300); dtruck.scale.setScalar(0.85); dtruck.rotation.y = Math.PI; dtruck.visible = false; root.add(dtruck);
  const tfill = baseBox(3.8, 1, 2.4, mat(0x7a5a3a, { r: 1 })); tfill.position.set(2.1, 0.15, 0); tfill.visible = false; dtruck.userData.bed.add(tfill);
  const ct = new THREE.Group(); ct.visible = false; root.add(ct);
  { const bm = (sx, sy, sz, c, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c)); o.position.set(x, y, z); o.castShadow = true; return o; };
    ct.add(bm(6.4, 0.7, 2.3, 0x3a3d42, 0, 1.0, 0), bm(1.9, 1.7, 2.2, 0xf2eee6, 2.4, 1.9, 0), bm(0.9, 0.8, 2.0, 0x9ec3da, 3.1, 2.2, 0), bm(1.4, 1.3, 1.6, 0xe8b300, -1.2, 1.8, 0), bm(3.2, 0.5, 2.2, 0xe8b300, -1.5, 1.4, 0));
    for (const x of [-2.2, -0.8, 2.2]) for (const z of [1.2, -1.2]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.55, 12), mat(0x222428)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.7, z); ct.add(w); } }
  const unit = (m, sx, sy) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 1), m); o.visible = false; root.add(o); return o; };
  const seg = (o, a, b) => { o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.z = Math.max(0.01, a.distanceTo(b)); o.lookAt(b); o.visible = true; };
  const boom = unit(mat(0xe8b300), 0.35, 0.35), cable = unit(mat(0x1d2025), 0.05, 0.05), slL = unit(mat(0x1d2025), 0.04, 0.04), slR = unit(mat(0x1d2025), 0.04, 0.04);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), mat(0xd23b2e)); hook.visible = false; root.add(hook);
  const paver = M.paver(); paver.scale.setScalar(0.8); paver.visible = false; root.add(paver);
  const roller = M.roller(); roller.scale.setScalar(0.6); roller.visible = false; root.add(roller);
  const stockPipes = MX.map((xc) => { const m = new THREE.Mesh(pipeG, pipeM); m.castShadow = true; m.visible = false; root.add(m); return m; });
  const wA = person(0xe8742c), wB = person(0x4a8fd0); [wA, wB].forEach((p) => { p.group.visible = false; root.add(p.group); });

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(D14_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const fmt = (x, n = 1) => x.toFixed(n).replace('.', ',');
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const layerP = (t, k) => ease(win(t, T.F0 + k * T.dtL, T.F0 + k * T.dtL + 2.6));
  const fillSum = (t) => { let s = 0; for (let k = 0; k < NLY; k++) s += LYH * layerP(t, k); return s; };
  // posição do tubo i (centro) ao longo do tempo
  function pipePos(t, i, out) {
    const a = T.pipes[i], x = MX[i], zs = -23.5, ys = 0.6;
    if (t < a - 3) return out.set(x, ys, zs);
    if (t < a - 1.8) return out.set(x, ys + 4.2 * ease(win(t, a - 3, a - 1.8)), zs);
    if (t < a - 0.6) return out.set(x, ys + 4.2, zs + (ZC - zs) * ease(win(t, a - 1.8, a - 0.6)));
    return out.set(x, ys + 4.2 + (PY - ys - 4.2) * ease(win(t, a - 0.6, a + 3.4)), ZC);
  }

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc;
    sur.update(tAbs);

    // carros e sinalização
    cars.forEach(({ c, x0, z, sp, s }) => { const L = 30, u = ((x0 + tAbs * sp) % L + L) % L, x = X1 + 32 - u; c.visible = x > X1 + 2.4 && (s === 0 || t > T.free); c.position.set(x, 0.2, z); });
    const cu = ease(win(t, T.cones[0], T.cones[1])) * (1 - ease(win(t, T.pav + 15, T.pav + 17)));
    const m4 = new THREE.Matrix4(), q = new THREE.Matrix4();
    conePos.forEach(([x, z], i) => { m4.makeTranslation(x, 0.2, z); q.makeScale(Math.max(1e-4, cu), Math.max(1e-4, cu), Math.max(1e-4, cu)); cones.setMatrixAt(i, m4.multiply(q)); }); cones.instanceMatrix.needsUpdate = true;
    barr.visible = cu > 0.05;
    flag.group.visible = cu > 0.05; flag.group.position.set(X1 + 18.5, 0.2, -31.3); flag.group.rotation.y = -Math.PI / 2; flag.arm.rotation.z = -1.2 + 0.3 * Math.sin(tAbs * 2);

    // corte do pavimento existente
    const cutF = ease(win(t, T.cut[0], T.cut[1]));
    oldP.forEach((l) => { l.b.scale.z = Math.max(0.001, 1 - cutF); l.cp.scale.z = Math.max(0.001, 1 - cutF); l.b.visible = l.cp.visible = cutF < 0.99; });

    // vala
    const d = dAt(t), on = d > 0.02 && t < T.close; U.value = d;
    if (on) { terrainHoles[0].set(X1 - 1, XT, ZT0, ZT1); section.setBand(0, ZT0, ZT1, -d, 0.05); } else { terrainHoles[0].set(0, 0, 0, 0); section.setBand(0, 0, 0, 0, 0); }
    tw.forEach((m) => { m.visible = on; });
    floor.visible = on; floor.position.set((X1 + XT) / 2, -d - 0.01, ZC); soilColorAt(-d - 0.3, floorM.color); floorM.emissive.copy(floorM.color).multiplyScalar(0.25);

    // blindagem
    const fsum = fillSum(t), floorY = -DMAX + fsum, pullU = ease(win(t, T.pull[0], T.pull[1]));
    const shieldFloor = Math.max(-d, fsum > 0 ? floorY : -d);
    const sOn = t >= T.ins[0] && t < T.pull[1];
    mods.forEach((g, i) => { g.visible = sOn; if (!sOn) return; const top = shieldFloor + HS - 0.15 + (1 - ease(win(t, T.ins[i], T.ins[i] + 3))) * 6 + pullU * 7; g.position.y = top; if (i === 0) { planeG.visible = true; planeG.position.y = top; } });
    if (!sOn) planeG.visible = false;
    const topNow = mods[0].position.y;

    // escavadeira, monte de solo e caminhão de bota-fora
    const eS = ease(win(t, T.dig1[0] - 3, T.dig1[0])) * (1 - ease(win(t, T.pull[1], T.pull[1] + 3)));
    excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); excW.position.set(X1 + 9, 0.2, -30.6); exc.update(tAbs * 1.3);
    const digP = d / DMAX, fp = clamp01(fsum / 3.25);
    const hs = Math.max(digP * (1 - ease(win(t, T.haul[0] + 3, T.haul[1] - 2))), ease(win(t, T.F0 - 5, T.F0 - 1)) * (1 - fp));
    heap.visible = hs > 0.02; heap.scale.setScalar(Math.max(0.01, hs)); heap.position.set(X1 + 4.6, 0.2 + 0.75 * hs, -30.7);
    let dx = null, dfill = 0; { const a = T.haul[0], b = T.haul[1], xs = X1 + 36, xp = X1 + 6.5; if (t >= a && t < b) { dx = t < a + 3 ? xs + (xp - xs) * ease(win(t, a, a + 3)) : t < b - 3 ? xp : xp + (X1 + 1 - xp) * ease(win(t, b - 3, b)); dfill = clamp01((t - a - 3) / (b - a - 6)); } }
    dtruck.visible = dx !== null && dx > X1 + 3.25; if (dtruck.visible) dtruck.position.set(dx, 0.2, -30.8);
    tfill.visible = dtruck.visible && dfill > 0.02; tfill.scale.y = Math.max(0.01, 1.1 * dfill);

    // berço
    const bu = ease(win(t, T.bed[0], T.bed[1])); bed.visible = bedCap.visible = bu > 0.01; bed.scale.y = Math.max(0.001, bu); bedCap.scale.y = Math.max(0.001, BEDH * bu);

    // tubos, caminhão com guindaste, cabo e ganchos
    const pa = T.pipes; const act = pa.findIndex((a) => t >= a - 4 && t < a + 4.5);
    const arr = ease(win(t, pa[0] - 8, pa[0] - 4)), dep = ease(win(t, pa[2] + 5, pa[2] + 9));
    let cx = MX[0];
    if (t > pa[0]) cx = MX[0] + (MX[1] - MX[0]) * ease(win(t, pa[0] + 3.5, pa[1] - 4.5)) + (MX[2] - MX[1]) * ease(win(t, pa[1] + 3.5, pa[2] - 4.5));
    cx = cx + (X1 + 34 - MX[0]) * (1 - arr) + (X1 + 34 - cx) * dep;
    ct.visible = arr > 0.01 && dep < 0.99; ct.position.set(cx, 0.2, -21.3);
    stockPipes.forEach((m, i) => { m.visible = t > T.ins[0] && t < pa[i] - 3; m.position.set(MX[i], 0.6, -23.5); });
    pipes.forEach((m, i) => { m.visible = t >= pa[i] - 3; if (m.visible) { pipePos(t, i, v1); m.position.copy(v1); } });
    joints.forEach((m, i) => { m.visible = t > pa[i + 1] + 3.4; });
    const p0 = t > pa[0] + 3.4; ring.visible = hole.visible = p0;
    boom.visible = cable.visible = slL.visible = slR.visible = hook.visible = false;
    if (ct.visible) {
      const i = act >= 0 ? act : (t < pa[0] ? 0 : 2); pipePos(t, i, v1); const tip = v2.set(v1.x, 6.0, v1.z - 0.2); const base = v3.set(cx, 2.1, -21.9);
      const live = act >= 0;
      if (live) { seg(boom, base, tip); const hk = new THREE.Vector3(v1.x, v1.y + 1.5, v1.z); hook.position.copy(hk); hook.visible = true; seg(cable, tip, hk); seg(slL, hk, new THREE.Vector3(v1.x - 1.4, v1.y + 0.35, v1.z)); seg(slR, hk, new THREE.Vector3(v1.x + 1.4, v1.y + 0.35, v1.z)); }
      else { seg(boom, base, v2.set(cx, 4.4, -22.6)); }
    }

    // reaterro em camadas, compactador e fita
    let cur = -1;
    layers.forEach((L, i) => {
      const t0 = T.F0 + i * T.dtL, u = (t - t0) / T.dtL, f = layerP(t, i), comp = ease(win(u, 0.5, 0.95));
      L.b.visible = L.c.visible = f > 0.01; L.b.scale.y = Math.max(0.001, f); L.c.scale.y = Math.max(0.001, LYH * f);
      L.bM.color.copy(earthL).lerp(earthC, u >= 1 ? 1 : comp); L.cM.color.copy(L.bM.color); L.cM.emissive.copy(L.bM.color).multiplyScalar(0.25);
      if (u >= 0 && u < 1) cur = i;
    });
    const tapeOn = t > T.F0 + 6 * T.dtL + 3; tape3.visible = tape2.visible = tapeOn;
    const cl = cur >= 0 ? cur : -1, cu2 = cl >= 0 ? (t - (T.F0 + cl * T.dtL)) / T.dtL : 0, pOn = cl >= 0 && cu2 > 0.5;
    plate.group.visible = wP.group.visible = pOn;
    if (pOn) { const pp = 0.5 + 0.5 * Math.sin(tAbs * 1.4), ty = FB + (cl + 1) * LYH; plate.group.position.set(X1 + 2 + 9 * pp, ty, ZC + 0.4); plate.group.rotation.y = Math.cos(tAbs * 1.4) > 0 ? Math.PI / 2 : -Math.PI / 2; plate.shake(tAbs); wP.group.position.set(plate.group.position.x + (Math.cos(tAbs * 1.4) > 0 ? -0.9 : 0.9), ty, ZC + 0.4); wP.group.rotation.y = Math.cos(tAbs * 1.4) > 0 ? -Math.PI / 2 : Math.PI / 2; wP.upper.rotation.x = 0.25; }

    // pavimento novo, vibroacabadora, rolo
    const bu2 = ease(win(t, T.pav, T.pav + 3)), au = ease(win(t, T.pav + 4, T.pav + 8));
    newP[0].b.visible = newP[0].cp.visible = bu2 > 0.01; newP[0].b.scale.y = Math.max(0.001, bu2); newP[0].cp.scale.y = Math.max(0.001, 0.14 * bu2);
    newP[1].b.visible = newP[1].cp.visible = au > 0.01; newP[1].b.scale.y = Math.max(0.001, au); newP[1].cp.scale.y = Math.max(0.001, 0.06 * au);
    const pv = win(t, T.pav + 3, T.pav + 10), pvOn = pv > 0 && pv < 1;
    paver.visible = pvOn; if (pvOn) { paver.position.set(XR - 1 - 22 * ease(pv), 0.14, ZC); paver.rotation.y = Math.PI; }
    const rv = win(t, T.pav + 10, T.pav + 15), rvOn = rv > 0 && rv < 1;
    roller.visible = rvOn; if (rvOn) { const tri = rv < 0.5 ? rv * 2 : 2 - rv * 2; roller.position.set(X1 + 2 + 19 * tri, 0.2, ZC); roller.rotation.y = rv < 0.5 ? Math.PI : 0; }

    // trabalhadores
    const wv = t > T.cones[1] + 2 && t < T.pav + 16; wA.group.visible = wB.group.visible = wv;
    if (wv) { const u = 0.5 + 0.5 * Math.sin(tAbs * 0.3); wA.group.position.set(X1 + 3 + 6 * u, 0.2, -23.0 + (t > T.ins[0] && t < pa[2] ? 0.0 : 0)); wA.group.rotation.y = Math.cos(tAbs * 0.3) > 0 ? -Math.PI / 2 : Math.PI / 2; wB.group.position.set(X1 + 12 - 4 * u, 0.2, -23.0); wB.group.rotation.y = Math.cos(tAbs * 0.3) > 0 ? Math.PI / 2 : -Math.PI / 2; }

    // etapas, nota e âncoras
    const S = D14_STEP_STARTS; let step = 0; for (let i = 0; i < S.length; i++) if (t >= S[i]) step = i;
    st.step = step; st.progress = win(t, S[step], S[step + 1] ?? T.END);
    st.note = t < T.cut[0] ? 'Sinalizando o trecho' : t < T.cut[1] ? 'Cortando e quebrando o pavimento' : t < T.dig2[0] ? (t < T.ins[0] ? `Escavando · ${fmt(d)} m` : 'Descendo a blindagem metálica') : t < T.haul[0] ? `Escavando com blindagem · ${fmt(d)} m de ${fmt(DMAX)} m` : t < T.pipes[0] - 4 ? (t < T.bed[0] ? 'Caminhão levando o solo' : 'Berço de areia') : t < T.F0 ? `Assentando o tubo · ${Math.min(3, pa.filter((a) => t >= a + 3).length + (act >= 0 ? 1 : 0))} de 3` : t < T.pull[0] ? `Reaterro · camada ${Math.min(NLY, Math.max(1, cur + 1 || NLY))} de ${NLY}${pOn ? ' · compactando' : ''}` : t < T.pav ? 'Retirando a blindagem' : t < T.pav + 8 ? 'Base e asfalto' : t < T.pav + 16 ? 'Compactando o asfalto' : 'Trânsito liberado';
    const a = anchors;
    a.cone.set(X1 + 5.5, 0.9, -28.7); a.pav.set(XP, 0.18, -22); a.vala.set(X1 + 11, 0.3, ZT0); a.blind.set(XP, topNow - 1.5, ZT0 + 0.15); a.escora.set(XP, topNow - 0.8, ZC); a.berco.set(XP, FB - 0.1, ZC - 0.9); a.tubo.set(XP, PY, ZC + 0.3);
    a.junta.set(X1 + 4.3, PY + 0.5, ZC); a.fita.set(XP, tapeY, ZC + 0.4); a.aterro.set(XP, floorY + 0.2, ZT0 + 0.3); a.placa.set(plate.group.position.x, plate.group.position.y + 1.4, ZC); a.escav.set(X1 + 9, 3.4, -30.6); a.munck.set(cx, 3.6, -21.3); a.solo.set(X1, -15, PZ);
  }
  const VIS = {
    cone: (t) => t > 4 && t < T.pav + 15, pav: (t) => t > 14 && t < T.cut[0] + 100 && (t < T.cut[1] + 2 || t > T.pav + 8), vala: (t) => t > T.dig1[0] + 4 && t < T.pipes[0], blind: (t) => t > T.ins[0] + 3 && t < T.pull[1], escora: (t) => t > T.ins[0] + 4 && t < T.pull[0] + 2,
    berco: (t) => t > T.bed[1] && t < T.F0 + 8, tubo: (t) => t > T.pipes[0] + 4, junta: (t) => t > T.pipes[1] + 4 && t < T.F0, fita: (t) => t > T.F0 + 6 * T.dtL + 4, aterro: (t) => t > T.F0 + 1, placa: (t) => plate.group.visible,
    escav: (t) => t > T.dig1[0] && t < T.pull[1], munck: (t) => ct.visible && t < T.pipes[2] + 4,
  };
  function labelVis(kx, t = st.tc) { const f = VIS[kx]; return f ? f(t) : true; }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hideDPit(engine); },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); showDPit(engine); },
  };
}
void PZ;
