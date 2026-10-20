import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {fill,advance} from './brands-helpers.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/delegation-v20.json',import.meta.url)));
const cask=s=>s.core.casks.at(-1).id;
const fresh=()=>fill(D.newDelegatedDistillery(42),{progress:65,type:'refill'});
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return raw;}
const storedFixture=()=>D.restoreDistillery(fixture.cases.find(x=>x.name==='old-stored-auto-ships').before);

test('captured v20 stored shipping and shortage months restore byteexact before recorded fixes',()=>{
 assert.equal(fixture.source,'f2d776067beb5e527d156c4b9a64059038695744');
 for(const f of fixture.cases){const before=D.restoreDistillery(f.before);assert.equal(cold(before),f.before);const after=D.tickDistillery(before);assert.equal(cold(after),f.after);assert.equal(createHash('sha256').update(f.after).digest('hex'),f.hash);assert.equal(D.delegationFixesMode(after),false);}
});
test('fix activation preserves state and historical receipts, records current extraction progress and is idempotent',()=>{
 let s=advance(storedFixture(),1);const raw=D.serializeDistillery(s),oldOps=structuredClone(s.operations);s=D.startDistillation(s);for(let i=0;i<37;i++)s=D.distillStep(s);const prior=structuredClone(s),fixed=D.enableDelegationFixes(s);assert(D.delegationFixesMode(fixed));assert.equal(fixed.version,20);assert.equal(fixed.operations.at(-1).key,'enable-delegation-fixes');assert.equal(fixed.operations.at(-1).value.progress,37);for(const key of ['core','still','brands','releases','shop','trade','generations','notesById','productsById'])assert.deepEqual(fixed[key],prior[key]);assert.deepEqual(fixed.operations.slice(0,-1),prior.operations);assert.equal(D.enableDelegationFixes(fixed),fixed);cold(fixed);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);assert.deepEqual(D.restoreDistillery(raw).operations,oldOps);
 const oldAfter=D.restoreDistillery(fixture.cases[0].after),historical=D.enableDelegationFixes(oldAfter);assert.deepEqual(historical.shop.deliveries,oldAfter.shop.deliveries);assert.deepEqual(historical.automation.lastShipments,oldAfter.automation.lastShipments);cold(historical);
});
test('stored bottles never auto ship; listing explicitly restores normal paid shipping',()=>{
 let s=D.enableDelegationFixes(storedFixture()),pid=s.core.products.at(-1).id,before=structuredClone(s.core.products.at(-1)),cash=s.core.cash;
 s=advance(s,1);assert.deepEqual(s.core.products.find(p=>p.id===pid),before);assert.deepEqual(s.automation.lastShipments,[]);assert.equal(s.core.cash,cash-s.core.lastMonth.upkeep);assert.equal(s.shop.deliveries.length,0);assert.equal(s.productsById[pid].listed,false);cold(s);
 s=D.listBottles(s,pid);const oldCash=s.core.cash,stock=s.core.products.find(p=>p.id===pid).stock;s=advance(s,1);const p=s.core.products.find(p=>p.id===pid),ships=s.automation.lastShipments.filter(d=>d.productId===pid),retail=s.core.lastMonth.sales.filter(x=>x.id===pid&&!x.channel).reduce((n,x)=>n+x.sold,0);assert(ships.length>0);assert.equal(p.stock,stock-retail-ships.reduce((n,d)=>n+d.count,0));assert.equal(s.core.cash,Math.round((oldCash+s.core.lastMonth.revenue-s.core.lastMonth.upkeep)*100)/100);assert(ships.every(d=>d.shopId!=='department'));cold(s);
});
test('fixed stock reservations count only listed same-parent brand inventory and bottle the actual residual amount',()=>{
 let s=fresh(),id=cask(s),initial=D.quote(s,id).count;s=D.bottleBranded(s,id,{},initial-5);const stored=s.core.products.at(-1),storedId=stored.id,storedCount=stored.stock;s=D.reserveBottling(s,id,{mode:'stock',threshold:5,count:10});const cash=s.core.cash,costs=s.core.totals.costs;
 s=advance(s,1);const receipt=s.automation.lastBottlings[0];assert.equal(receipt.count,5);assert.equal(receipt.cost,15);assert.equal(s.result.bottles,5);assert.equal(s.result.bottlingCost,15);assert.equal(s.core.cash,cash-s.core.lastMonth.upkeep-15);assert.equal(s.core.totals.costs,costs+15);assert.equal(s.core.products.find(p=>p.id===storedId).stock,storedCount);assert.equal(s.productsById[storedId].listed,false);assert.equal(s.productsById[receipt.productId].listed,true);assert.equal(s.core.casks.length,0);assert.equal(D.bottlingReservation(s,id).status,'completed');assert(s.core.archive.some(c=>c.id===id));cold(s);
 s=advance(s,1);assert.equal(s.automation.lastBottlings.length,0);assert.equal(s.releases.length,2);cold(s);
});
test('fixed stock shortage clamps to available while age reservations retain the specified quantity requirement',()=>{
 const s=fresh(),id=cask(s),stock=D.reserveBottling(s,id,{mode:'stock',threshold:5,count:57}),age=D.reserveBottling(s,id,{mode:'age',age:1,count:57});const a=advance(stock,1),b=advance(age,1);assert(a.automation.lastBottlings[0].count>0&&a.automation.lastBottlings[0].count<57);assert.equal(a.automation.lastBottlings[0].count,a.releases[0].bottles);assert.equal(a.core.casks.length,0);assert.equal(b.releases.length,0);assert.equal(D.bottlingReservation(b,id).lastError,'原酒不足');cold(a);cold(b);
});
test('zero available volume and insufficient cash never produce negative or phantom bottles',()=>{
 let s=fresh(),id=cask(s);s=D.reserveBottling(s,id,{mode:'stock',threshold:5,count:10});const poor=structuredClone(s);poor.core.cash=0;const stopped=D.tickDistillery(poor);assert.equal(stopped.releases.length,0);assert.equal(stopped.core.cash,0);assert(stopped.decisions.some(d=>d.eventId==='funds'));
 // Unit-only boundary injection: monthly chemistry archives the sub-bottle
 // cask before automatic bottling. This is deliberately not a restorable save.
 const empty=structuredClone(s);empty.core.casks[0].litres=.69;const zero=D.tickDistillery(empty);assert.equal(zero.releases.length,0);assert.equal(zero.core.casks.length,0);assert.equal(D.bottlingReservation(zero,id).lastError,'原酒不足');assert.equal(zero.automation.lastBottlings.length,0);
 // Exhaustion through a legal manual transaction removes the barrel; the pending
 // reservation closes without a zero-count product on its next monthly pass.
 s=D.bottleBranded(s,id,{},D.quote(s,id).count);s=D.listBottles(s,s.result.productId);s=advance(s,1);assert.equal(s.releases.length,1);assert.equal(s.automation.lastBottlings.length,0);assert.equal(D.bottlingReservation(s,id).status,'completed');assert(s.core.products.every(p=>p.originalStock>0));cold(s);
});
test('the explicit fix boundary and reduced batch receipts reject saved-state forgery',()=>{
 let s=fresh(),id=cask(s);s=D.reserveBottling(s,id,{mode:'stock',threshold:5,count:57});s=advance(s,1);for(const mutate of [x=>x.automation.fixVersion=0,x=>x.operations.splice(x.operations.findIndex(o=>o.key==='enable-delegation-fixes'),1),x=>x.automation.lastBottlings[0].count++,x=>x.automation.lastBottlings[0].cost++,x=>x.core.cash++]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}cold(s);
});


test('residual stock automation matches the same-month manual eight-bottle fee, stock and fractional archive',()=>{
 let s=fresh(),id=cask(s);s=D.bottleBranded(s,id,{},D.quote(s,id).count-8);const baseline=advance(s,1),count=D.quote(baseline,id).count;assert.equal(count,8);let manual=D.bottleBranded(baseline,id,{},count);manual=D.listBottles(manual,manual.result.productId);const automatic=advance(D.reserveBottling(s,id,{mode:'stock',threshold:5,count:10}),1);for(const key of ['cash','totals','products','archive','casks'])assert.deepEqual(automatic.core[key],manual.core[key]);assert.deepEqual(automatic.result,manual.result);assert.equal(automatic.result.bottlingCost,24);assert.equal(automatic.automation.lastBottlings[0].count,8);assert.equal(automatic.automation.lastBottlings[0].cost,24);const remaining=automatic.core.archive.find(c=>c.id===id).litres;assert(remaining>=0&&remaining<.7);cold(automatic);cold(manual);
});
