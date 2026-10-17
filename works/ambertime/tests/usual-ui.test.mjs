import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {advance,fill} from './brands-helpers.mjs';
import {fourCasks} from './wholesale-care-helpers.mjs';
const KEY='sukimastock.ambertime.wholesale.v10';
const V9='sukimastock.ambertime.wholesale.v9';
const OLD=['sukimastock.ambertime.economy.v2','sukimastock.ambertime.v1','sukimastock.ambertime.journey.v1','sukimastock.ambertime.distillery.v1','sukimastock.ambertime.parallel.v1'];
let imports=0;
async function boot({text=null,legacy=null,v4=null,v5=null,v6=null,v7=null,v8=null,v9=null,search='',readFails=false,initialWriteFails=false,consent=false}={}){
 const nodes=new Map(),timers=new Map(),events=new Map(),wevents=new Map(),writes=[],reads=[],storage=new Map(OLD.map(k=>[k,'preserve '+k]));if(text!==null)storage.set(KEY,text);if(v9!==null)storage.set(V9,v9);if(v8!==null)storage.set('sukimastock.ambertime.wholesale.v8',v8);if(v7!==null)storage.set('sukimastock.ambertime.wholesale.v7',v7);if(v6!==null)storage.set('sukimastock.ambertime.wholesale.v6',v6);if(v5!==null)storage.set('sukimastock.ambertime.wholesale.v5',v5);if(v4!==null)storage.set('sukimastock.ambertime.wholesale.v4',v4);if(legacy!==null)storage.set('sukimastock.ambertime.wholesale.v3',legacy);let next=0,writeFails=initialWriteFails;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,textContent:'',innerHTML:'',dataset:{},disabled:false,open:false,style:{values:{},setProperty(k,v){this.values[k]=v;}},classList:{toggle(){},add(){},remove(){}},setAttribute(){},events:new Map(),addEventListener(t,fn){this.events.set(t,fn);},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const nav=['distill','warehouse','sales'].map(r=>Object.assign(node('nav-'+r),{dataset:{room:r}}));
 globalThis.document={hidden:false,getElementById:node,querySelectorAll:()=>nav,body:node('body'),addEventListener:(t,f)=>events.set(t,f)};
 globalThis.window={addEventListener:(t,f)=>wevents.set(t,f)};globalThis.location={search};globalThis.confirm=()=>consent;
 globalThis.localStorage={getItem:k=>{reads.push(k);if(readFails)throw Error('denied');return storage.get(k)??null;},setItem:(k,v)=>{if(writeFails)throw Error('quota');writes.push({k,v});storage.set(k,v);}};
 globalThis.setTimeout=(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 for(const id of ['glass']){const n=node(id);let html='';n.htmlWrites=0;Object.defineProperty(n,'innerHTML',{get:()=>html,set:v=>{html=v;n.htmlWrites++;}});}
 await import('../usual-app.mjs?test='+imports++);
 const data=(id,dataset={})=>node(id).events.get('click')({target:{closest:()=>({dataset})}}),click=id=>data(id),fire=()=>{const t=[...timers.entries()].find(([,t])=>t.ms===100);assert(t,'clock expected');timers.delete(t[0]);t[1].fn();};
 const e={node,data,click,fire,timers,writes,reads,storage,clock:()=>[...timers.values()].filter(t=>t.ms===100).length,state:()=>JSON.parse(storage.get(KEY)).game,intent:()=>JSON.parse(storage.get(KEY)).userPaused,elapsed:()=>JSON.parse(storage.get(KEY)).elapsed,text:()=>storage.get(KEY),failWrites:v=>writeFails=v,
 room:r=>data('room-nav',{room:r}),action:(action,id='',extra={})=>data('dialog-actions',{action,id:String(id),...extra}),
 collect:(n=65)=>{click('start-distill');for(let i=0;i<n;i++)fire();click('stop-distill');},fill:type=>{click('open-fill');e.action('fill',type);},
 month:()=>{const m=e.state().core.month;for(let i=0;i<125&&e.state().core.month===m&&timers.size;i++)fire();},
 hidden:v=>{document.hidden=v;events.get('visibilitychange')();},hide:()=>wevents.get('pagehide')(),show:()=>wevents.get('pageshow')({persisted:true}),storageEvent:()=>wevents.get('storage')({key:KEY})};return e;
}


const session=(game,userPaused=false,elapsed=0)=>JSON.stringify({version:2,game,userPaused,elapsed});
const legacySession=(game,userPaused=false)=>JSON.stringify({version:1,game,userPaused});
const ready=({stopAt=60,type='bourbon',seed=42}={})=>advance(fill(D.newUsualDistillery(seed),{progress:stopAt,type}),1);
const queued=(options={})=>D.reserveUsual(ready(options));
function ticks(e,n){for(let i=0;i<n;i++)e.fire();}

test('v10 begins with manual distillation and records extraction and cask only after filling',async()=>{
 const e=await boot();assert.equal(e.state().version,10);assert.equal(e.state().usual.recipe,null);assert.equal(e.node('reserve-usual').disabled,true);
 e.collect(30);assert.equal(e.state().usual.recipe,null);e.fill('bourbon');
 assert.deepEqual(e.state().usual.recipe,{stopAt:30,type:'bourbon'});assert.match(e.node('usual-recipe').textContent,/抽出位置 30 \/ 100/);assert.match(e.node('usual-recipe').textContent,/蒸留 £120/);
 assert.equal(e.state().usual.reservation,null);assert.equal(e.node('reserve-usual').disabled,false);
});

test('v10 reservation waits for player time, cancels freely and excludes manual start',async()=>{
 const s=ready(),e=await boot({text:session(s,true)}),cash=s.core.cash;e.click('reserve-usual');
 assert.equal(e.state().usual.reservation.status,'queued');assert.equal(e.state().core.cash,cash);assert.equal(e.clock(),0);assert.match(e.node('usual-status').textContent,/時間を進めると/);assert.equal(e.node('start-distill').disabled,true);
 const before=e.text();e.click('start-distill');assert.equal(e.text(),before);
 e.click('cancel-usual');assert.equal(e.state().usual.reservation,null);assert.equal(e.state().core.cash,cash);assert.equal(e.node('start-distill').disabled,false);e.click('start-distill');assert.equal(e.state().still.phase,'distilling');assert.equal(e.state().core.cash,cash-120);assert.equal(e.clock(),0);
});

test('v10 starts on a real clock step and completes exactly one cask without room or modal changes',async()=>{
 const s=queued({stopAt:30,type:'refill'}),e=await boot({text:session(s)}),cash=s.core.cash,count=s.core.casks.length;
 assert.equal(e.state().still.phase,'ready');assert.equal(e.clock(),1);e.fire();
 assert.equal(e.state().usual.reservation.status,'active');assert.equal(e.state().still.distillation.progress,0); // Start is saved before the first extraction step.
 assert.equal(e.state().core.cash,cash-120);assert.equal(e.node('stop-distill').hidden,true);assert.equal(e.node('cancel-usual').hidden,true);
 ticks(e,29);assert.equal(e.state().usual.reservation,null);assert.equal(e.state().still.phase,'ready');assert.equal(e.state().core.casks.length,count+1);assert.equal(e.state().core.casks.at(-1).type,'refill');assert.equal(e.state().core.cash,cash-120-D.usualQuote(s).caskCost);
 assert.equal(e.node('action-dialog').open,false);assert.equal(e.node('room-warehouse').hidden,false);assert.match(e.node('work-notice').textContent,/一樽/);assert.deepEqual(e.state().usual.recipe,s.usual.recipe);
 ticks(e,10);e.hide();assert.equal(e.state().core.casks.length,count+1);assert.equal(e.state().operations.filter(o=>o.key==='start-usual').length,1);assert.equal(e.state().operations.filter(o=>o.key==='complete-usual').length,1);
});

test('v10 modal, tasting, page hiding and player pause stop queued and active extraction',async()=>{
 const e=await boot({text:session(queued())});e.click('open-bottle');assert.equal(e.clock(),0);e.click('close-dialog');assert.equal(e.clock(),1);
 e.click('taste-button');assert.equal(e.clock(),0);assert.notEqual(e.state().tastingId,null);e.click('end-tasting');assert.equal(e.clock(),1);
 e.hidden(true);assert.equal(e.clock(),0);assert.equal(e.state().usual.reservation.status,'queued');e.hidden(false);assert.equal(e.clock(),1);ticks(e,5);assert.equal(e.state().still.distillation.progress,5);
 e.click('toggle-time');assert.equal(e.clock(),0);assert.equal(e.intent(),true);const frozen=e.text();e.show();assert.equal(e.clock(),0);assert.equal(e.text(),frozen);
 e.click('toggle-time');e.click('open-bottle');assert.equal(e.clock(),0);e.click('close-dialog');e.hidden(true);assert.equal(e.clock(),0);assert.equal(e.state().still.distillation.progress,5);e.hidden(false);assert.equal(e.clock(),1);
});

test('v10 persists a 59/60 extraction and exact monthly remainder across reload',async()=>{
 const e=await boot({text:session(queued())});ticks(e,59);e.hide();const snapshot=e.text(),s=e.state();assert.equal(s.still.distillation.progress,59);assert.equal(e.elapsed(),5900);
 const expected=D.tickDistillery(D.distillStep(s)),again=await boot({text:snapshot});assert.equal(again.elapsed(),5900);assert.equal(again.state().still.distillation.progress,59);again.fire();
 assert.deepEqual(again.state(),expected);assert.equal(again.elapsed(),0);assert.equal(again.state().usual.reservation,null);assert.equal(again.state().operations.filter(o=>o.key==='complete-usual').length,1);
 const reloaded=await boot({text:again.text()});assert.deepEqual(reloaded.state(),expected);assert.equal(reloaded.elapsed(),0);
});

test('v10 a queued full rack continues through wholesale shipments and wakes after the final shipment',async()=>{
 let s=D.enableUsual(fourCasks());s=D.reserveUsual(s);const e=await boot({text:session(s)}),initialIds=new Set(s.core.casks.map(c=>c.id));
 assert.equal(e.state().core.casks.length,4);assert.match(e.node('usual-status').textContent,/予約中/);assert.equal(e.clock(),1);
 // Remove only the reservation after the first shipping window so the rack can empty,
 // then rebook the remembered recipe in the last-shipment month.
 let guard=0;while(e.state().core.casks.length===4&&guard++<20){e.month();if(e.node('action-dialog').open)e.action('decline');}
 assert(e.state().core.casks.length<4);assert.equal(e.state().usual.reservation.status,'queued');e.click('cancel-usual');
 guard=0;while(e.state().core.casks.length>0&&guard++<30){e.month();if(e.node('action-dialog').open)e.action('decline');}
 assert.equal(e.state().core.casks.length,0);assert.equal(e.clock(),0);e.room('distill');e.click('reserve-usual');assert.equal(e.clock(),1);e.fire();assert.equal(e.state().usual.reservation.status,'active');ticks(e,98);assert.equal(e.state().core.casks.length,1);assert(!initialIds.has(e.state().core.casks[0].id));assert.equal(e.state().usual.reservation,null);
});

test('v10 insufficient funds retain the queue without charging distillation or cask cost',async()=>{
 let s=fill(D.newUsualDistillery(42),{progress:30,type:'bourbon'});s=advance(s,66);s=D.reserveUsual(s);assert.equal(D.canBeginUsual(s).ok,false);
 const e=await boot({text:session(s)}),cash=s.core.cash,costs=s.core.totals.costs;e.fire();e.hide();assert.equal(e.state().core.cash,cash);assert.equal(e.state().core.totals.costs,costs);assert.equal(e.state().usual.reservation.status,'queued');assert.equal(e.state().still.phase,'ready');assert.match(e.node('usual-status').textContent,/£/);
});

test('v10 storage failure on automatic start or completion halts before another clock and retries once',async()=>{
 const e=await boot({text:session(queued({stopAt:30}))}),cash=e.state().core.cash;e.failWrites(true);e.fire();
 assert.equal(e.clock(),0);assert.equal(e.state().usual.reservation.status,'queued');assert.equal(e.state().core.cash,cash);assert.equal(e.node('recovery').hidden,false);
 e.failWrites(false);e.click('retry-save');assert.equal(e.state().usual.reservation.status,'active');assert.equal(e.state().core.cash,cash-120);assert.equal(e.clock(),1);ticks(e,29); // Progress 29, last successful checkpoint 25.
 e.failWrites(true);e.fire();assert.equal(e.clock(),0);assert.equal(e.state().usual.reservation.status,'active');assert.equal(e.state().still.distillation.progress,25);
 e.failWrites(false);e.click('retry-save');assert.equal(e.state().usual.reservation,null);assert.equal(e.state().core.casks.length,2);assert.equal(e.state().operations.filter(o=>o.key==='complete-usual').length,1);
 const again=await boot({text:e.text()});assert.deepEqual(again.state(),e.state());assert.equal(again.state().core.cash,cash-120-D.usualQuote(again.state()).caskCost);
});

test('v10 migrates v9 with raw source, recipe, sales and paused intent preserved',async()=>{
 const old=fill(D.newReputationDistillery(42),{progress:45,type:'refill'}),raw=legacySession(old,true),e=await boot({v9:raw});
 assert.equal(e.storage.get(V9),raw);assert.equal(e.state().version,10);assert.deepEqual(e.state().core,old.core);assert.deepEqual(e.state().brands,old.brands);assert.deepEqual(e.state().releases,old.releases);assert.deepEqual(e.state().usual.recipe,{stopAt:45,type:'refill'});assert.equal(e.state().usual.reservation,null);assert.equal(e.intent(),true);assert.equal(e.elapsed(),0);assert.equal(e.clock(),0);assert(e.writes.every(w=>w.k===KEY));
 const again=await boot({text:e.text(),v9:raw});assert.deepEqual(again.state(),e.state());assert.equal(again.storage.get(V9),raw);
});

test('v10 rejects malformed current sessions without fallback and preview does not use storage',async()=>{
 const old=legacySession(D.newReputationDistillery(42)),s=D.newUsualDistillery(42);
 for(const text of ['{bad',session(s,false,6000),session(s,false,59),legacySession(s)]){const e=await boot({text,v9:old});assert.equal(e.writes.length,0);assert.equal(e.clock(),0);assert.equal(e.node('recovery').hidden,false);assert.equal(e.storage.get(V9),old);assert(!e.reads.includes(V9));}
 const e=await boot({search:'?preview=1'});assert.equal(e.reads.length,0);assert.equal(e.writes.length,0);
});

test('v10 booking clears a paused three-month jump and skip cannot bypass a reservation',async()=>{
 const s=ready(),e=await boot({text:session(s,true)}),cash=s.core.cash,month=s.core.month;
 e.click('skip');assert.equal(e.clock(),1);e.click('reserve-usual');assert.equal(e.intent(),true);assert.equal(e.clock(),0);assert.equal(e.state().core.month,month);assert.equal(e.state().core.cash,cash);assert.equal(e.state().usual.reservation.status,'queued');assert.equal(e.node('skip').disabled,true);
 e.click('skip');assert.equal(e.clock(),0);assert.equal(e.state().core.month,month);assert.equal(e.state().core.cash,cash);
 e.click('toggle-time');e.fire();assert.equal(e.state().usual.reservation.status,'active');assert.equal(e.state().core.cash,cash-120);assert.equal(e.node('skip').disabled,true);e.click('skip');e.hide();assert.equal(e.elapsed(),100);assert.equal(e.state().still.distillation.progress,1);
});
