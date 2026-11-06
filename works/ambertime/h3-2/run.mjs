// Offline harness: a formal history is replayed once to supply operation deltas.
// Neither collector nor recall preparation imports a replay entry point.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {replayDistilleryOperations} from '../partner-orders.mjs';
import {customerComments} from '../player-news.mjs';
import {loadRecords} from '../h3-1/data.mjs';
import {compareBoundary,world,order,linksFor} from '../h3-1/selection.mjs';
import {createCollector,advanceCollector,prepareRecall,commitRecall,collectorCounts} from './collector.mjs';
import {compareCandidates,compareEditions,editionMetrics,timedJson,samples,sceneMarkdown,jsonEqual,counts} from './compare.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const sha=x=>createHash('sha256').update(x).digest('hex');
const useful=e=>world(e)||['fill','bottling'].includes(e.kind);
const directory=new URL('./',import.meta.url);
const frozenFingerprint=c=>sha(JSON.stringify(c.completed));
const implementationSources=()=>Object.fromEntries(['observe.mjs','collector.mjs','select.mjs','run.mjs','compare.mjs','../h3-1/selection.mjs'].map(name=>[name,sha(fs.readFileSync(new URL(name,import.meta.url)))]));
function timeCall(samples,fn){const started=performance.now(),out=fn();samples.push(performance.now()-started);return out;}
function identity(edition){return {seed:edition.seed,generation:edition.generation,scenes:edition.scenes,dependencies:edition.dependencies,proofs:edition.proofs};}
function position(e){return [e.month,e.operationIndex,e.replayOrdinal??e.ordinal];}
function ensureEdition(edition){
 assert(edition.scenes.length<=6,'Unchanged H3-1 research selector cap');
 for(let i=0;i<edition.scenes.length;i++){
  const s=edition.scenes[i];assert(s.event.operationIndex<edition.cutoff.operationIndex,'Future/main scene at post-preview operation');
  assert.equal(s.event.generationId,edition.generation,'Earlier generation reappeared as independent main scene');
  if(i)assert(order(edition.scenes[i-1].event,s.event)<=0,'Scene order changed');
  for(const l of s.links){const source=edition.dependencies.find(e=>e.id===l.sourceId);assert(source&&order(source,s.event)<0,'Missing/nonprior dependency');
   if(l.causal){const p=edition.proofs.find(p=>p.targetId===s.eventId);assert(p?.sourceId===l.sourceId&&p.chain.some(x=>x.id===source.ids.townEventId),'Unproved causal link');}
  }
 }
}

