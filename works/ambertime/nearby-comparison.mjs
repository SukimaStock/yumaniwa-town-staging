import {nearbyComparisonFacts} from './partner-orders.mjs?v=0.39-staff-repeat';

// Targeted views over an exact validated snapshot. No persistent ledger or replay.
const copy=x=>structuredClone(x),round=x=>Math.round(x*100)/100;
const profile=c=>({roughness:c.roughness,character:c.character,wood:c.wood});
const sourceFields=(state,caskId,f)=>({caskId,batchId:f?.batchId??null,distilledMonth:f?.distilledMonth??null,filledMonth:f?.filledMonth??null,stopAt:f?.stopAt??null,manual:f?.manual??null,manualSource:copy(f?.manualSource??null),commissionedFrom:copy(f?.commissionedFrom??null),finalGeneration:[...(state.generations?.completed??[]),...(state.generations?.active?[state.generations.active]:[])].find(x=>x.lastCaskId===caskId)?.id??null});
export function nearbyCasks(state){
 const ids=state.core.casks.map(c=>c.id),facts=nearbyComparisonFacts(state,{caskIds:ids}),fills=new Map(facts.casks.map(x=>[x.caskId,x]));
 return state.core.casks.map((c,i)=>({key:`cask:${c.id}`,kind:'cask',label:`樽 ${c.id}`,position:i+1,...sourceFields(state,c.id,fills.get(c.id)),batchId:c.batchId,type:c.type,age:c.age,profile:profile(c),litres:c.litres,initialLitres:c.initialLitres,filledMonth:c.filledMonth,status:'aging'}));
}
export function previousRelease(state,id){
 const current=state.releases?.find(r=>r.id===id);if(!current)return null;
 return copy(state.releases.filter(r=>r.brandId===current.brandId&&r.id<current.id).sort((a,b)=>b.id-a.id)[0]??null);
}
function releaseView(state,r,facts){
 const brand=state.brands?.find(b=>b.id===r.brandId),number=state.releases.filter(x=>x.brandId===r.brandId&&x.id<=r.id).length;
 const p=state.core.products.find(x=>x.id===r.productId),receipt=facts.products.find(x=>x.productId===r.productId),fill=facts.casks.find(x=>x.caskId===r.caskId);
 const deliveries=(state.shop?.deliveries??[]).filter(d=>d.productId===r.productId),shops=[];
 for(const d of deliveries){const shopId=d.shopId??'town-liquor';let t=shops.find(x=>x.shopId===shopId);if(!t){t={shopId,count:0,revenue:0};shops.push(t);}t.count+=d.count;t.revenue=round(t.revenue+d.revenue);}
 const complete=receipt?.complete===true;
 const shopCount=shops.reduce((n,x)=>n+x.count,0),stock=p?.stock??receipt?.stock??(complete||facts.coverage.complete?Math.max(0,r.bottles-r.sold-shopCount):r.status==='sold-out'?0:null);
 const listed=p?!!state.productsById[p.id]?.listed:receipt?.listed??r.listed??null;
 return {key:`release:${r.id}`,kind:'release',label:`${brand?.name??'銘柄'}・第${number}回`,brandName:brand?.name??null,brand:copy(brand??null),brandId:r.brandId,releaseId:r.id,releaseNumber:number,productId:r.productId,...sourceFields(state,r.caskId,fill),batchId:r.batchId,type:r.type,age:r.age,profile:copy(r.profile),bottledMonth:r.bottledMonth,bottles:r.bottles,stock,status:stock===0?'sold-out':listed===true?'selling':listed===false?'stored':null,currentPrice:p?.price??receipt?.currentPrice??r.price??null,listedMonth:receipt?.listedMonth??null,retailActiveMonths:complete?receipt.retailActiveMonths:null,firstSaleMonth:complete?receipt.firstSaleMonth:null,lastSaleMonth:receipt?.lastSaleMonth??null,priceChanges:copy(receipt?.priceChanges??[]),retailPriceTotals:copy(receipt?.retailPriceTotals??[]),retail:{count:r.sold,revenue:r.revenue},shops,shopCount,retailTargetCount:complete||facts.coverage.complete?r.bottles-shopCount:null,salesComplete:complete,coverage:copy(facts.coverage)};
}
export function releasePair(state,id){
 const current=state.releases?.find(r=>r.id===id),previous=previousRelease(state,id);if(!current||!previous)return null;
 const facts=nearbyComparisonFacts(state,{productIds:[current.productId,previous.productId],caskIds:[current.caskId,previous.caskId]});
 return {current:releaseView(state,current,facts),previous:releaseView(state,previous,facts)};
}
export function sourceDetails(state,caskId){
 const c=state.core.casks.find(c=>c.id===caskId),r=state.releases?.find(r=>r.caskId===caskId),record=state.records?.find(r=>r.caskId===caskId);
 const facts=nearbyComparisonFacts(state,{caskIds:[caskId],productIds:r?[r.productId]:[]});
 if(c){const fill=facts.casks[0];return {key:`cask:${c.id}`,kind:'cask',label:`樽 ${c.id}`,...sourceFields(state,c.id,fill),batchId:c.batchId,type:c.type,age:c.age,profile:profile(c),litres:c.litres,filledMonth:c.filledMonth,status:'aging'};}
 if(r)return releaseView(state,r,facts);
 const fill=facts.casks[0];if(!record&&!fill)return null;
 return {key:`source:${caskId}`,kind:'source',label:record?.name??`樽 ${caskId}`,...sourceFields(state,caskId,fill),type:record?.type??fill?.type??null,age:record?.age??null,profile:copy(record?.profile??null),productId:record?.productId??null,releaseId:record?.releaseId??null,bottledMonth:record?.bottledMonth??null,bottles:record?.bottles??null};
}
