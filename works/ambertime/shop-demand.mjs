// One ordinary-shop request per month; a capacity limit is not an order.
// Pure projections: no clocks, RNG writes, state mutations, or player settings.
import {SHOPS} from './shop-model.mjs?v=0.41-delegation';
import {marketValue,salePrices} from './economy.mjs?v=0.44-monthly-timing';
import {ECONOMY_PARAMETERS as C} from './economy-parameters.mjs';
export const NORMAL_SHOP_DEMAND=Object.freeze({version:1,modes:Object.freeze(['capacity','fixed','variable']),monthlyMultipliers:Object.freeze([0,.5,1,1.5,2,2.5]),base:Object.freeze({'town-liquor':3,supermarket:6}),referencePaidPrice:Object.freeze({'town-liquor':16,supermarket:20})});
const round=n=>Math.round(n*100)/100,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const shops=()=>SHOPS.filter(x=>x.id!=='department');
function monthlyIndex(seed,month,id){let h=(seed>>>0)^Math.imul(month,0x9e3779b1);for(let i=0;i<id.length;i++){h=Math.imul(h^id.charCodeAt(i),0x85ebca6b);h^=h>>>13;}h^=h>>>16;return (h>>>0)%6;}
export function normalShopUnitPrice(s,productId,shopId){const store=shops().find(x=>x.id===shopId),p=s.core.products.find(x=>x.id===productId),r=s.releases.find(x=>x.productId===productId);if(!store||!r)return null;const standard=p?salePrices(s,productId).standard:clamp(round(marketValue({...r.profile,age:r.age,cut:r.cut,type:r.type})),C.minPrice,C.maxPrice);return round(standard*store.rate);}
function eligibleRelease(s,r,store,month){const meta=s.productsById[r.productId];return r.listed&&meta?.listed&&Number.isInteger(meta.listedMonth)&&r.bottledMonth<month&&meta.listedMonth<month&&r.age>=store.minAge&&(store.maxRoughness===null||r.profile.roughness<=store.maxRoughness)&&s.shop.relations.some(x=>x.shopId===store.id&&x.brandId===r.brandId&&x.startedMonth<month);}
export function normalShopOrders(s,month,mode='variable'){
 if(!NORMAL_SHOP_DEMAND.modes.includes(mode)||!Number.isInteger(month)||month<0)throw Error('Invalid ordinary-shop demand projection');
 return shops().filter(store=>s.shop.relations.some(x=>x.shopId===store.id&&x.startedMonth<month)).map(store=>{
  const r=[...s.releases].reverse().find(r=>eligibleRelease(s,r,store,month));
  if(!r)return {shopId:store.id,month,count:0,profileProductId:null,unitPrice:null,reason:'no-eligible-release',components:null};
  const unitPrice=normalShopUnitPrice(s,r.productId,store.id);let count,components=null;
  if(mode==='capacity')count=store.monthlyLimit;
  else if(mode==='fixed')count=store.id==='town-liquor'?3:month%4===0?10:0;
  else{
   const monthlyMultiplier=NORMAL_SHOP_DEMAND.monthlyMultipliers[monthlyIndex(s.seed,month,store.id)],p=r.profile;
   const flavorFactor=clamp(store.id==='town-liquor'?.75+.4*p.character-.2*Math.max(0,p.wood-.6):.65+.45*(1-p.roughness)-.25*Math.max(0,p.wood-.5),.8,1.15);
   const ageFactor=store.id==='town-liquor'&&r.age<6?.55:1,priceFactor=Math.sqrt(NORMAL_SHOP_DEMAND.referencePaidPrice[store.id]/unitPrice),base=NORMAL_SHOP_DEMAND.base[store.id];
   count=Math.floor(base*monthlyMultiplier*flavorFactor*ageFactor*priceFactor+1e-9);components={base,monthlyMultiplier,flavorFactor,ageFactor,priceFactor};
  }
  count=Math.min(store.monthlyLimit,Math.max(0,count));if(count<store.minQuantity)count=0;
  return {shopId:store.id,month,count,profileProductId:r.productId,unitPrice,reason:count?'requested':'zero-demand',components};
 });
}
export function planShopFulfillment(s,month,order,{heldCounts={}}={}){
 const store=shops().find(x=>x.id===order.shopId);if(!store||!Number.isInteger(order.count)||order.count<0||order.month!==month)throw Error('Invalid ordinary-shop order');
 const already=s.shop.deliveries.filter(d=>d.shopId===store.id&&d.month===month).reduce((n,d)=>n+d.count,0),requested=order.count,capacity=Math.max(0,store.monthlyLimit-already);
 let remaining=Math.min(Math.max(0,requested-already),capacity),available=0,belowMinimum=0;const shipments=[];
 for(const p of [...s.core.products].sort((a,b)=>a.id-b.id)){
  const r=s.releases.find(r=>r.productId===p.id);if(!r||!eligibleRelease(s,r,store,month))continue;
  const stock=Math.max(0,p.stock-(heldCounts[p.id]??0));available+=stock;const count=Math.min(stock,remaining);if(count<store.minQuantity){if(stock>0&&remaining>0)belowMinimum+=stock;continue;}
  shipments.push({productId:p.id,count,unitPrice:normalShopUnitPrice(s,p.id,store.id)});remaining-=count;
 }
 const planned=shipments.reduce((n,x)=>n+x.count,0),unmet=Math.max(0,requested-already-planned);
 return {shopId:store.id,month,requested,alreadyShipped:already,planned,unmet,available,belowMinimum,shipments,reason:requested===0?'zero-demand':unmet===0?'fulfilled':available<Math.min(requested,store.minQuantity)?'insufficient-stock':belowMinimum>0?'minimum-lot':'stock-or-capacity'};
}
