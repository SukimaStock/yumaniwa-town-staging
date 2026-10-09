'use strict';
// DOM/Canvas doubles exercise the actual application wiring, not a browser/layout claim.
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const folder = path.resolve(__dirname, '..');
class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.events = new Map(); this.hidden = false; this.value = ''; this._text = ''; }
  set textContent(value) { this._text = String(value); this.replaceChildren(); }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children.forEach(n => { n.parent = null; }); this.children = []; this.append(...nodes); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); this.parent = null; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(k, fn) { if (!this.events.has(k)) this.events.set(k, new Set()); this.events.get(k).add(fn); }
  removeEventListener(k, fn) { this.events.get(k)?.delete(fn); }
  async emit(k, e = {}) { for (const fn of this.events.get(k) || []) await fn({ target: this, preventDefault() {}, ...e }); }
  all() { return this.children.flatMap(c => [c, ...c.all()]); }
  querySelectorAll(selector) {
    return this.all().filter(e => {
      if (selector.startsWith('.')) return String(e.className || '').split(' ').includes(selector.slice(1));
      if (selector === 'dialog[open]') return e.tagName === 'dialog' && e.open;
      const attr = selector.match(/^\[data-(.+)\]$/); if (attr) return e.dataset[attr[1]] !== undefined;
      return e.tagName === selector;
    });
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  click() { return this.emit('click'); }
  reset() { this.resetHandler?.(); }
}
function boot({ compact = false, initialStorage = null } = {}) {
  const document = new Element('document'), ids = new Map(), frames = new Map(), errors = [], memory = new Map(); let uuid = 0, raf = 0;
  document.hidden = false; document.body = new Element('body'); document.append(document.body);
  document.createElement = tag => new Element(tag); document.createTextNode = text => { const e = new Element('#text'); e.textContent = text; return e; }; document.getElementById = id => ids.get(id);
  const html = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<([\w-]+)[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const e = new Element(match[1]); e.id = match[2]; document.body.append(e); ids.set(e.id, e);
  }
  const summary = new Element('summary'); ids.get('tuning').append(summary);
  for (const mode of ['sweet', 'bitter']) { const e = new Element('button'); e.dataset.mode = mode; ids.get('firefly-mode').append(e); }
  for (const id of ['save-dialog', 'shelf-dialog', 'sources-dialog']) { const e = new Element('button'); e.dataset.close = id; ids.get(id).append(e); }
  ids.get('save-form').resetHandler = () => { ids.get('specimen-title').value = ''; ids.get('specimen-memo').value = ''; };
  const canvas = ids.get('stage'); canvas.getBoundingClientRect = () => ({ left: 20, top: 100, width: 650, height: 450 }); canvas.setPointerCapture = () => {}; canvas.releasePointerCapture = () => {};
  const drawing = new Proxy({}, { get: (_, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true }); canvas.getContext = () => drawing;
  const host = new Element('window');
  Object.assign(host, { document, devicePixelRatio: 2, crypto: { getRandomValues: a => { a[0] = 42; return a; }, randomUUID: () => 's-' + ++uuid }, requestAnimationFrame: fn => { frames.set(++raf, fn); return raf; }, cancelAnimationFrame: id => frames.delete(id), setTimeout: () => 1, clearTimeout() {}, matchMedia: () => ({ matches: compact, addEventListener() {} }), localStorage: { getItem: k => initialStorage ?? memory.get(k), setItem: (k, v) => memory.set(k, v) } });
  const context = vm.createContext({ window: host, document, console: { error: (...args) => errors.push(args) }, Uint32Array, URL: { createObjectURL: () => 'blob:local', revokeObjectURL() {} }, Blob });
  for (const match of html.matchAll(/<script defer src="([^"]+)"><\/script>/g)) vm.runInContext(fs.readFileSync(path.join(folder, match[1]), 'utf8'), context, { filename: match[1] });
  const frame = time => { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(time); };
  return { host, document, ids, errors, memory, frame, buttons: () => document.querySelectorAll('[data-experiment]'), snapshot: () => host.MotionLab.snapshot() };
}
test('actual application boot, selection and live slider wiring; each experiment retains its settings', async () => {
  const h = boot(); assert.equal(h.buttons().length, 3); assert.equal(h.snapshot().experiment, 'slime'); assert.equal(h.ids.get('parameters').children.length, 4);
  assert.equal(h.ids.get('tuning').open, true); h.frame(0); h.frame(20);
  const input = h.ids.get('parameters').children[0].children[1]; input.value = '100'; await input.emit('input'); assert.equal(h.snapshot().parameters.elasticity, 100);
  await h.buttons()[1].click(); assert.equal(h.snapshot().experiment, 'puddle'); h.frame(40);
  await h.buttons()[0].click(); assert.equal(h.snapshot().parameters.elasticity, 100);
  await h.ids.get('reset').click(); assert.equal(h.snapshot().parameters.elasticity, 48); assert.deepEqual(h.errors, []);
});
test('actual save/restore flow crosses experiments, preserves Firefly mode, and stores plain memo text', async () => {
  const h = boot({ compact: true }); assert.equal(h.ids.get('tuning').open, false);
  await h.buttons()[2].click(); await h.document.querySelectorAll('[data-mode]')[1].click();
  assert.ok(h.ids.get('hint').textContent.includes('1本指でも'));
  await h.ids.get('open-save').click(); h.ids.get('specimen-title').value = 'にがい水'; h.ids.get('specimen-memo').value = '<script>hello</script>';
  await h.ids.get('save-form').emit('submit'); assert.equal(h.snapshot().specimens, 1); assert.equal(h.ids.get('save-dialog').open, false);
  const saved = JSON.parse([...h.memory.values()][0]).specimens[0]; assert.equal(saved.interactionMode, 'bitter'); assert.equal(saved.seed, 42);
  await h.buttons()[0].click(); await h.ids.get('open-shelf').click();
  const card = h.ids.get('specimens').children[0]; assert.ok(card.textContent.includes('<script>hello</script>'));
  await card.querySelector('button').click(); h.frame(0); h.frame(250);
  assert.equal(h.snapshot().experiment, 'firefly'); assert.equal(h.ids.get('shelf-dialog').open, false); assert.ok(h.snapshot().state.water.bitter > .3); assert.ok(h.ids.get('hint').textContent.includes('1本指でも'));
  await h.ids.get('replay').click(); h.frame(300); h.frame(350); assert.ok(h.snapshot().state.water.bitter > .3, 'replay keeps chosen interaction mode'); assert.deepEqual(h.errors, []);
});
test('actual import handler fails safely, source catalog is data-driven and navigation opens the right experiment', async () => {
  const h = boot({ initialStorage: 'broken' }); assert.equal(h.snapshot().specimens, 0); assert.ok(h.ids.get('storage-warning').textContent);
  await h.ids.get('open-shelf').click(); h.ids.get('import').files = [{ size: 2, text: async () => '{}' }]; await h.ids.get('import').emit('change');
  assert.equal(h.snapshot().specimens, 0); assert.ok(h.ids.get('status').textContent.includes('形式')); assert.equal(h.ids.get('import').value, '');
  await h.ids.get('shelf-dialog').querySelector('[data-close]').click(); await h.ids.get('open-sources').click(); assert.equal(h.ids.get('sources').children.length, 3);
  const last = h.ids.get('sources').children[2]; assert.equal(last.querySelector('a').href, 'https://drive.google.com/file/d/17OlvroUARcn3RHEJY3XCrunzYuv8RiRF/view');
  await last.querySelector('button').click(); assert.equal(h.snapshot().experiment, 'firefly'); assert.equal(h.ids.get('sources-dialog').open, false); assert.deepEqual(h.errors, []);
});
