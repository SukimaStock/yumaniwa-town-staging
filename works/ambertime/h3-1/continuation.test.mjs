// Published-boundary relationship proof, not an online collector or future-stream test.
// Each input starts from its independently frozen H2-5 candidate membership.
// This proves retained relationship information for the observed current candidates;
// it does not prove that a streaming collector would retain the same candidates.
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRecords} from './data.mjs';
import {compareBoundary,boundaryInput,linksFor,order} from './selection.mjs';
import {buildStorage} from './storage.mjs';

const expected={local:[238,120,122],wide:[316,175,174],mixed:[253,135,157]};
const records=loadRecords().records.filter(r=>r.years===100);

function restoredEvents(saved){
  const facts=[...saved.active,...saved.anchorFacts,...saved.witnessFacts,...saved.pendingOrigins,
    ...saved.completed.flatMap(e=>e.scenes.flatMap(s=>[s.fact,...s.sourceFacts]))];
  const byId=new Map(facts.map(f=>[f.id,{...f,replayOrdinal:f.position,ordinal:f.position,evidence:f.proof}]));
  for(const o of saved.origins){
    if(!byId.has(o.eventId))byId.set(o.eventId,{id:o.eventId,kind:'bottling',month:o.month,
      operationIndex:o.operationIndex,replayOrdinal:o.position,generationId:o.generationId,
      ids:{releaseId:o.releaseId,productId:o.productId,brandId:o.brandId,caskId:o.caskId}});
    if(o.origin&&!byId.has(o.origin.eventId))byId.set(o.origin.eventId,{id:o.origin.eventId,
      kind:'fill',month:o.origin.month,operationIndex:o.origin.operationIndex,
      replayOrdinal:o.origin.position,generationId:o.origin.generationId,
      ids:{caskId:o.caskId,batchId:o.origin.batchId}});
  }
  // Completed boundary metadata supplies the previous generation's start point.
  // No old handover scene needs to be retained just to recover that boundary.
  for(const e of saved.completed)byId.set(e.handoverId,{id:e.handoverId,kind:'handover',
    month:e.cutoff.month,operationIndex:e.cutoff.operationIndex,ordinal:e.cutoff.ordinal,
    replayOrdinal:e.cutoff.replayOrdinal,generationId:e.seedGeneration-1,
    ids:{fromGeneration:e.seedGeneration-1,toGeneration:e.seedGeneration}});
  return [...byId.values()].sort(order);
}

let count=0;
for(const {policy,record} of records)for(const [index,snapshot] of record.recallSnapshots.entries()){
  test(policy+'/'+snapshot.handoverId+': method3 retains current-candidate relationship proofs',()=>{
    const ctx=boundaryInput(record,snapshot.handoverId);
    assert.equal(ctx.current.length,expected[policy][index]);
    const exact={...record,elapsedMonths:ctx.boundary.month,events:ctx.events,
      recallSnapshots:record.recallSnapshots.slice(0,index+1)};
    const completed=record.recallSnapshots.slice(0,index).map(s=>{
      const result=compareBoundary(record,s.handoverId);
      return {...result,scenes:result.modes.C.scenes};
    });
    const saved=JSON.parse(JSON.stringify(buildStorage(exact,completed).method3));
    const restored=restoredEvents(saved);
    for(const event of ctx.current){
      assert.deepEqual(linksFor(event,restored),linksFor(event,ctx.events),event.id);
    }
    const selected=compareBoundary(record,snapshot.handoverId).modes.C.scenes;
    for(const scene of selected)assert.ok(restored.some(e=>e.id===scene.eventId),scene.eventId);
    if(index>0){
      const previous=restored.filter(e=>e.kind==='handover'&&e.id!==snapshot.handoverId).at(-1);
      assert.equal(previous.month,ctx.startMonth);
      assert.equal(previous.generationId,ctx.boundary.generationId-1);
    }
    // Re-edit B/C from the stored semantic views. A remains an unchanged
    // separate historical baseline; discarded internal A scenes are not promised.
    const decoded={...exact,events:restored,recallSnapshots:[{...snapshot,
      eventIds:restored.map(e=>e.id),ordinalOverrides:{}}]};
    const original=compareBoundary(record,snapshot.handoverId),again=compareBoundary(decoded,snapshot.handoverId);
    for(const mode of ['B','C']){
      assert.deepEqual(again.modes[mode].selectedIds,original.modes[mode].selectedIds);
      const display=s=>({sentence:s.sentence,links:s.links,illustration:s.illustration});
      assert.deepEqual(again.modes[mode].scenes.map(display),original.modes[mode].scenes.map(display));
    }
  });
  count+=expected[policy][index];
}
test('relationship coverage is nine published boundaries and 1690 candidates',()=>{
  assert.equal(records.reduce((n,r)=>n+r.record.recallSnapshots.length,0),9);
  assert.equal(count,1690);
});
