'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('./builder/model.js'),J=require('./journey.js'),G=require('./stage-geometry.js'),data=require('./stage-data.js');

// Execute the shipped Builder event handlers with real model and Journey physics.
// Only the DOM and canvas rendering are stubbed; controls are never called directly.
function harness(stage=data){
  const ids=new Map(),handlers=new Map(),frames=[];let model,time=1000;
  const context=new Proxy({}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
  const el=id=>{if(!ids.has(id))ids.set(id,{id,hidden:false,value:'',textContent:'',files:[],classList:{toggle(){}},setAttribute(){},addEventListener(n,f){this[n]=f;},click(){this.onclick?.();},getBoundingClientRect:()=>({left:0,top:0,width:1080,height:650}),getContext:()=>context,setPointerCapture(){},focus(){}});return ids.get(id);};
  const c={console,PumpkinBuilderModel:{...M,create:()=>(model=M.create(stage))},PumpkinJourney:J,PumpkinStageGeometry:G,PumpkinStageData:data,
    PumpkinStageDraw:{drawTerrain(){},drawLoops(){},drawFarm(){},drawSeeds(){},drawPlants(){}},devicePixelRatio:1,requestAnimationFrame:f=>frames.push(f),ResizeObserver:class{observe(){}},
    document:{hidden:false,getElementById:el,querySelectorAll:()=>[],body:{classList:{toggle(){}}},addEventListener(n,f){handlers.set(n,f);}},addEventListener(n,f){handlers.set(n,f);}};c.window=c;
  vm.runInNewContext(fs.readFileSync(__dirname+'/builder/builder.js','utf8'),c);
  el('play').click();
  const tick=(dt=1/120)=>{time+=dt*1000;frames.shift()(time);};tick(0);
  return {model,el,handlers,document:c.document,tick,
    key:(type,key)=>handlers.get(type)({key,target:{tagName:'CANVAS'},repeat:false,preventDefault(){}}),
    pointer:(type,x=300,y=300,id=1)=>el('stage-canvas')[type]({type,clientX:x,clientY:y,pointerId:id}),
    drag:(x,y,id=1)=>el('stage-canvas').pointermove({type:'pointermove',clientX:300+x*210,clientY:300+y*210,pointerId:id})};
}
function single(h,speed=240){
  const s=h.model.run,p=s.seeds[0];for(const q of s.seeds)if(q!==p)q.lost=q.inactive=true;
  const x=900,f=s.geometry.floor(x);Object.assign(p,{x,y:f.y-J.support(p,f.nx,f.ny)/-f.ny,vx:speed*-f.ny,vy:speed*f.nx});return p;
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('Builder pointer drag preserves horizontal power and uses one momentum assist per flight',()=>{
  const h=harness(),s=h.model.run,p=single(h);h.pointer('pointerdown');h.drag(.38,0);h.tick();
  const before=p.vy;h.drag(.38,-.2);assert.equal(p.assist.count,1);assert.ok(p.vy<before);close(s.targetX,.38);
  h.drag(.60,-.2);assert.equal(s.gestureAssist.armed,true,'pure sideways motion rearms the gesture');
  h.drag(.60,-.4);assert.equal(p.assist.count,1,'rearmed air gestures cannot repeat lift');close(s.targetX,.38);
  assert.equal(s.held,true,'finger stays down throughout');
});
test('Builder resting and held-up gestures never turn into delayed launch',()=>{
  const h=harness(),p=single(h,0);h.pointer('pointerdown');h.drag(.38,-.2);
  for(let i=0;i<120;i++)h.tick();assert.equal(p.assist.count,0);assert.ok(p.vx>55);
  h.drag(.6,-.2);h.drag(.6,-.4);assert.equal(p.assist.count,1);
});
test('Builder keyboard reaches the same gesture path and cannot repeat in air',()=>{
  const h=harness(),s=h.model.run,p=single(h);h.key('keydown','ArrowRight');h.tick();
  h.key('keydown','ArrowUp');h.tick();assert.equal(p.assist.count,1);close(s.targetX,.38);
  for(let i=0;i<5;i++)h.tick();assert.equal(p.assist.count,1);
  h.key('keyup','ArrowUp');h.tick();h.key('keydown','ArrowUp');h.tick();assert.equal(p.assist.count,1);
  h.key('keyup','ArrowUp');h.key('keyup','ArrowRight');h.tick();assert.equal(s.held,false);close(s.targetX,0);close(s.targetY,0);
});
test('Builder cancellation, capture loss, blur and hiding release the input without a tap impulse',()=>{
  for(const end of ['pointercancel','lostpointercapture','blur','visibilitychange']){
    const h=harness(),s=h.model.run,p=single(h);h.pointer('pointerdown');h.drag(.38,0);h.tick();h.drag(.38,-.2);
    const before={vx:p.vx,vy:p.vy,ringV:s.ringV};
    if(end==='visibilitychange'){h.document.hidden=true;h.handlers.get(end)();}
    else if(end==='blur')h.handlers.get(end)();else h.pointer(end);
    assert.equal(s.held,false,end);close(s.targetX,0);close(s.targetY,0);assert.equal(s.gestureAssist.armed,true);
    assert.deepEqual({vx:p.vx,vy:p.vy,ringV:s.ringV},before,'cancellation never knocks');
  }
});
test('Builder reset discards run-local assist state and preserves the draft',()=>{
  const h=harness(),s=h.model.run,p=single(h),draft=M.exportJSON(h.model);h.pointer('pointerdown');h.drag(.38,0);h.tick();h.drag(.38,-.2);assert.equal(p.assist.count,1);
  h.el('reset').click();const next=h.model.run;assert.notEqual(next,s);assert.equal(next.held,false);assert.equal(next.gestureAssist.armed,true);assert.ok(next.seeds.every(q=>q.assist.count===0&&!q.assist.used));assert.equal(M.exportJSON(h.model),draft);
});
test('Builder foreign pointer cannot reanchor, steer or end the accepted drag',()=>{
  for(const end of ['pointerup','pointercancel','lostpointercapture']){
    const h=harness(),s=h.model.run;single(h);h.pointer('pointerdown');h.drag(.2,0);h.tick();
    h.pointer('pointerdown',20,20,99);h.drag(-.3,-.3,99);close(s.targetX,.2);close(s.targetY,0);
    h.pointer(end,20,20,99);assert.equal(s.held,true,`${end} from a foreign pointer must be ignored`);
    h.drag(.38,0);close(s.targetX,.38);h.pointer('pointerup',379.8,300);assert.equal(s.held,false);
  }
});

test('Builder Loop assist samples its actual supporting tangent, not the distant floor',()=>{
  const stage={version:1,start:{x:0,y:300},end:{left:600,right:750},materials:[],surfaces:[{id:'ground',material:'polished',points:[{id:'p0',x:-300,y:400},{id:'p1',x:140,y:400},{id:'p2',x:180,y:417.6},{id:'p3',x:800,y:417.6}]}],features:[{id:'loop',type:'loop',x:200,y:368,radius:32,entry:{x:142.4,y:400},exit:{x:257.6,y:417.6},material:'polished'}]};
  const h=harness(stage),s=h.model.run,p=s.seeds[0];for(const q of s.seeds)if(q!==p)q.lost=q.inactive=true;
  const angle=Math.PI/4,nx=-Math.cos(angle),ny=-Math.sin(angle);Object.assign(p,{angle:0,spin:0});
  const radius=32-J.support(p,nx,ny);Object.assign(p,{x:200+Math.cos(angle)*radius,y:368+Math.sin(angle)*radius,vx:160*-ny,vy:160*nx});
  h.pointer('pointerdown');h.drag(.38,0);h.tick();
  const hit=s.geometry.featureContacts(p,J.support).find(q=>Math.abs(q.penetration)<=J.jump.TUNE.contactSlop&&q.ny<-.5);assert.ok(hit);
  const actual=p.vx*-hit.ny+p.vy*hit.nx,wrong=p.vx*-s.geometry.floor(p.x).ny+p.vy*s.geometry.floor(p.x).nx;
  close(p.assist.speed,actual);assert.ok(Math.abs(actual-wrong)>30,'fixture distinguishes the Loop tangent from the floor');
  const before=p.vy;h.drag(.38,-.2);assert.equal(p.assist.count,1);
  close(before-p.vy,J.ASSIST.maxLift*J.smooth((actual-J.ASSIST.minSpeed)/(J.ASSIST.fullSpeed-J.ASSIST.minSpeed)));
});
