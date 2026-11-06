import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {initializeHistoryRecord,advanceHistoryRecord,assertHistoryRecord} from '../history-record.mjs';
import {migrateRecentLedger,advanceRecentLedger,assertRecentLedger} from '../recent-ledger.mjs';
import {encodeEnvelope,decodeEnvelope,createMemoryStore,createAtomicSession} from './atomic.mjs';

const key='research:h3-2:atomic-test';
function initial(){
 const game=D.newMarketRulesDistillery(42);
 return {game,clock:{elapsed:0,userPaused:false},recentLedger:migrateRecentLedger(game,{replay:cb=>D.replayDistilleryOperations(game,cb)}),historyRecord:initializeHistoryRecord(game),collector:{version:1,month:0,operationCount:game.operations.length,candidates:[],recalls:[]}};
}
function validate(value){
 assertHistoryRecord(value.game,value.historyRecord);assertRecentLedger(value.game,value.recentLedger);
 assert.equal(value.collector.month,value.game.core.month);
 assert.equal(value.collector.operationCount,value.game.operations.length);
 assert.ok(Number.isInteger(value.clock.elapsed)&&value.clock.elapsed>=0);
 const ids=value.collector.candidates.map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
}
function nextMonth(value){
 const before=value.game,after=D.tickDistillery(before);
 value.game=after;value.recentLedger=advanceRecentLedger(before,after,value.recentLedger);
 value.historyRecord=advanceHistoryRecord(before,after,value.historyRecord);
 value.collector.month=after.core.month;value.collector.operationCount=after.operations.length;
 value.clock.elapsed=0;return value;
}
function setup(){const storage=createMemoryStore();return {storage,session:createAtomicSession(storage,key,{initial:initial(),validate})};}
const errorCode=code=>error=>error.code===code;

test('one envelope resumes actual formal month with clock, ledger, history, collector and RNG unchanged',()=>{
 const {storage,session}=setup(),before=session.snapshot();
 const expected=D.tickDistillery(before.game);
 session.transact(nextMonth);
 const restored=createAtomicSession(storage,key,{validate});
 assert.deepEqual(restored.snapshot(),session.snapshot());
 assert.deepEqual(restored.snapshot().game,expected);
 assert.equal(restored.snapshot().game.core.month,1);
 assert.equal(decodeEnvelope(restored.text(),{validate}).revision,1);
 restored.transact(nextMonth);assert.equal(restored.snapshot().game.core.month,2);
 assert.deepEqual(JSON.parse(JSON.stringify(restored.snapshot())),restored.snapshot());
});

test('candidate preparation and preview do not advance committed state or durable data',()=>{
 const {storage,session}=setup(),old=session.text();
 const prepared=session.prepare(value=>{value.collector.preview={generation:1,scenes:[]};return value;});
 assert.equal(storage.read(),old);assert.equal(session.text(),old);
 assert.equal(session.snapshot().game.generations.active.id,1);
 assert.equal(session.snapshot().collector.preview,undefined);
 assert.deepEqual(prepared.value.collector.preview,{generation:1,scenes:[]});
 assert.throws(()=>{session.snapshot().game.core.month=99;},TypeError);
 assert.throws(()=>{prepared.value.collector.preview.generation=2;},TypeError);
});

for(const stage of ['quota','write','readback'])test(`${stage}: all components rollback; same candidate can be retried and reopened`,()=>{
 const {storage,session}=setup(),old=session.text(),before=session.snapshot(),prepared=session.prepare(nextMonth);
 storage.inject(stage);assert.throws(()=>session.commit(prepared),errorCode(stage));
 assert.equal(session.text(),old);assert.equal(storage.read(),old);assert.deepEqual(session.snapshot(),before);
 const reopened=createAtomicSession(storage,key,{validate});assert.deepEqual(reopened.snapshot(),before);
 session.commit(prepared);assert.equal(session.snapshot().game.core.month,1);
 assert.deepEqual(createAtomicSession(storage,key,{validate}).snapshot(),prepared.value);
});

