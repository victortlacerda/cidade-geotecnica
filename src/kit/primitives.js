import * as THREE from 'three';

const cache = new Map();
export function mat(hex, o = {}) {
  const k = hex + '|' + (o.r ?? '') + (o.e ?? '') + (o.t ? 't' : '');
  if (!cache.has(k)) {
    cache.set(k, new THREE.MeshStandardMaterial({
      color: hex, roughness: o.r ?? 0.85, metalness: 0,
      emissive: o.e ?? 0x000000, transparent: !!o.t, opacity: o.t ?? 1,
    }));
  }
  return cache.get(k);
}
function fin(m, x, y, z, shadow = true) {
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
export const box = (w, h, d, c, x = 0, y = 0, z = 0) => fin(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)), x, y, z);
export const cyl = (rt, rb, h, c, x = 0, y = 0, z = 0, seg = 14) => fin(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c)), x, y, z);
export const sph = (r, c, x = 0, y = 0, z = 0, seg = 12) => fin(new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg - 3), mat(c)), x, y, z);
export const cone = (r, h, c, x = 0, y = 0, z = 0, seg = 8) => fin(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(c)), x, y, z);
export function grp(...kids) { const g = new THREE.Group(); kids.forEach((k) => g.add(k)); return g; }
export function wheel(r, w, x, y, z) {
  const m = cyl(r, r, w, 0x2b2d31, x, y, z, 12);
  m.rotation.x = Math.PI / 2;
  return m;
}
// segmento de x0,z0 a x1,z1 (barra fina)
export function bar(x0, y0, z0, x1, y1, z1, t, c) {
  const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1);
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(t, len, t), mat(c));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
