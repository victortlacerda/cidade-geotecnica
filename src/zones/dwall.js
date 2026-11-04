import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person, plateCompactor, stream, barSet, WET, CURED } from './fund.js';
import { X1, PZ, SITE_BOX, vplane, bx, baseBox, bar, depthMat, strataQuad, soilColorAt, buildSurroundings } from './dsite.js';
import { hideDPit, showDPit } from './dpit.js';

// ---------------------------------------------------------------------------
// Muros de arrimo da Zona D (D8 gravidade, D10 flexão, D11 gabião).
// Seção em x = X1: o muro corre ao longo de x (14 m), o aterro fica ao norte (z menor, até +3,5 m)
// e o lado de baixo (rua) fica ao sul. Camadas de aterro de 0,5 m, dreno e compactação são comuns.
// ---------------------------------------------------------------------------
export const PXW = 14, LH = 0.5, NL = 7, FT = 3.5, ZN0 = -45;
const XP = X1 - 0.045;
const earthL = new THREE.Color(0xc29a64), earthC = new THREE.Color(0x8a6a43);

// ----- helpers de geometria no plano (z, y) extrudado ao longo de x
const clipPoly = (pts, ya, yb) => {
  const run = (arr, keep, inter) => { const out = []; for (let i = 0; i < arr.length; i++) { const a = arr[i], b = arr[(i + 1) % arr.length], ka = keep(a), kb = keep(b); if (ka) out.push(a); if (ka !== kb) out.push(inter(a, b)); } return out; };
  const at = (y) => (a, b) => { const s = (y - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * s, y]; };
  let r = run(pts, (p) => p[1] >= ya - 1e-9, at(ya)); r = run(r, (p) => p[1] <= yb + 1e-9, at(yb)); return r;
};
const shapeOf = (pts) => { const s = new THREE.Shape(); pts.forEach(([z, y], i) => (i ? s.lineTo(-z, y) : s.moveTo(-z, y))); s.closePath(); return s; };
const prism = (pts, len = PXW) => { const g = new THREE.ExtrudeGeometry(shapeOf(pts), { depth: len, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(X1, 0, 0); return g; };
const capGeo = (pts) => { const g = new THREE.ShapeGeometry(shapeOf(pts)); g.rotateY(Math.PI / 2); return g; };
// barra plana desenhada no plano do corte (z0,y0) -> (z1,y1)
export const bar2 = (z0, y0, z1, y1, th, m, ro = 7) => {
  const a = new THREE.Vector3(XP, y0, z0), b = new THREE.Vector3(XP, y1, z1);
  const o = new THREE.Mesh(new THREE.BoxGeometry(0.02, th, 1), m); o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.z = a.distanceTo(b); o.lookAt(b); o.renderOrder = ro; return o;
};
// painel 3D (fôrma) ao longo de x entre dois pontos (z,y)
const panel = (z0, y0, z1, y1, m) => {
  const a = new THREE.Vector3(X1 + PXW / 2, y0, z0), b = new THREE.Vector3(X1 + PXW / 2, y1, z1);
  const o = new THREE.Mesh(new THREE.BoxGeometry(PXW + 0.3, 0.06, 1), m); o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.z = a.distanceTo(b); o.lookAt(b); o.castShadow = true; return o;
};
const offs = (z0, y0, z1, y1, d) => { const dz = z1 - z0, dy = y1 - y0, L = Math.hypot(dz, dy); const nz = -dy / L, ny = dz / L; return [z0 + nz * d, y0 + ny * d, z1 + nz * d, y1 + ny * d]; };

// ----- peça de concreto em fatias (cada fatia sobe como se fosse concretada)
function makeLift(parent, pts, ya, yb) {
  const sl = clipPoly(pts, ya, yb).map(([z, y]) => [z, y - ya]);
  const bodyM = mat(0xb9b5ab, { r: 0.95 }), capM = noclip(0xc9c5ba, { r: 1, e: 0x25231f });
  const g = new THREE.Group(); g.position.y = ya; g.visible = false; parent.add(g);
  const body = new THREE.Mesh(prism(sl), bodyM); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const cap = new THREE.Mesh(capGeo(sl), capM); cap.position.x = X1 - 0.03; cap.renderOrder = 4; g.add(cap);
  return {
    ya, yb,
    set(f, cure) { g.visible = f > 0.01; g.scale.y = Math.max(0.001, f); bodyM.color.copy(WET).lerp(CURED, cure); capM.color.copy(WET).lerp(CURED, cure); capM.emissive.copy(capM.color).multiplyScalar(0.25); },
  };
}

// ----- texturas do gabião
function stoneTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#857f75'; x.fillRect(0, 0, 128, 128);
  let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const cols = ['#9a948a', '#b3ab9a', '#7d786f', '#c4bba6', '#8a8274', '#a39a88'];
  for (let i = 0; i < 70; i++) {
    const px = r() * 128, py = r() * 128, rad = 7 + r() * 9; x.fillStyle = cols[Math.floor(r() * cols.length)]; x.beginPath();
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2, rr = rad * (0.7 + r() * 0.5); x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); }
    x.closePath(); x.fill(); x.strokeStyle = 'rgba(40,36,30,0.35)'; x.lineWidth = 1; x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function meshTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.clearRect(0, 0, 128, 128); x.strokeStyle = '#3b4047'; x.lineWidth = 3;
  for (let i = -128; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); x.beginPath(); x.moveTo(i + 128, 0); x.lineTo(i, 128); x.stroke(); }
  x.lineWidth = 5; x.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// ===========================================================================
