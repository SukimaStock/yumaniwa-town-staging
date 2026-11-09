import test from 'node:test';
import assert from 'node:assert/strict';
import {mapSquare,mapPanBounds} from '../m0-observation.mjs';
import {mapObservationBounds} from '../world-map-view.mjs';
import {SHOPS} from '../shop-model.mjs';

test('M0 keeps a square local map at every viewport aspect',()=>{
 for(const [w,h] of [[360,568],[390,680],[430,740],[900,740],[324,156]]){
  const q=mapSquare(w,h);
  assert.equal(q.side,Math.min(w,h));
  assert.equal(q.left*2+q.side,w);
  assert.equal(q.top*2+q.side,h);
 }
});

test('M0 pan is bounded and does not move the map at native zoom',()=>{
 assert.deepEqual(mapPanBounds(330,210,1),{x:0,y:0});
 assert.deepEqual(mapPanBounds(330,210,2),{x:45,y:105});
 assert.deepEqual(mapPanBounds(210,330,2),{x:105,y:45});
});

test('M0 local hit bounds follow the authored stage-2/3 buildings',()=>{
 const near=mapObservationBounds(2),town=mapObservationBounds(3);
 assert.deepEqual(near.retail,[26,72,24,24]);
 assert.deepEqual(near['town-liquor'],[90,34,24,24]);
 assert.deepEqual(near.supermarket,[102,94,24,24]);
 assert.deepEqual(town.retail,[46,62,16,16]);
 assert.deepEqual(town['town-liquor'],[86,44,16,16]);
 assert.deepEqual(town.supermarket,[98,92,16,16]);
 for(const stage of [1,2,3])for(const rect of Object.values(mapObservationBounds(stage))){
  const [x,y,w,h]=rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=144&&y+h<=144);
 }
});

test('M0 names use canonical shops; department remains a special handling path',()=>{
 assert.equal(SHOPS.find(s=>s.id==='supermarket').name,'町のスーパー');
 assert.equal(SHOPS.find(s=>s.id==='bar').name,'路地裏のバー');
 assert.ok(!Object.hasOwn(mapObservationBounds(3),'department'));
});