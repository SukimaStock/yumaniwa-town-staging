import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
import {createWarehouseRoomController} from '../warehouse-room-controller.mjs';
import {createDistillRoomController} from '../distill-room-controller.mjs';
import {bottleChoices,defaultBottleCount} from '../ui-details.mjs';
import {identityDefaults,brandNameError} from '../brand-identity.mjs';
import {automaticEvents} from '../event-notices.mjs';
import {ECONOMY_PARAMETERS as P} from '../economy-parameters.mjs';

// Run immutable/current real root handlers. DOM, scheduling and whole-modal
// rendering are controlled ports; models, generic save and event creation are real.
const BASE='75843aa2b6a3b9bf1040970602a4fb4364678ddc';
const oldSource=execFileSync('git',['show',BASE+':works/ambertime/shop-app.mjs'],{encoding:'utf8',maxBuffer:4e6});
assert.equal(createHash('sha256').update(oldSource).digest('hex'),'6cd8778677cb66384f158191214537e91dc317cf4ca5ced71ef980b9f744999d');
const newSource=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
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
function fill(s){
 s=D.beginCollection(D.startRangeDistillation(s));while(s.still.distillation.progress<35)s=D.distillStep(s);
 return D.fillBarrel(D.stopDistillation(s),'refill');
}
function warehouse(){
 let s=fill(D.newMarketRulesDistillery(42));
 s=D.bottleBranded(s,s.core.casks[0].id,{name:'Warehouse baseline'},1);
 s=D.tickDistillery(s);s=fill(s);
 assert.equal(D.serializeDistillery(D.restoreDistillery(D.serializeDistillery(s))),D.serializeDistillery(s));
 return s;
}
function host(source,state,{restored=false}={}){
 const candidate=source===newSource,log=[],nodes=new Map();let mode='ok',stored=JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(state)),userPaused:false,elapsed:0});
 const node=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},hidden:false,textContent:'',value:'',disabled:false,querySelector(sel){return node(id+':'+sel);}});return nodes.get(id);};
 const storage={getItem(){log.push('storage:read');return stored;},setItem(k,value){log.push('storage:write');if(mode==='quota')throw Error('quota');if(mode!=='readback')stored=value;}};
 const model={...D};
 for(const name of ['sampleDistillery','endTasting','pauseBottling','bottleBranded','delegateBottling'])model[name]=(...args)=>{log.push('model:'+name);if(mode==='model-throw'&&name!=='endTasting')throw Error('model refused');return D[name](...args);};
 model.serializeDistillery=s=>{log.push('serialize');return D.serializeDistillery(s);};
 const ctx={D:model,P,createWarehouseRoomController,createDistillRoomController,bottleChoices,defaultBottleCount,identityDefaults,brandNameError,
  initial:state,initialRaw:stored,restored,snapshotRaw:D.serializeDistillery,localStorage:storage,SAVE_KEY:'formal',$:node,document:{hidden:false,activeElement:null},
  stopClock:()=>log.push('clock:stop'),schedule:()=>log.push('clock:schedule'),recordRender:()=>log.push('render'),
  message:text=>log.push(['message',text]),storageNotice:text=>log.push(['storageNotice',text]),
  automaticEvents,automaticNews:{push:events=>log.push(['notices',plain(events)])},caskName:String,soldOutLabel:()=>'',noteMapReach:()=>log.push('map:reach'),
  placementUI:{reset:()=>log.push('placement:reset')},marketUI:{cancel:()=>log.push('market:cancel')},comparisonKinds:[],generationState:()=>({phase:'working'}),
  showStaffOpportunity(){},showShopOffer(){},showGeneration(){},showInitialMapNotice(){},money:String,displayReason:String};
 const render=extract(source,'render'),cut=render.indexOf(' syncModal();');assert(cut>0);
 const prefix=render.slice(render.indexOf('{')+1,cut+' syncModal();'.length);
 const sync=extract(source,'syncModal'),syncEnd=sync.indexOf(' if(!modal){vaultPanels();');assert(syncEnd>0);
 const rack=source.match(/^\$\('cask-rack'\)\.addEventListener\('click',e=>\{(.*)\}\);$/m)[1];
 const handle=extract(source,'handleModal'),moreStart=handle.indexOf(" if(['bottle-less','bottle-more','bottle-all'].includes(a)){");
 const bottleStart=handle.indexOf(" if(a==='bottle'){");assert(moreStart>0&&bottleStart>moreStart);
 const more=handle.slice(moreStart,bottleStart),bottle=handle.slice(bottleStart,handle.lastIndexOf('}'));
 const select=candidate?'warehouseRoom.select(id);':'selectedCaskId=id;',read=candidate?'warehouseRoom.selectedId':'selectedCaskId';
 const bootLine=source.split('\n').find(x=>x.includes('mapNoticeLoad(lastSavedText!==null);')&&x.includes("room="));assert(bootLine);
 const bootSelection=bootLine.slice(bootLine.indexOf(candidate?'warehouseRoom.select(':'selectedCaskId='),bootLine.indexOf('canSave=true;'));
 vm.createContext(ctx);
 vm.runInContext(`let game=initial,room='distill',modal=null,selectedProductId=null,userPaused=false,canSave=true,preview=false,lastSavedText=initialRaw,elapsed=0,runtimeHalted=false,marketEditing=false,deliveryNotice='',shownFillSpiritId=null,modalReturnFocus=null,modalReturnObject=null;
 ${candidate?'const warehouseRoom=createWarehouseRoomController();':'let selectedCaskId=null;'}
 const placementEnabled=true,distillRoom=createDistillRoomController(),countdown={active:false,cancel(){logCountdown();}};
 ${source.split('\n').find(x=>x.startsWith('const manualDistilling='))}
 function render(){recordRender();${prefix}if(modal?.kind==='quote')bottleSelection(modal.id);}
 ${sync.slice(0,syncEnd)+'\n}'}
 ${['save','act','endTaste','trial','quoteModal','firstBrandDraft','bottleSelection','bottleRemainder','updateBottleSelection','closeModal','selectRoom'].map(name=>extract(source,name)).join('\n')}
 function rack(id){const e={target:{closest(){return {dataset:{caskId:String(id)}};}}};${rack}}
 function quantity(action){const a=action,kind=modal?.kind,id=modal?.id;${more}}
 function bottle(){const a='bottle',kind=modal?.kind,id=modal?.id;${bottle}}
 function setCount(count){modal.bottleCount=count;updateBottleSelection();}
 globalThis.api={render,rack,trial,quoteModal,closeModal,selectRoom,quantity,bottle,setCount,
  select(id){${select}},replaceGame(s){game=s;},
  reload(){${candidate?'warehouseRoom.select(null);':'selectedCaskId=null;'}${bootSelection}modal=null;render();},
  result(){return {raw:snapshotRaw(game),selectedId:${read},modal,room,selectedProductId,userPaused,canSave};}};
 `,Object.assign(ctx,{logCountdown:()=>log.push('countdown:cancel')}));
 return {call(name,...args){return ctx.api[name](...args);},fail(kind){mode=kind;if(kind==='conflict')stored='external-save';},result(){return plain({...ctx.api.result(),stored,log,nodes:[...nodes].map(([id,n])=>({id,text:n.textContent,value:n.value,disabled:n.disabled,hidden:n.hidden}))});}};
}
function pair(state=warehouse(),options){const old=host(oldSource,state,options),next=host(newSource,state,options);return {
 old,next,compare(tag){const a=old.result(),b=next.result();assert.deepEqual(b,a,tag);return b;},
 call(name,...args){old.call(name,...args);next.call(name,...args);return this.compare(name);},fail(mode){old.fail(mode);next.fail(mode);}};}
