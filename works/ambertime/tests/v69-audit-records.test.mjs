import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const folder = new URL('../v69/', import.meta.url);
const bundle = await readFile(new URL('game.js', folder), 'utf8');
const fixtures = await readFile(new URL('preview-cases-a.js', folder), 'utf8');

// Load the distributed model and its real recall observer. Stop before UI setup.
async function loadModel() {
  const context = vm.createContext({
    structuredClone, Event, console, setTimeout, clearTimeout,
    document: { documentElement: { dataset: {} }, dispatchEvent() {} },
  });
  vm.runInContext('globalThis.window=globalThis', context);
  vm.runInContext(fixtures + ';globalThis.fixture = JSON.parse(amberTimePreviewCasesA["pair-origin"]);', context);
  vm.runInContext('const amberTimePreviewCasesB = {};', context);
  const startUI = 'var caskSlots = [null, null, null, null];';
  assert.ok(bundle.includes(startUI), 'locate the model/UI boundary in the deployed bundle');
  await vm.runInContext(bundle.replace(startUI, `
    shopName = id => SHOPS4.find(row => row.id === id)?.name ?? id;
    globalThis.model = {
      D, generationNewStores, applyAutoSupplyBeforeMonth,
      load(session) {
        pendingRecall = session.recallRecord;
        return restoreDistillery4(expandFormalGame(session.game));
      },
      verify(game) { assertCursor(game, pendingRecall); },
      roundTrip(game) { return restoreDistillery4(serializeDistillery(game)); }
    };
    return;
    ${startUI}
  `), context);
  return context;
}

test('delegated shelf refill, salary and month advance once and survive formal replay', async () => {
  const { model, fixture } = await loadModel();
  const { D } = model;
  let game = D.enableAutoSupply(model.load(fixture));
  const product = game.core.products.find(product => D.storeMarketQuote(game, product.id, 'town-liquor').maxCount > 0);
  assert.ok(product, 'a release is ready for a second stockist');
  game = D.assignStoreProduct(game, { productId: product.id, shopId: 'town-liquor', count: 1 });
  game = D.hireAutoSupplyStaff(game);
  game = D.setAutoSupplyPolicy(game, 'supermarket', true);
  const paid = model.applyAutoSupplyBeforeMonth(game);
  assert.deepEqual(Array.from(paid.operations.slice(game.operations.length), op => op.key), ['store-assign', 'auto-supply-staff-pay']);
  assert.equal(paid.core.cash, Math.round((game.core.cash - 2) * 100) / 100);
  const next = D.tickDistillery(paid, paid.core.month);
  assert.equal(next.core.month, game.core.month + 1);
  model.verify(next);
  const restored = model.roundTrip(next);
  model.verify(restored);
  assert.equal(JSON.stringify(restored.operations), JSON.stringify(next.operations));
  assert.equal(restored.core.cash, next.core.cash);
});

test('new stockists belong to the accepting generation, once per store', async () => {
  const { model, fixture } = await loadModel();
  const state = fixture.game;
  const events = fixture.historyRecord.events;
  const local = model.generationNewStores(state, events, 1);
  for (const relation of state.shop.relations) {
    assert.ok(local.some(entry => entry.name === relation.name && entry.month === relation.startedMonth));
  }
  const history = {
    generations: { completed: [{ id: 1, startedMonth: 0, endedMonth: 12 }], active: { id: 2, startedMonth: 12 } },
    shop: { relations: [
      { shopId: 'bar', startedMonth: 4 }, { shopId: 'bar', startedMonth: 14 },
      { shopId: 'department', startedMonth: 10 },
    ] },
    department: { adoptions: [] },
    operations: [
      { key: 'regional-accept', value: { offerId: 'before' } },
      { key: 'generation-handover', value: { id: 1 } },
      { key: 'regional-accept', value: { offerId: 'after' } },
    ],
    regionalPartners: { contracts: [
      { partnerId: 'old-desk', sourceOfferId: 'before', startedMonth: 12 },
      { partnerId: 'new-desk', sourceOfferId: 'after', startedMonth: 12 },
    ] },
    localDistribution: { offers: [
      { storeId: 'pending', status: 'pending' },
      { storeId: 'direct', status: 'accepted', generationId: 2, decidedMonth: 13 },
    ] },
  };
  const names = id => Array.from(model.generationNewStores(history, [], id), row => row.name);
  assert.deepEqual(names(1), ['バー 灯', 'old-desk']);
  assert.deepEqual(names(2), ['new-desk', 'direct']);
});
