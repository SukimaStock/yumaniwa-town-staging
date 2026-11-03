import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as D from '../partner-orders.mjs';
import {TOOL_GEOMETRY} from '../distill-tools-view.mjs';
import {host} from './r0-distill-host.mjs';
const source=fs.readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8').replace(/^import.*\n/gm,'').replace('export class CanvasScene','class CanvasScene');
function presentation(){
 let now=0;const micro=[],document={hidden:false};
 const Scene=vm.runInNewContext(source+'\nCanvasScene;',{document,performance:{now:()=>now},queueMicrotask:fn=>micro.push(fn),TOOL_GEOMETRY});
 const scene=Object.create(Scene.prototype);Object.assign(scene,{view:{room:'distill',phase:'filling',tools:{visible:true}},reducedMotion:{matches:false},suspended:false,fontSettled:true,queue(){},toolPaintX:TOOL_GEOMETRY.waitX});
 return {scene,document,setNow:n=>{now=n;},sample:n=>{now=n;return scene.sampleDistillCompletion(n,true);},flush:()=>{while(micro.length)micro.shift()();}};
}
function collected(){let s=D.beginCollection(D.startRangeDistillation(D.newMarketRulesDistillery(42)));while(s.still.distillation.progress<20)s=D.distillStep(s);return s;}
test('A1 finite glint returns to unchanged paint and remains two cells on original 3px glass rim',()=>{
 for(const duration of [250,300,400]){
  const h=presentation(),s=h.scene,done=[];assert(s.startDistillCompletion(9,id=>done.push(id),duration));
  assert.equal(h.sample(0),150);assert.equal(s.completionStep,0);h.sample(140);assert.equal(s.completionStep,0);
  for(const n of [150,duration-35]){h.sample(n);const cells=[],ctx={fillRect:(...r)=>cells.push(r)};s.paintDistillCompletion(ctx);assert.equal(cells.length,1);const [x,y,w,z]=cells[0];assert.equal(y,TOOL_GEOMETRY.glassY/3);assert.equal(w,2);assert.equal(z,1);assert(x>=TOOL_GEOMETRY.waitX/3&&x+w<=(TOOL_GEOMETRY.waitX+36)/3);assert(cells[0].every(Number.isInteger));}
  assert.equal(h.sample(duration),null);assert.equal(s.completionStep,0);h.flush();assert.deepEqual(done,[9]);h.sample(duration+100);h.flush();assert.deepEqual(done,[9]);
  const cells=[];s.paintDistillCompletion({fillRect:(...r)=>cells.push(r)});assert.deepEqual(cells,[]);
 }
});
test('A1 completion is armed only after successful formal save and delays only fill publication',()=>{
 const h=presentation();let app,starts=0;const start=h.scene.startDistillCompletion.bind(h.scene);h.scene.startDistillCompletion=(id,cb)=>{starts++;assert.equal(JSON.parse(app.persisted()).game.still.phase,'filling');return start(id,cb);};
 app=host({state:collected(),scene:h.scene});const expected=D.stopDistillation(app.api.game());app.api.finishDistillation();assert.equal(starts,1);assert.equal(app.api.modal(),null);assert.equal(D.serializeDistillery(app.api.game()),D.serializeDistillery(expected));const saved=app.persisted(),writes=app.writes();app.api.finishDistillation();assert.equal(starts,1);
 h.sample(250);h.flush();assert.equal(app.api.modal()?.kind,'fill');assert.equal(app.persisted(),saved);assert.equal(app.writes(),writes);h.sample(500);h.flush();assert.equal(app.writes(),writes);
});
test('A1 quota/conflict, expiration, reduced motion, restored filling and cancellation never replay success',()=>{
 for(const mode of ['quota','conflict']){const h=presentation(),app=host({state:collected(),scene:h.scene});if(mode==='quota')app.failWrites();else app.conflict();app.api.finishDistillation();assert.equal(h.scene.distillCompletion??null,null);assert.equal(app.api.modal(),null);assert.equal(app.api.canSave(),false);}
 const h=presentation();h.scene.reducedMotion.matches=true;const app=host({state:collected(),scene:h.scene});app.api.finishDistillation();assert.equal(app.api.modal()?.kind,'fill');assert.equal(h.scene.distillCompletion,null);
 const restored=host({state:app.api.game(),restored:true,scene:presentation().scene});restored.api.render();assert.equal(restored.api.modal(),null);
 let expired=D.startRangeDistillation(D.newMarketRulesDistillery(42));while(expired.still.distillation.progress<88)expired=D.distillStep(expired);const e=presentation(),retry=host({state:expired,scene:e.scene});retry.api.finishDistillation();assert.equal(e.scene.distillCompletion??null,null);assert.equal(D.serializeDistillery(retry.api.game()),D.serializeDistillery(D.restartRangeDistillation(expired)));
});
test('A1 hidden/room/modal cancellation and stale queued completion cannot open later dialogs',()=>{
 for(const reason of ['hidden','room','modal','replacement']){const h=presentation(),done=[];h.scene.startDistillCompletion(1,id=>done.push(id));if(reason==='hidden')h.sample(250);else if(reason==='room')h.scene.view.room='warehouse';else if(reason==='modal')h.scene.view.tools.visible=false;if(reason==='hidden')h.scene.cancelDistillCompletion();else if(reason==='replacement'){h.sample(250);h.scene.startDistillCompletion(2,id=>done.push(id));}else h.sample(40);h.flush();assert.deepEqual(done,[]);if(reason==='replacement'){h.sample(500);h.flush();assert.deepEqual(done,[2]);}}
 const h=presentation(),done=[];h.scene.startDistillCompletion(1,id=>done.push(id));h.scene.reducedMotion.matches=true;h.sample(30);h.flush();assert.deepEqual(done,[1]);assert.equal(h.scene.distillCompletion,null);
});
test('A1 minimum legal cut keeps exact formal result; automatic direct stop never arms completion',()=>{
 let minimum=D.beginCollection(D.startRangeDistillation(D.newMarketRulesDistillery(42)));while(!D.collectionState(minimum).canStop)minimum=D.distillStep(minimum);
 const m=presentation(),app=host({state:minimum,scene:m.scene});app.api.finishDistillation();assert(m.scene.distillCompletion);assert.equal(D.serializeDistillery(app.api.game()),D.serializeDistillery(D.stopDistillation(minimum)));
 let automatic=D.startDistillation(D.newStaffProgressionDistillery(42));while(automatic.still.distillation.progress<65)automatic=D.distillStep(automatic);automatic=D.tickDistillery(D.fillBarrel(D.stopDistillation(automatic),'refill'));automatic=D.hireStaff(automatic);automatic=D.beginUsual(D.reserveStaff(automatic,automatic.core.casks[0].id));while(automatic.still.distillation.progress<30)automatic=D.distillStep(automatic);
 const a=presentation(),staff=host({state:automatic,scene:a.scene});assert.equal(staff.api.game().usual.reservation.status,'active');staff.api.finishDistillation();assert.equal(a.scene.distillCompletion??null,null);
});
test('A1 active glint yields immediately to existing higher-priority modal and queued result stays canceled',()=>{
 // Synthetic interruption boundary, not a legal save: inject only an external
 // offer after the lawful saved stop, exactly as notice-priority tests do.
 const h=presentation(),app=host({state:collected(),scene:h.scene});app.api.finishDistillation();assert(h.scene.distillCompletion);const writes=app.writes();app.api.setGame({...app.api.game(),trade:{...app.api.game().trade,offer:{id:99}}});app.api.render();assert.equal(app.api.modal().kind,'offer');assert.equal(h.scene.distillCompletion,null);h.sample(500);h.flush();assert.equal(app.api.modal().kind,'offer');assert.equal(app.writes(),writes);
});

test('A1 unpaintable startup skips glint and preserves immediate accessible fill',()=>{
 const h=presentation();h.scene.fontSettled=false;const app=host({state:collected(),scene:h.scene});app.api.finishDistillation();assert.equal(app.api.modal()?.kind,'fill');assert.equal(h.scene.distillCompletion,null);assert.equal(JSON.parse(app.persisted()).game.still.phase,'filling');
});
