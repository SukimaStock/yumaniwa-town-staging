import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
const KEY='sukimastock.ambertime.wholesale.v7';
const OLD=['sukimastock.ambertime.economy.v2','sukimastock.ambertime.v1','sukimastock.ambertime.journey.v1','sukimastock.ambertime.distillery.v1','sukimastock.ambertime.parallel.v1'];
let imports=0;
async function boot({text=null,legacy=null,v4=null,v5=null,v6=null,search='',readFails=false,initialWriteFails=false,consent=false}={}){
 const nodes=new Map(),timers=new Map(),events=new Map(),wevents=new Map(),writes=[],reads=[],storage=new Map(OLD.map(k=>[k,'preserve '+k]));if(text!==null)storage.set(KEY,text);if(v6!==null)storage.set('sukimastock.ambertime.wholesale.v6',v6);if(v5!==null)storage.set('sukimastock.ambertime.wholesale.v5',v5);if(v4!==null)storage.set('sukimastock.ambertime.wholesale.v4',v4);if(legacy!==null)storage.set('sukimastock.ambertime.wholesale.v3',legacy);let next=0,writeFails=initialWriteFails;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,textContent:'',innerHTML:'',dataset:{},disabled:false,open:false,style:{values:{},setProperty(k,v){this.values[k]=v;}},classList:{toggle(){},add(){},remove(){}},setAttribute(){},events:new Map(),addEventListener(t,fn){this.events.set(t,fn);},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const nav=['distill','warehouse','sales'].map(r=>Object.assign(node('nav-'+r),{dataset:{room:r}}));
 globalThis.document={hidden:false,getElementById:node,querySelectorAll:()=>nav,body:node('body'),addEventListener:(t,f)=>events.set(t,f)};
 globalThis.window={addEventListener:(t,f)=>wevents.set(t,f)};globalThis.location={search};globalThis.confirm=()=>consent;
 globalThis.localStorage={getItem:k=>{reads.push(k);if(readFails)throw Error('denied');return storage.get(k)??null;},setItem:(k,v)=>{if(writeFails)throw Error('quota');writes.push({k,v});storage.set(k,v);}};
 globalThis.setTimeout=(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 for(const id of ['glass']){const n=node(id);let html='';n.htmlWrites=0;Object.defineProperty(n,'innerHTML',{get:()=>html,set:v=>{html=v;n.htmlWrites++;}});}
 await import('../wholesale-care-app.mjs?test='+imports++);
 const data=(id,dataset={})=>node(id).events.get('click')({target:{closest:()=>({dataset})}}),click=id=>data(id),fire=()=>{const t=[...timers.entries()][0];assert(t,'clock expected');timers.delete(t[0]);t[1].fn();};
 const e={node,data,click,fire,timers,writes,reads,storage,clock:()=>[...timers.values()].filter(t=>t.ms===100).length,state:()=>JSON.parse(storage.get(KEY)).game,intent:()=>JSON.parse(storage.get(KEY)).userPaused,text:()=>storage.get(KEY),failWrites:v=>writeFails=v,
 room:r=>data('room-nav',{room:r}),action:(action,id='',extra={})=>data('dialog-actions',{action,id:String(id),...extra}),
 collect:(n=65)=>{click('start-distill');for(let i=0;i<n;i++)fire();click('stop-distill');},fill:type=>{click('open-fill');e.action('fill',type);},
 month:()=>{const m=e.state().core.month;for(let i=0;i<125&&e.state().core.month===m&&timers.size;i++)fire();},
 hidden:v=>{document.hidden=v;events.get('visibilitychange')();},hide:()=>wevents.get('pagehide')(),show:()=>wevents.get('pageshow')({persisted:true}),storageEvent:()=>wevents.get('storage')({key:KEY})};return e;
}


const session=(game,userPaused=false)=>JSON.stringify({version:1,game,userPaused});
import fs from 'node:fs';
function oldAccepted(){return D.restoreDistillery(fs.readFileSync(new URL('./fixtures/partners-accepted.json',import.meta.url),'utf8'));}
function oldRough(){let s=oldAccepted();s=D.startDistillation(s);while(s.still.distillation.progress<99)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'bourbon');const id=s.core.casks.at(-1).id;s=D.assignCask(s,id,s.trade.relationship.terms[0].id);for(let i=0;i<6;i++)s=D.tickDistillery(s);assert.equal(s.notesById[id].pending.id,'rough');return {s,id};}
test('v7 imports old booked cool prompt as observation without modal or fabricated choice',async()=>{
 const {s,id}=oldRough(),old=session(s),e=await boot({v6:old});
 assert.equal(e.storage.get('sukimastock.ambertime.wholesale.v6'),old);assert.equal(e.state().version,7);assert.equal(e.state().decisions.length,0);
 assert.equal(e.state().notesById[id].pending,null);assert.equal(e.state().notesById[id].cooled,false);assert.equal(e.state().notesById[id].choices.length,0);
 assert.equal(e.node('action-dialog').open,false);assert.equal(e.clock(),1);assert.equal(e.state().core.cash,s.core.cash);
 assert.deepEqual(D.restoreDistillery(JSON.stringify(e.state())),e.state());
 e.data('cask-rack',{caskId:String(id)});e.click('contract-info');assert.match(e.node('dialog-actions').innerHTML,/涼しい棚へ移す/);assert.equal(e.clock(),0);
 e.action('care',id);assert.equal(e.state().notesById[id].cooled,true);assert.equal(e.state().notesById[id].choices.at(-1).key,'cool');
 assert.equal(e.state().operations.at(-1).key,'care');assert.equal(e.state().core.cash,s.core.cash);assert.deepEqual(D.contractFor(e.state(),id),D.contractFor(s,id));assert.equal(e.clock(),1);
 e.click('contract-info');assert.doesNotMatch(e.node('dialog-actions').innerHTML,/data-action="care"/);
});
test('v7 tasting and reload keep cask beside glass and resume only intended time',async()=>{
 const {s,id}=oldRough();for(const paused of [false,true]){
  const e=await boot({v6:session(s,paused)});e.data('cask-rack',{caskId:String(id)});e.click('taste-button');assert.equal(e.clock(),0);assert.equal(e.node('room-warehouse').hidden,false);
  const again=await boot({text:e.text()});assert.equal(again.state().tastingId,id);assert.equal(again.node('tasting-panel').hidden,false);again.click('end-tasting');
  assert.equal(again.state().decisions.length,0);assert.equal(again.node('action-dialog').open,false);assert.equal(again.intent(),paused);assert.equal(again.clock(),paused?0:1);
 }
});
test('v7 upgrade preserves tasting, partial distillation and old-key contents',async()=>{
 const {s,id}=oldRough(),tasted=D.sampleDistillery(s,id),text=session(tasted,true),e=await boot({v6:text});assert.equal(e.state().tastingId,id);assert.equal(e.state().notesById[id].pending,null);assert.equal(e.state().notesById[id].view,'tasting');assert.equal(e.storage.get('sukimastock.ambertime.wholesale.v6'),text);e.click('end-tasting');assert.equal(e.clock(),0);
 let part=D.startDistillation(oldAccepted());for(let i=0;i<37;i++)part=D.distillStep(part);const b=await boot({v6:session(part,true)});assert.deepEqual(b.state().still,part.still);assert.equal(b.state().core.cash,part.core.cash);assert.equal(b.clock(),0);
});
test('v7 corrupt key and failed write never rewind or overwrite v6',async()=>{
 const raw=session(oldAccepted(),true),e=await boot({text:'{bad',v6:raw});assert.equal(e.writes.length,0);assert.equal(e.storage.get('sukimastock.ambertime.wholesale.v6'),raw);assert.equal(e.node('recovery').hidden,false);assert.equal(e.clock(),0);
 const full=await boot({v6:raw,initialWriteFails:true});assert.equal(full.storage.has(KEY),false);assert.equal(full.storage.get('sukimastock.ambertime.wholesale.v6'),raw);assert.equal(full.clock(),0);
});
test('v7 preserves important funds modal and denies optional care while judgment is needed',async()=>{
 const s=D.restoreDistillery(fs.readFileSync(new URL('./fixtures/v08-legal-funds.json',import.meta.url),'utf8')),e=await boot({v6:session(s)});
 assert(e.state().decisions.some(d=>d.eventId==='funds'));assert.equal(e.node('action-dialog').open,true);assert.equal(e.clock(),0);
 for(const c of e.state().core.casks)assert.equal(D.canCare(e.state(),c.id),false);
});
test('v7 creation and reset use separate save key; previous app and entry stay available',async()=>{
 const e=await boot({consent:true});assert.equal(e.state().version,7);assert.equal(e.state().operations[0].key,'enable-promised-care');e.click('reset');assert.equal(e.state().version,7);
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),old=fs.readFileSync(new URL('../v010.html',import.meta.url),'utf8');assert.match(html,/aroma-app/);assert.match(html,/v013.html/);assert.match(fs.readFileSync(new URL('../v013.html',import.meta.url),'utf8'),/usual-app/);assert.match(html,/v012.html/);assert.match(fs.readFileSync(new URL('../v012.html',import.meta.url),'utf8'),/reputation-app/);assert.match(html,/v011.html/);assert.match(fs.readFileSync(new URL('../v011.html',import.meta.url),'utf8'),/brands-app/);assert.match(html,/v010-care.html/);assert.match(fs.readFileSync(new URL('../v010-care.html',import.meta.url),'utf8'),/wholesale-care-app/);assert.match(html,/v010.html/);assert.match(old,/partners-app.mjs/);assert.doesNotMatch(old,/wholesale-care-app/);
});
