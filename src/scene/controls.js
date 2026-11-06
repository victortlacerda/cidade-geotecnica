import * as THREE from 'three';
import { WORLD } from '../config.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createControls(engine, dom) {
  const { camera } = engine;
  const HOME = { tx: 0, ty: 0, tz: -40, yaw: 0.52, pitch: 0.72, dist: 410 };
  const cur = { ...HOME }, goal = { ...HOME };
  let flying = false, flyRate = 3.2;
  const keys = new Set();
  const pointers = new Map();
  let drag = null, downInfo = null, pinch = null;
  const listeners = { click: [], move: [], interact: [] };
  const emit = (n, a) => listeners[n].forEach((f) => f(a));

  const LIM = { minDist: 10, maxDist: 460, minPitch: 0.2, maxPitch: 1.42 };

  function clampGoal() {
    goal.dist = clamp(goal.dist, LIM.minDist, LIM.maxDist);
    goal.pitch = clamp(goal.pitch, LIM.minPitch, LIM.maxPitch);
    goal.tx = clamp(goal.tx, -WORLD.w / 2 + 6, WORLD.w / 2 - 6);
    goal.tz = clamp(goal.tz, WORLD.z0 + 4, WORLD.z1 - 4);
  }
  function panBy(dxPx, dyPx) {
    const k = cur.dist * 0.0021;
    const sy = Math.sin(cur.yaw), cy = Math.cos(cur.yaw);
    // direção da tela projetada no chão
    goal.tx -= (dxPx * cy + dyPx * sy * 1.0) * k * 1;
    goal.tz -= (-dxPx * sy + dyPx * cy) * k * 1;
    clampGoal();
  }

  dom.addEventListener('contextmenu', (e) => e.preventDefault());
  dom.addEventListener('pointerdown', (e) => {
    dom.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      drag = { mode: e.button === 2 || e.altKey ? 'rot' : 'pan', x: e.clientX, y: e.clientY };
      downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, button: e.button };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) };
      drag = null;
    }
    emit('interact');
    flying = false;
  });
  dom.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (p) {
      const prev = { ...p };
      p.x = e.clientX; p.y = e.clientY;
      if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
        goal.dist *= pinch.d / Math.max(d, 1);
        goal.yaw -= (ang - pinch.ang);
        pinch = { d, ang };
        clampGoal();
      } else if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY;
        downInfo.moved += Math.abs(dx) + Math.abs(dy);
        if (drag.mode === 'rot') { goal.yaw -= dx * 0.006; goal.pitch += dy * 0.005; clampGoal(); }
        else if (downInfo.moved > 4) { panBy(dx, dy); }
      }
    }
    emit('move', e);
  });
  const up = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (downInfo && pointers.size === 0) {
      if (downInfo.moved < 6 && performance.now() - downInfo.t < 500 && downInfo.button === 0) emit('click', e);
      downInfo = null; drag = null;
    }
  };
  dom.addEventListener('pointerup', up);
  dom.addEventListener('pointercancel', up);
  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    goal.dist *= Math.exp(e.deltaY * 0.0012);
    clampGoal(); flying = false; emit('interact');
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  engine.onUpdate((dt) => {
    // teclado
    const sp = cur.dist * 0.9 * dt;
    const sy = Math.sin(cur.yaw), cy = Math.cos(cur.yaw);
    let mx = 0, mz = 0;
    if (keys.has('w') || keys.has('arrowup')) { mx -= sy; mz -= cy; }
    if (keys.has('s') || keys.has('arrowdown')) { mx += sy; mz += cy; }
    if (keys.has('a') || keys.has('arrowleft')) { mx -= cy; mz += sy; }
    if (keys.has('d') || keys.has('arrowright')) { mx += cy; mz -= sy; }
    if (mx || mz) { goal.tx += mx * sp; goal.tz += mz * sp; flying = false; emit('interact'); }
    if (keys.has('q')) { goal.yaw += dt * 1.2; flying = false; }
    if (keys.has('e')) { goal.yaw -= dt * 1.2; flying = false; }
    clampGoal();
    const k = 1 - Math.exp(-dt * (flying ? flyRate : 12));
    for (const key of ['tx', 'ty', 'tz', 'yaw', 'pitch', 'dist']) cur[key] += (goal[key] - cur[key]) * k;
    if (flying && Math.abs(goal.dist - cur.dist) < 0.4 && Math.hypot(goal.tx - cur.tx, goal.tz - cur.tz) < 0.3) flying = false;
    const cp = Math.cos(cur.pitch);
    camera.position.set(
      cur.tx + Math.sin(cur.yaw) * cp * cur.dist,
      cur.ty + Math.sin(cur.pitch) * cur.dist,
      cur.tz + Math.cos(cur.yaw) * cp * cur.dist
    );
    camera.lookAt(cur.tx, cur.ty, cur.tz);
  });

  return {
    cur, goal,
    on: (n, f) => listeners[n].push(f),
    flyTo(t, rate = 3.0) { Object.assign(goal, t); clampGoal(); flying = true; flyRate = rate; },
    home() { this.flyTo({ ...HOME }, 2.6); },
    HOME,
  };
}
