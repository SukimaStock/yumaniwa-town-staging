// Public model operations only; these are short formal careers, not synthetic states.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {fill,advance,release} from '../tests/brands-helpers.mjs';
import {lateRelease,finishExtraction} from '../tests/generation-helpers.mjs';
import {loadAdapter,fullReplay,replayTail,hash,encodeContext} from '../checkpoint-research/prototype.mjs';
import {createPersistent,writeBundle} from './persistence.mjs';
import {createOnlineCollectors} from './online.mjs';
import {buildCaskLedger} from '../cask-ledger.mjs';
import {buildDistilleryHistory} from '../distillery-history.mjs';
import {buildReleaseLedger} from '../ledger-view.mjs';
import {buildShopLedger} from '../shop-ledger.mjs';

const worker=new URL('./worker.mjs',import.meta.url).pathname;
async function checkCold(prefix,target,{envelope}={}){
 const prefixRaw=D.serializeDistillery(prefix),targetRaw=D.serializeDistillery(target);
 envelope??=(await createPersistent(prefixRaw)).envelope;
 const unchanged=JSON.stringify(envelope),adapter=await loadAdapter();
 // Prefix construction receives no target: it sees the initial state and only
 // the prefix observations. Its detached Maps/Sets can then enter either future.
 const past=await createOnlineCollectors(adapter.research.initial(prefix));
 fullReplay(adapter,prefixRaw,{observer:past.observe});
 const detached=JSON.parse(JSON.stringify(past.checkpoint(prefix))),frozen=JSON.stringify(detached);
 const resumed=await createOnlineCollectors(prefix,{prefix:detached});
 const continuation=replayTail(adapter,envelope.checkpoint,targetRaw,{binding:'prefix-branch',observer:resumed.observe});
 const material=resumed.finish({state:target,context:continuation.context,sourceSha256:hash(targetRaw)});
 const complete=await createOnlineCollectors(adapter.research.initial(target));
 const oracle=fullReplay(adapter,targetRaw,{observer:complete.observe});
 const expected=complete.finish({state:target,context:oracle.context,sourceSha256:hash(targetRaw)});
 assert.deepEqual(material,expected,'Past-only collector continuation differs from full observed history');
 assert.equal(JSON.stringify(detached),frozen,'Rendering or branch continuation mutated collector prefix');
 // These independent official functions use their own full observer replay.
 const caskIds=[...new Set([...target.core.casks,...target.core.archive,...target.records,...target.releases,...D.manualRecipeSources(target),...(target.recipeBook?.entries??[]).map(r=>r.source)].map(c=>c?.caskId??c?.id).filter(Number.isFinite))];
 const productIds=[...new Set([...target.releases,...target.records].map(r=>r.productId).filter(Number.isFinite))];
 const facts=D.nearbyComparisonFacts(target,{caskIds,productIds,includeManualSources:true});
 assert.deepEqual(material.casks,buildCaskLedger(target,{facts,replay:cb=>D.replayDistilleryOperations(target,cb)}));
 assert.deepEqual(material.history,buildDistilleryHistory(target));
 assert.deepEqual(material.releases,buildReleaseLedger(target,{facts}));
 assert.deepEqual(material.shops,buildShopLedger(target));
 assert(target.operations.length>prefix.operations.length,'Exercise a nonempty operation tail');
 const directory=mkdtempSync(join(tmpdir(),'amber-h1-a3-coverage-'));
 try{
  writeBundle(directory,envelope,targetRaw);
  const source=join(directory,'authoritative-source.json');writeFileSync(source,targetRaw);
  const actual=JSON.parse(execFileSync(process.execPath,['--expose-gc',worker,'checkpoint',directory,source],{encoding:'utf8'}));
  assert.notEqual(actual.pid,process.pid);
  assert.equal(actual.mode,'checkpoint','Unexpected fallback: '+actual.reason);
  assert.equal(actual.stateHash,hash(oracle.state));
  assert.equal(actual.contextHash,hash(encodeContext(oracle.context)));
  assert.equal(actual.replayed,target.operations.length-prefix.operations.length);
  assert.equal(JSON.stringify(envelope),unchanged,'Branch mutated shared checkpoint');
  return actual;
 }finally{rmSync(directory,{recursive:true,force:true});}
}

