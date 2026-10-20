// Focused v0.21.2 economics: experience unlocks do not change the underlying production loop.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {fill,advance} from './brands-helpers.mjs';
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
function balance(s){close(s.core.cash,1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep);assert(s.core.cash>=0);}
function exact(s){const text=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(text)),text);balance(s);return s;}
function listLow(s,id){s=D.setSalePrice(s,'low',id);return s.productsById[id].listed?s:D.listBottles(s,id);}
function completeStaff(s){assert.equal(s.usual.reservation.status,'active');for(let step=0;s.usual.reservation?.status==='active';step++){assert(step<100);s=D.distillStep(s);}return s;}
function firstSale(){let s=advance(fill(D.newStaffProgressionDistillery(42),{progress:65}),6),id=s.core.casks[0].id;s=D.bottleBranded(s,id,{},10);const first=s.result.productId;s=listLow(s,first);s=D.bottleBranded(s,id,{});s=listLow(s,s.result.productId);return advance(s,6);}
let savedHiredCareer=null;
function hiredCareer(){
 if(savedHiredCareer)return structuredClone(savedHiredCareer);
 let s=firstSale();assert.equal(s.core.cash,1869);const source=D.manualRecipeSources(s).at(-1).caskId;
 s=D.hireBottlingStaff(D.hireStaff(s));assert.equal(s.core.cash,1809);const cash=[s.core.cash];
 for(let round=0;round<2;round++){
  const before=s.core.cash,oldCosts=s.core.totals.costs;s=D.reserveStaff(s,source,'once');assert.equal(s.core.cash,before);s=completeStaff(D.beginUsual(s));assert.equal(s.core.cash,before-232);assert.equal(s.core.totals.costs,oldCosts+232);
  const id=s.core.casks.at(-1).id;s=D.reserveBottling(s,id,{mode:'age',age:6,count:10});s=advance(s,6);const receipt=s.automation.lastBottlings[0];assert.equal(receipt.count,10);assert.equal(receipt.cost,30);assert.equal(receipt.salary,2);assert.equal(s.result.bottlingCost,30);s=listLow(s,s.result.productId);s=D.bottleBranded(s,id,{});s=listLow(s,s.result.productId);s=advance(s,6);cash.push(s.core.cash);exact(s);
 }
 savedHiredCareer=structuredClone(s);return s;
}

test('three manual production-sale cycles need no hire and preserve the previous cash loop',()=>{
 let s=D.newStaffProgressionDistillery(42);const cash=[];
 for(let round=0;round<3;round++){
  s=advance(fill(s,{progress:65}),6);const id=s.core.casks.at(-1).id;s=D.bottleBranded(s,id,{},10);s=listLow(s,s.result.productId);s=D.bottleBranded(s,id,{});s=listLow(s,s.result.productId);s=advance(s,6);cash.push(s.core.cash);exact(s);
 }
 assert.deepEqual(cash,[1869,2138,2407]);assert.equal(s.core.totals.revenue,2160);assert.equal(s.core.totals.costs,1065);assert.equal(s.core.totals.upkeep,288);assert.equal(s.core.totals.bottlesSold,135);assert(!s.staff.hired);assert(!D.bottlingStaffStatus(s).hired);assert(D.canStart(s).ok);
});

test('both hires and two delegated cycles remain funded, with exactly one salary per completed job',()=>{
 const s=hiredCareer();assert.equal(s.core.cash,2319);assert.equal(s.core.totals.revenue,2160);assert.equal(s.core.totals.costs,1153);assert.equal(s.core.totals.upkeep,288);assert.equal(s.core.totals.bottlesSold,135);assert(D.canStart(s).ok);assert(s.staff.hired);assert(D.bottlingStaffStatus(s).hired);assert.equal(s.core.products.reduce((n,p)=>n+p.stock,0),0);assert.equal(s.core.casks.length,0);exact(s);
 const cash=s.core.cash,costs=s.core.totals.costs;assert.throws(()=>D.hireStaff(s));assert.throws(()=>D.hireBottlingStaff(s));assert.equal(s.core.cash,cash);assert.equal(s.core.totals.costs,costs);
});

test('waiting, pausing, cancellation and an insufficient-volume attempt never charge a bottling salary',()=>{
 let s=advance(fill(D.newStaffProgressionDistillery(42),{progress:65}),1);const id=s.core.casks[0].id;s=D.bottleBranded(s,id,{},1);s=D.hireBottlingStaff(s);const costs=s.core.totals.costs;
 s=D.reserveBottling(s,id,{mode:'age',age:3,count:10});s=advance(s,1);assert.equal(s.core.totals.costs,costs);assert.equal(s.automation.lastBottlings.length,0);
 s=D.pauseBottling(s,id);const cash=s.core.cash;s=advance(s,1);assert.equal(s.core.totals.costs,costs);assert.equal(s.core.cash,cash-12);assert.equal(s.automation.lastBottlings.length,0);s=D.cancelBottling(s,id);assert.equal(s.core.totals.costs,costs);
 s=D.reserveBottling(s,id,{mode:'age',age:3,count:57});s=advance(s,1);assert.equal(s.core.totals.costs,costs);assert.equal(s.automation.lastBottlings.length,0);assert.equal(D.bottlingReservation(s,id).lastError,'原酒不足');s=D.cancelBottling(s,id);
 s=D.reserveBottling(s,id,{mode:'age',age:4,count:10});const before=s.core.cash;s=advance(s,1);assert.equal(s.core.cash,before-12-30-2);assert.equal(s.core.totals.costs,costs+32);assert.equal(s.automation.lastBottlings.length,1);assert.equal(s.automation.lastBottlings[0].salary,2);const afterCosts=s.core.totals.costs;s=advance(s,1);assert.equal(s.core.totals.costs,afterCosts);assert.equal(s.automation.lastBottlings.length,0);exact(s);
});

