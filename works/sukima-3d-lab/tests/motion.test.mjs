import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SpecimenSession} from '../engine/session.js';
import {MotionPlayer,sampleTrack,partPose} from '../engine/motion.js';
import {createSpecimen} from '../engine/specimen.js';
import {packedMesh,pickMesh} from '../engine/geometry.js';
import {Camera} from '../engine/camera.js';
import {AnimationLoop} from '../engine/loop.js';
import {Renderer} from '../engine/renderer.js';
import {PointerInput} from '../engine/interaction.js';
import {add,sub,scale,norm,rotate,multiply,axisAngle,cross} from '../engine/math.js';
import {previewRaster,previewSvg} from '../preview.js';
import {loadCollection} from '../collection.js';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const manifest=read('collection.json'),definitions=manifest.items.map(i=>read(i.file)),moving=definitions.filter(d=>d.behaviors?.motion);
const hash=x=>createHash('sha256').update(x).digest('hex');
const near=(a,b,t=1e-7)=>{if(Array.isArray(a)||ArrayBuffer.isView(a)){assert.equal(a.length,b.length);a.forEach((v,i)=>near(v,b[i],t));}else assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);};
const run=(s,n=120)=>{for(let i=0;i<n;i++)s.step(1/120);};
const matrixPoint=(m,v)=>[0,1,2].map(k=>m[k]*v[0]+m[k+4]*v[1]+m[k+8]*v[2]+m[k+12]);
const matrixVector=(m,v)=>matrixPoint(m,v).map((x,i)=>x-m[12+i]);
test('all 36 v0.5 registrations, JSON, compiled meshes, colors and initial previews are identical to main 5d15872',()=>{
 const baseline=read('tests/v05-baseline.json');assert.equal(baseline.specimens.length,36);
 for(const [i,b] of baseline.specimens.entries()){
  const d=definitions[i],m=createSpecimen(d),p=packedMesh(m);
  assert.deepEqual(manifest.items[i],b.entry);assert.equal(hash(readFileSync(new URL(b.entry.file,root))),b.source);
  assert.equal(hash(JSON.stringify(m)),b.mesh);assert.equal(hash(Buffer.from(p.buffer)),b.packed);
  assert.equal(hash(d.schema.endsWith('/1')?previewSvg(d):previewRaster(d).pixels),b.preview);
  assert.equal(new SpecimenSession().select(d).motion,null);
 }
});
test('37–41 append unique IDs; both MOBILE works keep their number, identity and order',()=>{
 assert.deepEqual(manifest.items.slice(36,41).map(i=>[i.number,i.id]),[[37,'pinwheel'],[38,'shutter'],[39,'pendulum'],[40,'slider'],[41,'mobile-motion']]);
 assert.equal(manifest.items[20].id,'mobile');assert.equal(manifest.items[20].number,21);
 assert.deepEqual(moving.slice(0,5).map(d=>d.name),['PINWHEEL','SHUTTER','PENDULUM','SLIDER','MOBILE']);
});
test('SPIN signed speed, initial angle and very large times; SWING/SLIDE cycle and phase are analytic',()=>{
 const spin={type:'spin',speed:-.5,initialAngle:.3};near(sampleTrack(spin,2),-.7);near(sampleTrack({...spin,speed:0},1e100),.3);assert.ok(Number.isFinite(sampleTrack(spin,1e308)));
 const swing={type:'swing',baseAngle:.2,amplitude:.4,period:4,phase:0};near(sampleTrack(swing,0),.2);near(sampleTrack(swing,1),.6);near(sampleTrack(swing,2),.2);near(sampleTrack(swing,3),-.2);near(sampleTrack(swing,1+4*1e7),.6);
 const slide={type:'slide',direction:[0,1,0],amplitude:.3,period:4,phase:Math.PI/2};near(sampleTrack(slide,0),[0,.3,0]);near(sampleTrack(slide,2),[0,-.3,0]);
 for(const t of [NaN,Infinity,-1])assert.throws(()=>sampleTrack(spin,t),/Motion time/);
});
test('off-centre pivot stays fixed; rotation and slide compose after nonuniform scale and before the base pose',()=>{
 const part={transform:{scale:[.8,.5,.3],orientation:axisAngle([0,1,0],.67),position:[.2,-.3,.1]}};
 const spin={type:'spin',axis:norm([1,2,-1]),pivot:[.4,.2,-.1],speed:.6,initialAngle:.3},slide={type:'slide',direction:[0,1,0],amplitude:.2,period:4,phase:0};
 const pivot=spin.pivot.map((x,i)=>x*part.transform.scale[i]),expected=add(part.transform.position,rotate(part.transform.orientation,pivot));
 for(const time of [0,1,2,6,10000]){const pose=partPose(part,[spin],time);near(add(rotate(pose.orientation,pivot),pose.position),expected);}
 const v=[.2,.3,.1],q=axisAngle(spin.axis,sampleTrack(spin,1)),local=add(add(pivot,rotate(q,sub(v,pivot))),sampleTrack(slide,1)),pose=partPose(part,[spin,slide],1);
 near(add(rotate(pose.orientation,v),pose.position),add(part.transform.position,rotate(part.transform.orientation,local)));
});
for(const d of moving){
 test(`${d.id}: fixed geometry, animated part matrices, normals, bounds, picking, pause/reset and full-object rotation`,()=>{
  const source=JSON.stringify(d),s=new SpecimenSession().select(d),m=s.motion,before=structuredClone(s.mesh),packed=m.packed.slice(),initial=m.drawCommands(s.body.pose()).map(c=>Array.from(c.model));
  assert.equal(s.body.touchEnabled,false);assert.ok(m.parts.length>=(definitions.indexOf(d)<41?2:1));
  for(const time of [0,.7,1.5,3,5,8,20,80]){
   m.time=time;const snapshot=m.snapshot(),commands=m.drawCommands(s.body.pose());let start=0;
   for(const [i,p] of m.parts.entries()){
    assert.equal(commands[i].first,p.first);assert.equal(commands[i].count,p.count);
    for(const [j,v] of p.mesh.rest.entries())near(matrixPoint(commands[i].model,v),rotate(s.body.pose(),snapshot.rest[start+j]),3e-7);
    for(let k=3;k<p.packed.length;k+=9){const n=matrixVector(commands[i].model,p.packed.slice(k,k+3));near(Math.hypot(...n),m.scale,2e-7);}
    start+=p.mesh.rest.length;
   }
   const reference=pickMesh(snapshot,[0,0,3],[0,0,-1]),posed=m.pick([0,0,3],[0,0,-1]);assert.equal(Boolean(posed),Boolean(reference));if(reference)near(posed.point,reference.point);
   assert.ok(snapshot.rest.every(v=>Math.hypot(...v)<=m.radius+1e-8));
  }
  m.time=0;run(s,240);assert.notDeepEqual(m.drawCommands(s.body.pose()).map(c=>Array.from(c.model)),initial);
  const camera=new Camera();
  for(const [w,h] of [[320,640],[390,844],[844,390],[768,1024]]){
   camera.resize(w,h,m.radius);const tangent=Math.tan(camera.fov/2);
   for(let k=0;k<36;k++){m.time=k*.43;for(const v of m.snapshot().rest){const p=rotate(multiply(axisAngle([1,1,1],k*.33),s.body.pose()),v),depth=camera.distance-p[2];assert.ok(Math.abs(p[0]/(depth*tangent*camera.aspect))<.94);assert.ok(Math.abs(p[1]/(depth*tangent))<.94);}}
  }
  m.setPlaying(false);const time=m.time;run(s,100);assert.equal(m.time,time);s.body.beginDrag();s.body.drag(80,-30,.1,390);s.body.release();run(s,60);assert.ok(Math.hypot(...s.body.velocity)>0);assert.equal(m.time,time);
  s.resetPose();assert.equal(m.time,0);assert.equal(m.playing,false);near(s.body.pose(),norm(d.display.orientation));assert.deepEqual(m.drawCommands(s.body.pose()).map(c=>Array.from(c.model)),initial);
  m.setPlaying(true);run(s);assert.ok(m.time>.99);assert.deepEqual(m.packed,packed);assert.deepEqual(s.mesh,before);assert.equal(JSON.stringify(d),source);
  const r=previewRaster(d);assert.ok(r.pixels.filter((_,i)=>i%4===3&&r.pixels[i]>0).length>400);
 });
}
test('full-cycle analytic bounds cover arbitrary axes, offset pivots, nonuniform scales and combined slide tracks',()=>{
 const d=structuredClone(moving[0]);d.parts=[d.parts.at(-1)];d.parts[0].transform={position:[.2,-.2,.15],orientation:axisAngle([1,-2,1],.8),scale:[.8,.5,.35]};
 const rotation={part:'rotor',type:'swing',axis:norm([1,2,3]),pivot:[.8,-.4,.2],baseAngle:2.7,amplitude:1.2,period:3,phase:0};
 const slide={part:'rotor',type:'slide',direction:norm([2,-1,1]),amplitude:.4,period:4,phase:1.2};
 for(const track of [rotation,{part:'rotor',type:'spin',axis:rotation.axis,pivot:rotation.pivot,speed:-.8,initialAngle:-.9}]){
  d.behaviors.motion.tracks=[track,slide];const m=new MotionPlayer(d);
  for(let i=0;i<720;i++){m.time=i/60;for(const v of m.snapshot().rest)assert.ok(Math.hypot(...v)<=m.radius+1e-8);}
 }
});
test('authored normals use inverse transpose exactly once, then the rigid part and view rotations',()=>{
 const d=structuredClone(moving[0]),n=norm([1,1,1]);d.parts=[d.parts.at(-1)];d.parts[0].geometry={surface:'open',vertices:[[0,0,1],[1,0,0],[0,1,0]],triangles:[[0,1,2]],normals:[n,n,n]};d.parts[0].transform.scale=[.8,.5,.3];
 const m=new MotionPlayer(d),view=axisAngle([0,1,0],.8);m.time=1.7;
 const expected=rotate(view,rotate(m.pose(m.parts[0]).orientation,norm(n.map((x,i)=>x/d.parts[0].transform.scale[i]))));
 near(norm(matrixVector(m.drawCommands(view)[0].model,m.packed.slice(3,6))),expected,2e-7);
 near(rotate(view,m.snapshot().triangles[0].normals[0]),expected,2e-7);
});
test('same elapsed time yields the same part pose at 30/60/120fps and after many resets',()=>{
 const states=[];
 for(const fps of [30,60,120]){const s=new SpecimenSession().select(moving[4]);for(let i=0;i<fps*9;i++)s.step(1/fps);states.push(s.motion.drawCommands(s.body.pose()));for(let i=0;i<100;i++){s.motion.reset();run(s,240);}assert.deepEqual(s.mesh.vertices,s.mesh.rest);}
 for(const commands of states.slice(1))commands.forEach((c,i)=>near(c.model,states[0][i].model,2e-7));
});
test('runtime copies isolate base transforms, source geometry and track definitions from later author edits',()=>{
 const d=structuredClone(moving[0]),m=new MotionPlayer(d),initial=m.drawCommands(d.display.orientation),packed=m.packed.slice();
 d.parts.at(-1).geometry.vertices[0][0]=99;d.parts.at(-1).transform.position[0]=99;d.behaviors.motion.tracks[0].speed=99;
 assert.deepEqual(m.drawCommands(d.display.orientation),initial);assert.deepEqual(m.packed,packed);near(m.tracks[0].speed,.52);
});
test('pause/visibility stop avoids elapsed-time catch-up; reentry and switching discard Motion state atomically',()=>{
 let id=0;const pending=new Map(),s=new SpecimenSession().select(moving[0]);
 const raf=globalThis.requestAnimationFrame,caf=globalThis.cancelAnimationFrame;
 globalThis.requestAnimationFrame=fn=>{pending.set(++id,fn);return id;};globalThis.cancelAnimationFrame=i=>pending.delete(i);
 const frame=time=>{const callback=pending.get(id);pending.delete(id);callback(time);};
 const loop=new AnimationLoop(dt=>s.step(dt),()=>{});
 try{loop.start();frame(1000);frame(1030);near(s.motion.time,.03);loop.stop();assert.equal(pending.size,0);loop.start();frame(999999);near(s.motion.time,.03);}
 finally{loop.stop();globalThis.requestAnimationFrame=raf;globalThis.cancelAnimationFrame=caf;}
 const old=s.motion,body=s.body;const bad=structuredClone(moving[1]);bad.behaviors.motion.tracks[0].part='missing';assert.throws(()=>s.select(bad));assert.equal(s.motion,old);assert.equal(s.body,body);
 for(const d of [moving[1],definitions[20],definitions[0],moving[4],moving[0]]){const previous=s.motion;s.select(d);if(previous)assert.equal(previous.playing,false);assert.deepEqual(s.body.velocity,[0,0,0]);if(s.motion){assert.equal(s.motion.time,0);assert.equal(s.motion.playing,true);}}
 const last=s.motion;s.clear();assert.equal(last.playing,false);assert.equal(s.motion,null);
});
test('Motion uses existing rotation input: long hold/background drag rotates and flick remains independent',()=>{
 const s=new SpecimenSession().select(moving[0]),canvas={addEventListener(){},removeEventListener(){},classList:{add(){},remove(){}},focus(){},getBoundingClientRect:()=>({width:390,height:844}),setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}};
 const input=new PointerInput(canvas,s.body,()=>null,()=>{},()=>assert.fail('no pull mapping for Motion'));
 const e=(x,y,t)=>({clientX:x,clientY:y,timeStamp:t,pointerId:1,button:0,isPrimary:true,preventDefault(){}});
 input.down(e(100,200,0));input.step(1);run(s);input.move(e(180,220,1100));assert.equal(input.pointer.mode,'rotate');input.up(e(200,220,1120));run(s,12);assert.ok(Math.hypot(...s.body.velocity)>.1);assert.ok(s.motion.time>1);input.cancel();input.destroy();
});
test('reject invalid Motion versions, fields, references, units, timing, conflicts and unsupported Touch combinations',()=>{
 const changes=[d=>d.behaviors.motion=null,d=>d.behaviors.motion=undefined,d=>d.behaviors.motion.version=2,d=>d.behaviors.motion.extra=1,d=>d.behaviors.motion.tracks=[],d=>d.behaviors.motion.tracks=new Array(2),d=>d.behaviors.motion.tracks[0].type='fall',d=>d.behaviors.motion.tracks[0].type='toString',d=>d.behaviors.motion.tracks[0].part='absent',d=>d.behaviors.motion.tracks[0].axis=[0,0,0],d=>d.behaviors.motion.tracks[0].axis=[0,0,2],d=>d.behaviors.motion.tracks[0].axis=new Array(3),d=>d.behaviors.motion.tracks[0].pivot=[0,Infinity,0],d=>d.behaviors.motion.tracks[0].speed=NaN,d=>d.behaviors.motion.tracks[0].speed=7,d=>delete d.behaviors.motion.tracks[0].initialAngle,d=>d.behaviors.motion.tracks[0].velocity=1,d=>d.behaviors.motion.tracks.push(d.behaviors.motion.tracks[0]),d=>d.behaviors.touch={profile:'SOFT',overrides:{}},d=>d.behaviors.motion.tracks=Array.from({length:65},()=>d.behaviors.motion.tracks[0])];
 for(const change of changes){const d=structuredClone(moving[0]);change(d);assert.throws(()=>createSpecimen(d),/Invalid specimen/);}
 for(const field of ['period','phase','amplitude','baseAngle'])for(const value of [NaN,Infinity,null]){const d=structuredClone(moving[1]);d.behaviors.motion.tracks[0][field]=value;assert.throws(()=>createSpecimen(d),/motion/);}
 for(const value of [0,-1,.5,121]){const d=structuredClone(moving[3]);d.behaviors.motion.tracks[0].period=value;assert.throws(()=>createSpecimen(d),/motion/);}
 for(const [field,value] of [['direction',[0,0,0]],['amplitude',.66],['amplitude',-.1]]){const d=structuredClone(moving[3]);d.behaviors.motion.tracks[0][field]=value;assert.throws(()=>createSpecimen(d),/motion/);}
 const legacy=structuredClone(definitions[0]);legacy.behaviors=moving[0].behaviors;assert.throws(()=>createSpecimen(legacy),/requires specimen\/2/);
 const conflict=structuredClone(moving[1]);conflict.behaviors.motion.tracks.push({part:'left-panel',type:'spin',axis:[0,1,0],pivot:[0,0,0],speed:.5,initialAngle:0});assert.throws(()=>createSpecimen(conflict),/conflicting/);
 const sweep=structuredClone(moving[0]);sweep.behaviors.motion.tracks[0].pivot=[2,2,2];assert.throws(()=>createSpecimen(sweep),/swept display bounds/);
});
test('renderer draws fixed buffers using independent matrices; legacy renderer path still draws one body',()=>{
 const uploads=[],models=[],draws=[],gl=new Proxy({}, {get:(_,key)=>key==='bufferData'?(_target,data)=>uploads.push(data):key==='uniformMatrix4fv'?(location,_transpose,m)=>{if(location==='model')models.push(Array.from(m));}:key==='drawArrays'?(_type,first,count)=>draws.push({first,count}):()=>{}});
 const renderer=Object.create(Renderer.prototype);Object.assign(renderer,{gl,uniforms:{model:'model'},shadowData:new Float32Array(27)});
 const s=new SpecimenSession().select(moving[4]),camera=new Camera();camera.resize(390,844,s.motion.radius);
 renderer.draw(s.mesh,s.body.pose(),camera,s.motion);assert.equal(draws.length,s.motion.parts.length+1);assert.equal(uploads[1],s.motion.packed);assert.deepEqual(draws.slice(1),s.motion.parts.map(p=>({first:p.first,count:p.count})));
 const initial=models.slice(1);uploads.length=draws.length=models.length=0;run(s,180);renderer.draw(s.mesh,s.body.pose(),camera,s.motion);assert.equal(uploads[1],s.motion.packed);assert.notDeepEqual(models.slice(1),initial);
 uploads.length=draws.length=0;s.select(definitions[0]);renderer.draw(s.mesh,s.body.pose(),camera);assert.equal(draws.length,2);assert.deepEqual(uploads[1],packedMesh(s.mesh));
});
test('a new JSON Motion with arbitrary part IDs loads and previews without engine or collection UI edits',async()=>{
 const d=structuredClone(moving[0]);d.id='quiet-machine';d.name='QUIET MACHINE';d.parts.at(-1).id='my-part';d.behaviors.motion.tracks[0].part='my-part';
 const list={schema:manifest.schema,items:[...manifest.items,{id:d.id,file:'objects/quiet-machine.json',number:Math.max(...manifest.items.map((item,i)=>item.number??i))+1}]};
 const request=async url=>({ok:true,json:async()=>url.pathname.endsWith('collection.json')?list:url.pathname.endsWith('quiet-machine.json')?d:read(url.pathname.split('/').slice(-2).join('/'))});
 const items=await loadCollection(new URL('https://local.test/'),request);assert.equal(items.length,manifest.items.length+1);assert.ok(items.every(i=>i.definition));const s=new SpecimenSession().select(items.at(-1).definition);run(s);assert.ok(s.motion.time>.99);assert.ok(previewRaster(d).pixels.some(x=>x>0));
});
