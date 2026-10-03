'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

function harness(options = {}) {
    const nodes = new Map(), downloads = [], revoked = [], statuses = [];
    class Target {
        constructor(id) { this.id = id; this.listeners = {}; this.hidden = false; this.attrs = {}; }
        addEventListener(type, fn, capture) {
            (this.listeners[type] ||= []).push({ fn, capture: capture === true });
        }
        dispatch(type, props = {}) {
            const e = { target: this, preventDefault() { this.defaultPrevented = true; },
                stopPropagation() { this.stopped = true; }, stopImmediatePropagation() { this.immediate = true; }, ...props };
            const list = this.listeners[type] || [];
            for (const l of [...list.filter(l => l.capture), ...list.filter(l => !l.capture)]) {
                l.fn(e); if (e.immediate) break;
            }
            return e;
        }
        appendChild(child) { child.parentNode = this; if (child.id) nodes.set(child.id, child); }
        removeChild() {}
        setAttribute(k, v) { this.attrs[k] = v; }
        removeAttribute(k) { delete this.attrs[k]; }
        set innerHTML(html) {
            for (const match of html.matchAll(/id="([^"]+)"/g)) nodes.set(match[1], new Target(match[1]));
            this.card = new Target('card');
        }
        querySelector() { return this.card; }
        click() { if (this.download) downloads.push(this.download); this.dispatch('click'); }
    }
    const player = new Target('work-player');
    player.open = true; player.classList = { contains: () => player.open };
    const frame = new Target('work-player-frame');
    frame.contentWindow = { postMessage: data => statuses.push(data) };
    nodes.set(player.id, player); nodes.set(frame.id, frame);
    const document = new Target('document');
    Object.assign(document, { getElementById: id => nodes.get(id), createElement: () => new Target(),
        head: new Target(), body: new Target() });
    const window = new Target('window');
    Object.assign(window, { currentWorkId: options.workId || 'midnight-cola', setTimeout() {}, atob });
    let observe;
    const navigator = { userAgent: options.ua || 'desktop', maxTouchPoints: options.touch || 0, ...options.navigator };
    const ctx = { document, window, navigator, Blob, File, Uint8Array,
        URL: { createObjectURL: () => 'blob:' + Math.random(), revokeObjectURL: u => revoked.push(u) },
        MutationObserver: class { constructor(fn) { observe = fn; } observe() {} } };
    vm.runInNewContext(read('share-bridge.js'), ctx);
    let exits = 0;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') exits++; });
    function open(workId = window.currentWorkId) {
        window.dispatch('message', { source: frame.contentWindow, data: { type: 'yumaniwa:share-result',
            workId, title: 'result', text: '', file: new File(['image'], workId + '.png', { type: 'image/png' }) } });
    }
    return { nodes, document, window, player, frame, downloads, revoked, statuses, open, observe, exits: () => exits };
}

