'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./harness.cjs');
const {course:c,run}=require('./five-stage-review.cjs');
const {withoutStage5}=require('./phrases-reference.cjs');
const P=require('../physics.js'),W=require('../world.js');
const BASE='067646e904f53ba639a8e1f1425712bd053870ae';
const old=()=>harness({sourceRef:BASE}).w.FruitLabCourses.get('world4');
const SHIFT=3000,JOIN=41530,G1='stage5-mastery-1',G2='stage5-mastery-2';

test('hard STAGE 5 is additive: all original five cliffs, banks, sockets and stages are identical',()=>{
 const before=old();
 assert.equal(c.gaps.length,before.gaps.length+2);
 assert.deepEqual(c.gaps.filter(g=>g.stage===5&&!g.id.startsWith('stage5-mastery-')),
   Array.from(before.gaps).filter(g=>g.stage===5),'all five accepted chasms exact');
 assert.deepEqual(c.curves.finish.filter(p=>p[0]<=JOIN),
   Array.from(before.curves.finish).filter(p=>p[0]<=JOIN),'all original bank shapes through fifth gap exact');
 const tailStart=Array.from(before.curves.finish).find(p=>p[0]>JOIN)[0]+SHIFT;
 assert.deepEqual(c.curves.finish.filter(p=>p[0]>=tailStart),
   Array.from(before.curves.finish).filter(p=>p[0]>JOIN).map(p=>[p[0]+SHIFT,p[1],p[2]]),
   'original quiet goal approach is only translated in x');
 const a=c.gaps.find(g=>g.id===G1),b=c.gaps.find(g=>g.id===G2);
 assert.deepEqual([a.a,a.b,b.a,b.b],[42800,42960,43260,43390]);
 assert.equal(b.b-b.a,130);
 assert.ok(W.curve('finish',b.b,c).y-W.curve('finish',b.a,c).y>=30,
   'final surprise far bank is actually higher, not artificially blocked');
 assert.equal(c.feel5.shift,SHIFT);
 assert.deepEqual(c.feel5.points,c.curves.finish.filter(p=>p[0]>JOIN&&p[0]<tailStart));
 for(const [layer,points]of Object.entries(c.curves))
  assert.ok(points.every((p,i)=>p.every(Number.isFinite)&&(!i||p[0]>points[i-1][0])),layer);
});

test('reversing precisely the new final interlude reproduces every prior main course property',()=>{
 const before=old(),normal=withoutStage5(c);
 assert.equal(JSON.stringify(normal),JSON.stringify(before),'no old level data changed except approved inserted phrase');
 assert.deepEqual(c.stages.map((spec,i)=>spec.endX-before.stages[i].endX),[0,0,0,0,SHIFT]);
 assert.deepEqual(c.stages.slice(0,4),Array.from(before.stages).slice(0,4));
 assert.equal(c.stages[4].retrySeconds,before.stages[4].retrySeconds);
 assert.equal(c.stages[4].cameraFloor,before.stages[4].cameraFloor);
 assert.equal(c.stages[4].failY,before.stages[4].failY);
 assert.deepEqual({...c.goal,x:c.goal.x-SHIFT},before.goal,'identical seating speed, dwell, radius, height');
 assert.equal(c.goal.x-c.goalOffset,before.goal.x-before.goalOffset);
 assert.deepEqual(c.finale.curves.finish.map(p=>[p[0]-SHIFT,p[1],p[2]]),
   Array.from(before.finale.curves.finish),'same final pocket and quiet ending scene');
});

test('both new pits have real missing ground with solid collision lips',()=>{
 for(const id of [G1,G2]){
  const g=c.gaps.find(g=>g.id===id);
  for(let x=g.a+40;x<g.b-20;x+=15){
   assert.equal(W.groundFrame(g.layer,x,c).support,false,id+' truly unsupported');
   const body={...P.body('pumpkin',0),layer:'finish',x,y:W.curve('finish',x,c).y+120};
   assert.ok(W.contact(body,c).distance>body.r,id+' no phantom bridge');
  }
  for(const x of [g.a,g.b])
   assert.notEqual(W.groundFrame(g.layer,x,c).support,false,id+' solid lip');
 }
});

