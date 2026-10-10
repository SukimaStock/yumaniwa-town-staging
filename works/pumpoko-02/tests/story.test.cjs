'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../physics.js'),W=require('../world.js'),C=require('../courses.js'),S=require('../story.js'),D=require('../prologue.js');
const LabP=require('../../pumpkin-rutabaga-lab/physics.js'),LabW=require('../../pumpkin-rutabaga-lab/world.js');
const {harness}=require('./harness.cjs');
const axis=(s,i)=>s.world.active==='rutabaga'&&i%40===0?0:1;
function enter(s){S.beginJourney(s);for(let i=0;i<1200&&s.phase==='opening';i++)S.update(s,0,1/60);assert.equal(s.phase,'playing');return s;}
function finish(s){enter(s);for(let i=0;i<60*90&&!s.world.finished;i++)S.update(s,axis(s,i),1/60);assert.ok(s.world.finished);return s;}
function ending(s){finish(s);for(let i=0;i<60*60&&s.phase!=='ending';i++)S.update(s,0,1/60);assert.equal(s.phase,'ending');return s;}
function liveEnter(h){
  for(let i=0;i<60*30&&h.probe().phase==='title';i++){if(i%30===0){h.key('keyup','ArrowRight');h.key('keyup','ArrowLeft');h.key('keydown',i%60===0?'ArrowRight':'ArrowLeft');}h.frame();}
  assert.equal(h.probe().phase,'opening');h.key('keyup','ArrowRight');h.key('keyup','ArrowLeft');for(let i=0;i<60*20&&h.probe().phase==='opening';i++)h.frame();assert.equal(h.probe().phase,'playing');
}
function liveFinish(h){
  liveEnter(h);h.key('keydown','ArrowRight');
  for(let i=0;i<60*90&&!h.probe().finished;i++){if(i%40===0&&h.probe().model.active==='rutabaga'){h.key('keyup','ArrowRight');h.frame();h.key('keydown','ArrowRight');}h.frame();}
  assert.equal(h.probe().model.handoffs,4);assert.ok(h.probe().finished);h.key('keyup','ArrowRight');
  for(let i=0;i<60*90&&!h.probe().returnTitle;i++)h.frame();assert.ok(h.probe().returnTitle);
}
test('physical kernel bytes and asset bytes are preserved; course and material are work-local adaptations',()=>{
  for(const file of ['physics.js','world.js'])assert.ok(fs.readFileSync(path.join(__dirname,'..',file)).equals(fs.readFileSync(path.join(__dirname,'../../pumpkin-rutabaga-lab',file))),file);
  for(const file of ['assets/pumpoko-logo.svg','audio/pumpoko-bgm.mp3','audio/shell.wav','audio/fiber.wav','audio/drum-don.wav','audio/seed.wav'])assert.ok(fs.readFileSync(path.join(__dirname,'..',file)).equals(fs.readFileSync(path.join(__dirname,'../../pumpoko',file))),file);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.equal(/pumpkin-rutabaga-lab|measurements\.js|data-mode|world-course|sliders|tuning/.test(html),false);
  assert.ok(html.includes('../../engine/sukimastock-engine.v0.3.0.js'));assert.ok(html.includes('../../engine/codea-lite.v1.0.0.js'));
});
test('original vessel touch and seed detachment are isolated; frozen world enters without seed-state transfer',()=>{
  const s=S.create(),initial=P.snapshot(s.world);
  assert.equal(D.touch(s.prologue,{id:1,state:'began',x:10,y:730}),false);
  assert.ok(D.touch(s.prologue,{id:1,state:'began',x:195,y:375}));D.touch(s.prologue,{id:1,state:'moving',x:280,y:425});assert.equal(s.prologue.targetX,.38);D.release(s.prologue);
  for(let i=0;i<60*25&&s.phase==='title';i++){S.update(s,Math.floor(i/30)%2?1:-1,1/60);assert.deepEqual(P.snapshot(s.world),initial);}
  assert.equal(s.phase,'opening');assert.ok(D.allLoose(s.prologue));assert.ok(s.prologue.time-s.prologue.looseAt>=.55);
  const entities=s.world.entities;for(let i=0;i<192;i++)S.update(s,1,1/60);assert.equal(s.world.entities,entities);assert.ok(s.world.entities.every(b=>!s.prologue.seeds.includes(b)));
  while(s.phase==='opening')S.update(s,0,1/60);assert.equal(s.world.time,0);assert.equal(s.world.target,0);
  S.update(s,1,1/60);assert.equal(s.world.target,1);assert.ok(s.world.time>0);
});
test('actual seed contacts grow in place and the same seated body begins normal rolling',()=>{
  for(const impulse of [-80,0,80]){
    const s=S.create();for(const p of s.prologue.seeds)p.vx+=impulse;
    const body=s.world.pumpkin,settings=JSON.stringify(s.world.settings),plugs=JSON.stringify(s.world.entities.slice(1));
    S.beginJourney(s);const fall=s.opening;let count=0;
    for(let i=0;i<60*20&&s.phase==='opening';i++){
      S.update(s,1,1/60);
      assert.equal(s.world.time,0);assert.equal(s.world.target,0);assert.equal(s.world.pumpkin,body);
      assert.equal(JSON.stringify(s.world.settings),settings);assert.equal(JSON.stringify(s.world.entities.slice(1)),plugs);
      for(const p of s.nursery.plants){
        const a=fall.seeds[p.id].arrival;assert.ok(a);const root=fall.geometry.worldPoint({x:a.x,y:a.rootY});
        assert.equal(p.x,root.x);assert.equal(p.ground,root.y);assert.ok(Math.abs(p.ground-W.surfaceHeight(p.x,s.world.course))<1e-9);
        const f=fall.geometry.floor(a.x);assert.ok(Math.abs((a.y-f.y)*-f.ny+require('../opening.js').support(a.seed,f.nx,f.ny))<1.2);
        assert.ok(Object.isFrozen(a));assert.equal(a.seed.x,a.x,'planted physical grain is never rearranged');
      }
      count=s.nursery.plants.length;
    }
    assert.equal(s.phase,'playing');assert.ok(count>0);const hero=S.nurseryPoses(s).plants.find(p=>p.hero);
    assert.equal(hero.x,body.x);assert.equal(hero.y,body.y);assert.equal(hero.scale,1);assert.equal(hero.grow,1);
    assert.ok(Math.abs(W.contact(body,s.world.course).distance-body.r)<1e-7);assert.equal(body.artId,hero.id);
    const roots=s.nursery.plants.map(p=>[p.id,p.x,p.ground]),x=body.x;
    for(let i=0;i<90;i++)S.update(s,0,1/60);
    assert.ok(Math.abs(body.x-x)>1,'the unchanged slope starts normal movement without a launch impulse');
    assert.deepEqual(s.nursery.plants.slice(0,roots.length).map(p=>[p.id,p.x,p.ground]),roots);
    assert.equal(s.world.handoffs,0);assert.equal(s.world.target,0);assert.equal(s.view.z,.8);
  }
});
test('adapted terrain with unchanged physics matches lab integrator exactly at diverse fps/tuning',()=>{
  for(const fps of [30,60,120])for(const extreme of [null,2,3]){
    const s=enter(S.create());if(extreme)for(const [group,defs]of Object.entries({...P.PARAMETERS,world:W.PARAMETERS}))for(const [key,d]of Object.entries(defs))s.world.settings[group][key]=d[extreme];
    const lab=LabW.createCourse(C.get('world4'),JSON.parse(JSON.stringify(s.world.settings)));Object.assign(lab.pumpkin,s.world.pumpkin);Object.assign(lab.camera,s.world.camera);
    for(let i=0;i<fps*20;i++){const input=Math.floor(i/fps*3)%2?1:0;S.update(s,input,1/fps);LabP.input(lab,input);LabW.update(lab,1/fps);assert.deepEqual(P.snapshot(s.world),LabP.snapshot(lab));}
  }
});
test('four natural exchanges stay in portrait frame; every plug plants and transfers without resetting input/camera',()=>{
  for(const fps of [30,60,120]){
    const s=enter(S.create());let count=0,last={...s.view},maxStep=0;
    for(let i=0;i<fps*90&&!s.world.finished;i++){
      const input=s.world.active==='rutabaga'&&Math.floor(i/fps*60)%40===0?0:1;S.update(s,input,1/fps);const w=s.world,b=w[w.active];
      maxStep=Math.max(maxStep,Math.hypot(s.view.x-last.x,s.view.y-last.y));last={...s.view};
      assert.ok(Math.abs((b.x-s.view.x)*s.view.z)<185,'horizontal target stays in portrait');assert.ok(Math.abs((b.y-s.view.y)*s.view.z)<330,'vertical target stays in portrait');
      if(w.handoffs>count){assert.equal(w.handoffs,count+1);count++;assert.equal(w.target,1);assert.equal(w.holes[count-1].occupant.plugged,true);assert.equal(b.plugged,false);}
      const mouth=w.holes.some(h=>h.state==='compressing'&&h.incoming===b)||b.exiting;if(!mouth)assert.ok(W.contact(b,w.course).distance>=b.r-.05);
    }
    assert.equal(count,4);assert.equal(s.phase,'coast');assert.ok(maxStep<35);assert.equal(s.world.entities.filter(b=>b.plugged).length,4);
  }
});
test('natural coast and one shot frame real final pair; zoom returns continuously and replay restores four unused sockets',()=>{
  const s=finish(S.create());for(let i=0;i<120;i++)S.update(s,1,1/60);assert.equal(s.phase,'coast');
  for(let i=0;i<60*60&&s.phase!=='ending';i++)S.update(s,0,1/60);assert.equal(s.phase,'ending');assert.ok(Math.hypot(s.world.pumpkin.vx,s.world.pumpkin.vy)<35);
  const pumpkin=s.world.pumpkin,rutabaga=s.world.holes[3].occupant;let last={...s.view},maxJump=0;
  for(let i=0;i<60*11;i++){
    S.update(s,0,1/60);maxJump=Math.max(maxJump,Math.hypot(s.view.x-last.x,s.view.y-last.y));last={...s.view};
    if(s.elapsed>=6)for(const b of [pumpkin,rutabaga]){assert.ok(Math.abs((b.x-s.view.x)*s.view.z)<160);assert.ok(Math.abs((b.y-s.view.y)*s.view.z)<270);}
    assert.equal(s.world.pumpkin,pumpkin);assert.equal(s.world.holes[3].occupant,rutabaga);assert.equal(rutabaga.x,C.get('world4').holes[3].x);assert.equal(rutabaga.y,30);assert.equal(s.world.handoffs,4);
  }
  assert.ok(maxJump<6);while(s.phase==='ending')S.update(s,0,1/60);assert.equal(s.phase,'returning');
  const prologue=s.prologue;for(let i=0;i<240&&s.phase!=='title';i++){S.update(s,0,1/60);assert.ok(Math.abs((pumpkin.x-s.view.x)*s.view.z)<160,'hero stays in portrait during return zoom');}assert.equal(s.phase,'title');assert.ok(s.returnTitle);assert.equal(s.prologue,prologue,'return overlay and title share seed pose');
  const old=s.world;S.beginJourney(s);assert.notEqual(s.world,old);assert.equal(s.world.handoffs,0);assert.ok(s.world.holes.every(h=>!h.swaps&&h.state==='waiting'));
});
test('each hole retains low/high off-centre contacts, rejection, compression time and inherited speed cap',()=>{
  for(let index=0;index<4;index++)for(const speed of index%2?[60,700]:[2,700])for(const offset of [-35,35]){
    const s=enter(S.create()),w=s.world,h=w.holes[index],b=w.entities[index];
    for(let j=0;j<index;j++){const old=w.holes[j];old.state='complete';old.swaps=1;old.occupant=w.entities[j];Object.assign(old.occupant,{plugged:true,x:old.x,y:old.y});}
    w.active=b.kind;w[b.kind]=b;w.phase=h.entryLayer;w.handoffs=index;w.settings.handoff.cap=220;
    Object.assign(b,{plugged:false,grounded:false,layer:h.entryLayer,x:h.x+offset,y:h.y-h.direction*Math.sqrt((b.r+h.occupant.r-1)**2-offset**2),vx:0,vy:h.direction*speed});
    assert.ok(W.eligible(w,h,b));const out=h.occupant;
    for(let i=0;i<240&&!h.swaps;i++)S.update(s,1,P.STEP);assert.equal(h.swaps,1);assert.equal(w[w.active],out);assert.ok(Math.hypot(out.vx,out.vy)<=220+1e-8);assert.equal(Math.sign(out.vy),h.direction);
    for(let i=0;i<240;i++)S.update(s,1,P.STEP);assert.equal(h.swaps,1);assert.equal(h.occupant,b);assert.equal(b.x,h.x);assert.equal(b.y,h.y);
  }
});
test('authored course has distinct long phrases, positive cellar clearances and the same Hermite frame for contact/draw',()=>{
  const c=C.get('world4');assert.ok(c.finishX>7300);assert.equal(c.holes.length,4);
  for(const [layer,points]of Object.entries(c.curves)){
    assert.ok(points.every((p,i)=>!i||p[0]>points[i-1][0]));
    for(let x=points[0][0];x<=points.at(-1)[0];x+=7){const f=W.curve(layer,x,c);assert.ok(Object.values(f).every(Number.isFinite));assert.ok(Math.abs(Math.hypot(f.nx,f.ny)-1)<1e-8);}
  }
  for(const cell of c.cellars)for(let x=cell.left+45;x<cell.right-45;x+=7)assert.ok(W.roof(x,c,cell.layer)-W.curve(cell.layer,x,c).y>68,'cellar does not squeeze bounce body');
  assert.notDeepEqual(c.curves.underground.map(p=>p[1]),c.curves.underground2.map(p=>p[1]));
});
test('stop, reverse and reaccelerate from each surface/underground phrase under unchanged controls',()=>{
  for(const [layer,x] of [['surface',530],['underground',1930],['return',3990],['underground2',6090],['finish',7600]]){
    const s=W.createCourse(C.get('world4')),kind=layer.startsWith('underground')?'rutabaga':'pumpkin',b=P.body(kind,0),f=W.curve(layer,x,s.course);
    Object.assign(b,{x:f.x+f.nx*b.r,y:f.y+f.ny*b.r,layer,plugged:false,grounded:true});s[kind]=b;s.active=kind;s.phase=layer;
    for(let i=0;i<120;i++){P.input(s,-1);W.update(s,1/60);}const reversed=b.x;
    for(let i=0;i<240;i++){P.input(s,i%40===0?0:1);W.update(s,1/60);}assert.ok(b.x>reversed+50,layer);assert.ok(Number.isFinite(b.y));
  }
});
test('canonical Engine/Codea pointer, lifecycle, complete replay and single RAF remain coherent',()=>{
  const h=harness();assert.equal(h.probe().phase,'title');h.advance(1);assert.equal(h.probe().model.time,0);
  // In a 1000x760 viewport the fit canvas is centred; click its logical shell.
  h.pointer('pointerdown',500,380);assert.ok(h.probe().prologue.held);h.pointer('pointercancel');assert.equal(h.probe().prologue.held,false);
  liveFinish(h);liveFinish(h);assert.deepEqual(h.errors,[]);assert.equal(h.probe().phase,'title');
  liveEnter(h);assert.equal(h.probe().model.handoffs,0);h.key('keydown','ArrowRight');h.advance(.7);h.w.emit('blur');const time=h.probe().model.time;h.advance(2);assert.equal(h.probe().model.time,time);assert.equal(h.probe().pointer,null);
  h.w.emit('focus');h.frame();assert.equal(h.probe().axis,0);assert.equal(h.probe().target,0);h.key('keydown','KeyR');h.frame();h.key('keyup','KeyR');assert.equal(h.probe().phase,'title');assert.equal(h.raf.size,1);assert.deepEqual(h.errors,[]);
});
test('native Canvas renders portrait/landscape title, all layers, final pair and replay with read-only artwork',()=>{
  for(const viewport of [{width:1180,height:820},{width:390,height:844},{width:844,height:390}]){
    const h=harness({...viewport,native:true});liveFinish(h);assert.deepEqual(h.errors,[]);assert.ok(h.renderCanvas.toBuffer('image/png').length>1000);
  }
  const h=harness(),s=ending(S.create()),{createCanvas}=require('@napi-rs/canvas'),canvas=createCanvas(390,740);
  for(const time of [0,1,3,6,10]){while(s.elapsed<time&&s.phase==='ending')S.update(s,0,1/60);const before=P.snapshot(s.world);h.w.PumpokoWorldDraw(canvas.getContext('2d'),s.world,s.view);assert.deepEqual(P.snapshot(s.world),before);}
});
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
test('trusted gestures start one original music player; full journey and replay never restart or seek it',async()=>{
  const h=harness();await tick();const music=h.media.find(m=>m.src.includes('pumpoko-bgm'));assert.ok(music);assert.equal(music.plays,0);
  liveFinish(h);await tick();assert.equal(h.media.filter(m=>m.src.includes('pumpoko-bgm')).length,1);assert.equal(music.paused,false);const plays=music.plays,time=music.currentTime;
  h.advance(.5);assert.ok(music.currentTime>time);liveEnter(h);await tick();assert.equal(music.plays,plays);assert.equal(h.media.filter(m=>m.src.includes('pumpoko-bgm')).length,1);
  h.w.emit('blur');await tick();assert.equal(music.paused,true);const old=music.currentTime;h.advance(2);assert.equal(music.currentTime,old);h.w.emit('focus');await tick();h.advance(.5);assert.equal(music.paused,false);assert.ok(music.currentTime>old);assert.equal(music.playbackRate,1);
  h.ids.get('sound').emit('click');await tick();assert.ok(music.paused);const muted=music.currentTime;h.advance(1);assert.equal(music.currentTime,muted);h.ids.get('sound').emit('click');await tick();assert.equal(music.paused,false);
  assert.equal(h.sounds.includes('slide'),false);assert.equal(h.tones.length,0);
});
module.exports={liveEnter,liveFinish};

