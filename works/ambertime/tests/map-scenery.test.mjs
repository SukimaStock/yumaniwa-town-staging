import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {mapSceneryProjection,MAP_SCENERY_RULES} from '../map-scenery.mjs';
import {mapPartnerProjection} from '../map-partners.mjs';
import {dailyMapProjection} from '../map-daily-view.mjs';
import {mapProgress} from '../world-map-view.mjs';
import {readSession,serializeSession} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {naturalDeliveryFixture,months,fillRegionalBatch,organicCareer,sessionFor} from './regional-delivery-helpers.mjs';
const partner='trial-region-desk';
// Explicit synthetic presentation fixtures for A/B/C/E/F. These rows are NOT
// claimed as a replayable career; genuine career integration follows below.
function townFixture(id,rows,now=130,{market=true,contract=true}={}){
 const s=D.newRegionalDeliveryDistillery(3);s.core.month=now;
 if(contract)s.shop.relations.push({shopId:id,brandId:1,startedMonth:0});
 s.shop.deliveries=rows.map(([month,count],i)=>({id:i+1,shopId:id,brandId:1,month,count}));
 if(market)s.storeMarket.startedMonth=0;else delete s.storeMarket;
 return s;
}
const scene=(s,id,stage=3)=>mapSceneryProjection(s,stage).partners.find(p=>p.id===id);
const rows=(n,gap,count,start=1)=>Array.from({length:n},(_,i)=>[start+i*gap,count]);
const assign=(s,n)=>{const productId=s.result.productId,q=D.regionalDeliveryQuote(s,productId,partner);return D.assignRegionalProduct(s,{partnerId:partner,productId,contractId:q.contractId,allocationId:q.nextAllocationId,count:n});};
const deliver=s=>{const productId=s.result.productId,q=D.regionalDeliveryQuote(s,productId,partner);return D.deliverRegionalProduct(s,{partnerId:partner,productId,contractId:q.contractId,allocationIds:q.allocationIds,deliveryId:q.nextDeliveryId});};
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;}

test('offers have no box; native and regional contracts have one box without fabricating paid activity',()=>{
 const fresh=D.newRegionalDeliveryDistillery(3);assert.deepEqual(mapSceneryProjection(fresh,3).partners,[]);assert.deepEqual(mapSceneryProjection(fresh,4).partners,[]);
 const offered=structuredClone(fresh);offered.shop.pendingOffers.push({id:1,shopId:'town-liquor',brandId:1,month:0});
 assert.equal(scene(offered,'town-liquor').box,false);assert.equal(scene(offered,'town-liquor').flowerStage,0);assert.equal(scene(offered,'town-liquor').butterfly,false);
 const contracted=townFixture('town-liquor',[]);assert.equal(scene(contracted,'town-liquor').box,true);assert.equal(scene(contracted,'town-liquor').flowerStage,0);assert.equal(scene(contracted,'town-liquor').butterfly,false);
 const region=naturalDeliveryFixture(3),before=D.serializeDistillery(region),p=scene(freeze(region),partner,4);
 assert.equal(p.box,true);assert.equal(p.flowerStage,0);assert.equal(p.activity.quantity,0);assert.equal(p.activity.customerSales,null);assert.equal(p.butterfly,false);assert.equal(D.serializeDistillery(region),before);
});

test('A/B/C compare long local trade, single bulk supermarket and repeated small bar purchases',()=>{
 const a=scene(townFixture('town-liquor',rows(11,12,10),121),'town-liquor');
 const b=scene(townFixture('supermarket',[[121,1000]],121),'supermarket');
 const c=scene(townFixture('bar',rows(25,1,1),25),'bar');
 assert.equal(a.flowerStage,2);assert.equal(a.activity.quantity,110);assert.equal(a.activity.tradeMonths,11);assert.equal(a.activity.customerSales,110);assert.equal(a.activity.delivered,0);
 assert.equal(b.flowerStage,0);assert.equal(b.activity.quantity,1000);assert.equal(b.activity.tradeMonths,1);assert.equal(b.activity.span,0);
 assert.equal(c.flowerStage,2);assert.equal(c.activity.quantity,25);assert.equal(c.activity.tradeMonths,25);
 // Splitting a bulk purchase into many same-month receipts never creates continuity.
 assert.equal(scene(townFixture('supermarket',Array.from({length:30},()=>[121,1]),121),'supermarket').flowerStage,0);
 for(const pin of [a,b,c])assert.equal(pin.butterfly,true);
});

