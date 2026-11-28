import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const url = 'https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/';
const types = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript',
  ttf: 'font/ttf', wav: 'audio/wav', png: 'image/png' };

for (const outcome of ['commit', 'abort', 'pagehide']) {
  test('lever remains down through countdown and a pending ' + outcome, {
    skip: !process.env.AMBER_BROWSER_MODULE, timeout: 30000
  }, async () => {
    const { chromium } = await import(process.env.AMBER_BROWSER_MODULE);
    const browser = await chromium.launch({ executablePath: process.env.AMBER_BROWSER_EXECUTABLE });
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 680 }, hasTouch: true });
      await page.route('**/*', async route => {
        const request = route.request().url();
        if (!request.startsWith(url)) return route.abort();
        const path = request.slice(url.length).split('?')[0] || 'index.html';
        await route.fulfill({ body: await readFile(new URL(path, root)), contentType: types[path.split('.').at(-1)] });
      });
      await page.goto(url);
      await page.locator('#entry-new').click();
      await page.locator('#open-ledger').waitFor();
      await page.locator('#start-distill').tap();
      await page.locator('[data-action="flavor-start"]').tap();
      const lever = page.locator('#distill-lever');
      await lever.press('ArrowDown');
      await lever.press('ArrowDown');
      await page.evaluate(outcome => {
        const scene = document.querySelector('#scene-root');
        window.framesSeen = [];
        let pending = false;
        function sample() {
          const tools = JSON.parse(scene.dataset.distillTools);
          window.framesSeen.push({ count: scene.dataset.countdown ?? null, step: tools.leverStep, pending,
            phase: document.body.dataset.phase });
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
        // Keep the actual start transaction open across frames on fast machines.
        const transaction = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function(...args) {
          const tx = transaction.apply(this, args);
          if (args[1] !== 'readwrite') return tx;
          IDBDatabase.prototype.transaction = transaction;
          pending = true;
          if (outcome === 'pagehide') {
            setTimeout(() => {
              window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
              window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
            }, 30);
          }
          const store = tx.objectStore('records'), until = performance.now() + 250;
          function hold() {
            if (performance.now() < until) store.get('@revision').onsuccess = hold;
            else if (outcome === 'abort') tx.abort();
          }
          tx.addEventListener('complete', () => { pending = false; });
          tx.addEventListener('abort', () => { pending = false; });
          hold();
          return tx;
        };
      }, outcome);
      await lever.press('Enter');
      if (outcome !== 'abort') {
        await page.waitForFunction(() => document.body.dataset.phase === 'distilling');
      } else {
        await page.locator('#storage-notice').waitFor();
        await page.waitForFunction(() => JSON.parse(document.querySelector('#scene-root').dataset.distillTools).leverStep === 0);
        assert.equal(await page.locator('body').getAttribute('data-phase'), 'ready');
      }
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const frames = await page.evaluate(() => window.framesSeen);
      assert.deepEqual([...new Set(frames.map(f => f.count).filter(Boolean))], ['3', '2', '1']);
      const pending = frames.filter(f => f.pending);
      assert.ok(pending.length >= 2, 'observe the pending transaction across frames');
      assert.equal(pending.filter(f => f.step !== 2).length, 0, 'lever raised during the start transaction');
      if (outcome !== 'abort') {
        const transition = frames.slice(frames.findIndex(f => f.count === '3'));
        assert.ok(transition.every(f => f.step === 2), 'held through the first running frame');
        await page.reload();
        await page.locator('#entry-continue').click();
        await page.waitForFunction(() => document.body.dataset.phase === 'distilling');
      } else {
        await page.reload();
        await page.locator('#entry-continue').click();
        await page.waitForFunction(() => document.body.dataset.phase === 'ready');
      }
    } finally {
      await browser.close();
    }
  });
}
