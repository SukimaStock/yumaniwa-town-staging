'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('./dynamics.js'),J=require('./journey.js');
function arrival(n,fps=60,lag=80,moving=true){
 const s=J.create(D.create()),end=s.geometry.END;
 s.seeds.forEach((p,i)=>{
  if(i>=n){p.lost=p.inactive=true;return;}
  const x=end.left+30+(end.right-end.left-70)*(i+.5)/n,f=s.geometry.floor(x);
  Object.assign(p,{x,y:f.y-J.support(p,f.nx,f.ny)/-f.ny-.1,vx:moving?24:0,vy:0,spin:0});
 });
 // The accepted owner import uses private camera motion history and a .45s
 // returning tail, rather than the superseded public ending.arrivalVx field.
 s.camera={x:(end.left+end.right)/2-lag,y:400,z:J.ZOOM};
 let vx=0,vy=0,travelled=false;
 for(let i=0;i<fps*3&&!s.result;i++){
  const before={...s.camera};travelled=travelled||s.seeds.some(p=>!p.lost&&!p.arrival&&Math.abs(p.vx)>18);
  J.update(s,1/fps);
  if(!s.result){vx=(s.camera.x-before.x)*fps;vy=(s.camera.y-before.y)*fps;}
 }
 assert.ok(s.result,'fixture physically reaches current nursery');assert.equal(s.ending.returning,undefined,'result is in view');
 const z=Math.max(.1,s.ending.from.z),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 return {s,vx:travelled?clamp(vx,-60/z,60/z):0,vy:travelled?clamp(vy,-18/z,18/z):0};
}
function advance(s,t,fps=60){for(let i=0;i<Math.round(t*fps);i++)J.update(s,1/fps);}
test('moving nursery arrivals preserve the accepted bounded incoming tail and settle to the shot anchor',()=>{
 for(const n of [1,5,9])for(const fps of [30,60,120]){
  const {s,vx,vy}=arrival(n,fps),from={...s.ending.from},frame=J.endingFrame(s),roots=s.seeds.map(p=>[p.x,p.y,p.vx,p.vy,p.arrival]);
  assert.ok(Math.abs(vx)>0,'real incoming movement sampled');
  while(s.ending.elapsed<.6){
   J.update(s,1/fps);const t=s.ending.elapsed,carry=t<.45?t*(1-t/.45)**3:0;
   assert.ok(Math.abs(s.camera.x-from.x-vx*carry)<1e-8);assert.ok(Math.abs(s.camera.y-from.y-vy*carry)<1e-8);assert.equal(s.camera.z,from.z);
   assert.ok(Math.abs((s.camera.x-from.x)*from.z)<3,'bounded horizontal screen travel');
  }
  assert.deepEqual(s.camera,from,'tail returns to the existing anchor before leaf growth');advance(s,8,fps);assert.deepEqual(s.camera,frame);
  assert.deepEqual(s.seeds.map(p=>[p.x,p.y,p.vx,p.vy,p.arrival]),roots,'tail never moves the rooted grains');
 }
});
test('stationary and empty arrivals add no movement regardless of camera lag',()=>{
 for(const n of [0,9])for(const lag of [0,80,-25]){
  const {s}=arrival(n,60,lag,false),from={...s.ending.from};advance(s,.6);assert.deepEqual(s.camera,from);
 }
});
test('preview rewind discards historical incoming motion without mutating the result',()=>{
 for(const fps of [30,60,120]){
  const {s}=arrival(9,fps),from={...s.ending.from},result=s.result;
  advance(s,.2,fps);assert.notEqual(s.camera.x,from.x);s.ending.elapsed=0;J.update(s,0);assert.deepEqual(s.camera,from);
  advance(s,.3,fps);assert.deepEqual(s.camera,from);assert.equal(s.result,result);
 }
});
test('the existing camera still returns through the original hero and title geometry',()=>{
 for(const n of [1,5,9]){
  const {s}=arrival(n),hero=s.ending.focus;s.titleCycle=true;advance(s,14);
  assert.ok(s.ending.titleReady);assert.equal(s.ending.focus,hero);const p=J.plantPose(s,hero),q=J.screenPoint(s,p.x,p.y);
  assert.ok(Math.abs(q.x-195)<1e-8&&Math.abs(q.y-365)<1e-8);assert.ok(Math.abs(s.camera.z*20*p.size-143)<1e-8);
 }
});
