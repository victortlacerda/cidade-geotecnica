import * as THREE from 'three';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, capRect, person } from './fund.js';

// ---------------------------------------------------------------------------
// C6 Estaca pré-moldada cravada e C7 Estaca metálica: mesmo método (bate-estaca,
// emenda, nega), perfis diferentes. Seção em x = X1 passando pelo eixo da estaca.
// ---------------------------------------------------------------------------
const X1 = -40, PZ = 20, MAST = 16.5;
const T = {
  rigIn0: 0.4, rigIn1: 4.2, mast0: 4.4, mast1: 7.0, lift0: 7.2, lift1: 10.2, s2: 10.4, d1a: 10.8, d1b: 27.2,
  s3: 28.0, park0: 27.4, park1: 28.6, hoist0: 28.8, hoist1: 32.4, weld0: 32.8, weld1: 37.6, back0: 37.8, back1: 39.4, s4: 39.6, d2a: 40.0, d2b: 55.0, park2: 55.6, END: 59,
};
export const DRIVEN_BOX = { x0: -125, x1: X1, z0: 8, z1: 32 };
export const DRIVEN_STEP_STARTS = [0, T.s2, T.s3, T.s4];
export const DRIVEN_CAM = { tx: -39, ty: -0.5, tz: PZ, yaw: -1.3, pitch: 0.14, dist: 54 };
export const DRIVEN_MCAM = { tx: -39, ty: -9, tz: PZ, yaw: -1.3, pitch: 0.12, dist: 90 };

const CFG = {
  C6: {
    id: 'C6', nome: 'Estaca pré-moldada cravada', L1: 8.0, L2: 7.5, w: 0.5, steel: false,
    steps: [
      { t: 'Posicionar a estaca', d: 'A perfuratriz de cravação chega ao ponto locado e levanta o mastro. A estaca pré-moldada, fabricada em segmentos de concreto armado, é içada pelo cabo, aprumada sobre o ponto e encaixada sob o martelo.' },
      { t: 'Cravar com o martelo', d: 'O martelo cai sobre o capacete, no topo da estaca, e cada golpe a faz penetrar um pouco. Como a estaca desloca o solo em vez de retirá-lo, o terreno em volta é empurrado para o lado e levanta um pouco.' },
      { t: 'Emendar o segmento', d: 'Um único segmento não alcança a profundidade necessária. O martelo sobe, o segundo segmento é içado e encaixado sobre o primeiro, e a emenda é soldada nas placas metálicas de topo e base, mantendo o alinhamento.' },
      { t: 'Cravar até a nega', d: 'Os golpes continuam até a nega: a penetração por golpe fica tão pequena que mostra que a estaca encontrou a camada resistente. A nega é medida em milímetros por série de dez golpes e é o critério de parada.' },
    ],
    labels: [{ k: 'estaca', t: 'Estaca pré-moldada' }, { k: 'martelo', t: 'Martelo' }, { k: 'emenda', t: 'Emenda soldada' }, { k: 'heave', t: 'Solo deslocado' }, { k: 'ponta', t: 'Ponta na camada resistente' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] }],
  },
  C7: {
    id: 'C7', nome: 'Estaca metálica', L1: 7.5, L2: 7.5, w: 0.34, steel: true,
    steps: [
      { t: 'Posicionar o perfil', d: 'A perfuratriz de cravação chega ao ponto locado e levanta o mastro. O perfil de aço, em barras de 6 a 12 m, é içado, aprumado sobre o ponto e preso sob o martelo com um capacete de proteção.' },
      { t: 'Cravar o perfil', d: 'Os golpes do martelo empurram o perfil no solo. O perfil tem pouca área de ponta e desloca pouco solo, por isso penetra camadas difíceis com menos esforço do que uma estaca de concreto.' },
      { t: 'Soldar a emenda', d: 'O martelo sobe e a segunda barra é içada e encostada na primeira. O soldador une as duas com solda de topo e talas, e a emenda precisa ser tão resistente quanto o perfil.' },
      { t: 'Cravar até a nega ou rocha', d: 'Os golpes continuam até a nega: penetração mínima por série de dez golpes, indicando camada resistente ou rocha alterada. Daí o perfil é cortado na cota de arrasamento e ligado ao bloco.' },
    ],
    labels: [{ k: 'estaca', t: 'Perfil metálico' }, { k: 'martelo', t: 'Martelo' }, { k: 'emenda', t: 'Emenda soldada' }, { k: 'heave', t: 'Solo deslocado' }, { k: 'ponta', t: 'Ponta na camada resistente' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] }],
  },
};
export const C6_CFG = CFG.C6, C7_CFG = CFG.C7;

