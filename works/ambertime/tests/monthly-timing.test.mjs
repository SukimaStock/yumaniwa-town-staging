import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {fill,advance} from './brands-helpers.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/monthly-timing-v20.json',import.meta.url)));
const ready=()=>D.enableMonthlyTiming(D.restoreDistillery(fixture.before));
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return raw;}
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('captured old staff-era month keeps exact original same-month shipping until the new boundary',()=>{
 assert.equal(fixture.source,'683167e70171791049a1c756d27ed42abaf2df5f');const before=D.restoreDistillery(fixture.before);assert.equal(cold(before),fixture.before);const after=D.tickDistillery(before);assert.equal(cold(after),fixture.after);assert.equal(createHash('sha256').update(fixture.after).digest('hex'),fixture.hash);assert.equal(after.automation.lastBottlings[0].month,19);assert.equal(after.automation.lastShipments[0].month,19);assert.equal(D.monthlyTimingMode(after),false);
});
test('monthly timing boundary preserves old funds, stock, chemistry and active extraction; first future listing month is explicit',()=>{
 let old=D.restoreDistillery(fixture.before),n=D.enableMonthlyTiming(old);for(const key of ['core','still','staff','staffProgression','automation','releases','brands','shop','generations'])assert.deepEqual(n[key],old[key]);for(const p of n.core.products.filter(p=>n.productsById[p.id]?.listed))assert.equal(n.productsById[p.id].listedMonth,old.core.month);assert.equal(D.enableMonthlyTiming(n),n);cold(n);
 old=D.startDistillation(D.newStaffProgressionDistillery(42));for(let i=0;i<37;i++)old=D.distillStep(old);n=D.enableMonthlyTiming(old);assert.deepEqual(n.still,old.still);assert.equal(n.operations.at(-1).value.progress,37);cold(n);assert(D.monthlyTimingMode(D.newMonthlyTimingDistillery(42)));assert.equal(D.monthlyTimingMode(D.newStaffProgressionDistillery(42)),false);
});
test('manual bottling/listing month is distinct from first retail/dispatch month and later listing keeps stored lots untouched',()=>{
 let s=ready(),id=s.core.casks.at(-1).id;s=D.cancelBottling(s,id);s=D.bottleBranded(s,id,{},10);const pid=s.result.productId,bottled=s.core.month;s=D.listBottles(s,pid);assert.equal(s.core.products.find(p=>p.id===pid).bottledMonth,bottled);assert.equal(s.productsById[pid].listedMonth,bottled);assert.equal(D.nearbyComparisonFacts(s,{productIds:[pid]}).products[0].firstSaleMonth,null);assert.equal(D.shopQuote(s,pid,'town-liquor').ok,false);assert.throws(()=>D.deliverShop(s,pid,1,'town-liquor'));s=advance(s,1);const f=D.nearbyComparisonFacts(s,{productIds:[pid]}).products[0];assert.equal(f.listedMonth,bottled);assert.equal(f.firstSaleMonth,bottled+1);assert(s.core.lastMonth.sales.some(x=>x.id===pid&&x.sold>0));assert(s.automation.lastShipments.filter(x=>x.productId===pid).every(x=>x.month>=bottled+1));cold(s);
 // Storage alone starts no sale period and never becomes listed by the clock.
 s=ready();id=s.core.casks.at(-1).id;s=D.cancelBottling(s,id);s=D.bottleBranded(s,id,{},10);const stored=s.result.productId;s=advance(s,2);assert.equal(s.core.products.find(p=>p.id===stored).stock,10);assert.equal(s.productsById[stored].listed,false);assert.equal(s.productsById[stored].listedMonth,undefined);const listed=s.core.month;s=D.listBottles(s,stored);assert.equal(s.productsById[stored].listedMonth,listed);s=advance(s,1);assert.equal(D.nearbyComparisonFacts(s,{productIds:[stored]}).products[0].firstSaleMonth,listed+1);cold(s);
});
test('automatic end-month bottling pays one fee and wage, then enters both retail and dispatch only next month',()=>{
 let s=ready(),cash=s.core.cash,cost=s.core.totals.costs;s=D.tickDistillery(s);const b=s.automation.lastBottlings[0],p=s.core.products.find(p=>p.id===b.productId);assert.equal(b.month,19);assert.equal(b.count,10);assert.equal(b.cost,30);assert.equal(b.salary,2);assert.equal(s.core.totals.costs,cost+32);close(s.core.cash,cash+s.core.lastMonth.revenue-s.core.lastMonth.upkeep-32);assert.equal(p.stock,10);assert.equal(p.sold,0);assert.equal(p.lastSold,0);assert.equal(p.bottledMonth,19);assert.equal(s.productsById[p.id].listedMonth,19);assert(!s.core.lastMonth.sales.some(x=>x.id===p.id));assert(!s.automation.lastShipments.some(x=>x.productId===p.id));cold(s);
 s=advance(s,1);const facts=D.nearbyComparisonFacts(s,{productIds:[p.id]}).products[0];assert.equal(facts.firstSaleMonth,20);assert.equal(facts.listedMonth,19);assert.equal(s.core.lastMonth.sales.filter(x=>x.id===p.id).reduce((n,x)=>n+x.sold,0),10);assert.equal(s.core.products.find(x=>x.id===p.id).stock,0);assert(s.automation.lastShipments.some(x=>x.productId===p.id&&x.month===20));const journal=s.core.journal.find(x=>x.month===20&&x.message.includes('：販売'));assert(journal.message.includes(`販売${s.core.lastMonth.bottles}本・収入${s.core.lastMonth.revenue}`));cold(s);s=advance(s,1);assert.equal(s.core.products.find(x=>x.id===p.id).lastSold,0);cold(s);
});
test('all current-month sales drive stock replenishment once at month end; new inventory never recursively sells or refills',()=>{
 let s=ready(),id=s.core.casks.at(-1).id;s=D.cancelBottling(s,id);s=D.bottleBranded(s,id,{},10);const original=s.result.productId;s=D.listBottles(s,original);s=D.reserveBottling(s,id,{mode:'stock',threshold:5,count:10});const costs=s.core.totals.costs;
 s=advance(s,1);assert.equal(s.core.products.find(p=>p.id===original).stock,0);assert.equal(s.automation.lastBottlings.length,1);const b=s.automation.lastBottlings[0];assert.equal(s.core.products.find(p=>p.id===b.productId).stock,10);assert(!s.core.lastMonth.sales.some(x=>x.id===b.productId));assert.equal(s.core.totals.costs,costs+32);const raw=cold(s);const again=advance(D.restoreDistillery(raw),1);s=advance(s,1);assert.equal(cold(again),cold(s));assert.equal(s.automation.lastBottlings.length,1);assert.equal(s.core.products.find(p=>p.id===b.productId).stock,0);const next=s.automation.lastBottlings[0];assert.notEqual(next.productId,b.productId);assert.equal(next.month,b.month+1);assert.equal(s.core.products.find(p=>p.id===next.productId).stock,10);assert.equal(s.core.totals.costs,costs+64);assert(!s.automation.lastShipments.some(x=>x.productId===next.productId));cold(s);
});
test('listing dates, monthly boundary and sales receipt mutations cannot bypass strict restoration',()=>{
 let s=D.tickDistillery(ready()),pid=s.automation.lastBottlings[0].productId;for(const edit of [x=>x.productsById[pid].listedMonth--,x=>x.monthlyTiming.version=0,x=>x.operations.splice(x.operations.findIndex(o=>o.key==='enable-monthly-timing'),1),x=>x.core.lastMonth.month--,x=>x.automation.lastBottlings[0].month--]){const bad=structuredClone(s);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}cold(s);
});