test('primary touch drives all four sockets and interruption clears pointer/input without changing the world',()=>{
  const h=harness();liveEnter(h);h.pointer('pointerdown',600,400);
  for(let i=0;i<5400&&!h.probe().finished;i++){
    if(i%40===0&&h.probe().model.active==='rutabaga'){h.pointer('pointerup',600,400);h.frame();h.pointer('pointerdown',600,400);}h.frame();
  }
  assert.equal(h.probe().model.handoffs,4);assert.equal(h.probe().phase,'coast');h.pointer('pointerup',600,400);
  for(const [interrupt,resume] of [['resize',null],['pagehide','pageshow'],['blur','focus']]){
    h.pointer('pointerdown',600,400);h.frame();const handoffs=h.probe().model.handoffs;h.w.emit(interrupt);assert.equal(h.probe().pointer,null);assert.equal(h.probe().target,0);assert.equal(h.probe().axis,0);
    if(resume)h.w.emit(resume);h.frame();assert.equal(h.probe().model.handoffs,handoffs);
  }
  assert.equal(h.raf.size,1);assert.deepEqual(h.errors,[]);
});

test('opening interruption pauses the same seeds and growth; reset and replay rebuild the nursery',()=>{
  const h=harness();
  for(let i=0;i<1800&&h.probe().phase==='title';i++){
    if(i%30===0){h.key('keyup','ArrowRight');h.key('keyup','ArrowLeft');h.key('keydown',i%60===0?'ArrowRight':'ArrowLeft');}h.frame();
  }
  h.key('keyup','ArrowRight');h.key('keyup','ArrowLeft');assert.equal(h.probe().phase,'opening');
  h.advance(.6);h.pointer('pointerdown',600,400);assert.equal(h.probe().pointer,null);
  for(const time of [1.6,5.8]){
    while(h.probe().elapsed<time)h.frame();h.w.emit('blur');
    const before=JSON.stringify(h.probe());h.advance(2);assert.equal(JSON.stringify(h.probe()),before);
    h.w.emit('focus');h.frame();assert.equal(h.probe().axis,0);assert.equal(h.probe().target,0);
  }
  h.key('keydown','KeyR');h.frame();h.key('keyup','KeyR');assert.equal(h.probe().phase,'title');assert.equal(h.probe().nursery,null);
  liveFinish(h);liveEnter(h);assert.ok(h.probe().nursery.plants.length>0);assert.equal(h.probe().nursery.plants.filter(p=>p.hero).length,1);assert.equal(h.probe().model.handoffs,0);
  assert.equal(h.raf.size,1);assert.deepEqual(h.errors,[]);
});

