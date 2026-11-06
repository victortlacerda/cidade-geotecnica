import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROADS, ROADS_REMOTE, LOTS, AVENUE_W, COL, ROAD_GAPS } from '../config.js';
import { withHoles } from './terrain.js';

// partes de um intervalo [a, b] fora dos trechos removidos de uma rua
function pieces(along, at, a, b, R) {
  let out = [[a, b]];
  if (R !== ROADS) return out;
  for (const g of ROAD_GAPS) if (g.along === along && g.at === at) out = out.flatMap(([p, q]) => (g.to <= p || g.from >= q ? [[p, q]] : [[p, g.from], [g.to, q]].filter(([u, v]) => v - u > 0.01)));
  return out;
}
const inGap = (along, at, v, R) => R === ROADS && ROAD_GAPS.some((g) => g.along === along && g.at === at && v > g.from && v < g.to);
function boxGeo(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

export function createRoads(engine) {
  const group = new THREE.Group();
  const asphalt = [], marks = [], curbs = [];
  const lampPts = [];
  for (const R of [ROADS, ROADS_REMOTE]) {
    const xs = R.vx, zs = R.hz;
    const wFor = (v, arr) => (R === ROADS && arr === xs && v === 0 ? AVENUE_W : v === arr[0] || v === arr[arr.length - 1] ? R.outer : R.inner);
    const zMin = R.zMin, zMax = R.zMax, xMin = -112, xMax = 112, zc = (zMin + zMax) / 2;
    for (const x of xs) {
      const w = wFor(x, xs);
      for (const [p, q] of pieces('z', x, zMin, zMax, R)) asphalt.push(boxGeo(w, 0.12, q - p, x, 0.06, (p + q) / 2));
      if (w >= 12) {
        // avenida: canteiro central e duas faixas tracejadas por sentido
        for (let z = zMin + 3; z < zMax - 2; z += 6) if (!zs.some((zz) => Math.abs(z - zz) < 6)) for (const dx of [-w / 4, w / 4]) marks.push(boxGeo(0.25, 0.02, 3, x + dx, 0.13, z));
        for (const [a, b] of [[zMin, zs[0] - 6], [zs[0] + 6, zs[1] - 6], [zs[1] + 6, zs[2] - 6], [zs[2] + 6, zMax]]) if (b > a) curbs.push(boxGeo(1.6, 0.3, b - a, x, 0.15, (a + b) / 2));
      } else for (let z = zMin + 3; z < zMax - 2; z += 6) if (!inGap('z', x, z, R)) marks.push(boxGeo(0.25, 0.02, 3, x, 0.13, z));
      const off = (w / 2) + 0.6;
      for (let z = zMin + 9; z <= zMax - 9; z += 14) if (!zs.some((zz) => Math.abs(z - zz) < 5) && !inGap('z', x, z, R)) { lampPts.push([x - off, z]); lampPts.push([x + off, z + 7]); }
    }
    for (const z of zs) {
      const w = wFor(z, zs);
      for (const [p, q] of pieces('x', z, xMin, xMax, R)) asphalt.push(boxGeo(q - p, 0.12, w, (p + q) / 2, 0.065, z));
      for (let x = xMin + 3; x < xMax - 2; x += 6) if (!inGap('x', z, x, R)) marks.push(boxGeo(3, 0.02, 0.25, x, 0.14, z));
    }
  }
  // meio-fio ao redor de cada quadra
  for (const r of LOTS) {
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, w = r.x1 - r.x0, d = r.z1 - r.z0, t = 1.2;
    curbs.push(boxGeo(w + t, 0.28, t, cx, 0.14, r.z1)); curbs.push(boxGeo(w + t, 0.28, t, cx, 0.14, r.z0));
    curbs.push(boxGeo(t, 0.28, d, r.x1, 0.14, cz)); curbs.push(boxGeo(t, 0.28, d, r.x0, 0.14, cz));
  }
  // as ruas respeitam os furos do terreno (obras de vias abertas na avenida)
  const a = new THREE.Mesh(mergeGeometries(asphalt), withHoles(new THREE.MeshStandardMaterial({ color: COL.road, roughness: 0.95 }), 'road-a'));
  const m = new THREE.Mesh(mergeGeometries(marks), withHoles(new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.9 }), 'road-m'));
  const c = new THREE.Mesh(mergeGeometries(curbs), withHoles(new THREE.MeshStandardMaterial({ color: COL.walk, roughness: 0.95 }), 'road-c'));
  for (const o of [a, m, c]) { o.receiveShadow = true; group.add(o); }

  // postes de luz
  const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 3.6, 6), new THREE.MeshStandardMaterial({ color: 0x4a4e55 }), lampPts.length);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffd88a, emissiveIntensity: 0 });
  const bulb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 8, 6), bulbMat, lampPts.length);
  const mtx = new THREE.Matrix4();
  lampPts.forEach(([x, z], i) => {
    mtx.makeTranslation(x, 1.8, z); post.setMatrixAt(i, mtx);
    mtx.makeTranslation(x, 3.8, z); bulb.setMatrixAt(i, mtx);
  });
  post.castShadow = true;
  group.add(post, bulb);
  return { group, bulbMat };
}
