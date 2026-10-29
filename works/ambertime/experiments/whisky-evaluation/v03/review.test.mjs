import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './model.mjs';
import {rebuild} from './memory.mjs';
import {traceScenario} from './scenarios.mjs';
const act=(s,type,rest={})=>M.transact(s,{type,...rest});

test('review: simultaneous native product sales cannot change memory through row processing order',()=>{
 let s=act(M.create({seed:42}),'advance',{months:1});
 s=act(s,'next',{sample:'smoke',years:20,tier:'standard'});s=act(s,'advance',{months:1});
 s=act(s,'next',{sample:'deep',years:20,tier:'standard'});
 for(const productId of [2,3]){s=act(s,'select',{productId});s=act(s,'place',{shopId:'bar',portion:'all'});s=act(s,'confirm');}
 s=act(s,'advance',{months:6});assert.ok(s.sales.lastMonths.some(m=>m.shops.filter(r=>r.shopId==='bar').length===2));
 const reversed=structuredClone(s.sales);for(const m of reversed.lastMonths)m.shops.reverse();
 assert.deepEqual(rebuild(reversed,s.receipts,s.policy),s.relations);
});

test('review: one maximally negative new release cannot erase established positive support at the same clock time',()=>{
 const trace=traceScenario({seed:42,scenario:'A',shopId:'bar'}),sales=structuredClone(trace.state.sales),lastId=sales.selectedId;
 // Synthetic verdict interventions isolate the relationship formula, not a claim about actual buyers.
 for(const month of sales.lastMonths)for(const row of month.shops)for(const e of row.evaluations){e.verdict=row.productId===lastId?'miss':'strong';e.positiveImpression=e.verdict==='strong'?e.impression:0;e.negativeImpression=e.verdict==='miss'?e.impression:0;}
 const before=structuredClone(sales);for(const month of before.lastMonths)month.shops=month.shops.filter(r=>r.productId!==lastId);
 const prior=rebuild(before,trace.state.receipts,'support').bar,after=rebuild(sales,trace.state.receipts,'support').bar;
 assert.ok(prior.support>0);assert.equal(after.positiveEvidence,prior.positiveEvidence);assert.ok(after.negativeEvidence-prior.negativeEvidence<=1);
 assert.ok(after.support>=prior.support*8/9-1e-12);assert.ok(after.support<prior.support);
});

test('review: comparative reaction wording has actual current and historical positive evidence',()=>{
 for(const scenario of ['B','C','D']){
  const trace=traceScenario({seed:31,scenario,shopId:'bar'});
  const archive=M.shopView(trace.state,'bar').archive;
  for(const record of archive)for(const c of record.contexts){
   if(c.reaction.kind!=='new-positive')continue;
   const old=archive.find(r=>r.productId===c.priorProductId);assert.ok(old);assert.ok(c.reaction.facts.priorPositive>0);assert.ok(c.positiveCount>0);
   if(c.reaction.text.includes('若い'))assert.ok(record.years<old.years);
   for(const x of c.expectationComponents)assert.ok(archive.find(r=>r.productId===x.productId).evaluations.some(e=>e.month<c.month&&['strong','like'].includes(e.verdict)));
  }
 }
});
