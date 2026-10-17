// Calibration is deliberately a controlled retail boundary, not a legal save.
// Long runs below use public actions exclusively and validate full replay.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as D from '../../partner-orders.mjs';
import * as E from '../../economy.mjs';
import {PARALLEL_PARAMETERS as P,ECONOMY_PARAMETERS as C} from '../../economy-parameters.mjs';
import {REPUTATION,brandStats,brandReputation,retailReputationFactors} from '../../brand-reputation.mjs';
import {fill,release} from '../../tests/brands-helpers.mjs';

const ALL_SEEDS=[1,2,3,4,5,6,7,8,9,10,42,20261017];
const argument=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const seedArgument=argument('--seed'),mergeDirectory=argument('--merge');
if(seedArgument!==null)assert(ALL_SEEDS.includes(Number(seedArgument)),'Unknown calibration seed');
const SEEDS=seedArgument===null?ALL_SEEDS:[Number(seedArgument)];
const outputPath=argument('--output')??fileURLToPath(new URL('./results.json',import.meta.url));
// The default remains the entire original matrix. Separate processes only
// partition independent seeds; economics, policy and replay are unchanged.
if(seedArgument===null&&mergeDirectory===null){
 const directory=fs.mkdtempSync('/tmp/amber-reputation-'),active=new Set();let cursor=0;
 const execute=args=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(import.meta.url),...args],{stdio:['ignore','ignore','inherit']});active.add(child);child.once('error',reject);child.once('exit',code=>{active.delete(child);code===0?resolve():reject(Error('Simulation child failed: '+code));});});
 try{
  await Promise.all(Array.from({length:8},async()=>{while(cursor<ALL_SEEDS.length){const seed=ALL_SEEDS[cursor++];await execute(['--seed',String(seed),'--output',directory+'/seed-'+seed+'.json']);console.error(JSON.stringify({event:'seed-complete',seed}));}}));
  await execute(['--merge',directory,'--output',outputPath]);
 }catch(error){for(const child of active)child.kill('SIGTERM');throw error;}
 process.exit(0);
}
const CAPS=[0,0.12,0.15,0.18],round=n=>Math.round(n*100)/100||0,mean=a=>round(a.reduce((n,x)=>n+x,0)/Math.max(1,a.length));
const demandIntegrated=/economicMonthly\(s,expectedMonth,/.test(fs.readFileSync(new URL('../../partner-orders.mjs',import.meta.url),'utf8'));
const clone=x=>structuredClone(x);
const history=(sold,count)=>({sold,sellingReleases:Math.min(count,sold/30)});
const NEW=history(0,0),SOME=history(80,2),KNOWN=history(1200,24);
const factor=(h,cap)=>1+cap*h.sold/(h.sold+300)*(0.75+0.25*h.sellingReleases/(h.sellingReleases+4));

// Independent demand allocation, checked against the actual baseline every run.
function allocation(s,multipliers){
 const stocked=s.core.products.filter(p=>p.stock>0&&s.productsById[p.id]?.listed);
 const young=stocked.filter(p=>p.age<P.youngDemandMonths).length;
 const wishes=stocked.map(p=>Math.min(p.stock,(p.age<P.youngDemandMonths?P.youngDemand/young:10+6*p.character)*(0.80+0.20*p.character)*Math.exp(C.priceElasticity*(1-p.price/E.marketValue(p)))*(multipliers.get(p.id)??1)));
 const scale=Math.min(1,C.monthlyCustomers/Math.max(1,wishes.reduce((a,b)=>a+b,0)));
 const quotas=wishes.map(w=>w*scale),counts=quotas.map(Math.floor);
 let left=Math.floor(quotas.reduce((a,b)=>a+b,0)+1e-9)-counts.reduce((a,b)=>a+b,0);
 for(const {i} of stocked.map((p,i)=>({i,id:p.id,f:quotas[i]-counts[i]})).sort((a,b)=>b.f-a.f||a.id-b.id))if(left>0&&counts[i]<stocked[i].stock){counts[i]++;left--;}
 return new Map(stocked.map((p,i)=>[p.id,counts[i]]));
}

function controlledMonth(s,multipliers){
 const j=E.economicMonthly(s,s.core.month),baseline=allocation(s,new Map()),counts=allocation(s,multipliers);
 for(const p of j.core.products)assert.equal(p.lastSold,baseline.get(p.id)??0,'Candidate factor=1 must match actual baseline allocation');
 if(demandIntegrated){const actual=E.economicMonthly(s,s.core.month,multipliers);for(const p of actual.core.products)assert.equal(p.lastSold,counts.get(p.id)??0,'Integrated allocation must match calibrated candidate');}
 let revenue=0,bottles=0;const sales=[];
 for(const before of s.core.products){const p=j.core.products.find(p=>p.id===before.id),sold=counts.get(p.id)??0;
  p.stock=before.stock-sold;p.sold=before.sold+sold;p.lastSold=sold;p.lastRevenue=round(sold*p.price);p.revenue=round(before.revenue+p.lastRevenue);
  revenue=round(revenue+p.lastRevenue);bottles+=sold;if(s.productsById[p.id]?.listed&&before.stock>0)sales.push({id:p.id,sold,revenue:p.lastRevenue});
 }
 j.core.cash=round(s.core.cash+revenue-j.core.lastMonth.upkeep);j.core.totals.revenue=round(s.core.totals.revenue+revenue);j.core.totals.bottlesSold=s.core.totals.bottlesSold+bottles;
 j.core.lastMonth={...j.core.lastMonth,revenue,bottles,sales};
 return j;
}

const CASES=[
 {name:'first-release',lots:[{h:NEW}]},
 {name:'some-sales',lots:[{h:SOME}]},
 {name:'many-sold-releases',lots:[{h:KNOWN}]},
 {name:'high-price',lots:[{h:KNOWN,tier:'high'}]},
 {name:'flavor-weak-and-strong',lots:[{h:KNOWN,character:0.25},{h:KNOWN,character:0.9}]},
 {name:'competing-brands',lots:[{h:NEW},{h:SOME},{h:KNOWN}]},
 {name:'extreme-price-160',lots:[{h:KNOWN,price:160}]},
 {name:'young-spirit',lots:[{h:KNOWN,age:0}]},
];

function fixture(seed,lots){
 // The product prototype is created by legal public actions. The controlled
 // boundary then varies stock/flavor/price and omits a fabricated operation log.
 const original=release(D.newBrandedDistillery(seed),{age:6});
 const s=E.newDistillery(seed);s.core.month=120;s.core.cash=100000;s.core.nextId=1000;
 s.core.products=lots.map((lot,i)=>{const p={...clone(original.core.products[0]),id:100+i,sourceId:10+i,batchId:20+i,age:lot.age??12,batchMonth:0,bottledMonth:120,stock:50,originalStock:50,sold:0,revenue:0,lastSold:0,lastRevenue:0};
  if(lot.character!==undefined)p.character=lot.character;
  p.price=lot.price??round(E.marketValue(p)*(lot.tier==='high'?1.24:1));return p;});
 s.productsById=Object.fromEntries(s.core.products.map(p=>[p.id,{listed:true,selectedPrice:'standard'}]));return s;
}

function calibrate(seed,scenario,cap){
 let s=fixture(seed,scenario.lots);const initial=s.core.month,initialCash=s.core.cash;
 const multipliers=new Map(s.core.products.map((p,i)=>[p.id,factor(scenario.lots[i].h,cap)]));
 const clearance={},snapshots=[];let firstMonth=null;
 for(let month=1;month<=120;month++){
  s=controlledMonth(s,multipliers);assert(s.core.lastMonth.bottles<=C.monthlyCustomers);
  if(month===1)firstMonth=s.core.lastMonth.sales.map(x=>({productId:x.id,sold:x.sold,revenue:x.revenue}));
  for(const p of s.core.products)if(p.stock===0&&!clearance[p.id])clearance[p.id]=month;
  if([1,3,6,12,24,60,120].includes(month))snapshots.push({month,sold:s.core.totals.bottlesSold,revenue:s.core.totals.revenue,stock:s.core.products.map(p=>p.stock)});
  assert.equal(round(s.core.cash-initialCash-s.core.totals.revenue+s.core.totals.upkeep),0);
 }
 return {seed,case:scenario.name,cap,multipliers:[...multipliers.values()],firstMonth,clearanceMonths:s.core.products.map(p=>clearance[p.id]??null),sold:s.core.totals.bottlesSold,revenue:s.core.totals.revenue,remainingStock:s.core.products.map(p=>p.stock),snapshots,months:s.core.month-initial};
}

function longRun(seed,policy,reputation,months=240){
 let s=reputation?D.enableReputation(D.newBrandedDistillery(seed)):D.newBrandedDistillery(seed),guard=0;
 const completed=new Map(),listedAt=new Map(),monthly=[];let minCash=s.core.cash,maxBonus=0;
 const remember=()=>{for(const r of s.releases)if(r.status==='sold-out'&&!completed.has(r.id))completed.set(r.id,s.core.month-(listedAt.get(r.id)??r.bottledMonth));};
 const bottle=id=>{const index=s.releases.length,existing=s.brands.length&&(policy!=='alternating-brands'||index%2===0);
  s=D.bottleBranded(D.endTasting(s),id,existing?{brandId:s.brands[0].id}:{name:'銘柄'+(s.brands.length+1)});
  const pid=s.result.productId;s=D.setSalePrice(s,policy==='high-price'?'high':'standard',pid);s=D.listBottles(s,pid);listedAt.set(s.releases.at(-1).id,s.core.month);
 };
 while(s.core.month<months&&guard++<months*30){
  remember();
  if(s.trade.offer){s=D.declineOffer(s);continue;}
  if(s.decisions.length){const d=s.decisions[0],c=D.currentCask(s,d.caskId),wait=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');
   if(c.age>=6||!wait)bottle(c.id);else s=D.chooseDistillery(s,c.id,wait.id);continue;
  }
  const due=s.core.casks.find(c=>c.age>=6);if(due){bottle(due.id);continue;}
  if(D.canStart(s).ok&&s.core.casks.length<2){s=fill(s,{progress:[40,65,90][s.releases.length%3],type:s.releases.length%2?'bourbon':'refill'});continue;}
  const before=s.core.month;s=D.tickDistillery(s);if(before===s.core.month&&!s.decisions.length)throw Error('Public-action month stalled');
  minCash=Math.min(minCash,s.core.cash);remember();
  for(const b of s.brands)maxBonus=Math.max(maxBonus,brandReputation(s,b.id).bonus);
  assert.equal(round(s.core.cash-1600-s.core.totals.revenue+s.core.totals.costs+s.core.totals.upkeep),0);
  if(s.core.month%12===0)monthly.push({month:s.core.month,sold:s.core.totals.bottlesSold,revenue:s.core.totals.revenue,stock:s.core.products.reduce((n,p)=>n+p.stock,0),cash:s.core.cash,releases:s.releases.length});
  if(s.core.month%24===0)console.error(JSON.stringify({event:'month',seed,policy,reputation,month:s.core.month}));
 }
 assert.equal(s.core.month,months);console.error(JSON.stringify({event:'replay-start',seed,policy,reputation}));const raw=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);
 const totals=s.brands.map(b=>brandStats(s,b.id));
 assert.equal(totals.reduce((n,b)=>n+b.sold,0),s.core.totals.bottlesSold);assert.equal(round(totals.reduce((n,b)=>n+b.revenue,0)),s.core.totals.revenue);
 return {seed,policy,reputation,months:s.core.month,releases:s.releases.length,sold:s.core.totals.bottlesSold,revenue:s.core.totals.revenue,stock:s.core.products.reduce((n,p)=>n+p.stock,0),cash:s.core.cash,minCash,completed:completed.size,meanClearanceMonths:mean([...completed.values()]),maxReputationBonus:round(maxBonus*100)/100,strictReplay:true,cashErrorCents:0,monthly};
}

