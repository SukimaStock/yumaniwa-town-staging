// Synthetic storage-maintenance workload using an unchanged verified end-size
// formal payload. This does NOT simulate 100 years of game operations.
import {openResearchDB,makeCommit,save,read,currentHead,currentRevision,gc,inspect,markKnownGood,putBackup,digest} from './store.mjs';
const bytes=v=>new TextEncoder().encode(JSON.stringify(v)).byteLength;
const timed=async fn=>{const t=performance.now(),value=await fn();return {value,ms:performance.now()-t};};
function heap(){return performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize,jsHeapSizeLimit:performance.memory.jsHeapSizeLimit}:null;}
export async function runMaintenance(fixture,{cycles=100}={}){
 const cases=fixture.cases??fixture,entry=cases[0];if(!entry?.input)throw new Error('Actual H1-A3 fixture required');
 const nonce=Date.now()+'-'+Math.random(),measurements=[],policies=[];
 const expectedHistory=await Promise.all(entry.input.history.map(async h=>({id:h.id,hash:await digest(h.payload)})));
 const newInput=cycle=>({...structuredClone(entry.input),verification:{...entry.input.verification,syntheticMaintenanceCycle:cycle}});
 for(const policy of ['A','B','C','D']){
  const db=await openResearchDB('ambertime-h1-a4-research-retention-'+nonce+'-'+policy);let first;
  await putBackup(db,'migration-before','retained synthetic backup marker');
  for(let i=0;i<5;i++){
   const bundle=await makeCommit(newInput('retention-'+policy+'-'+i));await save(db,bundle,{strategy:'C',expectedHead:await currentHead(db),expectedRevision:await currentRevision(db)});if(i===0){first=bundle.id;await markKnownGood(db,first);}
  }
  const before=await inspect(db),sweep=await timed(()=>gc(db,{keep:policy==='D'?3:2,policy})),after=await inspect(db);
  const history=after.history.map(h=>({id:h.id,hash:h.hash}));if(JSON.stringify(history.sort((a,b)=>a.id.localeCompare(b.id)))!==JSON.stringify([...expectedHistory].sort((a,b)=>a.id.localeCompare(b.id))))throw new Error('Retention lost immutable history');
  if(after.backups.length!==1)throw new Error('GC removed migration backup');
  await read(db,{sourceHash:entry.input.sourceHash,modelFingerprint:entry.input.modelFingerprint});
  policies.push({policy,keep:policy==='D'?3:2,beforeCommits:before.commits.length,afterCommits:after.commits.length,beforeLogicalBytes:bytes(before),afterLogicalBytes:bytes(after),gcMs:sweep.ms,removedParts:sweep.value.removed,histories:after.history.length,backupRetained:true,knownGoodRetained:policy==='D'?after.commits.some(m=>m.verification.syntheticMaintenanceCycle==='retention-D-0'):null});
  db.close();
 }
 const db=await openResearchDB('ambertime-h1-a4-research-maintenance-'+nonce),initialStorage=await navigator.storage?.estimate?.(),initialHeap=heap();let peakLogicalBytes=0,peakHeap=initialHeap?.usedJSHeapSize??null;
 for(let i=0;i<cycles;i++){
  const creation=await timed(()=>makeCommit(newInput(i))),bundle=creation.value;
  const expectedHead=await currentHead(db),expectedRevision=await currentRevision(db);
  const write=await timed(()=>save(db,bundle,{strategy:'C',expectedHead,expectedRevision}));
  const loaded=await timed(()=>read(db,{sourceHash:entry.input.sourceHash,modelFingerprint:entry.input.modelFingerprint}));
  if(loaded.value.id!==bundle.id)throw new Error('Maintenance read differs');
  const sweep=await timed(()=>gc(db,{keep:2,policy:'C'}));
  const h=heap();if(h)peakHeap=Math.max(peakHeap??0,h.usedJSHeapSize);
  let logicalBytes=null;
  if(i===0||i===cycles-1||(i+1)%10===0){logicalBytes=bytes(await inspect(db));peakLogicalBytes=Math.max(peakLogicalBytes,logicalBytes);}
  measurements.push({cycle:i,createMs:creation.ms,writeMs:write.ms,readMs:loaded.ms,gcMs:sweep.ms,logicalBytes,heap:h});
 }
 const finalStorage=await navigator.storage?.estimate?.(),last=await inspect(db);db.close();
 const totals=Object.fromEntries(['createMs','writeMs','readMs','gcMs'].map(k=>[k,measurements.reduce((sum,r)=>sum+r[k],0)]));
 return {schema:'ambertime-idb-maintenance/1',cycles,sourceHash:entry.input.sourceHash,payloadBytes:bytes(entry.input),historyCount:entry.input.history.length,policies,totals,measurements,peakLogicalBytes,peakJSHeapBytes:peakHeap,initialStorage,finalStorage,initialHeap,finalRetainedCommits:last.commits.length,limits:['Repeated 100-year end-size payload, not a historical 100-year simulation.','Logical JSON bytes are not physical IndexedDB allocation.','navigator.storage.estimate covers the entire test origin and is approximate.','performance.memory is Chromium-specific and is not process RSS or iPhone memory.','Peak logical size sampled after GC; transient candidate size is separately bounded by old retained payloads plus new candidate, not directly sampled.']};
}
