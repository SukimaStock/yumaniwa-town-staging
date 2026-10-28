import {planSales,affinity,RULES as MARKET_RULES} from './market-sales.mjs?v=market-rules-r1';
// Pure reservations and a deterministic monthly demand projection for the main game.
// The host transaction owns cash, durable receipts, history and replay.
import {placementInventory,storeMarketMode} from './placement-mode.mjs?v=store-market-main-r1';
import {SHOP,SHOPS,shopProductCondition} from './shop-model.mjs?v=0.41-delegation';
import {NORMAL_SHOP_DEMAND,normalShopUnitPrice} from './shop-demand.mjs?v=adjust-b-r1';
import {townAffinity} from './town-connection.mjs?v=stage4-r2';
export const STORE_MARKET_SHOPS=Object.freeze(SHOPS.filter(s=>s.id!=='department'));
export {storeMarketMode};
export const storeMarketInventory=(s,productId)=>placementInventory(s,productId);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function unit(seed,key){let h=seed>>>0;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h=Math.imul(h^(h>>>16),2246822507);return ((h^(h>>>13))>>>0)/4294967296;}
function qualified(s,p,r,store,month){return p&&r&&p.bottledMonth<month&&s.shop.relations.some(x=>x.shopId===store.id&&x.brandId===r.brandId&&x.startedMonth<month)&&!shopProductCondition(s,p.id,store.id);}
export function storeMarketQuote(s,productId,shopId){
 const store=STORE_MARKET_SHOPS.find(x=>x.id===shopId),p=s.core.products.find(x=>x.id===productId),r=s.releases.find(x=>x.productId===productId),inv=placementInventory(s,productId);
 let reason='';
 if(!storeMarketMode(s))reason='店の棚に対応した記録で始めます。';
 else if(!store||!p||!r)reason='割り当てる発売回と店を確認してください。';
 else if(!s.shop.relations.some(x=>x.shopId===shopId&&x.brandId===r.brandId))reason='この銘柄はまだ取扱い前です。';
 else if(s.tastingId!==null||s.trade.offer!==null)reason='先に試飲・卸売の申し出を確認します。';
 else if(shopProductCondition(s,productId,shopId))reason=shopProductCondition(s,productId,shopId);
 else if(inv.hand<1)reason='手元の瓶を割り当てます。';
 else if(s.shop.deliveries.length>=SHOP.maxDeliveries)reason='納品帳がいっぱいです。';
 const assigned=inv.shops?.[shopId]??0,unitPrice=store&&p&&r?normalShopUnitPrice(s,productId,shopId):0,fit=store&&r?(s.marketRules?.version===1&&s.marketRules.rules===MARKET_RULES?affinity(shopId,p):townAffinity(shopId,r).fit):0;
 return {shopId,ok:!reason,reason,available:inv.hand,maxCount:reason?0:inv.hand,assigned,unitPrice,fit};
}
export function storeMarketRows(s,shopId){
 if(!storeMarketMode(s)||!STORE_MARKET_SHOPS.some(x=>x.id===shopId))return [];
 return s.releases.flatMap(r=>{
  const count=s.storeMarket.byShop[shopId]?.[r.productId]??0;if(!count)return [];
  return [{productId:r.productId,releaseId:r.id,brandId:r.brandId,count,flavorLabel:r.profile?.flavor?.label??r.flavorName??'',age:r.age,fit:s.marketRules?.version===1&&s.marketRules.rules===MARKET_RULES?affinity(shopId,s.core.products.find(p=>p.id===r.productId)):townAffinity(shopId,r).fit}];
 });
}
function planMarketRuleSales(s,month){
 return STORE_MARKET_SHOPS.filter(store=>s.shop.relations.some(r=>r.shopId===store.id&&r.startedMonth<month)).map(store=>{
  const rows=storeMarketRows(s,store.id).map(row=>({...row,p:s.core.products.find(p=>p.id===row.productId),r:s.releases.find(r=>r.id===row.releaseId)})).filter(row=>qualified(s,row.p,row.r,store,month));
  const items=rows.map(row=>({...row.p,count:Math.min(row.count,row.p.stock),price:normalShopUnitPrice(s,row.productId,store.id),referencePrice:NORMAL_SHOP_DEMAND.referencePaidPrice[store.id]}));
  const result=planSales(items,store.id,s.marketRules.ledgers[store.id]??{}, {month,seed:s.seed});
  const shipments=result.sales.map(x=>{const row=rows.find(r=>r.productId===x.id);return {productId:x.id,releaseId:row.releaseId,count:x.count,unitPrice:normalShopUnitPrice(s,x.id,store.id),fit:affinity(store.id,row.p)};});
  const planned=shipments.reduce((n,x)=>n+x.count,0),requested=result.opportunities;
  return {shopId:store.id,month,count:requested,requested,alreadyShipped:0,planned,unmet:Math.max(0,requested-planned),available:items.reduce((n,p)=>n+p.count,0),belowMinimum:0,profileProductId:rows[0]?.productId??null,unitPrice:shipments[0]?.unitPrice??null,reason:!rows.length?'no-assigned-stock':planned?'market-sales':'waiting-for-customers',components:{candidate:true},shipments,marketRulesLedger:result.ledger};
 });
}
export function planStoreMarketSales(s,month=s.core.month){
 if(!storeMarketMode(s)||!Number.isInteger(month)||month<0)throw Error('店の販売月を確認してください。');
 if(s.marketRules?.version===1&&s.marketRules.rules===MARKET_RULES)return planMarketRuleSales(s,month);
 return STORE_MARKET_SHOPS.filter(store=>s.shop.relations.some(r=>r.shopId===store.id&&r.startedMonth<month)).map(store=>{
  const already=s.shop.deliveries.filter(x=>(x.shopId??SHOP.id)===store.id&&x.month===month).reduce((n,x)=>n+x.count,0);
  const base=NORMAL_SHOP_DEMAND.base[store.id],mode=s.shopDemand.mode;
  const multiplier=mode==='capacity'?null:mode==='fixed'?1:NORMAL_SHOP_DEMAND.monthlyMultipliers[Math.floor(unit(s.seed,`market-demand:${month}:${store.id}`)*NORMAL_SHOP_DEMAND.monthlyMultipliers.length)];
  const requested=mode==='capacity'?store.monthlyLimit:clamp(Math.floor(base*multiplier),0,store.monthlyLimit);
  let remaining=Math.max(0,Math.min(requested-already,store.monthlyLimit-already));
  const rows=storeMarketRows(s,store.id).map(row=>({...row,p:s.core.products.find(p=>p.id===row.productId),r:s.releases.find(r=>r.id===row.releaseId)})).filter(row=>qualified(s,row.p,row.r,store,month)).sort((a,b)=>b.fit-a.fit||a.productId-b.productId);
  const shipments=[];let available=0;
  for(const row of rows){
   const count=Math.min(row.count,row.p.stock);available+=count;if(!remaining)continue;
   const unitPrice=normalShopUnitPrice(s,row.productId,store.id),priceFactor=Math.sqrt(NORMAL_SHOP_DEMAND.referencePaidPrice[store.id]/unitPrice),probability=clamp((.15+.8*row.fit)*priceFactor,.08,.98);
   let sold=0;for(let i=0;i<Math.min(count,remaining);i++)if(unit(s.seed,`market-sale:${month}:${store.id}:${row.productId}:${i}`)<probability)sold++;
   if(sold){shipments.push({productId:row.productId,releaseId:row.releaseId,count:sold,unitPrice,fit:row.fit});remaining-=sold;}
  }
  const planned=shipments.reduce((n,x)=>n+x.count,0);
  return {shopId:store.id,month,count:requested,requested,alreadyShipped:already,planned,unmet:Math.max(0,requested-already-planned),available,belowMinimum:0,profileProductId:rows[0]?.productId??null,unitPrice:rows[0]?normalShopUnitPrice(s,rows[0].productId,store.id):null,reason:!requested?'zero-demand':!rows.length?'no-assigned-stock':planned?'market-sales':'waiting-for-customers',components:{base,monthlyMultiplier:multiplier},shipments};
 });
}
