// Releases are the durable retail ledger. Products and completion records are
// mirrors that may be pruned, so never add them to these totals.
export const REPUTATION = Object.freeze({maxBonus:0.15,bottleScale:300,releaseScale:4,releaseBottles:30});
export function releaseStats(releases){
 const totals={releases:releases.length,sold:0,soldOut:0,revenue:0,stock:0,sellingStock:0,sellingReleases:0};
 let cents=0;
 for(const r of releases){
  totals.sold+=r.sold;cents+=Math.round(r.revenue*100);
  const stock=r.bottles-r.sold;totals.stock+=stock;
  if(r.status==='sold-out')totals.soldOut++;
  if(r.listed)totals.sellingStock+=stock;
  // A token sale cannot give a full release's continuity contribution.
  totals.sellingReleases+=Math.min(1,r.sold/REPUTATION.releaseBottles);
 }
 totals.revenue=cents/100;return totals;
}
export const brandStats=(s,brandId)=>releaseStats(s.releases.filter(r=>r.brandId===brandId));
export function reputationFrom(stats){
 const volume=stats.sold/(stats.sold+REPUTATION.bottleScale);
 const continuity=stats.sellingReleases/(stats.sellingReleases+REPUTATION.releaseScale);
 const bonus=REPUTATION.maxBonus*volume*(0.75+0.25*continuity);
 return {bonus,multiplier:1+bonus,label:stats.sold===0?'まだ知られていない':bonus<0.05?'少しずつ知られている':'馴染みのある銘柄になってきた'};
}
export const brandReputation=(s,brandId)=>reputationFrom(brandStats(s,brandId));
export function latestReleaseBrand(s){
 // Array order resolves two releases bottled in the same month. Brand IDs are
// creation identities, not a chronology of repeat releases.
 let latest=null;
 for(const r of s.releases)if(!latest||r.bottledMonth>=latest.bottledMonth)latest=r;
 return s.brands.find(b=>b.id===latest?.brandId)??null;
}
export function retailReputationFactors(s){
 const factors=new Map(),previous=new Map();
 // Each release benefits from earlier releases' actual sales only. Its own
 // sales and later releases cannot improve the demand for that release.
 for(const r of s.releases){
  const history=previous.get(r.brandId)??[];
  factors.set(r.productId,reputationFrom(releaseStats(history)).multiplier);
  history.push(r);previous.set(r.brandId,history);
 }
 return factors;
}
