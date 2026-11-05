import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {withReputationCandidates} from './facts-d.mjs';
import {withRecallSnapshots} from './recall-snapshots.mjs';
import {buildChronicle} from './editor.mjs';

const load = name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const records = load('./facts.json'), additions = load('./facts-d.json');
const snapshots = load('./facts-recalls.json'), long = load('./facts-recalls-long.json');

test('published 30-year snapshots preserve anniversary, A/B/C and accepted handover counts',()=>{
  for (const [id,record] of Object.entries(records)) {
    const before = withReputationCandidates(record,additions[id]);
    const after = withRecallSnapshots(before,snapshots[id]);
    assert.equal(buildChronicle(after,'handover','d').frames.length,13);
    assert.deepEqual(buildChronicle(after,'anniversary','d'),buildChronicle(before,'anniversary','d'));
    for(const horizon of ['handover','anniversary'])for(const mode of ['a','b','c']) {
      assert.deepEqual(buildChronicle(after,horizon,mode),buildChronicle(before,horizon,mode));
    }
    const legacy = buildChronicle(before,'handover','d');
    const corrected = buildChronicle(after,'handover','d');
    assert.equal(corrected.audit.seed,legacy.audit.seed);
    if(id!=='wide') assert.deepEqual(corrected.frames,legacy.frames);
    else {
      const expected = ['distillation:29','bottling:1','shop-start:town-liquor:1','delivery:1',
        'shop-start:supermarket:1','arrival:e714','arrival:e1187','inquiry:e1391',
        'visit:e1470','sale:retail:151:39','delivery:49','inquiry:e2000','handover:1'];
      assert.deepEqual(corrected.audit.selectedIds,expected);
      assert.equal(corrected.audit.seed,3375526789);
    }
  }
});

test('all nine prepared boundaries use the same seed and result across ID and generation aliases',()=>{
  const sizes = {local:[13,18,20],wide:[13,20,23],mixed:[13,18,22]};
  for(const [id,record] of Object.entries(long.records)){
    const input = structuredClone(record);
    const connected = withRecallSnapshots(record,long.recalls[id]);
    for(const [index,snapshot] of connected.recallSnapshots.entries()){
      const byId = buildChronicle(connected,'handover','d',{handoverId:snapshot.handoverId});
      assert.deepEqual(byId,buildChronicle(connected,'handover','d',{targetGeneration:index+1}));
      if(index===0) assert.deepEqual(byId,buildChronicle(connected,'handover','d'));
      assert.equal(byId.frames.length,sizes[id][index]);
      assert.equal(byId.frames.at(-1).id,snapshot.handoverId);
      assert.equal(byId.audit.requiredIds.filter(id=>id.startsWith('handover:')).length,index+1);
      assert.ok(byId.frames.every(frame=>frame.events[0].operationIndex<=snapshot.cutoff.operationIndex));
    }
    assert.deepEqual(record,input);
    assert.throws(()=>buildChronicle(connected,'handover','d',{handoverId:'missing'}));
  }
});

test('mismatched sources, missing references, duplicate membership and future facts fail before editing',()=>{
  const record = withReputationCandidates(records.wide,additions.wide);
  for(const corrupt of [
    data=>data.sourceSha256='wrong',
    data=>data.snapshots[0].eventIds.push('missing'),
    data=>data.snapshots[0].eventIds.push(data.snapshots[0].eventIds[0]),
    data=>data.snapshots[0].eventIds.splice(-1,0,'visit:e2339'),
    data=>data.snapshots[0].seedGeneration=99,
    data=>data.snapshots[0].cutoff.operationIndex++,
  ]){
    const copy = structuredClone(snapshots.wide);
    corrupt(copy);
    assert.throws(()=>withRecallSnapshots(record,copy));
  }
});
