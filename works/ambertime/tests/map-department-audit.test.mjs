import test from 'node:test';import assert from 'node:assert/strict';import * as D from '../partner-orders.mjs';import {mapSalesProjection,mapShopDetail} from '../map-sales-view.mjs';import {mapProgress,mapShopPositions} from '../world-map-view.mjs';import {departmentAuditStates} from './map-department-fixtures.mjs';
const states=departmentAuditStates();
test('department offer and held approval are not completed delivery or fictitious shelf facts',()=>{
 for(const name of ['before','offered','pending']){const s=states[name];assert.equal(mapShopDetail(s,'department'),null,name);assert(!mapSalesProjection(s,3).pins.some(p=>p.id==='department'),name);}
 assert.equal(states.offered.shop.offer.shopId,'department');assert(!mapProgress(states.offered).activeShops.has('department'));
 assert(mapProgress(states.pending).activeShops.has('department'));assert.equal(D.departmentInterests(states.pending)[0].pendingDelivery.count,5);assert.equal(states.pending.shop.deliveries.filter(r=>r.shopId==='department').length,0);
});
test('completed five remain delivery facts, while twelve-month count can return to zero',()=>{
 const settled=mapShopDetail(states.settled,'department'),expired=mapShopDetail(states.expired,'department');assert.equal(settled.mode,'delivery');assert.equal(settled.recentDelivered,5);assert.equal(settled.totalDelivered,5);assert.equal(settled.totalSold,null);assert.equal(settled.recentSold,null);assert.equal(settled.currentStock,null);
 assert.equal(expired.recentDelivered,0);assert.equal(expired.totalDelivered,5);assert.equal(expired.currentStock,null);assert.equal(D.departmentAdoptions(states.expired).length,1);assert.equal(states.expired.shop.deliveries.filter(r=>r.shopId==='department').length,1);
});
test('department marker exists at town scale only; map inspection and cold restore preserve exact native saves',()=>{
 assert(!mapShopPositions(2).department);assert.deepEqual(mapShopPositions(3).department,[42,112]);
 for(const [name,s] of Object.entries(states)){const raw=D.serializeDistillery(s);for(const stage of [1,2,3,4,5,6])mapSalesProjection(s,stage);mapProgress(s);assert.equal(D.serializeDistillery(s),raw,name);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw,name);}
});
