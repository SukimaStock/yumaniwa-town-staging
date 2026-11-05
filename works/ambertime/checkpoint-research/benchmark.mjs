// Offline sequential H1-A2 measurements. Source saves are read-only.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadAdapter,fullReplay,createCheckpoint,replayTail,encodeContext,hash,bytes} from './prototype.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
const sha=text=>createHash('sha256').update(text).digest('hex');
const atom=(path,value)=>{writeFileSync(path+'.tmp',JSON.stringify(value,null,2)+'\n');renameSync(path+'.tmp',path);};
const ms=fn=>{const t=performance.now(),value=fn();return {value,ms:performance.now()-t};};
const memory=()=>({...process.memoryUsage(),peakRssBytes:process.resourceUsage().maxRSS*1024});
function fingerprint(modelFingerprint){
 const root=fileURLToPath(new URL('../',import.meta.url)),paths=[];
 function walk(path,prefix=''){for(const entry of readdirSync(path,{withFileTypes:true})){if(entry.name==='node_modules'||entry.name==='.git')continue;const name=prefix+entry.name;if(entry.isDirectory())walk(resolve(path,entry.name),name+'/');else if(entry.isFile()&&entry.name.endsWith('.mjs'))paths.push(name);}}
 walk(root);
 const source=paths.sort().map(name=>[name,sha(readFileSync(resolve(root,name),'utf8'))]);
 const oraclePaths=['../save-audit/results.json','../chronicle-lab/facts.json','../chronicle-lab/facts-d.json','../chronicle-lab/facts-recalls.json','../chronicle-lab/facts-recalls-long.json'];
 const oracles=oraclePaths.map(path=>[path,sha(readFileSync(new URL(path,import.meta.url),'utf8'))]);
 return hash({modelFingerprint,source,oracles});
}
const baselineRows=JSON.parse(readFileSync(new URL('../save-audit/results.json',import.meta.url),'utf8')).results;
function checkSource(file){
 const raw=readFileSync(file,'utf8'),state=JSON.parse(raw),id=/^(local|wide|mixed)-/.exec(file.split('/').at(-1))?.[1];
 const expected=baselineRows.find(row=>row.id===id&&row.month===state.core.month);
 assert(expected,'Expected H1-A1 scenario/year');assert.equal(hash(raw),expected.hash,'H1-A1 source hash changed');assert.equal(bytes(raw),expected.bytes);
 return {raw,state,id,sourceHash:hash(raw)};
}
function scheduleState(){return {
 generation:{count:0,lastMonth:0},annual:{count:0,lastMonth:0},
 operations64:{count:0,lastIndex:0},operations128:{count:0,lastIndex:0},
 workload64MiB:{count:0,work:0,lastIndex:0},
};}

