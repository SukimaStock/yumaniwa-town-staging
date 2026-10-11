'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('./dynamics.js'),J=require('./journey.js');
function harness(real=false){
 let config,s;const plays=[];
 const journey={...J,create(...args){s=J.create(...args);s.seeds.forEach(p=>{p.testGround=true;p.vy=0;});return s;},
 update(state,dt){if(real)J.update(state,dt);else state.time+=dt;},jump:{...J.jump,contact:(s,p)=>real?J.jump.contact(s,p):({landing:p.testGround})}};
 const c={console,BEGAN:'BEGAN',MOVING:'MOVING',ENDED:'ENDED',CANCELLED:'CANCELLED',location:{search:'?dev=1&stage=1'},URLSearchParams,document:{hidden:false},PumpkinDynamics:D,PumpkinJourney:journey,
 SUKIMASTOCK_WORK:{id:'pumpoko',logicalWidth:390,logicalHeight:740,frameRate:60},
 SSE:{createApp:v=>config=v,lifecycle:{paused:false},audio:{enabled:true,withBaseline:v=>v,baseline:()=>({reference:{bgm:{active:.225},se:{action:.46,soft:.24}}}),play:n=>plays.push({name:n,at:s.time})},input:{action:()=>false,actionPressed:()=>false}}};c.window=c;
 vm.runInNewContext(fs.readFileSync(__dirname+'/sketch.js','utf8'),c);
 const scene=config.scenes.main;
 return {s,c,config,scene,plays,step(n=1){for(let i=0;i<n;i++)scene.update(1/60);},flight(n=9){s.seeds.forEach((p,i)=>{p.testGround=i>=n;p.vy=i<n?120:0;});this.step(12);},land(){s.seeds.forEach(p=>p.testGround=true);this.step();}};
}
test('nine synchronous substantial landings make one don; stationary contacts and short hops are silent',()=>{
 const h=harness();h.step(60);assert.equal(h.plays.length,0);h.flight();h.land();assert.deepEqual(h.plays.map(p=>p.name),['drumDon']);h.step(60);assert.equal(h.plays.length,1);
 h.s.seeds[0].testGround=false;h.s.seeds[0].vy=120;h.step(3);h.land();assert.equal(h.plays.length,1);
});
test('near-simultaneous staggered landings coalesce; a later separate landing can sound',()=>{
 const h=harness();h.flight();h.s.seeds[0].testGround=true;h.step();h.s.seeds[1].testGround=true;h.step(2);assert.equal(h.plays.length,1);h.step(24);h.s.seeds[2].testGround=true;h.step();assert.equal(h.plays.length,2);
});
test('jump gestures and repeated assist increments stay silent',()=>{
 const h=harness();h.step();for(let i=0;i<60;i++){for(const p of h.s.seeds)p.assist.count++;h.step();}assert.equal(h.plays.length,0);
});
for(const mode of ['mute','hidden','paused'])test(mode+' consumes movement without sound or recovery replay',()=>{
 const h=harness();const set=v=>{if(mode==='mute')h.c.SSE.audio.enabled=!v;else if(mode==='hidden')h.c.document.hidden=v;else h.c.SSE.lifecycle.paused=v;};
 set(true);h.flight();for(const p of h.s.seeds)p.assist.count++;h.land();assert.equal(h.plays.length,0);set(false);h.step(60);assert.equal(h.plays.length,0);h.flight();h.land();assert.equal(h.plays.length,1);
});
test('lost seeds, unfolding and ending do not sound',()=>{
 const h=harness();h.s.seeds.forEach(p=>p.lost=true);h.flight();h.land();h.s.seeds.forEach(p=>p.assist.count++);h.step();assert.equal(h.plays.length,0);
 const a=harness();a.s.transition={settled:false};a.flight();a.land();assert.equal(a.plays.length,0);
 const e=harness();e.s.result={};e.s.ending={};e.flight();e.land();assert.equal(e.plays.length,0);
});
test('new samples are short mono PCM with quiet soft-bus gains; BGM configuration stays intact',()=>{
 const h=harness();assert.equal(h.config.audio.music.pumpoko.volume,.225);assert.equal(h.config.audio.sounds.drumDon.volume,.24);assert.equal(h.config.audio.sounds.drumChit,undefined);
 for(const name of ['don']){const b=fs.readFileSync(__dirname+'/audio/drum-'+name+'.wav');assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(34),16);assert.ok(b.readUInt32LE(40)/88200<=.17);let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));assert.ok(peak>0&&peak<32767);}
});

test('real held-input nine-seed journey emits sparse percussion without changing the successful route',()=>{
 const h=harness(true),Route=require('./fixtures/momentum-route.cjs'),input=Route.create('prologue');
 h.scene.touch({state:'BEGAN',id:1,x:195,y:375});let released=false;
 for(let i=0;i<150*60&&!h.s.result;i++){
  if(!released&&i%2===0){const v=input(h.s);h.scene.touch({state:'MOVING',id:1,x:195+v.x*210,y:375-v.y*210});}
  if(!released&&Math.min(...h.s.seeds.map(p=>p.x))>J.END.left+70){h.scene.touch({state:'ENDED',id:1,x:195,y:375});released=true;}
  h.step();
 }
 assert.equal(h.s.arrivals.length,9);const dons=h.plays.filter(e=>e.name==='drumDon'),chits=h.plays.filter(e=>e.name==='drumChit');
 assert.ok(dons.length>0&&dons.length<45,`don count ${dons.length}`);assert.equal(chits.length,0);
 for(let i=1;i<dons.length;i++)assert.ok(dons[i].at-dons[i-1].at>=.35-1e-9);
 const count=h.plays.length;h.step(60);assert.equal(h.plays.length,count,'growth does not add drums');
 console.log(`real route: 9 arrivals, ${dons.length} don, ${chits.length} chit in ${h.s.time.toFixed(1)}s`);
});
