'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const { Runner } = require('../runner.js'), Slime = require('../slime.js'), Puddle = require('../puddle.js'), Firefly = require('../firefly.js'), C = require('../catalog.js');
class Target {
  constructor() { this.events = new Map(); }
  addEventListener(type, fn) { if (!this.events.has(type)) this.events.set(type, new Set()); this.events.get(type).add(fn); }
  removeEventListener(type, fn) { this.events.get(type)?.delete(fn); }
  emit(type, event = {}) { for (const fn of this.events.get(type) || []) fn(event); }
  count() { return [...this.events.values()].reduce((sum, s) => sum + s.size, 0); }
}
function setup() {
  const host = new Target(), doc = new Target(), canvas = new Target(), callbacks = new Map(); let rafID = 0;
  Object.assign(host, { devicePixelRatio: 3, requestAnimationFrame: fn => { callbacks.set(++rafID, fn); return rafID; }, cancelAnimationFrame: id => callbacks.delete(id) });
  doc.hidden = false;
  canvas.rect = { left: 120, top: 90, width: 600, height: 400 }; canvas.captures = new Set();
  Object.assign(canvas, { getBoundingClientRect: () => canvas.rect, getContext: () => ({ setTransform() {}, fillRect() {}, save() {}, restore() {} }), focus: () => { canvas.focused = true; }, setPointerCapture: id => canvas.captures.add(id), releasePointerCapture: id => { canvas.captures.delete(id); canvas.emit('lostpointercapture', { pointerId: id, preventDefault() {} }); } });
  const runner = new Runner(canvas, { host, document: doc });
  const event = (id = 1, x = 250, y = 240, extra = {}) => ({ pointerId: id, pointerType: 'touch', clientX: x, clientY: y, button: 0, preventDefault() { this.prevented = true; }, ...extra });
  return { runner, host, doc, canvas, callbacks, event };
}
test('two independent pointers map into embedded stage and cancellation releases capture safely', () => {
  const { runner: r, canvas: c, event } = setup(); r.select('slime', Slime, C.defaults('slime'), 1);
  const a = event(1), b = event(2, 660, 270); c.emit('pointerdown', a); c.emit('pointerdown', b);
  assert.equal(r.model.pools.size, 2); assert.equal(r.model.pools.get(1).tx, 130); assert.equal(r.model.pools.get(2).tx, 540);
  assert.ok(a.prevented && b.prevented); assert.ok(c.focused); assert.equal(c.captures.size, 2);
  c.emit('pointermove', event(2, 2000, -500)); assert.equal(r.model.pools.get(2).tx, 600); assert.equal(r.model.pools.get(2).ty, 0);
  c.emit('pointercancel', event(1)); assert.equal(r.model.pools.size, 1); assert.equal(c.captures.size, 1);
  c.emit('pointerup', event(2)); assert.equal(r.model.pools.size, 0); assert.equal(c.captures.size, 0);
  c.emit('pointermove', event(2)); assert.equal(r.model.pools.size, 0); r.destroy();
});
test('PC Shift drag creates one fixed slime end; foreign pointer moves and right clicks do nothing', () => {
  const { runner: r, canvas: c, event } = setup(); r.select('slime', Slime, C.defaults('slime'), 1);
  c.emit('pointerdown', event(1, 200, 200, { pointerType: 'mouse', button: 2 })); assert.equal(r.pointers.size, 0);
  c.emit('pointerdown', event(1, 200, 200, { pointerType: 'mouse', shiftKey: true }));
  c.emit('pointermove', event(1, 600, 200, { pointerType: 'mouse', shiftKey: true }));
  assert.equal(r.model.pools.get('anchor').tx, 80); assert.equal(r.model.pools.get(1).tx, 480);
  c.emit('pointerup', event(1, 600, 200, { pointerType: 'mouse' })); assert.equal(r.model.pools.size, 0); r.destroy();
});
test('resize during input scales physical state, clears contacts and handles high DPI', () => {
  const { runner: r, canvas: c, event } = setup(); r.select('slime', Slime, C.defaults('slime'), 1);
  assert.equal(c.width, 1200); assert.equal(c.height, 800); c.emit('pointerdown', event());
  c.rect = { left: 10, top: 20, width: 300, height: 700 }; r.resize();
  assert.equal(r.model.width, 300); assert.equal(r.model.height, 700); assert.equal(r.model.pools.size, 0); assert.equal(c.captures.size, 0);
  c.emit('pointerdown', event(1, 160, 220)); assert.equal(r.model.pools.get(1).tx, 150); assert.equal(r.model.pools.get(1).ty, 200); r.destroy();
});
test('hidden/pagehide/blur cancel all touches; resume drops elapsed time and preserves settings', () => {
  const { runner: r, canvas: c, doc, host, event } = setup(); r.select('firefly', Firefly, C.defaults('firefly'), 99);
  r.advance(0); r.advance(1000); assert.ok(r.model.time <= .051);
  c.emit('pointerdown', event()); c.emit('pointerdown', event(2)); doc.hidden = true; doc.emit('visibilitychange');
  const time = r.model.time; assert.equal(r.model.touches.size, 0); assert.equal(c.captures.size, 0); r.advance(100000); assert.equal(r.model.time, time);
  doc.hidden = false; doc.emit('visibilitychange'); r.advance(100000); assert.equal(r.model.time, time); r.advance(100017); assert.ok(r.model.time <= time + .02);
  c.emit('pointerdown', event()); host.emit('blur'); assert.equal(r.model.touches.size, 0);
  host.emit('pagehide'); r.advance(999000); assert.equal(r.hidden, true); host.emit('pageshow'); r.advance(1000000); assert.equal(r.hidden, false); assert.equal(r.parameters.count, 35); r.destroy();
});
test('switching 100 times retains one listener set and one RAF; dispose releases resources', () => {
  const { runner: r, canvas: c, host, doc, callbacks } = setup(), count = c.count() + host.count() + doc.count();
  r.start(); r.start(); assert.equal(callbacks.size, 1);
  for (let i = 0; i < 100; i++) { r.select('puddle', Puddle, C.defaults('puddle'), 1); r.select('slime', Slime, C.defaults('slime'), 1); }
  assert.equal(c.count() + host.count() + doc.count(), count); assert.equal(callbacks.size, 1);
  r.destroy(); assert.equal(callbacks.size, 0); assert.equal(c.count() + host.count() + doc.count(), 0); assert.equal(r.model.nodes.length, 0);
});
test('fixed-step integration matches 30/60/120fps; live parameters never reset state', () => {
  const results = [];
  for (const fps of [30, 60, 120]) {
    const { runner: r } = setup(); r.select('firefly', Firefly, C.defaults('firefly'), 37);
    r.advance(0); for (let i = 1; i <= fps * 2; i++) r.advance(i * 1000 / fps);
    results.push(r.model.snapshot()); const model = r.model; r.setParameters({ ...r.parameters, attraction: 100 }); assert.equal(r.model, model); assert.equal(r.parameters.attraction, 100); r.destroy();
  }
  assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
});
test('late cancel after switching does not mutate new model and replay preserves parameters', () => {
  const { runner: r, canvas: c, event } = setup(); r.select('slime', Slime, C.defaults('slime'), 1); c.emit('pointerdown', event());
  r.select('puddle', Puddle, { ...C.defaults('puddle'), speed: 100 }, 1); c.emit('pointercancel', event()); assert.equal(r.model.touches.size, 0);
  c.emit('pointerdown', event()); assert.equal(r.model.ripples.length, 2); r.replay(); assert.equal(r.model.ripples.length, 0); assert.equal(r.parameters.speed, 100); r.destroy();
});
