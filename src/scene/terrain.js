import * as THREE from 'three';
import { WORLD, STRATA, COL, REMOTE_DZ, RIVER, TUNNEL } from '../config.js';

export const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const bump = (x, z, cx, cz, rx, rz, H) => {
  const dx = (x - cx) / rx, dz = (z - cz) / rz;
  const t = 1 - (dx * dx + dz * dz);
  return t <= 0 ? 0 : H * t * t * (3 - 2 * t);
};
const terrace = (h, s) => {
  const u = h / s, f = Math.floor(u);
  return s * (f + sstep(0.78, 1, u - f));
};

// Emboque (A5): corte em bancadas na frente da colina, onde fica o portal do NATM.
// Perfil (s = distância ao norte do portal, y = altura): face 1, berma, face 2, berma, face 3.
export const PORTAL = {
  x: -90, zp: -27, hw: 8.5, lat: 1.0, slopeTop: 9,
  prof: [[0, 0], [1.4, 9.4], [3.6, 9.4], [4.3, 14.0], [6.3, 14.0]],
};
export function portalProfile(s) {
  const P = PORTAL.prof;
  if (s <= 0) return 0;
  for (let i = 0; i < P.length - 1; i++) {
    if (s <= P[i + 1][0]) return P[i][1] + (P[i + 1][1] - P[i][1]) * (s - P[i][0]) / (P[i + 1][0] - P[i][0]);
  }
  const L = P[P.length - 1];
  return L[1] + PORTAL.slopeTop * (s - L[0]);
}
// distância s (ao norte do portal) em que a face atinge a altura y (lado sul da berma)
export function portalFaceS(y) {
  const P = PORTAL.prof;
  if (y <= 0) return 0;
  for (let i = 0; i < P.length - 1; i++) {
    if (P[i + 1][1] > P[i][1] && y <= P[i + 1][1]) return P[i][0] + (P[i + 1][0] - P[i][0]) * (y - P[i][1]) / (P[i + 1][1] - P[i][1]);
  }
  const L = P[P.length - 1];
  return L[0] + (y - L[1]) / PORTAL.slopeTop;
}
// idem, mas pelo lado norte (fim da berma, quando a altura y coincide com uma berma)
export function portalFaceN(y) {
  const P = PORTAL.prof;
  if (y <= 0) return 0;
  for (let j = 0; j < P.length; j++) {
    if (P[j][1] >= y - 1e-6) {
      if (j > 0 && P[j][1] > P[j - 1][1] && y < P[j][1] - 1e-6) return portalFaceS(y);
      let k = j; while (k + 1 < P.length && P[k + 1][1] === P[k][1]) k++;
      return Math.abs(P[j][1] - y) < 1e-6 ? P[k][0] : portalFaceS(y);
    }
  }
  return portalFaceS(y);
}
function portalCut(x, z) {
  const d = Math.max(Math.abs(x - PORTAL.x) - PORTAL.hw, 0);
  return portalProfile(PORTAL.zp - z) + d * PORTAL.lat;
}

export const PIT = { cx: 81, cz: -30, hx: 13, hz: 11, depth: 8 };
// D ampliada (antigo lote de H): platô de 5 m no fundo do lote, contido por uma cortina atirantada em z = zf
export const D_PLAT = { x0: 10, x1: 48, zf: -40, hp: 5 };
export const DAM = { cx: 27, zc: -36, x0: 10, x1: 44, crest: 8, water: 6.3 };

// Saída do túnel na área afastada: colina na margem norte, com o portal na face voltada para o fundo (z menor).
export const EXIT = { x: TUNNEL.x, zp: TUNNEL.zOut, hw: 6, cz: TUNNEL.zOut + 13 };
const exitCut = (x, z) => { const s = z - EXIT.zp, d = Math.max(Math.abs(x - EXIT.x) - EXIT.hw, 0); return s <= 0 ? 0 : s * 1.6 + d * 1.2; };
// perfil do rio (0 fora, 1 no leito), ao longo de z
export const riverF = (z) => sstep(RIVER.z1, RIVER.z1 - RIVER.bank, z) * sstep(RIVER.z0, RIVER.z0 + RIVER.bank, z);

