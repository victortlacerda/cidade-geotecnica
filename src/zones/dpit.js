import * as THREE from 'three';
import { PIT, PIT_RECT, RAMP_RECT, strataWallGeometry, setPitOpen } from '../scene/terrain.js';

// Casca da cava urbana da Zona D (estado "pronto" da vista geral): piso, paredes em camadas e rampa.
// A cava é um buraco permanente no terreno (permHoles); as obras da Zona D fecham esse buraco
// e escondem o grupo 'd-pit' ao entrar (hideDPit) e o restauram ao sair (showDPit).
const DEPTH = PIT.depth;
const rampY = (z) => -DEPTH + ((Math.min(Math.max(z, RAMP_RECT.z0), RAMP_RECT.z1) - RAMP_RECT.z0) / (RAMP_RECT.z1 - RAMP_RECT.z0)) * DEPTH;

function clampWall(geo, fn) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, Math.max(p.getY(i), fn(p.getX(i), p.getZ(i))));
  geo.computeVertexNormals();
  return geo;
}

export function buildPitShell() {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
  const { x0, x1, z0, z1 } = PIT_RECT;
  const flat = () => 0;
  const seg = (pts, fn) => { const m = new THREE.Mesh(clampWall(strataWallGeometry(pts, flat), fn), wallMat); m.receiveShadow = true; g.add(m); };
  const lo = () => -DEPTH;
  // norte, leste, oeste inteiros; sul com abertura da rampa
  seg([[x0, z0], [x1, z0]], lo); seg([[x1, z0], [x1, z1]], lo); seg([[x0, z1], [x0, z0]], lo);
  seg([[x1, z1], [RAMP_RECT.x1, z1]], lo); seg([[RAMP_RECT.x0, z1], [x0, z1]], lo);
  // piso
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ color: 0xd9bb7c, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set((x0 + x1) / 2, -DEPTH + 0.01, (z0 + z1) / 2); floor.receiveShadow = true; g.add(floor);
  // rampa: piso inclinado e paredes laterais
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute([RAMP_RECT.x0, -DEPTH, RAMP_RECT.z0, RAMP_RECT.x1, -DEPTH, RAMP_RECT.z0, RAMP_RECT.x0, 0.02, RAMP_RECT.z1, RAMP_RECT.x1, 0.02, RAMP_RECT.z1], 3));
  rg.setIndex([0, 2, 1, 1, 2, 3]); rg.computeVertexNormals();
  const ramp = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0xb69a76, roughness: 1, side: THREE.DoubleSide })); ramp.receiveShadow = true; g.add(ramp);
  seg([[RAMP_RECT.x0, RAMP_RECT.z0], [RAMP_RECT.x0, RAMP_RECT.z1]], (x, z) => rampY(z));
  seg([[RAMP_RECT.x1, RAMP_RECT.z0], [RAMP_RECT.x1, RAMP_RECT.z1]], (x, z) => rampY(z));
  return g;
}

// Obras da Zona D: fecham a cava estática (terreno plano) e escondem seu conteúdo
const NAMES = ['d-pit', 'd-nb'];
export function hideDPit(engine) { NAMES.forEach((n) => { const o = engine.scene.getObjectByName(n); if (o) o.visible = false; }); setPitOpen(false); }
export function showDPit(engine) { NAMES.forEach((n) => { const o = engine.scene.getObjectByName(n); if (o) o.visible = true; }); setPitOpen(true); }
