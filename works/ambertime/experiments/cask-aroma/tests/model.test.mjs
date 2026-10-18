import test from 'node:test';
import assert from 'node:assert/strict';
import { CASKS, AROMAS, MAX_BOTTLES, profileAt, aromaSelection, newExperiment, startBatch, advance, matchReference, bottle, useBottle, delegate, serialize, restore } from '../model.mjs';

const ids = Object.keys(CASKS);
const mature = (id, age = 12) => advance(startBatch(newExperiment(), id), age);
const saved = (id = 'bourbon', age = 12) => bottle(mature(id, age));
const mutateSave = (state, edit) => {
  const copy = JSON.parse(serialize(state));
  edit(copy);
  return JSON.stringify(copy);
};

test('all three casks begin with exactly the same fixed raw spirit', () => {
  const expected = { spirit: .68, vanilla: 0, dried: 0, woody: 0, wood: 0, roughness: .62, litres: 32 };
  ids.forEach(id => assert.deepEqual(profileAt(id, 0), expected));
});

test('same-age casks have distinct aroma directions, including early and long ageing', () => {
  for (const age of [6, 12, 36, 72, 120]) {
    const b = profileAt('bourbon', age);
    const s = profileAt('sherry', age);
    const r = profileAt('refill', age);
    assert.ok(b.vanilla > s.vanilla && b.vanilla > r.vanilla);
    assert.ok(s.dried > b.dried && s.dried > r.dried);
    assert.ok(r.spirit > b.spirit && r.spirit > s.spirit);
    assert.ok(b.roughness < r.roughness && s.wood > r.wood);
    // These channels are distinct model values, not a shared wood value renamed.
    assert.notEqual(b.vanilla, b.wood);
    assert.notEqual(s.dried, s.wood);
  }
});

test('every reachable half-year sample stays finite and in its declared range', () => {
  for (const id of ids) {
    for (let age = 0; age <= 120; age += 6) {
      const p = profileAt(id, age);
      for (const key of ['spirit', 'vanilla', 'dried', 'woody', 'wood', 'roughness']) assert.ok(Number.isFinite(p[key]) && p[key] >= 0 && p[key] <= 1, `${id}/${age}/${key}`);
      assert.ok(p.litres > 0 && p.litres <= 32);
      assert.deepEqual(p, profileAt(id, age));
    }
  }
});

test('wood, remaining volume and stimulation change independently from aroma', () => {
  for (const id of ids) {
    const initial = profileAt(id, 0);
    const mid = profileAt(id, 36);
    const old = profileAt(id, 120);
    assert.ok(old.wood > mid.wood && mid.wood > initial.wood);
    assert.ok(old.roughness < mid.roughness && mid.roughness < initial.roughness);
    assert.ok(old.litres < mid.litres && mid.litres < initial.litres);
    assert.ok(old.spirit < mid.spirit);
    assert.ok(old.vanilla < profileAt(id, 96).vanilla, 'late extracted aroma declines while wood continues rising');
  }
  assert.ok(profileAt('sherry', 120).dried < profileAt('sherry', 36).dried);
});

test('aroma pictures use actual values, exclude texture axes, and never invent two aromas', () => {
  assert.deepEqual(AROMAS.map(a => a.key), ['spirit', 'vanilla', 'dried', 'woody']);
  assert.deepEqual(aromaSelection(profileAt('bourbon', 0)).map(a => a.key), ['spirit']);
  const b = aromaSelection(profileAt('bourbon', 36));
  assert.equal(b[0].key, 'vanilla');
  const s = aromaSelection(profileAt('sherry', 36));
  assert.equal(s[0].key, 'dried');
  assert.ok(aromaSelection(profileAt('refill', 12)).every(a => a.value >= .10));
  assert.deepEqual(aromaSelection({ spirit: .1, vanilla: .1, dried: .1, wood: 1, roughness: 1 }).map(a => a.key), ['spirit', 'vanilla', 'dried']);
  assert.deepEqual(aromaSelection({ spirit: .0999, vanilla: 0, dried: 0 }), []);
});

