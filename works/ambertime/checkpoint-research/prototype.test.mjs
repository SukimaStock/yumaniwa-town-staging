import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../partner-orders.mjs';
import {fill,advance} from '../tests/recipe-helpers.mjs';
import {lateRelease,finishExtraction} from '../tests/generation-helpers.mjs';
import {loadAdapter,fullReplay,createCheckpoint,verifyCheckpoint,replayTail,hash,encodeContext} from './prototype.mjs';
const raw=state=>D.serializeDistillery(state);
function capture(adapter,sourceRaw,index){let checkpoint;const full=fullReplay(adapter,sourceRaw,{onStep:event=>{if(event.nextIndex===index)checkpoint=createCheckpoint(adapter,{...event,sourceRaw});}});assert(checkpoint);return {checkpoint,full};}
const seal=value=>{const {integrity,...payload}=value;return {...payload,integrity:hash(payload)};};

test('detached JSON checkpoint replays a nonempty tail with exact state, source indices, context and official observer events',async()=>{
 const adapter=await loadAdapter();let s=fill(D.newRecipeDistillery(42),{progress:65});const boundary=s.operations.length,id=s.core.casks[0].id;
 s=D.saveRecipe(s,id,'最初');s=advance(s,2);const sourceRaw=raw(s),{checkpoint,full}=capture(adapter,sourceRaw,boundary);
 const detached=JSON.parse(JSON.stringify(checkpoint)),events=[],resumed=replayTail(await loadAdapter(),detached,sourceRaw,{observer:e=>events.push(e)});
 assert.equal(JSON.stringify(resumed.state),sourceRaw);assert.equal(resumed.replayed,s.operations.length-boundary);assert(resumed.replayed>0);
 assert.deepEqual(encodeContext(resumed.context),encodeContext(full.context));assert.equal(events[0].index,boundary);assert(!('operations' in events[0].after));assert(!('origin' in events[0].after));
 assert.equal([...resumed.context.manualSources.values()][0].operationIndex,s.operations.findIndex(o=>o.key==='fill'));
 assert.equal(JSON.stringify(checkpoint),JSON.stringify(detached),'tail replay must not mutate checkpoint');
});

test('missing manual source can leave current state equal but breaks future recipe operation; checksum is not correctness proof',async()=>{
 const adapter=await loadAdapter();let prefix=fill(D.newRecipeDistillery(42),{progress:65});const id=prefix.core.casks[0].id,boundary=prefix.operations.length;
 const target=D.saveRecipe(prefix,id,'recipe'),sourceRaw=raw(target),{checkpoint}=capture(adapter,sourceRaw,boundary);
 const bad=structuredClone(checkpoint);bad.context.manualSources=[];const resealed=seal(bad);
 assert.equal(JSON.stringify(resealed.state),JSON.stringify(checkpoint.state));assert.doesNotThrow(()=>verifyCheckpoint(adapter,resealed,sourceRaw));
 assert.throws(()=>replayTail(adapter,resealed,sourceRaw),'valid integrity hash cannot replace source context');
});

test('integrity, prefix branch, model expiry and exact tail/source binding reject corruption',async()=>{
 const adapter=await loadAdapter();let s=fill(D.newRecipeDistillery(42),{progress:65});const boundary=s.operations.length;s=advance(s,2);const sourceRaw=raw(s),{checkpoint}=capture(adapter,sourceRaw,boundary);
 for(const edit of [c=>c.state.core.cash++,c=>c.context.manualFills++,c=>c.nextIndex++,c=>c.sourceHash='changed']){const bad=structuredClone(checkpoint);edit(bad);assert.throws(()=>verifyCheckpoint(adapter,bad,sourceRaw),/integrity/);}
 const expired=structuredClone(checkpoint);expired.modelFingerprint='obsolete';assert.throws(()=>verifyCheckpoint(adapter,seal(expired),sourceRaw),/expired/);
 const missing=JSON.parse(sourceRaw);missing.operations.pop();assert.throws(()=>replayTail(adapter,checkpoint,JSON.stringify(missing)),/binding/);
 const changed=JSON.parse(sourceRaw);changed.operations[0].key='other';assert.throws(()=>verifyCheckpoint(adapter,checkpoint,JSON.stringify(changed),{binding:'prefix-branch'}),/branch/);
 const wrongIndex=structuredClone(checkpoint);wrongIndex.nextIndex--;assert.throws(()=>verifyCheckpoint(adapter,seal(wrongIndex),sourceRaw),/index/);
});

test('explicit fork binding permits independent valid suffixes without cross-branch reuse',async()=>{
 const adapter=await loadAdapter();const prefix=fill(D.newRecipeDistillery(42),{progress:65}),boundary=prefix.operations.length,id=prefix.core.casks[0].id;
 const left=D.saveRecipe(prefix,id,'left'),right=D.saveRecipe(prefix,id,'right');
 const leftRaw=raw(left),rightRaw=raw(right),{checkpoint}=capture(adapter,leftRaw,boundary);
 assert.throws(()=>replayTail(adapter,checkpoint,rightRaw),/binding/);
 const a=replayTail(adapter,checkpoint,leftRaw),b=replayTail(adapter,checkpoint,rightRaw,{binding:'prefix-branch'});
 assert.notEqual(JSON.stringify(a.state),JSON.stringify(b.state));assert.equal(JSON.stringify(b.state),rightRaw);
 assert.equal(replayTail(adapter,checkpoint,leftRaw).state.recipeBook.entries[0].name,'left');
});

