(function (root, factory) {
  'use strict';
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.TeaUnfoldModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DURATION = 30, STEP = 1 / 120;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const smooth = (lo, hi, v) => { const x = clamp((v - lo) / (hi - lo)); return x * x * (3 - 2 * x); };

  function opening(seconds) {
    return {
      swell: smooth(3, 14, seconds),
      spine: smooth(9, 24, seconds),
      left: smooth(10, 23, seconds),
      right: smooth(15, 27, seconds),
      settle: smooth(25, 30, seconds),
    };
  }

  // A continuous sheet: the midrib unrolls longitudinally; two laminae
  // unfold at different times around it. Constant topology exposes hidden
  // inner surface instead of swapping sprites or scaling a flat silhouette.
  function leafPoint(s, v, seconds) {
    const o = opening(seconds);
    const localOpen = smooth(v < 0 ? 10 : 15, v < 0 ? 23 : 27,
      seconds - 1.3 * Math.sin(s * Math.PI * 1.4));
    const curl = 5.65 * (1 - o.spine) + 0.18;
    const theta = (s - 0.48) * curl;
    const length = 147 * (1 + o.swell * 0.08);
    const edge = Math.pow(Math.max(0, Math.sin(Math.PI * s)), 0.76);
    const serration = 1 + 0.036 * Math.sin(s * Math.PI * 32);
    const width = 39 * edge * serration * (v < 0 ? 0.92 : 1.04);
    const fold = (2.65 * (1 - localOpen) + 0.2) * v;
    const radius = width / (2.65 * (1 - localOpen) + 0.2);
    const x = radius * Math.sin(fold) + 3.5 * Math.sin(s * 5) * o.spine;
    const cup = radius * (1 - Math.cos(fold));
    const crinkle = (1.3 + 2.7 * (1 - localOpen)) * Math.sin(s * 32 + v * 4) * Math.abs(v) * edge;
    return {
      x,
      y: length * Math.sin(theta) / curl - cup * Math.sin(theta),
      z: length * (1 - Math.cos(theta)) / curl + cup * Math.cos(theta) + crinkle,
    };
  }

  function rotate(p, yaw, pitch, roll) {
    const a = { x: p.x * Math.cos(yaw) + p.z * Math.sin(yaw), y: p.y, z: -p.x * Math.sin(yaw) + p.z * Math.cos(yaw) };
    const b = { x: a.x, y: a.y * Math.cos(pitch) - a.z * Math.sin(pitch), z: a.y * Math.sin(pitch) + a.z * Math.cos(pitch) };
    return { x: b.x * Math.cos(roll) - b.y * Math.sin(roll), y: b.x * Math.sin(roll) + b.y * Math.cos(roll), z: b.z };
  }

  class Tea {
    constructor(options = {}) { this.ambientMotion = options.ambientMotion ?? 1; this.reset(); }
    reset() {
      this.startedAt = null; this.elapsed = 0; this.mode = 'ready'; this.finished = false;
      this.water = { x: 0, y: 0, vx: 0, vy: 0 };
      this.leaf = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, omega: 0 };
      this.target = { x: 0, y: 0 }; this.contact = null; this.accumulator = 0;
      this.motionTime = 0;
    }
    start(now) {
      if (this.mode !== 'ready') return false;
      this.startedAt = now; this.mode = 'steeping'; return true;
    }
    begin(x, y) { if (this.mode !== 'ready') this.contact = { x, y }; }
    drag(x, y) {
      if (!this.contact || this.mode === 'ready') return;
      this.target.x = clamp(this.target.x + (x - this.contact.x) * 0.62, -60, 60);
      this.target.y = clamp(this.target.y + (y - this.contact.y) * 0.5, -48, 48);
      this.contact = { x, y };
    }
    release() { this.contact = null; this.target.x = this.target.y = 0; }
    // Clock uses monotonic elapsed time, independent of drag and physics.
    // A long hidden-page gap advances the clock, not the simulation impulse.
    update(dt, now) {
      let completed = false;
      if (this.startedAt !== null) {
        this.elapsed = Math.max(this.elapsed, clamp((now - this.startedAt) / 1000, 0, DURATION));
        if (this.elapsed >= DURATION && !this.finished) {
          this.finished = true; this.mode = 'rest'; completed = true;
        }
      }
      this.accumulator += clamp(Number.isFinite(dt) ? dt : 0, 0, 0.15);
      while (this.accumulator + 1e-9 >= STEP) {
        this.step(STEP, Math.max(0, this.elapsed - this.accumulator + STEP));
        this.accumulator -= STEP;
      }
      return completed;
    }
    step(dt, seconds = this.elapsed) {
      const w = this.water, l = this.leaf;
      this.motionTime += dt;
      const o = opening(seconds);
      const area = 0.25 + 0.75 * (o.left + o.right) / 2;
      for (const axis of ['x', 'y']) {
        const vel = 'v' + axis;
        // A tiny slow convection current keeps the steeped leaf alive after
        // completion. It moves the water, never animates the leaf separately.
        const drift = this.mode === 'ready' ? 0 : Math.sin(this.motionTime * 0.58 + (axis === 'x' ? 0 : 1.8)) *
          1.2 * this.ambientMotion * smooth(0, 2, this.elapsed);
        w[vel] += ((this.target[axis] + drift - w[axis]) * 23 - w[vel] * 5.4) * dt;
        w[axis] += w[vel] * dt;
        // Water moves first. Larger exposed lamina catches more flow.
        l[vel] += ((w[axis] - l[axis]) * (4.5 + area * 7) + w[vel] * area * 0.6 - l[vel] * 3.8) * dt;
        l[axis] += l[vel] * dt;
      }
      // Asymmetric unfolding changes drag/torque, so the reveal and the
      // slight turn belong to one motion, also when the user does nothing.
      const turn = (o.left - o.right) * 0.23 + w.vx * area * 0.0018 + l.x * 0.002;
      l.omega += ((turn - l.angle) * 7 - l.omega * 4.4) * dt;
      l.angle += l.omega * dt;
    }
    pose() {
      const t = this.elapsed, o = opening(t);
      const wet = this.mode !== 'ready';
      return {
        x: 195 + this.leaf.x * 0.52,
        y: wet ? 513 - 132 * smooth(0, 1.8, t) + 45 * smooth(1.8, 7, t) + this.leaf.y * 0.46 : 513,
        yaw: -0.16 + o.spine * 0.17 + this.leaf.x * 0.004,
        pitch: 0.3 - o.spine * 0.08 + this.leaf.y * 0.003,
        roll: -0.55 + this.leaf.angle,
      };
    }
    snapshot() {
      return { mode: this.mode, elapsed: this.elapsed, remaining: DURATION - this.elapsed,
        opening: opening(this.elapsed), pose: this.pose(), water: { ...this.water }, leaf: { ...this.leaf },
        contact: !!this.contact };
    }
  }
  return Object.freeze({ Tea, DURATION, STEP, clamp, smooth, opening, leafPoint, rotate });
});
