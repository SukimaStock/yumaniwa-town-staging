import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../v69/',import.meta.url);
async function model() {
  const context = vm.createContext({structuredClone, Event, console, setTimeout, clearTimeout,
    document:{documentElement:{dataset:{}},dispatchEvent(){}}});
  vm.runInContext('globalThis.window=globalThis',context);
  vm.runInContext(readFileSync(new URL('preview-cases-a.js',root),'utf8'),context);
  const bundle = readFileSync(new URL('game.js',root),'utf8');
  const boundary = 'var caskSlots = [null, null, null, null];';
  assert.ok(bundle.includes(boundary));
  await vm.runInContext(bundle.replace(boundary,`
    shopName = id => SHOPS4.find(row=>row.id===id)?.name ?? id;
    globalThis.model = {D, applyAutoSupplyBeforeMonth, shipRegionalWithObservers,
      initial: readSession(amberTimePreviewCasesA['pair-origin'],{enabled:true, restore:D.restoreDistillery,
        monthMs:PARALLEL_PARAMETERS2.monthMs,stepMs:PARALLEL_PARAMETERS2.distillStepMs}).game};
    return;
    `+boundary),context);
  return context.model;
}
function replay(D,s) {
  const saved = D.serializeDistillery(s);
  assert.equal(D.serializeDistillery(D.restoreDistillery(saved)),saved);
}

test('manual and staff regional shipments share the cap and a pending allocation is consumed in parts',async()=>{
  const {D,initial,applyAutoSupplyBeforeMonth,shipRegionalWithObservers} = await model();
  const partnerId='trial-region-desk', productId=15;
  let s=D.enableAutoSupply(initial);
  s=D.tickDistillery(s);
  s=D.assignStoreProduct(s,{productId,shopId:'town-liquor',count:1});
  s=D.hireAutoSupplyStaff(s);
  s=D.setAutoSupplyPolicy(s,partnerId,true);
  const quote=D.regionalDeliveryQuote(s,productId,partnerId);
  const reserved=Math.min(7,quote.maxCount-1);
  assert.ok(reserved>5);
  s=D.assignRegionalProduct(s,{productId,partnerId,contractId:quote.contractId,allocationId:quote.nextAllocationId,count:reserved});
  s=shipRegionalWithObservers(s,{partnerId,productId,count:1});
  const before=D.regionalDeliveryQuote(s,productId,partnerId);
  s=applyAutoSupplyBeforeMonth(s);
  const receipt=D.regionalDeliveryHistory(s,partnerId).at(-1);
  const expected=Math.min(5,before.monthlyRemaining);
  assert.equal(receipt.count,expected);
  assert.equal(receipt.unitPrice,before.unitPrice);
  assert.equal(D.regionalDeliveryQuote(s,productId,partnerId).assigned,reserved-expected);
  assert.equal(applyAutoSupplyBeforeMonth(s),s);
  replay(D,s);
});

test('age jobs wait until due, finish a one-bottle tail on the next month, and keep old month replay',async()=>{
  const {D,initial}=await model();
  let s=D.enableBottlingScope(D.enableAutoSupply(D.enableBottlingAssignment(initial)));
  s=D.hireBottlingStaff(s);
  s=D.beginCollection(D.startRangeDistillation(s));
  for(let i=0;i<65;i++)s=D.distillStep(s);
  s=D.fillBarrel(D.stopDistillation(s),'refill');
  const id=s.core.casks.at(-1).id;
  const available=D.quote(s,id).count;
  s=D.bottleBranded(s,id,{brandId:1},available-11);
  s=D.setBottlingPolicy(s,{mode:'age',age:2,count:10});
  s=D.delegateBottling(s,id);
  s=D.tickDistillery(s);
  assert.equal(s.automation.lastBottlings.length,0);
  const old=D.tickDistillery(s,s.core.month,{finishRemainders:false});
  assert.equal(D.bottlingReservation(old,id).status,'completed');
  replay(D,old);
  s=D.tickDistillery(s);
  assert.equal(D.bottlingReservation(s,id).status,'active');
  assert.equal(s.automation.lastBottlings[0].count,10);
  replay(D,s);
  s=D.tickDistillery(s);
  assert.equal(s.automation.lastBottlings[0].count,1);
  assert.equal(D.currentCask(s,id),null);
  replay(D,s);
});
