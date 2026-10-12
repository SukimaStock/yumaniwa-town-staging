import test from 'node:test';
import assert from 'node:assert/strict';
import {Grains} from './physics.mjs';
const advance=(s,n)=>{for(let i=0;i<n;i++)s.step();};
const escaped=s=>s.particles.filter(p=>p.y>360).length;
test('untouched arch remains jammed for 30 seconds; holding and releasing without displacement does not unlock it',()=>{
 const s=new Grains();advance(s,3600);assert.equal(escaped(s),0);
 const p=s.particles[0];s.pick(p.x,p.y);advance(s,60);s.release();advance(s,1200);assert.equal(escaped(s),0);
 assert.equal(s.pick(40,400),-1);advance(s,240);assert.equal(escaped(s),0);
});
test('small lateral displacement breaks contacts, flow continues after release and last grains lag',()=>{
 for(const dx of [-20,20]){
  const s=new Grains(),p=s.particles[0];s.pick(p.x,p.y);s.move(p.x+dx,p.y);advance(s,45);s.release();
  const times=[];let n=escaped(s);
  for(let frame=0;frame<1200;frame++){s.step();const next=escaped(s);for(let i=n;i<next;i++)times.push(frame/120);n=next;}
  assert.equal(n,32);assert.ok(times.at(-1)-times[0]>.4);assert.ok(times.at(-1)<10);
  assert.ok(times.filter(t=>t>.25).length>16,'most grains flow after the finger has left');
 }
});
test('reset restores all supported grains, clears dragging, and supports repeated attempts',()=>{
 const s=new Grains();
 for(let k=0;k<3;k++){const p=s.particles[0];s.pick(p.x,p.y);s.move(p.x+20,p.y);advance(s,45);s.release();advance(s,1200);assert.equal(escaped(s),32);s.reset();assert.equal(s.drag,null);assert.equal(escaped(s),0);}
});
