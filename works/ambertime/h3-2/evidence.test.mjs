// Independent full-record evidence audit; fixture-dependent, never writes by default.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {replayDistilleryOperations} from '../partner-orders.mjs';
import {createCollector,advanceCollector,prepareRecall,commitRecall} from './collector.mjs';
const directory=process.env.H32_EVIDENCE_SAVES??'/tmp/h32-saves';
const results=[];
for(const policy of ['local','wide','mixed'])test('all actual 100-year causal edges and barrel origins: '+policy,{skip:!existsSync(join(directory,policy+'-1200.json'))},()=>{
 const raw=readFileSync(join(directory,policy+'-1200.json'),'utf8'),game=JSON.parse(raw),c=createCollector('small',game.seed);
 const positions=new Map(),starts=new Map(),fills=new Map();
 const count={townRows:0,targets:0,causalTargets:0,chainEdges:0,sourcePositionChecks:0,recoveredBeforeTarget:0,fills:0,releases:0,inheritedReleases:0,knownStarts:0,unknownStarts:0,handovers:0};
 replayDistilleryOperations(game,o=>{
  const {index,operation,before,after}=o,actor=before?.generations?.active?.id??null,town=after.labConnection?.town;
  const added=(town?.events??[]).slice(before?.labConnection?.town?.events.length??0);
  for(const [ordinal,row] of added.entries()){assert(!positions.has(row.id));positions.set(row.id,{operationIndex:index,nativeOrdinal:ordinal,generationId:actor});count.townRows++;}
  if(['start','start-usual'].includes(operation?.key)){const b=after.still.batch;starts.set(b.id,{batchId:b.id,generationId:actor,month:b.startedMonth,operationIndex:index});}
  const previousCasks=new Set((before?.core.casks??[]).map(x=>x.id));
  for(const barrel of after.core.casks??[])if(!previousCasks.has(barrel.id)){fills.set(barrel.id,{generationId:actor,batchId:barrel.batchId,month:barrel.filledMonth,start:starts.get(barrel.batchId)??null});count.fills++;}
  const targets=added.filter(r=>['inquiry','visit'].includes(r.type));
  // Independent traversal uses native append array and its separately observed positions.
  const expected=targets.map(target=>{
   const chain=[],seen=new Set();let row=target;
   while(row){assert(!seen.has(row.id));seen.add(row.id);chain.unshift(row);if(row.sourceId==null)break;
    const parent=town.events[Number(row.sourceId.slice(1))-1];assert.equal(parent?.id,row.sourceId);assert.equal(parent.releaseId,row.releaseId);assert(parent.month<=row.month);
    const a=positions.get(parent.id),b=positions.get(row.id);assert(a&&b);assert(a.operationIndex<b.operationIndex||a.operationIndex===b.operationIndex&&a.nativeOrdinal<b.nativeOrdinal);count.chainEdges++;row=parent;
   }
   const source=chain.slice(0,-1).filter(r=>r.type==='arrival'&&r.channel!=='direct').at(-1);
   return {target,chain,source,wasMissing:source&&positions.get(source.id).operationIndex<index&&!c.facts['arrival:'+source.id]};
  });
  const prepared=operation?.key==='generation-handover'?prepareRecall(c,before,index):null;
  advanceCollector(c,o);
  for(const {target,chain,source,wasMissing} of expected){count.targets++;const proof=c.proofs[target.type+':'+target.id];
   if(!source){assert.equal(proof,undefined);continue;}count.causalTargets++;if(wasMissing)count.recoveredBeforeTarget++;
   assert(proof,'Every causal target needs proof');assert.equal(proof.sourceId,'arrival:'+source.id);assert.deepEqual(proof.chain.map(r=>r.id),chain.map(r=>r.id));
   for(const node of proof.chain){const position=positions.get(node.id);assert.equal(node.operationIndex,position.operationIndex);assert.equal(node.nativeOrdinal,position.nativeOrdinal);count.sourcePositionChecks++;}
   const fact=c.facts[proof.sourceId],position=positions.get(source.id);assert(fact,'Every causal source body retained');assert.equal(fact.operationIndex,position.operationIndex);assert.equal(fact.generationId,position.generationId);assert.equal(fact.month,source.month);assert.equal(fact.ids.townReleaseId,source.releaseId);
   if(fact.generationId===c.generation)assert(c.active[fact.id],'Current-generation confirmed source remains selectable');
  }
  for(const barrel of after.core.casks??[])if(!previousCasks.has(barrel.id)){
   const expected=fills.get(barrel.id),fact=c.facts['fill:'+barrel.id],batch=c.batchOrigins[fact.id];assert.equal(fact.generationId,expected.generationId);assert.equal(fact.ids.batchId,expected.batchId);
   if(expected.start){assert.deepEqual(batch,expected.start);count.knownStarts++;}else{assert.equal(batch.generationId,null);count.unknownStarts++;}
  }
  for(const release of (after.releases??[]).slice(before?.releases?.length??0)){
   count.releases++;const expected=fills.get(release.caskId),fact=c.facts['bottling:'+release.id];assert(expected);assert.equal(fact.generationId,actor);assert.equal(fact.ids.caskId,release.caskId);assert.equal(fact.ids.productId,release.productId);
   const fill=c.facts['fill:'+release.caskId];assert(fill);assert.equal(fill.generationId,expected.generationId);assert.equal(fill.month,expected.month);assert.equal(fill.ids.batchId,expected.batchId);
   if(expected.start)assert.deepEqual(c.batchOrigins[fill.id],expected.start);if(expected.generationId<actor)count.inheritedReleases++;
  }
  if(prepared){commitRecall(c,prepared,after);count.handovers++;}
 });
 assert.equal(count.handovers,3);assert(count.causalTargets>0);assert(count.inheritedReleases>0);assert.equal(c.recovered,count.recoveredBeforeTarget);
 const encoded=JSON.stringify(c),componentBytes=Object.fromEntries(Object.entries(c).map(([key,value])=>[key,Buffer.byteLength(JSON.stringify(value))]));
 const heapDeltas=[];if(global.gc)for(let i=0;i<5;i++){global.gc();const before=process.memoryUsage().heapUsed;const parsed=JSON.parse(encoded);const after=process.memoryUsage().heapUsed;heapDeltas.push(after-before);assert.equal(parsed.version,c.version);}
 results.push({collectorBytes:Buffer.byteLength(encoded),componentBytes,parsedRepresentationHeap:{gcAvailable:!!global.gc,repeats:heapDeltas.length,bytes:heapDeltas,medianBytes:heapDeltas.length?[...heapDeltas].sort((a,b)=>a-b)[2]:null,note:'Heap delta while retaining one newly parsed collector, with GC immediately before each parse; not production peak or Safari memory.'},policy,years:100,sourceSha256:createHash('sha256').update(raw).digest('hex'),...count});
});
test.after(()=>{
 if(process.env.H32_EVIDENCE_OUTPUT){assert.equal(results.length,3,'All fixtures required for persisted evidence');writeFileSync(process.env.H32_EVIDENCE_OUTPUT,JSON.stringify({schema:'ambertime-h3-2-independent-evidence/1',scope:'All emitted inquiry/visit chains and fill/release origins, independently traversed during actual 100-year progress; no selection-only sampling.',results},null,2)+'\n');}
});
