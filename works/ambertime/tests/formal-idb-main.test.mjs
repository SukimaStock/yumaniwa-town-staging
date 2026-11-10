import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import fs from 'node:fs';
import {bootMainIdb,MAIN_IDB_NAME,LEGACY_SAVE_KEYS} from '../formal-idb-main.mjs';
import {readMainRecord,writeMainRecord,STAGING_IDB_NAME} from '../formal-idb-storage.mjs';
import {readSession,serializeSession,FORMAL_SAVE_KEY} from '../development-save.mjs';
import * as D from '../partner-orders.mjs';
import {initializeRecall,advanceRecall} from '../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../recent-ledger.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';

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
const simple=month=>JSON.stringify({version:8,game:{core:{month}},userPaused:true});
const one=simple(97),two=simple(154),three=simple(155);
const reader=text=>{const session=JSON.parse(text);if(session.version!==8)throw Object.assign(Error('unsupported'),{code:'unsupported-version'});if(JSON.stringify(session)!==text)throw Object.assign(Error('noncanonical'),{code:'invalid-session'});return session;};
const options={reader,cryptoApi:webcrypto};
const boot=(f,storage,extra={})=>bootMainIdb({indexedDBApi:f.api,storage,...options,...extra});
const entries=f=>clone([...f.records]);

