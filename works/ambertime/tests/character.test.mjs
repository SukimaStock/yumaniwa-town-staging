import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../journey.mjs';
import * as Old from '../journey-v03.mjs';
import { ageCask } from '../model.mjs';
const toChoice=j=>{for(let n=0;n<88&&j.phase==='watching';n++)j=J.tick(j);return j;};
const run=(seed,policy='wait',sample=false)=>{let j=J.newJourney(seed),guard=0;while(j.phase!=='finished'&&guard++<100){if(sample&&j.phase==='watching'&&J.currentCask(j).age%6===0)j=J.endTasting(J.sampleJourney(j));if(j.phase==='choice'){const key=policy==='early'?'bottle':policy==='cool'&&j.pending.options.some(o=>o.id==='cool')?'cool':j.pending.options.some(o=>o.id==='wait')?'wait':'last';j=J.choose(j,key);}else j=J.tick(j);}assert.equal(j.phase,'finished');return j;};
test('free tasting freezes time and keeps earlier comparison on same-month repeat',()=>{
  let j=J.newJourney(2);const original=structuredClone(j);j=J.sampleJourney(j);assert.deepEqual(J.tick(j),j);assert.deepEqual(original,J.newJourney(2));
  j=J.endTasting(j);j=J.tick(j);j=J.sampleJourney(j);assert.equal(J.comparison(j).previous.age,0);assert.equal(J.comparison(j).current.age,1);
  j=J.endTasting(j);j=J.sampleJourney(j);assert.equal(j.samples.length,2);assert.equal(J.comparison(j).previous.age,0);assert.equal(J.comparison(j).lines.length,3);
  assert.deepEqual(J.restoreJourney(J.serializeJourney(j)),j);
});
test('a glass can be opened during a choice without resolving or erasing it',()=>{let j=toChoice(J.newJourney(3));const pending=structuredClone(j.pending);j=J.sampleJourney(j);assert.deepEqual(j.pending,pending);assert.equal(J.tick(j),j);j=J.endTasting(j);assert.deepEqual(j.pending,pending);assert.equal(j.phase,'choice');j=J.choose(j,'wait');assert.equal(j.view,'watching');});
test('cool shelf changes all three real aging rates with slower roughness relief',()=>{
  let j=toChoice(J.newJourney(3));assert.equal(j.pending.id,'rough');const initial=structuredClone(j),warm=J.choose(j,'wait'),cool=J.choose(j,'cool');
  assert.deepEqual(initial,j);const a=ageCask(J.currentCask(warm)),b=ageCask(J.currentCask(cool));assert.ok(b.wood<a.wood);assert.ok(b.litres>a.litres);assert.ok(b.roughness>a.roughness);
  assert.throws(()=>J.choose(cool,'cool'));let s=toChoice(cool);assert.ok(s.pending.options.every(o=>o.id!=='cool'));assert.deepEqual(J.restoreJourney(J.serializeJourney(s)),s);
});
test('neighboring seeds produce different curves and actual state-driven event paths',()=>{
  const games=Array.from({length:24},(_,i)=>run(i+1));const paths=new Set(games.map(j=>j.choices.map(x=>x.event).join('/')));assert.ok(paths.size>=4);assert.ok(games.some(j=>j.choices.some(c=>c.event==='fading')));assert.ok(games.some(j=>j.choices.some(c=>c.event==='loss')));assert.ok(new Set(games.map(j=>j.result.age)).size>=5);
  assert.ok(new Set(games.map(j=>j.result.cut.toFixed(3))).size>=20);assert.ok(new Set(games.map(j=>j.result.type)).size===2);
  for(const j of games){assert.ok(j.choices.length<=4);assert.ok(j.result.age<=87);assert.ok(j.result.cash>0);assert.equal(new Set(j.choices.map(c=>c.event)).size,j.choices.length);assert.deepEqual(J.restoreJourney(J.serializeJourney(j)),j);}
});
test('different meaningful decisions lead to different time, taste, volume and record',()=>{
  const early=run(3,'early',true),wait=run(3,'wait',true),cool=run(3,'cool',true);
  assert.ok(early.result.age<wait.result.age);assert.ok(early.result.litres>wait.result.litres);assert.notEqual(early.result.profile.roughness,wait.result.profile.roughness);assert.notDeepEqual(cool.result.profile,wait.result.profile);
  assert.ok(cool.result.memory.some(x=>x.includes('涼しい棚')));assert.ok(cool.result.samples.length>1);assert.deepEqual(cool,run(3,'cool',true));
});
test('free bottle is possible immediately, while paused, and while a prompt is pending',()=>{
  for(const j of [J.newJourney(4),J.sampleJourney(J.newJourney(4)),toChoice(J.newJourney(4))]){const done=J.finishJourney(j);assert.equal(done.phase,'finished');assert.equal(done.core.casks.length,0);assert.ok(done.result.bottles>0);assert.deepEqual(J.restoreJourney(J.serializeJourney(done)),done);}
});
test('same-condition replay accepts only reachable states and histories',()=>{
  let j=J.sampleJourney(J.newJourney(8));const tamper=(edit)=>{const x=structuredClone(j);edit(x);assert.throws(()=>J.restoreJourney(JSON.stringify(x)));};
  tamper(x=>x.samples[0].profile.roughness=0);tamper(x=>x.core.cash+=100);tamper(x=>x.actions[0].age=99);tamper(x=>x.version=99);tamper(x=>x.pending={id:'gift'});
  j=run(8,'cool',true);const x=structuredClone(j);x.result.memory.push('invented');x.records[x.records.length-1]=x.result;assert.throws(()=>J.restoreJourney(JSON.stringify(x)));
});
test('0.3 current choices, mature records and old physics survive conversion unchanged',()=>{
  let old=toChoiceOld(Old.newJourney(42));const raw=Old.serializeJourney(old),j=J.restoreJourney(raw);assert.equal(j.rules,'legacy');assert.deepEqual(j.core,old.core);assert.deepEqual(j.pending,old.pending);assert.equal(raw,Old.serializeJourney(old));
  let modern=J.endTasting(J.sampleJourney(j));old=Old.choose(old,'soft');modern=J.choose(modern,'soft');
  while(old.phase==='watching'){old=Old.tick(old);modern=J.tick(modern);assert.deepEqual(modern.core,old.core);}
  assert.deepEqual(modern.pending,old.pending);modern=J.sampleJourney(modern);assert.deepEqual(J.restoreJourney(J.serializeJourney(modern)),modern);
  old=Old.choose(old,'bottle');modern=J.choose(modern,'bottle');assert.deepEqual(modern.core,old.core);assert.equal(modern.result.age,old.result.age);assert.equal(modern.result.samples.length,2);assert.deepEqual(J.restoreJourney(J.serializeJourney(modern)),modern);
  const completed=J.restoreJourney(Old.serializeJourney(old));assert.deepEqual(completed.result,old.result);assert.deepEqual(completed.records,old.records);const next=J.nextJourney(completed);assert.equal(next.rules,'character');assert.deepEqual(next.records,old.records);assert.deepEqual(J.restoreJourney(J.serializeJourney(next)),next);
});
function toChoiceOld(j){while(j.phase==='watching')j=Old.tick(j);return j;}
test('legacy free trial and free finish preserve the frozen core until bottling',()=>{let old=toChoiceOld(Old.newJourney(5));let j=J.sampleJourney(J.restoreJourney(Old.serializeJourney(old)));j=J.finishJourney(j);assert.equal(j.phase,'finished');assert.equal(j.legacy.phase,'choice');assert.equal(j.result.rules,'legacy');assert.deepEqual(J.restoreJourney(J.serializeJourney(j)),j);});
test('three consecutive barrels preserve their factual records and distinct origins',()=>{let j=run(17,'early',true);const first=structuredClone(j.result);for(let n=0;n<2;n++){j=J.nextJourney(j);j=J.sampleJourney(j);j=J.finishJourney(j);}assert.equal(j.records.length,3);assert.deepEqual(j.records[0],first);assert.equal(new Set(j.records.map(r=>r.cut)).size,3);assert.deepEqual(J.restoreJourney(J.serializeJourney(j)),j);});
test('content-key validation cache never accepts in-place mutations after a warm save',()=>{
  const oldRecord=run(23,'wait',true).result;const j=J.newJourney(24,[oldRecord]);J.serializeJourney(j);J.serializeJourney(j);
  j.records[0].samples[0].profile.roughness=0;assert.throws(()=>J.serializeJourney(j));assert.throws(()=>J.restoreJourney(JSON.stringify(j)));
  const safe=J.newJourney(24,[run(23,'wait',true).result]);J.serializeJourney(safe);const bad=structuredClone(safe);bad.records[0].memory.push('架空の記憶');assert.throws(()=>J.restoreJourney(JSON.stringify(bad)));assert.doesNotThrow(()=>J.serializeJourney(safe));
});
test('history-free current replay preserves full legacy shelves and free-bottle eviction',()=>{
  const records=[];for(let seed=1;seed<=12;seed++){let old=toChoiceOld(Old.newJourney(seed));old=Old.choose(old,'bottle');records.push(old.result);}
  let old=toChoiceOld(Old.newJourney(13,records));old.round=13;let j=J.restoreJourney(Old.serializeJourney(old));assert.deepEqual(J.restoreJourney(J.serializeJourney(j)),j);
  j=J.sampleJourney(j);j=J.finishJourney(j);assert.equal(j.records.length,12);assert.equal(j.legacy.records.length,12);assert.deepEqual(j.legacy.records,records);assert.deepEqual(j.records.slice(0,-1),records.slice(1));assert.deepEqual(J.restoreJourney(J.serializeJourney(j)),j);
  old=Old.choose(old,'bottle');const completed=J.restoreJourney(Old.serializeJourney(old));assert.deepEqual(J.restoreJourney(J.serializeJourney(completed)),completed);
  const altered=structuredClone(completed);altered.legacy.core.cash++;assert.throws(()=>J.serializeJourney(altered));
});
