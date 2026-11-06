import * as THREE from 'three';
import { createProfile, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { X1G, ZB, GEO_G, G_BOX, textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// G10 — Monitoramento de recalques de fundações. Um prédio de três pavimentos é construído sobre três sapatas, a do meio e a da
// direita assentes em argila mole. Pinos de recalque nos pilares são lidos por nivelamento (nível ótico e mira) ao longo de 24 meses.
// O gráfico recalque x tempo mostra o efeito do carregamento por etapas e da consolidação, e o recalque diferencial entre as sapatas.
// ---------------------------------------------------------------------------
export const G10_CAM = { tx: X1G, ty: 1.2, tz: 27, yaw: -1.3, pitch: 0.2, dist: 56 };
export const G10_MCAM = { tx: X1G, ty: 1.2, tz: 27, yaw: -1.3, pitch: 0.2, dist: 100 };
const T_SET = 6, T_BLD = 10, T_BLD1 = 37, T_M0 = 10, T_M1 = 100, MONTHS = 24, T_MEAS = 44, T_FIN = 92, END = 106;
const ZP = [ZB - 5, ZB, ZB + 5], SINF = [12, 20, 34], TAU = [2, 4, 8], FM = [1.5, 3.8, 6.0], EXA = 0.04, FY = [2.8, 5.6, 8.4], FOOT = -1.5;
const COLS = ['#6fdc8c', '#ffb347', '#ff7a6a'];
export const G10_STARTS = [0, T_SET, T_BLD, T_MEAS, T_FIN];
export const G10_STEPS = [
  { t: 'Locação', d: 'A equipe topográfica chega à obra: um prédio de três pavimentos, sobre fundação rasa (sapatas). O monitoramento de recalques de uma fundação é a forma de saber, na prática, se o que o projeto previu está acontecendo. Em solos moles, como a argila desta camada, o recalque pode continuar por meses ou anos depois de terminada a obra, e acompanhá-lo evita surpresas.' },
  { t: 'Sapatas e pinos de recalque', d: 'Três sapatas apoiam três pilares: a da esquerda, sobre solo firme, e as outras duas, sobre argila mole, que se deforma mais. Em cada pilar fixa-se um pino de recalque, um marco metálico, bem ao nível do chão. Fora da obra, em solo estável e longe da área de influência, fica a referência de nível (RN), um marco profundo que não se move; todas as leituras são feitas a partir dela.' },
  { t: 'Construção e leitura inicial', d: 'Antes de carregar a fundação, faz-se a leitura zero de cada pino. À medida que os pavimentos são construídos, a carga sobre as sapatas aumenta em etapas, e o recalque aumenta junto. Na argila mole, o recalque continua depois de cada etapa, enquanto a água sai dos poros do solo (adensamento).' },
  { t: 'Leituras periódicas e gráfico', d: 'O topógrafo faz o nivelamento com um nível ótico: lê numa mira graduada, apoiada sobre cada pino, e compara com a leitura zero; a diferença é o recalque. As leituras são frequentes durante a construção e depois se espaçam. O gráfico mostra três comportamentos: pouco recalque e rápido na sapata sobre solo firme; muito recalque e lento sobre a argila mole.' },
  { t: 'Interpretação e estabilização', d: 'A curva de cada sapata tende a uma assíntota quando o adensamento termina, e isso indica que se pode considerar o recalque estabilizado. O que mais preocupa a estrutura é o recalque diferencial entre sapatas vizinhas: aqui, cerca de 19 mm em 10 m, ou seja, uma distorção angular de 1/520, já bem perto do limite usual de 1/500 para evitar fissuras em alvenaria. Se passasse, seria preciso reforçar a fundação.' },
];
export const G10_LABELS = [
  { k: 'topo', t: 'Obra: prédio de três pavimentos' }, { k: 'sapata', t: 'Sapata sobre argila mole' }, { k: 'sapata1', t: 'Sapata sobre solo firme' }, { k: 'marco', t: 'Pino de recalque' }, { k: 'rn', t: 'Referência de nível (RN)' }, { k: 'nivel', t: 'Nível ótico' }, { k: 'mira', t: 'Mira graduada' },
  { k: 'carga', t: 'Carga crescendo por pavimento' }, { k: 'curva', t: 'Recalque x tempo' }, { k: 'dif', t: 'Recalque diferencial' }, { k: 'estab', t: 'Estabilização' }, { k: 'op', t: 'Topógrafo' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const G10 = { box: G_BOX };
const sAt = (i, m) => { let s = 0; for (let j = 0; j < 3; j++) s += (SINF[i] / 3) * (m > FM[j] ? 1 - Math.exp(-(m - FM[j]) / TAU[i]) : 0); return s; };
const fmt = (v, n = 1) => v.toFixed(n).replace('.', ',');

export function createG10(engine, section) {
  return createProfile(engine, section, {
    key: 'G10', labels: G10_LABELS, starts: G10_STARTS, END, yb: -14, geo: GEO_G, zo: 38, hide: 'g-inv',
    build(H) {
      const { root, stake, X1, XP } = H;
      const mk = (th, color, ro, em, dx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; m.userData.dx = dx; root.add(m); return m; };
      const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP - (m.userData.dx || 0), (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
      const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP - (m.userData.dx || 0), y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
      const sbar = (m, za, ya, zb, yb) => { const L = Math.hypot(zb - za, yb - ya); m.position.set(XP - (m.userData.dx || 0), (ya + yb) / 2, (za + zb) / 2); m.rotation.set(-Math.atan2(yb - ya, zb - za), 0, 0); m.scale.z = Math.max(0.001, L); };
      const foots = ZP.map((z, i) => mk(0.45, 0x8f959d, 8, 0x1a1a1a, 0.01)), cols = ZP.map(() => mk(0.5, 0xb9bcc0, 8, 0x222222, 0.012));
      const slabs = [0, 1, 2].map(() => [mk(0.3, 0x9aa0a8, 9, 0x1a1a1a, 0.014), mk(0.3, 0x9aa0a8, 9, 0x1a1a1a, 0.014)]);
      const pins = ZP.map(() => mk(0.34, 0xd8332a, 11, 0x551111, 0.02)), rn = mk(0.4, 0xd8332a, 11, 0x551111, 0.02), rnS = mk(0.2, 0x6f737a, 9, 0, 0.01);
      const staff = mk(0.2, 0xf4f1ea, 11, 0, 0.022), sline = mk(0.04, 0xff7a6a, 10, 0x551111, 0.016);
      const ticks = Array.from({ length: 6 }, () => mk(0.07, 0xd8332a, 12, 0, 0.024));
      const ruler = textPanel(1.6, 14.4, 96, 864, X1 - 0.065, -7.2, ZB - 9.4);
      { const gx = ruler.g; gx.fillStyle = 'rgba(20,24,30,0.55)'; gx.fillRect(0, 0, 96, 864); gx.fillStyle = '#fff'; gx.font = '700 26px "Barlow Semi Condensed", Arial, sans-serif'; gx.textAlign = 'right'; gx.textBaseline = 'middle'; gx.strokeStyle = 'rgba(255,255,255,0.7)'; gx.lineWidth = 2;
        for (let m = 1; m <= 14; m++) { const yp = m * 60; gx.beginPath(); gx.moveTo(66, yp); gx.lineTo(96, yp); gx.stroke(); gx.fillText(`${m} m`, 60, yp - 14); } gx.font = '700 20px Arial'; gx.fillText('prof.', 60, 16); ruler.tx.needsUpdate = true; }
      root.add(ruler.mesh);
      const CW = 14, CH = 7.4, U = 48, ch = textPanel(CW, CH, CW * U, CH * U, X1 - 0.065, -3.9, ZB + 9.4 + CW / 2), CG = ch.g; let lastK = '';
      const drawChart = (m, fin) => {
        const key = `${Math.round(m * 4)}|${fin}`; if (key === lastK) return; lastK = key; const W = CW * U, Hh = CH * U, x0 = 62, x1 = W - 20, y0 = 40, y1 = Hh - 44, X = (mm) => x0 + (x1 - x0) * mm / MONTHS, Y = (s) => y0 + (y1 - y0) * s / 40;
        CG.clearRect(0, 0, W, Hh); CG.fillStyle = 'rgba(20,24,30,0.76)'; CG.beginPath(); CG.roundRect(0, 0, W, Hh, 14); CG.fill();
        CG.fillStyle = 'rgba(255,255,255,0.08)'; for (let j = 0; j < 3; j++) CG.fillRect(X(FM[j]), y0, 22, y1 - y0);
        CG.strokeStyle = 'rgba(255,255,255,0.25)'; CG.fillStyle = '#fff'; CG.font = '600 15px Arial'; CG.textAlign = 'right'; for (const s of [0, 10, 20, 30, 40]) { CG.fillText(String(s), x0 - 8, Y(s) + 5); CG.beginPath(); CG.moveTo(x0, Y(s)); CG.lineTo(x1, Y(s)); CG.stroke(); }
        CG.textAlign = 'center'; for (const mm of [0, 6, 12, 18, 24]) { CG.fillText(String(mm), X(mm), Hh - 24); CG.beginPath(); CG.moveTo(X(mm), y0); CG.lineTo(X(mm), y1); CG.stroke(); } CG.fillStyle = '#9fd2ff'; CG.textAlign = 'right'; CG.font = '600 16px Arial'; CG.fillText('tempo (meses)', x1, Hh - 6); CG.textAlign = 'left'; CG.fillText('recalque (mm)', 6, 20); CG.fillStyle = 'rgba(255,255,255,0.7)'; CG.font = '600 13px Arial'; CG.textAlign = 'left'; CG.fillText('1º 2º 3º pav.', X(FM[0]) - 10, y1 - 8);
        for (let i = 0; i < 3; i++) { CG.strokeStyle = COLS[i]; CG.lineWidth = 3.5; CG.beginPath(); for (let mm = 0; mm <= Math.min(MONTHS, m); mm += 0.1) { const v = sAt(i, mm); if (mm === 0) CG.moveTo(X(mm), Y(v)); else CG.lineTo(X(mm), Y(v)); } CG.stroke(); CG.fillStyle = COLS[i]; CG.beginPath(); CG.arc(X(Math.min(MONTHS, m)), Y(sAt(i, Math.min(MONTHS, m))), 5, 0, 7); CG.fill(); }
        CG.font = '700 16px Arial'; CG.textAlign = 'right'; ['P1 · sapata sobre solo firme', 'P2 · sapata sobre argila', 'P3 · sapata sobre argila espessa'].forEach((tx, i) => { CG.fillStyle = COLS[i]; CG.fillText(tx, x1 - 8, y0 + 22 + i * 22); });
        if (fin) { CG.strokeStyle = '#fff'; CG.lineWidth = 2; CG.setLineDash([5, 4]); CG.beginPath(); CG.moveTo(X(MONTHS) - 4, Y(sAt(0, MONTHS))); CG.lineTo(X(MONTHS) - 4, Y(sAt(2, MONTHS))); CG.stroke(); CG.setLineDash([]); CG.fillStyle = '#fff'; CG.font = '700 16px Arial'; CG.textAlign = 'right'; CG.fillText(`Δ = ${fmt(sAt(2, MONTHS) - sAt(0, MONTHS), 0)} mm (≈ 1/520)`, X(MONTHS) - 12, (Y(sAt(0, MONTHS)) + Y(sAt(2, MONTHS))) / 2); }
        ch.tx.needsUpdate = true;
      };
      root.add(ch.mesh); drawChart(0, false);
      const ped = (c, h) => { const p = person(c, h); p.group.visible = false; root.add(p.group); return p; };
      const topo = ped(0x2f6fd0, 0xffffff), ajud = ped(0xe8742c, 0xf2b705), stk = stake(X1 + 1.3, ZB, 0);
      const lev = new THREE.Group(); { for (const a of [0, 2.1, 4.2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.5, 6), mat(0x6a4a2c)); l.position.set(Math.cos(a) * 0.35, 0.7, Math.sin(a) * 0.35); l.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); lev.add(l); } const bd = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.25), mat(0x2b2d31)); bd.position.y = 1.55; lev.add(bd); const tel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8), mat(0xe8742c)); tel.rotation.z = Math.PI / 2; tel.position.set(0, 1.75, 0); lev.add(tel); }
      lev.position.set(X1 + 1.5, 0, ZB - 10.2); lev.rotation.y = -Math.PI / 2; lev.visible = false; root.add(lev);
      const st = { m: 0, zr: ZP[0], fl: 0 };
      return {
        column(z, t, o) { o.top = 0; const c = new THREE.Color(0x6f9c50); if (t > 2) { const dz = Math.min(...ZP.map((zp) => Math.abs(z - zp))); c.lerp(new THREE.Color(0x8a6a44), 0.4 * ease(win(t, 2, 5)) * clamp01((2.4 - dz) / 1)); } o.topC.copy(c); },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null;
          const wI = ease(win(t, 0, 5)); topo.group.visible = true; topo.group.position.set(X1 + 1.6, 0, t < 5 ? ZB - 24 + 14 * wI : ZB - 11.4); topo.group.rotation.y = t < 5 ? 0 : -Math.PI / 2; topo.upper.rotation.x = t >= 14 ? 0.35 + 0.05 * Math.sin(tAbs * 2) : 0.1 * Math.sin(tAbs * 1.2);
          stk.visible = t > 3 && t < T_SET + 3; stk.scale.setScalar(ease(win(t, 3, 5)) + 0.001); stk.position.set(X1 + 1.3, 0, ZB - 7.5);
          const m = clamp01((t - T_M0) / (T_M1 - T_M0)) * MONTHS, mm = t < T_M0 ? 0 : m; st.m = mm; const fl = ease(clamp01((t - T_BLD) / (T_BLD1 - T_BLD))) * 3 + 0; st.fl = fl;
          const sv = ZP.map((_, i) => sAt(i, mm)); const dz = (i) => -sv[i] * EXA;
          // sapatas, pilares, lajes
          const sOn = t >= T_SET + 1, sg = ease(win(t, T_SET, T_SET + 4)); foots.forEach((f, i) => { f.visible = sOn; hbar(f, ZP[i] - 1.0, ZP[i] + 1.0, FOOT + dz(i)); }); cols.forEach((cl, i) => { cl.visible = sOn; vbar(cl, ZP[i], FOOT + 0.2 + dz(i), (Math.max(0.5, fl * 2.8)) + dz(i)); });
          for (let j = 0; j < 3; j++) { const on = fl >= j + 0.9; slabs[j].forEach((sl, k) => { sl.visible = on; if (on) sbar(sl, ZP[k], FY[j] + dz(k), ZP[k + 1], FY[j] + dz(k + 1)); }); }
          pins.forEach((p, i) => { p.visible = t >= T_SET + 3; vbar(p, ZP[i] - 0.65, 0.05 + dz(i), 0.5 + dz(i)); }); rn.visible = rnS.visible = t >= T_SET + 2; vbar(rn, ZB - 8.3, 0.0, 0.5); vbar(rnS, ZB - 8.3, -1.2, 0.0);
          lev.visible = t >= T_SET + 2; topo.group.visible = true; ajud.group.visible = t >= T_SET + 4;
          // leituras
          let visit = -1, rd = false; if (t >= T_SET + 6 && t < END - 6) { const cyc = ((t - T_SET - 6) % 7.5) / 7.5, which = Math.min(2, Math.floor(cyc * 3.6)); rd = cyc < 0.85; visit = which; }
          staff.visible = rd; sline.visible = rd; ticks.forEach((tk) => (tk.visible = rd));
          if (rd) { const zs = ZP[visit] - 0.65, ys = 0.5 + dz(visit); vbar(staff, zs, ys, ys + 2.4); const yl = ys + 1.3; hbar(sline, ZB - 10.2, zs, yl); ticks.forEach((tk, k) => hbar(tk, zs - 0.14, zs + 0.14, ys + 0.3 + k * 0.4)); ajud.group.position.set(X1 + 1.6, 0, zs + 0.9); ajud.group.rotation.y = -Math.PI / 2; ajud.upper.rotation.x = 0.25; st.zr = zs; } else ajud.group.position.set(X1 + 1.6, 0, ZB - 6.5);
          ruler.mesh.visible = t >= T_SET + 4; ch.mesh.visible = t >= T_BLD; drawChart(mm, t >= T_FIN - 4);
          if (t < 5) { note = 'A equipe topográfica chega à obra'; label = 'topo'; } else if (t < T_SET) { note = 'Marcando o prédio e a referência de nível'; label = 'topo'; }
          else if (t < 9) { note = 'Sapatas e pilares, com pinos de recalque no chão'; label = t < 8 ? 'sapata1' : 'marco'; } else if (t < T_BLD) { note = 'Referência de nível (RN) fora da área de influência'; label = 'rn'; }
          else if (t < T_MEAS) { note = `Construindo o ${Math.max(1, Math.min(3, Math.ceil(fl)))}º pavimento: a carga aumenta · mês ${fmt(mm, 0)}`; label = rd ? (visit === 0 ? 'nivel' : 'mira') : 'carga'; }
          else if (t < T_FIN - 4) { const i = rd ? visit : 2; note = `Mês ${fmt(mm, 0)}: P1 ${fmt(sv[0])} mm · P2 ${fmt(sv[1])} mm · P3 ${fmt(sv[2])} mm`; label = rd ? (t < T_MEAS + 14 ? 'mira' : 'marco') : (mm > 12 ? 'estab' : 'curva'); void i; }
          else { note = `Recalque diferencial P3 − P1 ≈ ${fmt(sv[2] - sv[0], 0)} mm em 10 m: distorção angular ≈ 1/520`; label = t < T_FIN + 6 ? 'dif' : 'estab'; }
          if (t >= T_BLD && t < T_MEAS && !rd) label = 'carga'; c.note = note; c.label = label;
        },
        idle: (t) => (t < T_SET ? 'Terreno natural' : t < T_BLD ? 'Fundação' : 'Monitoramento'),
        anchors(a) {
          const dz = (i) => -sAt(i, st.m) * EXA; a.topo.set(XP, 3.5, ZB); a.sapata.set(XP, FOOT - 0.8 + dz(2), ZP[2] + 0.4); a.sapata1.set(XP, FOOT - 0.8 + dz(0), ZP[0] + 0.4); a.marco.set(XP, 0.9 + dz(1), ZP[1] - 0.6); a.rn.set(XP, 1.0, ZB - 8.2); a.nivel.set(X1 + 1.5, 2.2, ZB - 10.2);
          a.mira.set(XP, 3.0, st.zr); a.carga.set(XP, Math.max(3, st.fl * 2.8) + 1.0, ZB); a.curva.set(XP, -2.0, ZB + 15); a.dif.set(XP, -5.0, ZB + 22); a.estab.set(XP, -3.0, ZB + 21); a.op.set(X1 + 1.6, 2.3, ZB - 11.4); a.solo.set(X1, -16, ZB);
        },
        vis: {
          topo: (t) => t < 7, sapata1: (t) => t >= 7 && t < 8, sapata: (t) => t >= 8 && t < 9, marco: (t) => (t >= 9 && t < 10) || (t >= T_MEAS + 14 && t < T_FIN - 4), rn: (t) => t >= 9.5 && t < T_BLD, carga: (t) => t >= T_BLD + 3 && t < T_MEAS - 4, nivel: (t) => t >= T_BLD + 2 && t < T_BLD + 8, mira: (t) => (t >= T_BLD + 8 && t < T_MEAS - 2) || (t >= T_MEAS && t < T_MEAS + 10), curva: (t) => t >= T_MEAS + 10 && t < T_MEAS + 22, estab: (t) => (t >= T_FIN - 24 && t < T_FIN - 6) || t >= T_FIN + 6, dif: (t) => t >= T_FIN - 4 && t < T_FIN + 6, op: (t) => t > 11 && t < 14,
        },
      };
    },
  });
}
