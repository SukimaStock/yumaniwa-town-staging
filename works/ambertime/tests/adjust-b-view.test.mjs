import test from 'node:test';import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';import {distillationView} from '../spirit-view.mjs';import {collectionGeometry,computeViewport,projectRect} from '../canvas-layout.mjs';
const ranges=[[0,12],[24,52],[74,99]];
function run(start,end){let s=D.startRangeDistillation(D.newConnectedDistillery(42));while(s.still.distillation.progress<start)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<end)s=D.distillStep(s);return s;}
test('three visible ranges share exact Lab positions and confirmed flavor/volume with preview',()=>{
 for(const [start,end] of ranges){const s=run(start,end),raw=D.serializeDistillery(s),view=distillationView(s),geometry=collectionGeometry(D.collectionState(s)),done=D.stopDistillation(s),frozen=collectionGeometry(D.collectionState(done));
  assert.equal(geometry.start,start/99);assert.equal(geometry.current,end/99);assert.equal(geometry.end,null);assert.equal(geometry.rangeEnd,end/99);assert.equal(frozen.end,end/99);assert.equal(frozen.start,start/99);
  assert.equal(view.litres,done.core.spirit.litres);assert.equal(view.roughness,done.core.spirit.roughness);assert.equal(view.character,done.core.spirit.character);assert.equal(view.phrase,done.core.spirit.flavor.label);assert.equal(D.serializeDistillery(s),raw);
 }
});
test('minimum-width triangle positions remain distinct at390px, with no idle markers',()=>{
 const viewport=computeViewport({width:390,height:700,dpr:3}),idle=collectionGeometry();assert.equal(idle.start,null);assert.equal(idle.end,null);assert.equal(idle.current,0);
 for(const [start,end] of [[0,12],[87,99]]){const g=collectionGeometry({current:end/99,start:start/99,end:end/99}),bar=projectRect(viewport,g);assert(bar.x>=0&&bar.x+bar.width<=390);assert.equal(g.rangeEnd,g.end);assert((g.end-g.start)*bar.width>30);}
});
test('preview stays empty until a valid range and has no name inferred from text',()=>{
 let s=D.startRangeDistillation(D.newConnectedDistillery(42));assert.equal(distillationView(s).phase,'collecting');s=D.beginCollection(s);for(let i=0;i<11;i++)s=D.distillStep(s);assert.equal(distillationView(s).phase,'collecting');s=D.distillStep(s);assert.equal(distillationView(s).phase,'forecast');
});

test('full-range bottle metadata remains compatible with actual finite town receipts and save replay',()=>{
 let s=D.fillBarrel(D.stopDistillation(run(24,52)),'refill');s=D.bottleBranded(s,s.core.casks[0].id,{},10);s=D.listBottles(D.setSalePrice(s,'low',s.result.productId),s.result.productId);s=D.tickDistillery(s);
 const raw=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);assert.equal(s.releases[0].profile.flavor.choice.collectionVersion,2);assert.equal(s.labConnection.town.shipments.reduce((n,r)=>n+r.count,0),s.releases[0].sold);assert(s.releases[0].sold<=10);
});
