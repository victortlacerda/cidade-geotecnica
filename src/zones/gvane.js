import * as THREE from 'three';
import { createProfile, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { bounds } from '../scene/terrain.js';
import { X1G, ZB, GEO_G, G_BOX, textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// G5 — Vane test (ensaio de palheta). Em argila mole, uma palheta de quatro lâminas é cravada até a profundidade do ensaio e girada
// lentamente; o torque máximo dá a resistência não drenada (su). Depois de várias voltas rápidas, mede-se a resistência remoldada.
// ---------------------------------------------------------------------------
export const G5_CAM = { tx: X1G, ty: -3.0, tz: 40, yaw: -1.3, pitch: 0.2, dist: 54 };
export const G5_MCAM = { tx: X1G, ty: -3.0, tz: 40, yaw: -1.3, pitch: 0.2, dist: 100 };
const DEPTHS = [3, 4, 5, 6], PK = [12, 14, 17, 21], RS = [3.0, 3.7, 4.2, 5.0], T0 = 12, PT = 22, TE = T0 + PT * DEPTHS.length, END = TE + 16;
export const G5_STARTS = [0, T0, T0 + 0.18 * PT, T0 + PT * 2, TE];
export const G5_STEPS = [
  { t: 'Locação e pré-furo', d: 'O topógrafo marca o ponto e a equipe abre um pré-furo curto, até onde o solo é mais firme. O vane test (ensaio de palheta) é feito em argila mole, onde o SPT quase não mede nada (poucos golpes) e a amostragem perturba o solo. Ele mede diretamente a resistência não drenada (su), o parâmetro mais importante para analisar aterros e fundações sobre argila mole.' },
  { t: 'Cravação da palheta', d: 'Uma palheta de quatro lâminas em cruz, presa a uma haste, é cravada na argila até a profundidade do ensaio, sem girar, empurrada do fundo do pré-furo. A palheta é pequena (poucos centímetros) e corta pouco o solo, o que mantém a argila quase intacta ao redor dela.' },
  { t: 'Rotação lenta e torque máximo', d: 'No topo, uma manivela gira a haste lentamente, cerca de 6° por minuto, e um medidor registra o torque. O gráfico sobe até um pico, quando o cilindro de solo que a palheta envolve rompe, e depois cai. O torque máximo, dividido por uma constante da palheta, dá a resistência não drenada de pico, su.' },
  { t: 'Resistência remoldada e sensibilidade', d: 'Dão-se então dez voltas rápidas, que destroem a estrutura da argila, e mede-se de novo: é a resistência remoldada (sur). A razão St = su / sur é a sensibilidade da argila. Argilas de St alto perdem muita resistência quando amolgadas por uma obra, e isso explica rupturas em aterros sobre argila mole.' },
  { t: 'Perfil de su com a profundidade', d: 'Repetindo o ensaio a cada metro, obtém-se o perfil de su: aqui, de 12 kPa a 3 m a 21 kPa a 6 m, crescendo com a profundidade, como esperado. Esse perfil entra direto nas análises de estabilidade de aterros sobre solos moles, como o da obra F4, e nas de fundações superficiais sobre argila.' },
];
export const G5_LABELS = [
  { k: 'topo', t: 'Estaca de locação' }, { k: 'prefuro', t: 'Pré-furo' }, { k: 'palheta', t: 'Palheta de quatro lâminas' }, { k: 'manivela', t: 'Manivela e medidor de torque' }, { k: 'curva', t: 'Torque x rotação' }, { k: 'pico', t: 'Pico: su' }, { k: 'resid', t: 'Remoldada: sur' },
  { k: 'perfil', t: 'Perfil de su' }, { k: 'op', t: 'Operador' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const G5 = { box: G_BOX };
const fn = (th, pk, rs) => rs + (pk - rs) * (th / 15) * Math.exp(1 - th / 15);
const fmt = (v) => String(Math.round(v * 10) / 10).replace('.', ',');

export function createG5(engine, section) {
  return createProfile(engine, section, {
    key: 'G5', labels: G5_LABELS, starts: G5_STARTS, END, yb: -14, geo: GEO_G, zo: 38, hide: 'g-inv',
    build(H) {
      const { root, stake, X1, XP } = H;
      const mk = (th, color, ro, em) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; root.add(m); return m; };
      const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP - (m.userData.dx || 0), (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
      const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP - (m.userData.dx || 0), y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
      const holeM = mk(1.0, 0x1d1510, 5), rod = mk(0.2, 0x9aa0a8, 8), vane = mk(0.9, 0xe8b300, 9, 0x3a2c00), headM = mk(0.9, 0x3a3d44, 9), crank = mk(0.14, 0xe8742c, 10), dial = mk(0.45, 0xf4f1ea, 10);
      rod.userData.dx = 0.01; vane.userData.dx = 0.012; headM.userData.dx = 0.01; crank.userData.dx = 0.02; dial.userData.dx = 0.02;
      const ruler = textPanel(1.6, 14.4, 96, 864, X1 - 0.065, -7.2, ZB - 1.4);
      { const g = ruler.g; g.fillStyle = 'rgba(20,24,30,0.55)'; g.fillRect(0, 0, 96, 864); g.fillStyle = '#fff'; g.font = '700 26px "Barlow Semi Condensed", Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
        for (let m = 1; m <= 14; m++) { const yp = m * 60; g.beginPath(); g.moveTo(66, yp); g.lineTo(96, yp); g.stroke(); g.fillText(`${m} m`, 60, yp - 14); } g.font = '700 20px Arial'; g.fillText('prof.', 60, 16); ruler.tx.needsUpdate = true; }
      root.add(ruler.mesh);
      // gráfico torque x rotação (dinâmico)
      const CW = 13, CHh = 7, U = 50, cv = textPanel(CW, CHh, CW * U, CHh * U, X1 - 0.065, -4.4, ZB + 3.4 + CW / 2), CG = cv.g; let lastKey = '';
      const drawCurve = (k, th1, th2, showVals) => {
        const key = `${k}|${Math.round(th1)}|${Math.round(th2)}|${showVals}`; if (key === lastKey) return; lastKey = key;
        const W = CW * U, Hh = CHh * U, x0 = 70, x1 = W - 20, y0 = Hh - 50, y1 = 40; CG.clearRect(0, 0, W, Hh); CG.fillStyle = 'rgba(20,24,30,0.74)'; CG.beginPath(); CG.roundRect(0, 0, W, Hh, 14); CG.fill();
        CG.strokeStyle = 'rgba(255,255,255,0.3)'; CG.fillStyle = '#fff'; CG.font = '600 17px Arial'; CG.textAlign = 'right'; for (const v of [0, 10, 20, 30]) { const yy = y0 - (y0 - y1) * v / 30; CG.fillText(String(v), x0 - 8, yy + 5); CG.beginPath(); CG.moveTo(x0, yy); CG.lineTo(x1, yy); CG.stroke(); }
        CG.textAlign = 'center'; for (const v of [0, 30, 60, 90]) CG.fillText(`${v}°`, x0 + (x1 - x0) * v / 90, Hh - 28); CG.fillStyle = '#9fd2ff'; CG.textAlign = 'left'; CG.font = '600 18px Arial'; CG.fillText('su (kPa)', 10, 24); CG.textAlign = 'right'; CG.fillText('rotação da palheta', x1, Hh - 8);
        const X = (th) => x0 + (x1 - x0) * th / 90, Y = (v) => y0 - (y0 - y1) * v / 30, pk = PK[k], rs = RS[k];
        CG.strokeStyle = '#ffb347'; CG.lineWidth = 4; CG.beginPath(); for (let th = 0; th <= th1; th += 1) { const v = fn(th, pk, rs); if (th === 0) CG.moveTo(X(th), Y(v)); else CG.lineTo(X(th), Y(v)); } CG.stroke();
        if (th2 > 0) { CG.strokeStyle = '#c8cdd4'; CG.setLineDash([8, 6]); CG.beginPath(); for (let th = 0; th <= th2; th += 1) { const v = rs * (1 - Math.exp(-th / 6)); if (th === 0) CG.moveTo(X(th), Y(v)); else CG.lineTo(X(th), Y(v)); } CG.stroke(); CG.setLineDash([]); }
        if (th1 >= 15) { CG.fillStyle = '#ffb347'; CG.beginPath(); CG.arc(X(15), Y(pk), 6, 0, 7); CG.fill(); CG.textAlign = 'left'; CG.font = '700 20px Arial'; CG.fillText(`pico: su = ${fmt(pk)} kPa`, X(15) + 14, Y(pk) - 6); }
        if (showVals) { CG.fillStyle = '#c8cdd4'; CG.textAlign = 'left'; CG.fillText(`remoldada: sur = ${fmt(rs)} kPa`, X(40), Y(rs) - 26); CG.fillStyle = '#ffd37a'; CG.fillText(`St = su / sur = ${fmt(pk / rs)}`, X(40), Y(rs) - 52); }
        cv.tx.needsUpdate = true;
      };
      root.add(cv.mesh); drawCurve(0, 0, 0, false);
      // perfil de su (dinâmico, alinhado com a profundidade)
      const PW = 11.5, PH = 7.8, PU = 50, pf = textPanel(PW, PH, PW * PU, PH * PU, X1 - 0.065, -PH / 2 - 0.0, ZB + 18.6 + PW / 2), PG = pf.g; let lastRec = -1;
      const drawProf = (rec, cur) => {
        const key = rec * 10 + (cur ? 1 : 0); if (key === lastRec) return; lastRec = key; const W = PW * PU, Hh = PH * PU; PG.clearRect(0, 0, W, Hh); PG.fillStyle = 'rgba(20,24,30,0.72)'; PG.beginPath(); PG.roundRect(0, 0, W, Hh, 14); PG.fill();
        PG.fillStyle = '#fff'; PG.font = '600 17px Arial'; PG.textAlign = 'center'; PG.strokeStyle = 'rgba(255,255,255,0.25)'; for (const v of [0, 10, 20, 30]) { const xx = 30 + v * 17; PG.fillText(String(v), xx, 20); PG.beginPath(); PG.moveTo(xx, 28); PG.lineTo(xx, Hh); PG.stroke(); } PG.textAlign = 'left'; PG.fillText('su (kPa)', 30 + 31 * 17, 20);
        for (let i = 0; i < rec; i++) { const yc = DEPTHS[i] * U, wp = PK[i] * 17, wr = RS[i] * 17; PG.fillStyle = '#ffb347'; PG.fillRect(30, yc - 18, wp, 15); PG.fillStyle = '#c8cdd4'; PG.fillRect(30, yc - 1, wr, 13); PG.fillStyle = '#fff'; PG.font = '700 18px Arial'; PG.fillText(`${fmt(PK[i])} / ${fmt(RS[i])}`, 30 + wp + 10, yc + 6); }
        PG.fillStyle = '#ffb347'; PG.fillRect(30, Hh - 30, 16, 12); PG.fillStyle = '#fff'; PG.font = '600 15px Arial'; PG.fillText('pico', 52, Hh - 19); PG.fillStyle = '#c8cdd4'; PG.fillRect(112, Hh - 30, 16, 12); PG.fillStyle = '#fff'; PG.fillText('remoldada', 134, Hh - 19); pf.tx.needsUpdate = true;
      };
      root.add(pf.mesh); drawProf(0, false);
      const ped = (c, h) => { const p = person(c, h); p.group.visible = false; root.add(p.group); return p; };
      const nota = ped(0x2f6fd0, 0xffffff), op = ped(0xe8742c, 0xf2b705); const stk = stake(X1 + 1.3, ZB, 0);
      const st = { d: 0, rot: 0 };
      const test = (t) => { let k = -1; for (let i = 0; i < DEPTHS.length; i++) if (t >= T0 + i * PT) k = i; return k; };
      return {
        column(z, t, o) { const dz = Math.abs(z - ZB); o.top = 0; const c = new THREE.Color(0x6f9c50); if (t > 3 && dz < 1.8) c.lerp(new THREE.Color(0x8a6a44), 0.6 * ease(win(t, 3, 6))); o.topC.copy(c); },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null;
          const wI = ease(win(t, 0, 5)); nota.group.visible = true; nota.group.position.set(X1 + 1.6, 0, t < 5 ? ZB - 18 + 17 * wI : t < 8 ? ZB - 1 : ZB + 2.4); nota.group.rotation.y = t < 8 ? 0 : -Math.PI / 2; nota.upper.rotation.x = t >= 5 && t < 7 ? 0.5 + 0.2 * Math.sin(tAbs * 5) : 0.15 * Math.sin(tAbs * 1.2);
          stk.visible = t > 5.5 && t < T0; stk.scale.setScalar(ease(win(t, 5.5, 7)) + 0.001); stk.position.set(X1 + 1.3, 0, ZB);
          op.group.visible = t > 6; op.group.position.set(X1 + 1.6, 0, ZB - 20 + 17.6 * ease(win(t, 6, 10))); op.group.rotation.y = t < 10 ? 0 : -Math.PI / 2;
          const k = test(t), inT = k >= 0 && t < TE, u = inT ? (t - (T0 + k * PT)) / PT : 0;
          if (t < T0) { const pre = ease(win(t, 7, T0)); note = t < 5 ? 'O topógrafo chega ao ponto do ensaio' : t < 7 ? 'Cravando a estaca de locação' : 'Abrindo o pré-furo de 2 m'; label = t < 7 ? 'topo' : 'prefuro'; holeM.visible = t > 7; vbar(holeM, ZB, 0, -2 * pre); }
          else holeM.visible = true, vbar(holeM, ZB, 0, -2);
          // palheta
          const d = k < 0 ? 0 : DEPTHS[k]; const prev = k <= 0 ? 2 : DEPTHS[k - 1]; const push = inT ? ease(win(u, 0, 0.18)) : 0; const cd = inT ? prev + (d - prev) * push : (t >= TE ? DEPTHS[DEPTHS.length - 1] : 0); st.d = cd;
          const on = t >= T0 && t < TE + 4; [rod, vane, headM, crank, dial].forEach((m) => (m.visible = on)); if (on) vbar(rod, ZB, -cd, 1.4);
          const slow = inT ? win(u, 0.18, 0.5) : 0, fast = inT ? win(u, 0.5, 0.62) : 0, slow2 = inT ? win(u, 0.62, 0.85) : 0; let ang = 0; if (inT) ang = u < 0.5 ? slow * 90 : u < 0.62 ? 90 + fast * 3600 : slow2 * 90; st.rot = ang;
          if (on) { const rad = (ang * Math.PI) / 180; vbar(vane, ZB, -cd - 0.7, -cd + 0.7); vane.scale.y = 1; const w = Math.max(0.12, Math.abs(Math.cos(rad))); vane.geometry.dispose(); vane.geometry = new THREE.BoxGeometry(0.02, 0.9 * w + 0.06, 1); vbar(headM, ZB, 1.4, 2.2); hbar(crank, ZB - 0.9 * Math.cos(rad), ZB + 0.9 * Math.cos(rad), 2.45); vbar(dial, ZB + 0.9, 1.6, 2.3); }
          if (inT) {
            const lab = `${DEPTHS[k]} m`;
            if (u < 0.18) { note = `Prof. ${lab}: cravando a palheta`; label = 'palheta'; }
            else if (u < 0.5) { note = `Prof. ${lab}: girando devagar · su = ${fmt(fn(Math.min(slow * 90, 90), PK[k], RS[k]))} kPa`; label = slow * 90 < 15 ? 'manivela' : 'pico'; op.upper.rotation.x = 0.4 + 0.1 * Math.sin(tAbs * 2); }
            else if (u < 0.62) { note = `Prof. ${lab}: dez voltas rápidas para remoldar a argila`; label = 'manivela'; op.upper.rotation.x = 0.4 + 0.3 * Math.sin(tAbs * 12); }
            else if (u < 0.85) { note = `Prof. ${lab}: nova rotação, resistência remoldada`; label = 'resid'; }
            else { note = `Prof. ${lab}: su = ${fmt(PK[k])} kPa · sur = ${fmt(RS[k])} kPa · St = ${fmt(PK[k] / RS[k])}`; label = 'curva'; }
            const th1 = u < 0.5 ? slow * 90 : 90, th2 = u < 0.62 ? 0 : slow2 * 90; drawCurve(k, th1, th2, u >= 0.85);
            const rec = u >= 0.85 ? k + 1 : k; drawProf(rec, false);
          } else if (t >= TE) { note = 'Perfil de su: cresce com a profundidade na argila mole'; label = 'perfil'; drawProf(DEPTHS.length, false); }
          cv.mesh.visible = t >= T0; pf.mesh.visible = t >= T0; ruler.mesh.visible = t >= T0;
          if (t >= TE) cv.mesh.visible = false;
          c.note = note; c.label = label;
        },
        idle: (t) => (t < T0 ? 'Terreno natural' : 'Ensaio de palheta'),
        anchors(a) {
          a.topo.set(X1 + 1.3, 1.6, ZB); a.prefuro.set(XP, -1.0, ZB); a.palheta.set(XP, -st.d - 0.8, ZB + 0.4); a.manivela.set(XP, 2.7, ZB + 0.3); a.curva.set(XP, -2.0, ZB + 10); a.pico.set(XP, -2.5, ZB + 9);
          a.resid.set(XP, -4.8, ZB + 12); a.perfil.set(XP, -4.0, ZB + 24); a.op.set(X1 + 1.6, 2.3, op.group.position.z); a.solo.set(X1, -16, ZB);
        },
        vis: {
          topo: (t) => t > 5.5 && t < 7, prefuro: (t) => t > 7 && t < T0, palheta: (t) => t >= T0 && t < T0 + 0.18 * PT, manivela: (t) => t >= T0 + 0.18 * PT && t < T0 + 0.5 * PT, curva: (t) => t >= T0 + 0.85 * PT && t < T0 + PT, pico: (t) => t >= T0 + 0.4 * PT && t < T0 + 0.5 * PT, resid: (t) => t >= T0 + 0.62 * PT && t < T0 + 0.85 * PT, perfil: (t) => t >= TE, op: (t) => t > 10 && t < 12,
        },
      };
    },
  });
}