export function runPolicy(policy,years=100,saveDirectory='/tmp/h32-saves'){
 assert(['local','wide','mixed'].includes(policy));assert([30,100].includes(years));
 const sourceHashes=implementationSources();
 const raw=fs.readFileSync(path.join(saveDirectory,`${policy}-${years*12}.json`),'utf8'),game=JSON.parse(raw);
 const {records}=loadRecords(),record=records.find(x=>x.years===years&&x.policy===policy).record;
 assert.equal(sha(raw),record.sourceSha256,'Formal scenario save differs from fixed H2 source');
 const baselineById=new Map(record.recallSnapshots.map(({handoverId})=>{const b=compareBoundary(record,handoverId);return [handoverId,{...b,...b.modes.C}];}));
 const broad=createCollector('broad',game.seed);let small=createCollector('small',game.seed),resumed=createCollector('small',game.seed);
 const observed=[],observedById=new Map(),boundaries=[],checkpoints=[],continuation=[],timings={broad:[],small:[],resumed:[],broadMonth:[],smallMonth:[],broadFreeze:[],smallFreeze:[],broadCommit:[],smallCommit:[]};
 const targets=[360,720,1080,1200].filter(m=>m<=years*12),checkpointFiles=new Map(targets.map(month=>{
  const r=fs.readFileSync(path.join(saveDirectory,`${policy}-${month}.json`),'utf8'),g=JSON.parse(r);return [g.operations.length-1,{month,raw:r,game:g}];
 }));
 let frozen={broad:frozenFingerprint(broad),small:frozenFingerprint(small)},diagnosticMs=0,restartCount=0,lastAfter=null;
 const replayStarted=performance.now();
 replayDistilleryOperations(game,observation=>{
  const {index,operation,before,after}=observation,isHandover=operation?.key==='generation-handover';let preparedBroad,preparedSmall,preparedResumed;
  if(isHandover){
   const diagnosticStarted=performance.now(),beforeText=JSON.stringify(before),collectorBefore=JSON.stringify(small);
   preparedBroad=timeCall(timings.broadFreeze,()=>prepareRecall(broad,before,index));
   preparedSmall=timeCall(timings.smallFreeze,()=>prepareRecall(small,before,index));
   resumed=clone(resumed);restartCount++;preparedResumed=prepareRecall(resumed,before,index);
   assert.deepEqual(identity(preparedSmall),identity(preparedResumed),'Prehandover restart changed selection');
   assert.equal(JSON.stringify(before),beforeText,'Preview mutated game');assert.equal(JSON.stringify(small),collectorBefore,'Preview mutated collector');
   assert.deepEqual(preparedSmall,prepareRecall(small,before,index),'Preview repeated seed changed result');
   ensureEdition(preparedBroad);ensureEdition(preparedSmall);
   const baseline=baselineById.get(preparedSmall.boundary.id);assert(baseline,'Missing fixed boundary baseline');
   boundaries.push({policy,years,generation:preparedSmall.generation,handoverId:preparedSmall.boundary.id,
    broad:preparedBroad,small:preparedSmall,baseline:{seed:baseline.seed,cutoff:baseline.cutoff,selectedIds:baseline.selectedIds,scenes:baseline.scenes},
    broadMetrics:editionMetrics(preparedBroad),smallMetrics:editionMetrics(preparedSmall),
    candidates:compareCandidates(record,preparedSmall.boundary.id,observed,Object.values(small.facts)),
    broadVsH31:compareEditions(baseline,preparedBroad),smallVsH31:compareEditions(baseline,preparedSmall),smallVsBroad:compareEditions(preparedBroad,preparedSmall,'retention'),
    beforeCounts:{broad:collectorCounts(broad),small:collectorCounts(small)},
    temporal:{previewDoesNotMutate:true,repeatIdentical:true,restartIdentical:true,retiringGenerationOnly:true,exclusiveOperationIndex:index},
   });
   diagnosticMs+=performance.now()-diagnosticStarted;
  }
  const c={broad,small,resumed},durations={};let facts;
  // Rotate independent collectors so the first observer does not always pay
  // process/JIT/cache warm-up costs for all following observers.
  const keys=['broad','small','resumed'],offset=(index+1)%3;
  for(let i=0;i<3;i++){const key=keys[(i+offset)%3],begin=performance.now(),newFacts=advanceCollector(c[key],observation);durations[key]=performance.now()-begin;if(key==='broad')facts=newFacts;}
  if(index>=0){for(const key of keys)timings[key].push(durations[key]);}
  if(operation?.key==='month'){timings.broadMonth.push(durations.broad);timings.smallMonth.push(durations.small);}
  const diagnosticStarted=performance.now();
  for(const e of facts){assert(!observedById.has(e.id),'Duplicate observed event');observed.push(e);observedById.set(e.id,e);}
  if(isHandover){
   const row=boundaries.at(-1);row.cleanup={broad:timeCall(timings.broadCommit,()=>commitRecall(broad,preparedBroad,after)),small:timeCall(timings.smallCommit,()=>commitRecall(small,preparedSmall,after))};
   commitRecall(resumed,preparedResumed,after);resumed=clone(resumed);restartCount++;
   assert.deepEqual(small,resumed,'Posthandover restart changed collector');
   row.afterCounts={broad:collectorCounts(broad),small:collectorCounts(small)};
   // All preceding completed editions remain byte identical after later operations.
   const prior=c=>sha(JSON.stringify(c.completed.slice(0,-1)));
   assert.equal(prior(broad),frozen.broad);assert.equal(prior(small),frozen.small);
   frozen={broad:frozenFingerprint(broad),small:frozenFingerprint(small)};
  }
  if(checkpointFiles.has(index)){
   const target=checkpointFiles.get(index);assert.equal(after.core.month,target.month);
   const expected=clone(target.game);delete expected.operations;delete expected.origin;assert.deepEqual(after,expected,'Formal replay checkpoint differs from generated save');
   assert.equal(frozenFingerprint(broad),frozen.broad);assert.equal(frozenFingerprint(small),frozen.small);
   assert.deepEqual(small,resumed,'Continued JSON collector differs');resumed=clone(resumed);restartCount++;
   checkpoints.push({month:target.month,years:target.month/12,operationIndex:index,formalSaveBytes:Buffer.byteLength(target.raw),sourceSha256:sha(target.raw),
    broad:{counts:collectorCounts(broad),json:timedJson(broad)},small:{counts:collectorCounts(small),json:timedJson(small)},
    memory:process.memoryUsage(),maxRssBytes:process.resourceUsage().maxRSS*1024,
    townEvents:after.labConnection.town.events.length,releases:after.releases.length,regions:new Set(observed.map(e=>e.ids.regionId).filter(Boolean)).size,
   });
   continuation.push({month:target.month,index,completed:small.completed.length,identical:true});
  }
  diagnosticMs+=performance.now()-diagnosticStarted;lastAfter=after;
 });
 const totalMs=performance.now()-replayStarted;
 assert.equal(JSON.stringify(game),raw,'Research mutated source save');assert.deepEqual(small,resumed,'Final resumed collector differs');
 assert.equal(frozenFingerprint(small),frozen.small);assert.equal(frozenFingerprint(broad),frozen.broad);
 const comments=customerComments(game),reactions=observed.filter(e=>e.kind==='reaction');
 assert.deepEqual(reactions.map(e=>({id:e.id.slice('reaction:'.length),month:e.month,text:e.label,releaseId:e.ids.releaseId})),comments,'Incremental reactions differ from formal view');
 const causal=[];
 for(const e of observed.filter(e=>['inquiry','visit'].includes(e.kind))){
  const l=linksFor(e,observed).find(l=>l.causal);if(l)causal.push({targetId:e.id,sourceId:l.sourceId,sourcePosition:position(observedById.get(l.sourceId)),targetPosition:position(e),crossGeneration:l.crossGeneration});
 }
 const collectorTimedMs=timings.broad.reduce((a,b)=>a+b,0)+timings.small.reduce((a,b)=>a+b,0)+timings.resumed.reduce((a,b)=>a+b,0);
 assert.deepEqual(sourceHashes,implementationSources(),'Implementation changed during measurement; rerun');
 const result={schema:'ambertime-h3-2-policy/1',policy,years,implementationSources:sourceHashes,sourceSha256:sha(raw),operations:game.operations.length,observed:observed.length,observedKinds:counts(observed),
  meaningfulObserved:observed.filter(useful).length,causal,checkpoints,boundaries,continuation,restartCount,
  checks:{sourceUnchanged:true,formalCheckpointsIdentical:true,incrementalCustomerCommentsIdentical:true,reactionCount:comments.length,continuedCollectorIdentical:true,frozenEditionsUnchanged:true},
  finalCounts:{broad:collectorCounts(broad),small:collectorCounts(small)},
  performance:{runtime:process.version,totalReplayHarnessMs:totalMs,diagnosticMs,collectorTimedMs,
   replayAndSnapshotOverheadMs:Math.max(0,totalMs-diagnosticMs-collectorTimedMs),
   measures:Object.fromEntries(Object.entries(timings).map(([k,v])=>[k,samples(v)])),memory:process.memoryUsage(),maxRssBytes:process.resourceUsage().maxRSS*1024,
   limitations:'Node timings include only observer/retention within collector samples, excluding initialization. Execution order rotates across the three independent collectors. Full replay/harness time includes formal model and snapshot cloning; approximate residual is not a clean standalone model benchmark. RSS/heap include source game, offline all-facts diagnostics, baseline and three collector instances; they are not collector-only memory or Safari measurements.'},
 };
 assert(lastAfter);return result;
}

