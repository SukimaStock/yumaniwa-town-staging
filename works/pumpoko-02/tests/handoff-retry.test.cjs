'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../story.js'),W=require('../world.js'),{run,atStage,course}=require('./five-stage-review.cjs');
const {axis}=require('./five-stage-controls.cjs'),{protect,restoredBody}=require('./handoff-retry-reference.cjs');
function fallAndRetry(s,fps){
 let fall=null,retry=null,heldView;
 for(let frame=0;frame<fps*90;frame++){
  const b=s.world[s.world.active],g=course.gaps.find(g=>g.stage===s.world.handoffs+1);
  const input=b.x>g.a-180&&b.x<g.a-15?-1:1;
  const events=S.update(s,input,1/fps);
  if(events.some(e=>e.type==='fall')){fall=frame/fps;heldView={...s.view};}
  if(s.phase==='retrying')assert.deepEqual(s.view,heldView);
  if(events.some(e=>e.type==='retry')){retry=frame/fps;break;}
 }
 assert.notEqual(fall,null,'insufficient momentum causes a natural gap miss');assert.notEqual(retry,null,'retry completes');
 assert.ok(Math.abs(retry-fall-.65)<=1/fps+1e-8,'unchanged retry delay');
 return {fall,retry};
}
test('fresh main protection: only checkpoint body restoration changes in runtime',()=>{protect();});
test('four real baton checkpoints retry twice at the socket with exact launch; completed holes, identities and fresh-input guard survive at 30/60/120fps',()=>{
 for(const fps of [30,60,120])for(const stage of [2,3,4,5]){
  const s=atStage(stage),cp=s.world.stages.checkpoint,saved=JSON.stringify(cp),hole=course.holes[stage-2];
  assert.equal(cp.body.x,hole.x,'actual baton socket, rather than mid-road spawn');
  assert.notEqual(cp.body.x,course.stages[stage-1].spawnX);
  assert.equal(cp.body.grounded,false);assert.ok(Math.hypot(cp.body.vx,cp.body.vy)>100,'real outgoing motion');
  for(let attempt=0;attempt<2;attempt++){
   if(attempt)S.update(s,0,1/fps); // release the failed hold before the next attempt
   fallAndRetry(s,fps);const w=s.world,b=w[w.active];
   restoredBody(b,cp.body);assert.equal(JSON.stringify(w.stages.checkpoint),saved,'snapshot remains reusable');
   assert.equal(w.handoffs,stage-1);assert.deepEqual(w.stages.completed,Array.from({length:stage-1},(_,i)=>i+1));
   assert.equal(w.stages.failedAt,null);assert.equal(w.finished,false);assert.equal(w.target,0);assert.equal(w.axis,0);
   assert.equal(w.bufferedAt,-10);assert.equal(w.boostUsed,true);assert.equal(s.needsNeutral,true);
   assert.equal(w.entities[cp.entityIndex],b);assert.equal(b.plugged,false);
   assert.notEqual(b,cp.body);assert.notEqual(w.entities,cp.entities);
   for(const [index,h]of w.holes.entries()){
    assert.equal(h.occupant,w.entities[cp.holes[index].occupantIndex]);assert.equal(h.incoming,null);
    if(index<stage-1){assert.equal(h.swaps,1);assert.equal(h.state,'complete');assert.equal(h.occupant.plugged,true);assert.equal(h.occupant.x,h.x);assert.equal(h.occupant.y,h.y);}
    else{assert.equal(h.swaps,0);assert.equal(h.state,'waiting');}
   }
   assert.equal(w.camera.x,b.x);assert.equal(w.camera.y,b.y+70);assert.equal(w.camera.vx,0);assert.equal(w.camera.vy,0);assert.equal(s.view.z,.8);
   const ev=S.update(s,1,1/fps);assert.equal(w.target,0,'old hold cannot arm input');assert.ok(!ev.some(e=>e.type==='handoff'||e.type==='stage-clear'),'no duplicate baton event');
  }
  // Retry remains playable through its next handoff or the last goal.
  S.update(s,0,1/fps);let success=false;
  for(let frame=0;frame<fps*75;frame++){
   const events=S.update(s,axis(s.world),1/fps);assert.ok(!events.some(e=>e.type==='fall'),'controlled retry route '+stage+'/'+fps);
   if(s.world.handoffs>=stage||s.world.finished){success=true;break;}
  }
  assert.ok(success,'next stage can complete after two actual retries');assert.deepEqual(s.world.stages.completed,Array.from({length:stage},(_,i)=>i+1));
 }
});
test('neutral input safely clears each restored socket and reaches its real entry ground; launch flags use ordinary physics',()=>{
 for(const stage of [2,3,4,5])for(const fps of [30,60,120]){
  const s=atStage(stage),cp=s.world.stages.checkpoint;let land=null;
  for(let frame=0;frame<fps*8;frame++){
   const events=S.update(s,0,1/fps);assert.ok(!events.some(e=>['fall','retry','handoff'].includes(e.type)));
   const b=s.world[s.world.active];assert.equal(b.layer,cp.layer);assert.equal(b.plugged,false);
   if(b.grounded){land={...b};break;}
  }
  assert.ok(land,'neutral real landing '+stage+'/'+fps);assert.ok(land.x>cp.body.x,'exits toward next stage');
  assert.ok(Math.abs(W.contact(land,course).distance-land.r)<1e-6,'actual ground contact');
 }
});
test('STAGE 1 retry keeps the opening root; full journey and final seat/title remain unchanged at all frame rates',()=>{
 const {enter}=require('./stage1-review.cjs'),s=enter(),root={...s.stage1Start};
 s.phase='retrying';s.elapsed=0;s.world.pumpkin.x=1234;S.update(s,1,.05);
 while(s.phase==='retrying')S.update(s,1,.05);
 restoredBody(s.world.pumpkin,root);assert.equal(s.world.handoffs,0);assert.equal(s.world.stages.checkpoint,null);
 for(const fps of [30,60,120]){const r=run({fps});assert.ok(r.s.returnTitle);assert.equal(r.s.world.handoffs,4);assert.deepEqual(r.s.world.stages.completed,[1,2,3,4,5]);assert.equal(r.events.filter(e=>e.type==='seat').length,1);assert.equal(r.events.filter(e=>e.type==='fall').length,0);assert.ok(Math.abs(r.title-r.seat-6.2333333333)<.09);}
});
