'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const J=require('./journey.js'),D=require('./dynamics.js'),G=require('./stage-geometry.js'),Draw=require('./stage-draw.js'),M=require('./builder/model.js');
const dt=D.TUNE.step, tick=(r,x,y,touching=false,landing=touching,n=1)=>{for(let i=0;i<n;i++)J.jump.observe(r,{x,y}, {touching,landing},dt);};
function ground(r,x=0,y=0){tick(r,x,y,true,true,12);}
function flight(r,distance=200,landingX=distance){ground(r);for(let i=0;i<48;i++)tick(r,distance*i/48,-10*Math.sin(Math.PI*i/48));tick(r,landingX,0,true);tick(r,landingX+20,0,true,true,8);}
const advance=(s,t,fps=120)=>{for(let i=0;i<Math.round(t*fps);i++)J.update(s,1/fps);};
function physical(s){return {time:s.time,pose:[s.x,s.y,s.vx,s.vy,s.ring,s.ringV],contacts:s.contacts,impacts:s.impactCount,seeds:s.seeds.map(p=>Object.fromEntries(['x','y','vx','vy','angle','spin','turn','roll','cool','lost','inactive','soilTime'].map(k=>[k,p[k]]))),arrivals:s.arrivals.map(a=>[a.id,a.x,a.y,a.at]),lost:s.seeds.filter(p=>p.lost).length};}
test('first contact is the landing coordinate; records are max, not repeated jump totals',()=>{
  const r=J.jump.create();flight(r,200);assert.equal(r.best,200);assert.equal(r.recent.landingX,200);assert.equal(r.recent.takeoffX,0);
  flight(r,120);flight(r,120);assert.equal(r.best,200);flight(r,240);assert.equal(r.best,240);
});
test('initial falls, small hops, cliff drops, lost flights, wall/ceiling and jitter are excluded',()=>{
  const initial=J.jump.create();for(let i=0;i<60;i++)tick(initial,i*5,i);ground(initial,300,60);assert.equal(initial.best,0);
  const small=J.jump.create();flight(small,30);assert.equal(small.best,0);
  const drop=J.jump.create();ground(drop);for(let i=0;i<100;i++)tick(drop,i*3,i);ground(drop,300,100);assert.equal(drop.best,0);
  const lost=J.jump.create();ground(lost);tick(lost,200,-10,false,false,60);J.jump.observe(lost,{x:400,y:800,lost:true},{touching:false,landing:false},dt);ground(lost,400,800);assert.equal(lost.best,0);
  for(const landing of [false,true]){const r=J.jump.create();ground(r);tick(r,200,-10,false,false,60);tick(r,200,-10,true,landing);tick(r,210,-10);ground(r,220,-10);assert.equal(r.best,0);}
  const jitter=J.jump.create();ground(jitter);for(let i=0;i<500;i++)tick(jitter,i*.3,-.1,i%2===0);assert.equal(jitter.best,0);
});
test('continuous support around a Loop is not a free jump; low trajectories remain eligible',()=>{
  const r=J.jump.create();for(let i=0;i<1000;i++)tick(r,i*.6,Math.sin(i*.02)*100,true,Math.cos(i*.02)<-.5);assert.equal(r.best,0);
  ground(r);for(let i=0;i<48;i++)tick(r,i*4,-3*Math.sin(Math.PI*i/48));ground(r,192);assert.equal(r.best,192);
});
test('each of nine grains keeps its own record, including lost grains without redistribution',()=>{
  const rs=Array.from({length:9},J.jump.create);rs.forEach((r,i)=>flight(r,100+i*20));assert.deepEqual(rs.map(r=>r.best),rs.map((_,i)=>100+i*20));
  J.jump.observe(rs[8],{lost:true},{touching:false},dt);assert.deepEqual(rs.slice(0,8).map(r=>r.best),[100,120,140,160,180,200,220,240]);
});
test('smooth richness has healthy zero baseline and bounded 8 percent fruit bonus',()=>{
  assert.equal(J.jump.amount(0),0);assert.equal(J.jump.amount(80),0);assert.equal(J.jump.amount(220),.5);assert.equal(J.jump.amount(360),1);assert.equal(J.jump.amount(100000),1);
  assert.ok(Math.abs(J.jump.amount(220.001)-J.jump.amount(220))<.00001);
});
for(const fps of [30,60,120])test(`observer ON/OFF has identical physical state and arrivals at ${fps}fps`,()=>{
  const a=J.create(D.create(),true),b=J.create(D.create(),true);b.observeJumps=false;
  for(let i=0;i<45*fps;i++){
    for(const s of [a,b]){s.held=i<23*fps;s.targetX=s.held?.28:0;s.targetY=s.held?-.28:0;}
    if(i===9*fps){J.knock(a,900,380);J.knock(b,900,380);}
    J.update(a,1/fps);J.update(b,1/fps);assert.deepEqual(physical(a),physical(b));
  }
  assert.ok(a.seeds.some(p=>p.jump.best>80));assert.ok(b.seeds.every(p=>p.jump.best===0));
});
test('real normal rolling is unrecorded; current-stage successful jumps are fixed-step consistent',()=>{
  const still=J.create(D.create());advance(still,12);assert.ok(still.seeds.every(p=>p.jump.best===0));
  const runs=[30,60,120].map(fps=>{const s=J.create(D.create());s.held=true;s.targetX=.28;s.targetY=-.28;advance(s,16,fps);J.release(s);advance(s,30,fps);return s;});
  assert.equal(runs[0].arrivals.length,9);
  for(const s of runs.slice(1))assert.deepEqual(s.seeds.map(p=>p.jump.best),runs[0].seeds.map(p=>p.jump.best));
  for(const s of runs)for(const a of s.arrivals){assert.equal(a.bestJump,a.seed.jump.best);assert.equal(a.reward,J.jump.amount(a.bestJump));}
});
test('final farm jump is observed and frozen before arrival, with no rolling distance added',()=>{
  const s=J.create(D.create()),p=s.seeds[0];s.seeds.forEach((q,i)=>{q.lost=q.inactive=i>0;});
  p.x=1740;p.angle=0;p.y=s.geometry.floor(p.x).y-J.support(p,0,1);p.vx=p.vy=0;advance(s,.15);
  // Explicit launch fixture, not ordinary-input evidence.
  p.vx=350;p.vy=-140;advance(s,4);assert.ok(p.arrival);assert.ok(p.arrival.bestJump>80);assert.ok(p.jump.recent.landingX>=J.END.left);assert.ok(p.arrival.x>p.jump.recent.landingX);
  const result=s.result,record=JSON.stringify(p.jump);advance(s,30);assert.equal(s.result,result);assert.equal(JSON.stringify(p.jump),record);
});
function fixture(n,reward,g=J.geometry){const s=J.create(D.create(),false,g);s.seeds.forEach((p,i)=>{p.lost=p.inactive=i>=n;if(i<n){p.x=g.END.left+25+(g.END.right-g.END.left-50)*(i+.5)/n;p.y=g.floor(p.x).y-J.support(p,g.floor(p.x).nx,g.floor(p.x).ny)/-g.floor(p.x).ny-.1;p.vx=p.vy=p.spin=0;p.jump.best=reward===1?360:reward===.5?220:0;}});advance(s,7);return s;}
test('1, few and nine rewards keep same roots/counts/slots; boosted fruit stays grounded and title scale exact',()=>{
  for(const n of [1,3,9]){
    const states=[0,.5,1].map(r=>fixture(n,r));
    for(const s of states){assert.equal(J.plants(s).length,n);assert.deepEqual(s.arrivals.map(a=>[a.id,a.x,a.rootY]),states[0].arrivals.map(a=>[a.id,a.x,a.rootY]));
      for(let i=0;i<n;i++){const a=s.arrivals[i],p=J.plantPose(s,a),base=J.plantPose(states[0],states[0].arrivals[i]);assert.ok(p.size>=base.size&&p.size<=base.size*1.0800001);assert.ok(Math.abs(p.y+13*p.size-s.geometry.floor(p.x).y-1)<1e-10);assert.deepEqual(Draw.grassPoses(s,a),Draw.grassPoses(states[0],states[0].arrivals[i]));for(const tuft of Draw.grassPoses(s,a)){assert.equal(tuft.y,s.geometry.floor(tuft.x).y);assert.ok(tuft.x>s.geometry.END.left&&tuft.x<s.geometry.END.right);}}
      s.titleCycle=true;advance(s,7);const p=J.plantPose(s,s.ending.focus);assert.ok(Math.abs(s.camera.z*20*p.size-143)<1e-8);assert.equal(J.titleMix(s),1);
    }
  }
});
test('sloping draft grass and enlarged fruit use actual surfaces; Builder RESET and old JSON carry no reward',()=>{
  const m=M.create(),old=M.exportJSON(m);M.moveStart(m,1860);assert.ok(M.play(m));advance(m.run,1);m.run.seeds[0].jump.best=999;M.edit(m);assert.ok(M.play(m));assert.ok(m.run.seeds.every(p=>p.jump.best===0));M.edit(m);assert.ok(M.importJSON(m,old));assert.ok(M.play(m));assert.ok(m.run.seeds.every(p=>p.jump.best===0));assert.equal(M.exportJSON(m),old);
  const draft=JSON.parse(old);draft.surfaces.at(-1).points.at(-1).y+=60;const s=fixture(3,1,G.compile(draft));assert.equal(s.arrivals.length,3);for(const a of s.arrivals)for(const t of Draw.grassPoses(s,a))assert.equal(t.y,s.geometry.floor(t.x).y);
});