test('E/F sixty-month rest retains historical flowers while butterflies expire and return',()=>{
 const s=townFixture('town-liquor',rows(11,12,10),121),initial=scene(s,'town-liquor');
 const paused=structuredClone(s);paused.core.month+=60;const quiet=scene(paused,'town-liquor');
 assert.equal(quiet.flowerStage,initial.flowerStage);assert.equal(quiet.box,true);assert.equal(quiet.butterfly,false);assert.equal(quiet.activity.quantity,initial.activity.quantity);
 const resumed=structuredClone(paused);resumed.shop.deliveries.push({id:12,shopId:'town-liquor',brandId:1,month:resumed.core.month,count:1});
 const alive=scene(resumed,'town-liquor');assert.equal(alive.flowerStage,2);assert.equal(alive.butterfly,true);
 for(const delta of [0,1,2,3]){const state=structuredClone(s);state.core.month+=delta;assert.equal(scene(state,'town-liquor').butterfly,delta<MAP_SCENERY_RULES.recentMonths);}
});

test('legacy delivery, observed consumer purchase and department receipt stay separate; allocations are not trade',()=>{
 const s=townFixture('town-liquor',[[4,7],[12,3]],12);s.storeMarket.startedMonth=10;
 const p=scene(s,'town-liquor');assert.equal(p.activity.delivered,7);assert.equal(p.activity.customerSales,3);assert.equal(p.activity.quantity,10);
 const old=scene(townFixture('town-liquor',[[4,7]],8,{market:false}),'town-liquor');assert.equal(old.activity.customerSales,null);assert.equal(old.activity.delivered,7);
 const dept=scene(townFixture('department',[[4,5],[12,5]],12),'department');assert.equal(dept.activity.customerSales,null);assert.equal(dept.activity.delivered,10);
 let real=naturalDeliveryFixture(3),before=scene(real,partner,4);real=assign(real,5);assert.deepEqual(scene(real,partner,4),before);
 const q=D.regionalDeliveryQuote(real,real.result.productId,partner);real=D.returnRegionalProduct(real,{partnerId:partner,productId:real.result.productId,contractId:q.contractId,allocationIds:q.allocationIds});assert.deepEqual(scene(real,partner,4),before);
});

test('unknown/missing evidence remains unknown and cannot create flowers or future activity',()=>{
 const s=townFixture('town-liquor',[]);delete s.shop.deliveries;const p=scene(s,'town-liquor');
 assert.equal(p.activity.known,false);assert.equal(p.activity.quantity,null);assert.equal(p.activity.tradeMonths,null);assert.equal(p.flowerStage,null);assert.equal(p.butterfly,false);assert.equal(p.box,true);
 const future=townFixture('bar',[[200,50]],10);assert.equal(scene(future,'bar').flowerStage,null);assert.equal(scene(future,'bar').butterfly,false);
 let real=deliver(assign(naturalDeliveryFixture(3),5));real=structuredClone(real);real.operations=real.operations.filter(o=>o.key!=='regional-deliver');
 const region=scene(real,partner,4);assert.equal(region.activity.quantity,5);assert.equal(region.activity.tradeMonths,null);assert.equal(region.flowerStage,null);assert.equal(region.activity.customerSales,null);
});

test('natural seed3/6 delivery, sixty-month rest/resume and cold restore reconstruct identical scenery',()=>{
 for(const seed of [3,6]){
  let s=naturalDeliveryFixture(seed),start=s.core.month,raw=D.serializeDistillery(s),progress=mapProgress(s);
  for(let stage=1;stage<=6;stage++){const p=mapSceneryProjection(freeze(s),stage);assert.deepEqual(p,mapSceneryProjection(s,stage));assert.deepEqual(dailyMapProjection(s,stage).scenery,p);if(stage>=5)assert.deepEqual(p.partners,[]);}
  assert.equal(D.serializeDistillery(s),raw);assert.deepEqual(mapProgress(s),progress);
  s=deliver(assign(s,5));const first=scene(s,partner,4);assert.equal(first.flowerStage,0);assert.equal(first.butterfly,true);assert.equal(first.activity.quantity,5);assert.equal(first.activity.customerSales,null);
  for(let i=0;i<5;i++){s=months(s,6);s=deliver(assign(s,1));}
  const grown=scene(s,partner,4);assert.equal(grown.flowerStage,1);assert.equal(grown.activity.tradeMonths,6);assert.equal(grown.activity.span,30);
  s=months(s,60);const rested=scene(s,partner,4);assert.equal(rested.flowerStage,grown.flowerStage);assert.equal(rested.butterfly,false);
  assert(s.regionalDeliveries.recentReceipts.length>0,'retained receipts alone cannot keep a butterfly alive');
  s=deliver(assign(s,1));const resumed=scene(s,partner,4);assert.equal(resumed.flowerStage,grown.flowerStage);assert.equal(resumed.butterfly,true);assert(s.core.month>=start+90);
  raw=D.serializeDistillery(s);const restored=D.restoreDistillery(raw);for(let stage=1;stage<=6;stage++)assert.deepEqual(mapSceneryProjection(restored,stage),mapSceneryProjection(s,stage));assert.equal(D.serializeDistillery(restored),raw);
 }
});

