import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { createProfile, col, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { GEO_H, H_BOX, X1H } from './hdam.js';
import { makeTanker } from './eroad.js';
import { makeDozer } from './eroad4.js';
import { stream } from './fund.js';

// ---------------------------------------------------------------------------
// H4 — Pilha de rejeitos. Rejeito filtrado (seco o bastante para ser empilhado e compactado) em bancos de 2 m, sobre colchão e dreno
// de fundo, com bermas, canaletas, instrumentação e cobertura vegetal.
// ---------------------------------------------------------------------------
const ZP = -32;
export const H4_CAM = { tx: X1H, ty: 2.4, tz: ZP + 2, yaw: -1.3, pitch: 0.2, dist: 48 };
export const H4_MCAM = { tx: X1H, ty: 2.4, tz: ZP + 2, yaw: -1.3, pitch: 0.2, dist: 90 };
export const H4_STEPS = [
  { t: 'Locação e projeto', d: 'A topografia marca o pé da pilha e as bermas. O projeto define a altura total (6,6 m aqui, exagerados para o corte), a altura de cada banco (2 m), a largura das bermas e a inclinação das faces. A pilha cresce de baixo para cima e é feita de rejeito filtrado: o que sobra do beneficiamento do minério, com a água retirada em filtros, de modo a poder ser empilhado e compactado como um aterro.' },
  { t: 'Fundação e drenagem de fundo', d: 'A fundação é limpa e regularizada, e recebe um colchão drenante de brita. No eixo corre um dreno de fundo, de brita envolta em geotêxtil, que leva para fora a água que sai do rejeito e a que vem do terreno. Sem esse caminho, a água se acumula no pé da pilha, e uma pilha saturada tem muito menos resistência que uma pilha seca.' },
  { t: 'Empilhamento em bancos compactados', d: 'Os caminhões descarregam o rejeito, o trator espalha em camadas de 1 m e o rolo compacta, com controle de umidade e de densidade, camada por camada. A pilha sobe em bancos de 2 m, com uma berma a cada banco. As bermas quebram a altura do talude e abrigam as canaletas. Compactar o rejeito é o que dá a ele resistência e o torna menos suscetível à liquefação.' },
  { t: 'Drenagem superficial e cobertura vegetal', d: 'Canaletas de concreto nas bermas levam a água da chuva até descidas d\'água e a bacias de sedimentação ao pé da pilha, para que a chuva não carregue o rejeito e não o infiltre. As faces e as bermas recebem hidrossemeadura. Controlar a água é a regra principal de qualquer estrutura de rejeitos, seja ela pilha ou barragem.' },
  { t: 'Monitoramento', d: 'Piezômetros medem a pressão da água dentro da pilha, e marcos topográficos medem seus deslocamentos. As leituras são comparadas com os limites de projeto, e a obra só sobe o próximo banco se os dados estiverem dentro do esperado. Água, drenagem e monitoramento são o que mantém uma pilha segura ao longo de décadas, até o fechamento.' },
];
export const H4_STARTS = [0, 12, 30, 95, 112];
export const H4_LABELS = [
  { k: 'topo', t: 'Estacas e projeto' }, { k: 'colchao', t: 'Colchão drenante' }, { k: 'dreno', t: 'Dreno de fundo' }, { k: 'banco', t: 'Banco de rejeito (2 m)' }, { k: 'berma', t: 'Berma com canaleta' },
  { k: 'face', t: 'Face do banco' }, { k: 'topoP', t: 'Topo da pilha' }, { k: 'pz', t: 'Piezômetros' }, { k: 'marco', t: 'Marcos topográficos' }, { k: 'agua', t: 'Água drenada' },
  { k: 'escav', t: 'Escavadeira' }, { k: 'cam', t: 'Caminhão basculante' }, { k: 'dozer', t: 'Trator de esteira' }, { k: 'rolo', t: 'Rolo compactador' }, { k: 'ensaio', t: 'Ensaio de densidade' },
  { k: 'hidro', t: 'Hidrossemeadura' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const H4 = { box: H_BOX };

const PTS = [[0, 6.6], [5, 6.6], [9, 4.6], [11, 4.6], [15, 2.6], [17, 2.6], [21, 0.6], [22, 0]];
const yp = (a) => { for (let i = 0; i < PTS.length - 1; i++) if (a <= PTS[i + 1][0]) { const [x0, y0] = PTS[i], [x1, y1] = PTS[i + 1]; return y0 + (y1 - y0) * (a - x0) / (x1 - x0); } return 0; };
const NLIFT = 6, HL = 1.0, T0 = 30, PER = 10.5, END4 = 135;
const K = { found: col(0x8f7a54), blan: col(0xa7b0b8), drain: col(0xd9dde0), a: col(0xb5a48a), b: col(0xa8977c), loose: col(0xd2c4ab), conc: col(0xc4c0b6), seed: col(0x7dbb5c), grass: col(0x6f9c50), dirt: col(0x8a6a44) };

export function createH4(engine, section) {
  return createProfile(engine, section, {
    key: 'H4', labels: H4_LABELS, starts: H4_STARTS, END: END4, yb: -1.5, geo: GEO_H, hide: 'h-dam',
    build(H) {
      const { root, surf, place, dash, bar2, tree, stake, X1, XE, XP } = H;
      const tmp = new THREE.Color();
      [-57, -55, -14, -11, -8].forEach((z, i) => tree(X1 + 6 + ((i * 7) % 11) * 3.5, z, 0, 1 + (i % 3) * 0.1));
      const stakes = []; for (const xs of [X1 + 8, X1 + 22, X1 + 36]) for (const dd of [-22, -11, 11, 22]) stakes.push(stake(xs, ZP + dd, 0));
      const outPts = PTS.map(([a, y]) => [ZP - a, y]).reverse().concat(PTS.slice(1).map(([a, y]) => [ZP + a, y]));
      const outline = dash(outPts, 0.09, noclip(0xf5c518, { r: 0.6, e: 0x4a3a00 }), 8);
      const topo = person(0x2f6fd0, 0xffffff), help = person(0xe8742c); [topo, help].forEach((p) => { p.group.visible = false; root.add(p.group); });
      const exc = M.excavator(0.9); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI / 2; excW.add(exc.group); excW.visible = false; root.add(excW);
      const truck = M.dumpTruck(0xe8b300); truck.scale.setScalar(0.85); truck.visible = false; root.add(truck);
      const load = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1, 2.4), mat(0xb5a48a, { r: 1 })); load.position.set(2.1, 0.15, 0); load.visible = false; truck.userData.bed.add(load);
      const dozer = makeDozer(); dozer.visible = false; root.add(dozer);
      const roller = M.roller(); roller.scale.setScalar(0.7); roller.visible = false; root.add(roller);
      const tech = person(0xf2b705, 0xffffff); tech.group.visible = false; root.add(tech.group);
      const pileM = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 9), mat(0xb5a48a, { r: 1 })); pileM.castShadow = true; pileM.visible = false; root.add(pileM);
      const tanker = makeTanker(0x3a9a4a); tanker.visible = false; root.add(tanker); const seedS = stream(root, 40, 0x7ac45a); const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
      // canaletas nas bermas (duas por lado), piezômetros e marcos
      const gutters = []; for (const s of [-1, 1]) for (const [a0, a1, y] of [[9, 11, 4.6], [15, 17, 2.6]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(XE - X1 - 1, 0.12, 0.45), mat(0xc4c0b6, { r: 0.8 })); m.position.set((X1 + XE) / 2, y + 0.06, ZP + s * (a0 + a1) / 2 + s * 0.4); m.visible = false; root.add(m); gutters.push(m); }
      const pzM = noclip(0x20242a, { r: 0.8 }), pzT = noclip(0x2f9bff, { r: 0.5, e: 0x103a66 });
      const PZ = [[-5, 1.8], [0, 2.0], [5, 1.8]].map(([dd, yb]) => { const g = new THREE.Group(); g.add(bar2(ZP + dd, yb, ZP + dd, Math.min(6.6, yp(Math.abs(dd))) + 0.25, 0.1, pzM, 9), bar2(ZP + dd, yb - 0.5, ZP + dd, yb + 0.25, 0.22, pzT, 9)); g.visible = false; root.add(g); return g; });
      const mk = noclip(0xd8332a, { r: 0.6 }), mkW = noclip(0xffffff, { r: 0.6 });
      const MARCOS = [[-10, 4.6], [10, 4.6], [-16, 2.6], [16, 2.6]].map(([dd, y]) => { const g = new THREE.Group(); g.add(bar2(ZP + dd, y, ZP + dd, y + 0.9, 0.12, mkW, 9), bar2(ZP + dd, y + 0.9, ZP + dd, y + 1.2, 0.2, mk, 9)); g.visible = false; root.add(g); return g; });
      const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 5), noclip(0x8ed0ff, { r: 0.4, e: 0x2a6a99 }), 20); dots.frustumCulled = false; dots.renderOrder = 10; root.add(dots); const m4 = new THREE.Matrix4();
      const XL = X1 + 12, XD = XE - 2.5, XT = X1 + 24;
      const lvl = (t) => {
        if (t < T0) return { k: -1, Lk: 0, u: 0, sp: 0, cp: 0 };
        if (t >= T0 + NLIFT * PER) return { k: NLIFT, Lk: 99, u: 1, sp: 1, cp: 1 };
        const k = Math.floor((t - T0) / PER), u = (t - T0 - k * PER) / PER, sp = ease(win(u, 0.3, 0.6)), cp = ease(win(u, 0.62, 0.93));
        return { k, u, sp, cp, Lk: 0.6 + k * HL + HL * (1 + 0.3 * (1 - cp)) * sp };
      };
      return {
        column(z, t, o) {
          const a = Math.abs(z - ZP), L = lvl(t), bE = ease(win(t, 16, 24)), drE = ease(win(t, 22, 28));
          const bl = a < 22 ? 0.6 * bE : 0, bt = a < 1.0 ? Math.max(bl, 1.2 * drE) : bl;
          let y = bt; if (L.Lk > 0.001) y = Math.max(bt, Math.min(L.Lk, yp(a)));
          o.top = y;
          o.lo[0] = -1.5; o.hi[0] = 0; o.c[0].copy(K.found);
          o.lo[1] = 0; o.hi[1] = Math.min(y, bl); o.c[1].copy(K.blan);
          o.lo[2] = 0; o.hi[2] = a < 1.0 ? Math.min(y, 1.2 * drE) : 0; o.c[2].copy(K.drain);
          for (let k = 0; k < NLIFT; k++) { const lo = Math.min(y, Math.max(0.6 + k * HL, bt)), hi = Math.min(y, Math.max(0.6 + (k + 1) * HL, bt)); o.lo[3 + k] = lo; o.hi[3 + k] = k === L.k ? Math.min(y, L.Lk) : hi; o.c[3 + k].copy(k % 2 ? K.b : K.a); if (k === L.k) o.c[3 + k].lerp(K.loose, 0.7 * (1 - L.cp)); }
          if (y > bt + 0.02 || L.Lk > 0.001 && y > 0.65) {
            tmp.copy(Math.floor(Math.max(0, y - 0.6)) % 2 ? K.b : K.a); if (L.k >= 0 && L.k < NLIFT) tmp.lerp(K.loose, 0.7 * (1 - L.cp) * L.sp);
            const berm = (a > 9 && a < 11) || (a > 15 && a < 17); if (berm) tmp.lerp(K.conc, ease(win(t, 96, 102)) * 0.7);
            tmp.lerp(K.seed, ease(win(t, 104, 118)) * (berm ? 0.35 : 0.8)); o.topC.copy(tmp);
          } else if (bl > 0.02) o.topC.copy(K.blan); else { tmp.copy(K.grass); if (t > 8 && a < 26) tmp.lerp(K.dirt, ease(win(t, 8, 14))); o.topC.copy(tmp); }
        },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null; const L = lvl(t);
          stakes.forEach((s, i) => { const u = ease(win(t, 1.5 + i * 0.5, 2.3 + i * 0.5)); s.visible = u > 0.01 && t < 30; s.scale.setScalar(Math.max(0.01, u)); });
          const dl = ease(win(t, 5, 11)); outline.forEach((d, i) => { d.visible = dl > (i + 1) / (outline.length + 1) && t < 100; });
          const tOn = t < 12; topo.group.visible = help.group.visible = tOn;
          if (tOn) { const sx = X1 + 8 + 14 * Math.min(2, Math.floor(win(t, 1, 12) * 3)); topo.group.position.set(sx, 0, ZP - 14); topo.group.rotation.y = 1.2; help.group.position.set(sx, 0, ZP + 14 * Math.sin(tAbs * 0.5)); note = 'Marcando o pé da pilha e as bermas'; label = 'topo'; }
          // fundação
          let tkOn = false, tkx = 0, tkLane = ZP - 6, tkTilt = 0, loaded = false, rOn = false, dzOn = false, tcOn = false, pg = 0, dzx = 0, dzz = ZP, dzy = 0;
          const exWin = t >= 13 && t < 22; excW.visible = exWin; if (exWin) { excW.position.set(XL, surf(ZP - 4), ZP - 4); excW.rotation.set(0, 0, 0); exc.update(tAbs * 1.1); note = 'Limpando e regularizando a fundação'; label = 'escav'; }
          if (t >= 16 && t < 26) { dzOn = true; const f = win(t, 16, 26), sw = f * 3, k = Math.floor(sw) % 2; dzx = X1 + 4 + 34 * (k === 0 ? sw % 1 : 1 - (sw % 1)); dzy = k === 0 ? 0 : Math.PI; dzz = ZP + 8 * Math.sin(f * 9); if (!note) { note = 'Espalhando o colchão drenante de brita'; label = 'dozer'; } }
          if (t >= 22 && t < 29 && !note) { note = 'Dreno de fundo no eixo, de brita envolta em geotêxtil'; label = 'dreno'; }
          if (L.k >= 0 && L.k < NLIFT) {
            const u = L.u, yS = surf(ZP), zT = ZP - 1.6;
            if (u < 0.4) { tkOn = true; tkLane = zT; const f = ease(clamp01(u / 0.2)); tkx = XD + (XT + 4 - XD) * f; tkTilt = ease(win(u, 0.2, 0.3)) * (1 - ease(win(u, 0.32, 0.4))); loaded = u < 0.3; note = `Camada ${L.k + 1} de ${NLIFT}: caminhão descarregando o rejeito filtrado`; label = 'cam'; }
            else if (u < 0.5) { tkOn = true; tkLane = zT; tkx = XT + 4 + (XD - XT - 4) * ease((u - 0.4) / 0.1); }
            pg = u < 0.4 ? ease(win(u, 0.22, 0.38)) : 1 - ease(win(u, 0.36, 0.6)); pileM.position.set(XT, yS + 0.4 * pg, zT);
            if (u >= 0.36 && u < 0.62) { dzOn = true; const f = (u - 0.36) / 0.26; dzx = XT + 4 - 20 * f; dzy = Math.PI; dzz = ZP + Math.sin(f * 8) * 1.4; note = `Camada ${L.k + 1} de ${NLIFT}: espalhando em camada de 1 m`; label = 'dozer'; }
            if (u >= 0.62 && u < 0.93) { rOn = true; const f = (u - 0.62) / 0.31, pp = Math.min(2, Math.floor(f * 3)), q = f * 3 - pp; place(roller, X1 + 6 + 28 * (pp % 2 === 0 ? q : 1 - q), ZP + (pp - 1) * 1.8, pp % 2 === 0 ? 0 : Math.PI); note = `Camada ${L.k + 1} de ${NLIFT}: compactando · GC ${Math.round(88 + 12 * f)}%`; label = 'rolo'; }
            if (u >= 0.93) { tcOn = true; tech.group.position.set(X1 + 20, surf(ZP + 2), ZP + 2); tech.group.rotation.y = 0.6; tech.upper.rotation.x = 0.35; note = `Camada ${L.k + 1} de ${NLIFT}: ensaio de umidade e densidade`; label = 'ensaio'; }
          }
          truck.visible = tkOn && tkx < XE - 1; if (tkOn) { place(truck, tkx, tkLane, 0, 0.02); truck.rotation.y = (L.u >= 0.4 || L.k < 0) ? 0 : Math.PI; truck.userData.bed.rotation.z = tkTilt * 0.5; } load.visible = tkOn && loaded && tkTilt < 0.5;
          pileM.visible = pg > 0.02; pileM.scale.set(Math.max(0.01, 2.2 * pg), Math.max(0.01, 0.9 * pg), Math.max(0.01, 2.2 * pg));
          dozer.visible = dzOn; if (dzOn) place(dozer, dzx, dzz, dzy); roller.visible = rOn; tech.group.visible = tcOn;
          // drenagem superficial e cobertura
          gutters.forEach((g, i) => { g.visible = t >= 96 + i * 1.2; g.position.y = (i % 2 ? 2.6 : 4.6) + 0.06; });
          if (t >= 96 && t < 104 && !note) note = 'Canaletas de concreto nas bermas';
          const hs = win(t, 104, 118), hOn = hs > 0 && hs < 1; tanker.visible = hOn; seedS.set(v1, v1, false, 0);
          if (hOn) { const left = hs < 0.5, f = left ? hs * 2 : hs * 2 - 1, x = X1 - 3 + (XE - X1 + 6) * f, z = ZP + (left ? -1.8 : 1.8); place(tanker, x, z, 0, 0); tanker.rotation.y = 0; v1.set(x - 0.5, surf(z) + 2.4, z); const zt = ZP + (left ? -7.2 : 7.2); v2.set(x - 0.5, yp(7.2) + 0.4, zt); seedS.set(v1, v2, x > X1 + 1, tAbs, 0.25); if (!note) { note = 'Hidrossemeadura nas faces dos bancos'; label = 'hidro'; } }
          // monitoramento
          PZ.forEach((g, i) => { g.visible = t >= 112 + i * 2; }); MARCOS.forEach((g, i) => { g.visible = t >= 114 + i * 1.5; });
          const rd = t >= 118 && t < 128; if (rd) { tech.group.visible = true; tech.group.position.set(X1 + 12, surf(ZP + 2), ZP + 2); tech.group.rotation.y = 0.2; tech.upper.rotation.x = 0.3; }
          if (t >= 112 && t < 128 && !note) { note = t < 120 ? 'Instalando piezômetros e marcos topográficos' : 'Leituras dos instrumentos: dentro dos limites de projeto'; label = t < 120 ? 'pz' : 'marco'; }
          const fl = ease(win(t, 120, 128));
          for (let i = 0; i < 20; i++) { if (t < 122) m4.makeScale(0, 0, 0); else { const s = i < 10 ? -1 : 1, u = ((tAbs * 0.2 + (i % 10) / 10) % 1) * fl * 22; m4.makeTranslation(XP, 0.32, ZP + s * u); } dots.setMatrixAt(i, m4); } dots.instanceMatrix.needsUpdate = true;
          if (t >= 128 && !note) { note = 'A água do dreno de fundo sai limpa no pé da pilha'; label = 'agua'; }
          c.note = note; c.label = label;
        },
        idle: (t) => (t < 12 ? 'Terreno natural' : t < 30 ? 'Fundação e drenagem' : t < 95 ? 'Pilha subindo em bancos' : t < 112 ? 'Drenagem e cobertura' : 'Pilha em monitoramento'),
        anchors(a, t) {
          a.topo.set(XP, 0.4, ZP - 22); a.colchao.set(XP, 0.3, ZP - 12); a.dreno.set(XP, 0.7, ZP); a.banco.set(XP, 3.5, ZP + 6.5 - 0.0); a.berma.set(XP, 4.65, ZP - 10); a.face.set(XP, 5.6, ZP - 7); a.topoP.set(XP, 6.65, ZP - 2);
          a.pz.set(XP, 5, ZP + 5); a.marco.set(XP, 5.9, ZP + 10); a.agua.set(XP, 0.5, ZP - 16);
          a.escav.set(excW.position.x, excW.position.y + 3.9, excW.position.z); a.cam.set(truck.position.x, truck.position.y + 3.9, truck.position.z); a.dozer.set(dozer.position.x, dozer.position.y + 3.4, dozer.position.z); a.rolo.set(roller.position.x, roller.position.y + 3.2, roller.position.z);
          a.ensaio.set(tech.group.position.x, tech.group.position.y + 2.0, tech.group.position.z); a.hidro.set(tanker.position.x, tanker.position.y + 3.6, tanker.position.z); a.solo.set(X1, -15, ZP); void t;
        },
        vis: {
          topo: (t) => t > 6 && t < 12, colchao: (t) => t > 20 && t < 40, dreno: (t) => t > 24 && t < 40, banco: (t) => t > 60 && t < 96, berma: (t) => t > 98 && t < 112, face: (t) => t > 70 && t < 96, topoP: (t) => t > 94 && t < 112,
          pz: (t) => t > 116 && t < 130, marco: (t) => t > 118 && t < 130, agua: (t) => t > 128, escav: () => excW.visible, cam: () => truck.visible, dozer: () => dozer.visible, rolo: () => roller.visible, ensaio: () => tech.group.visible, hidro: () => tanker.visible,
        },
      };
    },
  });
}
