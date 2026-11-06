import * as THREE from 'three';
import { createProfile, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { bounds } from '../scene/terrain.js';
import { X1G, ZB, GEO_G, G_BOX, textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// G7 — Prova de carga estática em estaca. Estaca instrumentada de 10 m, com macaco hidráulico reagindo contra uma viga presa a duas
// estacas de reação (tracionadas). A carga sobe em estágios até 2x a carga de trabalho; o recalque da cabeça vem de relógios,
// e extensômetros ao longo do fuste mostram como a carga passa da estaca para o solo (atrito lateral e ponta).
// ---------------------------------------------------------------------------
export const G7_CAM = { tx: X1G, ty: -3.6, tz: 36, yaw: -1.3, pitch: 0.2, dist: 56 };
export const G7_MCAM = { tx: X1G, ty: -3.6, tz: 36, yaw: -1.3, pitch: 0.2, dist: 104 };
const T_BL = 7, T_AS = 22, NST = 10, TST = 6, T_UN = T_AS + NST * TST, T_UN1 = T_UN + 10, T_FIN = T_UN1 + 12, END = T_FIN + 14;
const LP = 10, QMAX = 1600, QU = 2400, KS = 0.0044, EXA = 0.05, SLIM = 18;
export const G7_STARTS = [0, T_BL, T_AS, T_UN, T_UN1];
export const G7_STEPS = [
  { t: 'Locação e preparo da estaca', d: 'A estaca de prova, executada e já curada, é uma estaca como as da obra, mas com extensômetros (strain gauges) colados na armadura em várias profundidades. A prova de carga é o ensaio mais confiável para estacas: em vez de calcular a capacidade com fórmulas, carrega-se a própria estaca e vê-se como ela responde. Prepara-se a cabeça, com um bloco de coroamento que distribui a carga.' },
  { t: 'Sistema de reação', d: 'Para empurrar a estaca é preciso uma reação do mesmo tamanho. Aqui ela vem de duas estacas de reação, ligadas por tirantes a uma viga metálica sobre a estaca de prova; no meio vai o macaco hidráulico, com a célula de carga. Quando o macaco empurra para baixo, a viga empurra as estacas de reação para cima, e elas resistem à tração pelo atrito lateral. Relógios comparadores, em uma viga de referência independente, medem o recalque da cabeça.' },
  { t: 'Carregamento em estágios', d: 'A carga sobe em dez estágios de 160 kN, até 1.600 kN, o dobro da carga de trabalho (800 kN). Cada estágio é mantido até o recalque estabilizar. O diagrama de transferência mostra a carga em cada profundidade, a partir dos extensômetros: ela diminui à medida que desce, e a diferença que se perde entre dois pontos foi passada ao solo como atrito lateral. O que chega à ponta é a resistência de ponta.' },
  { t: 'Descarregamento', d: 'Depois do último estágio a carga é retirada, também em estágios. A parte do recalque recuperada é elástica (o encurtamento da própria estaca e do solo), e o resto é permanente. A curva de descarga permite estimar o comportamento elástico do conjunto estaca-solo.' },
  { t: 'Curva carga x recalque e interpretação', d: 'A curva carga x recalque cresce com inclinação cada vez menor. Pelo critério de ruptura convencional da norma brasileira (NBR 6122), a ruptura é a carga em que o recalque alcança o valor limite (D/30 mais o encurtamento elástico da estaca), aqui cerca de 18 mm, o que dá uma carga de ruptura da ordem de 1.500 kN. A carga admissível é a de ruptura dividida pelo fator de segurança (2 na estaca com prova de carga): cerca de 750 kN.' },
];
export const G7_LABELS = [
  { k: 'topo', t: 'Estaca de prova' }, { k: 'bloco', t: 'Bloco de coroamento' }, { k: 'strain', t: 'Extensômetros na armadura' }, { k: 'reacao', t: 'Estacas de reação (tração)' }, { k: 'macaco', t: 'Macaco hidráulico e célula de carga' }, { k: 'viga', t: 'Viga de reação' },
  { k: 'relogio', t: 'Relógios comparadores' }, { k: 'transf', t: 'Transferência de carga' }, { k: 'ponta', t: 'Resistência de ponta' }, { k: 'curva', t: 'Curva carga x recalque' }, { k: 'adm', t: 'Carga admissível' }, { k: 'op', t: 'Operador do macaco' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const G7 = { box: G_BOX };
const sOf = (q) => (KS * q) / (1 - Math.min(0.97, q / QU)), SMAX = sOf(QMAX), SPERM = 0.6 * SMAX;
const fmt = (v, n = 0) => (n ? v.toFixed(n).replace('.', ',') : String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));

export function createG7(engine, section) {
  return createProfile(engine, section, {
    key: 'G7', labels: G7_LABELS, starts: G7_STARTS, END, yb: -14, geo: GEO_G, zo: 38, hide: 'g-inv',
    build(H) {
      const { root, X1, XP } = H;
      const B = bounds(X1, ZB);
      const mk = (th, color, ro, em, dx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; m.userData.dx = dx; root.add(m); return m; };
      const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP - (m.userData.dx || 0), (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
      const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP - (m.userData.dx || 0), y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
      const pile = mk(0.9, 0xb9bcc0, 7, 0x222222, 0.006), block = mk(1, 0x8f959d, 9, 0x1a1a1a, 0.012), jack = mk(0.6, 0xe8742c, 9, 0x3a1a00, 0.012), piston = mk(0.28, 0xc7ccd3, 10, 0, 0.016), cell = mk(0.7, 0x2b2d31, 10, 0, 0.016), beam = mk(0.4, 0x3a3d44, 9, 0, 0.01);
      const rpA = mk(0.9, 0xb9bcc0, 7, 0x222222, 0.006), rpB = mk(0.9, 0xb9bcc0, 7, 0x222222, 0.006), tieA = mk(0.14, 0x6f737a, 8, 0, 0.01), tieB = mk(0.14, 0x6f737a, 8, 0, 0.01);
      const ref = mk(0.12, 0xd8332a, 8, 0, 0.01), refP1 = mk(0.1, 0xd8332a, 8, 0, 0.01), refP2 = mk(0.1, 0xd8332a, 8, 0, 0.01), gA = mk(0.5, 0xf4f1ea, 10, 0, 0.018), gB = mk(0.5, 0xf4f1ea, 10, 0, 0.018), plA = mk(0.06, 0x23303d, 10, 0, 0.02), plB = mk(0.06, 0x23303d, 10, 0, 0.02);
      const SG = [2, 4, 6, 8, 9.8].map((d) => mk(0.34, 0xffc400, 11, 0x553d00, 0.02)); const SGD = [2, 4, 6, 8, 9.8];
      const ruler = textPanel(1.6, 14.4, 96, 864, X1 - 0.065, -7.2, ZB - 1.9);
      { const g = ruler.g; g.fillStyle = 'rgba(20,24,30,0.55)'; g.fillRect(0, 0, 96, 864); g.fillStyle = '#fff'; g.font = '700 26px "Barlow Semi Condensed", Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
        for (let m = 1; m <= 14; m++) { const yp = m * 60; g.beginPath(); g.moveTo(66, yp); g.lineTo(96, yp); g.stroke(); g.fillText(`${m} m`, 60, yp - 14); } g.font = '700 20px Arial'; g.fillText('prof.', 60, 16); ruler.tx.needsUpdate = true; }
      root.add(ruler.mesh);
      // diagrama de transferência (à esquerda, alinhado à profundidade)
      const TW = 7.6, TU = 40, tf = textPanel(TW, 10.6, TW * TU, 10.6 * TU, X1 - 0.055, -5.3, ZB - 5.2 - TW / 2), TG = tf.g; let lastT = -1;
      const w = (d) => (d < 2.2 ? 0.6 : d < 7 ? 0.5 : 1.7), SW = []; { let a = 0; for (let i = 0; i <= 100; i++) { SW.push(a); a += w(i * LP / 100) * (LP / 100); } const tot = SW[100]; for (let i = 0; i <= 100; i++) SW[i] /= tot; }
      const qAt = (qh, d) => { const tip = 0.1 + 0.12 * (qh / QMAX); return qh * (1 - (1 - tip) * SW[Math.min(100, Math.round(d / LP * 100))]); };
      const drawT = (qh) => {
        const k = Math.round(qh / 10); if (k === lastT) return; lastT = k; const W = TW * TU, Hh = 10.6 * TU, x0 = 20, x1 = W - 14, X = (q) => x0 + (x1 - x0) * q / QMAX, Y = (d) => d * TU; TG.clearRect(0, 0, W, Hh); TG.fillStyle = 'rgba(20,24,30,0.7)'; TG.beginPath(); TG.roundRect(0, 0, W, Hh, 12); TG.fill();
        TG.strokeStyle = 'rgba(255,255,255,0.25)'; TG.fillStyle = '#fff'; TG.font = '600 15px Arial'; TG.textAlign = 'center'; for (const q of [0, 800, 1600]) { TG.fillText(String(q), X(q), 16); TG.beginPath(); TG.moveTo(X(q), 24); TG.lineTo(X(q), Hh); TG.stroke(); }
        if (qh > 1) { TG.fillStyle = 'rgba(255,196,0,0.30)'; TG.beginPath(); TG.moveTo(x0, Y(0)); for (let d = 0; d <= LP; d += 0.25) TG.lineTo(X(qAt(qh, d)), Y(d)); TG.lineTo(x0, Y(LP)); TG.closePath(); TG.fill(); TG.strokeStyle = '#ffc400'; TG.lineWidth = 4; TG.beginPath(); for (let d = 0; d <= LP; d += 0.25) { const x = X(qAt(qh, d)); if (d === 0) TG.moveTo(x, Y(d)); else TG.lineTo(x, Y(d)); } TG.stroke();
          TG.fillStyle = '#fff'; TG.font = '700 17px Arial'; TG.textAlign = 'left'; TG.fillText(`ponta: ${fmt(qAt(qh, LP))} kN (${Math.round(100 * qAt(qh, LP) / qh)}%)`, 26, Y(LP) - 10); }
        TG.textAlign = 'left'; TG.fillStyle = '#9fd2ff'; TG.font = '600 15px Arial'; TG.fillText('carga na estaca (kN)', 26, Hh - 8); tf.tx.needsUpdate = true;
      };
      root.add(tf.mesh); drawT(0);
      // curva carga x recalque
      const CW = 13, CH = 7.2, U = 50, ch = textPanel(CW, CH, CW * U, CH * U, X1 - 0.065, -4.2, ZB + 8.4 + CW / 2), CG = ch.g; let lastK = '';
      const drawCurve = (nSt, qNow, sNow, unl, fin) => {
        const key = `${nSt}|${Math.round(qNow / 10)}|${Math.round(sNow * 10)}|${unl}|${fin}`; if (key === lastK) return; lastK = key;
        const W = CW * U, Hh = CH * U, x0 = 74, x1 = W - 22, y0 = 44, y1 = Hh - 30, X = (q) => x0 + (x1 - x0) * q / 1800, Y = (s) => y0 + (y1 - y0) * s / 30; CG.clearRect(0, 0, W, Hh); CG.fillStyle = 'rgba(20,24,30,0.74)'; CG.beginPath(); CG.roundRect(0, 0, W, Hh, 14); CG.fill();
        CG.strokeStyle = 'rgba(255,255,255,0.28)'; CG.fillStyle = '#fff'; CG.font = '600 16px Arial'; CG.textAlign = 'right'; for (const s of [0, 10, 20, 30]) { CG.fillText(String(s), x0 - 8, Y(s) + 5); CG.beginPath(); CG.moveTo(x0, Y(s)); CG.lineTo(x1, Y(s)); CG.stroke(); }
        CG.textAlign = 'center'; for (const q of [0, 400, 800, 1200, 1600]) { CG.fillText(fmt(q), X(q), 24); CG.beginPath(); CG.moveTo(X(q), y0); CG.lineTo(X(q), y1); CG.stroke(); } CG.fillStyle = '#9fd2ff'; CG.textAlign = 'left'; CG.font = '600 17px Arial'; CG.fillText('recalque da cabeça (mm)', 8, Hh - 8); CG.textAlign = 'right'; CG.fillText('carga (kN)', x1, 12);
        CG.strokeStyle = '#ffb347'; CG.fillStyle = '#ffb347'; CG.lineWidth = 4; CG.beginPath(); CG.moveTo(X(0), Y(0)); for (let i = 1; i <= nSt; i++) CG.lineTo(X(160 * i), Y(sOf(160 * i))); if (!unl && qNow > 160 * nSt) CG.lineTo(X(qNow), Y(sNow)); CG.stroke(); for (let i = 1; i <= nSt; i++) { CG.beginPath(); CG.arc(X(160 * i), Y(sOf(160 * i)), 6, 0, 7); CG.fill(); }
        if (unl) { CG.strokeStyle = '#c8cdd4'; CG.setLineDash([8, 6]); CG.beginPath(); CG.moveTo(X(QMAX), Y(SMAX)); CG.lineTo(X(qNow), Y(sNow)); CG.stroke(); CG.setLineDash([]); }
        if (fin) { const qr = 1500; CG.strokeStyle = '#ff7a6a'; CG.lineWidth = 2; CG.setLineDash([6, 5]); CG.beginPath(); CG.moveTo(x0, Y(SLIM)); CG.lineTo(x1, Y(SLIM)); CG.stroke(); CG.beginPath(); CG.moveTo(X(qr), y0); CG.lineTo(X(qr), y1); CG.stroke(); CG.setLineDash([]); CG.fillStyle = '#ff7a6a'; CG.textAlign = 'left'; CG.font = '700 16px Arial'; CG.fillText('recalque convencional 18 mm', x0 + 10, Y(SLIM) - 6); CG.fillText(`ruptura ≈ ${fmt(qr)} kN`, X(qr) - 190, y0 + 22);
          CG.strokeStyle = '#7ee08a'; CG.lineWidth = 3; CG.setLineDash([6, 5]); CG.beginPath(); CG.moveTo(X(750), y0); CG.lineTo(X(750), y1); CG.stroke(); CG.setLineDash([]); CG.fillStyle = '#7ee08a'; CG.beginPath(); CG.arc(X(750), Y(sOf(750)), 8, 0, 7); CG.fill(); CG.font = '700 19px Arial'; CG.fillText(`Qadm = 750 kN · s ≈ ${fmt(sOf(750), 1)} mm`, X(750) + 14, Y(sOf(750)) + 30); }
        ch.tx.needsUpdate = true;
      };
      root.add(ch.mesh); drawCurve(0, 0, 0, false, false);
      const ped = (c, h) => { const p = person(c, h); p.group.visible = false; root.add(p.group); return p; };
      const nota = ped(0x2f6fd0, 0xffffff), op = ped(0xe8742c, 0xf2b705);
      const st = { q: 0, s: 0, head: 0 };
      return {
        column(z, t, o) { const dz = Math.abs(z - ZB); o.top = 0; const c = new THREE.Color(0x6f9c50); if (t > 2) c.lerp(new THREE.Color(0x8a6a44), 0.5 * ease(win(t, 2, 5)) * clamp01((3 - dz) / 1)); o.topC.copy(c); },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null;
          const wI = ease(win(t, 0, 5)); nota.group.visible = true; nota.group.position.set(X1 + 1.6, 0, t < 5 ? ZB - 18 + 14 * wI : ZB - 4.4); nota.group.rotation.y = t < 5 ? 0 : -Math.PI / 2; nota.upper.rotation.x = 0.12 * Math.sin(tAbs * 1.2);
          op.group.visible = t > 14; op.group.position.set(X1 + 1.6, 0, ZB + 5.0); op.group.rotation.y = -Math.PI / 2;
          // carga
          let q = 0, s = 0, nSt = 0, unl = false, fin = false;
          if (t >= T_AS && t < T_UN) { const k = Math.floor((t - T_AS) / TST), u = (t - T_AS) / TST - k; q = k * 160 + 160 * ease(clamp01(u / 0.35)); s = sOf(q) * (u > 0.35 ? 0.96 + 0.04 * ease((u - 0.35) / 0.65) : 1); nSt = Math.min(NST, k + (u >= 0.5 ? 1 : 0)); }
          else if (t >= T_UN && t < T_UN1) { const f = ease(win(t, T_UN, T_UN1)); q = QMAX * (1 - f); s = SPERM + (SMAX - SPERM) * (q / QMAX); nSt = NST; unl = true; }
          else if (t >= T_UN1) { q = 0; s = SPERM; nSt = NST; unl = true; fin = t >= T_FIN - 4; }
          st.q = q; st.s = s; const hy = -s * EXA; st.head = hy;
          // estaca, bloco, sensores
          pile.visible = true; vbar(pile, ZB, hy, hy - LP); const blk = ease(win(t, T_BL, T_BL + 5)); block.visible = t >= T_BL; hbar(block, ZB - 0.75, ZB + 0.75, hy + 0.2 * blk); block.scale.y = 1; block.position.y = hy + 0.2; block.geometry.dispose(); block.geometry = new THREE.BoxGeometry(0.02, 0.4 * blk + 0.001, 1); block.position.y = hy + 0.2 * blk;
          SG.forEach((m, i) => { m.visible = true; vbar(m, ZB, hy - SGD[i] - 0.1, hy - SGD[i] + 0.1); m.scale.z = 0.2; });
          const asm = ease(win(t, 12, 20)), on = t >= 12; const beamY = 2.4;
          const rig = [jack, piston, cell, beam, rpA, rpB, tieA, tieB, ref, refP1, refP2, gA, gB, plA, plB]; rig.forEach((m) => (m.visible = on));
          if (on) {
            vbar(rpA, ZB - 4.2, 0, -LP - 0.5); vbar(rpB, ZB + 4.2, 0, -LP - 0.5); vbar(tieA, ZB - 4.2, 0, beamY - 0.2); vbar(tieB, ZB + 4.2, 0, beamY - 0.2); hbar(beam, ZB - 4.9, ZB + 4.9, beamY);
            vbar(cell, ZB, beamY - 0.2 - 0.7, beamY - 0.2); vbar(jack, ZB, hy + 0.4 + 0.3, beamY - 0.9); vbar(piston, ZB, hy + 0.4, hy + 0.7);
            hbar(ref, ZB - 6.2, ZB + 6.2, 0.55); vbar(refP1, ZB - 6.2, 0, 0.55); vbar(refP2, ZB + 6.2, 0, 0.55); vbar(gA, ZB - 2.0, 0.58, 1.0); vbar(gB, ZB + 2.0, 0.58, 1.0); vbar(plA, ZB - 2.0, hy + 0.4, 0.6); vbar(plB, ZB + 2.0, hy + 0.4, 0.6);
            rig.forEach((m) => { m.visible = asm > 0.02; });
          }
          ruler.mesh.visible = tf.mesh.visible = ch.mesh.visible = t >= T_AS - 2; drawT(q); drawCurve(nSt, q, s, unl, fin);
          if (t < T_BL) { note = t < 5 ? 'A equipe chega à estaca de prova, já instrumentada' : 'Medindo e conferindo as cotas'; label = 'topo'; }
          else if (t < 12) { note = 'Preparando a cabeça: bloco de coroamento'; label = 'bloco'; }
          else if (t < T_AS) { note = t < 17 ? 'Montando as estacas de reação e a viga' : 'Instalando o macaco, a célula de carga e os relógios'; label = t < 14 ? 'reacao' : t < 17 ? 'viga' : t < 20 ? 'macaco' : 'relogio'; }
          else if (t < T_UN) { const k = Math.floor((t - T_AS) / TST); note = `Estágio ${k + 1} de ${NST}: ${fmt(q)} kN · recalque ${fmt(s, 1)} mm`; label = k < 1 ? 'macaco' : k < 3 ? 'transf' : k < 5 ? 'strain' : k < 7 ? 'ponta' : 'curva'; op.upper.rotation.x = 0.3 + 0.2 * Math.sin(tAbs * 6); }
          else if (t < T_UN1) { note = `Descarregando: ${fmt(q)} kN · recalque ${fmt(s, 1)} mm`; label = 'relogio'; }
          else { note = t < T_FIN - 4 ? `Recalque residual: ${fmt(SPERM, 1)} mm` : 'Ruptura convencional ≈ 1.500 kN · Qadm = 750 kN (FS = 2)'; label = t < T_FIN - 4 ? 'curva' : 'adm'; }
          c.note = note; c.label = label; void B;
        },
        idle: (t) => (t < T_BL ? 'Estaca de prova' : t < T_AS ? 'Montagem do ensaio' : 'Prova de carga'),
        anchors(a) {
          const hy = st.head; a.topo.set(X1 + 1.3, 1.2, ZB); a.bloco.set(XP, hy + 0.7, ZB - 0.8); a.strain.set(XP, hy - 4.1, ZB + 0.5); a.reacao.set(XP, -2.2, ZB - 4.2); a.macaco.set(XP, 1.3, ZB + 0.6); a.viga.set(XP, 2.8, ZB - 3.0); a.relogio.set(XP, 1.1, ZB + 2.0);
          a.transf.set(XP, -3.2, ZB - 7.2); a.ponta.set(XP, hy - LP - 0.5, ZB - 5.0); a.curva.set(XP, -3.0, ZB + 16); a.adm.set(XP, -2.6, ZB + 16); a.op.set(X1 + 1.6, 2.3, ZB + 5.0); a.solo.set(X1, -16, ZB);
        },
        vis: {
          topo: (t) => t < T_BL, bloco: (t) => t >= T_BL && t < 12, reacao: (t) => t >= 12 && t < 14, viga: (t) => t >= 14 && t < 17, macaco: (t) => (t >= 17 && t < 20) || (t >= T_AS && t < T_AS + TST), relogio: (t) => (t >= 20 && t < T_AS) || (t >= T_UN && t < T_UN1), transf: (t) => t >= T_AS + TST && t < T_AS + 3 * TST, strain: (t) => t >= T_AS + 3 * TST && t < T_AS + 5 * TST, ponta: (t) => t >= T_AS + 5 * TST && t < T_AS + 7 * TST,
          curva: (t) => (t >= T_AS + 7 * TST && t < T_UN) || (t >= T_UN1 && t < T_FIN - 4), adm: (t) => t >= T_FIN - 4, op: (t) => t > 15 && t < 19,
        },
      };
    },
  });
}
