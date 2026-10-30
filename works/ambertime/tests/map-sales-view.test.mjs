import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../partner-orders.mjs';
import {advance} from './brands-helpers.mjs';
import {mapSalesProjection,mapShopDetail} from '../map-sales-view.mjs';
import {mapProgress,mapShopPositions} from '../world-map-view.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
const ready=()=>D.enableStoreMarket(D.restoreDistillery(fixture));
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
const pin=(s,id='town-liquor')=>mapSalesProjection(s,3).pins.find(p=>p.id===id);
test('new native game and proposals do not become handling shops',()=>{
 const s=D.newMarketRulesDistillery(42);assert.deepEqual(mapSalesProjection(s,2).pins,[]);
 const proposal=structuredClone(s);proposal.shop.offer={shopId:'town-liquor',brandId:1};proposal.shop.relations.push({shopId:'department',brandId:1,startedMonth:0});
 assert.deepEqual(mapSalesProjection(proposal,3).pins,[]);
 assert.equal(mapShopDetail(proposal,'department'),null);
});
test('committed shelf, sales and recall match actual native records without mutation',()=>{
 let s=ready(),productId=s.result.productId;const stock=D.storeMarketInventory(s,productId).hand;
 const initial=pin(s);assert.equal(initial.currentStock,0);assert.equal(initial.totalSold,0);
 // An unrelated presentation draft cannot enter committed inventory.
 s=structuredClone(s);s.draft={shops:{'town-liquor':{[productId]:stock}}};assert.equal(pin(s).currentStock,0);delete s.draft;
 s=D.assignStoreProduct(s,{productId,shopId:'town-liquor',count:5});assert.equal(pin(s).currentStock,5);assert.equal(pin(s).totalSold,0);
 const raw=D.serializeDistillery(s),progress=mapProgress(s);mapSalesProjection(freeze(s),2);mapSalesProjection(s,3);assert.equal(D.serializeDistillery(s),raw);assert.deepEqual(mapProgress(s),progress);
 s=advance(s,1);const sold=s.shop.deliveries.filter(r=>r.shopId==='town-liquor'&&r.month>s.storeMarket.startedMonth).reduce((n,r)=>n+r.count,0);
 assert(sold>0);assert.equal(pin(s).totalSold,sold);assert.equal(pin(s).currentStock,5-sold);assert.equal(pin(s).monthlySold,sold);
 const saved=D.serializeDistillery(s);assert.deepEqual(mapSalesProjection(D.restoreDistillery(saved),3),mapSalesProjection(s,3));assert.equal(D.serializeDistillery(s),saved);
 s=D.returnStoreProduct(s,{productId,shopId:'town-liquor'});assert.equal(pin(s).currentStock,0);assert.equal(pin(s).totalSold,sold);
});
test('legacy deliveries remain deliveries across the store-market boundary',()=>{
 const old=D.restoreDistillery(fixture),month=old.core.month;
 old.shop.deliveries.push({id:999,shopId:'town-liquor',brandId:1,month,count:7});
 const before=mapShopDetail(old,'town-liquor');assert.equal(before.currentStock,null);assert.equal(before.totalSold,null);assert.equal(before.totalDelivered,7);
 const current=structuredClone(old);current.storeMarket={version:1,startedMonth:month,byShop:{'town-liquor':{},supermarket:{}}};
 assert.equal(mapShopDetail(current,'town-liquor').status,'納品記録');
 current.shop.deliveries.push({id:1000,shopId:'town-liquor',brandId:1,month:month+1,count:3});current.core.month++;
 const after=mapShopDetail(current,'town-liquor');assert.equal(after.totalDelivered,10);assert.equal(after.historicalDelivered,7);assert.equal(after.totalSold,3);
});
test('twelve-month window bounds long-term numbers, keeps cumulative facts in detail',()=>{
 const s=ready();s.core.month=360;s.storeMarket.startedMonth=0;
 s.shop.deliveries=Array.from({length:360},(_,i)=>({id:i+1,shopId:'town-liquor',brandId:1,month:i+1,count:10}));
 const d=mapShopDetail(s,'town-liquor');assert.equal(d.totalSold,3600);assert.equal(d.recentSold,120);assert.equal(d.monthlySold,10);assert.deepEqual(d.period,{fromMonth:349,toMonth:360,label:'直近12か月'});
 s.shop.deliveries.push({id:361,shopId:'town-liquor',month:361,count:999});assert.equal(mapShopDetail(s,'town-liquor').totalSold,3600);
});
test('store records, brand-specific remarks and inventory stay isolated',()=>{
 const s=ready(),id=s.result.productId;s.shop.relations.push({shopId:'supermarket',brandId:2,startedMonth:0});
 s.storeMarket.byShop['town-liquor'][id]=2;s.storeMarket.byShop.supermarket[id]=4;
 s.shop.deliveries=[{shopId:'town-liquor',brandId:1,month:s.core.month,count:3},{shopId:'supermarket',brandId:2,month:s.core.month,count:5}];
 assert.equal(pin(s).currentStock,2);assert.equal(pin(s,'supermarket').currentStock,4);assert.equal(pin(s).totalDelivered,3);assert.equal(pin(s,'supermarket').totalDelivered,5);
 assert.equal(pin(s,'supermarket').remarkBrandId,2);assert.equal(pin(s,'supermarket').remarkKey,'received');assert.equal(pin(s).customerComment,null);
 assert.deepEqual([pin(s).x,pin(s).y],mapShopPositions(3)['town-liquor']);
});
test('department factual adoptions have delivery facts and no fictitious shop stock or buyer rating',()=>{
 const s=ready();s.shop.relations.push({shopId:'department',brandId:1,startedMonth:0});s.shop.deliveries.push({shopId:'department',brandId:1,month:s.core.month,count:5});
 const d=pin(s,'department');assert.equal(d.totalDelivered,5);assert.equal(d.totalSold,null);assert.equal(d.currentStock,null);assert.equal(d.customerComment,null);assert.equal(d.status,'納品済み');
});
test('self retail is separate from shop pins and only uses existing retail comments',()=>{
 const s=ready(),retail=mapShopDetail(s,'retail');assert.equal(retail.name,'自家販売');assert.equal(retail.totalSold,s.releases.reduce((n,r)=>n+r.sold,0));
 assert(!mapSalesProjection(s,3).pins.some(p=>p.id==='retail'));assert.equal(mapShopDetail(s,'bar'),null);assert.equal(mapShopDetail(s,'diner'),null);
});
