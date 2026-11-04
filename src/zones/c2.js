import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person, WET, CURED } from './fund.js';

// ---------------------------------------------------------------------------
// C2 — Tubulão a céu aberto. Seção em x = X1 pelo eixo do fuste.
// Fuste de 1,2 m (camisa de concreto), 7 m de profundidade, base alargada até 8 m,
// acima do nível d'água (-9,5 m neste ponto).
// ---------------------------------------------------------------------------
const X1 = -40, PZ = 20, RS = 0.6, RI = 0.5, SH = 7, NL = 7, BASE = 8;
const T = {
  tri0: 0.4, tri1: 2.4, dig0: 2.6, LIFT: 3.2, s2: 25.4, bell0: 25.8, bell1: 35.4, s3: 36.4, insp0: 36.8, insp1: 43.6, up1: 46.4, s4: 47,
  cage0: 47.4, cage1: 51, tIn0: 50, tIn1: 52.6, pb0: 53.2, pb1: 57.2, ps1: 65.5, tOut0: 66, tOut1: 68, END: 71,
};
export const C2 = { box: { x0: -125, x1: X1, z0: 8, z1: 32 } };
export const C2_STEP_STARTS = [0, T.s2, T.s3, T.s4];
export const C2_STEPS = [
  { t: 'Posicionar o tripé e escavar o fuste', d: 'Um tripé com guincho é armado sobre o ponto. Um operário desce e escava a mão, em trechos de cerca de 1 m; o balde sobe pelo guincho levando o solo. A cada trecho escavado, a parede ganha logo sua camisa de concreto, para o solo não desabar sobre quem trabalha embaixo.' },
  { t: 'Alargar a base (campana)', d: 'Chegando na cota, o operário alarga a base em forma de sino. Como a pressão sobre o solo cai com a área, uma base mais larga leva a carga do pilar a uma superfície muito maior, na camada resistente.' },
  { t: 'Inspeção da base', d: 'Antes de concretar, um engenheiro desce, confere a cota, a limpeza e a camada de apoio, e o ar é renovado com um insuflador. Só com a base aprovada o tubulão segue. Esta é a grande vantagem do tubulão a céu aberto: dá para ver o solo onde a carga vai se apoiar.' },
  { t: 'Armar e concretar', d: 'Descem as barras de arranque do pilar e o concreto é lançado por um funil, preenchendo primeiro a base e depois o fuste, e vibrado. Fica um bloco maciço que passa a carga do pilar ao solo. Só é possível acima do nível d’água, porque o fundo precisa ficar seco.' },
];
export const C2_LABELS = [
  { k: 'fuste', t: 'Fuste' },
  { k: 'camisa', t: 'Camisa de concreto' },
  { k: 'base', t: 'Base alargada' },
  { k: 'insp', t: 'Inspeção da base' },
  { k: 'arm', t: 'Armação' },
  { k: 'conc', t: 'Concreto' },
  { k: 'na', t: 'Nível d’água (abaixo da base)' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const C2_CAM = { tx: -39, ty: -1.8, tz: PZ, yaw: -1.3, pitch: 0.2, dist: 24 };
export const C2_MCAM = { tx: -39, ty: -5, tz: PZ, yaw: -1.3, pitch: 0.2, dist: 40 };

function bellProfile(g) {
  const pts = [[RS, -SH], [RS + 0.6 * g, -SH - 0.5 * g], [RS + 0.6 * g, -SH - 0.85 * g], [0.9 * g + RS * (1 - g), -SH - g], [0.0, -SH - g]];
  return pts.map(([r, y]) => new THREE.Vector2(r, y));
}

export function createC2(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const dark = mat(0x2f3237, { r: 0.6, m: 0.3 });
  const wallM = mat(0x4a3827, { r: 1, side: THREE.BackSide });

  // paredes do fuste e sino
  const shaftWall = new THREE.Mesh(new THREE.CylinderGeometry(RS, RS, 1, 24, 1, true), wallM); shaftWall.geometry.translate(0, -0.5, 0); shaftWall.position.set(X1, 0, PZ); shaftWall.visible = false; root.add(shaftWall);
  const bell = new THREE.Mesh(new THREE.LatheGeometry(bellProfile(0.001), 24), wallM); bell.position.set(X1, 0, PZ); bell.visible = false; root.add(bell);
  const collarShape = new THREE.Shape(); collarShape.moveTo(-0.9, -0.9); collarShape.lineTo(0.9, -0.9); collarShape.lineTo(0.9, 0.9); collarShape.lineTo(-0.9, 0.9); collarShape.lineTo(-0.9, -0.9);
  const hp = new THREE.Path(); hp.absarc(0, 0, RS, 0, Math.PI * 2, true); collarShape.holes.push(hp);
  const cg = new THREE.ShapeGeometry(collarShape, 24); cg.rotateX(-Math.PI / 2);
  const collar = new THREE.Mesh(cg, mat(0x6d5238, { r: 1 })); collar.position.set(X1, 0.03, PZ); collar.visible = false; root.add(collar);

  // camisas de concreto (anéis)
  const ringM = mat(0xb9b5aa, { r: 0.95 });
  const rings = [];
  for (let i = 0; i < NL; i++) {
    const h = i === 0 ? 1.3 : 0.96;
    const g = new THREE.CylinderGeometry(RI + 0.03, RI + 0.03, 1, 24, 1, true); g.translate(0, -0.5, 0);
    const m = new THREE.Mesh(g, ringM); m.position.set(X1, i === 0 ? 0.3 : -i, PZ); m.userData.h = h; m.scale.y = 0.001; m.visible = false; root.add(m); rings.push(m);
  }
  // concreto
  const concM = mat(0x85827a, { r: 0.95 });
  const bellConc = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.9, 0], [1.18, 0.15], [1.18, 0.65], [0.55, 1.0], [0, 1.0]].map(([r, y]) => new THREE.Vector2(r, y)), 24), concM); bellConc.position.set(X1, -BASE, PZ); bellConc.visible = false; root.add(bellConc);
  const shaftConc = new THREE.Mesh(new THREE.CylinderGeometry(RI - 0.01, RI - 0.01, 1, 24), concM); shaftConc.geometry.translate(0, 0.5, 0); shaftConc.position.set(X1, -SH, PZ); shaftConc.visible = false; root.add(shaftConc);

  // seções (caps) do concreto, desenhadas à frente da parede de corte
  const capM = noclip(0x85827a, { e: 0x57554f });
  const shaftCap = new THREE.Mesh(new THREE.PlaneGeometry(2 * (RI - 0.01), 1), capM); shaftCap.geometry.rotateY(-Math.PI / 2); shaftCap.geometry.translate(0, 0.5, 0); shaftCap.position.set(X1 - 0.01, -SH, PZ); shaftCap.visible = false; root.add(shaftCap);
  const bShape = new THREE.Shape(); [[-0.9, 0], [-1.18, 0.15], [-1.18, 0.65], [-0.55, 1.0], [0.55, 1.0], [1.18, 0.65], [1.18, 0.15], [0.9, 0]].forEach(([u, y], i) => (i ? bShape.lineTo(u, y) : bShape.moveTo(u, y)));
  const bcg = new THREE.ShapeGeometry(bShape); bcg.rotateY(-Math.PI / 2);
  const bellCap = new THREE.Mesh(bcg, capM); bellCap.position.set(X1 - 0.01, -BASE, PZ); bellCap.visible = false; root.add(bellCap);
  // armação de arranque
  const cage = new THREE.Group(); cage.visible = false; root.add(cage);
  const cageM = mat(0x3a3d42, { r: 0.5, m: 0.5 });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 4.4, 6), cageM); b.position.set(Math.cos(a) * 0.3, -0.7, Math.sin(a) * 0.3); cage.add(b); }
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 5, 16), cageM); r.rotation.x = Math.PI / 2; r.position.y = 1.2 - i * 0.35; cage.add(r); }
  const cageSec = new THREE.Group(); root.add(cageSec); cageSec.visible = false;
  for (const dz of [-0.3, 0.3]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, 4.4, 0.04), noclip(0x24272b)); l.position.set(X1 - 0.03, -0.7, dz); cageSec.add(l); }

  // tripé, balde e guincho
  const tri = new THREE.Group(); tri.visible = false; root.add(tri);
  const wood = mat(0x8a6a43, { r: 0.9 });
  const APEX = new THREE.Vector3(X1, 5.4, PZ);
  for (const a of [0.5, 2.6, 4.7]) { const p = new THREE.Vector3(X1 + Math.cos(a) * 2.4, 0, PZ + Math.sin(a) * 2.4); const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, p.distanceTo(APEX)), wood); m.position.copy(p).add(APEX).multiplyScalar(0.5); m.lookAt(APEX); m.castShadow = true; tri.add(m); }
  tri.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 12), dark).translateX(X1).translateY(5.4).translateZ(PZ).rotateX(Math.PI / 2));
  tri.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.8), mat(0xe8742c)).translateX(X1 + 3.3).translateY(0.4).translateZ(PZ + 1.6));
  const rope = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.03), dark); root.add(rope);
  const bucket = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.4, 10), mat(0x9aa0a8, { m: 0.5 })); b.position.y = -0.2; bucket.add(b); } root.add(bucket);
  const spoil = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1, 12), mat(0x7a5a3a, { r: 1 })); spoil.geometry.translate(0, 0.5, 0); spoil.position.set(-38.4, 0, 22.5); spoil.visible = false; root.add(spoil);
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), mat(0x3b8fd6, { r: 0.7 })); hose.geometry.translate(0, -0.5, 0); hose.position.set(X1 + 0.38, 0.4, PZ + 0.1); hose.visible = false; root.add(hose);
  const blower = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6), mat(0x3b8fd6)); blower.position.set(X1 + 0.9, 0.3, PZ - 1.6); blower.visible = false; root.add(blower);

  // pessoas
  const worker = person(0xe8742c); worker.group.scale.setScalar(0.8); worker.group.visible = false; root.add(worker.group);
  const insp = person(0xf4f1ea, 0xffffff); insp.group.scale.setScalar(0.8); insp.group.visible = false; root.add(insp.group);
  const pA = person(0x4a8fd0), pB = person(0xe8742c); [pA, pB].forEach((p) => root.add(p.group));
  const winchMan = person(0x3a3d42, 0xf2b705); root.add(winchMan.group);
  // caminhão e funil
  const truck = M.mixerTruck(); truck.scale.setScalar(0.62); truck.visible = false; root.add(truck);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1), mat(0x9aa0a8, { m: 0.4 })); chute.visible = false; root.add(chute);
  const funnel = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.9, 12, 1, true), mat(0xe8742c, { side: THREE.DoubleSide })); funnel.rotation.x = Math.PI; funnel.position.set(X1, 1.0, PZ); funnel.visible = false; root.add(funnel);
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 6, 5), mat(0x8b8880, { r: 1 }), 14); drops.frustumCulled = false; drops.visible = false; root.add(drops);

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(C2_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};
  const lifts = (t) => { const k = Math.min(NL, Math.max(0, Math.floor((t - T.dig0) / T.LIFT))); const f = (t - T.dig0 - k * T.LIFT) / T.LIFT; return { k, f }; };
  function depthAt(t) { if (t < T.dig0) return 0; const { k, f } = lifts(t); if (k >= NL) return SH; return k + ease(clamp01(f / 0.6)); }
  function info(t) {
    if (t < T.dig0) return { step: 0, p: t / T.s2, note: 'Armando o tripé sobre o ponto' };
    if (t < T.s2) { const { k } = lifts(t); return { step: 0, p: win(t, 0, T.s2), note: `Trecho ${Math.min(NL, k + 1)} de ${NL} · ${(depthAt(t)).toFixed(1).replace('.', ',')} m de fuste` }; }
    if (t < T.s3) return { step: 1, p: win(t, T.s2, T.s3), note: 'Alargando a base em campana' };
    if (t < T.s4) return { step: 2, p: win(t, T.s3, T.s4), note: t < T.insp0 + 3.4 ? 'Engenheiro desce ao fundo' : t < T.insp1 ? 'Conferindo cota e camada de apoio' : 'Base aprovada · subindo' };
    return { step: 3, p: win(t, T.s4, T.END), note: t < T.cage1 ? 'Descendo as barras de arranque' : t < T.pb1 ? 'Concretando a base' : t < T.ps1 ? 'Concretando o fuste' : 'Concreto adensado e curando' };
  }
  const hasBell = (t) => clamp01((t - T.bell0) / (T.bell1 - T.bell0));
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
  let lastG = -1;

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    const d = depthAt(t), g = ease(hasBell(t));
    shaftWall.visible = d > 0.02; shaftWall.scale.y = Math.max(0.001, d);
    collar.visible = d > 0.02;
    terrainHoles[0].set(X1 - 0.9, X1 + 0.9, PZ - 0.9, PZ + 0.9);
    if (d > 0.02) section.setBand(0, PZ - RS, PZ + RS, -d, 0.05); else section.setBand(0, 0, 0, 0, 0);
    if (g > 0.01) section.setBand(1, PZ - (RS + 0.6 * g), PZ + (RS + 0.6 * g), -SH - g, -SH + 0.01); else section.setBand(1, 0, 0, 0, 0);
    // sino
    bell.visible = g > 0.01;
    if (g > 0.01 && Math.abs(g - lastG) > 0.004) { bell.geometry.dispose(); bell.geometry = new THREE.LatheGeometry(bellProfile(g), 24); lastG = g; }
    // camisas
    rings.forEach((r, i) => { const s = T.dig0 + i * T.LIFT + 1.9; const f = ease(win(t, s, s + 1.2)); r.visible = f > 0.01; r.scale.y = Math.max(0.001, r.userData.h * f); });
    // tripé, balde, ventilação
    const triF = ease(win(t, T.tri0, T.tri1)) * (1 - ease(win(t, T.tOut0 - 8, T.tOut0 - 6)));
    tri.visible = triF > 0.01; tri.scale.setScalar(Math.max(0.001, triF));
    const inDig = t >= T.dig0 && t < T.bell1;
    const floorY = t < T.s2 ? -d : -SH - g;
    let by = 4.2, bx2 = X1, dumping = 0;
    if (inDig) {
      const cyc = ((t - T.dig0) % T.LIFT) / T.LIFT * T.LIFT; // 0..LIFT
      if (cyc < 0.7) by = 4.2 + (floorY + 0.3 - 4.2) * ease(cyc / 0.7); else if (cyc < 1.9) by = floorY + 0.3; else if (cyc < 2.7) by = floorY + 0.3 + (4.2 - floorY - 0.3) * ease((cyc - 1.9) / 0.8); else { by = 4.2; dumping = ease((cyc - 2.7) / 0.25) * ease((T.LIFT - cyc) / 0.25 + 0.0); }
      bx2 = X1 + (-38.4 - X1) * 0 + 0;
    } else if (t >= T.s4 && t < T.cage1) { by = 4.2; }
    bucket.visible = inDig && tri.visible; bucket.position.set(X1 + dumping * 1.4, by, PZ + dumping * 2.0);
    rope.visible = bucket.visible; rope.scale.y = Math.max(0.01, APEX.y - by); rope.position.set(X1 + dumping * 0.7, (APEX.y + by) / 2, PZ + dumping * 1.0); void bx2;
    // solo trazido
    const sv = clamp01((Math.min(t, T.bell1) - T.dig0) / (T.bell1 - T.dig0));
    spoil.visible = sv > 0.03; spoil.scale.set(0.8 + 0.8 * sv, 0.2 + 1.0 * sv, 0.8 + 0.8 * sv);
    hose.visible = t > T.dig0 + 6 && t < T.tIn1; blower.visible = hose.visible;
    hose.scale.y = Math.max(0.01, 0.4 + floorY * -1 + 0.2); hose.position.y = 0.4;
    // operário e inspetor
    const wOn = inDig && t < T.bell1 + 0.3;
    worker.group.visible = wOn; worker.group.position.set(X1 + 0.0, floorY, PZ); worker.group.rotation.y = Math.PI / 2; worker.upper.rotation.x = 0.4 + 0.25 * Math.sin(tAbs * 5);
    const iDown = ease(win(t, T.insp0, T.insp0 + 3.4)) * (1 - ease(win(t, T.insp1, T.up1)));
    insp.group.visible = iDown > 0.01 && t < T.up1 + 0.1; insp.group.position.set(X1, 4.0 + (-SH - 1.0 - 4.0) * iDown, PZ); insp.group.rotation.y = Math.PI / 2; insp.upper.rotation.x = 0.1 + (t > T.insp0 + 3.4 && t < T.insp1 ? 0.3 * Math.sin(tAbs * 2) : 0);
    // armação
    const cgp = ease(win(t, T.cage0, T.cage1));
    cage.visible = t >= T.cage0 - 0.2; cage.position.set(X1, 6.0 * (1 - cgp), PZ);
    cageSec.visible = cage.visible && cgp > 0.4; cageSec.position.y = 6.0 * (1 - cgp);
    // concreto
    const fb = ease(win(t, T.pb0, T.pb1)), fs = ease(win(t, T.pb1, T.ps1));
    bellConc.visible = fb > 0.01; bellConc.scale.y = Math.max(0.001, fb);
    shaftConc.visible = fs > 0.01; shaftConc.scale.y = Math.max(0.001, SH * fs + 0.25 * fs);
    concM.color.copy(WET).lerp(CURED, clamp01((t - T.ps1) / 6));
    capM.color.copy(concM.color);
    bellCap.visible = fb > 0.01; bellCap.scale.y = Math.max(0.001, fb);
    shaftCap.visible = fs > 0.01; shaftCap.scale.y = Math.max(0.001, SH * fs + 0.25 * fs - 0.0);
    // caminhão, calha e funil
    const trIn = ease(win(t, T.tIn0, T.tIn1)), trOut = ease(win(t, T.tOut0, T.tOut1));
    const tVis = t >= T.tIn0 && t < T.tOut1 + 0.2;
    truck.visible = tVis; truck.position.set(-30.5 + 9 * (1 - trIn) + 9 * trOut, 0, 27.0); truck.userData.spin.rotation.x = tAbs * 2.5;
    funnel.visible = t >= T.tIn1 - 0.5 && t < T.ps1 + 1;
    const pour = t > T.pb0 && t < T.ps1;
    chute.visible = tVis && t > T.tIn1 - 0.3 && t < T.ps1 + 0.6;
    { const c0 = new THREE.Vector3(truck.position.x - 3.0, 1.55, 27.0), c1 = new THREE.Vector3(X1 + 0.5, 1.5, PZ + 0.4); chute.position.copy(c0).add(c1).multiplyScalar(0.5); chute.scale.z = Math.max(0.01, c0.distanceTo(c1)); chute.lookAt(c1); }
    drops.visible = pour;
    if (pour) for (let i = 0; i < 14; i++) { const f = (tAbs * 1.4 + i / 14) % 1; const lvlY = t < T.pb1 ? -BASE + 1.0 * fb : -SH + SH * fs; v.set(X1 + Math.sin(i * 3.1) * 0.12, 1.2 + (lvlY - 1.2) * f, PZ + Math.cos(i * 2.3) * 0.12); m4.makeTranslation(v.x, v.y, v.z); drops.setMatrixAt(i, m4); } drops.instanceMatrix.needsUpdate = true;
    // pessoas de apoio
    const pw = (p, x0, x1, z, sp, bend, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp + ph); p.group.position.set(x0 + (x1 - x0) * u, 0, z); p.group.rotation.y = Math.cos(tAbs * sp + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = bend; };
    pw(pA, -33, -29.5, 16.4, 0.5, 0.12, 0); pw(pB, -32.5, -28.5, 23.5, 0.45, 0.12, 1.7);
    winchMan.group.position.set(X1 + 4.2, 0, PZ + 1.8); winchMan.group.rotation.y = Math.PI / 2 + 0.3; winchMan.upper.rotation.x = inDig ? 0.2 + 0.15 * Math.sin(tAbs * 3) : 0.05;

    const a = anchors;
    a.fuste.set(X1 - 0.03, -3.2, PZ - RS - 0.02);
    a.camisa.set(X1 - 0.03, -1.6, PZ + RS + 0.02);
    a.base.set(X1 - 0.03, -SH - 0.55, PZ + 1.3);
    a.insp.set(X1 - 0.03, -SH - 0.6, PZ - 1.3);
    a.arm.set(X1 - 0.03, -0.5, PZ + 0.32);
    a.conc.set(X1 - 0.03, -4.5, PZ - RS - 0.02);
    a.na.set(X1 - 0.06, -9.55, PZ - 5);
    a.solo.set(X1, -15, PZ);
  }
  function labelVis(k, t = st.tc) {
    switch (k) {
      case 'fuste': return t > T.dig0 + 6 && t < T.s3;
      case 'camisa': return t > T.dig0 + 4.5 && t < T.bell0 + 3;
      case 'base': return t > T.bell0 + 5 && t < T.s4;
      case 'insp': return t > T.insp0 + 3.4 && t < T.insp1;
      case 'arm': return t > T.cage1 && t < T.pb1 + 2;
      case 'conc': return t > T.ps1 - 4;
      case 'na': return t > T.bell1;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; lastG = -1; hidden.g = engine.scene.getObjectByName('c-rig'); if (hidden.g) hidden.g.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); if (hidden.g) hidden.g.visible = true; },
  };
}
