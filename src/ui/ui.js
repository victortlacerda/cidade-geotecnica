import * as THREE from 'three';
import './style.css';
import { ZONE_POS, ZONE_INFO, TOUR_ORDER, PLOT } from '../config.js';
import { H } from '../scene/terrain.js';
import catalogo from '../data/catalogo.json';
import { TBM, TBM_STEPS, TBM_LABELS, TBM_STEP_STARTS } from '../zones/tbm.js';
import { NATM, NATM_STEPS, NATM_LABELS, NATM_STEP_STARTS } from '../zones/natm.js';
import { EMB, EMB_STEPS, EMB_LABELS, EMB_STEP_STARTS } from '../zones/emboque.js';
import { B2, B2_STEPS, B2_LABELS, B2_STEP_STARTS } from '../zones/b2.js';
import { B1, B1_CFG, B5_CFG, B1_STEP_STARTS } from '../zones/b1.js';
import { B3, B3_STEPS, B3_LABELS, B3_STEP_STARTS, B3_CAM, B3_MCAM } from '../zones/b3.js';
import { B6, B6_STEPS, B6_LABELS, B6_STEP_STARTS, B6_CAM, B6_MCAM } from '../zones/b6.js';
import { C4, C4_STEPS, C4_LABELS, C4_STEP_STARTS, C4_CAM, C4_MCAM } from '../zones/c4.js';
import { C2, C2_STEPS, C2_LABELS, C2_STEP_STARTS, C2_CAM, C2_MCAM } from '../zones/c2.js';
import { C3, C3_STEPS, C3_LABELS, C3_STEP_STARTS, C3_CAM, C3_MCAM } from '../zones/c3.js';
import { D2, D3, D2_STEPS, D2_LABELS, D2_STEP_STARTS, D3_STEPS, D3_LABELS, D3_STEP_STARTS, D2_CAM, D2_MCAM } from '../zones/d23.js';
import { D4, D4_STEPS, D4_LABELS, D4_STEP_STARTS, D4_CAM, D4_MCAM } from '../zones/d4.js';
import { DW, DW_CAM, DW_MCAM, D8_STEPS, D10_STEPS, D11_STEPS, D8_LABELS, D10_LABELS, D11_LABELS, DW_STEP_STARTS } from '../zones/dwall.js';
import { E_BOX, E_CAM, E_MCAM, E_SPECS } from '../zones/eroad.js';
import { G1, G1_CAM, G1_MCAM, G1_STEPS, G1_STARTS, G1_LABELS } from '../zones/gspt.js';
import { H4, H4_CAM, H4_MCAM, H4_STEPS, H4_STARTS, H4_LABELS } from '../zones/hpile.js';
import { H1, H1_CAM, H1_MCAM, H1_STEPS, H1_STARTS, H1_LABELS } from '../zones/hdam.js';
import { F1, F1_CAM, F1_MCAM, F1_STEPS, F1_STARTS, F1_LABELS } from '../zones/fslope.js';
import { F3, F3_CAM, F3_MCAM, F3_STEPS, F3_STARTS, F3_LABELS, F4, F4_CAM, F4_MCAM, F4_STEPS, F4_STARTS, F4_LABELS } from '../zones/fembank.js';
import { F2, F2_CAM, F2_MCAM, F2_STEPS, F2_STARTS, F2_LABELS } from '../zones/fcut.js';
import { F5, F_CAM, F_MCAM, F5_SPEC_STEPS, F5_LABELS_EXPORT, F5_STARTS } from '../zones/fterra.js';
import { E4, E4_CAM, E4_MCAM, E4_STEPS, E4_STEP_STARTS, E4_LABELS } from '../zones/eroad4.js';
import { D14, D14_STEPS, D14_LABELS, D14_STEP_STARTS, D14_CAM, D14_MCAM } from '../zones/d14.js';
import { D7, D7_STEPS, D7_LABELS, D7_STEP_STARTS, D7_CAM, D7_MCAM } from '../zones/d7.js';
import { D6, D6_STEPS, D6_LABELS, D6_STEP_STARTS, D6_CAM, D6_MCAM } from '../zones/d6.js';
import { D5, D5_STEPS, D5_LABELS, D5_STEP_STARTS, D5_CAM, D5_MCAM } from '../zones/d5.js';
import { D1, D1_STEPS, D1_LABELS, D1_STEP_STARTS, D1_CAM, D1_MCAM } from '../zones/d1.js';
import { C14, C14_STEPS, C14_LABELS, C14_STEP_STARTS, C14_CAM, C14_MCAM } from '../zones/c14.js';
import { C1, C1_STEPS, C1_LABELS, C1_STEP_STARTS, C1_CAM, C1_MCAM } from '../zones/c1.js';
import { C13, C13_STEPS, C13_LABELS, C13_STEP_STARTS, C13_CAM, C13_MCAM } from '../zones/c13.js';
import { C6_CFG, C7_CFG, DRIVEN_BOX, DRIVEN_STEP_STARTS, DRIVEN_CAM, DRIVEN_MCAM } from '../zones/c6.js';
import { B4, B4_STEPS, B4_LABELS, B4_STEP_STARTS } from '../zones/b4.js';

