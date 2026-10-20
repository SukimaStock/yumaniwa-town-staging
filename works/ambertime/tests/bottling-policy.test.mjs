import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {fill,advance,resolve} from './brands-helpers.mjs';
import {automaticEvents,noticeText} from '../event-notices.mjs';
const round=x=>Math.round(x*100)/100;
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/bottling-policy-legacy.json',import.meta.url),'utf8'));
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return D.restoreDistillery(raw);}
function fresh(n=2){let s=fill(D.newBottlingPolicyDistillery(42),{progress:65,type:'refill'}),first=s.core.casks[0].id;s=D.bottleBranded(s,first,{},1);s=D.hireBottlingStaff(s);for(let i=1;i<n;i++)s=fill(advance(s,1),{progress:65,type:'refill'});return s;}
const id=s=>s.core.casks[0].id;
function unchanged(s,fn){const raw=JSON.stringify(s);assert.throws(fn);assert.equal(JSON.stringify(s),raw);}
function complete(s){for(let n=0;s.usual.reservation?.status==='active';n++){assert(n<100);s=D.distillStep(s);}return s;}

test('shared policy is explicit opt-in; future edits preserve existing reservations and untouched casks',()=>{
 let s=fresh(2),[a,b]=s.core.casks.map(c=>c.id);assert.equal(D.commonBottlingPolicy(s),null);unchanged(s,()=>D.delegateBottling(s,a));
 const original=JSON.stringify(s),draft={mode:'age',age:6,count:10};D.operationDefaults(s).auto.count=55;D.commonBottlingPolicy(s);draft.age=7;assert.equal(JSON.stringify(s),original,'reading or drafting is not a saved action');
 s=D.setBottlingPolicy(s,{mode:'age',age:6,count:10},{threshold:9});assert.deepEqual(D.commonBottlingPolicy(s),{mode:'age',count:10,age:6});assert.equal(s.automation.reservations.length,0);assert.equal(D.operationDefaults(s).auto.threshold,9);
 s=D.delegateBottling(s,a);const first=structuredClone(D.bottlingReservation(s,a));assert.equal(first.policyRevision,1);assert.equal(D.delegateBottling(s,a),s,'active opt-in cannot overwrite the snapshot');
 s=D.setBottlingPolicy(s,{mode:'stock',threshold:3,count:8},{age:18});assert.deepEqual(D.bottlingReservation(s,a),first);assert.equal(D.bottlingReservation(s,b),null);s=D.delegateBottling(s,b);assert.equal(D.bottlingReservation(s,b).policyRevision,2);assert.equal(D.bottlingReservation(s,b).mode,'stock');
 s=fill(advance(s,1),{progress:65,type:'refill'});assert.equal(D.bottlingReservation(s,s.core.casks.at(-1).id),null,'new casks never inherit delegation');cold(s);
});

test('paused opt-in resumes its original revision; completed work can explicitly use the new policy',()=>{
 let s=fresh(1),a=id(s);s=D.setBottlingPolicy(s,{mode:'age',age:2,count:10});s=D.delegateBottling(s,a);s=D.pauseBottling(s,a);const paused=D.bottlingReservation(s,a);s=D.setBottlingPolicy(s,{mode:'stock',threshold:5,count:8});s=D.delegateBottling(s,a);assert.deepEqual(D.bottlingReservation(s,a),{...paused,status:'active'});s=advance(s,2);assert.equal(D.bottlingReservation(s,a).status,'completed');assert.equal(s.automation.lastBottlings[0].count,10);s=D.delegateBottling(s,a);const resumed=D.bottlingReservation(s,a);assert.equal(resumed.mode,'stock');assert.equal(resumed.policyRevision,2);assert.equal(resumed.count,8);cold(s);
});

