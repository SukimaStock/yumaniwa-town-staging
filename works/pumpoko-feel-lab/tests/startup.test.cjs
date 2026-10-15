'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL, fileURLToPath } = require('node:url');

// Load the real page's scripts, in HTML order. Loading physics directly would
// miss a broken entry-point URL even when every model test still passes.
function lab(initialStorage = []) {
  const entry = path.resolve(__dirname, '../index.html');
  const html = fs.readFileSync(entry, 'utf8');
  class Target {
    constructor(tagName, attrs = {}) {
      Object.assign(this, { tagName, attrs, dataset: {}, value: '', textContent: '',
        hidden: 'hidden' in attrs, events: new Map() });
      for (const [key, value] of Object.entries(attrs)) {
        if (key.startsWith('data-')) this.dataset[key.slice(5)] = value;
      }
      const classes = new Set((attrs.class || '').split(/\s+/));
      this.classList = { toggle(name, active) {
        if (active) classes.add(name); else classes.delete(name);
      } };
    }
    addEventListener(type, fn) {
      if (!this.events.has(type)) this.events.set(type, []);
      this.events.get(type).push(fn);
    }
    emit(type, extra = {}) {
      for (const fn of this.events.get(type) || []) {
        fn({ currentTarget: this, target: this, preventDefault() {}, ...extra });
      }
    }
    setPointerCapture() {}
  }
  const elements = [...html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)].map(match => {
    const attrs = Object.fromEntries([...match[2].matchAll(/([\w:-]+)(?:="([^"]*)")?/g)]
      .map(a => [a[1], a[2] || '']));
    return new Target(match[1].toUpperCase(), attrs);
  });
  const ids = new Map(elements.filter(el => el.attrs.id).map(el => [el.attrs.id, el]));
  const doc = new Target('DOCUMENT');
  Object.assign(doc, {
    hidden: false, activeElement: null,
    getElementById: id => ids.get(id) || null,
    querySelectorAll(selector) {
      const match = /^\[data-([\w-]+)\]$/.exec(selector);
      assert.ok(match, 'unhandled selector: ' + selector);
      return elements.filter(el => match[1] in el.dataset);
    }
  });
  const drawCalls = [];
  const ctx = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }) }, {
    get: (target, key) => key in target ? target[key] : (...args) => drawCalls.push([key, args])
  });
  const canvas = ids.get('gameCanvas');
  canvas.parentElement = new Target('MAIN');
  canvas.getContext = () => ctx;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 390, height: 300 });
  const raf = new Map(), storage = new Map(initialStorage);
  let serial = 0, now = 100;
  const root = new Target('WINDOW');
  Object.assign(root, {
    window: root, document: doc, console, URLSearchParams, devicePixelRatio: 1,
    location: { search: '?dev=1' },
    localStorage: { getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value) },
    requestAnimationFrame: fn => { raf.set(++serial, fn); return serial; },
    ResizeObserver: class { observe() {} }
  });
  const context = vm.createContext(root);
  const sources = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)].map(m => m[1]);
  assert.ok(sources.length > 0, 'page must load its application');
  for (const src of sources) {
    const url = new URL(src, pathToFileURL(entry));
    assert.equal(url.protocol, 'file:', 'test covers repository-local script dependencies');
    const file = fileURLToPath(url);
    assert.ok(fs.existsSync(file), 'Missing page script: ' + src);
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
  function frames(seconds = 1 / 60) {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) {
      now += 1000 / 60;
      const pending = [...raf.values()];
      raf.clear();
      assert.equal(pending.length, 1, 'exactly one animation loop');
      for (const fn of pending) fn(now);
    }
  }
  function select(key, value) {
    const el = elements.find(el => el.dataset[key] === value);
    assert.ok(el, 'missing choice: ' + key + '=' + value);
    el.emit('click');
  }
  return { root, doc, ids, canvas, drawCalls, frames, select, storage,
    choices: key => elements.filter(el => key in el.dataset),
    probe: () => root.FeelLabProbe() };
}

test('the actual HTML script graph boots physics, terrain, artwork and one drawing loop', () => {
  const h = lab();
  for (const name of ['FruitLabPhysics', 'FruitLabWorld', 'FruitLabArt', 'FeelLabProbe']) {
    assert.ok(h.root[name], name + ' is available');
  }
  h.frames();
  assert.equal(h.probe().kind, 'pumpkin');
  assert.ok(h.probe().time > 0);
  assert.ok(h.drawCalls.some(([name]) => name === 'lineTo'), 'terrain is drawn');
  assert.ok(h.drawCalls.some(([name]) => name === 'bezierCurveTo'), 'fruit is drawn');
  assert.equal(h.ids.get('single-courses').hidden, false);
  assert.equal(h.ids.get('risk-courses').hidden, true);
});

