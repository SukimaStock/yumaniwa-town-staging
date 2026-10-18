import test from 'node:test';
import assert from 'node:assert/strict';
import {flavorType,flavorTypeView} from '../flavor-types.mjs';
import {ageCask} from '../model.mjs';
import * as D from '../partner-orders.mjs';
import {fill,advance} from './brands-helpers.mjs';
const p=(roughness,character,wood)=>({roughness,character,wood});
test('missing or invalid legacy values never receive an interpretation',()=>{
 for(const x of [null,{},p(.1,.5,undefined),p('0.1',.5,.1),p(NaN,.5,.1),p(.1,Infinity,.1),p(-.1,.5,.1),p(.1,1.01,.1),p(.1,.5,1.36)]){assert.equal(flavorType(x),null);assert.equal(flavorTypeView(x),'');}
});
test('overlap priority and conservative associations respect every existing wood phrase',()=>{
 assert.equal(flavorType(p(.05,.95,.90)).id,'dry-wood');
 assert.equal(flavorType(p(.7,.9,0)).id,'young');
 assert.equal(flavorType(p(.1,.9,.2)).id,'fruit');
 assert.equal(flavorType(p(.1,.5,.5)).id,'oak');
 assert.equal(flavorType(p(.1,.8,.5)).id,'fruit-oak');
 assert.equal(flavorType(p(.4,.5,.3)).id,'layered');
 assert.match(flavorType(p(.1,.5,.1)).association,/アイリッシュ/);
 for(const x of [p(.2,.5,.1),p(.1,.7,.1),p(.1,.5,0),p(.1,.5,.3),p(.1,0,1.35)])assert.equal(flavorType(x).association,null);
});
test('nearby small differences stay in broad conservative regions',()=>{
 for(const center of [p(.1,.5,.1),p(.5,.55,.3),p(.1,.9,.2),p(.1,.4,.5),p(.7,.6,.1)]){
  const expected=flavorType(center);for(const key of ['roughness','character','wood'])for(const d of [-1e-8,0,1e-8])assert.deepEqual(flavorType({...center,[key]:center[key]+d}),expected);
 }
 // Strong label borders go through an intermediate region instead of choosing a rival.
 assert.equal(flavorType(p(.28,.8,.2)).id,'layered');assert.equal(flavorType(p(.1,.8,.38)).id,'layered');
});
test('reachable profiles, stored releases, RNG and serialized results are untouched by rendering',()=>{
 let s=fill(D.newStaffDistillery(42),{progress:65,type:'bourbon'});s=advance(s,24);
 const c=s.core.casks[0],before=D.serializeDistillery(s),expected=flavorType(c);
 for(let n=0;n<20;n++){assert.deepEqual(flavorType({...c}),expected);flavorTypeView(c);}
 assert.equal(D.serializeDistillery(s),before);assert.deepEqual(D.restoreDistillery(before),s);
 s=D.bottleBranded(s,c.id,{});const release=s.releases.at(-1),saved=structuredClone(release.profile),type=flavorType(saved);
 assert.deepEqual(type,expected);const product=s.core.products.find(x=>x.id===release.productId);assert.deepEqual(flavorType(product),expected);
 s=advance(s,12);assert.deepEqual(s.releases.find(x=>x.id===release.id).profile,saved);assert.deepEqual(flavorType(saved),type);
 let aged=c;for(let n=0;n<72;n++)aged=ageCask(aged);assert.notEqual(flavorType(aged).id,expected.id);
});
