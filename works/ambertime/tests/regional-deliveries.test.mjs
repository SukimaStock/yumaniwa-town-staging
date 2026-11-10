import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
import {regionalDeliveryMode,reserveRegionalInto,deliverRegionalInto} from '../regional-deliveries.mjs';
import {naturalDeliveryFixture,sessionFor,organicCareer,bottleRegionalBatch,fillRegionalBatch,months} from './regional-delivery-helpers.mjs';
import {readSession,serializeSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {buildReleaseLedger} from '../ledger-view.mjs';
import {sourceDetails} from '../nearby-comparison.mjs';
import {brandReputation,brandStats} from '../brand-reputation.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const pid=s=>s.result.productId,partner='trial-region-desk';
const quote=s=>D.regionalDeliveryQuote(s,pid(s),partner);
function assign(s,count){const q=quote(s);return D.assignRegionalProduct(s,{partnerId:partner,productId:pid(s),contractId:q.contractId,allocationId:q.nextAllocationId,count});}
function actionValue(s){const q=quote(s);return {partnerId:partner,productId:pid(s),contractId:q.contractId,allocationIds:q.allocationIds,deliveryId:q.nextDeliveryId};}
const deliver=s=>D.deliverRegionalProduct(s,actionValue(s));
const cold=s=>{const text=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(text)),text);return D.restoreDistillery(text);};
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
function conserved(s){for(const p of s.core.products){const inv=D.storeMarketInventory(s,p.id);assert.equal(inv.hand+inv.retail+inv.assigned+inv.held,p.stock);assert.equal(p.stock+p.sold,p.originalStock);}assert.equal(s.core.cash,Math.round((1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep)*100)/100);}

test('real seed3/6 inquiry, unchanged contract, new6month release and1/5/all procurement complete without customer sales',()=>{
 for(const seed of [3,6])for(const choice of ['1','5','all']){
  let s=naturalDeliveryFixture(seed),id=pid(s),q=quote(s),before=structuredClone(s),contract=D.regionalContract(s),count=choice==='all'?q.available:Number(choice);
  assert(s.labConnection.town.events.some(e=>e.id===contract.eventId&&e.type==='inquiry'&&e.to==='near-wide'));
  assert.equal(s.core.products.find(p=>p.id===id).age,6);assert.equal(q.maxCount,q.available);assert(q.maxCount>3);
  s=assign(s,count);assert.deepEqual(s.core,before.core);assert.deepEqual(s.releases,before.releases);assert.deepEqual(s.labConnection,before.labConnection);assert.deepEqual(D.regionalContract(s),contract);conserved(s);cold(s);
  const reserved=structuredClone(s),rep=brandReputation(s,1);s=deliver(s);const receipt=D.regionalDeliveryHistory(s).at(-1);
  assert.equal(receipt.count,count);assert.equal(receipt.contractId,contract.id);assert.equal(receipt.inquiryEventId,contract.eventId);assert.equal(receipt.releaseId,s.releases.at(-1).id);assert.equal(receipt.customerSales,null);assert.equal(receipt.customerRevenue,null);
  assert.equal(receipt.operationKey,'regional-deliver');assert.equal(s.operations[receipt.operationIndex].value.receipt.id,receipt.id);
  assert.equal(s.core.cash,Math.round((before.core.cash+receipt.revenue)*100)/100);assert.equal(s.core.products.find(p=>p.id===id).stock,before.core.products.find(p=>p.id===id).stock-count);
  assert.deepEqual(s.core.lastMonth,before.core.lastMonth);assert.deepEqual(s.shop,before.shop);assert.deepEqual(s.labConnection,before.labConnection);assert.deepEqual(brandReputation(s,1),rep);
  const r=s.releases.find(r=>r.productId===id);assert.equal(r.sold,0);assert.equal(r.revenue,0);assert.equal(r.delivered,count);assert.equal(r.deliveryRevenue,receipt.revenue);
  assert.equal(s.regionalDeliveries.allocations.length,0);assert.equal(quote(s).assigned,0);conserved(s);cold(s);assert.deepEqual(reserved.core,before.core);
 }
});

