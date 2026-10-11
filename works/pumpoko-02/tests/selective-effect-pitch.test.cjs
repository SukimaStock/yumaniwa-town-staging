'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm'),{execFileSync}=require('node:child_process'),path=require('node:path');

const BASE='b75cb70193342ede787e714d5068180318acbadc';
const pathToApp=path.join(__dirname,'..','app.js');
const current=fs.readFileSync(pathToApp,'utf8');
const previous=execFileSync('git',['show',BASE+':works/pumpoko-02/app.js'],{encoding:'utf8'});
const oldDispatch="    root.SSE.audio.play(e.type==='seat'?'shell':name,e.type==='fall'?{volume:root.SSE.audio.baseline().reference.se.soft*.35}:e.type==='seat'?{volume:root.SSE.audio.baseline().reference.se.soft*.72,playbackRate:.88}:undefined);";
const newDispatch="    const options=e.type==='fall'?{volume:root.SSE.audio.baseline().reference.se.soft*.35}:\n"+
 "      e.type==='seat'?{volume:root.SSE.audio.baseline().reference.se.soft*.72,playbackRate:.88}:\n"+
 "      e.type==='detach'||e.type==='land'&&e.kind==='rutabaga'?{playbackRate:.82}:undefined;\n"+
 "    root.SSE.audio.play(e.type==='seat'?'shell':name,options);";

test('scope guard: exactly one dispatch expression changes, no WAV/BGM/volume/other gameplay changes',()=>{
 assert.ok(previous.includes(oldDispatch),'original full event dispatch unchanged');
 assert.equal(current,previous.replace(oldDispatch,newDispatch),'only event playback options replaced');
 assert.ok(current.includes("root.SSE.audio.play('shell',{playbackRate:.82})"),
  'prior title pitch trial retained');
});

function application(){
 const samples=[],soundRequests=[];
 const state={phase:'title',world:{time:1},prologue:{time:0}};
 let nextEvents=[];
 const root={
  location:{search:''},
  document:{hidden:false},
  FruitLabPhysics:{clearInput(){}},
  PumpokoStory:{create:()=>state,update:()=>nextEvents},
  PumpokoPrologue:{allLoose:()=>false,release(){}},
  SSE:{
   audio:{enabled:true,musicPlayers:{},baseline:()=>({reference:{se:{soft:.24}}}),
     play:(name,options)=>{soundRequests.push({name,options:options===undefined?undefined:JSON.parse(JSON.stringify(options))});return true}},
   input:{actionPressed:()=>false,action:()=>0},lifecycle:{paused:false},
   createApp:config=>samples.push(config)
  }
 };
 vm.runInNewContext(current,{window:root,URLSearchParams},{filename:'works/pumpoko-02/app.js'});
 assert.equal(samples.length,1);
 function trigger(events){nextEvents=events;state.world.time+=1;samples[0].scenes.journey.update(1/60);
  const v=soundRequests.at(-1);return v;}
 return {trigger,soundRequests};
}

test('detached seed uses only lower fiber pitch; falling fiber retains its original low volume and speed',()=>{
 const h=application();
 assert.deepEqual(h.trigger([{type:'detach'}]),{name:'fiber',options:{playbackRate:.82}});
 assert.deepEqual(h.trigger([{type:'fall',kind:'pumpkin'}]),
  {name:'fiber',options:{volume:.24*.35}});
});
test('rutabaga strong landing/rebound uses only lower seed pitch; pumpkin land remains drumDon',()=>{
 const h=application();
 assert.deepEqual(h.trigger([{type:'land',kind:'rutabaga',strength:160}]),
  {name:'seed',options:{playbackRate:.82}});
 assert.deepEqual(h.trigger([{type:'land',kind:'pumpkin',strength:160}]),
  {name:'drumDon',options:undefined});
});
test('no new jump triggers; weak land, boost, handoff and goal keep the original behavior',()=>{
 const h=application();
 const start=h.soundRequests.length;
 h.trigger([{type:'boost',kind:'rutabaga',strength:230}]);
 h.trigger([{type:'land',kind:'rutabaga',strength:60}]);
 assert.equal(h.soundRequests.length,start,'no added events or sound spam');
 assert.deepEqual(h.trigger([{type:'handoff',kind:'rutabaga',strength:300}]),
  {name:'shell',options:undefined});
 assert.deepEqual(h.trigger([{type:'seat',kind:'pumpkin',strength:30}]),
  {name:'shell',options:{volume:.24*.72,playbackRate:.88}});
});
