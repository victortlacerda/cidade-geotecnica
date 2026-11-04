import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as M from '../kit/machines.js';
import { terrainHoles } from '../scene/terrain.js';
import { ease, clamp01, win, mat, noclip, piece, capRect, person, plateCompactor, stream, barSet, WET, CURED } from './fund.js';

// ---------------------------------------------------------------------------
// B1 Sapata isolada e B5 Sapata associada: mesmo método, geometrias diferentes.
// Seção em x = X1 passando pelo eixo do(s) pilar(es). Local da obra: (-92, 48).
// ---------------------------------------------------------------------------
const X1 = -92, CZ = 48, DV = 1.6;
const T = {
  stakes: 1.6, dig1: 6.0, s1: 6.8, comp1: 8.2, last1: 9.8, s2: 10.4, form0: 10.8, form1: 12.6, bars0: 12.8, bars1: 15.4,
  pil0: 15.6, pil1: 18.2, pf0: 18.0, pf1: 19.8, s3: 20.4, truckIn: 21.6, pour0: 21.8, pour1: 24.4, pp1: 27.4, truckOut: 28.8,
  s4: 29.4, un0: 29.8, un1: 31.0, bulb0: 36.9, END: 41,
};
const LIFTS = [[31.2, 32.6, -1.1], [32.6, 34.0, -0.8], [34.0, 35.4, -0.4], [35.4, 36.8, 0]];

const CFG = {
  B1: {
    id: 'B1', nome: 'Sapata isolada', foot: { fx: 2.4, fz: 2.4, y0: -1.5, y1: -0.8 }, dv: 1.6,
    cols: [{ z: CZ, s: 0.4, top: 2.0, load: 1 }], pit: { hx: 1.9, hz: 1.9 },
    nz: 5, nx: 5, top: false,
    steps: [
      { t: 'Locação e escavação do cavado', d: 'A topografia marca o centro do pilar com estacas e linhas (o gabarito). A retroescavadeira abre o cavado quadrado na profundidade de projeto, com folga em volta para o trabalho das formas.' },
      { t: 'Apiloar e lançar o lastro', d: 'O fundo é apiloado para nivelar e compactar o solo. Em cima vai o lastro de concreto magro, uma camada fina que dá base limpa para a armação e protege o aço do contato com a terra.' },
      { t: 'Formas e armação', d: 'As formas de madeira definem a sapata. A malha de aço fica sobre calços, com cobrimento de concreto, e as barras do arranque do pilar sobem com estribos. Por fim, a forma do pilar.' },
      { t: 'Concretar sapata e pilar', d: 'O caminhão betoneira lança o concreto: primeiro a sapata, depois o pilar, em sequência, para que formem uma peça só. O concreto é adensado e começa a curar.' },
      { t: 'Desformar, reaterrar e compactar', d: 'As formas saem e o cavado é reaterrado em camadas finas, cada uma compactada. A sapata espalha a carga do pilar sobre uma área maior; o bulbo mostra até onde as tensões chegam no solo.' },
    ],
    labels: [{ k: 'sap', t: 'Sapata' }, { k: 'pil', t: 'Pilar' }, { k: 'lastro', t: 'Lastro' }, { k: 'arm', t: 'Armação' }, { k: 'forma', t: 'Forma' }, { k: 'bulbo', t: 'Bulbo de tensões' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] }],
    bulb: [[1, 2.3, 3.2], [0.7, 1.6, 2.2], [0.4, 0.9, 1.3]],
    cam: { tx: -91, ty: -1.2, tz: CZ, yaw: -1.3, pitch: 0.25, dist: 15 },
    mcam: { tx: -91, ty: -3.7, tz: CZ, yaw: -1.3, pitch: 0.22, dist: 21 },
  },
  B5: {
    id: 'B5', nome: 'Sapata associada', foot: { fx: 2.6, fz: 5.6, y0: -1.6, y1: -0.8 }, dv: 1.7,
    cols: [{ z: CZ - 1.5, s: 0.5, top: 2.0, load: 1.3 }, { z: CZ + 1.5, s: 0.4, top: 2.0, load: 0.8 }], pit: { hx: 2.0, hz: 3.5 },
    nz: 5, nx: 12, top: true,
    steps: [
      { t: 'Escavação do cavado maior', d: 'Dois pilares muito próximos: as sapatas isoladas se encostariam. O cavado é aberto para uma só sapata que abrange os dois pilares, alinhado pelo gabarito.' },
      { t: 'Apiloar e lançar o lastro', d: 'Fundo apiloado e lastro de concreto magro, igual à sapata isolada, só que mais comprido.' },
      { t: 'Formas e armação para dois pilares', d: 'A armação inferior leva as cargas dos pilares ao solo; entre os pilares a peça trabalha ao contrário, por isso há barras também no topo. Os dois arranques sobem com estribos.' },
      { t: 'Concretar a sapata comum e os pilares', d: 'Concreto lançado na sapata inteira, de ponta a ponta, e depois nos dois pilares. Uma peça só, monolítica, que reparte as duas cargas.' },
      { t: 'Desformar e reaterrar', d: 'Formas fora e reaterro em camadas compactadas. Os bulbos de cada pilar se sobrepõem e somam as tensões: o envelope maior é o que o solo realmente sente.' },
    ],
    labels: [{ k: 'sap', t: 'Sapata comum' }, { k: 'pil', t: 'Dois pilares' }, { k: 'lastro', t: 'Lastro' }, { k: 'arm', t: 'Armação' }, { k: 'forma', t: 'Forma' }, { k: 'bulbo', t: 'Bulbos somados' }, { k: 'solo', t: 'Camadas do solo', fixed: [0, 0] }],
    bulb: [[1.4, 2.4, 3.4], [0.9, 1.7, 2.3], [0.5, 1.0, 1.4]],
    cam: { tx: -91, ty: -1.2, tz: CZ, yaw: -1.3, pitch: 0.25, dist: 18 },
    mcam: { tx: -91, ty: -3.7, tz: CZ, yaw: -1.3, pitch: 0.22, dist: 27 },
  },
};
export const B1 = { box: { x0: -125, x1: X1, z0: CZ - 9, z1: CZ + 9 } };
export const B5 = B1;
export const B1_CFG = CFG.B1, B5_CFG = CFG.B5;
export const B1_STEP_STARTS = [0, T.s1, T.s2, T.s3, T.s4];
export const B5_STEP_STARTS = B1_STEP_STARTS;

