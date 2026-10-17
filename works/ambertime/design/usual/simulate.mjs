// Bounded public-action simulation. No fabricated cash, products or fast-forward
// extraction: each distillStep consumes the same 100 ms clock callback as the UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as D from '../../partner-orders.mjs';
import {PARALLEL_PARAMETERS as P,ECONOMY_PARAMETERS as C} from '../../economy-parameters.mjs';

const allSeeds=[1,2,3,4,42,12345,20261017,4294967295];
const argument=name=>{const index=process.argv.indexOf(name);return index<0?null:process.argv[index+1];};
const selectedSeed=argument('--seed');if(selectedSeed!==null)assert(allSeeds.includes(Number(selectedSeed)),'Unknown simulation seed');
const seeds=selectedSeed===null?allSeeds:[Number(selectedSeed)];
const months=120,ticksPerMonth=P.monthMs/P.distillStepMs,round=n=>Math.round(n*100)/100;
const output=argument('--output')??fileURLToPath(new URL('./simulation-results.json',import.meta.url));
const digest=s=>createHash('sha256').update(s).digest('hex');
const projection=s=>{const {operations,usual,...runtime}=s;return runtime;};
const exact=s=>{const raw=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);return digest(raw);};
const stock=s=>s.core.products.reduce((n,p)=>n+p.stock,0);

function policy(s){
 let guard=0;
 while(true){
  assert(++guard<40,'Policy must resolve finite player decisions');
  if(s.trade.offer){s=D.declineOffer(s);continue;}
  if(s.decisions.length){
   const d=s.decisions[0],c=D.currentCask(s,d.caskId);
   if(c.age>=6){s=retail(s,c.id);continue;}
   const option=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');
   assert(option,'Policy requires an explicit affordable recovery');s=D.chooseDistillery(s,d.caskId,option.id);continue;
  }
  const due=s.core.casks.find(c=>c.age>=6);if(due){s=retail(s,due.id);continue;}
  return s;
 }
}
function retail(s,id){
 s=D.bottleBranded(D.endTasting(s),id,s.brands.length?{brandId:s.brands[0].id}:{name:'いつもの一樽'});
 const product=s.result.productId;s=D.setSalePrice(s,'standard',product);return D.listBottles(s,product);
}
function run(seed,recipe){
 let manual=D.newUsualDistillery(seed),usual=D.newUsualDistillery(seed);
 const stats=()=>({starts:0,fills:0,extractionTicks:0,manualFills:0,automaticFills:0,reservations:0,distillationCost:0,caskCost:0,bottlingCost:0});
 const a=stats(),b=stats(),monthly=[],replay=[];let crossMonthExtractions=0,concurrentAgingTicks=0,concurrentSalesTicks=0,partialReplay=false,minCash=1600;
 function step(s,automatic,counts){
  const costBefore=s.core.totals.costs;s=policy(s);counts.bottlingCost=round(counts.bottlingCost+s.core.totals.costs-costBefore);
  if(s.still.phase==='ready'&&s.core.casks.length<2){
   if(automatic&&s.usual.recipe){
    if(!s.usual.reservation){s=D.reserveUsual(s);counts.reservations++;}
    if(D.canBeginUsual(s).ok){s=D.beginUsual(s);counts.starts++;counts.distillationCost+=C.distillationCost;}
   }else{
    const can=D.canStart(s),premium=C.casks[recipe.type].cost-Math.min(...Object.values(C.casks).map(c=>c.cost));
    if(can.ok&&s.core.cash>=can.minimum+premium){s=D.startDistillation(s);counts.starts++;counts.distillationCost+=C.distillationCost;}
   }
  }
  if(s.still.phase==='distilling'){
   counts.extractionTicks++;const active=s.usual.reservation?.status==='active';s=D.distillStep(s);
   if(!active&&s.still.distillation.progress===recipe.stopAt)s=D.fillBarrel(D.stopDistillation(s),recipe.type);
   if(s.still.phase==='ready'){
    counts.fills++;counts.caskCost+=C.casks[recipe.type].cost;
    if(active){counts.automaticFills++;assert.equal(s.usual.reservation,null,'One-shot must clear on completion');}
    else counts.manualFills++;
   }
  }
  assert(s.core.casks.length<=4);assert.equal(round(s.core.cash-1600-s.core.totals.revenue+s.core.totals.costs+s.core.totals.upkeep),0);
  assert.equal(round(counts.distillationCost+counts.caskCost+counts.bottlingCost),s.core.totals.costs);
  return s;
 }
 for(let tick=1;tick<=months*ticksPerMonth;tick++){
  manual=step(manual,false,a);usual=step(usual,true,b);
  if(usual.still.phase==='distilling'&&usual.core.casks.length)concurrentAgingTicks++;
  if(usual.still.phase==='distilling'&&stock(usual))concurrentSalesTicks++;
  if(!partialReplay&&usual.usual.reservation?.status==='active'&&usual.still.distillation.progress===31){exact(usual);partialReplay=true;}
  if(tick%ticksPerMonth===0){
   if(usual.usual.reservation?.status==='active')crossMonthExtractions++;
   const before=manual.core.month;manual=D.tickDistillery(manual);usual=D.tickDistillery(usual);
   assert.equal(manual.core.month,before+1,'Long policy must not idle-stall');assert.equal(usual.core.month,manual.core.month);
   assert.deepEqual(projection(usual),projection(manual),'Automatic production must equal matched manual production');
   minCash=Math.min(minCash,manual.core.cash);
   if(manual.core.month%12===0)monthly.push({month:manual.core.month,produced:a.fills,sold:manual.core.totals.bottlesSold,revenue:manual.core.totals.revenue,stock:stock(manual),casks:manual.core.casks.length,cash:manual.core.cash,costs:manual.core.totals.costs,upkeep:manual.core.totals.upkeep});
   if(manual.core.month===60)replay.push({month:60,manual:exact(manual),usual:exact(usual)});
   if(manual.core.month%24===0)console.error(JSON.stringify({event:'month',seed,month:manual.core.month,produced:a.fills}));
  }
 }
 replay.push({month:months,manual:exact(manual),usual:exact(usual)});
 assert(partialReplay);assert(b.automaticFills>0);assert(crossMonthExtractions>0);assert(concurrentAgingTicks>0);assert(concurrentSalesTicks>0);
 assert.equal(a.fills,b.fills);assert.equal(a.extractionTicks,b.extractionTicks);assert.equal(b.reservations,b.automaticFills+(usual.usual.reservation?1:0));
 return {seed,recipe,months,clockTicks:months*ticksPerMonth,gameMilliseconds:months*P.monthMs,manual:a,usual:b,totals:manual.core.totals,stock:stock(manual),casks:manual.core.casks.length,cash:manual.core.cash,minCash,crossMonthExtractions,concurrentAgingTicks,concurrentSalesTicks,partialReplay,identicalRuntimeAtEveryMonth:true,cashErrorCents:0,replay,monthly};
}

