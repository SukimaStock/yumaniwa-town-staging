// H1-A3 independent-process material continuation and immutable handover study.
// All generated checkpoints and detailed results must be outside the repository.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createOnlineCollectors} from './online.mjs';
import {dependencyFingerprint} from './fingerprint.mjs';
import {loadAdapter,fullReplay,createCheckpoint,replayTail,encodeContext,hash,bytes} from '../checkpoint-research/prototype.mjs';
import {prepareRecallArchive,readRecallArchive} from '../chronicle-lab/research-h25.mjs';
import {recallSentence,firstDeliveryIds} from '../chronicle-lab/caption.mjs';
import {withRecallSnapshots} from '../chronicle-lab/recall-snapshots.mjs';
import {buildChronicle} from '../chronicle-lab/editor.mjs';

const atom=(file,value)=>{mkdirSync(dirname(file),{recursive:true});writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');renameSync(file+'.tmp',file);};
const memory=()=>({...process.memoryUsage(),peakRssBytes:process.resourceUsage().maxRSS*1024});
function fingerprint(adapter){return dependencyFingerprint(adapter.fingerprint);}
function recalled(view,handoverId){
 const archive=prepareRecallArchive(view.rawRecord),edition=readRecallArchive(archive,handoverId),firsts=firstDeliveryIds(view.rawRecord);
 return {cutoff:edition.cutoff,seedGeneration:edition.seedGeneration,events:edition.record.events,result:edition.result,sentences:edition.result.frames.map(frame=>recallSentence(frame.events[0],firsts))};
}
const viewDigest=view=>hash(view);

export async function materialWorker(bundleFile,saveFile,id,output){
 const start=performance.now(),readStart=performance.now(),checkpointText=readFileSync(bundleFile,'utf8'),saveRaw=readFileSync(saveFile,'utf8'),readMs=performance.now()-readStart;
 const parseStart=performance.now(),bundle=JSON.parse(checkpointText),target=JSON.parse(saveRaw),parseMs=performance.now()-parseStart;
 const adapterStart=performance.now(),adapter=await loadAdapter(),adapterLoadMs=performance.now()-adapterStart;
 assert.equal(bundle.sourceHash,hash(saveRaw));assert.equal(bundle.modelFingerprint,adapter.fingerprint);assert.equal(bundle.codeFingerprint,fingerprint(adapter));
 const hydrateStart=performance.now(),collector=await createOnlineCollectors(bundle.checkpoint.state,{prefix:bundle.projection,id,sourceSha256:hash(saveRaw)}),hydrateMs=performance.now()-hydrateStart;
 let observeMs=0;
 const replay=replayTail(adapter,bundle.checkpoint,saveRaw,{binding:'prefix-branch',observer:o=>{const t=performance.now();collector.observe(o);observeMs+=performance.now()-t;}});
 const finishStart=performance.now(),view=collector.finish({state:replay.state,context:replay.context,sourceSha256:hash(saveRaw)}),finishMs=performance.now()-finishStart;
 const recallStart=performance.now(),recall=prepareRecallArchive(view.rawRecord),recallMs=performance.now()-recallStart;
 const result={status:'complete',sourceHash:hash(saveRaw),codeFingerprint:fingerprint(adapter),stateHash:hash(JSON.stringify(replay.state)),contextDigest:hash(encodeContext(replay.context)),viewDigest:viewDigest(view),rawDigest:hash(view.rawRecord),recallDigest:hash(recall),rawEvents:view.rawRecord.events.length,candidateEvents:recall.events.length,
 timings:{readMs,parseMs,adapterLoadMs,hydrateMs,verifyMs:replay.verifyMs,tailMs:replay.tailMs,observeMs,finalizeMs:replay.finalizeMs,stateCompareMs:replay.compareMs,finishMs,recallMs,totalMs:performance.now()-start},memory:memory(),checkpointBytes:Buffer.byteLength(checkpointText),tailOperations:replay.replayed,node:process.version,gc:typeof globalThis.gc==='function',guarantee:'Creation path plus local file/prefix/model checks; not independent prefix revalidation at load.'};
 assert.equal(dependencyFingerprint(adapter.fingerprint),bundle.codeFingerprint,'Dependencies changed during cold material replay');
 atom(output,result);return result;
}

export async function measureBoundaries(saveFile,id,outdir){
 mkdirSync(outdir,{recursive:true});
 const raw=readFileSync(saveFile,'utf8'),target=JSON.parse(raw),adapter=await loadAdapter(),sourceHash=hash(raw),codeFingerprint=fingerprint(adapter),output=resolve(outdir,id+'-materials.json');
 if(existsSync(output)){const prior=JSON.parse(readFileSync(output,'utf8'));assert.equal(prior.status,'complete');assert.equal(prior.sourceHash,sourceHash);assert.equal(prior.codeFingerprint,codeFingerprint);assert.equal(prior.modelFingerprint,adapter.fingerprint);return {...prior,reused:true};}
 const published=JSON.parse(readFileSync(new URL('../chronicle-lab/facts-recalls-long.json',import.meta.url),'utf8'));
 assert.equal(target.core.month,1200);assert.equal(published.records[id].sourceSha256,sourceHash);
 const oldResults=JSON.parse(readFileSync(new URL('../checkpoint-research/results.json',import.meta.url),'utf8'));
 const rows=oldResults.results??oldResults.conditions??[];
 const prior=rows.find(r=>r.id===id&&r.month===1200);assert(prior,'Missing H1-A2 condition');
 const annual=prior.policies.find(p=>p.policy==='annual');assert(annual);
 const collector=await createOnlineCollectors(adapter.research.initial(target),{id}),boundaries=[];
 let annualBundle,collectorMs=0,captureMs=0;
 const started=performance.now();
 const full=fullReplay(adapter,raw,{
  observer:o=>{const t=performance.now();collector.observe(o);collectorMs+=performance.now()-t;},
  onStep:({state,context,nextIndex,operation})=>{
   if(operation?.key==='generation-handover'){
    const t=performance.now(),view=collector.finish({state,context,sourceSha256:hash(JSON.stringify(state))}),boundary=view.rawRecord.events.filter(e=>e.kind==='handover').at(-1);assert(boundary);
    const material=recalled(view,boundary.id);boundaries.push({handoverId:boundary.id,month:state.core.month,nextIndex,material,collectorBytes:bytes(collector.checkpoint(state)),captureMs:performance.now()-t});
    atom(resolve(outdir,id+'-boundary-progress.json'),{status:'partial',sourceHash,codeFingerprint,boundaries});
   }
   if(nextIndex===annual.nextIndex){const t=performance.now();annualBundle={sourceHash,modelFingerprint:adapter.fingerprint,codeFingerprint,checkpoint:createCheckpoint(adapter,{state,context,sourceRaw:JSON.stringify(state)}),projection:collector.checkpoint(state)};captureMs=performance.now()-t;}
  },
 });
 const fullMs=performance.now()-started,finishStart=performance.now(),view=collector.finish({state:target,context:full.context,sourceSha256:sourceHash}),finishMs=performance.now()-finishStart;
 assert.equal(boundaries.length,3);
 const connected=withRecallSnapshots(published.records[id],published.recalls[id]),publishedFirsts=firstDeliveryIds(connected),comparisons=[];
 for(const frozen of boundaries){
  const current=recalled(view,frozen.handoverId);
  assert.deepEqual(frozen.material,current,'Future changed handover material '+frozen.handoverId);
  const expected=buildChronicle(connected,'handover','d',{handoverId:frozen.handoverId});
  assert.deepEqual(current.result.frames,expected.frames);assert.deepEqual(current.result.audit,expected.audit);
  assert.deepEqual(current.sentences,expected.frames.map(frame=>recallSentence(frame.events[0],publishedFirsts)));
  const publishedSnapshot=published.recalls[id].snapshots.find(s=>s.handoverId===frozen.handoverId);
  assert.deepEqual(current.cutoff,publishedSnapshot.cutoff);assert.equal(current.seedGeneration,publishedSnapshot.seedGeneration);
  assert.deepEqual(current.events.map(e=>e.id),publishedSnapshot.eventIds);
  comparisons.push({handoverId:frozen.handoverId,month:frozen.month,nextIndex:frozen.nextIndex,candidates:current.events.length,seed:current.result.audit.seed,selectedIds:current.result.audit.selectedIds,sentences:current.sentences,materialDigest:hash(current),collectorBytes:frozen.collectorBytes,captureMs:frozen.captureMs,immediateEqualsLater:true,publishedEqual:true});
 }
 assert(annualBundle);const bundleFile=resolve(outdir,id+'-annual-material.checkpoint.json');atom(bundleFile,annualBundle);
 const childOutput=resolve(outdir,id+'-material-cold.json');
 const child=spawnSync(process.execPath,['--expose-gc',fileURLToPath(import.meta.url),'worker',bundleFile,saveFile,id,childOutput],{encoding:'utf8',maxBuffer:32*1024*1024});assert.equal(child.status,0,child.stderr);
 const cold=JSON.parse(readFileSync(childOutput,'utf8'));
 assert.equal(cold.stateHash,sourceHash);assert.equal(cold.contextDigest,hash(encodeContext(full.context)));assert.equal(cold.viewDigest,viewDigest(view));assert.equal(cold.recallDigest,hash(prepareRecallArchive(view.rawRecord)));
 const independent=spawnSync(process.execPath,[fileURLToPath(new URL('../chronicle-lab/research-h25-generate.mjs',import.meta.url)),saveFile,id],{encoding:'utf8',maxBuffer:64*1024*1024});assert.equal(independent.status,0,independent.stderr);
 const oracle=JSON.parse(independent.stdout);assert.deepEqual(view.rawRecord,oracle.record,'Independent H2-5 raw extraction differs');
 assert.equal(readFileSync(saveFile,'utf8'),raw);
 const result={schema:'ambertime-h1-a3-material-result/1',status:'complete',id,sourceHash,codeFingerprint,modelFingerprint:adapter.fingerprint,operations:target.operations.length,fullMs,collectorMs,finishMs,annualCaptureMs:captureMs,rawEvents:view.rawRecord.events.length,viewDigest:viewDigest(view),independentRawEqual:true,boundaries:comparisons,cold,memory:memory(),limits:['Single cold child trial; OS page cache is not flushed.','Cold child imports fresh modules but the host file cache may be warm.','Collector stores Maps/Sets and facts, never per-operation state snapshots.','Full raw rendering consults current persistent shipment/release state. That state is not compacted in this study.','Formal-equivalent prefix revalidation at each load is not included.']};
 assert.equal(dependencyFingerprint(adapter.fingerprint),codeFingerprint,'Dependencies changed during material condition');
 atom(output,result);return result;
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const [mode,...args]=process.argv.slice(2);
 const result=mode==='worker'?await materialWorker(...args):mode==='condition'?await measureBoundaries(...args):(()=>{throw Error('Usage: boundary-run.mjs condition <save> <id> <outdir> | worker <bundle> <save> <id> <output>');})();
 console.log(JSON.stringify({id:result.id,status:result.status,reused:result.reused??false}));
}
