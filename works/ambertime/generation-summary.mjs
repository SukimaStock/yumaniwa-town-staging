import {replayDistilleryOperations} from './partner-orders.mjs?v=market-rules-r1';

// Ephemeral projection over public transaction boundaries; never saved or replayed as an action.
const copy=x=>x==null?null:structuredClone(x);
const number=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const actorId=s=>Number.isInteger(s?.generations?.active?.id)?s.generations.active.id:null;
const estate=s=>({casks:Array.isArray(s?.core?.casks)?s.core.casks.length:null,cash:number(s?.core?.cash)});
const newItems=(after,before,key='id')=>(after??[]).filter(x=>!(before??[]).some(old=>old[key]===x[key]));
const storeId=x=>x.shopId??'town-liquor'; // Existing v12 receipt/relation contract.
export function createGenerationSummary(state){
 const summaries=new Map(),seenShops=new Set();let unknownPast=!!state.origin;
 const eraRows=s=>[...(s?.generations?.completed??[]),...(s?.generations?.active?[s.generations.active]:[])];
 function ensure(era){
  if(!era)return null;
  if(!summaries.has(era.id))summaries.set(era.id,{id:era.id,startedMonth:number(era.startedMonth),endedMonth:number(era.endedMonth),completed:era.endedMonth!=null,totals:{filled:0,bottled:0,sold:0},coverage:{complete:false,fromMonth:null},events:[],lastStatus:era.lastStatus??null,lastCaskId:era.lastCaskId??null,lastBatchId:era.lastBatchId??null,estate:{casks:null,cash:null},observed:false,frozen:false,mature:false});
  return summaries.get(era.id);
 }
 function begin(era,month,complete=false){const r=ensure(era);if(r&&!r.observed){r.observed=true;r.coverage={complete,fromMonth:number(month)};}return r;}
 function event(r,e){if(r.events.length<2)r.events.push(e);}
 function observe({operation,before,after}){
  if(!after)return;
  if(!operation){
   for(const rel of after.shop?.relations??[])seenShops.add(storeId(rel));
   const id=actorId(after);if(id===null&&((after.core?.casks?.length??0)>0||(after.core?.products?.length??0)>0||after.core?.totals?.bottlesSold>0||after.still?.batch))unknownPast=true;if(id!==null)begin(after.generations.active,after.core.month,!unknownPast&&after.core.month===after.generations.active.startedMonth);
   return;
  }
  const casks=newItems(after.core?.casks,before?.core?.casks),products=newItems(after.core?.products,before?.core?.products);
  const delta=number(after.core?.totals?.bottlesSold)!==null&&number(before?.core?.totals?.bottlesSold)!==null?after.core.totals.bottlesSold-before.core.totals.bottlesSold:null;
  const id=actorId(before),era=before?.generations?.active;
  const productive=casks.length>0||products.length>0||delta>0||operation.key==='start'||operation.key==='start-usual'||operation.key==='stop';
  if(id===null&&productive)unknownPast=true;
  let r=id===null?null:begin(era,before.core.month,!unknownPast&&before.core.month===era.startedMonth);
  if(r&&!r.frozen){
   r.totals.filled+=casks.length;
   for(const p of products){const n=number(p.originalStock);r.totals.bottled=r.totals.bottled===null||n===null?null:r.totals.bottled+n;}
   r.totals.sold=r.totals.sold===null||delta===null||delta<0?null:r.totals.sold+delta;
  }
  // A store's first relationship is global, even when it predates generation support.
  for(const rel of (after.shop?.relations??[]).filter(rel=>!(before?.shop?.relations??[]).some(old=>old.brandId===rel.brandId&&storeId(old)===storeId(rel)))){
   const shopId=storeId(rel);if(seenShops.has(shopId))continue;seenShops.add(shopId);
   if(r&&!r.frozen&&shopId!=='department')event(r,{kind:'shop-start',month:after.core.month,shopId});
  }
  if(r&&!r.frozen){
   const receipts=newItems(after.shop?.deliveries,before?.shop?.deliveries);
   for(const d of receipts){const adoption=(after.department?.adoptions??[]).find(a=>a.deliveryId===d.id&&storeId(d)==='department');if(adoption&&d.count>0)event(r,{kind:'department-adoption',month:d.month,shopId:'department',releaseId:d.releaseId??null,productId:d.productId??null});}
   for(const p of products)if(!r.mature&&p.age>=36){r.mature=true;const release=(after.releases??[]).find(x=>x.productId===p.id);event(r,{kind:'mature-bottling',month:after.core.month,releaseId:release?.id??null,productId:p.id,age:p.age});}
   const completed=(after.generations?.completed??[]).find(x=>x.id===id);
   if(completed){Object.assign(r,{endedMonth:number(completed.endedMonth),completed:true,lastStatus:completed.lastStatus??null,lastCaskId:completed.lastCaskId??null,lastBatchId:completed.lastBatchId??null,estate:estate(after),frozen:true});}
  }
  // enable-generations and handover establish the next observation boundary.
  if(actorId(after)!==null&&actorId(after)!==id)begin(after.generations.active,after.core.month,!unknownPast&&after.core.month===after.generations.active.startedMonth||id!==null);
 }
 function finish(current=state){
  return eraRows(current).map(era=>{
   const r=ensure(era),out=copy(r);delete out.observed;delete out.frozen;delete out.mature;
   Object.assign(out,{startedMonth:number(era.startedMonth),endedMonth:number(era.endedMonth),completed:era.endedMonth!=null,lastStatus:era.lastStatus??null,lastCaskId:era.lastCaskId??null,lastBatchId:era.lastBatchId??null});
   if(!r.observed){out.totals={filled:null,bottled:null,sold:null};out.coverage={complete:false,fromMonth:null};}
   if(out.completed&&!r.frozen)out.coverage.complete=false;
   if(!out.completed)out.estate=estate(current);
   return out;
  });
 }
 return {observe,finish};
}
export function buildGenerationSummaries(state){const collector=createGenerationSummary(state);replayDistilleryOperations(state,collector.observe);return collector.finish(state);}
