import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../distillery.mjs';
const KEY='sukimastock.ambertime.distillery.v1',OLD='sukimastock.ambertime.journey.v1',ECONOMY='sukimastock.ambertime.v1';
let imported=0;
async function boot({text=null,search='',readFails=false,consent=false,hidden=false}={}){
 const nodes=new Map(),timers=new Map(),events=new Map(),windowEvents=new Map(),writes=[],reads=[],storage=new Map([[OLD,'preserve04'],[ECONOMY,'preserve01']]);if(text!==null)storage.set(KEY,text);let id=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,textContent:'',innerHTML:'',dataset:{},disabled:false,style:{setProperty(){}},events:new Map(),classes:new Set(),classList:{add(k){this.node.classes.add(k);},remove(k){this.node.classes.delete(k);},toggle(k,v){if(v)this.node.classes.add(k);else this.node.classes.delete(k);}},addEventListener(t,fn){this.events.set(t,fn);}});nodes.get(id).classList.node=nodes.get(id);return nodes.get(id);};
 globalThis.document={hidden,getElementById:node,body:node('body'),addEventListener:(t,fn)=>events.set(t,fn)};
 globalThis.window={addEventListener:(t,fn)=>windowEvents.set(t,fn)};
 globalThis.location={search};globalThis.confirm=()=>consent;
 globalThis.localStorage={getItem:k=>{reads.push(k);if(readFails)throw Error('denied');return storage.get(k)??null;},setItem:(k,v)=>{writes.push({k,v});storage.set(k,v);}};
 globalThis.setTimeout=(fn,ms)=>{const n=++id;timers.set(n,{fn,ms});return n;};globalThis.clearTimeout=n=>timers.delete(n);
 await import('../distillery-app.mjs?test='+imported++);
 const click=id=>node(id).events.get('click')({target:{closest:()=>null}});
 const data=(id,dataset)=>node(id).events.get('click')({target:{closest:()=>({dataset})}});
 const active=ms=>[...timers.entries()].filter(([,v])=>v.ms===ms);
 const fire=ms=>{const n=active(ms)[0];assert(n,'pending timer '+ms);timers.delete(n[0]);n[1].fn();};
 return {node,writes,reads,storage,click,data,active,fire,state:()=>JSON.parse(storage.get(KEY)),text:()=>storage.get(KEY),
  collect:(n=65)=>{click('start-distill');for(let i=0;i<n;i++)fire(100);if(n<100)click('stop-distill');},fill:type=>data('cask-options',{cask:type}),
  choose:key=>data('decision',{choice:key,event:node('decision').innerHTML.match(/data-event="([^"]+)"/)?.[1]}),
  hidden:v=>{document.hidden=v;events.get('visibilitychange')();},hide:()=>windowEvents.get('pagehide')(),show:()=>windowEvents.get('pageshow')({persisted:true})};
}
test('start is paid, self-stopped raw spirit fills one cask and starts a single aging clock',async()=>{
 const e=await boot();assert.equal(e.state().phase,'ready');assert.equal(e.active(2200).length,0);e.collect(51);assert.equal(e.state().phase,'filling');assert.equal(e.state().core.cash,3740);assert.equal(e.state().batch.cut,0.3);e.fill('refill');assert.equal(e.state().core.cash,3640);assert.equal(e.state().core.casks[0].cut,0.3);assert.equal(e.active(2200).length,1);assert.equal(e.node('time-status').textContent,'熟成中 · 約2秒で1か月');
});
test('visible collection stops on tasting and stale callbacks cannot age the glass',async()=>{
 const e=await boot();e.collect();e.fill('bourbon');e.fire(2200);const stale=e.active(2200)[0][1].fn;e.click('taste-button');stale();assert.equal(e.state().core.month,1);assert.equal(e.active(2200).length,0);assert.equal(e.node('tasting-panel').hidden,false);e.click('end-tasting');e.fire(2200);e.click('glass-button');assert.equal(e.state().samples.length,2);assert(e.node('taste-previous').innerHTML.includes('前回'));e.click('glass-button');assert.equal(e.state().samples.length,2);
});
test('three-month advance is animated, bounded, respects pause and stops at a decision',async()=>{
 const e=await boot();e.collect(100);e.fill('refill');e.click('toggle-time');e.click('skip');assert.equal(e.active(450).length,1);e.fire(450);e.fire(450);e.fire(450);assert.equal(e.state().core.month,3);assert.equal(e.active(450).length,0);assert.equal(e.active(2200).length,0);assert.equal(e.node('toggle-time').textContent,'時間を進める');e.click('skip');for(let i=0;i<3&&e.active(450).length;i++)e.fire(450);assert.equal(e.state().phase,'choice');assert.equal(e.state().core.month,6);assert.equal(e.active(2200).length,0);
});
test('trial-open reload preserves samples, costs and requires explicit time resume',async()=>{
 const e=await boot();e.collect();e.fill('bourbon');e.click('taste-button');const text=e.text();const r=await boot({text});assert.equal(r.text(),text);assert.equal(r.writes.length,0);assert.equal(r.node('tasting-panel').hidden,false);r.click('end-tasting');assert.equal(r.active(2200).length,0);r.click('toggle-time');assert.equal(r.active(2200).length,1);
});
test('bottling is a real separate paid stage, then sale produces funds used for next distillation',async()=>{
 const e=await boot();e.collect();e.fill('refill');e.fire(2200);e.click('taste-button');const month=e.state().core.month,before=e.state().core.cash;e.click('taste-bottle');assert(e.node('bottle-wait').textContent.includes('販売資金'));assert.equal(e.active(2200).length,0);e.click('cancel-bottle');assert.equal(e.node('tasting-panel').hidden,false);e.click('taste-bottle');e.click('confirm-bottle');assert.equal(e.state().phase,'bottled');assert.equal(e.state().core.month,month);assert(e.state().core.cash<before);assert.equal(e.state().core.totals.revenue,0);const bottled=e.text();e.click('confirm-bottle');assert.equal(e.text(),bottled);e.fire(650);assert.equal(e.node('sales-panel').hidden,false);e.click('list-bottles');e.fire(2200);assert(e.state().core.totals.revenue>0);const cash=e.state().core.cash,stock=e.state().core.products[0].stock,oldId=e.state().core.products[0].id;e.click('next-batch');assert.equal(e.state().core.cash,cash);assert.equal(e.state().core.products[0].stock,stock);e.collect(30);assert.equal(e.state().core.cash,cash-260);e.fill('bourbon');assert.equal(e.state().core.products[0].id,oldId);assert.equal(e.state().records.length,1);
});
test('background or BFCache bottling cancellation never silently resumes time',async()=>{
 const e=await boot();e.collect();e.fill('bourbon');e.click('open-bottle');e.hide();e.show();e.click('cancel-bottle');assert.equal(e.active(2200).length,0);assert.equal(e.node('toggle-time').textContent,'時間を進める');e.click('toggle-time');e.click('taste-button');e.hidden(true);e.hidden(false);e.click('end-tasting');assert.equal(e.active(2200).length,0);
});
test('distillation mid-flow save resumes the same amount and charges no second fee',async()=>{
 const e=await boot();e.click('start-distill');for(let i=0;i<45;i++)e.fire(100);const saved=e.text(),r=await boot({text:saved});assert.equal(r.state().distillation.progress,45);assert.equal(r.active(100).length,0);r.click('toggle-time');for(let i=0;i<5;i++)r.fire(100);r.click('stop-distill');assert.equal(r.state().core.cash,3740);assert.equal(r.state().distillation.progress,50);
});
test('preview never touches any saved generation including reset',async()=>{
 const e=await boot({search:'?preview=1&seed=5',readFails:true,consent:true});e.collect(100);e.fill('bourbon');e.click('taste-button');e.click('reset');assert.equal(e.reads.length,0);assert.equal(e.writes.length,0);
});
test('old keys stay byte-for-byte intact through new play and explicit reset',async()=>{
 const e=await boot({consent:true});e.collect();e.fill('refill');e.click('reset');assert(e.writes.every(w=>w.k===KEY));assert.equal(e.storage.get(OLD),'preserve04');assert.equal(e.storage.get(ECONOMY),'preserve01');
});
test('corrupt/future/read-failed saves remain untouched without reset consent',async()=>{
 for(const text of ['{broken','{"version":99}']){const e=await boot({text});assert.equal(e.node('recovery').hidden,false);e.click('reset');assert.equal(e.text(),text);assert.equal(e.writes.length,0);}
 const r=await boot({readFails:true});assert.equal(r.writes.length,0);assert.equal(r.active(2200).length,0);
});
test('stale event buttons and duplicate filling cannot change the current barrel',async()=>{
 const e=await boot();e.collect(100);e.fill('refill');const first=e.text();e.fill('bourbon');assert.equal(e.text(),first);e.click('skip');for(let i=0;i<3;i++)e.fire(450);e.click('skip');for(let i=0;i<3&&e.active(450).length;i++)e.fire(450);e.click('taste-button');const trial=e.text();e.data('decision',{choice:'wait',event:'rough'});assert.equal(e.text(),trial);e.click('end-tasting');e.data('decision',{choice:'wait',event:'not-this-event'});assert.equal(e.state().phase,'choice');
});

test('reset during the short bottling handover clears the visual phase too',async()=>{
 const e=await boot({consent:true});e.collect();e.fill('refill');e.click('open-bottle');e.click('confirm-bottle');assert(e.node('body').classes.has('is-bottling'));e.click('reset');assert.equal(e.state().phase,'ready');assert(!e.node('body').classes.has('is-bottling'));assert.equal(e.active(650).length,0);
});