const integrated=typeof D.enableReputation==='function'&&demandIntegrated;
const calibration=[],longRuns=[],parts=[];
if(mergeDirectory){
 for(const seed of ALL_SEEDS){const part=JSON.parse(fs.readFileSync(mergeDirectory+'/seed-'+seed+'.json','utf8'));assert.deepEqual(part.method.seeds,[seed]);assert.equal(part.calibration.length,32);assert.equal(part.longRuns.length,6);parts.push(part);calibration.push(...part.calibration);longRuns.push(...part.longRuns);}
}else{
 for(const seed of SEEDS)for(const scenario of CASES)for(const cap of CAPS)calibration.push(calibrate(seed,scenario,cap));
 console.error(JSON.stringify({event:'calibration-complete',seeds:SEEDS,runs:calibration.length}));
 if(integrated)for(const seed of SEEDS)for(const policy of ['same-brand','high-price','alternating-brands'])for(const reputation of [false,true]){
  console.error(JSON.stringify({event:'run-start',seed,policy,reputation}));longRuns.push(longRun(seed,policy,reputation));console.error(JSON.stringify({event:'run-complete',seed,policy,reputation}));
 }
}
const summaries=CASES.flatMap(scenario=>CAPS.map(cap=>{const rows=calibration.filter(r=>r.case===scenario.name&&r.cap===cap);return {case:scenario.name,cap,meanFirstMonthBottles:mean(rows.map(r=>r.firstMonth.reduce((n,p)=>n+p.sold,0))),meanFirstMonthByLot:scenario.lots.map((_,i)=>mean(rows.map(r=>r.firstMonth[i].sold))),meanFirstMonthRevenue:mean(rows.map(r=>r.firstMonth.reduce((n,p)=>n+p.revenue,0))),meanThreeMonthBottles:mean(rows.map(r=>r.snapshots.find(x=>x.month===3).sold)),meanThreeMonthRevenue:mean(rows.map(r=>r.snapshots.find(x=>x.month===3).revenue)),meanClearanceMonths:mean(rows.flatMap(r=>r.clearanceMonths.filter(x=>x!==null))),uncompletedLots:rows.flatMap(r=>r.clearanceMonths).filter(x=>x===null).length,meanFinalRevenue:mean(rows.map(r=>r.revenue)),meanFinalStock:mean(rows.map(r=>r.remainingStock.reduce((a,b)=>a+b,0)))};}));
const longSummary=['same-brand','high-price','alternating-brands'].flatMap(policy=>[false,true].map(reputation=>{const rows=longRuns.filter(r=>r.policy===policy&&r.reputation===reputation);return rows.length?{policy,reputation,runs:rows.length,meanReleases:mean(rows.map(r=>r.releases)),meanSold:mean(rows.map(r=>r.sold)),meanRevenue:mean(rows.map(r=>r.revenue)),meanStock:mean(rows.map(r=>r.stock)),meanClearanceMonths:mean(rows.map(r=>r.meanClearanceMonths)),meanCash:mean(rows.map(r=>r.cash)),allReplayExact:rows.every(r=>r.strictReplay)}:null;})).filter(Boolean);
const sources=Object.fromEntries(['partner-orders.mjs','economy.mjs','brand-reputation.mjs','design/reputation/simulate.mjs'].map(p=>[p,createHash('sha256').update(fs.readFileSync(new URL('../../'+p,import.meta.url))).digest('hex')]));
for(const part of parts)assert.deepEqual(part.method.sourceSha256,sources,'All partitions must use the current identical sources');
assert.equal(new Set(calibration.map(r=>[r.seed,r.case,r.cap].join(':'))).size,calibration.length);
assert.equal(new Set(longRuns.map(r=>[r.seed,r.policy,r.reputation].join(':'))).size,longRuns.length);
assert.equal(calibration.length,SEEDS.length*32);if(integrated)assert.equal(longRuns.length,SEEDS.length*6);
for(const r of longRuns){assert.equal(r.months,240);assert.equal(r.strictReplay,true);assert.equal(r.cashErrorCents,0);}
const output={method:{seeds:SEEDS,caps:CAPS,calibration:'Controlled synthetic retail boundaries, not legal saves. Product prototype from public actions. Every monthly baseline allocation is cross-checked against actual E.economicMonthly; candidate formula applies before stock cap and shared 24-customer allocation.',calibrationMonths:120,longRun:'Public-action only, age6 two-cask policies, 240 months; paired unchanged v8 and v9; strict full operation restore; identical seed and policy, sale-dependent affordability may alter later scheduling.',longRunIntegrated:integrated,selected:REPUTATION,scope:'Staging AmberTime only; no wholesale price or special-order changes',sourceSha256:sources},calibrationSummary:summaries,calibration,longSummary,longRuns};
fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({calibrationRuns:calibration.length,calibrationSummary:summaries,longRunIntegrated:integrated,longRuns:longRuns.length,longSummary},null,2));
