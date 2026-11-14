import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import {expandFormalGame} from '../save-codec.mjs';
import {createWarehouseRoomController} from '../warehouse-room-controller.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
import {createDistillRoomController} from '../distill-room-controller.mjs';
import {StartCountdown} from '../start-countdown.mjs';
import {manualCards,chooseManualCard,brewingPanelState} from '../brewing-cards.mjs';
import {distillToolsView,rangeRestartAvailable} from '../distill-tools-view.mjs';
import {manualCompletedRuns} from '../distill-learning.mjs';
import {distillationReadout} from '../spirit-view.mjs';
import {writeCandidate,serializeSession} from '../placement-save.mjs';
import {automaticEvents} from '../event-notices.mjs';
import {ECONOMY_PARAMETERS as P} from '../economy-parameters.mjs';
import {extractFunction,encodeSession,options as sessionOptions} from './formal-idb-runtime-harness.mjs';
import {readSession,serializeSession as serializeCurrentSession} from '../development-save.mjs';
import {createObservedModel} from '../recall/operations.mjs';
import {initializeRecall,advanceRecall,prepareRecall} from '../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../recent-ledger.mjs';
import {FormalIdbCommitBoundary} from '../formal-idb-commit-boundary.mjs';

const BASE='f7ba8023706be803b1711b3e3374b7e1bf83c4d9';
const previous=execFileSync('git',['show',BASE+':works/ambertime/shop-app.mjs'],{encoding:'utf8',maxBuffer:4e6});
assert.equal(createHash('sha256').update(previous).digest('hex'),'604208174263d5a804b92e764a9eba0df76f0cb7b80b8dca95827dc8c8769913','immutable pre-R3 application');
const current=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
const extract=(source,name)=>extractFunction(name,source);
function oldPreparation(){
 const context={};vm.createContext(context);
 vm.runInContext(previous.split('\n').find(x=>x.startsWith('let distillPrepared=')),context);
 const open=previous.match(/const preparedAtOpen=distillPrepared;distillPrepared=false;/)[0];
 const confirm=previous.match(/if\(a==='flavor-start'&&kind==='flavor-cards'\)\{(.*?)modal=null;/)[1];
 const cancel=previous.match(/distillPrepared=!!\(modal.preparedAtOpen&&confirmed&&confirmed.malt===draft.malt&&confirmed.ferment===draft.ferment\);/)[0];
 const invalidate=previous.split('\n').find(x=>x.includes("if(game.still.phase!=='ready'||confirmedBrewing?.batch"));
 return {
  get confirmation(){return vm.runInContext('confirmedBrewing',context);},
  isPreparedFor(batch){context.batch=batch;return vm.runInContext('distillPrepared&&preparedForDistillation===batch',context);},
  beginEdit(){return vm.runInContext('(function(){'+open+'return preparedAtOpen;})()',context);},
  confirm(cards,batch){Object.assign(context,{game:{core:{lastDistillation:batch}},manualCards:()=>cards});vm.runInContext(confirm,context);},
  cancelEdit(preparedAtOpen,choice,draft){Object.assign(context,{modal:{preparedAtOpen},confirmed:choice,draft});vm.runInContext(cancel,context);},
  clearPrepared(){vm.runInContext('distillPrepared=false;',context);},
  invalidate(phase,batch){context.game={still:{phase},core:{lastDistillation:batch}};vm.runInContext(invalidate,context);},
  reset(){vm.runInContext('distillPrepared=false;confirmedBrewing=null;',context);}
 };
}
const view=controller=>plain({confirmation:controller.confirmation,prepared:[null,undefined,0,1,2,3].map(batch=>controller.isPreparedFor(batch))});
test('R3 confirmation state sequences match pinned original inline statements, including dormant batch and cancellation quirks',()=>{
 const old=oldPreparation(),next=createDistillRoomController(),trace=[];
 const call=(name,...args)=>{assert.deepEqual(plain(next[name](...args)??null),plain(old[name](...args)??null),name);assert.deepEqual(view(next),view(old),name);trace.push(view(next));};
 assert.deepEqual(view(next),view(old));
 for(const batch of [0,1,2])for(const malt of ['plain','peat'])for(const ferment of ['short','long']){
  const cards=Object.freeze({malt,ferment});call('confirm',cards,batch);call('invalidate','ready',batch);
  const saved=next.beginEdit(),oldSaved=old.beginEdit();assert.equal(saved,oldSaved);assert.deepEqual(view(next),view(old));
  call('cancelEdit',saved,{...cards,editable:true},cards);
  call('beginEdit');call('cancelEdit',true,cards,{...cards,malt:malt==='plain'?'peat':'plain'});
  assert.equal(next.confirmation.malt,malt,'changed cancellation retains old confirmed label');
  call('beginEdit');call('cancelEdit',true,cards,cards);
  call('invalidate','distilling',batch);assert.equal(next.confirmation,null);
  call('reset');call('cancelEdit',true,cards,cards);assert.equal(next.isPreparedFor(batch),true,'reset preserves dormant marker exactly as old code');
  call('clearPrepared');call('invalidate','ready',batch+1);call('cancelEdit',false,cards,cards);
 }
 assert(trace.length>100);
});
test('R3 controller reads explicit projection inputs only; confirmation is copied and formal state/save bytes remain unchanged',()=>{
 const state=D.newMarketRulesDistillery(42),raw=D.serializeDistillery(state),cards=Object.freeze(manualCards(state)),controller=createDistillRoomController();
 controller.confirm(cards,state.core.lastDistillation);assert.notEqual(controller.confirmation,cards);assert.deepEqual(controller.confirmation,{...cards,batch:state.core.lastDistillation});
 const confirmation=controller.confirmation;assert.equal(controller.beginEdit(),true);controller.cancelEdit(true,brewingPanelState(state,confirmation),cards);
 assert(controller.isPreparedFor(state.core.lastDistillation));controller.invalidate('ready',state.core.lastDistillation+1);assert.equal(controller.confirmation,null);
 assert.equal(D.serializeDistillery(state),raw);assert.deepEqual(manualCards(state),cards);
 const source=fs.readFileSync(new URL('../distill-room-controller.mjs',import.meta.url),'utf8');
 const forbidden=()=>{throw Error('unexpected effect dependency');};
 const ctx={document:new Proxy({},{get:forbidden}),localStorage:new Proxy({},{get:forbidden}),performance:new Proxy({},{get:forbidden}),setTimeout:forbidden,Date:forbidden};
 const make=vm.runInNewContext(source.replace('export function','function')+'\ncreateDistillRoomController;',ctx),isolated=make();isolated.confirm(cards,0);isolated.beginEdit();isolated.cancelEdit(true,cards,cards);isolated.invalidate('ready',0);isolated.clearPrepared();isolated.reset();
});

// Execute the original/current application handlers and real formal model/save
// APIs. DOM, whole-app schedule and notice-screen ports are controlled adapters;
// this is an ordered-effect comparison, complemented by browser/full replay tests.
function fixtureSession(game){
 // This is synthetic fixture setup, not a migration path. Native legacy/staff
 // fixtures without placement are read-only projections, never v8 boot sources.
 if(!game.placement)return null;
 const raw=D.serializeDistillery(game);let historyRecord,recallRecord;
 D.replayDistilleryOperations(game,({operation,index,before,after})=>{
  const state=(facts,count)=>({...facts,origin:game.origin,operations:game.operations.slice(0,count)}),next=state(after,index+1);
  historyRecord=operation?advanceHistoryRecord(state(before,index),next,historyRecord):initializeHistoryRecord(state(after,0));
  if(operation?.key==='enable-market-rules')recallRecord=initializeRecall(next);
  else if(recallRecord)recallRecord=advanceRecall(state(before,index),next,recallRecord);
 });
 assert(recallRecord,'fixture must include pristine market initialization before play');
 assert.equal(D.serializeDistillery(game),raw,'fixture sidecars never rewrite native bytes');
 return {game,userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:o=>D.replayDistilleryOperations(game,o)}),historyRecord,recallRecord};
}
function appHost(source,{state=D.newMarketRulesDistillery(42),preview=false,restored=false}={}){
 const candidate=source===current,log=[],timers=new Map(),micro=[],nodes=new Map(),pending=[];let timerId=0,mode='ok',revision=1;
 const initialSession=candidate?fixtureSession(state):null;
 let stored=initialSession?encodeSession(initialSession):JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(state)),userPaused:false,elapsed:0});
 const node=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},hidden:false,textContent:'',open:false,classList:{toggle(){}},setAttribute(){},querySelector(){return {focus(){}};}});return nodes.get(id);};
 const model={...D};for(const name of ['selectFlavorCards','startDistillation','startRangeDistillation','beginCollection','stopDistillation','restartRangeDistillation','fillBarrel'])model[name]=(...args)=>{log.push('model:'+name);if(mode==='model-throw')throw Error('model refused');return D[name](...args);};
 model.serializeDistillery=s=>{log.push('serialize');return D.serializeDistillery(s);};
 const storage={getItem(){log.push('storage:read');return stored;},setItem(k,value){log.push('storage:write');if(mode==='quota')throw Error('quota');if(mode!=='refuse')stored=value;}};
 const ctx={initializeCaskSlots,reconcileCaskSlots,scene:{isDistillCompletion:()=>false,startDistillCompletion:()=>false,cancelDistillCompletion(){}},D:model,P,createDistillRoomController,manualCards,chooseManualCard,brewingPanelState,distillToolsView,rangeRestartAvailable,manualCompletedRuns,distillationReadout,writeCandidate,serializeSession,
  snapshotRaw:D.serializeDistillery,assertNativeReplacement:(actual,expected)=>assert.equal(actual,expected,'native monthly replacement bytes'),initial:state,initialRaw:stored,initialPreview:preview,restored,$:node,document:{hidden:false,activeElement:null},T:{minimumStop:30,monthMs:6000,distillStepMs:100},localStorage:storage,SAVE_KEY:'formal',
  stopClock(){log.push('clock:stop');},schedule(){log.push('clock:schedule');},message:text=>log.push(['message',text]),storageNotice:text=>log.push(['storageNotice',text]),
  automaticEvents,automaticNews:{push:events=>log.push(['notices',plain(events)])},caskName:String,soldOutLabel:()=>'',noteMapReach:()=>log.push('map:reach'),
  placementUI:{reset:()=>log.push('placement:reset')},marketUI:{cancel:()=>log.push('market:cancel')},comparisonKinds:[],endTaste(){},generationState:()=>({phase:'working'}),
  vaultPanels(){},showStaffOpportunity(){},showShopOffer(){},showGeneration(){},showInitialMapNotice(){},queueMicrotask:fn=>micro.push(fn)};
 if(candidate)Object.assign(ctx,{nativeModel:model,createObservedModel,advanceRecall,prepareRecall,initializeHistoryRecord,advanceHistoryRecord,migrateRecentLedger,advanceRecentLedger,FormalIdbCommitBoundary,initialSession,
  serializeSession:serializeCurrentSession,legacyRecord:null,lastSaveError:null,debugSkipJob:null,dialogueNotice:{reset(){}},noteDialogueCommit:()=>log.push('dialogue:commit'),m0:{mode:'half'},
  adapter:{state:'ready',get status(){return {state:this.state,revision};},invalidate(){this.state='halted';},async saveCandidate(text,{expectedRevision}){
   assert(initialSession,'historical native projection must never write a current formal save');
   assert.equal(expectedRevision,revision);writeCandidate(storage,'formal',vm.runInContext('lastSavedText',ctx),text);
   const session=readSession(stored,sessionOptions);assert.equal(encodeSession(session),stored,'current durable bytes round-trip through the unchanged formal reader');
   return {ok:true,revision:++revision,text:stored,session};
  }}});
 ctx.StartCountdown=function(options){return new StartCountdown({...options,setTimer(fn,ms){const id=++timerId;timers.set(id,fn);log.push(['countdown:timer',ms]);return id;},clearTimer(id){timers.delete(id);log.push('countdown:clear');}});};
 vm.createContext(ctx);
 const sync=extract(source,'syncModal'),endSync=sync.indexOf(' if(!modal){vaultPanels();');assert(endSync>0);
 const render=extract(source,'render'),endRender=render.indexOf(' syncModal();');assert(endRender>0);
 const renderPrefix=render.slice(render.indexOf('{')+1,endRender+' syncModal();'.length);
 const openBody=source.match(/^\$\('start-distill'\)\.addEventListener\('click',\(\)=>\{(.*)\}\);$/m)[1];
 const action=a=>source.split('\n').find(x=>x.startsWith(" if(a==='"+a+"'"));
 const init=candidate?'const distillRoom=createDistillRoomController();':'let distillPrepared=false,preparedForDistillation=null,confirmedBrewing=null;';
 const countdown=source.split('\n').find(x=>x.startsWith('const countdown=new StartCountdown('));
 const reset=candidate?'distillRoom.reset();':'distillPrepared=false;confirmedBrewing=null;';
 vm.runInContext(`let game=initial,room='distill',modal=null,userPaused=false,canSave=!initialPreview,preview=initialPreview,lastSavedText=initialRaw,elapsed=0,runtimeHalted=false,selectedCaskId=null,marketEditing=false,deliveryNotice='',shownFillSpiritId=restored&&game.still.phase==='filling'?game.core.spirit.id:null,modalReturnFocus=null,modalReturnObject=null;
 let caskSlots=initializeCaskSlots(game),migrationPending=null,committedSession={game,userPaused,elapsed,caskSlots};
 ${candidate?source.slice(source.indexOf('let recallRecord=null,'),source.indexOf("import {SHOPS}"))+`\n${source.slice(source.indexOf('let mainStore=null,'),source.indexOf('let debugSkipJob='))}
 let recentLedger=initialSession?.recentLedger??null,historyRecord=initialSession?.historyRecord??null;
 pendingRecall=recallRecord=initialSession?.recallRecord??null;committedSession={game,userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord};runtimeStarting=false;
 const initializeLedger=next=>migrateRecentLedger(next,{replay:observer=>D.replayDistilleryOperations(next,observer)});`:''}
 ${source.includes('createWarehouseRoomController')?'const warehouseRoom=createWarehouseRoomController();':''}\n ${init}\n${countdown}\n${source.split('\n').find(x=>x.startsWith('const manualDistilling='))}
 function render(){recordRender();${renderPrefix}}
 ${sync.slice(0,endSync)+'\n}'}
 ${[...(source.includes('function saveCandidate(')?['rememberCommitted','restoreCommitted','recoveryAccess','saveFailure','sessionText','saveCandidate']:[]),...(candidate?['recordSaveError','candidateLedger','candidateHistory','publishCandidate','connectMainStore']:[]),'save','act','prepareDistillation','startFromLever','currentDistillTools','finishDistillation','commitFill','openModal','closeModal','selectRoom','endTaste'].map(name=>extract(source,name)).join('\n')}
 ${candidate?'connectMainStore(adapter,1);':''}
 function openBrewing(){${openBody}}
 function card(group,id){const a='flavor-card',kind=modal?.kind,b={dataset:{group,id}};${action('flavor-card')}}
 function confirmBrewing(){const a='flavor-start',kind=modal?.kind;${action('flavor-start')}}
 function fillSelect(type){const a='fill-select',kind=modal?.kind,b={dataset:{id:type}};${action('fill-select')}}
 async function fill(){const a='fill',kind=modal?.kind,b={dataset:{id:modal?.fillType}};${action('fill')}}
 globalThis.api={openBrewing,card,confirmBrewing,startFromLever,finishDistillation,openModal,closeModal,selectRoom,fillSelect,fill,render,
  resetUI(){${reset}},cancelCountdown(){countdown.cancel();},tools:currentDistillTools,
  stepTo(n){while(game.still.distillation.progress<n)game=D.distillStep(game);},
  // The monthly fixture transition now crosses the real durable action boundary.
  replaceGame(s){return act(before=>{const next=D.tickDistillery(before);assertNativeReplacement(snapshotRaw(next),snapshotRaw(s));return next;});},setHidden(value){document.hidden=value;render();},
  result(){return {raw:snapshotRaw(game),modal,room,userPaused,canSave,shownFillSpiritId,countdown:countdown.value,confirmation:${candidate?'distillRoom.confirmation':'confirmedBrewing'},prepared:${candidate?'distillRoom.isPreparedFor(game.core.lastDistillation)':'distillPrepared&&preparedForDistillation===game.core.lastDistillation'},tools:currentDistillTools()};}};`,Object.assign(ctx,{createWarehouseRoomController,recordRender:()=>log.push('render')}));
 // DOM listeners and StartCountdown intentionally discard their return values.
 // Track the real async actions so comparisons happen after durable completion,
 // without rewriting a handler or replacing the candidate's save/sidecar logic.
 if(candidate)for(const name of ['act','commitFill']){const action=ctx[name];ctx[name]=(...args)=>{const task=action(...args);pending.push(task);return task;};}
 const flush=async()=>{while(micro.length||pending.length){while(micro.length)micro.shift()();if(pending.length)await Promise.all(pending.splice(0));}};
 return {api:ctx.api,log,state:()=>ctx.api.result().raw,stored:()=>stored,
  async invoke(name,...args){const out=await ctx.api[name](...args);await flush();return out;},
  async tick(){const first=timers.entries().next().value;assert(first,'countdown timer');timers.delete(first[0]);await first[1]();await flush();},
  fail(kind){mode=kind;if(kind==='conflict')stored='external-save';},
  result(){const out=ctx.api.result();return plain({...out,stored,log:[...log]});}};
}
function checkedB2(actual,baseline,tag,failed){
 const normalize=text=>{if(text==='external-save')return text;const v=JSON.parse(text);if(v.version===8){const session=readSession(text,sessionOptions);assert.equal(encodeSession(session),text,'exact v8 formal bytes');return JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(session.game)),userPaused:session.userPaused,elapsed:session.elapsed});}if(v.version===3||v.version===4){v.game=JSON.parse(expandFormalGame(v.game));v.version=2;delete v.caskSlots;}return JSON.stringify(v);};
 if(!failed){for(const key of Object.keys(baseline).filter(k=>!['stored','log','nodes'].includes(k)))assert.deepEqual(actual[key],baseline[key],tag+':'+key);assert.equal(normalize(actual.stored),normalize(baseline.stored),tag+':durable formal state');}
 const writes=actual.log.map((x,i)=>x==='storage:write'?i:-1).filter(i=>i>=0);for(let i=0;i<actual.log.length;i++)if(Array.isArray(actual.log[i])&&actual.log[i][0]==='notices')assert(writes.some(w=>w<i),'success notice follows durable write');
}
function pair(options){const a=appHost(previous,options),b=appHost(current,options),rows=[];let failed=false;
 const compare=tag=>{const before=a.result(),after=b.result();checkedB2(after,before,tag,failed);rows.push({tag,raw:after.raw,stored:after.stored,modal:after.modal,prepared:after.prepared});return after;};
 const call=async(name,...args)=>{await a.invoke(name,...args);await b.invoke(name,...args);return compare(name);};
 return {a,b,rows,call,compare,async tick(){await a.tick();await b.tick();return compare('countdown tick');},fail(mode){failed=true;a.fail(mode);b.fail(mode);}};
}
test('R3 actual root brewing open/card/confirm/cancel preserves formal selection timing and effect order',async()=>{
 const p=pair();const initial=p.compare('initial');(await p.call('openBrewing'));const chosen=(await p.call('card','malt','peat'));
 assert.notEqual(chosen.raw,initial.raw);assert(chosen.log.includes('storage:write'));
 const writes=chosen.log.filter(x=>x==='storage:write').length,confirmed=(await p.call('confirmBrewing'));assert.equal(confirmed.raw,chosen.raw);assert.equal(confirmed.log.filter(x=>x==='storage:write').length,writes,'confirm does not save');assert(confirmed.prepared);
 (await p.call('openBrewing'));const changed=(await p.call('card','malt','plain'));const cancelled=(await p.call('closeModal'));assert.equal(cancelled.raw,changed.raw);assert(!cancelled.prepared);assert.equal(cancelled.confirmation.malt,'peat');
 (await p.call('openBrewing'));(await p.call('card','malt','peat'));(await p.call('confirmBrewing'));(await p.call('openBrewing'));(await p.call('card','malt','plain'));(await p.call('card','malt','peat'));assert((await p.call('closeModal')).prepared,'changed back restores prepared while keeping both formal selections');
 const selected=p.compare('before cancel count');(await p.call('startFromLever'));assert.equal(p.compare('countdown only').raw,selected.raw);(await p.call('cancelCountdown'));assert.equal(p.compare('cancel no operation').raw,selected.raw);assert(p.compare('cancel retains preparation').prepared);
});
test('R3 actual root countdown, cut, integrated result, cask selection and next batch keep every ordered effect and save',async()=>{
 const p=pair();(await p.call('openBrewing'));(await p.call('confirmBrewing'));(await p.call('startFromLever'));assert.equal((await p.tick()).countdown,2);assert.equal((await p.tick()).countdown,1);const started=(await p.tick());assert.equal(JSON.parse(started.raw).still.phase,'distilling');assert(!started.prepared);
 (await p.call('finishDistillation'));(await p.call('stepTo',11));const tooShort=p.compare('min12 before');assert.equal((await p.call('finishDistillation')).raw,tooShort.raw);(await p.call('stepTo',12));const stopped=(await p.call('finishDistillation'));assert.equal(stopped.modal.kind,'fill');assert.equal(JSON.parse(stopped.raw).still.phase,'filling');
 (await p.call('closeModal'));assert.equal((await p.call('render')).modal,null,'result never opens twice');(await p.call('openModal','fill'));const beforeSelect=p.compare('before cask');assert.equal((await p.call('fillSelect','refill')).raw,beforeSelect.raw);const filled=(await p.call('fill'));assert.equal(filled.room,'warehouse');assert.equal(filled.modal,null);assert.equal(JSON.parse(filled.raw).core.casks.length,1);
 const following=D.tickDistillery(D.restoreDistillery(filled.raw));assert(D.canStart(following).ok,'next brewing is available after the existing monthly boundary');(await p.call('replaceGame',following));(await p.call('render'));
 (await p.call('selectRoom','distill'));assert(!p.compare('next batch').prepared);(await p.call('openBrewing'));(await p.call('confirmBrewing'));assert(p.compare('next confirmation').prepared);
});
test('R3 generic start/stop failures and candidate fill failures retain their distinct memory/save/notice policies',async()=>{
 for(const mode of ['quota','refuse','conflict','model-throw']){
  const p=pair();(await p.call('openBrewing'));(await p.call('confirmBrewing'));(await p.call('startFromLever'));p.fail(mode);(await p.tick());(await p.tick());const result=(await p.tick());
  assert.equal(JSON.parse(result.raw).still.phase,'ready');assert.equal(result.prepared,true);assert(!result.log.some(x=>Array.isArray(x)&&x[0]==='notices'));
 }
 let filling=D.beginCollection(D.startRangeDistillation(D.newMarketRulesDistillery(42)));while(filling.still.distillation.progress<12)filling=D.distillStep(filling);filling=D.stopDistillation(filling);
 for(const mode of ['quota','refuse','conflict','model-throw']){
  const p=pair({state:filling});(await p.call('render'));(await p.call('fillSelect','refill'));const before=p.compare('before fill failure');p.fail(mode);const failed=(await p.call('fill'));assert.equal(failed.raw,before.raw);if(mode==='model-throw')assert.equal(failed.modal.kind,'fill');else assert.equal(failed.modal,null,'failed storage releases modal for recovery');assert.equal(failed.room,'distill');assert(!failed.log.some(x=>Array.isArray(x)&&x[0]==='notices'));
 }
 const p=pair();(await p.call('openBrewing'));(await p.call('confirmBrewing'));(await p.call('startFromLever'));(await p.tick());(await p.tick());(await p.tick());(await p.call('finishDistillation'));(await p.call('stepTo',12));const before=p.compare('before stop quota');p.fail('quota');const stopped=(await p.call('finishDistillation'));assert.equal(JSON.parse(stopped.raw).still.phase,'distilling');assert.equal(stopped.raw,JSON.stringify([3,4,8].includes(JSON.parse(stopped.stored).version)?JSON.parse(expandFormalGame(JSON.parse(stopped.stored).game)):JSON.parse(stopped.stored).game));assert.equal(stopped.modal,null,'failed generic save does not publish result');
});
test('R3 hidden, room change, restart and reload preserve preparation boundaries without new formal operations',async()=>{
 for(const interrupt of ['hidden','room']){
  const p=pair();(await p.call('openBrewing'));(await p.call('confirmBrewing'));const before=p.compare('armed');(await p.call('startFromLever'));if(interrupt==='hidden'){(await p.call('setHidden',true));(await p.call('setHidden',false));}else{(await p.call('selectRoom','warehouse'));(await p.call('selectRoom','distill'));}assert.equal(p.compare('cancelled').raw,before.raw);assert(p.compare('same preparation').prepared);
 }
 const expired=(()=>{let s=D.startRangeDistillation(D.newMarketRulesDistillery(42));while(s.still.distillation.progress<88)s=D.distillStep(s);return s;})();
 const p=pair({state:expired});const restart=(await p.call('startFromLever'));assert.equal(restart.countdown,null);assert.equal(JSON.parse(restart.raw).still.distillation.progress,0);assert(restart.log.includes('model:restartRangeDistillation'));
 let filling=D.beginCollection(D.startRangeDistillation(D.newMarketRulesDistillery(42)));while(filling.still.distillation.progress<12)filling=D.distillStep(filling);filling=D.stopDistillation(filling);const reload=pair({state:D.restoreDistillery(D.serializeDistillery(filling)),restored:true});assert.equal((await reload.call('render')).modal,null);assert.equal((await reload.call('openModal','fill')).modal.kind,'fill');
 const armed=pair();(await armed.call('openBrewing'));(await armed.call('confirmBrewing'));(await armed.call('resetUI'));assert(!armed.compare('reset').prepared);assert.equal(armed.compare('reset').confirmation,null);
});


