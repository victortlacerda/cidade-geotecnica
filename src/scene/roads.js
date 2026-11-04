import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROADS, COL, ZONE_POS, PLOT, WORLD } from '../config.js';

function boxGeo(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

export function createRoads(engine) {
  const group = new THREE.Group();
  const asphalt = [], marks = [], curbs = [];
  const xs = ROADS.vx, zs = ROADS.hz;
  const wFor = (v, arr) => (v === arr[0] || v === arr[arr.length - 1] ? ROADS.outer : ROADS.inner);
  const zMin = -65, zMax = 65, xMin = -112, xMax = 112;
  for (const x of xs) {
    const w = wFor(x, xs);
    asphalt.push(boxGeo(w, 0.12, zMax - zMin, x, 0.06, 0));
    for (let z = zMin + 3; z < zMax - 2; z += 6) marks.push(boxGeo(0.25, 0.02, 3, x, 0.13, z));
  }
  for (const z of zs) {
    const w = wFor(z, zs);
    asphalt.push(boxGeo(xMax - xMin, 0.12, w, 0, 0.065, z));
    for (let x = xMin + 3; x < xMax - 2; x += 6) marks.push(boxGeo(3, 0.02, 0.25, x, 0.14, z));
  }
  // meio-fio ao redor de cada quadra
  for (const [zid, [cx, cz]] of Object.entries(ZONE_POS)) {
    const hw = PLOT.w / 2, hd = PLOT.d / 2, t = 1.2;
    curbs.push(boxGeo(PLOT.w + t, 0.28, t, cx, 0.14, cz + hd));
    curbs.push(boxGeo(PLOT.w + t, 0.28, t, cx, 0.14, cz - hd));
    curbs.push(boxGeo(t, 0.28, PLOT.d, cx + hw, 0.14, cz));
    curbs.push(boxGeo(t, 0.28, PLOT.d, cx - hw, 0.14, cz));
  }
  const a = new THREE.Mesh(mergeGeometries(asphalt), new THREE.MeshStandardMaterial({ color: COL.road, roughness: 0.95 }));
  const m = new THREE.Mesh(mergeGeometries(marks), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.9 }));
  const c = new THREE.Mesh(mergeGeometries(curbs), new THREE.MeshStandardMaterial({ color: COL.walk, roughness: 0.95 }));
  for (const o of [a, m, c]) { o.receiveShadow = true; group.add(o); }

  // postes de luz
  const lampPts = [];
  for (const x of xs) {
    const off = (wFor(x, xs) / 2) + 0.6;
    for (let z = -56; z <= 56; z += 14) if (Math.abs(z) > 5) { lampPts.push([x - off, z]); lampPts.push([x + off, z + 7]); }
  }
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
