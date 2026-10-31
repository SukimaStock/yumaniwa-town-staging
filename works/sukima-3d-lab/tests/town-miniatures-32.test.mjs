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
const priorIds=["neighborhood-noticeboard","park-seesaw","harbor-windsock","sidewalk-tactile-paving","bakery-pushcart","old-gas-streetlamp","market-hanging-scale","park-drinking-fountain","park-sandpit","courtyard-ping-pong"];
const priorBlobs=["57dceb540180e71dabb5706c3797c35c57a2a2a6","59db1e85770b3494e2b6879f7e2d7d179e4665d6","6c0a03fb7e435016dc08fc4de10599b5dda0ac99","7ff23a82255ba5bb5e302b431f1ee6eff59ab567","49fa8269975432485b430eed3c7183aca46eefaf","28623af0aea8cd9b0123e3e0f5f6d1f72c6862a6","5039e8618b88f19dd69d85842e71f0bf51a35343","3e48ebf2843af5e9810da2935154227ee5294c4f","965fcf2e4a5c1ec198f4cdc5982b3e1da2ccb24c","309cab61629916b0c6fbea59349ef6501c755f33"];
const ids=["quay-fishing-net-rack","park-litter-bin","street-telephone-booth","garden-watering-can","market-flower-bucket","courtyard-deck-chair","canal-lock-handwheel","street-bicycle-pump","park-chess-table","garden-cold-frame"];
const models=manifest.items.slice(330,340).map(e=>read(e.file));

test('Collection32: previous 330 registrations and previous ten object blobs are preserved',()=>{
 assert.equal(manifest.items.length,340);
 assert.ok(manifest.items.length<=1000);
 for(let i=0;i<priorIds.length;i++){
  const id=priorIds[i], entry=manifest.items[i+320];
  assert.deepEqual(entry,{id,file:'objects/'+id+'.json',number:321+i});
  const raw=readFileSync(new URL(entry.file,root));
  assert.equal(createHash('sha1').update(Buffer.from('blob '+raw.length+'\\0')).update(raw).digest('hex'),priorBlobs[i],id+' blob unchanged');
 }
 const nums=manifest.items.map((e,i)=>e.number??i);
 assert.equal(new Set(nums).size,340);
 assert.equal(new Set(manifest.items.map(e=>e.id)).size,340);
 assert.ok(!nums.includes(16));
 assert.deepEqual(nums,[...Array(16).keys(),...Array.from({length:324},(_,i)=>i+17)]);
});

test('Collection32: ten new STATIC v2 outdoor models at numbers 331-340',()=>{
 assert.deepEqual(manifest.items.slice(330,340),ids.map((id,i)=>({id,file:'objects/'+id+'.json',number:331+i})));
 for(const d of models){
  assert.equal(d.schema,'sukima3d-specimen/2');
  assert.equal(validateSpecimen(d),d);
  assert.deepEqual(d.behaviors,{});
  assert.ok(d.parts.length>=2);
 }
});
for(const d of models)test(d.id+': valid preview, bounded mesh and reset from both drag directions',()=>{
 const snapshot=JSON.stringify(d);
 const s=new SpecimenSession().select(d),meshSnapshot=JSON.stringify(s.mesh);
 assert.equal(s.body.touchEnabled,false);
 assert.equal(s.motion,null);
 assert.equal(s.manipulation,null);
 assert.ok(s.mesh.radius<=1.65);
 assert.ok(previewRaster(d).pixels.some(v=>v));
 const initial=s.body.pose();
 for(let i=0;i<120;i++)s.step(1/120);
 assert.deepEqual(s.body.pose(),initial);
 s.body.drag(83,26,.1,390);assert.notDeepEqual(s.body.pose(),initial);
 s.resetPose();assert.deepEqual(s.body.pose(),initial);
 s.body.drag(-83,-26,.1,390);assert.notDeepEqual(s.body.pose(),initial);
 s.resetPose();assert.deepEqual(s.body.pose(),initial);
 assert.equal(JSON.stringify(s.mesh),meshSnapshot);
 assert.equal(JSON.stringify(d),snapshot);
 s.clear();assert.equal(s.body,null);
});
