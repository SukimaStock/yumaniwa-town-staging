import test from 'node:test';
import assert from 'node:assert/strict';
const KEY='sukimastock.ambertime.parallel.v1';
const OLD=['sukimastock.ambertime.v1','sukimastock.ambertime.journey.v1','sukimastock.ambertime.distillery.v1'];
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
 await import('../parallel-app.mjs?test='+imports++);
 const data=(id,dataset={})=>node(id).events.get('click')({target:{closest:()=>({dataset})}}),click=id=>data(id),fire=()=>{const t=[...timers.entries()][0];assert(t,'clock expected');timers.delete(t[0]);t[1].fn();};
 const e={node,data,click,fire,timers,writes,reads,storage,state:()=>JSON.parse(storage.get(KEY)),text:()=>storage.get(KEY),failWrites:v=>writeFails=v,
 room:r=>data('room-nav',{room:r}),action:(action,id='',extra={})=>data('dialog-actions',{action,id:String(id),...extra}),
 collect:(n=65)=>{click('start-distill');for(let i=0;i<n;i++)fire();if(n<100)click('stop-distill');},fill:type=>{click('open-fill');e.action('fill',type);},
 month:()=>{const m=e.state().core.month;for(let i=0;i<125&&e.state().core.month===m&&timers.size;i++)fire();},
 hidden:v=>{document.hidden=v;events.get('visibilitychange')();},storageEvent:()=>wevents.get('storage')({key:KEY})};return e;
}
test('controller supports two casks, independent tasting, A sale while B ages, then reinvestment',async()=>{
 const e=await boot();e.collect(65);e.fill('refill');const a=e.state().core.casks[0].id;e.month();e.room('distill');e.collect(80);e.fill('bourbon');const b=e.state().core.casks[1].id;
 e.data('cask-rack',{caskId:a});e.click('glass-button');assert.equal(e.state().tastingId,a);assert.equal(e.timers.size,0);e.click('end-tasting');e.data('cask-rack',{caskId:b});e.click('glass-button');assert.equal(e.state().notesById[a].samples.length,1);assert.equal(e.state().notesById[b].samples.length,1);e.click('end-tasting');
 e.data('cask-rack',{caskId:a});e.click('open-bottle');e.action('bottle',a);assert.equal(e.state().core.casks.length,1);assert.equal(e.state().core.casks[0].id,b);const p=e.state().result.productId;e.action('to-sales',p);e.data('product-shelf',{productId:p});e.action('list',p);const before=e.state().core.casks[0].age;e.month();assert.equal(e.state().core.casks[0].age,before+1);assert(e.state().core.totals.revenue>0);const cash=e.state().core.cash;e.room('distill');e.click('start-distill');assert.equal(e.state().core.cash,cash-260);assert.equal(e.state().records.length,1);
});
test('one clock survives navigation, but stale callbacks never age a tasting or double a month',async()=>{
 const e=await boot();e.collect();e.fill('bourbon');for(let i=0;i<40;i++)e.fire();const stale=[...e.timers.values()][0].fn;e.room('sales');e.room('warehouse');assert.equal(e.timers.size,1);stale();assert.equal(e.timers.size,1);e.click('glass-button');const m=e.state().core.month;stale();assert.equal(e.state().core.month,m);assert.equal(e.timers.size,0);e.click('end-tasting');e.month();assert.equal(e.state().core.month,m+1);
 e.click('toggle-time');e.click('skip');for(let i=0;i<15&&e.timers.size;i++)e.fire();assert.equal(e.state().core.month,m+4);assert.equal(e.timers.size,0);
});
test('tasting and quote cancellation preserve samples and pause preference across reload',async()=>{
 const e=await boot();e.collect();e.fill('refill');e.click('toggle-time');e.click('glass-button');e.click('taste-bottle');e.action('cancel');assert.equal(e.node('tasting-panel').hidden,false);assert.equal(e.timers.size,0);const r=await boot({text:e.text()});assert.equal(r.state().tastingId,e.state().tastingId);assert.equal(r.writes.length,0);r.click('end-tasting');assert.equal(r.timers.size,0);r.click('toggle-time');assert.equal(r.timers.size,1);
});
test('mid-distillation save resumes without a second charge and hidden pages stay paused',async()=>{
 const e=await boot();e.click('start-distill');for(let i=0;i<45;i++)e.fire();const r=await boot({text:e.text()});assert.equal(r.state().still.distillation.progress,45);assert.equal(r.timers.size,0);r.click('toggle-time');for(let i=0;i<5;i++)r.fire();r.click('stop-distill');assert.equal(r.state().core.cash,3740);assert.equal(r.state().still.distillation.progress,50);r.fill('bourbon');r.hidden(true);r.hidden(false);assert.equal(r.timers.size,0);
});
test('preview avoids storage; all historical keys survive new play and own reset',async()=>{
 const p=await boot({search:'?preview=1',readFails:true,consent:true});p.collect(100);p.fill('refill');p.click('reset');assert.equal(p.reads.length,0);assert.equal(p.writes.length,0);
 const e=await boot({consent:true});e.collect();e.fill('bourbon');e.click('reset');for(const k of OLD)assert.equal(e.storage.get(k),'preserve '+k);assert(e.writes.every(w=>w.k===KEY));
});
test('invalid/read-failed saves remain intact; quota and competing-tab writes stop the clock',async()=>{
 for(const text of ['{broken','{"version":99}']){const e=await boot({text});assert.equal(e.node('recovery').hidden,false);assert.equal(e.writes.length,0);assert.equal(e.text(),text);}
 const denied=await boot({readFails:true});assert.equal(denied.writes.length,0);
 const e=await boot();e.collect();e.fill('bourbon');const saved=e.text();e.failWrites(true);e.click('glass-button');assert.equal(e.timers.size,0);assert.equal(e.text(),saved);assert.equal(e.node('recovery').hidden,false);e.failWrites(false);e.click('retry-save');assert.equal(e.state().tastingId,e.state().core.casks[0].id);e.click('end-tasting');e.click('toggle-time');e.storage.set(KEY,'another tab');e.storageEvent();assert.equal(e.timers.size,0);e.click('retry-save');assert.equal(e.text(),'another tab');
});
test('stale product and fill actions cannot target another modal or duplicate a cask',async()=>{
 const e=await boot();e.collect();e.fill('bourbon');const saved=e.text();e.action('fill','refill');assert.equal(e.text(),saved);e.click('open-bottle');e.action('price',1,{tier:'high'});e.action('list',1);assert.equal(e.text(),saved);e.action('bottle',999);assert.equal(e.text(),saved);
});

