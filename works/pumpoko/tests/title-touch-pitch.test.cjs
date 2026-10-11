'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {harness}=require('./harness.cjs');
const BASE='bcc63951c021e41cf0eb724f079ac043e4d66739';
const filename=path.join(__dirname,'..','app.js');
const current=fs.readFileSync(filename,'utf8');
const previous=execFileSync('git',['show',BASE+':works/pumpoko-02/app.js'],{encoding:'utf8'});
const oldTitleKeyboard="if(state.phase==='title'&&root.SSE.input.actionPressed('start')){S.start(state);root.SSE.audio.play('shell');}";
const oldTitlePointer="if(t.state===root.BEGAN){pointer=t.id;root.SSE.audio.play('shell');}";
const newTitleKeyboard=oldTitleKeyboard.replace("play('shell')","play('shell',{playbackRate:.82})");
const newTitlePointer=oldTitlePointer.replace("play('shell')","play('shell',{playbackRate:.82})");

test('scope lock: exactly the two title gesture shell invocations changed, no volume or event routing change',()=>{
 assert.ok(previous.includes(oldTitleKeyboard),'exact prior keyboard title shell');
 assert.ok(previous.includes(oldTitlePointer),'exact prior pointer title shell');
 assert.equal(current,previous.replace(oldTitleKeyboard,newTitleKeyboard).replace(oldTitlePointer,newTitlePointer),
   'no other change whatsoever in app.js');
 assert.ok(current.includes("shell:{file:'./audio/shell.wav',mode:'buffer',volume:root.SSE.audio.baseline().reference.se.soft}"),
   'same shared sample and volume');
 assert.ok(current.includes("root.SSE.audio.play(e.type==='seat'?'shell':name,"),
   'original sound dispatch for handoff/seat untouched');
});

function listen(h){
 const items=[],old=h.w.SSE.audio.play;
 h.w.SSE.audio.play=(name,opts)=>{items.push({name,opts});return old.call(h.w.SSE.audio,name,opts)};
 return items;
}

test('title canvas touch plays the existing shell only with rate .82 and no new volume',()=>{
 const h=harness(),played=listen(h);
 assert.equal(h.probe().phase,'title');
 h.pointer('pointerdown',500,380);
 assert.ok(h.probe().prologue.held,'title object was touched');
 assert.ok(played.some(e=>e.name==='shell'&&e.opts?.playbackRate===.82));
 const playedShell=played.find(e=>e.name==='shell');
 assert.equal(playedShell.opts.volume,undefined,'volume remains the same default');
 assert.deepEqual(h.errors,[]);
});

test('title keyboard start uses matching .82 shell with normal default volume',()=>{
 const h=harness(),played=listen(h);
 assert.equal(h.probe().phase,'title');
 h.key('keydown','Space');h.frame();
 assert.ok(played.some(e=>e.name==='shell'&&e.opts?.playbackRate===.82));
 assert.equal(played.find(e=>e.name==='shell').opts.volume,undefined);
 assert.deepEqual(h.errors,[]);
});
