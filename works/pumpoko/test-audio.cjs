'use strict';
// Canonical Engine + real work/scene integration, with a simulated media clock.
// These checks establish playback state, not audible output or device behavior.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const D = require('./dynamics.js'), J = require('./journey.js');
const tick = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
function harness(options = {}) {
  const media = [], saved = options.saved || new Map(), timers = new Map();
  let config, journey, serial = 0; const plays=[];
  class Target {
    constructor(tagName = 'DIV') { this.tagName = tagName; this.handlers = new Map(); this.hidden = true; this.complete = true; this.naturalWidth = 2064; }
    addEventListener(type, fn) { if (!this.handlers.has(type)) this.handlers.set(type, []); this.handlers.get(type).push(fn); }
    emit(type, extra = {}) { const e = { isTrusted: true, isPrimary: true, button: 0, target: this, ...extra }; for (const fn of this.handlers.get(type) || []) fn(e); }
    setAttribute() {} getAttribute() { return null; }
    getContext() { return context; }
  }
  const context = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
  const node = () => ({ gain: { value: 1, setValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {}, start() {}, stop() {} });
  class Context {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    createGain() { return node(); } createMediaElementSource() { return node(); } createBufferSource() { return node(); }
    resume() { this.state = 'running'; return Promise.resolve(); } suspend() { this.state = 'suspended'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ length: 8, numberOfChannels: 1, sampleRate: 48000, getChannelData: () => new Float32Array(8) }); }
  }
  class Media extends Target {
    constructor(src) { super('AUDIO'); this.src = src; this.readyState = 0; this.error = null; this.paused = true; this.currentTime = 0; this.duration = 53.56; this.loops = 0; this.plays = 0; media.push(this); }
    removeEventListener(type, fn) { this.handlers.set(type, (this.handlers.get(type) || []).filter(f => f !== fn)); }
    load() { if (options.fail) { this.error = { code: 4 }; this.emit('error'); } else { this.readyState = 4; this.emit('canplay'); } }
    play() { this.plays++; if (options.fail || options.denied) return Promise.reject(new Error('play denied')); this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    advance(dt) { if (this.paused) return; this.currentTime += dt; if (this.loop) { this.loops += Math.floor(this.currentTime / this.duration); this.currentTime %= this.duration; } }
  }
  const w = new Target(); Object.assign(w, { console, URLSearchParams, location: { search: '?dev=1' },
    performance: { now: () => 100 }, setTimeout: fn => { timers.set(++serial, fn); return serial; }, clearTimeout: id => timers.delete(id),
    Audio: Media, AudioContext: Context, fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
    PumpkinDynamics: D, PumpkinJourney: { ...J, create(...args) { journey = J.create(...args); return journey; } },
    BEGAN: 'BEGAN', MOVING: 'MOVING', ENDED: 'ENDED', CANCELLED: 'CANCELLED' });
  w.window = w;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../engine/sukimastock-engine.v0.3.0.js'), 'utf8'), w);
  const elements = new Map(); w.document = { hidden: false, body: { appendChild() {} },
    getElementById(id) { if (!elements.has(id)) elements.set(id, new Target()); return elements.get(id); }, createElement: () => new Target() };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'work-config.js'), 'utf8'), w);
  w.SSE.createApp = value => { config = value; };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'sketch.js'), 'utf8'), w);
  const playSE=w.SSE.audio.play.bind(w.SSE.audio);w.SSE.audio.play=(name,...args)=>{plays.push(name);return playSE(name,...args);};
  w.SSE.audio.configure(config.audio); w.SSE.input.configureKeyboard(config.keyboard); config.setup();
  return { w, audio: w.SSE.audio, config, scene: config.scenes.main, elements, media, saved,
    plays, get journey() { return journey; }, get track() { return media[0]; },
    pointer(extra) { elements.get('gameCanvas').emit('pointerdown', extra); },
    key(extra = {}) { w.emit('keydown', { code: 'ArrowRight', key: 'ArrowRight', ...extra }); },
    toggle() { elements.get('sound-toggle').emit('click'); },
    advance(seconds) { for (let i = 0; i < seconds * 60; i++) { config.scenes.main.update(1 / 60); media[0].advance(1 / 60); } },
  };
}
test('preload is silent; only primary trusted pointer or bound non-editable keyboard starts BGM', async () => {
  const h = harness(); await tick(); assert.equal(h.audio.resourceState('pumpoko').status, 'ready');
  assert.equal(h.track.plays, 0); assert.equal(h.track.paused, true);
  h.pointer({ isTrusted: false }); h.pointer({ isPrimary: false }); h.pointer({ button: 2 });
  h.key({ code: 'KeyQ', key: 'q' }); h.key({ repeat: true }); h.key({ target: { tagName: 'INPUT' } });
  assert.equal(h.track.plays, 0); h.pointer(); h.advance(2);
  assert.equal(h.track.paused, false); assert.ok(h.track.currentTime > 1.9);
  h.scene.touch({ id: 1, state: 'BEGAN', x: 195, y: 375 }); assert.equal(h.w.PumpkinProbe().held, true);
  for (let i = 0; i < 10; i++) h.pointer(); assert.equal(h.media.length, 1); assert.ok(h.track.currentTime > 1.9);
  const k = harness(); k.key(); assert.equal(k.track.paused, false);
});
test('normal simulated scene flow keeps the identical track/time across prologue, zoom and journey', () => {
  const h = harness(); h.key(); const player = h.track, seen = new Set();
  h.w.SSE.input.keysDown.add('ArrowRight'); h.w.SSE.input.keysDown.add('ArrowDown');
  for (let i = 0; i < 40 * 60; i++) { h.scene.update(1 / 60); player.advance(1 / 60); seen.add(h.w.PumpkinProbe().mode); }
  assert.deepEqual([...seen], ['prologue', 'transition', 'journey']);
  assert.equal(h.media.length, 1); assert.equal(h.track, player); assert.ok(player.currentTime > 39.9); assert.equal(player.plays, 1);
});
for (const ending of ['goal', 'all-lost']) test(ending + ' fixture and replay retain the same media position', () => {
  const h = harness(); h.key(); h.w.SSE.input.keysDown.add('ArrowRight'); h.w.SSE.input.keysDown.add('ArrowDown'); h.advance(35);
  h.w.SSE.input.reset(); const s = h.journey; assert.ok(s); s.result=s.ending=null;s.finished=s.replayReady=false;s.arrivals=[];for(const p of s.seeds){p.arrival=null;p.soilTime=0;}
  // Explicit end-state injection: tests audio continuity at both waiting screens,
  // not the player's ability to complete the whole level.
  if (ending === 'goal') for (const p of s.seeds) { p.lost = p.inactive = false; p.x = (J.END.left + J.END.right) / 2; p.y = s.geometry.floor(p.x).y - J.support(p, 0, 1); p.vx = p.vy = 0; }
  else for (const p of s.seeds) p.lost = true;
  h.advance(16); assert.equal(h.elements.has('again'), false);
  const old = h.track.currentTime;
  assert.equal(h.w.PumpkinProbe().mode, 'prologue'); assert.equal(h.track.currentTime, old);
  h.advance(2); assert.ok(h.track.currentTime > old + 1.9); assert.equal(h.media.length, 1); assert.equal(h.track.plays, 1);
});
test('mute pauses BGM and suppresses SE; ON resumes without seek; stored OFF survives reload', async () => {
  const h = harness(); h.pointer(); h.advance(5); const old = h.track.currentTime;
  h.toggle(); h.advance(2); assert.equal(h.track.currentTime, old); assert.equal(h.track.paused, true); assert.equal(h.audio.play('seed'), false);
  h.pointer(); assert.equal(h.track.paused, true); h.toggle(); h.advance(1); assert.ok(h.track.currentTime > old + .9);
  h.toggle(); const reloaded = harness({ saved: h.saved }); await tick(); reloaded.pointer(); reloaded.key();
  assert.equal(reloaded.audio.enabled, false); assert.equal(reloaded.track.plays, 0);
  reloaded.toggle(); assert.equal(reloaded.track.paused, false); assert.equal(reloaded.media.length, 1);
});
test('canonical lifecycle pauses/resumes the same timeline and stays silent if OFF', () => {
  const h = harness(); h.pointer(); h.advance(4); const old = h.track.currentTime;
  h.w.document.hidden = true; h.w.SSE.lifecycle.pause('hidden'); h.track.advance(3); h.pointer();
  assert.equal(h.track.currentTime, old); assert.equal(h.track.paused, true);
  h.w.document.hidden = false; h.w.SSE.lifecycle.resume('hidden'); h.advance(1); assert.ok(h.track.currentTime > old + .9);
  h.w.SSE.lifecycle.pause('pagehide'); h.toggle(); h.w.SSE.lifecycle.resume('pagehide'); assert.equal(h.track.paused, true); assert.equal(h.media.length, 1);
});
test('full-file loop crosses the media-clock boundary without another player or play call', () => {
  const h = harness(); h.pointer(); h.track.advance(54); assert.equal(h.track.loops, 1); assert.ok(h.track.currentTime > .4 && h.track.currentTime < .5);
  h.track.advance(54); assert.equal(h.track.loops, 2); assert.equal(h.track.plays, 1); assert.equal(h.media.length, 1); assert.equal(h.track.paused, false);
});
test('media failure remains in Engine diagnostics while game update and input keep working', async () => {
  const h = harness({ fail: true }); await tick(); const r = h.audio.resourceState('pumpoko'); assert.equal(r.status, 'failed'); assert.ok(r.reason);
  h.pointer(); h.scene.touch({ id: 1, state: 'BEGAN', x: 195, y: 375 }); h.scene.touch({ id: 1, state: 'MOVING', x: 250, y: 350 }); h.advance(1);
  assert.equal(h.w.PumpkinProbe().seedCount, 9); assert.ok(h.w.PumpkinProbe().tilt[0] > .1); assert.equal(h.audio.resourceState('pumpoko').status, 'failed');
});

