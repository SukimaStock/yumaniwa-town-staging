import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import fs from 'node:fs';
import {
 STAGING_IDB_NAME,openStagingIdb,readStagingRecord,writeStagingRecord,closeStagingIdb
} from '../formal-idb-storage.mjs';
const one=JSON.stringify({version:8,game:{core:{month:97}},userPaused:true});
const two=JSON.stringify({version:8,game:{core:{month:154}},userPaused:true});
const reader=text=>{const value=JSON.parse(text);assert.equal(value.version,8);return value;};
const opts={reader,cryptoApi:webcrypto};

// IndexedDB transaction simulation: writes publish only on completion.
// Native IDB browser behavior still needs real-browser verification.
function fakeFactory(){
 let records=new Map(),rejectWrites=false;
 const names={contains:x=>x==='records'};
 function transaction(name,mode){
  assert.equal(name,'records');
  let active=true,pending=0;
  const snapshot=new Map(records),tx={oncomplete:null,onabort:null,onerror:null,error:null};
  const maybeDone=()=>queueMicrotask(()=>{
   if(!active||pending>0)return;
   active=false;if(mode==='readwrite')records=snapshot;
   tx.oncomplete?.();
  });
  const store={
   get(key){
    const req={onsuccess:null,onerror:null,result:undefined,error:null};pending++;
    queueMicrotask(()=>{
     if(!active)return;
     req.result=structuredClone(snapshot.get(key));
     pending--;req.onsuccess?.();maybeDone();
    });
    return req;
   },
   getKey(key){
    const request={onsuccess:null,onerror:null,result:undefined,error:null};pending++;
    queueMicrotask(()=>{if(!active)return;request.result=snapshot.has(key)?key:undefined;pending--;request.onsuccess?.();maybeDone();});
    return request;
   },
   put(value,key){
    if(mode!=='readwrite')throw Error('readonly');
    if(rejectWrites){const error=new Error('QuotaExceededError');error.name='QuotaExceededError';throw error;}
    snapshot.set(key,structuredClone(value));
    return {onsuccess:null,onerror:null};
   }
  };
  tx.objectStore=x=>{assert.equal(x,'records');return store};
  tx.abort=()=>{if(!active)return;active=false;queueMicrotask(()=>tx.onabort?.());};
  return tx;
 }
 const db={
  objectStoreNames:names,onversionchange:null,
  createObjectStore:x=>{assert.equal(x,'records');return{};},
  transaction,close(){}
 };
 const api={open(name,version){
  assert.equal(name,STAGING_IDB_NAME);assert.equal(version,1);
  const request={result:db,error:null,onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};
  queueMicrotask(()=>{request.onupgradeneeded?.();request.onsuccess?.();});
  return request;
 }};
 return {api,inspect:()=>records,setReject:value=>rejectWrites=value,change:(key,record)=>records.set(key,record)};
}
async function open(f){return openStagingIdb({indexedDBApi:f.api});}
test('v8 write is verified, committed, and equal after reopening',async()=>{
 const f=fakeFactory(),db=await open(f);
 assert.equal(await readStagingRecord(db,opts),null);
 assert.deepEqual((await writeStagingRecord(db,one,{expectedRevision:0,...opts})).revision,1);
 closeStagingIdb(db);
 const cold=await open(f),r=await readStagingRecord(cold,opts);
 assert.equal(r.record.text,one);assert.equal(r.record.revision,1);assert.equal(r.source,'head');
 assert.equal(f.inspect().size,1);
});
test('atomic head and previous with monotonic CAS protects old good v8',async()=>{
 const f=fakeFactory(),db=await open(f);
 await writeStagingRecord(db,one,{expectedRevision:0,...opts});
 await writeStagingRecord(db,two,{expectedRevision:1,...opts});
 assert.equal(f.inspect().get('head').text,two);
 assert.equal(f.inspect().get('previous').text,one);
 await assert.rejects(writeStagingRecord(db,one,{expectedRevision:0,...opts}),e=>e.code==='conflict');
 assert.equal((await readStagingRecord(db,opts)).record.revision,2);
});
test('injected quota abort leaves the old generation and previous unchanged',async()=>{
 const f=fakeFactory(),db=await open(f);
 await writeStagingRecord(db,one,{expectedRevision:0,...opts});
 f.setReject(true);
 await assert.rejects(writeStagingRecord(db,two,{expectedRevision:1,...opts}),/QuotaExceeded/);
 f.setReject(false);
 assert.equal((await readStagingRecord(db,opts)).record.text,one);
 assert.equal(f.inspect().has('previous'),false);
});
test('invalid candidate is rejected before any transaction or replacement',async()=>{
 const f=fakeFactory(),db=await open(f);
 await assert.rejects(writeStagingRecord(db,JSON.stringify({version:2}),{expectedRevision:0,...opts}),e=>e.code==='invalid-session');
 await assert.rejects(writeStagingRecord(db,'{\n "version":8}',{expectedRevision:0,...opts}),e=>e.code==='invalid-session');
 await assert.rejects(writeStagingRecord(db,one,{expectedRevision:-1,...opts}),e=>e.code==='invalid-revision');
 assert.equal(f.inspect().size,0);
});
test('tampered head fails closed; explicit previous read can diagnose without rollback',async()=>{
 const f=fakeFactory(),db=await open(f);
 await writeStagingRecord(db,one,{expectedRevision:0,...opts});
 await writeStagingRecord(db,two,{expectedRevision:1,...opts});
 f.change('head',{...f.inspect().get('head'),text:one});
 await assert.rejects(readStagingRecord(db,opts),e=>e.code==='idb-integrity');
 const recovered=await readStagingRecord(db,{...opts,allowPrevious:true});
 assert.equal(recovered.source,'previous');assert.equal(recovered.record.text,one);
 assert.equal(f.inspect().get('head').text,one); // diagnostic read cannot mutate a failed head
});
test('no storage reader / IDB available refuses to proceed',async()=>{
 await assert.rejects(openStagingIdb({indexedDBApi:null}),e=>e.code==='idb-unavailable');
 const f=fakeFactory(),db=await open(f);
 await assert.rejects(writeStagingRecord(db,one,{expectedRevision:0,cryptoApi:webcrypto}),e=>e.code==='invalid-reader');
});
test('preflight is the only site import; runtime and localStorage are untouched',()=>{
 const js=fs.readFileSync(new URL('../storage-idb-preflight.mjs',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../storage-idb-preflight.html',import.meta.url),'utf8');
 const adapter=fs.readFileSync(new URL('../formal-idb-storage.mjs',import.meta.url),'utf8');
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(js,/\blocalStorage\b|fetch\(|XMLHttpRequest|sendBeacon|removeItem|setItem|indexedDB\.deleteDatabase/);
 assert.doesNotMatch(adapter,/localStorage|indexedDB\.deleteDatabase/);
 assert.match(js,/readSession\(/);assert.match(js,/serializeSession\(/);
 assert.match(adapter,/STAGING_IDB_NAME/);
});

test('corrupt head and previous refuse rotation without altering either entry',async()=>{
 for(const key of ['head','previous']){
  const f=fakeFactory(),db=await open(f);await writeStagingRecord(db,one,{expectedRevision:0,...opts});await writeStagingRecord(db,two,{expectedRevision:1,...opts});
  f.change(key,{...f.inspect().get(key),text:JSON.stringify({version:8,damaged:true})});
  const before=structuredClone([...f.inspect()]);
  await assert.rejects(writeStagingRecord(db,one,{expectedRevision:2,...opts}),e=>e.code==='idb-integrity');
  assert.deepEqual([...f.inspect()],before);
 }
});
test('correctly hashed but semantically rejected head cannot rotate',async()=>{
 const f=fakeFactory(),db=await open(f);await writeStagingRecord(db,one,{expectedRevision:0,...opts});
 const before=structuredClone([...f.inspect()]);
 const strict=text=>{reader(text);if(text===one)throw Error('semantic rejection');};
 await assert.rejects(writeStagingRecord(db,two,{expectedRevision:1,...opts,reader:strict}),/semantic rejection/);
 assert.deepEqual([...f.inspect()],before);
});
test('orphan previous and revision overflow fail closed',async()=>{
 const f=fakeFactory(),db=await open(f);await writeStagingRecord(db,one,{expectedRevision:0,...opts});
 f.change('previous',f.inspect().get('head'));f.inspect().delete('head');
 const before=structuredClone([...f.inspect()]);
 await assert.rejects(writeStagingRecord(db,two,{expectedRevision:0,...opts}),e=>e.code==='invalid-head');
 await assert.rejects(writeStagingRecord(db,two,{expectedRevision:Number.MAX_SAFE_INTEGER,...opts}),e=>e.code==='invalid-revision');
 assert.deepEqual([...f.inspect()],before);
});
test('thenable reader is rejected before storage mutation',async()=>{
 const f=fakeFactory(),db=await open(f);
 await assert.rejects(writeStagingRecord(db,one,{expectedRevision:0,...opts,reader:()=>({then(){}})}),e=>e.code==='invalid-reader');
 assert.equal(f.inspect().size,0);
});
test('exact snapshot rejects same-revision mutation and insertion/deletion of either entry',async()=>{
 for(const mutate of [
  f=>f.change('head',{...f.inspect().get('head'),text:one}),
  f=>f.change('head',{...f.inspect().get('head'),sha256:'0'.repeat(64)}),
  f=>f.change('head',{...f.inspect().get('head'),schema:'other'}),
  f=>f.inspect().delete('head'),
  f=>f.change('previous',{...f.inspect().get('previous'),text:two}),
  f=>f.inspect().delete('previous'),
 ]){
  const f=fakeFactory(),db=await open(f);await writeStagingRecord(db,one,{expectedRevision:0,...opts});await writeStagingRecord(db,two,{expectedRevision:1,...opts});
  const original=db.transaction.bind(db);let raced;
  db.transaction=(name,mode)=>{if(mode==='readwrite'){mutate(f);raced=structuredClone([...f.inspect()]);}return original(name,mode);};
  await assert.rejects(writeStagingRecord(db,one,{expectedRevision:2,...opts}),e=>e.code==='conflict');
  assert.deepEqual([...f.inspect()],raced);
 }
 const f=fakeFactory(),db=await open(f),original=db.transaction.bind(db);
 db.transaction=(name,mode)=>{if(mode==='readwrite')f.change('previous',{unexpected:true});return original(name,mode);};
 await assert.rejects(writeStagingRecord(db,one,{expectedRevision:0,...opts}),e=>e.code==='conflict');
 assert.deepEqual([...f.inspect()],[['previous',{unexpected:true}]]);
});
test('abort after previous put but before head put preserves both committed entries',async()=>{
 const f=fakeFactory(),db=await open(f);await writeStagingRecord(db,one,{expectedRevision:0,...opts});await writeStagingRecord(db,two,{expectedRevision:1,...opts});
 const before=structuredClone([...f.inspect()]),original=db.transaction.bind(db);
 db.transaction=(name,mode)=>{const tx=original(name,mode);if(mode==='readwrite'){const get=tx.objectStore.bind(tx);tx.objectStore=name=>{const s=get(name),put=s.put.bind(s);s.put=(value,key)=>{if(key==='head')throw Error('injected quota after previous');return put(value,key);};return s;};}return tx;};
 await assert.rejects(writeStagingRecord(db,one,{expectedRevision:2,...opts}),/injected quota/);
 assert.deepEqual([...f.inspect()],before);
});
test('postcommit reader failure retains previous and requires cold reconciliation',async()=>{
 const f=fakeFactory(),db=await open(f);await writeStagingRecord(db,one,{expectedRevision:0,...opts});
 let candidateReads=0;const readerFailure=text=>{reader(text);if(text===two&&++candidateReads===2)throw Error('injected readback failure');};
 await assert.rejects(writeStagingRecord(db,two,{expectedRevision:1,...opts,reader:readerFailure}),/injected readback/);
 assert.equal(f.inspect().get('previous').text,one);
 assert.equal((await readStagingRecord(await open(f),opts)).record.text,two);
 await assert.rejects(writeStagingRecord(db,two,{expectedRevision:1,...opts}),e=>e.code==='conflict');
 assert.equal(f.inspect().get('previous').text,one);
});

test('every present malformed entry fails closed including stored undefined',async()=>{
 for(const key of ['head','previous'])for(const value of [null,false,0,'',undefined]){
  const f=fakeFactory(),db=await open(f);await writeStagingRecord(db,one,{expectedRevision:0,...opts});
  f.change(key,value);const before=structuredClone([...f.inspect()]);
  await assert.rejects(writeStagingRecord(db,two,{expectedRevision:1,...opts}),e=>e.code==='invalid-record');
  assert.deepEqual([...f.inspect()],before);
 }
});
