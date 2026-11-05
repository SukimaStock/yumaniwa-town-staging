// Research-only equivalence proof: exact wire round-trip plus existing raw extraction evidence.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {encode,decode} from './adapter.mjs';
import {buildEdition} from '../chronicle-lab/edition-d.mjs';
import {withRecallSnapshots} from '../chronicle-lab/recall-snapshots.mjs';
import {firstDeliveryIds,recallSentence} from '../chronicle-lab/caption.mjs';
const directory=dirname(fileURLToPath(import.meta.url)),root=resolve(directory,'../../..');
const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const read=p=>readFileSync(resolve(root,p),'utf8');
const sourcePaths=['works/ambertime/chronicle-lab/facts-recalls-long.json','works/ambertime/checkpoint-persistence/results.json'];
const published=JSON.parse(read(sourcePaths[0])),prior=JSON.parse(read(sourcePaths[1]));
const comparisonBase='00e6a0090d068b5d917dd806244a654dfa09bba3';
// Explicit roots include the string-loaded extractor sections and their static imports.
const roots=['partner-orders.mjs','chronicle-lab/research-h25-generate.mjs','chronicle-lab/research-h24-facts.mjs','chronicle-lab/facts-generate.mjs','chronicle-lab/research-h23b.mjs','chronicle-lab/facts-compact.mjs','chronicle-lab/recall-boundary.mjs','chronicle-lab/research-h25.mjs','chronicle-lab/recall-snapshots.mjs','chronicle-lab/caption.mjs','chronicle-lab/editor.mjs','chronicle-lab/edition-d.mjs'];
function manifest(){const seen=new Map();function visit(path){path=resolve(path);if(seen.has(path))return;const body=readFileSync(path,'utf8'),relative=path.slice(root.length+1);assert(path.startsWith(root+'/'));const previous=execFileSync('git',['show',comparisonBase+':'+relative],{cwd:root,encoding:'utf8',maxBuffer:16e6});assert.equal(body,previous,'Prior replay dependency changed '+relative);seen.set(path,{path:relative,sha256:sha(body)});for(const m of body.matchAll(/(?:from\s*|import\s*)['"]([.][^'"]+)['"]/g)){const child=new URL(m[1],new URL('file://'+path));child.search='';child.hash='';if(child.pathname.endsWith('.mjs'))visit(fileURLToPath(child));}}for(const r of roots)visit(resolve(root,'works/ambertime',r));return [...seen.values()].sort((a,b)=>a.path.localeCompare(b.path));}
const dependencyManifest=manifest();
function material(record,snapshot){const byId=new Map(record.events.map(e=>[e.id,e]));const events=snapshot.eventIds.map(id=>{const event=byId.get(id);assert(event,'Missing candidate '+id);return Object.hasOwn(snapshot.ordinalOverrides??{},id)?{...event,ordinal:snapshot.ordinalOverrides[id]}:event;});const result=buildEdition({...record,events},snapshot.cutoff,{targetGeneration:snapshot.seedGeneration});return {cutoff:snapshot.cutoff,seedGeneration:snapshot.seedGeneration,events,result,sentences:result.frames.map(frame=>recallSentence(frame.events[0],firstDeliveryIds(record)))};}
const [saves,output=resolve(directory,'history-results.json')]=process.argv.slice(2);assert(saves,'history-run.mjs <verified-save-directory> [results-output]');
const rows=[];for(const id of ['local','wide','mixed']){
 const raw=readFileSync(resolve(saves,id+'-1200.json'),'utf8'),hash=sha(raw),record=published.records[id],supplement=published.recalls[id],evidence=prior.materials.find(r=>r.id===id);
 assert.equal(evidence.status,'complete');assert.equal(evidence.independentRawEqual,true);assert.equal(hash,evidence.sourceHash);assert.equal(hash,record.sourceSha256);assert.equal(hash,supplement.sourceSha256);assert.equal(evidence.boundaries.length,3);withRecallSnapshots(record,supplement);
 const original=JSON.parse(raw),baseline=new Map();
 for(const variant of ['A','B','C']){
  const wire=encode(raw,variant),expanded=decode(wire);assert.equal(expanded,raw,'Compact form must reconstruct every original byte before any official API');const state=JSON.parse(expanded);assert.deepEqual(state,original);assert.equal(sha(state.labConnection.town.events),sha(original.labConnection.town.events));assert.equal(sha(state.operations),sha(original.operations));
  const boundaries=supplement.snapshots.map(snapshot=>{
   const m=material(record,snapshot),old=evidence.boundaries.find(b=>b.handoverId===snapshot.handoverId);assert(old);assert(old.immediateEqualsLater&&old.publishedEqual);assert.equal(m.events.length,old.candidates);assert.equal(m.result.audit.seed,old.seed);assert.deepEqual(m.result.audit.selectedIds,old.selectedIds);assert.deepEqual(m.sentences,old.sentences);assert.equal(sha(m),old.materialDigest,'Full candidate/evidence/ordinal/boundary/text material differs from A3');
   for(const event of m.events){const end=snapshot.cutoff;assert(event.month<=end.month);assert(event.operationIndex<end.operationIndex||event.operationIndex===end.operationIndex&&(event.replayOrdinal??event.ordinal)<=end.replayOrdinal);}
   const detail={handoverId:snapshot.handoverId,month:old.month,cutoff:m.cutoff,seedGeneration:m.seedGeneration,candidates:m.events.length,materialDigest:sha(m),rawFactFieldsDigest:sha(m.events.map(e=>({id:e.id,kind:e.kind,month:e.month,generationId:e.generationId,operationIndex:e.operationIndex,ordinal:e.ordinal,replayOrdinal:e.replayOrdinal,ids:e.ids,evidence:e.evidence}))),seed:m.result.audit.seed,selectedIds:m.result.audit.selectedIds,sentences:m.sentences};if(variant==='A')baseline.set(snapshot.handoverId,detail);else assert.deepEqual(detail,baseline.get(snapshot.handoverId));return detail;
  });rows.push({id,variant,inputSha256:hash,expandedSha256:sha(expanded),townEventsDigest:sha(state.labConnection.town.events),operationsDigest:sha(state.operations),fullStateByteEqual:true,rawExtractionReuse:true,boundaries});
 }
 assert.equal(readFileSync(resolve(saves,id+'-1200.json'),'utf8'),raw);
}
const result={schema:'ambertime-h1-b1-history/1',status:'complete',baseSha:'fcc14b249733b6cccd598bcd2e567e64848bcd7f',codeFingerprint:sha(['history-run.mjs','adapter.mjs'].map(f=>readFileSync(resolve(directory,f),'utf8')).join('\n')),reuse:{comparisonBase,priorResultSha256:sha(read(sourcePaths[1])),publishedSha256:sha(read(sourcePaths[0])),priorComplete:true,independentBoundaryCount:prior.independentHandoverBoundaries,dependencyManifest},method:'For each compact representation, decode is byte-identical to the verified official input including all events and operations. Existing deterministic raw extraction is reused only after source SHA and extractor/model dependency byte checks. Current candidate restoration and D1.1/D1.2 editing are executed for all 9 boundaries in each of A/B/C and compared with full A3 material digests.',limits:['No new 100-year operation replay or new raw-fact extraction was executed. Exact decoded input plus unchanged extractor is the reuse proof, not a new replay measurement.','The published record is the shared full candidate body pool, not the complete pre-C-3 raw stream. Complete raw stream preservation follows byte-equality of the formal state/operations and existing independent raw extraction proof.','No past data is deleted; all raw events and reference chains stay in the decoded formal state.'],rows};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,conditions:rows.length,distinctBoundaries:9,dependencyFiles:dependencyManifest.length,output}));
