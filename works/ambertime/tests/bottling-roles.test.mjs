import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {fill,advance,resolve} from './brands-helpers.mjs';
import {automaticEvents,noticeText} from '../event-notices.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/bottling-roles-legacy.json',import.meta.url),'utf8')),hash=s=>createHash('sha256').update(s).digest('hex'),round=x=>Math.round(x*100)/100;
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return D.restoreDistillery(raw);}
function fresh(n=3,factory=D.newBottlingRolesDistillery){let s=fill(factory(42),{progress:65,type:'refill'});s=D.bottleBranded(s,s.core.casks[0].id,{},1);s=D.hireBottlingStaff(s);for(let i=1;i<n;i++)s=fill(advance(s,1),{progress:65,type:'refill'});return s;}
function stock(s,id,count=10,threshold=5){return D.reserveBottling(s,id,{mode:'stock',count,threshold});}

test('legacy per-parent overfill and armed stall bytes remain exact outside the new boundary',()=>{
 for(const count of [1,10]){const item=fixture.cases[count];for(const point of ['before','after']){const state=D.restoreDistillery(item[point].raw);assert.equal(D.serializeDistillery(state),item[point].raw);assert.equal(hash(item[point].raw),item[point].sha256);assert.equal(D.bottlingRolesMode(state),false);}const before=D.restoreDistillery(item.before.raw),after=advance(before,5);assert.equal(D.serializeDistillery(after),item.after.raw);}
 const one=fixture.cases[1].monthly;assert.equal(one[0].jobs.length,3);assert(one.slice(1).every(m=>m.listedStock===0&&m.jobs.length===0));assert(one.at(-1).casks.every(c=>c.litres>30));assert.equal(fixture.cases[10].monthly[0].listedStock,30);
});

test('global stock uses every listed parent, excludes stored bottles and includes fresh listings',()=>{
 let s=fresh(3),[a,b,c]=s.core.casks.map(c=>c.id);s=D.bottleBranded(s,a,{},20);const pid=s.result.productId;assert.equal(D.listedBottlingStock(s),0);s=stock(stock(s,b),c);const stored=s,listed=D.listBottles(s,pid);assert.equal(D.listedBottlingStock(listed),20);
 const noRefill=advance(listed,1);assert.equal(noRefill.automation.lastBottlings.length,0);assert(D.listedBottlingStock(noRefill)>5);assert.equal(D.bottlingReservation(noRefill,a),null,'manual parent remains protected');
 const refill=advance(stored,1);assert.equal(refill.automation.lastBottlings.length,1);assert.equal(refill.automation.lastBottlings[0].caskId,b);assert.equal(D.listedBottlingStock(refill),10);assert.equal(refill.core.products.find(p=>p.id===pid).stock,20);cold(refill);cold(noRefill);
});

test('count below threshold refills again after sales, with only one paid stock job each month',()=>{
 let s=fresh(3);for(const c of s.core.casks)s=stock(s,c.id,1,5);const first=s.core.casks[0].id,manualCount=D.operationDefaults(s).bottleCount;for(let i=0;i<5;i++){const before=s,cost=s.core.totals.costs;s=advance(s,1);assert.equal(s.automation.lastBottlings.length,1);const b=s.automation.lastBottlings[0];assert.equal(b.mode,'stock');assert.equal(b.caskId,first);assert.equal(b.count,1);assert.equal(b.cost,3);assert.equal(b.salary,2);assert.equal(s.core.totals.costs,cost+5);assert.equal(s.core.cash,round(before.core.cash+s.core.lastMonth.revenue-s.core.lastMonth.upkeep-5));assert.equal(s.bottlingRoles.lastStockMonth,s.core.month);assert.equal(D.operationDefaults(s).bottleCount,manualCount);const p=s.core.products.find(p=>p.id===b.productId);assert.equal(p.sold,0);assert.equal(p.stock,1);assert(!s.automation.lastShipments.some(x=>x.productId===p.id));}cold(s);
});

test('FIFO follows assignment order, keeps paused position and moves cancelled reassignment to the tail',()=>{
 let s=fresh(3),[a,b,c]=s.core.casks.map(c=>c.id);s=stock(s,c,1,5);s=stock(s,a,1,5);s=stock(s,b,1,5);const orders=Object.fromEntries(s.automation.reservations.map(r=>[r.caskId,r.order]));assert(orders[c]<orders[a]&&orders[a]<orders[b]);s=D.pauseBottling(s,c);s=advance(s,1);assert.equal(s.automation.lastBottlings[0].caskId,a);s=D.pauseBottling(s,c,false);assert.equal(D.bottlingReservation(s,c).order,orders[c]);s=advance(s,1);assert.equal(s.automation.lastBottlings[0].caskId,c);s=D.cancelBottling(s,c);s=stock(s,c,1,5);assert(D.bottlingReservation(s,c).order>orders[b]);s=advance(s,1);assert.equal(s.automation.lastBottlings[0].caskId,a);cold(s);
});

