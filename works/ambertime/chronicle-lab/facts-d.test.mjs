import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {buildChronicle} from './editor.mjs';
import {withReputationCandidates} from './facts-d.mjs';

const load = name => JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const baseline = load('./facts.json');
const supplements = load('./facts-d.json');

test('the D-only overlay preserves source identity, evidence, mandatory events and cutoff seeds',() => {
  const before = structuredClone(baseline);
  for (const [id,record] of Object.entries(baseline)) {
    const extra = supplements[id];
    const enriched = withReputationCandidates(record,extra);
    assert.throws(() => withReputationCandidates(record,{...extra,sourceSha256:'wrong'}));
    assert.equal(new Set(enriched.events.map(event => event.id)).size,enriched.events.length);
    for (const event of extra.events) {
      assert.ok(['arrival','inquiry','visit'].includes(event.kind));
      assert.ok(event.evidence.sourceId);
      assert.ok(Number.isInteger(event.replayOrdinal));
    }
    for (const horizon of ['handover','anniversary']) {
      const old = buildChronicle(record,horizon,'d');
      const current = buildChronicle(enriched,horizon,'d');
      assert.deepEqual(current,buildChronicle(enriched,horizon,'d'));
      assert.deepEqual(current.cutoff,old.cutoff);
      assert.equal(current.audit.seed,old.audit.seed);
      assert.deepEqual(current.audit.requiredIds,old.audit.requiredIds);
      if (horizon === 'handover') assert.equal(current.frames.at(-1).events[0].kind,'handover');
      else assert.ok(current.frames.some(({events}) => events.some(event =>
        event.scene?.kind === 'reputation' && event.generationId === 2)));
    }
  }
  assert.deepEqual(baseline,before);
});

test('same-operation replay positions govern visibility without changing the seed ordinal',() => {
  const record = structuredClone(baseline.local);
  const handover = record.events.find(event => event.kind === 'handover');
  const reference = buildChronicle(record,'handover','d');
  const adjacent = (id,replayOrdinal) => ({...handover,id,replayOrdinal,kind:'reaction'});
  const enriched = withReputationCandidates(record,{
    sourceSha256:record.sourceSha256,
    replayOrdinals:{[handover.id]:2},
    events:[adjacent('same-operation-before',1),adjacent('same-operation-after',3)],
  });
  const result = buildChronicle(enriched,'handover','d');
  assert.equal(result.audit.seed,reference.audit.seed);
  assert.equal(result.frames.at(-1).id,handover.id);
  const excluded = id => result.omitted.some(event => event.id === id && event.reason === '回想時点より後');
  assert.ok(excluded('same-operation-after'));
  assert.ok(!excluded('same-operation-before'));
});
