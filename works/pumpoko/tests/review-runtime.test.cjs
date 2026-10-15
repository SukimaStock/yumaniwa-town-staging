'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const {createCanvas}=require('@napi-rs/canvas'),{harness}=require('./harness.cjs');
const BASE='b00d1161ffc3ffa1e653f3a448ea8f7decc24fd2';
const source=f=>fs.readFileSync(__dirname+'/../'+f,'utf8');
const original=f=>cp.execFileSync('git',['show',BASE+':works/pumpoko/'+f],{encoding:'utf8'});
function oldDraw(w){return Function('window',original('world-draw.js')+';return window.PumpokoWorldDraw;')(w);}
function pixels(w,draw,world,view){const canvas=createCanvas(390,740),c=canvas.getContext('2d');c.fillStyle=w.PumpokoMaterial.air;c.fillRect(0,0,390,740);c.translate(0,740);c.scale(1,-1);draw(c,world,view);return Buffer.from(c.getImageData(0,0,390,740).data);}
test('only authorized runtime edits differ from the current canonical baseline',()=>{
 assert.equal(source('app.js').replace("setEnabled(false);label();sync();","setEnabled(false);sync();"),original('app.js'));
 assert.equal(source('world-draw.js').replace('    for(const b of free){\n      c.save();\n      // Only failed crossings below their floor need terrain occlusion.\n      if(b.y<W.curve(b.layer,b.x,course).y)air(c,left,right,Math.max(1100,camera.y+1000/z),surface,spaces);\n      fruit(b);c.restore();\n    }','    for(const b of free)fruit(b);'),original('world-draw.js'));
 for(const f of ['physics.js','world.js','courses.js','story.js','draw.js','material.js','opening.js','opening-draw.js','prologue.js','title-draw.js','index.html','style.css'])assert.equal(source(f),original(f),f);
});
test('every far bank occludes unsupported fruit below solid flesh; normal flight, gaps and sockets remain visible',()=>{
 const w=harness().w,W=w.FruitLabWorld,C=w.FruitLabCourses.get('world4'),draw=w.PumpokoWorldDraw,before=oldDraw(w);let changed=0;
 for(const g of C.gaps){
  function scene(x,height){const world=W.createCourse(C),b=w.FruitLabPhysics.body(C.stages[(g.stage||1)-1].kind,0),f=W.curve(g.layer,x,C);Object.assign(b,{x,y:f.y+height,layer:g.layer,plugged:false,grounded:false});world.entities=[b];world.holes=[];world.active=b.kind;world[b.kind]=b;return {world,b,view:{x,y:f.y+25,z:.8}};}
  const s=scene(g.b+100,-100),empty=structuredClone(s.world);empty.entities=[];
  const current=pixels(w,draw,s.world,s.view),prior=pixels(w,before,s.world,s.view);
  assert.notDeepEqual(current,prior,g.id+' old tunneling reproduced');changed++;
  assert.deepEqual(current,pixels(w,draw,empty,s.view),g.id+' solid flesh completely hides fallen fruit');
  for(const [x,h]of [[g.b+100,120],[(g.a+g.b)/2,120]]){
   const normal=scene(x,h);assert.deepEqual(pixels(w,draw,normal.world,normal.view),pixels(w,before,normal.world,normal.view),g.id+' unchanged unobstructed air');
  }
 }
 assert.equal(changed,C.gaps.length);
});
test('silent continuation immediately updates visible and accessible sound state and toggle enables it again',async()=>{
 class Element{constructor(){this.attrs={};this.handlers={};}addEventListener(k,fn){this.handlers[k]=fn;}setAttribute(k,v){this.attrs[k]=v;}}
 const ids=new Map(['title','title-controls','start','rest','status','audio-wait','continue-silent','gameCanvas','sound'].map(k=>[k,new Element()]));let config;
 const audio={enabled:true,withBaseline:x=>x,baseline:()=>({reference:{bgm:{active:1},se:{soft:1}}}),preload:()=>Promise.reject(Error('fixture load failure')),setEnabled(x){this.enabled=x;},unlock(){},playMusic(){},resumeMusic(){}};
 // The unqualified preload also returns a promise in the real Engine and must be handled in this fixture.
 let calls=0;audio.preload=()=>++calls===1?Promise.resolve():Promise.reject(Error('fixture load failure'));
 const w={FruitLabPhysics:{clearInput(){}},PumpokoStory:{create:()=>({phase:'title',world:{phase:'surface'}})},PumpokoPrologue:{allLoose:()=>true,release(){}},SSE:{audio,input:{reset(){}},createApp:x=>{config=x;}},location:{search:''},document:{getElementById:k=>ids.get(k)},addEventListener(){},URLSearchParams};
 w.window=w;vm.runInNewContext(source('app.js'),w);config.setup();await new Promise(r=>setImmediate(r));
 assert.equal(ids.get('continue-silent').hidden,false,'real rejected preload exposes fallback');
 ids.get('continue-silent').handlers.click();const b=ids.get('sound');
 assert.equal(audio.enabled,false);assert.equal(b.textContent,'♪̸');assert.equal(b.attrs['aria-pressed'],'false');assert.equal(b.attrs['aria-label'],'音を入れる');
 ids.get('sound').handlers.click({isTrusted:true});assert.equal(audio.enabled,true);assert.equal(b.textContent,'♪');assert.equal(b.attrs['aria-pressed'],'true');assert.equal(b.attrs['aria-label'],'音を切る');
});
