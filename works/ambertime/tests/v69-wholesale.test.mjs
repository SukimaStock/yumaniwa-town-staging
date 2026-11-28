import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function loadModel() {
  const read = name => readFileSync(new URL('../v69/' + name, import.meta.url), 'utf8');
  const context = vm.createContext({structuredClone, Event, console, setTimeout, clearTimeout,
    document: {documentElement: {dataset: {}}, dispatchEvent() {}}});
  vm.runInContext('globalThis.window=globalThis', context);
  vm.runInContext(read('preview-cases-b.js'), context);
  const boundary = 'var caskSlots = [null, null, null, null];';
  const bundle = read('game.js');
  assert.ok(bundle.includes(boundary));
  vm.runInContext(bundle.replace(boundary, `
    shopName = id => SHOPS4.find(row => row.id === id)?.name ?? id;
    globalThis.api = {wholesaleCapacity, officeReport, mapSceneryProjection, D: partner_orders_exports,
      read: key => readSession(amberTimePreviewCasesB[key], {enabled:true,restore:restoreDistillery4,
        monthMs:PARALLEL_PARAMETERS2.monthMs,stepMs:PARALLEL_PARAMETERS2.distillStepMs}).game};
    return;
    ${boundary}`), context);
  return context.api;
}

const {D, read, wholesaleCapacity, officeReport, mapSceneryProjection} = loadModel();
const river = 'trial-region-desk';

test('the approved monthly wholesale formula counts causal regions once and recent deliveries by partner', () => {
  const month = 10;
  const operations = [[8,24],[9,12],[10,5]].map(([month,count]) =>
    ({key:'regional-deliver',value:{receipt:{id:'r'+month, month,count,partnerId:river,releaseId:1}}}));
  const events = [
    {id:'arrival',type:'arrival',month:4,to:'region-a',cohort:'r8:release:1'},
    {id:'interest',type:'interest',month:4,sourceId:'arrival'},
    {id:'inquiry',type:'inquiry',month:9,sourceId:'interest'},
    {id:'unrelated',type:'interest',month:9,sourceId:'unknown'}
  ];
  const game = {core:{month},operations,labConnection:{town:{events}}};
  assert.deepEqual({...wholesaleCapacity(game,river)},{limit:11,remaining:6});
  assert.equal(wholesaleCapacity(game,'national-specialist-desk').remaining,16);
  assert.equal(wholesaleCapacity(game,'overseas-import-desk').remaining,8);
  game.core.month = 16;
  assert.deepEqual({...wholesaleCapacity(game,river)},{limit:12,remaining:12});
});

test('a restored river career ships 40 bottles under the shared monthly cap and replays receipts at the correct price', () => {
  let game = read('valley-successor');
  let id = 33;
  assert.ok(game.core.products.find(p => p.id === id).stock >= 40);
  const formerReceipts = JSON.stringify(D.regionalDeliveryHistory(game,river));
  const formerCount = JSON.parse(formerReceipts).length;
  const start = game.core.month;
  let sold = 0;
  const ship = count => {
    const quote = D.regionalDeliveryQuote(game,id,river);
    game = D.assignRegionalProduct(game,{partnerId:river,productId:id,contractId:quote.contractId,allocationId:quote.nextAllocationId,count});
    const prepared = D.regionalDeliveryQuote(game,id,river);
    game = D.deliverRegionalProduct(game,{partnerId:river,productId:id,contractId:quote.contractId,allocationIds:[quote.nextAllocationId],deliveryId:prepared.nextDeliveryId,routeVersion:1});
    const report = officeReport(game,river);
    assert.match(report.status,/周辺の町へ出荷中/);
    assert.match(report.numbers,new RegExp("買取可能 " + (quote.monthlyRemaining-count) + "本"));
    const truck = mapSceneryProjection(game,4).truck;
    assert.equal(truck.id,game.localDistribution.lots.at(-1).receiptId);
    assert.equal(mapSceneryProjection(game,5).truck,null);
    sold += count;
  };
  for (let i=0; i<12 && sold<40; i++) {
    if (D.regionalDeliveryQuote(game,id,river).available === 0) id = 30;
    const quote = D.regionalDeliveryQuote(game,id,river);
    const quantity = Math.min(quote.maxCount, 40-sold);
    if (quantity > 0) {
      assert.equal(quote.unitPrice, Number((D.salePrices(game,id).standard*.85).toFixed(2)));
      ship(1);
      assert.equal(D.regionalDeliveryQuote(game,id === 30 ? 33 : 30,river).monthlyRemaining,quote.monthlyRemaining-1);
      if (quantity > 1) ship(quantity-1);
    }
    if (sold===40) break;
    const full = D.regionalDeliveryQuote(game,id,river);
    assert.equal(full.maxCount,0);
    assert.throws(() => D.assignRegionalProduct(game,{partnerId:river,productId:id,contractId:full.contractId,allocationId:full.nextAllocationId,count:1}));
    const next = D.tickDistillery(game,game.core.month,{fundsSales:true});
    assert.equal(next.core.month,game.core.month+1);
    game = next;
    assert.equal(mapSceneryProjection(game,4).truck,null);
    assert.doesNotMatch(officeReport(game,river).status,/出荷中/);
  }
  assert.equal(sold,40);
  const history = D.regionalDeliveryHistory(game,river);
  assert.equal(JSON.stringify(history.slice(0,formerCount)),formerReceipts);
  const serialized = D.serializeDistillery(game);
  assert.equal(D.serializeDistillery(D.restoreDistillery(serialized)),serialized);
  assert.equal(game.labConnection.town.shipments.filter(item => item.month >= start && item.id.startsWith('regional-delivery:')).length >= 4,true);
});
