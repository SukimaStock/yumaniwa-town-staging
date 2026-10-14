'use strict';
const assert = require('node:assert/strict');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
(async () => {
  const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + new URL(req.url, 'http://local').pathname);
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', ({'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript'})[path.extname(file)] || 'text/plain');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = process.env.WORK_BASE || `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
  try {
    for (const viewport of [{width:390,height:844},{width:820,height:1180},{width:844,height:390},{width:1280,height:900}]) {
      const context = await browser.newContext({viewport,hasTouch:true});
      const page = await context.newPage(); const errors = [], external = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (!r.url().startsWith(base)) external.push(r.url()); });
      const response = await page.goto(base + '/works/rewinding-thread/'); assert.equal(response.status(),200);
      const knob = page.locator('#knob');
      const length = () => knob.getAttribute('transform').then(s => Number(s.match(/translate\(210 ([^)]+)/)[1]) - 280);
      const coords = () => page.evaluate(() => {
        const svg = document.querySelector('#tool'), knob = document.querySelector('#knob');
        const y = +knob.getAttribute('transform').match(/translate\(210 ([^)]+)/)[1];
        const p = new DOMPoint(210,y).matrixTransform(svg.getScreenCTM());
        return {x:p.x,y:p.y,scale:svg.getScreenCTM().d};
      });
      let p = await coords();
      await page.mouse.move(p.x,p.y); await page.mouse.down(); await page.mouse.move(p.x,p.y + 170*p.scale,{steps:12});
      const held = await length(); assert.ok(Math.abs(held - 170) < 2);
      await page.waitForTimeout(180); assert.equal(await length(),held);
      assert.ok(!(await page.locator('#reel').getAttribute('transform')).startsWith('rotate(0 '));
      await page.mouse.up(); await page.waitForTimeout(160); assert.ok(await length() < held);
      p = await coords(); await page.mouse.move(p.x,p.y); await page.mouse.down();
      const grabbed = await length(); await page.waitForTimeout(160); assert.equal(await length(),grabbed);
      await page.mouse.move(p.x,p.y+20*p.scale); assert.ok(await length() > grabbed+15);
      await page.mouse.up(); await page.waitForTimeout(2700); assert.equal(await length(),0);
      // Real Chromium touch stream, including cancellation and ignored second contact.
      const cdp = await context.newCDPSession(page); p = await coords();
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:0}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y+100*p.scale,id:0}]});
      assert.ok(await length() > 95);
      const touchHeld = await length(); await page.waitForTimeout(220);
      assert.equal(await length(), touchHeld); assert.notEqual(await knob.getAttribute('data-held'), null);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      assert.equal(await knob.getAttribute('data-held'),null);
      await page.waitForTimeout(2600); assert.equal(await length(),0);
      p=await coords(); await page.mouse.move(p.x,p.y); await page.mouse.down(); await page.mouse.move(p.x,p.y+100*p.scale);
      await page.setViewportSize({width:viewport.height,height:viewport.width});
      await page.waitForTimeout(100); assert.equal(await knob.getAttribute('data-held'),null);
      await page.mouse.up(); await page.waitForTimeout(2600); assert.equal(await length(),0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (process.env.WORK_SCREENSHOTS) await page.screenshot({path:path.join(process.env.WORK_SCREENSHOTS,`rewind-${viewport.width}.png`)});
      await page.locator('.back').click(); await page.waitForURL('**/lab/#room-bench');
      const entry = page.locator('a[href="../works/rewinding-thread/"]'); assert.equal(await entry.count(),1);
      await entry.click(); await page.waitForURL('**/works/rewinding-thread/');
      assert.deepEqual(errors,[]); assert.deepEqual(external,[]);
      console.log('PASS pull/hold/rotation/release/regrab/touch-cancel/resize/seat/LAB',viewport);
      await context.close();
    }
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => {console.error(e);process.exitCode=1;});