test('reused original opening agrees with original journey motion and camera until real rooting at 30/60/120fps',()=>{
  const O=require('../opening.js'),J=require('../../pumpoko/journey.js'),T=require('../title-draw.js');
  for(const fps of [30,60,120]){
    const s=S.create();D.knock(s.prologue,-45,60);D.update(s.prologue,.04);D.release(s.prologue);
    const title=s.prologue.seeds.map(p=>T.seedPose(s.prologue,p)),copy=structuredClone(s.prologue);
    S.beginJourney(s);const fall=s.opening,g={...fall.geometry,END:{left:100000,right:100100}};
    const reference=J.create(copy,true,g);J.release(reference);
    for(const [i,p]of fall.seeds.entries()){
      const q=O.screenPoint(fall,p.x,p.y);
      assert.ok(Math.abs(q.x-title[i].x)<1e-9);assert.ok(Math.abs(740-q.y-title[i].y)<1e-9);
    }
    let moving=0,previous=fall.seeds.map(p=>[p.x,p.y]);
    for(let i=0;i<fps*15&&!fall.arrivals.length;i++){
      O.update(fall,1/fps);J.update(reference,1/fps);
      if(fall.arrivals.length)break;
      for(const key of ['x','y','vx','vy','ring','ringV','cameraLead'])assert.equal(fall[key],reference[key],key);
      for(const key of ['x','y','z'])assert.equal(fall.camera[key],reference.camera[key],key);
      for(const [j,p]of fall.seeds.entries())for(const key of ['x','y','vx','vy','angle','spin','roll'])assert.equal(p[key],reference.seeds[j][key],key);
      if(fall.seeds.some((p,j)=>Math.hypot(p.x-previous[j][0],p.y-previous[j][1])>1e-4))moving++;
      previous=fall.seeds.map(p=>[p.x,p.y]);
      if(O.opening(fall)<1)assert.equal(fall.arrivals.length,0);
    }
    assert.ok(fall.arrivals.length);assert.ok(moving>fps*5,'grains keep physical motion throughout entry');
  }
});