test('unlogged distillation progress and tasting overlays remain separate from operation boundary',async()=>{
 const adapter=await loadAdapter();let s=D.newRecipeDistillery(42),boundary=s.operations.length;s=D.startDistillation(s);for(let i=0;i<37;i++)s=D.distillStep(s);
 let sourceRaw=raw(s),{checkpoint}=capture(adapter,sourceRaw,boundary);assert.equal(replayTail(adapter,checkpoint,sourceRaw).state.still.distillation.progress,37);
 s=fill(D.newRecipeDistillery(43),{progress:65});s=advance(s,1);boundary=s.operations.length;s=D.sampleDistillery(s,s.core.casks[0].id);
 sourceRaw=raw(s);({checkpoint}=capture(adapter,sourceRaw,boundary));assert.equal(replayTail(adapter,checkpoint,sourceRaw).state.tastingId,s.tastingId);
});

test('legacy-origin coverage is preserved and cannot be rebound to another origin',async()=>{
 const adapter=await loadAdapter(),legacy=readFileSync(new URL('../tests/fixtures/v08-legal-funds.json',import.meta.url),'utf8');
 let s=D.restoreDistillery(legacy);assert.notEqual(s.origin,null);s=D.enableRecipeBook(s);const sourceRaw=raw(s),{checkpoint}=capture(adapter,sourceRaw,0);
 const out=replayTail(adapter,JSON.parse(JSON.stringify(checkpoint)),sourceRaw);assert.equal(JSON.stringify(out.state),sourceRaw);assert.equal(out.context.manualSources.size,0);
 const changed=JSON.parse(sourceRaw);changed.origin.seed++;assert.throws(()=>verifyCheckpoint(adapter,checkpoint,JSON.stringify(changed),{binding:'prefix-branch'}),/origin/);
});

test('staff reservation uses a prefix manual source and future automatic completion matches full replay',async()=>{
 const adapter=await loadAdapter();let s=fill(D.newStaffDistillery(42),{progress:65});s=D.hireStaff(s);const boundary=s.operations.length,id=s.core.casks[0].id;
 s=advance(s,1);s=D.reserveStaff(s,id);s=D.beginUsual(s);for(let i=0;i<100&&s.usual.reservation;i++)s=D.distillStep(s);
 const sourceRaw=raw(s),{checkpoint,full}=capture(adapter,sourceRaw,boundary),out=replayTail(adapter,checkpoint,sourceRaw);
 assert.equal(JSON.stringify(out.state),sourceRaw);assert.deepEqual(encodeContext(out.context),encodeContext(full.context));assert(out.state.staff.hired);
});


test('generation boundary before and after handover preserves IDs, future operation states and context',async()=>{
 const adapter=await loadAdapter();let s=lateRelease();s=D.startDistillation(s);s=finishExtraction(s);assert.equal(s.generations.active.phase,'review');
 const before=s.operations.length;s=D.handoverGeneration(s,s.generations.active.id);const after=s.operations.length;s=advance(s,2);const sourceRaw=raw(s),expected=new Map(),checkpoints=new Map();
 fullReplay(adapter,sourceRaw,{onStep:event=>{expected.set(event.nextIndex,{state:hash(event.state),context:hash(encodeContext(event.context))});if([before,after].includes(event.nextIndex))checkpoints.set(event.nextIndex,createCheckpoint(adapter,{...event,sourceRaw}));}});
 for(const index of [before,after]){let compared=0;const out=replayTail(adapter,checkpoints.get(index),sourceRaw,{onStep:event=>{const e=expected.get(event.nextIndex);assert.equal(hash(event.state),e.state);assert.equal(hash(encodeContext(event.context)),e.context);compared++;}});assert(compared>1);assert.equal(out.state.generations.active.id,2);}
});

test('active delegated extraction retains partial progress and reservation source at checkpoint tail',async()=>{
 const adapter=await loadAdapter();let s=fill(D.newStaffDistillery(44),{progress:65});const id=s.core.casks[0].id;s=D.hireStaff(s);s=advance(s,1);const boundary=s.operations.length;
 s=D.reserveStaff(s,id);s=D.beginUsual(s);for(let i=0;i<17;i++)s=D.distillStep(s);assert.equal(s.usual.reservation.status,'active');
 const sourceRaw=raw(s),{checkpoint}=capture(adapter,sourceRaw,boundary),out=replayTail(adapter,checkpoint,sourceRaw);
 assert.equal(JSON.stringify(out.state),sourceRaw);assert.equal(out.state.still.distillation.progress,s.still.distillation.progress);assert.equal(out.state.usual.reservation.source.caskId,id);
});


test('public production, tasting, bottling and sales actions match tail state after every logged operation',async()=>{
 const adapter=await loadAdapter();let s=D.newRecipeDistillery(45),boundary=s.operations.length;const states=new Map([[boundary,JSON.stringify(s)]]);
 const record=next=>{s=next;states.set(s.operations.length,JSON.stringify(s));};
 record(D.startDistillation(s));for(let i=0;i<65;i++)s=D.distillStep(s);record(D.stopDistillation(s));record(D.fillBarrel(s,'refill'));const cask=s.core.casks[0].id;
 record(D.tickDistillery(s));record(D.sampleDistillery(s,cask));s=D.endTasting(s); // finalization normalizes sample when the next formal action starts
 record(D.bottleBranded(s,cask,{name:'試験'}));const product=s.result.productId;record(D.setSalePrice(s,'low',product));record(D.listBottles(s,product));record(D.tickDistillery(s));
 const sourceRaw=raw(s),{checkpoint}=capture(adapter,sourceRaw,boundary);let checked=0;
 replayTail(adapter,checkpoint,sourceRaw,{onStep:event=>{if(event.nextIndex<=boundary)return;assert.equal(JSON.stringify(event.state),states.get(event.nextIndex),'first differing public operation at '+event.index+' '+event.operation.key);checked++;}});
 assert.equal(checked,s.operations.length-boundary);assert(checked>=8);
});
