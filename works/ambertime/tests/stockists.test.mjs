import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {brandReputation,retailReputationFactors} from '../brand-reputation.mjs';
import {fill,release,advance,exact} from './brands-helpers.mjs';
const round=n=>Math.round(n*100)/100;
let cache;
function offered(){if(!cache){let s=D.newStockistsDistillery(42);for(let i=0;i<3;i++){s=release(s,{age:6,progress:65,selection:i?{brandId:1}:{name:'川霧'},tier:'low'});s=advance(s,6);}s=release(s,{age:24,progress:65,selection:{brandId:1},tier:'high'});cache=advance(s,1);}return structuredClone(cache);}
function accepted(){let s=offered();while(s.shop.offer){const o=s.shop.offer;s=D.acceptShop(s,o.shopId,o.id);}return s;}
const product=s=>s.releases.at(-1).productId;
function unchanged(s,fn){const raw=JSON.stringify(s);assert.throws(fn);assert.equal(JSON.stringify(s),raw);}
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);}
function identity(s){assert.equal(round(s.core.cash-(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep))||0,0);for(const p of s.core.products)assert.equal(p.sold+p.stock,p.originalStock);}

// Boundary projections below isolate quotations; they are deliberately never
// serialized or claimed to be valid operation histories. Replay tests use only
// public operations and natural products.
function projection({age=24,roughness=.3,stock=36}={}){const s=accepted(),p=s.core.products.find(p=>p.id===product(s));Object.assign(p,{age,roughness,stock});return s;}

test('store definitions encode distinct roles with no predecessor-store requirement',()=>{
 assert.deepEqual(D.SHOPS.map(x=>[x.id,x.minAge,x.maxRoughness,x.minQuantity,x.monthlyLimit,x.rate]),[['town-liquor',0,null,1,10,.8],['supermarket',12,null,10,20,1],['department',24,.3,5,5,1.4]]);
 const s=offered();assert.equal(s.shop.relations.length,0);assert.equal(s.shop.offer.shopId,'town-liquor');assert.deepEqual(s.shop.pendingOffers.map(o=>o.shopId),['supermarket','department']);cold(s);
});

test('bottling alone does not generate any store opportunity',()=>{
 const s=advance(release(D.newStockistsDistillery(8),{age:24,progress:65,selection:{name:'新作'},tier:'high'}),1);assert.equal(s.releases.length,1);assert.equal(s.shop.offer,null);assert.deepEqual(s.shop.pendingOffers,[]);
});

for(const [store,boundary] of [['supermarket',12],['department',24]])test(`${store} enforces the exact age boundary`,()=>{
 let s=projection({age:boundary-1});assert.match(D.shopQuote(s,product(s),store).reason,new RegExp(`${boundary}か月`));assert.deepEqual(D.shopQuote(s,product(s),store).quantities,[]);unchanged(s,()=>D.deliverShop(s,product(s),store==='supermarket'?10:5,store));s=projection({age:boundary});assert.equal(D.shopQuote(s,product(s),store).ok,true);
});

test('individual retailer accepts young and rough products, including a single bottle',()=>{
 const s=projection({age:0,roughness:.99,stock:1}),id=product(s),q=D.shopQuote(s,id,'town-liquor');assert.equal(q.ok,true);assert.deepEqual(q.quantities,[1]);const next=D.deliverShop(s,id,1,'town-liquor');assert.equal(next.core.products.find(p=>p.id===id).stock,0);
});

test('department roughness boundary is inclusive, and rejection is explicit',()=>{
 const s=projection({roughness:.30000001}),id=product(s);assert.match(D.shopQuote(s,id,'department').reason,/刺激/);unchanged(s,()=>D.deliverShop(s,id,5,'department'));assert.equal(D.shopQuote(projection({roughness:.3}),id,'department').ok,true);assert.equal(D.shopQuote(projection({roughness:.299999}),id,'department').ok,true);
});

for(const [store,min]of[['town-liquor',1],['supermarket',10],['department',5]])test(`${store} rejects below-minimum, fractional, negative and unavailable stock`,()=>{
 const s=projection({stock:min-1}),id=product(s);assert.equal(D.shopQuote(s,id,store).ok,false);assert.deepEqual(D.shopQuote(s,id,store).quantities,[]);for(const n of [min-1,0,-1,1.5,'5',99])unchanged(s,()=>D.deliverShop(s,id,n,store));const enough=projection({stock:min});assert(D.shopQuote(enough,id,store).quantities.includes(min));
});

