'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const D=require('./dynamics.js'),J=require('./journey.js'),G=require('./stage-geometry.js'),data=require('./stage-data.js'),Draw=require('./stage-draw.js'),M=require('./builder/model.js');
const advance=(s,t,fps=60)=>{for(let i=0;i<Math.round(t*fps);i++)J.update(s,1/fps);};
function place(s,p,x,vx=0){const f=s.geometry.floor(x);Object.assign(p,{x,y:f.y-J.support(p,f.nx,f.ny)/-f.ny-.1,vx,vy:0,spin:0});}
function fixture(n,g=J.geometry){const s=J.create(D.create(),false,g);s.seeds.forEach((p,i)=>{if(i>=n){p.lost=p.inactive=true;return;}place(s,p,g.END.left+22+(g.END.right-g.END.left-44)*(i+.5)/n);});s.camera={x:(g.END.left+g.END.right)/2,y:g.floor((g.END.left+g.END.right)/2).y-80,z:J.ZOOM};return s;}
function context(){const calls=[];return {calls,c:new Proxy({globalAlpha:1}, {get:(target,key)=>key==='globalAlpha'?target.globalAlpha:key==='createLinearGradient'?()=>({addColorStop(){}}):(...args)=>calls.push([key,...args]),set:(target,key,value)=>{target[key]=value;return true;}})};}
for(let n=1;n<=9;n++)test(`${n} arrivals retain identity, produce exactly ${n} plants/fruits and never duplicate`,()=>{
  const s=fixture(n),objects=s.seeds.slice(),seen=[];
  for(let i=0;i<120;i++){J.update(s,1/60);seen.push(...s.arrivalEvents);}
  assert.equal(s.result.arrivals.length,n);assert.equal(s.result.total,9);assert.equal(s.result.lost,9-n);assert.equal(new Set(seen.map(a=>a.seed)).size,n);assert.equal(seen.length,n);
  objects.forEach((p,i)=>assert.equal(s.seeds[i],p));assert.equal(J.party(s).length,n);assert.equal(J.travelling(s).length,0);
  for(const a of s.result.arrivals){assert.equal(a.seed.arrival,a);assert.equal(a.x,a.seed.x);assert.equal(a.y,a.seed.y);assert.equal(a.rootY,s.geometry.floor(a.x).y);assert.ok(a.at>=.24);}
  const result=s.result;advance(s,10);assert.equal(s.result,result);assert.ok(s.replayReady&&s.ending.growthComplete);assert.equal(J.plants(s).length,n);
  const {c,calls}=context();Draw.drawPlants(c,s);assert.equal(calls.filter(a=>a[0]==='ellipse'&&a[3]===16&&a[4]===3).length,n,'exactly one fruit shadow per plant, independent of decorative lobe count');
  const seeds=[];Draw.drawSeeds(c,s,(_c,p,i)=>seeds.push(i));assert.equal(seeds.length,0,'rooted grain disappears once, underneath its own plant');
  J.knock(s,1800,430);s.held=true;s.targetX=-.38;advance(s,2);assert.equal(s.result,result);assert.ok(!s.held);assert.equal(s.arrivalEvents.length,0);
  for(const a of result.arrivals){assert.equal(a.seed.x,a.x);assert.equal(a.seed.y,a.y);}
});
test('air passage, underside and lost grain inside END never count as contact',()=>{
  for(const kind of ['air','below','lost']) {
    const s=fixture(0),p=s.seeds[0];p.lost=p.inactive=false;p.x=1900;p.y=s.geometry.floor(p.x).y+(kind==='air'?-150:25);p.vx=50;p.vy=0;
    if(kind==='lost')p.lost=true;
    advance(s,.2);assert.equal(p.arrival,null);assert.equal(s.arrivals.length,0);
  }
});
test('soil contact allows visible rolling and a short settle before one-shot rooting',()=>{
  const s=fixture(1),p=s.seeds[0];place(s,p,1870,80);const x=p.x;advance(s,.15);assert.equal(p.arrival,null);assert.ok(p.x>x+3);
  advance(s,.8);assert.ok(p.arrival);assert.ok(p.arrival.x>x+4);assert.ok(p.arrival.x<s.geometry.END.right);assert.ok(p.arrival.at<1);
});
test('early arrivals wait safely while distant living stragglers remain controllable/followed',()=>{
  const s=fixture(1),late=s.seeds[1];late.lost=late.inactive=false;place(s,late,810);advance(s,1);
  const a=s.seeds[0].arrival;assert.ok(a);assert.equal(s.result,null);assert.equal(J.plants(s).length,0);assert.equal(J.party(s).length,2);assert.equal(J.travelling(s).length,1);assert.ok(s.camera.x<1300);
  const x=late.x;J.knock(s,late.x-30,late.y-20);s.held=true;s.targetX=.28;advance(s,1);assert.ok(late.x>x+50);assert.equal(a.seed.x,a.x);assert.equal(a.seed.vx,0);assert.equal(s.result,null);
  J.release(s);advance(s,25);assert.ok(!late.lost,'ground laggards do not timeout');assert.equal(s.result,null);
  place(s,late,1970);advance(s,1);assert.equal(s.result.arrivals.length,2);assert.equal(s.result.lost,7);assert.equal(s.result.total,9);
});
test('arrival/plant/root is deterministic across 30/60/120fps, with continuous pullback and bounds',()=>{
  const states=[30,60,120].map(fps=>{const s=fixture(9);let old={...s.camera},delta=0;for(let i=0;i<10*fps;i++){J.update(s,1/fps);delta=Math.max(delta,Math.hypot(s.camera.x-old.x,s.camera.y-old.y));old={...s.camera};assert.equal(J.travelling(s).length+J.party(s).filter(p=>p.arrival).length+s.seeds.filter(p=>p.lost).length,9);}assert.ok(delta<4);assert.ok(s.camera.z<1.15,'ending is not constrained by ordinary minimum zoom');return s;});
  for(const s of states.slice(1))for(let i=0;i<9;i++)for(const k of ['x','y','at'])assert.ok(Math.abs(s.result.arrivals[i][k]-states[0].result.arrivals[i][k])<1e-7);
  for(const s of states)for(const p of s.farm.samples){for(const y of [p.y-100,p.y+65]){const q=J.screenPoint(s,p.x,y);assert.ok(q.x>15&&q.x<375&&q.y>30&&q.y<710);}}
});
test('zero arrivals yields no growth and the same finite view with a short replay pause',()=>{
  const s=fixture(0),old={...s.camera};advance(s,1);assert.ok(s.finished&&!s.replayReady);assert.equal(J.plants(s).length,0);assert.equal(s.ending.phase,'empty');advance(s,2);assert.ok(s.replayReady);assert.deepEqual(s.camera,old);assert.ok(Number.isFinite(s.time+s.x+s.y));
});
test('current draft END/floor drive soil contact, framing and roots; JSON and RESET/EDIT stay usable',()=>{
  const d=JSON.parse(JSON.stringify(data));d.surfaces.at(-1).points.push({id:'extra-land',x:2900,y:460});d.end={left:2420,right:2770};const g=G.compile(d),s=fixture(3,g);
  advance(s,10);assert.equal(s.farm.left,2420);assert.equal(s.result.arrivals.length,3);assert.ok(s.result.arrivals.every(a=>a.x>2420&&a.x<2770&&a.rootY===g.floor(a.x).y));assert.equal(s.camera.x,2595);assert.equal(J.END.left,1790);
  const {c,calls}=context();Draw.drawFarm(c,g);assert.ok(calls.some(a=>a[0]==='moveTo'&&a[1]===2420));
  const m=M.create(d),json=M.exportJSON(m);M.moveStart(m,2600);assert.ok(M.play(m));for(let i=0;i<2*60;i++)M.update(m,1/60);assert.ok(m.run.result);assert.equal(M.exportJSON(m),json);M.edit(m);assert.equal(m.mode,'edit');assert.ok(M.play(m));assert.equal(m.run.result,null);assert.equal(m.run.arrivals.length,0);assert.equal(m.run.time,0);assert.equal(G.validate(JSON.parse(M.exportJSON(m))).length,0);
});
test('growth has a bounded stagger, overlapping camera/growth and a quiet separate replay phase',()=>{
  const s=fixture(9);advance(s,1);assert.equal(s.ending.phase,'pullback');assert.ok(!s.ending.growthComplete&&!s.replayReady);advance(s,2);assert.equal(s.ending.phase,'growing');const ages=J.plants(s).map(p=>p.age);assert.ok(ages[0]>ages[8]);assert.ok(ages[0]-ages[8]<1);advance(s,3.5);assert.ok(s.ending.growthComplete&&!s.replayReady);advance(s,2);assert.ok(s.replayReady);const snapshot=s.result;advance(s,50);assert.equal(s.result,snapshot);assert.equal(J.plants(s).length,9);
});
test('resolved goal keeps pumpkin-world terrain instead of painting a separate farm body',()=>{
  const s=fixture(9);advance(s,1);
  for(const t of [0,.2,1,2,4,8]) {
    advance(s,t);
    const {c,calls}=context();Draw.drawFarm(c,s.geometry,0,true);
    assert.ok(!calls.some(a=>a[0]==='fill'),'settled goal does not cover the pumpkin strata with farm soil');
    assert.ok(!calls.some(a=>a[0]==='ellipse'),'no hovering soil shadow');
    assert.ok(!calls.some(a=>a[0]==='lineTo'&&a[2]>=6000),'goal cue is only a surface seam, not a giant soil body');
    for(const a of s.result.arrivals)assert.equal(a.rootY,s.geometry.floor(a.x).y);
    assert.ok(calls.some(a=>a[0]==='stroke'),'a restrained surface cue still marks the receiving hollow');
  }
});

