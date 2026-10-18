import {bottleStorageMode} from './bottle-storage.mjs?v=0.19staff';
import {departmentMode,departmentReleaseEligible} from './department-projects.mjs?v=0.19staff';
// Optional buyers of finished, branded bottles. The durable delivery ledger
// is separate from retail sales and does not contribute to brand reputation.
export const SHOP=Object.freeze({version:12,rules:'town-shop',id:'town-liquor',name:'町の酒店',rate:.80,monthlyLimit:10,minRetailSold:40,minSoldReleases:2,minBrandAge:2,offerGap:6,declineGap:12,initialWait:3,maxDeliveries:2048});
export const STOCKISTS=Object.freeze({version:13,rules:'distinct-stockists'});
export const stockistsMode=s=>s?.version===STOCKISTS.version&&s.rules===STOCKISTS.rules||departmentMode(s);
export const shopMode=s=>s?.version===SHOP.version&&s.rules===SHOP.rules||stockistsMode(s);
export const SHOPS=Object.freeze([
 {id:SHOP.id,name:SHOP.name,minAge:0,maxRoughness:null,minQuantity:1,monthlyLimit:10,rate:.8,minRetailSold:40,minSoldReleases:2,minBrandAge:2},
 {id:'supermarket',name:'町のスーパー',minAge:12,maxRoughness:null,minQuantity:10,monthlyLimit:20,rate:1,minRetailSold:80,minSoldReleases:3,minBrandAge:2},
 {id:'department',name:'町のデパート',minAge:24,maxRoughness:.30,minQuantity:5,monthlyLimit:5,rate:1.4,minRetailSold:40,minSoldReleases:2,minBrandAge:2}
].map(Object.freeze));
export function shopProductCondition(s,productId,shopId=SHOP.id){
 const shop=SHOPS.find(x=>x.id===shopId),p=s.core.products.find(x=>x.id===productId);
 if(!shop)return 'この販売先はありません。';
 if(!p)return '販売棚の在庫から届けられます。';
 if(p.age<shop.minAge)return `熟成が${shop.minAge}か月未満です。`;
 if(shop.maxRoughness!==null&&p.roughness>shop.maxRoughness)return 'この店では刺激の穏やかな銘柄を扱います。';
 return '';
}
export function deliveryTotals(s,productId){
 let bottles=0,cents=0;
 for(const d of s.shop?.deliveries??[])if(d.productId===productId){bottles+=d.count;cents+=Math.round(d.revenue*100);}
 return {bottles,revenue:cents/100};
}
export function shopBrandStats(s,brandId,shopId=SHOP.id){
 const relation=s.shop?.relations.find(r=>r.brandId===brandId&&(!stockistsMode(s)||r.shopId===shopId));if(!relation)return null;
 const history=s.shop.deliveries.filter(d=>d.brandId===brandId&&(!stockistsMode(s)||(d.shopId??SHOP.id)===shopId));
 return {...relation,bottles:history.reduce((n,d)=>n+d.count,0),revenue:history.reduce((n,d)=>n+Math.round(d.revenue*100),0)/100,history};
}
export function shopEvidence(s,brandId,shopId=SHOP.id){
 const b=s.brands?.find(b=>b.id===brandId),releases=s.releases?.filter(r=>r.brandId===brandId)??[];
 const sold=releases.reduce((n,r)=>n+r.sold,0),soldReleases=releases.filter(r=>r.sold>0).length,age=b?Math.max(0,s.core.month-b.createdMonth):0;
 const store=stockistsMode(s)?SHOPS.find(x=>x.id===shopId):SHOP;
 const productEligible=departmentMode(s)&&shopId==='department'?releases.some(r=>(bottleStorageMode(s)||r.listed)&&departmentReleaseEligible(r)):shopId===SHOP.id||releases.some(r=>{const p=s.core.products.find(p=>p.id===r.productId);return p&&p.stock>0&&(bottleStorageMode(s)||s.productsById[p.id]?.listed)&&!shopProductCondition(s,p.id,shopId);});
 return {sold,soldReleases,age,eligible:!!b&&!!store&&sold>=store.minRetailSold&&soldReleases>=store.minSoldReleases&&age>=store.minBrandAge&&productEligible};
}
