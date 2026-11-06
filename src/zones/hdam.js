import * as THREE from 'three';
import { REMOTE_DZ } from '../config.js';
import * as M from '../kit/machines.js';
import { createProfile, col, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { makeTanker } from './eroad.js';
import { makeDozer } from './eroad4.js';
import { stream } from './fund.js';

// ---------------------------------------------------------------------------
// Zona H — Barragens e rejeitos. A seção em x = 10 corta o vale de lado a lado (eixo z): a água fica a montante (z menor) e o vale
// a jusante. O motor de perfil (fprofile.js) é o mesmo da zona F.
// ---------------------------------------------------------------------------
export const X1H = 3, XEH = 50.5, ZD = -36;
export const HOLE_H = [2.5, 50.5, -58.5, -5.5];
export const H_BOX = { x0: -125, x1: X1H, z0: -58, z1: -6 };
export const GEO_H = { x1: X1H, xe: XEH, hole: HOLE_H };
export const H1_CAM = { tx: X1H, ty: 2.6, tz: ZD + 1, yaw: -1.3, pitch: 0.2, dist: 50 };
export const H1_MCAM = { tx: X1H, ty: 2.6, tz: ZD + 1, yaw: -1.3, pitch: 0.2, dist: 92 };
export const H1_STEPS = [
  { t: 'Locação e projeto', d: 'A topografia marca o eixo da barragem, o pé dos taludes e a crista. A seção de projeto é zoneada: um núcleo de argila no centro (que impede a água de passar), um filtro de areia do lado de jusante, e dois espaldares, uma massa de solo ou enrocamento dos dois lados, que dá peso e estabilidade. Aqui a barragem tem 7 m de altura, exagerados para o corte.' },
  { t: 'Fundação e trincheira de vedação', d: 'Uma barragem é tão segura quanto a fundação em que se apoia. O solo mole da superfície é removido e uma trincheira de vedação é aberta no eixo, até o solo firme ou a rocha. Ela é preenchida com argila compactada, que continua pelo núcleo e corta o caminho da água por baixo da barragem. Sem isso, a água passaria pela fundação.' },
  { t: 'Drenagem interna: tapete e dreno de pé', d: 'Por mais bem compactada que seja a argila, um pouco de água sempre atravessa a barragem. A drenagem interna controla esse caminho: um tapete de areia no fundo, a jusante, coleta a água que passa, e o dreno de pé, de enrocamento, a leva para fora sem carregar solo. O objetivo é a água sair limpa e sem pressão.' },
  { t: 'Aterro zoneado em camadas', d: 'A barragem sobe em camadas de 1 m, com todas as zonas juntas: núcleo de argila (compactado com rolo pé de carneiro, em umidade ligeiramente acima da ótima), filtro vertical de areia (que intercepta a água e impede a erosão interna, o piping) e espaldares (compactados com rolo vibratório). Cada camada só sobe depois do ensaio de densidade. Nada aqui é improvisado: o controle de compactação é o que garante a segurança.' },
  { t: 'Proteção dos taludes e vertedouro', d: 'O talude de montante recebe uma camada de enrocamento (rip-rap) que protege contra a erosão das ondas do reservatório. O de jusante é protegido com grama, e a água da chuva sai por canaletas. O vertedouro, um canal de concreto no lado da barragem, deixa passar a cheia sem que a água suba e passe por cima da crista. Galgamento é uma das principais causas de ruptura de barragens de terra.' },
  { t: 'Instrumentação e enchimento do reservatório', d: 'Piezômetros medem a pressão da água dentro da barragem e marcos superficiais medem seus deslocamentos. O reservatório é enchido devagar, enquanto as leituras são acompanhadas. A água entra no núcleo e forma a linha de percolação, que desce pelo núcleo e é interceptada pelo filtro e pelo tapete, saindo pelo dreno de pé. Se a linha saísse no talude de jusante, seria sinal de problema.' },
];
export const H1_STARTS = [0, 14, 34, 44, 107, 120];
export const H1_LABELS = [
  { k: 'topo', t: 'Estacas e projeto' }, { k: 'fund', t: 'Fundação' }, { k: 'trinch', t: 'Trincheira de vedação' }, { k: 'tapete', t: 'Tapete drenante (areia)' }, { k: 'pe', t: 'Dreno de pé (enrocamento)' },
  { k: 'nucleo', t: 'Núcleo de argila' }, { k: 'filtro', t: 'Filtro vertical (chaminé)' }, { k: 'espM', t: 'Espaldar de montante' }, { k: 'espJ', t: 'Espaldar de jusante' }, { k: 'rip', t: 'Enrocamento de proteção' },
  { k: 'crista', t: 'Crista' }, { k: 'agua', t: 'Reservatório' }, { k: 'perc', t: 'Linha de percolação' }, { k: 'pz', t: 'Piezômetros' }, { k: 'vert', t: 'Vertedouro' },
  { k: 'escav', t: 'Escavadeira' }, { k: 'cam', t: 'Caminhão basculante' }, { k: 'dozer', t: 'Trator de esteira' }, { k: 'rolo', t: 'Rolo compactador' }, { k: 'ensaio', t: 'Ensaio de densidade' },
  { k: 'hidro', t: 'Hidrossemeadura' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const H1 = { box: H_BOX };

const HD = 7, SU = 2.2, SD = 2.0, WL = 6.0, HL = 1.0, NLAY = 7, T0 = 44, PER = 9, END1 = 152, TD = 3.0, TRW = 2.2, CT = 6.5, HC0 = 1.2, KC = 0.35;
const yd = (d) => (Math.abs(d) <= 3 ? HD : d < 0 ? HD - (-3 - d) / SU : HD - (d - 3) / SD);
const yc = (a) => (a <= HC0 ? CT : CT - (a - HC0) / KC);                // topo do núcleo na distância a do eixo
const HW0 = HC0 + KC * CT;                                               // meia largura do núcleo na base
const K = { rock: col(0x7f8389), found: col(0x8f7a54), core: col(0x9a5f3c), sand: col(0xe6d6a8), toe: col(0x9aa0a6), shM: col(0xa8906a), shJ: col(0xb59c72), rip: col(0x8a8f96), water: col(0x3d8fd1), grass: col(0x6f9c50), dirt: col(0x8a6a44), seed: col(0x7dbb5c), loose: col(0xc7a679), cres: col(0xb9b6ab) };

export function createH1(engine, section) {
  return createProfile(engine, section, { dz: REMOTE_DZ,
    key: 'H1', labels: H1_LABELS, starts: H1_STARTS, END: END1, yb: -6, geo: GEO_H, hide: 'h-dam',
    build(H) {
      const { root, surf, place, dash, bar2, tree, stake, X1, XE, XP } = H;
      const tmp = new THREE.Color();
      [-57, -55, -52, -14, -11, -8].forEach((z, i) => tree(X1 + 6 + ((i * 7) % 11) * 3.5, z, 0, 1 + (i % 3) * 0.1));
      const keepStk = []; const stakes = []; for (const xs of [X1 + 8, X1 + 22, X1 + 36]) for (const dd of [-18.4, -3, 3, 17]) { stakes.push(stake(xs, ZD + dd, 0)); } void keepStk;
      const outline = dash([[ZD - 18.4, 0], [ZD - 3, HD], [ZD + 3, HD], [ZD + 17, 0]], 0.09, noclip(0xf5c518, { r: 0.6, e: 0x4a3a00 }), 8);
      const coreOut = dash([[ZD - HW0, 0], [ZD - HC0, CT], [ZD + HC0, CT], [ZD + HW0, 0]], 0.07, noclip(0xffffff, { r: 0.6, e: 0x333333 }), 8, 0.6);
      const topo = person(0x2f6fd0, 0xffffff), help = person(0xe8742c); [topo, help].forEach((p) => { p.group.visible = false; root.add(p.group); });
      const exc = M.excavator(0.9); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI / 2; excW.add(exc.group); excW.visible = false; root.add(excW);
      const truck = M.dumpTruck(0xe8b300); truck.scale.setScalar(0.85); truck.visible = false; root.add(truck);
      const load = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1, 2.4), mat(0x9a5f3c, { r: 1 })); load.position.set(2.1, 0.15, 0); load.visible = false; truck.userData.bed.add(load);
      const dozer = makeDozer(); dozer.visible = false; root.add(dozer);
      const roller = M.roller(); roller.scale.setScalar(0.7); roller.visible = false; root.add(roller);
      const tech = person(0xf2b705, 0xffffff); tech.group.visible = false; root.add(tech.group);
      const pileM = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 9), mat(0xa8906a, { r: 1 })); pileM.castShadow = true; pileM.visible = false; root.add(pileM);
      const tanker = makeTanker(0x3a9a4a); tanker.visible = false; root.add(tanker); const seedS = stream(root, 40, 0x7ac45a); const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
      // piezômetros
      const pzM = noclip(0x20242a, { r: 0.8 }), pzT = noclip(0x2f9bff, { r: 0.5, e: 0x103a66 });
      const PZ = [[-1.0, 2.0], [1.2, 1.4], [4.2, 1.0]].map(([dd, yb]) => { const g = new THREE.Group(); g.add(bar2(ZD + dd, yb, ZD + dd, HD + 0.25, 0.1, pzM, 9), bar2(ZD + dd, yb - 0.5, ZD + dd, yb + 0.25, 0.22, pzT, 9)); g.visible = false; root.add(g); return g; });
      // vertedouro (canal de concreto no lado da barragem)
      const sp = new THREE.Group(); { const a = new THREE.Vector3(X1 + 36, HD - 0.1, ZD - 1), b = new THREE.Vector3(X1 + 36, 0.15, ZD + 16.8); const ch = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 1), mat(0xdad6cc, { r: 0.8 })); ch.position.copy(a).add(b).multiplyScalar(0.5); ch.scale.z = a.distanceTo(b); ch.lookAt(b); sp.add(ch);
        for (const dx of [-2, 2]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 1), mat(0xdad6cc, { r: 0.8 })); w.position.copy(ch.position).add(new THREE.Vector3(dx, 0.3, 0)); w.scale.z = ch.scale.z; w.quaternion.copy(ch.quaternion); sp.add(w); } sp.visible = false; root.add(sp); }
      // linha de percolação e fluxo
      const phr = [[ZD - HC0, WL], [ZD + 3.0, 1.2], [ZD + 3.9, 0.75], [ZD + 13.4, 0.75]];
      const phrD = dash(phr, 0.1, noclip(0x2f9bff, { r: 0.5, e: 0x103a66 }), 9, 0.7);
      const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 5), noclip(0x8ed0ff, { r: 0.4, e: 0x2a6a99 }), 16); dots.frustumCulled = false; dots.renderOrder = 10; root.add(dots); const m4 = new THREE.Matrix4();
      const polyAt = (u) => { let L = 0; const seg = []; for (let i = 0; i < phr.length - 1; i++) { const l = Math.hypot(phr[i + 1][0] - phr[i][0], phr[i + 1][1] - phr[i][1]); seg.push(l); L += l; } let s = u * L; for (let i = 0; i < seg.length; i++) { if (s <= seg[i]) { const q = s / seg[i]; return [phr[i][0] + (phr[i + 1][0] - phr[i][0]) * q, phr[i][1] + (phr[i + 1][1] - phr[i][1]) * q]; } s -= seg[i]; } return phr[phr.length - 1]; };
      const XL = X1 + 12, XD = XE - 2.5, XT = X1 + 24;
      const lvl = (t) => {
        if (t < T0) return { k: -1, Lk: 0, u: 0, sp: 0, cp: 0 };
        if (t >= T0 + NLAY * PER) return { k: NLAY, Lk: HD, u: 1, sp: 1, cp: 1 };
        const k = Math.floor((t - T0) / PER), u = (t - T0 - k * PER) / PER, sp = ease(win(u, 0.3, 0.6)), cp = ease(win(u, 0.62, 0.93));
        return { k, u, sp, cp, Lk: k * HL + HL * (1 + 0.3 * (1 - cp)) * sp };
      };
      const trDepth = (t) => TD * ease(win(t, 16, 26)) * (1 - ease(win(t, 28, 34)));
      const wLev = (t) => WL * ease(win(t, 128, 146));
      return {
        column(z, t, o) {
          const d = z - ZD, a = Math.abs(d), L = lvl(t), inTr = a < TRW;
          const tpE = ease(win(t, 34, 42)), tdE = ease(win(t, 38, 44)), rp = ease(win(t, 107, 116)), w = wLev(t);
          let y0 = inTr ? -trDepth(t) : 0, tapTop = 0, toeTop = 0;
          if (d >= HW0 && d < 13.5) { tapTop = 0.7 * tpE; y0 = Math.max(y0, tapTop); }
          if (d >= 13.5 && d < 17.5) { toeTop = 1.6 * tdE * (1 - (d - 13.5) / 4.5 * 0.5); y0 = Math.max(y0, toeTop); }
          let y = y0; if (L.Lk > 0.001) y = Math.max(y0, Math.min(L.Lk, yd(d)));
          const top = y;
          // fundação
          o.lo[0] = -6; o.hi[0] = -3; o.c[0].copy(K.rock);
          o.lo[1] = -3; o.hi[1] = inTr ? -3 : 0; o.c[1].copy(K.found);
          const fill = inTr ? Math.min(top, 0) : -3; o.lo[2] = -3; o.hi[2] = inTr ? Math.max(-3, Math.min(0, -3 + TD * ease(win(t, 28, 34)))) : -3; o.c[2].copy(K.core);
          // drenagem
          o.lo[3] = 0; o.hi[3] = d >= HW0 && d < 13.5 ? Math.min(top, tapTop) : 0; o.c[3].copy(K.sand);
          o.lo[4] = 0; o.hi[4] = d >= 13.5 && d < 17.5 ? Math.min(top, toeTop) : 0; o.c[4].copy(K.toe);
          // núcleo, filtro, espaldares
          o.lo[5] = 0; o.hi[5] = a < HW0 ? Math.min(top, yc(a)) : 0; o.c[5].copy(K.core);
          const fTop = d > 0 && d < HW0 + 0.9 ? yc(d - 0.9) : 0, fLo = d >= HW0 ? tapTop : yc(d);
          o.lo[6] = Math.min(top, fLo); o.hi[6] = d > 0 && d < HW0 + 0.9 ? Math.min(top, Math.max(fLo, fTop)) : o.lo[6]; o.c[6].copy(K.sand);
          const below = d < 0 ? (a < HW0 ? yc(a) : 0) : d < HW0 + 0.9 ? Math.max(fTop, fLo) : d < 13.5 ? tapTop : d < 17.5 ? toeTop : 0;
          const rpT = d < -3 ? 0.6 * rp : 0, shHi = Math.max(Math.min(top, below), top - rpT);
          o.lo[7] = Math.min(top, below); o.hi[7] = shHi; o.c[7].copy(d < 0 ? K.shM : K.shJ);
          o.lo[8] = shHi; o.hi[8] = top; o.c[8].copy(K.rip);
          const wv = d < 0 && w > 0.001 && w > top + 0.001;
          o.lo[9] = top; o.hi[9] = wv ? w : top; o.c[9].copy(K.water);
          void fill;
          o.top = wv ? w : top;
          if (wv) o.topC.copy(K.water);
          else if (top > 0.02 || inTr) {
            if (inTr && L.Lk <= 0.001) tmp.copy(K.core); else { tmp.copy(d < 0 ? K.shM : K.shJ); if (a < 1.2) tmp.copy(K.core); if (L.k >= 0 && L.k < NLAY) tmp.lerp(K.loose, 0.8 * (1 - L.cp) * L.sp); }
            if (d < -3) tmp.lerp(K.rip, rp); else if (d > 3 && d < 17) tmp.lerp(K.seed, ease(win(t, 112, 120)) * 0.85); else if (a <= 3 && t > 110) tmp.lerp(K.cres, ease(win(t, 108, 114)) * 0.8);
            if (d >= HW0 && d < 13.5 && L.Lk <= 0.001 && top > 0.02) tmp.copy(K.sand); if (d >= 13.5 && d < 17.5 && L.Lk <= 0.001 && top > 0.02) tmp.copy(K.toe);
            o.topC.copy(tmp);
          } else { tmp.copy(K.grass); if (t > 8 && Math.abs(d) < 22) tmp.lerp(K.dirt, ease(win(t, 8, 14))); o.topC.copy(tmp); }
        },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null; const L = lvl(t);
          stakes.forEach((s, i) => { const u = ease(win(t, 1.5 + i * 0.5, 2.3 + i * 0.5)); s.visible = u > 0.01 && t < 44; s.scale.setScalar(Math.max(0.01, u)); });
          const dl = ease(win(t, 5, 12)); outline.forEach((d, i) => { d.visible = dl > (i + 1) / (outline.length + 1) && t < 118; }); coreOut.forEach((d, i) => { d.visible = dl > (i + 1) / (coreOut.length + 1) && t < 50; });
          const tOn = t < 14; topo.group.visible = help.group.visible = tOn;
          if (tOn) { const sx = X1 + 8 + 14 * Math.min(2, Math.floor(win(t, 1, 14) * 3)); topo.group.position.set(sx, 0, ZD - 12); topo.group.rotation.y = 1.2; help.group.position.set(sx, 0, ZD + 12 * Math.sin(tAbs * 0.5)); note = 'Marcando o eixo, o pé dos taludes e a crista'; label = 'topo'; }
          // escavadeira
          const exWin = (t >= 16 && t < 27) || (t >= 38 && t < 44);
          excW.visible = exWin; if (exWin) { const trench = t < 30, z = trench ? ZD - 3.6 : ZD + 11.8; excW.position.set(XL, surf(z), z); excW.rotation.set(0, 0, 0); exc.update(tAbs * 1.1); note = trench ? 'Escavando a trincheira de vedação até o solo firme' : 'Colocando o enrocamento do dreno de pé'; label = 'escav'; }
          // caminhão da trincheira e das camadas
          let tkOn = false, tkx = 0, tkLane = ZD - 6.2, tkTilt = 0, loaded = false, rOn = false, dzOn = false, tcOn = false, pg = 0, dzx = 0, dzz = ZD, dzy = 0;
          if (t >= 18 && t < 28) { const u = ((t - 18) % 5) / 5; tkOn = true; if (u < 0.3) tkx = XD + (XL + 7 - XD) * ease(u / 0.3); else if (u < 0.55) { tkx = XL + 7; loaded = u > 0.4; } else { tkx = XL + 7 + (XD - XL - 7) * ease((u - 0.55) / 0.45); loaded = true; } if (!note) { note = 'Caminhão levando o solo mole da fundação'; label = 'cam'; } }
          if (t >= 28 && t < 34) { rOn = true; const f = win(t, 28, 34), pp = Math.min(2, Math.floor(f * 3)), q = f * 3 - pp; place(roller, X1 + 4 + 30 * (pp % 2 === 0 ? q : 1 - q), ZD, pp % 2 === 0 ? 0 : Math.PI); note = 'Compactando a argila da trincheira, camada por camada'; label = 'rolo'; }
          if (t >= 34 && t < 42) { dzOn = true; const f = win(t, 34, 42), sw = f * 3, k = Math.floor(sw) % 2; dzx = X1 + 4 + 34 * (k === 0 ? sw % 1 : 1 - (sw % 1)); dzy = k === 0 ? 0 : Math.PI; dzz = ZD + 8 + Math.sin(f * 7) * 2; note = 'Espalhando o tapete drenante de areia'; label = 'dozer'; }
          if (L.k >= 0 && L.k < NLAY) {
            const u = L.u, yS = surf(ZD), zT = ZD - 1.6;
            if (u < 0.4) { tkOn = true; tkLane = zT; const f = ease(clamp01(u / 0.2)); tkx = XD + (XT + 4 - XD) * f; tkTilt = ease(win(u, 0.2, 0.3)) * (1 - ease(win(u, 0.32, 0.4))); loaded = u < 0.3; note = `Camada ${L.k + 1} de ${NLAY}: caminhão lançando o solo`; label = 'cam'; }
            else if (u < 0.5) { tkOn = true; tkLane = zT; tkx = XT + 4 + (XD - XT - 4) * ease((u - 0.4) / 0.1); }
            pg = u < 0.4 ? ease(win(u, 0.22, 0.38)) : 1 - ease(win(u, 0.36, 0.6)); pileM.position.set(XT, yS + 0.4 * pg, zT);
            if (u >= 0.36 && u < 0.62) { dzOn = true; const f = (u - 0.36) / 0.26; dzx = XT + 4 - 20 * f; dzy = Math.PI; dzz = ZD + Math.sin(f * 8) * 1.4; note = `Camada ${L.k + 1} de ${NLAY}: espalhando núcleo, filtro e espaldares`; label = 'dozer'; }
            if (u >= 0.62 && u < 0.93) { rOn = true; const f = (u - 0.62) / 0.31, pp = Math.min(2, Math.floor(f * 3)), q = f * 3 - pp; place(roller, X1 + 6 + 28 * (pp % 2 === 0 ? q : 1 - q), ZD + (pp - 1) * 1.8, pp % 2 === 0 ? 0 : Math.PI); note = `Camada ${L.k + 1} de ${NLAY}: compactando ${['o espaldar de montante', 'o núcleo de argila', 'o filtro e o espaldar de jusante'][pp]}`; label = 'rolo'; }
            if (u >= 0.93) { tcOn = true; tech.group.position.set(X1 + 20, surf(ZD + 2), ZD + 2); tech.group.rotation.y = 0.6; tech.upper.rotation.x = 0.35; note = `Camada ${L.k + 1} de ${NLAY}: ensaio de densidade, liberada`; label = 'ensaio'; }
          }
          truck.visible = tkOn && tkx < XE - 1; if (tkOn) { place(truck, tkx, tkLane, 0, 0.02); truck.rotation.y = loaded ? (tkx < XT + 4.5 && L.k >= 0 && L.u < 0.4 ? Math.PI : 0) : Math.PI; truck.userData.bed.rotation.z = tkTilt * 0.5; } load.visible = tkOn && loaded && tkTilt < 0.5;
          pileM.visible = pg > 0.02; pileM.scale.set(Math.max(0.01, 2.2 * pg), Math.max(0.01, 0.9 * pg), Math.max(0.01, 2.2 * pg));
          dozer.visible = dzOn; if (dzOn) place(dozer, dzx, dzz, dzy); roller.visible = rOn; tech.group.visible = tcOn;
          // proteção: enrocamento (escavadeira na crista) e hidrossemeadura
          if (t >= 107 && t < 117) { excW.visible = true; excW.position.set(XL, surf(ZD - 1.2), ZD - 1.2); excW.rotation.set(0, Math.PI, 0); exc.update(tAbs * 1.1); note = 'Colocando o enrocamento de proteção no talude de montante'; label = 'escav'; }
          sp.visible = t >= 112; if (t >= 112 && t < 120 && !note) note = 'Vertedouro: canal de concreto ao lado da barragem';
          const hs = win(t, 113, 122), hOn = hs > 0 && hs < 1 && t >= 113; tanker.visible = hOn; seedS.set(v1, v1, false, 0);
          if (hOn) { const x = X1 - 3 + (XE - X1 + 6) * hs, z = ZD + 1.6; place(tanker, x, z, 0, 0); tanker.rotation.y = 0; v1.set(x - 0.5, surf(z) + 2.4, z); const zt = ZD + 8; v2.set(x - 0.5, surf(zt) + 0.4, zt); seedS.set(v1, v2, x > X1 + 1, tAbs, 0.25); if (!note) { note = 'Hidrossemeadura no talude de jusante'; label = 'hidro'; } }
          // instrumentação
          PZ.forEach((g, i) => { g.visible = t >= 122 + i * 2; });
          const rd = t >= 126 && t < 133; if (rd) { tech.group.visible = true; tech.group.position.set(X1 + 12, surf(ZD + 1.5), ZD + 1.5); tech.group.rotation.y = 0.2; tech.upper.rotation.x = 0.3; if (!note) { note = 'Instalando piezômetros e fazendo a leitura zero'; label = 'pz'; } }
          if (t >= 120 && t < 126 && !note) { note = 'Instalando piezômetros no núcleo e no filtro'; label = 'pz'; }
          // enchimento e percolação
          if (t >= 128 && t < 146 && !note) { note = `Enchendo o reservatório: nível a ${(wLev(t)).toFixed(1).replace('.', ',')} m`; label = 'agua'; }
          const pf = ease(win(t, 134, 146)); phrD.forEach((d, i) => { d.visible = pf > (i + 1) / (phrD.length + 1); });
          for (let i = 0; i < 16; i++) { if (t < 138) m4.makeScale(0, 0, 0); else { const [zz, yy] = polyAt(((tAbs * 0.18 + i / 16) % 1) * ease(win(t, 138, 146)) + 0.0); m4.makeTranslation(XP, yy, zz); } dots.setMatrixAt(i, m4); } dots.instanceMatrix.needsUpdate = true;
          if (t >= 146 && !note) { note = 'Percolação: a água entra no núcleo e sai pelo dreno de pé'; label = 'perc'; }
          c.note = note; c.label = label;
        },
        idle: (t) => (t < 14 ? 'Vale sem barragem' : t < 34 ? 'Fundação' : t < 44 ? 'Drenagem interna' : t < 107 ? 'Barragem subindo em camadas' : t < 120 ? 'Proteção dos taludes' : t < 146 ? 'Enchendo o reservatório' : 'Barragem em operação'),
        anchors(a, t) {
          const wl = wLev(t), top = Math.max(1, Math.min(HD, lvl(t).Lk));
          a.topo.set(XP, 0.4, ZD - 18.4); a.fund.set(XP, -1.5, ZD - 9); a.trinch.set(XP, -1.5, ZD); a.tapete.set(XP, 0.35, ZD + 9); a.pe.set(XP, 0.8, ZD + 15.5);
          a.nucleo.set(XP, 3.0, ZD - 0.2); a.filtro.set(XP, 3.4, ZD + 2.8 - 0.4 + 0.4); a.espM.set(XP, 2.0, ZD - 8); a.espJ.set(XP, 2.0, ZD + 8); a.rip.set(XP, yd(-9) + 0.1, ZD - 9); a.crista.set(XP, HD + 0.05, ZD);
          a.agua.set(XP, Math.max(0.6, wl - 0.2), ZD - 28); a.perc.set(XP, 3.2, ZD + 1.2); a.pz.set(XP, HD + 0.3, ZD + 1.2); a.vert.set(X1 + 36, 4, ZD + 7);
          a.escav.set(excW.position.x, excW.position.y + 3.9, excW.position.z); a.cam.set(truck.position.x, truck.position.y + 3.9, truck.position.z); a.dozer.set(dozer.position.x, dozer.position.y + 3.4, dozer.position.z); a.rolo.set(roller.position.x, roller.position.y + 3.2, roller.position.z);
          a.ensaio.set(tech.group.position.x, tech.group.position.y + 2.0, tech.group.position.z); a.hidro.set(tanker.position.x, tanker.position.y + 3.6, tanker.position.z); a.solo.set(X1, -15, ZD); void top;
        },
        vis: {
          topo: (t) => t > 6 && t < 14, fund: (t) => t > 2 && t < 18, trinch: (t) => t > 20 && t < 34, tapete: (t) => t > 38 && t < 60, pe: (t) => t > 42 && t < 60, nucleo: (t) => t > 70 && t < 118, filtro: (t) => t > 70 && t < 118,
          espM: (t) => t > 70 && t < 108, espJ: (t) => t > 70 && t < 108, rip: (t) => t > 112 && t < 124, crista: (t) => t > 108 && t < 124, agua: (t) => t > 132, perc: (t) => t > 140, pz: (t) => t > 124 && t < 134, vert: (t) => t > 114 && t < 126,
          escav: () => excW.visible, cam: () => truck.visible, dozer: () => dozer.visible, rolo: () => roller.visible, ensaio: () => tech.group.visible, hidro: () => tanker.visible,
        },
      };
    },
  });
}