test('R3 restored lawful legacy and automatic staff states keep their bytes and manual input gates',async()=>{
 const {formalTraces}=await import('./r0-formal-trace.mjs'),staff=formalTraces().find(t=>t.name==='staff-monthly-seed42');
 const automatic=staff.raws.find(raw=>JSON.parse(raw).usual?.reservation?.status==='active');assert(automatic);
 const legacy=JSON.parse(fs.readFileSync(new URL('./fixtures/bottling-policy-legacy.json',import.meta.url),'utf8')).before.raw;
 for(const raw of [legacy,automatic]){
  const state=D.restoreDistillery(raw),p=pair({state,restored:true}),originalStored=p.b.stored(),result=await p.call('render');
  assert.equal(result.raw,raw);assert(!result.prepared);assert(!result.tools.leverEnabled);
  if(raw===automatic){assert(!result.tools.glassEnabled);assert.equal((await p.call('startFromLever')).raw,raw);}
  assert.equal(p.b.stored(),originalStored,'read-only native projection retains the complete historical envelope');
  assert(!p.b.log.includes('storage:write'),'historical projection never writes or adopts a v8 session');
 }
 const confirmed=pair();(await confirmed.call('openBrewing'));const done=(await confirmed.call('confirmBrewing')),reloaded=pair({state:D.restoreDistillery(done.raw),restored:true});assert(!(await reloaded.call('render')).prepared);assert.equal(reloaded.compare('confirmation not saved').confirmation,null);assert.equal(reloaded.compare('formal remains').raw,done.raw);
});
