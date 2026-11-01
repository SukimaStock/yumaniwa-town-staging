import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../partner-orders.mjs';
import {advance} from './brands-helpers.mjs';
import {savedMarketSales,compactReleaseDate} from '../market-ui.mjs';
const raw=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
const ready=()=>D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(raw)));
const round=n=>Math.round(n*100)/100;

test('native adopted rules emit actual retail quantities 1/2/3/4+ only after a monthly sale',()=>{
 for(const allocated of [0,1,2,3,4,5,6]){
  const initial=ready(),id=initial.result.productId,before=D.setMarketRetail(initial,{productId:id,count:allocated}),beforeRaw=D.serializeDistillery(before);
  assert.deepEqual(savedMarketSales(initial,before),[],'allocation is not a sale');
  const after=advance(before,1),afterRaw=D.serializeDistillery(after),sales=savedMarketSales(before,after),actual=after.core.lastMonth.sales.filter(x=>x.id===id&&x.channel===undefined).reduce((n,x)=>n+x.sold,0);
  assert.equal(actual,Math.max(0,allocated-1));
  assert.deepEqual(sales,actual?[{productId:id,shopId:'retail',count:actual,revenue:16*actual,month:13}]:[]);
  const b=before.core.products.find(p=>p.id===id),a=after.core.products.find(p=>p.id===id);
  assert.equal(b.stock-a.stock,actual);assert.equal(a.sold-b.sold,actual);
  assert.equal(D.storeMarketInventory(after,id).retail,allocated-actual);
  assert.equal(after.core.cash,round(before.core.cash+after.core.lastMonth.revenue-after.core.lastMonth.upkeep));
  assert.equal(D.serializeDistillery(before),beforeRaw);assert.equal(D.serializeDistillery(after),afterRaw,'feedback cannot mutate formal state');
  assert.deepEqual(savedMarketSales(after,after),[],'rerender is not a new sale');
  const restored=D.restoreDistillery(afterRaw);assert.equal(D.serializeDistillery(restored),afterRaw);assert.deepEqual(savedMarketSales(after,restored),[],'reload does not replay a sale');
  // Same native operation, with and without feedback reads, must yield exact saves.
  const baseline=advance(D.restoreDistillery(beforeRaw),1);assert.equal(D.serializeDistillery(baseline),afterRaw);
 }
});

test('supported persisted store rules keep native retail and stockist events separate across releases',()=>{
 // Deliberately retain the fixture's pre-market-rules behavior, which is still supported.
 let before=D.enableStoreMarket(D.restoreDistillery(raw));const first=before.result.productId;
 before=D.setMarketRetail(before,{productId:first,count:2});before=D.assignStoreProduct(before,{productId:first,shopId:'town-liquor',count:2});
 before=D.bottleBranded(before,before.core.casks[0].id,{},2);const second=before.result.productId;assert.notEqual(first,second);
 before=D.setMarketRetail(before,{productId:second,count:2});
 const after=advance(before,1),events=savedMarketSales(before,after);
 const expected=after.core.lastMonth.sales.filter(x=>x.sold>0&&(!x.channel||x.channel==='retail'||x.channel==='stockist'&&['town-liquor','supermarket'].includes(x.shopId))).map(x=>({productId:x.id,shopId:x.channel==='stockist'?x.shopId:'retail',count:x.sold,revenue:x.revenue,month:after.core.month}));
 assert.deepEqual(events,expected);assert(events.some(x=>x.productId===first&&x.shopId==='retail'));assert(events.some(x=>x.productId===second&&x.shopId==='retail'));assert(events.some(x=>x.productId===first&&x.shopId==='town-liquor'));
 const keys=events.map(x=>x.productId+':'+x.shopId);assert.equal(new Set(keys).size,keys.length);
});

test('same-month placements, returns and cancelled plans never become actual sales',()=>{
 const s=ready(),id=s.result.productId,placed=D.setMarketRetail(s,{productId:id,count:3}),returned=D.setMarketRetail(placed,{productId:id,count:0});
 const assigned=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:3}),unassigned=D.returnStoreProduct(assigned,{productId:id,shopId:'town-liquor'});
 for(const after of [s,placed,returned,assigned,unassigned])assert.deepEqual(savedMarketSales(s,after),[]);
 assert.deepEqual(savedMarketSales(null,placed),[]);assert.deepEqual(savedMarketSales(s,null),[]);
 // Cancelling an uncommitted plan retains the exact original formal save.
 const saved=D.serializeDistillery(s);assert.deepEqual(savedMarketSales(s,D.restoreDistillery(saved)),[]);assert.equal(D.serializeDistillery(s),saved);
});

test('synthetic event-envelope edge cases aggregate only the same product and shop',()=>{
 // Synthetic presentation input only: does not claim a native monthly outcome.
 const before={core:{month:12}},after={core:{month:13,lastMonth:{month:13,sales:[
  {id:5,sold:1,revenue:16},{id:5,sold:2,revenue:32,channel:'retail'},
  {id:6,sold:2,revenue:30},{id:5,sold:1,revenue:12,channel:'stockist',shopId:'town-liquor'},
  {id:5,sold:2,revenue:20,channel:'stockist',shopId:'supermarket'},
  {id:5,sold:9,revenue:90,channel:'wholesale'},
  {id:5,sold:8,revenue:80,channel:'stockist',shopId:'department'},
  {id:5,sold:0,revenue:0},{id:5,sold:-1},{id:5,sold:1.5}
 ]}}};
 assert.deepEqual(savedMarketSales(before,after),[
  {productId:5,shopId:'retail',count:3,revenue:48,month:13},
  {productId:6,shopId:'retail',count:2,revenue:30,month:13},
  {productId:5,shopId:'town-liquor',count:1,revenue:12,month:13},
  {productId:5,shopId:'supermarket',count:2,revenue:20,month:13}
 ]);
 const stale=structuredClone(after);stale.core.lastMonth.month=12;assert.deepEqual(savedMarketSales(before,stale),[]);
});

test('compact product date means bottling month, not age or distillation month',()=>{
 const s=ready(),id=s.result.productId,release=s.releases.find(r=>r.productId===id),product=s.core.products.find(p=>p.id===id),before=D.serializeDistillery(s);
 assert.equal(release.bottledMonth,11);assert.equal(product.bottledMonth,11);assert.equal(compactReleaseDate(s,id),'26/12');assert.notEqual(s.result.distilledMonth,release.bottledMonth);assert.equal(D.serializeDistillery(s),before);
});
