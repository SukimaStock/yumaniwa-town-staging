import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../economy.mjs';
import * as OLD from '../parallel.mjs';
import * as M from '../model.mjs';
import {simulate,POLICIES} from '../design/v07/simulate.mjs';
function fill(s,type='bourbon',progress=70){s=E.startDistillation(s);for(let n=0;n<progress;n++)s=E.distillStep(s);return E.fillBarrel(E.stopDistillation(s),type);}
function resolve(s){while(s.decisions.length){const d=s.decisions[0],wait=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id!=='bottle');if(wait)s=E.chooseDistillery(s,d.caskId,wait.id);else {s=E.bottleNow(s,d.caskId);s=E.listBottles(s,s.core.products.at(-1).id);}}return s;}
test('v2 is a separate replay contract; v1 and core defaults remain byte-equivalent',()=>{
 const old=OLD.newDistillery(42),text=OLD.serializeDistillery(old);assert.equal(old.core.cash,4000);assert.equal(M.newGame(42).cash,4000);
 const s=E.newDistillery(42);assert.equal(s.version,2);assert.equal(s.core.cash,1600);assert.throws(()=>E.restoreDistillery(text));assert.throws(()=>OLD.restoreDistillery(E.serializeDistillery(s)));assert.equal(OLD.serializeDistillery(OLD.restoreDistillery(text)),text);
});
test('two casks have explicit £4 + £8 each upkeep and preserve month/cash/totals conservation',()=>{
 let s=fill(E.newDistillery(42));s=E.tickDistillery(s);s=fill(s,'refill',80);assert.equal(s.core.casks.length,2);assert.equal(E.upkeep(s),20);
 const before=structuredClone(s);s=E.tickDistillery(s,before.core.month);assert.equal(s.core.month,before.core.month+1);assert.equal(s.core.lastMonth.upkeep,20);assert.equal(s.core.cash,before.core.cash-20);assert.equal(s.core.totals.upkeep-before.core.totals.upkeep,20);assert.deepEqual(s.core.casks.map(c=>c.age),before.core.casks.map(c=>c.age+1));assert.throws(()=>E.tickDistillery(s,before.core.month));assert.deepEqual(E.restoreDistillery(E.serializeDistillery(s)),s);
});
test('actual price receipts are charged once, while demand ratios and unsold isolation stay intact',()=>{
 let s=fill(E.newDistillery(2));for(let i=0;i<8;i++)s=resolve(E.tickDistillery(s));const id=s.core.casks[0].id;s=E.bottleNow(s,id);const product=s.core.products.at(-1),price=product.price;
 const unlisted=E.tickDistillery(s);assert.equal(unlisted.core.lastMonth.revenue,0);assert.equal(unlisted.core.products.at(-1).stock,product.stock);
 s=E.listBottles(s,product.id);const before=structuredClone(s);s=E.tickDistillery(s);const p=s.core.products.at(-1);assert.equal(p.lastRevenue,Math.round(p.lastSold*price*100)/100);assert.equal(s.core.lastMonth.revenue,p.lastRevenue);assert.equal(s.core.cash,Math.round((before.core.cash+p.lastRevenue-4)*100)/100);assert.equal(s.core.totals.revenue-before.core.totals.revenue,p.lastRevenue);assert.equal(s.core.lastMonth.sales[0].revenue,p.lastRevenue);assert.deepEqual(E.restoreDistillery(E.serializeDistillery(s)),s);
});
test('low working cash triggers recoverable bottle decision without spending reserved bottling money',()=>{
 let s=fill(E.newDistillery(20261016),'bourbon',70);s=E.tickDistillery(s);s=fill(s,'bourbon',70);let forced=null;
 for(let i=0;i<100&&!forced;i++){
  while(s.decisions.length){const d=s.decisions[0];if(d.eventId==='funds'){forced=d;break;}const choice=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id!=='bottle');if(!choice){s=E.bottleNow(s,d.caskId);s=E.listBottles(s,s.core.products.at(-1).id);}else s=E.chooseDistillery(s,d.caskId,choice.id);}
  if(!forced)s=E.tickDistillery(s);
 }
 assert.ok(forced);const before=s.core.cash,month=s.core.month,id=forced.caskId,cost=E.quote(s,id).cost;assert.ok(before>=cost);assert.equal(E.tickDistillery(s),s);s=E.bottleNow(s,id);assert.equal(s.core.month,month);assert.equal(s.core.cash,before-cost);s=E.listBottles(s,s.core.products.at(-1).id);
 let income=0;for(let i=0;i<12;i++){s=resolve(s);s=E.tickDistillery(s);income+=s.core.lastMonth?.revenue??0;if(E.canStart(s).ok)break;}
 assert.ok(income>0);assert.ok(E.canStart(s).ok);assert.deepEqual(E.restoreDistillery(E.serializeDistillery(s)),s);
});
test('multi-cycle policies are deterministic and viable, without four-lot instant wealth',()=>{
 for(const policy of POLICIES.slice(0,4)){const a=simulate(42,policy,{months:72}),b=simulate(42,policy,{months:72});assert.deepEqual(a,b);assert.equal(a.month,72);assert.ok(a.bottled>=1);assert.ok(a.minCash>=0);assert.ok(a.cash<10000);assert.ok(a.remainingCasks||a.remainingStock||a.canStart);}
});

