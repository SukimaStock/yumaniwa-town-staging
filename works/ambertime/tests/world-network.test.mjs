import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {WORLD_CONTACTS,worldNetworkMode,regionalContacts} from '../world-network.mjs';
import {tradingPartner,partnersForMap} from '../trading-partners.mjs';
import {mapPartnerProjection} from '../map-partners.mjs';
import {mapSceneryProjection} from '../map-scenery.mjs';
import {naturalDeliveryFixture,sessionFor,months,fillRegionalBatch} from './regional-delivery-helpers.mjs';
import {serializeSession,readSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {WORLD_IDS,enableWorld,naturalWorldCraftFixture,naturalWorldNearFixture,naturalWorldNationalFixture,reserveWorld,returnWorld,deliverWorld,worldMonths,coldWorld,sourceChain} from './world-network-helpers.mjs';
const formalOptions={enabled:true,restore:D.restoreDistillery,serialize:D.serializeDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const near=WORLD_IDS.near,far=WORLD_IDS.overseas,national=WORLD_IDS.national;
const ids=rows=>rows.map(p=>p.id);
const snapshot=s=>D.serializeDistillery(s);
function contractedFar(seed=27){let s=naturalWorldCraftFixture(seed);const o=D.regionalOffers(s).find(o=>o.partnerId===far);return D.acceptRegionalOffer(s,far,o.id);}
function twoContactFixture(){
 for(const seed of [27,39,107]){const s=naturalWorldCraftFixture(seed);if(D.regionalOffers(s).some(o=>o.partnerId===near))return s;}
 throw Error('Expected an organically emitted near and overseas offer on the same lawful career');
}
function acceptPending(s,id){const o=D.regionalOffers(s).find(o=>o.partnerId===id);assert(o);return D.acceptRegionalOffer(s,id,o.id);}

test('6A definitions use stable regional/national/overseas IDs with different terms but no automatic contract',()=>{
 assert.deepEqual(WORLD_CONTACTS.map(p=>p.partnerId),[near,national,far]);assert.deepEqual(WORLD_CONTACTS.map(p=>p.nodeId),['near-wide','national-craft','overseas-craft']);
 assert.deepEqual(WORLD_CONTACTS.map(p=>p.stage),[4,5,6]);
 for(const c of WORLD_CONTACTS){const p=tradingPartner(c.partnerId);assert(p);assert.equal(p.regionId,c.regionId);assert.equal(p.mapScale,c.mapScale);assert.equal(p.capacity.allocationMinQuantity,1);assert.equal(p.capacity.quantityChoice,'player');assert.equal(p.availability,'definition-only');assert(partnersForMap({...c,includeDefinitions:true}).some(p=>p.id===c.partnerId));}
 assert(tradingPartner(far).price.rate<=tradingPartner(near).price.rate,'being overseas is not itself a price premium');
 const s=D.newWorldNetworkDistillery(3);assert.equal(worldNetworkMode(s),true);assert.deepEqual(D.regionalDeliveryPartners(s),[]);assert.deepEqual(D.regionalOffers(s),[]);assert.equal(s.core.casks.length,0);
 assert.equal(new Set(WORLD_CONTACTS.map(c=>c.partnerId)).size,3);
});

test('6A explicit enable retains old trial IDs, allocations, receipts and pending rumor queues without historical backfill',()=>{
 let old=naturalDeliveryFixture(3);old=deliverWorld(reserveWorld(old,near,5),near);old=reserveWorld(old,near,5);
 const before=snapshot(old),contract=structuredClone(D.regionalContract(old)),history=D.regionalDeliveryHistory(old),pending=structuredClone(old.labConnection.town.pending),packets=structuredClone(old.labConnection.town.packets);
 const s=D.enableWorldNetwork(old);assert.equal(snapshot(old),before);assert.equal(D.enableWorldNetwork(s),s);assert.equal(s.operations.at(-1).key,'enable-world-network');
 for(const key of Object.keys(old).filter(k=>k!=='operations'))assert.deepEqual(s[key],old[key]);assert.deepEqual(s.operations.slice(0,-1),old.operations);
 assert.deepEqual(D.regionalContract(s),contract);assert.deepEqual(D.regionalDeliveryHistory(s),history);assert.deepEqual(D.regionalDeliveryRows(s,near),D.regionalDeliveryRows(old,near));
 assert.equal(s.worldNetwork.deliveryStartSerial,old.regionalDeliveries.deliverySerial);assert.equal(s.worldNetwork.forwardedSerial,old.regionalDeliveries.deliverySerial);
 assert.deepEqual(s.labConnection.town.pending,pending);assert.deepEqual(s.labConnection.town.packets,packets);assert.deepEqual(s.labConnection.town.shipments,old.labConnection.town.shipments);
 for(const receipt of history)assert(!s.labConnection.town.shipments.some(x=>x.id===receipt.id));
 coldWorld(s);coldWorld(old);
 const later=worldMonths(s,1);for(const receipt of history)assert(!later.labConnection.town.shipments.some(x=>x.id===receipt.id),'old paid facts are not retroactively forwarded');
});

test('6A disabled regional games and legacy v8 readers do not silently opt into the new network',()=>{
 const old=D.newRegionalDeliveryDistillery(3),raw=snapshot(old),restored=D.restoreDistillery(raw);
 assert.equal(worldNetworkMode(old),false);assert.equal(restored.worldNetwork,undefined);assert.equal(snapshot(restored),raw);assert.deepEqual(regionalContacts(old).map(p=>p.partnerId),[near]);assert.equal(D.regionalDeliveryQuote(old,999,far).ok,false);
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;assert.equal(snapshot(D.restoreDistillery(fixture)),fixture);
 for(const mutate of [s=>s.worldNetwork.version=9,s=>s.worldNetwork.eventStart++,s=>s.operations.splice(s.operations.findIndex(o=>o.key==='enable-world-network'),1)]){const bad=structuredClone(D.newWorldNetworkDistillery(3));mutate(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}
});

test('6B real overseas inquiry can precede every remote contract and accept creates a contract without stock or cash movement',()=>{
 let s=naturalWorldCraftFixture(27);const offer=D.regionalOffers(s).find(o=>o.partnerId===far),chain=sourceChain(s,offer.eventId),source=chain.find(e=>e.type==='shipment');
 assert.equal(s.regionalPartners.contracts.length,0);assert.equal(D.regionalContract(s,national),null);assert.equal(D.regionalContract(s,near),null);
 assert.equal(offer.nodeId,'overseas-craft');assert(chain.some(e=>e.type==='interest'));assert(chain.some(e=>e.type==='arrival'));assert(chain.some(e=>e.type==='rumor'&&e.to==='overseas-craft'));assert.equal(chain.at(-1).type,'release');assert(source);
 assert.equal(source.mainReleaseId,offer.releaseId);assert.equal(source.productId,offer.productId);assert.equal(source.shipmentId,offer.sourceReceiptId);
 const paid=s.labConnection.town.shipments.find(x=>x.id===source.shipmentId);assert(paid);assert(paid.id.startsWith('retail:'));assert(paid.count>0);
 const before=structuredClone(s);s=D.acceptRegionalOffer(s,far,offer.id);const contract=D.regionalContract(s,far);assert.equal(contract.id,'regional-contract:'+far);assert.equal(contract.eventId,offer.eventId);assert.equal(contract.sourceOfferId,offer.id);
 assert.deepEqual(s.core,before.core);assert.deepEqual(s.shop,before.shop);assert.deepEqual(s.regionalDeliveries,before.regionalDeliveries);assert.deepEqual(s.labConnection,before.labConnection);
 assert.equal(D.regionalDeliveryPartners(s).find(p=>p.id===far).contractId,contract.id);assert.equal(D.acceptRegionalOffer(s,far,offer.id),s);coldWorld(s);
 assert.equal(mapPartnerProjection(s,6).partners.filter(p=>p.id===far).length,1);assert(!mapPartnerProjection(s,4).partners.some(p=>p.id===far));
});

test('6B pending contacts stay independent while deferring or declining another offer',()=>{
 let s=twoContactFixture(),offers=D.regionalOffers(s),nearOffer=offers.find(o=>o.partnerId===near),farOffer=offers.find(o=>o.partnerId===far);
 const nearBefore=structuredClone(nearOffer);s=D.deferRegionalOffer(s,far,farOffer.id);assert.deepEqual(D.regionalOffers(s).find(o=>o.partnerId===near),nearBefore);
 s=D.acceptRegionalOffer(s,near,nearOffer.id);assert(D.regionalOffers(s).some(o=>o.id===farOffer.id));s=D.declineRegionalOffer(s,far,farOffer.id);assert.equal(D.regionalContract(s,far),null);assert(D.regionalContract(s,near));
 assert.throws(()=>reserveWorld(s,far,1));assert.throws(()=>D.acceptRegionalOffer(s,far,farOffer.id));coldWorld(s);
});

test('6B two genuine contracts share one finite stock with partner-specific allocation IDs and independent cancellation',()=>{
 let s=twoContactFixture();s=acceptPending(s,near);s=acceptPending(s,far);const productId=s.result.productId,hand=D.storeMarketInventory(s,productId).hand;assert(hand>=5);
 const before=structuredClone(s.core);s=reserveWorld(s,near,2,productId);s=reserveWorld(s,far,hand-2,productId);
 assert.deepEqual(s.core,before);assert.equal(D.storeMarketInventory(s,productId).hand,0);assert.equal(D.regionalDeliveryRows(s,near)[0].count,2);assert.equal(D.regionalDeliveryRows(s,far)[0].count,hand-2);
 assert.notEqual(D.regionalDeliveryRows(s,near)[0].allocationIds[0],D.regionalDeliveryRows(s,far)[0].allocationIds[0]);assert.throws(()=>reserveWorld(s,far,1,productId));
 const nearRows=structuredClone(D.regionalDeliveryRows(s,near));s=returnWorld(s,far,productId);assert.equal(D.storeMarketInventory(s,productId).hand,hand-2);assert.deepEqual(D.regionalDeliveryRows(s,near),nearRows);
 s=deliverWorld(s,near,productId);assert.equal(D.regionalDeliveryHistory(s,near).at(-1).count,2);assert.equal(D.regionalDeliveryHistory(s,far).length,0);coldWorld(s);
});

test('6B actual remote receipt enters town once with exact release and source identity and never becomes consumer sales',()=>{
 let s=contractedFar(27),id=s.result.productId,q=D.regionalDeliveryQuote(s,id,far),before=structuredClone(s),raw=snapshot(s);assert(q.ok);assert(q.maxCount>=5);
 assert.equal(D.regionalDeliveryQuote(s,id,national).ok,false);assert.equal(D.regionalDeliveryQuote(s,id,'unknown-partner').ok,false);
 s=reserveWorld(s,far,5,id);assert.equal(s.core.cash,before.core.cash);assert.deepEqual(s.labConnection,before.labConnection);
 s=deliverWorld(s,far,id);const receipt=D.regionalDeliveryHistory(s,far).at(-1),shipment=s.labConnection.town.shipments.find(x=>x.id===receipt.id);
 assert(shipment);assert.equal(shipment.to,'overseas-craft');assert.equal(shipment.count,receipt.count);assert.equal(shipment.month,receipt.month);assert.equal(s.labConnection.town.shipments.filter(x=>x.id===receipt.id).length,1);
 assert.equal(s.labConnection.town.releases.find(r=>r.id===shipment.parts[0].releaseId).externalId,receipt.releaseId);assert.equal(receipt.customerSales,null);assert.equal(receipt.customerRevenue,null);
 assert.equal(s.core.products.find(p=>p.id===id).stock,before.core.products.find(p=>p.id===id).stock-5);assert.equal(s.core.cash,Math.round((before.core.cash+receipt.revenue)*100)/100);assert.deepEqual(s.shop,before.shop);assert.deepEqual(s.core.lastMonth,before.core.lastMonth);
 const replay={partnerId:far,productId:id,contractId:receipt.contractId,allocationIds:receipt.allocationIds,deliveryId:receipt.id};assert.equal(D.deliverRegionalProduct(s,replay),s);assert.equal(s.worldNetwork.forwardedSerial,s.regionalDeliveries.deliverySerial);assert.notEqual(snapshot(s),raw);
 const chain=sourceChain(s,shipment.parts[0].eventId);assert.equal(chain.at(-1).type,'release');assert.equal(chain.at(-1).mainReleaseId,receipt.releaseId);assert.equal(chain.at(-1).productId,receipt.productId);coldWorld(s);
});

test('6B qualifications fail closed for foreign contract, missing product, brand and age without changing committed state',()=>{
 const s=contractedFar(27),id=s.result.productId,q=D.regionalDeliveryQuote(s,id,far),raw=snapshot(s);
 assert.throws(()=>D.assignRegionalProduct(s,{partnerId:far,productId:id,count:1,contractId:'regional-contract:unknown',allocationId:q.nextAllocationId}));assert.throws(()=>reserveWorld(s,'unknown-partner',1,id));assert.equal(D.regionalDeliveryQuote(s,999999,far).ok,false);
 // Explicit disposable quote-only invalid input: not a replayable career or a forged contract.
 const foreign=structuredClone(s);foreign.releases.find(r=>r.productId===id).brandId=999;assert.equal(D.regionalDeliveryQuote(foreign,id,far).ok,false);
 const young=structuredClone(s);young.core.products.find(p=>p.id===id).age=5;assert.equal(D.regionalDeliveryQuote(young,id,far).ok,false);assert.equal(snapshot(s),raw);
});

test('6B pending propagation and seeded future events survive cold restore and formal v8 exactly',()=>{
 let s=naturalWorldNearFixture(3);s=deliverWorld(reserveWorld(s,near,5),near);assert(s.labConnection.town.packets.some(p=>p.sourceId===s.labConnection.town.shipments.at(-1).parts[0].eventId));
 const coldRaw=snapshot(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:coldRaw,encoding:'utf8',maxBuffer:32e6}),coldRaw);
 const restored=coldWorld(s),a=worldMonths(s,60),b=worldMonths(restored,60);assert.equal(snapshot(a),snapshot(b));assert.deepEqual(a.labConnection,b.labConnection);
 const formal=sessionFor(a),raw=serializeSession(a,formal,formalOptions),loaded=readSession(raw,formalOptions);assert.equal(JSON.parse(raw).version,8);assert.equal(serializeSession(loaded.game,loaded,formalOptions),raw);
 for(let stage=1;stage<=6;stage++)assert.deepEqual(mapSceneryProjection(loaded.game,stage),mapSceneryProjection(a,stage));
 const pending=reserveWorld(a,near,1),next=deliverWorld(pending,near),saved=snapshot(pending);let live=pending;
 assert.throws(()=>{writeCandidate({getItem:()=>saved,setItem(){throw Error('quota');}},FORMAL_SAVE_KEY,saved,snapshot(next));live=next;});assert.equal(live,pending);
});

test('6B accepted world contract and receipt IDs survive real thirty-year handover without rewriting old native scenery',()=>{
 let s=contractedFar(27);s=deliverWorld(reserveWorld(s,far,5),far);const contract=structuredClone(D.regionalContract(s,far)),receipts=D.regionalDeliveryHistory(s,far),native=mapSceneryProjection(s,3);
 s=worldMonths(s,360-s.core.month);assert.equal(s.generations.active.phase,'last-batch');s=fillRegionalBatch(s);assert.equal(s.generations.active.phase,'review');s=D.handoverGeneration(s,s.generations.active.id);assert.equal(s.generations.active.id,2);
 assert.deepEqual(D.regionalContract(s,far),contract);assert.deepEqual(D.regionalDeliveryHistory(s,far),receipts);for(const p of native.partners){const after=mapSceneryProjection(s,3).partners.find(x=>x.id===p.id);if(after)assert(after.flowerStage>=p.flowerStage);}
 coldWorld(s);
});

test('6B actual regional receipts cause national inquiries and national contracts deliver through the same API',()=>{
 for(const seed of [3,6]){
  let s=naturalWorldNationalFixture(seed),offer=D.regionalOffers(s).find(o=>o.partnerId===national),chain=sourceChain(s,offer.eventId);
  assert(offer.sourceReceiptId.startsWith('regional-delivery:'+near+':'));assert(chain.some(e=>e.type==='shipment'&&e.shipmentId===offer.sourceReceiptId&&e.to==='near-wide'));assert(chain.some(e=>e.type==='arrival'&&e.to==='national-craft'));assert.equal(chain.at(-1).type,'release');
  const source=D.regionalDeliveryReceipt(s,offer.sourceReceiptId);assert(source);assert.equal(source.releaseId,offer.releaseId);assert.equal(source.productId,offer.productId);assert.equal(source.customerSales,null);
  const before=structuredClone(s.core);s=D.acceptRegionalOffer(s,national,offer.id);assert.deepEqual(s.core,before);assert(D.regionalContract(s,near));assert(D.regionalContract(s,national));
  assert(D.regionalDeliveryQuote(s,s.result.productId,national).available>=5);s=deliverWorld(reserveWorld(s,national,5),national);
  const receipt=D.regionalDeliveryHistory(s,national).at(-1);assert.equal(receipt.partnerId,national);assert.equal(receipt.count,5);assert.equal(receipt.customerSales,null);assert.equal(s.labConnection.town.shipments.filter(x=>x.id===receipt.id).length,1);assert.equal(s.labConnection.town.shipments.find(x=>x.id===receipt.id).to,'national-craft');
  assert.equal(mapPartnerProjection(s,5).partners.filter(p=>p.id===national).length,1);assert(!mapPartnerProjection(s,4).partners.some(p=>p.id===national));coldWorld(s);
 }
});

test('6B the same real receipt strategy can fail to generate a national inquiry without altered probabilities',()=>{
 const s=naturalWorldNationalFixture(27,{required:false});assert.equal(s.core.month,300);assert.equal(D.regionalContract(s,national),null);assert(!D.regionalOffers(s).some(o=>o.partnerId===national));assert.equal(D.regionalDeliveryHistory(s,near).length,15);assert(s.labConnection.town.attempts.some(a=>a.type==='inquiry'));coldWorld(s);
});
