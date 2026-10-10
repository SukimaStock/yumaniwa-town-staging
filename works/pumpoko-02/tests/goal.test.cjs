'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const P=require('../physics.js'),W=require('../world.js'),C=require('../courses.js'),S=require('../story.js'),{harness}=require('./harness.cjs');
const BASE='0246b9ec22f7113addca96c53082474ab87fbcc7';
function ready(x=7680,speed=120){
 const w=W.createCourse(C.get('world4'));
 w.holes.forEach((h,i)=>{h.state='complete';h.swaps=1;h.occupant=w.entities[i];Object.assign(h.occupant,{x:h.x,y:h.y,plugged:true,vx:0,vy:0});});
 const b=w.entities.at(-1),f=W.curve('finish',x,w.course);
 Object.assign(b,{x:f.x+f.nx*b.r,y:f.y+f.ny*b.r,vx:speed*f.tx,vy:speed*f.ty,layer:'finish',plugged:false,grounded:true});
 w.active='pumpkin';w.pumpkin=b;w.phase='finish';w.handoffs=4;Object.assign(w.camera,{x:b.x,y:b.y+70,vx:0,vy:0});return w;
}
function run(w,input=0,seconds=45){let count=0,maxX=-Infinity,prior=null;for(let i=0;i<seconds*60&&!w.finished;i++){
 prior={x:w.pumpkin.x,y:w.pumpkin.y};P.input(w,typeof input==='function'?input(w,i):input);
 const events=W.update(w,1/60);count+=events.filter(e=>e.type==='seat').length;maxX=Math.max(maxX,w.pumpkin.x);
 }return {count,maxX,prior};}
