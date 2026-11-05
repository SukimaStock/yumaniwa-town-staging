import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {simulateScenario} from '../history-lab/scenarios.mjs';
import {buildCaskLedger} from '../cask-ledger.mjs';
import {buildDistilleryHistory} from '../distillery-history.mjs';
import {buildReleaseLedger} from '../ledger-view.mjs';
import {buildShopLedger} from '../shop-ledger.mjs';
import {prepareRecallArchive,readRecallArchive} from '../chronicle-lab/research-h25.mjs';
import {createProjectionCollectors} from './projections.mjs';
import {loadAdapter,fullReplay,createCheckpoint,replayTail,hash} from './prototype.mjs';

function officialFacts(state){
 const ids=[...new Set([...state.core.casks,...state.core.archive,...state.records,...state.releases,...D.manualRecipeSources(state),...(state.recipeBook?.entries??[]).map(r=>r.source)].map(c=>c?.caskId??c?.id).filter(Number.isFinite))];
 return D.nearbyComparisonFacts(state,{caskIds:ids,productIds:[...new Set([...state.releases,...state.records].map(r=>r.productId))],includeManualSources:true});
}

test('resumable compact collectors reproduce independent official ledgers and raw H2-5 facts without replaying prefix',async()=>{
 const state=simulateScenario('wide',60).game,raw=JSON.stringify(state),adapter=await loadAdapter(),sourceSha256=hash(raw);
 const full=await createProjectionCollectors(state,{id:'wide',sourceSha256});
 let checkpoint,prefix;
 const stop=Math.floor(state.operations.length/2);
 const expected=fullReplay(adapter,raw,{observer:full.observe,onStep:({state,context,nextIndex})=>{if(nextIndex===stop){checkpoint=createCheckpoint(adapter,{state,context,sourceRaw:raw});prefix=full.checkpoint();}}});
 const baseline=full.finish({context:expected.context});
 const resumed=await createProjectionCollectors(state,{id:'wide',sourceSha256,prefix:JSON.parse(JSON.stringify(prefix))});
 let resumedCalls=0;
 const actual=replayTail(adapter,JSON.parse(JSON.stringify(checkpoint)),raw,{observer:observation=>{resumedCalls++;resumed.observe(observation);}});
 assert.equal(resumedCalls,state.operations.length-stop);
 assert.deepEqual(resumed.finish({context:actual.context}),baseline);
 const facts=officialFacts(state);
 assert.deepEqual(baseline.casks,buildCaskLedger(state,{facts,replay:cb=>D.replayDistilleryOperations(state,cb)}));
 assert.deepEqual(baseline.history,buildDistilleryHistory(state));
 assert.deepEqual(baseline.releases,buildReleaseLedger(state,{facts}));
 assert.deepEqual(baseline.shops,buildShopLedger(state));
 const directory=mkdtempSync(join(tmpdir(),'amber-projection-oracle-'));
 try{
  const file=join(directory,'save.json');writeFileSync(file,raw);
  const independent=JSON.parse(execFileSync(process.execPath,[new URL('../chronicle-lab/research-h25-generate.mjs',import.meta.url).pathname,file,'wide'],{encoding:'utf8',maxBuffer:16*1024*1024}));
  assert.deepEqual(baseline.rawRecord,independent.record);
  const archive=prepareRecallArchive(baseline.rawRecord),other=prepareRecallArchive(independent.record);
  assert.deepEqual(archive,other);
  assert.deepEqual(readRecallArchive(archive),readRecallArchive(other));
 }finally{rmSync(directory,{recursive:true});}
 assert.equal(JSON.stringify(state),raw,'Projection must not mutate source');
});

test('tail-only collectors expose lost prefix facts; corrupted or mismatched prefix is rejected',async()=>{
 const state=simulateScenario('local',18).game,raw=JSON.stringify(state),adapter=await loadAdapter();
 const full=await createProjectionCollectors(state);let cp,prefix;
 const end=fullReplay(adapter,raw,{observer:full.observe,onStep:({state,context,nextIndex})=>{if(nextIndex===state.operations.length&&state.core.month===12&&!cp){cp=createCheckpoint(adapter,{state,context,sourceRaw:raw});prefix=full.checkpoint();}}});
 assert.ok(cp,'A month-12 checkpoint was captured');
 const missing=await createProjectionCollectors(state);
 // A tail-only observer must be explicitly marked as incomplete; no synthetic
 // origin is sent and earlier event attribution cannot be recovered from final state.
 const observations=[];replayTail(adapter,cp,raw,{observer:o=>observations.push(o)});
 const fullView=full.finish({context:end.context});
 // The collector enforces the global index, so missing prefix is a rejected path.
 assert.throws(()=>missing.observe(observations[0]),/observation order/);
 const broken=structuredClone(prefix);broken.payload.handovers=[];
 broken.digest='wrong';await assert.rejects(createProjectionCollectors(state,{prefix:broken}),/corrupted/);
 const changed=structuredClone(state);changed.operations[0]={key:'start'};
 await assert.rejects(createProjectionCollectors(changed,{prefix}),/final target mismatch/);
 assert.ok(fullView.history.events.length>0);
});