test('actual Loop collision contacts do not turn a supported lap into a recorded jump',()=>{
  const radius=32,g=G.compile({version:1,start:{x:0,y:300},end:{left:600,right:750},materials:[],surfaces:[{id:'ground',material:'polished',points:[{id:'p0',x:-300,y:400},{id:'p1',x:200-radius*1.8,y:400,tangent:0},{id:'p2',x:200-radius*.65,y:400+radius*.55,tangent:0},{id:'p3',x:800,y:400+radius*.55,tangent:0}]}],features:[{id:'loop',type:'loop',x:200,y:400-radius,radius,entry:{x:200-radius*1.8,y:400},exit:{x:200+radius*1.8,y:400+radius*.55},material:'polished'}]});
  const s=J.create(D.create(),false,g);s.seeds.forEach((p,i)=>{p.lost=p.inactive=i>0;});const p=s.seeds[0];Object.assign(p,{x:g.loops[0].entry.x-10,y:389,vx:500,vy:0,angle:0,spin:0});let top=false,side=false;
  for(let i=0;i<8*120;i++){J.update(s,1/120);const hits=g.featureContacts(p,J.support);if(hits.some(h=>h.kind==='circle'&&Math.abs(h.penetration)<.75)){const c=J.jump.contact(s,p);if(p.y<g.loops[0].y){top=true;assert.ok(!c.landing);}if(Math.abs(p.y-g.loops[0].y)<8)side=true;}}
  assert.ok(top&&side);assert.equal(p.jump.best,0);assert.equal(p.jump.recent,null);
});