export function cellsAround(pit, obs) {
  const out = []; let z = pit.z0;
  for (const o of [...obs].sort((a, b) => a.z0 - b.z0)) {
    if (o.z0 > z + 1e-6) out.push({ x0: pit.x0, x1: pit.x1, z0: z, z1: o.z0 });
    if (o.x0 > pit.x0 + 1e-6) out.push({ x0: pit.x0, x1: o.x0, z0: o.z0, z1: o.z1 });
    if (o.x1 < pit.x1 - 1e-6) out.push({ x0: o.x1, x1: pit.x1, z0: o.z0, z1: o.z1 });
    z = o.z1;
  }
  if (pit.z1 > z + 1e-6) out.push({ x0: pit.x0, x1: pit.x1, z0: z, z1: pit.z1 });
  return out;
}

function create(engine, section, cfg) {
  const root = new THREE.Group(); root.visible = false;
  const { foot, cols } = cfg, DVc = cfg.dv;
  const PIT = { x0: X1 - cfg.pit.hx, x1: X1 + cfg.pit.hx, z0: CZ - cfg.pit.hz, z1: CZ + cfg.pit.hz };
  const capX = (o) => X1 + o;
  const soilW = mat(0x9c7b56, { r: 1 }), soilF = mat(0x86683f, { r: 1 });
  const matLastro = mat(0xb6b2a8, { r: 1 }), matConc = mat(0x85827a, { r: 0.95 }), matWood = mat(0xc9a26a, { r: 0.8 }), matFill = mat(0xb59568, { r: 1 });
  const fx0 = X1 - foot.fx / 2, fx1 = X1 + foot.fx / 2, fz0 = CZ - foot.fz / 2, fz1 = CZ + foot.fz / 2, fth = foot.y1 - foot.y0;
  const lastroY0 = foot.y0 - 0.1;

  // ----------------------------------------------------------- cava
  const wz = new THREE.PlaneGeometry(1, 1); wz.translate(0, -0.5, 0);
  const wx = new THREE.PlaneGeometry(1, 1); wx.rotateY(Math.PI / 2); wx.translate(0, -0.5, 0);
  const walls = [];
  const aw = (axis, pos, a, b) => { const m = new THREE.Mesh(axis === 'z' ? wz : wx, soilW); if (axis === 'z') m.position.set((a + b) / 2, 0, pos); else m.position.set(pos, 0, (a + b) / 2); m.userData = { axis, len: b - a }; root.add(m); walls.push(m); };
  aw('z', PIT.z0, PIT.x0, PIT.x1); aw('z', PIT.z1, PIT.x0, PIT.x1); aw('x', PIT.x0, PIT.z0, PIT.z1); aw('x', PIT.x1, PIT.z0, PIT.z1);
  const floorG = new THREE.PlaneGeometry(1, 1); floorG.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorG, soilF); floor.position.set(X1, 0, CZ); floor.scale.set(PIT.x1 - PIT.x0, 1, PIT.z1 - PIT.z0); root.add(floor);
  function setDepth(d) {
    walls.forEach((m) => { m.visible = d > 0.01; if (m.userData.axis === 'z') m.scale.set(m.userData.len, Math.max(0.001, d), 1); else m.scale.set(1, Math.max(0.001, d), m.userData.len); });
    floor.visible = d > 0.01; floor.position.y = -d + 0.002;
  }
  const subOverlay = capRect(root, X1 - 0.04, PIT.z0, PIT.z1, -DVc - 0.25, -DVc, noclip(0x5a432c, { op: 0, dw: false, r: 1 })); subOverlay.renderOrder = 5;

  // ----------------------------------------------------------- peças
  const S0 = { axis: 'x', c: CZ, a: fx0, b: fx1 };
  const lastro = piece(root, [{ axis: 'x', c: CZ, a: fx0 - 0.2, b: fx1 + 0.2 }], -foot.fz / 2 - 0.2, foot.fz / 2 + 0.2, lastroY0, foot.y0, matLastro, { x: capX(0.03) });
  const sapata = piece(root, [S0], -foot.fz / 2, foot.fz / 2, foot.y0, foot.y1, matConc, { x: capX(0.02) });
  const FS = [
    { axis: 'x', c: fz0 - 0.04, a: fx0 - 0.08, b: fx1 + 0.08 }, { axis: 'x', c: fz1 + 0.04, a: fx0 - 0.08, b: fx1 + 0.08 },
    { axis: 'z', c: fx0 - 0.04, a: fz0, b: fz1 }, { axis: 'z', c: fx1 + 0.04, a: fz0, b: fz1 },
  ];
  const fForm = piece(root, FS, -0.04, 0.04, foot.y0, foot.y1 + 0.05, matWood, { x: capX(0.015) });
  const pil = cols.map((c) => piece(root, [{ axis: 'x', c: c.z, a: X1 - c.s / 2, b: X1 + c.s / 2 }], -c.s / 2, c.s / 2, foot.y1, c.top, matConc, { x: capX(0.02) }));
  const pForm = cols.map((c) => {
    const h = c.s / 2 + 0.04;
    return piece(root, [
      { axis: 'x', c: c.z - h, a: X1 - h - 0.04, b: X1 + h + 0.04 }, { axis: 'x', c: c.z + h, a: X1 - h - 0.04, b: X1 + h + 0.04 },
      { axis: 'z', c: X1 - h, a: c.z - h, b: c.z + h }, { axis: 'z', c: X1 + h, a: c.z - h, b: c.z + h },
    ], -0.04, 0.04, foot.y1, c.top - 0.15, matWood, { x: capX(0.012) });
  });

  // reaterro: células ao redor das peças
  const fills = [];
  const addCells = (cells, y0, y1) => cells.forEach((cl) => {
    const cap = cl.x0 < X1 && cl.x1 > X1 ? { x: capX(0.035) } : undefined;
    const pc = piece(root, [{ axis: 'x', c: (cl.z0 + cl.z1) / 2, a: cl.x0, b: cl.x1 }], -(cl.z1 - cl.z0) / 2, (cl.z1 - cl.z0) / 2, y0, y1, matFill, cap);
    fills.push({ pc, y0, y1 });
  });
  addCells(cellsAround(PIT, [{ x0: fx0, x1: fx1, z0: fz0, z1: fz1 }]), foot.y0, foot.y1);
  addCells(cellsAround(PIT, cols.map((c) => ({ x0: X1 - c.s / 2, x1: X1 + c.s / 2, z0: c.z - c.s / 2, z1: c.z + c.s / 2 }))), foot.y1, 0);
  // fecha o vão da camada alta sobre a sapata onde o pilar não está já coberto (a camada alta cobre o poço todo menos os pilares)

  // ----------------------------------------------------------- armação
  const zsT = Array.from({ length: cfg.nz }, (_, i) => fz0 + 0.25 + i * ((foot.fz - 0.5) / (cfg.nz - 1)));        // barras ao longo de z (linhas no corte)
  const xsT = Array.from({ length: cfg.nx }, (_, i) => fz0 + 0.25 + i * ((foot.fz - 0.5) / (cfg.nx - 1)));        // barras ao longo de x (pontos no corte)
  const zsL = Array.from({ length: 5 }, (_, i) => fx0 + 0.25 + i * ((foot.fx - 0.5) / 4));
  const yX = foot.y0 + 0.1, yZ = foot.y0 + 0.18, yTop = foot.y1 - 0.1;
  const nBars = cfg.nx + zsL.length * (cfg.top ? 2 : 1);
  const bars = barSet(root, nBars, 0x3a3d42, 0.04);
  const secBars = new THREE.Group(); root.add(secBars);
  const dk = mat(0x24272b);
  for (const z of xsT) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8), dk); d.rotation.z = Math.PI / 2; d.position.set(capX(0.005), yX, z); secBars.add(d); }
  const zlen = foot.fz - 0.3;
  { const ln = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, zlen), dk); ln.position.set(capX(0.008), yZ, CZ); secBars.add(ln); }
  if (cfg.top) { const a = cols[0].z - 0.4, b = cols[1].z + 0.4; const ln = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, b - a), dk); ln.position.set(capX(0.008), yTop, (a + b) / 2); secBars.add(ln); }
  // calços
  const spZ = [fz0 + 0.6, CZ, fz1 - 0.6];
  spZ.forEach((z) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.14), mat(0xd7d2c4)); s.position.set(capX(0.01), foot.y0 + 0.05, z); secBars.add(s); });
  const spac = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.1, 0.14), mat(0xd7d2c4), 9); spac.frustumCulled = false; root.add(spac);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3(); let n = 0; for (const dx of [-0.8, 0, 0.8]) for (const z of spZ) m4.compose(v.set(X1 + dx, foot.y0 + 0.05, z), q, one), spac.setMatrixAt(n++, m4); }

  // arranque dos pilares: barras verticais e estribos
  const vbarGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6); vbarGeo.translate(0, 0.5, 0);
  const vbars = []; const secV = new THREE.Group(); root.add(secV);
  const stirG = (s) => { const t = 0.03, parts = [], h = s / 2 - 0.05; const b = (sx, sy, sz, x, y, z) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); parts.push(g); }; b(2 * h, t, t, 0, 0, -h); b(2 * h, t, t, 0, 0, h); b(t, t, 2 * h, -h, 0, 0); b(t, t, 2 * h, h, 0, 0); return mergeGeometries(parts); };
  const stirrups = [];
  cols.forEach((c) => {
    const off = c.s / 2 - 0.08, grp = [];
    for (const [dx, dz] of [[-off, -off], [off, -off], [-off, off], [off, off]]) { const m = new THREE.Mesh(vbarGeo, mat(0x3a3d42, { r: 0.5, m: 0.5 })); m.position.set(X1 + dx, foot.y0 + 0.15, c.z + dz); root.add(m); grp.push(m); }
    vbars.push(grp);
    const ns = 11, im = new THREE.InstancedMesh(stirG(c.s), mat(0x2f3237, { r: 0.5, m: 0.5 }), ns); im.frustumCulled = false; root.add(im); stirrups.push({ im, ns, c });
    for (const dz of [-off, off]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, c.top + 0.2 - (foot.y0 + 0.15), 0.06), dk); l.position.set(capX(0.006), (c.top + 0.2 + foot.y0 + 0.15) / 2, c.z + dz); secV.add(l); }
    for (let j = 0; j < ns; j++) { const y = foot.y1 - 0.05 + j * ((c.top - foot.y1 - 0.1) / (ns - 1)); const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, c.s - 0.1), dk); l.position.set(capX(0.007), y, c.z); secV.add(l); }
  });

  // ----------------------------------------------------------- bulbo(s) de tensões
  const bulbMats = [noclip(0xf2c14e, { op: 0, dw: false, r: 1 }), noclip(0xf0a43a, { op: 0, dw: false, r: 1 }), noclip(0xe0782c, { op: 0, dw: false, r: 1 })];
  const bulbs = [], envMat = noclip(0xd2552b, { op: 0, dw: false, r: 1 });
  const ell = (rz, ry, z, y, m, dx) => { const sh = new THREE.Shape(); sh.absellipse(0, 0, rz, ry, Math.PI, Math.PI * 2, false); sh.closePath(); const g = new THREE.ShapeGeometry(sh, 28); g.rotateY(-Math.PI / 2); const mm = new THREE.Mesh(g, m); mm.position.set(X1 - 0.04 - dx, y, z); mm.renderOrder = 5; root.add(mm); return mm; };
  const ctr = cols.length > 1 ? cols.map((c) => c.z) : [CZ];
  ctr.forEach((z) => cfg.bulb.forEach(([k, rz, ry], i) => bulbs.push(ell(rz * (cols.length > 1 ? 0.8 : 1) + (cols.length > 1 ? 0.2 : 0), ry, z, foot.y0, bulbMats[i], i * 0.002))));
  if (cols.length > 1) bulbs.push(ell(3.9, 3.3, CZ, foot.y0, envMat, 0.012));

  // ----------------------------------------------------------- locação
  const stakes = new THREE.Group(); root.add(stakes);
  const sx = cfg.pit.hx + 1.2, sz = cfg.pit.hz + 1.2;
  for (const dx of [-sx, sx]) for (const dz of [-sz, sz]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), mat(0xcaa36a)); s.position.set(X1 + dx, 0.5, CZ + dz); stakes.add(s);
    const tp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.14), mat(0xd23b2e)); tp.position.set(X1 + dx, 1.0, CZ + dz); stakes.add(tp);
  }
  for (const dz of [-sz, sz]) { const l = new THREE.Mesh(new THREE.BoxGeometry(2 * sx, 0.025, 0.025), mat(0xf4f1ea)); l.position.set(X1, 0.85, CZ + dz); stakes.add(l); }
  for (const dx of [-sx, sx]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 2 * sz), mat(0xf4f1ea)); l.position.set(X1 + dx, 0.85, CZ); stakes.add(l); }

  // cargas (setas) sobre os pilares
  const arrowMat = noclip(0xe8742c, { e: 0xe8742c, ei: 0.4 });
  const arrows = cols.map((c) => { const g = new THREE.Group(); const sc = 0.7 + 0.5 * c.load; const st = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * sc, 0.07 * sc, 0.9 * sc, 8), arrowMat); st.position.y = 0.65 * sc; const cn = new THREE.Mesh(new THREE.ConeGeometry(0.18 * sc, 0.4 * sc, 10), arrowMat); cn.rotation.x = Math.PI; cn.position.y = 0.0; g.add(st, cn); g.position.set(X1 - 0.12, c.top + 0.35 * sc, c.z); g.visible = false; root.add(g); return g; });

  // ----------------------------------------------------------- máquinas e pessoas
  const EX = X1 + cfg.pit.hx + 3.9;
  const exc = M.excavator(0.5); const excW = new THREE.Group(); exc.group.rotation.y = Math.PI; excW.add(exc.group); excW.position.set(EX, 0, CZ); excW.visible = false; root.add(excW);
  const truck = M.mixerTruck(); truck.scale.setScalar(0.62); truck.visible = false; root.add(truck);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1), mat(0x9aa0a8, { m: 0.4 })); chute.visible = false; root.add(chute);
  const flow = stream(root, 18, 0x8b8880);
  const plate = plateCompactor(); plate.group.visible = false; root.add(plate.group);
  const pA = person(0xe8742c), pB = person(0x4a8fd0), pC = person(0xf4f1ea, 0x3b7bd0);
  [pA, pB, pC].forEach((p) => root.add(p.group));

  const st = { active: false, speed: 1, paused: false, tc: 0, hold: 0, step: 0, progress: 0, note: '' };
  const anchors = Object.fromEntries(cfg.labels.map((l) => [l.k, new THREE.Vector3()]));
  const hidden = {};
  const lvlAt = (t) => { if (t <= LIFTS[0][0]) return lastroY0 + 0.1; let from = lastroY0 + 0.1; for (const [a, b, to] of LIFTS) { if (t < b) return from + (to - from) * ease((t - a) / (b - a)); from = to; } return 0; };
  const pop = (t, a, b, f = 0.5) => ease((t - a) / f) * ease((b - t) / f);
  function info(t) {
    if (t < T.s1) return { step: 0, p: t / T.s1, note: t < T.stakes ? 'Locação do gabarito' : 'Escavando o cavado' };
    if (t < T.s2) return { step: 1, p: (t - T.s1) / (T.s2 - T.s1), note: t < T.comp1 ? 'Apiloamento do fundo' : 'Lastro de concreto magro' };
    if (t < T.s3) return { step: 2, p: (t - T.s2) / (T.s3 - T.s2), note: t < T.bars0 ? 'Formas da sapata' : t < T.pil0 ? 'Malha de armação sobre calços' : t < T.pf0 ? 'Arranque do pilar' : 'Forma do pilar' };
    if (t < T.s4) return { step: 3, p: (t - T.s3) / (T.s4 - T.s3), note: t < T.pour0 ? 'Caminhão posicionado' : t < T.pour1 ? 'Concretando a sapata' : t < T.pp1 ? 'Concretando o(s) pilar(es)' : 'Caminhão sai' };
    const k = LIFTS.findIndex((l) => t < l[1]);
    return { step: 4, p: Math.min(1, (t - T.s4) / (T.END - T.s4)), note: t < T.un1 ? 'Desforma' : k >= 0 ? `Reaterro · camada ${k + 1} de 4` : 'Cargas e bulbo de tensões' };
  }
  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), q0 = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);

  function update(dt, tAbs) {
    if (!st.active) return;
    const k = st.paused ? 0 : dt * st.speed;
    if (st.hold > 0 && st.tc < T.END - 0.05) st.hold = 0;
    if (st.hold > 0) { st.hold -= k; if (st.hold <= 0) st.tc = 0; } else st.tc += k;
    if (st.tc >= T.END && st.hold <= 0) { st.tc = T.END - 0.001; st.hold = 3.5; }
    const t = st.tc, inf = info(t); st.step = inf.step; st.progress = inf.p; st.note = inf.note;

    const d = DVc * ease((t - T.stakes) / (T.dig1 - T.stakes));
    setDepth(d);
    terrainHoles[0].set(PIT.x0, PIT.x1, PIT.z0, PIT.z1);
    if (d > 0.02) section.setBand(0, PIT.z0, PIT.z1, -d, 0.05); else section.setBand(0, 0, 0, 0, 0);
    stakes.visible = t < T.s1 + 0.5; stakes.scale.setScalar(Math.max(0.001, ease((t - 0.2) / 0.6) * ease((T.s1 + 0.4 - t) / 0.6)));
    const comp = ease(win(t, T.s1 + 0.4, T.comp1));
    soilF.color.set(0x86683f).lerp(new THREE.Color(0x5b4529), comp);
    subOverlay.material.opacity = comp * 0.7;

    lastro.set(win(t, T.comp1, T.last1));
    fForm.set(win(t, T.form0, T.form1) * (1 - win(t, T.un0, T.un1)));
    // malha
    const fb = win(t, T.bars0, T.bars1), hide = t > T.pour0 + 1.6;
    let bi = 0;
    xsT.forEach((z, i) => { const f = ease(clamp01(fb * 1.5 - (i / xsT.length) * 0.5)); const len = (foot.fx - 0.2) * f; bars.put(bi++, 'x', fx1 - 0.1 - len / 2, yX, z, len); });
    zsL.forEach((x, i) => { const f = ease(clamp01(fb * 1.5 - (i / zsL.length) * 0.5 - 0.1)); const len = zlen * f; bars.put(bi++, 'z', x, yZ, fz1 - 0.15 - len / 2, len); });
    if (cfg.top) { const a = cols[0].z - 0.4, b = cols[1].z + 0.4; zsL.forEach((x, i) => { const f = ease(clamp01(fb * 1.5 - (i / zsL.length) * 0.5 - 0.2)); const len = (b - a) * f; bars.put(bi++, 'z', x, yTop, b - len / 2, len); }); }
    bars.done(); bars.im.visible = fb > 0.01 && !hide; secBars.visible = fb > 0.15 && !hide; spac.visible = fb > 0.1 && !hide;
    // arranques
    const fp = win(t, T.pil0, T.pil1);
    cols.forEach((c, ci) => {
      const top = c.top + 0.2 - (foot.y0 + 0.15);
      vbars[ci].forEach((m) => { m.visible = fp > 0.01; m.scale.y = Math.max(0.001, top * ease(fp)); });
      const { im, ns } = stirrups[ci];
      for (let j = 0; j < ns; j++) {
        const on = j / ns < clamp01((fp - 0.25) / 0.75), y = foot.y1 - 0.05 + j * ((c.top - foot.y1 - 0.1) / (ns - 1));
        if (!on) { m4.makeScale(0, 0, 0); im.setMatrixAt(j, m4); continue; }
        m4.compose(v3.set(X1, y, c.z), q0, one); im.setMatrixAt(j, m4);
      }
      im.instanceMatrix.needsUpdate = true;
      pForm[ci].set(win(t, T.pf0 + ci * 0.4, T.pf1) * (1 - win(t, T.un0, T.un1)));
      pil[ci].set(win(t, T.pour1 + 0.2 + ci * 1.2, T.pp1 - (cols.length - 1 - ci) * 1.2));
    });
    secV.visible = fp > 0.3;
    sapata.set(win(t, T.pour0, T.pour1));
    matConc.color.copy(WET).lerp(CURED, clamp01((t - T.pour0 - 2) / 12));
    // reaterro
    const lv = lvlAt(t);
    fills.forEach((f) => f.pc.set(clamp01((lv - f.y0) / (f.y1 - f.y0))));
    const bA = win(t, T.bulb0, T.bulb0 + 1.6);
    bulbs.forEach((m, i) => { const base = m.material === envMat ? 0.28 : 0.3; m.material.opacity = bA * base * (m.material === envMat ? 1 : 0.7 + (i % 3) * 0.25); });
    arrows.forEach((a, i) => { a.visible = t > T.bulb0 - 0.6; a.position.y = cols[i].top + 0.35 * (0.7 + 0.5 * cols[i].load) + 0.12 * Math.sin(tAbs * 3 + i); });

    // retroescavadeira
    const eS = pop(t, 0.4, T.s1 + 0.2, 0.6);
    excW.visible = eS > 0.01; excW.scale.setScalar(Math.max(0.001, eS)); exc.update(t * 1.4); excW.position.z = CZ + Math.sin(t * 0.8) * 0.4;
    // betoneira
    const tx0 = EX + 2.6;
    const tx = t < T.s3 ? tx0 + 8 : t < T.truckIn ? tx0 + 8 - 8 * ease((t - T.s3) / (T.truckIn - T.s3)) : t < T.pp1 + 0.2 ? tx0 : tx0 + 8 * ease((t - T.pp1 - 0.2) / (T.truckOut - T.pp1 - 0.2));
    const tVis = t >= T.s3 && t < T.truckOut + 0.4;
    truck.visible = tVis; truck.position.set(tx, 0, CZ); truck.userData.spin.rotation.x = tAbs * 2.5;
    const pouring = t > T.pour0 && t < T.pp1 && !(t > T.pour1 && t < T.pour1 + 0.2);
    chute.visible = tVis && t >= T.truckIn - 0.2 && t < T.pp1 + 0.4;
    const inPil = t > T.pour1, tz = inPil ? cols[Math.min(cols.length - 1, Math.floor((t - T.pour1) / ((T.pp1 - T.pour1) / cols.length)))].z : CZ + Math.sin(win(t, T.pour0, T.pour1) * Math.PI * 2) * (foot.fz / 2 - 0.5);
    const ch0 = new THREE.Vector3(tx - 3.0, 1.55, CZ), ch1 = new THREE.Vector3(inPil ? X1 + 0.45 : fx1 + 0.3, inPil ? 2.4 : foot.y1 + 0.5, tz), pc = inPil ? cols[Math.min(cols.length - 1, Math.floor((t - T.pour1) / ((T.pp1 - T.pour1) / cols.length)))] : null;
    chute.position.copy(ch0).add(ch1).multiplyScalar(0.5); chute.scale.z = ch0.distanceTo(ch1); chute.lookAt(ch1);
    flow.set(ch1, new THREE.Vector3(ch1.x - 0.25, inPil ? foot.y1 + (pc.top - foot.y1) * 0.6 : foot.y0 + 0.2 + fth * win(t, T.pour0, T.pour1), tz), pouring, tAbs, 0.1);
    // placa vibratória
    const pOn = (t > T.s1 + 0.2 && t < T.comp1 + 0.2) || (t > LIFTS[0][0] + 0.8 && t < LIFTS[3][1] + 0.2);
    plate.group.visible = pOn;
    if (pOn) {
      const bottom = t < T.comp1 + 0.3; let y, ph;
      if (bottom) { ph = win(t, T.s1 + 0.2, T.comp1 + 0.2); y = -DVc; } else { const li = Math.max(0, LIFTS.findIndex((l) => t < l[1] + 0.4)); ph = clamp01((t - (LIFTS[li][0] + 0.5)) / 1.4); y = lvlAt(t); }
      const sweep = Math.abs(((ph * 2) % 2) - 1), lane = cfg.pit.hz - 0.45;
      const z = bottom ? CZ + (cfg.pit.hz - 0.8) * Math.sin(ph * 6) : CZ + (ph < 0.5 ? -lane : lane);
      plate.group.position.set(PIT.x0 + 0.6 + (PIT.x1 - PIT.x0 - 1.2) * sweep, y, z); plate.group.rotation.y = Math.PI / 2; plate.shake(tAbs);
    }
    const pw = (p, x0, x1, z, sp, bend, ph) => { const u = 0.5 + 0.5 * Math.sin(tAbs * sp + ph); p.group.position.set(x0 + (x1 - x0) * u, 0, z); p.group.rotation.y = Math.cos(tAbs * sp + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; p.upper.rotation.x = bend; };
    pw(pA, X1 + 3.4, X1 + 7.5, CZ - cfg.pit.hz - 1.6, 0.6, t > T.s2 && t < T.pf1 ? 0.7 : 0.1, 0);
    pw(pB, X1 + 3.4, X1 + 7, CZ + cfg.pit.hz + 1.6, 0.5, t > T.pour0 && t < T.un0 ? 0.45 : 0.15, 1.7);
    pC.group.position.set(X1 + 6.8, 0, CZ + 1.2); pC.group.rotation.y = Math.PI / 2 + Math.sin(tAbs * 0.4) * 0.6; pC.upper.rotation.x = 0.05;

    const a = anchors;
    a.sap.set(X1, (foot.y0 + foot.y1) / 2, fz0 + 0.25);
    a.pil.set(X1 - 0.02, 0.9, cols[cols.length - 1].z + cols[cols.length - 1].s / 2 + 0.02);
    a.lastro.set(X1, lastroY0 + 0.05, fz1 - 0.1);
    a.arm.set(X1, yX, xsT[1]);
    a.forma.set(X1, foot.y1 - 0.2, fz1 + 0.04);
    a.bulbo.set(X1 - 0.04, foot.y0 - 1.6, CZ + (cols.length > 1 ? 2.6 : 1.1));
    a.solo.set(X1, -4.5, CZ - 0.5);
  }
  function labelVis(k, t = st.tc) {
    switch (k) {
      case 'sap': return t > T.pour1 - 0.5;
      case 'pil': return t > T.pour1 + 1.5;
      case 'lastro': return t > T.comp1 + 0.8 && t < T.s3;
      case 'arm': return t > T.bars0 + 1.5 && t < T.pour0 + 1.6;
      case 'forma': return t > T.form0 + 1.2 && t < T.un0 + 0.5;
      case 'bulbo': return t > T.bulb0 + 1.4;
      default: return true;
    }
  }
  return {
    group: root, state: st, anchors, update, labelVis,
    enter() { st.active = true; root.visible = true; st.tc = 0; st.hold = 0; hidden.g = engine.scene.getObjectByName('b-isol'); if (hidden.g) hidden.g.visible = false; },
    exit() { st.active = false; root.visible = false; terrainHoles.forEach((h) => h.set(0, 0, 0, 0)); if (hidden.g) hidden.g.visible = true; },
  };
}
export const createB1 = (engine, section) => create(engine, section, CFG.B1);
export const createB5 = (engine, section) => create(engine, section, CFG.B5);
