'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../catalog.js'), Slime = require('../slime.js'), Puddle = require('../puddle.js'), Firefly = require('../firefly.js');
function simulate(model, parameters, seconds = 2) { for (let i = 0; i < seconds * 120; i++) model.update(1 / 120, parameters); }
function finite(value) { if (typeof value === 'number') assert.ok(Number.isFinite(value)); else if (value && typeof value === 'object') Object.values(value).forEach(finite); }
function stretch(model) {
  model.pointer({ type: 'down', id: 1, x: 100, y: 110 }); model.pointer({ type: 'down', id: 2, x: 550, y: 110 });
}
test('slime: second pool starts at first finger and independently follows; release has no warp', () => {
  const m = new Slime(650, 450), p = C.defaults('slime'); stretch(m);
  assert.equal(m.pools.get(2).x, m.pools.get(1).x);
  simulate(m, p, 3); assert.ok(m.pools.get(2).x > 540);
  const before = m.nodes.map(n => ({ ...n })); m.clearTouches();
  assert.deepEqual(m.nodes, before); m.update(1 / 120, p);
  assert.ok(m.nodes.some((n, i) => n.x !== before[i].x));
  simulate(m, p, 12); assert.ok(m.nodes.every(n => Math.hypot(n.vx, n.vy) < .02));
});
test('slime: all 16 parameter extremes stay finite during stretching, release and resize', () => {
  for (let mask = 0; mask < 16; mask++) {
    const p = Object.fromEntries(C.catalog[0].parameters.map((x, i) => [x.key, mask & 1 << i ? x.max : x.min]));
    const m = new Slime(320, 230); stretch(m); simulate(m, p, 2); finite(m.snapshot());
    m.resize(900, 400); simulate(m, p, 8); finite(m.snapshot());
    assert.equal(m.pools.size, 0); assert.equal(m.nodes.length, 35); assert.ok(m.nodes.every(n => Math.hypot(n.vx, n.vy) < .25), 'settles below a quarter CSS pixel per second');
  }
});
test('slime: viscosity, weight, elasticity and damping produce measurable differences', () => {
  const sample = (key, value, seconds) => { const m = new Slime(650, 450); stretch(m); simulate(m, { ...C.defaults('slime'), [key]: value }, seconds); return m; };
  assert.ok(sample('viscosity', 0, .1).pools.get(2).x - sample('viscosity', 100, .1).pools.get(2).x > 200);
  assert.ok(sample('weight', 100, 2).nodes[17].y - sample('weight', 0, 2).nodes[17].y > 100);
  assert.ok(Math.abs(sample('elasticity', 100, .2).nodes[34].x - sample('elasticity', 0, .2).nodes[34].x) > 50);
  const low = sample('damping', 0, 2), high = sample('damping', 100, 2);
  low.clearTouches(); high.clearTouches(); simulate(low, { ...C.defaults('slime'), damping: 0 }, 1); simulate(high, { ...C.defaults('slime'), damping: 100 }, 1);
  assert.ok(Math.hypot(low.nodes[34].vx, low.nodes[34].vy) > Math.hypot(high.nodes[34].vx, high.nodes[34].vy) * 2);
});
test('puddle: taps overlap, trail follows with delay, live parameters affect existing ripples', () => {
  const p = C.defaults('puddle'), m = new Puddle(650, 450);
  for (let id = 0; id < 3; id++) { m.pointer({ type: 'down', id, x: 250 + id * 10, y: 200 }, p); m.pointer({ type: 'up', id }, p); }
  assert.equal(m.ripples.length, 9);
  const radius = m.ripples[0].radius; simulate(m, { ...p, speed: 100 }, .5); assert.ok(m.ripples[0].radius > radius + 60);
  simulate(m, { ...p, damping: 100 }, 1); assert.equal(m.ripples.length, 0);
  m.pointer({ type: 'down', id: 1, x: 50, y: 50 }, p); m.pointer({ type: 'move', id: 1, x: 600, y: 400 }, p);
  simulate(m, p, .5); assert.ok(m.touches.get(1).x > 400 && m.touches.get(1).x < 600); assert.ok(m.ripples.length > 2);
  const moon = { ...m.moon }; m.clearTouches(); assert.deepEqual(m.moon, moon); simulate(m, p, .5); assert.notEqual(m.moon.x, moon.x);
});
test('puddle: size and emission interval alter output; longest life and rapid dragging stay bounded', () => {
  const run = p => { const m = new Puddle(650, 450); m.pointer({ type: 'down', id: 1, x: 40, y: 80 }, p); m.pointer({ type: 'move', id: 1, x: 600, y: 350 }, p); simulate(m, p, 1); return m; };
  assert.ok(run({ ...C.defaults('puddle'), interval: 0 }).ripples.length > run({ ...C.defaults('puddle'), interval: 100 }).ripples.length * 2);
  assert.ok(run({ ...C.defaults('puddle'), size: 100 }).ripples[0].radius > run({ ...C.defaults('puddle'), size: 0 }).ripples[0].radius + 40);
  const m = new Puddle(650, 450), p = { ...C.defaults('puddle'), damping: 0, interval: 0 };
  for (let i = 0; i < 6000; i++) { m.pointer({ type: 'down', id: i, x: 300, y: 200 }, p); m.pointer({ type: 'up', id: i }, p); m.update(1 / 120, p); }
  assert.ok(m.ripples.length <= 128); m.resize(320, 250); finite(m.snapshot()); simulate(m, p, 5); assert.equal(m.ripples.length, 0);
});
test('firefly: deterministic seed and reset; changing particle count preserves existing individuals', () => {
  const p = C.defaults('firefly'), a = new Firefly(650, 450, 19), b = new Firefly(650, 450, 19);
  simulate(a, p); simulate(b, p); assert.deepEqual(a.snapshot(), b.snapshot());
  const first = a.particles[0]; a.update(1 / 120, { ...p, count: 120 }); assert.equal(a.particles.length, 120); assert.equal(a.particles[0], first);
  a.reset(); simulate(a, p); assert.deepEqual(a.snapshot(), b.snapshot());
});
test('firefly: sweet slowly attracts, two fingers repel, release fades response', () => {
  const p = C.defaults('firefly'), make = () => { const m = new Firefly(650, 450, 1); m.update(1 / 120, { ...p, count: 12 }); m.particles = [{ x: 410, y: 225, vx: 0, vy: 0, personal: 1, phase: 0, noise: 0, ox: 0, oy: 0 }]; return m; };
  const sweet = make(), bitter = make();
  sweet.pointer({ type: 'down', id: 1, x: 325, y: 225 }); bitter.pointer({ type: 'down', id: 1, x: 325, y: 225 }); bitter.pointer({ type: 'down', id: 2, x: 325, y: 225 });
  simulate(sweet, p, .5); simulate(bitter, p, .5); assert.ok(sweet.particles[0].x < 410); assert.ok(bitter.particles[0].x > 430);
  const velocity = bitter.particles[0].vx; bitter.clearTouches(); assert.equal(bitter.particles[0].vx, velocity);
  simulate(bitter, p, 3); assert.ok(bitter.water.presence < .001);
});
test('firefly: attraction, repulsion and radius change response, extreme population remains stable', () => {
  const sample = overrides => { const p = { ...C.defaults('firefly'), ...overrides }, m = new Firefly(650, 450, 3); m.pointer({ type: 'down', id: 1, x: 325, y: 225, shiftKey: overrides.bitter }); simulate(m, p, 3); return m; };
  const dist = m => m.particles.reduce((s, f) => s + Math.hypot(f.x - 325, f.y - 225), 0) / m.particles.length;
  assert.ok(dist(sample({ attraction: 100 })) < dist(sample({ attraction: 0 })) - 10);
  assert.ok(dist(sample({ repulsion: 100, bitter: true })) > dist(sample({ repulsion: 0, bitter: true })) + 20);
  assert.ok(dist(sample({ radius: 100 })) < dist(sample({ radius: 0 })) - 10);
  for (const value of [0, 100]) { const m = sample({ attraction: value, repulsion: value, radius: value, count: 120, bitter: true }); finite(m.snapshot()); assert.ok(m.particles.every(f => Math.hypot(f.vx, f.vy) <= 230.001)); m.resize(320, 230); finite(m.snapshot()); }
});
test('all models draw through a Canvas2D surface without leaking state or throwing', () => {
  const gradient = { addColorStop() {} }, fn = () => {}, c = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' ? () => gradient : fn, set: () => true });
  for (const [Model, id] of [[Slime, 'slime'], [Puddle, 'puddle'], [Firefly, 'firefly']]) { const m = new Model(600, 400, 1); simulate(m, C.defaults(id)); m.draw(c); m.dispose(); assert.equal(m.snapshot().touches, 0); }
});
