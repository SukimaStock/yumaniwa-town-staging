import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as M from '../v03/model.mjs';
import {traceScenario} from '../v03/scenarios.mjs';
import {visualTrace} from '../v04-visual/timeline.mjs';
import {mapFor,pinsMarkup,VARIANTS} from './map.mjs';

const pin=(s,id)=>mapFor(s,2).pins.find(p=>p.id===id),stock=(s,id)=>s.sales.products.reduce((n,p)=>n+(p.shops[id]??0),0);
test('fixed visual frames are canonical v03 saves and contain only the information known at that time',()=>{
 const trace=visualTrace({seed:42,shopId:'bar',scenario:'D'}),first=trace.frames[0].session,firstMap=mapFor(first,2),before=M.serialize(first);
 assert.equal(pin(first,'bar').sold,0);assert.equal(pin(first,'bar').remaining,5);assert.equal(pin(first,'bar').positiveCount,0);
 assert.equal(pin(first,'bar').pastMemory,null);
 for(const frame of trace.frames){
  const s=M.restore(M.serialize(frame.session));assert.deepEqual(mapFor(s,2),mapFor(frame.session,2));
  const p=pin(s,'bar');assert.equal(p.remaining,stock(s,'bar'));
  if(p.pastMemory){const r=s.relations.bar.archive.find(x=>x.productId===p.pastMemory.productId);assert.ok(r.sold>0&&r.lastSale<=frame.month);}
 }
 assert.equal(M.serialize(trace.state),M.serialize(traceScenario({seed:42,shopId:'bar',scenario:'D'}).state));
 assert.equal(M.serialize(first),before);assert.deepEqual(mapFor(first,2),firstMap);
});
test('all products, recalls and reallocation preserve map counts without fabricating sales or positive reports',()=>{
 let s=M.create({seed:42});s=M.transact(s,{type:'place',shopId:'bar',portion:'all'});s=M.transact(s,{type:'confirm'});s=M.transact(s,{type:'advance',months:1});
 const oldSold=pin(s,'bar').sold;
 s=M.transact(s,{type:'next',sample:'smoke',years:3,tier:'standard'});const id=s.sales.selectedId;
 s=M.transact(s,{type:'place',shopId:'bar',portion:'all'});s=M.transact(s,{type:'confirm'});
 assert.equal(pin(s,'bar').sold,oldSold);assert.equal(pin(s,'bar').remaining,stock(s,'bar'));assert.equal(pin(s,'bar').reportProductId,id);
 assert.equal(pin(s,'bar').buyerPositive,null);assert.equal(pin(s,'bar').buyerNegative,null);
 s=M.transact(s,{type:'advance',months:1});const p=pin(s,'bar'),positive=p.positiveCount,sold=p.sold,count=s.sales.products.find(p=>p.id===id).shops.bar;
 assert.ok(count>0);
 s=M.transact(s,{type:'recall',productId:id,shopId:'bar'});
 assert.equal(pin(s,'bar').sold,sold);assert.equal(pin(s,'bar').positiveCount,positive);assert.equal(pin(s,'bar').remaining,p.remaining-count);
 s=M.transact(s,{type:'place',shopId:'diner',portion:'all'});assert.ok(!pin(s,'diner'));s=M.transact(s,{type:'confirm'});
 assert.equal(pin(s,'diner').remaining,count);assert.equal(pin(s,'diner').sold,0);assert.equal(pin(s,'diner').positiveCount,0);assert.equal(pin(s,'bar').sold,sold);
});
test('viewpoint and visual mode changes are read-only and independent from current expectations fading',()=>{
 const s=visualTrace({seed:42,shopId:'specialist',scenario:'D'}).state,before=M.serialize(s);
 for(const stage of [2,3])for(const variant of Object.keys(VARIANTS)){const p=mapFor(s,stage);assert.equal(p.pins.length,1);pinsMarkup(p,variant,'specialist');}
 assert.equal(M.serialize(s),before);
 const gap=M.transact(s,{type:'wait',months:120}),old=pin(s,'specialist'),now=pin(gap,'specialist');
 assert.equal(now.sold,old.sold);assert.equal(now.remaining,0);assert.equal(now.positiveCount,old.positiveCount);assert.equal(mapFor(gap,2).pins.some(p=>p.id==='bar'),false);
});
test('all three existing memory policies preserve replay and map save compatibility',()=>{
 for(const policy of Object.keys(M.POLICIES)){
  const opts={seed:42,shopId:'bar',scenario:'D',policy},s=visualTrace(opts).state;
  assert.equal(M.serialize(s),M.serialize(traceScenario(opts).state));assert.deepEqual(mapFor(M.restore(M.serialize(s)),3),mapFor(s,3));
 }
});

test('stored 100-seed results and example log reproduce the declared matrix',()=>{
 const evidence=JSON.parse(readFileSync(new URL('./results.json',import.meta.url),'utf8'));
 assert.deepEqual(evidence.seeds,Array.from({length:100},(_,i)=>i+1));assert.equal(evidence.histories,1200);
 assert.equal(evidence.checks.canonicalFinalEquality,1200);assert.equal(evidence.checks.frameFacts,12000);
 assert.equal(evidence.checks.stageFacts,24000);assert.equal(evidence.checks.viewNonmutation,72000);
 assert.equal(evidence.checks.emptyGap,300);assert.equal(evidence.checks.multipleStoreFixtures,100);assert.equal(evidence.checks.multipleStoreFacts,300);
 assert.ok(evidence.totals.unsoldReportFrames>0);assert.ok(evidence.totals.nonpositiveReportFrames>0);assert.equal(evidence.totals.maxPins,3);
 const saved=readFileSync(new URL('./example-log.json',import.meta.url),'utf8'),s=M.restore(saved);
 assert.equal(s.sales.seed,42);assert.equal(M.serialize(s),M.serialize(traceScenario({seed:42,shopId:'bar',scenario:'D'}).state));
 for(const stage of [2,3])assert.deepEqual(mapFor(M.restore(M.serialize(s)),stage),mapFor(s,stage));
});
