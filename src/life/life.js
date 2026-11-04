import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROADS, rng } from '../config.js';
import { H } from '../scene/terrain.js';

// ---------- trânsito: laços ao redor de cada quadra, mão direita ----------
function roundedLoop(x0, x1, z0, z1, r, lane) {
  // sentido anti-horário na tela (x cresce para a direita, z para baixo)
  const pts = [];
  const corner = (cx, cz, a0) => {
    for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  };
  // percurso: topo da esquerda para a direita? definimos horário na tela e usamos offset à direita
  corner(x0 + r, z0 + r, Math.PI);          // canto sup-esq → sobe para sup
  corner(x1 - r, z0 + r, -Math.PI / 2);     // canto sup-dir
  corner(x1 - r, z1 - r, 0);                // canto inf-dir
  corner(x0 + r, z1 - r, Math.PI / 2);      // canto inf-esq
  // densifica e calcula tangentes
  const dense = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.2));
    for (let j = 0; j < n; j++) dense.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
  }
  const out = [], len = [0];
  for (let i = 0; i < dense.length; i++) {
    const a = dense[i], b = dense[(i + 1) % dense.length], c = dense[(i - 1 + dense.length) % dense.length];
    const tx = b[0] - c[0], tz = b[1] - c[1], tl = Math.hypot(tx, tz) || 1;
    const dx = tx / tl, dz = tz / tl;
    out.push({ x: a[0] + -dz * lane, z: a[1] + dx * lane, h: Math.atan2(-dz, dx) });
    len.push(len[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { pts: out, len, total: len[len.length - 1] };
}

function carGeometry() {
  const body = new THREE.BoxGeometry(4.0, 1.0, 1.9); body.translate(0, 0.8, 0);
  const cab = new THREE.BoxGeometry(2.1, 0.8, 1.7); cab.translate(-0.2, 1.6, 0);
  const wl = [];
  for (const x of [-1.3, 1.3]) for (const z of [0.95, -0.95]) { const w = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 8); w.rotateX(Math.PI / 2); w.translate(x, 0.42, z); wl.push(w); }
  // cor por vértice: carroceria branca (tingida pela instância), rodas escuras
  const parts = [body, cab, ...wl].map((g) => g.index ? g.toNonIndexed() : g);
  const cols = [];
  parts.forEach((g, i) => { const c = i < 2 ? [1, 1, 1] : [0.14, 0.14, 0.16]; for (let k = 0; k < g.attributes.position.count; k++) cols.push(...c); });
  const m = mergeGeometries(parts);
  m.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return m;
}

export function createTraffic(engine) {
  const xs = ROADS.vx, zs = ROADS.hz;
  const loops = [];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    loops.push(roundedLoop(xs[i], xs[i + 1], zs[j], zs[j + 1], 7, 1.9));
  }
  const R = rng(11);
  const palette = [0xe9a23b, 0x6fa3c7, 0xd9d4c8, 0xc86a5a, 0x7ea58a, 0xf0ede6, 0x4d5560, 0xb98fb3];
  const cars = [];
  loops.forEach((lp, li) => {
    const n = 3 + Math.floor(R() * 3);
    const speed = 7 + R() * 3;
    for (let k = 0; k < n; k++) cars.push({ lp, s: (k / n) * lp.total + R() * 6, v: speed, c: palette[Math.floor(R() * palette.length)] });
  });
  const mesh = new THREE.InstancedMesh(carGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.7, vertexColors: true }), cars.length);
  mesh.castShadow = true; mesh.receiveShadow = true;
  cars.forEach((c, i) => mesh.setColorAt(i, new THREE.Color(c.c)));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  function at(lp, sPos) {
    const L = lp.total; sPos = ((sPos % L) + L) % L;
    // busca binária
    let lo = 0, hi = lp.len.length - 2;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lp.len[mid] <= sPos) lo = mid; else hi = mid - 1; }
    const a = lp.pts[lo], b = lp.pts[(lo + 1) % lp.pts.length];
    const f = (sPos - lp.len[lo]) / Math.max(0.0001, lp.len[lo + 1] - lp.len[lo]);
    let dh = b.h - a.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, h: a.h + dh * f };
  }
  engine.onUpdate((dt) => {
    cars.forEach((c, i) => {
      c.s += c.v * dt;
      const r = at(c.lp, c.s);
      p.set(r.x, 0.12, r.z); q.setFromAxisAngle(up, r.h);
      m.compose(p, q, s); mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return mesh;
}

// ---------- pessoas ----------
export function createPeople(engine, spots) {
  // spots: [{x,z,x2,z2,kind:'walk'|'work'}]
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.34, 0.9, 3, 6), new THREE.MeshStandardMaterial({ roughness: 0.8 }), spots.length);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.8 }), spots.length);
  body.castShadow = head.castShadow = true;
  const R = rng(5);
  const shirt = [0x6fa3c7, 0xc86a5a, 0x7ea58a, 0xe9c46a, 0xb98fb3, 0x4d5560, 0xf0ede6];
  spots.forEach((s, i) => {
    body.setColorAt(i, new THREE.Color(s.kind === 'work' ? (R() < 0.5 ? 0xf2b705 : 0xe8742c) : shirt[Math.floor(R() * shirt.length)]));
    head.setColorAt(i, new THREE.Color(s.kind === 'work' ? 0xf4f1ea : [0xe8c4a0, 0xc99a74, 0x9a6b4a][Math.floor(R() * 3)]));
    s.ph = R() * 10; s.sp = 0.8 + R() * 0.8;
  });
  const m = new THREE.Matrix4();
  engine.onUpdate((dt, t) => {
    spots.forEach((s, i) => {
      let x = s.x, z = s.z, bob = 0;
      if (s.x2 !== undefined) {
        const L = Math.hypot(s.x2 - s.x, s.z2 - s.z) || 1;
        const u = (Math.sin((t * s.sp * 1.4) / L * 3 + s.ph) + 1) / 2;
        x = s.x + (s.x2 - s.x) * u; z = s.z + (s.z2 - s.z) * u;
        bob = Math.abs(Math.sin(t * 6 + s.ph)) * 0.08;
      } else bob = Math.abs(Math.sin(t * 1.5 + s.ph)) * 0.03;
      const y = (s.y ?? H(x, z)) + bob;
      m.makeTranslation(x, y + 0.95, z); body.setMatrixAt(i, m);
      m.makeTranslation(x, y + 1.9, z); head.setMatrixAt(i, m);
    });
    body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true;
  });
  const g = new THREE.Group(); g.add(body, head);
  return g;
}

