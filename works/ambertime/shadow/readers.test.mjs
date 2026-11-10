import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../partner-orders.mjs';
import {advance,resolve,fill} from '../tests/brands-helpers.mjs';
import {shopDialogueHistory} from '../shop-dialogue.mjs';
import {createShadow,advanceShadow} from './adapter.mjs';
import {createReader,updateReader,readReader,compareReader} from './readers.mjs';
const raw=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/placement-established-six.json',import.meta.url))).raw;
function replay(s){let reader=createReader(),previous=null,shadow=null;D.replayDistilleryOperations(s,({index,after})=>{const next={...after,operations:s.operations.slice(0,index+1)};if(shadow)shadow=advanceShadow(shadow,previous,next);else if(next.releases&&next.shop)shadow=createShadow(next);reader=updateReader(reader,previous,next);assert.equal(compareReader(reader,next).allEqual,true,JSON.stringify(compareReader(reader,next).checks));previous=next;});assert(shadow?.commits>0);assert.equal(shadow.core.identities?Object.keys(shadow.core.identities).length:0,s.releases.length);return reader;}
test('actual native replay compares all four shops without retaining delivery arrays',()=>{const s=D.restoreDistillery(raw),m=replay(s);assert.equal(m.receiptCursor,s.shop.deliveries.length);assert(!JSON.stringify(m).includes('"deliveries"'));assert.deepEqual(readReader(JSON.parse(JSON.stringify(m))),readReader(m));});
test('actual shelf sales and month closure preserve four-store candidate and remark parity',()=>{let s=D.enableShopDialogue(D.enableAlleyBar(D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(raw)))));let m=replay(s);const commit=next=>{m=updateReader(m,s,next);s=next;assert.equal(compareReader(m,s).allEqual,true,JSON.stringify(compareReader(m,s).checks));};commit(D.assignStoreProduct(s,{productId:s.result.productId,shopId:'town-liquor',count:5}));for(let i=0;i<14;i++){while(s.decisions.length){const d=s.decisions[0];const o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');commit(D.chooseDistillery(s,d.caskId,o.id));}if(s.trade.offer)commit(D.declineOffer(s));commit(D.tickDistillery(s));}assert(m.receiptCursor>0);});
test('actual selected native dialogue is frozen rather than inferred from totals',()=>{let s=D.enableShopDialogue(D.enableAlleyBar(D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(raw)))));s=advance(s,36);const chosen=shopDialogueHistory(s);assert(chosen.length);let m=replay(s);m=updateReader(m,s,s,{chosenDialogue:chosen});assert.deepEqual(m.chosen,chosen);assert.deepEqual(updateReader(m,s,s,{chosenDialogue:chosen}).chosen,chosen);assert.throws(()=>updateReader(m,s,s,{chosenDialogue:[{...chosen[0],text:'changed'}]}),/changed/);});

