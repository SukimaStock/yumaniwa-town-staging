import test from 'node:test';
import {FormalIdbCommitBoundary} from '../formal-idb-commit-boundary.mjs';
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
import {createFreshSession,inspectStartRecord,createSessionEntry,SESSION_ENTRY_BUILD} from '../session-entry.mjs';
import {makeEntryDiagnostic,formatEntryDiagnostic,ENTRY_DIAGNOSTIC_BUILD} from '../entry-diagnostics.mjs';
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

test('development migration still gives valid, old-version and unreadable raw records exact verified backups',()=>{
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

function entryElement(){return {dataset:{},children:[],listeners:{},hidden:false,disabled:false,textContent:'',open:false,
 get childElementCount(){return this.children.length;},append(child){child.parent=this;this.children.push(child);},
 querySelector(){return this.children.find(child=>Object.hasOwn(child.dataset,'protectedRecords'));},
 remove(){this.parent.children=this.parent.children.filter(child=>child!==this);},
 addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(){},focus(){},close(){this.open=false;}};}
function restartHarness({raw=encode(fresh()),store=storage(raw),playing=false}={}){
 const source=app.slice(app.indexOf('function clearEntryDiagnostic(){'),app.indexOf("$('entry-new').addEventListener"));
 const installed=[],errors=[],counts={created:0,read:0,encoded:0,stopped:0,rendered:0,scheduled:0,protected:0},nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,entryElement());return nodes.get(id);};
 const initialSources=()=>['sukimastock.ambertime.main.v1','sukimastock.ambertime.placement-trial.v1','sukimastock.ambertime.wholesale.v20'].map(key=>({key,text:store.getItem(key)}));
 const captured=initialSources();let durable=raw,revision=0,previous=null;
 const verifySources=()=>{if(JSON.stringify(initialSources())!==JSON.stringify(captured))throw Object.assign(Error('記録が更新されています。'),{code:'conflict'});};
 const adapter={status:{state:'ready'},get text(){return durable;},close(){},invalidate(){this.status.state='halted';},async verifyCurrent(expected){if(this.status.state!=='ready')throw Error('保存を確認できません。');verifySources();if(durable!==expected)throw Error('記録が更新されています。');},async startNew(text,{expectedRevision}){verifySources();assert.equal(expectedRevision,revision);if(store.failCommit)throw store.failCommit;readSession(text,options);previous=durable;durable=text;return {revision:++revision};}};
 const old=fresh(),context={preview:false,debugEnabled:false,nativeModel:D,seed:141,game:playing?old.game:null,modal:playing?{kind:'aux-panel'}:null,
  userPaused:true,canSave:true,runtimeHalted:false,debugSkipJob:null,sessionActive:playing,entryView:playing?'playing':'title',entryIntent:null,entryMessage:'',entrySnapshot:null,entryReturn:null,entryDiagnostic:null,entryOperation:'title-inspect',
  runtimeStarting:false,runtimeSaving:false,runtimeEpoch:0,idleSuspension:null,entrySources:captured,entryRaw:raw,entryUnreadable:false,mainStore:playing?adapter:null,commitBoundary:null,sessionEpoch:0,lastSavedText:raw,legacyRecord:null,newGameBackupKey:null,localStorage:store,SAVE_KEY:FORMAL_SAVE_KEY,sessionOptions:options,
  $:node,document:{body:{dataset:{}}},inspectStartRecord,createSessionEntry,makeEntryDiagnostic,formatEntryDiagnostic,
  entryVersions:{appBuild:SESSION_ENTRY_BUILD,sessionEntryBuild:SESSION_ENTRY_BUILD,diagnosticsBuild:ENTRY_DIAGNOSTIC_BUILD,formalFormat:8},
  createFreshSession:(...args)=>{counts.created++;return createFreshSession(...args);},
  sessionText:(game,userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord)=>{counts.encoded++;return encode({game,userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord});},
  readSession:(...args)=>{counts.read++;return readSession(...args);},writeCandidate,commitMarketRulesUpdate,
  recordSaveError:(error,phase)=>errors.push({error,phase}),protectedRecordExports:()=>counts.protected++,
  installSession:(session,{fresh})=>{installed.push({session,fresh});context.game=session.game;context.sessionActive=true;context.entryView='playing';context.entryReturn=null;},
  startShadow:()=>{},stopClock:()=>counts.stopped++,countdown:{cancel(){}},automaticNews:{update(){}},marketUI:{update(){},cancel(){}},placementUI:{cancel(){}},scene:{cancelDistillCompletion(){}},vaultPanels(){},
  render:()=>counts.rendered++,schedule:()=>counts.scheduled++,confirm:()=>true,
 };
 context.savingBusy=()=>context.runtimeSaving||!!context.commitBoundary?.status.busy;
 context.connectMainStore=(next,rev)=>{context.mainStore=next;context.commitBoundary=new FormalIdbCommitBoundary({revision:rev,write:(text,opts)=>next.startNew(text,opts),onHalt:()=>next.invalidate()});};
 if(playing)context.connectMainStore(adapter,revision);
 context.bootMainIdb=async()=>{verifySources();return {ok:true,adapter,text:durable,revision};};
 context.inspectMainIdb=async()=>({text:durable,sources:initialSources(),unreadable:false});
 runInNewContext(source+"\nglobalThis.entryApi={showTitle,startNew,cancelEntry,enterSession,inspectEntry,get controller(){return sessionEntry;}}",context);
 return {api:context.entryApi,context,installed,errors,counts,nodes,store,old,persisted:()=>durable,previous:()=>previous};
}

