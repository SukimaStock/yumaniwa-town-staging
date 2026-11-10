// Stage6C research. Native careers use only public formal operations. Price
// counterfactuals are separate, never written to the game or replayed as facts.
import * as D from '../ambertime/partner-orders.mjs?world=world-network-v01';
import {naturalWorldCraftFixture} from '../ambertime/tests/world-network-helpers.mjs';
import {affinity,acceptance,VENUES} from '../ambertime/market-sales.mjs';
import {townAffinity} from '../ambertime/town-connection.mjs?world=world-network-v01';
import {worldContact} from '../ambertime/world-network.mjs?v=world-network-v01';
import {tradingPartner} from '../ambertime/trading-partners.mjs?world=world-network-v01';
import {mapSceneryProjection} from '../ambertime/map-scenery.mjs?world=world-network-v01';
import {MAP_SCENERY_RULES} from '../ambertime/map-scenery.mjs?world=world-network-v01';
import {ECONOMY_PARAMETERS as C} from '../ambertime/economy-parameters.mjs';
import {MAX_FORMAL_CODE_UNITS,MAX_SESSION_CODE_UNITS} from '../ambertime/save-codec.mjs';
export const WORLD_POLICIES=Object.freeze([
 {id:'local',label:'地元集中'}, {id:'distributed',label:'分散'},
 {id:'continuous',label:'少量継続'}, {id:'distant',label:'遠方重視'}, {id:'mixed',label:'混合'}
].map(Object.freeze));
export const WORLD_LAB_LIMITS=Object.freeze({casks:4,releases:512,operations:12000,nativeReceipts:2048,rawCodeUnits:MAX_FORMAL_CODE_UNITS,sessionCodeUnits:MAX_SESSION_CODE_UNITS});
const clone=x=>structuredClone(x),round=n=>Math.round(n*100)/100;
const localIds=['bar','town-liquor','supermarket'],farIds=['overseas-import-desk','national-specialist-desk','trial-region-desk'];
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n.toString(16).padStart(8,'0');};
const bytes=text=>new TextEncoder().encode(text).length;
export function worldOpening(seed=27,{untilOffer=true}={}){
 // Shared lawful fixture factory performs brewing, sales, unchanged rumor RNG.
 // It injects no stock/cash/events/contracts. No Node APIs in this dependency.
 return naturalWorldCraftFixture(seed,{D,untilOffer,hand:5});
}
function sceneFacts(s){return [3,4,5,6].flatMap(stage=>mapSceneryProjection(s,stage).partners.map(p=>({id:p.id,stage,box:p.box,flowerStage:p.flowerStage,butterfly:p.butterfly,activity:p.activity})));}
export function worldCareerMetrics(s){
 const raw=JSON.stringify(s),town=s.labConnection.town;
 const inventory=s.core.products.reduce((a,p)=>{const x=D.storeMarketInventory(s,p.id);a.hand+=x.hand;a.retail+=x.retail;a.assigned+=x.assigned;a.held+=x.held;a.stock+=p.stock;return a;},{hand:0,retail:0,assigned:0,held:0,stock:0});
 const contracts=s.regionalPartners.contracts.map(c=>({id:c.id,partnerId:c.partnerId,brandId:c.brandId,startedMonth:c.startedMonth}));
 const delivered=Object.entries(s.regionalDeliveries.totalsByPartner).map(([partnerId,n])=>({partnerId,count:n.count,revenue:n.revenueCents/100,customerSales:null}));
 return {month:s.core.month,paidBottles:s.core.totals.bottlesSold,observedNativeCustomerSales:s.shop.deliveries.filter(r=>(r.shopId??'town-liquor')!=='department'&&r.month>s.storeMarket.startedMonth).reduce((n,r)=>n+r.count,0),nativeMonthlyOpportunities:VENUES.filter(v=>localIds.includes(v.id)).map(v=>({id:v.id,opportunities:v.opportunities})),cash:s.core.cash,revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep,inventory,contracts,delivered,nativeContractIds:[...new Set(s.shop.relations.map(r=>r.shopId??'town-liquor'))],nativeReceipts:s.shop.deliveries.length,operations:s.operations.length,releases:s.releases.length,casks:s.core.casks.length,generation:s.generations.active.id,generationHandovers:s.generations.completed.length,rawCodeUnits:raw.length,rawBytes:bytes(raw),town:{events:town.events.length,shipments:town.shipments.length,packets:town.packets.length,pending:town.pending.length,attempts:town.attempts.length,reached:[...new Set(town.arrivals.filter(e=>e.type==='arrival'&&e.channel!=='direct').map(e=>e.to))],inquiries:town.events.filter(e=>e.type==='inquiry').length,contacts:[...new Set(town.events.filter(e=>e.type==='inquiry').map(e=>e.to))]},scenery:sceneFacts(s)};
}
export function runNativeWorldPolicy(initial,{policy='mixed',months=120,production='balanced',intervalMonths=12,localFocus='town-liquor',continuousFocus='bar',temporaryRefusal='wait',checkpointEvery=120,onCheckpoint=()=>{},retainState=false}={}){
 if(!WORLD_POLICIES.some(p=>p.id===policy)||!Number.isSafeInteger(months)||months<1||months>1200)throw Error('Invalid native world comparison');
 if(!['wait','stop'].includes(temporaryRefusal))throw Error('Invalid refusal behavior');
 if(![12,48].includes(intervalMonths)||!localIds.includes(localFocus)||!localIds.includes(continuousFocus))throw Error('Invalid production interval or local focus');
 if(!['balanced','craft','grain'].includes(production))throw Error('Invalid production scenario');
 let fills=0;
 let s=clone(initial),lastStep='start',stop=null,nextFill=s.core.month,peakCasks=s.core.casks.length;
 const waiting=new Map(),noteWaiting=(step,reason)=>{const key=step+':'+reason,prior=waiting.get(key);waiting.set(key,{step,reason,count:(prior?.count??0)+1,firstMonth:prior?.firstMonth??s.core.month,lastMonth:s.core.month});};
 const start=worldCareerMetrics(s),initialRaw=JSON.stringify(s),target=s.core.month+months,checkpoints=[];
 const targets=new Map(s.core.casks.map(c=>[c.id,c.filledMonth+24]));
 function step(label,fn){lastStep=label;const next=fn(s),raw=JSON.stringify(next);if(raw.length>=WORLD_LAB_LIMITS.rawCodeUnits)throw Object.assign(Error('Formal raw save capacity reached'),{limit:'rawCodeUnits',candidateCodeUnits:raw.length,candidateBytes:bytes(raw)});s=next;peakCasks=Math.max(peakCasks,s.core.casks.length);if(peakCasks>4)throw Error('Cask conservation failed');}
 function resolve(){
  for(let guard=0;guard<60;guard++){
   if(s.decisions.length){const d=s.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');if(!o)throw Error('Unresolved recovery '+d.eventId);step('decision',s=>D.chooseDistillery(s,d.caskId,o.id));continue;}
   if(s.trade.offer){step('decline-unrelated-wholesale',D.declineOffer);continue;}
   if(s.shop.offer){const o=s.shop.offer;step('native-offer',s=>o.shopId==='department'?D.declineShop(s,o.shopId,o.id):D.acceptShop(s,o.shopId,o.id));continue;}
   const offer=D.regionalOffers(s)[0];if(offer){step('regional-contract',s=>D.acceptRegionalOffer(s,offer.partnerId,offer.id));continue;}
   const generation=D.generationStatus(s);if(generation.needsNotice){step('generation-notice',s=>D.noticeGeneration(s,generation.id));continue;}
   if(generation.phase==='review'){step('generation-handover',s=>D.handoverGeneration(s,generation.id));continue;}
   return;
  }
  throw Error('Decision guard reached');
 }
 function fill(){
  const plain=production==='grain'||production==='balanced'&&fills%2===0,type=plain?'refill':'bourbon',allowed=D.canStart(s),minimum=allowed.minimum+C.casks[type].cost-Math.min(...Object.values(C.casks).map(c=>c.cost));
  if(temporaryRefusal==='wait'&&(!allowed.ok||s.core.cash<minimum)){noteWaiting('distill-start',allowed.reason||`次の樽と瓶詰め費用に £${minimum} 必要です。`);return false;}
  step('flavor',s=>D.selectFlavorCards(s,{malt:plain?'plain':'peat',ferment:'short'}));
  step('distill-start',plain?D.startDistillation:D.startRangeDistillation);
  const first=plain?45:25,last=plain?65:40;
  while(s.still.distillation.progress<first)step('distill-step',D.distillStep);step('collection-start',D.beginCollection);
  while(s.still.distillation.progress<last)step('distill-step',D.distillStep);step('distill-stop',D.stopDistillation);step('cask-fill',s=>D.fillBarrel(s,plain?'refill':'bourbon'));
  const c=s.core.casks.at(-1);targets.set(c.id,s.core.month+(plain?12:24));nextFill=s.core.month+intervalMonths;fills++;
 }
 function quote(id,pid){return farIds.includes(id)?D.regionalDeliveryQuote(s,pid,id):D.storeMarketQuote(s,pid,id);}
 function available(pid){return [...localIds,...farIds].filter(id=>quote(id,pid).ok);}
 function allocate(id,pid,count){const q=quote(id,pid);count=Math.min(count,q.maxCount);if(count<1||!q.ok)return;
  if(farIds.includes(id)){step('regional-reserve',s=>D.assignRegionalProduct(s,{partnerId:id,productId:pid,count,contractId:q.contractId,allocationId:q.nextAllocationId}));const d=D.regionalDeliveryQuote(s,pid,id);step('regional-delivery',s=>D.deliverRegionalProduct(s,{partnerId:id,productId:pid,contractId:d.contractId,allocationIds:d.allocationIds,deliveryId:d.nextDeliveryId}));}
  else step('native-allocation',s=>D.assignStoreProduct(s,{shopId:id,productId:pid,count}));
 }
 function distribute(){
  for(const product of s.core.products){const pid=product.id,hand=D.storeMarketInventory(s,pid).hand;if(!hand)continue;const ids=available(pid),local=localIds.filter(id=>ids.includes(id)),far=farIds.filter(id=>ids.includes(id));
   if(policy==='continuous'){const focus=local.includes(continuousFocus)?continuousFocus:local[0];if(focus){allocate(focus,pid,1);return;}continue;}
   if(policy==='local'){const focus=local.includes(localFocus)?localFocus:local[0];if(focus)allocate(focus,pid,hand);}
   if(policy==='distant'){if(far.length)allocate(far[0],pid,hand);}
   if(policy==='distributed'){for(let i=0;i<ids.length;i++)allocate(ids[i],pid,Math.ceil(D.storeMarketInventory(s,pid).hand/(ids.length-i)));}
   if(policy==='mixed'){if(local.length)allocate(local[0],pid,Math.ceil(hand/2));if(far.length)allocate(far[0],pid,D.storeMarketInventory(s,pid).hand);}
  }
 }
 while(s.core.month<target){try{
  resolve();for(const c of [...s.core.casks])if(s.core.month>=(targets.get(c.id)??c.filledMonth+24)){const q=D.quote(s,c.id);if(temporaryRefusal==='wait'&&(s.core.products.filter(p=>p.stock>0).length>=8||s.core.cash<q.cost)){noteWaiting('bottle','販売または瓶詰め資金を待ちます。');continue;}step('bottle',s=>D.bottleBranded(s,c.id,{brandId:1}));targets.delete(c.id);}
  const g=D.generationStatus(s);if((g.phase==='last-batch'||s.core.month>=nextFill)&&s.still.phase==='ready'&&s.core.casks.length<4)fill();
  resolve();distribute();const previous=s.core.month;step('month',D.tickDistillery);if(s.core.month!==previous+1)throw Error('Month did not advance');
  if((s.core.month-start.month)%checkpointEvery===0){const point=worldCareerMetrics(s);checkpoints.push(point);onCheckpoint(s,point);}
 }catch(e){stop={month:s.core.month,step:lastStep,message:String(e.message),limit:e.limit??null,candidateCodeUnits:e.candidateCodeUnits??null,candidateBytes:e.candidateBytes??null};break;}}
 const final=worldCareerMetrics(s),restoreStart=performance.now();let coldRestore;
 try{const raw=D.serializeDistillery(s),cold=D.restoreDistillery(raw);coldRestore={ok:D.serializeDistillery(cold)===raw,milliseconds:round(performance.now()-restoreStart)};}catch(e){coldRestore={ok:false,error:e.message,milliseconds:round(performance.now()-restoreStart)};}
 const result={policy,production,intervalMonths,localFocus,continuousFocus,temporaryRefusal,productionBudget:temporaryRefusal==='wait'?'canonical-start-minimum-plus-selected-cask-premium':'fixed-attempt-no-preflight',waiting:[...waiting.values()],label:WORLD_POLICIES.find(p=>p.id===policy).label,seed:s.seed,startMonth:start.month,targetMonth:target,completedMonths:s.core.month-start.month,initialFingerprint:hash(initialRaw),initialCodeUnits:initialRaw.length,completed:s.core.month===target,stop,peakCasks,start,final,delta:{cash:round(final.cash-start.cash),revenue:round(final.revenue-start.revenue),costs:round(final.costs-start.costs),upkeep:round(final.upkeep-start.upkeep),nativeReceipts:final.nativeReceipts-start.nativeReceipts,inquiries:final.town.inquiries-start.town.inquiries},checkpoints,coldRestore,priceContext:nativePriceContext(s)};
 if(retainState)result.state=s;return result;
}
export function runWorldStrategyComparison({seed=27,months=120,production='balanced',intervalMonths=12,localFocus='town-liquor',continuousFocus='bar',temporaryRefusal='wait',initial=worldOpening(seed)}={}){
 const rows=WORLD_POLICIES.map(({id})=>runNativeWorldPolicy(initial,{policy:id,months,production,intervalMonths,localFocus,continuousFocus,temporaryRefusal}));
 return {seed,months,production,intervalMonths,localFocus,continuousFocus,temporaryRefusal,initialFingerprint:hash(JSON.stringify(initial)),rows,interpretation:'Same lawful native checkpoint, declared production schedule, selected-cask budget preflight and temporary-refusal waiting policy; allocations alone differ. No contract is forced. Waiting is not bankruptcy or game over; stops report the actual public refusal or policy limitation.'};
}
// Explicit counterfactual, not a native quote. Geography is deliberately absent.
export function candidatePremium({fit,quantity,tradeMonths,demand,available}){
 const qualified=fit>=.7&&quantity>=6&&tradeMonths>=3&&demand>0&&available>0;
 return qualified?round(1+Math.min(.24,.08*fit+.08*Math.min(tradeMonths/12,1)+.08*Math.min(demand/available,1))):1;
}
export function runPriceCounterfactual(){
 const profiles=[{id:'smoky',p:{age:24,roughness:.2,character:.8,wood:.3,flavor:{profile:{grain:.1,fruit:.1,smoke:.5,body:.3}}}},{id:'grain',p:{age:24,roughness:.2,character:.5,wood:.3,flavor:{profile:{grain:.6,fruit:.3,smoke:.05,body:.05}}}}];
 const cases=[];
 for(const {id,p} of profiles)for(const venue of ['bar','town-liquor','supermarket','national-specialist-desk','overseas-import-desk'])for(const stock of [6,54])for(const months of [3,12]){
  const partner=tradingPartner(venue),local=VENUES.some(v=>v.id===venue),fit=local?affinity(venue,p):townAffinity(worldContact(venue).nodeId,p).fit,evidence={fit,quantity:24,tradeMonths:12,demand:6,available:stock},premium=candidatePremium(evidence),base=20*partner.price.rate,opportunities=local?VENUES.find(v=>v.id===venue).opportunities:null;
  const offers=[1,premium,1.5,2].filter((x,i,a)=>a.indexOf(x)===i).map(multiplier=>{
   const price=base*multiplier,baseAcceptance=local?acceptance(venue,{...p,price:base,referencePrice:base}):Math.min(1,.2+.7*fit);
   // New elasticity is a hypothesis only. It expresses a finite willingness to
   // accept a premium; it is NOT inferred from geography or fitted to native RNG.
   const acceptanceRate=Math.min(1,baseAcceptance*Math.exp(-(1.4+(1-fit)*2)*Math.max(0,multiplier-1)**2));
   const demand=local?opportunities*months*acceptanceRate:stock*acceptanceRate,sold=Math.min(stock,demand);
   return {multiplier,unitPrice:round(price),expectedSold:round(sold),expectedCustomerSales:local?round(sold):null,expectedProcurement:local?null:round(sold),expectedUnsold:round(stock-sold),expectedRevenue:round(sold*price),assumedUnitCost:8,expectedContribution:round(sold*(price-8)),acceptance:round(acceptanceRate)};
  });
  cases.push({profile:id,venue,partnerName:partner.name,quantityMeaning:local?'expected-customer-purchases':'expected-buyer-acceptance-not-customer-sales',standardBase:20,canonicalRate:partner.price.rate,stock,months,fit:round(fit),evidenceSource:'Explicit synthetic scenario:24bottles/12trade-months/6demand units, not native contract or demand observations',evidence,premium,offers});
 }
 return {kind:'counterfactual-price-only',adoption:'hold',reason:'価格による引受率の変化は未検証です。窓口への納品代金と店頭の顧客販売は経済上の性質が異なるため、この比較だけで共通のプレミア価格は採用しません。',cases,formalPricesChanged:false,demandEvidence:'需要6本は実験用の仮定です。正式契約や問い合わせから顧客の需要本数や支払意思は観測できません。地域の候補は一度の仕入れ提案の引受率で、月間販売機会を納品上限に読み替えていません。',sceneryRules:MAP_SCENERY_RULES};
}

// Real observations for judging whether the price hypothesis even qualifies.
// A contract is not a new order. Far desks have no observed consumer sales.
export function nativePriceContext(s){
 const product=s.core.products.filter(p=>p.stock>0).at(-1)??s.core.products.at(-1),release=s.releases.find(r=>r.productId===product?.id);if(!product||!release)return [];
 const current=s.core.month,brandId=release.brandId,inventory=D.storeMarketInventory(s,product.id);
 return [...localIds,...farIds].map(partnerId=>{
  const far=farIds.includes(partnerId),rows=far?D.regionalDeliveryHistory(s,partnerId).filter(r=>r.brandId===brandId):s.shop.deliveries.filter(r=>(r.shopId??'town-liquor')===partnerId&&r.brandId===brandId);
  const sales=far?null:rows.filter(r=>r.month>s.storeMarket.startedMonth),pending=D.regionalOffers(s).filter(o=>o.partnerId===partnerId&&o.brandId===brandId),nativePending=[s.shop.offer,...s.shop.pendingOffers].filter(o=>o?.shopId===partnerId&&o.brandId===brandId);
  const recent=sales?.filter(r=>r.month>=current-2)??[],demand=far?pending.length:recent.reduce((n,r)=>n+r.count,0)+nativePending.length;
  const quantity=rows.reduce((n,r)=>n+r.count,0),tradeMonths=new Set(rows.map(r=>r.month)).size,fit=far?townAffinity(worldContact(partnerId).nodeId,release).fit:affinity(partnerId,product),quote=far?D.regionalDeliveryQuote(s,product.id,partnerId):D.storeMarketQuote(s,product.id,partnerId);
  return {partnerId,partnerName:tradingPartner(partnerId).name,brandId,productId:product.id,releaseId:release.id,contractIds:far?s.regionalPartners.contracts.filter(c=>c.partnerId===partnerId&&c.brandId===brandId).map(c=>c.id):s.shop.relations.filter(c=>c.shopId===partnerId&&c.brandId===brandId).map(c=>({shopId:partnerId,brandId,startedMonth:c.startedMonth})),pendingOfferIds:[...pending,...nativePending].map(o=>o.id),pendingInquiryEventIds:pending.map(o=>o.eventId),confirmedQuantity:quantity,delivered:far?quantity:rows.filter(r=>r.month<=s.storeMarket.startedMonth).reduce((n,r)=>n+r.count,0),observedCustomerSales:far?null:sales.reduce((n,r)=>n+r.count,0),tradeMonths,availableStock:product.stock,handAvailable:inventory.hand,fit:round(fit),demand:{units:demand,source:far?'actual-pending-inquiry-offer-count':'actual-last-three-month-customer-purchases-plus-pending-offers',receiptIds:recent.map(r=>r.id),contractAloneAddsDemand:false},canonicalQuote:{unitPrice:quote.unitPrice,ok:quote.ok,reason:quote.reason},candidateMultiplier:candidatePremium({fit,quantity,tradeMonths,demand,available:product.stock}),formalPriceChanged:false};
 });
}
