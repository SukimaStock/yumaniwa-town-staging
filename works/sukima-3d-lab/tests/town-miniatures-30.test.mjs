import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SpecimenSession} from '../engine/session.js';
import {previewRaster} from '../preview.js';
const root=new URL('../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const manifest=read('collection.json');
const oldIds=["stone-window-well","street-tree-grille","sidewalk-menu-easel","market-wooden-crate","bicycle-front-wheel","flowerpot-lavender","pebble-stepping-path","street-utility-box","stone-well-bucket","corner-street-signpost"];
const oldBlobs=["1260cbaca3b6555791005ed7b36bba88d8cc5869","bee9d6644472983ba07f58fe538eafe9342a0e14","e413a9507962e6ae18af5db383b609f348e890a2","808f8e751412547b201b838eead6ffbc29911115","6343400054d914dc9319d4e9e5c48755c6d93e46","835a5e5db48148dd9aef9ea59e4d4760402916ce","b9cc3f9397aec275a1efe73ffe864189a7bf4e11","01a90007e44e97680f4066b8bfaf068a113cd7ce","9f2d7ae5188bb5859f8ca184f635ce95d611cebd","e89e8590b9036a5cbeeaad7b891dcba63a6e72a0"];
const names=["courtyard-rain-barrel","canal-lifebuoy-stand","street-drainpipe","garden-compost-bin","park-seed-feeder","pavement-hopscotch","roadside-traffic-mirror","garden-hose-reel","stair-iron-handrail","park-rope-swing"];
const specimens=manifest.items.slice(310,320).map(e=>read(e.file));

test('Collection 30: all 310 prior registrations remain, prior ten object bytes immutable',()=>{
  assert.equal(manifest.items.length,330);
  assert.ok(manifest.items.length<=1000);
  for(let i=0;i<oldIds.length;i++){
    const id=oldIds[i],entry=manifest.items[i+300];
    assert.deepEqual(entry,{id,file:'objects/'+id+'.json',number:301+i});
    const raw=readFileSync(new URL(entry.file,root));
    const blob=createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex');
    assert.equal(blob,oldBlobs[i],id+' must not change');
  }
  const nums=manifest.items.map((e,i)=>e.number??i);
  assert.equal(new Set(nums).size,330);
  assert.equal(new Set(manifest.items.map(e=>e.id)).size,330);
  assert.ok(!nums.includes(16));
  assert.deepEqual(nums,[...Array(16).keys(),...Array.from({length:314},(_,i)=>i+17)]);
});
test('Collection 30: exact ten new STATIC identities and registration positions',()=>{
  assert.deepEqual(manifest.items.slice(310,320),names.map((id,i)=>({id,file:'objects/'+id+'.json',number:311+i})));
  for(const d of specimens){
    assert.equal(d.schema,'sukima3d-specimen/2');assert.deepEqual(d.behaviors,{});
    assert.ok(d.parts.length>=2);
  }
});
for(const d of specimens)test(d.id+': all parts valid, preview, rotate both ways, reset and keep model immutable',()=>{
  const original=JSON.stringify(d),s=new SpecimenSession().select(d),mesh=JSON.stringify(s.mesh);
  assert.equal(s.body.touchEnabled,false);assert.equal(s.motion,null);assert.equal(s.manipulation,null);
  assert.ok(s.mesh.radius<=1.65);
  assert.ok(previewRaster(d).pixels.some(v=>v));
  const initial=s.body.pose();
  for(let i=0;i<180;i++)s.step(1/120);
  assert.deepEqual(s.body.pose(),initial);
  s.body.drag(80,23,.1,390);assert.notDeepEqual(s.body.pose(),initial);
  s.resetPose();assert.deepEqual(s.body.pose(),initial);
  s.body.drag(-80,-23,.1,390);assert.notDeepEqual(s.body.pose(),initial);
  s.resetPose();assert.deepEqual(s.body.pose(),initial);
  assert.equal(JSON.stringify(s.mesh),mesh);assert.equal(JSON.stringify(d),original);
  s.clear();assert.equal(s.body,null);
});
