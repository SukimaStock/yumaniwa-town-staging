import {SHOPS,SHOP} from './shop-model.mjs?v=0.48-free-aging';
// Disposable view over authoritative receipts. No replay, writes or saved aggregates.
const finite=n=>typeof n==='number'&&Number.isFinite(n)?n:null;
const shopId=row=>row.shopId??SHOP.id; // v12 town-shop receipts have no shopId.
const earliest=rows=>rows.length&&rows.every(n=>finite(n)!==null)?Math.min(...rows):null;
const sum=(rows,key,cents=false)=>rows.every(r=>finite(r[key])!==null)?rows.reduce((n,r)=>n+(cents?Math.round(r[key]*100):r[key]),0)/(cents?100:1):null;
export function buildShopLedger(state,{shops=SHOPS}={}){
 const relations=state.shop?.relations??[],receipts=state.shop?.deliveries;
 const catalog=new Map(shops.map(s=>[s.id,{id:s.id,name:s.name}]));
 // Preserve recorded counterpart IDs even when their catalog entry is unavailable.
 for(const row of [...relations,...(receipts??[])])if(!catalog.has(shopId(row)))catalog.set(shopId(row),{id:shopId(row),name:row.name??shopId(row)});
 return [...catalog.values()].map(shop=>{
  const rs=relations.filter(r=>shopId(r)===shop.id),rows=(receipts??[]).filter(d=>shopId(d)===shop.id&&(finite(d.count)===null||d.count>0));
  const deliveries=rows.map((d,index)=>{
   const adoption=(state.department?.adoptions??[]).find(a=>a.deliveryId!=null&&a.deliveryId===d.id&&shop.id==='department');
   const release=(state.releases??[]).find(r=>d.releaseId!=null?r.id===d.releaseId:r.productId===d.productId);
   const record=!release&&(state.records??[]).find(r=>d.productId!=null&&r.productId===d.productId);
   return {key:d.id??'index:'+index,month:finite(d.month),count:finite(d.count),revenue:finite(d.revenue),releaseKey:release?`release:${release.id}`:record?`legacy:${record.productId}`:null,releaseId:release?.id??null,productId:d.productId??null,kind:adoption?'adoption':'delivery',projectName:adoption?.projectName??null};
  }).sort((a,b)=>(b.month??-1)-(a.month??-1));
  const interests=shop.id==='department'?(state.department?.interests??[]).map(i=>({status:i.pendingDelivery?'pending':'interest',approvedMonth:finite(i.pendingDelivery?.approvedMonth),dueMonth:finite(i.pendingDelivery?.dueMonth)})):[];
  // Consultation relations are not completed handling at the department store.
  const delivered=rows.some(d=>finite(d.count)!==null&&d.count>0),established=shop.id==='department'?delivered:rs.length>0||delivered;
  return {...shop,established,related:rs.length>0,startedMonth:earliest(rs.map(r=>r.startedMonth)),count:Array.isArray(receipts)?sum(rows,'count'):null,revenue:Array.isArray(receipts)?sum(rows,'revenue',true):null,firstMonth:earliest(rows.map(r=>r.month)),lastMonth:rows.length&&rows.every(r=>finite(r.month)!==null)?Math.max(...rows.map(r=>r.month)):null,deliveries,interests};
 });
}
