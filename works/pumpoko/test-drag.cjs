'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('./dynamics.js'),J=require('./journey.js'),Route=require('./fixtures/momentum-route.cjs');
function harness(stage=true, canonical=false){
 let config,state;const journey={...J,create(...args){return state=J.create(...args);}};
 const c={console,location:{search:stage?'?dev=1&stage=1':'?dev=1'},URLSearchParams,
 SUKIMASTOCK_WORK:{id:'pumpoko',logicalWidth:390,logicalHeight:740,frameRate:60},PumpkinDynamics:canonical?{...D,createPrologue:D.create}:D,PumpkinJourney:journey,
 BEGAN:'BEGAN',MOVING:'MOVING',ENDED:'ENDED',CANCELLED:'CANCELLED',
 SSE:{createApp:v=>config=v,audio:{withBaseline:v=>v,baseline:()=>({reference:{bgm:{active:.225},se:{action:.46,soft:.24}}}),play(){}},input:{action:()=>false,actionPressed:()=>false}}};c.window=c;
 vm.runInNewContext(fs.readFileSync(__dirname+'/sketch.js','utf8'),c);
 const scene=config.scenes.main;
 return {scene,get s(){return state;},probe:c.PumpkinProbe,
 touch:(type,x=195,y=365,id=1)=>scene.touch({state:type,id,x,y:740-y}),
 step:(seconds,fps=60)=>{for(let i=0;i<seconds*fps;i++)scene.update(1/fps);},
 drag:(x,y)=>scene.touch({state:'MOVING',id:1,x:195+x*210,y:740-(365+y*210)})};
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('held drag uses original anchor and independent capped horizontal propulsion',()=>{
 const h=harness();h.touch('BEGAN');
 for(const r of [0,.02,.2,.38,.7,2])for(let i=0;i<72;i++){
  const a=i*Math.PI/36;h.drag(r*Math.cos(a),r*Math.sin(a));
  close(h.s.targetX,Math.max(-.38,Math.min(.38,r*Math.cos(a))));close(h.s.targetY,Math.max(-.38,Math.min(.38,r*Math.sin(a))));
  assert.equal(h.s.activeId,1);assert.equal(h.s.held,true);
 }
 h.drag(.38,0);h.step(1);close(h.s.targetX,.38);h.drag(-.38,0);close(h.s.targetX,-.38);
 h.drag(0,0);close(h.s.targetX,0);close(h.s.targetY,0);assert.equal(h.s.held,true);
});
test('release, cancel, scene exit and reanchor safely clear targets without a drag tap impulse',()=>{
 for(const end of ['ENDED','CANCELLED','exit']){
 const h=harness();h.touch('BEGAN');h.drag(.38,-.38);const impacts=h.s.impactCount;
 if(end==='exit')h.scene.exit();else h.touch(end,274.8,285.2);
 assert.equal(h.s.held,false);assert.equal(h.s.activeId,null);close(h.s.targetX,0);close(h.s.targetY,0);assert.equal(h.s.impactCount,impacts);
 h.touch('BEGAN',100,200);h.touch('MOVING',121,200);close(h.s.targetX,.1);close(h.s.targetY,0);
 h.touch('MOVING',300,300,99);close(h.s.targetX,.1);
 }
});
test('Stage 0 keeps accepted independent-axis grab strength',()=>{
 const h=harness(false);h.touch('BEGAN');h.drag(.38,-.38);h.step(.5);
 const p=h.probe();assert.ok(p.tilt[0]>.30&&p.tilt[1]<-.30);
});
test('held finger with momentum gestures finishes the full 5x course with nine seeds at 30/60/120fps',()=>{
 for(const fps of [30,60,120]){
 const h=harness();h.touch('BEGAN');const input=Route.create('prologue');let released=false;
 for(let i=0;i<150*fps&&!h.s.result;i++){
  if(!released&&i%(fps/30)===0){const v=input(h.s);h.drag(v.x,v.y);}
  if(!released&&Math.min(...h.s.seeds.map(p=>p.x))>J.END.left+70){h.touch('ENDED',253.8,306.2);released=true;}
  h.scene.update(1/fps);assert.equal(J.party(h.s).length,9);
 }
 assert.ok(released&&h.s.finished);assert.equal(h.s.arrivals.length,9);
 }
});
test('stopped first bowl still supports horizontal pumping and reverse-tilt catch with one finger down',()=>{
 const h=harness(true,true),s=h.s;h.touch('BEGAN');let phase=0,wait=0,quiet=0;
 for(let i=0;i<80*60;i++){
  if(i%2===0){
   const lo=Math.min(...s.seeds.map(p=>p.x));
   if(phase===0&&lo>730){phase=1;wait=i;}
   else if(phase===1&&i-wait>=8*60)phase=2;
   else if(phase===2&&lo>1210)phase=3;
   else if(phase===3){quiet=Math.max(...s.seeds.map(p=>Math.hypot(p.vx,p.vy)))<8?quiet+1/30:0;if(quiet>=.5)break;}
   if(phase===0||phase===2){if(!s.held)h.touch('BEGAN');h.drag(phase===0?.28:.22,phase===0?-.15:0);}else if(s.held)h.touch('CANCELLED');
  }
  h.scene.update(1/60);assert.equal(J.party(s).length,9);
 }
 assert.equal(phase,3);assert.ok(quiet>=.5);h.touch('BEGAN');
 let reversed=false;
 for(let i=0;i<20*60;i++){
  const median=s.seeds.map(p=>p.x).sort((a,b)=>a-b)[4];if(median<1260)reversed=true;
  h.drag(reversed?.38:-.38,0);h.scene.update(1/60);
  assert.equal(J.party(s).length,9);if(Math.min(...s.seeds.map(p=>p.x))>1650)break;
 }
 assert.ok(reversed);assert.ok(s.seeds.every(p=>p.x>1650));h.drag(-.18,0);h.step(.6);assert.equal(J.party(s).length,9);assert.equal(s.activeId,1);
});
test('held diagonal from rest cannot self-launch across the first large lip',()=>{
 const h=harness(),s=h.s;for(const [i,p] of s.seeds.entries()){
 if(i){p.lost=p.inactive=true;continue;}p.x=1490;const f=J.floor(p.x);p.y=f.y-J.support(p,f.nx,f.ny);p.vx=p.vy=p.spin=0;
 }
 h.touch('BEGAN');h.drag(.38,-.38);let furthest=0;
 for(let i=0;i<6*60;i++){h.scene.update(1/60);furthest=Math.max(furthest,s.seeds[0].x);}
 assert.ok(furthest<J.GAP[1].left,`resting grain crossed lip at ${furthest}`);
});

function single(h,x=900,speed=0){
 const s=h.s,p=s.seeds[0];for(const q of s.seeds)if(q!==p)q.lost=q.inactive=true;
 const f=J.floor(x);Object.assign(p,{x,y:f.y-J.support(p,f.nx,f.ny)/-f.ny,vx:speed*-f.ny,vy:speed*f.nx});
 return p;
}
test('real drag: own ground momentum gives smooth lift; stationary and falling grains cannot borrow speed',()=>{
 const lifts=[];
 for(const speed of [0,54,90,130,J.ASSIST.fullSpeed+8,400]){
  const h=harness(),p=single(h,900,speed);h.touch('BEGAN');h.drag(.38,0);h.step(1/120,120);
  const before=p.vy;h.drag(.38,-.38);lifts.push(before-p.vy);
  assert.equal(h.s.targetX,.38);const count=p.assist.count;
  h.step(.05,120);h.drag(.38,-.38);assert.equal(p.assist.count,count);
 }
 assert.equal(lifts[0],0);assert.ok(lifts[2]>0&&lifts[3]>lifts[2]&&lifts[4]>lifts[3]);assert.ok(lifts.every(x=>x<=J.ASSIST.maxLift));
 const h=harness(),p=single(h,900,0);p.y-=120;p.vy=400;h.touch('BEGAN');h.step(1/120,120);h.drag(.38,-.38);assert.equal(p.assist.count,0);
});
test('sustained diagonal never fires when acceleration later reaches a threshold',()=>{
 const h=harness(),p=single(h,900,0);h.touch('BEGAN');h.drag(.38,-.38);h.step(1);assert.equal(p.assist.count,0);assert.ok(p.vx>55);
 h.drag(.38,0);h.step(.05);h.drag(.38,-.38);assert.equal(p.assist.count,1);
});
test('up gestures cannot repeat in air and release does not rearm a grain before landing',()=>{
 const h=harness(),p=single(h,900,240);h.touch('BEGAN');h.drag(.38,0);h.step(1/120,120);h.drag(.38,-.38);assert.equal(p.assist.count,1);
 for(let i=0;i<10;i++){h.drag(.38,0);h.step(1/120,120);h.drag(.38,-.38);}
 assert.equal(p.assist.count,1);h.touch('ENDED');h.touch('BEGAN');h.drag(.38,-.38);assert.equal(p.assist.count,1);
});
test('release cancel and exit discard held-up gesture state; foreign finger cannot reanchor',()=>{
 for(const end of ['ENDED','CANCELLED','exit']){
 const h=harness(),p=single(h,900,240);h.touch('BEGAN');h.drag(.38,0);h.step(1/120,120);h.drag(.38,-.38);
 h.touch('BEGAN',20,20,99);assert.equal(h.s.activeId,1);assert.equal(h.s.anchorX,195);
 if(end==='exit')h.scene.exit();else h.touch(end);assert.equal(h.s.gestureAssist.armed,true);assert.equal(h.s.targetY,0);
 h.step(.05);assert.equal(p.assist.count,1);
 }
});
test('mixed party uses per-grain signed surface speed, never max party or fall speed',()=>{
 const h=harness(),s=h.s;h.touch('BEGAN');h.drag(.38,0);
 s.seeds.forEach((p,i)=>{const x=700+i*25,f=J.floor(x);Object.assign(p,{x,y:f.y-J.support(p,f.nx,f.ny)/-f.ny,vx:i===0?240:i===1?-240:0,vy:0});});
 h.step(1/120,120);h.drag(.38,-.38);assert.equal(s.seeds[0].assist.count,1);assert.ok(s.seeds.slice(1).every(p=>p.assist.count===0));
});
test('held-up and level drag have identical seed physics after an unsuccessful rest gesture',()=>{
 const a=harness(),b=harness();single(a,900,0);single(b,900,0);
 for(const h of [a,b])h.touch('BEGAN');a.drag(.38,0);b.drag(.38,-.38);
 for(let i=0;i<180;i++){a.scene.update(1/120);b.scene.update(1/120);for(const k of ['x','y','vx','vy'])close(a.s.seeds[0][k],b.s.seeds[0][k]);}
});
test('upward assist is forgiving across a broad approach window before the first ramp lip',()=>{
 for(const fps of [30,60,120])for(const at of [1400,1430,1460,1490,1510,1530]){
 const h=harness(),p=single(h,1260,250);h.touch('BEGAN');h.drag(.38,0);let fired=false;
 for(let i=0;i<10*fps;i++){
  if(!fired&&p.x>=at){h.drag(.38,-.38);fired=true;}
  h.scene.update(1/fps);assert.equal(p.lost,false,`${fps}fps at ${at}`);if(p.x>1700)break;
 }
 assert.ok(fired&&p.x>1700,`${fps}fps at ${at}`);assert.equal(p.assist.count,1);
 }
});
test('sideways return rearms at the current height without firing; only a fresh upward stroke fires',()=>{
 const h=harness(),p=single(h,900,240);h.touch('BEGAN');h.drag(.38,0);h.step(1/120,120);h.drag(.38,-.2);assert.equal(p.assist.count,1);
 h.drag(.55,-.2);assert.equal(h.s.gestureAssist.armed,true);assert.equal(p.assist.count,1);
 h.drag(.55,-.2);assert.equal(p.assist.count,1);
 // Land normally before the next stroke; keep one finger down throughout.
 for(let i=0;i<3*120&&p.assist.used;i++)h.scene.update(1/120);
 assert.equal(p.assist.used,false);h.drag(.55,-.38);assert.equal(p.assist.count,2);assert.equal(h.s.activeId,1);
});

test('moving directly upward through the anchor keeps the last horizontal intent',()=>{
 const h=harness(),p=single(h,900,240);h.touch('BEGAN');h.drag(.38,0);h.step(1/120,120);h.drag(0,-.38);
 assert.equal(h.s.targetX,0);assert.equal(p.assist.count,1);
});
test('small stroke timing shifts retain at least eight arrivals on the full real-handler route',()=>{
 for(const offset of [-5,5]){
 const h=harness(),s=h.s;h.touch('BEGAN');const input=Route.create(Route.profiles.prologue.map(x=>x+offset));let released=false;
 for(let i=0;i<100*60&&!s.result;i++){
  if(!released&&i%2===0){const v=input(s);h.drag(v.x,v.y);}
  const active=J.travelling(s);
  if(!released&&active.length&&active.every(p=>p.x>J.END.left+70)){h.touch('ENDED');released=true;}
  h.scene.update(1/60);
 }
 assert.ok(J.party(s).length>=8,`offset ${offset}: survivors ${J.party(s).length}`);
 assert.ok(s.arrivals.length>=8,`offset ${offset}: arrivals ${s.arrivals.length}`);
 }
});
