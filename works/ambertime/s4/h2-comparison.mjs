// Frozen H2 evidence audit. Does not replay games, mutate fixtures or change D1.1.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {buildChronicle} from '../chronicle-lab/editor.mjs';
import {withReputationCandidates} from '../chronicle-lab/facts-d.mjs';
import {withRecallSnapshots} from '../chronicle-lab/recall-snapshots.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const sources=[];
const load=name=>{const bytes=fs.readFileSync(new URL('../chronicle-lab/'+name,import.meta.url));sources.push({path:'works/ambertime/chronicle-lab/'+name,sha256:sha(bytes),bytes:bytes.length});return JSON.parse(bytes);};
const base=load('facts.json'),supplement=load('facts-d.json'),recalls=load('facts-recalls.json'),long=load('facts-recalls-long.json');
const count=(xs,fn)=>xs.reduce((out,e)=>(out[fn(e)]=(out[fn(e)]??0)+1,out),{});
function policy(event,record){
 if(['bottling','handover','shop-start'].includes(event.kind))return 'mandatory';
 if(event.kind==='distillation')return event.id===record.events.find(e=>e.kind==='distillation')?.id?'mandatory':'not-in-S4';
 if(['arrival','inquiry','visit','delivery'].includes(event.kind))return 'conditional-needs-source-check';
 return 'not-in-S4';
}
const results=[];
for(const years of [30,100])for(const id of ['local','wide','mixed']){
 const record=years===30?withRecallSnapshots(withReputationCandidates(base[id],supplement[id]),recalls[id]):withRecallSnapshots(long.records[id],long.recalls[id]);
 for(const boundary of [null,...record.recallSnapshots.map(r=>r.handoverId)]){
  const result=buildChronicle(record,boundary?'handover':'anniversary','d',boundary?{handoverId:boundary}:{});
  const selected=result.frames.flatMap(f=>f.events);
  results.push({policy:id,years,boundary,sourceSha256:record.sourceSha256,candidateCount:boundary?record.recallSnapshots.find(r=>r.handoverId===boundary).eventIds.length:record.events.length,selectedCount:result.frames.length,seed:result.audit.seed,cutoff:result.cutoff,kinds:count(selected,e=>e.kind),generations:count(selected,e=>e.generationId),policyCategories:count(selected,e=>policy(e,record)),selected:selected.map(e=>({id:e.id,kind:e.kind,month:e.month,generationId:e.generationId,operationIndex:e.operationIndex,ordinal:e.replayOrdinal??e.ordinal,ids:e.ids,evidence:e.evidence,policyCategory:policy(e,record)}))});
 }
}
const output={schema:'ambertime-s4-h2-frozen-comparison/1',sources,method:'Unmodified published H2 C-3/H2-5 fixtures and unmodified D1.1 editor. Categories describe S4 policy eligibility, not actual event equality. Conditional facts require source-side collector comparison.',checkpoints60and90:'Published H24.md tables are reference evidence only; no JSON candidates for these checkpoints are committed. Do not infer exact selections from filtered 100-year candidates.',results};
fs.writeFileSync(new URL('./h2-comparison.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(results.filter(r=>!r.boundary).map(({selected,...r})=>r));
