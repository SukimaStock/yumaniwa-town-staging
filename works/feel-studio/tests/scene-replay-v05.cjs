'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const catalog=JSON.parse(read('catalog.json')),H=require('../bridge-host-v05.js'),{Desk}=require('../records-v05.js'),P=require('../prototypes/ametsugi/ametsugi-c/parameters.js');
const scene={id:'first-roof-rain',contract:'ametsugi-first-roof-rain/1'};
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
const backend=()=>{const m=new Map;return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
function app(withBridge=true){
 const nodes={},events={},ctx=new Proxy({},{get:(o,k)=>o[k]||(()=>{})});let api,loop;
 const node=id=>nodes[id]||=(id==='gameCanvas'?{width:400,height:760,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:400,height:760}),setPointerCapture(){},releasePointerCapture(){}}:{});
 for(const id of ['gameCanvas','sound','reset','again','announce'])Object.assign(node(id),{addEventListener:(type,fn)=>events[id+':'+type]=fn,setAttribute(){},hidden:false});
 const w={matchMedia:()=>({matches:false}),devicePixelRatio:1,addEventListener:(type,fn)=>events['window:'+type]=fn,requestAnimationFrame:f=>loop=f};
 const context={window:w,document:{getElementById:node,addEventListener(){}}};
 for(const file of ['physics.js','art.js','parameters.js'])vm.runInNewContext(read('prototypes/ametsugi/ametsugi-c/'+file),context);
 const Base=w.AmetsugiPhysics.RainGame,instances=[];w.AmetsugiPhysics.RainGame=class extends Base{constructor(){super();instances.push(this)}};
 if(withBridge)w.FeelBridge={connect:a=>{api=a;return{changed(){},isConnected:()=>true}}};
 vm.runInNewContext(read('prototypes/ametsugi/ametsugi-c/app.js'),context);
 return{api,events,w,instances,get game(){return instances.at(-1)},tick:t=>loop(t)};
}
const start=(a,config=P.defaults,runId='run-1',extra={})=>a.api.startTestScene({sceneId:scene.id,contract:scene.contract,config,runId,...extra});
test('Every catalog build, including all legacy assets, retains its registered SHA256 identity',()=>{
 assert(catalog.builds.some(b=>b.id==='ametsugi-c'),'Scene Replay C must be registered');
 for(const b of catalog.builds)for(const asset of [{path:H.sourcePath(b),sha256:b.codeHash},{path:b.url,sha256:b.htmlHash},...(b.dependencies||[])])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset.path))).digest('hex'),asset.sha256,asset.path);
});
test('Scene declaration and acknowledgement are validated inert metadata',()=>{
 const a=app(),decl=H.scenes(a.api.getTestScenes());assert.equal(decl.length,1);assert.deepEqual(decl[0].configDrivenKeys,['angle','wait']);
 const result=start(a);assert.deepEqual(H.sceneConditions(result.effectiveConditions),plain(result.effectiveConditions));assert.equal(result.runId,'run-1');
 assert.deepEqual(H.sceneConditions({chapter:2,label:'arrival',input:'free',ready:true}),{chapter:2,label:'arrival',input:'free',ready:true});
 for(const bad of [{time:Infinity},{source:{}},{drop:[]},{input:'<script>'},JSON.parse('{"__proto__":0}')])assert.throws(()=>H.sceneConditions(bad));
 for(const bad of [[{...decl[0],contract:'bad'}],[decl[0],decl[0]],[{...decl[0],configDrivenKeys:['angle','angle']}],[{...decl[0],extra:1}]])assert.throws(()=>H.scenes(bad));
});
test('Repeated scene starts rebuild temporal and physical state while retaining exact tuning',()=>{
 const a=app(),config={...P.defaults,angle:.36,wait:1.2,gravity:900,resistance:2};start(a,config);
 const first=a.game;first.update(.2);first.lap=3;first.failures=7;first.traces.push({x:1,y:1,life:1});first.pans[0].wet=1;first.spawn();first.grab(0,{x:160,y:305});first.pans[0].velocity=5;
 const result=start(a,config,'run-2'),g=a.game;assert.notEqual(g,first);assert.deepEqual(plain(a.api.getState()),config);assert.equal(g.level,0);assert.equal(g.lap,0);assert.equal(g.failures,0);assert.equal(g.t,0);assert.equal(g.age,0);assert.equal(g.accumulator,0);assert.equal(g.drag,null);assert.equal(g.drop,null);assert.equal(g.traces.length,0);assert.equal(g.pans[0].wet,0);assert.equal(g.pans[0].velocity,0);assert.equal(g.pans[0].angle,.36);assert.equal(g.pans[0].target,.36);assert.equal(g.pending,1.2);assert.equal(g.started,true);assert.equal(result.effectiveConditions.angle,.36);assert.equal(result.effectiveConditions.wait,1.2);
});
test('Scene starts rain without a gesture and paused runs stay paused until resumed',()=>{
 const a=app();start(a,{...P.defaults,wait:.05});a.tick(100);a.tick(200);assert(a.game.drop,'automatic spawn must not need pointer or keyboard');
 a.api.pause(true);start(a,{...P.defaults,wait:0});a.tick(300);a.tick(400);assert.equal(a.game.t,0);assert.equal(a.game.drop,null);a.api.play();a.tick(500);assert(a.game.t>0);assert(a.game.drop);
});
test('Nonzero starting angle lets resistance affect actual first-roof motion',()=>{
 const fast=app(),slow=app();start(fast,{...P.defaults,angle:.36,wait:0,resistance:0});start(slow,{...P.defaults,angle:.36,wait:0,resistance:3});
 for(let i=0;i<90;i++){fast.game.update(1/120);slow.game.update(1/120);}assert.equal(fast.game.drop.kind,'pan');assert.equal(slow.game.drop.kind,'pan');assert(fast.game.drop.v>slow.game.drop.v);assert(fast.game.drop.u>slow.game.drop.u);
});
test('Invalid scene, contract, run ID or config leaves the currently running game untouched',()=>{
 const a=app();start(a);a.game.update(.1);
 for(const extra of [{sceneId:'missing'},{contract:'ametsugi-first-roof-rain/2'},{runId:''},{config:{...P.defaults,gravity:Infinity}},{config:{...P.defaults,waterColor:'red'}},{config:{...P.defaults,wait:3}}]){const g=a.game,before=plain(g.snapshot()),config=plain(a.api.getState());assert.throws(()=>start(a,P.defaults,'invalid-run',extra));assert.equal(a.game,g);assert.deepEqual(plain(g.snapshot()),before);assert.deepEqual(plain(a.api.getState()),config);}
});
test('Snapshot omits temporal fields and scene preparation never calls it as a restore source',()=>{
 const a=app(),s=a.game.snapshot();for(const key of ['pending','age','accumulator','events','traces','tuning'])assert(!Object.hasOwn(s,key));assert(!Object.hasOwn(s.pans[0],'velocity'));
 a.w.AmetsugiPhysics.RainGame.prototype.snapshot=()=>{throw Error('snapshot is diagnostic only');};start(a);assert.equal(a.game.started,true);assert.equal(a.game.t,0);
});
test('C runs independently without Bridge and native work input remains available',()=>{
 const a=app(false);assert.equal(a.api,undefined);a.game.start();a.tick(100);a.tick(200);assert(a.game.t>0);assert(a.events['gameCanvas:pointerdown']);assert(a.events['gameCanvas:pointercancel']);assert(!read('prototypes/ametsugi/ametsugi-c/play.html').includes('bridge-client'));
});
test('Legacy workspace opens without scene data; scene context survives branch, Undo, save and JSON import',()=>{
 const storage=backend(),legacy=new(require('../records-v04.js').Desk)(catalog,'ametsugi',storage);legacy.data.nodes=legacy.data.nodes.filter(n=>n.buildId==='ametsugi-a');legacy.data.left=legacy.data.right='ametsugi-a';legacy.save();
 const d=new Desk(catalog,'ametsugi',storage);assert.equal(d.sceneSelection(),null);assert.equal(d.data.nodes.length,1);const original=d.node('ametsugi-a'),c=d.addBuild('ametsugi-c');d.selectScene(scene);
 d.edit(c.id,{...c.config,gravity:900},true);const branch=d.branch(c.id);assert.equal(d.config(branch.id).gravity,900);d.edit(branch.id,{...branch.config,gravity:1000},true);d.undo(branch.id);assert.equal(d.config(branch.id).gravity,900);assert.deepEqual(d.sceneSelection(),scene);assert.deepEqual(d.node('ametsugi-a'),original);
 const request=d.request(branch.id,[],'compare this scene');assert.deepEqual(request.extensions.sceneReplay,{version:1,selected:scene});assert.equal(request.base.config.gravity,900);assert(!Object.hasOwn(request.base.config,'sceneReplay'));
 const reopened=new Desk(catalog,'ametsugi',storage);assert.deepEqual(reopened.sceneSelection(),scene);const imported=new Desk(catalog,'ametsugi',backend());imported.import(d.export());assert.deepEqual(imported.sceneSelection(),scene);assert.equal(imported.config(branch.id).gravity,900);
 const before=imported.export();const bad=JSON.parse(d.export());bad.extensions.sceneReplay.selected.contract='invalid';assert.throws(()=>imported.import(JSON.stringify(bad)));assert.equal(imported.export(),before);
});
async function bridgeTests(){
 const messages=[],parent={postMessage:m=>messages.push(plain(m))},handlers={},w={parent,addEventListener:(k,v)=>handlers[k]=v,removeEventListener(){}};
 vm.runInNewContext(read('bridge-client-v05.js'),{window:w});let value=0,active=0,maxActive=0;
 const connect=api=>w.FeelBridge.connect({getState:()=>({value}),restoreState:c=>value=c.value,...api});
 connect({getTestScenes:()=>[{...scene,label:'Scene',description:'test',configDrivenKeys:[]}],startTestScene:async input=>{active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setImmediate(r));value=input.config.value;active--;return{runId:input.runId,sceneId:input.sceneId,contract:input.contract,effectiveConditions:{time:0},config:{value}};}});
 const emit=(type,data={},source=parent)=>handlers.message({source,data:{protocol:'feel-frame/2',nonce:'valid',type,...data}}),flush=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};
 emit('init',{config:{value:1}});await flush();assert.equal(messages.find(m=>m.type==='ready').capabilities.sceneReplay,true);
 emit('start-test-scene',{...scene,sceneId:scene.id,runId:'wrong-source',config:{value:8}},{});emit('start-test-scene',{sceneId:scene.id,contract:scene.contract,runId:'wrong-nonce',config:{value:8},nonce:'invalid'});
 for(let i=0;i<3;i++)emit('start-test-scene',{sceneId:scene.id,contract:scene.contract,runId:'queue-'+i,config:{value:i+2}});
 await flush();assert.equal(maxActive,1);assert.equal(value,4);assert.deepEqual(messages.filter(m=>m.type==='scene-started').map(m=>m.runId),['queue-0','queue-1','queue-2']);
 console.log('PASS Parent/source and nonce guards plus rapid scene queue retain ordered acknowledgement IDs');count++;
 const oldMessages=[],oldParent={postMessage:m=>oldMessages.push(plain(m))},oldHandlers={},oldWindow={parent:oldParent,addEventListener:(k,v)=>oldHandlers[k]=v,removeEventListener(){}};
 vm.runInNewContext(read('bridge-client-v05.js'),{window:oldWindow});oldWindow.FeelBridge.connect({getState:()=>({}),restoreState(){}});oldHandlers.message({source:oldParent,data:{protocol:'feel-frame/2',nonce:'old',type:'init',config:{}}});await flush();assert.equal(oldMessages.find(m=>m.type==='ready').capabilities.sceneReplay,false);assert.deepEqual(oldMessages.find(m=>m.type==='ready').scenes,[]);
 console.log('PASS Legacy Bridge hooks advertise Scene Replay as unavailable');count++;
}
bridgeTests().then(()=>console.log(JSON.stringify({passed:count}))).catch(e=>{console.error(e);process.exitCode=1;});
