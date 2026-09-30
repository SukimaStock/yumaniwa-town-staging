'use strict';
// Optional real-browser checks: node tests/test-engine-input-boot-browser.cjs
// Requires Playwright + Chromium. Missing browser is a failure, not a simulated pass.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
async function main() {
  const server = http.createServer((req, res) => {
    let p = path.resolve(root, '.' + new URL(req.url, 'http://local').pathname);
    if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    if (!fs.existsSync(p)) { res.writeHead(404).end(); return; }
    const mime = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)];
    res.setHeader('Content-Type', mime || 'application/octet-stream'); fs.createReadStream(p).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base + '/tests/fixtures/engine-runtime/');
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'BODY');
    await page.mouse.move(400, 350);
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'BODY');
    await page.mouse.click(400, 350);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'canvas');
    await page.keyboard.down('Space');
    await page.waitForFunction(() => probe.presses === 1);
    await page.keyboard.down('Space');
    await page.keyboard.up('Space');
    assert.equal(await page.evaluate(() => probe.presses), 1);
    for (const id of ['input', 'textarea', 'select', 'child']) {
      await page.locator('#' + id).click();
      const before = await page.evaluate(() => [probe.presses, probe.gestures]);
      await page.keyboard.press('Space');
      assert.deepEqual(await page.evaluate(() => [probe.presses, probe.gestures]), before);
      assert.equal(await page.evaluate(() => probe.prevented.at(-1)), false);
      assert.notEqual(await page.evaluate(() => document.activeElement.id), 'canvas');
    }
    await page.mouse.click(400, 350); await page.keyboard.down('Space');
    await page.locator('#input').focus(); await page.keyboard.up('Space');
    assert.equal(await page.evaluate(() => SSE.input.keysDown.size), 0);
    assert.equal(await page.evaluate(() => SSE.input.keysReleased.size), 0);
    await page.mouse.move(400, 350); await page.mouse.down();
    assert.equal(await page.evaluate(() => CodeaLite.state.canvas.hasPointerCapture(SSE.runtime.state.activePointerId)), true);
    await page.mouse.move(20, 20); await page.mouse.up();
    assert.equal(await page.evaluate(() => CodeaLite.state.pointers.size), 0);
    assert.equal(await page.evaluate(() => probe.touches.at(-1)), 'ENDED');
    await page.evaluate(() => { CodeaLite.start('canvas'); CodeaLite.start('canvas'); });
    assert.equal(await page.evaluate(() => probe.setups), 1);
    assert.deepEqual(errors, []);
    console.log('PASS Chromium: DOM focus, editable controls, repeat, editable keyup, real pointer capture/up, duplicate start.');
    // Isolated Engine-only compatibility smoke; no ORBIT files are rewritten.
    await page.route('**/engine/sukimastock-engine.v0.2.0.js*', route => route.fulfill({ path: path.join(root, 'engine/sukimastock-engine.v0.3.0.js'), contentType: 'text/javascript' }));
    await page.goto(base + '/works/orbit/');
    await page.waitForFunction(() => window.SSE?.runtime.state.setupDone && CodeaLite.state.started);
    assert.equal(await page.evaluate(() => SSE.VERSION), '0.3.0');
    assert.deepEqual(errors, []);
    console.log('PASS Chromium: ORBIT existing adapter + new Engine isolated boot smoke only (not gameplay/audio migration verification).');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
