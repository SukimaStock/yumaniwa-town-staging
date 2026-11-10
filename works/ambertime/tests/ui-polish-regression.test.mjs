import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {runtimeSource as source,extractFunction as extract} from './formal-idb-runtime-harness.mjs';
import {createDialogueNotice} from '../shop-dialogue-view.mjs';
const line=prefix=>{const s=source.split('\n').find(s=>s.trimStart().startsWith(prefix));assert(s,prefix);return s;};
const fillGate=line("if(!modal&&room==='distill'&&game.still.phase==='filling'");
function fillContext(){
 const game={still:{phase:'filling'},core:{spirit:{id:7},casks:[]},usual:{reservation:null},tastingId:null};
 const ctx={game,preview:true,canSave:true,room:'distill',modal:null,shownFillSpiritId:7,marketEditing:false,userPaused:false,document:{hidden:false},scene:{isDistillCompletion:()=>false},marketUI:{cancel(){}},countdown:{cancel(){}},stopClock(){},manualDistilling:()=>false,endTaste:()=>true,save:()=>true,schedule(){}};
 ctx.actionReady=()=>true;ctx.prepareGame=fn=>fn(ctx.game);ctx.saveCandidate=async()=>true;ctx.m0={mode:'half',reset(){}};
 vm.createContext(ctx);vm.runInContext(extract('selectRoom')+'\nfunction render(){'+fillGate+'}',ctx);return ctx;
}
test('closed fill modal reopens through the existing distillation tab without duplicating the legacy button',async()=>{
 const c=fillContext(),raw=JSON.stringify(c.game);c.render();assert.equal(c.modal,null);
 await c.selectRoom('distill');assert.equal(c.modal.kind,'fill');assert.equal(c.shownFillSpiritId,7);
 c.modal=null;await c.selectRoom('warehouse');assert.equal(c.modal,null);await c.selectRoom('distill');assert.equal(c.modal.kind,'fill');assert.equal(JSON.stringify(c.game),raw);
 assert.match(source,/\$\('open-fill'\)\.hidden=true;/);
});
test('restored filling session does not mark the unseen result as already shown',async()=>{
 const c=fillContext(),session={game:c.game,caskSlots:[],recentLedger:null,historyRecord:null,recallRecord:null,userPaused:true,elapsed:0};
 const reset=()=>{};Object.assign(c,{session,dialogueNotice:{reset},dialogueProjection:{reset},distillRoom:{reset},scene:{...c.scene,resetMotion:reset},marketUI:{cancel:reset,reset},placementUI:{reset},feedbackComments:{reset},automaticNews:{reset},mapNoticeLoad:reset,warehouseRoom:{selectedId:null,select(id){this.selectedId=id;}},D:{marketRulesMode:()=>false},storageNotice:reset,$:()=>({hidden:false,textContent:''})});
 const raw=JSON.stringify(session.game);vm.runInContext(extract('installSession'),c);await c.installSession(session);assert.equal(c.modal.kind,'fill');assert.equal(JSON.stringify(session.game),raw);
});
test('unreleased brand has no bottle; a real release retains its artwork',()=>{
 const calls=[],c={game:{releases:[]},brandArt:(...args)=>{calls.push(args);return 'bottle';},releasePriceTier:()=> 'standard'};vm.createContext(c);
 vm.runInContext(line('const brandDisplay=')+'\nglobalThis.drawBrand=brandDisplay;',c);
 assert.equal(c.drawBrand({id:1}), '');assert.equal(calls.length,0);c.game.releases.push({brandId:1,productId:9});assert.equal(c.drawBrand({id:1}),'bottle');assert.equal(calls.length,1);
});
test('only unlock-map chrome and hiring pending-count are hidden; ordinary dialogs retain them',()=>{
 const nodes=new Map(),c={$:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},dialog:{dataset:{}},game:{decisions:[],trade:{offer:null}},shopOffers:()=>[{id:1,notified:false}]};vm.createContext(c);
 for(const [kind,origin,hidden] of [['world-map','unlock',true],['world-map','direct',false],['world-map','menu',false],['ledger',null,false]]){
  Object.assign(c,{kind,modal:{kind,source:origin}});vm.runInContext(line("$('dialog-title').hidden=")+line("dialog.dataset.kind=kind;"),c);
  assert.equal(nodes.get('dialog-title').hidden,hidden);assert.equal(nodes.get('close-dialog').hidden,hidden);
 }
 for(const kind of ['staff-opportunity','ledger']){Object.assign(c,{kind,modal:{kind}});vm.runInContext('{'+line('const activeCask=')+'}',c);assert.equal(nodes.get('dialog-context').hidden,kind==='staff-opportunity');}
});
test('bar acceptance opens the same committed greeting path as liquor and supermarket',()=>{
 for(const shopId of ['bar','town-liquor','supermarket'])for(const saved of [true,false]){
  const c={a:'shop-accept',kind:'shop-offer',modal:{kind:'shop-offer',shopId,offerId:1,returnProductId:null,returnModal:null},game:{shop:{offer:{brandId:3}}},room:'distill',LIVE_MESSAGE:{shopGreeting:'既存の挨拶'},D:{acceptShop:s=>s},message(){}};
  c.act=(fn,after,afterSave)=>{if(!saved)return false;c.game=fn(c.game);after();afterSave();return true;};vm.createContext(c);vm.runInContext('function accept(){'+line("if(a==='shop-accept'||a==='shop-decline')")+'}',c);c.accept();
  assert.equal(c.modal.kind,saved?'stockist':'shop-offer');assert.equal(c.modal.greeting,saved?true:undefined);if(saved){assert.equal(c.modal.shopId,shopId);assert.equal(c.modal.startedBrandId,3);}
 }
 const c={modal:{shopId:'bar',greeting:true,startedBrandId:3},body:'existing body',LIVE_MESSAGE:{shopGreeting:'wrong shop'},esc:String,shopStartedMarkup:()=>'<p>contract started</p>',latestDialogueMarkup:()=>'<p>older dialogue</p>'};vm.createContext(c);
 vm.runInContext(line('if(modal.greeting&&modal.startedBrandId!==undefined)body=')+line("body=(modal.greeting?'':latestDialogueMarkup"),c);
 assert.match(c.body,/では、何本か置いてみましょう。/);assert.doesNotMatch(c.body,/older dialogue|wrong shop/);
});
function notices(){
 let now=0,id=0,inRoom=true,safe=true;const jobs=new Map(),shown=[],hidden=[];
 const n=createDialogueNotice({inRoom:()=>inRoom,safe:()=>safe,show:e=>shown.push(e.id),hide:()=>hidden.push(now),setTimer:(fn,ms)=>{jobs.set(++id,{fn,at:now+ms});return id;},clearTimer:key=>jobs.delete(key)});
 const advance=ms=>{const target=now+ms;for(let cap=0;cap<1000;cap++){const next=[...jobs].filter(([,j])=>j.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;jobs.delete(next[0]);now=next[1].at;next[1].fn();}now=target;};
 return {n,shown,hidden,jobs,advance,room(v){inRoom=v;n.update();},safe(v){safe=v;n.update();},emit(m){n.commit({core:{month:m-1}},{core:{month:m}},{id:'letter-'+m,month:m,kind:'daily',text:'test'});advance(0);}};
}
test('room interruption preserves one letter and a full uninterrupted reading interval',()=>{
 const h=notices();h.emit(12);h.advance(50);h.room(false);assert.equal(h.jobs.size,0);h.advance(20000);h.room(true);assert.deepEqual(h.shown,['letter-12','letter-12']);h.advance(6499);assert.equal(h.hidden.length,1);h.advance(1);assert.equal(h.hidden.length,2);h.room(false);h.room(true);assert.equal(h.shown.length,2);assert.equal(h.jobs.size,0);
});
test('explicit dismissal is final even when the player immediately changes rooms',()=>{
 const h=notices();h.emit(12);h.n.dismiss();h.room(false);h.room(true);h.advance(10000);assert.deepEqual(h.shown,['letter-12']);assert.equal(h.jobs.size,0);
});
test('newest unseen letter replaces an interrupted old one, without a growing queue',()=>{
 const h=notices();h.emit(12);h.room(false);h.emit(24);h.emit(36);h.room(true);assert.deepEqual(h.shown,['letter-12','letter-36']);h.advance(6500);h.room(false);h.room(true);assert.equal(h.shown.length,2);
});
test('combined room and modal interruptions resume once, while reset cancels pending callbacks',()=>{
 const h=notices();h.emit(12);h.safe(false);h.room(false);h.room(true);h.advance(500);assert.deepEqual(h.shown,['letter-12']);h.safe(true);assert.deepEqual(h.shown,['letter-12','letter-12']);h.room(false);h.n.reset();h.room(true);h.advance(20000);assert.equal(h.shown.length,2);assert.equal(h.jobs.size,0);
});
