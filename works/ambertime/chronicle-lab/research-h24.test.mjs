import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {auditRecord,publicBaseline} from './research-h24-edit.mjs';
import {buildChronicle} from './editor.mjs';

test('the H2-3B public baseline keeps exact A/B/C/D IDs, ordering and D seeds',()=>{
  const digest = createHash('sha256').update(JSON.stringify(publicBaseline())).digest('hex');
  assert.equal(digest,'11671ae9e43a90dd2cd313c09d2c8009f0cb6157b526553f26ad8f65cc35551e');
});

test('synthetic boundary controls distinguish two positions in the same operation at all three handovers',()=>{
  const event = (id,kind,month,generationId,extra={}) => ({
    id,kind,month,generationId,operationIndex:month,ordinal:0,
    evidence:{record:'synthetic fixture',sourceId:id},label:id,...extra,
  });
  const first = event('first','bottling',6,1);
  const chapters = [1,2,3].flatMap(generation=>{
    const month = 300*generation;
    return [
      event('before-'+generation,'reaction',month,generation,{replayOrdinal:1}),
      event('handover-'+generation,'handover',month,generation,{replayOrdinal:2,
        operationKey:'generation-handover',ids:{fromGeneration:generation,toGeneration:generation+1}}),
      event('after-'+generation,'reaction',month,generation,{replayOrdinal:3}),
      event('next-'+generation,'bottling',month+1,generation+1),
    ];
  });
  for (const row of [first,...chapters]) row.ids ??= {};
  const record = {seed:42,elapsedMonths:1200,lastOperationIndex:1200,events:[first,...chapters]};
  const editions = auditRecord(record);
  assert.equal(new Set(editions.map(row=>row.seed)).size,4);
  for (const [index,edition] of editions.slice(1).entries()) {
    const generation = index+1;
    assert.equal(edition.range[1],'handover-'+generation);
    const result = buildChronicle(record,'handover','d',{targetGeneration:generation});
    const future = result.omitted.filter(row=>row.reason==='回想時点より後');
    assert.ok(future.some(row=>row.id==='after-'+generation));
    assert.ok(!future.some(row=>row.id==='before-'+generation));
  }
});
