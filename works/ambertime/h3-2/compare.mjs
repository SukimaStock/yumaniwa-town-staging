// Research diagnostics only. The baseline is read, never rewritten or retuned.
import {boundaryInput,metrics,world} from '../h3-1/selection.mjs';
export const jsonEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const counts=events=>events.reduce((out,e)=>(out[e.kind]=(out[e.kind]??0)+1,out),{});
export function samples(values){
 const sorted=[...values].sort((a,b)=>a-b);
 if(!sorted.length)return {count:0,medianMs:null,p95Ms:null,maxMs:null,totalMs:0};
 return {count:sorted.length,medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],maxMs:sorted.at(-1),totalMs:sorted.reduce((a,b)=>a+b,0)};
}
export function timedJson(value,repeats=7){
 const encoded=JSON.stringify(value),serial=[],parse=[];
 for(let i=0;i<repeats;i++){
  let start=performance.now();JSON.stringify(value);serial.push(performance.now()-start);
  start=performance.now();JSON.parse(encoded);parse.push(performance.now()-start);
 }
 return {bytes:Buffer.byteLength(encoded),codeUnits:encoded.length,serialize:samples(serial),parse:samples(parse)};
}
const ids=events=>events.map(e=>e.id);
const selected=edition=>edition.scenes.map(s=>s.eventId);
const factPosition=e=>[e.month,e.operationIndex,e.replayOrdinal??e.ordinal,e.generationId];
export function compareCandidates(record,handoverId,observed,retained){
 const baseline=boundaryInput(record,handoverId),observedById=new Map(observed.map(e=>[e.id,e])),retainedIds=new Set(ids(retained)),baselineIds=new Set(ids(baseline.events));
 const shared=baseline.events.filter(e=>observedById.has(e.id));
 return {baselineCount:baseline.events.length,baselineCurrentCount:baseline.current.length,
  observedCount:observed.length,observedKinds:counts(observed),retainedCount:retained.length,retainedKinds:counts(retained),
  sharedCount:shared.length,missingFromObservation:baseline.events.filter(e=>!observedById.has(e.id)).map(e=>({id:e.id,kind:e.kind,world:world(e)})),
  extraObserved:observed.filter(e=>!baselineIds.has(e.id)).map(e=>({id:e.id,kind:e.kind,month:e.month})),
  baselinePruned:baseline.events.filter(e=>!retainedIds.has(e.id)).map(e=>({id:e.id,kind:e.kind,month:e.month})),
  positionDifferences:shared.flatMap(e=>jsonEqual(factPosition(e),factPosition(observedById.get(e.id)))?[]:[{id:e.id,baseline:factPosition(e),observed:factPosition(observedById.get(e.id))}]),
  method:'Exact H2-5 baseline membership compared with facts actually emitted before the operation boundary; no slicing of final C-3 candidates.'};
}
export function compareEditions(baseline,actual,comparison='h31'){
 const a=selected(baseline),b=selected(actual),baseById=new Map(baseline.scenes.map(s=>[s.eventId,s]));
 return {sameIds:jsonEqual(a,b),sameSeed:baseline.seed===actual.seed,
  lost:a.filter(id=>!b.includes(id)),added:b.filter(id=>!a.includes(id)),
  sharedDifferences:actual.scenes.flatMap(s=>{const p=baseById.get(s.eventId);if(!p)return [];
   const fields=['sentence','illustration','links'].filter(k=>!jsonEqual(p[k],s[k]));return fields.length?[{id:s.eventId,fields}]:[];}),
  explanation:jsonEqual(a,b)?'Same selected event IDs. Any wording/context difference is listed separately.':comparison==='retention'?'Same actual observation stream and unchanged C selector; small retention prunes routine middle facts while preserving first/latest and confirmed causal sources. Selection differences are retention tradeoffs, not improvements inferred from matching a baseline.':'The candidate pool is collected from actual operation deltas. H3-1 had already discarded facts through C-3. No event is removed to force H3-1 selected IDs.'};
}
export function editionMetrics(edition){
 return metrics(edition.scenes,edition.startMonth??edition.start?.month??0,edition.cutoff?.month??edition.end?.month,edition.generation);
}
export function sceneMarkdown(rows){
 const out=['# H3-2 実際の進行から集めた世代回想','','研究用。本文・ID・理由・情景を確認するための記録で、本編画面への接続はない。',''];
 for(const row of rows){
  out.push(`## ${row.policy}・${row.years}年資料・第${row.generation}世代`,'');
  for(const mode of ['broad','small']){
   const e=row[mode];if(!e)continue;
   out.push(`### ${mode==='broad'?'A：広い保持':'B：現役候補＋確定回想'}（${e.scenes.length}場面）`,'',`境界：${JSON.stringify(e.cutoff??e.end)}。seed ${e.seed}。`,'');
   for(const [i,s]of e.scenes.entries()){
    out.push(`${i+1}. ${s.sentence}`,
     `   - 月${s.month??s.event?.month} / ${s.category} / ${s.event?.kind} / ${s.eventId}。${s.reason}`,
     '   - 関係：'+(s.links?.length?s.links.map(l=>`${l.type} ← ${l.sourceId}（${l.role}、月${l.sourceMonth}、第${l.sourceGeneration}世代${l.causal?'、正式参照確認済み':''}）`).join(' / '):'確認された関係なし。隣接場面というだけでは因果としない。'),
     `   - 情景：${s.illustration?.location}。${s.illustration?.action}。`);
   }
   out.push('');
  }
 }
 return out.join('\n')+'\n';
}
