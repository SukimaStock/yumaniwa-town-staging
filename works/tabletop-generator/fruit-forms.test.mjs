import test from 'node:test';
import assert from 'node:assert/strict';
import { fruitForm } from './fruit-forms.mjs';

// Dense independent sampling of the serialized paths checks the analytic bounds,
// including rotation of the already-rounded coordinates actually sent to SVG.
function sample(path, angle) {
  const commands = path.match(/[MLCZ][^MLCZ]*/g), points = [];
  let p, start;
  for (const text of commands) {
    const command = text[0], values = text.slice(1).trim().split(/\s+/).filter(Boolean).map(Number);
    if (command === 'M') { p = values; start = p; points.push(p); }
    if (command === 'L') { p = values; points.push(p); }
    if (command === 'Z') { p = start; points.push(p); }
    if (command === 'C') {
      const [x1, y1, x2, y2, x3, y3] = values;
      for (let i = 0; i <= 2000; i++) {
        const t = i / 2000, u = 1 - t;
        points.push([
          u ** 3 * p[0] + 3 * u ** 2 * t * x1 + 3 * u * t ** 2 * x2 + t ** 3 * x3,
          u ** 3 * p[1] + 3 * u ** 2 * t * y1 + 3 * u * t ** 2 * y2 + t ** 3 * y3,
        ]);
      }
      p = [x3, y3];
    }
  }
  const a = angle * Math.PI / 180;
  return points.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]);
}
test('rotated fruit and connected stem bounds fit the SVG contour and support plane', () => {
  for (const variety of ['lemon', 'orange', 'pear']) for (const angle of [-180, -25, 0, 17, 90, 173]) {
    const form = fruitForm(variety, 63.25, 47.5, angle);
    const points = [form.path, form.stemPath].filter(Boolean).flatMap(path => sample(path, angle));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
      assert.ok(x >= form.left - 1e-7 && x <= form.right + 1e-7);
      assert.ok(y >= form.top - 1e-7 && y <= form.bottom + 1e-7);
      assert.ok(y + 699 - form.bottom <= 699 + 1e-7);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    assert.ok(Math.abs(minX - form.left) < .001);
    assert.ok(Math.abs(maxX - form.right) < .001);
    assert.ok(Math.abs(minY - form.top) < .001);
    assert.ok(Math.abs(maxY - form.bottom) < .001);
    assert.deepEqual(fruitForm(variety, 63.25, 47.5, angle), form);
  }
});
test('contours remain distinct and invalid inputs cannot create malformed SVG numbers', () => {
  const paths = ['lemon', 'orange', 'pear'].map(variety => fruitForm(variety, 60, 40).path);
  assert.equal(new Set(paths).size, 3);
  assert.equal(fruitForm('lemon', 60, 40).stemPath, undefined);
  assert.ok(fruitForm('orange', 60, 40).stemPath);
  assert.ok(fruitForm('pear', 60, 40).stemPath);
  for (const args of [['apple', 60, 40], ['pear', 0, 40], ['lemon', NaN, 40],
    ['orange', 60, Infinity], ['pear', -1, 40], ['lemon', 60, 40, NaN]]) {
    assert.throws(() => fruitForm(...args), RangeError);
  }
});
