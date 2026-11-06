// Mundo: diorama retangular. x para a direita, z para o espectador, y para cima.
// O mundo vai de z = Z0 (fundo, área afastada) a z = Z1 (frente). A cidade fica em z > -70; o rio corre ao longo de x, atrás dela,
// e do outro lado fica a área afastada, com as zonas F e H (deslocadas de REMOTE_DZ em z em relação ao lugar original no código).
export const REMOTE_DZ = -94;
export const RIVER = { z0: -86, z1: -70, bed: -4.2, water: -1.3, bank: 3.5 };
export const BRIDGE = { x: 81, z0: -62, z1: -94, deck: 1.4 };
export const TUNNEL = { x: -90, zIn: -27, zOut: -122 };
export const WORLD = { w: 230, z0: -164, z1: 70, d: 234, bottom: -28 };
export const isRemote = (id) => id[0] === 'F' || id[0] === 'H';
export const PLOT = { w: 46, d: 52 };

// Centro de cada zona (bairro). Fundo: A F H D. Frente: B C E G.
export const ZONE_POS = {
  A: [-81, -32], F: [-27, -126], H: [27, -126], D: [81, -32],
  B: [-81, 32], C: [-27, 32], E: [27, 32], G: [81, 32],
};

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
export const EXTRA_LOTS = [[-27, -32], [27, -32]];

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
};
export const TOUR_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
