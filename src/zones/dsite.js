import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { colorOf } from '../scene/terrain.js';
import { mat, noclip, ease, clamp01, win, person } from './fund.js';

// ---------------------------------------------------------------------------
// Canteiro comum das obras de contenção da Zona D (D1, D5, ...): seção em x = X1
// pelo meio da cava, prédio vizinho ao norte (corte tipo casa de boneca), rua e
// calçada ao sul, solo em camadas nas paredes da cava e guindaste com caçamba.
// ---------------------------------------------------------------------------
export const X1 = 81, PZ = -30;
export const SITE_BOX = { x0: -120, x1: X1, z0: -52, z1: -8 };

export const vplane = (w, m) => { const g = new THREE.PlaneGeometry(w, 1); g.rotateY(-Math.PI / 2); g.translate(0, 0.5, 0); return new THREE.Mesh(g, m); };
export const bx = (sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; return o; };
export const baseBox = (sx, sy, sz, m) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(0, sy / 2, 0); const o = new THREE.Mesh(g, m); o.castShadow = true; return o; };
export const bar = (a, b, th, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(th, th, a.distanceTo(b)), m); o.position.copy(a).add(b).multiplyScalar(0.5); o.lookAt(b); o.castShadow = true; return o; };

// material de solo em camadas que só aparece acima de -uD.value (parede da cava que "cresce" com a escavação)
export function depthMat(U) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uD = U;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWD;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWD = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWD;\nuniform float uD;').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vWD.y < -uD) discard;');
  };
  m.customProgramCacheKey = () => 'dsite-depth';
  return m;
}
// retângulo vertical (de (xa,za) a (xb,zb)), de y0 a y1, com cores das camadas do solo
export function strataQuad(xa, za, xb, zb, y0, y1, step = 0.1) {
  const n = Math.max(2, Math.round((y1 - y0) / step)), pos = [], col = [], idx = [], c = new THREE.Color();
  for (let i = 0; i <= n; i++) {
    const y = y1 - ((y1 - y0) * i) / n;
    colorOf((xa + xb) / 2, Math.min(y, -0.3), (za + zb) / 2, c);
    pos.push(xa, y, za, xb, y, zb); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const tmpC = new THREE.Color();
export const soilColorAt = (y, out = tmpC) => colorOf(X1 + 6, Math.min(y, -0.3), PZ, out);

// ---------------------------------------------------------------------------
// Entorno: prédio ao norte (z -52…-40,5), rua ao sul, carros, cones.
// ---------------------------------------------------------------------------
export const NB = { x0: X1, x1: X1 + 12, z0: -52, z1: -40.5, fl: 3.1, n: 4 };
export function buildSurroundings(root, opts = {}) {
  const conc = noclip(0xc9c5ba, { r: 1, e: 0x25231f });
  const concB = mat(0xbdb8ac, { r: 1 });
  const wallM = mat(0xefe9dd, { r: 0.95 });
  const glass = mat(0x9ec3da, { r: 0.3, e: 0x20323f });
  const sap = noclip(0xd2cec2, { r: 1, e: 0x2e2c28 });
  const g = new THREE.Group(); root.add(g);
  const W = NB.x1 - NB.x0, Dz = NB.z1 - NB.z0, zc = (NB.z0 + NB.z1) / 2, H = NB.fl * NB.n;
  const bld = new THREE.Group(); g.add(bld); if (opts.building === false) bld.visible = false;
  // lajes (corpo 3D + borda de seção)
  for (let k = 0; k <= NB.n; k++) {
    const y = k * NB.fl;
    const s = baseBox(W, 0.28, Dz, concB); s.position.set(NB.x0 + W / 2, y, zc); bld.add(s);
    const c = vplane(Dz, conc); c.scale.y = 0.28; c.position.set(X1 - 0.012, y, zc); c.renderOrder = 3; bld.add(c);
  }
  // pilares na seção
  for (const z of [NB.z0 + 0.4, NB.z1 - 0.4, (NB.z0 + NB.z1) / 2]) {
    const c = vplane(0.45, conc); c.scale.y = H; c.position.set(X1 - 0.02, 0, z); c.renderOrder = 3; bld.add(c);
    const p = baseBox(0.45, H, 0.45, concB); p.position.set(X1 + 0.3, 0, z); bld.add(p);
  }
  // paredes: leste, norte e sul (a face oeste fica aberta pelo corte)
  const wE = baseBox(0.3, H, Dz, wallM); wE.position.set(NB.x1, 0, zc); bld.add(wE);
  const wN = baseBox(W, H, 0.3, wallM); wN.position.set(NB.x0 + W / 2, 0, NB.z0 + 0.15); bld.add(wN);
  const wS = baseBox(W, H, 0.3, wallM); wS.position.set(NB.x0 + W / 2, 0, NB.z1 - 0.15); bld.add(wS);
  // janelas na parede sul (voltada para a cava) e interior simplificado
  for (let k = 0; k < NB.n; k++) for (let i = 0; i < 3; i++) bld.add(bx(2.2, 1.4, 0.06, glass, NB.x0 + 2.4 + i * 3.6, k * NB.fl + 1.2, NB.z1 + 0.0));
  // sapata corrida sob a parede sul
  const sz = [NB.z1 - 2.0, NB.z1 + 0.2];
  const sc = vplane(sz[1] - sz[0], sap); sc.scale.y = 0.6; sc.position.set(X1 - 0.014, -1.5, (sz[0] + sz[1]) / 2); sc.renderOrder = 3; bld.add(sc);
  const sb = baseBox(W, 0.6, sz[1] - sz[0], concB); sb.position.set(NB.x0 + W / 2, -1.5, (sz[0] + sz[1]) / 2); bld.add(sb);
  const str = new THREE.Group(); g.add(str); if (opts.street === false) str.visible = false;
  // rua e calçada ao sul
  const road = baseBox(34, 0.05, 6, mat(0x4b4e54, { r: 0.95 })); road.position.set(X1 + 17, 0, -11.5); road.receiveShadow = true; str.add(road);
  const walk = baseBox(34, 0.07, 3, mat(0xcfcac0, { r: 1 })); walk.position.set(X1 + 17, 0, -16); walk.receiveShadow = true; str.add(walk);
  for (let x = 1; x < 33; x += 4) str.add(baseBox(2, 0.06, 0.18, mat(0xf2efe6)).translateX(X1 + x).translateY(0.01).translateZ(-11.5));
  // carros (andam no sentido da seção; somem ao chegar nela)
  const cars = [];
  const mkCar = (col) => { const c = new THREE.Group(); c.add(bx(3.4, 0.7, 1.6, mat(col, { r: 0.4, m: 0.2 }), 0, 0.6, 0), bx(1.8, 0.6, 1.4, glass, -0.2, 1.2, 0)); for (const x of [-1.1, 1.1]) for (const z of [-0.8, 0.8]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 10), mat(0x222428)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.33, z); c.add(w); } return c; };
  [[0xd84a3a, 0, -10.2, 7], [0x3a79c4, 14, -12.8, 5.5], [0xe9c43a, 26, -10.2, 6.2]].forEach(([col, x0, z, sp]) => { const c = mkCar(col); c.rotation.y = Math.PI; str.add(c); cars.push({ c, x0, z, sp }); });
  const cones = new THREE.InstancedMesh(new THREE.ConeGeometry(0.3, 0.8, 8), mat(0xf26b1d), 8); const m4 = new THREE.Matrix4();
  for (let i = 0; i < 8; i++) { m4.makeTranslation(X1 + 2.5 + i * 4, 0.4, -14.6); cones.setMatrixAt(i, m4); } str.add(cones);
  function update(tAbs) {
    for (const { c, x0, z, sp } of cars) {
      const L = 30, u = ((x0 + tAbs * sp) % L + L) % L, x = X1 + 32 - u;
      c.visible = x > X1 + 2.4; c.position.set(x, 0.05, z);
    }
  }
  return { group: g, update };
}

