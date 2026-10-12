import test from 'node:test';
import assert from 'node:assert/strict';
import {RainGame,COURSES,LIMIT,point,local} from '../game.mjs';
import {RainDrawing} from '../draw.mjs';
const angles=[[.36],[.36,-.4],[.36,-.36,.4],[-.36,.36,-.44],[.32,-.32,.36,-.48]];
function until(g,predicate,hz=60,max=15){for(let i=0;i<max*hz;i++){g.update(1/hz);if(predicate(g))return i/hz;}assert.fail('Timed out: '+JSON.stringify(g.snapshot()));}
for(const hz of [5,10,15,30,60,120])for(const mirror of [false,true])test(`all five roofs and natural end: ${hz} fps / ${mirror?'mirror':'normal'}`,()=>{
 const g=new RainGame();g.lap=mirror?1:0;g.reset();g.start();
 for(let i=0;i<5;i++){
  angles[i].forEach((a,p)=>g.setAngle(p,mirror?-a:a));
  until(g,g=>g.phase==='caught',hz);
  assert.equal(g.level,i);assert.equal(g.drop.visited,COURSES[i].pans.length);assert.equal(g.failures,0);
  until(g,g=>g.level!==i||g.phase==='end',hz,3);
 }
 assert.equal(g.phase,'end');assert.equal(g.filled,5);assert.equal(g.drag,null);
 const before=g.snapshot();for(let i=0;i<300;i++)g.update(1/hz);assert.equal(g.filled,before.filled);assert.equal(g.level,4);
});
test('water waits in an upright gutter; no timer punishes observation',()=>{
 const g=new RainGame();g.start();until(g,g=>g.drop?.kind==='pan');for(let i=0;i<1200;i++)g.update(1/60);
 assert.equal(g.drop.kind,'pan');assert.ok(Math.abs(g.drop.u)<.01);assert.equal(g.failures,0);
});
test('an over-fast pour really misses, automatically retries and keeps the angle',()=>{
 const g=new RainGame();g.start();g.setAngle(0,.64);until(g,g=>g.phase==='retry');assert.equal(g.filled,0);assert.equal(g.failures,1);
 const target=g.pans[0].target;until(g,g=>g.phase==='waiting',60,2);assert.equal(g.pans[0].target,target);
 g.setAngle(0,.36);until(g,g=>g.phase==='caught');assert.equal(g.failures,1);
});
test('a wrong direction cannot secretly grant a cup',()=>{
 const g=new RainGame();g.start();g.setAngle(0,-.5);until(g,g=>g.phase==='retry');assert.equal(g.filled,0);
});
test('large input stops at the hinge limit and reversal responds immediately',()=>{
 const g=new RainGame();g.grab(0,{x:230,y:305});for(let i=0;i<60;i++)g.move({x:230,y:305+i*20});assert.equal(g.pans[0].target,LIMIT);
 g.move({x:230,y:305+59*20-8});assert.ok(g.pans[0].target<LIMIT);g.release();assert.equal(g.drag,null);assert.equal(g.hinges.active,null);
});
test('release/cancel preserves position and clears the held control',()=>{
 const g=new RainGame();g.grab(0,{x:230,y:305});g.move({x:230,y:326});const angle=g.pans[0].target;g.release();g.move({x:230,y:380});assert.equal(g.pans[0].target,angle);assert.equal(g.drag,null);
});
test('reset from an active grab restores the first roof and empties all results',()=>{
 const g=new RainGame();g.grab(0,{x:230,y:305});g.move({x:230,y:342});g.reset();assert.equal(g.drag,null);assert.equal(g.started,false);assert.equal(g.level,0);assert.equal(g.drop,null);assert.equal(g.pans[0].target,0);
});
test('replay is only available after finishing, and mirrors a new shower',()=>{
 const g=new RainGame();assert.equal(g.replay(),false);g.start();
 for(let i=0;i<5;i++){angles[i].forEach((a,j)=>g.setAngle(j,a));until(g,g=>g.phase==='caught');until(g,g=>g.level!==i||g.phase==='end',60,3);}
 assert.equal(g.replay(),true);assert.equal(g.lap,1);assert.equal(g.filled,0);assert.equal(g.started,false);assert.equal(g.pans[0].x,245);
});
test('projection and pointer inverse agree in portrait and landscape',()=>{
 for(const wide of [false,true]){const d=new RainDrawing(wide);for(const course of COURSES)for(const [x,y,len]of course.pans)for(const angle of [-LIMIT,0,LIMIT]){const pan={x,y,length:len,angle};for(const u of [-len/2,0,len/2]){const p=point(pan,u),q=d.inverse(d.project(p)),back=local(pan,q.x,q.y);assert.ok(Math.abs(back.u-u)<1e-8);assert.ok(Math.abs(q.x-p.x)<1e-8);}}}
});
test('long frame/invalid delta cannot explode spring or replay old elapsed time',()=>{
 const g=new RainGame();g.start();g.setAngle(0,.64);for(let i=0;i<100;i++){g.update(Infinity);g.update(NaN);g.update(-1);g.update(8);}
 for(const p of g.pans){assert.ok(Number.isFinite(p.angle));assert.ok(Math.abs(p.angle)<=LIMIT);}if(g.drop){assert.ok(Number.isFinite(g.drop.x));assert.ok(Number.isFinite(g.drop.y));}assert.ok(g.accumulator<1/120);
});