export function Hraw(x, z) {
  let h = 0;
  // Zona A: colina do emboque
  h += bump(x, z, -90, -38, 14, 20, 18) + bump(x, z, -99, -47, 6, 8, 5);
  // área afastada: as zonas F e H foram deslocadas de REMOTE_DZ; o relevo delas é avaliado em zr
  const zr = z - REMOTE_DZ;
  // colina da saída do túnel (área afastada, à esquerda) e morros nos cantos
  h += Math.min(bump(x, z, EXIT.x, EXIT.cz, 15, 12, 11), exitCut(x, z) + 0.0) + bump(x, z, -100, -140, 8, 8, 5) + bump(x, z, 97, -134, 11, 12, 8);
  // Zona F: encosta em bancadas
  h += terrace(bump(x, zr, -27, -38, 20, 20, 12.6), 2.4);
  // Zona H: vale da barragem
  {
    z = zr;
    const a = Math.abs(x - DAM.cx);
    const m = sstep(-28, -40, z);
    const side = sstep(5, 13, a) * (1 - sstep(19, 24, a)) * 13;
    const rise = Math.max(0, -36 - z) * 0.1 * (1 - sstep(4, 10, a));
    const back = sstep(-46, -52, z) * (1 - sstep(-54, -58, z)) * 13 * (1 - sstep(19, 24, a));
    h += (rise + side) * m + back;
    z = zr + REMOTE_DZ;
  }
  // platô da D ampliada (face vertical contida)
  h += D_PLAT.hp * sstep(D_PLAT.x0 - 1.5, D_PLAT.x0, x) * (1 - sstep(D_PLAT.x1, D_PLAT.x1 + 1.5, x)) * sstep(D_PLAT.zf + 0.2, D_PLAT.zf - 0.6, z) * (1 - sstep(-55, -58, z));
  // rio atrás da cidade
  const f = riverF(z);
  if (f > 0) h = h * (1 - f) + RIVER.bed * f;
  return h;
}
export function H(x, z) {
  const h = Hraw(x, z);
  if (x > -108 && x < -72 && z < -16 && z > -40) return Math.min(h, portalCut(x, z));
  return h;
}
export const isCut = (x, z) => x > -108 && x < -72 && z < -16 && z > -40 && Hraw(x, z) - H(x, z) > 0.08;

// fronteiras entre camadas (y) — levemente onduladas
const BASE = [-2.2, -7, -12, -17, -22];
const nz = (x, z, k) =>
  Math.sin(x * 0.07 + z * 0.045 + k * 1.7) * 0.5 +
  Math.sin(x * 0.031 - z * 0.06 + k * 2.3) * 0.35 +
  Math.sin(x * 0.13 + z * 0.11 + k) * 0.15;
export function bounds(x, z) {
  const b = BASE.map((y, i) => y + nz(x, z, i + 1) * (0.9 + i * 0.25));
  const naTop = -9.6 + nz(x, z, 9) * 0.35;
  // [fundo topo→argila, argila→areia, areia→NA, NA, NA→silte, silte→rocha alt, rocha alt→rocha]
  return { b1: b[0], b2: b[1], naTop, naBot: naTop - 0.55, b3: b[2], b4: b[3], b5: b[4] };
}

const cTop = new THREE.Color(COL.clay), cGrass = new THREE.Color(COL.grass);
const strataC = STRATA.map((s) => new THREE.Color(s.cor));
const cCut = new THREE.Color(0xc79f74);
export function colorOf(x, y, z, out, cutOverride) {
  const cutHere = cutOverride === undefined ? isCut(x, z) : cutOverride;
  if (y > -0.25 && cutHere) { out.copy(cCut); const n = nz(x * 1.7, z * 1.7, 3) * 0.03; out.r += n; out.g += n; out.b += n; return out; }
  if (y > -0.25) {
    const g = sstep(0.4, 4.5, y);
    out.copy(cTop).lerp(cGrass, g);
    const n = nz(x * 1.7, z * 1.7, 3) * 0.018;
    out.r += n; out.g += n; out.b += n;
    return out;
  }
  const B = bounds(x, z);
  if (y > B.b1) return out.copy(strataC[0]);
  if (y > B.b2) return out.copy(strataC[1]);
  if (y > B.naTop) return out.copy(strataC[2]);
  return out.copy(strataC[2]);
}

