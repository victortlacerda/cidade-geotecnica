import * as THREE from 'three';
import { LOTS, rng, REMOTE_DZ, RIVER } from '../config.js';
import { buildRiver } from './river.js';
import { H } from '../scene/terrain.js';
import { createBuildings } from '../kit/buildings.js';
import { buildZones } from './vignettes.js';
import { createTraffic, createPeople, createTrees } from '../life/life.js';

export function buildCity(engine, dn) {
  const root = new THREE.Group();
  const bld = createBuildings(engine);
  const people = [], keep = [];
  const R = rng(99);
  const ctx = {
    add: (o) => root.add(o), upd: (f) => engine.onUpdate(f), bld, people, keep,
  };
  buildZones(ctx);
  buildRiver(ctx);

  // prédios genéricos ao redor
  const B = [
    // A
    [-101.5, -8, 6, 5, 8], [-78, -8, 5, 5, 6],
    // D (vizinhos da escavação)
    [100, -50, 7, 7, 13], [100, -33, 7, 8, 9],
    // E
    // antigo lote de E (a zona foi para a avenida central): quarteirão de prédios
    [13, 14, 8, 8, 12], [26, 14, 9, 8, 16], [39, 14, 8, 8, 10], [13, 51, 8, 8, 14], [26, 52, 9, 7, 9], [38, 53, 7, 6, 12],
    [13, 29, 7, 8, 18], [13, 40, 7, 7, 9], [45, 30, 7, 9, 21], [45, 42, 7, 7, 11],
  ];
  for (const [x, z, w, d, h] of B) bld.add(x, H(x, z), z, w, h, d);
  root.add(bld.finish());
  // vizinhos da cava da Zona D que atrapalham a vista em corte: ficam num grupo que as obras D escondem
  const bldD = createBuildings(engine);
  for (const [x, z, w, d, h] of [[64, -51, 7, 7, 10], [64, -12, 7, 7, 9], [76, -52, 8, 6, 8], [89, -52, 8, 6, 11]]) bldD.add(x, H(x, z), z, w, h, d);
  const gnb = bldD.finish(); gnb.name = 'd-nb'; root.add(gnb);
  dn.onChange((g) => { bld.facadeMat.emissiveIntensity = g * 1.7; bldD.facadeMat.emissiveIntensity = g * 1.7; if (ctx.bridgeLamp) ctx.bridgeLamp.emissiveIntensity = g * 1.6; });

  // árvores
  const T = [];
  const pushT = (x, z) => T.push([x, z]);
  for (const r of LOTS) {
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, hw = (r.x1 - r.x0) / 2 - 2.2, hd = (r.z1 - r.z0) / 2 - 2.2;
    for (let x = -hw; x <= hw; x += 9.5) { pushT(cx + x + R() * 2, cz + hd + (R() - 0.5)); pushT(cx + x + R() * 2, cz - hd + (R() - 0.5)); }
    for (let z = -hd + 6; z <= hd - 6; z += 11) { pushT(cx + hw + (R() - 0.5), cz + z); pushT(cx - hw + (R() - 0.5), cz + z); }
  }
  const hill = (x0, x1, z0, z1, n, minH, ok = () => true) => {
    for (let i = 0, tries = 0; i < n && tries < 4000; tries++) {
      const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0), h = H(x, z);
      if (h > minH && ok(x, z, h)) { pushT(x, z); i++; }
    }
  };
  hill(-103, -77, -57, -24, 40, 1.5, (x, z) => !(Math.abs(x + 90) < 14 && z > -34.5));
  hill(-48, -7, -57 + REMOTE_DZ, -22 + REMOTE_DZ, 10, 1.2);
  hill(6, 48, -57 + REMOTE_DZ, -30 + REMOTE_DZ, 36, 8);
  // pracinha no meio do antigo lote de E
  for (let x = 0; x < 3; x++) for (let z = 0; z < 2; z++) pushT(23 + x * 6 + R() * 1.5, 31 + z * 7 + R() * 1.5);
  // mata nos cantos da área afastada e nas margens do rio
  const flat = () => true;
  // canto esquerdo: saída do túnel e aterro sanitário (Zona I) — mata só fora do aterro
  hill(-105, -60, -150, -98, 26, -0.5, (x, z) => !(Math.abs(x + 90) < 6 && z < -110) && !(Math.abs(x + 90) < 9 && z > -124 && z < -118) && !(x > -87 && z < -117));
  // canto direito: área reservada (Zona J), na chegada da ponte
  hill(60, 106, -150, -98, 30, -0.5, (x, z) => Math.abs(x - 81) > 7 || z < -104);
  for (let x = -108; x <= 108; x += 7) { if (Math.abs(x - 81) > 8 && Math.abs(x + 86) > 6) { pushT(x + R() * 2, RIVER.z1 + 2.6 + R()); pushT(x + R() * 2, RIVER.z0 - 2.6 - R()); } }
  void flat;
  const trees = createTrees(T.filter(([x, z]) => {
    // evita estradas, fosso e o miolo das obras mais ocupadas
    if (x > 69 && x < 95 && z > -42 && z < -19) return false;
    return true;
  }));
  root.add(trees);

  // pessoas: pedestres no meio-fio + trabalhadores das vinhetas
  const walkers = [];
  for (const r of LOTS) {
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, hw = (r.x1 - r.x0) / 2, hd = (r.z1 - r.z0) / 2;
    walkers.push({ x: cx - 18, z: cz + hd, x2: cx + 6, z2: cz + hd, kind: 'walk', y: 0.28 });
    walkers.push({ x: cx + 10, z: cz - hd, x2: cx - 12, z2: cz - hd, kind: 'walk', y: 0.28 });
    walkers.push({ x: cx + hw, z: cz - 8, x2: cx + hw, z2: cz + 14, kind: 'walk', y: 0.28 });
  }
  const crowd = createPeople(engine, [...walkers, ...people]);
  root.add(crowd);
  root.add(createTraffic(engine));
  return root;
}
