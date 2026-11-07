// Mundo: diorama retangular. x para a direita, z para o espectador, y para cima.
// O mundo vai de z = Z0 (fundo, área afastada) a z = Z1 (frente). A cidade fica em z > -70; o rio corre ao longo de x, atrás dela,
// e do outro lado fica a área afastada, com as zonas F e H (deslocadas de REMOTE_DZ em z em relação ao lugar original no código).
export const REMOTE_DZ = -94;
export const RIVER = { z0: -86, z1: -70, bed: -4.2, water: -1.3, bank: 3.5 };
export const BRIDGE = { x: 81, z0: -62, z1: -94, deck: 1.4 };
// pilares da ponte (Zona J, obra J1): duas linhas no rio; em cada uma, duas estacas escavadas com camisa metálica (x = 81 ± 2,7),
// bloco de coroamento no nível d'água, pilar curto, vigas e laje. Cotas em metros (o nível do rio é -1,3; o leito, -4,2).
export const PIERS = { lines: [-74.8, -81.2], dx: 2.7, r: 0.6, casingTip: -11.0, toe: -19.5, capB: -2.2, capT: -1.0, colT: 0.0, beamT: 0.6 };
// ensecadeira no rio, ao lado da ponte (Zona J): recinto de estacas-prancha com o bloco de um novo pilar
export const COFFER = { x0: 90, x1: 100, z0: -81, z1: -75 };
export const TUNNEL = { x: -90, zIn: -27, zOut: -122 };
export const WORLD = { w: 230, z0: -164, z1: 70, d: 234, bottom: -28 };
export const isRemote = (id) => id[0] === 'F' || id[0] === 'H';
// Zona E na avenida central (x = 0): as obras de vias foram modeladas ao longo de x, no antigo lote de E; giram 90° e
// deslocam para correr ao longo da avenida, entre C e D. O corte passa a ser um plano z = constante.
export const AVENUE_W = 16;
export const E_XF = { rot: Math.PI / 2, ox: -32, oz: 0 };
export const xfPt = (xf, x, z) => { const c = Math.cos(xf.rot), s = Math.sin(xf.rot); return [x * c + z * s + xf.ox, -x * s + z * c + xf.oz]; };
export const xfRect = (xf, x0, x1, z0, z1) => { const P = [xfPt(xf, x0, z0), xfPt(xf, x1, z0), xfPt(xf, x0, z1), xfPt(xf, x1, z1)]; return [Math.min(...P.map((p) => p[0])), Math.max(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[1]))]; };
// lotes (quadras) como retângulos: os vizinhos da avenida central ficam mais estreitos
const lot = (cx, cz) => ({ x0: cx - 23 + (cx === 27 ? AVENUE_W / 2 - 4 : 0), x1: cx + 23 - (cx === -27 ? AVENUE_W / 2 - 4 : 0), z0: cz - 26, z1: cz + 26 });
const L = (cx, cz) => lot(cx, cz), U = (a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), z0: Math.min(a.z0, b.z0), z1: Math.max(a.z1, b.z1) });
// Quadras juntadas: C deitada na frente (antigo lote de C + antigo lote de E), D dupla no fundo; A cresce para a direita
// até x = -31 e o resto do antigo lote de trás da C vira uma faixa da Zona E, colada à avenida.
const taken = [[-81, -32], [-27, -32], [-27, 32], [27, 32], [27, -32], [81, -32]];
const A_LOT = { x0: -104, x1: -31, z0: -58, z1: -6 }, E_LOT = { x0: -29, x1: -AVENUE_W / 2, z0: -58, z1: -6 };
export const LOTS = [
  ...[-81, -27, 27, 81].flatMap((x) => [-32, 32, -126].map((z) => [x, z])).filter(([x, z]) => !taken.some(([a, b]) => a === x && b === z)).map(([x, z]) => lot(x, z)),
  U(lot(-27, 32), lot(27, 32)), U(lot(27, -32), lot(81, -32)), A_LOT, E_LOT,
];
// trechos de rua removidos: { eixo da rua, posição, intervalo }
export const ROAD_GAPS = [
  { along: 'z', at: 0, from: 4, to: 59 },        // metade da frente da avenida central: termina em T na rua do meio
  { along: 'z', at: -54, from: -59, to: -4 },    // rua entre a A e a sua parte nova
  { along: 'z', at: 54, from: -59, to: -4 },     // rua entre as duas metades da D
];
// laços de trânsito das quadras juntadas (substituem os laços das quadras originais)
export const LOOP_MERGE = [{ x0: -109, x1: 0, z0: -62, z1: 0 }, { x0: -54, x1: 54, z0: 0, z1: 62 }, { x0: 0, x1: 109, z0: -62, z1: 0 }];
// área de cada zona (para destaque, clique e câmera); C e D ocupam dois lotes; E é o trecho de trás da avenida mais a faixa ao lado
export const ZONE_RECT = {
  A: A_LOT, B: L(-81, 32), C: U(L(-27, 32), L(27, 32)), D: U(L(27, -32), L(81, -32)),
  E: { x0: E_LOT.x0, x1: AVENUE_W / 2, z0: -58, z1: -6 }, G: L(81, 32),
  F: L(-27, -126), H: L(27, -126), I: L(-81, -126),
  J: { x0: 58, x1: 104, z0: -152, z1: -62 },   // ponte, trecho do rio com a ensecadeira e o lote da margem de lá
};
export const PLOT = { w: 46, d: 52 };



