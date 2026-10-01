'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const D = require('./dynamics.js'), J = require('./journey.js');
let passed = 0;
function test(name, run) { run(); passed++; console.log('PASS', name); }
function advance(s, seconds, fps = 60) { for (let i = 0; i < Math.round(seconds * fps); i++) J.update(s, 1 / fps); }
function hold(s, x, y = 0) { s.held = true; s.targetX = x; s.targetY = y; }
function allAt(s, x, seconds = 35) {
  for (let i = 0; i < seconds * 60; i++) { J.update(s, 1/60); if (s.seeds.every(p => p.x > x)) return true; }
  return false;
}
function attachedSource() {
  const s = D.createPrologue(); s.held = true;
  for (let i=0; i<25*60 && !D.allLoose(s); i++) {
    s.targetX=.34*Math.cos(i/60*3.2); s.targetY=.34*Math.sin(i/60*3.2); D.update(s,1/60);
  }
  assert.ok(D.allLoose(s)); D.release(s);
  for (let i=0; i<108; i++) D.update(s,1/60);
  return s;
}
test('transfer preserves all nine object identities, pose, spin and projected momentum', () => {
  const a = attachedSource(), objects = a.seeds.slice();
  const before = objects.map(p => ({...p}));
  const s = J.create(a,true);
  assert.equal(s.seeds,a.seeds); assert.equal(new Set(s.seeds).size,9);
  for (let i=0;i<9;i++) {
    const p=s.seeds[i], old=before[i]; assert.equal(p,objects[i]);
    assert.equal(p.x,old.x+J.START.x); assert.equal(p.y,old.y*.8+J.START.y);
    assert.equal(p.vx,old.vx); assert.equal(p.vy,old.vy*.8);
    assert.equal(p.angle,old.angle); assert.equal(p.spin,old.spin);
    for(let j=0;j<i;j++) {
      assert.ok(Math.abs((p.x-s.seeds[j].x)-(old.x-before[j].x))<1e-10);
      assert.ok(Math.abs((p.y-s.seeds[j].y)-.8*(old.y-before[j].y))<1e-10);
    }
  }
  assert.equal(s.time,a.time); assert.equal(s.accumulator,a.accumulator);
});
test('handoff has the identical screen transform, with moving/tilted/ringing vessel', () => {
  const a = D.create(); a.x=.24;a.y=-.19;a.ring=.035;
  const before=a.seeds.map(p=>({...p})), s=J.create(a,true);
  for(let i=0;i<9;i++) {
    const p=before[i], dx=p.x*(1+a.ring*.22), dy=p.y*.8*(1-a.y*.15-a.ring*.18), angle=a.x*.22;
    const x=195+a.x*34+Math.cos(angle)*dx-Math.sin(angle)*dy;
    const y=365+a.y*23+Math.sin(angle)*dx+Math.cos(angle)*dy;
    const screen=J.screenPoint(s,s.seeds[i].x,s.seeds[i].y);
    assert.ok(Math.hypot(screen.x-x,screen.y-y)<1e-10);
    const inverse=J.point(s,screen.x,screen.y);
    assert.ok(Math.hypot(inverse.x-s.seeds[i].x,inverse.y-s.seeds[i].y)<1e-10);
  }
});
test('transition runs on the same party, with finite continuous positions and camera', () => {
  const s=J.create(attachedSource(),true), objects=s.seeds.slice();
  let old=s.seeds.map(p=>J.screenPoint(s,p.x,p.y));
  for(let i=0;i<840;i++) {
    J.update(s,1/120);
    assert.equal(s.seeds.length,9);assert.equal(new Set(s.seeds).size,9);
    const now=s.seeds.map(p=>J.screenPoint(s,p.x,p.y));
    for(let k=0;k<9;k++) {assert.equal(s.seeds[k],objects[k]);assert.ok(Math.hypot(now[k].x-old[k].x,now[k].y-old[k].y)<14);}
    old=now;
  }
  assert.ok(s.transition.settled);assert.equal(J.opening(s),1);
});
test('flat seed support is orientation-sensitive along the surface normal', () => {
  const p={angle:0};assert.ok(J.support(p,1,0)>J.support(p,0,1)*1.7);
  p.angle=Math.PI/2;assert.ok(J.support(p,0,1)>J.support(p,1,0)*1.7);
});
test('all nine reach the quiet end with only right world tilt; release settles them', () => {
  const s=J.create(D.create()), objects=s.seeds.slice();hold(s,.28);
  assert.ok(allAt(s,1820),'right tilt must have a slow route through the round section');
  J.release(s);advance(s,20);assert.ok(s.finished);assert.equal(s.seeds.length,9);
  objects.forEach((p,i)=>assert.equal(p,s.seeds[i]));
});
test('ordinary keyboard right/left can return from the round section and rejoin', () => {
  const s=J.create(D.create());hold(s,.28);assert.ok(allAt(s,1390));
  const spread=Math.max(...s.seeds.map(p=>p.x))-Math.min(...s.seeds.map(p=>p.x));
  assert.ok(spread>25,'some grains should genuinely lag');
  hold(s,-.28,-.20);
  for(let i=0;i<25*60 && Math.max(...s.seeds.map(p=>p.x))>1050;i++)J.update(s,1/60);
  assert.ok(s.seeds.every(p=>p.x<1050),'round hollow must be recoverable in both directions');
  hold(s,.28);assert.ok(allAt(s,1820));J.release(s);advance(s,20);assert.ok(s.finished);
});
test('knock is a local world impulse, not direct grain steering', () => {
  const s=J.create(D.create()); const before=s.seeds.map(p=>({...p}));
  J.knock(s,J.START.x-40,J.START.y-30);
  for(let i=0;i<9;i++) {assert.equal(s.seeds[i].x,before[i].x);assert.equal(s.seeds[i].y,before[i].y);}
  assert.ok(s.seeds.some(p=>Math.hypot(p.vx,p.vy)>5));
});
test('release leaves a physical tail after the world spring recovers', () => {
  const s=J.create(D.create());hold(s,.3);advance(s,2);J.release(s);advance(s,1);
  assert.ok(Math.abs(s.x)<.05);assert.ok(s.seeds.some(p=>Math.hypot(p.vx,p.vy)>15));
});
test('the finish retains live physics and can be disturbed after quiet', () => {
  const s=J.create(D.create());hold(s,.28);assert.ok(allAt(s,1820));J.release(s);advance(s,20);assert.ok(s.finished);
  const before=s.seeds.map(p=>p.x);J.knock(s,1890,450);advance(s,.2);
  assert.ok(s.seeds.some((p,i)=>Math.abs(p.x-before[i])>.5));
});
test('draw and collision share the exact sampled horizontal terrain', () => {
  const draw=fs.readFileSync(path.join(__dirname,'stage-draw.js'),'utf8');assert.ok(draw.includes('J.terrain'));
  assert.ok(!draw.includes('bowl'));assert.ok(!draw.includes('lane'));
  for(const p of J.terrain)assert.ok(Math.abs(J.floor(p.x).y-p.y)<1e-8);
  assert.ok(J.terrain.at(-1).x-J.terrain[0].x>1500);
  assert.ok(Math.max(...J.terrain.map(p=>p.y))-Math.min(...J.terrain.map(p=>p.y))<200);
});
test('no death, deletion, warp or hidden attraction over long alternating inputs', () => {
  const s=J.create(D.create()),objects=s.seeds.slice();hold(s,0);
  for(let i=0;i<120*60;i++) {
    s.targetX=Math.sin(i*.013)*.38;s.targetY=Math.cos(i*.011)*.38;J.update(s,1/60);
    for(const [k,p]of s.seeds.entries()) {
      assert.equal(p,objects[k]);assert.ok(Number.isFinite(p.x+p.y+p.vx+p.vy+p.angle+p.roll));
      assert.ok(p.x>-40&&p.x<2060);assert.ok(J.field(p.x,p.y).signed<1);
    }
  }
});
test('30/60/120fps match physical state through transition, tilt, knock and release', () => {
  const runs=[30,60,120].map(fps=>{
    const s=J.create(D.create(),true);advance(s,7,fps);hold(s,.28);advance(s,4,fps);
    J.knock(s,900,380);advance(s,1,fps);J.release(s);advance(s,2,fps);return s;
  });
  for(const s of runs.slice(1))for(let i=0;i<9;i++) {
    for(const k of ['x','y','vx','vy','angle','spin','roll'])assert.ok(Math.abs(s.seeds[i][k]-runs[0].seeds[i][k])<1e-6,`${k} fps mismatch`);
  }
});
test('camera has a readable minimum zoom and normal play stays compact', () => {
  const s=J.create(D.create());hold(s,.28);let spread=0;
  for(let i=0;i<15*60;i++) {
    J.update(s,1/60);const xs=s.seeds.map(p=>p.x);spread=Math.max(spread,Math.max(...xs)-Math.min(...xs));
    assert.ok(s.camera.z>=1.15);assert.ok(s.camera.z<=J.ZOOM);
  }
  assert.ok(spread<330,`group dispersed by ${spread}`);
});
test('neutral flat ground supplies gravity but no automatic horizontal progression', () => {
  const s=J.create(D.create());advance(s,12);
  assert.ok(s.seeds.every(p=>p.x<310));assert.ok(!s.finished);
  assert.ok(s.seeds.every(p=>Math.abs(p.vx)<5));
});
function sceneHarness(search = "?dev=1") {
  let config;const held=new Set(), plays=[];const c={console,location:{search},URLSearchParams,
    SUKIMASTOCK_WORK:{id:'kotsu-koro',title:'こつ、ころ。',logicalWidth:390,logicalHeight:740,frameRate:60},
    PumpkinDynamics:D,PumpkinJourney:J,BEGAN:'BEGAN',MOVING:'MOVING',ENDED:'ENDED',CANCELLED:'CANCELLED',
    SSE:{createApp:v=>{config=v;},audio:{withBaseline:v=>v,baseline:()=>({reference:{se:{action:.46,soft:.24}}}),play:name=>plays.push(name)},
    input:{action:n=>held.has(n),actionPressed:()=>false}}};c.window=c;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'sketch.js'),'utf8'),c);
  return {scene:config.scenes.main,probe:c.PumpkinProbe,held,plays};
}
test('actual scene preserves the post-detach pause, zoom state, and journey input', () => {
  const h=sceneHarness();h.held.add('right');h.held.add('down');
  let looseAt=null,zoomAt=null,journeyAt=null;
  for(let i=0;i<40*60;i++) {
    h.scene.update(1/60);const p=h.probe();assert.equal(p.seedCount,9);
    if(p.loose===9&&looseAt===null)looseAt=i/60;
    if(p.mode==='transition'&&zoomAt===null)zoomAt=i/60;
    if(p.mode==='journey'){journeyAt=i/60;break;}
  }
  assert.ok(zoomAt-looseAt>=1.79);assert.ok(zoomAt-looseAt<1.85);
  assert.ok(journeyAt-zoomAt>=J.DURATION-.02);assert.equal(h.probe().held,true);
  h.held.clear();h.scene.update(1/60);assert.equal(h.probe().held,false);
});
test('Stage 1 drag regrabs do not knock; a tap does; cancelled gestures are inert', () => {
  const h=sceneHarness('?dev=1&stage=1');
  for(let i=0;i<25;i++) {
    h.scene.touch({id:1,state:'BEGAN',x:130,y:300});
    h.scene.touch({id:1,state:'MOVING',x:240,y:325});
    for(let f=0;f<30;f++)h.scene.update(1/60);
    h.scene.touch({id:1,state:'ENDED',x:240,y:325});
    for(let f=0;f<10;f++)h.scene.update(1/60);
  }
  assert.ok(!h.plays.includes('shell'),'a world drag must not scatter the grains with a knock');
  const p=h.probe(),xs=p.bounds.map(p=>p[0]);
  assert.ok(Math.max(...xs)-Math.min(...xs)<370,`regrab spread: ${xs}`);
  assert.ok(Math.min(...xs)>500,'repeated real scene gestures must advance the party');
  h.scene.touch({id:2,state:'BEGAN',x:200,y:300});h.scene.touch({id:2,state:'CANCELLED',x:200,y:300});
  assert.ok(!h.plays.includes('shell'));
  h.scene.touch({id:3,state:'BEGAN',x:200,y:300});h.scene.touch({id:3,state:'ENDED',x:200,y:300});
  assert.equal(h.plays.filter(n=>n==='shell').length,1);
});
test('a dispersed camera retains real grains instead of centring the empty extreme gap', () => {
  const s=J.create(D.create());
  // Camera-only fixture: eight grains here, one very distant laggard.
  s.seeds.forEach((p,i)=>{p.x=i?1200+i*15:80;p.y=J.floor(p.x).y-10;});
  for(let i=0;i<180;i++)J.update(s,1/60);
  const visible=s.seeds.filter(p=>{const q=J.screenPoint(s,p.x,p.y);return q.x>15&&q.x<375&&q.y>15&&q.y<725;});
  assert.ok(visible.length>=6,`camera lost the party: ${visible.length}`);
  assert.ok(s.camera.z>=1.15);
});
console.log(`${passed} horizontal journey checks passed.`);
