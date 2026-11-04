import * as THREE from 'three';
import { createProfile, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { bounds } from '../scene/terrain.js';
import { X1G, ZB, GEO_G, G_BOX, textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// G11 — Piezômetro de tubo aberto. Furo até 11 m, tubo de PVC com trecho filtrante no fundo, filtro de areia, selo de bentonita
// e proteção na boca. A leitura é feita com medidor de nível (sonda sonora); as leituras de um ano formam o gráfico de nível d'água.
// ---------------------------------------------------------------------------
export const G11_CAM = { tx: X1G, ty: -3.4, tz: 40, yaw: -1.3, pitch: 0.2, dist: 56 };
export const G11_MCAM = { tx: X1G, ty: -3.4, tz: 40, yaw: -1.3, pitch: 0.2, dist: 104 };
const END = 134, TD = 8, TH = 24, TT = 50, TR = 58, TM0 = 72, TM1 = 108, TU = 112, DEP = 11;
export const G11_STARTS = [0, TD, TH, TR, TM0, TU];
export const G11_STEPS = [
  { t: 'Locação e furo', d: 'O topógrafo marca o ponto e a equipe abre um furo de 11 m com trado e lavagem. Piezômetros medem a pressão da água nos poros do solo, o que o peso da terra sozinho não mostra. O mais simples é o piezômetro de tubo aberto (tipo Casagrande): um tubo com um trecho filtrante no fundo, que deixa a água entrar e impede a entrada do solo.' },
  { t: 'Instalação', d: 'Desce-se o tubo de PVC com o trecho filtrante no fundo, preenche-se esse trecho com areia (o filtro) e sela-se acima dele com bentonita, uma argila que incha com a água e impede que a água de cima desça pelo furo. Assim o piezômetro mede só a pressão da camada onde está o filtro. O restante do furo é preenchido e a boca recebe uma tampa de proteção.' },
  { t: 'Leitura do nível d\'água', d: 'O técnico desce pelo tubo um cabo graduado com uma sonda sonora na ponta. Quando a sonda toca a água, o aparelho apita, e a marca no cabo dá a profundidade do nível d\'água. Aqui, a leitura inicial é de 9,6 m.' },
  { t: 'Monitoramento ao longo do ano', d: 'As leituras se repetem todos os meses, e o nível sobe nas épocas de chuva e desce na seca, com um atraso: a água demora para infiltrar. O gráfico de nível d\'água x tempo, junto com a chuva, mostra como o terreno responde, e é fundamental para barragens, taludes, escavações e rebaixamento.' },
  { t: 'Poropressão', d: 'Abaixo do nível d\'água, a poropressão é u = γw · h: cresce com a profundidade (cerca de 10 kPa por metro). Subtraindo-a da tensão total, obtém-se a tensão efetiva, que controla a resistência e a deformação do solo. Por isso uma subida do nível d\'água pode diminuir a segurança de um talude ou de uma contenção.' },
];
export const G11_LABELS = [
  { k: 'topo', t: 'Estaca de locação' }, { k: 'trado', t: 'Trado e lavagem' }, { k: 'tubo', t: 'Tubo de PVC' }, { k: 'filtro', t: 'Trecho filtrante com areia' }, { k: 'bentonita', t: 'Selo de bentonita' }, { k: 'tampa', t: 'Proteção na boca' },
  { k: 'sonda', t: 'Medidor de nível (sonda sonora)' }, { k: 'na', t: 'Nível d\'água' }, { k: 'grafico', t: 'Nível d\'água x tempo' }, { k: 'chuva', t: 'Chuva mensal' }, { k: 'pressao', t: 'Poropressão u = γw · h' }, { k: 'op', t: 'Técnico' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const G11 = { box: G_BOX };
const RAIN = [90, 130, 190, 210, 170, 110, 40, 20, 15, 30, 60, 100], NAM = [9.6, 9.0, 8.5, 8.3, 8.8, 9.4, 9.9, 10.3, 10.4, 10.1, 9.8, 9.6], MES = ['out', 'nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set'];
const naAt = (m) => { const i = Math.min(11, Math.floor(m)), j = Math.min(11, i + 1), f = m - i; return NAM[i] * (1 - f) + NAM[j] * f; };

export function createG11(engine, section) {
  return createProfile(engine, section, {
    key: 'G11', labels: G11_LABELS, starts: G11_STARTS, END, yb: -14, geo: GEO_G, zo: 38, hide: 'g-inv',
    build(H) {
      const { root, stake, X1, XP } = H;
      const B = bounds(X1, ZB), tmp = new THREE.Color();
      const mk = (th, color, ro, em) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; root.add(m); return m; };
      const vbar = (m, z, y0, y1) => { m.rotation.set(0, 0, 0); m.rotation.x = -Math.PI / 2; m.position.set(XP - (m.userData.dx || 0), (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
      const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP, y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
      const holeM = mk(1.0, 0x1d1510, 5), augM = mk(0.14, 0x9b6a2f, 8), bitM = mk(0.45, 0x7a5a2c, 9), handle = mk(0.12, 0x6a4a22, 9);
      const fillB = mk(1.0, 0x8a6a44, 6), seal = mk(1.0, 0x4a4f57, 7), sand = mk(1.0, 0xe8c45a, 7), tube = mk(0.3, 0xf4f1ea, 8, 0x222222), screen = mk(0.45, 0x2f9bff, 9, 0x103a66), cap = mk(0.7, 0x6f737a, 9), capTop = mk(0.8, 0x2b2d31, 9);
      const wTube = mk(0.1, 0x3d9bff, 9, 0x103a66), cable = mk(0.05, 0x23303d, 9), probe = mk(0.2, 0xe8b300, 10, 0x553d00), naLine = mk(0.07, 0x2f9bff, 6, 0x103a66), naTick = mk(0.25, 0x2f9bff, 10, 0x103a66);
      tube.userData.dx = 0.012; screen.userData.dx = 0.014; wTube.userData.dx = 0.016; cap.userData.dx = 0.012; sand.userData.dx = 0.004; seal.userData.dx = 0.004; cable.userData.dx = 0.02; probe.userData.dx = 0.022;
      const ruler = textPanel(1.6, 14.4, 96, 864, X1 - 0.065, -7.2, ZB - 1.4);
      { const g = ruler.g; g.fillStyle = 'rgba(20,24,30,0.55)'; g.fillRect(0, 0, 96, 864); g.fillStyle = '#fff'; g.font = '700 26px "Barlow Semi Condensed", Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
        for (let m = 1; m <= 14; m++) { const yp = m * 60; g.beginPath(); g.moveTo(66, yp); g.lineTo(96, yp); g.stroke(); g.fillText(`${m} m`, 60, yp - 14); } g.font = '700 20px Arial'; g.fillText('prof.', 60, 16); ruler.tx.needsUpdate = true; }
      root.add(ruler.mesh);
      // gráfico (canvas dinâmico): chuva (barras, acima) e nível d'água (linha, abaixo), um ano
      const CW = 26, CH = 12, PXU = 40, cz = ZB + 4.2 + CW / 2, chart = textPanel(CW, CH, CW * PXU, CH * PXU, X1 - 0.065, -7.0, cz); const CG = chart.g; let lastQ = -1;
      const drawChart = (m) => {
        const q = Math.floor(m * 4); if (q === lastQ) return; lastQ = q; const W = CW * PXU, Hh = CH * PXU; CG.clearRect(0, 0, W, Hh); CG.fillStyle = 'rgba(20,24,30,0.72)'; CG.beginPath(); CG.roundRect(0, 0, W, Hh, 14); CG.fill();
        const x0 = 70, x1 = W - 20, bw = (x1 - x0) / 12; CG.strokeStyle = 'rgba(255,255,255,0.25)'; CG.lineWidth = 1; CG.fillStyle = '#fff'; CG.font = '600 20px Arial'; CG.textAlign = 'center';
        for (let i = 0; i < 12; i++) { CG.fillText(MES[i], x0 + (i + 0.5) * bw, Hh - 10); }
        // chuva
        CG.textAlign = 'right'; CG.font = '600 18px Arial'; CG.fillStyle = '#9fd2ff'; CG.fillText('chuva (mm)', 188, 26); CG.fillStyle = '#fff'; for (const v of [0, 100, 200]) { const yy = 190 - v / 200 * 130; CG.fillText(String(v), x0 - 8, yy + 5); CG.beginPath(); CG.moveTo(x0, yy); CG.lineTo(x1, yy); CG.stroke(); }
        for (let i = 0; i < 12; i++) { const f = clamp01(m - i); if (f <= 0) break; CG.fillStyle = '#4aa3e0'; CG.fillRect(x0 + i * bw + 6, 190 - RAIN[i] / 200 * 130 * f, bw - 12, RAIN[i] / 200 * 130 * f); }
        // nível d'água (profundidade, eixo invertido)
        const yN = (d) => 250 + (d - 8) / 3 * 190; CG.fillStyle = '#ffd37a'; CG.textAlign = 'right'; CG.font = '600 18px Arial'; CG.fillText('nível d\'água (m)', 188, 232); CG.fillStyle = '#fff';
        for (const d of [8, 9, 10, 11]) { CG.fillText(String(d), x0 - 8, yN(d) + 5); CG.beginPath(); CG.moveTo(x0, yN(d)); CG.lineTo(x1, yN(d)); CG.stroke(); }
        CG.strokeStyle = '#2f9bff'; CG.lineWidth = 4; CG.beginPath(); const n = Math.floor(m * 6); for (let i = 0; i <= n; i++) { const mm = i / 6, xx = x0 + mm * bw; if (i === 0) CG.moveTo(xx, yN(naAt(mm))); else CG.lineTo(xx, yN(naAt(mm))); } CG.stroke();
        if (m > 0) { CG.fillStyle = '#2f9bff'; CG.beginPath(); CG.arc(x0 + m * bw, yN(naAt(m)), 7, 0, 7); CG.fill(); } chart.tx.needsUpdate = true;
      };
      root.add(chart.mesh); drawChart(0);
      // diagrama de poropressão
      const PRB = Array.from({ length: 14 }, () => mk(0.22, 0x2f9bff, 7, 0x103a66));
      const ped = (c, h) => { const p = person(c, h); p.group.visible = false; root.add(p.group); return p; };
      const nota = ped(0x2f6fd0, 0xffffff), op = ped(0xe8742c, 0xf2b705); const stk = stake(X1 + 1.3, ZB, 0);
      const boxMound = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), mat(0x8a6a44)); boxMound.visible = false; root.add(boxMound);
      const meter = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), mat(0x23303d)); meter.visible = false; root.add(meter);
      const st = { na: 9.6, probe: 0 };
      return {
        column(z, t, o) { const dz = Math.abs(z - ZB); o.top = 0; const c = new THREE.Color(0x6f9c50); if (t > 3 && dz < 2.0) c.lerp(new THREE.Color(0x8a6a44), 0.6 * ease(win(t, 3, 6))); o.topC.copy(c); },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null; void tmp; void B;
          const wI = ease(win(t, 0, 5)); nota.group.visible = true; nota.group.position.set(X1 + 1.6, 0, t < 5 ? ZB - 18 + 17 * wI : t < 8 ? ZB - 1 : ZB + 3.4); nota.group.rotation.y = t < 8 ? 0 : -Math.PI / 2; nota.upper.rotation.x = t >= 5 && t < 7 ? 0.5 + 0.2 * Math.sin(tAbs * 5) : 0.15 * Math.sin(tAbs * 1.2);
          stk.visible = t > 5.5 && t < TD + 6; stk.scale.setScalar(ease(win(t, 5.5, 7)) + 0.001); stk.position.set(X1 + 1.3, 0, ZB);
          op.group.visible = t > 6; op.group.position.set(X1 + 1.6, 0, ZB - 20 + 17.6 * ease(win(t, 6, 10))); op.group.rotation.y = t < 10 ? 0 : -Math.PI / 2;
          if (t < TD) { note = t < 5 ? 'O topógrafo chega ao ponto do piezômetro' : t < 7 ? 'Cravando a estaca de locação' : 'O técnico chega com o trado'; label = t < 7 ? 'topo' : null; }
          // furo
          const hd = DEP * ease(win(t, TD, TH - 2)), drilling = t >= TD && t < TH - 1; const holeOn = t >= TD && t < END + 1; holeM.visible = holeOn; if (holeOn) vbar(holeM, ZB, 0, -hd - 0.0001);
          [augM, bitM, handle].forEach((m) => (m.visible = drilling)); if (drilling) { const wash = hd > -B.naTop + 0.2; augM.material.color.set(wash ? 0x3d86c6 : 0x9b6a2f); bitM.material.color.set(wash ? 0x3d86c6 : 0x7a5a2c); vbar(augM, ZB, -hd + 0.25, 1.4); vbar(bitM, ZB, -hd - 0.1, -hd + 0.4); hbar(handle, ZB - 0.7 * Math.cos(tAbs * 4), ZB + 0.7 * Math.cos(tAbs * 4), 1.45); op.upper.rotation.x = 0.5 + 0.3 * Math.sin(tAbs * 4); note = `Abrindo o furo: ${hd.toFixed(1).replace('.', ',')} m de 11 m`; label = 'trado'; }
          // instalação
          const tu = ease(win(t, TH, TH + 6)), sd = ease(win(t, TH + 6, TH + 12)), bt = ease(win(t, TH + 12, TH + 18)), bk = ease(win(t, TH + 18, TH + 24)), cp = ease(win(t, TH + 24, TH + 26));
          const tubeOn = t >= TH; [tube, screen].forEach((m) => (m.visible = tubeOn)); if (tubeOn) { const yb = 1.2 - (1.2 + DEP) * tu; vbar(tube, ZB, yb, yb + 12); vbar(screen, ZB, yb, yb + 1.0); }
          sand.visible = t >= TH + 6 && t < END + 1; vbar(sand, ZB, -DEP, -DEP + 1.4 * sd); seal.visible = t >= TH + 12; vbar(seal, ZB, -DEP + 1.4, -DEP + 1.4 + 1.2 * bt); fillB.visible = t >= TH + 18; vbar(fillB, ZB, -DEP + 2.6, -DEP + 2.6 + (DEP - 2.6 - 0.35) * bk);
          cap.visible = capTop.visible = t >= TH + 24; vbar(cap, ZB, 0, 0.45 * cp); hbar(capTop, ZB - 0.45, ZB + 0.45, 0.5 * cp + 0.02);
          if (t >= TH && t < TT) { const ph = t < TH + 6 ? 'tubo' : t < TH + 12 ? 'filtro' : t < TH + 18 ? 'bentonita' : t < TH + 24 ? null : 'tampa'; note = t < TH + 6 ? 'Descendo o tubo de PVC com o trecho filtrante no fundo' : t < TH + 12 ? 'Lançando areia ao redor do trecho filtrante' : t < TH + 18 ? 'Selo de bentonita: isola o trecho filtrante da água de cima' : t < TH + 24 ? 'Preenchendo o resto do furo com solo' : 'Colocando a tampa de proteção na boca do tubo'; label = ph; }
          // água no tubo
          const mon = clamp01((t - TM0) / (TM1 - TM0)), month = mon * 12, nad = t >= TM0 ? naAt(Math.min(11.99, month)) : naAt(0); st.na = nad;
          const wOn = t >= TT; wTube.visible = naLine.visible = naTick.visible = wOn; if (wOn) { const wl = DEP - (DEP - nad) * ease(win(t, TT, TT + 5)); void wl; const lvl = t < TT + 6 ? -DEP + (DEP - nad) * ease(win(t, TT, TT + 6)) : -nad; vbar(wTube, ZB, -DEP + 0.2, lvl); hbar(naLine, ZB - 3.2, ZB + 3.2, lvl); hbar(naTick, ZB + 0.3, ZB + 1.1, lvl); naLine.material.opacity = 1; st.na = -lvl; }
          if (t >= TT && t < TR) { note = 'A água entra pelo trecho filtrante e sobe no tubo até o nível d\'água'; label = 'na'; }
          // leitura
          const rd = win(t, TR, TR + 10), probeY = rd < 1 ? 1.2 - (1.2 + st.na) * ease(rd / 1) : -st.na, up = ease(win(t, TR + 12, TR + 14));
          const rdOn = t >= TR && t < TM0 - 1; cable.visible = probe.visible = rdOn; meter.visible = rdOn; if (rdOn) { const py = probeY + (1 - (1 - up)) * 0; vbar(cable, ZB + 0.28, py, 1.2); vbar(probe, ZB + 0.28, py - 0.35, py); meter.position.set(X1 + 1.6, 1.1, ZB + 1.4); st.probe = py; note = rd < 1 ? `Descendo a sonda: ${(-py).toFixed(1).replace('.', ',')} m` : `A sonda apitou: nível d'água a ${st.na.toFixed(1).replace('.', ',')} m`; label = rd < 1 ? 'sonda' : 'na'; nota.upper.rotation.x = 0.4; }
          // monitoramento
          chart.mesh.visible = t >= TM0 - 4; drawChart(t < TM0 ? 0 : month);
          if (t >= TM0 - 4 && t < TU) { const mi = Math.min(11, Math.floor(month)); note = t < TM0 ? 'Leituras mensais: o gráfico começa' : `Mês de ${MES[mi]}: chuva ${RAIN[mi]} mm · nível d'água a ${nad.toFixed(1).replace('.', ',')} m`; label = RAIN[mi] > 100 ? 'chuva' : 'grafico'; }
          // poropressão
          const pp = ease(win(t, TU, TU + 8)); PRB.forEach((b, i) => { const d = Math.max(9.8, st.na) + i * 0.25 + 0.05, u = 9.81 * (d - 9.8), ok = t >= TU && d <= 13.45; b.visible = ok; if (ok) hbar(b, ZB - 2.4, ZB - 2.4 - 0.22 * u * pp - 0.001, -d); });
          if (t >= TU) { note = `Abaixo do nível d'água: u = γw · h, cerca de ${Math.round(9.81 * (13 - 9.8))} kPa a 13 m`; label = 'pressao'; }
          c.note = note; c.label = label;
        },
        idle: (t) => (t < TD ? 'Terreno natural' : 'Piezômetro instalado'),
        anchors(a) {
          a.topo.set(X1 + 1.3, 1.6, ZB); a.trado.set(XP, 1.7, ZB); a.tubo.set(XP, -3, ZB); a.filtro.set(XP, -10.4, ZB); a.bentonita.set(XP, -8.9, ZB); a.tampa.set(XP, 1.0, ZB); a.sonda.set(XP, st.probe - 0.3, ZB + 0.3); a.na.set(XP, -st.na - 0.5, ZB + 1.1);
          a.grafico.set(XP, -6.8, ZB + 18); a.chuva.set(XP, -2.2, ZB + 18); a.pressao.set(XP, -11.6, ZB - 4.5); a.op.set(X1 + 1.6, 2.3, op.group.position.z); a.solo.set(X1, -16, ZB);
        },
        vis: {
          topo: (t) => t > 5.5 && t < 7, trado: (t) => t >= TD && t < TH - 1, tubo: (t) => t >= TH && t < TH + 6, filtro: (t) => t >= TH + 6 && t < TH + 12, bentonita: (t) => t >= TH + 12 && t < TH + 18, tampa: (t) => t >= TH + 24 && t < TT, sonda: (t) => t >= TR && t < TR + 10, na: (t) => (t >= TT && t < TR) || (t >= TR + 10 && t < TM0 - 1), grafico: (t) => t >= TM0 - 4 && t < TU, chuva: (t) => t >= TM0 - 4 && t < TU, pressao: (t) => t >= TU, op: (t) => t > 10 && t < 12,
        },
      };
    },
  });
}
