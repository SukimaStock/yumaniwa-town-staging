// Cross-product integration of actual official v8/v9 codec and bounded IDB adapter.
// Factory below is copied unchanged from formal-idb-main.test.mjs.
// Node transaction simulation only: not native IDB/browser/iPhone verification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {bootMainIdb,MAIN_IDB_NAME} from '../formal-idb-main.mjs';
import {readSession,serializeSession,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {createFreshSession} from '../session-entry.mjs';
import * as D from '../partner-orders.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {reconcileCaskSlots} from '../cask-slots.mjs';
import {advanceRecentLedger} from '../recent-ledger.mjs';
import {advanceHistoryRecord} from '../history-record.mjs';
import {advanceRecall} from '../recall/collector.mjs';
import {encodeExactJSON,decodeExactJSON} from '../lossless-json.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const clone=value=>structuredClone(value);
// This mock serializes transactions, snapshots at activation, rolls back aborts,
// and distinguishes request success from transaction completion. It is not a
// substitute for native browser transaction / OS durability verification.
function factory(){
 const f={records:new Map(),opened:[],writes:0,rejectWrites:false,abortNext:false,afterCommit:null,readFailure:false,hold:null};
 const queue=[];let running=false;
 function drain(){if(running||!queue.length)return;running=true;queue.shift()();}
 const db={objectStoreNames:{contains:name=>name==='records'},close(){},onversionchange:null,
  transaction(name,mode){
   assert.equal(name,'records');
   let active=true,started=false,finishing=false,pending=0,snapshot=null,waiting=[];
   const tx={error:null,oncomplete:null,onabort:null,onerror:null};
   const finish=()=>{active=false;running=false;queueMicrotask(drain);};
   tx.abort=()=>{if(!active)return;finish();queueMicrotask(()=>tx.onabort?.());};
   const complete=()=>queueMicrotask(()=>{
    if(!active||pending>0||finishing)return;finishing=true;
    const commit=()=>{
     if(!active)return;
     if(mode==='readwrite'&&f.abortNext){f.abortNext=false;tx.error=Object.assign(Error('transaction aborted'),{name:'AbortError'});tx.abort();return;}
     if(mode==='readwrite'){f.records=snapshot;f.writes++;f.afterCommit?.();}
     finish();tx.oncomplete?.();
    };
    if(mode==='readwrite'&&f.hold){const hold=f.hold;f.hold=null;hold.release=commit;hold.entered.resolve();return;}
    commit();
   });
   const request=fn=>{
    const req={result:undefined,error:null,onsuccess:null,onerror:null};pending++;
    const run=()=>queueMicrotask(()=>{
     if(!active)return;
     if(mode==='readonly'&&f.readFailure){tx.error=Error('readback unavailable');tx.abort();return;}
     try{req.result=clone(fn());pending--;req.onsuccess?.();complete();}
     catch(error){req.error=error;pending--;req.onerror?.();tx.error=error;tx.abort();}
    });
    if(started)run();else waiting.push(run);
    return req;
   };
   const store={
    get:key=>request(()=>snapshot.get(key)),
    getAll:()=>request(()=>[...snapshot.keys()].sort().map(key=>snapshot.get(key))),
    getAllKeys:()=>request(()=>[...snapshot.keys()].sort()),
    put(value,key){if(mode!=='readwrite')throw Error('readonly');if(f.rejectWrites)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});return request(()=>{snapshot.set(key,clone(value));return key;});},
    add(value,key){if(mode!=='readwrite')throw Error('readonly');if(f.rejectWrites)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});return request(()=>{if(snapshot.has(key))throw Object.assign(Error('exists'),{name:'ConstraintError'});snapshot.set(key,clone(value));return key;});}
   };
   tx.objectStore=storeName=>{assert.equal(storeName,'records');return store;};
   queue.push(()=>{snapshot=clone(f.records);started=true;for(const run of waiting)run();waiting=[];complete();});queueMicrotask(drain);
   return tx;
  }};
 f.db=db;
 f.api={open(name,version){assert.equal(name,MAIN_IDB_NAME);assert.equal(version,1);f.opened.push(name);const req={result:db,error:null};queueMicrotask(()=>req.onsuccess?.());return req;}};
 f.holdCommit=()=>{const hold={entered:deferred(),release:null};f.hold=hold;return hold;};
 return f;
}
function legacy(values={}){
 const data=new Map(Object.entries(values));
 return {data,getItem:key=>data.get(key)??null,setItem(){throw Error('old saves must never be written');},removeItem(){throw Error('old saves must never be removed');}};
}

const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const reader=text=>readSession(text,options);
const encode8=s=>serializeSession(s.game,s,options);
const encode9=s=>serializeSession(s.game,s,{...options,encoding:'lossless-v1'});
const boot=(f,storage)=>bootMainIdb({indexedDBApi:f.api,storage,reader,cryptoApi:webcrypto});
const entries=f=>clone([...f.records]);
function advance(s){const game=D.tickDistillery(s.game);return {...s,game,caskSlots:reconcileCaskSlots(game,s.caskSlots),recentLedger:advanceRecentLedger(s.game,game,s.recentLedger),historyRecord:advanceHistoryRecord(s.game,game,s.historyRecord),recallRecord:advanceRecall(s.game,game,s.recallRecord)};}
function fixture(){let old=createFreshSession(D,1203);for(let i=0;i<3;i++)old=advance(old);old={...old,userPaused:true,elapsed:200};const next=advance(old);return {old,next,raw8:encode8(old),raw9:encode9(next)};}
async function migrated(){const data=fixture(),f=factory(),s=legacy({[FORMAL_SAVE_KEY]:data.raw8}),b=await boot(f,s);assert.equal(b.ok,true);return {...data,f,s,b};}

