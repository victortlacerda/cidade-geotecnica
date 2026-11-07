import * as THREE from 'three';
import { RIVER, BRIDGE, PIERS } from '../config.js';
import { H } from '../scene/terrain.js';
import { ease, win, mat, noclip, person } from './fund.js';
import { textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// J1 — Ponte com fundação em rio. Seção no plano x = X1B, que passa pelo eixo de uma linha de estacas da ponte
// (x = 81 + 2,7) e corta o rio de margem a margem: aparecem as duas linhas de pilares, as estacas, os blocos, os pilares,
// as vigas e a laje. Estacas escavadas com camisa metálica: a camisa atravessa a água, a argila mole e as areias;
// abaixo dela o furo segue sem revestimento no silte até a rocha alterada. Valores de exemplo, não são de projeto.
// ---------------------------------------------------------------------------
export const X1B = BRIDGE.x + PIERS.dx;
const XP = X1B - 0.045, WL = RIVER.water, BED = RIVER.bed, ZL = PIERS.lines, R = PIERS.r, CT = PIERS.casingTip, TOE = PIERS.toe;
const TOPC = WL + 1.6, CUT = PIERS.capB + 0.1, ZC = (ZL[0] + ZL[1]) / 2, ZA0 = RIVER.z1 + 1, ZA1 = RIVER.z0 - 1;
const fmt = (v, n = 1) => v.toFixed(n).replace('.', ',');
export const J1_CAM = { tx: X1B, ty: -7.5, tz: ZC + 3.5, yaw: -1.3, pitch: 0.14, dist: 52 };
export const J1_MCAM = { tx: X1B, ty: -8.5, tz: ZC, yaw: -1.3, pitch: 0.14, dist: 96 };
export const J1_BOX = { x0: -125, x1: X1B, z0: -102, z1: -56 };
// linha do tempo: estaca 1 em detalhe, estaca 2 mais rápida, blocos e pilares, vigas e laje
const P1 = { c0: 10, c1: 26, d0: 28, d1: 50, k0: 52, k1: 58, t0: 60, t1: 74 }, P2 = { c0: 77, c1: 81, d0: 81, d1: 86, k0: 86, k1: 87.5, t0: 87.5, t1: 91 };
const T_CAP0 = 93, T_CAP1 = 104, T_COL1 = 110, T_BM0 = 112, T_BM1 = 130, T_SL1 = 140, END = 150;
export const J1_STARTS = [0, P1.c0, P1.d0, P1.k0, P2.c0 - 1, T_CAP0, T_BM0];
export const J1_STEPS = [
  { t: 'Balsa e locação', d: 'A fundação dos pilares de uma ponte é feita de dentro do rio. Uma balsa com guindaste se posiciona sobre a linha do primeiro pilar, e o topógrafo, da margem, confere a posição de cada estaca. Uma guia presa à balsa mantém a camisa no prumo.' },
  { t: 'Cravação da camisa metálica', d: `A camisa é um tubo de aço de ${fmt(2 * R)} m de diâmetro. O martelo vibratório a crava através da água, da argila mole e das areias, até a cota ${fmt(CT)} m, já dentro do silte. Ela segura as paredes do furo onde o solo desmoronaria e separa a estaca da correnteza. Neste caso fica na obra (camisa perdida).` },
  { t: 'Perfuração', d: `A perfuratriz desce a haste (kelly) com a caçamba pela camisa e retira o solo de dentro dela. Abaixo da camisa, o furo continua sem revestimento no silte, sempre cheio de água ou de polímero, para a pressão do fluido segurar as paredes. A perfuração termina em ${fmt(TOE)} m, depois de entrar ${fmt(-17.2 - TOE)} m na rocha alterada.` },
  { t: 'Armadura e concreto submerso', d: 'A armadura (a gaiola de aço) desce pelo furo. O concreto é lançado pelo tubo tremonha, com a ponta sempre mergulhada no concreto já lançado: ele enche o furo de baixo para cima e empurra a água para fora, sem se misturar com ela. O concreto passa um pouco da cota de arrasamento, e o topo contaminado é cortado depois.' },
  { t: 'Estaca da segunda linha', d: 'A balsa se desloca para a outra linha de pilares e repete a sequência: camisa, perfuração, armadura e concreto. Cada linha tem duas estacas, uma de cada lado do eixo da ponte; a seção mostra uma estaca de cada linha.' },
  { t: 'Blocos e pilares', d: 'Sobre as estacas é montada uma forma suspensa, presa nas próprias camisas, no nível do rio. Dentro dela concreta-se o bloco de coroamento, que une as duas estacas da linha e distribui a carga do pilar entre elas. Do bloco sobe o pilar, curto nesta ponte, e uma travessa no topo.' },
  { t: 'Vigas e tabuleiro', d: 'As vigas pré-moldadas, fabricadas no pátio da margem, são içadas pelo guindaste e apoiadas nos encontros e nos pilares. Sobre elas se concreta a laje do tabuleiro, depois o pavimento e o guarda-corpo. A carga dos carros desce pelas vigas, pelos pilares e blocos até as estacas, e das estacas para o solo, por atrito lateral e pela ponta na rocha alterada.' },
];
export const J1_LABELS = [
  { k: 'balsa', t: 'Balsa com guindaste' }, { k: 'topo', t: 'Topógrafo' }, { k: 'vib', t: 'Martelo vibratório' }, { k: 'cam', t: 'Camisa metálica' }, { k: 'argila', t: 'Argila mole: por isso a camisa' },
  { k: 'perf', t: 'Perfuratriz (haste e caçamba)' }, { k: 'fluido', t: 'Furo cheio de água ou polímero' }, { k: 'rocha', t: 'Ponta na rocha alterada' }, { k: 'arm', t: 'Armadura' }, { k: 'trem', t: 'Tubo tremonha' },
  { k: 'conc', t: 'Concreto submerso' }, { k: 'est2', t: 'Estaca da segunda linha' }, { k: 'forma', t: 'Forma suspensa' }, { k: 'bloco', t: 'Bloco de coroamento' }, { k: 'pilar', t: 'Pilar' },
  { k: 'viga', t: 'Vigas pré-moldadas' }, { k: 'laje', t: 'Laje do tabuleiro' }, { k: 'enc', t: 'Encontro' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const J1 = { box: J1_BOX };

export function createJ1(engine, section) {
  const root = new THREE.Group(); root.visible = false;
  const mk = (th, color, ro, em, dx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; m.userData.dx = dx; root.add(m); return m; };
  const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP - (m.userData.dx || 0), (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
  const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP - (m.userData.dx || 0), y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
  const rect = (color, ro, dx, op = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), noclip(color, { r: 0.45, e: color, op })); m.material.emissiveIntensity = 0.16; m.material.side = THREE.DoubleSide; m.rotation.y = -Math.PI / 2; m.renderOrder = ro; m.userData.dx = dx; m.visible = false; root.add(m); return m; };
  const setR = (m, za, zb, ya, yb) => { m.visible = zb - za > 0.01 && yb - ya > 0.01; if (!m.visible) return; m.position.set(XP - m.userData.dx, (ya + yb) / 2, (za + zb) / 2); m.scale.set(zb - za, yb - ya, 1); };
  // água do rio na face, de margem a margem
  {
    const s = new THREE.Shape(); let za = null, zb = null; for (let z = RIVER.z0 - 6; z <= RIVER.z1 + 6; z += 0.25) if (H(X1B, z) < WL) { if (za === null) za = z; zb = z; }
    s.moveTo(za, WL); for (let z = za; z <= zb + 1e-6; z += 0.25) s.lineTo(z, Math.min(H(X1B, z), WL)); s.lineTo(zb, WL); s.lineTo(za, WL);
    const wm = noclip(0x3d8fd1, { r: 0.3, e: 0x0d3a66, op: 0.8, dw: false }); wm.side = THREE.DoubleSide;
    const w = new THREE.Mesh(new THREE.ShapeGeometry(s), wm); w.rotation.y = -Math.PI / 2; w.position.x = XP - 0.003; w.renderOrder = 5; root.add(w);
  }
  // por estaca: camisa (duas paredes), furo com fluido, concreto, armadura, ferramenta
  const pile = ZL.map(() => ({
    wl: mk(0.16, 0x3f464e, 11, 0x0c0c0c, 0.014), wr: mk(0.16, 0x3f464e, 11, 0x0c0c0c, 0.014), hole: rect(0x2d6f9f, 7, 0.006, 0.92), conc: rect(0xa7a39a, 8, 0.008),
    cage: [mk(0.06, 0x2b2e33, 10, 0, 0.012), mk(0.06, 0x2b2e33, 10, 0, 0.012)], hoops: Array.from({ length: 8 }, () => mk(0.05, 0x2b2e33, 10, 0, 0.012)),
  }));
  const kelly = mk(0.18, 0x8a8f96, 12, 0x222222, 0.02), bucket = mk(1.0, 0xe8b300, 12, 0x4a3500, 0.022), vib = mk(1.3, 0xe8b300, 12, 0x4a3500, 0.022), trem = mk(0.28, 0x8a8f96, 12, 0x222222, 0.02), cable = mk(0.05, 0x222222, 11, 0, 0.018);
  const caps = ZL.map(() => rect(0xc9c4b8, 9, 0.01)), forms = ZL.map(() => [mk(0.12, 0x9b7650, 10, 0x221100, 0.016), mk(0.12, 0x9b7650, 10, 0x221100, 0.016), mk(0.12, 0x9b7650, 10, 0x221100, 0.016)]);
  const cols = ZL.map(() => rect(0xd6d1c6, 9, 0.01)), xbeam = ZL.map(() => rect(0xc9c4b8, 9, 0.01));
  const abut = [rect(0xc9c4b8, 9, 0.01), rect(0xc9c4b8, 9, 0.01)], beam = [rect(0xbdb8ad, 9, 0.012), rect(0xbdb8ad, 9, 0.012), rect(0xbdb8ad, 9, 0.012)], slab = rect(0xc9c4b8, 9, 0.014), pave = rect(0x3a3d43, 10, 0.016);
  const ruler = textPanel(1.5, 21, 90, 1260, X1B - 0.065, -9.5, ZC);
  { const g = ruler.g; g.fillStyle = 'rgba(20,24,30,0.55)'; g.fillRect(0, 0, 90, 1260); g.fillStyle = '#fff'; g.font = '700 22px Arial'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
    for (let c = 0; c >= -20; c -= 2) { const yp = (1 - c) * 60; g.beginPath(); g.moveTo(64, yp); g.lineTo(90, yp); g.stroke(); g.fillText(`${c}`, 58, yp - 12); } g.font = '700 17px Arial'; g.fillText('cota (m)', 86, 14); ruler.tx.needsUpdate = true; }
  root.add(ruler.mesh);
  const PW = 11, PH = 3.6, pn = textPanel(PW, PH, PW * 48, PH * 48, X1B - 0.07, -14.5, ZL[1] - 2.2 - PW / 2); root.add(pn.mesh);
  { const G = pn.g, W = PW * 48, Hh = PH * 48; G.fillStyle = 'rgba(20,24,30,0.78)'; G.beginPath(); G.roundRect(0, 0, W, Hh, 12); G.fill(); G.fillStyle = '#fff'; G.font = '700 18px Arial'; G.textAlign = 'left'; G.fillText('Estaca escavada com camisa (exemplo)', 14, 28);
    G.font = '600 16px Arial'; G.fillStyle = '#e6e6e6'; G.fillText(`Diâmetro ${fmt(2 * R)} m · 2 estacas por pilar`, 14, 58); G.fillStyle = '#9fd2ff'; G.fillText(`Camisa: de ${fmt(TOPC)} a ${fmt(CT)} m`, 14, 84); G.fillStyle = '#ffd166'; G.fillText(`Ponta: ${fmt(TOE)} m · ${fmt(BED - TOE)} m abaixo do leito`, 14, 110); G.fillStyle = '#f0a27c'; G.fillText(`Embutida ${fmt(-17.2 - TOE)} m na rocha alterada`, 14, 136); pn.tx.needsUpdate = true; }
  // 3D: balsa com guindaste, bloco e meia laje atrás da face, viga sendo içada, topógrafo
  const barge = new THREE.Group(); { const h = new THREE.Mesh(new THREE.BoxGeometry(5, 1.1, 8), mat(0x5a5e66)); h.position.y = WL + 0.3; barge.add(h); const cb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 2.6), mat(0xe8b300)); cb.position.set(0.4, WL + 1.6, 1.6); barge.add(cb); }
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 15), mat(0xe8b300)); boom.position.set(-1.6, WL + 6.2, -1.8); boom.rotation.x = 0.8; barge.add(boom); root.add(barge);
  const cap3 = ZL.map((z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.3, PIERS.capT - PIERS.capB, 2.4), mat(0xc9c4b8)); m.position.set(X1B + 1.15, (PIERS.capB + PIERS.capT) / 2, z); m.visible = false; m.castShadow = true; root.add(m); return m; });
  const beam3 = new THREE.Mesh(new THREE.BoxGeometry(0.7, PIERS.beamT - PIERS.colT, ZA0 - ZA1), mat(0xbdb8ad)); beam3.visible = false; beam3.castShadow = true; root.add(beam3);
  const slab3 = new THREE.Mesh(new THREE.BoxGeometry(86 - X1B, BRIDGE.deck - PIERS.beamT, ZA0 - ZA1), mat(0xc9c4b8)); slab3.position.set((X1B + 86) / 2, (BRIDGE.deck + PIERS.beamT) / 2, (ZA0 + ZA1) / 2); slab3.visible = false; root.add(slab3);
  const topo = person(0x2f6fd0, 0xffffff); topo.group.visible = false; root.add(topo.group);
  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(J1_LABELS.map((l) => [l.k, new THREE.Vector3()]));
  const S = { tool: TOPC, bz: ZL[0], dep: BED };
  // estado de uma estaca no tempo t: cota da ponta da camisa, fundo do furo, topo do concreto, armadura
  const pileAt = (P, t) => {
    const cTip = t < P.c0 ? null : TOPC - 2 + (CT - (TOPC - 2)) * ease(win(t, P.c0, P.c1));
    const bot = t < P.d0 ? BED : BED + (TOE - BED) * ease(win(t, P.d0, P.d1));
    const cage = t >= P.k0 ? TOPC + 2 - (TOPC + 2 - TOE) * ease(win(t, P.k0, P.k1)) : null;
    const cTop = t < P.t0 ? TOE : TOE + (CUT + 0.4 - TOE) * ease(win(t, P.t0, P.t1));
    return { cTip, bot, cage, cTop };
  };
  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= END && st.hold <= 0) { st.tc = END - 0.001; st.hold = 3.5; }
    const t = st.tc; let note = '', label = null;
    const PS = [P1, P2];
    PS.forEach((P, i) => {
      const z = ZL[i], p = pile[i], s = pileAt(P, t), capped = t >= T_CAP0 + 3;
      const topW = capped ? PIERS.capB : TOPC;
      const on = s.cTip !== null; p.wl.visible = p.wr.visible = on; if (on) { vbar(p.wl, z - R, s.cTip, topW); vbar(p.wr, z + R, s.cTip, topW); }
      // furo: do leito ao fundo (dentro da camisa e abaixo dela), cheio de fluido até o topo do concreto
      p.hole.visible = false;
      if (t >= P.d0 && t < P.t1 + 0.5) setR(p.hole, z - R + 0.08, z + R - 0.08, Math.max(s.bot, t >= P.t0 ? s.cTop : s.bot), Math.min(WL, topW));
      setR(p.conc, z - R + 0.08, z + R - 0.08, TOE, t >= P.t0 ? (capped ? PIERS.capB + 0.05 : s.cTop) : TOE);
      const cg = s.cage !== null && t < T_CAP0 + 3; p.cage.forEach((m, j) => { m.visible = cg; if (cg) vbar(m, z + (j ? 0.38 : -0.38), s.cage, Math.min(s.cage + (CUT + 1.2 - TOE), TOPC + 2)); });
      p.hoops.forEach((m, j) => { const y = (s.cage ?? 0) + 0.6 + j * 2.0; const hon = cg && y < CUT + 1.0; m.visible = hon; if (hon) hbar(m, z - 0.45, z + 0.45, y); });
    });
    // ferramentas da estaca em execução
    const cur = t < P2.c0 - 1 ? 0 : 1, P = PS[cur], z = ZL[cur], s = pileAt(P, t);
    const vOn = t >= P.c0 && t < P.c1; vib.visible = vOn; if (vOn) vbar(vib, z, TOPC + 0.1 + 0.05 * Math.sin(tAbs * 40) - (TOPC - 2 - s.cTip > 0 ? 0 : 0), TOPC + 1.4);
    const dOn = t >= P.d0 && t < P.d1; let tool = TOPC; if (dOn) { const ph = ((t - P.d0) % 5) / 5; tool = ph < 0.6 ? TOPC + (s.bot + 0.5 - TOPC) * ease(ph / 0.6) : s.bot + 0.5 + (TOPC + 1 - s.bot - 0.5) * ease((ph - 0.6) / 0.4); }
    bucket.visible = kelly.visible = dOn; if (dOn) { vbar(bucket, z, tool - 0.5, tool + 0.6); vbar(kelly, z, tool + 0.6, TOPC + 6); }
    const tOn = t >= P.t0 && t < P.t1; trem.visible = tOn; if (tOn) vbar(trem, z + 0.1, s.cTop - 1.5, TOPC + 4);
    cable.visible = vOn || dOn || tOn || (t >= P.k0 && t < P.k1) || (t >= T_BM0 && t < T_BM1); if (cable.visible) { const zz = t >= T_BM0 ? S.bz : z; vbar(cable, zz, t >= T_BM0 ? PIERS.beamT + 0.2 + S.beamLift : vOn ? TOPC + 1.4 : dOn ? TOPC + 6 : TOPC + 4, TOPC + 9); }
    S.tool = tool; S.dep = s.bot;
    // blocos, formas, pilares e travessas
    ZL.forEach((zp, i) => {
      const cOn = t >= T_CAP0 + i * 1.5; const ct = PIERS.capB + (PIERS.capT - PIERS.capB) * ease(win(t, T_CAP0 + 3 + i * 1.5, T_CAP1 - 2 + i * 1.5));
      setR(caps[i], zp - 1.2, zp + 1.2, PIERS.capB, t >= T_CAP0 + 3 ? ct : PIERS.capB); cap3[i].visible = t >= T_CAP1 - 2 + i * 1.5;
      const fOn = cOn && t < T_CAP1 + 2; forms[i].forEach((m, j) => { m.visible = fOn; if (!fOn) return; if (j === 2) hbar(m, zp - 1.35, zp + 1.35, PIERS.capB - 0.08); else vbar(m, zp + (j ? 1.3 : -1.3), PIERS.capB - 0.1, PIERS.capT + 0.15); });
      const colTop = PIERS.capT + (PIERS.colT - 0.4 - PIERS.capT) * ease(win(t, T_CAP1, T_COL1 - 2));
      setR(cols[i], zp - 0.55, zp + 0.55, PIERS.capT, t >= T_CAP1 ? colTop : PIERS.capT);
      setR(xbeam[i], zp - 0.7, zp + 0.7, PIERS.colT - 0.4, t >= T_COL1 - 2 ? PIERS.colT - 0.4 + 0.4 * ease(win(t, T_COL1 - 2, T_COL1)) : PIERS.colT - 0.4);
    });
    // encontros (já prontos nas margens), vigas içadas vão a vão e laje
    setR(abut[0], ZA0 - 0.2, ZA0 + 1.0, -1.0, PIERS.beamT); setR(abut[1], ZA1 - 1.0, ZA1 + 0.2, -1.0, PIERS.beamT);
    const spans = [[ZA0, ZL[0]], [ZL[0], ZL[1]], [ZL[1], ZA1]]; let lift = 0, bz = ZC;
    spans.forEach(([a, b], i) => { const t0 = T_BM0 + i * 6, f = ease(win(t, t0, t0 + 5)), y0 = PIERS.colT + (1 - f) * 7; const on = t >= t0; if (on && f < 1) { lift = (1 - f) * 7; bz = (a + b) / 2; } setR(beam[i], Math.min(a, b) + 0.2, Math.max(a, b) - 0.2, on ? y0 : PIERS.colT, on ? y0 + (PIERS.beamT - PIERS.colT) : PIERS.colT); });
    S.beamLift = lift; S.bz = bz;
    beam3.visible = t >= T_BM0 + 17; beam3.position.set(84.5, (PIERS.colT + PIERS.beamT) / 2, (ZA0 + ZA1) / 2);
    const sl = ease(win(t, T_BM1, T_SL1)); setR(slab, ZA1, ZA0, PIERS.beamT, t >= T_BM1 ? PIERS.beamT + (BRIDGE.deck - 0.06 - PIERS.beamT) * sl : PIERS.beamT); slab3.visible = t >= T_SL1 - 2;
    setR(pave, ZA1, ZA0, BRIDGE.deck - 0.06, t >= T_SL1 ? BRIDGE.deck + 0.02 : BRIDGE.deck - 0.06);
    ruler.mesh.visible = t >= P1.c0; pn.mesh.visible = t >= P1.t1 && t < T_BM0;
    // balsa: vai para a linha 1, depois para a linha 2, depois fica no meio para içar as vigas
    const bzT = t < P2.c0 - 2 ? ZL[0] : t < T_BM0 ? ZL[1] : ZC; barge.position.set(X1B + 5.2, 0, t < 8 ? ZL[0] + 16 * (1 - ease(win(t, 0, 8))) : bzT + (t >= P2.c0 - 3 && t < P2.c0 - 1 ? 0 : 0)); boom.rotation.y = 0.12 * Math.sin(tAbs * 0.35);
    topo.group.visible = t < P1.c0 + 4; topo.group.position.set(X1B + 2, H(X1B + 2, RIVER.z1 + 3), RIVER.z1 + 3); topo.group.rotation.y = Math.PI; topo.upper.rotation.x = 0.3 + 0.1 * Math.sin(tAbs * 1.4);
    // legenda e rótulo
    if (t < 8) { note = 'A balsa com guindaste chega à linha do primeiro pilar'; label = 'balsa'; } else if (t < P1.c0) { note = 'Topógrafo confere a posição das estacas a partir da margem'; label = 'topo'; }
    else if (t < P1.c1) { note = `Cravando a camisa metálica · ponta em ${fmt(s.cTip)} m`; label = t < P1.c0 + 6 ? 'vib' : t < P1.c0 + 11 ? 'cam' : 'argila'; }
    else if (t < P1.d0) { note = `Camisa cravada até ${fmt(CT)} m, dentro do silte`; label = 'cam'; }
    else if (t < P1.d1) { note = `Perfurando · fundo em ${fmt(s.bot)} m${s.bot < CT ? ' (abaixo da camisa, sem revestimento)' : ''}`; label = s.bot > CT + 1 ? 'perf' : s.bot > -17.2 ? 'fluido' : 'rocha'; }
    else if (t < P1.k0) { note = `Furo pronto em ${fmt(TOE)} m: ${fmt(BED - TOE)} m abaixo do leito`; label = 'rocha'; }
    else if (t < P1.t0) { note = 'Descendo a armadura pelo furo'; label = 'arm'; }
    else if (t < P1.t1) { note = `Concreto submerso pelo tubo tremonha · topo em ${fmt(s.cTop)} m`; label = t < P1.t0 + 5 ? 'trem' : 'conc'; }
    else if (t < P2.c0 - 1) { note = 'Estaca da primeira linha pronta; a balsa vai para a segunda'; label = 'conc'; }
    else if (t < P2.t1 + 1) { note = 'Segunda linha: camisa, perfuração, armadura e concreto'; label = 'est2'; }
    else if (t < T_CAP1) { note = 'Formas suspensas presas às camisas e concreto dos blocos'; label = t < T_CAP0 + 5 ? 'forma' : 'bloco'; }
    else if (t < T_BM0) { note = 'Pilares e travessas sobre os blocos'; label = 'pilar'; }
    else if (t < T_BM1) { note = 'Içando as vigas pré-moldadas, vão a vão'; label = t < T_BM0 + 3 ? 'enc' : 'viga'; }
    else if (t < T_SL1) { note = 'Concretando a laje do tabuleiro sobre as vigas'; label = 'laje'; }
    else { note = 'Ponte pronta: a carga desce pelas vigas, pilares e blocos até as estacas'; label = 'pilar'; }
    let stp = 0; for (let i = 0; i < J1_STARTS.length; i++) if (t >= J1_STARTS[i]) stp = i;
    st.step = stp; st.progress = win(t, J1_STARTS[stp], J1_STARTS[stp + 1] ?? END); st.note = note; st.label = label;
    const a = anchors;
    a.balsa.set(barge.position.x, WL + 3.0, barge.position.z); a.topo.set(topo.group.position.x, topo.group.position.y + 2.2, topo.group.position.z); a.vib.set(XP, TOPC + 1.4, z); a.cam.set(XP, WL - 1.2, z - R); a.argila.set(XP, -6.0, ZL[0] + 2.6);
    a.perf.set(XP, S.tool + 0.4, z); a.fluido.set(XP, Math.min(-12, S.dep + 1.5), z + R); a.rocha.set(XP, TOE + 0.6, z + R); a.arm.set(XP, (s.cage ?? 0) + 6, z + 0.4); a.trem.set(XP, WL - 0.6, z + 0.1); a.conc.set(XP, Math.max(TOE + 1, (s.cTop ?? TOE) - 2), z);
    a.est2.set(XP, -8, ZL[1] - R); a.forma.set(XP, PIERS.capT + 0.1, ZL[0] - 1.3); a.bloco.set(XP, (PIERS.capB + PIERS.capT) / 2, ZL[1] + 1.2); a.pilar.set(XP, PIERS.colT - 0.6, ZL[0] + 0.55);
    a.viga.set(XP, PIERS.beamT + S.beamLift, S.bz); a.laje.set(XP, BRIDGE.deck, ZC + 4); a.enc.set(XP, 0.2, ZA0 + 0.4); a.solo.set(X1B, -24, ZC);
  }
  const VIS = {
    balsa: (t) => t < 8, topo: (t) => t >= 8 && t < P1.c0, vib: (t) => t >= P1.c0 && t < P1.c0 + 6, cam: (t) => (t >= P1.c0 + 6 && t < P1.c0 + 11) || (t >= P1.c1 && t < P1.d0), argila: (t) => t >= P1.c0 + 11 && t < P1.c1,
    perf: (t) => t >= P1.d0 && t < P1.d0 + 8, fluido: (t) => t >= P1.d0 + 8 && t < P1.d0 + 16, rocha: (t) => t >= P1.d0 + 16 && t < P1.k0, arm: (t) => t >= P1.k0 && t < P1.t0, trem: (t) => t >= P1.t0 && t < P1.t0 + 5, conc: (t) => t >= P1.t0 + 5 && t < P2.c0 - 1,
    est2: (t) => t >= P2.c0 - 1 && t < P2.t1 + 1, forma: (t) => t >= P2.t1 + 1 && t < T_CAP0 + 5, bloco: (t) => t >= T_CAP0 + 5 && t < T_CAP1, pilar: (t) => (t >= T_CAP1 && t < T_BM0) || t >= T_SL1,
    enc: (t) => t >= T_BM0 && t < T_BM0 + 3, viga: (t) => t >= T_BM0 + 3 && t < T_BM1, laje: (t) => t >= T_BM1 && t < T_SL1,
  };
  const labelVis = (kx, t = st.tc) => { const f = VIS[kx]; return f ? f(t) : true; };
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; const g = engine.scene.getObjectByName('j-bridge'); if (g) g.visible = false; },
    exit() { st.active = false; root.visible = false; const g = engine.scene.getObjectByName('j-bridge'); if (g) g.visible = true; },
  };
}
