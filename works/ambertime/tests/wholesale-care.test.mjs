import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import * as E from '../economy.mjs';
import {loadFixture,oldRoughPending,fourCasks,fill,resolveOrdinary,exact,cashIdentity,round} from './wholesale-care-helpers.mjs';
const copy=structuredClone;
const ordinary=new Set(['rough','wood','fading','fruit','rounded','loss']);

test('old v6 legal rough/cool prompt reproduces; explicit v7 transition records observation, never wait or cooling',()=>{const {s:old,id}=oldRoughPending(),raw=D.serializeDistillery(old),pending=copy(old.notesById[id].pending),profile=copy(D.currentCask(old,id));assert.equal(old.version,6);assert.equal(pending.id,'rough');assert(pending.options.some(o=>o.id==='cool'));assert(old.decisions.some(d=>d.caskId===id));const s=D.enablePromisedCare(old);assert.equal(s.version,7);assert.equal(s.notesById[id].pending,null);assert(!s.decisions.some(d=>d.caskId===id));assert.deepEqual(D.currentCask(s,id),profile);assert.deepEqual(s.notesById[id].choices,old.notesById[id].choices);assert.equal(s.notesById[id].observations.at(-1).eventId,'rough');assert(D.canCare(s,id));assert.equal(D.serializeDistillery(old),raw);exact(old);exact(s);assert.equal(D.enablePromisedCare(s),s);});

test('four normal bookings advance through ordinary changes and fulfill without decision stops or fictional choices',()=>{let s=fourCasks(),ids=s.core.casks.map(c=>c.id),observations=0;assert.equal(ids.length,4);const contracts=copy(s.trade.contracts);for(let i=0;i<19;i++){assert.equal(s.decisions.length,0);if(s.trade.offer)s=D.declineOffer(s);const m=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,m+1);observations+=s.trade.lastObservations.length;assert.equal(cashIdentity(s),0);}assert(observations>0);for(const id of ids){const r=s.records.find(r=>r.caskId===id);assert(r);assert.equal(r.channel,'wholesale');assert.equal(r.age,contracts.find(k=>k.caskId===id).targetAge);assert(!r.choices.some(c=>c.key==='wait'||c.key==='cool'));}exact(s);});

test('three booked plus one managed cask retain only unmanaged maturity decisions',()=>{let s=fourCasks({unbooked:true}),id=s.core.casks.at(-1).id,events=0;for(let i=0;i<17;i++){for(const d of s.decisions){assert.equal(d.caskId,id);assert(ordinary.has(d.eventId));events++;}s=resolveOrdinary(s);if(s.trade.offer)s=D.declineOffer(s);s=D.tickDistillery(s);}assert(events>0);assert(D.currentCask(s,id));exact(s);});

test('same-month normal changes clear each pending queue independently without altering chemistry',()=>{let s=fourCasks(),ids=s.core.casks.map(c=>c.id); // Boundary injection isolates concurrent events, not a legal save fixture.
for(const c of s.core.casks){c.age=5;c.filledMonth=s.core.month-5;c.batchMonth=c.filledMonth;c.roughness=.8;c.wood=.1;const n=s.notesById[c.id];n.seen=[];n.lastEventAge=-6;n.pending=null;n.phase='watching';}s.decisions=[];const projected=E.economicMonthly(s,s.core.month),j=D.tickDistillery(s);assert.equal(j.trade.lastObservations.filter(o=>o.eventId==='rough').length,4);assert.equal(j.decisions.length,0);for(const id of ids){assert.deepEqual(D.currentCask(j,id),D.currentCask(projected,id));assert.equal(j.notesById[id].pending,null);assert(!j.notesById[id].choices.some(o=>o.key==='wait'));}});

test('optional care is explicit, one-time, recorded real cooling and survives strict replay',()=>{let {s,id}=oldRoughPending();s=D.enablePromisedCare(s);const before=copy(D.currentCask(s,id)),cash=s.core.cash;s=D.careForCask(s,id);assert.equal(s.core.cash,cash);assert(s.notesById[id].cooled);assert(s.notesById[id].choices.some(c=>c.key==='cool'));assert.equal(s.operations.at(-1).key,'care');assert.notDeepEqual(D.currentCask(s,id).variation,before.variation);assert.equal(D.canCare(s,id),false);assert.throws(()=>D.careForCask(s,id));assert(D.contractFor(s,id));exact(s);});

test('free tasting blocks one global tick and ending it restores unchanged promises and future advancement',()=>{let s=fourCasks(),id=s.core.casks[0].id,k=copy(D.contractFor(s,id));s=D.sampleDistillery(s,id);assert.equal(D.tickDistillery(s),s);exact(s);s=D.endTasting(s);assert.equal(s.tastingId,null);assert.deepEqual(D.contractFor(s,id),k);const m=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,m+1);exact(s);});

