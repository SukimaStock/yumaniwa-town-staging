import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const origin = 'https://sukimastock.github.io';
const staging = '/yumaniwa-town-staging/works/ambertime/';
const production = '/yumaniwa-town/works/ambertime/';
const flags = '?preview=1&local-start=pair-origin&shadow=1&recall-preview=1';
const fixture = /\/(preview-cases-[ab]\.js|debug-fixtures\.mjs)$/;
const types = { js: 'text/javascript', mjs: 'text/javascript', png: 'image/png',
  ttf: 'font/ttf', wav: 'audio/wav', html: 'text/html' };

test('release entry, scoped saves and staging-only audit controls', {
  skip: !process.env.AMBER_BROWSER_MODULE, timeout: 120000
}, async () => {
  const { chromium } = await import(process.env.AMBER_BROWSER_MODULE);
  const browser = await chromium.launch({ executablePath: process.env.AMBER_BROWSER_EXECUTABLE });
  const scratch = await mkdtemp(join(tmpdir(), 'amber-release-'));
  try {
    const out = join(scratch, 'ambertime');
    execFileSync(process.execPath, [fileURLToPath(new URL('build-release.mjs', root)), out]);
    const packaged = pathToFileURL(out + '/');
    const page = await browser.newPage({ viewport: { width: 390, height: 680 }, hasTouch: true });
    const errors = [], loads = [];
    page.on('pageerror', err => errors.push(err.message));
    // Route both real URL shapes to the exact checkout without contacting either site.
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const dir = [staging, production].find(p => url.origin === origin && url.pathname.startsWith(p));
      if (!dir) return route.abort();
      const path = url.pathname.slice(dir.length) || 'index.html';
      loads.push(path);
      try {
        const body = await readFile(new URL(path, dir === production ? packaged : root));
        await route.fulfill({ body, contentType: types[path.split('.').at(-1)] });
      } catch { await route.fulfill({ status: 404 }); }
    });
    async function title(path, query = '') {
      await page.goto(origin + path + query);
      await page.waitForFunction(() => document.body.dataset.entry === 'true' &&
        !document.querySelector('#entry-new').disabled);
    }
    async function assertNormal() {
      assert.equal(await page.locator('#entry-transfer, #entry-export, #entry-error-details').evaluateAll(
        nodes => nodes.some(node => node.getClientRects().length > 0)), false);
      assert.equal(await page.evaluate(() => !!(window.amberPlacement || window.amberShadow || window.__amberBRecallAudit)), false);
    }
    const newGame = page.locator('#entry-new'), resume = page.locator('#entry-continue');
    const ledger = page.getByRole('button', { name: '帳面', exact: true });
    await title(staging, flags);
    await assertNormal();
    assert.equal(await resume.isVisible(), false);
    await newGame.click();
    await ledger.waitFor();
    await page.locator('#open-aux-menu').click();
    assert.equal(await page.locator('#open-settings').isVisible(), false);
    assert.equal(await page.locator('#local-export').isVisible(), false);

    await title(production, flags + '&debug=1');
    await assertNormal();
    assert.equal(await resume.isVisible(), false);
    await newGame.click();
    await ledger.waitFor();
    await title(production);
    await resume.click();
    await ledger.waitFor();
    await title(staging);
    assert.equal(await resume.isVisible(), true);
    await assertNormal();
    assert.equal(loads.some(path => fixture.test('/' + path)), false);

    await title(staging, '?debug=1');
    assert.equal(await page.locator('#entry-export').isVisible(), true);
    assert.equal(await page.evaluate(() => !!window.amberPlacement && !!window.__amberBRecallAudit), true);
    await resume.click();
    await ledger.waitFor();
    await page.locator('#open-aux-menu').click();
    assert.equal(await page.locator('#open-settings').isVisible(), true);
    await page.locator('#open-settings').click();
    assert.equal(await page.locator('[data-action="debug-skip"]').count() > 0, true);
    await page.goto(origin + staging + '?debug=1&preview=1&local-start=pair-origin');
    await ledger.waitFor();
    assert.equal(await page.evaluate(() => window.amberPlacement.snapshot().core.month), 187);
    assert.ok(loads.some(path => fixture.test('/' + path)));
    await title(staging, '?debug=1');
    const downloaded = page.waitForEvent('download');
    await page.locator('#entry-export').click();
    assert.equal(JSON.parse(await readFile(await (await downloaded).path(), 'utf8')).game.core.month, 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await rm(scratch, {recursive: true, force: true});
  }
});
