import {test} from 'node:test';import assert from 'node:assert/strict';
import {comparison,simulate,POLICIES} from '../simulate.mjs';
import {PARAMETERS as P} from '../parameters.mjs';
test('three policies across eight seeds and three scenarios survive 10 years with accounting consistency',()=>{
 const results=comparison();assert.equal(results.runs.length,72);
 for(const r of results.runs){assert(r.minCash>0);assert(r.batches>0);assert(r.bottlesSold>0);assert(r.revenue>r.productionCosts+r.upkeep);assert(r.remainingLitres>0);assert(r.evaporatedLitres>0);assert.equal(Math.round(r.cash*100),Math.round((P.startingCash+r.revenue-r.productionCosts-r.upkeep)*100));}
 const mean=(scenario,key)=>{const rs=results.runs.filter(r=>r.scenario===scenario&&r.key===key);return rs.reduce((s,r)=>s+r.cash,0)/rs.length;};
 assert(mean('広い抽出・バーボン樽','A')>mean('広い抽出・バーボン樽','B'));assert(mean('狭い抽出・リフィル樽','B')>mean('狭い抽出・リフィル樽','A'));
});
test('same seed and policy replay exactly; early cash differs from long waiting',()=>{
 const a=simulate(POLICIES.A,42),b=simulate(POLICIES.B,42);assert.deepEqual(a,simulate(POLICIES.A,42));assert.equal(a.cashByYear[0].cash,b.cashByYear[0].cash);assert(a.cashByYear[1].cash>b.cashByYear[1].cash);assert(b.harvest[0].age>a.harvest[0].age);assert(a.harvest[0].remainingLitres>b.harvest[0].remainingLitres);
});

test('cross cut/type audit demonstrates early-vs-long extraction tradeoff at fixed seed',()=>{
 for(const type of ['bourbon','refill']){const narrowA=simulate(POLICIES.A,42,120,{cut:.35,type}),wideA=simulate(POLICIES.A,42,120,{cut:1,type}),narrowB=simulate(POLICIES.B,42,120,{cut:.35,type}),wideB=simulate(POLICIES.B,42,120,{cut:1,type});if(type==='refill')assert(narrowA.cash>wideA.cash);assert(wideB.cash>narrowB.cash);}
});
