import test from 'node:test';
import assert from 'node:assert/strict';
import {createModel,registerRelease,applyTransaction,freezeRecall,setReference} from './model.mjs';
import {createCheckpoint,appendTail,restore,save,load,createMemoryStore,sourceFingerprint,emptyMetadata,POLICY} from './persistence.mjs';
import {digest} from '../../../ambertime/checkpoint-idb-research/store.mjs';
import {canonical} from '../model.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
const release={id:'old:1',productId:'product:1',brandId:'brand',bottles:54,bottledMonth:0,age:12,price:100,color:'#abc',caskId:'cask:1',generation:1};
const sale={seq:1,month:1,kind:'paid-procurement',status:'completed',releaseId:'old:1',shopId:'department',count:4,revenueCents:40000};
const command={type:'applyTransaction',args:[sale]};
async function fixture(){let model=registerRelease(createModel(),release);model=setReference(model,'old:1','pending-inquiry','inquiry:1');model=freezeRecall(model,'recall:1',{text:'確定した回想'},['old:1']);const metadata=emptyMetadata();metadata.coverage={sales:'partial',origin:'unknown'};metadata.unknown=['unobserved customer sales'];metadata.chosenSpeech.first={releaseIds:['old:1'],text:'選出済み',month:0,cooldown:3};metadata.frozenRecalls.first={releaseIds:['old:1'],snapshot:{text:'確定した回想'}};metadata.pendingReferences.first={releaseIds:['old:1'],receiptId:'r1',packet:{cursor:2},inquiryId:'inquiry:1'};const fingerprint=await sourceFingerprint({revision:1,native:'fixture'});const bundle=await createCheckpoint(model,{revision:1,sourceFingerprint:fingerprint,metadata});return {model,bundle,metadata,fingerprint};}
const expected=b=>({...b.head,policyVersion:POLICY});
async function reseal(obj){const {hash,...body}=obj;return {...body,hash:await digest(canonical(body))};}
test('checkpoint/tail JSON restart preserves IDs, unknowns, selected speech, pending causality and recall; continuation equals model',async()=>{const f=await fixture();const fp=await sourceFingerprint({revision:2});const bundle=await appendTail(f.bundle,{revision:2,sourceFingerprint:fp,commands:[command]});const restored=await restore(copy(bundle),expected(bundle));assert.deepEqual(restored.model,applyTransaction(f.model,sale));assert.deepEqual(restored.metadata,f.metadata);assert.equal(restored.model.stores['["department","brand"]'].unknownSaleReceipts,1);const retry=await appendTail(bundle,{revision:3,sourceFingerprint:await sourceFingerprint({revision:3}),commands:[command]});assert.deepEqual((await restore(copy(retry),expected(retry))).model,restored.model);});
test('strict fingerprint/revision/schema/policy/cursor/head and missing tail reject',async()=>{const {bundle}=await fixture();for(const override of [{revision:2},{sourceFingerprint:'a'.repeat(64)},{policyVersion:'future'}])await assert.rejects(restore(bundle,{...expected(bundle),...override}));await assert.rejects(restore(bundle,{}));for(const [field,value] of [['schema','future'],['cursor',{seq:2,signature:'bad'}]]){const bad=copy(bundle);bad.checkpoint[field]=value;bad.checkpoint=await reseal(bad.checkpoint);bad.head.hash=bad.checkpoint.hash;await assert.rejects(restore(bad,expected(bad)));}const tail=await appendTail(bundle,{revision:2,sourceFingerprint:'b'.repeat(64),commands:[command]});const bad=copy(tail);bad.tail=[];await assert.rejects(restore(bad,expected(tail)),/missing-tail/);const gap=copy(tail);gap.tail[0].fromRevision=0;gap.tail[0]=await reseal(gap.tail[0]);gap.head.hash=gap.tail[0].hash;await assert.rejects(restore(gap,expected(gap)),/chain/);});
test('missing legacy release references rejected even with recomputed integrity receipt',async()=>{for(const key of ['identities','wines']){const {bundle}=await fixture();bundle.checkpoint.model[key]={};bundle.checkpoint=await reseal(bundle.checkpoint);bundle.head.hash=bundle.checkpoint.hash;await assert.rejects(restore(bundle,expected(bundle)));}});
test('frozen metadata cannot be rewritten or dropped and nonexistent events are not fabricated',async()=>{const f=await fixture();for(const kind of ['chosenSpeech','frozenRecalls','pendingReferences']){const metadata=copy(f.metadata);metadata[kind]={};await assert.rejects(appendTail(f.bundle,{revision:2,sourceFingerprint:'b'.repeat(64),commands:[],metadata}),/immutable/);}await assert.rejects(appendTail(f.bundle,{revision:2,sourceFingerprint:'b'.repeat(64),commands:[{type:'applyTransaction',args:[{...sale,releaseId:'absent'}]}]}));await assert.rejects(appendTail(f.bundle,{revision:2,sourceFingerprint:'b'.repeat(64),commands:[{type:'not-a-command',args:[]}]}));});
test('prepared candidate failures leave previous committed state usable and diagnostics request legacy reads',async()=>{for(const phase of ['write','readback','quota','conflict','checkpoint-interruption','commit']){let fail=null;const store=createMemoryStore({fault:point=>{if(point===fail){const e=new Error('injected '+point);e.name=point==='quota'?'QuotaExceededError':'Error';throw e;}}});const f=await fixture();const committed=await save(store,f.bundle);assert.equal(committed.ok,true);const next=await appendTail(f.bundle,{revision:2,sourceFingerprint:'b'.repeat(64),commands:[command]});fail=phase;const result=await save(store,next,{expectedHead:committed.head,expectedRevision:committed.revision});assert.equal(result.ok,false);assert.equal(result.readSource,'legacy');assert.match(result.reason,/injected/);fail=null;assert.equal((await load(store,expected(f.bundle))).ok,true);assert.deepEqual(await store.token(),{head:committed.head,revision:1});}});
test('CAS rejects stale writer; independent storage cannot be restored against newer formal revision',async()=>{const f=await fixture(),store=createMemoryStore();const initial=await save(store,f.bundle);assert.equal(initial.ok,true);assert.equal((await save(store,f.bundle)).ok,false);const next=await appendTail(f.bundle,{revision:2,sourceFingerprint:'b'.repeat(64),commands:[command]});const result=await save(store,next,{expectedHead:initial.head,expectedRevision:initial.revision});assert.equal(result.ok,true);assert.equal((await load(store,expected(next))).ok,true);assert.equal((await load(store,expected(f.bundle))).ok,false);});
test('readback corruption and calculation errors cannot publish',async()=>{const f=await fixture(),base=createMemoryStore();const store={...base,read:async()=>({corrupt:true})};const result=await save(store,f.bundle);assert.equal(result.ok,false);assert.match(result.reason,/readback-mismatch/);assert.deepEqual(await base.token(),{head:null,revision:0});const bad=copy(f.bundle);bad.checkpoint.model.releases['old:1'].stock=-1;assert.equal((await save(base,bad)).ok,false);});
test('replacement checkpoint cannot rewrite fixed memories, IDs or formal revision',async()=>{const f=await fixture(),store=createMemoryStore();const saved=await save(store,f.bundle);const token={expectedHead:saved.head,expectedRevision:saved.revision};for(const mutate of [m=>{m.recalls['recall:1'].text='rewritten';},m=>{m.identities['old:1'].productId='changed';m.releases['old:1'].productId='changed';}]){const model=copy(f.model);mutate(model);const next=await createCheckpoint(model,{revision:2,sourceFingerprint:'b'.repeat(64),metadata:f.metadata});assert.equal((await save(store,next,token)).ok,false);}const sameRevision=await createCheckpoint(f.model,{revision:1,sourceFingerprint:'b'.repeat(64),metadata:f.metadata});assert.equal((await save(store,sameRevision,token)).ok,false);const checkpoint=await createCheckpoint(applyTransaction(f.model,sale),{revision:2,sourceFingerprint:'b'.repeat(64),metadata:f.metadata});assert.equal((await save(store,checkpoint,token)).ok,false);});
test('older than checkpoint cursor is explicitly unverifiable, current retry payload must match',async()=>{const f=await fixture();let model=applyTransaction(f.model,sale);model=applyTransaction(model,{...sale,seq:2,month:2});const bundle=await createCheckpoint(model,{revision:3,sourceFingerprint:'c'.repeat(64),metadata:f.metadata});await assert.rejects(appendTail(bundle,{revision:4,sourceFingerprint:'d'.repeat(64),commands:[command]}),/unverifiable-old-transaction/);await assert.rejects(appendTail(bundle,{revision:4,sourceFingerprint:'d'.repeat(64),commands:[{type:'applyTransaction',args:[{...sale,seq:2,month:2,count:5}]}]}),/Changed transaction retry/);});