test('landing is discovered from motion, never fixed targets; fall and growth share one continuous view',()=>{
  const O=require('../opening.js'),landings=[];
  const project=(q,p)=>{const dx=(p.x-q.camera.x)*q.sx,dy=(p.y-q.camera.y)*q.sy;return {x:q.x+dx*Math.cos(q.angle)-dy*Math.sin(q.angle),y:q.y+dx*Math.sin(q.angle)+dy*Math.cos(q.angle)};};
  for(const fps of [30,60,120])for(const impulse of [-75,0,75]){
    const s=S.create();for(const p of s.prologue.seeds)p.vx+=impulse;S.beginJourney(s);
    const fall=s.opening;assert.equal(s.nursery.plants.length,0);let last=null,maxStep=0,previousCamera=null,maxCamera=0;
    while(s.phase==='opening'){
      const frame=S.openingFrame(s),poses=S.nurseryPoses(s),hero=poses.plants.find(p=>p.hero);
      if(previousCamera&&poses.plants.length)maxCamera=Math.max(maxCamera,Math.hypot((frame.screen.camera.x-previousCamera.x)*frame.screen.sx,(frame.screen.camera.y-previousCamera.y)*frame.screen.sy));
      previousCamera={...frame.screen.camera};
      assert.ok(fall.seeds.every(p=>p.depart===undefined&&p.land===undefined&&p.destination===undefined));
      if(frame.lift>0)assert.equal(poses.plants.length,0);
      if(hero){const current=project(frame.screen,{x:hero.x,y:hero.ground+(hero.y-hero.ground)*hero.grow});
        if(last)maxStep=Math.max(maxStep,Math.hypot(current.x-last.x,current.y-last.y));last=current;}
      S.update(s,0,1/fps);
    }
    const b=s.world.pumpkin,current={x:195+(b.x-s.view.x)*.8,y:400+(b.y-s.view.y)*.8};
    assert.ok(Math.hypot(current.x-last.x,current.y-last.y)<1,'same fully grown fruit hands over without a jump');
    assert.ok(maxStep<480/fps,'growth and camera remain temporally continuous');assert.ok(maxCamera<480/fps,'actual rooting must not jump the camera party anchor');
    landings.push(s.nursery.plants.map(p=>[p.id,p.x]));
  }
  assert.notDeepEqual(landings[0],landings[1],'birthplaces follow the actual initial motion');
  const old=require('node:child_process').execFileSync('git',['show','7a5fadefc589bcf5b743ee86ac35a104df8ad9da:works/pumpoko-02/draw.js'],{cwd:path.resolve(__dirname,'../../..'),encoding:'utf8'}),now=fs.readFileSync(path.join(__dirname,'../draw.js'),'utf8');
  for(const [a,b]of [['  function pumpkin(', '  function leaf('],['  function rutabaga(', '  function nursery(']])assert.equal(now.slice(now.indexOf(a),now.indexOf(b)),old.slice(old.indexOf(a),old.indexOf(b)),'adopted character art is unchanged');
});
