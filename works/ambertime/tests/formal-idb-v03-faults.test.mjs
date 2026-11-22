// Independent v0.3 fault scenarios. Transaction simulation, NOT browser verification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {bootMainIdb,MAIN_IDB_NAME,LEGACY_SAVE_KEYS} from '../formal-idb-main.mjs';
import {readMainRecord,writeMainRecord} from '../formal-idb-storage.mjs';
import {FORMAL_SAVE_KEY} from '../development-save.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const clone=value=>structuredClone(value);
// This mock serializes transactions, snapshots at activation, rolls back aborts,
// and distinguishes request success from transaction completion. It is not a
// substitute for native browser transaction / OS durability verification.
function factory(){
 const f={beforeWrite:null,failPutAt:0,putCount:0,records:new Map(),opened:[],writes:0,rejectWrites:false,abortNext:false,afterCommit:null,readFailure:false,hold:null};
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
    put(value,key){f.putCount++;if(f.failPutAt===f.putCount)throw Error('injected partial write');if(mode!=='readwrite')throw Error('readonly');if(f.rejectWrites)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});return request(()=>{snapshot.set(key,clone(value));return key;});},
    add(value,key){if(mode!=='readwrite')throw Error('readonly');if(f.rejectWrites)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});return request(()=>{if(snapshot.has(key))throw Object.assign(Error('exists'),{name:'ConstraintError'});snapshot.set(key,clone(value));return key;});}
   };
   tx.objectStore=storeName=>{assert.equal(storeName,'records');return store;};
   queue.push(()=>{if(mode==='readwrite'&&f.beforeWrite){const hook=f.beforeWrite;f.beforeWrite=null;hook(f.records);}snapshot=clone(f.records);started=true;for(const run of waiting)run();waiting=[];complete();});queueMicrotask(drain);
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
const simple=month=>JSON.stringify({version:8,game:{core:{month}},userPaused:true});
const one=simple(97),two=simple(154),three=simple(155);
const reader=text=>{const session=JSON.parse(text);if(session.version!==8)throw Object.assign(Error('unsupported'),{code:'unsupported-version'});if(JSON.stringify(session)!==text)throw Object.assign(Error('noncanonical'),{code:'invalid-session'});return session;};
const options={reader,cryptoApi:webcrypto};
const boot=(f,storage,extra={})=>bootMainIdb({indexedDBApi:f.api,storage,...options,...extra});
const entries=f=>clone([...f.records]);