test('checkpoint replacement requires verified lineage; exact state compaction can continue',async()=>{
 const f=await fixture(),store=createMemoryStore();let saved=await save(store,f.bundle);
 const advanced=await appendTail(f.bundle,{revision:2,sourceFingerprint:'b'.repeat(64),commands:[command]});
 saved=await save(store,advanced,{expectedHead:saved.head,expectedRevision:saved.revision});assert.equal(saved.ok,true);
 const token={expectedHead:saved.head,expectedRevision:saved.revision};
 const rollback=copy(f.model);rollback.wines[rollback.identities['old:1'].wineId].descriptor.profile={smoke:999};
 const invalid=await createCheckpoint(rollback,{revision:3,sourceFingerprint:'c'.repeat(64),metadata:f.metadata});
 assert.match((await save(store,invalid,token)).reason,/lineage/);
 const state=await restore(advanced,expected(advanced));
 const compact=await createCheckpoint(state.model,{revision:state.revision,sourceFingerprint:state.sourceFingerprint,metadata:state.metadata});
 saved=await save(store,compact,token);assert.equal(saved.ok,true);
 const continued=await appendTail(compact,{revision:3,sourceFingerprint:'c'.repeat(64),commands:[{type:'applyTransaction',args:[{...sale,seq:2,month:2}]}]});
 assert.equal((await save(store,continued,{expectedHead:saved.head,expectedRevision:saved.revision})).ok,true);
});
test('memory C JSON retention binds appearance, trait and legacy identities',async()=>{
 const {buildMemory}=await import('./memory.mjs');const f=await fixture();const memory=buildMemory({releases:[release],brands:[],core:{products:[]}});
 const meta={...f.metadata,memoryC:memory};const cp=await createCheckpoint(f.model,{revision:1,sourceFingerprint:f.fingerprint,metadata:meta});
 assert.deepEqual((await restore(copy(cp),expected(cp))).metadata.memoryC,memory);
 for(const mutate of [x=>{x.catalog[0].id='absent';},x=>{x.catalog[0].traitId='absent';},x=>{x.traits[x.catalog[0].traitId].age=999;},x=>{x.visuals={};},x=>{x.details.absent=release;},x=>{x.catalog[0].productId='wrong';}]){
  const bad=copy(meta);mutate(bad.memoryC);await assert.rejects(createCheckpoint(f.model,{revision:1,sourceFingerprint:f.fingerprint,metadata:bad}));
 }
});
test('semantic checkpoint validation rejects incomplete core, negative clocks and inconsistent totals',async()=>{
 const f=await fixture();for(const mutate of [m=>{delete m.retail;},m=>{delete m.casks;},m=>{delete m.completed;},m=>{m.month=-1;},m=>{m.nextWineId=0;},m=>{m.retail.bottles=7;},m=>{m.releases['old:1'].revenueCents=-1;},m=>{m.identities['old:1'].bottles=0;},m=>{m.identities['old:1'].productId=null;}]){
  const model=copy(f.model);mutate(model);await assert.rejects(createCheckpoint(model,{revision:1,sourceFingerprint:f.fingerprint,metadata:f.metadata}));
 }
});
test('existing memory C identities and appearance cannot disappear or change on tail update',async()=>{
 const {buildMemory}=await import('./memory.mjs');const f=await fixture();const memory=buildMemory({releases:[release],brands:[],core:{products:[]}});const metadata={...f.metadata,memoryC:memory};const bundle=await createCheckpoint(f.model,{revision:1,sourceFingerprint:f.fingerprint,metadata});
 for(const mutate of [x=>{x.memoryC=null;},x=>{x.memoryC.visuals[x.memoryC.catalog[0].visualKey].svg='changed';},x=>{x.memoryC.catalog=[];x.memoryC.details={};x.memoryC.reasons={};},x=>{x.memoryC.catalog[0].detailed=false;}]){
  const next=copy(metadata);mutate(next);await assert.rejects(appendTail(bundle,{revision:2,sourceFingerprint:'b'.repeat(64),commands:[],metadata:next}),/memory/);
 }
});
test('restored wine allocator and recall compaction guards remain valid for continuation',async()=>{
 const f=await fixture();for(const mutate of [m=>{m.nextWineId=1;},m=>{delete m.references[canonical(['recall','recall:1:old:1'])];}]){
  const model=copy(f.model);mutate(model);await assert.rejects(createCheckpoint(model,{revision:1,sourceFingerprint:f.fingerprint,metadata:f.metadata}));
 }
});
test('partial coverage and unknown facts cannot silently become complete or disappear',async()=>{
 const f=await fixture();for(const coverage of [true,[],{}])await assert.rejects(createCheckpoint(f.model,{revision:1,sourceFingerprint:f.fingerprint,metadata:{...f.metadata,coverage}}),/coverage/);for(const mutate of [m=>{m.coverage.sales='complete';},m=>{m.coverage.origin='partial';},m=>{delete m.coverage.origin;},m=>{m.unknown=[];}]){
  const metadata=copy(f.metadata);mutate(metadata);await assert.rejects(appendTail(f.bundle,{revision:2,sourceFingerprint:'b'.repeat(64),commands:[],metadata}),/coverage|unknown/);
 }
 const metadata=copy(f.metadata);metadata.coverage.sales='unknown';metadata.unknown.push('additional unobserved fact');const bundle=await appendTail(f.bundle,{revision:2,sourceFingerprint:'b'.repeat(64),commands:[],metadata});assert.deepEqual((await restore(bundle,expected(bundle))).metadata,metadata);
});
