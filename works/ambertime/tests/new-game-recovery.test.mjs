import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as D from '../partner-orders.mjs';
import {initializeRecall,advanceRecall} from '../recall/collector.mjs';
import {initializeHistoryRecord} from '../history-record.mjs';
import {initializeCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger} from '../recent-ledger.mjs';
import {serializeSession,readSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {commitMarketRulesUpdate} from '../market-ui.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const newNativeGame=()=>D.enableWorldNetwork(D.newRegionalDeliveryDistillery(141));
const initializeLedger=game=>migrateRecentLedger(game,{replay:o=>D.replayDistilleryOperations(game,o)});
function fresh(){const game=newNativeGame();return {game,userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:initializeLedger(game),historyRecord:initializeHistoryRecord(game),recallRecord:initializeRecall(game)};}
const encode=session=>serializeSession(session.game,session,options);
function storage(raw=null){const data=new Map(raw===null?[]:[[FORMAL_SAVE_KEY,raw]]),writes=[];return {data,writes,getItem:key=>data.get(key)??null,setItem(key,value){writes.push([key,value]);data.set(key,value);}};}
const backups=store=>[...store.data].filter(([key])=>key.startsWith(FORMAL_SAVE_KEY+'.before-market-rules.v1.'));

test('a fresh v8 session must use its own recall, never the loaded session or null',()=>{
 const session=fresh(),before=newNativeGame(),after=D.tickDistillery(before),priorRecall=advanceRecall(before,after,initializeRecall(before));
 assert.throws(()=>encode({...session,recallRecord:priorRecall}),/Recall operation boundary mismatch/);
 assert.throws(()=>encode({...session,recallRecord:null}),/Wrong recall version or game/);
 assert.deepEqual(readSession(encode(session),options),session);
});

test('boot and explicit restart pass the newly initialized recall into formal validation',()=>{
 const start=app.slice(app.indexOf('function startNew(){'),app.indexOf("$('reset').addEventListener"));
 const boot=app.slice(app.indexOf('async function boot(){'),app.indexOf('window.amberPlacement='));
 for(const source of [start,boot])assert.match(source,/sessionText\(next,false,0,session\.caskSlots,session\.recentLedger,session\.historyRecord,session\.recallRecord\)/);
});

test('existing valid, old-version and unreadable raw records receive exact verified backups',()=>{
 for(const raw of [encode(fresh()),'{"version":2,"game":{"old":true}}','{unreadable','']){
  const store=storage(raw),text=encode(fresh()),result=commitMarketRulesUpdate(store,FORMAL_SAVE_KEY,raw,text);
  assert.equal(store.getItem(result.backupKey),raw);assert.equal(store.getItem(FORMAL_SAVE_KEY),text);
  assert.deepEqual(store.writes.map(([key])=>key),[result.backupKey,FORMAL_SAVE_KEY]);
  assert.deepEqual(readSession(store.getItem(FORMAL_SAVE_KEY),options),fresh());
 }
});

test('restart protection rejects stale data and changes during backup without overwriting the other tab',()=>{
 const before=storage('old');assert.throws(()=>commitMarketRulesUpdate(before,FORMAL_SAVE_KEY,'stale','new'));assert.deepEqual(before.writes,[]);
 const during=storage('old'),set=during.setItem;during.setItem=(key,value)=>{set(key,value);if(key!==FORMAL_SAVE_KEY)during.data.set(FORMAL_SAVE_KEY,'other-tab');};
 assert.throws(()=>commitMarketRulesUpdate(during,FORMAL_SAVE_KEY,'old','new'));assert.equal(during.getItem(FORMAL_SAVE_KEY),'other-tab');assert.equal(backups(during)[0][1],'old');assert(!during.writes.some(([key])=>key===FORMAL_SAVE_KEY));
});

test('backup quota, backup readback, collision and formal write failures preserve old raw',()=>{
 for(const failure of ['quota','backup-readback','formal-quota','collision']){
  const store=storage('old'),set=store.setItem;
  if(failure==='collision'){const first=commitMarketRulesUpdate(storage('old'),FORMAL_SAVE_KEY,'old','new');store.data.set(first.backupKey,'different raw');}
  store.setItem=(key,value)=>{if(failure==='quota'||failure==='formal-quota'&&key===FORMAL_SAVE_KEY)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});if(failure==='backup-readback'&&key!==FORMAL_SAVE_KEY)return;set(key,value);};
  assert.throws(()=>commitMarketRulesUpdate(store,FORMAL_SAVE_KEY,'old','new'),undefined,failure);assert.equal(store.getItem(FORMAL_SAVE_KEY),'old',failure);
  if(failure==='collision')assert.equal(backups(store)[0][1],'different raw');
  if(failure==='formal-quota')assert.equal(backups(store)[0][1],'old');
 }
});

test('formal readback failure retains old backup and never returns a successful replacement',()=>{
 const store=storage('old'),get=store.getItem;store.getItem=key=>key===FORMAL_SAVE_KEY&&store.data.get(key)==='new'?'unverified':get(key);
 let installed=false;assert.throws(()=>{commitMarketRulesUpdate(store,FORMAL_SAVE_KEY,'old','new');installed=true;},/保存を確認/);
 assert.equal(installed,false);assert.equal(backups(store)[0][1],'old');assert.equal(store.data.get(FORMAL_SAVE_KEY),'new');
 // The uncertain candidate must not be silently replaced by a stale retry.
 assert.throws(()=>commitMarketRulesUpdate(store,FORMAL_SAVE_KEY,'old','second'));
});