test('allocation and cancellation IDs make retries harmless and protect new reservations from stale cancellation',()=>{
 let s=naturalDeliveryFixture(),q=quote(s),value={partnerId:partner,productId:pid(s),contractId:q.contractId,allocationId:q.nextAllocationId,count:5};
 s=D.assignRegionalProduct(s,value);assert.equal(D.assignRegionalProduct(s,value),s);assert.throws(()=>D.assignRegionalProduct(s,{...value,count:1}));
 const cancel=actionValue(s),initial=s.core.products.find(p=>p.id===pid(s)).stock;s=D.returnRegionalProduct(s,cancel);assert.equal(quote(s).available,initial);assert.equal(D.returnRegionalProduct(s,cancel),s);cold(s);
 s=assign(s,1);const newer=s;assert.equal(D.returnRegionalProduct(s,cancel),newer);assert.equal(quote(s).assigned,1);
 const request=actionValue(s);s=D.deliverRegionalProduct(s,request);assert.equal(D.deliverRegionalProduct(s,request),s);assert.throws(()=>D.deliverRegionalProduct(s,{...request,productId:999}));assert.equal(D.assignRegionalProduct(s,value),s);assert.throws(()=>D.returnRegionalProduct(s,request));conserved(s);cold(s);
});

test('wrong/unaccepted partner, wrong contract/oldofferID, age and counts fail closed without changing stock',()=>{
 const s=naturalDeliveryFixture(),q=quote(s),base={partnerId:partner,productId:pid(s),contractId:q.contractId,allocationId:q.nextAllocationId,count:1},raw=D.serializeDistillery(s);
 for(const change of [{partnerId:'retail'},{partnerId:'missing'},{contractId:D.regionalContract(s).sourceOfferId},{contractId:'old-contract'},{allocationId:'stale'},{productId:999},{count:0},{count:-1},{count:1.5},{count:NaN},{count:q.maxCount+1}])assert.throws(()=>D.assignRegionalProduct(s,{...base,...change}));
 assert.equal(D.serializeDistillery(s),raw);
 let noContract=organicCareer(D,3,{enable:s=>D.enableRegionalDeliveries(D.enableRegionalPartners(s)),stopAtInquiry:true});assert.equal(D.regionalContract(noContract),null);assert.equal(D.regionalDeliveryQuote(noContract,pid(noContract),partner).ok,false);
 const o=D.regionalOffers(noContract)[0];noContract=D.declineRegionalOffer(noContract,o.partnerId,o.id);assert.equal(D.regionalDeliveryPartners(noContract).length,0);
 const young=bottleRegionalBatch(s,0);assert.match(quote(young).reason,/6か月未満/);assert.equal(quote(young).ok,false);
 // Synthetic negative eligibility projection only, never a valid/save fixture.
 const wrongBrand=structuredClone(s);wrongBrand.releases.find(r=>r.productId===pid(s)).brandId=999;assert.match(quote(wrongBrand).reason,/ブランド/);
});

test('regional reservations share physical inventory with retail/town/dept, and remain protected through months',()=>{
 let s=naturalDeliveryFixture(),id=pid(s),initial=quote(s).available;s=assign(s,5);s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:5});s=D.setMarketRetail(s,{productId:id,count:initial-10});
 assert.equal(quote(s).available,0);assert.equal(D.storeMarketInventory(s,id).regionalAssigned,5);assert.throws(()=>assign(s,1));assert.throws(()=>D.setMarketRetail(s,{productId:id,count:initial-9}));assert.throws(()=>D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:1}));
 const before=D.regionalDeliveryRows(s,partner);s=months(s,12);assert.deepEqual(D.regionalDeliveryRows(s,partner),before);conserved(s);cold(s);
 // The actual department selection competes with the same newly bottled stock.
 s=bottleRegionalBatch(s,24);id=pid(s);s=months(s,1);while(s.shop.offer&&s.shop.offer.shopId!=='department')s=D.acceptShop(s,s.shop.offer.shopId,s.shop.offer.id);
 assert.equal(s.shop.offer.shopId,'department');s=D.acceptShop(s,'department',s.shop.offer.id);s=D.listBottles(s,id);
 const stock=D.storeMarketInventory(s,id).hand;s=assign(s,stock-4);assert.equal(D.shopQuote(s,id,'department').ok,false);
 s=D.returnRegionalProduct(s,actionValue(s));assert.equal(D.shopQuote(s,id,'department').ok,true);
 const selection=D.departmentInterests(s).at(-1);s=D.deliverShop(s,id,5,'department',selection.selectionId);assert.equal(D.storeMarketInventory(s,id).held,5);assert.equal(quote(s).maxCount,stock-5);
 s=assign(s,stock-5);assert.throws(()=>assign(s,1));conserved(s);cold(s);
});

