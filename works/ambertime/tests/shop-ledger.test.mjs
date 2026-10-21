import test from 'node:test';import assert from 'node:assert/strict';
import {buildShopLedger} from '../shop-ledger.mjs';
import * as D from '../partner-orders.mjs';
import {shopFixture} from '../design/ledger-stage3/fixture.mjs';
import {advance} from './brands-helpers.mjs';
const get=(s,id='town-liquor',options)=>buildShopLedger(s,options).find(x=>x.id===id);
test('stockist IDs aggregate brands and portions once, cents exactly; start differs from first receipt',()=>{
 const s={shop:{relations:[{shopId:'town-liquor',startedMonth:2},{shopId:'town-liquor',startedMonth:4}],deliveries:[{id:1,shopId:'town-liquor',month:5,count:2,revenue:.1,releaseId:1},{id:2,shopId:'town-liquor',month:6,count:3,revenue:.2,releaseId:2},{id:3,shopId:'supermarket',month:6,count:10,revenue:50},{id:4,shopId:'town-liquor',month:7,count:0,revenue:0}]},releases:[{id:1,productId:1},{id:2,productId:2}]};
 const before=JSON.stringify(s),r=get(s);assert.equal(r.startedMonth,2);assert.equal(r.firstMonth,5);assert.equal(r.lastMonth,6);assert.equal(r.count,5);assert.equal(r.revenue,.3);assert.deepEqual(r.deliveries.map(d=>d.releaseKey),['release:2','release:1']);assert.equal(get(s,'supermarket').count,10);assert.equal(JSON.stringify(s),before);
});
test('unhandled, missing fields, legacy v12 mapping and old ordinary department receipts',()=>{
 assert.equal(get({}).count,null);const s={shop:{relations:[{startedMonth:undefined}],deliveries:[{id:1,count:2,month:3},{id:2,shopId:'department',count:5,month:4,revenue:90}]}};
 const r=get(s);assert.equal(r.startedMonth,null);assert.equal(r.firstMonth,3);assert.equal(r.revenue,null);assert.equal(get(s,'department').deliveries[0].kind,'delivery');assert.equal(get(s,'supermarket').related,false);assert.equal(get(s,'supermarket').lastMonth,null);
});
test('catalog is dynamic and records of unknown counterpart IDs stay separate',()=>{
 const s={shop:{deliveries:[{shopId:'future',month:1,count:7,revenue:11}]}};const rows=buildShopLedger(s,{shops:[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'},{id:'d',name:'D'}]});assert.deepEqual(rows.map(s=>s.id),['a','b','c','d','future']);assert.equal(rows.at(-1).count,7);
});
test('consultation and approval do not count as delivery; adoption metadata never adds 5 twice; valid save roundtrip',()=>{
 let s=D.restoreDistillery(JSON.stringify(shopFixture().interest));const id=s.releases.at(-1).productId;
 let shop=get(s,'department');assert.equal(shop.established,false);assert.equal(shop.interests[0].status,'interest');assert.equal(shop.count,0);assert.equal(shop.firstMonth,null);
 const before=D.serializeDistillery(s);s=D.deliverShop(s,id,5,'department',D.shopQuote(s,id,'department').selectionId);
 shop=get(s,'department');assert.equal(shop.established,false);assert.equal(shop.interests[0].status,'pending');assert.equal(shop.count,0);assert.equal(shop.revenue,0);assert.equal(shop.interests[0].dueMonth,s.core.month+1);
 const cancelled=D.cancelDepartmentInterest(s,s.department.interests[0].selectionId);assert.equal(get(cancelled,'department').count,0);assert.equal(get(cancelled,'department').related,true);assert.equal(get(cancelled,'department').established,false);
 s=advance(s,1);shop=get(s,'department');assert.equal(shop.established,true);assert.equal(shop.count,5);assert.equal(shop.deliveries[0].kind,'adoption');assert.equal(shop.interests.length,0);assert.equal(shop.revenue,s.shop.deliveries.find(d=>d.shopId==='department').revenue);
 const raw=D.serializeDistillery(s);assert.deepEqual(buildShopLedger(D.restoreDistillery(raw)),buildShopLedger(s));assert.equal(D.serializeDistillery(s),raw);assert.notEqual(raw,before);
});

test('established eligibility hides mere offers and keeps approved ordinary shops before first receipt',()=>{
 const s={shop:{offer:{shopId:'supermarket'},pendingOffers:[{shopId:'department'}],declinedUntil:{'town-liquor:1':12},relations:[],deliveries:[]}};
 const before=JSON.stringify(s);assert(buildShopLedger(s).every(x=>!x.established));assert.equal(buildShopLedger(s).length,3,'projection keeps all catalog rows');assert.equal(JSON.stringify(s),before);
 s.shop.relations=[{shopId:'supermarket',startedMonth:2}];assert.equal(get(s,'supermarket').established,true);assert.equal(get(s,'supermarket').count,0);assert.equal(get(s,'department').established,false);
});
test('receipt eligibility never guesses missing quantity or promotes adoption mirrors alone',()=>{
 const s={shop:{relations:[{shopId:'department',startedMonth:1}],deliveries:[{shopId:'department',count:null,month:2},{shopId:'department',count:0,month:3}]},department:{adoptions:[{deliveryId:7,count:5,month:2}]}};
 assert.equal(get(s,'department').established,false);s.shop.deliveries.push({id:7,shopId:'department',count:5,month:4});assert.equal(get(s,'department').established,true);
 const old={shop:{deliveries:[{count:2,month:3},{shopId:'future',count:1,month:4}]}};assert.equal(get(old).established,true);assert.equal(get(old,'future').established,true);assert.equal(get({shop:{deliveries:[{count:undefined,month:3}]}}).established,false);
});
