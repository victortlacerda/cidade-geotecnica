import * as THREE from 'three';
import { createProfile, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { X1G, ZB, GEO_G, G_BOX, textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// G9 — Ensaio de integridade (PIT, de Pile Integrity Test). Um martelo manual leve bate na cabeça da estaca; um acelerômetro registra
// a onda refletida. Mudanças de seção ou de qualidade do concreto aparecem como reflexões no gráfico (reflectograma). Duas estacas:
// uma íntegra e uma com estrangulamento a 4 m de profundidade.
// ---------------------------------------------------------------------------
export const G9_CAM = { tx: X1G, ty: -3.2, tz: 36, yaw: -1.3, pitch: 0.2, dist: 56 };
export const G9_MCAM = { tx: X1G, ty: -3.2, tz: 36, yaw: -1.3, pitch: 0.2, dist: 104 };
const LP = 10, ZA = ZB - 2.6, ZD = ZB + 3.0, T_SET = 7, T_A = 16, PB = 22, T_B = T_A + PB, T_RES = T_B + PB, END = T_RES + 14, NECK0 = 3.4, NECK1 = 4.6;
export const G9_STARTS = [0, T_SET, T_A, T_B, T_RES];
export const G9_STEPS = [
  { t: 'Locação', d: 'A equipe chega ao bloco de estacas já executadas. O ensaio de integridade (PIT, Pile Integrity Test) é um teste de baixa deformação: não carrega a estaca, só a escuta. Por isso é rápido, barato e feito em todas as estacas de uma obra, ou em boa parte delas, para descobrir se alguma tem defeito, como trinca, contaminação do concreto ou estrangulamento, que o ensaio de carga não alcançaria.' },
  { t: 'Preparo da cabeça e do sensor', d: 'A cabeça da estaca é limpa e nivelada, sem concreto fraco ou sujo, e nela se fixa com cera ou massa um acelerômetro, ligado por cabo ao analisador. Quanto mais limpa e plana a cabeça, melhor o sinal; é o passo mais importante do ensaio.' },
  { t: 'Golpe leve e onda refletida (estaca íntegra)', d: 'Um técnico bate na cabeça com um martelo pequeno, de mão. A onda de compressão desce pela estaca e, ao encontrar o pé, reflete e volta ao sensor. Numa estaca íntegra, o gráfico (reflectograma) mostra o golpe no início, uma linha calma e uma reflexão clara no pé, na profundidade esperada, que confirma o comprimento da estaca e a sua continuidade.' },
  { t: 'Estaca com defeito', d: 'Na segunda estaca, o concreto sofreu estrangulamento a cerca de 4 m: a seção diminui, a impedância cai, e a onda reflete de sinal contrário. O gráfico mostra uma reflexão negativa nessa profundidade, e a reflexão do pé aparece menor, porque parte da energia já voltou. A profundidade do defeito vem do tempo entre o golpe e a reflexão: x = c · t / 2.' },
  { t: 'Interpretação', d: 'Comparando os gráficos: a estaca íntegra mostra só a reflexão do pé; a outra tem uma reflexão negativa a 4 m, indicando redução de seção. O ensaio indica onde há anomalia, mas não diz exatamente o que ela é, nem a sua gravidade. Decide-se a partir dele: aceitar a estaca, ensaiar de novo (prova de carga, sonda ou escavação) ou reforçar a fundação.' },
];
export const G9_LABELS = [
  { k: 'topo', t: 'Estacas da obra' }, { k: 'cabeca', t: 'Cabeça limpa e nivelada' }, { k: 'sensor', t: 'Acelerômetro' }, { k: 'pit', t: 'Analisador PIT' }, { k: 'martelo', t: 'Martelo manual leve' }, { k: 'onda', t: 'Onda de compressão' }, { k: 'reflexao', t: 'Reflexão' },
  { k: 'defeito', t: 'Estrangulamento (seção reduzida)' }, { k: 'ponta', t: 'Reflexão do pé da estaca' }, { k: 'curva', t: 'Reflectograma' }, { k: 'ok', t: 'Estaca íntegra' }, { k: 'ruim', t: 'Estaca com defeito' }, { k: 'op', t: 'Técnico' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const G9 = { box: G_BOX };
const g = (d, d0, sg) => Math.exp(-(((d - d0) / sg) ** 2));
const sig = (k, d) => 1.0 * g(d, 0.0, 0.35) - 0.25 * g(d, 0.8, 0.5) + 0.04 * Math.sin(d * 19) + (k === 0 ? 0.62 * g(d, LP, 0.38) : -0.55 * g(d, 3.9, 0.32) + 0.14 * g(d, 4.8, 0.5) + 0.26 * g(d, LP, 0.38));

export function createG9(engine, section) {
  return createProfile(engine, section, {
    key: 'G9', labels: G9_LABELS, starts: G9_STARTS, END, yb: -14, geo: GEO_G, zo: 38, hide: 'g-inv',
    build(H) {
      const { root, X1, XP } = H;
      const mk = (th, color, ro, em, dx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; m.userData.dx = dx; root.add(m); return m; };
      const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP - (m.userData.dx || 0), (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
      const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP - (m.userData.dx || 0), y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
      const pA = mk(0.9, 0xb9bcc0, 7, 0x222222, 0.006), pB1 = mk(0.9, 0xb9bcc0, 7, 0x222222, 0.006), pB2 = mk(0.45, 0xc9928a, 7, 0x331a16, 0.006), pB3 = mk(0.9, 0xb9bcc0, 7, 0x222222, 0.006);
      const sensA = mk(0.4, 0x2f9bff, 11, 0x103a66, 0.02), sensB = mk(0.4, 0x2f9bff, 11, 0x103a66, 0.02), hamH = mk(0.16, 0x6a4a22, 10, 0, 0.018), hamM = mk(0.5, 0x2b2d31, 11, 0, 0.02), wire = mk(0.04, 0x23303d, 10, 0, 0.022), wave = mk(0.5, 0x7fe0ff, 12, 0x2a8ab0, 0.024);
      const mkLine = mk(0.06, 0xff7a6a, 10, 0x551111, 0.02);
      const ruler = textPanel(1.6, 14.4, 96, 864, X1 - 0.065, -7.2, ZA - 1.9);
      { const gx = ruler.g; gx.fillStyle = 'rgba(20,24,30,0.55)'; gx.fillRect(0, 0, 96, 864); gx.fillStyle = '#fff'; gx.font = '700 26px "Barlow Semi Condensed", Arial, sans-serif'; gx.textAlign = 'right'; gx.textBaseline = 'middle'; gx.strokeStyle = 'rgba(255,255,255,0.7)'; gx.lineWidth = 2;
        for (let m = 1; m <= 14; m++) { const yp = m * 60; gx.beginPath(); gx.moveTo(66, yp); gx.lineTo(96, yp); gx.stroke(); gx.fillText(`${m} m`, 60, yp - 14); } gx.font = '700 20px Arial'; gx.fillText('prof.', 60, 16); ruler.tx.needsUpdate = true; }
      root.add(ruler.mesh);
      const CW = 14, CH = 7.2, U = 48, ch = textPanel(CW, CH, CW * U, CH * U, X1 - 0.065, -3.9, ZB + 8.4 + CW / 2), CG = ch.g; let lastK = '';
      const drawChart = (k, dm, done) => {
        const key = `${k}|${Math.round(dm * 5)}|${done}`; if (key === lastK) return; lastK = key; const W = CW * U, Hh = CH * U, x0 = 60, x1 = W - 18, yc = Hh / 2 + 4, ya = (Hh - 90) / 2, X = (d) => x0 + (x1 - x0) * d / 12, Y = (v) => yc - ya * v / 1.2;
        CG.clearRect(0, 0, W, Hh); CG.fillStyle = 'rgba(20,24,30,0.76)'; CG.beginPath(); CG.roundRect(0, 0, W, Hh, 14); CG.fill(); CG.strokeStyle = 'rgba(255,255,255,0.25)'; CG.fillStyle = '#fff'; CG.font = '600 15px Arial'; CG.textAlign = 'center';
        for (const d of [0, 2, 4, 6, 8, 10, 12]) { CG.fillText(`${d}`, X(d), Hh - 34); CG.beginPath(); CG.moveTo(X(d), 30); CG.lineTo(X(d), Hh - 50); CG.stroke(); } CG.strokeStyle = 'rgba(255,255,255,0.5)'; CG.beginPath(); CG.moveTo(x0, yc); CG.lineTo(x1, yc); CG.stroke();
        CG.fillStyle = '#9fd2ff'; CG.textAlign = 'right'; CG.font = '600 16px Arial'; CG.fillText('profundidade equivalente (m) = c · t / 2', x1, Hh - 10); CG.textAlign = 'left'; CG.fillText('velocidade (u.a.)', 8, 20);
        if (k === 1) { CG.strokeStyle = 'rgba(111,220,140,0.55)'; CG.lineWidth = 2; CG.setLineDash([6, 5]); CG.beginPath(); for (let d = 0; d <= 12; d += 0.04) { const v = Math.max(-1.1, Math.min(1.1, sig(0, d))); if (d === 0) CG.moveTo(X(d), Y(v)); else CG.lineTo(X(d), Y(v)); } CG.stroke(); CG.setLineDash([]); }
        if (k >= 0) { CG.strokeStyle = k === 0 ? '#6fdc8c' : '#ffb347'; CG.lineWidth = 3.5; CG.beginPath(); for (let d = 0; d <= Math.min(12, dm); d += 0.04) { const v = Math.max(-1.1, Math.min(1.1, sig(k, d))); if (d === 0) CG.moveTo(X(d), Y(v)); else CG.lineTo(X(d), Y(v)); } CG.stroke();
          if (dm >= 10 && done > k) { CG.fillStyle = '#fff'; CG.font = '700 17px Arial'; CG.textAlign = 'center'; CG.fillText('pé', X(LP), Y(sig(k, LP)) - 12); if (k === 1) { CG.fillStyle = '#ff7a6a'; CG.fillText('defeito a 4 m', X(3.9), Y(sig(k, 3.9)) + 26); } } }
        CG.textAlign = 'right'; CG.font = '700 16px Arial'; for (let i = 0; i < done; i++) { CG.fillStyle = i === 0 ? '#6fdc8c' : '#ffb347'; CG.fillText(i === 0 ? 'estaca 1: íntegra' : 'estaca 2: estrangulamento a 4 m', x1 - 8, 34 + i * 24); }
        ch.tx.needsUpdate = true;
      };
      root.add(ch.mesh); drawChart(-1, 0, 0);
      const ped = (c, h) => { const p = person(c, h); p.group.visible = false; root.add(p.group); return p; };
      const nota = ped(0x2f6fd0, 0xffffff), op = ped(0xe8742c, 0xf2b705);
      const table = new THREE.Group(); { const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 2.0), mat(0xc9b48a, { r: 0.9 })); top.position.y = 0.9; table.add(top); for (const dz of [-0.8, 0.8]) for (const dx of [-0.55, 0.55]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat(0x6a4a2c)); l.position.set(dx, 0.45, dz); table.add(l); } const lap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.9), mat(0x23303d)); lap.position.set(0, 1.0, 0); table.add(lap); const scr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.9), mat(0x2f9bff, { e: 0x103a66 })); scr.position.set(0.3, 1.35, 0); scr.rotation.z = -0.2; table.add(scr); }
      table.position.set(X1 + 2.6, 0, ZB + 8.0); table.visible = false; root.add(table);
      const st = { w: 0, zc: ZA };
      return {
        column(z, t, o) { o.top = 0; const c = new THREE.Color(0x6f9c50); if (t > 2) { const dz = Math.min(Math.abs(z - ZA), Math.abs(z - ZD)); c.lerp(new THREE.Color(0x8a6a44), 0.5 * ease(win(t, 2, 5)) * clamp01((2.5 - dz) / 1)); } o.topC.copy(c); },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null;
          const wI = ease(win(t, 0, 5)); nota.group.visible = true; nota.group.position.set(X1 + 1.6, 0, t < 5 ? ZA - 16 + 13 * wI : ZA - 3.4); nota.group.rotation.y = t < 5 ? 0 : -Math.PI / 2; nota.upper.rotation.x = 0.12 * Math.sin(tAbs * 1.2);
          const kb = t >= T_A ? (t >= T_B ? 1 : 0) : -1, t0 = kb === 1 ? T_B : T_A, u = t >= T_A && t < T_RES ? (t - t0) / PB : 0, zc = kb === 1 ? ZD : ZA; st.zc = zc;
          op.group.visible = t > 9; table.visible = t > 9; op.group.position.set(X1 + 1.6, 0, t < T_B ? ZA + 0.8 + (ZD - ZA) * 0 : ZD + 0.8 + 0.0 * zc); op.group.position.z = (t < T_B ? ZA : ZD) + 1.9 * 0 + 0.0; op.group.position.z = (t < T_B ? ZA : ZD) - (t < T_B ? 0.0 : 0.0) + 1.9; op.group.rotation.y = -Math.PI / 2;
          // estacas
          vbar(pA, ZA, 0.2, -LP); vbar(pB1, ZD, 0.2, -NECK0); vbar(pB2, ZD, -NECK0, -NECK1); vbar(pB3, ZD, -NECK1, -LP); [pA, pB1, pB2, pB3].forEach((m) => (m.visible = true));
          const clean = ease(win(t, T_SET, T_SET + 5)), on = t >= T_SET;
          [sensA, sensB, hamH, hamM, wire].forEach((m) => (m.visible = on)); mkLine.visible = false;
          if (on) { const sA_ = clean; vbar(sensA, ZA - 0.5, 0.05, 0.4); vbar(sensB, ZD - 0.5, 0.05, 0.4); hbar(wire, (t < T_B ? ZA : ZD) - 0.5, (t < T_B ? ZA : ZD) + 6.6 + (t < T_B ? 0 : 0) - 2.2, 0.2); [sensA, sensB].forEach((m) => (m.visible = sA_ > 0.02)); wire.visible = sA_ > 0.02;
            // martelo
            let hy = 1.2; if (kb >= 0 && t < T_RES) { hy = u < 0.3 ? 0.35 + 1.4 * ease(u / 0.3) : u < 0.4 ? 0.35 + 1.4 * (1 - ((u - 0.3) / 0.1) ** 2) : 0.35; } const hz = zc + 0.1; vbar(hamH, hz, hy + 0.1, hy + 1.6); hbar(hamM, hz - 0.35, hz + 0.35, hy + 0.1); hamM.scale.y = 1; hamH.visible = hamM.visible = t >= T_A - 3 && t < T_RES; }
          // onda
          let w = 0, wOn = false, down = true; if (kb >= 0 && t < T_RES) { if (u >= 0.4 && u < 0.58) { wOn = true; w = (u - 0.4) / 0.18; } else if (u >= 0.58 && u < 0.76) { wOn = true; w = 1 - (u - 0.58) / 0.18; down = false; } }
          wave.visible = wOn; if (wOn) { const wy = 0.2 - w * (LP + 0.3); vbar(wave, zc, wy - 0.4, wy + 0.4); wave.material.color.set(down ? 0x7fe0ff : 0xffb36b); wave.material.emissive.set(down ? 0x2a8ab0 : 0xa8501a); } st.w = w;
          const dm = kb >= 0 && t < T_RES && u >= 0.4 ? Math.min(12, ((u - 0.4) / 0.4) * 12) : t >= T_RES ? 12 : 0; const done = t >= T_RES ? 2 : (kb === 1 && u >= 0.8 ? 2 : kb === 0 && u >= 0.8 ? 1 : (kb === 1 ? 1 : 0));
          ruler.mesh.visible = ch.mesh.visible = t >= T_A - 3; drawChart(t >= T_RES ? 1 : (kb >= 0 && u >= 0.4 ? kb : -1), dm, done);
          if (t < 5) { note = 'A equipe chega ao bloco de estacas'; label = 'topo'; } else if (t < T_SET) { note = 'Conferindo as estacas a ensaiar'; label = 'topo'; }
          else if (t < 12) { note = 'Limpando e nivelando a cabeça das estacas'; label = 'cabeca'; } else if (t < T_A - 1) { note = 'Fixando o acelerômetro e ligando o analisador PIT'; label = t < 14 ? 'sensor' : 'pit'; }
          else if (t < T_RES) { const nome = kb === 0 ? 'Estaca 1 (íntegra)' : 'Estaca 2';
            if (u < 0.3) { note = `${nome}: levantando o martelo manual`; label = 'martelo'; } else if (u < 0.4) { note = `${nome}: golpe leve na cabeça`; label = 'martelo'; }
            else if (u < 0.58) { note = `${nome}: a onda de compressão desce pela estaca`; label = kb === 1 && w > 0.3 && w < 0.5 ? 'defeito' : 'onda'; } else if (u < 0.76) { note = `${nome}: a onda reflete e sobe ao sensor`; label = 'reflexao'; }
            else if (u < 0.9) { note = kb === 0 ? `${nome}: só a reflexão do pé, a 10 m` : `${nome}: reflexão negativa a 4 m, estrangulamento`; label = kb === 0 ? 'ponta' : 'defeito'; } else { note = kb === 0 ? 'Estaca 1: íntegra, o pé aparece onde esperado' : 'Estaca 2: seção reduzida a 4 m'; label = kb === 0 ? 'ok' : 'ruim'; } }
          else { note = 'Estaca 1 íntegra · estaca 2 com defeito: decidir pela aceitação, nova prova ou reforço'; label = t < T_RES + 7 ? 'curva' : 'ruim'; }
          c.note = note; c.label = label;
        },
        idle: (t) => (t < T_SET ? 'Estacas da obra' : t < T_A ? 'Preparação do ensaio' : 'Ensaio de integridade'),
        anchors(a) {
          const zc = st.zc; a.topo.set(XP, 1.4, ZA + 1.3); a.cabeca.set(XP, 0.6, ZA - 0.8); a.sensor.set(XP, 0.9, zc - 0.6); a.pit.set(X1 + 2.6, 2.3, ZB + 8.0); a.martelo.set(XP, 2.7, zc + 0.5); a.onda.set(XP, 0.2 - st.w * (LP + 0.3) - 0.2, zc + 0.9); a.reflexao.set(XP, 0.2 - st.w * (LP + 0.3), zc + 0.9);
          a.defeito.set(XP, -4.0, ZD + 0.9); a.ponta.set(XP, -LP, ZA + 0.9); a.curva.set(XP, -2.0, ZB + 15); a.ok.set(XP, -5, ZA + 0.9); a.ruim.set(XP, -4.0, ZD + 0.9); a.op.set(X1 + 1.6, 2.3, (st.zc) + 1.9); a.solo.set(X1, -16, ZB);
        },
        vis: {
          topo: (t) => t < T_SET, cabeca: (t) => t >= T_SET && t < 12, sensor: (t) => t >= 12 && t < 14, pit: (t) => t >= 14 && t < T_A, martelo: (t) => { if (t < T_A || t >= T_RES) return false; const k = t >= T_B ? 1 : 0, u = (t - (k ? T_B : T_A)) / PB; return u < 0.4; },
          onda: (t) => { if (t < T_A || t >= T_RES) return false; const u = (t - (t >= T_B ? T_B : T_A)) / PB; return u >= 0.4 && u < 0.58; }, reflexao: (t) => { if (t < T_A || t >= T_RES) return false; const u = (t - (t >= T_B ? T_B : T_A)) / PB; return u >= 0.58 && u < 0.76; },
          defeito: (t) => t >= T_B + 0.45 * PB && t < T_RES - 0.1 * PB && (t - T_B) / PB >= 0.4 && ((t - T_B) / PB < 0.58 ? (t - T_B) / PB > 0.46 : (t - T_B) / PB >= 0.76), ponta: (t) => t >= T_A + 0.76 * PB && t < T_A + 0.9 * PB, ok: (t) => t >= T_A + 0.9 * PB && t < T_B, ruim: (t) => (t >= T_B + 0.9 * PB && t < T_RES) || t >= T_RES + 7, curva: (t) => t >= T_RES && t < T_RES + 7, op: (t) => t > 10 && t < 13,
        },
      };
    },
  });
}
