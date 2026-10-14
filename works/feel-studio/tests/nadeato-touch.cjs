'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),folder='prototypes/nadeato/nadeato-a/',read=p=>fs.readFileSync(path.join(root,p),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const P=require('../prototypes/nadeato/nadeato-a/parameters.js'),{Material,W,H}=require('../prototypes/nadeato/nadeato-a/model.js'),{Desk}=require('../records-v05.js');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
const directions=m=>plain(m.hairs.map(h=>[h.dx,h.dy,h.targetDx,h.targetDy]));
const magnitude=m=>m.hairs.reduce((sum,h)=>sum+Math.hypot(h.dx-.15,h.dy-.55),0);
function pathStroke(m,vertices,parts=1){m.beginStroke(vertices[0],{width:640,height:560});for(let n=1;n<vertices.length;n++){const a=vertices[n-1],b=vertices[n];for(let i=1;i<=parts;i++)m.moveStroke({x:a.x+(b.x-a.x)*i/parts,y:a.y+(b.y-a.y)*i/parts});}m.endStroke();}
test('Original standalone source and appearance files retain protected SHA256 identities',()=>{
 for(const [name,expected]of Object.entries({'app.mjs':'686692fe81ade1214eb7e28186768d278c61dac0c0be3a4ad0714b6b803da292','index.html':'3f0281dfa7413dca6180343a276b18e3c7d5d15957b767ed4441525a5fe363ca','style.css':'57bc7b7b06832bc021e6c4ec1873d81758ffc93355546c3e3f0d79ed03b13c78'}))assert.equal(crypto.createHash('sha256').update(read('../nadeato/'+name)).digest('hex'),expected,name);
});
test('Default seeded roots, lengths, tones and resting directions equal original material geometry',()=>{
 const m=new Material();let seed=137,index=0;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<560;y+=3.8)for(let x=0;x<640;x+=3.8){const expected={x:x+random()*3.8,y:y+random()*3.8,tone:random(),length:3.5+random()*2.6,dx:.15,dy:.55},h=m.hairs[index++];for(const key of Object.keys(expected))assert.equal(h[key],expected[key]);}assert.equal(index,m.hairs.length);assert.equal(W,640);assert.equal(H,560);
});
test('Slow and fast raw samples yield the same deposited direction through turns and reversals',()=>{
 for(const path of [[{x:150,y:280},{x:490,y:280}],[{x:150,y:280},{x:313,y:280},{x:313,y:407}],[{x:150,y:280},{x:487,y:280},{x:151,y:280}]]){const sparse=new Material(),dense=new Material();pathStroke(sparse,path,1);pathStroke(dense,path,100);const a=directions(sparse),b=directions(dense);for(let i=0;i<a.length;i++)for(let k=0;k<4;k++)assert(Math.abs(a[i][k]-b[i][k])<1e-10,'raw event density must not change material dose');}
});
test('Repeated and reverse strokes visibly change existing material without relaxing away',()=>{
 const m=new Material(),a={x:150,y:280},b={x:490,y:280};m.stroke(a,b);const first=magnitude(m);m.stroke(a,b);assert(magnitude(m)>first);const right=m.hairs.filter(h=>Math.abs(h.y-280)<5&&h.x>200&&h.x<440);assert(right.every(h=>h.dx>.8));m.stroke(b,a);assert(right.every(h=>h.dx<-.5));const state=directions(m);m.step(5);assert.deepEqual(directions(m),state);
});
test('Delay changes actual time to target; resistance reduces actual deposited change independently',()=>{
 const direct=new Material(),delayed=new Material({...P.defaults,followDelay:.2}),resisted=new Material({...P.defaults,resistance:.8}),maximum=new Material({...P.defaults,resistance:1});
 for(const m of [direct,delayed,resisted,maximum])m.stroke({x:150,y:280},{x:490,y:280});assert(magnitude(direct)>0);assert.equal(magnitude(delayed),0);assert(delayed.hasPendingResponse);assert(magnitude(resisted)<magnitude(direct));assert(magnitude(maximum)>0&&magnitude(maximum)<magnitude(resisted));delayed.step(.05);const early=magnitude(delayed);assert(early>0&&early<magnitude(direct));delayed.step(.5);assert(magnitude(delayed)>early);for(let i=0;i<30;i++)delayed.step(.2);assert.equal(delayed.hasPendingResponse,false);assert.deepEqual(directions(delayed),directions(direct));
});
test('Finger width converts CSS size to material coverage and is frozen for a captured stroke viewport',()=>{
 const narrow=new Material({...P.defaults,fingerWidth:24}),wide=new Material({...P.defaults,fingerWidth:96}),phone=new Material();for(const m of [narrow,wide])m.stroke({x:150,y:280},{x:490,y:280});phone.stroke({x:150,y:280},{x:490,y:280},{width:320,height:280});const count=m=>m.hairs.filter(h=>h.dx!==.15||h.dy!==.55).length;assert(count(wide)>count(narrow)*2);assert(count(phone)>count(new Material())+count(wide));
 const viewport={width:640,height:560},frozen=new Material(),reference=new Material();frozen.beginStroke({x:150,y:280},viewport);viewport.width=320;viewport.height=280;frozen.moveStroke({x:490,y:280});frozen.endStroke();reference.stroke({x:150,y:280},{x:490,y:280});assert.deepEqual(directions(frozen),directions(reference));
});
test('Scene preparation holds author config, resets runtime and gives settled repeatable baseline',()=>{
 const config={followDelay:.3,resistance:.4,fingerWidth:70,contrast:1.4},m=new Material(config);m.prepareScene('fixedstroke');assert.deepEqual(m.config,config);assert.equal(m.hasPendingResponse,false);const initial=directions(m);m.stroke({x:300,y:400},{x:100,y:120});m.prepareScene('fixedstroke');assert.deepEqual(directions(m),initial);m.prepareScene('clean');assert.equal(magnitude(m),0);assert.deepEqual(m.config,config);assert.equal(m.gesture,null);const before=directions(m);assert.throws(()=>m.prepareScene('invalid'));assert.deepEqual(directions(m),before);
});
test('Cancel discards uncommitted tail; invalid settings do not partially alter material',()=>{
 const m=new Material();m.beginStroke({x:100,y:100});m.moveStroke({x:102,y:100});m.cancelStroke();assert.equal(magnitude(m),0);m.moveStroke({x:500,y:100});assert.equal(magnitude(m),0);m.stroke({x:150,y:280},{x:490,y:280});const before=directions(m),config={...m.config};for(const bad of [{...config,followDelay:Infinity},{...config,resistance:-1},{...config,fingerWidth:200},{...config,contrast:0},{...config,extra:1}]){assert.throws(()=>m.applyState(bad));assert.deepEqual(m.config,config);assert.deepEqual(directions(m),before);}
});
test('Time response is stable under short and long frame steps for identical deposited targets',()=>{
 const slow=new Material({...P.defaults,followDelay:.3}),fast=new Material({...P.defaults,followDelay:.3}),path=[{x:150,y:280},{x:300,y:280},{x:300,y:410}];pathStroke(slow,path,1);pathStroke(fast,path,75);for(let i=0;i<10;i++)slow.step(.05);for(let i=0;i<100;i++)fast.step(.005);const a=directions(slow),b=directions(fast);for(let i=0;i<a.length;i++)for(let k=0;k<4;k++)assert(Math.abs(a[i][k]-b[i][k])<1e-10);
});
function app(withBridge=true){
 const events={},instances=[],paths=[];let loop,api,observer;const rect={left:0,top:0,width:640,height:560};
 class Path{constructor(){this.lines=[];}moveTo(x,y){this.from=[x,y];}lineTo(x,y){this.lines.push([this.from,[x,y]]);}}
 const ctx=new Proxy({stroke:p=>paths.push(p.lines),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});const canvas={width:640,height:560,getContext:()=>ctx,getBoundingClientRect:()=>({...rect}),addEventListener:(k,v)=>events['canvas:'+k]=v,setPointerCapture(){},releasePointerCapture(){},hasPointerCapture:()=>true};
 const w={Path2D:Path,devicePixelRatio:1,requestAnimationFrame:f=>loop=f,addEventListener:(k,v)=>events['window:'+k]=v,ResizeObserver:class{constructor(fn){observer=fn;}observe(){}}};const context={window:w,document:{querySelector:s=>s==='#fur'?canvas:{addEventListener:(k,v)=>events['reset:'+k]=v},addEventListener:(k,v)=>events['document:'+k]=v}};
 for(const file of ['parameters.js','model.js','renderer.js'])vm.runInNewContext(read(folder+file),context);const Base=w.NadeatoModel.Material;w.NadeatoModel.Material=class extends Base{constructor(c){super(c);instances.push(this);}};if(withBridge)w.FeelBridge={connect:a=>{api=a;return{isConnected:()=>true}}};vm.runInNewContext(read(folder+'app.js'),context);
 const event=(x,y,more={})=>({clientX:x,clientY:y,pointerId:1,pointerType:'touch',preventDefault(){},...more});return{api,events,paths,rect,material:instances[0],w,canvas,tick:t=>loop(t),resize:()=>observer(),event};
}
test('Renderer baseline uses original shade buckets; contrast changes light only and retains hair geometry',()=>{
 const a=app();const m=a.material;a.tick(10);const expected=Array.from({length:28},()=>[]);m.visit(-8,-8,72,72,h=>{const l=48+(h.dx*-.55+h.dy*-.83)*17+(h.tone-.5)*6;expected[Math.max(0,Math.min(27,Math.round((l-26)/1.6)))].push([[h.x,h.y],[h.x+h.dx*h.length,h.y+h.dy*h.length]]);});assert.deepEqual(plain(a.paths.slice(0,28)),expected);const before=directions(m),originalBuckets=a.paths.slice(0,28).map(p=>p.length);a.paths.length=0;a.api.applyEdit('contrast',{value:1.8});a.tick(20);assert.notDeepEqual(a.paths.slice(0,28).map(p=>p.length),originalBuckets);assert.deepEqual(directions(m),before);
});
test('Native coalesced and individual touch samples agree; cancel and resize prevent stale stroke continuation',()=>{
 const batched=app(),individual=app();for(const a of [batched,individual])a.events['canvas:pointerdown'](a.event(150,280));const points=[220,290,360,430,490];batched.events['canvas:pointermove'](batched.event(490,280,{getCoalescedEvents:()=>points.map(x=>batched.event(x,280))}));for(const x of points)individual.events['canvas:pointermove'](individual.event(x,280));for(const a of [batched,individual])a.events['canvas:pointerup'](a.event(490,280));assert.deepEqual(directions(batched.material),directions(individual.material));
 for(const action of ['cancel','resize']){const a=app();a.events['canvas:pointerdown'](a.event(150,280));a.events['canvas:pointermove'](a.event(250,280));if(action==='cancel')a.events['canvas:pointercancel'](a.event(250,280));else{a.rect.width=320;a.rect.height=280;a.resize();}const before=directions(a.material);a.events['canvas:pointermove'](a.event(500,200));assert.deepEqual(directions(a.material),before);assert.equal(a.material.gesture,null);}
});
test('App delay response advances equally over one wall-clock second at 5, 30 and 120 fps',()=>{
 const outputs=[];for(const hz of [5,30,120]){const a=app();a.api.applyState({...P.defaults,followDelay:.3});a.material.stroke({x:150,y:280},{x:490,y:280});a.tick(1);for(let frame=1;frame<=hz;frame++)a.tick(1+frame*1000/hz);outputs.push(directions(a.material));}for(const output of outputs.slice(1))for(let i=0;i<output.length;i++)for(let k=0;k<2;k++)assert(Math.abs(output[i][k]-outputs[0][i][k])<.0002,'equal elapsed time must preserve followDelay response at low fps');
});
test('Work Bridge scene hooks retain config and standalone input works without Bridge',()=>{
 const a=app();a.api.applyState({...P.defaults,resistance:.5,followDelay:.2});const scene=a.api.getTestScenes().find(s=>s.id==='fixedstroke');const result=a.api.startTestScene({sceneId:scene.id,contract:scene.contract,runId:'test-1',config:a.api.getState()});require('../bridge-host-v05.js').sceneConditions(result.effectiveConditions);assert.equal(result.config.resistance,.5);assert.equal(a.material.hasPendingResponse,false);assert(magnitude(a.material)>0);const before=directions(a.material);assert.throws(()=>a.api.startTestScene({sceneId:'clean',contract:'wrong',runId:'test-2',config:P.defaults}));assert.deepEqual(directions(a.material),before);
 const solo=app(false);solo.events['canvas:keydown']({key:'ArrowRight',preventDefault(){}});assert(magnitude(solo.material)>0);assert.equal(solo.api,undefined);assert(!read(folder+'play.html').includes('bridge-client'));
});
test('One registered build supports settings branches, Undo, workspace JSON and scene context separately',()=>{
 const catalog=JSON.parse(read('catalog.json')),store=(()=>{const m=new Map;return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}})();const d=new Desk(catalog,'nadeato',store);assert.equal(catalog.builds.filter(b=>b.project==='nadeato').length,1);const base=d.data.left;d.edit(base,{...d.config(base),contrast:1.5},true);const branch=d.branch(base);d.selectScene({id:'clean',contract:'nadeato-clean/1'});d.edit(branch.id,{...branch.config,resistance:.5},true);d.undo(branch.id);assert.equal(d.config(branch.id).resistance,0);assert.equal(d.config(branch.id).contrast,1.5);d.save();const restored=new Desk(catalog,'nadeato',store);assert.deepEqual(restored.config(branch.id),d.config(branch.id));restored.import(d.export());assert.deepEqual(restored.sceneSelection(),d.sceneSelection());assert.equal(restored.node(base).config.contrast,1);assert(!Object.hasOwn(restored.config(branch.id),'hairs'));
});
console.log(JSON.stringify({passed}));
