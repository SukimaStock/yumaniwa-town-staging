'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./harness.cjs');
test('real canonical Engine/Codea boots, draws and keeps one RAF through 100 switches',()=>{
 const h=harness();const initial=h.canvas.count()+h.w.count();for(let i=0;i<100;i++){h.modes[i%3].emit('click');h.frame();assert.equal(h.raf.size,1)}assert.equal(h.canvas.count()+h.w.count(),initial);assert.deepEqual(h.errors,[]);
});
test('touch left/right and crossing the centre is common to both fruits; touch overrides keys',()=>{
 for(const mode of [0,1]){const h=harness();h.modes[mode].emit('click');h.key('keydown','ArrowLeft');h.pointer('pointerdown',800);h.advance(.5);assert.ok(h.probe().axis>.9);h.pointer('pointermove',200);h.advance(.5);assert.ok(h.probe().axis<-.9);h.pointer('pointerup',200);h.key('keyup','ArrowLeft');h.advance(1);assert.ok(Math.abs(h.probe().axis)<.01);assert.deepEqual(h.errors,[])}
});
for(const interrupt of ['pointercancel','blur','pagehide','resize'])test(interrupt+' clears axis/capture without stale input on resume',()=>{
 const h=harness();h.pointer('pointerdown');h.key('keydown');h.advance(.2);
 if(interrupt==='pointercancel'){h.pointer(interrupt);h.key('keyup')}else h.w.emit(interrupt);
 if(interrupt==='pagehide')h.w.emit('pageshow');if(interrupt==='blur')h.w.emit('focus');
 h.advance(.4);assert.equal(h.probe().pointer,null);assert.ok(Math.abs(h.probe().axis)<.01);assert.equal(h.captures.size,0);assert.deepEqual(h.errors,[]);
});
test('quick taps between frames still restart a resting rutabaga',()=>{
 const h=harness();h.modes[1].emit('click');h.advance(15);const y=h.probe().rutabaga.y;h.pointer('pointerdown');h.pointer('pointerup');h.advance(.2);assert.ok(h.probe().rutabaga.y>y+10);
});
test('reset preserves tuned settings; defaults resets values; panel pauses and closing releases input',()=>{
 const h=harness();h.pointer('pointerdown');h.advance(.5);h.ids.get('tune').emit('click');const time=h.probe().time;h.advance(2);assert.equal(h.probe().time,time);assert.equal(h.probe().panel,true);
 const slider=h.ids.get('sliders').children[0].children[1].children[2];slider.value='4';slider.emit('input');assert.equal(h.probe().settings.pumpkin.mass,4);
 h.ids.get('close-tune').emit('click');h.ids.get('reset').emit('click');assert.equal(h.probe().settings.pumpkin.mass,4);assert.equal(h.probe().pumpkin.x,0);
 h.ids.get('defaults').emit('click');assert.equal(h.probe().settings.pumpkin.mass,2.4);assert.equal(h.probe().axis,0);assert.deepEqual(h.errors,[]);
});
test('editable slider keydown cannot drive fruit; keyboard R resets, mode buttons reflect selection',()=>{
 const h=harness();h.key('keydown','ArrowRight',{tagName:'INPUT'});h.advance(.2);assert.equal(h.probe().pumpkin.x,0);
 h.key('keydown');h.advance(.5);assert.ok(h.probe().pumpkin.x>10);h.key('keyup');h.key('keydown','KeyR');h.frame();assert.equal(h.probe().pumpkin.x,0);
 h.modes[2].emit('click');assert.equal(h.probe().mode,'handoff');assert.equal(h.modes[2].getAttribute('aria-pressed'),'true');
});
test('live Engine scene transfers to rutabaga under the same held pointer, camera never cuts',()=>{
 const h=harness();h.modes[2].emit('click');h.pointer('pointerdown');let last=h.probe().camera,changed=false;for(let i=0;i<240;i++){h.frame();const p=h.probe();if(p.handoffs)changed=true;assert.ok(Math.hypot(p.camera.x-last.x,p.camera.y-last.y)<2);last=p.camera}assert.ok(changed);assert.equal(h.probe().active,'rutabaga');assert.ok(h.probe().axis>.9);assert.deepEqual(h.errors,[]);
});
test('contact sound is bounded and mute prevents tones, no background catch-up bursts',()=>{
 const h=harness();h.pointer('pointerdown');h.advance(4);assert.ok(h.tones.length>0&&h.tones.length<10);for(let i=1;i<h.tones.length;i++)assert.ok(h.tones[i].at-h.tones[i-1].at>=.13);
 h.ids.get('sound').emit('click');const n=h.tones.length;h.advance(3);assert.equal(h.tones.length,n);h.w.emit('pagehide');h.advance(20);h.w.emit('pageshow');h.advance(.1);assert.equal(h.tones.length,n);assert.deepEqual(h.errors,[]);
});
