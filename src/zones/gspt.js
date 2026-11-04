import * as THREE from 'three';
import { createProfile, col, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { bounds } from '../scene/terrain.js';
import { STRATA } from '../config.js';

// ---------------------------------------------------------------------------
// G1 — Sondagem SPT. Furo até 13 m, com ensaio a cada metro: o amostrador padrão é cravado 45 cm por um martelo de 65 kg
// (queda de 75 cm); NSPT = golpes dos últimos 30 cm. Os resultados formam o gráfico de NSPT ao lado do furo.
// ---------------------------------------------------------------------------
export const X1G = 57, XEG = 104.5, ZB = 20;
export const HOLE_G = [56.5, 104.5, 5.5, 58.5];
export const G_BOX = { x0: -125, x1: X1G, z0: 6, z1: 58 };
export const GEO_G = { x1: X1G, xe: XEG, hole: HOLE_G };
export const G1_CAM = { tx: X1G, ty: -3.4, tz: 38, yaw: -1.3, pitch: 0.2, dist: 54 };
export const G1_MCAM = { tx: X1G, ty: -3.4, tz: 38, yaw: -1.3, pitch: 0.2, dist: 100 };

const NT = 13, NS = [6, 5, 3, 2, 2, 3, 7, 10, 13, 17, 23, 32, 52], T0 = 14, SC = 0.4, ZC0 = ZB + 0.6;
const split = (k) => { const N = NS[k - 1]; if (k === NT) return { n1: 30, n2: 20, n3: 0, tot: 50, pen: 0.08, N: 50 }; const n2 = Math.floor(N / 2), n3 = N - n2, n1 = Math.max(1, Math.round(N * 0.45)); return { n1, n2, n3, tot: n1 + n2 + n3, pen: 0.45, N }; };
const P = (k) => 6 + 0.26 * split(k).tot;
const TS = [0]; { let a = T0; for (let k = 1; k <= NT; k++) { TS[k] = a; a += P(k); } TS[NT + 1] = a; }
const END = Math.round(TS[NT + 1] + 16);
export const G1_STARTS = [0, T0, TS[1] + 0.3 * P(1), TS[5], TS[NT]];
export const G1_STEPS = [
  { t: 'Locação e montagem do tripé', d: 'A topografia marca o ponto da sondagem com uma estaca. A equipe (um operador, um ajudante e um anotador) chega com o tripé, a roldana, as hastes, o martelo e o amostrador. A sondagem SPT (Standard Penetration Test) é o ensaio de investigação mais usado no Brasil: com ela se descobre quais camadas existem no subsolo, quão resistentes elas são e onde está o nível d\'água.' },
  { t: 'Perfuração e coleta', d: 'O furo é aberto metro a metro. Os primeiros metros são feitos com trado manual (cavadeira); abaixo do nível d\'água ou quando o trado não avança mais, a perfuração continua por lavagem, com um jato de água que desagrega o solo. A cada metro a perfuração para e a equipe faz o ensaio.' },
  { t: 'Ensaio SPT: contar os golpes', d: 'O amostrador padrão é descido até o fundo do furo e cravado 45 cm por um martelo de 65 kg que cai de 75 cm de altura. Contam-se os golpes necessários para cada trecho de 15 cm. O primeiro trecho é de assentamento e não conta; a soma dos golpes dos dois últimos (30 cm) é o NSPT. Solo mole se deixa penetrar com poucos golpes; solo compacto, com muitos.' },
  { t: 'Perfil de NSPT e amostras', d: 'A cada metro, o NSPT vira uma barra no gráfico e o solo que ficou dentro do amostrador vai para um frasco, onde é classificado pelo tato e pela visão (argila, areia, silte) e pela cor. O gráfico mostra como a resistência varia com a profundidade; os valores baixos (barras verdes) aparecem nas camadas de argila mole, e os altos, nas areias compactas.' },
  { t: 'Fim da sondagem e relatório', d: 'A sondagem é encerrada quando o amostrador não avança mais: aqui, 50 golpes para penetrar apenas 8 cm (impenetrável ao SPT). Registram-se também o nível d\'água e as amostras. O boletim de sondagem, com perfil, NSPT e nível d\'água, é o primeiro documento que o projetista de fundações consulta.' },
];
export const G1_LABELS = [
  { k: 'topo', t: 'Estaca de locação' }, { k: 'tripe', t: 'Tripé com roldana' }, { k: 'furo', t: 'Furo de sondagem' }, { k: 'trado', t: 'Trado / lavagem' }, { k: 'martelo', t: 'Martelo 65 kg · queda 75 cm' },
  { k: 'haste', t: 'Hastes' }, { k: 'amostrador', t: 'Amostrador padrão' }, { k: 'na', t: 'Nível d\'água' }, { k: 'grafico', t: 'Gráfico de NSPT' }, { k: 'amostra', t: 'Amostras em frascos' },
  { k: 'op', t: 'Operador' }, { k: 'anota', t: 'Anotador' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const G1 = { box: G_BOX };

const NAMES = ['solo superficial', 'argila', 'areia', 'areia', 'areia saturada', 'silte', 'rocha alterada'];
const CLAY = [true, true, false, false, false, true, false];
const cons = (clay, N) => (clay ? (N <= 2 ? 'muito mole' : N <= 5 ? 'mole' : N <= 10 ? 'média' : N <= 19 ? 'rija' : 'dura') : (N <= 4 ? 'fofa' : N <= 8 ? 'pouco compacta' : N <= 18 ? 'medianamente compacta' : N <= 40 ? 'compacta' : 'muito compacta'));
const nColor = (N) => { const a = new THREE.Color(0x6fbf73), b = new THREE.Color(0xf2b705), c = new THREE.Color(0xd8332a); return N < 20 ? a.lerp(b, N / 20) : b.lerp(c, Math.min(1, (N - 20) / 30)); };

function textPanel(w, h, cw, ch, x, y, z) {
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d'); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  const m = new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, side: THREE.DoubleSide }); m.userData.noClip = true;
  const geo = new THREE.PlaneGeometry(w, h); geo.rotateY(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.renderOrder = 12; mesh.visible = false;
  return { mesh, g, tx, cv };
}

export function createG1(engine, section) {
  return createProfile(engine, section, {
    key: 'G1', labels: G1_LABELS, starts: G1_STARTS, END, yb: -14, geo: GEO_G, zo: 38, hide: 'g-inv',
    build(H) {
      const { root, surf, bar2, stake, X1, XP } = H;
      const B = bounds(X1, ZB);
      const lay = (d) => { const y = -d; return y > B.b1 ? 0 : y > B.b2 ? 1 : y > B.naTop ? 2 : y > B.b3 ? 4 : y > B.b4 ? 5 : 6; };
      const tmp = new THREE.Color();
      // --- peças planas, desenhadas no plano do corte
      const mk = (th, color, ro, em) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), noclip(color, { r: 0.6, e: em ?? 0x000000 })); m.renderOrder = ro; m.visible = false; root.add(m); return m; };
      const vbar = (m, z, y0, y1) => { m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(XP, (y0 + y1) / 2, z); m.scale.z = Math.max(0.001, Math.abs(y1 - y0)); };
      const hbar = (m, z0, z1, y) => { m.rotation.set(0, 0, 0); m.position.set(XP, y, (z0 + z1) / 2); m.scale.z = Math.max(0.001, Math.abs(z1 - z0)); };
      const holeM = mk(0.5, 0x1d1510, 5), rod = mk(0.14, 0x9aa0a8, 8), samp = mk(0.32, 0xd6dae0, 9, 0x222222), hammer = mk(0.95, 0xe8b300, 9, 0x3a2c00), rope = mk(0.05, 0x2b2d31, 8);
      const aug = mk(0.14, 0x9b6a2f, 8), bit = mk(0.45, 0x7a5a2c, 9), handle = mk(0.12, 0x6a4a22, 9), anvil = mk(0.34, 0x4a4f57, 9);
      const rigG = new THREE.Group(); root.add(rigG);
      const legs = [[-2.6, 0, 0, 6.2], [2.6, 0, 0, 6.2]].map(([dz, y0, , y1]) => { const l = bar2(ZB + dz, y0, ZB, y1, 0.2, noclip(0x6f737a, { r: 0.7 }), 8); rigG.add(l); return l; });
      const apex = mk(0.55, 0x2b2d31, 9); rigG.add(apex); vbar(apex, ZB, 6.0, 6.5); apex.visible = true; legs.forEach((l) => (l.visible = true)); rigG.visible = false;
      // escala de profundidade, grade e gráfico
      const ruler = textPanel(1.6, 14.4, 96, 864, X1 - 0.065, -7.2, ZB - 1.4);
      { const g = ruler.g; g.clearRect(0, 0, 96, 864); g.fillStyle = 'rgba(20,24,30,0.55)'; g.fillRect(0, 0, 96, 864); g.fillStyle = '#fff'; g.font = '700 26px "Barlow Semi Condensed", Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
        for (let m = 1; m <= 14; m++) { const yp = m * 60; g.beginPath(); g.moveTo(66, yp); g.lineTo(96, yp); g.stroke(); g.fillText(`${m} m`, 60, yp - 14); } g.font = '700 20px Arial'; g.fillText('prof.', 60, 16); ruler.tx.needsUpdate = true; }
      root.add(ruler.mesh);
      const axW = 22 * 1.0, axis = textPanel(axW, 0.95, 1408, 61, X1 - 0.065, -0.5, ZB + 0.6 + axW / 2 - 0.0);
      { const g = axis.g; g.fillStyle = 'rgba(20,24,30,0.6)'; g.fillRect(0, 0, 1408, 61); g.fillStyle = '#fff'; g.font = '700 28px "Barlow Semi Condensed", Arial, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
        for (let N = 0; N <= 50; N += 10) { const xp = (N * SC / axW) * 1408; g.fillText(String(N), Math.min(1392, Math.max(14, xp)), 30); }
        g.textAlign = 'left'; g.font = '600 24px Arial'; g.fillText('NSPT', (50 * SC / axW) * 1408 + 38, 30); axis.tx.needsUpdate = true; }
      root.add(axis.mesh);
      const grid = [0, 10, 20, 30, 40, 50].map((N) => { const m = mk(N ? 0.04 : 0.09, 0xf4efe2, 4); vbar(m, ZC0 + N * SC, -0.05, -13.9); return m; });
      const bars = Array.from({ length: NT }, () => mk(0.4, 0xffffff, 7, 0x111111));
      const tab = textPanel(12, 14.4, 480, 576, X1 - 0.065, -7.2, ZB + 22.8 + 6); const TG = tab.g;
      root.add(tab.mesh);
      let lastRec = -1;
      const drawTab = (rec) => {
        if (rec === lastRec) return; lastRec = rec; TG.clearRect(0, 0, 480, 576);
        for (let k = 1; k <= rec; k++) { const s = split(k), yc = (k + 0.225) * 40, li = lay(k + 0.2), lastT = k === NT;
          TG.fillStyle = 'rgba(20,24,30,0.72)'; TG.beginPath(); TG.roundRect(4, yc - 17, 472, 34, 8); TG.fill();
          const c = nColor(s.N); TG.fillStyle = `#${c.getHexString()}`; TG.font = '700 24px "Barlow Semi Condensed", Arial, sans-serif'; TG.textBaseline = 'middle'; TG.textAlign = 'left'; TG.fillText(lastT ? '>50' : `N ${s.N}`, 14, yc + 1);
          TG.fillStyle = '#fff'; TG.font = '600 19px Arial'; TG.fillText(lastT ? 'impenetrável' : `${NAMES[li]} ${cons(CLAY[li], s.N)}`, 82, yc + 1); }
        tab.tx.needsUpdate = true;
      };
      drawTab(0);
      // NA
      const naM = mk(0.1, 0x2f9bff, 9, 0x103a66), naT = mk(0.1, 0x2f9bff, 9, 0x103a66); const naTri = [mk(0.1, 0x2f9bff, 9, 0x103a66), mk(0.1, 0x2f9bff, 9, 0x103a66)];
      const naY = B.naTop; hbar(naM, ZB - 1.0, ZB + 1.0, naY); hbar(naT, ZB - 0.45, ZB + 0.45, naY - 0.28); naT.scale.z = 0.9; naTri.forEach((m) => (m.visible = false));
      // equipe e cenário (3D, atrás do plano)
      const ped = (c, h) => { const p = person(c, h); p.group.visible = false; root.add(p.group); return p; };
      const nota = ped(0x2f6fd0, 0xffffff), op = ped(0xe8742c, 0xf2b705), aj = ped(0x3a9a4a, 0xf2b705);
      const stk = stake(X1 + 1.3, ZB, 0);
      const mound = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 9), mat(0x8a6a44, { r: 1 })); mound.visible = false; mound.position.set(X1 + 1.3, 0, ZB + 1.4); root.add(mound);
      const table = new THREE.Group(); { const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 5.8), mat(0xc9b48a, { r: 0.9 })); top.position.y = 0.9; table.add(top);
        for (const dz of [-2.6, 2.6]) for (const dx of [-0.55, 0.55]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat(0x6a4a2c)); l.position.set(dx, 0.45, dz); table.add(l); } }
      table.position.set(X1 + 2.6, 0, ZB - 7.2); table.visible = false; root.add(table);
      const jars = Array.from({ length: NT }, (_, i) => { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.42, 10), mat(0xffffff, { r: 0.5 })); j.position.set(X1 + 2.6, 1.16, ZB - 9.6 + i * 0.44); j.visible = false; root.add(j);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 10), mat(0x2b2d31)); cap.position.y = 0.25; j.add(cap); return j; });
      jars.forEach((j, i) => { const li = lay(i + 1.2); tmp.set(STRATA[Math.min(li, 5)].cor); j.material.color.copy(tmp); });
      const ph = (u) => ({ a: win(u, 0, 0.2), b: win(u, 0.2, 0.3), c: win(u, 0.3, 0.88), d: win(u, 0.88, 1) });
      const hb = (t, k, u) => { if (t < T0) return 0; const s = split(k); const h0 = k === 1 ? 0 : (k - 1) + 0.45; if (u < 0.2) return h0 + (k - h0) * ease(u / 0.2); if (u < 0.3) return k; if (u < 0.88) return k + s.pen * penFrac(k, (u - 0.3) / 0.58); return k + s.pen; };
      const penFrac = (k, f) => { const s = split(k), b = s.tot * f; if (k === NT) return b / s.tot; return (Math.min(b, s.n1) / s.n1 + clamp01((b - s.n1) / s.n2) + clamp01((b - s.n1 - s.n2) / Math.max(1, s.n3))) / 3; };
      const state = { k: 0, rec: 0 };
      return {
        column(z, t, o) { const dz = Math.abs(z - ZB); o.top = 0; tmp.set(0x6f9c50); if (t > 3 && dz < 2.4) tmp.lerp(new THREE.Color(0x8a6a44), 0.7 * ease(win(t, 3, 6))); o.topC.copy(tmp); },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null, hammerLift = 0;
          // locação e montagem
          const wI = ease(win(t, 0, 5)); nota.group.visible = t < 14 ? true : true;
          const nz = t < 5 ? ZB - 18 + 17 * wI : t < 7 ? ZB - 1 : t < 12 ? ZB - 1 + 4.6 * ease(win(t, 7, 12)) : ZB + 3.6;
          nota.group.position.set(X1 + 1.6, 0, nz); nota.group.rotation.y = t < 12 ? 0 : -Math.PI / 2; nota.upper.rotation.x = t >= 5 && t < 7 ? 0.5 + 0.2 * Math.sin(tAbs * 5) : 0.15 * Math.sin(tAbs * 1.2);
          stk.visible = t > 5.5; stk.scale.setScalar(ease(win(t, 5.5, 7)) + 0.001); stk.position.set(X1 + 1.3, 0, ZB); if (t >= 14) stk.visible = false;
          if (t < 12) { note = t < 5 ? 'O topógrafo chega ao ponto da sondagem' : t < 7 ? 'Cravando a estaca de locação' : 'A equipe chega com o tripé e o equipamento'; label = t < 7 ? 'topo' : null; }
          const crew = ease(win(t, 6, 12)); op.group.visible = aj.group.visible = t > 6;
          op.group.position.set(X1 + 1.6, 0, ZB - 20 + 16.6 * crew); aj.group.position.set(X1 + 1.6, 0, ZB - 22 + 16.2 * crew); op.group.rotation.y = aj.group.rotation.y = crew < 1 ? 0 : -Math.PI / 2;
          const rg = ease(win(t, 9, 13)); rigG.visible = rg > 0.01; rigG.scale.set(1, Math.max(0.01, rg), 1); table.visible = t > 10;
          if (t >= 9 && t < 14) { note = 'Montando o tripé com a roldana'; label = 'tripe'; }
          // ensaios
          let k = 0; for (let i = 1; i <= NT; i++) if (t >= TS[i]) k = i; const inT = k >= 1 && t < TS[NT + 1]; let u = inT ? (t - TS[k]) / P(k) : 0; const s = k ? split(k) : null; const pf = k ? ph(u) : { a: 0, b: 0, c: 0, d: 0 };
          const done = k === 0 ? 0 : (inT ? k - 1 + (pf.d > 0.5 ? 1 : 0) : NT);
          drawTab(done);
          const hbNow = !k ? 0 : (!inT ? NT + 0.08 : hb(t, k, u)); const hTop = hbNow;
          holeM.visible = t >= 14; if (holeM.visible) vbar(holeM, ZB, 0, -hTop - 0.0001);
          mound.visible = t >= 14; mound.scale.set(0.5 + 0.9 * clamp01(hTop / 13), 0.15 + 0.5 * clamp01(hTop / 13), 0.5 + 0.9 * clamp01(hTop / 13));
          // ferramentas
          [aug, bit, handle, samp, rod, hammer, rope, anvil].forEach((m) => (m.visible = false));
          let tipY = 0, rodTop = 1.4, hamY = 0, hamOn = false;
          if (inT) {
            const na = hTop > naY * -1 - 0.0; const naShow = hTop >= -naY - 0.05; [naM, naT].forEach((m) => (m.visible = naShow)); void na;
            if (u < 0.2) { // perfuração
              const wash = hTop > -naY + 0.2; aug.material.color.set(wash ? 0x3d86c6 : 0x9b6a2f); bit.material.color.set(wash ? 0x3d86c6 : 0x7a5a2c);
              aug.visible = bit.visible = handle.visible = true; vbar(aug, ZB, -hTop + 0.25, 1.4); vbar(bit, ZB, -hTop - 0.1, -hTop + 0.4); hbar(handle, ZB - 0.7 * Math.cos(tAbs * 4), ZB + 0.7 * Math.cos(tAbs * 4), 1.45);
              note = k === 1 ? 'Perfurando o 1º metro com trado manual (cavadeira)' : wash ? `Perfurando por lavagem (jato de água) até ${k} m` : `Perfurando com trado até ${k} m`; label = 'trado'; nota.upper.rotation.x = 0.2; op.upper.rotation.x = 0.5 + 0.3 * Math.sin(tAbs * 4);
            } else {
              const pen = k === NT ? s.pen * (u < 0.3 ? 0 : u < 0.88 ? penFrac(k, (u - 0.3) / 0.58) : 1) : s.pen * (u < 0.3 ? 0 : u < 0.88 ? penFrac(k, (u - 0.3) / 0.58) : 1);
              if (u < 0.3) { tipY = 0.4 + (-k - 0.4) * ease(pf.b); rodTop = 1.4; }
              else if (u < 0.88) { tipY = -k - pen; rodTop = 1.4 - pen; }
              else { tipY = -k - s.pen + (k + s.pen + 0.5) * ease(pf.d); rodTop = 1.4 - s.pen * (1 - ease(pf.d)); }
              samp.visible = rod.visible = true; vbar(samp, ZB, tipY, tipY + 0.45); vbar(rod, ZB, tipY + 0.45, Math.max(rodTop, tipY + 0.5));
              hamOn = u < 0.88; anvil.visible = u < 0.88; vbar(anvil, ZB, rodTop - 0.1, rodTop + 0.05);
              if (u >= 0.3 && u < 0.88) {
                const b = s.tot * pf.c, bi = Math.min(s.tot, Math.floor(b) + 1), f = b - Math.floor(b);
                hammerLift = f < 0.6 ? 1.1 * ease(f / 0.6) : f < 0.8 ? 1.1 * (1 - ((f - 0.6) / 0.2) ** 2) : 0; if (pf.c >= 0.999) hammerLift = 0;
                const seg = bi <= s.n1 ? 1 : bi <= s.n1 + s.n2 ? 2 : 3, cnt = seg === 1 ? bi : seg === 2 ? bi - s.n1 : bi - s.n1 - s.n2;
                note = k === NT ? `Prof. ${k} m: ${bi} golpes e o amostrador quase não avança` : `Prof. ${k} m: ${seg}º trecho de 15 cm · ${cnt} golpe${cnt > 1 ? 's' : ''}${seg === 1 ? ' (assentamento)' : ''}`; label = 'martelo';
                op.upper.rotation.x = -0.7 * (hammerLift / 1.1);
              } else if (u < 0.3) { note = `Prof. ${k} m: descendo as hastes com o amostrador padrão`; label = 'amostrador'; op.upper.rotation.x = 0.3; }
              else { const li = lay(k + 0.2); note = k === NT ? 'Impenetrável ao SPT: 50 golpes para 8 cm. Fim da sondagem' : `Prof. ${k} m: ${s.n1}/${s.n2}/${s.n3} golpes · NSPT = ${s.N} · ${NAMES[li]} ${cons(CLAY[li], s.N)}`; label = 'amostra'; op.upper.rotation.x = 0.1; nota.upper.rotation.x = 0.5 + 0.2 * Math.sin(tAbs * 5); }
              if (hamOn) { hamY = rodTop + 0.4 + hammerLift; hammer.visible = rope.visible = true; vbar(hammer, ZB, hamY - 0.4, hamY + 0.4); vbar(rope, ZB, hamY + 0.4, 6.0); }
            }
          } else if (t >= TS[NT + 1]) { note = 'Sondagem concluída: perfil de NSPT e amostras para o relatório'; label = 'grafico'; }
          for (let i = 0; i < NT; i++) { const kk = i + 1, sp = split(kk); let g = 0; if (inT) g = kk < k ? 1 : kk === k ? ease(pf.d) : 0; else if (t >= TS[NT + 1]) g = 1; const len = Math.max(0.001, Math.min(50, sp.N) * SC * g); bars[i].visible = g > 0.01; hbar(bars[i], ZC0, ZC0 + len, -(kk + 0.225)); bars[i].material.color.copy(nColor(sp.N)); bars[i].material.emissive.copy(nColor(sp.N)).multiplyScalar(0.25);
            jars[i].visible = inT ? (kk < k || (kk === k && pf.d > 0.6)) : t >= TS[NT + 1]; }
          grid.forEach((m) => (m.visible = t >= 14)); ruler.mesh.visible = axis.mesh.visible = tab.mesh.visible = t >= 14;
          if (!label && t >= 14 && !inT) label = null;
          c.note = note; c.label = label; state.k = k;
          // âncoras guardadas
          state.tip = tipY; state.ham = hamY; state.hole = hTop; state.k = k; state.lastBar = Math.max(0, Math.min(50, k ? split(Math.max(1, k - (inT && pf.d < 0.5 ? 1 : 0))).N : 0));
        },
        idle: (t) => (t < 6 ? 'Terreno natural' : t < 14 ? 'Montagem do equipamento' : 'Sondagem SPT'),
        anchors(a, t) {
          const k = Math.max(1, state.k || 1); void t;
          a.topo.set(X1 + 1.3, 1.6, ZB); a.tripe.set(XP, 6.6, ZB + 0.6); a.furo.set(XP, -0.4, ZB); a.trado.set(XP, 1.6, ZB); a.martelo.set(XP, (state.ham || 2) + 0.9, ZB); a.haste.set(XP, 0.9, ZB);
          a.amostrador.set(XP, (state.tip ?? -1) + 0.2, ZB); a.na.set(XP, B.naTop - 0.6, ZB + 1.4); a.grafico.set(XP, -(Math.max(1, state.k) + 0.225), ZC0 + Math.min(50, (state.lastBar || 10)) * SC);
          a.amostra.set(X1 + 2.6, 1.8, ZB - 7.2); a.op.set(X1 + 1.6, 2.3, op.group.position.z); a.anota.set(X1 + 1.6, 2.3, nota.group.position.z); a.solo.set(X1, -16, ZB);
        },
        vis: {
          topo: (t) => t > 5.5 && t < 7, tripe: (t) => t > 9 && t < 14, furo: (t) => t > 14.5 && t < 17, trado: (t) => t >= 14 && t < 14 + 0.2 * P(1), martelo: (t) => t >= TS[1] + 0.3 * P(1) && t < TS[1] + 0.88 * P(1), haste: (t) => t >= TS[1] + 0.3 * P(1) && t < TS[1] + 0.4 * P(1),
          amostrador: (t) => t >= TS[1] + 0.2 * P(1) && t < TS[1] + 0.3 * P(1), na: (t) => t >= TS[10] + 0.2 * P(10), grafico: (t) => t >= TS[3] && t < TS[3] + 5, amostra: (t) => t >= TS[1] + 0.9 * P(1) && t < TS[1] + P(1) + 3, op: (t) => t > TS[2] && t < TS[2] + 3, anota: (t) => t > TS[2] + 3 && t < TS[2] + 6,
        },
      };
    },
  });
}
