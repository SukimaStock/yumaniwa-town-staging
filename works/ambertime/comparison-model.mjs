import {createProjectionReplay} from './partner-orders.mjs?v=adjust-b-r1';

// Disposable read models. Nothing here is written to the save or replay ledger.
const copy=x=>structuredClone(x),round=x=>Math.round(x*100)/100;
const present=x=>x!==undefined&&x!==null;
const profile=c=>c?{roughness:c.roughness,character:c.character,wood:c.wood}:null;
const releaseKey=r=>`release:${r.id}`;
const caskKey=c=>`cask:${c.id}`;
const identities=r=>Object.fromEntries(['brandId','releaseId','productId','caskId','batchId'].map(k=>[k,r[k]??null]));
function releaseLabel(state,r){const b=state.brands?.find(b=>b.id===r.brandId),number=(state.releases??[]).filter(x=>x.brandId===r.brandId&&x.id<=r.id).length;return `${b?.name??r.name??'商品 '+r.productId}・第${number}回`;}
export function comparisonChoices(state){
 const list=(state.core.casks??[]).map(c=>({key:caskKey(c),kind:'cask',label:`樽 ${c.id}`,caskId:c.id,batchId:c.batchId??null}));
 for(const r of state.releases??[])list.push({key:releaseKey(r),kind:'release',label:releaseLabel(state,r),...identities({...r,releaseId:r.id})});
 for(const r of state.records??[])if(!(state.releases??[]).some(x=>x.productId===r.productId))list.push({key:`product:${r.productId}`,kind:'release',label:r.name??`商品 ${r.productId}`,...identities(r)});
 return list;
}
function blankSale(complete=false){return {complete,listedMonth:null,observedMonths:0,firstSaleMonth:null,lastSaleMonth:null,priceChanges:[],prices:new Map(),count:0,cents:0,wholesaleCount:0,wholesaleCents:0,wholesalePartner:null};}
export function createComparisonProjection(){
 let token=null,batches,casks,products,sales,deliveries,manualSources=[];
 function reset(){batches=new Map();casks=new Map();products=new Map();sales=new Map();deliveries=new Map();}
 reset();
 function sale(id,complete=false){if(!sales.has(id))sales.set(id,blankSale(complete));return sales.get(id);}
 function capture(state,initial=false){
  for(const c of [...(state.core.archive??[]),...(state.core.casks??[])])if(!casks.has(c.id))casks.set(c.id,copy(c));
  for(const b of Object.values(state.batchesById??{}))batches.set(b.id,{...(batches.get(b.id)??{}),...copy(b)});
  for(const r of state.records??[]){const old=products.get(r.productId)??{};products.set(r.productId,{...old,record:{...(old.record??{}),...copy(r)}});}
  for(const r of state.releases??[]){const old=products.get(r.productId)??{};if(!old.release)products.set(r.productId,{...old,release:copy(r)});}
  for(const p of state.core.products??[]){const old=products.get(p.id)??{};products.set(p.id,{...old,product:copy(p),listed:!!state.productsById?.[p.id]?.listed});if(initial)sale(p.id);}
  for(const d of state.shop?.deliveries??[])deliveries.set(d.id,copy(d));
 }
 function observe({operation,before,after}){
  if(!operation){reset();capture(after,true);return;}
  const key=operation.key;
  if(key==='start'&&after.still.batch)batches.set(after.still.batch.id,{...copy(after.still.batch),manual:true,stopAt:null});
  if(key==='stop'&&after.still.batch){const b=after.still.batch;batches.set(b.id,{...(batches.get(b.id)??{}),...copy(b),manual:true,stopAt:operation.value});}
  if(key==='fill'||key==='complete-usual')for(const c of after.core.casks)if(!before.core.casks.some(x=>x.id===c.id)){
   casks.set(c.id,copy(c));const b=after.batchesById?.[c.id];if(b)batches.set(b.id,{...(batches.get(b.id)??{}),...copy(b),manual:key==='fill',...(key==='complete-usual'?{stopAt:before.usual?.reservation?.recipe.stopAt??null}:{})});
  }
  for(const p of after.core.products??[]){
   const prev=before.core.products.find(x=>x.id===p.id),s=sale(p.id,!prev);
   if(!prev){s.complete=true;s.priceChanges.push({month:after.core.month,price:p.price,tier:after.productsById?.[p.id]?.selectedPrice??null,initial:true});}
   else if(prev.price!==p.price)s.priceChanges.push({month:after.core.month,price:p.price,tier:after.productsById?.[p.id]?.selectedPrice??null,initial:false});
   if(after.productsById?.[p.id]?.listed&&!before.productsById?.[p.id]?.listed&&s.listedMonth===null)s.listedMonth=after.core.month;
  }
  if(after.core.month>before.core.month){
   for(const p of before.core.products??[])if(p.stock>0&&before.productsById?.[p.id]?.listed)sale(p.id).observedMonths++;
   for(const transaction of after.core.lastMonth?.sales??[]){
    const s=sale(transaction.id);if(transaction.channel==='wholesale'){s.wholesaleCount+=transaction.sold;s.wholesaleCents+=Math.round(transaction.revenue*100);s.wholesalePartner=after.trade?.lastShipments?.find(x=>x.productId===transaction.id)?.partner??s.wholesalePartner;continue;}
    if(transaction.sold<=0)continue;s.count+=transaction.sold;s.cents+=Math.round(transaction.revenue*100);s.firstSaleMonth??=after.core.month;s.lastSaleMonth=after.core.month;
    const price=before.core.products.find(x=>x.id===transaction.id)?.price??null;
    const t=s.prices.get(price)??{price,count:0,revenue:0};t.count+=transaction.sold;t.revenue=round(t.revenue+transaction.revenue);s.prices.set(price,t);
   }
  }
  capture(after);
 }
 function render(state){
  const items=[],brands=new Map((state.brands??[]).map(b=>[b.id,b]));
  const eras=[...(state.generations?.completed??[]),...(state.generations?.active?[state.generations.active]:[])];
  const manualByCask=new Map(manualSources.map(x=>[x.caskId,x]));
  const source=(caskId,batchId,r={})=>{
   const c=casks.get(caskId),b=batches.get(batchId),m=manualByCask.get(caskId);
   return {distilledMonth:b?.startedMonth??r.distilledMonth??null,filledMonth:c?.filledMonth??null,stopAt:m?.stopAt??b?.stopAt??null,manual:m?true:b?.manual??null,initialLitres:b?.initialLitres??r.initialLitres??c?.initialLitres??null,manualSource:m?copy(m):null,sourceComplete:!!m,finalGeneration:eras.find(x=>present(x.lastCaskId)&&x.lastCaskId===caskId)?.id??null};
  };
  for(const c of state.core.casks??[]){const batch=state.batchesById?.[c.id];items.push({key:caskKey(c),kind:'cask',label:`樽 ${c.id}`,...identities({caskId:c.id,batchId:c.batchId??batch?.id}),brandName:null,releaseNumber:null,...source(c.id,c.batchId??batch?.id),type:c.type,age:c.age,cut:c.cut,profile:profile(c),litres:c.litres,bottledMonth:null,bottles:null,status:'aging',stock:null,currentPrice:null,listedMonth:null,retailActiveMonths:null,retailObservedMonths:0,firstSaleMonth:null,lastSaleMonth:null,priceChanges:[],retailPriceTotals:[],retail:null,shops:[],wholesale:null});}
  for(const [productId,entry] of products){
   const live=state.core.products.find(p=>p.id===productId),release=(state.releases??[]).find(r=>r.productId===productId)??entry.release,r=entry.record??{},p=live??entry.product??{};
   const caskId=release?.caskId??r.caskId??p.sourceId??null,batchId=release?.batchId??r.batchId??p.batchId??null;
   const ss=sale(productId),ds=[...deliveries.values()].filter(d=>d.productId===productId),shopMap=new Map();
   for(const d of ds){const shopId=d.shopId??'town-liquor',t=shopMap.get(shopId)??{shopId,count:0,revenue:0};t.count+=d.count;t.revenue=round(t.revenue+d.revenue);shopMap.set(shopId,t);}
   const wholesale=r.channel==='wholesale'||ss.wholesaleCount>0;
   const retailCount=release?.sold??(wholesale?0:r.sold??(present(p.sold)?p.sold-ds.reduce((n,d)=>n+d.count,0):ss.count));
   const retailRevenue=release?.revenue??(wholesale?0:r.revenue??(present(p.revenue)?round(p.revenue-ds.reduce((n,d)=>n+d.revenue,0)):ss.cents/100));
   const listed=live?!!state.productsById?.[productId]?.listed:entry.listed??release?.listed??false;
   const stock=live?.stock??p.stock??(present(release?.bottles)?Math.max(0,release.bottles-retailCount-ds.reduce((n,d)=>n+d.count,0)):null);
   const brand=brands.get(release?.brandId),number=release?(state.releases??[]).filter(x=>x.brandId===release.brandId&&x.id<=release.id).length:null;
   items.push({key:release?releaseKey(release):`product:${productId}`,kind:'release',label:release?releaseLabel(state,release):r.name??`商品 ${productId}`,...identities({...r,...(release?{...release,releaseId:release.id}:{}),caskId,batchId,productId}),brandName:brand?.name??null,releaseNumber:number,...source(caskId,batchId,r),type:release?.type??r.type??p.type??null,age:release?.age??r.age??p.age??null,cut:release?.cut??r.cut??p.cut??null,profile:copy(release?.profile??r.profile??(present(p.roughness)?profile(p):null)),litres:r.litres??r.profile?.litres??null,bottledMonth:release?.bottledMonth??r.bottledMonth??p.bottledMonth??null,bottles:release?.bottles??r.bottles??p.originalStock??null,status:wholesale?'wholesale':stock===0?'sold-out':listed?'selling':'stored',stock,currentPrice:p.price??release?.price??null,listedMonth:ss.listedMonth,retailActiveMonths:ss.complete?ss.observedMonths:null,retailObservedMonths:ss.observedMonths,firstSaleMonth:ss.complete?ss.firstSaleMonth:null,lastSaleMonth:ss.lastSaleMonth,priceChanges:copy(ss.priceChanges),retailPriceTotals:copy([...ss.prices.values()]),retail:{count:retailCount,revenue:retailRevenue},shops:copy([...shopMap.values()]),wholesale:wholesale?{count:r.sold??ss.wholesaleCount,revenue:r.revenue??ss.wholesaleCents/100,partner:r.partner??ss.wholesalePartner}:null,salesComplete:ss.complete});
  }
  return {items,manualSources:copy(manualSources),coverage:{complete:!state.origin,fromMonth:state.origin?.core?.month??0},elapsedMonths:state.core.month};
 }
 return {update(state){const result=createProjectionReplay(state,observe,token);token=result.token;manualSources=result.manualSources??[];capture(state);return render(state);}};
}
export function buildComparisonData(state){return createComparisonProjection().update(state);}
