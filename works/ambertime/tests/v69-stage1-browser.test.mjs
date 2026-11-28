import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const url = 'https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/';
const types = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript',
  ttf: 'font/ttf', wav: 'audio/wav', png: 'image/png' };

test('new mash choice survives resume and map navigation reveals the requested shelf', {
  skip: !process.env.AMBER_BROWSER_MODULE, timeout: 90000
}, async () => {
  const { chromium } = await import(process.env.AMBER_BROWSER_MODULE);
  const browser = await chromium.launch({ executablePath: process.env.AMBER_BROWSER_EXECUTABLE });
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 568 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const request = route.request().url();
      if (!request.startsWith(url)) return route.abort();
      const path = request.slice(url.length).split('?')[0] || 'index.html';
      await route.fulfill({ body: await readFile(new URL(path, root)),
        contentType: types[path.split('.').at(-1)] });
    });
    for (const entry of ['#entry-new', '#entry-continue']) {
      await page.goto(url + '?debug=1');
      await page.locator(entry).click();
      await page.locator('#open-ledger').waitFor();
      const cards = await page.evaluate(() => window.amberPlacement.snapshot().labConnection.cards);
      assert.deepEqual(cards, { malt: 'plain', ferment: 'short' });
    }
    await page.goto(url + '?debug=1&preview=1&local-start=overseas-27-3-60');
    await page.locator('[data-action="map-continue"]').click();
    await page.locator('#open-world-map').click();
    for (let step = 0; step < 4; step++) await page.locator('[data-m0="stage-prev"]').click();
    await page.locator('.m0-pin[data-m0-shop="town-liquor"]').click();
    await page.locator('[data-room="sales"]:visible').first().click();
    await page.waitForFunction(() => document.querySelector('.market-stage-label')?.textContent === '近所'
      && document.querySelector('.market-map-selected')?.dataset.marketShop === 'town-liquor');
    assert.equal(await page.locator('.market-map-selected').count(), 1);
    assert.ok(await page.locator('.market-map-selected').evaluate(row => {
      const item = row.getBoundingClientRect(), pane = row.closest('.market-partners').getBoundingClientRect();
      return item.top >= pane.top - 1 && item.bottom <= pane.bottom + 1;
    }));
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
