// Opt-in inventory view only. Total physical unsold stock stays on core.products.
export const placementMode=s=>s?.placement?.version===1;
export function placementInventory(s,productId){
 const p=s.core.products.find(p=>p.id===productId),stock=p?.stock??0;
 const held=s.department?.interests?.reduce((n,o)=>n+(o.pendingDelivery?.productId===productId?o.pendingDelivery.count:0),0)??0;
 const retail=placementMode(s)?s.placement.retailByProduct[productId]??0:0;
 return {stock,held,retail,hand:Math.max(0,stock-held-retail),available:Math.max(0,stock-held)};
}