// Same moving fruit at the exact physical position, not hand-edited speeds
// mid-flight. Only real left/right inputs distinguish the two outcomes.
function finalTrial(fps,brakeStart=null,brakeEnd=null){
 const s=W.createCourse(c),b=s.entities.at(-1),f=W.curve('finish',JOIN,c);
 s.pumpkin=b;s.active='pumpkin';s.handoffs=4;s.phase='finish';
 s.stages={completed:[1,2,3,4],checkpoint:null,failedAt:null};
 Object.assign(b,{plugged:false,layer:'finish',x:f.x+f.nx*b.r,y:f.y+f.ny*b.r,
   vx:497,vy:0,grounded:true,safety:false,exiting:false});
 P.clearInput(s);
 const start={x:b.x,y:b.y,vx:b.vx,vy:b.vy};
 let fell=false,seated=false,passed1=false,passed2=false,receivingLandings=0,fallX=null,maxX=b.x;
 for(let i=0;i<fps*25;i++){
  const axis=brakeStart!==null&&b.x>=brakeStart&&b.x<brakeEnd?-1:1;
  P.input(s,axis);
  const es=W.update(s,1/fps);
  maxX=Math.max(maxX,b.x);
  if(b.x>c.feel5.gap1B+35&&b.grounded)passed1=true;
  if(b.x>c.feel5.gap2B+65&&b.grounded)passed2=true;
  if(es.some(e=>e.type==='land')&&b.x>c.feel5.gap1B&&b.x<c.feel5.gap2A)
   receivingLandings++;
  if(es.some(e=>e.type==='fall')){fell=true;fallX=b.x;break;}
  if(es.some(e=>e.type==='seat')){seated=true;break;}
 }
 return {start,fell,seated,passed1,passed2,receivingLandings,fallX,maxX};
}
test('identical late-stage physical states: right-only fails second obstacle; controllable catch clears both at 30/60/120fps',()=>{
 for(const fps of [30,60,120]){
  const direct=finalTrial(fps);
  assert.ok(direct.fell&&!direct.seated,'uncorrected input must fail '+fps);
  assert.ok(direct.maxX>c.feel5.gap2A,'not an arbitrary first-gap block '+fps);
  for(const [start,end]of [[42540,42710],[42600,42730]]){
   const controlled=finalTrial(fps,start,end);
   assert.deepEqual(controlled.start,direct.start,'identical physical start '+fps);
   assert.equal(controlled.fell,false, 'no fall with ordinary countersteer '+fps+' '+start);
   assert.equal(controlled.seated,true,'original real goal remains reachable '+fps+' '+start);
   assert.ok(controlled.passed1&&controlled.passed2,'both airborne obstacles completed '+fps);
   assert.ok(controlled.receivingLandings>0,'real intermediate bank catch, not a single invisible jump '+fps);
  }
 }
});

test('the real Story journey 30/60/120fps still has four handoffs, 20 chasm flights, one physical seat and same closing rhythm',()=>{
 for(const fps of [30,60,120]){
  const result=run({fps});
  assert.ok(result.s.returnTitle,fps+' title return');
  assert.equal(result.s.world.handoffs,4);
  assert.deepEqual(result.s.world.stages.completed,[1,2,3,4,5]);
  assert.equal(result.events.filter(e=>e.type==='fall').length,0);
  assert.equal(result.events.filter(e=>e.type==='handoff').length,4);
  assert.equal(result.events.filter(e=>e.type==='seat').length,1);
  assert.ok(Math.abs(result.title-result.seat-6.233333333)<.09);
  for(const id of [G1,G2])assert.ok(result.flights.some(f=>f.gap===id&&f.land),
    'physically airborne and landed across '+id+' @ '+fps);
 }
});
