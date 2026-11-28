import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const folder = new URL('../v69/',import.meta.url);
const bundle = await readFile(new URL('game.js',folder),'utf8');
const cases = await readFile(new URL('preview-cases-a.js',folder),'utf8');
const boundary = 'var caskSlots = [null, null, null, null];';

async function model() {
  const c = vm.createContext({structuredClone,Event,setTimeout,clearTimeout,console,
    document:{documentElement:{dataset:{}},dispatchEvent(){}}});
  vm.runInContext('globalThis.window=globalThis;',c);
  vm.runInContext(cases,c);
  assert.ok(bundle.includes(boundary));
  await vm.runInContext(bundle.replace(boundary,`
    shopName=id=>SHOPS4.find(s=>s.id===id)?.name??id;
    globalThis.model = {D:partner_orders_exports, supply:autoSupplyStaffStatus,
      career:()=>readSession(amberTimePreviewCasesA['pair-origin'],{enabled:true,
        restore:restoreDistillery4,monthMs:PARALLEL_PARAMETERS2.monthMs,stepMs:PARALLEL_PARAMETERS2.distillStepMs}).game};
    return;
    ${boundary}`),c);
  return c.model;
}

function replay(D,s) {
  const text = D.serializeDistillery(s);
  assert.equal(D.serializeDistillery(D.restoreDistillery(text)),text);
}

test('manual fills and bottlings unlock hiring before the sixth fill and the 150th bottle',async()=>{
  const {D} = await model();
  let s = D.newBottlingAssignmentDistillery(27);
  assert.equal(D.staffStatus(s).unlocked,false);
  assert.equal(D.bottlingStaffStatus(s).unlocked,false);
  let brand = {name:'AmberTime'};
  for(let run=1;run<=6;run++) {
    s = D.beginCollection(D.startRangeDistillation(s));
    while(s.still.distillation.progress < 65) s = D.distillStep(s);
    s = D.fillBarrel(D.stopDistillation(s),'refill');
    assert.equal(D.staffOpportunities(s).some(j=>j.kind==='distill'),run===6);
    if(run===1) {
      assert.equal(D.staffStatus(s).canHire,true);
      const hired = D.hireStaff(s);
      assert.equal(hired.core.cash,s.core.cash-40);
      assert.equal(hired.usual.reservation,null);
      replay(D,hired);
    }
    const cask = s.core.casks[0].id;
    let count = D.quote(s,cask).count;
    while(count) {
      const before = s.staffExperience.manualBottles;
      const stopAt = [1,149,150].find(n=>n>before) ?? Infinity;
      const made = Math.min(count,stopAt-before);
      s = D.bottleBranded(s,cask,brand,made);
      brand = {brandId:1};
      assert.equal(s.staffExperience.manualBottles,before+made);
      assert.equal(D.staffOpportunities(s).some(j=>j.kind==='bottling'),before+made>=150);
      if(before+made===1) {
        assert.equal(D.bottlingStaffStatus(s).canHire,true);
        const hired = D.hireBottlingStaff(s);
        assert.equal(hired.core.cash,s.core.cash-20);
        assert.equal(hired.automation.reservations.length,0);
        replay(D,hired);
      }
      count -= made;
      s = D.setMarketRetail(s,{productId:s.result.productId,count:made});
    }
    for(let i=0;i<12;i++) {
      if(s.shop.offer) s = D.acceptShop(s,s.shop.offer.shopId,s.shop.offer.id);
      if(s.trade.offer) s = D.declineOffer(s);
      const next = D.tickDistillery(s,s.core.month,{fundsSales:true});
      assert.equal(next.core.month,s.core.month+1);
      s = next;
    }
  }
  replay(D,s);
});

test('supply proposals count two destinations or four distinct manual delivery months',async()=>{
  const {D,supply,career} = await model();
  let s = D.enableAutoSupply(career());
  const starting = supply(s);
  assert.equal(starting.unlocked,true);
  const hired = D.hireAutoSupplyStaff(s);
  assert.equal(hired.core.cash,s.core.cash-20);
  assert.equal(D.staffOpportunities(hired).some(j=>j.kind==='supply'),false);
  replay(D,hired);
  const product = s.core.products.find(p=>D.storeMarketQuote(s,p.id,'town-liquor').maxCount>0);
  s = D.assignStoreProduct(s,{shopId:'town-liquor',productId:product.id,count:1});
  assert.ok(D.staffOpportunities(s).some(j=>j.kind==='supply'));
  const seen = D.noticeStaffOpportunity(s,'supply');
  assert.equal(D.staffOpportunities(seen).some(j=>j.kind==='supply'),false);
  replay(D,seen);

  // Read-only projections isolate which recorded actions qualify as work.
  const fresh = D.newBottlingAssignmentDistillery(27);
  const work = {key:'store-assign',value:{shopId:'town-liquor',count:1}};
  const log = [...fresh.operations];
  for(let period=1;period<=4;period++){
    log.push(work,work,{key:'store-assign',value:{shopId:'bar',count:1,autoSupply:true}});
    const sample = {...fresh,operations:[...log]};
    assert.equal(supply(sample).deliveryMonths,period);
    assert.equal(supply(sample).deliveries,1);
    assert.equal(D.staffOpportunities(sample).some(j=>j.kind==='supply'),period===4);
    log.push({key:'month',value:{progress:null}});
  }
});
