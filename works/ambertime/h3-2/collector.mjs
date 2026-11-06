// Research only. Observer facts and retention policy are separate; no game replay.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createObserverState,observeOperation,materializeTownFact,resolveChain} from './observe.mjs';
import {order,before,world} from '../h3-1/selection.mjs';
import {selectC,selectionSeed,selectionSourceSha256} from './select.mjs';
export const collectorVersion='H3-2/1';
const clone=x=>JSON.parse(JSON.stringify(x));
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
const useful=e=>world(e)||['fill','bottling'].includes(e.kind);
export function createCollector(mode='small',seed=42){assert(['small','broad'].includes(mode));return {version:collectorVersion,mode,seed,observer:createObserverState(),facts:{},active:{},anchors:{},pins:{},originIds:{},routine:{},proofs:{},causalPins:{},batchOrigins:{},completed:[],startMonth:0,generation:1,observed:0,evicted:0,recovered:0};}
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
 assert(!c.active[e.id],'Duplicate new fact');c.facts[e.id]=clone(e);c.active[e.id]=true;c.observed++;
 for(const key of groupKeys(e))anchor(c,key,e);
 if(['fill','bottling'].includes(e.kind)&&!c.originIds[e.id]){c.originIds[e.id]=true;retain(c,e.id);}
 const key=routineKey(e);
 if(c.mode==='small'&&key){const g=c.routine[key];if(!g)c.routine[key]={firstId:e.id,lastId:e.id};else{if(g.lastId!==g.firstId)evict(c,g.lastId);g.lastId=e.id;}}
}
export function advanceCollector(c,observation){
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
export function prepareRecall(c,beforeGame,nextOperationIndex){
 assert(nextOperationIndex===c.observer.index+1,'Preview index must be next operation');
 assert(beforeGame.generations.active.id===c.generation,'Wrong retiring generation');
 assert(beforeGame.generations.active.phase==='review','Recall is available only at review');
 const boundary={id:'handover:'+c.generation,kind:'handover',month:beforeGame.core.month,operationIndex:nextOperationIndex,ordinal:0,replayOrdinal:0,generationId:c.generation,ids:{fromGeneration:c.generation,toGeneration:c.generation+1}};
 const events=Object.values(c.facts).sort(order),current=Object.keys(c.active).map(id=>c.facts[id]).filter(e=>e.generationId===c.generation);
 assert(events.every(e=>e.operationIndex<nextOperationIndex&&before(e,boundary)),'Future candidate');
 const seed=selectionSeed(c.seed,boundary),scenes=selectC({events,current,boundary,startMonth:c.startMonth,seed});
 const byId=new Map(events.map(e=>[e.id,e]));
 const dependencies=[...new Set(scenes.flatMap(s=>s.links.map(l=>l.sourceId)))].map(id=>clone(byId.get(id)));
 const proofs=scenes.filter(s=>s.links.some(l=>l.causal)).map(s=>clone(c.proofs[s.eventId]));
 assert(proofs.every(Boolean),'Missing frozen causal proof');
 const prepared=clone({version:collectorVersion,algorithm:'H3-1 C / '+selectionSourceSha256,seed,generation:c.generation,startMonth:c.startMonth,boundary,cutoff:{month:boundary.month,operationIndex:nextOperationIndex,exclusive:true},candidateCount:current.length,contextCount:events.length,scenes,dependencies,proofs});
 prepared.digest=digest(prepared);return freeze(prepared);
}
export function commitRecall(c,prepared,afterGame){
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
