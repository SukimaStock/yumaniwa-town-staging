'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const codea = fs.readFileSync(path.join(root, 'engine/codea-lite.v1.0.0.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'engine/sukimastock-engine.v0.3.0.js'), 'utf8');
class Target {
  constructor(tagName) { this.tagName = tagName; this.events = new Map(); this.attrs = new Map(); this.style = {}; this.adds = 0; }
  addEventListener(type, handler) { if (!this.events.has(type)) this.events.set(type, new Set()); this.events.get(type).add(handler); this.adds++; }
  removeEventListener(type, handler) { this.events.get(type)?.delete(handler); }
  emit(type, fields = {}) {
    const e = { target: this, isTrusted: true, preventDefault() { this.defaultPrevented = true; }, ...fields };
    for (const handler of [...(this.events.get(type) || [])]) handler(e);
    return e;
  }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  hasAttribute(name) { return this.attrs.has(name); }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  removeAttribute(name) { this.attrs.delete(name); }
  count() { return [...this.events.values()].reduce((n, s) => n + s.size, 0); }
}
function harness({ setup, failRAF = false, contextMissing = false, tabIndex, config = {}, absentCodea = false } = {}) {
  const w = new Target(), doc = new Target();
  const canvas = new Target('CANVAS'), other = new Target('CANVAS');
  const trace = [], raf = new Map(), timers = new Map(); let serial = 0;
  canvas.captures = new Set(); canvas.focusCalls = 0;
  canvas.focus = () => { canvas.focusCalls++; trace.push('focus'); doc.activeElement = canvas; };
  canvas.setPointerCapture = id => canvas.captures.add(id);
  canvas.releasePointerCapture = id => { canvas.captures.delete(id); canvas.emit('lostpointercapture', { pointerId: id }); };
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 640 });
  const ctx = new Proxy({ canvas }, { get(t, p) { return p in t ? t[p] : () => {}; } });
  canvas.getContext = () => contextMissing ? null : ctx;
  if (tabIndex !== undefined) canvas.setAttribute('tabindex', tabIndex);
  doc.getElementById = id => ({ canvas, other }[id] || null);
  doc.querySelector = () => null; doc.hidden = false; doc.hasFocus = () => true; doc.visibilityState = 'visible'; doc.activeElement = null;
  const rafRequest = cb => { if (failRAF) throw new Error('RAF failure'); const id = ++serial; raf.set(id, cb); return id; };
  Object.assign(w, { window: w, document: doc, console: { log() {}, warn() {}, error() {} }, innerWidth: 360, innerHeight: 640, devicePixelRatio: 3,
    performance: { now: () => 100 }, requestAnimationFrame: rafRequest, cancelAnimationFrame: id => raf.delete(id),
    setTimeout: cb => { const id = ++serial; timers.set(id, cb); return id; }, clearTimeout: id => timers.delete(id),
    setInterval: cb => { const id = ++serial; timers.set(id, cb); return id; }, clearInterval: id => timers.delete(id),
    localStorage: { getItem: () => null }, navigator: {}, location: { search: '' } });
  const context = vm.createContext(w);
  const run = text => vm.runInContext(text, context);
  if (!absentCodea) run(codea); run(engine);
  let setups = 0, unlocks = 0, resumes = 0;
  const touches = [];
  w.SSE.createApp({ logicalWidth: 360, logicalHeight: 640, debug: false, devtools: { enabled: false }, keyboard: { bindings: { fire: ['Space'] } }, setup() { setups++; setup?.(w); }, ...config, initialScene: 'main', scenes: { main: { draw() {}, touch(t) { touches.push(t.state); trace.push(t.state); } } } });
  const start = () => w.CodeaLite.start('canvas');
  const spyAudio = () => { w.SSE.audio.unlock = () => { unlocks++; }; w.SSE.audio.ctx = { state: 'suspended', resume() { resumes++; return Promise.resolve(); } }; };
  const pointer = (type, pointerId = 1, extra = {}) => canvas.emit(type, { pointerId, clientX: 180, clientY: 320, ...extra });
  const key = (type, extra = {}) => w.emit(type, { code: 'Space', key: ' ', target: canvas, ...extra });
  return { w, doc, canvas, other, trace, raf, timers, run, start, spyAudio, pointer, key, touches, get setups() { return setups; }, get unlocks() { return unlocks; }, get resumes() { return resumes; } };
}
const observe = h => h.w.SSE.dev.report().observation;
const warnings = h => h.w.SSE.dev.report().health.filter(i => ['warn', 'error'].includes(i.level));

