import {recipesMode} from './recipe-book.mjs?v=0.18';
// Work-local execution boundary; chemistry, money and estate remain unchanged.
export const GENERATIONS=Object.freeze({version:16,rules:'distillery-generations',lateMonths:300,hardMonths:360,graceMonths:12,brandMonths:120,shopMonths:120,matureMonths:36});
export const generationMode=s=>s?.version===GENERATIONS.version&&s.rules===GENERATIONS.rules||recipesMode(s);
export const newGeneration=(id,startedMonth)=>({id,startedMonth,phase:'working',fixedMonth:null,trigger:null,lastBatchId:null,lastCaskId:null,lastStatus:'pending',noticedPhase:null,reason:null});
export function generationStatus(s){
 if(!generationMode(s))return null;const a=s.generations.active;
 return {...structuredClone(a),tenureMonths:s.core.month-a.startedMonth,needsNotice:a.phase!=='working'&&a.noticedPhase!==a.phase};
}
export const generationNeedsClock=s=>generationMode(s)&&s.generations.active.phase!=='review';
export function finalBatchProvenance(s,caskId){
 if(!generationMode(s))return null;const r=s.generations.completed.find(r=>r.lastCaskId===caskId);return r?structuredClone(r):null;
}
export function generationReview(s,reason){
 const a=s.generations.active;a.phase='review';a.reason=reason;
 a.lastStatus=a.lastCaskId!==null?'filled':a.lastBatchId!==null?'unfinished':'not-made';return s;
}
export function fixGeneration(s,trigger){
 const a=s.generations.active;if(a.phase!=='working')return s;
 a.phase='last-batch';a.fixedMonth=s.core.month;a.trigger=structuredClone(trigger);return s;
}
// Called only on a completed public transaction; no new saved event stream.
export function advanceGeneration(s,key,value){
 if(!generationMode(s))return s;const a=s.generations.active,month=s.core.month,tenure=month-a.startedMonth;
 if(a.phase==='working'){
  let trigger=null;
  if(tenure>=GENERATIONS.lateMonths){
   if(key==='bottle'||key==='bottle-branded'){
    const r=s.result,release=s.releases.find(x=>x.productId===r?.productId),brand=s.brands.find(b=>b.id===release?.brandId);
    if(release&&brand&&month-brand.createdMonth>=GENERATIONS.brandMonths&&s.releases.some(x=>x.brandId===brand.id&&x.id!==release.id))trigger={kind:'brand-rerelease',month,brandId:brand.id,releaseId:release.id,productId:release.productId,caskId:release.caskId};
    else if(r?.age>=GENERATIONS.matureMonths)trigger={kind:'mature-bottling',month,productId:r.productId,caskId:r.caskId,...(release?{brandId:release.brandId,releaseId:release.id}:{})};
   }
   if(key==='stockist-deliver'||key==='stockist-accept-delivery'){
    const d=s.shop.deliveries.at(-1),r=s.shop.relations.find(r=>r.brandId===d?.brandId&&r.shopId===d?.shopId);
    if(d&&r&&month-r.startedMonth>=GENERATIONS.shopMonths)trigger={kind:'long-shop-delivery',month,deliveryId:d.id,shopId:d.shopId,brandId:d.brandId,releaseId:d.releaseId,productId:d.productId};
   }
  }
  if(trigger)fixGeneration(s,trigger);else if(tenure>=GENERATIONS.hardMonths)fixGeneration(s,{kind:'tenure-limit',month});
 }
 if(a.phase==='last-batch'){
  if(key==='start'&&a.lastBatchId===null)a.lastBatchId=s.still.batch.id;
  const c=a.lastBatchId===null?null:s.core.casks.find(c=>c.batchId===a.lastBatchId);
  if(c){a.lastCaskId=c.id;generationReview(s,'final-filled');}
  else if(month-a.fixedMonth>=GENERATIONS.graceMonths)generationReview(s,'grace-ended');
 }
 return s;
}