function restartHarness({raw=encode(fresh()),accept=true,legacyRecord=null,store=storage(raw)}={}){
 const start=app.indexOf('function startNew(){'),source=app.slice(start,app.indexOf('\n}\n',start)+2);
 const installed=[],errors=[],exports=[],context={preview:false,confirm:()=>accept,newNativeGame,initializeCaskSlots,initializeLedger,initializeHistoryRecord,initializeRecall,
  sessionText:(game,userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord)=>encode({game,userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord}),
  localStorage:store,SAVE_KEY:FORMAL_SAVE_KEY,lastSavedText:raw,legacyRecord,writeCandidate,commitMarketRulesUpdate,
  installSession:s=>installed.push(s),startShadow:()=>{},saveFailure:(e,phase)=>errors.push({e,phase}),exportRaw:raw=>exports.push(raw),
  newGameBackupKey:null,backupExport:{hidden:true},protectedRecordExports:()=>{}};
 const execute=()=>runInNewContext(source+'\nstartNew()',context);return {execute,context,installed,errors,exports,store};
}

test('cancelling explicit restart changes neither memory nor storage',()=>{
 const h=restartHarness({accept:false});assert.equal(h.execute(),false);assert.equal(h.installed.length,0);assert.deepEqual(h.store.writes,[]);assert.equal(h.errors.length,0);
});

test('new and existing sessions install only a validated written record that survives reload',()=>{
 for(const raw of [null,encode(fresh()),'{"version":7}','{broken']){
  const h=restartHarness({raw});assert.equal(h.execute(),true);assert.equal(h.errors.length,0);assert.equal(h.installed.length,1);
  assert.deepEqual(readSession(h.store.getItem(FORMAL_SAVE_KEY),options),JSON.parse(JSON.stringify(h.installed[0])));
  if(raw!==null)assert.equal(backups(h.store)[0][1],raw);
 }
});

test('old separate-key source is preserved and its concurrent change blocks restart',()=>{
 const legacyRecord={key:'sukimastock.ambertime.wholesale.v20',raw:'old-development-raw'},store=storage();store.data.set(legacyRecord.key,legacyRecord.raw);
 const h=restartHarness({raw:null,legacyRecord,store});assert.equal(h.execute(),true);assert.equal(store.getItem(legacyRecord.key),legacyRecord.raw);assert(!store.writes.some(([key])=>key===legacyRecord.key));
 const changed=storage();changed.data.set(legacyRecord.key,'other-tab');const blocked=restartHarness({raw:null,legacyRecord,store:changed});assert.equal(blocked.execute(),false);assert.equal(blocked.installed.length,0);assert.deepEqual(changed.writes,[]);
});

test('restart write failure does not install a fresh game or update lastSavedText',()=>{
 const store=storage('old');store.setItem=()=>{throw Object.assign(Error('quota'),{name:'QuotaExceededError'});};const h=restartHarness({raw:'old',store});
 assert.equal(h.execute(),false);assert.equal(h.installed.length,0);assert.equal(h.context.lastSavedText,'old');assert.equal(store.getItem(FORMAL_SAVE_KEY),'old');assert.equal(h.errors[0].phase,'新規開始');
});

test('protected raw backups and legacy originals remain exportable after reload from menu and recovery',()=>{
 const store=storage('new-current'),one=commitMarketRulesUpdate(storage('old raw'),FORMAL_SAVE_KEY,'old raw','new').backupKey,two=commitMarketRulesUpdate(storage('{broken'),FORMAL_SAVE_KEY,'{broken','new').backupKey;
 store.data.set(one,'old raw');store.data.set(two,'{broken');store.data.set('sukimastock.ambertime.placement-trial.v1',' legacy trial raw \n');store.data.set('sukimastock.ambertime.wholesale.v20','{unreadable wholesale');store.data.set('sukimastock.ambertime.wholesale.v200','ignore similar key');store.data.set('unrelated','private');store.data.set(FORMAL_SAVE_KEY+'.before-market-rules.v2.ignored','ignore');
 Object.defineProperty(store,'length',{get:()=>store.data.size});store.key=i=>[...store.data.keys()][i]??null;
 function element(){return {dataset:{},children:[],listeners:{},get childElementCount(){return this.children.length;},append(child){child.parent=this;this.children.push(child);},querySelector(){return this.children.find(child=>Object.hasOwn(child.dataset,'protectedRecords'));},remove(){this.parent.children=this.parent.children.filter(child=>child!==this);},addEventListener(type,fn){this.listeners[type]=fn;}};}
 const parents={'aux-panel':element(),recovery:element()},exports=[],errors=[],context={localStorage:store,SAVE_KEY:FORMAL_SAVE_KEY,$:id=>parents[id],document:{createElement:()=>element()},exportRaw:(raw,name)=>exports.push({raw,name}),storageNotice:e=>errors.push(e)};
 const start=app.indexOf('function protectedRecordExports(){'),source=app.slice(start,app.indexOf('\n}\n',start)+2);
 // A second invocation models rediscovery after the DOM/session has changed.
 for(let i=0;i<2;i++)runInNewContext(source+'\nprotectedRecordExports()',context);
 for(const parent of Object.values(parents)){
  assert.equal(parent.children.length,1);const list=parent.children[0];assert.equal(list.children.length,5);
  for(const button of list.children.slice(1))button.listeners.click();
 }
 assert.deepEqual(exports.map(x=>x.raw),['old raw','{broken',' legacy trial raw \n','{unreadable wholesale','old raw','{broken',' legacy trial raw \n','{unreadable wholesale']);assert(exports.every(x=>x.name.startsWith('ambertime-protected-')));assert.deepEqual(errors,[]);assert.deepEqual(store.writes,[]);
});
