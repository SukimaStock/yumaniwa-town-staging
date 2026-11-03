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
import {writeCandidate} from '../placement-save.mjs';
import {automaticEvents} from '../event-notices.mjs';
import {ECONOMY_PARAMETERS as P} from '../economy-parameters.mjs';

const BASE='f7ba8023706be803b1711b3e3374b7e1bf83c4d9';
const previous=execFileSync('git',['show',BASE+':works/ambertime/shop-app.mjs'],{encoding:'utf8',maxBuffer:4e6});
assert.equal(createHash('sha256').update(previous).digest('hex'),'604208174263d5a804b92e764a9eba0df76f0cb7b80b8dca95827dc8c8769913','immutable pre-R3 application');
const current=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
function extract(source,name){
 const start=source.indexOf('function '+name+'(');assert(start>=0,name);let depth=0,quote=null,escape=false,line=false,block=false;
 for(let i=source.indexOf('{',start);i<source.length;i++){const c=source[i],next=source[i+1];
  if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&next==='/'){block=false;i++;}continue;}
  if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}
  if(c==='/'&&next==='/'){line=true;i++;continue;}if(c==='/'&&next==='*'){block=true;i++;continue;}
  if(c==="'"||c==='"'||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return source.slice(start,i+1);
 }throw Error(name);
}
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
function appHost(source,{state=D.newMarketRulesDistillery(42),preview=false,restored=false}={}){
 const candidate=source===current,log=[],timers=new Map(),micro=[],nodes=new Map();let timerId=0,mode='ok';
 let stored=JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(state)),userPaused:false,elapsed:0});
 const node=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},hidden:false,textContent:'',open:false,classList:{toggle(){}},setAttribute(){},querySelector(){return {focus(){}};}});return nodes.get(id);};
 const model={...D};for(const name of ['selectFlavorCards','startDistillation','startRangeDistillation','beginCollection','stopDistillation','restartRangeDistillation','fillBarrel'])model[name]=(...args)=>{log.push('model:'+name);if(mode==='model-throw')throw Error('model refused');return D[name](...args);};
 model.serializeDistillery=s=>{log.push('serialize');return D.serializeDistillery(s);};
 const storage={getItem(){log.push('storage:read');return stored;},setItem(k,value){log.push('storage:write');if(mode==='quota')throw Error('quota');if(mode!=='refuse')stored=value;}};
 const ctx={D:model,P,createDistillRoomController,manualCards,chooseManualCard,brewingPanelState,distillToolsView,rangeRestartAvailable,manualCompletedRuns,distillationReadout,writeCandidate,
  snapshotRaw:D.serializeDistillery,initial:state,initialRaw:stored,initialPreview:preview,restored,$:node,document:{hidden:false,activeElement:null},T:{minimumStop:30},localStorage:storage,SAVE_KEY:'formal',
  stopClock(){log.push('clock:stop');},schedule(){log.push('clock:schedule');},message:text=>log.push(['message',text]),storageNotice:text=>log.push(['storageNotice',text]),
  automaticEvents,automaticNews:{push:events=>log.push(['notices',plain(events)])},caskName:String,soldOutLabel:()=>'',noteMapReach:()=>log.push('map:reach'),
  placementUI:{reset:()=>log.push('placement:reset')},marketUI:{cancel:()=>log.push('market:cancel')},comparisonKinds:[],endTaste(){},generationState:()=>({phase:'working'}),
  showStaffOpportunity(){},showShopOffer(){},showGeneration(){},showInitialMapNotice(){},queueMicrotask:fn=>micro.push(fn)};
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
 ${source.includes('createWarehouseRoomController')?'const warehouseRoom=createWarehouseRoomController();':''}\n ${init}\n${countdown}\n${source.split('\n').find(x=>x.startsWith('const manualDistilling='))}
 function render(){recordRender();${renderPrefix}}
 ${sync.slice(0,endSync)+'\n}'}
 ${['save','act','prepareDistillation','startFromLever','currentDistillTools','finishDistillation','commitFill','openModal','closeModal','selectRoom','endTaste'].map(name=>extract(source,name)).join('\n')}
 function openBrewing(){${openBody}}
 function card(group,id){const a='flavor-card',kind=modal?.kind,b={dataset:{group,id}};${action('flavor-card')}}
 function confirmBrewing(){const a='flavor-start',kind=modal?.kind;${action('flavor-start')}}
 function fillSelect(type){const a='fill-select',kind=modal?.kind,b={dataset:{id:type}};${action('fill-select')}}
 function fill(){const a='fill',kind=modal?.kind,b={dataset:{id:modal?.fillType}};${action('fill')}}
 globalThis.api={openBrewing,card,confirmBrewing,startFromLever,finishDistillation,openModal,closeModal,selectRoom,fillSelect,fill,render,
  resetUI(){${reset}},cancelCountdown(){countdown.cancel();},tools:currentDistillTools,
  stepTo(n){while(game.still.distillation.progress<n)game=D.distillStep(game);},
  replaceGame(s){game=s;},setHidden(value){document.hidden=value;render();},
  result(){return {raw:snapshotRaw(game),modal,room,userPaused,canSave,shownFillSpiritId,countdown:countdown.value,confirmation:${candidate?'distillRoom.confirmation':'confirmedBrewing'},prepared:${candidate?'distillRoom.isPreparedFor(game.core.lastDistillation)':'distillPrepared&&preparedForDistillation===game.core.lastDistillation'},tools:currentDistillTools()};}};`,Object.assign(ctx,{createWarehouseRoomController,recordRender:()=>log.push('render')}));
 const flush=()=>{while(micro.length)micro.shift()();};
 return {api:ctx.api,log,state:()=>ctx.api.result().raw,stored:()=>stored,
  invoke(name,...args){const out=ctx.api[name](...args);flush();return out;},
  tick(){const first=timers.entries().next().value;assert(first,'countdown timer');timers.delete(first[0]);first[1]();flush();},
  fail(kind){mode=kind;if(kind==='conflict')stored='external-save';},
  result(){const out=ctx.api.result();return plain({...out,stored,log:[...log]});}};
}
function pair(options){const a=appHost(previous,options),b=appHost(current,options),rows=[];
 const compare=tag=>{const before=a.result(),after=b.result();assert.deepEqual(after,before,tag);rows.push({tag,raw:after.raw,stored:after.stored,modal:after.modal,prepared:after.prepared});return after;};
 const call=(name,...args)=>{a.invoke(name,...args);b.invoke(name,...args);return compare(name);};
 return {a,b,rows,call,compare,tick(){a.tick();b.tick();return compare('countdown tick');},fail(mode){a.fail(mode);b.fail(mode);}};
}
test('R3 actual root brewing open/card/confirm/cancel preserves formal selection timing and effect order',()=>{
 const p=pair();const initial=p.compare('initial');p.call('openBrewing');const chosen=p.call('card','malt','peat');
 assert.notEqual(chosen.raw,initial.raw);assert(chosen.log.includes('storage:write'));
 const writes=chosen.log.filter(x=>x==='storage:write').length,confirmed=p.call('confirmBrewing');assert.equal(confirmed.raw,chosen.raw);assert.equal(confirmed.log.filter(x=>x==='storage:write').length,writes,'confirm does not save');assert(confirmed.prepared);
 p.call('openBrewing');const changed=p.call('card','malt','plain');const cancelled=p.call('closeModal');assert.equal(cancelled.raw,changed.raw);assert(!cancelled.prepared);assert.equal(cancelled.confirmation.malt,'peat');
 p.call('openBrewing');p.call('card','malt','peat');p.call('confirmBrewing');p.call('openBrewing');p.call('card','malt','plain');p.call('card','malt','peat');assert(p.call('closeModal').prepared,'changed back restores prepared while keeping both formal selections');
 const selected=p.compare('before cancel count');p.call('startFromLever');assert.equal(p.compare('countdown only').raw,selected.raw);p.call('cancelCountdown');assert.equal(p.compare('cancel no operation').raw,selected.raw);assert(p.compare('cancel retains preparation').prepared);
});
test('R3 actual root countdown, cut, integrated result, cask selection and next batch keep every ordered effect and save',()=>{
 const p=pair();p.call('openBrewing');p.call('confirmBrewing');p.call('startFromLever');assert.equal(p.tick().countdown,2);assert.equal(p.tick().countdown,1);const started=p.tick();assert.equal(JSON.parse(started.raw).still.phase,'distilling');assert(!started.prepared);
 p.call('finishDistillation');p.call('stepTo',11);const tooShort=p.compare('min12 before');assert.equal(p.call('finishDistillation').raw,tooShort.raw);p.call('stepTo',12);const stopped=p.call('finishDistillation');assert.equal(stopped.modal.kind,'fill');assert.equal(JSON.parse(stopped.raw).still.phase,'filling');
 p.call('closeModal');assert.equal(p.call('render').modal,null,'result never opens twice');p.call('openModal','fill');const beforeSelect=p.compare('before cask');assert.equal(p.call('fillSelect','refill').raw,beforeSelect.raw);const filled=p.call('fill');assert.equal(filled.room,'warehouse');assert.equal(filled.modal,null);assert.equal(JSON.parse(filled.raw).core.casks.length,1);
 const following=D.tickDistillery(D.restoreDistillery(filled.raw));assert(D.canStart(following).ok,'next brewing is available after the existing monthly boundary');p.call('replaceGame',following);p.call('render');
 p.call('selectRoom','distill');assert(!p.compare('next batch').prepared);p.call('openBrewing');p.call('confirmBrewing');assert(p.compare('next confirmation').prepared);
});
test('R3 generic start/stop failures and candidate fill failures retain their distinct memory/save/notice policies',()=>{
 for(const mode of ['quota','refuse','conflict','model-throw']){
  const p=pair();p.call('openBrewing');p.call('confirmBrewing');p.call('startFromLever');p.fail(mode);p.tick();p.tick();const result=p.tick();
  assert.equal(JSON.parse(result.raw).still.phase,mode==='model-throw'?'ready':'distilling');assert.equal(result.prepared,mode==='model-throw');assert(!result.log.some(x=>Array.isArray(x)&&x[0]==='notices'));
 }
 let filling=D.beginCollection(D.startRangeDistillation(D.newMarketRulesDistillery(42)));while(filling.still.distillation.progress<12)filling=D.distillStep(filling);filling=D.stopDistillation(filling);
 for(const mode of ['quota','refuse','conflict','model-throw']){
  const p=pair({state:filling});p.call('render');p.call('fillSelect','refill');const before=p.compare('before fill failure');p.fail(mode);const failed=p.call('fill');assert.equal(failed.raw,before.raw);assert.equal(failed.modal.kind,'fill');assert.equal(failed.room,'distill');assert(!failed.log.some(x=>Array.isArray(x)&&x[0]==='notices'));
 }
 const p=pair();p.call('openBrewing');p.call('confirmBrewing');p.call('startFromLever');p.tick();p.tick();p.tick();p.call('finishDistillation');p.call('stepTo',12);const before=p.compare('before stop quota');p.fail('quota');const stopped=p.call('finishDistillation');assert.notEqual(stopped.raw,before.raw);assert.equal(JSON.parse(stopped.raw).still.phase,'filling');assert.equal(stopped.modal,null,'failed generic save does not publish result');
});
test('R3 hidden, room change, restart and reload preserve preparation boundaries without new formal operations',()=>{
 for(const interrupt of ['hidden','room']){
  const p=pair();p.call('openBrewing');p.call('confirmBrewing');const before=p.compare('armed');p.call('startFromLever');if(interrupt==='hidden'){p.call('setHidden',true);p.call('setHidden',false);}else{p.call('selectRoom','warehouse');p.call('selectRoom','distill');}assert.equal(p.compare('cancelled').raw,before.raw);assert(p.compare('same preparation').prepared);
 }
 const expired=(()=>{let s=D.startRangeDistillation(D.newMarketRulesDistillery(42));while(s.still.distillation.progress<88)s=D.distillStep(s);return s;})();
 const p=pair({state:expired});const restart=p.call('startFromLever');assert.equal(restart.countdown,null);assert.equal(JSON.parse(restart.raw).still.distillation.progress,0);assert(restart.log.includes('model:restartRangeDistillation'));
 let filling=D.beginCollection(D.startRangeDistillation(D.newMarketRulesDistillery(42)));while(filling.still.distillation.progress<12)filling=D.distillStep(filling);filling=D.stopDistillation(filling);const reload=pair({state:D.restoreDistillery(D.serializeDistillery(filling)),restored:true});assert.equal(reload.call('render').modal,null);assert.equal(reload.call('openModal','fill').modal.kind,'fill');
 const armed=pair();armed.call('openBrewing');armed.call('confirmBrewing');armed.call('resetUI');assert(!armed.compare('reset').prepared);assert.equal(armed.compare('reset').confirmation,null);
});


test('R3 restored lawful legacy and automatic staff states keep their bytes and manual input gates',async()=>{
 const {formalTraces}=await import('./r0-formal-trace.mjs'),staff=formalTraces().find(t=>t.name==='staff-monthly-seed42');
 const automatic=staff.raws.find(raw=>JSON.parse(raw).usual?.reservation?.status==='active');assert(automatic);
 const legacy=JSON.parse(fs.readFileSync(new URL('./fixtures/bottling-policy-legacy.json',import.meta.url),'utf8')).before.raw;
 for(const raw of [legacy,automatic]){const state=D.restoreDistillery(raw),p=pair({state,restored:true}),result=p.call('render');assert.equal(result.raw,raw);assert(!result.prepared);assert(!result.tools.leverEnabled);if(raw===automatic){assert(!result.tools.glassEnabled);assert.equal(p.call('startFromLever').raw,raw);}}
 const confirmed=pair();confirmed.call('openBrewing');const done=confirmed.call('confirmBrewing'),reloaded=pair({state:D.restoreDistillery(done.raw),restored:true});assert(!reloaded.call('render').prepared);assert.equal(reloaded.compare('confirmation not saved').confirmation,null);assert.equal(reloaded.compare('formal remains').raw,done.raw);
});
