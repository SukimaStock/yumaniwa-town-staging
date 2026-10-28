import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {planStoreMarketSales} from '../store-market.mjs';
import {brandReputation} from '../brand-reputation.mjs';
import {buildShopLedger} from '../shop-ledger.mjs';
import {advance,resolve} from './brands-helpers.mjs';
const round=n=>Math.round(n*100)/100,copy=structuredClone;
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
const source=()=>D.restoreDistillery(fixture),ready=()=>D.enableStoreMarket(source());
const pid=s=>s.result.productId;
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:6e6}),raw);return D.restoreDistillery(raw);}
function conserved(s){
 for(const p of s.core.products){const inv=D.storeMarketInventory(s,p.id);assert.equal(p.stock+p.sold,p.originalStock);assert.equal(inv.hand+inv.retail+inv.assigned+inv.held,inv.stock);assert(inv.hand>=0&&inv.assigned>=0&&inv.retail>=0);}
 assert.equal(s.core.cash,round(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep));
}
function failsWithoutMutation(s,fn){const raw=JSON.stringify(s);assert.throws(fn);assert.equal(JSON.stringify(s),raw);}
function fill(s,{gentle=false}={}){s=resolve(s);s=D.startRangeDistillation(s);if(gentle){while(s.still.distillation.progress<40)s=D.distillStep(s);}s=D.beginCollection(s);while(s.still.distillation.progress<65)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),'refill');}

