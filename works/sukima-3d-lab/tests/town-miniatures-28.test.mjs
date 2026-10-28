import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SpecimenSession} from '../engine/session.js';
import {previewRaster} from '../preview.js';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const manifest=read('collection.json'),baseline=read('tests/collection27-baseline.json');
const expected=["street-fire-hydrant"];
const definitions=manifest.items.slice(299,300).map(i=>read(i.file));
test('immutable299: every complete original entry and JSON byte hash remains; missing16/order and strict1000 cap',()=>{
 assert.equal(baseline.specimens.length,299);
 for(const [i,b] of baseline.specimens.entries()){
  assert.deepEqual(manifest.items[i],b.entry);
  assert.equal(createHash('sha256').update(readFileSync(new URL(b.entry.file,root))).digest('hex'),b.source);
 }
 assert.equal(manifest.items.length,310);assert.ok(manifest.items.length<=1000);
 const nums=manifest.items.map((i,n)=>i.number??n);
 assert.equal(new Set(nums).size,manifest.items.length);assert.equal(new Set(manifest.items.map(i=>i.id)).size,manifest.items.length);
 assert.ok(!nums.includes(16));assert.deepEqual(nums,[...Array(16).keys(),...Array.from({length:manifest.items.length-16},(_,i)=>i+17)]);
 for(const i of manifest.items){assert.equal(i.file,`objects/${i.id}.json`);assert.equal(read(i.file).id,i.id);assert.ok(new SpecimenSession().select(read(i.file)).mesh.triangles.length);}
});
test('Collection28 exact final identity and STATIC capability remain fixed',()=>{
 assert.deepEqual(manifest.items.slice(299,300),expected.map((id,i)=>({id,file:`objects/${id}.json`,number:300+i})));
 assert.deepEqual(definitions.map(d=>d.behaviors?.manipulation?'MANIPULATION':d.behaviors?.motion?'MOTION':d.feel?'TOUCH':'STATIC'),['STATIC']);
});
for(const d of definitions)test(`${d.id}: shape bounds, complete range/cycle, immutable mesh, hold/reverse/reset/switch`,()=>{
 const s=new SpecimenSession().select(d),source=JSON.stringify(d),before=JSON.stringify(s.mesh),p=s.manipulation;
 if(!p&&!s.motion){const pose=s.body.pose();assert.equal(s.body.touchEnabled,false);assert.equal(s.motion,null);for(let n=0;n<240;n++)s.step(1/120);assert.deepEqual(s.body.pose(),pose);s.body.drag(80,30,.1,390);assert.notDeepEqual(s.body.pose(),pose);s.resetPose();assert.deepEqual(s.body.pose(),pose);}
 if(p){for(const c of p.controls){
  const initial=c.value;p.grab(c.part);p.moveBy(c.part,.035,1/60);p.release();const held=c.value;
  for(let n=0;n<120;n++)s.step(1/120);assert.equal(c.value,held);
  p.grab(c.part);p.moveBy(c.part,-.02,1/60);assert.ok(c.value<held);p.cancel();
  for(let j=0;j<=144;j++){
   c.value=c.type==='rotate'?j*Math.PI/72:c.min+(c.max-c.min)*j/144;
   for(const v of p.snapshot().rest)assert.ok(Math.hypot(...v)<=p.radius+1e-7);
  }
  if(c.type!=='rotate'){p.grab(c.part);p.moveBy(c.part,100,1/60);assert.equal(c.value,c.max);p.moveBy(c.part,-.02,1/60);assert.ok(c.value<c.max);p.moveBy(c.part,-100,1/60);assert.equal(c.value,c.min);p.moveBy(c.part,.02,1/60);assert.ok(c.value>c.min);p.cancel();}
  s.resetPose();assert.equal(c.value,initial);assert.equal(p.active,null);
 }}
 if(s.motion){for(let j=0;j<=1440;j++){s.motion.time=j/12;for(const v of s.motion.snapshot().rest)assert.ok(Math.hypot(...v)<=s.motion.radius+1e-7);}s.resetPose();assert.equal(s.motion.time,0);}
 assert.equal(JSON.stringify(s.mesh),before);assert.equal(JSON.stringify(d),source);
 if(d.schema.endsWith('/2'))assert.ok(previewRaster(d).pixels.some(v=>v));
 s.clear();assert.equal(s.body,null);s.select(d);if(s.manipulation)for(const c of s.manipulation.controls)assert.equal(c.value,c.initial);
});
