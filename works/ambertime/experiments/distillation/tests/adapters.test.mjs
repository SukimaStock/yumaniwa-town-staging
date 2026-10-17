import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../../../model.mjs';
import * as E from '../../../economy.mjs';
import * as D from '../../../partner-orders.mjs';
import {ECONOMY_PARAMETERS as C,PARALLEL_PARAMETERS as P} from '../../../economy-parameters.mjs';
import {profileAt,MODELS,createConditions} from '../models.mjs';
import {ageExperiment,bottleExperiment,retailExperiment,productionCosts,specialEligible,SIDECAR_HYPOTHESIS} from '../adapters.mjs';
const close=(a,b,e=1e-12)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);
function resolve(s){while(s.decisions.length){const d=s.decisions[0],key=d.pending.options.find(o=>o.id==='wait')?.id??d.pending.options.find(o=>o.id==='last')?.id;assert(key);s=E.chooseDistillery(s,d.caskId,key);}return s;}
function manual(seed,stop,type){let s=E.startDistillation(E.newDistillery(seed));for(let i=0;i<stop;i++)s=E.distillStep(s);return E.fillBarrel(E.stopDistillation(s),type);}
function independentlyAge(raw,type,months){let c={id:2,batchId:1,batchMonth:0,filledMonth:0,type,age:0,cut:raw.cut,initialLitres:raw.litres,litres:raw.litres,roughness:raw.roughness,character:raw.character,wood:0,variation:structuredClone(createConditions(raw.seed,raw.batch).caskVariation),history:[]};for(let i=0;i<months;i++)c=M.ageCask(c);return c;}

test('control adapter matches actual player cask chemistry at 0, 12, 24 and 36 months in both casks',()=>{
 for(const seed of [1,42,891])for(const p of [30,65,99])for(const type of ['bourbon','refill']){
  let s=manual(seed,p,type),months=0;
  for(const age of [0,12,24,36]){
   for(;months<age;months++)s=resolve(E.economicMonthly(resolve(s),s.core.month));
   const projected=ageExperiment(profileAt('current',p,seed),type,age),actual=s.core.casks[0];
   for(const k of ['cut','age','roughness','character','wood','litres','initialLitres'])assert.equal(projected[k],actual[k]);
   assert.deepEqual(projected.variation,actual.variation);assert.equal(projected.tasting,M.tasting(actual));
  }
 }
});

test('candidate aging reuses the unmodified ageCask transform; B composition is explicitly a separate hypothesis',()=>{
 for(const id of ['a','b'])for(const p of [30,65,99])for(const type of ['bourbon','refill'])for(const months of [0,12,24,36]){
  const raw=profileAt(id,p,42),before=JSON.stringify(raw),aged=ageExperiment(raw,type,months),expected=independentlyAge(raw,type,months);
  for(const k of ['roughness','character','wood','litres','age'])assert.equal(aged[k],expected[k]);
  assert.equal(JSON.stringify(raw),before);assert.equal(aged.axes.length,3);
  assert.equal(aged.axes.find(a=>a.id==='wood').maximum,1.35);for(const axis of aged.axes)close(axis.ratio,aged[axis.id]/axis.maximum);
  if(id==='b'){assert.deepEqual(aged.composition,raw.composition);assert.notEqual(aged.composition,raw.composition);assert.equal(aged.sidecarHypothesis,SIDECAR_HYPOTHESIS);assert.match(aged.phrase,/軽い|果実|穀物/);}
  else {assert.equal(aged.composition,null);assert.equal(aged.sidecarHypothesis,null);}
 }
});

test('bottling preserves experimental sidecar without adding it to ordinary core products or archives',()=>{
 const raw=profileAt('b',99,42),aged=ageExperiment(raw,'refill',24),before=JSON.stringify(aged),b=bottleExperiment(aged);
 assert.equal(JSON.stringify(aged),before);assert.deepEqual(b.composition,raw.composition);assert.equal(b.product.originalStock,Math.floor((aged.litres+1e-9)/.7));
 assert.equal(b.marketValue,E.marketValue(b.product));assert.deepEqual(b.prices,E.salePrices({...E.newDistillery(42),core:b.core},3));
 for(const object of [...b.core.products,...b.core.casks,...b.core.archive])for(const key of ['composition','contract','modelId','sidecarHypothesis','raw'])assert.equal(Object.hasOwn(object,key),false);
 b.composition.fruit=99;assert.notEqual(aged.composition.fruit,99);
 assert.throws(()=>D.restoreDistillery(JSON.stringify(b.core)));
});

