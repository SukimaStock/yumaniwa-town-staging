'use strict';
const {approvedLogoPath}=require('./approved-logo.cjs');
const {SHIFT,x:shiftX,protectPhysics}=require('./stage1-reference.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const S=require('../story.js'),P=require('../physics.js'),{harness}=require('./harness.cjs'),{BASE,collect}=require('./timing-review.cjs');
const axis=(s,i)=>require('./five-stage-controls.cjs').axis(s.world);
function enter(api){const s=api.create();api.beginJourney(s);for(let i=0;i<1200&&s.phase==='opening';i++)api.update(s,0,1/60);assert.equal(s.phase,'playing');return s;}
test('runtime/art/assets outside approved timing and goal files remain exact accepted main',()=>{
 const repo=path.resolve(__dirname,'../../..');const files=execFileSync('git',['ls-tree','-r','--name-only',BASE,'works/pumpoko-02/'],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(p=>!approvedLogoPath(p)&&!p.includes('/tests/')&&!p.includes('/visual-review/')&&!p.endsWith('.md')&&!['/physics.js','/story.js','/app.js','/courses.js','/world.js','/world-draw.js'].some(x=>p.endsWith(x)));
 protectPhysics();
 for(const p of files)assert.ok(fs.readFileSync(path.join(repo,p)).equals(execFileSync('git',['show',BASE+':'+p],{cwd:repo,maxBuffer:10e6})),p);
});
test('real title interaction has exactly one-second after-detachment pause and retains four natural handoffs',()=>{
 const r=collect();assert.ok(Math.abs(r.events.opening-r.events.loose-1)<=1/60+1e-8);assert.ok(r.events.playing>r.events.opening+6.4);
 assert.ok(r.events.fixed>=r.events.ending);assert.ok(Math.abs(r.events.returning-r.events.fixed-1)<=1/60+1e-8);
 assert.ok(Math.abs(r.events.title-r.events.returning-2.2)<=1/60+1e-8);
});
test('shot overlaps coast, widens monotonically, holds an exact view for one second and restores replay',()=>{
 const s=enter(S);let shotStart,held=null,returnAt,priorZ=1,firstCoast,previous={...s.view},maxJump=0;
 for(let i=0;i<10800&&!s.returnTitle;i++){
  const input=s.phase==='playing'?axis(s,i):0;const prev=s.phase;S.update(s,input,1/60);
  if(prev==='playing'&&s.phase==='coast'){shotStart=s.world.time;firstCoast={...s.view};}
  if(s.phase==='coast'||s.phase==='ending'){
   assert.ok(s.ending);assert.ok(s.ending.target.z<=priorZ+1e-10);priorZ=s.ending.target.z;
   maxJump=Math.max(maxJump,Math.hypot(s.view.x-previous.x,s.view.y-previous.y));
   if(s.ending.time>=3)for(const b of [s.world.pumpkin,(s.world.finale||s.world).holes.at(-1).occupant]){assert.ok(Math.abs((b.x-s.view.x)*s.view.z)<160);assert.ok(Math.abs((b.y-s.view.y)*s.view.z)<270);}
   if(s.ending.settledAt!==null){if(!held)held={time:s.world.time,view:{...s.view}};assert.deepEqual(s.view,held.view,'no follow or zoom breathing during hold');}
  }
  if(prev==='ending'&&s.phase==='returning')returnAt=s.world.time;
  previous={...s.view};
 }
 assert.ok(s.returnTitle);assert.equal(s.world.handoffs,4);assert.ok(held.time-shotStart>=3-1/60);assert.ok(Math.abs(returnAt-held.time-1)<=1/60+1e-8);assert.ok(maxJump<10);
 assert.ok(Math.abs(firstCoast.z-held.view.z)>.01,'camera travel begins before rest, not afterwards');
 const old=s.world;S.beginJourney(s);assert.notEqual(s.world,old);assert.equal(s.ending,null);assert.equal(s.world.handoffs,0);
});
test('matched opening/body starts yield exact previous-main trajectories across the complete protected entry terrain',()=>{
 const base=require('./stage1-reference.cjs').BASE,before=harness({sourceRef:base}).w.PumpokoStory,a=enter(before),b=enter(S);
 assert.equal(JSON.stringify(before.nurseryPoses(a)),JSON.stringify(S.nurseryPoses(b)));
 for(let i=0;i<10800;i++){
  assert.equal(JSON.stringify(a.world.pumpkin),JSON.stringify(b.world.pumpkin),'same body at '+i);
  assert.equal(JSON.stringify(a.world.camera),JSON.stringify(b.world.camera),'same model camera at '+i);
  if(b.world.pumpkin.x>1100)return;
  before.update(a,1,1/60);S.update(b,1,1/60);
 }
 assert.fail('did not traverse protected entry terrain');
});
test('final shot pauses on lifecycle interruption without timer catch-up or residual input',()=>{
 const h=harness(),api=h.w.PumpokoStory;let state;const update=api.update;api.update=(s,...a)=>{state=s;return update(s,...a);};
 h.pointer('pointerdown',750,400);for(let i=0;i<1800&&h.probe().phase==='title';i++){h.key('keyup',i%60===0?'ArrowRight':'ArrowLeft');h.key('keydown',i%60===0?'ArrowLeft':'ArrowRight');h.frame();}
 h.key('keyup','ArrowLeft');h.key('keyup','ArrowRight');for(let i=0;i<1200&&h.probe().phase==='opening';i++)h.frame();
 for(let i=0;i<10800&&h.probe().phase==='playing';i++){h.key(require('./five-stage-controls.cjs').axis(h.probe().model)?'keydown':'keyup','ArrowRight');h.frame();}
 assert.equal(state.phase,'coast');const time=state.ending.time,view={...state.view};h.w.emit('blur');h.advance(2);assert.equal(state.ending.time,time);assert.equal(JSON.stringify(state.view),JSON.stringify(view));
 h.w.emit('focus');h.frame();assert.ok(state.ending.time-time<=1/30);assert.equal(h.probe().target,0);assert.deepEqual(h.errors,[]);
});
