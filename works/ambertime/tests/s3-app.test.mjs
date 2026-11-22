import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {bootMainIdb,inspectMainIdb,MAIN_IDB_NAME,LEGACY_SAVE_KEYS} from '../formal-idb-main.mjs';
import {createSessionEntry,createFreshSession,inspectStartRecord} from '../session-entry.mjs';
import {runtimeSource} from './formal-idb-runtime-harness.mjs';
import * as nativeModel from '../partner-orders.mjs';
const freshSession=seed=>createFreshSession(nativeModel,seed);
import {FORMAL_SAVE_KEY,readSession,serializeSession} from '../development-save.mjs';
import {createRuntimeHarness,encodeSession,deferred,options} from './formal-idb-runtime-harness.mjs';

// Actual runtime boot/replacement functions, formal reader and IDB adapter run
// together. Only presentation and native transaction scheduling are simulated.
function memoryIdb(){
 const f={records:new Map(),writes:0,quota:false,hold:null};
 const queue=[];let running=false;
 const drain=()=>{if(running||!queue.length)return;running=true;queue.shift()();};
 const db={close(){},objectStoreNames:{contains:name=>name==='records'},transaction(name,mode){
  assert.equal(name,'records');let active=true,started=false,finishing=false,pending=0,snapshot,waiting=[];
  const tx={error:null},finish=()=>{active=false;running=false;queueMicrotask(drain);};
  tx.abort=()=>{if(!active)return;finish();queueMicrotask(()=>tx.onabort?.());};
  const complete=()=>queueMicrotask(()=>{
   if(!active||pending||finishing)return;finishing=true;
   const commit=()=>{if(!active)return;if(mode==='readwrite'){f.records=snapshot;f.writes++;}finish();tx.oncomplete?.();};
   if(mode==='readwrite'&&f.hold){const hold=f.hold;f.hold=null;hold.release=commit;hold.entered.resolve();return;}commit();
  });
  const request=fn=>{
   const r={};pending++;
   const run=()=>queueMicrotask(()=>{if(!active)return;try{r.result=structuredClone(fn());pending--;r.onsuccess?.();complete();}catch(error){r.error=tx.error=error;r.onerror?.();tx.abort();}});
   if(started)run();else waiting.push(run);return r;
  };
  const write=(value,key,add)=>{
   assert.equal(mode,'readwrite');
   if(f.quota)throw Object.assign(Error('full'),{name:'QuotaExceededError'});
   return request(()=>{if(add&&snapshot.has(key))throw Error('duplicate immutable key');snapshot.set(key,structuredClone(value));return key;});
  };
  tx.objectStore=()=>({getAllKeys:()=>request(()=>[...snapshot.keys()].sort()),getAll:()=>request(()=>[...snapshot.keys()].sort().map(key=>snapshot.get(key))),put:(v,k)=>write(v,k,false),add:(v,k)=>write(v,k,true)});
  queue.push(()=>{snapshot=structuredClone(f.records);started=true;for(const run of waiting)run();waiting=[];complete();});queueMicrotask(drain);return tx;
 }};
 f.api={open(name,version){assert.equal(name,MAIN_IDB_NAME);assert.equal(version,1);const request={result:db};queueMicrotask(()=>request.onsuccess?.());return request;}};
 f.holdCommit=()=>{const hold={entered:deferred(),release:null};f.hold=hold;return hold;};
 return f;
}
function harness(raw=null,{database=memoryIdb(),data=new Map([['unrelated-work','keep']])}={}){
 if(raw!==null)data.set(FORMAL_SAVE_KEY,raw);
 const h=createRuntimeHarness({session:freshSession(81),functions:['rememberCommitted','recoveryAccess','installSession','replaceSession','startNew','importRecord','boot','showTitle','inspectEntry','entryStorage','prepareEntryStorage','enterSession','cancelEntry']}),c=h.context;
 let approved=true;const writesBefore=database.writes,noop=()=>{};
 c.game=null;c.committedSession=null;c.canSave=false;c.lastSavedText=null;
 const localStorage={getItem:key=>data.get(key)??null,setItem(){throw Error('legacy write forbidden');},removeItem(){throw Error('legacy deletion forbidden');}};
 Object.assign(c,{
  localStorage,createSessionEntry,createFreshSession,inspectStartRecord,seed:81,SAVE_KEY:FORMAL_SAVE_KEY,entryRaw:null,entrySources:null,entryUnreadable:false,entrySnapshot:null,entryMessage:'',entryOperation:'',staffDisplayKey:null,staffDisplay:null,protectedRecordExports:noop,startShadow:noop,recordEntryFailure:(error,result)=>{c.recordSaveError(error,result?.stage);},inspectMainIdb:args=>inspectMainIdb({...args,indexedDBApi:database.api}),bootMainIdb:args=>bootMainIdb({...args,indexedDBApi:database.api,cryptoApi:webcrypto}),
  newNativeGame:()=>h.model.newShopDialogueDistillery(81),confirm:()=>approved,
  distillRoom:{reset:noop},feedbackComments:{reset:noop},vaultPanels:noop,
  query:new URLSearchParams(),fetch:()=>{throw Error('unexpected fetch');},mapUIStorage:()=>null,mapNoticeSave:noop,mapNoticeLoad:noop,MAP_VIEW_KEY:'map',
  historyData:null,historySnapshot:null,historyFactsSnapshot:null,
  render:()=>h.log.push('render'),schedule:()=>h.log.push('schedule')
 });
 c.scene.resetMotion=noop;c.automaticNews.update=noop;c.marketUI.update=noop;
 for(const id of ['entry-back','entry-screen'])h.node(id).focus=noop;
 h.run('mainStore=null;commitBoundary=null;');
 h.run(runtimeSource.slice(runtimeSource.indexOf('const sessionEntry=createSessionEntry('),runtimeSource.indexOf('async function enterSession(')));
 for(const target of [c.scene,c.marketUI,c.placementUI,c.automaticNews,c.m0,c.dialogueProjection])target.reset=noop;
 Object.assign(c.warehouseRoom,{selectedId:null,select(id){this.selectedId=id;}});
 return {...h,data,database,writes:()=>database.writes-writesBefore,setQuota:value=>{database.quota=value;},approve:value=>{approved=value;},
  get raw(){return database.records.get('head')?.text??null;},cold:()=>harness(null,{database,data})};
}
async function newStart(h){const accepted=await h.context.startNew();if(!accepted)return false;if(h.context.entryView==='confirm')return h.context.enterSession('new');return accepted;}
async function continueGame(h){return h.context.enterSession('continue');}
async function started(raw=null){const h=harness(raw);await h.context.boot();assert.equal(raw===null?await newStart(h):await continueGame(h),true,JSON.stringify(h.context.lastSaveError));return h;}
const plain=value=>JSON.parse(JSON.stringify(value));
// Default fixture encoder stays legacy-v8. Live writer explicitly normalizes to v9.
const normalized9=text=>{const session=readSession(text,options);return serializeSession(session.game,session,{...options,encoding:'lossless-v1'});};
function assertSameSession(actual,expected){assert.deepEqual(readSession(actual,options),readSession(expected,options));}

