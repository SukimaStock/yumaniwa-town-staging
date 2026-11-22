import test from 'node:test';
import assert from 'node:assert/strict';
import * as native from '../partner-orders.mjs';
import {createFreshSession,inspectStartRecord,assertStartRecord,createSessionEntry,LEGACY_SAVE_KEYS} from '../session-entry.mjs';
import {readSession,serializeSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as T} from '../economy-parameters.mjs';

const options={enabled:true,serialize:native.serializeDistillery,restore:native.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs};
const encode=session=>serializeSession(session.game,session,options);
const originalSession=createFreshSession(native,42),original=encode(originalSession);
const backupPrefix=FORMAL_SAVE_KEY+'.before-market-rules.v1.';
function memory(raw=original){
 const values=new Map(raw===null?[]:[[FORMAL_SAVE_KEY,raw]]),writes=[];
 return {values,writes,getItem:key=>values.get(key)??null,setItem(key,value){writes.push([key,value]);values.set(key,value);}};
}
const backups=store=>[...store.values].filter(([key])=>key.startsWith(backupPrefix));
function harness({store=memory(),create=()=>createFreshSession(native,43),encodeCandidate=encode,read=raw=>readSession(raw,options),yieldTask=()=>Promise.resolve(),phase=()=>{}}={}){
 const installed=[];
 const entry=createSessionEntry({storage:()=>store,create,encode:encodeCandidate,read,write:writeCandidate,replace:()=>assert.fail('normal new start must not call backup writer'),install:(session,details)=>installed.push({session,details}),yieldTask,phase});
 return {store,installed,entry,expected:inspectStartRecord(store)};
}

test('title probe distinguishes empty, current, unsupported, corrupt and legacy without writes or replay',()=>{
 for(const [raw,kind] of [[null,'empty'],[original,'current'],['{"version":7}','unreadable'],['{broken','unreadable'],['','unreadable']]){
  const store=memory(raw);assert.equal(inspectStartRecord(store).kind,kind);assert.deepEqual(store.writes,[]);
 }
 const store=memory(null);store.values.set(LEGACY_SAVE_KEYS[0],'old raw');
 assert.deepEqual(inspectStartRecord(store),{raw:null,legacy:[{key:LEGACY_SAVE_KEYS[0],raw:'old raw'}],kind:'legacy'});
 assert.deepEqual(store.writes,[]);
 assert.throws(()=>inspectStartRecord({getItem(){throw Object.assign(Error('denied'),{name:'SecurityError'});}}),{name:'SecurityError'});
});

test('record comparison catches formal and legacy additions, removals and exact-byte changes',()=>{
 for(const mutate of [s=>s.values.set(FORMAL_SAVE_KEY,original+' '),s=>s.values.delete(FORMAL_SAVE_KEY),s=>s.values.set(LEGACY_SAVE_KEYS[1],'another')]){
  const store=memory(),expected=inspectStartRecord(store);mutate(store);
  assert.throws(()=>assertStartRecord(store,expected),e=>e.code==='conflict');assert.deepEqual(store.writes,[]);
 }
});

test('continue invokes official reader once, restores every sidecar, and never writes',async()=>{
 let reads=0;const h=harness({read:raw=>{reads++;return readSession(raw,options);}});
 assert.deepEqual(await h.entry.continue(h.expected),{ok:true});
 assert.equal(reads,1);assert.deepEqual(h.installed[0].session,originalSession);
 assert.equal(h.installed[0].details.fresh,false);assert.equal(h.installed[0].details.text,original);
 assert.deepEqual(h.store.writes,[]);
});

test('continue never substitutes a new game on invalid or unsupported records',async()=>{
 for(const raw of ['{broken','{"version":7}',JSON.stringify({...JSON.parse(original),recallRecord:null})]){
  let creations=0;const h=harness({store:memory(raw),create:()=>{creations++;return createFreshSession(native,43);}});
  const result=await h.entry.continue(h.expected);
  assert.equal(result.ok,false);assert(result.error);assert.equal(creations,0);assert.equal(h.installed.length,0);
  assert.deepEqual(h.store.writes,[]);assert.equal(h.store.getItem(FORMAL_SAVE_KEY),raw);
 }
});

