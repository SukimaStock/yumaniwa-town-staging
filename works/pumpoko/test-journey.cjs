'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const D = require('./dynamics.js'), J = require('./journey.js'), G = require('./stage-geometry.js'), Route=require('./fixtures/momentum-route.cjs');
let passed = 0;
function test(name, run) { run(); passed++; console.log('PASS', name); }
function advance(s, seconds, fps = 60) { for (let i = 0; i < Math.round(seconds * fps); i++) J.update(s, 1 / fps); }
function hold(s, x, y = 0) { s.held = true; J.drag(s,x,y); }
function allAt(s, x, seconds = 35) {
  for (let i = 0; i < seconds * 60; i++) { J.update(s, 1/60); if (s.seeds.every(p => p.x > x)) return true; }
  return false;
}
function attachedSource() {
  const s = D.createPrologue(); s.held = true;
  for (let i=0; i<25*60 && !D.allLoose(s); i++) {
    s.targetX=.34*Math.cos(i/60*3.2); s.targetY=.34*Math.sin(i/60*3.2); D.update(s,1/60);
  }
  assert.ok(D.allLoose(s)); D.release(s);
  for (let i=0; i<108; i++) D.update(s,1/60);
  return s;
}
test('transfer preserves all nine object identities, pose, spin and projected momentum', () => {
  const a = attachedSource(), objects = a.seeds.slice();
  const before = objects.map(p => ({...p}));
  const s = J.create(a,true);
  assert.equal(s.seeds,a.seeds); assert.equal(new Set(s.seeds).size,9);
  for (let i=0;i<9;i++) {
    const p=s.seeds[i], old=before[i]; assert.equal(p,objects[i]);
    assert.equal(p.x,old.x+J.START.x); assert.equal(p.y,old.y*.8+J.START.y);
    assert.equal(p.vx,old.vx); assert.equal(p.vy,old.vy*.8);
    assert.equal(p.angle,old.angle); assert.equal(p.spin,old.spin);
    for(let j=0;j<i;j++) {
      assert.ok(Math.abs((p.x-s.seeds[j].x)-(old.x-before[j].x))<1e-10);
      assert.ok(Math.abs((p.y-s.seeds[j].y)-.8*(old.y-before[j].y))<1e-10);
    }
  }
  assert.equal(s.time,a.time); assert.equal(s.accumulator,a.accumulator);
});
test('handoff has the identical screen transform, with moving/tilted/ringing vessel', () => {
  const a = D.create(); a.x=.24;a.y=-.19;a.ring=.035;
  const before=a.seeds.map(p=>({...p})), s=J.create(a,true);
  for(let i=0;i<9;i++) {
    const p=before[i], dx=p.x*(1+a.ring*.22), dy=p.y*.8*(1-a.y*.15-a.ring*.18), angle=a.x*.22;
    const x=195+a.x*34+Math.cos(angle)*dx-Math.sin(angle)*dy;
    const y=365+a.y*23+Math.sin(angle)*dx+Math.cos(angle)*dy;
    const screen=J.screenPoint(s,s.seeds[i].x,s.seeds[i].y);
    assert.ok(Math.hypot(screen.x-x,screen.y-y)<1e-10);
    const inverse=J.point(s,screen.x,screen.y);
    assert.ok(Math.hypot(inverse.x-s.seeds[i].x,inverse.y-s.seeds[i].y)<1e-10);
  }
});
test('transition runs on the same party, with finite continuous positions and camera', () => {
  const s=J.create(attachedSource(),true), objects=s.seeds.slice();
  let old=s.seeds.map(p=>J.screenPoint(s,p.x,p.y));
  for(let i=0;i<840;i++) {
    J.update(s,1/120);
    assert.equal(s.seeds.length,9);assert.equal(new Set(s.seeds).size,9);
    const now=s.seeds.map(p=>J.screenPoint(s,p.x,p.y));
    for(let k=0;k<9;k++) {assert.equal(s.seeds[k],objects[k]);assert.ok(Math.hypot(now[k].x-old[k].x,now[k].y-old[k].y)<14);}
    old=now;
  }
  assert.ok(s.transition.settled);assert.equal(J.opening(s),1);
});
test('flat seed support is orientation-sensitive along the surface normal', () => {
  const p={angle:0};assert.ok(J.support(p,1,0)>J.support(p,0,1)*1.7);
  p.angle=Math.PI/2;assert.ok(J.support(p,0,1)>J.support(p,1,0)*1.7);
});
test('knock is a local world impulse, not direct grain steering', () => {
  const s=J.create(D.create()); const before=s.seeds.map(p=>({...p}));
  J.knock(s,J.START.x-40,J.START.y-30);
  for(let i=0;i<9;i++) {assert.equal(s.seeds[i].x,before[i].x);assert.equal(s.seeds[i].y,before[i].y);}
  assert.ok(s.seeds.some(p=>Math.hypot(p.vx,p.vy)>5));
});
test('release leaves a physical tail after the world spring recovers', () => {
  const s=J.create(D.create());hold(s,.3);advance(s,2);J.release(s);advance(s,1);
  assert.ok(Math.abs(s.x)<.05);assert.ok(s.seeds.some(p=>Math.hypot(p.vx,p.vy)>15));
});
test('30/60/120fps match physical state through transition, tilt, knock and release', () => {
  const runs=[30,60,120].map(fps=>{
    const s=J.create(D.create(),true);advance(s,7,fps);hold(s,.28);advance(s,4,fps);
    J.knock(s,900,380);advance(s,1,fps);J.release(s);advance(s,2,fps);return s;
  });
  for(const s of runs.slice(1))for(let i=0;i<9;i++) {
    for(const k of ['x','y','vx','vy','angle','spin','roll'])assert.ok(Math.abs(s.seeds[i][k]-runs[0].seeds[i][k])<1e-6,`${k} fps mismatch`);
  }
});
test('neutral flat ground supplies gravity but no automatic horizontal progression', () => {
  const s=J.create(D.create());advance(s,12);
  assert.ok(s.seeds.every(p=>p.x<310));assert.ok(!s.finished);
  assert.ok(s.seeds.every(p=>Math.abs(p.vx)<5));
});
function sceneHarness(search = "?dev=1", journey = J) {
  let config;const held=new Set(), plays=[];const c={console,location:{search},URLSearchParams,
    SUKIMASTOCK_WORK:{id:'pumpoko',title:'PUMPOKO',logicalWidth:390,logicalHeight:740,frameRate:60},
    PumpkinDynamics:D,PumpkinJourney:journey,BEGAN:'BEGAN',MOVING:'MOVING',ENDED:'ENDED',CANCELLED:'CANCELLED',
    SSE:{createApp:v=>{config=v;},audio:{withBaseline:v=>v,baseline:()=>({reference:{bgm:{active:.225},se:{action:.46,soft:.24}}}),play:name=>plays.push(name)},
    input:{action:n=>held.has(n),actionPressed:()=>false}}};c.window=c;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'sketch.js'),'utf8'),c);
  const elements = new Map(), translations = [];
  function element() { return { hidden:true, textContent:'', handlers:{}, addEventListener(n,f){this.handlers[n]=f;}, setAttribute(){}, getContext(){return context;} }; }
  const context = new Proxy({}, {get: (_,name) => name === 'createLinearGradient' || name === 'createRadialGradient' ? () => ({addColorStop(){}}) : name==='translate' ? (x,y)=>translations.push([x,y]) : () => {}});
  c.document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,body:{appendChild(el){elements.set(el.id,el);}}};
  c.withCanvasContext=run=>run(context);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'stage-draw.js'),'utf8'),c);
  c.SSE.audio.preload=()=>{};c.SSE.audio.unlock=()=>{};c.SSE.audio.enabled=true;
  return {scene:config.scenes.main,probe:c.PumpkinProbe,held,plays,setup:config.setup,elements,translations};
}
test('actual drawing uses weak depth layers, leaves seeds physical and fades before shell expansion', () => {
  const h=sceneHarness();h.setup();h.held.add('right');h.held.add('down');
  for(let i=0;i<60;i++)h.scene.update(1/60);
  h.translations.length=0;h.scene.draw();const [x,y]=h.probe().tilt;
  assert.ok(Math.abs(h.translations[3][0]+x*5)<1e-10);
  assert.ok(Math.abs(h.translations[4][0]+x*.7)<1e-10);
  assert.ok(Math.abs(h.translations[5][0]-x*7)<1e-10);
  assert.ok(Math.abs(h.translations[3][0]-h.translations[5][0])<5);
  assert.equal(h.translations.length,15,'only nine seed translations; no seed parallax layer');
  let found=false;
  for(let i=0;i<40*60;i++){
    h.scene.update(1/60);const p=h.probe();
    if(p.mode==='transition'&&p.transition>.36&&p.transition<.45){
      h.translations.length=0;h.scene.draw();
      assert.ok(h.translations.some(([x,y])=>x===0&&y===15));
      assert.ok(h.translations.filter(([x,y])=>x===0&&y===0).length>=2);found=true;break;
    }
  }
  assert.ok(found);
});
test('actual scene preserves the post-detach pause, zoom state, and journey input', () => {
  const h=sceneHarness();h.held.add('right');h.held.add('down');
  let looseAt=null,zoomAt=null,journeyAt=null;
  for(let i=0;i<40*60;i++) {
    h.scene.update(1/60);const p=h.probe();assert.equal(p.seedCount,9);
    if(p.loose===9&&looseAt===null)looseAt=i/60;
    if(p.mode==='transition'&&zoomAt===null)zoomAt=i/60;
    if(p.mode==='journey'){journeyAt=i/60;break;}
  }
  assert.ok(zoomAt-looseAt>=1.79);assert.ok(zoomAt-looseAt<1.85);
  assert.ok(journeyAt-zoomAt>=J.DURATION-.02);assert.equal(h.probe().held,true);
  h.held.clear();h.scene.update(1/60);assert.equal(h.probe().held,false);
});
test('Stage 1 drag regrabs do not knock; a tap does; cancelled gestures are inert', () => {
  const h=sceneHarness('?dev=1&stage=1');
  for(let i=0;i<25;i++) {
    h.scene.touch({id:1,state:'BEGAN',x:130,y:300});
    h.scene.touch({id:1,state:'MOVING',x:240,y:325});
    for(let f=0;f<30;f++)h.scene.update(1/60);
    h.scene.touch({id:1,state:'ENDED',x:240,y:325});
    for(let f=0;f<10;f++)h.scene.update(1/60);
  }
  assert.ok(!h.plays.includes('shell'),'a world drag must not scatter the grains with a knock');
  const p=h.probe(),xs=p.bounds.map(p=>p[0]);
  assert.equal(p.active+p.lost,9);
  assert.ok(Math.max(...xs)>500,'repeated real scene gestures must advance grains');
  h.scene.touch({id:2,state:'BEGAN',x:200,y:300});h.scene.touch({id:2,state:'CANCELLED',x:200,y:300});
  assert.ok(!h.plays.includes('shell'));
  h.scene.touch({id:3,state:'BEGAN',x:200,y:300});h.scene.touch({id:3,state:'ENDED',x:200,y:300});
  assert.equal(h.plays.filter(n=>n==='shell').length,0,'tap retains physics but is silent');
});
test('a dispersed camera retains real grains instead of centring the empty extreme gap', () => {
  const s=J.create(D.create());
  // Camera-only fixture: eight grains here, one very distant laggard.
  s.seeds.forEach((p,i)=>{p.x=i?1200+i*15:80;p.y=J.floor(p.x).y-10;});
  for(let i=0;i<180;i++)J.update(s,1/60);
  const visible=s.seeds.filter(p=>{const q=J.screenPoint(s,p.x,p.y);return q.x>15&&q.x<375&&q.y>15&&q.y<725;});
  assert.ok(visible.length>=6,`camera lost the party: ${visible.length}`);
  assert.ok(s.camera.z>=1.15);
});
function cameraMedian(s,key='x') {
  const values=J.travelling(s).map(p=>p[key]).sort((a,b)=>a-b);
  return values[Math.floor(values.length/2)];
}
function cameraFixture() {
  // The old "rest" fixture overlapped grains on a slope, then assigned vx
  // only once. Use flat, non-overlapping ground and keep real physics running.
  const g=G.compile({version:1,start:{x:180,y:250},end:{left:2800,right:3000},
    surfaces:[{id:'camera-flat',material:'flesh',points:[{id:'flat-left',x:-50,y:350},{id:'flat-right',x:3300,y:350}]}],materials:[],features:[]});
  const s=J.create(D.create(),false,g);
  s.seeds.forEach((p,i)=>Object.assign(p,{x:500+i*24,y:350-5.5,vx:0,vy:0,angle:0,spin:0}));
  s.camera.x=cameraMedian(s);
  return s;
}
function cameraRun(s,seconds,fps,observe=()=>{}) {
  for(let i=0;i<Math.round(seconds*fps);i++) {
    J.update(s,1/fps);
    assert.equal(J.travelling(s).length,9,'fixture must remain travelling, without arrival/loss');
    assert.ok(Number.isFinite(s.camera.x+s.camera.y+s.camera.z+s.cameraLead));
    assert.ok(s.cameraLead>=0&&s.cameraLead<=82,'bounded rightward lead at every frame');
    observe();
  }
}
test('stationary and slow rightward parties have no forward lead', () => {
  for(const fps of [30,60,120]) {
    const s=cameraFixture();cameraRun(s,2,fps);
    assert.equal(cameraMedian(s,'vx'),0,'rest fixture is actually stationary');
    assert.equal(s.cameraLead,0);assert.equal(s.camera.x,cameraMedian(s));
    hold(s,.02);cameraRun(s,4,fps);
    assert.ok(cameraMedian(s,'vx')>0&&cameraMedian(s,'vx')<18,'slow motion remains below activation speed');
    assert.equal(s.cameraLead,0,'slow motion must not fabricate look-ahead');
  }
});
test('sustained rightward world input reveals more route on the same physical trajectory', () => {
  const runs=[30,60,120].map(fps=>{
    const s=cameraFixture();cameraRun(s,2,fps);hold(s,.2);
    let noLead=s.camera.x;
    cameraRun(s,4,fps,()=>{
      // Reference: the pre-look-ahead position-only camera on these exact
      // physics samples. Do not compare a moving camera with a resting one.
      noLead+=(cameraMedian(s)-noLead)*(1-Math.exp(-3/fps));
    });
    assert.ok(cameraMedian(s,'vx')>18,'rightward speed must still be present at assertion time');
    assert.ok(s.cameraLead>20&&s.cameraLead<82,'moderate motion supplies a non-saturated lead');
    assert.ok(s.camera.x-noLead>20,'look-ahead adds visible route over the same-trajectory baseline');
    assert.ok(s.camera.x-noLead<s.cameraLead,'camera body follows the lead softly rather than snapping');
    assert.ok(Math.abs(s.cameraLead-(cameraMedian(s,'vx')-18)*.55)<1,'sustained motion approaches its speed-derived lead');
    return s;
  });
  for(const s of runs.slice(1)) {
    assert.ok(Math.abs(cameraMedian(s)-cameraMedian(runs[0]))<1e-6,'physical trajectory matches across frame rates');
    assert.ok(Math.abs(s.cameraLead-runs[0].cameraLead)<1,'look-ahead stays stable across frame rates');
    assert.ok(Math.abs(s.camera.x-runs[0].camera.x)<2,'render smoothing differences remain small');
  }
});
test('fast sustained movement reaches the lead cap without exceeding it', () => {
  for(const fps of [30,60,120]) {
    const s=cameraFixture();hold(s,.38);cameraRun(s,4,fps);
    assert.ok(cameraMedian(s,'vx')>18+82/.55,'fixture actually requests a capped lead');
    assert.ok(s.cameraLead>81,'camera approaches the existing cap');
  }
});
test('stopping and reversing sustained world input release the forward lead', () => {
  for(const fps of [30,60,120])for(const reverse of [false,true]) {
    const s=cameraFixture();hold(s,.2);cameraRun(s,4,fps);const movingLead=s.cameraLead;
    assert.ok(movingLead>20);
    if(reverse)hold(s,-.2);else J.release(s);
    cameraRun(s,4,fps);
    assert.ok(reverse?cameraMedian(s,'vx')<0:Math.abs(cameraMedian(s,'vx'))<.01,'assertion follows real reversal or stop');
    assert.ok(s.cameraLead<movingLead*.01,'lead decays after speed no longer requests it');
    if(!reverse)assert.ok(Math.abs(s.camera.x-cameraMedian(s))<.1,'quiet camera settles back on the party');
  }
});
test('one fast grain cannot steer camera look-ahead for the party', () => {
  for(const fps of [30,60,120]) {
    const s=cameraFixture();
    // Keep the fast outlier away from the other grains so collision cannot
    // turn this into a test of momentum transferred into the whole party.
    s.seeds[0].x=200;s.seeds[0].vx=260;
    cameraRun(s,.8,fps,()=>{
      assert.equal(cameraMedian(s,'vx'),0,'the other eight grains really stay still');
      assert.equal(s.cameraLead,0,'median speed ignores the one fast grain');
    });
    assert.ok(s.seeds[0].vx>18,'outlier stays fast throughout the observation');
  }
});
const FIRST_BOWL=Object.freeze({left:1110,bottom:1350,right:1545});
const maxSpeed=s=>Math.max(...J.party(s).map(p=>Math.hypot(p.vx,p.vy)));
const median=s=>J.party(s).map(p=>p.x).sort((a,b)=>a-b)[Math.floor(J.party(s).length/2)];
// Decision sampling is 30Hz at every render rate. Only world targets change;
// no seed position/velocity reset supplies the stopped-party acceptance route.
function prepare(source=D.create(),fps=60,transition=false) {
  const s=J.create(source,transition),objects=s.seeds.slice();let phase=0,wait=0,quiet=0;
  if(transition)advance(s,7,fps);
  const history=[];
  for(let i=0;i<80*fps;i++){
    if(i%(fps/30)===0){
      const lo=Math.min(...J.party(s).map(p=>p.x));
      if(phase===0&&lo>730){phase++;wait=i;}
      else if(phase===1&&i-wait>=8*fps)phase++;
      else if(phase===2&&lo>1210)phase++;
      else if(phase===3){quiet=maxSpeed(s)<8?quiet+1/30:0;if(quiet>=.5)return {s,history,objects,stopSpeed:maxSpeed(s)};}
      if(phase===0)hold(s,.28);else if(phase===2)hold(s,.22);else J.release(s);
    }
    J.update(s,1/fps);history.push({phase,x:s.seeds.map(p=>p.x),active:J.party(s).length});
    assert.equal(J.party(s).length,9,`preparation phase ${phase}, lost ${s.seeds.filter(p=>p.lost).map(p=>Math.round(p.x))}`);
    objects.forEach((p,i)=>assert.equal(s.seeds[i],p));
  }
  throw Error('party did not reach a neutral complete stop in the bowl');
}
function pump(s,fps=60,turnAt=1260,crossAt=1650){
  let reverse=false,minX=Infinity,peak=0,frames=0;
  for(let i=0;i<15*fps;i++){
    if(i%(fps/30)===0){if(median(s)<turnAt)reverse=true;hold(s,reverse?.38:-.38);}
    J.update(s,1/fps);frames++;
    minX=Math.min(minX,...J.party(s).map(p=>p.x));peak=Math.max(peak,maxSpeed(s));
    if((i+1)%(fps/30)===0&&(Math.min(...J.party(s).map(p=>p.x))>crossAt||J.party(s).length<9))break;
  }
  return {s,minX,peak,frames,reverse};
}
function flowToFarm(s,fps=60,profile='canonical'){
  const input=Route.create(profile);
  for(let i=0;i<120*fps;i++){
    if(i%(fps/30)===0){if(s.finished||s.seeds.every(p=>p.x>s.geometry.END.left+70))return;const p=input(s);hold(s,p.x,p.y);}
    J.update(s,1/fps);
    assert.equal(J.party(s).length,9,'the full extended route must retain all nine seeds');
  }
  throw Error('horizontal drag with timed upward gestures did not reach the extended farm');
}
function deliberate(source=D.create(),fps=60,transition=false){
  const prep=prepare(source,fps,transition),result=pump(prep.s,fps);const s=result.s;
  // Receive the first-bowl landing, then traverse the extended route to END.
  hold(s,-.18);advance(s,.6,fps);flowToFarm(s,fps,'pumped');
  J.release(s);advance(s,40,fps);
  return {...prep,...result,phase:s.finished?6:5};
}
test('all seven surface gaps have no floor, including outside the complete terrain', () => {
  assert.equal(J.segments.length,8);assert.equal(J.GAP.length,7);
  for(const gap of J.GAP)for(let x=gap.left+.1;x<gap.right;x+=.5){assert.equal(J.floor(x),null);assert.equal(J.field(x,500),null);}
  for(const x of [-1000,J.segments[0].left-1,J.segments.at(-1).right+1,20001])assert.equal(J.floor(x),null);
  for(const segment of J.segments)for(const p of segment.samples)assert.ok(Math.abs(J.floor(p.x).y-p.y)<1e-8);
  const draw=fs.readFileSync(path.join(__dirname,'stage-draw.js'),'utf8');assert.ok(draw.includes('g.segments'));
  assert.ok(!draw.includes('for(const p of J.terrain)'),'drawing must not bridge separate platforms');
});
test('slow seed falls naturally through a gap without snapping onto a platform underside', () => {
  const s=J.create(D.create()),p=s.seeds[0];
  Object.assign(p,{x:478,y:327,vx:0,vy:0});advance(s,.4);
  assert.ok(p.y>340);assert.ok(p.vy>40);assert.ok(!p.lost);
  advance(s,3);assert.ok(p.lost&&p.inactive);assert.equal(s.seeds.length,9);
  assert.equal(s.seeds[0],p);
  // A below-lip grain approaching the far wall must remain below the top.
  const q=s.seeds[1];Object.assign(q,{x:490,y:400,vx:100,vy:0});advance(s,.25);
  assert.ok(q.y>400);assert.ok(q.x<503,'visible cut side must prevent entry below the platform');
});
test('lost grains retain identity, stop colliding/knocking and leave camera bounds', () => {
  const s=J.create(D.create()),p=s.seeds[0];Object.assign(p,{x:478,y:599,vx:0,vy:80});advance(s,.05);
  assert.ok(p.lost&&!p.inactive);const vx=p.vx,vy=p.vy;J.knock(s,p.x,p.y);
  assert.equal(p.vx,vx);assert.equal(p.vy,vy);
  const active=J.party(s);assert.equal(active.length,8);
  Object.assign(p,{x:-5000,y:5000,inactive:true});advance(s,5);
  assert.ok(s.camera.x>50&&s.camera.y<350);assert.ok(s.camera.z>1.5);
  assert.equal(s.seeds[0],p);assert.equal(s.seeds.length,9);
  // Coincident inactive object cannot push or exchange momentum with a survivor.
  const a=active[0];Object.assign(p,{x:a.x,y:a.y,vx:999,vy:999});const clone={...structuredClone({...s,geometry:undefined}),geometry:s.geometry};
  Object.assign(clone.seeds[0],{x:-5000,y:5000});J.update(s,1/60);J.update(clone,1/60);
  for(let i=1;i<9;i++)assert.equal(s.seeds[i].vx,clone.seeds[i].vx);
});
test('a distant ground straggler stays alive, affects framing and is recoverable', () => {
  const s=J.create(D.create()),p=s.seeds[0];
  s.seeds.forEach((p,i)=>Object.assign(p,{x:i?810+i*17:80,y:i?J.floor(810+i*17).y-11:339,vx:0,vy:0}));
  advance(s,5);assert.ok(!p.lost);assert.equal(J.party(s).length,9);assert.ok(s.camera.z<1.2);
  const x=p.x;hold(s,.28,-.15);advance(s,2);assert.ok(p.x>x+100);assert.ok(!p.lost);
});
function endFixture(count) {
  const s=J.create(D.create());s.seeds.forEach((p,i)=>{
    if(i>=count){Object.assign(p,{lost:true,inactive:true,x:478,y:s.geometry.bounds.lostY+401,vx:0,vy:0});return;}
    const x=s.geometry.END.left+50+i*14,f=s.geometry.floor(x);
    Object.assign(p,{x,y:f.y-J.support(p,f.nx,f.ny)/-f.ny-.1,vx:0,vy:0});
  });return s;
}
test('1, 3, 6, 8 and 9 arriving seeds root safely while lost grains never block END', () => {
  for(const count of [1,3,6,8,9]){
    const s=endFixture(count);advance(s,25);assert.ok(s.finished,`survivors ${count}`);assert.equal(J.party(s).length,count);
    const before=J.party(s).map(p=>p.x),a=J.party(s)[0];J.knock(s,a.x-40,a.y-20);advance(s,.2);
    assert.deepEqual(J.party(s).map(p=>p.x),before,'rooted seeds never relaunch');assert.equal(J.travelling(s).length,0);
  }
});
test('all lost returns quietly to a waiting title without fabricating fruit or a replay button', () => {
  const s=endFixture(0);s.titleCycle=true;advance(s,5);assert.ok(s.ending.titleReady);assert.equal(s.ending.focus,null);assert.equal(J.plants(s).length,0);assert.equal(J.titleMix(s),1);
  const h=sceneHarness('?dev=1&stage=1',{...J,create:()=>endFixture(0)});h.setup();
  for(let i=0;i<5*60;i++)h.scene.update(1/60);
  assert.equal(h.probe().mode,'prologue');assert.equal(h.probe().seedCount,9);assert.equal(h.probe().loose,3);
  assert.equal(h.probe().lost,0);assert.equal(h.probe().active,9);assert.ok(!h.probe().finished);assert.equal(h.elements.has('again'),false);
  for(let i=0;i<30*60;i++)h.scene.update(1/60);
  assert.equal(h.probe().mode,'prologue','idle title never starts another journey');
});
test('small gap is normally traversable; reunion gathers the same nine before round play', () => {
  const {s,history}=deliberate();assert.ok(history.some(f=>f.phase===2&&Math.min(...f.x)>503));
  assert.ok(history.filter(f=>f.phase<=3).every(f=>f.active===9));assert.equal(s.seeds.length,9);
});
test('stopped local-bowl pumping, catch and gentle release carry nine to quiet END', () => {
  const {s,phase}=deliberate();assert.equal(phase,6);assert.equal(J.party(s).length,9);assert.ok(s.finished);
  assert.ok(s.seeds.every(p=>p.x>J.END.left&&p.x<J.END.right));
});
test('a physically detached Stage 0 party keeps all nine through zoom, first gap and reunion', () => {
  const source=attachedSource(),objects=source.seeds.slice(),s=J.create(source,true);
  advance(s,7);hold(s,.28);assert.ok(allAt(s,730,12));J.release(s);advance(s,8);
  assert.ok(s.transition.settled);assert.ok(s.seeds.every(p=>p.x>J.GAP[0].right));
  assert.equal(J.party(s).length,9);objects.forEach((p,i)=>assert.equal(s.seeds[i],p));
  // Complete actual title-to-nine-root coverage lives in test-audio.cjs, through
  // the real scene/keyboard/pointer handlers rather than this rotating source fixture.
});
test('continuing right with timed upward gestures crosses every gap; pumping is an additional route', () => {
  const s=J.create(D.create());flowToFarm(s);
  assert.equal(J.party(s).length,9);assert.ok(s.seeds.every(p=>p.x>J.END.left));
  J.release(s);advance(s,40);assert.ok(s.finished);
});
test('30/60/120fps preserve stopped-party pumping, identity and nine-grain finish', () => {
  const results=[30,60,120].map(fps=>{const r=deliberate(D.create(),fps);assert.ok(r.s.finished);assert.equal(J.party(r.s).length,9);assert.ok(r.minX>FIRST_BOWL.left);return r.s;});
  for(const s of results.slice(1))for(let i=0;i<9;i++){
    assert.equal(s.seeds[i].lost,results[0].seeds[i].lost);
    for(const key of ['x','y','vx','vy','angle'])assert.ok(Math.abs(s.seeds[i][key]-results[0].seeds[i][key])<1e-6,`${key}: physical fps mismatch`);
  }
});
test('Stage 1 world response declares intent earlier, stays continuous and keeps a release tail', () => {
  const a=D.create(),s=J.create(D.create());a.held=true;a.targetX=.3;hold(s,.3);
  D.update(a,1/120);J.update(s,1/120);assert.ok(s.x>0&&s.x<.01,'spring must not snap to target');
  for(let i=0;i<11;i++){D.update(a,1/120);J.update(s,1/120);}
  assert.ok(s.x>a.x*1.8,`response ${s.x} vs Stage 0 ${a.x}`);
  advance(s,.4);J.release(s);const before=s.seeds.map(p=>p.x);advance(s,.2);
  assert.ok(s.seeds.some((p,i)=>Math.abs(p.x-before[i])>1));
});
test('complete neutral stop near the gap regenerates momentum from left/right tilt only', () => {
  const r=prepare(),s=r.s;assert.ok(r.stopSpeed<8);assert.ok(Math.abs(s.x)+Math.abs(s.y)<.001);
  assert.ok(s.seeds.every(p=>p.x>FIRST_BOWL.left&&p.x<FIRST_BOWL.right));
  const initial=s.seeds.map(p=>({...p})),result=pump(s);
  assert.ok(result.reverse);assert.ok(result.minX>FIRST_BOWL.left,'every seed must stay within the local bowl until launch');
  assert.ok(result.peak>300&&result.peak>r.stopSpeed*30);assert.equal(J.party(s).length,9);
  assert.ok(s.seeds.every(p=>p.x>J.GAP[1].right));
  assert.equal(s.targetY,0);assert.equal(s.seeds.length,9);r.objects.forEach((p,i)=>assert.equal(s.seeds[i],p));
  assert.ok(initial.every(p=>Math.hypot(p.vx,p.vy)<8),'no carried launch speed');
});
test('same high-speed landing: short opposite tilt reduces maximum survivor speed', () => {
  const r=prepare();pump(r.s);const clone=()=>({...structuredClone({...r.s,geometry:undefined}),geometry:r.s.geometry});const a=clone(),b=clone();
  assert.equal(J.party(a).length,9);assert.ok(maxSpeed(a)>200);
  hold(a,.38);hold(b,-.18);advance(a,.6);advance(b,.6);
  assert.equal(J.party(b).length,9);assert.ok(maxSpeed(b)<maxSpeed(a)*.75,`catch ${maxSpeed(b)} vs flow ${maxSpeed(a)}`);
  assert.ok(Math.max(...b.seeds.map(p=>p.x))<Math.max(...a.seeds.map(p=>p.x)));
});
test('quiet bowl has no automatic pump or launch without world input', () => {
  const {s}=prepare();const before=median(s);advance(s,12);
  assert.equal(J.party(s).length,9);assert.ok(maxSpeed(s)<15);assert.ok(Math.abs(median(s)-before)<25);
  assert.ok(s.seeds.every(p=>p.x<FIRST_BOWL.right));
});
test('a weak unsuccessful approach leaves ground survivors free to return and retry locally', () => {
  const {s}=prepare();hold(s,.12);advance(s,5);assert.equal(J.party(s).length,9);
  assert.ok(s.seeds.every(p=>p.x<FIRST_BOWL.right),'not enough energy to leave the launch curve');
  J.release(s);advance(s,25);const objects=s.seeds.slice();
  const result=pump(s);assert.ok(result.minX>FIRST_BOWL.left);assert.ok(s.seeds.some(p=>!p.lost&&p.x>J.GAP[1].right));
  objects.forEach((p,i)=>assert.equal(s.seeds[i],p));
});
test('maximum right and premature bowl reversal expose physical risk', () => {
  const flow=J.create(D.create());hold(flow,.38);advance(flow,20);
  assert.ok(flow.seeds.some(p=>p.lost),'maximum right should expose the large-gap risk');
  const {s}=prepare();pump(s,60,1290);advance(s,2);
  assert.ok(s.seeds.some(p=>p.lost),'reversing before a sufficient left excursion can lose grains');
  assert.equal(s.seeds.length,9);
});
test('long alternating world inputs retain every object with finite bounded state', () => {
  const s=J.create(D.create()),objects=s.seeds.slice();hold(s,0);
  for(let i=0;i<120*60;i++){
    J.drag(s,Math.sin(i*.013)*.38,Math.cos(i*.011)*.38);J.update(s,1/60);
    for(const [k,p]of s.seeds.entries()){
      assert.equal(p,objects[k]);for(const key of ['x','y','vx','vy','angle','roll'])assert.ok(Number.isFinite(p[key]));
      assert.ok(p.x>s.geometry.bounds.left-60&&p.x<s.geometry.bounds.right+130&&p.y>-300&&p.y<s.geometry.bounds.lostY+500);assert.ok(!p.inactive||p.lost);
    }
    assert.ok(Number.isFinite(s.camera.x+s.camera.y+s.camera.z));
  }
});
console.log(`${passed} horizontal journey checks passed.`);