test('wood aroma is a separate channel and picture, never inferred from bitterness', () => {
  for (const id of ids) {
    for (const age of [6, 12, 36, 72, 120]) {
      const p = profileAt(id, age);
      assert.ok(p.woody > 0);
      assert.notEqual(p.woody, p.wood);
    }
    const early = profileAt(id, 12), late = profileAt(id, 120);
    assert.notEqual(early.woody / early.wood, late.woody / late.wood, 'not a scaled duplicate curve');
  }
  assert.ok(aromaSelection(profileAt('bourbon', 36)).some(a => a.key === 'woody'));
  assert.ok(!aromaSelection({ spirit: 0, vanilla: 0, dried: 0, woody: 0, wood: 1, roughness: 1 }).length);
  const shown = aromaSelection({ spirit: .5, vanilla: .4, dried: .3, woody: .2, wood: 1 });
  assert.deepEqual(shown.map(a => a.key), ['spirit', 'vanilla', 'dried']);
  assert.equal(shown.length, 3, 'fourth nonzero aroma is omitted only for display');
  assert.deepEqual(aromaSelection({ spirit: .2, vanilla: .1, dried: .3, woody: .4 }).map(a => a.key), ['woody', 'dried', 'spirit']);
});

test('six-month steps and direct same-age evaluation agree exactly', () => {
  for (const id of ids) {
    let state = startBatch(newExperiment(), id);
    for (let age = 6; age <= 120; age += 6) {
      state = advance(state);
      assert.deepEqual(state.active.profile, profileAt(id, age));
    }
    assert.equal(advance(state, 12).active.age, 120);
  }
});

test('bottle remains an immutable snapshot after ageing another cask', () => {
  const first = saved();
  const before = serialize(first);
  let next = useBottle(first, first.bottles[0].id);
  next = advance(startBatch(next, 'sherry'), 72);
  assert.equal(serialize(first), before);
  assert.deepEqual(next.bottles[0].profile, profileAt('bourbon', 12));
  assert.ok(Object.isFrozen(next.bottles[0].profile));
  assert.throws(() => { next.bottles[0].profile.spirit = 1; }, TypeError);
});

test('reference → change cask → match age → second bottle retains source connection', () => {
  let state = saved('bourbon', 18);
  const firstId = state.bottles[0].id;
  state = useBottle(state, firstId);
  state = matchReference(startBatch(state, 'sherry'));
  assert.equal(state.active.age, 18);
  assert.equal(state.active.sourceId, firstId);
  state = bottle(state);
  assert.equal(state.bottles.length, 2);
  assert.equal(state.referenceId, firstId);
  assert.equal(state.active, null);
  assert.deepEqual(state.bottles[1].profile, profileAt('sherry', 18));
});

test('matching duration can reset only the isolated trial and never changes base bottle', () => {
  const first = saved('refill', 6);
  let state = useBottle(first, first.bottles[0].id);
  state = advance(startBatch(state, 'bourbon'), 72);
  state = matchReference(state);
  assert.equal(state.active.age, 6);
  assert.equal(state.bottles[0].age, 6);
});

test('delegation cycles alternative casks, with no special quality modifier', () => {
  for (const baseId of ids) {
    let state = saved(baseId, 12);
    state = useBottle(state, state.bottles[0].id);
    const seen = new Set();
    for (let n = 0; n < 4; n++) {
      state = delegate(state);
      assert.notEqual(state.active.caskId, baseId);
      assert.equal(state.active.delegated, true);
      assert.equal(state.active.sourceId, state.referenceId);
      seen.add(state.active.caskId);
      state = matchReference(state);
      assert.deepEqual(state.active.profile, profileAt(state.active.caskId, 12));
    }
    assert.equal(seen.size, 2);
  }
});

test('without reference delegation excludes the current active cask', () => {
  for (const id of ids) assert.notEqual(delegate(startBatch(newExperiment(), id)).active.caskId, id);
  assert.ok(ids.includes(delegate(newExperiment()).active.caskId));
});

test('delegated bottle supports the same source-and-change flow as manual bottle', () => {
  let state = bottle(advance(delegate(newExperiment()), 12));
  const firstId = state.bottles[0].id;
  state = useBottle(state, firstId);
  state = bottle(matchReference(delegate(state)));
  assert.equal(state.bottles[1].sourceId, firstId);
  assert.deepEqual(restore(serialize(state)), state);
});