test('continue rejects another tab before reader and after reader before install',async()=>{
 for(const checkpoint of [1,2]){
  let calls=0,reads=0;const store=memory(),h=harness({store,read:raw=>{reads++;return readSession(raw,options);},yieldTask:async()=>{if(++calls===checkpoint)store.values.set(FORMAL_SAVE_KEY,'other tab');}});
  const result=await h.entry.continue(h.expected);
  assert.equal(result.error.code,'conflict');assert.equal(reads,checkpoint===1?0:1);assert.equal(h.installed.length,0);
  assert.equal(store.getItem(FORMAL_SAVE_KEY),'other tab');assert.deepEqual(store.writes,[]);
 }
});

test('new session is validated and read back before install without creating a backup',async()=>{
 for(const raw of [null,original,'{"version":7,"old":"bytes"}','{broken','']){
  const h=harness({store:memory(raw)});assert.deepEqual(await h.entry.start(h.expected),{ok:true});
  assert.equal(h.installed.length,1);assert.equal(h.installed[0].details.fresh,true);
  assert.equal(h.installed[0].session.game.seed,43);
  assert.deepEqual(readSession(h.store.getItem(FORMAL_SAVE_KEY),options),h.installed[0].session);
  assert.equal(backups(h.store).length,0);
  assert.equal(h.installed[0].details.backupKey,null);
  assert.deepEqual(h.store.writes.map(([key])=>key),[FORMAL_SAVE_KEY]);
 }
});

test('save without formal data preserves legacy source bytes and never removes them',async()=>{
 const store=memory(null);store.values.set(LEGACY_SAVE_KEYS[0],'unreadable legacy');
 const h=harness({store});assert.deepEqual(await h.entry.start(h.expected),{ok:true});
 assert.equal(store.getItem(LEGACY_SAVE_KEYS[0]),'unreadable legacy');assert.deepEqual(store.writes.map(([key])=>key),[FORMAL_SAVE_KEY]);
 assert.deepEqual(readSession(store.getItem(FORMAL_SAVE_KEY),options),h.installed[0].session);
});

test('candidate creation and validation failures leave old session and all bytes unchanged',async()=>{
 for(const failure of ['create','encode']){
  const error=Error(failure),h=harness({create:failure==='create'?()=>{throw error;}:()=>createFreshSession(native,43),encodeCandidate:failure==='encode'?()=>{throw error;}:encode});
  const result=await h.entry.start(h.expected);assert.equal(result.ok,false);assert.equal(result.error,error);assert.equal(result.writeAttempted,false);
  assert.equal(h.installed.length,0);assert.equal(h.store.getItem(FORMAL_SAVE_KEY),original);assert.deepEqual(h.store.writes,[]);
  assert.deepEqual(readSession(h.store.getItem(FORMAL_SAVE_KEY),options),originalSession);
 }
});

test('formal quota failure never reports successful start and keeps original bytes',async()=>{
 const store=memory();store.setItem=()=>{throw Object.assign(Error('full'),{name:'QuotaExceededError'});};
 const h=harness({store}),result=await h.entry.start(h.expected);
 assert.equal(result.ok,false);assert.equal(result.error.name,'QuotaExceededError');assert.equal(result.stage,'formal-write');
 assert.equal(h.installed.length,0);assert.equal(store.getItem(FORMAL_SAVE_KEY),original);assert.equal(result.formalState,'uncertain');
 assert.equal(backups(store).length,0);assert.deepEqual(readSession(store.getItem(FORMAL_SAVE_KEY),options),originalSession);
});