test('main DB is separate and empty boot requires an explicit initial durable write',async()=>{
 assert.notEqual(MAIN_IDB_NAME,STAGING_IDB_NAME);
 const f=factory(),s=legacy(),b=await boot(f,s);
 assert.equal(b.ok,true);assert.equal(b.state,'empty');assert.equal(f.records.size,0);
 const r=await b.adapter.startNew(one);
 assert.equal(r.ok,true);assert.equal(r.revision,1);assert.equal(r.text,one);
 const cold=await boot(f,s);assert.equal(cold.reason,'idb');assert.equal(cold.text,one);
 assert.equal(f.records.get('backup:1:new-start').candidate.text,one);
 assert.deepEqual(s.data,new Map());
});
test('valid legacy migration preserves exact source and archival old keys across reload',async()=>{
 const s=legacy({[FORMAL_SAVE_KEY]:two,[LEGACY_SAVE_KEYS[1]]:'trial original',[LEGACY_SAVE_KEYS[2]]:'wholesale original'}),before=clone(s.data),f=factory();
 const b=await boot(f,s);assert.equal(b.reason,'migrated');assert.equal(b.text,two);assert.equal(b.revision,1);
 assert.deepEqual(s.data,before);assert.equal(f.records.get('backup:1:migration').candidate.text,two);
 assert.deepEqual(f.records.get('origin').sources,LEGACY_SAVE_KEYS.map(key=>({key,text:s.getItem(key)})));
 await b.adapter.saveCandidate(three,{expectedRevision:1});
 assert.equal(f.records.get('previous').text,two);assert.equal(f.records.get('backup:1:migration').candidate.text,two);
 assert.equal((await boot(f,s)).text,three);assert.deepEqual(s.data,before);
});
test('malformed, older and noncanonical original records need explicit replacement and remain exact',async()=>{
 for(const raw of ['{broken','',JSON.stringify({version:7}),'{"version":8, "game":{}}']){
  const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:raw}),b=await boot(f,s);
  assert.equal(b.state,'recovery');
  assert(b.adapter);
  assert.equal(f.records.size,0);assert.equal(b.legacyRecord.raw,raw);
  const r=await b.adapter.importRecord(two);assert.equal(r.ok,true);
  assert.equal(s.getItem(FORMAL_SAVE_KEY),raw);assert.equal(f.records.get('origin').sources[0].text,raw);
  assert.equal((await boot(f,s)).text,two);
 }
 const f=factory(),s=legacy({[LEGACY_SAVE_KEYS[1]]:'old trial'}),b=await boot(f,s);
 assert.equal(b.reason,'unsupported-version');await b.adapter.startNew(one);
 assert.equal(s.getItem(LEGACY_SAVE_KEYS[1]),'old trial');assert.equal((await boot(f,s)).text,one);
});
test('explicit import, new start and market rules retain immutable originals through later saves',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);
 await b.adapter.importRecord(two);await b.adapter.saveCandidate(three,{reason:'market-rules'});await b.adapter.startNew(one);
 const backups=entries(f).filter(([key])=>key.startsWith('backup:'));
 for(let i=0;i<3;i++)await b.adapter.saveCandidate(two);
 assert.deepEqual(entries(f).filter(([key])=>key.startsWith('backup:')),backups);
 assert.equal(f.records.get('backup:2:import').displaced.text,one);
 assert.equal(f.records.get('backup:2:import').candidate.text,two);
 assert.equal(f.records.get('backup:3:market-rules').displaced.text,two);
 assert.equal(f.records.get('backup:4:new-start').displaced.text,three);
 assert.equal((await readMainRecord(f.db,options)).revision,7);
});
test('source changes at boot and before any save halt without selecting a preferred copy',async()=>{
 for(const key of LEGACY_SAVE_KEYS){
  const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s),before=entries(f);
  s.data.set(key,'newer external source');
  await assert.rejects(b.adapter.saveCandidate(two),e=>e.code==='legacy-conflict');assert.deepEqual(entries(f),before);
  assert.equal(b.adapter.status.state,'halted');const cold=await boot(f,s);
  assert.equal(cold.reason,'legacy-conflict');assert.equal(cold.adapter,null);assert.equal(cold.session,null);
 }
});
test('legacy writer during transaction preserves both sides and rejects uncertain publication',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s),hold=f.holdCommit();
 const saving=b.adapter.saveCandidate(two);await hold.entered.promise;s.data.set(LEGACY_SAVE_KEYS[2],'new legacy');hold.release();
 await assert.rejects(saving,e=>e.code==='legacy-conflict');
 assert.equal(f.records.get('head').text,two);assert.equal(f.records.get('previous').text,one);
 assert.equal(b.adapter.text,one);assert.equal(b.adapter.status.state,'halted');
 assert.equal((await boot(f,s)).reason,'legacy-conflict');
});
test('quota and transaction abort are atomic, halt the adapter, and never retry',async()=>{
 for(const failure of ['rejectWrites','abortNext']){
  const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s),before=entries(f);f[failure]=true;
  await assert.rejects(b.adapter.importRecord(two));assert.deepEqual(entries(f),before);assert.equal(b.adapter.status.state,'halted');
  const writes=f.writes;await assert.rejects(b.adapter.startNew(three),e=>e.code==='storage-halted');assert.equal(f.writes,writes);
 }
});
test('readback failure does not roll back committed storage or publish new adapter state',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);
 f.afterCommit=()=>{f.readFailure=true;};await assert.rejects(b.adapter.saveCandidate(two),/readback unavailable/);
 assert.equal(f.records.get('head').text,two);assert.equal(b.adapter.text,one);assert.equal(b.adapter.status.revision,1);
 f.readFailure=false;f.afterCommit=null;assert.equal((await boot(f,s)).text,two);
});
test('delayed native commit rejects a second action; interruption never publishes the late result',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s),hold=f.holdCommit();
 const saving=b.adapter.saveCandidate(two);await hold.entered.promise;
 assert.equal(b.adapter.text,one);assert.equal(b.adapter.status.busy,true);
 await assert.rejects(b.adapter.startNew(three),e=>e.code==='pending-save');
 b.adapter.invalidate('pagehide');hold.release();await assert.rejects(saving,e=>e.code==='storage-halted'||e.code==='interrupted');
 assert.equal(b.adapter.text,one);assert.equal(f.records.get('head').text,two);assert.equal((await boot(f,s)).text,two);
});
test('two independently booted tabs use native transaction CAS, with one winner and no overwrite',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),a=await boot(f,s),b=await boot(f,s);
 const results=await Promise.allSettled([a.adapter.saveCandidate(two),b.adapter.saveCandidate(three)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='rejected').reason.code,'conflict');
 assert.equal(f.records.get('head').revision,2);assert.equal(f.records.get('previous').text,one);
});
test('damaged head, previous, metadata, origin and backup all fail closed without repair',async()=>{
 const mutations=[
  f=>f.records.set('head',{...f.records.get('head'),text:one}),
  f=>f.records.set('previous',{...f.records.get('previous'),text:two}),
  f=>f.records.delete('previous'),f=>f.records.delete('head'),
  f=>f.records.set('metadata',{...f.records.get('metadata'),revision:99}),
  f=>f.records.set('origin',{...f.records.get('origin'),sources:[]}),
  f=>f.records.delete('backup:1:migration'),f=>f.records.set('unrecognized','never discard')
 ];
 for(const mutate of mutations){
  const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);await b.adapter.saveCandidate(two);mutate(f);const before=entries(f);
  const cold=await boot(f,s);assert.equal(cold.state,'recovery');assert.equal(cold.adapter,null);assert.deepEqual(entries(f),before);
  await assert.rejects(b.adapter.saveCandidate(three));assert.deepEqual(entries(f),before);
 }
});
test('unavailable legacy storage or IndexedDB never creates a fresh replacement silently',async()=>{
 const f=factory();const failed=await boot(f,{getItem(){throw Error('blocked');}});
 assert.equal(failed.reason,'legacy-unavailable');assert.equal(f.opened.length,0);
 const unavailable=await boot(f,legacy(),{indexedDBApi:null});assert.equal(unavailable.reason,'idb-unavailable');assert.equal(unavailable.adapter,null);
});

