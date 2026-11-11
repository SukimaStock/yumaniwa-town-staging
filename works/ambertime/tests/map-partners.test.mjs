import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {mapPartnerProjection,mapPartnerDetail,marketPartnersForMap} from '../map-partners.mjs';
import {mapProgress,drawGameMap,mapObservationBounds} from '../world-map-view.mjs';
import {dailyMapProjection,normalizeMapView,loadMapView,saveMapView} from '../map-daily-view.mjs';
import {availableMarketShops} from '../market-ui.mjs';
import {organicCareer,naturalDeliveryFixture} from './regional-delivery-helpers.mjs';
const id='trial-region-desk';
const deepFreeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;};
const ids=rows=>rows.map(row=>row.id);
const reserve=(s,count)=>{const productId=s.result.productId,q=D.regionalDeliveryQuote(s,productId,id);return D.assignRegionalProduct(s,{partnerId:id,productId,count,contractId:q.contractId,allocationId:q.nextAllocationId});};
const deliver=s=>{const productId=s.result.productId,q=D.regionalDeliveryQuote(s,productId,id);return D.deliverRegionalProduct(s,{partnerId:id,productId,contractId:q.contractId,allocationIds:q.allocationIds,deliveryId:q.nextDeliveryId});};

test('six freely browsable maps are pure and static regional definitions never become contacts',()=>{
 const s=deepFreeze(D.newRegionalDeliveryDistillery(3)),raw=D.serializeDistillery(s),progress=mapProgress(s);
 const canvas={getContext:()=>({fillRect(){},fillStyle:'',imageSmoothingEnabled:true})};
 for(const stage of [1,2,3,4,5,6]){
  assert.equal(drawGameMap(canvas,s,stage),stage);
  const p=mapPartnerProjection(s,stage);
  assert.equal(p.stage,stage);assert.deepEqual(p.partners,[]);assert.equal(p.retail.id,'retail');
  assert.deepEqual(dailyMapProjection(s,stage).pins,p.pins);
  assert.deepEqual(ids(marketPartnersForMap(s,{stage},availableMarketShops(s))),['retail']);
 }
 assert.equal(mapPartnerDetail(s,id),null);assert.equal(mapPartnerDetail(s,'missing'),null);assert.equal(mapPartnerDetail(s,'retail'),null);
 assert.deepEqual(mapProgress(s),progress);assert.equal(D.serializeDistillery(s),raw);assert.equal(progress.max,1);
});

test('an organically emitted near-wide inquiry appears as an offer but cannot be delivered to',()=>{
 let s=organicCareer(D,3,{enable:s=>D.enableRegionalDeliveries(D.enableRegionalPartners(s)),stopAtInquiry:true});
 const offer=D.regionalOffers(s)[0],before=D.serializeDistillery(s),pin=mapPartnerProjection(deepFreeze(s),4).partners[0];
 assert(offer);assert.equal(pin.id,id);assert.equal(pin.status,'offer');assert.equal(pin.canTrade,false);assert.equal(pin.detail.offer.eventId,offer.eventId);
 assert(s.labConnection.town.events.some(e=>e.id===offer.eventId&&e.type==='inquiry'&&e.to==='near-wide'));
 assert(!ids(marketPartnersForMap(s,{stage:4,selectedShop:id},availableMarketShops(s))).includes(id),'an offer does not grant a shelf; contracted town shops may supplement it');
 assert.equal(D.serializeDistillery(s),before);
 s=D.declineRegionalOffer(s,id,offer.id);assert.deepEqual(mapPartnerProjection(s,4).partners,[]);
 assert.equal(normalizeMapView({stage:4,selectedShop:id},6,ids(mapPartnerProjection(s,4).partners)).selectedShop,null);
});