test('formal readback mismatch does not roll back or adopt uncertain formal state',async()=>{
 const store=memory(),set=store.setItem;
 store.setItem=(key,value)=>{set(key,value);if(key===FORMAL_SAVE_KEY)store.values.set(key,'other tab after write');};
 const h=harness({store}),result=await h.entry.start(h.expected);
 assert.equal(result.ok,false);assert.equal(result.writeAttempted,true);assert.equal(h.installed.length,0);
 assert.equal(result.formalState,'uncertain');assert.equal(backups(store).length,0);
 assert.equal(store.getItem(FORMAL_SAVE_KEY),'other tab after write');
 assert.equal(store.writes.filter(([key])=>key===FORMAL_SAVE_KEY).length,1);
});

test('concurrent updates during preparation and immediately before writer compare are never overwritten',async()=>{
 for(const checkpoint of ['before-create','after-encode','writer-compare']){
  const store=memory(),get=store.getItem;let yields=0,formalReads=0;
  // inspectStartRecord in harness reads once, entry reads twice, writer reads fourth.
  if(checkpoint==='writer-compare')store.getItem=key=>{if(key===FORMAL_SAVE_KEY&&++formalReads===4)store.values.set(key,'other tab');return get(key);};
  const h=harness({store,yieldTask:async()=>{yields++;if(checkpoint==='before-create'&&yields===1||checkpoint==='after-encode'&&yields===2)store.values.set(FORMAL_SAVE_KEY,'other tab');}});
  const result=await h.entry.start(h.expected);assert.equal(result.ok,false);assert.equal(h.installed.length,0);
  assert.equal(store.getItem(FORMAL_SAVE_KEY),'other tab');assert(!store.writes.some(([key])=>key===FORMAL_SAVE_KEY));
  assert.equal(backups(store).length,0);
 }
});

test('cancel before creation and after candidate validation prevents any later commit',async()=>{
 for(const checkpoint of [1,2]){
  let release,yields=0,created=0;
  const h=harness({create:()=>{created++;return createFreshSession(native,43);},yieldTask:()=>++yields===checkpoint?new Promise(resolve=>{release=resolve;}):Promise.resolve()});
  const pending=h.entry.start(h.expected);
  while(!release)await Promise.resolve();
  assert.equal(h.entry.cancel(),true);release();
  assert.deepEqual(await pending,{ok:false,cancelled:true});assert.equal(created,checkpoint===1?0:1);
  assert.equal(h.installed.length,0);assert.equal(h.store.getItem(FORMAL_SAVE_KEY),original);assert.deepEqual(h.store.writes,[]);
 }
});

test('double tap is ignored, final writing cannot be cancelled, one install follows one commit',async()=>{
 let release,cancelResult;let h;
 h=harness({yieldTask:()=>new Promise(resolve=>{release=resolve;}),phase:value=>{if(value==='writing')cancelResult=h.entry.cancel();}});
 const first=h.entry.start(h.expected);assert.equal(h.entry.busy,true);
 assert.deepEqual(await h.entry.start(h.expected),{ok:false,duplicate:true});
 release();await Promise.resolve();await Promise.resolve();release();
 assert.deepEqual(await first,{ok:true});assert.equal(cancelResult,false);assert.equal(h.installed.length,1);
 assert.equal(h.store.writes.filter(([key])=>key===FORMAL_SAVE_KEY).length,1);
 assert.equal(h.entry.busy,false);assert.equal(h.entry.writing,false);
});

test('an older cancelled completion cannot install into a newer entry attempt',async()=>{
 const releases=[];const h=harness({yieldTask:()=>new Promise(resolve=>releases.push(resolve))});
 const old=h.entry.start(h.expected);h.entry.cancel();const next=h.entry.start(h.expected);
 releases[0]();assert.deepEqual(await old,{ok:false,cancelled:true});assert.equal(h.entry.busy,true);
 releases[1]();await Promise.resolve();await Promise.resolve();releases[2]();
 assert.deepEqual(await next,{ok:true});assert.equal(h.installed.length,1);
});
