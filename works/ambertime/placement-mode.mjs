// Opt-in inventory view only. Total physical unsold stock stays on core.products.
export const placementMode=s=>s?.placement?.version===1;
export const storeMarketMode=s=>placementMode(s)&&s?.storeMarket?.version===1;
export const regionalDeliveryMode=s=>s?.regionalDeliveries?.version===1&&s.regionalDeliveries.rules==='regional-delivery/1';
export function placementInventory(s,productId){
 const p=s.core.products.find(p=>p.id===productId),stock=p?.stock??0;
 const held=s.department?.interests?.reduce((n,o)=>n+(o.pendingDelivery?.productId===productId?o.pendingDelivery.count:0),0)??0;
 const retail=placementMode(s)?s.placement.retailByProduct[productId]??0:0;
 if(storeMarketMode(s)){
  const shops=Object.fromEntries((s.alleyBar?.version===1?['town-liquor','supermarket','bar']:['town-liquor','supermarket']).map(id=>[id,s.storeMarket.byShop[id]?.[productId]??0])),assigned=Object.values(shops).reduce((n,x)=>n+x,0);
  if(regionalDeliveryMode(s)){
   const regions={};for(const a of s.regionalDeliveries.allocations)if(a.productId===productId)regions[a.partnerId]=(regions[a.partnerId]??0)+a.count;
   const entrusted={};if(s.regionalConsignment?.version===1&&s.regionalConsignment.rules==='regional-consignment/1')for(const row of s.regionalConsignment.rows)if(row.productId===productId){entrusted[row.partnerId]=(entrusted[row.partnerId]??0)+row.count;regions[row.partnerId]=(regions[row.partnerId]??0)+row.count;}
   const regionalAssigned=Object.values(regions).reduce((n,x)=>n+x,0),total=assigned+regionalAssigned;
   return {stock,held,retail,assigned:total,shops,regions,regionalAssigned,...(s.regionalConsignment?{entrusted}:{}),hand:Math.max(0,stock-held-retail-total),available:Math.max(0,stock-held-total)};
  }
  return {stock,held,retail,assigned,shops,hand:Math.max(0,stock-held-retail-assigned),available:Math.max(0,stock-held-assigned)};
 }
 return {stock,held,retail,hand:Math.max(0,stock-held-retail),available:Math.max(0,stock-held)};
}