test('main-only factory and logged migration preserve prior exact state, history, town and generation',()=>{
 const old=source(),raw=D.serializeDistillery(old),s=D.enableStoreMarket(old);assert.equal(D.serializeDistillery(old),raw);assert.equal(s.version,20);assert.equal(s.placement.version,1);assert.deepEqual(s.operations.slice(0,-1),old.operations);assert.deepEqual(s.core,old.core);assert.deepEqual(s.shop,old.shop);assert.deepEqual(s.generations,old.generations);assert.deepEqual(s.labConnection,old.labConnection);assert.deepEqual(s.placement,old.placement);assert.equal(s.operations.at(-1).key,'enable-store-market');assert.equal(D.enableStoreMarket(s),s);assert.equal(D.serializeDistillery(D.preStoreMarketState(s)),raw);assert.equal(D.storeMarketMode(D.newPlacementDistillery(42)),false);assert.equal(D.storeMarketMode(D.newStoreMarketDistillery(42)),true);cold(s);
});
test('migration prefix export preserves active tasting and partial distillation before later changes',()=>{
 let old=source();old=D.sampleDistillery(old,old.core.casks[0].id);let raw=D.serializeDistillery(old),s=D.enableStoreMarket(old);assert.equal(s.tastingId,old.tastingId);assert.equal(D.serializeDistillery(D.preStoreMarketState(s)),raw);cold(s);
 old=D.beginCollection(D.startRangeDistillation(source()));while(old.still.distillation.progress<20)old=D.distillStep(old);raw=D.serializeDistillery(old);s=D.enableStoreMarket(old);assert.equal(D.serializeDistillery(D.preStoreMarketState(s)),raw);cold(s);
});
test('assignment owns real stock without cash, ledger, reputation or town delivery; return restores only its bucket',()=>{
 let s=ready(),id=pid(s),before=copy(s);const q=D.storeMarketQuote(s,id,'town-liquor');assert(q.ok);s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:5});assert.equal(s.core.cash,before.core.cash);assert.equal(s.core.products.find(p=>p.id===id).stock,6);assert.deepEqual(s.shop.deliveries,before.shop.deliveries);assert.deepEqual(s.labConnection.town.shipments,before.labConnection.town.shipments);assert.deepEqual(brandReputation(s,1),brandReputation(before,1));assert.equal(D.storeMarketRows(s,'town-liquor')[0].count,5);assert.equal(D.storeMarketInventory(s,id).hand,1);s=D.returnStoreProduct(s,{productId:id,shopId:'town-liquor'});assert.equal(D.storeMarketInventory(s,id).hand,6);assert.equal(D.storeMarketRows(s,'town-liquor').length,0);assert.equal(s.core.cash,before.core.cash);conserved(s);cold(s);
});
test('retail and each store reserve exclusive bottles; invalid counts and direct delivery cannot bypass reservation',()=>{
 let s=ready(),id=pid(s);s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:4});s=D.setMarketRetail(s,{productId:id,count:2});assert.equal(D.storeMarketInventory(s,id).hand,0);failsWithoutMutation(s,()=>D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:1}));failsWithoutMutation(s,()=>D.setMarketRetail(s,{productId:id,count:3}));failsWithoutMutation(s,()=>D.deliverShop(s,id,1,'town-liquor'));for(const value of [{productId:id,shopId:'department',count:1},{productId:999,shopId:'town-liquor',count:1},{productId:id,shopId:'town-liquor',count:-1},{productId:id,shopId:'town-liquor',count:1.5},{productId:id,shopId:'town-liquor',count:NaN}])failsWithoutMutation(s,()=>D.assignStoreProduct(s,value));s=D.setMarketRetail(s,{productId:id,count:0});assert.equal(D.storeMarketInventory(s,id).hand,2);s=D.returnStoreProduct(s,{productId:id,shopId:'town-liquor'});assert.equal(D.storeMarketInventory(s,id).hand,6);conserved(s);cold(s);
});
test('next-month actual sales settle native price, receipts, cash and mirrors exactly once',()=>{
 let s=ready(),id=pid(s),old=copy(s),rep=brandReputation(s,1),q=D.storeMarketQuote(s,id,'town-liquor');s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:5});s=advance(s,1);const sale=s.core.lastMonth.sales.find(x=>x.id===id&&x.shopId==='town-liquor');assert(sale?.sold>0);assert.equal(sale.revenue,round(sale.sold*q.unitPrice));assert.equal(s.core.cash,round(old.core.cash+s.core.lastMonth.revenue-s.core.lastMonth.upkeep));assert.equal(D.storeMarketInventory(s,id).assigned,5-sale.sold);assert.equal(s.shop.deliveries.length,old.shop.deliveries.length+1);const receipt=s.shop.deliveries.at(-1);assert.equal(receipt.count,sale.sold);assert.equal(receipt.revenue,sale.revenue);assert.equal(s.releases.find(r=>r.productId===id).delivered,sale.sold);assert.deepEqual(brandReputation(s,1),rep);assert.equal(buildShopLedger(s).find(r=>r.id==='town-liquor').count,sale.sold);conserved(s);cold(s);
 const cash=s.core.cash;s=D.returnStoreProduct(s,{productId:id,shopId:'town-liquor'});s=advance(s,1);assert(!s.core.lastMonth.sales.some(x=>x.shopId==='town-liquor'));assert.equal(s.core.cash,round(cash-s.core.lastMonth.upkeep));conserved(s);cold(s);
});
test('mixed releases share a store demand limit and reproduce across cold replay without selling hand stock',()=>{
 let s=ready(),oldId=pid(s);s=D.assignStoreProduct(s,{productId:oldId,shopId:'town-liquor',count:2});s=D.bottleBranded(s,s.core.casks[0].id,{},2);const newId=pid(s);s=D.assignStoreProduct(s,{productId:newId,shopId:'town-liquor',count:2});assert.equal(D.storeMarketRows(s,'town-liquor').length,2);const untouched=D.storeMarketInventory(s,oldId).hand;
 for(let i=0;i<12;i++){s=advance(s,1);assert(s.core.lastMonth.sales.filter(x=>x.shopId==='town-liquor').reduce((n,x)=>n+x.sold,0)<=10);assert.equal(D.storeMarketInventory(s,oldId).hand,untouched);conserved(s);cold(s);}assert.equal(D.storeMarketInventory(s,oldId).assigned,0);assert.equal(D.storeMarketInventory(s,newId).assigned,0);
});
test('newly bottled same-month stock can be reserved; no sale occurs until next tick',()=>{
 let s=ready();s=D.bottleBranded(s,s.core.casks[0].id,{},2);const id=pid(s),cash=s.core.cash,receipts=s.shop.deliveries.length;assert.equal(s.core.products.find(p=>p.id===id).bottledMonth,s.core.month);assert(D.storeMarketQuote(s,id,'town-liquor').ok);s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:1});assert.equal(s.core.cash,cash);assert.equal(s.shop.deliveries.length,receipts);s=advance(s,1);assert(s.shop.deliveries.every(d=>d.productId!==id||d.month>s.core.products.find(p=>p.id===id).bottledMonth));conserved(s);cold(s);
});
test('pure planner uses real taste fit, finite shared demand and sub-minimum supermarket allocations',()=>{
 // Deliberately detached planner projections: never written or accepted as saves.
 const s=ready(),id=pid(s);s.shop.relations.push({shopId:'supermarket',brandId:1,startedMonth:0});s.core.products.find(p=>p.id===id).age=12;s.releases.find(r=>r.productId===id).age=12;s.storeMarket.byShop.supermarket[id]=2;
 assert(D.storeMarketQuote(s,id,'supermarket').ok);assert.equal(D.storeMarketQuote(s,id,'supermarket').maxCount,4);const plan=planStoreMarketSales(s,s.core.month+1).find(x=>x.shopId==='supermarket');assert.equal(plan.available,2);assert(plan.shipments.every(x=>x.count<=2));assert(plan.planned<=plan.requested);assert.deepEqual(planStoreMarketSales(s,s.core.month+1),planStoreMarketSales(copy(s),s.core.month+1));
 let good=0,bad=0;for(let seed=1;seed<=100;seed++){for(const [kind,profile] of [['good',{roughness:.4,character:.7,wood:.2}],['bad',{roughness:1,character:0,wood:1}]]){const x=ready();x.seed=seed;x.shopDemand.mode='capacity';const r=x.releases.find(r=>r.productId===id);r.profile={...r.profile,...profile};delete r.profile.flavor;x.storeMarket.byShop['town-liquor'][id]=6;const n=planStoreMarketSales(x,x.core.month+1).find(p=>p.shopId==='town-liquor').planned;if(kind==='good')good+=n;else bad+=n;}}assert(good>bad);
});
test('department approved five protect reservations and retail, settle once, and retain special project semantics',()=>{
 let s=fill(ready(),{gentle:true}),cid=s.core.casks.at(-1).id;s=advance(s,24);s=D.bottleBranded(s,cid,{},12);const id=pid(s);s=advance(s,1);assert.equal(s.shop.offer?.shopId,'department');const offer=s.shop.offer;s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:8});assert.equal(D.shopOfferQuote(s,id,'department').ok,false);s=D.returnStoreProduct(s,{productId:id,shopId:'town-liquor'});s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:3});s=D.setMarketRetail(s,{productId:id,count:4});const q=D.shopOfferQuote(s,id,'department');assert(q.ok);s=D.acceptShopDelivery(s,id,5,'department',offer.id);assert.deepEqual([D.storeMarketInventory(s,id).held,D.storeMarketInventory(s,id).assigned,D.storeMarketInventory(s,id).retail,D.storeMarketInventory(s,id).hand],[5,3,4,0]);failsWithoutMutation(s,()=>D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:1}));s=advance(s,1);const rows=s.shop.deliveries.filter(x=>x.productId===id&&x.shopId==='department');assert.equal(rows.length,1);assert.equal(rows[0].count,5);assert.equal(rows[0].revenue,round(q.unitPrice*5));assert.equal(s.department.interests.length,0);conserved(s);cold(s);
});
test('tampered assignments, mode, price and operation history are rejected by exact replay',()=>{
 let s=ready(),id=pid(s);s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:3});for(const edit of [x=>x.storeMarket.byShop['town-liquor'][id]++,x=>x.storeMarket.startedMonth++,x=>x.operations.at(-1).value.count++,x=>x.operations.splice(x.operations.findIndex(o=>o.key==='enable-store-market'),1),x=>x.core.cash++]){const bad=copy(s);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}const raw=D.serializeDistillery(D.preStoreMarketState(s));assert.equal(raw,fixture);conserved(s);cold(s);
});