for (const workId of ['midnight-cola', 'rojiura-masala', 'junkissa-dive']) {
    test(workId + ': save retains preview; image X returns only to game; repeat works', () => {
        const h = harness({ workId }); h.open();
        h.nodes.get('yumaniwa-share-save').click();
        assert.deepEqual(h.downloads, [workId + '.png']);
        assert.equal(h.nodes.get('yumaniwa-share-panel').hidden, false);
        assert.ok(h.nodes.get('yumaniwa-share-preview').src);
        h.nodes.get('yumaniwa-share-dismiss').click();
        assert.equal(h.player.open, true);
        assert.equal(h.nodes.get('yumaniwa-share-panel').hidden, true);
        assert.equal(h.statuses.at(-1).status, 'closed');
        h.open(); assert.equal(h.nodes.get('yumaniwa-share-panel').hidden, false);
    });
}
for (const device of [{ ua: 'iPhone' }, { ua: 'iPad' }, { ua: 'Macintosh', touch: 5 }]) {
    test(device.ua + ': native image save stays visible without synthetic download or false completion', () => {
        const h = harness(device); h.open(); h.nodes.get('yumaniwa-share-save').click();
        assert.equal(h.downloads.length, 0);
        assert.equal(h.nodes.get('yumaniwa-share-panel').hidden, false);
        assert.match(h.nodes.get('yumaniwa-share-message').textContent, /長押し/);
        assert.equal(h.statuses.some(s => s.status === 'saved'), false);
    });
}
test('Escape dismisses image before town exit; next Escape keeps normal town behavior', () => {
    const h = harness(); h.open(); h.document.dispatch('keydown', { key: 'Escape' });
    assert.equal(h.exits(), 0); assert.equal(h.player.open, true);
    h.document.dispatch('keydown', { key: 'Escape' }); assert.equal(h.exits(), 1);
});
for (const name of ['AbortError', 'NotAllowedError']) {
    test('native share ' + name + ' retains preview and allows retry', async () => {
        let attempts = 0;
        const h = harness({ navigator: { share: async () => { attempts++; throw { name }; } } });
        h.open(); h.nodes.get('yumaniwa-share-native').click();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(h.nodes.get('yumaniwa-share-panel').hidden, false);
        assert.equal(h.nodes.get('yumaniwa-share-native').disabled, false);
        assert.equal(h.statuses.at(-1).status, name === 'AbortError' ? 'cancelled' : 'failed');
        h.nodes.get('yumaniwa-share-native').click(); await new Promise(resolve => setImmediate(resolve));
        assert.equal(attempts, 2);
    });
}
test('late native share completion cannot clear a newer image panel', async () => {
    let done;
    const h = harness({ navigator: { share: () => new Promise(resolve => { done = resolve; }) } });
    h.open(); h.nodes.get('yumaniwa-share-native').click();
    h.nodes.get('yumaniwa-share-dismiss').click(); h.open();
    const src = h.nodes.get('yumaniwa-share-preview').src;
    done(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.nodes.get('yumaniwa-share-panel').hidden, false);
    assert.equal(h.nodes.get('yumaniwa-share-preview').src, src);
    assert.equal(h.statuses.at(-1).status, 'ready');
});
test('normal player exit cleans pending image and revokes its URL', () => {
    const h = harness(); h.open(); h.player.open = false; h.observe();
    assert.equal(h.nodes.get('yumaniwa-share-panel').hidden, true);
    assert.equal(h.revoked.length, 1);
});
test('Masala save uses existing bridge; unavailable bridge retains download fallback', async () => {
    const src = read('works/rojiura-masala/sketch.js');
    const start = src.indexOf('  async function saveResultImage('), end = src.indexOf('  async function shareResultImage(', start);
    const calls = [], ctx = { Blob, document: { createElement: () => ({ style: {}, click() { calls.push('download'); }, remove() {} }),
        body: { appendChild() {} } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
        window: { setTimeout() {} }, resultBlobToFile: x => x, resultExportFileName: () => 'masala.png',
        resultShareText: () => 'original text', sendResultToYumaniwa: (...args) => { calls.push(args); return true; } };
    vm.createContext(ctx); vm.runInContext(src.slice(start, end), ctx);
    assert.equal((await ctx.saveResultImage({}, new Blob(['image']))).method, 'yumaniwa-bridge');
    assert.equal(calls[0][1], 'original text');
    ctx.sendResultToYumaniwa = () => false;
    assert.equal((await ctx.saveResultImage({}, new Blob(['image']))).method, 'download');
    assert.equal(calls.at(-1), 'download');
});
test('Junkissa existing save captures PNG then hands it to town, standalone fallback remains', async () => {
    const src = read('works/junkissa-dive/sketch.js');
    const start = src.indexOf('let jdYumaniwaShareBridgeReady'), end = src.indexOf('function jdResetAll()', start);
    const messages = [], win = { top: { postMessage: m => messages.push(m) }, setTimeout() {}, addEventListener(_, fn) { this.onmessage = fn; } };
    const ctx = { window: win, document: {}, File, Blob, navigator: {}, JD: { lang: 'jp', scale: 1 },
        jdT: () => 'JUNKISSA DIVE', jdFindGameCanvas: () => ({}), jdNowMs: () => 0,
        jdUpdateScale() {}, pushMatrix() {}, translate() {}, scale() {}, jdDrawCompletionPosterStatic() {}, popMatrix() {},
        jdCreatePosterCaptureCanvas: () => ({ toDataURL: () => 'data:image/png;base64,aW1hZ2U=' }),
        jdBuildPosterImageFileName: () => 'poster.png', jdSetPosterSaveStatus() {}, jdGetPosterItem: () => ({ targetType: 'coffee' }),
        trackJunkissaDiveEvent() {}, jdDataUrlToPngBlob: () => null, jdNamePosterPngBlob: () => null,
        jdShowPosterImageFallback() { messages.push('standalone-fallback'); } };
    vm.createContext(ctx); vm.runInContext(src.slice(start, end), ctx);
    win.onmessage({ source: win.top, data: { type: 'yumaniwa:share-bridge-ready', workId: 'junkissa-dive' } });
    await ctx.jdSavePosterImage();
    assert.equal(messages.at(-1).type, 'yumaniwa:share-result');
    assert.equal(messages.at(-1).fileName, 'poster.png');
    assert.equal(messages.at(-1).dataUrl, 'data:image/png;base64,aW1hZ2U=');
    vm.runInContext('jdYumaniwaShareBridgeReady = false', ctx);
    await ctx.jdSavePosterImage(); assert.equal(messages.at(-1), 'standalone-fallback');
});

function masalaActionsHarness(bridgeReady) {
    const src = read('works/rojiura-masala/sketch.js'), drawn = [], exported = [], replays = [];
    const ctx = { W: 360, RESULT_ACTION_W: 92, RESULT_ACTION_H: 25, RESULT_ACTION_Y: 10,
        RESULT_SAVE_X: 74, RESULT_SHARE_X: 194, RESULT_ACTION_HIT_PAD_X: 8, RESULT_ACTION_HIT_PAD_Y: 8,
        RESULT_MIN_TAP_TIME: 1.35, ENDED: 2, yumaniwaShareBridgeReady: bridgeReady,
        drawResultActionButton: (...args) => drawn.push(args), titleLanguageChoice: () => null,
        markKeyboardPrimaryBusy() {}, SSE: { i18n: { t: key => key }, app: { replace: (...args) => replays.push(args) } } };
    vm.createContext(ctx);
    const start = src.indexOf('  function resultSaveButtonX('), end = src.indexOf('  function resultExportFileName(', start);
    vm.runInContext(src.slice(start, end), ctx);
    const sceneStart = src.indexOf('  const resultScene = {');
    const sceneEnd = src.indexOf('  // Begin loading authored prop', sceneStart);
    vm.runInContext(src.slice(sceneStart, sceneEnd) + '\nthis.scene = resultScene;', ctx);
    ctx.scene.age = 2;
    ctx.scene.exportImage = mode => exported.push(mode);
    return { ctx, drawn, exported, replays, tap: (x, y = 22) => ctx.scene.touch({ x, y, state: 2 }) };
}
test('town Masala renders one centered Save and opens export once; hidden Share has no action', () => {
    const h = masalaActionsHarness(true);
    h.ctx.drawResultActions(2);
    assert.equal(h.drawn.length, 1);
    assert.equal(h.drawn[0][0] + h.drawn[0][2] * 0.5, 180);
    assert.equal(h.drawn[0][4], 'result.save');
    h.tap(180); assert.deepEqual(h.exported, ['save']); assert.equal(h.replays.length, 0);
    h.tap(240); assert.deepEqual(h.exported, ['save']); assert.equal(h.replays.length, 1);
});
test('standalone Masala retains both distinct Save and Share controls', () => {
    const h = masalaActionsHarness(false); h.ctx.drawResultActions(2);
    assert.deepEqual(h.drawn.map(x => x[4]), ['result.save', 'result.share']);
    h.tap(120); h.tap(240); assert.deepEqual(h.exported, ['save', 'share']);
    assert.equal(h.replays.length, 0);
});
test('late bridge readiness updates both drawing and hit regions together', () => {
    const h = masalaActionsHarness(false);
    h.ctx.yumaniwaShareBridgeReady = true;
    h.ctx.drawResultActions(2); assert.equal(h.drawn.length, 1);
    h.tap(180); h.tap(120);
    assert.deepEqual(h.exported, ['save']); assert.equal(h.replays.length, 1);
});
test('result age, export busy gate and replay outside Save are preserved', () => {
    const h = masalaActionsHarness(true);
    h.ctx.scene.age = 0.5; h.ctx.drawResultActions(0.5); h.tap(180);
    assert.equal(h.drawn.length, 0); assert.equal(h.exported.length, 0);
    h.ctx.scene.age = 2; h.ctx.scene.exportBusy = true; h.tap(180);
    assert.equal(h.exported.length, 0);
    h.ctx.scene.exportBusy = false; h.tap(180, 90);
    assert.equal(h.exported.length, 0); assert.equal(h.replays.length, 1);
});