test('bottler hire preserves raw-spirit fee reserve and failed cash-bound automation is atomic',()=>{
 let s=fill(D.newStaffProgressionDistillery(42),{progress:65});const id=s.core.casks[0].id;s=D.bottleBranded(s,id,{},1);const before=s.core.cash,q=D.quote(s,id),status=D.bottlingStaffStatus(s);
 assert.equal(status.hireCost,20);assert.equal(status.salary,2);assert.equal(status.hireMinimum,q.cost+22);s=D.hireBottlingStaff(s);assert.equal(s.core.cash,before-20);assert(s.core.cash>=D.quote(s,id).cost+2);s=D.reserveBottling(s,id,{mode:'age',age:1,count:10});
 // Synthetic boundary only: not a valid save or a claim that ordinary progress can lose reserved fees.
 const poor=structuredClone(s);poor.core.cash=31;const old=JSON.stringify(poor),next=D.tickDistillery(poor);assert.equal(JSON.stringify(poor),old);assert.equal(next.releases.length,poor.releases.length);assert.equal(next.core.totals.costs,poor.core.totals.costs);assert.equal(next.core.cash,31);assert.equal(next.automation.lastBottlings.length,0);assert(next.decisions.some(d=>d.eventId==='funds'));exact(s);
});

test('targeted generation handover retains both hired workers without idle wages or repeated hiring costs',()=>{
 let s=hiredCareer();const costs=s.core.totals.costs,initialHireStatus=D.bottlingStaffStatus(s);while(s.core.month<360){const month=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,month+1);assert.equal(s.core.totals.costs,costs);balance(s);}
 assert.equal(D.generationStatus(s).phase,'last-batch');s=fill(s,{progress:65});assert.equal(D.generationStatus(s).phase,'review');s=D.handoverGeneration(s,1);assert.equal(D.generationStatus(s).id,2);assert(s.staff.hired);assert(D.bottlingStaffStatus(s).hired);assert.equal(D.bottlingStaffStatus(s).hireCost,initialHireStatus.hireCost);exact(s);
 const id=s.core.casks.at(-1).id;s=D.reserveBottling(s,id,{mode:'age',age:1,count:10});s=advance(s,1);assert.equal(s.automation.lastBottlings[0].salary,2);assert.equal(s.result.bottlingCost,30);assert.equal(s.brands.length,1);assert.equal(s.brands[0].name,'AmberTime');exact(s);
 const source=D.manualRecipeSources(s).at(-1).caskId,before=s.core.cash;s=D.reserveStaff(s,source,'once');s=completeStaff(D.beginUsual(s));assert.equal(s.core.cash,before-232);assert(D.bottlingStaffStatus(s).hired);exact(s);
});

test('paid stock bottling clamps ten requested bottles to eight remaining and charges one operation salary',async()=>{
 let base=fill(D.newStaffProgressionDistillery(42),{progress:65});const id=base.core.casks[0].id;
 base=D.bottleBranded(base,id,{},D.quote(base,id).count-8);const stored=structuredClone(base.core.products.at(-1));assert.equal(D.quote(base,id).count,8);base=D.hireBottlingStaff(base);
 const before=base.core.cash,costs=base.core.totals.costs,manualMonth=D.tickDistillery(base),manual=D.bottleBranded(manualMonth,id,{},8);
 let automatic=D.tickDistillery(D.reserveBottling(base,id,{mode:'stock',threshold:5,count:10}));const receipt=automatic.automation.lastBottlings[0];
 assert.equal(receipt.count,8);assert.equal(receipt.cost,24);assert.equal(receipt.salary,2);assert.equal(automatic.result.bottlingCost,manual.result.bottlingCost);assert.equal(automatic.result.bottlingCost,24);assert.equal(automatic.core.cash,before-12-24-2);assert.equal(automatic.core.cash,manual.core.cash-2);assert.equal(automatic.core.totals.costs,costs+26);assert.equal(automatic.core.totals.costs,manual.core.totals.costs+2);
 for(const key of ['casks','archive','products'])assert.deepEqual(automatic.core[key],manual.core[key]);assert.deepEqual(automatic.core.products.find(p=>p.id===stored.id),stored);assert.equal(automatic.productsById[stored.id].listed,false);assert.equal(automatic.productsById[receipt.productId].listed,true);assert.equal(D.bottlingReservation(automatic,id).status,'completed');
 const {execFileSync}=await import('node:child_process'),raw=D.serializeDistillery(automatic),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);
 automatic=advance(automatic,1);assert.equal(automatic.core.totals.costs,costs+26);assert.equal(automatic.automation.lastBottlings.length,0);assert.equal(automatic.releases.length,2);exact(automatic);
});