// ---------- árvores ----------
export function createTrees(positions0, seed = 3) {
  const R = rng(seed);
  const positions = positions0.filter(([x, z]) => !(x > -47.5 && x < -5 && z > -59 && z < -5) && !(x > 2 && x < 51 && z > -59 && z < -5));   // morro da zona F: as obras de terra refazem o perfil do terreno
  const trunk = new THREE.CylinderGeometry(0.18, 0.26, 1.6, 6); trunk.translate(0, 0.8, 0);
  const crown = new THREE.IcosahedronGeometry(1.5, 0); crown.translate(0, 2.7, 0);
  const crown2 = new THREE.IcosahedronGeometry(1.05, 0); crown2.translate(0.2, 3.9, 0.1);
  const tg = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x8a6a4f, roughness: 1 }), positions.length);
  const cg = new THREE.InstancedMesh(mergeGeometries([crown, crown2]), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), positions.length);
  tg.castShadow = cg.castShadow = true; cg.receiveShadow = true;
  const greens = [0x7fb77e, 0x8cc08a, 0x6fae79, 0x9bc98f, 0x78a97a];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  positions.forEach(([x, z], i) => {
    const s = 0.75 + R() * 0.6;
    p.set(x, H(x, z) - 0.05, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28); sc.set(s, s * (0.9 + R() * 0.3), s);
    m.compose(p, q, sc); tg.setMatrixAt(i, m); cg.setMatrixAt(i, m);
    cg.setColorAt(i, new THREE.Color(greens[Math.floor(R() * greens.length)]));
  });
  const g = new THREE.Group(); g.add(tg, cg);
  return g;
}