test('strict roundtrip covers empty, active, discarded and chained batches', () => {
  assert.deepEqual(restore(serialize(newExperiment())), newExperiment());
  let state = saved();
  state = useBottle(state, state.bottles[0].id);
  state = startBatch(state, 'refill');
  state = startBatch(state, 'sherry'); // Abandoned active IDs remain gaps.
  state = bottle(advance(state, 36));
  state = useBottle(state, state.bottles[1].id);
  state = advance(delegate(state), 24);
  assert.deepEqual(restore(serialize(state)), state);
});

test('schema rejects unknown fields, malformed values, and unsupported old save formats', () => {
  const state = saved();
  const mutations = [
    s => { s.version = 2; }, s => { s.version = '1'; },
    s => { s.extra = true; }, s => { delete s.nextId; },
    s => { s.nextId = 1; }, s => { s.nextId = 1.5; },
    s => { s.delegationCount = -1; }, s => { s.bottles = null; },
    s => { s.bottles[0].age = 121; }, s => { s.bottles[0].age = -1; },
    s => { s.bottles[0].caskId = 'made-up'; }, s => { s.bottles[0].delegated = 'false'; },
    s => { s.bottles[0].profile.spirit += .01; }, s => { delete s.bottles[0].profile.dried; },
    s => { s.bottles[0].profile.wood = null; }, s => { s.bottles[0].profile.hidden = 0; },
    s => { delete s.bottles[0].profile.woody; }, s => { s.bottles[0].profile.woody = s.bottles[0].profile.wood; },
    s => { s.bottles[0].id = 'batch-01'; }, s => { s.bottles[0].id = 1; },
    s => { s.referenceId = 'batch-99'; }, s => { s.active = {}; },
  ];
  mutations.forEach(edit => assert.throws(() => restore(mutateSave(state, edit))));
  ['null', '[]', '{}', 'not-json'].forEach(value => assert.throws(() => restore(value)));
  assert.throws(() => restore({}));
});

test('save rejects missing, self, cyclic, forward, duplicate, active-only references', () => {
  let state = saved();
  state = bottle(advance(startBatch(useBottle(state, state.bottles[0].id), 'sherry'), 12));
  const edits = [
    s => { s.bottles[0].sourceId = s.bottles[0].id; },
    s => { s.bottles[0].sourceId = s.bottles[1].id; },
    s => { s.bottles[0].sourceId = s.bottles[1].id; s.bottles[1].sourceId = s.bottles[0].id; },
    s => { s.bottles[1].sourceId = 'batch-99'; },
    s => { s.bottles[1].id = s.bottles[0].id; },
    s => { s.bottles.reverse(); },
  ];
  edits.forEach(edit => assert.throws(() => restore(mutateSave(state, edit))));
  const active = startBatch(state, 'refill');
  assert.throws(() => restore(mutateSave(active, s => { s.referenceId = s.active.id; })));
});

test('shelf cap never silently removes a remembered bottle', () => {
  let state = newExperiment();
  for (let i = 0; i < MAX_BOTTLES; i++) state = bottle(startBatch(state, ids[i % 3]));
  const before = serialize(state);
  const active = startBatch(state, 'sherry');
  assert.throws(() => bottle(active), RangeError);
  assert.equal(serialize(state), before);
  assert.equal(state.bottles[0].id, 'batch-1');
  assert.deepEqual(restore(serialize(active)), active);
});

test('invalid interactions fail clearly without changing previous state', () => {
  const state = newExperiment();
  const before = serialize(state);
  [() => bottle(state), () => advance(state), () => matchReference(state), () => useBottle(state, 'batch-1'), () => useBottle(state, null), () => startBatch(state, 'unknown'), () => startBatch(state, 'sherry', { sourceId: 'batch-1' })].forEach(fn => assert.throws(fn));
  const active = startBatch(state, 'bourbon');
  [-1, NaN, Infinity, '6'].forEach(months => assert.throws(() => advance(active, months)));
  [-1, 121, NaN, Infinity, '12'].forEach(age => assert.throws(() => profileAt('bourbon', age)));
  assert.equal(serialize(state), before);
});