test('new monthly ordering preserves paid residual bottling, pause/cancel/resume and zero/cash failure boundaries',()=>{
 let s=fill(D.newMonthlyTimingDistillery(42),{progress:65}),id=s.core.casks[0].id;s=D.bottleBranded(s,id,{},1);s=D.hireBottlingStaff(s);s=D.bottleBranded(s,id,{},D.quote(s,id).count-8);s=D.reserveBottling(s,id,{mode:'stock',threshold:5,count:10});const initialCosts=s.core.totals.costs;s=D.pauseBottling(s,id);s=advance(s,1);assert.equal(s.automation.lastBottlings.length,0);assert.equal(s.core.totals.costs,initialCosts);s=D.cancelBottling(s,id);assert.equal(D.bottlingReservation(s,id),null);s=D.reserveBottling(s,id,{mode:'stock',threshold:5,count:10});const before=structuredClone(s);s=advance(s,1);const b=s.automation.lastBottlings[0];assert.equal(b.count,8);assert.equal(b.cost,24);assert.equal(b.salary,2);assert.equal(s.core.totals.costs,initialCosts+26);assert.equal(s.core.casks.length,0);assert.equal(s.core.products.find(p=>p.id===b.productId).sold,0);const residual=s.core.archive.find(c=>c.id===id).litres;assert(residual>=0&&residual<.7);cold(s);
 let resumed=D.pauseBottling(before,id);resumed=D.pauseBottling(resumed,id,false);resumed=advance(resumed,1);assert.deepEqual(resumed.core,s.core);cold(resumed);
 // Unit-only malformed-input edges, never saved/restored as legitimate progress.
 const poor=structuredClone(before);poor.core.cash=25;const stopped=D.tickDistillery(poor);assert.equal(stopped.core.cash,25);assert.equal(stopped.core.totals.costs,initialCosts);assert.equal(stopped.automation.lastBottlings.length,0);assert(stopped.decisions.some(d=>d.eventId==='funds'));
 const zero=structuredClone(before);zero.core.casks[0].litres=.69;const ended=D.tickDistillery(zero);assert.equal(ended.automation.lastBottlings.length,0);assert.equal(ended.core.totals.costs,initialCosts);assert.equal(D.bottlingReservation(ended,id).lastError,'原酒不足');assert.equal(ended.core.casks.length,0);
});


