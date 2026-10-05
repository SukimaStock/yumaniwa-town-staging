'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const M=require('../model.js');
test('persistent finite topology, reversible shape, clamped endpoints',()=>{
  const dry=M.mesh(0);
  for (const p of [0,.2,.4,.65,1]) {
    const a=M.mesh(p);
    assert.deepEqual(a.indices,dry.indices);
    assert.equal(a.positions.length,dry.positions.length);
    for (const values of [a.positions,a.normals,a.uv]) assert.ok(values.every(Number.isFinite));
    M.mesh(1-p); assert.deepEqual(M.mesh(p).positions,a.positions);
  }
  assert.deepEqual(M.mesh(-1).positions,dry.positions);
  assert.deepEqual(M.mesh(2).positions,M.mesh(1).positions);
});
test('opening preserves centerline material length, rather than scaling the pellet',()=>{
  for (let leaf=0;leaf<2;leaf++) for (const p of [0,.3,.7,1]) {
    const points=M.leafGrid(p,leaf), mid=M.COLS/2; let length=0;
    for (let i=1;i<=M.ROWS;i++) {
      const a=points[(i-1)*(M.COLS+1)+mid],b=points[i*(M.COLS+1)+mid];
      length+=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
    }
    assert.ok(Math.abs(length-M.definitions[leaf].length)<.07,`${leaf} ${p} ${length}`);
  }
});
test('smaller leaf and exposed fold open earlier; endpoint retains curved surfaces',()=>{
  assert.ok(M.phases(.4,1,.7).bend>M.phases(.4,0,.7).bend);
  assert.ok(M.phases(.4,0,.7).left>M.phases(.4,0,.7).right);
  const pts=M.leafGrid(1,0), zs=pts.map(q=>q.z);
  assert.ok(Math.max(...zs)-Math.min(...zs)>.08);
  const a=M.mesh(.49).positions,b=M.mesh(.4901).positions;
  assert.ok(Math.max(...a.map((x,i)=>Math.abs(x-b[i])))<.003);
});
test('clock pause/resume, rewind, scrub and replay never inherit stale elapsed time',()=>{
  const p=new M.Playback(); p.toggle(); p.advance(1000); p.advance(7000);
  assert.equal(p.progress,.25);
  p.toggle(); p.advance(90000); assert.equal(p.progress,.25);
  p.toggle(); p.advance(100000); p.advance(106000); assert.equal(p.progress,.5);
  p.seek(.2); p.advance(500000); assert.equal(p.progress,.2);
  p.suspend(); p.advance(900000); assert.equal(p.progress,.2);
  p.seek(1); assert.equal(p.playing,false); p.toggle(); assert.equal(p.progress,0);
  p.reset(); assert.deepEqual(p.snapshot(),{progress:0,playing:false,speed:1,stage:M.stage(0)});
});
test('variable frame rates and observation speeds produce identical progress',()=>{
  for (const speed of [.5,1,2]) for (const fps of [30,60,120]) {
    const p=new M.Playback(); p.speed=speed; p.toggle(); p.advance(0);
    for (let i=1;i<=fps*5;i++) p.advance(i*1000/fps);
    assert.ok(Math.abs(p.progress-5*speed/24)<1e-10);
  }
});