export async function measureCondition(file,output){
 const {raw,state:target,id,sourceHash}=checkSource(file),adapter=await loadAdapter();
 const codeFingerprint=fingerprint(adapter.fingerprint);
 if(existsSync(output)){
  const old=JSON.parse(readFileSync(output,'utf8'));
  assert.equal(old.status,'complete','Incomplete condition is not reusable');
  assert.equal(old.sourceHash,sourceHash);assert.equal(old.codeFingerprint,codeFingerprint,'Research code changed: choose a new output directory');
  return {...old,reused:true};
 }
 const {createProjectionCollectors}=await import('./projections.mjs');
 const {prepareRecallArchive,readRecallArchive}=await import('../chronicle-lab/research-h25.mjs');
 const {recallSentence,firstDeliveryIds}=await import('../chronicle-lab/caption.mjs');
 // This unmodified module is fresh in each worker. Its private validation cache is empty.
 const official=await import('../partner-orders.mjs');
 globalThis.gc?.();const officialMemoryBefore=memory(),start=performance.now();
 const officialState=official.restoreDistillery(raw),officialRestoreMs=performance.now()-start;
 assert.equal(JSON.stringify(officialState),raw,'Official restoration differs');
 const warmStart=performance.now();assert.equal(official.serializeDistillery(officialState),raw);const officialWarmResaveMs=performance.now()-warmStart;
 const officialMemoryAfter=memory();
 const collectors=await createProjectionCollectors(target,{id,sourceSha256:sourceHash}),schedules=scheduleState(),latest=new Map();
 let captureMs=0,collectorMs=0,checkpointCaptureCount=0,lastStateBytes=bytes(raw),currentState;
 const fullStart=performance.now();
 const full=fullReplay(adapter,raw,{
  observer:observation=>{const t=performance.now();collectors.observe(observation);collectorMs+=performance.now()-t;},
  onStep:({state,context,index,nextIndex,operation})=>{
   currentState=state;if(!operation){lastStateBytes=bytes(state);return;}
   const due=[];
   if(operation.key==='generation-handover'){schedules.generation.count++;due.push('generation');}
   if(state.core.month>=schedules.annual.lastMonth+12){schedules.annual.count++;schedules.annual.lastMonth=state.core.month;due.push('annual');}
   for(const n of [64,128])if(nextIndex-schedules['operations'+n].lastIndex>=n){schedules['operations'+n].count++;schedules['operations'+n].lastIndex=nextIndex;due.push('operations'+n);}
   // Deliberately simple proxy: one current serialized-state byte cost per operation.
   // Refresh size only at 64-operation boundaries. This is not measured CPU time.
   if(nextIndex%64===0)lastStateBytes=bytes(state);
   schedules.workload64MiB.work+=lastStateBytes;
   if(schedules.workload64MiB.work>=64*1024*1024){schedules.workload64MiB.count++;schedules.workload64MiB.work=0;schedules.workload64MiB.lastIndex=nextIndex;due.push('workload64MiB');}
   if(nextIndex>=target.operations.length)return; // Every measured tail must contain real operations.
   if(!due.length)return;
   const t=performance.now(),checkpoint=createCheckpoint(adapter,{state,context,sourceRaw:raw}),stateCreateMs=performance.now()-t,projectionStart=performance.now(),projection=collectors.checkpoint();
   const entry={checkpoint,projection,stateCreateMs,projectionCreateMs:performance.now()-projectionStart,createMs:performance.now()-t};captureMs+=entry.createMs;checkpointCaptureCount++;
   for(const policy of due)latest.set(policy,entry);
  },
 });
 const fullWallMs=performance.now()-fullStart;
 assert.equal(JSON.stringify(full.state),raw);assert.equal(JSON.stringify(full.state),JSON.stringify(officialState));
 const fullContext=encodeContext(full.context),fullProjection=collectors.finish({context:full.context});
 const projectionDigest=hash(fullProjection);
 const recallOf=projection=>{
  const archive=prepareRecallArchive(projection.rawRecord);
  const firsts=firstDeliveryIds(projection.rawRecord);
  return {archive,editions:archive.snapshots.map(snapshot=>{const edition=readRecallArchive(archive,snapshot.handoverId);return {...edition,sentences:edition.result.frames.map(frame=>recallSentence(frame.events[0],firsts))};})};
 };
 const fullRecall=recallOf(fullProjection),recallDigest=hash(fullRecall);
 const prior=baselineRows.find(row=>row.id===id&&row.month===target.core.month);
 assert.equal(fullProjection.rawRecord.events.length,prior.facts.rawEvents,'Raw fact count differs from H1-A1');
 assert.equal(fullRecall.archive.events.length,prior.facts.archiveEvents,'Candidate count differs from H1-A1');
 assert.equal(bytes(fullRecall.archive),prior.facts.archiveBytes,'Candidate archive bytes differ from H1-A1');
 assert.deepEqual(fullRecall.editions[0].result.audit.selectedIds,prior.facts.edits[0].selectedIds,'Anniversary selection differs from H1-A1');
 assert.equal(fullRecall.editions[0].result.audit.seed,prior.facts.edits[0].seed,'Anniversary seed differs from H1-A1');
 const {withRecallSnapshots}=await import('../chronicle-lab/recall-snapshots.mjs');
 const {buildChronicle}=await import('../chronicle-lab/editor.mjs');
 const {withReputationCandidates}=await import('../chronicle-lab/facts-d.mjs');
 let historicalOracle=null;
 if(target.core.month===1200){
  const published=JSON.parse(readFileSync(new URL('../chronicle-lab/facts-recalls-long.json',import.meta.url),'utf8'));
  historicalOracle={record:published.records[id],supplement:published.recalls[id]};
 }else if(target.core.month===360){
  const json=name=>JSON.parse(readFileSync(new URL('../chronicle-lab/'+name,import.meta.url),'utf8'))[id];
  historicalOracle={record:withReputationCandidates(json('facts.json'),json('facts-d.json')),supplement:json('facts-recalls.json')};
 }
 let publishedBoundaryCount=0;
 if(historicalOracle){
  assert.equal(historicalOracle.record.sourceSha256,sourceHash);
  const connected=withRecallSnapshots(historicalOracle.record,historicalOracle.supplement),firsts=firstDeliveryIds(connected);
  for(const published of historicalOracle.supplement.snapshots){
   const actual=fullRecall.editions.find(edition=>edition.handoverId===published.handoverId),snapshot=fullRecall.archive.snapshots.find(snapshot=>snapshot.handoverId===published.handoverId);
   assert(actual&&snapshot,'Missing published historical boundary');
   for(const key of ['cutoff','seedGeneration','eventIds','ordinalOverrides'])assert.deepEqual(snapshot[key],published[key],'Published H2-5 boundary differs: '+key);
   const expected=buildChronicle(connected,'handover','d',{handoverId:published.handoverId});
   assert.deepEqual(actual.result.frames,expected.frames,'Published H2-5 frames differ');
   assert.deepEqual(actual.result.audit,expected.audit,'Published H2-5 audit differs');
   assert.deepEqual(actual.sentences,expected.frames.map(frame=>recallSentence(frame.events[0],firsts)),'Published H2-5 sentences differ');
   publishedBoundaryCount++;
  }
 }

 const policyResults=[];
 mkdirSync(dirname(output),{recursive:true});
 for(const [policy,schedule] of Object.entries(schedules)){
  const entry=latest.get(policy);assert(entry,'No nonterminal checkpoint for '+policy);
  const cpFile=resolve(dirname(output),`${id}-${target.core.month}-${policy}.checkpoint.json`);
  if(!existsSync(cpFile))atom(cpFile,{checkpoint:entry.checkpoint,projection:entry.projection});
  else assert.equal(readFileSync(cpFile,'utf8'),JSON.stringify({checkpoint:entry.checkpoint,projection:entry.projection},null,2)+'\n','Do not overwrite a different existing checkpoint');
  globalThis.gc?.();const before=memory(),read=ms(()=>JSON.parse(readFileSync(cpFile,'utf8')));
  const pure=replayTail(adapter,read.value.checkpoint,raw);
  assert.equal(JSON.stringify(pure.state),JSON.stringify(officialState));assert.deepEqual(encodeContext(pure.context),fullContext);
  const hydrateStart=performance.now(),resumedCollectors=await createProjectionCollectors(target,{prefix:read.value.projection,id,sourceSha256:sourceHash}),projectionHydrateMs=performance.now()-hydrateStart;
  let projectionObserveMs=0;
  const resumed=replayTail(adapter,read.value.checkpoint,raw,{observer:observation=>{const t=performance.now();resumedCollectors.observe(observation);projectionObserveMs+=performance.now()-t;}});
  const compareStart=performance.now();
  assert.equal(JSON.stringify(resumed.state),JSON.stringify(officialState),'Tail differs from independent official full restoration');
  assert.deepEqual(encodeContext(resumed.context),fullContext,'Replay context differs');
  const projection=resumedCollectors.finish({context:resumed.context});assert.deepEqual(projection,fullProjection,'Ledger/raw-history collector continuation differs');
  const recall=recallOf(projection);assert.deepEqual(recall,fullRecall,'Historical candidates/boundaries/seeds/selection/sentences differ');
  const comparisonMs=performance.now()-compareStart,after=memory();
  const cp=entry.checkpoint;
  policyResults.push({policy,checkpointCount:schedule.count,checkpointMonth:cp.month,nextIndex:cp.nextIndex,tailMonths:target.core.month-cp.month,tailOperations:resumed.replayed,
   checkpointBytes:bytes(cp),projectionPrefixBytes:bytes(entry.projection),combinedCheckpointBytes:bytes(readFileSync(cpFile,'utf8')),
   checkpointCreateMs:entry.createMs,stateCheckpointCreateMs:entry.stateCreateMs,projectionCheckpointCreateMs:entry.projectionCreateMs,checkpointReadParseMs:read.ms,
   pureTailMs:pure.tailMs,pureVerifyMs:pure.verifyMs,pureFinalizeMs:pure.finalizeMs,pureCompareMs:pure.compareMs,localPartialTotalMs:read.ms+pure.totalMs,projectionHydrateMs,
   verifyMs:resumed.verifyMs,tailMs:resumed.tailMs,projectionObserveMs,finalizeMs:resumed.finalizeMs,
   finalStateCompareMs:resumed.compareMs,additionalComparisonMs:comparisonMs,partialTotalMs:read.ms+resumed.totalMs,materialTotalMs:read.ms+projectionHydrateMs+resumed.totalMs+comparisonMs,
   before,after,stateEqual:true,contextEqual:true,projectionEqual:true,recallEqual:true,projectionDigest,recallDigest,
   guarantee:resumed.guarantee,formalEquivalentValidationMs:null,
  });
  console.error(JSON.stringify({id,month:target.core.month,policy,tail:resumed.replayed,tailMs:resumed.tailMs,complete:true}));
 }
 assert.equal(readFileSync(file,'utf8'),raw,'Source save changed');
 const result={schema:'ambertime-checkpoint-research-result/1',status:'complete',id,month:target.core.month,sourceHash,sourceBytes:bytes(raw),sourceCodeUnits:raw.length,
  codeFingerprint,modelFingerprint:adapter.fingerprint,modelSourceSha:adapter.sourceSha,node:process.version,platform:process.platform,arch:process.arch,
  officialRestoreMs,officialWarmResaveMs,officialMemoryBefore,officialMemoryAfter,
  fullTrajectory:{wallMs:fullWallMs,replayMs:full.replayMs,collectorMs,captureMs,checkpointCaptureCount,operations:full.replayed},
  projectedCounts:{rawEvents:fullProjection.rawRecord.events.length,candidateEvents:fullRecall.archive.events.length,snapshots:fullRecall.archive.snapshots.length},
  projectionDigest,recallDigest,publishedBoundaryCount,policies:policyResults,peakRssBytes:process.resourceUsage().maxRSS*1024,
  caveats:['One independent official cold restore per condition, no confidence interval. Partial replays run later in the same warm process; they are not fresh-process cold checkpoint-load benchmarks. State-only totals conservatively include reading/parsing the combined checkpoint plus projection sidecar file.','pureTailMs excludes observers; tailMs includes projection observation and snapshot clones. localPartialTotalMs includes JSON parse, local checks, pure tail, finalize and exact final-state compare. materialTotalMs additionally measures collector hydration/continuation and material comparisons.','Checkpoint local hash/prefix checks do not prove prefix authenticity.','formalEquivalentValidationMs is unknown: persistent trusted checkpoint validation contract is not implemented.','State/checkpoint retain complete prefix operations; no capacity-reduction claim.','Process peak RSS is cumulative and includes multiple representations; it is not isolated phase peak.','All schedule counts are observed trajectory trigger counts, not retained-copy requirements.','workload64MiB estimates serialized-state-byte work, not actual CPU time.'],
 };
 atom(output,result);return result;
}

