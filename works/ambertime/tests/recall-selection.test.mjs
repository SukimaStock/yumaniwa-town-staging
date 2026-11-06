import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {withReputationCandidates} from '../chronicle-lab/facts-d.mjs';
import {withRecallSnapshots} from '../chronicle-lab/recall-snapshots.mjs';
import {selectC,selectionSeed,order,before,selectionSourceSha256} from '../recall/selection.mjs';
import {createObserverState,observeOperation,resolveChain,materializeTownFact} from '../recall/observe.mjs';
import * as D from '../partner-orders.mjs';
import {simulateScenario} from '../history-lab/scenarios.mjs';
import {customerComments} from '../player-news.mjs';
// Fixed independently from #820's selector at 8c2d1c6; never derived from production output.
const expected={
 local:[[1951059788,'cbb6b359c972d5fc95016eb2d59784f76bdd2b3efebcc70d24fdff42d0b8f403'],[3292650147,'5fe67637a184cfd62d8d13f6429e6e4d99f5f6cfd2376fb8f6bd5675dea0ab56'],[2938167181,'3d093ff44820a8ad0b109a71f0dd8cd3d33c2095f8ce881d03a58c687530f6b3']],
 wide:[[3375526789,'ce6a75e1688c0e12910aef238ce2d1b95456644540a00997e7bfef39b7b9105e'],[3640528030,'73d5d54c6fa154ebe8d8836c579b4e7a24d038b131f462bbc0908a60c19d580e'],[998091086,'b117f12babe97abc6e78561364e324893703917394e9bf8fc32eb71ad5140c6a']],
 mixed:[[3734367846,'87eed83fb99a6b87e0f0b85beaad6d6a5c201fc33adc8fb64ad0cdeace02bafd'],[1034288908,'836c9bf839b4d9e81a3bf1ecad4042746ce4506bb16993e0dd1f51fd7c9bfe95'],[101964278,'c883f0dff70cc55252782a2d93028871364145674614ad4bdd974b1355bd248d']]
};
test('pure production C preserves all 12 research boundary seeds and complete scenes',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../chronicle-lab/'+name,import.meta.url)));
 const base=read('facts.json'),extra=read('facts-d.json'),recalls=read('facts-recalls.json'),long=read('facts-recalls-long.json');let count=0;
 assert.equal(selectionSourceSha256,'4c3e11af2be1e911235225f2cb7d266a85f471d07d630537ceacedf73a29a3b4');
 for(const years of [30,100])for(const policy of ['local','wide','mixed']){
  const record=years===30?withRecallSnapshots(withReputationCandidates(base[policy],extra[policy]),recalls[policy]):withRecallSnapshots(long.records[policy],long.recalls[policy]);
  for(const snapshot of record.recallSnapshots){
   const byId=new Map(record.events.map(e=>[e.id,e])),boundary=byId.get(snapshot.handoverId);
   const events=snapshot.eventIds.map(id=>{const e=byId.get(id);assert(e&&before(e,boundary));return Object.hasOwn(snapshot.ordinalOverrides??{},id)?{...e,ordinal:snapshot.ordinalOverrides[id]}:e;}).sort(order);
   const previous=events.filter(e=>e.kind==='handover'&&e.id!==boundary.id).at(-1);
   const current=events.filter(e=>(!previous||order(e,previous)>0)&&e.generationId===boundary.generationId),seed=selectionSeed(record.seed,boundary);
   const input={events,current,boundary,startMonth:previous?.month??0,seed},original=JSON.stringify(input),scenes=selectC(input),[expectedSeed,hash]=expected[policy][boundary.generationId-1];
   assert.equal(seed,expectedSeed);assert.equal(createHash('sha256').update(JSON.stringify(scenes)).digest('hex'),hash);assert.equal(JSON.stringify(input),original);count++;
  }
 }
 assert.equal(count,12);
});
test('new observer starts after opt-in operations without replay, and rejects progressed saves',()=>{
 const game=D.newMarketRulesDistillery(42),cursor=createObserverState(game),next=D.startRangeDistillation(game),index=game.operations.length;
 assert.equal(cursor.index,index-1);observeOperation(cursor,{index,operation:next.operations[index],before:game,after:next});
 assert.equal(cursor.origins.batches[next.still.batch.id].generationId,1);
 assert.throws(()=>createObserverState(next),/past operations|existing facts/);
 assert.throws(()=>observeOperation(cursor,{index:index+2,operation:{key:'month'},before:next,after:next}),/Skipped/);
});
test('source proof rejects missing position, release mismatch, cycle and same-operation future',()=>{
 const rows=[{id:'e1',month:1,releaseId:1,sourceId:null},{id:'e2',month:1,releaseId:1,sourceId:'e1'}];
 const state={labConnection:{town:{events:rows}}},blocks=[{first:1,last:2,operationIndex:7,generationId:1}];
 assert.deepEqual(resolveChain(state,'e2',blocks).map(e=>e.id),['e1','e2']);
 assert.throws(()=>resolveChain(state,'e2',[]),/Missing town operation/);
 rows[0].releaseId=2;assert.throws(()=>resolveChain(state,'e2',blocks),/release/);rows[0].releaseId=1;
 rows[0].sourceId='e2';assert.throws(()=>resolveChain(state,'e1',blocks),/Future|Cyclic/);
});

test('operation facts survive JSON resume, match customer wording and materialize exact source positions',()=>{
 const {game}=simulateScenario('wide',72),original=JSON.stringify(game);let cursor=createObserverState();const facts=[];
 D.replayDistilleryOperations(game,observation=>{
  if(observation.index%31===0)cursor=JSON.parse(JSON.stringify(cursor));
  const before=JSON.stringify(observation),result=observeOperation(cursor,observation);facts.push(...result.facts);
  assert.equal(JSON.stringify(observation),before);
  assert.deepEqual(observeOperation(cursor,observation).facts,[]);
 });
 assert.equal(JSON.stringify(game),original);assert.equal(new Set(facts.map(e=>e.id)).size,facts.length);
 assert.deepEqual(facts.filter(e=>e.kind==='reaction').map(e=>({id:e.id.slice(9),month:e.month,text:e.label,releaseId:e.ids.releaseId})),customerComments(game));
 const town=facts.filter(e=>e.evidence.record==='labConnection.town.events');assert(town.length>0);
 for(const e of town)assert.deepEqual(materializeTownFact(game,e.ids.townEventId,cursor),e);
 assert(Object.keys(cursor.origins.casks).length<=4);
});
