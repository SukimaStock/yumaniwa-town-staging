import test from 'node:test';import assert from 'node:assert/strict';
import {retailSalePlan,retailSaleGroups,ordinarySaleGroups} from '../retail-sale-motion.mjs';
const pose=f=>f.transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/).slice(1).map(Number);
test('rail jumps vertically before half-size horizontal travel and arrives before fading',()=>{
 const from={x:273,y:240},to={x:60,y:216},railY=198;
 const {frames,duration}=retailSalePlan(1,{from,to,railY})[0],poses=frames.map(pose);
 assert.equal(duration,210);assert.equal(frames.length,9);
 assert.deepEqual(poses.slice(0,3),[[0,0,1],[0,-42,.75],[0,-42,.5]]);
 for(let i=3;i<=6;i++){
  assert.equal(poses[i][1],railY-from.y);assert.equal(poses[i][2],.5);
  assert(poses[i][0]<=poses[i-1][0]);assert(poses[i][0]>=to.x-from.x);
 }
 assert.deepEqual(poses[6],[-213,-42,.5]);assert.deepEqual(poses[7],[-213,-24,.5]);assert.deepEqual(poses[8],poses[7]);
 assert(frames.slice(0,-1).every(f=>f.opacity===1));assert.equal(frames.at(-1).opacity,0);
 assert(frames.every(f=>f.easing==='steps(1,end)'));
});
test('multiline origins use only source, safe rail and target rows, never intermediate text rows',()=>{
 for(const fromY of [240,288,336]){
  const from={x:273,y:fromY},to={x:60,y:216},railY=198,frames=retailSalePlan(1,{from,to,railY})[0].frames;
  const allowed=new Set([fromY,railY,to.y]);
  assert(frames.every(f=>allowed.has(fromY+pose(f)[1])));
  for(let i=1;i<frames.length;i++)if(pose(frames[i])[0]!==pose(frames[i-1])[0])assert.equal(pose(frames[i])[2],.5);
 }
});
test('rail is deterministic, grid snapped and bounded between measured endpoints and rail',()=>{
 for(const grid of [3,6])for(const from of [{x:273.2,y:240.4},{x:54.2,y:280.1}]){
  const to={x:66.1,y:219.3},railY=198.2,options={from,to,grid,railY},bytes=JSON.stringify(options),plans=retailSalePlan(17,options);
  assert.deepEqual(plans,retailSalePlan(17,options));assert.equal(JSON.stringify(options),bytes);
  assert.equal(plans.length,4);assert.equal(plans.reduce((n,p)=>n+p.units,0),17);assert.equal(plans.at(-1).delay+plans.at(-1).duration,600);
  for(const plan of plans)for(const frame of plan.frames){
   const [x,y]=pose(frame);assert.equal(x/grid,Math.round(x/grid));assert.equal(y/grid,Math.round(y/grid));
   assert(x>=Math.min(0,to.x-from.x)-grid/2&&x<=Math.max(0,to.x-from.x)+grid/2);
   assert(y>=Math.min(0,to.y-from.y,railY-from.y)-grid/2&&y<=Math.max(0,to.y-from.y,railY-from.y)+grid/2);
  }
 }
});
test('optional rail preserves default linear plan and all grouping semantics',()=>{
 const options={from:{x:273,y:240},to:{x:60,y:216}},defaultPlan=retailSalePlan(3,options);
 assert.deepEqual(defaultPlan,retailSalePlan(3,{...options,railY:undefined}));
 assert.notDeepEqual(defaultPlan[0].frames,retailSalePlan(3,{...options,railY:198})[0].frames);
 for(const railY of [NaN,Infinity,'198',null])assert.deepEqual(retailSalePlan(1,{...options,railY}),[]);
 const sales=[{productId:'one',shopId:'a',units:3},{productId:'two',shopId:'b',units:2}],bytes=JSON.stringify(sales);
 assert.deepEqual(retailSaleGroups(sales),retailSaleGroups(sales));assert.deepEqual(ordinarySaleGroups(sales),ordinarySaleGroups(sales));assert.equal(JSON.stringify(sales),bytes);
});
