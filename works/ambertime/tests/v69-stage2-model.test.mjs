import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const bundleDir = new URL('../v69/', import.meta.url);
const bundle = await readFile(new URL('game.js', bundleDir), 'utf8');
const fixtures = await readFile(new URL('preview-cases-a.js', bundleDir), 'utf8');
const stop = 'var caskSlots = [null, null, null, null];';
assert.ok(bundle.includes(stop));
const desk = 'trial-region-desk';
const shop = 'town-liquor';
const productId = 15;

// Branch at the genuine month-176 invitation in an existing formal v8 save.
// Replay the logged operations so shelf, stock, reputation and cash all agree.
async function load() {
  const c = vm.createContext({ structuredClone, Event, console, setTimeout, clearTimeout,
    document: { documentElement: { dataset: {} }, dispatchEvent() {} } });
  vm.runInContext('globalThis.window = globalThis', c);
  vm.runInContext(fixtures + ';globalThis.saved = JSON.parse(amberTimePreviewCasesA["pair-origin"]);', c);
  vm.runInContext('const amberTimePreviewCasesB = {};', c);
  await vm.runInContext(bundle.replace(stop, `
    shopName = id => SHOPS4.find(row => row.id === id)?.name ?? id;
    globalThis.api = { D, applyAutoSupplyBeforeMonth, shipRegionalWithObservers,
      restoreFormal() { return readSession(JSON.stringify(saved), {enabled: true, restore: D.restoreDistillery,
        monthMs: PARALLEL_PARAMETERS2.monthMs, stepMs: PARALLEL_PARAMETERS2.distillStepMs}); },
      offered(oldTail = []) {
        const src = saved.game, logContext = emptyReplayContext();
        let g = newDistillery5(src.seed);
        for (const op of src.operations) {
          g = apply4(g, op, logContext, g.operations.length);
          if (g.shop?.offer?.shopId === 'department') {
            for (const oldOp of oldTail) g = apply4(g, oldOp, logContext, g.operations.length);
            return g;
          }
        }
        throw Error('Fixture has no department invitation');
      }
    };
    return;
    ${stop}`), c);
  return c.api;
}

function invitation(g) {
  return [g.shop.offer, ...g.shop.pendingOffers].find(o => o?.shopId === 'department');
}
function checkReplay(D, game) {
  const text = D.serializeDistillery(game);
  assert.equal(D.serializeDistillery(D.restoreDistillery(text)), text);
}
function ship(api, state, count) {
  return api.shipRegionalWithObservers(state, { partnerId: desk, productId, count });
}

test('historic formal v8 session and pre-update sales reproduce their original balances and open offer', async () => {
  const api = await load(), { D } = api;
  const session = api.restoreFormal();
  assert.equal(session.game.core.month, 187);
  assert.equal(session.game.core.cash, 1573.44);
  assert.equal(session.game.operations.length, 283);
  const retail = { key: 'product-allocation', value: { productId, releaseId: 5, brandId: 1,
    retail: 34, shopCount: 0, progress: null } };
  const months = Array.from({ length: 6 }, () => ({ key: 'month', value: { progress: null } }));
  const old = api.offered([retail, ...months]);
  assert.equal(createHash('sha256').update(D.serializeDistillery(old)).digest('hex'),
    '3be26c582f38be90163c7b220df2091a94beb9a1a901cc6c1bdadd4b108a38a2');
  assert.equal(invitation(old).id, 4);
  const live = D.expireDepartmentOffers(old);
  assert.equal(invitation(live), undefined);
  assert.equal(D.expireDepartmentOffers(live), live);
  assert.equal(JSON.stringify(live.core), JSON.stringify(old.core));
  assert.equal(JSON.stringify(live.shop.deliveries), JSON.stringify(old.shop.deliveries));
  assert.equal(JSON.stringify(live.operations.slice(0, old.operations.length)), JSON.stringify(old.operations));
  checkReplay(D, live);
});

