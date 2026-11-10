import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {regionalInquiryEvidence,refreshRegionalOffers,decideRegionalOffer} from '../regional-partners.mjs';
import {initializeRecall,advanceRecall,readCompletedRecalls} from '../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {initializeCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger} from '../recent-ledger.mjs';
import {readSession,serializeSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
// Reproducible integration career: every inquiry is emitted by unchanged native simulation.
// No injected state/events/cash. Pass the native model namespace as D.
function organicCareer(D,seed,{enable=s=>s,through=180,onMonth=()=>{},restoreAt=[120],stopAtInquiry=false}={}){
 let s=enable(D.newShopDialogueDistillery(seed));
 function resolve(){let guard=0;
  while(s.decisions.length){if(++guard>20)throw Error('decision loop');const d=s.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');if(!o)throw Error('Recovery required '+d.eventId);s=D.chooseDistillery(s,d.caskId,o.id);}
  if(s.trade.offer)s=D.declineOffer(s);
  while(s.shop.offer){const o=s.shop.offer;s=(o.shopId==='department'?D.declineShop:D.acceptShop)(s,o.shopId,o.id);}
 }
 function month(){resolve();const before=s.core.month;s=D.tickDistillery(s);if(s.core.month!==before+1)throw Error('Month stopped '+before);
  if(restoreAt.includes(s.core.month))s=D.restoreDistillery(D.serializeDistillery(s));
  onMonth(s);
 }
 function fill(){resolve();s=D.selectFlavorCards(s,{malt:'plain',ferment:'short'});s=D.startDistillation(s);while(s.still.distillation.progress<45)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<65)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'refill');}
 for(let n=0;n<4;n++){
  fill();const cid=s.core.casks.at(-1).id;for(let i=0;i<12;i++)month();s=D.bottleBranded(s,cid,{});
  const id=s.result.productId,p=s.core.products.find(p=>p.id===id);
  s=n===3?D.assignStoreProduct(s,{productId:id,shopId:'supermarket',count:p.stock}):D.setMarketRetail(s,{productId:id,count:p.stock});
  for(let i=0;i<16;i++)month();
 }
 while(s.core.month<through){month();if(stopAtInquiry&&s.labConnection.town.events.some(e=>e.type==='inquiry'&&e.to==='near-wide'))break;}
 return s;
}
const native=s=>{const {regionalPartners,...rest}=s;return {...rest,operations:s.operations.filter(o=>o.key!=='enable-regional-partners'&&!o.key.startsWith('regional-'))};};
const cached=new Map();
function career(seed=3){if(!cached.has(seed))cached.set(seed,organicCareer(D,seed,{enable:D.enableRegionalPartners}));return structuredClone(cached.get(seed));}
const offer=s=>D.regionalOffers(s)[0];
const cold=s=>{const raw=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);return D.restoreDistillery(raw);};
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
function sessionFor(game){
 let historyRecord,recallRecord;
 D.replayDistilleryOperations(game,({operation,index,before,after})=>{
  const state=(facts,count)=>({...facts,origin:game.origin,operations:game.operations.slice(0,count)}),next=state(after,index+1);
  historyRecord=operation?advanceHistoryRecord(state(before,index),next,historyRecord):initializeHistoryRecord(state(after,0));
  if(operation?.key==='enable-market-rules')recallRecord=initializeRecall(next);
  else if(recallRecord)recallRecord=advanceRecall(state(before,index),next,recallRecord);
 });
 return {game,userPaused:true,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:o=>D.replayDistilleryOperations(game,o)}),historyRecord,recallRecord};
}

