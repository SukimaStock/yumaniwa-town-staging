'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./harness.cjs');
const {course:current,run,crossing,placed}=require('./five-stage-review.cjs');
const {withoutStage4}=require('./phrases-reference.cjs');
const c=withoutStage4(current);
const P=require('../physics.js'),W=require('../world.js'),S=require('../story.js');
const BASE='e26b23940730823c8ee3b96dc13224a69720bfa9';
const old=()=>harness({sourceRef:BASE}).w.FruitLabCourses.get('world4');
const serialized=v=>JSON.stringify(v);
const SH=2200,JOIN=16680,NEW_ID='stage3-feel';

test('additive STAGE 3: all three previous cliffs and shoulders stay exactly authored',()=>{
 const previous=old();
 const newG=c.gaps.find(g=>g.id===NEW_ID);
 assert.equal(c.gaps.length,previous.gaps.length+1);
 assert.deepEqual(c.gaps.filter(g=>g.stage===3&&g.id!==NEW_ID),previous.gaps.filter(g=>g.stage===3));
 assert.deepEqual(c.curves.return.filter(p=>p[0]<=JOIN),previous.curves.return.filter(p=>p[0]<=JOIN));
 assert.deepEqual(c.curves.return.filter(p=>p[0]>=previous.curves.return.find(p=>p[0]>JOIN)[0]+SH),
   previous.curves.return.filter(p=>p[0]>JOIN).map(p=>[p[0]+SH,p[1],p[2]]));
 assert.deepEqual([newG.a,newG.b,newG.b-newG.a],[18440,18550,110]);
 assert.equal(c.feel3.shift,SH);
 assert.deepEqual(c.feel3.points,c.curves.return.filter(p=>p[0]>JOIN&&p[0]<JOIN+SH+500));
 for(const [layer,points]of Object.entries(c.curves))assert.ok(points.every((p,i)=>p.every(Number.isFinite)&&(!i||p[0]>points[i-1][0])),layer);
});

test('all other stage banks, handoffs, tunnels and final landing pocket retain their relative shape',()=>{
 const previous=old(),shiftPoint=p=>[p[0]+SH,p[1],p[2]],shiftGap=g=>({...g,a:g.a+SH,b:g.b+SH});
 for(const layer of ['surface','underground'])assert.equal(serialized(c.curves[layer]),serialized(previous.curves[layer]),layer);
 for(const layer of ['underground2','finish'])assert.deepEqual(c.curves[layer],previous.curves[layer].map(shiftPoint),layer);
 assert.deepEqual(c.gaps.filter(g=>g.stage===4||g.stage===5),
  previous.gaps.filter(g=>g.stage===4||g.stage===5).map(shiftGap));
 assert.deepEqual(c.gaps.filter(g=>g.stage===2||g.layer==='surface'),
  previous.gaps.filter(g=>g.stage===2||g.layer==='surface'));
 assert.deepEqual(c.holes,previous.holes.map((h,i)=>({...h,x:h.x+(i>=2?SH:0)})));
 for(let i=0;i<5;i++){
  const a=c.stages[i],b=previous.stages[i];
  assert.equal(a.kind,b.kind);assert.equal(a.layer,b.layer);
  assert.equal(a.retrySeconds,b.retrySeconds);assert.equal(a.cameraFloor,b.cameraFloor);assert.equal(a.failY,b.failY);
  assert.equal(a.startX,b.startX+(i>=3?SH:0));assert.equal(a.endX,b.endX+(i>=2?SH:0));
  assert.equal(a.spawnX,b.spawnX===null?null:b.spawnX+(i>=3?SH:0));
 }
 assert.deepEqual(c.goal,{...previous.goal,x:previous.goal.x+SH});
 assert.equal(c.goal.x-c.goalOffset,previous.goal.x-previous.goalOffset);
 assert.equal(c.finishX,previous.finishX+SH);
 assert.deepEqual(c.finale.curves.finish,previous.finale.curves.finish.map(shiftPoint));
 assert.deepEqual(c.finale.goal,{...previous.finale.goal,x:previous.finale.goal.x+SH});
 assert.deepEqual(c.surfaceBridges[0],previous.surfaceBridges[0]);
 assert.deepEqual(c.surfaceBridges[1],{...previous.surfaceBridges[1],a:previous.surfaceBridges[1].a+SH,b:previous.surfaceBridges[1].b+SH});
 assert.equal(c.cellars[1].roofHeight,previous.cellars[1].roofHeight);
 assert.equal(c.cellars[1].exitRoof,previous.cellars[1].exitRoof);
 assert.equal(c.cellars[1].roofStart,previous.cellars[1].roofStart+SH);
 assert.equal(c.cellars[1].entryRoof.until,previous.cellars[1].entryRoof.until+SH);
});

test('new gap is genuinely unsupported air with solid lips, and reaches the old exit with existing physics',()=>{
 const g=c.gaps.find(g=>g.id===NEW_ID);
 for(let x=g.a+2;x<g.b;x+=4){
  assert.equal(W.groundFrame('return',x,c).support,false);
  const fruit={...P.body('pumpkin',0),x,y:W.curve('return',x,c).y+36,layer:'return'};
  assert.ok(W.contact(fruit,c).distance>fruit.r,'no imaginary platform');
 }
 for(const x of [g.a,g.b])assert.notEqual(W.groundFrame('return',x,c).support,false);
 const natural=crossing(g);
 assert.ok(natural.success,'ordinary stopped approach clears new gap');
 assert.ok(natural.land,'physical landing confirmed');
 const insufficient=crossing(g,{speed:60,start:g.a-8,steady:true,launch:true});
 assert.equal(insufficient.success,false,'a low-speed leap is not forced across');
 assert.ok(!insufficient.timeout,'insufficient speed results in fall');
});

test('completed full journey 30/60/120fps: no new failure, all four handoffs, goal seating and original closing timing',()=>{
 for(const fps of [30,60,120]){
  const journey=run({fps});
  assert.ok(journey.s.returnTitle,fps+' return to title');
  assert.equal(journey.s.world.handoffs,4);
  assert.deepEqual(journey.s.world.stages.completed,[1,2,3,4,5]);
  assert.equal(journey.events.filter(e=>e.type==='fall').length,0);
  assert.equal(journey.events.filter(e=>e.type==='handoff').length,4);
  assert.equal(journey.events.filter(e=>e.type==='seat').length,1);
  assert.ok(Math.abs(journey.title-journey.seat-6.23333333)<.09);
  assert.ok(journey.flights.some(f=>f.gap===NEW_ID),'new gap traversed with real airborne segment');
 }
});
