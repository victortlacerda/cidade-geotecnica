import * as THREE from 'three';

const K = {
  day: { sky: 0xdde8ee, hemiSky: 0xcfe6ff, hemiGround: 0xd9cbb4, hemiI: 1.05, sun: 0xfff0d8, sunI: 2.7, az: 40, el: 52, exp: 1.0, glow: 0 },
  dusk: { sky: 0xf1c8a8, hemiSky: 0xf3b9a0, hemiGround: 0x9a8a9a, hemiI: 0.75, sun: 0xff9a55, sunI: 1.7, az: 280, el: 11, exp: 1.0, glow: 0.55 },
  night: { sky: 0x151b2b, hemiSky: 0x4b5d93, hemiGround: 0x232733, hemiI: 0.7, sun: 0x9db5ff, sunI: 0.75, az: 215, el: 48, exp: 1.15, glow: 1 },
};
const col = (h) => new THREE.Color(h);
function mix(a, b, t) {
  const o = {};
  for (const k of Object.keys(a)) {
    if (['sky', 'hemiSky', 'hemiGround', 'sun'].includes(k)) o[k] = col(a[k]).lerp(col(b[k]), t);
    else o[k] = a[k] + (b[k] - a[k]) * t;
  }
  return o;
}
const dir = (az, el) => {
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
};

export function createDayNight(engine) {
  const { scene, renderer } = engine;
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -150; sc.right = 150; sc.top = 110; sc.bottom = -110; sc.near = 10; sc.far = 620;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.35;
  scene.add(hemi, sun, sun.target);
  scene.fog = new THREE.Fog(0xdde8ee, 420, 900);
  scene.background = new THREE.Color(0xdde8ee);

  const state = { phase: 0, target: 0, glow: 0, listeners: [] };
  function apply(p) {
    const k = p < 0.5 ? mix(K.day, K.dusk, p / 0.5) : mix(K.dusk, K.night, (p - 0.5) / 0.5);
    scene.background.copy(k.sky); scene.fog.color.copy(k.sky);
    hemi.color.copy(k.hemiSky); hemi.groundColor.copy(k.hemiGround); hemi.intensity = k.hemiI;
    sun.color.copy(k.sun); sun.intensity = k.sunI;
    const a = p < 0.5 ? dir(K.day.az, K.day.el).lerp(dir(K.dusk.az, K.dusk.el), p / 0.5)
      : dir(K.dusk.az, K.dusk.el).lerp(dir(K.night.az, K.night.el), (p - 0.5) / 0.5);
    a.normalize();
    sun.position.copy(a).multiplyScalar(300);
    renderer.toneMappingExposure = k.exp;
    state.glow = k.glow;
    for (const l of state.listeners) l(k.glow, p);
  }
  apply(0);
  engine.onUpdate((dt) => {
    const diff = state.target - state.phase;
    if (Math.abs(diff) > 0.0005) {
      state.phase += Math.sign(diff) * Math.min(Math.abs(diff), dt / 3.2);
      apply(state.phase);
    }
  });
  return {
    state,
    onChange: (fn) => { state.listeners.push(fn); fn(state.glow, state.phase); },
    setNight: (n) => { state.target = n ? 1 : 0; },
    isNight: () => state.target === 1,
  };
}
