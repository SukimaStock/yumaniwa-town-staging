'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const { Shelf, parse, SCHEMA, KEY } = require('../storage.js'), C = require('../catalog.js');
function backend() { const data = new Map(); return { data, getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) }; }
function record(experiment = 'slime', id = 's-1') { const e = C.catalog.find(e => e.id === experiment); return { id, experiment, source: e.source, programVersion: e.version, parameters: C.defaults(experiment), savedAt: '2026-10-09T08:00:00Z', seed: 123456, title: '小さな発見', memo: '<script>これは文字</script>', interactionMode: experiment === 'firefly' ? 'bitter' : 'sweet' }; }
test('all experiment parameters, canonical source, seed, version, memo and mode survive reload and JSON roundtrip', () => {
  const b = backend(), shelf = new Shelf(b);
  for (const e of C.catalog) shelf.add(record(e.id, e.id));
  const loaded = new Shelf(b); assert.deepEqual(loaded.specimens, shelf.specimens); assert.deepEqual(parse(shelf.export()), shelf.specimens);
  assert.equal(loaded.specimens[2].interactionMode, 'bitter');
  assert.equal(loaded.specimens[0].memo, '<script>これは文字</script>');
  assert.equal(loaded.specimens[0].parameters.elasticity, 48); assert.equal(loaded.specimens[1].parameters.speed, 38);
});
test('invalid, foreign and future data reject atomically without losing existing specimens', () => {
  const shelf = new Shelf(backend()); shelf.add(record()); const before = shelf.export();
  const invalid = [ 'broken', JSON.stringify({ schema: 'future/2', specimens: [] }), ...[
    { experiment: 'unknown' }, { programVersion: '9.0.0' }, { seed: NaN }, { seed: -1 }, { source: 'https://evil.test' }, { savedAt: 'yesterday' }, { parameters: { elasticity: 500 } }, { memo: 'a'.repeat(301) }, { interactionMode: 'unknown' }, { id: '../../x' }
  ].map(x => JSON.stringify({ schema: SCHEMA, specimens: [{ ...record(), ...x }] })) ];
  for (const data of invalid) { assert.throws(() => shelf.import(data)); assert.equal(shelf.export(), before); }
  assert.throws(() => shelf.import(JSON.stringify({ schema: SCHEMA, specimens: [record(), record()] })));
  assert.throws(() => shelf.import(' '.repeat(1000001)));
});
test('corrupt backend is retained until explicit user save; quota failure keeps exportable session data', () => {
  const b = backend(); b.setItem(KEY, 'corrupt'); const shelf = new Shelf(b); assert.equal(shelf.specimens.length, 0); assert.ok(shelf.error); assert.equal(b.getItem(KEY), 'corrupt');
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  const memory = new Shelf(blocked); assert.equal(memory.add(record()), false); assert.equal(memory.specimens.length, 1); assert.ok(memory.error); assert.equal(parse(memory.export()).length, 1);
});
test('imports merge without overwriting collisions and enforce capacity; removal is scoped', () => {
  const shelf = new Shelf(backend()); shelf.add(record());
  const result = shelf.import(JSON.stringify({ schema: SCHEMA, specimens: [{ ...record(), memo: 'different' }, record('puddle', 's-2')] }));
  assert.equal(result.added, 1); assert.equal(result.skipped, 1); assert.equal(shelf.specimens[0].memo, record().memo);
  shelf.remove('s-1'); assert.equal(shelf.specimens.length, 1); assert.equal(shelf.specimens[0].experiment, 'puddle');
  for (let i = 0; i < 199; i++) shelf.add(record('slime', 'limit-' + i));
  assert.throws(() => shelf.add(record('slime', 'overflow'))); assert.equal(shelf.specimens.length, 200);
});