test('all 24 existing courses start and animate for both characters', () => {
  const h = lab();
  for (const kind of ['pumpkin', 'rutabaga']) {
    h.select('kind', kind);
    for (const [mode, key, count] of [
      ['single', 'terrain', 8], ['chain', 'chain', 4], ['order', 'order', 4],
      ['variant', 'variant', 4], ['risk', 'risk', 4]
    ]) {
      h.select('study', mode);
      assert.equal(h.choices(key).length, count);
      for (const choice of h.choices(key)) {
        h.select(key, choice.dataset[key]);
        h.frames(.3);
        const p = h.probe();
        assert.equal(p.kind, kind);
        assert.equal(p.mode, mode);
        assert.equal(p.terrain, choice.dataset[key]);
        for (const field of ['x', 'y', 'vx', 'vy', 'time']) assert.ok(Number.isFinite(p[field]), field);
        assert.ok(p.view.zoom > 0, 'finite visible terrain scale');
      }
    }
  }
});

test('both characters respond left/right; reset and interruptions clear held input', () => {
  const h = lab();
  h.select('study', 'risk');
  for (const kind of ['pumpkin', 'rutabaga']) {
    h.select('kind', kind);
    for (const [id, direction] of [['left-control', -1], ['right-control', 1]]) {
      h.select('risk', 'choice');
      const before = h.probe().x, button = h.ids.get(id);
      button.emit('pointerdown', { pointerId: 7, isPrimary: true });
      assert.equal(h.probe().axis, direction);
      h.frames(.6);
      assert.ok((h.probe().x - before) * direction > 5, kind + ' moves ' + id);
      button.emit('pointerup', { pointerId: 7 });
      assert.equal(h.probe().axis, 0);
    }
    h.canvas.emit('pointerdown', { pointerId: 8, clientX: 380, isPrimary: true });
    assert.equal(h.probe().axis, 1);
    h.root.emit('blur');
    assert.equal(h.probe().axis, 0);
    h.root.emit('keydown', { code: 'ArrowLeft' });
    assert.equal(h.probe().axis, -1);
    h.ids.get('reset').emit('click');
    assert.equal(h.probe().axis, 0);
    assert.equal(h.probe().time, 0);
    h.root.emit('keydown', { code: 'ArrowRight' });
    h.doc.hidden = true;
    h.doc.emit('visibilitychange');
    h.frames(.2);
    assert.equal(h.probe().axis, 0);
    assert.equal(h.probe().time, 0);
    h.doc.hidden = false;
    h.frames();
    assert.ok(h.probe().time > 0);
  }
});

test('existing local-save key and experiment data survive the entry-point repair', () => {
  const h = lab();
  h.select('kind', 'rutabaga');
  h.select('study', 'risk');
  h.select('risk', 'choice');
  h.ids.get('memo').value = '着地してから押し直す';
  h.ids.get('save').emit('click');
  assert.equal(h.storage.size, 1);
  const [entry] = JSON.parse(h.storage.get('pumpoko-feel-lab-terrains-v1'));
  assert.equal(entry.kind, 'rutabaga');
  assert.equal(entry.mode, 'risk');
  assert.equal(entry.terrain, 'choice');
  assert.equal(entry.note, '着地してから押し直す');
  assert.equal(entry.risk.startX, 2770);
  assert.equal(entry.risk.gap.b - entry.risk.gap.a, 110);
  assert.ok(entry.points.length > 0);
  assert.match(h.ids.get('saved').textContent, /1件/);
});


test('native steering buttons hold with Enter/Space and AT clicks have a finite pulse', () => {
  const h = lab();
  for (const [id, direction, code] of [['left-control', -1, 'Enter'], ['right-control', 1, 'Space']]) {
    const button = h.ids.get(id);
    button.emit('keydown', {code});
    assert.equal(h.probe().axis, direction);
    h.frames(.3);
    button.emit('keyup', {code});
    assert.equal(h.probe().axis, 0);
    button.emit('click', {detail: 0});
    assert.equal(h.probe().axis, direction);
    h.frames(.3);
    assert.equal(h.probe().axis, 0, 'AT activation never leaves steering held');
    button.emit('click', {detail: 1});
    assert.equal(h.probe().axis, 0, 'pointer click does not add another pulse');
    button.emit('keydown', {code});
    button.emit('blur');
    assert.equal(h.probe().axis, 0);
    button.emit('keydown', {code});
    h.root.emit('blur');
    assert.equal(h.probe().axis, 0);
    button.emit('click', {detail: 0});
    h.ids.get('reset').emit('click');
    assert.equal(h.probe().axis, 0);
  }
});

