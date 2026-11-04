import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, capRect, person, WET, CURED } from './fund.js';

// ---------------------------------------------------------------------------
// C4 — Estaca hélice contínua (CFA). Seção em x = X1 passando pelo eixo da estaca.
// A estaca é desenhada com diâmetro exagerado (1,0 m) para ser legível.
// ---------------------------------------------------------------------------
const X1 = -40, PZ = 20, R = 0.5, DEPTH = 13.5, AL = 14.5, MAST = 16.5;
const T = {
  rigIn0: 0.4, rigIn1: 4.2, mast0: 4.4, mast1: 7.4, s2: 8, drill1: 23.6, s3: 24, truckIn: 21.5, truckIn1: 24.2, pump0: 25.5, lift0: 26, lift1: 42.2,
  truckOut0: 43, truckOut1: 45, s4: 45, slide0: 46, slide1: 49, crane0: 48, crane1: 50.4, cage0: 51, cage1: 58, exc0: 53, exc1: 61, craneOut: 59, END: 64,
};
export const C4 = { box: { x0: -125, x1: X1, z0: 8, z1: 32 } };
export const C4_STEP_STARTS = [0, T.s2, T.s3, T.s4];
export const C4_STEPS = [
  { t: 'Locação e posicionamento', d: 'A topografia marca o ponto da estaca. A perfuratriz chega sobre esteiras, se alinha ao ponto e levanta o mastro até ficar rigorosamente na vertical, porque a estaca sai com a mesma inclinação da hélice.' },
  { t: 'Perfuração com a hélice contínua', d: 'A hélice gira e desce de uma vez só, sem retirar o solo da cava: ele sobe preso nas lâminas e o próprio solo escora as paredes do furo, mesmo abaixo do nível d’água. Não precisa de revestimento nem de lama.' },
  { t: 'Concretagem durante a retirada da hélice', d: 'Chegando à profundidade de projeto, o concreto é bombeado pelo tubo central da hélice. A hélice sobe devagar e o concreto ocupa o espaço que ela deixa, sempre acima da ponta. O solo trazido nas lâminas é jogado para o lado.' },
  { t: 'Armadura e limpeza', d: 'Com a perfuratriz já fora do caminho, a gaiola de armação é baixada com o guindaste e afundada no concreto ainda fresco. A pá-carregadeira limpa o solo trazido e a estaca fica pronta para curar.' },
];
export const C4_LABELS = [
  { k: 'helice', t: 'Hélice contínua' },
  { k: 'haste', t: 'Haste oca' },
  { k: 'solo_t', t: 'Solo trazido' },
  { k: 'conc', t: 'Concreto bombeado' },
  { k: 'arm', t: 'Armação' },
  { k: 'feita', t: 'Estacas prontas' },
  { k: 'res', t: 'Ponta na camada resistente' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const C4_CAM = { tx: -39, ty: -0.5, tz: PZ, yaw: -1.3, pitch: 0.14, dist: 54 };
export const C4_MCAM = { tx: -39, ty: -9, tz: PZ, yaw: -1.3, pitch: 0.12, dist: 90 };

function helixRibbon(L, r0, r1, pitch, seg = 14) {
  const N = Math.round((L / pitch) * seg), pos = [], idx = [];
  for (let i = 0; i <= N; i++) { const y = (i / N) * L, a = (y / pitch) * Math.PI * 2; pos.push(r0 * Math.cos(a), y, r0 * Math.sin(a), r1 * Math.cos(a), y, r1 * Math.sin(a)); }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function createC4(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const capX = (o) => X1 + o;
  const steel = mat(0x8a8e95, { r: 0.5, m: 0.5 }), dark = mat(0x2f3237, { r: 0.6, m: 0.3 }), yel = mat(0xf2b705, { r: 0.7 });
  const bx = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; return o; };

  // ----------------------------------------------------------- furo e estaca
  const holeWall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1, 24, 1, true), mat(0x4a3827, { r: 1, side: THREE.BackSide })); holeWall.geometry.translate(0, -0.5, 0); holeWall.position.set(X1, 0, PZ); holeWall.visible = false; root.add(holeWall);
  const collarShape = new THREE.Shape(); collarShape.moveTo(-0.9, -0.9); collarShape.lineTo(0.9, -0.9); collarShape.lineTo(0.9, 0.9); collarShape.lineTo(-0.9, 0.9); collarShape.lineTo(-0.9, -0.9);
  const hp = new THREE.Path(); hp.absarc(0, 0, R, 0, Math.PI * 2, true); collarShape.holes.push(hp);
  const collarG = new THREE.ShapeGeometry(collarShape, 24); collarG.rotateX(-Math.PI / 2);
  const collar = new THREE.Mesh(collarG, mat(0x6d5238, { r: 1 })); collar.position.set(X1, 0.03, PZ); collar.visible = false; root.add(collar);
  const concMat = mat(0x85827a, { r: 0.95 });
  const conc = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.02, R - 0.02, 1, 24), concMat); conc.geometry.translate(0, 0.5, 0); conc.position.set(X1, -DEPTH, PZ); conc.visible = false; root.add(conc);
  const pileCap = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.02, R - 0.02, 0.02, 24), concMat); pileCap.position.set(X1, 0.3, PZ); pileCap.visible = false; root.add(pileCap);

  // estacas vizinhas já executadas (desenho no plano, em frente à parede do corte)
  const doneMat = noclip(0xc9c5ba, { r: 1 });
  for (const z of [PZ - 3.4, PZ + 3.4]) {
    const r = capRect(root, X1 - 0.05, z - R, z + R, -DEPTH, 0.0, doneMat); r.renderOrder = 4;
    for (const dz of [-0.33, 0.33]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.01, DEPTH - 1.0, 0.03), noclip(0x4a4d52)); l.position.set(X1 - 0.056, -DEPTH / 2 - 0.1, z + dz); l.renderOrder = 4; root.add(l); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.3, 16), mat(0xc9c5ba)); top.position.set(X1, 0.15, z); root.add(top);
  }

  // ----------------------------------------------------------- hélice
  const augM = mat(0x8a8e95, { r: 0.5, m: 0.5, side: THREE.DoubleSide });
  const aug = new THREE.Group(); root.add(aug);
  const spin = new THREE.Group(); aug.add(spin);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, AL, 12), mat(0x6f737a, { r: 0.5, m: 0.5 })); stem.position.y = AL / 2; spin.add(stem);
  const rib = new THREE.Mesh(helixRibbon(AL - 0.6, 0.13, R - 0.05, 0.45), augM); rib.position.y = 0.4; spin.add(rib);
  const tipC = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 10), mat(0x4a4d52, { m: 0.5 })); tipC.rotation.x = Math.PI; tipC.position.y = 0.05; spin.add(tipC);
  aug.position.set(X1, 1, PZ);
  const drive = bx(0.9, 1.3, 0.9, mat(0xe8742c), X1, 0, PZ); root.add(drive);
  const arm = bx(0.9, 0.3, 0.3, dark, X1 + 0.5, 0, PZ); root.add(arm);
  const swivel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), dark); root.add(swivel);

  // ----------------------------------------------------------- perfuratriz
  const rigG = new THREE.Group(); rigG.visible = false; root.add(rigG);
  for (const dz of [-1.9, 1.9]) rigG.add(bx(6.2, 1.0, 1.2, dark, -36.3, 0.55, PZ + dz));
  rigG.add(bx(4.6, 1.1, 3.2, yel, -36.4, 1.6, PZ));
  rigG.add(bx(1.7, 1.3, 1.5, mat(0x9fc4d8, { r: 0.3 }), -36.0, 2.8, PZ + 0.8));
  rigG.add(bx(1.8, 1.6, 2.6, dark, -33.8, 1.9, PZ));
  const mastG = new THREE.Group(); mastG.position.set(-39.1, 1.0, PZ); rigG.add(mastG);
  for (const dz of [-0.5, 0.5]) mastG.add(bx(0.28, MAST, 0.28, yel, 0, MAST / 2, dz));
  for (let y = 1; y < MAST; y += 1.6) mastG.add(bx(0.18, 0.14, 1.0, yel, 0, y, 0));
  mastG.add(bx(0.8, 0.7, 1.5, dark, 0, MAST + 0.2, 0));

  // ----------------------------------------------------------- bombeamento
  const truck = M.mixerTruck(); truck.scale.setScalar(0.62); truck.visible = false; root.add(truck);
  const pump = new THREE.Group(); pump.visible = false; root.add(pump);
  pump.add(bx(3.0, 1.3, 1.7, mat(0xd23b2e), 0, 1.0, 0), bx(1.1, 0.7, 1.4, steel, 1.4, 1.9, 0), bx(2.8, 0.25, 1.9, dark, 0, 0.3, 0));
  for (const dx of [-1, 1]) pump.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.4, 12), dark).translateX(dx).translateY(0.4).translateZ(0.95).rotateX(Math.PI / 2));
  pump.position.set(-35.0, 0, 27.0);
  const hoseCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-36.6, 1.4, 27), new THREE.Vector3(-37.4, 1.0, 24.5), new THREE.Vector3(-38.6, 6, 21.8), new THREE.Vector3(-39.5, 14, 20.5), new THREE.Vector3(-40, MAST + 0.4, PZ)]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 40, 0.1, 8), mat(0x1c1e22, { r: 0.8 })); hose.visible = false; root.add(hose);
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 5), mat(0x8b8880, { r: 1 }), 24); drops.frustumCulled = false; drops.visible = false; root.add(drops);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1), mat(0x9aa0a8, { m: 0.4 })); chute.visible = false; root.add(chute);

  // ----------------------------------------------------------- solo trazido
  const spoil = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1, 12), mat(0x7a5a3a, { r: 1 })); spoil.geometry.translate(0, 0.5, 0); spoil.position.set(-38.6, 0, 22.4); spoil.visible = false; root.add(spoil);

  // ----------------------------------------------------------- guindaste e gaiola
  const crane = new THREE.Group(); crane.visible = false; root.add(crane);
  const CB = new THREE.Vector3(-35.0, 2.0, 11.5), CT = new THREE.Vector3(-40, 16.5, PZ - 0.4);
  crane.add(bx(4.2, 1.0, 2.6, dark, -34.0, 0.6, 11.0), bx(2.2, 1.6, 2.4, yel, -33.0, 1.9, 11.0));
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, CB.distanceTo(CT)), yel); boom.position.copy(CB).add(CT).multiplyScalar(0.5); boom.lookAt(CT); crane.add(boom);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1, 0.04), dark); root.add(cable); cable.visible = false;
  const cage = new THREE.Group(); cage.visible = false; root.add(cage);
  const CL = 12.5, cageM = mat(0x3a3d42, { r: 0.5, m: 0.5 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, CL, 5), cageM); b.position.set(Math.cos(a) * 0.36, -CL / 2, Math.sin(a) * 0.36); cage.add(b); }
  const ringG = new THREE.TorusGeometry(0.36, 0.012, 5, 18); ringG.rotateX(Math.PI / 2);
  const rings = new THREE.InstancedMesh(ringG, cageM, 36); rings.frustumCulled = false; cage.add(rings);
  { const m4 = new THREE.Matrix4(); for (let i = 0; i < 36; i++) { m4.makeTranslation(0, -0.2 - i * 0.34, 0); rings.setMatrixAt(i, m4); } }
  const secCage = new THREE.Group(); root.add(secCage); secCage.visible = false;
  for (const dz of [-0.36, 0.36]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, CL, 0.03), noclip(0x24272b)); l.position.set(X1 - 0.002, -CL / 2, dz); secCage.add(l); }

  // ----------------------------------------------------------- escavadeira, pessoas
  const exc = M.excavator(0.55); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.position.set(-34.6, 0, 23.6); excW.visible = false; root.add(excW);
  const pA = person(0xe8742c), pB = person(0x4a8fd0);
  [pA, pB].forEach((p) => root.add(p.group));
  const stake = new THREE.Group(); { const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat(0xcaa36a)); s.position.y = 0.45; const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.02), mat(0xd23b2e)); f.position.set(0.15, 0.85, 0); stake.add(s, f); }
  stake.position.set(X1 + 0.6, 0, PZ + 0.1); root.add(stake);

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(C4_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};
  const pop = (t, a, b, f = 0.5) => ease((t - a) / f) * ease((b - t) / f);
  const tipAt = (t) => t < T.s2 ? 1 : t < T.drill1 ? 1 - (1 + DEPTH) * ease(win(t, T.s2 + 0.3, T.drill1)) : t < T.lift0 ? -DEPTH : -DEPTH + (DEPTH + 1.0) * win(t, T.lift0, T.lift1);
  function info(t) {
    if (t < T.s2) return { step: 0, p: t / T.s2, note: t < T.rigIn1 ? 'Perfuratriz chegando ao ponto' : 'Levantando e aprumando o mastro' };
    if (t < T.s3) { const d = Math.max(0, -tipAt(t)); return { step: 1, p: win(t, T.s2, T.s3), note: `Perfurando · ${d.toFixed(1).replace('.', ',')} m de ${DEPTH.toFixed(1).replace('.', ',')} m` }; }
    if (t < T.s4) return { step: 2, p: win(t, T.s3, T.s4), note: t < T.pump0 ? 'Bomba de concreto pronta' : t < T.lift1 ? 'Concretando e subindo a hélice' : 'Hélice fora do furo' };
    return { step: 3, p: win(t, T.s4, T.END), note: t < T.crane1 ? 'Perfuratriz libera o ponto' : t < T.cage1 ? 'Descendo a gaiola de armação' : 'Limpando o solo trazido' };
  }

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    const tip = tipAt(t), drilled = t >= T.s2 + 0.3;
    const maxD = drilled ? Math.min(DEPTH, Math.max(0, -(t < T.drill1 ? tip : -DEPTH))) : 0;
    const holeD = t < T.drill1 ? maxD : DEPTH;
    holeWall.visible = holeD > 0.02; holeWall.scale.y = Math.max(0.001, holeD);
    collar.visible = drilled;
    terrainHoles[0].set(X1 - 0.9, X1 + 0.9, PZ - 0.9, PZ + 0.9);
    if (holeD > 0.02) section.setBand(0, PZ - R, PZ + R, -holeD, 0.05); else section.setBand(0, 0, 0, 0, 0);

    // rig: entrada, mastro, hélice
    const rin = ease(win(t, T.rigIn0, T.rigIn1)), slide = ease(win(t, T.slide0, T.slide1));
    rigG.visible = t > 0.2;
    const rigZ = slide * 8.5;
    rigG.position.set(10 * (1 - rin), 0, rigZ);
    const raise = ease(win(t, T.mast0, T.mast1)), lower = 1 - ease(win(t, T.slide0 - 0.5, T.slide0 + 1));
    mastG.rotation.z = -1.32 * (1 - raise * (t < T.slide0 - 0.5 ? 1 : lower));
    const augOn = t < T.slide0 + 0.2 && raise > 0.97;
    aug.visible = augOn; drive.visible = arm.visible = swivel.visible = augOn;
    aug.position.y = tip;
    const spinning = (t > T.s2 + 0.3 && t < T.drill1) ? 7 : (t >= T.lift0 && t < T.lift1) ? 0.9 : 0;
    spin.rotation.y += spinning * (st.paused ? 0 : dt * st.speed);
    const top = tip + AL;
    drive.position.set(X1, top + 0.65, PZ); arm.position.set(X1 + 0.5, top + 0.65, PZ);
    swivel.position.set(X1, (top + 1.3 + MAST + 0.4) / 2, PZ); swivel.scale.y = Math.max(0.01, MAST + 0.4 - top - 1.3);
    // cor das lâminas: aço -> solo
    augM.color.set(0x8a8e95).lerp(new THREE.Color(0x7a5a3a), clamp01(maxD / DEPTH)).lerp(new THREE.Color(0x8b8880), ease(win(t, T.lift0 + 2, T.lift1)));

    // concreto
    const cOn = t >= T.pump0 + 0.2;
    const cTop = t < T.lift1 ? tip : 0.3;
    const lvl = t < T.lift0 ? -DEPTH : Math.min(0.3, cTop + 0.1);
    conc.visible = cOn && lvl > -DEPTH + 0.02; conc.scale.y = Math.max(0.001, lvl + DEPTH);
    pileCap.visible = t >= T.lift1 + 0.2;
    concMat.color.copy(WET).lerp(CURED, clamp01((t - T.lift1) / 14));

    // bomba e caminhão
    const trIn = ease(win(t, T.truckIn, T.truckIn1)), trOut = ease(win(t, T.truckOut0, T.truckOut1));
    const tVis = t >= T.truckIn && t < T.truckOut1 + 0.2;
    truck.visible = tVis; truck.position.set(-29.4 + 9 * (1 - trIn) + 9 * trOut, 0, 27.0); truck.userData.spin.rotation.x = tAbs * 2.5;
    pump.visible = tVis; pump.scale.setScalar(Math.max(0.001, ease(win(t, T.truckIn1 - 1.5, T.truckIn1)) * (1 - ease(win(t, T.truckOut0, T.truckOut0 + 0.8)))));
    hose.visible = pump.visible && t > T.truckIn1 - 0.8;
    chute.visible = tVis && t > T.truckIn1 && t < T.truckOut0;
    { const c0 = new THREE.Vector3(truck.position.x - 3.0, 1.55, 27.0), c1 = new THREE.Vector3(-33.9, 1.9, 27.0); chute.position.copy(c0).add(c1).multiplyScalar(0.5); chute.scale.z = Math.max(0.01, c0.distanceTo(c1)); chute.lookAt(c1); }
    const pumping = t > T.pump0 && t < T.lift1 + 0.5;
    drops.visible = hose.visible && pumping;
    if (drops.visible) { const m4 = new THREE.Matrix4(), v = new THREE.Vector3(); for (let i = 0; i < 24; i++) { hoseCurve.getPoint((tAbs * 0.5 + i / 24) % 1, v); m4.makeTranslation(v.x, v.y, v.z); drops.setMatrixAt(i, m4); } drops.instanceMatrix.needsUpdate = true; }

    // solo trazido
    const sp = clamp01(maxD / DEPTH) * (1 - ease(win(t, T.exc0 + 1, T.exc1)));
    spoil.visible = sp > 0.02; spoil.scale.set(1.0 + 0.5 * sp, 0.15 + 1.1 * sp, 1.0 + 0.5 * sp);
    const eS = pop(t, T.exc0 - 0.5, T.exc1 + 0.5, 0.7);
    excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); exc.update(t * 1.4);

    // guindaste e gaiola
    const cr = ease(win(t, T.crane0, T.crane1)) * (1 - ease(win(t, T.craneOut, T.craneOut + 1.5)));
    crane.visible = cr > 0.01; crane.scale.setScalar(Math.max(0.001, cr));
    const cg = win(t, T.cage0, T.cage1), cageTopY = 14 - (14 - 0.35) * ease(cg);
    cage.visible = t > T.crane1 - 0.4 && t < T.END + 1; cage.position.set(X1, cageTopY, PZ);
    cable.visible = cage.visible && t < T.craneOut + 0.5; { const a = CT.y, b = cageTopY; cable.scale.y = Math.max(0.01, a - b); cable.position.set(X1, (a + b) / 2, PZ - 0.0); }
    secCage.visible = cage.visible && cg > 0.02; secCage.position.y = cageTopY;

    // pessoas
    const pw = (p, x0, x1, z, sp_, bend, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp_ + ph); p.group.position.set(x0 + (x1 - x0) * u, 0, z); p.group.rotation.y = Math.cos(tAbs * sp_ + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = bend; };
    pw(pA, -32.5, -29, 17.2, 0.5, 0.12, 0); pw(pB, -31, -28.2, 23.0, 0.45, t > T.pump0 && t < T.truckOut0 ? 0.4 : 0.12, 1.8);
    stake.visible = t < T.s2 + 0.2;

    const a = anchors;
    a.helice.set(X1 - 0.03, Math.max(-DEPTH + 2.5, tip + 3.2), PZ + R + 0.05);
    a.haste.set(X1, Math.min(MAST - 1.5, tip + 11.5), PZ - 0.13);
    a.solo_t.set(-38.6, 1.2, 22.4);
    a.conc.set(X1 - 0.03, Math.max(-DEPTH + 1.5, Math.min(-2, lvl - 1.5)), PZ - R - 0.05);
    a.arm.set(X1 - 0.03, cageTopY - 6, PZ + 0.4);
    a.feita.set(X1 - 0.06, -5.5, PZ - 3.4 - R + 0.1);
    a.res.set(X1 - 0.06, -DEPTH + 0.4, PZ + 3.4 + 0.2);
    a.solo.set(X1, -19, PZ);
  }
  function labelVis(k, t = st.tc) {
    switch (k) {
      case 'helice': return t > T.s2 + 3 && t < T.slide0 && t < T.lift1 - 2;
      case 'haste': return t > T.lift0 + 1 && t < T.lift1 - 2;
      case 'solo_t': return t > T.drill1 - 4 && t < T.exc1 - 1;
      case 'conc': return t > T.lift0 + 2.5;
      case 'arm': return t > T.cage0 + 2.2;
      case 'feita': return t > T.mast1;
      case 'res': return t > T.lift1;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hidden.g = engine.scene.getObjectByName('c-rig'); if (hidden.g) hidden.g.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); if (hidden.g) hidden.g.visible = true; },
  };
}
