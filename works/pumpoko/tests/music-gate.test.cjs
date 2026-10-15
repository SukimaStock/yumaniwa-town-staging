'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const BASE='96df238d86cbb01e4d888eb32c64ea9a5ed5b1f9';
const changes=[
 ["  const musicReady=()=>!root.SSE.audio.enabled||musicStatus==='ready'||musicStatus==='silent'||(musicStatus==='loading'&&root.SSE.audio.musicPlayers?.pumpoko?.audio?.readyState>=3&&!root.SSE.audio.musicPlayers.pumpoko.audio.error);", "  const playableMusic=()=>{const media=root.SSE.audio.musicPlayers?.pumpoko?.audio;return !!media&&!media.error&&(media.readyState>=3||(media.readyState>=2&&media.paused===false));};\n  const musicReady=()=>!root.SSE.audio.enabled||musicStatus==='ready'||musicStatus==='silent'||playableMusic();"],
 ["if(ui.silent)ui.silent.hidden=musicStatus!=='failed';", "if(ui.silent)ui.silent.hidden=state.musicReady||musicStatus!=='failed';"],
 ["ui.silent?.addEventListener('click',()=>{musicStatus='silent';", "ui.silent?.addEventListener('click',()=>{if(playableMusic()){sync();return;}musicStatus='silent';"]
];
function undoMusicRepair(source){for(const [before,after] of changes){assert.equal(source.split(after).length,2,'one exact approved music repair');source=source.replace(after,before);}return source;}
module.exports={undoMusicRepair};
if(require.main===module){
const source=()=>fs.readFileSync(process.env.PUMPOKO_MUSIC_SOURCE||__dirname+'/../app.js','utf8');
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
function fixture(){
 class Element{constructor(){this.hidden=false;this.handlers={};this.attrs={};}addEventListener(k,f){this.handlers[k]=f;}setAttribute(k,v){this.attrs[k]=v;}}
 const ids=new Map(['title','title-controls','start','rest','status','audio-wait','continue-silent','gameCanvas','sound'].map(k=>[k,new Element()]));
 let config,resolveLoad;const media={readyState:0,error:null,paused:true,currentTime:0},resource={status:'loading'};
 const audio={enabled:true,musicPlayers:{pumpoko:{audio:media}},currentMusic:'pumpoko',withBaseline:x=>x,baseline:()=>({reference:{bgm:{active:1},se:{soft:1}}}),
 preload:n=>n?new Promise(r=>{resolveLoad=r;}):new Promise(()=>{}),resourceState:()=>resource,setEnabled(x){this.enabled=x;if(!x)media.paused=true;},unlock(){},play(){},resumeMusic(){media.paused=false;},playMusic(){media.paused=false;}};
 const state={phase:'title',world:{phase:'surface',time:0},prologue:{}};
 const w={FruitLabPhysics:{clearInput(){}},PumpokoStory:{create:()=>state,start:s=>{if(s.musicReady)s.phase='opening';},update:()=>[]},PumpokoPrologue:{allLoose:()=>true,release(){}},SSE:{audio,input:{reset(){},actionPressed:()=>false,action:()=>false},createApp:x=>{config=x;}},location:{search:''},document:{hidden:false,getElementById:k=>ids.get(k)},addEventListener(){},URLSearchParams};
 w.window=w;vm.runInNewContext(source(),w);config.setup();
 return {audio,media,ids,state,update:()=>config.scenes.journey.update(0),click:id=>ids.get(id).handlers.click({isTrusted:true}),finish:async status=>{resource.status=status;resolveLoad([status==='ready'?{}:null]);await settle();}};
}
test('normal BGM readiness is independent of unresolved sound effects',async()=>{const f=fixture();await f.finish('ready');assert.equal(f.state.musicReady,true);f.click('start');assert.equal(f.state.phase,'opening');assert.equal(f.audio.enabled,true);});
test('reported timeout then audible late BGM releases title without muting or replacing media',async()=>{const f=fixture();await f.finish('failed');assert.equal(f.state.musicReady,false);assert.equal(f.ids.get('continue-silent').hidden,false);Object.assign(f.media,{readyState:4,paused:false,currentTime:28});f.update();assert.equal(f.state.musicReady,true);assert.equal(f.ids.get('audio-wait').hidden,true);assert.equal(f.ids.get('continue-silent').hidden,true);f.click('start');assert.equal(f.state.phase,'opening');assert.equal(f.media.currentTime,28);assert.equal(f.audio.musicPlayers.pumpoko.audio,f.media);assert.equal(f.audio.enabled,true);});
test('actual playing current-data stream is sufficient; current data without playback is not',async()=>{const f=fixture();await f.finish('failed');f.media.readyState=2;f.update();assert.equal(f.state.musicReady,false);f.media.paused=false;f.update();assert.equal(f.state.musicReady,true);});
test('stale fallback click rechecks recovered media before disabling working BGM',async()=>{const f=fixture();await f.finish('failed');Object.assign(f.media,{readyState:3,paused:false});f.click('continue-silent');assert.equal(f.audio.enabled,true);assert.equal(f.media.paused,false);assert.equal(f.state.musicReady,true);});
test('real error keeps bounded failure fallback; explicit silence and re-enable still work',async()=>{const f=fixture();await f.finish('failed');Object.assign(f.media,{readyState:4,error:{code:3}});f.update();assert.equal(f.state.musicReady,false);f.click('continue-silent');assert.equal(f.audio.enabled,false);assert.equal(f.state.musicReady,true);assert.equal(f.ids.get('sound').attrs['aria-pressed'],'false');f.click('start');assert.equal(f.state.phase,'opening');f.click('sound');assert.equal(f.audio.enabled,true);assert.equal(f.ids.get('sound').attrs['aria-pressed'],'true');});
test('late promise failure cannot relock recovered BGM; return to title retains readiness',async()=>{const f=fixture();Object.assign(f.media,{readyState:3,paused:false});f.update();assert.equal(f.state.musicReady,true);await f.finish('failed');assert.equal(f.state.musicReady,true);f.click('start');f.state.phase='title';f.update();assert.equal(f.state.musicReady,true);assert.equal(f.audio.enabled,true);});
test('actual Engine media timeout resolves failure, later canplay retains BGM and releases the real app gate',async()=>{
 const {Target}=require('./harness.cjs'),timers=new Map(),ids=new Map();let serial=0,config;
 for(const id of ['title','title-controls','start','rest','status','audio-wait','continue-silent','gameCanvas','sound'])ids.set(id,new Target());
 class Media extends Target{constructor(src){super();Object.assign(this,{src,readyState:0,error:null,paused:true,currentTime:12});}load(){}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
 const state={phase:'title',world:{phase:'surface',time:0},prologue:{}};
 const w={window:null,console:{warn(){},log(){},error(){}},performance:{now:()=>0},Audio:Media,setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id),localStorage:{getItem:()=>null,setItem(){}},URLSearchParams,location:{search:''},document:{hidden:false,getElementById:id=>ids.get(id)},addEventListener(){},FruitLabPhysics:{clearInput(){}},PumpokoPrologue:{allLoose:()=>true,release(){}},PumpokoStory:{create:()=>state,start:s=>{if(s.musicReady)s.phase='opening';},update:()=>[]}};w.window=w;
 vm.runInNewContext(fs.readFileSync(process.env.PUMPOKO_ENGINE_SOURCE||__dirname+'/../../../engine/sukimastock-engine.v0.3.0.js','utf8'),w);
 const audio=w.SSE.audio;w.SSE.createApp=c=>{config=c;audio.configure(c.audio);};
 w.SSE.input.reset=()=>{};w.SSE.input.actionPressed=()=>false;w.SSE.input.action=()=>false;
 vm.runInNewContext(source(),w);config.setup();await settle();
 const media=audio.musicPlayers.pumpoko.audio;assert.equal(state.musicReady,false);
 const timeout=[...timers.values()].find(t=>t.ms===15000);assert.ok(timeout,'existing Engine bounds media wait at 15 seconds');timeout.fn();await settle();await settle();
 assert.equal(audio.resourceState('pumpoko').status,'failed');assert.equal(ids.get('continue-silent').hidden,false);assert.equal(state.musicReady,false);
 media.readyState=4;media.emit('canplay');ids.get('start').emit('click',{isTrusted:true});await settle();
 assert.equal(audio.musicPlayers.pumpoko.audio,media);assert.equal(media.paused,false);config.scenes.journey.update(0);
 assert.equal(state.musicReady,true);assert.equal(ids.get('audio-wait').hidden,true);ids.get('start').emit('click',{isTrusted:true});assert.equal(state.phase,'opening');assert.equal(audio.enabled,true);assert.equal(media.currentTime,12);
});
test('only the three authorized music gate edits differ from current audit base',()=>{const base=cp.execFileSync('git',['show',BASE+':works/pumpoko/app.js'],{encoding:'utf8'});assert.equal(undoMusicRepair(source()),base);});
}