async function cli(){
 const [mode,...args]=process.argv.slice(2);
 if(mode==='condition'){
  const [file,output]=args;assert(file&&output,'condition <save.json> <result.json>');
  const result=await measureCondition(resolve(file),resolve(output));console.log(JSON.stringify({id:result.id,month:result.month,status:result.status,reused:result.reused??false}));
 }else if(mode==='all'){
  const [saveDirectory,outputDirectory]=args;assert(saveDirectory&&outputDirectory,'all <save-directory> <output-directory>');mkdirSync(outputDirectory,{recursive:true});
  const results=[];
  // Years first: small conditions must pass before the study reaches 100 years.
  for(const month of [360,720,1080,1200])for(const id of ['local','wide','mixed']){
   const save=resolve(saveDirectory,`${id}-${month}.json`),output=resolve(outputDirectory,`${id}-${month}.json`);
   const run=spawnSync(process.execPath,['--expose-gc',fileURLToPath(import.meta.url),'condition',save,output],{stdio:'inherit'});
   assert.equal(run.status,0,'Failed condition must not enter aggregate '+id+' '+month);
   results.push(JSON.parse(readFileSync(output,'utf8')));
   atom(resolve(outputDirectory,'results.json'),{schema:'ambertime-checkpoint-research-results/1',complete:results.length===12,results});
  }
 }else throw Error('Usage: benchmark.mjs condition <save> <result> | all <save-directory> <output-directory>');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await cli();
