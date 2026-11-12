// Production recall sidecar. Formal state is read-only; no replay or game RNG.
const assert=(value,message='回想の記録を確認できません。')=>{if(!value)throw Error(message);};
import {createObserverState,observeOperation,materializeTownFact,resolveChain} from './observe.mjs?v=bar-v01-1&perf=v06';
import {order,before,world,selectC,selectionSeed,selectionSourceSha256} from './selection.mjs';
export const collectorVersion='recall/1';
const clone=x=>JSON.parse(JSON.stringify(x));
// Integrity marker, not a security signature. The reader also validates formal references.
const digest=x=>{const text=JSON.stringify(x);let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');};
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
const useful=e=>world(e)||['fill','bottling'].includes(e.kind);
function createCollector(mode='small',seed=42){assert(mode==='small','Only small retention is supported');return {version:collectorVersion,mode,seed,observer:createObserverState(),facts:{},active:{},anchors:{},pins:{},originIds:{},routine:{},proofs:{},causalPins:{},batchOrigins:{},completed:[],startMonth:0,generation:1,observed:0,evicted:0,recovered:0};}
function retain(c,id){c.pins[id]=(c.pins[id]??0)+1;}
function drop(c,id){if(id==null)return;c.pins[id]--;if(c.pins[id]<=0){delete c.pins[id];if(!c.active[id]&&c.mode==='small')delete c.facts[id];}}
function anchor(c,key,e){const a=c.anchors[key];if(!a){c.anchors[key]={firstId:e.id,lastId:e.id};retain(c,e.id);retain(c,e.id);}else if(a.lastId!==e.id){retain(c,e.id);const old=a.lastId;a.lastId=e.id;drop(c,old);}}
function groupKeys(e){const out=[];if(e.ids.shopId)out.push('shop:'+e.ids.shopId+':'+e.kind);if(e.ids.regionId)out.push('region:'+e.ids.regionId+':'+e.kind);
 if(e.kind==='delivery')out.push('shop-brand-release:'+JSON.stringify([e.ids.shopId,e.ids.brandId,e.ids.releaseId]));return out;}
function routineKey(e){
 if(e.kind==='arrival')return 'arrival:'+JSON.stringify([e.ids.regionId,e.ids.townReleaseId]);
 if(e.kind==='delivery')return 'delivery:'+JSON.stringify([e.ids.shopId,e.ids.brandId,e.ids.releaseId,Math.floor(e.month/48)]);
 if(e.kind==='sale')return 'sale:'+JSON.stringify([e.ids.releaseId,Math.floor(e.month/48)]);
 return null;
}
function evict(c,id){if(c.causalPins[id])return;if(c.active[id]){delete c.active[id];c.evicted++;}if(!c.pins[id])delete c.facts[id];}
function accept(c,e){
 if(!useful(e))return;
 assert(!c.active[e.id],'Duplicate new fact');c.facts[e.id]=packFact(e);c.active[e.id]=true;c.observed++;
 for(const key of groupKeys(e))anchor(c,key,e);
 if(['fill','bottling'].includes(e.kind)&&!c.originIds[e.id]){c.originIds[e.id]=true;retain(c,e.id);}
 const key=routineKey(e);
 if(c.mode==='small'&&key){const g=c.routine[key];if(!g)c.routine[key]={firstId:e.id,lastId:e.id};else{if(g.lastId!==g.firstId)evict(c,g.lastId);g.lastId=e.id;}}
}
function advanceCollector(c,observation){
 assert(c.version===collectorVersion);const {facts,originUpdates=[]}=observeOperation(c.observer,observation);
 for(const e of facts)accept(c,e);
 for(const origin of originUpdates)if(origin.kind==='fill')c.batchOrigins[origin.eventId]=clone(origin.batch);
 for(const origin of originUpdates)if(origin.kind==='release')assert(origin.origin===null||c.facts['fill:'+origin.origin.caskId],'Missing retained fill provenance');
 for(const e of facts.filter(e=>['inquiry','visit'].includes(e.kind))){
  const chain=resolveChain(observation.after,e.ids.townEventId,c.observer.positionBlocks);
  const arrival=chain.slice(0,-1).filter(r=>r.type==='arrival'&&r.channel!=='direct').at(-1);
  if(!arrival)continue;
  const source=materializeTownFact(observation.after,arrival.id,c.observer);
  if(!c.facts[source.id]){c.facts[source.id]=source;c.recovered++;}
  // The exact source may have left the active pool. It becomes eligible again only
  // when a real later reference proves its relevance, never by same-region guess.
  if(source.generationId===c.generation&&!c.active[source.id])c.active[source.id]=true;
  if(!c.proofs[e.id]){retain(c,source.id);c.causalPins[source.id]=(c.causalPins[source.id]??0)+1;c.proofs[e.id]={sourceId:source.id,chain:chain.map(r=>({id:r.id,month:r.month,releaseId:r.releaseId,sourceId:r.sourceId??null,operationIndex:r.position.operationIndex,nativeOrdinal:r.position.nativeOrdinal})),targetId:e.id};}
 }
 return facts;
}
export function prepareRecall(c,beforeGame,nextOperationIndex=beforeGame.operations.length){
 assertCursor(beforeGame,c);
 assert(nextOperationIndex===c.observer.index+1,'Preview index must be next operation');
 assert(beforeGame.generations.active.id===c.generation,'Wrong retiring generation');
 assert(beforeGame.generations.active.phase==='review','Recall is available only at review');
 const boundary={id:'handover:'+c.generation,kind:'handover',month:beforeGame.core.month,operationIndex:nextOperationIndex,ordinal:0,replayOrdinal:0,generationId:c.generation,ids:{fromGeneration:c.generation,toGeneration:c.generation+1}};
 const events=Object.values(c.facts).map(e=>unpackFact(e,beforeGame)).sort(order),current=Object.keys(c.active).map(id=>unpackFact(c.facts[id],beforeGame)).filter(e=>e.generationId===c.generation);
 assert(events.every(e=>e.operationIndex<nextOperationIndex&&before(e,boundary)),'Future candidate');
 const seed=selectionSeed(c.seed,boundary),scenes=selectC({events,current,boundary,startMonth:c.startMonth,seed});
 const byId=new Map(events.map(e=>[e.id,e]));
 const dependencies=[...new Set(scenes.flatMap(s=>s.links.map(l=>l.sourceId)))].map(id=>clone(byId.get(id)));
 const proofs=scenes.filter(s=>s.links.some(l=>l.causal)).map(s=>clone(c.proofs[s.eventId]));
 assert(proofs.every(Boolean),'Missing frozen causal proof');
 const prepared=clone({version:collectorVersion,inputDigest:digest(c),algorithm:'H3-1 C / '+selectionSourceSha256,seed,generation:c.generation,startMonth:c.startMonth,boundary,cutoff:{month:boundary.month,operationIndex:nextOperationIndex,exclusive:true},candidateCount:current.length,contextCount:events.length,scenes,dependencies,proofs});
 prepared.digest=digest(prepared);return freeze(prepared);
}
function commitRecall(c,prepared,afterGame){
 const {digest:checksum,...body}=prepared;assert(checksum===digest(body),'Prepared recall checksum mismatch');
 assert(prepared.boundary.month===afterGame.core.month&&prepared.startMonth===c.startMonth,'Recall time mismatch');
 assert(prepared.seed===selectionSeed(c.seed,prepared.boundary)&&prepared.algorithm==='H3-1 C / '+selectionSourceSha256,'Recall algorithm mismatch');
 assert(JSON.parse(c.observer.lastKey)?.key==='generation-handover','Not a handover operation');
 assert(prepared.generation===c.generation&&prepared.boundary.operationIndex===c.observer.index,'Stale recall preparation');
 assert(afterGame.generations.active.id===c.generation+1&&afterGame.generations.completed.at(-1)?.id===c.generation,'Handover did not commit');
 // A preview can never include facts emitted by the actual handover operation.
 assert(prepared.scenes.every(s=>s.event.operationIndex<prepared.boundary.operationIndex),'Post-preview fact');
 c.completed.push(clone(prepared));const removed=Object.keys(c.active).length;
 c.active={};c.routine={};for(const p of Object.values(c.proofs))drop(c,p.sourceId);c.proofs={};c.causalPins={};
 if(c.mode==='small')for(const id of Object.keys(c.facts))if(!c.pins[id])delete c.facts[id];
 c.generation++;c.startMonth=prepared.boundary.month;return {removed,retained:Object.keys(c.facts).length};
}
export function collectorCounts(c){return {observed:c.observed,active:Object.keys(c.active).length,retained:Object.keys(c.facts).length,anchors:Object.keys(c.anchors).length,origins:Object.keys(c.originIds).length,proofs:Object.keys(c.proofs).length,positionBlocks:c.observer.positionBlocks.length,completed:c.completed.length,evicted:c.evicted,recovered:c.recovered};}

// Origin candidates keep positions and IDs only. Immutable release details and
// bottle identity already belong to the formal game (and S4); do not save them twice.
function packFact(e){
 if(!['fill','bottling'].includes(e.kind))return clone(e);
 const {label,scene,evidence,...fact}=e;
 return {...clone(fact),originReference:true,...(e.kind==='fill'?{caskType:scene.caskType}:{})};
}
function unpackFact(e,game){
 if(!e?.originReference)return e;
 const {originReference,caskType,ordinal,replayOrdinal,...fact}=e;
 if(e.kind==='fill')return {...fact,label:'原酒を樽に詰めた。',scene:{kind:'production',entity:{id:e.ids.caskId,name:'貯蔵庫'},caskType},evidence:{record:'core.casks',sourceId:String(e.ids.caskId)},ordinal,replayOrdinal};
 const r=game.releases.find(r=>r.id===e.ids.releaseId),brand=game.brands.find(b=>b.id===r?.brandId);
 assert(r&&brand,'Missing formal release reference');
 const bottle={id:brand.id,name:brand.name,shape:brand.bottle,label:brand.label},age=r.age%12===0?r.age/12+'年':r.age+'か月';
 return {...fact,label:`${age}熟成の「${bottle.name}」を${r.bottles}本、瓶詰めした。`,scene:{kind:'production',entity:{id:'bottling',name:'瓶詰め'},bottle},evidence:{record:'releases',sourceId:String(r.id),flavorName:r.flavorName},ordinal,replayOrdinal};
}
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const integer=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const lists=game=>({town:game.labConnection?.town?.events??[],shipments:game.labConnection?.town?.shipments??[],deliveries:game.shop?.deliveries??[],releases:game.releases??[],relations:game.shop?.relations??[],completed:game.generations?.completed??[]});
function assertCursor(game,c){
 assert(c?.version===collectorVersion&&c.mode==='small'&&c.seed===game.seed,'Wrong recall version or game');
 assert(c.observer?.index===game.operations.length-1,'Recall operation boundary mismatch');
 assert(c.generation===(game.generations?.active?.id??1)&&c.startMonth===(game.generations?.active?.startedMonth??0),'Recall generation mismatch');
 assert(c.observer.lastKey===JSON.stringify(game.operations.at(-1)??null),'Recall last operation mismatch');
 for(const [key,rows] of Object.entries(lists(game)))assert(c.observer.counts[key]===rows.length,'Recall source count mismatch '+key);
}
export function initializeRecall(game){
 assert(game?.origin===null&&game.core.month===0&&game.core.casks.length===0&&game.releases.length===0&&game.generations?.active?.id===1,'Recall requires a new game');
 assert(game.operations.every(o=>o.key.startsWith('enable-')||o.key==='adopt-placement'),'Cannot reconstruct old recall');
 const c=createCollector('small',game.seed);c.observer=createObserverState(game);
 seal(c);return assertRecall(game,c);
}
// One live public native call at a time. Partial distillation has no formal op;
// the later stop/complete-usual observation supplies the durable facts.
export function advanceRecall(beforeGame,afterGame,record,{prepared=null}={}){
 assertCursor(beforeGame,record);
 const count=afterGame.operations.length-beforeGame.operations.length;
 assert(afterGame.seed===beforeGame.seed&&count>=0&&count<=1,'Observe each formal operation separately');
 assert(afterGame.operations.slice(0,beforeGame.operations.length).every((o,i)=>same(o,beforeGame.operations[i])),'Recall operation branch changed');
 if(count===0){assertCursor(afterGame,record);return record;}
 const op=afterGame.operations.at(-1),handover=op.key==='generation-handover';
 if(handover){prepared??=prepareRecall(record,beforeGame);assert(prepared.inputDigest===digest(record),'Stale recall preparation');assert(prepared.boundary.operationIndex===beforeGame.operations.length&&prepared.boundary.month===beforeGame.core.month&&prepared.generation===beforeGame.generations.active.id,'Stale recall boundary');}
 else assert(afterGame.generations.active.id===beforeGame.generations.active.id,'Unobserved generation change');
 const next=clone(record);advanceCollector(next,{index:beforeGame.operations.length,operation:op,before:beforeGame,after:afterGame});
 if(handover)commitRecall(next,prepared,afterGame);
 seal(next);assertCursor(afterGame,next);return next;
}
function checkFrozen(p,game){
 assert(object(p)&&p.version===collectorVersion&&typeof p.algorithm==='string'&&integer(p.seed)&&integer(p.generation,1),'Invalid frozen recall');
 const {digest:checksum,...body}=p;assert(checksum===digest(body),'Frozen recall checksum mismatch');
 const era=game.generations.completed.find(e=>e.id===p.generation),b=p.boundary;
 assert(era&&object(b)&&b.month===era.endedMonth&&p.startMonth===era.startedMonth&&b.generationId===era.id&&b.ids?.fromGeneration===era.id&&b.ids?.toGeneration===era.id+1,'Frozen generation boundary mismatch');
 assert(game.operations[b.operationIndex]?.key==='generation-handover'&&game.operations[b.operationIndex].value?.id===era.id,'Frozen operation boundary mismatch');
 assert(p.cutoff?.exclusive===true&&p.cutoff.month===b.month&&p.cutoff.operationIndex===b.operationIndex,'Invalid frozen cutoff');
 assert(Array.isArray(p.scenes)&&Array.isArray(p.dependencies)&&Array.isArray(p.proofs),'Invalid frozen scenes');
 const ids=new Set();let previous=null;
 for(const s of p.scenes){assert(object(s)&&object(s.event)&&s.eventId===s.event.id&&!ids.has(s.eventId)&&typeof s.sentence==='string'&&object(s.illustration)&&Array.isArray(s.links),'Invalid frozen scene');ids.add(s.eventId);assert(s.month===s.event.month&&s.event.operationIndex<b.operationIndex&&s.month<=b.month,'Future frozen fact');assert(!previous||order(previous,s.event)<=0,'Frozen order mismatch');previous=s.event;}
 const dependencies=new Set([...p.scenes.map(s=>s.eventId),...p.dependencies.map(e=>e.id)]);
 for(const s of p.scenes)for(const l of s.links)assert(dependencies.has(l.sourceId),'Missing frozen dependency');
}
function seal(c){delete c.integrity;c.integrity=digest(c);return c;}
export function assertRecall(game,c,historyRecord=null){
 assertCursor(game,c);
 const {integrity,...body}=c;assert(typeof integrity==='string'&&integrity===digest(body),'Recall integrity mismatch');
 assert(object(c.observer)&&c.observer.version===1&&Array.isArray(c.observer.positionBlocks)&&object(c.observer.origins)&&object(c.observer.comment),'Invalid observer');
 for(const key of ['facts','active','anchors','pins','originIds','routine','proofs','causalPins','batchOrigins'])assert(object(c[key]),'Invalid recall '+key);
 for(const key of ['observed','evicted','recovered'])assert(integer(c[key]),'Invalid recall counter');
 assert(Array.isArray(c.completed)&&c.completed.length===game.generations.completed.length,'Missing completed recall');
 const town=game.labConnection?.town?.events??[];let end=0,previousIndex=-2;
 for(const b of c.observer.positionBlocks){
  assert(object(b)&&b.first===end+1&&integer(b.last,1)&&b.last>=b.first&&b.last<=town.length&&integer(b.operationIndex)&&b.operationIndex>previousIndex&&b.operationIndex<=c.observer.index,'Invalid town position block');
  assert(integer(b.generationId,1)&&b.generationId<=c.generation&&object(b.townBases)&&typeof b.operationKey==='string'&&game.operations[b.operationIndex]?.key===b.operationKey,'Invalid town operation');
  const era=[...game.generations.completed,game.generations.active].find(g=>g.id===b.generationId);assert(era,'Missing position generation');
  for(let n=b.first;n<=b.last;n++){const e=town[n-1];assert(e?.id==='e'+n&&e.month>=era.startedMonth&&(era.endedMonth==null||e.month<=era.endedMonth),'Town position ID or month mismatch');}
  end=b.last;previousIndex=b.operationIndex;
 }
 assert(end===town.length,'Missing town positions');
 const fills=new Map(Object.values(c.facts).filter(e=>e.kind==='fill').map(e=>[e.ids.caskId,e]));
 for(const [id,e] of Object.entries(c.facts)){
  assert(object(e)&&e.id===id&&useful(e)&&integer(e.month)&&e.month<=game.core.month&&integer(e.operationIndex)&&e.operationIndex<=c.observer.index&&integer(e.generationId,1)&&e.generationId<=c.generation&&integer(e.ordinal)&&object(e.ids),'Invalid recall fact');
  assert(game.operations[e.operationIndex]?.key===e.operationKey,'Fact operation mismatch');
  if(e.ids.townEventId){const native=materializeTownFact(game,e.ids.townEventId,c.observer);assert(same(e,native),'Town fact mismatch');}
  if(e.kind==='bottling'){
   const r=game.releases.find(r=>r.id===e.ids.releaseId);assert(r&&r.productId===e.ids.productId&&r.caskId===e.ids.caskId&&r.bottledMonth===e.month&&r.bottles===e.ids.count&&r.age===e.ids.age,'Release reference mismatch');
   const fill=fills.get(r.caskId);assert(fill&&fill.operationIndex<e.operationIndex,'Missing fill provenance');
   if(historyRecord){const h=historyRecord.events.find(h=>h.kind==='bottling'&&h.releaseId===r.id);assert(h&&h.productId===r.productId&&h.sourceGeneration===fill.generationId&&h.generationNumber===e.generationId,'S4 provenance mismatch');}
  }
  if(e.kind==='fill'){assert(e.originReference===true&&integer(e.ids.caskId,1)&&object(c.batchOrigins[id]),'Missing batch provenance');const b=c.batchOrigins[id];assert(b.batchId===e.ids.batchId&&integer(b.generationId,1)&&b.generationId<=e.generationId&&integer(b.operationIndex)&&b.operationIndex<e.operationIndex&&['start','start-usual'].includes(game.operations[b.operationIndex]?.key),'Invalid batch start provenance');}
 }
 const pinCounts={};const pin=id=>{assert(c.facts[id],'Dangling recall reference');pinCounts[id]=(pinCounts[id]??0)+1;};
 for(const a of Object.values(c.anchors)){assert(object(a),'Invalid anchor');pin(a.firstId);pin(a.lastId);}
 for(const [id,value] of Object.entries(c.originIds)){assert(value===true&&['fill','bottling'].includes(c.facts[id]?.kind),'Invalid origin pin');pin(id);}
 const causal={};
 for(const [id,p] of Object.entries(c.proofs)){
  assert(p.targetId===id&&c.facts[id]&&['inquiry','visit'].includes(c.facts[id].kind),'Invalid causal target');pin(p.sourceId);causal[p.sourceId]=(causal[p.sourceId]??0)+1;
  const chain=resolveChain(game,c.facts[id].ids.townEventId,c.observer.positionBlocks).map(r=>({id:r.id,month:r.month,releaseId:r.releaseId,sourceId:r.sourceId??null,operationIndex:r.position.operationIndex,nativeOrdinal:r.position.nativeOrdinal}));
  assert(same(chain,p.chain)&&chain.slice(0,-1).some(r=>'arrival:'+r.id===p.sourceId),'Invalid causal proof');
 }
 for(const [id,n] of Object.entries(c.pins))assert(n===pinCounts[id]&&integer(n,1),'Invalid retention count');assert(Object.keys(c.pins).length===Object.keys(pinCounts).length,'Missing retention count');
 assert(same(Object.entries(c.causalPins).sort(),Object.entries(causal).sort()),'Invalid causal pin count');
 for(const [id,value] of Object.entries(c.active))assert(value===true&&c.facts[id]?.generationId===c.generation,'Invalid active candidate');
 for(const g of Object.values(c.routine))assert(object(g)&&c.facts[g.firstId]&&c.facts[g.lastId],'Invalid routine references');
 for(let i=0;i<c.completed.length;i++){assert(c.completed[i].generation===game.generations.completed[i].id,'Completed recall order mismatch');checkFrozen(c.completed[i],game);}
 return c;
}
// Read stored scene bodies directly. No selector, replay, or current wording runs.
export function readCompletedRecalls(c,generation=null){
 assert(c?.version===collectorVersion&&Array.isArray(c.completed),'Invalid recall record');
 return clone(generation===null?c.completed:c.completed.find(p=>p.generation===generation)??null);
}
