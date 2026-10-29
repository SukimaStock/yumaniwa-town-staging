import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as M from '../v03/model.mjs';
import {traceScenario} from '../v03/scenarios.mjs';
import {visualTrace} from './timeline.mjs';
import {sceneFor,renderScene,VARIANTS} from './scene.mjs';

const realStock=(s,shopId)=>s.sales.products.reduce((n,p)=>n+(p.shops[shopId]??0),0);
test('visual checkpoints preserve the complete canonical v03 operation history',()=>{
 for(const shopId of ['bar','diner','specialist'])for(const scenario of ['A','B','C','D']){
  const options={seed:42,shopId,scenario},trace=visualTrace(options),base=traceScenario(options);
  assert.equal(trace.frames.length,10);assert.equal(M.serialize(trace.state),M.serialize(base.state));
  for(let i=0;i<5;i++){
   const delivery=trace.frames[i*2],sales=trace.frames[i*2+1];
   assert.equal(delivery.phase,'delivery');assert.equal(sales.phase,'sales');
   assert.equal(delivery.release,i+1);assert.equal(sales.month-delivery.month,6);
   assert.equal(realStock(delivery.session,shopId),5);
   assert.ok(realStock(sales.session,shopId)<=5);
   assert.equal(delivery.session.sales.products.find(p=>p.id===delivery.productId).sold,0);
  }
 }
});
test('a replay frame is a complete restorable state; later frames do not alter earlier memories',()=>{
 const trace=visualTrace({seed:42,shopId:'bar',scenario:'D'});
 const first=trace.frames[0].session,before=JSON.stringify(first);
 for(const frame of trace.frames){assert.equal(M.serialize(M.restore(M.serialize(frame.session))),M.serialize(frame.session));sceneFor(frame.session,'bar');}
 assert.equal(JSON.stringify(first),before);
 assert.equal(sceneFor(first,'bar').memories.length,0);
});
test('scene projection remains signed, store-local and pure through a long empty gap',()=>{
 const trace=visualTrace({seed:42,shopId:'bar',scenario:'D'}),s=trace.state,before=M.serialize(s);
 assert.equal(realStock(s,'bar'),0);
 const original=sceneFor(s,'bar'),other=sceneFor(s,'diner');assert.equal(other.memories.length,0);assert.equal(other.stockCount,0);
 const gap=M.transact(s,{type:'wait',months:120}),later=sceneFor(gap,'bar');
 assert.deepEqual(later.memories.map(x=>[x.productId,x.sold,x.supportCount]),original.memories.map(x=>[x.productId,x.sold,x.supportCount]));
 assert.ok(later.expectationStrength<original.expectationStrength);
 assert.equal(M.serialize(s),before);
});
test('all view variants use the same stock and real positive records without changing the model',()=>{
 const s=visualTrace({seed:42,shopId:'bar',scenario:'D'}).frames[8].session,before=M.serialize(s),scene=sceneFor(s,'bar');
 for(const variant of Object.keys(VARIANTS)){
  const html=renderScene(scene,variant);
  assert.equal((html.match(/data-kind="current"/g)??[]).length,scene.visibleCurrent.length);
  assert.equal((html.match(/data-kind="memory"/g)??[]).length,scene.visibleMemories.length);
  assert.match(html,/現物在庫ではありません/);
  for(const r of scene.memories){const actual=s.relations.bar.archive.find(x=>x.productId===r.productId);assert.ok(actual.sold>0&&actual.supportCount>0);}
 }
 assert.equal(M.serialize(s),before);
});
test('existing v03 memory-policy choices retain their complete history in visual replay',()=>{
 for(const policy of Object.keys(M.POLICIES)){
  const options={seed:42,shopId:'bar',scenario:'D',policy};
  assert.equal(M.serialize(visualTrace(options).state),M.serialize(traceScenario(options).state));
 }
});

test('published 100-seed evidence and example save reproduce the declared matrix',()=>{
 const evidence=JSON.parse(readFileSync(new URL('./results.json',import.meta.url),'utf8'));
 assert.deepEqual(evidence.seeds,Array.from({length:100},(_,i)=>i+1));
 assert.deepEqual(evidence.shops,['bar','diner','specialist']);assert.deepEqual(evidence.scenarios,['A','B','C','D']);
 assert.equal(evidence.histories,1200);assert.equal(evidence.checks.canonicalFinalEquality,1200);
 assert.equal(evidence.checks.exactStock,12000);assert.equal(evidence.checks.viewStateEquality,36000);
 assert.equal(evidence.checks.emptyGaps,300);assert.ok(evidence.totals.excludedNonpositivePurchases>0);
 assert.ok(evidence.totals.excludedUnsoldRecords>0);assert.ok(evidence.totals.positiveRecords>0);
 const saved=readFileSync(new URL('./example-log.json',import.meta.url),'utf8'),restored=M.restore(saved);
 assert.equal(restored.sales.seed,42);
 const canonical=traceScenario({seed:42,shopId:'bar',scenario:'D'}).state;
 assert.equal(M.serialize(restored),M.serialize(canonical));
 for(const v of Object.keys(VARIANTS))assert.equal(renderScene(sceneFor(restored,'bar'),v),renderScene(sceneFor(canonical,'bar'),v));
});
