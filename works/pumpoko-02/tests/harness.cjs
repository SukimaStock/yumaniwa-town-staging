'use strict';
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
class Target {
  constructor(tagName='DIV') { this.tagName=tagName;this.events=new Map();this.attrs=new Map();this.children=[];this.style={};this.dataset={};this.hidden=false; }
  addEventListener(type, fn) { if(!this.events.has(type))this.events.set(type,new Set());this.events.get(type).add(fn); }
  removeEventListener(type, fn) { this.events.get(type)?.delete(fn); }
  emit(type,extra={}) { const e={target:this,isTrusted:true,preventDefault(){},...extra};for(const fn of [...this.events.get(type)||[]])fn(e);return e; }
  setAttribute(k,v){this.attrs.set(k,String(v))} getAttribute(k){return this.attrs.get(k)??null} hasAttribute(k){return this.attrs.has(k)} removeAttribute(k){this.attrs.delete(k)}
  appendChild(child){child.parentElement=this;this.children.push(child);return child} append(...children){for(const c of children)this.appendChild(c)}
  focus(){this.ownerDocument.activeElement=this} count(){return [...this.events.values()].reduce((n,s)=>n+s.size,0)}
}
function harness({width=1000,height=760,native=false}={}) {
  const doc=new Target('DOCUMENT'),w=new Target('WINDOW'),ids=new Map(),errors=[],raf=new Map(),timers=new Map(),captures=new Set();let clock=100,serial=0,frameCount=0;
  const add=id=>{const t=new Target();t.ownerDocument=doc;ids.set(id,t);return t};
  for(const id of ['gameCanvas','title','title-controls','start','rest','status','sound','boot-error','title-art'])add(id);
  const media=[];
  class Media extends Target {
    constructor(src){super('AUDIO');Object.assign(this,{src,readyState:4,error:null,paused:true,currentTime:0,playbackRate:1,duration:53.56,plays:0});media.push(this);}
    load(){this.emit('canplay');}
    play(){this.plays++;this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
    advance(dt){if(!this.paused)this.currentTime=(this.currentTime+dt)%this.duration;}
  }
  const node=()=>({gain:{value:1,setValueAtTime(){},cancelScheduledValues(){},linearRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}});
  class AudioContext {
    constructor(){this.state='suspended';this.currentTime=0;this.destination={};}
    createGain(){return node();}createMediaElementSource(){return node();}createBufferSource(){return node();}
    resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
    decodeAudioData(){return Promise.resolve({length:8,numberOfChannels:1,sampleRate:48000,getChannelData:()=>new Float32Array(8)});}
  }
  const canvas=ids.get('gameCanvas');canvas.tagName='CANVAS';
  const modes=[].map(mode=>{const t=new Target('BUTTON');t.ownerDocument=doc;t.dataset.mode=mode;return t});
  const header=new Target(),footer=new Target();for(const t of [header,footer])t.ownerDocument=doc;
  doc.hidden=false;doc.activeElement=null;doc.body=new Target('BODY');doc.body.ownerDocument=doc;
  doc.getElementById=id=>ids.get(id)||null;doc.querySelectorAll=()=>modes;doc.querySelector=s=>s==='header'?header:s==='footer'?footer:null;
  doc.createElement=tag=>{const t=new Target(tag.toUpperCase());t.ownerDocument=doc;return t};
  const renderCanvas=native?require('@napi-rs/canvas').createCanvas(width,height):null;
  const fakeCtx=new Proxy({canvas,measureText:()=>({width:20}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(t,k)=>k in t?t[k]:()=>{}});
  if(native)for(const key of ['width','height'])Object.defineProperty(canvas,key,{get:()=>renderCanvas[key],set:v=>renderCanvas[key]=v});
  canvas.getContext=()=>native?renderCanvas.getContext('2d'):fakeCtx;canvas.getBoundingClientRect=()=>({left:0,top:0,width:w.innerWidth,height:w.innerHeight});
  canvas.setPointerCapture=id=>captures.add(id);canvas.releasePointerCapture=id=>{captures.delete(id);canvas.emit('lostpointercapture',{pointerId:id})};
  Object.assign(w,{window:w,document:doc,console:{log(){},warn(){},error(...e){errors.push(e.map(String).join(' '))}},URLSearchParams,innerWidth:width,innerHeight:height,devicePixelRatio:1,
    Audio:Media,AudioContext,fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}),navigator:{},location:{search:'?dev=1'},localStorage:{getItem:()=>null,setItem(){}},performance:{now:()=>clock},
    requestAnimationFrame:fn=>{raf.set(++serial,fn);return serial},cancelAnimationFrame:id=>raf.delete(id),
    setTimeout:fn=>{timers.set(++serial,fn);return serial},clearTimeout:id=>timers.delete(id),setInterval:fn=>{timers.set(++serial,fn);return serial},clearInterval:id=>timers.delete(id)});
  const context=vm.createContext(w),repo=path.resolve(__dirname,'../../..');
  for(const file of ['engine/codea-lite.v1.0.0.js','engine/sukimastock-engine.v0.3.0.js','works/pumpoko-02/physics.js','works/pumpoko-02/world.js','works/pumpoko-02/courses.js','works/pumpoko-02/material.js','works/pumpoko-02/draw.js','works/pumpoko-02/world-draw.js','works/pumpoko-02/prologue.js','works/pumpoko-02/title-draw.js','works/pumpoko-02/story.js','works/pumpoko-02/app.js'])vm.runInContext(fs.readFileSync(path.join(repo,file),'utf8'),context,{filename:file});
  if(native){const img=new (require('@napi-rs/canvas').Image)();img.src=fs.readFileSync(path.join(repo,'works/pumpoko-02/assets/pumpoko-logo.svg'));ids.set('title-art',img);}
  w.CodeaLite.start('gameCanvas');const tones=[],sounds=[];w.SSE.audio.tone=e=>tones.push({...e,at:w.PumpokoProbe().model.time});
  const play=w.SSE.audio.play.bind(w.SSE.audio);w.SSE.audio.play=(name,...args)=>{sounds.push(name);return play(name,...args);};
  function frame(){clock+=1000/60;const [id,fn]=[...raf][0];raf.delete(id);fn(clock);for(const item of media)item.advance(1/60);if(native&&++frameCount%30===0){renderCanvas.getContext('2d').getImageData(0,0,1,1);if(global.gc)global.gc();}}
  function advance(seconds){for(let i=0;i<seconds*60;i++)frame()}
  function pointer(type,x=750,y=400,id=1){canvas.emit(type,{pointerId:id,clientX:x,clientY:y,button:0,isPrimary:true})}
  function key(type,code='ArrowRight',target=canvas){w.emit(type,{code,key:code,target,repeat:false})}
  frame();return {w,doc,ids,modes,header,footer,canvas,errors,raf,captures,frame,advance,pointer,key,tones,probe:()=>w.PumpokoProbe(),renderCanvas,media,sounds};
}
module.exports={harness,Target};
