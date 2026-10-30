import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateSpecimen} from '../engine/specimen.js';
import {SpecimenSession} from '../engine/session.js';
import {previewRaster} from '../preview.js';

const root=new URL('../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const manifest=read('collection.json');
const oldIds=["courtyard-rain-barrel","canal-lifebuoy-stand","street-drainpipe","garden-compost-bin","park-seed-feeder","pavement-hopscotch","roadside-traffic-mirror","garden-hose-reel","stair-iron-handrail","park-rope-swing"];
const oldBlobs=["f75311c9e53fe2324353efdf2b2dd2619fb7b424","84c6d60f3332344b08d82b7558ac0d10c3108f12","95c21ea31af0c51be0d0f97ae4656d60c2596168","ea915e49332f8cc4c0b79b3d74e06bea0c7d9185","07eb3e5342a6e64bc75d658611b07fd5752cf25e","5999df61c1638730724da3eae5b9fa5445a9da27","8de2a7a5447f751819fc28f0271c1b654771805d","b98f9e9dac329b47b39d1bb97978e55f24d0af9c","acabbfe3142f50f4f8e610cdd5906959494a3525","818b831cdb78da92108180893a789ccc8daccf94"];
const names=["neighborhood-noticeboard","park-seesaw","harbor-windsock","sidewalk-tactile-paving","bakery-pushcart","old-gas-streetlamp","market-hanging-scale","park-drinking-fountain","park-sandpit","courtyard-ping-pong"];
const specimens=manifest.items.slice(320,330).map(e=>read(e.file));

test('Collection31: keep first 320 registrations and previous ten Git object bytes intact',()=>{
  assert.equal(manifest.items.length,330);
  assert.ok(manifest.items.length<=1000);
  for(let i=0;i<oldIds.length;i++){
    const id=oldIds[i],entry=manifest.items[i+310];
    assert.deepEqual(entry,{id,file:'objects/'+id+'.json',number:311+i});
    const raw=readFileSync(new URL(entry.file,root));
    const blob=createHash('sha1').update(Buffer.from('blob '+raw.length+'\\0')).update(raw).digest('hex');
    assert.equal(blob,oldBlobs[i],id+' must not change');
  }
  const nums=manifest.items.map((e,i)=>e.number??i);
  assert.equal(new Set(nums).size,330);
  assert.equal(new Set(manifest.items.map(e=>e.id)).size,330);
  assert.ok(!nums.includes(16));
  assert.deepEqual(nums,[...Array(16).keys(),...Array.from({length:314},(_,i)=>i+17)]);
});

test('Collection31: exactly ten new STATIC outdoor miniatures at 321–330',()=>{
  assert.deepEqual(manifest.items.slice(320,330),names.map((id,i)=>({id,file:'objects/'+id+'.json',number:321+i})));
  for(const d of specimens){
    assert.equal(d.schema,'sukima3d-specimen/2');
    assert.equal(validateSpecimen(d),d);
    assert.deepEqual(d.behaviors,{});
    assert.ok(d.parts.length>=2);
  }
});
for(const d of specimens)test(d.id+': bounded mesh, rendered preview, rotate both directions and reset',()=>{
  const original=JSON.stringify(d),s=new SpecimenSession().select(d),mesh=JSON.stringify(s.mesh);
  assert.equal(s.body.touchEnabled,false);
  assert.equal(s.motion,null);
  assert.equal(s.manipulation,null);
  assert.ok(s.mesh.radius<=1.65);
  const raster=previewRaster(d);assert.ok(raster.pixels.some(v=>v));
  const initial=s.body.pose();
  for(let i=0;i<120;i++)s.step(1/120);
  assert.deepEqual(s.body.pose(),initial);
  s.body.drag(83,26,.1,390);assert.notDeepEqual(s.body.pose(),initial);
  s.resetPose();assert.deepEqual(s.body.pose(),initial);
  s.body.drag(-83,-26,.1,390);assert.notDeepEqual(s.body.pose(),initial);
  s.resetPose();assert.deepEqual(s.body.pose(),initial);
  assert.equal(JSON.stringify(s.mesh),mesh);
  assert.equal(JSON.stringify(d),original);
  s.clear();assert.equal(s.body,null);
});
