import test from 'node:test';
import assert from 'node:assert/strict';
import { profileAt, aromaSelection, newExperiment, startBatch, advance, bottle, serialize } from '../model.mjs';
import { majorAromas, omittedAromas, severeState, caskTendency } from '../aroma-view.mjs';

test('actual early, middle and late profiles keep their strongest two and original strengths', () => {
  for (const cask of ['bourbon', 'sherry', 'refill']) {
    for (const age of [0, 12, 36, 120]) {
      const profile = profileAt(cask, age);
      const before = JSON.stringify(profile);
      const actual = majorAromas(profile);
      assert.deepEqual(actual.map(a => a.key), aromaSelection(profile).slice(0, 2).map(a => a.key));
      assert.ok(actual.length <= 2);
      actual.forEach(a => { assert.equal(a.value, profile[a.key]); assert.equal(a.role, 'plain'); });
      assert.equal(JSON.stringify(profile), before);
      assert.deepEqual(majorAromas(profile), actual);
    }
  }
});

test('one-year bourbon and oloroso distinguish actual cask aromas and keep shared spirit secondary', () => {
  const bourbon = profileAt('bourbon', 12), sherry = profileAt('sherry', 12), refill = profileAt('refill', 12);
  const b = majorAromas(bourbon, sherry), s = majorAromas(sherry, bourbon);
  assert.equal(b[0].key, 'vanilla');
  assert.equal(s[0].key, 'dried');
  assert.equal(s[0].note, 'こちらの特徴');
  assert.equal(b.find(a => a.key === 'spirit').role, 'shared');
  assert.equal(majorAromas(refill)[0].key, 'spirit');
  assert.equal(majorAromas(refill)[0].value, refill.spirit);
});

test('comparison never promotes a minor aroma into the strongest two', () => {
  const p = { spirit: .8, vanilla: .6, dried: .3, woody: .2 };
  const other = { spirit: .8, vanilla: .6, dried: 0, woody: 0 };
  assert.deepEqual(majorAromas(p, other).map(a => a.key), ['spirit', 'vanilla']);
  assert.deepEqual(omittedAromas(p), [{ key: 'dried', label: 'ドライフルーツ', value: .3 }, { key: 'woody', label: '木の香り', value: .2 }]);
});

test('strengths remain on the absolute scale, including same-aroma differences', () => {
  const strong = majorAromas({ vanilla: .6 }, { vanilla: .3 })[0];
  const weak = majorAromas({ vanilla: .3 }, { vanilla: .6 })[0];
  assert.equal(strong.value, .6);
  assert.equal(weak.value, .3);
  assert.equal(strong.value / weak.value, 2);
  assert.equal(strong.otherValue, .3);
  assert.equal(strong.delta, .3);
  assert.equal(strong.role, 'more');
  assert.equal(weak.role, 'less');
});

test('threshold crossing and small differences do not receive a strong contrast cue', () => {
  for (const [value, otherValue] of [[.1001, .0999], [.18, .099], [.2, .11], [.3, .25]]) {
    const a = majorAromas({ vanilla: value }, { vanilla: otherValue })[0];
    assert.ok(['shared', 'close'].includes(a.role));
    assert.ok(!['こちらの特徴', '強め', '控えめ'].includes(a.note));
    assert.equal(a.value, value);
    assert.equal(a.otherValue, otherValue);
  }
  assert.deepEqual(majorAromas({ vanilla: .0999 }), []);
});

test('comparison checks the other channel even when it has no picture', () => {
  const profile = { spirit: .7, vanilla: .4 };
  const other = { spirit: .8, vanilla: .09, dried: .7, woody: .6 };
  const a = majorAromas(profile, other).find(a => a.key === 'vanilla');
  assert.equal(a.otherValue, .09);
  assert.equal(a.delta, .4 - .09);
  assert.equal(a.note, '強め');
});

test('missing or invalid channels produce no fabricated aromas or comparison', () => {
  for (const p of [null, undefined, {}, { spirit: NaN, vanilla: Infinity, dried: -.1, woody: 2 }]) {
    assert.deepEqual(majorAromas(p), []);
    assert.deepEqual(omittedAromas(p), []);
    assert.deepEqual(severeState(p), []);
  }
  const a = majorAromas({ spirit: .5 }, {})[0];
  assert.equal(a.otherValue, null);
  assert.equal(a.delta, null);
  assert.equal(a.role, 'plain');
  assert.equal(a.note, '');
});

test('only pronounced stimulation and bitterness get brief visible cues', () => {
  assert.deepEqual(severeState({ roughness: .45, wood: .65 }), []);
  assert.deepEqual(severeState({ roughness: .451, wood: .651 }), ['刺激が強い', '木の苦みが強い']);
  assert.deepEqual(severeState(profileAt('bourbon', 0)), ['刺激が強い']);
  assert.deepEqual(severeState(profileAt('sherry', 120)), ['木の苦みが強い']);
});

test('selection hints are tendencies and refill never claims to add spirit aroma', () => {
  assert.deepEqual(caskTendency('bourbon'), { key: 'vanilla', label: 'バニラ', phrase: '加わりやすい香り' });
  assert.equal(caskTendency('sherry').key, 'dried');
  assert.deepEqual(caskTendency('refill'), { key: 'spirit', label: '原酒を生かす', phrase: '樽の影響は穏やか' });
  assert.equal(caskTendency('unknown'), null);
});

test('presentation calls do not mutate profiles, saved snapshots or model state', () => {
  const state = bottle(advance(startBatch(newExperiment(), 'bourbon'), 12));
  const before = serialize(state), profile = state.bottles[0].profile;
  for (const age of [0, 12, 36, 120]) {
    for (const cask of ['bourbon', 'sherry', 'refill']) {
      majorAromas(profile, profileAt(cask, age));
      omittedAromas(profile);
      severeState(profile);
      caskTendency(cask);
    }
  }
  assert.equal(serialize(state), before);
  assert.deepEqual(profile, profileAt('bourbon', 12));
});