test('ordinary collisions/grab/knock are silent; only real Stage0 detach emits fiber',()=>{
  const h=harness();h.scene.touch({id:1,state:'BEGAN',x:195,y:375});h.scene.touch({id:1,state:'ENDED',x:195,y:375});h.advance(2);assert.equal(h.plays.length,0);assert.ok(h.w.PumpkinProbe().impacts>0);
  h.w.SSE.input.keysDown.add('ArrowRight');h.w.SSE.input.keysDown.add('ArrowDown');h.advance(40);
  assert.ok(h.plays.length>0);assert.ok(h.plays.every(n=>n==='fiber'));assert.equal(h.w.PumpkinProbe().loose,9);
});
test('ending growth receives only active update time and resumes without audio replay burst',()=>{
  const h=harness();h.key();h.w.SSE.input.keysDown.add('ArrowRight');h.w.SSE.input.keysDown.add('ArrowDown');h.advance(35);h.w.SSE.input.reset();
  const s=h.journey;s.result=s.ending=null;s.finished=s.replayReady=false;s.arrivals=[];s.seeds.forEach((p,i)=>{p.arrival=null;p.soilTime=0;p.lost=p.inactive=i>0;if(!i){p.x=1900;p.y=s.geometry.floor(p.x).y-J.support(p,0,1);p.vx=p.vy=0;}});h.advance(1);assert.ok(s.result);const elapsed=s.ending.elapsed,pos=h.track.currentTime,plays=h.plays.length;
  h.w.SSE.lifecycle.pause('hidden');h.track.advance(30);assert.equal(s.ending.elapsed,elapsed);assert.equal(h.track.currentTime,pos);h.w.SSE.lifecycle.resume('hidden');h.advance(1);assert.ok(s.ending.elapsed>elapsed+.9);assert.equal(h.plays.length,plays);assert.equal(h.media.length,1);assert.ok(h.track.currentTime>pos+.9);
  // Engine frame dispatcher (unchanged) gates scene updates while paused. This
  // harness supplies no work updates in the hidden interval, as that gate does.
});
test('normal simulated run grows once, reject new tilts, and replay resets growth without music seek',()=>{
  const h=harness();h.key();h.w.SSE.input.keysDown.add('ArrowRight');h.w.SSE.input.keysDown.add('ArrowDown');h.advance(12);h.w.SSE.input.reset();h.scene.touch({id:2,state:'BEGAN',x:195,y:375});h.scene.touch({id:2,state:'MOVING',x:253.8,y:433.8});h.advance(42);h.scene.touch({id:2,state:'ENDED',x:253.8,y:433.8});for(let i=0;i<30*60&&!h.journey?.replayReady;i++)h.advance(1/60);const s=h.journey;
  assert.ok(s.result&&s.result.arrivals.length>0&&s.replayReady);const result=s.result,elapsed=s.ending.elapsed,old=h.track.currentTime;
  h.scene.touch({id:10,state:'BEGAN',x:190,y:375});h.scene.touch({id:10,state:'MOVING',x:300,y:200});h.advance(1);assert.equal(s.result,result);assert.equal(s.held,false);assert.ok(s.ending.elapsed>elapsed);assert.equal(h.media.length,1);
  h.advance(7);const p=h.w.PumpkinProbe();assert.equal(p.mode,'prologue');assert.equal(p.arrived,0);assert.equal(p.plants,0);assert.equal(p.loose,3);assert.equal(p.ending,null);assert.ok(!p.replayReady);assert.equal(h.w.SSE.input.keysDown.size,0);assert.ok(h.track.currentTime>=old);assert.equal(h.track.plays,1);
});

