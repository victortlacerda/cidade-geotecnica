import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, person, stream } from './fund.js';
import { vplane, baseBox, bx, depthMat, strataQuad } from './dsite.js';

// ---------------------------------------------------------------------------
// Zona E — Vias e pavimentos. A seção é o plano x = X1E, atravessando a via de lado a lado.
// A via corre ao longo de x (40 m); as máquinas andam em x e as camadas "crescem" com elas.
// Camadas (exageradas): sub-base 0,60 · base 0,40 · binder 0,12 · capa 0,10, numa caixa de 1,2 m.
// ---------------------------------------------------------------------------
export const X1E = 10, XE = 50, ZC = 32, ZW0 = 27, ZW1 = 37, WID = 10, DEXC0 = 1.2, LEN = XE - X1E;
export const GEO_E = { X1E, XE, ZC, ZW0, ZW1, WID, LEN };
export const E_BOX = { x0: -125, x1: X1E, z0: 8, z1: 56 };
export const E_CAM = { tx: X1E, ty: -0.2, tz: 32, yaw: -1.3, pitch: 0.2, dist: 24 };
export const E_MCAM = { tx: X1E, ty: -0.2, tz: 32, yaw: -1.3, pitch: 0.2, dist: 72 };
const XP = X1E - 0.045;
const tri = (f) => (f < 0.5 ? f * 2 : 2 - f * 2);

