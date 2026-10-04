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
  const states=[30,60,120].map(fps=>{const s=fixture(9);for(let i=0;i<10*fps;i++){J.update(s,1/fps);assert.ok(Number.isFinite(s.camera.x+s.camera.y+s.camera.z));assert.equal(J.travelling(s).length+J.party(s).filter(p=>p.arrival).length+s.seeds.filter(p=>p.lost).length,9);}assert.equal(s.camera.z,J.ENDING.closeZoom,'keep current close framing');return s;});
  for(const s of states.slice(1))for(let i=0;i<9;i++)for(const k of ['x','y','at'])assert.ok(Math.abs(s.result.arrivals[i][k]-states[0].result.arrivals[i][k])<1e-7);
  for(const s of states){const p=J.plantPose(s,J.growthOrder(s).at(-1)),q=J.screenPoint(s,p.x,p.y);assert.ok(Math.abs(q.x-195)<1e-8&&q.y>30&&q.y<710,'last fruit rests in the close view');}
});
test('zero arrivals yields no growth and the same finite view with a short replay pause',()=>{
  const s=fixture(0),old={...s.camera};advance(s,1);assert.ok(s.finished&&!s.replayReady);assert.equal(J.plants(s).length,0);assert.equal(s.ending.phase,'empty');advance(s,2);assert.ok(s.replayReady);assert.deepEqual(s.camera,old);assert.ok(Number.isFinite(s.time+s.x+s.y));
});
test('current draft END/floor drive soil contact, framing and roots; JSON and RESET/EDIT stay usable',()=>{
  const d=JSON.parse(JSON.stringify(data));d.surfaces.at(-1).points.push({id:'extra-land',x:2900,y:460});d.end={left:2420,right:2770};const g=G.compile(d),s=fixture(3,g);
  advance(s,10);assert.equal(s.farm.left,2420);assert.equal(s.result.arrivals.length,3);assert.ok(s.result.arrivals.every(a=>a.x>2420&&a.x<2770&&a.rootY===g.floor(a.x).y));assert.equal(s.camera.x,J.plantPose(s,J.growthOrder(s).at(-1)).x);assert.equal(J.END.left,1790);
  const {c,calls}=context();Draw.drawFarm(c,g);assert.ok(calls.some(a=>a[0]==='moveTo'&&a[1]===2420));
  const m=M.create(d),json=M.exportJSON(m);M.moveStart(m,2600);assert.ok(M.play(m));for(let i=0;i<2*60;i++)M.update(m,1/60);assert.ok(m.run.result);assert.equal(M.exportJSON(m),json);M.edit(m);assert.equal(m.mode,'edit');assert.ok(M.play(m));assert.equal(m.run.result,null);assert.equal(m.run.arrivals.length,0);assert.equal(m.run.time,0);assert.equal(G.validate(JSON.parse(M.exportJSON(m))).length,0);
});
test('growth has a bounded stagger, overlapping camera/growth and a quiet separate replay phase',()=>{
  const s=fixture(9);advance(s,1);assert.equal(s.ending.phase,'pullback');assert.ok(!s.ending.growthComplete&&!s.replayReady);advance(s,2);assert.equal(s.ending.phase,'growing');const ages=J.plants(s).map(p=>p.age);assert.ok(ages[0]>ages[8]);assert.ok(Math.abs(ages[0]-ages[8]-8*J.ENDING.stagger)<1e-9,'preserve existing stagger exactly');advance(s,3.75);assert.ok(s.ending.growthComplete&&!s.replayReady);advance(s,2);assert.ok(s.replayReady);const snapshot=s.result;advance(s,50);assert.equal(s.result,snapshot);assert.equal(J.plants(s).length,9);
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
  assert.match(source,/drawTerrain\(c,g,lift,1,settled\);\s*drawLoops\(c,g\);\s*drawFarm\(c,g,lift,settled\);/);
  assert.doesNotMatch(source,/if\s*\(!settled\)\s*\{\s*drawTerrain/,'successful ending must not suppress the journey ground');
});

test('successful ending hides the visible right wall and extends only the drawn terrain horizon',()=>{
  const s=fixture(3);advance(s,2);
  const before=s.geometry.bounds.right;
  const {c,calls}=context();Draw.drawTerrain(c,s.geometry,0,1,true);
  assert.equal(s.geometry.bounds.right,before,'render-only extension must not mutate world bounds');
  assert.ok(calls.some(a=>a[0]==='lineTo'&&a[1]>before+400),'ending terrain continues beyond the physical right bound');
  assert.ok(!calls.some(a=>a[0]==='moveTo'&&a[1]===before&&a[2]===s.geometry.floor(before).y&&calls.some(b=>b[0]==='lineTo'&&b[1]===before&&b[2]===-200)),'right outside wall is not drawn in the resolved view');
});
test('fruit rests on the sampled curve, roots stay fixed, and the central focus is deterministic',()=>{
  const s=fixture(9);advance(s,7);
  const centre=s.farm.frame.x,expected=s.result.arrivals.slice().sort((a,b)=>Math.abs(J.plantPose(s,a).x-centre)-Math.abs(J.plantPose(s,b).x-centre)||a.id-b.id)[0];
  assert.equal(s.ending.focus,expected);
  for(const a of s.result.arrivals){const p=J.plantPose(s,a);assert.ok(Math.abs(p.x-a.x)<=14.1);assert.equal(p.y+13*p.size,s.geometry.floor(p.x).y+1);assert.equal(a.rootY,s.geometry.floor(a.x).y);assert.ok(s.geometry.floor(p.x).y-p.y<13,'fruit centre sits just above its own soil contact');}
});
test('growth presentation is spatially left-to-right and camera stays close while following it',()=>{
  for(const fps of [30,60,120]) {
    const s=fixture(9);advance(s,1,fps);
    const order=J.growthOrder(s),xs=order.map(a=>J.plantPose(s,a).x);
    assert.deepEqual(xs,xs.slice().sort((a,b)=>a-b),'growth order follows space, not arrival time');
    advance(s,.55,fps);const left=s.camera.x;
    assert.ok(s.camera.z>1.25,'ending moves closer than the old whole-farm frame');
    advance(s,3.8,fps);const right=s.camera.x;
    assert.ok(right>left+80,'camera travels across the growing pumpkins');
    const ages=J.plants(s).map(p=>p.age);
    assert.ok(ages[0]>ages.at(-1),'leftmost plant begins before rightmost plant');
  }
});
const endingTo=(s,time,fps=60)=>{while(s.ending.elapsed<time-1e-7)J.update(s,1/fps);};
test('ending enters close framing by .55s and starts visible shoots at .90s without a long idle gap',()=>{
  for(const fps of [30,60,120])for(const n of [1,2,3,9]) {
    const s=fixture(n);while(!s.ending)J.update(s,1/fps);
    const first=J.plantPose(s,J.growthOrder(s)[0]),close={x:first.x,y:s.geometry.floor(first.x).y-62,z:1.75},from=s.ending.from;
    let old={...from},lastTime=0,reached,shoot;
    while(s.ending.elapsed<1.15) {
      const time=s.ending.elapsed;
      const fraction=J.smooth(time/.55);
      for(const key of ['x','y','z'])assert.ok(Math.abs(s.camera[key]-(from[key]+(close[key]-from[key])*fraction))<1e-8,'short pull-in is smooth rather than a snap or delayed jump');
      const distance=Math.hypot(close.x-from.x,close.y-from.y);
      assert.ok(Math.hypot(s.camera.x-old.x,s.camera.y-old.y)<=distance*1.5/.55*(time-lastTime)+1e-7,'camera steps respect the continuous easing speed bound');
      if(time>=.10&&time<=.10+1/fps)assert.ok((s.camera.z-from.z)/(close.z-from.z)>.08,'close framing has visibly begun in the first .10s');
      if(time>=.55&&reached===undefined){reached=time;assert.deepEqual(s.camera,close);}
      const {c,calls}=context();Draw.drawPlants(c,s);
      if(time<=.90)assert.equal(calls.length,0,'no plant is drawn before growAt');
      else if(shoot===undefined){shoot=time;assert.ok(calls.some(a=>a[0]==='quadraticCurveTo'),'actual shoot rendering begins immediately after growAt');}
      old={...s.camera};lastTime=time;J.update(s,1/fps);
    }
    assert.ok(reached>=.55&&reached<=.55+1/fps+1e-8,'reach close framing in about .55s');
    assert.ok(shoot>.90&&shoot<=.90+1/fps+1e-8,'start plant movement at about .90s');
    assert.ok(shoot-reached<=.35+1/fps+1e-8,'short pause separates the pull-in and visible plant movement');
  }
});
test('closer framing makes the same nine-plant follow visibly wider while retaining the active fruit and ground',()=>{
  const s=fixture(9);advance(s,1);
  const poses=J.growthOrder(s).map(a=>J.plantPose(s,a));
  const at=time=>{s.ending.elapsed=time;J.update(s,0);};
  const marker=poses[0];at(.55);const initial=J.screenPoint(s,marker.x,marker.y).x;
  for(let i=1;i<9;i++) {
    at(J.ENDING.growAt+i*J.ENDING.stagger+1.4+.45+.26);
    const shifted=Math.abs(J.screenPoint(s,marker.x,marker.y).x-initial);
    const oldShift=(poses[i].x-poses[0].x)*1.48;
    assert.ok(shifted>oldShift*1.14&&shifted<oldShift*1.25,'same physical travel is perceptibly larger within the requested modest zoom range');
    const fruit=J.screenPoint(s,poses[i].x,poses[i].y),ground=J.screenPoint(s,poses[i].x,s.geometry.floor(poses[i].x).y);
    assert.ok(Math.abs(fruit.x-195)<1e-8&&fruit.y>100&&fruit.y<600,'active fruit stays comfortably inside the close frame');
    assert.ok(ground.y>fruit.y&&ground.y<650,'surrounding ground remains visible');
  }
});
function drawnFruitGrowth(s,arrival) {
  const {c,calls}=context();Draw.drawPlants(c,s);
  const visible=J.plants(s).sort((a,b)=>a.arrival.rootY-b.arrival.rootY||a.arrival.id-b.arrival.id).filter(p=>p.age>1.4);
  const scales=calls.flatMap((a,i)=>a[0]==='ellipse'&&a[3]===16&&a[4]===3 ? [calls.slice(0,i).findLast(a=>a[0]==='scale')[1]] : []);
  assert.equal(scales.length,visible.length,'observe each actual drawn fruit scale');
  const index=visible.findIndex(p=>p.arrival===arrival);
  return index<0 ? 0 : scales[index]/J.plantPose(s,arrival).size;
}
test('dense fruit gaze starts after visible growth, arrives in .26s, and pauses for .08s',()=>{
  const s=fixture(9);advance(s,1);
  const order=J.growthOrder(s),poses=order.map(a=>J.plantPose(s,a));
  // Sample exact presentation boundaries through the public update. This is
  // separate from the real 30/60/120fps frame sampling checked below.
  const at=time=>{s.ending.elapsed=time;J.update(s,0);};
  for(let i=1;i<9;i++) {
    const onset=J.ENDING.growAt+i*J.ENDING.stagger+1.4,start=onset+.45,end=start+.26;
    assert.ok(poses[i].x-poses[i-1].x<=180*.26,'fixture uses the unchanged dense-row duration');
    at(onset+.40);assert.ok(Math.abs(s.camera.x-poses[i-1].x)<1e-8,'keep previous fruit through onset + .40s');
    at(start);assert.ok(Math.abs(s.camera.x-poses[i-1].x)<1e-8,'no anticipation before .45s delay');
    assert.ok(Math.abs(drawnFruitGrowth(s,order[i])-.4605627642513486)<1e-9,'actual target fruit is about 46% grown at follow start');
    if(i<8)assert.ok(drawnFruitGrowth(s,order[i+1])>0&&drawnFruitGrowth(s,order[i+1])<.04,'next fruit is still visually negligible at follow start');
    at(start+.01);assert.ok(s.camera.x>poses[i-1].x&&s.camera.x<poses[i].x,'gaze begins softly after visible growth');
    at(end);assert.ok(Math.abs(s.camera.x-poses[i].x)<1e-8,'arrive after .26s');
    assert.ok(Math.abs(drawnFruitGrowth(s,order[i])-.840779122321038)<1e-9,'target fruit is about 84% grown on arrival');
    for(const time of [end+.04,start+J.ENDING.stagger]) {
      at(time);assert.ok(Math.abs(s.camera.x-poses[i].x)<1e-8,'hold through the full .08s pause');
    }
  }
});
test('delayed nine-fruit gaze has the same schedule at 30/60/120fps and keeps swelling fruit visible',()=>{
  const runs=[];
  for(const fps of [30,60,120]) {
    const s=fixture(9);advance(s,1,fps);
    const order=J.growthOrder(s),poses=order.map(a=>J.plantPose(s,a));
    endingTo(s,J.ENDING.growAt+1.4,fps);
    assert.equal(s.camera.x,poses[0].x,'first fruit remains held after the unchanged pull-in');
    const starts=[],ends=[],samples=new Map();
    while(s.ending.elapsed<7) {
      J.update(s,1/fps);const time=s.ending.elapsed;
      // Common 1/30s samples must agree exactly across render frame rates.
      if(Math.abs(time*30-Math.round(time*30))<1e-7)samples.set(Math.round(time*30),s.camera.x);
      for(let i=1;i<9;i++) {
        const onset=J.ENDING.growAt+i*J.ENDING.stagger+1.4,start=onset+.45,end=start+.26;
        if(time>=onset+.40&&time<=start+1e-8)assert.ok(Math.abs(s.camera.x-poses[i-1].x)<1e-8,'hold until the fruit is visibly grown');
        if(starts[i]===undefined&&s.camera.x>poses[i-1].x+1e-8) {
          starts[i]=time;assert.ok(time>start&&time<=start+1/fps+1e-8,'first moving frame follows .45s boundary within one render frame');
        }
        if(ends[i]===undefined&&s.camera.x>=poses[i].x-1e-8) {
          ends[i]=time;assert.ok(time>=end-1e-8&&time<=end+1/fps+1e-8,'arrival follows .26s easing within one render frame');
        }
        if(time>=end-1e-8&&time<=start+J.ENDING.stagger+1e-8)assert.ok(Math.abs(s.camera.x-poses[i].x)<1e-8,'dense-row pause retains its target');
      }
    }
    assert.equal(starts.filter(t=>t!==undefined).length,8);assert.equal(ends.filter(t=>t!==undefined).length,8);runs.push(samples);
    const view=fixture(9);advance(view,1,fps);
    while(view.ending.elapsed<7) {
      J.update(view,1/fps);
      for(const {arrival,age} of J.plants(view))if(age>=1.4&&age<=2.35) {
        const p=J.plantPose(view,arrival),q=J.screenPoint(view,p.x,p.y);
        assert.ok(q.x>35&&q.x<355&&q.y>30&&q.y<710,'every fruit stays fully visible during its large swelling, including earlier overlapping fruit');
      }
    }
  }
  for(const samples of runs.slice(1))for(const [frame,x] of runs[0])assert.ok(Math.abs(samples.get(frame)-x)<1e-7,'absolute-time gaze agrees at every common frame');
});
test('one arrival holds its own X after pull-in without any growth pan',()=>{
  for(const fps of [30,60,120]) {
    const s=fixture(1);while(!s.ending)J.update(s,1/fps);endingTo(s,.55,fps);const x=s.camera.x;
    for(let i=0;i<8*fps;i++){J.update(s,1/fps);assert.equal(s.camera.x,x);assert.equal(s.camera.z,J.ENDING.closeZoom);}
  }
});
test('sparse and tightly clustered arrivals remain finite, monotonic, bounded and gentle',()=>{
  for(const n of [2,3,9])for(const clustered of [false,true])for(const fps of [30,60,120]) {
    const s=fixture(n);advance(s,1,fps);
    if(clustered)s.result={...s.result,arrivals:s.result.arrivals.map((a,i)=>({...a,x:1900+i*.25}))};
    endingTo(s,1.5,fps);let old=s.camera.x,maxSpeed=0;
    const poses=J.growthOrder(s).map(a=>J.plantPose(s,a));
    while(s.ending.elapsed<8) {
      J.update(s,1/fps);const change=s.camera.x-old;maxSpeed=Math.max(maxSpeed,change*fps);
      assert.ok(Number.isFinite(s.camera.x+s.camera.y+s.camera.z));
      assert.ok(change>=-1e-8&&s.camera.x<=poses.at(-1).x+1e-8,'no reversal or overshoot');old=s.camera.x;
    }
    assert.ok(maxSpeed<300,'wider gaps ease more slowly instead of sudden sideways movement');
    if(clustered)assert.ok(maxSpeed<2,'nearby targets do not cause small jitters');
    assert.ok(Math.abs(s.camera.x-poses.at(-1).x)<1e-8);
  }
});
test('last plant holds through growth completion and at least one second of rest before original return zoom',()=>{
  for(const n of [1,2,3,9]) {
    const s=fixture(n);s.titleCycle=true;advance(s,1);
    endingTo(s,J.ENDING.growAt+(n-1)*J.ENDING.stagger+J.ENDING.growthDuration+.1);
    assert.ok(s.ending.growthComplete);assert.equal(J.returnZoom(s),0);
    // Sparse rows retain their distance-based duration. With the later gaze,
    // the last move may finish just after growthComplete; then it must settle.
    const poses=J.growthOrder(s).map(a=>J.plantPose(s,a));
    const duration=n>1?Math.max(.26,Math.min(.7,(poses.at(-1).x-poses.at(-2).x)/180)):0;
    endingTo(s,J.ENDING.growAt+(n-1)*J.ENDING.stagger+1.4+.45+duration);
    const last=J.plantPose(s,J.growthOrder(s).at(-1)),old={...s.camera};assert.equal(old.x,last.x);
    advance(s,1);assert.deepEqual(s.camera,old,'quiet final pause');assert.equal(J.returnZoom(s),0);
    endingTo(s,J.ENDING.zoomAt-.05);assert.deepEqual(s.camera,old,'hold final plant until the original title return begins');
    endingTo(s,J.ENDING.zoomAt+.3);assert.ok(J.returnZoom(s)>0,'original title zoom still starts on schedule');
  }
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
  for(const n of [0,3]) {const s=fixture(n);advance(s,20);assert.ok(!s.ending.titleReady);assert.equal(J.returnZoom(s),0);assert.equal(J.titleMix(s),0);if(n){const p=J.plantPose(s,J.growthOrder(s).at(-1));assert.deepEqual(s.camera,{x:p.x,y:s.geometry.floor(p.x).y-62,z:J.ENDING.closeZoom});}else assert.equal(s.ending.focus,null);}
});

test('late focus quiets neighbouring plants while leaving the chosen fruit continuous',()=>{
 const s=fixture(9);s.titleCycle=true;advance(s,12.3);assert.ok(J.returnZoom(s)>.8&&J.titleMix(s)>.05);
 const {c,calls}=context(),alphas=[];const observed=new Proxy(c,{set(target,key,value){if(key==='globalAlpha')alphas.push(value);target[key]=value;return true;}});Draw.drawPlants(observed,s,()=>{});
 assert.ok(alphas.some(a=>a>0&&a<.2),'neighbours recede softly during the approach');assert.ok(calls.filter(a=>a[0]==='ellipse'&&a[3]===16&&a[4]===3).length===9,'focus does not delete result fruit');
});
