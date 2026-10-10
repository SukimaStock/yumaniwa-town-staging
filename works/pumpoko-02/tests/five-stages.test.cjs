'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {course:c,run,atStage,placed,crossing,measure}=require('./five-stage-review.cjs');
const {previous,protectCourse,protectRuntime}=require('./five-stage-reference.cjs');
const S=require('../story.js'),P=require('../physics.js'),W=require('../world.js'),{harness}=require('./harness.cjs');
test('protected STAGE 1 boundaries, all physics, assets, socket and goal kernels are protected; stage lengths increase ~20%',()=>{
 protectCourse();protectRuntime();const m=measure();
 for(const spec of m.stages){assert.ok(spec.screens>10);if(spec.ratio)assert.ok(spec.ratio>=1.15&&spec.ratio<=1.25);}
 assert.deepEqual(m.stages.map(s=>s.gaps),[2,2,3,4,5]);
 for(const layer of Object.values(c.curves))assert.ok(layer.every((p,i)=>!i||p[0]>layer[i-1][0]),'strictly ordered Hermite points');
});
test('STAGE 1 opening, trajectory, camera and anticipation match the old runtime with identical authored terrain',()=>{
 const old=previous().PumpokoStory,a=old.create(),b=S.create();old.beginJourney(a);S.beginJourney(b);
 // Compare runtime behavior on matched terrain; fresh-base terrain scope is
 // protected separately, including the two newly authored STAGE 1 points.
 a.world.course={...a.world.course,curves:{...a.world.course.curves,surface:c.curves.surface}};
 for(let i=0;i<2400&&!b.world.handoffs;i++){
  const axis=b.phase==='playing'?1:0;old.update(a,axis,1/60);S.update(b,axis,1/60);
  assert.equal(JSON.stringify(a.world.pumpkin),JSON.stringify(b.world.pumpkin),'complete first-stage body '+i);
  assert.equal(JSON.stringify(a.world.camera),JSON.stringify(b.world.camera),'first-stage camera '+i);
  assert.equal(JSON.stringify(a.view),JSON.stringify(b.view),'first-stage presentation '+i);
  assert.equal(JSON.stringify(old.nurseryPoses(a)),JSON.stringify(S.nurseryPoses(b)),'opening/nursery '+i);
 }assert.equal(b.world.handoffs,1);
});
test('every gap is real unsupported air at flight/fall heights and retains the original circle/air response',()=>{
 for(const g of c.gaps){
  for(let x=g.a+1;x<g.b;x+=3)assert.equal(W.groundFrame(g.layer,x,c).support,false,g.id);
  for(let x=g.a+36;x<=g.b-36;x+=8)for(let y=-1200;y<=800;y+=20){const b={...P.body(c.stages.find(s=>s.layer===g.layer).kind,0),x,y,layer:g.layer};assert.ok(W.contact(b,c).distance>b.r,g.id+' no phantom floor');}
  const s=placed(g),b=s.world[s.world.active];Object.assign(b,{x:(g.a+g.b)/2,y:W.curve(g.layer,g.a,c).y+100,vx:180,vy:20,grounded:false});
  const before={...b},p=s.world.settings[b.kind];P.integrate(s.world,b,1,P.STEP,{contact:b=>W.contact(b,c),frame:x=>W.groundFrame(g.layer,x,c),constrain(){}});
  assert.ok(Math.abs(b.vx-before.vx-p.response/p.mass*p.air*P.STEP)<1e-8);assert.ok(Math.abs(b.vy-before.vy+P.G*P.STEP)<1e-8);
 }
});
test('all sixteen gaps restart from a safe stopped runup; insufficient unarmed momentum naturally fails',()=>{
 for(const g of c.gaps){const a=crossing(g);assert.equal(a.success,true,g.id+' rest');assert.ok(a.land,'real landing '+g.id);
  const low=crossing(g,{speed:60,start:g.a-8,launch:true,steady:true});assert.equal(low.success,false,g.id+' insufficient momentum');assert.equal(low.timeout,undefined,g.id+' falls rather than sticking');
 }
});
test('each stage naturally falls offscreen, restores only its checkpoint in .65s and clears input',()=>{
 for(const stage of [1,2,3,4,5])for(const fps of [30,60,120]){
  const g=c.gaps.find(g=>(g.stage||1)===stage),s=placed(g,{speed:60,start:g.a-8,launch:true}),before=s.world,completed=[...before.stages.completed];
  let fall=null,retry=null,view;for(let i=0;i<fps*10;i++){
   const ev=S.update(s,1,1/fps);
   if(ev.some(e=>e.type==='fall')){fall=i/fps;view={...s.view};const b=before[before.active];assert.ok(400+(b.y+b.r-view.y)*.8<0,'whole fruit below screen');}
   if(s.phase==='retrying')assert.deepEqual(s.view,view,'short frozen recovery view');
   if(ev.some(e=>e.type==='retry')){retry=i/fps;break;}
  }
  assert.ok(fall!==null&&retry!==null,'natural fall '+stage);assert.ok(Math.abs(retry-fall-.65)<=1/fps+1e-9);
  const w=s.world,b=w[w.active];assert.equal(w.handoffs,stage-1);assert.deepEqual(w.stages.completed,completed);assert.equal(w.stages.failedAt,null);
  assert.equal(w.target,0);assert.equal(w.axis,0);assert.equal(b.vx,0);assert.equal(b.vy,0);assert.equal(b.grounded,true);assert.ok(Math.abs(W.contact(b,c).distance-b.r)<1e-6);
  assert.equal(s.phase,'playing');assert.equal(s.opening,null);assert.equal(w.camera.vx,0);assert.equal(w.camera.vy,0);
  if(stage>1){assert.equal(w.stages.checkpoint.stage,stage);for(const h of w.holes.slice(0,stage-1)){assert.equal(h.swaps,1);assert.equal(h.state,'complete');assert.ok(w.entities.includes(h.occupant));}}
  S.update(s,1,1/fps);assert.equal(w.target,0);S.update(s,0,1/fps);S.update(s,1,1/fps);assert.equal(w.target,1);
 }
});
test('restored stages can complete their next baton/goal, retaining all earlier clears',()=>{
 for(const stage of [2,3,4,5]){const s=atStage(stage),start=s.world.handoffs;let success=false;
  for(let i=0;i<60*75;i++){const ev=S.update(s,require('./five-stage-controls.cjs').axis(s.world),1/60);assert.ok(!ev.some(e=>e.type==='fall'),'restored normal route '+stage);
   if(s.world.handoffs>start||s.world.finished){success=true;break;}}
  assert.ok(success,'retry route clear '+stage);assert.deepEqual(s.world.stages.completed,Array.from({length:stage},(_,i)=>i+1));
 }
});
test('whole runs at 30/60/120fps clear four sockets, seat once, keep ending 6.23s and allow replay',()=>{
 for(const fps of [30,60,120]){const r=run({fps,release:4});assert.ok(r.s.returnTitle);assert.equal(r.s.world.handoffs,4);assert.equal(r.s.world.goal.state,'seated');
  assert.deepEqual(r.s.world.stages.completed,[1,2,3,4,5]);assert.equal(r.events.filter(e=>e.type==='seat').length,1);assert.equal(r.events.filter(e=>e.type==='fall').length,0);
  assert.ok(Math.abs(r.title-r.seat-6.2333333333)<.09);const old=r.s.world;S.beginJourney(r.s);assert.notEqual(r.s.world,old);assert.equal(r.s.world.handoffs,0);assert.equal(r.s.world.finale,undefined);}
});
test('later gap camera keeps .8 zoom, previews far banks and stays bounded through flight',()=>{
 const r=run({capture:true}),seen=new Map();for(const frame of r.frames){if(frame.world.finished)break;const b=frame.world[frame.world.active];assert.equal(frame.view.z,.8);
  assert.ok(Math.abs((b.x-frame.view.x)*.8)<185,'fruit remains horizontally visible');
  for(const g of c.gaps.filter(g=>g.layer===b.layer))if(b.x<g.a&&g.b+40<frame.view.x+195/.8&&!seen.has(g.id))seen.set(g.id,frame.time);
 }
 // Nine 60Hz frames is the 0.15s threshold; tolerate only subtraction roundoff.
 for(const flight of r.flights)assert.ok(flight.depart.time-seen.get(flight.gap)>=.15-1e-9,'bank visible before '+flight.gap);
});
test('all stage app retries clear keyboard/pointer/autorepeat and accept a fresh action without restarting BGM',()=>{
 for(const stage of [2,3,4,5])for(const mode of ['key','pointer']){const h=harness(),api=h.w.PumpokoStory;let s;const update=api.update;api.update=(state,...a)=>{s=state;return update(state,...a);};h.frame();
  const g=c.gaps.find(g=>g.stage===stage);Object.assign(s,placed(g,{speed:60,start:g.a-8,launch:true}));
  if(mode==='key')h.key('keydown');else h.pointer('pointerdown',600,400);let failed=false;
  for(let i=0;i<600;i++){h.frame();if(s.phase==='retrying')failed=true;if(failed&&s.phase==='playing')break;}assert.ok(failed);
  assert.equal(h.probe().freshInput,true);assert.equal(h.probe().pointer,null);assert.equal(h.probe().target,0);
  const music=h.media.filter(m=>m.src.includes('pumpoko-bgm'));assert.equal(music.length,1);const plays=music[0].plays;
  h.w.emit('keydown',{code:'ArrowRight',key:'ArrowRight',repeat:true,target:h.canvas});h.frame();assert.equal(h.probe().target,0);
  if(mode==='key'){h.key('keyup');h.key('keydown');}else h.pointer('pointerdown',600,400,2);h.frame();assert.equal(h.probe().target,1);assert.equal(music[0].plays,plays);assert.deepEqual(h.errors,[]);
 }
});
test('STAGE 1 drawing is pixel-identical on matched terrain; every later chasm removes soil rather than painting a hole',()=>{
 const {createCanvas}=require('@napi-rs/canvas'),{render}=require('./terrain-review.cjs'),old=previous(),now=harness().w;
 for(const x of [-100,0,1700,3400,4800,5100]){
  const view={x,y:W.curve('surface',x,c).y+70,z:.8};
  const a=render(old,old.FruitLabWorld.createCourse({...old.FruitLabCourses.get('world4'),curves:{...old.FruitLabCourses.get('world4').curves,surface:c.curves.surface}}),view),b=render(now,W.createCourse(c),view);
  assert.ok(Buffer.from(a.getContext('2d').getImageData(0,0,390,740).data).equals(Buffer.from(b.getContext('2d').getImageData(0,0,390,740).data)),'unchanged first-stage pixels '+x);
 }
 const canvas=createCanvas(390,740),ctx=canvas.getContext('2d');
 for(const g of c.gaps){const world=W.createCourse(c);world.entities=[];world.holes=[];const y=W.curve(g.layer,g.a,c).y,view={x:(g.a+g.b)/2,y,z:.8};ctx.resetTransform();ctx.fillStyle='#faf1dc';ctx.fillRect(0,0,390,740);ctx.save();ctx.translate(0,740);ctx.scale(1,-1);now.PumpokoWorldDraw(ctx,world,view);ctx.restore();
  for(const depth of [50,120,250]){const rgb=[...ctx.getImageData(195,Math.round(340+depth*.8),1,1).data].slice(0,3);assert.ok(rgb[0]>220&&rgb[1]>215&&rgb[2]>185,'air under '+g.id);}
 }
});
test('departure and airborne positions stay continuous at 240Hz on every authored gap',()=>{
 for(const g of c.gaps){const s=placed(g),b=s.world[s.world.active];let crossed=false;
  for(let i=0;i<240*12;i++){const before={...b},ev=S.update(s,b.kind==='rutabaga'&&Math.floor(i/4)%40<2?0:1,P.STEP);
   if(before.x>g.a-80&&before.x<g.b+80){assert.ok(Math.hypot(b.x-before.x,b.y-before.y)<5,'no position jump '+g.id);if(before.grounded&&!b.grounded)assert.ok(Math.hypot(b.vx-before.vx,b.vy-before.vy)<210,'existing one-shot boost or tangent release '+g.id);}
   if(ev.some(e=>e.type==='land')&&b.x>g.b-b.r){crossed=true;assert.ok(Math.hypot(b.vx,b.vy)<=P.SPEED+1e-8);break;}
  }assert.ok(crossed,'real continuous landing '+g.id);
 }
});