function departmentBoundaryFixture(){
 let s=D.enableMonthlyTiming(D.restoreDistillery(fixture.after)),p=s.core.products.find(p=>!s.shop.deliveries.some(d=>d.productId===p.id)),r=s.releases.find(r=>r.productId===p.id);s.core.month=300;s.core.lastMonth.month=300;for(const c of s.core.casks)c.filledMonth=s.core.month-c.age;s.generations.active.startedMonth=0;s.generations.active.phase='working';s.core.cash=2000;p.stock=p.originalStock;p.sold=0;p.revenue=0;p.lastSold=0;p.lastRevenue=0;p.bottledMonth=299;p.batchMonth=275;p.age=24;p.roughness=.1;r.age=24;r.profile.roughness=.1;r.sold=0;r.delivered=0;r.revenue=0;s.productsById[p.id].listedMonth=299;s.shop.relations.push({shopId:'department',brandId:1,name:'町のデパート',startedMonth:0});s.shop.offer={id:99,shopId:'department',name:'町のデパート',brandId:1,month:300,projectId:'department-select-whisky',projectName:'特選ウイスキー',sourceReleaseId:r.id,selectionId:'generation-queue-test'};return {s,pid:p.id};
}

test('a queued department approval does not impersonate a prior delivery at the generation boundary',()=>{
 // Focused boundary injection avoids a broad 300-month career replay. The
 // normal department queue/save path is independently exercised with lawful data.
 const setup=departmentBoundaryFixture();let s=setup.s;const p=s.core.products.find(p=>p.id===setup.pid);const previousDelivery=s.shop.deliveries.at(-1).id;
 s=D.acceptShopDelivery(s,p.id,5,'department',99);assert.equal(s.operations.at(-1).key,'department-accept-queue');assert.equal(s.generations.active.phase,'working');assert.equal(s.generations.active.trigger,null);assert.equal(s.shop.deliveries.at(-1).id,previousDelivery);s=D.tickDistillery(s);const actual=s.shop.deliveries.find(d=>d.shopId==='department');assert.equal(actual.month,301);assert.equal(actual.count,5);assert.equal(s.generations.active.trigger.kind,'long-shop-delivery');assert.equal(s.generations.active.trigger.deliveryId,actual.id);assert.notEqual(actual.id,previousDelivery);const trigger=structuredClone(s.generations.active.trigger);s=D.tickDistillery(s);assert.equal(s.shop.deliveries.filter(d=>d.shopId==='department').length,1);assert.deepEqual(s.generations.active.trigger,trigger);
});


test('a pending department promise holds one delivery-ledger slot until settlement or cancellation',()=>{
 const setup=departmentBoundaryFixture();let s=setup.s;const pid=setup.pid,template=structuredClone(s.shop.deliveries.at(-1));s.shop.deliveries=Array.from({length:D.SHOP.maxDeliveries-1},(_,i)=>({...structuredClone(template),id:i+1,month:299,count:1}));
 s=D.acceptShopDelivery(s,pid,5,'department',99);assert.equal(s.shop.deliveries.length,D.SHOP.maxDeliveries-1);assert.equal(D.shopQuote(s,pid,'town-liquor').ok,false);const raw=JSON.stringify(s);assert.throws(()=>D.deliverShop(s,pid,1,'town-liquor'));assert.equal(JSON.stringify(s),raw);
 const cancelled=D.cancelDepartmentInterest(s,'generation-queue-test');assert(D.shopQuote(cancelled,pid,'town-liquor').ok);const normal=D.deliverShop(cancelled,pid,1,'town-liquor');assert.equal(normal.shop.deliveries.length,D.SHOP.maxDeliveries);
 s=D.tickDistillery(s);assert.equal(s.shop.deliveries.length,D.SHOP.maxDeliveries);assert.equal(s.shop.deliveries.at(-1).shopId,'department');assert.equal(s.shop.deliveries.at(-1).count,5);assert.equal(s.department.interests.length,0);assert.equal(s.automation.lastShipments.filter(d=>d.shopId==='department').length,1);assert.equal(s.automation.lastShipments.filter(d=>d.shopId!=='department').length,0);
});
