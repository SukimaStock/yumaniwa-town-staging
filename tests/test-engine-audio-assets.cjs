'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const engine = fs.readFileSync(path.join(__dirname, '../engine/sukimastock-engine.v0.3.0.js'), 'utf8');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const buffer = () => ({ length: 8, numberOfChannels: 1, sampleRate: 44100, getChannelData: () => new Float32Array(8) });
function harness(options = {}) {
  const timers = new Map(), media = [], contexts = [];
  let serial = 0, fetches = 0, decodes = 0, resumes = 0;
  const param = () => ({ value: 1, setValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), playbackRate: param(), connect() {}, disconnect() {}, start() {}, stop() {} });
  class Context {
    constructor() { this.state = options.contextState || 'suspended'; this.currentTime = 0; this.destination = {}; contexts.push(this); }
    createGain() { return node(); }
    createOscillator() { return node(); }
    createBufferSource() { return node(); }
    createMediaElementSource() { return node(); }
    resume() { resumes++; if (options.resumeThrows) throw new Error('resume denied'); return options.resumeReject ? Promise.reject(new Error('autoplay denied')) : Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    decodeAudioData(data) { decodes++; return options.decode ? options.decode(data) : Promise.resolve(buffer()); }
  }
  class Media {
    constructor(file) { this.src = file; this.readyState = 0; this.error = null; this.events = new Map(); this.paused = true; this.loads = 0; media.push(this); }
    addEventListener(type, cb) { if (!this.events.has(type)) this.events.set(type, new Set()); this.events.get(type).add(cb); }
    removeEventListener(type, cb) { this.events.get(type)?.delete(cb); }
    emit(type) { for (const cb of [...(this.events.get(type) || [])]) cb(); }
    canplay() { this.readyState = 3; this.emit('canplay'); }
    fail() { this.error = { code: 4 }; this.emit('error'); }
    load() { this.loads++; options.mediaLoad?.(this); }
    play() { this.paused = false; return options.playReject ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve(); }
    pause() { this.paused = true; }
    count() { return [...this.events.values()].reduce((n, callbacks) => n + callbacks.size, 0); }
  }
  const w = { console: { log() {}, warn() {}, error() {} }, performance: { now: () => 100 },
    setTimeout(cb) { const id = ++serial; timers.set(id, cb); return id; }, clearTimeout(id) { timers.delete(id); },
    localStorage: { getItem: () => null, setItem() {} },
    AudioContext: options.noContext ? undefined : Context,
    Audio: options.noMedia ? undefined : Media,
    fetch: options.noFetch ? undefined : (...args) => { fetches++; return options.fetch ? options.fetch(...args) : Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }); },
  };
  w.window = w;
  vm.runInNewContext(engine, w);
  const { audio, assets } = w.SSE;
  const configure = (audioOptions = {}) => {
    audio.configure(audioOptions);
    assets.configure({ items: Object.fromEntries([...Object.keys(audioOptions.sounds || {}), ...Object.keys(audioOptions.music || {})].map(name => [name, { type: 'audio', audioName: name }])) });
  };
  configure({ sounds: { effect: { file: 'effect.wav', mode: 'buffer' } } });
  return { w, audio, assets, media, contexts, timers, configure,
    timeout() { for (const [id, cb] of [...timers]) { timers.delete(id); cb(); } },
    get fetches() { return fetches; }, get decodes() { return decodes; }, get resumes() { return resumes; } };
}
function state(h, name, audioState, assetState) {
  assert.equal(h.audio.resourceState(name).status, audioState);
  if (assetState) assert.equal(h.assets.status(name), assetState);
}
function failed(h, name, expected = 'failed', reason) {
  state(h, name, expected, 'error');
  assert.ok(h.audio.resourceState(name).reason);
  assert.ok(h.assets.record(name).error);
  assert.equal(h.assets.record(name).value, null);
  if (reason) assert.match(h.audio.resourceState(name).reason, reason);
}
function clean(h) { assert.equal(h.timers.size, 0); for (const m of h.media) assert.equal(m.count(), 0); }

