(function (root) {
  'use strict';
  const T = root.PumpkinDynamics ? root.PumpkinDynamics.TUNE : require('./dynamics.js').TUNE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const START = { x: 245, y: 235 };
  // One connected interior. Geometry is also the drawing source; no invisible rails.
  const bowls = [
    { x: 245, y: 235, r: 105, kind: 'bowl', material: 'flesh' },
    { x: 231, y: 586, r: 107, kind: 'bowl', material: 'flesh' },
    { x: 272, y: 1056, r: 114, kind: 'bowl', material: 'flesh' },
    { x: 240, y: 1362, r: 66, kind: 'bowl', material: 'rest' },
  ];
  const routes = [
    [[318, 302], [350, 392], [297, 501], [260, 551]],
    [[159, 660], [124, 757], [151, 858], [233, 952]],
    [[347, 1134], [345, 1248], [260, 1312]],
  ];
  const lanes = routes.flatMap((points, i) => points.slice(1).map((p, j) => ({
    ax: points[j][0], ay: points[j][1], bx: p[0], by: p[1],
    r: i === 1 ? 30 : 34, kind: 'lane', material: i === 1 ? 'fiber' : 'wet',
  })));
  const geometry = [...bowls, ...lanes];
  function closest(x, y, g) {
    if (g.kind === 'bowl') return { x: g.x, y: g.y };
    const dx = g.bx - g.ax, dy = g.by - g.ay;
    const t = clamp(((x - g.ax) * dx + (y - g.ay) * dy) / (dx * dx + dy * dy), 0, 1);
    return { x: g.ax + t * dx, y: g.ay + t * dy };
  }
  function field(x, y) {
    let best;
    for (const g of geometry) {
      const q = closest(x, y, g), dx = x - q.x, dy = y - q.y;
      const d = Math.hypot(dx, dy), signed = d - g.r;
      if (!best || signed < best.signed) best = { g, q, d, signed, nx: dx / (d || 1), ny: dy / (d || 1) };
    }
    return best;
  }
  function support(p, nx, ny) {
    const c = Math.cos(p.angle), s = Math.sin(p.angle);
    return Math.hypot(10.3 * (nx * c + ny * s), 5.5 * (-nx * s + ny * c));
  }
  function create(source) {
    const s = { time: 0, accumulator: 0, held: source?.held || false, activeId: source?.activeId ?? null,
      x: source?.x || 0, y: source?.y || 0, vx: source?.vx || 0, vy: source?.vy || 0,
      targetX: source?.targetX || 0, targetY: source?.targetY || 0,
      anchorX: source?.anchorX, anchorY: source?.anchorY,
      ring: source?.ring || 0, ringV: source?.ringV || 0, contacts: [],
      marks: source ? source.marks.filter(m => m.age < 12).map(m => ({ ...m, x: m.x + START.x, y: m.y + START.y, ox: m.ox + START.x, oy: m.oy + START.y })) : [], impactCount: 0,
      camera: { x: START.x, y: START.y, z: 1 },
      fibres: [
        { ax: 101, ay: 751, bx: 155, by: 769, bend: 0, v: 0, cool: 0 },
        { ax: 128, ay: 823, bx: 171, by: 815, bend: 0, v: 0, cool: 0 },
      ],
      quiet: 0, finished: false, seeds: source ? source.seeds : root.PumpkinDynamics.create().seeds,
    };
    // These are the SAME grains, not a new party. Keep pose and momentum.
    for (const [i, p] of s.seeds.entries()) {
      p.x += START.x; p.y += START.y; p.attached = false;
      p.dragFactor = .93 + i % 4 * .045; p.turn = p.angle; p.roll = 1;
    }
    return s;
  }
  function release(s) { s.held = false; s.activeId = null; s.targetX = s.targetY = 0; }
  function contact(s, p, speed, material) {
    if (speed < 17 || p.cool > 0) return;
    p.cool = .09; s.impactCount++;
    s.contacts.push({ x: p.x, y: p.y, speed, material });
  }
  function knock(s, x, y) {
    s.vx += clamp((x - s.camera.x) / 110, -1, 1) * .09;
    s.vy += clamp((y - s.camera.y) / 110, -1, 1) * .09;
    for (const p of s.seeds) {
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
      const force = 58 * Math.exp(-d / 170);
      p.vx += dx / d * force; p.vy += dy / d * force;
    }
  }
  function boundary(s, p) {
    // Re-evaluate the union after correction; the openings are real gaps in the lip.
    for (let n = 0; n < 2; n++) {
      const f = field(p.x, p.y), r = support(p, f.nx, f.ny);
      if (f.signed + r <= 0) break;
      p.x -= f.nx * (f.signed + r); p.y -= f.ny * (f.signed + r);
      const vn = p.vx * f.nx + p.vy * f.ny;
      if (vn > 0) {
        const bounce = .24 + .08 * Math.abs(Math.cos(p.angle) * f.nx + Math.sin(p.angle) * f.ny);
        p.vx -= (1 + bounce) * vn * f.nx; p.vy -= (1 + bounce) * vn * f.ny;
        p.spin += (p.vx * f.ny - p.vy * f.nx) * .006;
        contact(s, p, vn, 'rim');
      }
    }
  }
  function strandPoint(x, y, strand) {
    let nearest, old = { x: strand.ax, y: strand.ay };
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const end = { x: strand.ax + (strand.bx - strand.ax) * t,
        y: strand.ay + (strand.by - strand.ay) * t + 2 * (1 - t) * t * strand.bend };
      const q = closest(x, y, { kind: 'lane', ax: old.x, ay: old.y, bx: end.x, by: end.y });
      const d = Math.hypot(x - q.x, y - q.y);
      if (!nearest || d < nearest.d) nearest = { ...q, d };
      old = end;
    }
    return nearest;
  }
  function step(s, dt) {
    s.time += dt;
    const k = s.held ? T.grabK : T.returnK, d = s.held ? T.grabD : T.returnD;
    const ax = k * (s.targetX - s.x) - d * s.vx, ay = k * (s.targetY - s.y) - d * s.vy;
    s.vx += ax * dt; s.vy += ay * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    s.ringV += (-490 * s.ring - 9 * s.ringV) * dt; s.ring += s.ringV * dt;
    for (const f of s.fibres) {
      f.v += (-72 * f.bend - 7 * f.v) * dt; f.bend += f.v * dt;
      if (Math.abs(f.bend) > 22) { f.bend = clamp(f.bend, -22, 22); f.v *= .4; }
      f.cool = Math.max(0, f.cool - dt);
    }
    for (const p of s.seeds) {
      p.cool = Math.max(0, p.cool - dt);
      const f = field(p.x, p.y), speed = Math.hypot(p.vx, p.vy);
      let fx = T.gravity * s.x - ax * 9, fy = T.gravity * s.y - ay * 9;
      if (f.g.kind === 'bowl') {
        const concave = .25 + f.d * .013;
        fx -= (p.x - f.q.x) * concave; fy -= (p.y - f.q.y) * concave;
      }
      for (const strand of s.fibres) {
        const q = strandPoint(p.x, p.y, strand), dx = p.x - q.x, dy = p.y - q.y, dist = q.d || .01;
        const reach = support(p, dx / dist, dy / dist) + 2;
        if (dist < reach) {
          const push = (reach - dist) * 17;
          fx += dx / dist * push; fy += dy / dist * push;
          p.vx *= Math.exp(-1.1 * dt); p.vy *= Math.exp(-1.1 * dt);
          strand.v += p.vy * dt * 4;
          if (strand.cool === 0 && speed > 22) { contact(s, p, speed, 'fiber'); strand.cool = .3; }
        }
      }
      if (speed > 2 || Math.hypot(fx, fy) > 12) {
        p.vx += fx * dt; p.vy += fy * dt;
        const v = Math.hypot(p.vx, p.vy), cross = Math.abs(-Math.sin(p.angle) * p.vx + Math.cos(p.angle) * p.vy) / Math.max(v, 1);
        const friction = (f.g.material === 'wet' ? 4 : 6 + cross * 3) * p.dragFactor;
        const drag = Math.exp(-(f.g.material === 'wet' ? .38 : .65) * p.dragFactor * dt);
        const loss = Math.max(0, 1 - friction * dt / Math.max(v, .01)) * drag;
        p.vx *= loss; p.vy *= loss;
      } else p.vx = p.vy = 0;
      const ox = p.x, oy = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.spin += ((p.vx + p.vy * .35) / 26 - p.spin) * (1 - Math.exp(-4 * dt));
      p.angle += p.spin * dt; p.turn += (p.vx * Math.sin(p.angle) - p.vy * Math.cos(p.angle)) / 35 * dt;
      p.roll = .73 + .27 * Math.abs(Math.cos(p.turn));
      boundary(s, p);
      if (f.g.material === 'wet' && speed > 27 && Math.floor(s.time * 20) !== Math.floor((s.time - dt) * 20)) {
        s.marks.push({ x: p.x, y: p.y, ox, oy, age: 0 });
      }
      if (f.g.material === 'wet' && speed > 70 && p.cool === 0) {
        contact(s, p, speed * .4, 'wet'); p.cool = .38;
      }
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
    for (const p of s.seeds) boundary(s, p);
    for (const m of s.marks) m.age += dt;
    s.marks = s.marks.filter(m => m.age < 12).slice(-250);
    const together = s.seeds.every(p => Math.hypot(p.x - 240, p.y - 1362) < 59);
    s.quiet = together ? s.quiet + dt : 0;
    s.finished = s.quiet > 3.6;
  }
  function camera(s, dt) {
    const xs = s.seeds.map(p => p.x), ys = s.seeds.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const targetX = (minX + maxX) / 2, targetY = Math.max(START.y, (minY + maxY) / 2);
    const z = Math.min(1, 390 / (maxX - minX + 245), 740 / ((maxY - minY) * .8 + 350));
    const follow = 1 - Math.exp(-2.6 * dt);
    s.camera.x += (targetX - s.camera.x) * follow; s.camera.y += (targetY - s.camera.y) * follow;
    s.camera.z += (z - s.camera.z) * (1 - Math.exp(-1.8 * dt));
  }
  function update(s, elapsed) {
    s.contacts.length = 0; s.accumulator += clamp(elapsed, 0, .06);
    while (s.accumulator >= T.step) { step(s, T.step); s.accumulator -= T.step; }
    camera(s, clamp(elapsed, 0, .06));
  }
  function point(s, x, y) { return { x: (x - 195) / s.camera.z + s.camera.x, y: (y - 365) / (s.camera.z * .8) + s.camera.y }; }
  const api = Object.freeze({ create, release, knock, update, point, field, support, geometry, bowls, routes, START });
  root.PumpkinJourney = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
