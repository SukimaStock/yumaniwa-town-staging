'use strict';
// Deterministic control/media clocks, not a simulation of Safari's audio renderer.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(process.env.ENGINE_TEST_SOURCE || path.join(root, 'engine/sukimastock-engine.v0.3.0.js'), 'utf8');
const tick = async () => { for (let i = 0; i < 32; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
class Target {
  constructor() { this.events = new Map(); }
  addEventListener(n,f) { if (!this.events.has(n)) this.events.set(n,new Set()); this.events.get(n).add(f); }
  removeEventListener(n,f) { this.events.get(n)?.delete(f); }
  emit(n,e={}) { for (const f of this.events.get(n)||[]) f({target:this,...e}); }
}
function harness(options={}) {
  const media=[], sources=[], trace=[], resumes=[], suspends=[], saved=new Map(), w=new Target(), doc=new Target();
  const node=()=>({playbackRate:{value:1},gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){},start(){sources.push(this);},stop(){}});
  class Context {
    constructor(){this.state=options.initialSuspended?'suspended':'running';this.currentTime=0;this.destination={};}
    createGain(){return node();} createMediaElementSource(m){m.routed=this;return node();} createBufferSource(){return node();}
    decodeAudioData(){return Promise.resolve({length:8,numberOfChannels:1,sampleRate:48000,getChannelData:()=>new Float32Array(8)});}
    resume(){ trace.push('resume-request'); const d=deferred(); resumes.push(d); return d.promise.then(()=>{this.state=options.stillSuspended?'suspended':'running';trace.push('resume-complete');}); }
    suspend(){trace.push('suspend-request'); if(!options.deferredSuspend){this.state='suspended';return Promise.resolve();}const d=deferred();suspends.push(d);return d.promise.then(()=>{this.state='suspended';trace.push('suspend-complete');});}
  }
  class Media extends Target {
    constructor(src){super();this.src=src;this.paused=true;this.ended=false;this.currentTime=17.25;this.playbackRate=1;this.readyState=4;this.plays=0;media.push(this);}
    load(){this.emit('canplay');}
    play(){this.plays++;trace.push('media-play:'+this.routed?.state);if(options.playReject)return Promise.reject(new Error('NotAllowedError'));this.paused=false;return options.playPending?.promise||Promise.resolve();}
    pause(){this.paused=true;}
    advance(dt){if(!this.paused)this.currentTime+=dt*this.playbackRate;}
  }
  Object.assign(w,{window:w,document:doc,BEGAN:'BEGAN',MOVING:'MOVING',ENDED:'ENDED',CANCELLED:'CANCELLED',console:{log(){},warn(){},error(){}},performance:{now:()=>100},localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},Audio:Media,AudioContext:options.noContext?undefined:Context,setTimeout,clearTimeout,fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});
  doc.hidden=false;doc.getElementById=()=>null;doc.documentElement={};
  vm.runInNewContext(engine,w);
  const a=w.SSE.audio,l=w.SSE.lifecycle;
  a.configure({music:{song:{file:'song.mp3',loop:true,volume:.225}},sounds:{hit:{file:'hit.wav',mode:'buffer'}}});
  l.install();
  const hidden=()=>{doc.hidden=true;doc.emit('visibilitychange');};
  const visible=()=>{doc.hidden=false;doc.emit('visibilitychange');};
  const start=()=>{assert.equal(a.playMusic('song'),true);return a.musicPlayers.song.audio;};
  return {w,doc,a,l,media,sources,trace,resumes,suspends,hidden,visible,start,async recover(){for(const d of resumes)d.resolve();await tick();}};
}
function preserved(h,m,time=17.25){assert.equal(h.a.musicPlayers[h.a.currentMusic].audio,m);assert.equal(m.currentTime,time);assert.equal(m.playbackRate,1);assert.equal(m.loop,true);assert.equal(h.media.filter(x=>x===m).length,1);}
test('deferred resume: routed media clock is frozen until context promise resolves',async()=>{
  const h=harness(),m=h.start();await tick();h.hidden();await tick();h.visible();
  assert.equal(h.resumes.length,1);assert.equal(m.plays,1);m.advance(60);preserved(h,m);assert.equal(m.paused,true);
  await h.recover();assert.equal(m.plays,2);assert.equal(m.paused,false);preserved(h,m);
  assert.ok(h.trace.indexOf('resume-complete')<h.trace.lastIndexOf('media-play:running'));m.advance(1);preserved(h,m,18.25);
});
for(const persisted of [false,true])test('duplicate visibility/page events, pageshow-first and BFCache persisted='+persisted,async()=>{
  const h=harness(),m=h.start();await tick();h.hidden();h.hidden();h.w.emit('pagehide',{persisted});h.w.emit('pagehide',{persisted});await tick();
  h.doc.hidden=false;h.w.emit('pageshow',{persisted});h.w.emit('pageshow',{persisted});h.visible();h.visible();
  assert.equal(h.resumes.length,1);assert.equal(m.plays,1);await h.recover();assert.equal(m.plays,2);preserved(h,m);assert.equal(h.l.paused,false);
});
test('visible before pageshow waits for outstanding pagehide reason',async()=>{
  const h=harness(),m=h.start();await tick();h.hidden();h.w.emit('pagehide');await tick();h.visible();assert.equal(h.resumes.length,0);assert.equal(m.plays,1);h.w.emit('pageshow',{persisted:true});await h.recover();assert.equal(m.plays,2);
});
test('suspend still pending on return must settle before resume and media',async()=>{
  const h=harness({deferredSuspend:true}),m=h.start();await tick();h.hidden();h.visible();assert.equal(h.resumes.length,0);assert.equal(m.plays,1);h.suspends[0].resolve();await tick();assert.equal(h.resumes.length,1);assert.equal(m.plays,1);await h.recover();assert.equal(m.plays,2);preserved(h,m);
});
test('work onResume/update/gesture requests coalesce behind context recovery',async()=>{
  const h=harness(),m=h.start();await tick();h.l.onResume(()=>h.a.playMusic('song',{restart:false}));h.hidden();await tick();h.visible();for(let i=0;i<20;i++){h.a.resumeMusic('song');h.a.playMusic('song',{restart:false});}
  assert.equal(h.resumes.length,1);assert.equal(m.plays,1);await h.recover();assert.equal(m.plays,2);preserved(h,m);
});
test('re-hide during pending recovery cancels late start, then retains resume intent',async()=>{
  const h=harness(),m=h.start();await tick();h.hidden();await tick();h.visible();h.hidden();await h.recover();assert.equal(m.paused,true);assert.equal(m.plays,1);assert.equal(h.a.ctx.state,'suspended');preserved(h,m);h.visible();await h.recover();assert.equal(m.paused,false);assert.equal(m.plays,2);preserved(h,m);
});
for(const action of ['mute','pause','stop','reconfigure'])test(action+' while recovery pending cannot revive an obsolete player',async()=>{
  const h=harness(),m=h.start();await tick();h.hidden();await tick();h.visible();
  if(action==='mute')h.a.setEnabled(false);if(action==='pause')h.a.pauseMusic();if(action==='stop')h.a.stopMusic({reset:false});if(action==='reconfigure')h.a.configure({music:{song:'new.mp3'}});
  await h.recover();assert.equal(m.paused,true);assert.equal(m.plays,1);assert.equal(m.currentTime,17.25);
  if(action==='mute'){h.a.setEnabled(true);h.a.resumeMusic('song');await tick();assert.equal(m.plays,2);preserved(h,m);}
});
for(const mode of ['reject','throw','still-suspended'])test('resume '+mode+' leaves media paused and allows an explicit later request',async()=>{
  const h=harness({stillSuspended:mode==='still-suspended'}),m=h.start();await tick();h.hidden();await tick();
  if(mode==='throw')h.a.ctx.resume=()=>{throw new Error('denied');};h.visible();if(mode==='reject')h.resumes[0].reject(new Error('denied'));else if(mode==='still-suspended')h.resumes[0].resolve();await tick();
  assert.equal(m.plays,1);assert.equal(m.paused,true);preserved(h,m);h.a.ctx.state='running';assert.equal(h.a.resumeMusic('song'),true);await tick();assert.equal(m.plays,2);
});
test('interrupted context is resumed even if already interrupted before lifecycle pause',async()=>{
  const h=harness(),m=h.start();await tick();h.a.ctx.state='interrupted';h.hidden();h.visible();assert.equal(m.plays,1);await h.recover();assert.equal(m.plays,2);preserved(h,m);
});
test('without AudioContext fallback resumes once with same time, loop, rate and volume',async()=>{
  const h=harness({noContext:true}),m=h.start();await tick();const volume=m.volume;h.hidden();h.w.emit('pagehide');h.doc.hidden=false;h.w.emit('pageshow',{persisted:true});await tick();assert.equal(m.plays,2);assert.equal(m.volume,volume);preserved(h,m);
});
test('pending media play is coalesced; rejected autoplay does not loop/retry automatically',async()=>{
  const d=deferred(),h=harness({playPending:d}),m=h.start();for(let i=0;i<5;i++)h.a.resumeMusic();assert.equal(m.plays,1);d.resolve();await tick();h.a.pauseMusic();h.a.resumeMusic();assert.equal(m.plays,2);
  const denied=harness({playReject:true}),dm=denied.start();await tick();assert.equal(dm.plays,1);assert.equal(dm.paused,true);
});
test('silent preload readiness and lifecycle never replay buffer SE',async()=>{
  const h=harness();await h.a.preload();assert.equal(h.a.resourceState('song').status,'ready');assert.equal(h.a.resourceState('hit').status,'ready');assert.equal(h.media[0].plays,0);h.start();h.a.play('hit',{force:true});assert.equal(h.sources.length,1);h.hidden();await tick();h.visible();await h.recover();assert.equal(h.sources.length,1);
});
test('real CoffeeFactory lifecycle callback and frame ensurePlaying share Engine recovery',async()=>{
  const h=harness();let cfg;h.w.SSE.createApp=c=>{cfg=c;};h.w.SSE.assets.image=()=>null;vm.runInNewContext(fs.readFileSync(path.join(root,'works/coffee-factory/sketch.js'),'utf8'),h.w);
  h.a.configure(cfg.audio);h.w.SSE.i18n.configure(cfg.i18n);cfg.setup();await tick();
  // Real work touch entry sets its own unlocked flag and requests its scene BGM.
  cfg.scenes.setup.touch({state:'BEGAN',x:180,y:320,id:1});await tick();const m=h.a.musicPlayers.coffee.audio;assert.equal(m.plays,1);const time=m.currentTime;
  h.hidden();await tick();h.visible();for(let i=0;i<10;i++)cfg.scenes.setup.update(1/60);assert.equal(m.plays,1);assert.equal(h.resumes.length,1);await h.recover();assert.equal(m.plays,2);preserved(h,m,time);
});

test('pending preparation resume does not suppress a native gesture or synchronous initial media play',async()=>{
  const h=harness({initialSuspended:true});await h.a.preload();assert.equal(h.resumes.length,1);
  const m=h.start();assert.equal(h.resumes.length,2);assert.equal(m.plays,1);
  await h.recover();assert.equal(m.paused,false);assert.equal(m.plays,1);preserved(h,m);
});
