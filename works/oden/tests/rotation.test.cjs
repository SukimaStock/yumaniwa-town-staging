'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const marker = html.indexOf('/* Oden 13: connected broth exposure, deterministic turns. */');
assert.notEqual(marker, -1, 'OdenModel source marker exists');
const start = html.indexOf('(() => {', marker);
const end = html.indexOf('})();', start);
assert.ok(start > marker && end > start, 'OdenModel script block is complete');
const modelSource = html.slice(start, end + 4);
const context = { module: { exports: {} } };
vm.runInNewContext(modelSource, context, { filename: htmlPath });
const OdenModel = context.module.exports;
const TYPES = Object.keys(OdenModel.defs);

function makeModel(type, x, y, rot = 0) {
  const model = new OdenModel({ seed: 17, mode: 'simmer' });
  model.grid = Array.from({ length: OdenModel.H }, () => Array(OdenModel.W).fill(null));
  model.active = { id: 99, type, rot, x, y, cells: OdenModel.cellsFor(type, rot) };
  model.pendingRows = [];
  return model;
}

function block(model, x, y, id = 100 + y * OdenModel.W + x) {
  model.grid[y][x] = { id, type: 'daikon', rot: 0, u: 0, v: 0, index: 0, age: 0 };
}

function worldCells(piece) {
  return piece.cells.map(c => [piece.x + c.u, piece.y + c.v]);
}

function assertValidAndUnblocked(model) {
  assert.equal(model.valid(model.active), true);
  for (const [x, y] of worldCells(model.active)) assert.equal(model.grid[y][x], null);
}

test('reproduced grounded konnyaku turn drops into the lower opening without entering fixed food', () => {
  const model = makeModel('konnyaku', 6, 11);
  block(model, 5, 11);
  block(model, 7, 11);
  assert.equal(model.valid(model.active, 0, 1), false, 'piece is grounded at the pot bottom');

  assert.equal(model.rotate(-1), true);
  assert.deepEqual([model.active.x, model.active.y, model.active.rot], [5, 12, 3]);
  assertValidAndUnblocked(model);
  assert.equal(JSON.stringify(worldCells(model.active).sort((a, b) => a[1] - b[1] || a[0] - b[0])), JSON.stringify([
    [7, 12], [5, 13], [6, 13], [7, 13]
  ]));

  const ghost = model.ghostY();
  assert.equal(ghost, model.active.y, 'ghost and actual landing row match at the bottom');
  const lock = model.softDrop();
  assert.equal(lock.kind, 'lock');
  assert.equal(model.turn, 1, 'one lock still advances exactly one turn');
  assert.equal(lock.cells.length, 4);
});

test('all six ingredients support left and right quarter-turns in open space', () => {
  for (const type of TYPES) for (const dir of [-1, 1]) {
    const model = makeModel(type, 3, 5);
    assert.equal(model.rotate(dir), true, `${type} direction ${dir}`);
    assert.equal(model.active.rot, dir < 0 ? 3 : 1);
    assertValidAndUnblocked(model);
  }
});

test('grounded edge and bottom rotations stay in bounds for every ingredient and direction', () => {
  for (const type of TYPES) for (const dir of [-1, 1]) {
    const cells = OdenModel.cellsFor(type, 0);
    const width = 1 + Math.max(...cells.map(c => c.u));
    for (const x of [0, OdenModel.W - width]) {
      const model = makeModel(type, x, 10);
      const old = model.active;
      const current = new Set(worldCells(old).map(([cx, cy]) => `${cx},${cy}`));
      const lowerEdge = worldCells(old).filter(([cx, cy]) => !current.has(`${cx},${cy + 1}`));
      for (const [sx, sy] of lowerEdge) if (sy + 1 < OdenModel.H) block(model, sx, sy + 1);
      assert.equal(model.valid(model.active, 0, 1), false);
      const before = { x, y: old.y };
      model.rotate(dir);
      assertValidAndUnblocked(model);
      assert.ok(Math.abs(model.active.x - before.x) <= 2);
      assert.ok(Math.abs(model.active.y - before.y) <= 2);
    }
  }
});

test('airborne turns do not use downward correction', () => {
  for (const type of TYPES) for (const dir of [-1, 1]) {
    const model = makeModel(type, 3, 5);
    assert.equal(model.valid(model.active, 0, 1), true);
    const y = model.active.y;
    assert.equal(model.rotate(dir), true);
    assert.equal(model.active.y, y);
    assertValidAndUnblocked(model);
  }
});

test('a clear endpoint is rejected when a stable cell would sweep through a fixed ingredient', () => {
  const model = makeModel('chikuwa', 0, 1);
  // This cell is outside both the initial and same-origin rotated footprint,
  // but lies on the diagonal path of the same indexed end cell.
  block(model, 3, 2);
  const start = { x: model.active.x, y: model.active.y };
  assert.equal(model.valid(model.active, 0, 0, OdenModel.cellsFor('chikuwa', 3)), true);
  assert.equal(model.rotate(-1), true);
  assertValidAndUnblocked(model);
  assert.notDeepEqual([model.active.x, model.active.y], [start.x, start.y], 'blocked swept endpoint is not accepted');
  assert.ok(Math.abs(model.active.x - start.x) <= 2 && Math.abs(model.active.y - start.y) <= 2);
});

test('repeated turns cannot carry an open piece through a sealed empty cavity', () => {
  const model = makeModel('konnyaku', 0, 6);
  // A four-by-four empty pocket sealed on every side by fixed ingredients.
  for (let x = 2; x <= 7; x++) {
    block(model, x, 5);
    block(model, x, 10);
  }
  for (let y = 6; y <= 9; y++) {
    block(model, 2, y);
    block(model, 7, y);
  }
  const network = OdenModel.brothNetwork(model.grid);
  assert.equal(network.parent[7][4], undefined, 'the pocket is disconnected from the open broth');
  assert.ok(worldCells(model.active).every(([x, y]) => network.parent[y][x] !== undefined));

  for (const dir of [-1, 1, -1, 1]) {
    model.rotate(dir);
    assertValidAndUnblocked(model);
    assert.ok(worldCells(model.active).every(([x, y]) => network.parent[y][x] !== undefined),
      'accepted rotations remain in the top-connected free space');
  }
});

test('repeated grounded turns preserve collision validity and bounded movement', () => {
  const model = makeModel('konnyaku', 6, 11);
  block(model, 5, 11);
  block(model, 7, 11);
  assert.equal(model.rotate(-1), true);
  for (const dir of [1, -1, 1, -1]) {
    const before = { x: model.active.x, y: model.active.y };
    model.rotate(dir);
    assertValidAndUnblocked(model);
    assert.ok(Math.abs(model.active.x - before.x) <= 2);
    assert.ok(Math.abs(model.active.y - before.y) <= 2);
  }
});
