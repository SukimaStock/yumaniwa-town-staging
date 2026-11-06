import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateScenario} from '../history-lab/scenarios.mjs';
import {replayDistilleryOperations} from '../partner-orders.mjs';
import {customerComments} from '../player-news.mjs';
import {createObserverState,observeOperation,materializeTownFact,resolveChain} from './observe.mjs';

test('formal progress, JSON resume, comments and source materialization',()=>{
 const {game}=simulateScenario('wide',72),original=JSON.stringify(game);let cursor=createObserverState();const facts=[];
 replayDistilleryOperations(game,observation=>{
  if(observation.index%31===0)cursor=JSON.parse(JSON.stringify(cursor));
  const before=JSON.stringify(observation),result=observeOperation(cursor,observation);facts.push(...result.facts);
  assert.equal(JSON.stringify(observation),before,'observer never mutates formal state');
  assert.deepEqual(observeOperation(cursor,observation).facts,[],'repeat observation deduplicated');
 });
 assert.equal(JSON.stringify(game),original);
 assert.equal(new Set(facts.map(e=>e.id)).size,facts.length);
 const comments=customerComments(game);assert.deepEqual(facts.filter(e=>e.kind==='reaction').map(e=>({id:e.id.slice(9),month:e.month,text:e.label,releaseId:e.ids.releaseId})),comments);
 const town=facts.filter(e=>e.evidence.record==='labConnection.town.events');assert(town.length>0);
 for(const e of town)assert.deepEqual(materializeTownFact(game,e.ids.townEventId,cursor),e);
 assert.throws(()=>observeOperation(cursor,{index:cursor.index+2,operation:null,after:game}),/Skipped/);
 assert.throws(()=>resolveChain(game,'e999999',cursor.positionBlocks),/Missing/);
 assert(Object.keys(cursor.origins.casks).length<=4);
});

test('source proof rejects missing position, release mismatch, cycle and same-operation future',()=>{
 const rows=[{id:'e1',month:1,releaseId:1,sourceId:null},{id:'e2',month:1,releaseId:1,sourceId:'e1'}];
 const state={labConnection:{town:{events:rows}}},blocks=[{first:1,last:2,operationIndex:7,generationId:1}];
 assert.deepEqual(resolveChain(state,'e2',blocks).map(e=>e.id),['e1','e2']);
 assert.throws(()=>resolveChain(state,'e2',[]),/Missing town operation/);
 rows[0].releaseId=2;assert.throws(()=>resolveChain(state,'e2',blocks),/release/);rows[0].releaseId=1;
 rows[0].sourceId='e2';assert.throws(()=>resolveChain(state,'e1',blocks),/Future|Cyclic/);
});

test('delegated batch origin survives fill and release as separate evidence',()=>{
 const base={seed:42,core:{month:3,casks:[]},still:{batch:null},generations:{active:{id:2},completed:[]},releases:[],brands:[]};
 const cursor=createObserverState();observeOperation(cursor,{index:-1,operation:null,before:null,after:base});
 const started=structuredClone(base);started.still.batch={id:9,startedMonth:3};
 observeOperation(cursor,{index:0,operation:{key:'start-usual'},before:base,after:started});
 const filled=structuredClone(started);filled.core.casks=[{id:22,batchId:9,filledMonth:3,type:'bourbon'}];
 const fill=observeOperation(cursor,{index:1,operation:{key:'complete-usual'},before:started,after:filled});
 assert.equal(fill.originUpdates[0].batch.generationId,2);assert.equal(fill.originUpdates[0].batch.operationIndex,0);
 const released=structuredClone(filled);released.core.casks=[];released.generations.active.id=3;released.releases=[{id:1,productId:4,caskId:22,brandId:1,bottledMonth:3,age:0,bottles:12}];
 const result=observeOperation(cursor,{index:2,operation:{key:'bottle'},before:filled,after:released});
 assert.equal(result.originUpdates[0].origin.caskId,22);assert.equal(result.originUpdates[0].origin.batch.batchId,9);assert.equal(result.originUpdates[0].origin.batch.generationId,2);
 assert.deepEqual(cursor.origins.casks,{});
});
