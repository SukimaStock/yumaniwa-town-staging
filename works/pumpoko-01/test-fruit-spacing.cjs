'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('./dynamics.js'),J=require('./journey.js');
function planted(n,x,reward=1){
  const s=J.create(D.create());
  s.seeds.forEach((p,id)=>{
    if(id>=n){p.lost=p.inactive=true;return;}
    const px=typeof x==='function'?x(id):x,rootY=s.geometry.floor(px).y;
    Object.assign(p,{x:px,y:rootY-6,vx:0,vy:0,spin:0});
    p.arrival=Object.freeze({seed:p,id,at:s.time,x:px,y:p.y,rootY,angle:p.angle,roll:p.roll,bestJump:reward*360,reward});
    s.arrivals.push(p.arrival);
  });
  s.camera={x:(J.END.left+J.END.right)/2,y:400,z:J.ZOOM};
  J.update(s,1/60);return s;
}
for(const n of [1,2,3,5,8,9])for(const edge of ['left','middle','right'])
test(`${n} roots crowded at ${edge}: distinct readable fruits, unchanged roots and hero`,()=>{
  const x=edge==='left'?J.END.left+2:edge==='right'?J.END.right-2:(J.END.left+J.END.right)/2;
  const s=planted(n,x),original=s.seeds.map(p=>[p.x,p.y,p.arrival]),order=J.growthOrder(s);
  assert.equal(order.length,n);assert.equal(J.heroPumpkin(s).id,n-1);
  const poses=order.map(a=>J.plantPose(s,a));
  for(let i=0;i<poses.length;i++){
    const p=poses[i];assert.ok(Number.isFinite(p.x+p.y+p.size));
    assert.ok(p.x>=J.END.left+14-1e-8&&p.x<=J.END.right-14+1e-8);
    assert.equal(p.bonus,n===9&&i===n-1);
    if(i){
      const previous=poses[i-1];
      // Even the largest peak cannot cover the centre of its neighbour.
      const peakRadius=q=>22*q.size*(q.bonus?1.20:1.14);
      assert.ok(p.x-previous.x>Math.max(peakRadius(p),peakRadius(previous)));
    }
  }
  for(const time of [1,2,3,5,8]){
    s.ending.elapsed=time;J.update(s,0);
    assert.deepEqual(order.map(a=>J.plantPose(s,a)),poses,'growth does not reshuffle fruit positions');
    assert.deepEqual(s.seeds.map(p=>[p.x,p.y,p.arrival]),original);
  }
});
test('well separated fruits keep their preferred location rather than being laid out in a row',()=>{
  const s=planted(3,id=>J.END.left+30+id*80);
  for(const a of J.growthOrder(s))assert.equal(J.plantPose(s,a).x,a.x+8);
});
test('richness leaves layout and hero identity stable, including coincident endpoint roots',()=>{
  const states=[0,.5,1].map(reward=>planted(9,J.END.right-2,reward));
  const xs=states.map(s=>J.growthOrder(s).map(a=>J.plantPose(s,a).x));
  assert.deepEqual(xs[0],xs[1]);assert.deepEqual(xs[0],xs[2]);
  assert.ok(J.plantPose(states[2],J.heroPumpkin(states[2])).size>J.plantPose(states[0],J.heroPumpkin(states[0])).size);
});
test('crowded fruits frame and connect the same hero to the original title scale',()=>{
  for(const fps of [30,60,120]){
    const s=planted(9,J.END.right-2);s.titleCycle=true;const hero=s.ending.focus;
    for(let i=0;i<14*fps;i++)J.update(s,1/fps);
    assert.ok(s.ending.titleReady);assert.equal(s.ending.focus,hero);
    const p=J.plantPose(s,hero),q=J.screenPoint(s,p.x,p.y);
    assert.ok(Math.abs(q.x-195)<1e-8&&Math.abs(q.y-365)<1e-8);
    assert.ok(Math.abs(s.camera.z*20*p.size-143)<1e-8);
  }
});
