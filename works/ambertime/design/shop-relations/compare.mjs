import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const repo=process.env.AMBER_AUDIT_ROOT??process.cwd(),work=path.join(repo,'works/ambertime'),candidate='/tmp/amber0231-candidate';
const base='f49f26be34e806ca3096436f00d45dfbbd98bfc8',seed=42,horizon=96;
const hash=x=>createHash('sha256').update(x).digest('hex'),sourceHashes=()=>Object.fromEntries(fs.readdirSync(work).filter(x=>x.endsWith('.mjs')).sort().map(x=>[x,hash(fs.readFileSync(path.join(work,x)))]));
const beforeHashes=sourceHashes();fs.mkdirSync(candidate,{recursive:true});for(const file of fs.readdirSync(work).filter(x=>x.endsWith('.mjs')))fs.copyFileSync(path.join(work,file),path.join(candidate,file));
const helper=`function candidateReferral(s,brandId){
 const relation=s.shop.relations.find(r=>r.shopId==='town-liquor'&&r.brandId===brandId);
 const deliveries=s.shop.deliveries.filter(d=>d.shopId==='town-liquor'&&d.brandId===brandId&&d.count>0);
 const elapsed=relation?Math.max(0,s.core.month-relation.startedMonth):0,bottles=deliveries.reduce((n,d)=>n+d.count,0),months=new Set(deliveries.map(d=>d.month)).size;
 const productEligible=s.releases.some(r=>r.brandId===brandId&&s.core.products.some(p=>p.id===r.productId&&p.stock>0&&(bottleStorageMode(s)||s.productsById[p.id]?.listed)&&!shopProductCondition(s,p.id,'supermarket')));
 return {elapsed,bottles,months,productEligible,eligible:!!relation&&elapsed>=6&&bottles>=12&&months>=3&&productEligible};
}
`;
let text=fs.readFileSync(path.join(candidate,'partner-orders.mjs'),'utf8');
const anchor='function maybeStockistOffers(s,evidence=s){';assert(text.includes(anchor));text=text.replace(anchor,helper+anchor);
const start=text.indexOf(anchor),end=text.indexOf('function maybeDepartmentOffer',start);let block=text.slice(start,end);
const condition='shopEvidence(evidence,b.id,store.id).eligible&&brandReputation';assert(block.includes(condition));block=block.replace(condition,"(shopEvidence(evidence,b.id,store.id).eligible||store.id==='supermarket'&&candidateReferral(evidence,b.id).eligible)&&brandReputation");
// Evidence metadata is observational only, never a demand/economic input.
const offerLine="const offer={id:++s.shop.offerSerial,shopId:store.id,name:store.name,brandId:b.id,month:s.core.month};";assert(block.includes(offerLine));block=block.replace(offerLine,offerLine+"if(store.id==='supermarket')offer.auditReferral={originalEligible:shopEvidence(evidence,b.id,store.id).eligible,...candidateReferral(evidence,b.id)};");
text=text.slice(0,start)+block+text.slice(end);fs.writeFileSync(path.join(candidate,'partner-orders.mjs'),text);
const models={A:await import(pathToFileURL(path.join(work,'partner-orders.mjs'))),B:await import(pathToFileURL(path.join(candidate,'partner-orders.mjs')))};
assert.deepEqual(models.A.newStaffExperienceDistillery(seed),models.B.newStaffExperienceDistillery(seed));
const C=(await import(pathToFileURL(path.join(work,'parameters.mjs')))).PARAMETERS;
function familiarity(s){const rel=s.shop.relations.find(r=>r.shopId==='town-liquor'&&r.brandId===1),ds=s.shop.deliveries.filter(d=>d.shopId==='town-liquor'&&d.brandId===1&&d.count>0),elapsed=rel?s.core.month-rel.startedMonth:0,bottles=ds.reduce((n,d)=>n+d.count,0),months=new Set(ds.map(d=>d.month)).size;return {elapsed,bottles,months,familiar:!!rel&&elapsed>=6&&bottles>=12&&months>=3};}
function run(model,config){
 const D=models[model];let s=D.newStaffExperienceDistillery(seed),stopped=null,starts=0,fills=0,firstFamiliar=null,firstOriginalSupermarketEligible=null,firstMatureStock=null;
 const monthly=[],events=[],offers=[],refusals=[],partialTaken=new Set(),seenOffers=new Set();
 function check(){assert(s.core.casks.length<=4);assert(!s.staff.hired&&!s.staffProgression.bottling.hired);assert(Math.abs(s.core.cash-(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep))<1e-6);const bottled=s.releases.reduce((n,r)=>n+r.bottles,0),retail=s.releases.reduce((n,r)=>n+r.sold,0),delivered=s.shop.deliveries.reduce((n,d)=>n+d.count,0),stock=s.core.products.reduce((n,p)=>n+p.stock,0);assert.equal(bottled,retail+delivered+stock);}
 function observe(){
  const f=familiarity(s);if(f.familiar&&firstFamiliar===null)firstFamiliar=s.core.month;
  if(D.shopEvidence(s,1,'supermarket').eligible&&firstOriginalSupermarketEligible===null)firstOriginalSupermarketEligible=s.core.month;
  if(s.core.products.some(p=>p.age>=12&&p.stock>0)&&firstMatureStock===null)firstMatureStock=s.core.month;
  for(const o of [s.shop.offer,...s.shop.pendingOffers].filter(Boolean))if(!seenOffers.has(o.id)){seenOffers.add(o.id);offers.push({id:o.id,shopId:o.shopId,offerMonth:o.month,observedMonth:s.core.month,acceptedMonth:null,familiarity:f,...(o.auditReferral?{referral:o.auditReferral}:{})});}
 }
 function handle(){
  observe();if(s.decisions.length){stopped={month:s.core.month,reason:s.decisions[0].eventId};return false;}
  if(s.trade.offer)s=D.declineOffer(s);
  while(s.shop.offer){const o=s.shop.offer,record=offers.find(x=>x.id===o.id);if(o.shopId==='department'){s=D.declineShop(s,o.shopId,o.id);record.declinedMonth=s.core.month;}else{s=D.acceptShop(s,o.shopId,o.id);record.acceptedMonth=s.core.month;}}
  for(const o of D.staffOpportunities(s))s=D.noticeStaffOpportunity(s,o.kind);
  return true;
 }
 function policy(){
  if(!handle())return false;
  for(const c of [...s.core.casks]){
   let count=null;if(config.partial&&c.age>=6&&!partialTaken.has(c.id))count=10;else if(c.age>=config.age)count=D.quote(s,c.id).count;
   if(count!==null){if(s.core.cash<count*3){stopped={month:s.core.month,reason:'bottling-funds'};return false;}s=D.bottleBranded(s,c.id,{},count);const pid=s.result.productId;events.push({month:s.core.month,kind:'bottle',age:c.age,count,productId:pid});s=D.listBottles(D.setSalePrice(s,'standard',pid),pid);if(config.partial)partialTaken.add(c.id);}
  }
  check();return handle();
 }
 for(let m=0;m<horizon;m++){
  assert.equal(s.core.month,m);if(!policy())break;
  if(m%(12/config.perYear)===0){const q=D.canStart(s);if(q.ok){s=D.startDistillation(s);starts++;}else refusals.push({month:m,reason:q.reason,cash:s.core.cash});}
  for(let step=0;step<60&&s.still.phase==='distilling';step++){s=D.distillStep(s);if(s.still.distillation.progress>=99){s=D.fillBarrel(D.stopDistillation(s),'refill');fills++;if(!policy())break;}}
  if(stopped)break;
  const before=s;s=D.tickDistillery(s);if(s.core.month!==m+1){stopped={month:m,reason:s.decisions[0]?.eventId??'clock-stalled'};break;}
  // Use previous settled evidence with next month's calendar, exactly as monthly offer generation does.
  const evidence={...before,core:{...before.core,month:s.core.month}};
  observe();for(const o of offers.filter(o=>o.observedMonth===s.core.month)){o.originalEligibleAtOffer=D.shopEvidence(evidence,1,o.shopId).eligible;o.familiarityAtEvidence=familiarity(evidence);}
  for(const sale of s.core.lastMonth.sales.filter(x=>x.sold>0)){const p=s.core.products.find(p=>p.id===sale.id);assert(p.bottledMonth<s.core.month);assert(s.productsById[p.id].listedMonth<s.core.month);}
  check();monthly.push({month:s.core.month,cash:s.core.cash,stock:s.core.products.reduce((n,p)=>n+p.stock,0),casks:s.core.casks.length,retail:s.releases.reduce((n,r)=>n+r.sold,0),shipments:s.shop.deliveries.reduce((n,d)=>n+d.count,0),liquor:s.shop.deliveries.filter(d=>d.shopId==='town-liquor').reduce((n,d)=>n+d.count,0),supermarket:s.shop.deliveries.filter(d=>d.shopId==='supermarket').reduce((n,d)=>n+d.count,0),familiarity:familiarity(s),originalSupermarketEligible:D.shopEvidence(s,1,'supermarket').eligible,orders:s.shopDemand.lastOrders.map(({shopId,requested,shipped,unmet})=>({shopId,requested,shipped,unmet}))});
 }
 if(!stopped)policy();check();const serial=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(serial)),serial);
 const deliveries=s.shop.deliveries.map(d=>({...d})),liquor=deliveries.filter(d=>d.shopId==='town-liquor');
 return {model,config,completedMonths:s.core.month,starts,fills,stopped,firstFamiliar,firstOriginalSupermarketEligible,firstMatureStock,offers,refusals,deliveries,positiveLiquorMonths:new Set(liquor.map(d=>d.month)).size,firstPositiveLiquor:liquor[0]??null,firstThreePositiveDeliveryMonths:monthly.find(m=>m.familiarity.months>=3)??null,finalCash:s.core.cash,retail:s.releases.reduce((n,r)=>n+r.sold,0),shipped:deliveries.reduce((n,d)=>n+d.count,0),stock:s.core.products.reduce((n,p)=>n+p.stock,0),stockoutMonths:monthly.filter(m=>m.stock===0).length,events,monthly,stateSha256:hash(serial)};
}
const pairs=[];for(const perYear of [1,2,4])for(const [age,partial] of [[6,false],[12,false],[12,true]]){
 const config={perYear,age,partial},A=run('A',config),B=run('B',config),offer=s=>s.offers.find(o=>o.shopId==='supermarket')?.offerMonth??null;
 const pair={config,A,B,difference:{supermarketOfferA:offer(A),supermarketOfferB:offer(B),referralOnlyOffers:B.offers.filter(o=>o.shopId==='supermarket'&&o.referral&&!o.referral.originalEligible).length,cash:B.finalCash-A.finalCash,retail:B.retail-A.retail,shipped:B.shipped-A.shipped,stockoutMonths:B.stockoutMonths-A.stockoutMonths}};pairs.push(pair);console.log(JSON.stringify({config,difference:pair.difference,familiarA:A.firstFamiliar,familiarB:B.firstFamiliar,positiveLiquorMonths:A.positiveLiquorMonths,stopped:[A.stopped,B.stopped]}));
}
function factualPrefix(run,month){
 const relation=run.offers.find(o=>o.shopId==='town-liquor'&&o.acceptedMonth!==null),records=run.deliveries.filter(d=>d.shopId==='town-liquor'&&d.brandId===1&&d.count>0&&d.month<=month),bottles=records.reduce((n,d)=>n+d.count,0),distinctMonths=new Set(records.map(d=>d.month)).size,elapsed=relation?month-relation.acceptedMonth:0;
 return {config:run.config,throughMonth:month,relationStart:relation?.acceptedMonth??null,elapsed,bottles,distinctMonths,familiar:!!relation&&elapsed>=6&&bottles>=12&&distinctMonths>=3,records};
}
const allBOffers=pairs.flatMap(p=>p.B.offers.filter(o=>o.shopId==='supermarket'));
const facts={familiarDetections:pairs.filter(p=>p.B.firstFamiliar!==null).length,existingRouteSupermarketOffers:allBOffers.filter(o=>o.referral.originalEligible).length,referralOnlyOffers:allBOffers.filter(o=>!o.referral.originalEligible&&o.referral.eligible).length,overlapAtOfferEvidence:allBOffers.filter(o=>o.referral.originalEligible&&o.referral.eligible).length,identicalEconomicPairs:pairs.filter(p=>['cash','retail','shipped','stockoutMonths'].every(k=>p.difference[k]===0)).length,noMatureStockCases:pairs.filter(p=>p.A.firstMatureStock===null).length};
const focusedEvidence={smallSparseOngoing:factualPrefix(pairs[0].A,34),singleBulkObserved:factualPrefix(pairs[1].A,28),thirdPositiveMonth:factualPrefix(pairs[1].A,39),oneMonth12Infeasible:{configuredLiquorMonthlyCap:10,observedMaxMonthlyShipment:Math.max(...pairs.flatMap(p=>p.A.monthly.map(m=>m.liquor-(p.A.monthly.find(x=>x.month===m.month-1)?.liquor??0)))),reason:'A12-bottle single-month liquor delivery cannot occur under the existing10-bottle monthlycap. No fictitious bulk fixture was injected.'}};
const repeatedA=run('A',pairs[0].config),repeatedB=run('B',pairs[0].config);assert.deepEqual(repeatedA,pairs[0].A);assert.deepEqual(repeatedB,pairs[0].B);
assert.equal(focusedEvidence.singleBulkObserved.familiar,false);assert.equal(focusedEvidence.singleBulkObserved.distinctMonths,1);
assert.equal(focusedEvidence.smallSparseOngoing.bottles,12);assert.equal(focusedEvidence.smallSparseOngoing.distinctMonths,4);assert.equal(focusedEvidence.smallSparseOngoing.familiar,true);
assert.equal(focusedEvidence.thirdPositiveMonth.bottles,12);assert.equal(focusedEvidence.thirdPositiveMonth.distinctMonths,3);
const idleBefore=pairs[0].A.monthly.find(m=>m.month===23),idleAfter=pairs[0].A.monthly.find(m=>m.month===24);
assert.equal(idleBefore.familiarity.months,idleAfter.familiarity.months);assert.equal(idleBefore.familiarity.bottles,idleAfter.familiarity.bottles);
focusedEvidence.noDeliveryMonth={beforeMonth:23,afterMonth:24,before:idleBefore.familiarity,after:idleAfter.familiarity};
for(const prefix of [focusedEvidence.singleBulkObserved,focusedEvidence.smallSparseOngoing,focusedEvidence.thirdPositiveMonth]){assert.equal(prefix.distinctMonths,new Set(prefix.records.map(d=>d.month)).size);assert(prefix.records.every(d=>d.count>0&&d.brandId===1&&d.shopId==='town-liquor'&&d.month<=prefix.throughMonth));}
const stats=pairs.map(p=>({config:p.config,liquorOfferA:p.A.offers.find(o=>o.shopId==='town-liquor')?.offerMonth??null,liquorAcceptedA:p.A.offers.find(o=>o.shopId==='town-liquor')?.acceptedMonth??null,supermarketOfferA:p.difference.supermarketOfferA,supermarketOfferB:p.difference.supermarketOfferB,supermarketAcceptedA:p.A.offers.find(o=>o.shopId==='supermarket')?.acceptedMonth??null,supermarketAcceptedB:p.B.offers.find(o=>o.shopId==='supermarket')?.acceptedMonth??null,firstFamiliar:p.A.firstFamiliar,firstOriginalEligible:p.A.firstOriginalSupermarketEligible,referralOnlyOffers:p.difference.referralOnlyOffers,overlapAtPreSnapshot:p.B.offers.filter(o=>o.shopId==='supermarket'&&o.referral.originalEligible&&o.referral.eligible).length,cashDifference:p.difference.cash,shipmentDifference:p.difference.shipped}));
const changedCandidateModules=Object.keys(beforeHashes).filter(file=>hash(fs.readFileSync(path.join(candidate,file)))!==beforeHashes[file]);assert.deepEqual(changedCandidateModules,['partner-orders.mjs']);
assert.deepEqual(sourceHashes(),beforeHashes);const results={base,seed,horizon,method:{model:'A=newStaffExperienceDistillery;B=temporary flat-module copy with minimal OR supermarket evidence patch. No player storage or state injection.',recipe:'Manual99=39.77L refill,60steps/month; scheduled starts0then12/perYear; full6/full12 or10at6/remainder12.',policy:'Standard retail immediate list, approve liquor/supermarket normal offers, decline department, acknowledge staff notices without hires. Real costs/evaporation/four-cask reserves and next-month sales retained. Stop96 or genuine blockingdecision.',candidate:'Only bypass80retail/3soldreleases supermarket evidence when samebrand liquor relation elapsed>=6 and actualpositive delivery>=12 across>=3distinct months; stocked12month product check and reputation/cooldown/queue unchanged. No new demand formula.',limits:'Single seed and deterministic9policies; counters and economic differences do not establish enjoyment. Liquor monthlycap10 makes a one-month12-bottle shipment impossible.'},sourceSha256:beforeHashes,candidateSha256:hash(text),candidatePatchHelper:helper,changedCandidateModules,facts,stats,focusedEvidence,pairs,checks:{sourceUnchanged:true,sameInitialState:true,stockAndCash:true,strictReplayBothModels:true,nextMonthSales:true,repeatedFirstPair:true,actualPrefixFacts:true}};const out=process.env.AMBER_AUDIT_OUTPUT??new URL('./results.json',import.meta.url);if(process.argv.includes('--check')){const saved=JSON.parse(fs.readFileSync(out,'utf8'));assert.deepEqual(saved,results);console.log('9paired comparisons reproduced exactly.');}else fs.writeFileSync(out,JSON.stringify(results,null,2)+'\n');
