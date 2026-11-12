// Read-only projections of confirmed Shadow facts. No native history reconstruction.
import {remarkFromStoreFacts,ADAPTER_SHOPS} from '../../ambertime-strategy-lab/internal/adapters.mjs?consignment=night-stage4-v01';
import {readRelease,storeRecord} from '../../ambertime-strategy-lab/internal/model.mjs';
const copy=x=>structuredClone(x);
const missing=(reason,identity={})=>({status:'missing',reason,...identity});
const shopOf=r=>r.shopId??'town-liquor';
export function compactRemark(shadow,{shopId,brandId=1}){
 const m=shadow?.reader;
 if(!m||!ADAPTER_SHOPS.includes(shopId)||!m.brandIds?.includes(brandId))throw Error('remark-information-missing');
 const a=m.all[JSON.stringify([shopId,brandId])],r=m.relations.find(r=>shopOf(r)===shopId&&r.brandId===brandId&&r.startedMonth<=m.month);
 const interests=shopId==='department'?m.interests.filter(i=>i.brandId===brandId):[];
 const adoptionCount=shopId==='department'?m.adoptionCounts[brandId]??0:0,last=a?.lastMonth??null;
 return remarkFromStoreFacts({shopId,brandId,month:m.month,related:!!r,startedMonth:r?.startedMonth??null,relationshipMonths:r?m.month-r.startedMonth:0,
 deliveryBottles:a?.bottles??0,deliveryMonthCount:a?.months??0,lastDeliveryMonth:last,gapMonths:last===null?null:m.month-last,
 hasCurrentOffer:m.offers.some(o=>o.shopId===shopId&&o.brandId===brandId),hasUnapprovedInterest:interests.some(i=>!i.pendingDelivery),hasPendingFive:interests.some(i=>i.pendingDelivery?.count===5),hasReceivedFive:adoptionCount>0||!!a?.five,adoptionCount});
}
export function readReleaseFacts(shadow,releaseId){
 const core=shadow?.core,identity=core?.identities?.[releaseId];
 if(!identity)return missing('release-id-unmapped',{releaseId});
 if(!core.wines?.[identity.wineId])return missing('wine-characteristics-missing',{releaseId});
 const r=readRelease(core,releaseId),live=core.releases[releaseId];
 const routes=Object.values(core.stores).filter(s=>s.perRelease[releaseId]).map(s=>({shopId:s.shopId,brandId:s.brandId,confirmedDelivery:copy(s.perRelease[releaseId]),consumerSold:null,consumerCoverage:'per-release-not-recorded'}));
 return {status:'ready',releaseId:r.id,productId:r.productId,wineId:r.wineId,brandId:r.brandId,caskId:r.caskId??null,sourceGeneration:r.sourceGeneration??null,manufacturing:copy(r.manufacturing??null),bottledMonth:r.bottledMonth,age:r.age,profile:copy(r.profile??null),brand:copy(r.brand??null),price:live?.price??r.lastPrice??r.price,bottles:r.bottles,stock:live?.stock??(identity.completed?0:null),listed:live?.listed??identity.listed??null,retail:{count:r.sold,revenue:r.revenue},deliveries:{count:r.delivered??0,revenue:r.deliveryRevenue},consumerSold:r.consumerSold??0,consumerCoverage:routes.length?'observed-only':'no-store-transactions',allocations:copy(live?.allocations??{}),routes};
}
export function readStoreFacts(shadow,shopId,brandId){
 if(!shadow?.core||!shadow?.reader?.brandIds?.includes(brandId)||!ADAPTER_SHOPS.includes(shopId))return missing('store-information-missing',{shopId,brandId});
 const s=storeRecord(shadow.core,shopId,brandId);
 const zero={bottles:0,months:0,firstMonth:null,lastMonth:null,streak:0};
 return {status:'ready',shopId,brandId,startedMonth:s?.startedMonth??null,delivery:copy(s?.delivery??zero),observedSales:copy(s?.sale??zero),unknownSaleReceipts:s?.unknownSaleReceipts??0,customerSalesComplete:!(s?.unknownSaleReceipts),revenue:(s?.revenueCents??0)/100,perRelease:copy(s?.perRelease??{}),gapMonths:s?.delivery.lastMonth==null?null:shadow.core.month-s.delivery.lastMonth,limits:['Per-release customer sales and complete pause/restart history are not retained.']};
}
export function readMemoryFacts(shadow){
 if(!shadow?.reader)return missing('memory-uninitialized');
 return {status:'ready',chosen:copy(shadow.reader.chosen),cooldowns:copy(shadow.reader.cooldowns),coverage:'observed-session-only',limits:['Chosen dialogue is not proof of player reading.','No historical dialogue or recall is regenerated.']};
}
// These are comparison projections, not a replacement for complete native ledger rows.
export function releaseLedgerAggregate(shadow,releaseId){
 const r=readReleaseFacts(shadow,releaseId);if(r.status!=='ready')return r;
 return {status:'ready',value:{releaseId:r.releaseId,productId:r.productId,bottles:r.bottles,stock:r.stock,listed:r.listed,retail:r.retail,deliveries:r.deliveries},limits:['Native coverage and deliveryComplete must be checked separately.','Detailed legacy records remain native.']};
}
export function storeLedgerAggregate(shadow,shopId){
 if(!shadow?.core||!ADAPTER_SHOPS.includes(shopId))return missing('store-information-missing',{shopId});
 const rows=Object.values(shadow.core.stores).filter(s=>s.shopId===shopId),deliveries=rows.filter(s=>s.delivery.bottles>0),starts=rows.map(s=>s.startedMonth).filter(Number.isInteger);
 return {status:'ready',value:{id:shopId,count:rows.reduce((n,s)=>n+s.delivery.bottles,0),revenue:rows.reduce((n,s)=>n+s.revenueCents,0)/100,firstMonth:deliveries.length?Math.min(...deliveries.map(s=>s.delivery.firstMonth)):null,lastMonth:deliveries.length?Math.max(...deliveries.map(s=>s.delivery.lastMonth)):null,startedMonth:starts.length?Math.min(...starts):null},limits:['Distinct transaction months cannot be summed across brands.','Receipt details, adoption projects and current interests remain native.']};
}
