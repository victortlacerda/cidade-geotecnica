import * as THREE from 'three';
import { box, cyl, sph, cone, grp, wheel, bar, mat } from './primitives.js';
import { COL } from '../config.js';

const Y = COL.yellow, D = COL.dark, G = COL.glass;

export function excavator(scale = 1) {
  const g = new THREE.Group();
  g.add(box(5.2, 0.9, 1.1, D, 0, 0.55, 1.55), box(5.2, 0.9, 1.1, D, 0, 0.55, -1.55));
  const turret = new THREE.Group(); turret.position.y = 1.0; g.add(turret);
  turret.add(box(3.3, 1.3, 2.9, Y, -0.2, 0.75, 0), box(1.5, 1.4, 1.6, Y, 0.9, 1.7, 0.5), box(1.2, 0.8, 1.3, G, 1.1, 1.8, 0.5), box(1.2, 1.1, 2.6, D, -1.8, 0.8, 0));
  const boom = new THREE.Group(); boom.position.set(1.6, 1.0, -0.6); turret.add(boom);
  boom.add(box(4.4, 0.7, 0.7, Y, 2.2, 0, 0));
  const stick = new THREE.Group(); stick.position.set(4.4, 0, 0); boom.add(stick);
  stick.add(box(3.2, 0.55, 0.55, Y, 1.6, 0, 0));
  const bucket = new THREE.Group(); bucket.position.set(3.2, 0, 0); stick.add(bucket);
  bucket.add(box(1.1, 0.9, 1.5, D, 0.45, -0.35, 0));
  g.scale.setScalar(scale);
  const ph = Math.random() * 6;
  return {
    group: g,
    update(t) {
      turret.rotation.y = Math.sin(t * 0.45 + ph) * 0.9;
      boom.rotation.z = 0.55 + 0.22 * Math.sin(t * 1.05 + ph);
      stick.rotation.z = -1.25 + 0.45 * Math.sin(t * 1.05 + ph + 1.2);
      bucket.rotation.z = -0.7 + 0.5 * Math.sin(t * 1.05 + ph + 2.2);
    },
  };
}

export function dumpTruck(color = Y) {
  const g = new THREE.Group();
  g.add(box(6, 0.7, 2.6, D, 0, 1.15, 0), box(1.9, 1.7, 2.5, 0xf2eee6, 2.4, 2.0, 0), box(0.9, 0.8, 2.3, G, 3.1, 2.3, 0));
  for (const x of [-2, -0.6, 2.3]) for (const z of [1.35, -1.35]) g.add(wheel(0.75, 0.6, x, 0.75, z));
  const bed = new THREE.Group(); bed.position.set(-2.8, 1.5, 0); g.add(bed);
  bed.add(box(4.2, 1.4, 2.7, color, 2.1, 0.7, 0));
  g.userData.bed = bed;
  return g;
}

export function mixerTruck() {
  const g = new THREE.Group();
  g.add(box(6.2, 0.7, 2.5, D, 0, 1.1, 0), box(1.8, 1.7, 2.4, 0xf2eee6, 2.5, 1.95, 0), box(0.9, 0.8, 2.2, G, 3.2, 2.25, 0));
  for (const x of [-2, -0.6, 2.4]) for (const z of [1.3, -1.3]) g.add(wheel(0.7, 0.6, x, 0.7, z));
  const drum = new THREE.Group(); drum.position.set(-0.6, 2.7, 0); drum.rotation.z = 0.28; g.add(drum);
  const body = cyl(1.35, 1.35, 4.2, COL.orange, 0, 0, 0, 14); body.rotation.z = Math.PI / 2; drum.add(body);
  const stripe = box(4.2, 0.3, 0.5, 0xf4f1ea, 0, 1.38, 0); drum.add(stripe);
  g.userData.drum = drum;
  g.userData.spin = body;
  return g;
}

