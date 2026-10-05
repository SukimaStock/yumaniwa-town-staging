'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../model.js');

test('elapsed clock is independent of dragging, and completion happens once', () => {
  const tea = new M.Tea();
  assert.equal(tea.start(1000), true);
  assert.equal(tea.start(9000), false);
  tea.begin(195, 400); tea.drag(280, 440); tea.release();
  tea.update(1 / 60, 15000);
  assert.equal(tea.elapsed, 14);
  assert.equal(tea.update(1 / 60, 31000), true);
  assert.equal(tea.update(1 / 60, 45000), false);
  assert.equal(tea.elapsed, 30);
  assert.equal(tea.mode, 'rest');
  tea.begin(195, 400); tea.drag(100, 410);
  assert.notEqual(tea.target.x, 0, 'completed leaf remains interactive');
});

test('reset clears all motion, contact and completion; a new trial can finish', () => {
  const tea = new M.Tea(); tea.start(0); tea.begin(190, 400); tea.drag(250, 350);
  tea.update(0.1, 30000); tea.reset();
  assert.equal(tea.contact, null); assert.equal(tea.elapsed, 0); assert.equal(tea.finished, false);
  assert.deepEqual(tea.water, { x: 0, y: 0, vx: 0, vy: 0 });
  assert.deepEqual(tea.leaf, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, omega: 0 });
  tea.start(40000); assert.equal(tea.update(0, 70000), true);
});

test('opening reveals inner sheet geometry, beyond uniform scale or rotation', () => {
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const width = t => distance(M.leafPoint(0.5, -1, t), M.leafPoint(0.5, 1, t));
  const chord = t => distance(M.leafPoint(0, 0, t), M.leafPoint(1, 0, t));
  assert.ok(width(30) > width(0) * 4, 'folded laminae separate');
  assert.ok(chord(30) > chord(0) * 4, 'rolled midrib opens');
  assert.ok(Math.abs(width(30) / width(0) - chord(30) / chord(0)) > 0.5, 'not uniform scaling');
  assert.ok(M.opening(18).left > M.opening(18).right, 'asymmetric reveal drives posture');
  const left = M.leafPoint(0.5, -1, 18), right = M.leafPoint(0.5, 1, 18);
  assert.ok(Math.abs(left.z - right.z) > 5, 'separate edges have different folds');
  for (let t = 0; t <= 30; t += 0.5) for (let s = 0; s <= 1; s += 0.05) {
    const p = M.leafPoint(s, 0.7, t), q = M.leafPoint(s, 0.7, t + 0.001);
    assert.ok(Object.values(p).every(Number.isFinite));
    assert.ok(distance(p, q) < 0.06, 'unfolding is continuous, no sprite switch');
  }
});

function motion(fps) {
  const tea = new M.Tea(); tea.start(0); tea.update(0, 18000); tea.begin(190, 400); tea.drag(260, 400);
  let leading;
  for (let i = 1; i <= fps * 3; i++) {
    if (i === fps / 2 + 1) tea.release();
    tea.update(1 / fps, 18000 + i * 1000 / fps);
    if (i === Math.round(fps / 6)) leading = tea.snapshot();
  }
  return { tea, leading };
}
test('water leads the leaf; release leaves inertia, and 30/60/120fps match', () => {
  const runs = [30, 60, 120].map(motion);
  for (const { tea, leading } of runs) {
    assert.ok(leading.water.x > leading.leaf.x * 3, 'water moves first');
    assert.ok(Math.abs(tea.leaf.x) > 0.01, 'motion has an after-effect');
    assert.ok(Math.abs(tea.leaf.x) < 10, 'motion settles rather than grows');
  }
  const a = runs[0].tea, b = runs[2].tea;
  for (const key of ['x', 'y', 'vx', 'vy']) assert.ok(Math.abs(a.leaf[key] - b.leaf[key]) < 0.001);
  assert.ok(Math.abs(a.leaf.angle - b.leaf.angle) < 0.001);
});

test('exposed leaf catches more water and asymmetric opening turns it without input', () => {
  const closed = new M.Tea(), opened = new M.Tea();
  for (const [tea, t] of [[closed, 2], [opened, 29]]) {
    tea.start(0); tea.update(0, t * 1000); tea.begin(195, 400); tea.drag(255, 400);
    for (let i = 0; i < 24; i++) tea.update(M.STEP, t * 1000);
  }
  assert.ok(opened.leaf.x > closed.leaf.x * 1.4);
  const tea = new M.Tea(); tea.start(0);
  for (let i = 1; i <= 18 * 60; i++) tea.update(1 / 60, i * 1000 / 60);
  assert.ok(tea.leaf.angle > 0.03, 'opening changes its posture');
});

test('a long background gap updates time, bounds physics and releases contact safely', () => {
  const tea = new M.Tea(); tea.start(0); tea.begin(190, 400); tea.drag(280, 400);
  tea.update(0.1, 3000); tea.release(); tea.update(90, 35000);
  assert.equal(tea.elapsed, 30); assert.equal(tea.contact, null);
  assert.ok(Object.values(tea.water).every(Number.isFinite));
  assert.ok(Math.abs(tea.leaf.x) < 60, 'hidden gap is not a ninety-second impulse');
  tea.update(0.1, 34000); assert.equal(tea.elapsed, 30, 'clock never runs backwards');
});

test('finished leaf retains small water-driven motion; reduced motion omits ambient drift', () => {
  const tea = new M.Tea(); tea.start(0); tea.update(0, 30000);
  for (let i = 0; i < 240; i++) tea.update(1 / 60, 30000 + i * 1000 / 60);
  const first = tea.pose();
  for (let i = 0; i < 240; i++) tea.update(1 / 60, 34000 + i * 1000 / 60);
  assert.ok(Math.hypot(first.x - tea.pose().x, first.y - tea.pose().y) > 0.1);
  assert.ok(Math.abs(tea.leaf.x) < 2 && Math.abs(tea.leaf.y) < 2);
  const still = new M.Tea({ ambientMotion: 0 }); still.start(0); still.update(0, 30000);
  for (let i = 0; i < 240; i++) still.update(1 / 60, 30000 + i * 1000 / 60);
  assert.equal(still.water.x, 0); assert.equal(still.water.y, 0);
});