const game=r=>JSON.parse(r.raw);
function cold(raw){
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:4e6}),raw);
}

test('R4 actual root empty/single/multiple selection, stale fallback, formal tasting override and reload keep selection order',()=>{
 for(const state of [D.newMarketRulesDistillery(42),fill(D.newMarketRulesDistillery(42)),warehouse()]){
  const p=pair(state);const initial=p.call('render');assert.equal(initial.selectedId,state.core.casks[0]?.id??null);
  p.call('select',999);assert.equal(p.call('render').selectedId,state.core.casks[0]?.id??null);
  if(state.core.casks.length){const id=state.core.casks.at(-1).id;p.call('rack',id);assert.equal(p.compare('selected').selectedId,id);p.call('closeModal');p.call('trial',id);assert.equal(p.call('render').selectedId,id);p.call('select',999);assert.equal(p.call('render').selectedId,id,'formal tasting overrides fallback');const reloaded=p.call('reload');assert.equal(reloaded.selectedId,id);assert.equal(reloaded.modal.kind,'inspect');}
 }
});

test('R4 actual root select/taste/previous comparison/end/quote quantity/cancel preserves formal raw and effect order',()=>{
 const s=warehouse(),p=pair(s),id=s.core.casks.at(-1).id;
 p.call('selectRoom','warehouse');p.call('rack',id);p.call('closeModal');p.call('rack',s.core.casks[0].id);p.call('closeModal');p.call('rack',id);
 const before=p.compare('before sample'),sampled=p.call('trial',id);assert.notEqual(sampled.raw,before.raw);assert.equal(game(sampled).tastingId,id);
 const first=D.comparison(game(sampled),id);assert(first.current);assert.equal(first.previous,null);
 p.call('quoteModal',id);const quoted=p.compare('quote retains formal tasting');assert.equal(game(quoted).tastingId,id);assert.equal(quoted.modal.kind,'quote');
 const count=quoted.modal.bottleCount,changed=p.call('quantity','bottle-more');assert(changed.modal.bottleCount>=count);assert.equal(changed.raw,quoted.raw);
 const cancelled=p.call('closeModal');assert.equal(cancelled.modal.kind,'inspect','existing tasting forces inspect on quote cancellation');assert.equal(cancelled.raw,quoted.raw);
 p.call('closeModal');const ended=p.compare('ending by close');assert.equal(game(ended).tastingId,null);assert.equal(ended.modal,null);assert.equal(ended.selectedId,id);
 const aged=D.tickDistillery(D.restoreDistillery(ended.raw));p.call('replaceGame',aged);p.call('render');p.call('trial',id);const comparison=D.comparison(game(p.compare('next sample')),id);assert(comparison.previous);assert(comparison.current.age>comparison.previous.age);
 p.call('closeModal');p.call('quoteModal',id);const quote=p.compare('bottle quote');p.call('quantity','bottle-less');p.call('closeModal');assert.equal(p.compare('plain quote cancelled').modal,null);assert.equal(p.compare('no formal quantity edit').raw,quote.raw);
});