test('candidate generation or encoder failure never writes a partial game or recall',()=>{
 const {storage,session}=setup(),old=session.text();
 assert.throws(()=>session.prepare(value=>{value.game.core.month++;value.collector.recalls.push({generation:1});throw Error('builder');}),/builder/);
 assert.equal(session.text(),old);assert.equal(storage.read(),old);
 const broken=createAtomicSession(storage,key,{validate,encode:()=>{throw Error('encode');}});
 assert.throws(()=>broken.prepare(nextMonth),/encode/);
 assert.equal(storage.read(),old);assert.deepEqual(broken.snapshot(),session.snapshot());
});

test('stale writers and stale preparations cannot overwrite newer complete envelopes',()=>{
 const {storage,session}=setup(),other=createAtomicSession(storage,key,{validate});
 const old=session.snapshot(),prepared=session.prepare(nextMonth);
 other.transact(nextMonth);other.transact(nextMonth);const remote=other.text();
 assert.throws(()=>session.commit(prepared),errorCode('conflict'));
 assert.deepEqual(session.snapshot(),old);assert.equal(storage.read(),remote);
 session.reload();assert.equal(session.snapshot().game.core.month,2);
 assert.throws(()=>session.commit(prepared),errorCode('conflict'));
 session.transact(nextMonth);assert.equal(session.snapshot().game.core.month,3);
});

test('candidate data must belong to the session and cannot be committed twice',()=>{
 const {session}=setup(),prepared=session.prepare(nextMonth);
 assert.throws(()=>session.commit({...prepared}),errorCode('invalid-candidate'));
 session.commit(prepared);
 assert.throws(()=>session.commit(prepared),errorCode('invalid-candidate'));
});

test('schema, malformed data, checksum mismatch and mismatched game/collector are rejected',()=>{
 const {storage,session}=setup(),saved=session.text(),original=session.snapshot();
 assert.throws(()=>decodeEnvelope('{'),errorCode('invalid-envelope'));
 const parsed=JSON.parse(saved);parsed.schema='other';assert.throws(()=>decodeEnvelope(JSON.stringify(parsed)),errorCode('unsupported-version'));
 parsed.schema='ambertime-h3-2-research-envelope/1';parsed.payload.game.core.month++;
 assert.throws(()=>decodeEnvelope(JSON.stringify(parsed)),errorCode('corrupt'));
 assert.throws(()=>encodeEnvelope(parsed.payload,{validate}));
 const damage=JSON.stringify(parsed);storage.compareExchange(saved,damage);
 assert.throws(()=>session.reload());assert.deepEqual(session.snapshot(),original);
 assert.throws(()=>createAtomicSession(storage,key,{validate}));
});

test('JSON losses and duplicate candidates fail before persistence',()=>{
 const {storage,session}=setup(),saved=session.text();
 for(const bad of [undefined,NaN,Infinity,()=>{},BigInt(1)]){
  assert.throws(()=>session.prepare(value=>{value.collector.invalid=bad;return value;}),errorCode('invalid-json'));
  assert.equal(storage.read(),saved);
 }
 assert.throws(()=>session.prepare(value=>{value.collector.candidates=[{id:'same'},{id:'same'}];return value;}));
 assert.equal(storage.read(),saved);
});

test('synthetic handover transition atomically commits game and frozen recall, or neither',()=>{
 // This tests the transaction boundary, not the formal generation rules.
 // Full recorded handovers and C selection are exercised by the replay harness.
 const value=initial();value.game.generations.active.phase='review';
 const storage=createMemoryStore(),session=createAtomicSession(storage,key,{initial:value});
 const before=session.text(),preview={generation:1,boundary:{month:0,opIndex:value.game.operations.length},seed:42,version:'test',scenes:[{eventId:'test:1',sentence:'事実を保存する。'}]};
 const prepared=session.prepare(v=>{v.game.generations.active.id=2;v.collector.recalls.push(preview);v.collector.candidates=[];return v;});
 assert.equal(session.snapshot().game.generations.active.id,1);assert.equal(session.snapshot().collector.recalls.length,0);
 storage.inject('quota');assert.throws(()=>session.commit(prepared),errorCode('quota'));
 assert.equal(storage.read(),before);
 session.commit(prepared);const reopened=createAtomicSession(storage,key,{});
 assert.equal(reopened.snapshot().game.generations.active.id,2);assert.deepEqual(reopened.snapshot().collector.recalls,[preview]);
 reopened.transact(v=>{v.collector.candidates.push({id:'future:1'});return v;});
 assert.deepEqual(reopened.snapshot().collector.recalls,[preview]);
});