test('lawful supermarket unlock accepts a small reserved lot and shares the real product with town and retail',()=>{
 let s=ready(),id=pid(s);s=D.setMarketRetail(s,{productId:id,count:6});s=advance(s,2);s=fill(s);const cid=s.core.casks.at(-1).id;s=advance(s,12);s=D.bottleBranded(s,cid,{},40);s=D.setMarketRetail(s,{productId:pid(s),count:40});
 for(let n=0;!s.shop.offer;n++){assert(n<15);s=advance(s,1);}assert.equal(s.shop.offer.shopId,'supermarket');s=D.acceptShop(s,'supermarket',s.shop.offer.id);s=D.bottleBranded(s,cid,{},6);id=pid(s);const cash=s.core.cash,receipts=s.shop.deliveries.length;
 assert(D.storeMarketQuote(s,id,'supermarket').ok);s=D.assignStoreProduct(s,{productId:id,shopId:'supermarket',count:3});s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:2});s=D.setMarketRetail(s,{productId:id,count:1});assert.equal(D.storeMarketInventory(s,id).hand,0);assert.equal(s.core.cash,cash);assert.equal(s.shop.deliveries.length,receipts);cold(s);
 let superSold=0;for(let n=0;n<12;n++){s=advance(s,1);superSold+=s.core.lastMonth.sales.filter(x=>x.id===id&&x.shopId==='supermarket').reduce((sum,x)=>sum+x.sold,0);conserved(s);if(superSold===3)break;}assert.equal(superSold,3);assert(s.shop.deliveries.filter(x=>x.productId===id&&x.shopId==='supermarket').every(x=>x.count<10));assert.equal(s.core.products.find(p=>p.id===id).stock,0);cold(s);
});

