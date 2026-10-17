import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
const KEY='sukimastock.ambertime.wholesale.v8';
const OLD=['sukimastock.ambertime.economy.v2','sukimastock.ambertime.v1','sukimastock.ambertime.journey.v1','sukimastock.ambertime.distillery.v1','sukimastock.ambertime.parallel.v1'];
let imports=0;
async function boot({text=null,legacy=null,v4=null,v5=null,v6=null,v7=null,search='',readFails=false,initialWriteFails=false,consent=false}={}){
 const nodes=new Map(),timers=new Map(),events=new Map(),wevents=new Map(),writes=[],reads=[],storage=new Map(OLD.map(k=>[k,'preserve '+k]));if(text!==null)storage.set(KEY,text);if(v7!==null)storage.set('sukimastock.ambertime.wholesale.v7',v7);if(v6!==null)storage.set('sukimastock.ambertime.wholesale.v6',v6);if(v5!==null)storage.set('sukimastock.ambertime.wholesale.v5',v5);if(v4!==null)storage.set('sukimastock.ambertime.wholesale.v4',v4);if(legacy!==null)storage.set('sukimastock.ambertime.wholesale.v3',legacy);let next=0,writeFails=initialWriteFails;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,textContent:'',innerHTML:'',dataset:{},disabled:false,open:false,style:{values:{},setProperty(k,v){this.values[k]=v;}},classList:{toggle(){},add(){},remove(){}},setAttribute(){},events:new Map(),addEventListener(t,fn){this.events.set(t,fn);},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const nav=['distill','warehouse','sales'].map(r=>Object.assign(node('nav-'+r),{dataset:{room:r}}));
 globalThis.document={hidden:false,getElementById:node,querySelectorAll:()=>nav,body:node('body'),addEventListener:(t,f)=>events.set(t,f)};
 globalThis.window={addEventListener:(t,f)=>wevents.set(t,f)};globalThis.location={search};globalThis.confirm=()=>consent;
 globalThis.localStorage={getItem:k=>{reads.push(k);if(readFails)throw Error('denied');return storage.get(k)??null;},setItem:(k,v)=>{if(writeFails)throw Error('quota');writes.push({k,v});storage.set(k,v);}};
 globalThis.setTimeout=(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 for(const id of ['glass']){const n=node(id);let html='';n.htmlWrites=0;Object.defineProperty(n,'innerHTML',{get:()=>html,set:v=>{html=v;n.htmlWrites++;}});}
 await import('../brands-app.mjs?test='+imports++);
 const data=(id,dataset={})=>node(id).events.get('click')({target:{closest:()=>({dataset})}}),click=id=>data(id),fire=()=>{const t=[...timers.entries()][0];assert(t,'clock expected');timers.delete(t[0]);t[1].fn();};
 const e={node,data,click,fire,timers,writes,reads,storage,clock:()=>[...timers.values()].filter(t=>t.ms===100).length,state:()=>JSON.parse(storage.get(KEY)).game,intent:()=>JSON.parse(storage.get(KEY)).userPaused,text:()=>storage.get(KEY),failWrites:v=>writeFails=v,
 room:r=>data('room-nav',{room:r}),action:(action,id='',extra={})=>data('dialog-actions',{action,id:String(id),...extra}),
 collect:(n=65)=>{click('start-distill');for(let i=0;i<n;i++)fire();click('stop-distill');},fill:type=>{click('open-fill');e.action('fill',type);},
 month:()=>{const m=e.state().core.month;for(let i=0;i<125&&e.state().core.month===m&&timers.size;i++)fire();},
 hidden:v=>{document.hidden=v;events.get('visibilitychange')();},hide:()=>wevents.get('pagehide')(),show:()=>wevents.get('pageshow')({persisted:true}),storageEvent:()=>wevents.get('storage')({key:KEY})};return e;
}


const session=(game,userPaused=false)=>JSON.stringify({version:1,game,userPaused});
function bottle(e){e.room('warehouse');e.click('open-bottle');assert.equal(e.node('dialog-title').textContent,'この樽を瓶に残す');e.action('bottle',e.state().core.casks[0].id);}
function input(e,id,value,type='input'){e.node('dialog-body').events.get(type)({target:{id,value}});}
test('v8 default branding is immediate; price and listing follow bottling',async()=>{
 const e=await boot();assert.equal(e.state().version,8);e.collect();e.fill('bourbon');e.click('open-bottle');
 assert.match(e.node('dialog-body').innerHTML,/AmberTime 1/);assert.match(e.node('dialog-body').innerHTML,/ボトル・ラベルを選ぶ/);
 e.action('bottle',e.state().core.casks[0].id);assert.equal(e.state().brands.length,1);assert.equal(e.state().releases.length,1);assert.equal(e.state().brands[0].name,'AmberTime 1');
 assert.equal(e.node('dialog-title').textContent,'AmberTime 1');assert.equal(e.node('room-sales').hidden,false);const r=e.state().releases[0];e.action('price',r.productId,{tier:'high'});e.action('list',r.productId);
 assert.equal(e.state().releases[0].listed,true);assert.equal(e.state().releases[0].price,e.state().core.products[0].price);assert.match(e.node('ledger-body').innerHTML,/銘柄と発売の記録/);assert.equal(e.clock(),1);
 const again=await boot({text:e.text()});assert.deepEqual(again.state(),e.state());assert.match(again.node('product-shelf').innerHTML,/AmberTime 1/);
});
test('v8 custom identity is escaped, reused unchanged and multiple releases survive reload',async()=>{
 const e=await boot();e.collect();e.fill('bourbon');e.click('open-bottle');input(e,'brand-name','川霧 <&>');input(e,'brand-bottle','slender','change');input(e,'brand-label','dark','change');
 e.action('bottle',e.state().core.casks[0].id);const first=e.state().releases[0];e.action('list',first.productId);assert.match(e.node('product-shelf').innerHTML,/川霧 &lt;&amp;&gt;/);
 e.room('distill');e.collect();e.fill('refill');e.click('open-bottle');input(e,'brand-choice',String(e.state().brands[0].id),'change');assert.doesNotMatch(e.node('dialog-body').innerHTML,/id="brand-name"/);
 e.action('bottle',e.state().core.casks[0].id);assert.equal(e.state().brands.length,1);assert.equal(e.state().releases.length,2);assert.equal(e.state().releases[1].brandId,e.state().releases[0].brandId);assert.equal(e.state().brands[0].bottle,'slender');assert.equal(e.state().brands[0].label,'dark');assert.equal(e.state().brands[0].name,'川霧 <&>');
 const again=await boot({text:e.text()});assert.equal(again.state().releases.length,2);assert.match(again.node('ledger-body').innerHTML,/発売2/);
});
test('v8 preserves old v7 raw save, paused intent and wholesale bypass',async()=>{
 const fs=await import('node:fs');let old=D.enablePromisedCare(D.restoreDistillery(fs.readFileSync(new URL('./fixtures/partners-accepted.json',import.meta.url),'utf8')));const raw=session(old,true),e=await boot({v7:raw});assert.equal(e.storage.get('sukimastock.ambertime.wholesale.v7'),raw);assert.equal(e.state().version,8);assert.equal(e.intent(),true);assert.equal(e.state().brands.length,0);assert.equal(e.state().releases.length,0);
 e.room('warehouse');e.click('contract-info');assert.match(e.node('dialog-title').textContent,/卸売契約/);assert.doesNotMatch(e.node('dialog-body').innerHTML,/brand-choice|銘柄名/);assert.equal(e.clock(),0);
 e.click('close-dialog');e.click('taste-button');assert.equal(e.clock(),0);e.click('end-tasting');assert.equal(e.clock(),0);
});
test('v8 preview never reads storage and corrupt new key does not fall back',async()=>{
 const e=await boot({search:'?preview=1'});assert.equal(e.reads.length,0);assert.equal(e.writes.length,0);
 const broken=await boot({text:'{bad',v7:session(D.newPromisedDistillery(42))});assert.equal(broken.writes.length,0);assert.equal(broken.node('recovery').hidden,false);assert.equal(broken.clock(),0);
});
test('v8 draft survives preview rerenders and cancel does not create a brand',async()=>{
 const e=await boot();e.collect();e.fill('bourbon');e.click('open-bottle');input(e,'brand-name','窓辺');e.click('close-dialog');assert.equal(e.state().brands.length,0);e.click('open-bottle');assert.match(e.node('dialog-body').innerHTML,/窓辺/);input(e,'brand-name','');e.action('bottle',e.state().core.casks[0].id);assert.equal(e.state().brands.length,0);assert.equal(e.state().core.casks.length,1);assert.equal(e.node('action-dialog').open,true);
});
test('v8 branding and price modals resume only the prior player time intent',async()=>{
 for(const paused of [false,true]){
  const e=await boot();e.collect();e.fill('bourbon');if(paused)e.click('toggle-time');e.click('open-bottle');assert.equal(e.clock(),0);e.action('bottle',e.state().core.casks[0].id);assert.equal(e.clock(),0);assert.equal(e.intent(),paused);const r=e.state().releases[0];e.action('list',r.productId);assert.equal(e.intent(),paused);assert.equal(e.clock(),paused?0:1);
 }
});