const sourceSha256=()=>Object.fromEntries(['partner-orders.mjs','economy.mjs','model.mjs','design/usual/simulate.mjs'].map(p=>[p,digest(fs.readFileSync(new URL('../../'+p,import.meta.url)))]));
const sources=sourceSha256();
const result={method:{seeds,months,tickMilliseconds:P.distillStepMs,monthMilliseconds:P.monthMs,recipes:[{stopAt:65,type:'refill'},{stopAt:99,type:'bourbon'}],policy:'Public actions only. First cask is manually distilled in both arms. Thereafter one arm manually starts/stops/fills; the other explicitly reserves exactly one next cask per production request. Both hold at most two aging casks and bottle at age six to the same brand at standard price. Decisions and offers pause simulation until handled. Each extraction step uses one clock callback; no instant distillation or modified cash. Extra bourbon cost is protected equally in both arms. Non-log runtime state is compared every month.',limits:'Matched policy, not a claim that automation increases demand or production. One recipe per seed, alternating 65/refill and 99/bourbon. Pauses and UI scheduling are covered by separate tests.',sourceSha256:sources},runs:[],summary:null};
for(const seed of seeds){
 const row=run(seed,allSeeds.indexOf(seed)%2?{stopAt:99,type:'bourbon'}:{stopAt:65,type:'refill'});result.runs.push(row);
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.error(JSON.stringify({event:'seed-complete',seed,months,produced:row.manual.fills,cash:row.cash}));
}
assert.deepEqual(sourceSha256(),sources,'Runtime sources must remain fixed throughout the experiment');
const mean=key=>round(result.runs.reduce((n,r)=>n+key(r),0)/result.runs.length);
result.summary={pairedRuns:result.runs.length,totalSimulatedMonths:result.runs.length*2*months,allMonthlyRuntimeEqual:true,allReplayExact:true,allCashErrorCents:0,meanProduced:mean(r=>r.manual.fills),meanSold:mean(r=>r.totals.bottlesSold),meanRevenue:mean(r=>r.totals.revenue),meanStock:mean(r=>r.stock),meanCash:mean(r=>r.cash),manualMinusUsual:{production:0,extractionTicks:0,costs:0,revenue:0,stock:0,cash:0},totalAutomaticFills:result.runs.reduce((n,r)=>n+r.usual.automaticFills,0),totalConcurrentAgingTicks:result.runs.reduce((n,r)=>n+r.concurrentAgingTicks,0),totalConcurrentSalesTicks:result.runs.reduce((n,r)=>n+r.concurrentSalesTicks,0)};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary,null,2));
