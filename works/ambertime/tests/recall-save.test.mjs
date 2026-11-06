import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {initializeRecall,advanceRecall} from '../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../recent-ledger.mjs';
import {readSession,serializeSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
function fresh(){const game=D.newMarketRulesDistillery(141);return {game,userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:o=>D.replayDistilleryOperations(game,o)}),historyRecord:initializeHistoryRecord(game),recallRecord:initializeRecall(game)};}
function next(s,fn){const game=fn(s.game);return {...s,game,caskSlots:reconcileCaskSlots(game,s.caskSlots),recentLedger:advanceRecentLedger(s.game,game,s.recentLedger),historyRecord:advanceHistoryRecord(s.game,game,s.historyRecord),recallRecord:advanceRecall(s.game,game,s.recallRecord)};}
const encode=s=>serializeSession(s.game,s,options);
function storage(text){let value=text;return {getItem:()=>value,setItem:(_,text)=>{value=text;},value:()=>value};}
test('v8 requires the recall record and rejects v7 before running the official reader',()=>{
 const before=fresh(),text=encode(before),raw=JSON.parse(text);assert.equal(raw.version,8);
 for(const recallRecord of [undefined,null,{},[],before.historyRecord])assert.throws(()=>readSession(JSON.stringify({...raw,recallRecord}),options));
 let restored=0;assert.throws(()=>readSession(JSON.stringify({...raw,version:7}),{...options,restore:()=>{restored++;}}),e=>e.code==='unsupported-version');assert.equal(restored,0);
 const after=next(before,D.tickDistillery);assert.throws(()=>encode({...after,recallRecord:before.recallRecord}));
 assert.deepEqual(readSession(encode(after),options),after);
});
test('a post-write read exception does not claim failure left persistent state unchanged',()=>{
 const committed=fresh(),candidate=next(committed,D.tickDistillery),old=encode(committed),text=encode(candidate),store=storage(old),get=store.getItem;let reads=0;
 store.getItem=()=>{if(++reads===2)throw Error('read denied');return get();};
 assert.throws(()=>writeCandidate(store,FORMAL_SAVE_KEY,old,text),/read denied/);
 assert.equal(store.value(),text);assert.equal(committed.game.core.month,0);assert.equal(committed.recallRecord.observer.index,committed.game.operations.length-1);
 store.getItem=get;
 // A stale in-memory retry cannot overwrite the possibly committed candidate.
 assert.throws(()=>writeCandidate(store,FORMAL_SAVE_KEY,old,old),e=>e.code==='conflict');
 assert.deepEqual(readSession(store.value(),options),candidate);
});
test('a changed readback rejects success and preserves the competing writer for recovery',()=>{
 const old=encode(fresh()),text=encode({...fresh(),userPaused:true}),store=storage(old),set=store.setItem;
 store.setItem=(key,value)=>{set(key,value);set(key,'competing record');};
 assert.throws(()=>writeCandidate(store,FORMAL_SAVE_KEY,old,text),e=>e.code==='readback');assert.equal(store.value(),'competing record');
 assert.throws(()=>writeCandidate(store,FORMAL_SAVE_KEY,old,text),e=>e.code==='conflict');
});
test('quota failure leaves the complete old session and retry commits the complete candidate',()=>{
 const committed=fresh(),candidate=next(committed,D.startRangeDistillation),old=encode(committed),text=encode(candidate),store=storage(old),set=store.setItem;
 store.setItem=()=>{throw Object.assign(Error('full'),{name:'QuotaExceededError'});};
 assert.throws(()=>writeCandidate(store,FORMAL_SAVE_KEY,old,text),{name:'QuotaExceededError'});assert.deepEqual(readSession(store.value(),options),committed);
 store.setItem=set;writeCandidate(store,FORMAL_SAVE_KEY,old,text);assert.deepEqual(readSession(store.value(),options),candidate);
});