test('buffer starts idle, yields actual decoded resource, Audio and Asset ready', async () => {
  const h = harness(); state(h, 'effect', 'idle', 'idle');
  const result = await h.assets.load('effect');
  state(h, 'effect', 'ready', 'ready');
  assert.ok(result.getChannelData); assert.equal(result, h.audio.buffers.effect);
  assert.equal(await h.audio.loadBuffer('effect'), result); assert.equal(h.fetches, 1); assert.equal(h.decodes, 1);
});
const failureCases = [
  ['404', { fetch: async () => ({ ok: false, status: 404 }) }, /404/],
  ['network rejection', { fetch: async () => { throw new Error('network offline'); } }, /network offline/],
  ['synchronous fetch throw', { fetch: () => { throw new Error('fetch throw'); } }, /fetch throw/],
  ['malformed audio decode rejection', { decode: async () => { throw new Error('EncodingError malformed'); } }, /EncodingError/],
  ['body read rejection', { fetch: async () => ({ ok: true, arrayBuffer: async () => { throw new Error('body read'); } }) }, /body read/],
  ...[null, undefined, {}, false].map(value => ['empty/invalid decoded ' + String(value), { decode: async () => value }, /no usable AudioBuffer/]),
];
for (const [label, options, reason] of failureCases) test('buffer failure: ' + label, async () => {
  const h = harness(options); assert.equal(await h.assets.load('effect'), null);
  failed(h, 'effect', 'failed', reason); assert.equal(h.audio.buffers.effect, undefined);
  const fetches = h.fetches; assert.equal(await h.assets.load('effect'), null); assert.equal(h.fetches, fetches);
});
for (const name of ['missing', 'toString', 'constructor', '__proto__', 'tone']) test('undefined name cannot become ready or procedural fallback: ' + name, async () => {
  const h = harness(); h.assets.register(name, { audioName: name });
  assert.equal(await h.assets.load(name), null); failed(h, name, 'unavailable', /Undefined/);
  assert.equal(h.fetches, 0); assert.equal(h.contexts.length, 0);
});
test('missing audio reference produces Asset error', async () => {
  const h = harness(); h.assets.register('empty', { type: 'audio' });
  assert.equal(await h.assets.load('empty'), null); assert.equal(h.assets.status('empty'), 'error');
});
test('fetch/decode pending keeps Audio and Asset loading; concurrent calls share attempt', async () => {
  const fetched = deferred(), decoded = deferred(); const h = harness({ fetch: () => fetched.promise, decode: () => decoded.promise });
  const a = h.assets.load('effect'); const b = h.audio.loadBuffer('effect'); await tick();
  state(h, 'effect', 'loading', 'loading'); assert.ok(h.audio.loadingBuffers.effect); assert.equal(h.fetches, 1); assert.equal(h.audio.buffers.effect, undefined);
  fetched.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }); await tick();
  state(h, 'effect', 'loading', 'loading'); assert.equal(h.decodes, 1);
  decoded.resolve(buffer()); const [av, bv] = await Promise.all([a, b]); assert.equal(av, bv); assert.equal(h.audio.loadingBuffers.effect, undefined); state(h, 'effect', 'ready', 'ready');
});
for (const [label, options] of [['fetch', { noFetch: true }], ['Web Audio', { noContext: true }]]) test('unsupported buffer ' + label + ' API is unavailable', async () => {
  const h = harness(options); await h.assets.load('effect'); failed(h, 'effect', 'unavailable', /API unavailable/);
});
test('decode API missing is unavailable', async () => {
  const h = harness(); h.audio.ensureContext().decodeAudioData = undefined;
  await h.assets.load('effect'); failed(h, 'effect', 'unavailable', /decode API/);
});
test('failed buffer retries explicitly and clears old reason', async () => {
  let attempts = 0;
  const h = harness({ fetch: async () => ++attempts === 1 ? { ok: false, status: 404 } : { ok: true, arrayBuffer: async () => new ArrayBuffer(8) } });
  await h.assets.load('effect'); failed(h, 'effect');
  assert.ok(await h.assets.load('effect', { retry: true })); state(h, 'effect', 'ready', 'ready');
  assert.equal(h.audio.resourceState('effect').reason, null); assert.equal(h.assets.record('effect').error, null); assert.equal(attempts, 2);
});
test('loadBuffer preserves buffer/null promise API and explicit retry', async () => {
  let broken = true; const h = harness({ decode: async () => { if (broken) throw Error('bad'); return buffer(); } });
  assert.equal(await h.audio.loadBuffer('effect'), null); state(h, 'effect', 'failed');
  broken = false; assert.ok((await h.audio.loadBuffer('effect')).getChannelData); state(h, 'effect', 'ready');
});
for (const kind of ['sound', 'music']) {
  const setup = (h, extra = {}) => h.configure(kind === 'sound' ? { poolSize: 2, sounds: { track: 'track.mp3' }, ...extra } : { music: { track: 'track.mp3' }, ...extra });
  test(kind + ': construction and metadata are not ready; all used elements must canplay', async () => {
    const h = harness(); setup(h); state(h, 'track', 'idle', 'idle');
    const pending = h.assets.load('track'); await tick(); state(h, 'track', 'loading', 'loading');
    for (const m of h.media) { m.readyState = 1; m.emit('loadedmetadata'); m.emit('canplay'); }
    await tick(); state(h, 'track', 'loading', 'loading');
    h.media[0].canplay(); await tick();
    if (kind === 'sound') { state(h, 'track', 'loading', 'loading'); h.media[1].canplay(); }
    assert.ok(await pending); state(h, 'track', 'ready', 'ready'); clean(h);
  });
  test(kind + ': error cleans every listener and timer; retry ignores old events', async () => {
    const h = harness(); setup(h);
    const pending = h.assets.load('track'); await tick();
    const old = [...h.media], stale = [...old[0].events.get('error')]; old[0].fail();
    assert.equal(await pending, null); failed(h, 'track', 'failed', /media error/); clean(h);
    const retry = h.assets.load('track', { retry: true }); await tick();
    assert.equal(h.media.length, old.length * 2); for (const cb of stale) cb(); old[0].emit('error');
    state(h, 'track', 'loading', 'loading');
    for (const m of h.media.slice(old.length)) m.canplay();
    assert.ok(await retry); state(h, 'track', 'ready', 'ready'); assert.equal(h.audio.resourceState('track').reason, null); clean(h);
  });
  test(kind + ': unresolved media times out and explicit preload can retry', async () => {
    const h = harness(); setup(h, { mediaTimeoutMs: 20 });
    const pending = h.assets.load('track'); await tick(); h.timeout(); await pending;
    failed(h, 'track', 'failed', /timeout/); clean(h);
    const oldCount = h.media.length; const retry = h.audio.preload('track'); await tick();
    for (const m of h.media.slice(oldCount)) m.canplay();
    const values = await retry; assert.ok(values[0]); state(h, 'track', 'ready'); clean(h);
    await h.assets.load('track', { retry: true }); state(h, 'track', 'ready', 'ready');
  });
  test(kind + ': already playable media resolves without waiting for a new event', async () => {
    const h = harness(); setup(h); for (const m of h.media) m.readyState = 3;
    await h.assets.load('track'); state(h, 'track', 'ready', 'ready'); clean(h);
  });
  test(kind + ': missing HTMLAudio API is unavailable', async () => {
    const h = harness({ noMedia: true }); setup(h); await h.assets.load('track'); failed(h, 'track', 'unavailable', /API unavailable/); clean(h);
  });
}
test('synchronous media error/load failure cleans listeners and timers', async () => {
  const h = harness({ mediaLoad: () => { throw Error('media load threw'); } }); h.configure({ sounds: { track: 'track.mp3' } });
  await h.assets.load('track'); failed(h, 'track', 'failed', /load threw/); clean(h);
});
test('missing HTMLAudio event API is unavailable', async () => {
  const h = harness(); h.configure({ music: { track: 'track.mp3' } }); h.media[0].addEventListener = undefined;
  await h.assets.load('track'); failed(h, 'track', 'unavailable', /event API/); clean(h);
});
test('mixed preload resolves array without confusing settlement with success', async () => {
  const h = harness(); h.audio.definitions.bad = { file: 'bad.wav', mode: 'buffer' };
  const values = await h.audio.preload(['effect', 'missing']); assert.ok(values[0]); assert.equal(values[1], null);
  state(h, 'effect', 'ready'); state(h, 'missing', 'unavailable');
  h.assets.register('optional', { audio: 'missing', required: false });
  const result = await h.assets.preload(['effect', 'optional']);
  assert.equal(result.ok, false); assert.equal(result.ready, 1); assert.equal(result.error, 1);
  state(h, 'effect', 'ready', 'ready'); assert.equal(h.assets.status('optional'), 'error');
  assert.notEqual(h.w.SSE.runtime.state.bootStatus, 'failed');
});
test('default preload includes HTMLAudio pools and music, not just buffers', async () => {
  const h = harness(); h.configure({ poolSize: 1, sounds: { effect: { file: 'a.wav', mode: 'buffer' }, hit: 'b.wav' }, music: { track: 'c.mp3' } });
  const pending = h.audio.preload(); await tick(); for (const m of h.media) m.canplay();
  assert.equal((await pending).length, 3);
  for (const name of ['effect', 'hit', 'track']) state(h, name, 'ready'); clean(h);
});
test('strict Asset failure rejects with reason while ordinary failure resolves null', async () => {
  const h = harness({ noContext: true }); await assert.rejects(h.assets.load('effect', { strict: true }), /API unavailable/); failed(h, 'effect', 'unavailable');
});
test('explicit procedural tone is file-free; mute and zero volume do not fail readiness', () => {
  const h = harness(); assert.equal(h.audio.tone({ frequency: 440 }), true); assert.equal(h.audio.toneResource.status, 'ready');
  h.audio.setBusVolume('master', 0); h.audio.setEnabled(false);
  assert.equal(h.audio.tone({ frequency: 300 }), false); assert.equal(h.audio.toneResource.status, 'ready'); assert.equal(h.fetches, 0);
});
for (const kind of ['context', 'oscillator', 'gain']) test('procedural tone unsupported ' + kind + ' is unavailable', () => {
  const h = harness({ noContext: kind === 'context' });
  if (kind !== 'context') h.audio.ensureContext()[kind === 'gain' ? 'createGain' : 'createOscillator'] = undefined;
  assert.equal(h.audio.tone({ frequency: 440 }), false); assert.equal(h.audio.toneResource.status, 'unavailable'); assert.ok(h.audio.toneResource.reason);
});
test('fileless named definition is not silently treated as a tone', async () => {
  const h = harness(); h.configure({ sounds: { invalid: { frequency: 440 } } }); await h.assets.load('invalid'); failed(h, 'invalid', 'unavailable', /no file/);
});
for (const resumeThrows of [false, true]) test('suspended context with denied resume keeps resource ready; later gesture retries (' + resumeThrows + ')', async () => {
  const h = harness({ resumeReject: !resumeThrows, resumeThrows }); await h.assets.load('effect'); state(h, 'effect', 'ready', 'ready');
  h.audio.unlocked = true; h.audio.enabled = false; h.audio.masterVolume = 0;
  const before = h.resumes; h.w.SSE.input.userGesture({ isTrusted: true }); await tick(); assert.ok(h.resumes > before); state(h, 'effect', 'ready', 'ready');
  const second = h.resumes; h.audio.unlock(); await tick(); assert.ok(h.resumes > second); state(h, 'effect', 'ready', 'ready');
});
test('autoplay rejection never becomes a media resource failure', async () => {
  const h = harness({ playReject: true }); h.configure({ music: { track: 'track.mp3' } });
  const pending = h.assets.load('track'); await tick(); h.media[0].canplay(); await pending;
  assert.equal(h.audio.playMusic('track'), true); await tick(); state(h, 'track', 'ready', 'ready'); clean(h);
});
test('reconfiguration prevents old buffer attempt overwriting the new resource', async () => {
  const old = deferred(); let first = true; const h = harness({ decode: () => { if (first) { first = false; return old.promise; } return Promise.resolve(buffer()); } });
  const pending = h.audio.loadBuffer('effect'); await tick();
  h.configure({ sounds: { effect: { file: 'new.wav', mode: 'buffer' } } });
  const fresh = await h.audio.loadBuffer('effect'); old.resolve(buffer()); assert.equal(await pending, null);
  assert.equal(h.audio.buffers.effect, fresh); state(h, 'effect', 'ready');
});
test('reconfiguration cancels pending media listeners and timers', async () => {
  const h = harness(); h.configure({ music: { track: 'track.mp3' } }); const pending = h.audio.preload('track'); await tick();
  h.configure({ music: { track: 'new.mp3' } }); await pending; clean(h);
  const next = h.audio.preload('track'); await tick(); h.media.at(-1).canplay(); await next; state(h, 'track', 'ready'); clean(h);
});

test('muted and zero-volume buffer preload still establishes resource readiness', async () => {
  const h = harness(); h.audio.setEnabled(false); h.audio.setBusVolume('master', 0);
  await h.assets.load('effect'); state(h, 'effect', 'ready', 'ready'); assert.equal(h.audio.ctx.state, 'suspended');
});
test('a closed AudioContext is unavailable for buffer preparation', async () => {
  const h = harness({ contextState: 'closed' }); await h.assets.load('effect'); failed(h, 'effect', 'unavailable');
});
test('when AudioBuffer constructor exists, a lookalike is not a decoded AudioBuffer', async () => {
  const h = harness(); h.w.AudioBuffer = class AudioBuffer {};
  await h.assets.load('effect'); failed(h, 'effect', 'failed', /no usable AudioBuffer/);
});
