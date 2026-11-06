import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { createProfile, col, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { X1G, ZB, GEO_G, G_BOX, textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// G6 — Ensaio de placa. Cava rasa na cota de apoio da fundação, placa de aço rígida, macaco hidráulico reagindo contra uma viga
// presa ao terreno por tirantes. A carga sobe em estágios e o recalque é lido em relógios comparadores; o resultado é a curva carga x recalque.
// ---------------------------------------------------------------------------
export const G6_CAM = { tx: X1G, ty: -2.4, tz: 35, yaw: -1.3, pitch: 0.2, dist: 52 };
export const G6_MCAM = { tx: X1G, ty: -2.4, tz: 36, yaw: -1.3, pitch: 0.2, dist: 98 };
const T_EX0 = 7, T_EX1 = 16, T_AS = 24, NST = 8, TST = 7, T_UN = T_AS + NST * TST, T_UN1 = T_UN + 10, T_FIN = T_UN1 + 12, END = T_FIN + 14;
const PIT = 1.0, PW = 1.4, PU = 300, KS = 0.06, EXA = 0.045;
export const G6_STARTS = [0, T_EX0, T_AS, T_UN, T_UN1];
export const G6_STEPS = [
  { t: 'Locação', d: 'O topógrafo marca o ponto do ensaio. O ensaio de placa é feito no próprio terreno, na cota em que a fundação será apoiada, e mede diretamente como o solo se comporta sob carga. Ele é muito usado para escolher entre fundação rasa e profunda e para estimar a tensão admissível e o módulo de deformação do solo.' },
  { t: 'Escavação e montagem', d: 'Uma escavadeira abre a cava até a cota de apoio, e o fundo é regularizado com cuidado, sem perturbar o solo. Sobre ele se assenta a placa de aço, rígida e circular (de 0,80 m de diâmetro nos ensaios normatizados). Acima dela vão o macaco hidráulico com a célula de carga e a viga de reação, presa ao terreno por tirantes com ancoragens: elas dão a reação à carga do macaco.' },
  { t: 'Carregamento em estágios', d: 'O macaco empurra a placa para baixo em estágios iguais (aqui, de 25 em 25 kPa). Cada estágio é mantido até o recalque estabilizar, lido em relógios comparadores presos a uma viga de referência, fora da área de influência. Sob a placa forma-se o bulbo de tensões, que alcança uma profundidade de cerca de duas vezes o diâmetro: o ensaio só testa essa região, e é uma limitação importante.' },
  { t: 'Descarregamento', d: 'Depois do último estágio, a carga é retirada também em estágios, e o solo recupera parte do recalque (a parte elástica). O restante é permanente. A curva de descarga mostra a parcela elástica, usada para estimar o módulo de deformação do solo.' },
  { t: 'Curva carga x recalque e interpretação', d: 'O gráfico mostra o recalque crescendo cada vez mais rápido com a carga, até se aproximar da ruptura. A tensão admissível é escolhida pelo critério de ruptura (a carga de ruptura dividida por um fator de segurança, aqui 3) e pelo recalque aceitável para a obra, o que for mais restritivo. Aqui: ruptura em torno de 300 kPa, tensão admissível de 100 kPa, com recalque de cerca de 9 mm na placa.' },
];
export const G6_LABELS = [
  { k: 'topo', t: 'Estaca de locação' }, { k: 'esc', t: 'Escavadeira' }, { k: 'cava', t: 'Cava na cota de apoio' }, { k: 'placa', t: 'Placa de aço rígida' }, { k: 'macaco', t: 'Macaco hidráulico e célula de carga' }, { k: 'viga', t: 'Viga de reação' },
  { k: 'tirante', t: 'Tirantes e ancoragens' }, { k: 'relogio', t: 'Relógios comparadores' }, { k: 'bulbo', t: 'Bulbo de tensões' }, { k: 'curva', t: 'Curva carga x recalque' }, { k: 'adm', t: 'Tensão admissível' }, { k: 'op', t: 'Operador do macaco' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const G6 = { box: G_BOX };
const sOf = (p) => (KS * p) / (1 - Math.min(0.97, p / PU)), SMAX = sOf(25 * NST), SPERM = 0.65 * SMAX;
const fmt = (v, n = 0) => (n ? v.toFixed(n).replace('.', ',') : String(Math.round(v)));

export function createG6(engine, section) {
  return createProfile(engine, section, {
    key: 'G6', labels: G6_LABELS, starts: G6_STARTS, END, yb: -14, geo: GEO_G, zo: 38, hide: 'g-inv',
    build(H) {
      const { root, stake, X1, XP } = H;
      const mk = (th, color, ro, em, dx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; m.userData.dx = dx; root.add(m); return m; };
      const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP - (m.userData.dx || 0), (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
      const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP - (m.userData.dx || 0), y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
      const pitW = mk(1, 0x4a3a28, 6), plate = mk(0.2, 0x8f959d, 9, 0x1a1a1a, 0.012), jack = mk(0.6, 0xe8742c, 9, 0x3a1a00, 0.012), piston = mk(0.28, 0xc7ccd3, 10, 0, 0.016), cell = mk(0.7, 0x2b2d31, 10, 0, 0.016), beam = mk(0.4, 0x3a3d44, 9, 0, 0.01);
      const tieA = mk(0.12, 0x6f737a, 8, 0, 0.01), tieB = mk(0.12, 0x6f737a, 8, 0, 0.01), ancA = mk(0.22, 0x8f959d, 9, 0, 0.012), ancB = mk(0.22, 0x8f959d, 9, 0, 0.012);
      const ref = mk(0.12, 0xd8332a, 8, 0, 0.01), refP1 = mk(0.1, 0xd8332a, 8, 0, 0.01), refP2 = mk(0.1, 0xd8332a, 8, 0, 0.01);
      const gA = mk(0.5, 0xf4f1ea, 10, 0, 0.018), gB = mk(0.5, 0xf4f1ea, 10, 0, 0.018), plA = mk(0.06, 0x23303d, 10, 0, 0.02), plB = mk(0.06, 0x23303d, 10, 0, 0.02);
      const ruler = textPanel(1.6, 14.4, 96, 864, X1 - 0.065, -7.2, ZB - 1.4);
      { const g = ruler.g; g.fillStyle = 'rgba(20,24,30,0.55)'; g.fillRect(0, 0, 96, 864); g.fillStyle = '#fff'; g.font = '700 26px "Barlow Semi Condensed", Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
        for (let m = 1; m <= 14; m++) { const yp = m * 60; g.beginPath(); g.moveTo(66, yp); g.lineTo(96, yp); g.stroke(); g.fillText(`${m} m`, 60, yp - 14); } g.font = '700 20px Arial'; g.fillText('prof.', 60, 16); ruler.tx.needsUpdate = true; }
      root.add(ruler.mesh);
      // bulbo de tensões (isóbaras), com opacidade proporcional à carga
      const bulb = textPanel(7, 5.6, 350, 280, X1 - 0.055, -PIT - 2.8, ZB); { const g = bulb.g; const el = [[0.8, 42, 62, 'rgba(255,120,60,0.55)'], [0.5, 66, 108, 'rgba(255,170,60,0.45)'], [0.2, 104, 196, 'rgba(255,220,90,0.38)'], [0.1, 150, 262, 'rgba(255,240,150,0.30)']];
        for (const [, rx, ry, c] of el) { g.fillStyle = c; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.beginPath(); g.ellipse(175, 0, rx, ry, 0, 0, Math.PI); g.closePath(); g.fill(); g.stroke(); }
        g.fillStyle = '#fff'; g.font = '700 16px Arial'; g.textAlign = 'center'; [['0,8q', 62], ['0,5q', 108], ['0,2q', 196], ['0,1q', 262]].forEach(([tx, y]) => g.fillText(tx, 175, y - 4)); bulb.tx.needsUpdate = true; }
      root.add(bulb.mesh);
      // curva carga x recalque
      const CW = 13, CH = 7.2, U = 50, ch = textPanel(CW, CH, CW * U, CH * U, X1 - 0.065, -4.2, ZB + 6.2 + CW / 2), CG = ch.g; let lastK = '';
      const drawCurve = (nSt, pNow, sNow, unl, fin) => {
        const key = `${nSt}|${Math.round(pNow)}|${Math.round(sNow * 10)}|${unl}|${fin}`; if (key === lastK) return; lastK = key;
        const W = CW * U, Hh = CH * U, x0 = 74, x1 = W - 22, y0 = 44, y1 = Hh - 30, X = (p) => x0 + (x1 - x0) * p / 220, Y = (s) => y0 + (y1 - y0) * s / 45; CG.clearRect(0, 0, W, Hh); CG.fillStyle = 'rgba(20,24,30,0.74)'; CG.beginPath(); CG.roundRect(0, 0, W, Hh, 14); CG.fill();
        CG.strokeStyle = 'rgba(255,255,255,0.28)'; CG.fillStyle = '#fff'; CG.font = '600 16px Arial'; CG.textAlign = 'right'; for (const s of [0, 10, 20, 30, 40]) { CG.fillText(String(s), x0 - 8, Y(s) + 5); CG.beginPath(); CG.moveTo(x0, Y(s)); CG.lineTo(x1, Y(s)); CG.stroke(); }
        CG.textAlign = 'center'; for (const p of [0, 50, 100, 150, 200]) { CG.fillText(String(p), X(p), 24); CG.beginPath(); CG.moveTo(X(p), y0); CG.lineTo(X(p), y1); CG.stroke(); } CG.fillStyle = '#9fd2ff'; CG.textAlign = 'left'; CG.font = '600 17px Arial'; CG.fillText('recalque (mm)', 8, Hh - 8); CG.textAlign = 'right'; CG.fillText('tensão aplicada (kPa)', x1, 12);
        CG.strokeStyle = '#ffb347'; CG.fillStyle = '#ffb347'; CG.lineWidth = 4; CG.beginPath(); CG.moveTo(X(0), Y(0)); for (let i = 1; i <= nSt; i++) CG.lineTo(X(25 * i), Y(sOf(25 * i))); if (!unl && pNow > 25 * nSt) CG.lineTo(X(pNow), Y(sNow)); CG.stroke();
        for (let i = 1; i <= nSt; i++) { CG.beginPath(); CG.arc(X(25 * i), Y(sOf(25 * i)), 6, 0, 7); CG.fill(); }
        if (unl) { CG.strokeStyle = '#c8cdd4'; CG.setLineDash([8, 6]); CG.beginPath(); CG.moveTo(X(200), Y(SMAX)); CG.lineTo(X(pNow), Y(sNow)); CG.stroke(); CG.setLineDash([]); }
        if (fin) { CG.strokeStyle = '#7ee08a'; CG.lineWidth = 3; CG.setLineDash([6, 5]); CG.beginPath(); CG.moveTo(X(100), y0); CG.lineTo(X(100), y1); CG.stroke(); CG.setLineDash([]); CG.fillStyle = '#7ee08a'; CG.beginPath(); CG.arc(X(100), Y(sOf(100)), 8, 0, 7); CG.fill(); CG.textAlign = 'left'; CG.font = '700 19px Arial'; CG.fillText(`σadm = 100 kPa · s ≈ ${fmt(sOf(100))} mm`, X(100) + 14, Y(sOf(100)) + 26); CG.strokeStyle = '#ff7a6a'; CG.setLineDash([4, 4]); CG.beginPath(); CG.moveTo(X(200), Y(SMAX)); CG.lineTo(X(215), Y(SMAX + 4)); CG.stroke(); CG.setLineDash([]); }
        ch.tx.needsUpdate = true;
      };
      root.add(ch.mesh); drawCurve(0, 0, 0, false, false);
      const ped = (c, h) => { const p = person(c, h); p.group.visible = false; root.add(p.group); return p; };
      const nota = ped(0x2f6fd0, 0xffffff), op = ped(0xe8742c, 0xf2b705), stk = stake(X1 + 1.3, ZB, 0);
      const exc = M.excavator(0.9); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI / 2; excW.add(exc.group); excW.visible = false; root.add(excW);
      const spoil = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 9), mat(0x8a6a44, { r: 1 })); spoil.visible = false; spoil.position.set(X1 + 3.4, 0, ZB - 5.2); root.add(spoil);
      const st = { p: 0, s: 0, plateY: -PIT };
      return {
        column(z, t, o) {
          const dz = Math.abs(z - ZB), pr = ease(win(t, T_EX0, T_EX1)), inside = clamp01((2.4 - dz) / 0.5); const f = pr * inside; o.top = -PIT * f; const c = new THREE.Color(0x6f9c50); if (t > 3) c.lerp(new THREE.Color(0x8a6a44), 0.6 * ease(win(t, 3, 6))); if (f > 0.05) c.set(0x7a5a3a); o.topC.copy(c);
          o.lo[0] = -PIT * f; o.hi[0] = 0; o.c[0].set(0x4a3a28);
        },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null;
          const wI = ease(win(t, 0, 5)); nota.group.visible = true; nota.group.position.set(X1 + 1.6, 0, t < 5 ? ZB - 18 + 17 * wI : t < 7 ? ZB - 1 : ZB - 3.4); nota.group.rotation.y = t < 7 ? 0 : -Math.PI / 2; nota.upper.rotation.x = t >= 5 && t < 7 ? 0.5 + 0.2 * Math.sin(tAbs * 5) : 0.12 * Math.sin(tAbs * 1.2);
          stk.visible = t > 5.5 && t < T_EX0 + 3; stk.scale.setScalar(ease(win(t, 5.5, 7)) + 0.001); stk.position.set(X1 + 1.3, 0, ZB);
          op.group.visible = t > 17; op.group.position.set(X1 + 1.6, 0, ZB + 4.9); op.group.rotation.y = -Math.PI / 2;
          if (t < T_EX0) { note = t < 5 ? 'O topógrafo chega ao ponto do ensaio' : 'Cravando a estaca de locação'; label = t < 7 ? 'topo' : null; }
          // escavação
          const exOn = t >= T_EX0 && t < T_EX1 + 2; excW.visible = exOn; if (exOn) { excW.position.set(X1 + 4.8, 0, ZB + 3.6); excW.rotation.set(0, 0, 0); exc.update(tAbs * 1.1); }
          spoil.visible = t >= T_EX0 + 1; const sp = ease(win(t, T_EX0, T_EX1)); spoil.scale.set(0.4 + 1.6 * sp, 0.2 + 0.9 * sp, 0.4 + 1.6 * sp);
          if (t >= T_EX0 && t < T_EX1) { note = 'Escavando a cava até a cota de apoio da fundação'; label = 'esc'; } else if (t >= T_EX1 && t < T_AS) { note = t < 20 ? 'Regularizando o fundo da cava, sem perturbar o solo' : 'Assentando a placa, o macaco, a viga de reação e os tirantes'; label = t < 20 ? 'cava' : 'placa'; }
          // montagem
          const as = ease(win(t, 17, 23)), beamY = 2.0, sh = clamp01((t - 22) / 2);
          const pitOn = t >= T_EX0; pitW.visible = false; void pitOn;
          // carga
          let p = 0, s = 0, nSt = 0, unl = false, fin = false;
          if (t >= T_AS && t < T_UN) { const k = Math.floor((t - T_AS) / TST), u = (t - T_AS) / TST - k, pr = k * 25 + 25 * ease(clamp01(u / 0.35)); p = pr; nSt = k + (u >= 0.35 ? 1 : 0); s = sOf(pr) * (u > 0.35 ? 0.94 + 0.06 * ease((u - 0.35) / 0.65) : 1); if (k > 0 || u < 0.35) s = sOf(pr) * (u > 0.35 ? 0.96 + 0.04 * ease((u - 0.35) / 0.65) : 1); nSt = Math.min(NST, k + (u >= 0.5 ? 1 : 0)); }
          else if (t >= T_UN && t < T_UN1) { const f = ease(win(t, T_UN, T_UN1)); p = 200 * (1 - f); s = SPERM + (SMAX - SPERM) * (p / 200); nSt = NST; unl = true; }
          else if (t >= T_UN1) { p = 0; s = SPERM; nSt = NST; unl = true; fin = t >= T_FIN - 4; }
          st.p = p; st.s = s;
          const plateTop = -PIT - s * EXA, plateY = plateTop - 0.1; st.plateY = plateY;
          const setupOn = t >= 17; [plate, jack, piston, cell, beam, tieA, tieB, ancA, ancB, ref, refP1, refP2, gA, gB, plA, plB].forEach((m) => (m.visible = setupOn));
          if (setupOn) {
            const dr = as; // peças descendo para a posição
            hbar(plate, ZB - PW / 2, ZB + PW / 2, plateY); plate.scale.y = 1;
            vbar(cell, ZB, beamY - 0.2 - 0.7, beamY - 0.2); vbar(jack, ZB, -PIT + 0.5 + 0.3, beamY - 0.9); vbar(piston, ZB, plateTop, -PIT + 0.9);
            hbar(beam, ZB - 4.4, ZB + 4.4, beamY); vbar(tieA, ZB - 3.9, -4.5, beamY - 0.2); vbar(tieB, ZB + 3.9, -4.5, beamY - 0.2); hbar(ancA, ZB - 4.6, ZB - 3.2, -4.5); hbar(ancB, ZB + 3.2, ZB + 4.6, -4.5);
            hbar(ref, ZB - 5.6, ZB + 5.6, 0.55); vbar(refP1, ZB - 5.6, 0, 0.55); vbar(refP2, ZB + 5.6, 0, 0.55);
            vbar(gA, ZB - 1.6, 0.58, 1.0); vbar(gB, ZB + 1.6, 0.58, 1.0); vbar(plA, ZB - 1.6, plateTop, 0.6); vbar(plB, ZB + 1.6, plateTop, 0.6);
            [plate, jack, piston, cell, beam, tieA, tieB, ancA, ancB, ref, refP1, refP2, gA, gB, plA, plB].forEach((m) => { m.visible = dr > 0.02 || t >= T_AS; });
          }
          // bulbo
          bulb.mesh.visible = t >= T_AS + 3; bulb.mesh.material.opacity = 0.95 * clamp01(p / 200); bulb.mesh.position.y = plateY - 0.1 - 2.8;
          // gráfico e legendas
          ch.mesh.visible = t >= T_AS; drawCurve(nSt, p, s, unl, fin); ruler.mesh.visible = t >= T_AS; if (t < T_AS) ruler.mesh.visible = false;
          if (t >= T_AS && t < T_UN) { const k = Math.floor((t - T_AS) / TST); note = `Estágio ${k + 1} de ${NST}: ${fmt(p)} kPa · recalque ${fmt(s, 1)} mm`; label = k < 1 ? 'macaco' : k < 3 ? 'relogio' : k < 5 ? 'bulbo' : k < 7 ? 'viga' : 'curva'; op.upper.rotation.x = 0.3 + 0.2 * Math.sin(tAbs * 6); }
          else if (t >= T_UN && t < T_UN1) { note = `Descarregando: ${fmt(p)} kPa · recalque ${fmt(s, 1)} mm (parte elástica recuperada)`; label = 'relogio'; }
          else if (t >= T_UN1) { note = t < T_FIN - 4 ? `Recalque permanente: ${fmt(SPERM, 1)} mm` : 'σadm = 100 kPa (ruptura ≈ 300 kPa, FS = 3), recalque ≈ 9 mm'; label = t < T_FIN - 4 ? 'curva' : 'adm'; }
          if (t >= T_AS && t < T_AS + 3) label = 'tirante';
          c.note = note; c.label = label;
        },
        idle: (t) => (t < T_EX0 ? 'Terreno natural' : t < T_AS ? 'Preparação do ensaio' : 'Ensaio de placa'),
        anchors(a) {
          a.topo.set(X1 + 1.3, 1.6, ZB); a.esc.set(X1 + 4.8, 4.0, ZB + 3.6); a.cava.set(XP, -0.5, ZB - 1.6); a.placa.set(XP, st.plateY - 0.2, ZB - 0.5); a.macaco.set(XP, 1.2, ZB + 0.6); a.viga.set(XP, 2.5, ZB - 3.0); a.tirante.set(XP, -3.2, ZB + 3.9);
          a.relogio.set(XP, 1.1, ZB + 1.6); a.bulbo.set(XP, st.plateY - 2.4, ZB + 1.4); a.curva.set(XP, -3.0, ZB + 14); a.adm.set(XP, -sOf(100) * 0.14 - 1.5, ZB + 11.5); a.op.set(X1 + 1.6, 2.3, ZB + 4.9); a.solo.set(X1, -16, ZB);
        },
        vis: {
          topo: (t) => t > 5.5 && t < 7, esc: (t) => t >= T_EX0 && t < T_EX1, cava: (t) => t >= T_EX1 && t < 20, placa: (t) => t >= 20 && t < T_AS, macaco: (t) => t >= T_AS && t < T_AS + TST, relogio: (t) => (t >= T_AS + TST && t < T_AS + 3 * TST) || (t >= T_UN && t < T_UN1), bulbo: (t) => t >= T_AS + 3 * TST && t < T_AS + 5 * TST, viga: (t) => t >= T_AS + 5 * TST && t < T_AS + 7 * TST,
          tirante: (t) => t >= T_AS && t < T_AS + 3, curva: (t) => (t >= T_AS + 7 * TST && t < T_UN) || (t >= T_UN1 && t < T_FIN - 4), adm: (t) => t >= T_FIN - 4, op: (t) => t > 18 && t < 22,
        },
      };
    },
  });
}
