'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const G=require('./stage-geometry.js'),data=require('./stage-data.js'),J=require('./journey.js'),D=require('./dynamics.js'),baseline=require('./fixtures/canonical-baseline.json');
const hash=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');let count=0;
function test(n,f){f();count++;console.log('PASS',n);}
const g=G.compile(data),oldStage=baseline.stageData,oldG=G.compile(oldStage),copy=(source=data)=>JSON.parse(JSON.stringify(source));
test('historical stage exactly reproduces frozen pre-migration samples, normals and materials',()=>{
  assert.equal(hash(oldG.terrain),baseline.samplesHash);const qs=[];for(let x=-51;x<=2071;x+=.125)qs.push(oldG.floor(x));assert.equal(hash(qs),baseline.queriesHash);
  assert.deepEqual(oldG.GAP,[{left:455,right:503},{left:1545,right:1640}]);assert.deepEqual(oldG.ROUND,{left:1110,bottom:1350,right:1545});
});
test('canonical course preserves the original prefix and translated nursery with eight surfaces and seven gaps',()=>{
  assert.deepEqual(G.validate(data),[]);assert.equal(data.version,oldStage.version);assert.deepEqual(data.start,oldStage.start);assert.deepEqual(data.features,oldStage.features);
  assert.equal(g.segments.length,8);assert.equal(g.GAP.length,7);assert.deepEqual(g.END,{left:8710,right:8950});assert.deepEqual(g.GAP.slice(0,2),oldG.GAP);
  assert.deepEqual(data.surfaces.slice(0,2),oldStage.surfaces.slice(0,2));assert.deepEqual(data.surfaces[2].points.slice(0,3),oldStage.surfaces[2].points.slice(0,3));assert.deepEqual(data.materials.slice(0,3),oldStage.materials.slice(0,3));
  assert.deepEqual(g.terrain.filter(p=>p.x<1775),oldG.terrain.filter(p=>p.x<1775));
  for(let x=-51;x<1775;x+=.125){assert.deepEqual(g.floor(x),oldG.floor(x));assert.equal(g.isRound(x),oldG.isRound(x));}
  // At the join, floor's forward normal belongs to the new interval.
  assert.equal(g.floor(1775).y,oldG.floor(1775).y);assert.equal(g.material(1775),oldG.material(1775));
  const shape=points=>points.map(({id,...p})=>p),offset=6920;
  assert.deepEqual(shape(data.surfaces.at(-1).points),shape(oldStage.surfaces.at(-1).points).map(p=>({...p,x:p.x+offset})));
  assert.equal(g.END.left,oldG.END.left+offset);assert.equal(g.END.right,oldG.END.right+offset);
  for(let x=1640;x<=2070;x+=.125){const a=oldG.floor(x),b=g.floor(x+offset);for(const key of ['y','nx','ny','slope'])assert.ok(Math.abs(a[key]-b[key])<1e-10,key+' at '+x);assert.equal(b.material,a.material);}
  const interval=({id,...m})=>m;assert.deepEqual(data.materials.slice(-2).map(interval),oldStage.materials.slice(-2).map(interval).map(m=>({...m,left:m.left+offset,right:m.right+offset})));
});
test('JSON round trip and separate immutable geometry snapshots',()=>{const draft=copy(),a=G.compile(draft);draft.surfaces[1].points[9].y+=20;const b=G.compile(draft);assert.equal(a.floor(1350).y,500);assert.equal(b.floor(1350).y,520);assert.equal(hash(G.compile(JSON.parse(JSON.stringify(data))).terrain),hash(g.terrain));assert.equal(data.surfaces[1].points[9].y,500);});
test('invalid data rejects before compilation without changing the source',()=>{
  const bad=[d=>d.version=2,d=>d.surfaces[0].points[0].x=NaN,d=>d.surfaces[0].points[1].x=-100,d=>d.surfaces[0].points.pop()&& (d.surfaces[0].points=[]),d=>d.surfaces[0].material='ice',d=>d.surfaces[0].id=d.surfaces[1].id,d=>d.end.left=d.end.right,d=>d.start.x=478,d=>d.features.push({id:'bad',type:'motor'}),d=>d.features.push({id:'bad',type:'loop',x:0,y:0,radius:-2,material:'flesh'})];for(const mutate of bad){const d=copy();mutate(d);assert.ok(G.validate(d).length);assert.throws(()=>G.compile(d));}
});
test('draft runtime reads its own floor, start, end and bounds without changing canonical geometry',()=>{
  const d=copy();d.surfaces[1].points[9].y=540;const draft=G.compile(d),s=J.create(D.create(),false,draft);assert.equal(s.geometry,draft);assert.equal(s.geometry.floor(1350).y,540);assert.equal(J.floor(1350).y,500);for(const p of draft.terrain){const f=draft.floor(p.x);assert.ok(Number.isFinite(f.nx+f.ny+f.y));}
});
test('historical reference stays frozen; horizontal-only Stage 1 physics matches before local END contact',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
  const w={PumpkinDynamics:D,PumpkinStageGeometry:G,PumpkinStageData:oldStage};w.window=w;
  let source;try{source=cp.execFileSync('git',['show','86f1b8926007ca6538676cd13896645726cb1207:works/kotsu-koro/journey.js'],{cwd:__dirname,encoding:'utf8',stdio:['ignore','pipe','pipe']});}catch(e){throw Error('BLOCKED: historical journey proof requires Git commit 86f1b8926007ca6538676cd13896645726cb1207 and works/kotsu-koro/journey.js; this ZIP does not contain that history. '+e.stderr?.toString().trim());}
  vm.runInNewContext(source,w);
  const old=w.PumpkinJourney,a=old.create(D.create(),true,oldG),s=J.create(D.create(),true,oldG),reference=old.create(D.create(),true,oldG),snaps=[];
  let beforeSoil=true,compared=0;
  for(let i=0;i<60*60;i++) {
    for(const run of [a,s,reference]){run.held=i%500<360;run.targetX=run.held?Math.sin(i*.002)*.38:0;run.targetY=run===a&&run.held?Math.cos(i*.003)*-.15:0;}
    beforeSoil=beforeSoil&&reference.seeds.every(p=>p.x<oldStage.end.left-12);
    old.update(a,1/60);old.update(reference,1/60);J.update(s,1/60);
    if(beforeSoil){for(let k=0;k<9;k++)for(const field of ['x','y','vx','vy','angle','spin','roll','lost'])assert.equal(s.seeds[k][field],reference.seeds[k][field],field);compared++;}
    if(i%60===0)snaps.push({x:a.x,y:a.y,finished:a.finished,seeds:a.seeds.map(p=>({x:p.x,y:p.y,vx:p.vx,vy:p.vy,angle:p.angle,lost:p.lost}))});
  }
  assert.ok(compared>900);assert.equal(hash(snaps),baseline.physicsHash,'frozen base reference still reproduces the full old snapshot');
  // Move END far away on a valid extended draft: compare all 60s of controls,
  // gap/loss behavior and flat-grain physics without the changed goal contract.
  // Vertical input is now a gesture; horizontal-only dynamics remain exact.
  const d=copy(oldStage);d.surfaces.at(-1).points.push({id:'far-end',x:6500,y:420});d.end={left:6200,right:6400};const far=G.compile(d);
  const b=old.create(D.create(),true,far),c=J.create(D.create(),true,far);
  for(let i=0;i<3600;i++){for(const run of [b,c]){run.held=i%500<360;run.targetX=run.held?Math.sin(i*.002)*.38:0;run.targetY=0;}old.update(b,1/60);J.update(c,1/60);for(let k=0;k<9;k++)for(const key of ['x','y','vx','vy','angle','spin','roll','lost'])assert.equal(c.seeds[k][key],b.seeds[k][key]);}
});
console.log(count+' Stage Data checks passed.');