// ---------------------------------------------------------------------------
// Guindaste com caçamba (retirada do solo da cava) — lança giratória
// ---------------------------------------------------------------------------
export function buildCraneBucket(root, opts) {
  const { bx0 = X1 + 6.2, bz0 = -19.6, pit = [X1 + 6.2, PZ], dump = [X1 + 12.5, -16.3], jibY = 13 } = opts || {};
  const Y = mat(0xf2b705, { r: 0.6 }), D = mat(0x3a3d42, { r: 0.6 }), steel = mat(0x8a8e95, { r: 0.5, m: 0.4 });
  const g = new THREE.Group(); g.position.set(bx0, 0, bz0); g.visible = false; root.add(g);
  g.add(bx(2.6, 0.5, 2.6, D, 0, 0.25, 0));
  const mast = bx(0.9, jibY, 0.9, Y, 0, jibY / 2, 0); g.add(mast);
  for (let y = 1; y < jibY; y += 1.6) g.add(bx(1.1, 0.12, 1.1, D, 0, y, 0));
  const slew = new THREE.Group(); slew.position.y = jibY; g.add(slew);
  slew.add(bx(15, 0.5, 0.7, Y, 7, 0.4, 0), bx(5, 0.5, 0.7, Y, -2.5, 0.4, 0), bx(1.8, 1.4, 1.2, steel, -4.2, 0.2, 0), bx(1.6, 1.3, 1.5, mat(0x9fc4d8, { r: 0.3 }), 0.2, 0.9, 0.9), bx(0.4, 2.4, 0.4, Y, 0.5, 1.7, 0));
  slew.add(bar(new THREE.Vector3(0.5, 2.8, 0), new THREE.Vector3(14, 0.7, 0), 0.1, D), bar(new THREE.Vector3(0.5, 2.8, 0), new THREE.Vector3(-4.5, 0.7, 0), 0.1, D));
  const trolley = new THREE.Group(); slew.add(trolley); trolley.add(bx(0.8, 0.35, 0.8, D, 0, 0, 0));
  const line = bx(0.06, 1, 0.06, D, 0, 0, 0); g.add(line);
  const bucket = new THREE.Group(); g.add(bucket);
  const bodyM = mat(0xd9532f, { r: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.55, 1.2, 12), bodyM); body.position.y = -0.6; body.castShadow = true;
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 12), mat(0x7a5a3a, { r: 1 })); fill.position.y = -0.2;
  const tilt = new THREE.Group(); tilt.add(body, fill); bucket.add(tilt);
  const frame = bar(new THREE.Vector3(-0.8, 0, 0), new THREE.Vector3(0.8, 0, 0), 0.08, D); bucket.add(frame);
  // posição do gancho (mundo) ao longo do ciclo: [x, y, z] e estado
  const rad = (x, z) => ({ r: Math.hypot(x - bx0, z - bz0), th: Math.atan2(-(z - bz0), x - bx0) });
  function setHook(x, y, z, fl, tl) {
    const { r, th } = rad(x, z);
    slew.rotation.y = th; trolley.position.x = r;
    const wy = jibY - 0.3 - 0.0; // altura da linha no topo
    line.position.set(x - bx0, (wy + y) / 2, z - bz0); line.scale.y = Math.max(0.01, wy - y);
    bucket.position.set(x - bx0, y, z - bz0);
    fill.visible = fl > 0.03; fill.scale.set(1, Math.max(0.01, fl), 1); fill.position.y = -1.1 + 0.55 * fl;
    tilt.rotation.z = tl; tilt.position.y = 0; tilt.position.x = 0;
  }
  // ciclo (duração Tc): sobe vazio -> desce -> enche -> sobe -> gira -> despeja -> volta
  const Tc = 11;
  function cycle(u, floorY) {
    const topY = 9.5, dumpY = 4.4, fy = floorY + 1.3;
    const P = pit, Dm = dump;
    // [u, ponto, y, enchimento, inclinação]
    const K = [
      [0, Dm, dumpY, 0, 0], [0.14, P, topY, 0, 0], [0.36, P, fy, 0, 0], [0.5, P, fy, 1, 0], [0.7, P, topY, 1, 0],
      [0.84, Dm, dumpY, 1, 0], [0.88, Dm, dumpY, 1, 1.9], [0.93, Dm, dumpY, 0, 1.9], [1, Dm, dumpY, 0, 0],
    ];
    let i = 0; while (i < K.length - 2 && u > K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], s = ease((u - a[0]) / (b[0] - a[0]));
    const L = (p, q) => p + (q - p) * s;
    return { x: L(a[1][0], b[1][0]), z: L(a[1][1], b[1][1]), y: L(a[2], b[2]), fl: L(a[3], b[3]), tl: L(a[4], b[4]), dumping: u > 0.88 && u < 0.93 };
  }
  return { group: g, setHook, cycle, Tc, jibY };
}
