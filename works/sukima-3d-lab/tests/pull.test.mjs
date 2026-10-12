import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchBody} from '../engine/dynamics.js';
import {TouchInput} from '../engine/interaction.js';
import {Camera} from '../engine/camera.js';
import {createPolyhedron,pickMesh,packedMesh} from '../engine/geometry.js';
import {attachment,pullWeights,resistantPull,shapeIsSafe} from '../engine/pull.js';
import {add,sub,scale,dot,cross,norm,rotate,axisAngle,multiply} from '../engine/math.js';
const run=(body,time,fps=120)=>{for(let t=0;t<time-1e-8;t+=1/fps)body.step(Math.min(1/fps,time-t));};
const magnitude=body=>Math.max(...body.offsets.map(v=>Math.hypot(...v)));
function hitFace(mesh,face=0,off=.5){
 const f=mesh.faces[face],center=mesh.rest[mesh.deformation.faceCenters[face]];
 const p=add(scale(center,off),scale(mesh.rest[f[0]],1-off)),n=norm(cross(sub(mesh.rest[f[1]],mesh.rest[f[0]]),sub(mesh.rest[f[2]],mesh.rest[f[0]])));
 return pickMesh(mesh,add(p,scale(n,3)),scale(n,-1));
}
class Canvas {
 constructor(){this.events={};this.capture=new Set();this.classList={add(){},remove(){}};}
 addEventListener(k,f){this.events[k]=f;}removeEventListener(k){delete this.events[k];}focus(){}getBoundingClientRect(){return {left:17,top:23,width:390,height:844};}
 setPointerCapture(id){this.capture.add(id);}hasPointerCapture(id){return this.capture.has(id);}releasePointerCapture(id){this.capture.delete(id);}
}
const event=(x,y,t,id=1)=>({clientX:x,clientY:y,timeStamp:t,pointerId:id,button:0,isPrimary:true,preventDefault(){}});
function setup(){
 const mesh=createPolyhedron(),body=new TouchBody(mesh),camera=new Camera(),canvas=new Canvas();camera.resize(390,844);
 const input=new TouchInput(canvas,body,()=>hitFace(mesh),()=>{},(x,y,q,p)=>camera.pullMapping(x,y,canvas.getBoundingClientRect(),q,p));
 return {body,input,canvas,camera};
}
test('hold arms on RAF, preserves held pressure until motion, ignores jitter; grabbed drag never rotates',()=>{
 const {body,input}=setup();input.down(event(150,200,0));input.move(event(156,202,100));
 input.step(.37);assert.equal(input.pointer.mode,'press');input.step(.02);assert.equal(input.pointer.mode,'armed');assert.ok(body.pressure);assert.equal(body.pull,null);
 run(body,1);const reference=new TouchBody(createPolyhedron());reference.press(hitFace(reference.mesh));run(reference,1);assert.deepEqual(body.offsets,reference.offsets,'arming alone preserves the exact v0.2 hold');
 input.move(event(157,203,450));assert.equal(input.pointer.mode,'armed');
 const orientation=body.pose();input.move(event(186,210,500));assert.equal(input.pointer.mode,'grab');assert.ok(body.pull);assert.equal(body.pressure,null);
 run(body,.25);assert.ok(magnitude(body)>.15);body.pose().forEach((v,i)=>assert.ok(Math.abs(v-orientation[i])<1e-12));
 input.move(event(300,90,900));run(body,.15);body.pose().forEach((v,i)=>assert.ok(Math.abs(v-orientation[i])<1e-12));assert.equal(Math.hypot(...body.velocity),0);
 input.up(event(300,90,920));assert.equal(body.pull,null);assert.equal(body.held,false);run(body,3);assert.ok(magnitude(body)<2e-6);
});
test('hold can arm without RAF; motion before threshold locks rotation even after long hold',()=>{
 const {body,input}=setup();input.down(event(150,200,0));input.move(event(200,220,400));assert.equal(input.pointer.mode,'grab');input.cancel();run(body,3);
 input.down(event(150,200,1000));input.move(event(161,201,1150));assert.equal(input.pointer.mode,'rotate');input.step(1);
 input.move(event(200,240,1800));assert.equal(input.pointer.mode,'rotate');assert.equal(body.pull,null);input.up(event(210,250,1816));assert.ok(Math.hypot(...body.velocity)>1);
});
test('release without motion after long hold remains v0.2 pressure/rebound; tap remains impulse',()=>{
 const {body,input}=setup();input.down(event(150,200,0));input.step(.5);run(body,1);
 assert.equal(input.pointer.mode,'armed');const offsets=body.offsets.map(v=>v.slice());input.up(event(150,200,1000));assert.deepEqual(body.offsets,offsets);assert.equal(body.pull,null);assert.ok(body.reboundDamping<body.options.returnDamping);
 run(body,3);input.down(event(150,200,4000));input.up(event(150,200,4008));run(body,.08);assert.ok(magnitude(body)>.035);
});
test('capture cancellation, secondary pointers and resize/hidden-style interruption leave no grabbed state',()=>{
 for(const cancel of ['pointercancel','lostpointercapture','external']){
  const {body,input,canvas}=setup();input.down(event(150,200,0));input.move(event(200,210,450));run(body,.3);
  canvas.events.pointercancel({pointerId:2});assert.ok(body.pull);input.down(event(200,210,460,2));assert.equal(input.pointer.id,1);
  if(cancel==='external')input.cancel();else canvas.events[cancel]({pointerId:1});
  assert.equal(input.pointer,null);assert.equal(body.pull,null);assert.equal(body.pressure,null);assert.equal(body.held,false);assert.equal(canvas.capture.size,0);assert.equal(Math.hypot(...body.velocity),0);run(body,3);assert.ok(magnitude(body)<2e-6);
  input.destroy();assert.equal(Object.keys(canvas.events).length,0);
 }
});
test('camera-plane mapping tracks CSS pixels with correct sign after arbitrary poses and viewport sizes',()=>{
 let cases=0;
 for(const [width,height] of [[320,640],[390,844],[844,390],[1024,1366],[1366,1024]]){
  const camera=new Camera();camera.resize(width,height);const rect={left:37,top:29,width,height},t=Math.tan(camera.fov/2);
  for(let j=0;j<24;j++){
   const body=new TouchBody(createPolyhedron());body.orientation=multiply(axisAngle([1,0,0],j*.37),axisAngle([0,1,1],j*.71));
   const x=rect.left+width/2,y=rect.top+height/2,ray=camera.ray(x,y,rect,body.pose()),hit=pickMesh(body.mesh,ray.origin,ray.direction);assert.ok(hit);
   body.press(hit);run(body,.4);const point=body.beginPull(hit),pose=body.pose(),mapping=camera.pullMapping(x,y,rect,pose,point),world=rotate(pose,point);
   for(const [dx,dy] of [[16,0],[-16,0],[0,16],[0,-16],[12,-9]]){
    const delta=mapping(x+dx,y+dy),next=rotate(pose,add(point,delta)),depth=camera.distance-world[2];
    assert.ok(Math.abs(next[2]-world[2])<1e-9);
    assert.ok(Math.abs((next[0]-world[0])*width/(2*depth*t*camera.aspect)-dx)<1e-8);
    assert.ok(Math.abs(-(next[1]-world[1])*height/(2*depth*t)-dy)<1e-8);
    body.pullTo(delta);run(body,.35);const actual=rotate(pose,sub(attachment(body.mesh,hit),point)),expected=rotate(pose,resistantPull(delta,1,.48));
    assert.ok(Math.hypot(...sub(actual,expected))<.006,'attachment follows mapped target');assert.ok(shapeIsSafe(body.mesh,body.offsets));cases++;
   }
  }
 }
 assert.equal(cases,600);
});
test('progressive resistance, smooth neighbour field and complete elastic release across materials/fps',()=>{
 const a=resistantPull([.1,0,0],1,.48)[0],b=resistantPull([.2,0,0],1,.48)[0],c=resistantPull([.4,0,0],1,.48)[0];assert.ok(b-a>(c-b)/2);assert.ok(resistantPull([1e9,0,0],1,.48)[0]<=.48);
 for(const name of ['HARD','SOFT','BOUNCY'])for(const fps of [30,60,120]){
  const body=new TouchBody(createPolyhedron());body.setFeel(name);const hit=hitFace(body.mesh);body.press(hit);run(body,.5,fps);const point=body.beginPull(hit),before=body.mesh.vertices.map(v=>v.slice());assert.deepEqual(body.mesh.vertices,before);
  const weights=body.pull.weights;assert.ok(weights.filter(w=>w>.02).length>hit.triangle.length);assert.ok(weights.some(w=>w===0));
  body.pullTo([.23,-.11,0]);run(body,.7,fps);assert.ok(dot(sub(attachment(body.mesh,hit),point),[.23,-.11,0])>.025);assert.ok(shapeIsSafe(body.mesh,body.offsets));
  const normal=norm(sub(attachment(body.mesh,hit),attachment(body.mesh,hit,body.mesh.rest))),snapshot=body.mesh.vertices.map(v=>v.slice());body.release();assert.deepEqual(body.mesh.vertices,snapshot);
  let rebound=0;for(let i=0;i<fps*3;i++){body.step(1/fps);rebound=Math.max(rebound,-dot(sub(attachment(body.mesh,hit),attachment(body.mesh,hit,body.mesh.rest)),normal));assert.ok(shapeIsSafe(body.mesh,body.offsets));}
  assert.ok(rebound>.0001&&rebound<.065);assert.ok(magnitude(body)<3e-6);
 }
});
test('all 20 faces/off-centre pulls and extreme repeated changes remain finite, bounded and unfolded',()=>{
 for(const name of ['HARD','SOFT','BOUNCY']){
  const body=new TouchBody(createPolyhedron(),{pullStrength:1.5,maxPull:.6,pullRadius:1});body.setFeel(name);
  for(let i=0;i<120;i++){
   const hit=hitFace(body.mesh,i%20,[.15,.5,.85][i%3]);assert.ok(hit);body.press(hit);run(body,.4);body.beginPull(hit);
   for(const delta of [[20,-30,40],[-40,50,-10],[0,0,-100],[.12,.07,0]]){
    body.pullTo(delta);for(let j=0;j<12;j++){body.step(1/60);assert.ok(magnitude(body)<=.600001);assert.ok(shapeIsSafe(body.mesh,body.offsets));assert.ok(packedMesh(body.mesh).every(Number.isFinite));}
   }
   if(i%3)body.release();else body.cancel();run(body,.03);
  }
  body.cancel();run(body,4);assert.ok(magnitude(body)<3e-6);assert.equal(body.pullSafety,false);
 }
});
test('pull ignores invalid targets and weights remain independent of vertex ordering/metadata',()=>{
 const mesh=createPolyhedron(),hit=hitFace(mesh),weights=pullWeights(mesh,hit,1.45),count=mesh.rest.length,map=i=>(i*7+3)%count,permute=array=>{const result=[];array.forEach((v,i)=>result[map(i)]=v);return result;};
 const alternative={rest:permute(mesh.rest),vertices:permute(mesh.vertices),triangles:mesh.triangles.map(t=>({...t,indices:t.indices.map(map)}))};
 const other=pullWeights(alternative,{...hit,triangle:hit.triangle.map(map)},1.45);weights.forEach((w,i)=>assert.ok(Math.abs(w-other[map(i)])<1e-9));
 const body=new TouchBody(mesh);body.beginPull(hit);body.pullTo([NaN,0,0]);body.pullTo([Infinity,0,0]);assert.deepEqual(body.pull.delta,[0,0,0]);
 body.pullTo([.2,0,0]);body.setFeel('HARD');assert.equal(body.pull,null);run(body,3);assert.ok(magnitude(body)<2e-6);
});

test('alternative tetrahedral topology pulls and restores without optional face metadata',()=>{
 const rest=[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(v=>scale(v,.6)),triangles=[[0,1,2],[0,3,1],[0,2,3],[1,3,2]].map((indices,face)=>{const [a,b,c]=indices.map(i=>rest[i]);if(dot(cross(sub(b,a),sub(c,a)),a)<0)indices.reverse();return {indices,face};});
 const mesh={rest,vertices:rest.map(v=>v.slice()),triangles},body=new TouchBody(mesh),triangle=triangles[0].indices,hit={face:0,triangle,barycentric:[.3,.3,.4]};
 body.press(hit);run(body,.4);const point=body.beginPull(hit);body.pullTo([.2,.1,0]);run(body,.6);
 assert.ok(dot(sub(attachment(mesh,hit),point),[.2,.1,0])>.02);assert.ok(shapeIsSafe(mesh,body.offsets));body.release();run(body,3);assert.ok(magnitude(body)<3e-6);
});
