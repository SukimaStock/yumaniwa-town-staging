(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RolledTeaModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ROWS = 80, COLS = 30;
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number.isFinite(x) ? x : lo));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const definitions = Object.freeze([
    Object.freeze({ length: 2.18, width: .53, angle: -.52, delay: .20, offset: .045, seed: 1 }),
    Object.freeze({ length: 1.50, width: .40, angle: 1.15, delay: .02, offset: .055, seed: 3 }),
  ]);
  function phases(progress, leaf, s) {
    const p = clamp(progress), d = definitions[leaf].delay;
    // The exposed tip/outer edge loosens first. Root and opposite fold lag.
    return {
      bend: smooth(d + .12 * (1 - s), .85 + d * .5 - .12 * s, p),
      left: smooth(d + .04 + .14 * (1 - s), .69 + d * .65, p),
      right: smooth(d + .17 + .13 * (1 - s), .88 + d * .4, p),
      wet: smooth(0, .32, p),
    };
  }
  function leafGrid(progress, leaf) {
    const def = definitions[leaf], points = [], p = clamp(progress);
    let cx = 0, cy = -.32, cz = def.offset;
    for (let row = 0; row <= ROWS; row++) {
      const s = row / ROWS, f = phases(p, leaf, s);
      // Repeated back-folds compact the material without a conspicuous spiral hole.
      const theta = (1 - f.bend) * (2.50 * Math.sin(s * 19 + def.seed) + .72 * Math.cos(s * 31))
        + .22 * Math.sin(s * 4.2 + leaf);
      const twist = (1 - f.bend) * (.45 * Math.sin(s * 8 + leaf) + .35) + .08 * Math.sin(s * 6);
      if (row) {
        const step = def.length / ROWS;
        cx += Math.sin(theta) * step;
        cy += Math.cos(theta) * step;
        cz += Math.sin(twist) * step * .24;
      }
      const silhouette = Math.pow(Math.max(0, Math.sin(Math.PI * s)), .72) * (1 - .18 * s);
      const ca = Math.cos(def.angle), sa = Math.sin(def.angle);
      for (let col = 0; col <= COLS; col++) {
        const v = col / COLS * 2 - 1;
        const side = v < 0 ? f.left : f.right;
        const fold = 2.72 * (1 - side) + .30 + .15 * Math.sin(s * 8 + leaf);
        const serration = 1 + .028 * Math.sin(s * Math.PI * 32 + def.seed) * Math.pow(Math.abs(v), 6);
        const width = def.width * silhouette * serration;
        const lateral = width * Math.sin(v * fold) / fold;
        const crease = width * (1 - Math.cos(v * fold)) / fold;
        const ripple = (.034 + .055 * (1 - side)) * Math.sin(s * 53 + v * 7 + def.seed) * Math.sin(Math.PI * s) * Math.abs(v);
        const cup = .19 * v * v * Math.sin(Math.PI * s);
        const x = cx + lateral * Math.cos(theta);
        const y = cy - lateral * Math.sin(theta);
        const z = cz + crease + cup + ripple + .11 * Math.sin(s * 15) * Math.abs(v) * (1 - Math.abs(v));
        points.push({ x: x * ca - (y + .32) * sa, y: x * sa + (y + .32) * ca - .32,
          z, s, v, leaf });
      }
    }
    return points;
  }
  const indices = [];
  for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) {
    const a = i * (COLS + 1) + j, b = a + COLS + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  function mesh(progress) {
    const positions = [], normals = [], uv = [], faces = [];
    for (let leaf = 0; leaf < 2; leaf++) {
      const pts = leafGrid(progress, leaf), ns = pts.map(() => [0, 0, 0]), offset = positions.length / 3;
      for (let k = 0; k < indices.length; k += 3) {
        const a = pts[indices[k]], b = pts[indices[k + 1]], c = pts[indices[k + 2]];
        const u = [b.x - a.x, b.y - a.y, b.z - a.z], v = [c.x - a.x, c.y - a.y, c.z - a.z];
        const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        for (let j = 0; j < 3; j++) {
          const id = indices[k + j]; for (let axis = 0; axis < 3; axis++) ns[id][axis] += n[axis];
          faces.push(offset + id);
        }
      }
      pts.forEach((q, i) => {
        positions.push(q.x, q.y, q.z);
        const len = Math.hypot(...ns[i]) || 1;
        normals.push(...ns[i].map(x => x / len)); uv.push(q.s, q.v, leaf);
      });
    }
    return { positions: new Float32Array(positions), normals: new Float32Array(normals),
      uv: new Float32Array(uv), indices: new Uint16Array(faces) };
  }
  function stem() {
    const positions = [], normals = [], uv = [], faces = [];
    const rows = 22, sides = 10;
    for (let i = 0; i <= rows; i++) {
      const s = i / rows;
      for (let j = 0; j < sides; j++) {
        const t = j / sides * Math.PI * 2, r = .019 * (1 - .28 * s);
        positions.push(.035 * Math.sin(s * 3) + Math.cos(t) * r, -.68 + .36 * s, .05 + Math.sin(t) * r);
        normals.push(Math.cos(t), 0, Math.sin(t)); uv.push(s, j / sides, 2);
        if (i < rows) { const a = i * sides + j, b = i * sides + (j + 1) % sides;
          faces.push(a, a + sides, b, b, a + sides, b + sides); }
      }
    }
    return { positions: new Float32Array(positions), normals: new Float32Array(normals),
      uv: new Float32Array(uv), indices: new Uint16Array(faces) };
  }
  function stage(p) {
    return p < .08 ? '折り込まれた、ひと粒' : p < .28 ? '外側が、少し緩む' : p < .52 ? '葉と茎が、見えてくる' : p < .85 ? '内側の折れが、ほどける' : '曲がりを残して、落ち着く';
  }
  class Playback {
    constructor() { this.progress = 0; this.playing = false; this.speed = 1; this.duration = 24; this.last = null; }
    seek(p) { this.progress = clamp(p); this.last = null; if (this.progress === 1) this.playing = false; }
    toggle() { if (!this.playing && this.progress === 1) this.seek(0); this.playing = !this.playing; this.last = null; }
    reset() { this.seek(0); this.playing = false; }
    suspend() { this.last = null; }
    advance(now) {
      if (!Number.isFinite(now)) return;
      if (this.playing && this.last !== null) {
        this.progress = clamp(this.progress + Math.max(0, now - this.last) / 1000 * this.speed / this.duration);
        if (this.progress === 1) this.playing = false;
      }
      this.last = now;
    }
    snapshot() { return { progress: this.progress, playing: this.playing, speed: this.speed, stage: stage(this.progress) }; }
  }
  return Object.freeze({ ROWS, COLS, definitions, clamp, smooth, phases, leafGrid, mesh, stem, stage, Playback });
});
