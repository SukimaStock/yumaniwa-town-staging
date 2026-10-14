import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const KEY='sukimastock.ambertime.v1';
function environment({text=null,search='',readFails=false,confirm=false}={}) {
 const nodes=new Map(),events=new Map(),writes=[],calls=[];let failRead=readFails;
 const node=key=>{if(!nodes.has(key))nodes.set(key,{id:key.slice(1),hidden:true,disabled:false,value:'',textContent:'',innerHTML:'',dataset:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){}});return nodes.get(key);};
 globalThis.document={querySelector:node,querySelectorAll:()=>[],activeElement:null,body:{dataset:{}},addEventListener:(type,fn)=>events.set(type,fn)};
 globalThis.location={search};globalThis.window={confirm:()=>confirm};
 globalThis.localStorage={getItem:key=>{calls.push(key);if(failRead)throw Error('denied');return text;},setItem:(key,value)=>{writes.push({key,value});text=value;}};
 return {nodes,node,events,writes,calls,restoreRead:()=>{failRead=false;},text:()=>text,click:id=>events.get('click')({target:{closest:()=>({...node('#'+id),id})}})};
}
let caseNumber=0;
async function boot(options){const env=environment(options);await import('../app.mjs?storage-test='+caseNumber++);return env;}
test('existing0.1 empty save is not turned into an opening cask or written during load',async()=>{
 const text=readFileSync(new URL('./fixtures/v01-empty.json',import.meta.url),'utf8');const e=await boot({text});assert.equal(e.node('#cash').textContent,'£4,000');assert(e.node('#room').innerHTML.includes('0 / 4'));assert(!e.node('#room').innerHTML.includes('id="barrel-'));assert.equal(e.writes.length,0);assert.equal(e.text(),text);
});
test('existing0.1 partial cask and custom price remain unchanged on reopen',async()=>{
 const text=readFileSync(new URL('./fixtures/v01-game.json',import.meta.url),'utf8'),e=await boot({text});assert.equal(e.writes.length,0);assert.equal(e.text(),text);e.click('nav-sales'); // source-level click delegates on data-room, so use exact authored action below
 e.events.get('click')({target:{closest:()=>({dataset:{room:'sales'}})}});assert(e.node('#room').innerHTML.includes('£37.5'));assert(e.node('#room').innerHTML.includes('指定価格'));assert.equal(e.writes.length,0);
});
test('no save begins with paid8-month barrel but does not autosave merely by rendering',async()=>{
 const e=await boot();assert.equal(e.node('#cash').textContent,'£3,364');assert.equal(e.node('#month').textContent,'2026年9月');assert(e.node('#room').innerHTML.includes('id="barrel-2"'));assert.equal(e.writes.length,0);
});
test('corrupt/future saves are preserved instead of silently reset',async()=>{
 for(const text of ['{broken','{"version":99}']){const e=await boot({text});assert.equal(e.node('#recovery').hidden,false);assert.equal(e.node('#game').hidden,true);assert.equal(e.text(),text);assert.equal(e.writes.length,0);}
});
test('preview never reads or writes saved game even through month and save actions',async()=>{
 const e=await boot({search:'?preview=1',readFails:true});e.click('advance');e.click('save');assert.equal(e.calls.length,0);assert.equal(e.writes.length,0);assert.equal(e.node('#month').textContent,'2026年10月');
});
test('storage returns after failed read: existing game is not overwritten without consent',async()=>{
 const text=readFileSync(new URL('./fixtures/v01-game.json',import.meta.url),'utf8'),e=await boot({text,readFails:true,confirm:false});e.click('advance');e.restoreRead();e.click('save');assert.equal(e.writes.length,0);assert.equal(e.text(),text);assert(e.node('#storage-notice').textContent.includes('元の保存は残'));
});
test('storage returns with no existing game: explicit retry can persist memory game',async()=>{
 const e=await boot({readFails:true});e.click('advance');e.restoreRead();e.click('save');assert.equal(e.writes.length,1);assert.equal(JSON.parse(e.writes[0].value).month,9);assert.equal(e.writes[0].key,KEY);
});
