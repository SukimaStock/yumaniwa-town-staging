import test from 'node:test';
import assert from 'node:assert/strict';
import {shopRelationshipEvidence,relationshipNodeForShop,createShopRelationshipProjection} from '../map-relationship-view.mjs';

const release={id:'e1',type:'release',month:1,releaseId:1,sourceId:null};
const shipment={id:'e2',type:'shipment',month:2,releaseId:1,sourceId:'e1',from:'distillery',to:'town'};
const rumor={id:'e3',type:'rumor',month:3,releaseId:1,sourceId:'e2',from:'town',to:'bar'};
const arrival={id:'e4',type:'arrival',month:4,releaseId:1,sourceId:'e3',from:'town',to:'bar',channel:'chance',mainReleaseId:21};
const visible=['town-liquor','bar'];
function fixture(events=[release,shipment,rumor,arrival],relations=visible){
 return {labConnection:{version:1,town:{events}},shop:{relations:relations.map(shopId=>({shopId,startedMonth:1}))}};
}
const read=(game,opts={})=>shopRelationshipEvidence(game,'bar',{mapShopIds:visible,...opts});

test('only a factual arrival chained to a shipment and release links two shops',()=>{
 const state=fixture(),snapshot=JSON.stringify(state),result=read(state);
 assert.deepEqual(result,{selectedShopId:'bar',fromShopId:'town-liquor',fromNodeId:'town',toNodeId:'bar',eventId:'e4',sourceEventId:'e3',month:4,townReleaseId:1,mainReleaseId:21,proofEventIds:['e4','e3','e2','e1'],canDrawLink:true});
 assert.equal(JSON.stringify(state),snapshot);
});
test('rumor or direct delivery alone is never a displayed link',()=>{
 assert.equal(read(fixture([release,shipment,rumor])),null);
 assert.equal(read(fixture([release,shipment,{...arrival,id:'e4',sourceId:'e2',channel:'direct'}])),null);
});
test('arrival with missing source, future source, wrong release, or cycle is rejected',()=>{
 assert.equal(read(fixture([release,shipment,rumor,{...arrival,sourceId:'e99'}])),null);
 assert.equal(read(fixture([release,shipment,{...rumor,month:5},arrival])),null);
 assert.equal(read(fixture([release,shipment,{...rumor,releaseId:2},arrival])),null);
 assert.equal(read(fixture([release,shipment,{...rumor,sourceId:'e4'},arrival])),null);
});
test('a synthetic rumor with mismatched from/to is not enough to claim a real link',()=>{
 assert.equal(read(fixture([release,shipment,{...rumor,from:'super'},arrival])),null);
 assert.equal(read(fixture([release,shipment,{...rumor,to:'diner'},arrival])),null);
});
test('road propagation from a prior arrival is grounded by the prior hop',()=>{
 const hop={id:'e3',type:'arrival',month:3,releaseId:1,sourceId:'e2',from:'distillery',to:'town',channel:'direct'};
 assert.equal(read(fixture([release,shipment,hop,{...arrival,sourceId:'e3',channel:'road'}]))?.fromShopId,'town-liquor');
});
test('newest provable arrival wins and does not concatenate product releases',()=>{
 const second={id:'e5',type:'arrival',month:6,releaseId:1,sourceId:'e3',from:'town',to:'bar',channel:'chance'};
 const result=read(fixture([release,shipment,rumor,arrival,second]));
 assert.equal(result.eventId,'e5');assert.equal(result.month,6);
});
test('unknown and unsigned connections never produce a line',()=>{
 assert.equal(relationshipNodeForShop('town-liquor'),'town');
 assert.equal(relationshipNodeForShop('new-store'),null);
 assert.equal(shopRelationshipEvidence(fixture(),'new-store',{visibleShopIds:visible}),null);
 assert.equal(read(fixture(undefined,['bar'])),null);
 assert.equal(read(fixture(),{mapShopIds:['bar']})?.canDrawLink,false);
 assert.equal(read(fixture(),{visibleShopIds:['bar']}),null);
});
test('a declined and uncontracted target is not shown',()=>{
 const s=fixture();s.shop.relations.find(r=>r.shopId==='bar').status='declined';
 assert.equal(read(s),null);
});
test('matching names alone do not create a link to the same selected shop',()=>{
 const same={...arrival,from:'bar'};
 assert.equal(read(fixture([release,shipment,{...rumor,from:'bar'},same])),null);
});
test('broken or duplicated event IDs fail closed',()=>{
 assert.equal(read(fixture([release,shipment,rumor,{...arrival,id:'e3'}])),null);
 assert.equal(read(fixture([release,shipment,rumor,{...arrival,sourceId:'e3'},null])),null);
});
test('memoized projection respects immutable game replacement and visible geometry',()=>{
 const projection=createShopRelationshipProjection(),s=fixture();
 const a=projection.read(s,'bar',{visibleShopIds:visible,mapShopIds:visible});
 const b=projection.read(s,'bar',{visibleShopIds:[...visible].reverse(),mapShopIds:[...visible].reverse()});
 assert.strictEqual(a,b);
 assert.equal(projection.read(s,'bar',{visibleShopIds:visible,mapShopIds:['bar']})?.canDrawLink,false);
 assert.equal(projection.read({...s,labConnection:{version:1,town:{events:[]}}},'bar',{visibleShopIds:visible,mapShopIds:visible}),null);
 projection.reset();assert.deepEqual(projection.read(s,'bar',{visibleShopIds:visible,mapShopIds:visible}),a);
});
