import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../economy.mjs';
const KEY='sukimastock.ambertime.economy.v2';
const OLD=['sukimastock.ambertime.v1','sukimastock.ambertime.journey.v1','sukimastock.ambertime.distillery.v1','sukimastock.ambertime.parallel.v1'];
let imports=0;
async function boot({text=null,search='',readFails=false,consent=false}={}){
 const nodes=new Map(),timers=new Map(),events=new Map(),wevents=new Map(),writes=[],reads=[],storage=new Map(OLD.map(k=>[k,'preserve '+k]));if(text!==null)storage.set(KEY,text);let next=0,writeFails=false;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,textContent:'',innerHTML:'',dataset:{},disabled:false,open:false,style:{values:{},setProperty(k,v){this.values[k]=v;}},classList:{toggle(){}},setAttribute(){},events:new Map(),addEventListener(t,fn){this.events.set(t,fn);},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const nav=['distill','warehouse','sales'].map(r=>Object.assign(node('nav-'+r),{dataset:{room:r}}));
 globalThis.document={hidden:false,getElementById:node,querySelectorAll:()=>nav,body:node('body'),addEventListener:(t,f)=>events.set(t,f)};
 globalThis.window={addEventListener:(t,f)=>wevents.set(t,f)};globalThis.location={search};globalThis.confirm=()=>consent;
 globalThis.localStorage={getItem:k=>{reads.push(k);if(readFails)throw Error('denied');return storage.get(k)??null;},setItem:(k,v)=>{if(writeFails)throw Error('quota');writes.push({k,v});storage.set(k,v);}};
 globalThis.setTimeout=(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 for(const id of ['glass']){const n=node(id);let html='';n.htmlWrites=0;Object.defineProperty(n,'innerHTML',{get:()=>html,set:v=>{html=v;n.htmlWrites++;}});}
 await import('../v07-app.mjs?test='+imports++);
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
test('default auto resumes after barrel-side tasting and cancelled bottling without another click',async()=>{
 const e=await boot();assert.equal(e.intent(),false);e.collect(30);e.fill('refill');assert.equal(e.timers.size,1);e.click('glass-button');assert.equal(e.timers.size,0);e.click('taste-bottle');e.action('cancel');assert.equal(e.state().tastingId,e.state().core.casks[0].id);assert.equal(e.timers.size,0);e.click('end-tasting');assert.equal(e.timers.size,1);assert.equal(e.intent(),false);e.click('open-bottle');assert.equal(e.timers.size,0);e.action('cancel');assert.equal(e.timers.size,1);
});
test('manual pause survives tasting, room movement, modal cancellation and a new distillation',async()=>{
 const e=await boot();e.collect(30);e.fill('refill');e.month();e.click('toggle-time');assert.equal(e.intent(),true);e.click('glass-button');e.click('taste-bottle');e.action('cancel');e.click('end-tasting');assert.equal(e.timers.size,0);e.room('sales');e.room('distill');e.click('start-distill');assert.equal(e.state().still.phase,'distilling');assert.equal(e.state().still.distillation.progress,0);assert.equal(e.timers.size,0);assert.equal(e.intent(),true);e.click('toggle-time');for(let i=0;i<5;i++)e.fire();assert.equal(e.state().still.distillation.progress,5);
});
test('two decisions hold every facility until the last choice, then one auto clock resumes',async()=>{
 const e=await boot({text:session(queued())});assert.equal(e.timers.size,0);const first=e.state().decisions[0];e.action('trial',first.caskId);e.click('taste-bottle');e.action('cancel');assert.equal(e.timers.size,0);e.click('end-tasting');choose(e);assert.equal(e.state().decisions.length,1);assert.equal(e.timers.size,0);assert.equal(e.intent(),false);choose(e);assert.equal(e.state().decisions.length,0);assert.equal(e.timers.size,1);e.month();assert.equal(e.state().core.month,19);
 const m=await boot({text:session(queued(),true)});choose(m);choose(m);assert.equal(m.timers.size,0);assert.equal(m.intent(),true);
});
test('bottling and price modals keep intent; listing resumes sale alongside remaining cask',async()=>{
 const e=await boot();e.collect(30);e.fill('refill');e.month();e.room('distill');e.collect(30);e.fill('bourbon');const a=e.state().core.casks[0].id;e.data('cask-rack',{caskId:a});e.click('open-bottle');e.action('bottle',a);assert.equal(e.timers.size,0);const p=e.state().result.productId;assert.equal(e.node('body').dataset.room,'sales');assert.match(e.node('dialog-actions').innerHTML,/data-action="price"/);assert.equal(e.timers.size,0);e.action('price',p,{tier:'high'});assert.equal(e.timers.size,0);e.action('list',p);assert.equal(e.timers.size,1);const age=e.state().core.casks[0].age;e.month();assert.equal(e.state().core.casks[0].age,age+1);assert(e.state().core.totals.revenue>0);e.data('product-shelf',{productId:p});e.action('cancel');assert.equal(e.timers.size,1);
 e.click('toggle-time');e.data('product-shelf',{productId:p});e.action('cancel');assert.equal(e.timers.size,0);assert.equal(e.intent(),true);
});
test('hidden return preserves partial month and intent with no catch-up or stale callback',async()=>{
 const e=await boot();e.collect(30);e.fill('refill');for(let i=0;i<10;i++)e.fire();const stale=[...e.timers.values()][0].fn,month=e.state().core.month,progress=e.node('body').style.values['--month-progress'];e.hidden(true);assert.equal(e.timers.size,0);assert.equal(e.intent(),false);stale();assert.equal(e.state().core.month,month);e.hidden(false);assert.equal(e.timers.size,1);assert.equal(e.node('body').style.values['--month-progress'],progress);for(let i=0;i<20;i++)e.fire();assert.equal(e.state().core.month,month+1);e.click('toggle-time');e.hidden(true);e.hidden(false);e.hide();e.show();assert.equal(e.timers.size,0);assert.equal(e.intent(),true);
});
test('reload restores auto or manual intent while tasting remains a temporary stop',async()=>{
 const e=await boot();e.collect(30);e.fill('refill');const r=await boot({text:e.text()});assert.equal(r.timers.size,1);r.click('toggle-time');const m=await boot({text:r.text()});assert.equal(m.timers.size,0);m.click('toggle-time');m.click('glass-button');const t=await boot({text:m.text()});assert.equal(t.timers.size,0);assert.equal(t.intent(),false);t.click('end-tasting');assert.equal(t.timers.size,1);
});
test('bounded three-month boost preserves base intent, including interruption and explicit stop',async()=>{
 const e=await boot();e.collect(30);e.fill('refill');e.click('toggle-time');const month=e.state().core.month;e.click('skip');for(let i=0;i<15&&e.timers.size;i++)e.fire();assert.equal(e.state().core.month,month+3);assert.equal(e.intent(),true);assert.equal(e.timers.size,0);e.click('skip');e.room('sales');assert.equal(e.timers.size,0);assert.equal(e.intent(),true);e.click('toggle-time');e.click('skip');for(let i=0;i<15&&e.timers.size;i++)e.fire();assert.equal(e.timers.size,0); // The first aging decision, not the boost, holds time.
 if(e.state().decisions.length)choose(e);assert.equal(e.intent(),false);assert.equal(e.timers.size,1);e.click('skip');e.click('toggle-time');assert.equal(e.intent(),true);assert.equal(e.timers.size,0);
});
test('save faults and competing tabs block time without erasing manual intent; retry resumes',async()=>{
 const e=await boot();e.collect(30);e.fill('refill');e.failWrites(true);e.room('sales');assert.equal(e.timers.size,0);assert.equal(e.intent(),false);assert.equal(e.node('time-status').textContent,'保存を確認するまで停止中');e.failWrites(false);e.click('retry-save');assert.equal(e.timers.size,1);e.storage.set(KEY,'another tab');e.storageEvent();assert.equal(e.timers.size,0);e.click('retry-save');assert.equal(e.text(),'another tab');assert.equal(e.timers.size,0);
});
test('shared month bar never becomes extraction fraction when rooms change',async()=>{
 const e=await boot();e.collect(30);const progress=e.node('body').style.values['--month-progress'];assert.equal(e.node('body').style.values['--extraction-progress'],0.3);e.room('sales');assert.equal(e.node('body').style.values['--month-progress'],progress);e.room('distill');assert.equal(e.node('body').style.values['--month-progress'],progress);assert.equal(e.node('body').style.values['--extraction-progress'],0.3);e.fill('refill');assert.equal(e.node('extraction-progress').hidden,true);
});
test('all old keys survive new economy reset, preview and invalid session recovery',async()=>{
 const e=await boot({consent:true});e.collect(30);e.fill('refill');e.click('reset');assert.equal(e.intent(),false);for(const k of OLD)assert.equal(e.storage.get(k),'preserve '+k);assert(e.writes.every(w=>w.k===KEY));
 const p=await boot({search:'?preview=1',readFails:true,consent:true});p.click('reset');assert.equal(p.reads.length,0);assert.equal(p.writes.length,0);
 for(const text of ['{broken','{"version":99}','{"version":1,"userPaused":"false","game":{}}']){const bad=await boot({text});assert.equal(bad.writes.length,0);assert.equal(bad.text(),text);assert.equal(bad.timers.size,0);assert.equal(bad.node('recovery').hidden,false);}
});

test('tasting interrupts a paused three-month boost and leaves manual stop intact',async()=>{
 const e=await boot();e.collect(30);e.fill('refill');e.click('toggle-time');e.click('skip');e.fire();e.click('glass-button');assert.equal(e.timers.size,0);e.click('end-tasting');assert.equal(e.timers.size,0);assert.equal(e.intent(),true);
});


test('extraction limit replaces stop with one fill action and commits stop99 once',async()=>{
 const e=await boot();e.click('start-distill');for(let i=0;i<110;i++)e.fire();
 assert.equal(e.node('stop-distill').hidden,true);assert.equal(e.node('open-fill').hidden,false);assert.equal(e.node('start-distill').hidden,true);assert.equal(e.node('body').style.values['--extraction-progress'],0.99);assert.equal(e.node('body').dataset.phase,'filling');
 e.click('open-fill');assert.equal(e.state().still.phase,'filling');assert.equal(e.state().still.distillation.progress,99);assert.deepEqual(e.state().operations.filter(o=>o.key==='stop').map(o=>o.value),[99]);assert.equal(e.node('dialog-title').textContent,'原酒を樽に詰める');assert.equal(e.timers.size,0);
 e.click('open-fill');assert.equal(e.state().operations.filter(o=>o.key==='stop').length,1);e.action('fill','refill');assert.equal(e.state().core.casks.length,1);assert.deepEqual(D.restoreDistillery(D.serializeDistillery(e.state())),e.state());
});
test('a paused saved extraction at the limit can go straight to filling without resuming time',async()=>{
 let s=D.startDistillation(D.newDistillery(42));for(let i=0;i<99;i++)s=D.distillStep(s);
 const e=await boot({text:session(s,true)});assert.equal(e.timers.size,0);assert.equal(e.node('stop-distill').hidden,true);assert.equal(e.node('open-fill').hidden,false);e.click('open-fill');e.action('fill','bourbon');assert.equal(e.state().core.casks.length,1);assert.equal(e.intent(),true);assert.equal(e.timers.size,0);
});
test('bottled products wait behind cask judgments then receive automatic FIFO pricing',async()=>{
 const e=await boot({text:session(queued())});const ids=e.state().core.casks.map(c=>c.id),products=[];
 for(const id of ids){e.action('quote',id);e.action('bottle',id);products.push(e.state().result.productId);assert.equal(e.timers.size,0);}
 assert.equal(e.state().decisions.length,0);assert.equal(e.node('body').dataset.room,'sales');assert.match(e.node('dialog-actions').innerHTML,new RegExp('data-action="price" data-id="'+products[0]+'"'));
 e.action('list',products[0]);assert.equal(e.timers.size,0);assert.match(e.node('dialog-actions').innerHTML,new RegExp('data-action="price" data-id="'+products[1]+'"'));e.action('list',products[1]);assert.equal(e.timers.size,1);assert.ok(products.every(id=>e.state().productsById[id].listed));
});
test('automatic price dialog may be cancelled without listing or overriding manual stop',async()=>{
 const e=await boot();e.collect(30);e.fill('refill');e.click('toggle-time');e.click('open-bottle');const id=e.state().core.casks[0].id;e.action('bottle',id);const p=e.state().result.productId;assert.equal(e.node('body').dataset.room,'sales');assert.equal(e.timers.size,0);e.action('cancel');assert.equal(e.state().productsById[p].listed,false);assert.equal(e.node('action-dialog').open,false);assert.equal(e.intent(),true);assert.equal(e.timers.size,0);e.data('product-shelf',{productId:p});e.action('price',p,{tier:'high'});e.action('list',p);assert.equal(e.timers.size,0);assert.equal(e.intent(),true);
});