test('invalid policy, unapproved worker and unsupported display defaults are atomic',()=>{
 const bare=fill(D.newBottlingPolicyDistillery(42),{progress:65});unchanged(bare,()=>D.setBottlingPolicy(bare,{mode:'age',age:6,count:10}));const s=fresh(1);
 for(const o of [{mode:'bad',age:6,count:10},{mode:'age',age:-1,count:1},{mode:'age',age:1201,count:1},{mode:'age',age:6,count:58},{mode:'stock',threshold:1000,count:10},{mode:'stock',threshold:5,count:10,age:6},{mode:'age',age:6,count:10,extra:true}])unchanged(s,()=>D.setBottlingPolicy(s,o));
 for(const d of [{age:-1},{threshold:1000},{mode:'age'}])unchanged(s,()=>D.setBottlingPolicy(s,{mode:'stock',threshold:5,count:10},d));
 const t=D.setBottlingPolicy(s,{mode:'stock',threshold:5,count:10},{age:18});assert.equal(D.operationDefaults(t).auto.age,18);assert.equal(D.operationDefaults(t).auto.threshold,5);cold(t);
});

test('paid residual stock bottling preserves manual count and charges exactly once',()=>{
 let s=fresh(1),a=id(s);s=D.bottleBranded(s,a,{},D.quote(s,a).count-8);const remembered=D.operationDefaults(s).bottleCount;s=D.setBottlingPolicy(s,{mode:'stock',threshold:5,count:10});s=D.delegateBottling(s,a);const before=s.core.cash,cost=s.core.totals.costs;s=D.tickDistillery(s);const b=s.automation.lastBottlings[0];assert.equal(b.count,8);assert.equal(b.cost,24);assert.equal(b.salary,2);assert.equal(s.core.totals.costs,cost+26);assert.equal(s.core.cash,round(before+s.core.lastMonth.revenue-s.core.lastMonth.upkeep-26));assert.equal(D.operationDefaults(s).bottleCount,remembered);assert.equal(s.core.casks.length,0);assert(s.core.archive[0].litres>=0&&s.core.archive[0].litres<.7);const next=advance(s,1);assert.equal(next.automation.lastBottlings.length,0);assert.equal(next.core.totals.costs,s.core.totals.costs);cold(s);
});

test('age bottling, pause/cancel/manual switch and funds rollback retain policy and defaults',()=>{
 let s=fresh(1),a=id(s);s=D.setBottlingPolicy(s,{mode:'age',age:2,count:10});s=D.delegateBottling(s,a);s=D.pauseBottling(s,a);s=advance(s,3);assert.equal(s.automation.lastBottlings.length,0);s=D.cancelBottling(s,a);s=D.bottleBranded(s,a,{},3);assert.equal(D.operationDefaults(s).bottleCount,3);assert.equal(D.commonBottlingPolicy(s).age,2);assert.equal(D.bottlingReservation(s,a),null);cold(s);
 let t=fresh(1);a=id(t);t=D.setBottlingPolicy(t,{mode:'stock',threshold:5,count:10});t=D.delegateBottling(t,a);const good=JSON.stringify(t),prefs=D.operationDefaults(t),policy=D.commonBottlingPolicy(t),poor=structuredClone(t);poor.core.cash=25;const failed=D.tickDistillery(poor);assert.equal(failed.core.month,poor.core.month);assert.equal(failed.core.cash,25);assert(failed.decisions.some(d=>d.eventId==='funds'));assert.equal(failed.automation.lastBottlings.length,0);assert.deepEqual(D.operationDefaults(failed),prefs);assert.deepEqual(D.commonBottlingPolicy(failed),policy);assert.equal(JSON.stringify(t),good);cold(t);
});

test('manual stop, cask, count and request mode survive automatic work and cold restoration',()=>{
 let s=fresh(1),source=id(s);s=advance(s,1);s=D.startDistillation(s);for(let n=0;n<37;n++)s=D.distillStep(s);s=D.stopDistillation(s);assert.equal(D.operationDefaults(s).stopAt,37);s=D.fillBarrel(s,'bourbon');const special=s.core.casks.at(-1).id;s=D.bottleBranded(s,special,{},6);assert.equal(D.operationDefaults(s).caskType,'bourbon');assert.equal(D.operationDefaults(s).bottleCount,6);s=D.hireStaff(s);s=D.reserveStaff(s,source,'three');assert.equal(D.operationDefaults(s).requestMode,'three');s=advance(s,1);s=complete(D.beginUsual(s));const defaults=D.operationDefaults(s);assert.equal(defaults.stopAt,37);assert.equal(defaults.caskType,'bourbon');assert.equal(defaults.bottleCount,6);assert.equal(defaults.requestMode,'three');cold(s);
});

