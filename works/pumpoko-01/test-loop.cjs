'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),D=require('./dynamics.js'),J=require('./journey.js'),G=require('./stage-geometry.js'),M=require('./builder/model.js');let count=0;
function test(n,f){f();count++;console.log('PASS',n);}
function fixture(radius=32){return {version:1,start:{x:0,y:300},end:{left:600,right:750},materials:[],surfaces:[{id:'ground',material:'polished',points:[{id:'p0',x:-300,y:400},{id:'p1',x:200-radius*1.8,y:400,tangent:0},{id:'p2',x:200-radius*.65,y:400+radius*.55,tangent:0},{id:'p3',x:800,y:400+radius*.55,tangent:0}]}],features:[{id:'loop',type:'loop',x:200,y:400-radius,radius,entry:{x:200-radius*1.8,y:400},exit:{x:200+radius*1.8,y:400+radius*.55},material:'polished'}]};}
function one(speed=500,radius=32){const g=G.compile(fixture(radius)),s=J.create(D.create(),false,g);s.seeds.forEach((p,i)=>{p.lost=p.inactive=i>0;});const p=s.seeds[0];Object.assign(p,{x:g.loops[0].entry.x-10,y:389,vx:speed,vy:0,angle:0,spin:0});return {s,p,g};}
function trace(r,fps=60,seconds=8){const f=r.g.loops[0],ps=r.s.seeds,objects=ps.slice();let angle=Math.atan2(r.p.y-f.y,r.p.x-f.x),turn=0,minY=r.p.y,maxSpeed=0;const quadrants=new Set();let exited=false,wasTop=false,wasLeft=false;
  for(let i=0;i<seconds*fps;i++){J.update(r.s,1/fps);const p=r.p,a=Math.atan2(p.y-f.y,p.x-f.x);let d=a-angle;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;turn+=d;angle=a;minY=Math.min(minY,p.y);maxSpeed=Math.max(maxSpeed,Math.hypot(p.vx,p.vy));
    if(Math.hypot(p.x-f.x,p.y-f.y)<f.radius+10)quadrants.add(Math.floor((a+Math.PI)/(Math.PI/2)));
    if(p.y<f.y&&Math.abs(p.x-f.x)<f.radius*.5)wasTop=true;if(wasTop&&p.x<f.x-f.radius*.6)wasLeft=true;if(wasLeft&&p.x>f.exit.x)exited=true;
    objects.forEach((q,k)=>{assert.equal(ps[k],q);assert.ok(Number.isFinite(q.x+q.y+q.vx+q.vy+q.angle));});
  }return {turn,minY,maxSpeed,quadrants,exited,wasTop};
}
test('high-speed grain runs bottom/right/top/left and physically leaves the Loop',()=>{
  const r=one(),t=trace(r);assert.equal(t.quadrants.size,4);assert.ok(t.turn<-Math.PI*2);assert.ok(t.exited);assert.ok(r.p.x>r.g.loops[0].exit.x);assert.ok(!r.p.lost);assert.ok(t.maxSpeed<=501,'no hidden energy boost');
});
test('low speed detaches under gravity and returns to the lower practice floor',()=>{
  const r=one(0,48),f=r.g.loops[0],a=1.0,d=f.radius-8;
  Object.assign(r.p,{x:f.x+Math.cos(a)*d,y:f.y+Math.sin(a)*d,vx:Math.sin(a)*70,vy:-Math.cos(a)*70});const t=trace(r,60,15);assert.ok(!t.wasTop);assert.ok(!t.exited);assert.ok(Math.abs(t.turn)<Math.PI*2);assert.ok(r.p.y>f.y+15);assert.ok(!r.p.lost,'low-speed attempt remains recoverable');
});
test('zero-input resting seed has no automatic progression or orbit',()=>{
  const r=one(0),x=r.g.loops[0].entry.x-70;Object.assign(r.p,{x,y:394.5,vx:0,vy:0});const t=trace(r,60,15);assert.ok(Math.abs(r.p.x-x)<1);assert.ok(!t.wasTop&&!t.exited);assert.ok(Math.abs(t.turn)<.1);
});
test('Loop physical state and full exit match at 30/60/120fps',()=>{
  const rs=[30,60,120].map(fps=>{const r=one();assert.ok(trace(r,fps).exited);return r;});for(const r of rs.slice(1))for(const key of ['x','y','vx','vy','angle'])assert.ok(Math.abs(r.p[key]-rs[0].p[key])<1e-8);
});
test('nine independently colliding grains retain identity and finite bounded energy',()=>{
  const g=G.compile(fixture(48)),s=J.create(D.create(),false,g),objects=s.seeds.slice();s.seeds.forEach((p,i)=>Object.assign(p,{x:g.loops[0].entry.x-110-i*23,y:388,vx:660+i*12,vy:0,angle:i*.08,spin:0}));
  let max=0;for(let i=0;i<15*120;i++){J.update(s,1/120);s.seeds.forEach((p,k)=>{assert.equal(p,objects[k]);assert.ok(Number.isFinite(p.x+p.y+p.vx+p.vy+p.angle));max=Math.max(max,Math.hypot(p.vx,p.vy));assert.ok(p.x>-300&&p.x<810&&p.y>-200&&p.y<1005);});}assert.ok(max<1200);assert.equal(s.seeds.length,9);
});
test('Builder Loop from zero velocity can be pumped and completed with only world tilt',()=>{
  const m=M.create();assert.ok(M.addPrimitive(m,'Loop'));const f=m.draft.features[0];assert.equal(f.radius,32);assert.ok(M.play(m));const s=m.run,objects=s.seeds.slice(),top=new Set(),left=new Set(),exits=new Set();let reverse=false;
  for(let i=0;i<20*120;i++){const xs=J.party(s).map(p=>p.x).sort((a,b)=>a-b);if(xs[4]<m.testStart.x-85)reverse=true;s.held=true;s.targetX=reverse?.38:-.38;s.targetY=0;M.update(m,1/120);s.seeds.forEach((p,k)=>{if(p.y<f.y&&Math.abs(p.x-f.x)<20)top.add(k);if(top.has(k)&&p.x<f.x-f.radius*.6)left.add(k);if(left.has(k)&&p.x>f.exit.x)exits.add(k);assert.equal(p,objects[k]);});}
  assert.ok(reverse&&exits.size>0,'zero-velocity, input-only Loop route');assert.equal(J.party(s).length,9);assert.ok(m.traces[0].length>0);M.edit(m);assert.ok(M.editLoop(m,f.id,'radius',f.x+24,f.y));assert.equal(m.draft.features[0].radius,24);assert.equal(G.validate(JSON.parse(M.exportJSON(m))).length,0);assert.ok(M.play(m));
});
test('Loop uses geometric contact only, without scripted steering or progress fields',()=>{
  const src=fs.readFileSync(__dirname+'/stage-geometry.js','utf8');assert.ok(src.includes('nx=-dx/d,ny=-dy/d'));assert.ok(!/p\.(x|y|vx|vy)\s*[+*/-]?=/.test(src),'compiler/query must never move a grain');
  const r=one();trace(r);for(const key of Object.keys(r.p))assert.ok(!/pathIndex|orbitProgress|loopProgress|centripetalMotor/i.test(key));assert.ok(fs.readFileSync(__dirname+'/stage-draw.js','utf8').includes('f.radius,a,b'));
});
console.log(count+' Loop checks passed.');