test('v03 bounded replacements retain immutable origin and exactly current/previous',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);
 assert.equal(b.ok,true);const origin=clone(f.records.get('origin'));
 let prior=one;
 for(let i=0;i<24;i++){
  const next=simple(200+i);
  const receipt=i%3===0?await b.adapter.startNew(next):i%3===1?await b.adapter.importRecord(next):await b.adapter.saveCandidate(next,{reason:'market-rules'});
  assert.equal(receipt.ok,true);assert.equal(f.records.get('previous').text,prior);
  assert.deepEqual([...f.records.keys()].sort(),['head','metadata','origin','previous']);
  assert.deepEqual(f.records.get('origin'),origin);assert.equal(s.getItem(FORMAL_SAVE_KEY),one);prior=next;
 }
 assert.equal((await boot(f,s)).text,prior);
});
test('v03 old-schema main database is rejected intact, never replaced from legacy',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one});
 f.records.set('head',{schema:'ambertime-main-v8-idb/1',revision:17,text:two,sha256:'0'.repeat(64)});
 const before=entries(f),b=await boot(f,s);
 assert.equal(b.ok,false);assert.equal(b.adapter,null);assert.deepEqual(entries(f),before);assert.equal(f.writes,0);
});
test('v03 stored falsy previous is not treated as absent at first revision',async()=>{
 for(const value of [null,undefined,false,0,'']){
  const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one});await boot(f,s);
  f.records.set('previous',value);const before=entries(f);
  const cold=await boot(f,s);assert.equal(cold.ok,false);assert.deepEqual(entries(f),before);
 }
});
test('v03 corrupt head or previous is retained and never automatically rolled back',async()=>{
 for(const target of ['head','previous']){
  const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);await b.adapter.saveCandidate(two);
  f.records.set(target,{...f.records.get(target),sha256:'f'.repeat(64)});const before=entries(f);
  const cold=await boot(f,s);assert.equal(cold.ok,false);assert.equal(cold.session,null);
  await assert.rejects(b.adapter.saveCandidate(three));assert.deepEqual(entries(f),before);
 }
});
test('v03 partial queued puts abort all generations and metadata atomically',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);await b.adapter.saveCandidate(two);
 const before=entries(f);f.failPutAt=f.putCount+2;
 await assert.rejects(b.adapter.saveCandidate(three),/injected partial write/);
 assert.deepEqual(entries(f),before);assert.equal(b.adapter.status.state,'halted');
 assert.equal((await boot(f,s)).text,two);
});
test('v03 readback exception halts publication, preserves previous, and cold reads committed head',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);
 f.afterCommit=()=>{f.readFailure=true;};
 await assert.rejects(b.adapter.saveCandidate(two));
 assert.equal(b.adapter.status.state,'halted');assert.equal(b.adapter.text,one);
 assert.equal(f.records.get('head').text,two);assert.equal(f.records.get('previous').text,one);
 const writes=f.writes;await assert.rejects(b.adapter.saveCandidate(three));assert.equal(f.writes,writes);
 f.readFailure=false;f.afterCommit=null;const cold=await boot(f,s);assert.equal(cold.ok,true);assert.equal(cold.text,two);
});
test('v03 competing valid tab wins, stale writer cannot rotate either generation',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),a=await boot(f,s),b=await boot(f,s);
 await a.adapter.saveCandidate(two);const before=entries(f);
 await assert.rejects(b.adapter.saveCandidate(three),e=>e.code==='conflict');
 assert.deepEqual(entries(f),before);assert.equal(b.adapter.text,one);assert.equal(b.adapter.status.state,'halted');
});
test('v03 equal-revision envelope mutation between validation and transaction fails CAS',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);let altered;
 f.beforeWrite=records=>{records.set('head',{...records.get('head'),sha256:'e'.repeat(64)});altered=clone([...records]);};
 await assert.rejects(b.adapter.saveCandidate(two),e=>e.code==='conflict');
 assert.deepEqual(entries(f),altered);assert.equal(f.writes,1);
});
test('v03 pending input is rejected, invalidation prevents late successful receipt publication',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s),hold=f.holdCommit();
 const save=b.adapter.saveCandidate(two);await hold.entered.promise;
 await assert.rejects(b.adapter.saveCandidate(three),e=>e.code==='pending-save');
 b.adapter.invalidate();hold.release();await assert.rejects(save);
 assert.equal(b.adapter.text,one);assert.equal(b.adapter.status.state,'halted');
 assert.equal(f.records.get('previous').text,one);
});
test('v03 successful transaction but corrupt readback never publishes or repairs silently',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);
 f.afterCommit=()=>f.records.set('head',{...f.records.get('head'),text:'{broken'});
 await assert.rejects(b.adapter.saveCandidate(two));assert.equal(b.adapter.text,one);
 assert.equal(f.records.get('previous').text,one);const before=entries(f);
 assert.equal((await boot(f,s)).ok,false);assert.deepEqual(entries(f),before);
});
test('v03 abort during initial migration leaves no partial origin or authoritative head',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one});f.abortNext=true;
 const b=await boot(f,s);assert.equal(b.ok,false);assert.equal(f.records.size,0);assert.equal(s.getItem(FORMAL_SAVE_KEY),one);
 const cold=await boot(f,s);assert.equal(cold.ok,true);assert.equal(cold.text,one);
});
test('v03 source mutation after commit is uncertainty, not successful migration',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one});f.afterCommit=()=>s.data.set(FORMAL_SAVE_KEY,two);
 const b=await boot(f,s);assert.equal(b.ok,false);assert.equal(s.getItem(FORMAL_SAVE_KEY),two);
 assert.equal(f.records.get('head').text,one);assert.equal(f.records.get('origin').sources[0].text,one);
 const before=entries(f);assert.equal((await boot(f,s)).ok,false);assert.deepEqual(entries(f),before);
});
