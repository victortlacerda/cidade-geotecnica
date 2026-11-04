import { H } from '../scene/terrain.js';

export function follower(obj, pts, speed, { loop = true, yOff = 0.05 } = {}) {
  const P = pts.map((p) => (p.length === 3 ? p : [p[0], null, p[1]]));
  const n = P.length, segs = [];
  let total = 0;
  const cnt = loop ? n : n - 1;
  for (let i = 0; i < cnt; i++) {
    const a = P[i], b = P[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[2] - a[2]);
    segs.push({ a, b, l, s0: total }); total += l;
  }
  let s = Math.random() * total, dir = 1;
  const yAt = (p, x, z) => (p[1] === null ? H(x, z) : p[1]);
  let hdg = null;
  function place(dt) {
    s += speed * dt * dir;
    if (loop) s = ((s % total) + total) % total;
    else if (s > total) { s = total; dir = -1; } else if (s < 0) { s = 0; dir = 1; }
    let i = segs.findIndex((g) => s <= g.s0 + g.l);
    if (i < 0) i = segs.length - 1;
    const g = segs[i], f = g.l ? (s - g.s0) / g.l : 0;
    const x = g.a[0] + (g.b[0] - g.a[0]) * f, z = g.a[2] + (g.b[2] - g.a[2]) * f;
    const ya = yAt(g.a, g.a[0], g.a[2]), yb = yAt(g.b, g.b[0], g.b[2]);
    const y = g.a[1] === null && g.b[1] === null ? H(x, z) : ya + (yb - ya) * f;
    obj.position.set(x, y + yOff, z);
    const th = Math.atan2(-(g.b[2] - g.a[2]) * dir, (g.b[0] - g.a[0]) * dir);
    if (hdg === null) hdg = th;
    let d = th - hdg; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    hdg += d * Math.min(1, dt * 6);
    obj.rotation.y = hdg;
    // inclinação na rampa
    const slope = Math.atan2(yb - ya, g.l || 1) * dir;
    obj.rotation.z = Math.abs(slope) < 0.001 ? 0 : slope * 0.0 + 0;
  }
  place(0);
  return place;
}