test('title only inspects bytes; it does not restore, create, save or start a game',()=>{
 for(const raw of [null,encode(fresh()),'{broken','{"version":7}']){
  const h=restartHarness({raw});h.api.showTitle();
  assert.equal(h.context.sessionActive,false);assert.equal(h.context.entryView,'title');assert.equal(h.context.game,null);
  assert.equal(h.counts.created,0);assert.equal(h.counts.read,0);assert.equal(h.counts.encoded,0);assert.equal(h.counts.scheduled,0);
  assert.deepEqual(h.store.writes,[]);assert.equal(h.nodes.get('entry-continue').hidden,raw===null||raw==='{broken'||raw==='{"version":7}');
 }
});

test('normal boot reaches the title without invoking creator, reader or persistence',async()=>{
 const h=restartHarness();
 Object.assign(h.context,{shadowObserver:null,distillRoom:{reset(){}},scene:{resetMotion(){}},newNativeGame(){throw Error('normal boot must not create');}});
 const source=app.slice(app.indexOf('async function boot(){'),app.indexOf('window.amberPlacement='));
 await runInNewContext(source+'\nboot()',h.context);
 assert.equal(h.context.entryView,'title');assert.equal(h.context.sessionActive,false);
 assert.equal(h.counts.created,0);assert.equal(h.counts.read,0);assert.equal(h.counts.encoded,0);assert.equal(h.counts.scheduled,0);assert.deepEqual(h.store.writes,[]);
});

test('unavailable storage is an error state rather than a save-free new game',()=>{
 const h=restartHarness();h.store.getItem=()=>{throw Object.assign(Error('denied'),{name:'SecurityError'});};
 h.api.showTitle();assert.equal(h.context.entrySnapshot,null);assert.equal(h.nodes.get('entry-new').disabled,true);
 assert.match(h.context.entryMessage,/確認できません/);assert.equal(h.counts.created,0);assert.deepEqual(h.store.writes,[]);
});

test('title and in-game restart share confirmation and leave the old session untouched on back',async()=>{
 for(const playing of [false,true]){
  const h=restartHarness({playing}),before=JSON.stringify(h.context.game),flags=[h.context.userPaused,h.context.canSave,h.context.runtimeHalted];
  if(!playing)h.api.showTitle();assert.equal(h.api.startNew(),true);assert.equal(h.context.entryView,'confirm');assert.equal(h.context.sessionActive,false);
  assert.equal(JSON.stringify(h.context.game),before);assert.equal(h.counts.created,0);assert.deepEqual(h.store.writes,[]);
  await h.api.cancelEntry();assert.equal(JSON.stringify(h.context.game),before);assert.deepEqual(h.store.writes,[]);assert.equal(h.installed.length,0);
  assert.equal(h.context.sessionActive,playing);assert.deepEqual([h.context.userPaused,h.context.canSave,h.context.runtimeHalted],flags);
  assert.equal(h.context.entryView,playing?'playing':'title');
 }
});

