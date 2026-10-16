import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../wholesale.mjs';
const KEY='sukimastock.ambertime.wholesale.v3';
const OLD=['sukimastock.ambertime.economy.v2','sukimastock.ambertime.v1','sukimastock.ambertime.journey.v1','sukimastock.ambertime.distillery.v1','sukimastock.ambertime.parallel.v1'];
let imports=0;
async function boot({text=null,search='',readFails=false,consent=false}={}){
 const nodes=new Map(),timers=new Map(),events=new Map(),wevents=new Map(),writes=[],reads=[],storage=new Map(OLD.map(k=>[k,'preserve '+k]));if(text!==null)storage.set(KEY,text);let next=0,writeFails=false;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,textContent:'',innerHTML:'',dataset:{},disabled:false,open:false,style:{values:{},setProperty(k,v){this.values[k]=v;}},classList:{toggle(){},add(){},remove(){}},setAttribute(){},events:new Map(),addEventListener(t,fn){this.events.set(t,fn);},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const nav=['distill','warehouse','sales'].map(r=>Object.assign(node('nav-'+r),{dataset:{room:r}}));
 globalThis.document={hidden:false,getElementById:node,querySelectorAll:()=>nav,body:node('body'),addEventListener:(t,f)=>events.set(t,f)};
 globalThis.window={addEventListener:(t,f)=>wevents.set(t,f)};globalThis.location={search};globalThis.confirm=()=>consent;
 globalThis.localStorage={getItem:k=>{reads.push(k);if(readFails)throw Error('denied');return storage.get(k)??null;},setItem:(k,v)=>{if(writeFails)throw Error('quota');writes.push({k,v});storage.set(k,v);}};
 globalThis.setTimeout=(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 for(const id of ['glass']){const n=node(id);let html='';n.htmlWrites=0;Object.defineProperty(n,'innerHTML',{get:()=>html,set:v=>{html=v;n.htmlWrites++;}});}
 await import('../v08-app.mjs?test='+imports++);
 const data=(id,dataset={})=>node(id).events.get('click')({target:{closest:()=>({dataset})}}),click=id=>data(id),fire=()=>{const t=[...timers.entries()][0];assert(t,'clock expected');timers.delete(t[0]);t[1].fn();};
 const e={node,data,click,fire,timers,writes,reads,storage,state:()=>JSON.parse(storage.get(KEY)).game,intent:()=>JSON.parse(storage.get(KEY)).userPaused,text:()=>storage.get(KEY),failWrites:v=>writeFails=v,
 room:r=>data('room-nav',{room:r}),action:(action,id='',extra={})=>data('dialog-actions',{action,id:String(id),...extra}),
 collect:(n=65)=>{click('start-distill');for(let i=0;i<n;i++)fire();click('stop-distill');},fill:type=>{click('open-fill');e.action('fill',type);},
 month:()=>{const m=e.state().core.month;for(let i=0;i<125&&e.state().core.month===m&&timers.size;i++)fire();},
 hidden:v=>{document.hidden=v;events.get('visibilitychange')();},hide:()=>wevents.get('pagehide')(),show:()=>wevents.get('pageshow')({persisted:true}),storageEvent:()=>wevents.get('storage')({key:KEY})};return e;
}

const session=(game,userPaused=false)=>JSON.stringify({version:1,game,userPaused});
function batch(s,n=65,type='bourbon'){s=D.startDistillation(s);for(let i=0;i<n;i++)s=D.distillStep(s);s=D.stopDistillation(s);return D.fillBarrel(s,type);}
function queued(){let s=batch(D.newDistillery(2),80);s=D.tickDistillery(s);s=batch(s,65,'refill');while(s.core.month<18){while(s.decisions.length){const d=s.decisions[0];s=D.chooseDistillery(s,d.caskId,'wait');}s=D.tickDistillery(s);}assert.equal(s.decisions.length,2);return s;}
function choose(e,key='wait'){const d=e.state().decisions[0];e.action('choose',d.caskId,{choice:key,event:d.eventId});}

import {run} from '../design/v08/simulate.mjs';
const offered=()=>run(42,'decline',16).save;
const contracted=()=>{const s=offered();return D.acceptOffer(s,D.contractCandidates(s)[0].id);};
test('offer modal pauses automatically; decline resumes prior auto/manual intent',async()=>{
 for(const paused of [false,true]){const e=await boot({text:session(offered(),paused)});assert.equal(e.timers.size,0);assert.match(e.node('dialog-title').textContent,/申し出/);assert.match(e.node('dialog-body').innerHTML,/代金から差引/);e.action('decline');assert.equal(e.state().trade.offer,null);assert.equal(e.intent(),paused);assert.equal(e.timers.size,paused?0:1);}
});
test('target selection and acceptance keep stable ID, expose contract, permit barrel-side tasting',async()=>{
 const e=await boot({text:session(offered())}),id=e.state().core.casks[1].id;e.action('offer-cask',id);e.action('contract',id);assert.equal(e.state().trade.contract.caskId,id);assert.equal(e.node('body').dataset.room,'warehouse');assert.equal(e.timers.size,1);assert.equal(e.node('contract-info').hidden,false);e.click('glass-button');assert.equal(e.timers.size,0);assert.equal(e.node('tasting-panel').hidden,false);e.click('end-tasting');assert.equal(e.timers.size,1);e.click('contract-info');assert.match(e.node('dialog-title').textContent,/卸売契約/);const cash=e.state().core.cash;e.action('cancel-contract',id);assert.equal(e.state().trade.contract,null);assert.equal(e.state().core.cash,cash);assert.equal(e.timers.size,1);
});
test('contract cancellation/hidden return/reload respect manual stop and preserve v07 keys',async()=>{
 const e=await boot({text:session(contracted(),true)});assert.equal(e.timers.size,0);e.hidden(true);e.hidden(false);assert.equal(e.timers.size,0);e.click('contract-info');e.action('cancel-contract',e.state().trade.contract.caskId);assert.equal(e.timers.size,0);for(const k of OLD)assert.equal(e.storage.get(k),'preserve '+k);assert(e.writes.every(w=>w.k===KEY));const r=await boot({text:e.text()});assert.equal(r.intent(),true);assert.equal(r.state().trade.contract,null);
});
test('closing an offer declines without penalty and preview never accesses old storage',async()=>{
 const e=await boot({text:session(offered())}),cash=e.state().core.cash;e.click('close-dialog');assert.equal(e.state().core.cash,cash);assert.equal(e.state().trade.offer,null);assert.equal(e.timers.size,1);const p=await boot({search:'?preview=1',readFails:true});assert.equal(p.reads.length,0);assert.equal(p.writes.length,0);
});
test('contracted funds decision exposes free cancellation then ordinary bottling',async()=>{
 let s=contracted();s=D.startDistillation(s);for(let i=0;i<99;i++)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'bourbon');s=D.tickDistillery(s);assert(D.canStart(s).ok);s=D.startDistillation(s);for(let i=0;i<99;i++)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'bourbon');
 for(let guard=0;guard<60&&!s.decisions.some(d=>d.eventId==='funds');guard++){
  while(s.decisions.length){const d=s.decisions[0],o=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');assert(o);s=D.chooseDistillery(s,d.caskId,o.id);}s=D.tickDistillery(s);
 }
 assert.equal(s.decisions[0]?.eventId,'funds');assert.equal(s.decisions[0].caskId,s.trade.contract.caskId);
 const e=await boot({text:session(s)}),id=e.state().trade.contract.caskId;assert.match(e.node('dialog-actions').innerHTML,/契約を解除して瓶詰め/);assert.equal(e.timers.size,0);e.action('cancel-contract',id);assert.equal(e.state().trade.contract,null);assert.match(e.node('dialog-actions').innerHTML,/data-action="quote"/);e.action('quote',id);e.action('bottle',id);assert(e.state().core.cash>=0);assert.equal(e.state().decisions.length,0);assert.match(e.node('dialog-actions').innerHTML,/data-action="price"/);
});