test('resolved ending keeps the Stage 1 terrain and farm as one continuous ground view',()=>{
  const source=fs.readFileSync(require.resolve('./stage-draw.js'),'utf8');
  assert.match(source,/drawTerrain\(c,g,lift\);\s*drawLoops\(c,g\);\s*drawFarm\(c,g,lift,settled\);/);
  assert.doesNotMatch(source,/if\s*\(!settled\)\s*\{\s*drawTerrain/,'successful ending must not suppress the journey ground');
});

test('fruit rests on the sampled curve, roots stay fixed, and the central focus is deterministic',()=>{
  const s=fixture(9);advance(s,7);
  const centre=s.farm.frame.x,expected=s.result.arrivals.slice().sort((a,b)=>Math.abs(J.plantPose(s,a).x-centre)-Math.abs(J.plantPose(s,b).x-centre)||a.id-b.id)[0];
  assert.equal(s.ending.focus,expected);
  for(const a of s.result.arrivals){const p=J.plantPose(s,a);assert.ok(Math.abs(p.x-a.x)<=14.1);assert.equal(p.y+13*p.size,s.geometry.floor(p.x).y+1);assert.equal(a.rootY,s.geometry.floor(a.x).y);assert.ok(s.geometry.floor(p.x).y-p.y<13,'fruit centre sits just above its own soil contact');}
});
test('continuous zoom connects the same fruit to the exact original title scale at 30/60/120fps',()=>{
  for(const fps of [30,60,120]) {
    const s=fixture(9);s.titleCycle=true;advance(s,7,fps);assert.equal(s.ending.phase,'rest');assert.ok(s.replayReady);const roots=s.result.arrivals.map(a=>[a.x,a.y,a.rootY]);
    advance(s,2,fps);assert.equal(J.returnZoom(s),0,'a useful rest precedes the zoom');
    let old={...s.camera},maxStep=0,phases=new Set();
    for(let i=0;i<5*fps;i++){J.update(s,1/fps);phases.add(s.ending.phase);maxStep=Math.max(maxStep,Math.abs(s.camera.z-old.z));assert.ok(Number.isFinite(s.camera.x+s.camera.y+s.camera.z));old={...s.camera};}
    assert.ok(phases.has('zoom')&&phases.has('connecting')&&phases.has('title'));assert.ok(maxStep<.18,'no camera scale jump');assert.ok(s.ending.titleReady);
    const p=J.plantPose(s,s.ending.focus),q=J.screenPoint(s,p.x,p.y);assert.ok(Math.abs(q.x-195)<1e-8&&Math.abs(q.y-365)<1e-8);assert.ok(Math.abs(s.camera.z*20*p.size-143)<1e-8);assert.equal(J.titleMix(s),1);
    assert.deepEqual(s.result.arrivals.map(a=>[a.x,a.y,a.rootY]),roots);
  }
});
test('Builder runs keep their grown farm view; empty endings never fabricate a focus or auto-return',()=>{
  for(const n of [0,3]) {const s=fixture(n);advance(s,20);assert.ok(!s.ending.titleReady);assert.equal(J.returnZoom(s),0);assert.equal(J.titleMix(s),0);if(n)assert.deepEqual(s.camera,s.farm.frame);else assert.equal(s.ending.focus,null);}
});

test('late focus quiets neighbouring plants while leaving the chosen fruit continuous',()=>{
 const s=fixture(9);s.titleCycle=true;advance(s,12.3);assert.ok(J.returnZoom(s)>.8&&J.titleMix(s)>.05);
 const {c,calls}=context(),alphas=[];const observed=new Proxy(c,{set(target,key,value){if(key==='globalAlpha')alphas.push(value);target[key]=value;return true;}});Draw.drawPlants(observed,s,()=>{});
 assert.ok(alphas.some(a=>a>0&&a<.2),'neighbours recede softly during the approach');assert.ok(calls.filter(a=>a[0]==='ellipse'&&a[3]===16&&a[4]===3).length===9,'focus does not delete result fruit');
});
