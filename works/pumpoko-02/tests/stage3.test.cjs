'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {BASE,g1,g2,trial}=require('./stage3-review.cjs'),{course,run}=require('./five-stage-review.cjs'),W=require('../world.js'),P=require('../physics.js');
const previous=()=>require('./harness.cjs').harness({sourceRef:BASE}).w.FruitLabCourses.get('world4');
const json=v=>JSON.stringify(v);
test('accepted STAGE 3 preserves its original experiment and protects sockets, checkpoints, finale and runtime',()=>{
 const old=previous();for(const key of Object.keys(old).filter(k=>!['curves','gaps'].includes(k)))assert.equal(json(course[key]),json(old[key]),key);
 // Later stage-phrase work has its own fresh-base exact scope protection.
 require('./phrases-reference.cjs').protect();
 assert.equal(json(course.gaps.find(g=>g.id==='stage3-3')),json(old.gaps.find(g=>g.id==='stage3-3')));
 for(const range of [p=>p[0]<g1.b,p=>p[0]>=15590])assert.equal(json(course.curves.return.filter(range)),json(old.curves.return.filter(range)));
 assert.equal(course.gaps.filter(g=>g.stage===3).length,3);assert.equal(g2.a-g1.b,300);assert.ok(g2.a-g1.b>=P.body('pumpkin',0).r*8);
 for(const file of ['physics.js','world.js','story.js','world-draw.js','app.js','draw.js','index.html','opening.js','opening-draw.js','prologue.js','material.js','title-draw.js','style.css']){
  assert.ok(fs.readFileSync(__dirname+'/../'+file).equals(execFileSync('git',['show',BASE+':works/pumpoko-02/'+file])),file+' byte match');
 }
});
test('identical checkpoint starts: held right falls at second gap, braking clears both, low momentum falls at first, actual stop/reverse/restart clears',()=>{
 for(const fps of [30,60,120]){
  assert.equal(trial({mode:'settle',fps}).success,true,'moderate ground braking also works');
  const held=trial({mode:'held',fps}),brake=trial({mode:'brake',fps}),low=trial({mode:'low',fps}),stop=trial({mode:'stop',fps});
  for(const r of [brake,low,stop])assert.deepEqual(r.initial,held.initial);
  assert.equal(held.success,false);assert.ok(held.fall&&held.fall.x>g2.a,'second gap miss');
  assert.equal(brake.success,true);assert.ok(brake.lands.some(l=>l.x>g1.b&&l.x<g2.a),'actual intermediate contact');assert.ok(brake.lands.some(l=>l.x>=g2.b-36),'far bank');
  assert.equal(low.success,false);assert.ok(low.fall&&low.fall.x>g1.a&&low.fall.x<g1.b,'first gap shortfall');
  assert.equal(stop.success,true);assert.ok(stop.stopped.grounded&&Math.abs(stop.stopped.vx)<8,'real near-zero velocity before reverse');assert.ok(stop.reversed&&stop.minX<stop.stopped.x-150);
  for(const r of [held,low]){assert.ok(r.retry);assert.ok(Math.abs(r.retry.time-r.fall.time-.65)<=1/fps+1e-8);assert.equal(r.retry.handoffs,2);assert.deepEqual(r.retry.completed,[1,2]);assert.equal(r.retry.phase,'playing');assert.equal(r.retry.input,0);assert.equal(r.retry.body.vx,0);assert.equal(r.retry.body.vy,0);assert.equal(r.retry.body.grounded,true);}
 }
});
test('braking accepts a range of starts/releases, and stopped first and intermediate runups remain attainable',()=>{
 for(const [start,end]of [[-160,40],[-160,120],[-80,40],[0,40],[0,80]])for(const fps of [30,60,120])assert.equal(trial({fps,brake:g1.b+start,end:g1.b+end}).success,true,`${fps} ${start}/${end}`);
 for(const fps of [30,60,120])assert.equal(trial({fps,stoppedStart:true}).success,true,'stopped first runup '+fps);
 assert.equal(require('./five-stage-review.cjs').crossing(g2).success,true,'stop directly on bank, accelerate again');
});
test('every new lip is solid and every interior is empty in collision and native soil drawing',()=>{
 const old=previous();for(const g of [g1,g2])for(const x of [(g.a+g.b)/2,g.a+40,g.b-40]){
  assert.equal(W.groundFrame(g.layer,x,course).support,false);for(const y of [-600,0,200,400,650])assert.ok(W.contact({...P.body('pumpkin',0),x,y,layer:g.layer},course).distance>36);
 }for(const g of [g1,g2])for(const x of [g.a,g.b])assert.notEqual(W.groundFrame(g.layer,x,course).support,false);
 const {createCanvas}=require('@napi-rs/canvas'),w=require('./harness.cjs').harness().w,canvas=createCanvas(390,740),ctx=canvas.getContext('2d');
 for(const g of [g1,g2]){const s=W.createCourse(course);s.entities=[];s.holes=[];const view={x:(g.a+g.b)/2,y:W.curve(g.layer,g.a,course).y,z:.8};ctx.fillStyle=w.PumpokoMaterial.air;ctx.fillRect(0,0,390,740);ctx.save();ctx.translate(0,740);ctx.scale(1,-1);w.PumpokoWorldDraw(ctx,s,view);ctx.restore();for(const depth of [60,150,250]){const rgb=[...ctx.getImageData(195,340+depth*.8,1,1).data].slice(0,3);assert.ok(rgb[0]>220&&rgb[1]>215&&rgb[2]>185);}}
 assert.equal(old.gaps.find(g=>g.id==='stage3-2').b-old.gaps.find(g=>g.id==='stage3-2').a,180);
});
test('accepted whole journey at all frame rates preserves four handoffs and final seat/title/replay',()=>{
 for(const fps of [30,60,120]){const r=run({fps,capture:true});assert.ok(r.s.returnTitle);assert.equal(r.s.world.handoffs,4);assert.deepEqual(r.s.world.stages.completed,[1,2,3,4,5]);assert.equal(r.events.filter(e=>e.type==='seat').length,1);assert.equal(r.events.filter(e=>e.type==='fall').length,0);assert.ok(Math.abs(r.title-r.seat-6.233333333)<.09);
  for(const f of r.frames.filter(f=>f.stage===3)){assert.equal(f.view.z,.8);const b=f.world.pumpkin;assert.ok(Math.abs((b.x-f.view.x)*.8)<185);}
 }
});
