import * as THREE from 'three';
import { ZONE_POS, PLOT, rng } from '../config.js';
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

  // prédios genéricos ao redor
  const B = [
    // A
    [-101.5, -8, 6, 5, 8], [-78, -8, 5, 5, 6],
    // D (vizinhos da escavação)
    [100, -50, 7, 7, 13], [100, -33, 7, 8, 9],
    // E
    [10, 14, 8, 8, 12], [24, 14, 9, 8, 16], [38, 14, 8, 8, 10], [10, 51, 8, 8, 14], [24, 52, 9, 7, 9], [36, 53, 7, 6, 12],
  ];
  for (const [x, z, w, d, h] of B) bld.add(x, H(x, z), z, w, h, d);
  root.add(bld.finish());
  // vizinhos da cava da Zona D que atrapalham a vista em corte: ficam num grupo que as obras D escondem
  const bldD = createBuildings(engine);
  for (const [x, z, w, d, h] of [[64, -51, 7, 7, 10], [64, -12, 7, 7, 9], [76, -52, 8, 6, 8], [89, -52, 8, 6, 11]]) bldD.add(x, H(x, z), z, w, h, d);
  const gnb = bldD.finish(); gnb.name = 'd-nb'; root.add(gnb);
  dn.onChange((g) => { bld.facadeMat.emissiveIntensity = g * 1.7; bldD.facadeMat.emissiveIntensity = g * 1.7; });

  // árvores
  const T = [];
  const pushT = (x, z) => T.push([x, z]);
  for (const [, [cx, cz]] of Object.entries(ZONE_POS)) {
    const hw = PLOT.w / 2 - 2.2, hd = PLOT.d / 2 - 2.2;
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
  hill(-48, -7, -57, -22, 10, 1.2);
  hill(6, 48, -57, -30, 36, 8);
  const trees = createTrees(T.filter(([x, z]) => {
    // evita estradas, fosso e o miolo das obras mais ocupadas
    if (x > 69 && x < 95 && z > -42 && z < -19) return false;
    return true;
  }));
  root.add(trees);

  // pessoas: pedestres no meio-fio + trabalhadores das vinhetas
  const walkers = [];
  for (const [, [cx, cz]] of Object.entries(ZONE_POS)) {
    const hw = PLOT.w / 2, hd = PLOT.d / 2;
    walkers.push({ x: cx - 18, z: cz + hd, x2: cx + 6, z2: cz + hd, kind: 'walk', y: 0.28 });
    walkers.push({ x: cx + 10, z: cz - hd, x2: cx - 12, z2: cz - hd, kind: 'walk', y: 0.28 });
    walkers.push({ x: cx + hw, z: cz - 8, x2: cx + hw, z2: cz + 14, kind: 'walk', y: 0.28 });
  }
  const crowd = createPeople(engine, [...walkers, ...people]);
  root.add(crowd);
  root.add(createTraffic(engine));
  return root;
}
