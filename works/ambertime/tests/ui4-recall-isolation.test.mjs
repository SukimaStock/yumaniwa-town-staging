import test from 'node:test';
import assert from 'node:assert/strict';
import * as native from '../partner-orders.mjs';
import {createObservedModel} from '../recall/operations.mjs';
import {initializeRecall,advanceRecall,prepareRecall,assertRecall} from '../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../recent-ledger.mjs';
import {serializeSession,readSession} from '../development-save.mjs';
import {createFreshSession} from '../session-entry.mjs';
import {PARALLEL_PARAMETERS as T} from '../economy-parameters.mjs';

// These are the actual app reader timings, not the economy parameter object.
const options={enabled:true,serialize:native.serializeDistillery,restore:native.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs};
const encode=session=>serializeSession(session.game,session,options);
const load=session=>readSession(encode(session),options);
function initial(game){
 return {game,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:observer=>native.replayDistilleryOperations(game,observer)}),historyRecord:initializeHistoryRecord(game),recallRecord:initializeRecall(game),userPaused:false,elapsed:0};
}
function advanceSidecars(session,game,recallRecord){
 return {...session,game,recallRecord,caskSlots:reconcileCaskSlots(game,session.caskSlots),recentLedger:advanceRecentLedger(session.game,game,session.recentLedger),historyRecord:advanceHistoryRecord(session.game,game,session.historyRecord)};
}
function observed(session){
 let pendingRecall=session.recallRecord,recallPreview=null,transitions=0;
 // Same connection as shop-app: the callback deliberately captures the loaded
 // session's current recall, so running a creator through it is observable.
 const D=createObservedModel(native,({before,after,operation})=>{
  if(!pendingRecall)return;
  const prepared=operation.key==='generation-handover'?(recallPreview??prepareRecall(pendingRecall,before,before.operations.length)):undefined;
  pendingRecall=advanceRecall(before,after,pendingRecall,{prepared});
  recallPreview=null;transitions++;
 });
 return {D,get pending(){return pendingRecall;},get transitions(){return transitions;},install(next){pendingRecall=next.recallRecord;recallPreview=null;}};
}
function progressed(kind){
 let session=createFreshSession(native,42);
 const live=observed(session),step=fn=>{session=advanceSidecars(session,fn(session.game),live.pending);};
 // Function arguments are evaluated before live.pending is read in the helper.
 if(kind!=='short')for(let i=0;i<(kind==='progressed'?8:372);i++)step(live.D.tickDistillery);
 if(kind==='completed'){
  assert.equal(session.game.generations.active.phase,'review');
  step(game=>live.D.handoverGeneration(game,game.generations.active.id));
  assert.equal(session.recallRecord.completed.length,1);
 }
 return load(session);
}

for(const kind of ['short','progressed','completed'])test(`loaded ${kind} game: the old observed creator reproduces the failure before candidate serialization`,()=>{
 const session=progressed(kind),live=observed(session),oldGame=JSON.stringify(session),oldRecall=JSON.stringify(live.pending);
 assert.throws(()=>live.D.enableWorldNetwork(live.D.newRegionalDeliveryDistillery(42)),/Recall operation boundary mismatch/);
 assert.equal(JSON.stringify(session),oldGame);
 assert.equal(JSON.stringify(live.pending),oldRecall);
 assert.equal(live.transitions,0);
});

test('same-seed prior regional game exposes silent observer contamination in the old creation route',()=>{
 const session=load(initial(native.newRegionalDeliveryDistillery(42))),live=observed(session),old=JSON.stringify(live.pending);
 assert.equal(session.game.operations.length,31);
 const candidate=live.D.enableWorldNetwork(live.D.newRegionalDeliveryDistillery(42));
 assert.equal(candidate.operations.length,32);
 assert.notEqual(JSON.stringify(live.pending),old);
 assert.throws(()=>assertRecall(session.game,live.pending),/Recall operation boundary mismatch/);
});

for(const kind of ['short','progressed','completed'])test(`independent fresh session leaves loaded ${kind} game and recall intact on success and validation failure`,()=>{
 const loaded=progressed(kind),live=observed(loaded),old=JSON.stringify(loaded),oldRecall=JSON.stringify(live.pending);
 for(const seed of [loaded.game.seed,loaded.game.seed+1]){
  const candidate=createFreshSession(native,seed);
  assert.deepEqual(load(candidate),candidate);
  assert.equal(candidate.recallRecord.completed.length,0);
  assert.deepEqual(candidate.historyRecord.events.map(event=>event.kind),['generation-start']);
  assert.equal(candidate.historyRecord.generations.length,1);
  assert.deepEqual(candidate.caskSlots,[null,null,null,null]);
  assert.equal(candidate.userPaused,false);assert.equal(candidate.elapsed,0);
  const invalid={...candidate,recallRecord:{...candidate.recallRecord,observer:{...candidate.recallRecord.observer,index:-1}}};
  assert.throws(()=>encode(invalid),/Recall operation boundary mismatch/);
  assert.equal(JSON.stringify(loaded),old);
  assert.equal(JSON.stringify(live.pending),oldRecall);
  assert.equal(live.transitions,0);
 }
 // A candidate that was never adopted does not disturb the old game's next op.
 const resumed=advanceSidecars(loaded,live.D.tickDistillery(loaded.game),live.pending);
 assert.deepEqual(load(resumed),resumed);
 assert.equal(JSON.stringify(loaded),old);
});

test('after adoption only the new game first operation enters the fresh recall, even for the same seed',()=>{
 const old=progressed('completed'),oldRaw=encode(old),live=observed(old);
 let next=createFreshSession(native,old.game.seed);
 live.install(next);
 const before=next.game,after=live.D.startRangeDistillation(before);
 next=advanceSidecars(next,after,live.pending);
 assert.equal(after.operations.at(-1).key,'start');
 assert.equal(live.transitions,1);
 assert.equal(next.recallRecord.observer.index,after.operations.length-1);
 assert.equal(next.recallRecord.completed.length,0);
 assert.equal(next.game.generations.active.id,1);
 assertRecall(after,next.recallRecord,next.historyRecord);
 assert.deepEqual(load(next),next);
 assert.equal(encode(old),oldRaw);
});

test('live world-network enabling still uses normal recall observation for an existing regional game',()=>{
 let current=load(initial(native.newRegionalDeliveryDistillery(42)));
 const live=observed(current),before=current.game;
 const after=live.D.enableWorldNetwork(before);
 current=advanceSidecars(current,after,live.pending);
 assert.equal(live.transitions,1);
 assert.equal(current.game.operations.length,before.operations.length+1);
 assert.equal(current.game.operations.at(-1).key,'enable-world-network');
 assertRecall(current.game,current.recallRecord,current.historyRecord);
 assert.deepEqual(load(current),current);
});