test('natural seed3/6 contracts select regional scope and preserve native allocations, delivery and cold replay',()=>{
 for(const seed of [3,6]){
  let s=naturalDeliveryFixture(seed),contract=D.regionalContract(s),before=D.serializeDistillery(s),progress=mapProgress(s),available=availableMarketShops(s);
  const region=mapPartnerProjection(deepFreeze(s),4),pin=region.partners[0];
  assert.equal(pin.id,id);assert.equal(pin.status,'contract');assert.equal(pin.canTrade,true);assert.equal(pin.activity.contractId,contract.id);
  assert.deepEqual(pin.bounds,[86,36,12,12]);assert.deepEqual([pin.x,pin.y],[92,42]);
  assert.equal(pin.regionId,'trial-region');assert.equal(pin.activity.customerSales,null);
  assert.deepEqual(region.pins,dailyMapProjection(s,4).pins);
  assert.deepEqual(ids(marketPartnersForMap(s,{stage:4,selectedShop:id},available)),['retail',id]);
  const town=mapPartnerProjection(s,3);
  assert(!ids(town.partners).includes(id));assert(town.partners.some(p=>p.id==='supermarket'));
  assert(!ids(marketPartnersForMap(s,{stage:3},available)).includes(id));
  for(const stage of [1,5,6]){
   assert.deepEqual(mapPartnerProjection(s,stage).partners,[]);
   assert.deepEqual(ids(marketPartnersForMap(s,{stage,selectedShop:id},available)),['retail',id],'an explicit eligible target remains selected independently of the viewed scale');
  }
  assert.equal(D.serializeDistillery(s),before);assert.deepEqual(mapProgress(s),progress);
  s=reserve(s,5);let detail=mapPartnerDetail(s,id);assert.equal(detail.pendingCount,5);assert.equal(detail.totalDelivered,0);assert.equal(detail.customerSales,null);
  s=deliver(s);detail=mapPartnerDetail(s,id);const receipt=D.regionalDeliveryHistory(s,id).at(-1);
  assert.equal(detail.pendingCount,0);assert.equal(detail.totalDelivered,5);assert.equal(detail.latestMonth,receipt.month);assert.equal(detail.latestCount,5);assert.equal(detail.totalSold,null);
  assert.equal(mapPartnerProjection(s,4).partners[0].status,'delivered');assert.equal(detail.contractId,contract.id);assert.equal(receipt.inquiryEventId,contract.eventId);
  assert.deepEqual(s.labConnection,JSON.parse(before).labConnection);
  const raw=D.serializeDistillery(s),restored=D.restoreDistillery(raw);
  assert.equal(D.serializeDistillery(restored),raw);assert.deepEqual(mapPartnerProjection(restored,4),mapPartnerProjection(s,4));assert.deepEqual(mapProgress(s),progress);
 }
});

test('native town identities match authored bounds and department keeps its special receiving path',()=>{
 // Explicit synthetic presentation fixture: contacts, not a replayable career.
 const s=D.newRegionalDeliveryDistillery(3);s.shop.relations=['town-liquor','supermarket','bar','department'].map(shopId=>({shopId,brandId:1,startedMonth:0}));s.alleyBar={version:1};
 const p=mapPartnerProjection(s,3);assert.deepEqual(new Set(ids(p.partners)),new Set(['town-liquor','supermarket','bar','department']));
 for(const pin of p.partners){assert.deepEqual(pin.bounds,mapObservationBounds(3)[pin.id]);assert.equal(pin.x,pin.bounds[0]+pin.bounds[2]/2);assert.equal(pin.y,pin.bounds[1]+pin.bounds[3]/2);}
 const department=p.partners.find(p=>p.id==='department');assert.equal(department.canTrade,false);assert.equal(department.tradeMethod,'department-project');
 const available=availableMarketShops(s);
 assert.deepEqual(ids(marketPartnersForMap(s,{stage:3,selectedShop:'supermarket'},available)),['retail','supermarket']);
 assert.deepEqual(ids(marketPartnersForMap(s,{stage:3,selectedShop:'department'},available)),['retail']);
 assert.deepEqual(ids(marketPartnersForMap(s,{stage:3,selectedShop:'missing'},available)),['retail','town-liquor','supermarket','bar'],'a stale selection falls back to actual eligible partners');
});

