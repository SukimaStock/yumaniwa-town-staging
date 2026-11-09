import test from 'node:test';
import assert from 'node:assert/strict';
import {createShopRelationshipProjection,shopRelationshipEvidence} from './relationship-view.mjs';
import {SCENARIOS,fixtureState,SHOP_NAMES,MAP_SHOPS} from './fixtures.mjs';
const state=id=>fixtureState(SCENARIOS.find(s=>s.id===id));
const read=(s,id='bar')=>shopRelationshipEvidence(s,id,{mapShopIds:MAP_SHOPS});
test('before rumor arrival has no confirmed connection',()=>assert.equal(read(state('before')),null));
test('after arrival links the real source node from a real shipment',()=>{
  const x=read(state('after'));
  assert.equal(x?.fromShopId,'town-liquor');assert.equal(x?.selectedShopId,'bar');assert.deepEqual(x.proofEventIds,['e4','e3','e2','e1']);assert.equal(x.canDrawLink,true);
});
test('arrivals without committed source shop status never produce a visible relationship',()=>assert.equal(read(state('missing')),null));
test('display projection never mutates game fixture',()=>{
 const s=state('after'),raw=JSON.stringify(s),p=createShopRelationshipProjection();
 assert.equal(p.read(s,'bar',{mapShopIds:MAP_SHOPS})?.eventId,'e4');assert.equal(JSON.stringify(s),raw);
});
test('no reverse relationship is invented',()=>assert.equal(read(state('after'),'town-liquor'),null));
test('unknown source or target never drawn',()=>{
 const s=state('after');assert.equal(read(s,'supermarket'),null);assert.equal(SHOP_NAMES.bar,'路地裏のバー');
});
test('a tampered arrival cannot be used for map link',()=>{
 const s=state('after');s.labConnection.town.events[3]={...s.labConnection.town.events[3],sourceId:'not-real'};
 assert.equal(read(s),null);
});
test('moving the layout to a map without source geometry disables only the line',()=>{
 const s=state('after'),x=shopRelationshipEvidence(s,'bar',{mapShopIds:['bar']});
 assert.equal(x?.fromShopId,'town-liquor');assert.equal(x?.canDrawLink,false);
});
