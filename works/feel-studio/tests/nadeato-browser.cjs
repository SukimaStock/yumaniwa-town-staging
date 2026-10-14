'use strict';
// Node DOM/iframe integration harness. This is not a real browser or Safari test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),plain=x=>JSON.parse(JSON.stringify(x)),catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
const Records=require('../records-v05.js'),Host=require('../bridge-host-v05.js'),P=require('../prototypes/nadeato/nadeato-a/parameters.js');
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))}};
const selected={id:'clean',contract:'nadeato-clean/1'},scenes=[{...selected,label:'何もなでていない面',description:'最初の方向',configDrivenKeys:[]},{id:'fixedstroke',contract:'nadeato-fixedstroke/1',label:'中央を一度なでた面',description:'基準面の一なで',configDrivenKeys:['resistance','fingerWidth']}];
async function harness(backend){
 const nodes=new Map(),handlers={},outgoing=[],timers=[];let incoming;
 class Node{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.attributes={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.parent=null;this.listeners={};this.classList={toggle:(name,value)=>{this.attributes[name]=value}};
   if(tag==='iframe')this.contentWindow={postMessage:m=>{const message=plain(m);outgoing.push({frame:this,message});if(message.type==='init')queueMicrotask(()=>ready(this,message));}};
  }
  setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k];}
  append(...children){for(const c of children){this.children.push(c);c.parent=this;if(c.tagName==='IFRAME')queueMicrotask(()=>c.listeners.load?.());}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  addEventListener(k,v){this.listeners[k]=v;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
  querySelectorAll(selector){const descendants=this.children.flatMap(c=>[c,...c.querySelectorAll(selector)]);return descendants.filter(c=>selector==='select'?c.tagName==='SELECT':selector==='details[open]'?c.tagName==='DETAILS'&&c.open:false);}
  showModal(){this.open=true;}close(){this.open=false;}focus(){}select(){}setPointerCapture(){}getBoundingClientRect(){return{left:0,top:0,width:400,height:760};}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)};
 const doc={getElementById:get,createElement:tag=>new Node(tag),body:new Node('body'),querySelectorAll:()=>[],addEventListener(){},hidden:false};
 const window={addEventListener:(kind,fn)=>handlers[kind]=fn};
 incoming=async(frame,message)=>{await handlers.message({source:frame.contentWindow,data:message});};
 function ready(frame,init){const supported=frame.src.includes('/nadeato-a/');return incoming(frame,{protocol:'feel-frame/2',nonce:init.nonce,type:'ready',capabilities:{pause:true,reset:true,state:true,edit:true,live:true,sceneReplay:supported},elements:P.elements(init.config),scenes:supported?scenes:[]});}
 const fetch=async url=>{const target=path.resolve(root,String(url).replace(/^\.\//,''));const bytes=fs.readFileSync(target);return{ok:true,json:async()=>JSON.parse(bytes.toString()),text:async()=>bytes.toString(),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
 const context={window,document:doc,localStorage:backend,FeelRecords:Records,FeelBridgeHost:Host,fetch,crypto:crypto.webcrypto,matchMedia:()=>({matches:false}),setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},navigator:{clipboard:{writeText:async()=>{}}},Blob,URL,console};
 await vm.runInNewContext(fs.readFileSync(path.join(root,'studio-v05-touch.js'),'utf8'),context);await flush();
 async function flush(){for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r));}
 const frame=slot=>get(slot+'-frame').children.find(c=>c.tagName==='IFRAME');
 const init=f=>outgoing.find(x=>x.frame===f&&x.message.type==='init').message;
 const send=async(f,type,data={})=>{await incoming(f,{protocol:'feel-frame/2',nonce:init(f).nonce,type,...data});await flush();};
 const click=async id=>{await get(id).onclick();await flush();};
 const change=async(id,value)=>{get(id).value=value;await get(id).onchange();await flush();};
 const command=f=>outgoing.filter(x=>x.frame===f&&x.message.type==='start-test-scene').at(-1)?.message;
 const ack=async(f,c=command(f),data={})=>send(f,'scene-started',{runId:c.runId,sceneId:c.sceneId,contract:c.contract,config:c.config,effectiveConditions:{seed:137,materialWidth:640,materialHeight:560,input:'free',response:'settled',...(c.sceneId==='fixedstroke'?{resistance:c.config.resistance,fingerWidth:c.config.fingerWidth}:{})},...data});
 const exportDesk=async()=>{await click('export');return JSON.parse(get('transfer').value)};
 return{get,frame,send,click,change,command,ack,exportDesk,outgoing,flush,handlers};
}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 const backend=storage(),desk=new Records.Desk(catalog,'nadeato',backend),base=desk.data.left;
 const right=desk.branch(base,'Width and response comparison','author-edit',{...P.defaults,resistance:.5,fingerWidth:80,contrast:1.5});desk.select('left',base);desk.select('right',right.id);desk.save();backend.setItem('sukimastock.feel-studio.v2.project','nadeato');
 const h=await harness(backend);
 await test('Actual Touch Studio exposes two declared scenes without rainfall-specific or undefined labels',async()=>{
  assert(h.frame('left'));assert.equal(h.get('scene-choice').children.length,3);assert(h.get('scene-choice').children.some(n=>n.value==='clean'));assert(h.get('scene-choice').children.some(n=>n.value==='fixedstroke'));
  for(const id of ['clean','fixedstroke']){await h.change('scene-choice',id);await h.click('scene-retry');await h.ack(h.frame('left'));assert.match(h.get('scene-note').textContent,/場面開始済み/);assert.doesNotMatch(h.get('scene-note').textContent,/undefined|角度|待ち時間|秒/);}
 });
 await test('Scene retry preserves the open editing panel and existing live drafts',async()=>{
  await h.click('edit');await h.send(h.frame('left'),'edit-begin');await h.send(h.frame('left'),'edit-end',{config:{...P.defaults,followDelay:.15}});const before=await h.exportDesk();await h.click('scene-retry');assert.equal(h.get('edit').getAttribute('aria-pressed'),'true');assert.equal(h.get('bridge-controls').hidden,false);await h.ack(h.frame('left'));const after=await h.exportDesk();assert.deepEqual(after.nodes,before.nodes);assert.deepEqual(after.drafts,before.drafts);assert.equal(after.drafts[base].followDelay,.15);
 });
 await test('Pair comparison uses config-driven keys of each scene rather than rainfall assumptions',async()=>{
  await h.click('compare');await h.change('scene-choice','clean');assert.equal(h.get('scene-pair').disabled,false);assert.match(h.get('scene-note').textContent,/開始レシピ一致/);assert.doesNotMatch(h.get('scene-note').textContent,/開始条件の差/);
  await h.change('scene-choice','fixedstroke');assert.match(h.get('scene-note').textContent,/開始条件の差/);assert.match(h.get('scene-note').textContent,/指が触れる幅 54 \/ 80/);assert.match(h.get('scene-note').textContent,/なで跡のつきにくさ 0 \/ 0.5/);assert.doesNotMatch(h.get('scene-note').textContent,/undefined|角度|待ち時間/);
  await h.click('scene-pair');await h.ack(h.frame('left'));await h.ack(h.frame('right'));assert.match(h.get('status').textContent,/両案を同じ場面から開始/);
 });
 await test('Incorrect scene conditions fail acknowledgement while author config is protected',async()=>{
  await h.click('scene-retry');const f=h.frame('left'),command=h.command(f);await h.ack(f,command,{effectiveConditions:{resistance:.9,fingerWidth:54}});assert.match(h.get('status').textContent,/開始設定が一致しません/);assert.doesNotMatch(h.get('scene-note').textContent,/場面開始済み/);const state=await h.exportDesk();assert.equal(state.drafts[base].followDelay,.15);assert.equal(state.drafts[base].resistance,0);await h.click('scene-retry');await h.ack(f);assert.match(h.get('scene-note').textContent,/場面開始済み/);
 });
 await test('New project settings, branches and selected scene survive real Studio JSON export and reload',async()=>{
  const before=await h.exportDesk();assert.deepEqual(before.extensions.sceneReplay.selected,{id:'fixedstroke',contract:'nadeato-fixedstroke/1'});const reload=await harness(backend);assert.equal(reload.get('scene-choice').value,'fixedstroke');assert.equal(reload.get('scene-retry').disabled,false);const after=await reload.exportDesk();assert.deepEqual(after.nodes,before.nodes);assert.deepEqual(after.drafts,before.drafts);assert.deepEqual(after.extensions,before.extensions);
 });
 console.log(JSON.stringify({passed,harness:'Node DOM/iframe integration; not a real browser or Safari'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
