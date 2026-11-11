import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import * as D from '../partner-orders.mjs';
import {fill,advance} from './brands-helpers.mjs';
import {automaticEvents,noticeText} from '../event-notices.mjs';
import {serializeSession,readSession} from '../development-save.mjs';
import {sessionFor} from './regional-delivery-helpers.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const cold=s=>{const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return D.restoreDistillery(raw);};
function legacy(n=2){let s=fill(D.newBottlingRolesDistillery(42),{progress:65});s=D.bottleBranded(s,s.core.casks[0].id,{},1);for(let i=1;i<n;i++)s=fill(advance(s,1),{progress:65});return s;}
const enable=D.enableBottlingAssignment;

test('new factory has the12month10bottle one-shot default; old factory and exact fixtures remain unchanged',()=>{
 const s=D.newBottlingAssignmentDistillery(42);assert(D.bottlingAssignmentMode(s));assert.deepEqual(D.commonBottlingPolicy(s),{mode:'age',count:10,age:12});assert.equal(s.automation.reservations.length,0);cold(s);
 const old=D.newWorldNetworkDistillery(42);assert.equal(D.bottlingAssignmentMode(old),false);assert.equal(D.commonBottlingPolicy(old),null);assert.equal(D.operationDefaults(old).auto.age,24);cold(old);
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/bottling-policy-legacy.json',import.meta.url)));for(const item of [fixture.before,fixture.after])assert.equal(D.serializeDistillery(D.restoreDistillery(item.raw)),item.raw);
});
test('hire assigns existing casks and subsequent manual fill; existing conditions remain snapshots',()=>{
 let s=enable(legacy(2)),ids=s.core.casks.map(c=>c.id);const cost=s.core.cash;s=D.hireBottlingStaff(s);assert.equal(s.core.cash,cost-20);assert.deepEqual(s.automation.reservations.map(r=>r.caskId),ids);for(const id of ids)assert.equal(D.bottlingReservation(s,id).age,12);
 const frozen=structuredClone(s.automation.reservations);s=D.setBottlingPolicy(s,{mode:'age',age:18,count:5});assert.deepEqual(s.automation.reservations,frozen);s=fill(advance(s,1),{progress:65});const r=D.bottlingReservation(s,s.core.casks.at(-1).id);assert.equal(r.age,18);assert.equal(r.count,5);assert.deepEqual(s.automation.reservations.slice(0,2),frozen);cold(s);
});
test('migration preserves existing active paused completed and manual choices without assigning retroactively',()=>{
 let old=legacy(3);old=D.hireBottlingStaff(old);const [a,b,c]=old.core.casks.map(c=>c.id);old=D.setBottlingPolicy(old,{mode:'age',age:50,count:7});old=D.delegateBottling(old,a);old=D.delegateBottling(old,b);old=D.pauseBottling(old,b);const raw=D.serializeDistillery(old),snapshot=structuredClone(old.automation),policy=D.commonBottlingPolicy(old),s=enable(old);assert.deepEqual(s.automation,snapshot);assert.deepEqual(D.commonBottlingPolicy(s),policy);assert.equal(D.bottlingReservation(s,c),null);assert.equal(D.serializeDistillery(old),raw);assert.equal(enable(s),s);cold(old);cold(s);
});
test('pause/resume retains original policy; explicit manual cancellation and delegation uses latest policy',()=>{
 let s=D.hireBottlingStaff(enable(legacy(1))),id=s.core.casks[0].id;s=D.pauseBottling(s,id);const original=D.bottlingReservation(s,id);s=D.setBottlingPolicy(s,{mode:'stock',threshold:5,count:1});s=D.delegateBottling(s,id);assert.deepEqual(D.bottlingReservation(s,id),{...original,status:'active'});s=D.cancelBottling(s,id);s=D.delegateBottling(s,id);assert.equal(D.bottlingReservation(s,id).mode,'stock');assert.equal(D.bottlingReservation(s,id).count,1);assert(D.bottlingReservation(s,id).order>original.order);cold(s);
});
test('paid usual fill receives automatic snapshot without extra hire salary or operation records',()=>{
 let s=D.hireBottlingStaff(enable(legacy(1))),id=s.core.casks[0].id;s=D.hireStaff(s);s=D.reserveStaff(s,id,'once');s=advance(s,1);s=D.beginUsual(s);for(let n=0;s.usual.reservation?.status==='active';n++){assert(n<100);s=D.distillStep(s);}const added=s.core.casks.at(-1).id;assert.notEqual(added,id);assert.equal(D.bottlingReservation(s,added).age,12);assert.equal(s.operations.at(-1).key,'complete-usual');assert.equal(s.operations.filter(o=>o.key==='bottling-staff-hire').length,1);cold(s);
});
test('final completion is a committed transition, while stock waiting or paused work prevents final notice',()=>{
 let s=D.hireBottlingStaff(enable(legacy(2)));for(const c of s.core.casks)s=D.reserveBottling(s,c.id,{mode:'age',age:0,count:1});const before=s,after=advance(s,1),events=automaticEvents(before,after);assert.equal(events.filter(e=>e.kind==='bottling-finished').length,1);assert.match(noticeText(events),/すべて終わりました/);assert(events.some(e=>e.kind==='bottled'));assert.deepEqual(automaticEvents(after,after),[]);cold(after);
 for(const status of ['active','paused']){const waiting=structuredClone(after);waiting.automation.reservations.push({caskId:99,status,mode:'stock'});assert(!automaticEvents(before,waiting).some(e=>e.kind==='bottling-finished'));}
});
test('stock remains repeatable with global once-per-month guard and no minimum age',()=>{
 let s=D.hireBottlingStaff(enable(legacy(2)));for(const c of s.core.casks)s=D.reserveBottling(s,c.id,{mode:'stock',threshold:5,count:1});for(let n=0;n<3;n++){const before=s;s=advance(s,1);assert.equal(s.automation.lastBottlings.length,1);assert.equal(s.automation.lastBottlings[0].count,1);assert.equal(s.bottlingRoles.lastStockMonth,s.core.month);assert(!automaticEvents(before,s).some(e=>e.kind==='bottling-finished'));}cold(s);
});
test('boundary and automatic assignments reject forged marker snapshots or omitted replay boundary',()=>{
 const s=D.hireBottlingStaff(enable(legacy(1)));for(const edit of [x=>x.bottlingAssignment.version=2,x=>x.automation.reservations[0].age++,x=>x.operations.splice(x.operations.findIndex(o=>o.key==='enable-bottling-assignment'),1)]){const bad=structuredClone(s);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}cold(s);
});
test('formal v8 envelope roundtrip retains new boundary with exact cash stock reservations',()=>{
 const s=D.newBottlingAssignmentDistillery(42),session=sessionFor(s),options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs},raw=serializeSession(s,session,options),restored=readSession(raw,options);assert.deepEqual(restored.game,s);assert.equal(serializeSession(restored.game,restored,options),raw);
});