function create(engine, section, cfg) {
  const root = new THREE.Group(); root.visible = false;
  const { L1, L2, w } = cfg, LT = L1 + L2;
  const dark = mat(0x2f3237, { r: 0.6, m: 0.3 }), yel = mat(0xf2b705, { r: 0.7 });
  const bx = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; return o; };
  const pileMat = cfg.steel ? mat(0x6f7378, { r: 0.45, m: 0.6 }) : mat(0xc9c5ba, { r: 0.95 });

  // perfuratriz (bate-estaca)
  const rigG = new THREE.Group(); rigG.visible = false; root.add(rigG);
  for (const dz of [-1.9, 1.9]) rigG.add(bx(6.2, 1.0, 1.2, dark, -36.3, 0.55, PZ + dz));
  rigG.add(bx(4.6, 1.1, 3.2, yel, -36.4, 1.6, PZ), bx(1.7, 1.3, 1.5, mat(0x9fc4d8, { r: 0.3 }), -36.0, 2.8, PZ + 0.8), bx(1.8, 1.6, 2.6, dark, -33.8, 1.9, PZ));
  const mastG = new THREE.Group(); mastG.position.set(-39.1, 1.0, PZ); rigG.add(mastG);
  for (const dz of [-0.5, 0.5]) mastG.add(bx(0.28, MAST, 0.28, yel, 0, MAST / 2, dz));
  for (let y = 1; y < MAST; y += 1.6) mastG.add(bx(0.18, 0.14, 1.0, yel, 0, y, 0));
  mastG.add(bx(0.8, 0.7, 1.5, dark, 0, MAST + 0.2, 0));

  // estacas (grupos com base em y = 0)
  const mkPile = (L) => {
    const g = new THREE.Group();
    if (!cfg.steel) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, L, w), pileMat); b.position.y = L / 2; b.castShadow = true; g.add(b); const plate = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.05, w + 0.02), mat(0x3a3d42, { m: 0.6 })); plate.position.y = L - 0.02; g.add(plate); }
    else {
      const web = new THREE.Mesh(new THREE.BoxGeometry(0.03, L, w - 0.04), pileMat); web.position.set(0.0, L / 2, 0); g.add(web);
      for (const dz of [-1, 1]) { const fl = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, L, 0.04), pileMat); fl.position.set(0, L / 2, dz * (w / 2 - 0.02)); g.add(fl); }
    }
    return g;
  };
  const p1 = mkPile(L1), p2 = mkPile(L2); root.add(p1, p2); p1.visible = p2.visible = false;
  // desenho da estaca no plano do corte (em frente à parede)
  const overlayMat = noclip(cfg.steel ? 0x7d8288 : 0xc9c5ba, { r: 1 });
  const ovl = capRect(root, X1 - 0.05, PZ - w / 2, PZ + w / 2, 0, 1, overlayMat); ovl.renderOrder = 4; ovl.visible = false;
  const jointMark = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.16, w + 0.04), noclip(0x2a2d31)); jointMark.renderOrder = 5; jointMark.visible = false; root.add(jointMark);
  const edgeL = [-1, 1].map((s) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.01, 1, 0.025), noclip(cfg.steel ? 0xaeb3b9 : 0x9a968c)); l.renderOrder = 5; l.visible = false; root.add(l); return { l, s }; });

  // martelo e capacete
  const hammer = new THREE.Group(); root.add(hammer);
  const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.2, 14), mat(0xe8742c)); ram.position.y = 1.0; hammer.add(ram);
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.4, w + 0.25), mat(0x3a3d42, { m: 0.5 })); helmet.position.y = 0.2; hammer.add(helmet);
  const guide = bx(0.14, 2.6, 0.14, dark, 0.45, 1.3, 0); hammer.add(guide);
  hammer.visible = false;
  const puff = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), mat(0xc9c5ba, { op: 0, r: 1, dw: false })); root.add(puff);
  // solo deslocado e faíscas
  const heave = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.4, 14), mat(0x7a5a3a, { r: 1 })); heave.geometry.translate(0, 0.2, 0); heave.position.set(X1, 0.0, PZ); heave.visible = false; root.add(heave);
  const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffb347 }), 16); sparks.frustumCulled = false; sparks.visible = false; root.add(sparks);
  const glow = new THREE.Mesh(new THREE.TorusGeometry(w / 2 + 0.03, 0.04, 6, 16), new THREE.MeshBasicMaterial({ color: 0xff8a2b, transparent: true, opacity: 0 })); glow.rotation.x = Math.PI / 2; root.add(glow);
  const pA = person(0xe8742c), pB = person(0x4a8fd0, 0xf4f1ea); [pA, pB].forEach((p) => root.add(p.group));
  const welder = person(0x3a3d42, 0xcfd3d8); root.add(welder.group);
  const stake = new THREE.Group(); { const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat(0xcaa36a)); s.position.y = 0.45; const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.02), mat(0xd23b2e)); f.position.set(0.15, 0.85, 0); stake.add(s, f); }
  stake.position.set(X1 + 0.7, 0, PZ + 0.1); root.add(stake);

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(cfg.labels.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {}, TIP0 = 0.3, TIP1 = -(L1 - 1.2), TIP2 = -14.5;
  const N1 = 16, N2 = 15;
  // penetração acumulada com saltos a cada golpe
  const blow = (t, a, b, N) => { const tt = clamp01((t - a) / (b - a)) * N, n = Math.floor(tt), f = tt - n; return { n: Math.min(N, n), f, hit: n < N }; };
  const sink = (n, f, N, k) => { const x = (Math.min(N, n) + (n < N ? ease(clamp01((f - 0.4) / 0.2)) : 0)) / N; return k ? 1 - Math.pow(1 - x, k) : x; };
  const hh = (f) => (f < 0.4 ? 1.6 * ease(f / 0.4) : f < 0.5 ? 1.6 * (1 - Math.pow((f - 0.4) / 0.1, 2)) : 0);
  function info(t) {
    if (t < T.s2) return { step: 0, p: t / T.s2, note: t < T.rigIn1 ? 'Bate-estaca chegando ao ponto' : t < T.mast1 ? 'Levantando e aprumando o mastro' : 'Içando e aprumando a estaca' };
    if (t < T.s3) { const b = blow(t, T.d1a, T.d1b, N1); return { step: 1, p: win(t, T.s2, T.s3), note: t < T.d1a ? 'Estaca sob o martelo' : `Golpe ${Math.max(1, b.n + (b.hit ? 1 : 0))} · penetração ${(TIP0 - sinkTip1(b)).toFixed(1).replace('.', ',')} m` }; }
    if (t < T.s4) return { step: 2, p: win(t, T.s3, T.s4), note: t < T.park1 ? 'Martelo sobe' : t < T.hoist1 ? 'Içando o segundo segmento' : t < T.weld1 ? 'Soldando a emenda' : 'Martelo volta ao topo' };
    const b = blow(t, T.d2a, T.d2b, N2);
    if (t < T.d2b) { const pen = (N2 - b.n); const nega = Math.max(4, Math.round(60 * Math.pow(pen / N2, 1.4))); return { step: 3, p: win(t, T.s4, T.END), note: `Cravando · nega ${nega} mm / 10 golpes` }; }
    return { step: 3, p: win(t, T.s4, T.END), note: 'Nega atingida · 4 mm / 10 golpes' };
  }
  function sinkTip1(b) { return TIP0 + (TIP1 - TIP0) * sink(b.n, b.f, N1, 0); }
  const sparksM = new THREE.Matrix4(), v = new THREE.Vector3();

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    // perfuratriz
    const rin = ease(win(t, T.rigIn0, T.rigIn1)), raise = ease(win(t, T.mast0, T.mast1));
    rigG.visible = t > 0.2; rigG.position.set(10 * (1 - rin), 0, 0); mastG.rotation.z = -1.32 * (1 - raise);
    stake.visible = t < T.lift1;

    // penetração
    const b1 = blow(t, T.d1a, T.d1b, N1), b2 = blow(t, T.d2a, T.d2b, N2);
    let tip;
    if (t < T.d1a) tip = TIP0; else if (t < T.s3) tip = TIP0 + (TIP1 - TIP0) * sink(b1.n, b1.f, N1, 0); else if (t < T.d2a) tip = TIP1; else tip = TIP1 + (TIP2 - TIP1) * sink(b2.n, b2.f, N2, 1.6);
    const seg2 = t >= T.hoist0;
    const total = seg2 ? LT : L1, top = tip + total;
    terrainHoles[0].set(0, 0, 0, 0);

    // estaca 1: içamento (deitada → vertical) e cravação
    const lf = ease(win(t, T.lift0, T.lift1));
    p1.visible = t > T.lift0 - 0.4;
    if (t < T.lift1) { const lie = 1 - lf; p1.position.set(X1 + 0.0, 0.5 * lie + TIP0 * (1 - lie), PZ); p1.rotation.z = -Math.PI / 2 * lie; } else { p1.position.set(X1, tip, PZ); p1.rotation.z = 0; }
    // estaca 2: levanta ao lado e assenta sobre a 1
    const hf = ease(win(t, T.hoist0, T.hoist1));
    p2.visible = seg2;
    if (t < T.hoist1) { const lie = 1 - hf; p2.position.set(X1 + 0.7 * lie, 0.5 * lie + (tip + L1 + 0.1) * (1 - lie), PZ); p2.rotation.z = -Math.PI / 2 * lie; } else { p2.position.set(X1, tip + L1, PZ); p2.rotation.z = 0; }
    // desenho no plano do corte
    const vertical = t >= T.lift1 - 0.2;
    ovl.visible = vertical; const oy0 = tip, oh = Math.max(0.01, (seg2 && t >= T.hoist1 ? LT : L1) - 0.0);
    ovl.position.y = oy0; ovl.scale.y = oh;
    jointMark.visible = seg2 && t >= T.hoist1; jointMark.position.set(X1 - 0.056, tip + L1, PZ);
    edgeL.forEach(({ l, s }) => { l.visible = vertical; l.scale.y = Math.max(0.01, oh); l.position.set(X1 - 0.056, oy0 + oh / 2, PZ + s * (w / 2 - 0.05)); });

    // martelo
    const hammerParked = (t >= T.park0 && t < T.back0) ? ease(win(t, T.park0, T.park1)) * (t < T.hoist1 + 4 ? 1 : 1 - ease(win(t, T.back0, T.back1))) : 0;
    const parkLate = ease(win(t, T.park2, T.park2 + 1.4));
    const park = Math.max(hammerParked, parkLate);
    hammer.visible = t >= T.lift1;
    let lift = 0, blowF = 0, hit = false;
    if (t >= T.d1a && t < T.s3 - 0.6 && b1.hit) { lift = hh(b1.f); blowF = b1.f; hit = true; }
    if (t >= T.d2a && t < T.d2b && b2.hit) { lift = hh(b2.f); blowF = b2.f; hit = true; }
    const parkY = MAST - 3.0 - top;
    hammer.position.set(X1, top + lift + parkY * park, PZ);
    helmet.position.y = 0.2 - lift; // o capacete fica sobre a estaca enquanto o martelo sobe
    // poeira no impacto
    const pf = hit && blowF > 0.5 ? clamp01((blowF - 0.5) / 0.4) : 0;
    puff.position.set(X1, top + 0.5 + pf * 0.5, PZ); puff.scale.setScalar(0.6 + pf * 1.2); puff.material.opacity = pf > 0 ? 0.35 * (1 - pf) : 0;
    // solo deslocado
    const pen = clamp01((TIP0 - tip) / (TIP0 - TIP2));
    heave.visible = pen > 0.02; heave.scale.set(0.9 + pen * 0.7, 0.3 + pen * 1.4, 0.9 + pen * 0.7);
    // solda
    const wOn = t > T.weld0 && t < T.weld1;
    sparks.visible = wOn;
    if (wOn) for (let i = 0; i < 16; i++) { const f = (tAbs * 3 + i * 0.37) % 1, a = i * 2.4 + Math.floor(tAbs * 3 + i * 0.37) * 1.3; v.set(X1 + Math.cos(a) * f * 0.7, tip + L1 + 0.1 + f * 0.5 - f * f * 1.2, PZ + Math.sin(a) * f * 0.7); sparksM.makeTranslation(v.x, Math.max(0.05, v.y), v.z); sparks.setMatrixAt(i, sparksM); } sparks.instanceMatrix.needsUpdate = true;
    glow.position.set(X1, tip + L1 + 0.02, PZ); glow.material.opacity = wOn ? 0.5 + 0.4 * Math.sin(tAbs * 20) : (t >= T.weld1 && t < T.weld1 + 3 ? 0.4 * (1 - win(t, T.weld1, T.weld1 + 3)) : 0); glow.visible = glow.material.opacity > 0.01;
    // pessoas
    const pw = (p, x0, x1, z, sp, bend, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp + ph); p.group.position.set(x0 + (x1 - x0) * u, 0, z); p.group.rotation.y = Math.cos(tAbs * sp + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = bend; };
    pw(pA, -33, -29.5, 16.4, 0.5, 0.12, 0); pw(pB, -32, -28, 24.2, 0.45, 0.12, 1.7);
    welder.group.visible = t > T.hoist1 - 1 && t < T.weld1 + 1; welder.group.position.set(X1 + 1.4, 0, PZ + 0.8); welder.group.rotation.y = -Math.PI / 2 - 0.5; welder.upper.rotation.x = wOn ? 0.55 : 0.15;

    const a = anchors;
    a.estaca.set(X1 - 0.06, Math.max(-4, tip + 3), PZ + w / 2 + 0.3);
    a.martelo.set(X1 - 0.3, top + 1.4 + lift + parkY * park, PZ + 0.7);
    a.emenda.set(X1 - 0.06, tip + L1, PZ - w / 2 - 0.3);
    a.heave.set(X1 + 0.5, 0.5, PZ + 1.0);
    a.ponta.set(X1 - 0.06, tip + 0.3, PZ + w / 2 + 0.3);
    a.solo.set(X1, -19, PZ);
  }
  function labelVis(k, t = st.tc) {
    switch (k) {
      case 'estaca': return t > T.lift1 + 0.5 && t < T.d2a + 6;
      case 'martelo': return t > T.d1a + 2 && t < T.park0 - 0.5 || (t > T.back1 && t < T.d2b - 3);
      case 'emenda': return t > T.weld0 + 1;
      case 'heave': return t > T.d1a + 8 && t < T.park0 || t > T.d2a + 3;
      case 'ponta': return t > T.d2b - 4;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hidden.g = engine.scene.getObjectByName('c-rig'); if (hidden.g) hidden.g.visible = false; },
    exit() { st.active = false; root.visible = false; if (hidden.g) hidden.g.visible = true; },
  };
}
export const createC6 = (engine, section) => create(engine, section, CFG.C6);
export const createC7 = (engine, section) => create(engine, section, CFG.C7);
