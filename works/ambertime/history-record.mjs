import {NODES} from './town-connection.mjs?v=stage4-r2&perf=v06';
// Incremental presentation facts. No game operations, snapshots or replay entry point.
const copy=x=>structuredClone(x),ok=(v)=>{if(!v)throw Error('歩みの記録を確認できません。');};
const rows=s=>[...(s.generations?.completed??[]),...(s.generations?.active?[s.generations.active]:[])];
const shopId=r=>r.shopId??'town-liquor';
const delta=(a,b,key='id')=>{const old=new Set((b??[]).map(x=>x[key]));return (a??[]).filter(x=>!old.has(x[key]));};
const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o?.[k]!==undefined).map(k=>[k,copy(o[k])]));
const number=n=>Number.isFinite(n)?n:null;
const estate=s=>({casks:s.core.casks.length,cash:s.core.cash});
const eraRow=e=>({id:e.id,startedMonth:e.startedMonth,endedMonth:e.endedMonth??null,completed:e.endedMonth!=null,totals:{filled:0,bottled:0,sold:0},coverage:{complete:true,fromMonth:e.startedMonth},events:[],lastStatus:e.lastStatus??null,lastCaskId:e.lastCaskId??null,lastBatchId:e.lastBatchId??null,estate:{casks:null,cash:null},mature:false});
export function initializeHistoryRecord(game){
 ok(game.origin===null&&game.core.month===0&&game.core.casks.length===0&&(game.releases??[]).length===0&&(game.core.totals?.bottlesSold??0)===0&&game.operations.every(o=>o.key.startsWith('enable-')||o.key==='adopt-placement'));
 const record={version:1,operationCount:game.operations.length,month:0,events:[{id:'generation-start:1',kind:'generation-start',month:0,order:0,operationIndex:-1,generationNumber:1,generationId:1}],evidence:[],generations:rows(game).map(e=>({...eraRow(e),estate:estate(game)})),contacts:[],relationships:[],caskOrigins:[]};
 return assertHistoryRecord(game,record);
}
function refreshEra(record,after){
 for(const e of rows(after)){let r=record.generations.find(r=>r.id===e.id);if(!r){r=eraRow(e);record.generations.push(r);}Object.assign(r,pick(e,['startedMonth','endedMonth','lastStatus','lastCaskId','lastBatchId']));r.completed=e.endedMonth!=null;if(!r.completed)r.estate=estate(after);}
}
export function advanceHistoryRecord(before,after,record){
 assertHistoryRecord(before,record);ok(before.seed===after.seed&&after.operations.length>=before.operations.length&&after.core.month>=before.core.month);
 const next=copy(record),operationIndex=after.operations.length-1,ops=after.operations.slice(before.operations.length),actor=before.generations?.active?.id??after.generations?.active?.id??1;
 const existing=new Set(next.events.map(e=>e.id));
 const add=(kind,id,month,data={})=>{if(existing.has(id))return;ok(Number.isInteger(month)&&month>=0&&month<=after.core.month);existing.add(id);next.events.push({id,kind,month,order:next.events.length,operationIndex,generationNumber:actor,...copy(data)});};
 const incomingCasks=delta(after.core.casks,before.core.casks),products=delta(after.core.products,before.core.products),releases=delta(after.releases,before.releases);
 for(const c of incomingCasks)next.caskOrigins.push({caskId:c.id,generationId:actor});
 const active=next.generations.find(g=>g.id===before.generations?.active?.id);
 if(active&&!active.completed){
  active.totals.filled+=incomingCasks.length;
  for(const p of products){ok(Number.isFinite(p.originalStock));active.totals.bottled+=p.originalStock;}
  const sold=after.core.totals.bottlesSold-before.core.totals.bottlesSold;ok(Number.isFinite(sold)&&sold>=0);active.totals.sold+=sold;
 }
 const summaryEvent=e=>{if(active&&!active.completed&&active.events.length<2)active.events.push(e);};
 if(!next.events.some(e=>e.kind==='distillation')&&ops.some(o=>o.key==='stop'||o.key==='complete-usual')){
  const c=after.core.spirit??incomingCasks[0],batch=after.still?.batch??before.still?.batch;
  ok(c&&batch);const completionOffset=ops.findIndex(o=>o.key==='stop'||o.key==='complete-usual'),trailingMonths=ops.slice(completionOffset+1).filter(o=>o.key==='month').length;ok(trailingMonths<=after.core.month-before.core.month);add('distillation',`distillation:${batch.id}`,after.core.month-trailingMonths,{batchId:batch.id,startedMonth:batch.startedMonth,...pick(c,['cut','roughness','character']),profile:pick(c,['roughness','character','wood']),sourceOperation:ops[completionOffset].key,operationIndex:before.operations.length+completionOffset});
 }
 let maxAge=Math.max(-1,...next.events.filter(e=>e.kind==='bottling').map(e=>e.age));
 for(const r of releases){
  const c=before.core.casks.find(c=>c.id===r.caskId)??after.core.archive?.find(c=>c.id===r.caskId),b=before.batchesById?.[r.caskId]??after.batchesById?.[r.caskId];
  const first=!next.events.some(e=>e.kind==='bottling'),longest=r.age>maxAge;maxAge=Math.max(maxAge,r.age);
  const sourceEra=next.caskOrigins.find(e=>e.caskId===r.caskId);ok(sourceEra);
  add('bottling',`bottling:${r.productId}`,r.bottledMonth,{...pick(r,['brandId','productId','caskId','batchId','age','type','cut','profile']),releaseId:r.id,brandName:after.brands.find(b=>b.id===r.brandId)?.name??'',count:r.bottles,firstRelease:first,longestAge:longest,rerelease:!first,filledMonth:c?.filledMonth??null,distilledMonth:b?.startedMonth??null,...(sourceEra?{sourceGeneration:sourceEra.generationId}: {})});
 }
 const newRelations=delta((after.shop?.relations??[]).map(r=>({...r,key:shopId(r)+':'+r.brandId})),(before.shop?.relations??[]).map(r=>({...r,key:shopId(r)+':'+r.brandId})),'key');
 for(const rel of newRelations){const id=shopId(rel);if(!next.events.some(e=>e.kind==='shop-start'&&e.shopId===id)){add('shop-start',`shop-start:${id}`,rel.startedMonth,{shopId:id,brandId:rel.brandId});if(id!=='department')summaryEvent({kind:'shop-start',month:after.core.month,shopId:id});}}
 for(const d of delta(after.shop?.deliveries,before.shop?.deliveries)){
  if(!(d.count>0))continue;
  const id=shopId(d),key=id+':'+d.brandId;let relation=next.relationships.find(r=>r.key===key);
  if(!relation){relation={key,shopId:id,brandId:d.brandId,firstMonth:d.month,lastMonth:d.month,firstDeliveryId:d.id,lastDeliveryId:d.id,continuousFrom:d.month,continuousDeliveryId:d.id,milestone:0,deliveries:0,bottles:0,revenueCents:0,adoptions:0};next.relationships.push(relation);}
  // A continuity claim needs a real positive delivery at least once every 12 months.
  if(d.month-relation.lastMonth>12){relation.continuousFrom=d.month;relation.continuousDeliveryId=d.id;relation.milestone=0;}
  relation.lastMonth=d.month;relation.lastDeliveryId=d.id;relation.deliveries++;relation.bottles+=d.count;relation.revenueCents+=Math.round((d.revenue??0)*100);
  const anniversary=Math.floor((d.month-relation.continuousFrom)/120);
  if(anniversary>relation.milestone){relation.milestone=anniversary;add('shop-anniversary',`shop-anniversary:${key}:${relation.continuousFrom}:${anniversary}`,d.month,{shopId:id,brandId:d.brandId,years:anniversary*10,fromMonth:relation.continuousFrom,deliveryId:d.id,firstDeliveryId:relation.continuousDeliveryId});}
  const adoption=(after.department?.adoptions??[]).find(a=>a.deliveryId===d.id&&id==='department');
  if(adoption){relation.adoptions++;const e={shopId:id,brandId:d.brandId,releaseId:d.releaseId??null,productId:d.productId??null,deliveryId:d.id,count:d.count,...pick(adoption,['projectId','projectName','selectionId'])};add('department-adoption',`shop-delivery:${d.id}`,d.month,e);summaryEvent({kind:'department-adoption',month:d.month,shopId:id,releaseId:d.releaseId??null,productId:d.productId??null});}
 }
 if(active&&!active.completed)for(const p of products)if(!active.mature&&p.age>=36){active.mature=true;summaryEvent({kind:'mature-bottling',month:after.core.month,releaseId:after.releases.find(r=>r.productId===p.id)?.id??null,productId:p.id,age:p.age});}
 const town=after.labConnection?.town,priorTown=before.labConnection?.town;
 if(town){
  const evidenceIds=new Set(next.evidence.map(e=>e.id)),sourceMap={get:id=>town.events[Number(id?.slice(1))-1]?.id===id?town.events[Number(id.slice(1))-1]:undefined};
  const retain=id=>{const seen=new Set();while(id&&!evidenceIds.has(id)){ok(!seen.has(id));seen.add(id);const e=sourceMap.get(id);ok(e);next.evidence.push(pick(e,['id','type','month','sourceId','releaseId','mainReleaseId','productId','from','to','channel','shipmentId','memoryId']));evidenceIds.add(id);id=e.sourceId;}};
  for(const e of town.events.slice(priorTown?.events.length??0)){
   if(!['arrival','inquiry','visit'].includes(e.type))continue;
   const place=e.type==='visit'?e.from:e.to;ok(typeof place==='string');
   if(e.type!=='arrival'&&NODES.find(n=>n.id===place)?.level==='町')continue;
   const key=e.type+':'+place;let contact=next.contacts.find(c=>c.key===key);const first=!contact,gap=contact?e.month-contact.lastMonth:null;
   // Per location and kind: first reached region, or first/after >=10 quiet years response.
   const selected=e.type==='arrival'?first:first||gap>=120;
   if(!contact){contact={key,firstMonth:e.month,lastMonth:e.month,lastId:e.id};next.contacts.push(contact);}else{contact.lastMonth=e.month;contact.lastId=e.id;}
   if(!selected)continue;
   retain(e.id);add(e.type==='arrival'?'region-reached':e.type,`town:${e.id}`,e.month,{regionId:place,releaseId:e.mainReleaseId??null,productId:e.productId??null,sourceEventId:e.id,sourceId:e.sourceId,first,...(!first?{afterMonths:gap}:{})});
  }
 }
 for(const h of delta((after.trade?.history??[]).map(h=>({...h,key:JSON.stringify(h)})),(before.trade?.history??[]).map(h=>({...h,key:JSON.stringify(h)})),'key')){
  if(h.kind==='order-fulfilled'||h.kind==='shipped'&&h.orderId!==undefined&&h.outcome==='fulfilled')add('special-order-fulfilled',`special-order-fulfilled:${h.orderId??h.id}:${h.month}`,h.month,{...pick(h,['orderId','caskId','productId','partner']),count:h.bottles??null});
 }
 for(const e of delta(after.generations?.completed,before.generations?.completed)){
  const r=next.generations.find(g=>g.id===e.id);ok(r&&e.id===before.generations.active.id);Object.assign(r,{completed:true,endedMonth:e.endedMonth,lastStatus:e.lastStatus,lastCaskId:e.lastCaskId,lastBatchId:e.lastBatchId,estate:estate(after)});
  add('generation-handover',`generation-handover:${e.id}`,e.endedMonth,{generationId:e.id,generationNumber:e.id,nextGeneration:after.generations.active.id,startedMonth:e.startedMonth,lastCaskId:e.lastCaskId,lastBatchId:e.lastBatchId,lastStatus:e.lastStatus,trigger:copy(e.trigger),reason:e.reason});
 }
 next.caskOrigins=next.caskOrigins.filter(o=>after.core.casks.some(c=>c.id===o.caskId));
 refreshEra(next,after);next.operationCount=after.operations.length;next.month=after.core.month;
 return assertHistoryRecord(after,next);
}
const plain=o=>o&&typeof o==='object'&&!Array.isArray(o);
const exact=(o,keys)=>plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const finite=(o,depth=0)=>depth<12&&(o===null||typeof o==='boolean'||typeof o==='string'&&o.length<=1024||typeof o==='number'&&Number.isFinite(o)||Array.isArray(o)&&o.length<=100000&&o.every(x=>finite(x,depth+1))||plain(o)&&Object.keys(o).length<=40&&Object.values(o).every(x=>finite(x,depth+1)));
const kinds=new Set(['generation-start','distillation','bottling','shop-start','shop-anniversary','region-reached','inquiry','visit','department-adoption','special-order-fulfilled','generation-handover']);
export function assertHistoryRecord(game,r){
 ok(exact(r,['version','operationCount','month','events','evidence','generations','contacts','relationships','caskOrigins'])&&finite(r));
 ok(r&&r.version===1&&r.operationCount===game.operations.length&&r.month===game.core.month&&Array.isArray(r.events)&&Array.isArray(r.evidence)&&Array.isArray(r.generations)&&Array.isArray(r.contacts)&&Array.isArray(r.relationships)&&Array.isArray(r.caskOrigins));
 ok(r.events.length>0&&r.events[0].id==='generation-start:1'&&r.events[0].kind==='generation-start'&&r.events[0].month===0&&r.events[0].generationNumber===1&&new Set(r.events.map(e=>e.id)).size===r.events.length);
 let lastMonth=-1;for(let i=0;i<r.events.length;i++){const e=r.events[i];ok(kinds.has(e.kind)&&typeof e.id==='string'&&e.order===i&&Number.isInteger(e.month)&&e.month>=lastMonth&&e.month<=r.month&&Number.isInteger(e.operationIndex)&&e.operationIndex>=-1&&e.operationIndex<r.operationCount&&Number.isInteger(e.generationNumber)&&e.generationNumber>0);lastMonth=e.month;}
 const releaseEvents=r.events.filter(e=>e.kind==='bottling');ok(releaseEvents.length===(game.releases??[]).length);
 for(const e of releaseEvents){const source=game.releases.find(x=>x.id===e.releaseId);ok(source&&source.productId===e.productId&&source.caskId===e.caskId&&source.bottledMonth===e.month&&source.age===e.age&&source.bottles===e.count&&Number.isSafeInteger(e.sourceGeneration)&&e.sourceGeneration>0&&e.sourceGeneration<=e.generationNumber&&source.brandId===e.brandId&&source.type===e.type&&JSON.stringify(source.profile)===JSON.stringify(e.profile));}
 const townEvents=game.labConnection?.town?.events??[],allTown={get:id=>townEvents[Number(id?.slice(1))-1]?.id===id?townEvents[Number(id.slice(1))-1]:undefined};
 for(const e of r.evidence){const source=allTown.get(e.id);ok(source&&JSON.stringify(e)===JSON.stringify(pick(source,['id','type','month','sourceId','releaseId','mainReleaseId','productId','from','to','channel','shipmentId','memoryId'])));}
 const proofIds=new Set(r.evidence.map(e=>e.id));
 for(const e of r.events){
  if(e.kind==='distillation')ok(e.id===`distillation:${e.batchId}`&&['stop','complete-usual'].includes(e.sourceOperation)&&game.operations[e.operationIndex]?.key===e.sourceOperation);
  if(e.kind==='shop-anniversary')ok(Number.isSafeInteger(e.years)&&e.years>0&&e.years%10===0&&e.month-e.fromMonth>=e.years*12&&(game.shop?.deliveries??[]).some(d=>d.id===e.deliveryId&&shopId(d)===e.shopId&&d.brandId===e.brandId&&d.month===e.month&&d.count>0));
  if(e.kind==='department-adoption')ok((game.department?.adoptions??[]).some(a=>a.deliveryId===e.deliveryId)&&(game.shop?.deliveries??[]).some(d=>d.id===e.deliveryId&&d.month===e.month&&d.productId===e.productId&&d.count===e.count));
  if(['region-reached','inquiry','visit'].includes(e.kind)){const source=allTown.get(e.sourceEventId);ok(source&&proofIds.has(source.id)&&source.month===e.month&&e.sourceId===source.sourceId&&e.regionId===(source.type==='visit'?source.from:source.to)&&e.releaseId===(source.mainReleaseId??null)&&source.type===(e.kind==='region-reached'?'arrival':e.kind));}
  if(e.kind==='shop-start')ok((game.shop?.relations??[]).some(r=>shopId(r)===e.shopId&&r.brandId===e.brandId&&r.startedMonth===e.month));
  if(e.kind==='generation-handover')ok((game.generations?.completed??[]).some(g=>g.id===e.generationId&&g.endedMonth===e.month&&g.lastCaskId===e.lastCaskId&&JSON.stringify(g.trigger)===JSON.stringify(e.trigger)));
 }
 ok(r.caskOrigins.length===game.core.casks.length&&r.caskOrigins.length<=4&&new Set(r.caskOrigins.map(o=>o.caskId)).size===r.caskOrigins.length&&r.caskOrigins.every(o=>exact(o,['caskId','generationId'])&&game.core.casks.some(c=>c.id===o.caskId)&&Number.isSafeInteger(o.generationId)&&o.generationId>0));
 const eras=rows(game);ok(r.generations.length===eras.length&&new Set(r.generations.map(g=>g.id)).size===eras.length);
 for(const g of r.generations){const e=eras.find(e=>e.id===g.id);ok(e&&g.startedMonth===e.startedMonth&&g.completed===(e.endedMonth!=null)&&g.endedMonth===(e.endedMonth??null)&&Object.values(g.totals).every(n=>Number.isFinite(n)&&n>=0)&&g.events.length<=2&&g.lastStatus===(e.lastStatus??null)&&g.lastCaskId===(e.lastCaskId??null)&&g.lastBatchId===(e.lastBatchId??null));}
 ok(new Set(r.evidence.map(e=>e.id)).size===r.evidence.length&&new Set(r.contacts.map(e=>e.key)).size===r.contacts.length&&new Set(r.relationships.map(e=>e.key)).size===r.relationships.length);
 return r;
}
export function historyRecordView(game,record){
 const generations=record.generations.map(g=>{const result=copy(g);delete result.mature;return result;});
 const shops=(game.shop?.relations??[]).map(r=>{const id=shopId(r),d=record.relationships.find(d=>d.key===id+':'+r.brandId);return {shopId:id,brandId:r.brandId,brandName:game.brands.find(b=>b.id===r.brandId)?.name,startedMonth:r.startedMonth,deliveries:d?.deliveries??0,bottles:d?.bottles??0,revenue:(d?.revenueCents??0)/100,firstDeliveryMonth:d?.firstMonth??null,lastDeliveryMonth:d?.lastMonth??null,adoptions:d?.adoptions??0};});
 return {events:copy(record.events),shops,generations,coverage:{complete:true,fromMonth:0,legacy:false,notes:[]},elapsedMonths:game.core.month};
}