export function towerCrane(h = 28) {
  const g = new THREE.Group();
  const mast = new THREE.Group(); g.add(mast);
  for (const [x, z] of [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) mast.add(box(0.22, h, 0.22, Y, x, h / 2, z));
  for (let y = 1; y < h; y += 2.2) {
    mast.add(box(1.6, 0.12, 0.12, Y, 0, y, .7), box(1.6, 0.12, 0.12, Y, 0, y, -.7), box(0.12, 0.12, 1.6, Y, .7, y, 0), box(0.12, 0.12, 1.6, Y, -.7, y, 0));
  }
  const slew = new THREE.Group(); slew.position.y = h; g.add(slew);
  slew.add(box(1.8, 1.0, 1.8, Y, 0, 0.5, 0), box(1.5, 1.4, 1.5, G, 1.2, 0.6, 0), box(22, 0.5, 0.9, Y, 8, 1.5, 0), box(8, 0.5, 0.9, Y, -6, 1.5, 0), box(2.2, 1.8, 1.6, 0x6f737a, -9, 0.9, 0), box(0.4, 3, 0.4, Y, 0, 2.4, 0));
  slew.add(bar(0, 3.8, 0, 17, 1.7, 0, 0.14, Y), bar(0, 3.8, 0, -8, 1.7, 0, 0.14, Y));
  const trolley = new THREE.Group(); trolley.position.set(10, 1.1, 0); slew.add(trolley);
  trolley.add(box(1.0, 0.4, 1.0, D, 0, 0, 0));
  const line = box(0.08, 1, 0.08, D, 0, -0.5, 0); trolley.add(line);
  const hook = box(0.8, 0.7, 0.8, Y, 0, -1, 0); trolley.add(hook);
  const load = box(2.4, 1.0, 1.4, 0xbab6ad, 0, -1.9, 0); hook.add(load);
  const ph = Math.random() * 6;
  return {
    group: g,
    update(t) {
      slew.rotation.y = Math.sin(t * 0.12 + ph) * 1.3;
      trolley.position.x = 11 + 5 * Math.sin(t * 0.3 + ph);
      const drop = 6 + 4 * (0.5 + 0.5 * Math.sin(t * 0.5 + ph));
      line.scale.y = drop; line.position.y = -drop / 2 - 0.2;
      hook.position.y = -drop - 0.3;
    },
  };
}

export function roller() {
  const g = new THREE.Group();
  g.add(box(4.2, 1.2, 2.2, Y, 0, 1.9, 0), box(1.6, 1.0, 1.8, G, -0.4, 3.1, 0), box(1.8, 0.15, 2.0, D, -0.4, 3.7, 0));
  for (const x of [-1.9, 1.9]) { const d = cyl(1.15, 1.15, 2.7, 0x8a8e95, x, 1.15, 0, 16); d.rotation.x = Math.PI / 2; g.add(d); }
  return g;
}

export function paver() {
  const g = new THREE.Group();
  g.add(box(5.2, 1.2, 3.4, D, 0, 1.0, 0), box(2.2, 1.6, 3.4, Y, 1.9, 2.1, 0), box(1.6, 0.9, 3.8, 0x2a2c30, -3.2, 0.6, 0), box(0.1, 0.1, 0.1, D, 0, 0, 0));
  g.add(box(2.4, 0.35, 3.6, Y, -2.0, 1.9, 0), box(1.0, 1.0, 1.0, G, 0.4, 2.6, 0));
  return g;
}

export function pilingRig() {
  const g = new THREE.Group();
  g.add(box(5.4, 1.0, 1.2, D, 0, 0.55, 1.9), box(5.4, 1.0, 1.2, D, 0, 0.55, -1.9), box(3.4, 1.4, 3.2, Y, -0.6, 1.7, 0), box(1.4, 1.2, 1.5, G, 0.7, 2.0, 0.6), box(1.6, 1.4, 2.4, D, -2.4, 1.6, 0));
  const mastH = 20;
  const mast = box(0.9, mastH, 0.9, Y, 2.4, mastH / 2 + 1, 0); g.add(mast);
  g.add(bar(-0.6, 2.4, 0, 2.4, mastH - 3, 0, 0.18, D));
  g.add(box(1.4, 0.5, 1.4, D, 2.4, mastH + 1.1, 0));
  const aug = new THREE.Group(); aug.position.set(3.2, 0, 0); g.add(aug);
  const shaft = cyl(0.22, 0.22, 17, 0x8a8e95, 0, 8.5, 0, 8); aug.add(shaft);
  for (let i = 0; i < 12; i++) {
    const a = box(1.5, 0.12, 0.45, 0x6f737a, 0, 0.8 + i * 1.3, 0); a.rotation.y = i * 0.55; aug.add(a);
  }
  aug.add(box(0.9, 0.9, 0.9, D, 0, 17.2, 0));
  const ph = Math.random() * 6;
  return {
    group: g,
    update(t) {
      const p = 0.5 + 0.5 * Math.sin(t * 0.35 + ph);
      aug.position.y = 3 + p * 1.0 - 2.5 + (1 - p) * 3.5; // desce e sobe
      aug.rotation.y = t * 4;
    },
  };
}

export function tripodRig() {
  const g = new THREE.Group();
  const top = new THREE.Vector3(0, 6.2, 0);
  for (const a of [0, 2.1, 4.2]) g.add(bar(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6, 0, 6.2, 0, 0.16, 0x6f737a));
  g.add(box(0.5, 0.4, 0.5, D, 0, 6.3, 0));
  const rod = cyl(0.07, 0.07, 6, 0x8a8e95, 0, 3, 0, 6); g.add(rod);
  const hammer = cyl(0.3, 0.3, 0.7, Y, 0, 2.0, 0, 10); g.add(hammer);
  const rope = box(0.03, 1, 0.03, D, 0, 4.5, 0); g.add(rope);
  const ph = Math.random() * 6;
  return {
    group: g,
    update(t) {
      const lift = 0.5 + 0.5 * Math.sin(t * 3.0 + ph);
      const y = 1.6 + Math.max(0, lift) * 2.2;
      hammer.position.y = y;
      rope.scale.y = 6.1 - y; rope.position.y = y + (6.1 - y) / 2;
    },
  };
}

export function gantry() {
  const g = new THREE.Group();
  const R = 0xd9532f;
  for (const x of [-7, 7]) { g.add(box(0.8, 11, 0.8, R, x, 5.5, -2.2), box(0.8, 11, 0.8, R, x, 5.5, 2.2), box(0.5, 0.5, 5.2, R, x, 0.5, 0)); }
  g.add(box(16, 1.0, 1.0, R, 0, 11, -2.2), box(16, 1.0, 1.0, R, 0, 11, 2.2));
  const tr = new THREE.Group(); tr.position.y = 10.2; g.add(tr);
  tr.add(box(1.8, 0.7, 5.0, Y, 0, 0, 0));
  const line = box(0.07, 1, 0.07, D, 0, -1, 0); tr.add(line);
  const hook = box(1.0, 0.6, 1.0, Y, 0, -2, 0); tr.add(hook);
  hook.add(box(1.6, 1.6, 1.6, 0xbab6ad, 0, -1.2, 0));
  const ph = Math.random() * 6;
  return {
    group: g,
    update(t) {
      tr.position.x = 5 * Math.sin(t * 0.25 + ph);
      const drop = 3 + 3.5 * (0.5 + 0.5 * Math.sin(t * 0.55 + ph));
      line.scale.y = drop; line.position.y = -drop / 2;
      hook.position.y = -drop;
    },
  };
}

export function trafficCones(parent, pts) {
  const m = new THREE.InstancedMesh(new THREE.ConeGeometry(0.35, 0.9, 8), mat(COL.orange), pts.length);
  const mx = new THREE.Matrix4();
  pts.forEach(([x, y, z], i) => { mx.makeTranslation(x, y + 0.45, z); m.setMatrixAt(i, mx); });
  m.castShadow = true; parent.add(m);
}
