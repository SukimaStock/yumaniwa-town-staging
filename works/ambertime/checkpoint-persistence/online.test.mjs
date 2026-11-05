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
import {loadAdapter,fullReplay,createCheckpoint,replayTail,hash} from '../checkpoint-research/prototype.mjs';
import {createOnlineCollectors} from './online.mjs';

function officialFacts(state){
 const ids=[...new Set([...state.core.casks,...state.core.archive,...state.records,...state.releases,...D.manualRecipeSources(state),...(state.recipeBook?.entries??[]).map(r=>r.source)].map(c=>c?.caskId??c?.id).filter(Number.isFinite))];
 return D.nearbyComparisonFacts(state,{caskIds:ids,productIds:[...new Set([...state.releases,...state.records].map(r=>r.productId))],includeManualSources:true});
}
function officialLedgers(state,actual){const facts=officialFacts(state);assert.deepEqual(actual.casks,buildCaskLedger(state,{facts,replay:cb=>D.replayDistilleryOperations(state,cb)}));assert.deepEqual(actual.history,buildDistilleryHistory(state));assert.deepEqual(actual.releases,buildReleaseLedger(state,{facts}));assert.deepEqual(actual.shops,buildShopLedger(state));}
async function replayOnline(adapter,state){const raw=JSON.stringify(state),collector=await createOnlineCollectors(adapter.research.initial(state));const full=fullReplay(adapter,raw,{observer:collector.observe});return {collector,full,view:collector.finish({state,context:full.context,sourceSha256:hash(raw)})};}

test('online 60-month collectors match independent official ledgers/raw extraction and finish is pure',async()=>{
 const state=simulateScenario('wide',60).game,raw=JSON.stringify(state),adapter=await loadAdapter();
 const {collector,full,view}=await replayOnline(adapter,state);
 const before=collector.checkpoint(state);
 assert.deepEqual(collector.finish({state,context:full.context,sourceSha256:hash(raw)}),view);
 assert.deepEqual(collector.checkpoint(state),before,'finish cannot change future continuation');
 officialLedgers(state,view);
 const dir=mkdtempSync(join(tmpdir(),'amber-online-oracle-'));
 try{const file=join(dir,'save.json');writeFileSync(file,raw);const independent=JSON.parse(execFileSync(process.execPath,[new URL('../chronicle-lab/research-h25-generate.mjs',import.meta.url).pathname,file,'research'],{encoding:'utf8',maxBuffer:16*1024*1024}));assert.deepEqual(view.rawRecord,independent.record);}finally{rmSync(dir,{recursive:true});}
});

test('a past-only checkpoint continues into independent future branches without collector contamination',async()=>{
 const state=simulateScenario('wide',60).game,raw=JSON.stringify(state),adapter=await loadAdapter();
 const online=await createOnlineCollectors(adapter.research.initial(state));let checkpoint,prefix,boundary;
 const stop=Math.floor(state.operations.length/2);
 fullReplay(adapter,raw,{observer:online.observe,onStep:({state,context,nextIndex})=>{if(nextIndex===stop){boundary=structuredClone(state);checkpoint=createCheckpoint(adapter,{state,context,sourceRaw:JSON.stringify(state)});prefix=online.checkpoint(state);}}});
 const futures=[state,D.tickDistillery(boundary)];
 const frozen=JSON.stringify(prefix);
 for(const final of futures){
  const resumed=await createOnlineCollectors(boundary,{prefix:JSON.parse(frozen)});
  const replayed=replayTail(adapter,checkpoint,JSON.stringify(final),{binding:'prefix-branch',observer:resumed.observe});
  const actual=resumed.finish({state:final,context:replayed.context,sourceSha256:hash(JSON.stringify(final))});
  const baseline=await replayOnline(adapter,final);
  assert.deepEqual(actual,baseline.view);officialLedgers(final,actual);
  assert.equal(JSON.stringify(prefix),frozen);
 }
 assert.notEqual(JSON.stringify(futures[0].operations),JSON.stringify(futures[1].operations));
});
