import test from 'node:test';
import assert from 'node:assert/strict';
import {RuntimeClock} from '../runtime-clock.mjs';
test('processing time is part of the interval at both rates',()=>{
 for(const rate of [1,2]){const c=new RuntimeClock();let wall=0;for(let i=0;i<60;i++){wall+=c.delay(wall,rate);if(i<59)wall+=20;}assert.equal(wall,6000/rate);}
});
test('long gaps discard debt and preserve one step per task',()=>{
 for(const manual of [false,true]){const c=new RuntimeClock();assert.equal(c.delay(0,1,manual),100);assert.equal(c.delay(2000,1,manual),100);assert.equal(c.delay(2100,1,manual),100);}
 const c=new RuntimeClock();c.delay(0);assert.equal(c.delay(250,1,true),100);
 const edge=new RuntimeClock();edge.delay(0);assert.equal(edge.delay(200,1,true),100);
});
test('pause and rate changes start a fresh wall anchor',()=>{
 const c=new RuntimeClock();c.delay(0);c.reset();assert.equal(c.delay(5000,2),50);c.reset();assert.equal(c.delay(6000,1),100);
});
test('automatic catchup debt is bounded without batching steps',()=>{
 const c=new RuntimeClock();c.delay(0,2);assert.equal(c.delay(175,2),0);assert.equal(c.delay(180,2),0);assert.equal(c.delay(185,2),15);assert.equal(c.delay(1000,2),50);
});
