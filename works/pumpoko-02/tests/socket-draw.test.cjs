'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {createCanvas}=require('@napi-rs/canvas'),{BASE,collect,draw,picks}=require('./socket-review.cjs');
const {w,clips}=collect(),W=w.FruitLabWorld;
function pixels(frame){const canvas=createCanvas(390,740),c=canvas.getContext('2d');draw(w,c,frame);return {canvas,c,at(x,y){return [...c.getImageData(Math.round(195+.8*(x-frame.view.x)),Math.round(340-.8*(y-frame.view.y)),1,1).data].slice(0,3);}};}
function sprite(frame,body,clipped=true){
 const canvas=createCanvas(390,740),native=canvas.getContext('2d');let painting=false;
 const c=new Proxy(native,{get(t,k){const value=Reflect.get(t,k,t);if(['fill','stroke','fillRect'].includes(k))return(...a)=>{if(painting)value.apply(t,a);};return typeof value==='function'?value.bind(t):value;},set(t,k,v){return Reflect.set(t,k,v,t);}});
 const A=w.FruitLabArt,old={pumpkin:A.pumpkin,rutabaga:A.rutabaga};
 try{
  for(const kind of ['pumpkin','rutabaga'])A[kind]=(ctx,b)=>{if(b!==body)return;painting=true;old[kind](ctx,b);painting=false;};
  if(clipped){c.translate(0,740);c.scale(1,-1);w.PumpokoWorldDraw(c,frame.world,frame.view);}
  else{native.translate(195,340);native.scale(.8,-.8);native.translate(-frame.view.x,-frame.view.y);old[body.kind](native,body);}
 }finally{Object.assign(A,old);}
 const data=native.getImageData(0,0,390,740).data;let alpha=0;for(let i=3;i<data.length;i+=4)alpha+=data[i];return {data,alpha};
}
test('all existing runtime/assets except terrain drawing and approved shot timing stay exact #186 bytes',()=>{
 const repo=path.resolve(__dirname,'../../..');
 const files=execFileSync('git',['ls-tree','-r','--name-only',BASE,'works/pumpoko-02/'],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(p=>!p.includes('/tests/')&&!p.includes('/visual-review/')&&!p.endsWith('.md')&&!p.endsWith('/world-draw.js')&&!p.endsWith('/story.js'));
 for(const p of files)assert.deepEqual(fs.readFileSync(path.join(repo,p)),execFileSync('git',['show',BASE+':'+p],{cwd:repo,maxBuffer:10e6}),p);
});
for(const clip of clips){
 test(clip.id+': actual opening is empty air through the full flesh, never an orange bridge',()=>{
  const frame=structuredClone(clip.frames[clip.contact]),h=frame.world.holes[clip.index];frame.world.entities=[];frame.nursery=null;
  // Center detail view is only for pixel measurements. Film uses actual view.
  frame.view={x:h.x,y:(W.surfaceHeight(h.x,frame.world.course)+W.roof(h.x,frame.world.course))/2,z:.8};
  const image=pixels(frame),top=W.surfaceHeight(h.x,frame.world.course),roof=W.roof(h.x,frame.world.course);
  for(const dx of [-35,-20,0,20,35])for(const t of [.15,.35,.5,.65,.85]){
   const [r,g,b]=image.at(h.x+dx,roof+(top-roof)*t);
   assert.ok(!(r>180&&g<210&&b<170),'no orange fill at '+dx+'/'+t);
  }
 });
 test(clip.id+': waiting/contact/exiting/seated actors use actual bodies and direction-aware entry order',()=>{
  for(const [label,index]of picks(clip)){
   const frame=clip.frames[index],prior=JSON.stringify(frame.world),h=frame.world.holes[clip.index],calls=[];
   const A=w.FruitLabArt,old={pumpkin:A.pumpkin,rutabaga:A.rutabaga};
   try{for(const kind of ['pumpkin','rutabaga'])A[kind]=(c,b)=>{calls.push(b);old[kind](c,b);};pixels(frame);}finally{Object.assign(A,old);}
   for(const body of frame.world.entities){
    const count=calls.filter(b=>b===body).length;assert.ok(count<=1,'no duplicated body '+label);
    if(sprite(frame,body,false).alpha>0)assert.equal(count,1,'every visible unchanged body '+label);
   }
   if(h.state==='compressing')assert.ok(calls.indexOf(h.incoming)>calls.indexOf(h.occupant),'entry actor is in front for direction '+h.direction);
   assert.equal(JSON.stringify(frame.world),prior,'rendering cannot adjust trajectory/seating/timing');
  }
 });
 test(clip.id+': moving exit is not confined to socket width; after clearance whole actual sprite is restored',()=>{
  const targetIndex=clip.index+1,ratios=[];
  for(let i=clip.contact;i<=clip.contact+36;i+=3){
   const frame=clip.frames[i],b=frame.world.entities[targetIndex],full=sprite(frame,b,false),visible=sprite(frame,b);
   assert.ok(full.alpha>0);const ratio=visible.alpha/full.alpha;ratios.push(ratio);
   assert.ok(ratio>.35&&ratio<1.01,'no disappearance/invalid crop at frame '+i+': '+ratio);
  }
  const after=clip.frames[clip.contact+36],out=after.world.entities[targetIndex],a=sprite(after,out),b=sprite(after,out,false);
  assert.ok(a.alpha/b.alpha>.995,'whole outgoing sprite once it clears the real lip');
  assert.ok(Math.abs(out.x-after.world.holes[clip.index].x)>10,'actual displacement, no scripted reposition');
 });
}
test('ordinary surface/cellar art outside sockets remains byte-identical in rendered appearance',()=>{
 for(const [layer,x]of [['surface',530],['underground',1930],['return',3990],['underground2',6090],['finish',7500]]){
  const s=W.createCourse(w.FruitLabCourses.get('world4')),b=w.FruitLabPhysics.body(layer==='surface'||layer==='return'||layer==='finish'?'pumpkin':'rutabaga',0),f=W.curve(layer,x,s.course);
  Object.assign(b,{layer,x:f.x+f.nx*b.r,y:f.y+f.ny*b.r,plugged:false});s.entities=[b];
  const frame={world:s,view:{x,y:f.y+70,z:.8}},visible=sprite(frame,b),full=sprite(frame,b,false);assert.ok(Buffer.from(visible.data).equals(Buffer.from(full.data)),layer+' unchanged ordinary sprite');
 }
});