test('prices derive from standard price independently of current low/standard/high shelf tier',()=>{
 const s=accepted(),id=product(s),standard=D.salePrices(s,id).standard;
 for(const tier of ['low','standard','high']){const next=D.setSalePrice(s,tier,id);for(const store of D.SHOPS)assert.equal(D.shopQuote(next,id,store.id).unitPrice,round(standard*store.rate));}
});

test('monthly caps are per retailer, shared across releases of a brand, and cannot oversell shared stock',()=>{
 let s=accepted(),id=product(s),before=structuredClone(s.core.products.find(p=>p.id===id)),cash=s.core.cash,total=s.core.totals.bottlesSold,rep=brandReputation(s,1),factors=retailReputationFactors(s),evidence=D.offerEvidence(s);let revenue=0;
 for(const [store,n]of[['town-liquor',10],['supermarket',20],['department',5]]){const q=D.shopQuote(s,id,store);revenue=round(revenue+n*q.unitPrice);s=D.deliverShop(s,id,n,store);assert.equal(D.shopQuote(s,id,store).remaining,0);assert.equal(D.shopQuote(s,id,store).ok,false);}
 assert.equal(s.core.products.find(p=>p.id===id).stock,before.stock-35);assert.equal(s.core.cash,round(cash+revenue));assert.equal(s.core.totals.bottlesSold,total+35);assert.deepEqual(brandReputation(s,1),rep);assert.deepEqual(retailReputationFactors(s),factors);assert.deepEqual(D.offerEvidence(s),evidence);assert.equal(s.releases.at(-1).delivered,35);identity(s);cold(s);
 for(const store of D.SHOPS){const stats=D.shopBrandStats(s,1,store.id);assert.equal(stats.history.length,1);assert.equal(stats.history[0].shopId,store.id);assert.equal(stats.history[0].releaseId,s.releases.at(-1).id);assert.equal(stats.history[0].productId,id);assert.equal(stats.history[0].month,s.core.month);assert.equal(stats.revenue,round(stats.bottles*D.shopQuote(s,id,store.id).unitPrice));}
});

test('delivery to an exact later release leaves other SKUs intact and shares only that store month cap',()=>{
 let s=release(accepted(),{age:0,progress:65,selection:{brandId:1},tier:'high'}),id=product(s),other=s.core.products.find(p=>p.id!==id&&p.stock>0);assert(other);const before=structuredClone(other);s=D.deliverShop(s,id,5,'town-liquor');assert.deepEqual(s.core.products.find(p=>p.id===other.id),before);assert.equal(D.shopQuote(s,other.id,'town-liquor').remaining,5);assert.equal(D.shopQuote(s,other.id,'department').remaining,5);assert.match(D.shopQuote(s,id,'supermarket').reason,/12か月/);cold(s);
});

test('each offer is individually noticed/deferred, promotes in order and rejects stale action IDs',()=>{
 let s=offered(),old=s.shop.offer;s=D.noticeShopOffer(s,old.shopId,old.id);assert.equal(D.noticeShopOffer(s,old.shopId,old.id),s);const queue=structuredClone(s.shop.pendingOffers);s=advance(s,2);assert.equal(s.shop.offer.id,old.id);assert.equal(s.shop.offer.notified,true);assert.deepEqual(s.shop.pendingOffers,queue);s=D.acceptShop(s,old.shopId,old.id);assert.equal(s.shop.offer.shopId,'supermarket');for(const fn of [D.acceptShop,D.declineShop,D.noticeShopOffer])unchanged(s,()=>fn(s,old.shopId,old.id));unchanged(s,()=>D.acceptShopDelivery(s,product(s),5,old.shopId,old.id));assert.equal(s.shop.relations.length,1);cold(s);
});

test('declining one store does not change reputation or discard other offers and can recur after cooldown',()=>{
 let s=offered(),o=s.shop.offer,rep=brandReputation(s,1);s=D.declineShop(s,o.shopId,o.id);assert.deepEqual(brandReputation(s,1),rep);assert.equal(s.shop.offer.shopId,'supermarket');while(s.shop.offer){const n=s.shop.offer;s=D.acceptShop(s,n.shopId,n.id);}s=advance(s,13);assert.equal(s.shop.offer?.shopId,'town-liquor');assert.notEqual(s.shop.offer.id,o.id);assert.equal(s.shop.relations.length,2);cold(s);
});

