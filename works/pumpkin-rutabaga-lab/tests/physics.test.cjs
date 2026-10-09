'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../physics.js');
function run(s, seconds, controller = () => 0, fps = 60, observe = () => {}) {
  for (let i = 0; i < seconds * fps; i++) { P.input(s, controller(s)); const events = P.update(s, 1 / fps); observe(s, events); }
  return s;
}
const energy = b => (b.vx ** 2 + b.vy ** 2) / 2 + P.G * b.y;
function stable(s) {
  for (const b of [s.pumpkin, s.rutabaga]) {
    for (const key of ['x','y','vx','vy','angle']) assert.ok(Number.isFinite(b[key]), key);
    assert.ok(P.contact(b).distance >= b.r - .2, 'not embedded in floor');
    assert.ok(Math.abs(b.x) <= P.LIMIT + .1, 'inside walls');
    assert.ok(Math.hypot(b.vx,b.vy) <= P.SPEED + 1e-5, 'bounded speed');
  }
}
test('all three modes share exactly the same bowl and circle-normal contact', () => {
  for (const mode of ['pumpkin','rutabaga','handoff']) {
    const s=P.create(mode); for (const b of [s.pumpkin,s.rutabaga]) assert.ok(P.contact(b).distance>=b.r-1e-5);
  }
  for (const x of [-420,-200,0,200,420]) { const b=P.body('pumpkin',x); assert.ok(Math.abs(P.contact(b).distance-b.r)<1e-7); }
});
test('pumpkin starts at rest, smooth drive accelerates and reversals pump the U bowl', () => {
  const idle=run(P.create(),2);assert.equal(idle.pumpkin.x,0);
  const s=P.create();let maxX=0,maxSpeed=0;
  run(s,12, s => Math.abs(s.pumpkin.vx)<12 ? (s.pumpkin.x<0?1:-1) : Math.sign(s.pumpkin.vx),60,s=>{maxX=Math.max(maxX,Math.abs(s.pumpkin.x));maxSpeed=Math.max(maxSpeed,Math.hypot(s.pumpkin.vx,s.pumpkin.vy));stable(s)});
  assert.ok(maxX>300);assert.ok(maxSpeed>450);
});
test('unpowered pumpkin conserves motion locally and gradually loses energy', () => {
  const s=P.create();s.pumpkin=P.body('pumpkin',270);const initial=energy(s.pumpkin);
  run(s,1);assert.ok(Math.hypot(s.pumpkin.vx,s.pumpkin.vy)>100);
  run(s,14);assert.ok(energy(s.pumpkin)<initial-15000);assert.ok(energy(s.pumpkin)>P.G*135);
});
test('pumpkin is smooth through bottom without contact hopping', () => {
  const s=P.create();s.pumpkin=P.body('pumpkin',-330);let crosses=0,lastX=s.pumpkin.x;
  run(s,15,()=>0,120,s=>{assert.equal(s.pumpkin.grounded,true);if(lastX*s.pumpkin.x<0)crosses++;lastX=s.pumpkin.x;stable(s)});assert.ok(crosses>=4);
});
test('rutabaga falls and bounces naturally, then rests rather than auto-hopping forever', () => {
  const s=P.create('rutabaga');let land=0,max=0;run(s,15,()=>0,60,(s,e)=>{land+=e.filter(v=>v.type==='land').length;max=Math.max(max,s.rutabaga.vy);stable(s)});
  assert.ok(land>=3);assert.ok(max>200);assert.equal(s.rutabaga.grounded,true);
  const at=s.rutabaga.y;run(s,3,()=>0);assert.ok(Math.abs(s.rutabaga.y-at)<.01);
});
test('fresh input restarts stopped rutabaga once, held input does not re-arm a boost', () => {
  const s=P.create('rutabaga');run(s,15);let boosts=0;
  run(s,5,()=>1,60,(_,e)=>boosts+=e.filter(v=>v.type==='boost').length);assert.equal(boosts,1);
  run(s,10);assert.equal(s.rutabaga.grounded,true);const before=s.rutabaga.y;run(s,.2,()=>-1);assert.ok(s.rutabaga.y>before+10);
});
function landingFixture() { const s=P.create('rutabaga');s.rutabaga=P.body('rutabaga',0,5);s.rutabaga.vy=-240;return s; }
test('early buffered press makes a stronger bounce than passive contact', () => {
  const passive=landingFixture(),strong=landingFixture();run(passive,.12);run(strong,.12,()=>1);
  assert.ok(strong.rutabaga.y>passive.rutabaga.y+12);assert.ok(strong.rutabaga.vy>passive.rutabaga.vy+100);
});
test('slightly late input has grace, old input does not boost later landings', () => {
  const passive=landingFixture();run(passive,.05);const s=landingFixture();run(s,.05);run(s,.04,()=>1);run(passive,.04);
  assert.ok(s.rutabaga.vy>passive.rutabaga.vy+100);
  const stale=P.create('rutabaga');let boosts=0;run(stale,3,()=>1,60,(_,e)=>boosts+=e.filter(v=>v.type==='boost').length);assert.equal(boosts,0);
});
test('landing pulses produce repeatable, controllable rhythm and lateral travel', () => {
  const s=P.create('rutabaga');let boosts=0;run(s,15,s=>{const b=s.rutabaga,d=P.contact(b).distance-b.r;return b.vy<0&&d<28?(b.x>120?-1:1):0},60,(s,e)=>{boosts+=e.filter(v=>v.type==='boost').length;stable(s)});assert.ok(boosts>=8);assert.ok(Math.abs(s.rutabaga.x)>20);
});
test('handoff triggers once from actual contact without input lock or teleport', () => {
  const s=P.create('handoff');let prevB={...s.rutabaga},triggers=0;
  run(s,5,()=>1,60,(s,e)=>{if(e.some(x=>x.type==='handoff')){triggers++;assert.ok(Math.hypot(s.rutabaga.x-prevB.x,s.rutabaga.y-prevB.y)<15);assert.equal(s.active,'rutabaga');assert.ok(s.axis>.9)}prevB={...s.rutabaga};stable(s)});
  assert.equal(triggers,1);assert.equal(s.handoffs,1);
});
test('low/high handoff preserves momentum ordering, launch cap, safe first bounce', () => {
  const out=[];
  for(const speed of [0,120,450,2000]){
    const s=P.create('handoff');s.pumpkin.x=s.rutabaga.x-60;s.pumpkin.y=s.rutabaga.y;s.pumpkin.vx=speed;
    assert.ok(P.handoff(s));out.push(Math.hypot(s.rutabaga.vx,s.rutabaga.vy));assert.ok(out.at(-1)<=s.settings.handoff.cap);assert.ok(out.at(-1)>=170);
    let first=null;run(s,3,()=>0,240,(s,e)=>{if(!first&&e.some(v=>v.type==='land'&&v.kind==='rutabaga'))first=Math.hypot(s.rutabaga.vx,s.rutabaga.vy)});assert.ok(first>=195);
  }
  assert.ok(out[2]>out[1]);assert.equal(out[3],520);
});
test('camera position is continuous at handoff and bounded across entire bowl', () => {
  const s=P.create('handoff');let old={...s.camera},max=0;run(s,20,s=>Math.sin(s.time*2),120,s=>{max=Math.max(max,Math.hypot(s.camera.x-old.x,s.camera.y-old.y));old={...s.camera};assert.ok(Math.abs(s.camera.x)<32)});assert.ok(max<1);
});
test('30/60/120fps identical fixed-substep trajectories', () => {
  for(const mode of ['pumpkin','rutabaga','handoff']){
    const states=[30,60,120].map(fps=>run(P.create(mode),6,()=>1,fps));
    for(const s of states.slice(1))assert.deepEqual(P.snapshot(s),P.snapshot(states[0]));
  }
});
test('pause clear discards input, impulse buffer and catchup time', () => {
  const s=P.create('rutabaga');P.input(s,1);P.clearInput(s);assert.equal(s.bufferedAt,-10);assert.equal(s.axis,0);const t=s.time;P.update(s,120);assert.ok(s.time-t<=.051);
});
test('each live parameter has a measurable effect, rejects unknown/nonfinite and clamps limits', () => {
  function metric(group,key,val){const settings=P.defaults();P.setParameter(settings,group,key,val);const s=P.create(group==='handoff'?'handoff':group,settings);
    if(group==='handoff'){s.pumpkin.x=s.rutabaga.x-60;s.pumpkin.y=s.rutabaga.y;s.pumpkin.vx=600;P.handoff(s);return [s.rutabaga.vx,s.rutabaga.vy]}
    if(key==='air'){s[s.active]=P.body(group,0,300);s[s.active].vx=100;}
    if(key==='restitution')s[s.active]=P.body(group,0,100);
    if(key==='friction')s[s.active]=P.body(group,250);
    if(key==='boost')s[s.active]=P.body(group,0);
    run(s,key==='air'?.25:key==='restitution'?.65:1,()=>key==='friction'||key==='restitution'?0:1);const b=s[s.active];return [b.x,b.y,b.vx,b.vy];}
  for(const [group,keys]of Object.entries(P.PARAMETERS))for(const [key,def]of Object.entries(keys))assert.ok(metric(group,key,def[2]).some((v,i)=>Math.abs(v-metric(group,key,def[3])[i])>.001),group+'.'+key);
  const settings=P.defaults();assert.equal(P.setParameter(settings,'pumpkin','oops',1),false);assert.equal(P.setParameter(settings,'pumpkin','mass',NaN),false);P.setParameter(settings,'pumpkin','mass',100);assert.equal(settings.pumpkin.mass,5);
});
test('every parameter extreme and long alternating control stays finite and outside terrain', () => {
  for(const mode of ['pumpkin','rutabaga','handoff'])for(const side of [2,3]){
    const settings=P.defaults();for(const [group,values]of Object.entries(P.PARAMETERS))for(const [key,def]of Object.entries(values))P.setParameter(settings,group,key,def[side]);
    run(P.create(mode,settings),45,s=>Math.sin(s.time*4)>0?1:-1,60,stable);
  }
});
