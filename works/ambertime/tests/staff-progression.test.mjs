import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {fill,advance} from './brands-helpers.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/staff-progression-v20.json',import.meta.url)));
const fresh=()=>D.newStaffProgressionDistillery(42);
const cask=s=>s.core.casks.at(-1).id;
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return raw;}
function reject(s,fn){const raw=JSON.stringify(s);assert.throws(fn);assert.equal(JSON.stringify(s),raw);}
const unlocked=()=>{let s=fill(fresh(),{progress:65});return D.bottleBranded(s,cask(s),{},1);};

test('fresh progression offers no workers; direct hire and reserve APIs cannot bypass manual discovery',()=>{
 const s=fresh();assert(D.staffProgressionMode(s));assert.equal(s.version,20);assert.deepEqual(D.staffOpportunities(s),[]);assert.equal(D.staffStatus(s).unlocked,false);assert.equal(D.bottlingStaffStatus(s).unlocked,false);reject(s,()=>D.hireStaff(s));reject(s,()=>D.hireBottlingStaff(s));reject(s,()=>D.reserveStaff(s,2));reject(s,()=>D.reserveBottling(s,2,{mode:'age',age:1,count:1}));reject(s,()=>D.noticeStaffOpportunity(s,'bottling'));cold(s);
});
test('a completed manual fill unlocks distiller once; deferral persists and later hiring charges once',()=>{
 let s=fresh();s=D.startDistillation(s);for(let i=0;i<65;i++)s=D.distillStep(s);s=D.stopDistillation(s);assert.equal(D.staffStatus(s).unlocked,false);s=D.fillBarrel(s,'refill');assert.equal(D.staffStatus(s).unlocked,true);assert.equal(D.bottlingStaffStatus(s).unlocked,false);assert.deepEqual(D.staffOpportunities(s).map(o=>o.kind),['distill']);s=D.noticeStaffOpportunity(s,'distill');assert.equal(D.noticeStaffOpportunity(s,'distill'),s);const text=cold(s);s=D.restoreDistillery(text);assert.deepEqual(D.staffOpportunities(s),[]);assert(D.staffStatus(s).canHire);const cash=s.core.cash,cost=s.core.totals.costs;s=D.hireStaff(s);assert.equal(s.core.cash,cash-40);assert.equal(s.core.totals.costs,cost+40);assert.equal(s.staffProgression.distill.noticed,true);reject(s,()=>D.hireStaff(s));s=D.reserveStaff(s,cask(s));assert.equal(s.usual.reservation.status,'queued');cold(s);
});
test('both partial and full manual bottling discover bottler without requiring sales',()=>{
 for(const full of [false,true]){let s=fill(fresh(),{progress:65}),id=cask(s);assert.equal(D.bottlingStaffStatus(s).unlocked,false);reject(s,()=>D.reserveBottling(s,id,{mode:'stock',threshold:5,count:10}));s=full?D.bottleBranded(s,id,{}):D.bottleBranded(s,id,{},1);assert(D.bottlingStaffStatus(s).unlocked);assert(!D.bottlingStaffStatus(s).hired);assert.equal(s.releases[0].sold,0);assert.equal(s.productsById[s.result.productId].listed,false);assert(D.staffOpportunities(s).some(o=>o.kind==='bottling'));reject(s,()=>D.reserveBottling(s,id,{mode:'stock',threshold:5,count:10}));cold(s);}
});
test('bottler deferral persists; hiring later enables same per-cask age and stock options without duplicate hire charges',()=>{
 let s=unlocked(),id=cask(s);s=D.noticeStaffOpportunity(s,'distill');s=D.noticeStaffOpportunity(s,'bottling');s=D.restoreDistillery(cold(s));assert.equal(D.staffOpportunities(s).length,0);assert(D.bottlingStaffStatus(s).canHire);const cash=s.core.cash,cost=s.core.totals.costs;s=D.hireBottlingStaff(s);assert.equal(s.core.cash,cash-20);assert.equal(s.core.totals.costs,cost+20);assert.equal(D.bottlingStaffStatus(s).hired,true);reject(s,()=>D.hireBottlingStaff(s));s=D.reserveBottling(s,id,{mode:'age',age:24,count:10});assert.equal(D.bottlingReservation(s,id).mode,'age');s=D.cancelBottling(s,id);s=D.reserveBottling(s,id,{mode:'stock',threshold:5,count:10});assert.equal(D.bottlingReservation(s,id).mode,'stock');s=D.pauseBottling(s,id);s=D.cancelBottling(s,id);s=D.bottleBranded(s,id,{},1);assert.equal(D.staffOpportunities(s).length,0);cold(s);
});
test('old 0.21.1 free automation remains exact; progression migration infers only manual actions and retains old history',()=>{
 const old=D.restoreDistillery(fixture.before);assert.equal(cold(old),fixture.before);const after=advance(old,2);assert.equal(cold(after),fixture.after);assert.equal(createHash('sha256').update(fixture.after).digest('hex'),fixture.hash);
 const migrated=D.enableStaffProgression(after);assert.equal(migrated.staffProgression.distill.unlocked,true);assert.equal(migrated.staffProgression.bottling.unlocked,false);for(const key of ['core','still','shop','trade','brands','releases','automation','generations'])assert.deepEqual(migrated[key],after[key]);assert.equal(D.enableStaffProgression(migrated),migrated);cold(migrated);
 // An old queued free reservation remains present but waits for discovery/hire.
 let waiting=D.enableStaffProgression(old);const plan=structuredClone(waiting.automation.reservations[0]);waiting=advance(waiting,2);assert.equal(waiting.releases.length,0);assert.equal(waiting.automation.reservations[0].caskId,plan.caskId);assert.equal(waiting.automation.reservations[0].lastError,'雇用前');cold(waiting);
});
test('old hired distiller carries through migration; active extraction progress survives boundary',()=>{
 let s=fill(D.newDelegatedDistillery(42),{progress:65});s=D.hireStaff(s);s=advance(s,1);s=D.startDistillation(s);for(let i=0;i<37;i++)s=D.distillStep(s);const old=structuredClone(s),n=D.enableStaffProgression(s);assert.deepEqual(n.staff,old.staff);assert.equal(n.staffProgression.distill.unlocked,true);assert.equal(n.staffProgression.distill.noticed,true);assert.deepEqual(n.still,old.still);assert.equal(n.operations.at(-1).value.progress,37);cold(n);
});
test('notices, unlocks, hires, and salary receipts reject tampering under cold replay',()=>{
 let s=unlocked();s=D.hireBottlingStaff(s);s=D.reserveBottling(s,cask(s),{mode:'age',age:1,count:10});s=advance(s,1);assert.equal(s.automation.lastBottlings[0].salary,2);for(const mutate of [x=>x.staffProgression.bottling.noticed=false,x=>x.staffProgression.bottling.hired=false,x=>x.staffProgression.distill.unlocked=false,x=>x.operations.splice(x.operations.findIndex(o=>o.key==='enable-staff-progression'),1),x=>x.automation.lastBottlings[0].salary=0,x=>x.core.totals.costs-=2]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}cold(s);
});


