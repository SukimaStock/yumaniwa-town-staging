'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('./dynamics.js'),J=require('./journey.js');
function place(s,p,x){const f=s.geometry.floor(x);Object.assign(p,{x,y:f.y-J.support(p,f.nx,f.ny)/-f.ny-.1,vx:0,vy:0,spin:0});}
function fixture(n,rear=810){
  const s=J.create(D.create());
  s.seeds.forEach((p,i)=>{if(i<n)place(s,p,J.END.left+30+(J.END.right-J.END.left-60)*(i+.5)/n);else if(i===n)place(s,p,rear);else p.lost=p.inactive=true;});
  s.camera={x:rear,y:s.geometry.floor(rear).y-80,z:J.ZOOM};return s;
}
function advance(s,t,fps=60){for(let i=0;i<t*fps;i++)J.update(s,1/fps);}
for(const n of [1,3,8])for(const fps of [30,60,120])test(`${n} early arrivals, remote trailer loss at ${fps}fps: return before visible growth`,()=>{
  const s=fixture(n);advance(s,2,fps);assert.equal(s.result,null);assert.equal(s.arrivals.length,n);
  const late=s.seeds[n];late.y=s.geometry.bounds.lostY+20;late.vy=100;
  J.update(s,1/fps);assert.equal(s.result.arrivals.length,n);assert.ok(s.ending.returning);
  const r=s.ending.returning,from={...s.camera};assert.equal(s.ending.elapsed,0);assert.equal(s.replayReady,false);
  let elapsed=0,old={...s.camera},maxPanSpeed=0,maxPanAccel=0,oldPanSpeed=0;
  while(s.ending.returning){
    J.update(s,1/fps);elapsed+=1/fps;
    assert.equal(s.ending.elapsed,0);assert.ok(J.plants(s).every(p=>p.age<0));assert.equal(J.returnZoom(s),0);
    if(r.elapsed>.9&&r.elapsed<.9+r.travelDuration){
      const speed=Math.hypot(s.camera.x-old.x,s.camera.y-old.y)*r.overview*fps;
      maxPanSpeed=Math.max(speed,maxPanSpeed);maxPanAccel=Math.max(maxPanAccel,Math.abs(speed-oldPanSpeed)*fps);oldPanSpeed=speed;
    }
    old={...s.camera};assert.ok(elapsed<18);
  }
  assert.ok(maxPanSpeed<=800.001);assert.ok(maxPanAccel<400,'bounded projected acceleration');
  assert.ok(Math.abs(s.camera.x-from.x)>1000);assert.ok(elapsed<=r.duration+1/fps);
  const final=J.endingFrame(s);assert.ok(Math.abs(final.x-s.camera.x)<30,'one-fruit frame no longer points back to the trailer');
  while(s.ending.elapsed<J.endingTiming(s).growthEnd){
    J.update(s,1/fps);
    for(const {arrival,age} of J.plants(s))if(age>=0){
      const p=J.plantPose(s,arrival),q=J.screenPoint(s,p.x,p.y),radius=22*p.size*s.camera.z;
      assert.ok(q.x-radius>0&&q.x+radius<390&&q.y-32*p.size*s.camera.z>30&&q.y+24*s.camera.z<710,'entire growth visible');
    }
  }
  assert.equal(s.result.arrivals.length,n);assert.equal(s.result.lost,9-n);
});
test('a stopped living trailer never starts the return or gets discarded; late arrival counts',()=>{
 const s=fixture(3);advance(s,30);assert.equal(s.result,null);assert.equal(s.ending,null);assert.equal(J.plants(s).length,0);
 const p=s.seeds[3];assert.equal(p.lost,false);assert.ok(Math.abs(s.camera.x-p.x)<100);
 place(s,p,J.END.left+190);advance(s,1);assert.equal(s.result.arrivals.length,4);assert.ok(s.result.arrivals.some(a=>a.seed===p));
});
test('nearby offscreen return is a short gentle glide, while visible normal arrival has none',()=>{
 const s=fixture(1,J.END.left-120);advance(s,1);s.seeds[1].y=s.geometry.bounds.lostY+10;J.update(s,1/60);
 assert.ok(s.ending.returning);const r=s.ending.returning;assert.equal(r.wide,false);assert.equal(r.duration,2.4);
 advance(s,3);assert.equal(s.ending.returning,null);assert.ok(s.ending.elapsed<.9);
 const normal=fixture(8,J.END.left+150);normal.camera={x:J.END.left+150,y:J.floor(J.END.left+150).y-80,z:J.ZOOM};advance(normal,1);
 assert.ok(normal.result);assert.equal(normal.ending.returning,undefined);
});
test('return is presentation-only: zero active time cannot advance it, new runs discard it',()=>{
 const s=fixture(1);advance(s,2);s.seeds[1].y=s.geometry.bounds.lostY+10;J.update(s,1/60);
 const camera={...s.camera},elapsed=s.ending.returning.elapsed,seed=s.seeds[0],position={x:seed.x,y:seed.y};
 for(let i=0;i<100;i++)J.update(s,0);
 assert.deepEqual(s.camera,camera);assert.equal(s.ending.returning.elapsed,elapsed);assert.equal(s.ending.elapsed,0);
 advance(s,2);assert.equal(s.seeds[1].inactive,true,'lost fall still finishes during camera return');
 assert.deepEqual({x:seed.x,y:seed.y},position,'camera never teleports arrived grains');
 const fresh=J.create(D.create());assert.equal(fresh.ending,null);assert.equal(fresh.result,null);
});