test('a legally exhausted oldest queue entry retires without charge and the next cask succeeds',()=>{
 let s=fresh(1);const fallback=s.core.casks[0].id;s=fill(advance(s,1),{progress:72,type:'refill'});const exhausted=s.core.casks.at(-1).id;s=D.bottleBranded(s,exhausted,{},D.quote(s,exhausted).count-1);assert(Math.abs(D.currentCask(s,exhausted).litres-.7)<1e-8);s=stock(stock(s,exhausted),fallback);const before=s.core.cash,cost=s.core.totals.costs;s=D.tickDistillery(s);assert.equal(D.bottlingReservation(s,exhausted).status,'completed');assert.equal(D.bottlingReservation(s,exhausted).lastError,'原酒不足');assert.equal(s.automation.lastBottlings.length,1);assert.equal(s.automation.lastBottlings[0].caskId,fallback);assert.equal(s.automation.lastBottlings[0].salary,2);assert.equal(s.core.totals.costs,cost+32);assert.equal(s.core.cash,round(before+s.core.lastMonth.revenue-s.core.lastMonth.upkeep-32));cold(s);
});

test('AGE completes its partial amount before global replenishment and returns remaining parent to manual work',()=>{
 let s=fresh(3),[a,b,c]=s.core.casks.map(c=>c.id);s=stock(stock(s,a),b);s=D.reserveBottling(s,c,{mode:'age',age:1,count:5});const before=s;s=advance(s,1);assert.deepEqual(s.automation.lastBottlings.map(x=>[x.caskId,x.mode,x.count]),[[c,'age',5],[a,'stock',10]]);assert.equal(D.bottlingReservation(s,c).status,'completed');assert(D.currentCask(s,c).litres>28);assert.equal(s.bottlingRoles.lastStockMonth,s.core.month);const events=automaticEvents(before,s,()=> 'たる3'),age=events.find(e=>e.mode==='age');assert.equal(age.caskId,c);assert.equal(age.count,5);assert.equal(age.remainingLitres,D.currentCask(s,c).litres);assert.match(noticeText(events),/ビン詰め完了 5本 · たる3 残り /);const again=advance(s,1);assert(!again.automation.lastBottlings.some(x=>x.caskId===c));cold(again);
});

test('AGE clamps to the paid residual amount, while slot and funds failures do not consume liquid or fees',()=>{
 let s=fresh(1),a=s.core.casks[0].id;s=D.bottleBranded(s,a,{},D.quote(s,a).count-8);s=D.reserveBottling(s,a,{mode:'age',age:1,count:10});const before=s.core.cash,cost=s.core.totals.costs;s=advance(s,1);const job=s.automation.lastBottlings[0];assert.equal(job.count,8);assert.equal(job.cost,24);assert.equal(job.salary,2);assert.equal(s.core.totals.costs,cost+26);assert.equal(s.core.cash,round(before+s.core.lastMonth.revenue-s.core.lastMonth.upkeep-26));assert.equal(D.bottlingReservation(s,a).status,'completed');assert.equal(D.currentCask(s,a),null);cold(s);
 let slots=fresh(2);a=slots.core.casks[0].id;for(let i=0;i<7;i++)slots=D.bottleBranded(slots,a,{},1);for(const c of slots.core.casks)slots=stock(slots,c.id);const slotCost=slots.core.totals.costs,litres=slots.core.casks.map(c=>c.litres);slots=advance(slots,1);assert.equal(slots.automation.lastBottlings.length,0);assert.equal(slots.core.totals.costs,slotCost);assert(slots.automation.reservations.every(r=>r.lastError==='在庫待ち'));assert(slots.core.casks.every((c,i)=>c.litres<litres[i]&&litres[i]-c.litres<.1));cold(slots);
 const good=stock(fresh(1),2),poor=structuredClone(good);poor.core.cash=25;const failed=D.tickDistillery(poor);assert.equal(failed.core.month,poor.core.month);assert.equal(failed.core.cash,25);assert.equal(failed.core.totals.costs,poor.core.totals.costs);assert.equal(failed.automation.lastBottlings.length,0);assert(failed.decisions.some(d=>d.eventId==='funds'));assert.deepEqual(failed.bottlingRoles,poor.bottlingRoles);cold(good);
});

