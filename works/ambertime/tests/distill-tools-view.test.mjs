import test from 'node:test';import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';import {distillationReadout} from '../spirit-view.mjs';import {distillToolsView,drawDistillTools,RECEIVER_MAX_LITRES} from '../distill-tools-view.mjs';import {layoutScene,computeViewport,projectRect} from '../canvas-layout.mjs';import {stillArt} from '../room-object-art.mjs';
const project=(s,extra={})=>distillToolsView({phase:s.still.phase,collection:D.collectionState(s),litres:distillationReadout(s)?.litres??0,available:true,canStart:D.canStart(s).ok,...extra});
const step=(s,n)=>{while(s.still.distillation.progress<n)s=D.distillStep(s);return s;};
test('empty waiting glass, three-second preparation and native minimum rules remain distinct',()=>{
 let s=D.newMarketRulesDistillery(42);let v=project(s);assert(v.leverEnabled);assert(!v.glassEnabled);assert.equal(v.fill,0);assert.equal(v.glassPosition,1);
 v=project(s,{countdown:true});assert(v.leverDown);assert(!v.leverEnabled);assert(!v.arrow);
 s=D.startRangeDistillation(s);assert.equal(project(step(s,42)).fill,0,'old progress litres are never shown as received before collection');
 s=D.beginCollection(s);v=project(s);assert.equal(v.glassPosition,0);assert(!v.glassEnabled);assert.equal(v.hint,'もう少し待ちます');
 s=step(s,54);v=project(s);assert(v.glassEnabled);assert.equal(v.glassMode,'stop');assert.equal(v.hint,'タップか右へスライドで終える');
 const expired=step(D.startRangeDistillation(D.newMarketRulesDistillery(42)),88);v=project(expired);assert(v.leverEnabled);assert(!v.leverDown);assert(!v.glassEnabled);assert(v.arrow);
 assert(!project(expired,{automatic:true}).leverEnabled);assert(!project(s,{available:false}).glassEnabled);
});
test('liquid uses the existing end-position yield, survives stop and restore, and never mutates saves',()=>{
 assert.equal(RECEIVER_MAX_LITRES,40);const quantities=[];
 for(const [start,end] of [[0,12],[24,52],[74,99]]){
  let s=step(D.startRangeDistillation(D.newMarketRulesDistillery(42)),start);s=D.beginCollection(s);s=step(s,end);
  const bytes=D.serializeDistillery(s),before=project(s);assert.equal(before.litres,distillationReadout(s).litres);assert.equal(before.fill,before.litres/40);assert.equal(D.serializeDistillery(s),bytes);
  const stopped=D.stopDistillation(s),after=project(stopped);assert.equal(after.litres,stopped.core.spirit.litres);assert.equal(after.fill,before.fill);assert.equal(after.glassPosition,1);assert(!after.glassEnabled);assert.deepEqual(project(D.restoreDistillery(D.serializeDistillery(stopped))),after);quantities.push(after.litres);
 }assert(quantities[0]<quantities[1]&&quantities[1]<quantities[2]);
});
test('separate receiver is bounded at both endpoints, with larger unfiltered input targets',()=>{
 assert(stillArt().includes('receiver-liquid'));assert(!stillArt({interactive:true}).includes('receiver-liquid'));
 for(const width of [360,375,390]){const v=computeViewport({width,height:568,dpr:3});for(const glassPosition of [0,1]){const rs=layoutScene({room:'distill',tools:{glassPosition}}).controls.filter(x=>x.key.startsWith('distill-'));assert.equal(rs.length,2);for(const r of rs){const p=projectRect(v,r);assert(p.width>=44&&p.height>=44);assert(p.x>=0&&p.x+p.width<=width);}}}
 for(const glassX of [174,237])for(const fill of [0,.25,.6,1]){const cells=[],ctx={fillRect:(...rect)=>cells.push({rect,color:ctx.fillStyle})};drawDistillTools(ctx,{fill,leverDown:false,arrow:false},{glassX});const liquid=cells.filter(c=>['#b8aa7c','#e7ddb6'].includes(c.color));if(fill===0)assert.equal(liquid.length,0);for(const {rect:[x,y,w,h]} of liquid){assert(x>=glassX/3+2&&x+w<=glassX/3+10);assert(y>=116&&y+h<=124);}assert(cells.every(c=>c.rect.every(Number.isInteger)));}
});
