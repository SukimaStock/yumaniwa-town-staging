'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const D = require('./dynamics.js');
const J = require('./journey.js');
let passed = 0;
function test(name, run) { run(); passed++; console.log('PASS', name); }
function advance(s, seconds, fps = 60) { for (let i = 0; i < seconds * fps; i++) D.update(s, 1 / fps); }
function speed(s) { return Math.max(...s.seeds.map(p => Math.hypot(p.vx, p.vy))); }
function tilted() { const s = D.create(); s.held = true; s.targetX = .3; advance(s, 1.5); return s; }
test('release preserves vessel and seed momentum', () => {
  const s = tilted(), before = JSON.stringify(s.seeds), vx = s.vx;
  D.release(s); assert.equal(JSON.stringify(s.seeds), before); assert.equal(s.vx, vx);
  assert.equal(s.held, false); assert.equal(s.activeId, null);
});
test('contents respond after release and outlast the vessel', () => {
  const s = tilted(); D.release(s); const start = s.seeds[0].x;
  advance(s, 1); assert.ok(Math.abs(s.x) < .05); assert.ok(speed(s) > 25);
  assert.ok(Math.abs(s.seeds[0].x - start) > 20);
  advance(s, 1); assert.ok(Math.abs(s.x) < .005); assert.ok(speed(s) > 10);
});
test('the loop eventually becomes quiet rather than perpetual motion', () => {
  const s = tilted(); D.release(s); advance(s, 24);
  assert.ok(speed(s) < .15); assert.ok(Math.abs(s.x) < 1e-9);
});
test('equal elapsed time at 30/60/120 fps gives equal physics', () => {
  const runs = [30, 60, 120].map(fps => {
    const s = D.create(); s.held = true; s.targetX = .27; s.targetY = -.17;
    advance(s, 2, fps); D.release(s); advance(s, 3, fps); return s;
  });
  for (const s of runs.slice(1)) for (let i = 0; i < 9; i++) {
    assert.ok(Math.abs(s.seeds[i].x - runs[0].seeds[i].x) < 1e-7);
    assert.ok(Math.abs(s.seeds[i].y - runs[0].seeds[i].y) < 1e-7);
  }
});
test('knock responds immediately but creates independent later contacts', () => {
  const s = D.create(); D.knock(s, 66, -28); assert.ok(speed(s) > 10);
  advance(s, 2); assert.ok(s.impactCount > 0); assert.ok(speed(s) > 2);
});
test('long alternating holds remain finite and inside the cavity', () => {
  const s = D.create(); s.held = true;
  for (let i = 0; i < 18000; i++) {
    s.targetX = Math.sin(i * .013) * .38; s.targetY = Math.cos(i * .021) * .38;
    D.update(s, 1 / 60);
    for (const p of s.seeds) { assert.ok(Number.isFinite(p.x + p.y + p.vx + p.vy)); assert.ok(Math.hypot(p.x, p.y) < 106); }
  }
  assert.ok(s.marks.length <= 340);
});
test('regrabbing does not erase the arrangement or its traces', () => {
  const s = tilted(); D.release(s); advance(s, .5);
  const seeds = JSON.stringify(s.seeds), marks = s.marks.length;
  s.held = true; s.targetX = -.2;
  assert.equal(JSON.stringify(s.seeds), seeds); assert.equal(s.marks.length, marks);
});
test('traces survive the movement, then expire', () => {
  const s = tilted(); D.release(s); advance(s, 3); assert.ok(s.marks.length > 0);
  advance(s, 40); assert.equal(s.marks.length, 0);
});
function harness() {
  let config; const held = new Set(), pressed = new Set(), plays = [];
  const c = { console, location: { search: '?dev=1' }, URLSearchParams,
    SUKIMASTOCK_WORK: { id: 'kotsu-koro', title: 'PUMPOKO', logicalWidth: 390, logicalHeight: 740, frameRate: 60 },
    PumpkinDynamics: D, PumpkinJourney: J, BEGAN: 'BEGAN', MOVING: 'MOVING', ENDED: 'ENDED', CANCELLED: 'CANCELLED',
    SSE: { createApp: v => { config = v; }, audio: {
      withBaseline: v => v, baseline: () => ({ reference: { bgm: { active: .225 }, se: { action: .46, soft: .24 } } }),
      play: (name, options) => plays.push({ name, options }),
    }, input: { action: n => held.has(n), actionPressed: n => pressed.has(n) } },
  }; c.window = c;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'sketch.js'), 'utf8'), c);
  return { scene: config.scenes.main, probe: c.PumpkinProbe, held, pressed, plays };
}
for (const ending of ['ENDED', 'CANCELLED']) test(`pointer outside is inert; drag and ${ending} release correctly`, () => {
  const h = harness();
  h.scene.touch({ id: 1, state: 'BEGAN', x: 10, y: 20 }); assert.equal(h.probe().held, false);
  h.scene.touch({ id: 1, state: 'BEGAN', x: 195, y: 375 });
  h.scene.touch({ id: 1, state: 'MOVING', x: 250, y: 350 });
  for (let i = 0; i < 30; i++) h.scene.update(1 / 60);
  assert.ok(h.probe().tilt[0] > .15);
  h.scene.touch({ id: 1, state: ending, x: 250, y: 350 });
  assert.equal(h.probe().held, false);
  for (let i = 0; i < 120; i++) h.scene.update(1 / 60);
  assert.ok(Math.abs(h.probe().tilt[0]) < .01);
});
test('keyboard holds and releases the same loop; Space creates a knock', () => {
  const h = harness(); h.held.add('right');
  for (let i = 0; i < 60; i++) h.scene.update(1 / 60);
  assert.ok(h.probe().tilt[0] > .25);
  h.held.clear(); h.scene.update(1 / 60); assert.equal(h.probe().held, false);
  h.pressed.add('knock'); h.scene.update(1 / 60);
  assert.ok(h.plays.some(p => p.name === 'shell'));
});
test('prologue does not release on idle time or one physical knock', () => {
  for (const knock of [false,true]) {
    const s=D.createPrologue(); if(knock) D.knock(s,30,0); advance(s,40);
    assert.equal(s.seeds.filter(p=>!p.attached).length,3);
  }
});
test('circular world input physically frees grains one by one without deleting momentum', () => {
  const s=D.createPrologue(), objects=s.seeds.slice(), times=[];
  s.held=true;
  for(let i=0;i<60*25 && !D.allLoose(s);i++) {
    s.targetX=.34*Math.cos(i/60*3.2);s.targetY=.34*Math.sin(i/60*3.2);D.update(s,1/60);
    for(const p of s.detachments){ times.push(s.time); assert.ok(Math.hypot(p.vx,p.vy)>1); }
  }
  assert.ok(D.allLoose(s));assert.equal(times.length,6);
  for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>.69);
  objects.forEach((p,i)=>assert.equal(p,s.seeds[i]));
});
test('actual scene connects the fibre prologue to one journey with all grains', () => {
  const h=harness();h.held.add('right');h.held.add('down');
  let releasedAt=null, connectedAt=null;
  for(let i=0;i<60*40;i++) {
    h.scene.update(1/60);const p=h.probe();
    if(p.loose===9 && releasedAt===null)releasedAt=i/60;
    if(p.mode==='journey'){connectedAt=i/60;break;}
  }
  assert.ok(releasedAt!==null && connectedAt!==null);
  assert.ok(connectedAt-releasedAt>=4.1); assert.equal(h.probe().seedCount,9);
});
console.log(`${passed} checks passed.`);
