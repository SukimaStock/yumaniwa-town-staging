'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const P=require('../physics.js'),W=require('../world.js'),{harness}=require('./harness.cjs');
const base='379b0b3cbe4ca0daeb3c4194be8e847411a7b766';
function run(s,seconds,control=()=>1){for(let i=0;i<Math.round(seconds*240);i++){P.input(s,control(s,i));W.update(s,P.STEP);}return s;}
function prime(index,speed=80,offset=0,settings=P.defaults()){
  const s=W.create(settings),h=s.holes[index],b=index?s.rutabaga:s.pumpkin;
  s.active=b.kind;s.phase=index?'underground':'surface';b.plugged=false;b.grounded=false;
  if(index){s.holes[0].state='complete';s.holes[0].swaps=1;s.holes[0].occupant=s.pumpkin;s.pumpkin.plugged=true;s.pumpkin.x=500;s.pumpkin.y=490;s.handoffs=1;}
  b.x=h.x+offset;b.y=h.y-h.direction*Math.sqrt((b.r+h.occupant.r-1)**2-offset**2);b.vx=0;b.vy=h.direction*speed;
  return s;
}
function until(s,condition,limit=10){for(let i=0;i<limit*240&&!condition(s);i++)W.update(s,P.STEP);assert.ok(condition(s),'condition reached');}
test('existing three modes exactly match immutable main physics under diverse input and settings',()=>{
  const context=vm.createContext({module:{exports:{}},console});
  vm.runInContext(execFileSync('git',['show',`${base}:works/pumpkin-rutabaga-lab/physics.js`],{encoding:'utf8'}),context);
  const old=context.module.exports;
  for(const mode of ['pumpkin','rutabaga','handoff'])for(const fps of [30,60,120])for(const extreme of [null,2,3]){
    const settings=P.defaults();if(extreme)for(const [group,defs]of Object.entries(P.PARAMETERS))for(const [key,def]of Object.entries(defs))settings[group][key]=def[extreme];
    const a=P.create(mode,settings),b=old.create(mode,JSON.parse(JSON.stringify(settings)));
    for(let i=0;i<fps*20;i++){
      const input=Math.floor(i/fps)%4===0?0:Math.floor(i/(fps*.7))%2?1:-1;
      P.input(a,input);old.input(b,input);P.update(a,1/fps);old.update(b,1/fps);
      assert.deepEqual(P.snapshot(a),JSON.parse(JSON.stringify(old.snapshot(b))));
    }
  }
});
test('Hermite joins are continuous in height/tangent and floor projection uses the normal',()=>{
  for(let x=410;x<=1310;x+=5){assert.ok(W.roof(x)<=W.surfaceHeight(x)-25);assert.ok(W.roof(x)-W.curve('underground',x).y>60);}
  for(const [layer,points]of Object.entries(W.CURVES))for(const [x,y,t]of points){
    const f=W.curve(layer,x);assert.ok(Math.abs(f.y-y)<1e-8);assert.ok(Math.abs(f.slope-t)<1e-8);
    if(x>points[0][0]&&x<points.at(-1)[0])assert.ok(Math.abs(W.curve(layer,x-.001).slope-W.curve(layer,x+.001).slope)<.001);
    const body={layer,x:f.x+f.nx*32,y:f.y+f.ny*32};assert.ok(Math.abs(W.contact(body).distance-32)<.01);
  }
});
for(const index of [0,1])test(`${index?'upward':'downward'} hole accepts directional low/high contacts, seats one and frees the other once`,()=>{
  for(const speed of index?[60,700]:[2,700])for(const offset of [-35,0,35]){
    const s=prime(index,speed,offset),h=s.holes[index],incoming=s[s.active],out=h.occupant;P.input(s,1);
    until(s,()=>h.swaps===1);
    assert.equal(s[s.active],out);assert.equal(out.plugged,false);assert.equal(incoming.plugged,true);
    assert.equal(h.occupant,incoming);assert.equal(Math.sign(out.vy),h.direction);
    assert.ok(Math.hypot(out.vx,out.vy)<=s.settings.handoff.cap+1e-8);assert.equal(s.target,1);
    run(s,.3,()=>1);assert.equal(h.state,'complete');assert.equal(h.swaps,1);assert.equal(incoming.x,h.x);assert.equal(incoming.y,h.y);
    run(s,2,()=>0);assert.equal(h.swaps,1);
  }
});
test('side, reverse direction, off-center and insufficient upward contacts cannot trigger',()=>{
  for(const index of [0,1]){
    const s=prime(index),h=s.holes[index],b=s[s.active];assert.equal(W.eligible(s,h,b),true);
    b.vy=-h.direction*200;assert.equal(W.eligible(s,h,b),false);
    b.vy=h.direction*100;b.y=h.y+h.direction*45;assert.equal(W.eligible(s,h,b),false);
    b.y=h.y;b.x=h.x+65;b.vx=300;b.vy=0;assert.equal(W.eligible(s,h,b),false);
    b.y=h.y-h.direction*50;b.x=h.x+63;b.vy=h.direction*100;assert.equal(W.eligible(s,h,b),false);
  }
  const s=prime(1,15);run(s,1,()=>0);assert.equal(s.holes[1].swaps,0);assert.ok(Number.isFinite(s.rutabaga.y));
});
test('real input-driven loop traverses both holes; passive end arrival can be restarted with same input',()=>{
  const s=W.create();run(s,10);assert.equal(s.phase,'underground');assert.equal(s.holes[1].swaps,0);
  run(s,.05,()=>0);run(s,2);assert.equal(s.phase,'return');assert.equal(s.handoffs,2);
  assert.equal(s.entities.filter(b=>b.plugged).length,2);assert.equal(s.entities.filter(b=>!b.plugged).length,1);
  assert.ok(s.pumpkin.x>1240);assert.ok(s.pumpkin.grounded);
});
test('first underground landing is protected and switches retain input without a camera cut',()=>{
  const s=W.create();let previous={...s.camera},maxJump=0,landed=false;
  for(let i=0;i<240*8;i++){
    P.input(s,i%120===0&&s.phase==='underground'?0:1);const oldCount=s.handoffs;W.update(s,P.STEP);
    maxJump=Math.max(maxJump,Math.hypot(s.camera.x-previous.x,s.camera.y-previous.y));previous={...s.camera};
    if(s.events.some(e=>e.type==='land'&&e.kind==='rutabaga'))landed=true;
    const b=s[s.active];assert.ok(Math.abs(b.x-s.camera.x)<220);assert.ok(Math.abs(b.y-s.camera.y)<260);
    if(s.handoffs>oldCount){assert.equal(s.target,1);assert.ok(Math.hypot(b.x-s.camera.x,b.y-s.camera.y)<300);}
  }
  assert.ok(landed);assert.ok(maxJump<4);assert.equal(s.handoffs,2);
});
test('launch caps and safe assists clear the return lip even at the minimum handoff cap',()=>{
  for(const cap of [220,520,650]){
    const settings=P.defaults();settings.handoff.cap=cap;
    const s=prime(1,50,0,settings);until(s,()=>s.holes[1].swaps===1);
    let maxY=s.pumpkin.y,largestStep=0,old=s.pumpkin.y;
    for(let i=0;i<240*2;i++){W.update(s,P.STEP);maxY=Math.max(maxY,s.pumpkin.y);largestStep=Math.max(largestStep,Math.abs(s.pumpkin.y-old));old=s.pumpkin.y;}
    assert.ok(maxY>W.curve('return',1240).y+s.pumpkin.r);assert.ok(largestStep<4,'no lip teleport');assert.ok(s.pumpkin.grounded);
  }
});
test('WORLD LOOP fixed-step trajectory matches at 30/60/120 fps',()=>{
  const results=[30,60,120].map(fps=>{const s=W.create();for(let i=0;i<fps*6;i++){P.input(s,Math.floor(i/fps*3)%2?1:0);W.update(s,1/fps);}return P.snapshot(s);});
  assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
});
test('long control and tuning extremes stay finite, outside floor and bounded, with settled plugs fixed',()=>{
  for(const [group,values]of Object.entries(P.PARAMETERS))for(const [key,def]of Object.entries(values))for(const value of [def[2],def[3]]){
    const p=P.defaults();p[group][key]=value;const s=W.create(p);
    for(let i=0;i<240*20;i++){
      P.input(s,i%240===0?0:1);W.update(s,P.STEP);const b=s[s.active];
      assert.ok([b.x,b.y,b.vx,b.vy,s.camera.x,s.camera.y].every(Number.isFinite));
      const inMouth=s.holes.some(h=>h.state==='compressing'&&h.incoming===b)||b.exiting&&b.vy>0&&W.contact(b).distance<b.r;
      if(!inMouth)assert.ok(W.contact(b).distance>=b.r-.05,`${group}.${key} floor`);
      for(const h of s.holes)if(h.state==='complete'){assert.equal(h.occupant.x,h.x);assert.equal(h.occupant.y,h.y);assert.equal(h.swaps,1);}
    }
  }
});
test('canonical app WORLD LOOP uses live pointer, tuning, RESET, sound and one RAF',()=>{
  const h=harness();h.modes[3].emit('click');assert.equal(h.probe().mode,'world');
  h.pointer('pointerdown');for(let i=0;i<600;i++){if(i%40===0){h.pointer('pointerup');h.frame();h.pointer('pointerdown');}h.frame();}
  assert.equal(h.probe().handoffs,2);assert.equal(h.probe().active,'pumpkin');assert.equal(h.raf.size,1);
  h.ids.get('tune').emit('click');const t=h.probe().time;h.advance(1);assert.equal(h.probe().time,t);
  h.ids.get('reset').emit('click');assert.equal(h.probe().handoffs,0);assert.equal(h.probe().holes.every(x=>x.state==='waiting'),true);assert.equal(h.probe().entities.filter(b=>b.plugged).length,2);
  h.ids.get('close-tune').emit('click');assert.equal(h.probe().axis,0);assert.deepEqual(h.errors,[]);
});
test('WORLD tuning changes contact tolerance, upward threshold and assisted launch immediately',()=>{
  const s=prime(1,50,40),h=s.holes[1],b=s[s.active];s.settings.world.tolerance=38;assert.equal(W.eligible(s,h,b),false);
  s.settings.world.tolerance=62;assert.equal(W.eligible(s,h,b),true);s.settings.world.upward=90;assert.equal(W.eligible(s,h,b),false);
  const speeds=[210,330].map(assist=>{const t=prime(0,2);t.settings.world.assist=assist;until(t,()=>t.holes[0].swaps===1);return Math.hypot(t.rutabaga.vx,t.rutabaga.vy);});assert.ok(speeds[1]>speeds[0]+100);
  const settings=P.defaults();settings.handoff.cap=220;settings.handoff.angle=25;const t=prime(1,700,35,settings);t.settings.world.assist=210;
  until(t,()=>t.holes[1].swaps===1);let max=0;for(let i=0;i<240;i++){W.update(t,P.STEP);max=Math.max(max,t.pumpkin.y);}assert.ok(max>276);
});
test('both exchanged fruits remain within the same viewport during each release',()=>{
  const s=W.create();let count=0,releaseAt=-10,objects=[];
  for(let i=0;i<240*8;i++){
    P.input(s,i%100===0&&s.phase==='underground'?0:1);W.update(s,P.STEP);
    if(s.handoffs>count){count=s.handoffs;releaseAt=s.time;objects=[s[s.active],s.holes[count-1].occupant];}
    if(s.time-releaseAt<=.18)for(const b of objects){const x=500+b.x-s.camera.x,y=350+b.y-s.camera.y;assert.ok(x>60&&x<940&&y>70&&y<650);}
  }
  assert.equal(count,2);
});
test('all WORLD tuning extremes and 30 repeated resets maintain fresh hole identities',()=>{
  for(const [key,def]of Object.entries(W.PARAMETERS))for(const value of [def[2],def[3]]){const s=W.create();s.settings.world[key]=value;run(s,20,(s,i)=>i%120?1:0);assert.equal(s.handoffs,2);assert.ok(s.entities.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)));}
  const h=harness();h.modes[3].emit('click');
  for(let i=0;i<30;i++){h.pointer('pointerdown');h.advance(.3);h.ids.get('reset').emit('click');assert.equal(h.probe().handoffs,0);assert.equal(h.probe().holes.every(x=>x.state==='waiting'),true);assert.equal(h.probe().pointer,null);assert.equal(h.raf.size,1);}
});

test('rejected real side contact separates circles, and used downward mouth is solid on return',()=>{
  const s=prime(1,0);s.rutabaga.x=1240-60;s.rutabaga.y=230;s.rutabaga.vx=100;s.rutabaga.vy=0;
  W.update(s,P.STEP);assert.equal(s.holes[1].swaps,0);assert.ok(Math.hypot(s.rutabaga.x-1240,s.rutabaga.y-230)>=68-.01);assert.ok(s.rutabaga.vx<0);
  const t=W.create();run(t,3);assert.equal(t.holes[0].swaps,1);const b=t.rutabaga;b.safety=false;b.x=500;b.y=W.roof(500)-b.r-.2;b.vx=0;b.vy=200;b.grounded=false;
  W.update(t,P.STEP);assert.ok(b.y+b.r<=W.roof(500)+.01);assert.ok(b.vy<=0);assert.equal(t.holes[0].swaps,1);
});
