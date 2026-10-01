(function (root) {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Work-owned mechanics. Seconds, logical pixels; never frame-count decay.
  const TUNE = Object.freeze({ step: 1 / 120, grabK: 58, grabD: 7.2,
    returnK: 36, returnD: 3.8, maxTilt: 0.38, seedDrag: 0.65,
    rollingFriction: 8, gravity: 920, wallBounce: 0.32, seedBounce: 0.28 });
  function create() {
    return { time: 0, accumulator: 0, held: false, activeId: null,
      targetX: 0, targetY: 0, x: 0, y: 0, vx: 0, vy: 0,
      ring: 0, ringV: 0, contacts: [], marks: [], impactCount: 0,
      seeds: Array.from({ length: 9 }, (_, i) => ({
        x: Math.cos(i * 2.399) * (12 + i * 5),
        y: Math.sin(i * 2.399) * (12 + i * 5), vx: 0, vy: 0,
        angle: i * 2.399, spin: 0, cool: 0, r: 8.5,
      })),
    };
  }
  function createPrologue() {
    const s = create(); s.detachments = []; s.lastDetachTime = -10;
    const loose = [0, 2, 6];
    for (const [i, p] of s.seeds.entries()) {
      if (loose.includes(i)) {
        const a = loose.indexOf(i) * Math.PI * 2 / 3 + .4;
        p.x = Math.cos(a) * 65; p.y = Math.sin(a) * 65;
      } else {
        const a = i * 2.399, ax = Math.cos(a) * (7 + i * 1.5), ay = Math.sin(a) * (7 + i * 1.5);
        p.x = ax + Math.cos(a) * 13; p.y = ay + Math.sin(a) * 13;
        p.attached = true;
        p.tether = { ax, ay, length: 15, damage: 0, strength: 1.15 + i * .10, detachedAt: null };
      }
    }
    return s;
  }
  function allLoose(s) { return s.seeds.every(p => !p.attached); }
  function knock(s, x, y) {
    s.ringV += 0.85;
    s.vx += clamp(x / 100, -1, 1) * 0.09;
    s.vy += clamp(y / 100, -1, 1) * 0.09;
    for (const p of s.seeds) {
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
      const force = 58 * Math.exp(-d / 105);
      p.vx += dx / d * force; p.vy += dy / d * force;
    }
  }
  function release(s) {
    s.held = false; s.activeId = null; s.targetX = s.targetY = 0;
    // Leave both velocities intact. Let the vessel and its contents finish.
  }
  function contact(s, p, speed, material) {
    if (speed < 17 || p.cool > 0) return;
    p.cool = 0.09;
    s.contacts.push({ speed, x: p.x, y: p.y, material }); s.impactCount++;
  }
  function step(s, dt) {
    s.time += dt;
    const k = s.held ? TUNE.grabK : TUNE.returnK;
    const d = s.held ? TUNE.grabD : TUNE.returnD;
    const ax = k * (s.targetX - s.x) - d * s.vx;
    const ay = k * (s.targetY - s.y) - d * s.vy;
    s.vx += ax * dt; s.vy += ay * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.ringV += (-490 * s.ring - 9 * s.ringV) * dt;
    s.ring += s.ringV * dt;
    for (const p of s.seeds) {
      p.cool = Math.max(0, p.cool - dt);
      const r = Math.hypot(p.x, p.y);
      // A concave interior, not a flat screen. The rim gets progressively steep.
      const bowl = 0.25 + r * 0.013;
      let fx = TUNE.gravity * s.x - p.x * bowl - ax * 9;
      let fy = TUNE.gravity * s.y - p.y * bowl - ay * 9;
      if (p.attached) {
        const t = p.tether, dx = p.x - t.ax, dy = p.y - t.ay;
        const length = Math.hypot(dx, dy) || 1, extension = Math.max(0, length - t.length);
        const spring = 26 * (1 - .25 * Math.min(1, t.damage / t.strength));
        fx -= dx / length * extension * spring + p.vx * 1.4;
        fy -= dy / length * extension * spring + p.vy * 1.4;
        // Fatigue comes from physical extension, not elapsed play or tapping a grain.
        t.damage += Math.max(0, extension - 4) * .055 * dt;
        if (t.damage >= t.strength && s.time - s.lastDetachTime > .7) {
          p.attached = false; t.detachedAt = s.time; s.lastDetachTime = s.time;
          s.detachments.push(p);
        }
      }
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 2 || Math.hypot(fx, fy) > 12) {
        p.vx += fx * dt; p.vy += fy * dt;
        const v = Math.hypot(p.vx, p.vy);
        const friction = Math.max(0, 1 - TUNE.rollingFriction * dt / Math.max(v, 0.01));
        const drag = Math.exp(-TUNE.seedDrag * dt) * friction;
        p.vx *= drag; p.vy *= drag;
      } else { p.vx = p.vy = 0; }
      const ox = p.x, oy = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.spin += ((p.vx + p.vy * 0.35) / 24 - p.spin) * (1 - Math.exp(-5 * dt));
      p.angle += p.spin * dt;
      const rr = Math.hypot(p.x, p.y);
      if (rr > 94) {
        const nx = p.x / rr, ny = p.y / rr;
        p.x = nx * 94; p.y = ny * 94;
        const vn = p.vx * nx + p.vy * ny;
        if (vn > 0) {
          p.vx -= (1 + TUNE.wallBounce) * vn * nx;
          p.vy -= (1 + TUNE.wallBounce) * vn * ny;
          contact(s, p, vn, "rim");
          s.ringV += Math.min(0.2, vn * 0.0005);
        }
      }
      if (Math.hypot(p.x - ox, p.y - oy) > 0.75 && Math.floor(s.time * 22) !== Math.floor((s.time - dt) * 22)) {
        s.marks.push({ x: p.x, y: p.y, ox, oy, age: 0 });
      }
    }
    for (let i = 0; i < s.seeds.length; i++) {
      const a = s.seeds[i];
      for (let j = i + 1; j < s.seeds.length; j++) {
        const b = s.seeds[j]; const dx = b.x - a.x, dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 0.01;
        if (distance >= a.r + b.r) continue;
        const nx = dx / distance, ny = dy / distance;
        const overlap = (a.r + b.r - distance) * 0.51;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;
        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relative < 0) {
          const impulse = -(1 + TUNE.seedBounce) * relative / 2;
          a.vx -= nx * impulse; a.vy -= ny * impulse;
          b.vx += nx * impulse; b.vy += ny * impulse;
          contact(s, a, -relative, "seed");
          if (a.attached) a.tether.damage += Math.min(.14, -relative * .0006);
          if (b.attached) b.tether.damage += Math.min(.14, -relative * .0006);
        }
      }
    }
    for (const m of s.marks) m.age += dt;
    s.marks = s.marks.filter(m => m.age < 18).slice(-340);
  }
  function update(s, elapsed) {
    s.contacts.length = 0;
    if (s.detachments) s.detachments.length = 0;
    s.accumulator += clamp(elapsed, 0, 0.06);
    while (s.accumulator >= TUNE.step) { step(s, TUNE.step); s.accumulator -= TUNE.step; }
  }
  const api = Object.freeze({ create, createPrologue, allLoose, update, knock, release, TUNE });
  root.PumpkinDynamics = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
