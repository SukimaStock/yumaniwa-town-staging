'use strict';
// Local Chromium integration. No external analytics requests are allowed.
const assert = require('node:assert/strict');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const { readRegistry } = require('../tools/work-lifecycle.cjs');
const root = path.resolve(__dirname, '..');
const prefix = '/yumaniwa-town-staging';
async function main() {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    let file = path.resolve(root, '.' + pathname.replace(/^\/yumaniwa-town-staging(?=\/|$)/, ''));
    if (!file.startsWith(root + path.sep) && file !== root) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.md': 'text/plain', '.webmanifest': 'application/manifest+json', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' }[path.extname(file)];
    res.setHeader('Content-Type', mime || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`, frozen = readRegistry(root).works.filter(work => work.status === 'frozen');
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 900 }]) {
      const context = await browser.newContext({ viewport, javaScriptEnabled: false });
      const page = await context.newPage(); await page.goto(base + prefix + '/lab/');
      assert.equal(await page.locator('article').count(), 6);
      assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'noindex,nofollow');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      for (const work of frozen) {
        const card = page.locator('#' + work.id); await card.locator('summary').click();
        assert.ok(await card.getByRole('heading', { name: 'What we learned', exact: true }).isVisible());
        const href = await card.getByRole('link', { name: '試作に触れる', exact: true }).getAttribute('href');
        const response = await context.request.get(new URL(href, page.url()).href); assert.equal(response.status(), 200, work.id);
        assert.equal((await context.request.get(new URL('../' + work.archive, page.url()).href)).status(), 200);
      }
      if (process.env.LIFECYCLE_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.LIFECYCLE_SCREENSHOTS, 'lab-' + viewport.width + '.png'), fullPage: true });
      await context.close(); console.log('PASS LAB without JavaScript, records and all links: ' + viewport.width + 'x' + viewport.height);
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const blocked = [], errors = [];
    await context.route('**/*', route => {
      if (route.request().url().startsWith(base)) return route.continue();
      blocked.push(route.request().url()); return route.abort();
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + prefix + '/');
    await page.waitForFunction(() => typeof currentScene !== 'undefined' && typeof setupDeveloperToggleButton === 'function');
    await page.locator('#btn-debug-toggle').tap();
    const link = page.getByRole('link', { name: 'LAB — 探索の記録', exact: true });
    await link.scrollIntoViewIfNeeded(); assert.ok(await link.isVisible()); await link.tap();
    await page.waitForURL('**/lab/'); assert.equal(await page.locator('article').count(), 6);
    await page.locator('#town-glance-03').getByRole('link', { name: '試作に触れる', exact: true }).tap();
    await page.waitForURL('**/works/town-glance-03/'); await page.getByRole('button', { name: '場所を見る', exact: true }).tap();
    await page.goBack(); await page.waitForURL('**/lab/');
    await page.goto(base + prefix + '/?work=rainy-window');
    await page.waitForFunction(() => isWorkPlayerOpen === true);
    assert.match(await page.locator('#work-player-frame').getAttribute('src'), /works\/rainy-window/);
    await page.locator('#btn-close-work').tap(); await page.waitForFunction(() => isWorkPlayerOpen === false);
    assert.ok(await page.locator('#btn-debug-toggle').isVisible());
    assert.deepEqual(errors, []); assert.deepEqual(blocked, []);
    console.log('PASS phone: developer → LAB → preserved prototype → back; existing work open/close and dev return; no external requests or JS errors');
    await context.close();
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
