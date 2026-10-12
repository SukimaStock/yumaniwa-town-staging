import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SpecimenSession} from '../engine/session.js';
import {createSpecimen} from '../engine/specimen.js';
import {ManipulationPlayer} from '../engine/manipulation.js';
import {manipulationMapping} from '../engine/manipulation-mapping.js';
import {PointerInput} from '../engine/interaction.js';
import {Camera} from '../engine/camera.js';
import {composePartPose} from '../engine/parts.js';
import {packedMesh,pickMesh} from '../engine/geometry.js';
import {previewRaster,previewSvg} from '../preview.js';
import {add,sub,scale,rotate,inverse,norm,axisAngle,multiply} from '../engine/math.js';
import {loadCollection} from '../collection.js';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const manifest=read('collection.json'),definitions=manifest.items.map(i=>read(i.file)),miniatures=definitions.slice(56,59),hash=x=>createHash('sha256').update(x).digest('hex');
const near=(a,b,t=1e-7)=>{if(Array.isArray(a)||ArrayBuffer.isView(a)){assert.equal(a.length,b.length);a.forEach((v,i)=>near(v,b[i],t));}else assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);};
const run=(s,n=120)=>{for(let i=0;i<n;i++)s.step(1/120);};
const rect={left:12,top:20,width:390,height:844};
function setup(d){const s=new SpecimenSession().select(d),camera=new Camera();camera.resize(rect.width,rect.height,s.assembly.radius);return {s,camera};}
const samples={door:[.88,-.02,.13],crank:[.47,0,.22],drawer:[0,.01,.51]};
function pointAt(player,part,c,value,local){const pose=composePartPose(part,c.type==='linear'?null:c,c.type==='linear'?0:value,c.type==='linear'?scale(c.axis,value):[0,0,0]);return scale(add(rotate(pose.orientation,local),pose.position),player.scale);}
function gesture(s,camera,local){
 const player=s.manipulation,c=player.controls[0],part=player.parts.find(p=>p.id===c.part),view=s.body.pose(),point=pointAt(player,part,c,c.value,local),screen=camera.project(point,rect,view);
 const ray=camera.ray(...screen,rect,view),hit=player.pick(ray.origin,ray.direction);assert.equal(hit?.part,c.part,'the grabbed control must actually be visible');
 const pose=player.pose(part),anchor=rotate(inverse(pose.orientation),sub(scale(hit.point,1/player.scale),pose.position));
 player.grab(c.part);return {c,part,view,anchor,screen,map:manipulationMapping(player,hit,...screen,rect,view,camera)};
}
test('56 source blobs/registrations/geometry/packed normals/colors/initial previews and Motion traces remain identical to main6de4dc0',()=>{
 const baseline=read('tests/v06-baseline.json');assert.equal(baseline.specimens.length,56);
 for(const [i,b] of baseline.specimens.entries()){
  assert.deepEqual(manifest.items[i],b.entry);assert.equal(hash(readFileSync(new URL(b.entry.file,root))),b.source);
  const d=definitions[i],s=new SpecimenSession().select(d),p=packedMesh(s.mesh);assert.equal(hash(JSON.stringify(s.mesh)),b.mesh);assert.equal(hash(Buffer.from(p.buffer)),b.packed);
  assert.equal(hash(d.schema.endsWith('/1')?previewSvg(d):previewRaster(d).pixels),b.preview);assert.equal(s.manipulation,null);
  if(s.motion)for(const [j,t] of [0,.8,2,7,80].entries()){s.motion.time=t;assert.equal(hash(JSON.stringify({draw:s.motion.drawCommands(s.body.pose()),snapshot:s.motion.snapshot(),radius:s.motion.radius,packed:Array.from(s.motion.packed)})),b.motion[j]);}
 }
});
test('57–59 append without modifying numbering; all69 load and expose the expected control capability',()=>{
 assert.deepEqual(manifest.items.slice(56,59),[{id:'door',file:'objects/door.json',number:57},{id:'crank',file:'objects/crank.json',number:58},{id:'drawer',file:'objects/drawer.json',number:59}]);assert.equal(manifest.items.length,69);
 assert.deepEqual(miniatures.map(d=>d.behaviors.manipulation.controls[0].type),['hinge','rotate','linear']);
 for(const d of definitions){const s=new SpecimenSession().select(d);assert.ok(s.mesh.triangles.length);if(d.behaviors?.manipulation){assert.equal(s.body.touchEnabled,false);assert.ok(s.assembly===s.manipulation);}}
});
for(const d of miniatures){
 test(`${d.id}: actual posed pick, gradual forward/reverse pointer mapping, intermediate hold, immutable buffers, reset`,()=>{
  const {s,camera}=setup(d),player=s.manipulation,before=structuredClone(s.mesh),packed=player.packed.slice(),source=JSON.stringify(d),g=gesture(s,camera,samples[d.id]);
  const {c,part,view,anchor,map}=g,initial=c.value,initialCommands=player.drawCommands(view).map(c=>Array.from(c.model));near(map.delta(...g.screen),0);
  const target=c.type==='rotate'?initial+1.1:c.type==='hinge'?-.85:.40;
  for(let n=1;n<=14;n++){
   const desired=initial+(target-initial)*n/14,screen=camera.project(pointAt(player,part,c,desired,anchor),rect,view);
   player.moveBy(c.part,map.delta(...screen),1/60);
  }
  near(c.value,target,.01);player.release();const held=c.value;run(s,720);near(c.value,held);assert.equal(player.active,null);
  const second=gesture(s,camera,samples[d.id]),returnTo=c.type==='rotate'?held-.7:c.type==='hinge'?-.30:.12;
  for(let n=1;n<=12;n++){const desired=held+(returnTo-held)*n/12,screen=camera.project(pointAt(player,second.part,c,desired,second.anchor),rect,second.view);player.moveBy(c.part,second.map.delta(...screen),1/60);}
  near(c.value,returnTo,.015);player.release();assert.notDeepEqual(player.drawCommands(view).map(c=>Array.from(c.model)),initialCommands);
  assert.deepEqual(player.packed,packed);assert.deepEqual(s.mesh,before);assert.equal(JSON.stringify(d),source);
  const snap=player.snapshot(),reference=pickMesh(snap,[0,0,4],[0,0,-1]),hit=player.pick([0,0,4],[0,0,-1]);assert.equal(Boolean(hit),Boolean(reference));if(hit)near(hit.point,reference.point);
  s.resetPose();near(c.value,initial);assert.equal(player.active,null);assert.deepEqual(player.drawCommands(view).map(c=>Array.from(c.model)),initialCommands);
  const preview=previewRaster(d);assert.ok(preview.pixels.filter((_,i)=>i%4===3&&preview.pixels[i]>0).length>400);
 });
 test(`${d.id}: full swept bounds, rotated/oblique screen mappings and degenerate axes stay finite`,()=>{
  const {s,camera}=setup(d),p=s.manipulation,c=p.controls[0];
  for(const q of [d.display.orientation,axisAngle([0,1,0],.25),axisAngle([1,0,0],.35),multiply(axisAngle([1,0,0],-.3),axisAngle([0,1,0],-.7))]){
   s.body.resetPose(q);const g=gesture(s,camera,samples[d.id]);for(const [dx,dy] of [[12,8],[-12,-8],[10000,-10000],[-10000,10000]]){p.moveBy(c.part,g.map.delta(g.screen[0]+dx,g.screen[1]+dy),1/120);assert.ok(Number.isFinite(c.value));if(c.type!=='rotate')assert.ok(c.value>=c.min&&c.value<=c.max);}p.cancel();p.reset();
  }
  for(const [width,height] of [[320,640],[390,844],[844,390],[768,1024]]){
   camera.resize(width,height,p.radius);const tangent=Math.tan(camera.fov/2);
   for(let n=0;n<=24;n++){
    c.value=c.type==='rotate'?n*Math.PI/12:c.min+(c.max-c.min)*n/24;
    for(const v of p.snapshot().rest){assert.ok(Math.hypot(...v)<=p.radius+1e-8);const w=rotate(axisAngle([1,1,1],n*.31),v),z=camera.distance-w[2];assert.ok(Math.abs(w[0]/(z*tangent*camera.aspect))<.94);assert.ok(Math.abs(w[1]/(z*tangent))<.94);}
   }
  }
 });
}
test('rotations unwrap continuously through ±π and multiple complete turns in both directions',()=>{
 const {s,camera}=setup(miniatures[1]),p=s.manipulation,g=gesture(s,camera,samples.crank),start=g.c.value;
 for(const sign of [1,-1])for(let n=0;n<180;n++){
  const target=g.c.value+sign*.09,screen=camera.project(pointAt(p,g.part,g.c,target,g.anchor),rect,g.view);p.moveBy(g.c.part,g.map.delta(...screen),1/60);
 }
 near(g.c.value,start,1e-5);assert.ok(Number.isFinite(g.c.value));p.release();run(s,300);near(g.c.value,start,1e-5);
});
test('hinge/linear stop at both limits, retain partial values and reverse immediately after overshooting',()=>{
 for(const d of [miniatures[0],miniatures[2]]){
  const {s,camera}=setup(d),p=s.manipulation,g=gesture(s,camera,samples[d.id]),c=g.c;
  p.moveBy(c.part,1e8,.01);near(c.value,c.max);p.moveBy(c.part,-.02,.01);near(c.value,c.max-.02);p.moveBy(c.part,-1e8,.01);near(c.value,c.min);p.moveBy(c.part,.03,.01);near(c.value,c.min+.03);p.release();run(s,1200);near(c.value,c.min+.03);
 }
});
test('optional rotate inertia is bounded, decays, and cancellation stops it without restoring the angle',()=>{
 const {s}=setup(miniatures[1]),p=s.manipulation,c=p.controls[0];p.setOption(c.part,'inertia',.5);p.grab(c.part);p.moveBy(c.part,.25,.01);assert.ok(Math.abs(c.velocity)<=6);p.release();assert.ok(c.velocity>0);const start=c.value;run(s,60);assert.ok(c.value>start&&c.value<start+.5);run(s,600);near(c.velocity,0);const held=c.value;run(s,1200);near(c.value,held);p.cancel();near(c.value,held);p.reset();near(c.value,c.initial);
});
class Canvas{
 constructor(){this.capture=new Set();this.listeners=new Map();this.classList={add(){},remove(){}};}
 addEventListener(k,v){this.listeners.set(k,v);}removeEventListener(k){this.listeners.delete(k);}focus(){}getBoundingClientRect(){return rect;}setPointerCapture(id){this.capture.add(id);}hasPointerCapture(id){return this.capture.has(id);}releasePointerCapture(id){this.capture.delete(id);}
}
const event=(x,y,timeStamp,pointerId=1)=>({clientX:x,clientY:y,timeStamp,pointerId,button:0,isPrimary:true,preventDefault(){}});
test('part capture latches exact target, responds before the rotation threshold, and release/cancel/lost capture do not leave grabs',()=>{
 const {s,camera}=setup(miniatures[0]),canvas=new Canvas(),p=s.manipulation,c=p.controls[0];let pickCount=0;
 const pick=(x,y)=>{pickCount++;const r=camera.ray(x,y,rect,s.body.pose());return p.pick(r.origin,r.direction);};
 const input=new PointerInput(canvas,s.body,pick,()=>{},null,{controller:p,map:(hit,x,y,r,v)=>manipulationMapping(p,hit,x,y,r,v,camera)});
 const part=p.parts.find(part=>part.id===c.part),point=pointAt(p,part,c,c.value,samples.door),screen=camera.project(point,rect,s.body.pose());s.body.velocity=[1,2,0];s.body.wobble=[.003,0,0];const visiblePose=s.body.pose();
 const start=camera.project(point,rect,visiblePose);input.down(event(...start,0));assert.equal(input.pointer.mode,'part');assert.equal(p.active,c.part);near(s.body.pose(),visiblePose);near(s.body.velocity,[0,0,0]);near(c.value,c.initial);assert.equal(canvas.capture.size,1);
 input.down({...event(10,20,10,2),isPrimary:false});assert.equal(input.pointer.id,1);
 input.move(event(start[0]-5,start[1],20));assert.ok(c.value!==c.initial,'small direct movements respond immediately');const view=s.body.pose();
 input.move(event(-10000,12000,40));assert.equal(input.pointer.mode,'part');assert.equal(pickCount,1);near(s.body.pose(),view);
 input.up(event(-10000,12000,50));assert.equal(input.pointer,null);assert.equal(p.active,null);assert.equal(canvas.capture.size,0);const held=c.value;run(s);near(c.value,held);
 input.down(event(...screen,100));input.cancel(2);assert.ok(input.pointer);input.listeners.lostpointercapture({pointerId:1});assert.equal(input.pointer,null);assert.equal(p.active,null);input.destroy();assert.equal(canvas.listeners.size,0);
});
test('fixed/background gestures keep whole rotation and flick; they never change a manual part',()=>{
 const {s}=setup(miniatures[2]),canvas=new Canvas(),p=s.manipulation,c=p.controls[0],initial=c.value;
 for(const hit of [null,{part:'housing',point:[0,0,0]}]){
  const input=new PointerInput(canvas,s.body,()=>hit,()=>{},null,{controller:p,map:()=>assert.fail('fixed parts must not create manual mappings')});
  input.down(event(100,200,0));assert.equal(input.pointer.mode,'view');input.move(event(160,230,50));assert.equal(input.pointer.mode,'rotate');input.up(event(190,230,70));assert.ok(Math.hypot(...s.body.velocity)>0);run(s,60);near(c.value,initial);input.destroy();
 }
});
test('selection is atomic, cancels old grabs/inertia, and reset/reentry discard previous values',()=>{
 const s=new SpecimenSession();for(const d of [...miniatures,...definitions.slice(0,56),...miniatures]){
  const old=s.manipulation;s.select(d);if(old){assert.equal(old.active,null);assert.ok(old.controls.every(c=>c.velocity===0));}
  if(s.manipulation){const p=s.manipulation,c=p.controls[0];near(c.value,c.initial);p.grab(c.part);p.moveBy(c.part,.2,.01);}
 }
 const p=s.manipulation,b=s.body,bad=structuredClone(miniatures[0]);bad.behaviors.manipulation.controls[0].part='missing';assert.throws(()=>s.select(bad));assert.equal(s.manipulation,p);assert.equal(s.body,b);s.resetPose();assert.equal(p.active,null);p.controls.forEach(c=>near(c.value,c.initial));s.clear();assert.equal(s.assembly,null);assert.equal(p.active,null);
});
test('auto Motion and manual controls compose on distinct parts; competing control and Touch coexistence are rejected',()=>{
 const d=structuredClone(miniatures[1]);d.behaviors.motion={version:1,tracks:[{part:'bearing',type:'spin',axis:[0,0,1],pivot:[0,0,0],speed:.3,initialAngle:.2}]};const s=new SpecimenSession().select(d),p=s.manipulation,c=p.controls[0];p.grab(c.part);p.moveBy(c.part,.3,.01);p.release();const held=c.value,initial=p.drawCommands(s.body.pose());run(s,240);near(c.value,held);assert.notDeepEqual(p.drawCommands(s.body.pose()).find(c=>c.id==='bearing').model,initial.find(c=>c.id==='bearing').model);
 d.behaviors.motion.tracks[0].part='handle';assert.throws(()=>createSpecimen(d),/same part/);delete d.behaviors.motion;d.behaviors.touch={profile:'SOFT',overrides:{}};assert.throws(()=>createSpecimen(d),/Touch \+ manipulation/);
});
test('malformed manual settings, fields, axes, references, ranges, initial values and schema are rejected',()=>{
 const changes=[d=>d.behaviors.manipulation=null,d=>d.behaviors.manipulation.version=2,d=>d.behaviors.manipulation.extra=true,d=>d.behaviors.manipulation.controls=[],d=>d.behaviors.manipulation.controls=new Array(2),d=>d.behaviors.manipulation.controls[0].type='toString',d=>d.behaviors.manipulation.controls[0].part='missing',d=>d.behaviors.manipulation.controls.push(d.behaviors.manipulation.controls[0]),d=>d.behaviors.manipulation.controls[0].axis=[0,0,0],d=>d.behaviors.manipulation.controls[0].axis=new Array(3),d=>d.behaviors.manipulation.controls[0].axis=[0,2,0],d=>d.behaviors.manipulation.controls[0].pivot=[Infinity,0,0],d=>d.behaviors.manipulation.controls[0].initial=NaN,d=>d.behaviors.manipulation.controls[0].initial=5,d=>d.behaviors.manipulation.controls[0].min=1,d=>d.behaviors.manipulation.controls[0].max=5,d=>d.behaviors.manipulation.controls[0].sensitivity=0,d=>d.behaviors.manipulation.controls[0].sensitivity=Infinity,d=>d.behaviors.manipulation.controls[0].spring=1,d=>delete d.behaviors.manipulation.controls[0].initial];
 for(const change of changes){const d=structuredClone(miniatures[0]);change(d);assert.throws(()=>createSpecimen(d),/Invalid specimen/);}
 for(const [key,value] of [['inertia',2],['damping',0],['inertia',NaN]]){const d=structuredClone(miniatures[1]);d.behaviors.manipulation.controls[0][key]=value;assert.throws(()=>createSpecimen(d),/rotate settings/);}
 const legacy=structuredClone(definitions[0]);legacy.behaviors=miniatures[0].behaviors;assert.throws(()=>createSpecimen(legacy),/manipulation/);
 const bounds=structuredClone(miniatures[1]);bounds.behaviors.manipulation.controls[0].pivot=[2,2,2];assert.throws(()=>createSpecimen(bounds),/swept display bounds/);
});
test('debug options/ranges remain local, safe and bounded; source data is unaffected',()=>{
 const d=miniatures[0],source=JSON.stringify(d),{s}=setup(d),p=s.manipulation,c=p.controls[0];assert.equal(p.setRange(c.part,0,-1),false);assert.equal(p.setRange(c.part,-Infinity,0),false);assert.equal(p.setOption(c.part,'sensitivity',9),false);assert.equal(p.setOption(c.part,'spring',1),false);assert.equal(p.setRange(c.part,-2,0),true);assert.equal(p.setOption(c.part,'sensitivity',1.3),true);p.grab(c.part);p.moveBy(c.part,-20,.01);near(c.value,-2);assert.ok(p.snapshot().rest.every(v=>Math.hypot(...v)<=p.radius+1e-8));assert.equal(JSON.stringify(d),source);
});
test('manual picking respects rendered one-sided surfaces and explicit two-sided backs',()=>{
 const d=structuredClone(miniatures[1]);d.parts=[d.parts.at(-1)];d.parts[0].geometry={surface:'open',vertices:[[-.4,-.4,0],[.4,-.4,0],[0,.4,0]],triangles:[[0,1,2]]};d.parts[0].transform.position=[0,0,0];d.behaviors.manipulation.controls[0].initial=0;
 let p=new ManipulationPlayer(d);assert.ok(p.pick([0,0,3],[0,0,-1]));assert.equal(p.pick([0,0,-3],[0,0,1]),null);
 d.parts[0].material.doubleSided=true;p=new ManipulationPlayer(d);assert.ok(p.pick([0,0,-3],[0,0,1]));
});
test('a new manual JSON and registration loads without engine or UI edits',async()=>{
 const extra=structuredClone(miniatures[2]);extra.id='another-drawer';extra.name='ANOTHER DRAWER';extra.parts[1].id='moving-piece';extra.behaviors.manipulation.controls[0].part='moving-piece';
 const list={schema:manifest.schema,items:[...manifest.items,{id:extra.id,file:'objects/another-drawer.json',number:Math.max(...manifest.items.map((item,i)=>item.number??i))+1}]};const request=async url=>({ok:true,json:async()=>url.pathname.endsWith('collection.json')?list:url.pathname.endsWith('another-drawer.json')?extra:read(url.pathname.split('/').slice(-2).join('/'))});
 const items=await loadCollection(new URL('https://local.test/'),request);assert.equal(items.length,manifest.items.length+1);assert.ok(items.every(i=>i.definition));const s=new SpecimenSession().select(items.at(-1).definition);assert.equal(s.manipulation.controls[0].part,'moving-piece');
});

