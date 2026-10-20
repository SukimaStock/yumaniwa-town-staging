// Independent, focused monthly ordering checks using ordinary recorded game operations.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {fill,advance} from './brands-helpers.mjs';
const round=x=>Math.round(x*100)/100;
const fresh=()=>D.newMonthlyTimingDistillery(42);
function listLow(s,id){s=D.setSalePrice(s,'low',id);return s.productsById[id].listed?s:D.listBottles(s,id);}
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return D.restoreDistillery(raw);}
function completeStaff(s){for(let steps=0;s.usual.reservation?.status==='active';steps++){assert(steps<100);s=D.distillStep(s);}return s;}
let offerFixture;
function townOffer(){
 if(offerFixture)return structuredClone(offerFixture);
 let s=advance(fill(fresh(),{progress:65}),12),id=s.core.casks[0].id;
 for(let portion=0;portion<3;portion++){s=D.bottleBranded(s,id,{},14);s=listLow(s,s.result.productId);s=advance(s,1);assert.equal(s.core.totals.bottlesSold,(portion+1)*14);assert.equal(s.shop.offer,null,'sales reaching eligibility this month do not create an immediate offer');}
 s=advance(s,1);assert.equal(s.core.month,16);assert.equal(s.shop.offer?.shopId,'town-liquor');assert.equal(s.shop.offer.month,16);offerFixture=structuredClone(s);return s;
}

test('manual and commissioned fills start at age zero and age once on the following month with unchanged wages',()=>{
 let s=fill(fresh(),{progress:65});const manual=s.core.casks[0];assert.equal(s.core.month,0);assert.equal(manual.age,0);assert.equal(manual.filledMonth,0);s=D.hireStaff(s);s=advance(s,1);assert.equal(s.core.casks.find(c=>c.id===manual.id).age,1);
 const before=s.core.cash,costs=s.core.totals.costs;s=D.reserveStaff(s,manual.id,'once');s=completeStaff(D.beginUsual(s));const commissioned=s.core.casks.at(-1);assert.equal(s.core.month,1);assert.equal(commissioned.age,0);assert.equal(commissioned.filledMonth,1);assert.equal(s.core.cash,before-232);assert.equal(s.core.totals.costs,costs+232);s=cold(s);s=advance(s,1);assert.equal(s.core.casks.find(c=>c.id===commissioned.id).age,1);assert.equal(s.core.casks.find(c=>c.id===manual.id).age,2);assert.equal(s.core.totals.costs,costs+232);cold(s);
});

test('settled retail depletion triggers paid stock refill at month end; the new lot first sells next month',()=>{
 let s=advance(fill(fresh(),{progress:65}),12),id=s.core.casks[0].id;s=D.bottleBranded(s,id,{},1);s=D.hireBottlingStaff(s);s=D.bottleBranded(s,id,{},10);const original=s.result.productId;s=listLow(s,original);s=D.reserveBottling(s,id,{mode:'stock',threshold:5,count:10});const before=s.core.cash,costs=s.core.totals.costs;
 s=advance(s,1);assert.equal(s.core.month,13);assert.equal(s.core.products.find(p=>p.id===original).stock,0);const refill=s.automation.lastBottlings[0],newLot=s.core.products.find(p=>p.id===refill.productId);assert.equal(refill.month,13);assert.equal(refill.count,10);assert.equal(refill.cost,30);assert.equal(refill.salary,2);assert.equal(newLot.bottledMonth,13);assert.equal(newLot.stock,10);assert.equal(newLot.sold,0);assert.equal(newLot.revenue,0);assert.equal(s.automation.lastShipments.filter(x=>x.productId===newLot.id).length,0);assert.equal(s.core.totals.costs,costs+32);assert.equal(s.core.cash,round(before+s.core.lastMonth.revenue-s.core.lastMonth.upkeep-32));s=cold(s);
 s=listLow(s,newLot.id);s=advance(s,1);assert.equal(s.core.products.find(p=>p.id===newLot.id).sold,10);assert.equal(s.automation.lastBottlings.length,1);assert.notEqual(s.automation.lastBottlings[0].productId,newLot.id);assert.equal(s.core.products.at(-1).sold,0);assert.equal(s.core.totals.costs,costs+64);cold(s);
});

test('offers use prior sales and a shop approved this month first receives the following month',()=>{
 let s=townOffer();const o=structuredClone(s.shop.offer),month=s.core.month,cash=s.core.cash,deliveries=s.shop.deliveries.length;s=D.acceptShop(s,o.shopId,o.id);assert.equal(s.core.cash,cash);assert.equal(s.shop.deliveries.length,deliveries);assert.equal(s.shop.relations.at(-1).startedMonth,month);
 s=fill(s,{progress:65});const id=s.core.casks.at(-1).id;s=D.bottleBranded(s,id,{},20);const pid=s.result.productId;s=listLow(s,pid);assert.equal(s.core.products.find(p=>p.id===pid).sold,0);assert.equal(s.shop.deliveries.length,deliveries);s=cold(s);
 s=advance(s,1);const ships=s.automation.lastShipments.filter(x=>x.productId===pid);assert.equal(s.core.month,month+1);assert.equal(ships.length,1);assert.equal(ships[0].shopId,'town-liquor');assert.equal(ships[0].month,month+1);assert.equal(ships[0].count,10);assert.equal(s.core.products.find(p=>p.id===pid).stock,7);assert.equal(s.core.lastMonth.sales.filter(x=>x.id===pid&&!x.channel).reduce((n,x)=>n+x.sold,0),3);cold(s);
});

