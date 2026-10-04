'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const D=require('./dynamics.js'),J=require('./journey.js'),G=require('./stage-geometry.js'),data=require('./stage-data.js'),Draw=require('./stage-draw.js'),M=require('./builder/model.js');
const advance=(s,t,fps=60)=>{for(let i=0;i<Math.round(t*fps);i++)J.update(s,1/fps);};
function place(s,p,x,vx=0){const f=s.geometry.floor(x);Object.assign(p,{x,y:f.y-J.support(p,f.nx,f.ny)/-f.ny-.1,vx,vy:0,spin:0});}
function fixture(n,g=J.geometry){const s=J.create(D.create(),false,g);s.seeds.forEach((p,i)=>{if(i>=n){p.lost=p.inactive=true;return;}place(s,p,g.END.left+22+(g.END.right-g.END.left-44)*(i+.5)/n);});s.camera={x:(g.END.left+g.END.right)/2,y:g.floor((g.END.left+g.END.right)/2).y-80,z:J.ZOOM};return s;}
function context(){const calls=[];return {calls,c:new Proxy({globalAlpha:1}, {get:(target,key)=>key==='globalAlpha'?target.globalAlpha:key==='createLinearGradient'?()=>({addColorStop(){}}):(...args)=>calls.push([key,...args]),set:(target,key,value)=>{calls.push(['style',key,typeof value==='object'?'gradient':value]);target[key]=value;return true;}})};}
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
  const states=[30,60,120].map(fps=>{const s=fixture(9);for(let i=0;i<10*fps;i++){J.update(s,1/fps);assert.ok(Number.isFinite(s.camera.x+s.camera.y+s.camera.z));assert.equal(J.travelling(s).length+J.party(s).filter(p=>p.arrival).length+s.seeds.filter(p=>p.lost).length,9);}assert.deepEqual(s.camera,J.endingFrame(s),'hold the whole result composition');return s;});
  for(const s of states.slice(1))for(let i=0;i<9;i++)for(const k of ['x','y','at'])assert.ok(Math.abs(s.result.arrivals[i][k]-states[0].result.arrivals[i][k])<1e-7);
  for(const s of states){const p=J.plantPose(s,J.growthOrder(s).at(-1)),q=J.screenPoint(s,p.x,p.y);assert.ok(Math.abs(q.x-J.ENDING.heroScreenX)<1e-8&&q.y>30&&q.y<710,'rightmost hero rests to the right of centre');}
});
test('zero arrivals yields no growth and the same finite view with a short replay pause',()=>{
  const s=fixture(0),old={...s.camera};advance(s,1);assert.ok(s.finished&&!s.replayReady);assert.equal(J.plants(s).length,0);assert.equal(s.ending.phase,'empty');advance(s,2);assert.ok(s.replayReady);assert.deepEqual(s.camera,old);assert.ok(Number.isFinite(s.time+s.x+s.y));
});
test('empty title keeps its original 2.4 second pause and 1.2 second connection at all frame rates',()=>{
  for(const fps of [30,60,120]) {
    const s=fixture(0);s.titleCycle=true;advance(s,1,fps);const camera={...s.camera};
    endingTo(s,2.35,fps);assert.equal(s.ending.phase,'empty');assert.equal(J.titleMix(s),0);assert.ok(!s.replayReady);
    endingTo(s,2.45,fps);assert.equal(s.ending.phase,'connecting');assert.ok(J.titleMix(s)>0&&s.replayReady);assert.ok(!s.ending.titleReady);
    endingTo(s,3.65,fps);assert.equal(s.ending.phase,'title');assert.equal(J.titleMix(s),1);assert.ok(s.ending.titleReady);
    assert.equal(s.ending.focus,null);assert.equal(J.returnZoom(s),0);assert.equal(J.plants(s).length,0);assert.deepEqual(s.camera,camera);
  }
});
test('current draft END/floor drive soil contact, framing and roots; JSON and RESET/EDIT stay usable',()=>{
  const d=JSON.parse(JSON.stringify(data));d.surfaces.at(-1).points.push({id:'extra-land',x:2900,y:460});d.end={left:2420,right:2770};const g=G.compile(d),s=fixture(3,g);
  advance(s,10);assert.equal(s.farm.left,2420);assert.equal(s.result.arrivals.length,3);assert.ok(s.result.arrivals.every(a=>a.x>2420&&a.x<2770&&a.rootY===g.floor(a.x).y));assert.deepEqual(s.camera,J.endingFrame(s));assert.equal(J.END.left,1790);
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

test('arrival leaves the exact gameplay ground, receiving seam and background unchanged',()=>{
  const s=fixture(9);while(!s.ending)J.update(s,1/60);
  s.ending.elapsed=0;J.update(s,0);
  const result=s.result,ending=s.ending;
  const {c:after,calls:afterCalls}=context();Draw.draw(after,s,()=>{},()=>{},()=>{});
  s.result=s.ending=null;
  const {c:before,calls:beforeCalls}=context();Draw.draw(before,s,()=>{},()=>{},()=>{});
  assert.deepEqual(afterCalls,beforeCalls,'arrival changes neither terrain/background paths nor stroke widths/opacity');
  s.result=result;s.ending=ending;
  for(const time of [0,.9,2.3,5.87,8]) {
    s.ending.elapsed=time;
    const a=context(),b=context();Draw.drawFarm(a.c,s.geometry,0,false);Draw.drawFarm(b.c,s.geometry,0,true);
    assert.deepEqual(a.calls,b.calls,'the green edge keeps the same cover throughout growth');
  }
  const source=fs.readFileSync(require.resolve('./stage-draw.js'),'utf8');
  assert.match(source,/drawTerrain\(c,g,lift,1,o===1\);\s*drawLoops\(c,g\);\s*drawFarm\(c,g,lift\);/);
});

test('successful ending hides the visible right wall and extends only the drawn terrain horizon',()=>{
  const s=fixture(3);advance(s,2);
  const before=s.geometry.bounds.right;
  const {c,calls}=context();Draw.drawTerrain(c,s.geometry,0,1,true);
  assert.equal(s.geometry.bounds.right,before,'render-only extension must not mutate world bounds');
  assert.ok(calls.some(a=>a[0]==='lineTo'&&a[1]>before+400),'ending terrain continues beyond the physical right bound');
  assert.ok(!calls.some(a=>a[0]==='moveTo'&&a[1]===before&&a[2]===s.geometry.floor(before).y&&calls.some(b=>b[0]==='lineTo'&&b[1]===before&&b[2]===-200)),'right outside wall is not drawn in the resolved view');
});
test('fruit rests on the sampled curve and the deterministic final subject is the rightmost hero',()=>{
  const s=fixture(9);advance(s,7);
  const expected=J.growthOrder(s).at(-1);
  assert.equal(J.heroPumpkin(s),expected);assert.equal(s.ending.focus,expected);
  for(const a of s.result.arrivals){const p=J.plantPose(s,a);assert.ok(Math.abs(p.x-a.x)<=14.1);assert.equal(p.y+13*p.size,s.geometry.floor(p.x).y+1);assert.equal(a.rootY,s.geometry.floor(a.x).y);assert.ok(s.geometry.floor(p.x).y-p.y<13,'fruit centre sits just above its own soil contact');}
});
const endingTo=(s,time,fps=60)=>{while(s.ending.elapsed<time-1e-7)J.update(s,1/fps);};
const growthEnd=s=>J.ENDING.growAt+(s.result.arrivals.length-1)*J.ENDING.stagger+J.ENDING.growthDuration;
function drawnFruitGrowth(s,arrival) {
  const {c,calls}=context();Draw.drawPlants(c,s);
  const visible=J.plants(s).sort((a,b)=>a.arrival.rootY-b.arrival.rootY||a.arrival.id-b.arrival.id).filter(p=>p.age>1.4);
  const scales=calls.flatMap((a,i)=>a[0]==='ellipse'&&a[3]===16&&a[4]===3 ? [calls.slice(0,i).findLast(a=>a[0]==='scale')[1]] : []);
  assert.equal(scales.length,visible.length,'observe each actual drawn fruit scale');
  const index=visible.findIndex(p=>p.arrival===arrival);
  return index<0 ? 0 : scales[index]/J.plantPose(s,arrival).size;
}
test('plant order, stagger, shoot onset and actual fruit curve stay independent of the continuous camera',()=>{
  const s=fixture(9);advance(s,1);
  const order=J.growthOrder(s),xs=order.map(a=>J.plantPose(s,a).x);
  assert.deepEqual(xs,xs.slice().sort((a,b)=>a-b));
  assert.equal(J.ENDING.growAt,.90);assert.equal(J.ENDING.stagger,.34);assert.equal(J.ENDING.growthDuration,2.25);
  for(let i=0;i<9;i++) {
    const onset=.9+i*.34;
    s.ending.elapsed=onset;J.update(s,0);assert.ok(Math.abs(J.plants(s)[i].age)<1e-8);
    s.ending.elapsed=onset+1.4+.475;J.update(s,0);
    assert.ok(Math.abs(drawnFruitGrowth(s,order[i])-.5)<1e-9,'unchanged fruit reaches half scale .475s after fruit onset');
  }
});
test('one leaf-to-growth shot accelerates, cruises and decelerates without plant-event stops',()=>{
  for(const fps of [30,60,120])for(const n of [2,3,9]) {
    const s=fixture(n);while(!s.ending)J.update(s,1/fps);
    const {cameraStart,growthEnd:end}=J.endingTiming(s),duration=end-cameraStart;
    const from={...s.ending.from},frame=J.endingFrame(s),hero=s.ending.focus;
    const distance=Math.hypot(frame.x-from.x,frame.y-from.y,(frame.z-from.z)*100);
    s.ending.elapsed=0;J.update(s,0);assert.deepEqual(s.camera,from);
    let old={...from},oldTime=0;
    const observed={accelerate:[],cruise:[],decelerate:[]};
    while(s.ending.elapsed<end) {
      J.update(s,1/fps);const time=Math.min(s.ending.elapsed,end),delta=time-oldTime;
      const step=Math.hypot(s.camera.x-old.x,s.camera.y-old.y,(s.camera.z-old.z)*100);
      const speed=step/delta;
      assert.ok(Number.isFinite(speed)&&speed<=distance*1.25/duration+1e-7,'continuous bounded speed');
      if(time<=cameraStart+1e-9)assert.deepEqual(s.camera,from,'quiet arrival and shoot, before leaves');
      if(oldTime>=cameraStart&&time<end)assert.ok(speed>0,'no intermediate hold at any fruit onset');
      const phaseStart=cameraStart+.2*duration,phaseEnd=cameraStart+.8*duration;
      if(oldTime>=cameraStart&&time<phaseStart)observed.accelerate.push(speed);
      if(oldTime>=phaseStart&&time<phaseEnd)observed.cruise.push(speed);
      if(oldTime>=phaseEnd&&time<end)observed.decelerate.push(speed);
      for(const k of ['x','y','z'])assert.ok((s.camera[k]-old[k])*(frame[k]-from[k])>=-1e-8,'no reversal');
      assert.equal(s.ending.focus,hero,'never change subject at a growth event');
      old={...s.camera};oldTime=time;
    }
    for(let i=1;i<observed.accelerate.length;i++)assert.ok(observed.accelerate[i]>observed.accelerate[i-1]);
    for(const speed of observed.cruise)assert.ok(Math.abs(speed-distance*1.25/duration)<1e-7,'constant middle velocity');
    for(let i=1;i<observed.decelerate.length;i++)assert.ok(observed.decelerate[i]<observed.decelerate[i-1]);
    assert.ok(Object.values(observed).every(a=>a.length>2),'observe all three motion phases');
    assert.deepEqual(s.camera,frame,'settle on the unchanged result composition');
  }
});
test('trapezoidal position and velocity are continuous at 20/80%, with zero endpoint velocity',()=>{
  const f=J.cameraProgress,h=1e-6,velocity=p=>(f(p+h)-f(p-h))/(2*h);
  for(const [p,value] of [[0,0],[.2,.125],[.5,.5],[.8,.875],[1,1]])assert.ok(Math.abs(f(p)-value)<1e-12);
  assert.equal(f(-.1),0);assert.equal(f(1.1),1);
  for(const p of [.2,.8]) {
    assert.ok(Math.abs(f(p+h)-f(p-h))<2.51*h,'no position jump');
    const left=(f(p)-f(p-h))/h,right=(f(p+h)-f(p))/h;
    assert.ok(Math.abs(left-right)<1e-5&&Math.abs(left-1.25)<1e-5&&Math.abs(right-1.25)<1e-5,'no velocity jump');
  }
  assert.ok(Math.abs(velocity(0))<1e-5&&Math.abs(velocity(1))<1e-5);
  for(const p of [.3,.4,.5,.6,.7])assert.ok(Math.abs(velocity(p)-1.25)<1e-8);
});
test('nine fruit onsets advance naturally through one camera path and share growth completion',()=>{
  const s=fixture(9);advance(s,1);const t=J.endingTiming(s),duration=t.growthEnd-t.cameraStart;
  assert.ok(Math.abs(t.cameraStart-1.4)<1e-12);assert.ok(Math.abs(t.growthEnd-5.87)<1e-12);
  assert.ok(Math.abs(t.titleZoomAt-6.87)<1e-12);
  assert.ok(Math.abs(t.cameraStart+.2*duration-2.294)<1e-12);
  assert.ok(Math.abs(t.cameraStart+.8*duration-4.976)<1e-12);
  const expected=[13,22,32,41,51,60,70,79,89],from=s.ending.from,frame=J.endingFrame(s);
  const order=J.growthOrder(s),hero=s.ending.focus;
  for(let i=0;i<9;i++) {
    const onset=2.30+i*.34;s.ending.elapsed=onset;J.update(s,0);
    assert.ok(Math.abs(J.plants(s)[i].age-1.4)<1e-10);
    const progress=(s.camera.x-from.x)/(frame.x-from.x);
    assert.ok(Math.abs(progress*100-expected[i])<.7,'approximately ten percent of the same path per fruit');
    assert.equal(s.ending.focus,hero);assert.deepEqual(J.growthOrder(s),order);
  }
  s.ending.elapsed=t.growthEnd;J.update(s,0);assert.deepEqual(s.camera,frame);
});
test('continuous ending agrees at common times at 30/60/120fps',()=>{
  for(const n of [1,2,3,9]) {
    const runs=[30,60,120].map(fps=>{
      const s=fixture(n);while(!s.ending)J.update(s,1/fps);
      // Match arrival view: gameplay smoothing is intentionally frame-rate
      // dependent; the ending itself uses absolute elapsed time only.
      s.ending.from={x:1900,y:400,z:1.8};const samples=new Map();
      while(s.ending.elapsed<8) {
        J.update(s,1/fps);const t=s.ending.elapsed;
        if(Math.abs(t*30-Math.round(t*30))<1e-7)samples.set(Math.round(t*30),{...s.camera});
      }
      return samples;
    });
    for(const run of runs.slice(1))for(const [time,cam] of runs[0])for(const k of ['x','y','z'])assert.ok(Math.abs(run.get(time)[k]-cam[k])<1e-7);
  }
});
test('one arrival holds its gameplay view throughout growth and the result pause',()=>{
  for(const fps of [30,60,120]) {
    const s=fixture(1);while(!s.ending)J.update(s,1/fps);const from={...s.ending.from};
    for(let i=0;i<8*fps;i++){J.update(s,1/fps);assert.deepEqual(s.camera,from);}
    assert.equal(s.ending.focus,J.growthOrder(s)[0]);
  }
});
test('whole-result framing keeps every fruit visible and the rightmost hero off-centre',()=>{
  for(const n of [2,3,9])for(const fps of [30,60,120]) {
    const s=fixture(n);advance(s,1,fps);endingTo(s,growthEnd(s),fps);
    const hero=J.plantPose(s,s.ending.focus),h=J.screenPoint(s,hero.x,hero.y);
    assert.ok(h.x>260&&h.x<310,'hero is the leading subject, not a centred final fruit');
    for(const a of s.result.arrivals) {
      const p=J.plantPose(s,a),q=J.screenPoint(s,p.x,p.y),radius=22*p.size*s.camera.z;
      assert.ok(q.x-radius>=J.ENDING.framePadding-1e-7&&q.x+radius<=390-J.ENDING.framePadding+1e-7,'all complete fruits fit the final view');
      assert.ok(q.y-32*p.size*s.camera.z>30&&q.y+24*s.camera.z<710,'foliage and surrounding ground have space');
    }
  }
});
test('swelling fruit stays visible during the standard row glide',()=>{
  for(const n of [1,2,3,9])for(const fps of [30,60,120]) {
    const s=fixture(n);advance(s,1,fps);
    while(s.ending.elapsed<growthEnd(s)) {
      J.update(s,1/fps);
      for(const {arrival,age} of J.plants(s))if(age>=1.4&&age<=2.35) {
        const p=J.plantPose(s,arrival),q=J.screenPoint(s,p.x,p.y),r=22*p.size*s.camera.z;
        assert.ok(q.x-r>10&&q.x+r<380&&q.y>30&&q.y<710,'a growing fruit is seen without an event-timed target');
      }
    }
  }
});
test('sparse Builder and tightly clustered rows settle without oscillation and show the full result',()=>{
  const wide=JSON.parse(JSON.stringify(data));wide.surfaces.at(-1).points.push({id:'long-result',x:2900,y:460});wide.end={left:1900,right:2770};
  for(const n of [2,3,9])for(const fps of [30,60,120])for(const clustered of [false,true]) {
    const s=fixture(n,clustered?J.geometry:G.compile(wide));advance(s,1,fps);
    if(clustered)s.result={...s.result,arrivals:s.result.arrivals.map((a,i)=>({...a,x:1900+i*.25}))};
    const frame=J.endingFrame(s),from=s.ending.from;let old={...s.camera};
    while(s.ending.elapsed<8) {
      J.update(s,1/fps);
      for(const k of ['x','y','z']){assert.ok(Number.isFinite(s.camera[k]));assert.ok((s.camera[k]-old[k])*(frame[k]-from[k])>=-1e-7);}
      old={...s.camera};
    }
    assert.deepEqual(s.camera,frame);
    for(const a of s.result.arrivals){const p=J.plantPose(s,a),q=J.screenPoint(s,p.x,p.y);assert.ok(q.x-22*p.size*s.camera.z>=27.99&&q.x+22*p.size*s.camera.z<=362.01);}
  }
});
test('the full result and rightmost hero hold until the original title approach',()=>{
  for(const n of [1,2,3,9]) {
    const s=fixture(n);s.titleCycle=true;advance(s,1);endingTo(s,growthEnd(s));
    const subject=s.ending.focus,frame={...s.camera};assert.equal(subject,J.heroPumpkin(s));
    endingTo(s,J.endingTiming(s).titleZoomAt-.05);assert.deepEqual(s.camera,frame,'one second of the complete result');
    endingTo(s,J.endingTiming(s).titleZoomAt-.05);assert.deepEqual(s.camera,frame);assert.equal(J.returnZoom(s),0);
    endingTo(s,J.endingTiming(s).titleZoomAt+.3);assert.ok(J.returnZoom(s)>0);assert.equal(s.ending.focus,subject,'title continues toward the same hero');
  }
});
test('continuous zoom connects the same fruit to the exact original title scale at 30/60/120fps',()=>{
  for(const fps of [30,60,120]) {
    const s=fixture(9);s.titleCycle=true;advance(s,1,fps);endingTo(s,growthEnd(s),fps);assert.equal(s.ending.phase,'rest');const roots=s.result.arrivals.map(a=>[a.x,a.y,a.rootY]);
    endingTo(s,J.endingTiming(s).titleZoomAt-.05,fps);assert.equal(J.returnZoom(s),0,'one second of rest precedes the zoom');
    let old={...s.camera},maxStep=0,phases=new Set();
    for(let i=0;i<5*fps;i++){J.update(s,1/fps);phases.add(s.ending.phase);maxStep=Math.max(maxStep,Math.abs(s.camera.z-old.z));assert.ok(Number.isFinite(s.camera.x+s.camera.y+s.camera.z));old={...s.camera};}
    assert.ok(phases.has('zoom')&&phases.has('connecting')&&phases.has('title'));assert.ok(maxStep<.18,'no camera scale jump');assert.ok(s.ending.titleReady);
    const p=J.plantPose(s,s.ending.focus),q=J.screenPoint(s,p.x,p.y);assert.ok(Math.abs(q.x-195)<1e-8&&Math.abs(q.y-365)<1e-8);assert.ok(Math.abs(s.camera.z*20*p.size-143)<1e-8);assert.equal(J.titleMix(s),1);
    assert.deepEqual(s.result.arrivals.map(a=>[a.x,a.y,a.rootY]),roots);
  }
});
test('Builder runs keep their grown farm view; empty endings never fabricate a focus or auto-return',()=>{
  for(const n of [0,3]) {const s=fixture(n);advance(s,20);assert.ok(!s.ending.titleReady);assert.equal(J.returnZoom(s),0);assert.equal(J.titleMix(s),0);if(n){assert.deepEqual(s.camera,J.endingFrame(s));}else assert.equal(s.ending.focus,null);}
});

test('late focus quiets neighbouring plants while leaving the chosen fruit continuous',()=>{
 const s=fixture(9);s.titleCycle=true;advance(s,1);endingTo(s,J.endingTiming(s).titleZoomAt+3.2);assert.ok(J.returnZoom(s)>.8&&J.titleMix(s)>.05);
 const {c,calls}=context(),alphas=[];const observed=new Proxy(c,{set(target,key,value){if(key==='globalAlpha')alphas.push(value);target[key]=value;return true;}});Draw.drawPlants(observed,s,()=>{});
 assert.ok(alphas.some(a=>a>0&&a<.2),'neighbours recede softly during the approach');assert.ok(calls.filter(a=>a[0]==='ellipse'&&a[3]===16&&a[4]===3).length===9,'focus does not delete result fruit');
});

test('one/three/nine results hold for exactly one second before the same hero zoom and original connection',()=>{
  for(const fps of [30,60,120])for(const [n,end,zoomAt] of [[1,3.15,4.15],[3,3.83,4.83],[9,5.87,6.87]]) {
    const s=fixture(n);s.titleCycle=true;advance(s,1,fps);const timing=J.endingTiming(s),hero=s.ending.focus;
    assert.ok(Math.abs(timing.growthEnd-end)<1e-12&&Math.abs(timing.titleZoomAt-zoomAt)<1e-12);
    assert.equal(timing.cameraStart,1.4);assert.equal(J.ENDING.zoomDuration,3.8);assert.equal(J.ENDING.connectDuration,1.2);
    endingTo(s,end+.04,fps);assert.equal(s.ending.phase,'rest');const frame={...s.camera};
    endingTo(s,zoomAt-.05,fps);assert.deepEqual(s.camera,frame);assert.equal(J.returnZoom(s),0);
    endingTo(s,zoomAt+.05,fps);assert.equal(s.ending.phase,'zoom');assert.ok(J.returnZoom(s)>0);assert.equal(J.titleMix(s),0);
    endingTo(s,zoomAt+2.55,fps);assert.equal(J.titleMix(s),0,'same 1.2 second connection within the 3.8 second zoom');
    endingTo(s,zoomAt+2.65,fps);assert.equal(s.ending.phase,'connecting');assert.ok(J.titleMix(s)>0);
    endingTo(s,zoomAt+3.85,fps);assert.ok(s.ending.titleReady);assert.equal(s.ending.phase,'title');
    assert.equal(s.ending.focus,hero);assert.equal(J.returnZoom(s),1);assert.equal(J.titleMix(s),1);
  }
});