test('minimum-capital young batch can recover the next setup at every price tier without free funds',()=>{
 for(const progress of [30,55,99])for(const tier of ['low','standard','high']){
  let s=E.newDistillery(42);while(s.core.cash>392)s=E.tickDistillery(s);assert.equal(s.core.cash,392);assert.equal(E.canStart(s).minimum,391);
  s=fill(s,'refill',progress);const cost=s.core.totals.costs;s=E.bottleNow(s,s.core.casks[0].id);const id=s.core.products.at(-1).id;s=E.setSalePrice(s,tier,id);s=E.listBottles(s,id);
  let steps=0;while(s.core.products.some(p=>p.stock)&&steps++<100)s=E.tickDistillery(s);assert.ok(steps<100);assert.ok(s.core.cash>=E.canStart(s).minimum,`${progress}/${tier}: £${s.core.cash}`);assert.ok(E.canStart(s).ok);assert.equal(s.core.totals.costs,cost+s.records[0].bottlingCost);assert.equal(s.core.cash,Math.round((1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep)*100)/100);assert.deepEqual(E.restoreDistillery(E.serializeDistillery(s)),s);
 }
});

test('conservative last-inventory bounds recover setup capital, including long-age small lots and shared shelves',()=>{
 // Reference lower bounds, not fabricated save fixtures: max age87, min yield24L,
 // maximal warm evaporation leave >=26 bottles. Young lots leave >=34.
 const restart=E.canStart(E.newDistillery(1)).minimum;
 for(const young of [true,false])for(let count=young?34:26;count<=57;count++)for(const multiplier of [0.82,1,1.24])for(const products of [1,8]){
  const price=Math.max(16,Math.round(16*multiplier*100)/100),stocks=Array(products).fill(count);let cash=0,months=0;
  while(stocks.some(Boolean)&&months++<500){const wishes=stocks.map(stock=>Math.min(stock,(young?4*0.86/stocks.filter(Boolean).length:8)*Math.exp(2.8*(1-price/16)))),sum=wishes.reduce((a,b)=>a+b,0),scale=Math.min(1,24/Math.max(1,sum));let sold=0;
   const quotas=wishes.map(w=>w*scale),counts=quotas.map(Math.floor);let remaining=Math.floor(quotas.reduce((a,b)=>a+b,0)+1e-9)-counts.reduce((a,b)=>a+b,0);for(const i of stocks.map((_,i)=>i).sort((a,b)=>(quotas[b]-counts[b])-(quotas[a]-counts[a])||a-b))if(remaining>0&&counts[i]<stocks[i]){counts[i]++;remaining--;}for(let i=0;i<stocks.length;i++){stocks[i]-=counts[i];sold+=counts[i];}cash=Math.round((cash+sold*price-4)*100)/100;
  }
  assert.ok(months<500);assert.ok(cash>=restart,`${young?'young':'aged'}/${count}/${multiplier}/${products}: £${cash}`);
 }
});
test('lower distillation fee is an exact expense adjustment, not additional income',()=>{
 const s=E.startDistillation(E.newDistillery(42));assert.equal(s.core.cash,1480);assert.equal(s.core.totals.costs,120);assert.equal(s.core.totals.revenue,0);assert.equal(s.still.distillation.progress,0);assert.deepEqual(E.restoreDistillery(E.serializeDistillery(s)),s);
});

test('many young products share one demand allowance instead of multiplying local customers',()=>{
 const young=simulate(42,{name:'young',age:0,n:1,progress:30,type:'refill'},{months:120}),aged=simulate(42,POLICIES[3],{months:120});assert.equal(young.month,120);assert.ok(young.cash<aged.cash);assert.ok(young.cash<10000);assert.ok(young.bottled>=2);assert.ok(young.remainingCasks||young.remainingStock||young.canStart);
});

test('three casks allocate every maintenance penny once across their histories',()=>{
 let s=fill(E.newDistillery(42));s=E.tickDistillery(s);s=fill(s);s=E.tickDistillery(s);s=fill(s);s=E.tickDistillery(s);assert.equal(s.core.casks.length,3);assert.equal(s.core.lastMonth.upkeep,28);assert.equal(s.core.totals.upkeep,60);assert.equal(Math.round(Object.values(s.batchesById).reduce((a,b)=>a+b.upkeep,0)*100)/100,60);assert.deepEqual(E.restoreDistillery(E.serializeDistillery(s)),s);
});

test('an empty distillery stops before idle fees consume the next setup, including sold-out shelves',()=>{
 let s=E.newDistillery(42);while(s.core.cash>392)s=E.tickDistillery(s);const before=E.serializeDistillery(s);assert.equal(E.tickDistillery(s),s);assert.equal(s.core.cash,392);assert.ok(E.canStart(s).ok);assert.equal(E.serializeDistillery(s),before);
 s=fill(s,'refill',30);s=E.bottleNow(s,s.core.casks[0].id);s=E.listBottles(s,s.core.products.at(-1).id);while(s.core.products.some(p=>p.stock))s=E.tickDistillery(s);assert.ok(s.core.products.length>0);
 for(let i=0;i<1000;i++){const next=E.tickDistillery(s);if(next===s)break;s=next;}assert.equal(E.tickDistillery(s),s);assert.ok(E.canStart(s).ok);assert.ok(s.core.cash>=391);assert.ok(s.core.cash<395);assert.deepEqual(E.restoreDistillery(E.serializeDistillery(s)),s);
});
