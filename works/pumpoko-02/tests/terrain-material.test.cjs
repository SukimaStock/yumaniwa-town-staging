'use strict';
const {approvedLogoPath}=require('./approved-logo.cjs');
const {SHIFT,x:shiftX,protectPhysics}=require('./stage1-reference.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {harness}=require('./harness.cjs'),{BASE,render}=require('./terrain-review.cjs');
const h=harness(),w=h.w,W=w.FruitLabWorld,course=w.FruitLabCourses.get('world4');
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const rind=rgb(w.PumpokoMaterial.rind),cream=rgb(w.PumpokoMaterial.cream);
const close=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<4);
function scene(x,y,{holes=false}={}){const s=W.createCourse(course);s.entities=[];if(!holes)s.holes=[];const view={x,y,z:.8};const canvas=render(w,s,view),c=canvas.getContext('2d');return {s,view,canvas,pixel(wx,wy){return [...c.getImageData(Math.round(195+(wx-x)*.8),Math.round(340-(wy-y)*.8),1,1).data].slice(0,3);}};}
test('accepted runtime/assets except terrain drawing and approved shot timing/goal contact remain exact-main bytes',()=>{
 const repo=path.resolve(__dirname,'../../..');
 const files=execFileSync('git',['ls-tree','-r','--name-only',BASE,'works/pumpoko-02/'],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(f=>!approvedLogoPath(f)&&!f.includes('/tests/')&&!f.includes('/visual-review/')&&!f.endsWith('.md')&&!f.endsWith('/world-draw.js')&&!['/physics.js','/story.js','/app.js','/courses.js','/world.js'].some(x=>f.endsWith(x)));
 protectPhysics();
 for(const file of files)assert.ok(fs.readFileSync(path.join(repo,file)).equals(execFileSync('git',['show',BASE+':'+file],{cwd:repo,maxBuffer:10e6})),file);
});
test('original screen thickness, ordered skin → cream → flesh, entirely solid-side',()=>{
 for(const [layer,x]of [['surface',190],['underground',1730],['underground2',5670],['finish',7660]]){
  const sx=shiftX(layer,x),y=W.curve(layer,sx,course).y,r=scene(sx,y+70);let green=0,pale=0;
  for(let i=0;i<28;i++){const p=r.pixel(sx,y-(i+.5)/.8);if(close(p,rind))green++;if(close(p,cream))pale++;}
  assert.ok(green>=12&&green<=14,layer+': '+green+' green screen pixels');
  assert.ok(pale>=4&&pale<=6,layer+': '+pale+' pale screen pixels');
  assert.ok(!close(r.pixel(sx,y+4),rind)&&!close(r.pixel(sx,y+4),cream),layer+' clear air above actual contact');
  assert.ok(close(r.pixel(sx,y-10),rind));assert.ok(close(r.pixel(sx,y-21),cream));
  assert.ok(!close(r.pixel(sx,y-32),rind)&&!close(r.pixel(sx,y-32),cream));
 }
});
test('ceiling and vertical cellar walls place cream into terrain, not into playable air',()=>{
 const cases=[{x:1420+SHIFT,y:W.roof(1420+SHIFT,course),dx:0,dy:1},
  {x:1310+SHIFT,y:320,dx:-1,dy:0},{x:2860+SHIFT,y:170,dx:1,dy:0}];
 for(const p of cases){const r=scene(p.x,p.y);
  assert.ok(close(r.pixel(p.x+p.dx*10,p.y+p.dy*10),rind),JSON.stringify(p));
  assert.ok(close(r.pixel(p.x+p.dx*21,p.y+p.dy*21),cream));
  assert.ok(!close(r.pixel(p.x-p.dx*4,p.y-p.dy*4),rind)&&!close(r.pixel(p.x-p.dx*4,p.y-p.dy*4),cream));
 }
});
test('thin roof retains the inner pale seam and no contour invades cellar air',()=>{
 for(const x of [1930,2400,2700,5600,6800,7000].map(x=>x+SHIFT)){
  const top=W.surfaceHeight(x,course),roof=W.roof(x,course),r=scene(x,(top+roof)/2);
  assert.ok(close(r.pixel(x,(top+roof)/2),cream),'inner seam '+x);
  assert.ok(!close(r.pixel(x,roof-4),rind)&&!close(r.pixel(x,roof-4),cream),'ceiling air '+x);
  assert.ok(!close(r.pixel(x,top+4),rind)&&!close(r.pixel(x,top+4),cream),'surface air '+x);
 }
});
test('four socket rims keep their adopted 88-unit opening, borders face away from mouth',()=>{
 for(const hole of course.holes){const y=(W.surfaceHeight(hole.x,course)+W.roof(hole.x,course))/2,r=scene(hole.x,y,{holes:true});
  for(const side of [-1,1]){
   const edge=hole.x+side*44;
   assert.ok(close(r.pixel(edge+side*10,y),rind),'wall '+hole.id);
   // Upward lips are the existing 25-unit roof, so the opposite skin
   // shares its cream seam. A full 21-unit wall depth does not fit there.
   if(hole.direction<0)assert.ok(close(r.pixel(edge+side*21,y),cream),'inner material '+hole.id);
   assert.ok(!close(r.pixel(edge-side*4,y),rind)&&!close(r.pixel(edge-side*4,y),cream),'no narrowed mouth '+hole.id);
  }
 }
});
test('rounded slopes and bowls follow the collision normal without a painted air ledge',()=>{
 for(const [layer,x]of [['surface',-200],['surface',380],['surface',650],['surface',1100],
  ['underground',1700],['underground',2200],['underground',2500],
  ['return',3850],['return',4100],['return',4550],['return',4900],
  ['underground2',5500],['underground2',5900],['underground2',6300],
  ['finish',7400],['finish',7580]]){
  const sx=shiftX(layer,x),f=W.curve(layer,sx,course),r=scene(sx,f.y+70);
  const p=distance=>r.pixel(f.x+f.nx*distance,f.y+f.ny*distance);
  assert.ok(close(p(-10),rind),layer+' '+x+' skin');
  assert.ok(close(p(-21),cream),layer+' '+x+' pale interior');
  assert.ok(!close(p(4),rind)&&!close(p(4),cream),layer+' '+x+' free air');
 }
});
test('drawing is read-only and preserves the canvas transform at ordinary/ending/opening scales',()=>{
 const s=W.createCourse(course),prior=JSON.stringify(s);
 for(const z of [.35,.8,1.2]){const canvas=render(w,s,{x:1400,y:465,z});assert.equal(canvas.width,390);}
 const c=require('@napi-rs/canvas').createCanvas(390,740).getContext('2d');c.translate(0,740);c.scale(1,-1);const m=c.getTransform();
 w.PumpokoWorldDraw(c,s,{x:1400,y:465,z:.8},null,{ground:.5,backgroundMix:.3,lift:20,screen:{x:195,y:400,angle:.08,sx:.7,sy:.73,camera:{x:1400,y:465}}});
 assert.deepEqual(c.getTransform(),m);assert.equal(JSON.stringify(s),prior);
});
