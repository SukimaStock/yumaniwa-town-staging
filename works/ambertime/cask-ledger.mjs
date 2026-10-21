import {buildReleaseLedger} from './ledger-view.mjs';

// A disposable view. The optional observer is the existing public cold replay;
// no operation, saved state, or economic value is changed here.
const copy=x=>x==null?null:structuredClone(x);
const known=x=>x!==null&&x!==undefined;
const number=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const first=(...xs)=>xs.find(known)??null;
const signature=x=>JSON.stringify(x,(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value);
const profile=c=>c?Object.fromEntries(['roughness','character','wood','litres'].filter(k=>known(c[k])).map(k=>[k,c[k]])):null;
const chronology=rows=>rows?.sort((a,b)=>(number(a.age)??Infinity)-(number(b.age)??Infinity)||(number(a.month)??Infinity)-(number(b.month)??Infinity))??null;

export function buildCaskLedger(state,{facts,replay}={}){
 const sources=new Map(),manuals=new Map(),fills=new Map(),initial=new Map(),casks=new Map(),notes=new Map(),volumes=new Map();
 const coverage={complete:facts?.coverage?.complete===true,fromMonth:number(facts?.coverage?.fromMonth),replayed:typeof replay==='function'};
 function ensure(id){if(!known(id))return false;if(!sources.has(id))sources.set(id,{});return true;}
 function merge(id,values){if(ensure(id))Object.assign(sources.get(id),Object.fromEntries(Object.entries(values).filter(([,v])=>known(v))));}
 function rows(id,key,items){
  if(!Array.isArray(items)||!ensure(id))return;
  if(!notes.has(id))notes.set(id,{});const target=notes.get(id);target[key]??=new Map();
  for(const item of items)target[key].set(signature(item),copy(item));
 }
 function note(id,n){if(!n)return;for(const key of ['samples','choices','observations'])rows(id,key,n[key]);for(const sample of n.samples??[])volume(id,{age:number(sample.age),month:number(sample.month),litres:number(sample.profile?.litres),profile:copy(sample.profile),source:'sample'});}
 function volume(id,item){
  if(!ensure(id)||number(item.litres)===null)return;if(!volumes.has(id))volumes.set(id,new Map());
  const entries=volumes.get(id),key=signature({...item,month:null}),old=entries.get(key);
  entries.set(key,copy({...item,month:first(item.month,old?.month)}));
 }
 function cask(c){
  if(!c||!ensure(c.id))return;casks.set(c.id,copy(c));
  merge(c.id,{batchId:c.batchId,type:c.type,cut:c.cut,filledMonth:c.filledMonth});rows(c.id,'history',c.history);
 }
 function record(r){
  if(!ensure(r.caskId))return;merge(r.caskId,{batchId:r.batchId,type:r.type,cut:r.cut,distilledMonth:r.distilledMonth});note(r.caskId,r);
  const source=sources.get(r.caskId);source.record=copy(r);
  volume(r.caskId,{age:number(r.age),month:number(r.bottledMonth),litres:first(number(r.sourceLitres),number(r.profile?.litres)),profile:copy(r.profile),source:'bottle'});
 }
 function snapshot(s){
  if(!s)return;
  for(const r of s.records??[])record(r);
  for(const r of s.releases??[])merge(r.caskId,{batchId:r.batchId,type:r.type,cut:r.cut,release:copy(r)});
  for(const c of [...(s.core?.archive??[]),...(s.core?.casks??[])])cask(c);
  for(const [id,n] of Object.entries(s.notesById??{})){const actual=[...(s.core?.casks??[]),...(s.core?.archive??[])].find(c=>String(c.id)===id)?.id??Number(id);note(actual,n);}
  for(const [id,b] of Object.entries(s.batchesById??{}))merge(Number(id),{batchId:b.id,distilledMonth:b.startedMonth});
 }
 // Surviving older-version snapshots are evidence, never a reconstructed past.
 const origins=[];for(let s=state.origin;s;s=s.origin)origins.unshift(s);for(const s of origins)snapshot(s);
 if(typeof replay==='function')replay(({operation,before,after})=>{
  snapshot(after);
  if(!operation)return;
  const newCasks=(after.core?.casks??[]).filter(c=>!before?.core?.casks?.some(old=>old.id===c.id));
  for(const c of newCasks){
   initial.set(c.id,profile(c));
   const manual=operation.key==='fill';
   merge(c.id,{manual,stopAt:manual?before?.still?.distillation?.progress:before?.usual?.reservation?.recipe?.stopAt,commissionedFrom:manual?null:before?.usual?.reservation?.source});
   volume(c.id,{age:number(c.age),month:number(c.filledMonth),litres:number(c.litres),profile:profile(c),source:'fill'});
  }
  if(['sample','care','free-care'].includes(operation.key)||operation.key==='choose'&&operation.value?.key==='cool'){
   const id=operation.key==='sample'||operation.key==='care'?operation.value:operation.value?.id;
   const c=after.core?.casks?.find(c=>c.id===id);
   if(c)volume(id,{age:number(c.age),month:number(after.core.month),litres:number(c.litres),profile:profile(c),source:operation.key==='sample'?'sample':'care'});
  }
 });
 snapshot(state);
 for(const f of facts?.casks??[]){fills.set(f.caskId,f);merge(f.caskId,f);}
 for(const m of facts?.manualSources??[]){if(ensure(m.caskId)){manuals.set(m.caskId,copy(m));merge(m.caskId,{...m,manual:true});}}
 for(const recipe of state.recipeBook?.entries??[])if(recipe.source){
  const id=recipe.source.caskId,existing=sources.get(id)??{};
  merge(id,{...recipe.source,type:first(existing.type,recipe.type),stopAt:first(existing.stopAt,recipe.stopAt)});
 }
 const releases=buildReleaseLedger(state,{facts}).entries;
 for(const r of releases)ensure(r.caskId);
 function recipe(source,saved=null){
  const id=source?.caskId,fill=fills.get(id),details=sources.get(id)??{};
  return {key:saved?`recipe:${saved.id}`:`manual:${id}`,id:saved?.id??null,name:saved?.name??null,caskId:id??null,batchId:first(source?.batchId,details.batchId),stopAt:first(saved?.stopAt,source?.stopAt,fill?.stopAt,details.stopAt),type:first(saved?.type,source?.type,fill?.type,details.type),filledMonth:first(source?.filledMonth,details.filledMonth),generationId:source?.generationId??null,source:copy(source),saved:!!saved,selected:saved?state.recipeBook?.selectedId===saved.id:state.recipeBook?.selectedId==null};
 }
 const saved=(state.recipeBook?.entries??[]).map(r=>recipe(r.source,r)),savedIds=new Set(saved.map(r=>r.caskId));
 const manualList=[...manuals.values()];
 const result=[...sources].map(([id,s])=>{
  const c=casks.get(id),r=s.record??s.release,n=notes.get(id),live=state.core?.casks?.some(c=>c.id===id),archive=state.core?.archive?.find(c=>c.id===id),fill=fills.get(id),manualSource=manuals.get(id)??fill?.manualSource??null;
  return {key:`cask:${id}`,caskId:id,batchId:first(c?.batchId,s.batchId),type:first(c?.type,s.type),cut:first(number(c?.cut),number(s.cut)),filledMonth:first(number(c?.filledMonth),number(s.filledMonth)),distilledMonth:number(s.distilledMonth),stopAt:number(s.stopAt),manual:first(s.manual,manualSource?true:null),manualSource:copy(manualSource),commissionedFrom:copy(s.commissionedFrom),initialProfile:copy(initial.get(id)),profile:copy(c?profile(c):r?.profile),age:first(number(c?.age),number(r?.age)),litres:first(number(c?.litres),number(r?.sourceLitres),number(r?.profile?.litres)),initialLitres:first(number(c?.initialLitres),number(r?.initialLitres)),status:live?'aging':known(archive?.bottledMonth)||known(c?.bottledMonth)?'bottled':known(archive?.endedMonth)||known(c?.endedMonth)?'ended':null,bottledMonth:first(number(archive?.bottledMonth),number(c?.bottledMonth)),endedMonth:first(number(archive?.endedMonth),number(c?.endedMonth)),endReason:first(archive?.endReason,c?.endReason),samples:chronology(n?.samples?[...n.samples.values()]:null),choices:chronology(n?.choices?[...n.choices.values()]:null),observations:chronology(n?.observations?[...n.observations.values()]:null),history:n?.history?[...n.history.values()].sort((a,b)=>(number(a.month)??Infinity)-(number(b.month)??Infinity)):null,volumeHistory:chronology(volumes.has(id)?[...volumes.get(id).values()]:null),releaseKeys:releases.filter(r=>r.caskId===id).map(r=>r.key)};
 });
 result.sort((a,b)=>(a.filledMonth??Infinity)-(b.filledMonth??Infinity)||String(a.caskId).localeCompare(String(b.caskId),undefined,{numeric:true}));
 return {recipes:{latestManual:manualList.length?recipe(manualList.at(-1)):null,saved,unsaved:manualList.filter(m=>!savedIds.has(m.caskId)).map(m=>recipe(m))},casks:result,coverage};
}
