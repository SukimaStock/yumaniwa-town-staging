'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createCanvas}=require('@napi-rs/canvas'),{harness}=require('./harness.cjs'),{BASE,protect}=require('./fall-shadow-reference.cjs');
const now=harness().w,before=harness({sourceRef:BASE}).w,W=now.FruitLabWorld,c=now.FruitLabCourses.get('world4');
function render(api,world,view,suppress=false){
 const canvas=createCanvas(390,740),ctx=canvas.getContext('2d'),calls=[],original=api.FruitLabArt.ellipse,unchanged=JSON.stringify(world);
 api.FruitLabArt.ellipse=(ctx,...args)=>{if(String(args[4]).startsWith('rgba(80,54,27,')){calls.push(args);if(suppress)return;}original(ctx,...args);};
 try{ctx.fillStyle=api.PumpokoMaterial.air;ctx.fillRect(0,0,390,740);ctx.save();ctx.translate(0,740);ctx.scale(1,-1);api.PumpokoWorldDraw(ctx,world,view);ctx.restore();}finally{api.FruitLabArt.ellipse=original;}
 assert.equal(JSON.stringify(world),unchanged,'rendering remains read-only');
 return {canvas,calls,data:Buffer.from(ctx.getImageData(0,0,390,740).data)};
}
function scene(g,x,y){const w=W.createCourse(c),b=now.FruitLabPhysics.body(c.stages[(g.stage||1)-1].kind,0);Object.assign(b,{x,y,layer:g.layer,plugged:false,grounded:false});w.entities=[b];w.holes=[];w.active=b.kind;w[b.kind]=b;return {w,b,view:{x,y:W.curve(g.layer,x,c).y+70,z:.8}};}
test('fresh-base guard limits the whole renderer to the fall-shadow edit and preserves all other runtime bytes',protect);
test('all 16 far banks: a body below the ground casts no ghost shadow; native pixels equal removing only that old shadow',()=>{
 for(const g of c.gaps){const x=g.b+80,floor=W.curve(g.layer,x,c).y,s=scene(g,x,floor-100),a=render(before,s.w,s.view),b=render(now,s.w,s.view),onlyShadowRemoved=render(before,s.w,s.view,true);
  assert.equal(a.calls.length,1,g.id+' reproduces former ghost');assert.equal(b.calls.length,0,g.id+' no shadow below ground');assert.notDeepEqual(b.data,a.data,g.id+' visible old shadow removed');assert.deepEqual(b.data,onlyShadowRemoved.data,g.id+' nothing else changes');
 }
});
test('all 16 gap interiors have no shadow at any flight/fall height, and all normal bank ground/flight shadows remain pixel-identical',()=>{
 for(const g of c.gaps){const x=(g.a+g.b)/2,floor=W.curve(g.layer,x,c).y;
  for(const y of [floor+200,floor+36,floor-100]){const s=scene(g,x,y);assert.equal(render(now,s.w,s.view).calls.length,0,g.id+' unsupported interior');}
  for(const height of [0,150]){const x=g.b+100,f=W.curve(g.layer,x,c),r=now.FruitLabPhysics.body(c.stages[(g.stage||1)-1].kind,0).r,s=scene(g,x+f.nx*r,f.y+f.ny*r+height);
   s.b.grounded=height===0;const a=render(before,s.w,s.view),b=render(now,s.w,s.view);assert.equal(b.calls.length,1,g.id+' ordinary shadow');assert.deepEqual(b.calls,a.calls);assert.deepEqual(b.data,a.data,g.id+' unchanged normal rendering');
  }
  const s=scene(g,g.b+80,W.curve(g.layer,g.b+80,c).y+100);s.b.plugged=true;assert.equal(render(now,s.w,s.view).calls.length,0,'plug never casts active shadow');
 }
});
test('actual falling STAGE 3/4/5 at 30/60/120fps loses the old shadow below the far bank and resumes from the saved baton launch',()=>{
 const S=require('../story.js'),{atStage}=require('./five-stage-review.cjs');let illustration;
 for(const stage of [3,4,5])for(const fps of [30,60,120]){const s=atStage(stage),cp=structuredClone(s.world.stages.checkpoint);let found=false,fall=false,retry=false;
  for(let i=0;i<fps*80;i++){const active=s.world[s.world.active],entry=c.gaps.find(g=>g.id==='stage'+stage+'-'+(stage===3?1:2));
   const axis=stage===3&&active.x>entry.a-180&&active.x<entry.a-15?-1:stage===5&&active.x>=entry.a+40&&active.x<entry.a+100?.5:1;
   const events=S.update(s,axis,1/fps),b=s.world[s.world.active],floor=W.curve(b.layer,b.x,c).y;
   if(!found&&s.phase==='playing'&&W.hasGround(b.layer,b.x,c)&&b.y<floor&&b.x>c.gaps.find(g=>g.id==='stage'+stage+'-'+(stage===3?1:3)).b){
    const view={x:b.x,y:floor+70,z:.8},old=render(before,s.world,view),current=render(now,s.world,view);assert.ok(old.calls.length>current.calls.length,'natural far-bank fall reproduces bug');assert.notDeepEqual(old.data,current.data);found=true;
    if(stage===3&&fps===60)illustration={old,current};
   }
   if(events.some(e=>e.type==='fall'))fall=true;
   if(events.some(e=>e.type==='retry')){require('./handoff-retry-reference.cjs').restoredBody(s.world[s.world.active],cp.body);retry=true;break;}
  }
  assert.ok(found&&fall&&retry,stage+'/'+fps+' real fall and retry');
 }
 if(illustration){const canvas=createCanvas(780,780),ctx=canvas.getContext('2d');ctx.fillStyle=now.PumpokoMaterial.air;ctx.fillRect(0,0,780,780);ctx.drawImage(illustration.old.canvas,0,40);ctx.drawImage(illustration.current.canvas,390,40);ctx.fillStyle='#695539';ctx.font='18px sans-serif';ctx.fillText('Before: shadow above fallen fruit',16,27);ctx.fillText('After: no ground shadow',406,27);fs.writeFileSync('/tmp/pumpoko-fall-shadow-comparison.png',canvas.toBuffer('image/png'));}
});