test('progression closes legacy free request/start APIs and unhired bottle plans do not suppress aging decisions',()=>{
 let old=D.enableDelegationFixes(D.enableDelegation(D.enablePartialBottling(D.newRecipeDistillery(42))));assert(old.staff.legacy&&!old.staff.hired);old=fill(old,{progress:65});old=advance(old,1);old=D.reserveUsual(old);let inflight=D.enableStaffProgression(D.beginUsual(old));const priorCosts=inflight.core.totals.costs;while(inflight.usual.reservation?.status==='active')inflight=D.distillStep(inflight);assert.equal(inflight.staff.hired,false);assert.equal(inflight.core.totals.costs,priorCosts+100);assert.equal(inflight.usual.reservation,null);reject(inflight,()=>D.reserveUsual(inflight));cold(inflight);const queued=D.enableStaffProgression(old);assert.equal(queued.usual.reservation.status,'queued');assert.equal(D.canBeginUsual(queued).ok,false);assert.equal(D.usualNeedsClock(queued),false);reject(queued,()=>D.beginUsual(queued));let s=D.cancelUsual(queued);reject(s,()=>D.reserveUsual(s));s=D.hireStaff(s);s=D.reserveUsual(s);assert(D.canBeginUsual(s).ok);s=D.beginUsual(s);assert.equal(s.usual.reservation.salary,12);cold(s);
 let oldBottle=fill(D.newDelegatedDistillery(42),{progress:65});const id=cask(oldBottle);oldBottle=D.reserveBottling(oldBottle,id,{mode:'age',age:24,count:10});let waiting=D.enableStaffProgression(oldBottle);waiting=D.pauseBottling(waiting,id);reject(waiting,()=>D.pauseBottling(waiting,id,false));waiting=D.enableStaffProgression(oldBottle);for(let i=0;i<12&&!waiting.decisions.length;i++)waiting=D.tickDistillery(waiting);assert(waiting.decisions.length>0);assert.equal(waiting.automation.reservations[0].lastError,'雇用前');assert.equal(waiting.releases.length,0);cold(waiting);
});