// Collection 04: retain v0.7 samples above; protect its three added blobs too.
test('all59 prior JSON/entries protected; Collection 04 appends ten unique numbers and all controls load',()=>{
 for(const [id,digest] of [["door", "e9e207115b8739ebb7f1b5d945a7b7550ba56f9e69d44f063ea8339eba7e7f27"], ["crank", "71359e438610b6bafdfe34ec7bb0b6b0473b887fc4d5784c22bc286755ba2f86"], ["drawer", "f6dc8d8b15582484f8a435770354c3f1e1685da27985419fc4987bfa61e18f65"]])assert.equal(hash(readFileSync(new URL(`objects/${id}.json`,root))),digest);
 assert.deepEqual(manifest.items.slice(59).map(i=>[i.number,i.id]),[[60, "keepsake"], [61, "folio"], [62, "awning"], [63, "spool"], [64, "petal-turntable"], [65, "tri-rotor"], [66, "riser"], [67, "shuttle-block"], [68, "twin-paddles"], [69, "dial-and-slide"]]);
 assert.deepEqual(definitions.slice(59).map(d=>d.behaviors.manipulation.controls.map(c=>c.type)),[['hinge'],['hinge'],['hinge'],['rotate'],['rotate'],['rotate'],['linear'],['linear'],['hinge','hinge'],['rotate','linear']]);
 for(const d of definitions.slice(59)){const s=new SpecimenSession().select(d),p=s.manipulation;for(const c of p.controls){assert.equal(c.inertia,0);const initial=c.value;p.grab(c.part);p.moveBy(c.part,.08,.1);p.release();const held=c.value;run(s,120);near(c.value,held);p.grab(c.part);p.moveBy(c.part,-.04,.1);p.cancel();if(c.type!=='rotate'){p.grab(c.part);p.moveBy(c.part,10,.1);near(c.value,c.max);p.moveBy(c.part,-10,.1);near(c.value,c.min);p.cancel();}s.resetPose();near(c.value,initial);}assert.ok(previewRaster(d).pixels.some(v=>v));}
});