test('live display ranks stay sequential while actions, samples and saved IDs stay stable',async()=>{
 const e=await boot();e.collect();e.fill('refill');e.month();e.room('distill');e.collect();e.fill('bourbon');const [a,b]=e.state().core.casks.map(c=>c.id);assert.deepEqual([a,b],[2,4]);
 assert(e.node('cask-rack').innerHTML.includes('<strong>樽1</strong>'));assert(e.node('cask-rack').innerHTML.includes('<strong>樽2</strong>'));assert(e.node('cask-kind').textContent.startsWith('樽2 ·'));
 e.data('cask-rack',{caskId:a});e.click('open-bottle');e.action('bottle',a);assert(e.node('work-notice').textContent.startsWith('樽1を'));assert(e.node('cask-rack').innerHTML.includes('<strong>樽1</strong>'));assert(!e.node('cask-rack').innerHTML.includes('<strong>樽2</strong>'));assert.equal(e.state().core.casks[0].id,b);assert(!e.node('records-body').innerHTML.includes(' · 樽 '+a));
 const r=await boot({text:e.text()});assert.equal(r.state().core.casks[0].id,b);assert(r.node('cask-kind').textContent.startsWith('樽1 ·'));
});
test('glass SVG survives tasting and 100ms renders instead of restarting the pour',async()=>{
 const e=await boot();e.collect(30);e.fill('refill');const writes=e.node('glass').htmlWrites;e.click('glass-button');assert.equal(e.node('glass').htmlWrites,writes);assert.notEqual(e.node('body').dataset.motion,'pour');e.click('glass-button');e.click('end-tasting');for(let i=0;i<10;i++)e.fire();assert.equal(e.node('glass').htmlWrites,writes);
 e.month();assert.equal(e.node('glass').htmlWrites,writes+1);e.click('glass-button');assert.equal(e.node('glass').htmlWrites,writes+1);assert.equal(e.state().notesById[e.state().tastingId].samples.length,2);
});
test('six-second month and completed extraction mark coexist with continuing cask aging',async()=>{
 const e=await boot();e.collect(30);e.fill('refill');const start=e.state().core.month;for(let i=0;i<30;i++)e.fire();assert.equal(e.state().core.month,start+1);assert.equal(e.node('time-status').textContent,'自動進行 · 約6秒で1か月');
 e.room('distill');e.collect(30);assert.equal(e.state().still.phase,'filling');assert.equal(e.node('body').style.values['--month-progress'],0.3);const month=e.state().core.month,age=e.state().core.casks[0].age,progress=e.state().still.distillation.progress;e.month();assert.equal(e.state().core.month,month+1);assert.equal(e.state().core.casks[0].age,age+1);assert.equal(e.state().still.distillation.progress,progress);assert.equal(e.node('body').style.values['--month-progress'],0.3);assert.equal(e.node('open-fill').hidden,false);assert.equal(e.node('distill-caption').textContent,'抽出完了。樽を選んで詰めます。');
});
