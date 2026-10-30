import test from 'node:test';
import assert from 'node:assert/strict';
import {compareCareer,legacyRoundtrip,syntheticLongTerm} from '../design/map-sales-028/run.mjs';
import * as D from '../partner-orders.mjs';
import {mapSalesProjection} from '../map-sales-view.mjs';
test('native careers retain exact monthly saves with and without frozen map reads',()=>{
 for(const seed of [1,42]){const r=compareCareer(seed,{horizon:24});assert.equal(r.nativeResultsMatch,true);assert.equal(r.exactStateAtEveryPoint,true);assert.equal(r.restoreExact,true);assert(r.points>24);assert(r.releaseCount>1);}
});
test('legacy save and explicit shelf boundary retain their exact replay',()=>assert.equal(legacyRoundtrip().legacyExact,true));
test('30-year display fixture bounds recent counts and excludes future facts',()=>{const r=syntheticLongTerm();assert.equal(r.receiptCount,720);assert.equal(r.futureExcluded,true);});
test('lawful two-shop reallocation and multiple releases remain exact after save restore',()=>{
 let s;compareCareer(42,{horizon:36,onFinal:raw=>{s=D.restoreDistillery(raw);}});
 const [key,count]=Object.entries(s.storeMarket.byShop['town-liquor'])[0],productId=Number(key);
 s=D.returnStoreProduct(s,{productId,shopId:'town-liquor'});
 s=D.assignStoreProduct(s,{productId,shopId:'supermarket',count:10});
 s=D.assignStoreProduct(s,{productId,shopId:'town-liquor',count:count-10});
 const raw=D.serializeDistillery(s),view=mapSalesProjection(s,3),liquor=view.pins.find(p=>p.id==='town-liquor'),supermarket=view.pins.find(p=>p.id==='supermarket');
 assert.equal(supermarket.currentStock,10);assert(liquor.products.length>1);assert.equal(supermarket.totalSold,0);assert.notEqual(supermarket.currentStock,liquor.currentStock);
 assert.equal(D.serializeDistillery(s),raw);assert.deepEqual(mapSalesProjection(D.restoreDistillery(raw),3),view);
});