for(const count of [1,9])test(count+' grown fruits automatically reconnect to title without replacing, pausing or seeking music',()=>{
  const h=harness();h.key();h.w.SSE.input.keysDown.add('ArrowRight');h.w.SSE.input.keysDown.add('ArrowDown');h.advance(35);h.w.SSE.input.reset();
  const s=h.journey;s.result=s.ending=null;s.finished=s.replayReady=false;s.arrivals=[];
  s.seeds.forEach((p,i)=>{p.arrival=null;p.soilTime=0;p.lost=p.inactive=i>=count;if(i<count){p.x=1830+i*24;p.y=s.geometry.floor(p.x).y-J.support(p,s.geometry.floor(p.x).nx,s.geometry.floor(p.x).ny);p.vx=p.vy=0;}});
  h.advance(7.2);assert.ok(s.result&&s.replayReady);assert.equal(h.elements.has('again'),false);
  h.advance(2.8);assert.equal(s.ending.phase,'zoom');assert.equal(h.elements.has('again'),false);const player=h.track,pos=player.currentTime;
  h.advance(2.5);assert.equal(s.ending.phase,'connecting');assert.equal(h.w.PumpkinProbe().mode,'journey');
  h.advance(1.5);const p=h.w.PumpkinProbe();assert.equal(p.mode,'prologue');assert.equal(p.plants,0);assert.equal(p.loose,3);assert.equal(p.ending,null);assert.equal(h.elements.has('again'),false);assert.equal(h.media.length,1);assert.equal(h.track,player);assert.ok(player.currentTime>pos+3.9);assert.ok(!player.paused);assert.equal(player.plays,1);
});
