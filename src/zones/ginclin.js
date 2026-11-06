import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { createProfile, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { X1G, ZB, GEO_G, G_BOX, textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// G12 — Inclinômetro. Um tubo-guia com ranhuras é instalado num furo de 14 m, ao pé de um aterro sobre a argila, e chumbado
// com calda de cimento e bentonita. Uma sonda (torpedo) desce pelo tubo e mede a inclinação a cada 0,5 m; a diferença
// entre cada leitura e a leitura zero dá o deslocamento horizontal do solo com a profundidade. O aterro sobe em três etapas,
// a argila é empurrada para o lado e o tubo se deforma (ampliado na animação). Valores de exemplo, não são de projeto.
// ---------------------------------------------------------------------------
export const G12_CAM = { tx: X1G, ty: -3.2, tz: 36, yaw: -1.3, pitch: 0.2, dist: 68 };
export const G12_MCAM = { tx: X1G, ty: -3.6, tz: 26, yaw: -1.3, pitch: 0.2, dist: 112 };
const ZT = ZB + 2, DEP = 14, STEP = 0.5, NSEG = DEP / STEP, EXA = 0.045;               // tubo em z = 22, leituras a cada 0,5 m
const TOE = 25, CREST1 = 37, S1 = 2, S2 = 1.75, HS = [1.4, 2.7, 4.0];                     // aterro: pé, fim da crista, taludes 1:2 e 1:1,75
const ZPK = 4.6, SIG = 1.9, D = [0, 7, 16, 27, 30];                                        // máximo a 4,6 m (na argila); deslocamentos por leitura (mm)
const T_DR0 = 8, T_DR1 = 20, T_TB1 = 27, T_GR1 = 31, T_Z0 = 34, T_Z1 = 46, T_S0 = 47, SP = 16, FILL = 8, T_W = 95, T_F0 = 99, T_F1 = 107, END = 130;
const RD = [[T_Z0, T_Z1], ...[0, 1, 2].map((k) => [T_S0 + SP * k + 10, T_S0 + SP * k + 16]), [T_F0, T_F1]];   // janelas das cinco leituras
const shape = (dep) => (dep >= 12 ? 0 : Math.exp(-(((dep - ZPK) / SIG) ** 2)));
const fmt = (v, n = 1) => v.toFixed(n).replace('.', ',');
const CLR = ['#ffffff', '#6fdc8c', '#ffd166', '#ff9f43', '#ff6b6b'];
const RNM = ['Leitura zero', 'Após a 1ª etapa', 'Após a 2ª etapa', 'Após a 3ª etapa', 'Final (30 dias)'];
export const G12_STARTS = [0, T_DR0 - 1, T_Z0 - 2, T_S0, T_F1];
export const G12_STEPS = [
  { t: 'Locação', d: 'O topógrafo marca o ponto do inclinômetro, ao pé de onde será construído um aterro sobre a argila mole. O inclinômetro mede o deslocamento horizontal do solo em profundidade: mostra onde o terreno está se movendo, quanto e com que velocidade. É o instrumento usado em aterros sobre solo mole, encostas, escavações e barragens, onde uma ruptura começa como um movimento lento, invisível na superfície.' },
  { t: 'Furo, tubo-guia e calda', d: 'Uma sonda abre um furo de 14 m, que atravessa a argila e termina no silte, abaixo de qualquer movimento esperado: o pé do tubo precisa ficar fixo, porque é a referência das leituras. Desce-se um tubo-guia de plástico com quatro ranhuras internas, em cruz, e uma delas é alinhada na direção em que se espera o movimento (para fora do aterro). O espaço entre o tubo e o furo é preenchido com calda de cimento e bentonita, que faz o tubo se mover junto com o solo.' },
  { t: 'Leitura zero', d: 'O técnico desce a sonda inclinométrica (o torpedo), com rodinhas que correm nas ranhuras, até o fundo. Depois a sobe parando a cada 0,5 m: em cada parada, a sonda mede a inclinação do tubo naquele trecho, e a unidade de leitura registra. Somando as inclinações de baixo para cima obtém-se a forma do tubo. Essa primeira leitura, feita antes de qualquer carga, é a leitura zero: todas as próximas são comparadas com ela.' },
  { t: 'Aterro em etapas e leituras', d: 'O aterro sobe em três etapas (1,4, 2,7 e 4,0 m). A cada etapa, o peso aumenta e a argila sob o aterro é espremida para o lado, empurrando o tubo para fora. Depois de cada etapa faz-se uma nova leitura, e o gráfico de deslocamento x profundidade ganha mais uma curva. Na animação, o deslocamento do tubo está ampliado 45 vezes.' },
  { t: 'Interpretação', d: 'As curvas mostram o deslocamento concentrado na argila, com o máximo de 30 mm a 4,6 m de profundidade. Abaixo de 10 m o tubo não se move, o que confirma que o pé está fixo e as leituras valem. O deslocamento cresce a cada etapa e quase para entre elas (só 3 mm em 30 dias depois da última): o aterro está estável. Se o deslocamento continuasse crescendo sem carga nova, ou acelerasse, seria sinal de ruptura em formação, e a obra pararia até reforçar o aterro (berma, drenos ou espera para o adensamento).' },
];
export const G12_LABELS = [
  { k: 'topo', t: 'Estaca de locação' }, { k: 'sonda', t: 'Sonda de perfuração' }, { k: 'tubo', t: 'Tubo-guia com ranhuras' }, { k: 'calda', t: 'Calda de cimento e bentonita' }, { k: 'pe', t: 'Pé fixo no silte (referência)' },
  { k: 'torp', t: 'Sonda inclinométrica (torpedo)' }, { k: 'leit', t: 'Unidade de leitura' }, { k: 'aterro', t: 'Aterro em etapas' }, { k: 'rolo', t: 'Rolo compactador' }, { k: 'cam', t: 'Caminhão basculante' },
  { k: 'argila', t: 'Argila empurrada para o lado' }, { k: 'graf', t: 'Deslocamento x profundidade' }, { k: 'max', t: 'Máximo na argila: 30 mm' }, { k: 'op', t: 'Técnico' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const G12 = { box: G_BOX };

// altura do aterro em z para uma altura de crista h
const emb = (z, h) => { if (h <= 0.001) return 0; const a = TOE, b = TOE + S1 * h, c = CREST1, d = CREST1 + S2 * h; if (z <= a || z >= d) return 0; if (z < b) return (z - a) / S1; if (z <= c) return h; return h - (z - c) / S2; };
// altura de crista e deslocamento máximo (mm) no tempo t
const hAt = (t) => { let h = 0; for (let k = 0; k < 3; k++) { const a = T_S0 + SP * k; h = t < a ? h : (k ? HS[k - 1] : 0) + ((HS[k] - (k ? HS[k - 1] : 0)) * ease(win(t, a, a + FILL))); } return h; };
const dAt = (t) => {
  let d = 0;
  for (let k = 0; k < 3; k++) { const a = T_S0 + SP * k, b = a + FILL; if (t >= a) d = D[k] + (D[k + 1] - D[k]) * (0.85 * ease(win(t, a, b)) + 0.15 * ease(win(t, b, b + 2))); }
  if (t >= T_W) d = D[3] + (D[4] - D[3]) * ease(win(t, T_W, T_F0));
  return d;
};

export function createG12(engine, section) {
  return createProfile(engine, section, {
    key: 'G12', labels: G12_LABELS, starts: G12_STARTS, END, yb: -14, geo: GEO_G, zo: 50, hide: 'g-inv',
    build(H) {
      const { root, stake, place, X1, XP } = H;
      const mk = (th, color, ro, em, dx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; m.userData.dx = dx; root.add(m); return m; };
      const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP - (m.userData.dx || 0), (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
      const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP - (m.userData.dx || 0), y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
      const sbar = (m, za, ya, zb, yb) => { m.position.set(XP - (m.userData.dx || 0), (ya + yb) / 2, (za + zb) / 2); m.rotation.set(-Math.atan2(yb - ya, zb - za), 0, 0); m.scale.z = Math.max(0.001, Math.hypot(zb - za, yb - ya)); };
      const zOf = (dep, d) => ZT - EXA * d * shape(dep);                                    // posição do tubo deformado
      // furo, calda e tubo em segmentos de 0,5 m (deformam juntos)
      const hole = mk(0.8, 0x1b1a1d, 6, 0, 0.006);
      const grout = Array.from({ length: NSEG }, () => mk(0.8, 0xb8b2a6, 7, 0x262420, 0.008));
      const tube = Array.from({ length: NSEG }, () => mk(0.34, 0x3d86d6, 9, 0x0c2a4a, 0.014));
      const tubeTop = mk(0.34, 0x3d86d6, 9, 0x0c2a4a, 0.014), cap = mk(0.5, 0x2a2d33, 10, 0, 0.016);
      const probe = mk(0.26, 0xf2b705, 12, 0x4a3500, 0.022), cable = mk(0.05, 0x222222, 11, 0, 0.02), pulley = mk(0.4, 0x8a8f96, 11, 0x111111, 0.02);
      const rodD = mk(0.18, 0xc6cbd2, 10, 0x222222, 0.018), bitD = mk(0.6, 0xe8b300, 10, 0x4a3500, 0.02);
      const arrows = Array.from({ length: 3 }, () => ({ s: mk(0.12, 0xfff1d6, 12, 0x553300, 0.024), a: mk(0.12, 0xfff1d6, 12, 0x553300, 0.024), b: mk(0.12, 0xfff1d6, 12, 0x553300, 0.024) }));
      const ruler = textPanel(1.6, 14.4, 96, 864, X1 - 0.065, -7.2, ZT - 1.5);
      { const g = ruler.g; g.fillStyle = 'rgba(20,24,30,0.55)'; g.fillRect(0, 0, 96, 864); g.fillStyle = '#fff'; g.font = '700 26px "Barlow Semi Condensed", Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; for (let m = 1; m <= 14; m++) { const yp = m * 60; g.beginPath(); g.moveTo(66, yp); g.lineTo(96, yp); g.stroke(); g.fillText(`${m} m`, 60, yp - 14); } g.font = '700 20px Arial'; g.fillText('prof.', 60, 16); ruler.tx.needsUpdate = true; }
      root.add(ruler.mesh);
      // gráfico deslocamento x profundidade
      const CW = 11.2, CH = 10.4, U = 48, ch = textPanel(CW, CH, CW * U, CH * U, X1 - 0.065, -0.6 - CH / 2, ZT - 2.6 - CW / 2), CG = ch.g; let lastK = '';
      const drawChart = (nDone, cur, curDep, fin) => {
        const key = `${nDone}|${cur}|${Math.round(curDep * 2)}|${fin}`; if (key === lastK) return; lastK = key;
        const W = CW * U, Hh = CH * U, x0 = 58, x1 = W - 18, y0 = 54, y1 = Hh - 70, X = (mm) => x0 + (x1 - x0) * mm / 35, Y = (dp) => y0 + (y1 - y0) * dp / DEP;
        CG.clearRect(0, 0, W, Hh); CG.fillStyle = 'rgba(20,24,30,0.78)'; CG.beginPath(); CG.roundRect(0, 0, W, Hh, 14); CG.fill();
        CG.fillStyle = '#fff'; CG.font = '700 18px Arial'; CG.textAlign = 'left'; CG.fillText('Deslocamento horizontal x profundidade', 14, 24);
        CG.fillStyle = 'rgba(201,113,74,0.22)'; CG.fillRect(x0, Y(2.3), x1 - x0, Y(6.8) - Y(2.3)); CG.fillStyle = '#f0a27c'; CG.font = '600 13px Arial'; CG.textAlign = 'right'; CG.fillText('argila', x1 - 6, Y(2.3) + 16);
        CG.strokeStyle = 'rgba(255,255,255,0.22)'; CG.lineWidth = 1; CG.fillStyle = '#fff'; CG.font = '600 14px Arial';
        CG.textAlign = 'right'; for (let dp = 0; dp <= DEP; dp += 2) { CG.fillText(`${dp}`, x0 - 8, Y(dp) + 5); CG.beginPath(); CG.moveTo(x0, Y(dp)); CG.lineTo(x1, Y(dp)); CG.stroke(); }
        CG.textAlign = 'center'; for (let mm = 0; mm <= 30; mm += 10) { CG.fillText(`${mm}`, X(mm), y1 + 20); CG.beginPath(); CG.moveTo(X(mm), y0); CG.lineTo(X(mm), y1); CG.stroke(); }
        CG.fillStyle = '#9fd2ff'; CG.font = '600 14px Arial'; CG.textAlign = 'left'; CG.fillText('prof. (m)', 6, 44); CG.textAlign = 'right'; CG.fillText('deslocamento (mm), para fora do aterro', x1, y1 + 40);
        const curve = (i, depFrom) => { CG.strokeStyle = CLR[i]; CG.lineWidth = i === 0 ? 2 : 3.5; CG.beginPath(); let first = true; for (let dp = DEP; dp >= depFrom - 1e-6; dp -= STEP) { const x = X(D[i] * shape(dp)), y = Y(dp); if (first) { CG.moveTo(x, y); first = false; } else CG.lineTo(x, y); } CG.stroke(); };
        for (let i = 0; i < nDone; i++) curve(i, 0);
        if (cur >= 0) { curve(cur, curDep); CG.fillStyle = CLR[cur]; CG.beginPath(); CG.arc(X(D[cur] * shape(curDep)), Y(curDep), 5, 0, 7); CG.fill(); }
        CG.font = '700 13px Arial'; CG.textAlign = 'left'; const shown = Math.max(nDone, cur + 1);
        for (let i = 0; i < shown; i++) { CG.fillStyle = CLR[i]; CG.fillRect(x0 + 130, Y(8.4) + i * 20, 14, 4); CG.fillText(`${RNM[i]}${i ? ` · ${D[i]} mm` : ''}`, x0 + 150, Y(8.4) + 6 + i * 20); }
        if (fin) { const xm = X(D[4]), ym = Y(ZPK); CG.strokeStyle = '#fff'; CG.setLineDash([5, 4]); CG.lineWidth = 2; CG.beginPath(); CG.moveTo(x0, ym); CG.lineTo(xm, ym); CG.stroke(); CG.setLineDash([]); CG.fillStyle = '#fff'; CG.font = '700 15px Arial'; CG.textAlign = 'right'; CG.fillText(`máx. ${D[4]} mm a ${fmt(ZPK)} m`, x1 - 6, Y(7.3)); CG.textAlign = 'left'; CG.fillStyle = '#cfe8ff'; CG.font = '600 14px Arial'; CG.fillText('abaixo de 10 m: zero (pé fixo)', x0 + 8, Y(13.7)); }
        ch.tx.needsUpdate = true;
      };
      root.add(ch.mesh); drawChart(0, -1, DEP, false);
      // 3D: sonda de perfuração, unidade de leitura, caminhão e rolo
      const rig = new THREE.Group(); const bxx = (w, h, d, c, x, y, z, g = rig) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, { r: 0.7 })); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
      bxx(2.2, 0.35, 3.8, 0x3a3d44, 0, 0.3, 0); bxx(2.0, 1.4, 1.5, 0x2f9c5a, 0, 1.15, -1.0); bxx(0.15, 4.0, 0.15, 0x555a60, 0.8, 2.4, 0.9); bxx(0.15, 4.0, 0.15, 0x555a60, -0.8, 2.4, 0.9); bxx(1.8, 0.2, 0.3, 0x555a60, 0, 4.4, 0.9);
      rig.visible = false; root.add(rig);
      const unit = new THREE.Group(); bxx(0.7, 0.45, 0.5, 0xf2b705, 0, 0.23, 0, unit); bxx(0.45, 0.3, 0.05, 0x1d3a52, 0.05, 0.5, 0.26, unit); bxx(0.3, 0.3, 0.3, 0x2b2d31, 0, 0.62, -0.1, unit); unit.visible = false; root.add(unit);
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 14), mat(0xe8742c)); reel.rotation.z = Math.PI / 2; reel.position.set(0, 0.95, -0.1); unit.add(reel);
      const truck = M.dumpTruck(0xe8b300); truck.scale.setScalar(0.75); truck.visible = false; root.add(truck);
      const load = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1, 2.4), mat(0x9b7650, { r: 1 })); load.position.set(2.1, 0.15, 0); truck.userData.bed?.add(load);
      const roller = M.roller(); roller.scale.setScalar(0.65); roller.visible = false; root.add(roller);
      const ped = (c, h) => { const p = person(c, h); p.group.visible = false; root.add(p.group); return p; };
      const topo = ped(0x2f6fd0, 0xffffff), oper = ped(0xe8742c, 0xf2b705), tech = ped(0x2f9c5a, 0xf2b705), stk = stake(X1 + 1.3, ZT, 0);
      const st = { h: 0, d: 0, pd: 0, tz: ZT, cz: 31 };
      const fillC = [new THREE.Color(0xa27c52), new THREE.Color(0x8f6a45), new THREE.Color(0xa88458)];
      return {
        column(z, t, o) {
          const h = hAt(t); o.top = emb(z, h); const c = new THREE.Color(0x6f9c50);
          if (o.top > 0.01) c.set(0x9b7650); else if (t > 4 && Math.abs(z - ZT) < 1.4) c.lerp(new THREE.Color(0x8a6a44), 0.6 * ease(win(t, 4, 7)));
          o.topC.copy(c);
          for (let k = 0; k < 3; k++) { const lo = k ? emb(z, Math.min(h, HS[k - 1])) : 0, hi = emb(z, Math.min(h, HS[k])); if (h > (k ? HS[k - 1] : 0) && hi > lo) { o.lo[k] = lo; o.hi[k] = hi; o.c[k].copy(fillC[k]); } }
        },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null;
          const h = hAt(t), d = dAt(t); st.h = h; st.d = d;
          // pessoas e locação
          topo.group.visible = t < T_DR0 + 2; const wI = ease(win(t, 0, 5)); topo.group.position.set(X1 + 1.6, 0, t < 5 ? ZT - 18 + 15 * wI : ZT - 3); topo.group.rotation.y = t < 5 ? 0 : -Math.PI / 2; topo.upper.rotation.x = t >= 5 && t < 7 ? 0.5 + 0.2 * Math.sin(tAbs * 5) : 0.1 * Math.sin(tAbs * 1.2);
          stk.visible = t > 5 && t < T_DR0 + 1; stk.scale.setScalar(ease(win(t, 5, 6.5)) + 0.001); stk.position.set(X1 + 1.3, 0, ZT);
          const rin = ease(win(t, 1, 7)), rout = ease(win(t, T_GR1, T_GR1 + 3)); rig.visible = t > 1 && t < T_GR1 + 3; rig.position.set(X1 + 2.6, 0, ZT - 0.9 - 26 * (1 - rin) - 26 * rout);
          oper.group.visible = t > 7 && t < T_GR1 + 1; oper.group.position.set(X1 + 1.5, 0, ZT + 2.2); oper.group.rotation.y = -Math.PI / 2; oper.upper.rotation.x = 0.25 + 0.1 * Math.sin(tAbs * 2);
          // furo
          const dd = DEP * ease(win(t, T_DR0, T_DR1)); hole.visible = t >= T_DR0 && t < T_TB1 + 1; if (hole.visible) vbar(hole, ZT, -Math.max(0.05, t < T_DR1 ? dd : DEP), 0.02);
          const drilling = t >= T_DR0 && t < T_DR1 + 0.5; rodD.visible = bitD.visible = drilling; if (drilling) { vbar(rodD, ZT, -dd + 0.3, 4.2); vbar(bitD, ZT, -dd - 0.05, -dd + 0.35); }
          // tubo (desce de cima para baixo) e calda (sobe do fundo)
          const tl = t < T_DR1 ? 0 : DEP * ease(win(t, T_DR1 + 0.5, T_TB1)), gl = t < T_TB1 ? 0 : DEP * ease(win(t, T_TB1, T_GR1));
          for (let i = 0; i < NSEG; i++) {
            const a = i * STEP, b = a + STEP, za = zOf(a, d), zb = zOf(b, d);
            tube[i].visible = t >= T_DR1 && (t >= T_TB1 || b <= tl + 1e-6); if (tube[i].visible) sbar(tube[i], za, -a, zb, -b);
            grout[i].visible = t >= T_TB1 && DEP - gl <= a + 1e-6; if (grout[i].visible) sbar(grout[i], za, -a, zb, -b);
          }
          tubeTop.visible = cap.visible = t >= T_DR1; if (tubeTop.visible) { vbar(tubeTop, ZT, -0.02, 0.45); vbar(cap, ZT, 0.42, 0.55); }
          // leituras
          let rIdx = -1, pd = 0; for (let i = 0; i < RD.length; i++) { const [a, b] = RD[i]; if (t >= a && t < b) { rIdx = i; const down = Math.min(3, (b - a) * 0.3); pd = t < a + down ? DEP * ease((t - a) / down) : DEP * (1 - (t - a - down) / (b - a - down)); if (t >= a + down) pd = Math.round(pd / STEP) * STEP; } }
          st.pd = pd; const nDone = RD.filter(([, b]) => t >= b).length;
          const reading = rIdx >= 0; probe.visible = reading; cable.visible = pulley.visible = t >= T_Z0 - 1 && t < T_F1 + 1;
          if (reading) { const zp = zOf(pd, d); vbar(probe, zp, -pd - 0.35, -pd + 0.35); st.tz = zp; }
          if (cable.visible) { vbar(cable, ZT, 0.55, 1.35); vbar(pulley, ZT, 1.3, 1.55); }
          tech.group.visible = t >= T_Z0 - 3; tech.group.position.set(X1 + 1.5, 0, ZT - 2.4); tech.group.rotation.y = -Math.PI / 2; tech.upper.rotation.x = reading ? 0.45 + 0.08 * Math.sin(tAbs * 3) : 0.1;
          unit.visible = t >= T_Z0 - 3; unit.position.set(X1 + 1.2, 0, ZT - 1.2); unit.rotation.y = -Math.PI / 2; reel.rotation.x = reading ? tAbs * (pd > 0 ? 2 : 0) : 0;
          ruler.mesh.visible = t >= T_DR0; ch.mesh.visible = t >= T_Z0; drawChart(nDone, rIdx, pd, t >= T_F1);
          // aterro: caminhão e rolo
          let tkOn = false, rlOn = false, k = -1; for (let j = 0; j < 3; j++) { const a = T_S0 + SP * j; if (t >= a && t < a + FILL + 1) k = j; }
          const zc = (TOE + S1 * Math.max(h, 0.4) + CREST1) / 2; st.cz = zc;
          if (k >= 0) { const a = T_S0 + SP * k, u = (t - a) / (FILL + 1);
            if (u < 0.5) { tkOn = true; const f = u / 0.5; place(truck, X1 + 34 - 22 * Math.min(1, f * 1.6), zc, Math.PI, 0.02); if (truck.userData.bed) truck.userData.bed.rotation.z = f > 0.65 ? 0.5 * ease((f - 0.65) / 0.35) : 0; load.visible = f < 0.85; }
            else { rlOn = true; const f = (u - 0.5) / 0.5, pp = Math.min(2, Math.floor(f * 3)), q = f * 3 - pp; place(roller, X1 + 8 + 26 * (pp % 2 === 0 ? q : 1 - q), zc - 1.2 + pp * 1.2, pp % 2 === 0 ? 0 : Math.PI); } }
          truck.visible = tkOn; roller.visible = rlOn;
          // setas: argila espremida para o lado durante o carregamento
          const pushing = k >= 0 || (t >= T_W && t < T_F0); arrows.forEach((ar, i) => { const on = pushing && h > 0.3; ar.s.visible = ar.a.visible = ar.b.visible = on; if (!on) return; const y = -3.4 - i * 1.1, ph = (tAbs * 0.8 + i * 0.33) % 1, z1 = TOE + 6 - ph * 2.5, z0 = z1 + 2.2; hbar(ar.s, z1, z0, y); sbar(ar.a, z1, y, z1 + 0.5, y + 0.35); sbar(ar.b, z1, y, z1 + 0.5, y - 0.35); });
          // legenda
          if (t < 5) { note = 'O topógrafo marca o ponto do inclinômetro, ao pé do futuro aterro'; label = 'topo'; } else if (t < T_DR0) { note = 'Estaca de locação: a sonda de perfuração chega'; label = t < 6.5 ? 'topo' : 'sonda'; }
          else if (t < T_DR1) { note = `Perfurando: ${fmt(dd)} m de ${DEP} m, até o silte`; label = dd < 9 ? 'sonda' : 'pe'; } else if (t < T_TB1) { note = 'Descendo o tubo-guia com quatro ranhuras, alinhadas ao aterro'; label = 'tubo'; }
          else if (t < T_GR1) { note = 'Calda de cimento e bentonita preenchendo o furo, de baixo para cima'; label = 'calda'; } else if (t < T_Z0) { note = 'A calda endurece: o tubo passa a se mover junto com o solo'; label = 'tubo'; }
          else if (rIdx === 0) { note = pd >= DEP - 0.01 || t < T_Z0 + 3 ? 'Leitura zero: descendo o torpedo até o fundo' : `Leitura zero: prof. ${fmt(pd)} m · inclinação registrada a cada 0,5 m`; label = t < T_Z0 + 4 ? 'torp' : 'leit'; }
          else if (t < T_S0) { note = 'Leitura zero gravada: a forma inicial do tubo'; label = 'graf'; }
          else if (k >= 0) { note = `${k + 1}ª etapa do aterro: subindo para ${fmt(HS[k])} m · deslocamento máx. ${fmt(d, 0)} mm`; const a = T_S0 + SP * k, u = (t - a) / (FILL + 1); label = u < 0.5 ? (k === 0 ? 'cam' : 'aterro') : (k === 1 ? 'argila' : 'rolo'); if (k === 0 && u > 0.7) label = 'argila'; }
          else if (rIdx >= 1 && rIdx <= 3) { note = `${RNM[rIdx]}: prof. ${fmt(pd)} m · desloc. ${fmt(D[rIdx] * shape(pd), 1)} mm`; label = 'torp'; }
          else if (t < T_W) { note = 'Etapa concluída: o aterro para e a argila se acomoda antes da leitura'; label = 'graf'; }
          else if (t < T_F0) { note = 'Aterro pronto: 30 dias de espera, o adensamento continua devagar'; label = 'argila'; }
          else if (rIdx === 4) { note = `Leitura final: prof. ${fmt(pd)} m · desloc. ${fmt(D[4] * shape(pd), 1)} mm`; label = 'torp'; }
          else if (t < T_F1 + 10) { note = `Máximo de ${D[4]} mm a ${fmt(ZPK)} m, dentro da argila`; label = 'max'; }
          else { note = 'Só 3 mm nos 30 dias finais e pé fixo: aterro estável'; label = 'pe'; }
          c.note = note; c.label = label;
        },
        idle: (t) => (t < T_DR0 ? 'Terreno natural' : t < T_Z0 ? 'Instalação do inclinômetro' : 'Monitoramento'),
        anchors(a) {
          a.topo.set(X1 + 1.3, 1.6, ZT); a.sonda.set(X1 + 2.6, 4.8, ZT - 0.9); a.tubo.set(XP, -2.0, zOf(2, st.d) + 0.2); a.calda.set(XP, -8.5, ZT + 0.4); a.pe.set(XP, -13.2, ZT + 0.3);
          a.torp.set(XP, -st.pd + 0.2, st.tz + 0.2); a.leit.set(X1 + 1.2, 1.4, ZT - 1.2); a.aterro.set(XP, st.h + 0.6, (TOE + S1 * st.h + CREST1) / 2); a.rolo.set(roller.position.x, roller.position.y + 2.6, roller.position.z); a.cam.set(truck.position.x, truck.position.y + 3.6, truck.position.z);
          a.argila.set(XP, -4.5, TOE + 5); a.graf.set(XP, -1.6, ZT - 8.2); a.max.set(XP, -ZPK, zOf(ZPK, st.d)); a.op.set(X1 + 1.5, 2.3, ZT - 2.4); a.solo.set(X1, -16, ZB);
        },
        vis: {
          topo: (t) => t < 6.5, sonda: (t) => (t >= 6.5 && t < 14), pe: (t) => (t >= 14 && t < T_DR1) || t >= T_F1 + 10, tubo: (t) => (t >= T_DR1 && t < T_TB1) || (t >= T_GR1 && t < T_Z0), calda: (t) => t >= T_TB1 && t < T_GR1,
          torp: (t) => RD.some(([a, b], i) => t >= a && t < (i ? b : a + 4)), leit: (t) => t >= T_Z0 + 4 && t < T_Z1, graf: (t) => (t >= T_Z1 && t < T_S0) || [0, 1, 2].some((k) => t >= T_S0 + SP * k + FILL + 1 && t < T_S0 + SP * k + 10),
          aterro: (t) => [1, 2].some((k) => t >= T_S0 + SP * k && t < T_S0 + SP * k + (FILL + 1) / 2), cam: (t) => t >= T_S0 && t < T_S0 + (FILL + 1) / 2, rolo: (t) => t >= T_S0 + SP * 2 + (FILL + 1) / 2 && t < T_S0 + SP * 2 + FILL + 1,
          argila: (t) => (t >= T_S0 + (FILL + 1) * 0.7 && t < T_S0 + FILL + 1) || (t >= T_S0 + SP + (FILL + 1) / 2 && t < T_S0 + SP + FILL + 1) || (t >= T_W && t < T_F0), max: (t) => t >= T_F1 && t < T_F1 + 10, op: (t) => t >= T_Z0 - 3 && t < T_Z0,
        },
      };
    },
  });
}
