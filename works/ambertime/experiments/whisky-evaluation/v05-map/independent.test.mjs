import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../v03/model.mjs';
import {mapFor,pinsMarkup,VARIANTS} from './map.mjs';

const distribute=s=>{
 for(const [shopId,portion] of [['diner','1'],['bar','1'],['bar','1'],['specialist','all']])s=M.transact(s,{type:'place',shopId,portion});
 return M.transact(s,{type:'confirm'});
};
const freeze=o=>{if(o&&typeof o==='object'){Object.freeze(o);for(const v of Object.values(o))freeze(v);}return o;};

test('independent: reports from a shared SKU stay store-local, and old favorable purchases do not become reviews of a newly delivered SKU',()=>{
 let s=distribute(M.create({seed:42}));
 s=M.transact(s,{type:'advance',months:6});
 const before=mapFor(s),byId=new Map(before.pins.map(p=>[p.id,p]));
 assert.equal(byId.get('diner').sold,1);assert.equal(byId.get('bar').sold,2);assert.equal(byId.get('specialist').sold,0);
 assert.ok(byId.get('diner').buyerPositive);assert.ok(byId.get('bar').buyerPositive);assert.equal(byId.get('specialist').buyerPositive,null);
 const oldId=s.sales.selectedId;
 s=M.transact(s,{type:'next',sample:'smoke',years:20,tier:'standard'});s=distribute(s);
 const newestId=s.sales.selectedId,saved=M.serialize(s),snapshot=freeze(s);
 for(const stage of [2,3]){
  const projected=mapFor(snapshot,stage);
  for(const p of projected.pins){
   assert.equal(p.reportProductId,newestId);assert.equal(p.reportProduct.sold,0);assert.equal(p.reportProduct.evaluationCount,0);
   assert.equal(p.buyerPositive,null);assert.equal(p.buyerNegative,null);assert.notEqual(p.marker,'positive');
   assert.equal(p.sold,byId.get(p.id).sold);assert.equal(p.positiveCount,byId.get(p.id).positiveCount);
   if(p.pastMemory){assert.equal(p.pastMemory.productId,oldId);assert.ok(p.pastMemory.sold>0);}
   if(p.id==='specialist'){assert.equal(p.pastMemory,null);assert.equal(p.expectationExamples.length,0);}
  }
  for(const variant of Object.keys(VARIANTS))pinsMarkup(projected,variant,'bar');
 }
 assert.equal(M.serialize(snapshot),saved);
});

test('independent: map projection exposes report text and source facts, not individual preference or scoring internals',()=>{
 let s=distribute(M.create({seed:42}));s=M.transact(s,{type:'advance',months:6});
 const projected=mapFor(s),forbidden=new Set(['profile','target','weights','fit','score','rawScore','maturity','attentionCost','ageInterest','support','recognition','expectationWeight']);
 const inspect=value=>{if(!value||typeof value!=='object')return;for(const [key,v] of Object.entries(value)){assert.equal(forbidden.has(key),false,`internal field ${key}`);inspect(v);}};
 inspect(projected);
 for(const p of projected.pins)for(const q of [p.buyerPositive,p.buyerNegative].filter(Boolean)){
  const actual=M.productSummary(s,q.productId).byShop.find(x=>x.shopId===p.id).evaluations;
  assert.ok(actual.some(e=>e.verdict===q.verdict&&(e.reaction?.text??e.text??'')===q.text));
 }
});