function assertPrivateReport(h, secrets) {
  const report = h.w.SSE.dev.report(), text = h.w.SSE.dev.reportText();
  for (const secret of secrets) {
    assert.equal(JSON.stringify(report).includes(secret), false, 'JSON leaked ' + secret);
    assert.equal(text.includes(secret), false, 'text leaked ' + secret);
  }
  return report;
}

test('privacy: page query and fragment export presence only', () => {
  const h=harness(); h.start();
  Object.assign(h.w.location, {pathname:'/canary/', search:'?unusual=SSE_SECRET_QUERY_123&v=123', hash:'#SSE_SECRET_PAGE_FRAGMENT'});
  const before=JSON.stringify(h.w.location);
  const r=assertPrivateReport(h,['SSE_SECRET_QUERY_123','SSE_SECRET_PAGE_FRAGMENT']);
  assert.equal(r.environment.path,'/canary/');
  assert.equal(r.environment.hasQuery,true); assert.equal(r.environment.hasFragment,true);
  assert.equal('search' in r.environment,false); assert.equal('hash' in r.environment,false);
  assert.equal(JSON.stringify(h.w.location),before);
  h.w.location.search=''; h.w.location.hash='';
  assert.equal(h.w.SSE.dev.report().environment.hasQuery,false);
  assert.equal(h.w.SSE.dev.report().environment.hasFragment,false);
});

for (const [label,url,safe,secrets] of [
  ['absolute','https://example.test/audio.wav?token=SSE_SECRET_ASSET_123&v=SSE_QUERY_VALUE#SSE_FRAGMENT_VALUE','https://example.test/audio.wav',['SSE_SECRET_ASSET_123','SSE_QUERY_VALUE','SSE_FRAGMENT_VALUE']],
  ['relative','./sounds/test.wav?x=SSE_SECRET_RELATIVE_123','./sounds/test.wav',['SSE_SECRET_RELATIVE_123']],
  ['bare relative','sounds/test.wav?anything=SSE_SECRET_BARE#SSE_FRAGMENT_BARE','sounds/test.wav',['SSE_SECRET_BARE','SSE_FRAGMENT_BARE']],
  ['root relative','/sounds/test.wav#SSE_FRAGMENT_ROOT','/sounds/test.wav',['SSE_FRAGMENT_ROOT']],
  ['protocol relative','//example.test/audio.wav?arbitrary=SSE_SECRET_PROTOCOL','//example.test/audio.wav',['SSE_SECRET_PROTOCOL']],
  ['query reference','?arbitrary=SSE_SECRET_REFERENCE','',['SSE_SECRET_REFERENCE']],
  ['fragment reference','#SSE_FRAGMENT_REFERENCE','',['SSE_FRAGMENT_REFERENCE']],
  ['raw whitespace','./sound.wav?x=first SSE_SECRET_SPACE#SSE_FRAGMENT_SPACE','./sound.wav',['SSE_SECRET_SPACE','SSE_FRAGMENT_SPACE']],
]) test('privacy: '+label+' asset URL and actual Engine fetch failure', async () => {
  const h=harness(); h.start(); const s=h.w.SSE;
  let requested;
  h.w.fetch=async file=>{requested=file;return {ok:false,status:404};};
  s.assets.register('privacy-asset',{type:'text',file:url});
  await s.assets.load('privacy-asset'); // Real loader/error construction; no network.
  assert.equal(requested,url);
  const definition=s.assets.definitions.get('privacy-asset');
  const record=s.assets.record('privacy-asset'), originalError=record.error;
  const before=JSON.stringify({definition, error:originalError.message, events:s.diagnostics.events});
  const r=assertPrivateReport(h,secrets), item=r.assets.items.find(i=>i.name==='privacy-asset');
  assert.equal(item.file,safe); assert.equal(item.name,'privacy-asset');
  assert.equal(item.type,'text'); assert.equal(item.status,'error');
  assert.equal(item.error,'Asset fetch failed: '+safe+' (404)');
  assert.equal(r.observation.assets.failures[0].reason,item.error);
  assert.match(s.dev.reportText(),/Asset fetch failed: .* \(404\)/);
  assert.equal(s.dev.assetReport().items[0].file,safe);
  assert.equal(s.assets.definitions.get('privacy-asset'),definition);
  assert.equal(definition.file,url); assert.equal(record.error,originalError);
  assert.equal(JSON.stringify({definition, error:record.error.message, events:s.diagnostics.events}),before);
  assert.equal(s.assets.report()[0].file,url); // Runtime inspection retains the original URL.
});

