'use strict';
const verify = async function verify(modules) {
  const { Registry, Disc, Session: SessionModule, Bench: BenchModule, Runner: RunnerModule, App, html } = modules;
  const Session = SessionModule.Session, Bench = BenchModule.Bench, Runner = RunnerModule.Runner;
  const entry = Registry.get('disc-table'), dt = 1 / 120, results = [], metrics = {};
  const clone = x => JSON.parse(JSON.stringify(x));
  const assert = (ok, message = 'assertion failed') => { if (!ok) throw new Error(message); };
  const equal = (a, b) => assert(JSON.stringify(a) === JSON.stringify(b), 'states differ');
  const throws = fn => { let caught = false; try { fn(); } catch (_) { caught = true; } assert(caught, 'expected rejection'); };
  const memory = () => {
    const map = new Map(); return { getItem: k => map.get(k) || null, setItem: (k, v) => map.set(k, v), map };
  };
  const run = (spec, frames) => { const model = entry.create(spec); frames.forEach(f => model.step(dt, f)); return model; };
  const frames = Array.from({ length: 480 }, (_, i) => ({ active: i < 150, x: Math.min(650, 154 + i * 1.8), y: 325 + Math.sin(i / 20) * 60 }));
  async function test(name, fn) {
    try { await fn(); results.push({ name, status: 'PASS' }); }
    catch (error) { results.push({ name, status: 'FAIL', error: error.message }); }
  }
  class Element {
    constructor(tag, doc) { this.tagName = tag; this.doc = doc; this.listeners = new Map(); this.children = []; this.dataset = {}; this.attributes = {}; this.textContent = ''; this.value = ''; this.open = false; this.hidden = false; this.files = []; this.width = 0; this.height = 0; this.captured = new Set(); }
    addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, []); this.listeners.get(name).push(fn); }
    removeEventListener(name, fn) { this.listeners.set(name, (this.listeners.get(name) || []).filter(f => f !== fn)); }
    async fire(name, event = {}) { for (const fn of [...(this.listeners.get(name) || [])]) await fn({ preventDefault() {}, ...event }); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(k, v) { this.attributes[k] = v; }
    getAttribute(k) { return this.attributes[k]; }
    focus() { this.doc.activeElement = this; }
    select() { this.selected = true; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    click() { this.clicked = true; return this.fire('click'); }
    remove() { this.removed = true; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 390, height: 440 }; }
    setPointerCapture(id) { this.captured.add(id); }
    releasePointerCapture(id) { this.captured.delete(id); }
    getContext() {
      if (!this.ctx) this.ctx = new Proxy({}, { get: (t, key) => key in t ? t[key] : (...args) => { (this.drawLog ||= []).push([key, ...args]); }, set: (t, k, v) => { t[k] = v; return true; } });
      return this.ctx;
    }
  }
  function environment() {
    const doc = new Element('document', null); doc.doc = doc; doc.hidden = false; doc.activeElement = null; doc.created = [];
    const nodes = new Map();
    for (const match of html.matchAll(/\bid="([^"]+)"/g)) { const e = new Element('div', doc); e.id = match[1]; nodes.set(e.id, e); }
    doc.body = new Element('body', doc);
    doc.getElementById = id => [...doc.created].reverse().find(e => e.id === id && !e.removed) || nodes.get(id) || null;
    doc.createElement = tag => { const e = new Element(tag, doc); doc.created.push(e); return e; };
    const variants = ['A', 'B', 'C'].map(id => { const e = new Element('button', doc); e.dataset.variant = id; return e; });
    doc.querySelectorAll = query => query === '[data-variant]' ? variants : [];
    const host = new Element('window', doc); host.localStorage = memory(); host.devicePixelRatio = 3;
    host.raf = new Map(); host.rafCalls = 0; host.requestAnimationFrame = fn => { const id = ++host.rafCalls; host.raf.set(id, fn); return id; };
    host.cancelAnimationFrame = id => host.raf.delete(id);
    host.timers = []; host.setTimeout = (fn, ms) => { host.timers.push({ fn, ms }); return host.timers.length; };
    host.navigator = { clipboard: { writeText: async value => { host.copied = value; } } };
    host.Blob = class { constructor(parts, options) { this.parts = parts; this.options = options; } };
    host.URL = { createObjectURL: blob => { host.download = blob; return 'blob:test'; }, revokeObjectURL: () => {} };
    return { doc, host, nodes, variants };
  }
  await test('Three distinct mechanics produce different paths under identical pointer frames', () => {
    const states = entry.presets.map(p => run(p.spec, frames).state);
    metrics.sameInputFinalX = states.map((s, i) => ({ variant: 'ABC'[i], x: +s.x.toFixed(2) }));
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert(Math.hypot(states[i].x - states[j].x, states[i].y - states[j].y) > 10, 'mechanics indistinguishable');
  });
  await test('C requires displacement while A/B respond to a stationary distant target', () => {
    const stationary = Array.from({ length: 100 }, () => ({ active: true, x: 570, y: 250 }));
    const xs = entry.presets.map(p => run(p.spec, stationary).state.x);
    assert(Math.abs(xs[2] - 154) < 1, 'C tap moved horizontally');
    assert(xs[0] > 300 && xs[1] > 450, 'A/B force path missing');
  });
  await test('Replay is deterministic from zero velocity and recorded terrain', () => {
    for (const p of entry.presets) equal(run(p.spec, frames).state, run(p.spec, frames).state);
  });
  await test('Elastic bounce rebounds higher than soft/dead without any input', () => {
    const spec = clone(entry.presets[0].spec); spec.world.start.y = 120;
    const heights = ['soft', 'elastic', 'dead'].map(bounce => {
      const model = entry.create({ ...spec, components: { ...spec.components, bounce } });
      let landed = false, peak = 600;
      for (let i = 0; i < 250; i++) {
        model.step(dt, { active: false }); if (model.state.contact) landed = true;
        if (landed) peak = Math.min(peak, model.state.y);
      }
      return 508 - peak;
    });
    metrics.reboundHeight = heights.map((h, i) => ({ kind: ['soft', 'elastic', 'dead'][i], pixels: +h.toFixed(2) }));
    assert(heights[1] > 150 && heights[1] > heights[0] + 100 && heights[2] < 2, 'restitution did not affect rebound');
  });
  await test('Coast, viscous and dry stopping actually differ on a flat contact', () => {
    const spec = clone(entry.presets[0].spec);
    const speed = ['coast', 'viscous', 'dry'].map(stop => {
      const model = entry.create({ ...spec, components: { ...spec.components, stop } });
      Object.assign(model.state, { x: 60, y: 508, vx: 100, vy: 0, contact: true });
      for (let i = 0; i < 60; i++) model.step(dt, { active: false });
      return Math.abs(model.state.vx);
    });
    metrics.stopAfterHalfSecond = speed.map((v, i) => ({ kind: ['coast', 'viscous', 'dry'][i], velocity: +v.toFixed(2) }));
    assert(speed[0] > 70 && speed[1] < 12 && speed[2] === 0, 'stopping modules not active');
  });
  await test('Terrain edit changes actual resting height and valid start position', () => {
    const base = clone(entry.presets[2].spec), edited = Disc.edit(base, 1, { x: 202, y: 410 });
    const inactive = Array.from({ length: 800 }, () => ({ active: false }));
    assert(Math.abs(run(base, inactive).state.y - run(edited, inactive).state.y) > 60, 'terrain was cosmetic');
    const moved = Disc.edit(base, 'start', { x: 650, y: 999 }); assert(moved.world.start.x === 650 && moved.world.start.y < Disc.groundAt(moved.world, 650) - Disc.RADIUS);
  });
  await test('Direct force handle changes actual acceleration', () => {
    const weak = Disc.edit(entry.presets[0].spec, 'strength', { x: 470, y: 112 });
    const strong = Disc.edit(weak, 'strength', { x: 670, y: 112 });
    const input = Array.from({ length: 20 }, () => ({ active: true, x: 450, y: 330 }));
    assert(run(strong, input).state.vx > run(weak, input).state.vx * 2);
  });
  await test('Terrain handles cannot cross or put the start below ground', () => {
    let spec = entry.presets[0].spec; for (let i = 0; i < 6; i++) spec = Disc.edit(spec, i, { x: -1000, y: -1000 });
    entry.validate(spec); assert(spec.world.points[0].x === 0 && spec.world.points[5].x === 800);
    throws(() => entry.validate({ ...spec, strength: NaN }));
  });
  await test('Fast movement stays finite and above solid terrain', () => {
    for (const p of entry.presets) {
      const model = entry.create(p.spec);
      for (let i = 0; i < 4000; i++) {
        const s = model.step(dt, { active: i % 280 < 180, x: i % 360 < 180 ? 40 : 760, y: i % 200 < 100 ? 80 : 610 });
        assert([s.x, s.y, s.vx, s.vy].every(Number.isFinite));
        assert(s.y < Disc.groundAt(model.spec.world, s.x) + 2, 'object tunneled below terrain');
      }
    }
  });
  await test('Saved branches preserve original and previous settings after edits', () => {
    const session = new Session('disc-table', memory()); const original = clone(session.record('A'));
    let spec = session.spec(); spec.strength = .6; session.setSpec(spec, true); const a2 = session.save();
    spec = session.spec(); spec.strength = 1.8; session.setSpec(spec, true); const a3 = session.save();
    assert(a2.title === 'A2' && a3.title === 'A3' && a3.parentId === a2.id);
    session.select(a2.id); assert(session.spec().strength === .6); equal(session.record('A'), original);
    session.restoreSelected(); assert(session.spec().strength === .6 && session.record(a3.id).spec.strength === 1.8);
  });
  await test('Unsaved drafts survive quick A/B/C switches', () => {
    const session = new Session('disc-table', memory()); const spec = session.spec(); spec.strength = .47; session.setSpec(spec);
    session.select('B'); session.select('C'); session.select('A'); assert(session.spec().strength === .47);
  });
  await test('Undo restores scene/config without altering immutable source', () => {
    const session = new Session('disc-table', memory()), initial = session.spec();
    session.setSpec(Disc.edit(initial, 2, { x: 310, y: 410 }), true);
    assert(session.undo()); equal(session.spec(), initial); equal(session.record('A').spec, initial);
  });
  await test('Partial adoption creates an actually running B/B/A child', () => {
    const session = new Session('disc-table', memory()); session.select('B');
    const mixed = session.compose({ drive: 'B', bounce: 'B', stop: 'A' });
    equal(mixed.spec.components, { drive: 'spring', bounce: 'elastic', stop: 'coast' });
    const m = run(mixed.spec, frames), b = run(entry.presets[1].spec, frames);
    assert(Math.abs(m.state.x - b.state.x) > 10, 'combination has no physical effect');
    assert(mixed.sources.stop.variantId === 'A' && mixed.sources.drive.variantId === 'B');
  });
  await test('Adopt and keep freeze edited states for the handoff', () => {
    const session = new Session('disc-table', memory()); session.select('C'); let spec = session.spec(); spec.strength = 1.7; session.setSpec(spec);
    const kept = session.keep(); assert(session.record(kept).spec.strength === 1.7);
    session.select('B'); const adopted = session.adopt();
    session.setNotes({ locks: 'Cを残す', request: '横に押すばねも試したい', comment: 'Bが好き' });
    const doc = JSON.parse(session.export());
    assert(doc.decisions.adoptedId === adopted.id && doc.decisions.keepIds.includes(kept));
    assert(doc.handoff.summary.includes('Bが好き') && doc.handoff.current.spec.components.drive === 'spring');
  });
  await test('JSON roundtrip restores saved variants, working edits, decisions and tape', () => {
    const backend = memory(), session = new Session('disc-table', backend);
    session.select('B'); session.compose({ drive: 'B', bounce: 'B', stop: 'A' }); session.adopt();
    session.setTape({ prototypeId: entry.id, prototypeVersion: entry.version, step: dt, sourceId: 'A', sourceSpec: entry.presets[0].spec, frames });
    const spec = session.spec(); spec.strength = 1.34; session.setSpec(spec); session.persist();
    const restored = new Session('disc-table', backend); equal(restored.data(), session.data());
    const other = new Session('disc-table', memory()); other.import(session.export()); equal(other.data(), session.data());
  });
  await test('Import merges previous local snapshots and rejects conflicting IDs atomically', () => {
    const first = new Session('disc-table', memory()), second = new Session('disc-table', memory());
    const local = first.save('端末の案'); second.select('C'); const remote = second.save('別の端末');
    first.import(second.export()); assert(first.record(local.id) && first.record(remote.id));
    const before = first.export(), broken = JSON.parse(before); broken.snapshots.find(s => s.id === local.id).spec.strength = .9;
    throws(() => first.import(JSON.stringify(broken))); assert(first.export() === before);
  });
  await test('Unknown version, invalid frames, dangling source and cyclic history are rejected', () => {
    const session = new Session('disc-table', memory()); const saved = session.save();
    for (const mutate of [
      d => d.prototype.version = '99.0.0',
      d => d.snapshots[0].sources.stop.variantId = 'missing',
      d => d.snapshots[0].parentId = saved.id,
      d => d.workspace.world.points[2].x = 2,
      d => d.workspace.tape = { prototypeId: entry.id, prototypeVersion: entry.version, sourceId: 'A', sourceSpec: entry.presets[0].spec, step: dt, frames: [{ active: true, x: Infinity, y: 3 }] }
    ]) { const broken = JSON.parse(session.export()); mutate(broken); throws(() => session.import(JSON.stringify(broken))); }
  });
  await test('Storage failure remains visible and retains in-memory variants', () => {
    const session = new Session('disc-table', { getItem: () => null, setItem: () => { throw new Error('quota'); } });
    session.save(); assert(!session.persistent && session.snapshots.length === 1 && session.error.includes('JSON'));
    SessionModule.parse(session.export(), entry);
  });
  await test('Corrupt existing storage is never overwritten', () => {
    let writes = 0; const session = new Session('disc-table', { getItem: () => '{invalid', setItem: () => writes++ });
    session.save(); assert(writes === 0 && session.blocked && session.snapshots.length === 1);
  });
  await test('Bench record/replay uses recorded start scene and exact deterministic frames', () => {
    const session = new Session('disc-table', memory()), bench = new Bench(800, 680, session);
    bench.record(); bench.pointer({ id: 1, type: 'down', x: 154, y: 330 });
    for (let i = 0; i < 200; i++) { bench.pointer({ id: 1, type: 'move', x: 154 + i, y: 330 }); bench.update(dt); }
    bench.pointer({ id: 1, type: 'up' }); for (let i = 0; i < 120; i++) bench.update(dt);
    const sourceState = clone(bench.model.state); bench.finishRecord(); assert(session.tape.frames.length === 320);
    const spec = Disc.edit(session.spec(), 2, { x: 352, y: 590 }); session.setSpec(spec);
    bench.replay(); assert(bench.spec.world.points[2].y === 453);
    for (let i = 0; i < 320; i++) bench.update(dt); equal(bench.model.state, sourceState);
    session.select('B'); bench.load(); assert(bench.cursor === 0); for (let i = 0; i < 320; i++) bench.update(dt);
    assert(Math.abs(bench.model.state.x - sourceState.x) > 10);
  });
  await test('Touch edit changes model immediately, supports undo and ignores second finger', () => {
    const session = new Session('disc-table', memory()), bench = new Bench(800, 680, session);
    bench.setEditing(true); bench.pointer({ id: 1, type: 'down', x: 352, y: 453 });
    bench.pointer({ id: 2, type: 'down', x: 202, y: 536 }); bench.pointer({ id: 2, type: 'move', x: 150, y: 400 });
    bench.pointer({ id: 1, type: 'move', x: 370, y: 590 }); bench.pointer({ id: 1, type: 'up' });
    assert(bench.spec.world.points[2].y === 590 && bench.spec.world.points[1].y === 536);
    assert(session.undo()); bench.load(); assert(bench.spec.world.points[2].y === 453);
  });
  await test('Unchanged MotionRunner pointer cancellation/resize/visibility clears held input', async () => {
    const { doc, host } = environment(), session = new Session('disc-table', memory());
    class Model extends Bench { constructor(w, h) { super(w, h, session); } }
    const canvas = doc.getElementById('canvas'), runner = new Runner(canvas, { document: doc, host });
    runner.select('disc-table', Model, {}, 0); runner.start();
    const event = { pointerId: 7, pointerType: 'touch', clientX: 100, clientY: 100 };
    await canvas.fire('pointerdown', event); assert(runner.model.input.active && canvas.captured.has(7));
    await canvas.fire('pointercancel', event); assert(!runner.model.input.active && runner.pointers.size === 0);
    await canvas.fire('pointerdown', event); doc.hidden = true; await doc.fire('visibilitychange');
    assert(runner.hidden && !runner.model.input.active && canvas.captured.size === 0);
    doc.hidden = false; await host.fire('pageshow'); assert(!runner.hidden && host.rafCalls === 1);
    assert(runner.dpr === 2); runner.draw(); assert(canvas.drawLog.length > 10);
    runner.destroy(); assert(host.raf.size === 0);
  });
  await test('30fps and 60fps replay reach identical 120Hz states', () => {
    const tape = { prototypeId: entry.id, prototypeVersion: entry.version, step: dt, sourceId: 'A', sourceSpec: entry.presets[0].spec, frames };
    const states = [30, 60].map(fps => {
      const { doc, host } = environment(), session = new Session('disc-table', memory()); session.setTape(tape);
      class Model extends Bench { constructor(w, h) { super(w, h, session); } }
      const runner = new Runner(doc.getElementById('canvas'), { document: doc, host }); runner.select(entry.id, Model, {}, 0);
      runner.model.replay(); runner.advance(0); for (let i = 1; i <= fps * 4; i++) runner.advance(i * 1000 / fps);
      assert(runner.model.cursor === 480); return clone(runner.model.model.state);
    });
    equal(states[0], states[1]);
  });
  await test('Full UI routes tab, direct edit, save, restore, composition and adoption to live models', async () => {
    const { doc, host, variants } = environment();
    const app = App.mount(doc, host, { registry: Registry, Session, Bench, Runner });
    await variants[1].click(); assert(app.session.selectedId === 'B' && app.bench.model.spec.components.drive === 'spring');
    await doc.getElementById('edit').click(); assert(app.bench.editing);
    const t = app.bench.transform(), point = (x, y) => ({ pointerId: 1, pointerType: 'touch', clientX: x * t.scale + t.x, clientY: y * t.scale + t.y });
    await doc.getElementById('canvas').fire('pointerdown', point(352, 453));
    await doc.getElementById('canvas').fire('pointermove', point(352, 580));
    await doc.getElementById('canvas').fire('pointerup', point(352, 580));
    await doc.getElementById('edit').click(); assert(app.bench.model.spec.world.points[2].y === 580);
    await doc.getElementById('save-open').click(); doc.getElementById('save-name').value = '試したB';
    await doc.getElementById('save').click(); assert(app.session.snapshots.length === 1 && !doc.getElementById('panel').open);
    await doc.getElementById('tools-open').click();
    const select = doc.getElementById('part-stop'); select.value = 'A'; await select.fire('change');
    await doc.getElementById('compose').click(); assert(app.bench.model.spec.components.stop === 'coast' && app.session.snapshots.length === 2);
    await doc.getElementById('tools-open').click(); await doc.getElementById('adopt').click();
    assert(app.session.decisions.adoptedId && app.session.snapshots.length === 3);
    app.runner.destroy();
  });
  await test('UI writes author notes, clipboard JSON, import, download and selectable fallback', async () => {
    const { doc, host } = environment(); const app = App.mount(doc, host, { registry: Registry, Session, Bench, Runner });
    await doc.getElementById('tools-open').click(); await doc.getElementById('handoff-open').click();
    doc.getElementById('comment').value = 'Bの感じが好き'; await doc.getElementById('comment').fire('input');
    await doc.getElementById('copy-json').click(); const exported = host.copied;
    assert(JSON.parse(exported).decisions.comment === 'Bの感じが好き');
    host.navigator.clipboard.writeText = async () => { throw new Error('denied'); };
    await doc.getElementById('copy-summary').click(); assert(!doc.getElementById('copy-fallback').hidden && doc.getElementById('copy-fallback').value.includes('Bの感じが好き'));
    await doc.getElementById('download').click(); assert(host.download.parts[0].includes('sukimastock-feel-studio/1'));
    doc.getElementById('import').files = [{ size: exported.length, text: async () => exported }];
    await doc.getElementById('import').fire('change'); assert(app.session.decisions.comment === 'Bの感じが好き');
    app.runner.destroy();
  });
  await test('A second independent prototype can register without changing Studio or Engine', () => {
    const duplicate = { ...entry, id: 'adapter-proof', version: '1.0.0' };
    Registry.register(duplicate); const session = new Session('adapter-proof', memory());
    const bench = new Bench(400, 400, session); bench.update(dt); assert(Number.isFinite(bench.model.state.x));
    throws(() => Registry.register(duplicate));
    const second = new Session('adapter-proof', session.backend);
    assert(second.storageKey !== new Session('disc-table', session.backend).storageKey);
    const { doc, host } = environment();
    const app = App.mount(doc, host, { registry: Registry, Session, Bench, Runner, prototypeId: 'adapter-proof' });
    assert(app.session.entry.id === 'adapter-proof');
    app.runner.destroy();
  });
  return { passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, results, metrics };
};
module.exports = { verify };
if (require.main === module) {
  const fs = require('node:fs');
  const path = require('node:path');
  verify({
    Registry: require('../registry.js'), Disc: require('../disc.js'),
    Session: require('../session.js'), Bench: require('../bench.js'),
    Runner: require('../../motion-lab/runner.js'), App: require('../app.js'),
    html: fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8')
  }).then(result => { console.log(JSON.stringify(result, null, 2)); process.exitCode = result.failed ? 1 : 0; })
    .catch(error => { console.error(error); process.exitCode = 1; });
}
