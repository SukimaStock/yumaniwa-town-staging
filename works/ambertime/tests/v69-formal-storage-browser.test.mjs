import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test from 'node:test';

test('v69 migrates only the staging record and commits backups atomically with the main record', {
  skip: !process.env.AMBER_BROWSER_MODULE, timeout: 30000
}, async () => {
  const adapter = await readFile(new URL('../v69/formal-storage.mjs', import.meta.url));
  const server = createServer((req, res) => {
    if (req.url === '/formal-storage.mjs') {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(adapter);
    } else res.end('<title>Storage test</title>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const { chromium } = await import(process.env.AMBER_BROWSER_MODULE);
    browser = await chromium.launch({ executablePath: process.env.AMBER_BROWSER_EXECUTABLE });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    const result = await page.evaluate(async () => {
      const { createFormalStorage } = await import('/formal-storage.mjs');
      const staging = '/yumaniwa-town-staging/works/ambertime/';
      const main = 'sukimastock.local-ambertime.main.v69', previous = main + '-old';
      const backup = main + '.before-reset';
      function open(scope) {
        return createFormalStorage({ scope, main, previous, legacy: [], onChange() {} });
      }
      localStorage.setItem(previous, 'legacy');
      const original = open(staging), stale = open(staging);
      await original.refresh();
      await stale.refresh();
      await original.commit('legacy', store => {
        store.setItem(backup, store.getItem(main));
        store.setItem(main, 'next');
      });
      let conflict = '';
      try {
        await stale.commit('legacy', store => store.setItem(main, 'stale'));
      } catch (error) { conflict = error.code; }
      const production = open('/yumaniwa-town/works/ambertime/');
      await production.refresh();
      const productionBefore = production.getItem(main);
      await production.commit(null, store => store.setItem(main, 'fresh'));
      const cold = open(staging);
      await cold.refresh();
      return { conflict, productionBefore, production: production.getItem(main),
        original: localStorage.getItem(previous), retained: cold.getItem(backup), current: cold.getItem(main) };
    });
    assert.deepEqual(result, { conflict: 'conflict', productionBefore: null, production: 'fresh',
      original: 'legacy', retained: 'legacy', current: 'next' });
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