for(const store of ['town-liquor','supermarket','department'])test(`atomic ${store} acceptance and delivery changes one exact relationship and one record`,()=>{
 let s=offered();while(s.shop.offer.shopId!==store){const o=s.shop.offer;s=D.acceptShop(s,o.shopId,o.id);}const o=s.shop.offer,id=product(s),n=D.SHOPS.find(x=>x.id===store).minQuantity,raw=JSON.stringify(s),q=D.shopOfferQuote(s,id,store),next=D.acceptShopDelivery(s,id,n,store,o.id);assert.equal(JSON.stringify(s),raw);assert.equal(next.operations.length,s.operations.length+1);assert.equal(next.operations.at(-1).key,'stockist-accept-delivery');assert.equal(next.shop.relations.length,s.shop.relations.length+1);assert.equal(next.shop.deliveries.at(-1).shopId,store);assert.equal(next.core.cash,round(s.core.cash+n*q.unitPrice));assert.deepEqual(brandReputation(next,1),brandReputation(s,1));identity(next);cold(next);unchanged(s,()=>D.acceptShopDelivery(s,id,999,store,o.id));
});

test('acceptance alone transfers nothing, including after every product sells out, and survives rerelease',()=>{
 let s=advance(offered(),60),o=s.shop.offer,core=structuredClone(s.core);assert.equal(s.core.products.reduce((n,p)=>n+p.stock,0),0);s=D.acceptShop(s,o.shopId,o.id);assert.deepEqual(s.core,core);assert.deepEqual(s.shop.deliveries,[]);s=release(s,{age:0,selection:{brandId:1}});const id=product(s);assert(D.shopQuote(s,id,'town-liquor').ok);s=D.deliverShop(s,id,1,'town-liquor');assert.equal(s.shop.deliveries.at(-1).brandId,1);cold(s);
});

test('different brands never borrow another brand retailer relationship',()=>{
 const s=release(accepted(),{age:0,selection:{name:'夕凪'}}),id=product(s);assert.equal(s.releases.at(-1).brandId,2);for(const store of D.SHOPS){assert.equal(D.shopQuote(s,id,store.id).ok,false);unchanged(s,()=>D.deliverShop(s,id,store.minQuantity,store.id));}cold(s);
});

test('v12 pending, noticed, accepted and delivered saves migrate only at an explicit logged boundary',()=>{
 let old=release(D.newShopDistillery(42),{age:6,progress:65,selection:{name:'川霧'},tier:'low'});old=advance(old,1);old=release(old,{age:6,progress:65,selection:{brandId:1},tier:'low'});for(let i=0;i<40&&!old.shop.offer;i++)old=advance(old,1);assert(old.shop.offer);const id=product(old),acceptedOld=D.acceptShop(old),delivered=D.deliverShop(acceptedOld,id,5);
 for(const state of [old,D.noticeShopOffer(old),acceptedOld,delivered]){const raw=D.serializeDistillery(state),next=D.enableStockists(state);assert.equal(D.serializeDistillery(state),raw);assert.equal(next.version,13);assert.equal(next.operations.at(-1).key,'enable-stockists');assert.deepEqual(next.core,state.core);assert.deepEqual(next.releases,state.releases);assert.deepEqual(next.shop.relations,state.shop.relations);assert.deepEqual(next.shop.deliveries,state.shop.deliveries);assert.deepEqual(next.shop.offer,state.shop.offer);assert.equal(D.enableStockists(next),next);cold(next);assert.deepEqual(exact(state),state);}
 const migrated=D.enableStockists(delivered);assert.equal(D.shopBrandStats(migrated,1,'town-liquor').bottles,5);assert.equal(D.shopQuote(migrated,id,'town-liquor').remaining,5);assert.equal(D.shopBrandStats(migrated,1,'supermarket'),null);
});

test('partial manual and usual extraction retain exact progress across retailer operations and cold replay',()=>{
 for(const automatic of [false,true]){let s=advance(accepted(),1);s=automatic?D.beginUsual(D.reserveUsual(s)):D.startDistillation(s);for(let i=0;i<37;i++)s=D.distillStep(s);const before=structuredClone(s.still);s=D.deliverShop(s,product(s),1,'town-liquor');assert.deepEqual(s.still,before);assert.equal(s.operations.at(-1).value.progress,37);cold(s);}
});

test('strict replay rejects altered shop identity, amounts, eligibility and queued offers',()=>{
 const s=accepted(),done=D.deliverShop(s,product(s),5,'department');for(const edit of [x=>x.shop.deliveries.at(-1).shopId='supermarket',x=>x.shop.deliveries.at(-1).unitPrice++,x=>x.operations.at(-1).value.shopId='supermarket',x=>x.shop.relations.at(-1).shopId='town-liquor',x=>x.core.cash++]){const bad=structuredClone(done);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}const bad=offered();bad.shop.pendingOffers.reverse();assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));cold(done);
});