test('cancelling one promise restores future ordinary prompts while other bookings stay quiet',()=>{let s=fourCasks(),id=s.core.casks.at(-1).id;s=D.cancelContract(s,id);assert.equal(D.canCare(s,id),false);let found=false;for(let i=0;i<12;i++){if(s.decisions.some(d=>d.caskId===id)){found=true;break;}if(s.trade.offer)s=D.declineOffer(s);s=D.tickDistillery(s);}assert(found);assert(s.decisions.every(d=>d.caskId===id));assert.equal(s.trade.contracts.length,3);exact(s);});

test('same-month normal shipment settles each cask once and cash/costs remain exact',()=>{let s=fourCasks(); // Boundary age alignment: shipment transaction, not claimed legal history.
for(const c of s.core.casks){const k=D.contractFor(s,c.id);c.age=k.targetAge-1;c.filledMonth=s.core.month-c.age;c.batchMonth=c.filledMonth;}const ids=s.core.casks.map(c=>c.id),cash=s.core.cash,costs=s.core.totals.costs,m=s.core.month;s=D.tickDistillery(s,m);assert.equal(s.trade.lastShipments.length,4);assert.equal(s.core.casks.length,0);assert.equal(new Set(s.trade.lastShipments.map(k=>k.caskId)).size,4);assert.equal(s.core.cash,round(cash+s.core.lastMonth.revenue-s.core.lastMonth.upkeep-(s.core.totals.costs-costs)));assert.throws(()=>D.tickDistillery(s,m));s=D.tickDistillery(s);assert(!s.trade.lastShipments.some(k=>ids.includes(k.caskId)));});

test('funds and unmet special order remain required decisions, with original save replay preserved',()=>{let s=D.enablePromisedCare(loadFixture('partners-unmet.json'));assert.equal(s.decisions[0].eventId,'order-unmet');assert.equal(D.tickDistillery(s),s);exact(s);s=D.enablePromisedCare(loadFixture('v08-legal-funds.json'));assert(s.decisions.some(d=>d.eventId==='funds'));assert.equal(D.tickDistillery(s),s);exact(s);});

function coldExact(s){
 const raw=D.serializeDistillery(s);
 assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw,'warm replay retains every saved byte');
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:8e6}),raw,'fresh-process replay retains every saved byte');
 return raw;
}

test('legal v6 special-order cooling choice survives explicit v7 adoption and cold/warm replay',()=>{
 const source=fs.readFileSync(new URL('./fixtures/partners-assigned.json',import.meta.url),'utf8'),original=loadFixture('partners-assigned.json');
 assert.equal(original.version,6);assert.equal(coldExact(original),source.trimEnd());
 let s=original;const id=s.trade.order.caskId;
 // Actual public monthly operations reach this special cask's wood/cool event.
 // No version, age, chemistry, pending prompt or journal fields are injected.
 for(let guard=0;!s.notesById[id].pending;guard++){
  assert(guard<30,'legal special-order cooling event must be reached');
  s=resolveOrdinary(s);if(s.trade.offer)s=D.declineOffer(s);s=D.tickDistillery(s);
 }
 const pending=copy(s.notesById[id].pending);assert.equal(pending.id,'wood');assert(pending.options.some(o=>o.id==='cool'));
 assert.equal(D.contractFor(s,id).kind,'special');const raw=coldExact(s),j=D.enablePromisedCare(s);
 assert.deepEqual(j.notesById[id].pending,pending);assert.deepEqual(j.decisions,s.decisions);
 assert.deepEqual(j.core,s.core);assert.deepEqual(j.still,s.still);assert.deepEqual(j.trade.contracts,s.trade.contracts);assert.deepEqual(j.trade.order,s.trade.order);
 assert.deepEqual(j.operations.slice(0,-1),s.operations);assert.equal(j.operations.at(-1).key,'enable-promised-care');
 assert.equal(D.serializeDistillery(s),raw);assert.equal(D.enablePromisedCare(j),j);coldExact(j);
 assert.equal(D.serializeDistillery(original),source.trimEnd(),'original legal v6 record remains exact');
});

test('legal legacy funds and unmet-order stops remain required through adoption and fresh replay',()=>{
 for(const [name,event] of [['v08-legal-funds.json','funds'],['partners-unmet.json','order-unmet']]){
  const s=loadFixture(name),raw=coldExact(s),j=D.enablePromisedCare(s);
  assert(s.decisions.some(d=>d.eventId===event));assert.deepEqual(j.decisions,s.decisions);assert.equal(D.tickDistillery(j),j);
  assert.deepEqual(j.core,s.core);assert.deepEqual(j.operations.slice(0,-1),s.operations);assert.equal(j.operations.at(-1).key,'enable-promised-care');
  assert.equal(D.serializeDistillery(s),raw);coldExact(j);
 }
});

