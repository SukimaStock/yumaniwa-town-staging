'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('./dynamics.js'),J=require('./journey.js');
function arrival(n,fps=60,lag=180){
  const s=J.create(D.create());
  s.seeds.forEach((p,i)=>{
    if(i>=n){p.lost=p.inactive=true;return;}
    const x=1812+196*(i+.5)/n,f=s.geometry.floor(x);
    Object.assign(p,{x,y:f.y-J.support(p,f.nx,f.ny)/-f.ny-.1,vx:0,vy:0,spin:0});
  });
  s.camera={x:1910-lag,y:400,z:J.ZOOM};
  for(let i=0;i<fps&&!s.result;i++)J.update(s,1/fps);
  assert.ok(s.result);return s;
}
function advance(s,t,fps=60){for(let i=0;i<Math.round(t*fps);i++)J.update(s,1/fps);}
test('moving arrival keeps a small forward tail, settles and preserves the result frame',()=>{
  for(const n of [1,5,9])for(const fps of [30,60,120]){
    const s=arrival(n,fps),from={...s.ending.from},frame=J.endingFrame(s);
    const roots=s.seeds.map(p=>[p.x,p.y,p.vx,p.vy,p.arrival]);
    assert.ok(s.ending.arrivalVx>0,'real camera lag supplied forward motion');
    let previous=s.camera.x,firstStep=0;
    while(s.ending.elapsed<.75){
      J.update(s,1/fps);
      if(!firstStep)firstStep=s.camera.x-previous;
      assert.ok(s.camera.x>=previous-1e-9,'deceleration does not bounce backwards');
      assert.ok((s.camera.x-from.x)*from.z<=4.5+1e-9,'small screen-space bound');
      assert.equal(s.camera.y,from.y);assert.equal(s.camera.z,from.z);
      previous=s.camera.x;
    }
    assert.ok(firstStep>0,'arrival does not immediately freeze');
    const settled=s.camera.x;advance(s,.3,fps);
    assert.ok(Math.abs(s.camera.x-settled)<1e-9,'tail rests before the existing shot');
    advance(s,8,fps);assert.deepEqual(s.camera,frame);
    assert.deepEqual(s.seeds.map(p=>[p.x,p.y,p.vx,p.vy,p.arrival]),roots,'no landing/seed mutation');
  }
});
test('stationary and backward camera arrivals add no forward motion; empty result has no tail',()=>{
  for(const lag of [0,-25]){
    const s=arrival(9,60,lag),from={...s.ending.from};
    assert.equal(s.ending.arrivalVx,0);advance(s,1);assert.deepEqual(s.camera,from);
  }
  const s=arrival(0);assert.equal(s.ending.arrivalVx,0);
  const from={...s.camera};advance(s,1);assert.deepEqual(s.camera,from);
});
test('identical incoming views and speed yield the same tail at 30/60/120fps',()=>{
  const runs=[30,60,120].map(fps=>{
    const s=arrival(9,fps);
    s.ending.elapsed=0;s.ending.from={x:1890,y:400,z:1.85};s.ending.arrivalVx=8;
    s.camera={...s.ending.from};const samples=[];
    for(let i=1;i<=fps*7;i++){
      J.update(s,1/fps);
      if(i%(fps/30)===0)samples.push({...s.camera});
    }
    return samples;
  });
  for(const run of runs.slice(1))for(let i=0;i<run.length;i++)for(const k of ['x','y','z'])
    assert.ok(Math.abs(run[i][k]-runs[0][i][k])<1e-7);
});
test('the tail still returns through the original hero and title geometry',()=>{
  for(const n of [1,5,9]){
    const s=arrival(n),hero=s.ending.focus;s.titleCycle=true;advance(s,14);
    assert.ok(s.ending.titleReady);assert.equal(s.ending.focus,hero);
    const p=J.plantPose(s,hero),q=J.screenPoint(s,p.x,p.y);
    assert.ok(Math.abs(q.x-195)<1e-8&&Math.abs(q.y-365)<1e-8);
    assert.ok(Math.abs(s.camera.z*20*p.size-143)<1e-8);
  }
});