test('control retail results equal actual current economy month transactions including idle maintenance',()=>{
 for(const p of [30,65,99])for(const type of ['bourbon','refill'])for(const tier of ['low','standard','high']){
  let s=manual(42,p,type);for(let i=0;i<24;i++)s=resolve(E.economicMonthly(resolve(s),s.core.month));
  s=E.bottleNow(s,2,{automatic:true});s=E.setSalePrice(s,tier,3);s=E.listBottles(s,3);
  const actual=[];let out=null;for(let i=1;i<=24;i++){s=E.economicMonthly(s,s.core.month);actual.push({month:i,sold:s.core.lastMonth.bottles,revenue:s.core.lastMonth.revenue,stock:s.core.products.reduce((n,q)=>n+q.stock,0),upkeep:s.core.lastMonth.upkeep});if(out===null&&!s.core.products.some(q=>q.stock))out=i;}
  const experiment=retailExperiment([ageExperiment(profileAt('current',p,42),type,24)],{tier});
  assert.deepEqual(experiment.trajectory,actual);assert.deepEqual(experiment.products,s.core.products);assert.equal(experiment.revenue,s.core.totals.revenue);assert.equal(experiment.sold,s.core.totals.bottlesSold);assert.equal(experiment.soldOutMonth,out);assert.equal(experiment.sellingMaintenance,4*24);assert(actual.at(-1).upkeep===4);
 }
});

test('parallel experimental releases share current customer and young-spirit limits with no duplicate sales',()=>{
 for(const age of [0,24]){
  const profiles=[30,65,99].flatMap(p=>MODELS.map(m=>ageExperiment(profileAt(m.id,p,42),'bourbon',age))).slice(0,8),run=retailExperiment(profiles,{months:24});
  assert.equal(new Set(run.products.map(p=>p.id)).size,8);
  for(const t of run.trajectory)assert(t.sold<=(age===0?4:24));
  assert.equal(run.sold,run.products.reduce((n,p)=>n+p.sold,0));assert.equal(run.stock,run.products.reduce((n,p)=>n+p.stock,0));
  close(run.revenue,run.products.reduce((n,p)=>n+p.revenue,0),1e-8);assert.equal(run.sold+run.stock,run.products.reduce((n,p)=>n+p.originalStock,0));
  for(const p of run.products)assert.equal(p.originalStock,p.sold+p.stock);
 }
});

test('high fixed prices keep current demand penalty and composition alone never grants a retail bonus',()=>{
 const raw=profileAt('b',99,42),aged=ageExperiment(raw,'bourbon',24),changed=structuredClone(aged);changed.composition={light:1,fruit:0,grain:0};
 const normal=retailExperiment([aged]),newComposition=retailExperiment([changed]),expensive=retailExperiment([aged],{fixedPrice:50});
 assert.deepEqual(newComposition.products,normal.products);assert.deepEqual(newComposition.trajectory,normal.trajectory);assert(expensive.sold<normal.sold);assert(expensive.stock>normal.stock);
 const firstMonth=retailExperiment([aged],{months:1}),withExistingFactor=retailExperiment([aged],{months:1,retailFactors:new Map([[3,1.05]])});assert(withExistingFactor.sold>=firstMonth.sold);assert(withExistingFactor.sold<=24);
});

test('production cost uses current fees, real elapsed extraction months and all aging and bottling costs',()=>{
 for(const id of MODELS.map(m=>m.id))for(const p of [30,59,60,65,99])for(const type of ['bourbon','refill'])for(const months of [0,12,24,36]){
  const aged=ageExperiment(profileAt(id,p,42),type,months),q=productionCosts(aged),bottles=Math.floor((aged.litres+1e-9)/C.bottleLitres);
  assert.equal(q.bottles,bottles);assert.equal(q.distillation,120);assert.equal(q.cask,type==='bourbon'?160:100);assert.equal(q.bottling,3*bottles);assert.equal(q.distillationMaintenance,p<60?0:4);assert.equal(q.agingMaintenance,12*months);assert.equal(q.total,120+q.cask+3*bottles+(p<60?0:4)+12*months);
 }
});

test('special-order predicate checks actual 24-month target and its strict aroma boundary',()=>{
 const eligible={age:24,roughness:.30,character:.8000001,wood:.66};assert.equal(specialEligible(eligible),true);
 for(const change of [{age:12},{age:36},{character:.8},{character:.79999},{roughness:.3000001},{wood:.6600001}])assert.equal(specialEligible({...eligible,...change}),false);
 for(const m of MODELS)for(const p of [30,65,99])for(const type of ['bourbon','refill']){
  const c=ageExperiment(profileAt(m.id,p,42),type,24);assert.equal(specialEligible(c),c.roughness<=.3&&c.character>.8&&c.wood<=.66);
  for(const age of [12,36])assert.equal(specialEligible(ageExperiment(profileAt(m.id,p,42),type,age)),false);
 }
});

test('aging and comparison adapters reject preminimum predictions and invalid horizons',()=>{
 assert.throws(()=>ageExperiment(profileAt('b',29)));for(const months of [-1,121,1.5])assert.throws(()=>ageExperiment(profileAt('b',60),'bourbon',months));assert.throws(()=>ageExperiment(profileAt('b',60),'missing'));
 assert.throws(()=>bottleExperiment(ageExperiment(profileAt('b',60)),{tier:'missing'}));assert.throws(()=>bottleExperiment(ageExperiment(profileAt('b',60)),{id:2}));
 assert.throws(()=>retailExperiment([]));for(const months of [0,121,1.5])assert.throws(()=>retailExperiment([ageExperiment(profileAt('b',60))],{months}));assert.throws(()=>retailExperiment(Array.from({length:9},()=>ageExperiment(profileAt('b',60)))));
});
