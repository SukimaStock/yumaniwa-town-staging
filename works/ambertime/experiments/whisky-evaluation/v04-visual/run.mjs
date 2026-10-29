import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import * as M from '../v03/model.mjs';
import {traceScenario} from '../v03/scenarios.mjs';
import {visualTrace} from './timeline.mjs';
import {sceneFor,renderScene,VARIANTS,SCENE_VERSION} from './scene.mjs';

const seeds=Array.from({length:Number(process.argv[2]??100)},(_,i)=>i+Number(process.argv[3]??1)),shops=['bar','diner','specialist'],scenarios=['A','B','C','D'];
const checks={canonicalFinalEquality:0,exactStock:0,positiveRecordSources:0,storeIsolation:0,pureDeterministicProjection:0,viewStateEquality:0,saleFrames:0,deliveryFrames:0,emptyGaps:0};
const totals={deliveryBottles:0,postSaleBottles:0,positiveRecords:0,excludedNonpositiveRecords:0,excludedUnsoldRecords:0,excludedNonpositivePurchases:0,emptySalesFrames:0,maxVisibleStock:0,maxHiddenStock:0,maxMemoryCount:0,maxSvgElements:0};
const samples=[],byShop=Object.fromEntries(shops.map(id=>[id,{delivery:0,afterSale:0,memories:0,frames:0}]));
const durations=[];let example=null;
const summarize=(scene)=>({shopId:scene.shopId,month:scene.month,stockCount:scene.stockCount,draftCount:scene.draftCount,memories:scene.memories.map(x=>({productId:x.productId,years:x.years,sold:x.sold,supportCount:x.supportCount})),links:scene.links,expectationStrength:scene.expectationStrength});
function inspect(session,shopId,phase){
 const before=M.serialize(session),start=performance.now(),scene=sceneFor(session,shopId);
 assert.deepEqual(sceneFor(session,shopId),scene);checks.pureDeterministicProjection++;
 const stock=session.sales.products.reduce((n,p)=>n+(p.shops[shopId]??0),0);
 assert.equal(scene.stockCount,stock);assert.equal(scene.current.length,stock);
 assert.equal(scene.visibleCurrent.length+scene.hiddenStock,stock);checks.exactStock++;
 const archive=session.relations[shopId].archive;
 assert.deepEqual(scene.memories.map(x=>x.productId).sort((a,b)=>a-b),archive.filter(r=>r.sold>0&&r.supportCount>0).map(x=>x.productId).sort((a,b)=>a-b));
 for(const r of scene.memories){const actual=archive.find(x=>x.productId===r.productId);assert.ok(actual.sold>0&&actual.supportCount>0);assert.equal(r.sold,actual.sold);assert.equal(r.supportCount,actual.supportCount);checks.positiveRecordSources++;}
 totals.excludedNonpositiveRecords+=archive.filter(x=>!x.sold||!x.supportCount).length;
 totals.excludedUnsoldRecords+=archive.filter(x=>!x.sold).length;
 totals.excludedNonpositivePurchases+=archive.filter(x=>x.sold>0&&!x.supportCount).length;
 for(const variant of Object.keys(VARIANTS)){
  const html=renderScene(scene,variant);
  assert.equal((html.match(/data-kind="current"/g)??[]).length,scene.visibleCurrent.length);
  assert.equal((html.match(/data-kind="memory"/g)??[]).length,scene.visibleMemories.length);
  assert.equal((html.match(/data-kind="draft"/g)??[]).length,scene.visibleDraft.length);
  assert.match(html,new RegExp(`data-stock-count="${stock}"`));
  totals.maxSvgElements=Math.max(totals.maxSvgElements,(html.match(/<(?:rect|svg|g|path|text|title)\b/g)??[]).length);checks.viewStateEquality++;
 }
 for(const other of shops.filter(x=>x!==shopId)){const otherScene=sceneFor(session,other);assert.equal(otherScene.stockCount,0);assert.equal(otherScene.memories.length,0);checks.storeIsolation++;}
 assert.equal(M.serialize(session),before);durations.push(performance.now()-start);
 totals.maxVisibleStock=Math.max(totals.maxVisibleStock,scene.visibleCurrent.length);totals.maxHiddenStock=Math.max(totals.maxHiddenStock,scene.hiddenStock);totals.maxMemoryCount=Math.max(totals.maxMemoryCount,scene.memories.length);
 byShop[shopId].frames++;byShop[shopId].memories+=scene.memories.length;
 if(phase==='delivery'){checks.deliveryFrames++;totals.deliveryBottles+=stock;byShop[shopId].delivery+=stock;}
 else {checks.saleFrames++;totals.postSaleBottles+=stock;byShop[shopId].afterSale+=stock;if(stock===0)totals.emptySalesFrames++;}
 totals.positiveRecords+=scene.memories.length;
 return scene;
}
for(const seed of seeds){
 for(const shopId of shops)for(const scenario of scenarios){
  const options={seed,shopId,scenario},trace=visualTrace(options),canonical=traceScenario(options);
  assert.equal(M.serialize(trace.state),M.serialize(canonical.state));checks.canonicalFinalEquality++;
  for(const frame of trace.frames){const scene=inspect(frame.session,shopId,frame.phase);if(seed===42&&shopId==='bar'&&scenario==='D')samples.push({phase:frame.phase,release:frame.release,...summarize(scene)});}
  if(seed===42&&shopId==='bar'&&scenario==='D')example=M.serialize(trace.state);
  if(scenario==='D'){
   const before=sceneFor(trace.state,shopId),gap=M.transact(trace.state,{type:'wait',months:120}),after=sceneFor(gap,shopId);
   assert.equal(after.stockCount,0);assert.deepEqual(after.memories.map(x=>[x.productId,x.sold,x.supportCount]),before.memories.map(x=>[x.productId,x.sold,x.supportCount]));assert.ok(after.expectationStrength<=before.expectationStrength);checks.emptyGaps++;
  }
 }
 if(seed%10===0)process.stdout.write(`seed ${seed} complete (${seeds.indexOf(seed)+1}/${seeds.length} in this partition)\n`);
}
if(!example)example=M.serialize(visualTrace({seed:seeds[0],shopId:'bar',scenario:'D'}).state);
assert.equal(M.serialize(M.restore(example)),example);
durations.sort((a,b)=>a-b);
const out={version:SCENE_VERSION,modelVersion:M.VERSION,sourceBase:'577abd31b020ad614fb408873c0ff869f1f41a20',seeds,shops,scenarios,framesPerHistory:10,histories:checks.canonicalFinalEquality,checks,totals,byShop,samples,performance:{unit:'ms; projection + 3 SVG strings + structural checks, Node host; not iPhone rendering',count:durations.length,min:durations[0],median:durations[Math.floor(durations.length*.5)],p90:durations[Math.floor(durations.length*.9)],max:durations.at(-1)}};
const directory=process.argv[4]?pathToFileURL(process.argv[4].replace(/\/$/,'')+'/'):new URL('./',import.meta.url);
await mkdir(directory,{recursive:true});
if(process.argv[4])out.durationSamples=durations;
await writeFile(new URL('./results.json',directory),JSON.stringify(out,null,2)+'\n');
await writeFile(new URL('./example-log.json',directory),example+'\n');
process.stdout.write(JSON.stringify({histories:out.histories,checks,totals})+'\n');
