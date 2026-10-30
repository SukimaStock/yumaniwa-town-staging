import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import * as M from '../v03/model.mjs';
import {traceScenario} from '../v03/scenarios.mjs';
import {visualTrace} from '../v04-visual/timeline.mjs';
import {renderMap,SIZE} from '../../../experiments/world-map/v01/map.mjs';
import {mapFor,pinsMarkup,paintMap,VARIANTS,MAP_VERSION} from './map.mjs';

const seeds=Array.from({length:Number(process.argv[2]??100)},(_,i)=>i+Number(process.argv[3]??1)),shops=['bar','diner','specialist'],scenarios=['A','B','C','D'],stages=[2,3];
const checks={canonicalFinalEquality:0,frameFacts:0,stageFacts:0,viewNonmutation:0,positiveEvidence:0,storeIsolation:0,pastSources:0,deterministic:0,nativeCanvasPrefix:0,emptyGap:0,multipleStoreFixtures:0,multipleStoreFacts:0};
const totals={deliveryFrames:0,salesFrames:0,unsoldReportFrames:0,nonpositiveReportFrames:0,positiveReportFrames:0,maxPins:0,maxCanvasRects:0};
const samples=[],durations=[];let example=null;
const q=a=>a.length?a[Math.floor((a.length-1)*.9)]:0;
function canvasRecorder(){const calls=[];const ctx={fillStyle:'',imageSmoothingEnabled:true,fillRect(...r){calls.push([...r,this.fillStyle]);}};return {width:SIZE,height:SIZE,getContext(){return ctx;},calls,ctx};}
const expectedSold=(s,id)=>s.sales.products.reduce((n,p)=>n+M.productSummary(s,p.id).byShop.find(x=>x.shopId===id).sold,0);
const expectedRemaining=(s,id)=>s.sales.products.reduce((n,p)=>n+(p.shops[id]??0),0);
function inspect(frame,shopId,seed,scenario){
 const s=frame.session,before=M.serialize(s),start=performance.now();
 const projection=mapFor(s,2),pin=projection.pins.find(x=>x.id===shopId),archive=s.relations[shopId].archive;
 assert.ok(pin);assert.equal(pin.sold,expectedSold(s,shopId));assert.equal(pin.remaining,expectedRemaining(s,shopId));
 const positive=archive.reduce((n,r)=>n+r.supportCount,0);assert.equal(pin.positiveCount,positive);
 assert.deepEqual(projection.pins.map(x=>x.id),[shopId]);checks.frameFacts++;
 if(frame.phase==='delivery')totals.deliveryFrames++;else totals.salesFrames++;
 const record=archive.find(x=>x.productId===pin.reportProductId);
 assert.ok(record);if(record.sold===0)totals.unsoldReportFrames++;else if(record.supportCount===0)totals.nonpositiveReportFrames++;else totals.positiveReportFrames++;
 for(const person of [pin.buyerPositive,pin.buyerNegative].filter(Boolean)){
  assert.equal(person.productId,pin.reportProductId);assert.ok(record.sold>0);
  if(person===pin.buyerPositive){assert.ok(['like','strong'].includes(person.verdict));checks.positiveEvidence++;}
 }
 if(pin.pastMemory){const r=archive.find(x=>x.productId===pin.pastMemory.productId);assert.ok(r&&r.sold>0);assert.equal(r.sold,pin.pastMemory.sold);assert.ok(r.lastSale<=s.sales.month);checks.pastSources++;}
 for(const e of pin.expectationExamples){const r=archive.find(x=>x.productId===e.productId);assert.ok(r&&r.sold>0&&r.supportCount>0);assert.ok(r.lastSale<=s.sales.month);checks.positiveEvidence++;}
 for(const id of shops.filter(x=>x!==shopId)){assert.equal(expectedSold(s,id),0);assert.equal(expectedRemaining(s,id),0);assert.ok(!projection.pins.some(p=>p.id===id));checks.storeIsolation++;}
 for(const stage of stages){
  const view=mapFor(s,stage);assert.deepEqual(mapFor(s,stage),view);checks.deterministic++;
  const p=view.pins.find(x=>x.id===shopId);assert.equal(p.sold,pin.sold);assert.equal(p.remaining,pin.remaining);assert.equal(p.positiveCount,pin.positiveCount);checks.stageFacts++;
  totals.maxPins=Math.max(totals.maxPins,view.pins.length);
  for(const variant of Object.keys(VARIANTS)){
   const markup=pinsMarkup(view,variant,shopId);assert.equal((markup.match(/data-map-shop=/g)??[]).length,view.pins.length);assert.ok(markup.includes(shopId));checks.viewNonmutation++;
  }
  // Small fixed subset compares every background fillRect to native output.
  if(seed===1){const native=canvasRecorder(),painted=canvasRecorder();renderMap(native.ctx,stage);paintMap(painted,view,'numbers',shopId);assert.deepEqual(painted.calls.slice(0,native.calls.length),native.calls);assert.equal(painted.ctx.imageSmoothingEnabled,false);totals.maxCanvasRects=Math.max(totals.maxCanvasRects,painted.calls.length);checks.nativeCanvasPrefix++;}
 }
 assert.equal(M.serialize(s),before);durations.push(performance.now()-start);
 if(seed===42&&scenario==='D'&&shopId==='bar')samples.push({phase:frame.phase,release:frame.release,month:s.sales.month,pins:projection.pins.map(p=>({id:p.id,sold:p.sold,remaining:p.remaining,positiveCount:p.positiveCount,reportProductId:p.reportProductId,pastMemory:p.pastMemory,change:p.change}))});
}
function mixedFixture(seed){
 let s=M.create({seed});s=M.transact(s,{type:'advance',months:1});
 for(const spec of [{sample:'sweet',years:8},{sample:'deep',years:15}]){
  s=M.transact(s,{type:'next',...spec,tier:'standard'});
  for(const shopId of ['bar','diner'])s=M.transact(s,{type:'place',shopId,portion:'1'});
  s=M.transact(s,{type:'place',shopId:'specialist',portion:'all'});s=M.transact(s,{type:'confirm'});s=M.transact(s,{type:'advance',months:1});
 }
 const before=M.serialize(s),p=mapFor(s,2);assert.equal(p.pins.length,3);totals.maxPins=Math.max(totals.maxPins,p.pins.length);
 for(const pin of p.pins){assert.equal(pin.sold,expectedSold(s,pin.id));assert.equal(pin.remaining,expectedRemaining(s,pin.id));checks.multipleStoreFacts++;}
 for(const variant of Object.keys(VARIANTS))assert.equal((pinsMarkup(p,variant).match(/data-map-shop=/g)??[]).length,3);
 assert.equal(M.serialize(s),before);checks.multipleStoreFixtures++;
}
for(const seed of seeds){
 mixedFixture(seed);
 for(const shopId of shops)for(const scenario of scenarios){
  const options={seed,shopId,scenario},trace=visualTrace(options),canonical=traceScenario(options);
  assert.equal(M.serialize(trace.state),M.serialize(canonical.state));checks.canonicalFinalEquality++;
  for(const frame of trace.frames)inspect(frame,shopId,seed,scenario);
  if(seed===42&&shopId==='bar'&&scenario==='D')example=M.serialize(trace.state);
  if(scenario==='D'){
   const before=mapFor(trace.state,2),gap=M.transact(trace.state,{type:'wait',months:120}),after=mapFor(gap,2),old=before.pins.find(p=>p.id===shopId),now=after.pins.find(p=>p.id===shopId);
   assert.equal(now.sold,old.sold);assert.equal(now.remaining,0);assert.equal(now.positiveCount,old.positiveCount);assert.deepEqual(now.currentProducts,[]);checks.emptyGap++;
  }
 }
 if(seed%10===0)process.stdout.write(`seed ${seed} complete (${seeds.indexOf(seed)+1}/${seeds.length})\n`);
}
if(!example)example=M.serialize(visualTrace({seed:seeds[0],shopId:'bar',scenario:'D'}).state);
assert.equal(M.serialize(M.restore(example)),example);
durations.sort((a,b)=>a-b);
const out={version:MAP_VERSION,modelVersion:M.VERSION,sourceBase:'f8189d08691daf59af14b0c2858bec353829db0a',seeds,shops,scenarios,stages,framesPerHistory:10,histories:checks.canonicalFinalEquality,checks,totals,samples,performance:{unit:'ms; map projections, six DOM strings and assertion checks on Node host; not iPhone rendering',count:durations.length,min:durations[0],median:durations[Math.floor(durations.length*.5)],p90:q(durations),max:durations.at(-1)}};
out.verificationScope={"nativeCanvasPrefix": "seed1 × 4経過 × 3店 × 10時点 × 2段階。全seedの投影とmarkupは別途検証", "multipleStoreFixture": "各seedで甘い香り8年と深み15年を全3店へ配分。100seed時は100fixture/300店舗照合"};
if(process.argv[4])out.durationSamples=durations;
const dir=process.argv[4]?pathToFileURL(process.argv[4].replace(/\/$/,'')+'/'):new URL('./',import.meta.url);
await mkdir(dir,{recursive:true});await writeFile(new URL('./results.json',dir),JSON.stringify(out,null,2)+'\n');await writeFile(new URL('./example-log.json',dir),example+'\n');
process.stdout.write(JSON.stringify({histories:out.histories,checks,totals})+'\n');
