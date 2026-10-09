'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const P=require('../physics.js'),W=require('../world.js'),C=require('../courses.js'),T=require('../measurements.js'),{harness}=require('./harness.cjs');
const base='5e619fc11396b44c694ca526d7e240dcb7a05df0';
const before=file=>execFileSync('git',['show',`${base}:works/pumpkin-rutabaga-lab/${file}`],{encoding:'utf8'});
const plain=v=>JSON.parse(JSON.stringify(v));
const input=(s,i)=>s.active==='rutabaga'&&i%40===0?0:1;
function drive(s,seconds=25){for(let i=0;i<seconds*60&&!s.finished;i++){P.input(s,input(s,i));W.update(s,1/60);}assert.ok(s.finished,'input reaches finish');return s;}
function prime(index,speed,offset=0,cap=520){
  const s=W.createCourse(C.get('world4'));s.settings.handoff.cap=cap;
  for(let j=0;j<index;j++){const h=s.holes[j];h.state='complete';h.swaps=1;h.occupant=s.entities[j];Object.assign(h.occupant,{x:h.x,y:h.y,plugged:true});}
  const h=s.holes[index],b=s.entities[index];s.active=b.kind;s[b.kind]=b;s.phase=h.entryLayer;s.handoffs=index;
  Object.assign(b,{layer:h.entryLayer,plugged:false,grounded:false,x:h.x+offset,y:h.y-h.direction*Math.sqrt((b.r+h.occupant.r-1)**2-offset**2),vx:0,vy:h.direction*speed});
  s.camera={x:b.x,y:b.y+70,vx:0,vy:0};return s;
}
function relevant(s){const b=s[s.active];return {phase:s.phase,active:s.active,handoffs:s.handoffs,body:Object.fromEntries(['x','y','vx','vy','angle','pulse','grounded','layer'].map(k=>[k,b[k]])),camera:s.camera,axis:s.axis};}