test('legacy byte fixtures remain exact and active extraction37 enables without resetting work',()=>{
 for(const key of ['before','after']){const item=fixture[key],s=D.restoreDistillery(item.raw);assert.equal(createHash('sha256').update(D.serializeDistillery(s)).digest('hex'),item.sha256);assert.equal(D.serializeDistillery(s),item.raw);assert.equal(D.bottlingPolicyMode(s),false);}
 const old=D.restoreDistillery(fixture.before.raw),s=D.enableBottlingPolicy(old);assert.equal(old.still.distillation.progress,37);for(const key of ['core','still','usual','staff','staffProgression','automation','shop','shopDemand','releases','brands'])assert.deepEqual(s[key],old[key]);assert.equal(D.operationDefaults(s).stopAt,65);assert.equal(D.operationDefaults(s).caskType,'refill');assert.equal(D.commonBottlingPolicy(s),null);cold(s);
 let after=advance(old,1);after=complete(after);const source=after.core.casks[0].id;after=D.bottleBranded(after,source,{},1);after=D.hireBottlingStaff(after);after=D.reserveBottling(after,source,{mode:'age',age:6,count:10});after=advance(after,4);assert.equal(D.serializeDistillery(after),fixture.after.raw);
});

test('strict restore rejects altered preferences, policy revision, snapshots and confirmed opcodes',()=>{
 let s=fresh(2);s=D.setBottlingPolicy(s,{mode:'age',age:6,count:10},{threshold:9});s=D.delegateBottling(s,id(s));cold(s);
 for(const edit of [x=>x.workPreferences.last.stopAt=99,x=>x.workPreferences.last.caskType='bourbon',x=>x.workPreferences.last.bottleCount=5,x=>x.workPreferences.last.auto.threshold++,x=>x.workPreferences.last.requestMode='continuous',x=>x.workPreferences.bottlingPolicy.count++,x=>x.workPreferences.policyRevision++,x=>x.automation.reservations[0].policyRevision++,x=>x.automation.reservations[0].count++,x=>x.operations.splice(x.operations.findIndex(o=>o.key==='bottling-policy-set'),1)]){const bad=structuredClone(s);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}
});

test('quiet monthly shortages and zero orders stay in ledger while real production and sales notify',()=>{
 const before={workPreferences:{version:1},core:{month:2,casks:[]},usual:{reservation:null}},after={workPreferences:{version:1},core:{month:3,casks:[],lastMonth:{bottles:0,revenue:0}},shopDemand:{lastOrders:[{requested:10,shipped:0,unmet:10}]},automation:{lastBottlings:[]}};
 const raw=JSON.stringify(after);assert.deepEqual(automaticEvents(before,after),[]);assert.equal(JSON.stringify(after),raw);const zero=structuredClone(after);zero.shopDemand.lastOrders=[{requested:0,shipped:0,unmet:0}];assert.deepEqual(automaticEvents(before,zero),[]);
 const real=structuredClone(after);real.shopDemand.lastOrders=[{requested:10,shipped:3,unmet:7}];real.automation.lastBottlings=[{month:3,productId:7,count:8}];real.core.lastMonth={bottles:5,revenue:80};const events=automaticEvents(before,real);assert.deepEqual(events.map(x=>x.kind),['bottled','shipping','sales']);assert.match(noticeText(events),/ビン詰め 8本/);assert.match(noticeText(events),/発送 3本/);assert.match(noticeText(events),/販売 5本/);assert(!noticeText(events).includes('未発送'));
 const filling={...before,usual:{reservation:{status:'active'}}},filled={...after,core:{...after.core,casks:[{id:9}]}};assert.equal(automaticEvents(filling,filled)[0].kind,'filled');assert.deepEqual(automaticEvents(real,real),[]);
});
