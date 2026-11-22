import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../economy.mjs';
// Restore precisely the former projection in an otherwise identical module.
// This independent legacy path protects reads in the reused distillery layer.
const url=new URL('../economy.mjs',import.meta.url);
const current="function projectedStill(s){return {core:s.core,phase:s.still.phase,distillation:s.still.distillation,batch:s.still.batch,operations:[]};}";
const former="function projectedStill(s){return {...s,phase:s.still.phase,distillation:s.still.distillation,batch:s.still.batch,operations:[]};}";
let source=fs.readFileSync(url,'utf8');assert(source.includes(current));
source=source.replace(current,former).replace(/from (['"])(\.\.?\/[^'"]+)\1/g,(_,quote,path)=>'from '+quote+new URL(path,url).href+quote);
const Legacy=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function enriched(){const s=E.newDistillery(42);const log={month:0,text:'history'};s.labConnection={town:{events:[log],arrivals:[log],attempts:[]}};s.other={history:[log],nested:{value:1}};return s;}
function compare(name,input,...args){
 const before=structuredClone(input),expected=Legacy[name](input,...args),actual=E[name](input,...args);
 assert.deepEqual(actual,expected,name+' legacy output');assert.equal(JSON.stringify(actual),JSON.stringify(expected),name+' property order');assert.deepEqual(input,before,name+' input');
 if(actual!==input){actual.labConnection.town.events[0].text='changed';actual.other.nested.value=9;assert.deepEqual(input,before,name+' detached output');}
 return expected;
}
test('minimal still projection preserves legacy start and completely detaches unrelated histories',()=>{compare('startDistillation',enriched());});
test('minimal still projection preserves normal steps, stopping and guards',()=>{
 const started=E.startDistillation(enriched());
 for(const progress of [0,30,65,98,99]){const s=structuredClone(started);s.still.distillation.progress=progress;compare('distillStep',s);if(progress>=30)compare('stopDistillation',s);}
 for(const change of [s=>s.tastingId=1,s=>s.decisions.push({id:1}),s=>s.still.phase='ready']){const s=structuredClone(started);change(s);compare('distillStep',s);}
 const tooEarly=structuredClone(started);assert.throws(()=>E.stopDistillation(tooEarly));assert.throws(()=>Legacy.stopDistillation(tooEarly));assert.deepEqual(tooEarly,started);
});
test('still projection excludes unrelated getters from redundant legacy clone',()=>{
 // Generated replay state has no getters; this additionally counts the retained
 // full public copy, showing unrelated data is copied once instead of twice.
 const s=enriched();let copies=0;Object.defineProperty(s,'largeHistory',{enumerable:true,get(){copies++;return {rows:[1,2]};}});
 E.startDistillation(s);assert.equal(copies,1);
});
