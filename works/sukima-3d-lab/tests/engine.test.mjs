import test from 'node:test';
import assert from 'node:assert/strict';
import {createPolyhedron,pickMesh,packedMesh} from '../engine/geometry.js';
import {TouchBody} from '../engine/dynamics.js';
import {Camera} from '../engine/camera.js';
import {TouchInput} from '../engine/interaction.js';
import {add,sub,scale,norm,dot,cross,rotate,inverse} from '../engine/math.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
const maxOffset=b=>Math.max(...b.offsets.map(v=>Math.hypot(...v)));
const frontHit=m=>pickMesh(m,[0,0,5],[0,0,-1]);
test('20 welded outward faces; all face-centres picked correctly',()=>{
 const m=createPolyhedron();assert.equal(m.faces.length,20);assert.equal(m.vertices.length,32);assert.equal(m.triangles.length,60);
 const edges=new Map();
 m.faces.forEach((f,face)=>{
  const [a,b,c]=f.map(i=>m.rest[i]),p=scale(add(add(a,b),c),1/3),normal=norm(cross(sub(b,a),sub(c,a)));
  assert.ok(dot(normal,p)>0);const hit=pickMesh(m,add(p,scale(normal,3)),scale(normal,-1));assert.equal(hit.face,face);
  for(let i=0;i<3;i++){const key=[f[i],f[(i+1)%3]].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)||0)+1);}
 });assert.equal(edges.size,30);assert.ok([...edges.values()].every(n=>n===2));assert.equal(packedMesh(m).length,1620);
 assert.equal(pickMesh(m,[8,0,5],[0,0,-1]),null);
});
test('camera ray matches projected face positions in portrait and landscape at offset canvas',()=>{
 const m=createPolyhedron(),b=new TouchBody(m),c=new Camera();
 for(const [width,height] of [[390,844],[844,390],[1280,800]]){
  c.resize(width,height);const rect={left:37,top:29,width,height},t=Math.tan(c.fov/2);let visible=0;
  m.faces.forEach((f,face)=>{
   const p=scale(f.reduce((s,i)=>add(s,m.rest[i]),[0,0,0]),1/3),world=rotate(b.pose(),p),view=sub([0,0,c.distance],world);
   const n=rotate(b.pose(),norm(cross(sub(m.rest[f[1]],m.rest[f[0]]),sub(m.rest[f[2]],m.rest[f[0]]))));if(dot(n,view)<=0)return;
   const x=rect.left+width*(1+world[0]/(view[2]*t*c.aspect))/2,y=rect.top+height*(1-world[1]/(view[2]*t))/2;
   const ray=c.ray(x,y,rect,b.pose());assert.equal(pickMesh(m,ray.origin,ray.direction).face,face);visible++;
  });assert.ok(visible>=7);
 }
});
test('localized real vertex deformation restores with finite normals; picking follows deformation',()=>{
 const m=createPolyhedron(),b=new TouchBody(m),hit=frontHit(m);b.press(hit);
 for(let i=0;i<90;i++)b.step(1/120);
 assert.ok(maxOffset(b)>.10&&maxOffset(b)<.23);assert.ok(b.offsets.some(v=>Math.hypot(...v)<1e-7));
 assert.equal(frontHit(m).face,hit.face);assert.ok(packedMesh(m).every(Number.isFinite));
 b.release();for(let i=0;i<240;i++)b.step(1/120);assert.ok(maxOffset(b)<2e-6);
});
test('flick is finite, monotonically slows, settles across 30/60/120fps',()=>{
 const bodies=[];
 for(const fps of [30,60,120]){
  const b=new TouchBody(createPolyhedron());b.drag(70,-25,.08,390);let prev=Math.hypot(...b.velocity),wobble=0;
  for(let i=0;i<fps*9;i++){b.step(1/fps);const speed=Math.hypot(...b.velocity);assert.ok(speed<=prev+1e-12);prev=speed;wobble=Math.max(wobble,Math.hypot(...b.wobble));}
  close(Math.hypot(...b.orientation),1);assert.equal(Math.hypot(...b.velocity),0);assert.ok(wobble>1e-4&&wobble<.035);assert.ok(Math.hypot(...b.wobble)<.0001);bodies.push(b);
 }
 for(const b of bodies.slice(1))b.orientation.forEach((v,i)=>close(v,bodies[0].orientation[i],1e-7));
});
test('repeated press/drag/cancel and large suspended time remain bounded',()=>{
 const b=new TouchBody(createPolyhedron());
 for(let j=0;j<300;j++){b.press(frontHit(b.mesh));for(let i=0;i<5;i++)b.step(1/60);b.release();b.drag(20,-12,.015,390);b.step(10);b.cancel();assert.ok(packedMesh(b.mesh).every(Number.isFinite));assert.ok(maxOffset(b)<.2);}
 b.release();for(let i=0;i<180;i++)b.step(1/60);assert.ok(maxOffset(b)<2e-6);
});
class Canvas {
 constructor(){this.handlers={};this.capture=new Set();this.classList={add(){},remove(){}};}
 addEventListener(k,f){this.handlers[k]=f;}removeEventListener(k){delete this.handlers[k];}focus(){}getBoundingClientRect(){return {width:390,height:844};}
 setPointerCapture(id){this.capture.add(id);}hasPointerCapture(id){return this.capture.has(id);}releasePointerCapture(id){this.capture.delete(id);}
}
const event=(x,y,time,id=1)=>({clientX:x,clientY:y,timeStamp:time,pointerId:id,button:0,isPrimary:true,preventDefault(){}});
test('tap/drag threshold, single pointer, paused release and cancellation',()=>{
 const m=createPolyhedron(),b=new TouchBody(m),c=new Canvas(),i=new TouchInput(c,b,()=>frontHit(m));
 i.down(event(150,200,0));i.move(event(153,202,16));assert.equal(i.pointer.drag,false);assert.ok(b.pressure);
 i.down(event(180,230,18,2));assert.equal(i.pointer.id,1);i.up(event(153,202,50));assert.equal(b.pressure,null);assert.equal(Math.hypot(...b.velocity),0);
 i.down(event(150,200,60));i.move(event(190,202,76));assert.equal(i.pointer.drag,true);assert.equal(b.pressure,null);i.up(event(190,202,80));assert.ok(Math.hypot(...b.velocity)>1);
 i.down(event(150,200,90));i.move(event(190,202,110));i.up(event(190,202,250));assert.equal(Math.hypot(...b.velocity),0);
 i.down(event(150,200,300));i.move(event(200,250,320));i.cancel();assert.equal(i.pointer,null);assert.equal(b.held,false);assert.equal(Math.hypot(...b.velocity),0);assert.equal(c.capture.size,0);
 i.destroy();assert.equal(Object.keys(c.handlers).length,0);
});
test('polyhedron remains inside viewport in portrait, landscape and many rotations',()=>{
 const m=createPolyhedron(),b=new TouchBody(m),c=new Camera();
 for(const [w,h] of [[320,640],[390,844],[844,390],[1024,1366],[1366,1024]]){
  c.resize(w,h);const t=Math.tan(c.fov/2);
  for(let j=0;j<40;j++){b.drag(25,-12,.03,390);for(const v of m.vertices){const p=rotate(b.pose(),v),d=c.distance-p[2];assert.ok(Math.abs(p[0]/(d*t*c.aspect))<.94);assert.ok(Math.abs(p[1]/(d*t))<.94);}}
 }
});
test('unsupported WebGL2 fails predictably before GL resources are used',async()=>{
 const {Renderer}=await import('../engine/renderer.js');assert.throws(()=>new Renderer({getContext:()=>null}),/WEBGL2_UNAVAILABLE/);
});
test('animation loop has one RAF, caps suspended time and resets on resume',async()=>{
 const {AnimationLoop}=await import('../engine/loop.js');const frames=new Map(),updates=[];let next=0;
 const priorRaf=globalThis.requestAnimationFrame,priorCancel=globalThis.cancelAnimationFrame;
 globalThis.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 try{
  const loop=new AnimationLoop(dt=>updates.push(dt),()=>{}),run=time=>{const [id,fn]=frames.entries().next().value;frames.delete(id);fn(time);};
  loop.start();loop.start();assert.equal(frames.size,1);run(100);run(116);run(90000);assert.deepEqual(updates,[0,.016,.05]);assert.equal(frames.size,1);
  loop.stop();assert.equal(frames.size,0);loop.start();run(100000);assert.equal(updates.at(-1),0);loop.stop();
 }finally{globalThis.requestAnimationFrame=priorRaf;globalThis.cancelAnimationFrame=priorCancel;}
});

