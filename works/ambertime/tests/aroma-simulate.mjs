// Bounded public-action simulation. No fabricated cash, products or fast-forward
// extraction: each distillStep consumes the same 100 ms clock callback as the UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as D from '../partner-orders.mjs';
import * as M from '../model.mjs';
import * as E from '../economy.mjs';
import {execFileSync} from 'node:child_process';
import {profileAt} from '../experiments/distillation/models.mjs';
import {specialEligible} from '../experiments/distillation/adapters.mjs';
import {loadFixture} from './wholesale-care-helpers.mjs';
import {advance} from './brands-helpers.mjs';
import {PARALLEL_PARAMETERS as P,ECONOMY_PARAMETERS as C} from '../economy-parameters.mjs';

const allSeeds=[1,2,3,4,42,12345,20261017,4294967295];
const argument=name=>{const index=process.argv.indexOf(name);return index<0?null:process.argv[index+1];};
const selectedSeed=argument('--seed');if(selectedSeed!==null)assert(allSeeds.includes(Number(selectedSeed)),'Unknown simulation seed');
const seeds=selectedSeed===null?allSeeds:[Number(selectedSeed)];
const months=120,ticksPerMonth=P.monthMs/P.distillStepMs,round=n=>Math.round(n*100)/100;
const output=argument('--output')??fileURLToPath(new URL('../design/aroma/simulation-results.json',import.meta.url));
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
 let manual=D.newAromaDistillery(seed),usual=D.newAromaDistillery(seed);
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
  if(!partialReplay&&usual.usual.reservation?.status==='active'&&usual.still.distillation.progress===15){exact(usual);partialReplay=true;}
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
 assert(partialReplay);assert(b.automaticFills>0);assert(concurrentAgingTicks>0);assert(concurrentSalesTicks>0);
 assert.equal(a.fills,b.fills);assert.equal(a.extractionTicks,b.extractionTicks);assert.equal(b.reservations,b.automaticFills+(usual.usual.reservation?1:0));
 return {seed,recipe,months,clockTicks:months*ticksPerMonth,gameMilliseconds:months*P.monthMs,manual:a,usual:b,totals:manual.core.totals,stock:stock(manual),casks:manual.core.casks.length,cash:manual.core.cash,minCash,crossMonthExtractions,concurrentAgingTicks,concurrentSalesTicks,partialReplay,identicalRuntimeAtEveryMonth:true,cashErrorCents:0,replay,monthly};
}

const sourceSha256=()=>Object.fromEntries(['partner-orders.mjs','economy.mjs','model.mjs','tests/aroma-simulate.mjs','economy-parameters.mjs','partner-parameters.mjs','aroma-extraction.mjs'].map(p=>[p,digest(fs.readFileSync(new URL('../'+p,import.meta.url)))]));
const sources=sourceSha256();
const supplemental=process.argv.includes('--supplement-only');
const result=supplemental?JSON.parse(fs.readFileSync(output,'utf8')):{method:{seeds,months,tickMilliseconds:P.distillStepMs,monthMilliseconds:P.monthMs,recipes:[30,65,99].flatMap(stopAt=>['refill','bourbon'].map(type=>({stopAt,type}))),policy:'Public actions only. First cask is manually distilled in both arms. Thereafter one arm manually starts/stops/fills; the other explicitly reserves exactly one next cask per production request. Both hold at most two aging casks and bottle at age six to the same brand at standard price. Decisions and offers pause simulation until handled. Each extraction step uses one clock callback; no instant distillation or modified cash. Extra bourbon cost is protected equally in both arms. Non-log runtime state is compared every month.',limits:'Matched policy, not a claim that automation increases demand or production. One recipe per seed, cycling early30/mid65/late99 and both casks; two repeat-seed recipes. Pauses and UI scheduling are covered by separate tests.',sourceSha256:sources},runs:[],summary:null};
if(!supplemental)for(const seed of seeds){
 const index=allSeeds.indexOf(seed),row=run(seed,{stopAt:[30,65,99][Math.floor(index/2)%3],type:index%2?'bourbon':'refill'});result.runs.push(row);
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.error(JSON.stringify({event:'seed-complete',seed,months,produced:row.manual.fills,cash:row.cash}));
}
assert.deepEqual(sourceSha256(),sources,'Runtime sources must remain fixed throughout the experiment');
result.method.longRunSourceSha256??=result.method.sourceSha256;
const mean=key=>round(result.runs.reduce((n,r)=>n+key(r),0)/result.runs.length);
result.summary={pairedRuns:result.runs.length,totalSimulatedMonths:result.runs.length*2*months,allMonthlyRuntimeEqual:true,allReplayExact:true,allCashErrorCents:0,meanProduced:mean(r=>r.manual.fills),meanSold:mean(r=>r.totals.bottlesSold),meanRevenue:mean(r=>r.totals.revenue),meanStock:mean(r=>r.stock),meanCash:mean(r=>r.cash),manualMinusUsual:{production:0,extractionTicks:0,costs:0,revenue:0,stock:0,cash:0},totalAutomaticFills:result.runs.reduce((n,r)=>n+r.usual.automaticFills,0),totalConcurrentAgingTicks:result.runs.reduce((n,r)=>n+r.concurrentAgingTicks,0),totalConcurrentSalesTicks:result.runs.reduce((n,r)=>n+r.concurrentSalesTicks,0)};

