import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
const KEY='sukimastock.ambertime.wholesale.v6';
const OLD=['sukimastock.ambertime.economy.v2','sukimastock.ambertime.v1','sukimastock.ambertime.journey.v1','sukimastock.ambertime.distillery.v1','sukimastock.ambertime.parallel.v1'];
let imports=0;
async function boot({text=null,legacy=null,v4=null,v5=null,search='',readFails=false,initialWriteFails=false,consent=false}={}){
 const nodes=new Map(),timers=new Map(),events=new Map(),wevents=new Map(),writes=[],reads=[],storage=new Map(OLD.map(k=>[k,'preserve '+k]));if(text!==null)storage.set(KEY,text);if(v5!==null)storage.set('sukimastock.ambertime.wholesale.v5',v5);if(v4!==null)storage.set('sukimastock.ambertime.wholesale.v4',v4);if(legacy!==null)storage.set('sukimastock.ambertime.wholesale.v3',legacy);let next=0,writeFails=initialWriteFails;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,textContent:'',innerHTML:'',dataset:{},disabled:false,open:false,style:{values:{},setProperty(k,v){this.values[k]=v;}},classList:{toggle(){},add(){},remove(){}},setAttribute(){},events:new Map(),addEventListener(t,fn){this.events.set(t,fn);},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const nav=['distill','warehouse','sales'].map(r=>Object.assign(node('nav-'+r),{dataset:{room:r}}));
 globalThis.document={hidden:false,getElementById:node,querySelectorAll:()=>nav,body:node('body'),addEventListener:(t,f)=>events.set(t,f)};
 globalThis.window={addEventListener:(t,f)=>wevents.set(t,f)};globalThis.location={search};globalThis.confirm=()=>consent;
 globalThis.localStorage={getItem:k=>{reads.push(k);if(readFails)throw Error('denied');return storage.get(k)??null;},setItem:(k,v)=>{if(writeFails)throw Error('quota');writes.push({k,v});storage.set(k,v);}};
 globalThis.setTimeout=(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 for(const id of ['glass']){const n=node(id);let html='';n.htmlWrites=0;Object.defineProperty(n,'innerHTML',{get:()=>html,set:v=>{html=v;n.htmlWrites++;}});}
 await import('../partners-app.mjs?test='+imports++);
 const data=(id,dataset={})=>node(id).events.get('click')({target:{closest:()=>({dataset})}}),click=id=>data(id),fire=()=>{const t=[...timers.entries()][0];assert(t,'clock expected');timers.delete(t[0]);t[1].fn();};
 const e={node,data,click,fire,timers,writes,reads,storage,clock:()=>[...timers.values()].filter(t=>t.ms===100).length,state:()=>JSON.parse(storage.get(KEY)).game,intent:()=>JSON.parse(storage.get(KEY)).userPaused,text:()=>storage.get(KEY),failWrites:v=>writeFails=v,
 room:r=>data('room-nav',{room:r}),action:(action,id='',extra={})=>data('dialog-actions',{action,id:String(id),...extra}),
 collect:(n=65)=>{click('start-distill');for(let i=0;i<n;i++)fire();click('stop-distill');},fill:type=>{click('open-fill');e.action('fill',type);},
 month:()=>{const m=e.state().core.month;for(let i=0;i<125&&e.state().core.month===m&&timers.size;i++)fire();},
 hidden:v=>{document.hidden=v;events.get('visibilitychange')();},hide:()=>wevents.get('pagehide')(),show:()=>wevents.get('pageshow')({persisted:true}),storageEvent:()=>wevents.get('storage')({key:KEY})};return e;
}


const session=(game,userPaused=false)=>JSON.stringify({version:1,game,userPaused});
import fs from 'node:fs';
import * as V09 from '../trade.mjs';
const legacy=name=>V09.restoreDistillery(fs.readFileSync(new URL('./fixtures/v09-'+name+'.json',import.meta.url),'utf8'));
const checkpoint=name=>D.restoreDistillery(V09.serializeDistillery(legacy(name)));
test('v6 imports exact v5 checkpoint without modifying old keys or manual time intent',async()=>{
 const old=legacy('due'),raw=session(old,true),e=await boot({v5:raw});
 assert.equal(e.state().version,6);assert.deepEqual(e.state().origin,old);assert.equal(e.intent(),true);
 assert.equal(e.storage.get('sukimastock.ambertime.wholesale.v5'),raw);assert(e.writes.every(x=>x.k===KEY));
 assert.equal(e.clock(),0);assert.equal(e.state().trade.contracts.length,2);
 const bad=await boot({text:'{bad',v5:raw});assert.equal(bad.writes.length,0);assert.equal(bad.clock(),0);assert.equal(bad.node('recovery').hidden,false);
 const full=await boot({v5:raw,initialWriteFails:true});assert.equal(full.storage.has(KEY),false);assert.equal(full.storage.get('sukimastock.ambertime.wholesale.v5'),raw);assert.equal(full.clock(),0);
});
test('initial offer starts relationship without a cask selector or implicit assignment',async()=>{
 const s=checkpoint('initial'),e=await boot({text:session(s)});
 assert.match(e.node('dialog-actions').innerHTML,/取引を始める/);assert.doesNotMatch(e.node('dialog-body').innerHTML,/data-action="offer-cask"/);
 e.action('contract');assert(e.state().trade.relationship);assert.equal(e.state().trade.contracts.length,0);assert.equal(e.state().trade.offer,null);assert.equal(e.clock(),1);
 const id=s.core.casks[0].id;e.room('warehouse');e.data('cask-rack',{caskId:String(id)});assert.equal(e.node('assign-wholesale').hidden,false);e.click('assign-wholesale');e.action('assign',id);assert.equal(e.state().trade.contracts.length,1);assert.equal(e.state().trade.contracts[0].caskId,id);
});
test('legacy condition proposal still preserves price and existing bookings',async()=>{
 const s=checkpoint('proposal'),e=await boot({text:session(s,true)}),bookings=s.trade.contracts;
 assert.match(e.node('dialog-body').innerHTML,/指定済みの樽の条件は変わりません/);e.action('contract');
 assert.deepEqual(e.state().trade.contracts,bookings);assert(e.state().trade.relationship.terms.some(t=>t.id===s.trade.offer.terms[0].id&&t.unitPrice===s.trade.offer.terms[0].unitPrice));assert.equal(e.clock(),0);
});
test('same month imported shipments aggregate once and retain partner for another cask',async()=>{
 const s=checkpoint('due'),e=await boot({text:session(s)});e.month();assert.equal(e.state().core.month,s.core.month+1);assert.equal(e.state().trade.lastShipments.length,2);assert.equal(e.state().trade.relationship.deliveries,2);assert.equal(e.state().trade.contracts.length,0);
 const n=e.state().trade.lastShipments.reduce((n,x)=>n+x.bottles,0);assert.match(e.node('work-notice').textContent,new RegExp('卸売出荷 '+n+'本'));e.room('distill');e.collect(80);e.fill('refill');assert.equal(e.state().trade.contracts.length,0);assert.equal(e.node('assign-wholesale').hidden,false);
});
test('free tasting beside barrel resumes only player intended clock and preserves imports',async()=>{
 for(const paused of [false,true]){const s=checkpoint('due'),e=await boot({text:session(s,paused)});e.click('glass-button');assert.equal(e.clock(),0);assert.equal(e.node('tasting-panel').hidden,false);assert.equal(e.node('room-warehouse').hidden,false);assert.equal(e.node('action-dialog').open,false);e.hidden(true);e.hidden(false);assert.equal(e.clock(),0);const again=await boot({text:e.text()});again.click('end-tasting');assert.equal(again.clock(),paused?0:1);assert.equal(again.intent(),paused);assert.equal(again.state().trade.contracts.length,2);}
 const preview=await boot({search:'?preview=1',readFails:true});assert.equal(preview.reads.length,0);assert.equal(preview.writes.length,0);
});
const orderCheckpoint=name=>D.restoreDistillery(fs.readFileSync(new URL('./fixtures/partners-'+name+'.json',import.meta.url),'utf8'));
test('special offer shows taste, fixed one-cask terms and optional acceptance without assignment',async()=>{
 const s=orderCheckpoint('offer'),no=await boot({text:session(s,true)});assert.match(no.node('dialog-actions').innerHTML,/注文を受ける/);assert.match(no.node('dialog-body').innerHTML,/特別注文 · 1樽/);assert.match(no.node('dialog-body').innerHTML,/£26.10/);assert.match(no.node('dialog-body').innerHTML,/熟した果実/);assert.match(no.node('dialog-body').innerHTML,/合わなければ/);no.action('decline');assert.equal(no.state().trade.order,null);assert.deepEqual(no.state().trade.relationship,s.trade.relationship);assert.equal(no.clock(),0);
 const yes=await boot({text:session(s)});yes.action('contract');assert.equal(yes.state().trade.order.status,'accepted');assert.equal(yes.state().trade.order.caskId,null);assert.deepEqual(yes.state().trade.contracts,s.trade.contracts);assert.equal(yes.clock(),s.core.casks.length||s.core.products.some(p=>p.stock>0&&s.productsById[p.id]?.listed)?1:0);yes.room('sales');yes.click('trade-info');assert.match(yes.node('dialog-body').innerHTML,/樽は未指定/);assert.match(yes.node('dialog-actions').innerHTML,/cancel-order-confirm/);
});
test('accepted order uses explicit existing barrel assignment and independent free cancellation',async()=>{
 const s=orderCheckpoint('accepted'),e=await boot({text:session(s)});if(!s.core.casks.length){e.room('distill');e.collect(65);e.fill('refill');}const id=e.state().core.casks.at(-1).id;e.room('warehouse');e.data('cask-rack',{caskId:String(id)});if(D.contractFor(e.state(),id)){e.click('contract-info');e.action('cancel-contract',id);}const remaining=e.state().trade.contracts;e.click('assign-wholesale');assert.match(e.node('dialog-actions').innerHTML,/通常卸売へ指定/);assert.match(e.node('dialog-actions').innerHTML,/この樽を特別注文へ指定/);e.action('assign-order',id);assert.equal(e.state().trade.order.caskId,id);assert.equal(e.state().trade.order.status,'assigned');assert.match(e.node('contract-info').textContent,/特別注文/);assert.equal(e.state().trade.contracts.filter(k=>k.caskId===id).length,1);
 e.click('glass-button');assert.equal(e.node('tasting-panel').hidden,false);assert.equal(e.clock(),0);e.click('end-tasting');assert.equal(e.clock(),1);e.click('contract-info');e.action('cancel-contract',id);assert.equal(e.state().trade.order.status,'accepted');assert.equal(e.state().trade.order.caskId,null);e.room('sales');e.click('trade-info');e.action('cancel-order-confirm');assert.match(e.node('dialog-body').innerHTML,/違約金はありません/);e.action('cancel-order');assert.equal(e.state().trade.order,null);assert.deepEqual(e.state().trade.relationship,s.trade.relationship);assert.deepEqual(e.state().trade.contracts,remaining);
});
test('unmet order can be tasted and resumed into explicit normal wholesale or own sale without silent repricing',async()=>{
 for(const paused of [false,true])for(const choice of ['order-wholesale','order-retail']){
  const s=orderCheckpoint('unmet'),id=s.trade.order.caskId,e=await boot({text:session(s,paused)}),cash=s.core.cash;
  assert.match(e.node('dialog-actions').innerHTML,/data-choice="order-wholesale"/);assert.match(e.node('dialog-actions').innerHTML,/data-choice="order-retail"/);assert.match(e.node('dialog-body').innerHTML,/通常卸売 £/);assert.equal(e.clock(),0);e.action('trial',id);assert.equal(e.node('tasting-panel').hidden,false);assert.equal(e.node('action-dialog').open,false);e.click('taste-bottle');assert.match(e.node('dialog-actions').innerHTML,/order-retail/);assert.equal(e.state().trade.order.status,'unmet');assert.equal(e.state().core.cash,cash);e.action('trial',id);const reload=await boot({text:e.text()});reload.click('end-tasting');assert.match(reload.node('dialog-actions').innerHTML,/order-retail/);reload.action('choose',id,{choice,event:'order-unmet'});assert.equal(reload.state().trade.order,null);assert.equal(reload.intent(),paused);
  if(choice==='order-wholesale'){assert.equal(D.currentCask(reload.state(),id),null);assert(reload.state().core.cash>cash);assert.equal(reload.state().records.at(-1).order.outcome,'unmet-wholesale');}
  else {assert(D.currentCask(reload.state(),id));assert.equal(reload.state().core.cash,cash);assert.equal(reload.state().notesById[id].orderOutcome.outcome,'unmet-retail');}
  const final=reload.state(),work=final.core.casks.length>0||final.still.phase==='distilling'||final.core.products.some(p=>p.stock>0&&final.productsById[p.id]?.listed);if(!final.decisions.length)assert.equal(reload.clock(),paused||!work?0:1);else assert.equal(reload.clock(),0);
 }
});
test('successful special shipment retains displayed record facts and ordinary relationship',async()=>{
 const s=orderCheckpoint('due'),e=await boot({text:session(s)}),id=s.trade.order.caskId;e.month();assert.equal(e.state().core.month,s.core.month+1);assert.equal(e.state().trade.order,null);assert.equal(D.currentCask(e.state(),id),null);const r=e.state().records.find(r=>r.caskId===id)||e.state().records.at(-1);assert.equal(r.order.outcome,'fulfilled');assert.equal(r.unitPrice,26.10);assert.match(e.node('records-body').innerHTML,/特別注文達成/);assert(e.state().trade.relationship);assert.doesNotMatch(e.node('ledger-body').innerHTML,/undefined/);
});
