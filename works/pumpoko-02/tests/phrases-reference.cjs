'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process'),C=require('../courses.js'),{BASE,previous}=require('./phrases-review.cjs');
const json=v=>JSON.stringify(v);
// Reverse exactly the *new* STAGE 5 interlude for historical shape checks.
// Prior stages, mouth and original final approach remain strict comparands.
function withoutStage5(raw){
 const c=JSON.parse(JSON.stringify(raw)),cfg=c.feel5;
 if(!cfg)return c;
 const d=cfg.shift,tailFrom=cfg.points.at(-1)[0];
 c.curves.finish=[
  ...c.curves.finish.filter(p=>p[0]<=cfg.joinX),
  ...c.curves.finish.filter(p=>p[0]>tailFrom).map(p=>[p[0]-d,p[1],p[2]])
 ];
 c.gaps=c.gaps.filter(g=>!['stage5-mastery-1','stage5-mastery-2'].includes(g.id));
 c.goal.x-=d;c.finishX-=d;c.goalOffset-=d;c.stages[4].endX-=d;
 for(const points of Object.values(c.finale.curves))for(const p of points)p[0]-=d;
 for(const h of c.finale.holes)h.x-=d;
 for(const cell of c.finale.cellars)
  for(const k of ['left','right','roofStart','exitX'])cell[k]-=d;
 for(const g of c.finale.gaps){g.a-=d;g.b-=d;}
 c.finale.goal.x-=d;c.finale.finishX-=d;
 delete c.feel5;
 return c;
}
// Undo exactly the approved STAGE 4 insert for old pre-Stage-4 snapshots.
// This is a pure golden-reference adapter; the real course is never modified.
function withoutStage4(raw){
 const c=withoutStage5(raw),cfg=c.feel4;
 if(!cfg)return c;
 const d=cfg.shift,tailFrom=cfg.points.at(-1)[0];
 c.curves.underground2=[
  ...c.curves.underground2.filter(p=>p[0]<=cfg.joinX),
  ...c.curves.underground2.filter(p=>p[0]>tailFrom).map(p=>[p[0]-d,p[1],p[2]])
 ];
 c.curves.finish=c.curves.finish.map(p=>[p[0]-d,p[1],p[2]]);
 c.gaps=c.gaps.filter(g=>g.id!=='stage4-choice').map(g=>g.stage===5?{...g,a:g.a-d,b:g.b-d}:g);
 c.holes[3].x-=d;
 c.cellars[1].right-=d;c.cellars[1].exitX-=d;c.cellars[1].roofStart-=d;
 c.surfaceBridges[1].b-=d;
 c.goal.x-=d;c.finishX-=d;c.offsets.finish-=d;c.exitOffsets[3]-=d;c.goalOffset-=d;
 for(const points of Object.values(c.finale.curves))for(const p of points)p[0]-=d;
 for(const h of c.finale.holes)h.x-=d;
 for(const cell of c.finale.cellars)
  for(const k of ['left','right','roofStart','exitX'])cell[k]-=d;
 for(const g of c.finale.gaps){g.a-=d;g.b-=d;}
 c.finale.goal.x-=d;c.finale.finishX-=d;
 c.stages[3].endX-=d;
 c.stages[4].startX-=d;c.stages[4].endX-=d;c.stages[4].spawnX-=d;
 delete c.feel4;
 return c;
}
function protect(){
 const raw=C.get('world4'),old=previous().FruitLabCourses.get('world4');
 // Historical phrase baselines predate the new additive STAGE 3 interlude.
 // Undo only its rigid downstream translation for the old snapshot assertions;
 // the new independent extension test protects the inserted terrain itself.
 const c=withoutStage4(raw),delta=c.feel3?.shift||0;
 if(delta){
   const join=c.feel3.joinX,oldTail=old.curves.return.find(p=>p[0]>join)[0];
   c.curves.return=[
     ...c.curves.return.filter(p=>p[0]<=join),
     ...c.curves.return.filter(p=>p[0]>=oldTail+delta).map(p=>[p[0]-delta,p[1],p[2]])
   ];
   for(const layer of ['underground2','finish'])
     c.curves[layer]=c.curves[layer].map(p=>[p[0]-delta,p[1],p[2]]);
   c.gaps=c.gaps.filter(g=>g.id!=='stage3-feel').map(g=>g.stage>=4?{...g,a:g.a-delta,b:g.b-delta}:g);
   for(const h of c.holes.slice(2))h.x-=delta;
   for(const h of c.finale.holes)h.x-=delta;
   for(const points of Object.values(c.finale.curves))for(const p of points)p[0]-=delta;
   for(const cell of c.finale.cellars)
     for(const k of ['left','right','roofStart','exitX'])cell[k]-=delta;
   for(const gap of c.finale.gaps){gap.a-=delta;gap.b-=delta;}
   c.finale.goal.x-=delta;c.finale.finishX-=delta;
   for(const k of ['left','right','roofStart','exitX'])c.cellars[1][k]-=delta;
   for(const k of ['until','roofStart','exitX'])c.cellars[1].entryRoof[k]-=delta;
   for(const k of ['a','b'])c.surfaceBridges[1][k]-=delta;
   c.goal.x-=delta;c.finishX-=delta;c.goalOffset-=delta;
   c.offsets.underground2-=delta;c.offsets.finish-=delta;
   c.exitOffsets[2]-=delta;c.exitOffsets[3]-=delta;
   c.stages[2].endX-=delta;
   for(const spec of c.stages.slice(3)){spec.startX-=delta;spec.endX-=delta;spec.spawnX-=delta;}
   delete c.feel3;
 }
 for(const key of Object.keys(old).filter(k=>!['curves','gaps'].includes(k)))assert.equal(json(c[key]),json(old[key]),key+' exact base');
 assert.equal(json(c.curves.return),json(old.curves.return),'accepted STAGE 3 exact');assert.equal(json(c.gaps.filter(g=>g.stage===3)),json(old.gaps.filter(g=>g.stage===3)));
 const bounds={surface:p=>![3270,3580].includes(p[0]),underground:p=>p[0]<7060||p[0]>9120,underground2:p=>p[0]<22340||p[0]>=24650,finish:p=>p[0]<31130||p[0]>32595};
 for(const [layer,keep]of Object.entries(bounds))assert.equal(json(c.curves[layer].filter(keep)),json(old.curves[layer].filter(keep)),layer+' unaffected authored points');
 const expected={second2:{a:7710,b:7830,runup:650},second4:{a:23540,b:23670,runup:1200},first5:{b:31290},second5:{a:31590,b:31730,runup:300}},ids={'stage2-2':'second2','stage4-3':'second4','stage5-2':'first5','stage5-3':'second5'};
 assert.equal(json(c.gaps),json(old.gaps.map(g=>({...g,...expected[ids[g.id]]}))),'only declared gaps move');
 for(const file of ['physics.js','world.js','story.js','world-draw.js','app.js','draw.js','index.html','opening.js','opening-draw.js','prologue.js','material.js','title-draw.js','style.css'])if(file==='world.js'){require('./handoff-retry-reference.cjs').protect();assert.equal(require('./handoff-retry-reference.cjs').priorRestore(fs.readFileSync(__dirname+'/../'+file,'utf8')),execFileSync('git',['show',BASE+':works/pumpoko-02/'+file],{encoding:'utf8'}),file+' byte match before approved retry change');}
  else if(file==='world-draw.js'){require('./fall-shadow-reference.cjs').protect();assert.equal(require('./fall-shadow-reference.cjs').priorShadow(fs.readFileSync(__dirname+'/../'+file,'utf8')),execFileSync('git',['show',BASE+':works/pumpoko-02/'+file],{encoding:'utf8'}),file+' exact before shadow fix');}
  else assert.ok(fs.readFileSync(__dirname+'/../'+file).equals(execFileSync('git',['show',BASE+':works/pumpoko-02/'+file])),file+' byte match');
 for(const p of c.curves.surface.filter(p=>[3270,3580].includes(p[0])))assert.deepEqual(p,p[0]===3270?[3270,385,.35]:[3580,425,0]);
 for(const layer of Object.keys(bounds))assert.ok(c.curves[layer].every((p,i)=>!i||p[0]>c.curves[layer][i-1][0]));
 return {c,old};
}
module.exports={protect,withoutStage5,withoutStage4,BASE};
