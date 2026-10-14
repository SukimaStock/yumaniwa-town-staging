import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newJourney,tick,choose,nextJourney,serializeJourney,JOURNEY_PARAMETERS} from '../journey.mjs';
const KEY='sukimastock.ambertime.journey.v1',OLD='sukimastock.ambertime.v1';
let moduleNumber=0;
// Real module/actions with a minimal DOM and controlled clock. This is a
// transaction/lifecycle test, not a browser layout or human play test.
async function boot({text=null,search='',readFails=false,consent=false,initialHidden=false}={}) {
 const nodes=new Map(),timers=new Map(),events=new Map(),windowEvents=new Map(),writes=[],calls=[];let timerId=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,textContent:'',innerHTML:'',dataset:{},events:new Map(),offsetWidth:400,classList:{remove(){},add(){}},addEventListener(t,fn){this.events.set(t,fn);}});return nodes.get(id);};
 globalThis.document={hidden:initialHidden,getElementById:node,querySelector:node,body:node('body'),addEventListener:(t,fn)=>events.set(t,fn)};
 globalThis.window={addEventListener:(t,fn)=>windowEvents.set(t,fn)};
 globalThis.location={search};globalThis.confirm=()=>consent;
 globalThis.localStorage={getItem:key=>{calls.push(key);if(readFails)throw Error('read denied');return key===OLD?'old data':text;},setItem:(key,value)=>{writes.push({key,value});text=value;}};
 globalThis.setTimeout=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 await import('../journey-app.mjs?ui-test='+moduleNumber++);
 const active=()=>[...timers.values()].filter(v=>v.ms===JOURNEY_PARAMETERS.monthMs);
 return {node,writes,calls,active,text:()=>text,click:id=>node(id).events.get('click')({target:{closest:()=>null}}),
  choice:(id,stage=node('decision').innerHTML.match(/data-stage="([^"]+)"/)?.[1])=>node('decision').events.get('click')({target:{closest:()=>({dataset:{choice:id,stage}})}}),
  month:()=>{const entry=[...timers].find(([,v])=>v.ms===JOURNEY_PARAMETERS.monthMs);assert(entry,'one foreground month scheduled');timers.delete(entry[0]);entry[1].fn();},
  hidden:value=>{document.hidden=value;events.get('visibilitychange')();},pagehide:()=>windowEvents.get('pagehide')(),pageshow:()=>windowEvents.get('pageshow')({persisted:true})};
}
test('fresh foreground advances one month; hidden and BFCache return need explicit resume',async()=>{
 const e=await boot();assert.equal(e.active().length,1);e.month();assert.equal(JSON.parse(e.text()).core.month,1);assert.equal(e.active().length,1);
 e.hidden(true);assert.equal(e.active().length,0);e.hidden(false);assert.equal(e.active().length,0);assert.equal(e.node('toggle-time').textContent,'続きを見守る');e.click('toggle-time');assert.equal(e.active().length,1);
 e.pagehide();assert.equal(e.active().length,0);e.pageshow();assert.equal(e.active().length,0);e.click('toggle-time');e.month();assert.equal(JSON.parse(e.text()).core.month,2);
 assert(e.calls.every(k=>k===KEY));assert(e.writes.every(w=>w.key===KEY));
});
test('reopen watching save pauses without modifying existing bytes',async()=>{
 let j=tick(newJourney());const text=serializeJourney(j),e=await boot({text});assert.equal(e.text(),text);assert.equal(e.writes.length,0);assert.equal(e.active().length,0);e.click('toggle-time');e.month();assert.equal(JSON.parse(e.text()).core.month,2);
});
test('choice stops clock, double and stale choices cannot apply extra transactions',async()=>{
 const e=await boot();e.click('skip');const stopped=e.text();assert.equal(e.active().length,0);assert.equal(e.node('decision').hidden,false);e.choice('soft');const one=e.text();e.choice('soft','direction');assert.equal(e.text(),one);assert.notEqual(one,stopped);
 e.click('skip');const arrival=e.text();assert.equal(JSON.parse(arrival).pending.id,'arrival');e.choice('bottle','direction');assert.equal(e.text(),arrival);e.choice('nonsense','arrival');assert.equal(e.text(),arrival);assert.equal(e.active().length,0);
 e.choice('bottle');assert.equal(JSON.parse(e.text()).phase,'finished');assert.equal(e.active().length,0);e.click('next-barrel');assert.equal(JSON.parse(e.text()).round,2);assert.equal(e.active().length,1);
});
test('preview never touches either storage key through a complete barrel and next',async()=>{
 const e=await boot({search:'?preview=1',readFails:true});e.month();e.click('skip');e.choice('wood');e.click('skip');e.choice('bottle');assert.equal(e.node('result').hidden,false);e.click('next-barrel');assert.equal(e.node('age').textContent,'0か月');assert.equal(e.calls.length,0);assert.equal(e.writes.length,0);
});
test('corrupt and future saves remain intact until explicit confirmed reset',async()=>{
 for(const text of ['{broken','{"version":99}']){const e=await boot({text});assert.equal(e.node('game').hidden,true);assert.equal(e.node('recovery').hidden,false);assert.equal(e.writes.length,0);e.click('reset');assert.equal(e.text(),text);assert.equal(e.writes.length,0);}
 const e=await boot({text:'{broken',consent:true});e.click('reset');assert.equal(JSON.parse(e.text()).phase,'watching');assert.equal(e.active().length,1);assert(e.writes.every(w=>w.key===KEY));
});
test('failed read never creates or overwrites a game without reset consent',async()=>{
 const text=serializeJourney(newJourney()),e=await boot({text,readFails:true});assert.equal(e.active().length,0);assert.equal(e.writes.length,0);e.click('reset');assert.equal(e.text(),text);assert.equal(e.writes.length,0);
 const approved=await boot({text,readFails:true,consent:true});approved.click('reset');assert.equal(approved.writes.length,1);assert.equal(approved.writes[0].key,KEY);
});
function finish(j){while(j.phase!=='finished'){if(j.phase==='watching')j=tick(j);else j=choose(j,j.pending.options.some(o=>o.id==='soft')?'soft':j.pending.options.some(o=>o.id==='wait')?'wait':j.pending.options.some(o=>o.id==='last')?'last':'bottle');}return j;}
test('thirteenth record replaces the oldest visibly even though shelf remains twelve',async()=>{
 let j=newJourney();for(let i=0;i<12;i++){j=finish(j);j=nextJourney(j);}
 assert.equal(j.records.length,12);const e=await boot({text:serializeJourney(j)}),old=e.node('records-body').innerHTML;e.click('skip');e.choice('bottle');const saved=JSON.parse(e.text());assert.equal(saved.records.length,12);assert.equal(saved.result.round,13);assert.notEqual(e.node('records-body').innerHTML,old);assert.equal((e.node('records-body').innerHTML.match(/record-history/g)??[]).length,12);
});

test('fresh background load is visibly paused and waits for foreground resume',async()=>{
 for(const search of ['', '?preview=1']){const e=await boot({search,initialHidden:true});assert.equal(e.active().length,0);assert.equal(e.node('toggle-time').textContent,'続きを見守る');e.hidden(false);assert.equal(e.active().length,0);e.click('toggle-time');assert.equal(e.active().length,1);e.month();assert.equal(e.node('age').textContent,'1か月');}
});
