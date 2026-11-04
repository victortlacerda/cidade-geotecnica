import * as THREE from 'three';

export function createEngine(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 2, 1400);
  const updaters = [];
  const clock = new THREE.Clock();
  let running = true;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const stats = { frames: 0, last: performance.now(), fps: 0 };
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    for (const u of updaters) u(dt, t);
    renderer.render(scene, camera);
    stats.frames++;
    const now = performance.now();
    if (now - stats.last > 1000) { stats.fps = stats.frames * 1000 / (now - stats.last); stats.frames = 0; stats.last = now; }
    requestAnimationFrame(frame);
  }
  return {
    renderer, scene, camera, stats, resize,
    onUpdate: (fn) => updaters.push(fn),
    start: () => requestAnimationFrame(frame),
  };
}
