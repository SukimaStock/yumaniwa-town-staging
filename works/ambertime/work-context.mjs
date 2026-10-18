// Display-only identities. A serial may have gaps; it never means a rack slot.
export const caskName=id=>Number.isInteger(id)&&id>0?'樽 #'+id:'樽';
export function releaseNumber(s,productId){
 const r=s.releases?.find(r=>r.productId===productId);if(!r)return null;
 return s.releases.filter(x=>x.brandId===r.brandId).findIndex(x=>x.id===r.id)+1;
}
// Recover pending UI work from saved inventory, without adding save fields.
export function pendingPriceIds(s){
 return s.core.products.filter(p=>p.stock>0&&s.productsById[p.id]?.listed===false).slice().sort((a,b)=>a.bottledMonth-b.bottledMonth||a.id-b.id).map(p=>p.id);
}