test('saved evaluations remain visible after reload without rewriting old records', () => {
  const key = 'pumpoko-feel-lab-terrains-v1';
  const entry = {kind:'pumpkin', terrain:'bowl', note:'<img src=x onerror=alert(1)>', points:[[1,2,3]], at:'2026-10-10'};
  const data = JSON.stringify([entry]);
  const h = lab([[key,data]]);
  assert.match(h.ids.get('saved-results').textContent, /2026-10-10/);
  assert.ok(h.ids.get('saved-results').textContent.includes(entry.note));
  assert.equal(h.storage.get(key), data, 'read does not migrate saved snapshots');
  h.ids.get('memo').value = 'another record';
  h.ids.get('save').emit('click');
  assert.equal(JSON.stringify(JSON.parse(h.storage.get(key))[0]), JSON.stringify(entry));
  assert.match(h.ids.get('saved-results').textContent, /another record/);
  const again = lab([[key,h.storage.get(key)]]);
  assert.match(again.ids.get('saved-results').textContent, /another record/);
  assert.match(lab([[key,'{broken']]).ids.get('saved-results').textContent, /読み込めません/);
  assert.match(lab().ids.get('saved-results').textContent, /まだ記録/);
});

test('softWaves and doubleBounce radius offsets are regular and resolve to their authored contact', () => {
  const h = lab(), W = h.root.FruitLabWorld;
  for (const terrain of ['softWaves', 'doubleBounce']) {
    h.select('terrain',terrain);
    h.ids.get('save').emit('click');
    const points = JSON.parse(h.storage.get('pumpoko-feel-lab-terrains-v1')).at(-1).points;
    const course = {curves:{surface:points}};
    for (const r of [36,32]) {
      for (let x = -499; x < 500; x += .25) {
        const f = W.curve('surface',x,course);
        assert.ok(1-r*f.curvature/(1+f.slope*f.slope)**1.5 > .1, terrain+' offset is unfolded');
        const body = {layer:'surface',x:f.x+f.nx*r,y:f.y+f.ny*r,r};
        const contact = W.contact(body,course);
        assert.ok(Math.abs(contact.x-x)<.06, terrain+' contact returns original surface point');
        assert.ok(Math.abs(contact.distance-r)<1e-5, terrain+' respects fruit radius');
      }
    }
  }
});

test('terminal-bank traces stay finite with stable contact and bounded speed for both fruits', () => {
  const h = lab(), P = h.root.FruitLabPhysics, W = h.root.FruitLabWorld;
  for (const terrain of ['softWaves', 'doubleBounce']) {
    h.select('terrain',terrain);
    h.ids.get('save').emit('click');
    const points=JSON.parse(h.storage.get('pumpoko-feel-lab-terrains-v1')).at(-1).points;
    const course={curves:{surface:points}};
    const geometry={contact:b=>W.contact(b,course),frame:x=>W.curve('surface',x,course),constrain(b){
      const x=Math.max(-500+15+b.r,Math.min(500-15-b.r,b.x));
      if(x===b.x)return;
      b.x=x;b.vx*=-.25;
      const f=W.contact(b,course);
      if(f.distance<b.r){b.x=f.x+f.nx*b.r;b.y=f.y+f.ny*b.r}
    }};
    for(const kind of ['pumpkin','rutabaga']){
      const s=P.create(kind,P.defaults()),b=s[kind],f=W.curve('surface',360,course);
      Object.assign(b,{layer:'surface',x:f.x+b.r*f.nx,y:f.y+b.r*f.ny,
        vx:100*f.tx,vy:100*f.ty,grounded:true});
      for(let i=0;i<1200;i++){
        const x=b.x,y=b.y;s.time+=P.STEP;
        P.integrate(s,b,.7,P.STEP,geometry);
        for(const v of [b.x,b.y,b.vx,b.vy])assert.ok(Number.isFinite(v));
        assert.ok(Math.hypot(b.vx,b.vy)<620,'existing velocity cap respected');
        assert.ok(Math.hypot(b.x-x,b.y-y)<2,'no contact snap at terminal bank');
        assert.ok(b.r-W.contact(b,course).distance<1e-5,'body remains above support');
      }
    }
  }
});
