import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const origin = 'https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/';
const saveKey = 'sukimastock.local-ambertime.main.v69';
const mime = {html:'text/html',js:'text/javascript',mjs:'text/javascript',css:'text/css',png:'image/png',wav:'audio/wav',ttf:'font/ttf'};

test('sales room hire, change delegation and restore through the player entrance', {
  skip:!process.env.AMBER_BROWSER_MODULE,timeout:90000
}, async () => {
  const cases = await readFile(new URL('v69/preview-cases-a.js',root),'utf8');
  const record = vm.runInNewContext(cases+";amberTimePreviewCasesA['pair-origin']");
  const {chromium} = await import(process.env.AMBER_BROWSER_MODULE);
  const browser = await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE});
  try {
    const page = await browser.newPage({viewport:{width:390,height:680},hasTouch:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(10000);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const url = route.request().url();
      if (!url.startsWith(origin)) return route.abort();
      const file = url.slice(origin.length).split('?')[0] || 'index.html';
      await route.fulfill({body:await readFile(new URL(file,root)), contentType:mime[file.split('.').at(-1)]});
    });
    await page.addInitScript(({saveKey,record})=>{
      if (!localStorage.getItem(saveKey)) localStorage.setItem(saveKey,record);
    },{saveKey,record});
    const tap = selector=>page.locator(selector).first().tap();
    async function enterSales() {
      await tap('#entry-continue');
      await page.locator('#open-ledger').waitFor();
      if(await page.locator('[data-action="map-continue"]').isVisible()) await tap('[data-action="map-continue"]');
      await tap('[data-room="sales"]:visible');
      await tap('#open-staff-panel');
    }
    await page.goto(origin);
    await enterSales();
    const dialog = page.locator('#action-dialog');
    assert.equal(await dialog.getAttribute('data-kind'),'staff-opportunity');
    assert.match(await dialog.innerText(),/£2/);
    await tap('[data-action="staff-opportunity-hire"][data-id="supply"]');
    const detail = page.locator('#action-dialog[data-kind="supply-staff-panel"]');
    await detail.waitFor();
    const toggles = detail.locator('[data-action="auto-supply-toggle"]');
    const first = toggles.first();
    await first.waitFor();
    const shop = await first.getAttribute('data-shop-id');
    assert.equal(await first.getAttribute('aria-checked'),'false');
    await first.tap();
    const selected = detail.locator('[data-action="auto-supply-toggle"][data-shop-id="'+shop+'"]');
    await page.waitForFunction(shop=>document.querySelector('[data-action="auto-supply-toggle"][data-shop-id="'+shop+'"]')?.getAttribute('aria-checked')==='true',shop);
    await page.reload();
    await enterSales();
    await detail.waitFor();
    assert.equal(await selected.getAttribute('aria-checked'),'true');
    await selected.tap();
    await page.waitForFunction(shop=>document.querySelector('[data-action="auto-supply-toggle"][data-shop-id="'+shop+'"]')?.getAttribute('aria-checked')==='false',shop);
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
});
