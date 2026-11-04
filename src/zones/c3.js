import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, capRect, person, WET, CURED } from './fund.js';

// ---------------------------------------------------------------------------
// C3 — Estaca escavada com trado mecanizado (sem fluido). Seção em x = X1 pelo eixo da estaca.
// Diâmetro exagerado (1,0 m) para ficar legível, como na C4. Furo seco acima do nível d'água.
// ---------------------------------------------------------------------------
const X1 = -40, PZ = 20, R = 0.5, DEPTH = 8.5, AL = 14.5, MAST = 16.5, CL = 9.0, TL = 9.8, HOP = 1.6;
const CY = 5.5, D0 = 8, NC = 4;
const T = {
  rigIn0: 0.4, rigIn1: 4.2, mast0: 4.4, mast1: 7.4,
  drill1: D0 + CY * NC, s2: 30.5, clean1: 37.4, s3: 38, slide0: 38, slide1: 41, crane0: 39, crane1: 41.4,
  cage0: 42, cage1: 49.5, exc0: 44, exc1: 51, craneOut: 50.5, s4: 52,
  truckIn: 52, truckIn1: 54.2, trem0: 53, trem1: 55.5, pour0: 55.5, pour1: 67, trOut0: 67.5, trOut1: 69.5, tremOut0: 67, tremOut1: 69,
  casOut0: 69.4, casOut1: 70.8, END: 75,
};
export const C3 = { box: { x0: -125, x1: X1, z0: 8, z1: 32 } };
export const C3_STEP_STARTS = [0, T.s2, T.s3, T.s4];
export const C3_STEPS = [
  { t: 'Perfurar com o trado', d: 'A perfuratriz se alinha ao ponto, levanta o mastro e o trado desce girando. Quando as lâminas enchem de solo, o trado sobe, a máquina gira de lado e o solo é jogado no chão, ao lado. O ciclo se repete (aqui, 4 vezes) até a profundidade de projeto. Um tubo curto de aço no topo segura o solo solto da boca do furo. Sem fluido, o furo só fica aberto onde o solo se sustenta sozinho, acima do nível d’água.' },
  { t: 'Limpar o fundo', d: 'Perfurar sempre deixa solo solto no fundo. Uma caçamba de limpeza desce, recolhe esse material e sobe para ser esvaziada. Um fundo sujo vira uma camada mole sob a ponta da estaca e reduz sua capacidade de carga, por isso esta etapa é conferida antes de seguir.' },
  { t: 'Descer a armadura', d: 'A perfuratriz sai do caminho e o guindaste desce a gaiola de armação, com espaçadores nas laterais para garantir o cobrimento de concreto. A gaiola fica suspensa a poucos centímetros do fundo, com as barras de arranque saindo acima do terreno.' },
  { t: 'Concretar com tremonha', d: 'Um tubo longo é descido até o fundo e o concreto entra pelo funil no topo. A ponta do tubo fica sempre mergulhada no concreto já lançado, para ele subir de baixo para cima e expulsar a água e o solo solto, sem se misturar. O tubo vai sendo retirado aos poucos, o tubo de aço do topo sai e o concreto cura.' },
];
export const C3_LABELS = [
  { k: 'trado', t: 'Trado' },
  { k: 'cacamba', t: 'Caçamba de limpeza' },
  { k: 'solo_t', t: 'Solo retirado' },
  { k: 'camisa', t: 'Tubo de aço no topo' },
  { k: 'fundo', t: 'Solo solto no fundo' },
  { k: 'arm', t: 'Armação com espaçadores' },
  { k: 'trem', t: 'Tubo e funil de concretagem' },
  { k: 'conc', t: 'Concreto' },
  { k: 'na', t: 'Nível d’água (abaixo da ponta)' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const C3_CAM = { tx: -39, ty: 0.8, tz: PZ, yaw: -1.3, pitch: 0.14, dist: 42 };
export const C3_MCAM = { tx: -39, ty: -6, tz: PZ, yaw: -1.3, pitch: 0.12, dist: 80 };

function helixRibbon(L, r0, r1, pitch, seg = 14) {
  const N = Math.round((L / pitch) * seg), pos = [], idx = [];
  for (let i = 0; i <= N; i++) { const y = (i / N) * L, a = (y / pitch) * Math.PI * 2; pos.push(r0 * Math.cos(a), y, r0 * Math.sin(a), r1 * Math.cos(a), y, r1 * Math.sin(a)); }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function createC3(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const steel = mat(0x8a8e95, { r: 0.5, m: 0.5 }), dark = mat(0x2f3237, { r: 0.6, m: 0.3 }), yel = mat(0xf2b705, { r: 0.7 });
  const bx = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; return o; };

  // ----------------------------------------------------------- furo e estaca
  const holeWall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1, 24, 1, true), mat(0x4a3827, { r: 1, side: THREE.BackSide, e: 0x2c1f12 })); holeWall.geometry.translate(0, -0.5, 0); holeWall.position.set(X1, 0, PZ); holeWall.visible = false; root.add(holeWall);
  const collarShape = new THREE.Shape(); collarShape.moveTo(-0.9, -0.9); collarShape.lineTo(0.9, -0.9); collarShape.lineTo(0.9, 0.9); collarShape.lineTo(-0.9, 0.9); collarShape.lineTo(-0.9, -0.9);
  const hp = new THREE.Path(); hp.absarc(0, 0, R, 0, Math.PI * 2, true); collarShape.holes.push(hp);
  const collarG = new THREE.ShapeGeometry(collarShape, 24); collarG.rotateX(-Math.PI / 2);
  const collar = new THREE.Mesh(collarG, mat(0x6d5238, { r: 1 })); collar.position.set(X1, 0.03, PZ); collar.visible = false; root.add(collar);
  const concMat = mat(0x85827a, { r: 0.95 });
  const conc = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.02, R - 0.02, 1, 24), concMat); conc.geometry.translate(0, 0.5, 0); conc.position.set(X1, -DEPTH, PZ); conc.visible = false; root.add(conc);
  const capM = noclip(0x85827a, { e: 0x57554f });
  const concCap = new THREE.Mesh(new THREE.PlaneGeometry(2 * (R - 0.02), 1), capM); concCap.geometry.rotateY(-Math.PI / 2); concCap.geometry.translate(0, 0.5, 0); concCap.position.set(X1 - 0.01, -DEPTH, PZ); concCap.visible = false; root.add(concCap);
  // solo solto no fundo (3D + seção)
  const looseM = mat(0x6d5238, { r: 1 });
  const fines = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.02, R - 0.02, 1, 20), looseM); fines.geometry.translate(0, 0.5, 0); fines.position.set(X1, -DEPTH, PZ); fines.visible = false; root.add(fines);
  const finesCap = new THREE.Mesh(new THREE.PlaneGeometry(2 * (R - 0.02), 1), noclip(0x7b5f40, { e: 0x2e2418 })); finesCap.geometry.rotateY(-Math.PI / 2); finesCap.geometry.translate(0, 0.5, 0); finesCap.position.set(X1 - 0.01, -DEPTH, PZ); finesCap.visible = false; root.add(finesCap);
  // tubo de aço no topo
  const casing = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.015, R + 0.015, 2.2, 24, 1, true), mat(0x6f737a, { r: 0.45, m: 0.6 })); casing.geometry.translate(0, -0.8, 0); casing.position.set(X1, 0, PZ); casing.visible = false; root.add(casing);

  // estacas vizinhas já executadas (desenho no plano, em frente à parede do corte)
  const doneMat = noclip(0xc9c5ba, { r: 1 });
  for (const z of [PZ - 3.4, PZ + 3.4]) {
    const r = capRect(root, X1 - 0.05, z - R, z + R, -DEPTH, 0.0, doneMat); r.renderOrder = 4;
    for (const dz of [-0.33, 0.33]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.01, DEPTH - 0.8, 0.03), noclip(0x4a4d52)); l.position.set(X1 - 0.056, -DEPTH / 2 - 0.05, z + dz); l.renderOrder = 4; root.add(l); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.3, 16), mat(0xc9c5ba)); top.position.set(X1, 0.15, z); root.add(top);
  }

  // ----------------------------------------------------------- trado, caçamba e kelly
  const augM = mat(0x8a8e95, { r: 0.5, m: 0.5, side: THREE.DoubleSide });
  const aug = new THREE.Group(); root.add(aug);
  const spin = new THREE.Group(); aug.add(spin);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, AL, 12), mat(0x6f737a, { r: 0.5, m: 0.5 })); stem.position.y = AL / 2; spin.add(stem);
  const ribG = new THREE.Group(); spin.add(ribG);
  const rib = new THREE.Mesh(helixRibbon(2.4, 0.13, R - 0.04, 0.55), augM); rib.position.y = 0.3; ribG.add(rib);
  const tipC = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 10), mat(0x4a4d52, { m: 0.5 })); tipC.rotation.x = Math.PI; tipC.position.y = 0.05; ribG.add(tipC);
  const bucketG = new THREE.Group(); spin.add(bucketG);
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.06, R - 0.06, 0.8, 18, 1, true), mat(0x5b5f66, { r: 0.5, m: 0.5 })); b.position.y = 0.45; bucketG.add(b);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.06, R - 0.06, 0.05, 18), dark); f.position.y = 0.05; bucketG.add(f);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, R - 0.06, 0.2, 14), dark); cap.position.y = 0.95; bucketG.add(cap); }
  aug.position.set(X1, 1, PZ);
  const drive = bx(0.9, 1.3, 0.9, mat(0xe8742c), X1, 0, PZ); root.add(drive);
  const arm = bx(0.9, 0.3, 0.3, dark, X1 + 0.5, 0, PZ); root.add(arm);
  const swivel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), dark); root.add(swivel);
  const grains = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 5), mat(0x7a5a3a, { r: 1 }), 18); grains.frustumCulled = false; grains.visible = false; root.add(grains);

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

  // ----------------------------------------------------------- concretagem: caminhão, calha, tubo, funil
  const truck = M.mixerTruck(); truck.scale.setScalar(0.62); truck.visible = false; root.add(truck);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1), mat(0x9aa0a8, { m: 0.4 })); chute.visible = false; root.add(chute);
  const funnel = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.9, 14, 1, true), mat(0xe8742c, { side: THREE.DoubleSide })); funnel.rotation.x = Math.PI; funnel.position.set(X1, HOP + 0.45, PZ); funnel.visible = false; root.add(funnel);
  const tremM = noclip(0x3a3d42, { r: 0.5, m: 0.5 });
  const trem = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1, 0.2), tremM); trem.geometry.translate(0, 0.5, 0); trem.position.set(X1 - 0.045, 0, PZ); trem.visible = false; root.add(trem);
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 6, 5), mat(0x8b8880, { r: 1 }), 12); drops.frustumCulled = false; drops.visible = false; root.add(drops);

  // ----------------------------------------------------------- solo retirado
  const spoil = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1, 12), mat(0x7a5a3a, { r: 1 })); spoil.geometry.translate(0, 0.5, 0); spoil.position.set(X1 + 0.6, 0, PZ + 2.5); spoil.visible = false; root.add(spoil);

  // ----------------------------------------------------------- guindaste e gaiola
  const crane = new THREE.Group(); crane.visible = false; root.add(crane);
  const CB = new THREE.Vector3(-35.0, 2.0, 11.5), CT = new THREE.Vector3(-40, 16.5, PZ - 0.4);
  crane.add(bx(4.2, 1.0, 2.6, dark, -34.0, 0.6, 11.0), bx(2.2, 1.6, 2.4, yel, -33.0, 1.9, 11.0));
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, CB.distanceTo(CT)), yel); boom.position.copy(CB).add(CT).multiplyScalar(0.5); boom.lookAt(CT); crane.add(boom);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1, 0.04), dark); root.add(cable); cable.visible = false;
  const cage = new THREE.Group(); cage.visible = false; root.add(cage);
  const cageM = mat(0x3a3d42, { r: 0.5, m: 0.5 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, CL, 5), cageM); b.position.set(Math.cos(a) * 0.36, -CL / 2, Math.sin(a) * 0.36); cage.add(b); }
  const NR = 26;
  const ringG = new THREE.TorusGeometry(0.36, 0.012, 5, 18); ringG.rotateX(Math.PI / 2);
  const rings = new THREE.InstancedMesh(ringG, cageM, NR); rings.frustumCulled = false; cage.add(rings);
  { const m4 = new THREE.Matrix4(); for (let i = 0; i < NR; i++) { m4.makeTranslation(0, -0.2 - i * 0.34, 0); rings.setMatrixAt(i, m4); } }
  // gaiola na seção (linhas, estribos e espaçadores, em frente ao concreto)
  const secCage = new THREE.Group(); root.add(secCage); secCage.visible = false;
  const secM = noclip(0x24272b);
  for (const dz of [-0.36, 0.36]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, CL, 0.03), secM); l.position.set(X1 - 0.03, -CL / 2, PZ + dz); secCage.add(l); }
  const stir = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.025, 0.72), secM, NR); stir.frustumCulled = false; secCage.add(stir);
  { const m4 = new THREE.Matrix4(); for (let i = 0; i < NR; i++) { m4.makeTranslation(X1 - 0.031, -0.2 - i * 0.34, PZ); stir.setMatrixAt(i, m4); } }
  const spacM = noclip(0xd8d4c8);
  for (const y of [-1.6, -4.5, -7.4]) for (const dz of [-1, 1]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.1), spacM); s.position.set(X1 - 0.03, y, PZ + dz * 0.41); secCage.add(s); }

  // ----------------------------------------------------------- escavadeira, pessoas
  const exc = M.excavator(0.55); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.position.set(-34.6, 0, 24.0); excW.visible = false; root.add(excW);
  const pA = person(0xe8742c), pB = person(0x4a8fd0);
  [pA, pB].forEach((p) => root.add(p.group));
  const stake = new THREE.Group(); { const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat(0xcaa36a)); s.position.y = 0.45; const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.02), mat(0xd23b2e)); f.position.set(0.15, 0.85, 0); stake.add(s, f); }
  stake.position.set(X1 + 0.6, 0, PZ + 0.1); root.add(stake);

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(C3_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};
  const pop = (t, a, b, f = 0.5) => ease((t - a) / f) * ease((b - t) / f);
  const DK = (k) => (DEPTH * (k + 1)) / NC;
  const SW = 2.4;

  // estado da ferramenta no tempo: { tip, off, spin, mode, dump }
  function tool(t) {
    if (t < D0) return { tip: 1, off: 0, spin: 0, mode: 'aug', dump: 0, cyc: -1 };
    if (t < T.drill1) {
      const k = Math.min(NC - 1, Math.floor((t - D0) / CY)), u = t - D0 - k * CY, dk = DK(k);
      if (u < 1.8) return { tip: 1 - (1 + dk) * ease(u / 1.8), off: 0, spin: 7, mode: 'aug', dump: 0, cyc: k };
      if (u < 3.2) return { tip: -dk + (1 + dk) * ease((u - 1.8) / 1.4), off: 0, spin: 1.5, mode: 'aug', dump: 0, cyc: k };
      if (u < 3.8) return { tip: 1, off: SW * ease((u - 3.2) / 0.6), spin: 0, mode: 'aug', dump: 0, cyc: k };
      if (u < 4.7) return { tip: 1, off: SW, spin: 9, mode: 'aug', dump: (u - 3.8) / 0.9, cyc: k };
      return { tip: 1, off: SW * (1 - ease((u - 4.7) / 0.8)), spin: 0, mode: 'aug', dump: 0, cyc: k };
    }
    if (t < T.s2) return { tip: 1, off: 0, spin: 0, mode: 'aug', dump: 0, cyc: NC - 1 };
    const u = t - T.s2;
    if (u < 1.8) return { tip: 1 - (1 + DEPTH) * ease(u / 1.8), off: 0, spin: 3, mode: 'bucket', dump: 0, cyc: NC };
    if (u < 3.1) return { tip: -DEPTH, off: 0, spin: 4, mode: 'bucket', dump: 0, cyc: NC };
    if (u < 4.7) return { tip: -DEPTH + (1 + DEPTH) * ease((u - 3.1) / 1.6), off: 0, spin: 0, mode: 'bucket', dump: 0, cyc: NC };
    if (u < 5.3) return { tip: 1, off: SW * ease((u - 4.7) / 0.6), spin: 0, mode: 'bucket', dump: 0, cyc: NC };
    if (u < 6.2) return { tip: 1, off: SW, spin: 3, mode: 'bucket', dump: (u - 5.3) / 0.9, cyc: NC };
    if (u < 6.9) return { tip: 1, off: SW * (1 - ease((u - 6.2) / 0.7)), spin: 0, mode: 'bucket', dump: 0, cyc: NC };
    return { tip: 1, off: 0, spin: 0, mode: 'bucket', dump: 0, cyc: NC };
  }
  function holeDepthAt(t) {
    if (t < D0) return 0;
    if (t >= T.drill1) return DEPTH;
    const k = Math.min(NC - 1, Math.floor((t - D0) / CY)), u = t - D0 - k * CY, dk = DK(k), dp = k ? DK(k - 1) : 0;
    const tp = u < 1.8 ? 1 - (1 + dk) * ease(u / 1.8) : -dk;
    return Math.max(dp, Math.min(dk, -tp));
  }
  function info(t) {
    if (t < T.s2) {
      if (t < T.rigIn1) return { step: 0, p: t / T.s2, note: 'Perfuratriz chegando ao ponto' };
      if (t < D0) return { step: 0, p: t / T.s2, note: 'Levantando e aprumando o mastro' };
      const k = Math.min(NC, Math.floor((t - D0) / CY) + 1), d = holeDepthAt(t);
      return { step: 0, p: win(t, 0, T.s2), note: `Ciclo ${k} de ${NC} · furo com ${d.toFixed(1).replace('.', ',')} m de ${DEPTH.toFixed(1).replace('.', ',')} m` };
    }
    if (t < T.s3) return { step: 1, p: win(t, T.s2, T.s3), note: t < T.s2 + 3.1 ? 'Caçamba de limpeza descendo ao fundo' : t < T.clean1 ? 'Retirando o solo solto do fundo' : 'Fundo limpo e conferido' };
    if (t < T.s4) return { step: 2, p: win(t, T.s3, T.s4), note: t < T.crane1 ? 'Perfuratriz libera o ponto' : t < T.cage1 ? 'Descendo a gaiola com espaçadores' : 'Gaiola suspensa, com cobrimento garantido' };
    return { step: 3, p: win(t, T.s4, T.END), note: t < T.pour0 ? 'Descendo o tubo de concretagem até o fundo' : t < T.pour1 ? 'Concretando de baixo para cima, tubo sempre mergulhado' : t < T.tremOut1 ? 'Retirando o tubo' : 'Concreto adensado e curando' };
  }

  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), tc1 = new THREE.Color(0x8a8e95), tc2 = new THREE.Color(0x7a5a3a);
  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    const tl = tool(t), holeD = holeDepthAt(t);
    holeWall.visible = holeD > 0.02; holeWall.scale.y = Math.max(0.001, holeD);
    collar.visible = holeD > 0.02;
    terrainHoles[0].set(X1 - 0.9, X1 + 0.9, PZ - 0.9, PZ + 0.9);
    if (holeD > 0.02) section.setBand(0, PZ - R, PZ + R, -holeD, 0.05); else section.setBand(0, 0, 0, 0, 0);

    // perfuratriz: entrada, mastro, trado
    const rin = ease(win(t, T.rigIn0, T.rigIn1)), slide = ease(win(t, T.slide0, T.slide1));
    rigG.visible = t > 0.2;
    rigG.position.set(10 * (1 - rin), 0, slide * 8.5);
    const raise = ease(win(t, T.mast0, T.mast1)), lower = 1 - ease(win(t, T.slide0 - 0.5, T.slide0 + 1));
    mastG.rotation.z = -1.32 * (1 - raise * (t < T.slide0 - 0.5 ? 1 : lower));
    const augOn = t < T.slide0 + 0.2 && raise > 0.97;
    aug.visible = augOn; drive.visible = arm.visible = swivel.visible = augOn;
    ribG.visible = tl.mode === 'aug'; bucketG.visible = tl.mode === 'bucket';
    aug.position.set(X1, tl.tip, PZ + tl.off);
    spin.rotation.y += tl.spin * (st.paused ? 0 : dt * st.speed);
    const top = tl.tip + AL;
    drive.position.set(X1, top + 0.65, PZ + tl.off); arm.position.set(X1 + 0.5, top + 0.65, PZ + tl.off);
    swivel.position.set(X1, (top + 1.3 + MAST + 0.4) / 2, PZ + tl.off); swivel.scale.y = Math.max(0.01, MAST + 0.4 - top - 1.3);
    augM.color.copy(tc1).lerp(tc2, clamp01(holeD / DEPTH));

    // solo jogado ao lado (partículas)
    grains.visible = tl.dump > 0 && tl.dump < 1;
    if (grains.visible) { for (let i = 0; i < 18; i++) { const u = clamp01(tl.dump * 1.15 - (i % 6) * 0.06), a = i * 2.4; v.set(X1 + Math.cos(a) * 0.55 * u + 0.15, 2.6 - 2.4 * u * u, PZ + SW + Math.sin(a) * 0.55 * u + 0.1); m4.makeTranslation(v.x, v.y, v.z); grains.setMatrixAt(i, m4); } grains.instanceMatrix.needsUpdate = true; }

    // tubo de aço do topo
    const cs = ease(win(t, 7.2, 8.0)) * (1 - ease(win(t, T.casOut0, T.casOut1)));
    casing.visible = cs > 0.01 && t < T.casOut1 + 0.05; casing.position.y = (1 - ease(win(t, 7.2, 8.0))) * 3 + ease(win(t, T.casOut0, T.casOut1)) * 4;

    // solo solto no fundo
    const fh = 0.38 * ease(win(t, D0 + CY * (NC - 1) + 1.8, D0 + CY * (NC - 1) + 3.2)) * (1 - ease(win(t, T.s2 + 1.9, T.s2 + 3.3)));
    fines.visible = finesCap.visible = fh > 0.01; fines.scale.y = finesCap.scale.y = Math.max(0.001, fh);

    // concreto
    const lvl = t < T.pour0 ? -DEPTH : -DEPTH + (DEPTH + 0.3) * ease(win(t, T.pour0, T.pour1));
    conc.visible = concCap.visible = lvl > -DEPTH + 0.02; conc.scale.y = concCap.scale.y = Math.max(0.001, lvl + DEPTH);
    concMat.color.copy(WET).lerp(CURED, clamp01((t - T.pour1) / 7));
    capM.color.copy(concMat.color);

    // caminhão, calha, tubo e funil
    const trIn = ease(win(t, T.truckIn, T.truckIn1)), trOut = ease(win(t, T.trOut0, T.trOut1));
    const tVis = t >= T.truckIn && t < T.trOut1 + 0.2;
    truck.visible = tVis; truck.position.set(-30.5 + 9 * (1 - trIn) + 9 * trOut, 0, 27.0); truck.userData.spin.rotation.x = tAbs * 2.5;
    const tremBottom = t < T.trem1 ? 0.4 + (-DEPTH + 0.3 - 0.4) * ease(win(t, T.trem0, T.trem1)) : Math.max(-DEPTH + 0.3, Math.min(lvl - 1.0, 12)) + 12 * ease(win(t, T.tremOut0, T.tremOut1));
    const tremTop = Math.min(HOP, tremBottom + TL);
    const tremOn = t >= T.trem0 - 0.3 && t < T.tremOut1 + 0.1;
    trem.visible = tremOn; trem.position.y = tremBottom; trem.scale.y = Math.max(0.01, (t < T.trem1 ? tremBottom + TL : tremTop) - tremBottom);
    funnel.visible = tremOn && t >= T.trem1 - 0.4 && t < T.tremOut0 + 0.4;
    chute.visible = tVis && t > T.trem1 - 0.5 && t < T.pour1 + 0.8;
    { const c0 = new THREE.Vector3(truck.position.x - 3.0, 1.55, 27.0), c1 = new THREE.Vector3(X1 + 0.5, HOP + 0.8, PZ + 0.5); chute.position.copy(c0).add(c1).multiplyScalar(0.5); chute.scale.z = Math.max(0.01, c0.distanceTo(c1)); chute.lookAt(c1); }
    const pouring = t > T.pour0 && t < T.pour1 + 0.4;
    drops.visible = pouring;
    if (pouring) { for (let i = 0; i < 12; i++) { const f = (tAbs * 1.5 + i / 12) % 1; v.set(X1 + Math.sin(i * 3.1) * 0.12, HOP + 0.3 + (lvl + 0.1 - HOP - 0.3) * f, PZ + Math.cos(i * 2.3) * 0.12); m4.makeTranslation(v.x, v.y, v.z); drops.setMatrixAt(i, m4); } drops.instanceMatrix.needsUpdate = true; }

    // solo retirado e escavadeira
    const dug = clamp01((holeD + (t > T.s2 ? 0.4 : 0)) / DEPTH);
    const sp = dug * (1 - ease(win(t, T.exc0 + 1, T.exc1)));
    spoil.visible = sp > 0.02; spoil.scale.set(1.0 + 0.5 * sp, 0.15 + 1.1 * sp, 1.0 + 0.5 * sp);
    const eS = pop(t, T.exc0 - 0.5, T.exc1 + 0.5, 0.7);
    excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); exc.update(t * 1.4);

    // guindaste e gaiola
    const cr = ease(win(t, T.crane0, T.crane1)) * (1 - ease(win(t, T.craneOut, T.craneOut + 1.5)));
    crane.visible = cr > 0.01; crane.scale.setScalar(Math.max(0.001, cr));
    const cg = win(t, T.cage0, T.cage1), cageTopY = 14 - (14 - 0.8) * ease(cg);
    cage.visible = t > T.crane1 - 0.4 && t < T.END + 1; cage.position.set(X1, cageTopY, PZ);
    cable.visible = cage.visible && t < T.craneOut + 0.5; { const a = CT.y, b = cageTopY; cable.scale.y = Math.max(0.01, a - b); cable.position.set(X1, (a + b) / 2, PZ); }
    secCage.visible = cage.visible && cg > 0.02; secCage.position.y = cageTopY;

    // pessoas
    const pw = (p, x0, x1, z, sp_, bend, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp_ + ph); p.group.position.set(x0 + (x1 - x0) * u, 0, z); p.group.rotation.y = Math.cos(tAbs * sp_ + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = bend; };
    pw(pA, -32.5, -29, 16.8, 0.5, 0.12, 0); pw(pB, -31, -28.2, 23.0, 0.45, t > T.pour0 && t < T.pour1 ? 0.4 : 0.12, 1.8);
    stake.visible = t < D0 + 0.2;

    const a = anchors;
    a.trado.set(X1 - 0.03, tl.tip + 1.6, PZ + tl.off + R + 0.05);
    a.cacamba.set(X1 - 0.03, tl.tip + 1.2, PZ + tl.off + R + 0.05);
    a.solo_t.set(X1 + 0.6, 1.3, PZ + 2.5);
    a.camisa.set(X1 - 0.06, -1.2, PZ + R + 0.04);
    a.fundo.set(X1 - 0.06, -DEPTH + 0.2, PZ - R - 0.04);
    a.arm.set(X1 - 0.06, cageTopY - 3, PZ + 0.38);
    a.trem.set(X1 - 0.06, Math.max(-6, Math.min(0.2, tremBottom + 4)), PZ - 0.12);
    a.conc.set(X1 - 0.06, Math.max(-DEPTH + 1.5, Math.min(-2.5, lvl - 1.5)), PZ - R - 0.04);
    a.na.set(X1 - 0.06, -9.55, PZ - 5);
    a.solo.set(X1, -15, PZ);
  }
  function labelVis(k, t = st.tc) {
    switch (k) {
      case 'trado': return t > D0 + 1 && t < T.drill1;
      case 'cacamba': return t > T.s2 + 1 && t < T.clean1;
      case 'solo_t': return t > D0 + 8 && t < T.exc1 - 1;
      case 'camisa': return t > D0 + 2 && t < T.casOut0;
      case 'fundo': return t > D0 + CY * (NC - 1) + 3.5 && t < T.s2 + 3;
      case 'arm': return t > T.cage1 - 3 && t < T.s4 + 6;
      case 'trem': return t > T.trem1 && t < T.tremOut1;
      case 'conc': return t > T.pour0 + 4;
      case 'na': return t > T.s2;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hidden.g = engine.scene.getObjectByName('c-rig'); if (hidden.g) hidden.g.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); if (hidden.g) hidden.g.visible = true; },
  };
}
