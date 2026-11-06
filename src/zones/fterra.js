import { createRoad, registerSpec } from './eroad.js';
import { REMOTE_DZ } from '../config.js';

// ---------------------------------------------------------------------------
// Zona F — Obras de terra e encostas. Plano de corte em x = X1F (a oeste do lote); as obras correm ao longo de x.
// F5 reaproveita o motor das obras viárias (eroad.js): camadas lançadas, espalhadas, umedecidas e compactadas.
// ---------------------------------------------------------------------------
export const X1F = -46, XF = -6, ZF = -32;
export const GEO_F = { X1E: X1F, XE: XF, ZC: ZF, ZW0: ZF - 5, ZW1: ZF + 5, WID: 10, LEN: XF - X1F };
export const HOLE_F = [-47, -5.5, -58.5, -5.5];
export const F_BOX = { x0: -125, x1: X1F, z0: -58, z1: -6 };
export const F_CAM = { tx: X1F, ty: 0.9, tz: -29.5, yaw: -1.3, pitch: 0.2, dist: 26 };
export const F_MCAM = { tx: X1F, ty: 0.9, tz: -29.5, yaw: -1.3, pitch: 0.2, dist: 70 };

const F5_STEPS = [
  { t: 'Lançar e espalhar em camadas finas', d: 'O caminhão basculante descarrega o solo em pilhas e a motoniveladora espalha em uma camada solta. Camada fina é regra: o rolo só compacta bem uma espessura limitada, e a camada de baixo sofre menos. Aqui a espessura está exagerada para o corte.' },
  { t: 'Ajustar a umidade', d: 'O solo tem uma umidade ótima, que é a de maior densidade seca para a energia aplicada: é o pico da curva de compactação (Proctor). Solo seco demais resiste ao rolo, e solo úmido demais vira borracha, porque a água ocupa os vazios e não sai. O caminhão-pipa leva o solo até o pico da curva.' },
  { t: 'Compactar com o rolo pé de carneiro', d: 'O pé de carneiro é o rolo dos solos finos e coesivos, como a argila: os pés amassam e penetram na camada, e vão "saindo" à medida que ela fica densa. Compactar é expulsar o ar e aproximar os grãos: o índice de vazios cai e o solo fica mais forte e menos compressível.' },
  { t: 'Outros solos, outros rolos', d: 'Areias e pedregulhos compactam melhor com vibração, que rearranja os grãos: é o rolo vibratório. O rolo liso serve ao acabamento e a solos granulares. A escolha do rolo depende do tipo de solo, da espessura da camada e da energia necessária.' },
  { t: 'Controle de campo', d: 'Cada camada é liberada só depois de ensaio no local: densidade (frasco de areia ou cilindro cravado) e umidade (estufa ou speedy). O grau de compactação, GC, é a densidade seca obtida dividida pela máxima do laboratório, e costuma ter mínimo de 95% a 100%. Se não passar, recompacta.' },
];
const F5_LABELS = [
  { k: 'lay1', t: 'Camada 1 · argila' }, { k: 'lay2', t: 'Camada 2 · areia' }, { k: 'lay3', t: 'Camada 3 · acabamento' }, { k: 'moto', t: 'Motoniveladora' }, { k: 'pipa', t: 'Caminhão-pipa' },
  { k: 'rolo', t: 'Rolo compactador' }, { k: 'ensaio', t: 'Ensaio de densidade' }, { k: 'painel', t: 'Curva de compactação' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] },
];
registerSpec('F5', {
  dz: REMOTE_DZ,
  steps: F5_STEPS, labels: F5_LABELS, nome: 'Compactação de solos', flat: true, hole: HOLE_F, geo: GEO_F, hide: 'f-terra', idle: 'Aterro em obra',
  panel: { pos: [-37, 3.3, -23.6], w: 7.2, h: 4.05 },
  T: { cones: [1, 4], dig: [-20, -19], haul: [-20, -19], trim: [-20, -19], comp0: [-20, -19], END: 98 },
  starts: [0, 18, 22, 36, 83],
  layers: [
    { id: 'lay1', y0: 0, h: 0.36, kind: 'gran', col: 0xb07a52, comp: 0x8a5a38, loose: 1.4, t0: 4, dur: 30, roll: 'pe', rollName: 'pé de carneiro', name: 'Argila siltosa', w0: 11, curve: { wo: 16, gm: 17.0, k: 0.04, Gs: 2.7 } },
    { id: 'lay2', y0: 0.36, h: 0.36, kind: 'gran', col: 0xdcc08a, comp: 0xbd9f68, loose: 1.3, t0: 36, dur: 24, roll: 'vib', rollName: 'vibratório', name: 'Areia', w0: 10, nowater: true, curve: { wo: 10, gm: 18.6, k: 0.03, Gs: 2.66 } },
    { id: 'lay3', y0: 0.72, h: 0.36, kind: 'gran', col: 0xc89462, comp: 0xa9754a, loose: 1.3, t0: 62, dur: 24, roll: 'liso', rollName: 'liso', name: 'Solo de acabamento', w0: 13, curve: { wo: 15, gm: 17.6, k: 0.035, Gs: 2.68 } },
  ],
  sprays: [], paint: [300, 301], conesOut: [200, 201], cars: 1e9,
});
export const createF5 = (e, s) => createRoad(e, s, 'F5');
export const F5 = { box: F_BOX };
export const F5_SPEC_STEPS = F5_STEPS;
export const F5_LABELS_EXPORT = F5_LABELS;
export const F5_STARTS = [0, 18, 22, 36, 83];
