'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const G=require('./stage-geometry.js'),data=require('./stage-data.js'),J=require('./journey.js'),D=require('./dynamics.js'),baseline=require('./fixtures/canonical-baseline.json');
const hash=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');let count=0;
function test(n,f){f();count++;console.log('PASS',n);}
const g=G.compile(data),copy=()=>JSON.parse(JSON.stringify(data));
test('canonical data exactly reproduces pre-migration samples, normals and materials',()=>{
  assert.equal(hash(g.terrain),baseline.samplesHash);const qs=[];for(let x=-51;x<=2071;x+=.125)qs.push(g.floor(x));assert.equal(hash(qs),baseline.queriesHash);
  assert.deepEqual(g.GAP,[{left:455,right:503},{left:1545,right:1640}]);assert.deepEqual(g.ROUND,{left:1110,bottom:1350,right:1545});
});
test('exact base-reference travelling physics matches until local END contact; old terrain hashes remain',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
  const w={PumpkinDynamics:D,PumpkinStageGeometry:G,PumpkinStageData:data};w.window=w;
  vm.runInNewContext(cp.execFileSync('git',['show','86f1b8926007ca6538676cd13896645726cb1207:works/kotsu-koro/journey.js'],{cwd:__dirname,encoding:'utf8'}),w);
  const old=w.PumpkinJourney,a=old.create(D.create(),true),s=J.create(D.create(),true),snaps=[];
  let beforeSoil=true,compared=0;
  for(let i=0;i<60*60;i++) {
    for(const run of [a,s]){run.held=i%500<360;run.targetX=run.held?Math.sin(i*.002)*.38:0;run.targetY=run.held?Math.cos(i*.003)*-.15:0;}
    beforeSoil=beforeSoil&&a.seeds.every(p=>p.x<data.end.left-12);
    old.update(a,1/60);J.update(s,1/60);
    if(beforeSoil){for(let k=0;k<9;k++)for(const field of ['x','y','vx','vy','angle','spin','roll','lost'])assert.equal(s.seeds[k][field],a.seeds[k][field],field);compared++;}
    if(i%60===0)snaps.push({x:a.x,y:a.y,finished:a.finished,seeds:a.seeds.map(p=>({x:p.x,y:p.y,vx:p.vx,vy:p.vy,angle:p.angle,lost:p.lost}))});
  }
  assert.ok(compared>900);assert.equal(hash(snaps),baseline.physicsHash,'frozen base reference still reproduces the full old snapshot');
  // Move END far away on a valid extended draft: compare all 60s of controls,
  // gap/loss behavior and flat-grain physics without the changed goal contract.
  const d=copy();d.surfaces.at(-1).points.push({id:'far-end',x:6500,y:420});d.end={left:6200,right:6400};const far=G.compile(d);
  const b=old.create(D.create(),true,far),c=J.create(D.create(),true,far);
  for(let i=0;i<3600;i++){for(const run of [b,c]){run.held=i%500<360;run.targetX=run.held?Math.sin(i*.002)*.38:0;run.targetY=run.held?Math.cos(i*.003)*-.15:0;}old.update(b,1/60);J.update(c,1/60);for(let k=0;k<9;k++)for(const key of ['x','y','vx','vy','angle','spin','roll','lost'])assert.equal(c.seeds[k][key],b.seeds[k][key]);}
});
test('JSON round trip and separate immutable geometry snapshots',()=>{const draft=copy(),a=G.compile(draft);draft.surfaces[1].points[9].y+=20;const b=G.compile(draft);assert.equal(a.floor(1350).y,500);assert.equal(b.floor(1350).y,520);assert.equal(hash(G.compile(JSON.parse(JSON.stringify(data))).terrain),hash(g.terrain));assert.equal(data.surfaces[1].points[9].y,500);});
test('invalid data rejects before compilation without changing the source',()=>{
  const bad=[d=>d.version=2,d=>d.surfaces[0].points[0].x=NaN,d=>d.surfaces[0].points[1].x=-100,d=>d.surfaces[0].points.pop()&& (d.surfaces[0].points=[]),d=>d.surfaces[0].material='ice',d=>d.surfaces[0].id=d.surfaces[1].id,d=>d.end.left=d.end.right,d=>d.start.x=478,d=>d.features.push({id:'bad',type:'motor'}),d=>d.features.push({id:'bad',type:'loop',x:0,y:0,radius:-2,material:'flesh'})];for(const mutate of bad){const d=copy();mutate(d);assert.ok(G.validate(d).length);assert.throws(()=>G.compile(d));}
});
test('draft runtime reads its own floor, start, end and bounds without changing canonical geometry',()=>{
  const d=copy();d.surfaces[1].points[9].y=540;const draft=G.compile(d),s=J.create(D.create(),false,draft);assert.equal(s.geometry,draft);assert.equal(s.geometry.floor(1350).y,540);assert.equal(J.floor(1350).y,500);for(const p of draft.terrain){const f=draft.floor(p.x);assert.ok(Number.isFinite(f.nx+f.ny+f.y));}
});
console.log(count+' Stage Data checks passed.');