// ===========================================================================
// ESPECIFICAÇÃO DAS OBRAS
// ===========================================================================
const E1_STEPS = [
  { t: 'Sinalizar, escavar a caixa e compactar o subleito', d: 'A pista é isolada com cones. A caixa do pavimento é escavada até a cota do subleito, que é o solo natural que vai sustentar tudo. A motoniveladora regulariza o fundo e o rolo compacta. Subleito fraco ou mal compactado afunda sob o tráfego e leva o pavimento junto.' },
  { t: 'Sub-base: espalhar, umedecer e compactar', d: 'O caminhão basculante descarrega em pilhas e a motoniveladora espalha em camada. O caminhão-pipa umedece até a umidade ótima do ensaio de compactação (Proctor), e o rolo compacta até o grau de compactação exigido, em geral 100% do Proctor. Solo seco ou encharcado não compacta bem.' },
  { t: 'Base e imprimação', d: 'A base, de brita graduada, recebe e distribui as cargas dos pneus para a sub-base e o subleito, onde as tensões já são pequenas. Depois de compactada, recebe a imprimação: um ligante asfáltico espalhado que sela a superfície e prepara a colagem do revestimento.' },
  { t: 'Revestimento asfáltico: binder e capa', d: 'O concreto asfáltico (CBUQ) chega quente, a cerca de 150 °C, em caminhões. A vibroacabadora o espalha em espessura uniforme e o rolo compacta antes que esfrie. Entre as duas camadas há uma pintura de ligação, para elas trabalharem juntas.' },
  { t: 'Sinalização e liberação', d: 'Com o asfalto frio, a faixa é pintada, os cones saem e o tráfego volta. O pavimento é um sistema de camadas: cada uma protege a de baixo.' },
];
const E1_LABELS = [
  { k: 'cone', t: 'Cones e sinalização' }, { k: 'subleito', t: 'Subleito compactado' }, { k: 'subbase', t: 'Sub-base' }, { k: 'base', t: 'Base (brita graduada)' }, { k: 'imprim', t: 'Imprimação' },
  { k: 'binder', t: 'Binder (CBUQ)' }, { k: 'capa', t: 'Capa (CBUQ)' }, { k: 'moto', t: 'Motoniveladora' }, { k: 'rolo', t: 'Rolo compactador' }, { k: 'pipa', t: 'Caminhão-pipa' },
  { k: 'vibro', t: 'Vibroacabadora' }, { k: 'ensaio', t: 'Controle de compactação' }, { k: 'faixa', t: 'Faixa pintada' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];

const E6_STEPS = [
  E1_STEPS[0],
  { t: 'Geotêxtil de separação e sub-base', d: 'Sobre o subleito compactado, um rolo desenrola o geotêxtil, um manto de fibras. Ele separa o solo fraco da brita, para os dois não se misturarem, e deixa a água passar. As faixas se sobrepõem de 30 a 50 cm. O caminhão descarrega à frente e a motoniveladora espalha a sub-base, sem o rodado rodar direto sobre o manto.' },
  { t: 'Geogrelha de reforço e base', d: 'No topo da sub-base é estendida a geogrelha, uma malha de polímero. Os agregados se encaixam nas aberturas e ficam travados, o que reduz o espalhamento lateral sob a carga dos pneus. Com isso a base pode ser mais fina, ou o pavimento dura mais. A base de brita graduada é espalhada e compactada por cima.' },
  { t: 'Imprimação e revestimento asfáltico', d: 'A base recebe a imprimação e depois o binder e a capa de CBUQ, como no pavimento flexível comum, com pintura de ligação entre as camadas. O reforço geossintético fica escondido dentro da estrutura, e só aparece no corte.' },
  E1_STEPS[4],
];
const E6_LABELS = [
  { k: 'cone', t: 'Cones e sinalização' }, { k: 'subleito', t: 'Subleito compactado' }, { k: 'geotex', t: 'Geotêxtil (separação)' }, { k: 'subbase', t: 'Sub-base' }, { k: 'geogrid', t: 'Geogrelha (reforço)' },
  { k: 'base', t: 'Base (brita graduada)' }, { k: 'binder', t: 'Binder (CBUQ)' }, { k: 'capa', t: 'Capa (CBUQ)' }, { k: 'moto', t: 'Motoniveladora' }, { k: 'rolo', t: 'Rolo compactador' },
  { k: 'vibro', t: 'Vibroacabadora' }, { k: 'faixa', t: 'Faixa pintada' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
const E2_STEPS = [
  E1_STEPS[0],
  { t: 'Sub-base compactada', d: 'A sub-base granular, às vezes tratada com cimento, é espalhada e compactada como no pavimento flexível. Num pavimento rígido ela serve para dar apoio uniforme à laje e impedir o bombeamento: quando a água e os finos saem pelas juntas sob o tráfego, a laje perde apoio e trinca.' },
  { t: 'Barras de transferência e de ligação', d: 'Antes do concreto, cestas de barras de aço lisas são colocadas em cada junta transversal, a cada 5 m. Elas passam a carga de uma placa para a vizinha sem impedir que as placas se movam. Ao longo da junta longitudinal vão as barras de ligação, que mantêm as faixas unidas.' },
  { t: 'Concretagem com formas deslizantes', d: 'As betoneiras descarregam à frente da pavimentadora de formas deslizantes. Ela espalha, adensa com vibradores e alisa o concreto numa única passada, sem formas fixas. Logo depois, um caminhão borrifa o composto de cura, que forma uma película branca e segura a água do concreto para ele ganhar resistência sem fissurar.' },
  { t: 'Serrar as juntas, sinalizar e liberar', d: 'Com o concreto já firme, a serra corta cada junta até cerca de 1/3 da espessura. A laje trinca ali, de modo controlado, em vez de trincar em qualquer lugar. As juntas são seladas e a via só é liberada após a cura, quando o concreto atinge a resistência de projeto.' },
];
const E2_LABELS = [
  { k: 'cone', t: 'Cones e sinalização' }, { k: 'subleito', t: 'Subleito compactado' }, { k: 'subbase', t: 'Sub-base' }, { k: 'dowel', t: 'Barras de transferência' }, { k: 'laje', t: 'Laje de concreto' },
  { k: 'tie', t: 'Barra de ligação' }, { k: 'junta', t: 'Junta serrada' }, { k: 'vibro', t: 'Pavimentadora de formas deslizantes' }, { k: 'betoneira', t: 'Caminhão betoneira' }, { k: 'cura', t: 'Cura química' },
  { k: 'serra', t: 'Serra de juntas' }, { k: 'moto', t: 'Motoniveladora' }, { k: 'rolo', t: 'Rolo compactador' }, { k: 'pipa', t: 'Caminhão-pipa' }, { k: 'faixa', t: 'Faixa pintada' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];

const E5_STEPS = [
  { t: 'Avaliar o pavimento existente', d: 'Antes de intervir, é preciso entender o estado do pavimento: trincas, afundamentos na trilha de roda e a deflexão, que é o quanto a superfície cede sob uma carga conhecida. Com isso se decide o que fazer: fresar a capa e repor, ou colocar uma camada de reforço por cima.' },
  { t: 'Fresar a capa desgastada', d: 'A fresadora tem um tambor com dentes que raspa a capa velha, até a profundidade de projeto. O material fresado sobe por uma esteira para o caminhão à frente. Ele é reaproveitável e pode virar asfalto reciclado. A fresagem também devolve a cota e o perfil da pista, para a nova capa não elevar o greide.' },
  { t: 'Limpar e aplicar a pintura de ligação', d: 'A superfície fresada é varrida e limpa, pois poeira impede a colagem. Em seguida o caminhão distribuidor espalha a pintura de ligação, uma emulsão asfáltica que cola a camada nova na antiga. Sem ela, a capa nova escorrega e descola.' },
  { t: 'Nova capa de CBUQ', d: 'A vibroacabadora espalha o concreto asfáltico quente sobre o binder existente e o rolo compacta antes de esfriar. A estrutura abaixo, que ainda está sã, é preservada: o reforço troca só a parte que se desgastou, de modo bem mais barato do que reconstruir.' },
  { t: 'Sinalizar e liberar', d: 'A faixa antiga foi removida junto com a capa, então a sinalização é refeita. Os cones saem e o tráfego volta.' },
];
const E5_LABELS = [
  { k: 'cone', t: 'Cones e sinalização' }, { k: 'capaold', t: 'Capa existente (desgastada)' }, { k: 'binder', t: 'Binder existente' }, { k: 'base', t: 'Base' }, { k: 'subbase', t: 'Sub-base' },
  { k: 'ensaio', t: 'Avaliação do pavimento' }, { k: 'fresa', t: 'Fresadora' }, { k: 'rap', t: 'Material fresado (RAP)' }, { k: 'capa', t: 'Capa nova (CBUQ)' }, { k: 'vibro', t: 'Vibroacabadora' },
  { k: 'rolo', t: 'Rolo compactador' }, { k: 'faixa', t: 'Faixa pintada' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
export const E_SPECS = {
  E1: {
    steps: E1_STEPS, labels: E1_LABELS, nome: 'Pavimento asfáltico (flexível)',
    T: { cones: [1, 4], dig: [4, 13], haul: [9, 17], trim: [13, 16], comp0: [16, 25], END: 128 },
    starts: [0, 26, 46, 70, 106],
    layers: [
      { id: 'subbase', y0: -1.2, h: 0.60, kind: 'gran', col: 0xbf9f6a, comp: 0x9f8458, t0: 26, dur: 19 },
      { id: 'base', y0: -0.6, h: 0.40, kind: 'gran', col: 0xc2bfb4, comp: 0xa3a095, t0: 46, dur: 19 },
      { id: 'binder', y0: -0.2, h: 0.12, kind: 'asph', t0: 70, dur: 16 },
      { id: 'capa', y0: -0.08, h: 0.10, kind: 'asph', t0: 88, dur: 16 },
    ],
    sprays: [{ id: 'imprim', y: -0.2, t: [65, 69] }, { id: 'ligacao', y: -0.08, t: [86, 88.5] }],
    paint: [106, 111], conesOut: [111, 114], cars: 114,
  },
  E6: {
    steps: E6_STEPS, labels: E6_LABELS, nome: 'Geossintéticos em pavimentos',
    T: { cones: [1, 4], dig: [4, 13], haul: [9, 17], trim: [13, 16], comp0: [16, 25], END: 141 },
    starts: [0, 26, 53, 80, 119],
    layers: [
      { id: 'subbase', y0: -1.2, h: 0.60, kind: 'gran', col: 0xbf9f6a, comp: 0x9f8458, t0: 33, dur: 19 },
      { id: 'base', y0: -0.6, h: 0.40, kind: 'gran', col: 0xc2bfb4, comp: 0xa3a095, t0: 60, dur: 19 },
      { id: 'binder', y0: -0.2, h: 0.12, kind: 'asph', t0: 85, dur: 16 },
      { id: 'capa', y0: -0.08, h: 0.10, kind: 'asph', t0: 103, dur: 16 },
    ],
    sheets: [
      { id: 'geotex', kind: 'tex', y: -1.2, t: [26, 32], note: 'Estendendo o geotêxtil · sobreposição de 30 a 50 cm' },
      { id: 'geogrid', kind: 'grid', y: -0.6, t: [53, 59], note: 'Estendendo a geogrelha · agregado travado nas aberturas' },
    ],
    sprays: [{ id: 'imprim', y: -0.2, t: [80, 84] }, { id: 'ligacao', y: -0.08, t: [101, 103.5] }],
    paint: [119, 124], conesOut: [124, 127], cars: 127,
  },
  E5: {
    steps: E5_STEPS, labels: E5_LABELS, nome: 'Reforço de pavimentos', repair: true, eval: [4, 18], mill: [20, 46],
    T: { cones: [1, 4], dig: [-20, -19], haul: [-20, -19], trim: [-20, -19], comp0: [-20, -19], END: 102 },
    starts: [0, 20, 50, 56, 80],
    layers: [
      { id: 'subbase', y0: -1.2, h: 0.60, kind: 'old', col: 0x9f8458, t0: -100, dur: 1 },
      { id: 'base', y0: -0.6, h: 0.40, kind: 'old', col: 0xa3a095, t0: -100, dur: 1 },
      { id: 'binder', y0: -0.2, h: 0.12, kind: 'old', col: 0x3a3d42, t0: -100, dur: 1 },
      { id: 'capaold', y0: -0.08, h: 0.10, kind: 'old', col: 0x70737a, mill: true, t0: -100, dur: 1 },
      { id: 'capa', y0: -0.08, h: 0.10, kind: 'asph', t0: 56, dur: 22 },
    ],
    sprays: [{ id: 'ligacao', y: -0.08, t: [50, 54.5] }],
    paint: [80, 85], conesOut: [85, 88], cars: 88,
  },
  E2: {
    steps: E2_STEPS, labels: E2_LABELS, nome: 'Pavimento de concreto (rígido)', dexc: 0.95, slip: true,
    T: { cones: [1, 4], dig: [4, 13], haul: [9, 17], trim: [13, 16], comp0: [16, 25], END: 122 },
    starts: [0, 26, 46, 52, 77],
    layers: [
      { id: 'subbase', y0: -0.95, h: 0.45, kind: 'gran', col: 0xbf9f6a, comp: 0x9f8458, t0: 26, dur: 19 },
      { id: 'laje', y0: -0.5, h: 0.52, kind: 'conc', col: 0xcbc8c0, comp: 0x6e6a62, t0: 52, dur: 46 },
    ],
    sprays: [{ id: 'cura', y: 0.02, t: [64, 77], mach: 'cure', col: 0xf1efe8, note: 'Aplicando o composto de cura química' }],
    paint: [100, 105], conesOut: [105, 108], cars: 108,
  },
};

// ===========================================================================
// máquinas
// ===========================================================================
function makeRollerPe() {
  const g = M.roller(); const sm = mat(0x8a8e95, { r: 0.6 });
  for (const x of [-1.9, 1.9]) for (let ring = 0; ring < 4; ring++) for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2 + (ring % 2) * 0.22, c = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 5), sm); c.position.set(x + Math.sin(a) * 1.3, 1.15 + Math.cos(a) * 1.3, -1.0 + ring * 0.66); c.rotation.z = -a; c.castShadow = false; g.add(c); }
  return g;
}
function makeRollerVib() {
  const g = M.roller(); const blue = mat(0x2f6fd0, { r: 0.6 });
  g.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0xe8b300) o.material = blue; });
  const b = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 2.3), blue); b.position.y = 2.65; g.add(b);
  return g;
}
const fm = (x, n = 1) => x.toFixed(n).replace('.', ',');
function drawPanel(ctx, W, H, f) {
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = 'rgba(251,249,243,0.98)'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#3a3d42'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
  ctx.fillStyle = '#23262b'; ctx.font = 'bold 26px sans-serif'; ctx.fillText(`Controle de compactação · camada ${f.idx}`, 22, 40); ctx.font = '19px sans-serif'; ctx.fillStyle = '#5b5f66'; ctx.fillText(`${f.name}${f.rollName ? ' · ' + f.rollName : ''}`, 22, 66);
  // lente: grãos e vazios
  const cx = 130, cy = 205, R = 92; ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = '#2a2420'; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  const sp = 25 - 7.5 * f.comp, c0 = new THREE.Color(f.col).offsetHSL(0, 0, 0.08); ctx.fillStyle = '#' + c0.getHexString();
  let sd = 5; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let iy = -8; iy < 9; iy++) for (let ix = -8; ix < 9; ix++) { const x = cx + ix * sp + (iy % 2 ? sp / 2 : 0) + (rnd() - 0.5) * 6, y = cy + iy * sp * 0.87 + (rnd() - 0.5) * 6, r = 9 + rnd() * 3.2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore(); ctx.strokeStyle = '#3a3d42'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#23262b'; ctx.font = '18px sans-serif'; ctx.fillText('grãos e vazios', cx - 56, cy + R + 22); ctx.font = 'bold 20px sans-serif'; ctx.fillText(`e = ${fm(f.e, 2)}`, cx - 34, cy + R + 46);
  // gráfico γd × w
  const gx0 = 290, gy0 = 100, gx1 = 612, gy1 = 270; ctx.strokeStyle = '#8a8d94'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
  const wx = (w) => gx0 + (w - (f.wo - 9)) / 18 * (gx1 - gx0), gy = (g) => gy1 - (g - (f.gm - 1.9)) / 2.3 * (gy1 - gy0);
  ctx.setLineDash([6, 5]); ctx.strokeStyle = '#c9a227'; ctx.beginPath(); ctx.moveTo(gx0, gy(f.gm)); ctx.lineTo(gx1, gy(f.gm)); ctx.stroke(); ctx.strokeStyle = '#4a8fd0'; ctx.beginPath(); ctx.moveTo(wx(f.wo), gy1); ctx.lineTo(wx(f.wo), gy(f.gm)); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = '#23262b'; ctx.lineWidth = 4; ctx.beginPath(); for (let w = f.wo - 8.5; w <= f.wo + 8.5; w += 0.5) { const x = wx(w), y = gy(f.gm - f.k * (w - f.wo) ** 2); if (w === f.wo - 8.5) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
  ctx.fillStyle = '#e8742c'; ctx.beginPath(); ctx.arc(wx(f.w), gy(f.gd), 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#5b5f66'; ctx.font = '16px sans-serif'; ctx.fillText('umidade w (%)', gx1 - 112, gy1 + 24); ctx.save(); ctx.translate(gx0 - 12, gy0 + 100); ctx.rotate(-Math.PI / 2); ctx.fillText('γd (kN/m³)', 0, 0); ctx.restore();
  ctx.fillStyle = '#4a8fd0'; ctx.fillText('w ótima', wx(f.wo) - 28, gy1 - 8); ctx.fillStyle = '#9a7b12'; ctx.fillText('γd máx', gx0 + 6, gy(f.gm) - 6);
  const ok = f.gc >= 99.5; ctx.fillStyle = ok ? '#2e8b4d' : '#c9561a'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(`GC = ${fm(f.gc, 0)}%`, 290, 318); ctx.fillStyle = '#23262b'; ctx.font = '20px sans-serif'; ctx.fillText(`${f.wLabel} ${fm(f.w)}% (ótima ${fm(f.wo)}%)`, 290, 346); ctx.font = "18px sans-serif"; ctx.fillText(`γd ${fm(f.gd)}/${fm(f.gm)}`, 470, 318);
}
export function makeGrader() {
  const g = new THREE.Group();
  const Y = mat(0xe8b300, { r: 0.6 }), D = mat(0x2f3237, { r: 0.6 }), G = mat(0x9ec3da, { r: 0.3 });
  const add = (sx, sy, sz, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; g.add(o); return o; };
  add(5.2, 0.9, 1.9, Y, -0.6, 1.5, 0); add(1.7, 1.4, 1.7, G, -2.0, 2.7, 0); add(1.6, 0.8, 1.6, Y, -3.0, 2.2, 0); add(3.4, 0.35, 0.5, Y, 2.0, 1.25, 0);
  add(0.2, 0.75, 3.4, D, 3.8, 0.55, 0, 0.55);
  for (const x of [-3.0, -1.8, 2.6]) for (const z of [1.05, -1.05]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 14), D); w.rotation.x = Math.PI / 2; w.position.set(x, 0.7, z); w.castShadow = true; g.add(w); }
  g.scale.setScalar(0.85); return g;
}
export function makeTanker(tankCol) {
  const g = new THREE.Group();
  const D = mat(0x3a3d42, { r: 0.6 }), W = mat(0xf2eee6), G = mat(0x9ec3da, { r: 0.3 }), T = mat(tankCol, { r: 0.4, m: 0.3 });
  const add = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); };
  add(6.2, 0.6, 2.3, D, 0, 1.1, 0); add(1.9, 1.7, 2.2, W, 2.4, 1.9, 0); add(0.9, 0.8, 2.0, G, 3.1, 2.2, 0); add(0.25, 0.25, 2.4, D, -3.2, 0.9, 0);
  const tk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 4.2, 16), T); tk.rotation.z = Math.PI / 2; tk.position.set(-0.6, 2.3, 0); tk.castShadow = true; g.add(tk);
  for (const x of [-2.2, -0.8, 2.3]) for (const z of [1.2, -1.2]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.55, 12), mat(0x222428)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.7, z); g.add(w); }
  g.scale.setScalar(0.85); return g;
}

