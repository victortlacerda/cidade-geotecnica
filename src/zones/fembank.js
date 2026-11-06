import * as THREE from 'three';
import { REMOTE_DZ } from '../config.js';
import * as M from '../kit/machines.js';
import { createProfile, col, XP, XEP, ZCF, ease, clamp01, win, mat, noclip, person } from './fprofile.js';
import { X1F, F_BOX } from './fterra.js';
import { makeTanker } from './eroad.js';
import { makeDozer } from './eroad4.js';
import { stream } from './fund.js';

const ZC = ZCF;
const lerpC = (a, b, t, out) => out.copy(a).lerp(b, t);

// ===========================================================================
// F3 — Aterros. O aterro sobe em camadas de 0,6 m: caminhão, espalhamento, compactação e ensaio. Talude de 1 na vertical
// para 1,5 na horizontal, descidas d'água e proteção vegetal.
// ===========================================================================
export const F3_CAM = { tx: X1F, ty: 2.6, tz: ZC, yaw: -1.3, pitch: 0.2, dist: 44 };
export const F3_MCAM = { tx: X1F, ty: 2.6, tz: ZC, yaw: -1.3, pitch: 0.2, dist: 84 };
export const F3_STEPS = [
  { t: 'Locação e projeto', d: 'A topografia marca no terreno o pé do talude e a crista do aterro, com as cotas de projeto. O desenho amarelo mostra a seção final: uma plataforma no topo e taludes de 1 na vertical para 1,5 na horizontal, que é uma inclinação que a maioria dos solos compactados aguenta com folga.' },
  { t: 'Preparação da fundação', d: 'O aterro é tão bom quanto o terreno em que se apoia. A vegetação e o solo orgânico, que é fraco e compressível, são removidos com o trator de esteira. O terreno de fundação fica exposto, regularizado e conferido antes de receber a primeira camada.' },
  { t: 'Lançar e espalhar em camadas', d: 'O caminhão descarrega o solo em pilhas e o trator espalha em camadas soltas e uniformes, de espessura calculada para o rolo conseguir compactar até o fundo. Aqui, camadas de 0,6 m compactadas (cerca de 0,8 m soltas). Camada grossa demais fica fofa no fundo, e isso depois aparece como recalque.' },
  { t: 'Compactar e controlar cada camada', d: 'O rolo passa até o solo atingir o grau de compactação do projeto, na umidade certa. Cada camada só é liberada depois do ensaio de campo (densidade e umidade), e a camada de cima só começa depois. A compactação dá resistência, reduz deformações e diminui a entrada de água no aterro.' },
  { t: 'Acabamento do talude e drenagem', d: 'O talude é aparado na inclinação de projeto e a água que cai na plataforma é levada por canaletas na crista e por descidas d\'água em degraus, concreto ou meia-cana. Sem drenagem, a água escorre pelo talude e abre sulcos de erosão, que são o início de muitas rupturas.' },
  { t: 'Proteção vegetal', d: 'A hidrossemeadura lança sementes, adubo e fibras sobre o talude, e a grama que nasce segura o solo com as raízes. Enquanto não pega, a superfície fica protegida pela manta de fibras. Um talude bem compactado, drenado e vegetado é estável por décadas.' },
];
export const F3_STARTS = [0, 10, 18, 26, 86, 108];
export const F3_LABELS = [
  { k: 'topo', t: 'Estacas e greide' }, { k: 'fund', t: 'Fundação (solo orgânico retirado)' }, { k: 'camada', t: 'Camadas de 0,6 m' }, { k: 'talude', t: 'Talude 1 : 1,5' }, { k: 'crista', t: 'Plataforma' },
  { k: 'cam', t: 'Caminhão basculante' }, { k: 'dozer', t: 'Trator de esteira' }, { k: 'rolo', t: 'Rolo compactador' }, { k: 'ensaio', t: 'Ensaio de densidade' }, { k: 'dreno', t: 'Descida d\'água' }, { k: 'hidro', t: 'Hidrossemeadura' },
  { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const F3 = { box: F_BOX };
const HL = 0.6, NL = 9, HF = HL * NL, CW = 5, SW = 1.5, T0 = 18, PER = 7.5, END3 = 120, BASE = CW + SW * HF;
const slopeY = (d) => (BASE - d) / SW;
const K = { org: col(0x3b2a1a), grass: col(0x6f9c50), dirt: col(0x8a6a44), a: col(0x8f6a45), b: col(0x9b7650), loose: col(0xc19a6a), seed: col(0x7dbb5c), grave: col(0xb9b6ab) };

export function createF3(engine, section) {
  return createProfile(engine, section, { dz: REMOTE_DZ,
    key: 'F3', labels: F3_LABELS, starts: F3_STARTS, END: END3, yb: -0.4,
    build(H) {
      const { root, surf, place, dash, tree, stake, bar2 } = H;
      const tmp = new THREE.Color();
      const trees = [-54, -50, -46, -17, -13, -9].map((z, i) => ({ gr: tree(X1F + 5 + i * 5, z, 0, 1 + (i % 3) * 0.1), gone: 11 + i }));
      const stakes = []; for (const xs of [X1F + 8, X1F + 20, X1F + 32]) for (const dd of [-BASE, -CW, CW, BASE]) { const z = ZC + dd; stakes.push({ g: stake(xs, z, 0), keep: Math.abs(dd) === BASE }); }
      const dsg = dash([[ZC - BASE, 0], [ZC - CW, HF], [ZC + CW, HF], [ZC + BASE, 0]], 0.09, noclip(0xf5c518, { r: 0.6, e: 0x4a3a00 }), 8);
      const topo = person(0x2f6fd0, 0xffffff), help = person(0xe8742c); [topo, help].forEach((p) => { p.group.visible = false; root.add(p.group); });
      const dozer = makeDozer(); dozer.visible = false; root.add(dozer);
      const truck = M.dumpTruck(0xe8b300); truck.scale.setScalar(0.85); truck.visible = false; root.add(truck);
      const load = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1, 2.4), mat(0x9b7650, { r: 1 })); load.position.set(2.1, 0.15, 0); load.visible = false; truck.userData.bed.add(load);
      const roller = M.roller(); roller.scale.setScalar(0.7); roller.visible = false; root.add(roller);
      const tech = person(0xf2b705, 0xffffff); tech.group.visible = false; root.add(tech.group);
      const pileM = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 9), mat(0xb08a5c, { r: 1 })); pileM.castShadow = true; pileM.visible = false; root.add(pileM);
      const tanker = makeTanker(0x3a9a4a); tanker.visible = false; root.add(tanker); const seedS = stream(root, 40, 0x7ac45a); const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
      const chutes = [-1, 1].map((s) => { const a = new THREE.Vector3(X1F + 26, HF + 0.06, ZC + s * CW), b = new THREE.Vector3(X1F + 26, 0.06, ZC + s * BASE); const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 1), mat(0xc4c0b6, { r: 0.8 })); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.z = a.distanceTo(b); m.lookAt(b); m.visible = false; root.add(m); return m; });
      const XL = XEP - 2.5, XD = X1F + 24;

      // estado por instante
      const lvl = (t) => {
        if (t < T0) return { k: -1, Lk: 0, u: 0, sp: 0, cp: 0 };
        if (t >= T0 + NL * PER) return { k: NL, Lk: HF, u: 1, sp: 1, cp: 1 };
        const k = Math.floor((t - T0) / PER), u = (t - T0 - k * PER) / PER, sp = ease(win(u, 0.3, 0.6)), cp = ease(win(u, 0.62, 0.93));
        return { k, u, sp, cp, Lk: k * HL + HL * (1 + 0.3 * (1 - cp)) * sp };
      };
      return {
        column(z, t, o) {
          const d = Math.abs(z - ZC), L = lvl(t), strip = ease(win(t, 11, 18));
          const Y0 = -0.4 * strip * (1 - clamp01((d - 14) / 0.8));
          o.lo[9] = -0.4; o.hi[9] = Y0; o.c[9].copy(K.org);
          const fillOn = L.Lk > 0.001; let rel = 0;
          if (fillOn) rel = Math.max(0, Math.min(L.Lk, slopeY(d)));
          const y = Y0 + rel; o.top = y;
          for (let j = 0; j < NL; j++) {
            const isCur = j === L.k, lo = Y0 + Math.min(rel, j * HL), hi = Y0 + Math.min(rel, isCur ? L.Lk : (j + 1) * HL);
            o.lo[j] = lo; o.hi[j] = hi; o.c[j].copy(j % 2 ? K.a : K.b); if (isCur) lerpC(K.loose, o.c[j], L.cp, o.c[j]);
          }
          if (rel > 0.01) {
            const cur = Math.min(NL - 1, Math.max(0, L.k)), crest = d < CW + 0.2;
            tmp.copy(cur % 2 ? K.a : K.b); if (crest && L.k < NL) lerpC(K.loose, tmp, L.cp, tmp);
            if (!crest) tmp.lerp(K.dirt, 0.2 * ease(win(t, 86, 92)));
            if (!crest) tmp.lerp(K.seed, ease(win(t, 108, 118)) * 0.85); else tmp.lerp(K.grave, ease(win(t, 100, 106)) * 0.5);
            o.topC.copy(tmp);
          } else { tmp.copy(K.grass); if (strip > 0 && d < 14) tmp.lerp(K.dirt, strip); o.topC.copy(tmp); }
        },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null; const L = lvl(t);
          trees.forEach((tr) => { const s = 1 - ease(win(t, tr.gone, tr.gone + 2)); tr.gr.visible = s > 0.01; tr.gr.scale.setScalar(Math.max(0.01, s)); });
          stakes.forEach((s, i) => { const u = ease(win(t, 1.5 + i * 0.5, 2.3 + i * 0.5)); s.g.visible = u > 0.01; s.g.scale.setScalar(Math.max(0.01, u)); });
          const dl = ease(win(t, 5, 10)); dsg.forEach((d, i) => { d.visible = dl > (i + 1) / (dsg.length + 1); });
          const tOn = t < 10; topo.group.visible = help.group.visible = tOn;
          if (tOn) { topo.group.position.set(X1F + 8 + 12 * Math.min(2, Math.floor(win(t, 1, 10) * 3)), 0, ZC - 15); topo.group.rotation.y = 1.2; help.group.position.set(X1F + 8 + 12 * Math.min(2, Math.floor(win(t, 1, 10) * 3)), 0, ZC + 14 * Math.sin(tAbs * 0.5)); note = 'Marcando o pé do talude e a crista do aterro'; label = 'topo'; }
          // trator na limpeza
          let dzOn = false, dzx = 0, dzz = ZC, dzy = 0;
          if (t >= 10.5 && t < 18) { dzOn = true; const f = win(t, 10.5, 18), sw = f * 3; dzx = X1F + 6 + 28 * (Math.floor(sw) % 2 === 0 ? sw % 1 : 1 - (sw % 1)); dzy = (Math.floor(sw) % 2 === 0) ? 0 : Math.PI; dzz = ZC - 6 + 12 * (Math.floor(sw) / 3); note = 'Retirando o solo orgânico da fundação'; label = 'dozer'; }
          // camadas
          let tkOn = false, tkx = 0, tkTilt = 0, loaded = false, rOn = false, tcOn = false;
          if (L.k >= 0 && L.k < NL) {
            const u = L.u, zT = ZC - 1.6, yS = surf(ZC);
            if (u < 0.4) { tkOn = true; const f = ease(clamp01(u / 0.2)); tkx = XL + (XD + 4 - XL) * f; tkTilt = ease(win(u, 0.2, 0.3)) * (1 - ease(win(u, 0.32, 0.4))); loaded = u < 0.3; note = `Camada ${L.k + 1} de ${NL}: caminhão lançando o solo`; label = 'cam'; }
            else if (u < 0.5) { tkOn = true; tkx = XD + 4 + (XL - XD - 4) * ease((u - 0.4) / 0.1); }
            const pg = u < 0.4 ? ease(win(u, 0.22, 0.38)) : 1 - ease(win(u, 0.36, 0.6)); pileM.visible = pg > 0.02; pileM.scale.set(Math.max(0.01, 2.2 * pg), Math.max(0.01, 0.9 * pg), Math.max(0.01, 2.2 * pg)); pileM.position.set(XD, yS + 0.4 * pg, zT);
            if (u >= 0.36 && u < 0.62) { dzOn = true; const f = (u - 0.36) / 0.26; dzx = XD + 4 - 20 * f; dzy = Math.PI; dzz = ZC + Math.sin(f * 8) * 1.6; note = `Camada ${L.k + 1} de ${NL}: espalhando em camada solta`; label = 'dozer'; }
            if (u >= 0.62 && u < 0.93) { rOn = true; const f = (u - 0.62) / 0.31, pp = Math.min(2, Math.floor(f * 3)), q = f * 3 - pp; place(roller, X1F + 6 + 24 * (pp % 2 === 0 ? q : 1 - q), ZC - 1.8 + pp * 1.8, pp % 2 === 0 ? 0 : Math.PI); note = `Camada ${L.k + 1} de ${NL}: compactando · GC ${Math.round(85 + 15 * f)}%`; label = 'rolo'; }
            if (u >= 0.93) { tcOn = true; tech.group.position.set(X1F + 20, surf(ZC + 2), ZC + 2); tech.group.rotation.y = 0.6; tech.upper.rotation.x = 0.35; note = `Camada ${L.k + 1} de ${NL}: ensaio de densidade, liberada`; label = 'ensaio'; }
          } else pileM.visible = false;
          truck.visible = tkOn; if (tkOn) { place(truck, tkx, ZC - 1.6, 0, 0.02); truck.rotation.y = (L.u >= 0.4) ? 0 : Math.PI; truck.userData.bed.rotation.z = tkTilt * 0.5; } load.visible = tkOn && loaded; load.scale.y = Math.max(0.01, 1.1 * (1 - tkTilt));
          dozer.visible = dzOn; if (dzOn) place(dozer, dzx, dzz, dzy);
          roller.visible = rOn; tech.group.visible = tcOn;
          // acabamento
          chutes.forEach((m, i) => { m.visible = t >= 98 + i * 2; });
          if (t >= 86 && t < 98 && !note) note = 'Aparando o talude na inclinação de projeto';
          if (t >= 98 && t < 108 && !note) note = 'Descidas d\'água e canaletas de crista';
          const hs = win(t, 108, 119), hOn = hs > 0 && hs < 1; tanker.visible = hOn;
          if (hOn) { const left = hs < 0.5, f = left ? hs * 2 : hs * 2 - 1, x = X1F - 3 + (XEP - X1F + 6) * f, z = ZC + (left ? -3.2 : 3.2); place(tanker, x, z, 0, 0); tanker.rotation.y = 0; v1.set(x - 0.5, surf(z) + 2.4, z); const zt = ZC + (left ? -9 : 9); v2.set(x - 0.5, surf(zt) + 0.4, zt); seedS.set(v1, v2, x > X1F + 1, tAbs, 0.25); note = 'Hidrossemeadura sobre o talude'; label = 'hidro'; } else seedS.set(v1, v1, false, 0);
          c.note = note; c.label = label;
        },
        idle: (t) => (t < 10 ? 'Terreno natural' : t < 18 ? 'Preparando a fundação' : t < 86 ? 'Aterro subindo em camadas' : t < 108 ? 'Talude e drenagem' : t < 119 ? 'Plantando o talude' : 'Aterro pronto'),
        anchors(a, t) {
          const L = lvl(t), top = surf(ZC), k = Math.max(0, Math.min(NL - 1, L.k));
          a.topo.set(XP, 1.0, ZC - BASE); a.fund.set(XP, -0.4, ZC - BASE - 1.2); a.camada.set(XP, k * HL + HL * 0.5, ZC + 6.2 - 0.0); a.talude.set(XP, slopeY(9) * 0.9, ZC - 9); a.crista.set(XP, HF + 0.05, ZC);
          a.dozer.set(dozer.position.x, dozer.position.y + 3.4, dozer.position.z); a.cam.set(truck.position.x, truck.position.y + 3.9, truck.position.z); a.rolo.set(roller.position.x, roller.position.y + 3.2, roller.position.z); a.ensaio.set(tech.group.position.x, tech.group.position.y + 2.0, tech.group.position.z);
          a.dreno.set(X1F + 26, HF * 0.5, ZC - (CW + BASE) * 0.5); a.hidro.set(tanker.position.x, tanker.position.y + 3.6, tanker.position.z); a.solo.set(X1F, -15, ZC); void top;
        },
        vis: {
          topo: (t) => t > 6 && t < 14, fund: (t) => t > 15 && t < 40, camada: (t) => t > 30, talude: (t) => t > 86 && t < 108, crista: (t) => t > 88 && t < 106,
          cam: () => truck.visible, dozer: () => dozer.visible, rolo: () => roller.visible, ensaio: () => tech.group.visible, dreno: (t) => t > 100 && t < 112, hidro: () => tanker.visible,
        },
      };
    },
  });
}

