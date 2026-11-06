import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutScene,hitTest,caskSlotIndex} from '../canvas-layout.mjs';
const positions=casks=>layoutScene({room:'warehouse',casks}).controls.filter(c=>c.key.startsWith('cask-'));
test('removing slot 2 preserves slots 1, 3, 4 and their internal-ID hit targets',()=>{
 const all=[{id:37,slot:1},{id:42,slot:2},{id:50,slot:3},{id:56,slot:4}];
 const before=positions(all),after=positions(all.filter(c=>c.id!==42));
 assert.deepEqual(after,before.filter(c=>c.key!=='cask-42'));
 const empty=before[1];assert.equal(hitTest(after,empty.x+20,empty.y+20),null);
 const replacement=positions([...all.filter(c=>c.id!==42),{id:62,slot:2}]);
 const newPlace=replacement.find(c=>c.key==='cask-62');assert.equal(newPlace.x,empty.x);assert.equal(newPlace.y,empty.y);
 assert.equal(hitTest(replacement,newPlace.x+20,newPlace.y+20).selector,'#cask-rack [data-cask-id="62"]');
});
test('fixed placement is independent of live list order and survives serialization',()=>{
 const casks=[{id:19,slot:4},{id:7,slot:1},{id:12,slot:3}];
 assert.deepEqual(positions(JSON.parse(JSON.stringify(casks))),positions(casks));
 const slots=layoutScene().caskSlots;
 for(const [i,c] of casks.entries()){const target=positions(casks)[i];assert.equal(target.x,slots[c.slot-1].x);assert.equal(target.y,slots[c.slot-1].y);}
});
test('legacy views and sales preserve array-order geometry',()=>{
 assert.equal(caskSlotIndex({id:42},2),2);
 assert.deepEqual(positions([{id:2},{id:8}]),positions([{id:2,slot:1},{id:8,slot:2}]));
 const products=[{id:9,slot:4},{id:12,slot:1}],layout=layoutScene({room:'sales',products});
 const targets=layout.controls.filter(c=>c.key.startsWith('product-'));
 assert.equal(targets[0].x,layout.productSlots[0].x);assert.equal(targets[1].x,layout.productSlots[1].x);
});