test('off-centre presses visibly bend every face without folding; rotation is unchanged',()=>{
 for(let face=0;face<20;face++){
  for(const position of [.15,.5,.85]){
   const m=createPolyhedron(),b=new TouchBody(m),f=m.faces[face],center=m.rest[m.deformation.faceCenters[face]];
   const point=add(scale(center,position),scale(m.rest[f[0]],1-position));
   const normal=norm(cross(sub(m.rest[f[1]],m.rest[f[0]]),sub(m.rest[f[2]],m.rest[f[0]])));
   const hit=pickMesh(m,add(point,scale(normal,3)),scale(normal,-1));assert.equal(hit.face,face);
   const orientation=b.orientation.slice();b.press(hit);
   for(let i=0;i<18;i++)b.step(1/120);
   assert.ok(Math.hypot(...b.offsets[m.deformation.faceCenters[face]])>.045,'prompt shallow response before progressive held press');
   for(let i=0;i<72;i++)b.step(1/120);
   assert.deepEqual(b.orientation,orientation);assert.ok(maxOffset(b)<.23);
   assert.ok(Math.hypot(...b.offsets[m.deformation.faceCenters[face]])>.12,'holding deepens the selected face');
   for(const tri of m.triangles){
    const [a,c,d]=tri.indices.map(i=>m.rest[i]),restNormal=norm(cross(sub(c,a),sub(d,a)));
    const [x,y,z]=tri.indices.map(i=>m.vertices[i]),bentNormal=norm(cross(sub(y,x),sub(z,x)));
    assert.ok(dot(restNormal,bentNormal)>.2,'no folded or degenerate faces');
   }
   b.release();for(let i=0;i<240;i++)b.step(1/120);assert.ok(maxOffset(b)<2e-6);
  }
 }
});
