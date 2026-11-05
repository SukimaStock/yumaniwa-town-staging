import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {distillationReadout,distillationView} from '../spirit-view.mjs';
import {computeViewport,layoutScene,projectRect,hitTest,collectionGeometry} from '../canvas-layout.mjs';
import {host} from './r0-distill-host.mjs';
const step=(s,n)=>{while(s.still.distillation.progress<n)s=D.distillStep(s);return s;};

test('no result before first tap or a staff recipe future start, quantity-only from first tap',()=>{
 let s=D.startRangeDistillation(D.newConnectedDistillery(42));
 assert.equal(distillationReadout(s),null);assert.equal(distillationReadout(step(s,40)),null);
 const future=structuredClone(s);future.still.distillation.collectStart=24;assert.equal(distillationReadout(future),null);
 s=D.beginCollection(s);const zero=distillationReadout(s);assert.equal(zero.phase,'estimate');assert.deepEqual(zero.axes,[]);assert.equal(zero.phrase,'');
 s=step(s,1);assert.equal(distillationReadout(s).phase,'estimate');assert.equal(distillationView(s).phase,'collecting','old forecast API unchanged before minimum width');
});

test('three ranges show existing current-stop yield, confirmed flavor only after tap; saves untouched',()=>{
 for(const [start,end] of [[0,12],[24,52],[74,99]]){
  let s=D.startRangeDistillation(D.newConnectedDistillery(42));s=D.beginCollection(step(s,start));s=step(s,end);
  const before=D.serializeDistillery(s),estimate=distillationReadout(s);
  assert.equal(estimate.phase,'estimate');assert.deepEqual(estimate.axes,[]);assert.equal(estimate.phrase,'');
  for(let i=0;i<5;i++)assert.deepEqual(distillationReadout(s),estimate);
  assert.equal(D.serializeDistillery(s),before);assert.deepEqual(distillationReadout(D.restoreDistillery(before)),estimate);
  const stopped=D.stopDistillation(s),confirmed=distillationReadout(stopped);
  assert.equal(estimate.litres,stopped.core.spirit.litres);assert.equal(confirmed.phase,'confirmed');assert.equal(confirmed.axes.length,2);assert(confirmed.phrase);
  assert.deepEqual(confirmed,distillationView(stopped));assert.deepEqual(D.fillBarrel(stopped,'refill').core.casks[0].flavor,stopped.core.spirit.flavor);
 }
});

test('lever and moving glass have their current hit targets at all three phone widths',()=>{
 for(const width of [360,375,390])for(const dpr of [1,2,3])for(const glassPosition of [0,1]){
  const v=computeViewport({width,height:568,dpr}),controls=layoutScene({room:'distill',tools:{glassPosition}}).controls;
  const lever=controls.find(c=>c.key==='distill-lever'),glass=controls.find(c=>c.key==='distill-glass');
  assert.deepEqual([lever.x,lever.y,lever.w,lever.h],[285,279,60,66]);assert.deepEqual([glass.x,glass.y,glass.w,glass.h],[glassPosition===0?165:228,333,54,54]);
  for(const r of [lever,glass]){const p=projectRect(v,r);assert(p.width>=44&&p.height>=44);assert(p.x>=0&&p.y>=0&&p.x+p.width<=width&&p.y+p.height<=568);assert.equal(hitTest(controls,r.x+r.w/2,r.y+r.h/2)?.key,r.key);}
 }
 const bar=collectionGeometry({current:.7,start:.2,end:.7});assert.deepEqual([bar.x,bar.y,bar.w,bar.h],[60,393,240,6]);assert.equal(bar.rangeEnd,.7);
});

test('actual finish handler opens integrated result/barrel selection for current and legacy cuts after placement adoption',()=>{
 for(const fullRange of [true,false]){
  let s=D.adoptPlacement(D.newConnectedDistillery(42),'listed');s=fullRange?D.startRangeDistillation(s):D.startDistillation(s);s=D.beginCollection(step(s,fullRange?0:40));s=step(s,fullRange?24:58);
  const h=host({state:s}),before=s.core.cash;h.api.finishDistillation();
  assert.equal(h.api.game().still.phase,'filling');assert.equal(distillationReadout(h.api.game()).phase,'confirmed');assert.equal(h.api.modal().kind,'fill');
  assert.equal(h.api.node('dialog-title').textContent,'蒸留結果');assert.match(h.api.node('dialog-body').innerHTML,/fill-volume/);assert.match(h.api.node('dialog-body').innerHTML,/たるを選ぶ/);assert.match(h.api.node('dialog-actions').innerHTML,/data-action="fill"/);
  assert.equal(h.api.game().core.cash,before,'opening the combined result never purchases a cask');
  const raw=D.serializeDistillery(h.api.game());h.api.render();assert.equal(D.serializeDistillery(h.api.game()),raw,'rendered choices do not commit the model');
  h.api.closeFill();assert.equal(h.api.modal(),null,'back does not repeatedly interrupt with the same spirit');h.api.render();assert.equal(h.api.modal(),null);
 }
});
test('reloading unfinished spirit retains its explicit entrance without auto-opening again',()=>{
 let s=D.stopDistillation(step(D.beginCollection(D.startRangeDistillation(D.newConnectedDistillery(42))),24));s=D.restoreDistillery(D.serializeDistillery(s));
 const h=host({state:s,restored:true}),raw=D.serializeDistillery(s);h.api.render();assert.equal(h.api.modal(),null);assert.equal(h.api.game().still.phase,'filling');assert.equal(D.serializeDistillery(h.api.game()),raw);
});
