import * as THREE from 'three';
import { RIVER, COFFER } from '../config.js';
import { H } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person } from './fund.js';
import { textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// J2 — Ensecadeira. A seção é o plano x = X1J, que corta o rio de margem a margem passando pelo meio da ensecadeira
// (ao lado da ponte). O recinto de estacas-prancha é cravado no leito, o fundo é escavado sob água, recebe um selo de
// concreto submerso, a água é bombeada para fora com o escoramento entrando por níveis, e o bloco e o pilar são feitos a seco.
// Os desenhos do processo são planos, colados na face; guindaste, balsa, bomba e o recinto em 3D ficam atrás da face.
// Valores de exemplo, não são de projeto.
// ---------------------------------------------------------------------------
export const X1J = 95;
const XP = X1J - 0.045, Z0 = COFFER.z0, Z1 = COFFER.z1, ZM = (Z0 + Z1) / 2;
const WL = RIVER.water, BED = RIVER.bed, TOP = WL + 1.4, TIP = BED - 6.8, DEXC = BED - 2.3, SEAL = DEXC + 1.5, BLK = SEAL + 1.2;
const STR = [WL + 0.5, BED + 0.9];                                                   // níveis de escora
const GW = 9.81, GC = 24;
const HEAD = WL - DEXC, UP = GW * HEAD, WSEAL = GC * (SEAL - DEXC), ADH = UP - WSEAL;  // subpressão no fundo do selo e o que o atrito precisa resistir
const fmt = (v, n = 1) => v.toFixed(n).replace('.', ',');
export const J2_CAM = { tx: X1J, ty: -2.6, tz: ZM - 1, yaw: -1.3, pitch: 0.18, dist: 36 };
export const J2_MCAM = { tx: X1J, ty: -3.6, tz: ZM - 1, yaw: -1.3, pitch: 0.18, dist: 70 };
export const J2_BOX = { x0: -125, x1: X1J, z0: -102, z1: -56 };
const T_POS = 12, T_DR0 = 13, T_DR1 = 40, T_EX0 = 42, T_EX1 = 54, T_SL0 = 55, T_SL1 = 64, T_PU0 = 66, T_PU1 = 86, T_BK0 = 88, T_BK1 = 98, T_PL1 = 107, T_RM0 = 109, T_RM1 = 124, END = 130;
export const J2_STARTS = [0, T_DR0, T_EX0, T_PU0, T_BK0, T_RM0];
export const J2_STEPS = [
  { t: 'Posicionamento e gabarito', d: 'Para construir o bloco de um pilar no meio do rio, é preciso trabalhar a seco. A ensecadeira é um recinto provisório que separa um pedaço do rio. Uma balsa com guindaste se posiciona, e um gabarito (uma moldura de perfis) é colocado na água para guiar as estacas no alinhamento certo.' },
  { t: 'Cravação das estacas-prancha', d: `As estacas-prancha são perfis de aço que se encaixam lateralmente uns nos outros, formando uma parede contínua. O martelo vibratório, pendurado no guindaste, crava cada peça até ${fmt(BED - TIP)} m abaixo do leito. A ficha (o trecho enterrado) dá apoio à parede e alonga o caminho da água por baixo dela, o que reduz a entrada de água e o risco de o fundo "ferver" (sifonamento).` },
  { t: 'Escavação sob água e selo de concreto', d: `Com o recinto fechado, mas ainda cheio, o fundo é escavado com uma caçamba de mandíbulas (clamshell) até ${fmt(BED - DEXC)} m abaixo do leito. Depois, um tubo tremonha leva concreto até o fundo, sem que ele se misture com a água, e forma o selo de concreto submerso, com ${fmt(SEAL - DEXC)} m de espessura. O selo veda o fundo e resiste à subpressão da água quando o recinto for esvaziado.` },
  { t: 'Esgotamento e escoramento', d: `A bomba retira a água do recinto. À medida que o nível desce, entram os quadros de escoras, porque a água de fora empurra as paredes com uma pressão que cresce com a profundidade. Esvaziado, o recinto fica com ${fmt(HEAD)} m de água de diferença até o fundo do selo: a subpressão ali é de ${fmt(UP, 0)} kPa. O selo pesa ${fmt(WSEAL, 0)} kPa, e os ${fmt(ADH, 0)} kPa que faltam são resistidos pela aderência do concreto às estacas-prancha.` },
  { t: 'Bloco e pilar a seco', d: 'Com o recinto seco, armadores e carpinteiros montam a armadura e as formas do bloco de coroamento sobre o selo, e o concreto é lançado normalmente. Do bloco sobem os arranques e depois o pilar, que vai sustentar a viga da ponte. A bomba continua ligada para tirar a pouca água que ainda infiltra.' },
  { t: 'Inundação e retirada', d: 'Pronto o pilar, o recinto é inundado de novo, para igualar a pressão dentro e fora, e as escoras são retiradas de baixo para cima. O martelo vibratório extrai as estacas-prancha, que são reaproveitadas em outra obra. No rio fica só o pilar sobre o bloco, apoiado no selo e no leito.' },
];
export const J2_LABELS = [
  { k: 'balsa', t: 'Balsa com guindaste' }, { k: 'gab', t: 'Gabarito de cravação' }, { k: 'vib', t: 'Martelo vibratório' }, { k: 'sp', t: 'Estacas-prancha' }, { k: 'ficha', t: 'Ficha (trecho enterrado)' },
  { k: 'clam', t: 'Caçamba clamshell' }, { k: 'trem', t: 'Tubo tremonha' }, { k: 'selo', t: 'Selo de concreto submerso' }, { k: 'bomba', t: 'Bomba de esgotamento' }, { k: 'esc', t: 'Quadros de escoras' },
  { k: 'naf', t: 'Nível do rio' }, { k: 'nad', t: 'Nível dentro do recinto' }, { k: 'emp', t: 'Pressão da água nas paredes' }, { k: 'sub', t: 'Subpressão sob o selo' }, { k: 'bloco', t: 'Bloco de coroamento' },
  { k: 'pilar', t: 'Pilar da ponte' }, { k: 'op', t: 'Encarregado' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const J2 = { box: J2_BOX };

export function createJ2(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const mk = (th, color, ro, em, dx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; m.userData.dx = dx; root.add(m); return m; };
  const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP - (m.userData.dx || 0), (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
  const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP - (m.userData.dx || 0), y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
  const sbar = (m, za, ya, zb, yb) => { m.position.set(XP - (m.userData.dx || 0), (ya + yb) / 2, (za + zb) / 2); m.rotation.set(-Math.atan2(yb - ya, zb - za), 0, 0); m.scale.z = Math.max(0.001, Math.hypot(zb - za, yb - ya)); };
  // retângulo plano colado na face (z de za a zb, y de ya a yb)
  const rect = (color, ro, dx, op = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), noclip(color, { r: 0.4, e: color, op, dw: op >= 1 })); m.material.emissiveIntensity = 0.18; if (op < 1) { m.material.transparent = true; m.material.opacity = op; } m.material.side = THREE.DoubleSide; m.rotation.y = -Math.PI / 2; m.renderOrder = ro; m.userData.dx = dx; m.visible = false; root.add(m); return m; };
  const setR = (m, za, zb, ya, yb) => { m.visible = zb - za > 0.01 && yb - ya > 0.01; if (!m.visible) return; m.position.set(XP - m.userData.dx, (ya + yb) / 2, (za + zb) / 2); m.scale.set(zb - za, yb - ya, 1); };

  // água do rio na face: polígono entre o leito e o nível d'água, de margem a margem (fora do recinto)
  const bedAt = (z) => Math.min(H(X1J, z), WL);
  const waterShape = (za, zb) => { const s = new THREE.Shape(); s.moveTo(za, WL); for (let z = za; z <= zb + 1e-6; z += 0.25) s.lineTo(z, bedAt(z)); s.lineTo(zb, WL); s.lineTo(za, WL); return s; };
  const wm = noclip(0x3d8fd1, { r: 0.3, e: 0x0d3a66 }); wm.transparent = true; wm.opacity = 0.82; wm.side = THREE.DoubleSide; wm.depthWrite = false;
  const mkWater = (za, zb) => { const g = new THREE.ShapeGeometry(waterShape(za, zb)); const m = new THREE.Mesh(g, wm); m.rotation.y = -Math.PI / 2; m.position.x = XP - 0.004; m.renderOrder = 6; root.add(m); return m; };
  let zl = RIVER.z1; for (let z = RIVER.z1; z > RIVER.z0 - 6; z -= 0.25) if (H(X1J, z) < WL) zl = z;
  let zr = RIVER.z0; for (let z = RIVER.z0; z < RIVER.z1 + 6; z += 0.25) if (H(X1J, z) < WL) zr = z;
  mkWater(Math.min(zl, zr), Z0); mkWater(Z1, Math.max(zl, zr));
  const inW = rect(0x3d8fd1, 7, 0.006, 0.82), dig = rect(0x2a2620, 5, 0.003), seal = rect(0x9a968e, 8, 0.008), blk = rect(0xc9c4b8, 9, 0.01), pier = rect(0xd6d1c6, 9, 0.01);
  const sps = [mk(0.22, 0x4f565e, 10, 0x111111, 0.012), mk(0.22, 0x4f565e, 10, 0x111111, 0.012)];
  const struts = STR.map(() => mk(0.28, 0xe8742c, 11, 0x3a1c00, 0.014)), walers = STR.map(() => [mk(0.4, 0xb8561c, 11, 0x2a1000, 0.016), mk(0.4, 0xb8561c, 11, 0x2a1000, 0.016)]);
  const cable = mk(0.05, 0x222222, 11, 0, 0.018), clam = mk(1.0, 0x3a3e45, 12, 0x111111, 0.02), trem = mk(0.3, 0x8a8f96, 12, 0x222222, 0.02), vibM = mk(0.9, 0xe8b300, 12, 0x4a3500, 0.02);
  const rebar = Array.from({ length: 6 }, () => mk(0.06, 0x3a3e45, 10, 0, 0.012)), starters = [mk(0.12, 0x3a3e45, 10, 0, 0.012), mk(0.12, 0x3a3e45, 10, 0, 0.012)];
  const arr = Array.from({ length: 6 }, () => ({ s: mk(0.1, 0xfff1d6, 12, 0x553300, 0.024), a: mk(0.1, 0xfff1d6, 12, 0x553300, 0.024), b: mk(0.1, 0xfff1d6, 12, 0x553300, 0.024) }));
  const up = Array.from({ length: 4 }, () => ({ s: mk(0.1, 0xffd0c8, 12, 0x551111, 0.024), a: mk(0.1, 0xffd0c8, 12, 0x551111, 0.024), b: mk(0.1, 0xffd0c8, 12, 0x551111, 0.024) }));
  const naIn = mk(0.06, 0x9fd2ff, 12, 0x0a3a66, 0.022), naOut = mk(0.06, 0x9fd2ff, 12, 0x0a3a66, 0.022);
  // quadro de valores
  const PW = 12, PH = 3.4, pn = textPanel(PW, PH, PW * 48, PH * 48, X1J - 0.07, -7.6, Z0 - 11.5), PG = pn.g; root.add(pn.mesh);
  let lastP = '';
  const drawPanel = (stage) => {
    if (stage === lastP) return; lastP = stage; const W = PW * 48, Hh = PH * 48; PG.clearRect(0, 0, W, Hh); PG.fillStyle = 'rgba(20,24,30,0.78)'; PG.beginPath(); PG.roundRect(0, 0, W, Hh, 12); PG.fill();
    PG.fillStyle = '#fff'; PG.font = '700 18px Arial'; PG.textAlign = 'left'; PG.fillText('Equilíbrio do selo (exemplo)', 14, 26);
    PG.font = '600 16px Arial'; PG.fillStyle = '#9fd2ff'; PG.fillText(`Coluna d'água até o fundo do selo: ${fmt(HEAD)} m`, 14, 56);
    PG.fillStyle = '#ffb3a6'; PG.fillText(`Subpressão u = 9,81 × ${fmt(HEAD)} = ${fmt(UP, 0)} kPa`, 14, 82);
    PG.fillStyle = '#e6e6e6'; PG.fillText(`Peso do selo (${fmt(SEAL - DEXC)} m × 24 kN/m³) = ${fmt(WSEAL, 0)} kPa`, 14, 108);
    PG.fillStyle = '#ffd166'; PG.fillText(`Aderência às estacas: ${fmt(ADH, 0)} kPa`, 14, 134);
    pn.tx.needsUpdate = true;
  };
  // 3D: balsa com guindaste, recinto de estacas-prancha (meia ensecadeira atrás da face), água interna, bomba
  const barge = new THREE.Group(); { const h = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 9), mat(0x5a5e66)); h.position.y = WL + 0.3; barge.add(h); const cb = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 3), mat(0xe8b300)); cb.position.set(0, WL + 1.7, -2); barge.add(cb); }
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 12), mat(0xe8b300)); boom.position.set(0, WL + 5.4, 1.6); boom.rotation.x = -0.7; barge.add(boom); barge.position.set(X1J + 7.5, 0, ZM); root.add(barge);
  const spr = new THREE.Group(); root.add(spr); const spM = mat(0x5f666e, { m: 0.3 });
  const spPieces = [];
  for (let x = X1J; x < COFFER.x1 - 0.01; x += 0.6) for (const z of [Z0, Z1]) spPieces.push([x + 0.3, z, 0.6, 0.14]);
  for (let z = Z0; z < Z1 - 0.01; z += 0.6) spPieces.push([COFFER.x1, z + 0.3, 0.14, 0.6]);
  const spMeshes = spPieces.map(([x, z, w, d], i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, TOP - TIP, d), spM); m.position.set(x, (TOP + TIP) / 2, z); m.userData.k = i / spPieces.length; m.castShadow = true; spr.add(m); return m; });
  const inWater = new THREE.Mesh(new THREE.PlaneGeometry(COFFER.x1 - X1J, Z1 - Z0), mat(0x3d8fd1, { r: 0.2 })); inWater.material.transparent = true; inWater.material.opacity = 0.88; inWater.rotation.x = -Math.PI / 2; inWater.position.set((X1J + COFFER.x1) / 2, WL, ZM); root.add(inWater);
  const pump = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.9), mat(0xe8742c)); pump.add(b); const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 3.0), mat(0x2f78c4)); p.position.set(0.2, -0.2, -2.0); pump.add(p); }
  pump.position.set(X1J + 1.0, TOP + 0.4, Z0 + 0.8); pump.visible = false; root.add(pump);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1, 8), mat(0x9fd2ff, { r: 0.2 })); jet.visible = false; root.add(jet);
  const chief = person(0x2f9c5a, 0xffffff); chief.group.visible = false; root.add(chief.group);
  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(J2_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const S = { lvl: WL, cy: WL, sp: TOP };
  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= END && st.hold <= 0) { st.tc = END - 0.001; st.hold = 3.5; }
    const t = st.tc; let note = '', label = null;
    // cravação: a ponta desce de TOP - 2 até TIP; a extração (fim) sobe as estacas
    const drv = ease(win(t, T_DR0, T_DR1)), ext = ease(win(t, T_RM0 + 6, T_RM1));
    const tip = t < T_DR0 ? null : TOP - 1.5 + (TIP - (TOP - 1.5)) * drv + (TOP + 3 - TIP) * ext;
    const spOn = tip !== null && t < T_RM1;
    sps.forEach((m, i) => { m.visible = spOn; if (spOn) vbar(m, i ? Z1 : Z0, tip, TOP + (tip - TIP) * 0 + 0 + (ext > 0 ? (TOP + 3 - TIP) * ext : 0)); });
    // fundo: escavação sob água, selo, bloco, pilar
    const bot = BED + (DEXC - BED) * ease(win(t, T_EX0, T_EX1));
    setR(dig, Z0 + 0.12, Z1 - 0.12, bot, BED + 0.02);
    const sealTop = DEXC + (SEAL - DEXC) * ease(win(t, T_SL0 + 1, T_SL1));
    setR(seal, Z0 + 0.12, Z1 - 0.12, DEXC, t > T_SL0 + 1 ? sealTop : DEXC);
    const bTop = SEAL + (BLK - SEAL) * ease(win(t, T_BK0 + 4, T_BK1));
    setR(blk, ZM - 2.2, ZM + 2.2, SEAL, t > T_BK0 + 4 ? bTop : SEAL);
    const pTop = BLK + (TOP + 1.0 - BLK) * ease(win(t, T_BK1 + 1, T_PL1));
    setR(pier, ZM - 0.8, ZM + 0.8, BLK, t > T_BK1 + 1 ? pTop : BLK);
    rebar.forEach((m, i) => { const on = t > T_BK0 && t < T_BK0 + 6; m.visible = on; if (on) { if (i < 3) hbar(m, ZM - 2.1, ZM + 2.1, SEAL + 0.15 + i * 0.45); else vbar(m, ZM - 1.9 + (i - 3) * 1.9, SEAL + 0.1, BLK - 0.05); } });
    starters.forEach((m, i) => { const on = t > T_BK1 - 2 && t < T_BK1 + 3; m.visible = on; if (on) vbar(m, ZM + (i ? 0.55 : -0.55), BLK - 0.6, BLK + 1.4); });
    // nível d'água dentro do recinto: desce no esgotamento, sobe na inundação
    let lvl = WL; if (t >= T_PU0) lvl = WL + (SEAL - WL) * ease(win(t, T_PU0, T_PU1)); if (t >= T_RM0) lvl = SEAL + (WL - SEAL) * ease(win(t, T_RM0, T_RM0 + 5));
    S.lvl = lvl; const inBot = Math.max(bot, t > T_SL0 + 1 ? sealTop : bot);
    setR(inW, Z0 + 0.12, Z1 - 0.12, inBot, lvl);
    inWater.position.y = lvl; inWater.visible = lvl > SEAL + 0.05;
    naIn.visible = t >= T_PU0 && t < T_RM0 + 5; if (naIn.visible) hbar(naIn, Z0 + 0.15, Z1 - 0.15, lvl + 0.02);
    naOut.visible = true; hbar(naOut, Z0 - 6, Z0 - 0.2, WL + 0.02);
    // escoras: entram quando o nível passa por elas; saem na retirada (de baixo para cima)
    STR.forEach((y, i) => { const inst = t >= T_PU0 && lvl < y - 0.4, rem = t >= T_RM0 + 4 + (STR.length - 1 - i) * 1.2; const on = inst && !rem || (t >= T_RM0 && !rem && t < T_RM1); struts[i].visible = on; walers[i].forEach((w, j) => { w.visible = on; if (on) vbar(w, j ? Z1 - 0.3 : Z0 + 0.3, y - 0.2, y + 0.2); }); if (on) hbar(struts[i], Z0 + 0.3, Z1 - 0.3, y); });
    // caçamba e tremonha
    const clOn = t >= T_EX0 && t < T_EX1 + 0.5; let cy = TOP + 3; if (clOn) { const ph = ((t - T_EX0) % 4) / 4; cy = ph < 0.5 ? TOP + 3 - (TOP + 3 - bot) * ease(ph * 2) : bot + (TOP + 3 - bot) * ease((ph - 0.5) * 2); }
    clam.visible = clOn; if (clOn) vbar(clam, ZM, cy, cy + 1.1); S.cy = cy;
    const trOn = t >= T_SL0 && t < T_SL1 + 0.5; trem.visible = trOn; if (trOn) vbar(trem, ZM + 0.8, sealTop + 0.2, TOP + 3.5);
    const vbOn = t >= T_DR0 && t < T_DR1 || (t >= T_RM0 + 6 && t < T_RM1); const vz = (Math.floor((t - T_DR0) / 3) % 2) ? Z1 : Z0; vibM.visible = vbOn; if (vbOn) vbar(vibM, vz, (spOn ? TOP + (ext > 0 ? (TOP + 3 - TIP) * ext : 0) : TOP) , (spOn ? TOP + (ext > 0 ? (TOP + 3 - TIP) * ext : 0) : TOP) + 1.2 + 0.06 * Math.sin(tAbs * 40));
    cable.visible = clOn || trOn || vbOn; if (cable.visible) vbar(cable, clOn ? ZM : trOn ? ZM + 0.8 : vz, clOn ? cy + 1.1 : TOP + 3.5, TOP + 8);
    // setas: água empurrando as paredes (fora) e subpressão sob o selo
    const dewOn = t >= T_PU0 + 4 && t < T_RM0;
    arr.forEach((a, i) => { const side = i < 3 ? -1 : 1, y = WL - 0.8 - (i % 3) * 1.4, L = 0.6 + (WL - y) * 0.45, zw = side < 0 ? Z0 - 0.15 : Z1 + 0.15; const on = dewOn && y > BED - 0.1; a.s.visible = a.a.visible = a.b.visible = on; if (!on) return; hbar(a.s, zw + side * L, zw, y); sbar(a.a, zw, y, zw + side * 0.35, y + 0.25); sbar(a.b, zw, y, zw + side * 0.35, y - 0.25); });
    const upOn = t >= T_PU1 - 4 && t < T_BK1;
    up.forEach((a, i) => { const z = Z0 + 1.0 + i * 1.35, y0 = DEXC - 1.1, y1 = DEXC - 0.1; const on = upOn; a.s.visible = a.a.visible = a.b.visible = on; if (!on) return; vbar(a.s, z, y0, y1); sbar(a.a, z, y1, z - 0.25, y1 - 0.35); sbar(a.b, z, y1, z + 0.25, y1 - 0.35); });
    pn.mesh.visible = t >= T_PU1 - 6 && t < T_RM0 + 2; drawPanel(t >= T_PU1 - 6 ? 'on' : 'off');
    // 3D: estacas descem com a cravação e sobem na extração; bomba e jato de recalque
    spMeshes.forEach((m) => { const kk = m.userData.k, d = ease(clamp01((drv - kk * 0.7) / 0.3)), e = ext; m.visible = t >= T_DR0 + kk * (T_DR1 - T_DR0) * 0.7 && t < T_RM1; m.position.y = (TOP + TIP) / 2 + (1 - d) * (TOP - TIP - 1) + e * (TOP - TIP + 2); });
    barge.position.z = ZM + (t < T_POS ? 18 * (1 - ease(win(t, 0, T_POS))) : 0); boom.rotation.y = 0.15 * Math.sin(tAbs * 0.4);
    pump.visible = t >= T_PU0 - 1 && t < T_RM0; const pumping = t >= T_PU0 && t < T_RM0; jet.visible = pumping; if (pumping) { jet.position.set(X1J + 1.2, WL + 0.4, Z0 - 2.8); jet.scale.y = 0.8 + 0.2 * Math.sin(tAbs * 12); }
    chief.group.visible = true; chief.group.position.set(X1J + 2.0, H(X1J + 2, RIVER.z0 - 3), RIVER.z0 - 3); chief.group.rotation.y = Math.PI; chief.upper.rotation.x = 0.15 + 0.1 * Math.sin(tAbs * 1.5);
    // legenda e rótulo de destaque
    if (t < 6) { note = 'A balsa com guindaste chega e se posiciona ao lado da ponte'; label = 'balsa'; } else if (t < T_DR0) { note = 'Gabarito na água: guia para as estacas-prancha'; label = 'gab'; }
    else if (t < T_DR1) { note = `Cravando as estacas-prancha · ponta a ${fmt(Math.max(0, BED - tip))} m abaixo do leito`; label = t < T_DR0 + 8 ? 'vib' : t < T_DR0 + 18 ? 'sp' : 'ficha'; }
    else if (t < T_EX1) { note = `Escavando o fundo sob água · ${fmt(BED - bot)} m de ${fmt(BED - DEXC)} m`; label = 'clam'; }
    else if (t < T_SL1 + 1) { note = `Selo de concreto submerso pelo tubo tremonha · ${fmt(sealTop - DEXC)} m de ${fmt(SEAL - DEXC)} m`; label = t < T_SL0 + 5 ? 'trem' : 'selo'; }
    else if (t < T_PU0) { note = 'Selo pronto: o recinto ainda está cheio'; label = 'selo'; }
    else if (t < T_PU1) { note = `Bombeando: nível dentro ${fmt(WL - lvl)} m abaixo do rio · escoras entrando por nível`; label = t < T_PU0 + 4 ? 'bomba' : t < T_PU0 + 9 ? 'nad' : t < T_PU0 + 14 ? 'esc' : 'emp'; }
    else if (t < T_BK0) { note = `Recinto seco · subpressão ${fmt(UP, 0)} kPa contra ${fmt(WSEAL, 0)} kPa de peso do selo`; label = 'sub'; }
    else if (t < T_BK1) { note = 'Armadura e concreto do bloco de coroamento, a seco'; label = 'bloco'; }
    else if (t < T_PL1 + 1) { note = `Pilar subindo do bloco · ${fmt(pTop - BLK)} m`; label = 'pilar'; }
    else if (t < T_RM0 + 6) { note = 'Inundando o recinto para igualar as pressões; escoras saem de baixo para cima'; label = 'nad'; }
    else if (t < T_RM1) { note = 'Extraindo as estacas-prancha com o martelo vibratório'; label = 'vib'; }
    else { note = 'No rio fica o pilar sobre o bloco e o selo'; label = 'pilar'; }
    const Sx = J2_STARTS; let stp = 0; for (let i = 0; i < Sx.length; i++) if (t >= Sx[i]) stp = i;
    st.step = stp; st.progress = win(t, Sx[stp], Sx[stp + 1] ?? END); st.note = note; st.label = label;
    // âncoras
    const a = anchors;
    a.balsa.set(barge.position.x, WL + 3.2, barge.position.z); a.gab.set(XP, TOP + 0.2, Z0 - 0.4); a.vib.set(XP, TOP + 1.6, vz); a.sp.set(XP, WL - 1.0, Z0 - 0.15); a.ficha.set(XP, (BED + TIP) / 2, Z1 + 0.15);
    a.clam.set(XP, S.cy + 0.6, ZM); a.trem.set(XP, WL - 0.5, ZM + 0.8); a.selo.set(XP, (DEXC + SEAL) / 2, ZM - 1.6); a.bomba.set(pump.position.x, pump.position.y + 0.6, pump.position.z); a.esc.set(XP, STR[1], ZM - 1.2);
    a.naf.set(XP, WL + 0.05, Z0 - 4); a.nad.set(XP, S.lvl + 0.05, ZM + 1.6); a.emp.set(XP, WL - 2.2, Z0 - 1.4); a.sub.set(XP, DEXC - 0.8, ZM + 1.2); a.bloco.set(XP, (SEAL + BLK) / 2, ZM + 1.8); a.pilar.set(XP, Math.max(BLK + 0.5, pTop - 0.5), ZM + 0.8);
    a.op.set(chief.group.position.x, chief.group.position.y + 2.2, chief.group.position.z); a.solo.set(X1J, -16, ZM);
  }
  const VIS = {
    balsa: (t) => t < 6, gab: (t) => t >= 6 && t < T_DR0, vib: (t) => (t >= T_DR0 && t < T_DR0 + 8) || (t >= T_RM0 + 6 && t < T_RM1), sp: (t) => t >= T_DR0 + 8 && t < T_DR0 + 18, ficha: (t) => t >= T_DR0 + 18 && t < T_EX0,
    clam: (t) => t >= T_EX0 && t < T_EX1, trem: (t) => t >= T_SL0 && t < T_SL0 + 5, selo: (t) => t >= T_SL0 + 5 && t < T_PU0, bomba: (t) => t >= T_PU0 && t < T_PU0 + 4, nad: (t) => (t >= T_PU0 + 4 && t < T_PU0 + 9) || (t >= T_PL1 + 1 && t < T_RM0 + 6),
    esc: (t) => t >= T_PU0 + 9 && t < T_PU0 + 14, emp: (t) => t >= T_PU0 + 14 && t < T_PU1, sub: (t) => t >= T_PU1 && t < T_BK0, bloco: (t) => t >= T_BK0 && t < T_BK1, pilar: (t) => (t >= T_BK1 && t < T_PL1 + 1) || t >= T_RM1,
    naf: (t) => t >= T_PU0 + 4 && t < T_PU0 + 9, op: (t) => t >= 3 && t < 6,
  };
  const labelVis = (kx, t = st.tc) => { const f = VIS[kx]; return f ? f(t) : true; };
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; const g = engine.scene.getObjectByName('j-coffer'); if (g) g.visible = false; },
    exit() { st.active = false; root.visible = false; const g = engine.scene.getObjectByName('j-coffer'); if (g) g.visible = true; },
  };
}