test('privacy: nested diagnostic strings/keys and audio reasons are detached copies', () => {
  const h=harness(); h.start(); const s=h.w.SSE;
  const url='https://example.test/sound.wav?odd=SSE_SECRET_EVENT#SSE_EVENT_FRAGMENT';
  s.diagnostics.warn('privacy-event','Load failed: '+url+' (503)',{urls:[url],nested:{[url]:url}});
  const resource={name:'sound',kind:'buffer',status:'failed',reason:'Decode failed: '+url};
  s.audio.resources.set('sound',resource);
  const before=JSON.stringify({events:s.diagnostics.events,resources:[...s.audio.resources],location:h.w.location,raf:[...h.raf.keys()],timers:[...h.timers.keys()]});
  const r=assertPrivateReport(h,['SSE_SECRET_EVENT','SSE_EVENT_FRAGMENT']);
  const event=r.diagnostics.recent.find(e=>e.code==='privacy-event');
  assert.equal(event.message,'Load failed: https://example.test/sound.wav (503)');
  assert.equal(event.detail.urls[0],'https://example.test/sound.wav');
  assert.equal(r.observation.audio.failures[0].kind,'buffer');
  assert.equal(r.observation.audio.failures[0].status,'failed');
  assert.equal(r.observation.audio.failures[0].reason,'Decode failed: https://example.test/sound.wav');
  assert.equal(s.dev.observationSnapshot().audio.failures[0].reason,r.observation.audio.failures[0].reason);
  event.detail.urls[0]='changed';
  assert.equal(s.audio.resources.get('sound'),resource);
  assert.equal(JSON.stringify({events:s.diagnostics.events,resources:[...s.audio.resources],location:h.w.location,raf:[...h.raf.keys()],timers:[...h.timers.keys()]}),before);
});

test('privacy: sanitization precedes sample truncation and preserves ready metadata', () => {
  const h=harness(); h.start(); const s=h.w.SSE;
  s.audio.resources.set('ready',{name:'ready',kind:'buffer',status:'ready',reason:null});
  s.audio.resources.set('bad',{name:'bad',kind:'buffer',status:'failed',reason:'Load failed: ./sound.wav?x=SSE_SECRET_LONG'+ 'x'.repeat(300)+' (404)'});
  const r=assertPrivateReport(h,['SSE_SECRET_LONG']);
  assert.equal(r.observation.audio.resources.ready,1);
  assert.equal(r.observation.audio.failures[0].reason,'Load failed: ./sound.wav (404)');
});

test('privacy: clipboard and text fallback export the sanitized report', async () => {
  const h=harness(); h.start(); const s=h.w.SSE;
  s.diagnostics.warn('privacy-copy','Failure ./sound.wav?x=SSE_SECRET_COPY#SSE_COPY_FRAGMENT (404)');
  let copied;
  h.w.navigator.clipboard={writeText:async text=>{copied=text;}};
  const clipboard=await s.dev.copyReport();
  assert.equal(clipboard.ok,true); assert.equal(clipboard.text,copied);
  delete h.w.navigator.clipboard;
  const fallback=await s.dev.copyReport();
  assert.equal(fallback.method,'text');
  for (const text of [copied,clipboard.text,fallback.text]) {
    assert.equal(text.includes('SSE_SECRET_COPY'),false);
    assert.equal(text.includes('SSE_COPY_FRAGMENT'),false);
    assert.match(text,/Failure \.\/sound.wav \(404\)/);
  }
});

