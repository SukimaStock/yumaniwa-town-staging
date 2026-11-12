// Official reader and legal synthetic games; only the storage scheduler is mocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {readMainRecord,writeMainRecord} from '../formal-idb-storage.mjs';
import {readSession,serializeSession} from '../development-save.mjs';
import {createFreshSession} from '../session-entry.mjs';
import * as D from '../partner-orders.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {sessionFor} from './regional-delivery-helpers.mjs';
const schema='ambertime-main-bounded-idb/2';
const hash=text=>createHash('sha256').update(text).digest('hex');
const signed=value=>({...value,sha256:hash(JSON.stringify(value))});
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs,encoding:'lossless-v1'};
const formal=text=>readSession(text,options);
const fresh=seed=>({...createFreshSession(D,seed),userPaused:true});
const encode=session=>serializeSession(session.game,session,options);
const old=sessionFor(D.tickDistillery(fresh(481).game));
const newer={...sessionFor(D.tickDistillery(old.game)),elapsed:P.distillStepMs};
assert.deepEqual(newer.game.operations.slice(0,old.game.operations.length),old.game.operations);
assert(newer.game.operations.length>old.game.operations.length);
const oldText=encode(old),newText=encode(newer);
function records(previous=oldText,head=newText){
 const origin=signed({schema,sources:[{key:'sukimastock.ambertime.main.v1',text:oldText}]});
 return new Map([
  ['head',{schema,revision:2,text:head,sha256:hash(head)}],
  ['previous',{schema,revision:1,text:previous,sha256:hash(previous)}],
  ['origin',origin],['metadata',signed({schema,revision:2,originSha256:origin.sha256})]
 ]);
}
// Read-only snapshot sufficient for cold read and pre-write rejection. Any
// accidental transition to a writer is counted and fails rather than simulated.
function database(entries){
 let writes=0;
 const db={get writes(){return writes;},transaction(name,mode){
  assert.equal(name,'records');if(mode!=='readonly'){writes++;throw Error('Unexpected write');}
  const snapshot=structuredClone(entries),tx={oncomplete:null,onabort:null,onerror:null};let pending=0;
  const request=value=>{const r={result:undefined,onsuccess:null,onerror:null};pending++;queueMicrotask(()=>{r.result=structuredClone(value);r.onsuccess?.();if(--pending===0)queueMicrotask(()=>tx.oncomplete?.());});return r;};
  tx.objectStore=()=>({getAllKeys:()=>request([...snapshot.keys()]),getAll:()=>request([...snapshot.values()])});return tx;
 }};return db;
}
test('cold generation read formally validates previous then head and returns the exact head session',async()=>{
 const entries=records(),db=database(entries),calls=[];
 const reader=text=>{calls.push(text);return formal(text);};
 const result=await readMainRecord(db,{reader,cryptoApi:webcrypto});
 assert.deepEqual(calls,[oldText,newText]);assert.deepEqual(result.session,newer);
 assert.equal(result.record.text,newText);assert.equal(result.previous.text,oldText);assert.equal(db.writes,0);
 // A warm head is still formally read on every read, even when prior bytes are cached.
 calls.length=0;await readMainRecord(db,{reader,cryptoApi:webcrypto});assert.deepEqual(calls,[newText]);
});
test('cold corruption of either generation stops before any rotation and preserves every stored byte',async()=>{
 for(const key of ['previous','head']){
  const entries=records();entries.get(key).text+='x';const before=structuredClone(entries),db=database(entries);
  await assert.rejects(readMainRecord(db,{reader:formal,cryptoApi:webcrypto}));
  await assert.rejects(writeMainRecord(db,newText,{expectedRevision:2,reader:formal,cryptoApi:webcrypto}));
  assert.deepEqual(entries,before);assert.equal(db.writes,0,key);
 }
});
test('a recomputed envelope checksum never makes divergent forged native state trusted by the prefix cache',async()=>{
 // Re-encode a forged logical game through the ordinary v8 envelope to avoid
 // merely testing the lossless outer checksum. Its operation history is intact.
 const bad=JSON.parse(serializeSession(old.game,old,{...options,encoding:'legacy-v8'}));
 assert.deepEqual(formal(JSON.stringify(bad)).game,old.game);
 bad.game.core.cash++;const badText=JSON.stringify(bad);
 assert.throws(()=>formal(badText));
 const entries=records(oldText,badText),before=structuredClone(entries),db=database(entries),calls=[];
 const reader=text=>{calls.push(text);return formal(text);};
 await assert.rejects(readMainRecord(db,{reader,cryptoApi:webcrypto}));
 assert.deepEqual(calls,[oldText,badText]);assert.deepEqual(entries,before);assert.equal(db.writes,0);
 // Unrelated legal histories remain individually valid; no prefix substitution.
 const other=fresh(938),otherText=encode(other),separate=await readMainRecord(database(records(oldText,otherText)),{reader:formal,cryptoApi:webcrypto});
 assert.deepEqual(separate.session,other);assert.notEqual(separate.session.game.seed,old.game.seed);
});