function makeSlip() {
  const g = new THREE.Group();
  const Y = mat(0xe8b300, { r: 0.6 }), D = mat(0x2f3237, { r: 0.6 }), S = mat(0x9aa0a8, { r: 0.4, m: 0.5 }), G = mat(0x9ec3da, { r: 0.3 });
  const add = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  for (const z of [-5.8, 5.8]) { add(3.6, 1.0, 1.1, D, 0, 1.1, z); add(0.8, 1.6, 0.8, Y, 0, 2.2, z); }
  add(2.4, 0.8, 12.4, Y, 0, 3.1, 0); add(1.6, 1.3, 1.6, G, 0.7, 4.1, 3.6); add(0.9, 0.9, 11, mat(0xe8742c, { r: 0.6 }), 1.5, 0.55, 0);
  add(3.0, 0.95, 10.3, S, -1.4, 0.48, 0); add(1.0, 0.25, 10.3, S, -3.1, 0.12, 0);
  return g;
}
function makeMiller() {
  const g = new THREE.Group();
  const Y = mat(0xe8b300, { r: 0.6 }), D = mat(0x2f3237, { r: 0.6 }), G = mat(0x9ec3da, { r: 0.3 }), S = mat(0x7d8189, { r: 0.5, m: 0.5 });
  const add = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  for (const z of [-5.75, 5.75]) { add(3.2, 0.8, 1.1, D, 0.2, 0.5, z); add(0.8, 1.2, 0.8, Y, 0.2, 1.4, z); }
  add(4.0, 1.3, 11.4, Y, 0.4, 2.05, 0); add(1.5, 1.2, 1.7, G, 1.7, 3.3, 3.6);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 10.3, 16), S); drum.rotation.x = Math.PI / 2; drum.position.set(-0.8, 0.35, 0); drum.castShadow = true; g.add(drum);
  const cv = add(5.2, 0.35, 1.4, D, 3.9, 2.55, 0); cv.rotation.z = 0.26;
  g.userData.drum = drum; return g;
}
function makeSaw() {
  const g = new THREE.Group(); const Y = mat(0xe8b300, { r: 0.6 }), D = mat(0x2f3237, { r: 0.6 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.1), Y); b.position.y = 0.7; b.castShadow = true; g.add(b);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.15), D); h.position.set(-0.7, 1.6, 0); g.add(h);
  const disc = new THREE.Group(); disc.position.set(0, 0.45, 0.75); g.add(disc); const dm = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 20), mat(0xc9ccd2, { r: 0.3, m: 0.6 })); dm.rotation.z = Math.PI / 2; disc.add(dm);
  for (const x of [-0.55, 0.55]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 10), D); w.rotation.x = Math.PI / 2; w.position.set(x, 0.25, -0.5); g.add(w); }
  g.userData.disc = disc; g.scale.setScalar(1.1); return g;
}