function integratedComparisons(){
 let exactProfiles=0;const special={bourbon:0,refill:0},samples=[],comparisonSeeds=[20261015,1,2,42,314159,8675309,123456789,4294967295];
 for(const seed of comparisonSeeds)for(let position=30;position<=99;position++){
  let state=D.startDistillation(D.newAromaDistillery(seed));
  for(let i=0;i<position;i++)state=D.distillStep(state);
  state=D.stopDistillation(state);const expected=profileAt('a',position,seed);
  assert.equal(state.core.spirit.character,expected.character);assert.equal(state.core.spirit.roughness,expected.roughness);assert.equal(state.core.spirit.litres,expected.litres);
  exactProfiles++;
  for(const type of ['bourbon','refill']){
   let c=D.fillBarrel(state,type).core.casks[0];
   if(seed===20261015&&[30,65,99].includes(position))samples.push({seed,position,type,age:0,roughness:c.roughness,character:c.character,wood:c.wood,litres:c.litres});
   for(let age=1;age<=36;age++){
    c=M.ageCask(c);
    if(age===24&&specialEligible(c))special[type]++;
    if(seed===20261015&&[30,65,99].includes(position)&&age%12===0)samples.push({seed,position,type,age,roughness:c.roughness,character:c.character,wood:c.wood,litres:c.litres,marketValue:E.marketValue(c),specialEligible:specialEligible(c)});
   }
  }
 }
 return {method:'Public D start/step/stop/fill: first-batch profiles match frozen experimental A exactly. Existing pure M.ageCask then ages actual generated casks through36 months. Special counts are taste eligibility at24 only, not offer probability; £ quote is existing E.marketValue, not guaranteed sale.',seeds:comparisonSeeds,exactProfiles,special24:{eligible:special,denominatorPerType:allSeeds.length*70},samples};
}
function shipmentBoundary(){
 let s=D.enableAroma(loadFixture('partners-accepted.json'));
 function fill(state){state=D.startDistillation(state);for(let i=1;i<=65;i++){state=D.distillStep(state);if(i===60)state=advance(state,1);}return D.fillBarrel(D.stopDistillation(state),'bourbon');}
 s=fill(s);const special=s.core.casks.at(-1).id;s=D.assignOrder(s,special);s=advance(s,116-s.core.month);s=fill(s);const regular=s.core.casks.at(-1).id;s=D.assignCask(s,regular,s.trade.relationship.terms[0].id);s=advance(s,134-s.core.month);s=D.reserveUsual(s);const before=structuredClone(s.core);s=advance(s,1);
 assert.equal(s.trade.lastShipments.length,2);assert.equal(s.core.casks.length,0);const shipments=structuredClone(s.trade.lastShipments),shipmentMonth=s.core.month,costAfterShipment=s.core.totals.costs,cashAfterShipment=s.core.cash;exact(s);
 s=D.beginUsual(s);for(let i=1;i<=65;i++){s=D.distillStep(s);if(i===60)s=advance(s,1);}assert.equal(s.core.casks.length,1);assert.equal(s.usual.reservation,null);exact(s);
 assert.equal(round(s.core.totals.costs-costAfterShipment),280);assert.equal(round(cashAfterShipment-s.core.cash),284);
 return {method:'Legal previous-version partners-accepted fixture, migrated via enableAroma; no cash or state fabrication; two new A bourbon casks.',shipmentMonth,shipments,afterShipmentCasks:0,resumedMonth:s.core.month,extractionTicks:65,produced:1,reservation:null,productionCost:280,concurrentMaintenance:4,replayExact:true};
}
result.integration=integratedComparisons();result.shipmentBoundary=shipmentBoundary();
result.unchangedSourceSha256=Object.fromEntries(['model.mjs','economy.mjs','economy-parameters.mjs','partner-parameters.mjs','brand-reputation.mjs'].map(file=>{const path='works/ambertime/'+file,current=fs.readFileSync(new URL('../'+file,import.meta.url)),base=execFileSync('git',['show','47a54c4:'+path]);assert.equal(Buffer.compare(current,base),0,'Protected source changed: '+file);return [file,digest(current)];}));
result.method.finalSourceSha256=sourceSha256();
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({summary:result.summary,special24:result.integration.special24,shipmentBoundary:result.shipmentBoundary},null,2));

