// One optional buyer of finished, branded bottles. The durable delivery ledger
// is separate from retail sales and does not contribute to brand reputation.
export const SHOP=Object.freeze({version:12,rules:'town-shop',id:'town-liquor',name:'町の酒店',rate:.80,monthlyLimit:10,minRetailSold:40,minSoldReleases:2,minBrandAge:2,offerGap:6,declineGap:12,initialWait:3,maxDeliveries:2048});
export const shopMode=s=>s?.version===SHOP.version&&s.rules===SHOP.rules;
export function deliveryTotals(s,productId){
 let bottles=0,cents=0;
 for(const d of s.shop?.deliveries??[])if(d.productId===productId){bottles+=d.count;cents+=Math.round(d.revenue*100);}
 return {bottles,revenue:cents/100};
}
export function shopBrandStats(s,brandId){
 const relation=s.shop?.relations.find(r=>r.brandId===brandId);if(!relation)return null;
 const history=s.shop.deliveries.filter(d=>d.brandId===brandId);
 return {...relation,bottles:history.reduce((n,d)=>n+d.count,0),revenue:history.reduce((n,d)=>n+Math.round(d.revenue*100),0)/100,history};
}
export function shopEvidence(s,brandId){
 const b=s.brands?.find(b=>b.id===brandId),releases=s.releases?.filter(r=>r.brandId===brandId)??[];
 const sold=releases.reduce((n,r)=>n+r.sold,0),soldReleases=releases.filter(r=>r.sold>0).length,age=b?Math.max(0,s.core.month-b.createdMonth):0;
 return {sold,soldReleases,age,eligible:!!b&&sold>=SHOP.minRetailSold&&soldReleases>=SHOP.minSoldReleases&&age>=SHOP.minBrandAge};
}
