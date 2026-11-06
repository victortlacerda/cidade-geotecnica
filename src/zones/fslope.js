import * as THREE from 'three';
import { REMOTE_DZ } from '../config.js';
import * as M from '../kit/machines.js';
import { createProfile, col, XP, XEP, ZCF, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { X1F, F_BOX } from './fterra.js';
import { makeTanker } from './eroad.js';
import { makeDozer } from './eroad4.js';
import { stream } from './fund.js';

// ---------------------------------------------------------------------------
// F1 — Estabilidade de encostas. Uma encosta de solo residual sobre rocha, estável com o talude seco. A chuva infiltra, o nível
// d'água sobe, o fator de segurança cai abaixo de 1 e o solo rompe em uma superfície circular. A obra de estabilização:
// retaludamento com berma, drenagem (superficial e drenos horizontais profundos) e solo grampeado com concreto projetado.
// ---------------------------------------------------------------------------
export const F1_CAM = { tx: X1F, ty: 4.8, tz: -31, yaw: -1.3, pitch: 0.2, dist: 52 };
export const F1_MCAM = { tx: X1F, ty: 4.8, tz: -31, yaw: -1.3, pitch: 0.2, dist: 92 };
export const F1_STEPS = [
  { t: 'A encosta em equilíbrio', d: 'Uma encosta fica de pé enquanto a resistência do solo ao cisalhamento é maior que a tensão que tenta fazê-lo escorregar. A razão entre as duas é o fator de segurança, FS. Aqui o FS é 1,5, que é o valor mínimo usual para taludes em obras correntes, com folga contra imprevistos. O solo residual, de cerca de 5 m, está sobre a rocha.' },
  { t: 'A chuva muda o equilíbrio', d: 'A chuva infiltra, o solo satura e o nível d\'água sobe. A água nos poros empurra os grãos para longe uns dos outros e diminui o atrito entre eles, a pressão neutra (poropressão) cresce, e a resistência cai, sem que o solo ou a geometria tenham mudado. O FS desce e a superfície de ruptura potencial, em arco, é a que primeiro chega a 1. Aparecem trincas no topo.' },
  { t: 'Ruptura', d: 'Quando o FS passa de 1, a massa de solo acima do arco gira e escorrega: o topo afunda e forma uma escarpa, e o pé empurra o terreno à frente e levanta. Isso pode levar segundos. A maior parte dos escorregamentos acontece depois de chuva forte. Ninguém projetou a ruptura: ela é o resultado de um FS que foi caindo sem ser medido.' },
  { t: 'Investigar e projetar a solução', d: 'Depois da ruptura é preciso entender o que houve: sondagens e inclinômetros mostram a profundidade da superfície de ruptura, e o nível d\'água é medido por piezômetros. Com os parâmetros do solo rompido (menores que os do solo intacto) o projetista refaz as contas e define a solução: a linha amarela mostra o novo talude, mais suave e com berma.' },
  { t: 'Retaludamento e drenagem', d: 'A escavadeira retira solo do topo, onde ele puxa, e o trator o coloca no pé, onde ele segura: o talude fica mais suave, com uma berma no meio. Canaletas de berma levam a água da chuva para longe. Drenos horizontais profundos (DHP), tubos furados cravados quase na horizontal, aliviam a poropressão dentro do maciço: o nível d\'água cai e o FS sobe.' },
  { t: 'Solo grampeado e proteção', d: 'Na parte alta, barras de aço (grampos) são cravadas em furos inclinados e injetadas com calda de cimento. Elas costuram o maciço e trabalham à tração, como armadura do solo. Um revestimento de concreto projetado protege a face da erosão. O restante do talude recebe hidrossemeadura. O FS final passa de 1,6.' },
];
export const F1_STARTS = [0, 10, 44, 60, 70, 100];
export const F1_LABELS = [
  { k: 'talude', t: 'Talude natural' }, { k: 'solo1', t: 'Solo residual' }, { k: 'rocha', t: 'Rocha' }, { k: 'chuva', t: 'Chuva' }, { k: 'agua', t: 'Nível d\'água' }, { k: 'trinca', t: 'Trincas no topo' },
  { k: 'rup', t: 'Superfície de ruptura' }, { k: 'escarpa', t: 'Escarpa' }, { k: 'pe', t: 'Levantamento no pé' }, { k: 'painel', t: 'Fator de segurança' }, { k: 'proj', t: 'Projeto' },
  { k: 'escav', t: 'Escavadeira' }, { k: 'cam', t: 'Caminhão' }, { k: 'dozer', t: 'Trator de esteira' }, { k: 'berma', t: 'Berma com canaleta' }, { k: 'dhp', t: 'Dreno horizontal profundo' },
  { k: 'perf', t: 'Perfuratriz' }, { k: 'grampo', t: 'Grampos de aço' }, { k: 'conc', t: 'Concreto projetado' }, { k: 'hidro', t: 'Hidrossemeadura' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const F1 = { box: F_BOX };

const ZT0 = -55, ZS0 = -37.4, HC = 11, SOIL = 5.5;
const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const G = (z) => (z <= ZT0 ? 0 : z < ZS0 ? (z - ZT0) / 1.6 : z <= -28 ? HC : z < -18 ? HC * (1 - sm((z + 28) / 10)) : 0);
const Fd = (z) => (z <= -58 ? 0 : z < -45.9 ? (z + 58) / 2.2 : z < -42.9 ? 5.5 : z < -30.8 ? 5.5 + (z + 42.9) / 2.2 : G(z));
// círculo de ruptura: por T (pé), um ponto intermediário e S (topo)
const PT = [[-52, G(-52)], [-43.5, G(-43.5) - 3.6], [-34, HC]];
const CC = (() => { const [[x1, y1], [x2, y2], [x3, y3]] = PT, d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)); const ux = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / d, uy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / d; return { zc: ux, yc: uy, R: Math.hypot(x1 - ux, y1 - uy) }; })();
const arcY = (z) => { const q = CC.R * CC.R - (z - CC.zc) ** 2; return q > 0 ? CC.yc - Math.sqrt(q) : 99; };
const ZTX = PT[0][0], ZSX = PT[2][0];
const FS = (t) => (t < 12 ? 1.5 : t < 46 ? 1.5 - 0.48 * ease(win(t, 12, 46)) : t < 52 ? 1.02 - 0.07 * ease(win(t, 46, 52)) : t < 58 ? 0.95 + 0.1 * ease(win(t, 52, 58)) : t < 84 ? 1.05 : t < 100 ? 1.05 + 0.2 * ease(win(t, 84, 100)) + 0.0 : t < 108 ? 1.25 + 0.15 * ease(win(t, 100, 108)) : 1.4 + 0.27 * ease(win(t, 108, 122)));
const wet = (t) => ease(win(t, 12, 46)) * (1 - 0.7 * ease(win(t, 100, 108)));
const theta = (t) => 0.012 * ease(win(t, 44, 52)) + 0.26 * ease(win(t, 52, 58));
const dWater = (t) => 3.4 - 2.7 * ease(win(t, 12, 46)) + 2.4 * ease(win(t, 96, 106));
const C = { rock: col(0x8f9399), soil: col(0x8c6c48), wet: col(0x4f3a22), mass: col(0xa78256), grass: col(0x6f9c50), dirt: col(0x8a6a44), conc: col(0xc4c0b6), seed: col(0x7dbb5c), fill: col(0xb08a5c) };
const rot = (z, y, a) => { const dz = z - CC.zc, dy = y - CC.yc, c = Math.cos(a), s = Math.sin(a); return [CC.zc + dz * c - dy * s, CC.yc + dz * s + dy * c]; };

function drawFS(ctx, W, H, t) {
  const fs = FS(t); ctx.clearRect(0, 0, W, H); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#8a8f98'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
  ctx.fillStyle = '#23262b'; ctx.font = 'bold 28px sans-serif'; ctx.fillText('Fator de segurança do talude', 24, 46);
  const x0 = 50, x1 = W - 50, y0 = 100, h = 38, fx = (v) => x0 + (x1 - x0) * (v - 0.5) / 1.5;
  [[0.5, 1.0, '#d9533b'], [1.0, 1.3, '#e8a73a'], [1.3, 2.0, '#4bab6a']].forEach(([a, b, c]) => { ctx.fillStyle = c; ctx.fillRect(fx(a), y0, fx(b) - fx(a), h); });
  ctx.fillStyle = '#23262b'; ctx.font = '19px sans-serif'; [0.5, 1.0, 1.5, 2.0].forEach((v) => ctx.fillText(v.toFixed(1).replace('.', ','), fx(v) - 12, y0 + h + 26));
  const px = fx(Math.max(0.5, Math.min(2, fs))); ctx.fillStyle = '#23262b'; ctx.beginPath(); ctx.moveTo(px, y0 - 4); ctx.lineTo(px - 12, y0 - 26); ctx.lineTo(px + 12, y0 - 26); ctx.fill();
  const bad = fs < 1, ok = fs >= 1.5; ctx.fillStyle = bad ? '#c9361a' : ok ? '#2e8b4d' : '#b9801a'; ctx.font = 'bold 56px sans-serif'; ctx.fillText(`FS = ${fs.toFixed(2).replace('.', ',')}`, 24, 250);
  ctx.fillStyle = '#23262b'; ctx.font = '21px sans-serif'; const msg = t < 12 ? 'Talude seco e estável' : t < 44 ? 'Chuva infiltrando: poropressão sobe, resistência cai' : t < 52 ? 'Perto da ruptura: aparecem trincas' : t < 60 ? 'Ruptura: o solo escorrega' : t < 84 ? 'Massa rompida, equilíbrio precário' : t < 108 ? 'Retaludamento e drenagem: FS sobe' : fs < 1.6 ? 'Grampeando o solo' : 'Talude estabilizado';
  ctx.fillText(msg, 24, 338); ctx.fillStyle = '#5b5f66'; ctx.font = '17px sans-serif'; ctx.fillText('FS = resistência ÷ tensão atuante', 24, 310);
}

export function createF1(engine, section) {
  return createProfile(engine, section, { dz: REMOTE_DZ,
    key: 'F1', labels: F1_LABELS, starts: F1_STARTS, END: 136, yb: 0,
    build(H) {
      const { root, surf, place, dash, bar2, tree, stake } = H;
      const tmp = new THREE.Color();
      [-23, -20, -14, -11, -8].forEach((z, i) => tree(X1F + 5 + ((i * 7) % 11) * 3, z, G(z), 1 + (i % 3) * 0.1));
      // arco de ruptura (tracejado vermelho) e projeto (amarelo)
      const arcPts = []; for (let z = ZTX; z <= ZSX + 0.01; z += 1) arcPts.push([z, arcY(z)]); const arcD = dash(arcPts, 0.1, noclip(0xd8332a, { r: 0.6, e: 0x5a1000 }), 8, 0.8);
      const prjPts = []; for (let z = -58; z <= -30.8 + 0.01; z += 1.5) prjPts.push([z, Fd(z)]); const prjD = dash(prjPts, 0.09, noclip(0xf5c518, { r: 0.6, e: 0x4a3a00 }), 8);
      // nível d'água
      const wm = noclip(0x2f9bff, { r: 0.5, e: 0x103a66 }), WZ = Array.from({ length: 22 }, (_, i) => -53 + i * 1.1);
      const wl = WZ.map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.9), wm); m.position.x = XP; m.renderOrder = 8; m.visible = false; root.add(m); return m; });
      // chuva e nuvens
      const rainN = 90, rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.55, 0.03), new THREE.MeshBasicMaterial({ color: 0x9fd0ff }), rainN); rain.frustumCulled = false; root.add(rain);
      const clouds = [0, 1, 2, 3].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xaab0b8, roughness: 1 })); m.scale.set(5.5, 1.5, 4.5); m.position.set(X1F + 8 + i * 9, 19.5 + (i % 2), -44 + (i % 2) * 6); m.visible = false; root.add(m); return m; });
      const m4 = new THREE.Matrix4();
      const trinca = new THREE.Mesh(new THREE.BoxGeometry(34, 0.05, 0.1), mat(0x1e1a14)); trinca.visible = false; root.add(trinca);
      const dust = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xb9b1a2, transparent: true, opacity: 0.5, depthWrite: false })); m.visible = false; root.add(m); return { m, a: i * 1.1 }; });
      // máquinas
      const exc = M.excavator(0.9); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI / 2; excW.add(exc.group); excW.visible = false; root.add(excW);
      const truck = M.dumpTruck(0xe8b300); truck.scale.setScalar(0.85); truck.visible = false; root.add(truck);
      const load = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1, 2.4), mat(0xa78256, { r: 1 })); load.position.set(2.1, 0.15, 0); load.visible = false; truck.userData.bed.add(load);
      const dozer = makeDozer(); dozer.visible = false; root.add(dozer);
      const rig = new THREE.Group(); { const Y = mat(0xe8742c, { r: 0.6 }), D = mat(0x2f3237, { r: 0.6 }), Sm = mat(0x9aa0a6, { r: 0.4 });
        const ad = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; rig.add(o); return o; };
        for (const z of [-0.9, 0.9]) ad(3.2, 0.7, 0.7, D, 0, 0.35, z); ad(2.2, 1.0, 1.7, Y, -0.4, 1.2, 0); ad(0.9, 0.9, 1.2, mat(0x9ec3da, { r: 0.3 }), -1.0, 2.1, 0); const mast = ad(0.3, 5.0, 0.3, D, 1.3, 3.2, 0); mast.rotation.z = -0.12; rig.userData.rod = ad(0.12, 2.0, 0.12, Sm, 1.45, 3.2, 0); }
      rig.visible = false; root.add(rig);
      const tanker = makeTanker(0x3a9a4a); tanker.visible = false; root.add(tanker); const seedS = stream(root, 40, 0x7ac45a); const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
      const dripS = stream(root, 30, 0x55a5ff);
      // DHP, grampos e canaleta
      const dhpZ = [-51.5, -48.5, -45.6], steelM = noclip(0x6d7a8a, { r: 0.5 }), nailM = noclip(0x30353b, { r: 0.5 }), plM = noclip(0xd0d4d8, { r: 0.5 });
      const dhp = dhpZ.map((z) => { const y = Fd(z) - 0.2, g = new THREE.Group(); g.add(bar2(z, y, z + 8.2, y + 0.9, 0.1, steelM, 9)); g.visible = false; root.add(g); return { g, z, y }; });
      const nailZ = [-41.6, -39.2, -36.8, -34.4], nails = nailZ.map((z) => { const y = Fd(z) - 0.15, g = new THREE.Group(); g.add(bar2(z, y, z + 4.6, y - 0.8, 0.07, nailM, 9), bar2(z, y - 0.18, z, y + 0.18, 0.28, plM, 9)); g.visible = false; root.add(g); return { g, z, y }; });
      const gut = new THREE.Mesh(new THREE.BoxGeometry(34, 0.14, 0.7), mat(0xc4c0b6, { r: 0.8 })); gut.position.set((X1F + XEP) / 2 + 0.0, 5.55, -43.4); gut.visible = false; root.add(gut);
      const proj = person(0x2f6fd0, 0xffffff); proj.group.visible = false; root.add(proj.group);
      // painel
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; const cx = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 4.95), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); pl.rotation.y = -Math.PI / 2; pl.position.set(-35, 3.7, -12.4);
      const panelG = new THREE.Group(); panelG.add(pl); for (const dz of [-3.0, 3.0]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 6), mat(0x23262b)); po.position.set(-34.9, 1.7, -12.4 + dz); panelG.add(po); } root.add(panelG);
      let lastDraw = -1;
      const XL = X1F + 12, XD = XEP - 2.5, PER = 10;

      return {
        column(z, t, o) {
          const g = G(z), th = theta(t); let ym = -1, hit = false;
          const inFoot = z > ZTX && z < ZSX, ya = inFoot ? Math.min(g, arcY(z)) : g;
          if (th > 0.0005) { for (let y = Math.max(g, 12) + 2; y >= Math.min(ya, g) - 0.5; y -= 0.12) { const [z0, y0] = rot(z, y, th); if ((z0 - CC.zc) ** 2 + (y0 - CC.yc) ** 2 <= CC.R * CC.R && y0 <= G(z0) + 0.02) { ym = y; hit = true; break; } } }
          let y = hit ? Math.max(ym, ya) : ya; const yd = y;
          const rem = ease(win(t, 70, 86)); if (rem > 0) y = yd + (Fd(z) - yd) * rem;
          const rt = Math.max(0, Math.min(y, g - SOIL));
          o.lo[0] = 0; o.hi[0] = rt; o.c[0].copy(C.rock);
          const yaE = Math.min(y, ya); o.lo[1] = rt; o.hi[1] = Math.max(rt, yaE);
          const w = wet(t); tmp.copy(C.soil).lerp(C.wet, 0.55 * w); o.c[1].copy(tmp);
          o.lo[2] = Math.max(rt, yaE); o.hi[2] = Math.max(o.lo[2], y); o.c[2].copy(C.mass); o.c[2].lerp(C.wet, 0.35 * w);
          o.top = y;
          const natural = Math.abs(y - g) < 0.03 && !hit;
          if (natural) o.topC.copy(C.grass).lerp(C.wet, 0.25 * w); else { o.topC.copy(rem > 0.5 ? (y > g ? C.fill : C.soil) : C.mass); }
          if (z > -43 && z < -30.8 && rem > 0.9 && t > 112) o.topC.lerp(C.conc, ease(win(t, 112, 122)));
          if (t > 124 && z < -43.5 && z > -58 && rem > 0.9) o.topC.lerp(C.seed, ease(win(t, 124, 134)) * 0.85);
        },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null;
          // chuva
          const rOn = t > 10 && t < 50; rain.visible = rOn; clouds.forEach((m) => { m.visible = rOn; });
          for (let i = 0; i < rainN; i++) { if (!rOn) { m4.makeScale(0, 0, 0); } else { const ph = (i * 0.6180339) % 1, x = X1F + 3 + ((i * 7.31) % 1) * 32, z = -58 + ((i * 3.77) % 1) * 30, y = 18 - ((tAbs * 12 + ph * 18) % 18); m4.makeTranslation(x, y, z); } rain.setMatrixAt(i, m4); } rain.instanceMatrix.needsUpdate = true;
          if (rOn) { note = t < 44 ? 'Chuva forte: a água infiltra e o nível d\'água sobe' : 'Aparecem trincas no topo da encosta'; label = 'chuva'; }
          // nível d'água
          const dw = dWater(t); wl.forEach((m, i) => { const z = WZ[i], y0 = surf(z) - dw, y1 = surf(z + 1.1) - dw; m.visible = t > 8 && z < -30 && z > ZTX - 3 && y0 > Math.max(0.2, G(z) - SOIL + 0.15); if (m.visible) { m.position.set(XP, (y0 + y1) / 2 - 0.0, z + 0.55); m.rotation.set(-Math.atan2(y1 - y0, 1.1), 0, 0); } });
          // arco e trincas
          const arcA = ease(win(t, 28, 36)); arcD.forEach((d, i) => { d.visible = arcA > (i + 1) / (arcD.length + 1) && t < 70; });
          trinca.visible = t > 44 && t < 53; trinca.position.set((X1F + XEP) / 2, surf(ZSX + 1.8) + 0.03, ZSX + 1.8);
          const bo = t >= 52 && t < 60; dust.forEach((d, i) => { d.m.visible = bo; if (bo) { const f = (t - 52) / 8; d.m.position.set(X1F + 8 + i * 5, surf(-50) + 1.5 + 5 * f, -50 + Math.sin(d.a) * 2.5); d.m.scale.setScalar(1.5 + 4 * f); d.m.material.opacity = 0.5 * (1 - f); } });
          if (t >= 52 && t < 62) { note = 'Ruptura: o solo gira ao longo do arco e escorrega'; label = 'rup'; }
          // projeto
          const pa = ease(win(t, 62, 68)); prjD.forEach((d, i) => { d.visible = pa > (i + 1) / (prjD.length + 1) && t < 110; });
          const pOn = t >= 60 && t < 70; proj.group.visible = pOn; if (pOn) { proj.group.position.set(X1F + 16, surf(-44), -44); proj.group.rotation.y = 1.0; note = 'Sondagens, inclinômetro e novo projeto'; label = 'proj'; }
          // retaludamento
          const exOn = t >= 70 && t < 87; excW.visible = exOn; if (exOn) { excW.position.set(XL, surf(-33.5), -33.5); excW.rotation.set(0, 0, 0); exc.update(tAbs * 1.1); }
          let tkOn = false, tkx = 0, loaded = false;
          if (t >= 72 && t < 87) { const u = ((t % PER) + PER) % PER / PER; if (u < 0.3) { tkOn = true; tkx = XD + (XL + 7 - XD) * ease(u / 0.3); } else if (u < 0.45) { tkOn = true; tkx = XL + 7; loaded = u > 0.36; } else if (u < 0.75) { tkOn = true; tkx = XL + 7 + (XD - XL - 7) * ease((u - 0.45) / 0.3); loaded = true; } if (tkOn) loaded = loaded && u >= 0.36; }
          truck.visible = tkOn && tkx < XEP - 1; if (tkOn) { place(truck, tkx, -32.8, 0, 0.02); truck.rotation.y = (((t % PER) / PER) >= 0.45) ? 0 : Math.PI; } load.visible = tkOn && loaded;
          const dzOn = t >= 73 && t < 88; dozer.visible = dzOn; if (dzOn) { const f = win(t, 73, 88), sw = f * 3, k = Math.floor(sw) % 2; place(dozer, X1F + 6 + 28 * (k === 0 ? sw % 1 : 1 - (sw % 1)), -53 + Math.sin(f * 9) * 1.5, k === 0 ? 0 : Math.PI); }
          if (exOn) { note = 'Retirando solo do topo e levando ao pé do talude'; label = 'escav'; } else if (dzOn && !note) { note = 'Espalhando e compactando o aterro no pé'; label = 'dozer'; }
          // drenagem
          gut.visible = t >= 88 && t < 136; gut.position.y = surf(-43.4) + 0.06; if (t >= 88 && t < 93 && !note) note = 'Canaleta na berma, para levar a água da chuva embora';
          dhp.forEach((d, i) => { d.g.visible = t >= 92 + i * 2; });
          const dOn = t >= 96 && t < 112; dripS.set(v1, v1, false, 0);
          if (dOn) { const i = Math.floor((tAbs * 0.7) % 3), d = dhp[i]; v1.set(X1F + 0.2, d.y + 0.1, d.z - 0.2); v2.set(X1F + 0.2, Math.max(0, d.y - 1.6), d.z - 1.2); dripS.set(v1, v2, true, tAbs, 0.05); if (!note) { note = 'Drenos horizontais profundos aliviam a pressão da água'; label = 'dhp'; } }
          // grampos
          const nOn = t >= 108 && t < 123; rig.visible = nOn; nails.forEach((n, i) => { n.g.visible = t >= 109 + i * 3.2; });
          if (nOn) { const i = Math.min(3, Math.floor((t - 108) / 3.5)), n = nails[i], q = ((t - 108) % 3.5) / 3.5; place(rig, X1F + 5, n.z - 1.2, 0, 0); rig.userData.rod.position.y = 3.2 - 1.0 * Math.sin(q * Math.PI); note = `Cravando e injetando o grampo ${i + 1} de 4`; label = 'perf'; }
          if (t >= 114 && t < 123 && !note) { note = 'Concreto projetado protegendo a face'; label = 'conc'; }
          // hidrossemeadura
          const hs = win(t, 124, 134), hOn = hs > 0 && hs < 1; tanker.visible = hOn; seedS.set(v1, v1, false, 0);
          if (hOn) { const x = X1F - 3 + (XEP - X1F + 6) * hs, z = -44.4; place(tanker, x, z, 0, 0); tanker.rotation.y = 0; v1.set(x - 0.5, surf(z) + 2.4, z); v2.set(x - 0.5, surf(-51) + 0.4, -51); seedS.set(v1, v2, x > X1F + 1, tAbs, 0.25); note = 'Hidrossemeadura no pé do talude'; label = 'hidro'; }
          // painel
          if (Math.abs(t - lastDraw) > 0.25 || t < lastDraw) { lastDraw = t; drawFS(cx, 640, 360, t); tex.needsUpdate = true; }
          c.note = note; c.label = label;
        },
        idle: (t) => (t < 10 ? 'Encosta em equilíbrio' : t < 44 ? 'Chovendo: o FS cai' : t < 52 ? 'Perto da ruptura' : t < 60 ? 'Escorregamento' : t < 70 ? 'Investigação e projeto' : t < 88 ? 'Retaludamento' : t < 108 ? 'Drenagem' : t < 124 ? 'Grampeando o talude' : t < 134 ? 'Protegendo o talude' : 'Talude estabilizado'),
        anchors(a, t) {
          const th = theta(t), [zs2, ys2] = rot(ZSX, HC, -th), [zt2, yt2] = rot(ZTX, G(ZTX), -th);
          a.talude.set(XP, G(-46) + 0.3, -46); a.solo1.set(XP, G(-30) - 1.5, -30.5); a.rocha.set(XP, 1.8, -30.5); a.chuva.set(X1F + 10, 17, -44); a.agua.set(XP, surf(-40) - dWater(t), -40); a.trinca.set(X1F + 14, surf(ZSX + 1.8) + 0.4, ZSX + 1.8);
          a.rup.set(XP, arcY(-45), -45); a.escarpa.set(XP, ys2 + 0.8, zs2); a.pe.set(XP, yt2 + 0.6, zt2 - 0.4); a.painel.set(-35, 6.7, -12.4); a.proj.set(XP, Fd(-37.5) + 0.4, -37.5);
          a.escav.set(excW.position.x, excW.position.y + 3.9, excW.position.z); a.cam.set(truck.position.x, truck.position.y + 3.9, truck.position.z); a.dozer.set(dozer.position.x, dozer.position.y + 3.4, dozer.position.z);
          a.berma.set(XP, 5.65, -44.4); a.dhp.set(XP, Fd(-48.5) + 0.4, -48.5); a.perf.set(rig.position.x, rig.position.y + 5.2, rig.position.z); a.grampo.set(XP, Fd(-38) - 0.6, -35.5); a.conc.set(XP, Fd(-40) + 0.5, -40); a.hidro.set(tanker.position.x, tanker.position.y + 3.6, tanker.position.z); a.solo.set(X1F, -15, -32);
        },
        vis: {
          talude: (t) => t < 10, solo1: (t) => t > 2 && t < 12, rocha: (t) => t > 3 && t < 12, chuva: () => rain.visible, agua: (t) => t > 26 && t < 44, trinca: (t) => t > 46 && t < 53, rup: (t) => (t > 34 && t < 44) || (t > 53 && t < 62), escarpa: (t) => t > 56 && t < 70,
          pe: (t) => t > 56 && t < 70, painel: (t) => t > 4, proj: (t) => t > 62 && t < 70, escav: () => excW.visible, cam: () => truck.visible, dozer: () => dozer.visible, berma: (t) => t > 90 && t < 108, dhp: (t) => t > 98 && t < 108,
          perf: () => rig.visible, grampo: (t) => t > 115 && t < 124, conc: (t) => t > 118 && t < 124, hidro: () => tanker.visible,
        },
      };
    },
  });
}
