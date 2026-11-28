import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const folder = new URL('../v69/', import.meta.url);
const bundle = await readFile(new URL('game.js', folder), 'utf8');
const fixtures = await readFile(new URL('preview-cases-a.js', folder), 'utf8');
const uiBoundary = 'var caskSlots = [null, null, null, null];';

async function model() {
  const context = vm.createContext({ structuredClone, Event, console, setTimeout, clearTimeout,
    document: { documentElement: { dataset: {} }, dispatchEvent() {} } });
  vm.runInContext('globalThis.window=globalThis; const amberTimePreviewCasesB={};', context);
  vm.runInContext(fixtures + ';globalThis.fixture = JSON.parse(amberTimePreviewCasesA["pair-origin"]);', context);
  assert.ok(bundle.includes(uiBoundary));
  await vm.runInContext(bundle.replace(uiBoundary, `
    globalThis.api = { D: partner_orders_exports, tick: tickDistillery4, reserve: reserve5,
      load: session => restoreDistillery4(expandFormalGame(session.game)),
      roundTrip: state => restoreDistillery4(serializeDistillery(state)) };
    return;
    ${uiBoundary}
  `), context);
  return { ...context.api, fixture: context.fixture };
}

function addCask(D, game) {
  let state = D.beginCollection(D.startRangeDistillation(game));
  while (state.still.distillation.progress < 65) state = D.distillStep(state);
  return D.fillBarrel(D.stopDistillation(state), 'bourbon');
}

// Use normal production, bottling, placements and upkeep to reach the reserve
// boundary. No test changes cash, inventory or the recorded operations.
function reachShortage({ D, tick }, state, firstRelease = false) {
  for (let i = 0; i < 100; i++) {
    if (state.core.casks.length < 4 && D.canStart(state).ok) state = addCask(D, state);
    if (firstRelease && state.core.month === 2) {
      state = D.bottleBranded(state, state.core.casks[0].id, { name: 'AmberTime' }, 12);
      state = D.listBottles(state, state.result.productId);
    }
    const prior = tick(state, state.core.month, { legacyFunds: true });
    if (prior.decisions[0]?.eventId === 'funds') return { state, prior };
    assert.equal(prior.core.month, state.core.month + 1);
    state = prior;
  }
  assert.fail('expected the previous rules to require a funds decision');
}

function assertRestores(api, state) {
  assert.equal(JSON.stringify(api.roundTrip(state)), JSON.stringify(state));
}

test('old forced funds decisions reopen intact and allow self sales before the first trading partner', async () => {
  const api = await model(), { D } = api;
  const { state, prior } = reachShortage(api, D.newBottlingAssignmentDistillery(27), true);
  assert.equal(state.shop.relations.length + state.regionalPartners.contracts.length, 0);
  assert.equal(D.tickDistillery(state), state);
  assertRestores(api, prior);
  const id = prior.decisions[0].caskId;
  const reviewed = D.chooseDistillery(prior, id, 'review-funds');
  assert.equal(reviewed.decisions.length, 0);
  assert.equal(reviewed.core.cash, prior.core.cash);
  assert.equal(JSON.stringify(reviewed.core.products), JSON.stringify(prior.core.products));
  assert.equal(D.canStart(reviewed).ok, false);
  assertRestores(api, reviewed);
  const product = reviewed.core.products.at(-1);
  let cur = D.setMarketRetail(reviewed, { productId: product.id, count: 12 });
  let recorded = false;
  for (let i = 0; i < 8; i++) {
    cur = D.tickDistillery(cur, cur.core.month, { fundsSales: true });
    if (cur.core.lastMonth.revenue > 0 && cur.operations.at(-1).value?.fundsSales) recorded = true;
  }
  assert.ok(recorded, 'ordinary retail sales can settle below the full bottling reserve');
  assert.ok(cur.core.totals.bottlesSold > reviewed.core.totals.bottlesSold);
  assert.equal(cur.releases.length, reviewed.releases.length);
  assertRestores(api, cur);
});

test('a single local shelf can sell after a no-demand month without accumulating debt', async () => {
  const api = await model(), { D } = api;
  const { state } = reachShortage(api, api.load(api.fixture));
  const productId = state.core.products.find(product => D.storeMarketQuote(state, product.id, 'town-liquor').maxCount >= 12).id;
  for (const shopId of ['town-liquor', 'r-port']) {
    const args = { productId, shopId, count: 12 };
    let cur = shopId === 'r-port' ? D.placeLocalShelf(state, { ...args, index: state.operations.length }) : D.assignStoreProduct(state, args);
    let noSaleMonth = false, settledSale = false, halted = false;
    for (let i = 0; i < 45; i++) {
      const next = D.tickDistillery(cur, cur.core.month, { fundsSales: true });
      if (next === cur) { halted = true; break; }
      assert.equal(next.core.month, cur.core.month + 1);
      assert.ok(next.core.cash >= 0);
      const bill = next.core.lastMonth;
      assert.equal(Math.round(100 * next.core.cash), Math.round(100 * (cur.core.cash + bill.revenue - bill.upkeep)));
      if (next.operations.at(-1).value?.fundsSales) {
        if (!bill.revenue) noSaleMonth = true;
        if (bill.sales.some(row => row.shopId === shopId && row.sold > 0)) settledSale = true;
      }
      cur = next;
    }
    assert.ok(noSaleMonth && settledSale && halted, shopId);
    assertRestores(api, cur);
  }
});
