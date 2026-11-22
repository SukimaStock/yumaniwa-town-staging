import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {bootMainIdb,inspectMainIdb,MAIN_IDB_NAME,LEGACY_SAVE_KEYS} from '../formal-idb-main.mjs';
import {createSessionEntry,createFreshSession,inspectStartRecord} from '../session-entry.mjs';
import {runtimeSource} from './formal-idb-runtime-harness.mjs';
import * as nativeModel from '../partner-orders.mjs';
const freshSession=seed=>createFreshSession(nativeModel,seed);
import {FORMAL_SAVE_KEY,readSession,serializeSession} from '../development-save.mjs';
const clone=value=>structuredClone(value);
import {naturalDeliveryFixture,months,sessionFor} from './regional-delivery-helpers.mjs';
import {settleConsignmentInto} from '../regional-consignment.mjs';
import {createRuntimeHarness,encodeSession,deferred,options} from './formal-idb-runtime-harness.mjs';

// Actual runtime boot/replacement functions, formal reader and IDB adapter run
// together. Only presentation and native transaction scheduling are simulated.
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

const memoryIdb=factory;
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


// These tests use actual app installSession/saveCandidate, official v9 reader,
// and the adapter with a serialized Node IDB simulation. No browser claim.
const D=nativeModel;
const encode9=session=>serializeSession(session.game,session,{...options,encoding:'lossless-v1'});
const read=text=>readSession(text,options);
const entries=f=>structuredClone([...f.records]);
let cached;
function oldSession(){if(!cached){const game=D.enableBottlingAssignment(D.enableWorldNetwork(naturalDeliveryFixture()));cached=sessionFor(game);assert.equal(D.consignmentMode(game),false);}return structuredClone(cached);}
async function loadedOld(){
 const old=oldSession(),raw=encodeSession(old),h=harness(raw);await h.context.boot();
 const storage={getItem:key=>h.data.get(key)??null};
 const migration=await bootMainIdb({storage,indexedDBApi:h.database.api,cryptoApi:webcrypto,reader:read});
 assert.equal(migration.ok,true);assert.equal(migration.text,raw);migration.adapter.close();
 return {h,old,raw,storage};
}
test('live consignment boundary from old v8 stays unpublished until v9 durable acknowledgement',async()=>{
 const {h,old,raw}=await loadedOld(),hold=h.database.holdCommit(),pending=continueGame(h);
 await hold.entered.promise;
 assert.deepEqual(plain(h.context.game),plain(old.game));assert.equal(D.consignmentMode(h.context.game),false);assert.equal(h.raw,raw);
 hold.release();assert.equal(await pending,true);assert.equal(D.consignmentMode(h.context.game),true);assert.equal(JSON.parse(h.raw).version,9);
 assert.equal(h.database.records.get('previous').text,raw);assert.equal(h.data.get(FORMAL_SAVE_KEY),raw);assert.deepEqual(plain(h.context.game.core),plain(old.game.core));
 const restored=read(h.raw);for(const key of ['game','caskSlots','recentLedger','historyRecord','recallRecord'])assert.deepEqual(plain(restored[key]),plain(h.snapshot()[key]),key);
 const cold=h.cold();await cold.context.boot();assert.equal(await continueGame(cold),true);assert.deepEqual(plain(cold.snapshot()),plain(h.snapshot()));
});
test('live consignment transaction abort retains old mode, exact old head, and all prior entries',async()=>{
 const {h,old,raw}=await loadedOld(),before=entries(h.database);h.database.abortNext=true;
 assert.equal(await continueGame(h),false);assert.equal(h.context.entryView,'error');assert.equal(h.context.lastSaveError.code,'migration-halted');
 assert.equal(h.context.canSave,false);assert.equal(h.context.runtimeHalted,true);assert.equal(D.consignmentMode(h.context.game),false);
 assert.deepEqual(plain(h.context.game),plain(old.game));assert.deepEqual(entries(h.database),before);assert.equal(h.raw,raw);assert.equal(h.data.get(FORMAL_SAVE_KEY),raw);
});
test('live consignment readback failure does not publish; prior v8 remains protected and cold v9 is valid',async()=>{
 const {h,old,raw}=await loadedOld();h.database.afterCommit=()=>{h.database.readFailure=true;};
 assert.equal(await continueGame(h),false);assert.equal(h.context.entryView,'error');assert.equal(h.context.lastSaveError.code,'migration-halted');
 assert.equal(h.context.canSave,false);assert.equal(h.context.runtimeHalted,true);assert.equal(D.consignmentMode(h.context.game),false);assert.deepEqual(plain(h.context.game),plain(old.game));
 assert.equal(h.database.records.get('previous').text,raw);assert.equal(h.data.get(FORMAL_SAVE_KEY),raw);
 const durable=h.database.records.get('head').text;assert.equal(JSON.parse(durable).version,9);assert.equal(D.consignmentMode(read(durable).game),true);
 h.database.afterCommit=null;h.database.readFailure=false;const cold=h.cold();await cold.context.boot();assert.equal(await continueGame(cold),true);assert.deepEqual(plain(cold.snapshot().game),plain(read(durable).game));
});
test('real consignment three monthly sales preserve stock/cash/replay and every sidecar through v9 IDB cold reopen',async()=>{
 let game=D.enableConsignment(oldSession().game);const pid=game.result.productId,desk=D.regionalDeliveryPartners(game)[0],q=D.regionalDeliveryQuote(game,pid,desk.id);
 game=D.assignRegionalProduct(game,{partnerId:desk.id,productId:pid,contractId:desk.contractId,allocationId:q.nextAllocationId,count:q.maxCount});
 const row=D.regionalDeliveryRows(game,desk.id)[0],before=structuredClone(game.core);
 game=D.consignRegionalProduct(game,{partnerId:desk.id,productId:pid,contractId:desk.contractId,allocationIds:row.allocationIds,consignmentId:D.nextConsignmentId(game)});
 assert.deepEqual(game.core,before);let session=sessionFor(game),raw=encode9(session),f=factory(),data=new Map(),storage={getItem:key=>data.get(key)??null};
 const b=await bootMainIdb({storage,indexedDBApi:f.api,cryptoApi:webcrypto,reader:read});await b.adapter.startNew(raw);
 let sold=0;
 for(let n=0;n<3;n++){
  game=months(game,1);session=sessionFor(game);sold+=game.regionalConsignment.lastSales.reduce((a,sale)=>a+sale.count,0);
  for(const p of game.core.products){const inv=D.storeMarketInventory(game,p.id);assert.equal(inv.hand+inv.retail+inv.assigned+inv.held,p.stock);assert.equal(p.stock+p.sold,p.originalStock);}
  assert.equal(game.core.cash,Math.round((1600+game.core.totals.revenue-game.core.totals.costs-game.core.totals.upkeep)*100)/100);
  const native=D.serializeDistillery(game);assert.strictEqual(settleConsignmentInto(game),game);assert.equal(D.serializeDistillery(D.restoreDistillery(native)),native);
  const next=encode9(session);await b.adapter.saveCandidate(next);assert.equal(f.records.get('previous').text,raw);raw=next;
  const cold=await bootMainIdb({storage,indexedDBApi:f.api,cryptoApi:webcrypto,reader:read});assert.equal(cold.ok,true);assert.deepEqual(cold.session,session);assert.equal(cold.text,raw);cold.adapter.close();
 }
 assert(sold>0);assert.equal(game.regionalConsignment.totalsByPartner[desk.id].count,sold);assert(game.core.totals.revenue>before.totals.revenue);
 assert.equal(f.records.size,4);
});