test('all existing runtime/assets outside the five declared goal files remain exact current main',()=>{
 const repo=path.resolve(__dirname,'../../..'),allowed=['app.js','courses.js','world.js','story.js','world-draw.js'];
 const files=execFileSync('git',['ls-tree','-r','--name-only',BASE,'works/pumpoko-02/'],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(p=>!p.includes('/tests/')&&!p.includes('/visual-review/')&&!p.endsWith('.md')&&!allowed.includes(path.basename(p)));
 for(const file of files)assert.ok(fs.readFileSync(path.join(repo,file)).equals(execFileSync('git',['show',BASE+':'+file],{cwd:repo,maxBuffer:10e6})),file);
 const before=harness({sourceRef:BASE}).w.FruitLabCourses.get('world4'),after=C.get('world4');
 assert.equal(JSON.stringify(after.curves.finish.slice(0,3)),JSON.stringify(before.curves.finish.slice(0,3)));
 for(const key of ['holes','cellars','surfaces','crestStart','finishX'])assert.equal(JSON.stringify(after[key]),JSON.stringify(before[key]),key);
 for(const key of ['surface','underground','return','underground2'])assert.equal(JSON.stringify(after.curves[key]),JSON.stringify(before.curves[key]),key);
 const oldWorld=execFileSync('git',['show',BASE+':works/pumpoko-02/world.js'],{cwd:repo,encoding:'utf8'}),now=fs.readFileSync(path.join(__dirname,'../world.js'),'utf8');
 assert.equal(now.slice(now.indexOf('  function hole('),now.indexOf('  function surfaceHeight(')),oldWorld.slice(oldWorld.indexOf('  function hole('),oldWorld.indexOf('  function surfaceHeight(')),'all four collision/rejection/compression/transfer functions stay byte-identical');
 const oldApp=execFileSync('git',['show',BASE+':works/pumpoko-02/app.js'],{cwd:repo,encoding:'utf8'}),app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 assert.equal(app.slice(app.indexOf('    audio:'),app.indexOf('    devtools:')),oldApp.slice(oldApp.indexOf('    audio:'),oldApp.indexOf('    devtools:')),'audio resources/volumes/music lifecycle config unchanged');
});
for(const [name,speed,input]of [['slow',10,0],['ordinary',120,0],['fast held-right',620,1],['held-right',120,1],['held-left',120,-1]])test(name+' seats through terrain/contact, ends input and cannot restart or succeed twice',()=>{
 const w=ready(7680,speed),b=w.pumpkin,result=run(w,input);assert.equal(w.finished,true);assert.equal(result.count,1);assert.equal(w.handoffs,4);
 const f=W.contact(b,w.course);assert.ok(Math.abs(f.distance-b.r)<.05);assert.ok(Math.abs(b.x-w.course.goal.x)<=w.course.goal.halfWidth);assert.ok(f.y<=w.course.goal.bottom+w.course.goal.depth);
 assert.ok(Math.hypot(b.x-result.prior.x,b.y-result.prior.y)<=w.course.goal.speed/60+.01,'bounded real frame travel at seating; exact single-step no-reposition tested separately');assert.equal(b.x,w.goal.pose.x);assert.equal(b.y,w.goal.pose.y);
 const pose={x:b.x,y:b.y,angle:b.angle};for(let i=0;i<1200;i++){P.input(w,i%2?-1:1);assert.ok(!W.update(w,1/60).some(e=>e.type==='seat'));assert.deepEqual({x:b.x,y:b.y,angle:b.angle},pose);assert.equal(w.target,0);assert.equal(w.axis,0);}
});
test('stopping before the rise does not finish, and ordinary controls recover',()=>{
 const w=ready(7300,0),b=w.pumpkin;run(w,0,2);assert.equal(w.finished,false);assert.ok(Math.abs(b.x-7300)<1);assert.equal(w.target,0);
 run(w,1);assert.equal(w.finished,true);
});
test('fast free entry can overshoot, then reverse and return without hidden assistance',()=>{
 const w=ready(7680,620);let overshot=false;const r=run(w,(w)=>{if(w.pumpkin.x>7900)overshot=true;return overshot?-1:0;},4);
 assert.ok(overshot);assert.ok(r.maxX>7900);assert.equal(w.finished,false,'passing the pocket at speed cannot finish');
 run(w,1);assert.equal(w.finished,true);assert.ok(w.pumpkin.x>7700&&w.pumpkin.x<7800);
});
test('contact, layer, actual support, all four handoffs and low speed are required; finishX passage is insufficient',()=>{
 for(const [name,patch]of [['airborne',{grounded:false,y:260}],['early handoff',{handoffs:3}],['outside pocket',{x:7900}],['fast crossing',{vx:620}],['wrong layer',{layer:'return'}]]){
  const w=ready(7745,0);if('handoffs'in patch)w.handoffs=patch.handoffs;else Object.assign(w.pumpkin,patch);P.input(w,0);W.update(w,P.STEP);assert.equal(w.finished,false,name);
 }
});
test('existing integrator remains identical on the new terrain until the explicit seating latch',()=>{
 const oldW=harness({sourceRef:BASE}).w.FruitLabWorld;
 for(const speed of [10,120,620]){
  const a=ready(7680,speed),b=structuredClone(a);let seated=false;
  for(let i=0;i<7200;i++){
   const input=speed===620?1:0;P.input(a,input);P.input(b,input);W.update(a,P.STEP);oldW.update(b,P.STEP);
   if(a.finished){seated=true;assert.ok(Math.hypot(a.pumpkin.x-b.pumpkin.x,a.pumpkin.y-b.pumpkin.y)<1e-8,'latch changes velocity/input, not the attained position');break;}
   assert.equal(JSON.stringify(P.snapshot(a)),JSON.stringify(P.snapshot(b)));
  }assert.ok(seated);
 }
});
test('goal rest overlaps continuous final camera, retains 2.5s hold/3.6s return and rebuilds the next journey',()=>{
 const s=S.create();s.phase='playing';s.world=ready(7680,120);s.view={...s.world.camera,z:.8};let count=0,previous={...s.view},maxJump=0,start=null,fixed=null,returnAt=null;
 for(let i=0;i<3600&&!s.returnTitle;i++){
  count+=S.update(s,1,1/60).filter(e=>e.type==='seat').length;
  if(s.phase==='coast'&&start===null)start=s.world.time;
  if(s.phase==='coast'||s.phase==='ending')maxJump=Math.max(maxJump,Math.hypot(s.view.x-previous.x,s.view.y-previous.y));
  if(s.ending?.settledAt!=null&&fixed===null)fixed=s.world.time;
  if(s.phase==='returning'&&returnAt===null)returnAt=s.world.time;
  if(s.ending?.settledAt!=null&&s.phase==='ending')for(const b of [s.world.pumpkin,s.world.holes[3].occupant]){assert.ok(Math.abs((b.x-s.view.x)*s.view.z)<160);assert.ok(Math.abs((b.y-s.view.y)*s.view.z)<270);}
  previous={...s.view};
 }
 assert.equal(count,1);assert.ok(s.returnTitle);assert.ok(maxJump<10);assert.ok(Math.abs(fixed-start-6)<=1/60+.001);assert.ok(Math.abs(returnAt-fixed-2.5)<=1/60+.001);assert.ok(Math.abs(s.world.time-returnAt-3.6)<=1/60+.001);
 const old=s.world;S.beginJourney(s);assert.notEqual(s.world,old);assert.equal(s.world.finished,false);assert.equal(s.world.goal.state,'approach');assert.equal(s.world.goal.seatedAt,null);assert.equal(s.world.handoffs,0);
});
test('real app emits one softer existing shell sound and preserves pause/mute/replay lifecycle',()=>{
 const h=harness(),api=h.w.PumpokoStory;let state;const update=api.update;api.update=(s,...args)=>{state=s;return update(s,...args);};h.frame();
 state.phase='playing';state.world=ready(7680,120);state.view={...state.world.camera,z:.8};
 const audio=h.w.SSE.audio,played=[],play=audio.play.bind(audio);audio.play=(name,options)=>{played.push({name,options});return play(name,options);};
 h.key('keydown','ArrowRight');for(let i=0;i<1800&&!state.world.finished;i++)h.frame();assert.ok(state.world.finished);
 const seated=played.filter(e=>e.options?.playbackRate===.88);assert.equal(seated.length,1);assert.equal(seated[0].name,'shell');assert.equal(seated[0].options.volume,audio.baseline().reference.se.soft*.72);
 const pose={x:state.world.pumpkin.x,y:state.world.pumpkin.y},time=state.ending.time;h.w.emit('blur');h.advance(2);assert.equal(state.ending.time,time);h.w.emit('focus');h.frame();assert.ok(state.ending.time-time<.04);
 h.pointer('pointerdown',750,400);assert.equal(h.probe().pointer,null);assert.equal(h.probe().target,0);
 for(let i=0;i<1200&&!state.returnTitle;i++)h.frame();assert.ok(state.returnTitle);assert.equal(played.filter(e=>e.options?.playbackRate===.88).length,1);assert.deepEqual({x:state.world.pumpkin.x,y:state.world.pumpkin.y},pose);assert.deepEqual(h.errors,[]);
});
module.exports={ready,run,BASE};
test('final contact path has no folded circle offset; goal squash is short, grounded, read-only and restores the exact art',()=>{
 const c=C.get('world4');for(let x=7300;x<8540;x+=2){const f=W.curve('finish',x,c);assert.ok(1-36*f.curvature/(1+f.slope*f.slope)**1.5>.24,'no contact fold at '+x);}
 const h=harness(),w=ready(7680,120);run(w,0);assert.ok(w.finished);const {createCanvas}=require('@napi-rs/canvas'),canvas=createCanvas(390,740),native=canvas.getContext('2d');
 for(const [age,expected]of [[0,null],[.16,[1+.085*.6,1-.085]],[.40,[1-.012*.6,1+.012]],[.6,null]]){
  w.time=w.goal.seatedAt+age;const prior=JSON.stringify(w),scales=[];
  const context=new Proxy(native,{get(t,k){const v=Reflect.get(t,k,t);if(k==='scale')return(...a)=>{scales.push(a);return v.apply(t,a);};return typeof v==='function'?v.bind(t):v;},set(t,k,v){return Reflect.set(t,k,v,t);}});
  context.resetTransform();context.translate(0,740);context.scale(1,-1);h.w.PumpokoWorldDraw(context,w,{x:w.pumpkin.x,y:w.pumpkin.y+70,z:.8});
  const squash=scales.filter(a=>a[0]>.95&&a[0]<1.06&&a[1]>.90&&a[1]<1.02&&(Math.abs(a[0]-1)>.001||Math.abs(a[1]-1)>.001));
  if(expected)assert.ok(squash.some(a=>a.every((v,i)=>Math.abs(v-expected[i])<1e-9)));else assert.equal(squash.length,0);
  assert.equal(JSON.stringify(w),prior);
 }
});
test('a muted seat is consumed once and is not replayed on unmute',()=>{
 const h=harness(),api=h.w.PumpokoStory;let state;const update=api.update;api.update=(s,...a)=>{state=s;return update(s,...a);};h.frame();state.phase='playing';state.world=ready(7680,120);state.view={...state.world.camera,z:.8};
 h.w.SSE.audio.enabled=false;h.key('keydown','ArrowRight');for(let i=0;i<1800&&!state.world.finished;i++)h.frame();assert.ok(state.world.finished);const sounds=h.sounds.length;
 h.w.SSE.audio.enabled=true;h.advance(1);assert.equal(h.sounds.length,sounds);assert.deepEqual(h.errors,[]);
});

test('every part of the final approach restarts without pumping or precise speed; cubic slopes stay below default drive balance',()=>{
 const c=C.get('world4'),balance=P.defaults().pumpkin.response/P.defaults().pumpkin.mass/P.G;
 for(let i=3;i<c.curves.finish.length&&c.curves.finish[i][0]<=7690;i++){
  const a=c.curves.finish[i-1],b=c.curves.finish[i],length=b[0]-a[0];
  const qa=6*(a[1]-b[1])/length+3*a[2]+3*b[2],qb=6*(b[1]-a[1])/length-4*a[2]-2*b[2];
  const t=qa?-qb/(2*qa):-1,maximum=Math.max(a[2],b[2],t>0&&t<1?qa*t*t+qb*t+a[2]:-Infinity);
  assert.ok(maximum<balance-.05,'analytic positive slope bound at '+a[0]+'..'+b[0]);
 }
 for(const x of [7300,7350,7400,7450,7500,7550,7600,7620,7650,7700,7850]){
  const w=ready(x,0);run(w,1,12);assert.equal(w.finished,true,'restart from '+x);assert.ok(w.time<6,'short, unassisted recovery at '+x);assert.equal(w.handoffs,4);
 }
});
