'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const D=require('./dynamics.js'),J=require('./journey.js'),G=require('./stage-geometry.js'),data=require('./stage-data.js'),M=require('./builder/model.js');
const old=require('./fixtures/canonical-baseline.json').stageData;
const lo=s=>Math.min(...s.seeds.map(p=>p.x)),speed=s=>Math.max(...s.seeds.map(p=>Math.hypot(p.vx,p.vy)));
const Route=require('./fixtures/momentum-route.cjs');
const steer=(s,input)=>{const p=input(s);s.held=true;J.drag(s,p.x,p.y);};
const advance=(s,seconds,fps=60)=>{for(let i=0;i<Math.round(seconds*fps);i++)J.update(s,1/fps);};
const protectedHashes={
  "journey.js": "5cf59776e32fc19eebbda11a0d31b9a73aa68cc741d6c9be6e246a43e671ad6e",
  "dynamics.js": "f79c3e6de210753d3aae78f0fed5b7ad0645379a35f670ba4bd86e0e55454d20",
  "stage-geometry.js": "a80ad32ebbc49c5051bfa46687d276eb29a0938dfc117a7a85dc01c4c1346eca",
  "stage-draw.js": "f1eb10c346647c8efb25eb25080665155cec903815a8d0caf578a469a8f61b08",
  "sketch.js": "7f83c4f90ca9cb6a656b833c01552ba11fcf748667457722b0bdc7ce225cc065",
  "codea-lite.js": "9854b84f6c0a095b1199517fb5751cf084d0b9dd42619f34adb971770a4be618",
  "work-config.js": "30cf1fbf052c487d845ec760ce1a48a454505f7f85b7488ab090a3dd0724845d",
  "index.html": "34216437a4af9867e389ff9e05eff978885f4c8c22c60d1731c04a08af85c189",
  "style.css": "a296759b92c76d684ec9cfad4b3ccb8cf9ef479651d1dd6c8b1c132df79bde35",
  "builder/model.js": "b7bc8e4dec5eed9f2e059e93bee7cf2f0b328dbf963974a7f91a980896d8449f",
  "builder/builder.js": "99782e6cd9010a8ae9bf2ea9ca0a2fe12cdcbfa0da597615db072c2091cfe84e",
  "builder/index.html": "924e94b48fa02bbc4fff1cae74cca4a13091cc8ee05be1eb2004f1995974e6b3",
  "builder/builder.css": "fc33e6ea7f3733e19eb741cfdbb8a4eb9436e6cf2990655dd8d2c289352c491e",
  "assets/pumpoko-logo.svg": "f64f99543ea20aeaedb54a10ba8d61c683379d1837f766c713d0998609150565",
  "audio/fiber.wav": "82f1c116fad8d749ca0270dde7eff49fd7621e69ae07bbed36dbc32cafefcea2",
  "audio/pumpoko-bgm.mp3": "a8f9f83c00f170a4fee85c117f9dbe6c2bf1ba31f62baf68e46917ad012bbf60",
  "audio/rim.wav": "c0d0ef05cc49ac8cc1c123fc1de385497c4964aa417f8ca05b63efa91000ce1e",
  "audio/seed.wav": "0400d1821e04d9aca128ab8052bb9b35ac2593898b1a1c291f314adfcef7fe36",
  "audio/shell.wav": "fa1986405c832d1708aa1ce89fd70b1ec99ddb258eb2abd1c29f7fc602a14e36",
  "audio/slide.wav": "00eae6e30ab28740b9cb92973f43bf8c9d76cfa883d59c5e0ce97fa899e9ed8c"
};
test('five-times travel is measured in world pixels; terrain scale, quiet space and nursery remain local',()=>{
  const distance=d=>(d.end.left+d.end.right)/2-d.start.x;
  assert.equal(distance(old),1730);assert.equal(distance(data),8650);assert.equal(distance(data)/distance(old),5);
  assert.deepEqual(data.start,old.start);assert.equal(data.end.right-data.end.left,old.end.right-old.end.left);
  assert.equal(G.validate(data).length,0);assert.equal(data.features.length,0);
  assert.equal(J.GAP.length,7);for(const g of J.GAP)assert.ok(g.right-g.left>=48&&g.right-g.left<=95,'crossings keep the accepted local scale');
  for(const p of J.terrain)assert.ok(p.y>=320&&p.y<=500,'no deep loss-boundary change or enlarged scenery');
  assert.equal(J.geometry.bounds.lostY,600);
  // The nursery and its receiving profile are the accepted contour translated,
  // with no change to slope, local size, arrival rules or growth data.
  const nursery=data.surfaces.at(-1).points;
  assert.deepEqual(nursery.map(({x,y,tangent})=>({x:x-6920,y,tangent})),old.surfaces.at(-1).points.map(({x,y,tangent})=>({x,y,tangent})));
});
test('accepted opening, small crossing, reunion and first halfpipe remain exact',()=>{
  const g=G.compile(old);assert.deepEqual(data.surfaces.slice(0,2),old.surfaces.slice(0,2));
  for(let x=-50;x<1775;x+=.125)assert.deepEqual(J.floor(x),g.floor(x));
  assert.equal(J.floor(1775).y,g.floor(1775).y);
  assert.deepEqual(J.GAP.slice(0,2),g.GAP);
});
// Momentum gesture, offscreen return and reviewed poyon visual hashes are reviewed with their behavior tests.
// All unrelated files retain their pre-change byte locks.
test('physics, control, camera, arrival, growth, title, audio and Engine-facing files keep their accepted bytes',()=>{
  for(const [rel,expected] of Object.entries(protectedHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,rel))).digest('hex'),expected,rel);
});
function flow(fps=60,{stop=false,observe=()=>{}}={}){
  const s=J.create(D.create()),objects=s.seeds.slice(),input=Route.create();
  if(stop){
    for(let i=0;i<40*fps&&lo(s)<=4300;i++){if(i%(fps/30)===0)steer(s,input);J.update(s,1/fps);assert.equal(J.party(s).length,9);}
    assert.ok(lo(s)>4300);J.release(s);advance(s,45,fps);
    assert.equal(J.party(s).length,9);assert.ok(speed(s)<8,'all nine genuinely settle, with no injected launch velocity');
    assert.ok(Math.abs(s.x)+Math.abs(s.y)<.001);
  }
  let released=false,releaseAt=0;
  for(let i=0;i<120*fps&&!s.result;i++){
    // Decide at one common input frequency, independent of render FPS.
    if(i%(fps/30)===0&&!released){if(lo(s)>J.END.left+70){J.release(s);released=true;releaseAt=s.time;}else steer(s,input);}
    J.update(s,1/fps);assert.equal(J.party(s).length,9);objects.forEach((p,k)=>assert.equal(s.seeds[k],p));observe(s);
  }
  assert.ok(released&&s.finished);assert.equal(s.arrivals.length,9);assert.equal(J.travelling(s).length,0);
  for(const a of s.arrivals){assert.equal(a.seed,objects[a.id]);assert.equal(a.rootY,J.floor(a.x).y);assert.ok(a.x>=J.END.left&&a.x<=J.END.right);}
  return {s,objects,releaseAt};
}
const runs=new Map();const run=fps=>{if(!runs.has(fps))runs.set(fps,flow(fps));return runs.get(fps);};
test('input-only complete journey keeps all nine and matching physical arrivals at 30/60/120fps',()=>{
  const a=run(30);for(const fps of [60,120]){const b=run(fps);assert.ok(Math.abs(a.releaseAt-b.releaseAt)<1e-7);
    for(let i=0;i<9;i++)for(const key of ['x','y','vx','vy','angle','spin'])assert.ok(Math.abs(a.s.seeds[i][key]-b.s.seeds[i][key])<1e-6,`${fps}fps ${key}`);
  }
  // This is a distance requirement. Input-dependent completion time is measured
  // separately and is intentionally not asserted to be five times old playtime.
  assert.ok(a.releaseAt>35&&a.releaseAt<55,'timed momentum gestures reach the unchanged 5x world in the measured input window');
});
test('every grain physically flies through each visible gap and receives real top contact afterward',()=>{
  const entered=J.GAP.map(()=>new Set()),landed=J.GAP.map(()=>new Set());
  flow(60,{observe:s=>{for(const p of s.seeds)for(const[k,g]of J.GAP.entries()){
    if(p.x>g.left&&p.x<g.right){assert.equal(s.geometry.floor(p.x),null);entered[k].add(p.runId);}
    if(entered[k].has(p.runId)&&p.x>g.right&&J.jump.contact(s,p).landing)landed[k].add(p.runId);
  }}});
  assert.deepEqual(entered.map(s=>s.size),J.GAP.map(()=>9));assert.deepEqual(landed.map(s=>s.size),J.GAP.map(()=>9));
});
test('middle-course neutral stop recovers by horizontal drag and fresh upward gestures and finishes nine of nine',()=>{
  const {s}=flow(60,{stop:true});assert.equal(s.arrivals.length,9);assert.ok(s.time>80,'includes real neutral settling time');
});
test('two later local halfpipes preserve gravity-only rest and horizontal-tilt pumping',()=>{
  for(const b of [{bottom:3805,left:3510,right:4015,catch:4100},{bottom:6890,left:6600,right:7100,catch:7190}]){
    const m=M.create();M.moveStart(m,b.bottom);assert.ok(M.play(m));const s=m.run,objects=s.seeds.slice();
    assert.ok(s.seeds.every(p=>p.vx===0&&p.vy===0));advance(s,10);
    assert.equal(J.party(s).length,9);assert.ok(speed(s)<8);assert.ok(s.seeds.every(p=>p.x>b.left&&p.x<b.right));
    const before=s.seeds.map(p=>({...p}));let reverse=false,minX=Infinity,peak=0;
    for(let i=0;i<20*60;i++){
      const median=s.seeds.map(p=>p.x).sort((a,b)=>a-b)[4];if(median<b.bottom-90)reverse=true;
      s.held=true;J.drag(s,reverse?.38:-.38,0);J.update(s,1/60);
      assert.equal(J.party(s).length,9);minX=Math.min(minX,...s.seeds.map(p=>p.x));peak=Math.max(peak,speed(s));
      if(s.seeds.every(p=>p.x>b.catch+10))break;
    }
    assert.ok(before.every(p=>Math.hypot(p.vx,p.vy)<8));assert.ok(reverse&&peak>250);assert.ok(minX>b.left,'pump stays in its local approach');
    assert.ok(s.seeds.every(p=>p.x>b.catch));objects.forEach((p,i)=>assert.equal(s.seeds[i],p));
  }
});
test('long-world camera stays finite, bounded and follows visible real grains across all extended terrain',()=>{
  let furthest=0,frames=0,last;
  flow(60,{observe:s=>{
    if(s.result)return;frames++;furthest=Math.max(furthest,s.camera.x);
    assert.ok(Number.isFinite(s.camera.x+s.camera.y+s.camera.z));assert.ok(s.cameraLead>=0&&s.cameraLead<=82);
    const visible=J.travelling(s).filter(p=>{const q=J.screenPoint(s,p.x,p.y);return q.x>=0&&q.x<=390&&q.y>=0&&q.y<=740;});assert.ok(visible.length>=1,'median anchor never follows an empty world span');
    if(last&&!s.arrivals.length)assert.ok(Math.hypot(s.camera.x-last.x,s.camera.y-last.y)<8,'continuous travel camera before rooting');last={...s.camera};
  }});
  assert.ok(frames>2100&&furthest>J.END.left);
});
test('the same final nine roots grow, retain HeroPumpkin and reconnect at the exact title scale',()=>{
  const {s}=run(60);s.titleCycle=true;const result=s.result;advance(s,13);
  assert.equal(s.result,result);assert.equal(J.plants(s).length,9);assert.equal(s.ending.focus,J.heroPumpkin(s));assert.equal(J.titleMix(s),1);
  const p=J.plantPose(s,s.ending.focus);assert.ok(Math.abs(s.camera.z*20*p.size-143)<1e-8);assert.ok(s.ending.titleReady);
});
