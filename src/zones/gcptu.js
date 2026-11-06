import * as THREE from 'three';
import { createProfile, col, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { bounds } from '../scene/terrain.js';
import { X1G, ZB, GEO_G, G_BOX, textPanel } from './gspt.js';

// ---------------------------------------------------------------------------
// G4 — Ensaio CPTU (piezocone). Igual ao CPT, mas a ponteira tem um filtro poroso que mede a poropressão u2 junto à base do cone.
// Com qc, Rf e u2, o perfil identifica o solo e mostra o nível d'água e a geração de poropressão na argila.
// ---------------------------------------------------------------------------
export const G4_CAM = { tx: X1G, ty: -3.4, tz: 40, yaw: -1.3, pitch: 0.2, dist: 56 };
export const G4_MCAM = { tx: X1G, ty: -3.4, tz: 40, yaw: -1.3, pitch: 0.2, dist: 104 };
const T0 = 14, TP = 6, DM = 13, TE = T0 + TP * DM, TX = TE + 10, END = TX + 30, NSAMP = DM * 10;
export const G4_STARTS = [0, T0, 26, TE, TX];
export const G4_STEPS = [
  { t: 'Posicionamento e ancoragem', d: 'O caminhão cravador chega ao ponto e é travado por macacos, como no CPT. O CPTU é o CPT com piezocone: a ponteira, além de qc e fs, tem um elemento poroso (filtro) logo atrás do cone, ligado a um sensor de pressão. Antes de começar, o filtro é saturado com fluido desaerado, para que a leitura da poropressão seja confiável.' },
  { t: 'Cravação do piezocone', d: 'O macaco hidráulico empurra a ponteira a 2 cm por segundo, rosqueando uma haste de 1 m a cada metro. O furo não é aberto antes, e nenhuma amostra é retirada. A cravação gera três leituras contínuas ao mesmo tempo: resistência de ponta (qc), atrito lateral (fs) e poropressão na base do cone (u2).' },
  { t: 'Leituras contínuas: qc, u2 e Rf', d: 'Três gráficos crescem com a ponteira. Na argila mole, qc é baixo, Rf é alto e u2 sobe muito, pois o solo é pouco permeável e a água não consegue sair durante a cravação (excesso de poropressão). Na areia, qc é alto, Rf é baixo e u2 praticamente não passa da pressão hidrostática, já que a água escapa com facilidade.' },
  { t: 'Nível d\'água e interpretação', d: 'Abaixo do nível d\'água, na areia, u2 acompanha a reta hidrostática u0 = γw · (z − zNA); essa reta, desenhada pontilhada, mostra o nível d\'água, aqui em 9,6 m. O que sobra, u2 − u0, é o excesso de poropressão. O piezocone separa bem camadas finas de argila dentro da areia, o que o CPT comum e o SPT não conseguem.' },
  { t: 'Retirada e relatório', d: 'As hastes são retiradas e o caminhão libera o ponto. O relatório traz os três perfis (qc, u2, Rf) e a classificação do solo, usada para estimar resistência não drenada, compressibilidade e permeabilidade. Em camadas de argila, uma pausa na cravação, com leitura da dissipação de u2 no tempo, permite estimar o coeficiente de adensamento (não mostrada aqui).' },
];
export const G4_LABELS = [
  { k: 'topo', t: 'Estaca de locação' }, { k: 'caminhao', t: 'Caminhão cravador' }, { k: 'macaco', t: 'Macaco hidráulico' }, { k: 'haste', t: 'Hastes de 1 m' }, { k: 'ponteira', t: 'Piezocone (filtro poroso)' },
  { k: 'qc', t: 'Resistência de ponta (qc)' }, { k: 'rf', t: 'Razão de atrito (Rf)' }, { k: 'u2', t: 'Poropressão (u2)' }, { k: 'argila', t: 'Argila: u2 muito acima de u0' }, { k: 'areia', t: 'Areia: u2 ≈ u0' }, { k: 'na', t: 'Nível d\'água (u2 = u0)' }, { k: 'op', t: 'Operador' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const G4 = { box: G_BOX };

const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export function createG4(engine, section) {
  return createProfile(engine, section, {
    key: 'G4', labels: G4_LABELS, starts: G4_STARTS, END, yb: -14, geo: GEO_G, zo: 38, hide: 'g-inv',
    build(H) {
      const { root, bar2, stake, X1, XP } = H;
      const B = bounds(X1, ZB);
      // curvas sintéticas (exemplo didático): qc em MPa, Rf em %
      const QC = new Float32Array(NSAMP), RF = new Float32Array(NSAMP);
      for (let i = 0; i < NSAMP; i++) {
        const d = (i + 0.5) * 0.1, y = -d, w1 = sm(B.b1 - 0.25, B.b1 + 0.25, y), w2 = sm(B.b2 - 0.3, B.b2 + 0.3, y), w3 = sm(B.b3 - 0.3, B.b3 + 0.3, y), w4 = sm(B.b4 - 0.3, B.b4 + 0.3, y);
        // y decresce com a profundidade: w1 = 1 acima da base da camada 0, w2 = 1 acima da base da argila, ...
        const qcS = 2.2, qcC = 0.45 + 0.05 * d, qcA = 3.5 + (d - 6) * 1.1, qcAs = 9 + (d - 11) * 2.2, qcSi = 5;
        const rfS = 3.0, rfC = 5.2, rfA = 1.0, rfAs = 0.8, rfSi = 2.6;
        const mix = (a, b, c, e, f) => w1 * a + (1 - w1) * (w2 * b + (1 - w2) * (w3 * c + (1 - w3) * (w4 * e + (1 - w4) * f)));
        const n = 1 + 0.12 * Math.sin(d * 9.3) + 0.08 * Math.sin(d * 23.1 + 1) + 0.05 * Math.sin(d * 47);
        QC[i] = Math.max(0.15, mix(qcS, qcC, qcA, qcAs, qcSi) * n) * (d > 12.6 ? 1 + (d - 12.6) * 3 : 1);
        RF[i] = Math.max(0.4, mix(rfS, rfC, rfA, rfAs, rfSi) * (1 + 0.1 * Math.sin(d * 13 + 2)));
      }
      const U2 = new Float32Array(NSAMP), U0 = new Float32Array(NSAMP);
      for (let i = 0; i < NSAMP; i++) { const d = (i + 0.5) * 0.1, y = -d, w1 = sm(B.b1 - 0.25, B.b1 + 0.25, y), w2 = sm(B.b2 - 0.3, B.b2 + 0.3, y), w3 = sm(B.b3 - 0.3, B.b3 + 0.3, y); const nz = 1 + 0.06 * Math.sin(d * 11 + 1) + 0.04 * Math.sin(d * 29); U0[i] = Math.max(0, 9.81 * (d - Math.abs(B.naTop))); const exC = 120 + 14 * (d - 2) + 18 * Math.sin(d * 2.3), exSi = 35, exA = 4; const ex = w1 * 2 + (1 - w1) * (w2 * exC + (1 - w2) * (w3 * exA + (1 - w3) * exSi)); U2[i] = Math.max(0, U0[i] + ex * nz); }
      const QSC = 0.6, RSC = 1.2, USC = 0.035, ZQ = ZB + 0.6, ZU = ZB + 13.8, ZR = ZB + 26;
      const rfCol = (r) => (r >= 3.4 ? new THREE.Color(0xe0803a) : r >= 1.8 ? new THREE.Color(0xb59fa8) : new THREE.Color(0xe8c45a));
      const mk = (th, color, ro, em) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; root.add(m); return m; };
      const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP, (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
      const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP, y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
      const inst = (ro) => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.1, 1), noclip(0xffffff, { r: 0.6 }), NSAMP); m.frustumCulled = false; m.renderOrder = ro; m.count = 0; m.setColorAt(0, new THREE.Color(1, 1, 1)); root.add(m); return m; };
      const iq = inst(7), ir = inst(7), iu = inst(7); const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), cc = new THREE.Color();
      const setI = (im, i, z0, len, c) => { ps.set(XP, -(i + 0.5) * 0.1, z0 + len / 2); sc.set(1, 1, Math.max(0.001, len)); m4.compose(ps, q0, sc); im.setMatrixAt(i, m4); im.setColorAt(i, c); };
      let nDrawn = 0;
      const draw = (n) => { if (n === nDrawn) return; for (let i = 0; i < n; i++) { if (i < nDrawn) continue; const q = Math.min(20, QC[i]); cc.setHSL(0.58, 0.55, 0.62 - 0.22 * (q / 20)); setI(iq, i, ZQ, q * QSC, cc); setI(ir, i, ZR, Math.min(8, RF[i]) * RSC, rfCol(RF[i])); cc.setHSL(0.5, 0.7, 0.55 - 0.2 * Math.min(1, U2[i] / 300)); setI(iu, i, ZU, Math.min(300, U2[i]) * USC, cc); } nDrawn = n; iq.count = ir.count = iu.count = n; iq.instanceMatrix.needsUpdate = ir.instanceMatrix.needsUpdate = iu.instanceMatrix.needsUpdate = true; if (iq.instanceColor) iq.instanceColor.needsUpdate = ir.instanceColor.needsUpdate = iu.instanceColor.needsUpdate = true; };
      // painéis: régua, eixos
      const ruler = textPanel(1.6, 14.4, 96, 864, X1 - 0.065, -7.2, ZB - 1.4);
      { const g = ruler.g; g.fillStyle = 'rgba(20,24,30,0.55)'; g.fillRect(0, 0, 96, 864); g.fillStyle = '#fff'; g.font = '700 26px "Barlow Semi Condensed", Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
        for (let m = 1; m <= 14; m++) { const yp = m * 60; g.beginPath(); g.moveTo(66, yp); g.lineTo(96, yp); g.stroke(); g.fillText(`${m} m`, 60, yp - 14); } g.font = '700 20px Arial'; g.fillText('prof.', 60, 16); ruler.tx.needsUpdate = true; }
      root.add(ruler.mesh);
      const axis = (z0, w, label, ticks, scale) => { const px = 64, p = textPanel(w, 0.95, Math.round(w * px), 61, X1 - 0.065, -0.5, z0 + w / 2); const g = p.g; g.fillStyle = 'rgba(20,24,30,0.6)'; g.fillRect(0, 0, w * px, 61); g.fillStyle = '#fff'; g.font = '700 28px "Barlow Semi Condensed", Arial, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
        ticks.forEach((v) => g.fillText(String(v), Math.min(w * px - 16, Math.max(14, v * scale * px)), 30)); g.textAlign = 'left'; g.font = '600 22px Arial'; g.fillText(label, ticks[ticks.length - 1] * scale * px + 28, 30); p.tx.needsUpdate = true; root.add(p.mesh); return p; };
      const axQ = axis(ZQ, 12.6, 'qc (MPa)', [0, 5, 10, 15], QSC), axU = axis(ZU, 11.6, 'u2 (kPa)', [0, 100, 200], USC), axR = axis(ZR, 11.6, 'Rf (%)', [0, 2, 4, 6], RSC);
      const grids = []; for (const [z0, sc2, vs] of [[ZQ, QSC, [0, 5, 10, 15]], [ZU, USC, [0, 100, 200]], [ZR, RSC, [0, 2, 4, 6]]]) for (const v of vs) { const m = mk(v ? 0.04 : 0.09, 0xf4efe2, 4); vbar(m, z0 + v * sc2, -0.05, -13.9); grids.push(m); }
      // limites das camadas (linha tracejada fina) na interpretação
      const bnds = [B.b1, B.b2, B.naTop, B.b3].map((y, i) => { const m = mk(0.05, i === 2 ? 0x2f9bff : 0xffffff, 6); hbar(m, ZQ, ZR + 8 * RSC, y); return m; });
      const u0 = mk(0.1, 0xffffff, 9, 0x2f9bff); { const za = ZU, ya = B.naTop, zb = ZU + 9.81 * (13 - Math.abs(B.naTop)) * USC, yb2 = -13; u0.position.set(XP, (ya + yb2) / 2, (za + zb) / 2); u0.rotation.set(-Math.atan2(yb2 - ya, zb - za), 0, 0); u0.scale.z = Math.hypot(zb - za, yb2 - ya); }
      // caminhão (3D, atrás do plano)
      const tr = new THREE.Group(); const bx = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, { r: 0.7 })); m.position.set(x, y, z); m.castShadow = true; tr.add(m); return m; };
      bx(2.8, 0.8, 7.2, 0x3a3d44, 0, 1.2, 0); bx(2.6, 1.9, 2.0, 0xf4f1ea, 0, 2.3, -2.7); bx(2.8, 2.7, 4.4, 0xe9e6de, 0, 2.7, 0.9); bx(2.0, 0.4, 3.2, 0xe8742c, 0, 4.2, 0.9); bx(0.5, 0.5, 0.5, 0xe8742c, 0, 4.6, 2.6);
      for (const z of [-2.5, 1.2, 2.8]) for (const x of [-1.45, 1.45]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.55, 14), mat(0x2b2d31)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.75, z); tr.add(w); }
      const jacks = [-2.4, 3.2].map((z) => { const j = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), mat(0xe8742c)); j.position.set(1.2, 1.2, z); tr.add(j); return j; });
      tr.visible = false; root.add(tr);
      const mast = mk(0.5, 0x3a3d44, 8), headM = mk(0.7, 0xe8b300, 9, 0x3a2c00), rodM = mk(0.14, 0x9aa0a8, 8), tip = mk(0.32, 0xffc400, 10, 0x553d00), tipC = mk(0.18, 0xffc400, 10, 0x553d00);
      const ped = (c, h) => { const p = person(c, h); p.group.visible = false; root.add(p.group); return p; };
      const nota = ped(0x2f6fd0, 0xffffff), op = ped(0xe8742c, 0xf2b705); const stk = stake(X1 + 1.3, ZB, 0);
      const dep = (t) => { if (t < T0) return { d: 0, h: 4.4, m: 0 }; if (t < TE) { const m = Math.floor((t - T0) / TP), r = ((t - T0) % TP) / TP; return r < 0.8 ? { d: m + r / 0.8, h: 4.4 - r / 0.8, m } : { d: m + 1, h: 3.4 + (r - 0.8) / 0.2, m }; } if (t < TX) return { d: DM * (1 - ease(win(t, TE, TX))), h: 3.4 + (1 - ease(win(t, TE, TX))) * 1, m: DM }; return { d: 0, h: 4.4, m: DM }; };
      const st = { d: 0 };
      return {
        column(z, t, o) { const dz = Math.abs(z - ZB); o.top = 0; const c = new THREE.Color(0x6f9c50); if (t > 3 && dz < 1.6) c.lerp(new THREE.Color(0x8a6a44), 0.6 * ease(win(t, 3, 6))); o.topC.copy(c); },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null; const D = dep(t); st.d = D.d;
          // chegada: topógrafo, estaca e caminhão
          nota.group.visible = true; const wI = ease(win(t, 0, 5)); nota.group.position.set(X1 + 1.6, 0, t < 5 ? ZB - 18 + 17 * wI : t < 12 ? ZB - 1 - 7 * ease(win(t, 7, 12)) : ZB - 9); nota.group.rotation.y = t < 12 ? 0 : -Math.PI / 2; nota.upper.rotation.x = t >= 5 && t < 7 ? 0.5 + 0.2 * Math.sin(tAbs * 5) : 0.15 * Math.sin(tAbs * 1.2);
          stk.visible = t > 5.5 && t < T0; stk.scale.setScalar(ease(win(t, 5.5, 7)) + 0.001); stk.position.set(X1 + 1.3, 0, ZB);
          const dr = ease(win(t, 1, 9)); tr.visible = t > 0.8; tr.position.set(X1 + 3.4, 0, (ZB - 3.9) + 32 * (1 - dr)); tr.rotation.set(0, 0, 0);
          const jk = ease(win(t, 9, 12)); jacks.forEach((j) => { j.position.y = 1.2 - 0.9 * jk * 0 + 0; j.scale.y = 1 + 0.6 * jk; j.position.y = 1.2 - 0.3 * jk; });
          op.group.visible = t > 9; op.group.position.set(X1 + 1.6, 0, ZB - 2.6); op.group.rotation.y = -Math.PI / 2; op.upper.rotation.x = 0.25 + (t >= T0 ? 0.15 * Math.sin(tAbs * 2) : 0);
          if (t < 9) { note = t < 5 ? 'O topógrafo marca o ponto do ensaio' : t < 7 ? 'Cravando a estaca de locação' : 'O caminhão cravador chega ao ponto'; label = t < 7 ? 'topo' : 'caminhao'; }
          else if (t < T0) { note = 'Calçando o caminhão com os macacos hidráulicos'; label = 'caminhao'; }
          // mastro, cabeça e ponteira
          const on = t >= 9; mast.visible = on; if (on) vbar(mast, ZB, 0.4, 4.9 * ease(win(t, 9, 12)) + 0.01);
          const push = t >= T0 && t < TX; headM.visible = on; if (on) vbar(headM, ZB, D.h - 0.25, D.h + 0.25);
          const rodOn = t >= T0 && t < TX + 0.01 && D.d > 0.001; rodM.visible = tip.visible = tipC.visible = rodOn; if (rodOn) { vbar(rodM, ZB, -D.d + 0.45, D.h); vbar(tip, ZB, -D.d, -D.d + 0.45); vbar(tipC, ZB, -D.d - 0.22, -D.d + 0.02); }
          const n = Math.min(NSAMP, Math.floor(D.d * 10) + (t < TE ? 0 : 0)); const nn = t < TE ? n : NSAMP; draw(nn);
          const ii = Math.max(0, Math.min(NSAMP - 1, Math.floor(D.d * 10 - 0.5)));
          if (t >= T0 && t < TE) {
            const q = QC[ii], r = RF[ii], fs = q * r * 10, u = U2[ii];
            const stage = t < 26 ? 1 : t < 60 ? 2 : 3; void stage;
            note = D.d < 0.3 ? 'Ponteira encostando no solo' : `Prof. ${D.d.toFixed(1).replace('.', ',')} m · qc ${q.toFixed(1).replace('.', ',')} MPa · u2 ${Math.round(u)} kPa · Rf ${r.toFixed(1).replace('.', ',')}%`;
            label = t < 20 ? 'macaco' : t < 26 ? 'ponteira' : r >= 3.4 ? 'argila' : (r < 1.8 && q > 3) ? (D.d > 9.4 && D.d < 10.4 ? 'na' : 'areia') : 'u2';
            if (D.d > 12.4) note = `Prof. ${D.d.toFixed(1).replace('.', ',')} m · qc ${q.toFixed(0)} MPa · resistência limite do equipamento`;
          } else if (t >= TE && t < TX) { note = 'Retirando as hastes: o ensaio terminou'; label = 'haste'; }
          else if (t >= TX) { note = t < TX + 14 ? 'Reta hidrostática u0: o nível d\'água está a 9,6 m' : 'Curvas de qc, u2 e Rf prontas: perfil contínuo do solo'; label = t < TX + 14 ? 'na' : 'rf'; }
          grids.forEach((m) => (m.visible = t >= T0)); ruler.mesh.visible = axQ.mesh.visible = axU.mesh.visible = axR.mesh.visible = t >= T0; u0.visible = t >= TX + 2;
          bnds.forEach((m) => (m.visible = t >= TX + 4 && t < TX + 20));
          c.note = note; c.label = label;
        },
        idle: (t) => (t < 9 ? 'Terreno natural' : t < T0 ? 'Posicionamento' : 'Ensaio CPTU'),
        anchors(a, t) {
          const d = st.d; void t;
          a.topo.set(X1 + 1.3, 1.6, ZB); a.caminhao.set(X1 + 3.4, 5.2, tr.position.z + 0.9); a.macaco.set(XP, 3.9, ZB); a.haste.set(XP, 1.8, ZB); a.ponteira.set(XP, -d - 0.2, ZB);
          a.qc.set(XP, -Math.max(1, d) - 0.1, ZQ + Math.min(20, QC[Math.max(0, Math.min(NSAMP - 1, Math.floor(d * 10)))] || 1) * QSC); a.rf.set(XP, -Math.max(1, d) + 0.5, ZR + 3 * RSC); a.u2.set(XP, -Math.max(1, d) - 0.1, ZU + Math.min(300, U2[Math.max(0, Math.min(NSAMP - 1, Math.floor(d * 10)))] || 1) * USC); a.na.set(XP, B.naTop, ZU + 6);
          a.argila.set(XP, -4.5, ZU + 7.2); a.areia.set(XP, -11.5, ZU + 3.5); a.op.set(X1 + 1.6, 2.3, ZB - 2.6); a.solo.set(X1, -16, ZB);
        },
        vis: {
          topo: (t) => t > 5.5 && t < 7, caminhao: (t) => t > 7 && t < T0, macaco: (t) => t >= T0 && t < 20, haste: (t) => t >= TE && t < TX, ponteira: (t) => t >= 20 && t < 26, qc: (t) => t >= 26 && t < 44, u2: (t) => t >= 44 && t < 60, rf: (t) => t >= TX + 14, na: (t) => (t >= 60 && t < TE) || (t >= TX && t < TX + 14),
          argila: (t) => t >= 26 && t < TE && st.d > 2.6 && st.d < 6.6, areia: (t) => t >= 26 && t < TE && st.d > 8 && st.d < 12, op: (t) => t > 12 && t < 14,
        },
      };
    },
  });
}
