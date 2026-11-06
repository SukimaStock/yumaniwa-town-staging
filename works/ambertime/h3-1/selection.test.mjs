import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadRecords} from './data.mjs';
import {compareBoundary,boundaryInput,linksFor,order,before} from './selection.mjs';
const {records}=loadRecords();
const baseline=JSON.parse(fs.readFileSync(new URL('../s4/h2-comparison.json',import.meta.url)));
for(const {years,policy,record}of records)for(const snap of record.recallSnapshots){
 test(policy+'/'+years+'/'+snap.handoverId+': baseline, boundary, causality and future independence',()=>{
  const bytes=JSON.stringify(record),r=compareBoundary(record,snap.handoverId),a=baseline.results.find(x=>x.years===years&&x.policy===policy&&x.boundary===snap.handoverId);
  assert.deepEqual(r.modes.A.selectedIds,a.selected.map(e=>e.id));assert.equal(r.seed,a.seed);
  const ctx=boundaryInput(record,snap.handoverId);
  for(const mode of ['B','C']){
   const es=r.modes[mode].scenes.map(s=>s.event);
   assert.ok(es.every(e=>e.generationId===r.generation&&before(e,ctx.boundary)));
   assert.deepEqual(es,[...es].sort(order));assert.ok(es.length<=6);
   for(const scene of r.modes[mode].scenes)for(const link of scene.links){
    const source=ctx.events.find(e=>e.id===link.sourceId);assert.ok(source);assert.ok(order(source,scene.event)<0);
    if(link.causal){assert.equal(source.ids.townReleaseId,scene.event.ids.townReleaseId);assert.ok(scene.event.evidence.sourceChain.includes(source.ids.townEventId));}
   }
  }
  assert.deepEqual(compareBoundary({...record,events:record.events.filter(e=>before(e,ctx.boundary))},snap.handoverId),r);
  const future={...record,events:[...record.events,{...ctx.boundary,id:'future',kind:'visit',month:9999,generationId:99,evidence:{sourceChain:ctx.events.map(e=>e.ids.townEventId)}}]};
  assert.deepEqual(compareBoundary(future,snap.handoverId),r);assert.equal(JSON.stringify(record),bytes);
 });
}
test('30 and 100 first boundaries are identical',()=>{
 for(const p of ['local','wide','mixed'])assert.deepEqual(compareBoundary(records.find(r=>r.policy===p&&r.years===30).record,'handover:1'),compareBoundary(records.find(r=>r.policy===p&&r.years===100).record,'handover:1'));
});
test('same-operation future fact is rejected',()=>{
 const record=structuredClone(records[0].record),b=record.events.find(e=>e.kind==='handover');
 const extra={...b,id:'after',replayOrdinal:b.replayOrdinal+1};record.events.push(extra);record.recallSnapshots[0].eventIds.push(extra.id);
 assert.throws(()=>boundaryInput(record,b.id),/future/);
 assert.equal(before({...b,id:'before',replayOrdinal:b.replayOrdinal-1},b),true);
});
test('region recurrence is not causality; future or different-release source is rejected',()=>{
 const {record}=records.find(r=>r.years===100&&r.policy==='local'),v=record.events.find(e=>e.id==='visit:e3669');
 assert.ok(linksFor(v,record.events).some(l=>l.sourceId==='arrival:e36'&&l.type==='再登場'&&!l.causal));
 const a={...record.events.find(e=>e.kind==='arrival'),id:'fake',ids:{townEventId:'x',townReleaseId:999},month:v.month-1};
 assert.ok(!linksFor({...v,evidence:{sourceChain:['x']}},[a]).some(l=>l.causal));
 a.ids.townReleaseId=v.ids.townReleaseId;a.month=v.month+1;
 assert.ok(!linksFor({...v,evidence:{sourceChain:['x']}},[a]).some(l=>l.causal));
});
test('sparse generations are not padded and inherited cask is exact',()=>{
 const record=structuredClone(records[0].record),snap=record.recallSnapshots[0],b=record.events.find(e=>e.id===snap.handoverId);
 snap.eventIds=[b.id];snap.ordinalOverrides={};snap.cutoff.ordinal=b.ordinal;
 for(const m of ['B','C'])assert.equal(compareBoundary(record,b.id).modes[m].scenes.length,0);
 const e=record.events.find(e=>e.kind==='delivery');snap.eventIds=[e.id,b.id];
 for(const m of ['B','C'])assert.equal(compareBoundary(record,b.id).modes[m].scenes.length,1);
 const full=records.find(r=>r.years===100&&r.policy==='local').record,r=compareBoundary(full,'handover:2'),s=r.modes.C.scenes.find(s=>s.eventId==='bottling:14');
 assert.ok(s);const link=s.links.find(l=>l.type==='先代の樽');
 assert.equal(full.events.find(e=>e.id===link.sourceId).ids.caskId,s.event.ids.caskId);
});