test('thirty-year generation handover retains native and regional flowers and exact formal state',()=>{
 let s=naturalDeliveryFixture(3);for(let i=0;i<6;i++){if(i)s=months(s,6);s=deliver(assign(s,4));}
 const before=mapSceneryProjection(s,4),native=mapSceneryProjection(s,3),contract=structuredClone(D.regionalContract(s));assert.equal(before.partners[0].flowerStage,2);
 s=months(s,360-s.core.month);assert.equal(s.generations.active.phase,'last-batch');s=fillRegionalBatch(s);assert.equal(s.generations.active.phase,'review');s=D.handoverGeneration(s,s.generations.active.id);
 assert.equal(s.generations.active.id,2);assert.deepEqual(D.regionalContract(s),contract);
 const after=scene(s,partner,4);assert.equal(after.flowerStage,2);assert.equal(after.butterfly,false);
 for(const p of mapSceneryProjection(s,3).partners){const earlier=native.partners.find(x=>x.id===p.id);if(earlier)assert(p.flowerStage>=earlier.flowerStage);}
 const raw=D.serializeDistillery(s),restored=D.restoreDistillery(raw);for(let stage=1;stage<=6;stage++)assert.deepEqual(mapSceneryProjection(restored,stage),mapSceneryProjection(s,stage));assert.equal(D.serializeDistillery(restored),raw);
});

test('all scales share one immutable snapshot evidence cache; unrelated facts do not repaint scenery',()=>{
 const base=naturalDeliveryFixture(3),s=deliver(assign(base,5));let reads=0;const journal=s.operations;
 Object.defineProperty(s,'operations',{get(){reads++;return journal;},enumerable:true});
 const first=mapSceneryProjection(s,4);for(let stage=1;stage<=6;stage++)mapSceneryProjection(s,stage);const initialReads=reads;assert(initialReads>0);
 for(let i=0;i<30;i++)for(let stage=1;stage<=6;stage++)mapSceneryProjection(s,stage);
 assert.equal(reads,initialReads,'camera/selection/all scales never rescan journal');
 const unrelated=structuredClone(base);unrelated.core.cash+=1;
 assert.equal(mapSceneryProjection(base,4).staticKey,mapSceneryProjection(unrelated,4).staticKey);
 const elapsed=structuredClone(s);elapsed.core.month+=3;const expired=mapSceneryProjection(elapsed,4);
 assert.equal(expired.staticKey,first.staticKey);assert.notEqual(expired.motionKey,first.motionKey);
});

test('actual town shelf purchases grow flowers, rest without stock stops activity, and resupply restores it',()=>{
 let s=naturalDeliveryFixture(3),id=s.result.productId;
 s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:45});s=months(s,120);
 const grown=scene(s,'town-liquor');assert.equal(grown.flowerStage,2);assert.equal(grown.activity.customerSales,28);assert.equal(grown.activity.delivered,0);
 s=D.returnStoreProduct(s,{productId:id,shopId:'town-liquor'});s=months(s,60);
 const rested=scene(s,'town-liquor');assert.equal(rested.flowerStage,2);assert.equal(rested.butterfly,false);
 s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:4});assert.equal(scene(s,'town-liquor').butterfly,false,'allocation itself is not a paid transaction');
 for(let i=0;i<24&&!scene(s,'town-liquor').butterfly;i++)s=months(s,1);
 assert.equal(scene(s,'town-liquor').butterfly,true);assert.equal(scene(s,'town-liquor').flowerStage,2);
 const raw=D.serializeDistillery(s);assert.deepEqual(mapSceneryProjection(D.restoreDistillery(raw),3),mapSceneryProjection(s,3));
});

test('formal v8 history and recall bytes remain exact while all six scenery views are read and cold restored',()=>{
 const s=deliver(assign(naturalDeliveryFixture(6),5)),session=sessionFor(s),options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
 const raw=serializeSession(s,session,options);assert.equal(JSON.parse(raw).version,8);
 for(let stage=1;stage<=6;stage++)mapSceneryProjection(s,stage);
 assert.equal(serializeSession(s,session,options),raw);
 const restored=readSession(raw,options);assert.equal(serializeSession(restored.game,restored,options),raw);
 for(let stage=1;stage<=6;stage++)assert.deepEqual(mapSceneryProjection(restored.game,stage),mapSceneryProjection(s,stage));
});

test('regional flowers use full confirmed continuity even when all recent eight receipts share one month',()=>{
 let s=naturalDeliveryFixture(3);
 for(let i=0;i<6;i++){if(i)s=months(s,6);s=deliver(assign(s,4));}
 for(let i=0;i<9;i++)s=deliver(assign(s,1));
 assert.equal(s.regionalDeliveries.recentReceipts.length,8);assert.equal(new Set(s.regionalDeliveries.recentReceipts.map(r=>r.month)).size,1);
 const p=scene(s,partner,4);assert.equal(p.flowerStage,2);assert.equal(p.activity.quantity,33);assert.equal(p.activity.tradeMonths,6);assert.equal(p.activity.span,30);
 assert.deepEqual(mapSceneryProjection(D.restoreDistillery(D.serializeDistillery(s)),4),mapSceneryProjection(s,4));
});
