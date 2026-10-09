(function (root) {
  'use strict';
  const { clamp, follow } = typeof module !== 'undefined' && module.exports ? require('./math.js') : root.MotionMath;
  class Slime {
    constructor(width, height) { this.width = width; this.height = height; this.pools = new Map(); this.reset(); }
    reset() {
      this.pools.clear(); this.stretch = 0;
      this.nodes = Array.from({ length: 35 }, (_, i) => { const angle = i * 1.5; return { x: this.width / 2 + Math.sin(angle) * 10, y: this.height * .46 + Math.cos(angle) * 10, vx: 0, vy: 0 }; });
    }
    pointer(event) {
      if (event.type === 'down') {
        if (this.pools.size >= 2) return;
        const previous = [...this.pools.values()].at(-1);
        this.pools.set(event.id, { x: previous?.x ?? event.x, y: previous?.y ?? event.y, tx: event.x, ty: event.y });
      } else if (event.type === 'move' && this.pools.has(event.id)) {
        Object.assign(this.pools.get(event.id), { tx: event.x, ty: event.y });
      } else if (event.type === 'up' || event.type === 'cancel') this.pools.delete(event.id);
    }
    clearTouches() { this.pools.clear(); }
    resize(width, height) {
      const sx = width / this.width, sy = height / this.height;
      this.nodes.forEach(n => { n.x *= sx; n.y *= sy; n.vx *= sx; n.vy *= sy; });
      this.width = width; this.height = height; this.clearTouches();
    }
    update(dt, p) {
      const scale = Math.min(this.width, this.height) / 480;
      const rate = 22 - p.viscosity * .2;
      for (const pool of this.pools.values()) { pool.x = follow(pool.x, pool.tx, rate, dt); pool.y = follow(pool.y, pool.ty, rate, dt); }
      const pools = [...this.pools.values()], a = pools[0], b = pools[1];
      const distance = b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
      this.stretch = follow(this.stretch, distance, 10, dt);
      const spring = 22 + p.elasticity * 1.6, drag = 2.5 + p.damping * .18;
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i], t = i / (this.nodes.length - 1), angle = i * 1.5;
        let tx = this.width / 2 + Math.sin(angle) * 12 * scale, ty = this.height * .46 + Math.cos(angle) * 12 * scale;
        if (b) { tx = a.x * (1 - t) + b.x * t; ty = a.y * (1 - t) + b.y * t + 4 * t * (1 - t) * p.weight * 2.2 * scale; }
        else if (a) { tx = a.x + Math.sin(angle) * 12 * scale; ty = a.y + Math.cos(angle) * 12 * scale; }
        n.vx += (tx - n.x) * spring * dt;
        n.vy += ((ty - n.y) * spring + p.weight * 1.5 * scale) * dt;
        const damping = Math.exp(-drag * dt);
        n.vx *= damping; n.vy *= damping;
        const speed = Math.hypot(n.vx, n.vy), limit = 1500 * Math.max(.5, scale);
        if (speed > limit) { n.vx *= limit / speed; n.vy *= limit / speed; }
        n.x = clamp(n.x + n.vx * dt, -50, this.width + 50); n.y = clamp(n.y + n.vy * dt, -50, this.height + 50);
      }
    }
    draw(c) {
      const scale = Math.min(this.width, this.height) / 480;
      const volume = Math.max(.55, 1 - this.stretch / Math.max(400, this.width * 1.4));
      c.fillStyle = '#70b59b'; c.beginPath();
      for (let i = 0; i < this.nodes.length - 1; i++) {
        const a = this.nodes[i], b = this.nodes[i + 1], dist = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.min(80, Math.ceil(dist / 5) + 1);
        for (let j = 0; j <= steps; j++) {
          const t = j / steps, ratio = (i + t) / 34, edge = 2 * ratio - 1;
          const r = Math.max(10, 38 * scale) * (.65 + .4 * (1 - edge * edge)) * Math.max(.75, 1 - dist / 250) * volume;
          const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
          c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      c.fill();
      // One translucent highlight follows the mass, rather than outlining every node.
      const middle = this.nodes[17]; const glow = c.createRadialGradient(middle.x - 8, middle.y - 10, 0, middle.x, middle.y, 50 * Math.max(.5, scale));
      glow.addColorStop(0, '#e6fff427'); glow.addColorStop(1, '#e6fff400'); c.fillStyle = glow;
      c.beginPath(); c.arc(middle.x, middle.y, 50 * Math.max(.5, scale), 0, Math.PI * 2); c.fill();
    }
    snapshot() { return { touches: this.pools.size, stretch: this.stretch, nodes: this.nodes.map(n => ({ ...n })) }; }
    dispose() { this.clearTouches(); this.nodes = []; }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = Slime;
  else root.MotionSlime = Slime;
})(typeof window !== 'undefined' ? window : globalThis);
