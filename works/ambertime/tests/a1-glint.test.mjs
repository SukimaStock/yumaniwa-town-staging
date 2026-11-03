import test from 'node:test';
import {beforeA12CanvasScheduler} from './a1-source-baseline.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as D from '../partner-orders.mjs';
import {TOOL_GEOMETRY} from '../distill-tools-view.mjs';
import {host} from './r0-distill-host.mjs';
const source=fs.readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8').replace(/^import.*\n/gm,'').replace('export class CanvasScene','class CanvasScene');
function presentation(){
 let now=0,nextTimer=0;const micro=[],timers=new Map(),document={hidden:false};
 const Scene=vm.runInNewContext(source+'\nCanvasScene;',{document,performance:{now:()=>now},queueMicrotask:fn=>micro.push(fn),TOOL_GEOMETRY,cancelAnimationFrame(){},setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)});
 const scene=Object.create(Scene.prototype);Object.assign(scene,{view:{room:'distill',phase:'filling',tools:{visible:true}},reducedMotion:{matches:false},suspended:false,fontSettled:true,queue(){},toolPaintX:TOOL_GEOMETRY.waitX,motion:{reset(){}}});
 const sample=n=>{now=n;return scene.sampleDistillCompletion(n,true);},flush=()=>{while(micro.length)micro.shift()();};
 // Tests explicitly distinguish rim commands from successful destination copies.
 const frame=n=>{sample(n);const cells=[];scene.paintDistillCompletion({fillRect:(...r)=>cells.push(r)});scene.recordDistillCompletionFrame(n);return cells;};
 const finish=(start=0,duration=350)=>{const width=Math.min(200,duration-180)/3;frame(start+150);frame(start+150+width+1);frame(start+150+2*width+2);sample(start+Math.max(duration,182+3*width));flush();};
 const advance=n=>{now=n;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}flush();};
 return {scene,document,timers,setNow:n=>{now=n;},sample,frame,finish,advance,flush};
}
function collected(){let s=D.beginCollection(D.startRangeDistillation(D.newMarketRulesDistillery(42)));while(s.still.distillation.progress<20)s=D.distillStep(s);return s;}
test('A1-2 three-stage glint remains four cells on the original 3px rim and finishes once',()=>{
 for(const duration of [350,400,450,500]){
  const h=presentation(),s=h.scene,done=[];assert(s.startDistillCompletion(9,id=>done.push(id),duration));
  assert.equal(h.sample(0),150);assert.equal(s.completionStep,0);h.sample(140);assert.equal(s.completionStep,0);
  const stageMs=Math.min(200,duration-180)/3;
  for(const [i,n]of [150,150+stageMs+1,150+2*stageMs+2].entries()){
   const cells=h.frame(n);assert.equal(s.completionStep,i+1);assert.equal(cells.length,1);const [x,y,w,z]=cells[0];
   assert.equal(y,TOOL_GEOMETRY.glassY/3);assert.equal(w,4);assert.equal(z,1);assert(x>=TOOL_GEOMETRY.waitX/3&&x+w<=(TOOL_GEOMETRY.waitX+36)/3);assert(cells[0].every(Number.isInteger));
   assert.equal(s.distillCompletion.paintedFrames,i+1);assert.equal(s.distillCompletion.paintedStep,i+1);
  }
  assert.equal(h.sample(Math.max(duration,182+3*stageMs)),null);assert.equal(s.completionStep,0);h.flush();assert.deepEqual(done,[9]);h.sample(duration+100);h.flush();assert.deepEqual(done,[9]);
  const cells=[];s.paintDistillCompletion({fillRect:(...r)=>cells.push(r)});assert.deepEqual(cells,[]);
 }
});
test('A1-2 elapsed time and rim commands alone do not satisfy composited-frame readiness',()=>{
 const h=presentation(),s=h.scene,done=[];s.startDistillCompletion(9,id=>done.push(id));
 for(const n of [150,250,350,500]){h.sample(n);s.paintDistillCompletion({fillRect(){}});h.flush();assert.deepEqual(done,[]);assert.equal(s.distillCompletion.paintedFrames,0);assert.equal(s.completionStep,1);}
 assert.equal(h.sample(600),null);h.flush();assert.deepEqual(done,[9],'bounded skip if no destination frames ever arrive');
});
test('A1-2 late frames cannot skip unpainted stages or count duplicate timestamps',()=>{
 const h=presentation(),s=h.scene,done=[];s.startDistillCompletion(9,id=>done.push(id));
 h.frame(250);s.recordDistillCompletionFrame(250);assert.equal(s.distillCompletion.paintedFrames,1);
 h.frame(450);assert.equal(s.completionStep,2);assert.equal(s.distillCompletion.paintedFrames,2);h.flush();assert.deepEqual(done,[]);
 h.frame(451);assert.equal(s.completionStep,2);assert.equal(s.distillCompletion.paintedStep,2,'late stage2 gets its full dwell');h.flush();assert.deepEqual(done,[]);
 h.frame(507);assert.equal(s.completionStep,3);assert.equal(s.distillCompletion.paintedStep,3);h.sample(563);h.flush();assert.deepEqual(done,[],'last stage gets its full dwell');h.sample(564);assert.equal(s.completionStep,0);h.flush();assert.deepEqual(done,[],'blank tail precedes modal callback');h.sample(594);h.flush();assert.deepEqual(done,[9]);
});
test('A1-2 motion watchdog releases stalled RAF exactly once without new game operations',()=>{
 const h=presentation(),s=h.scene,done=[];s.startDistillCompletion(9,id=>done.push(id));assert.equal(h.timers.size,1);
 h.advance(599);assert.deepEqual(done,[]);h.advance(600);assert.deepEqual(done,[9]);h.advance(1000);assert.deepEqual(done,[9]);assert.equal(s.distillCompletion,null);
 const c=presentation(),canceled=[];c.scene.startDistillCompletion(1,id=>canceled.push(id));c.scene.cancelDistillCompletion();c.advance(600);assert.deepEqual(canceled,[]);
});
test('A1-2 duplicate request cannot restart an active spirit; lost drawing and motion preference release safely',()=>{
 const h=presentation(),s=h.scene,done=[];s.startDistillCompletion(9,id=>done.push(id));const run=s.distillCompletion;h.setNow(100);assert.equal(s.startDistillCompletion(9,()=>assert.fail('duplicate callback')),false);assert.equal(s.distillCompletion,run);h.finish();assert.deepEqual(done,[9]);
 for(const reason of ['font','canvas','world','reduce']){const a=presentation(),done=[];a.scene.startDistillCompletion(1,id=>done.push(id));if(reason==='font')a.scene.fontSettled=false;if(reason==='canvas')a.scene.ctx={isContextLost:()=>true};if(reason==='world')a.scene.worldCtx={isContextLost:()=>true};if(reason==='reduce')a.scene.reducedMotion.matches=true;assert.equal(a.sample(50),null);a.flush();assert.deepEqual(done,[1]);assert.equal(a.scene.distillCompletion,null);}
});
test('A1 completion is armed only after successful formal save and delays only fill publication',()=>{
 const h=presentation();let app,starts=0;const start=h.scene.startDistillCompletion.bind(h.scene);h.scene.startDistillCompletion=(id,cb)=>{starts++;assert.equal(JSON.parse(app.persisted()).game.still.phase,'filling');return start(id,cb);};
 app=host({state:collected(),scene:h.scene});const expected=D.stopDistillation(app.api.game());app.api.finishDistillation();assert.equal(starts,1);assert.equal(app.api.modal(),null);assert.equal(D.serializeDistillery(app.api.game()),D.serializeDistillery(expected));const saved=app.persisted(),writes=app.writes();app.api.finishDistillation();assert.equal(starts,1);
 h.frame(150);h.frame(210);h.frame(270);h.sample(349);h.flush();assert.equal(app.api.modal(),null);h.sample(350);h.flush();assert.equal(app.api.modal(),null,'tail follows the actual final-stage submission');h.sample(357);h.flush();assert.equal(app.api.modal()?.kind,'fill');assert.equal(app.persisted(),saved);assert.equal(app.writes(),writes);h.sample(500);h.flush();assert.equal(app.writes(),writes);
});
test('A1 quota/conflict, expiration, reduced motion, restored filling and cancellation never replay success',()=>{
 for(const mode of ['quota','conflict']){const h=presentation(),app=host({state:collected(),scene:h.scene});if(mode==='quota')app.failWrites();else app.conflict();app.api.finishDistillation();assert.equal(h.scene.distillCompletion??null,null);assert.equal(app.api.modal(),null);assert.equal(app.api.canSave(),false);}
 const h=presentation();h.scene.reducedMotion.matches=true;const app=host({state:collected(),scene:h.scene});app.api.finishDistillation();assert.equal(app.api.modal()?.kind,'fill');assert.equal(h.scene.distillCompletion,null);
 const restored=host({state:app.api.game(),restored:true,scene:presentation().scene});restored.api.render();assert.equal(restored.api.modal(),null);
 let expired=D.startRangeDistillation(D.newMarketRulesDistillery(42));while(expired.still.distillation.progress<88)expired=D.distillStep(expired);const e=presentation(),retry=host({state:expired,scene:e.scene});retry.api.finishDistillation();assert.equal(e.scene.distillCompletion??null,null);assert.equal(D.serializeDistillery(retry.api.game()),D.serializeDistillery(D.restartRangeDistillation(expired)));
});
test('A1 hidden/room/modal/reset cancellation and stale queued completion cannot open later dialogs',()=>{
 for(const reason of ['hidden','room','modal','reset','replacement']){
  const h=presentation(),done=[];h.scene.startDistillCompletion(1,id=>done.push(id));
  if(reason==='room')h.scene.view.room='warehouse';else if(reason==='modal')h.scene.view.tools.visible=false;
  if(reason==='hidden'){h.frame(150);h.document.hidden=true;h.scene.cancelDistillCompletion();}
  else if(reason==='reset')h.scene.resetMotion();
  else if(reason==='replacement'){h.frame(150);h.frame(210);h.frame(270);h.sample(357);h.setNow(357);h.scene.startDistillCompletion(2,id=>done.push(id));}
  else h.sample(40);
  h.flush();assert.deepEqual(done,[]);if(reason==='replacement'){h.finish(357);assert.deepEqual(done,[2]);}
 }
 const stale=presentation(),staleDone=[];stale.scene.startDistillCompletion(1,id=>staleDone.push(id));stale.frame(150);stale.frame(210);stale.frame(270);stale.sample(357);stale.document.hidden=true;stale.scene.cancelDistillCompletion();stale.flush();assert.deepEqual(staleDone,[]);
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

test('A1-2 repeated render preserves the run and completion rechecks live spirit and phase',()=>{
 for(const reason of ['same','different-spirit','different-phase']){
  const h=presentation(),app=host({state:collected(),scene:h.scene});app.api.finishDistillation();const run=h.scene.distillCompletion,saved=app.persisted(),writes=app.writes();
  for(let i=0;i<5;i++)app.api.render();assert.equal(h.scene.distillCompletion,run);assert.equal(app.api.modal(),null);
  if(reason==='different-spirit')app.api.setGame({...app.api.game(),core:{...app.api.game().core,spirit:{...app.api.game().core.spirit,id:9999}}});
  if(reason==='different-phase')app.api.setGame({...app.api.game(),still:{...app.api.game().still,phase:'ready'}});
  h.finish();assert.equal(app.api.modal()?.kind??null,reason==='same'?'fill':null);assert.equal(app.persisted(),saved);assert.equal(app.writes(),writes);
 }
});

test('A1-2 explicit Canvas stop releases completion but per-frame stop preserves it',()=>{
 const h=presentation(),done=[];h.scene.startDistillCompletion(1,id=>done.push(id));const run=h.scene.distillCompletion;
 h.scene.stopDrawing(true);assert.equal(h.scene.distillCompletion,run);h.flush();assert.deepEqual(done,[]);assert.equal(h.timers.size,0);
 h.scene.armCompletionDeadline();h.scene.stopDrawing();assert.equal(h.scene.distillCompletion,null);assert.equal(h.timers.size,0);assert.equal(h.scene.frame,0);h.flush();assert.deepEqual(done,[1]);h.advance(600);assert.deepEqual(done,[1]);
});

test('A1-2 scheduler inverse accepts only the exact stop hook and rejects extra changes',()=>{
 const actual=fs.readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8');
 assert(beforeA12CanvasScheduler(actual).includes(' stopDrawing(){if(this.frame)'));
 assert.throws(()=>beforeA12CanvasScheduler(actual.replace('if(!preserveCompletion)this.finishDistillCompletion();','if(!preserveCompletion)this.cancelDistillCompletion();')),/exact reviewed/);
 assert.throws(()=>beforeA12CanvasScheduler(actual+actual),/exact reviewed/);
});
