// Cross-feature regression: public operations and the existing 100 ms clock.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as D from '../partner-orders.mjs';
import {brandReputation} from '../brand-reputation.mjs';
import {deliveryTotals} from '../shop-model.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {release,advance,exact as restore} from './brands-helpers.mjs';

const seeds=[1,2,3,4,42,12345,20261017,4294967295],base='9907ffac1a19672b1acfc0da7881c809abd45e69';
const output=new URL('../design/cross-audit/simulation-results.json',import.meta.url);
const round=n=>Math.round(n*100)/100||0,sha=s=>createHash('sha256').update(s).digest('hex');
const sourcePaths=['partner-orders.mjs','shop-model.mjs','brand-reputation.mjs','model.mjs','economy.mjs','parameters.mjs','economy-parameters.mjs','partner-parameters.mjs','aroma-extraction.mjs'];
const sources=()=>Object.fromEntries(sourcePaths.map(p=>[p,sha(fs.readFileSync(new URL('../'+p,import.meta.url)))]));
const sourceSha256=sources(),baselineSha256=Object.fromEntries(sourcePaths.map(p=>[p,sha(execFileSync('git',['show',base+':works/ambertime/'+p],{maxBuffer:2e6}))]));
assert.deepEqual(sourceSha256,baselineSha256,'Audited economic and production models are unchanged from 0.15.1');
const replay=s=>{const raw=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);return sha(raw);};
function accounting(s){
 assert(s.core.casks.length<=4);assert.equal(round(s.core.cash-1600-s.core.totals.revenue+s.core.totals.costs+s.core.totals.upkeep),0);
 for(const p of s.core.products){assert.equal(p.stock+p.sold,p.originalStock);const r=s.releases.find(r=>r.productId===p.id);if(r){const d=deliveryTotals(s,p.id);assert.equal(r.sold+d.bottles,p.sold);assert.equal(round(r.revenue+d.revenue),p.revenue);assert.equal(r.bottles-r.sold-d.bottles,p.stock);}}
 const retail=s.releases.reduce((n,r)=>n+r.sold,0),retailRevenue=round(s.releases.reduce((n,r)=>n+r.revenue,0)),shop=s.shop.deliveries.reduce((n,d)=>n+d.count,0),shopRevenue=round(s.shop.deliveries.reduce((n,d)=>n+d.revenue,0));
 // Durable trade history is bounded; per-month channel reconciliation below
 // verifies wholesale receipts before any archival history can be pruned.
 assert(retail+shop<=s.core.totals.bottlesSold);assert(round(retailRevenue+shopRevenue)<=round(s.core.totals.revenue)+.01);
 for(const d of s.shop.deliveries)assert(s.shop.deliveries.filter(x=>x.brandId===d.brandId&&x.month===d.month).reduce((n,x)=>n+x.count,0)<=10);
}
function retail(s,id){s=D.bottleBranded(s,id,s.brands.length?{brandId:1}:{name:'町へ届ける原酒'});const pid=s.result.productId;return D.listBottles(D.setSalePrice(s,'standard',pid),pid);}
function wait(s){while(s.decisions.length){const d=s.decisions[0],o=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');assert(o,d.eventId);s=D.chooseDistillery(s,d.caskId,o.id);}return s;}
function run(seed){
 let s=D.newShopDistillery(seed),maxCasks=0,starts=0,fills=0,automaticFills=0,extractionTicks=0,tastingPauses=0,judgments=0,maxQueue=0,retailSold=0,retailRevenue=0,wholesaleSold=0,wholesaleRevenue=0,wholesaleShipments=0,multiShipmentMonths=0,specialOffers=0,specialFulfilled=0,shopDeliveries=0,concurrentAgingTicks=0,concurrentSalesTicks=0,minCash=1600;
 const monthly=[],replays=[];let lastPolicy=null,deliveryMonth=-1,initialNoticeMonth=null;
 const stock=()=>s.core.products.reduce((n,p)=>n+p.stock,0);
 function policy(){
  if(s===lastPolicy)return;lastPolicy=s;
  for(let guard=0;guard<40;guard++){
   maxQueue=Math.max(maxQueue,s.decisions.length);
   if(s.decisions.length){const d=s.decisions[0],c=D.currentCask(s,d.caskId);judgments++;s=D.sampleDistillery(s,c.id);assert.equal(D.tickDistillery(s),s,'Tasting blocks month');tastingPauses++;s=D.endTasting(s);if(d.eventId==='order-unmet'){s=D.chooseDistillery(s,c.id,'order-wholesale');continue;}if(d.eventId==='funds'||(!D.contractFor(s,c.id)&&c.age>=(s.core.month<36?6:18))){s=retail(s,c.id);continue;}const o=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');assert(o,d.eventId);s=D.chooseDistillery(s,c.id,o.id);continue;}
   if(s.trade.offer){if(s.trade.offer.kind==='special')specialOffers++;s=D.acceptOffer(s);continue;}
   const due=s.core.casks.find(c=>!D.contractFor(s,c.id)&&c.age>=(s.core.month<36?6:18));if(due){s=retail(s,due.id);continue;}
   if(s.trade.order?.status==='accepted'){const c=D.orderCandidates(s)[0];if(c){s=D.assignOrder(s,c.id);continue;}}
   // Explicitly choose eligible wholesale casks while retaining retail work.
   if(s.trade.relationship&&s.core.month>=40){const term=s.trade.relationship.terms[0],c=D.contractCandidates(s,term).find(c=>c.id%3===0);if(c){s=D.assignCask(s,c.id,term.id);continue;}}
   if(s.shop.offer){if(!s.shop.offer.notified){s=D.noticeShopOffer(s);initialNoticeMonth??=s.core.month;continue;}if(s.core.month>=initialNoticeMonth+3){s=D.acceptShop(s);continue;}}
   if(s.shop.relations.length&&deliveryMonth!==s.core.month){deliveryMonth=s.core.month;const p=s.core.products.filter(p=>D.shopQuote(s,p.id).ok).at(-1);if(p){const q=D.shopQuote(s,p.id),rep=brandReputation(s,1);s=D.deliverShop(s,p.id,q.quantities.at(-1));assert.deepEqual(brandReputation(s,1),rep);shopDeliveries++;continue;}}
   lastPolicy=s;return;
  }throw Error('Policy loop');
 }
 for(let tick=1;tick<=120*P.monthMs/P.distillStepMs;tick++){
  policy();
  const limit=s.core.month<36?2:4;
  if(s.still.phase==='ready'&&s.core.casks.length<limit&&D.canStart(s).ok){s=s.usual.recipe?D.beginUsual(D.reserveUsual(s)):D.startDistillation(s);starts++;}
  if(s.still.phase==='distilling'){const auto=s.usual.reservation?.status==='active';s=D.distillStep(s);extractionTicks++;if(!auto&&s.still.distillation.progress===65)s=D.fillBarrel(D.stopDistillation(s),'refill');if(s.still.phase==='ready'){fills++;if(auto){automaticFills++;assert.equal(s.usual.reservation,null);}}if(s.core.casks.length)concurrentAgingTicks++;if(stock())concurrentSalesTicks++;}
  maxCasks=Math.max(maxCasks,s.core.casks.length);
  if(tick%(P.monthMs/P.distillStepMs)===0){policy();const before=s.core.month,prevRev=s.core.totals.revenue,prevSold=s.core.totals.bottlesSold;s=D.tickDistillery(s);assert.equal(s.core.month,before+1,'Clock progresses without modal deadlock');const shipments=s.trade.lastShipments;wholesaleShipments+=shipments.length;if(shipments.length>1)multiShipmentMonths++;specialFulfilled+=shipments.filter(k=>k.orderId).length;const ws=shipments.reduce((n,k)=>n+k.bottles,0),wr=round(shipments.reduce((n,k)=>n+k.gross,0));wholesaleSold+=ws;wholesaleRevenue=round(wholesaleRevenue+wr);const rs=s.core.lastMonth.sales.filter(x=>x.channel!=='wholesale'),rn=rs.reduce((n,x)=>n+x.sold,0),rr=round(rs.reduce((n,x)=>n+x.revenue,0));retailSold+=rn;retailRevenue=round(retailRevenue+rr);assert.equal(s.core.totals.bottlesSold-prevSold,ws+rn);assert.equal(round(s.core.totals.revenue-prevRev),round(wr+rr));accounting(s);minCash=Math.min(minCash,s.core.cash);if(s.core.month%12===0)monthly.push({month:s.core.month,casks:s.core.casks.length,stock:stock(),cash:s.core.cash,revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep});if(s.core.month===60)replays.push({month:60,sha256:replay(s)});}
 }
 policy();accounting(s);assert.equal(maxCasks,4,'Bootstrap reaches the real four-cask capacity');assert(automaticFills>0&&tastingPauses>0);replays.push({month:120,sha256:replay(s)});
 const shopSold=s.shop.deliveries.reduce((n,d)=>n+d.count,0),shopRevenue=round(s.shop.deliveries.reduce((n,d)=>n+d.revenue,0));assert.equal(retailSold+wholesaleSold+shopSold,s.core.totals.bottlesSold);assert.equal(round(retailRevenue+wholesaleRevenue+shopRevenue),s.core.totals.revenue);
 return {seed,months:120,clockTicks:7200,maxCasks,starts,fills,automaticFills,extractionTicks,tastingPauses,judgments,maxQueue,wholesaleShipments,multiShipmentMonths,specialOffers,specialFulfilled,shopDeliveries,concurrentAgingTicks,concurrentSalesTicks,minCash,channels:{retail:{bottles:retailSold,revenue:retailRevenue},wholesale:{bottles:wholesaleSold,revenue:wholesaleRevenue},shop:{bottles:shopSold,revenue:shopRevenue}},final:{cash:s.core.cash,stock:stock(),casks:s.core.casks.length,releases:s.releases.length,relations:s.shop.relations.length,revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep},monthly,replays};
}
function inventoryEdges(){
 let s=release(D.newShopDistillery(42),{age:6,progress:65,selection:{name:'川霧'},tier:'low'});s=advance(s,1);s=release(s,{age:6,progress:65,selection:{brandId:1},tier:'low'});for(let i=0;i<40&&!s.shop.offer;i++)s=advance(s,1);assert(s.shop.offer);const initialStock=s.core.products.reduce((n,p)=>n+p.stock,0),initialMonth=s.core.month;
 const acceptedBefore=D.acceptShop(s),acceptedSoldOut=advance(acceptedBefore,20);assert.deepEqual(acceptedSoldOut.shop.relations,acceptedBefore.shop.relations);assert(acceptedSoldOut.core.products.every(p=>p.stock===0));assert.equal(acceptedSoldOut.shop.deliveries.length,0);const unseenSoldOut=advance(s,60);assert(unseenSoldOut.shop.offer&&!unseenSoldOut.shop.offer.notified);assert(unseenSoldOut.core.products.every(p=>p.stock===0));
 const deferred=D.noticeShopOffer(s),later=advance(deferred,2),soldout=advance(deferred,60);assert(soldout.shop.offer);assert(soldout.core.products.every(p=>p.stock===0));let accepted=D.acceptShop(soldout);assert.deepEqual(accepted.core,soldout.core);accepted=release(accepted,{age:0,progress:65,selection:{brandId:1}});const id=accepted.releases.at(-1).productId;accepted=D.deliverShop(accepted,id,5);assert.equal(accepted.core.products.find(p=>p.id===id).stock,40);replay(accepted);
 let multiple=advance(s,1);multiple=release(multiple,{age:0,progress:65,selection:{brandId:1}});const chosen=multiple.releases.at(-1),other=structuredClone(multiple.core.products.find(p=>p.stock>0&&p.id!==chosen.productId));assert(other);multiple=D.acceptShopDelivery(multiple,chosen.productId,5);assert.deepEqual(multiple.core.products.find(p=>p.id===other.id),other);assert.equal(multiple.shop.deliveries[0].releaseId,chosen.id);replay(multiple);
 let short=advance(s,1);short=release(short,{age:0,progress:30,selection:{brandId:1},tier:'low'});const sid=short.releases.at(-1).productId;for(let i=0;i<40;i++){const p=short.core.products.find(p=>p.id===sid);if(p.stock>0&&p.stock<5){assert.deepEqual(D.shopOfferQuote(short,sid).quantities,[p.stock]);const n=p.stock;short=D.acceptShopDelivery(short,sid,n);replay(short);return {initialMonth,initialStock,stockAfterTwoDeferredMonths:later.core.products.reduce((n,p)=>n+p.stock,0),soldOutOfferRetained:true,unseenOfferSurvivesStockout:true,acceptedRelationSurvivesStockout:true,zeroStockAcceptance:true,reissueDelivery:5,reissueRemaining:40,chosenReleaseId:chosen.id,otherProductUnchanged:true,shortRemainder:n,replayExact:true};}short=advance(short,1);}throw Error('Short remainder not reached');
}
function orderEdges(){
 const load=name=>D.enableShop(D.restoreDistillery(fs.readFileSync(new URL('./fixtures/partners-'+name+'.json',import.meta.url),'utf8')));
 let s=load('due');const id=s.trade.order.caskId,m=s.core.month,before=s.core.totals.revenue;s=D.sampleDistillery(s,id);assert.equal(D.tickDistillery(s),s);s=D.endTasting(s);s=D.tickDistillery(s);assert.equal(s.core.month,m+1);assert(s.trade.lastShipments.some(x=>x.orderId));const special=s.records.find(r=>r.caskId===id);assert.equal(special.order.outcome,'fulfilled');replay(s);const receipt=s.core.totals.revenue-before;
 let unmet=load('unmet');const uid=unmet.trade.order.caskId;assert.equal(D.tickDistillery(unmet),unmet);unmet=D.chooseDistillery(unmet,uid,'order-wholesale');assert(!D.currentCask(unmet,uid));replay(unmet);
 // Existing legal fixtures isolate same-month regular shipments, without
 // injecting ages, cash, IDs or replacing the production equations.
 let due=D.enableShop(D.restoreDistillery(fs.readFileSync(new URL('./fixtures/v09-due.json',import.meta.url),'utf8')));due=wait(due);if(due.trade.offer)due=D.declineOffer(due);const month=due.core.month;due=D.tickDistillery(due);const count=due.trade.lastShipments.length;assert(count>=2);replay(due);
 return {provenance:'Checked-in legally replayable legacy operation histories, migrated with enableShop. Separate targeted scenarios, not claimed as part of each fresh-seed route.',specialFulfilled:true,specialBottles:special.bottles,specialUnitPrice:special.unitPrice,monthRevenue:round(receipt),unmetExplicitFallback:true,simultaneousRegularShipments:count,simultaneousMonth:month+1,replayExact:true};
}
const result={method:{base,seeds,monthsPerSeed:120,tickMilliseconds:100,monthMilliseconds:6000,policy:'Fresh start; manual first refill extraction at65, each later one-shot usual reservation explicitly renewed. Bootstrap with up to2 casks bottled at6months until month36, then up to4 casks with18month retail target. Explicit tasting/queued judgments resolved, offers accepted, some casks allocated to regular wholesale and special orders when eligible. Shop offers deferred3months before acceptance, latest eligible release explicitly delivered at most once per month. No cash, age, stock or demand injection.',limits:'Deterministic player policy and regression, not an optimal strategy or human feel verdict. Four-cask route is distinct from isolated legacy-fixture special/same-month shipment scenarios. No production/economic changes: audited source SHA256 equals 0.15.1 before and after the run.',sourceSha256,baselineSha256},runs:[],inventory:null,orders:null,summary:null};
for(const seed of seeds){const r=run(seed);result.runs.push(r);fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.error(JSON.stringify({seed,maxCasks:r.maxCasks,cash:r.final.cash,shipments:r.wholesaleShipments,queue:r.maxQueue}));}
result.inventory=inventoryEdges();result.orders=orderEdges();assert.deepEqual(sources(),sourceSha256);result.summary={seeds:result.runs.length,totalMonths:result.runs.length*120,totalClockTicks:result.runs.length*7200,allReachedFourCasks:result.runs.every(r=>r.maxCasks===4),allAccountingAndReplayExact:true,allModelSourcesUnchanged:true,totalProduced:result.runs.reduce((n,r)=>n+r.fills,0),totalAutomaticFills:result.runs.reduce((n,r)=>n+r.automaticFills,0),totalTastingPauses:result.runs.reduce((n,r)=>n+r.tastingPauses,0),totalWholesaleShipments:result.runs.reduce((n,r)=>n+r.wholesaleShipments,0),totalShopDeliveryActions:result.runs.reduce((n,r)=>n+r.shopDeliveries,0),totalSpecialOffers:result.runs.reduce((n,r)=>n+r.specialOffers,0),totalSpecialFulfilled:result.runs.reduce((n,r)=>n+r.specialFulfilled,0),totalMultiShipmentMonths:result.runs.reduce((n,r)=>n+r.multiShipmentMonths,0),maxQueuedJudgments:Math.max(...result.runs.map(r=>r.maxQueue)),finalCashRange:[Math.min(...result.runs.map(r=>r.final.cash)),Math.max(...result.runs.map(r=>r.final.cash))],minimumCash:Math.min(...result.runs.map(r=>r.minCash))};fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary,null,2));
