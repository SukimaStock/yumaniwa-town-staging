import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {distillationReadout,distillationView} from '../spirit-view.mjs';
import {computeViewport,layoutScene,projectRect,hitTest,collectionGeometry} from '../canvas-layout.mjs';
import {pixelTypography} from '../text-metrics.mjs';
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

test('both labels fit the wider unchanged-height tap target at phone widths and integer font scales',()=>{
 const r=layoutScene({room:'distill'}).controls.find(c=>c.key==='stop-distill');
 assert.equal(r.x+r.w/2,180);assert.equal(r.h,45);assert(r.w>=108);
 for(const width of [320,360,390,430])for(const dpr of [1,2,3]){
  const v=computeViewport({width,height:844,dpr}),m=pixelTypography(20,v.scale*v.dpr),p=projectRect(v,r);
  for(const label of ['ここから取る','ここまで取る'])assert(label.length*m.logical<=r.w-12,'full-width Misaki advances plus padding fit');
  assert(p.height>=40);assert(p.width>100);assert.equal(hitTest([r],180,436)?.key,'stop-distill');
 }
 const bar=collectionGeometry({current:.7,start:.2,end:.7});assert.deepEqual([bar.x,bar.y,bar.w,bar.h],[60,393,240,6]);assert.equal(bar.rangeEnd,.7);
});

// Exercise the real UI boundary: a saved stop must not immediately cover results.
test('actual finish handler keeps new results visible and preserves legacy auto-fill',()=>{
 const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 const handler=source.slice(source.indexOf('function finishDistillation(){'),source.indexOf('function endTaste(){'));
 for(const fullRange of [true,false]){
  let s=D.newConnectedDistillery(42);s=fullRange?D.startRangeDistillation(s):D.startDistillation(s);s=D.beginCollection(step(s,fullRange?0:40));s=step(s,fullRange?24:58);
  const ctx={D,game:s,modal:null,room:'distill',shownFillSpiritId:null,message:()=>{},T:{minimumStop:30},distillLearning:{complete(){}},distillBatchKey:()=>null};vm.createContext(ctx);
  vm.runInContext("function act(fn,after,afterSave){game=fn(game);if(after)after();if(afterSave)afterSave();return true;}"+handler+'finishDistillation();',ctx);
  assert.equal(ctx.game.still.phase,'filling');assert.equal(distillationReadout(ctx.game).phase,'confirmed');assert.equal(ctx.modal?.kind,fullRange?undefined:'fill');
 }
});