test('actual manual and staff controls separate cancellation from pause/resume and display completed conditions',()=>{
 const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 const quote=app.slice(app.indexOf('function quoteModal('),app.indexOf('function reservationLabel('));
 let s=D.hireBottlingStaff(enable(legacy(1))),id=s.core.casks[0].id;
 const manual=new Function('D','initial','id',`let game=initial,modal=null;const stopClock=()=>{},render=()=>{},act=(fn,done)=>{game=fn(game);done?.();};${quote};quoteModal(id);return {game,modal};`);
 const result=manual(D,s,id);assert.equal(D.bottlingReservation(result.game,id),null);assert.equal(result.modal.kind,'quote');
 const branch=app.slice(app.indexOf(" if(a==='bottling-toggle'"),app.indexOf(" if(a==='staff-bottle-plan'"));
 const toggle=new Function('D','initial','id','a',`let game=initial,modal={kind:'bottler-panel'},kind='bottler-panel';const act=(fn,done)=>{game=fn(game);done?.();},render=()=>{},$=()=>({querySelector:()=>({scrollIntoView(){}})});function handle(){${branch}}handle();return game;`);
 const manualState=toggle(D,s,id,'bottling-toggle');assert.equal(D.bottlingReservation(manualState,id),null);
 const paused=toggle(D,s,id,'bottling-pause');assert.equal(D.bottlingReservation(paused,id).status,'paused');const changed=D.setBottlingPolicy(paused,{mode:'stock',threshold:5,count:1}),resumed=toggle(D,changed,id,'bottling-resume');assert.equal(D.bottlingReservation(resumed,id).age,12);assert.equal(D.bottlingReservation(resumed,id).count,10);
 const reassigned=toggle(D,D.setBottlingPolicy(manualState,{mode:'stock',threshold:5,count:1}),id,'bottling-toggle');assert.equal(D.bottlingReservation(reassigned,id).mode,'stock');
 const policySource=app.slice(app.indexOf('function reservationLabel('),app.indexOf('const bottlingPolicyMax='));
 s=D.reserveBottling(s,id,{mode:'age',age:0,count:1});s=advance(s,1);
 const label=new Function('D','game','id',`${policySource};return reservationLabel(id);`)(D,s,id);assert.match(label,/完了.*熟成0か月.*1本/);
});