test('ordinary booked final prompts become observations while funds stays queued in the existing boundary contract',()=>{
 const original=fill(loadFixture('partners-accepted.json')),id=original.core.casks.at(-1).id,raw=coldExact(original);
 assert.equal(original.version,6);assert.notEqual(D.contractFor(original,id).kind,'special');
 for(const event of ['funds','last','bottle-ready']){
  // Detached boundary injection tests dispatch only. This is deliberately not
  // claimed as a legal old save: no forged version or replay tolerance is used.
  const s=copy(original),pending={id:event,title:event,text:'',options:[{id:'bottle',label:'bottle'}]};
  s.notesById[id].pending=copy(pending);s.notesById[id].phase='choice';s.decisions=[{month:s.core.month,caskId:id,eventId:event,pending:copy(pending)}];
  assert.throws(()=>D.serializeDistillery(s),/状態と操作の帳面が一致しません/,'injected boundary state is not a legal saved career');
  const before=JSON.stringify(s),j=D.enablePromisedCare(s);
  assert.deepEqual(j.core,s.core);assert.deepEqual(j.notesById[id].choices,s.notesById[id].choices);
  assert.deepEqual(j.operations.slice(0,-1),s.operations);assert.equal(j.operations.at(-1).key,'enable-promised-care');
  if(event==='funds'){
   assert.deepEqual(j.notesById[id].pending,pending);assert(j.decisions.some(d=>d.eventId===event));assert.deepEqual(j.trade.lastObservations,[]);
  }else{
   assert.equal(j.notesById[id].pending,null);assert(!j.decisions.some(d=>d.caskId===id));
   const observation=j.trade.lastObservations.find(o=>o.caskId===id&&o.eventId===event);assert(observation);
   assert.deepEqual(observation,{caskId:id,age:s.core.casks.find(c=>c.id===id).age,eventId:event,title:event,text:'',month:s.core.month});
   assert.deepEqual(j.notesById[id].observations.at(-1),observation);
  }
  assert.equal(JSON.stringify(s),before,'boundary input is not mutated');
 }
 // A final decision on an unbooked cask is not a redundant shipping plan.
 const unbooked=fill(loadFixture('partners-accepted.json'),{book:false}),freeId=unbooked.core.casks.at(-1).id;
 assert.equal(D.contractFor(unbooked,freeId),null);coldExact(unbooked);
 for(const event of ['last','bottle-ready']){
  const s=copy(unbooked),pending={id:event,title:event,text:'',options:[{id:'bottle',label:'bottle'}]};
  s.notesById[freeId].pending=copy(pending);s.notesById[freeId].phase='choice';s.decisions=[{month:s.core.month,caskId:freeId,eventId:event,pending:copy(pending)}];
  assert.throws(()=>D.serializeDistillery(s),/状態と操作の帳面が一致しません/);
  const before=JSON.stringify(s),j=D.enablePromisedCare(s);
  assert.deepEqual(j.notesById[freeId].pending,pending);assert(j.decisions.some(d=>d.caskId===freeId&&d.eventId===event));
  assert.equal(JSON.stringify(s),before);assert.deepEqual(j.core,s.core);assert.deepEqual(j.notesById[freeId].choices,s.notesById[freeId].choices);
 }
 assert.equal(D.serializeDistillery(original),raw);
});

test('identical public actions and strict replay preserve independent samples and observation records',()=>{function run(){let s=fourCasks();for(let i=0;i<8;i++){if(s.trade.offer)s=D.declineOffer(s);s=D.tickDistillery(s);for(const c of s.core.casks){s=D.sampleDistillery(s,c.id);s=D.endTasting(s);}}return s;}const a=run(),b=run();assert.deepEqual(a,b);for(const c of a.core.casks)assert(a.notesById[c.id].samples.length>0);exact(a);exact(b);});

test('activation reserves exactly one ledger slot, is idempotent and never mutates a full old ledger',()=>{const limit=E.PARALLEL_PARAMETERS.maxOperations;let old=D.newDistillery(42);old.operations=Array.from({length:limit},()=>({key:'boundary-placeholder'})); // Length boundary only: not claimed replay-valid operations.
const raw=JSON.stringify(old);assert.throws(()=>D.enablePromisedCare(old),/帳面/);assert.equal(JSON.stringify(old),raw);old.operations.pop();const s=D.enablePromisedCare(old);assert.equal(s.operations.length,limit);assert.equal(s.operations.at(-1).key,'enable-promised-care');assert.equal(D.enablePromisedCare(s),s);assert.equal(s.operations.length,limit);});

test('legal old/new action comparison changes only redundant decisions, not chemistry, costs or shipment receipts',()=>{let old=loadFixture('partners-accepted.json');old=fillOld(old);old=D.tickDistillery(old);old=fillOld(old);let current=D.enablePromisedCare(old);for(let i=0;i<19;i++){old=resolveOrdinary(old);if(old.trade.offer)old=D.declineOffer(old);if(current.trade.offer)current=D.declineOffer(current);old=D.tickDistillery(old);current=D.tickDistillery(current);assert.deepEqual(current.core,old.core);assert.deepEqual(current.trade.lastShipments,old.trade.lastShipments);}exact(old);exact(current);function fillOld(s){s=D.startDistillation(s);while(s.still.distillation.progress<99)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'bourbon');return D.assignCask(s,s.core.casks.at(-1).id,s.trade.relationship.terms[0].id);}});
