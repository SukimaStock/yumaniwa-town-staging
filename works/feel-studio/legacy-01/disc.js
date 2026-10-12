(function (root) {
  'use strict';
  const Registry = typeof module !== 'undefined' && module.exports ? require('./registry.js') : root.FeelRegistry;
  const WIDTH = 800, HEIGHT = 680, RADIUS = 28;
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const CHOICES = {
    drive: { inertia: '慣性で引く', spring: 'ばねで引く', bristle: '接触で押す' },
    bounce: { soft: '小さく返る', elastic: '弾んで返る', dead: '衝撃を吸う' },
    stop: { coast: '滑って止まる', viscous: '粘りで止まる', dry: '摩擦で止まる' }
  };
  const WORLD = { start: { x: 154, y: 330 }, points: [
    { x: 0, y: 536 }, { x: 202, y: 536 }, { x: 352, y: 453 },
    { x: 495, y: 548 }, { x: 650, y: 501 }, { x: WIDTH, y: 501 }
  ] };
  const components = [
    { drive: 'inertia', bounce: 'soft', stop: 'coast' },
    { drive: 'spring', bounce: 'elastic', stop: 'viscous' },
    { drive: 'bristle', bounce: 'dead', stop: 'dry' }
  ];
  const names = ['すべる', 'はずむ', 'おもい'];
  const descriptions = [
    '指へ力をかけて、勢いを残す。離すとしばらく滑ります。',
    '指との間をばねでつなぐ。遅れて追いつき、衝突で跳ね返ります。',
    '接触を少しためてから押す。小さな動きでは踏ん張り、離すと摩擦で止まります。'
  ];
  const presets = components.map((c, i) => ({
    id: 'ABC'[i], title: names[i], description: descriptions[i],
    spec: { world: clone(WORLD), components: c, strength: 1 }
  }));
  function finite(value, low, high) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high) throw new Error('調整値が範囲外です。');
    return value;
  }
  function groundAt(world, x) {
    for (let i = 1; i < world.points.length; i++) {
      const a = world.points[i - 1], b = world.points[i];
      if (x <= b.x) return a.y + (b.y - a.y) * clamp((x - a.x) / (b.x - a.x), 0, 1);
    }
    return world.points[world.points.length - 1].y;
  }
  function validateWorld(world) {
    if (!world || !Array.isArray(world.points) || world.points.length !== 6 || !world.start) throw new Error('実験台の形が違います。');
    const points = world.points.map(p => ({ x: finite(p.x, 0, WIDTH), y: finite(p.y, 380, 625) }));
    if (points[0].x !== 0 || points[5].x !== WIDTH || points.some((p, i) => i && p.x - points[i - 1].x < 65)) throw new Error('地形の点が近すぎます。');
    const start = { x: finite(world.start.x, RADIUS + 4, WIDTH - RADIUS - 4), y: finite(world.start.y, 60, 590) };
    if (start.y > groundAt({ points }, start.x) - RADIUS - 4) throw new Error('開始位置が地形に埋まっています。');
    return { start, points };
  }
  function validate(spec) {
    if (!spec || !spec.components) throw new Error('動きの設定がありません。');
    const c = {};
    for (const key of Object.keys(CHOICES)) {
      if (!Object.hasOwn(CHOICES[key], spec.components[key])) throw new Error('対応していない動きの組み合わせです。');
      c[key] = spec.components[key];
    }
    return { world: validateWorld(spec.world), components: c, strength: finite(spec.strength, .4, 2) };
  }
  function edit(spec, handle, point) {
    const next = clone(spec);
    if (handle === 'start') {
      next.world.start.x = clamp(point.x, RADIUS + 4, WIDTH - RADIUS - 4);
      next.world.start.y = clamp(point.y, 60, Math.min(590, groundAt(next.world, next.world.start.x) - RADIUS - 4));
    } else if (handle === 'strength') {
      next.strength = Math.round(clamp((point.x - 470) / 125 + .4, .4, 2) * 100) / 100;
    } else if (Number.isInteger(handle) && handle >= 0 && handle < 6) {
      const p = next.world.points[handle];
      if (handle > 0 && handle < 5) p.x = clamp(point.x, next.world.points[handle - 1].x + 65, next.world.points[handle + 1].x - 65);
      p.y = clamp(point.y, 380, 625);
      next.world.start.y = Math.min(next.world.start.y, groundAt(next.world, next.world.start.x) - RADIUS - 4);
    }
    return validate(next);
  }
  class Disc {
    constructor(spec) { this.reset(spec); }
    reset(spec) {
      this.spec = validate(spec);
      this.state = { ...this.spec.world.start, vx: 0, vy: 0, rotation: 0, contact: false, squash: 0 };
      this.bristle = { x: 0, y: 0 }; this.lastInput = null; this.lastBody = null;
    }
    step(dt, input = { active: false }) {
      const s = this.state, spec = this.spec, drive = spec.components.drive;
      if (!input.active && spec.components.stop === 'dry' && s.contact && Math.hypot(s.vx, s.vy) < 10) {
        s.vx = 0; s.vy = 0; this.lastInput = null; this.lastBody = null; this.bristle = { x: 0, y: 0 };
        s.squash *= Math.exp(-15 * dt); return clone(s);
      }
      let ax = 0, ay = 760;
      if (input.active) {
        if (drive === 'inertia') {
          const dx = input.x - s.x, dy = input.y - s.y, length = Math.hypot(dx, dy), cap = Math.min(1, 170 / Math.max(1, length));
          ax += dx * cap * 9 * spec.strength; ay += dy * cap * 9 * spec.strength;
        } else if (drive === 'spring') {
          ax += clamp((input.x - s.x) * 38 - s.vx * 5.2, -2400, 2400) * spec.strength;
          ay += clamp((input.y - s.y) * 38 - s.vy * 5.2, -2400, 2400) * spec.strength;
        } else {
          if (this.lastInput) {
            this.bristle.x = clamp(this.bristle.x + input.x - this.lastInput.x - (s.x - this.lastBody.x), -48, 48);
            this.bristle.y = clamp(this.bristle.y + input.y - this.lastInput.y - (s.y - this.lastBody.y), -48, 48);
          }
          // A finite static threshold and plastic deflection create stick/slip.
          const force = v => Math.abs(v) < 9 ? 0 : Math.sign(v) * (Math.abs(v) - 9) * 56 * spec.strength;
          ax += force(this.bristle.x); ay += force(this.bristle.y);
          this.lastInput = { x: input.x, y: input.y }; this.lastBody = { x: s.x, y: s.y };
        }
      } else {
        this.lastInput = null; this.lastBody = null; this.bristle = { x: 0, y: 0 };
      }
      s.vx = clamp(s.vx + ax * dt, -1000, 1000); s.vy = clamp(s.vy + ay * dt, -1000, 1000);
      if (!input.active) {
        if (spec.components.stop === 'coast') s.vx *= Math.exp(-(s.contact ? .35 : .05) * dt);
        else if (spec.components.stop === 'viscous') s.vx *= Math.exp(-4.8 * dt);
        else s.vx = Math.sign(s.vx) * Math.max(0, Math.abs(s.vx) - (s.contact ? 1050 : 160) * dt);
      } else if (drive === 'bristle' && s.contact) {
        s.vx = Math.sign(s.vx) * Math.max(0, Math.abs(s.vx) - 320 * dt);
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      const restitution = { soft: .16, elastic: .77, dead: 0 }[spec.components.bounce];
      s.contact = false;
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 1; i < spec.world.points.length; i++) {
          const a = spec.world.points[i - 1], b = spec.world.points[i], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
          const t = ((s.x - a.x) * dx + (s.y - a.y) * dy) / (len * len);
          if (t < 0 || t > 1) continue;
          const nx = dy / len, ny = -dx / len;
          const distance = (s.x - a.x) * nx + (s.y - a.y) * ny;
          if (distance <= RADIUS + .5) {
            s.contact = true;
            if (distance < RADIUS) {
              s.x += nx * (RADIUS - distance); s.y += ny * (RADIUS - distance);
              const vn = s.vx * nx + s.vy * ny;
              if (vn < 0) {
                const bounce = vn < -55 ? restitution : 0;
                s.vx -= (1 + bounce) * vn * nx; s.vy -= (1 + bounce) * vn * ny;
                s.squash = Math.min(.18, Math.abs(vn) / 3000);
              }
            }
          }
        }
      }
      if (s.x < RADIUS) { s.x = RADIUS; s.vx = Math.abs(s.vx) * restitution; }
      if (s.x > WIDTH - RADIUS) { s.x = WIDTH - RADIUS; s.vx = -Math.abs(s.vx) * restitution; }
      if (s.y < RADIUS) { s.y = RADIUS; s.vy = Math.abs(s.vy) * restitution; }
      // Segment vertices also contact; no open seam between slopes.
      for (const p of spec.world.points.slice(1, -1)) {
        const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy);
        if (d > 0 && d < RADIUS && dy < 0) {
          const nx = dx / d, ny = dy / d, vn = s.vx * nx + s.vy * ny;
          s.x += nx * (RADIUS - d); s.y += ny * (RADIUS - d);
          if (vn < 0) { s.vx -= (1 + restitution) * vn * nx; s.vy -= (1 + restitution) * vn * ny; }
        }
      }
      s.squash *= Math.exp(-15 * dt); s.rotation += s.vx * dt / RADIUS;
      return clone(s);
    }
  }
  function draw(ctx, model, spec, view = {}) {
    const s = model.state, points = spec.world.points;
    ctx.fillStyle = '#344b41'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // A restrained desk: paper lines, solid timber profile, one wooden disc.
    ctx.strokeStyle = '#58705e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(34, 647); ctx.lineTo(766, 647); ctx.stroke();
    ctx.fillStyle = '#768369'; ctx.beginPath(); ctx.moveTo(0, HEIGHT);
    points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.lineTo(WIDTH, HEIGHT); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b2b59a'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    ctx.strokeStyle = '#89917a'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(55 + i * 106, 602); ctx.lineTo(84 + i * 106, 606); ctx.stroke(); }
    const floor = groundAt(spec.world, s.x);
    ctx.fillStyle = 'rgba(22,35,29,.20)'; ctx.beginPath(); ctx.ellipse(s.x, floor + 5, RADIUS * .95, 6, 0, 0, Math.PI * 2); ctx.fill();
    if (view.input?.active && !view.edit) {
      ctx.strokeStyle = spec.components.drive === 'spring' ? '#c3c9a4' : '#7e9881'; ctx.lineWidth = 2;
      ctx.setLineDash(spec.components.drive === 'spring' ? [7, 6] : [2, 8]);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(view.input.x, view.input.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#b8c6b0'; ctx.beginPath(); ctx.arc(view.input.x, view.input.y, 9, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(1 + s.squash, 1 - s.squash); ctx.rotate(s.rotation);
    ctx.fillStyle = '#c8b38b'; ctx.strokeStyle = '#e0cfaa'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ab9674'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-4, 1, 15, -.7, 2.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -18); ctx.lineTo(10, -13); ctx.stroke(); ctx.restore();
    if (view.edit) {
      ctx.lineWidth = 2;
      function handle(x, y, label) {
        ctx.fillStyle = '#364f43'; ctx.strokeStyle = '#ddcd9f'; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#efe6ce'; ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, x, y + 6);
      }
      points.forEach((p, i) => handle(clamp(p.x, 20, WIDTH - 20), p.y, String(i + 1)));
      handle(spec.world.start.x, spec.world.start.y, '始');
      ctx.strokeStyle = '#ddcd9f'; ctx.beginPath(); ctx.moveTo(470, 112); ctx.lineTo(670, 112); ctx.stroke();
      handle(470 + (spec.strength - .4) * 125, 112, '力');
      ctx.textAlign = 'left'; ctx.fillStyle = '#ced3b8'; ctx.font = '20px sans-serif'; ctx.fillText('指の力', 470, 72);
    }
  }
  function handles(spec) {
    return [
      { id: 'start', x: spec.world.start.x, y: spec.world.start.y },
      { id: 'strength', x: 470 + (spec.strength - .4) * 125, y: 112 },
      ...spec.world.points.map((p, i) => ({ id: i, x: clamp(p.x, 20, WIDTH - 20), y: p.y }))
    ];
  }
  const api = { WIDTH, HEIGHT, RADIUS, CHOICES, WORLD, presets, clone, clamp, groundAt, validateWorld, validate, edit, Disc, draw, handles };
  Registry.register({ id: 'disc-table', version: '1.0.0', title: '木の円盤と、小さな坂',
    width: WIDTH, height: HEIGHT, presets, choices: CHOICES, validate, edit, handles, draw,
    create: spec => new Disc(spec), describe: spec => Object.keys(CHOICES).map(k => CHOICES[k][spec.components[k]]).join(' / '),
    inputMeaning: '同じ指の位置を再生します。A/Bは指へ引く力、Cは指の移動でたまる接触です。力の同等比較ではありません。'
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FeelDisc = api;
})(typeof window !== 'undefined' ? window : globalThis);