test('retailer caps reset next month without erasing delivery history or adding a retail sale twice',()=>{
 let s=accepted(),id=product(s);s=D.deliverShop(s,id,10,'town-liquor');const ledger=structuredClone(s.shop.deliveries),soldBefore=s.releases.at(-1).sold;s=advance(s,1);assert.deepEqual(s.shop.deliveries,ledger);assert.equal(D.shopQuote(s,id,'town-liquor').remaining,10);const p=s.core.products.find(p=>p.id===id),r=s.releases.at(-1);assert.equal(r.sold,p.sold-10);assert(r.sold>=soldBefore);assert.equal(r.delivered,10);identity(s);cold(s);
});

test('tasting and wholesale decisions retain priority without consuming or losing retailer invitations',()=>{
 let s=offered();for(let i=0;i<80&&!s.trade.offer;i++)s=D.tickDistillery(s);assert(s.trade.offer);const raw=JSON.stringify(s),o=s.shop.offer;for(const fn of [D.noticeShopOffer,D.acceptShop,D.declineShop])assert.throws(()=>fn(s,o.shopId,o.id));assert.equal(D.shopOfferQuote(s,product(s),o.shopId).ok,false);assert.equal(JSON.stringify(s),raw);cold(s);
 s=fill(advance(offered(),1));s=advance(s,1);s=D.sampleDistillery(s,s.core.casks.at(-1).id);const o2=s.shop.offer;unchanged(s,()=>D.noticeShopOffer(s,o2.shopId,o2.id));unchanged(s,()=>D.acceptShopDelivery(s,product(s),1,o2.shopId,o2.id));assert.equal(D.shopOfferQuote(s,product(s),o2.shopId).ok,false);cold(s);
});

test('operation and delivery ledger limits reject atomically without half-created relationships',()=>{
 // Isolated capacity projections are not saved histories.
 let s=offered(),o=s.shop.offer,id=product(s);s.operations=Array.from({length:12000},()=>({key:'placeholder'}));unchanged(s,()=>D.acceptShopDelivery(s,id,1,o.shopId,o.id));assert.equal(s.shop.relations.length,0);assert.equal(s.shop.deliveries.length,0);
 s=offered();o=s.shop.offer;s.operations=Array.from({length:11999},()=>({key:'placeholder'}));const next=D.acceptShopDelivery(s,product(s),1,o.shopId,o.id);assert.equal(next.operations.length,12000);assert.equal(next.shop.relations.length,1);assert.equal(next.shop.deliveries.length,1);
 s=accepted();s.shop.deliveries=Array.from({length:2048},(_,i)=>({id:i+1,month:0,brandId:1,releaseId:1,productId:0,shopId:'town-liquor',count:1,unitPrice:1,revenue:1}));for(const store of D.SHOPS){assert.match(D.shopQuote(s,product(s),store.id).reason,/納品帳/);unchanged(s,()=>D.deliverShop(s,product(s),store.minQuantity,store.id));}
});

test('unknown store IDs and omitted transaction identity cannot silently choose another buyer',()=>{
 const s=accepted(),id=product(s);assert.equal(D.shopQuote(s,id,'missing').ok,false);for(const shopId of [undefined,null,'missing'])unchanged(s,()=>D.deliverShop(s,id,5,shopId));const offeredState=offered();for(const fn of [D.noticeShopOffer,D.acceptShop,D.declineShop])unchanged(offeredState,()=>fn(offeredState));
});

test('each store monthly allowance is shared across brands, not multiplied by brand count',()=>{
 // Quote-only projection: a different brand has already used this month's store
 // allowance. It is deliberately not serialized as an operation-derived save.
 const s=accepted(),id=product(s),month=s.core.month;
 s.shop.deliveries.push({id:1,month,brandId:999,releaseId:999,productId:999,shopId:'supermarket',count:10,unitPrice:1,revenue:10});
 assert.equal(D.shopQuote(s,id,'supermarket').remaining,10);assert.deepEqual(D.shopQuote(s,id,'supermarket').quantities,[10]);
 assert.equal(D.shopQuote(s,id,'town-liquor').remaining,10);assert.equal(D.shopQuote(s,id,'department').remaining,5);
 s.shop.deliveries.push({id:2,month,brandId:998,releaseId:998,productId:998,shopId:'supermarket',count:10,unitPrice:1,revenue:10});
 const q=D.shopQuote(s,id,'supermarket');assert.equal(q.remaining,0);assert.equal(q.ok,false);assert.deepEqual(q.quantities,[]);assert.match(q.reason,/今月/);
 assert.equal(D.shopQuote(s,id,'town-liquor').ok,true);assert.equal(D.shopQuote(s,id,'department').ok,true);
 // Previous-month dispatches never consume the current month's allowance.
 s.shop.deliveries[0].month--;s.shop.deliveries[1].month--;assert.equal(D.shopQuote(s,id,'supermarket').remaining,20);
});
