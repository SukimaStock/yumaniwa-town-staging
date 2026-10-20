import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalShopOrders,planShopFulfillment,normalShopUnitPrice} from '../shop-demand.mjs';
const old=JSON.parse(fs.readFileSync(new URL('./fixtures/shop-demand-legacy.json',import.meta.url)));
const fresh=()=>JSON.parse(old.before);
// Pure projection edges only; these objects are never serialized as legal games.
function fixture(stock=20){const s=fresh(),p=s.core.products.at(-1),r=s.releases.at(-1);s.shop.relations.push({shopId:'supermarket',brandId:1,startedMonth:16});p.age=r.age=12;p.stock=stock;r.profile.roughness=p.roughness=.2;return {s,p,r};}
const order=(shopId,count,month=17)=>({shopId,month,count});
test('store/month demand is deterministic, pure, bounded, can be zero and survives sold-out product pruning',()=>{
 const {s,p}=fixture(),raw=JSON.stringify(s);const first=normalShopOrders(s,17);assert.deepEqual(normalShopOrders(s,17),first);assert.equal(JSON.stringify(s),raw);
 const months=Array.from({length:72},(_,i)=>normalShopOrders(s,i+17)).flat();for(const o of months){assert(o.count>=0&&o.count<=(o.shopId==='supermarket'?20:10));assert(o.count===0||o.count>=(o.shopId==='supermarket'?10:1));}assert(months.some(o=>o.reason==='zero-demand'));
 const before=normalShopOrders(s,17);s.core.products=[];assert.deepEqual(normalShopOrders(s,17),before);assert.equal(normalShopUnitPrice(s,p.id,'supermarket'),before.find(o=>o.shopId==='supermarket').unitPrice);
});
test('approval and catalog eligibility use prior month; stored bottles are excluded',()=>{
 let {s,r,p}=fixture();assert.equal(normalShopOrders(s,16).length,0);assert(normalShopOrders(s,17).length===2);
 for(const x of s.releases){x.listed=false;s.productsById[x.productId].listed=false;}assert(normalShopOrders(s,17).every(o=>o.count===0));assert.equal(planShopFulfillment(s,17,order('supermarket',20)).planned,0);
 r.listed=true;s.productsById[p.id].listed=true;s.productsById[p.id].listedMonth=17;assert(normalShopOrders(s,17).every(o=>o.count===0));assert.equal(planShopFulfillment(s,17,order('supermarket',20)).planned,0);assert(normalShopOrders(s,18).some(o=>o.profileProductId===p.id));
});
test('minimum10 applies per release; stock9 or separate5+5 cannot fill an order',()=>{
 let {s,p,r}=fixture(9);assert.equal(planShopFulfillment(s,17,order('supermarket',20)).planned,0);p.stock=10;assert.equal(planShopFulfillment(s,17,order('supermarket',20)).planned,10);
 p.stock=5;const q={...structuredClone(p),id:99,stock:5};s.core.products.push(q);s.releases.push({...structuredClone(r),id:99,productId:99});s.productsById[99]={...s.productsById[p.id]};assert.equal(planShopFulfillment(s,17,order('supermarket',10)).planned,0);
 p.stock=6;q.stock=14;const a=planShopFulfillment(s,17,order('supermarket',20));assert.equal(a.planned,14);assert.equal(a.unmet,6);assert(a.shipments.every(x=>x.count>=10));
});
test('zero demand, department holds and previous shipments cannot exceed shared stock, order or capacity',()=>{
 const {s,p}=fixture(20);assert.equal(planShopFulfillment(s,17,order('supermarket',0)).planned,0);const a=planShopFulfillment(s,17,order('supermarket',20),{heldCounts:{[p.id]:5}});assert.equal(a.planned,15);assert.equal(a.unmet,5);
 s.shop.deliveries.push({shopId:'supermarket',month:17,count:15});const repeat=planShopFulfillment(s,17,order('supermarket',20));assert.equal(repeat.planned,0);assert.equal(repeat.unmet,5);
 s.shop.deliveries.push({shopId:'town-liquor',month:17,count:2});const liquor=planShopFulfillment(s,17,order('town-liquor',3));assert.equal(liquor.planned,1);assert.equal(liquor.unmet,0);
});
test('retail price tier does not alter the paid store price or create a second order per release',()=>{
 const {s,p,r}=fixture();const before=normalShopOrders(s,17);p.price*=1.24;s.productsById[p.id].selectedPrice='high';assert.deepEqual(normalShopOrders(s,17),before);
 s.releases.splice(s.releases.length-1,0,{...structuredClone(r),id:r.id-1,productId:88});s.productsById[88]={...s.productsById[p.id]};assert.deepEqual(normalShopOrders(s,17),before);
});
test('existing monthly notice reports zero orders and distinguishes unshipped demand without a second sale',async()=>{
 const {automaticEvents,noticeText,transientNotices}=await import('../event-notices.mjs');
 const before=fresh(),after=structuredClone(before);after.core.month++;after.core.lastMonth={bottles:0,revenue:0};after.shopDemand={lastOrders:[{requested:0,shipped:0,unmet:0}]};
 const zero=automaticEvents(before,after);assert.equal(zero.filter(e=>e.kind==='orders').length,1);assert.match(noticeText(zero),/注文 0本 · 発送 0本/);
 after.shopDemand.lastOrders=[{requested:12,shipped:10,unmet:2}];const events=automaticEvents(before,after);assert.match(noticeText(events),/注文 12本 · 発送 10本 · 未発送 2本/);assert.equal(events.filter(e=>e.kind==='sales').length,0);
 let shows=0;const notices=transientNotices({show(){shows++;},hide(){},setTimer(){return 1;},clearTimer(){}});notices.push(events);notices.push(events);assert.equal(shows,1);
});
