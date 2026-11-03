import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {RoomMotion} from '../room-motion.mjs';
import {computeViewport} from '../canvas-layout.mjs';

// Run the actual constructor/listeners/scheduler against controlled browser
// boundaries. No game, storage, clock or synthetic implementation of scheduling.
function harness(){
 const source=fs.readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8')
  .replace(/^import.*\n/gm,'').replace('export class CanvasScene','class CanvasScene');
 const target=()=>{const listeners=new Map();return {addEventListener(type,fn){const f=listeners.get(type)??[];f.push(fn);listeners.set(type,f);},emit(type,event={}){for(const fn of listeners.get(type)??[])fn(event);}};};
 const nodes=new Map(),observers=[],frames=new Map(),timers=new Map(),cancelled=[],cleared=[];
 let serial=0,now=0,resolveFont;
 const node=()=>({...target(),dataset:{},style:{setProperty(){}},setAttribute(){},append(){},prepend(){},getContext:()=>({}),getBoundingClientRect:()=>({width:300,height:200}),open:false});
 const get=id=>{if(id==='font-uniform-style')return null;if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const document={...target(),hidden:false,documentElement:{...node(),clientWidth:375},body:node(),getElementById:get,createElement:node};
 const window={...target(),visualViewport:{...target(),width:375,height:620,offsetLeft:0,offsetTop:0,scale:1}};
 const media={...target(),matches:false};
 const env={document,window,performance:{now:()=>now},matchMedia:()=>media,RoomMotion,computeViewport,
  installSceneInput(){},symbolMarkup:()=>'',numberMarkup(){},disclosureSymbols(){},
  fontReady:new Promise(resolve=>{resolveFont=resolve;}),devicePixelRatio:2,innerWidth:375,innerHeight:620,
  MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(node,options){this.node=node;this.options=options;}disconnect(){}},
  ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){}},
  requestAnimationFrame(fn){const id=++serial;frames.set(id,fn);return id;},
  cancelAnimationFrame(id){cancelled.push(id);frames.delete(id);},
  setTimeout(fn,delay){const id=++serial;timers.set(id,{fn,delay});return id;},
  clearTimeout(id){cleared.push(id);timers.delete(id);}
 };
 const Scene=vm.runInNewContext(source+'\nCanvasScene;',env),scene=new Scene();
 return {Scene,scene,document,window,media,frames,timers,cancelled,cleared,observers,get,
  setNow:value=>{now=value;},resolveFont,
  flush(){const pending=[...frames];for(const[id,fn]of pending){if(!frames.has(id))continue;frames.delete(id);fn(now);}},
  timer:()=>env.setTimeout(()=>{},100)};
}

test('R6 actual queue coalesces constructor and repeated requests, reading latest presentation',()=>{
 const h=harness(),s=h.scene,seen=[];s.draw=function(){seen.push(this.view);};
 assert.equal(h.frames.size,1,'constructor resize requests one frame');
 s.view={room:'distill'};s.queue();s.view={room:'warehouse'};s.queue();s.queue();
 assert.equal(h.frames.size,1);h.flush();assert.equal(seen.length,1);assert.equal(seen[0].room,'warehouse');assert.equal(s.frame,0);
 s.queue();s.queue();assert.equal(h.frames.size,1);h.flush();assert.equal(seen.length,2);
});

test('R6 stop cancels pending RAF and all three presentation timers; hidden requests stay stopped',()=>{
 const h=harness(),s=h.scene,frame=s.frame;
 for(const key of ['hintTimer','selectionTimer','motionTimer'])s[key]=h.timer();
 h.document.hidden=true;h.document.emit('visibilitychange');
 assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);assert.equal(s.frame,0);assert(h.cancelled.includes(frame));
 for(const key of ['hintTimer','selectionTimer','motionTimer'])assert.equal(s[key],null);
 s.queue();s.queue();assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);
 h.document.hidden=false;h.document.emit('visibilitychange');h.document.emit('visibilitychange');assert.equal(h.frames.size,1);
});

test('R6 actual page lifecycle listeners suspend and coalesce pageshow/visibility recovery',()=>{
 const h=harness(),s=h.scene;h.window.emit('pagehide',{persisted:true});assert.equal(s.suspended,true);assert.equal(h.frames.size,0);
 s.queue();h.document.emit('visibilitychange');assert.equal(h.frames.size,0);
 h.setNow(2500);h.window.emit('pageshow',{persisted:true});h.document.emit('visibilitychange');h.window.emit('pageshow',{persisted:false});
 assert.equal(s.suspended,false);assert.equal(s.idleSince,2500);assert.equal(h.frames.size,1);
 // These listener calls are synthetic coverage, not an observed BFCache hit.
});

test('R6 font settlement and font recovery events redraw through the same queue',async()=>{
 const h=harness(),s=h.scene;assert.equal(s.fontSettled,false);h.flush();assert.equal(h.frames.size,0);
 h.resolveFont('fallback');await Promise.resolve();assert.equal(s.fontSettled,true);assert.equal(h.frames.size,1);
 h.document.emit('amber-font-change');assert.equal(h.frames.size,1);
 h.flush();h.document.hidden=true;h.document.emit('amber-font-change');assert.equal(h.frames.size,0);
 h.document.hidden=false;h.document.emit('visibilitychange');assert.equal(h.frames.size,1);
});

test('R6 actual draw guards cancel tasks before missing-view/font/hidden/suspended returns',()=>{
 for(const blocked of ['view','font','hidden','suspended']){
  const h=harness(),s=h.scene;s.view={};s.fontSettled=true;
  if(blocked==='view')s.view=null;if(blocked==='font')s.fontSettled=false;if(blocked==='hidden')h.document.hidden=true;if(blocked==='suspended')s.suspended=true;
  let paints=0;s.controls=()=>{paints++;};s.drawWorld=()=>{paints++;};
  for(const key of ['hintTimer','selectionTimer','motionTimer'])s[key]=h.timer();
  s.draw();assert.equal(paints,0,blocked);assert.equal(h.frames.size,0,blocked);assert.equal(h.timers.size,0,blocked);
 }
});

test('R6 modal, news, reduced-motion and viewport events use existing scheduler and DPR dimensions',()=>{
 const h=harness(),s=h.scene;h.flush();
 const modal=h.observers.find(o=>o.node===h.get('action-dialog')&&o.options.attributeFilter?.includes('open'));
 assert(modal);modal.fn();h.media.matches=true;h.media.emit('change');h.window.visualViewport.emit('resize');h.window.visualViewport.emit('scroll');h.window.emit('resize');
 const news=h.observers.find(o=>o.node===h.get('automatic-news'));assert(news);news.fn();
 assert.equal(h.frames.size,1);assert.equal(s.reducedMotion.matches,true);
 assert.equal(s.canvas.width,Math.round(s.viewport.width*s.viewport.dpr));assert.equal(s.canvas.height,Math.round(s.viewport.height*s.viewport.dpr));
 assert.equal(s.viewport.dpr,2);
});
