import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as J from '../journey.mjs';
const KEY='sukimastock.ambertime.journey.v1',OLD='sukimastock.ambertime.v1';
let moduleNumber=0;
// Actual application with a controlled clock and minimal DOM. Layout and touch
// are separate browser checks; these tests verify state/storage transactions.
async function boot({text=null,search='',readFails=false,consent=false,initialHidden=false}={}) {
 const nodes=new Map(),timers=new Map(),events=new Map(),windowEvents=new Map(),writes=[],calls=[];let timerId=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,textContent:'',innerHTML:'',dataset:{},disabled:false,events:new Map(),offsetWidth:400,classList:{remove(){},add(){},toggle(){}},addEventListener(t,fn){this.events.set(t,fn);}});return nodes.get(id);};
 globalThis.document={hidden:initialHidden,getElementById:node,querySelector:node,body:node('body'),addEventListener:(t,fn)=>events.set(t,fn)};
 globalThis.window={addEventListener:(t,fn)=>windowEvents.set(t,fn)};
 globalThis.location={search};globalThis.confirm=()=>consent;
 globalThis.localStorage={getItem:key=>{calls.push(key);if(readFails)throw Error('read denied');return key===OLD?'old economy':text;},setItem:(key,value)=>{writes.push({key,value});text=value;}};
 globalThis.setTimeout=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 await import('../journey-app.mjs?ui-test='+moduleNumber++);
 const active=()=>[...timers.values()].filter(v=>v.ms===J.JOURNEY_PARAMETERS.monthMs);
 return {node,writes,calls,active,text:()=>text,state:()=>JSON.parse(text),click:id=>node(id).events.get('click')({target:{closest:()=>null}}),
 choice:(id,event=node('decision').innerHTML.match(/data-event="([^"]+)"/)?.[1])=>node('decision').events.get('click')({target:{closest:()=>({dataset:{choice:id,event}})}}),
 next:()=>node('result').events.get('click')({target:{closest:()=>({id:'next-barrel'})}}),
 month:()=>{const entry=[...timers].find(([,v])=>v.ms===J.JOURNEY_PARAMETERS.monthMs);assert(entry,'one month callback');timers.delete(entry[0]);entry[1].fn();},
 hidden:v=>{document.hidden=v;events.get('visibilitychange')();},pagehide:()=>windowEvents.get('pagehide')(),pageshow:()=>windowEvents.get('pageshow')({persisted:true})};
}
test('fresh clock advances once; sampling cancels clock and stale callback cannot age the glass',async()=>{
 const e=await boot();assert.equal(e.active().length,1);e.month();const month=e.state().core.month,stale=e.active()[0].fn;
 e.click('taste-button');assert.equal(e.active().length,0);assert.equal(e.state().view,'tasting');stale();assert.equal(e.state().core.month,month);
 assert.equal(e.node('tasting-panel').hidden,false);assert(e.node('taste-current').innerHTML.includes('口当たり'));
 e.click('end-tasting');assert.equal(e.active().length,1);e.month();e.click('glass-button');assert.equal(e.state().samples.length,2);assert(e.node('taste-previous').innerHTML.includes('前回'));
 e.click('end-tasting');e.click('taste-button');assert.equal(e.state().samples.length,2);assert.equal(J.comparison(J.restoreJourney(e.text())).previous.age,month);
});
test('tasting from pause or pending decision returns to the same stop',async()=>{
 const e=await boot();e.click('toggle-time');e.click('taste-button');e.click('end-tasting');assert.equal(e.active().length,0);
 e.click('skip');const pending=e.state().pending;e.click('taste-button');assert.equal(e.node('decision').hidden,true);assert.equal(e.active().length,0);e.click('end-tasting');assert.deepEqual(e.state().pending,pending);assert.equal(e.active().length,0);assert.equal(e.node('decision').hidden,false);
});
test('trial-open save restores snapshots without overwrite and closes to explicit resume',async()=>{
 let j=J.tick(J.newJourney(2));j=J.sampleJourney(j);const text=J.serializeJourney(j),e=await boot({text});assert.equal(e.writes.length,0);assert.equal(e.text(),text);assert.equal(e.active().length,0);assert.equal(e.node('tasting-panel').hidden,false);
 e.click('end-tasting');assert.equal(e.active().length,0);assert.equal(e.node('toggle-time').textContent,'続きを見守る');e.click('toggle-time');e.month();assert.equal(e.state().samples.length,1);
});
test('old0.3 watching, decision and finished fixtures retain their full state on reopen',async()=>{
 for(const name of ['v03-watch','v03-choice','v03-result','v03-two-records']){
  const text=fs.readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url),'utf8'),original=JSON.parse(text),e=await boot({text});assert.equal(e.writes.length,0);assert.equal(e.text(),text);assert.equal(e.node('legacy-note').hidden,false);
  const wrapped=J.restoreJourney(text);assert.deepEqual(wrapped.legacy,original);assert.deepEqual(wrapped.core,original.core);assert.deepEqual(wrapped.records,original.records);
  if(original.phase!=='finished'){e.click('taste-button');assert.deepEqual(e.state().legacy,original);assert.equal(e.state().samples.length,1);assert.equal(e.state().version,2);}else{e.next();assert.equal(e.state().rules,'character');assert.deepEqual(e.state().records,original.records);}
 }
});
test('free bottle previews cost and never commits on open/cancel or a second click',async()=>{
 const e=await boot();e.click('taste-button');const before=e.text();e.click('taste-bottle');assert.equal(e.active().length,0);assert.equal(e.text(),before);assert(e.node('bottle-quote').textContent.includes('費用'));assert.equal(e.node('time-status').textContent,'瓶詰めする量を確かめる。');
 e.click('cancel-bottle');assert.equal(e.node('tasting-panel').hidden,false);assert.equal(e.text(),before);e.click('taste-bottle');e.click('confirm-bottle');const finished=e.text();assert.equal(e.state().phase,'finished');assert.equal(e.active().length,0);assert.equal(e.state().result.samples.length,1);e.click('confirm-bottle');assert.equal(e.text(),finished);e.next();assert.equal(e.state().round,2);assert.equal(e.state().records.length,1);assert.equal(e.active().length,1);
});
test('hidden, BFCache and initially hidden pages require foreground resume',async()=>{
 const e=await boot();e.click('taste-button');e.hidden(true);e.hidden(false);e.click('end-tasting');assert.equal(e.active().length,0);e.click('toggle-time');e.pagehide();e.pageshow();assert.equal(e.active().length,0);e.click('toggle-time');e.month();
 for(const search of ['', '?preview=1']){const b=await boot({search,initialHidden:true});assert.equal(b.active().length,0);b.hidden(false);assert.equal(b.active().length,0);b.click('toggle-time');assert.equal(b.active().length,1);}
});
test('decision actions reject old event buttons and duplicate clicks while preserving trials',async()=>{
 const e=await boot();e.click('skip');const event=e.state().pending.id;e.click('taste-button');const sampled=e.text();e.choice('wait',event);assert.equal(e.text(),sampled);e.click('end-tasting');e.choice('wait',event);const chosen=e.text();e.choice('wait',event);assert.equal(e.text(),chosen);e.click('skip');const next=e.text();e.choice('wait','not-this-event');assert.equal(e.text(),next);
});
test('preview never accesses either key through tasting/bottling/next',async()=>{
 const e=await boot({search:'?preview=1&seed=42',readFails:true});e.click('taste-button');e.click('taste-bottle');e.click('confirm-bottle');e.next();assert.equal(e.calls.length,0);assert.equal(e.writes.length,0);assert.equal(e.node('age').textContent,'0か月');
});
test('corrupt/future/read-failed saves remain untouched until reset consent',async()=>{
 for(const text of ['{broken','{"version":99}']){const e=await boot({text});assert.equal(e.node('recovery').hidden,false);assert.equal(e.active().length,0);e.click('reset');assert.equal(e.text(),text);assert.equal(e.writes.length,0);}
 const e=await boot({text:'{broken',readFails:true});e.click('reset');assert.equal(e.writes.length,0);const c=await boot({text:'{broken',consent:true});c.click('reset');assert.equal(c.state().version,2);assert(c.writes.every(w=>w.key===KEY));assert(c.calls.every(k=>k===KEY));
});
test('observation never displays full flavor and records carry actual tasting memories',async()=>{
 const e=await boot();assert.equal(e.node('tasting-panel').hidden,true);assert(!e.node('change').textContent.includes('刺激'));
 e.click('taste-button');e.click('end-tasting');e.click('skip');e.click('taste-button');e.click('taste-bottle');e.click('confirm-bottle');assert(e.node('result').innerHTML.includes('初めて試飲'));assert(e.node('records-body').innerHTML.includes('試飲と判断'));assert(e.state().result.samples.length>=2);
});

test('consecutive same-event casks display their own bottle counts',async()=>{
 const e=await boot({search:'?preview=1&seed=20261017'});e.click('skip');assert(e.node('decision').innerHTML.includes('51本'));e.choice('bottle');e.next();e.click('skip');assert(e.node('decision').innerHTML.includes('52本'));assert(!e.node('decision').innerHTML.includes('51本'));
});
test('BFCache bottle cancel requires explicit resume without visibility event',async()=>{
 const e=await boot();e.click('open-bottle');assert.equal(e.active().length,0);e.pagehide();e.pageshow();e.click('cancel-bottle');assert.equal(e.active().length,0);assert.equal(e.node('toggle-time').textContent,'続きを見守る');e.click('toggle-time');assert.equal(e.active().length,1);
});