test('isolated proof boundaries: same-month excluded, supermarket start strict, department exact adoption required',()=>{
 // Detached boundary fixture; not a lawful gameplay or save fixture.
 const source=()=>({core:{month:0},operations:[{key:'enable-shop-dialogue',value:{version:2,boundaryMonth:0}}],brands:[{id:1}],releases:[{id:1,productId:10,brandId:1,bottledMonth:0,profile:{roughness:.2,wood:.4,character:.5}}],shop:{deliveries:[],relations:[{shopId:'supermarket',brandId:1,startedMonth:0},{shopId:'bar',brandId:1,startedMonth:0}],pendingOffers:[]},storeMarket:{startedMonth:0},alleyBar:{version:1,boundaryMonth:0},department:{adoptions:[],interests:[]}});
 let s=source(),m=updateReader(createReader(),null,s);
 const commit=n=>{m=updateReader(m,s,n);s=n;assert.equal(compareReader(m,s).allEqual,true,JSON.stringify(compareReader(m,s).checks));};
 for(const sid of ['town-liquor','supermarket','bar','department']){const n=structuredClone(s);n.shop.deliveries.push({id:n.shop.deliveries.length+1,month:0,shopId:sid,brandId:1,releaseId:1,productId:10,count:5});commit(n);}
 let n=structuredClone(s);n.core.month=1;commit(n);
 assert.equal(readReader(m).shops.find(x=>x.shopId==='department').candidates.daily.length,0);
 n=structuredClone(s);const d={id:5,month:1,shopId:'department',brandId:1,releaseId:1,productId:10,count:5,selectionId:7,projectId:'p',sourceReleaseId:1};n.shop.deliveries.push(d);n.department.adoptions.push({...d,deliveryId:d.id});commit(n);
 assert.equal(readReader(m).shops.find(x=>x.shopId==='department').candidates.daily.length,0);
 n=structuredClone(s);n.core.month=2;commit(n);
 assert(readReader(m).shops.find(x=>x.shopId==='department').candidates.daily.some(x=>x.key==='five'));
 n=structuredClone(s);const invalid={...d,id:6,month:2,selectionId:8};n.shop.deliveries.push(invalid);n.department.adoptions.push({...invalid,deliveryId:6,sourceReleaseId:999});commit(n);
 n=structuredClone(s);n.core.month=3;commit(n);assert.equal(m.closed.department.total.count,1);
});
function gentleFill(s){s=resolve(s);s=D.startRangeDistillation(s);while(s.still.distillation.progress<40)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<65)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),'refill');}
test('lawful bar customer sale replay preserves candidates',()=>{let s=D.enableShopDialogue(D.enableAlleyBar(D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(raw)))));for(let i=0;i<24&&s.shop.offer?.shopId!=='bar';i++)s=advance(s,1);assert.equal(s.shop.offer?.shopId,'bar');s=D.acceptShop(s,'bar',s.shop.offer.id);s=D.assignStoreProduct(s,{productId:s.result.productId,shopId:'bar',count:5});s=advance(s,24);assert(s.shop.deliveries.some(d=>d.shopId==='bar'));replay(s);});
test('lawful supermarket customer sale and department adoption replay',()=>{
 let s=D.enableShopDialogue(D.enableAlleyBar(D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(raw)))));
 s=D.setMarketRetail(s,{productId:s.result.productId,count:6});s=advance(s,2);s=gentleFill(s);const cid=s.core.casks.at(-1).id;s=advance(s,12);s=D.bottleBranded(s,cid,{},40);s=D.setMarketRetail(s,{productId:s.result.productId,count:40});
 for(let i=0;i<24&&s.shop.offer?.shopId!=='supermarket';i++){if(s.shop.offer?.shopId==='bar')s=D.acceptShop(s,'bar',s.shop.offer.id);s=advance(s,1);}assert.equal(s.shop.offer?.shopId,'supermarket');s=D.acceptShop(s,'supermarket',s.shop.offer.id);s=D.bottleBranded(s,cid,{},5);s=D.assignStoreProduct(s,{productId:s.result.productId,shopId:'supermarket',count:3});s=advance(s,12);assert(s.shop.deliveries.some(d=>d.shopId==='supermarket'));replay(s);
 s=gentleFill(s);const mature=s.core.casks.at(-1).id;s=advance(s,24);s=D.bottleBranded(s,mature,{},12);const id=s.result.productId;s=D.setMarketRetail(s,{productId:id,count:1});s=advance(s,1);assert.equal(s.shop.offer?.shopId,'department');s=D.acceptShopDelivery(s,id,5,'department',s.shop.offer.id);s=advance(s,2);assert(s.department.adoptions.length);replay(s);
});

test('native eight-active limit and automatic bottling after an old product sale',()=>{
 let s=fill(D.newBottlingPolicyDistillery(42),{progress:65,type:"refill"}),cid=s.core.casks[0].id;
 for(let i=0;i<8;i++)s=D.bottleBranded(s,cid,{},1);
 assert.equal(s.core.products.filter(p=>p.stock>0).length,8);
 assert.throws(()=>D.bottleBranded(s,cid,{},1));
 s=D.hireBottlingStaff(s);s=D.setBottlingPolicy(s,{mode:'age',age:1,count:3});s=D.delegateBottling(s,cid);
 const oldId=s.releases[0].productId;s=D.listBottles(s,oldId);
 let soldThenBottled=false;
 for(let i=0;i<6&&!soldThenBottled;i++){
  const before=s;s=advance(s,1);
  soldThenBottled=s.automation.lastBottlings.length>0&&s.core.lastMonth.sales.some(x=>x.id===oldId&&x.sold>0);
  if(s.automation.lastBottlings.length){assert(before.core.products.some(p=>p.id===oldId&&p.stock>0));assert(soldThenBottled);}
 }
 assert(soldThenBottled);assert.equal(s.releases.length,9);assert(s.core.products.filter(p=>p.stock>0).length<=8);replay(s);
});