for(const raw of ['{broken',JSON.stringify({version:7}),JSON.stringify({version:6}),JSON.stringify({version:5}),JSON.stringify({version:4}),JSON.stringify({version:3}),JSON.stringify({version:2})]){
 test(`unsupported/corrupt boot preserves original and permits confirmed restart: ${raw}`,async()=>{
  const h=harness(raw);await h.context.boot();assert.equal(h.context.game,null);assert.equal(h.context.canSave,false);assert.equal(h.writes(),0);assert.equal(h.data.get(FORMAL_SAVE_KEY),raw);assert.equal(h.context.entrySnapshot.kind,'unreadable');
  assert.equal(await newStart(h),true);assert.equal(h.context.canSave,true);assert.equal(h.context.runtimeHalted,false);assert.equal(JSON.parse(h.raw).version,9);assert.equal(h.data.get('unrelated-work'),'keep');
  assert.equal(h.data.get(FORMAL_SAVE_KEY),raw);assert.equal(h.database.records.get('origin').sources[0].text,raw);
  assert.deepEqual(Array.from(h.context.caskSlots),[null,null,null,null]);assert.equal(h.context.elapsed,0);assert.equal(h.node('recovery').hidden,true);
 });
}
test('empty boot waits for explicit new game, then cold reload restores exact game and every sidecar',async()=>{
 const h=harness();await h.context.boot();assert.equal(h.context.game,null);assert.equal(h.context.canSave,false);assert.equal(h.writes(),0);assert.equal(h.context.entrySnapshot.kind,'empty');
 assert.equal(await newStart(h),true);h.context.elapsed=100;h.context.userPaused=true;assert.equal(await h.context.save(),true);
 assert.equal(JSON.parse(h.raw).version,9);const raw=h.raw,cold=h.cold();await cold.context.boot();assert.equal(cold.context.game,null);assert.equal(await continueGame(cold),true);assert.equal(cold.writes(),0);assert.equal(cold.raw,raw);assert.equal(cold.context.elapsed,100);assert.equal(cold.context.userPaused,true);
 for(const key of ['game','caskSlots','recentLedger','historyRecord','recallRecord'])assert.deepEqual(plain(cold.snapshot()[key]),plain(h.snapshot()[key]),key);
 assert.equal(h.data.has(FORMAL_SAVE_KEY),false);assert.equal(cold.data.get('unrelated-work'),'keep');
});
test('cancel restart makes no changes even when ordinary gameplay is blocked',async()=>{
 const h=harness('old');await h.context.boot();assert.equal(await h.context.startNew(),true);await h.context.cancelEntry();assert.equal(h.writes(),0);assert.equal(h.data.get(FORMAL_SAVE_KEY),'old');assert.equal(h.context.game,null);assert.equal(h.context.canSave,false);
});
test('quota failure retains committed game; explicit confirmed restart revalidates before recovery',async()=>{
 const h=await started(),game=h.context.game,raw=h.raw;h.setQuota(true);
 assert.equal(await h.context.save(),false);assert.equal(h.context.canSave,false);assert.equal(await newStart(h),false);assert.equal(h.context.game,game);assert.equal(h.raw,raw);assert.equal(h.context.lastSaveError.code,'QuotaExceededError');assert.equal(h.node('save-status').textContent,'未保存');
 h.setQuota(false);assert.equal(await newStart(h),true);assert.equal(h.context.canSave,true);assert.equal(h.database.records.get('previous').text,raw);
 const recovered=h.raw,cold=h.cold();await cold.context.boot();assert.equal(await newStart(cold),true);assert.equal(cold.context.canSave,true);assert.equal(cold.context.lastSaveError,null);
 assert.equal(cold.database.records.get('previous').text,recovered);
});
test('quota failure from corrupt boot does not erase original or claim success',async()=>{
 const h=harness('broken');await h.context.boot();h.setQuota(true);assert.equal(await newStart(h),false);assert.equal(h.context.game,null);assert.equal(h.data.get(FORMAL_SAVE_KEY),'broken');assert.equal(h.context.canSave,false);assert.equal(h.database.records.size,0);
});
test('restart never overwrites a competing legacy writer or an independently updated IDB head',async()=>{
 const h=await started(),game=h.context.game,raw=h.raw;h.data.set(FORMAL_SAVE_KEY,'other-tab');assert.equal(await newStart(h),false);assert.equal(h.data.get(FORMAL_SAVE_KEY),'other-tab');assert.equal(h.context.game,game);assert.equal(h.raw,raw);assert.equal(h.context.lastSaveError.code,'legacy-conflict');
 const a=await started(),b=a.cold();await b.context.boot();assert.equal(await continueGame(b),true);b.context.elapsed=100;assert.equal(await b.context.save(),true);const newer=b.raw,revision=b.database.records.get('head').revision;
 assert.equal(await newStart(a),false);assert.equal(a.context.lastSaveError.code,'conflict');assert.equal(a.raw,newer);assert.equal(a.database.records.get('head').revision,revision);
});
for(const text of ['broken',JSON.stringify({version:5})])test('invalid import leaves a healthy game usable: '+text,async()=>{
 const h=await started(),game=h.context.game,raw=h.raw;
 assert.equal(await h.context.importRecord({text:async()=>text}),false);assert.equal(h.context.game,game);assert.equal(h.context.canSave,true);assert.equal(h.context.runtimeHalted,false);assert.equal(h.raw,raw);assert.equal(await h.context.save(),true);
});
test('explicit import stays debug-only and preview cannot read an import file',async()=>{
 const h=await started();h.context.debugEnabled=false;const imported=encodeSession(freshSession(999));
 const before=h.raw;assert.equal(await h.context.importRecord({text:()=>{throw Error('nondebug must not read');}}),false);assert.equal(h.raw,before);
 h.context.debugEnabled=true;assert.equal(await h.context.importRecord({text:async()=>imported}),true);h.context.preview=true;assert.equal(await h.context.importRecord({text:()=>{throw Error('must not read');}}),false);assert.equal(h.raw,normalized9(imported));assertSameSession(h.raw,imported);
});
test('cancel import preserves game, IDB, legacy originals and all recovery choices',async()=>{
 const h=await started(),before=plain(h.snapshot()),raw=h.raw,writes=h.writes();h.approve(false);
 assert.equal(await h.context.importRecord({text:async()=>encodeSession(freshSession(888))}),false);
 assert.deepEqual(plain(h.snapshot()),before);assert.equal(h.raw,raw);assert.equal(h.writes(),writes);assert.equal(h.context.canSave,true);
});
test('import publishes only after durable completion and retains exact displaced v8 and lossless equivalent imported session',async()=>{
 const original=encodeSession(freshSession(71)),imported=encodeSession({...freshSession(72),userPaused:true,elapsed:200});
 const h=await started(original),game=h.context.game,hold=h.database.holdCommit();
 const result=h.context.importRecord({text:async()=>imported});await hold.entered.promise;
 assert.equal(h.context.game,game);assert.equal(h.context.lastSavedText,original);assert.equal(h.raw,original);assert.equal(await newStart(h),false);
 hold.release();assert.equal(await result,true);assert.equal(h.raw,normalized9(imported));assertSameSession(h.raw,imported);assert.equal(h.context.lastSavedText,normalized9(imported));assert.equal(h.context.elapsed,200);assert.equal(h.context.userPaused,true);
 assert.equal(h.data.get(FORMAL_SAVE_KEY),original);assert.equal(h.database.records.get('previous').text,original);assert.equal(h.database.records.get('head').text,normalized9(imported));
 const cold=h.cold();await cold.context.boot();assert.equal(await continueGame(cold),true);assert.equal(cold.raw,normalized9(imported));assertSameSession(cold.raw,imported);for(const key of ['game','userPaused','elapsed','caskSlots','recentLedger','historyRecord','recallRecord'])assert.deepEqual(plain(cold.snapshot()[key]),plain(h.snapshot()[key]),key);
 assert.equal(JSON.parse(imported).version,8);assert.equal(JSON.parse(original).version,8);assert.equal(cold.data.get(FORMAL_SAVE_KEY),original);
});
for(const key of LEGACY_SAVE_KEYS.slice(1))test('historical key stays exportable and is neither auto-converted nor deleted: '+key,async()=>{
 const h=harness();h.data.set(key,'original legacy');await h.context.boot();assert.equal(h.context.game,null);assert.equal(h.writes(),0);assert.equal(h.context.entrySnapshot.kind,'legacy');assert.equal(h.context.legacyRecord.raw,'original legacy');
 assert.equal(await newStart(h),true);assert.equal(h.data.get(key),'original legacy');assert.equal(h.context.legacyRecord,null);assert.equal(JSON.parse(h.raw).version,9);assert.equal(h.data.has(FORMAL_SAVE_KEY),false);
 assert.equal(h.database.records.get('origin').sources.find(source=>source.key===key).text,'original legacy');
});
test('historical-key concurrent change prevents confirmed replacement',async()=>{
 const h=harness(),key=LEGACY_SAVE_KEYS[1];h.data.set(key,'old');await h.context.boot();h.data.set(key,'new from other tab');assert.equal(await newStart(h),false);assert.equal(h.data.has(FORMAL_SAVE_KEY),false);assert.equal(h.data.get(key),'new from other tab');assert.equal(h.context.lastSaveError.code,'legacy-conflict');assert.equal(h.database.records.size,0);
});
