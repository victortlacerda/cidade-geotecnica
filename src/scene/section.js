import * as THREE from 'three';
import { strataWallGeometry } from './terrain.js';
import { WORLD } from '../config.js';

// Vista em corte: abre um "entalhe" retangular no terreno (planos de recorte aplicados
// a todos os materiais da cidade) e fecha as bordas com paredes de camadas de solo.
// A parede de referência (face do corte) recebe um "furo" retangular para o túnel e o poço.
export function createSection(engine) {
  engine.renderer.localClippingEnabled = true;
  const planes = [
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1e6), // x > x0
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -1e6 - 1), // x < x1
    new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e6), // z > z0
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -1e6 - 1), // z < z1
  ];
  const root = new THREE.Group();
  root.visible = false;
  engine.scene.add(root);

  // uniformes do furo da face
  // faixas "escavadas" da face: (zMin, zMax, yMin, yMax); desligada quando yMax <= yMin
  const U = { uBand: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uBandX: { value: 0 } };   // uBandX = 1: face em z constante (faixas medidas em x)
  const faceMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
  faceMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nuniform vec4 uBand[6];\nuniform float uBandX;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        for (int bi = 0; bi < 6; bi++) {
          vec4 bd = uBand[bi];
          float bc = uBandX > 0.5 ? vWP.x : vWP.z;
          if (bd.w > bd.z && bc > bd.x && bc < bd.y && vWP.y > bd.z && vWP.y < bd.w) discard;
        }`);
  };
  const wallMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });

  let current = null, surf = null, faceMesh = null;

  function sample(ax, az, bx, bz, step = 1) {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / step));
    const out = [];
    for (let i = 0; i <= n; i++) out.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
    return out;
  }

  return {
    root, planes, faceMat,
    // Aplica o recorte a todos os materiais existentes (chamar depois de montar a cidade)
    apply(scene) {
      const seen = new Set();
      scene.traverse((o) => {
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of ms) {
          if (seen.has(m) || m === faceMat || m === wallMat || m.userData?.noClip) continue;
          seen.add(m);
          m.clippingPlanes = planes; m.clipIntersection = true; m.clipShadows = true;
          m.needsUpdate = true;
        }
      });
    },
    // box: {x0,x1,z0,z1}; def.face = 'x0' (parede com furo) ; def.tunnel e def.shaft opcionais
    open(box) {
      current = box;
      planes[0].constant = box.x0; planes[1].constant = -box.x1;
      planes[2].constant = box.z0; planes[3].constant = -box.z1;
      while (root.children.length) { const c = root.children.pop(); c.geometry?.dispose(); }
      const mk = (pts, mat, fn) => { const m = new THREE.Mesh(strataWallGeometry(pts, fn || undefined), mat); m.receiveShadow = true; m.castShadow = false; root.add(m); return m; };
      // a parede de referência (com furo) fica em x1; o recorte vai até a borda do mundo
      const xa = Math.max(box.x0, -WORLD.w / 2), xb = Math.min(box.x1, WORLD.w / 2);
      U.uBandX.value = box.face === 'z0' ? 1 : 0;
      if (box.face === 'z0') {
        // face em z = z0 (obras giradas, como a Zona E na avenida); o recorte vai de z0 até a frente do mundo
        const za = box.z0, zb = Math.min(box.z1, WORLD.z1);
        faceMesh = mk(sample(box.x0, za, box.x1, za, 0.25), faceMat, surf);
        mk(sample(box.x0, za, box.x0, zb), wallMat);
        mk(sample(box.x1, za, box.x1, zb), wallMat);
      } else {
        faceMesh = mk(sample(box.x1, box.z0, box.x1, box.z1, 0.25), faceMat, surf);
        mk(sample(xa, box.z0, xb, box.z0), wallMat);
        mk(sample(xa, box.z1, xb, box.z1), wallMat);
      }
      root.visible = true;
    },
    // altura da superfície usada na parede da face (obras com terreno que muda); null = terreno final
    setSurface(fn) { surf = fn; },
    rebuildFace() {
      if (!current || !faceMesh) return;
      faceMesh.geometry.dispose();
      faceMesh.geometry = current.face === 'z0' ? strataWallGeometry(sample(current.x0, current.z0, current.x1, current.z0, 0.25), surf || undefined) : strataWallGeometry(sample(current.x1, current.z0, current.x1, current.z1, 0.25), surf || undefined);
    },
    close() {
      surf = null;
      current = null;
      planes[0].constant = 1e6; planes[1].constant = -1e6 - 1; planes[2].constant = 1e6; planes[3].constant = -1e6 - 1;
      root.visible = false;
      U.uBand.value.forEach((v) => v.set(0, 0, 0, 0));
    },
    setBand(i, zMin, zMax, yMin, yMax) { U.uBand.value[i].set(zMin, zMax, yMin, yMax); },
    clearBands() { U.uBand.value.forEach((v) => v.set(0, 0, 0, 0)); },
    get active() { return !!current; },
  };
}
