import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchBody} from '../engine/dynamics.js';
import {FEEL_PROFILES} from '../engine/response.js';
import {createPolyhedron,pickMesh,packedMesh} from '../engine/geometry.js';
import {TouchInput} from '../engine/interaction.js';
import {add,sub,scale,norm,dot,cross} from '../engine/math.js';
const maxOffset=b=>Math.max(...b.offsets.map(v=>Math.hypot(...v)));
function hitFace(mesh,face=0){
 const indices=mesh.faces[face],point=scale(indices.reduce((s,i)=>add(s,mesh.rest[i]),[0,0,0]),1/indices.length);
 const n=norm(cross(sub(mesh.rest[indices[1]],mesh.rest[indices[0]]),sub(mesh.rest[indices[2]],mesh.rest[indices[0]])));
 return pickMesh(mesh,add(point,scale(n,3)),scale(n,-1));
}
function bodyFor(name){const b=new TouchBody(createPolyhedron());b.setFeel(name);return b;}
function run(b,seconds,step=1/120){for(let t=0;t<seconds-1e-8;t+=step)b.step(Math.min(step,seconds-t));}
function trace(name,hold=0,fps=120){
 const b=bodyFor(name),hit=hitFace(b.mesh);b.press(hit);run(b,hold,1/fps);const n=b.pressure.normal,center=b.mesh.deformation.faceCenters[hit.face];b.release(hold);
 let inward=Math.max(0,-dot(b.offsets[center],n)),outward=0,lastActive=0;
 for(let i=0;i<fps*2;i++){b.step(1/fps);const depth=-dot(b.offsets[center],n);inward=Math.max(inward,depth);outward=Math.max(outward,-depth);if(maxOffset(b)>.002)lastActive=(i+1)/fps;}
 return {inward,outward,lastActive,body:b};
}
for(const name of Object.keys(FEEL_PROFILES)){
 test(`${name}: down/up before RAF leaves a visible small impulse, rebounds and settles`,()=>{
  const b=bodyFor(name),hit=hitFace(b.mesh);const rest=b.mesh.vertices.map(v=>v.slice());b.press(hit);b.release(0);
  assert.deepEqual(b.mesh.vertices,rest,'no instantaneous position jump');let peak=0,changedNormals=0;
  for(let i=0;i<24;i++){b.step(1/120);peak=Math.max(peak,maxOffset(b));const packed=packedMesh(b.mesh);assert.ok(packed.every(Number.isFinite));changedNormals=Math.max(changedNormals,Math.hypot(packed[3],packed[4],packed[5]));}
  assert.ok(peak>.035&&peak<.14,`short impulse peak ${peak}`);assert.ok(changedNormals>.9);
  run(b,1.8);assert.ok(maxOffset(b)<2e-6);
  const result=trace(name);assert.ok(result.outward>.0001&&result.outward<.04);assert.ok(result.lastActive<1.25);
 });
 test(`${name}: held depth grows, reaches a stable state, spreads and releases without snapping`,()=>{
  const b=bodyFor(name),hit=hitFace(b.mesh),center=b.mesh.deformation.faceCenters[hit.face];b.press(hit);run(b,.08);const shallow=Math.hypot(...b.offsets[center]);
  run(b,.92);const deep=Math.hypot(...b.offsets[center]);assert.ok(deep>shallow*1.4);assert.ok(deep>FEEL_PROFILES[name].depth*.9);
  const neighbours=b.mesh.deformation.faceCenters.filter(i=>i!==center&&Math.hypot(...sub(b.mesh.rest[i],b.mesh.rest[center]))<.95);
  assert.ok(neighbours.some(i=>Math.hypot(...b.offsets[i])>.001));run(b,2);const steady=b.offsets[center].slice();run(b,1);assert.ok(Math.hypot(...sub(steady,b.offsets[center]))<.0001);
  const before=b.mesh.vertices.map(v=>v.slice());b.release(4);assert.deepEqual(b.mesh.vertices,before);run(b,2);assert.ok(maxOffset(b)<2e-6);
 });
 test(`${name}: 1000 rapid taps do not accumulate or flip faces`,()=>{
  const b=bodyFor(name);
  for(let i=0;i<1000;i++){
   b.press(hitFace(b.mesh,i%2?0:5));b.release(.008);b.step(1/120);
   assert.ok(maxOffset(b)<=.2800001);assert.ok(packedMesh(b.mesh).every(Number.isFinite));
   if(i%10===0)for(const tri of b.mesh.triangles){
    const [a,c,d]=tri.indices.map(index=>b.mesh.rest[index]),n=norm(cross(sub(c,a),sub(d,a)));
    const [x,y,z]=tri.indices.map(index=>b.mesh.vertices[index]);assert.ok(dot(n,norm(cross(sub(y,x),sub(z,x))))>.15);
   }
  }
  run(b,2);assert.ok(maxOffset(b)<3e-6);
 });
 test(`${name}: short and held release traces are stable at 30/60/120fps`,()=>{
  for(const duration of [0,.05,.8]){
   const traces=[30,60,120].map(fps=>trace(name,duration,fps));
   for(const t of traces)assert.ok(maxOffset(t.body)<3e-6);
   assert.ok(Math.abs(traces[0].inward-traces[2].inward)<.014);
   assert.ok(Math.abs(traces[0].outward-traces[2].outward)<.012);
  }
 });
}
test('materials differ meaningfully; BOUNCY rebound exceeds HARD, SOFT holds deeper',()=>{
 const hard=trace('HARD',.8),soft=trace('SOFT',.8),bouncy=trace('BOUNCY',.8);
 assert.ok(bouncy.outward>hard.outward*3);assert.ok(soft.inward>hard.inward*1.15);assert.ok(hard.lastActive<soft.lastActive);
});
test('permuted vertex ordering produces the same response using shape metadata',()=>{
 const mesh=createPolyhedron(),count=mesh.rest.length,map=i=>(i*7+3)%count,remap=array=>{const result=[];array.forEach((v,i)=>result[map(i)]=Array.isArray(v)?v.slice():v);return result;};
 const permuted={rest:remap(mesh.rest),vertices:remap(mesh.vertices),faces:mesh.faces.map(f=>f.map(map)),triangles:mesh.triangles.map(t=>({face:t.face,indices:t.indices.map(map)})),deformation:{compliance:remap(mesh.deformation.compliance),faceCenters:mesh.deformation.faceCenters.map(map)}};
 const a=new TouchBody(mesh),b=new TouchBody(permuted);a.press(hitFace(mesh));b.press(hitFace(permuted));run(a,.35);run(b,.35);
 a.offsets.forEach((v,i)=>v.forEach((x,k)=>assert.ok(Math.abs(x-b.offsets[map(i)][k])<1e-9)));
});
test('a small translated tetrahedral mesh uses the same response without icosahedron indices',()=>{
 const corners=[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(v=>add(scale(v,.6),[2,.5,-1])),faces=[[0,1,2],[0,3,1],[0,2,3],[1,3,2]],rest=corners.map(v=>v.slice()),triangles=[],faceCenters=[];
 for(const [face,f] of faces.entries()){
  const p=scale(f.reduce((s,i)=>add(s,rest[i]),[0,0,0]),1/3);
  if(dot(cross(sub(rest[f[1]],rest[f[0]]),sub(rest[f[2]],rest[f[0]])),sub(p,[2,.5,-1]))<0)f.reverse();
  const center=rest.push(p)-1;faceCenters.push(center);for(let j=0;j<3;j++)triangles.push({face,indices:[f[j],f[(j+1)%3],center]});
 }
 const mesh={rest,vertices:rest.map(v=>v.slice()),faces,triangles,deformation:{compliance:rest.map((_,i)=>i<4?.4:1),faceCenters}};
 const b=new TouchBody(mesh);b.press(hitFace(mesh));run(b,.6);assert.ok(maxOffset(b)>.12);assert.ok(packedMesh(mesh).every(Number.isFinite));b.release();run(b,2);assert.ok(maxOffset(b)<2e-6);
 const noMetadata={...mesh,deformation:undefined,vertices:rest.map(v=>v.slice())},simple=new TouchBody(noMetadata);simple.press(hitFace(noMetadata));simple.release();run(simple,.1);assert.ok(maxOffset(simple)>.03);
});
class Canvas {
 constructor(){this.events={};this.capture=new Set();this.classList={add(){},remove(){}};}
 addEventListener(k,f){this.events[k]=f;}removeEventListener(k){delete this.events[k];}focus(){}getBoundingClientRect(){return {width:390,height:844};}
 setPointerCapture(id){this.capture.add(id);}hasPointerCapture(id){return this.capture.has(id);}releasePointerCapture(id){this.capture.delete(id);}
}
const event=(x,y,t,id=1)=>({clientX:x,clientY:y,timeStamp:t,pointerId:id,button:0,isPrimary:true,preventDefault(){}});
test('real input lifecycle: zero-frame tap retains energy; quick swipe/cancel do not emit a tap',()=>{
 const b=bodyFor('SOFT'),canvas=new Canvas(),input=new TouchInput(canvas,b,()=>hitFace(b.mesh));
 input.down(event(150,200,0));input.up(event(150,200,8));run(b,.08);assert.ok(maxOffset(b)>.04);
 run(b,2);input.down(event(150,200,2100));input.move(event(195,205,2116));input.up(event(215,210,2132));run(b,.08);
 assert.ok(Math.hypot(...b.velocity)>1);assert.ok(maxOffset(b)<2e-6,'no swipe-created impulse');
 const orientation=b.orientation.slice();input.down(event(150,200,2300));input.up(event(150,200,2308));run(b,.08);assert.deepEqual(b.orientation,orientation);assert.ok(maxOffset(b)>.04,'tap while spinning');
 run(b,2);input.down(event(150,200,4400));canvas.events.pointercancel({pointerId:2});assert.ok(input.pointer,'secondary cancel cannot cancel primary');canvas.events.lostpointercapture({pointerId:1});run(b,.1);assert.ok(maxOffset(b)<2e-6,'interruption removes pending impulse');
 assert.equal(input.pointer,null);assert.equal(canvas.capture.size,0);input.destroy();
});
test('long input durations affect release damping; preset changes keep rotation parameters',()=>{
 const b=bodyFor('SOFT'),canvas=new Canvas(),input=new TouchInput(canvas,b,()=>hitFace(b.mesh));
 input.down(event(150,200,0));input.up(event(150,200,1000));const heldDamping=b.reboundDamping;
 input.down(event(150,200,2000));input.up(event(150,200,2008));assert.ok(b.reboundDamping>heldDamping);
 const rotation={damping:b.options.damping,settle:b.options.settle};for(const name of Object.keys(FEEL_PROFILES)){b.setFeel(name);assert.equal(b.pressure,null);assert.equal(b.options.damping,rotation.damping);assert.equal(b.options.settle,rotation.settle);}
 assert.throws(()=>b.setFeel('unknown'),/Unknown feel/);input.destroy();
});
test('extreme supported debug values and interruptions stay bounded, finite and recover',()=>{
 const b=new TouchBody(createPolyhedron(),{depth:.23,radius:1.35,pressRate:16,restoreStiffness:100,returnDamping:.4,tapImpulse:3.6});
 for(let i=0;i<180;i++){b.press(hitFace(b.mesh,i%20));run(b,.02);if(i%3)b.release();else b.cancel();b.step(.05);assert.ok(maxOffset(b)<=.2800001);assert.ok(packedMesh(b.mesh).every(Number.isFinite));}
 b.cancel();run(b,3);assert.ok(maxOffset(b)<3e-6);
});
