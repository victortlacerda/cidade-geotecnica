import * as THREE from 'three';
import { createProfile, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { X1G, ZB, GEO_G, G_BOX, textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// G2 — Sondagem rotativa. Até 7 m, solo com revestimento; daí em diante, rocha amostrada com barrilete duplo e coroa de diamante,
// em cinco manobras de 1,4 m. Cada manobra gera testemunho (caixa), recuperação (REC) e RQD.
// O maciço rochoso (alterado no topo, são abaixo) é um exemplo, desenhado sobre a seção do local.
// ---------------------------------------------------------------------------
export const G2_CAM = { tx: X1G, ty: -3.6, tz: 36, yaw: -1.3, pitch: 0.2, dist: 60 };
export const G2_MCAM = { tx: X1G, ty: -3.6, tz: 36, yaw: -1.3, pitch: 0.2, dist: 108 };
const T_SET = 8, T_CAS0 = 12, T_CAS1 = 28, T_C0 = 30, RUN = 14, NR = 5, T_C1 = T_C0 + RUN * NR, T_OUT = T_C1 + 4, T_REP = T_OUT + 2, END = T_REP + 28;
const DTOP = 7, L = 1.4, REC = [62, 86, 96, 100, 100], RQD = [0, 32, 72, 90, 96];
const CLS = (r) => (r < 25 ? 'muito fraco' : r < 50 ? 'fraco' : r < 75 ? 'regular' : r < 90 ? 'bom' : 'excelente');
const fmt = (v, n = 1) => v.toFixed(n).replace('.', ',');
export const G2_STARTS = [0, T_SET, T_CAS1 + 2, T_C0 + RUN, T_REP];
export const G2_STEPS = [
  { t: 'Locação e instalação da sonda', d: 'O topógrafo marca o furo e a sonda rotativa é posicionada, com tanque e bomba de água. A sondagem rotativa é usada quando o solo dá lugar à rocha ou a um material tão resistente que o SPT não avança (impenetrável). Em vez de amostras de solo amolgadas, ela retira testemunhos contínuos de rocha, que mostram o maciço como ele realmente é, com suas fraturas.' },
  { t: 'Solo com revestimento', d: 'Até 7 m, o furo atravessa o solo com ferramenta de solo (trado ou tricone com lavagem), e um tubo de revestimento é cravado junto, para sustentar as paredes e impedir que o solo desmorone sobre o trecho de rocha. Aqui o revestimento vai até o topo da rocha alterada.' },
  { t: 'Perfuração rotativa com barrilete', d: 'Na rocha, desce um barrilete duplo com coroa de diamante na ponta. A coroa gira com pressão e a água circula por dentro, esfriando a coroa e trazendo os detritos para a superfície. O tubo interno não gira, e o testemunho entra nele quase intacto. Cada manobra avança 1,4 m.' },
  { t: 'Testemunho e caixa', d: 'A cada manobra, o barrilete interno sobe preso por cabo (wireline). O testemunho é retirado e posto na caixa, na ordem e na profundidade corretas. Mede-se a recuperação, REC (comprimento recuperado ÷ avanço), e o RQD (soma dos pedaços com 10 cm ou mais ÷ avanço). Perdas aparecem como vazios na caixa; pedaços pequenos, de rocha muito fraturada, ficam de fora do RQD.' },
  { t: 'Boletim e classificação', d: 'O boletim reúne REC e RQD por manobra: a rocha alterada do topo vem quebrada (RQD 0 e 32%) e melhora com a profundidade (72, 90 e 96%). Média: REC 89% e RQD 58%, maciço de qualidade regular. Classes de RQD: abaixo de 25% muito fraco, 25 a 50% fraco, 50 a 75% regular, 75 a 90% bom, acima de 90% excelente. Esses números orientam a escolha da fundação e a escavação.' },
];
export const G2_LABELS = [
  { k: 'topo', t: 'Estaca de locação' }, { k: 'sonda', t: 'Sonda rotativa' }, { k: 'agua', t: 'Tanque e bomba de água' }, { k: 'revest', t: 'Revestimento (solo)' }, { k: 'cabec', t: 'Cabeçote rotativo' }, { k: 'coroa', t: 'Coroa de diamante' },
  { k: 'barril', t: 'Barrilete duplo' }, { k: 'cabo', t: 'Cabo (wireline)' }, { k: 'caixa', t: 'Caixa de testemunhos' }, { k: 'rec', t: 'REC: recuperação' }, { k: 'rqd', t: 'RQD: pedaços ≥ 10 cm' }, { k: 'alt', t: 'Rocha alterada' }, { k: 'sa', t: 'Rocha sã' },
  { k: 'op', t: 'Sondador' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const G2 = { box: G_BOX };

// peças do testemunho de cada manobra (determinístico)
function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const PIECES = REC.map((rc, r) => {
  const rnd = seeded(97 + r * 31), rec = (rc / 100) * L, rq = Math.min(rec, (RQD[r] / 100) * L), segs = [];
  let rem = rq, k = 0; while (rem > 0.11 && k < 12) { const l = Math.min(rem, 0.13 + rnd() * 0.3); if (rem - l < 0.1 && rem - l > 0) { segs.push({ l: rem, big: 1 }); rem = 0; break; } segs.push({ l, big: 1 }); rem -= l; k++; }
  let fr = rec - segs.reduce((a, s) => a + s.l, 0); while (fr > 0.012) { const l = Math.min(fr, 0.02 + rnd() * 0.07); segs.push({ l, big: 0 }); fr -= l; }
  for (let i = segs.length - 1; i > 0 && RQD[r] < 80; i--) { const j = Math.floor(rnd() * (i + 1)); [segs[i], segs[j]] = [segs[j], segs[i]]; }
  return segs;
});

export function createG2(engine, section) {
  return createProfile(engine, section, {
    key: 'G2', labels: G2_LABELS, starts: G2_STARTS, END, yb: -14, geo: GEO_G, zo: 38, hide: 'g-inv',
    build(H) {
      const { root, stake, X1, XP } = H;
      const mk = (th, color, ro, em, dx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; m.userData.dx = dx; root.add(m); return m; };
      const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP - (m.userData.dx || 0), (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
      const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP - (m.userData.dx || 0), y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
      // maciço rochoso (exemplo): faixa sobre a seção, de 7 a 14 m, alterada até 10 m
      const RW = 52, RH = 7, PX = 40, rock = textPanel(RW, RH, RW * PX, RH * PX, X1 - 0.045, -(DTOP + RH / 2), ZB - 20 + RW / 2); rock.mesh.renderOrder = 5;
      { const g = rock.g, W = RW * PX, Hh = RH * PX, rnd = seeded(5), yAlt = 3 * PX; const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#a9754a'); gr.addColorStop(yAlt / Hh, '#9a8268'); gr.addColorStop(yAlt / Hh + 0.02, '#74797f'); gr.addColorStop(1, '#5f646a'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
        for (let i = 0; i < 260; i++) { const y = rnd() * Hh, dense = y < yAlt ? 1 : 0.35; if (rnd() > dense) continue; const x = rnd() * W, l = 20 + rnd() * 90, a = (rnd() - 0.5) * 1.2; g.strokeStyle = y < yAlt ? 'rgba(60,35,20,0.45)' : 'rgba(30,32,36,0.35)'; g.lineWidth = 1 + rnd() * 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.6); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = '700 22px Arial'; g.textAlign = 'left'; g.fillText('rocha alterada (exemplo)', W - 380, 28); g.fillText('rocha sã (exemplo)', W - 380, yAlt + 34); rock.tx.needsUpdate = true; }
      root.add(rock.mesh);
      // furo, revestimento, hastes, barrilete
      const casing = mk(0.8, 0x9aa0a8, 7, 0x202225, 0.008), hole = mk(0.55, 0x1b1a1d, 8, 0, 0.014), rod = mk(0.18, 0xc6cbd2, 10, 0x222, 0.02), barrel = mk(0.4, 0x6f757d, 9, 0x111, 0.018), core = mk(0.2, 0xd9d4c8, 10, 0x333, 0.022), bit = mk(0.5, 0xe8b300, 10, 0x4a3500, 0.021), cab = mk(0.04, 0xffffff, 10, 0x222, 0.019), wtr = mk(0.08, 0x59b8ff, 9, 0x0a3a66, 0.016), mast = mk(0.5, 0x3a3d44, 8, 0, 0.01), headM = mk(0.7, 0xe8742c, 10, 0x3a1c00, 0.02);
      const ticks = Array.from({ length: 6 }, () => mk(0.22, 0x555a60, 11, 0, 0.024));
      const ruler = textPanel(1.6, 14.4, 96, 864, X1 - 0.065, -7.2, ZB - 1.4);
      { const g = ruler.g; g.fillStyle = 'rgba(20,24,30,0.55)'; g.fillRect(0, 0, 96, 864); g.fillStyle = '#fff'; g.font = '700 26px "Barlow Semi Condensed", Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; for (let m = 1; m <= 14; m++) { const yp = m * 60; g.beginPath(); g.moveTo(66, yp); g.lineTo(96, yp); g.stroke(); g.fillText(`${m} m`, 60, yp - 14); } g.font = '700 20px Arial'; g.fillText('prof.', 60, 16); ruler.tx.needsUpdate = true; }
      root.add(ruler.mesh);
      // painel A: caixa de testemunhos (2D); painel B: boletim
      const CW = 15, CH = 6.6, U = 48, bx = textPanel(CW, CH, CW * U, CH * U, X1 - 0.065, -3.6, ZB + 2.0 + CW / 2), BG = bx.g, bl = textPanel(CW, CH, CW * U, CH * U, X1 - 0.065, -3.6, ZB + 18.4 + CW / 2), LG = bl.g;
      const RC = ['#b08a62', '#a0907c', '#8a8a86', '#7d8188', '#757a82'];
      let lastBx = '', lastBl = '';
      const drawBox = (nDone, cur) => {
        const key = `${nDone}|${Math.round(cur * 20)}`; if (key === lastBx) return; lastBx = key; const W = CW * U, Hh = CH * U; BG.clearRect(0, 0, W, Hh); BG.fillStyle = 'rgba(70,48,28,0.9)'; BG.beginPath(); BG.roundRect(0, 0, W, Hh, 12); BG.fill();
        BG.fillStyle = '#f4e9d4'; BG.font = '700 17px Arial'; BG.textAlign = 'left'; BG.fillText('Caixa de testemunhos (cada linha = 1 manobra de 1,4 m)', 14, 24);
        const x0 = 112, sc = (W - x0 - 16) / L, rh = 54;
        for (let r = 0; r < NR; r++) { const y = 40 + r * rh; BG.fillStyle = 'rgba(30,20,10,0.55)'; BG.fillRect(x0 - 4, y, L * sc + 8, rh - 8); BG.fillStyle = '#f4e9d4'; BG.font = '700 15px Arial'; BG.textAlign = 'right'; BG.fillText(`${fmt(DTOP + r * L)}–${fmt(DTOP + (r + 1) * L)} m`, x0 - 12, y + 30);
          const f = r < nDone ? 1 : r === nDone ? cur : 0; if (f <= 0) continue; let x = x0; const segs = PIECES[r], tot = REC[r] / 100 * L;
          for (const s of segs) { if ((x - x0) / sc > tot * f + 0.001) break; const w = Math.max(2, s.l * sc - 1); BG.fillStyle = s.big ? RC[r] : '#4d4338'; BG.beginPath(); BG.roundRect(x, y + (s.big ? 5 : 16), w, s.big ? rh - 18 : rh - 40, s.big ? 8 : 3); BG.fill(); if (s.big) { BG.fillStyle = 'rgba(255,255,255,0.22)'; BG.fillRect(x + 3, y + 9, Math.max(1, w - 6), 6); } x += s.l * sc; }
          if (f >= 1 && REC[r] < 100) { const gx = x0 + tot * sc; BG.setLineDash([4, 3]); BG.strokeStyle = '#ff8a7a'; BG.lineWidth = 2; BG.strokeRect(gx + 2, y + 6, L * sc - tot * sc - 4, rh - 20); BG.setLineDash([]); BG.fillStyle = '#ff8a7a'; BG.textAlign = 'center'; BG.font = '700 13px Arial'; BG.fillText('perda', gx + (L * sc - tot * sc) / 2, y + 30); } }
        bx.tx.needsUpdate = true; };
      const drawLog = (nDone, fin) => {
        const key = `${nDone}|${fin}`; if (key === lastBl) return; lastBl = key; const W = CW * U, Hh = CH * U; LG.clearRect(0, 0, W, Hh); LG.fillStyle = 'rgba(20,24,30,0.78)'; LG.beginPath(); LG.roundRect(0, 0, W, Hh, 12); LG.fill(); LG.fillStyle = '#fff'; LG.font = '700 17px Arial'; LG.textAlign = 'left'; LG.fillText('Boletim da sondagem rotativa', 14, 24);
        LG.font = '600 13px Arial'; LG.fillStyle = '#9fd2ff'; LG.fillText('REC (%)', 112, 44); LG.fillStyle = '#ffb347'; LG.fillText('RQD (%)', 212, 44);
        const x0 = 112, bw = 320, rh = 46;
        for (let r = 0; r < nDone; r++) { const y = 54 + r * rh; LG.fillStyle = '#fff'; LG.font = '700 15px Arial'; LG.textAlign = 'right'; LG.fillText(`${fmt(DTOP + r * L)}–${fmt(DTOP + (r + 1) * L)} m`, x0 - 12, y + 21); LG.fillStyle = '#59b8ff'; LG.fillRect(x0, y + 2, bw * REC[r] / 100, 16); LG.fillStyle = '#ffb347'; LG.fillRect(x0, y + 20, bw * RQD[r] / 100, 16); LG.fillStyle = '#fff'; LG.textAlign = 'left'; LG.font = '700 14px Arial'; LG.fillText(String(REC[r]), x0 + bw * REC[r] / 100 + 6, y + 15); LG.fillText(String(RQD[r]), x0 + bw * RQD[r] / 100 + 6, y + 33); LG.font = '600 14px Arial'; LG.fillStyle = '#e6e6e6'; LG.fillText(`maciço ${CLS(RQD[r])}`, x0 + bw + 40, y + 26); }
        if (fin) { const rm = REC.reduce((a, b) => a + b, 0) / NR, qm = RQD.reduce((a, b) => a + b, 0) / NR; LG.fillStyle = '#fff'; LG.font = '700 16px Arial'; LG.textAlign = 'left'; LG.fillText(`Média: REC ${Math.round(rm)}% · RQD ${Math.round(qm)}% (${CLS(qm)})`, 14, Hh - 8); }
        bl.tx.needsUpdate = true; };
      root.add(bx.mesh, bl.mesh);
      // 3D: sonda, tanque, mesa e caixa (com os mesmos testemunhos)
      const rig = new THREE.Group(); const bxx = (w, h, d, c, x, y, z, g = rig) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, { r: 0.7 })); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
      bxx(2.4, 0.35, 4.2, 0x3a3d44, 0, 0.3, 0); bxx(2.2, 1.5, 1.7, 0xe8742c, 0, 1.2, -1.1); bxx(1.2, 0.9, 1.0, 0x2b2d31, 0, 0.95, 1.2); bxx(0.15, 4.2, 0.15, 0x555a60, 0.9, 2.5, 0.2); bxx(0.15, 4.2, 0.15, 0x555a60, -0.9, 2.5, 0.2);
      rig.visible = false; root.add(rig);
      const tank = new THREE.Group(); { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.1, 14), mat(0x2f78c4, { r: 0.6 })); c.position.y = 0.55; c.castShadow = true; tank.add(c); bxx(0.7, 0.5, 0.6, 0xe8742c, 1.0, 0.3, 0, tank); } tank.visible = false; root.add(tank);
      const table = new THREE.Group(); { bxx(1.1, 0.08, 2.0, 0x8a6a44, 0, 0.95, 0, table); for (const [dx, dz] of [[-0.45, -0.85], [0.45, -0.85], [-0.45, 0.85], [0.45, 0.85]]) bxx(0.08, 0.95, 0.08, 0x6a4a2c, dx, 0.48, dz, table); bxx(0.9, 0.12, 1.8, 0xc99b5e, 0, 1.05, 0, table); }
      const pcs = Array.from({ length: NR }, (_, r) => { const g = new THREE.Group(); let z = -0.82; for (const s of PIECES[r]) { const len = s.l * 1.2, m = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, Math.max(0.02, len - 0.01), 8), mat(s.big ? parseInt(RC[r].slice(1), 16) : 0x4d4338, { r: 0.8 })); m.rotation.x = Math.PI / 2; m.position.set(0, 0, z + len / 2); g.add(m); z += len; } g.position.set(-0.32 + r * 0.16, 1.16, 0); g.visible = false; table.add(g); return g; });
      table.visible = false; root.add(table);
      const ped = (c, h) => { const p = person(c, h); p.group.visible = false; root.add(p.group); return p; };
      const topo = ped(0x2f6fd0, 0xffffff), sond = ped(0xe8742c, 0xf2b705), ajud = ped(0x2f9c5a, 0xf2b705), stk = stake(X1 + 1.3, ZB, 0);
      const st = { db: 0, hd: 4.4, r: 0, bz: ZB, by: 1 };
      const rod0 = 4.4;
      return {
        column(z, t, o) { const dz = Math.abs(z - ZB); o.top = 0; const c = new THREE.Color(0x6f9c50); if (t > 3 && dz < 1.6) c.lerp(new THREE.Color(0x8a6a44), 0.6 * ease(win(t, 3, 6))); o.topC.copy(c); },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null;
          topo.group.visible = true; const wI = ease(win(t, 0, 5)); topo.group.position.set(X1 + 1.6, 0, t < 5 ? ZB - 20 + 17 * wI : ZB - 3); topo.group.rotation.y = t < 5 ? 0 : -Math.PI / 2; topo.upper.rotation.x = t >= 5 && t < 7 ? 0.5 + 0.2 * Math.sin(tAbs * 5) : 0.1 * Math.sin(tAbs * 1.2);
          stk.visible = t > 5.5 && t < T_CAS0; stk.scale.setScalar(ease(win(t, 5.5, 7)) + 0.001); stk.position.set(X1 + 1.3, 0, ZB);
          const dr = ease(win(t, 1, 9)); rig.visible = t > 0.8; rig.position.set(X1 + 3.0, 0, ZB - 4.2 - 30 * (1 - dr)); tank.visible = t > 8; tank.position.set(X1 + 2.8, 0, ZB + 3.8 + 0.001); table.visible = t > T_C0 - 2; table.position.set(X1 + 2.0, 0, ZB + 7.2);
          // profundidade e manobra
          let db = 0, hd = rod0, run = -1, ph = 0, ru = 0; const cas = ease(win(t, T_CAS0, T_CAS1)) * DTOP;
          if (t < T_CAS1) { db = cas; hd = rod0 - ((db % L) / L) * 1.2; } else if (t < T_C0) db = DTOP; else if (t < T_C1) { run = Math.floor((t - T_C0) / RUN); ru = (t - T_C0) - run * RUN; ph = ru < 6 ? 0 : ru < 9.5 ? 1 : ru < 12.5 ? 2 : 3; const adv = ease(clamp01(ru / 6)); db = DTOP + run * L + (ph === 0 ? adv * L : L); hd = rod0 - (ph === 0 ? adv : 1) * 1.2; } else if (t < T_OUT) { db = DTOP + NR * L * (1 - ease(win(t, T_C1, T_OUT))); hd = rod0; } else db = 0;
          st.db = db; st.hd = hd; st.r = run;
          const nDone = t < T_C0 ? 0 : t >= T_C1 ? NR : run + (ru >= 12.5 ? 1 : 0) - (ru >= 9.5 ? 0 : 0) + (ru >= 9.5 && ru < 12.5 ? 0 : 0);
          const nShown = t >= T_C1 ? NR : Math.max(0, run) + (ru >= 12.5 ? 1 : 0); const cur = run >= 0 && t < T_C1 && ru >= 9.5 && ru < 12.5 ? (ru - 9.5) / 3 : 0;
          void nDone;
          // furo e revestimento
          const holeOn = t >= T_CAS0; hole.visible = holeOn; if (holeOn) { const hd2 = t < T_CAS1 ? db : t < T_C0 ? DTOP : t >= T_C1 ? DTOP + NR * L : DTOP + run * L + (ph === 0 ? ease(clamp01(ru / 6)) * L : L); vbar(hole, ZB, -Math.max(0.05, hd2), 0.05); }
          casing.visible = holeOn; if (holeOn) vbar(casing, ZB, -Math.min(DTOP, Math.max(0.05, t < T_CAS1 ? db : DTOP)), 0.3);
          // coluna de perfuração
          const strOn = t >= T_CAS0 && t < T_OUT + 0.01 && db > 0.02; const bottom = db;
          headM.visible = mast.visible = t >= 9; if (t >= 9) { vbar(mast, ZB, 0.4, 4.9 * ease(win(t, 9, 12)) + 0.01); vbar(headM, ZB, hd - 0.3, hd + 0.3); }
          rod.visible = strOn; if (strOn) vbar(rod, ZB, -bottom + 0.4, hd);
          const coring = t >= T_C0 && t < T_OUT && run >= 0; const barUp = coring && ph >= 1 && ph <= 3 ? (ph === 1 ? ease((ru - 6) / 3.5) : ph === 2 ? 1 : 1 - ease((ru - 12.5) / 1.5)) : 0;
          const bBot = -bottom + barUp * (bottom + 0.2), bTop = bBot + 1.5;
          barrel.visible = bit.visible = coring || (t >= T_CAS0 && t < T_C0 && db > 0.1); if (barrel.visible) { if (coring) { vbar(barrel, ZB, bBot, bTop); } else { vbar(barrel, ZB, -db + 0.0, -db + 0.7); } vbar(bit, ZB, (coring ? bBot : -db) - 0.12, (coring ? bBot : -db) + 0.1); }
          cab.visible = coring && barUp > 0.01; if (cab.visible) { vbar(cab, ZB - 0.08, bTop, 4.4); }
          core.visible = coring && ph <= 1 && !(ph === 1 && barUp > 0.9); if (core.visible) { const inner = ph === 0 ? ease(clamp01(ru / 6)) * REC[run] / 100 * L : REC[run] / 100 * L; vbar(core, ZB, bBot + 0.1, bBot + 0.1 + Math.min(1.4, inner + 0.01)); }
          wtr.visible = (t >= T_CAS0 && t < T_OUT) && !(coring && ph >= 1 && ph <= 2); if (wtr.visible) vbar(wtr, ZB + 0.45, -bottom + 0.2, 0.4 + 0.5 * Math.abs(Math.sin(tAbs * 3)));
          ticks.forEach((tk, i) => { tk.visible = strOn && !(coring && ph >= 1 && ph <= 2) && db < 14.1; if (tk.visible) { const y0 = hd - 0.3 - ((i * 0.55 + tAbs * 1.6) % 3.3) - 0.2; vbar(tk, ZB, Math.min(hd - 0.3, y0), Math.min(hd - 0.3, y0 + 0.12)); } });
          // pessoas
          sond.group.visible = t >= 9; sond.group.position.set(X1 + 1.6, 0, ZB + 2.2); sond.group.rotation.y = -Math.PI / 2; sond.upper.rotation.x = 0.2 + (strOn ? 0.1 * Math.sin(tAbs * 1.5) : 0);
          ajud.group.visible = t >= T_C0 - 2; const ex = coring && ph === 2; ajud.group.position.set(X1 + 1.4, 0, ZB + 6.2 - (ex ? 0 : 0)); ajud.group.rotation.y = -Math.PI / 2; ajud.upper.rotation.x = ex ? 0.45 + 0.15 * Math.sin(tAbs * 5) : 0.1;
          pcs.forEach((g, r) => { g.visible = t >= T_C1 ? true : (r < nShown || (r === Math.max(0, run) && cur > 0.5)); });
          ruler.mesh.visible = t >= T_CAS0; bx.mesh.visible = t >= T_C0; bl.mesh.visible = t >= T_C0 + 12; rock.mesh.visible = t >= T_CAS0 + 6;
          drawBox(nShown, cur); drawLog(nShown, t >= T_C1 + 6);
          // notas
          const r1 = (x) => fmt(x, 1);
          if (t < 5) { note = 'O topógrafo marca o ponto da sondagem'; label = 'topo'; } else if (t < T_SET) { note = 'Cravando a estaca de locação'; label = 'topo'; } else if (t < T_CAS0) { note = t < 10 ? 'A sonda rotativa chega e é posicionada' : 'Tanque e bomba de água para a circulação'; label = t < 10 ? 'sonda' : 'agua'; }
          else if (t < T_CAS1) { note = `Perfurando o solo e cravando o revestimento · ${r1(db)} m de ${r1(DTOP)} m`; label = db < 3 ? 'cabec' : 'revest'; } else if (t < T_C0) { note = 'Revestimento até o topo da rocha: trocando a ferramenta pelo barrilete'; label = 'barril'; }
          else if (t < T_C1) { const a = DTOP + run * L, b = a + L; if (ph === 0) { note = `Manobra ${run + 1}: perfurando de ${r1(a)} a ${r1(b)} m · coroa girando com água`; label = ru < 3 ? 'coroa' : 'barril'; } else if (ph === 1) { note = `Manobra ${run + 1}: içando o barrilete interno com o testemunho`; label = 'cabo'; } else if (ph === 2) { note = `Manobra ${run + 1}: testemunho na caixa · REC ${REC[run]}% · RQD ${RQD[run]}%`; label = ru < 11 ? 'caixa' : (RQD[run] < 50 ? 'rec' : 'rqd'); } else { note = `Descendo o barrilete para a manobra ${Math.min(NR, run + 2)}`; label = 'barril'; } if (run === 0 && ph === 2) label = 'alt'; if (run === 3 && ph === 0 && ru > 3) label = 'sa'; }
          else if (t < T_OUT) { note = 'Retirando as hastes: furo concluído aos 14 m'; label = 'cabec'; } else if (t < T_REP + 12) { note = 'Caixa completa: cinco manobras, de 7,0 a 14,0 m'; label = 'caixa'; } else { note = `Média: REC 89% · RQD 58% (maciço ${CLS(58)})`; label = 'rqd'; }
          c.note = note; c.label = label;
        },
        idle: (t) => (t < 9 ? 'Terreno natural' : t < T_C0 ? 'Solo com revestimento' : 'Sondagem rotativa'),
        anchors(a) {
          const d = st.db; a.topo.set(X1 + 1.3, 1.6, ZB); a.sonda.set(X1 + 3.0, 3.0, ZB - 4.2); a.agua.set(X1 + 2.8, 1.5, ZB + 3.8); a.revest.set(XP, -3.0, ZB + 0.4); a.cabec.set(XP, st.hd + 0.4, ZB); a.coroa.set(XP, -d - 0.1, ZB); a.barril.set(XP, -d + 0.8, ZB + 0.2); a.cabo.set(XP, 2.0, ZB - 0.1);
          a.caixa.set(XP, -1.0, ZB + 9.5); a.rec.set(XP, -0.2, ZB + 12); a.rqd.set(XP, -0.2, ZB + 25); a.alt.set(XP, -8.3, ZB + 4); a.sa.set(XP, -12.2, ZB + 4); a.op.set(X1 + 1.6, 2.3, ZB + 2.2); a.solo.set(X1, -16, ZB);
        },
        vis: {
          topo: (t) => t < T_CAS0 - 3, sonda: (t) => t >= 8 && t < 10, agua: (t) => t >= 10 && t < T_CAS0, revest: (t) => t >= T_CAS0 + 6 && t < T_CAS1, cabec: (t) => (t >= T_CAS0 && t < T_CAS0 + 6) || (t >= T_C1 && t < T_OUT), barril: (t) => t >= T_CAS1 && t < T_C0 + 3, coroa: (t) => t >= T_C0 && t < T_C0 + 3, cabo: (t) => t >= T_C0 + 6 && t < T_C0 + 9.5, caixa: (t) => (t >= T_C0 + 9.5 && t < T_C0 + 11.5) || (t >= T_OUT && t < T_REP + 12), rec: (t) => t >= T_C0 + 11.5 && t < T_C0 + 12.5, rqd: (t) => t >= T_C0 + 2 * RUN + 11.5 && t < T_C0 + 2 * RUN + 12.5 || t >= T_REP + 12, alt: (t) => t >= T_C0 + 9.5 && t < T_C0 + 11.5 && t < T_C0 + RUN, sa: (t) => t >= T_C0 + 3 * RUN + 3 && t < T_C0 + 3 * RUN + 6, op: (t) => t > 9 && t < 12,
        },
      };
    },
  });
}
