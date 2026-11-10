import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Exercise the real private implementation without exposing a production API.
// Relative import/export specifiers keep their original query-string identity.
const sourceUrl = new URL('../partner-orders.mjs', import.meta.url);
const source = fs.readFileSync(sourceUrl, 'utf8').replace(
  /(\bfrom\s+)(['"])(\.{1,2}\/[^'"]+)\2/g,
  (_match, from, quote, relative) => from + quote + new URL(relative, sourceUrl).href + quote,
);
// Frozen pre-optimization oracle from 001bc6cc712cc300b8f7be65018628199e97e1f0.
// It deliberately retains full-state E.distillStep calls, not the projection.
const oracle = `
function originalProgress(s,value){
 assert(s.still.distillation?.collectionVersion!==2||s.still.distillation.collectStart!==null||value<=88,'採取できる範囲を過ぎています。');
 assert(!s.trade.offer||value===s.still.distillation?.progress,'申し出の確認中は蒸留を進めません。');
 assert(s.still.phase==='distilling'&&Number.isInteger(value)&&value>=s.still.distillation.progress&&value<P.distillMax,'蒸留の進行が不正です。');
 let j=s;while(j.still.distillation.progress<value){const next=E.distillStep(j);assert(next!==j,'停止中の蒸留です。');j=next;}return j;
}
export {progress as testedProgress, originalProgress};
`;
let serial = 0;
async function freshModel() {
  return import('data:text/javascript;base64,' + Buffer.from(source + oracle + `\n// isolated validation cache ${serial++}\n`).toString('base64'));
}
const D = await freshModel();
const json = value => JSON.stringify(value);
const classic = () => D.startDistillation(D.newDistillery(42));
const connected = () => D.startDistillation(D.newConnectedDistillery(42));
const ranged = () => D.startRangeDistillation(D.newConnectedDistillery(42));
const collected = () => D.beginCollection(ranged());
function outcome(action) {
  try { return {ok: true, value: action()}; }
  catch (error) { return {ok: false, name: error.name, message: error.message}; }
}
function compare(state, target) {
  const before = json(state);
  const expected = outcome(() => D.originalProgress(state, target));
  const actual = outcome(() => D.testedProgress(state, target));
  assert.equal(json(state), before, 'neither path may mutate input');
  assert.equal(actual.ok, expected.ok, `target ${String(target)}`);
  if (!actual.ok) assert.deepEqual(actual, expected);
  else {
    assert.equal(json(actual.value), json(expected.value), `exact value and key order at ${target}`);
    assert.equal(actual.value === state, expected.value === state, 'same no-op identity');
  }
  return actual;
}

test('replay extraction equals original full-state steps in both collection modes and at boundaries', () => {
  for (const create of [classic, connected, ranged, collected]) {
    const initial = create();
    for (const target of [0, 1, 12, 29, 30, 45, 65, 87, 88, 89, 98, 99]) compare(initial, target);
    const middle = D.originalProgress(initial, 40);
    for (const target of [40, 41, 65, 88, 99]) compare(middle, target);
  }
});

test('invalid targets and stopped extraction preserve original errors and no-op behavior', () => {
  for (const create of [classic, ranged, collected]) {
    const initial = create();
    for (const target of [-1, 0.5, 100, 101, NaN, Infinity, undefined, null, '20']) compare(initial, target);
    const middle = D.originalProgress(initial, 40);
    compare(middle, 39);
    for (const change of [s => { s.tastingId = 1; }, s => { s.decisions = [{pending: {}}]; }, s => { s.trade.offer = {id: 1}; }]) {
      const blocked = structuredClone(middle); change(blocked);
      assert.equal(compare(blocked, 41).ok, false);
      assert.equal(compare(blocked, 40).value, blocked);
    }
    const wrongPhase = structuredClone(middle); wrongPhase.still.phase = 'ready';
    assert.equal(compare(wrongPhase, 40).ok, false);
  }
});

test('successful projected progress retains and detaches the complete unrelated state', () => {
  const state = collected(), before = json(state);
  const result = D.testedProgress(state, 45);
  assert.deepEqual(Object.keys(result), Object.keys(state));
  assert.notEqual(result, state);
  assert.notEqual(result.core, state.core);
  assert.notEqual(result.still, state.still);
  assert.notEqual(result.trade, state.trade);
  assert.notEqual(result.labConnection, state.labConnection);
  assert.notEqual(result.operations, state.operations);
  result.core.cash++;
  result.still.distillation.progress++;
  result.trade.nextOfferMonth++;
  result.labConnection.town.nodes.town.received++;
  result.operations.push({key: 'deliberately-invalid-test-mutation'});
  assert.equal(json(state), before);
});

test('cold and warm partial restores remain exact and caller mutation cannot corrupt validation cache', async () => {
  const state = D.testedProgress(collected(), 45), raw = json(state);
  const cold = await freshModel();
  const restored = cold.restoreDistillery(raw);
  assert.equal(json(restored), raw);
  assert.equal(json(cold.restoreDistillery(raw)), raw);
  restored.trade.nextOfferMonth++;
  restored.core.cash++;
  restored.still.distillation.litres++;
  assert.throws(() => cold.validateDistillery(restored));
  assert.equal(json(cold.restoreDistillery(raw)), raw);
  const advanced = cold.testedProgress(cold.restoreDistillery(raw), 65);
  assert.equal(json(cold.restoreDistillery(json(advanced))), json(advanced));
  assert.equal(json(cold.restoreDistillery(raw)), raw, 'older partial must not reuse newer partial');
});

test('tampered facts or operations still reject and do not poison a following valid restore', async () => {
  const state = D.stopDistillation(D.testedProgress(classic(), 65)), raw = json(state);
  for (const change of [s => { s.core.cash++; }, s => { s.still.distillation.litres++; }, s => { s.operations.at(-1).value = 35; }, s => { s.operations[0].key = 'unknown-stage7-operation'; }]) {
    const model = await freshModel(), bad = structuredClone(state); change(bad);
    assert.throws(() => model.restoreDistillery(json(bad)));
    assert.equal(json(model.restoreDistillery(raw)), raw);
    assert.throws(() => model.restoreDistillery(json(bad)), 'warm validation must also reject');
    assert.equal(json(model.restoreDistillery(raw)), raw);
  }
});

test('same-seed equal-length divergent operation prefixes cannot reuse each other’s cache', async () => {
  const initial = classic();
  const a = D.stopDistillation(D.testedProgress(initial, 35));
  const b = D.stopDistillation(D.testedProgress(initial, 65));
  assert.equal(a.seed, b.seed);
  assert.equal(a.operations.length, b.operations.length);
  assert.notEqual(json(a.operations), json(b.operations));
  const model = await freshModel();
  for (const state of [a, b, a, b]) assert.equal(json(model.restoreDistillery(json(state))), json(state));
  const mixed = structuredClone(b); mixed.operations = structuredClone(a.operations);
  assert.throws(() => model.restoreDistillery(json(mixed)));
  assert.equal(json(model.restoreDistillery(json(b))), json(b));
});

test('four-cask boundary remains enforceable after exact restoration', () => {
  let state = D.newWorldNetworkDistillery(42);
  for (let n = 0; n < 4; n++) {
    if (n) state = D.tickDistillery(state);
    state = D.startDistillation(state);
    while (state.still.distillation.progress < 45) state = D.distillStep(state);
    state = D.beginCollection(state);
    while (state.still.distillation.progress < 65) state = D.distillStep(state);
    state = D.fillBarrel(D.stopDistillation(state), 'refill');
  }
  const raw = D.serializeDistillery(state), restored = D.restoreDistillery(raw);
  assert.equal(restored.core.casks.length, 4);
  assert.equal(D.canStart(restored).ok, false);
  assert.match(D.canStart(restored).reason, /4樽/);
  assert.throws(() => D.startDistillation(restored));
  assert.equal(D.serializeDistillery(restored), raw);
});