export const ROADS = {
  vx: [-109, -54, 0, 54, 109],
  hz: [-62, 0, 62],
  inner: 8,
  outer: 6,
  zMin: -65, zMax: 65,
};
// malha de ruas da área afastada (do outro lado do rio)
export const ROADS_REMOTE = { vx: [-109, -54, 0, 54, 109], hz: [-94, -156], inner: 8, outer: 6, zMin: -159, zMax: -91 };
// quadras sem zona: os antigos lotes de F e H na cidade (agora quarteirões) e os cantos da área afastada (mata)
export const EXTRA_LOTS = [];

export const COL = {
  clay: 0xe9e3d6,
  grass: 0xb4c79d,
  road: 0x7b7f86,
  walk: 0xdcd6c9,
  white: 0xf1ede5,
  yellow: 0xf2b705,
  orange: 0xe8742c,
  dark: 0x3a3e45,
  glass: 0x86b8d8,
  concrete: 0xbab6ad,
  water: 0x6fb3d9,
};

// camadas do solo (cores usadas no corte lateral do diorama)
export const STRATA = [
  { nome: 'Solo superficial', cor: 0x9c7b56 },
  { nome: 'Argila', cor: 0xc9714a },
  { nome: 'Areia', cor: 0xe6c477 },
  { nome: 'Nível d\'água', cor: 0x5aa8d8 },
  { nome: 'Areia saturada', cor: 0xd9b366 },
  { nome: 'Silte', cor: 0xb59fa8 },
  { nome: 'Rocha alterada', cor: 0x8f9ba7 },
  { nome: 'Rocha sã', cor: 0x5f6b78 },
];

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ZONE_INFO = {
  A: { curta: 'Escavar sob a cidade e dentro da encosta: tuneladora (TBM), método NATM e o emboque do portal.' },
  B: { curta: 'Sapatas e radier: fundações rasas que apoiam a construção direto no solo, comuns em casas.' },
  C: { curta: 'Estacas, tubulões e blocos: levam a carga do prédio até camadas profundas e resistentes.' },
  D: { curta: 'Cortinas, paredes e muros que seguram o solo ao lado de escavações profundas na cidade.' },
  E: { curta: 'Do subleito ao revestimento: as camadas que fazem uma rua ou estrada durar.' },
  F: { curta: 'Cortes, aterros, compactação e taludes: o solo como material de construção e como risco.' },
  G: { curta: 'Sondagens, ensaios de campo e laboratório que dizem o que existe debaixo da obra.' },
  H: { curta: 'Barragens e pilhas de rejeito: grandes maciços de terra, água e segurança.' },
  I: { curta: 'Geotecnia ambiental: aterro sanitário, proteção do solo e da água subterrânea e áreas contaminadas.' },
  J: { curta: 'Pontes e obras dentro d\'água: a fundação dos pilares no leito do rio e as ensecadeiras que permitem trabalhar a seco.' },
};
export const TOUR_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
export const ZONE_LIST = [...TOUR_ORDER, 'J'];
// ponto de referência (rótulo e câmera) de cada zona: centro da área
export const ZONE_POS = Object.fromEntries(Object.entries(ZONE_RECT).map(([k, r]) => [k, [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2]]));