test('recent receipt cache stays at8 while older IDs and cumulative counts remain exact without town ledger slots',()=>{
 let s=naturalDeliveryFixture(),before=structuredClone(s),receipts=[];
 for(let i=0;i<12;i++){s=deliver(assign(s,1));receipts.push(D.regionalDeliveryHistory(s).at(-1));}
 assert.equal(s.regionalDeliveries.recentReceipts.length,8);assert.equal(s.regionalDeliveries.deliverySerial,12);assert.equal(D.regionalDeliveryHistory(s).length,12);assert.equal(new Set(receipts.map(r=>r.id)).size,12);
 assert.deepEqual(D.regionalDeliveryReceipt(s,receipts[0].id),receipts[0]);assert.deepEqual(s.shop,before.shop);assert.equal(D.regionalProductTotals(s,pid(s)).count,12);assert.equal(Object.keys(s.regionalDeliveries.totalsByProduct).length,1);conserved(s);cold(s);
 const old=receipts[0];assert.equal(D.deliverRegionalProduct(s,{partnerId:old.partnerId,contractId:old.contractId,productId:old.productId,allocationIds:old.allocationIds,deliveryId:old.id}),s);
});

test('ledger and comparison retain exact regional payments, native retail and stock after replay',()=>{
 let s=naturalDeliveryFixture(),id=pid(s);s=deliver(assign(s,5));const facts=D.nearbyComparisonFacts(cold(s),{productIds:[id],caskIds:[s.releases.at(-1).caskId]});
 assert.equal(facts.products[0].stock,s.core.products.find(p=>p.id===id).stock);
 const ledger=buildReleaseLedger(s,{facts}).entries.find(e=>e.productId===id);assert.equal(ledger.retail.count,0);assert.equal(ledger.deliveries.count,5);assert.equal(ledger.deliveryComplete,true);assert.equal(ledger.regional.customerSales,null);
 const compare=sourceDetails(s,s.releases.at(-1).caskId);assert.equal(compare.retail.count,0);assert.equal(compare.regional.count,5);assert.equal(compare.retailTargetCount,s.releases.at(-1).bottles-5);assert.equal(brandStats(s,1).stock,s.releases.reduce((n,r)=>n+r.bottles-r.sold-(r.delivered??0),0));
});

