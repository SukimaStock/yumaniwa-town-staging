import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {planSales,RULES} from '../market-sales.mjs';
import {planSales as labPlan} from '../experiments/market-design/v01/sales.mjs';
import {planStoreMarketSales} from '../store-market.mjs';
import {normalShopUnitPrice,NORMAL_SHOP_DEMAND} from '../shop-demand.mjs';
import {SHOP} from '../shop-model.mjs';
import {marketValue} from '../economy.mjs';
import {advance,resolve} from './brands-helpers.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
const source=()=>D.enableStoreMarket(D.restoreDistillery(fixture));
const ready=()=>D.enableMarketRules(source());
const round=n=>Math.round(n*100)/100;
function cold(s){const raw=D.serializeDistillery(s);assert.equal(execFileSync(process.execPath,['--input-type=module','-e',`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`],{input:raw,encoding:'utf8',maxBuffer:8e6}),raw);return D.restoreDistillery(raw);}
function conserved(s){for(const p of s.core.products){const i=D.storeMarketInventory(s,p.id);assert.equal(i.hand+i.retail+i.assigned+i.held,p.stock);assert.equal(p.stock+p.sold,p.originalStock);}assert.equal(s.core.cash,round(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep));}

test('old saves and unadopted future monthly execution remain byte exact',()=>{
 assert.equal(D.serializeDistillery(D.restoreDistillery(fixture)),fixture);
 let s=source();s=D.setMarketRetail(s,{productId:s.result.productId,count:6});s=D.tickDistillery(s);
 assert.equal(createHash('sha256').update(D.serializeDistillery(s)).digest('hex'),'7b291d66909a08a9019a13f0a99e186cc66ce744e9735366ff9c18063f031fb5');
 assert(!D.marketRulesMode(D.newStoreMarketDistillery(42)));assert(D.marketRulesMode(D.newMarketRulesDistillery(42)));cold(s);
});
test('explicit adoption preserves cash, stock, reservations, history, town and generation with reversible prefix',()=>{
 const old=source(),raw=D.serializeDistillery(old),s=D.enableMarketRules(old);
 assert.equal(D.serializeDistillery(old),raw);assert.deepEqual(s.operations.slice(0,-1),old.operations);
 for(const k of Object.keys(old).filter(k=>k!=='operations'))assert.deepEqual(s[k],old[k]);
 assert.equal(s.marketRules.rules,RULES);assert.equal(s.marketRules.boundaryMonth,old.core.month);assert.match(s.marketRules.boundaryDigest,/^fnv1a32:[0-9a-f]{8}$/);assert.deepEqual(s.marketRules.ledgers,{});
 assert.equal(D.enableMarketRules(s),s);assert.equal(D.serializeDistillery(D.preMarketRulesState(s)),raw);cold(s);
});
test('adoption preserves active tasting and partial distillation exactly',()=>{
 for(const prepare of [s=>D.sampleDistillery(s,s.core.casks[0].id),s=>{s=D.beginCollection(D.startRangeDistillation(s));while(s.still.distillation.progress<20)s=D.distillStep(s);return s;}]){
  const old=prepare(source()),raw=D.serializeDistillery(old),s=D.enableMarketRules(old);assert.equal(s.tastingId,old.tastingId);assert.deepEqual(s.still,old.still);assert.equal(D.serializeDistillery(D.preMarketRulesState(s)),raw);cold(s);
 }
});
test('unknown rules, altered boundary facts and carried credits cannot be silently loaded',()=>{
 const s=ready();for(const mutate of [x=>x.marketRules.version=2,x=>x.marketRules.rules='future',x=>x.marketRules.boundaryMonth++,x=>x.marketRules.boundaryDigest='bad',x=>x.marketRules.ledgers.retail={version:2},x=>x.operations.at(-1).value.boundaryDigest='bad',x=>x.operations.pop()]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}
});
test('native fixed sales module is exact Lab algorithm including split and retry behavior',()=>{
 assert.equal(fs.readFileSync(new URL('../market-sales.mjs',import.meta.url),'utf8'),fs.readFileSync(new URL('../experiments/market-design/v01/sales.mjs',import.meta.url),'utf8'));
 const p={id:1,count:48,age:12,character:.7,roughness:.2,wood:.3,price:16,referencePrice:16,flavor:{fruit:.6,grain:.2,smoke:.1,body:.1}};
 for(const venue of ['retail','town-liquor','supermarket']){let baseline;
  for(const splits of [1,2,4,8]){let ledger={},counts=Array(splits).fill(48/splits),monthly=[];for(let month=1;month<=24;month++){const items=counts.map((count,i)=>({...p,id:i+1,count})),r=planSales(items,venue,ledger,{month,seed:42});assert.deepEqual(r,labPlan(items,venue,ledger,{month,seed:42}));assert.deepEqual(planSales(items,venue,r.ledger,{month,seed:42}),r);assert.throws(()=>planSales(items,venue,r.ledger,{month,seed:43}));for(const x of r.sales)counts[x.id-1]-=x.count;ledger=r.ledger;monthly.push(r.sold);}if(baseline)assert.deepEqual(monthly,baseline);else baseline=monthly;}
 }
});
test('native future retail and store sales use exact candidate proposals and real payments',()=>{
 let s=ready(),id=s.result.productId;s=D.setMarketRetail(s,{productId:id,count:1});s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:5});
 const before=structuredClone(s),p=s.core.products.find(p=>p.id===id),expectedRetail=planSales([{...p,count:1,referencePrice:marketValue(p)}],'retail',{}, {month:s.core.month+1,seed:s.seed});
 const expectedStore=planSales([{...p,count:5,price:normalShopUnitPrice(s,id,'town-liquor'),referencePrice:NORMAL_SHOP_DEMAND.referencePaidPrice['town-liquor']}],'town-liquor',{}, {month:s.core.month+1,seed:s.seed});
 const plans=planStoreMarketSales(s,s.core.month+1);assert.equal(JSON.stringify(s),JSON.stringify(before));assert.equal(plans[0].planned,expectedStore.sold);
 s=D.tickDistillery(s);assert.equal(s.core.lastMonth.sales.filter(x=>x.channel!=='stockist').reduce((n,x)=>n+x.sold,0),expectedRetail.sold);assert.equal(s.core.lastMonth.sales.filter(x=>x.shopId==='town-liquor').reduce((n,x)=>n+x.sold,0),expectedStore.sold);
 assert.deepEqual(s.marketRules.ledgers.retail,expectedRetail.ledger);assert.deepEqual(s.marketRules.ledgers['town-liquor'],expectedStore.ledger);assert.equal(s.core.cash,round(before.core.cash+s.core.lastMonth.revenue-s.core.lastMonth.upkeep));conserved(s);cold(s);
});
test('funds rollback discards candidate sales and all fractional ledgers',()=>{
 let s=ready(),id=s.result.productId;s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:5});s.core.cash=0;const old=structuredClone(s),next=D.tickDistillery(s);assert.deepEqual(next.core.products,old.core.products);assert.deepEqual(next.marketRules,old.marketRules);assert.deepEqual(next.shop.deliveries,old.shop.deliveries);assert.equal(next.core.month,old.core.month);assert.equal(next.core.cash,0);assert.deepEqual(s,old);
});
test('a full delivery journal freezes a venue ledger without consuming unfulfilled purchases',()=>{
 let s=ready(),id=s.result.productId;s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:5});
 // Detached monthly boundary fixture, not a lawful saved career: exhaustive
 // historical journal generation would obscure the capacity transaction test.
 s.shop.deliveries=Array.from({length:SHOP.maxDeliveries},(_,i)=>({id:i+1,month:0,shopId:'town-liquor',count:1,revenue:12.8,productId:id}));
 s.labConnection.deliveryId=SHOP.maxDeliveries;s.core.products.find(p=>p.id===id).flavor={profile:{fruit:0,grain:0,smoke:1,body:0}};assert(planStoreMarketSales(s,s.core.month+1)[0].planned>0);const prior=structuredClone(s),next=D.tickDistillery(s);assert.equal(next.core.month,s.core.month+1);assert.equal(next.shop.deliveries.length,SHOP.maxDeliveries);assert.equal(next.storeMarket.byShop['town-liquor'][id],5);assert.equal(next.marketRules.ledgers['town-liquor'],undefined);assert.equal(next.shopDemand.lastOrders[0].reason,'delivery-ledger-full');assert.equal(next.shopDemand.lastOrders[0].shipped,0);assert.deepEqual(s,prior);
});

test('adoption retains an approved department reservation and settles its five separately',()=>{
 let s=resolve(source());s=D.startRangeDistillation(s);while(s.still.distillation.progress<40)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<65)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'refill');const cid=s.core.casks.at(-1).id;
 s=advance(s,24);s=D.bottleBranded(s,cid,{},12);const id=s.result.productId;s=advance(s,1);assert.equal(s.shop.offer.shopId,'department');const offer=s.shop.offer;s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:3});s=D.setMarketRetail(s,{productId:id,count:4});const q=D.shopOfferQuote(s,id,'department');s=D.acceptShopDelivery(s,id,5,'department',offer.id);const old=structuredClone(s),raw=D.serializeDistillery(s);s=D.enableMarketRules(s);assert.deepEqual(s.department,old.department);assert.deepEqual(s.core,old.core);assert.equal(D.serializeDistillery(D.preMarketRulesState(s)),raw);cold(s);
 s=advance(s,1);const deliveries=s.shop.deliveries.filter(x=>x.productId===id&&x.shopId==='department');assert.equal(deliveries.length,1);assert.equal(deliveries[0].count,5);assert.equal(deliveries[0].revenue,round(q.unitPrice*5));conserved(s);cold(s);
});
