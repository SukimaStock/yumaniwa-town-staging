'use strict';
const assert = require('node:assert/strict');
const D = require('./dynamics.js');
const J = require('./journey.js');
let passed = 0;
function test(name, run) { run(); passed++; console.log('PASS', name); }
function advance(s, seconds, fps = 60) { for (let i = 0; i < seconds * fps; i++) J.update(s, 1 / fps); }
const path = [[318,302],[350,392],[297,501],[231,586],[159,660],[124,757],[151,858],[233,952],[272,1056],[347,1134],[345,1248],[260,1312],[240,1362]];
function journey() {
  const s = J.create(D.create()); let waypoint = 0;
  for (let i = 0; i < 60 * 240 && waypoint < path.length; i++) {
    const target = path[waypoint], prev = waypoint ? path[waypoint-1] : [245,235];
    const tx = target[0]-prev[0], ty = target[1]-prev[1], len = Math.hypot(tx,ty);
    const along = p => ((p.x-prev[0])*tx+(p.y-prev[1])*ty)/len;
    const trailing = s.seeds.reduce((a,b)=>along(a)<along(b)?a:b);
    const cx=trailing.x, cy=trailing.y;
    const dx = target[0]-cx, dy = target[1]-cy, d = Math.hypot(dx,dy);
    s.held = true; s.targetX = dx / Math.max(d, 55) * .31; s.targetY = dy / Math.max(d, 55) * .31;
    if (i % 240 === 0) J.knock(s, cx-24, cy-24);
    J.update(s,1/60);
    if (s.seeds.every(p => along(p) > len-30)) waypoint++;
  }
  // At the last hollow, turn back for stragglers rather than deleting/warping them.
  if (waypoint === path.length) for (let i=0; i<60*90 && !s.finished; i++) {
    const far=s.seeds.reduce((a,b)=>Math.hypot(a.x-240,a.y-1362)>Math.hypot(b.x-240,b.y-1362)?a:b);
    const distance=Math.hypot(far.x-240,far.y-1362);
    s.held=true;
    s.targetX=distance>48 ? Math.max(-.23,Math.min(.23,(240-far.x)*.006)) : 0;
    s.targetY=distance>48 ? Math.max(-.23,Math.min(.23,(1362-far.y)*.006)) : 0;
    J.update(s,1/60);
  }
  return { s, waypoint };
}
test('the same nine grains and their momentum cross into the interior', () => {
  const a = D.create(), grain = a.seeds[4]; grain.vx = 43; grain.vy = -19;
  const old = {x:grain.x,y:grain.y,angle:grain.angle}; const s = J.create(a);
  assert.equal(s.seeds[4],grain); assert.equal(grain.x, old.x+245); assert.equal(grain.y, old.y+235);
  assert.equal(grain.vx,43); assert.equal(grain.vy,-19); assert.equal(grain.angle,old.angle);
});
test('flat seed support differs along its long and short axes', () => {
  const p = {angle:0}; assert.ok(J.support(p,1,0)>J.support(p,0,1)*1.7);
});
test('all grains can reach the only exit using world force and knocks', () => {
  const {s,waypoint}=journey();
  assert.equal(waypoint,path.length,`stuck at waypoint ${waypoint}: ${JSON.stringify(s.seeds.map(p=>[Math.round(p.x),Math.round(p.y)]))}`);
  J.release(s); advance(s,20);
  assert.ok(s.finished, JSON.stringify(s.seeds.map(p=>[Math.round(p.x),Math.round(p.y),J.field(p.x,p.y).g.kind]))); assert.equal(s.seeds.length,9);
});
test('release keeps contents moving after the world spring recovers', () => {
  const s=J.create(D.create()); s.held=true; s.targetX=.3; advance(s,1.5); J.release(s); advance(s,1);
  assert.ok(Math.abs(s.x)<.05); assert.ok(s.seeds.some(p=>Math.hypot(p.vx,p.vy)>15));
});
test('whole-party camera contains dispersed front and trailing grains', () => {
  const s=J.create(D.create()); s.seeds[0].y=1300; advance(s,4);
  for (const p of s.seeds) {
    const x=195+(p.x-s.camera.x)*s.camera.z, y=365+(p.y-s.camera.y)*s.camera.z*.8;
    assert.ok(x>15 && x<375 && y>15 && y<725,`${x},${y}`);
  }
});
test('bounded geometry and fibre springs survive alternating input', () => {
  const s=J.create(D.create()); s.held=true;
  for(let i=0;i<60*120;i++) {
    s.targetX=Math.sin(i*.013)*.38; s.targetY=Math.cos(i*.011)*.38; J.update(s,1/60);
    for(const p of s.seeds) {assert.ok(Number.isFinite(p.x+p.y+p.vx+p.vy)); assert.ok(J.field(p.x,p.y).signed<.1);}
    for(const f of s.fibres) assert.ok(Number.isFinite(f.bend+f.v));
  }
});
test('30/60/120fps give the same physical journey', () => {
  const runs=[30,60,120].map(fps=>{const s=J.create(D.create());s.held=true;s.targetX=.25;s.targetY=.25;advance(s,3,fps);J.release(s);advance(s,2,fps);return s;});
  for(const s of runs.slice(1)) for(let i=0;i<9;i++) {
    assert.ok(Math.abs(s.seeds[i].x-runs[0].seeds[i].x)<1e-6); assert.ok(Math.abs(s.seeds[i].y-runs[0].seeds[i].y)<1e-6);
  }
});
console.log(`${passed} journey checks passed.`);