export function aggregate(resultDirectory=directory){
 const base=resultDirectory instanceof URL?resultDirectory:pathToFileURL(path.resolve(resultDirectory)+'/');
 const results=[];for(const policy of ['local','wide','mixed'])for(const years of [30,100])results.push(JSON.parse(fs.readFileSync(new URL(`result-${policy}-${years}.json`,base))));
 for(const r of results)assert.deepEqual(r.implementationSources,implementationSources(),'Research implementation changed after run '+r.policy+' '+r.years);
 const prefix=[];
 for(const policy of ['local','wide','mixed']){
  const a=results.find(r=>r.policy===policy&&r.years===30),b=results.find(r=>r.policy===policy&&r.years===100);
  for(const mode of ['broad','small'])assert.deepEqual(identity(a.boundaries[0][mode]),identity(b.boundaries[0][mode]),`${policy} ${mode} 30/100 prefix changed`);
  prefix.push({policy,firstEditionIdentical:true,source30Sha256:a.sourceSha256,source100Sha256:b.sourceSha256});
 }
 const out={schema:'ambertime-h3-2-comparison/1',baseSha:'bc73b8558648a1cfe736860b2c9bc99b76659563',runtime:process.version,
  method:'Actual formal operation replay deltas, once per 30/100-year policy; current generation collection and exclusive prehandover preparation. 60/90 measurements are exact formal operation prefixes with separately generated source save checks.',
  prefix,results};
 fs.writeFileSync(new URL('comparison.json',base),JSON.stringify(out,null,2)+'\n');
 fs.writeFileSync(new URL('SCENES.md',base),sceneMarkdown(results.flatMap(r=>r.boundaries)));
 return out;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const [policy,years='100',saveDirectory='/tmp/h32-saves']=process.argv.slice(2);
 if(policy==='aggregate'){const out=aggregate();console.log(JSON.stringify({results:out.results.length,boundaries:out.results.reduce((n,r)=>n+r.boundaries.length,0),prefix:out.prefix}));}
 else {const out=runPolicy(policy,Number(years),saveDirectory);fs.writeFileSync(new URL(`result-${policy}-${years}.json`,directory),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({policy,years,observed:out.observed,boundaries:out.boundaries.length,checks:out.checks,performance:out.performance}));}
}
