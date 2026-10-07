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
function harness({ setup, failRAF = false, contextMissing = false, tabIndex } = {}) {
  const w = new Target(), doc = new Target();
  const canvas = new Target('CANVAS'), other = new Target('CANVAS');
  const trace = [], updates = [], raf = new Map(), timers = new Map(); let serial = 0, clockMs = 100;
  canvas.captures = new Set(); canvas.focusCalls = 0;
  canvas.focus = () => { canvas.focusCalls++; trace.push('focus'); doc.activeElement = canvas; };
  canvas.setPointerCapture = id => canvas.captures.add(id);
  canvas.releasePointerCapture = id => { canvas.captures.delete(id); canvas.emit('lostpointercapture', { pointerId: id }); };
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 640 });
  const ctx = new Proxy({ canvas }, { get(t, p) { return p in t ? t[p] : () => {}; } });
  canvas.getContext = () => contextMissing ? null : ctx;
  if (tabIndex !== undefined) canvas.setAttribute('tabindex', tabIndex);
  doc.getElementById = id => ({ canvas, other }[id] || null);
  doc.querySelector = () => null; doc.hidden = false; doc.activeElement = null;
  const rafRequest = cb => { if (failRAF) throw new Error('RAF failure'); const id = ++serial; raf.set(id, cb); return id; };
  Object.assign(w, { window: w, document: doc, console: { log() {}, warn() {}, error() {} }, innerWidth: 360, innerHeight: 640, devicePixelRatio: 3,
    performance: { now: () => clockMs }, requestAnimationFrame: rafRequest, cancelAnimationFrame: id => raf.delete(id),
    setTimeout: cb => { const id = ++serial; timers.set(id, cb); return id; }, clearTimeout: id => timers.delete(id),
    setInterval: cb => { const id = ++serial; timers.set(id, cb); return id; }, clearInterval: id => timers.delete(id),
    localStorage: { getItem: () => null }, navigator: {}, location: { search: '' } });
  const context = vm.createContext(w);
  const run = text => vm.runInContext(text, context);
  run(codea); run(engine);
  let setups = 0, unlocks = 0, resumes = 0;
  const touches = [];
  w.SSE.createApp({ logicalWidth: 360, logicalHeight: 640, debug: false, devtools: { enabled: false }, keyboard: { bindings: { fire: ['Space'] } }, setup() { setups++; setup?.(w); }, initialScene: 'main', scenes: { main: { update(dt) { updates.push(dt); }, draw() {}, touch(t) { touches.push(t.state); trace.push(t.state); } } } });
  const start = () => w.CodeaLite.start('canvas');
  const spyAudio = () => { w.SSE.audio.unlock = () => { unlocks++; }; w.SSE.audio.ctx = { state: 'suspended', resume() { resumes++; return Promise.resolve(); } }; };
  const pointer = (type, pointerId = 1, extra = {}) => canvas.emit(type, { pointerId, clientX: 180, clientY: 320, ...extra });
  const key = (type, extra = {}) => w.emit(type, { code: 'Space', key: ' ', target: canvas, ...extra });
  return { w, doc, canvas, other, trace, raf, timers, run, start, spyAudio, pointer, key, touches, updates, frame(at) { clockMs = at; const [id, cb] = [...raf][0]; raf.delete(id); cb(at); }, get setups() { return setups; }, get unlocks() { return unlocks; }, get resumes() { return resumes; } };
}
test('single, duplicate and reentrant start keep one setup, RAF and listener set', () => {
  const h = harness({ setup(w) { w.CodeaLite.start('canvas'); } }); h.start();
  const counts = [h.w.count(), h.canvas.count(), h.doc.count(), h.w.adds, h.canvas.adds];
  h.start(); assert.equal(h.setups, 1); assert.equal(h.raf.size, 1);
  assert.deepEqual([h.w.count(), h.canvas.count(), h.doc.count(), h.w.adds, h.canvas.adds], counts);
  const [id, cb] = [...h.raf][0]; h.raf.delete(id); cb(116); assert.equal(h.raf.size, 1);
  h.w.emit('pagehide'); h.w.emit('pageshow'); h.w.emit('pageshow'); assert.equal(h.raf.size, 1);
  assert.equal(h.w.CodeaLite.state.dpr, 3); // No Masala DPR cap.
});
test('different canvas fails without disturbing the active runtime', () => {
  const h = harness(); h.start(); assert.throws(() => h.w.CodeaLite.start('other'), /different canvas/);
  assert.equal(h.w.CodeaLite.state.canvas, h.canvas); assert.equal(h.raf.size, 1); assert.equal(h.setups, 1);
});
for (const kind of ['setup', 'RAF', 'context']) test(`boot ${kind} failure cleans owned resources and never retries`, () => {
  const h = harness({ setup: kind === 'setup' ? w => { w.dispatch = true; throw new Error('setup failure'); } : undefined, failRAF: kind === 'RAF', contextMissing: kind === 'context' });
  assert.throws(h.start); assert.equal(h.raf.size, 0); assert.equal(h.canvas.count(), 0); assert.equal(h.w.count(), 0); assert.equal(h.doc.count(), 0);
  assert.equal(h.w.CodeaLite.state.canvas, null); assert.equal(h.w.CodeaLite.state.bootStatus, 'failed');
  assert.equal(h.canvas.hasAttribute('tabindex'), false); assert.throws(h.start, /reload/);
});
test('duplicate script loads preserve globals, different versions reject before overwrite', () => {
  const h = harness(); h.start(); const c = h.w.CodeaLite, e = h.w.SSE, draw = h.w.draw;
  h.run(codea); h.run(engine); assert.equal(h.w.CodeaLite, c); assert.equal(h.w.SSE, e); assert.equal(h.w.draw, draw); assert.equal(h.raf.size, 1);
  assert.throws(() => h.run(codea.replace('const VERSION = "1.0.0"', 'const VERSION = "9.0.0"')), /version conflict/);
  assert.throws(() => h.run(engine.replace('const VERSION = "0.3.0"', 'const VERSION = "9.0.0"')), /version conflict/);
  assert.equal(h.w.SSE, e); assert.equal(h.w.CodeaLite, c);
});
test('keydown/up, held, pressed, released and repeat contract', () => {
  const h = harness(); h.start(); const i = h.w.SSE.input;
  assert.equal(h.key('keydown').defaultPrevented, true); assert.equal(i.action('fire'), true); assert.equal(i.actionPressed('fire'), true);
  i.endFrame(); h.key('keydown', { repeat: true }); assert.equal(i.action('fire'), true); assert.equal(i.actionPressed('fire'), false);
  h.key('keyup'); assert.equal(i.action('fire'), false); assert.equal(i.actionReleased('fire'), true);
  i.endFrame(); assert.equal(i.actionReleased('fire'), false);
});
for (const type of ['blur', 'pagehide']) test(`${type} clears keys; residual repeat cannot resurrect input`, () => {
  const h = harness(); h.start(); h.key('keydown'); h.w.emit(type);
  if (type === 'pagehide') h.w.emit('pageshow');
  const i = h.w.SSE.input; assert.equal(i.keysDown.size, 0); assert.equal(i.keysPressed.size, 0);
  h.key('keydown', { repeat: true }); assert.equal(i.action('fire'), false); assert.equal(i.actionPressed('fire'), false);
  h.key('keyup'); h.key('keydown'); assert.equal(i.actionPressed('fire'), true);
});
for (const tag of ['INPUT', 'TEXTAREA', 'SELECT', 'editable', 'child', 'composed']) test(`${tag} excludes actions/default prevention/audio and releases a previously held key silently`, () => {
  const h = harness(); h.start(); h.spyAudio();
  const editable = new Target('DIV'); editable.setAttribute('contenteditable', 'true');
  const target = new Target(['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) ? tag : 'SPAN');
  if (tag === 'editable') target.isContentEditable = true;
  if (tag === 'child') target.parentElement = editable;
  const extra = { target, ...(tag === 'composed' ? { composedPath: () => [target, editable] } : {}) };
  const event = h.key('keydown', extra); const i = h.w.SSE.input;
  assert.ok(!event.defaultPrevented); assert.equal(i.keysDown.size, 0); assert.equal(i.keysPressed.size, 0); assert.equal(h.unlocks, 0); assert.equal(h.resumes, 0); assert.equal(h.canvas.focusCalls, 0);
  h.key('keydown'); const up = h.key('keyup', extra);
  assert.ok(!up.defaultPrevented); assert.equal(i.keysDown.size, 0); assert.equal(i.keysPressed.size, 0); assert.equal(i.keysReleased.size, 0);
});
test('focus only on trusted pointerdown, before preventDefault; preserve tabindex', () => {
  const h = harness({ tabIndex: '-1' }); h.start(); assert.equal(h.canvas.focusCalls, 0); assert.equal(h.canvas.getAttribute('tabindex'), '-1');
  h.pointer('pointermove'); h.w.emit('pageshow'); h.doc.emit('visibilitychange'); assert.equal(h.canvas.focusCalls, 0);
  h.pointer('pointerdown', 1, { preventDefault() { h.trace.push('prevent'); } }); assert.deepEqual(h.trace.slice(0, 2), ['focus', 'prevent']);
  h.pointer('pointermove'); h.pointer('pointerup'); h.pointer('pointerdown', 2, { isTrusted: false }); assert.equal(h.canvas.focusCalls, 1);
});
test('primary pointer, native pointercancel and lost capture deliver one cancel', () => {
  const h = harness(); h.start(); h.pointer('pointerdown', 1); h.pointer('pointerdown', 2); h.pointer('pointermove', 2); h.pointer('pointercancel', 2);
  assert.deepEqual(h.touches, ['BEGAN']); h.pointer('pointercancel', 1); h.pointer('pointercancel', 1); h.w.emit('blur');
  assert.deepEqual(h.touches, ['BEGAN', 'CANCELLED']); assert.equal(h.canvas.captures.size, 0); assert.equal(h.w.CodeaLite.state.pointers.size, 0);
  h.pointer('pointerdown', 3); h.canvas.releasePointerCapture(3); assert.deepEqual(h.touches, ['BEGAN', 'CANCELLED', 'BEGAN', 'CANCELLED']);
});
for (const type of ['blur', 'pagehide', 'hidden']) test(`${type} interruption orders logical cancel, keyboard clear, raw cleanup, then audio`, () => {
  const h = harness(); h.start(); h.spyAudio(); h.pointer('pointerdown'); h.key('keydown');
  const input = h.w.SSE.input, codea = h.w.CodeaLite, lifecycle = h.w.SSE.lifecycle;
  if (type === 'blur') h.w.SSE.runtime.config.lifecycle.pauseOnBlur = true;
  const raw = codea.clearPointers.bind(codea); codea.clearPointers = () => { assert.equal(input.keysDown.size, 0); assert.equal(h.touches.at(-1), 'CANCELLED'); h.trace.push('raw'); raw(); };
  h.w.SSE.audio.pauseForLifecycle = () => { assert.equal(codea.state.pointers.size, 0); assert.equal(h.canvas.captures.size, 0); h.trace.push('audio'); };
  const unlocks = h.unlocks;
  if (type === 'hidden') { h.doc.hidden = true; h.doc.emit('visibilitychange'); } else h.w.emit(type);
  h.w.emit('blur'); h.w.emit('pagehide');
  assert.equal(h.touches.filter(t => t === 'CANCELLED').length, 1); assert.equal(h.unlocks, unlocks);
  assert.ok(h.trace.indexOf('CANCELLED') < h.trace.indexOf('raw')); assert.ok(h.trace.indexOf('raw') < h.trace.indexOf('audio')); assert.equal(lifecycle.paused, true);
});
test('valid pointer/key gestures resume audio; synthetic, unbound keys and cancellation do not', async () => {
  const h = harness(); h.start(); h.spyAudio();
  h.pointer('pointerdown', 1, { isTrusted: false }); h.pointer('pointercancel'); h.key('keydown', { isTrusted: false }); h.key('keyup');
  h.key('keydown', { code: 'KeyQ', key: 'q' }); assert.equal(h.unlocks, 0); assert.equal(h.resumes, 0);
  h.pointer('pointerdown', 2); for(let n=0;n<12;n++)await Promise.resolve(); h.key('keydown'); assert.equal(h.unlocks, 2); assert.equal(h.resumes, 2);
  h.w.emit('blur'); assert.equal(h.unlocks, 2);
});
test('Subsystems outside Phase 2 Audio/Asset and Phase 3 reports remain byte-identical to v0.2', () => {
  const old = fs.readFileSync(path.join(root, 'engine/sukimastock-engine.v0.2.0.js'), 'utf8');
  for (const [a, b] of [
    ['  const storage =', '    loadAudio(definition) {'],
    ['    load(name, options) {', '  const audio ='],
    ['  const ui =', '  const devtools ='],
    ['  const debug =', '  const input ='],
  ]) {
    // Phase 2 changes Audio/assets.loadAudio; Phase 3 changes devtools reports. Keep the rest of Asset
    // Loader, Storage, i18n, baselines, Scene, bridge, diagnostic event recording and performance protected.
    // Input/Boot listener registration in debug is intentionally changed.
    const normalize = s => s.slice(s.indexOf(a), s.indexOf(b)).replaceAll('listen(root, "error",', 'root.addEventListener("error",').replaceAll('listen(root, "unhandledrejection",', 'root.addEventListener("unhandledrejection",');
    assert.equal(normalize(engine), normalize(old));
  }
});
test('focus options fallback is limited to unsupported focus calls', () => {
  const h = harness(); h.start(); const calls = [];
  h.canvas.focus = options => { calls.push(options); if (options) throw new TypeError('unsupported focus options'); };
  h.pointer('pointerdown'); assert.equal(calls.length, 2); assert.equal(calls[0].preventScroll, true); assert.equal(calls[1], undefined);
});
test('editable descendant pointerdown does not steal focus or start game input', () => {
  const h = harness(); h.start(); const target = new Target('INPUT');
  const e = h.pointer('pointerdown', 1, { target }); assert.equal(h.canvas.focusCalls, 0); assert.ok(!e.defaultPrevented); assert.equal(h.touches.length, 0);
});
test('missing canvas and partial listener installation failures are terminal and clean', () => {
  const h = harness(); assert.throws(() => h.w.CodeaLite.start('missing'), /not found/); assert.equal(h.w.count(), 0); assert.equal(h.canvas.count(), 0); assert.throws(h.start, /reload/);
  const p = harness(); const add = p.canvas.addEventListener.bind(p.canvas);
  p.canvas.addEventListener = (type, handler) => { if (type === 'pointermove') throw new Error('listener failure'); add(type, handler); };
  assert.throws(p.start, /listener failure/); assert.equal(p.canvas.count(), 0); assert.equal(p.raf.size, 0);
});
test('boot failure clears captures, delayed resize, and preserves unrelated listeners', () => {
  const h = harness({ setup(w) { const c = w.CodeaLite.state.canvas; c.emit('pointerdown', {pointerId: 9, clientX: 180, clientY: 320}); w.emit('orientationchange'); throw new Error('abort'); } });
  let outside = 0; h.w.addEventListener('resize', () => outside++);
  assert.throws(h.start, /abort/); assert.equal(h.canvas.captures.size, 0); assert.equal(h.timers.size, 0); assert.equal(h.w.count(), 1);
  h.w.emit('resize'); assert.equal(outside, 1);
});
test('a failing audio unlock does not prevent keyboard action delivery', () => {
  const h = harness(); h.start(); h.w.SSE.audio.unlock = () => { throw new Error('unsupported audio'); };
  h.key('keydown'); assert.equal(h.w.SSE.input.actionPressed('fire'), true);
});

test('real Engine/Codea dispatcher excludes hidden wall time and keeps one RAF across BFCache', () => {
  const h=harness();h.start();h.frame(116);h.frame(133);const before=h.updates.length;
  h.doc.hidden=true;h.doc.emit('visibilitychange');h.w.emit('pagehide',{persisted:true});
  h.frame(60133);assert.equal(h.updates.length,before);
  h.doc.hidden=false;h.w.emit('pageshow',{persisted:true});h.doc.emit('visibilitychange');h.w.emit('pageshow',{persisted:true});
  h.frame(60150);assert.equal(h.updates.length,before+1);assert.ok(h.updates.at(-1)>0&&h.updates.at(-1)<=.05);assert.equal(h.raf.size,1);assert.equal(h.setups,1);
});
