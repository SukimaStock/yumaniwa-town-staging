// Independent Stage5 contract; injected memory storage only, never a native save path.
// SHA integrity is accidental-corruption detection, not source authentication.
import {canonical} from '../model.mjs';
import {applyCommand} from './model.mjs';
import {digest} from '../../../ambertime/checkpoint-idb-research/store.mjs';
export const SCHEMA='ambertime-small-checkpoint/1';
export const POLICY='ambertime-small-facts/1';
const clone=x=>JSON.parse(canonical(x));
const requireThat=(ok,reason)=>{if(!ok)throw new Error(reason);};
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const hash=x=>digest(canonical(x));
export const sourceFingerprint=hash;
const isHash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
function boundary(x){requireThat(integer(x.revision)&&isHash(x.sourceFingerprint),'invalid-source-binding');}
function cursor(x){requireThat(integer(x?.seq)&&(x.seq===0?x.signature===null:typeof x.signature==='string'),'invalid-cursor');}
const record=x=>x&&typeof x==='object'&&!Array.isArray(x);
const idValid=x=>(typeof x==='string'&&x.length>0&&!['__proto__','constructor','prototype'].includes(x))||Number.isSafeInteger(x);
function counters(row,fields){requireThat(record(row)&&fields.every(k=>integer(row[k])),'invalid-counter');}
function metricValid(row,month){
 counters(row,['bottles','months','streak']);requireThat(row.months<=row.bottles&&row.streak<=row.months,'invalid-metric');
 requireThat(row.months===0?row.firstMonth===null&&row.lastMonth===null&&row.bottles===0:integer(row.firstMonth)&&integer(row.lastMonth)&&row.firstMonth<=row.lastMonth&&row.lastMonth<=month&&row.months<=row.lastMonth-row.firstMonth+1,'invalid-metric-month');
}
function modelValid(m){
 requireThat(m?.version==='ambertime-internal-comparison/1','model-version');cursor(m.cursor);
 requireThat(integer(m.month)&&integer(m.nextWineId)&&m.nextWineId>0,'invalid-model-clock');
 for(const key of ['casks','identities','wines','releases','stores','references','recalls','recallReleaseIds'])requireThat(record(m[key]),'missing-model-'+key);
 counters(m.completed,['releases','bottles','revenueCents']);metricValid(m.retail,m.month);counters(m.retail,['revenueCents']);
 requireThat(Object.keys(m.casks).length<=4,'invalid-casks');for(const [id,c] of Object.entries(m.casks))requireThat(idValid(c.id)&&String(c.id)===id,'invalid-cask-id');
 for(const [id,w] of Object.entries(m.wines))requireThat(/^wine:[1-9][0-9]*$/.test(id)&&Number(id.slice(5))<m.nextWineId&&w.id===id&&record(w.descriptor)&&Number.isFinite(w.descriptor.age)&&w.descriptor.age>=0&&Number.isFinite(w.descriptor.price)&&w.descriptor.price>0,'invalid-wine');
 const products=new Set();let disposed=0,revenue=0,completedCount=0,completedBottles=0,completedRevenue=0;
 for(const [id,r] of Object.entries(m.identities)){
  requireThat(idValid(r.releaseId)&&String(r.releaseId)===id&&idValid(r.productId)&&idValid(r.brandId)&&m.wines[r.wineId]&&!products.has(String(r.productId)),'missing-old-release-or-product');products.add(String(r.productId));
  requireThat(integer(r.bottles)&&r.bottles>0&&integer(r.bottledMonth)&&r.bottledMonth<=m.month,'invalid-release-identity');
  const live=m.releases[id];requireThat(live||r.completed===true,'missing-live-release');
  if(r.completed){requireThat(!live,'completed-live-release');counters(r,['totalDisposed','revenueCents','retailSold','retailRevenueCents','delivered','deliveryRevenueCents','consumerSold']);requireThat(r.totalDisposed===r.bottles&&r.retailSold+r.delivered===r.totalDisposed&&r.retailRevenueCents+r.deliveryRevenueCents===r.revenueCents&&r.consumerSold<=r.delivered,'invalid-completed-release');completedCount++;completedBottles+=r.totalDisposed;completedRevenue+=r.revenueCents;}
  disposed+=live?.sold??r.totalDisposed;revenue+=live?.revenueCents??r.revenueCents;
 }
 for(const [id,r] of Object.entries(m.releases)){
  counters(r,['stock','sold','bottles','revenueCents','retailSold','retailRevenueCents','delivered','deliveryRevenueCents','consumerSold']);
  requireThat(m.identities[id]&&String(r.id)===id&&r.wineId===m.identities[id].wineId&&r.productId===m.identities[id].productId&&r.brandId===m.identities[id].brandId&&r.bottles===m.identities[id].bottles&&r.stock+r.sold===r.bottles&&r.retailSold+r.delivered===r.sold&&r.retailRevenueCents+r.deliveryRevenueCents===r.revenueCents&&r.consumerSold<=r.delivered&&record(r.allocations)&&Object.values(r.allocations).every(integer)&&Object.values(r.allocations).reduce((a,b)=>a+b,0)<=r.stock,'invalid-live-release');
 }
 let storeBottles=0,storeRevenue=0;
 for(const [key,s] of Object.entries(m.stores)){
  requireThat(idValid(s.shopId)&&idValid(s.brandId)&&key===canonical([s.shopId,s.brandId])&&(s.startedMonth===null||integer(s.startedMonth))&&record(s.perRelease)&&Array.isArray(s.recent)&&s.recent.length<=8,'invalid-store');
  metricValid(s.delivery,m.month);metricValid(s.sale,m.month);counters(s,['revenueCents','unknownSaleReceipts']);requireThat(s.sale.bottles<=s.delivery.bottles&&s.sale.months<=s.delivery.months,'invalid-sale-metric');
  let supplied=0;for(const [id,r] of Object.entries(s.perRelease)){requireThat(m.identities[id]&&integer(r.bottles)&&integer(r.firstMonth)&&Array.isArray(r.lastMonths)&&r.lastMonths.length<=2&&r.lastMonths.every((x,i)=>integer(x)&&x>=r.firstMonth&&x<=m.month&&(i===0||x>r.lastMonths[i-1])),'missing-store-release');supplied+=r.bottles;}
  requireThat(supplied===s.delivery.bottles,'store-delivery-total');
  for(const r of s.recent)requireThat(m.identities[r.releaseId]&&integer(r.seq)&&r.seq>0&&r.seq<=m.cursor.seq&&integer(r.month)&&r.month<=m.month&&integer(r.count)&&r.count>0&&['paid-procurement','store-sell-through'].includes(r.kind),'invalid-recent-transaction');
  storeBottles+=s.delivery.bottles;storeRevenue+=s.revenueCents;
 }
 requireThat(disposed===m.retail.bottles+storeBottles&&revenue===m.retail.revenueCents+storeRevenue,'disposal-total');
 requireThat(m.completed.releases===completedCount&&m.completed.bottles===completedBottles&&m.completed.revenueCents===completedRevenue,'completed-total');
 for(const [key,r] of Object.entries(m.references))requireThat(m.identities[r.releaseId]&&idValid(r.id)&&['pending-rumor','pending-inquiry','recall'].includes(r.kind)&&key===canonical([r.kind,r.id]),'missing-reference-release');
 for(const id of Object.keys(m.recalls)){requireThat(Array.isArray(m.recallReleaseIds[id]),'missing-recall-bindings');for(const releaseId of m.recallReleaseIds[id])requireThat(m.identities[releaseId]&&m.references[canonical(['recall',String(id)+':'+String(releaseId)])]?.releaseId===releaseId,'missing-recall-release');}
 for(const id of Object.keys(m.recallReleaseIds))requireThat(Object.hasOwn(m.recalls,id),'missing-recall-snapshot');
}
export function emptyMetadata(){return {coverage:{facts:'complete'},unknown:[],chosenSpeech:{},frozenRecalls:{},pendingReferences:{},memoryC:null};}
function metadataValid(meta,m,previous){
 requireThat(meta&&record(meta.coverage)&&Object.keys(meta.coverage).length>0&&Object.values(meta.coverage).every(v=>['complete','partial','unknown'].includes(v))&&Array.isArray(meta.unknown),'invalid-coverage');
 // This independent contract has no evidence-bearing coverage upgrade command.
 // A future verified migration must explicitly define how unknown facts resolve.
 const rank={unknown:0,partial:1,complete:2};
 for(const [key,value] of Object.entries(previous?.coverage??{}))requireThat(Object.hasOwn(meta.coverage,key)&&rank[meta.coverage[key]]<=rank[value],'unproven-coverage-upgrade');
 for(const reason of previous?.unknown??[])requireThat(meta.unknown.some(x=>canonical(x)===canonical(reason)),'removed-unknown-fact');
 for(const kind of ['chosenSpeech','frozenRecalls','pendingReferences']){
  requireThat(meta[kind]&&typeof meta[kind]==='object'&&!Array.isArray(meta[kind]),'missing-'+kind);
  for(const row of Object.values(meta[kind])){requireThat(Array.isArray(row.releaseIds),'missing-reference-bindings');for(const id of row.releaseIds)requireThat(m.identities[id],'missing-metadata-release');}
  // Historical snapshots are immutable. Pending entries are retained as opaque
  // native facts; their resolution belongs in a new fact, never inferred here.
  for(const [id,row] of Object.entries(previous?.[kind]??{}))requireThat(canonical(meta[kind][id]??null)===canonical(row),'immutable-'+kind);
 }
 memoryValid(meta.memoryC,m);
 if(previous?.memoryC)memoryPreserved(previous.memoryC,meta.memoryC);
 canonical(meta);
}
function memoryValid(memory,m){
 if(memory===null)return;
 requireThat(memory?.version==='stage5-memory/1'&&memory.policy==='C'&&Array.isArray(memory.catalog),'invalid-memory-schema');
 for(const field of ['traits','visuals','details','reasons'])requireThat(memory[field]&&typeof memory[field]==='object'&&!Array.isArray(memory[field]),'missing-memory-'+field);
 const ids=new Set();
 for(const row of memory.catalog){
  const identity=m.identities[row.id],descriptor=identity&&m.wines[identity.wineId]?.descriptor,trait=memory.traits[row.traitId];
  requireThat(identity&&!ids.has(String(row.id)),'missing-or-duplicate-memory-release');ids.add(String(row.id));
  for(const field of ['productId','brandId','bottledMonth'])requireThat(row[field]===identity[field],'memory-identity-mismatch');
  requireThat(row.age===descriptor.age&&trait?.age===descriptor.age&&canonical(trait.profile??null)===canonical(descriptor.profile??null),'memory-trait-mismatch');
  for(const field of ['caskId','sourceGeneration'])requireThat((row[field]??null)===(descriptor[field]??null),'memory-origin-mismatch');
  requireThat(memory.visuals[row.visualKey]&&typeof memory.visuals[row.visualKey].svg==='string','missing-memory-appearance');
  if(row.detailed)requireThat(memory.details[row.id],'missing-memory-detail');
 }
 for(const [id,row] of Object.entries(memory.details))requireThat(ids.has(id)&&String(row.id)===id&&row.productId===m.identities[id].productId,'missing-memory-detail-reference');
 for(const id of Object.keys(memory.reasons))requireThat(ids.has(id),'missing-memory-reason-reference');
}

