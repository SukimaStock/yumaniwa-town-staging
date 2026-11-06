// Match local frozen H2 facts to actual incremental S4 sidecars from performance.mjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const load=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
const frozen=load('./h2-comparison.json'),measured=load('./performance.json');
function match(event,rows){
 return rows.find(row=>{
  if(event.kind==='bottling')return row.kind==='bottling'&&row.releaseId===event.ids.releaseId;
  if(event.kind==='handover')return row.kind==='generation-handover'&&row.generationId===event.ids.fromGeneration;
  if(event.kind==='shop-start')return row.kind==='shop-start'&&row.shopId===event.ids.shopId;
  if(event.kind==='distillation')return row.kind==='distillation'&&row.batchId===event.ids.batchId;
  if(['arrival','inquiry','visit'].includes(event.kind))return row.sourceEventId===event.ids.townEventId;
  if(event.kind==='delivery')return row.deliveryId===event.ids.receiptId;
  return false;
 });
}
const results=[];
for(const r of frozen.results.filter(r=>r.policy==='local'&&!r.boundary)){
 const checkpoint=measured.checkpoints.find(c=>c.input.month===r.years*12);assert.equal(checkpoint.input.sha256,r.sourceSha256);
 const eligible=checkpoint.events.filter(e=>!r.boundary||e.month<r.cutoff.month||e.month===r.cutoff.month&&e.operationIndex<=r.cutoff.operationIndex);
 const selected=r.selected.map(e=>{const found=match(e,eligible);if(found){assert.equal(found.month,e.month,'matched H2/S4 date mismatch');assert.equal(found.generationNumber,e.generationId,'matched H2/S4 generation mismatch');}return {h2Id:e.id,kind:e.kind,month:e.month,generationId:e.generationId,ids:e.ids,status:found?'visible-fact':checkpoint.retainedEvidenceIds.includes(e.ids.townEventId)?'evidence-only':'not-retained',s4Id:found?.id??null};});
 results.push({policy:r.policy,years:r.years,boundary:r.boundary,cutoff:r.cutoff,selectedCount:r.selectedCount,visible:selected.filter(r=>r.status==='visible-fact').length,evidenceOnly:selected.filter(r=>r.status==='evidence-only').length,notRetained:selected.filter(r=>r.status==='not-retained').length,selected});
}
const output={schema:'ambertime-s4-h2-actual-local-mapping/1',scope:'Local policy only; IDs match semantic release/shop/region event identity, not new editor output. Evidence-only checks membership of final checkpoint ancestor facts; it is not permission to insert those into an earlier H2 boundary.',dependencyFingerprint:measured.dependencyFingerprint,checkpoints:measured.checkpoints.map(c=>({month:c.input.month,eventCount:c.eventCount,generations:c.events.reduce((x,e)=>(x[e.generationNumber]=(x[e.generationNumber]??0)+1,x),{}),eventKinds:c.eventKinds})),results};
fs.writeFileSync(new URL('./h2-comparison-actual.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log(results.map(({selected,...r})=>r));
