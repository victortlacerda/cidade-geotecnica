import * as THREE from 'three';
import { createProfile, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { X1G, ZB, GEO_G, G_BOX, textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// G8 — Ensaio de carregamento dinâmico (PDA). Um martelo cai sobre a cabeça da estaca; acelerômetros e extensômetros fixados perto
// do topo registram força e velocidade. A onda de tensão desce até a ponta, reflete e sobe; com os sinais, o método Case estima
// a capacidade mobilizada. Três golpes, com energia crescente.
// ---------------------------------------------------------------------------
export const G8_CAM = { tx: X1G, ty: -3.2, tz: 36, yaw: -1.3, pitch: 0.2, dist: 58 };
export const G8_MCAM = { tx: X1G, ty: -3.2, tz: 36, yaw: -1.3, pitch: 0.2, dist: 106 };
const LP = 10, TOP = 1.2, T_SET = 7, T_B0 = 20, PB = 24, NB = 3, T_RES = T_B0 + NB * PB, END = T_RES + 14;
const A = [2200, 2900, 3500], R = [930, 1310, 1480], HB = [1.2, 2.0, 2.8], NEGA = [2, 3, 3];
export const G8_STARTS = [0, T_SET, T_B0, T_B0 + PB, T_RES];
export const G8_STEPS = [
  { t: 'Locação e chegada do equipamento', d: 'O ensaio de carregamento dinâmico (PDA, de Pile Driving Analyzer) é feito na própria estaca da obra, sem nenhum sistema de reação: basta um martelo (aqui, um peso levantado por um guindaste) e instrumentos. Por isso é muito mais rápido e barato que a prova de carga estática, e se pode ensaiar muito mais estacas. Em troca, a capacidade vem de uma análise dos sinais, que exige técnico experiente.' },
  { t: 'Instrumentação', d: 'Perto do topo da estaca fixam-se dois pares de sensores: acelerômetros, que medem a velocidade, e extensômetros, que medem a deformação e, com ela, a força. Os cabos vão ao analisador (PDA) e a um computador. A cabeça da estaca recebe um capacete com coxim de madeira, para distribuir o golpe e proteger o concreto.' },
  { t: 'Golpe e onda de tensão', d: 'O martelo cai de uma altura pequena, que aumenta a cada golpe. O impacto gera uma onda de compressão que desce pela estaca à velocidade de cerca de 4.000 m/s (para a animação, a onda foi muito desacelerada). Quando passa por trechos com atrito lateral, parte dela volta; ao chegar à ponta, reflete e sobe até os sensores. O tempo de ida e volta (2L/c) dá o comprimento da estaca; a forma do retorno, a resistência do solo.' },
  { t: 'Sinais de força e de velocidade', d: 'No gráfico, a curva laranja é a força F e a verde é a velocidade multiplicada pela impedância da estaca (Z·v). No começo elas coincidem, porque só existe a onda descendente. Depois, as reflexões das resistências do solo fazem a velocidade cair e a força subir, e a diferença entre as curvas mede a resistência mobilizada. O método Case calcula a capacidade a partir de dois pontos dos sinais, afastados de 2L/c.' },
  { t: 'Capacidade mobilizada', d: 'Cada golpe mobiliza mais resistência: aqui, 930, 1.310 e 1.480 kN. A estaca só mostra sua capacidade total quando o golpe é forte o bastante para fazê-la penetrar (a nega, em milímetros, cresce junto). A análise detalhada (CAPWAP) separa atrito lateral e ponta, e o resultado, cerca de 1.500 kN, concorda com a ruptura da prova de carga estática (G7). Dinâmicos são calibrados com estáticos, sempre que possível.' },
];
export const G8_LABELS = [
  { k: 'topo', t: 'Estaca da obra' }, { k: 'guindaste', t: 'Guindaste com martelo' }, { k: 'martelo', t: 'Martelo (peso em queda)' }, { k: 'capacete', t: 'Capacete com coxim' }, { k: 'sensor', t: 'Acelerômetros e extensômetros' }, { k: 'pda', t: 'Analisador PDA' },
  { k: 'onda', t: 'Onda de compressão' }, { k: 'reflexao', t: 'Reflexão na ponta' }, { k: 'curva', t: 'Força F e velocidade Z·v' }, { k: 'cap', t: 'Capacidade mobilizada' }, { k: 'nega', t: 'Nega (penetração)' }, { k: 'op', t: 'Técnico do PDA' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const G8 = { box: G_BOX };
const P = (t) => Math.exp(-(((t - 1.6) / 0.9) ** 2)), sm = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const Fres = (k, t) => { const Rs = 0.8 * R[k], Rt = 0.2 * R[k], env = Math.exp(-(((t - 4.2) / 2.6) ** 2)), env2 = Math.exp(-(((t - 6.6) / 1.4) ** 2)); return 0.5 * Rs * sm(1.6, 4.5, t) * env * 1.4 + 0.9 * Rt * env2; };
const Fsig = (k, t) => A[k] * P(t) + Fres(k, t), Vsig = (k, t) => A[k] * P(t) - Fres(k, t);
const fmt = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function createG8(engine, section) {
  return createProfile(engine, section, {
    key: 'G8', labels: G8_LABELS, starts: G8_STARTS, END, yb: -14, geo: GEO_G, zo: 38, hide: 'g-inv',
    build(H) {
      const { root, X1, XP } = H;
      const mk = (th, color, ro, em, dx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; m.userData.dx = dx; root.add(m); return m; };
      const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP - (m.userData.dx || 0), (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
      const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP - (m.userData.dx || 0), y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
      const pile = mk(0.9, 0xb9bcc0, 7, 0x222222, 0.006), cap = mk(0.5, 0x3a3d44, 9, 0, 0.012), pad = mk(0.2, 0xc9a66b, 9, 0, 0.012), ram = mk(1.2, 0xe8b300, 10, 0x3a2c00, 0.016), ramB = mk(1.2, 0x2b2d31, 10, 0, 0.018), guide = mk(0.1, 0x6f737a, 9, 0, 0.01), cable = mk(0.05, 0x23303d, 9, 0, 0.012);
      const mast = mk(0.5, 0x6f737a, 8, 0, 0.01), jib = mk(0.3, 0x6f737a, 8, 0, 0.01), crab = mk(0.5, 0xe8742c, 9, 0, 0.012);
      const sA = mk(0.42, 0x2f9bff, 11, 0x103a66, 0.02), sB = mk(0.42, 0xd8332a, 11, 0x3a0a0a, 0.02), wire = mk(0.04, 0x23303d, 10, 0, 0.022), wave = mk(0.55, 0x7fe0ff, 12, 0x2a8ab0, 0.024);
      const ruler = textPanel(1.6, 14.4, 96, 864, X1 - 0.065, -7.2, ZB - 1.9);
      { const g = ruler.g; g.fillStyle = 'rgba(20,24,30,0.55)'; g.fillRect(0, 0, 96, 864); g.fillStyle = '#fff'; g.font = '700 26px "Barlow Semi Condensed", Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
        for (let m = 1; m <= 14; m++) { const yp = m * 60; g.beginPath(); g.moveTo(66, yp); g.lineTo(96, yp); g.stroke(); g.fillText(`${m} m`, 60, yp - 14); } g.font = '700 20px Arial'; g.fillText('prof.', 60, 16); ruler.tx.needsUpdate = true; }
      root.add(ruler.mesh);
      const CW = 14, CH = 7.6, U = 48, ch = textPanel(CW, CH, CW * U, CH * U, X1 - 0.065, -3.9, ZB + 6.6 + CW / 2), CG = ch.g; let lastK = '';
      const drawChart = (k, tms, done) => {
        const key = `${k}|${Math.round(tms * 4)}|${done}`; if (key === lastK) return; lastK = key; const W = CW * U, Hh = CH * U, x0 = 66, x1 = W - 18, y0 = Hh - 70, y1 = 36, X = (t) => x0 + (x1 - x0) * t / 20, Y = (f) => y0 - (y0 - y1) * f / 4000;
        CG.clearRect(0, 0, W, Hh); CG.fillStyle = 'rgba(20,24,30,0.76)'; CG.beginPath(); CG.roundRect(0, 0, W, Hh, 14); CG.fill(); CG.strokeStyle = 'rgba(255,255,255,0.25)'; CG.fillStyle = '#fff'; CG.font = '600 15px Arial'; CG.textAlign = 'right';
        for (const f of [0, 1000, 2000, 3000, 4000]) { CG.fillText(fmt(f), x0 - 8, Y(f) + 5); CG.beginPath(); CG.moveTo(x0, Y(f)); CG.lineTo(x1, Y(f)); CG.stroke(); } CG.textAlign = 'center'; for (const t of [0, 5, 10, 15, 20]) { CG.fillText(`${t}`, X(t), y0 + 20); CG.beginPath(); CG.moveTo(X(t), y1); CG.lineTo(X(t), y0); CG.stroke(); }
        CG.fillStyle = '#9fd2ff'; CG.textAlign = 'left'; CG.font = '600 16px Arial'; CG.fillText('kN', 8, 20); CG.textAlign = 'right'; CG.fillText('tempo (ms)', x1, y0 + 40);
        if (k >= 0) { const tm = Math.min(20, tms), plot = (fn, c) => { CG.strokeStyle = c; CG.lineWidth = 3.5; CG.beginPath(); for (let t = 0; t <= tm; t += 0.1) { const v = fn(k, t); if (t === 0) CG.moveTo(X(t), Y(v)); else CG.lineTo(X(t), Y(v)); } CG.stroke(); }; plot(Fsig, '#ff9a3c'); plot(Vsig, '#6fdc8c');
          const tt = 2 * LP / 4000 * 1000; if (tm >= 1.6 + tt) { CG.strokeStyle = 'rgba(255,255,255,0.7)'; CG.setLineDash([5, 4]); CG.beginPath(); CG.moveTo(X(1.6), y1); CG.lineTo(X(1.6), y0); CG.moveTo(X(1.6 + tt), y1); CG.lineTo(X(1.6 + tt), y0); CG.stroke(); CG.setLineDash([]); CG.fillStyle = '#fff'; CG.textAlign = 'left'; CG.font = '600 15px Arial'; CG.fillText('t1', X(1.6) + 4, y1 + 12); CG.fillText('t1 + 2L/c', X(1.6 + tt) + 4, y1 + 12); } }
        CG.font = '700 16px Arial'; CG.textAlign = 'left'; CG.fillStyle = '#ff9a3c'; CG.fillRect(x0, Hh - 38, 14, 5); CG.fillText('F (força)', x0 + 20, Hh - 32); CG.fillStyle = '#6fdc8c'; CG.fillRect(x0 + 120, Hh - 38, 14, 5); CG.fillText('Z·v', x0 + 140, Hh - 32);
        CG.textAlign = 'right'; for (let i = 0; i < done; i++) { CG.fillStyle = '#fff'; CG.fillText(`golpe ${i + 1}: Rmáx = ${fmt(R[i])} kN`, x1 - 8, y1 + 54 + i * 24); }
        CG.fillStyle = 'rgba(0,0,0,0)'; ch.tx.needsUpdate = true;
      };
      root.add(ch.mesh); drawChart(-1, 0, 0);
      // resultados (tabela, vira texto no canvas do próprio gráfico): reposicionamento do texto acima
      const ped = (c, h) => { const p = person(c, h); p.group.visible = false; root.add(p.group); return p; };
      const nota = ped(0x2f6fd0, 0xffffff), op = ped(0xe8742c, 0xf2b705);
      const table = new THREE.Group(); { const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 2.0), mat(0xc9b48a, { r: 0.9 })); top.position.y = 0.9; table.add(top); for (const dz of [-0.8, 0.8]) for (const dx of [-0.55, 0.55]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat(0x6a4a2c)); l.position.set(dx, 0.45, dz); table.add(l); } const lap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.9), mat(0x23303d)); lap.position.set(0, 1.0, 0); table.add(lap); const scr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.9), mat(0x2f9bff, { e: 0x103a66 })); scr.position.set(0.3, 1.35, 0); scr.rotation.z = -0.2; table.add(scr); }
      table.position.set(X1 + 2.6, 0, ZB + 5.6); table.visible = false; root.add(table);
      const st = { head: TOP, ramY: 3, w: 0, set: 0 };
      return {
        column(z, t, o) { const dz = Math.abs(z - ZB); o.top = 0; const c = new THREE.Color(0x6f9c50); if (t > 2) c.lerp(new THREE.Color(0x8a6a44), 0.5 * ease(win(t, 2, 5)) * clamp01((3 - dz) / 1)); o.topC.copy(c); },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null;
          const wI = ease(win(t, 0, 5)); nota.group.visible = true; nota.group.position.set(X1 + 1.6, 0, t < 5 ? ZB - 18 + 14 * wI : ZB - 4.4); nota.group.rotation.y = t < 5 ? 0 : -Math.PI / 2; nota.upper.rotation.x = 0.12 * Math.sin(tAbs * 1.2);
          op.group.visible = t > 9; op.group.position.set(X1 + 1.6, 0, ZB + 4.0 + 0.0); op.group.rotation.y = -Math.PI / 2; op.upper.rotation.x = 0.35 + 0.05 * Math.sin(tAbs * 2); table.visible = t > 9;
          const kb = t >= T_B0 ? Math.min(NB - 1, Math.floor((t - T_B0) / PB)) : -1, u = kb >= 0 && t < T_RES ? (t - T_B0 - kb * PB) / PB : 0, done = t >= T_RES ? NB : Math.max(0, kb) + (kb >= 0 && u >= 0.88 ? 1 : 0);
          let cumSet = 0; for (let i = 0; i < NB; i++) if (t >= T_B0 + i * PB + 0.4 * PB) cumSet += NEGA[i]; const head = TOP - cumSet * 0.04; st.head = head;
          pile.visible = true; vbar(pile, ZB, head, -LP - cumSet * 0.04);
          // guindaste, martelo, capacete, sensores
          const on = t >= T_SET; [cap, pad, ram, ramB, guide, cable, mast, jib, crab, sA, sB, wire].forEach((m) => (m.visible = on));
          let rh = 0; if (kb >= 0 && t < T_RES) { const H = HB[kb]; rh = u < 0.3 ? H * ease(u / 0.3) : u < 0.4 ? H * (1 - ((u - 0.3) / 0.1) ** 2) : 0; if (u >= 0.4 && u < 0.46) rh = 0; }
          if (on) {
            const asm = ease(win(t, T_SET, T_SET + 8)); const capTop = head + 0.3; hbar(cap, ZB - 0.7, ZB + 0.7, head + 0.15); cap.geometry.dispose(); cap.geometry = new THREE.BoxGeometry(0.02, 0.3, 1); hbar(pad, ZB - 0.6, ZB + 0.6, capTop + 0.1); const ramBot = capTop + 0.2 + rh; vbar(ram, ZB, ramBot, ramBot + 1.2); vbar(ramB, ZB, ramBot, ramBot + 0.25);
            vbar(guide, ZB, capTop + 0.2, 9); hbar(jib, ZB - 0.4, ZB + 3.2, 9.2); vbar(mast, ZB + 3.2, 0, 9.4); hbar(crab, ZB - 0.2, ZB + 0.2, 9.0); vbar(cable, ZB - 0.1, ramBot + 1.2, 9.0);
            vbar(sA, ZB - 0.55, head - 0.8, head - 0.4); vbar(sB, ZB + 0.55, head - 0.8, head - 0.4); hbar(wire, ZB + 0.55, ZB + 4.2, head - 0.6);
            [cap, pad, ram, ramB, guide, cable, mast, jib, crab, sA, sB, wire].forEach((m) => { m.visible = asm > 0.02; });
          }
          st.ramY = head + 0.5 + rh;
          // onda
          let w = 0, wOn = false, down = true; if (kb >= 0 && t < T_RES) { if (u >= 0.4 && u < 0.58) { wOn = true; w = (u - 0.4) / 0.18; } else if (u >= 0.58 && u < 0.76) { wOn = true; w = 1 - (u - 0.58) / 0.18; down = false; } }
          wave.visible = wOn; if (wOn) { const wy = head - 0.4 - w * (LP + 0.6); vbar(wave, ZB, wy - 0.4, wy + 0.4); wave.material.color.set(down ? 0x7fe0ff : 0xffb36b); wave.material.emissive.set(down ? 0x2a8ab0 : 0xa8501a); } st.w = w;
          // gráfico
          const tms = kb >= 0 && t < T_RES && u >= 0.4 ? Math.min(20, ((u - 0.4) / 0.45) * 20) : (t >= T_RES ? 20 : 0), kShow = t >= T_RES ? NB - 1 : kb;
          ruler.mesh.visible = ch.mesh.visible = t >= T_B0 - 4; drawChart(u >= 0.4 || t >= T_RES ? kShow : -1, tms, done);
          if (t < 5) { note = 'O técnico chega à estaca da obra'; label = 'topo'; } else if (t < T_SET) { note = 'Conferindo cotas e cabeça da estaca'; label = 'topo'; }
          else if (t < 14) { note = 'O guindaste posiciona o martelo sobre a estaca'; label = 'guindaste'; } else if (t < 17) { note = 'Colocando o capacete com coxim na cabeça da estaca'; label = 'capacete'; } else if (t < T_B0) { note = 'Fixando os sensores e ligando-os ao analisador PDA'; label = t < 18.5 ? 'sensor' : 'pda'; }
          else if (t < T_RES) { const g = kb + 1;
            if (u < 0.3) { note = `Golpe ${g} de ${NB}: levantando o martelo a ${(HB[kb] * 0.5 + 0.1).toFixed(1).replace('.', ',')} m de altura`; label = 'martelo'; }
            else if (u < 0.4) { note = `Golpe ${g}: o martelo cai sobre o capacete`; label = 'martelo'; }
            else if (u < 0.58) { note = `Golpe ${g}: a onda de compressão desce pela estaca`; label = 'onda'; }
            else if (u < 0.76) { note = `Golpe ${g}: a onda reflete na ponta e volta aos sensores`; label = 'reflexao'; }
            else if (u < 0.88) { note = `Golpe ${g}: F e Z·v registradas nos sensores`; label = 'curva'; }
            else { note = `Golpe ${g}: capacidade mobilizada Rmáx = ${fmt(R[kb])} kN · nega ${NEGA[kb]} mm`; label = u < 0.95 ? 'cap' : 'nega'; } }
          else { note = 'Capacidade mobilizada ≈ 1.480 kN: confere com a prova de carga estática (G7)'; label = 'cap'; }
          c.note = note; c.label = label; void tAbs;
        },
        idle: (t) => (t < T_SET ? 'Estaca da obra' : t < T_B0 ? 'Montagem do ensaio' : 'Ensaio dinâmico'),
        anchors(a) {
          const hd = st.head; a.topo.set(X1 + 1.3, hd + 0.8, ZB); a.guindaste.set(XP, 9.6, ZB + 1.6); a.martelo.set(XP, st.ramY + 1.0, ZB - 0.4); a.capacete.set(XP, hd + 0.5, ZB + 0.9); a.sensor.set(XP, hd - 0.6, ZB - 0.8); a.pda.set(X1 + 2.6, 2.3, ZB + 5.6);
          a.onda.set(XP, hd - 0.4 - st.w * (LP + 0.6) - 0.3, ZB + 1.0); a.reflexao.set(XP, hd - 0.4 - st.w * (LP + 0.6), ZB + 1.0); a.curva.set(XP, -2.0, ZB + 15); a.cap.set(XP, -4.5, ZB + 15); a.nega.set(XP, hd + 0.2, ZB - 1.0); a.op.set(X1 + 1.6, 2.3, ZB + 4.0); a.solo.set(X1, -16, ZB);
        },
        vis: {
          topo: (t) => t < T_SET, guindaste: (t) => t >= T_SET && t < 14, capacete: (t) => t >= 14 && t < 17, sensor: (t) => t >= 17 && t < 18.5, pda: (t) => t >= 18.5 && t < T_B0 + 2, martelo: (t) => { const k = Math.floor((t - T_B0) / PB), u = (t - T_B0) / PB - k; return t >= T_B0 && t < T_RES && u < 0.4; },
          onda: (t) => { const k = Math.floor((t - T_B0) / PB), u = (t - T_B0) / PB - k; return t >= T_B0 && t < T_RES && u >= 0.4 && u < 0.58; }, reflexao: (t) => { const k = Math.floor((t - T_B0) / PB), u = (t - T_B0) / PB - k; return t >= T_B0 && t < T_RES && u >= 0.58 && u < 0.76; },
          curva: (t) => { const k = Math.floor((t - T_B0) / PB), u = (t - T_B0) / PB - k; return t >= T_B0 && t < T_RES && u >= 0.76 && u < 0.88; }, cap: (t) => { const k = Math.floor((t - T_B0) / PB), u = (t - T_B0) / PB - k; return (t >= T_B0 && t < T_RES && u >= 0.88 && u < 0.95) || t >= T_RES; }, nega: (t) => { const k = Math.floor((t - T_B0) / PB), u = (t - T_B0) / PB - k; return t >= T_B0 && t < T_RES && u >= 0.95; }, op: (t) => t > 10 && t < 13,
        },
      };
    },
  });
}
