'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const repo=process.env.PUMPOKO_START_REPO||path.resolve(__dirname,'../../..');
const {harness}=require(path.join(repo,'works/pumpoko/tests/harness.cjs'));
const tick=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
async function blocked(){
 const h=harness(),a=h.w.SSE.audio;await tick();
 h.canvas.emit('pointerdown',{pointerId:1,clientX:200,clientY:400,button:0,isPrimary:true});await tick();
 const player=a.musicPlayers.pumpoko,media=player.audio;
 assert.equal(media.paused,false);assert.equal(a.ctx.state,'running');
 h.doc.hidden=true;h.doc.emit('visibilitychange');await tick();assert.equal(media.paused,true);assert.equal(a.ctx.state,'suspended');
 let resumes=0,resolveOld;
 a.ctx.resume=()=>{resumes++;if(resumes===1)return new Promise(resolve=>{resolveOld=resolve;});a.ctx.state='running';return Promise.resolve();};
 h.doc.hidden=false;h.doc.emit('visibilitychange');await tick();assert.equal(resumes,1);assert.equal(media.paused,true);
 return {h,a,media,plays:media.plays,get resumes(){return resumes;},settleOld:()=>resolveOld()};
}
test('native trusted Start retries a blocked lifecycle context and starts only one retained BGM',async()=>{
 const f=await blocked(),{h,a,media,plays}=f;
 // Emit the native button directly: no canvas/key SSE.input.userGesture runs.
 h.ids.get('start').emit('click',{isTrusted:true});await tick();
 assert.equal(f.resumes,2,'Start enters explicit gesture retry');assert.equal(a.ctx.state,'running');assert.equal(media.paused,false);assert.equal(media.plays,plays+1);
 assert.equal(a.musicPlayers.pumpoko.audio,media);f.settleOld();await tick();assert.equal(media.plays,plays+1,'late old request does not duplicate playback');
 h.ids.get('start').emit('click',{isTrusted:true});await tick();assert.equal(f.resumes,2);assert.equal(media.plays,plays+1);
});
for(const condition of ['synthetic','hidden','paused','muted'])test(condition+' native Start never enters gesture unlock',async()=>{
 const f=await blocked(),{h,a,media,plays}=f;let unlocks=0;const unlock=a.unlock.bind(a);a.unlock=(...args)=>{unlocks++;return unlock(...args);};
 if(condition==='hidden')h.doc.hidden=true;
 if(condition==='paused')h.w.SSE.lifecycle.pause('fixture');
 if(condition==='muted')a.setEnabled(false);
 h.ids.get('start').emit('click',{isTrusted:condition!=='synthetic'});await tick();
 assert.equal(unlocks,0);assert.equal(f.resumes,1);assert.equal(media.plays,plays);assert.equal(media.paused,true);
});
test('native Start fix changes only one authorized runtime line from the current base',()=>{
 const source=require('./music-gate.test.cjs').undoMusicRepair(fs.readFileSync(path.join(repo,'works/pumpoko/app.js'),'utf8')),line='        root.SSE.audio.unlock();\n';
 assert.equal(source.split(line).length,2,'one explicit beginMusic unlock insertion');
 const before=cp.execFileSync('git',['show','172029ccde101f590ff261fb23efdf62d16595ce:works/pumpoko/app.js'],{cwd:repo,encoding:'utf8'});
 assert.equal(source.replace(line,''),before,'all other app behavior stays exact');
});
