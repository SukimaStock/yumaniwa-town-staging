'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('./builder/model.js'),J=require('./journey.js'),G=require('./stage-geometry.js'),D=require('./dynamics.js'),data=require('./stage-data.js');let count=0;
function test(n,f){f();count++;console.log('PASS',n);}
const step=(m,secs)=>{for(let i=0;i<secs*60;i++)M.update(m,1/60);};
test('direct point changes, x-order clamp, add/delete and material survive JSON round trip',()=>{
  const m=M.create();assert.ok(M.editPoint(m,'point-1-9',1350,530));assert.equal(m.geometry.floor(1350).y,530);M.editPoint(m,'point-1-9',1700,520);assert.ok(M.point(m,'point-1-9').p.x<1430);
  m.selection={type:'point',id:'point-1-9'};assert.equal(M.addPoint(m),false);M.editPoint(m,'point-1-9',1350,520);assert.ok(M.addPoint(m));const id=m.selection.id;assert.ok(M.point(m,id));assert.ok(M.remove(m));assert.equal(M.point(m,id),null);
  m.selection={type:'interval',surface:'surface-a',interval:1,x:200};assert.ok(M.setMaterial(m,'cushion'));assert.equal(m.geometry.material(200),'cushion');assert.equal(G.validate(JSON.parse(M.exportJSON(m))).length,0);
});
test('gap edges move directly and ordinary primitives remain free control points',()=>{
  const m=M.create();m.selection={type:'gap',index:0};const old=m.geometry.GAP[0];M.editPoint(m,'point-0-4',old.left-8,324);assert.equal(m.geometry.GAP[0].right-m.geometry.GAP[0].left,56);
  for(const kind of ['Straight','Slope','Bowl','Ramp']){assert.ok(M.addPrimitive(m,kind));const p=M.point(m,m.selection.id).p;assert.ok(M.editPoint(m,p.id,p.x,p.y+7));}
  m.selection={type:'interval',surface:'surface-a',x:260};assert.ok(M.addPrimitive(m,'Gap'));assert.equal(m.geometry.segments.length,4);assert.equal(m.geometry.floor(260),null);
});
test('TEST START creates a nine-object zero-velocity cluster using real draft physics; RESET and EDIT preserve draft',()=>{
  const m=M.create();M.moveStart(m,1350);const before=M.exportJSON(m);assert.ok(M.play(m));const s=m.run,objects=s.seeds.slice(),positions=s.seeds.map(p=>[p.x,p.y]);assert.equal(s.geometry.floor(1350).y,500);assert.equal(new Set(positions.map(p=>p.join(','))).size,9);assert.ok(s.seeds.every(p=>p.vx===0&&p.vy===0));s.held=true;s.targetX=.3;step(m,3);assert.ok(m.traces[0].length>20);objects.forEach((p,i)=>assert.equal(m.run.seeds[i],p));assert.equal(M.exportJSON(m),before);
  assert.ok(M.play(m));assert.deepEqual(m.run.seeds.map(p=>[p.x,p.y]),positions);step(m,1);const length=m.traces[0].length;M.edit(m);assert.equal(m.mode,'edit');assert.equal(m.traces[0].length,length);assert.equal(M.exportJSON(m),before);
});
test('loss markers and bounded tracks record physics without deleting any seed',()=>{
  const m=M.create();M.moveStart(m,440);M.play(m);const objects=m.run.seeds.slice();m.run.held=true;m.run.targetX=.04;step(m,40);assert.ok(m.losses.length>0);assert.ok(m.losses.length<=9);assert.equal(m.run.seeds.length,9);objects.forEach((p,i)=>assert.equal(m.run.seeds[i],p));step(m,150);assert.ok(m.traces.every(a=>a.length<=1200));assert.ok(m.losses.every(p=>Number.isFinite(p.x+p.y)));M.edit(m);assert.ok(m.losses.length>0);
});
test('invalid import is atomic and successful import/export shares the canonical schema',()=>{
  const m=M.create(),before=M.exportJSON(m);assert.equal(M.importJSON(m,'{'),false);assert.equal(M.exportJSON(m),before);const d=JSON.parse(before);d.surfaces[0].points[1].x=-999;assert.equal(M.importJSON(m,JSON.stringify(d)),false);assert.equal(M.exportJSON(m),before);M.editPoint(m,'point-1-9',1350,525);const json=M.exportJSON(m),other=M.create();assert.ok(M.importJSON(other,json));assert.equal(M.exportJSON(other),json);assert.ok(M.history(m,'undo'));assert.equal(M.exportJSON(m),before);assert.ok(M.history(m,'redo'));assert.equal(M.exportJSON(m),json);
});
function harness(){
  const ids=new Map(),handlers=new Map(),frames=[];let model;
  const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
  const el=id=>{if(!ids.has(id))ids.set(id,{id,hidden:false,value:'',textContent:'',files:[],classList:{toggle(){}},setAttribute(){},addEventListener(n,f){this[n]=f;},click(){this.onclick?.();},getBoundingClientRect:()=>({left:0,top:0,width:1080,height:650}),getContext:()=>context,setPointerCapture(){},focus(){}});return ids.get(id);};
  const buttons=['Straight','Slope','Bowl','Ramp','Gap','Loop'].map(k=>({...el('primitive-'+k),dataset:{primitive:k}}));
  const c={console,PumpkinBuilderModel:{...M,create:(...a)=>(model=M.create(...a))},PumpkinJourney:J,PumpkinStageGeometry:G,PumpkinDynamics:D,PumpkinStageData:data,devicePixelRatio:1,requestAnimationFrame:f=>frames.push(f),ResizeObserver:class{observe(){}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob,localStorage:{setItem(){},getItem(){return null;}},setTimeout:()=>0,
    document:{getElementById:el,querySelectorAll:()=>buttons,createElement:()=>el('download'),body:{classList:{toggle(){}}},addEventListener(n,f){handlers.set(n,f);}},addEventListener(n,f){handlers.set(n,f);}};c.window=c;
  vm.runInNewContext(fs.readFileSync(__dirname+'/stage-draw.js','utf8'),c);vm.runInNewContext(fs.readFileSync(__dirname+'/builder/builder.js','utf8'),c);
  return {model,el,handlers,frame:t=>{const f=frames.shift();f(t);},buttons};
}
test('actual UI pointer events edit a control point and keyboard/pointer PLAY use journey',()=>{
  const h=harness(),canvas=h.el('stage-canvas'),m=h.model;
  // FIT coordinates for the actual 1080×650 editor viewport.
  const z=Math.min(990/2130,525/470),vx=-40-45/z,vy=100-50/z;
  const sx=(1350-vx)*z,sy=(500-vy)*z,event=(x,y)=>({pointerId:1,clientX:x,clientY:y,type:'pointermove'});
  canvas.pointerdown(event(sx,sy));canvas.pointermove(event(sx,sy+15));canvas.pointerup({...event(sx,sy+15),type:'pointerup'});assert.ok(m.geometry.floor(1350).y>530);
  h.el('play').click();assert.equal(m.mode,'play');h.handlers.get('keydown')({target:{tagName:'CANVAS'},key:'ArrowRight',preventDefault(){}});h.frame(1000);for(let i=1;i<60;i++)h.frame(1000+i*1000/60);assert.ok(m.run.x>.3);assert.ok(m.traces[0].length>0);h.el('reset').click();assert.equal(m.run.time,0);h.el('edit').click();assert.equal(m.mode,'edit');assert.ok(m.geometry.floor(1350).y>530);
});
console.log(count+' Builder checks passed.');
