(function (root) {
  'use strict';
  const { follow } = typeof module !== 'undefined' && module.exports ? require('./math.js') : root.MotionMath;
  class Puddle {
    constructor(width, height) { this.width = width; this.height = height; this.reset(); }
    reset() { this.touches = new Map(); this.ripples = []; this.time = 0; this.moon = { x: this.width / 2, y: this.height / 2, wobble: 0 }; }
    spawn(x, y, p, count = 1) {
      for (let i = 0; i < count; i++) this.ripples.push({ x, y, radius: (8 + p.size * .46) * (1 + i * .24), progress: 0, phase: i });
      if (this.ripples.length > 128) this.ripples.splice(0, this.ripples.length - 128);
      this.moon.wobble = Math.min(1.5, this.moon.wobble + .32);
    }
    pointer(e, p) {
      if (e.type === 'down') { this.touches.set(e.id, { x: e.x, y: e.y, tx: e.x, ty: e.y, lastX: e.x, lastY: e.y, timer: 0 }); this.spawn(e.x, e.y, p, 2); }
      else if (e.type === 'move' && this.touches.has(e.id)) Object.assign(this.touches.get(e.id), { tx: e.x, ty: e.y });
      else if ((e.type === 'up' || e.type === 'cancel') && this.touches.has(e.id)) {
        const t = this.touches.get(e.id); if (e.type === 'up') this.spawn(t.x, t.y, p); this.touches.delete(e.id);
      }
    }
    clearTouches() { this.touches.clear(); }
    resize(w, h) {
      const sx = w / this.width, sy = h / this.height;
      this.ripples.forEach(r => { r.x *= sx; r.y *= sy; r.radius *= Math.min(sx, sy); });
      this.moon.x *= sx; this.moon.y *= sy; this.width = w; this.height = h; this.clearTouches();
    }
    update(dt, p) {
      this.time += dt;
      for (const t of this.touches.values()) {
        t.x = follow(t.x, t.tx, 4, dt); t.y = follow(t.y, t.ty, 4, dt); t.timer += dt;
        if (t.timer >= .025 + p.interval * .003 && Math.hypot(t.x - t.lastX, t.y - t.lastY) > 3 + p.interval * .25) {
          this.spawn(t.x, t.y, p); t.timer = 0; t.lastX = t.x; t.lastY = t.y;
        }
      }
      const first = this.touches.values().next().value;
      this.moon.x = follow(this.moon.x, first?.x ?? this.width / 2, first ? 1.5 : .5, dt);
      this.moon.y = follow(this.moon.y, first?.y ?? this.height / 2, first ? 1.5 : .5, dt);
      this.moon.wobble *= Math.exp(-1.2 * dt);
      const lifetime = 4.5 - p.damping * .039;
      for (const r of this.ripples) { r.radius += (25 + p.speed * 2.4) * dt * .5; r.progress += dt / lifetime; }
      this.ripples = this.ripples.filter(r => r.progress < 1);
    }
    draw(c) {
      c.globalCompositeOperation = 'lighter';
      const mx = this.width / 2, my = this.height / 2, dx = this.moon.x - mx, dy = this.moon.y - my;
      const size = Math.max(22, Math.min(this.width, this.height) * .085), angle = Math.atan2(dy, dx);
      c.save(); c.translate(mx, my); c.rotate(angle);
      const stretch = 1 + Math.min(.8, Math.hypot(dx, dy) * .0015); c.scale(stretch, 1 / stretch);
      for (let i = 1; i <= 6; i++) {
        const split = this.moon.wobble * 16;
        const x = Math.hypot(dx, dy) * .0225 * i + Math.sin(this.time * 9 * i * .6) * split;
        const y = Math.cos(this.time * 9 * i * .4) * split;
        c.fillStyle = `rgba(190,215,240,${.075 - i * .009})`; c.beginPath(); c.arc(x, y, size + i * 4, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      for (const r of this.ripples) {
        const alpha = Math.pow(1 - r.progress, 1.35) * .45;
        c.strokeStyle = `rgba(173,213,233,${alpha})`; c.lineWidth = Math.max(.5, (1 - r.progress) * 2.4);
        c.beginPath(); c.arc(r.x, r.y, r.radius, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = `rgba(173,213,233,${alpha * .22})`; c.lineWidth = 5;
        c.beginPath(); c.arc(r.x, r.y, Math.max(1, r.radius - 3), 0, Math.PI * 2); c.stroke();
      }
      c.globalCompositeOperation = 'source-over';
    }
    snapshot() { return { touches: this.touches.size, moon: { ...this.moon }, ripples: this.ripples.map(r => ({ ...r })) }; }
    dispose() { this.clearTouches(); this.ripples = []; }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = Puddle;
  else root.MotionPuddle = Puddle;
})(typeof window !== 'undefined' ? window : globalThis);
