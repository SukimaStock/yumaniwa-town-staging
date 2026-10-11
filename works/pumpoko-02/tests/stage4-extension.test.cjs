'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./harness.cjs');
const {course:current,run,atStage,crossing}=require('./five-stage-review.cjs');
const {withoutStage5,withoutStage4}=require('./phrases-reference.cjs');
const baselineCurrent=withoutStage5(current);
const P=require('../physics.js'),W=require('../world.js');
const BASE='251f9da7937cf268d718c1410e2cd4bafde91be2';
const old=()=>harness({sourceRef:BASE}).w.FruitLabCourses.get('world4');
const STAGE4_JOIN=27950,DX=2400;

test('STAGE 4 additive insertion: the preceding four gaps and surprise high far shore are EXACT',()=>{
 const base=old(),now=baselineCurrent,g=now.gaps.find(g=>g.id==='stage4-choice');
 assert.equal(now.gaps.length,base.gaps.length+1,'only one new gap');
 assert.deepEqual(now.gaps.filter(g=>g.stage===4&&g.id!=='stage4-choice'),base.gaps.filter(g=>g.stage===4));
 assert.deepEqual(now.curves.underground2.filter(p=>p[0]<=STAGE4_JOIN),
  base.curves.underground2.filter(p=>p[0]<=STAGE4_JOIN),'all four existing lips, intermediate basin and entry remain identical');
 const high=now.gaps.find(g=>g.id==='stage4-3'),before=base.gaps.find(g=>g.id==='stage4-3');
 assert.deepEqual(high,before,'protected screenshot high-bank chasm remains at same x and width');
 const y=x=>W.curve('underground2',x,now).y,prior=x=>W.curve('underground2',x,base).y;
 for(const x of [high.a-80,high.a,high.b,high.b+80])assert.ok(Math.abs(y(x)-prior(x))<1e-9,'protected far-shore Hermite shape '+x);
 assert.ok(y(high.b)-y(high.a)>50,'far shore is genuinely higher by over 50 world units');
 assert.deepEqual([g.a,g.b,g.b-g.a],[29440,29560,120]);
 assert.deepEqual(now.feel4.points,now.curves.underground2.filter(p=>p[0]>STAGE4_JOIN&&p[0]<28470+DX));
 for(const [name,p]of Object.entries(now.curves))
  assert.ok(p.every((q,i)=>q.every(Number.isFinite)&&(!i||q[0]>p[i-1][0])),'strict Hermite order '+name);
});

test('normalizing ONLY the Stage 4 insertion reproduces the entire exact prior main world',()=>{
 const base=old(),normal=withoutStage4(current);
 assert.deepEqual(normal,base,'no existing bank, chasm, socket, roof, checkpoint or ending change');
 assert.deepEqual(baselineCurrent.curves.underground2.filter(p=>p[0]>=28470+DX),
  base.curves.underground2.filter(p=>p[0]>STAGE4_JOIN).map(p=>[p[0]+DX,p[1],p[2]]));
 assert.deepEqual(baselineCurrent.curves.finish,base.curves.finish.map(p=>[p[0]+DX,p[1],p[2]]));
 assert.deepEqual(baselineCurrent.stages.map(s=>s.endX-base.stages[s.id-1].endX),[0,0,0,DX,DX]);
 assert.equal(baselineCurrent.stages[3].cameraFloor,base.stages[3].cameraFloor);
 assert.equal(baselineCurrent.stages[3].failY,base.stages[3].failY);
 assert.equal(baselineCurrent.stages[3].retrySeconds,base.stages[3].retrySeconds);
 assert.equal(baselineCurrent.goal.x-base.goal.x,DX);
 assert.equal(baselineCurrent.goal.speed,base.goal.speed);
 assert.equal(baselineCurrent.goal.dwell,base.goal.dwell);
});

test('new choice chasm is real empty air and natural physics permits retreat, not forced crossing',()=>{
 const g=current.gaps.find(g=>g.id==='stage4-choice'),startX=29310;
 for(const x of [g.a+36,(g.a+g.b)/2,g.b-36]){
  assert.equal(W.groundFrame(g.layer,x,current).support,false);
  const body={...P.body('rutabaga',0),x,y:W.curve(g.layer,x,current).y+32,layer:g.layer};
  assert.ok(W.contact(body,current).distance>body.r,'no phantom ground in new gap');
 }
 for(const x of [g.a,g.b])assert.notEqual(W.groundFrame(g.layer,x,current).support,false);
 const crossingExample=crossing(g);
 assert.ok(crossingExample.success,'from normal run-up, momentum clears the new gap');
 for(const fps of [30,60,120])for(const retreatSeconds of [0,1.7,2,2.4]){
  const st=atStage(4),w=st.world,b=w.rutabaga,frame=W.curve('underground2',startX,current);
  Object.assign(b,{x:frame.x+frame.nx*b.r,y:frame.y+frame.ny*b.r,
    vx:0,vy:0,grounded:true,landing:null,exiting:false,safety:false,layer:'underground2'});
  w.camera={x:b.x,y:b.y+70,vx:0,vy:0};P.clearInput(w);
  let crossed=false,failed=false,minX=b.x;
  for(let i=0;i<fps*21;i++){
   const axis=i/fps<retreatSeconds?-1:1;
   P.input(w,axis);
   const es=W.update(w,1/fps);minX=Math.min(minX,b.x);
   if(b.x>g.b+80&&b.grounded){crossed=true;break}
   if(es.some(e=>e.type==='fall')){failed=true;break}
  }
  if(retreatSeconds){
   assert.ok(crossed&&!failed,retreatSeconds+' seconds backing up really crosses at '+fps+' fps');
   assert.ok(minX<startX-150,'real backward travel before accelerating');
  }else assert.ok(failed&&!crossed,'direct from low-speed resting spot fails naturally at '+fps+' fps');
 }
});

test('full title-to-title regression: all five stages, four baton passes, final goal and 6.23 s outro',()=>{
 for(const fps of [30,60,120]){
  const r=run({fps});
  assert.ok(r.s.returnTitle,fps+' returns to title');
  assert.equal(r.s.world.handoffs,4);
  assert.deepEqual(r.s.world.stages.completed,[1,2,3,4,5]);
  assert.equal(r.events.filter(e=>e.type==='fall').length,0);
  assert.equal(r.events.filter(e=>e.type==='handoff').length,4);
  assert.equal(r.events.filter(e=>e.type==='seat').length,1);
  assert.ok(Math.abs(r.title-r.seat-6.23333333)<.09);
  assert.ok(r.flights.some(f=>f.gap==='stage4-choice'&&f.land),'new gap genuinely crossed and landed');
 }
});
