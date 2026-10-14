'use strict';
// Node DOM/iframe integration harness. This is not a real browser or Safari test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),plain=x=>JSON.parse(JSON.stringify(x)),catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
const Records=require('../records-v05.js'),Host=require('../bridge-host-v05.js'),P=require('../prototypes/ametsugi/ametsugi-c/parameters.js');
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))}};
const selected={id:'first-roof-rain',contract:'ametsugi-first-roof-rain/1'};
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
 function ready(frame,init){const supported=frame.src.includes('/ametsugi-c/');return incoming(frame,{protocol:'feel-frame/2',nonce:init.nonce,type:'ready',capabilities:{pause:true,reset:true,state:true,edit:true,live:true,sceneReplay:supported},elements:P.elements(init.config),scenes:supported?[{...selected,label:'最初の屋根に一粒',description:'一粒を開始',configDrivenKeys:['angle','wait']}]:[]});}
 const fetch=async url=>{const target=path.resolve(root,String(url).replace(/^\.\//,''));const bytes=fs.readFileSync(target);return{ok:true,json:async()=>JSON.parse(bytes.toString()),text:async()=>bytes.toString(),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
 const context={window,document:doc,localStorage:backend,FeelRecords:Records,FeelBridgeHost:Host,fetch,crypto:crypto.webcrypto,matchMedia:()=>({matches:false}),setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},navigator:{clipboard:{writeText:async()=>{}}},Blob,URL,console};
 await vm.runInNewContext(fs.readFileSync(path.join(root,'studio-v05.js'),'utf8'),context);await flush();
 async function flush(){for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r));}
 const frame=slot=>get(slot+'-frame').children.find(c=>c.tagName==='IFRAME');
 const init=f=>outgoing.find(x=>x.frame===f&&x.message.type==='init').message;
 const send=async(f,type,data={})=>{await incoming(f,{protocol:'feel-frame/2',nonce:init(f).nonce,type,...data});await flush();};
 const click=async id=>{await get(id).onclick();await flush();};
 const change=async(id,value)=>{get(id).value=value;await get(id).onchange();await flush();};
 const command=f=>outgoing.filter(x=>x.frame===f&&x.message.type==='start-test-scene').at(-1)?.message;
 const ack=async(f,c=command(f),data={})=>send(f,'scene-started',{runId:c.runId,sceneId:c.sceneId,contract:c.contract,config:c.config,effectiveConditions:{level:0,lap:0,time:0,angle:c.config.angle,wait:c.config.wait,source:155,drop:null,velocity:0,input:'free'},...data});
 const exportDesk=async()=>{await click('export');return JSON.parse(get('transfer').value)};
 return{get,frame,send,click,change,command,ack,exportDesk,outgoing,flush,handlers};
}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 const backend=storage(),desk=new Records.Desk(catalog,'ametsugi',backend);desk.addBuild('ametsugi-c');const right=desk.branch('ametsugi-c','comparison','author-edit',{...P.defaults,angle:.36,gravity:900});desk.select('left','ametsugi-c');desk.select('right',right.id);desk.save();backend.setItem('sukimastock.feel-studio.v2.project','ametsugi');
 const h=await harness(backend);
 await test('Scene choice and retry operate through the Studio UI and preserve editing, nodes and drafts',async()=>{
  assert(h.frame('left'));assert.equal(h.get('scene-retry').disabled,true);await h.change('scene-choice',selected.id);assert.equal(h.get('scene-retry').disabled,false);
  await h.click('edit');assert.equal(h.get('edit').getAttribute('aria-pressed'),'true');await h.send(h.frame('left'),'edit-begin');await h.send(h.frame('left'),'edit-end',{config:{...P.defaults,volume:.75}});const before=await h.exportDesk();assert.equal(before.drafts['ametsugi-c'].volume,.75);await h.click('scene-retry');assert(h.command(h.frame('left')));assert.equal(h.get('edit').getAttribute('aria-pressed'),'true');assert.equal(h.get('bridge-controls').hidden,false);await h.ack(h.frame('left'));const after=await h.exportDesk();assert.deepEqual(after.nodes,before.nodes);assert.deepEqual(after.drafts,before.drafts);assert.deepEqual(after.extensions.sceneReplay.selected,selected);assert.match(h.get('scene-note').textContent,/場面開始済み/);
 });
 await test('Rapid retries accept only the latest run acknowledgement and reject wrong config',async()=>{
  const f=h.frame('left');await h.click('scene-retry');const stale=h.command(f);await h.click('scene-retry');const current=h.command(f);assert.notEqual(stale.runId,current.runId);await h.ack(f,stale);assert.match(h.get('scene-note').textContent,/準備/);
  await h.ack(f,current,{config:{...current.config,gravity:1000}});assert.match(h.get('status').textContent,/開始設定が依頼と違います/);assert.doesNotMatch(h.get('scene-note').textContent,/場面開始済み/);await h.click('scene-retry');await h.ack(f);assert.match(h.get('scene-note').textContent,/場面開始済み/);
 });
 await test('Matching supported pair exposes condition differences and starts both slots',async()=>{
  await h.click('compare');assert.equal(h.get('scene-pair').disabled,false);assert.match(h.get('scene-note').textContent,/開始条件の差：角度 0 \/ 0.36/);assert.match(h.get('scene-note').textContent,/調整値の差：重力 670 \/ 900/);
  await h.click('scene-pair');await h.ack(h.frame('left'));assert.match(h.get('scene-note').textContent,/場面開始済み/);await h.ack(h.frame('right'));assert.match(h.get('status').textContent,/両案を同じ場面から開始/);
 });
 await test('Remount invalidates old iframe acknowledgements; old B disables pair scene comparison',async()=>{
  const previous=h.frame('right');await h.click('scene-pair');const stale=h.command(previous);await h.change('right','ametsugi-b');assert.notEqual(h.frame('right'),previous);assert.equal(h.get('scene-pair').disabled,true);assert.match(h.get('scene-note').textContent,/両方が同じ場面に対応/);const status=h.get('status').textContent;await h.ack(previous,stale);assert.equal(h.get('status').textContent,status);
 });
 await test('Scene selection persists through Studio export and reload with actual host and Records',async()=>{
  const exported=await h.exportDesk();assert.deepEqual(exported.extensions.sceneReplay.selected,selected);const reload=await harness(backend);assert.equal(reload.get('scene-choice').value,selected.id);assert.equal(reload.get('scene-retry').disabled,false);const after=await reload.exportDesk();assert.deepEqual(after.extensions.sceneReplay,exported.extensions.sceneReplay);assert.deepEqual(after.nodes,exported.nodes);
 });
 console.log(JSON.stringify({passed,harness:'Node DOM/iframe integration; not a real browser'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