// ===========================================================================
// F4 — Aterro sobre solo mole. A argila mole comprime e demora para adensar: drenos verticais encurtam o caminho da água e o
// aterro é construído por etapas, com sobrecarga temporária. O painel mostra o recalque ao longo do tempo.
// ===========================================================================
export const F4_CAM = { tx: X1F, ty: 0.0, tz: ZC + 3.5, yaw: -1.3, pitch: 0.2, dist: 46 };
export const F4_MCAM = { tx: X1F, ty: 0.0, tz: ZC + 3.5, yaw: -1.3, pitch: 0.2, dist: 84 };
export const F4_STEPS = [
  { t: 'O problema: argila mole', d: 'Abaixo de uma crosta superficial há seis metros de argila mole, saturada e com pouca resistência (NSPT entre 0 e 2). Um aterro alto sobre ela pode romper o terreno de fundação e, mesmo sem romper, vai recalcar muito: a água sai dos poros da argila devagar, e isso leva anos. Em uma obra com prazo, as duas coisas precisam ser tratadas.' },
  { t: 'Colchão drenante', d: 'A obra começa com uma camada de areia de 0,6 m sobre o terreno, o colchão drenante. É por ele que a água expulsa da argila vai sair para as laterais. Ele também serve de plataforma de trabalho para as máquinas, que não conseguem andar direto sobre a argila mole.' },
  { t: 'Drenos verticais pré-fabricados', d: 'A cravadora enfia no solo, em malha, tiras de plástico com núcleo ranhurado envolto em geotêxtil, os drenos verticais (PVD). Eles não aumentam a resistência: encurtam o caminho da água. Em vez de subir seis metros até a superfície, a água anda uma ou duas dezenas de centímetros até o dreno mais próximo e sobe por ele até o colchão. O adensamento que levaria anos passa a levar meses.' },
  { t: 'Aterro em etapas e instrumentação', d: 'O aterro sobe em etapas, com pausa entre elas, para a argila ganhar resistência com o adensamento antes de receber mais carga. Placas de recalque medem quanto o terreno afundou, e piezômetros medem a pressão da água nos poros. A decisão de subir a etapa seguinte vem dessas leituras e não do calendário.' },
  { t: 'Sobrecarga temporária e espera', d: 'Um metro de aterro a mais que o projeto, a sobrecarga, acelera o recalque: o solo adensa mais rápido, e parte do recalque futuro acontece antes da obra ser entregue. O gráfico mostra que, com drenos, a curva do recalque achata em meses, e sem eles continuaria afundando por anos.' },
  { t: 'Remoção da sobrecarga e pavimento', d: 'Quando as medições mostram que o recalque que sobrou é aceitável, a sobrecarga é retirada e a plataforma recebe a base e o pavimento. O recalque que ainda vai acontecer é pequeno, e a pista não ondula. Esse é o desenho de uma obra que entrega o terreno melhorado, e não a promessa de que ele vai se acomodar sozinho.' },
];
export const F4_STARTS = [0, 8, 20, 50, 100, 126];
export const F4_LABELS = [
  { k: 'crosta', t: 'Crosta ressecada' }, { k: 'mole', t: 'Argila mole (NSPT 0 a 2)' }, { k: 'firme', t: 'Solo firme' }, { k: 'colchao', t: 'Colchão drenante (areia)' }, { k: 'pvd', t: 'Drenos verticais (PVD)' },
  { k: 'etapa', t: 'Aterro em etapas' }, { k: 'sobre', t: 'Sobrecarga temporária' }, { k: 'placa', t: 'Placa de recalque' }, { k: 'rig', t: 'Cravadora de drenos' }, { k: 'cam', t: 'Caminhão basculante' },
  { k: 'dozer', t: 'Trator de esteira' }, { k: 'rolo', t: 'Rolo compactador' }, { k: 'painel', t: 'Recalque × tempo' }, { k: 'pav', t: 'Base e pavimento' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const F4 = { box: F_BOX };
const C4 = { firm: col(0xc9ae7a), mole: col(0x6c7762), crosta: col(0x8a6a3c), sand: col(0xdcc08a), A: col(0xa87b4e), B: col(0x9a6f44), C: col(0x8a6038), D: col(0xc09a68), pav: col(0x4a4d52), grass: col(0x6f9c50), dirt: col(0x8a6a44), seed: col(0x7dbb5c) };
const END4 = 150, CW4 = 5, WIN = [[50, 58, 1.4], [70, 78, 1.4], [92, 98, 0.2], [100, 106, 0.8]];
const SW_ = [0.4, 0.4, 0.06, 0.24], TAU = 14, TAU0 = 75;
const hA = (t) => ease(win(t, 50, 58)), hB = (t) => ease(win(t, 70, 78)), hC = (t) => ease(win(t, 92, 98)), hD = (t) => ease(win(t, 100, 106)), rD = (t) => ease(win(t, 126, 134));
const Hfill = (t) => 1.4 * hA(t) + 1.4 * hB(t) + 0.2 * hC(t) + 0.8 * hD(t) * (1 - rD(t));
const settle = (t, tau) => { let s = 0; WIN.forEach(([a, b], i) => { const f = ease(win(t, a, b)) * (i === 3 ? 1 - 0.15 * rD(t) : 1); s += SW_[i] * 1.0 * f * (1 - Math.exp(-Math.max(0, t - (a + b) / 2) / tau)); }); return s; };
const months = (t) => (t < 50 ? 0 : Math.min(24, (t - 50) * 0.24));
const bell = (d) => (d < 15 ? 0.5 * (1 + Math.cos(Math.PI * d / 15)) : 0);

function drawPanel4(ctx, W, Hh, t) {
  ctx.clearRect(0, 0, W, Hh); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fillRect(0, 0, W, Hh); ctx.strokeStyle = '#8a8f98'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, Hh - 6);
  ctx.fillStyle = '#23262b'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('Monitoramento · recalque × tempo', 24, 42);
  const gx0 = 80, gx1 = W - 30, gy0 = 80, gy1 = 270, tx = (m) => gx0 + (gx1 - gx0) * m / 24, ty = (s) => gy0 + (gy1 - gy0) * Math.min(1, s / 1.5);
  ctx.strokeStyle = '#c9cdd3'; ctx.lineWidth = 2; for (let i = 0; i <= 3; i++) { const y = gy0 + (gy1 - gy0) * i / 3; ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx1, y); ctx.stroke(); }
  ctx.fillStyle = '#5b5f66'; ctx.font = '17px sans-serif'; for (let i = 0; i <= 3; i++) ctx.fillText((i * 0.5).toFixed(1), 40, gy0 + (gy1 - gy0) * i / 3 + 5); for (let m = 0; m <= 24; m += 6) ctx.fillText(`${m}`, tx(m) - 6, gy1 + 22);
  ctx.save(); ctx.translate(18, 220); ctx.rotate(-Math.PI / 2); ctx.fillText('recalque (m)', 0, 0); ctx.restore(); ctx.fillText('tempo (meses)', gx1 - 130, gy1 + 44);
  const mNow = months(t);
  // sem drenos (tracejado) e com drenos
  const curve = (tau, dash, color, upTo) => { ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.setLineDash(dash); ctx.beginPath(); let f = true; for (let m = 0; m <= upTo + 0.001; m += 0.25) { const tt = 50 + m / 0.24, s = settle(tt, tau), x = tx(m), y = ty(s); if (f) { ctx.moveTo(x, y); f = false; } else ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]); };
  curve(TAU0, [10, 8], '#9aa0a8', 24); curve(TAU, [], '#2f7fd0', Math.min(24, mNow));
  // carga
  ctx.fillStyle = '#e8742c'; ctx.font = '17px sans-serif'; ctx.fillText('aterro (m)', gx0 + 8, gy0 - 4); ctx.strokeStyle = '#e8742c'; ctx.lineWidth = 3; ctx.beginPath(); for (let m = 0; m <= Math.min(24, mNow) + 0.001; m += 0.25) { const tt = 50 + m / 0.24, x = tx(m), y = gy1 - 8 - Hfill(tt) * 16; if (m === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
  const s = settle(t, TAU), U = Math.round(100 * s / Math.max(0.01, settle(150, TAU)));
  ctx.fillStyle = '#2f7fd0'; ctx.beginPath(); ctx.arc(tx(Math.min(24, mNow)), ty(s), 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#23262b'; ctx.font = 'bold 24px sans-serif'; ctx.fillText(`Recalque: ${s.toFixed(2).replace('.', ',')} m`, 24, 328); ctx.font = '19px sans-serif'; ctx.fillText(`${mNow.toFixed(0)} meses`, 300, 328);
  ctx.fillStyle = '#9aa0a8'; ctx.fillText('— — sem drenos', 410, 328 - 0); ctx.fillStyle = '#2f7fd0'; ctx.fillText('—— com drenos', 410, 350 - 0);
}

export function createF4(engine, section) {
  return createProfile(engine, section, { dz: REMOTE_DZ,
    key: 'F4', labels: F4_LABELS, starts: F4_STARTS, END: END4, yb: -8,
    build(H) {
      const { root, surf, place, tree, bar2 } = H;
      const tmp = new THREE.Color();
      [-55, -52, -49, -16, -13, -10].forEach((z, i) => tree(X1F + 5 + i * 5, z, 0, 1 + (i % 3) * 0.1));
      const PVDZ = Array.from({ length: 9 }, (_, i) => ZC + (i - 4) * 2.4);
      const pm = noclip(0x2f6fd0, { r: 0.6, e: 0x0a2a55 });
      const pvds = PVDZ.map((z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1, 0.1), pm); m.position.set(XP, 0, z); m.renderOrder = 9; m.visible = false; root.add(m); return m; });
      const rig = M.pilingRig(); const rigW = new THREE.Group(); rig.group.rotation.y = Math.PI / 2; rigW.add(rig.group); rigW.scale.setScalar(0.55); rigW.visible = false; root.add(rigW);
      const dozer = makeDozer(); dozer.visible = false; root.add(dozer);
      const truck = M.dumpTruck(0xe8b300); truck.scale.setScalar(0.85); truck.visible = false; root.add(truck);
      const load = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1, 2.4), mat(0x9a6f44, { r: 1 })); load.position.set(2.1, 0.15, 0); load.visible = false; truck.userData.bed.add(load);
      const roller = M.roller(); roller.scale.setScalar(0.7); roller.visible = false; root.add(roller);
      const exc = M.excavator(0.8); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI / 2; excW.add(exc.group); excW.visible = false; root.add(excW);
      const plate = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), mat(0x30353b)); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), mat(0xd8332a)); p.position.y = 1.1; plate.add(b, p); plate.visible = false; root.add(plate); }
      const pileM = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 9), mat(0xa87b4e, { r: 1 })); pileM.castShadow = true; pileM.visible = false; root.add(pileM);
      const tech = person(0x2f6fd0, 0xffffff); tech.group.visible = false; root.add(tech.group);
      // painel
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; const cx = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 4.95), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); pl.rotation.y = -Math.PI / 2; pl.position.set(-35, 3.7, -16.4);
      const panelG = new THREE.Group(); panelG.add(pl); for (const dz of [-3.0, 3.0]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 6), mat(0x23262b)); po.position.set(-34.9, 1.7, -16.4 + dz); panelG.add(po); } panelG.visible = false; root.add(panelG);
      let lastDraw = -1;
      const XL = XEP - 2.5, XD = X1F + 24, yg = (z, t) => -settle(t, TAU) * bell(Math.abs(z - ZC));
      const sandE = (t) => ease(win(t, 8, 20));
      return {
        column(z, t, o) {
          const d = Math.abs(z - ZC), g = yg(z, t), bl = sandE(t) * (d < 12.5 ? 1 : 0), y0 = g + 0.6 * bl;
          o.lo[0] = -8; o.hi[0] = -7; o.c[0].copy(C4.firm);
          o.lo[1] = -7; o.hi[1] = g - 1; o.c[1].copy(C4.mole);
          o.lo[2] = g - 1; o.hi[2] = g; o.c[2].copy(C4.crosta);
          o.lo[3] = g; o.hi[3] = y0; o.c[3].copy(C4.sand);
          const Hf = Hfill(t), rel = Hf > 0.001 ? Math.max(0, Math.min(Hf, (CW4 + 2 * Hf - d) / 2)) : 0;
          const lims = [0, 1.4, 2.8, 3.0, 3.8]; const cs = [C4.A, C4.B, C4.C, C4.D];
          for (let j = 0; j < 4; j++) { o.lo[4 + j] = y0 + Math.min(rel, lims[j]); o.hi[4 + j] = y0 + Math.min(rel, lims[j + 1]); o.c[4 + j].copy(cs[j]); }
          const pv = ease(win(t, 138, 146)), pvOn = d < CW4 + 0.3 ? 0.18 * pv : 0;
          o.lo[8] = y0 + Math.min(rel, 3.0); o.hi[8] = y0 + Math.min(rel, 3.0) + (rel >= 3.0 - 1e-3 ? pvOn : 0); o.c[8].copy(C4.pav);
          o.top = y0 + rel + (rel >= 3.0 - 1e-3 ? pvOn : 0) - (rel > 3.0 ? 0 : 0);
          if (rel > 0.01) { tmp.copy(C4.A); const hs = Hf > 2.8 ? 1 : Hf > 1.4 ? 0.5 : 0; tmp.lerp(C4.C, hs); if (Hf > 3.05) tmp.copy(C4.D); if (d < CW4 + 0.3 && pv > 0) tmp.lerp(C4.pav, pv); else if (d >= CW4 + 0.3 && t > 140) tmp.lerp(C4.seed, ease(win(t, 140, 148)) * 0.8); o.topC.copy(tmp); }
          else if (bl > 0.02) { o.topC.copy(C4.sand); if (d > 12) o.topC.copy(C4.grass); } else { tmp.copy(C4.grass); o.topC.copy(tmp); }
        },
        update(c) {
          const { t, tAbs } = c; let note = '', label = null;
          // drenos verticais
          pvds.forEach((m, i) => { const z = PVDZ[i], on = t > 22 + i * 3.2, g = yg(z, t), top = g + 0.6 * sandE(t), bot = -6.9; m.visible = on; if (on) { const dep = ease(win(t, 22 + i * 3.2, 24.6 + i * 3.2)); const yt = top, yb = yt + (bot - yt) * dep; m.scale.y = Math.max(0.01, yt - yb); m.position.y = (yt + yb) / 2; } });
          const rOn = t >= 21 && t < 50.5; rigW.visible = rOn; if (rOn) { const i = Math.min(8, Math.floor((t - 22) / 3.2)), z = PVDZ[i]; place(rigW, X1F + 3.2, z, 0); rig.update(tAbs * 1.2); note = `Cravando o dreno ${i + 1} de 9 · malha de 2,4 m`; label = 'rig'; }
          // máquinas do colchão e dos aterros
          let tkOn = false, tkx = 0, tkTilt = 0, loaded = false, dzOn = false, dzx = 0, dzz = ZC, dzy = 0, rlOn = false, tcOn = false, pg = 0, exOn = false;
          const yS = surf(ZC);
          const wins = [[8, 20, 'colchão'], [50, 64, 'aterro 1'], [70, 84, 'aterro 2'], [92, 100, 'aterro 3'], [100, 113, 'sobrecarga']];
          for (const [a, b, nm] of wins) if (t >= a && t < b) {
            const u = (t - a) / (b - a), p = u < 0.6 ? u / 0.6 : 1;
            if (u < 0.6) { const q = (p * 3) % 1; tkOn = true; tkx = q < 0.55 ? XL + (XD + 4 - XL) * ease(q / 0.5) : XD + 4 + (XL - XD - 4) * ease((q - 0.55) / 0.45); loaded = q < 0.45; tkTilt = ease(win(q, 0.3, 0.42)) * (1 - ease(win(q, 0.45, 0.55))) * (q < 0.55 ? 1 : 0); pg = Math.sin(Math.min(1, q * 1.6) * Math.PI) * 0.9; dzOn = q > 0.3; dzx = XD + 4 - 16 * q; dzy = Math.PI; dzz = ZC + Math.sin(p * 22) * 1.6; note = nm === 'colchão' ? 'Espalhando o colchão de areia sobre a argila' : `${nm}: lançando e espalhando o solo`; label = 'cam'; }
            else { rlOn = true; const f = (u - 0.6) / 0.4, pp = Math.min(2, Math.floor(f * 3)), q = f * 3 - pp; place(roller, X1F + 6 + 24 * (pp % 2 === 0 ? q : 1 - q), ZC - 1.8 + pp * 1.8, pp % 2 === 0 ? 0 : Math.PI); note = `${nm}: compactando`; label = 'rolo'; if (f > 0.9) { tcOn = true; } }
          }
          if (t >= 126 && t < 135) { exOn = true; excW.position.set(X1F + 12, surf(ZC), ZC); const q = ((t - 126) / 3) % 1; tkOn = true; tkx = q < 0.4 ? XL + (X1F + 19 - XL) * ease(q / 0.4) : X1F + 19 + (XL - X1F - 19) * ease((q - 0.4) / 0.6); loaded = q > 0.4; note = 'Removendo a sobrecarga com escavadeira e caminhão'; label = 'cam'; exc.update(tAbs * 1.1); }
          excW.visible = exOn;
          if (t >= 114 && t < 126 && !note) note = 'Espera: o solo adensa e o recalque desacelera';
          truck.visible = tkOn && tkx < XEP - 1; if (tkOn) { place(truck, tkx, ZC - 1.6, 0, 0.02); truck.rotation.y = loaded ? 0 : Math.PI; truck.userData.bed.rotation.z = tkTilt * 0.5; } load.visible = tkOn && loaded && tkTilt < 0.5;
          pileM.visible = pg > 0.05; pileM.scale.set(Math.max(0.01, 2.4 * pg), Math.max(0.01, 1.0 * pg), Math.max(0.01, 2.4 * pg)); pileM.position.set(XD, yS + 0.4 * pg, ZC - 1.6);
          dozer.visible = dzOn; if (dzOn) place(dozer, dzx, dzz, dzy); roller.visible = rlOn; tech.group.visible = tcOn; if (tcOn) { tech.group.position.set(X1F + 20, surf(ZC + 2), ZC + 2); tech.group.rotation.y = 0.6; tech.upper.rotation.x = 0.35; note = 'Ensaio de densidade na camada'; label = 'cam'; }
          if (t >= 138 && t < 146 && !note) note = 'Base e pavimento sobre a plataforma melhorada';
          // placa de recalque
          plate.visible = t >= 52 && t < 146; if (plate.visible) plate.position.set(X1F + 16, surf(ZC - 3.2) + 0.0, ZC - 3.2);
          // painel
          if (Math.abs(t - lastDraw) > 0.25 || t < lastDraw) { lastDraw = t; drawPanel4(cx, 640, 360, t); tex.needsUpdate = true; }
          panelG.visible = t >= 26; if (t >= 28 && t < 50 && !note) note = 'Medições vão acompanhar o recalque e a pressão da água';
          c.note = note; c.label = label;
        },
        idle: (t) => (t < 8 ? 'Argila mole sob o terreno' : t < 20 ? 'Colchão drenante' : t < 50 ? 'Cravando drenos verticais' : t < 100 ? 'Aterro em etapas' : t < 126 ? 'Sobrecarga e espera' : t < 138 ? 'Retirando a sobrecarga' : t < 148 ? 'Pavimentando' : 'Obra pronta'),
        anchors(a, t) {
          const g0 = yg(ZC - 16, t);
          a.crosta.set(XP, g0 - 0.5, ZC - 14); a.mole.set(XP, -4, ZC - 14); a.firme.set(XP, -7.5, ZC - 14); a.colchao.set(XP, g0 + 0.3, ZC - 11.8); a.pvd.set(XP, -3, PVDZ[2]);
          a.etapa.set(XP, yg(ZC, t) + 0.6 + 0.8, ZC + 6.4); a.sobre.set(XP, yg(ZC, t) + 0.6 + 3.4, ZC + 3.4); a.placa.set(plate.position.x, plate.position.y + 2.4, plate.position.z); a.rig.set(rigW.position.x, rigW.position.y + 7, rigW.position.z);
          a.cam.set(truck.position.x, truck.position.y + 3.9, truck.position.z); a.dozer.set(dozer.position.x, dozer.position.y + 3.4, dozer.position.z); a.rolo.set(roller.position.x, roller.position.y + 3.2, roller.position.z);
          a.painel.set(-35, 6.4, -16.4); a.pav.set(XP, yg(ZC, t) + 0.6 + 3.2, ZC); a.solo.set(X1F, -15, ZC);
        },
        vis: {
          crosta: (t) => t > 1 && t < 22, mole: (t) => t > 3 && t < 22, firme: (t) => t > 5 && t < 22, colchao: (t) => t > 18 && t < 36, pvd: (t) => t > 30, etapa: (t) => t > 60 && t < 100, sobre: (t) => t > 104 && t < 126, placa: (t) => t > 54 && t < 100,
          rig: () => rigW.visible, cam: () => truck.visible, dozer: () => dozer.visible, rolo: () => roller.visible, painel: (t) => t > 60, pav: (t) => t > 144,
        },
      };
    },
  });
}