const formalOptions={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const formalReader=text=>readSession(text,formalOptions);
function fresh(){const game=D.newMarketRulesDistillery(889);return {game,userPaused:true,elapsed:200,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:o=>D.replayDistilleryOperations(game,o)}),historyRecord:initializeHistoryRecord(game),recallRecord:initializeRecall(game)};}
function advance(s){const game=D.tickDistillery(s.game);return {...s,game,caskSlots:reconcileCaskSlots(game,s.caskSlots),recentLedger:advanceRecentLedger(s.game,game,s.recentLedger),historyRecord:advanceHistoryRecord(s.game,game,s.historyRecord),recallRecord:advanceRecall(s.game,game,s.recallRecord)};}
const encode=s=>serializeSession(s.game,s,formalOptions);
test('unchanged formal reader/serializer round trip game, history, recall, ledger, clock and paused state',async()=>{
 let before=fresh();for(let i=0;i<154;i++)before=advance(before);
 const raw=encode(before),next=advance(before),candidate=encode(next),f=factory(),s=legacy({[FORMAL_SAVE_KEY]:raw});
 const b=await boot(f,s,{reader:formalReader});assert.equal(b.state,'ready');assert.deepEqual(b.session,before);assert.equal(b.text,raw);
 const result=await b.adapter.saveCandidate(candidate);assert.deepEqual(result.session,next);
 const cold=await boot(f,s,{reader:formalReader});assert.deepEqual(cold.session,next);assert.equal(cold.text,candidate);assert.equal(s.getItem(FORMAL_SAVE_KEY),raw);
 assert.equal(f.records.get('previous').text,raw);assert.equal(f.records.get('backup:1:migration').candidate.text,raw);
});
test('formal rejection preserves invalid original and explicit valid import retains it in origin',async()=>{
 const raw=JSON.stringify({...JSON.parse(encode(fresh())),historyRecord:null}),f=factory(),s=legacy({[FORMAL_SAVE_KEY]:raw});
 const b=await boot(f,s,{reader:formalReader});assert.equal(b.state,'recovery');assert(b.adapter);assert.equal(f.records.size,0);
 await b.adapter.importRecord(encode(fresh()));assert.equal(f.records.get('origin').sources[0].text,raw);assert.equal(s.getItem(FORMAL_SAVE_KEY),raw);
});
test('no formal legacy mutation, database deletion, rollback or preflight adoption paths',()=>{
 const main=fs.readFileSync(new URL('../formal-idb-main.mjs',import.meta.url),'utf8');
 const storage=fs.readFileSync(new URL('../formal-idb-storage.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(main,/\.setItem\(|\.removeItem\(|\.clear\(|deleteDatabase/);
 assert.doesNotMatch(storage,/deleteDatabase|store\.delete\(|store\.clear\(/);
 assert.doesNotMatch(main,/openStagingIdb|readStagingRecord|writeStagingRecord/);
});


test('steady-state save formally reads the candidate and committed head without replaying unchanged archives',async()=>{
 const calls=[],countingReader=text=>{calls.push(text);return reader(text);};
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s,{reader:countingReader});
 await b.adapter.saveCandidate(two);calls.length=0;
 await b.adapter.saveCandidate(three);
 assert.deepEqual(calls,[three,three]);
 // A different validator on the same connection cannot inherit that trust.
 let validated=0;await readMainRecord(f.db,{cryptoApi:webcrypto,reader:text=>{validated++;return reader(text);}});
 assert.equal(validated,3); // head, previous, immutable migration copy
});

test('warm exact-text records skip redundant canonical parsing but never skip candidate or head checks',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);
 await b.adapter.saveCandidate(two);
 const parse=JSON.parse,parsed=[];
 JSON.parse=function(text,...args){parsed.push(text);return parse(text,...args);};
 try{await b.adapter.saveCandidate(three);}finally{JSON.parse=parse;}
 // Each candidate and committed head is parsed by canonical() and the reader.
 // Exact previously validated previous/original bytes need no third parse.
 assert.deepEqual(parsed,[three,three,three,three]);
 assert.equal(f.records.get('previous').text,two);
 assert.equal(f.records.get('backup:1:migration').candidate.text,one);
});


test('invalid explicit import does not replace or halt a healthy game',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s),before=entries(f);
 await assert.rejects(b.adapter.importRecord('{broken'));
 assert.deepEqual(entries(f),before);assert.equal(b.adapter.status.state,'ready');assert.equal(b.adapter.status.busy,false);
 assert.equal((await b.adapter.saveCandidate(two)).ok,true);
});

