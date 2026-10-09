(function (root) {
  'use strict';
  const { random, follow, clamp } = typeof module !== 'undefined' && module.exports ? require('./math.js') : root.MotionMath;
  class Firefly {
    constructor(width, height, seed = 1) { this.width = width; this.height = height; this.seed = seed; this.reset(); }
    reset() { this.rng = random(this.seed); this.touches = new Map(); this.particles = []; this.time = 0; this.water = { x: this.width / 2, y: this.height / 2, presence: 0, bitter: 0 }; this.mode = 'sweet'; }
    addParticle() {
      const r = this.rng;
      this.particles.push({ x: r() * this.width, y: r() * this.height, vx: 0, vy: 0, personal: .5 + r() * .5, phase: r() * Math.PI * 2, noise: r() * 100, ox: (r() - .5) * 90, oy: (r() - .5) * 90 });
    }
    pointer(e) {
      if (e.type === 'down' || e.type === 'move' && this.touches.has(e.id)) this.touches.set(e.id, { x: e.x, y: e.y, bitter: e.shiftKey });
      else if (e.type === 'up' || e.type === 'cancel') this.touches.delete(e.id);
    }
    clearTouches() { this.touches.clear(); }
    resize(w, h) {
      const sx = w / this.width, sy = h / this.height;
      this.particles.forEach(f => { f.x *= sx; f.y *= sy; f.vx *= sx; f.vy *= sy; });
      this.water.x *= sx; this.water.y *= sy; this.width = w; this.height = h; this.clearTouches();
    }
    update(dt, p) {
      this.time += dt;
      while (this.particles.length < p.count) this.addParticle();
      if (this.particles.length > p.count) this.particles.length = p.count;
      const touches = [...this.touches.values()], count = touches.length;
      if (count) {
        this.water.x = follow(this.water.x, touches.reduce((s, t) => s + t.x, 0) / count, 15, dt);
        this.water.y = follow(this.water.y, touches.reduce((s, t) => s + t.y, 0) / count, 15, dt);
      }
      this.water.presence = follow(this.water.presence, count ? 1 : 0, count ? 8 : 3.5, dt);
      const bitter = count >= 2 || touches.some(t => t.bitter) || this.mode === 'bitter';
      this.water.bitter = follow(this.water.bitter, bitter ? 1 : 0, 12, dt);
      const radius = 60 + p.radius * 4, w = this.water;
      const forces = this.particles.map(f => {
        let ax = (Math.sin(this.time * .7 + f.noise) + Math.sin(f.y * .008 + this.time * .3 + f.noise)) * 16;
        let ay = (Math.cos(this.time * .6 + f.noise) + Math.cos(f.x * .009 + this.time * .35 + f.noise)) * 16;
        const dx = w.x + f.ox - f.x, dy = w.y + f.oy - f.y, d = Math.hypot(dx, dy) || 1;
        const dist = Math.hypot(w.x - f.x, w.y - f.y);
        const influence = clamp(1 - dist / radius, 0, 1) * w.presence;
        if (d > 5) { const pull = (1 + p.attraction * .1) * 60 * f.personal * influence * (1 - w.bitter); ax += dx / d * pull; ay += dy / d * pull; }
        const rx = f.x - w.x, ry = f.y - w.y, rd = Math.hypot(rx, ry) || 1;
        const push = (10 + p.repulsion * 1.25) * 60 * influence * w.bitter;
        ax += rx / rd * push; ay += ry / rd * push;
        // Local spacing, deliberately weaker than touch response; no global swarm steering.
        for (const other of this.particles) {
          if (other === f) continue;
          const sx = f.x - other.x, sy = f.y - other.y, sd = Math.hypot(sx, sy);
          if (sd > .01 && sd < 24) { ax += sx / sd * (24 - sd) * 1.2; ay += sy / sd * (24 - sd) * 1.2; }
        }
        return { ax, ay };
      });
      this.particles.forEach((f, i) => {
        f.vx += forces[i].ax * dt; f.vy += forces[i].ay * dt;
        const friction = .88 + w.presence * (-.03 * (1 - w.bitter) + .07 * w.bitter);
        f.vx *= Math.pow(friction, dt * 60); f.vy *= Math.pow(friction, dt * 60);
        const speed = Math.hypot(f.vx, f.vy), max = 230;
        if (speed > max) { f.vx *= max / speed; f.vy *= max / speed; }
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < 7 || f.x > this.width - 7) { f.x = clamp(f.x, 7, this.width - 7); f.vx *= -.5; }
        if (f.y < 7 || f.y > this.height - 7) { f.y = clamp(f.y, 7, this.height - 7); f.vy *= -.5; }
      });
    }
    draw(c) {
      c.globalCompositeOperation = 'lighter';
      for (const f of this.particles) {
        const pulse = (Math.sin(this.time * 2.5 + f.phase) + 1) / 2, size = 4.5 + pulse * 2;
        c.save(); c.translate(f.x, f.y); c.rotate(Math.atan2(f.vy, f.vx));
        const stretch = 1 + Math.min(.4, Math.hypot(f.vx, f.vy) * .001); c.scale(stretch, 1 / stretch);
        const glow = c.createRadialGradient(0, 0, 0, 0, 0, size * 3);
        glow.addColorStop(0, `rgba(84,216,178,${.22 + pulse * .28})`); glow.addColorStop(1, 'rgba(84,216,178,0)');
        c.fillStyle = glow; c.beginPath(); c.arc(0, 0, size * 3, 0, Math.PI * 2); c.fill();
        c.fillStyle = `rgba(191,243,218,${.55 + pulse * .4})`; c.beginPath(); c.arc(0, 0, size / 2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#f1fff3'; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill(); c.restore();
      }
      c.globalCompositeOperation = 'source-over';
      if (this.water.presence > .02) {
        c.save(); c.globalAlpha = this.water.presence; c.fillStyle = this.water.bitter > .5 ? '#91c6b1' : '#d8b6b8';
        c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillText(this.water.bitter > .5 ? 'にがい' : 'あまい', this.water.x, this.water.y - 24); c.restore();
      }
    }
    snapshot() { return { touches: this.touches.size, time: this.time, water: { ...this.water }, particles: this.particles.map(f => ({ ...f })) }; }
    dispose() { this.clearTouches(); this.particles = []; }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = Firefly;
  else root.MotionFirefly = Firefly;
})(typeof window !== 'undefined' ? window : globalThis);
