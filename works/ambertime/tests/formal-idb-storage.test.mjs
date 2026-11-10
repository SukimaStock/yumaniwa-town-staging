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
test('preflight stays isolated and byte-store adapters never mutate legacy storage',()=>{
 const js=fs.readFileSync(new URL('../storage-idb-preflight.mjs',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../storage-idb-preflight.html',import.meta.url),'utf8');
 const adapter=fs.readFileSync(new URL('../formal-idb-storage.mjs',import.meta.url),'utf8');
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(js,/\blocalStorage\b|fetch\(|XMLHttpRequest|sendBeacon|removeItem|setItem|indexedDB\.deleteDatabase/);
 assert.doesNotMatch(adapter,/localStorage|indexedDB\.deleteDatabase/);
 assert.match(js,/readSession\(/);assert.match(js,/serializeSession\(/);
 assert.match(adapter,/STAGING_IDB_NAME/);
});
