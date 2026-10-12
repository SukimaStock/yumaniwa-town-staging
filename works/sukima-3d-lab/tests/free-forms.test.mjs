import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateSpecimen,createSpecimen,validateCollection} from '../engine/specimen.js';
import {SpecimenSession} from '../engine/session.js';
import {PointerInput} from '../engine/interaction.js';
import {Camera} from '../engine/camera.js';
import {packedMesh,pickMesh} from '../engine/geometry.js';
import {add,sub,scale,dot,cross,norm,rotate,axisAngle,multiply} from '../engine/math.js';
import {previewRaster} from '../preview.js';
import {rasterMesh} from '../engine/raster.js';
import {loadCollection} from '../collection.js';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const manifest=read('collection.json'),definitions=manifest.items.map(i=>read(i.file)),forms=definitions.filter(d=>d.schema==='sukima3d-specimen/2');
const run=(b,t)=>{for(let n=0;n<t*120;n++)b.step(1/120);};
const pixelCount=r=>r.pixels.filter((_,i)=>i%4===3&&r.pixels[i]>0).length;
const normalAt=(mesh,hit)=>{const [a,b,c]=hit.triangle.map(i=>mesh.rest[i]);return norm(cross(sub(b,a),sub(c,a)));};
test('sixteen v0.4 data blobs, order and numbering remain immutable; 17–21 append without renumbering',()=>{
 const baseline=read('tests/v04-baseline.json');assert.equal(baseline.length,16);
 for(const [index,item] of baseline.entries()){
  assert.deepEqual(manifest.items[index],{id:item.id,file:item.file});
  assert.equal(createHash('sha256').update(readFileSync(new URL(item.file,root))).digest('hex'),item.sha256);
 }
 assert.deepEqual(manifest.items.slice(16,21).map(x=>[x.number,x.id]),[[17,'dent'],[18,'ring'],[19,'bowl'],[20,'leaf'],[21,'mobile']]);
 assert.equal(manifest.items.length,36);
 assert.deepEqual(manifest.items.slice(21).map(x=>x.number),Array.from({length:15},(_,i)=>i+22));
 for(const d of definitions.slice(21)){assert.equal(d.schema,'sukima3d-specimen/2');assert.deepEqual(d.behaviors,{});}
 assert.equal(validateCollection(manifest),manifest.items);
 assert.throws(()=>validateCollection({...manifest,items:[...manifest.items,{id:'extra',file:'objects/extra.json',number:17}]}),/collection number/);
 for(const number of [null,NaN,-1,1.5,10000])assert.throws(()=>validateCollection({...manifest,items:[{id:'extra',file:'objects/extra.json',number}]}),/collection number/);
});
test('all sixteen legacy tap/hold/pull/restore/flick traces exactly match v0.4 main at every profile',()=>{
 // Golden traces generated from immutable 2a8af03 v0.4 sources, not this engine.
 for(const item of read('tests/v04-baseline.json'))for(const profile of ['HARD','SOFT','BOUNCY']){
  const s=new SpecimenSession().select(read(item.file)),b=s.body,hit=()=>pickMesh(s.mesh,[0,0,3],[0,0,-1]),run=n=>{for(let i=0;i<n;i++)b.step(1/120);};
  const hash=()=>createHash('sha256').update(JSON.stringify({vertices:s.mesh.vertices,pose:b.pose(),velocity:b.velocity,offsets:b.offsets,offsetVelocity:b.offsetVelocity})).digest('hex');
  b.setFeel(profile);b.press(hit());b.release(0);run(9);const tap=hash();run(240);b.press(hit());run(120);const held=hash();b.beginPull(hit());b.pullTo([.15,.07,-.03]);run(48);const pull=hash();b.release(1);run(360);const restored=hash();b.beginDrag();b.drag(85,-30,.1,390);b.release();run(60);
  assert.deepEqual({tap,held,pull,restored,flick:hash()},item.traces[profile],`${item.id} ${profile}`);
 }
});
for(const definition of forms){
 test(`${definition.name}: authored mesh, finite normals, static rendering and camera bounds`,()=>{
  assert.equal(validateSpecimen(definition),definition);
  const session=new SpecimenSession().select(definition),{mesh,body}=session;
  assert.equal(body.touchEnabled,false);assert.equal(body.offsets,undefined);assert.equal(body.press,undefined);assert.equal(mesh.deformation,undefined);
  assert.equal(mesh.rest.length,definition.parts.reduce((s,p)=>s+p.geometry.vertices.length,0));
  assert.equal(mesh.triangles.length,definition.parts.reduce((s,p)=>s+p.geometry.triangles.length,0));
  const packed=packedMesh(mesh);assert.ok(packed.every(Number.isFinite));
  for(let i=3;i<packed.length;i+=9)assert.ok(Math.abs(Math.hypot(...packed.slice(i,i+3))-1)<1e-6);
  const before=structuredClone(mesh.vertices),camera=new Camera();
  for(const [w,h] of [[320,640],[390,844],[844,390],[768,1024],[1366,1024]]){
   camera.resize(w,h,mesh.radius);const t=Math.tan(camera.fov/2);
   for(let k=0;k<18;k++)for(const v of mesh.rest){const p=rotate(multiply(axisAngle([1,1,1],k*.33),body.pose()),v),d=camera.distance-p[2];assert.ok(Math.abs(p[0]/(d*t*camera.aspect))<.94);assert.ok(Math.abs(p[1]/(d*t))<.94);}
  }
  body.hold();run(body,1);body.beginDrag();body.drag(87,-32,.05,390);body.release();run(body,5);
  assert.deepEqual(mesh.vertices,before,'STATIC has no vertex update');assert.ok(Math.hypot(...body.velocity)<.002);
  body.resetPose(definition.display.orientation);assert.deepEqual(body.pose(),norm(definition.display.orientation));assert.deepEqual(body.velocity,[0,0,0]);assert.deepEqual(body.wobble,[0,0,0]);
  const raster=previewRaster(definition);assert.ok(pixelCount(raster)>400);assert.ok(raster.pixels.every(Number.isFinite));
 });
}
test('DENT retains a recessed surface and is not replaced by its convex hull',()=>{
 const mesh=createSpecimen(forms.find(d=>d.id==='dent')),hit=pickMesh(mesh,[0,3,0],[0,-1,0]);assert.ok(hit);
 assert.ok(Math.abs((3-hit.distance)-(-.14))<1e-6);assert.ok(normalAt(mesh,hit)[1]>.3);
 assert.ok(mesh.triangles.some(tri=>{const [a,b,c]=tri.indices.map(i=>mesh.rest[i]),n=norm(cross(sub(b,a),sub(c,a)));return mesh.rest.some(p=>dot(n,sub(p,a))>.1);}),'genuine nonconvex halfspaces');
});
test('RING is a closed torus with a through-hole in both picking and depth preview',()=>{
 const d=forms.find(d=>d.id==='ring'),mesh=createSpecimen(d);
 assert.equal(pickMesh(mesh,[0,0,3],[0,0,-1]),null);assert.ok(pickMesh(mesh,[.73,0,3],[0,0,-1]));
 const r=previewRaster(d);assert.equal(r.pixels[(100*200+100)*4+3],0,'background visible through hole');
 const edges=new Set(mesh.triangles.flatMap(t=>t.indices.map((i,j)=>[i,t.indices[(j+1)%3]].sort((a,b)=>a-b).join(':'))));
 assert.equal(mesh.rest.length-edges.size+mesh.triangles.length,0,'torus Euler characteristic');
});
test('BOWL includes distinct inner floor, outer base and rim with correct winding',()=>{
 const d=forms.find(d=>d.id==='bowl'),mesh=createSpecimen(d),inside=pickMesh(mesh,[0,3,0],[0,-1,0]),outside=pickMesh(mesh,[0,-3,0],[0,1,0]);
 assert.ok(Math.abs(3-inside.distance+.42)<1e-6);assert.ok(Math.abs(-3+outside.distance+.66)<1e-6);
 assert.ok(normalAt(mesh,inside)[1]>.5);assert.ok(normalAt(mesh,outside)[1]<-.5);
 assert.ok(mesh.triangles.some(t=>t.indices.every(i=>Math.abs(mesh.rest[i][1]-.47)<1e-6)),'authored lip joins inner and outer walls');
 assert.ok(pixelCount(previewRaster(d))>1000);
});
test('LEAF keeps open boundaries and displays both sides with reversed lighting normals',()=>{
 const d=forms.find(d=>d.id==='leaf'),mesh=createSpecimen(d),packed=packedMesh(mesh),camera=new Camera();camera.resize(200,200,mesh.radius);
 assert.equal(d.parts[0].geometry.surface,'open');assert.equal(packed.length,mesh.triangles.length*54);
 const front=rasterMesh(mesh,[0,0,0,1],camera),back=rasterMesh(mesh,axisAngle([0,1,0],Math.PI),camera);
 assert.ok(pixelCount(front)>1000);assert.ok(pixelCount(back)>1000);
 assert.ok(pickMesh(mesh,[0,0,3],[0,0,-1]));assert.ok(pickMesh(mesh,[0,0,-3],[0,0,1]));
 for(let i=0;i<packed.length;i+=54)for(let j=0;j<3;j++)for(let k=0;k<3;k++)assert.ok(Math.abs(packed[i+j*9+3+k]+packed[i+27+(2-j)*9+3+k])<1e-6);
});
test('MOBILE bakes seven independent part transforms and preserves per-part colors',()=>{
 const d=forms.find(d=>d.id==='mobile'),mesh=createSpecimen(d);assert.equal(mesh.parts.length,7);
 for(const [index,part] of d.parts.entries()){
  const {start}=mesh.parts[index],t=part.transform,expected=scale(add(rotate(t.orientation,part.geometry.vertices[0].map((v,k)=>v*t.scale[k])),t.position),d.display.scale);
  assert.deepEqual(mesh.rest[start],expected);assert.ok(mesh.triangles.some(tri=>tri.part===part.id));
 }
 assert.ok(new Set(mesh.triangles.map(t=>t.material.color.join(':'))).size>=4);
});
class Canvas {
 constructor(){this.capture=new Set();this.listeners=new Map();this.classList={add(){},remove(){}};}
 addEventListener(k,v){this.listeners.set(k,v);}removeEventListener(k){this.listeners.delete(k);}focus(){}getBoundingClientRect(){return {width:390,height:844};}setPointerCapture(i){this.capture.add(i);}hasPointerCapture(i){return this.capture.has(i);}releasePointerCapture(i){this.capture.delete(i);}
}
const event=(x,y,t,id=1)=>({clientX:x,clientY:y,timeStamp:t,pointerId:id,button:0,isPrimary:true,preventDefault(){}});
test('STATIC tap/hold has no deformation; drag after long hold rotates, including background/hole',()=>{
 const s=new SpecimenSession().select(forms[1]),canvas=new Canvas(),input=new PointerInput(canvas,s.body,()=>null,()=>{},()=>{throw Error('STATIC must not map a pull');}),before=structuredClone(s.mesh.vertices);
 input.down(event(100,200,0));assert.equal(input.pointer.mode,'view');run(s.body,1);input.step(1);input.move(event(104,202,1000));assert.equal(input.pointer.mode,'view');
 input.move(event(160,220,1040));assert.equal(input.pointer.mode,'rotate');assert.ok(Math.hypot(...s.body.velocity)>0);input.up(event(180,222,1060));assert.equal(input.pointer,null);assert.equal(canvas.capture.size,0);run(s.body,.3);assert.deepEqual(s.mesh.vertices,before);
 input.down(event(120,200,1200));input.cancel(2);assert.ok(input.pointer);input.cancel(1);assert.equal(input.pointer,null);assert.equal(s.body.held,false);assert.deepEqual(s.body.velocity,[0,0,0]);input.destroy();assert.equal(canvas.listeners.size,0);
});
test('capabilities are independent of schema: legacy STATIC and explicit convex TOUCH share core rotation',()=>{
 const legacy=structuredClone(definitions[0]);legacy.behaviors={};let s=new SpecimenSession().select(legacy);assert.equal(s.body.touchEnabled,false);assert.deepEqual(s.mesh.rest,createSpecimen(definitions[0]).rest);
 const explicit=structuredClone(forms[0]);explicit.id='touch-tetra';explicit.parts=[{id:'solid',transform:{position:[0,0,0],orientation:[0,0,0,1],scale:[1,1,1]},material:{kind:'matte',color:[.6,.5,.4],variation:0,doubleSided:false},geometry:{surface:'closed',vertices:[[.6,.6,.6],[.6,-.6,-.6],[-.6,.6,-.6],[-.6,-.6,.6]],triangles:[[0,1,2],[0,3,1],[0,2,3],[1,3,2]]}}];
 explicit.behaviors={touch:{profile:'SOFT',overrides:{}}};s=new SpecimenSession().select(explicit);assert.equal(s.body.touchEnabled,true);
 const hit=pickMesh(s.mesh,[0,0,3],[0,0,-1]);s.body.press(hit);s.body.release();run(s.body,.08);assert.ok(Math.max(...s.body.offsets.map(v=>Math.hypot(...v)))>.01);run(s.body,3);assert.ok(Math.max(...s.body.offsets.map(v=>Math.hypot(...v)))<3e-6);
 for(const deformation of [null,[],{cornerCompliance:null},{centerCompliance:NaN},{limits:null},{unknown:1}]){const bad=structuredClone(explicit);bad.behaviors.touch.deformation=deformation;assert.throws(()=>createSpecimen(bad),/Invalid specimen/);}
 const unsupported=structuredClone(forms[1]);unsupported.behaviors={touch:{profile:'SOFT',overrides:{}}};assert.throws(()=>createSpecimen(unsupported),/Invalid specimen/,'existing physics is not silently attached to concavity');
});
test('all registered selections discard old input/rotation/deformation without contaminating the next body',()=>{
 const s=new SpecimenSession(),canvas=new Canvas();let input;
 for(const d of [...definitions,...definitions.slice().reverse()]){
  const old=s.body;input?.destroy();s.select(d);assert.equal(canvas.capture.size,0);assert.equal(old?.held??false,false);assert.deepEqual(s.body.velocity,[0,0,0]);assert.deepEqual(s.body.orientation,d.display.orientation);assert.deepEqual(s.mesh.vertices,s.mesh.rest);
  const hit=pickMesh(s.mesh,[0,0,3],[0,0,-1]);input=new PointerInput(canvas,s.body,()=>hit);input.down(event(100,200,0));input.move(event(180,230,50));
 }
 input.destroy();s.clear();assert.equal(canvas.capture.size,0);assert.equal(s.body,null);
});
test('v2 rejects broken indices, nonfinite/degenerate geometry, normals, transforms and materials',()=>{
 const changes=[d=>d.parts[0].geometry.triangles[0][0]=999,d=>d.parts[0].geometry.triangles[0][0]=.5,d=>d.parts[0].geometry.triangles[0][0]=NaN,d=>d.parts[0].geometry.vertices[0][0]=Infinity,d=>d.parts[0].geometry.vertices[0]=new Array(3),d=>d.parts[0].geometry.triangles[0][1]=d.parts[0].geometry.triangles[0][0],d=>d.parts[0].geometry.vertices[d.parts[0].geometry.triangles[0][1]]=d.parts[0].geometry.vertices[d.parts[0].geometry.triangles[0][0]],d=>d.parts[0].geometry.triangles.push(d.parts[0].geometry.triangles[0]),d=>d.parts[0].geometry.triangles.pop(),d=>d.parts[0].geometry.triangles[0].reverse(),d=>d.parts[0].geometry.surface='automatic',d=>d.parts[0].geometry.normals=[],d=>d.parts[0].transform.scale=[-1,1,1],d=>d.parts[0].transform.scale=[0,1,1],d=>d.parts[0].transform.position=[NaN,0,0],d=>d.parts[0].transform.orientation=[0,0,0,0],d=>d.parts[0].material.color=[2,0,0],d=>d.parts[0].material.doubleSided='yes',d=>d.parts[0].material.triangleColors=[],d=>d.parts.push(d.parts[0]),d=>delete d.behaviors,d=>d.behaviors={motion:{type:'unknown'}},d=>d.behaviors={touch:{profile:'toString',overrides:{}}}];
 for(const change of changes){const d=structuredClone(forms[1]);change(d);assert.throws(()=>createSpecimen(d),/Invalid specimen/);}
 const old=structuredClone(definitions[0]);old.geometry.faces.pop();assert.throws(()=>createSpecimen(old),/Invalid specimen/,'v1 closed convex check remains enforced');
});
test('optional authored normals use inverse transpose under nonuniform part scale',()=>{
 const d=structuredClone(forms[3]),n=norm([1,1,1]),q=axisAngle([0,1,0],.7);d.parts[0].geometry={surface:'open',vertices:[[0,0,1],[1,0,0],[0,1,0]],triangles:[[0,1,2]],normals:[n,n,n]};d.parts[0].transform.orientation=q;d.parts[0].transform.scale=[.8,.5,.4];
 const packed=packedMesh(createSpecimen(d)),expected=norm(rotate(q,n.map((v,k)=>v/d.parts[0].transform.scale[k])));
 for(let k=0;k<3;k++)assert.ok(Math.abs(packed[3+k]-expected[k])<1e-6);
 d.parts[0].geometry.normals[0]=scale(n,-1);assert.throws(()=>createSpecimen(d),/normal disagrees/);
});
test('depth raster chooses the near triangle independently of authoring order',()=>{
 const material={color:[1,0,0],variation:0},mesh={vertices:[[-.5,-.5,0],[.5,-.5,0],[0,.5,0],[-.5,-.5,.2],[.5,-.5,.2],[0,.5,.2]],triangles:[{indices:[0,1,2],face:0,material},{indices:[3,4,5],face:1,material:{color:[0,1,0],variation:0}}]},camera=new Camera();camera.resize(200,200);
 const a=rasterMesh(mesh,[0,0,0,1],camera);mesh.triangles.reverse();const b=rasterMesh(mesh,[0,0,0,1],camera);assert.deepEqual(a.pixels,b.pixels);assert.ok(a.pixels[(100*200+100)*4+1]>100);assert.equal(a.pixels[(100*200+100)*4],0);
});
test('explicit surfaces admit separate connected components without hulls or connecting triangles',()=>{
 const d=structuredClone(forms[1]),g={surface:'closed',vertices:[],triangles:[]};
 const vertices=[[.18,.18,.18],[.18,-.18,-.18],[-.18,.18,-.18],[-.18,-.18,.18]],triangles=[[0,1,2],[0,3,1],[0,2,3],[1,3,2]];
 for(const x of [-.5,.5]){const start=g.vertices.length;g.vertices.push(...vertices.map(v=>add(v,[x,0,0])));g.triangles.push(...triangles.map(t=>t.map(i=>i+start)));}
 d.parts[0].geometry=g;const mesh=createSpecimen(d);assert.equal(mesh.rest.length,8);assert.equal(mesh.triangles.length,8);assert.equal(pickMesh(mesh,[0,0,3],[0,0,-1]),null);
});
test('every guide JSON example is executable independently of gallery DOM',()=>{
 const guide=readFileSync(new URL('COLLECTION_GUIDE.md',root),'utf8'),examples=[...guide.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m=>JSON.parse(m[1]));
 assert.equal(examples.length,2);for(const d of examples)assert.ok(new SpecimenSession().select(d).mesh.triangles.length>0);
});
test('a new independent mesh file plus one registration loads without any engine or DOM edits',async()=>{
 const extra=structuredClone(forms[1]);extra.id='new-loop';extra.name='NEW LOOP';
 const list={schema:manifest.schema,items:[...manifest.items,{id:extra.id,file:'objects/new-loop.json',number:Math.max(...manifest.items.map((item,index)=>item.number??index))+1}]};
 const request=async url=>({ok:true,json:async()=>url.pathname.endsWith('collection.json')?list:url.pathname.endsWith('new-loop.json')?extra:read(url.pathname.split('/').slice(-2).join('/'))});
 const items=await loadCollection(new URL('https://local.test/'),request);assert.equal(items.length,manifest.items.length+1);assert.ok(items.every(i=>i.definition));assert.ok(pixelCount(previewRaster(items.at(-1).definition))>400);
});
