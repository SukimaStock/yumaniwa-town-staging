import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {initializeRecall,advanceRecall} from '../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord,historyRecordView} from '../history-record.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../recent-ledger.mjs';
import {readSession,serializeSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
function fresh(){const game=D.newMarketRulesDistillery(141);return {game,userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:o=>D.replayDistilleryOperations(game,o)}),recallRecord:initializeRecall(game),historyRecord:initializeHistoryRecord(game)};}
function next(s,fn){const game=fn(s.game);return {...s,game,caskSlots:reconcileCaskSlots(game,s.caskSlots),recentLedger:advanceRecentLedger(s.game,game,s.recentLedger),recallRecord:advanceRecall(s.game,game,s.recallRecord),historyRecord:advanceHistoryRecord(s.game,game,s.historyRecord)};}
const encode=s=>serializeSession(s.game,s,options);
test('v8 never supplies missing history or converts a v7 save',()=>{
 const session=fresh(),raw=JSON.parse(encode(session));assert.equal(raw.version,8);
 for(const value of [undefined,null,{},[],session.recentLedger]){const input={...raw,historyRecord:value};assert.throws(()=>readSession(JSON.stringify(input),options));}
 const previous={...raw,version:7};delete previous.historyRecord;let restores=0;
 assert.throws(()=>readSession(JSON.stringify(previous),{...options,restore:()=>{restores++;}}),e=>e.code==='unsupported-version');assert.equal(restores,0);
});
test('history is part of the same candidate and stale history cannot accompany a later game',()=>{
 const before=fresh(),after=next(before,D.tickDistillery),initial=encode(before),candidate=encode(after);
 assert.throws(()=>encode({...after,historyRecord:before.historyRecord}));
 const values=new Map([[FORMAL_SAVE_KEY,initial],['unrelated','keep']]);const storage={getItem:key=>values.get(key)??null,setItem:()=>{throw Object.assign(Error('full'),{name:'QuotaExceededError'});}};
 assert.throws(()=>writeCandidate(storage,FORMAL_SAVE_KEY,initial,candidate),{name:'QuotaExceededError'});assert.equal(values.get(FORMAL_SAVE_KEY),initial);assert.deepEqual(readSession(initial,options),before);
 storage.setItem=(key,text)=>values.set(key,text);writeCandidate(storage,FORMAL_SAVE_KEY,initial,candidate);assert.deepEqual(readSession(values.get(FORMAL_SAVE_KEY),options),after);assert.equal(values.get('unrelated'),'keep');
 values.set(FORMAL_SAVE_KEY,'another tab');assert.throws(()=>writeCandidate(storage,FORMAL_SAVE_KEY,candidate,initial),e=>e.code==='conflict');assert.equal(values.get(FORMAL_SAVE_KEY),'another tab');
});
test('first distillation and each release survive readback without duplicate facts or game changes',()=>{
 let state=fresh(),reference=state.game;
 const step=fn=>{reference=fn(reference);state=next(state,fn);const text=encode(state);state=readSession(text,options);assert.deepEqual(state.game,reference);assert.equal(encode(state),text);};
 step(D.startRangeDistillation);while(state.game.still.distillation.progress<24)step(D.distillStep);step(D.beginCollection);while(state.game.still.distillation.progress<36)step(D.distillStep);step(D.stopDistillation);step(s=>D.fillBarrel(s,'bourbon'));
 const id=state.game.core.casks[0].id;step(s=>D.bottleBranded(s,id,{},1));step(s=>D.bottleBranded(s,id,{},D.quote(s,id).count));
 const events=historyRecordView(state.game,state.historyRecord).events,ids=events.map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
 assert.equal(events.filter(e=>e.kind==='distillation').length,1);assert.equal(events.filter(e=>e.kind==='bottling').length,state.game.releases.length);
 const snapshot=structuredClone(state);for(let i=0;i<3;i++)state=readSession(encode(state),options);assert.deepEqual(state,snapshot);
});