// buracos retangulares (x0, x1, z0, z1) no topo do terreno, usados por obras com vala ou cava (Zona B)
export const terrainHoles = Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0));
// buracos permanentes (Zona D: cava urbana e rampa), controlados por setPitOpen()
export const permHoles = Array.from({ length: 2 }, () => new THREE.Vector4(0, 0, 0, 0));
export const PIT_RECT = { x0: PIT.cx - PIT.hx, x1: PIT.cx + PIT.hx, z0: PIT.cz - PIT.hz, z1: PIT.cz + PIT.hz };
export const RAMP_RECT = { x0: 84, x1: 91, z0: PIT.cz + PIT.hz, z1: -8 };
export function setPitOpen(open) {
  if (open) { permHoles[0].set(PIT_RECT.x0, PIT_RECT.x1, PIT_RECT.z0, PIT_RECT.z1); permHoles[1].set(RAMP_RECT.x0, RAMP_RECT.x1, RAMP_RECT.z0, RAMP_RECT.z1); }
  else permHoles.forEach((h) => h.set(0, 0, 0, 0));
}
setPitOpen(true);
const holeAll = [...terrainHoles, ...permHoles];
const HOLE_VS = (sh) => sh.replace('#include <common>', '#include <common>\nvarying vec3 vWPt;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPt = (modelMatrix * vec4(transformed, 1.0)).xyz;');
const HOLE_FS = (sh) => sh.replace('#include <common>', '#include <common>\nvarying vec3 vWPt;\nuniform vec4 uHole[6];')
  .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
    for (int hi = 0; hi < 6; hi++) { vec4 hb = uHole[hi]; if (vWPt.x > hb.x && vWPt.x < hb.y && vWPt.z > hb.z && vWPt.z < hb.w) discard; }`);
export function withHoles(m, key) {
  m.onBeforeCompile = (sh) => { sh.uniforms.uHole = { value: holeAll }; sh.vertexShader = HOLE_VS(sh.vertexShader); sh.fragmentShader = HOLE_FS(sh.fragmentShader); };
  m.customProgramCacheKey = () => key;
  return m;
}

export function createTerrain() {
  const group = new THREE.Group();
  const W = WORLD.w, D = WORLD.d, ZA = WORLD.z0;
  const nx = W, nzc = D;
  const verts = (nx + 1) * (nzc + 1);
  const pos = new Float32Array(verts * 3), col = new Float32Array(verts * 3);
  const idx = [];
  const c = new THREE.Color();
  for (let j = 0; j <= nzc; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = -W / 2 + i, z = ZA + j, y = H(x, z);
      const k = j * (nx + 1) + i;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      colorOf(x, y, z, c);
      if (y > -0.25) { const sl = Math.abs(H(x + 1, z) - H(x - 1, z)) + Math.abs(H(x, z + 1) - H(x, z - 1)); const dk = 1 - Math.min(0.28, sl * 0.075); c.multiplyScalar(dk); }
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
  }
  for (let j = 0; j < nzc; j++) {
    for (let i = 0; i < nx; i++) {
      const v00 = j * (nx + 1) + i, v10 = v00 + 1, v01 = v00 + nx + 1, v11 = v01 + 1;
      idx.push(v00, v01, v10, v10, v01, v11);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const top = new THREE.Mesh(g, withHoles(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), 'terrain-holes'));
  top.customDepthMaterial = withHoles(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), 'terrain-holes-depth');
  top.receiveShadow = true; top.castShadow = true;
  group.add(top);

  // paredes laterais com as camadas de solo (o "corte" do diorama)
  const edges = [
    { pts: (t) => [-W / 2 + t, WORLD.z1], n: W }, // frente, x crescente
    { pts: (t) => [W / 2 - t, WORLD.z0], n: W }, // fundo, x decrescente
    { pts: (t) => [-W / 2, WORLD.z0 + t], n: D }, // esquerda, z crescente
    { pts: (t) => [W / 2, WORLD.z1 - t], n: D }, // direita, z decrescente
  ];
  const wpos = [], wcol = [], widx = [];
  let vi = 0;
  const layerCols = [0, 1, 2, 3, 4, 5, 6, 7];
  for (const e of edges) {
    for (let t = 0; t < e.n; t++) {
      const [xa, za] = e.pts(t), [xb, zb] = e.pts(t + 1);
      const ya = H(xa, za), yb = H(xb, zb);
      const Ba = bounds(xa, za), Bb = bounds(xb, zb);
      const colsA = [ya, Ba.b1, Ba.b2, Ba.naTop, Ba.naBot, Ba.b3, Ba.b4, Ba.b5, WORLD.bottom];
      const colsB = [yb, Bb.b1, Bb.b2, Bb.naTop, Bb.naBot, Bb.b3, Bb.b4, Bb.b5, WORLD.bottom];
      for (let L = 0; L < 8; L++) {
        const cc = strataC[layerCols[L]];
        const q = [
          [xa, colsA[L], za], [xa, colsA[L + 1], za],
          [xb, colsB[L], zb], [xb, colsB[L + 1], zb],
        ];
        for (const p of q) { wpos.push(p[0], p[1], p[2]); wcol.push(cc.r, cc.g, cc.b); }
        widx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
        vi += 4;
      }
    }
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
  wg.setAttribute('color', new THREE.Float32BufferAttribute(wcol, 3));
  wg.setIndex(widx);
  wg.computeVertexNormals();
  const walls = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  walls.receiveShadow = true; walls.castShadow = false;
  group.add(walls);

  // base: sombra suave embaixo do diorama
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const cx = cv.getContext('2d');
  const gr = cx.createRadialGradient(128, 128, 20, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = gr; cx.fillRect(0, 0, 256, 256);
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 1.5, D * 1.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })
  );
  sh.rotation.x = -Math.PI / 2; sh.position.set(0, WORLD.bottom - 0.5, (WORLD.z0 + WORLD.z1) / 2);
  group.add(sh);
  return group;
}

// Parede de corte (camadas do solo) ao longo de uma polilinha de pontos [x,z].
// Usada pela vista em corte para fechar o "entalhe" aberto no terreno.
export function strataWallGeometry(pts, hFn = H) {
  const wpos = [], wcol = [], widx = [];
  let vi = 0;
  // maciço da colina (Zona A): solo superficial, solo residual e rocha alterada
  const HILLC = [new THREE.Color(0x9c7b56), new THREE.Color(0xcfa874), new THREE.Color(0xb3a898), new THREE.Color(0x7d838a)];
  const hillZ = (x, z) => x > -108 && x < -72 && z < -16 && z > -60 && Hraw(x, z) > 0.4;
  const colAt = (x, z) => {
    if (hillZ(x, z)) {
      const h = hFn(x, z), top = Math.max(Hraw(x, z) - 1.4, 0.1);
      const res = Math.min(3.2, top);
      return { ys: [h, Math.min(h, top), Math.min(h, res), -8, WORLD.bottom, WORLD.bottom, WORLD.bottom, WORLD.bottom, WORLD.bottom], hill: true };
    }
    const B = bounds(x, z);
    return { ys: [hFn(x, z), B.b1, B.b2, B.naTop, B.naBot, B.b3, B.b4, B.b5, WORLD.bottom] };
  };
  const colorFor = (A, Bq, L) => {
    if (A.hill && Bq.hill) return HILLC[Math.min(L, 3)];
    return strataC[L];
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const [xa, za] = pts[i], [xb, zb] = pts[i + 1];
    const A0 = colAt(xa, za), B0 = colAt(xb, zb);
    const A = A0.ys, Bq = B0.ys;
    for (let L = 0; L < 8; L++) {
      if (A0.hill && B0.hill && L > 3) continue;
      const cc = colorFor(A0, B0, L);
      const q = [[xa, A[L], za], [xa, A[L + 1], za], [xb, Bq[L], zb], [xb, Bq[L + 1], zb]];
      for (const p of q) { wpos.push(p[0], p[1], p[2]); wcol.push(cc.r, cc.g, cc.b); }
      widx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
      vi += 4;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(wcol, 3));
  g.setIndex(widx);
  g.computeVertexNormals();
  return g;
}
