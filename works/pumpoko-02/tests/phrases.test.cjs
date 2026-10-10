'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {trial,pair,previous,starting}=require('./phrases-review.cjs'),{protect}=require('./phrases-reference.cjs'),{course,run}=require('./five-stage-review.cjs'),W=require('../world.js'),P=require('../physics.js'),S=require('../story.js');
test('fresh-base scope: only four terrain phrases change; accepted STAGE 3, all stage/checkpoint/goal data and runtime bytes remain exact',()=>{
 protect();assert.deepEqual(course.stages.map(s=>course.gaps.filter(g=>g.layer===s.layer).length),[2,2,3,4,5]);
 for(const stage of [2,4,5]){const [a,b]=pair(course,stage);assert.ok(b.a-a.b>=P.body(course.stages[stage-1].kind,0).r*8,'broad receiving bank '+stage);}
});
test('same stationary terrain-review starts at 30/60/120fps: held misses STAGE 2/4/5; controlled input clears; weak momentum misses; real grounded stop then reacceleration clears',()=>{
 for(const stage of [1,2,4,5])for(const fps of [30,60,120]){
  const held=trial({stage,fps,mode:'held'}),good=trial({stage,fps}),weak=trial({stage,fps,mode:'weak'}),stop=trial({stage,fps,mode:'stop'}),[first,last]=pair(course,stage);
  for(const r of [good,weak,stop])assert.deepEqual(r.initial,held.initial);
  assert.equal(held.success,stage===1);assert.equal(good.success,true,stage+' '+fps);assert.equal(weak.success,false,stage+' weak '+fps);assert.equal(stop.success,true,stage+' stop '+fps);
  assert.ok(stop.stopped?.grounded&&Math.abs(stop.stopped.vx)<10,'actual physics stop');assert.ok(stop.inputs.some(i=>i.axis<0)&&stop.inputs.some(i=>i.phase==='restart'&&i.axis>0));
  if(stage===2||stage===4){assert.ok(good.lands.some(l=>l.x>first.b&&l.x<last.a));assert.equal(good.pushes,stage===2?1:2);}
  if(stage===5){const a=held.lands.find(l=>l.x>first.b),b=good.lands.find(l=>l.x>first.b);assert.ok(a.x-b.x>30,'brake changes actual receiving position');}
  for(const r of [held,weak].filter(r=>!r.success)){assert.ok(r.fall&&r.retry);assert.ok(Math.abs(r.retry.time-r.fall.time-.65)<=1/fps+1e-8);assert.equal(r.retry.handoffs,stage-1);assert.deepEqual(r.retry.completed,Array.from({length:stage-1},(_,i)=>i+1));assert.equal(r.retry.input,0);require('./handoff-retry-reference.cjs').restoredBody(r.retry.body,r.retry.checkpointBody);assert.equal(r.retry.phase,'playing');}
 }
});
test('STAGE 4 requires the second push as well as the first; all pre-change held runs clear the same phrase',()=>{
 for(const fps of [30,60,120]){const r=trial({stage:4,mode:'one-push',fps});assert.equal(r.success,false);assert.equal(r.pushes,1);assert.ok(r.retry);}
 for(const stage of [1,2,4,5])assert.equal(trial({stage,before:true}).success,true,'baseline held '+stage);
});
test('generous prelanding input windows and a family of braking positions work without frame-precise timing',()=>{
 for(const stage of [2,4])for(const lead of [50,70,90])for(const release of [.05,.08,.1])for(const fps of [30,60,120])assert.equal(trial({stage,fps,early:true,lead,release}).success,true,`${stage} ${fps} ${lead} ${release}`);
 for(const brakeStart of [60,70,80,90,100])for(const brakeEnd of [10,20,30])for(const fps of [30,60,120])assert.equal(trial({stage:5,fps,brakeStart,brakeEnd}).success,true,`${fps} brake ${brakeStart}/${brakeEnd}`);
});
test('modified gap interiors are empty at all heights; native soil drawing matches solid banks and unsupported gaps',()=>{
 const {createCanvas}=require('@napi-rs/canvas'),api=require('./harness.cjs').harness().w,canvas=createCanvas(390,740),ctx=canvas.getContext('2d');
 for(const stage of [1,2,4,5])for(const g of pair(course,stage)){
  for(const x of [g.a+40,(g.a+g.b)/2,g.b-40]){assert.equal(W.groundFrame(g.layer,x,course).support,false);for(const y of [-1200,-600,0,200,400,650])assert.ok(W.contact({...P.body(course.stages[stage-1].kind,0),x,y,layer:g.layer},course).distance>36);}
  for(const x of [g.a,g.b])assert.notEqual(W.groundFrame(g.layer,x,course).support,false);
  const m=W.createCourse(course);m.entities=[];m.holes=[];const view={x:(g.a+g.b)/2,y:W.curve(g.layer,g.a,course).y,z:.8};ctx.resetTransform();ctx.fillStyle=api.PumpokoMaterial.air;ctx.fillRect(0,0,390,740);ctx.save();ctx.translate(0,740);ctx.scale(1,-1);api.PumpokoWorldDraw(ctx,m,view);ctx.restore();for(const depth of [60,150,250]){const rgb=[...ctx.getImageData(195,340+depth*.8,1,1).data].slice(0,3);assert.ok(rgb[0]>220&&rgb[1]>215&&rgb[2]>185);}
 }
});
test('retry routes retain earlier clears, all stopped runups work, and the full five stages reach four handoffs and the original goal/title at every frame rate',()=>{
 for(const g of course.gaps)assert.equal(require('./five-stage-review.cjs').crossing(g).success,true,'stopped '+g.id);
 for(const stage of [2,3,4,5]){const s=starting(stage),initial=s.world.handoffs;let done=false;for(let i=0;i<60*70;i++){const es=S.update(s,require('./five-stage-controls.cjs').axis(s.world),1/60);assert.ok(!es.some(e=>e.type==='fall'));if(s.world.handoffs>initial||s.world.finished){done=true;break;}}assert.ok(done);}
 for(const fps of [30,60,120]){const r=run({fps,capture:true});assert.ok(r.s.returnTitle);assert.equal(r.s.world.handoffs,4);assert.deepEqual(r.s.world.stages.completed,[1,2,3,4,5]);assert.equal(r.events.filter(e=>e.type==='fall').length,0);assert.equal(r.events.filter(e=>e.type==='seat').length,1);assert.ok(Math.abs(r.title-r.seat-6.233333333)<.09);for(const f of r.frames.filter(f=>!f.world.finished)){assert.equal(f.view.z,.8);const b=f.world[f.world.active];assert.ok(Math.abs((b.x-f.view.x)*.8)<185);}}
});
