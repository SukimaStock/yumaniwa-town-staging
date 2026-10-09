'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../physics.js'),W=require('../world.js'),C=require('../courses.js'),S=require('../story.js');
const LabP=require('../../pumpkin-rutabaga-lab/physics.js'),LabW=require('../../pumpkin-rutabaga-lab/world.js'),LabC=require('../../pumpkin-rutabaga-lab/courses.js');
const {harness}=require('./harness.cjs');
const axis=(s,i)=>s.world.active==='rutabaga'&&i%40===0?0:1;
function finish(s){S.start(s);for(let i=0;i<60*25&&!s.world.finished;i++)S.update(s,axis(s,i),1/60);assert.ok(s.world.finished);return s;}
function ending(s){finish(s);for(let i=0;i<60*60&&s.phase!=='ending';i++)S.update(s,0,1/60);assert.equal(s.phase,'ending');return s;}
test('adopted physics, world, course and fruit artwork are byte-identical independent copies',()=>{
  for(const file of ['physics.js','world.js','courses.js','draw.js'])assert.ok(fs.readFileSync(path.join(__dirname,'..',file)).equals(fs.readFileSync(path.join(__dirname,'../../pumpkin-rutabaga-lab',file))),file);
  assert.deepEqual(C.get('world4'),LabC.get('world4'));
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.equal(/pumpkin-rutabaga-lab|measurements\.js|data-mode|world-course|sliders|tuning/.test(html),false);
  assert.ok(html.includes('../../engine/sukimastock-engine.v0.3.0.js'));assert.ok(html.includes('../../engine/codea-lite.v1.0.0.js'));
});
test('title freezes the same initial pumpkin and entering applies held input immediately without moving the model',()=>{
  const s=S.create(),initial=P.snapshot(s.world);S.update(s,0,.05);assert.deepEqual(P.snapshot(s.world),initial);
  const view={...s.view};S.start(s);assert.deepEqual(P.snapshot(s.world),initial);assert.equal(S.start(s),false);assert.deepEqual(s.view,view);
  S.update(s,1,1/60);assert.equal(s.world.target,1);assert.ok(s.world.time>0);assert.ok(s.world.pumpkin.x!==initial.pumpkin.x);assert.ok(Math.abs(s.view.z-view.z)<.01);
});
test('entire playable journey exactly matches lab acceleration, rebound, four swaps and model camera at diverse fps/tuning',()=>{
  for(const fps of [30,60,120])for(const extreme of [null,2,3]){
    const s=S.create();if(extreme)for(const [group,defs]of Object.entries({...P.PARAMETERS,world:W.PARAMETERS}))for(const [key,d]of Object.entries(defs))s.world.settings[group][key]=d[extreme];
    const lab=LabW.createCourse(LabC.get('world4'),JSON.parse(JSON.stringify(s.world.settings)));S.start(s);
    for(let i=0;i<fps*20;i++){const input=Math.floor(i/fps*3)%2?1:0;S.update(s,input,1/fps);LabP.input(lab,input);LabW.update(lab,1/fps);assert.deepEqual(P.snapshot(s.world),LabP.snapshot(lab));}
  }
});
test('input-driven four swaps stay bounded, plant exactly four bodies and preserve camera/input at every handoff',()=>{
  const s=S.create();S.start(s);let count=0,last={...s.view},maxStep=0;
  for(let i=0;i<60*25&&!s.world.finished;i++){
    const input=axis(s,i);S.update(s,input,1/60);const w=s.world,b=w[w.active];
    maxStep=Math.max(maxStep,Math.hypot(s.view.x-last.x,s.view.y-last.y));last={...s.view};
    assert.ok(Math.abs((b.x-s.view.x)*s.view.z)<450&&Math.abs((b.y-s.view.y)*s.view.z)<320);
    if(w.handoffs>count){assert.equal(w.handoffs,count+1);count++;assert.equal(w.target,1);assert.equal(w.holes[count-1].occupant.plugged,true);assert.equal(b.plugged,false);}
    const mouth=w.holes.some(h=>h.state==='compressing'&&h.incoming===b)||b.exiting;
    if(!mouth)assert.ok(W.contact(b,w.course).distance>=b.r-.05);
  }
  assert.equal(count,4);assert.equal(s.phase,'coast');assert.ok(maxStep<18);assert.equal(s.world.entities.filter(b=>b.plugged).length,4);assert.ok(Math.hypot(s.world.pumpkin.vx,s.world.pumpkin.vy)>10);
});
test('ending waits for release and natural slow motion, preserves both real bodies, camera continuity and lingering title',()=>{
  const s=finish(S.create());for(let i=0;i<120;i++)S.update(s,1,1/60);assert.equal(s.phase,'coast','held input can continue sliding');
  for(let i=0;i<60*60&&s.phase!=='ending';i++)S.update(s,0,1/60);assert.equal(s.phase,'ending');assert.ok(Math.hypot(s.world.pumpkin.vx,s.world.pumpkin.vy)<35);
  const pumpkin=s.world.pumpkin,rutabaga=s.world.holes[3].occupant;assert.equal(rutabaga.kind,'rutabaga');let last={...s.view},maxJump=0;
  for(let i=0;i<60*12;i++){
    S.update(s,0,1/60);maxJump=Math.max(maxJump,Math.hypot(s.view.x-last.x,s.view.y-last.y));last={...s.view};
    for(const b of [pumpkin,rutabaga])assert.ok(Math.abs((b.x-s.view.x)*s.view.z)<420&&Math.abs((b.y-s.view.y)*s.view.z)<280);
    assert.equal(s.world.pumpkin,pumpkin);assert.equal(s.world.holes[3].occupant,rutabaga);assert.equal(rutabaga.x,3600);assert.equal(rutabaga.y,30);assert.equal(s.world.handoffs,4);
  }
  assert.ok(maxJump<5);assert.equal(s.phase,'title');assert.equal(s.returnTitle,true);assert.equal(s.world.pumpkin,pumpkin);assert.ok(s.view.z<1);
  const x=pumpkin.x;S.update(s,0,.05);assert.notEqual(pumpkin.x,x,'residual roll does not freeze when title text returns');
  const old=s.world;S.start(s);assert.notEqual(s.world,old);assert.equal(s.world.handoffs,0);assert.equal(s.previous.world,old);assert.equal(S.dissolve(s),1);
  for(let i=0;i<90;i++)S.update(s,1,1/60);assert.equal(s.previous,null);assert.equal(s.opening,null);
});
test('each adopted hole retains low/high and off-centre contacts, rejection and capped inherited speed',()=>{
  for(let index=0;index<4;index++)for(const speed of index%2?[60,700]:[2,700])for(const offset of [-35,35]){
    const s=S.create(),w=s.world,h=w.holes[index],b=w.entities[index];S.start(s);
    for(let j=0;j<index;j++){const old=w.holes[j];old.state='complete';old.swaps=1;old.occupant=w.entities[j];Object.assign(old.occupant,{plugged:true,x:old.x,y:old.y});}
    w.active=b.kind;w[b.kind]=b;w.phase=h.entryLayer;w.handoffs=index;w.settings.handoff.cap=220;
    Object.assign(b,{plugged:false,grounded:false,layer:h.entryLayer,x:h.x+offset,y:h.y-h.direction*Math.sqrt((b.r+h.occupant.r-1)**2-offset**2),vx:0,vy:h.direction*speed});
    assert.ok(W.eligible(w,h,b));const out=h.occupant;
    for(let i=0;i<240&&!h.swaps;i++)S.update(s,1,P.STEP);assert.equal(h.swaps,1);assert.equal(w[w.active],out);assert.ok(Math.hypot(out.vx,out.vy)<=220+1e-8);assert.equal(Math.sign(out.vy),h.direction);
    for(let i=0;i<240;i++)S.update(s,1,P.STEP);assert.equal(h.swaps,1);assert.equal(h.occupant,b);assert.equal(b.x,h.x);assert.equal(b.y,h.y);
  }
});
test('canonical Engine/Codea start, touch, keyboard, interruption, replay and single RAF remain coherent',()=>{
  const h=harness();assert.equal(h.probe().phase,'title');h.advance(1);assert.equal(h.probe().model.time,0);
  h.pointer('pointerdown');assert.equal(h.probe().phase,'playing');assert.equal(h.ids.get('title').hidden,true);
  // Explicitly traverse the route with the same live pointer cadence as the lab.
  h.key('keydown','KeyR');h.frame();h.key('keyup','KeyR');h.pointer('pointerdown');
  for(let i=0;i<60*25&&h.probe().model.handoffs<4;i++){if(i%40===0&&h.probe().model.active==='rutabaga'){h.pointer('pointerup');h.frame();h.pointer('pointerdown');}h.frame();}
  assert.equal(h.probe().model.handoffs,4);h.pointer('pointerup');
  for(let i=0;i<60*65&&!h.probe().returnTitle;i++)h.frame();assert.equal(h.probe().phase,'title');assert.equal(h.ids.get('title').hidden,false);
  const tones=h.tones.length;h.ids.get('start').emit('click');assert.equal(h.probe().model.handoffs,0);h.pointer('pointerdown');h.advance(.7);assert.ok(h.tones.length>tones,'replay restarts the sound cooldown clock');h.w.emit('blur');const time=h.probe().model.time;h.advance(2);assert.equal(h.probe().model.time,time);assert.equal(h.probe().pointer,null);h.w.emit('focus');h.frame();assert.equal(h.probe().axis,0);
  h.key('keydown','KeyR');h.frame();h.key('keyup','KeyR');assert.equal(h.probe().phase,'title');h.key('keydown','ArrowRight');h.frame();assert.equal(h.probe().phase,'playing');h.key('keyup','ArrowRight');assert.equal(h.raf.size,1);assert.deepEqual(h.errors,[]);
});
test('landscape and portrait native Canvas draw the opening, all layers, final pair and replay without model mutation',()=>{
  for(const viewport of [{width:1180,height:820},{width:390,height:844},{width:844,height:390}]){
    const h=harness({...viewport,native:true});h.pointer('pointerdown',viewport.width*.75,viewport.height*.55);
    for(let i=0;i<60*25&&h.probe().model.handoffs<4;i++){if(i%40===0&&h.probe().model.active==='rutabaga'){h.pointer('pointerup',viewport.width*.75,viewport.height*.55);h.frame();h.pointer('pointerdown',viewport.width*.75,viewport.height*.55);}h.frame();}
    assert.equal(h.probe().model.handoffs,4);h.pointer('pointerup',viewport.width*.75,viewport.height*.55);
    for(let i=0;i<60*65&&!h.probe().returnTitle;i++)h.frame();assert.ok(h.probe().returnTitle);assert.deepEqual(h.errors,[]);assert.ok(h.renderCanvas.toBuffer('image/png').length>1000);
  }
  const h=harness(),s=ending(S.create()),{createCanvas}=require('@napi-rs/canvas'),canvas=createCanvas(1000,760);for(const time of [0,1,3,6,10]){while(s.elapsed<time&&s.phase==='ending')S.update(s,0,1/60);const before=P.snapshot(s.world);h.w.PumpokoWorldDraw(canvas.getContext('2d'),s.world,s.view);assert.deepEqual(P.snapshot(s.world),before);}
});
