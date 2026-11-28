import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const url = 'https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/';
const saveKey = 'sukimastock.local-ambertime.main.v69';
const types = {html:'text/html', js:'text/javascript', mjs:'text/javascript', ttf:'font/ttf', png:'image/png', wav:'audio/wav'};

// Generate this career through recorded operations, including the ordinary
// maintenance and final retail sale. No fixture edits balances or inventory.
async function exhaustedCareer() {
  const bundle = await readFile(new URL('v69/game.js', root), 'utf8');
  const context = vm.createContext({structuredClone, Event, console, setTimeout, clearTimeout,
    document:{documentElement:{dataset:{}},dispatchEvent(){}}});
  vm.runInContext('globalThis.window=globalThis; const amberTimePreviewCasesA={}, amberTimePreviewCasesB={};', context);
  const boundary = 'var caskSlots = [null, null, null, null];';
  assert.ok(bundle.includes(boundary));
  await vm.runInContext(bundle.replace(boundary, `
    shopName = id => SHOPS4.find(row => row.id === id)?.name ?? id;
    const session = createFreshSession(partner_orders_exports,27);
    const native = createObservedModel(partner_orders_exports, ({before,after}) => {
      session.historyRecord = advanceHistoryRecord(before,after,session.historyRecord);
      session.recallRecord = advanceRecall(before,after,session.recallRecord);
      session.recentLedger = advanceRecentLedger(before,after,session.recentLedger);
      session.caskSlots = reconcileCaskSlots(after,session.caskSlots);
    });
    globalThis.api = {native, fundsExhausted, state:session.game,
      encode: state => serializeSession(state,session,{serialize:serializeDistillery,restore:restoreDistillery4,
        enabled:true,monthMs:PARALLEL_PARAMETERS2.monthMs,stepMs:PARALLEL_PARAMETERS2.distillStepMs})};
    return;
    ${boundary}`), context);
  const {native, fundsExhausted, encode} = context.api;
  let state = context.api.state;
  assert.equal(fundsExhausted(state), false);
  state = native.beginCollection(native.startRangeDistillation(state));
  while (state.still.distillation.progress < 65) state = native.distillStep(state);
  state = native.fillBarrel(native.stopDistillation(state), 'bourbon');
  const month = () => {
    const prior = state;
    state = native.tickDistillery(state, state.core.month, {fundsSales:true});
    assert.equal(state.core.month, prior.core.month + 1);
  };
  while (state.core.month < 100) month();
  assert.equal(native.canStart(state).ok, false);
  assert.equal(fundsExhausted(state), false, 'a bottlable cask remains');
  state = native.bottleBranded(state, state.core.casks[0].id, {name:'AmberTime'});
  const productId = state.result.productId;
  state = native.setMarketRetail(state, {productId,count:state.core.products.at(-1).stock-1});
  while (state.core.products.at(-1).stock > 1 || state.core.cash >= 100) {
    assert.ok(state.core.month < 300);
    if (state.trade.offer) state = native.declineOffer(state);
    if (state.shop.offer) state = native.acceptShop(state,state.shop.offer.shopId,state.shop.offer.id);
    month();
  }
  assert.equal(fundsExhausted(state), false, 'one bottle remains in hand');
  state = native.setMarketRetail(state,{productId,count:1});
  assert.equal(fundsExhausted(state), false, 'one bottle remains on the shelf');
  while (state.core.products.at(-1).stock > 0) month();
  assert.equal(state.core.casks.length, 0);
  assert.equal(state.core.month, 298);
  assert.equal(state.core.cash, 114.99);
  assert.equal(state.core.totals.bottlesSold, 37);
  return {state, fundsExhausted, encode};
}

let generated;
const career = () => generated ??= exhaustedCareer();

test('the last retail sale can leave a replay-valid career without any funding path', async () => {
  const {state,fundsExhausted,encode} = await career();
  assert.equal(fundsExhausted(state), true);
  assert.equal(JSON.parse(encode(state)).game.core.month, state.core.month);
});

test('exhaustion leaves the account book openable and cancelling restart preserves the formal record', {
  skip: !process.env.AMBER_BROWSER_MODULE, timeout: 120000
}, async () => {
  const {state,encode} = await career();
  const record = encode(state);
  const {chromium} = await import(process.env.AMBER_BROWSER_MODULE);
  const browser = await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE});
  try {
    const page = await browser.newPage({viewport:{width:390,height:680},hasTouch:true,reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      if (!route.request().url().startsWith(url)) return route.abort();
      const file = route.request().url().slice(url.length).split('?')[0] || 'index.html';
      await route.fulfill({body:await readFile(new URL(file,root)),contentType:types[file.split('.').at(-1)]});
    });
    await page.addInitScript(({saveKey,record}) => {
      if (!localStorage.getItem(saveKey)) localStorage.setItem(saveKey, record);
    }, {saveKey,record});
    const tap = selector => page.locator(selector).first().tap();
    const readMain = () => page.evaluate(async key => {
      const {createFormalStorage} = await import('./v69/formal-storage.mjs');
      const storage = createFormalStorage({scope:location.pathname,main:key,previous:'',legacy:[],onChange(){}});
      await storage.refresh();
      return storage.getItem(key);
    }, saveKey);
    await page.goto(url);
    await tap('#entry-continue');
    await page.locator('body[data-funds-exhausted="true"]').waitFor();
    const before = await readMain();
    assert.deepEqual(JSON.parse(before).game, JSON.parse(record).game);
    if (await page.locator('[data-action="map-continue"]').isVisible()) await tap('[data-action="map-continue"]');
    await tap('#open-ledger');
    const dialog = page.locator('#action-dialog');
    assert.match(await dialog.innerText(), /仕込み資金/);
    await tap('#ledger-section-shops');
    await tap('#close-dialog');
    await tap('#open-aux-menu');
    assert.equal(await page.locator('#toggle-time').isDisabled(), true);
    await tap('[data-action="settings-reset"]:visible');
    assert.equal(await page.locator('#entry-begin').isVisible(), true);
    assert.equal(await readMain(), before);
    await tap('#entry-back');
    await page.locator('body[data-entry="false"][data-funds-exhausted="true"]').waitFor();
    assert.equal(await readMain(), before);
    await page.reload();
    await tap('#entry-continue');
    await page.locator('body[data-funds-exhausted="true"]').waitFor();
    assert.equal(await readMain(), before);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