test('a department approval holds exactly five of the selected lot and settles once next month with saved frozen price',()=>{
 let s=townOffer(),o=s.shop.offer;s=D.acceptShop(s,o.shopId,o.id);const oldCask=s.core.casks[0].id;s=D.bottleBranded(s,oldCask,{});s=advance(fill(s,{progress:65,type:'bourbon'}),24);const parent=s.core.casks.at(-1).id;s=D.bottleBranded(s,parent,{},15);const pid=s.result.productId,releaseId=s.result.releaseId,month=s.core.month;assert.equal(s.shop.offer?.shopId==='department',false,'newly bottled facts do not create an immediate department offer');
 s=advance(s,1);o=s.shop.offer;assert.equal(o?.shopId,'department');assert.equal(o.sourceReleaseId,releaseId);assert.equal(o.month,month+1);assert.equal(D.shopOfferQuote(s,pid,'department').ok,false,'stored bottles cannot be approved for delivery');const unlisted=JSON.stringify(s);assert.throws(()=>D.acceptShopDelivery(s,pid,5,'department',o.id));assert.equal(JSON.stringify(s),unlisted);
 s=listLow(s,pid);const q=D.shopOfferQuote(s,pid,'department'),cash=s.core.cash,stock=s.core.products.find(p=>p.id===pid).stock,history=s.shop.deliveries.length;assert(q.ok,q.reason);
 s=D.acceptShopDelivery(s,pid,5,'department',o.id);const pending=s.department.interests.find(x=>x.selectionId===o.selectionId)?.pendingDelivery;assert(pending);assert.equal(pending.productId,pid);assert.equal(pending.count,5);assert.equal(pending.approvedMonth,month+1);assert.equal(pending.dueMonth,month+2);assert.equal(pending.unitPrice,q.unitPrice);assert.equal(s.core.cash,cash);assert.equal(s.core.products.find(p=>p.id===pid).stock,stock);assert.equal(s.shop.deliveries.length,history);assert.equal(s.department.adoptions.length,0);
 // Cancelling the saved promise releases all five bottles for ordinary channels, without an adoption.
 let cancelled=cold(D.cancelDepartmentInterest(s,o.selectionId));cancelled=advance(cancelled,1);assert.equal(cancelled.core.products.find(p=>p.id===pid).stock,0);assert.equal(cancelled.shop.deliveries.filter(x=>x.selectionId===o.selectionId).length,0);assert.equal(cancelled.department.adoptions.length,0);cold(cancelled);
 // Another portion of the same parent is not the selected release. Leave it stored; changing retail price does not change the promise.
 s=D.bottleBranded(s,parent,{},5);const other=structuredClone(s.core.products.at(-1));assert.notEqual(other.id,pid);s=D.setSalePrice(s,'high',pid);assert.equal(s.department.interests.find(x=>x.selectionId===o.selectionId).pendingDelivery.unitPrice,q.unitPrice);s=cold(s);const before=s.core.cash,revenues=s.core.totals.revenue;
 s=advance(s,1);const delivery=s.shop.deliveries.find(x=>x.selectionId===o.selectionId);assert(delivery);assert.equal(delivery.productId,pid);assert.equal(delivery.releaseId,releaseId);assert.equal(delivery.month,month+2);assert.equal(delivery.count,5);assert.equal(delivery.unitPrice,q.unitPrice);assert.equal(delivery.revenue,round(q.unitPrice*5));assert.equal(s.department.adoptions.filter(x=>x.selectionId===o.selectionId).length,1);assert.equal(s.department.interests.some(x=>x.selectionId===o.selectionId),false);assert.deepEqual(s.core.products.find(p=>p.id===other.id),other);assert.equal(s.productsById[other.id].listed,false);
 const selected=s.core.products.find(p=>p.id===pid),retail=s.core.lastMonth.sales.filter(x=>x.id===pid&&!x.channel).reduce((n,x)=>n+x.sold,0),normal=s.automation.lastShipments.filter(x=>x.productId===pid&&x.shopId!=='department').reduce((n,x)=>n+x.count,0);assert.equal(selected.stock+retail+normal+5,stock);assert(retail+normal<=stock-5);assert.equal(s.core.cash,round(before+s.core.lastMonth.revenue-s.core.lastMonth.upkeep));assert.equal(s.core.totals.revenue,round(revenues+s.core.lastMonth.revenue));s=cold(s);
 s=advance(s,1);assert.equal(s.shop.deliveries.filter(x=>x.selectionId===o.selectionId).length,1);assert.equal(s.department.adoptions.filter(x=>x.selectionId===o.selectionId).length,1);cold(s);
});
