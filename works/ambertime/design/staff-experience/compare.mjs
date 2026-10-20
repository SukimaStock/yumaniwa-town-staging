// Read-only comparison of the unchanged shipping model; no player storage access.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const repo=process.env.AMBER_AUDIT_ROOT??process.cwd(),work=path.join(repo,'works/ambertime');
const D=await import(pathToFileURL(path.join(work,'partner-orders.mjs')));
const P=(await import(pathToFileURL(path.join(work,'economy-parameters.mjs')))).PARALLEL_PARAMETERS;
const C=(await import(pathToFileURL(path.join(work,'parameters.mjs')))).PARAMETERS;
const base='c84f5e4945ee97e540f9f152bd1781904d8c107b',seed=42,horizon=144,progress=65;
const hashes=()=>Object.fromEntries(fs.readdirSync(work).filter(x=>x.endsWith('.mjs')).sort().map(x=>[x,createHash('sha256').update(fs.readFileSync(path.join(work,x))).digest('hex')]));
const date=m=>m===null?null:{elapsedMonth:m,elapsedYears:Number((m/12).toFixed(3)),calendarYear:2026+Math.floor(m/12),calendarMonth:m%12+1,gameYear:Math.floor(m/12)+1};
function run(config){
 const extractionProgress=config.progress??progress;
 let s=D.newFreeAgingDistillery(seed),manualFills=0,manualBottles=0,distillUnlock=null,bottleUnlock=null,stopped=null;
 const events=[],monthly=[],refusals=[],staffNotices=[],partialTaken=new Set();
 const reached=()=>distillUnlock!==null&&bottleUnlock!==null;
 function accounting(){assert(s.core.casks.length<=4);assert.equal(s.staff.hired,false);assert.equal(s.staffProgression.bottling.hired,false);assert(Math.abs(s.core.cash-(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep))<1e-6);assert.equal(manualBottles,s.releases.reduce((n,r)=>n+r.bottles,0));assert.equal(manualBottles,s.releases.reduce((n,r)=>n+r.sold,0)+s.core.products.reduce((n,p)=>n+p.stock,0));}
 function collect(){
  if(s.decisions.length){stopped={month:s.core.month,reason:s.decisions[0].eventId,cash:s.core.cash};return false;}
  if(s.trade.offer)s=D.declineOffer(s);
  while(s.shop.offer){const o=s.shop.offer;s=D.declineShop(s,o.shopId,o.id);}
  for(const o of D.staffOpportunities(s)){staffNotices.push({month:s.core.month,kind:o.kind});s=D.noticeStaffOpportunity(s,o.kind);}
  return true;
 }
 function bottle(id,count){
  const c=D.currentCask(s,id),beforeCash=s.core.cash,age=c.age,withdrawn=events.filter(e=>e.kind==='manual-bottle'&&e.caskId===id).reduce((n,e)=>n+e.count*.7,0);
  s=D.bottleBranded(s,id,{},count);const n=s.result.bottles,pid=s.result.productId;manualBottles+=n;
  events.push({month:s.core.month,kind:'manual-bottle',caskId:id,productId:pid,age,count:n,sourceLitres:c.litres,initialLitres:c.initialLitres,type:c.type,evaporatedBefore:c.initialLitres-c.litres-withdrawn,remainingLitres:D.currentCask(s,id)?.litres??s.core.archive.find(a=>a.id===id)?.litres??0,cashBefore:beforeCash,cashAfter:s.core.cash,manualBottles});
  if(bottleUnlock===null&&manualBottles>=150)bottleUnlock=s.core.month;
  s=D.listBottles(D.setSalePrice(s,'standard',pid),pid);
 }
 function policy(){
  if(!collect())return false;
  for(const c of [...s.core.casks]){
   let count=null;
   if(config.policy==='partial'&&c.age>=6&&!partialTaken.has(c.id))count=10;
   else if(c.age>=config.age)count=D.quote(s,c.id).count;
   if(count!==null){
    if(s.core.cash<count*3){stopped={month:s.core.month,reason:'manual-bottling-unaffordable',cash:s.core.cash,required:count*3};return false;}
    bottle(c.id,count);if(config.policy==='partial')partialTaken.add(c.id);
   }
  }
  accounting();return collect();
 }
 for(let month=0;month<horizon;month++){
  assert.equal(s.core.month,month);if(!policy()||reached())break;
  if(month%(12/config.perYear)===0){
   const q=D.canStart(s),minimum=q.minimum+C.casks[config.type].cost-Math.min(...Object.values(C.casks).map(c=>c.cost));
   if(q.ok&&s.core.cash>=minimum){s=D.startDistillation(s);events.push({month,kind:'manual-start',cash:s.core.cash});}
   else refusals.push({month,reason:!q.ok?q.reason:'Selected cask premium not available',cash:s.core.cash,minimum,kind:!q.ok&&q.reason.includes('4樽')?'capacity':!q.ok&&q.reason.includes('商品')?'product-capacity':q.ok||q.reason.includes('£')?'cash':'other',cashShort:s.core.cash<minimum});
  }
  for(let step=0;step<P.monthMs/P.distillStepMs&&s.still.phase==='distilling';step++){
   s=D.distillStep(s);
   if(s.still.distillation.progress>=extractionProgress){
    s=D.fillBarrel(D.stopDistillation(s),config.type);manualFills++;const c=s.core.casks.at(-1);
    events.push({month,kind:'manual-fill',id:c.id,litres:c.initialLitres,cash:s.core.cash,manualFills});
    if(distillUnlock===null&&manualFills>=8)distillUnlock=s.core.month;
    if(reached()||!policy())break;
   }
  }
  if(stopped||reached())break;
  const before=s;s=D.tickDistillery(s);
  if(s.core.month!==month+1){stopped={month,reason:s.decisions[0]?.eventId??'clock-stalled',cash:s.core.cash};break;}
  for(const x of s.core.lastMonth.sales.filter(x=>x.sold>0)){const p=s.core.products.find(p=>p.id===x.id);assert(p.bottledMonth<s.core.month);assert(s.productsById[p.id].listedMonth<s.core.month);}
  assert.equal(s.core.lastMonth.sales.filter(x=>x.channel).length,0);
  accounting();monthly.push({month:s.core.month,cash:s.core.cash,casks:s.core.casks.length,fills:manualFills,bottles:manualBottles,retailSold:s.core.totals.bottlesSold,stock:s.core.products.reduce((n,p)=>n+p.stock,0),revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep});
 }
 // Process the final elapsed-month decision once; do not start an extra scheduled batch.
 if(!stopped&&!reached())policy();accounting();
 const serialized=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(serialized)),serialized);
 const startMonths=events.filter(e=>e.kind==='manual-start').map(e=>e.month),fillMonths=events.filter(e=>e.kind==='manual-fill').map(e=>e.month);
 return {config,completedMonths:s.core.month,completion:reached()?'both-targets-observed':stopped?'blocked':'horizon',manualFills,manualBottles,distillUnlock:date(distillUnlock),bottleUnlock:date(bottleUnlock),bothUnlocked:date(distillUnlock!==null&&bottleUnlock!==null?Math.max(distillUnlock,bottleUnlock):null),stopped,refusals,staffNotices,startMonths,fillMonths,finalCash:s.core.cash,revenues:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep,events,monthly,stateSha256:createHash('sha256').update(serialized).digest('hex')};
}
const before=hashes(),runs=[];
for(const perYear of [1,2,4])for(const type of ['refill','bourbon'])for(const [policy,age] of [['full',6],['full',12],['partial',12]]){
 const result=run({perYear,type,policy,age});runs.push(result);
 console.log(JSON.stringify({config:result.config,distillUnlock:result.distillUnlock,bottleUnlock:result.bottleUnlock,refusals:result.refusals,stop:result.stopped,cash:result.finalCash}));
}
const supplementalRuns=[];
for(const perYear of [1,2,4])for(const age of [6,12])supplementalRuns.push(run({perYear,type:'refill',policy:'full',age,progress:99}));
for(const perYear of [2,4])supplementalRuns.push(run({perYear,type:'refill',policy:'partial',age:12,progress:99}));
assert.deepEqual(hashes(),before);
assert.deepEqual(run(runs[0].config),runs[0]);
assert.deepEqual(run(supplementalRuns[0].config),supplementalRuns[0]);
const supplemental={tag:'post-runtime-supplement-legal99',factory:'newFreeAgingDistillery (historic boundary, independent counters; no staffExperience upgrade)',base,seed,horizon,progress:99,actualLitres:39.77,sourceSha256:before,checks:{runtimeSourcesUnchanged:true,accountingAndStockConserved:true,strictReplayAllFinals:true,nextMonthSales:true,repeatedFirstRunIdentical:true},runs:supplementalRuns};
const results={base,seed,horizon,targets:{manualFills:8,manualBottles:150},method:{model:'newFreeAgingDistillery; unchanged shipping production model, all actions via public APIs; no player storage.',volume:'Manual progress65:32L, both refill/bourbon. All real evaporation/chemistry/cost/reserve limits retained.',clock:'60 extraction steps/month; manual start at scheduled month0 then spacing12/perYear.65steps thus first fillmonth1. Model month0=Jan2026; year1 meansmonths0..11. Policy decisions at startofmonth and afterfills; stop once both targets observed, otherwise final decisionat144, no extra scheduledstart.',policies:'Full at6 or12months. Partial10at6months then remaining all at12. No cooling/sampling. Standard prices, immediate explicitlist, first salesnextmonth. No hires/automation; old early staff notices acknowledged only; optional shop offers declined to isolate retail.',delays:'Scheduled starts refused for cash/capacity skipped, no rescue or offschedulecatchup. Genuine funds/otherblockingdecision stops; no fabricated money. Each threshold counts successful manualfill completions and actual bottled quantity independently.',limits:'Stop immediately after both target counts, otherwise at144months; seed42, fixed32L recipe and deterministic schedule; not optimalplay or subjective enjoyment. PR542 figures are original audit reference only; current model has subsequent shop/aging/replay changes.'},sourceSha256:before,runs,checks:{runtimeSourcesUnchanged:true,accountingAndStockConserved:true,strictReplayAllFinals:true,nextMonthSales:true,repeatedFirstRunIdentical:true}};
const out=process.env.AMBER_AUDIT_OUTPUT??new URL('./results.json',import.meta.url);
const saved=fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')):null;
if(saved){
 assert.equal(saved.base,base);assert.equal(saved.seed,seed);assert.equal(saved.horizon,horizon);assert.deepEqual(saved.targets,results.targets);assert.deepEqual(saved.method,results.method);assert.deepEqual(saved.checks,results.checks);assert.deepEqual(saved.runs,results.runs);
 // Keep the original preimplementation snapshot; candidate files can change while their historical factory remains exact.
 results.sourceSha256=saved.sourceSha256;
}
results.supplemental=supplemental;
if(process.argv.includes('--check')){
 assert(saved,'Saved comparison results are required');assert(saved.supplemental,'Saved99-stop supplement is required');
 for(const key of ['tag','factory','base','seed','horizon','progress','actualLitres','checks','runs'])assert.deepEqual(saved.supplemental[key],supplemental[key]);
 console.log('18 baseline and8 legal99 supplemental comparisons reproduced; saved provenance retained.');
}else fs.writeFileSync(out,JSON.stringify(results,null,2)+'\n');