test('actual title/menu entry installs only validated committed sessions that survive reload',async()=>{
 for(const playing of [false,true])for(const raw of [null,encode(fresh()),'{"version":7}','{broken']){
  const h=restartHarness({raw,playing});if(!playing)h.api.showTitle();const started=h.api.startNew();
  assert.equal(await (raw===null?started:h.api.enterSession('new')),true);assert.equal(h.errors.length,0);assert.equal(h.installed.length,1);
  assert.deepEqual(readSession(h.persisted(),options),h.installed[0].session);
  assert.equal(h.counts.created,1);assert.equal(h.counts.encoded,1);assert.equal(backups(h.store).length,0);assert.equal(h.store.getItem(FORMAL_SAVE_KEY),raw,'legacy original retained');assert.equal(h.previous(),raw);
 }
});

test('actual continue calls official reader and does not write or create a replacement',async()=>{
 const h=restartHarness();h.api.showTitle();assert.equal(await h.api.enterSession('continue'),true);
 assert.equal(h.counts.read,1);assert.equal(h.counts.created,0);assert.equal(h.installed[0].fresh,false);assert.deepEqual(h.store.writes,[]);
 const broken=restartHarness({raw:'{broken'});broken.api.showTitle();assert.equal(await broken.api.enterSession('continue'),false);
 assert.equal(broken.installed.length,0);assert.equal(broken.counts.created,0);assert.equal(broken.context.entryView,'error');assert.deepEqual(broken.store.writes,[]);
});

test('old separate-key source is preserved and concurrent changes block confirmed restart',async()=>{
 const key='sukimastock.ambertime.wholesale.v20',store=storage();store.data.set(key,'old-development-raw');
 const h=restartHarness({raw:null,store});h.api.showTitle();h.api.startNew();assert.equal(await h.api.enterSession('new'),true);
 assert.equal(store.getItem(key),'old-development-raw');assert(!store.writes.some(([k])=>k===key));
 const changed=storage();changed.data.set(key,'old-development-raw');const blocked=restartHarness({raw:null,store:changed});blocked.api.showTitle();blocked.api.startNew();changed.data.set(key,'other-tab');
 assert.equal(await blocked.api.enterSession('new'),false);assert.equal(blocked.installed.length,0);assert.deepEqual(changed.writes,[]);
});

test('actual restart write failure does not install or change old memory/lastSavedText',async()=>{
 const raw=encode(fresh()),store=storage(raw);store.failCommit=Object.assign(Error('quota'),{name:'QuotaExceededError'});
 const h=restartHarness({raw,store,playing:true}),before=JSON.stringify(h.context.game);h.api.startNew();
 assert.equal(await h.api.enterSession('new'),false);assert.equal(h.installed.length,0);assert.equal(h.context.lastSavedText,raw);assert.equal(store.getItem(FORMAL_SAVE_KEY),raw);
 assert.equal(JSON.stringify(h.context.game),before);assert.equal(h.context.entryView,'error');assert.equal(h.errors[0].phase,'formal-write');
 assert.equal(h.context.entryDiagnostic.operation,'new-menu');assert.equal(h.context.entryDiagnostic.stage,'formal-write');
 assert.equal(h.context.entryDiagnostic.exception.name,'QuotaExceededError');assert.equal(h.context.entryDiagnostic.formalState,'uncertain','cached prior text cannot prove an async write outcome');assert.equal(h.persisted(),raw,'injected precommit failure retained simulated durable bytes');
 assert.equal(h.nodes.get('entry-error-details').hidden,false);assert.match(h.nodes.get('entry-diagnostic-text').textContent,/正式書込み/);
 await h.api.cancelEntry();assert.equal(h.context.sessionActive,false,'halted write boundary cannot resume stale cached play');assert.equal(h.context.entryView,'error');assert.equal(JSON.stringify(h.context.game),before);
});

