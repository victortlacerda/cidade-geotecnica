import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COL } from '../config.js';

// textura de fachada: albedo + emissiva (janelas acesas à noite)
function facadeTextures() {
  const S = 64, N = 4;
  const a = document.createElement('canvas'), e = document.createElement('canvas');
  a.width = a.height = e.width = e.height = S * N;
  const ca = a.getContext('2d'), ce = e.getContext('2d');
  ca.fillStyle = '#f3efe7'; ca.fillRect(0, 0, S * N, S * N);
  ce.fillStyle = '#000'; ce.fillRect(0, 0, S * N, S * N);
  let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i * S + 12, y = j * S + 14, w = S - 24, h = S - 30;
    ca.fillStyle = '#9ec3da'; ca.fillRect(x, y, w, h);
    ca.fillStyle = 'rgba(255,255,255,.35)'; ca.fillRect(x, y, w, 4);
    if (r() < 0.55) { ce.fillStyle = r() < 0.5 ? '#ffd58a' : '#fff0c4'; ce.fillRect(x, y, w, h); }
  }
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: mk(a, true), emi: mk(e, true) };
}

// caixa com UVs proporcionais ao tamanho (janelas com tamanho constante)
function facadeBox(w, h, d, x, y, z, tint) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  const floorH = 3.1, winW = 3.4;
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * (sizes[f][0] / winW / 4), uv.getY(i) * (sizes[f][1] / floorH / 4));
    }
  }
  // remover tampa/base da textura de fachada: usaremos telhado separado
  g.translate(x, y + h / 2, z);
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  const c = new THREE.Color(tint);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function roofSlab(w, d, y, x, z, tint) {
  const g = new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5);
  g.translate(x, y + 0.17, z);
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  const c = new THREE.Color(tint);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export function createBuildings(engine) {
  const tex = facadeTextures();
  const facadeMat = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emi, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.9, vertexColors: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true });
  const wallGeos = [], roofGeos = [];
  const tints = [0xf6f2ea, 0xeee9df, 0xf0ebe2, 0xe9e4da, 0xf8f5ee];
  let k = 0;
  return {
    facadeMat,
    add(x, y, z, w, h, d) {
      const tint = tints[k++ % tints.length];
      wallGeos.push(facadeBox(w, h, d, x, y, z, tint));
      roofGeos.push(roofSlab(w, d, y + h, x, z, 0xd8d3c8));
      if (h > 9) roofGeos.push(roofSlab(w * 0.35, d * 0.35, y + h + 0.35, x + w * 0.15, z - d * 0.1, 0xc9c4b9));
    },
    // casa com telhado de duas águas
    addHouse(x, y, z, w, d, rot = 0, roofColor = 0xc4684a) {
      const h = 3.6;
      const walls = facadeBox(w, h, d, 0, 0, 0, 0xf6f1e6);
      const roof = new THREE.BufferGeometry();
      // telhado: prisma triangular
      const hw = w / 2 + 0.4, hd = d / 2 + 0.4, rh = 2.2;
      const P = [[-hw, h, -hd], [hw, h, -hd], [hw, h, hd], [-hw, h, hd], [-hw, h + rh, 0], [hw, h + rh, 0]];
      const tri = [[0, 4, 3], [1, 2, 5], [0, 1, 5, 4], [3, 4, 5, 2]];
      const pos = [];
      const push = (a, b, c) => { for (const i of [a, b, c]) pos.push(...P[i]); };
      push(0, 3, 4); push(1, 5, 2);
      push(0, 4, 5); push(0, 5, 1);
      push(3, 2, 5); push(3, 5, 4);
      roof.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const c = new THREE.Color(roofColor), colArr = [];
      for (let i = 0; i < pos.length / 3; i++) colArr.push(c.r, c.g, c.b);
      roof.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
      roof.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
      roof.computeVertexNormals();
      const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z);
      walls.applyMatrix4(m); roof.applyMatrix4(m);
      wallGeos.push(walls); roofGeos.push(roof);
    },
    finish() {
      const group = new THREE.Group();
      if (wallGeos.length) {
        const w = new THREE.Mesh(mergeGeometries(wallGeos.map((g) => g.index ? g.toNonIndexed() : g)), facadeMat);
        w.castShadow = w.receiveShadow = true; group.add(w);
        const r = new THREE.Mesh(mergeGeometries(roofGeos.map((g) => g.index ? g.toNonIndexed() : g)), roofMat);
        r.castShadow = r.receiveShadow = true; group.add(r);
      }
      return group;
    },
  };
}
