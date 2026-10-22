import test from 'node:test';
import assert from 'node:assert/strict';
import {mapProgress,mapStep,drawGameMap} from '../world-map-view.mjs';
const make=(arrivals=[],shipments=[],deliveries=[],relations=[])=>({
 labConnection:{version:1,town:{arrivals,shipments}},shop:{deliveries,relations}
});
const arrived=(to,channel='road')=>({type:'arrival',to,channel});
test('new game, old saves and bottling without a sale stay at the distillery',()=>{
 assert.equal(mapProgress(null).max,1);assert.equal(mapProgress({shop:{}}).max,1);
 assert.equal(mapProgress(make()).max,1);assert.equal(mapProgress({...make(),releases:[{id:1,bottles:10}]}).max,1);
});
test('actual deliveries and retail sales open nearby, never rumor as a sale',()=>{
 assert.equal(mapProgress(make([],[{count:2,id:'retail:10:1'}])).max,2);
 assert.equal(mapProgress(make([],[],[{count:2}])).max,2);
 assert.equal(mapProgress(make([arrived('near-local')])).max,4);
 assert.equal(mapProgress(make([arrived('diner')])).max,3);
});
test('arrivals only unlock levels actually reached; jumps unlock skipped views',()=>{
 assert.equal(mapProgress(make([arrived('overseas-craft')])).max,6);
 assert.equal(mapProgress(make([arrived('national-food')])).max,5);
 assert.equal(mapProgress(make([arrived('near-wide')])).max,4);
 assert.equal(mapProgress(make([arrived('town','direct')])).max,1);
 assert.equal(mapProgress(make([arrived('online')])).max,1);
 assert.equal(mapProgress(make([{type:'rumor',to:'overseas-food'}])).max,1);
});
test('zoom is clamped to visible area, plus outward and minus inward',()=>{
 assert.equal(mapStep(1,'out',1),1);assert.equal(mapStep(1,'out',6),2);
 assert.equal(mapStep(6,'out',6),6);assert.equal(mapStep(6,'in',6),5);
 assert.equal(mapStep(3,'out',2),2);assert.equal(mapStep(1,'in',5),1);
});
test('display is a read-only projection of state and uses the Lab renderer',()=>{
 const game=make([arrived('overseas-craft')],[{count:3}],[],[{shopId:'supermarket'}]);
 const before=JSON.stringify(game);let draws=0;
 const canvas={getContext(){return {fillStyle:'',imageSmoothingEnabled:true,fillRect(x,y,w,h){draws++;assert.ok([x,y,w,h].every(Number.isInteger));}}}};
 assert.equal(drawGameMap(canvas,game,3),3);assert.ok(draws>25);
 assert.equal(drawGameMap(canvas,game,6),6);
 assert.equal(JSON.stringify(game),before);
});
