import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {Worker} from 'node:worker_threads';
import * as D from '../partner-orders.mjs';
import {buildCaskLedger} from '../cask-ledger.mjs';
import {twoManualRecipes,fill,advance} from './recipe-helpers.mjs';

async function workerFor(t){
 const adapter=`import {parentPort} from 'node:worker_threads';
 globalThis.self=globalThis;globalThis.postMessage=value=>parentPort.postMessage(value);
 await import(${JSON.stringify(new URL('../cask-ledger-worker.mjs',import.meta.url).href)});
 parentPort.on('message',data=>globalThis.onmessage({data}));parentPort.postMessage({ready:true});`;
 const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(adapter)),{type:'module'});
 t.after(()=>worker.terminate());assert.deepEqual((await once(worker,'message'))[0],{ready:true});
 return worker;
}
async function request(worker,requestId,state){
 const response=once(worker,'message');worker.postMessage({requestId,state});return (await response)[0];
}
function expected(state){
 const manual=D.nearbyComparisonFacts(state,{includeManualSources:true});
 const caskIds=[...new Set([...state.core.casks,...state.core.archive,...(state.records??[]),...(state.releases??[]),...manual.manualSources,...(state.recipeBook?.entries??[]).map(r=>r.source)].map(c=>c.caskId??c.id).filter(Number.isFinite))];
 const facts=D.nearbyComparisonFacts(state,{caskIds,includeManualSources:true});
 return buildCaskLedger(state,{facts,replay:observer=>D.replayDistilleryOperations(state,observer)});
}

test('real module worker returns the same detached historical projection without changing its input',async t=>{
 const worker=await workerFor(t);let {s,first}=twoManualRecipes();
 s=D.sampleDistillery(s,first);s=D.endTasting(s);s=advance(s,1);s=fill(s,{progress:65,type:'refill'});
 const raw=D.serializeDistillery(s),projection=expected(s),response=await request(worker,41,s);
 assert.deepEqual(Object.keys(response),['requestId','ledger']);assert.equal(response.requestId,41);assert.deepEqual(response.ledger,projection);
 assert.equal(response.ledger.recipes.saved.length,2);assert.equal(response.ledger.recipes.unsaved.length,1);assert.equal(response.ledger.casks.find(c=>c.caskId===first).samples.length,1);
 assert.equal(D.serializeDistillery(s),raw);
 response.ledger.recipes.saved[0].name='local change';
 const again=await request(worker,'next-snapshot',D.restoreDistillery(raw));
 assert.equal(again.requestId,'next-snapshot');assert.deepEqual(again.ledger,projection);assert.equal(D.serializeDistillery(s),raw);
});

test('worker preserves migrated coverage and missing history fields',async t=>{
 const worker=await workerFor(t),state=D.restoreDistillery(fs.readFileSync(new URL('./fixtures/v09-due.json',import.meta.url),'utf8'));
 const raw=D.serializeDistillery(state),response=await request(worker,'legacy',state);
 assert.equal(response.requestId,'legacy');assert.deepEqual(response.ledger,expected(state));
 assert.equal(response.ledger.coverage.complete,false);assert.equal(response.ledger.coverage.fromMonth,37);
 assert.equal(D.serializeDistillery(state),raw);
});

test('validation failures echo only the request ID and do not prevent the next request',async t=>{
 const worker=await workerFor(t),state=D.newRecipeDistillery(42),bad=structuredClone(state);
 bad.core.cash+=1;
 assert.deepEqual(await request(worker,'forged-state',bad),{requestId:'forged-state',error:true});
 assert.deepEqual(await request(worker,0,null),{requestId:0,error:true});
 const response=await request(worker,'recovered',state);
 assert.equal(response.requestId,'recovered');assert.deepEqual(response.ledger,expected(state));assert.equal(Object.hasOwn(response,'error'),false);
});