test('display-only v2 storage keeps stage4 selection and separate camera memories; stale targets normalize to no selection',()=>{
 const key='ambertime.map-view.v1',formal='ambertime.save',map=new Map([[formal,'untouched']]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 map.set(key,JSON.stringify({version:1,stage:3,selectedShop:'town-liquor'}));assert.deepEqual(loadMapView(storage,key),{stage:3,selectedShop:'town-liquor'});
 const view={stage:4,selectedShop:id,transforms:{3:{zoom:2,panX:10,panY:-20},4:{zoom:3,panX:-30,panY:40}}};
 assert.equal(saveMapView(storage,key,view),true);assert.equal(JSON.parse(map.get(key)).version,2);assert.deepEqual(loadMapView(storage,key),view);
 assert.deepEqual(normalizeMapView(view,6,[id]),view);assert.equal(normalizeMapView(view,6,[]).selectedShop,null);assert.equal(normalizeMapView({...view,stage:6},6,[id]).selectedShop,null);
 const bad={stage:4,selectedShop:id,transforms:{0:{zoom:2,panX:0,panY:0},4:{zoom:99,panX:-99999,panY:99999},6:{zoom:NaN,panX:0,panY:0}}};
 assert.deepEqual(normalizeMapView(bad,6,[id]).transforms,{4:{zoom:4,panX:-1000,panY:1000}});assert.equal(map.get(formal),'untouched');assert.equal(map.size,2);
 assert.equal(saveMapView({setItem(){throw Error('quota');}},key,view),false);assert.equal(loadMapView({getItem(){throw Error('denied');}},key),null);
});

test('bounded recent activity is explicitly retained receipts while cumulative regional delivery remains complete',()=>{
 let s=naturalDeliveryFixture(3);
 for(let n=0;n<12;n++)s=deliver(reserve(s,1));
 const pin=mapPartnerProjection(s,4).partners[0];
 assert.equal(pin.activity.cumulativeDelivered,12);assert.equal(pin.activity.recentDelivered,8);assert.equal(pin.detail.recent.length,8);assert.equal(pin.activity.recentLimit,8);assert.equal(pin.activity.recentWindow,'retained-receipts');assert.equal(pin.activity.customerSales,null);
 const restored=D.restoreDistillery(D.serializeDistillery(s));assert.deepEqual(mapPartnerProjection(restored,4),mapPartnerProjection(s,4));
});

test('native pending offer is inspectable but grants no shelf; unknown geography invents no partner',()=>{
 // Explicit synthetic presentation fixture for a queued native offer.
 const s=D.newRegionalDeliveryDistillery(3);s.shop.pendingOffers.push({id:1,shopId:'town-liquor',brandId:1,month:0});
 const pin=mapPartnerProjection(s,3).partners[0];assert.equal(pin.id,'town-liquor');assert.equal(pin.status,'offer');assert.equal(pin.canTrade,false);
 assert.deepEqual(ids(marketPartnersForMap(s,{stage:3,selectedShop:pin.id},availableMarketShops(s))),['retail']);
 for(const stage of [0,7,'4',NaN])assert.deepEqual(mapPartnerProjection(s,stage).partners,[]);
});

test('native customer purchases never become regional-style delivery activity',()=>{
 // Synthetic ledger boundary fixture for the legacy mixed native ledger.
 const s=D.newRegionalDeliveryDistillery(3);s.core.month=20;
 s.shop.relations.push({shopId:'town-liquor',brandId:1,startedMonth:0});
 s.storeMarket.startedMonth=10;
 s.shop.deliveries.push({shopId:'town-liquor',brandId:1,month:9,count:2},{shopId:'town-liquor',brandId:1,month:20,count:5});
 const pin=mapPartnerProjection(s,3).partners.find(p=>p.id==='town-liquor');
 assert.equal(pin.activity.cumulativeDelivered,2);assert.equal(pin.activity.recentDelivered,2);assert.equal(pin.activity.customerSales,5);
 assert.equal(normalizeMapView({stage:3,selectedShop:'retail'},6,[]).selectedShop,'retail');
 assert.deepEqual(ids(marketPartnersForMap(s,{stage:3,selectedShop:'retail'},availableMarketShops(s))),['retail']);
});

test('multiple organic careers retain exact monthly progress through browsing and cold restore',()=>{
 for(const seed of [3,6,42]){
  let samples=0;
  const s=organicCareer(D,seed,{enable:s=>D.enableRegionalDeliveries(D.enableRegionalPartners(s)),through:180,restoreAt:[120,160],onMonth:s=>{
   if(s.core.month%12)return;
   const before=D.serializeDistillery(s),progress=mapProgress(s);
   for(let stage=1;stage<=6;stage++){
    const projection=mapPartnerProjection(s,stage);dailyMapProjection(s,stage);
    for(const pin of projection.partners)marketPartnersForMap(s,{stage,selectedShop:pin.id},availableMarketShops(s));
   }
   assert.equal(D.serializeDistillery(s),before);assert.deepEqual(mapProgress(s),progress);samples++;
  }});
  assert.equal(s.core.month,180);assert.equal(samples,15);assert.equal(D.serializeDistillery(D.restoreDistillery(D.serializeDistillery(s))),D.serializeDistillery(s));
 }
});