test('adopted WORLD LOOP exactly matches immutable main under diverse input, frame rates and tuning',()=>{
  assert.equal(fs.readFileSync(require.resolve('../physics.js'),'utf8'),before('physics.js'),'fruit physics is byte-identical');
  const context=vm.createContext({module:{exports:{}},require:()=>P});vm.runInContext(before('world.js'),context);const old=context.module.exports;
  for(const fps of [30,60,120])for(const extreme of [null,2,3]){
    const settings=P.defaults();settings.world=Object.fromEntries(Object.entries(W.PARAMETERS).map(([k,d])=>[k,d[1]]));
    if(extreme)for(const [group,defs]of Object.entries({...P.PARAMETERS,world:W.PARAMETERS}))for(const [key,d]of Object.entries(defs))settings[group][key]=d[extreme];
    const a=W.create(plain(settings)),b=old.create(plain(settings));
    for(let i=0;i<fps*20;i++){const axis=Math.floor(i/fps)%4===0?0:Math.floor(i/(fps*.7))%2?1:-1;P.input(a,axis);P.input(b,axis);W.update(a,1/fps);old.update(b,1/fps);assert.deepEqual(P.snapshot(a),plain(P.snapshot(b)));}
  }
});
test('two and four share immutable first-cycle data and identical trajectories up to the short finish',()=>{
  const two=C.get('world2'),four=C.get('world4');assert.ok(Object.isFrozen(four.curves.return[0]));
  assert.deepEqual(two.holes,four.holes.slice(0,2));assert.deepEqual(two.curves.surface,four.curves.surface);assert.deepEqual(two.curves.underground,four.curves.underground);assert.deepEqual(two.curves.return,four.curves.return.slice(0,two.curves.return.length));
  const a=W.create(),b=W.createCourse(two),c=W.createCourse(four);
  for(let i=0;i<600&&!b.finished;i++)for(const s of [a,b,c]){P.input(s,input(s,i));W.update(s,1/60);if(s===c){assert.deepEqual(relevant(a),relevant(b));assert.deepEqual(relevant(b),relevant(c));}}
  assert.equal(b.handoffs,2);assert.ok(b.finished);assert.equal(c.finished,false);
});
for(const id of ['world2','world4'])test(`${id} completes every input-driven exchange, preserves planted bodies and does not force a stop`,()=>{
  const s=W.createCourse(C.get(id));let count=0,maxStep=0,old={...s.camera},releaseAt=-10,objects=[],crestFlight=false;
  for(let i=0;i<60*25&&!s.finished;i++){
    P.input(s,input(s,i));W.update(s,1/60);const b=s[s.active];
    maxStep=Math.max(maxStep,Math.hypot(s.camera.x-old.x,s.camera.y-old.y));old={...s.camera};
    assert.ok([b.x,b.y,b.vx,b.vy,s.camera.x,s.camera.y].every(Number.isFinite));
    assert.ok(Math.abs(b.x-s.camera.x)<270&&Math.abs(b.y-s.camera.y)<300,'active fruit remains in logical viewport');
    const mouth=s.holes.some(h=>h.state==='compressing'&&h.incoming===b)||b.exiting;
    if(!mouth)assert.ok(W.contact(b,s.course).distance>=b.r-.05,'floor normal is outside');
    if(s.handoffs>count){assert.equal(s.handoffs,count+1);count++;releaseAt=s.time;objects=[b,s.holes[count-1].occupant];assert.equal(s.target,1);}
    if(s.time-releaseAt<=.18)for(const fruit of objects)assert.ok(Math.abs(fruit.x-s.camera.x)<440&&Math.abs(fruit.y-s.camera.y)<280,'both fruit visible during seating');
    for(const h of s.holes)if(h.state==='complete'){assert.equal(h.swaps,1);assert.equal(h.occupant.x,h.x);assert.equal(h.occupant.y,h.y);assert.equal(h.occupant.plugged,true);}
    if(b.layer==='return'&&b.x>1750&&!b.grounded&&!b.exiting)crestFlight=true;
  }
  assert.ok(s.finished);assert.equal(s.handoffs,s.holes.length);assert.equal(s.active,'pumpkin');assert.ok(maxStep<15,'camera continuous');
  assert.equal(s.entities.filter(b=>b.plugged).length,s.holes.length);assert.equal(s.entities.filter(b=>!b.plugged).length,1);
  if(id==='world4')assert.ok(crestFlight,'broader crest permits a natural gravity flight');
  const at=s.finishedAt,x=s.pumpkin.x;assert.ok(Math.hypot(s.pumpkin.vx,s.pumpkin.vy)>10,'finish has not zeroed speed');
  for(let i=0;i<60;i++){P.input(s,1);W.update(s,1/60);}assert.ok(s.pumpkin.x>x+20);assert.equal(s.finishedAt,at);assert.equal(s.handoffs,s.holes.length);
  for(let i=0;i<60*40;i++){P.input(s,0);W.update(s,1/60);}assert.ok(Math.hypot(s.pumpkin.vx,s.pumpkin.vy)<15,'original low friction gradually settles in the catch valley');
});
for(let index=0;index<4;index++)test(`hole ${index+1} shares directional contact, low/high capped launch and single seating`,()=>{
  for(const speed of index%2?[60,700]:[2,700])for(const offset of [-35,0,35])for(const cap of [220,520]){
    const s=prime(index,speed,offset,cap),h=s.holes[index],incoming=s[s.active],out=h.occupant;P.input(s,1);
    for(let i=0;i<240&&!h.swaps;i++)W.update(s,P.STEP);
    assert.equal(h.swaps,1);assert.equal(s[s.active],out);assert.equal(incoming.plugged,true);assert.equal(out.plugged,false);assert.equal(Math.sign(out.vy),h.direction);assert.ok(Math.hypot(out.vx,out.vy)<=cap+1e-8);assert.equal(s.target,1);
    for(let i=0;i<240*.3;i++)W.update(s,P.STEP);assert.equal(h.state,'complete');assert.equal(incoming.x,h.x);assert.equal(incoming.y,h.y);
    for(let i=0;i<240;i++)W.update(s,P.STEP);assert.equal(h.swaps,1);assert.ok(Number.isFinite(out.y));
    if(h.direction>0)assert.ok(out.x>h.x-35,'new mouth uses its own horizontal guide');
  }
  const s=prime(index,100),h=s.holes[index],b=s[s.active];assert.ok(W.eligible(s,h,b));
  b.layer=h.exitLayer;assert.equal(W.eligible(s,h,b),false);b.layer=h.entryLayer;
  b.vy=-h.direction*100;assert.equal(W.eligible(s,h,b),false);
  b.y=h.y;b.x=h.x+65;b.vx=300;b.vy=0;assert.equal(W.eligible(s,h,b),false);
  if(h.direction>0){const slow=prime(index,15);for(let i=0;i<240;i++)W.update(slow,P.STEP);assert.equal(slow.holes[index].swaps,0);assert.ok(Number.isFinite(slow[slow.active].y));}
});
test('all added curves are C1 and cellar floors, roofs and surface remain separate',()=>{
  for(const course of Object.values(C.courses)){
    for(const [layer,points]of Object.entries(course.curves))for(const [x,y,t]of points){const f=W.curve(layer,x,course);assert.ok(Math.abs(f.y-y)<1e-8);assert.ok(Math.abs(f.slope-t)<1e-8);if(x>points[0][0]&&x<points.at(-1)[0])assert.ok(Math.abs(W.curve(layer,x-.001,course).slope-W.curve(layer,x+.001,course).slope)<.001);}
    for(const cell of course.cellars)for(let x=cell.left;x<=cell.right;x+=5){assert.ok(W.roof(x,course,cell.layer)<=W.surfaceHeight(x,course)-25);assert.ok(W.roof(x,course,cell.layer)-W.curve(cell.layer,x,course).y>64);}
  }
});
test('both comparison courses retain fixed-step agreement at 30/60/120 fps',()=>{
  for(const id of ['world2','world4']){
    const results=[30,60,120].map(fps=>{const s=W.createCourse(C.get(id));for(let i=0;i<fps*20;i++){P.input(s,Math.floor(i/fps*3)%2?1:0);W.update(s,1/fps);}return P.snapshot(s);});
    assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
  }
});
test('second U restarts from rest with the existing right/left drive; all tuning extremes remain finite without penetration',()=>{
  const s=W.createCourse(C.get('world4')),b=s.pumpkin;const f=W.curve('return',2140,s.course);Object.assign(b,{layer:'return',x:f.x+f.nx*b.r,y:f.y+f.ny*b.r,vx:0,vy:0,grounded:true});
  for(let i=0;i<240*12&&s.holes[2].swaps===0;i++){P.input(s,i<240? -1:1);W.update(s,P.STEP);}assert.ok(b.x>2250,'same pumping restarts in broader U');
  for(const [group,defs]of Object.entries({...P.PARAMETERS,world:W.PARAMETERS}))for(const [key,d]of Object.entries(defs))for(const value of [d[2],d[3]]){
    const t=W.createCourse(C.get('world4'));t.settings[group][key]=value;
    for(let i=0;i<60*25;i++){P.input(t,input(t,i));W.update(t,1/60);const fruit=t[t.active];assert.ok([fruit.x,fruit.y,fruit.vx,fruit.vy,t.camera.x,t.camera.y].every(Number.isFinite));const mouth=t.holes.some(h=>h.state==='compressing'&&h.incoming===fruit)||fruit.exiting;if(!mouth)assert.ok(W.contact(fruit,t.course).distance>=fruit.r-.05,`${group}.${key} floor`);}
  }
});
test('active wall timing excludes pauses, records sections once and freezes complete snapshots',()=>{
  const t=T.begin('world4',1000,2,P.defaults()),s={phase:'surface',time:1,handoffs:0,finished:false};T.tick(t,2000,s);T.tick(t,8000,s,false);T.checkpoint(t,9000);s.phase='underground';s.handoffs=1;s.time=2;T.tick(t,10000,s);s.phase='finish';s.handoffs=4;s.time=3;s.finished=true;assert.equal(T.tick(t,11000,s),true);assert.equal(T.tick(t,12000,s),false);
  assert.equal(t.elapsedSeconds,3);assert.equal(t.simulationSeconds,3);assert.equal(t.sections.reduce((n,x)=>n+x.seconds,0),3);assert.equal(t.handoffs,4);assert.equal(t.resets,2);
  const copy=T.snapshot(t);copy.parametersAtStart.pumpkin.mass=99;copy.sections[0].seconds=99;assert.equal(t.parametersAtStart.pumpkin.mass,2.4);assert.equal(t.sections[0].seconds,2);assert.equal('lastClock'in copy,false);
});
test('canonical app selects both courses, completes by pointer, keeps tuning and counts only RESET',()=>{
  const h=harness();const selector=h.ids.get('world-course');
  for(const id of ['world2','world4']){
    selector.value=id;selector.emit('change');assert.equal(h.probe().course,id);assert.equal(h.probe().measurements.resetCounts[id],0);
    h.pointer('pointerdown');for(let i=0;i<60*25&&!h.probe().finished;i++){if(i%40===0&&h.probe().active==='rutabaga'){h.pointer('pointerup');h.frame();h.pointer('pointerdown');}h.frame();}
    const done=h.probe();assert.ok(done.finished);assert.equal(done.measurements.current.complete,true);assert.equal(done.measurements.current.handoffs,id==='world2'?2:4);assert.equal(done.measurements.current.sections.length,id==='world2'?3:5);
    assert.ok(done.measurements.current.elapsedSeconds>0);assert.equal(h.ids.get('feel').textContent,'ひと区切り。RESETで、もう一度。');
    h.ids.get('reset').emit('click');assert.equal(h.probe().course,id);assert.equal(selector.value,id);assert.equal(h.probe().handoffs,0);assert.equal(h.probe().measurements.resetCounts[id],1);assert.ok(h.probe().holes.every(x=>x.state==='waiting'));assert.equal(h.probe().entities.filter(x=>!x.plugged).length,1);
  }
  assert.equal(h.probe().measurements.completed.length,2);const elapsed=h.probe().measurements.current.elapsedSeconds;
  h.ids.get('tune').emit('click');h.advance(3);assert.equal(h.probe().measurements.current.elapsedSeconds,elapsed);
  const fields=h.ids.get('sliders').children.flatMap(f=>f.children).flatMap(l=>l.children);const slider=fields.find(x=>x.id==='pumpkin-mass');slider.value=4;slider.emit('input');assert.equal(h.probe().measurements.current.tuningChanged,true);
  h.ids.get('close-tune').emit('click');h.frame();assert.ok(h.probe().measurements.current.elapsedSeconds<elapsed+.1);
  h.w.emit('blur');h.advance(3);h.w.emit('focus');h.frame();assert.ok(h.probe().measurements.current.elapsedSeconds<elapsed+.2,'blur time excluded');
  selector.value='world2';selector.emit('change');assert.equal(h.probe().settings.pumpkin.mass,4);assert.equal(h.probe().measurements.resetCounts.world2,1);
  const copy=h.w.FruitLabMeasurements();copy.resetCounts.world2=99;assert.equal(h.w.FruitLabMeasurements().resetCounts.world2,1);
  selector.value='world';selector.emit('change');assert.equal(h.probe().course,null);assert.equal(h.probe().mode,'world');assert.deepEqual(h.errors,[]);assert.equal(h.raf.size,1);
});
test('baseline cutaway rendering is pixel-identical and both courses render full routes on native Canvas',()=>{
  const {createCanvas}=require('@napi-rs/canvas'),h=harness();const oldContext=vm.createContext({FruitLabWorld:W,FruitLabArt:h.w.FruitLabArt});vm.runInContext(before('world-draw.js'),oldContext);
  for(const phase of ['surface','underground','return']){const s=W.create();for(let i=0;i<60*8&&s.phase!==phase;i++){P.input(s,input(s,i));W.update(s,1/60);}const a=createCanvas(1000,760),b=createCanvas(1000,760);h.w.FruitLabWorldDraw(a.getContext('2d'),s);oldContext.FruitLabWorldDraw(b.getContext('2d'),s);assert.ok(a.toBuffer('image/png').equals(b.toBuffer('image/png')),phase);}
  for(const viewport of [{width:1180,height:820},{width:390,height:844},{width:844,height:390}])for(const id of ['world2','world4']){const app=harness({...viewport,native:true});app.ids.get('world-course').value=id;app.ids.get('world-course').emit('change');app.pointer('pointerdown',viewport.width*.75,viewport.height*.55);for(let i=0;i<60*25&&!app.probe().finished;i++){if(i%40===0&&app.probe().active==='rutabaga'){app.pointer('pointerup',viewport.width*.75,viewport.height*.55);app.frame();app.pointer('pointerdown',viewport.width*.75,viewport.height*.55);}app.frame();}assert.ok(app.probe().finished);assert.deepEqual(app.errors,[]);assert.ok(app.renderCanvas.toBuffer('image/png').length>1000);}
});
