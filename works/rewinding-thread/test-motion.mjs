import test from 'node:test';
import assert from 'node:assert/strict';
import { ThreadMotion } from './motion.mjs';
test('pull, bounds, hold and rotation match actual extracted length', () => {
  const m = new ThreadMotion(); m.grab(); m.pull(120); m.step(2);
  assert.equal(m.length, 120); assert.equal(m.angle, 120 / 50 * 180 / Math.PI);
  m.pull(900); assert.equal(m.length, 200); m.pull(-5); assert.equal(m.length, 0);
});
test('return slows near the seat, finishes exactly, and never overshoots', () => {
  const m = new ThreadMotion(); m.grab(); m.pull(200); m.release();
  m.step(.1); const fast = 200 - m.length;
  m.step(1); const start = m.length; m.step(.1); assert.ok(start - m.length < fast / 2);
  for (let i = 0; i < 400; i++) { m.step(1 / 60); assert.ok(m.length >= 0); }
  assert.equal(m.length, 0); assert.equal(m.angle, 0);
});
test('regrab freezes the current length without a jump', () => {
  const m = new ThreadMotion(); m.grab(); m.pull(130); m.release(); m.step(.3);
  const before = m.length; m.grab(); m.step(1); assert.equal(m.length, before);
  m.pull(before + 20); assert.equal(m.length, before + 20); m.release(); m.step(.1); assert.ok(m.length < before + 20);
});
test('30/60/120 Hz and crossing the tail boundary give the same return', () => {
  const lengths = [30, 60, 120].map(hz => {
    const m = new ThreadMotion(); m.grab(); m.pull(200); m.release();
    for (let i = 0; i < hz * 1.5; i++) m.step(1 / hz);
    return m.length;
  });
  assert.ok(Math.max(...lengths) - Math.min(...lengths) < 1e-10);
});
test('short pull also seats and invalid deltas cannot poison state', () => {
  const m = new ThreadMotion(); m.grab(); m.pull(2); m.pull(NaN); m.release(); m.step(NaN);
  assert.equal(m.length, 2); m.step(3); assert.equal(m.length, 0);
});