function memoryPreserved(before,after){
 requireThat(after,'missing-prior-memory');
 const transient=new Set(['summary','protected','detailed','traitId','visualKey']);
 const identity=row=>Object.fromEntries(Object.entries(row).filter(([key])=>!transient.has(key)));
 const stats=new Set(['stock','sold','revenue','status','listed','revenueCents','retailSold','retailRevenueCents','delivered','deliveryRevenue','deliveryRevenueCents','consumerSold','totalDisposed','totalRevenueCents']);
 const detail=row=>Object.fromEntries(Object.entries(row).filter(([key])=>!stats.has(key)));
 for(const old of before.catalog){
  const row=after.catalog.find(r=>r.id===old.id);requireThat(row&&canonical(identity(row))===canonical(identity(old)),'immutable-memory-identity');
  requireThat(canonical(after.traits[row.traitId])===canonical(before.traits[old.traitId])&&canonical(after.visuals[row.visualKey])===canonical(before.visuals[old.visualKey]),'immutable-memory-appearance');
  if(old.detailed)requireThat(row.detailed&&after.details[old.id]&&canonical(detail(after.details[old.id]))===canonical(detail(before.details[old.id])),'immutable-memory-detail');
 }
}
function replay(model,command){
 // A compact checkpoint cannot authenticate arbitrary payloads below its cursor.
 // Reject such input instead of silently accepting the legacy trusted-source no-op.
 const event=command?.type==='applyTransaction'?command.args?.[0]:null;
 requireThat(!event||event.status!=='completed'||event.seq>=model.cursor.seq,'unverifiable-old-transaction');
 return applyCommand(model,command);
}
async function seal(body){return {...body,hash:await hash(body)};}
async function verify(sealed){requireThat(sealed&&isHash(sealed.hash),'missing-integrity');const {hash:actual,...body}=sealed;requireThat(await hash(body)===actual,'integrity-mismatch');return body;}
function expectedValid(expected){boundary(expected);requireThat(typeof expected.policyVersion==='string'&&expected.policyVersion.length>0,'missing-policy-version');}
export async function createCheckpoint(model,{revision,sourceFingerprint,policyVersion=POLICY,metadata=emptyMetadata()}={}){
 const binding={revision,sourceFingerprint};boundary(binding);requireThat(typeof policyVersion==='string'&&policyVersion.length>0,'missing-policy-version');modelValid(model);metadataValid(metadata,model);
 const checkpoint=await seal({schema:SCHEMA,policyVersion,...binding,cursor:clone(model.cursor),model:clone(model),metadata:clone(metadata)});
 return {checkpoint,tail:[],head:{...binding,cursor:clone(model.cursor),hash:checkpoint.hash,length:0}};
}
export async function restore(bundle,expected){
 expectedValid(expected);const b=clone(bundle),cp=await verify(b.checkpoint);
 requireThat(cp.schema===SCHEMA,'schema-mismatch');requireThat(cp.policyVersion===expected.policyVersion,'policy-mismatch');boundary(cp);modelValid(cp.model);metadataValid(cp.metadata,cp.model);
 requireThat(canonical(cp.cursor)===canonical(cp.model.cursor),'checkpoint-cursor-mismatch');
 let model=cp.model,metadata=cp.metadata,prior=b.checkpoint.hash,revision=cp.revision,fingerprint=cp.sourceFingerprint;
 requireThat(Array.isArray(b.tail),'missing-tail');
 for(const sealed of b.tail){const entry=await verify(sealed);requireThat(entry.previousHash===prior&&entry.fromRevision===revision&&entry.revision===revision+1,'tail-revision-chain');boundary(entry);
  requireThat(canonical(entry.beforeCursor)===canonical(model.cursor),'tail-cursor-mismatch');requireThat(Array.isArray(entry.commands),'missing-commands');
  for(const command of entry.commands)model=replay(model,command);
  modelValid(model);requireThat(canonical(entry.cursor)===canonical(model.cursor),'tail-result-cursor-mismatch');requireThat(await hash(model)===entry.modelHash,'tail-result-mismatch');metadataValid(entry.metadata,model,metadata);
  metadata=entry.metadata;prior=sealed.hash;revision=entry.revision;fingerprint=entry.sourceFingerprint;
 }
 requireThat(b.head?.length===b.tail.length&&b.head.hash===prior&&b.head.revision===revision&&b.head.sourceFingerprint===fingerprint&&canonical(b.head.cursor)===canonical(model.cursor),'missing-tail-or-head-mismatch');
 requireThat(revision===expected.revision&&fingerprint===expected.sourceFingerprint,'native-revision-mismatch');
 return {model,metadata,revision,sourceFingerprint:fingerprint,cursor:clone(model.cursor)};
}
export async function appendTail(bundle,{revision,sourceFingerprint,commands,metadata}={}){
 const current=await restore(bundle,{...bundle.head,policyVersion:bundle.checkpoint.policyVersion});
 requireThat(revision===current.revision+1,'tail-revision-chain');boundary({revision,sourceFingerprint});requireThat(Array.isArray(commands),'missing-commands');
 let model=current.model;for(const command of commands)model=replay(model,clone(command));modelValid(model);metadata??=current.metadata;metadataValid(metadata,model,current.metadata);
 const entry=await seal({fromRevision:current.revision,revision,sourceFingerprint,previousHash:bundle.head.hash,beforeCursor:current.cursor,cursor:clone(model.cursor),commands:clone(commands),metadata:clone(metadata),modelHash:await hash(model)});
 return {checkpoint:clone(bundle.checkpoint),tail:[...clone(bundle.tail),entry],head:{revision,sourceFingerprint,cursor:clone(model.cursor),hash:entry.hash,length:bundle.tail.length+1}};
}
// Simulator of the existing research prepare -> verify -> atomic CAS boundary.
// A real storage adapter must provide equivalent atomicity; no such adoption here.
export function createMemoryStore({fault=()=>{}}={}){
 const candidates=new Map();let head=null,revision=0;
 return {
  async prepare(id,bundle){fault('write');requireThat(!candidates.has(id)||canonical(candidates.get(id))===canonical(bundle),'immutable-candidate');candidates.set(id,clone(bundle));fault('checkpoint-interruption');},
  async read(id){fault('readback');return candidates.has(id)?clone(candidates.get(id)):null;},
  async token(){return {head,revision};},
  async commit(id,expected){fault('quota');fault('conflict');requireThat(head===expected.head&&revision===expected.revision,'save-conflict');requireThat(candidates.has(id),'missing-prepared-candidate');fault('commit');head=id;revision++;return {head,revision};}
 };
}
const fallback=error=>({ok:false,readSource:'legacy',reason:error.message,errorName:error.name});
export async function save(store,bundle,{expectedHead=null,expectedRevision=0}={}){
 try{const candidate=clone(bundle);const restored=await restore(candidate,{...candidate.head,policyVersion:candidate.checkpoint.policyVersion});const id=await hash(candidate);
  if(expectedHead){
   const old=await store.read(expectedHead);requireThat(old&&await hash(old)===expectedHead,'previous-checkpoint-corrupt');
   const previous=await restore(old,{...old.head,policyVersion:candidate.checkpoint.policyVersion});
   const extension=candidate.checkpoint.hash===old.checkpoint.hash&&candidate.tail.length>=old.tail.length&&canonical(candidate.tail.slice(0,old.tail.length))===canonical(old.tail);
   const compaction=candidate.tail.length===0&&canonical(restored)===canonical(previous);
   requireThat(extension||compaction,'unproven-checkpoint-lineage');
   metadataValid(restored.metadata,restored.model,previous.metadata);
   for(const [key,value] of Object.entries(previous.model.recalls))requireThat(canonical(restored.model.recalls[key]??null)===canonical(value)&&canonical(restored.model.recallReleaseIds[key]??null)===canonical(previous.model.recallReleaseIds[key]),'immutable-recall-checkpoint');
   for(const [key,value] of Object.entries(previous.model.identities))for(const field of ['releaseId','productId','brandId','wineId','bottledMonth'])requireThat(restored.model.identities[key]?.[field]===value[field],'missing-or-changed-old-id');
  }
  await store.prepare(id,candidate);const readback=await store.read(id);requireThat(canonical(readback)===canonical(candidate),'readback-mismatch');
  const token=await store.commit(id,{head:expectedHead,revision:expectedRevision});return {ok:true,...token};
 }catch(error){return fallback(error);}
}
export async function load(store,expected){
 try{const token=await store.token();requireThat(token.head,'no-checkpoint');const bundle=await store.read(token.head);requireThat(bundle&&await hash(bundle)===token.head,'stored-integrity-mismatch');return {ok:true,...await restore(bundle,expected),...token};}
 catch(error){return fallback(error);}
}
