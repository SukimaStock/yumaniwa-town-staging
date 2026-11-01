import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SpecimenSession} from '../engine/session.js';
import {previewRaster} from '../preview.js';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const manifest=read('collection.json'),baseline=read('tests/collection27-baseline.json');
const expected=["stone-window-well","street-tree-grille","sidewalk-menu-easel","market-wooden-crate","bicycle-front-wheel","flowerpot-lavender","pebble-stepping-path","street-utility-box","stone-well-bucket","corner-street-signpost"];
const next=manifest.items.slice(300,310).map(e=>read(e.file));
test('immutable300 baseline, new registration, order and 1000 ceiling',()=>{
 assert.equal(baseline.specimens.length,299);
 for(const [i,b] of baseline.specimens.entries()){
  assert.deepEqual(manifest.items[i],b.entry);
  assert.equal(createHash('sha256').update(readFileSync(new URL(b.entry.file,root))).digest('hex'),b.source);
 }
 const last=manifest.items[299];assert.deepEqual(last,{id:'street-fire-hydrant',file:'objects/street-fire-hydrant.json',number:300});
 const raw=readFileSync(new URL(last.file,root));
 assert.equal(createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex'),'13c945a4f31df1e7a778ee597bada1deace32661');
 assert.equal(manifest.items.length,340);assert.ok(manifest.items.length<=1000);
 const nums=manifest.items.map((v,i)=>v.number??i);
 assert.equal(new Set(nums).size,340);assert.equal(new Set(manifest.items.map(x=>x.id)).size,340);
 assert.ok(!nums.includes(16));assert.deepEqual(nums,[...Array(16).keys(),...Array.from({length:324},(_,i)=>i+17)]);
 for(const e of manifest.items){assert.equal(e.file,'objects/'+e.id+'.json');assert.equal(read(e.file).id,e.id);}
});
test('Collection29 exact ten distinct STATIC models',()=>{
 assert.deepEqual(manifest.items.slice(300,310),expected.map((id,i)=>({id,file:'objects/'+id+'.json',number:301+i})));
 for(const d of next){assert.equal(d.schema,'sukima3d-specimen/2');assert.deepEqual(d.behaviors,{});assert.ok(d.parts.length>=2);}
});
for(const d of next)test(d.id+': mesh/preview, reverse, reset, switch, preserved definition',()=>{
 const s=new SpecimenSession().select(d),before=JSON.stringify(s.mesh),original=JSON.stringify(d);
 assert.equal(s.body.touchEnabled,false);assert.equal(s.motion,null);assert.equal(s.manipulation,null);
 const initial=s.body.pose();for(let i=0;i<180;i++)s.step(1/120);assert.deepEqual(s.body.pose(),initial);
 s.body.drag(80,20,.1,390);assert.notDeepEqual(s.body.pose(),initial);s.resetPose();assert.deepEqual(s.body.pose(),initial);
 s.body.drag(-80,-20,.1,390);assert.notDeepEqual(s.body.pose(),initial);s.resetPose();assert.deepEqual(s.body.pose(),initial);
 assert.equal(JSON.stringify(s.mesh),before);assert.equal(JSON.stringify(d),original);
 assert.ok(previewRaster(d).pixels.some(x=>x));s.clear();assert.equal(s.body,null);s.select(d);
});