test('new enable boundary keeps disabled old save bytes and3seed180month native progress unchanged',()=>{
 const old=D.newRegionalPartnerDistillery(3),raw=D.serializeDistillery(old),enabled=D.enableRegionalDeliveries(old),strip=s=>{const {regionalDeliveries,...rest}=s;return {...rest,operations:s.operations.filter(o=>o.key!=='enable-regional-deliveries')};};
 assert.deepEqual(strip(enabled),old);assert.equal(D.serializeDistillery(old),raw);assert.equal(D.enableRegionalDeliveries(enabled),enabled);assert.equal(regionalDeliveryMode(old),false);cold(enabled);
 assert.equal(D.serializeDistillery(D.restoreDistillery(JSON.parse(readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw)),JSON.parse(readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw);
 for(const seed of [3,6,42]){
  const before=[],after=[];organicCareer(D,seed,{enable:D.enableRegionalPartners,onMonth:s=>before.push(createHash('sha256').update(JSON.stringify(s)).digest('hex'))});
  organicCareer(D,seed,{enable:s=>D.enableRegionalDeliveries(D.enableRegionalPartners(s)),onMonth:s=>after.push(createHash('sha256').update(JSON.stringify(strip(s))).digest('hex'))});assert.deepEqual(after,before,'seed '+seed);
 }
});

test('officialv8 pending/cancel/deliver, cold subprocess and failed writes protect committed state; tampering fails replay',()=>{
 const source=naturalDeliveryFixture(),assigned=assign(source,5),cancelled=D.returnRegionalProduct(assigned,actionValue(assigned)),delivered=deliver(assigned);
 for(const s of [assigned,cancelled,delivered]){
  const session=sessionFor(s),raw=serializeSession(s,session,options),restored=readSession(raw,options);assert.equal(serializeSession(restored.game,restored,options),raw);assert.equal(JSON.parse(raw).version,8);
 }
 const raw=D.serializeDistillery(delivered),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:16e6}),raw);
 const committed=D.serializeDistillery(assigned);
 for(const mode of ['quota','conflict','readback']){
  let live=assigned,saved=mode==='conflict'?'newer':committed;const store={getItem:()=>saved,setItem:(_k,v)=>{if(mode==='quota')throw Error('quota');if(mode!=='readback')saved=v;}};
  assert.throws(()=>{writeCandidate(store,FORMAL_SAVE_KEY,committed,raw);live=delivered;});assert.equal(live,assigned);
 }
 for(const mutate of [s=>s.regionalDeliveries.allocations.push({count:99}),s=>s.regionalDeliveries.totalsByProduct[pid(s)].count++,s=>s.regionalDeliveries.recentReceipts[0].revenue++,s=>s.operations.at(-1).value.receipt.customerSales=5,s=>s.operations.find(o=>o.key==='enable-regional-deliveries').value.month=1]){const bad=structuredClone(delivered);mutate(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}
});

test('real360month generation handover preserves regional contract, delivered IDs and pending allocations',()=>{
 let s=naturalDeliveryFixture(),id=pid(s);s=deliver(assign(s,5));s=assign(s,5);const contract=structuredClone(D.regionalContract(s)),receipts=D.regionalDeliveryHistory(s),pending=D.regionalDeliveryRows(s,partner);
 s=D.setMarketRetail(s,{productId:id,count:quote(s).available});s=months(s,24);s=bottleRegionalBatch(s,6);id=pid(s);s=D.setMarketRetail(s,{productId:id,count:D.storeMarketInventory(s,id).hand});s=months(s,24);s=months(s,360-s.core.month);
 assert.equal(s.generations.active.phase,'last-batch');s=fillRegionalBatch(s);assert.equal(s.generations.active.phase,'review');s=D.handoverGeneration(s,s.generations.active.id);
 assert.equal(s.generations.active.id,2);assert.deepEqual(D.regionalContract(s),contract);assert.deepEqual(D.regionalDeliveryRows(s,partner),pending);assert.deepEqual(D.regionalDeliveryHistory(s),receipts);conserved(s);cold(s);
 const formal=sessionFor(s);assert.equal(readSession(serializeSession(s,formal,options),options).game.generations.active.id,2);
});

test('new transaction cache closure protects every active allocation reader without changing legacy code',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),app=read('shop-app.mjs'),model=read('partner-orders.mjs'),nearby=read('nearby-comparison.mjs');
 const nativeURL=app.match(/import \* as nativeModel from '([^']+)'/)[1];assert.equal(nearby.match(/from '(\.\/partner-orders.mjs[^']+)'/)[1],nativeURL);
 for(const source of [app,model,read('store-market.mjs')])assert.match(source,/delivery=regional-delivery-v01/);
 assert.match(app,/ledger-view.mjs\?[^']*delivery=regional-delivery-v01/);assert.match(app,/market-ui.mjs\?[^']*delivery=regional-delivery-v01/);
});