// obras que já têm vista em corte animada
const CORTE = {
  A1: { box: TBM.box, cam: { tx: -70, ty: -11, tz: -29, yaw: -1.2, pitch: 0.36, dist: 52 }, steps: TBM_STEPS, starts: TBM_STEP_STARTS, labels: TBM_LABELS, sub: 'Vista em corte · ciclo da TBM', nome: 'Túnel TBM' },
  A2: { box: NATM.box, cam: { tx: -90, ty: 3.6, tz: -37, yaw: -1.35, pitch: 0.22, dist: 34 }, steps: NATM_STEPS, starts: NATM_STEP_STARTS, labels: NATM_LABELS, sub: 'Vista em corte · ciclo do NATM', nome: 'Túnel NATM' },
  A5: { box: EMB.box, cam: { tx: -90, ty: 8, tz: -30, yaw: -1.3, pitch: 0.2, dist: 42 }, steps: EMB_STEPS, starts: EMB_STEP_STARTS, labels: EMB_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Emboque em encosta', tit: 'Etapas da obra', note: true, mcam: { tx: -90, ty: -1, tz: -29, yaw: -1.3, pitch: 0.18, dist: 88 } },
  B2: { box: B2.box, cam: { tx: -69, ty: -0.8, tz: 16.8, yaw: -1.3, pitch: 0.3, dist: 22 }, steps: B2_STEPS, starts: B2_STEP_STARTS, labels: B2_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Sapata corrida', tit: 'Etapas da obra', note: true, mcam: { tx: -69, ty: -3.5, tz: 16.8, yaw: -1.3, pitch: 0.25, dist: 40 } },
  B4: { box: B4.box, cam: { tx: -69, ty: -0.5, tz: 32, yaw: -1.3, pitch: 0.3, dist: 24 }, steps: B4_STEPS, starts: B4_STEP_STARTS, labels: B4_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Radier', tit: 'Etapas da obra', note: true, mcam: { tx: -69, ty: -2.4, tz: 32, yaw: -1.3, pitch: 0.2, dist: 27 } },
  B1: { box: B1.box, cam: B1_CFG.cam, steps: B1_CFG.steps, starts: B1_STEP_STARTS, labels: B1_CFG.labels, sub: 'Vista em corte · sequência da obra', nome: 'Sapata isolada', tit: 'Etapas da obra', note: true, mcam: B1_CFG.mcam },
  B5: { box: B1.box, cam: B5_CFG.cam, steps: B5_CFG.steps, starts: B1_STEP_STARTS, labels: B5_CFG.labels, sub: 'Vista em corte · sequência da obra', nome: 'Sapata associada', tit: 'Etapas da obra', note: true, mcam: B5_CFG.mcam },
  B3: { box: B3.box, cam: B3_CAM, steps: B3_STEPS, starts: B3_STEP_STARTS, labels: B3_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Sapata de divisa', tit: 'Etapas da obra', note: true, mcam: B3_MCAM },
  B6: { box: B6.box, cam: B6_CAM, steps: B6_STEPS, starts: B6_STEP_STARTS, labels: B6_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Melhoria do solo', tit: 'Etapas da obra', note: true, mcam: B6_MCAM },
  C4: { box: C4.box, cam: C4_CAM, steps: C4_STEPS, starts: C4_STEP_STARTS, labels: C4_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Estaca hélice contínua', tit: 'Etapas da obra', note: true, mcam: C4_MCAM },
  C2: { box: C2.box, cam: C2_CAM, steps: C2_STEPS, starts: C2_STEP_STARTS, labels: C2_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Tubulão a céu aberto', tit: 'Etapas da obra', note: true, mcam: C2_MCAM },
  C3: { box: C3.box, cam: C3_CAM, steps: C3_STEPS, starts: C3_STEP_STARTS, labels: C3_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Estaca escavada com trado', tit: 'Etapas da obra', note: true, mcam: C3_MCAM },
  D2: { box: D2.box, cam: D2_CAM, steps: D2_STEPS, starts: D2_STEP_STARTS, labels: D2_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Estacas secantes', tit: 'Etapas da obra', note: true, mcam: D2_MCAM },
  D3: { box: D3.box, cam: D2_CAM, steps: D3_STEPS, starts: D3_STEP_STARTS, labels: D3_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Estacas tangentes', tit: 'Etapas da obra', note: true, mcam: D2_MCAM },
  D4: { box: D4.box, cam: D4_CAM, steps: D4_STEPS, starts: D4_STEP_STARTS, labels: D4_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Cortina em balanço', tit: 'Etapas da obra', note: true, mcam: D4_MCAM },
  D7: { box: D7.box, cam: D7_CAM, steps: D7_STEPS, starts: D7_STEP_STARTS, labels: D7_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Solo grampeado', tit: 'Etapas da obra', note: true, mcam: D7_MCAM },
  D8: { box: DW.box, cam: DW_CAM, steps: D8_STEPS, starts: DW_STEP_STARTS.D8, labels: D8_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Muro de arrimo por gravidade', tit: 'Etapas da obra', note: true, mcam: DW_MCAM },
  D10: { box: DW.box, cam: DW_CAM, steps: D10_STEPS, starts: DW_STEP_STARTS.D10, labels: D10_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Muro de arrimo por flexão', tit: 'Etapas da obra', note: true, mcam: DW_MCAM },
  D11: { box: DW.box, cam: DW_CAM, steps: D11_STEPS, starts: DW_STEP_STARTS.D11, labels: D11_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Muro de gabião', tit: 'Etapas da obra', note: true, mcam: DW_MCAM },
  E2: { box: E_BOX, cam: E_CAM, steps: E_SPECS.E2.steps, starts: E_SPECS.E2.starts, labels: E_SPECS.E2.labels, sub: 'Vista em corte · sequência da obra', nome: 'Pavimento de concreto (rígido)', tit: 'Etapas da obra', note: true, mcam: E_MCAM },
  E5: { box: E_BOX, cam: E_CAM, steps: E_SPECS.E5.steps, starts: E_SPECS.E5.starts, labels: E_SPECS.E5.labels, sub: 'Vista em corte · sequência da obra', nome: 'Reforço de pavimentos', tit: 'Etapas da obra', note: true, mcam: E_MCAM },
  G1: { box: G1.box, cam: G1_CAM, steps: G1_STEPS, starts: G1_STARTS, labels: G1_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Sondagem SPT', tit: 'Etapas do ensaio', note: true, mcam: G1_MCAM },
  H4: { box: H4.box, cam: H4_CAM, steps: H4_STEPS, starts: H4_STARTS, labels: H4_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Pilha de rejeitos', tit: 'Etapas da obra', note: true, mcam: H4_MCAM },
  H1: { box: H1.box, cam: H1_CAM, steps: H1_STEPS, starts: H1_STARTS, labels: H1_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Barragem de terra', tit: 'Etapas da obra', note: true, mcam: H1_MCAM },
  F1: { box: F1.box, cam: F1_CAM, steps: F1_STEPS, starts: F1_STARTS, labels: F1_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Estabilidade de encostas', tit: 'Etapas da obra', note: true, mcam: F1_MCAM },
  F3: { box: F3.box, cam: F3_CAM, steps: F3_STEPS, starts: F3_STARTS, labels: F3_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Aterros', tit: 'Etapas da obra', note: true, mcam: F3_MCAM },
  F4: { box: F4.box, cam: F4_CAM, steps: F4_STEPS, starts: F4_STARTS, labels: F4_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Aterro sobre solo mole', tit: 'Etapas da obra', note: true, mcam: F4_MCAM },
  F2: { box: F2.box, cam: F2_CAM, steps: F2_STEPS, starts: F2_STARTS, labels: F2_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Cortes em solo e rocha', tit: 'Etapas da obra', note: true, mcam: F2_MCAM },
  F5: { box: F5.box, cam: F_CAM, steps: F5_SPEC_STEPS, starts: F5_STARTS, labels: F5_LABELS_EXPORT, sub: 'Vista em corte · sequência da obra', nome: 'Compactação de solos', tit: 'Etapas da obra', note: true, mcam: F_MCAM },
  E4: { box: E4.box, cam: E4_CAM, steps: E4_STEPS, starts: E4_STEP_STARTS, labels: E4_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Estrada com corte e aterro', tit: 'Etapas da obra', note: true, mcam: E4_MCAM },
  E6: { box: E_BOX, cam: E_CAM, steps: E_SPECS.E6.steps, starts: E_SPECS.E6.starts, labels: E_SPECS.E6.labels, sub: 'Vista em corte · sequência da obra', nome: 'Geossintéticos em pavimentos', tit: 'Etapas da obra', note: true, mcam: E_MCAM },
  E1: { box: E_BOX, cam: E_CAM, steps: E_SPECS.E1.steps, starts: E_SPECS.E1.starts, labels: E_SPECS.E1.labels, sub: 'Vista em corte · sequência da obra', nome: 'Pavimento asfáltico (flexível)', tit: 'Etapas da obra', note: true, mcam: E_MCAM },
  D14: { box: D14.box, cam: D14_CAM, steps: D14_STEPS, starts: D14_STEP_STARTS, labels: D14_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Vala urbana escorada', tit: 'Etapas da obra', note: true, mcam: D14_MCAM },
  D6: { box: D6.box, cam: D6_CAM, steps: D6_STEPS, starts: D6_STEP_STARTS, labels: D6_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Parede diafragma', tit: 'Etapas da obra', note: true, mcam: D6_MCAM },
  D5: { box: D5.box, cam: D5_CAM, steps: D5_STEPS, starts: D5_STEP_STARTS, labels: D5_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Cortina atirantada', tit: 'Etapas da obra', note: true, mcam: D5_MCAM },
  D1: { box: D1.box, cam: D1_CAM, steps: D1_STEPS, starts: D1_STEP_STARTS, labels: D1_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Cortina de estacas escorada', tit: 'Etapas da obra', note: true, mcam: D1_MCAM },
  C14: { box: C14.box, cam: C14_CAM, steps: C14_STEPS, starts: C14_STEP_STARTS, labels: C14_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Bloco de coroamento', tit: 'Etapas da obra', note: true, mcam: C14_MCAM },
  C1: { box: C1.box, cam: C1_CAM, steps: C1_STEPS, starts: C1_STEP_STARTS, labels: C1_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Estaca broca', tit: 'Etapas da obra', note: true, mcam: C1_MCAM },
  C13: { box: C13.box, cam: C13_CAM, steps: C13_STEPS, starts: C13_STEP_STARTS, labels: C13_LABELS, sub: 'Vista em corte · sequência da obra', nome: 'Estacão / barrete', tit: 'Etapas da obra', note: true, mcam: C13_MCAM },
  C6: { box: DRIVEN_BOX, cam: DRIVEN_CAM, steps: C6_CFG.steps, starts: DRIVEN_STEP_STARTS, labels: C6_CFG.labels, sub: 'Vista em corte · sequência da obra', nome: 'Estaca pré-moldada', tit: 'Etapas da obra', note: true, mcam: DRIVEN_MCAM },
  C7: { box: DRIVEN_BOX, cam: DRIVEN_CAM, steps: C7_CFG.steps, starts: DRIVEN_STEP_STARTS, labels: C7_CFG.labels, sub: 'Vista em corte · sequência da obra', nome: 'Estaca metálica', tit: 'Etapas da obra', note: true, mcam: DRIVEN_MCAM },
};

const SVG = {
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  mark: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2a2200" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6"/></svg>',
};

export function initUI({ engine, controls, dn, section, works }) {
  const zonas = Object.fromEntries(catalogo.map((z) => [z.id, z]));
  document.body.insertAdjacentHTML('beforeend', `
    <div class="tilt top"></div><div class="tilt bottom"></div>
    <div id="labels"></div>
    <header class="bar">
      <div class="brand"><div class="mark">${SVG.mark}</div><div><b>Cidade Geotécnica</b><small>Protótipo da cidade · nome provisório</small></div></div>
      <div class="spacer"></div>
      <div class="seg" role="group" aria-label="Modo de navegação">
        <button id="m-ex" aria-pressed="true">Explorar</button><button id="m-tour" aria-pressed="false">Tour guiado</button>
      </div>
      <div class="tools">
        <button class="ico" id="b-night" aria-label="Alternar dia e noite" title="Dia / noite">${SVG.moon}</button>
        <button class="ico" id="b-home" aria-label="Voltar à visão geral" title="Visão geral">${SVG.home}</button>
      </div>
    </header>
    <svg id="cl-lines" class="cl-lines" aria-hidden="true"></svg><div id="clabels"></div>
    <aside class="panel" id="panel" aria-live="polite"></aside>
    <section class="tour" id="tour"><div class="card" id="t-card"></div><div class="steps" id="t-steps"></div></section>
    <div class="hint" id="hint"><kbd>Arrastar</kbd> mover · <kbd>Botão direito</kbd> girar · <kbd>Roda</kbd> zoom · <kbd>W A S D</kbd> / <kbd>Q E</kbd></div>
    <div class="loading" id="loading">Construindo a cidade…</div>`);
  const $ = (id) => document.getElementById(id);

  // ---------- rótulos ----------
  const anchors = {}, labels = {};
  for (const id of TOUR_ORDER) {
    const [cx, cz] = ZONE_POS[id];
    anchors[id] = new THREE.Vector3(cx, Math.max(13, H(cx, cz) + 11), cz + (id === 'A' || id === 'F' || id === 'H' || id === 'D' ? 4 : 0));
    const b = document.createElement('button');
    b.className = 'zl'; b.setAttribute('aria-label', `Zona ${id}, ${zonas[id].nome}`);
    b.innerHTML = `<span class="L">${id}</span><span class="n">${zonas[id].nome.replace(' e disposição de rejeitos', ' e rejeitos')}</span>`;
    b.addEventListener('click', () => selectZone(id));
    b.addEventListener('pointerenter', () => setHover(id));
    b.addEventListener('pointerleave', () => setHover(null));
    $('labels').appendChild(b); labels[id] = b;
  }

  // ---------- realce no chão ----------
  const rings = {};
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf2b705, transparent: true, opacity: 0.0, depthWrite: false });
  for (const id of TOUR_ORDER) {
    const [cx, cz] = ZONE_POS[id];
    const g = new THREE.Group();
    const t = 0.9, y = 0.5;
    const mk = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), ringMat); m.position.set(x, y, z); g.add(m); };
    mk(PLOT.w + 1.6, t, cx, cz - PLOT.d / 2); mk(PLOT.w + 1.6, t, cx, cz + PLOT.d / 2);
    mk(t, PLOT.d, cx - PLOT.w / 2, cz); mk(t, PLOT.d, cx + PLOT.w / 2, cz);
    g.visible = false; engine.scene.add(g); rings[id] = g;
  }

  let hover = null, selected = null, tourOn = false, tourIdx = 0;
  function zoneAt(x, z) {
    for (const id of TOUR_ORDER) {
      const [cx, cz] = ZONE_POS[id];
      if (Math.abs(x - cx) <= PLOT.w / 2 + 2 && Math.abs(z - cz) <= PLOT.d / 2 + 2) return id;
    }
    return null;
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(ev) {
    const r = engine.renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, engine.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    let t = 0; const step = 1.2;
    for (let i = 0; i < 1100; i++, t += step) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (Math.abs(x) > 116 || Math.abs(z) > 71) { if (y < 0) return null; continue; }
      if (y < H(x, z)) return zoneAt(x, z);
    }
    return null;
  }
  function setHover(id) {
    hover = id;
    for (const k of TOUR_ORDER) labels[k].classList.toggle('hot', k === id);
    engine.renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
  }
  controls.on('move', (e) => { if (!work && e.buttons === 0 && e.pointerType === 'mouse') setHover(pick(e)); });

  // ---------- painel ----------
  const panel = $('panel');
  function renderPanel(id) {
    const z = zonas[id];
    const rows = z.obras.map((o) => {
      const fen = /\(fenômeno\)/.test(o.nome);
      const nome = o.nome.replace(' (fenômeno)', '');
      const cut = CORTE[o.id];
      return `<li class="${cut ? 'has-cut' : ''}"><code>${o.id}</code><span class="nm">${nome}</span><span>${fen ? '<span class="chip">fenômeno</span> ' : ''}${cut ? `<button class="cut" data-w="${o.id}">Ver em corte</button>` : o.p === 1 ? '<span class="chip p1">agora</span>' : ''}</span></li>`;
    }).join('');
    panel.innerHTML = `
      <header><div class="L">${id}</div><div><h2>${z.nome}</h2><p class="sub">Zona ${id} · ${z.obras.length} obras</p></div>
      <button class="x" aria-label="Fechar painel">${SVG.x}</button></header>
      <p class="d">${ZONE_INFO[id].curta}</p>
      <h3>Obras do catálogo</h3><ul>${rows}</ul>
      <footer>O repositório de estudo (links, vídeos, arquivos) desta zona entra numa fase seguinte do roadmap.<button id="p-back">Voltar à cidade</button></footer>`;
    panel.querySelector('.x').addEventListener('click', clearSelection);
    panel.querySelector('#p-back').addEventListener('click', clearSelection);
    panel.querySelectorAll('button.cut').forEach((b) => b.addEventListener('click', () => openWork(b.dataset.w)));
  }

  // ---------- vista em corte de uma obra ----------
  let work = null, clEls = {}, stepEls = [];
  const clBox = $('clabels'), clSvg = $('cl-lines');
  function renderWork(id) {
    const o = zonas[id[0]].obras.find((x) => x.id === id), c = CORTE[id];
    panel.innerHTML = `
      <header><div class="L">${id}</div><div><h2>${c.nome}</h2><p class="sub">${c.sub}</p></div>
      <button class="x" aria-label="Sair da vista em corte">${SVG.x}</button></header>
      <h3>${c.tit || 'Etapas do ciclo'}</h3>
      <ol class="steps-list" id="stl">${c.steps.map((st, i) => `<li data-i="${i}"><span class="num">${i + 1}</span><div><b>${st.t}</b><p>${st.d}</p><i class="bar"><u></u></i></div></li>`).join('')}</ol>
      ${c.note ? '<p class="note" id="w-note"></p>' : ''}
      <div class="ctl">
        <button id="w-play" aria-pressed="true" title="Pausar / continuar">Pausar</button>
        <button id="w-speed" title="Velocidade">1×</button>
        <button id="w-lab" aria-pressed="true" title="Mostrar ou esconder os rótulos">Rótulos</button>
      </div>
      <footer>O repositório de estudo desta obra entra numa fase seguinte.<button id="p-back">Sair do corte</button></footer>`;
    panel.querySelector('.x').addEventListener('click', closeWork);
    panel.querySelector('#p-back').addEventListener('click', closeWork);
    stepEls = [...panel.querySelectorAll('#stl li')];
    const W = works[id];
    stepEls.forEach((li) => li.addEventListener('click', () => { W.state.tc = c.starts[+li.dataset.i] + 0.001; }));
    const play = panel.querySelector('#w-play'), sp = panel.querySelector('#w-speed'), lab = panel.querySelector('#w-lab');
    play.onclick = () => { W.state.paused = !W.state.paused; play.setAttribute('aria-pressed', String(!W.state.paused)); play.textContent = W.state.paused ? 'Continuar' : 'Pausar'; };
    sp.onclick = () => { const v = W.state.speed === 1 ? 2 : W.state.speed === 2 ? 0.5 : 1; W.state.speed = v; sp.textContent = v + '×'; };
    lab.onclick = () => { const on = lab.getAttribute('aria-pressed') !== 'true'; lab.setAttribute('aria-pressed', String(on)); clBox.style.display = clSvg.style.display = on ? '' : 'none'; };
    clBox.innerHTML = ''; clEls = {};
    for (const l of c.labels) { const e = document.createElement('div'); e.className = 'cl'; e.textContent = l.t; clBox.appendChild(e); clEls[l.k] = e; }
    clSvg.innerHTML = c.labels.map((l) => `<g data-k="${l.k}"><line/><circle r="3.5"/></g>`).join('');
    clBox.style.display = clSvg.style.display = '';
  }
  function openWork(id) {
    const c = CORTE[id]; if (!c) return;
    work = id; selected = id[0];
    section.open(c.box); works[id].enter();
    renderWork(id); panel.classList.add('open');
    panel.classList.add('work');
    const mob = innerWidth < 720;
    controls.flyTo(mob ? (c.mcam || { ...c.cam, ty: c.cam.ty - 9, dist: c.cam.dist + 14, tz: c.cam.tz - 5 }) : c.cam, 2.6);
    document.body.classList.add('in-cut');
    $('hint').classList.add('gone');
  }
  function closeWork() {
    if (!work) return;
    works[work].exit(); work = null; section.close(); panel.classList.remove('work');
    document.body.classList.remove('in-cut');
    clBox.innerHTML = ''; clSvg.innerHTML = '';
    if (selected) { renderPanel(selected); frame(selected); }
  }

  function frame(id) {
    const [cx, cz] = ZONE_POS[id];
    const ty = id === 'D' ? -2 : id === 'A' || id === 'H' || id === 'F' ? 4 : 1;
    controls.flyTo({ tx: cx, ty, tz: cz + 2, yaw: 0.42, pitch: 0.82, dist: 118 });
  }
  function highlight(id) {
    for (const k of TOUR_ORDER) {
      rings[k].visible = k === id;
      labels[k].classList.toggle('dim', !!id && k !== id);
    }
    ringMat.opacity = id ? 0.85 : 0;
  }
  function selectZone(id) {
    selected = id;
    highlight(id); frame(id);
    if (!tourOn) { renderPanel(id); panel.classList.add('open'); }
    $('hint').classList.add('gone');
  }
  function clearSelection() {
    if (work) { works[work].exit(); work = null; section.close(); panel.classList.remove('work'); document.body.classList.remove('in-cut'); clBox.innerHTML = ''; clSvg.innerHTML = ''; }
    selected = null; highlight(null); panel.classList.remove('open');
    if (!tourOn) controls.home();
  }
  controls.on('click', (e) => { if (work) return; const id = pick(e); if (id) selectZone(id); else if (selected && !tourOn) clearSelection(); });

  // ---------- tour ----------
  function renderTour() {
    const id = TOUR_ORDER[tourIdx], z = zonas[id];
    $('t-card').innerHTML = `<div class="k">Passo ${tourIdx + 1} de ${TOUR_ORDER.length} · Zona ${id}</div><h2>${z.nome}</h2><p>${ZONE_INFO[id].curta}</p>`;
    $('t-steps').innerHTML = `<button class="nav" id="t-prev" aria-label="Anterior">‹</button>` +
      TOUR_ORDER.map((k, i) => `<button data-i="${i}" ${i === tourIdx ? 'aria-current="step"' : ''} aria-label="Zona ${k}, ${zonas[k].nome}">${i + 1}</button>`).join('') +
      `<button class="nav" id="t-next" aria-label="Próximo">›</button>`;
    $('t-prev').onclick = () => goTour(tourIdx - 1); $('t-next').onclick = () => goTour(tourIdx + 1);
    $('t-steps').querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => goTour(+b.dataset.i)));
  }
  function goTour(i) {
    tourIdx = (i + TOUR_ORDER.length) % TOUR_ORDER.length;
    renderTour(); selected = TOUR_ORDER[tourIdx]; highlight(selected); frame(selected);
  }
  function setMode(tour) {
    tourOn = tour;
    $('m-ex').setAttribute('aria-pressed', String(!tour)); $('m-tour').setAttribute('aria-pressed', String(tour));
    $('tour').classList.toggle('open', tour);
    panel.classList.remove('open');
    $('hint').classList.toggle('gone', tour || !!selected);
    if (tour) goTour(0); else { selected = null; highlight(null); controls.home(); }
  }
  $('m-ex').onclick = () => setMode(false); $('m-tour').onclick = () => setMode(true);
  $('b-home').onclick = () => { if (tourOn) setMode(false); else clearSelection(); controls.home(); };
  $('b-night').onclick = () => {
    const n = !dn.isNight(); dn.setNight(n);
    $('b-night').innerHTML = n ? SVG.sun : SVG.moon;
  };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (work) closeWork(); else if (tourOn) setMode(false); else if (selected) clearSelection(); }
    if (tourOn && (e.key === ']' || e.key === 'Enter')) goTour(tourIdx + 1);
  });

  // rótulos da vista em corte: afastados do centro da máquina e sem sobreposição
  const lw = {};
  function layoutLabels(w, h) {
    const labs = CORTE[work].labels, P = [];
    let cx = 0, cy = 0, n = 0;
    for (const l of labs) {
      v.copy(works[work].anchors[l.k]).project(engine.camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      const lv = works[work].labelVis;
      const off = v.z > 1 || x < -20 || x > w + 20 || y < -20 || y > h + 20 || (lv && !lv(l.k));
      P.push({ l, x, y, off });
      if (!l.fixed) { cx += x; cy += y; n++; }
    }
    cx /= n || 1; cy /= n || 1;
    for (const p of P) {
      if (p.l.fixed) { p.lx = p.x + p.l.fixed[0]; p.ly = p.y + p.l.fixed[1]; continue; }
      let dx = p.x - cx, dy = p.y - cy; const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      if (Math.abs(dy) < 0.35) dy = dy < 0 ? -0.35 : 0.35; // sempre um pouco acima ou abaixo
      const m = Math.hypot(dx, dy);
      p.lx = p.x + (dx / m) * 70; p.ly = p.y + (dy / m) * 78;
    }
    for (const p of P) { const e = clEls[p.l.k]; lw[p.l.k] ||= (e?.offsetWidth || 90) + 8; }
    for (let it = 0; it < 10; it++) {
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const A = P[i], B = P[j];
        const ox = (lw[A.l.k] + lw[B.l.k]) / 2 - Math.abs(A.lx - B.lx), oy = 30 - Math.abs(A.ly - B.ly);
        if (ox > 0 && oy > 0) {
          const s = (A.ly <= B.ly ? -1 : 1) * (oy / 2 + 1);
          if (!A.l.fixed) A.ly += s; if (!B.l.fixed) B.ly -= s;
          if (A.l.fixed && B.l.fixed) continue;
        }
      }
    }
    for (const p of P) {
      const el = clEls[p.l.k], g = clSvg.querySelector(`[data-k="${p.l.k}"]`);
      if (!el || !g) continue;
      el.style.transform = `translate(${p.lx.toFixed(1)}px, ${p.ly.toFixed(1)}px) translate(-50%, -50%)`;
      el.style.opacity = p.off ? 0 : 1; g.style.opacity = p.off ? 0 : 1;
      const ln = g.firstChild; ln.setAttribute('x1', p.x); ln.setAttribute('y1', p.y); ln.setAttribute('x2', p.lx); ln.setAttribute('y2', p.ly);
      g.lastChild.setAttribute('cx', p.x); g.lastChild.setAttribute('cy', p.y);
    }
  }

  // ---------- posição dos rótulos ----------
  const v = new THREE.Vector3();
  engine.onUpdate((dt, t) => {
    const w = innerWidth, h = innerHeight;
    for (const id of TOUR_ORDER) {
      v.copy(anchors[id]).project(engine.camera);
      const el = labels[id];
      const behind = v.z > 1;
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      el.classList.toggle('off', behind || x < -60 || x > w + 60 || y < -40 || y > h + 40);
    }
    if (selected && rings[selected]) ringMat.opacity = work ? 0 : 0.55 + 0.3 * Math.sin(t * 3);
    if (work) {
      const stt = works[work].state;
      stepEls.forEach((li, i) => {
        const on = i === stt.step;
        li.classList.toggle('on', on);
        if (on) li.querySelector('u').style.width = (stt.progress * 100).toFixed(1) + '%';
      });
      const nt = document.getElementById('w-note'); if (nt && stt.note !== undefined && nt.textContent !== stt.note) nt.textContent = stt.note;
      layoutLabels(w, h);
    }
  });
  setHover(null);
  requestAnimationFrame(() => setTimeout(() => $('loading').classList.add('done'), 400));
}
