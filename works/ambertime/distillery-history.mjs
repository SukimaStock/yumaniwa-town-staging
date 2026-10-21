import {createGenerationSummary} from './generation-summary.mjs?v=0.66-generation-review';
import {replayDistilleryOperations} from './partner-orders.mjs?v=0.58-first-brand';
import {generationMode} from './generations.mjs?v=0.48-free-aging';

// This is a disposable view projection, not a second saved event ledger.
const copy=x=>structuredClone(x);
const dated=x=>Number.isInteger(x)&&x>=0;
const ids=r=>Object.fromEntries(['brandId','releaseId','productId','caskId','batchId','shopId'].filter(k=>r?.[k]!==undefined).map(k=>[k,r[k]]));
export function buildDistilleryHistory(state){
 const summary=createGenerationSummary(state);
 const events=new Map(),firstSales=new Set(),firstDistillations=new Set();
 const eras=generationMode(state)?[...state.generations.completed,state.generations.active]:[];
 let actor=eras.length?1:undefined;
 const finalEra=caskId=>eras.find(r=>r.lastCaskId!==null&&r.lastCaskId===caskId);
 const brand=id=>state.brands?.find(b=>b.id===id);
 const release=id=>state.releases?.find(r=>r.productId===id);
 const add=e=>{if(dated(e.month)&&!events.has(e.id)){const final=finalEra(e.caskId);events.set(e.id,copy({...((actor!==undefined)?{generationNumber:actor}:{}),...e,...(final&&(e.kind==='fill'||e.kind==='bottling')?{finalGeneration:final.id}:{})}));}};
 const named=r=>({...ids(r),...(r?.brandId!==undefined?{brandName:brand(r.brandId)?.name??r.name}: {})});
 const addBottle=(r,month=r.bottledMonth)=>{
  const rel=release(r.productId),n=rel?state.releases.filter(x=>x.brandId===rel.brandId&&x.id<=rel.id).length:undefined;
  add({id:`bottling:${r.productId}`,kind:'bottling',month,...named({...r,...(rel?{...rel,releaseId:rel.id}: {})}),age:r.age,count:r.bottles,type:r.type,cut:r.cut,profile:r.profile,rerelease:n>1,...(n?{releaseNumber:n}:{})});
 };
 const addCask=(c,initial=true)=>{if(!c)return;add({id:`fill:${c.id}`,kind:'fill',month:c.filledMonth,caskId:c.id,batchId:c.batchId,type:c.type,cut:c.cut,...(initial?{profile:{roughness:c.roughness,character:c.character,wood:c.wood}}:{})});};
 const addSale=(p,month)=>{if(!p||firstSales.has(p.id))return;firstSales.add(p.id);const r=release(p.id);add({id:`retail-first-sale:${p.id}`,kind:'retail-first-sale',month,...named({productId:p.id,...(r?{...r,releaseId:r.id}:{})})});};
 const addShopRelation=r=>add({id:`shop-start:${r.shopId??'town-liquor'}:${r.brandId}`,kind:'shop-start',month:r.startedMonth,...named(r),shopId:r.shopId??'town-liquor'});
 const addDelivery=(d,adoptions=[])=>{
  const adoption=adoptions.find(a=>a.deliveryId===d.id),r=release(d.productId);
  add({id:`shop-delivery:${d.id}`,kind:adoption?'department-adoption':'shop-delivery',month:d.month,...named({...r,...d}),count:d.count,revenue:d.revenue,unitPrice:d.unitPrice,...(adoption?{projectId:adoption.projectId,projectName:adoption.projectName,selectionId:adoption.selectionId}:{})});
 };
 const addTrade=h=>{
  const map={accepted:'wholesale-start',shipped:'wholesale-shipment','order-accepted':'special-order-accepted','order-fulfilled':'special-order-fulfilled','order-cancelled':'special-order-cancelled','order-unmet':'special-order-unmet','order-resolved':'special-order-resolved'};
  const kind=h.kind==='shipped'&&h.orderId!==undefined&&h.outcome==='fulfilled'?'special-order-fulfilled':map[h.kind];if(!kind)return;
  const target=h.orderId??(h.kind==='order-accepted'||h.kind==='order-cancelled'?h.id:undefined)??h.productId??h.relationshipId??h.id??h.partner;
  add({id:`${kind}:${target}:${h.month}`,kind,month:h.month,...ids(h),partner:h.partner,...(h.orderId!==undefined?{orderId:h.orderId}:{}),...(h.kind.startsWith('order-')&&h.id!==undefined?{orderId:h.id}:{}),...(h.bottles!==undefined?{count:h.bottles}:{}),...(h.gross!==undefined?{revenue:h.gross}:{}),...(h.outcome?{outcome:h.outcome}:{})});
 };
 const durable=s=>{
  for(const r of s.records??[])addBottle(r);
  for(const r of s.releases??[])addBottle({...r,releaseId:r.id});
  for(const c of [...(s.core?.casks??[]),...(s.core?.archive??[])])addCask(c,false);
  for(const r of s.shop?.relations??[])addShopRelation(r);
  for(const d of s.shop?.deliveries??[])addDelivery(d,s.department?.adoptions);
  for(const h of s.trade?.history??[])addTrade(h);
 };
 // Origin modules retain their own historical contracts. Only explicitly dated
 // surviving facts are used there; dates are never estimated from age or totals.
 const legacy=!!state.origin;
 if(legacy){for(let s=state.origin;s;s=s.origin){
  durable(s);
  // A prior cumulative sale proves that a later observed sale is not its first.
  for(const r of s.releases??[])if(r.sold>0)firstSales.add(r.productId);
  for(const r of s.records??[])if(r.channel!=='wholesale'&&r.sold>0)firstSales.add(r.productId);
  for(const p of s.core.products??[]){const delivered=(s.shop?.deliveries??[]).filter(d=>d.productId===p.id).reduce((n,d)=>n+d.count,0);if(p.sold>delivered&&!s.records?.some(r=>r.productId===p.id&&r.channel==='wholesale'))firstSales.add(p.id);}
 }}
 replayDistilleryOperations(state,observation=>{
  summary.observe(observation);
  const {operation,before,after}=observation;
  if(!operation)return;
  if(eras.length)actor=before.generations?.active.id??after.generations?.active.id??1;
  const key=operation.key;
  if(key==='stop'||key==='complete-usual'){
   const c=key==='complete-usual'?after.core.casks.find(c=>!before.core.casks.some(x=>x.id===c.id)):after.core.spirit;
   const batch=key==='complete-usual'?before.still.batch:after.still.batch;
   if(c&&batch&&!firstDistillations.has(batch.id)){
    firstDistillations.add(batch.id);add({id:`distillation:${batch.id}`,kind:'distillation',month:batch.startedMonth,batchId:batch.id,cut:c.cut,profile:{roughness:c.roughness,character:c.character,wood:c.wood??0},...(before.still.distillation?{stopAt:key==='stop'?operation.value:before.usual?.reservation?.recipe.stopAt}: {})});
   }
  }
  if(key==='fill'||key==='complete-usual')for(const c of after.core.casks)if(!before.core.casks.some(x=>x.id===c.id))addCask(c);
  for(const r of after.records??[])if(!before.records?.some(x=>x.productId===r.productId))addBottle(r);
  if(after.core.month>before.core.month){
   for(const sale of after.core.lastMonth?.sales??[])if(sale.sold>0&&sale.channel!=='wholesale'&&sale.channel!=='stockist')addSale({id:sale.id},after.core.month);
   for(const h of after.trade.history)if(!before.trade.history.some(x=>JSON.stringify(x)===JSON.stringify(h)))addTrade(h);
  }
  for(const r of after.shop?.relations??[])if(!before.shop?.relations?.some(x=>x.brandId===r.brandId&&x.shopId===r.shopId))addShopRelation(r);
  for(const d of after.shop?.deliveries??[])if(!before.shop?.deliveries?.some(x=>x.id===d.id))addDelivery(d,after.department?.adoptions);
  if(key==='accept'||key==='order-cancel'||key==='end-trade'||key==='choose')for(const h of after.trade.history)if(!before.trade.history.some(x=>JSON.stringify(x)===JSON.stringify(h)))addTrade(h);
  if(eras.length){
   const a=after.generations?.active,b=before.generations?.active;
   if(a?.trigger&&(!b?.trigger||a.id!==b.id))addGenerationDecision(a);
   for(const r of after.generations?.completed??[])if(!before.generations?.completed.some(x=>x.id===r.id))addHandover(r);
  }
 });
 function addGenerationDecision(r){
  const t=r.trigger;if(!t)return;
  const source=t.deliveryId!==undefined?events.get(`shop-delivery:${t.deliveryId}`):t.productId!==undefined?events.get(`bottling:${t.productId}`):null;
  if(source){source.generationTrigger=r.id;return;}
  add({id:`generation-fixed:${r.id}`,kind:'generation-fixed',month:t.month,generationId:r.id,generationNumber:r.id,trigger:copy(t)});
 }
 function addHandover(r){add({id:`generation-handover:${r.id}`,kind:'generation-handover',month:r.endedMonth,generationId:r.id,generationNumber:r.id,nextGeneration:r.id+1,startedMonth:r.startedMonth,lastCaskId:r.lastCaskId,lastStatus:r.lastStatus,trigger:copy(r.trigger),reason:r.reason,...(r.lastCaskId!==null?{caskId:r.lastCaskId}:{})});}
 if(eras.length){
  // Founding belongs to the first tenure; later accession is the same handover,
  // rather than a second duplicate event. Transaction order owns same-month facts.
  add({id:'generation-start:1',kind:'generation-start',month:0,startedMonth:0,generationId:1,generationNumber:1});
  for(const r of eras){if(r.trigger)addGenerationDecision(r);if(Number.isInteger(r.endedMonth))addHandover(r);}
  actor=1;
 }
 // Durable current records also cover dated origin facts that outlive their
 // source, without replacing the more precise replay-derived event.
 durable(state);
 const list=[...events.values()].sort((a,b)=>a.month-b.month||(a.kind==='generation-start'?-1:b.kind==='generation-start'?1:0));
 const shops=(state.shop?.relations??[]).map(r=>{
  const shopId=r.shopId??'town-liquor',ds=(state.shop.deliveries??[]).filter(d=>d.brandId===r.brandId&&(d.shopId??'town-liquor')===shopId);
  return {shopId,brandId:r.brandId,brandName:brand(r.brandId)?.name,startedMonth:r.startedMonth,deliveries:ds.length,bottles:ds.reduce((n,d)=>n+d.count,0),revenue:ds.reduce((n,d)=>n+Math.round(d.revenue*100),0)/100,firstDeliveryMonth:ds.length?Math.min(...ds.map(d=>d.month)):null,lastDeliveryMonth:ds.length?Math.max(...ds.map(d=>d.month)):null,adoptions:(state.department?.adoptions??[]).filter(a=>a.brandId===r.brandId&&shopId==='department').length};
 });
 return {events:list,shops,generations:summary.finish(state),coverage:{complete:!legacy,fromMonth:legacy?state.origin.core.month:0,legacy,notes:legacy?['旧版から引き継いだ期間は、保存に残る記録を表示しています。']:[]},elapsedMonths:state.core.month};
}