test('inspecting a newer tab does not replace the active baseline or allow stale cancel-resume',async()=>{
 for(const timing of ['before-inspect','after-inspect']){
  const h=restartHarness({playing:true}),old=h.context.lastSavedText,before=JSON.stringify(h.context.game);
  if(timing==='before-inspect')h.store.data.set(FORMAL_SAVE_KEY,'newer tab');
  h.api.startNew();assert.equal(h.context.lastSavedText,old);assert.equal(h.context.entryReturn.savedText,old);
  if(timing==='after-inspect')h.store.data.set(FORMAL_SAVE_KEY,'newer tab');
  await h.api.cancelEntry();assert.equal(h.context.entryView,'error');assert.equal(h.context.sessionActive,false);
  assert.match(h.context.entryMessage,/更新/);assert.equal(JSON.stringify(h.context.game),before);assert.deepEqual(h.store.writes,[]);assert.equal(h.counts.scheduled,0);
 }
});

test('title or preparation visibility suspension never saves a game',async()=>{
 const start=app.indexOf('function suspend(){'),end=app.indexOf("document.addEventListener('visibilitychange'",start),source=app.slice(start,end);
 for(const preparing of [false,true]){
  const h=restartHarness();h.api.showTitle();if(preparing){h.api.startNew();var pending=h.api.enterSession('new');}
  let saves=0;h.context.scene={cancelDistillCompletion(){}};h.context.save=()=>{saves++;};
  runInNewContext(source+'\nsuspend();',h.context);
  if(preparing){assert.equal(await pending,false);assert.equal(h.context.entryView,'confirm');}
  assert.equal(saves,0);assert.deepEqual(h.store.writes,[]);assert.equal(h.installed.length,0);assert.equal(h.counts.scheduled,0);
 }
});

test('suspending continue returns to title and never exposes a new-game confirmation',async()=>{
 const h=restartHarness();h.api.showTitle();const pending=h.api.enterSession('continue');
 const start=app.indexOf('function suspend(){'),end=app.indexOf("document.addEventListener('visibilitychange'",start);
 runInNewContext(app.slice(start,end)+'\nsuspend()',h.context);
 assert.equal(await pending,false);assert.equal(h.context.entryView,'title');
 assert.equal(h.nodes.get('entry-confirm-copy').hidden,true);assert.equal(h.nodes.get('entry-begin').hidden,true);
 assert.equal(h.installed.length,0);assert.deepEqual(h.store.writes,[]);
});

test('an old debug skip callback cannot progress while session entry is open',()=>{
 const h=restartHarness({playing:true}),job={timer:7};let cleared;
 h.context.debugSkipJob=job;h.context.clearTimeout=value=>{cleared=value;};h.api.startNew();
 assert.equal(cleared,7);assert.equal(h.context.debugSkipJob,null);
 const start=app.indexOf('async function runDebugSkipChunk(job){'),end=app.indexOf('\nfunction ',start+1),source=app.slice(start,end);
 h.context.staleJob=job;h.context.debugSkipMonth=()=>{throw Error('must not progress');};
 runInNewContext(source+'\nrunDebugSkipChunk(staleJob)',h.context);
 assert.deepEqual(h.store.writes,[]);assert.equal(h.installed.length,0);
});

test('an import completed after entry or session replacement cannot read, save or install',async()=>{
 const start=app.indexOf('async function importRecord(file){'),end=app.indexOf("$('restore-file').addEventListener",start),source=app.slice(start,end);
 for(const change of ['entry','epoch']){
  const h=restartHarness({playing:true});Object.assign(h.context,{debugEnabled:true,sessionEpoch:1});
  let resolve;h.context.pendingFile={text:()=>new Promise(done=>{resolve=done;})};
  const promise=runInNewContext(source+'\nimportRecord(pendingFile)',h.context);
  if(change==='entry'){assert.equal(h.api.startNew(),false,'entry cannot cross an active import');h.context.sessionActive=false;}else h.context.sessionEpoch++;
  resolve(encode(fresh()));assert.equal(await promise,false);
  assert.equal(h.counts.read,0);assert.equal(h.installed.length,0);assert.deepEqual(h.store.writes,[]);
 }
});

