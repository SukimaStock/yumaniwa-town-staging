import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFloat, grab, drag, release, step, LIMIT} from './model.mjs';
function excursion(depth, hz=60) {
  const s=createFloat(); grab(s); drag(s,depth); release(s);
  let min=0, crossings=0, last=s.y;
  for(let i=0;i<hz*15;i++) {step(s,1/hz); min=Math.min(min,s.y); if(last*s.y<0)crossings++; last=s.y; assert.ok(Number.isFinite(s.y)&&Math.abs(s.y)<=depth);}
  assert.equal(s.y,0); assert.equal(s.v,0); assert.ok(crossings>=3); return min;
}
test('deeper release rises higher, crosses water and settles at 20–120Hz',()=>{
  for(const hz of [20,30,60,120]) {const shallow=excursion(30,hz),deep=excursion(180,hz);assert.ok(deep<shallow*4);assert.ok(deep>-100);}
});
test('grab and release preserve position; clamps depth; held state stays still',()=>{
  const s=createFloat();grab(s);drag(s,9999);assert.equal(s.y,LIMIT);step(s,1);assert.equal(s.y,LIMIT);release(s);step(s,.05);
  const y=s.y;grab(s);assert.equal(s.y,y);release(s);assert.equal(s.y,y);assert.equal(s.v,0);
});
test('1000 regrabs and long frame gaps stay bounded; six simulated hours rest',()=>{
  const s=createFloat();
  for(let i=0;i<1000;i++){grab(s);drag(s,Math.sin(i)*250);release(s);for(let j=0;j<15;j++)step(s,j%2?1/60:20);assert.ok(Number.isFinite(s.y)&&Math.abs(s.y)<=180);}
  for(let i=0;i<6*3600*20;i++)step(s,.05);
  assert.equal(s.y,0);assert.equal(s.v,0);
});