test('an unanswered invitation leaves bottles free and expires on the sale from five to four', async () => {
  const api = await load(), { D } = api;
  let s = api.offered();
  const offeredId = invitation(s).id;
  assert.equal(D.placementInventory(s, productId).held, 0);
  assert.equal(D.regionalDeliveryQuote(s, productId, desk).maxCount, 34);
  s = ship(api, s, 29);
  assert.equal(invitation(s).id, offeredId);
  assert.equal(D.placementInventory(s, productId).stock, 5);
  s = ship(api, s, 1);
  assert.equal(D.placementInventory(s, productId).stock, 4);
  assert.equal(invitation(s), undefined);
  assert.equal(s.department.adoptions.length, 0);
  checkReplay(D, s);
});

test('returnable shelf stock retains an invitation until monthly customer sales exhaust the requirement', async () => {
  const api = await load(), { D } = api;
  let s = D.setMarketRetail(api.offered(), { productId, count: 34 });
  for (let month = 177; month <= 182; month++) {
    assert.ok(invitation(s));
    assert.equal(D.placementInventory(s, productId).hand, 0);
    s = D.tickDistillery(s, s.core.month);
    assert.equal(s.core.month, month);
  }
  assert.equal(D.placementInventory(s, productId).stock, 4);
  assert.equal(invitation(s), undefined);
  checkReplay(D, s);
});

test('the five approved bottles survive manual delivery attempts, automatic replenishment and reload, then settle once', async () => {
  const api = await load(), { D } = api;
  let s = D.enableAutoSupply(api.offered());
  s = D.assignStoreProduct(s, { productId, shopId: shop, count: 5 });
  s = D.returnStoreProduct(s, { productId, shopId: shop });
  s = D.hireAutoSupplyStaff(s);
  s = D.setAutoSupplyPolicy(s, shop, true);
  s = D.setMarketRetail(s, { productId, count: 1 });
  s = D.setMarketRetail(s, { productId, count: 0 });
  s = ship(api, s, 27);
  const offer = invitation(s), quote = D.shopOfferQuote(s, productId, 'department');
  assert.ok(quote.ok);
  const adoptedBefore = s.department.adoptions.length;
  const deliveryCount = s.shop.deliveries.filter(d => d.shopId === 'department').length;
  s = D.acceptShopDelivery(s, productId, 5, 'department', offer.id);
  assert.equal(invitation(s), undefined);
  assert.equal(s.department.interests[0].pendingDelivery.count, 5);
  assert.equal(D.placementInventory(s, productId).held, 5);
  assert.equal(D.regionalDeliveryQuote(s, productId, desk).maxCount, 2);
  assert.throws(() => ship(api, s, 3));
  assert.throws(() => D.assignStoreProduct(s, { productId, shopId: shop, count: 3 }));
  s = D.restoreDistillery(D.serializeDistillery(s));
  s = api.applyAutoSupplyBeforeMonth(s);
  const inventory = D.placementInventory(s, productId);
  assert.equal(inventory.held, 5);
  assert.equal(inventory.hand, 0);
  assert.equal(inventory.shops[shop], 2);
  s = D.tickDistillery(s, s.core.month);
  assert.equal(s.department.interests.length, 0);
  assert.equal(s.department.adoptions.length, adoptedBefore + 1);
  assert.equal(s.department.adoptions.at(-1).selectionId, offer.selectionId);
  const deliveries = s.shop.deliveries.filter(d => d.shopId === 'department');
  assert.equal(deliveries.length, deliveryCount + 1);
  assert.equal(deliveries.at(-1).revenue, Math.round(quote.unitPrice * 5 * 100) / 100);
  s = D.tickDistillery(s, s.core.month);
  assert.equal(s.department.adoptions.length, adoptedBefore + 1);
  checkReplay(D, s);
});

test('both acceptance entry points reserve identical bottles and reject a second approval', async () => {
  const api = await load(), { D } = api;
  const s = D.setMarketRetail(api.offered(), { productId, count: 1 });
  const offer = invitation(s);
  const contact = D.acceptShop(s, 'department', offer.id);
  const product = D.acceptShopDelivery(s, productId, 5, 'department', offer.id);
  assert.equal(D.placementInventory(contact, productId).held, 5);
  assert.equal(D.serializeDistillery(contact), D.serializeDistillery(product));
  assert.throws(() => D.acceptShop(contact, 'department', offer.id));
  assert.throws(() => D.acceptShopDelivery(product, productId, 5, 'department', offer.id));
});
