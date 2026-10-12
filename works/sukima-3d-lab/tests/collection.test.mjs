import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpecimen,validateSpecimen,validateCollection} from '../engine/specimen.js';
import {TouchSession} from '../engine/session.js';
import {TouchBody} from '../engine/dynamics.js';
import {TouchInput} from '../engine/interaction.js';
import {createPolyhedron,pickMesh,packedMesh} from '../engine/geometry.js';
import {Camera} from '../engine/camera.js';
import {attachment,shapeIsSafe} from '../engine/pull.js';
import {add,sub,scale,cross,dot,norm,rotate,axisAngle,multiply} from '../engine/math.js';
import {previewSvg} from '../preview.js';
import {loadCollection} from '../collection.js';
const root=new URL('../',import.meta.url),read=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const manifest=read('collection.json'),definitions=manifest.items.map(item=>read(item.file)),clone=x=>structuredClone(x);
const run=(body,seconds)=>{for(let t=0;t<seconds-1e-8;t+=1/60)body.step(Math.min(1/60,seconds-t));};
const maxOffset=b=>Math.max(...b.offsets.map(v=>Math.hypot(...v)));
function hitFace(mesh,face){
 const f=mesh.faces[face],center=mesh.vertices[mesh.deformation.faceCenters[face]],p=add(scale(center,.65),scale(mesh.vertices[f[0]],.35));
 const n=norm(cross(sub(mesh.vertices[f[1]],mesh.vertices[f[0]]),sub(center,mesh.vertices[f[0]])));
 return pickMesh(mesh,add(p,scale(n,3)),scale(n,-1));
}
test('data-loaded original is exactly v0.3: rest/topology/colors/pose and press-release trace',()=>{
 const definition=definitions[0],legacy=createPolyhedron(),session=new TouchSession().select(definition),old=new TouchBody(legacy);
 for(const key of ['rest','faces','triangles','vertices'])assert.deepEqual(session.mesh[key],legacy[key]);
 assert.deepEqual(session.mesh.deformation.compliance,legacy.deformation.compliance);assert.deepEqual(session.body.pose(),old.pose());assert.deepEqual(packedMesh(session.mesh),packedMesh(legacy));
 const a=hitFace(session.mesh,3),b=hitFace(legacy,3);session.body.press(a);old.press(b);run(session.body,.8);run(old,.8);assert.deepEqual(session.body.offsets,old.offsets);session.body.release();old.release();run(session.body,2);run(old,2);assert.deepEqual(session.body.offsets,old.offsets);
});
for(const definition of definitions){
 test(`${definition.name}: outward welded faces, every off-centre pick, normals and viewport rotations`,()=>{
  const session=new TouchSession().select(definition),mesh=session.mesh,camera=new Camera();
  assert.equal(validateSpecimen(definition),definition);assert.ok(packedMesh(mesh).every(Number.isFinite));
  for(let face=0;face<mesh.faces.length;face++)assert.equal(hitFace(mesh,face)?.face,face);
  for(const [width,height] of [[320,640],[390,844],[844,390],[1024,1366],[1366,1024]]){
   camera.resize(width,height,mesh.radius);const rect={left:17,top:21,width,height},t=Math.tan(camera.fov/2);
   for(let j=0;j<12;j++){
    const q=multiply(axisAngle([1,1,0],j*.3),session.body.pose());
    const ray=camera.ray(rect.left+width/2,rect.top+height/2,rect,q);assert.ok(pickMesh(mesh,ray.origin,ray.direction),'centre ray finds rotated solid');
    for(const vertex of mesh.vertices){const p=rotate(q,vertex),d=camera.distance-p[2];assert.ok(Math.abs(p[0]/(d*t*camera.aspect))<.94);assert.ok(Math.abs(p[1]/(d*t))<.94);}
   }
  }
  const svg=previewSvg(definition);assert.ok(svg.includes('<polygon'));assert.ok(!/NaN|Infinity|undefined/.test(svg));assert.ok(!/<script|onload=|href=/.test(svg));
 });
 test(`${definition.name}: all materials tap/hold/pull/release/cancel without broken shape`,()=>{
  for(const profile of ['HARD','SOFT','BOUNCY']){
   const session=new TouchSession().select(definition),body=session.body;body.setFeel(profile);
   const face=0,hit=hitFace(session.mesh,face);body.press(hit);body.release(0);run(body,.08);assert.ok(maxOffset(body)>.004,'sub-frame tap visible in real vertices');assert.ok(shapeIsSafe(session.mesh,body.offsets));run(body,2);
   body.press(hitFace(session.mesh,face));run(body,1);assert.ok(maxOffset(body)>.01,'held pressure');assert.ok(shapeIsSafe(session.mesh,body.offsets));
   const grabbed=hitFace(session.mesh,face),point=body.beginPull(grabbed),before=session.mesh.vertices.map(v=>v.slice());assert.deepEqual(session.mesh.vertices,before);
   body.pullTo([.12,.08,-.04]);run(body,.35);const movement=sub(attachment(session.mesh,grabbed),point);assert.ok(dot(movement,[.12,.08,-.04])>.003,'direction follows pull');assert.ok(shapeIsSafe(session.mesh,body.offsets));
   body.pullTo([100,-80,60]);run(body,.2);assert.ok(maxOffset(body)<=Math.max(.48,definition.geometry.limits?.maxPull??.48)+1e-7);assert.ok(shapeIsSafe(session.mesh,body.offsets));
   body.release();run(body,3);assert.ok(maxOffset(body)<3e-6);assert.ok(packedMesh(session.mesh).every(Number.isFinite));
   body.press(hitFace(session.mesh,face));run(body,.4);body.beginPull(hitFace(session.mesh,face));body.pullTo([-.4,.2,.1]);run(body,.15);body.cancel();assert.equal(body.pull,null);assert.equal(body.pressure,null);run(body,3);assert.ok(maxOffset(body)<3e-6);
  }
 });
 test(`${definition.name}: every face and repeated mixed deformation retain topology and restore`,()=>{
  const session=new TouchSession().select(definition),body=session.body;
  for(let i=0;i<session.mesh.faces.length*2;i++){
   let hit=hitFace(session.mesh,i%session.mesh.faces.length);assert.ok(hit);body.press(hit);run(body,.12);
   hit=hitFace(session.mesh,i%session.mesh.faces.length);body.beginPull(hit);body.pullTo([Math.sin(i)*.65,Math.cos(i)*.65,Math.sin(i*.3)*.5]);run(body,.12);
   assert.ok(shapeIsSafe(session.mesh,body.offsets));assert.ok(packedMesh(session.mesh).every(Number.isFinite));
   if(i%3)body.release();else body.cancel();run(body,.05);
  }
  body.cancel();run(body,3);assert.ok(maxOffset(body)<3e-6);
 });
}
test('bad schema/geometry/material/feel/display data fail before a mesh/body is mounted',()=>{
 const variants=[d=>{delete d.id;},d=>d.geometry.vertices[0][0]=NaN,d=>d.geometry.vertices.push(d.geometry.vertices[0]),d=>d.geometry.faces[0][0]=999,d=>d.geometry.faces[0].reverse(),d=>d.geometry.faces.pop(),d=>d.geometry.faces[0][1]=d.geometry.faces[0][0],d=>d.geometry.faces.push(d.geometry.faces[0]),d=>d.geometry.cornerCompliance=-1,d=>d.material.color[0]=2,d=>d.material.kind='glass',d=>d.material.faceColors=[],d=>d.feel.profile='toString',d=>d.feel.overrides={constructor:1},d=>d.feel.overrides={depth:99},d=>d.display.scale=0,d=>d.display.orientation=[0,0,0,0],d=>d.geometry.limits={pressDepth:.23,maxDisplacement:.1,maxPull:.2}];
 for(const change of variants){const data=clone(definitions[0]);change(data);assert.throws(()=>createSpecimen(data),/Invalid specimen/);}
 const crystal=clone(definitions[2]),quad=crystal.geometry.faces.find(f=>f.length>3);assert.ok(quad);crystal.geometry.vertices[quad[0]][2]+=.05;assert.throws(()=>createSpecimen(crystal),/Invalid specimen/);
});
test('manifest rejects duplicate, missing and external/traversing paths; local request errors stay isolated',async()=>{
 validateCollection(manifest);
 for(const entry of [{id:'stone',file:'https://example.test/stone.json'},{id:'stone',file:'../stone.json'},{file:'objects/stone.json'}])assert.throws(()=>validateCollection({...manifest,items:[entry]}),/Invalid specimen/);
 assert.throws(()=>validateCollection({...manifest,items:[manifest.items[0],manifest.items[0]]}),/Invalid specimen/);
 let inFlight=0,maximum=0;const urls=[];
 const request=async (url,options)=>{
  assert.equal(options.cache,'no-cache','data-only additions revalidate the registry and JSON');urls.push(url);assert.equal(url.origin,'https://local.test');assert.equal(url.search,'?v=0.4.0');inFlight++;maximum=Math.max(maximum,inFlight);await new Promise(resolve=>setTimeout(resolve,1));inFlight--;
  const path=url.pathname.split('/works/sukima-3d-lab/')[1];return {ok:path!=='objects/shell.json',json:async()=>read(path)};
 };
 const result=await loadCollection(new URL('https://local.test/works/sukima-3d-lab/'),request);assert.equal(result.length,manifest.items.length);assert.equal(result[4].definition,undefined);assert.ok(result[4].error);assert.ok(result[5].definition);assert.ok(maximum<=4);assert.deepEqual(result.map(x=>x.id),manifest.items.map(x=>x.id));
});
test('new independent JSON registration and 100-item loading require no engine or DOM edits',async()=>{
 const data=clone(definitions[1]);data.id='new-pebble';data.name='NEW PEBBLE';data.material.color=[.3,.4,.5];data.feel.profile='HARD';data.feel.overrides={holdDelay:450};data.display.scale=.8;
 const session=new TouchSession().select(data);assert.equal(session.body.feel,'HARD');assert.equal(session.body.options.holdDelay,450);assert.ok(previewSvg(data).includes('<svg'));
 const list={schema:manifest.schema,items:Array.from({length:100},(_,i)=>({id:`sample-${i}`,file:`objects/sample-${i}.json`}))};
 const request=async url=>({ok:true,json:async()=>url.pathname.endsWith('collection.json')?list:{...data,id:url.pathname.split('/').at(-1).replace('.json','')}});
 const result=await loadCollection(new URL('https://local.test/'),request);assert.equal(result.length,100);assert.ok(result.every(x=>x.definition));
});
class Canvas {
 constructor(){this.listeners=new Map();this.capture=new Set();this.classList={add(){},remove(){}};}
 addEventListener(k,fn){this.listeners.set(k,fn);}removeEventListener(k){this.listeners.delete(k);}focus(){}getBoundingClientRect(){return {width:390,height:844};}setPointerCapture(id){this.capture.add(id);}hasPointerCapture(id){return this.capture.has(id);}releasePointerCapture(id){this.capture.delete(id);}
}
test('switching grabbed/spinning bodies destroys capture and uses fresh pose, feel and vertices',()=>{
 const session=new TouchSession(),canvas=new Canvas();let input;
 for(let i=0;i<24;i++){
  input?.destroy();session.select(definitions[i%6]);
  assert.deepEqual(session.body.offsets,session.mesh.rest.map(()=>[0,0,0]));assert.deepEqual(session.body.velocity,[0,0,0]);assert.equal(session.body.pressure,null);assert.equal(session.body.pull,null);assert.deepEqual(session.body.orientation,definitions[i%6].display.orientation);
  const hit=hitFace(session.mesh,0);input=new TouchInput(canvas,session.body,()=>hit,()=>{},()=>((x,y)=>[x*.001,y*.001,0]));
  const event=(x,t)=>({clientX:x,clientY:200,timeStamp:t,pointerId:1,button:0,isPrimary:true,preventDefault(){}});
  input.down(event(100,0));input.move(event(160,i%2?50:400));run(session.body,.2);
  if(i%2)assert.ok(Math.hypot(...session.body.velocity)>0);else assert.ok(session.body.pull);
  const old=session.body;input.destroy();input=null;assert.equal(canvas.capture.size,0);assert.equal(canvas.listeners.size,0);session.clear();assert.equal(old.held,false);assert.equal(old.pressure,null);assert.equal(old.pull,null);assert.equal(session.body,null);
 }
 session.select(definitions[0]);const before=session.body;assert.throws(()=>session.select({...definitions[1],geometry:{}}));assert.equal(session.body,before,'invalid replacement cannot corrupt current session');
});

test('documented cube example validates and deforms without a gallery or shape-specific engine code',()=>{
 const guide=readFileSync(new URL('COLLECTION_GUIDE.md',root),'utf8'),example=JSON.parse(guide.match(/```json\n([\s\S]*?)\n```/)[1]);
 const session=new TouchSession().select(example);assert.equal(session.mesh.faces.length,6);assert.equal(session.mesh.rest.length,14);
 session.body.press(hitFace(session.mesh,0));run(session.body,.5);assert.ok(maxOffset(session.body)>.01);session.body.release();run(session.body,3);assert.ok(maxOffset(session.body)<3e-6);
});