test('migration preserves old casks and queue snapshots; strict restore rejects order and guard forgeries',()=>{
 const old=D.restoreDistillery(fixture.cases[1].before.raw),s=D.enableBottlingRoles(old);for(const k of ['core','still','notesById','workPreferences','releases','shop','shopDemand'])assert.deepEqual(s[k],old[k]);for(const r of s.automation.reservations){const {order,...without}=r;assert.deepEqual(without,old.automation.reservations.find(x=>x.caskId===r.caskId));assert(Number.isSafeInteger(order)&&order>0);}cold(s);
 const n=advance(s,1);for(const edit of [x=>x.bottlingRoles.nextOrder++,x=>x.bottlingRoles.lastStockMonth--,x=>x.automation.reservations[0].order++,x=>x.automation.lastBottlings[0].mode='age',x=>x.automation.lastBottlings[0].remainingLitres++,x=>x.operations.splice(x.operations.findIndex(o=>o.key==='enable-bottling-roles'),1)]){const bad=structuredClone(n);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}cold(n);
});


test('AGE slot and funds failures remain active and retry without paying or prematurely completing',()=>{
 let slots=fresh(1),a=slots.core.casks[0].id;for(let i=0;i<7;i++)slots=D.bottleBranded(slots,a,{},1);slots=D.reserveBottling(slots,a,{mode:'age',age:1,count:10});const costs=slots.core.totals.costs;slots=advance(slots,1);assert.equal(slots.automation.lastBottlings.length,0);assert.equal(D.bottlingReservation(slots,a).status,'active');assert.equal(D.bottlingReservation(slots,a).lastError,'在庫待ち');assert.equal(slots.core.totals.costs,costs);cold(slots);
 slots=D.listBottles(slots,slots.core.products[0].id);slots=advance(slots,1);assert.equal(D.bottlingReservation(slots,a).status,'completed');assert.equal(slots.automation.lastBottlings[0].count,10);assert.equal(slots.core.totals.costs,costs+32);cold(slots);
 const good=D.reserveBottling(fresh(1),2,{mode:'age',age:1,count:10}),poor=structuredClone(good);poor.core.cash=25;const failed=D.tickDistillery(poor);assert.equal(failed.core.month,poor.core.month);assert.equal(failed.core.cash,25);assert.equal(D.bottlingReservation(failed,2).status,'active');assert.equal(failed.automation.lastBottlings.length,0);assert.equal(failed.core.totals.costs,poor.core.totals.costs);const retry=advance(good,1);assert.equal(D.bottlingReservation(retry,2).status,'completed');assert.equal(retry.automation.lastBottlings[0].cost,30);assert.equal(retry.automation.lastBottlings[0].salary,2);cold(retry);
});

test('migration rebuilds reverse assignment chronology and preserves a paused delegate position',()=>{
 let old=fresh(3,D.newBottlingPolicyDistillery),[a,b,c]=old.core.casks.map(c=>c.id);old=D.setBottlingPolicy(old,{mode:'stock',threshold:5,count:1});for(const id of [c,a,b])old=D.delegateBottling(old,id);old=D.pauseBottling(old,c);old=D.delegateBottling(old,c);old=D.pauseBottling(old,c);const raw=D.serializeDistillery(old);let s=D.enableBottlingRoles(D.restoreDistillery(raw));assert.equal(D.bottlingReservation(s,c).order,1);assert.equal(D.bottlingReservation(s,a).order,2);assert.equal(D.bottlingReservation(s,b).order,3);assert.equal(D.bottlingReservation(s,c).status,'paused');s=D.delegateBottling(s,c);assert.equal(D.bottlingReservation(s,c).order,1);s=advance(s,1);assert.equal(s.automation.lastBottlings[0].caskId,c);cold(s);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);
});

test('new role bottling first sells and ships after its listing month with shared stock accounting',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/shop-demand-legacy.json',import.meta.url),'utf8'));let s=D.enableBottlingRoles(D.restoreDistillery(f.before));s=D.hireBottlingStaff(s);const parent=s.core.casks.at(-1).id;s=D.reserveBottling(s,parent,{mode:'age',age:1,count:25});s=advance(s,1);const job=s.automation.lastBottlings[0],pid=job.productId,month=s.core.month;assert.equal(job.caskId,parent);assert.equal(job.count,25);assert.equal(s.core.products.find(p=>p.id===pid).sold,0);assert(!s.core.lastMonth.sales.some(x=>x.id===pid));assert(!s.automation.lastShipments.some(x=>x.productId===pid));s=D.setSalePrice(s,'high',pid);let shipped=false,sold=false;
 for(let i=0;i<12&&!shipped;i++){const cash=s.core.cash;s=advance(s,1);assert(s.core.month>month);const retail=s.core.lastMonth.sales.filter(x=>x.id===pid&&!x.channel).reduce((n,x)=>n+x.sold,0),ships=s.automation.lastShipments.filter(x=>x.productId===pid);sold ||= retail>0;shipped ||= ships.length>0;assert(ships.every(x=>x.month>month));assert.equal(s.core.cash,round(cash+s.core.lastMonth.revenue-s.core.lastMonth.upkeep));const p=s.core.products.find(p=>p.id===pid);assert.equal(p.stock+p.sold,p.originalStock);}assert(sold);assert(shipped,'lawful approved liquor receives the new lot after FIFO older stock clears');cold(s);
});
