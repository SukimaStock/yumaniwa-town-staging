// Recorded opt-in customer sales. Old procurement receipts are never reinterpreted.
import {regionalDeliveryQuote,regionalDeliveryPartners} from './regional-deliveries.mjs?world=world-network-v01&consignment=night-stage4-v01&perf=v06';
import {planSales} from './market-sales.mjs?v=bar-v01-1';
export const CONSIGNMENT=Object.freeze({version:1,rules:'regional-consignment/1',growthBottles:1200,lanes:Object.freeze(['town-liquor','supermarket','bar'])});
export const consignmentMode=s=>s?.regionalConsignment?.version===1&&s.regionalConsignment.rules===CONSIGNMENT.rules;
const assert=(ok,m)=>{if(!ok)throw Error(m);},round=n=>Math.round(n*100)/100;
export const initialConsignment=s=>({version:1,rules:CONSIGNMENT.rules,startedMonth:s.core.month,settledMonth:s.core.month,serial:0,rows:[],ledgers:{},totalsByPartner:{},totalsByProduct:{},lastSales:[]});
export const consignmentRows=(s,id)=>consignmentMode(s)?s.regionalConsignment.rows.filter(r=>r.partnerId===id).map(r=>({...r})):[];
export const consignmentProductTotals=(s,id)=>consignmentMode(s)?s.regionalConsignment.totalsByProduct[id]??{count:0,revenueCents:0}:{count:0,revenueCents:0};
export const nextConsignmentId=s=>consignmentMode(s)?`regional-consignment:${s.regionalConsignment.serial+1}`:null;
const sorted=ids=>Array.isArray(ids)&&ids.length&&ids.every(id=>typeof id==='string')&&new Set(ids).size===ids.length?ids.slice().sort():null;
export function consignInto(s,v){
 assert(consignmentMode(s),'委託販売への切替記録を確認してください。');
 const ids=sorted(v?.allocationIds);assert(ids,'預ける配分を確認してください。');
 const prior=s.operations.find(o=>o.key==='regional-consign'&&o.value?.consignmentId===v.consignmentId)?.value;
 if(prior){assert(['partnerId','productId','contractId'].every(k=>prior[k]===v[k])&&JSON.stringify(prior.allocationIds)===JSON.stringify(ids),'同じ委託IDの内容が変わっています。');return false;}
 const q=regionalDeliveryQuote(s,v.productId,v.partnerId);
 assert(q.canDeliver&&q.contractId===v.contractId&&v.consignmentId===nextConsignmentId(s),q.deliveryReason||'委託する契約と記録番号を確認してください。');
 const allocations=ids.map(id=>s.regionalDeliveries.allocations.find(a=>a.id===id));
 assert(allocations.every(a=>a&&a.partnerId===v.partnerId&&a.productId===v.productId&&a.contractId===v.contractId),'配分が変更されています。');
 const count=allocations.reduce((n,a)=>n+a.count,0);assert(Number.isSafeInteger(count)&&count>0,'委託本数を確認してください。');
 const st=s.regionalConsignment;let row=st.rows.find(r=>r.partnerId===v.partnerId&&r.productId===v.productId);
 if(row){assert(row.contractId===v.contractId&&Number.isSafeInteger(row.count+count),'委託在庫の契約を確認してください。');row.count+=count;}
 else{const a=allocations[0];st.rows.push({partnerId:a.partnerId,contractId:a.contractId,productId:a.productId,releaseId:a.releaseId,brandId:a.brandId,count});}
 assert(st.rows.length<=24,'委託在庫の商品数を確認してください。');
 s.regionalDeliveries.allocations=s.regionalDeliveries.allocations.filter(a=>!ids.includes(a.id));st.serial++;return true;
}
// Only called on an unpublished monthly draft. Every sale changes stock/cash together.
export function settleConsignmentInto(s){
 if(!consignmentMode(s))return s;
 const st=s.regionalConsignment,month=s.core.month;
 if(st.settledMonth===month)return s;
 assert(month===st.settledMonth+1,'委託販売の対象月が一致しません。');
 st.lastSales=[];
 for(const desk of regionalDeliveryPartners(s)){
  const rows=st.rows.filter(r=>r.partnerId===desk.id),before=st.totalsByPartner[desk.id]?.count??0;
  const multiplier=.5+.5*Math.min(1,before/CONSIGNMENT.growthBottles),order=CONSIGNMENT.lanes.slice(month%3).concat(CONSIGNMENT.lanes.slice(0,month%3));
  for(const laneId of order){
   const items=rows.filter(r=>r.count>0).map(r=>{const p=s.core.products.find(p=>p.id===r.productId);assert(p&&p.stock>=r.count,'委託在庫と商品在庫が一致しません。');const price=regionalDeliveryQuote(s,p.id,desk.id).unitPrice;return {...p,count:r.count,price,referencePrice:laneId==='town-liquor'?16:20};});
   const key=desk.id+':'+laneId,result=planSales(items,laneId,st.ledgers[key]??{},{month,seed:s.seed,multiplier});st.ledgers[key]=result.ledger;
   for(const sale of result.sales){
    const row=rows.find(r=>r.productId===sale.id),p=s.core.products.find(p=>p.id===sale.id),item=items.find(i=>i.id===sale.id),count=sale.count,revenue=round(count*item.price);
    assert(Number.isSafeInteger(count)&&count>0&&count<=row.count&&count<=p.stock,'実売本数が在庫と一致しません。');
    row.count-=count;p.stock-=count;p.sold+=count;p.revenue=round(p.revenue+revenue);s.core.cash=round(s.core.cash+revenue);s.core.totals.bottlesSold+=count;s.core.totals.revenue=round(s.core.totals.revenue+revenue);
    s.core.lastMonth.bottles+=count;s.core.lastMonth.revenue=round(s.core.lastMonth.revenue+revenue);s.core.lastMonth.sales.push({id:p.id,sold:count,revenue,channel:'consignment',shopId:desk.id,laneId});
    for(const [collection,id] of [[st.totalsByPartner,desk.id],[st.totalsByProduct,p.id]]){const t=collection[id]??{count:0,revenueCents:0};collection[id]={count:t.count+count,revenueCents:t.revenueCents+Math.round(revenue*100)};}
    st.lastSales.push({deskId:desk.id,productId:p.id,releaseId:row.releaseId,count,revenue,month,laneId});
   }
  }
 }
 st.rows=st.rows.filter(r=>r.count>0);
 // No completed-product/absent-profile accumulation in the added live state.
 for(const id of Object.keys(st.totalsByProduct))if(!s.core.products.some(p=>String(p.id)===id))delete st.totalsByProduct[id];
 st.settledMonth=month;return s;
}