test('cold continuations use distinct seeds and retain two independent brands',async()=>{
 const outcomes=[];
 for(const seed of [101,202]){
  let prefix=release(D.newBrandedDistillery(seed),{selection:{name:'川霧'},progress:65,tier:'low'});
  prefix=advance(prefix,6);
  const target=advance(release(prefix,{selection:{name:'山影'},progress:85,type:'bourbon',tier:'high'}),2);
  assert.equal(target.brands.length,2);
  assert.notEqual(target.releases[0].brandId,target.releases[1].brandId);
  outcomes.push((await checkCold(prefix,target)).stateHash);
 }
 assert.notEqual(outcomes[0],outcomes[1]);
});

test('one pending-offer checkpoint cold-restores accepted delivery and declined futures independently',async()=>{
 let prefix=D.newStockistsDistillery(42);
 for(let i=0;i<3;i++){
  prefix=release(prefix,{age:6,progress:65,selection:i?{brandId:1}:{name:'川霧'},tier:'low'});
  prefix=advance(prefix,6);
 }
 prefix=advance(release(prefix,{age:24,progress:65,selection:{brandId:1},tier:'high'}),1);
 assert.equal(prefix.shop.offer.shopId,'town-liquor');assert.equal(prefix.shop.pendingOffers.length,2);
 const {envelope}=await createPersistent(D.serializeDistillery(prefix)),offer=prefix.shop.offer;
 let accepted=D.acceptShop(prefix,offer.shopId,offer.id);
 accepted=D.deliverShop(accepted,accepted.releases.at(-1).productId,1,offer.shopId);
 accepted=D.tickDistillery(accepted);
 const declined=D.tickDistillery(D.declineShop(prefix,offer.shopId,offer.id));
 const a=await checkCold(prefix,accepted,{envelope}),b=await checkCold(prefix,declined,{envelope});
 assert.equal(a.replayed,3);assert.equal(b.replayed,2);assert.notEqual(a.stateHash,b.stateHash);
 // Re-open the first branch after the second to detect shared context mutation.
 assert.equal((await checkCold(prefix,accepted,{envelope})).contextHash,a.contextHash);
});

test('staff source context survives cold active delegation and automatic completion',async()=>{
 let prefix=fill(D.newStaffDistillery(303),{progress:65});
 const id=prefix.core.casks[0].id;prefix=D.hireStaff(prefix);prefix=advance(prefix,1);
 let partial=D.beginUsual(D.reserveStaff(prefix,id));
 for(let i=0;i<17;i++)partial=D.distillStep(partial);
 assert.equal(partial.usual.reservation.status,'active');
 assert.equal(partial.usual.reservation.source.caskId,id);
 await checkCold(prefix,partial);
 let completed=partial;
 for(let i=0;i<100&&completed.usual.reservation;i++)completed=D.distillStep(completed);
 assert.equal(completed.usual.reservation,null);
 await checkCold(prefix,completed);
});

test('checkpoint before overlays cold-restores unlogged distillation and active tasting',async()=>{
 const prefix=D.newRecipeDistillery(404);let distilling=D.startDistillation(prefix);
 for(let i=0;i<37;i++)distilling=D.distillStep(distilling);
 assert.equal(distilling.still.distillation.progress,37);
 await checkCold(prefix,distilling);
 const tastingPrefix=fill(D.newRecipeDistillery(405),{progress:65});
 const ready=advance(tastingPrefix,1),tasting=D.sampleDistillery(ready,ready.core.casks[0].id);
 assert.equal(tasting.tastingId,ready.core.casks[0].id);
 await checkCold(tastingPrefix,tasting);
});

test('legacy origin is retained across cold checkpoint and recipe-book continuation',async()=>{
 const legacy=readFileSync(new URL('../tests/fixtures/v08-legal-funds.json',import.meta.url),'utf8');
 const prefix=D.restoreDistillery(legacy);assert.notEqual(prefix.origin,null);
 const target=D.enableRecipeBook(prefix);assert.deepEqual(target.origin,prefix.origin);
 await checkCold(prefix,target);
});

test('checkpoints immediately before and after handover preserve generation and replay context',async()=>{
 let before=lateRelease();before=D.startDistillation(before);before=finishExtraction(before);
 assert.equal(before.generations.active.phase,'review');
 const after=D.handoverGeneration(before,before.generations.active.id),target=advance(after,2);
 assert.equal(after.generations.active.id,2);assert.equal(target.generations.active.id,2);
 const a=await checkCold(before,target),b=await checkCold(after,target);
 assert.equal(a.stateHash,b.stateHash);assert.equal(a.contextHash,b.contextHash);
 assert.equal(a.replayed,b.replayed+1);
});
