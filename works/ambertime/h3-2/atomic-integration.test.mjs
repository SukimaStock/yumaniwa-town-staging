// Offline real-scenario integration; generate saves with research-h24-saves.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../partner-orders.mjs';
import {initializeHistoryRecord,advanceHistoryRecord,assertHistoryRecord} from '../history-record.mjs';
import {migrateRecentLedger,advanceRecentLedger,assertRecentLedger} from '../recent-ledger.mjs';
import {createCollector,advanceCollector,prepareRecall,commitRecall} from './collector.mjs';
import {createMemoryStore,createAtomicSession} from './atomic.mjs';

const save=process.env.H32_INTEGRATION_SAVE??'/tmp/h32-saves/local-360.json';
const clone=x=>JSON.parse(JSON.stringify(x));
const key='research:h3-2:real-handover';
function validate(v){
 assertHistoryRecord(v.game,v.historyRecord);assertRecentLedger(v.game,v.recentLedger);
 assert.equal(v.collector.observer.index+1,v.game.operations.length);
 assert.equal(v.collector.generation,v.game.generations.active.id);
 assert.equal(v.collector.completed.length,v.game.generations.completed.length);
 for(const fact of Object.values(v.collector.facts))assert.ok(fact.operationIndex<v.game.operations.length&&fact.month<=v.game.core.month);
 assert.equal(new Set(Object.values(v.collector.facts).map(e=>e.id)).size,Object.keys(v.collector.facts).length);
}

test('real 30-year formal handover: integrated candidates, S2/S4, clock and game rollback/resume', {skip:!fs.existsSync(save)},()=>{
 const raw=fs.readFileSync(save,'utf8'),source=JSON.parse(raw),collector=createCollector('small',source.seed),stop=Symbol('first-handover');
 let ledger,history,normal,monthly,beforeHandover,afterHandover,operation,index,preview;
 const attach=(projection,count)=>({...projection,origin:source.origin,operations:source.operations.slice(0,count)});
 const pack=game=>clone({game,clock:{elapsed:0,userPaused:true},recentLedger:ledger,historyRecord:history,collector});
 try{D.replayDistilleryOperations(source,observation=>{
  const before=observation.before?attach(observation.before,observation.index):null,after=attach(observation.after,observation.index+1);
  if(observation.operation?.key==='generation-handover'){
   beforeHandover=pack(before);preview=prepareRecall(collector,before,observation.index);
   operation=observation.operation;index=observation.index;
  }
  advanceCollector(collector,observation);
  if(!history&&after.marketRules){
   history=initializeHistoryRecord(after);
   ledger=migrateRecentLedger(after,{replay:cb=>D.replayDistilleryOperations(after,cb)});
  }else if(history){history=advanceHistoryRecord(before,after,history);ledger=advanceRecentLedger(before,after,ledger);}
  if(observation.operation?.key==='generation-handover'){
   commitRecall(collector,preview,after);afterHandover=pack(after);throw stop;
  }
  if(history&&!normal&&observation.operation?.key==='fill')normal=pack(after);
  if(history&&!monthly&&observation.operation?.key==='month'&&after.core.month>=2)monthly=pack(after);
 });}catch(error){if(error!==stop)throw error;}
 assert(beforeHandover&&afterHandover&&normal&&monthly,'Scenario lacks expected checkpoints');
 assert.equal(JSON.stringify(source),raw,'Replay/collector mutated formal input');
 assert.ok(preview.scenes.length>0);assert.equal(beforeHandover.game.generations.active.phase,'review');

 for(const payload of [normal,monthly,beforeHandover,afterHandover]){
  validate(payload);const store=createMemoryStore(),session=createAtomicSession(store,key,{initial:payload,validate});
  assert.deepEqual(createAtomicSession(store,key,{validate}).snapshot(),payload);
  assert.deepEqual(JSON.parse(JSON.stringify(session.snapshot())),payload);
 }
 const store=createMemoryStore(),session=createAtomicSession(store,key,{initial:beforeHandover,validate}),original=session.text();
 const prepared=session.prepare(v=>{
  const frozen=prepareRecall(v.collector,v.game,index),before=v.game;
  // The actual formal operation occurs only in this private save candidate.
  const after=D.handoverGeneration(before,before.generations.active.id);
  assert.deepEqual(after,afterHandover.game,'Actual handover differs from recorded replay');
  advanceCollector(v.collector,{index,operation,before,after});
  const damaged=clone(frozen);damaged.boundary.month++;
  assert.throws(()=>commitRecall(clone(v.collector),damaged,after),/checksum/);
  assert.throws(()=>{frozen.boundary.month++;},TypeError);
  commitRecall(v.collector,frozen,after);
  v.game=after;v.recentLedger=advanceRecentLedger(before,after,v.recentLedger);v.historyRecord=advanceHistoryRecord(before,after,v.historyRecord);return v;
 });
 assert.equal(session.text(),original);assert.equal(store.read(),original);
 assert.equal(session.snapshot().game.generations.active.id,beforeHandover.game.generations.active.id);
 assert.deepEqual(prepared.value,afterHandover);
 store.inject('quota');assert.throws(()=>session.commit(prepared),e=>e.code==='quota');
 assert.equal(store.read(),original);assert.deepEqual(session.snapshot(),beforeHandover);
 assert.deepEqual(createAtomicSession(store,key,{validate}).snapshot(),beforeHandover);
 session.commit(prepared);assert.deepEqual(session.snapshot(),afterHandover);
 const resumed=createAtomicSession(store,key,{validate});assert.deepEqual(resumed.snapshot(),afterHandover);
 const frozen=JSON.stringify(resumed.snapshot().collector.completed);
 resumed.transact(v=>{v.clock.userPaused=false;return v;});
 assert.equal(JSON.stringify(resumed.snapshot().collector.completed),frozen);

 // Competing tab changes the complete old-generation envelope before handover.
 const competingStore=createMemoryStore(),stale=createAtomicSession(competingStore,key,{initial:beforeHandover,validate});
 const remote=createAtomicSession(competingStore,key,{validate}),candidate=stale.prepare(()=>clone(afterHandover));
 remote.transact(v=>{v.clock.userPaused=false;return v;});
 assert.throws(()=>stale.commit(candidate),e=>e.code==='conflict');
 assert.deepEqual(stale.snapshot(),beforeHandover);assert.equal(competingStore.read(),remote.text());
 stale.reload();assert.equal(stale.snapshot().game.generations.active.id,beforeHandover.game.generations.active.id);
 assert.deepEqual(stale.snapshot().collector.completed,beforeHandover.collector.completed);
});
