(function (root) {
  'use strict';
  const D = root.PumpkinDynamics || require('./dynamics.js'), T = D.TUNE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const START = Object.freeze({ x: 180, y: 250 });
  const END = Object.freeze({ left: 1790, right: 2030 });
  const ZOOM = 1.85, DURATION = 6.4;
  // A single open surface: safe start, small slope, shallow reunion valley,
  // broad round playground, and a long smooth release. No bowl/lane union.
  const knots = [
    [-50,350],[0,350],[310,350],[420,328],[565,382],[700,354],
    [810,391],[935,365],[1030,342],[1110,356],[1230,417],
    [1330,440],[1450,421],[1570,395],[1645,407],[1795,464],
    [1890,487],[1995,465],[2070,420],
  ];
  const material = x => x > 1530 && x < 1810 ? 'polished' : x > 740 && x < 930 ? 'cushion' : 'flesh';
  const terrain = [];
  for (let k = 0; k < knots.length - 1; k++) {
    const a = knots[k], b = knots[k + 1], n = Math.ceil((b[0] - a[0]) / 6);
    for (let i = 0; i < n; i++) {
      const t = i / n, x = a[0] + (b[0] - a[0]) * t;
      terrain.push({ x, y: a[1] + (b[1] - a[1]) * smooth(t), material: material(x) });
    }
  }
  terrain.push({ x: 2070, y: 420, material: 'flesh' });
  function floor(x) {
    x = clamp(x, -50, 2070);
    let lo = 0, hi = terrain.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (terrain[m].x <= x) lo = m; else hi = m; }
    const a = terrain[lo], b = terrain[hi], slope = (b.y - a.y) / (b.x - a.x), len = Math.hypot(1, slope);
    return { y: a.y + (x - a.x) * slope, nx: slope / len, ny: -1 / len, slope, material: material(x) };
  }
  function field(x, y) {
    const f = floor(x);
    return { ...f, signed: (y - f.y) * -f.ny };
  }
  function support(p, nx, ny) {
    const c = Math.cos(p.angle), s = Math.sin(p.angle);
    return Math.hypot(10.3 * (nx * c + ny * s), 5.5 * (-nx * s + ny * c));
  }
  function create(source = D.create(), transitioning = false) {
    const s = { time: source.time, accumulator: source.accumulator, held: source.held, activeId: source.activeId,
      x: source.x, y: source.y, vx: source.vx, vy: source.vy,
      targetX: source.targetX, targetY: source.targetY, anchorX: source.anchorX, anchorY: source.anchorY,
      ring: source.ring, ringV: source.ringV, contacts: [], marks: [], impactCount: source.impactCount,
      camera: { x: START.x, y: START.y, z: transitioning ? 1 : ZOOM },
      transition: transitioning ? { elapsed: 0, progress: 0, settled: false } : null,
      quiet: 0, finished: false, seeds: source.seeds };
    // Stage 0 draws positions with y * .8, but rotates the grain in screen space.
    // Bake that projection into y and vy, keeping angle/spin/x/vx unchanged.
    // The matching camera transform makes transfer pixel-continuous (tested).
    for (const [i, p] of s.seeds.entries()) {
      p.x += START.x; p.y = START.y + p.y * .8; p.vy *= .8; p.attached = false;
      p.dragFactor = .98 + i % 4 * .014; p.turn = p.angle; p.roll = p.roll || 1;
    }
    return s;
  }
  function opening(s) { return s.transition ? smooth((s.transition.progress - .36) / .57) : 1; }
  function view(s) {
    const o = opening(s), z = s.camera.z;
    return { x: 195 + s.x * (34 - 22 * o), y: 365 + s.y * (23 - 15 * o),
      angle: s.x * (.22 - .15 * o), sx: z * (1 + s.ring * .22),
      sy: z * (1 - s.y * .15 - s.ring * .18) };
  }
  function screenPoint(s, x, y) {
    const v = view(s), dx = (x - s.camera.x) * v.sx, dy = (y - s.camera.y) * v.sy;
    return { x: v.x + Math.cos(v.angle) * dx - Math.sin(v.angle) * dy,
      y: v.y + Math.sin(v.angle) * dx + Math.cos(v.angle) * dy };
  }
  function point(s, x, y) {
    const v = view(s), dx = x - v.x, dy = y - v.y;
    return { x: (Math.cos(v.angle) * dx + Math.sin(v.angle) * dy) / v.sx + s.camera.x,
      y: (-Math.sin(v.angle) * dx + Math.cos(v.angle) * dy) / v.sy + s.camera.y };
  }
  function release(s) { s.held = false; s.activeId = null; s.targetX = s.targetY = 0; }
  function contact(s, p, speed, material) {
    if (speed < 17 || p.cool > 0) return;
    p.cool = .09; s.impactCount++; s.contacts.push({ x: p.x, y: p.y, speed, material });
  }
  function knock(s, x, y) {
    s.ringV += .45;
    // Physical world impulse must not depend on render-rate camera smoothing.
    const centreX = s.seeds.reduce((n,p) => n+p.x,0) / s.seeds.length;
    const centreY = s.seeds.reduce((n,p) => n+p.y,0) / s.seeds.length;
    s.vx += clamp((x - centreX) / 110, -1, 1) * .09;
    s.vy += clamp((y - centreY) / 110, -1, 1) * .09;
    for (const p of s.seeds) {
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
      const force = 58 * Math.exp(-d / 170); p.vx += dx / d * force; p.vy += dy / d * force;
    }
  }
  function wall(s, p, nx, ny, penetration, material) {
    if (penetration <= 0) return;
    p.x += nx * penetration; p.y += ny * penetration;
    const vn = p.vx * nx + p.vy * ny;
    if (vn < 0) {
      const bounce = material === 'cushion' ? .08 : .22;
      p.vx -= (1 + bounce) * vn * nx; p.vy -= (1 + bounce) * vn * ny;
      p.spin += (p.vx * ny - p.vy * nx) * .005; contact(s, p, -vn, material);
    }
  }
  function boundary(s, p, o = opening(s)) {
    if (o < 1) {
      // The visible rim expands and unrolls together with its physical boundary.
      const radius = 94 + o * 1150, dx = p.x - START.x, dy = (p.y - START.y) / .8;
      const r = Math.hypot(dx, dy), len = Math.hypot(dx, dy / .8) || 1;
      if (r > radius) wall(s, p, -dx / len, -dy / .8 / len, (r - radius) * .8, 'rim');
    }
    if (o > 0) for (let n = 0; n < 3; n++) {
      const f = floor(p.x), lift = (1 - o) * 700;
      const penetration = (p.y - f.y - lift) * -f.ny + support(p, f.nx, f.ny);
      wall(s, p, f.nx, f.ny, penetration, f.material);
      wall(s, p, 1, 0, -40 + support(p, 1, 0) - p.x, 'rim');
      wall(s, p, -1, 0, p.x + support(p, 1, 0) - 2060, 'rim');
    }
  }
  function step(s, dt) {
    s.time += dt;
    if (s.transition) {
      s.transition.elapsed = Math.min(DURATION, s.transition.elapsed + dt);
      s.transition.progress = s.transition.elapsed / DURATION;
      s.transition.settled = s.transition.elapsed >= DURATION;
    }
    const o = opening(s), k = s.held ? T.grabK : T.returnK, d = s.held ? T.grabD : T.returnD;
    const ax = k * (s.targetX - s.x) - d * s.vx, ay = k * (s.targetY - s.y) - d * s.vy;
    s.vx += ax * dt; s.vy += ay * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    s.ringV += (-490 * s.ring - 9 * s.ringV) * dt; s.ring += s.ringV * dt;
    for (const p of s.seeds) {
      p.cool = Math.max(0, p.cool - dt);
      const f = floor(p.x), dx = p.x - START.x, dy = p.y - START.y;
      const concave = (.25 + Math.hypot(dx, dy / .8) * .013) * (1 - o);
      const fx = T.gravity * s.x - ax * 9 - dx * concave;
      const fy = ((T.gravity * s.y - ay * 9) * .8 - dy * concave) * (1 - o)
        + (360 + T.gravity * s.y * .65 - ay * 9) * o;
      p.vx += fx * dt; p.vy += fy * dt;
      const grounded = Math.abs((p.y - f.y) * -f.ny + support(p, f.nx, f.ny)) < 2;
      const cross = Math.abs(-Math.sin(p.angle) * p.vx + Math.cos(p.angle) * p.vy) / Math.max(1, Math.hypot(p.vx, p.vy));
      const friction = grounded ? (f.material === 'polished' ? 3 : 7 + cross * 3) : 0;
      const drag = (.65 * (1 - o) + (f.material === 'polished' && grounded ? 1.15 : 1.35) * o) * p.dragFactor;
      const loss = Math.exp(-drag * dt) * Math.max(0, 1 - friction * dt / Math.max(.01, Math.hypot(p.vx, p.vy)));
      p.vx *= loss; p.vy *= loss; p.x += p.vx * dt; p.y += p.vy * dt;
      p.spin += ((p.vx + p.vy * .35) / 26 - p.spin) * (1 - Math.exp(-4 * dt));
      p.angle += p.spin * dt; p.turn += (p.vx * Math.sin(p.angle) - p.vy * Math.cos(p.angle)) / 35 * dt;
      p.roll += ((.73 + .27 * Math.abs(Math.cos(p.turn))) - p.roll) * o * (1 - Math.exp(-6 * dt));
      boundary(s, p, o);
    }
    for (let i = 0; i < s.seeds.length; i++) for (let j = i + 1; j < s.seeds.length; j++) {
      const a = s.seeds[i], b = s.seeds[j], dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || .01, nx = dx / distance, ny = dy / distance;
      const reach = support(a, nx, ny) + support(b, nx, ny);
      if (distance >= reach) continue;
      const overlap = (reach - distance) * .51;
      a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
      const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relative < 0) {
        const impulse = -(1 + T.seedBounce) * relative / 2;
        a.vx -= nx * impulse; a.vy -= ny * impulse; b.vx += nx * impulse; b.vy += ny * impulse;
        contact(s, a, -relative, 'seed');
      }
    }
    for (const p of s.seeds) boundary(s, p, o);
    const together = o === 1 && s.seeds.every(p => p.x > END.left && p.x < END.right && Math.hypot(p.vx, p.vy) < 24);
    s.quiet = together ? s.quiet + dt : 0; s.finished = s.quiet > 3.6;
  }
  function camera(s, dt) {
    const xs = s.seeds.map(p => p.x), ys = s.seeds.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), maxY = Math.max(...ys);
    const centre = (minX + maxX) / 2;
    const z = clamp(350 / (maxX - minX + 65), 1.15, ZOOM);
    const o = opening(s);
    if (s.transition && !s.transition.settled) {
      const t = smooth(s.transition.progress);
      s.camera.z = 1 + (ZOOM - 1) * t;
      s.camera.x = START.x + (centre - START.x) * t;
      s.camera.y = START.y + (Math.max(START.y, maxY - 90) - START.y) * o;
    } else {
      const follow = 1 - Math.exp(-3 * dt);
      s.camera.x += (centre - s.camera.x) * follow;
      s.camera.y += (Math.max(START.y, maxY - 90) - s.camera.y) * follow;
      s.camera.z += (z - s.camera.z) * (1 - Math.exp(-1.8 * dt));
    }
  }
  function update(s, elapsed) {
    s.contacts.length = 0; s.accumulator += clamp(elapsed, 0, .06);
    while (s.accumulator >= T.step) { step(s, T.step); s.accumulator -= T.step; }
    camera(s, clamp(elapsed, 0, .06));
  }
  const api = Object.freeze({ create, release, knock, update, point, screenPoint, view, field, floor,
    support, terrain, START, END, opening, smooth, DURATION, ZOOM });
  root.PumpkinJourney = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
