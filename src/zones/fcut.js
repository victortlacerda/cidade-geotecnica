import * as THREE from 'three';
import { REMOTE_DZ } from '../config.js';
import * as M from '../kit/machines.js';
import { createProfile, col, XP, XEP, ZCF, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { X1F, F_BOX } from './fterra.js';
import { makeTanker } from './eroad.js';
import { stream } from './fund.js';

// ---------------------------------------------------------------------------
// F2 — Cortes em solo e rocha. O morro tem três materiais: solo residual, saprolito e rocha. O corte é feito em bancadas
// (degraus) com bermas, e cada material tem seu talude: o solo aguenta pouco, a rocha fica quase vertical.
// ---------------------------------------------------------------------------
export const F2_CAM = { tx: X1F, ty: 5.2, tz: ZCF, yaw: -1.3, pitch: 0.2, dist: 52 };
export const F2_MCAM = { tx: X1F, ty: 5.2, tz: ZCF, yaw: -1.3, pitch: 0.2, dist: 96 };
export const F2_STEPS = [
  { t: 'Investigação e projeto', d: 'Antes de cortar, é preciso saber o que há dentro do morro. As sondagens furam o terreno e mostram as camadas: solo residual (mole, na superfície), saprolito (rocha muito alterada, que ainda guarda a estrutura da rocha mas se comporta como solo) e a rocha. O projeto define a altura e a inclinação de cada talude, e a linha amarela mostra a seção final.' },
  { t: 'Limpeza do terreno', d: 'A vegetação é retirada e o solo orgânico removido da área de corte e do entorno. Antes de começar, a água da chuva que desce o morro deve ser desviada para fora do corte, por canaletas de crista, para não correr pelo talude novo e abrir erosão.' },
  { t: 'Corte em solo e saprolito, por bancadas', d: 'A escavadeira corta de cima para baixo, em degraus de poucos metros. Cada camada aguenta uma inclinação diferente: o solo residual é o mais fraco e pede talude mais deitado, e o saprolito aguenta um pouco mais. A cada bancada fica uma berma, um patamar que corta o caminho da água, para o escorrimento não ganhar velocidade, e que dá acesso para manutenção.' },
  { t: 'Rocha: perfuração e plano de fogo', d: 'A rocha sã não se escava com a máquina: ela é desmontada com explosivos. A perfuratriz faz furos em malha, de espaçamento e profundidade calculados no plano de fogo. Cada furo recebe a carga explosiva e o tampão de brita, e todos são ligados com retardos de milésimos de segundo, para a rocha romper aos poucos e as vibrações ficarem dentro do limite para as construções vizinhas.' },
  { t: 'Detonação e escavação da rocha', d: 'Depois da detonação, a rocha fica fragmentada em uma pilha, que a escavadeira carrega nos caminhões. O talude em rocha sã pode ser quase vertical, aqui de 4 na vertical para 1 na horizontal. O desmonte tem de ser controlado: se o fogo for forte demais na face final, ele fratura a rocha que deveria ficar, e o talude perde estabilidade.' },
  { t: 'Drenagem e proteção dos taludes', d: 'As bermas recebem canaletas de concreto que levam a água para as descidas. O solo é protegido contra a erosão por hidrossemeadura. Na rocha, chumbadores (barras de aço cravadas e injetadas com calda de cimento) costuram os blocos que podem se soltar. A água é a maior causa de ruptura de taludes: a drenagem faz parte do corte, e não é um acabamento.' },
];
export const F2_STARTS = [0, 14, 22, 64, 82, 108];
export const F2_LABELS = [
  { k: 'topo', t: 'Estacas e projeto' }, { k: 'sond', t: 'Sondagem' }, { k: 'resid', t: 'Solo residual' }, { k: 'sapro', t: 'Saprolito' }, { k: 'rocha', t: 'Rocha' },
  { k: 'berma', t: 'Berma (patamar)' }, { k: 'tsolo', t: 'Talude em saprolito' }, { k: 'trocha', t: 'Talude em rocha' }, { k: 'plat', t: 'Plataforma' },
  { k: 'escav', t: 'Escavadeira' }, { k: 'cam', t: 'Caminhão basculante' }, { k: 'perf', t: 'Perfuratriz' }, { k: 'fogo', t: 'Plano de fogo' }, { k: 'dreno', t: 'Canaleta de berma' },
  { k: 'chumb', t: 'Chumbadores' }, { k: 'hidro', t: 'Hidrossemeadura' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const F2 = { box: F_BOX };

const ZC = ZCF, YG = 1.0, HM = 12, T = { END: 126, blast: 80 };
const G = (z) => { const s = clamp01((Math.abs(z - ZC) - 8) / 18); return HM * (1 - s * s * (3 - 2 * s)); };
const DP = [[0, YG], [5, YG], [6.4, 6.5], [8.4, 6.5], [11.9, 10], [13.9, 10], [30, 20]];
const Fd = (d) => { for (let i = 0; i < DP.length - 1; i++) if (d <= DP[i + 1][0]) { const [a, ya] = DP[i], [b, yb] = DP[i + 1]; return ya + (yb - ya) * (d - a) / (b - a); } return 99; };
const R1 = 5.5, R2 = 2.0;
const LIFTS = [[22, 32, 12, 10], [34, 46, 10, 8.2], [48, 60, 8.2, 6.5], [83, 90, 6.5, 4.7], [92, 99, 4.7, 2.9], [101, 108, 2.9, YG]];
const hc = (t) => { let h = HM; for (const [a, b, f, to] of LIFTS) if (t >= a) h = f + (to - f) * ease(win(t, a, b)); return h; };
const C = { grass: col(0x6f9c50), dirt: col(0x8a6a44), soil: col(0x8c6c48), sapro: col(0xc08a55), rock: col(0x8f9399), seed: col(0x7dbb5c), conc: col(0xc4c0b6), pl: col(0xb9b6ab) };
let dInt = 0; for (let d = 0; d < 26; d += 0.05) if (Fd(d) < G(ZC + d)) dInt = d;      // onde o projeto encontra o terreno

export function createF2(engine, section) {
  return createProfile(engine, section, { dz: REMOTE_DZ,
    key: 'F2', labels: F2_LABELS, starts: F2_STARTS, END: T.END, yb: 0,
    build(H) {
      const { root, surf, place, dash, bar2, tree, stake } = H;
      const tmp = new THREE.Color();
      // árvores (somem na limpeza)
      const trees = [-52, -49.5, -47, -44.5, -42, -39, -36, -33, -30, -27, -24.5, -21.5, -19, -16, -13, -10].map((z, i) => { const x = X1F + 4 + ((i * 7) % 11) * 3 + (i % 3) * 0.7; return { gr: tree(x, z, G(z), 1.0 + (i % 3) * 0.1), z, gone: 14 + (i % 8) }; });
      const stakes = []; for (const xs of [X1F + 8, X1F + 20, X1F + 32]) for (const dd of [-dInt, -5, 5, dInt]) { const z = ZC + dd; stakes.push({ g: stake(xs, z, G(z)), keep: Math.abs(dd) === dInt }); }
      // linhas de projeto e terreno natural
      const ptsD = []; for (const s of [-1, 1]) { const arr = DP.filter((p) => p[0] <= dInt - 0.2).map(([d, y]) => [ZC + s * d, y]); arr.push([ZC + s * dInt, Fd(dInt)]); ptsD.push(s < 0 ? arr.reverse() : arr); }
      const designPts = [...ptsD[0], ...ptsD[1].slice(1)];
      const designD = dash(designPts, 0.09, noclip(0xf5c518, { r: 0.6, e: 0x4a3a00 }), 8);
      const natPts = []; for (let z = ZC - 17; z <= ZC + 17.01; z += 1) natPts.push([z, G(z) + 0.04]);
      const naturalD = dash(natPts, 0.06, noclip(0xffffff, { r: 0.6, e: 0x333333 }), 8, 1.0);
      // sondagens (barras escuras na face)
      const bm = noclip(0x20242a, { r: 0.8 }), bc = noclip(0xf5c518, { r: 0.6, e: 0x4a3a00 });
      const bores = [ZC - 10, ZC + 10].map((z) => { const g = new THREE.Group(); const b = bar2(z, 0, z, G(z), 0.22, bm, 9); const c = bar2(z, G(z) + 0.05, z, G(z) + 0.6, 0.35, bc, 9); g.add(b, c); g.visible = false; root.add(g); return g; });
      // topografia
      const topo = person(0x2f6fd0, 0xffffff); topo.group.visible = false; root.add(topo.group);
      // máquinas
      const exc = M.excavator(0.9); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI / 2; excW.add(exc.group); excW.visible = false; root.add(excW);
      const truck = M.dumpTruck(0xe8b300); truck.scale.setScalar(0.85); truck.visible = false; root.add(truck);
      const load = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1, 2.4), mat(0x8c6c48, { r: 1 })); load.position.set(2.1, 0.15, 0); load.visible = false; truck.userData.bed.add(load);
      // perfuratriz
      const rig = new THREE.Group(); { const Y = mat(0xe8742c, { r: 0.6 }), D = mat(0x2f3237, { r: 0.6 }), Sm = mat(0x9aa0a6, { r: 0.4 });
        const ad = (g, sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
        for (const z of [-0.9, 0.9]) ad(rig, 3.2, 0.7, 0.7, D, 0, 0.35, z); ad(rig, 2.2, 1.0, 1.7, Y, -0.4, 1.2, 0); ad(rig, 0.9, 0.9, 1.2, mat(0x9ec3da, { r: 0.3 }), -1.0, 2.1, 0);
        const mast = ad(rig, 0.3, 5.0, 0.3, D, 1.3, 3.2, 0); mast.rotation.z = -0.12; rig.userData.rod = ad(rig, 0.12, 2.0, 0.12, Sm, 1.45, 3.2, 0); }
      rig.visible = false; root.add(rig);
      // furos e cargas
      const holes = []; for (let i = 0; i < 12; i++) { const x = X1F + 8 + (i % 4) * 8, z = ZC + (Math.floor(i / 4) - 1) * 3.4; const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 8), mat(0x121417)));
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 6), mat(0xe8742c, { r: 0.6, e: 0x5a2000 })); ch.position.y = 0.45; ch.visible = false; g.add(ch); g.userData.ch = ch; g.position.set(x, 6.52, z); g.visible = false; root.add(g); holes.push({ g, x, z }); }
      const wire = new THREE.Mesh(new THREE.BoxGeometry(32, 0.03, 0.03), mat(0xd8332a)); wire.position.set(X1F + 24, 6.55, ZC); wire.visible = false; root.add(wire);
      // detonação: clarão, poeira e fragmentos
      const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffc45a, transparent: true, opacity: 0.9 })); flash.visible = false; root.add(flash);
      const dust = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xb9b1a2, transparent: true, opacity: 0.5, depthWrite: false })); m.visible = false; root.add(m); return { m, a: i * 0.9 }; });
      const deb = Array.from({ length: 40 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.3), mat(i % 3 ? 0x8f9399 : 0x6c7075, { r: 1 })); m.visible = false; root.add(m); const r = (k) => Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1; return { m, vx: (r(1) - 0.5) * 12, vy: 5 + r(2) * 6, vz: (r(3) - 0.5) * 9, sp: r(4) * 6 }; });
      const pile = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 9), mat(0x9a9da0, { r: 1 })); pile.castShadow = true; pile.visible = false; root.add(pile);
      // hidrossemeadura
      const tanker = makeTanker(0x3a9a4a); tanker.visible = false; root.add(tanker); const seedS = stream(root, 40, 0x7ac45a); const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
      // chumbadores e canaletas
      const steel = noclip(0x30353b, { r: 0.5 }), plate = noclip(0xd0d4d8, { r: 0.5 });
      const bolts = []; for (const s of [-1, 1]) for (let j = 0; j < 4; j++) { const d = 5.2 + j * 0.28, y = 1.0 + (d - 5) * 3.93 + 0.3, z = ZC + s * d, y1 = Math.min(y + 0.3, 6.3); const g = new THREE.Group(); g.add(bar2(z, y, z + s * 1.8, y - 0.5, 0.07, steel, 9), bar2(z, y - 0.2, z, y + 0.2, 0.25, plate, 9)); g.visible = false; root.add(g); bolts.push({ g, j, y1 }); }
      const dtruck = new THREE.Group(); root.add(dtruck);
      const XL = X1F + 12, XD = XEP - 2.5, PER = 10;

      return {
        column(z, t, o) {
          const g = G(z), d = Math.abs(z - ZC), F = Fd(d), Hc = hc(t);
          let y = g; if (F < g) y = Math.max(F, Math.min(g, Hc));
          const r1 = Math.max(0, g - R1), r2 = Math.max(0, g - R2);
          o.lo[0] = 0; o.hi[0] = Math.min(y, r1); o.c[0].copy(C.rock);
          o.lo[1] = Math.min(y, r1); o.hi[1] = Math.min(y, r2); o.c[1].copy(C.sapro);
          o.lo[2] = Math.min(y, r2); o.hi[2] = y; o.c[2].copy(C.soil);
          o.top = y;
          const nat = g - y < 0.02, clearP = ease(win(t, 14, 22)) * (d < 15 ? 1 : 0);
          if (nat) { tmp.copy(C.grass); if (clearP) tmp.lerp(C.dirt, clearP); o.topC.copy(tmp); }
          else { o.topC.copy(y > r2 ? C.soil : y > r1 ? C.sapro : C.rock); }
          const hsL = ease(win(t, 112, 118)), hsR = ease(win(t, 118, 124)), hsv = z < ZC ? hsL : hsR;
          if (!nat && y > r1 + 0.05 && d > 8.3) o.topC.lerp(C.seed, hsv * 0.85);
          const berm = (d > 6.4 && d < 8.4) || (d > 11.9 && d < 13.9);
          if (berm && !nat) o.topC.lerp(C.conc, ease(win(t, 108, 112)) * 0.9);
          if (!nat && d < 5 && Math.abs(y - YG) < 0.02) o.topC.lerp(C.pl, ease(win(t, 112, 124)) * 0.6);
        },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null;
          trees.forEach((tr) => { const s = 1 - ease(win(t, tr.gone, tr.gone + 2.2)); tr.gr.visible = s > 0.01; tr.gr.scale.setScalar(Math.max(0.01, s)); });
          stakes.forEach((s, i) => { const u = ease(win(t, 1.5 + i * 0.7, 2.3 + i * 0.7)), gone = s.keep ? 1 : 1 - ease(win(t, LIFTS[0][0] - 2, LIFTS[0][0])); s.g.visible = u > 0.01 && gone > 0.01; s.g.scale.setScalar(Math.max(0.01, u * gone)); });
          const dl = ease(win(t, 5, 12)), nl = ease(win(t, 20, 24));
          designD.forEach((d, i) => { d.visible = dl > (i + 1) / (designD.length + 1); }); naturalD.forEach((d, i) => { d.visible = nl > (i + 1) / (naturalD.length + 1) && t < 108; });
          bores.forEach((b, i) => { b.visible = t > 3 + i * 2.5 && t < 20; });
          const tOn = t < 14; topo.group.visible = tOn;
          if (tOn) { topo.group.position.set(X1F + 8 + 12 * Math.min(2, Math.floor(win(t, 1, 14) * 3)), G(ZC - 15), ZC - 15); topo.group.rotation.y = 1.2; note = t < 11 ? 'Sondagens: o que há dentro do morro' : 'Marcando as seções de projeto'; label = 'topo'; }
          // escavadeira e caminhões
          const exOn = (t >= 22 && t < 62) || (t >= 83 && t < 109), tkOn0 = (t >= 24 && t < 62) || (t >= 85 && t < 108);
          excW.visible = exOn; if (exOn) { excW.position.set(XL, surf(ZC), ZC); excW.rotation.set(0, 0, 0); exc.update(tAbs * 1.1); note = t < 62 ? 'Cortando o solo e o saprolito em bancadas' : 'Carregando a rocha fragmentada'; label = 'escav'; }
          let tkOn = false, tkx = 0, tkTilt = 0, loaded = false;
          if (tkOn0) { const u = ((t % PER) + PER) % PER / PER; if (u < 0.3) { tkOn = true; tkx = XD + (XL + 7 - XD) * ease(u / 0.3); } else if (u < 0.45) { tkOn = true; tkx = XL + 7; loaded = u > 0.36; } else if (u < 0.75) { tkOn = true; tkx = XL + 7 + (XD - XL - 7) * ease((u - 0.45) / 0.3); loaded = true; } if (u >= 0.45 && u < 0.75 && false) tkTilt = 0; }
          truck.visible = tkOn && tkx < XEP - 1; if (tkOn) { place(truck, tkx, ZC + 2.6, 0, 0.02); truck.rotation.y = (loaded && ((t % PER) / PER) >= 0.45) ? 0 : Math.PI; }
          load.visible = tkOn && loaded; load.scale.y = 1; if (tkOn && !note) { note = 'Caminhão levando o material para o bota-fora'; label = 'cam'; }
          // perfuração
          const pOn = t >= 64 && t < 77; rig.visible = pOn;
          holes.forEach((h, i) => { const on = t >= 64 + i * 1.0 + 0.8; h.g.visible = on && t < T.blast + 0.1; h.g.position.y = surf(h.z) + 0.02; h.g.userData.ch.visible = t > 76 + i * 0.2; });
          if (pOn) { const i = Math.min(11, Math.floor((t - 64) / 1.0)), h = holes[i], q = (t - 64) % 1.0; place(rig, h.x - 1.5, h.z, 0); rig.userData.rod.position.y = 3.2 - 1.2 * Math.sin(q * Math.PI); note = `Perfurando o furo ${i + 1} de 12 · malha do plano de fogo`; label = 'perf'; }
          wire.visible = t >= 77.5 && t < T.blast + 0.1; wire.position.y = surf(ZC) + 0.08; if (wire.visible && !note) note = 'Ligando os furos com retardos e conferindo a área';
          // detonação
          const tau = t - T.blast, bOn = tau >= 0 && tau < 5; const oy = surf(ZC);
          flash.visible = bOn && tau < 0.8; if (flash.visible) { const f = ease(tau / 0.8); flash.position.set(X1F + 22, oy + 1.5, ZC); flash.scale.setScalar(2 + 9 * f); flash.material.opacity = 0.9 * (1 - f); }
          dust.forEach((d, i) => { d.m.visible = bOn; if (bOn) { const f = tau / 5; d.m.position.set(X1F + 14 + i * 3, oy + 2 + 6 * f + Math.sin(d.a) * 0.8, ZC + Math.sin(d.a * 2) * 3); d.m.scale.setScalar(2 + 5 * f); d.m.material.opacity = 0.5 * (1 - f); } });
          deb.forEach((p, i) => { p.m.visible = bOn && tau < 3.4; if (p.m.visible) { const x = X1F + 22 + p.vx * tau, y = oy + 0.5 + p.vy * tau - 4.2 * tau * tau, z = ZC + p.vz * tau; p.m.position.set(x, Math.max(y, surf(Math.max(-58, Math.min(-6, z))) + 0.15), z); p.m.rotation.set(tau * p.sp, tau * 3, 0); } });
          if (bOn && tau < 3) { note = 'Detonação: a rocha rompe de uma vez e fica fragmentada'; label = 'fogo'; }
          const pg = ease(win(t, T.blast + 0.3, T.blast + 2)) * (1 - ease(win(t, 84, 106)));
          pile.visible = pg > 0.01; pile.scale.set(Math.max(0.01, 6.5 * pg), Math.max(0.01, 2.8 * pg), Math.max(0.01, 5.5 * pg)); pile.position.set(X1F + 18, surf(ZC) + 1.25 * pg, ZC);
          // acabamento
          bolts.forEach((b) => { b.g.visible = t > 110 + b.j * 0.9; });
          if (t >= 110 && t < 117 && !note) note = 'Cravando e injetando os chumbadores na rocha';
          const hs = win(t, 112, 124), hOn = hs > 0 && hs < 1; tanker.visible = hOn;
          if (hOn) { const left = hs < 0.5, f = left ? hs * 2 : hs * 2 - 1, x = X1F - 3 + (XEP - X1F + 6) * f, z = ZC + (left ? -3.5 : 3.5); place(tanker, x, z, 0, 0); tanker.rotation.y = 0; v1.set(x - 0.5, surf(z) + 2.4, z); const zt = ZC + (left ? -10.2 : 10.2); v2.set(x - 0.5, Fd(10.2) + 0.4, zt); seedS.set(v1, v2, x > X1F + 1, tAbs, 0.25); note = 'Hidrossemeadura sobre o talude em saprolito'; label = 'hidro'; } else seedS.set(v1, v1, false, 0);
          if (t >= 108 && t < 112 && !note) note = 'Canaletas de concreto nas bermas, para levar a água embora';
          c.note = note; c.label = label;
        },
        idle: (t) => (t < 14 ? 'Morro natural' : t < 22 ? 'Limpando o terreno' : t < 64 ? 'Cortando o solo' : t < 82 ? 'Preparando o desmonte' : t < 108 ? 'Escavando a rocha' : t < 124 ? 'Protegendo os taludes' : 'Corte pronto'),
        anchors(a, t) {
          const zL = ZC - 14, gL = G(zL);
          a.topo.set(XP, G(ZC - dInt) + 0.6, ZC - dInt); a.sond.set(XP, G(ZC - 10) + 0.8, ZC - 10); a.resid.set(XP, gL - 1, zL); a.sapro.set(XP, gL - 3.75, zL); a.rocha.set(XP, (gL - R1) * 0.5, zL);
          a.berma.set(XP, 6.55, ZC - 7.4); a.tsolo.set(XP, 8.3, ZC - 10.15); a.trocha.set(XP, 3.8, ZC + 5.7); a.plat.set(XP, YG + 0.05, ZC + 2.5); a.dreno.set(XP, 6.6, ZC + 7.4); a.chumb.set(XP, 4.2, ZC - 5.9);
          a.escav.set(excW.position.x, excW.position.y + 3.9, excW.position.z); a.cam.set(truck.position.x, truck.position.y + 3.9, truck.position.z); a.perf.set(rig.position.x, rig.position.y + 5.2, rig.position.z); a.fogo.set(X1F + 20, surf(ZC) + 1.5, ZC); a.hidro.set(tanker.position.x, tanker.position.y + 3.6, tanker.position.z); a.solo.set(X1F, -15, ZC);
        },
        vis: {
          topo: (t) => t > 11 && t < 24, sond: (t) => t > 6 && t < 18, resid: (t) => t > 10, sapro: (t) => t > 10, rocha: (t) => t > 10, berma: (t) => t > 60 && t < 112, tsolo: (t) => t > 46 && t < 112,
          trocha: (t) => t > 100 && t < 110, plat: (t) => t > 108, escav: () => excW.visible, cam: () => truck.visible, perf: () => rig.visible, fogo: (t) => t > 70 && t < 83, dreno: (t) => t > 112 && t < 120,
          chumb: (t) => t > 115, hidro: () => tanker.visible,
        },
      };
    },
  });
}