test('R4 actual root partial/full bottling keeps surviving selection or first-cask fallback and exact cold save replay',()=>{
 const s=warehouse(),id=s.core.casks.at(-1).id,p=pair(s);p.call('render');p.call('rack',id);p.call('quoteModal',id);p.call('setCount',1);
 const before=p.compare('before partial'),partial=p.call('bottle');assert.equal(partial.room,'sales');assert.equal(partial.modal,null);assert.equal(partial.selectedId,id);assert.equal(game(partial).result.bottles,1);assert.equal(game(partial).core.casks.length,s.core.casks.length);assert.notEqual(partial.raw,before.raw);
 cold(partial.raw);assert.equal(JSON.stringify(JSON.parse(partial.stored).game),partial.raw);
 p.call('selectRoom','warehouse');p.call('rack',id);p.call('quoteModal',id);p.call('quantity','bottle-all');const full=p.call('bottle');assert(!game(full).core.casks.some(c=>c.id===id));assert.equal(full.selectedId,game(full).core.casks[0]?.id??null);cold(full.raw);
 const reload=p.call('reload');assert.equal(reload.selectedId,game(full).core.casks[0]?.id??null);assert.equal(reload.raw,full.raw);assert.equal(reload.modal,null);
 const first=fill(D.newMarketRulesDistillery(42)),onlyState=D.bottleBranded(first,first.core.casks[0].id,{name:'One cask'},1);
 const only=pair(onlyState),onlyId=game(only.call('render')).core.casks[0].id;only.call('rack',onlyId);only.call('quoteModal',onlyId);only.call('quantity','bottle-all');
 const empty=only.call('bottle');assert.equal(empty.selectedId,null);assert.equal(game(empty).core.casks.length,0);cold(empty.raw);
});

test('R4 generic sample and bottle quota/readback/conflict/model errors retain distinct memory, durable, notices and clock order',()=>{
 for(const operation of ['trial','bottle'])for(const mode of ['quota','readback','conflict','model-throw']){
  const s=warehouse(),id=s.core.casks.at(-1).id,p=pair(s);p.call('render');p.call('rack',id);
  if(operation==='bottle'){p.call('quoteModal',id);p.call('setCount',1);}
  const before=p.compare('before failed '+operation),noticeCount=before.log.filter(x=>Array.isArray(x)&&x[0]==='notices').length;p.fail(mode);
  const failed=operation==='trial'?p.call('trial',id):p.call('bottle');
  assert.equal(failed.log.filter(x=>Array.isArray(x)&&x[0]==='notices').length,noticeCount,'failed operation does not publish saved notice');
  assert.equal(failed.canSave,mode==='model-throw');
  if(mode==='model-throw'){assert.equal(failed.raw,before.raw);if(operation==='bottle'){assert.equal(failed.modal.kind,'quote');assert.equal(failed.modal.committing,false);}}
  else{assert.notEqual(failed.raw,before.raw,'generic act keeps changed memory');assert.equal(failed.stored,mode==='conflict'?'external-save':before.stored);if(operation==='bottle'){assert.equal(failed.room,'sales');assert.equal(failed.modal,null);}}
  const tail=failed.log.slice(before.log.length);assert(tail.includes('clock:stop'));assert(tail.includes('render'));assert.equal(tail.at(-1),'clock:schedule');
 }
});
