import test from 'node:test';
import assert from 'node:assert/strict';
import {town,project,boundedCamera} from '../town.mjs';
test('known places and destinations preserve affine relations in miniature and overhead',()=>{
 const points=[town.you,town.station,town.park,town.tower,...town.shops];
 for(const mini of [false,true])for(const overhead of [false,true]){
  const o=project(0,0,mini,overhead),u=project(1,0,mini,overhead),v=project(0,1,mini,overhead);
  const determinant=(u.x-o.x)*(v.y-o.y)-(v.x-o.x)*(u.y-o.y);
  assert.ok(determinant>0,'ground projection must not mirror or collapse the town');
  for(const a of points){const q=project(a.x,a.y,mini,overhead);if(!mini||overhead)assert.deepEqual(q,{x:a.x,y:a.y});for(const b of points){const r=project(b.x,b.y,mini,overhead);assert.ok(Math.abs((r.x-q.x)-((b.x-a.x)*(u.x-o.x)+(b.y-a.y)*(v.x-o.x)))<1e-9);assert.ok(Math.abs((r.y-q.y)-((b.x-a.x)*(u.y-o.y)+(b.y-a.y)*(v.y-o.y)))<1e-9);}}
 }
 assert.ok(town.shops[0].y<town.road.y && town.road.y<town.park.y && town.park.y<town.you.y);
 assert.ok(town.shops[1].x>town.park.x && town.shops[1].y>town.road.y);
 assert.ok(town.shops[2].y>town.station.y);
});
test('camera stays recoverable at extreme gestures',()=>{
 for(const scale of [-20,.5,1,2,99]){const c=boundedCamera(scale,1e8,-1e8);assert.ok(c.scale>=.85&&c.scale<=2.4);assert.ok(Math.abs(c.x)<=60+(c.scale-1)*280);assert.ok(Math.abs(c.y)<=60+(c.scale-1)*280);}
 assert.deepEqual(boundedCamera(1,0,0),{scale:1,x:0,y:0});
});
