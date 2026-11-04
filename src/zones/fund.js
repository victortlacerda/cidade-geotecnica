import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Kit compartilhado das obras de fundação (Zona B): peças com corte desenhado
// no plano da seção, pessoas, compactador e pequenas utilidades.
// Convenção: a seção é o plano x = X1; a vista é do oeste; as peças se estendem
// ao leste. Cada peça tem um corpo 3D e uma "tampa" no plano do corte.
// ---------------------------------------------------------------------------
export const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const win = (t, a, b) => clamp01((t - a) / (b - a));

export const mat = (c, o = {}) => new THREE.MeshStandardMaterial({
  color: c, roughness: o.r ?? 0.85, metalness: o.m ?? 0, side: o.side ?? THREE.DoubleSide,
  transparent: o.op !== undefined, opacity: o.op ?? 1, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, depthWrite: o.dw ?? true,
});
export const noclip = (c, o = {}) => { const m = mat(c, o); m.userData.noClip = true; return m; };

const boxUnit = new THREE.BoxGeometry(1, 1, 1); boxUnit.translate(0, 0.5, 0); // base em y = 0
const capUnit = new THREE.PlaneGeometry(1, 1); capUnit.rotateY(-Math.PI / 2); capUnit.translate(0, 0.5, 0);

export const WET = new THREE.Color(0x85827a), CURED = new THREE.Color(0xc4c0b6);

// Peça prismática ao longo de um conjunto de "faixas".
// strips: [{ axis: 'x'|'z', c, a, b }] — a faixa corre ao longo de axis, centrada em c (no outro eixo), de a até b.
// u0..u1: extensão transversal em relação a c; y0..y1: altura.
// cap: { x, mat } opcional, desenha a seção em x (somente faixas com axis 'x').
export function piece(parent, strips, u0, u1, y0, y1, bodyMat, cap) {
  const items = [];
  const w = u1 - u0, uc = (u0 + u1) / 2, h = y1 - y0;
  for (const s of strips) {
    const len = Math.abs(s.b - s.a), mid = (s.a + s.b) / 2;
    const m = new THREE.Mesh(boxUnit, bodyMat); m.castShadow = true; m.receiveShadow = true;
    let sc;
    if (s.axis === 'x') { m.position.set(mid, y0, s.c + uc); sc = [len, h, w]; } else { m.position.set(s.c + uc, y0, mid); sc = [w, h, len]; }
    parent.add(m); items.push({ m, sc });
    if (cap && s.axis === 'x') {
      const c = new THREE.Mesh(capUnit, cap.mat || bodyMat); c.position.set(cap.x, y0, s.c + uc); parent.add(c);
      items.push({ m: c, sc: [1, h, w] });
    }
  }
  return {
    h, y0, set(f, fx = 1) {
      for (const it of items) { it.m.visible = f > 0.003; it.m.scale.set(it.sc[0], Math.max(1e-4, it.sc[1] * f), it.sc[2]); }
    },
    dispose() { items.forEach((it) => parent.remove(it.m)); },
  };
}

// retângulo avulso no plano da seção (para camadas, bulbo etc.)
export function capRect(parent, x, z0, z1, y0, y1, material) {
  const c = new THREE.Mesh(capUnit, material); c.position.set(x, y0, (z0 + z1) / 2); c.scale.set(1, y1 - y0, z1 - z0); parent.add(c); return c;
}

// pessoa estilizada (capacete, colete)
export function person(color = 0xe8742c, helmet = 0xf2b705) {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.24), mat(0x3a3e45)); legs.position.y = 0.28; g.add(legs);
  const upper = new THREE.Group(); upper.position.y = 0.55; g.add(upper);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.7, 10), mat(color)); body.position.y = 0.38; upper.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat(0xe6bf9b)); head.position.y = 0.88; upper.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(helmet)); cap.position.y = 0.92; upper.add(cap);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), mat(color)); arm.position.set(0.3, 0.45, 0); upper.add(arm);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(1.15);
  return { group: g, upper, arm };
}

// compactador de placa vibratória
export function plateCompactor() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.9), mat(0x3a3e45)); base.position.y = 0.07;
  const eng = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), mat(0xe8742c)); eng.position.set(0, 0.36, -0.1);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), mat(0x2f3237)); handle.position.set(0, 0.75, -0.55); handle.rotation.x = -0.55;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), mat(0x2f3237)); bar.position.set(0, 1.2, -0.84);
  g.add(base, eng, handle, bar);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(1.3);
  return { group: g, shake(t) { base.position.y = 0.07 + Math.abs(Math.sin(t * 30)) * 0.03; eng.position.y = 0.36 + Math.abs(Math.sin(t * 30)) * 0.02; } };
}

// fluxo de concreto: pequena corrente de esferas entre dois pontos
export function stream(parent, n, color) {
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 5), mat(color, { r: 1 }), n);
  im.frustumCulled = false; parent.add(im);
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
  return {
    im,
    set(a, b, on, t, spread = 0.12) {
      for (let i = 0; i < n; i++) {
        if (!on) { m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); continue; }
        const f = (t * 1.6 + i / n) % 1;
        v.lerpVectors(a, b, f); v.y += Math.sin(f * Math.PI) * 0.25; v.x += Math.sin(i * 12.9) * spread; v.z += Math.cos(i * 7.7) * spread;
        m4.makeTranslation(v.x, v.y, v.z); im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
    },
  };
}

// barras de armadura instanciadas (cilindros finos)
export function barSet(parent, n, color, radius = 0.045) {
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(radius, radius, 1, 6), mat(color, { r: 0.5, m: 0.5 }), n);
  im.frustumCulled = false; parent.add(im);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const AX = { y: new THREE.Quaternion(), x: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), z: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2) };
  return {
    im,
    // i-ésima barra: eixo 'x' ou 'z', centro (cx,cy,cz), comprimento len
    put(i, axis, cx, cy, cz, len) {
      if (len <= 0.001) { m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); return; }
      q.copy(AX[axis]); p.set(cx, cy, cz); s.set(1, len, 1); m4.compose(p, q, s); im.setMatrixAt(i, m4);
    },
    done() { im.instanceMatrix.needsUpdate = true; },
  };
}

export const quatY = (a) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
