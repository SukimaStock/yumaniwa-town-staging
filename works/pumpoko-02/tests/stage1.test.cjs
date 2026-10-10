'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../physics.js'),W=require('../world.js'),C=require('../courses.js'),S=require('../story.js');
const {harness}=require('./harness.cjs'),{BASE,SHIFT,source,protectPhysics}=require('./stage1-reference.cjs'),{enter,placed,crossing,travel,measure}=require('./stage1-review.cjs');
const c=C.get('world4');
test('only two finite gaps; actual gameplay is 10–12 screens; opening terrain, downstream layers and all mouth/cellar/goal dimensions are exact translations',()=>{
 protectPhysics();const old=harness({sourceRef:BASE}).w.FruitLabCourses.get('world4');
 assert.equal(c.gaps.filter(g=>g.layer==='surface').length,2);const run=travel();assert.ok(run.screens>=10&&run.screens<=12);assert.equal(390/.8,487.5);
 assert.equal(JSON.stringify(c.curves.surface.slice(0,8)),JSON.stringify(old.curves.surface.slice(0,8)));
 assert.equal(JSON.stringify(c.curves.surface.slice(-3).map(p=>[p[0]-SHIFT,...p.slice(1)])),JSON.stringify(old.curves.surface.slice(-3)));
 require('./five-stage-reference.cjs').protectCourse();
 require('./five-stage-reference.cjs').protectRuntime();
});
test('gap interior has no frame or phantom floor at any flight/fall height, including below both lips',()=>{
 for(const g of c.gaps.filter(g=>g.layer==='surface')){for(let x=g.a+1;x<g.b;x++)assert.equal(W.groundFrame(g.layer,x,c).support,false);
  for(let x=g.a+36;x<=g.b-36;x+=4)for(let y=-800;y<=950;y+=10){const b={...P.body('pumpkin',0),layer:g.layer,x,y};const f=W.contact(b,c);assert.ok(f.distance>b.r,'no interior floor at '+x+'/'+y);}
  for(const x of [g.a-2,g.b+2]){const b={...P.body('pumpkin',0),layer:g.layer,x,y:W.curve(g.layer,x,c).y-80};assert.equal(W.contact(b,c).support,false,'no underside snap');}
 }
});
test('existing air acceleration/gravity works through gap, without ground attraction or forced acceleration',()=>{
 for(const control of [-1,0,1]){const s=placed(c.gaps.filter(g=>g.layer==='surface')[1]),b=s.pumpkin;Object.assign(b,{x:3480,y:600,vx:220,vy:20,grounded:true});
  const before={...b};P.integrate(s,b,control,P.STEP,{contact:b=>W.contact(b,c),frame:x=>W.groundFrame('surface',x,c),constrain(){}});
  assert.equal(b.grounded,false);assert.ok(Math.abs(b.vx-(before.vx+control*850/2.4*.16*P.STEP))<1e-9);assert.ok(Math.abs(b.vy-(before.vy-720*P.STEP))<1e-9);
  assert.ok(Math.abs(b.x-(before.x+b.vx*P.STEP))<1e-9);assert.ok(Math.abs(b.y-(before.y+b.vy*P.STEP))<1e-9);
 }
});
test('both existing-action runups work from rest; insufficient momentum falls and second gap demands more speed',()=>{
 const m=measure();assert.ok(m.gaps[1].minimumTestedTangentSpeed>m.gaps[0].minimumTestedTangentSpeed+100);
 for(const g of c.gaps.filter(g=>g.layer==='surface')){assert.ok(crossing(g,0,g.a-g.runup).success,'restart runup '+g.id);assert.equal(crossing(g,120).success,false,'natural low-speed fall '+g.id);assert.ok(crossing(g,500).success);}
 assert.ok(m.fastClear<30);assert.ok(m.normalClear>=30&&m.normalClear<=50);assert.equal(m.normalRetries,1);
});
test('edge departure, airborne travel and landing remain continuous at fixed 240Hz, and full clear works at 30/60/120fps',()=>{
 const s=enter();let departures=0,landings=0;for(let i=0;i<9000&&!s.world.handoffs;i++){
  const b=s.world.pumpkin,before={...b};const events=S.update(s,1,P.STEP),near=c.gaps.filter(g=>g.layer==='surface').find(g=>before.x>g.a-50&&before.x<g.b+60);
  if(near){assert.ok(Math.hypot(b.x-before.x,b.y-before.y)<4,'no edge position teleport');
   if(before.grounded&&!b.grounded){departures++;assert.ok(Math.hypot(b.vx-before.vx,b.vy-before.vy)<5,'departure preserves attained velocity');}
   if(events.some(e=>e.type==='land')&&b.x>near.b-36){landings++;assert.ok(Math.hypot(b.vx,b.vy)<=P.SPEED);}
  }
 }
 assert.equal(departures,2);assert.ok(landings>=2);assert.equal(s.world.handoffs,1);
 for(const fps of [30,60,120]){const r=travel({fps,full:true,releaseFrames:4});assert.equal(r.state.world.handoffs,4);assert.ok(r.state.returnTitle);assert.ok(Math.abs(r.clear-12.6)<.06);assert.ok(Math.abs(r.title-r.seat-6.2333333333)<.09);}
});
test('failure follows natural flight offscreen, holds view .65s, restores safe birth pose and waits for fresh input',()=>{
 for(const fps of [30,60,120]){const s=enter(),start={...s.stage1Start};s.nursery.fall=null;s.world=placed(c.gaps.filter(g=>g.layer==='surface')[0],120);const b=s.world.pumpkin;
  s.view={x:b.x,y:b.y+70,z:.8};Object.assign(s.world.camera,{x:b.x,y:b.y+70,vx:0,vy:0});let fall=null,view=null,retry=null;
  for(let i=0;i<fps*8;i++){const events=S.update(s,1,1/fps);if(events.some(e=>e.type==='fall')){fall=i/fps;view={...s.view};assert.ok(400+(b.y+b.r-s.view.y)*.8<0,'whole fruit below screen');}
   if(s.phase==='retrying'){assert.deepEqual(s.view,view);assert.equal(s.world.target,0);assert.ok(b.y<c.stage1.failY);}
   if(events.some(e=>e.type==='retry')){retry=i/fps;break;}
  }
  assert.ok(fall!==null&&retry!==null);assert.ok(Math.abs(retry-fall-.65)<=1/fps+1e-9);assert.equal(s.phase,'playing');assert.equal(s.opening,null);assert.equal(s.world.handoffs,0);
  assert.equal(s.world.pumpkin.x,start.x);assert.equal(s.world.pumpkin.y,start.y);assert.equal(s.world.pumpkin.vx,0);assert.equal(s.world.pumpkin.vy,0);assert.equal(s.world.camera.vx,0);assert.equal(s.world.camera.vy,0);
  assert.ok(Math.abs(W.contact(s.world.pumpkin,c).distance-s.world.pumpkin.r)<1e-6);S.update(s,1,1/fps);assert.equal(s.world.target,0);S.update(s,0,1/fps);S.update(s,1,1/fps);assert.equal(s.world.target,1);
 }
});
test('app retry clears held key/pointer, rejects autorepeat, accepts fresh press and preserves music player',()=>{
 for(const mode of ['key','pointer']){const h=harness(),api=h.w.PumpokoStory;let s;const update=api.update;api.update=(state,...args)=>{s=state;return update(state,...args);};h.frame();
  const seeded=enter();Object.assign(s,seeded);s.nursery.fall=null;s.world=placed(c.gaps.filter(g=>g.layer==='surface')[0],120);Object.assign(s.world.camera,{x:s.world.pumpkin.x,y:s.world.pumpkin.y+70,vx:0,vy:0});s.view={...s.world.camera,z:.8};
  if(mode==='key')h.key('keydown');else h.pointer('pointerdown',600,400);let failed=false;
  for(let i=0;i<600;i++){h.frame();if(s.phase==='retrying')failed=true;if(failed&&s.phase==='playing')break;}
  assert.ok(failed);assert.equal(h.probe().freshInput,true);assert.equal(h.probe().pointer,null);assert.equal(h.probe().target,0);const music=h.media.filter(m=>m.src.includes('pumpoko-bgm'));assert.equal(music.length,1);const plays=music[0].plays;
  h.w.emit('keydown',{code:'ArrowRight',key:'ArrowRight',repeat:true,target:h.canvas});h.advance(.3);assert.equal(h.probe().target,0);assert.equal(music[0].plays,plays);
  if(mode==='key'){h.key('keyup');h.key('keydown');}else h.pointer('pointerdown',600,400,2);h.frame();assert.equal(h.probe().freshInput,false);assert.equal(h.probe().target,1);assert.deepEqual(h.errors,[]);
 }
});
test('a fresh key immediately after respawn operates before any neutral waiting frame',()=>{
 const h=harness(),api=h.w.PumpokoStory;let s;const update=api.update;api.update=(state,...args)=>{s=state;return update(state,...args);};h.frame();Object.assign(s,enter());s.nursery.fall=null;s.world=placed(c.gaps.filter(g=>g.layer==='surface')[0],120);s.view={...s.world.camera,z:.8};h.key('keydown');let failed=false;
 for(let i=0;i<600;i++){h.frame();if(s.phase==='retrying')failed=true;if(failed&&s.phase==='playing')break;}
 assert.ok(failed);h.key('keyup');h.key('keydown');h.frame();assert.equal(h.probe().target,1);assert.equal(h.probe().freshInput,false);assert.deepEqual(h.errors,[]);
});
function translate(obj,delta){const seen=new Set();function walk(v){if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(typeof v.x==='number')v.x+=delta;if(typeof v.exitX==='number')v.exitX+=delta;for(const [key,item]of Object.entries(v))if(key!=='course'&&key!=='settings')walk(item);}walk(obj);return obj;}
function near(a,b,label='snapshot'){if(typeof a==='number'){assert.ok(Math.abs(a-b)<1e-5,label+': '+a+' / '+b);return;}if(a&&typeof a==='object'){assert.deepEqual(Object.keys(a),Object.keys(b),label);for(const key of Object.keys(a))near(a[key],b[key],label+'.'+key);return;}assert.equal(a,b,label);}
test('matched STAGE 2 starting states reproduce all later trajectories, contacts, three handoffs and attained goal after translation',()=>{
 const h=harness({sourceRef:BASE}),oldW=h.w.FruitLabWorld,oldP=h.w.FruitLabPhysics,a=oldW.createCourse(h.w.FruitLabCourses.get('world4'));
 for(let i=0;i<6000&&!a.handoffs;i++){oldP.input(a,1);oldW.update(a,P.STEP);}assert.equal(a.handoffs,1);
 const b=translate(structuredClone(a),SHIFT);b.course=require('./five-stage-reference.cjs').previous().FruitLabCourses.get('world4');b.stages=null;let goal=false;
 for(let i=0;i<12000;i++){const axis=a.active==='rutabaga'&&Math.floor(i/4)%40===0?0:1;oldP.input(a,axis);P.input(b,axis);const ea=oldW.update(a,P.STEP),eb=W.update(b,P.STEP).filter(e=>e.type!=='stage-clear');
  near(JSON.parse(JSON.stringify(ea)),JSON.parse(JSON.stringify(eb)),'events');near(oldP.snapshot(a),translate(P.snapshot(b),-SHIFT));
  if(a.finished){assert.equal(b.finished,true);goal=true;break;}
 }assert.ok(goal);assert.equal(b.handoffs,4);
});
test('first baton records indexed STAGE 2 state; each later clear advances checkpoint without a transition',()=>{
 const r=travel(),w=r.state.world,checkpoint=w.stages.checkpoint;assert.equal(r.state.phase,'playing');assert.deepEqual(w.stages.completed,[1]);assert.equal(checkpoint.stage,2);assert.equal(checkpoint.active,'rutabaga');assert.equal(checkpoint.layer,'underground');assert.equal(checkpoint.handoffs,1);assert.equal(checkpoint.entityIndex,1);assert.equal(checkpoint.holes[0].occupantIndex,0);
 for(let i=0;i<10800&&!w.finished;i++)S.update(r.state,require('./five-stage-controls.cjs').axis(w),1/60);assert.notEqual(w.stages.checkpoint,checkpoint);assert.equal(w.stages.checkpoint.stage,5);assert.deepEqual(w.stages.completed,[1,2,3,4,5]);

});
test('gameplay zoom stays .8 and real far-bank landing area is visible before each launch without losing the fruit',()=>{
 const s=enter(),seen={},launch={};for(let i=0;i<1200&&!s.world.handoffs;i++){
  const b=s.world.pumpkin,prior={...b};S.update(s,1,1/60);assert.equal(s.view.z,.8);assert.ok(Math.abs((b.x-s.view.x)*.8)<185);
  for(const g of c.gaps.filter(g=>g.layer==='surface')){if(!seen[g.id]&&b.x<g.a&&g.b+40<s.view.x+195/.8)seen[g.id]=s.world.time;
   if(prior.grounded&&!b.grounded&&b.x>g.a-30&&b.x<g.a+10)launch[g.id]=s.world.time;}
 }
 for(const g of c.gaps.filter(g=>g.layer==='surface'))assert.ok(launch[g.id]-seen[g.id]>.25,'far bank +40 is already visible before '+g.id+' launch');
});
test('gap rendering cuts flesh and rind from the real air; banks retain solid-side rind/cream, no artificial shadow',()=>{
 const {createCanvas}=require('@napi-rs/canvas'),h=harness(),w=h.w,canvas=createCanvas(390,740),ctx=canvas.getContext('2d');
 for(const g of c.gaps.filter(g=>g.layer==='surface')){const world=W.createCourse(c);world.entities=[];world.holes=[];const view={x:(g.a+g.b)/2,y:W.curve('surface',g.a,c).y,z:.8};ctx.resetTransform();ctx.fillStyle='#faf1dc';ctx.fillRect(0,0,390,740);ctx.save();ctx.translate(0,740);ctx.scale(1,-1);w.PumpokoWorldDraw(ctx,world,view);ctx.restore();
  function rgb(x,y){return [...ctx.getImageData(Math.round(195+(x-view.x)*.8),Math.round(340-(y-view.y)*.8),1,1).data].slice(0,3);}
  for(let x=g.a+5;x<g.b-5;x+=5)for(const depth of [10,50,150,300])assert.ok((p=>p[0]>=220&&p[0]<=250&&p[1]>=215&&p[1]<=241&&p[2]>=185&&p[2]<=220)(rgb(x,view.y-depth)),'only background/landscape and its antialiasing in gap');
  const edge=g.a,y=W.curve('surface',edge,c).y-80;
  const rind=[1,3,5].map(i=>parseInt(w.PumpokoMaterial.rind.slice(i,i+2),16)),cream=[1,3,5].map(i=>parseInt(w.PumpokoMaterial.cream.slice(i,i+2),16));
  assert.deepEqual(rgb(edge-10,y),rind);assert.deepEqual(rgb(edge-21,y),cream);
 }
});