test('explicit regional boundary preserves old saves, partial extraction and tasting; prior inquiries stay historical',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
 assert.equal(D.serializeDistillery(D.restoreDistillery(fixture)),fixture);
 assert.equal(D.regionalPartnerMode(D.newShopDialogueDistillery(3)),false);
 const source=()=>D.enableShopDialogue(D.enableAlleyBar(D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(fixture)))));
 for(const prepare of [s=>s,s=>D.sampleDistillery(s,s.core.casks[0].id),s=>{s=D.beginCollection(D.startRangeDistillation(s));while(s.still.distillation.progress<20)s=D.distillStep(s);return s;}]){
  const before=prepare(source()),raw=D.serializeDistillery(before),after=D.enableRegionalPartners(before);
  assert.deepEqual(native(after),before);assert.equal(D.serializeDistillery(before),raw);assert.equal(D.enableRegionalPartners(after),after);assert.equal(D.regionalOffers(after).length,0);cold(after);
 }
 const old=organicCareer(D,3),after=D.enableRegionalPartners(old);
 assert(old.labConnection.town.events.some(e=>e.type==='inquiry'&&e.to==='near-wide'));
 assert.equal(after.regionalPartners.eventStart,old.labConnection.town.events.length);
 assert.equal(D.regionalOffers(cold(after)).length,0);assert.equal(D.regionalContract(after),null);
 assert.equal(D.newRegionalPartnerDistillery(3).regionalPartners.version,1);
});

test('five 180-month native careers have byte-identical town, economy, all four shop offers/relations and old operations',()=>{
 for(const seed of [1,2,3,6,42]){
  const baseline=[],enabled=[],digest=createHash('sha256');
  // Captured from the untouched PR902 main in an independent checkout.
  const original={1:'345292be2ce8228d2d2e66b91f36cabe7c5ea4134d2e4a1847d223053f25e269',2:'011a9811638598530f8ccc7c507b4bfbadb4ab179e926a41c94eb7bce859a5e2',3:'d1ae4ef36119a1ca13d6b9494aa1fdf3e7aa29a3193af74c216b42b7175fa39d',6:'6c40df6b812a5cd0a5222478a1d0bb226626613d1977b1ffbde8f8f8803656ac',42:'9cb41dc249f504285e566b857f01984f986b9b755308e0d9b7c9376e3e76df14'};
  organicCareer(D,seed,{onMonth:s=>{const raw=JSON.stringify(s);digest.update(raw);baseline.push(createHash('sha256').update(raw).digest('hex'));}});
  assert.equal(digest.digest('hex'),original[seed],'original main seed '+seed);
  const state=organicCareer(D,seed,{enable:D.enableRegionalPartners,onMonth:s=>enabled.push(createHash('sha256').update(JSON.stringify(native(s))).digest('hex'))});
  assert.deepEqual(enabled,baseline,'seed '+seed);assert.equal(state.labConnection.town.trades.length,0);
  const inquiries=state.labConnection.town.events.filter(e=>e.type==='inquiry'&&e.to==='near-wide');
  assert.equal(D.regionalOffers(state).length,inquiries.length?1:0,'seed '+seed);assert.equal(D.regionalContract(state),null);
  if(inquiries.length){assert.equal(offer(state).eventId,inquiries[0].id);assert.equal(offer(state).releaseId,inquiries[0].mainReleaseId);}
  cached.set(seed,state);
 }
});

test('organic seed3 and6 offers trace to actual release4 and supermarket receipt; arrival/interest never qualify',()=>{
 for(const seed of [3,6]){
  const s=career(seed),o=offer(s),e=regionalInquiryEvidence(s,o.eventId);assert(e);assert.equal(e.nodeId,'near-wide');assert.equal(e.regionId,'trial-region');assert.equal(e.releaseId,4);assert.equal(e.sourceReceiptId,'shop:3');
  const receipt=s.shop.deliveries.find(d=>'shop:'+d.id===e.sourceReceiptId);assert.equal(receipt.shopId,'supermarket');assert.equal(receipt.releaseId,4);
  for(const event of s.labConnection.town.events.filter(e=>['arrival','interest','visit','trade'].includes(e.type)))assert.equal(regionalInquiryEvidence(s,event.id),null);
  const a=structuredClone(s);refreshRegionalOffers(a);refreshRegionalOffers(a);assert.deepEqual(a,s);cold(a);
 }
});

