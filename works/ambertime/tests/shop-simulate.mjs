// Paired public-action simulation: no injected cash, stock, time, or customers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as D from '../partner-orders.mjs';
import {brandReputation,brandStats} from '../brand-reputation.mjs';
import {SHOP,deliveryTotals} from '../shop-model.mjs';
import {PARALLEL_PARAMETERS as P,ECONOMY_PARAMETERS as C} from '../economy-parameters.mjs';

const allSeeds=[1,2,3,4,42,12345,20261017,4294967295];
const argument=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const requested=argument('--seed');if(requested!==null)assert(allSeeds.includes(Number(requested)));
const seeds=requested===null?allSeeds:[Number(requested)],months=120,ticksPerMonth=P.monthMs/P.distillStepMs;
const output=argument('--output')??fileURLToPath(new URL('../design/shop/simulation-results.json',import.meta.url));
const round=n=>Math.round(n*100)/100||0,digest=s=>createHash('sha256').update(s).digest('hex');
const stock=s=>s.core.products.reduce((n,p)=>n+p.stock,0);
const delivered=s=>s.shop.deliveries.reduce((n,d)=>n+d.count,0);
const shopRevenue=s=>round(s.shop.deliveries.reduce((n,d)=>n+d.revenue,0));
const sources=()=>Object.fromEntries(['partner-orders.mjs','shop-model.mjs','brand-reputation.mjs','model.mjs','economy.mjs','economy-parameters.mjs','aroma-extraction.mjs','tests/shop-simulate.mjs'].map(p=>[p,digest(fs.readFileSync(new URL('../'+p,import.meta.url)))]));
const sourceSha256=sources();
function exact(s){const raw=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);return digest(raw);}
function accounting(s){
 assert(s.core.casks.length<=4,'Four-cask capacity');
 assert.equal(round(s.core.cash-1600-s.core.totals.revenue+s.core.totals.costs+s.core.totals.upkeep),0,'Cash conservation');
 const retail=s.releases.reduce((n,r)=>n+r.sold,0),retailRevenue=round(s.releases.reduce((n,r)=>n+r.revenue,0));
 assert.equal(retail+delivered(s),s.core.totals.bottlesSold,'Every paid bottle belongs to one channel');
 assert.equal(round(retailRevenue+shopRevenue(s)),s.core.totals.revenue,'Every receipt belongs to one channel');
 for(const p of s.core.products){assert.equal(p.originalStock,p.stock+p.sold);const r=s.releases.find(r=>r.productId===p.id),d=deliveryTotals(s,p.id);assert(r);assert.equal(r.sold+d.bottles,p.sold);assert.equal(round(r.revenue+d.revenue),p.revenue);assert.equal(r.bottles-r.sold-d.bottles,p.stock);}
 for(const b of s.brands){const stats=brandStats(s,b.id),rs=s.releases.filter(r=>r.brandId===b.id);assert.equal(stats.sold,rs.reduce((n,r)=>n+r.sold,0));}
 for(const d of s.shop.deliveries)assert(s.shop.deliveries.filter(x=>x.brandId===d.brandId&&x.month===d.month).reduce((n,x)=>n+x.count,0)<=SHOP.monthlyLimit);
}
function snapshot(s,counts){return {month:s.core.month,produced:counts.fills,retailSold:s.releases.reduce((n,r)=>n+r.sold,0),shopDelivered:delivered(s),sold:s.core.totals.bottlesSold,retailRevenue:round(s.core.totals.revenue-shopRevenue(s)),shopRevenue:shopRevenue(s),revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep,profit:round(s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep),cash:s.core.cash,stock:stock(s),casks:s.core.casks.length,extractionPhase:s.still.phase,extractionProgress:s.still.distillation?.progress??null,releases:s.releases.length,reputation:s.brands.map(b=>({brandId:b.id,bonus:brandReputation(s,b.id).bonus})),...Object.fromEntries(Object.entries(counts).filter(([k])=>k!=='lastDeliverySignature'))};}
function retail(s,id){s=D.bottleBranded(D.endTasting(s),id,s.brands.length?{brandId:s.brands[0].id}:{name:'町へ届ける一樽'});const pid=s.result.productId;return D.listBottles(D.setSalePrice(s,'standard',pid),pid);}
function policy(s,useShop,counts){
 for(let guard=0;guard<40;guard++){
  if(s.decisions.length){const d=s.decisions[0],c=D.currentCask(s,d.caskId);if(c.age>=6){s=retail(s,c.id);continue;}const o=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');assert(o);s=D.chooseDistillery(s,d.caskId,o.id);continue;}
  if(s.trade.offer){s=D.declineOffer(s);counts.tradeDeclines++;continue;}
  const due=s.core.casks.find(c=>c.age>=6);if(due){s=retail(s,due.id);continue;}
  if(s.shop.offer){const before=structuredClone(s.core),rep=s.brands.map(b=>brandReputation(s,b.id));s=useShop?D.acceptShop(s):D.declineShop(s);assert.deepEqual(s.core,before,'Accept/decline never transfer bottles or cash');assert.deepEqual(s.brands.map(b=>brandReputation(s,b.id)),rep);counts[useShop?'accepts':'declines']++;continue;}
  if(useShop){
   const signature=s.core.month+'|'+s.shop.relations.length+'|'+s.core.products.map(p=>p.id+':'+p.stock).join(',');
   if(counts.lastDeliverySignature===signature)return s;counts.lastDeliverySignature=signature;
   const candidate=s.core.products.find(p=>D.shopQuote(s,p.id).ok);
   if(candidate){const q=D.shopQuote(s,candidate.id),count=q.quantities.includes(10)?10:q.quantities.includes(5)?5:q.quantities.at(-1),rep=s.brands.map(b=>brandReputation(s,b.id));assert(count>0);const before={cash:s.core.cash,stock:candidate.stock};s=D.deliverShop(s,candidate.id,count);assert.equal(round(s.core.cash-before.cash),round(count*q.unitPrice));assert.equal(s.core.products.find(p=>p.id===candidate.id).stock,before.stock-count);assert.deepEqual(s.brands.map(b=>brandReputation(s,b.id)),rep,'Delivery must not increase retail reputation');counts.deliveries++;continue;}
  }
  return s;
 }
 throw Error('Policy decision loop');
}
function run(seed){
 const index=allSeeds.indexOf(seed),recipe={stopAt:[30,65,99][Math.floor(index/2)%3],type:index%2?'bourbon':'refill'};
 let noShop=D.newShopDistillery(seed),shop=D.newShopDistillery(seed);
 const counters=()=>({starts:0,fills:0,extractionTicks:0,deliveries:0,accepts:0,declines:0,tradeDeclines:0,automaticFills:0});
 const a=counters(),b=counters(),monthly=[],replay=[];let minCash=1600,parallelAgingTicks=0,parallelSalesTicks=0,blockedProductionRequests=0,partialReplay=false;
 const canProduce=s=>s.still.phase==='ready'&&s.core.casks.length<2&&D.canStart(s).ok&&s.core.cash>=D.canStart(s).minimum+C.casks[recipe.type].cost-Math.min(...Object.values(C.casks).map(c=>c.cost));
 function start(s,c){if(s.usual.recipe){s=D.reserveUsual(s);assert(D.canBeginUsual(s).ok);s=D.beginUsual(s);}else s=D.startDistillation(s);c.starts++;return s;}
 function extract(s,c){if(s.still.phase==='distilling'){const automatic=s.usual.reservation?.status==='active';s=D.distillStep(s);c.extractionTicks++;if(!automatic&&s.still.distillation.progress===recipe.stopAt)s=D.fillBarrel(D.stopDistillation(s),recipe.type);if(s.still.phase==='ready'){c.fills++;if(automatic){c.automaticFills++;assert.equal(s.usual.reservation,null);}}}return s;}
 for(let tick=1;tick<=months*ticksPerMonth;tick++){
  noShop=policy(noShop,false,a);shop=policy(shop,true,b);
  const canA=canProduce(noShop),canB=canProduce(shop);
  if(canA&&canB){noShop=start(noShop,a);shop=start(shop,b);}else if(canA!==canB)blockedProductionRequests++;
  noShop=extract(noShop,a);shop=extract(shop,b);
  assert.equal(a.fills,b.fills);assert.equal(a.extractionTicks,b.extractionTicks);
  if(shop.still.phase==='distilling'&&shop.core.casks.length)parallelAgingTicks++;
  if(shop.still.phase==='distilling'&&stock(shop))parallelSalesTicks++;
  if(!partialReplay&&shop.usual.reservation?.status==='active'&&shop.still.distillation.progress===15){exact(shop);partialReplay=true;}
  if(tick%ticksPerMonth===0){const m=noShop.core.month;noShop=D.tickDistillery(noShop);shop=D.tickDistillery(shop);assert.equal(noShop.core.month,m+1);assert.equal(shop.core.month,m+1);accounting(noShop);accounting(shop);minCash=Math.min(minCash,noShop.core.cash,shop.core.cash);if((m+1)%12===0)monthly.push({month:m+1,noShop:snapshot(noShop,a),shop:snapshot(shop,b)});if(m+1===60)replay.push({month:60,noShop:exact(noShop),shop:exact(shop)});}
 }
 noShop=policy(noShop,false,a);shop=policy(shop,true,b);accounting(noShop);accounting(shop);
 const horizon={noShop:snapshot(noShop,a),shop:snapshot(shop,b)};replay.push({month:120,noShop:exact(noShop),shop:exact(shop)});
 assert(partialReplay);assert(b.deliveries>0);assert(parallelAgingTicks>0&&parallelSalesTicks>0);assert.equal(a.fills,b.fills);assert.equal(a.extractionTicks,b.extractionTicks);
 // Stop production and sell the remaining fixed cohort: distinguish faster cash
 // at the 120-month cutoff from eventual discounted lifetime receipts.
 let liquidationMonths=0,liquidationTicks=0;
 const hasWork=s=>s.still.phase==='distilling'||s.core.casks.length||stock(s);
 while((hasWork(noShop)||hasWork(shop))&&liquidationTicks<240*ticksPerMonth){
  noShop=policy(noShop,false,a);shop=policy(shop,true,b);
  noShop=extract(noShop,a);shop=extract(shop,b);liquidationTicks++;
  if(liquidationTicks%ticksPerMonth===0){
   for(const which of ['noShop','shop']){let s=which==='noShop'?noShop:shop;if(hasWork(s)){const old=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,old+1,'Liquidation progresses while inventory exists');}if(which==='noShop')noShop=s;else shop=s;}
   liquidationMonths++;accounting(noShop);accounting(shop);
  }
 }
 noShop=policy(noShop,false,a);shop=policy(shop,true,b);accounting(noShop);accounting(shop);assert.equal(stock(noShop)+stock(shop)+noShop.core.casks.length+shop.core.casks.length,0,'Same production cohort fully disposed');assert.equal(noShop.core.totals.bottlesSold,shop.core.totals.bottlesSold);
 const liquidation={noShop:snapshot(noShop,a),shop:snapshot(shop,b),calendarMonths:liquidationMonths,clockTicks:liquidationTicks,replay:{noShop:exact(noShop),shop:exact(shop)}};
 return {seed,recipe,months,clockTicks:months*ticksPerMonth,matchedProduction:true,blockedProductionRequests,minCash,parallelAgingTicks,parallelSalesTicks,partialReplay,replay,monthly,horizon,liquidation};
}
const result={method:{seeds,months,tickMilliseconds:P.distillStepMs,monthMilliseconds:P.monthMs,policy:'Public operations only; same seed and recipe in each pair, at most two aging casks (capacity remains four), bottle at six months to the same repeat brand and standard retail price. Both arms share production requests and only start when both can safely fund the same cask. First fill manual; subsequent one-shot usual reservations explicitly renewed per request. Existing trade offers declined equally. No-shop declines passive shop offers; shop accepts and explicitly delivers up to 10 bottles per brand per month. One monthly demand pool is retained; deliveries never become retail reputation. No new production starts after 120 months; any already-running extraction finishes on its original clock, and the fixed remaining cohort is separately liquidated.',limits:'A specified repeat-brand player policy, not an optimization or human preference verdict. Counterfactual retailer customer demand is abstract buyout, not a simulated second sales shelf. No-shop is not forced to accept or deliver. Terminal liquidation distinguishes discounted lifetime receipts from inventory timing. Physical Safari and subjective interest are outside this simulation.',sourceSha256},runs:[],summary:null};
for(const seed of seeds){const row=run(seed);result.runs.push(row);fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.error(JSON.stringify({seed,produced:row.horizon.noShop.produced,noShopCash:row.horizon.noShop.cash,shopCash:row.horizon.shop.cash,deliveries:row.horizon.shop.shopDelivered}));}
assert.deepEqual(sources(),sourceSha256,'Sources changed during paired comparison');
const mean=f=>round(result.runs.reduce((n,r)=>n+f(r),0)/result.runs.length);
const aggregate=phase=>({noShop:Object.fromEntries(['produced','sold','retailSold','shopDelivered','revenue','costs','upkeep','profit','cash','stock'].map(k=>[k,mean(r=>r[phase].noShop[k])])),shop:Object.fromEntries(['produced','sold','retailSold','shopDelivered','revenue','costs','upkeep','profit','cash','stock'].map(k=>[k,mean(r=>r[phase].shop[k])])),shopMinusNoShop:Object.fromEntries(['produced','sold','retailSold','shopDelivered','revenue','costs','upkeep','profit','cash','stock'].map(k=>[k,mean(r=>r[phase].shop[k]-r[phase].noShop[k])]))});
result.summary={pairs:result.runs.length,totalSimulatedMonths:result.runs.length*months*2,horizon:aggregate('horizon'),liquidation:aggregate('liquidation'),allReplayExact:true,allAccountingExact:true,capacityNeverAboveFour:true,sameProductionAndExtractionTime:true,totalBlockedProductionRequests:result.runs.reduce((n,r)=>n+r.blockedProductionRequests,0),allNoShopLiquidationRevenueHigher:result.runs.every(r=>r.liquidation.noShop.revenue>r.liquidation.shop.revenue),allNoShopLiquidationProfitHigher:result.runs.every(r=>r.liquidation.noShop.profit>r.liquidation.shop.profit),totalConcurrentAgingTicks:result.runs.reduce((n,r)=>n+r.parallelAgingTicks,0),totalConcurrentSalesTicks:result.runs.reduce((n,r)=>n+r.parallelSalesTicks,0)};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary,null,2));