test('planner capacity stays shared across many large assigned lots, never per release',()=>{
 // Pure boundary projection; financial/identity edits are not serialized as saves.
 const s=ready(),id=pid(s),p=s.core.products.find(p=>p.id===id),r=s.releases.find(r=>r.productId===id);s.shopDemand.mode='capacity';p.stock=30;s.storeMarket.byShop['town-liquor'][id]=30;s.core.products.push({...copy(p),id:999});s.releases.push({...copy(r),id:999,productId:999});s.storeMarket.byShop['town-liquor'][999]=30;
 const plan=planStoreMarketSales(s,s.core.month+1).find(x=>x.shopId==='town-liquor');assert.equal(plan.available,60);assert.equal(plan.requested,10);assert(plan.planned<=10);assert.equal(plan.shipments.reduce((n,x)=>n+x.count,0),plan.planned);
});
test('funds rollback leaves store reservations, receipts, cash and physical stock unconsumed',()=>{
 // Boundary-only state follows the existing native monthly rollback regression.
 let s=fill(ready());const id=pid(s);s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:5});s.core.cash=0;const before=copy(s);const after=D.tickDistillery(s);assert.deepEqual(after.storeMarket,before.storeMarket);assert.deepEqual(after.shop.deliveries,before.shop.deliveries);assert.deepEqual(after.core.products,before.core.products);assert.equal(after.core.cash,before.core.cash);assert.equal(after.core.month,before.core.month);assert.deepEqual(s,before);
});


test('new games never invent demand or unmet orders before an actual store relationship',()=>{
 let s=D.newStoreMarketDistillery(42);assert.deepEqual(s.shop.relations,[]);assert.deepEqual(planStoreMarketSales(s,1),[]);s=advance(s,1);assert.deepEqual(s.shopDemand.lastOrders,[]);assert(!s.core.journal[0].message.includes('商店の注文'));assert.equal(s.shop.deliveries.length,0);conserved(s);cold(s);
});
test('a lawful current-month relationship has no demand until the following month',()=>{
 const full=source(),end=full.operations.findIndex(o=>o.key==='stockist-accept');assert(end>=0);let facts;
 D.replayDistilleryOperations(full,({index,after})=>{if(index===end)facts=after;});
 const prefix=Object.fromEntries(Object.keys(full).map(key=>[key,key==='operations'?full.operations.slice(0,end+1):key==='origin'?full.origin:facts[key]]));
 let s=D.enableStoreMarket(D.restoreDistillery(JSON.stringify(prefix)));assert.equal(s.shop.relations[0].startedMonth,s.core.month);assert.deepEqual(planStoreMarketSales(s,s.core.month),[]);const plans=planStoreMarketSales(s,s.core.month+1);assert.deepEqual(plans.map(p=>p.shopId),['town-liquor']);s=advance(s,1);assert.deepEqual(s.shopDemand.lastOrders.map(p=>p.shopId),['town-liquor']);conserved(s);cold(s);
});