test('synthetic invalid-evidence projections fail closed (never passed off as native saved facts)',()=>{
 const source=career(),o=offer(source);
 for(const mutate of [s=>s.labConnection.town.events.find(e=>e.id===o.eventId).to='national-food',s=>s.labConnection.town.events.find(e=>e.id===o.eventId).type='interest',s=>s.labConnection.town.events.find(e=>e.id===o.eventId).mainReleaseId=999,s=>s.labConnection.town.events.find(e=>e.id===o.eventId).sourceId='missing',s=>s.labConnection.town.events.find(e=>e.id===o.eventId).sourceId=o.eventId,s=>s.shop.deliveries=[],s=>s.labConnection.town.shipments=[],s=>s.labConnection.town.external=false]){
  const projection=structuredClone(source);mutate(projection);assert.equal(regionalInquiryEvidence(projection,o.eventId),null);
 }
});

test('notice/defer preserve pending offer and accept records only a contract, with stable ID and no repeat',()=>{
 let s=career(),o=offer(s),before=structuredClone(s);
 s=D.noticeRegionalOffer(s,o.partnerId,o.id);assert(offer(s).notified);assert.equal(D.noticeRegionalOffer(s,o.partnerId,o.id),s);
 s=D.deferRegionalOffer(s,o.partnerId,o.id);assert(offer(s).deferred);assert.equal(D.deferRegionalOffer(s,o.partnerId,o.id),s);assert.deepEqual(native(s),native(before));
 cold(s);s=D.acceptRegionalOffer(s,o.partnerId,o.id);const c=D.regionalContract(s);
 assert.equal(c.id,'regional-contract:trial-region-desk');assert.equal(c.sourceOfferId,o.id);assert.equal(c.eventId,o.eventId);assert.equal(c.releaseId,o.releaseId);assert.equal(D.regionalOffers(s).length,0);
 assert.deepEqual(native(s),native(before));assert.equal(D.acceptRegionalOffer(s,o.partnerId,o.id),s);cold(s);
 for(let i=0;i<12;i++){if(s.trade.offer)s=D.declineOffer(s);s=D.tickDistillery(s);}assert.equal(s.regionalPartners.contracts.length,1);assert.equal(D.regionalOffers(cold(s)).length,0);
 assert.throws(()=>D.assignStoreProduct(s,{shopId:o.partnerId,productId:s.result.productId,count:1}));
 assert.throws(()=>D.acceptShop(s,o.partnerId,o.id));
});

test('decline uses existing twelve-month cooldown and a different real inquiry; deferred/native queue cannot be overwritten',()=>{
 let s=career(3),o=offer(s);s=D.declineRegionalOffer(s,o.partnerId,o.id);assert.equal(s.regionalPartners.declinedUntil[o.partnerId],192);assert.equal(D.regionalContract(s),null);
 for(let i=0;i<11;i++)s=D.tickDistillery(s);assert.equal(D.regionalOffers(s).length,0);s=D.tickDistillery(cold(s));
 const next=offer(s);assert(next);assert.notEqual(next.eventId,o.eventId);assert.notEqual(next.id,o.id);assert.equal(next.month,192);assert.equal(s.regionalPartners.offers.length,2);
 // Synthetic queue isolation test only: unrelated native queue data is inert
 // input to the pure regional decision, not a formal replay fixture.
 const projection=structuredClone(s),nativeQueue={offer:{id:123,shopId:'department'},pendingOffers:[{id:124,shopId:'bar'}]};
 Object.assign(projection.shop,nativeQueue);decideRegionalOffer(projection,next.partnerId,next.id,'defer');assert.deepEqual({offer:projection.shop.offer,pendingOffers:projection.shop.pendingOffers},nativeQueue);
});

test('altered source/contract/cursor/boundary/opcode or stale decisions fail exact native replay',()=>{
 const source=career(),o=offer(source);
 for(const mutate of [s=>s.regionalPartners.offers[0].eventId='e1',s=>s.regionalPartners.offers[0].releaseId=999,s=>s.regionalPartners.eventCursor=0,s=>s.regionalPartners.contracts.push({partnerId:o.partnerId}),s=>s.regionalPartners.rules='unknown',s=>s.operations.find(o=>o.key==='enable-regional-partners').value.eventStart=99,s=>s.operations.push(structuredClone(s.operations.find(o=>o.key==='enable-regional-partners')))]){
  const bad=structuredClone(source);mutate(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));
 }
 for(const id of ['unknown','retail','town-liquor'])assert.throws(()=>D.acceptRegionalOffer(source,id,o.id));
 assert.throws(()=>D.acceptRegionalOffer(source,o.partnerId,'stale'));
 const declined=D.declineRegionalOffer(source,o.partnerId,o.id);assert.throws(()=>D.acceptRegionalOffer(declined,o.partnerId,o.id));
});

