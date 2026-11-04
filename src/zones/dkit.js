import * as THREE from 'three';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, person } from './fund.js';
import { X1, PZ, baseBox, depthMat, strataQuad, soilColorAt, buildCraneBucket } from './dsite.js';

// ---------------------------------------------------------------------------
// Kit da cava da Zona D (usado por D2, D3, D4...): paredes em camadas, fundo, buraco no terreno,
// escavadeira, guindaste com caçamba, caminhões, escoras em níveis e longarinas.
// cfg: { HW, PX, dmax, pre:[t0,t1,d], wins:[[a,b]], deps:[d], levels:[{y,inset,wal,st:[a,b],wt:[a,b]}], exc:[a,b], crane:[a,b], TC }
// ---------------------------------------------------------------------------
export function createPitKit(root, section, cfg) {
  const { HW, PX, dmax, pre, wins, deps, levels = [], exc: excT, crane: crT, TC = 8 } = cfg;
  const steelM = mat(0xd9772b, { r: 0.55, m: 0.3 }), walM = mat(0x4a5a6a, { r: 0.55, m: 0.3 });
  const U = { value: 0 };
  const wm = depthMat(U);
  const walls = [
    strataQuad(X1, PZ - HW, X1 + PX, PZ - HW, -dmax - 0.3, 0.0), strataQuad(X1, PZ + HW, X1 + PX, PZ + HW, -dmax - 0.3, 0.0), strataQuad(X1 + PX, PZ - HW, X1 + PX, PZ + HW, -dmax - 0.3, 0.0),
  ].map((g) => { const m = new THREE.Mesh(g, wm); m.visible = false; m.receiveShadow = true; root.add(m); return m; });
  const floorM = mat(0x86683f, { r: 1, e: 0x1a1308 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(PX, 2 * HW), floorM); floor.rotation.x = -Math.PI / 2; floor.visible = false; floor.receiveShadow = true; root.add(floor);
  const ROWS = [0.5, 4.3, 8.1, 11.9].map((d) => X1 + d);
  const strutG = (len) => { const g = new THREE.BoxGeometry(0.45, 0.45, len); g.translate(0, 0, len / 2); return g; };
  const walG = new THREE.BoxGeometry(PX, 0.5, 0.5); walG.translate(PX / 2, 0, 0);
  const lv = levels.map((l) => ({
    ...l,
    struts: ROWS.map((x) => { const len = 2 * (HW - l.inset); const m = new THREE.Mesh(strutG(len), steelM); m.position.set(x, l.y, PZ - HW + l.inset); m.castShadow = true; m.visible = false; root.add(m); return m; }),
    wals: [-1, 1].map((s) => { const m = new THREE.Mesh(walG, walM); m.position.set(X1, l.y, PZ + s * (HW - 0.3)); m.castShadow = true; m.visible = false; root.add(m); return m; }),
  }));
  const exc = M.excavator(0.5); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.visible = false; root.add(excW);
  const cr = buildCraneBucket(root, { pit: [X1 + 6.2, PZ], dump: [X1 + 12.5, -16.3] });
  const truck = M.dumpTruck(0xe8b300); truck.scale.setScalar(0.9); truck.rotation.y = Math.PI; truck.visible = false; root.add(truck);
  const tfill = baseBox(3.8, 1, 2.4, mat(0x7a5a3a, { r: 1 })); tfill.position.set(2.1, 0.15, 0); tfill.visible = false; truck.userData.bed.add(tfill);
  const wE = person(0xe8742c), wF = person(0x4a8fd0), wG = person(0xf2b705, 0xffffff); [wE, wF, wG].forEach((p) => root.add(p.group));
  const dAt = (t) => (pre ? pre[2] * ease(win(t, pre[0], pre[1])) : 0) + deps.reduce((s, dp, i) => s + dp * ease(win(t, wins[i][0], wins[i][1])), 0);
  const winIdx = (t) => wins.findIndex(([a, b]) => t >= a && t < b);
  function update(t, tAbs, holeSlot = 0) {
    const d = dAt(t), on = d > 0.02; U.value = d;
    if (on) { terrainHoles[holeSlot].set(X1 - 1, X1 + PX, PZ - HW, PZ + HW); section.setBand(holeSlot, PZ - HW, PZ + HW, -d, 0.05); } else { terrainHoles[holeSlot].set(0, 0, 0, 0); section.setBand(holeSlot, 0, 0, 0, 0); }
    walls.forEach((w) => { w.visible = on; });
    floor.visible = on; floor.position.set(X1 + PX / 2, -d - 0.01, PZ); soilColorAt(-d - 0.3, floorM.color); floorM.emissive.copy(floorM.color).multiplyScalar(0.25);
    lv.forEach((l) => {
      l.struts.forEach((m, i) => { const [a, b] = l.st, n = ROWS.length; const u = ease(win(t, a + (i * (b - a - 2)) / n, a + 2 + (i * (b - a - 2)) / n)); m.visible = u > 0.01; m.scale.z = Math.max(0.001, u); });
      l.wals.forEach((m) => { const u = l.wal === false ? 0 : ease(win(t, l.wt[0], l.wt[1])); m.visible = u > 0.01; m.scale.x = Math.max(0.001, u); });
    });
    const eS = ease(win(t, excT[0], excT[1]));
    excW.visible = eS > 0.01 && on; excW.scale.setScalar(Math.max(0.001, eS)); excW.position.set(X1 + 10.2, -d, PZ + 1.5); exc.update(tAbs * 1.3);
    const cS = ease(win(t, crT[0], crT[1]));
    cr.group.visible = cS > 0.01; cr.group.scale.setScalar(Math.max(0.001, cS));
    const wi = winIdx(t), act = wi >= 0, e = act ? (t - wins[wi][0]) / TC : 0;
    const cyc = cr.cycle(act ? e - Math.floor(e) : 0.14, -d);
    cr.setHook(cyc.x, cyc.y, cyc.z, cyc.fl, cyc.tl);
    let tx = null, fillT = 0;
    wins.forEach(([a, b]) => {
      if (t >= a - 5 && t < b + 5) {
        tx = t < a ? X1 + 36 + (X1 + 11.8 - (X1 + 36)) * ease(win(t, a - 5, a)) : t < b ? X1 + 11.8 : X1 + 11.8 + (X1 + 3.2 - (X1 + 11.8)) * ease(win(t, b, b + 5));
        const nc = (b - a) / TC, ee = (t - a) / TC;
        fillT = t < a ? 0 : t < b ? clamp01((Math.floor(ee) + clamp01(((ee - Math.floor(ee)) - 0.88) / 0.05)) / nc) : 1;
      }
    });
    truck.visible = tx !== null && tx > X1 + 3.25; if (truck.visible) truck.position.set(tx, 0.05, -16.3);
    tfill.visible = fillT > 0.02; tfill.scale.y = Math.max(0.01, 1.1 * fillT);
    const pw = (p, xa, xb, z, sp, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp + ph); p.group.position.set(xa + (xb - xa) * u, 0.07, z); p.group.rotation.y = Math.cos(tAbs * sp + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = 0.1; };
    pw(wE, X1 + 2, X1 + 8, -17.4, 0.4, 0); pw(wF, X1 + 15, X1 + 20, -15.2, 0.35, 2); pw(wG, X1 + 22, X1 + 28, -17.0, 0.3, 4);
    return { d, cyc, winI: wi, floorY: -d };
  }
  return { update, dAt, winIdx, ROWS };
}

// perfuratriz sobre esteiras posicionada em cada estaca (ao lado dela, dentro da cava)
export function rigPlacer(rig, piles, ts, wallFace, tvFn) {
  return (t, tAbs, hideAfter) => {
    const tv = tvFn || ((i) => (i === 0 || piles[i].w !== piles[i - 1].w ? 1.9 : 0.3));
    let kk = 0; for (let i = 0; i < piles.length; i++) if (ts[i] - tv(i) <= t) kk = i;
    const pos = (i) => { const p = piles[i], th = wallFace(p.w); return [p.x - Math.cos(th) * 1.92, p.z + Math.sin(th) * 1.92, th]; };
    const a = kk === 0 ? [X1 + 14, piles[0].z + 1.92, wallFace(piles[0].w)] : pos(kk - 1), b = pos(kk), e = ease((t - (ts[kk] - tv(kk))) / tv(kk));
    rig.group.visible = t < hideAfter;
    rig.group.position.set(a[0] + (b[0] - a[0]) * e, 0, a[1] + (b[1] - a[1]) * e); rig.group.rotation.y = a[2] + (b[2] - a[2]) * e;
    rig.update(tAbs * 1.6);
  };
}
export const wallFaceStd = (w) => (w === 0 ? Math.PI / 2 : w === 1 ? -Math.PI / 2 : 0);
