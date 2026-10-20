// Bounded financial checks for the v0.21 loop; no balance coefficients are changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {fill,advance,resolve} from './brands-helpers.mjs';
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
function balance(s){close(s.core.cash,1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep);assert(s.core.cash>=0);assert.equal(s.brands.length,1);assert.equal(s.brands[0].name,'AmberTime');assert.equal(s.trade.offer,null);assert.equal(s.trade.contracts.length,0);}
function exact(s){const text=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(text)),text);balance(s);return s;}
function sell(s,id){return D.listBottles(D.setSalePrice(s,'low',id),id);}

test('three new-game production and partial-release sale cycles fund the next batch without wholesale',()=>{
 let s=D.newDelegatedDistillery(42);const cash=[];
 for(let round=0;round<3;round++){
  assert(D.canStart(s).ok);s=fill(s,{progress:65,type:'refill'});s=advance(s,6);const id=s.core.casks.at(-1).id,q=D.quote(s,id),before=s.core.cash;
  s=D.bottleBranded(s,id,{},10);const first=s.result.productId;assert.equal(s.core.cash,before-30);assert.equal(s.core.casks.at(-1).id,id);s=sell(s,first);
  s=D.bottleBranded(s,id,{},q.count-10);const second=s.result.productId;assert.notEqual(first,second);assert.equal(s.core.cash,before-q.cost);s=sell(s,second);s=advance(s,6);
  assert.equal(s.core.casks.length,0);assert.equal(s.core.products.find(p=>p.id===first).stock,0);assert.equal(s.core.products.find(p=>p.id===second).stock,0);assert.equal(s.releases.length,(round+1)*2);cash.push(s.core.cash);exact(s);
 }
 assert.deepEqual(cash,[1869,2138,2407]);assert.equal(s.core.totals.costs,1065);assert.equal(s.core.totals.revenue,2160);assert.equal(s.core.totals.upkeep,288);assert.equal(s.core.totals.bottlesSold,135);assert(D.canStart(s).ok);
});

test('manual and age-reserved ten-bottle fees match, and neither changes monthly maintenance',()=>{
 let s=fill(D.newDelegatedDistillery(42),{progress:65});s=advance(s,5);const id=s.core.casks[0].id;
 const baseline=D.tickDistillery(s),manual=D.bottleBranded(baseline,id,{},10),automatic=D.tickDistillery(D.reserveBottling(s,id,{mode:'age',age:6,count:10}));
 for(const key of ['cash','totals','casks','products'])assert.deepEqual(automatic.core[key],manual.core[key]);assert.equal(automatic.core.cash,baseline.core.cash-30);assert.equal(automatic.core.totals.costs,baseline.core.totals.costs+30);assert.equal(automatic.core.lastMonth.upkeep,12);assert.equal(automatic.result.bottlingCost,30);assert.equal(automatic.releases.length,1);exact(automatic);exact(manual);
});

test('delegated distillation charges one hire cost and one salary per started batch',()=>{
 let s=advance(fill(D.newDelegatedDistillery(42),{progress:65}),1);const id=s.core.casks[0].id,beforeHire=s.core.cash,cost=s.core.totals.costs;
 s=D.hireStaff(s);assert.equal(s.core.cash,beforeHire-40);assert.equal(s.core.totals.costs,cost+40);const before=s.core.cash,upkeep=s.core.totals.upkeep,revenue=s.core.totals.revenue;
 s=D.reserveStaff(s,id,'once');assert.equal(s.core.cash,before);s=D.beginUsual(s);assert.equal(s.core.cash,before-120-12);
 for(let steps=0;s.usual.reservation?.status==='active';steps++){assert(steps<100);s=D.distillStep(s);}
 assert.equal(s.core.cash,before-120-12-100);assert.equal(s.core.totals.upkeep,upkeep);assert.equal(s.core.totals.revenue,revenue);assert.equal(s.core.casks.length,2);exact(s);
});

test('normal reserve protection stops aging before bottle money is exhausted; one bottle sale reopens progress',()=>{
 let s=fill(D.newDelegatedDistillery(42),{progress:65});const id=s.core.casks[0].id;
 // This deliberately distant reservation probes the existing cash floor, not a new loan/rescue mechanic.
 s=D.reserveBottling(s,id,{mode:'age',age:240,count:1});let reached=false;
 for(let months=0;months<130;months++){
  const before=s.core.month,next=D.tickDistillery(s);balance(next);
  if(next.decisions.some(d=>d.eventId==='funds')){s=next;reached=true;break;}
  assert.equal(next.core.month,before+1);s=next;
 }
 assert(reached,'reserve floor reached within the bounded scenario');assert(s.core.cash>=D.quote(s,id).cost);assert(s.core.cash>=3);
 const stoppedMonth=s.core.month,stoppedCash=s.core.cash,raw=D.serializeDistillery(s);assert.deepEqual(D.tickDistillery(s),s);
 s=D.bottleBranded(s,id,{},1);s=sell(s,s.result.productId);assert.equal(s.core.cash,stoppedCash-3);s=D.tickDistillery(s);assert.equal(s.core.month,stoppedMonth+1);assert(s.core.cash>stoppedCash);assert.equal(s.core.products.at(-1).stock,0);assert(s.core.casks.some(c=>c.id===id));assert.equal(D.restoreDistillery(raw).core.cash,stoppedCash);exact(s);
});

test('targeted generation boundary retains the one brand and supports another saved production-sale cycle',()=>{
 let s=D.newDelegatedDistillery(42);
 // Ordinary short releases fund the fixture; thereafter only the empty monthly state is advanced.
 for(let round=0;round<3;round++){s=advance(fill(s,{progress:65}),6);s=D.bottleBranded(s,s.core.casks.at(-1).id,{});s=sell(s,s.result.productId);s=advance(s,6);}
 while(s.core.month<360){const month=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,month+1);balance(s);}
 assert.equal(D.generationStatus(s).phase,'last-batch');const brand=structuredClone(s.brands[0]);s=fill(s,{progress:65});assert.equal(D.generationStatus(s).phase,'review');s=D.handoverGeneration(s,1);assert.equal(D.generationStatus(s).id,2);assert.deepEqual(s.brands,[brand]);
 const id=s.core.casks.at(-1).id;s=D.reserveBottling(s,id,{mode:'age',age:6,count:10});s=exact(s);s=advance(s,6);assert.equal(s.releases.at(-1).bottles,10);assert.equal(s.releases.at(-1).brandId,brand.id);assert(s.productsById[s.result.productId].listed);s=D.setSalePrice(s,'low',s.result.productId);s=D.bottleBranded(s,id,{});s=sell(s,s.result.productId);s=advance(s,6);assert.equal(s.core.products.at(-1).stock,0);assert(D.canStart(s).ok);exact(s);
});