test('official v8 roundtrip includes regional pending/accepted facts and recall; failed/conflicting writes cannot publish acceptance',()=>{
 const pending=career(),o=offer(pending),accepted=D.acceptRegionalOffer(pending,o.partnerId,o.id),before=sessionFor(pending),after=sessionFor(accepted);
 const oldRaw=serializeSession(before.game,before,options),raw=serializeSession(after.game,after,options);
 assert.equal(JSON.parse(raw).version,8);assert.equal(serializeSession(readSession(raw,options).game,readSession(raw,options),options),raw);
 assert.deepEqual(readCompletedRecalls(after.recallRecord),readCompletedRecalls(before.recallRecord));
 assert.deepEqual(after.historyRecord.events,before.historyRecord.events);
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};import {readSession,serializeSession} from ${JSON.stringify(new URL('../development-save.mjs',import.meta.url).href)};const o={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:${P.monthMs},stepMs:${P.distillStepMs}};const s=readSession(fs.readFileSync(0,'utf8'),o);process.stdout.write(serializeSession(s.game,s,o));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:16e6}),raw);
 for(const mode of ['quota','conflict','readback']){
  let game=pending,saved=mode==='conflict'?'another-session':oldRaw;
  const storage={getItem:()=>saved,setItem:(_k,v)=>{if(mode==='quota')throw Error('quota');if(mode!=='readback')saved=v;}};
  assert.throws(()=>{writeCandidate(storage,FORMAL_SAVE_KEY,oldRaw,raw);game=accepted;});assert.equal(game,pending);assert.equal(D.regionalContract(game),null);
 }
});

test('deferred regional offer coexists with a real department offer and survives its native acceptance',()=>{
 let s=career(3),o=offer(s);s=D.deferRegionalOffer(s,o.partnerId,o.id);
 s=D.selectFlavorCards(s,{malt:'plain',ferment:'short'});s=D.startDistillation(s);while(s.still.distillation.progress<45)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<65)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'refill');const cid=s.core.casks.at(-1).id;
 const step=()=>{if(s.trade.offer)s=D.declineOffer(s);while(s.decisions.length){const d=s.decisions[0],choice=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');s=D.chooseDistillery(s,d.caskId,choice.id);}s=D.tickDistillery(s);};
 for(let i=0;i<24;i++)step();s=D.bottleBranded(s,cid,{});step();assert.equal(s.shop.offer.shopId,'department');assert.equal(offer(s).id,o.id);
 const nativeOffer=s.shop.offer,regionalBefore=structuredClone(s.regionalPartners);s=D.acceptShop(s,nativeOffer.shopId,nativeOffer.id);
 assert.deepEqual(s.regionalPartners,regionalBefore);assert(s.department.interests.length);assert.equal(offer(cold(s)).id,o.id);
 const nativeBefore=native(s);s=D.acceptRegionalOffer(s,o.partnerId,o.id);assert.deepEqual(native(s),nativeBefore);cold(s);
});

test('active comparison reader cache closure uses the same new replay model and can read enabled saved facts',async()=>{
 const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8'),helper=readFileSync(new URL('../nearby-comparison.mjs',import.meta.url),'utf8');
 const model=app.match(/import \* as nativeModel from '([^']+)'/)[1],comparison=app.match(/from '(\.\/nearby-comparison.mjs[^']+)'/)[1],reader=helper.match(/from '(\.\/partner-orders.mjs[^']+)'/)[1];
 assert.equal(reader,model);assert.equal(new URL(comparison,'https://example.test/').searchParams.get('regional'),'regional-v01');
 const current=await import(new URL('../nearby-comparison.mjs?v=all-stores-s2-1&regional=regional-v01',import.meta.url));
 const s=career(3),details=current.sourceDetails(s,s.releases.at(-1).caskId);assert(details);assert.equal(details.productId,s.releases.at(-1).productId);
});
