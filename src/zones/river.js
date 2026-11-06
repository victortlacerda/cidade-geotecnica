import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WORLD, RIVER, BRIDGE, COL, ROADS_REMOTE, COFFER } from '../config.js';
import { H, EXIT } from '../scene/terrain.js';
import { follower } from '../kit/paths.js';
import * as M from '../kit/machines.js';

// ---------------------------------------------------------------------------
// Rio atrás da cidade, ponte perto da Zona D e saída do túnel (que vem da Zona A por baixo do rio) na área afastada.
// A ponte é estática; a obra C17 (fundação de ponte em rio) usará estes pilares.
// ---------------------------------------------------------------------------
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.85, metalness: o.m ?? 0, ...(o.extra || {}) });
const boxG = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };

export function buildRiver(ctx) {
  const { add, upd } = ctx;
  const root = new THREE.Group(); root.name = 'river'; add(root);
  const W = WORLD.w, zc = (RIVER.z0 + RIVER.z1) / 2, wd = RIVER.z1 - RIVER.z0;

  // água
  const waterM = mat(COL.water, { r: 0.2, m: 0.05, extra: { transparent: true, opacity: 0.88 } });
  const ws = new THREE.Shape(); ws.moveTo(-W / 2, RIVER.z0); ws.lineTo(W / 2, RIVER.z0); ws.lineTo(W / 2, RIVER.z1); ws.lineTo(-W / 2, RIVER.z1); ws.lineTo(-W / 2, RIVER.z0);
  { const h = new THREE.Path(), C = COFFER; h.moveTo(C.x0, C.z0); h.lineTo(C.x0, C.z1); h.lineTo(C.x1, C.z1); h.lineTo(C.x1, C.z0); h.lineTo(C.x0, C.z0); ws.holes.push(h); }
  const wgeo = new THREE.ShapeGeometry(ws); wgeo.rotateX(Math.PI / 2);   // (x, y) da forma → (x, z) do mundo
  const water = new THREE.Mesh(wgeo, waterM); water.position.y = RIVER.water; water.receiveShadow = true; root.add(water);
  water.material.side = THREE.DoubleSide;
  // água vista nas paredes laterais do diorama (entre o leito e o nível d'água)
  for (const sx of [-1, 1]) {
    const pos = [], x = sx * (W / 2 + 0.04);
    for (let z = RIVER.z0; z < RIVER.z1; z += 0.5) {
      const ya = Math.min(H(sx * W / 2, z), RIVER.water), yb = Math.min(H(sx * W / 2, z + 0.5), RIVER.water);
      if (ya >= RIVER.water && yb >= RIVER.water) continue;
      pos.push(x, ya, z, x, RIVER.water, z, x, yb, z + 0.5, x, RIVER.water, z, x, RIVER.water, z + 0.5, x, yb, z + 0.5);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    root.add(new THREE.Mesh(g, mat(0x3f86b8, { r: 0.3, extra: { side: THREE.DoubleSide } })));
  }
  // brilho que corre na água
  const glints = [];
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.2 + (i % 3), 0.02, 0.18), new THREE.MeshBasicMaterial({ color: 0xe9f6ff, transparent: true, opacity: 0.55 })); root.add(m); glints.push(m); }
  upd((dt, t) => glints.forEach((m, i) => { const u = ((t * 0.018 + i * 0.137) % 1); m.position.set(-W / 2 + 4 + u * (W - 8), RIVER.water + 0.03, RIVER.z0 + 3 + ((i * 5.3) % (wd - 6))); }));

  // traçado do túnel (passa por baixo do rio): faixa tracejada sobre a água, de margem a margem
  const dashes = [];
  for (let z = RIVER.z1 - 1.5; z > RIVER.z0 + 1; z -= 2.2) dashes.push(boxG(0.5, 0.03, 1.2, EXIT.x, RIVER.water + 0.05, z));
  const dash = new THREE.Mesh(mergeGeometries(dashes), new THREE.MeshBasicMaterial({ color: 0xf2b705, transparent: true, opacity: 0.85 })); root.add(dash);
  // poços de ventilação do túnel nas duas margens
  for (const z of [RIVER.z1 + 2.2, RIVER.z0 - 2.4]) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 2.2, 12), mat(COL.concrete)); v.position.set(EXIT.x + 4, H(EXIT.x + 4, z) + 1.1, z); v.castShadow = true; root.add(v);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.3, 12), mat(0x5a5e66)); cap.position.set(EXIT.x + 4, H(EXIT.x + 4, z) + 2.35, z); root.add(cap);
  }

  // ponte (perto da Zona D): tabuleiro, rampas, pilares no rio, encontros e guarda-corpo
  {
    const { x, deck } = BRIDGE, bw = 10, zA = -65, zB = -91, zr0 = RIVER.z1 + 1, zr1 = RIVER.z0 - 1, th = 0.8;
    const conc = mat(0xc9c4b8), asph = mat(COL.road, { r: 0.95 });
    const deckG = [], ramp = (za, zb, ya, yb) => { const L = Math.hypot(zb - za, yb - ya), g = new THREE.BoxGeometry(bw, th, L); g.rotateX(Math.atan2(yb - ya, za - zb)); g.translate(x, (ya + yb) / 2 - th / 2, (za + zb) / 2); return g; };
    deckG.push(ramp(zA, zr0, 0.12, deck), boxG(bw, th, zr0 - zr1, x, deck - th / 2, (zr0 + zr1) / 2), ramp(zr1, zB, deck, 0.12));
    const dk = new THREE.Mesh(mergeGeometries(deckG), conc); dk.castShadow = dk.receiveShadow = true; root.add(dk);
    const top = []; const rampT = (za, zb, ya, yb) => { const L = Math.hypot(zb - za, yb - ya), g = new THREE.BoxGeometry(bw - 2.2, 0.06, L); g.rotateX(Math.atan2(yb - ya, za - zb)); g.translate(x, (ya + yb) / 2 + 0.03, (za + zb) / 2); return g; };
    top.push(rampT(zA, zr0, 0.12, deck), boxG(bw - 2.2, 0.06, zr0 - zr1, x, deck + 0.03, (zr0 + zr1) / 2), rampT(zr1, zB, deck, 0.12));
    root.add(new THREE.Mesh(mergeGeometries(top), asph));
    const mk = []; for (let z = zr0 - 1; z > zr1 + 0.5; z -= 3) mk.push(boxG(0.22, 0.03, 1.5, x, deck + 0.08, z));
    root.add(new THREE.Mesh(mergeGeometries(mk), mat(0xf4f1ea)));
    // pilares: duas linhas no rio, cada uma com dois pilares sobre bloco
    const piers = [];
    for (const zp of [zc + 3.2, zc - 3.2]) {
      piers.push(boxG(bw - 1, 0.9, 2.4, x, RIVER.bed + 0.45, zp));
      for (const dx of [-2.7, 2.7]) { const c = new THREE.CylinderGeometry(0.7, 0.7, deck - th - RIVER.bed - 0.9, 12); c.translate(x + dx, RIVER.bed + 0.9 + (deck - th - RIVER.bed - 0.9) / 2, zp); piers.push(c); }
      piers.push(boxG(bw - 1.4, 0.6, 1.6, x, deck - th - 0.3, zp));
    }
    const pm = new THREE.Mesh(mergeGeometries(piers.map((g) => (g.index ? g.toNonIndexed() : g))), conc); pm.castShadow = true; root.add(pm);
    // encontros nas margens
    for (const [z, s] of [[zr0 + 0.4, 1], [zr1 - 0.4, -1]]) { const e = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.6, deck + 1.6, 1.2), conc); e.position.set(x, deck / 2 - 0.8, z + s * 0.2); e.castShadow = true; root.add(e); }
    // guarda-corpo e postes
    const rail = [];
    for (const sx of [-1, 1]) {
      const xr = x + sx * (bw / 2 - 0.25);
      rail.push(boxG(0.18, 0.12, zr0 - zr1, xr, deck + 1.0, (zr0 + zr1) / 2));
      for (let z = zr0; z >= zr1; z -= 1.6) rail.push(boxG(0.14, 1.0, 0.14, xr, deck + 0.5, z));
    }
    root.add(new THREE.Mesh(mergeGeometries(rail), mat(0x5a5e66, { m: 0.3 })));
    const lampM = new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffd88a, emissiveIntensity: 0 });
    for (const z of [zr0 - 3, zc, zr1 + 3]) for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 3.4, 6), mat(0x4a4e55)); p.position.set(x + sx * (bw / 2 - 0.3), deck + 1.7, z); root.add(p);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), lampM); b.position.set(x + sx * (bw / 2 - 0.3), deck + 3.5, z); root.add(b);
    }
    ctx.bridgeLamp = lampM;
    // trânsito na ponte (mão dupla)
    const L1 = x - 1.9, L2 = x + 1.9;
    const path = [[L1, 0.12, -58], [L1, 0.12, zA], [L1, deck, zr0], [L1, deck, zr1], [L1, 0.12, zB], [L1, 0.12, -99], [L2, 0.12, -99], [L2, 0.12, zB], [L2, deck, zr1], [L2, deck, zr0], [L2, 0.12, zA], [L2, 0.12, -58]];
    const carM = [0xe9a23b, 0x6fa3c7, 0xf0ede6];
    for (let i = 0; i < 3; i++) {
      const car = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.0, 1.8), mat(carM[i])); b.position.y = 0.8; car.add(b); const c = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.6), mat(0x86b8d8)); c.position.set(-0.2, 1.6, 0); car.add(c);
      car.castShadow = true; root.add(car); upd(follower(car, path, 6 + i, { yOff: 0.02 }));
    }
    const tk = M.dumpTruck(0xe8b300); tk.scale.setScalar(0.8); root.add(tk); upd(follower(tk, path, 4.5, { yOff: 0.05 }));
  }

  // Zona J: ensecadeira de estacas-prancha no rio, com a água bombeada para fora e o bloco de um novo pilar a seco
  {
    const cg = new THREE.Group(); cg.name = 'j-coffer'; root.add(cg);   // escondido durante a J2 (que anima a ensecadeira)
    const C = COFFER, top = RIVER.water + 1.4, bot = RIVER.bed - 0.2, sp = [], cxm = (C.x0 + C.x1) / 2, czm = (C.z0 + C.z1) / 2;
    for (let x = C.x0; x < C.x1 - 0.01; x += 0.6) for (const [z, s] of [[C.z0, -1], [C.z1, 1]]) sp.push(boxG(0.6, top - bot, 0.14, x + 0.3, (top + bot) / 2, z + s * ((Math.round((x - C.x0) / 0.6) % 2) ? 0.1 : -0.1)));
    for (let z = C.z0; z < C.z1 - 0.01; z += 0.6) for (const [x, s] of [[C.x0, -1], [C.x1, 1]]) sp.push(boxG(0.14, top - bot, 0.6, x + s * ((Math.round((z - C.z0) / 0.6) % 2) ? 0.1 : -0.1), (top + bot) / 2, z + 0.3));
    const spm = new THREE.Mesh(mergeGeometries(sp), mat(0x5f666e, { m: 0.3 })); spm.castShadow = true; cg.add(spm);
    // escoras internas (quadros) e fundo seco com o bloco do pilar
    const fr = [];
    for (const y of [RIVER.water + 0.6, RIVER.bed + 1.6]) { fr.push(boxG(C.x1 - C.x0, 0.3, 0.3, cxm, y, C.z0 + 0.35), boxG(C.x1 - C.x0, 0.3, 0.3, cxm, y, C.z1 - 0.35), boxG(0.3, 0.3, C.z1 - C.z0, C.x0 + 0.35, y, czm), boxG(0.3, 0.3, C.z1 - C.z0, C.x1 - 0.35, y, czm), boxG(0.25, 0.25, C.z1 - C.z0, cxm, y, czm)); }
    cg.add(new THREE.Mesh(mergeGeometries(fr), mat(COL.orange)));
    cg.add(new THREE.Mesh(boxG(C.x1 - C.x0 - 0.3, 0.1, C.z1 - C.z0 - 0.3, cxm, RIVER.bed + 0.05, czm), mat(0x6b5536)));
    const blk = new THREE.Mesh(boxG(6, 1.2, 3.2, cxm, RIVER.bed + 0.7, czm), mat(0xc9c4b8)); blk.castShadow = true; cg.add(blk);
    for (const dx of [-1.8, 1.8]) cg.add(new THREE.Mesh(boxG(0.2, 1.6, 0.2, cxm + dx, RIVER.bed + 2.0, czm), mat(0x4b4f55)));   // arranques do pilar
    // bomba na borda e tubo de recalque devolvendo a água ao rio
    cg.add(new THREE.Mesh(boxG(1.2, 0.8, 0.9, C.x1 - 0.8, top + 0.4, C.z0 + 0.9), mat(COL.orange)));
    cg.add(new THREE.Mesh(boxG(0.25, 0.25, 3.2, C.x1 + 0.6, top - 0.2, C.z0 - 0.8), mat(0x2f78c4)));
    // guindaste sobre esteiras na margem de lá
    const crane = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 3), mat(0xe8b300)); b.position.y = 0.9; crane.add(b); const tr = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.7, 3.4), mat(0x2f3237)); tr.position.y = 0.35; crane.add(tr); const bm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 13), mat(0xe8b300)); bm.position.set(0, 5.6, 5.0); bm.rotation.x = 0.75; crane.add(bm); }
    crane.position.set(cxm, H(cxm, RIVER.z0 - 4), RIVER.z0 - 4.5); cg.add(crane);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.05, 6, 0.05), mat(0x222222)); hook.position.set(cxm, 4.6, czm + 1.2); cg.add(hook);
    upd((dt, t) => { crane.rotation.y = 0.12 * Math.sin(t * 0.3); });
  }

  // saída do túnel na área afastada: portal na face norte da colina e acesso até a rua do fundo
  {
    const horse = (R, sp) => { const sh = new THREE.Shape(); sh.moveTo(-R, 0); sh.lineTo(-R, sp); sh.absarc(0, sp, R, Math.PI, 0, true); sh.lineTo(R, 0); sh.lineTo(-R, 0); return sh; };
    const outer = horse(5.2, 2.6); outer.holes.push(horse(4.0, 2.6));
    const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 1.6, bevelEnabled: false }), mat(COL.concrete)); frame.castShadow = frame.receiveShadow = true;
    const dark = new THREE.Mesh(new THREE.ShapeGeometry(horse(4.0, 2.6)), new THREE.MeshBasicMaterial({ color: 0x17181c })); dark.position.z = 0.6;
    const portal = new THREE.Group(); portal.add(frame, dark); portal.rotation.y = Math.PI; portal.position.set(EXIT.x, 0, EXIT.zp + 1.4); root.add(portal);
    // muro de testa sobre o portal
    const head = new THREE.Mesh(new THREE.BoxGeometry(14, 2.2, 1.0), mat(0xbab6ad)); head.position.set(EXIT.x, 7.6, EXIT.zp + 1.0); head.castShadow = true; root.add(head);
    const zEnd = ROADS_REMOTE.hz[1] + 3;
    const road = new THREE.Mesh(boxG(7, 0.12, EXIT.zp - zEnd, EXIT.x, 0.06, (EXIT.zp + zEnd) / 2), mat(COL.road, { r: 0.95 })); road.receiveShadow = true; root.add(road);
    const mk = []; for (let z = EXIT.zp - 2; z > zEnd + 1; z -= 6) mk.push(boxG(0.25, 0.02, 3, EXIT.x, 0.13, z));
    root.add(new THREE.Mesh(mergeGeometries(mk), mat(0xf4f1ea)));
    const car = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.0, 1.8), mat(0xc86a5a)); b.position.y = 0.8; car.add(b); const c = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.6), mat(0x86b8d8)); c.position.set(-0.2, 1.6, 0); car.add(c); }
    root.add(car); upd(follower(car, [[EXIT.x - 1.8, 0.12, EXIT.zp + 1], [EXIT.x - 1.8, 0.12, zEnd], [EXIT.x + 1.8, 0.12, zEnd], [EXIT.x + 1.8, 0.12, EXIT.zp + 1]], 6, { yOff: 0.02 }));
  }
  return root;
}
