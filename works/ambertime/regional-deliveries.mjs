// Procurement by an accepted regional contact, never observed consumer sales.
import {tradingPartner} from './trading-partners.mjs';
import {regionalContract,regionalPartnerMode} from './regional-partners.mjs';
import {placementInventory,regionalDeliveryMode} from './placement-mode.mjs?v=bar-v01-1&delivery=regional-delivery-v01';
import {salePrices} from './economy.mjs?v=bar-v01-1';
export {regionalDeliveryMode};
export const REGIONAL_DELIVERY=Object.freeze({version:1,rules:'regional-delivery/1',recentLimit:8});
const round=n=>Math.round(n*100)/100,assert=(ok,message)=>{if(!ok)throw Error(message);};
const partnerId='trial-region-desk';
export const initialRegionalDeliveries=s=>({version:1,rules:REGIONAL_DELIVERY.rules,startedMonth:s.core.month,allocationSerial:0,deliverySerial:0,allocations:[],recentReceipts:[],totalsByProduct:{},totalsByPartner:{}});
export function regionalDeliveryPartners(s){
 if(!regionalDeliveryMode(s)||!regionalPartnerMode(s))return [];
 const p=tradingPartner(partnerId),contract=regionalContract(s,partnerId);
 return p&&contract?[{id:p.id,name:p.shortName,fullName:p.name,kind:p.kind,contractId:contract.id,tradeMethod:'regional-delivery'}]:[];
}
export function regionalProductTotals(s,productId){
 const total=regionalDeliveryMode(s)?s.regionalDeliveries.totalsByProduct[productId]:null;
 return {count:total?.count??0,revenue:(total?.revenueCents??0)/100};
}
export function regionalDeliveryRows(s,id){
 if(!regionalDeliveryPartners(s).some(p=>p.id===id))return [];
 const rows=[];
 for(const a of s.regionalDeliveries.allocations.filter(a=>a.partnerId===id)){
  let row=rows.find(r=>r.productId===a.productId);
  if(!row){row={productId:a.productId,releaseId:a.releaseId,brandId:a.brandId,contractId:a.contractId,count:0,allocationIds:[]};rows.push(row);}
  row.count+=a.count;row.allocationIds.push(a.id);
 }
 return rows;
}
export function regionalDeliveryQuote(s,productId,id){
 const partner=tradingPartner(id),contract=regionalContract(s,id),p=s.core.products.find(p=>p.id===productId),r=s.releases.find(r=>r.productId===productId),inv=placementInventory(s,productId);
 const row=regionalDeliveryRows(s,id).find(row=>row.productId===productId),count=row?.count??0,state=s.regionalDeliveries;
 let reason='';
 if(!regionalDeliveryMode(s))reason='地域への納品に対応した記録を確認してください。';
 else if(id!==partnerId||partner?.kind!=='regional-desk'||!contract)reason='この地域との取扱関係を確認してください。';
 else if(!p||!r)reason='手元の酒を選んでください。';
 else if(contract.brandId!==r.brandId)reason='この契約のブランドのお酒を選んでください。';
 else if(p.age<partner.acceptance.minAge)reason=`熟成が${partner.acceptance.minAge}か月未満です。`;
 else if(partner.acceptance.maxRoughness!==null&&p.roughness>partner.acceptance.maxRoughness)reason='この相手の受入条件を確認してください。';
 else if(s.tastingId!==null||s.trade.offer!==null)reason='先に試飲・卸売の申し出を確認します。';
 const deliveryReason=reason||(!count?'配分した瓶を選んでください。':''),reservationReason=reason||(inv.hand<1?'手元の瓶を配分します。':'');
 return {partnerId:id,shopId:id,contractId:contract?.id??null,productId,releaseId:r?.id??null,ok:!reservationReason,reason:reservationReason,canDeliver:!deliveryReason,deliveryReason,available:inv.hand,maxCount:reservationReason?0:inv.hand,assigned:count,unitPrice:p&&partner?round(salePrices(s,productId).standard*partner.price.rate):0,allocationIds:row?.allocationIds??[],nextAllocationId:state?'regional-allocation:'+id+':'+(state.allocationSerial+1):null,nextDeliveryId:state?'regional-delivery:'+id+':'+(state.deliverySerial+1):null};
}
const ordered=ids=>Array.isArray(ids)&&ids.length>0&&ids.every(id=>typeof id==='string')&&new Set(ids).size===ids.length?ids.slice().sort():null;
const sameIds=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
function prior(s,key,id,field){return s.operations.find(o=>o.key===key&&o.value?.[field]===id)?.value??null;}
export function regionalDeliveryReceipt(s,id){
 if(!regionalDeliveryMode(s))return null;
 return s.regionalDeliveries.recentReceipts.find(r=>r.id===id)??s.operations.find(o=>o.key==='regional-deliver'&&o.value?.receipt?.id===id)?.value.receipt??null;
}
export function regionalDeliveryHistory(s,id=partnerId){
 return regionalDeliveryMode(s)?s.operations.filter(o=>o.key==='regional-deliver'&&o.value?.receipt?.partnerId===id).map(o=>structuredClone(o.value.receipt)):[];
}
// Mutate only a private transaction draft. Formal validation/replay owns trust.
export function reserveRegionalInto(s,value){
 const {partnerId:id,productId,contractId,allocationId,count}=value??{},state=s.regionalDeliveries;
 assert(regionalDeliveryMode(s),'地域への納品を有効にしてください。');
 const previous=prior(s,'regional-assign',allocationId,'allocationId');
 if(previous){assert(['partnerId','productId','contractId','count'].every(k=>previous[k]===value[k]),'同じ配分IDの内容が変わっています。');return false;}
 const q=regionalDeliveryQuote(s,productId,id);
 assert(q.ok&&q.contractId===contractId,q.reason||'地域契約を確認してください。');
 assert(allocationId===q.nextAllocationId&&Number.isInteger(count)&&count>=1&&count<=q.maxCount,'配分IDと手元の本数を確認してください。');
 const r=s.releases.find(r=>r.productId===productId);
 state.allocations.push({id:allocationId,partnerId:id,contractId,productId,releaseId:r.id,brandId:r.brandId,count});state.allocationSerial++;return true;
}
function selectedAllocations(s,value){
 const {partnerId:id,contractId,productId,allocationIds}=value??{},ids=ordered(allocationIds),q=regionalDeliveryQuote(s,productId,id);
 assert(ids&&contractId===q.contractId&&regionalContract(s,id),'地域契約と配分を確認してください。');
 const allocations=ids.map(id=>s.regionalDeliveries.allocations.find(a=>a.id===id));
 assert(allocations.every(a=>a&&a.partnerId===value.partnerId&&a.contractId===contractId&&a.productId===productId),'この配分は変更されています。');
 return {q,allocations,count:allocations.reduce((n,a)=>n+a.count,0)};
}
export function returnRegionalInto(s,value){
 assert(regionalDeliveryMode(s),'地域への納品を有効にしてください。');
 const previous=s.operations.find(o=>o.key==='regional-return'&&o.value?.partnerId===value?.partnerId&&o.value.contractId===value?.contractId&&o.value.productId===value?.productId&&sameIds(o.value.allocationIds,value?.allocationIds));
 if(previous)return false;
 selectedAllocations(s,value);s.regionalDeliveries.allocations=s.regionalDeliveries.allocations.filter(a=>!value.allocationIds.includes(a.id));return true;
}
export function deliverRegionalInto(s,value){
 assert(regionalDeliveryMode(s),'地域への納品を有効にしてください。');
 const previous=regionalDeliveryReceipt(s,value?.deliveryId);
 if(previous){assert(previous.partnerId===value.partnerId&&previous.contractId===value.contractId&&previous.productId===value.productId&&sameIds(previous.allocationIds,value.allocationIds),'同じ納品IDの内容が変わっています。');return null;}
 const {q,allocations,count}=selectedAllocations(s,value);
 assert(q.canDeliver&&value.deliveryId===q.nextDeliveryId,q.deliveryReason||'納品IDを確認してください。');
 const p=s.core.products.find(p=>p.id===value.productId),r=s.releases.find(r=>r.productId===value.productId),contract=regionalContract(s,value.partnerId);
 assert(p.stock>=count&&count>=1,'配分した本数を確認してください。');
 const revenue=round(q.unitPrice*count),receipt={id:value.deliveryId,contractId:contract.id,partnerId:value.partnerId,regionId:contract.regionId,brandId:r.brandId,releaseId:r.id,productId:p.id,month:s.core.month,count,unitPrice:q.unitPrice,revenue,customerSales:null,customerRevenue:null,inquiryEventId:contract.eventId,sourceOfferId:contract.sourceOfferId,allocationIds:allocations.map(a=>a.id).sort(),operationIndex:s.operations.length,operationKey:'regional-deliver'};
 s.regionalDeliveries.allocations=s.regionalDeliveries.allocations.filter(a=>!value.allocationIds.includes(a.id));
 p.stock-=count;p.sold+=count;p.revenue=round(p.revenue+revenue);
 s.core.cash=round(s.core.cash+revenue);s.core.totals.revenue=round(s.core.totals.revenue+revenue);s.core.totals.bottlesSold+=count;
 const state=s.regionalDeliveries;state.deliverySerial++;
 for(const [collection,key] of [[state.totalsByProduct,p.id],[state.totalsByPartner,value.partnerId]]){
  const total=collection[key]??{count:0,revenueCents:0};collection[key]={count:total.count+count,revenueCents:total.revenueCents+Math.round(revenue*100)};
 }
 state.recentReceipts.push(receipt);state.recentReceipts=state.recentReceipts.slice(-REGIONAL_DELIVERY.recentLimit);return receipt;
}