// ESPECIFICAÇÕES
// ===========================================================================
export const D8_STEPS = [
  { t: 'Escavar a fundação e regularizar', d: 'A escavadeira abre a vala da fundação do muro, um pouco mais larga que a base, e o solo é levado por caminhão. O fundo é limpo, compactado e coberto com uma camada fina de concreto magro, que deixa a base plana e limpa para receber o muro.' },
  { t: 'Montar as fôrmas e concretar por camadas', d: 'O muro de gravidade se segura pelo próprio peso, por isso é uma massa grande de concreto simples (ou concreto ciclópico, com pedras grandes). As fôrmas de madeira dão o perfil do muro, mais largo embaixo que em cima. O concreto sobe em camadas de cerca de 1,2 m, esperando a anterior endurecer.' },
  { t: 'Dreno: tubo, brita e barbacãs', d: 'Sem dreno, a água se acumula atrás do muro e soma um empuxo enorme ao do solo. Atrás do muro vão um tubo dreno furado, envolto em brita, e uma manta de brita com geotêxtil, que deixa a água passar e segura o solo fino. Pelos furos do muro (barbacãs), a água sai.' },
  { t: 'Reaterro compactado em camadas', d: 'O solo de trás é lançado em camadas de 0,5 m e compactado: rolo no meio e compactador manual perto do muro, para não empurrá-lo. A brita e o geotêxtil sobem junto com o aterro. Camada grossa ou mal compactada recalca e aumenta o empuxo.' },
];
export const D10_STEPS = [
  { t: 'Escavar a fundação e regularizar', d: 'Vala larga o bastante para a sapata em L, com fundo limpo e concreto magro (5 a 10 cm) por baixo. O solo escavado é levado por caminhão.' },
  { t: 'Armar a sapata e o arranque do fuste', d: 'Na sapata vão duas telas de barras (inferior e superior), e as barras do fuste ficam como arranque, dobradas em L para dentro da sapata. O desenho da armadura mostra onde o concreto é tracionado: a face do fuste do lado do aterro.' },
  { t: 'Fôrmas e concretagem da sapata e do fuste', d: 'Concreta-se primeiro a sapata. Depois, com a armadura do fuste pronta, fecham-se as fôrmas, com tirantes entre elas e escoras, e concreta-se o fuste em duas etapas. As fôrmas são retiradas após a cura.' },
  { t: 'Dreno: tubo, brita e barbacãs', d: 'O dreno sobe junto: tubo furado no pé do fuste, envolto em brita, e uma manta de brita com geotêxtil atrás do muro. As barbacãs atravessam o fuste e deixam a água sair.' },
  { t: 'Reaterro compactado sobre a sapata', d: 'O aterro é lançado em camadas de 0,5 m e compactado. O solo que fica em cima do talão (a parte da sapata atrás do fuste) pesa sobre a sapata e ajuda a estabilizar o muro: é por isso que o muro em L usa menos concreto que o de gravidade.' },
];
export const D11_STEPS = [
  { t: 'Escavar e regularizar a base', d: 'Vala rasa, pouco mais larga que a base do muro, e uma camada de brita ou solo bem compactado para nivelar. O gabião aceita pequenos recalques, então a base não precisa ser perfeita.' },
  { t: 'Montar e encher as gaiolas', d: 'As gaiolas são caixas de tela de aço, de 2 m de comprimento por 1 m de lado, montadas no local e amarradas umas às outras. Enchem-se de pedras (rachão) arrumadas à mão nas faces, e as tampas são costuradas com arame.' },
  { t: 'Geotêxtil e aterro atrás da fiada', d: 'Atrás de cada fiada vai uma manta de geotêxtil, para o solo fino não escapar entre as pedras, e o aterro é compactado em camadas. O próprio gabião é permeável: a água passa pelas pedras e não precisa de barbacãs.' },
  { t: 'Subir fiada por fiada até o topo', d: 'O processo se repete a cada fiada: gaiolas, pedras, geotêxtil e aterro. Cada fiada recua um pouco, deixando o muro mais largo embaixo (como um muro de gravidade) e mais flexível: ele se deforma sem romper.' },
];
const L8 = [
  { k: 'muro', t: 'Muro de gravidade' }, { k: 'lastro', t: 'Concreto magro' }, { k: 'forma', t: 'Fôrmas de madeira' }, { k: 'camada', t: 'Camada concretada' },
  { k: 'tubo', t: 'Tubo dreno' }, { k: 'brita', t: 'Brita (dreno)' }, { k: 'geotex', t: 'Geotêxtil' }, { k: 'barbaca', t: 'Barbacã (saída da água)' },
  { k: 'aterro', t: 'Aterro compactado' }, { k: 'rolo', t: 'Rolo compactador' }, { k: 'placa', t: 'Compactador manual' }, { k: 'escav', t: 'Escavadeira' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
const L10 = [
  { k: 'muro', t: 'Fuste do muro em L' }, { k: 'sapata', t: 'Sapata (laje de base)' }, { k: 'talao', t: 'Talão (solo pesa aqui)' }, { k: 'lastro', t: 'Concreto magro' }, { k: 'armadura', t: 'Armadura' }, { k: 'forma', t: 'Fôrmas e escoras' },
  { k: 'tubo', t: 'Tubo dreno' }, { k: 'brita', t: 'Brita (dreno)' }, { k: 'geotex', t: 'Geotêxtil' }, { k: 'barbaca', t: 'Barbacã' },
  { k: 'aterro', t: 'Aterro compactado' }, { k: 'rolo', t: 'Rolo compactador' }, { k: 'placa', t: 'Compactador manual' }, { k: 'escav', t: 'Escavadeira' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
const L11 = [
  { k: 'muro', t: 'Muro de gabião' }, { k: 'gaiola', t: 'Gaiola de tela de aço' }, { k: 'pedra', t: 'Pedras (rachão)' }, { k: 'lastro', t: 'Brita de regularização' },
  { k: 'geotex', t: 'Geotêxtil' }, { k: 'aterro', t: 'Aterro compactado' }, { k: 'rolo', t: 'Rolo compactador' }, { k: 'placa', t: 'Compactador manual' }, { k: 'escav', t: 'Escavadeira' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const D8_LABELS = L8, D10_LABELS = L10, D11_LABELS = L11;
export const DW_CAM = { tx: X1, ty: 1.2, tz: -34, yaw: -1.3, pitch: 0.2, dist: 30 };
export const DW_MCAM = { tx: X1, ty: 0, tz: -34, yaw: -1.3, pitch: 0.2, dist: 62 };

const fillSched = (t0, dt) => Array.from({ length: NL }, (_, k) => t0 + k * dt);

const SPEC = {
  D8: {
    DTR: 1.0, trench: [-32.6, -27.2], gT: 0.5, dtL: 5.5,
    T: { dig: [3, 15], haul: [15, 25], lastro: [22, 25], forms: [26, 31], lifts: [32, 41, 50, 59], strip: [66, 70], pipe: [70, 75], refill: [75, 81], END: 128 },
    LT: fillSched(82, 5.5), starts: [0, 26, 70, 82],
    backZ: (y) => -31.6 + 1.6 * clamp01(y / 3.6),
    steps: D8_STEPS, labels: L8,
  },
  D10: {
    DTR: 1.0, trench: [-34.4, -27.8], gT: 0.5, dtL: 5.5,
    T: { dig: [3, 15], haul: [15, 25], lastro: [22, 25], bars: [26, 35], slab: [36, 40], bars2: [41, 50], forms: [51, 56], lifts: [57, 66], strip: [76, 80], pipe: [80, 85], refill: [85, 91], END: 138 },
    LT: fillSched(92, 5.5), starts: [0, 26, 51, 80, 92],
    backZ: (y) => -30.8 + 0.3 * clamp01((y + 0.4) / 4.1),
    steps: D10_STEPS, labels: L10,
  },
  D11: {
    DTR: 0.7, trench: [-31.8, -27.2], gT: 0, dtL: 5.0,
    T: { dig: [3, 12], haul: [12, 19], lastro: [16, 19], rows: [19, 42, 65, 88], rdur: 11, refill: [31, 35], END: 120 },
    LT: [35, 53, 58, 76, 81, 99, 104], starts: [0, 19, 35, 53],
    backZ: (y) => { const r = Math.min(3, Math.floor(y - 0.001 + 0.5)); return -28.0 - 0.15 * r - [3, 3, 2, 2][r]; },
    steps: D11_STEPS, labels: L11,
  },
};
SPEC.D8.vis = { muro: (t) => t > 41, lastro: (t) => t > 24, forma: (t) => t > 28 && t < 66, camada: (t) => t > 36 && t < 62, tubo: (t) => t > 72, brita: (t) => t > 75, geotex: (t) => t > 82, barbaca: (t) => t > 50, aterro: (t) => t > 86, rolo: (t) => t > 90, placa: (t) => t > 90, escav: (t) => t > 4 && t < 21 };
SPEC.D10.vis = { muro: (t) => t > 62, sapata: (t) => t > 38, talao: (t) => t > 100, lastro: (t) => t > 24, armadura: (t) => t > 30 && t < 56, forma: (t) => t > 53 && t < 77, tubo: (t) => t > 82, brita: (t) => t > 85, geotex: (t) => t > 92, barbaca: (t) => t > 66, aterro: (t) => t > 96, rolo: (t) => t > 100, placa: (t) => t > 100, escav: (t) => t > 4 && t < 21 };
SPEC.D11.vis = { muro: (t) => t > 30, gaiola: (t) => t > 20, pedra: (t) => t > 26, lastro: (t) => t > 18, geotex: (t) => t > 36, aterro: (t) => t > 40, rolo: (t) => t > 42, placa: (t) => t > 42, escav: (t) => t > 4 };

export const DW = { box: SITE_BOX };

// ===========================================================================
// construtores específicos de cada muro
// ===========================================================================
const woodM = mat(0xb98a55, { r: 0.9 });
const woodC = noclip(0xb98a55, { r: 0.9, e: 0x2a1c0a });
const steelC = noclip(0x4b5058, { r: 0.5, m: 0.4 });

// ---- D8: gravidade
const PTS8 = [[-28.0, -0.9], [-28.0, 0], [-29.0, 3.6], [-30.0, 3.6], [-31.6, 0], [-31.6, -0.9]];
const LY8 = [-0.9, 0.3, 1.5, 2.7, 3.6];
function build8(ctx) {
  const { root, T } = ctx;
  const lifts = LY8.slice(0, 4).map((ya, i) => makeLift(root, PTS8, ya, LY8[i + 1]));
  const forms = new THREE.Group(); root.add(forms); forms.visible = false;
  const fs = [[PTS8[0], PTS8[1]], [PTS8[1], PTS8[2]], [PTS8[4], PTS8[3]], [PTS8[5], PTS8[4]]];
  fs.forEach(([a, b], i) => {
    const front = i < 2; const o = offs(a[0], a[1], b[0], b[1], front ? 0.06 : -0.06);
    forms.add(panel(o[0], o[1], o[2], o[3], woodM), bar2(o[0], o[1], o[2], o[3], 0.07, woodC));
  });
  // escoras de madeira na frente
  for (const [z0, y0, z1, y1] of [[-25.6, 0, -28.7, 2.6], [-25.2, 0, -28.9, 3.2]]) {
    forms.add(bar2(z0, y0, z1, y1, 0.1, woodC));
    for (const x of [X1 + 3, X1 + 8.5, X1 + 13]) forms.add(bar(new THREE.Vector3(x, y0, z0), new THREE.Vector3(x, y1, z1), 0.1, woodM));
  }
  return {
    update(t) {
      const f = ease(win(t, T.forms[0], T.forms[1])) * (1 - ease(win(t, T.strip[0], T.strip[1])));
      forms.visible = f > 0.01; forms.scale.y = Math.max(0.001, f);
      lifts.forEach((l, i) => { const a = T.lifts[i]; l.set(ease(win(t, a, a + 4)), win(t, a + 4, a + 11)); });
    },
    pour(t) { for (let i = 0; i < 4; i++) { const a = T.lifts[i]; if (t >= a && t < a + 4) { const y = LY8[i] + (LY8[i + 1] - LY8[i]) * ease(win(t, a, a + 4)); return { y, z: (PTS8[0][0] + PTS8[5][0]) / 2 + (y > 0 ? 0.3 * y / 3.6 : 0) }; } } return null; },
    pourSpan: [T.lifts[0] - 6, T.lifts[3] + 9],
    wallEnd: T.lifts[3] + 5,
    anchors(a, t) {
      a.muro.set(XP, 1.8, -29.6); a.lastro.set(XP, -0.95, -31.5); a.forma.set(XP, 1.4, -28.5 - 0.06); a.camada.set(XP, 0.9, -30.2);
      a.barbaca.set(XP, 0.4, -28.0); a.tubo.set(XP, -0.55, -32.0); a.brita.set(XP, 1.5, -32.2); a.geotex.set(XP, 2.6, -32.0);
    },
    notes(t) {
      if (t < T.forms[0]) return t < T.dig[0] ? 'Escavadeira chegando' : t < T.haul[0] ? 'Escavando a fundação' : t < T.lastro[0] ? 'Caminhão levando o solo' : 'Concreto magro no fundo';
      if (t < T.strip[0]) { const n = T.lifts.filter((a) => t >= a).length; return t < T.lifts[0] ? 'Montando as fôrmas' : `Camada de concreto ${Math.min(4, n)} de 4`; }
      return null;
    },
    weeps: [{ y: 0.35, zf: -28.0 - 0.35 / 3.6, zb: -31.6 + 1.6 * 0.35 / 3.6, t: T.lifts[1] + 1 }, { y: 1.8, zf: -28.0 - 1.8 / 3.6, zb: -31.6 + 1.6 * 1.8 / 3.6, t: T.lifts[2] + 1 }],
    pipe: { z: -32.15, y: -0.55, bed: [-32.55, -31.6, -0.9, 0.0] },
  };
}

// ---- D10: flexão (L)
const SLAB = [[-28.6, -0.9], [-28.6, -0.4], [-33.6, -0.4], [-33.6, -0.9]];
const STEM = [[-30.0, -0.4], [-30.0, 3.7], [-30.5, 3.7], [-30.8, -0.4]];
function build10(ctx) {
  const { root, T } = ctx;
  const slab = makeLift(root, SLAB, -0.9, -0.4);
  const stemY = [-0.4, 1.65, 3.7];
  const stemL = [makeLift(root, STEM, stemY[0], stemY[1]), makeLift(root, STEM, stemY[1], stemY[2])];
  const rebarM = 0x6a4f3f;
  // armadura (3D, instanciada)
  const NX = 20, xi = (i) => X1 + 0.4 + 0.7 * i;
  const bs = barSet(root, 160, rebarM, 0.04); const R = [];
  const add = (axis, cx, cy, cz, len, g, ord) => R.push({ axis, cx, cy, cz, len, g, ord });
  for (let i = 0; i < NX; i++) add('z', xi(i), -0.82, -31.1, 4.8, 0, i / NX);            // sapata inferior (transversais)
  for (let j = 0; j < 9; j++) add('x', X1 + 7, -0.74, -33.2 + 0.5 * j, 13.6, 0, j / 9);   // sapata inferior (longitudinais)
  for (let i = 0; i < NX; i++) { add('y', xi(i), 1.37, -30.12, 4.5, 1, i / NX); add('y', xi(i), 1.37, -30.62, 4.5, 1, i / NX); } // arranque + fuste
  for (let i = 0; i < NX; i++) add('z', xi(i), -0.52, -31.1, 4.8, 2, i / NX);            // sapata superior
  for (let j = 0; j < 9; j++) add('x', X1 + 7, -0.6, -33.2 + 0.5 * j, 13.6, 2, j / 9);
  for (const y of [0.3, 0.9, 1.5, 2.1, 2.7, 3.3]) for (const z of [-30.08, -30.55 - 0.05 * (y + 0.4) / 3.7]) add('x', X1 + 7, y, z, 13.6, 3, (y - 0.3) / 3.0);
  const NB = R.length;
  const gw = [[T.bars[0], T.bars[0] + 4], [T.bars[0] + 3, T.bars[1] - 2], [T.bars[0] + 6, T.bars[1]], [T.bars2[0], T.bars2[1]]];
  // formas do fuste
  const forms = new THREE.Group(); root.add(forms); forms.visible = false;
  { const f = offs(-30.0, -0.4, -30.0, 3.7, 0.06), b = offs(-30.8, -0.4, -30.5, 3.7, -0.06);
    forms.add(panel(f[0], f[1], f[2], f[3], woodM), bar2(f[0], f[1], f[2], f[3], 0.07, woodC), panel(b[0], b[1], b[2], b[3], woodM), bar2(b[0], b[1], b[2], b[3], 0.07, woodC));
    for (const y of [0.4, 1.8, 3.2]) { const zb = -30.8 + 0.3 * (y + 0.4) / 4.1; forms.add(bar2(-29.9, y, zb - 0.12, y, 0.05, steelC)); }
    for (const [z0, y0, z1, y1] of [[-26.6, -0.3, -29.95, 2.4], [-26.2, -0.3, -29.95, 3.3]]) {
      forms.add(bar2(z0, y0, z1, y1, 0.1, woodC));
      for (const x of [X1 + 3, X1 + 8.5, X1 + 13]) forms.add(bar(new THREE.Vector3(x, y0, z0), new THREE.Vector3(x, y1, z1), 0.1, woodM));
    }
    for (const [z0, y0, z1, y1] of [[-34.0, -0.3, -30.9, 2.2]]) { forms.add(bar2(z0, y0, z1, y1, 0.1, woodC)); for (const x of [X1 + 3, X1 + 8.5, X1 + 13]) forms.add(bar(new THREE.Vector3(x, y0, z0), new THREE.Vector3(x, y1, z1), 0.1, woodM)); }
  }
  // armadura desenhada no corte (linhas e pontos), visível depois da concretagem também
  const secB = [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()]; secB.forEach((g) => { g.visible = false; root.add(g); });
  const dotM = noclip(0x2e3238, { r: 0.6 });
  const dot = (g, z, y) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12), dotM); m.rotation.y = -Math.PI / 2; m.position.set(X1 - 0.05, y, z); m.renderOrder = 8; g.add(m); };
  secB[0].add(bar2(-33.4, -0.82, -28.8, -0.82, 0.06, steelC)); for (let j = 0; j < 9; j++) dot(secB[0], -33.2 + 0.5 * j, -0.74);
  secB[1].add(bar2(-30.15, -0.82, -30.15, 3.55, 0.06, steelC), bar2(-30.62, -0.82, -30.55, 3.55, 0.06, steelC));
  secB[2].add(bar2(-33.4, -0.52, -29.2, -0.52, 0.06, steelC)); for (let j = 0; j < 9; j++) dot(secB[2], -33.2 + 0.5 * j, -0.6);
  for (const y of [0.3, 0.9, 1.5, 2.1, 2.7, 3.3]) for (const z of [-30.08, -30.55 - 0.05 * (y + 0.4) / 3.7]) dot(secB[3], z, y);
  const pourY = (t) => { const a = T.lifts[0]; if (t >= a && t < a + 4) return stemY[0] + 2.05 * ease(win(t, a, a + 4)); const b = T.lifts[1]; if (t >= b && t < b + 4) return stemY[1] + 2.05 * ease(win(t, b, b + 4)); return null; };
  void pourY;
  return {
    update(t) {
      for (let i = 0; i < NB; i++) { const r = R[i], [a, b] = gw[r.g], u = ease(win(t, a + r.ord * (b - a) * 0.6, a + r.ord * (b - a) * 0.6 + (b - a) * 0.4)); bs.put(i, r.axis, r.cx, r.cy, r.cz, r.len * u); }
      for (let i = NB; i < 160; i++) bs.put(i, 'x', 0, 0, 0, 0);
      bs.done();
      secB.forEach((g, i) => { g.visible = t > (gw[i][0] + gw[i][1]) / 2; });
      slab.set(ease(win(t, T.slab[0], T.slab[1])), win(t, T.slab[1], T.slab[1] + 6));
      stemL.forEach((l, i) => { const a = T.lifts[0] + i * 9; l.set(ease(win(t, a, a + 4)), win(t, a + 4, a + 11)); });
      const f = ease(win(t, T.forms[0], T.forms[1])) * (1 - ease(win(t, T.strip[0], T.strip[1])));
      forms.visible = f > 0.01; forms.scale.y = Math.max(0.001, f);
    },
    pour(t) {
      if (t >= T.slab[0] && t < T.slab[1]) return { y: -0.9 + 0.5 * ease(win(t, T.slab[0], T.slab[1])), z: -31.0 };
      for (let i = 0; i < 2; i++) { const a = T.lifts[0] + i * 9; if (t >= a && t < a + 4) return { y: stemY[i] + 2.05 * ease(win(t, a, a + 4)), z: -30.3 }; }
      return null;
    },
    pourSpan: [T.slab[0] - 6, T.lifts[0] + 9 + 8],
    wallEnd: T.lifts[0] + 13,
    anchors(a) {
      a.muro.set(XP, 2.2, -30.2); a.sapata.set(XP, -0.65, -29.2); a.talao.set(XP, -0.65, -32.6); a.lastro.set(XP, -0.95, -33.2); a.armadura.set(XP, 0.6, -30.5); a.forma.set(XP, 1.2, -29.95);
      a.barbaca.set(XP, 0.4, -30.0); a.tubo.set(XP, -0.25, -31.2); a.brita.set(XP, 1.6, -31.5); a.geotex.set(XP, 2.7, -31.4);
    },
    notes(t) {
      if (t < T.bars[0]) return t < T.dig[0] ? 'Escavadeira chegando' : t < T.haul[0] ? 'Escavando a fundação' : t < T.lastro[0] ? 'Caminhão levando o solo' : 'Concreto magro no fundo';
      if (t < T.forms[0]) return t < T.slab[0] ? 'Armando a sapata e o arranque' : t < T.slab[1] + 1 ? 'Concretando a sapata' : 'Armando o fuste';
      if (t < T.strip[0]) return t < T.lifts[0] ? 'Fechando as fôrmas do fuste' : t < T.lifts[0] + 9 ? 'Concretando o fuste · etapa 1 de 2' : 'Concretando o fuste · etapa 2 de 2';
      return null;
    },
    weeps: [{ y: 0.35, zf: -30.0, zb: -30.78, t: T.lifts[0] + 6 }, { y: 1.8, zf: -30.0, zb: -30.7, t: T.lifts[1] + 6 }],
    pipe: { z: -31.25, y: -0.25, bed: [-31.75, -30.8, -0.4, 0.0] },
  };
}

// ---- D11: gabião
const ROWS = [{ y: -0.5, zf: -28.0, w: 3 }, { y: 0.5, zf: -28.15, w: 3 }, { y: 1.5, zf: -28.3, w: 2 }, { y: 2.5, zf: -28.45, w: 2 }];
function build11(ctx) {
  const { root, T } = ctx;
  const NXU = 7, units = [];
  ROWS.forEach((r, ri) => { for (let c = 0; c < r.w; c++) for (let i = 0; i < NXU; i++) units.push({ ri, c, i, yb: r.y, zc: r.zf - 0.5 - c, xc: X1 + 1 + 2 * i }); });
  const N = units.length;
  const gridT = meshTex(), stT = stoneTex(); gridT.repeat.set(2, 1); stT.repeat.set(2, 1);
  const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.translate(0, 0.5, 0);
  const frameM = new THREE.MeshStandardMaterial({ map: gridT, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3 });
  const stoneM = new THREE.MeshStandardMaterial({ map: stT, roughness: 1 });
  const fr = new THREE.InstancedMesh(boxG, frameM, N), st = new THREE.InstancedMesh(boxG, stoneM, N);
  [fr, st].forEach((m) => { m.frustumCulled = false; m.castShadow = true; root.add(m); });
  // tampas das pedras (face do corte, em x = X1)
  const gridC = new THREE.MeshStandardMaterial({ map: meshTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3 }); gridC.userData.noClip = true; gridC.map.repeat.set(1, 1);
  const stC = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 1, side: THREE.DoubleSide, emissive: 0x4a443a }); stC.userData.noClip = true; stC.map.repeat.set(1, 1);
  const caps = [];
  units.forEach((u, k) => { if (u.i !== 0) return; const s = vplane(1, stC); s.position.set(X1 - 0.03, u.yb, u.zc); s.renderOrder = 4; s.visible = false; root.add(s); const g = vplane(1, gridC); g.position.set(X1 - 0.04, u.yb, u.zc); g.renderOrder = 5; g.visible = false; root.add(g); caps.push({ k, s, g }); });
  const m4 = new THREE.Matrix4(), mS = new THREE.Matrix4();
  const tFrame = (u, ri) => T.rows[ri] + u.i * 0.45 + u.c * 0.15, tStone = (u, ri) => T.rows[ri] + 5 + u.i * 0.5;
  const rowDone = (ri) => T.rows[ri] + 5 + 6 * 0.5 + 1.6;
  return {
    update(t) {
      units.forEach((u, k) => {
        const ri = u.ri, f = ease(win(t, tFrame(u, ri), tFrame(u, ri) + 1.2)), s = ease(win(t, tStone(u, ri), tStone(u, ri) + 1.6));
        m4.makeTranslation(u.xc, u.yb, u.zc); mS.makeScale(2, Math.max(1e-4, f * 1.0), 1); fr.setMatrixAt(k, m4.clone().multiply(mS));
        mS.makeScale(1.96, Math.max(1e-4, s * 0.97), 0.96); m4.makeTranslation(u.xc, u.yb + 0.015, u.zc); st.setMatrixAt(k, m4.multiply(mS));
      });
      fr.instanceMatrix.needsUpdate = true; st.instanceMatrix.needsUpdate = true;
      caps.forEach(({ k, s, g }) => { const u = units[k], f = ease(win(t, tFrame(u, u.ri), tFrame(u, u.ri) + 1.2)), sv = ease(win(t, tStone(u, u.ri), tStone(u, u.ri) + 1.6)); g.visible = f > 0.01; g.scale.y = Math.max(0.001, f); s.visible = sv > 0.01; s.scale.y = Math.max(0.001, sv * 0.97); });
    },
    pour: () => null, pourSpan: [1e9, 1e9], wallEnd: 1e9,
    anchors(a, t) {
      a.muro.set(XP, 3.2, -29.4); a.gaiola.set(XP, 0.9, -28.5); a.pedra.set(XP, 1.9, -29.0); a.lastro.set(XP, -0.6, -29.6); a.geotex.set(XP, 1.3, -31.2);
    },
    notes(t) {
      if (t < T.rows[0]) return t < T.dig[0] ? 'Escavadeira chegando' : t < T.haul[0] ? 'Escavando a base' : t < T.lastro[0] ? 'Caminhão levando o solo' : 'Brita de regularização';
      let r = 0; for (let i = 0; i < 4; i++) if (t >= T.rows[i]) r = i;
      return t < tStone({ i: 0, c: 0 }, r) ? `Fiada ${r + 1} de 4 · montando as gaiolas` : t < rowDone(r) ? `Fiada ${r + 1} de 4 · enchendo com pedras` : `Fiada ${r + 1} de 4 · aterro compactado atrás`;
    },
    weeps: [], pipe: null,
  };
}

// ===========================================================================
// obra completa
// ===========================================================================
export function createRetWall(engine, section, key) {
  const V = SPEC[key], T = V.T, LT = V.LT, gT = V.gT, dtL = V.dtL;
  const root = new THREE.Group(); root.visible = false;
  const sur = buildSurroundings(root, { building: false });
  const [zt0, zt1] = V.trench, DTR = V.DTR, XT = X1 + PXW + 0.6;
  const zFront = zt1 + 0.0;

  // --- vala da fundação
  const U = { value: 0 }, wm = depthMat(U);
  const tw = [strataQuad(X1, zt0, XT, zt0, -DTR - 0.3, 0), strataQuad(X1, zt1, XT, zt1, -DTR - 0.3, 0), strataQuad(XT, zt0, XT, zt1, -DTR - 0.3, 0)].map((g) => { const m = new THREE.Mesh(g, wm); m.visible = false; m.receiveShadow = true; root.add(m); return m; });
  const floorM = mat(0x86683f, { r: 1, e: 0x1a1308 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(XT - X1, zt1 - zt0), floorM); floor.rotation.x = -Math.PI / 2; floor.visible = false; floor.receiveShadow = true; root.add(floor);
  const dAt = (t) => DTR * ease(win(t, T.dig[0], T.dig[1])) * (1 - ease(win(t, T.refill[0], T.refill[1])));
  // camada de regularização (concreto magro ou brita)
  const lastroM = mat(V.DTR > 0.8 ? 0xc3bfb4 : 0xa8a392, { r: 1 }), lastroC = noclip(V.DTR > 0.8 ? 0xc3bfb4 : 0xa8a392, { r: 1, e: 0x25231f });
  const lH = V.DTR > 0.8 ? 0.1 : 0.2;
  const lastro = baseBox(PXW, lH, zt1 - zt0 - 0.2, lastroM); lastro.position.set(X1 + PXW / 2, -DTR, (zt0 + zt1) / 2); lastro.visible = false; root.add(lastro);
  const lastroCap = vplane(zt1 - zt0 - 0.2, lastroC); lastroCap.scale.y = lH; lastroCap.position.set(X1 - 0.02, -DTR, (zt0 + zt1) / 2); lastroCap.renderOrder = 3; lastroCap.visible = false; root.add(lastroCap);

  // --- máquinas e gente
  const exc = M.excavator(0.7); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI / 2; excW.add(exc.group); excW.visible = false; root.add(excW);
  const heapM = mat(0x7a5a3a, { r: 1 }); const heap = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.6, 10), heapM); heap.castShadow = true; heap.visible = false; root.add(heap);
  const dtruck = M.dumpTruck(0xe8b300); dtruck.scale.setScalar(0.9); dtruck.rotation.y = Math.PI; dtruck.visible = false; root.add(dtruck);
  const tfill = baseBox(3.8, 1, 2.4, mat(0x7a5a3a, { r: 1 })); tfill.position.set(2.1, 0.15, 0); tfill.visible = false; dtruck.userData.bed.add(tfill);
  const mixer = M.mixerTruck(); mixer.rotation.y = Math.PI; mixer.visible = false; root.add(mixer);
  const pourS = stream(root, 26, 0x9d9a90);
  const wA = person(0xe8742c), wB = person(0x4a8fd0); [wA, wB].forEach((p) => { root.add(p.group); p.group.visible = false; });
  const roller = M.roller(); roller.scale.setScalar(0.62); roller.visible = false; root.add(roller);
  const plate = plateCompactor(); plate.group.visible = false; root.add(plate.group);
  const wP = person(0xf2b705, 0xffffff); wP.group.visible = false; root.add(wP.group);

  // --- parte específica do muro
  const ctx = { root, T, section };
  const W = key === 'D8' ? build8(ctx) : key === 'D10' ? build10(ctx) : build11(ctx);

  // --- dreno de fundo: brita + tubo
  const gravM = mat(0xc9b77f, { r: 1 }), gravC = noclip(0xd6c58c, { r: 1, e: 0x25231f });
  let pipeG = null;
  if (W.pipe) {
    const p = W.pipe, [bz0, bz1, by0, by1] = p.bed;
    const bed = baseBox(PXW, by1 - by0, bz1 - bz0, gravM); bed.position.set(X1 + PXW / 2, by0, (bz0 + bz1) / 2); bed.visible = false; root.add(bed);
    const bedC = vplane(bz1 - bz0, gravC); bedC.scale.y = by1 - by0; bedC.position.set(X1 - 0.02, by0, (bz0 + bz1) / 2); bedC.renderOrder = 3; bedC.visible = false; root.add(bedC);
    const pg = new THREE.CylinderGeometry(0.16, 0.16, PXW, 12); pg.rotateZ(Math.PI / 2); pg.translate(PXW / 2, 0, 0);
    const pipe = new THREE.Mesh(pg, mat(0x2f3338, { r: 0.6 })); pipe.position.set(X1, p.y, p.z); pipe.visible = false; pipe.castShadow = true; root.add(pipe);
    const pc = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14), noclip(0x2f3338)); pc.rotation.y = -Math.PI / 2; pc.position.set(X1 - 0.05, p.y, p.z); pc.renderOrder = 6; pc.visible = false; root.add(pc);
    pipeG = { bed, bedC, pipe, pc };
  }
  // barbacãs
  const weep = (W.weeps || []).map((w) => { const bs = barSet(root, 7, 0x1d2025, 0.07); return { w, bs }; });
  const weepBars = (W.weeps || []).map((w) => { const m = bar2(w.zb - 0.1, w.y, w.zf + 0.1, w.y, 0.09, noclip(0x1d2025)); m.visible = false; root.add(m); return m; });

  // --- camadas de aterro (com brita e geotêxtil)
  const fillM = [], layers = [];
  const geoM = mat(0xf1efe6, { r: 1, op: 0.92 }), geoC = noclip(0xf1efe6, { r: 1 });
  for (let k = 0; k < NL; k++) {
    const yb = k * LH, yt = yb + LH, zS = V.backZ(yt) - gT, zN = ZN0 + 0.8 * k, xe = X1 + PXW + 2 - 0.6 * k;
    const bM = mat(0xc29a64, { r: 1 }), cM = noclip(0xc29a64, { r: 1, e: 0x20190f });
    const body = baseBox(xe - X1, LH, zS - zN, bM); body.position.set((X1 + xe) / 2, yb, (zN + zS) / 2); body.visible = false; body.receiveShadow = true; root.add(body);
    const cap = vplane(zS - zN, cM); cap.position.set(X1 - 0.012, yb, (zN + zS) / 2); cap.renderOrder = 2; cap.visible = false; root.add(cap);
    const L = { k, yb, yt, zS, zN, xe, bM, cM, body, cap, zc: (zN + zS) / 2 };
    if (gT > 0) {
      const gM = mat(0xc9b77f, { r: 1 }), gcM = noclip(0xd6c58c, { r: 1, e: 0x25231f });
      const zg0 = zS, zg1 = V.backZ(yt) + 0.05;
      const gb = baseBox(PXW - 0.2, LH, zg1 - zg0, gM); gb.position.set(X1 + PXW / 2, yb, (zg0 + zg1) / 2); gb.visible = false; root.add(gb);
      const gcap = vplane(zg1 - zg0, gcM); gcap.position.set(X1 - 0.011, yb, (zg0 + zg1) / 2); gcap.renderOrder = 3; gcap.visible = false; root.add(gcap);
      L.gb = gb; L.gcap = gcap;
    }
    const gzz = zS - 0.025;
    const geo = baseBox(PXW - 0.2, LH, 0.04, geoM); geo.position.set(X1 + PXW / 2, yb, gzz); geo.visible = false; root.add(geo);
    const geoCap = vplane(0.05, geoC); geoCap.position.set(X1 - 0.01, yb, gzz); geoCap.renderOrder = 3; geoCap.visible = false; root.add(geoCap);
    L.geo = geo; L.geoCap = geoCap;
    layers.push(L); fillM.push(bM);
  }
  root.userData.dbg = { layers, W };
  const piles = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 2.2), mat(0xb08a58, { r: 1 })); piles.castShadow = true; piles.visible = false; root.add(piles);

  // --- estado e rótulos
  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(V.labels.map((l) => [l.k, new THREE.Vector3()]));
  const fmt = (x, n = 1) => x.toFixed(n).replace('.', ',');
  const layerAt = (t) => { let k = -1; for (let i = 0; i < NL; i++) if (t >= LT[i]) k = i; return k; };

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc;
    sur.update(tAbs);

    // vala
    const d = dAt(t), on = d > 0.02; U.value = d;
    if (on) { terrainHoles[0].set(X1 - 1, XT, zt0, zt1); section.setBand(0, zt0, zt1, -d, 0.05); } else { terrainHoles[0].set(0, 0, 0, 0); section.setBand(0, 0, 0, 0, 0); }
    tw.forEach((m) => { m.visible = on; });
    floor.visible = on; floor.position.set((X1 + XT) / 2, -d - 0.01, (zt0 + zt1) / 2);
    soilColorAt(-d - 0.3, floorM.color); floorM.color.lerp(earthC, ease(win(t, T.refill[0], T.refill[1]))); floorM.emissive.copy(floorM.color).multiplyScalar(0.25);
    const lu = ease(win(t, T.lastro[0], T.lastro[1])); lastro.visible = lu > 0.01; lastro.scale.x = Math.max(0.001, lu); lastroCap.visible = lu > 0.01;

    // escavadeira, monte de solo e caminhão de bota-fora
    const eIn = ease(win(t, T.dig[0] - 3, T.dig[0])), eOut = key === 'D11' ? 0 : ease(win(t, T.haul[0] + 4, T.haul[0] + 7));
    const eS = eIn * (1 - eOut); excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); excW.position.set(X1 + 9, 0, zt1 + 3.8); exc.update(tAbs * 1.3);
    const hs = ease(win(t, T.dig[0], T.dig[1])) * (1 - ease(win(t, T.haul[0] + 3, T.haul[1] - 3)));
    heap.visible = hs > 0.02; heap.scale.set(Math.max(0.01, hs), Math.max(0.01, hs), Math.max(0.01, hs)); heap.position.set(X1 + 4.8, 0.8 * hs, zt1 + 2.4);
    let dx = null, dfill = 0; { const a = T.haul[0], b = T.haul[1], xs = X1 + 36, xp = X1 + 7;
      if (t >= a && t < b) { dx = t < a + 3 ? xs + (xp - xs) * ease(win(t, a, a + 3)) : t < b - 3 ? xp : xp + (X1 + 2 - xp) * ease(win(t, b - 3, b)); dfill = clamp01((t - a - 3) / Math.max(1, b - a - 6)); if (t >= b - 3) dfill = 1; } }
    dtruck.visible = dx !== null && dx > X1 + 3.25; if (dtruck.visible) dtruck.position.set(dx, 0.05, zt1 + 6.2);
    tfill.visible = dfill > 0.02 && dx !== null; tfill.scale.y = Math.max(0.01, 1.1 * dfill);

    // muro
    W.update(t, tAbs); W.anchors(anchors, t);
    if (pipeG) {
      const p = W.pipe, pu = ease(win(t, T.pipe[0], T.pipe[1]));
      pipeG.bed.visible = pipeG.bedC.visible = pipeG.pipe.visible = pipeG.pc.visible = pu > 0.01;
      pipeG.bed.scale.x = Math.max(0.001, pu); pipeG.pipe.scale.x = Math.max(0.001, pu);
      void p;
    }
    weep.forEach(({ w, bs }, i) => {
      const u = ease(win(t, w.t, w.t + 2)); weepBars[i].visible = u > 0.05;
      for (let j = 0; j < 7; j++) { bs.put(j, 'z', X1 + 1 + 2 * j, w.y, (w.zf + w.zb) / 2, (Math.abs(w.zf - w.zb) + 0.3) * u); } bs.done();
    });

    // concretagem: caminhão betoneira e fluxo
    const pr = W.pour(t), sp = W.pourSpan, mIn = key === 'D11' ? 0 : ease(win(t, sp[0], sp[0] + 4)) * (1 - ease(win(t, sp[1] - 3, sp[1])));
    mixer.visible = mIn > 0.01 && t > sp[0]; if (mixer.visible) { const xm = X1 + 9.5 + (X1 + 40 - X1 - 9.5) * (1 - mIn); mixer.position.set(xm, 0.05, zFront + 3.7); }
    const chute = new THREE.Vector3(mixer.position.x + 3.5, 2.5, mixer.position.z);
    const tgt = new THREE.Vector3(X1 + 12.4, (pr ? pr.y : 0) + 0.4, pr ? pr.z : 0);
    pourS.set(chute, tgt, !!pr && mIn > 0.95, tAbs);

    // trabalhadores
    const ws = key === 'D11' ? [T.rows[0], T.END] : [W.pourSpan[0] + 2, W.wallEnd + 12];
    const wv = t > ws[0] && t < ws[1];
    wA.group.visible = wB.group.visible = wv;
    if (wv) { const u = 0.5 + 0.5 * Math.sin(tAbs * 0.35); wA.group.position.set(X1 + 3 + 6 * u, 0.02, zFront + 1.5); wA.group.rotation.y = -Math.PI / 2 + (Math.cos(tAbs * 0.35) > 0 ? 0 : Math.PI); wB.group.position.set(X1 + 11 - 4 * u, 0.02, zFront + 2.2); wB.group.rotation.y = Math.PI / 2 + (Math.cos(tAbs * 0.35) > 0 ? 0 : Math.PI); wA.upper.rotation.x = 0.1; wB.upper.rotation.x = 0.1; }

    // aterro
    const ak = layerAt(t); let cur = null;
    layers.forEach((L, i) => {
      const t0 = LT[i], u = (t - t0) / dtL;
      const gU = ease(win(u, 0, 0.25)), spread = ease(win(u, 0.38, 0.58)), comp = ease(win(u, 0.58, 0.95));
      const fv = u >= 0.38 || t >= t0 + dtL;
      const sy = fv ? (u >= 1 ? 1 : (spread * 1.0) * (1.25 - 0.25 * comp)) : 0;
      L.body.visible = L.cap.visible = sy > 0.01; L.body.scale.y = Math.max(0.001, sy); L.cap.scale.y = Math.max(0.001, sy * LH);
      const cc = u >= 1 ? 1 : comp; L.bM.color.copy(earthL).lerp(earthC, cc); L.cM.color.copy(L.bM.color); L.cM.emissive.copy(L.bM.color).multiplyScalar(0.25);
      const gv = u >= 0 && t >= t0; const gUe = u >= 1 ? 1 : gU;
      if (L.gb) { L.gb.visible = L.gcap.visible = gv && gUe > 0.01; L.gb.scale.y = Math.max(0.001, gUe); L.gcap.scale.y = Math.max(0.001, gUe * LH); }
      L.geo.visible = L.geoCap.visible = gv && gUe > 0.01; L.geo.scale.y = Math.max(0.001, gUe); L.geoCap.scale.y = Math.max(0.001, gUe * LH);
      if (u >= 0 && u < 1) cur = { L, u };
    });
    // caminhão, pilha, rolo e compactador da camada atual
    dumpUpdate(cur, t, tAbs);
    function dumpUpdate(c, tt, ta) {
      const showFill = !!c;
      let tv = false, pv = false, rv = false, plv = false;
      if (c) {
        const { L, u } = c, zc = L.zc, xe = L.xe;
        // caminhão
        const xs = X1 + 32, xp = X1 + 9;
        let x = null, tilt = 0, loaded = 1;
        if (u < 0.18) x = xs + (xp - xs) * ease(u / 0.18); else if (u < 0.42) { x = xp; tilt = ease(win(u, 0.18, 0.3)); loaded = 1 - ease(win(u, 0.3, 0.42)); } else if (u < 0.62) { x = xp + (xs - xp) * 0; x = xp - (xp - (X1 + 1)) * ease(win(u, 0.42, 0.62)); tilt = 1 - ease(win(u, 0.42, 0.5)); loaded = 0; }
        if (x !== null && x > X1 + 3.25) { tv = true; const yy = L.yb * ease((X1 + 22 - x) / 8); dtruck.visible = true; dtruck.position.set(x, 0.05 + yy, zc); dtruck.userData.bed.rotation.z = tilt * 0.5; tfill.visible = loaded > 0.02; tfill.scale.y = Math.max(0.01, 1.1 * loaded); }
        // pilha
        const pu = u < 0.3 ? 0 : u < 0.42 ? ease(win(u, 0.3, 0.42)) : 1 - ease(win(u, 0.42, 0.55));
        pv = pu > 0.02; piles.scale.set(1, Math.max(0.01, pu), 1); piles.position.set(xp + 3.6, L.yb + 0.45 * pu, zc);
        // rolo
        const ru = win(u, 0.58, 0.97);
        if (ru > 0 && ru < 1) {
          rv = true; const lane = ru < 0.5 ? -1.4 : 1.4, f = ru < 0.5 ? ru * 2 : (ru - 0.5) * 2, tri = f < 0.5 ? f * 2 : 2 - f * 2, xr = X1 + 4 + (xe - X1 - 8) * tri;
          roller.position.set(xr, L.yt - 0.04, Math.min(L.zS - 1.4, Math.max(L.zN + 1.2, zc + lane * 1.5))); roller.rotation.y = f < 0.5 ? 0 : Math.PI;
          // compactador manual junto ao muro
          plv = true; const pp = 0.5 + 0.5 * Math.sin(ta * 1.6); plate.group.position.set(X1 + 2 + (PXW - 6) * pp, L.yt, L.zS - 0.8); plate.group.rotation.y = Math.cos(ta * 1.6) > 0 ? Math.PI / 2 : -Math.PI / 2; plate.shake(ta);
          wP.group.position.set(plate.group.position.x + (Math.cos(ta * 1.6) > 0 ? -0.9 : 0.9), L.yt, L.zS - 0.8); wP.group.rotation.y = Math.cos(ta * 1.6) > 0 ? -Math.PI / 2 : Math.PI / 2; wP.upper.rotation.x = 0.25;
        }
      }
      dtruck.visible = tv || (dx !== null && dx > X1 + 3.25);
      piles.visible = pv; roller.visible = rv; plate.group.visible = plv; wP.group.visible = plv; void showFill;
    }

    // etapas e nota
    const S = V.starts; let step = 0; for (let i = 0; i < S.length; i++) if (t >= S[i]) step = i;
    st.step = step; st.progress = win(t, S[step], S[step + 1] ?? T.END);
    const note = W.notes(t);
    st.note = note || (ak < 0 ? (t < T.refill[0] ? 'Tubo dreno e brita no pé do muro' : 'Reaterro da vala') : `Aterro · camada ${Math.min(NL, ak + 1)} de ${NL}${cur && cur.u > 0.58 ? ' · compactando' : ''}`);

    // âncoras do aterro, rolo, escavadeira
    const a = anchors, L0 = layers[Math.max(0, ak)];
    a.aterro.set(XP, L0.yb + 0.25, L0.zN + 3.5);
    a.rolo.set(roller.position.x, roller.position.y + 2.6, roller.position.z); a.placa.set(plate.group.position.x, plate.group.position.y + 1.5, plate.group.position.z); a.escav.set(X1 + 9, 3.0, zt1 + 3.8); a.solo.set(X1, -15, PZ);
    if (a.brita && key !== 'D11') a.brita.y = Math.max(0.8, L0.yb + 0.3);
  }
  function labelVis(kx, t = st.tc) {
    const f = V.vis[kx]; if (f) { if (kx === 'rolo' || kx === 'placa') return roller.visible; return f(t); }
    return true;
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hideDPit(engine); },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); showDPit(engine); },
  };
}
export const createD8 = (e, s) => createRetWall(e, s, 'D8');
export const createD10 = (e, s) => createRetWall(e, s, 'D10');
export const createD11 = (e, s) => createRetWall(e, s, 'D11');
export const DW_STEP_STARTS = { D8: SPEC.D8.starts, D10: SPEC.D10.starts, D11: SPEC.D11.starts };
void NL;