test('runtime identity, boot state and pre-start unknowns', () => {
  const h = harness(); let o = observe(h);
  assert.equal(o.runtime.engineVersion, '0.3.0'); assert.equal(o.runtime.codeaVersion, '1.0.0');
  assert.equal(o.runtime.codeaBootState, 'idle'); assert.equal(o.runtime.engineBootState, 'idle');
  assert.equal(o.runtime.adapterPresent, true); assert.equal(o.canvas.backingWidth, 'unknown');
  h.start(); o = observe(h); assert.equal(o.runtime.engineInitialized, true);
  assert.equal(o.runtime.codeaBootState, 'running'); assert.equal(o.runtime.engineBootState, 'running');
});
test('absent Codea is unavailable, not zero raw pointers or inferred version', () => {
  const h = harness({absentCodea:true}); const o = observe(h);
  assert.equal(o.runtime.codeaPresent, false); assert.equal(o.runtime.codeaVersion, 'unknown');
  assert.equal(o.pointer.rawCount, 'unknown'); assert.equal(o.pointer.captureCount, 'unknown');
  assert.equal(o.canvas.dpr, 'unknown'); assert.equal(o.runtime.codeaBootState, 'unknown');
  assert.ok(warnings(h).some(i => i.code === 'codea-state-unavailable'));
});
test('canvas logical/CSS/client/backing size, scale, offsets and DPR', () => {
  const h = harness(); h.start(); h.canvas.clientWidth=360; h.canvas.clientHeight=640;
  const c = observe(h).canvas;
  assert.equal(c.logicalWidth,360); assert.equal(c.logicalHeight,640);
  assert.equal(c.cssWidth,360); assert.equal(c.clientWidth,360);
  assert.equal(c.backingWidth,1080); assert.equal(c.backingHeight,1920);
  assert.equal(c.dpr,3); assert.equal(c.scale,1); assert.equal(c.offsetX,0); assert.equal(c.offsetY,0);
});
for (const focus of ['canvas','other','unfocused','editable']) test('focus: '+focus, () => {
  const h=harness(); h.start(); h.doc.activeElement=focus==='canvas'?h.canvas:focus==='editable'?new Target('INPUT'):h.other;
  h.doc.hasFocus=()=>focus!=='unfocused';
  const f=observe(h).focus;
  assert.equal(f.canvasActive,focus==='canvas');
  assert.equal(f.keyboardEligible, !['unfocused','editable'].includes(focus));
  assert.equal(warnings(h).length,0);
});
test('keyboard bindings, listener, held and transient counts', () => {
  const h=harness(); h.start(); let k=observe(h).keyboard;
  assert.equal(k.bindings,1); assert.equal(k.listenerRegistered,true); assert.equal(k.held,0);
  h.key('keydown'); k=observe(h).keyboard; assert.ok(k.held>0); assert.ok(k.pressed>0);
  h.w.SSE.input.endFrame(); h.key('keyup'); k=observe(h).keyboard; assert.equal(k.held,0); assert.ok(k.released>0);
});
test('zero bindings and no input are normal; disabled keyboard ineligible', () => {
  const h=harness(); h.start(); h.w.SSE.input.configureKeyboard({bindings:{}});
  assert.equal(observe(h).keyboard.bindings,0); assert.equal(warnings(h).length,0);
  const d=harness({config:{keyboard:{enabled:false}}}); d.start(); assert.equal(observe(d).focus.keyboardEligible,false);
});
test('pointer active/idle and private capture unknown remain distinct', () => {
  const h=harness(); h.start(); assert.equal(observe(h).pointer.rawCount,0);
  h.pointer('pointerdown',7); let p=observe(h).pointer;
  assert.equal(p.logicalActive,true); assert.equal(p.primaryId,7); assert.equal(p.rawCount,1);
  assert.equal(p.lastKnownState,'BEGAN'); assert.equal(p.captureCount,'unknown');
  h.pointer('pointerup',7); p=observe(h).pointer;
  assert.equal(p.logicalActive,false); assert.equal(p.rawCount,0); assert.equal(p.lastKnownState,'unknown');
});
test('lifecycle current interruption and pagehide reason, without fabricated history', () => {
  const h=harness(); h.start(); h.w.emit('pagehide'); let l=observe(h).lifecycle;
  assert.equal(l.paused,true); assert.equal(l.pagehideActive,true); assert.equal(l.interruptionActive,true);
  assert.equal(l.pageshowHistory,'unknown'); h.w.emit('pageshow'); l=observe(h).lifecycle;
  assert.equal(l.pagehideActive,false); assert.equal(l.paused,false);
});
test('configured idle audio counts do not create resource records', () => {
  const h=harness(); h.start(); const a=h.w.SSE.audio;
  a.configure({sounds:{buffer:{file:'x.wav',mode:'buffer'},media:'y.wav'},music:{song:'z.wav'}});
  const before=a.resources.size; const r=observe(h).audio.resources;
  assert.equal(r.total,3); assert.equal(r.idle,3); assert.equal(r.music,1); assert.equal(r.buffer,1); assert.equal(r.media,1);
  assert.equal(a.resources.size,before);
});
for (const status of ['ready','loading','failed','unavailable']) test('Audio resource '+status, () => {
  const h=harness(); h.start(); const a=h.w.SSE.audio;
  a.resources.set('effect',{name:'effect',kind:'buffer',status,reason:status==='failed'||status==='unavailable'?'test reason':null});
  const o=observe(h); assert.equal(o.audio.resources[status],1);
  assert.equal(o.audio.failures.length,['failed','unavailable'].includes(status)?1:0);
  assert.equal(warnings(h).some(i=>i.code==='audio-resource-error'),['failed','unavailable'].includes(status));
});
for (const state of ['running','suspended']) test('ready resources separate from '+state+' output', () => {
  const h=harness(); h.start(); const a=h.w.SSE.audio;
  a.resources.set('effect',{name:'effect',kind:'buffer',status:'ready'}); a.ctx={state}; a.unlocked=true;
  const o=observe(h).audio; assert.equal(o.resources.ready,1); assert.equal(o.contextState,state);
  assert.equal(o.audible,'unknown'); assert.equal(warnings(h).length,0);
  if(state==='suspended') assert.match(o.output,/gesture/);
});
test('muted and zero-volume output do not turn ready into a failure', () => {
  const h=harness();h.start();const a=h.w.SSE.audio;
  a.enabled=false;assert.equal(observe(h).audio.output,'muted');
  a.enabled=true;a.masterVolume=0;assert.equal(observe(h).audio.output,'volume-zero');assert.equal(warnings(h).length,0);
});
test('Assets idle/loading/ready/error counts and bounded reasons', () => {
  const h=harness();h.start();const a=h.w.SSE.assets;
  for (const status of ['idle','loading','ready','error']) {a.register(status,{type:'audio',audioName:status});Object.assign(a.record(status),{status,error:status==='error'?new Error('expected failure'):null});}
  const o=observe(h).assets; assert.equal(o.summary.total,4);
  for(const s of ['idle','loading','ready','error']) assert.equal(o.summary[s],1);
  assert.equal(o.failures[0].reason,'expected failure');assert.equal(o.failures[0].type,'audio');
  assert.equal(warnings(h).find(i=>i.code==='asset-error').level,'warn');
});
test('real unavailable Audio load agrees with Asset error in snapshot', async () => {
  const h=harness();h.start();h.w.SSE.assets.register('missing',{audioName:'undefined'});
  await h.w.SSE.assets.load('missing'); const o=observe(h);
  assert.equal(o.audio.resources.unavailable,1);assert.equal(o.assets.summary.error,1);
  assert.ok(o.audio.failures[0].reason);assert.ok(o.assets.failures[0].reason);
});
test('storage persistence is last observed evidence, not a probe', () => {
  const h=harness({config:{id:'diagnostics-test'}});h.start();const s=h.w.SSE.storage;
  assert.equal(observe(h).storage.persistenceAvailable,'unknown');
  h.w.localStorage={setItem(){},getItem(){return null;}}; s.define('save',{version:2,migrate:v=>v});s.set('save',{privateValue:'DO_NOT_REPORT'});
  const o=observe(h).storage;assert.equal(o.registered,1);assert.equal(o.appId,'diagnostics-test');
  assert.match(o.namespace,/diagnostics-test/);assert.equal(o.persistenceAvailable,true);assert.equal(o.schemas[0].version,2);
  assert.equal(o.schemas[0].migrationConfigured,true);assert.equal(o.memoryFallback,false);
  assert.ok(!JSON.stringify(h.w.SSE.dev.report()).includes('DO_NOT_REPORT'));assert.ok(!h.w.SSE.dev.reportText().includes('DO_NOT_REPORT'));
});
test('memory fallback and mixed backend remain visible without stored values', () => {
  const h=harness();h.start();const s=h.w.SSE.storage;s.define('save',{version:3});
  h.w.localStorage={setItem(){throw Error('denied');}};s.set('save',{secret:'PRIVATE_PAYLOAD'});
  let o=observe(h).storage;assert.equal(o.persistenceAvailable,false);assert.equal(o.memoryFallback,true);
  h.w.localStorage={setItem(){}};s.set('other',{otherSecret:'PRIVATE_OTHER'});
  o=observe(h).storage;assert.equal(o.persistenceAvailable,true);assert.equal(o.memoryFallback,true);
  assert.ok(warnings(h).some(i=>i.code==='storage-memory-fallback'));
  const text=h.w.SSE.dev.reportText();assert.ok(!text.includes('PRIVATE_PAYLOAD'));assert.ok(!text.includes('PRIVATE_OTHER'));
});
for (const declaration of [undefined,true,false]) test('external declaration '+declaration+' is never observation', () => {
  const h=harness({config:{diagnostics:{external:{audio:declaration,storage:declaration}}}});h.start();
  const o=observe(h);assert.equal(o.external.audio.status,'unknown');assert.equal(o.external.audio.observed,false);
  assert.equal(o.external.audio.declaration,declaration===undefined?'unknown':declaration);assert.equal(warnings(h).length,0);
  assert.match(h.w.SSE.dev.reportText(),/claims, not observations/);
});
test('healthy summary and panel cannot guarantee the whole work', () => {
  const h=harness();h.start();const d=h.w.SSE.dev;
  assert.match(d.report().health[0].text,/Engine-managed runtime/);
  for(const text of [d.reportText(),d.panelSummaryText()]) {assert.match(text,/Engine-managed runtime/);assert.doesNotMatch(text,/Everything is OK|No issues[.\n]/);}
});
test('version mismatch warns and terminal boot failure errors', () => {
  const h=harness();h.start();h.w.CodeaLite.VERSION='other';assert.ok(warnings(h).some(i=>i.code==='codea-version-mismatch'));
  const f=harness({contextMissing:true});assert.throws(f.start);assert.ok(warnings(f).some(i=>i.code==='boot-failed'&&i.level==='error'));
});
test('samples are capped; returned observation is detached', () => {
  const h=harness();h.start();for(let i=0;i<20;i++) h.w.SSE.audio.resources.set('bad'+i,{name:'bad'+i,kind:'buffer',status:'failed',reason:'x'.repeat(1000)});
  const o=observe(h);assert.equal(o.audio.failures.length,5);assert.equal(o.audio.failures[0].reason.length,180);
  o.audio.failures[0].reason='changed';o.lifecycle.reasons.push('invented');assert.notEqual(observe(h).audio.failures[0].reason,'changed');
  assert.ok(!h.w.SSE.lifecycle.reasons.has('invented'));
});
test('report / text / panel leave runtime untouched and never call side-effect APIs', () => {
  const h=harness();h.start();const s=h.w.SSE;s.storage.define('save',{version:2});s.storage.memory.set(s.storage.key('save'),{version:2,value:'SECRET'});
  const forbidden=()=>{throw Error('Diagnostics invoked side effect');};
  Object.defineProperty(h.w,'localStorage',{get:forbidden});h.w.fetch=forbidden;h.w.Audio=forbidden;h.w.AudioContext=forbidden;
  s.audio.resource=forbidden;s.audio.unlock=forbidden;s.audio.ensureContext=forbidden;s.viewport.update=forbidden;s.storage.info=forbidden;
  h.w.addEventListener=forbidden;h.doc.addEventListener=forbidden;h.canvas.addEventListener=forbidden;h.canvas.focus=forbidden;
  const before=JSON.stringify({raw:[...h.w.CodeaLite.state.pointers],resources:[...s.audio.resources],memory:[...s.storage.memory],error:s.storage.lastError,backend:s.storage.lastBackend,events:s.diagnostics.events,raf:h.raf.size,timers:h.timers.size});
  s.dev.report();s.dev.reportText();s.dev.panelSummaryText();
  assert.equal(JSON.stringify({raw:[...h.w.CodeaLite.state.pointers],resources:[...s.audio.resources],memory:[...s.storage.memory],error:s.storage.lastError,backend:s.storage.lastBackend,events:s.diagnostics.events,raf:h.raf.size,timers:h.timers.size}),before);
});
