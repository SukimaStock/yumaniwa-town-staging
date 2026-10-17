import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {ECONOMY_PARAMETERS as C} from '../economy-parameters.mjs';
import {advance,fill,release,resolve,exact} from './brands-helpers.mjs';
import {loadFixture,fourCasks,cashIdentity,round} from './wholesale-care-helpers.mjs';
const clone=structuredClone;
function runAutomatic(s,{monthly=false}={}){
 s=D.beginUsual(s);let ticks=0;
 while(s.usual.reservation){assert(++ticks<=100,'one extraction has a bounded duration');s=D.distillStep(s);if(monthly&&ticks%60===0)s=advance(s,1);}
 return {s,ticks};
}
function cold(s){
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};const s=D.restoreDistillery(fs.readFileSync(0,'utf8'));process.stdout.write(D.serializeDistillery(s));`;
 const raw=D.serializeDistillery(s);assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return s;
}
const withoutUsual=s=>{const {version,rules,operations,usual,...rest}=s;return rest;};

// Financial and concurrent-shipment boundary projections below are explicitly
// not offered to restoreDistillery as legal operation-derived save fixtures.
test('first distillation stays manual; only a successful manual cask fill records a recipe',()=>{
 let s=D.newUsualDistillery(42);assert.equal(s.version,10);assert.equal(s.usual.recipe,null);assert.equal(D.usualQuote(s),null);assert.throws(()=>D.reserveUsual(s));
 s=D.startDistillation(s);for(let i=0;i<47;i++)s=D.distillStep(s);assert.equal(s.usual.recipe,null);s=D.stopDistillation(s);assert.equal(s.usual.recipe,null);s=D.fillBarrel(s,'bourbon');
 assert.deepEqual(s.usual,{recipe:{stopAt:47,type:'bourbon'},reservation:null});assert.deepEqual(D.usualQuote(s),{stopAt:47,type:'bourbon',distillationCost:120,caskCost:160,cost:280});assert.deepEqual(exact(s),s);assert.equal(cashIdentity(s),0);
});

test('v9 migration preserves all old state and reconstructs the latest successful manual recipe',()=>{
 const old=D.enableReputation(D.restoreDistillery(fs.readFileSync(new URL('../design/reputation/v8-partial-sale.json',import.meta.url),'utf8'))),raw=D.serializeDistillery(old);
 const s=D.enableUsual(old);assert.equal(D.serializeDistillery(old),raw);assert.equal(D.enableUsual(s),s);assert.deepEqual(withoutUsual(s),withoutUsual(old));assert.deepEqual(s.operations,[...old.operations,{key:'enable-usual'}]);assert.deepEqual(s.usual.recipe,{stopAt:60,type:'refill'});cold(s);
 let next=advance(s,1);next=fill(next,{progress:38,type:'bourbon'});assert.deepEqual(next.usual.recipe,{stopAt:38,type:'bourbon'});cold(next);
});

test('migration finds successful manual fills inside a protected legacy origin',()=>{
 const old=D.enableReputation(loadFixture('v08-legal-funds.json'));assert(old.origin);const raw=D.serializeDistillery(old),s=D.enableUsual(old);
 assert.equal(D.serializeDistillery(old),raw);assert.deepEqual(s.core,old.core);assert.deepEqual(s.origin,old.origin);assert(s.usual.recipe);let original=s.origin;while(original.origin)original=original.origin;const ops=original.operations;const lastFill=ops.findLastIndex(o=>o.key==='fill');const lastStop=ops.slice(0,lastFill).findLast(o=>o.key==='stop');assert.deepEqual(s.usual.recipe,{stopAt:lastStop.value,type:ops[lastFill].value});assert.deepEqual(s.usual.recipe,{stopAt:99,type:'bourbon'});cold(s);
});

test('one reserved cask uses real extraction steps, exact costs and the same random chemistry as manual',()=>{
 for(const seed of [1,42,891])for(const type of ['refill','bourbon']){
  let s=fill(D.newUsualDistillery(seed),{progress:73,type});s=advance(s,1);const cash=s.core.cash,costs=s.core.totals.costs,month=s.core.month,manual=fill(s,{progress:73,type});
  const queued=D.reserveUsual(s);assert.equal(queued.core.cash,cash);assert.equal(queued.operations.at(-1).key,'reserve-usual');assert.equal(D.canStart(queued).ok,false);assert.throws(()=>D.startDistillation(queued),/予約/);
  let active=D.beginUsual(queued);assert.equal(active.core.cash,round(cash-C.distillationCost));assert.equal(active.still.phase,'distilling');assert.equal(active.usual.reservation.status,'active');assert.equal(active.still.distillation.progress,0);
  assert.throws(()=>D.cancelUsual(active));assert.throws(()=>D.stopDistillation(active));assert.throws(()=>D.fillBarrel(active,type));assert.throws(()=>D.beginUsual(active));
  let ticks=0;while(active.usual.reservation){active=D.distillStep(active);ticks++;assert(ticks<=73);}
  assert.equal(ticks,73);assert.equal(active.core.month,month);assert.equal(active.core.cash,round(cash-C.distillationCost-C.casks[type].cost));assert.equal(active.core.totals.costs,round(costs+C.distillationCost+C.casks[type].cost));assert.deepEqual(active.core,manual.core);assert.deepEqual(active.still,manual.still);assert.deepEqual(active.batchesById,manual.batchesById);assert.deepEqual(active.notesById,manual.notesById);assert.deepEqual(active.usual.recipe,{stopAt:73,type});assert.equal(active.operations.at(-1).key,'complete-usual');assert.equal(active.usual.reservation,null);assert.equal(D.usualNeedsClock(active),false);assert.equal(D.distillStep(active),active);assert.throws(()=>D.beginUsual(active));assert.equal(cashIdentity(active),0);assert.deepEqual(exact(active),active);
 }
});

test('queued reservation cancellation is cost-free and allows a new manual recipe',()=>{
 let s=fill(D.newUsualDistillery(7),{progress:50,type:'bourbon'});s=advance(s,1);const before=clone(s.core);s=D.reserveUsual(s);s=D.cancelUsual(s);assert.deepEqual(s.core,before);assert.equal(s.usual.reservation,null);assert.deepEqual(s.operations.slice(-2).map(o=>o.key),['reserve-usual','cancel-usual']);s=fill(s,{progress:31,type:'refill'});assert.deepEqual(s.usual.recipe,{stopAt:31,type:'refill'});assert.deepEqual(exact(s),s);
});

test('empty distillery wakes only for an affordable queue, including the existing next-month limit',()=>{
 let s=fill(D.newUsualDistillery(19),{progress:45,type:'refill'});s=D.bottleBranded(s,s.core.casks[0].id);s=D.reserveUsual(s);assert.equal(s.core.casks.length,0);assert.equal(D.canBeginUsual(s).ok,false);assert.equal(D.usualNeedsClock(s),true);s=D.tickDistillery(s);assert.equal(D.canBeginUsual(s).ok,true);const done=runAutomatic(s);assert.equal(done.s.core.casks.length,1);assert.equal(done.s.usual.reservation,null);assert.deepEqual(exact(done.s),done.s);
});

test('full rack keeps a legal reservation without charging and starts after automatic wholesale vacancy',()=>{
 let s=D.enableUsual(fourCasks());const cash=s.core.cash,ids=s.core.casks.map(c=>c.id);assert.equal(ids.length,4);s=D.reserveUsual(s);assert.equal(s.core.cash,cash);assert.equal(D.canBeginUsual(s).ok,false);assert.throws(()=>D.beginUsual(s));assert.deepEqual(exact(s),s);
 let months=0;while(s.core.casks.length===4){assert(++months<=20);s=advance(s,1);}
 assert(s.trade.lastShipments.length>0);assert.equal(s.usual.reservation.status,'queued');assert.equal(D.canBeginUsual(s).ok,true);s=runAutomatic(s).s;assert(s.core.casks.length<=4);assert.equal(s.usual.reservation,null);const c=s.core.casks.at(-1);assert(!ids.includes(c.id));assert.equal(D.contractFor(s,c.id),null);assert.equal(s.notesById[c.id].phase,'watching');assert.equal(s.brands.length,0);assert.equal(s.releases.length,0);assert.equal(cashIdentity(s),0);cold(s);
});

test('same-month multiple wholesale settlements release all slots once before one queued fill',()=>{
 // Align due dates at the settlement boundary, independent of chemistry and
 // manufacturing chronology. Legal full-rack replay is covered above.
 let s=D.reserveUsual(D.enableUsual(fourCasks()));const ids=s.core.casks.map(c=>c.id),cash=s.core.cash,costs=s.core.totals.costs;
 for(const c of s.core.casks){const k=D.contractFor(s,c.id);c.age=k.targetAge-1;c.filledMonth=s.core.month-c.age;c.batchMonth=c.filledMonth;}
 const month=s.core.month;s=D.tickDistillery(s,month);assert.equal(s.trade.lastShipments.length,4);assert.equal(new Set(s.trade.lastShipments.map(k=>k.caskId)).size,4);assert.equal(s.core.casks.length,0);assert.equal(s.core.cash,round(cash+s.core.lastMonth.revenue-s.core.lastMonth.upkeep-(s.core.totals.costs-costs)));assert.equal(s.usual.reservation.status,'queued');assert.equal(D.usualNeedsClock(s),true);assert.throws(()=>D.tickDistillery(s,month));s=runAutomatic(s).s;assert.equal(s.core.casks.length,1);assert(!ids.includes(s.core.casks[0].id));assert.equal(s.usual.reservation,null);assert.equal(D.usualNeedsClock(s),false);
});

test('insufficient funds and the chosen cask premium are checked before any charge',()=>{
 let s=advance(fill(D.newUsualDistillery(42),{type:'bourbon'}),1);s=D.reserveUsual(s);const min=D.canBeginUsual(s).minimum;assert.equal(min,120+160+57*3+Math.floor(s.core.casks[0].litres/.7)*3);
 // Deliberate financial boundary projections, never replayed as valid saves.
 for(const cash of [0,min-1]){const poor=clone(s);poor.core.cash=cash;const before=JSON.stringify(poor);assert.equal(D.canBeginUsual(poor).ok,false);assert.match(D.canBeginUsual(poor).reason,new RegExp('£'+min+' 必要'));assert.throws(()=>D.beginUsual(poor));assert.equal(JSON.stringify(poor),before);}
 const enough=clone(s);enough.core.cash=min;assert.equal(D.canBeginUsual(enough).ok,true);const active=D.beginUsual(enough);assert.equal(active.core.cash,min-120);assert.equal(active.usual.reservation.status,'active');
 const empty=clone(s);empty.core.casks=[];empty.core.cash=1;empty.core.lastDistillation=-1;assert.equal(D.usualNeedsClock(empty),false);
});

test('active expensive cask funds remain protected through monthly upkeep',()=>{
 let s=advance(fill(D.newUsualDistillery(42),{progress:80,type:'bourbon'}),1);s=D.beginUsual(D.reserveUsual(s));
 // At a deliberately constrained monthly boundary the reserved bourbon £160,
 // not the cheapest refill £100, must survive. This is a guard projection.
 const bottle=s.core.casks.reduce((n,c)=>n+Math.floor(c.litres/.7)*3,0);s.core.cash=bottle+160+57*3;
 for(let i=0;i<60;i++)s=D.distillStep(s);const before=s.core.month,j=D.tickDistillery(s);assert.equal(j.core.month,before);assert(j.decisions.some(d=>d.eventId==='funds'));assert.equal(j.usual.reservation.status,'active');assert.equal(j.core.cash,s.core.cash);
});

test('tasting, required decisions and offers prevent automatic starting or extraction progress',()=>{
 let s=advance(fill(D.newUsualDistillery(3)),1);s=D.reserveUsual(s);const sampled=D.sampleDistillery(s,s.core.casks[0].id);assert.equal(D.canBeginUsual(sampled).ok,false);assert.equal(D.usualNeedsClock(sampled),false);assert.throws(()=>D.beginUsual(sampled));assert.equal(D.tickDistillery(sampled),sampled);
 let active=D.beginUsual(D.endTasting(sampled));active=D.distillStep(active);active=D.sampleDistillery(active,active.core.casks[0].id);assert.equal(D.distillStep(active),active);assert.equal(D.tickDistillery(active),active);assert.deepEqual(exact(active),active);active=D.endTasting(active);assert.equal(D.distillStep(active).still.distillation.progress,2);
 // Isolated blockers: no synthetic projection is restored or serialized.
 for(const block of [x=>x.decisions=[{eventId:'funds'}],x=>x.trade.offer={kind:'proposal'}]){const q=clone(s);block(q);assert.equal(D.canBeginUsual(q).ok,false);assert.throws(()=>D.beginUsual(q));const a=clone(active);block(a);assert.equal(D.distillStep(a),a);}
});

test('manual and automatic extraction preserve concurrent aging, retail demand and monthly charges',()=>{
 let s=release(D.newUsualDistillery(42),{progress:80,type:'bourbon',tier:'high'});s=advance(s,1);s=fill(s,{progress:80,type:'bourbon'});s=advance(s,1);
 let manual=D.startDistillation(s),auto=D.beginUsual(D.reserveUsual(s));
 for(let ticks=1;ticks<=80;ticks++){manual=D.distillStep(manual);auto=D.distillStep(auto);if(ticks===60){manual=advance(manual,1);auto=advance(auto,1);assert.deepEqual(auto.core,manual.core);}}
 manual=D.fillBarrel(D.stopDistillation(manual),'bourbon');assert.deepEqual(auto.core,manual.core);assert.deepEqual(auto.releases,manual.releases);assert.deepEqual(auto.trade,manual.trade);assert(auto.releases[0].sold>s.releases[0].sold);assert.equal(auto.core.month,s.core.month+1);assert.equal(auto.core.casks[0].age,s.core.casks[0].age+1);assert.equal(cashIdentity(auto),0);cold(auto);
});

test('queued, partially active and completed automatic states survive cold replay without double spending',()=>{
 let s=advance(fill(D.newUsualDistillery(42),{progress:80,type:'bourbon'}),1);s=D.reserveUsual(s);cold(s);s=D.beginUsual(s);cold(s);for(let i=0;i<37;i++)s=D.distillStep(s);cold(s);s=exact(s);for(let i=37;i<60;i++)s=D.distillStep(s);s=advance(s,1);cold(s);s=exact(s);const costs=s.core.totals.costs,casks=s.core.casks.length;for(let i=60;i<80;i++)s=D.distillStep(s);assert.equal(s.core.casks.length,casks+1);assert.equal(s.core.totals.costs,costs+160);cold(s);const done=exact(s);assert.equal(D.distillStep(done),done);assert.equal(done.core.casks.length,casks+1);assert.equal(cashIdentity(done),0);
});

test('usual metadata, duplicate completion and fabricated reservations fail strict replay',()=>{
 let s=advance(fill(D.newUsualDistillery(42),{progress:64,type:'bourbon'}),1);s=runAutomatic(D.reserveUsual(s)).s;
 for(const edit of [x=>x.usual.recipe.stopAt++,x=>x.usual.recipe.type='refill',x=>x.usual.reservation={status:'queued',recipe:clone(x.usual.recipe)},x=>x.operations.push({key:'complete-usual'}),x=>x.operations.splice(x.operations.findIndex(o=>o.key==='reserve-usual'),1),x=>x.core.totals.costs-=120]){const bad=clone(s);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}assert.deepEqual(exact(s),s);
});

test('v10 without a reservation preserves regular wholesale and special-order execution',()=>{
 for(const name of ['partners-accepted.json','partners-due.json']){let old=D.enableReputation(loadFixture(name)),fresh=D.enableUsual(old);for(let i=0;i<20;i++){old=advance(old,1);fresh=advance(fresh,1);assert.deepEqual(withoutUsual(fresh),withoutUsual(old));}assert(fresh.records.some(r=>r.channel==='wholesale'));if(name==='partners-due.json')assert(fresh.records.some(r=>r.order?.outcome==='fulfilled'));assert.equal(fresh.usual.reservation,null);assert.equal(cashIdentity(fresh),0);assert.deepEqual(exact(fresh),fresh);}
});

test('minimum and maximum legal extraction recipes complete at the exact step and replay',()=>{
 for(const stopAt of [30,99]){let s=advance(fill(D.newUsualDistillery(42),{progress:stopAt,type:'refill'}),1);const q=D.reserveUsual(s),{s:done,ticks}=runAutomatic(q);assert.equal(ticks,stopAt);assert.equal(done.batchesById[done.core.casks.at(-1).id].cut,(stopAt-30)/70);assert.equal(done.usual.reservation,null);cold(done);}
});

test('usual activation reserves a ledger slot without mutating an exhausted old save projection',()=>{
 // Operation-length boundary only; this is intentionally not a legal save.
 const old=D.newReputationDistillery(4);old.operations=Array.from({length:12000},()=>({key:'placeholder'}));const raw=JSON.stringify(old);assert.throws(()=>D.enableUsual(old),/帳面/);assert.equal(JSON.stringify(old),raw);old.operations.pop();const fresh=D.enableUsual(old);assert.equal(fresh.operations.length,12000);assert.equal(fresh.operations.at(-1).key,'enable-usual');assert.equal(D.enableUsual(fresh),fresh);
});

test('a legally cash-constrained queue preserves all bottling funds and waits without charging',()=>{
 let s=D.newUsualDistillery(9);for(let i=0;i<4;i++){if(i)s=advance(s,1);s=fill(s,{progress:60,type:'refill'});}s=D.bottleBranded(s,s.core.casks[0].id);s=D.reserveUsual(s);assert.equal(s.core.casks.length,3);assert(s.core.cash<D.canBeginUsual(s).minimum);const before=JSON.stringify(s);assert.equal(D.canBeginUsual(s).ok,false);assert.throws(()=>D.beginUsual(s));assert.equal(JSON.stringify(s),before);cold(s);s=D.cancelUsual(s);assert.equal(s.usual.reservation,null);assert.equal(cashIdentity(s),0);assert.deepEqual(exact(s),s);
});

test('unrecorded automatic progress cannot reach or pass its atomic completion target',async()=>{
 const E=await import('../economy.mjs');let s=advance(fill(D.newUsualDistillery(42),{progress:64,type:'bourbon'}),1);s=D.beginUsual(D.reserveUsual(s));
 // Low-level ticks fabricate unreachable partial states: the public function
 // completes atomically at 64. These are never offered as valid save fixtures.
 for(let i=0;i<65;i++){s=E.distillStep(s);if(i>=63)assert.throws(()=>D.restoreDistillery(JSON.stringify(s)),/抽出の進行/);}
});

test('legal special and regular promises ship together, then an idle queue fills exactly one cask',()=>{
 // Public actions preserve real extraction time: a 24-month special cask filled
 // at 111 and an 18-month regular cask filled at 117 both ship at month 135.
 let s=D.enableUsual(loadFixture('partners-accepted.json'));
 function timedManual(state){state=D.startDistillation(state);for(let tick=1;tick<=65;tick++){state=D.distillStep(state);if(tick===60)state=advance(state,1);}return D.fillBarrel(D.stopDistillation(state),'bourbon');}
 s=timedManual(s);const specialId=s.core.casks.at(-1).id;assert.equal(s.core.month,111);s=D.assignOrder(s,specialId);
 s=advance(s,116-s.core.month);s=timedManual(s);const regularId=s.core.casks.at(-1).id;assert.equal(s.core.month,117);s=D.assignCask(s,regularId,s.trade.relationship.terms[0].id);
 s=advance(s,134-s.core.month);assert.deepEqual(s.core.casks.map(c=>[c.id,c.age]),[[specialId,23],[regularId,17]]);s=D.reserveUsual(s);cold(s);
 const cash=s.core.cash,costs=s.core.totals.costs,revenue=s.core.totals.revenue;s=advance(s,1);assert.equal(s.core.month,135);assert.equal(s.core.casks.length,0);const shipments=clone(s.trade.lastShipments);assert.equal(shipments.length,2);assert.deepEqual(new Set(shipments.map(r=>r.caskId)),new Set([specialId,regularId]));assert.equal(shipments.find(r=>r.caskId===specialId).outcome,'fulfilled');assert.equal(s.core.totals.revenue,round(revenue+shipments.reduce((n,r)=>n+r.gross,0)));assert.equal(s.core.totals.costs,round(costs+shipments.reduce((n,r)=>n+r.cost,0)));assert.equal(s.core.cash,round(cash+shipments.reduce((n,r)=>n+r.net,0)-s.core.lastMonth.upkeep));assert.equal(s.usual.reservation.status,'queued');assert.equal(D.usualNeedsClock(s),true);cold(s);
 const before=s.core.totals.costs;const result=runAutomatic(s,{monthly:true});s=result.s;assert.equal(result.ticks,65);assert.equal(s.core.month,136);assert.equal(s.core.casks.length,1);assert.equal(s.core.totals.costs,before+280);assert.equal(s.usual.reservation,null);assert.equal(D.usualNeedsClock(s),false);assert.equal(s.trade.lastShipments.length,0);assert.equal(s.records.filter(r=>[specialId,regularId].includes(r.caskId)).length,2);assert.equal(D.contractFor(s,s.core.casks[0].id),null);assert.equal(cashIdentity(s),0);cold(s);assert.equal(D.distillStep(s),s);
});