// ===========================================================================
// obra
// ===========================================================================
export function createRoad(engine, section, key) {
  const V = E_SPECS[key], T = V.T, DEXC = V.dexc ?? DEXC0;
  const { X1E, XE, ZC, ZW0, ZW1, WID, LEN } = V.geo || GEO_E, XP = X1E - 0.045, hideName = V.hide || 'e-road';
  const root = new THREE.Group(); root.visible = false;
  const DZR = V.dz || 0; root.position.z = DZR;

  // --- caixa do pavimento
  const U = { value: 0 }, wm = depthMat(U);
  const cw = [strataQuad(X1E, ZW0, XE, ZW0, -DEXC - 0.3, 0), strataQuad(X1E, ZW1, XE, ZW1, -DEXC - 0.3, 0), strataQuad(XE, ZW0, XE, ZW1, -DEXC - 0.3, 0)].map((g) => { const m = new THREE.Mesh(g, wm); m.visible = false; m.receiveShadow = true; root.add(m); return m; });
  const floorM = mat(0x86683f, { r: 1, e: 0x1a1308 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(LEN, WID), floorM); floor.rotation.x = -Math.PI / 2; floor.visible = false; floor.receiveShadow = true; root.add(floor);
  const subOv = vplane(WID, noclip(0x4f3a26, { op: 0, dw: false, r: 1 })); subOv.scale.y = 0.2; subOv.position.set(X1E - 0.02, -DEXC - 0.2, ZC); subOv.renderOrder = 5; subOv.visible = false; root.add(subOv);
  const dAt = (t) => DEXC * ease(win(t, T.dig[0], T.dig[1]));

  // --- terreno plano (obras de aterro): chão que substitui a colina original dentro do buraco
  const ground = V.flat ? new THREE.Mesh(new THREE.PlaneGeometry(V.hole[1] - V.hole[0], V.hole[3] - V.hole[2]), mat(0x6f9c50, { r: 1 })) : null;
  if (ground) { ground.rotation.x = -Math.PI / 2; ground.position.set((V.hole[0] + V.hole[1]) / 2, -0.004, (V.hole[2] + V.hole[3]) / 2); ground.receiveShadow = true; ground.visible = false; root.add(ground); }
  // --- calçadas laterais
  const walkC = 0xcfcac0;
  if (!V.flat) for (const [z0, z1] of [[ZW0 - 3, ZW0], [ZW1, ZW1 + 3]]) {
    const b = baseBox(LEN, 0.12, z1 - z0, mat(walkC, { r: 1 })); b.position.set((X1E + XE) / 2, 0, (z0 + z1) / 2); b.receiveShadow = true; root.add(b);
    const c = vplane(z1 - z0, noclip(walkC, { r: 1, e: 0x1a1816 })); c.scale.y = 0.12; c.position.set(X1E - 0.02, 0, (z0 + z1) / 2); c.renderOrder = 3; root.add(c);
  }

  // --- camadas
  const unitG = new THREE.BoxGeometry(1, 1, 1); unitG.translate(0.5, 0.5, 0);
  const layers = V.layers.map((L) => {
    const bM = mat(L.col || 0x555, { r: 1 }), cM = noclip(L.col || 0x555, { r: 1, e: 0x1a1608 });
    const body = new THREE.Mesh(unitG, bM); body.position.set(X1E, L.y0, ZC); body.visible = false; body.receiveShadow = true; body.castShadow = true; root.add(body);
    const cap = vplane(WID, cM); cap.position.set(X1E - 0.012, L.y0, ZC); cap.renderOrder = 2; cap.visible = false; root.add(cap);
    return { ...L, bM, cM, body, cap, c0: new THREE.Color(L.col || 0), c1: new THREE.Color(L.comp || 0) };
  });
  const sprayL = (V.sprays || []).map((s) => {
    const m = mat(s.col ?? 0x1a1b1e, { r: 0.4 }), cm = noclip(s.col ?? 0x1a1b1e, { r: 0.5 });
    const body = new THREE.Mesh(unitG, m); body.position.set(X1E, s.y - 0.005, ZC); body.scale.set(0.001, 0.02, WID); body.visible = false; root.add(body);
    const cap = vplane(WID, cm); cap.position.set(X1E - 0.014, s.y - 0.005, ZC); cap.scale.y = 0.02; cap.renderOrder = 3; cap.visible = false; root.add(cap);
    return { ...s, body, cap };
  });
  // geossintéticos (E6): manto desenrolado por um rolo
  const gridTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); g.strokeStyle = '#26282c'; g.lineWidth = 9; g.strokeRect(0, 0, 64, 64); const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(LEN / 0.9, WID / 0.9); tx.anisotropy = 4; return tx; })();
  const planeG = new THREE.PlaneGeometry(1, 1); planeG.rotateX(-Math.PI / 2); planeG.translate(0.5, 0, 0);
  const sheets = (V.sheets || []).map((S) => {
    const grid = S.kind === 'grid';
    const pm = grid ? new THREE.MeshStandardMaterial({ map: gridTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }) : mat(0xece8da, { r: 1, e: 0x2a2820 });
    const pl = new THREE.Mesh(planeG, pm); pl.position.set(X1E, S.y + 0.055, ZC); pl.scale.set(0.001, 1, WID); pl.visible = false; pl.receiveShadow = true; root.add(pl);
    const cap = vplane(WID, noclip(grid ? 0x26282c : 0xf2eee0, { r: 1, e: grid ? 0x15171a : 0x2a2820 })); cap.position.set(X1E - 0.03, S.y, ZC); cap.scale.y = 0.055; cap.renderOrder = 4; cap.visible = false; root.add(cap);
    const piv = new THREE.Group(); piv.rotation.x = Math.PI / 2; const roll = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, WID + 0.3, 20), mat(grid ? 0x2c2e33 : 0xf2eee0, { r: 0.9 })); piv.add(roll); piv.visible = false; root.add(piv);
    return { ...S, grid, pl, cap, piv, roll };
  });
  const wD = person(0x4a8fd0); wD.group.visible = false; root.add(wD.group);
  const rollers2 = [person(0xe8742c), person(0x4a8fd0)]; rollers2.forEach((p) => { p.group.visible = false; root.add(p.group); });
  // concreto (E2): cestas de barras de transferência, barra de ligação, juntas serradas
  const slabL = V.layers.find((l) => l.kind === 'conc');
  const dowelCol = mat(0xb7bbc2, { r: 0.4, m: 0.6 }), wireCol = mat(0x6e7178, { r: 0.6, m: 0.5 });
  const JX = []; for (let x = X1E + 5; x < XE - 1; x += 5) JX.push(x);
  const baskets = slabL ? JX.map((x) => {
    const g = new THREE.Group(); const yd = slabL.y0 + slabL.h * 0.5; g.position.set(x, 0, ZC); g.visible = false;
    for (let i = 0; i < 11; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.0, 8), dowelCol); c.rotation.z = Math.PI / 2; c.position.set(0, yd, -4.5 + i * 0.9); g.add(c); }
    for (const dx of [-0.45, 0.45]) { const r = baseBox(0.05, 0.05, WID - 0.4, wireCol); r.position.set(dx, yd - 0.025, 0); g.add(r); for (const dz of [-4.5, 0, 4.5]) { const l = baseBox(0.05, yd - slabL.y0, 0.05, wireCol); l.position.set(dx, slabL.y0, dz); g.add(l); } }
    root.add(g); return g;
  }) : [];
  const tieBar = slabL ? vplane(1.0, noclip(0x9a9ea6, { r: 0.4, e: 0x202226 })) : null; if (tieBar) { tieBar.scale.y = 0.06; tieBar.position.set(X1E - 0.035, slabL.y0 + slabL.h * 0.5, ZC); tieBar.renderOrder = 5; tieBar.visible = false; root.add(tieBar); }
  const jointFace = slabL ? vplane(0.09, noclip(0x1a1b1e, { r: 1 })) : null; if (jointFace) { jointFace.scale.y = slabL.h / 3; jointFace.position.set(X1E - 0.03, slabL.y0 + slabL.h * 2 / 3, ZC); jointFace.renderOrder = 5; jointFace.visible = false; root.add(jointFace); }
  const cuts = slabL ? JX.map((x) => { const c = baseBox(0.12, 0.012, 1, mat(0x15161a, { r: 1 })); c.geometry.translate(0, 0, 0.5); c.position.set(x, slabL.y0 + slabL.h + 0.012, ZC - WID / 2); c.scale.z = 0.001; c.visible = false; root.add(c); return c; }) : [];
  const longCut = slabL ? baseBox(1, 0.012, 0.1, mat(0x15161a, { r: 1 })) : null; if (longCut) { longCut.geometry.translate(0.5, 0, 0); longCut.position.set(X1E, slabL.y0 + slabL.h + 0.012, ZC); longCut.scale.x = 0.001; longCut.visible = false; root.add(longCut); }
  // E5: trincas na capa existente, superfície fresada, fresadora
  const crackTex = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.clearRect(0, 0, 1024, 256); g.strokeStyle = 'rgba(18,19,22,0.95)'; g.lineCap = 'round';
    let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let i = 0; i < 26; i++) { let x = rnd() * 1024, y = rnd() * 256; g.lineWidth = 2 + rnd() * 2.5; g.beginPath(); g.moveTo(x, y); const n = 5 + Math.floor(rnd() * 7); for (let k = 0; k < n; k++) { x += (rnd() - 0.35) * 70; y += (rnd() - 0.5) * 46; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 4; i++) { const cx = rnd() * 1024, cy = 40 + rnd() * 170; g.lineWidth = 1.8; for (let k = 0; k < 14; k++) { g.beginPath(); g.moveTo(cx + (rnd() - 0.5) * 70, cy + (rnd() - 0.5) * 50); g.lineTo(cx + (rnd() - 0.5) * 70, cy + (rnd() - 0.5) * 50); g.stroke(); } }
    const tx = new THREE.CanvasTexture(c); tx.wrapS = THREE.RepeatWrapping; tx.anisotropy = 4; return tx; })();
  const cracks = new THREE.Mesh(planeG, new THREE.MeshStandardMaterial({ map: crackTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 1 })); cracks.position.set(X1E, 0.028, ZC); cracks.scale.set(LEN, 1, WID); cracks.visible = false; root.add(cracks);
  const roughTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#2c2e33'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#42454b'; for (let i = 0; i < 8; i++) g.fillRect(i * 8, 0, 4, 64); const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(LEN * 2.5, 1); return tx; })();
  const rough = new THREE.Mesh(planeG, new THREE.MeshStandardMaterial({ map: roughTex, roughness: 1 })); rough.position.set(X1E, -0.068, ZC); rough.scale.set(0.001, 1, WID); rough.visible = false; root.add(rough);
  const miller = makeMiller(); miller.visible = false; root.add(miller);
  const paintM = mat(0xf2efe6, { r: 0.6 }); const dashes = []; for (let x = X1E + 1; x < XE - 1; x += 4) { const d = baseBox(2, 0.01, 0.16, paintM); d.position.set(x, 0.03, ZC); d.visible = false; root.add(d); dashes.push(d); }
  const edgeL = [ZW0 + 0.35, ZW1 - 0.35].map((z) => { const d = baseBox(LEN, 0.01, 0.14, mat(0xe9c43a, { r: 0.6 })); d.position.set((X1E + XE) / 2, 0.03, z); d.visible = false; root.add(d); return d; });

  // --- piles de material (sub-base e base)
  const pileM = mat(0xbfa072, { r: 1 }); const piles = [8, 20, 32].map((dx) => { const p = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 8), pileM); p.castShadow = true; p.visible = false; root.add(p); return { m: p, x: X1E + dx }; });

  // --- máquinas
  const exc = M.excavator(0.7); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI / 2; excW.add(exc.group); excW.visible = false; root.add(excW);
  const heap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.5, 10), mat(0x7a5a3a, { r: 1 })); heap.castShadow = true; heap.visible = false; root.add(heap);
  const htruck = M.dumpTruck(0xe8b300); htruck.scale.setScalar(0.85); htruck.rotation.y = Math.PI; htruck.visible = false; root.add(htruck);
  const htF = baseBox(3.8, 1, 2.4, mat(0x7a5a3a, { r: 1 })); htF.position.set(2.1, 0.15, 0); htF.visible = false; htruck.userData.bed.add(htF);
  const dtruck = M.dumpTruck(0xe8b300); dtruck.scale.setScalar(0.85); dtruck.rotation.y = Math.PI; dtruck.visible = false; root.add(dtruck);
  const dtF = baseBox(3.8, 1, 2.4, mat(0x7a5a3a, { r: 1 })); dtF.position.set(2.1, 0.15, 0); dtF.visible = false; dtruck.userData.bed.add(dtF);
  const grader = makeGrader(); grader.visible = false; root.add(grader);
  const water = makeTanker(0x3a7ec2); water.visible = false; root.add(water);
  const tar = makeTanker(0x23262b); tar.visible = false; root.add(tar);
  const roller = M.roller(); roller.scale.setScalar(0.62); roller.visible = false; root.add(roller);
  const rollerPe = makeRollerPe(); rollerPe.scale.setScalar(0.62); rollerPe.visible = false; root.add(rollerPe);
  const rollerVib = makeRollerVib(); rollerVib.scale.setScalar(0.62); rollerVib.visible = false; root.add(rollerVib);
  let curRoller = roller;
  const info = { name: '', rollName: '', w: 12, wo: 16, gm: 17, k: 0.035, gd: 14.6, gc: 86, e: 0.84, comp: 0, col: 0xbf9f6a, idx: 1, wLabel: 'umidade' };
  let panel = null, lastPanel = -9;
  if (V.panel) { const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; const pm = new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide, toneMapped: false }); const pg = new THREE.PlaneGeometry(V.panel.w, V.panel.h); pg.rotateY(-Math.PI / 2); const pl = new THREE.Mesh(pg, pm); pl.position.set(...V.panel.pos); pl.visible = false; root.add(pl); const pole = baseBox(0.2, V.panel.pos[1] - V.panel.h / 2, 0.2, mat(0x5a5d63)); pole.position.set(V.panel.pos[0] + 0.15, 0, V.panel.pos[2] - V.panel.w * 0.3); root.add(pole); const pole2 = pole.clone(); pole2.position.z = V.panel.pos[2] + V.panel.w * 0.3; root.add(pole2); panel = { cv, tx, pl, pole, pole2, ctx: cv.getContext('2d') }; }
  const paver = V.slip ? makeSlip() : M.paver(); if (!V.slip) paver.scale.setScalar(0.8); paver.visible = false; root.add(paver);
  const cure = makeTanker(0xf4f4ee); cure.visible = false; root.add(cure);
  const mtruck = M.mixerTruck(); mtruck.scale.setScalar(0.85); mtruck.visible = false; root.add(mtruck);
  const saw = makeSaw(); saw.visible = false; root.add(saw);
  const waterS = stream(root, 34, 0x8fc7ee), tarS = stream(root, 34, 0x1c1e22), cureS = stream(root, 34, 0xf4f4ee);
  const tech = person(0xf2b705, 0xffffff); tech.group.visible = false; root.add(tech.group);
  const tbox = baseBox(0.4, 0.25, 0.4, mat(0xe8742c)); tbox.visible = false; root.add(tbox);
  const wA = person(0xe8742c), wB = person(0x4a8fd0); [wA, wB].forEach((p) => { p.group.visible = false; root.add(p.group); });

  // --- cones e carros
  const coneG = new THREE.ConeGeometry(0.28, 0.75, 8); coneG.translate(0, 0.375, 0);
  const conePos = []; for (let x = X1E + 2; x < XE; x += 4) conePos.push([x, ZW0 - 0.7], [x, ZW1 + 0.7]);
  const cones = new THREE.InstancedMesh(coneG, mat(0xf26b1d), conePos.length); cones.frustumCulled = false; cones.castShadow = true; root.add(cones);
  const glass = mat(0x9ec3da, { r: 0.3, e: 0x20323f });
  const mkCar = (col) => { const c = new THREE.Group(); c.add(bx(3.4, 0.7, 1.6, mat(col, { r: 0.4, m: 0.2 }), 0, 0.6, 0), bx(1.8, 0.6, 1.4, glass, -0.2, 1.2, 0)); for (const x of [-1.1, 1.1]) for (const z of [-0.8, 0.8]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 10), mat(0x222428)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.33, z); c.add(w); } c.rotation.y = Math.PI; root.add(c); return c; };
  const cars = [[0xd84a3a, 0, ZC + 2.4, 7], [0x3a79c4, 20, ZC + 2.4, 6], [0xe9c43a, 8, ZC - 2.4, 6.5]].map(([col, x0, z, sp]) => ({ c: mkCar(col), x0, z, sp }));

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries([...new Set([...V.labels.map((l) => l.k), 'cone', 'subleito', 'subbase', 'base', 'imprim', 'binder', 'capa', 'capaold', 'fresa', 'rap', 'faixa', 'moto', 'rolo', 'pipa', 'vibro', 'ensaio', 'solo', 'geotex', 'geogrid', 'laje', 'dowel', 'tie', 'junta', 'serra', 'cura', 'betoneira', 'lay1', 'lay2', 'lay3', 'painel'])].map((k) => [k, new THREE.Vector3()]));
  const m4 = new THREE.Matrix4(), mq = new THREE.Matrix4(), v1 = new THREE.Vector3();
  const fmt = (x, n = 1) => x.toFixed(n).replace('.', ',');
  const topOf = (i) => (i <= 0 ? -DEXC : layers[i - 1].y0 + layers[i - 1].h);   // nível em que as máquinas andam na camada i

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc;
    let note = '', label = null;

    // caixa
    const d = (V.repair || V.flat) ? DEXC : dAt(t), on = d > 0.02 && !V.flat; U.value = d;
    const mlen = V.mill ? win(t, V.mill[0], V.mill[1]) * LEN : 0;
    if (V.flat) { terrainHoles[0].set(V.hole[0], V.hole[1], V.hole[2] + DZR, V.hole[3] + DZR); section.setBand(0, 0, 0, 0, 0); ground.visible = true; }
    else if (on) { terrainHoles[0].set(X1E - 1, XE, ZW0 + DZR, ZW1 + DZR); section.setBand(0, ZW0 + DZR, ZW1 + DZR, -d, 0.05); } else { terrainHoles[0].set(0, 0, 0, 0); section.setBand(0, 0, 0, 0, 0); }
    cw.forEach((m) => { m.visible = on; });
    floor.visible = on; floor.position.set((X1E + XE) / 2, -d - 0.01, ZC); floorM.color.setHex(0x86683f).lerp(new THREE.Color(0x6a5033), ease(win(t, T.comp0[0], T.comp0[1]))); floorM.emissive.copy(floorM.color).multiplyScalar(0.25);
    const cu = ease(win(t, T.cones[0], T.cones[1])) * (1 - ease(win(t, V.conesOut[0], V.conesOut[1])));
    conePos.forEach(([x, z], i) => { m4.makeTranslation(x, 0.12, z); mq.makeScale(Math.max(1e-4, cu), Math.max(1e-4, cu), Math.max(1e-4, cu)); cones.setMatrixAt(i, m4.multiply(mq)); }); cones.instanceMatrix.needsUpdate = true;
    // escavadeira e caminhão de bota-fora (caixa)
    const eS = ease(win(t, T.dig[0] - 3, T.dig[0])) * (1 - ease(win(t, T.haul[1], T.haul[1] + 3)));
    excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); excW.position.set(X1E + 8, 0.12, ZW1 + 3.4); exc.update(tAbs * 1.3);
    const hs = ease(win(t, T.dig[0], T.dig[1])) * (1 - ease(win(t, T.haul[0] + 3, T.haul[1] - 2)));
    heap.visible = hs > 0.02; heap.scale.setScalar(Math.max(0.01, hs)); heap.position.set(X1E + 4, 0.12 + 0.75 * hs, ZW1 + 2.4);
    let hx = null, hf = 0; { const a = T.haul[0], b = T.haul[1], xs = XE - 4, xp = X1E + 5.5; if (t >= a && t < b) { hx = t < a + 3 ? xs + (xp - xs) * ease(win(t, a, a + 3)) : t < b - 3 ? xp : xp + (X1E + 1 - xp) * ease(win(t, b - 3, b)); hf = clamp01((t - a - 3) / (b - a - 6)); } }
    htruck.visible = hx !== null && hx > X1E + 3.25; if (htruck.visible) htruck.position.set(hx, 0.12, ZW1 + 5.6); htF.visible = htruck.visible && hf > 0.02; htF.scale.y = Math.max(0.01, 1.1 * hf);

    if (V.repair || V.flat) { excW.visible = false; heap.visible = false; htruck.visible = false; }
    // subleito: regularização (moto) e compactação (rolo)
    const trim = win(t, T.trim[0], T.trim[1]), cp = win(t, T.comp0[0], T.comp0[1]);
    let gOn = false, rOn = false, wOn = false, tOn = false, pOn = false, dOn = false, tkOn = false;
    let rkind = 'liso';
    let gx = 0, gz = ZC - 2.2, gy = -DEXC, gry = 0, rx = 0, rz = ZC, ry = 0, ryy = -DEXC, px = 0, py = 0;
    subOv.visible = !V.repair && !V.flat && cp > 0; subOv.material.opacity = 0.55 * ease(cp);
    if (trim > 0 && trim < 1) { gOn = true; gx = X1E + 2 + (LEN - 6) * tri(trim); gry = trim < 0.5 ? 0 : Math.PI; gy = -DEXC; note = 'Regularizando o subleito'; }
    if (cp > 0 && cp < 1) { rOn = true; const p = cp < 0.5 ? 0 : 1, q = (cp - 0.5 * p) * 2; rx = X1E + 3 + (LEN - 6) * (p === 0 ? q : 1 - q); rz = ZC + (p === 0 ? -1.6 : 1.6); ry = p === 0 ? 0 : Math.PI; ryy = -DEXC; note = `Compactando o subleito · GC ${Math.round(88 + 12 * ease(cp))}%`; label = 'subleito'; }

    // camadas
    let curL = -1, curU = 0;
    layers.forEach((L, i) => { const u = (t - L.t0) / L.dur; if (L.kind !== 'old' && u >= 0 && u < 1.0) { curL = i; curU = u; } });
    let gcNote = '';
    layers.forEach((L, i) => {
      const u = (t - L.t0) / L.dur, W = LEN;
      let len = 0, sy = 0, comp = 0, hot = 0;
      if (L.kind === 'old') { len = 1; sy = 1; comp = 1; }
      else if (L.kind === 'gran') {
        len = u < 0.2 ? 0 : ease(win(u, 0.2, 0.45)); sy = u < 0.2 ? 0 : ease(win(u, 0.2, 0.3)) * ((L.loose ?? 1.18) - ((L.loose ?? 1.18) - 1) * ease(win(u, 0.58, 0.95))); if (u >= 1) { len = 1; sy = 1; }
        comp = u >= 1 ? 1 : ease(win(u, 0.58, 0.95));
      } else if (L.kind === 'conc') {
        const xcf = win(u, 0.05, 0.5); len = u >= 1 ? 1 : (u < 0.05 ? 0 : xcf); sy = len > 0.001 ? 1 : 0; comp = u >= 1 ? 1 : ease(win(u, 0.35, 0.95));
      } else {
        const xcf = ease(win(u, 0.05, 0.55)); len = u >= 1 ? 1 : (u < 0.05 ? 0 : xcf); sy = len > 0.001 ? 1 : 0; comp = u >= 1 ? 1 : ease(win(u, 0.58, 0.95)); hot = u >= 1 ? 0 : 1 - ease(win(u, 0.1, 0.95));
        if (u >= 1) hot = 0;
      }
      const vis = len > 0.002 && sy > 0.01;
      L.body.visible = vis; L.cap.visible = vis;
      L.body.scale.set(Math.max(0.001, len * W), Math.max(0.001, L.h * sy), WID);
      L.cap.scale.y = Math.max(0.001, L.h * sy);
      if (L.kind === 'gran') { L.bM.color.copy(L.c0).lerp(L.c1, comp); }
      else if (L.kind === 'conc') { L.bM.color.copy(L.c1).lerp(L.c0, comp); L.bM.emissive.setHex(0); }
      else if (L.kind === 'old') { L.bM.color.copy(L.c1.getHex() ? L.c1 : L.c0); L.bM.emissive.setHex(0); if (L.mill) { L.body.position.x = X1E + mlen; L.body.scale.x = Math.max(0.001, LEN - mlen); L.cap.visible = mlen < 0.5; } }
      else { L.bM.color.setHex(0x34373c).lerp(new THREE.Color(0x5a3b2c), hot); L.bM.emissive.setHex(0x7a2a08).multiplyScalar(0.55 * hot); }
      L.cM.color.copy(L.bM.color); L.cM.emissive.copy(L.bM.color).multiplyScalar(0.25); if (L.kind === 'asph') L.cM.emissive.setHex(0x7a2a08).multiplyScalar(0.5 * hot);
      L.vis = { u, len, sy, comp, hot };
    });
    // piles e caminhão basculante (camadas granulares)
    piles.forEach((p) => { p.m.visible = false; }); dtruck.visible = false;
    water.visible = grader.visible = false; waterS.set(v1, v1, false, 0); tarS.set(v1, v1, false, 0); cureS.set(v1, v1, false, 0);
    paver.visible = false; mtruck.visible = false; saw.visible = false;
    if (curL >= 0) {
      const L = layers[curL], u = curU, yTop = topOf(curL), y0 = L.y0;
      if (L.kind === 'gran') {
        if (V.panel && L.curve) { const cv = L.curve, w = L.w0 + (cv.wo - L.w0) * (L.nowater ? 1 : ease(win(u, 0.46, 0.6))), gdc = cv.gm - cv.k * (w - cv.wo) ** 2, gd = gdc * (0.86 + 0.14 * L.vis.comp); Object.assign(info, { name: L.name, rollName: L.rollName, w, wo: cv.wo, gm: cv.gm, k: cv.k, gd, gc: gd / cv.gm * 100, e: cv.Gs * 9.81 / gd - 1, comp: L.vis.comp, col: L.col, idx: curL + 1, wLabel: L.nowater ? 'umidade natural' : 'umidade' }); }
        const keys = [[0, XE + 8, 0], [0.02, X1E + 32, 0], [0.05, X1E + 32, 1], [0.09, X1E + 20, 0], [0.13, X1E + 20, 1], [0.16, X1E + 8, 0], [0.2, X1E + 8, 1], [0.24, X1E + 1, 0]];
        if (u < 0.24) { let j = 0; while (j < keys.length - 2 && u > keys[j + 1][0]) j++; const a = keys[j], b = keys[j + 1], s = ease((u - a[0]) / (b[0] - a[0])); const x = a[1] + (b[1] - a[1]) * s, tilt = (a[2] + (b[2] - a[2]) * s); if (x > X1E + 3.25) { dtruck.visible = true; dtruck.position.set(x, yTop + 0.02, ZC); dtruck.userData.bed.rotation.z = tilt * 0.5; dtF.visible = u < 0.2 && tilt < 0.5 && u < 0.065 + 0.0 ? true : u < 0.13 ? tilt < 0.5 && u < 0.09 : false; dtF.visible = u < 0.065 ? tilt < 0.5 : u < 0.13 ? u < 0.09 : u < 0.2 ? u < 0.16 : false; dtF.scale.y = 1; } }
        piles.forEach((p, i) => {
          const tdump = [0.05, 0.11, 0.17][i], g = ease(win(u, tdump, tdump + 0.04)), gone = Math.max(0, 1 - clamp01((L.vis.len * LEN - (p.x - X1E) + 2) / 3));
          p.m.visible = g > 0.01 && gone > 0.01 && u < 0.5; p.m.scale.setScalar(Math.max(0.01, g * gone)); p.m.position.set(p.x, y0 + 0.5 * g * gone * 1.2, ZC); p.m.material.color.setHex(i % 2 ? 0xbfa072 : 0xbfa072);
        });
        pileM.color.setHex(L.col);
        // motoniveladora
        if (u >= 0.2 && u < 0.58) { gOn = true; const f = u < 0.45 ? 1 : 1 - ease(win(u, 0.45, 0.58)); gx = X1E + L.vis.len * LEN * f - 3.0 + (u < 0.45 ? 0 : 0); gz = ZC - 2.2; gy = y0 + L.h * 1.0; gry = u < 0.45 ? 0 : Math.PI; if (u >= 0.45) gx = X1E + L.vis.len * LEN * f + 1; note = u < 0.45 ? 'Espalhando a camada' : 'Motoniveladora saindo'; label = L.id; }
        // caminhão-pipa
        if (u >= 0.46 && u < 0.6 && !L.nowater) { wOn = true; const f = ease(win(u, 0.46, 0.59)); const x = XE + 2 - (XE - X1E + 0) * f; water.position.set(x, y0 + L.h * 1.1, ZC + 2.0); water.rotation.y = Math.PI; water.visible = x > X1E + 3.25; waterS.set(new THREE.Vector3(x + 3.0, y0 + L.h * 1.1 + 0.8, ZC + 2.0), new THREE.Vector3(x + 4.3, y0 + L.h * 1.1, ZC + 2.0), water.visible, tAbs, 1.0); note = 'Umedecendo até a umidade ótima'; label = 'pipa'; }
        // rolo
        if (u >= 0.58 && u < 0.97) { rOn = true; const f = win(u, 0.58, 0.95), p = f < 0.5 ? 0 : 1, q = (f - 0.5 * p) * 2; rx = X1E + 3 + (LEN - 6) * (p === 0 ? q : 1 - q); rz = ZC + (p === 0 ? -1.7 : 1.7); ry = p === 0 ? 0 : Math.PI; ryy = y0 + L.h * ((L.loose ?? 1.18) - ((L.loose ?? 1.18) - 1) * L.vis.comp); rkind = L.roll || 'liso'; note = V.panel ? `Compactando com ${L.rollName} · GC ${Math.round(info.gc)}%` : `Compactando · GC ${Math.round(88 + 12 * L.vis.comp)}% do Proctor`; label = 'rolo'; }
        if (u >= 0.9 && u < 1) { tech.group.visible = true; tech.group.position.set(X1E + 14, y0 + L.h, ZC + 3.4); tech.group.rotation.y = 0.6; tech.upper.rotation.x = 0.35; tbox.visible = true; tbox.position.set(X1E + 14.6, y0 + L.h, ZC + 3.2); if (u > 0.92) note = 'Controle: ensaio de densidade no local'; } else { tech.group.visible = false; tbox.visible = false; }
      } else if (L.kind === 'conc') {
        const xcf = win(u, 0.05, 0.5), xc = X1E + 2.6 + LEN * xcf;
        if (u < 0.52) { paver.visible = true; paver.position.set(xc, y0, ZC); paver.rotation.y = 0; note = u < 0.05 ? 'Betoneira chegando à frente da pavimentadora' : 'Concretando e adensando com a pavimentadora de formas deslizantes'; label = 'vibro';
          const arrive = ease(win(u, 0, 0.06)); const xT = XE + 12 + (xc + 6.8 - XE - 12) * arrive; const xx = u < 0.06 ? xT : xc + 6.8; mtruck.visible = xx < XE + 9; mtruck.position.set(xx, y0 + 0.02, ZC); mtruck.userData.spin.rotation.x = tAbs * 3; }
        const sj = win(u, 0.55, 0.97);
        if (sj > 0 && sj < 1) { const kf = sj * JX.length, kk = Math.min(JX.length - 1, Math.floor(kf)), q = kf - kk; saw.visible = true; saw.position.set(JX[kk] - 0.0, L.y0 + L.h + 0.02, ZC - 4.8 + 9.6 * q); saw.userData.disc.rotation.x = tAbs * 14; note = `Serrando a junta ${kk + 1} de ${JX.length} · cerca de 1/3 da espessura`; label = 'serra'; }
        else if (u > 0.5 && u < 0.55) note = 'Concreto curando';
      } else {
        // vibroacabadora, caminhão e rolo
        const xcf = ease(win(u, 0.05, 0.55));
        if (u < 0.6) { paver.visible = true; const xc = X1E + 2.6 + LEN * xcf; px = xc; paver.position.set(xc + 0.0, y0 + 0.02, ZC); paver.rotation.y = 0; note = `Espalhando o CBUQ · ${Math.round(150 - 60 * ease(win(u, 0.1, 0.95)))} °C`; label = 'vibro';
          dtruck.visible = true; const xt = Math.max(xc + 5.4, u < 0.05 ? XE + 6 : 0); const arrive = ease(win(u, 0, 0.06)); const xT = XE + 12 + (xc + 5.4 - XE - 12) * arrive; const xx = u < 0.06 ? xT : xc + 5.4; dtruck.position.set(Math.min(xx, XE + 12), y0 - 0.1, ZC); dtruck.userData.bed.rotation.z = 0.45 * ease(win(u, 0.06, 0.12)); dtF.visible = true; dtF.scale.y = 1.1 * (1 - ease(win(u, 0.12, 0.54))); dtruck.rotation.y = 0; void xt;
          if (xx > XE + 9) dtruck.visible = false; }
        if (u >= 0.58 && u < 0.97) { rOn = true; const f = win(u, 0.58, 0.95), p = Math.min(2, Math.floor(f * 3)), q = f * 3 - p; rx = X1E + 3 + (LEN - 6) * (p % 2 === 0 ? q : 1 - q); rz = ZC + (p === 1 ? 0 : p === 0 ? -1.7 : 1.7); ry = p % 2 === 0 ? 0 : Math.PI; ryy = y0 + L.h; note = `Compactando o asfalto · ${Math.round(110 - 30 * f)} °C`; label = 'rolo'; }
      }
    }
    // distribuidor de ligante (imprimação e pintura de ligação)
    sprayL.forEach((S) => {
      const u = win(t, S.t[0], S.t[1]), vis = u > 0;
      const xm = X1E - 3 + (LEN + 6.5) * u, flen = u >= 1 ? LEN : clamp01((xm - 3.4 - X1E) / LEN) * LEN;
      S.body.visible = S.cap.visible = vis && flen > 0.01; S.body.scale.set(Math.max(0.001, flen), 0.02, WID); S.cap.scale.y = 0.02;
      if (u > 0 && u < 1) { tOn = true; const cu2 = S.mach === 'cure', mc = cu2 ? cure : tar, ss = cu2 ? cureS : tarS; const x = xm; mc.position.set(x, S.y, ZC); mc.rotation.y = 0; mc.visible = x < XE + 4; ss.set(new THREE.Vector3(x - 3.4, S.y + 0.55, ZC), new THREE.Vector3(x - 4.0, S.y, ZC), mc.visible && x - 3.4 > X1E, tAbs, 1.0); note = S.note || (S.id === 'imprim' ? 'Imprimação com ligante asfáltico' : 'Pintura de ligação'); label = S.id; }
    });
    // geossintéticos: rolo desenrolando o manto
    rollers2.forEach((p) => { p.group.visible = false; });
    sheets.forEach((S) => {
      const u = win(t, S.t[0], S.t[1]), vis = u > 0, len = u >= 1 ? 1 : u;
      S.pl.visible = S.cap.visible = vis; S.pl.scale.set(Math.max(0.001, len * LEN), 1, WID); S.piv.visible = u > 0 && u < 1;
      if (S.piv.visible) { const rad = 0.62 - 0.4 * len, x = X1E + len * LEN; S.piv.position.set(x, S.y + 0.055 + rad, ZC); S.roll.scale.set(rad, 1, rad); S.roll.rotation.y = -len * LEN / Math.max(0.2, rad);
        rollers2.forEach((p, i) => { p.group.visible = true; p.group.position.set(x - 0.2, 0.12, ZC + (i ? 1 : -1) * 5.75); p.group.rotation.y = Math.PI / 2; });
        note = S.note; label = S.id; }
    });
    // barras de transferência, de ligação e juntas
    if (slabL) {
      const ud = win(t, slabL.t0 - 7, slabL.t0 - 1);
      baskets.forEach((g, i) => { const f = (i + 1) / (baskets.length + 1); g.visible = ud > f * 0.9; });
      wD.group.visible = ud > 0 && ud < 1;
      if (ud > 0 && ud < 1) { wD.group.position.set(X1E + 3 + (LEN - 6) * ud, 0.12, ZC + 5.8); wD.group.rotation.y = Math.PI / 2; note = 'Posicionando as barras de transferência e de ligação'; label = 'dowel'; }
      const vL = layers.find((l) => l.kind === 'conc').vis || { len: 0 };
      tieBar.visible = ud >= 1 || vL.len > 0.001; tieBar.scale.x = 1;
      const sj2 = win(t, slabL.t0 + slabL.dur * 0.55, slabL.t0 + slabL.dur * 0.97);
      jointFace.visible = sj2 > 0;
      cuts.forEach((c, i) => { const q = clamp01(sj2 * JX.length - i); c.visible = q > 0; c.scale.z = Math.max(0.001, q * WID); });
      longCut.visible = sj2 > 0; longCut.scale.x = Math.max(0.001, ease(sj2) * LEN);
    }
    // E5: avaliação, trincas, fresagem
    if (V.repair) {
      cracks.visible = mlen < LEN - 0.5; cracks.position.x = X1E + mlen; cracks.scale.x = Math.max(0.001, LEN - mlen); crackTex.repeat.x = Math.max(0.001, (LEN - mlen) / LEN); crackTex.offset.x = mlen / LEN;
      rough.visible = mlen > 0.05; rough.scale.x = Math.max(0.001, mlen);
      const ev = win(t, V.eval[0], V.eval[1]);
      if (ev > 0 && ev < 1) { const ix = Math.min(2, Math.floor(ev * 3)); tech.group.visible = true; tech.group.position.set(X1E + 8 + 12 * ix, 0.02, ZC + 2.6); tech.group.rotation.y = 0.5; tech.upper.rotation.x = 0.35; tbox.visible = true; tbox.position.set(X1E + 8.7 + 12 * ix, 0.02, ZC + 2.3); note = 'Avaliando o pavimento: trincas, afundamento e deflexão'; label = 'ensaio'; } else { tech.group.visible = false; tbox.visible = false; }
      const mEnd = V.mill[1]; let mx = X1E + mlen + 0.8; if (t > mEnd) mx += (t - mEnd) * 6;
      miller.visible = t >= V.mill[0] && mx < XE + 10; miller.position.set(mx, 0.02, ZC); miller.userData.drum.rotation.y = tAbs * 10;
      const rx2 = mx + 6.8; dtruck.visible = miller.visible && rx2 < XE + 9; dtruck.position.set(rx2, 0.02, ZC); dtruck.rotation.y = 0; dtruck.userData.bed.rotation.z = 0; dtF.visible = dtruck.visible; dtF.scale.y = Math.max(0.01, 1.1 * mlen / LEN);
      if (t >= V.mill[0] && t < mEnd) { note = `Fresando a capa desgastada · o material fresado (RAP) vai para o caminhão`; label = 'fresa'; }
      else if (t >= mEnd && t < V.sprays[0].t[0]) note = 'Varrendo e limpando a superfície fresada';
    }
    // máquinas comuns
    grader.visible = gOn && true; if (gOn) { grader.position.set(gx, gy, gz); grader.rotation.y = gry; if (gx < X1E + 3) grader.visible = false; }
    [roller, rollerPe, rollerVib].forEach((r) => { r.visible = false; }); const RR = rkind === 'pe' ? rollerPe : rkind === 'vib' ? rollerVib : roller; curRoller = RR;
    RR.visible = rOn; if (rOn) { RR.position.set(rx, ryy + (rkind === 'vib' ? 0.03 * Math.sin(tAbs * 40) : 0), rz); RR.rotation.y = ry; }
    // faixa pintada e carros
    const pu = ease(win(t, V.paint[0], V.paint[1]));
    if (V.repair) {
      paintM.color.setHex(pu > 0.01 ? 0xf2efe6 : 0xa6a398);
      dashes.forEach((dd, i) => { const old = t < V.paint[0] && dd.position.x - 1 > X1E + mlen; dd.visible = old || pu > (i + 1) / (dashes.length + 1) * 0.9; });
      edgeL.forEach((e) => { e.visible = pu > 0.05 || t < V.mill[0]; e.scale.x = pu > 0.05 ? Math.max(0.001, pu) : 1; e.material.color.setHex(pu > 0.01 ? 0xe9c43a : 0xb7a468); });
    } else {
      dashes.forEach((dd, i) => { dd.visible = pu > (i + 1) / (dashes.length + 1) * 0.9; }); edgeL.forEach((e) => { e.visible = pu > 0.05; e.scale.x = Math.max(0.001, pu); });
    }
    if (t >= V.paint[0] && t < V.conesOut[1]) { wA.group.visible = true; wA.group.position.set(X1E + 4 + 30 * pu, 0.02, ZC + 4.8); wA.group.rotation.y = Math.PI / 2; note = t < V.conesOut[0] ? 'Pintando a faixa' : 'Retirando a sinalização'; } else wA.group.visible = false;
    cars.forEach(({ c, x0, z, sp }) => { const Lc = 40, u = ((x0 + tAbs * sp) % Lc + Lc) % Lc, x = XE + 4 - u; c.visible = t > V.cars && x > X1E + 2.4; c.position.set(x, 0.03, z); });
    if (t > V.cars) note = 'Tráfego liberado';
    // trabalhadores de sinalização
    wB.group.visible = t > T.cones[1] && t < V.conesOut[0] && t < V.paint[0]; if (wB.group.visible) { const u = 0.5 + 0.5 * Math.sin(tAbs * 0.3); wB.group.position.set(X1E + 6 + 20 * u, 0.12, ZW0 - 1.6); wB.group.rotation.y = Math.cos(tAbs * 0.3) > 0 ? -Math.PI / 2 : Math.PI / 2; }
    // painel de controle
    if (panel) { panel.pl.visible = t > 1; panel.pole.visible = panel.pole2.visible = panel.pl.visible; if (tAbs - lastPanel > 0.2) { lastPanel = tAbs; drawPanel(panel.ctx, panel.cv.width, panel.cv.height, info); panel.tx.needsUpdate = true; } }
    // etapas, nota, âncoras
    const S = V.starts; let step = 0; for (let i = 0; i < S.length; i++) if (t >= S[i]) step = i;
    st.step = step; st.progress = win(t, S[step], S[step + 1] ?? T.END);
    st.note = note || ((V.repair || V.flat) ? (V.repair ? (t < V.eval[0] ? 'Sinalizando' : 'Pavimento em obra') : (t < 3 ? 'Sinalizando' : (V.idle ?? 'Aterro em obra'))) : t < T.dig[0] ? 'Sinalizando' : t < T.dig[1] ? `Escavando a caixa · ${fmt(d, 2)} m` : t < T.haul[1] ? 'Caminhão levando o solo' : gcNote || 'Camada pronta');
    const a = anchors, tp = (i) => (layers[i] ? layers[i].y0 + layers[i].h * 0.5 : 0);
    a.cone.set(X1E + 6, 0.5, ZW0 - 0.7); a.subleito.set(XP, -DEXC - 0.1, ZC - 3); a.subbase.set(XP, tp(0), ZC + 2.5); a.base.set(XP, tp(1), ZC - 2); a.imprim.set(XP, -0.2, ZC + 3.6); a.binder.set(XP, -0.14, ZC - 3.5); a.capa.set(XP, 0.02, ZC + 4); a.faixa.set(X1E + 8, 0.08, ZC);
    a.moto.set(grader.position.x, grader.position.y + 3.2, grader.position.z); a.rolo.set(curRoller.position.x, curRoller.position.y + 3.0, curRoller.position.z); a.pipa.set(water.position.x, water.position.y + 3.2, water.position.z); a.vibro.set(paver.position.x, paver.position.y + 3.0, paver.position.z); a.ensaio.set(tech.group.position.x, tech.group.position.y + 2.0, tech.group.position.z); a.solo.set(X1E, -15, ZC);
    if (V.repair) { a.capaold.set(XP, -0.03, ZC - 3); a.fresa.set(miller.position.x, 4.4, ZC); a.rap.set(dtruck.position.x, dtruck.position.y + 3.8, dtruck.position.z); }
    if (V.flat) { layers.forEach((L, i) => a['lay' + (i + 1)]?.set(XP, L.y0 + L.h * 0.5, ZC + (i === 1 ? -2.5 : 2.5))); if (panel) a.painel.set(V.panel.pos[0], V.panel.pos[1] + V.panel.h * 0.35, V.panel.pos[2]); }
    if (sheets[0]) a.geotex.set(XP, sheets[0].y + 0.03, ZC + 3.2); if (sheets[1]) a.geogrid.set(XP, sheets[1].y + 0.03, ZC - 3.2);
    if (slabL) { a.laje.set(XP, slabL.y0 + slabL.h * 0.5, ZC + 3.5); a.tie.set(XP, slabL.y0 + slabL.h * 0.5, ZC); a.junta.set(XP, slabL.y0 + slabL.h * 0.8, ZC); a.dowel.set(JX[1], slabL.y0 + slabL.h * 0.5, ZC - 2); a.serra.set(saw.position.x, saw.position.y + 1.6, saw.position.z); a.cura.set(cure.position.x, cure.position.y + 3.2, cure.position.z); a.betoneira.set(mtruck.position.x, mtruck.position.y + 4.2, mtruck.position.z); }
    if (DZR) for (const k in a) a[k].z += DZR;
    void label; void pOn; void dOn; void tkOn; void px; void py;
  }
  const byId = (id) => layers.find((l) => l.id === id);
  const t0Rap = () => st.tc < (V.mill ? V.mill[1] + 2 : 0);
  const VIS = {
    cone: (t) => t > 4 && t < V.conesOut[0], subleito: (t) => t > T.comp0[0] + 4, subbase: (t) => t > byId('subbase').t0 + 10, base: (t) => byId('base') && t > byId('base').t0 + 10, capaold: (t) => t < V.mill[0] + 2, fresa: () => miller.visible, rap: () => dtruck.visible && t0Rap(), imprim: (t) => t > V.sprays[0].t[1],
    binder: (t) => byId('binder') && t > byId('binder').t0 + 6, capa: (t) => byId('capa') && t > byId('capa').t0 + 6,
    lay1: (t) => layers[0] && t > layers[0].t0 + layers[0].dur * 0.35, lay2: (t) => layers[1] && t > layers[1].t0 + layers[1].dur * 0.35, lay3: (t) => layers[2] && t > layers[2].t0 + layers[2].dur * 0.35, painel: (t) => t > 3,
    geotex: (t) => sheets[0] && t > sheets[0].t[1], geogrid: (t) => sheets[1] && t > sheets[1].t[1], laje: (t) => slabL && t > slabL.t0 + slabL.dur * 0.3,
    dowel: (t) => slabL && t > slabL.t0 - 6 && t < slabL.t0 + 4, tie: (t) => slabL && t > slabL.t0 + 4, junta: (t) => slabL && t > slabL.t0 + slabL.dur * 0.7, serra: () => saw.visible, cura: () => cure.visible, betoneira: () => mtruck.visible, moto: () => grader.visible, rolo: () => roller.visible, pipa: () => water.visible, vibro: () => paver.visible, ensaio: () => tech.group.visible, faixa: (t) => t > V.paint[0] + 4,
  };
  function labelVis(kx, t = st.tc) { const f = VIS[kx]; return f ? f(t) : true; }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; const o = engine.scene.getObjectByName(hideName); if (o) o.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); const o = engine.scene.getObjectByName(hideName); if (o) o.visible = true; },
  };
}
export const registerSpec = (k, sp) => { E_SPECS[k] = sp; };
export const createE1 = (e, s) => createRoad(e, s, 'E1');
export const createE2 = (e, s) => createRoad(e, s, 'E2');
export const createE5 = (e, s) => createRoad(e, s, 'E5');
export const createE6 = (e, s) => createRoad(e, s, 'E6');
export const E1 = { box: E_BOX };
export const E1_STEPS_EXPORT = E1_STEPS;