test('pagehide, hidden visibility and BFCache pageshow use guarded suspension/resumption',()=>{
 const h=restartHarness();h.api.showTitle();let saves=0;
 const docListeners={},winListeners={};
 Object.assign(h.context.document,{hidden:true,addEventListener:(name,fn)=>{docListeners[name]=fn;}});
 h.context.window={addEventListener:(name,fn)=>{winListeners[name]=fn;}};
 h.context.scene={cancelDistillCompletion(){}};
 h.context.save=()=>saves++;
 const start=app.indexOf('function suspend(){'),end=app.indexOf("window.addEventListener('storage'",start);
 runInNewContext(app.slice(start,end),h.context);
 docListeners.visibilitychange();winListeners.pagehide();winListeners.pageshow({persisted:true});
 h.context.document.hidden=false;docListeners.visibilitychange();
 assert.equal(saves,0);assert.equal(h.counts.scheduled,0);assert.deepEqual(h.store.writes,[]);
});

test('protected raw backups and legacy originals remain exportable after reload from menu and recovery',()=>{
 const store=storage('new-current'),one=commitMarketRulesUpdate(storage('old raw'),FORMAL_SAVE_KEY,'old raw','new').backupKey,two=commitMarketRulesUpdate(storage('{broken'),FORMAL_SAVE_KEY,'{broken','new').backupKey;
 store.data.set(one,'old raw');store.data.set(two,'{broken');store.data.set('sukimastock.ambertime.placement-trial.v1',' legacy trial raw \n');store.data.set('sukimastock.ambertime.wholesale.v20','{unreadable wholesale');store.data.set('sukimastock.ambertime.wholesale.v200','ignore similar key');store.data.set('unrelated','private');store.data.set(FORMAL_SAVE_KEY+'.before-market-rules.v2.ignored','ignore');
 Object.defineProperty(store,'length',{get:()=>store.data.size});store.key=i=>[...store.data.keys()][i]??null;
 function element(){return {dataset:{},children:[],listeners:{},get childElementCount(){return this.children.length;},append(child){child.parent=this;this.children.push(child);},querySelector(){return this.children.find(child=>Object.hasOwn(child.dataset,'protectedRecords'));},remove(){this.parent.children=this.parent.children.filter(child=>child!==this);},addEventListener(type,fn){this.listeners[type]=fn;}};}
 const parents={'aux-panel':element(),recovery:element(),'entry-records':element()},exports=[],errors=[],context={debugEnabled:true,entryDiagnostic:null,entryView:'title',localStorage:store,SAVE_KEY:FORMAL_SAVE_KEY,$:id=>parents[id],document:{createElement:()=>element()},exportRaw:(raw,name)=>exports.push({raw,name}),storageNotice:e=>errors.push(e)};
 const start=app.indexOf('function protectedRecordExports(){'),source=app.slice(start,app.indexOf('\n}\n',start)+2);
 // A second invocation models rediscovery after the DOM/session has changed.
 for(let i=0;i<2;i++)runInNewContext(source+'\nprotectedRecordExports()',context);
 for(const parent of Object.values(parents)){
  assert.equal(parent.children.length,1);const list=parent.children[0];assert.equal(list.children.length,5);
  for(const button of list.children.slice(1))button.listeners.click();
 }
 assert.deepEqual(exports.map(x=>x.raw),Array(3).fill(['old raw','{broken',' legacy trial raw \n','{unreadable wholesale']).flat());assert(exports.every(x=>x.name.startsWith('ambertime-protected-')));assert.deepEqual(errors,[]);assert.deepEqual(store.writes,[]);
});

test('normal title keeps export and protected-record tools outside ordinary current-save entry',async()=>{
 const h=restartHarness();h.api.showTitle();assert.equal(h.nodes.get('entry-export').hidden,true);
 h.api.startNew();assert.equal(h.nodes.get('entry-confirm-copy').textContent,'今の記録を消して、はじめから遊びますか？');
 assert.equal(h.nodes.get('entry-export').hidden,true);
 h.context.debugEnabled=true;await h.api.cancelEntry();assert.equal(h.nodes.get('entry-export').hidden,false);
});
