import test from 'node:test';
import assert from 'node:assert/strict';
import {compactRemark,readReleaseFacts,readStoreFacts,readMemoryFacts,releaseLedgerAggregate,storeLedgerAggregate} from './read-contract.mjs';
import {createReader,updateReader} from './readers.mjs';
import {shopRemark} from '../shop-remarks.mjs';
import {buildShopLedger} from '../shop-ledger.mjs';
import * as M from '../../ambertime-strategy-lab/internal/model.mjs';
const release=(id=1,brandId=1)=>({id,productId:id+100,brandId,caskId:1,bottledMonth:0,bottles:54,age:12,price:10,listed:true,profile:{wood:.4,roughness:.2,character:.5}});
function fixture(){const native={core:{month:0},brands:[{id:1},{id:2}],operations:[],releases:[release()],shop:{relations:[],deliveries:[],pendingOffers:[]},department:{interests:[],adoptions:[]}};return {native,shadow:{core:M.registerRelease(M.createModel(),release()),reader:updateReader(createReader(),null,native)}};}
test('targeted four-store remarks preserve native text across same-month receipts and long gaps',()=>{
 let {native,shadow}=fixture();
 for(const month of [0,1,2,3,4,5,6,18,19]){
  for(const shopId of ['town-liquor','supermarket','bar','department']){
   const next=structuredClone(native);next.core.month=month;
   if(!next.shop.relations.some(r=>r.shopId===shopId))next.shop.relations.push({shopId,brandId:1,startedMonth:month});
   for(let j=0;j<2;j++)next.shop.deliveries.push({id:next.shop.deliveries.length+1,shopId,brandId:1,releaseId:1,productId:101,month,count:5});
   shadow.reader=updateReader(shadow.reader,native,next);native=next;
   for(const sid of ['town-liquor','supermarket','bar','department'])for(const brandId of [1,2]){const {key,text}=shopRemark(native,sid,brandId);assert.deepEqual(compactRemark(shadow,{shopId:sid,brandId}),{key,text});}
  }
 }
 const next=structuredClone(native);next.core.month=25;shadow.reader=updateReader(shadow.reader,native,next);assert.equal(compactRemark(shadow,{shopId:'town-liquor'}).key,'gap');
 assert.throws(()=>compactRemark(shadow,{shopId:'missing'}),/missing/);
 assert.throws(()=>compactRemark(shadow,{shopId:'town-liquor',brandId:99}),/missing/);
});
test('confirmed procurement stays unknown, allocations stay separate, IDs stay distinct',()=>{
 const {shadow}=fixture();shadow.core=M.registerRelease(shadow.core,release(2));
 shadow.core=M.assignStock(shadow.core,1,'bar',3);
 shadow.core=M.applyTransaction(shadow.core,{seq:1,status:'completed',month:1,releaseId:1,shopId:'bar',kind:'store-sell-through',count:2,revenueCents:2000});
 shadow.core=M.applyTransaction(shadow.core,{seq:2,status:'completed',month:1,releaseId:1,shopId:'bar',kind:'paid-procurement',count:5,revenueCents:5000});
 const r=readReleaseFacts(shadow,1),s=readStoreFacts(shadow,'bar',1);
 assert.equal(r.stock,47);assert.deepEqual(r.allocations,{bar:1});assert.equal(r.consumerSold,2);assert.deepEqual(r.retail,{count:0,revenue:0});assert.deepEqual(r.deliveries,{count:7,revenue:70});
 assert.equal(s.delivery.months,1);assert.equal(s.observedSales.bottles,2);assert.equal(s.unknownSaleReceipts,1);assert.equal(s.customerSalesComplete,false);
 assert.equal(r.routes[0].consumerSold,null);assert.equal(readReleaseFacts(shadow,2).stock,54);
 assert.equal(readReleaseFacts(shadow,999).status,'missing');assert.equal(readStoreFacts(shadow,'bar',999).status,'missing');
 const before=JSON.stringify(shadow);r.profile.wood=999;s.delivery.bottles=999;assert.equal(JSON.stringify(shadow),before);
});
test('ledger aggregates match native committed totals without inventing cross-brand month counts',()=>{
 const {native,shadow}=fixture();shadow.core=M.registerRelease(shadow.core,release(2,2));
 for(const [id,brandId] of [[1,1],[2,2]]){
  shadow.core=M.setContract(shadow.core,'town-liquor',brandId,0);
  shadow.core=M.applyTransaction(shadow.core,{seq:id,status:'completed',month:1,releaseId:id,shopId:'town-liquor',kind:'paid-procurement',count:5,revenueCents:5000});
  native.shop.relations.push({shopId:'town-liquor',brandId,startedMonth:0});native.shop.deliveries.push({id,shopId:'town-liquor',brandId,releaseId:id,productId:id+100,month:1,count:5,revenue:50});
 }
 const n=buildShopLedger(native).find(s=>s.id==='town-liquor'),a=storeLedgerAggregate(shadow,'town-liquor').value;
 assert.deepEqual(a,Object.fromEntries(Object.keys(a).map(k=>[k,n[k]])));assert(!('months' in a));
 const r=releaseLedgerAggregate(shadow,1);assert.equal(r.value.stock,49);assert.equal(r.value.deliveries.count,5);assert.equal(r.value.retail.count,0);assert(!('deliveryComplete' in r.value));
});
test('memory accessor copies only observed chosen dialogue and preserves cooldowns',()=>{
 const {shadow}=fixture(),entry={id:'actual:1',month:3,shopId:'bar',kind:'memory',key:'remember',releaseId:1,text:'recorded'};
 shadow.reader.chosen=[entry];shadow.reader.cooldowns={lastMonth:3,lastMemoryMonth:3,lastText:{'bar:remember':3}};
 const result=readMemoryFacts(shadow);assert.deepEqual(result.chosen,[entry]);assert.equal(result.cooldowns.lastText['bar:remember'],3);result.chosen[0].text='changed';assert.equal(shadow.reader.chosen[0].text,'recorded');assert.equal(readMemoryFacts(null).status,'missing');
});
