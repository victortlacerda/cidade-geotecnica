import * as THREE from 'three';
import { COL, rng, REMOTE_DZ, E_XF, xfPt } from '../config.js';
import { H, DAM, PIT, PORTAL, D_PLAT } from '../scene/terrain.js';
import { box, cyl, sph, cone, grp, bar, mat } from '../kit/primitives.js';
import * as M from '../kit/machines.js';
import { follower } from '../kit/paths.js';
import { buildPitShell } from './dpit.js';

const CONC = COL.concrete;

export function buildZones(ctx) {
  const { add, upd, bld, people, keep } = ctx;
  const R = rng(21);

  const put = (obj, x, z, ry = 0, dy = 0) => {
    obj.position.set(x, H(x, z) + dy, z); obj.rotation.y = ry; add(obj); return obj;
  };
  const worker = (x, z, x2, z2) => people.push({ x, z, x2, z2, kind: 'work' });
  const reserve = (x0, x1, z0, z1) => keep.push({ x0, x1, z0, z1 });

  // ===================================================== A — Túneis
  {
    // portal do NATM no pé do corte em bancadas da colina
    const px = -90, pz = PORTAL.zp, py = 0;
    const horse = (R, h, sp) => {
      const sh = new THREE.Shape();
      sh.moveTo(-R, 0); sh.lineTo(-R, sp); sh.absarc(0, sp, R, Math.PI, 0, true); sh.lineTo(R, 0); sh.lineTo(-R, 0);
      return sh;
    };
    const outer = horse(5.5, 0, 3.0);
    outer.holes.push(horse(4.2, 0, 3.0));
    const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 1.8, bevelEnabled: false }), mat(CONC));
    frame.castShadow = frame.receiveShadow = true;
    const dark = new THREE.Mesh(new THREE.ShapeGeometry(horse(4.2, 0, 3.0)), new THREE.MeshBasicMaterial({ color: 0x17181c }));
    dark.position.z = 0.4;
    const portal = grp(frame, dark);
    portal.position.set(px, py, pz - 1.6); portal.name = 'a-portal'; add(portal);
    // plataforma de serviço em frente ao portal
    { const plat = box(17, 0.12, 9, 0x9b9488, px, 0.06, pz + 4.4); plat.name = 'a-platform'; add(plat); }
    const tr = M.dumpTruck(); tr.name = 'a-truck'; add(tr);
    upd(follower(tr, [[px + 2, 0.1, -9], [px + 2, 0.1, pz + 4], [px + 2, 0.1, pz + 4.001], [px + 2, 0.1, -9]], 3.2, { loop: true, yOff: 0.35 }));
    const ex = M.excavator(0.85); put(ex.group, -97, -13, 0.4); upd((d, t) => ex.update(t));
    worker(-86, -14, -84, -12); worker(-94, -13, -91, -10);
    reserve(-103, -76, -58, -6);
    // sítio de ataque da TBM
    const shaft = grp(cyl(4.6, 4.8, 0.9, CONC, 0, 0.45, 0, 24), cyl(3.7, 3.7, 0.2, 0x17181c, 0, 0.92, 0, 24));
    put(shaft, -70, -22);
    const gt = M.gantry(); gt.group.rotation.y = Math.PI / 2; gt.group.position.set(-70, 0, -22); add(gt.group); upd((d, t) => gt.update(t));
    const belt = bar(-66.8, 1.0, -26, -61.5, 6.0, -40, 1.1, 0x5a5e66); add(belt);
    const silo = grp(cyl(3.2, 3.2, 7, 0xaeb4bc, 0, 3.5, 0, 18), cone(3.4, 2, 0x8f959e, 0, 8, 0, 18)); put(silo, -61.5, -43.5);
    const blobs = [];
    for (let i = 0; i < 7; i++) { const b = sph(0.55, 0x8a6f52, 0, 0, 0, 8); add(b); blobs.push(b); }
    upd((d, t) => blobs.forEach((b, i) => {
      const u = ((t * 0.12 + i / blobs.length) % 1);
      b.position.set(-61.5, 1.6 + 5 * u, -26 - 14 * u);
    }));
    const t2 = M.dumpTruck(); add(t2);
    upd(follower(t2, [[-60.2, -12], [-60.2, -52], [-77.5, -52], [-77.5, -12]], 6));
    worker(-64, -24, -62, -29); worker(-60, -20, -60, -15);
    reserve(-73, -57, -58, -10);
  }

  // zonas F e H: ficam na área afastada, do outro lado do rio; o grupo é deslocado de REMOTE_DZ e as alturas vêm do terreno deslocado
  const HL = (x, z) => H(x, z + REMOTE_DZ);
  // ===================================================== F — Obras de terra e encostas
  {
    const fg = new THREE.Group(); fg.name = 'f-terra'; fg.position.z = REMOTE_DZ; ctx.add(fg);
    const add = (o) => fg.add(o);
    const put = (obj, x, z, ry = 0, dy = 0) => { obj.position.set(x, HL(x, z) + dy, z); obj.rotation.y = ry; fg.add(obj); return obj; };
    const ro = M.roller(); add(ro);
    upd(follower(ro, [[-44, -11.5], [-22, -11.5]], 3, { loop: false, hFn: HL }));
    const ex = M.excavator(0.9); put(ex.group, -17.5, -22, 3.3); upd((d, t) => ex.update(t));
    const tk = M.dumpTruck(); add(tk);
    upd(follower(tk, [[-47, -8], [-8, -8], [-8, -15], [-47, -15]], 7, { hFn: HL }));
    // muro de gabião no pé da encosta
    for (let i = 0; i < 9; i++) put(box(3.6, 1.5, 1.4, 0xcbbfa6), -39 + i * 3.7, -18.5, 0, 0.75);
    worker(-30, -13 + REMOTE_DZ, -26, -11 + REMOTE_DZ); worker(-14, -12 + REMOTE_DZ, -12, -10 + REMOTE_DZ);
    reserve(-49, -5, -58 + REMOTE_DZ, -6 + REMOTE_DZ);
  }

  // ===================================================== H — Barragens e rejeitos
  {
    const hg = new THREE.Group(); hg.name = 'h-dam'; hg.position.z = REMOTE_DZ; ctx.add(hg);
    const add = (o) => hg.add(o);
    const put = (obj, x, z, ry = 0, dy = 0) => { obj.position.set(x, HL(x, z) + dy, z); obj.rotation.y = ry; hg.add(obj); return obj; };
    // barragem de terra (seção trapezoidal com bermas)
    const prof = new THREE.Shape();
    const pts = [[16, -0.5], [11.5, 2.7], [9, 2.7], [4.6, 5.4], [2.6, 5.4], [1.5, DAM.crest], [-1.5, DAM.crest], [-15.5, -0.5]];
    prof.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => prof.lineTo(p[0], p[1])); prof.lineTo(pts[0][0], pts[0][1]);
    const len = DAM.x1 - DAM.x0;
    const g = new THREE.ExtrudeGeometry(prof, { depth: len, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(DAM.x1, 0, DAM.zc);
    const dam = new THREE.Mesh(g, mat(0xcdc3ab)); dam.castShadow = dam.receiveShadow = true; add(dam);
    add(box(len - 4, 0.2, 2.6, 0x7d8087, DAM.cx, DAM.crest + 0.1, DAM.zc));
    // reservatório: células do terreno abaixo do nível d'água
    const wp = [];
    const x0 = 8, x1 = 46, zA = -62, zB = DAM.zc - 3.8, st = 0.5;
    for (let x = x0; x < x1; x += st) for (let z = zA; z < zB; z += st) {
      const hc = HL(x + st / 2, z + st / 2);
      if (hc < DAM.water - 0.1) {
        wp.push(x, DAM.water, z, x, DAM.water, z + st, x + st, DAM.water, z, x + st, DAM.water, z, x, DAM.water, z + st, x + st, DAM.water, z + st);
      }
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.computeVertexNormals();
    const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: COL.water, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 }));
    water.receiveShadow = true; add(water);
    // vertedouro (canal) ao lado
    put(box(5, 0.5, 14, 0xdad6cc), DAM.x0 + 4, DAM.zc + 7, 0, 3.4).rotation.x = 0.2;
    const tk = M.dumpTruck(); add(tk);
    upd(follower(tk, [[DAM.x0 + 5, DAM.crest + 0.15, DAM.zc], [DAM.x1 - 5, DAM.crest + 0.15, DAM.zc]], 4, { loop: false, yOff: 0.0, hFn: HL }));
    // pilha de rejeitos em bancadas
    const pile = new THREE.Group();
    [[6.2, 1.5], [5, 1.5], [3.8, 1.5], [2.6, 1.5]].forEach(([r, h], i) => {
      pile.add(cyl(r - 0.4, r, h, i % 2 ? 0xb6a591 : 0xa89886, 0, 0.75 + i * 1.5, 0, 18));
    });
    put(pile, 41, -11.2);
    const dz = M.excavator(0.7); put(dz.group, 31, -12, 0.2); upd((d, t) => dz.update(t));
    const t3 = M.dumpTruck(); add(t3);
    upd(follower(t3, [[34, -9], [49, -9], [49, -15], [34, -15]], 5, { hFn: HL }));
    worker(14, -12 + REMOTE_DZ, 20, -10 + REMOTE_DZ);
    reserve(-0.5 + 4, 50, -58 + REMOTE_DZ, -6 + REMOTE_DZ);
  }

  // ===================================================== D — Escavações e contenções
  {
    const { cx, cz, hx, hz } = PIT;
    const gd = buildPitShell(); gd.name = 'd-pit'; add(gd);   // casca da cava + tudo o que está nela
    const wt = 0.7, wy = -3.7, wh = 8.7;
    const rim = (w, d, x, z) => gd.add(box(w, wh, d, 0xb9b5ab, x, wy, z));
    rim(2 * hx + 2.8, wt, cx, cz - hz - 0.5); rim(2 * hx + 2.8, wt, cx, cz + hz + 0.5);
    rim(wt, 2 * hz + 1, cx - hx - 0.5, cz); rim(wt, 2 * hz + 1, cx + hx + 0.5, cz);
    // escoramento
    for (const y of [-1.6, -5]) for (const dz of [-6, 0, 6]) gd.add(box(2 * hx + 0.4, 0.55, 0.55, COL.orange, cx, y, cz + dz));
    for (const y of [-1.6, -5]) for (const dx of [-8, 8]) gd.add(box(0.55, 0.55, 2 * hz + 0.4, COL.orange, cx + dx, y, cz));
    const putD = (obj, x, z, ry = 0) => { obj.position.set(x, -PIT.depth, z); obj.rotation.y = ry; gd.add(obj); return obj; };
    const ex = M.excavator(1.0); putD(ex.group, 74, -33, 0.3); upd((d, t) => ex.update(t));
    const ex2 = M.excavator(0.8); putD(ex2.group, 86, -36, 3.2); upd((d, t) => ex2.update(t + 2));
    const tk = M.dumpTruck(); gd.add(tk);
    upd(follower(tk, [[87.5, -8 + 0.0, -25], [87.5, -8, -20], [87.5, 0, -8.6], [87.5, 0, -4], [87.5, 0, -8.6], [87.5, -8, -20]], 4.5, { loop: true, yOff: 0.35 }));
    const cr = M.towerCrane(26); put(cr.group, 63.5, -30); gd.add(cr.group); upd((d, t) => cr.update(t));
    worker(70, -45, 74, -45); worker(100, -20, 100, -12); worker(66, -16, 70, -14);
    reserve(58, 104, -58, -6);
  }

  // ===================================================== B — Fundação direta
  {
    const hs = [[-92, 16], [-70, 16], [-92, 32], [-70, 32], [-92, 48], [-70, 48]];
    // 0 casa, 1 sapata corrida, 2 casa, 3 radier, 4 sapatas isoladas, 5 casa
    bld.addHouse(hs[0][0], 0, hs[0][1], 9, 8, 0, 0xc4684a);
    bld.addHouse(hs[2][0], 0, hs[2][1], 9, 8, 0, 0x8c9aa6);
    bld.addHouse(hs[5][0], 0, hs[5][1], 9, 8, 0, 0xc4684a);
    { // sapata corrida: faixa em U com valeta
      const [x, z] = hs[1];
      const gs = new THREE.Group(); gs.name = 'b-sapata'; add(gs);
      for (const [w, d, dx, dz] of [[10, 0.9, 0, 4.5], [10, 0.9, 0, -4.5], [0.9, 8, -4.6, 0], [0.9, 8, 4.6, 0]]) gs.add(box(w, 0.5, d, 0xa7a39a, x + dx, 0.25, z + dz));
      for (const [w, d, dx, dz] of [[10, 0.3, 0, 4.5], [10, 0.3, 0, -4.5]]) gs.add(box(w, 0.9, d, 0xcfcac0, x + dx, 0.7, z + dz));
      worker(x - 3, z + 6, x + 3, z + 6);
    }
    { // radier
      const [x, z] = hs[3];
      const gr = new THREE.Group(); gr.name = 'b-radier'; add(gr);
      gr.add(box(10.5, 0.4, 9, 0xc3beb3, x, 0.2, z));
      gr.add(box(10.9, 0.15, 9.4, 0x6f6b63, x, 0.07, z));
      for (let i = -4; i <= 4; i += 2) gr.add(box(0.08, 0.1, 8.6, 0x4b4f55, x + i * 1.1, 0.45, z));
      worker(x - 2, z + 5.5, x + 4, z + 5.5);
    }
    { // sapatas isoladas com pilares
      const [x, z] = hs[4];
      const gi = new THREE.Group(); gi.name = 'b-isol'; add(gi);
      for (const dx of [-4, 0, 4]) for (const dz of [-3, 3]) {
        gi.add(box(2, 0.6, 2, 0xb5b0a5, x + dx, 0.3, z + dz));
        gi.add(box(0.45, 2.4, 0.45, 0x8b8f96, x + dx, 1.8, z + dz));
      }
      worker(x + 6, z, x + 6, z + 4);
    }
    const mx = M.mixerTruck(); add(mx);
    upd(follower(mx, [[-79, 8], [-79, 56], [-83, 56], [-83, 8]], 5));
    upd((d, t) => { mx.userData.spin.rotation.x = t * 2; });
    worker(-81, 24, -81, 28);
    reserve(-103, -59, 7, 57);
  }

  // ===================================================== C — Fundação profunda
  {
    // prédio em estrutura: pilares e lajes
    const cx = -27, cz = 34;
    for (let f = 0; f < 7; f++) {
      const y = f * 3.2;
      add(box(15, 0.45, 15, 0xcfcac0, cx, y + 0.3, cz));
      if (f < 6) for (const dx of [-6.5, -2.2, 2.2, 6.5]) for (const dz of [-6.5, -2.2, 2.2, 6.5]) add(box(0.55, 3.2, 0.55, 0xbab6ad, cx + dx, y + 2, cz + dz));
    }
    add(box(15.4, 0.12, 0.12, COL.orange, cx, 12.5, cz + 7.6)); // guarda-corpo
    const cr = M.towerCrane(30); put(cr.group, -13, 44); upd((d, t) => cr.update(t));
    const rig = M.pilingRig(); rig.group.name = 'c-rig'; put(rig.group, -42, 18, 0.2); upd((d, t) => rig.update(t));
    for (const [x, z] of [[-38, 13], [-35, 23], [-44, 26]]) add(cyl(0.45, 0.45, 0.5, 0x8b8f96, x, 0.25, z, 8));
    const mx = M.mixerTruck(); add(mx);
    upd(follower(mx, [[-46, 10], [-46, 54], [-8, 54], [-8, 10]], 5));
    upd((d, t) => { mx.userData.spin.rotation.x = t * 2; });
    const tk = M.dumpTruck(); add(tk);
    upd(follower(tk, [[-8, 54], [-8, 10], [-46, 10], [-46, 54]], 4));
    worker(-20, 22, -33, 22); worker(-44, 30, -44, 36); worker(-20, 46, -16, 48);
    reserve(-49, -5, 7, 57);
  }

  // ===================================================== E — Vias e pavimentos
  {
    const z = 32, w = 12;
    // modelada ao longo de x no antigo lote de E; o grupo gira para a avenida central (E_XF)
    const eg = new THREE.Group(); eg.name = 'e-road'; eg.rotation.y = E_XF.rot; eg.position.set(E_XF.ox, 0, E_XF.oz); add(eg);
    const wE = (x, z, x2, z2) => { const [a, b] = xfPt(E_XF, x, z), [c, d] = xfPt(E_XF, x2, z2); worker(a, b, c, d); };
    const seg = (x0, x1, c, y = 0.07, hh = 0.14) => eg.add(box(x1 - x0, hh, w, c, (x0 + x1) / 2, y, z));
    seg(4, 17, 0x6c7077); seg(17, 24, 0x948a7d, 0.05, 0.1); seg(24, 50, 0x34363b, 0.09, 0.18);
    for (let x = 6; x < 17; x += 4) eg.add(box(2, 0.02, 0.2, 0xf4f1ea, x, 0.16, z));
    const ro = M.roller(); eg.add(ro); upd(follower(ro, [[25, z - 2], [40, z - 2]], 2.8, { loop: false, yOff: 0.18 }));
    const ro2 = M.roller(); eg.add(ro2); upd(follower(ro2, [[40, z + 2], [26, z + 2]], 2.4, { loop: false, yOff: 0.18 }));
    const pv = M.paver(); eg.add(pv); upd(follower(pv, [[19, z], [22, z]], 0.9, { loop: false, yOff: 0.1 }));
    const tk = M.dumpTruck(); eg.add(tk); upd(follower(tk, [[5, z + 5], [15, z + 5]], 3, { loop: false, yOff: 0.1 }));
    const cones = [];
    for (let x = 6; x < 50; x += 3) { cones.push([x, 0.05, z - 7]); cones.push([x, 0.05, z + 7]); }
    M.trafficCones(eg, cones);
    // bloco de camadas do pavimento (corte didático)
    const ly = [[0.55, 0x2d2f33], [0.7, 0x777b82], [0.9, 0xc9b48a], [1.1, 0x8d6a4d]];
    let yb = 0;
    for (let i = ly.length - 1; i >= 0; i--) { eg.add(box(5, ly[i][0], 4, ly[i][1], 46, yb + ly[i][0] / 2 + 0.15, 42.5)); yb += ly[i][0]; }
    wE(28, z - 6.5, 36, z - 6.5); wE(30, z + 6.5, 38, z + 6.5);
  }

  // ===================================================== G — Investigação e ensaios
  {
    const gg = new THREE.Group(); gg.name = 'g-inv'; ctx.add(gg);
    const add = (o) => gg.add(o);
    const put = (obj, x, z, ry = 0, dy = 0) => { obj.position.set(x, H(x, z) + dy, z); obj.rotation.y = ry; gg.add(obj); return obj; };
    // laboratório
    const lab = new THREE.Group();
    lab.add(box(13, 6.2, 9, 0xf4f1ea, 0, 3.1, 0), box(13.6, 0.5, 9.6, 0x6fa3c7, 0, 6.45, 0), box(2.6, 3.6, 0.3, 0x7ba7c4, -3, 1.8, 4.6), box(2.6, 3.6, 0.3, 0x7ba7c4, 3, 1.8, 4.6));
    for (const x of [-4.5, -1.5, 1.5, 4.5]) lab.add(box(1.8, 1.6, 0.2, COL.glass, x, 4.3, 4.55));
    // frasco de Erlenmeyer no telhado
    lab.add(cone(1.5, 2.6, 0x7fc4d8, 4.2, 8.0, 0, 14), cyl(0.5, 0.5, 1.1, 0x7fc4d8, 4.2, 9.8, 0, 12));
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
    const c2 = cv.getContext('2d'); c2.fillStyle = '#23303d'; c2.fillRect(0, 0, 512, 96);
    c2.fillStyle = '#f2b705'; c2.font = '700 54px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.fillText('LABORATÓRIO', 256, 52);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    const sign = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 0.3), [mat(0x23303d), mat(0x23303d), mat(0x23303d), mat(0x23303d), new THREE.MeshBasicMaterial({ map: tx }), mat(0x23303d)]);
    sign.position.set(-1.2, 8.3, 3.8); sign.castShadow = true; lab.add(sign);
    for (const x of [-5, 2.6]) lab.add(box(0.3, 1.6, 0.3, 0x23303d, x, 7.2, 3.8));
    put(lab, 94, 44);
    // sondagens SPT
    const sp1 = M.tripodRig(); put(sp1.group, 72, 16); upd((d, t) => sp1.update(t));
    const sp2 = M.tripodRig(); put(sp2.group, 86, 22, 0.8); upd((d, t) => sp2.update(t + 1.7));
    worker(75, 17, 76, 20); worker(89, 21, 90, 24);
    // CPT: caminhão com mastro
    const cpt = new THREE.Group();
    cpt.add(box(7, 0.8, 2.8, COL.dark, 0, 1.2, 0), box(2, 1.9, 2.6, 0xf4f1ea, 2.8, 2.1, 0), box(4.2, 2.8, 2.6, 0xe9e6de, -1.2, 2.6, 0), box(0.5, 4.5, 0.5, COL.orange, -3.2, 4.6, 0));
    for (const x of [-2.2, -0.6, 2.6]) for (const z of [1.4, -1.4]) { const w = cyl(0.75, 0.75, 0.6, 0x2b2d31, x, 0.75, z, 12); w.rotation.x = Math.PI / 2; cpt.add(w); }
    put(cpt, 68, 36, 0.2);
    // piezômetros
    for (let i = 0; i < 4; i++) { const x = 80 + i * 3.4, z = 32 + (i % 2) * 2.2; put(cyl(0.18, 0.18, 1.8, 0x8b8f96, 0, 0, 0, 8), x, z, 0, 0.9); put(cyl(0.3, 0.3, 0.3, 0x5aa8d8, 0, 0, 0, 8), x, z, 0, 1.9); }
    // tenda de apoio
    put(box(5, 2.4, 4, 0xe6c477), 66, 22, 0.1, 1.2);
    put(cone(3.9, 1.6, COL.orange, 0, 0, 0, 4), 66, 22, Math.PI / 4, 3.2);
    worker(94, 52, 100, 52); worker(60, 40, 64, 46);
    reserve(59, 103, 7, 57);
  }

  // ===================================================== C deitada — canteiro de fundações profundas (antigo lote de E)
  {
    // modelado no antigo lote de trás da C; o grupo desloca a cena para o antigo lote de E
    const OX = 58, OZ = 64, cg = new THREE.Group(); cg.position.set(OX, 0, OZ); ctx.add(cg);
    const add = (o) => cg.add(o), put = (obj, x, z, ry = 0, dy = 0) => { obj.position.set(x, H(x + OX, z + OZ) + dy, z); obj.rotation.y = ry; cg.add(obj); return obj; };
    const worker = (x, z, x2, z2) => people.push({ x: x + OX, z: z + OZ, x2: x2 + OX, z2: z2 + OZ, kind: 'work' });
    // prédio alto em estrutura, com grua; estacas pré-moldadas sendo cravadas; hélice contínua com betoneira; tubulão
    const cr = M.towerCrane(34); put(cr.group, -44, -50); upd((d, t) => cr.update(t + 3));
    for (let f = 0; f < 6; f++) {
      add(box(18, 0.35, 12, 0xbab6ad, -22, 1.2 + f * 3.2, -48));
      for (const dx of [-8.5, -2.8, 2.8, 8.5]) for (const dz of [-5.5, 5.5]) add(box(0.6, 3.2, 0.6, 0x9a968e, -22 + dx, f * 3.2 + 2.9, -48 + dz));
    }
    add(box(18.6, 1.2, 12.6, 0x8f8b84, -22, 0.6, -48));
    const rig1 = M.pilingRig(); put(rig1.group, -40, -27, 0.3); upd((d, t) => rig1.update(t + 1.1));
    const piles = new THREE.Group(); for (let i = 0; i < 6; i++) piles.add(box(9, 0.5, 0.5, 0xcfcac0, 0, 0.25 + (i % 3) * 0.5, -0.6 + Math.floor(i / 3) * 0.6 + (i % 3) * 0.02)); put(piles, -30, -33);
    for (let i = 0; i < 9; i++) add(cyl(0.3, 0.3, 0.6, 0x9a968e, -42 + (i % 3) * 2.2, 0.3, -20 + Math.floor(i / 3) * 2.2, 8));
    const rig2 = M.pilingRig(); put(rig2.group, -18, -22, -0.4); upd((d, t) => rig2.update(t + 2.4));
    const mx = M.mixerTruck(); put(mx, -12, -29, Math.PI / 2);
    // tubulão: boca circular com guincho
    add(cyl(1.3, 1.3, 0.25, 0x17181c, -14, 0.13, -14, 16)); add(cyl(1.6, 1.6, 0.4, CONC, -14, 0.2, -14, 16));
    add(bar(-15.4, 0, -14, -14, 3.2, -14, 0.14, 0x5a5e66)); add(bar(-12.6, 0, -14, -14, 3.2, -14, 0.14, 0x5a5e66)); { const w = cyl(0.3, 0.3, 1.6, COL.orange, -14, 3.2, -14, 8); w.rotation.z = Math.PI / 2; add(w); }
    worker(-36, -30, -33, -30); worker(-16, -18, -12, -18); worker(-26, -40, -18, -40);
  }

  // ===================================================== D ampliada — contenções (antigo lote de H)
  {
    // platô alto no fundo (terreno), contido por uma cortina atirantada; na frente, ensecadeira de estacas-prancha com ponteiras filtrantes
    const { x0, x1, zf, hp } = D_PLAT;
    add(box(x1 - x0, hp + 1.2, 0.6, 0xbab6ad, (x0 + x1) / 2, (hp + 1.2) / 2 - 0.6, zf + 0.25));
    for (let x = x0 + 2; x < x1 - 1; x += 3) for (const y of [1.4, 3.3]) { add(box(0.7, 0.7, 0.3, 0x7d8087, x, y, zf + 0.65)); }
    for (let x = x0 + 3.5; x < x1 - 1; x += 6) { const dr = cyl(0.12, 0.12, 0.5, 0x2f3237, x, 0.5, zf + 0.7, 6); dr.rotation.x = Math.PI / 2; add(dr); }
    add(box(x1 - x0, 0.25, 1.2, 0x9aa0a6, (x0 + x1) / 2, 0.12, zf + 1.3));
    const ex = M.excavator(0.8); put(ex.group, 40, zf + 6, -2.4); upd((d, t) => ex.update(t + 0.7));
    // ensecadeira: anel de estacas-prancha (perfil corrugado) com rebaixamento por ponteiras
    const cx = 22, cz = -20, hx = 7, hz = 5;
    for (let x = -hx; x <= hx; x += 0.8) for (const s of [-1, 1]) add(box(0.8, 2.2, 0.16, (Math.round(x / 0.8) % 2) ? 0x6f757d : 0x5a6068, cx + x, 1.0, cz + s * hz + ((Math.round(x / 0.8) % 2) ? 0.12 : -0.12)));
    for (let z = -hz; z <= hz; z += 0.8) for (const s of [-1, 1]) add(box(0.16, 2.2, 0.8, (Math.round(z / 0.8) % 2) ? 0x6f757d : 0x5a6068, cx + s * hx + ((Math.round(z / 0.8) % 2) ? 0.12 : -0.12), 1.0, cz + z));
    add(box(2 * hx - 0.4, 0.05, 2 * hz - 0.4, 0x6b5536, cx, 0.03, cz));
    for (let x = -hx + 1; x < hx; x += 2) for (const s of [-1, 1]) add(cyl(0.07, 0.07, 1.2, 0x2f78c4, cx + x, 0.6, cz + s * (hz + 1.1), 6));
    add(box(2 * hx, 0.18, 0.18, 0x2f78c4, cx, 1.15, cz - hz - 1.1)); add(box(2 * hx, 0.18, 0.18, 0x2f78c4, cx, 1.15, cz + hz + 1.1));
    add(box(1.6, 1.1, 1.0, COL.orange, cx + hx + 2.5, 0.55, cz - hz - 1.1));
    const vib = M.pilingRig(); put(vib.group, cx + hx + 5, cz + 2, Math.PI); upd((d, t) => vib.update(t + 3.3));
    worker(cx - 3, cz - hz - 2.2, cx + 3, cz - hz - 2.2); worker(14, zf + 3, 22, zf + 3);
  }

  // ===================================================== I — Geotecnia ambiental: aterro sanitário (canto esquerdo da área afastada)
  // Fica na metade de trás do lote, ao lado da rua que sai do portal do túnel: os caminhões de lixo vêm da cidade pelo túnel.
  {
    const cx = -71, cz = -138;
    add(box(27, 0.25, 23, 0x1d1f23, cx, 0.12, cz));                                   // manta de fundo aparente na borda
    [[25, 21, 2.2], [20, 16, 2.2], [15, 11, 2.0]].forEach(([w, d, h], i) => {
      const y0 = 0.25 + i * 2.2; add(box(w, h, d, i % 2 ? 0x8f8368 : 0x9a8d74, cx + i * 0.8, y0 + h / 2, cz - i * 0.6));
      add(box(w - 1.2, 0.3, 0.7, 0x6f9c50, cx + i * 0.8, y0 + h + 0.15, cz - i * 0.6 + d / 2 - 0.5));
    });
    // célula em operação no topo: lixo espalhado e compactado, com cobertura diária ao lado
    const top = 0.25 + 6.4, ccx = cx + 0.6, ccz = cz - 1.5;
    const R2 = rng(77), trash = [0xc9b48a, 0x7ea58a, 0xc86a5a, 0x6fa3c7, 0xd9d4c8, 0x4d5560];
    for (let i = 0; i < 46; i++) add(box(0.4 + R2() * 0.8, 0.3 + R2() * 0.3, 0.4 + R2() * 0.8, trash[i % 6], ccx - 6 + R2() * 7, top + 0.2, ccz - 4 + R2() * 7));
    add(box(5, 0.3, 9.5, 0x9b7650, ccx + 4.5, top + 0.15, ccz));
    const comp = M.roller(); add(comp); upd(follower(comp, [[ccx - 5, top + 0.05, ccz - 2.5], [ccx, top + 0.05, ccz - 2.5], [ccx, top + 0.05, ccz + 1.8], [ccx - 5, top + 0.05, ccz + 1.8]], 1.4, { yOff: 0.2 }));
    // drenos de gás e queimador
    for (const [x, z, y] of [[cx - 8, cz - 7, 4.65], [cx + 8, cz - 7, 4.65], [cx - 8, cz + 6, 4.65], [cx + 8, cz + 6, 4.65], [cx - 3, cz + 2, 6.65]]) {
      add(cyl(0.22, 0.22, 2.6, 0x7d8087, x, y + 1.3, z, 8)); add(cyl(0.4, 0.4, 0.35, 0x3a3e45, x, y + 2.7, z, 8));
    }
    const fx = cx + 11, fz = -121.5;
    const flare = sph(0.5, 0xffa13a, fx, 4.2, fz, 8); flare.material.emissive = new THREE.Color(0xff7a1a); add(flare); add(cyl(0.28, 0.32, 3.4, 0x5a5e66, fx, 1.7, fz, 8));
    upd((d, t) => { const k = 0.85 + 0.25 * Math.sin(t * 9) * Math.sin(t * 3.3); flare.scale.setScalar(k); flare.material.emissiveIntensity = 1.2 + 0.6 * k; });
    // lagoa de chorume (com manta), na frente do aterro
    add(box(10, 0.2, 6, 0x1d1f23, cx + 3, 0.1, -121.5)); add(box(9, 0.12, 5, 0x5d5236, cx + 3, 0.26, -121.5));
    // acesso a partir da rua do túnel e caminhão de lixo
    add(box(4, 0.13, 6, COL.road, -86, 0.07, -131));
    const tk1 = M.dumpTruck(0x2f9c5a); add(tk1); upd(follower(tk1, [[-91.8, -124], [-91.8, -131], [-84.5, -131]], 3.2, { loop: false }));
    // cerca
    for (let x = cx - 14; x <= cx + 13; x += 2.2) for (const z of [cz - 13, -125.5]) add(box(0.1, 1.6, 0.1, 0x5a5e66, x, 0.8, z));
    for (let z = cz - 13; z <= -125.5; z += 2.2) for (const x of [cx - 14, cx + 13]) if (!(x === cx - 14 && Math.abs(z + 131) < 2.5)) add(box(0.1, 1.6, 0.1, 0x5a5e66, x, 0.8, z));
    worker(cx + 6, -124.5, cx + 1, -124.5);
  }

  // ===================================================== A ampliada — pátio de aduelas e poço de um segundo túnel
  {
    // anéis de aduelas empilhados (arcos de concreto), poço circular com guindaste e pilha de bota-fora
    const segG = new THREE.TorusGeometry(2.6, 0.28, 6, 10, Math.PI / 2.4);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) for (let h = 0; h < 2; h++) {
      const m = new THREE.Mesh(segG, mat(0xbab6ad)); m.rotation.set(0, Math.PI / 2, Math.PI / 2 - Math.PI / 4.8); m.position.set(-48 + c * 3.2, 0.35 + h * 0.62, -52 + r * 4.2); m.castShadow = true; add(m);
    }
    const shaft = grp(cyl(4.2, 4.4, 0.9, CONC, 0, 0.45, 0, 24), cyl(3.4, 3.4, 0.2, 0x17181c, 0, 0.92, 0, 24)); put(shaft, -40, -24);
    const cr = M.towerCrane(22); put(cr.group, -46, -14); upd((d, t) => cr.update(t + 5));
    put(cone(4.5, 2.6, 0x8a6f52, 0, 0, 0, 10), -36, -40, 0, 1.3);
    const ld = M.dumpTruck(); add(ld); upd(follower(ld, [[-33, -12], [-33, -46], [-36, -46], [-36, -12]], 4));
    worker(-44, -30, -38, -30); worker(-46, -46, -44, -40);
  }

  // ===================================================== E — usina de asfalto e pátio de agregados (faixa ao lado da avenida)
  {
    // tambor secador, silos de massa quente, filtro e chaminé; pilhas de brita e areia; pá carregadeira
    const drum = cyl(1.3, 1.3, 9, 0x7d8087, 0, 0, 0, 16); drum.rotation.z = Math.PI / 2 - 0.08; drum.position.set(-19, 2.2, -46); add(drum);
    for (const x of [-25, -13]) add(box(0.4, 2.0, 0.4, 0x5a5e66, x, 1.0, -46));
    for (let i = 0; i < 3; i++) { add(cyl(1.4, 1.4, 6, 0xc9c4b8, -24 + i * 3.2, 4.8, -53, 14)); add(cone(1.45, 1.2, 0xa9a49a, -24 + i * 3.2, 1.2, -53, 14)); add(box(0.3, 2.4, 0.3, 0x5a5e66, -24 + i * 3.2, 1.2, -53)); }
    add(box(3.2, 3.6, 3.2, 0x6f757d, -12, 1.8, -53)); add(cyl(0.5, 0.6, 9, 0x8a8f96, -12, 8, -53, 10));
    [[0x8f8b84, -24, -36], [0xa6a197, -18, -36], [0xd8c48e, -12, -36], [0x8f8b84, -24, -28], [0xbab4a8, -18, -28]].forEach(([c, x, z]) => put(cone(3.0, 2.2, c, 0, 0, 0, 10), x, z, 0, 1.1));
    const ld = M.excavator(0.7); put(ld.group, -14, -22, 2.6); upd((d, t) => ld.update(t + 1.9));
    const tk = M.dumpTruck(0x34363b); add(tk); upd(follower(tk, [[-10.5, -14], [-10.5, -50], [-14, -50], [-14, -14]], 3.6));
    worker(-20, -42, -16, -42);
  }
}