const hash=async text=>Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(text))).toString('hex');
async function resign(value){const {sha256,...payload}=value;return {...payload,sha256:await hash(JSON.stringify(payload))};}
test('warm records with recomputed checksums cannot reuse canonical validation for altered bytes',async()=>{
 for(const target of ['head','previous','backup:1:migration']){
  const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);await b.adapter.saveCandidate(two);
  const original=f.records.get(target),envelope=target.startsWith('backup:')?original.candidate:original;
  const text=envelope.text.replace('"version":8','"version": 8');
  const altered={...envelope,text,sha256:await hash(text)};
  f.records.set(target,target.startsWith('backup:')?await resign({...original,candidate:altered}):altered);
  const before=entries(f),writes=f.writes;
  await assert.rejects(readMainRecord(f.db,options),error=>
   target==='head'?error.code==='invalid-session':error.cause?.code==='invalid-session');
  await assert.rejects(b.adapter.saveCandidate(three));
  assert.deepEqual(entries(f),before);assert.equal(f.writes,writes);
 }
});
test('identical cached text still requires a fresh matching envelope checksum',async()=>{
 for(const target of ['head','previous','backup:1:migration']){
  const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s);await b.adapter.saveCandidate(two);
  const original=f.records.get(target),envelope=target.startsWith('backup:')?original.candidate:original;
  const altered={...envelope,sha256:'0'.repeat(64)};
  f.records.set(target,target.startsWith('backup:')?await resign({...original,candidate:altered}):altered);
  const before=entries(f),writes=f.writes;
  await assert.rejects(readMainRecord(f.db,options),error=>
   target==='head'?error.code==='idb-integrity':error.cause?.code==='idb-integrity');
  await assert.rejects(b.adapter.saveCandidate(three));
  assert.deepEqual(entries(f),before);assert.equal(f.writes,writes);
 }
});
test('missing or asynchronous validators cannot reuse a warm successful cache or mutate storage',async()=>{
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one});await boot(f,s);
 const before=entries(f),writes=f.writes;
 for(const invalidReader of [undefined,async text=>reader(text)]){
  await assert.rejects(readMainRecord(f.db,{reader:invalidReader,cryptoApi:webcrypto}),error=>error.code==='invalid-reader');
  await assert.rejects(writeMainRecord(f.db,two,{...options,reader:invalidReader,expectedRevision:1}),error=>error.code==='invalid-reader');
 }
 assert.deepEqual(entries(f),before);assert.equal(f.writes,writes);
});
test('warm backup with recomputed checksums still requires semantic validation and failed reads are not cached',async()=>{
 const bad=simple(666);let failures=0;
 const strictReader=text=>{const value=reader(text);if(value.game.core.month===666){failures++;throw Object.assign(Error('invalid game'),{code:'invalid-game'});}return value;};
 const f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one}),b=await boot(f,s,{reader:strictReader});await b.adapter.saveCandidate(two);
 const original=f.records.get('backup:1:migration');
 f.records.set('backup:1:migration',await resign({...original,candidate:{...original.candidate,text:bad,sha256:await hash(bad)}}));
 const before=entries(f);
 for(let i=0;i<2;i++)await assert.rejects(readMainRecord(f.db,{reader:strictReader,cryptoApi:webcrypto}),e=>e.code==='invalid-backup'&&e.cause?.code==='invalid-game');
 assert.equal(failures,2);assert.deepEqual(entries(f),before);
});
test('cold reopen discards the exact-text cache and revalidates head, previous and immutable original',async()=>{
 const calls=[],countingReader=text=>{calls.push(text);return reader(text);},f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one});
 const b=await boot(f,s,{reader:countingReader});await b.adapter.saveCandidate(two);await b.adapter.saveCandidate(three);calls.length=0;
 assert.equal((await boot(f,s,{reader:countingReader})).text,three);
 assert.deepEqual(calls,[three,two,one]);
});
test('LRU refresh keeps a repeatedly verified original warm beyond eight changing action candidates',async()=>{
 const calls=[],countingReader=text=>{calls.push(text);return reader(text);},f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one});
 const b=await boot(f,s,{reader:countingReader});
 for(let i=0;i<12;i++){
  const next=simple(200+i);calls.length=0;await b.adapter.saveCandidate(next);
  assert.deepEqual(calls,[next,next]); // new candidate and mandatory head readback
 }
 assert.equal(f.records.get('backup:1:migration').candidate.text,one);
});
test('bounded cache evicts older entries rather than retaining unlimited validated archives',async()=>{
 const calls=[],countingReader=text=>{calls.push(text);return reader(text);},f=factory(),s=legacy({[FORMAL_SAVE_KEY]:one});
 const b=await boot(f,s,{reader:countingReader});for(let i=0;i<10;i++)await b.adapter.importRecord(simple(300+i));
 calls.length=0;await readMainRecord(f.db,{reader:countingReader,cryptoApi:webcrypto});
 assert(calls.includes(one)); // ten distinct archives exceed the eight-entry cache
 assert.equal(f.records.get('metadata').backups.length,11); // eviction never removes stored records
});
