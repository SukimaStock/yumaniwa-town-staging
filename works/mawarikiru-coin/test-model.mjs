import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCoin,flick,step,pose} from './model.mjs';
test('slow and fast flicks, final contact, restart',()=>{
 const c=createCoin();assert.equal(pose(c).active,false);assert.equal(flick(c,2,40),false);
 flick(c,30,300);const slow=c.duration;flick(c,65,50);assert.ok(c.duration>slow);
 const first=pose(c);step(c,c.duration*.8);assert.ok(pose(c).tilt<first.tilt);assert.ok(pose(c).tilt>0);
 step(c,1000);assert.deepEqual([pose(c).active,pose(c).tilt],[false,0]);
 assert.ok(flick(c,15,150,-1));assert.equal(c.direction,-1);assert.ok(pose(c).active);
});
test('bounded pose, terminal wobble, deterministic frame rates and long time',()=>{
 for(const hz of [30,60,120]){const c=createCoin();flick(c,40,100);let lastTilt=2,rises=0;
 for(let i=0;i<hz*20;i++){const p=step(c,1/hz);assert.ok(Object.values(p).every(v=>typeof v==='boolean'||Number.isFinite(v)));assert.ok(p.tilt>=0&&p.tilt<1.6);if(p.progress>.7&&p.tilt>lastTilt)rises++;lastTilt=p.tilt;}
 assert.ok(rises>0);assert.equal(pose(c).tilt,0);step(c,86400);assert.equal(pose(c).active,false);}
});
test('repeat flick never accumulates energy; invalid timing is ignored',()=>{const c=createCoin();for(let i=0;i<1000;i++){flick(c,100,1);step(c,.01);assert.ok(c.duration<=9);}step(c,NaN);assert.ok(Number.isFinite(c.elapsed));assert.equal(flick(c,NaN,3),false);});
test('settling preserves orientation without snapping to initial marking',()=>{const c=createCoin();flick(c,40,100);step(c,c.duration-1e-6);const before=pose(c);step(c,1);const after=pose(c);assert.ok(Math.abs(after.spin-before.spin)<1e-4);assert.ok(Math.abs(after.yaw-before.yaw)<1e-4);});