test('official v8 migration then v9 commit/cold restore retain exact source and every sidecar',async()=>{
 const {f,s,b,old,next,raw8,raw9}=await migrated();
 assert.equal(JSON.parse(raw8).version,8);assert.equal(JSON.parse(raw9).version,9);
 assert.deepEqual(b.session,old);assert.equal(b.text,raw8);
 const receipt=await b.adapter.saveCandidate(raw9);assert.deepEqual(receipt.session,next);
 assert.equal(f.records.get('previous').text,raw8);assert.equal(f.records.get('origin').sources[0].text,raw8);assert.equal(s.getItem(FORMAL_SAVE_KEY),raw8);
 b.adapter.close();const cold=await boot(f,s);assert.equal(cold.ok,true);assert.equal(cold.text,raw9);assert.deepEqual(cold.session,next);
 const after=advance(cold.session),resave=encode9(after);await cold.adapter.saveCandidate(resave);
 const twice=await boot(f,s);assert.deepEqual(twice.session,after);assert.equal(f.records.get('previous').text,raw9);
 assert.equal(s.getItem(FORMAL_SAVE_KEY),raw8);
});
test('official v9 new-game replacements keep one previous and immutable v8 origin, not archives',async()=>{
 const {f,s,b,raw8}=await migrated();const origin=clone(f.records.get('origin'));let prior=raw8;
 for(let seed=2200;seed<2204;seed++){
  const replacement=createFreshSession(D,seed),text=encode9(replacement);await b.adapter.startNew(text);
  assert.equal(f.records.get('previous').text,prior);assert.deepEqual([...f.records.keys()].sort(),['head','metadata','origin','previous']);
  assert.deepEqual(f.records.get('origin'),origin);assert.equal(s.getItem(FORMAL_SAVE_KEY),raw8);
  assert.deepEqual((await boot(f,s)).session,replacement);prior=text;
 }
});
test('v9 write cannot overwrite a changed legacy source or a newer independent v9 writer',async()=>{
 const a=await migrated();a.s.data.set(FORMAL_SAVE_KEY,encode8(a.next));const before=entries(a.f);
 await assert.rejects(a.b.adapter.saveCandidate(a.raw9),e=>e.code==='legacy-conflict');assert.deepEqual(entries(a.f),before);
 const x=await migrated(),other=await boot(x.f,x.s);await other.adapter.saveCandidate(x.raw9);const updated=entries(x.f);
 await assert.rejects(x.b.adapter.saveCandidate(encode9(advance(x.next))),e=>e.code==='conflict');assert.deepEqual(entries(x.f),updated);assert.equal(x.f.records.get('previous').text,x.raw8);
});
test('semantically invalid v9 with valid lossless encoding cannot replace a good generation',async()=>{
 const {f,s,b,raw8,raw9}=await migrated();
 const outer=JSON.parse(raw9),logical=JSON.parse(decodeExactJSON(JSON.stringify(outer.data),'session'));
 logical.elapsed=-1;outer.data=JSON.parse(encodeExactJSON(JSON.stringify(logical),'session'));const corrupt=JSON.stringify(outer),before=entries(f);
 assert.throws(()=>reader(corrupt));await assert.rejects(b.adapter.saveCandidate(corrupt));assert.deepEqual(entries(f),before);
 assert.equal((await boot(f,s)).text,raw8);
});
test('v9 quota and transaction abort preserve exact normal v8/current/metadata/origin',async()=>{
 for(const mode of ['rejectWrites','abortNext']){
  const {f,s,b,raw8,raw9}=await migrated(),before=entries(f);f[mode]=true;
  await assert.rejects(b.adapter.saveCandidate(raw9));assert.deepEqual(entries(f),before);assert.equal(b.adapter.text,raw8);assert.equal(b.adapter.status.state,'halted');
  f.rejectWrites=false;assert.equal((await boot(f,s)).text,raw8);
 }
});
test('postcommit v9 readback exception retains good v8 previous, halts memory, cold restores exact v9',async()=>{
 const {f,s,b,next,raw8,raw9}=await migrated();f.afterCommit=()=>{f.readFailure=true;};
 await assert.rejects(b.adapter.saveCandidate(raw9));assert.equal(b.adapter.status.state,'halted');assert.equal(b.adapter.text,raw8);
 assert.equal(f.records.get('previous').text,raw8);assert.equal(f.records.get('head').text,raw9);assert.equal(s.getItem(FORMAL_SAVE_KEY),raw8);
 const writes=f.writes;await assert.rejects(b.adapter.saveCandidate(raw9));assert.equal(f.writes,writes);
 f.readFailure=false;f.afterCommit=null;const cold=await boot(f,s);assert.equal(cold.ok,true);assert.deepEqual(cold.session,next);
});
test('corrupted committed v9 head is never adopted or automatically replaced by previous v8',async()=>{
 const {f,s,b,raw8,raw9}=await migrated();await b.adapter.saveCandidate(raw9);
 f.records.set('head',{...f.records.get('head'),text:raw9.slice(0,-1)});const before=entries(f);
 const cold=await boot(f,s);assert.equal(cold.ok,false);assert.equal(cold.session,null);assert.deepEqual(entries(f),before);assert.equal(f.records.get('previous').text,raw8);
});
