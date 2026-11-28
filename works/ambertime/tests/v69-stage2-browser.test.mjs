import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const url = 'https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/';
const saveKey = 'sukimastock.local-ambertime.main.v69';
const types = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript',
  ttf: 'font/ttf', png: 'image/png', wav: 'audio/wav' };

// Reconstruct the genuine offer month from the archived career, including each
// historical recall and ledger update. Never manufacture an offer or any stock.
async function careerAtOffer() {
  const context = vm.createContext({ structuredClone, Event, console, setTimeout, clearTimeout,
    document: { documentElement: { dataset: {} }, dispatchEvent() {} } });
  vm.runInContext('globalThis.window=globalThis', context);
  vm.runInContext(await readFile(new URL('v69/preview-cases-a.js', root), 'utf8') +
    ';const amberTimePreviewCasesB={};', context);
  const code = await readFile(new URL('v69/game.js', root), 'utf8');
  const boundary = 'var caskSlots = [null, null, null, null];';
  assert.ok(code.includes(boundary));
  await vm.runInContext(code.replace(boundary, `{
    const archived = JSON.parse(amberTimePreviewCasesA['pair-origin']).game;
    const first = archived.operations.findIndex(op => !op.key.startsWith('enable-') && op.key !== 'adopt-placement');
    function withHistory(snapshot, index) {
      const state = {};
      for (const key of Object.keys(archived)) {
        if (key === 'origin') state.origin = archived.origin;
        else if (key === 'operations') state.operations = archived.operations.slice(0,index+1);
        else if (Object.hasOwn(snapshot,key)) state[key] = snapshot[key];
      }
      return state;
    }
    let offered, recall, history;
    D.replayDistilleryOperations(archived, ({index,before,after}) => {
      if (offered || index < first-1) return;
      const next = withHistory(after,index);
      if (index === first-1) {
        recall = initializeRecall(next);
        history = initializeHistoryRecord(next);
        return;
      }
      const prev = withHistory(before,index-1);
      recall = advanceRecall(prev,next,recall);
      history = advanceHistoryRecord(prev,next,history);
      if (next.shop.offer?.shopId === 'department') offered = next;
    });
    validateDistillery4(offered);
    globalThis.record = JSON.stringify({version:9,game:compactVerifiedGame(offered),elapsed:0,userPaused:true,
      caskSlots:initializeCaskSlots(offered),historyRecord:history,recallRecord:recall,
      recentLedger:migrateRecentLedger(offered,{replay:observer=>D.replayDistilleryOperations(offered,observer)})});
    return;
  }\n${boundary}`), context);
  return context.record;
}

test('department invitation, reservation, settlement and sellout through player controls', {
  skip: !process.env.AMBER_BROWSER_MODULE, timeout: 120000,
}, async () => {
  const record = await careerAtOffer();
  const { chromium } = await import(process.env.AMBER_BROWSER_MODULE);
  const browser = await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE});
  try {
    for (const accept of [true, false]) {
      const page = await browser.newPage({viewport:{width:390,height:680},hasTouch:true,reducedMotion:'reduce'});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', async route => {
        if (!route.request().url().startsWith(url)) return route.abort();
        const file = route.request().url().slice(url.length).split('?')[0] || 'index.html';
        await route.fulfill({body:await readFile(new URL(file,root)),contentType:types[file.split('.').at(-1)]});
      });
      await page.addInitScript(({saveKey,record}) => localStorage.setItem(saveKey,record), {saveKey,record});
      await page.goto(url);
      const tap = selector => page.locator(selector).first().tap();
      async function closeDialogs() {
        for (let i=0; i<5 && await page.locator('#action-dialog').isVisible(); i++) await tap('#close-dialog');
      }
      async function ledger() {
        await tap('#open-ledger');
        await tap('#ledger-section-shops');
      }
      async function mapAtTown() {
        await tap('#open-world-map');
        const stage = page.locator('.m0-stage-name');
        for(let i=0;i<6 && await stage.innerText() !== '町';i++) {
          const farther = ['地方','日本','地球'].includes(await stage.innerText());
          await tap(farther ? '[data-m0="stage-prev"]' : '[data-m0="stage-next"]');
        }
        assert.equal(await stage.innerText(), '町');
      }
      await tap('#entry-continue');
      await page.locator('#open-ledger').waitFor();
      if(await page.locator('[data-action="map-continue"]').isVisible()) await tap('[data-action="map-continue"]');
      await tap('[data-room="sales"]:visible');
      await tap('#shop-offer');
      await tap('[data-action="stockist-open"][data-id="department"]');
      await tap('[data-action="stockist-offer"]');
      await tap('[data-action="shop-start-sale"]');
      await page.locator('[data-action="shop-accept-deliver"]').waitFor();
      if (accept) {
        await tap('[data-action="shop-accept-deliver"]');
        await page.locator('#dialog-body').filter({ hasText: '5本確保' }).waitFor();
        await closeDialogs();
        await ledger();
        await tap('#ledger-shop-department');
        assert.match(await page.locator('#dialog-body').innerText(), /納品待ち/);
        await closeDialogs();
        await mapAtTown();
        await tap('.m0-pin[data-m0-shop="department"]');
        assert.match(await page.locator('.m0-report').innerText(), /5本確保/);
        await tap('[data-m0="close"]');
        await tap('#toggle-time');
        await page.waitForFunction(() => document.querySelector('#calendar').textContent.includes('10月'));
        await tap('#toggle-time');
        await ledger();
        await tap('#ledger-shop-department');
        const text = await page.locator('#dialog-body').innerText();
        assert.match(text,/5本 特選納品/);
        assert.doesNotMatch(text,/納品待ち/);
      } else {
        await closeDialogs();
        await tap('[data-market-release="15"]');
        await tap('[data-market-portion="all"]');
        await tap('[data-market-place="trial-region-desk"]');
        await tap('[data-market-confirm="deliver"]');
        await page.waitForFunction(() => !document.querySelector('#shop-offer').hasAttribute('data-pending-direct'));
        await tap('#shop-offer');
        assert.equal(await page.locator('[data-action="stockist-open"][data-id="department"]').count(),0);
        await closeDialogs();
        await ledger();
        assert.equal(await page.locator('#ledger-shop-department').count(),0);
        await closeDialogs();
        await mapAtTown();
        assert.equal(await page.locator('.m0-pin[data-m0-shop="department"]').count(),0);
        assert.doesNotMatch(await page.locator('#automatic-news').innerText(), /百貨店から申し出/);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
