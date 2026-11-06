// Presentation facts for the daily notebook. Never a game-state or replay cache.
// The only replay entry point is explicit migration of a pre-v5 session.
export const RECENT_LEDGER_LIMIT=8;
const copy=x=>x==null?null:structuredClone(x);
const assert=ok=>{if(!ok)throw Error('帳面の記録を確認できません。元の記録を残して停止しています。');};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const id=n=>Number.isSafeInteger(n)&&n>0;
const profile=c=>c?{...Object.fromEntries(['roughness','character','wood','litres'].filter(k=>Number.isFinite(c[k])).map(k=>[k,c[k]])),...(c.flavor?{flavor:copy(c.flavor)}:{})}:null;
const endingMonth=c=>c.endedMonth??c.bottledMonth??-1;
const releaseKeys=(s,caskId)=>(s.releases??[]).filter(r=>r.caskId===caskId).map(r=>`release:${r.id}`);
function fillFact(c,s,keys=releaseKeys(s,c.id)){return {caskId:c.id,batchId:c.batchId??null,type:c.type,filledMonth:c.filledMonth??null,distilledMonth:s.batchesById?.[c.id]?.startedMonth??null,stopAt:null,manual:null,manualSource:null,commissionedFrom:null,initialProfile:null,releaseKeys:keys};}
function endedFact(c,s,fact){
 const record=(s.records??[]).findLast(r=>r.caskId===c.id),notes=record??s.notesById?.[c.id];
 return {...copy(fact??fillFact(c,s)),profile:profile(c),age:c.age,litres:c.litres,initialLitres:c.initialLitres??null,cut:c.cut??null,status:Number.isFinite(c.bottledMonth)?'bottled':'ended',bottledMonth:c.bottledMonth??null,endedMonth:c.endedMonth??null,endReason:c.endReason??null,samples:copy((notes?.samples??[]).slice(-2))};
}
function baseLedger(s){
 return {version:1,operationCount:s.operations?.length??0,month:s.core.month,coverage:{complete:s.origin===null,fromMonth:s.origin?.core?.month??0},manuals:[],active:s.core.casks.map(c=>fillFact(c,s)),ended:[...(s.core.archive??[])].filter(c=>Number.isFinite(c.bottledMonth)||Number.isFinite(c.endedMonth)).slice(0,8).map(c=>endedFact(c,s))};
}
function transition(before,after,ledger,{operation,index,operations=[]}={}){
 const next=copy(ledger),liveIds=new Set(after.core.casks.map(c=>c.id)),newlyEnded=[];
 // An operation may bottle only part of a cask. End it only when it leaves live state.
 for(const c of before.core.casks)if(!liveIds.has(c.id)){
  const ended=after.core.archive?.find(x=>x.id===c.id);assert(ended);
  const fact=next.active.find(x=>x.caskId===c.id);assert(fact);
  const result=endedFact(ended,after,fact);
  if(!result.samples.length)result.samples=copy((before.notesById?.[c.id]?.samples??[]).slice(-2));
  next.ended=next.ended.filter(x=>x.caskId!==c.id);newlyEnded.push(result);
 }
 newlyEnded.sort((a,b)=>after.core.archive.findIndex(c=>c.id===a.caskId)-after.core.archive.findIndex(c=>c.id===b.caskId));
 next.ended=[...newlyEnded,...next.ended].slice(0,8);
 next.active=next.active.filter(x=>liveIds.has(x.caskId));
 const incoming=after.core.casks.filter(c=>!before.core.casks.some(old=>old.id===c.id));
 const events=operation?[{operation,index}]:operations;
 const fills=events.filter(e=>e.operation.key==='fill');
 for(let n=0;n<incoming.length;n++){
  const c=incoming[n];assert(c.age===0);const fact=fillFact(c,after,[]),event=fills[Math.min(n,fills.length-1)],manual=!!event;
  const stop=manual?(events.filter(e=>e.index<event.index&&e.operation.key==='stop').at(-1)?.operation.value??before.still?.distillation?.progress??null):before.usual?.reservation?.recipe?.stopAt??null;
  Object.assign(fact,{manual,stopAt:stop,commissionedFrom:manual?null:copy(before.usual?.reservation?.source),initialProfile:profile(c)});
  if(manual){
   const source={caskId:c.id,batchId:c.batchId,stopAt:stop,type:c.type,...(c.flavor?{flavorChoice:copy(c.flavor.choice)}:{}),operationIndex:event.index,filledMonth:c.filledMonth,generationId:before.generations?.active.id??null};
   fact.manualSource=source;
   // Multiple casks from a single batch are one manual recipe reference.
   if(!next.manuals.some(r=>r.source.batchId===source.batchId))next.manuals.unshift({source:copy(source),initialProfile:profile(c),distilledMonth:fact.distilledMonth});
  }
  next.active.push(fact);
 }
 // Releases are formal IDs, never reusable warehouse positions.
 const newReleases=(after.releases??[]).slice(before.releases?.length??0);
 for(const fact of [...next.active,...next.ended])for(const r of newReleases)if(r.caskId===fact.caskId&&!fact.releaseKeys.includes(`release:${r.id}`))fact.releaseKeys.push(`release:${r.id}`);
 next.manuals.sort((a,b)=>b.source.operationIndex-a.source.operationIndex||b.source.caskId-a.source.caskId);next.manuals=next.manuals.slice(0,8);
 next.ended=next.ended.slice(0,8);
 next.month=after.core.month;next.operationCount=after.operations?.length??(index===undefined?next.operationCount:index+1);
 return next;
}
export function migrateRecentLedger(game,{replay}={}){
 // Empty games need no observer. Older origins contribute only surviving facts.
 if(!game.operations?.length)return assertRecentLedger(game,baseLedger(game));
 assert(typeof replay==='function');let result;
 replay(({before,after,operation,index})=>{
  if(!operation){result=baseLedger({...after,origin:game.origin,operations:[]});return;}
  assert(result);result=transition(before,after,result,{operation,index});
 });
 assert(result);result.operationCount=game.operations.length;result.month=game.core.month;
 result.coverage={complete:game.origin===null,fromMonth:game.origin?.core?.month??0};
 return assertRecentLedger(game,result);
}
export function advanceRecentLedger(before,after,ledger){
 assertRecentLedger(before,ledger,{checkHistory:false});
 assert(before.seed===after.seed&&after.operations.length>=before.operations.length);
 const operations=after.operations.slice(before.operations.length).map((operation,i)=>({operation,index:before.operations.length+i}));
 return assertRecentLedger(after,transition(before,after,ledger,{operations}),{checkHistory:false});
}
function plain(o){return o&&typeof o==='object'&&!Array.isArray(o);}
function exactKeys(o,keys){return plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));}
function validProfile(p){return p===null||plain(p)&&['roughness','character','wood','litres'].every(k=>Number.isFinite(p[k])&&p[k]>=0)&&Object.keys(p).every(k=>['roughness','character','wood','litres','flavor'].includes(k))&&(!p.flavor||p.flavor.version===1&&plain(p.flavor.choice));}
function validSource(s,game){
 const keys=['caskId','batchId','stopAt','type','operationIndex','filledMonth','generationId'];
 return exactKeys(s,Object.hasOwn(s??{},'flavorChoice')?[...keys,'flavorChoice']:keys)&&id(s.caskId)&&id(s.batchId)&&Number.isFinite(s.stopAt)&&s.stopAt>=0&&s.stopAt<=100&&['bourbon','refill'].includes(s.type)&&integer(s.filledMonth)&&s.filledMonth<=game.core.month&&(s.generationId===null||id(s.generationId))&&integer(s.operationIndex)&&s.operationIndex<game.operations.length&&game.operations[s.operationIndex].key==='fill'&&game.operations[s.operationIndex].value===s.type&&(!s.flavorChoice||plain(s.flavorChoice)&&s.flavorChoice.cask===s.type);
}
function finiteTree(o,depth=0){if(depth>12)return false;if(o===null||typeof o==='string'||typeof o==='boolean')return true;if(typeof o==='number')return Number.isFinite(o);if(Array.isArray(o))return o.length<=4096&&o.every(v=>finiteTree(v,depth+1));return plain(o)&&Object.keys(o).length<=64&&Object.values(o).every(v=>finiteTree(v,depth+1));}
export function assertRecentLedger(game,ledger,{checkHistory=true}={}){
 assert(exactKeys(ledger,['version','operationCount','month','coverage','manuals','active','ended'])&&ledger.version===1&&ledger.operationCount===game.operations.length&&ledger.month===game.core.month);
 assert(exactKeys(ledger.coverage,['complete','fromMonth'])&&ledger.coverage.complete===(game.origin===null)&&ledger.coverage.fromMonth===(game.origin?.core?.month??0));
 assert(Array.isArray(ledger.manuals)&&ledger.manuals.length<=8&&Array.isArray(ledger.active)&&ledger.active.length<=4&&Array.isArray(ledger.ended)&&ledger.ended.length<=8);
 assert(JSON.stringify(ledger).length<=262144&&finiteTree(ledger));
 const caskIds=game.core.casks.map(c=>c.id),activeIds=ledger.active.map(c=>c.caskId),endedIds=ledger.ended.map(c=>c.caskId);
 assert(activeIds.every(id)&&endedIds.every(id)&&new Set([...activeIds,...endedIds]).size===activeIds.length+endedIds.length&&activeIds.length===caskIds.length&&caskIds.every(id=>activeIds.includes(id)));
 const baseKeys=['caskId','batchId','type','filledMonth','distilledMonth','stopAt','manual','manualSource','commissionedFrom','initialProfile','releaseKeys'];
 for(const c of [...ledger.active,...ledger.ended]){
  assert(exactKeys(c,activeIds.includes(c.caskId)?baseKeys:[...baseKeys,'profile','age','litres','initialLitres','cut','status','bottledMonth','endedMonth','endReason','samples']));
  assert(id(c.batchId)&&['bourbon','refill'].includes(c.type)&&(c.filledMonth===null||integer(c.filledMonth)&&c.filledMonth<=ledger.month)&&Array.isArray(c.releaseKeys)&&new Set(c.releaseKeys).size===c.releaseKeys.length&&c.releaseKeys.every(k=>typeof k==='string'&&/^release:\d+$/.test(k)));
  assert((c.distilledMonth===null||integer(c.distilledMonth)&&c.distilledMonth<=ledger.month)&&(c.stopAt===null||Number.isFinite(c.stopAt)&&c.stopAt>=0&&c.stopAt<=100)&&[true,false,null].includes(c.manual)&&validProfile(c.initialProfile));
  assert(c.manual===true?validSource(c.manualSource,game)&&c.manualSource.caskId===c.caskId&&c.manualSource.batchId===c.batchId&&c.manualSource.type===c.type&&c.manualSource.stopAt===c.stopAt:c.manualSource===null);
  assert(c.commissionedFrom===null||plain(c.commissionedFrom));
  for(const key of c.releaseKeys){const releaseId=Number(key.slice(8)),r=game.releases?.[releaseId-1];assert(r?.id===releaseId&&r.caskId===c.caskId&&r.batchId===c.batchId);}
  const current=game.core.casks.find(x=>x.id===c.caskId)??(game.core.archive??[]).find(x=>x.id===c.caskId);
  if(current)assert(current.batchId===c.batchId&&current.type===c.type&&current.filledMonth===c.filledMonth);
  if(activeIds.includes(c.caskId))continue;
  assert(current&&JSON.stringify(c.profile)===JSON.stringify(profile(current))&&c.age===current.age&&c.litres===current.litres&&c.bottledMonth===(current.bottledMonth??null)&&c.endedMonth===(current.endedMonth??null)&&c.endReason===(current.endReason??null)&&c.status===(Number.isFinite(current.bottledMonth)?'bottled':'ended'));
  assert(validProfile(c.profile)&&['bottled','ended'].includes(c.status)&&integer(c.age)&&Number.isFinite(c.litres)&&c.litres>=0&&Array.isArray(c.samples)&&c.samples.length<=2&&Number.isFinite(endingMonth(c))&&endingMonth(c)>=0&&endingMonth(c)<=ledger.month);
 }
 if(checkHistory){
  // Persistence boundary only: check recent fill receipts, without replaying any operation.
  // A notebook open or normal transition never scans the accumulated operation list.
  const expected=[];for(let i=game.operations.length-1;i>=0&&expected.length<8;i--)if(game.operations[i].key==='fill')expected.push(i);
  assert(expected.length===ledger.manuals.length&&expected.every((index,i)=>ledger.manuals[i]?.source?.operationIndex===index));
 }
 const batches=new Set();let previous=Infinity;
 for(const r of ledger.manuals){
  assert(exactKeys(r,['source','initialProfile','distilledMonth'])&&plain(r.source));const s=r.source;
  assert(validSource(s,game)&&validProfile(r.initialProfile)&&(r.distilledMonth===null||integer(r.distilledMonth)&&r.distilledMonth<=s.filledMonth)&&!batches.has(s.batchId)&&s.operationIndex<=previous);const current=game.core.casks.find(c=>c.id===s.caskId)??game.core.archive?.find(c=>c.id===s.caskId);if(current)assert(current.batchId===s.batchId&&current.type===s.type&&current.filledMonth===s.filledMonth);const active=ledger.active.find(c=>c.caskId===s.caskId);if(active)assert(JSON.stringify(active.manualSource)===JSON.stringify(s)&&JSON.stringify(active.initialProfile)===JSON.stringify(r.initialProfile));batches.add(s.batchId);previous=s.operationIndex;
 }
 return ledger;
}
function recipeRow(state,source,saved,detail){source=saved?{...source,type:saved.type,stopAt:saved.stopAt,...(saved.flavorChoice?{flavorChoice:copy(saved.flavorChoice)}:{})}:source;return {key:saved?`recipe:${saved.id}`:`manual:${source.caskId}`,id:saved?.id??null,name:saved?.name??null,caskId:source.caskId,batchId:source.batchId,stopAt:saved?.stopAt??source.stopAt,type:saved?.type??source.type,filledMonth:source.filledMonth,generationId:source.generationId??null,source:copy(source),manualSource:copy(source),initialProfile:copy(detail?.initialProfile),saved:!!saved,selected:saved?state.recipeBook?.selectedId===saved.id:state.recipeBook?.selectedId==null};}
export function recentLedgerView(game,ledger){
 // No validation replay, operation scan, or historical collector on a notebook open.
 assertRecentLedger(game,ledger,{checkHistory:false});
 const recent=ledger.manuals.map(r=>recipeRow(game,r.source,null,r));
 const saved=(game.recipeBook?.entries??[]).map(r=>recipeRow(game,r.source,r,ledger.manuals.find(m=>m.source.caskId===r.source.caskId)??ledger.active.find(c=>c.caskId===r.source.caskId)??ledger.ended.find(c=>c.caskId===r.source.caskId)));
 const savedIds=new Set(saved.map(r=>r.caskId));
 const active=ledger.active.map(f=>{const c=game.core.casks.find(c=>c.id===f.caskId),n=game.notesById[c.id]??{};return {...copy(f),key:`cask:${c.id}`,profile:profile(c),age:c.age,litres:c.litres,initialLitres:c.initialLitres??null,cut:c.cut??null,status:'aging',bottledMonth:null,endedMonth:null,endReason:null,samples:copy(n.samples??[]),choices:copy(n.choices??[]),observations:copy(n.observations??[]),history:copy(c.history??[]),volumeHistory:[]};});
 const ended=ledger.ended.map(c=>({...copy(c),key:`cask:${c.caskId}`,choices:[],observations:[],history:[],volumeHistory:[]}));
 return {recipes:{latestManual:recent[0]??null,recent,saved,unsaved:recent.filter(r=>!savedIds.has(r.caskId))},casks:[...active,...ended],coverage:{...ledger.coverage,replayed:false}};
}
