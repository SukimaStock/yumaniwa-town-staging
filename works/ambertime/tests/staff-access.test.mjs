import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {roomStaffAccess} from '../staff-access-view.mjs';
import {layoutScene,computeViewport,projectRect} from '../canvas-layout.mjs';
const source=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const open=source.slice(source.indexOf('function openRoomStaff('),source.indexOf('function staffCostView('));
const locked={unlocked:false,hired:false},available={unlocked:true,hired:false,canHire:false},hired={unlocked:true,hired:true};
for(const room of ['distill','warehouse','sales'])for(const d of [locked,available,hired])for(const b of [locked,available,hired])test(`${room} distill=${d.unlocked}/${d.hired} bottler=${b.unlocked}/${b.hired}`,()=>{
 const input={distill:d,bottling:b},before=JSON.stringify(input),a=roomStaffAccess(room,input),status=room==='distill'?d:b;
 if(room==='sales'||!status.unlocked)assert.equal(a,null);else {assert.equal(a.job,room==='distill'?'distill':'bottling');assert.equal(a.kind,!status.hired?'staff-opportunity':room==='distill'?'staff-panel':'bottler-panel');}
 assert.equal(JSON.stringify(input),before);
});
function harness(room,distill,bottling,{modal=null,failSave=false,notices=[]}={}){
 const calls=[],game={usual:{reservation:{status:'active'}},automation:{reservations:[{id:7}]}};
 const ctx={game,room,modal,preview:false,canSave:!failSave,roomStaffAccess,deliveryNotice:'',countdown:{cancel:()=>calls.push('cancel-countdown')},stopClock:()=>calls.push('stop'),render:()=>calls.push('render'),D:{staffStatus:()=>distill,bottlingStaffStatus:()=>bottling,staffOpportunities:()=>notices}};
 vm.createContext(ctx);vm.runInContext(open,ctx);return {ctx,calls,raw:JSON.stringify(game)};
}
test('native room handler opens working staff directly without changing reservations or game',()=>{
 for(const [room,kind] of [['distill','staff-panel'],['warehouse','bottler-panel']]){
  const h=harness(room,hired,hired);h.ctx.openRoomStaff();assert.equal(h.ctx.modal.kind,kind);assert.equal(JSON.stringify(h.ctx.game),h.raw);assert.deepEqual(h.calls,['cancel-countdown','stop','render']);
 }
});
test('unhired reentry preserves opportunity acknowledgement and permits viewing unaffordable terms',()=>{
 for(const job of ['distill','bottling'])for(const pending of [true,false]){
  const h=harness(job==='distill'?'distill':'warehouse',available,available,{notices:pending?[{kind:job}]:[]});h.ctx.openRoomStaff();assert.equal(h.ctx.modal.kind,'staff-opportunity');assert.equal(h.ctx.modal.job,job);assert.equal(h.ctx.modal.noticePending,pending);assert.equal(h.ctx.modal.source,'room');assert.equal(JSON.stringify(h.ctx.game),h.raw);
 }
});
test('sales, locked role, active modal and failed-save mode do not open a manager or any staff screen',()=>{
 const rows=[harness('sales',hired,hired),harness('warehouse',hired,locked),harness('distill',locked,hired),harness('distill',hired,hired,{modal:{kind:'inspect'}}),harness('distill',hired,hired,{failSave:true})];
 for(const h of rows){const modal=h.ctx.modal;h.ctx.openRoomStaff();assert.equal(h.ctx.modal,modal);assert.deepEqual(h.calls,[]);}
});
test('successful direct hire enters correct settings; failed action retains hiring screen',()=>{
 const handler=source.split('\n').find(s=>s.includes("if(a==='staff-opportunity-hire'"));
 for(const job of ['distill','bottling'])for(const saved of [true,false]){
  const calls=[],ctx={a:'staff-opportunity-hire',kind:'staff-opportunity',b:{dataset:{id:job}},modal:{kind:'staff-opportunity',job,source:'room'},D:{hireStaff:'distill-op',hireBottlingStaff:'bottling-op'},act:(op,done)=>{calls.push(op);if(saved)done();}};vm.createContext(ctx);vm.runInContext('(function(){'+handler+'})()',ctx);assert.deepEqual(calls,[job+'-op']);assert.equal(ctx.modal.kind,saved?(job==='distill'?'staff-panel':'bottler-panel'):'staff-opportunity');
 }
});
test('panels close to room; existing recipe and bottling nested actions remain available',()=>{
 for(const kind of ['staff-panel','bottler-panel']){const branch=source.split('\n').find(s=>s.includes("}else if(kind==='"+kind+"')"));assert.match(branch,/button\('閉じる','cancel'\)/);}
 assert.match(source,/addEventListener\('click',openRoomStaff\)/);assert.match(source,/openStaffRequest\(\)/);assert.match(source,/D.setBottlingPolicy\(s,plan,displayDefaults\)/);assert.match(source,/D.delegateBottling\(D.endTasting\(s\),id\)/);
});
for(const [width,height] of [[360,568],[375,620],[390,680],[430,740],[1280,800]])test(`existing icon geometry ${width}x${height} follows room access`,()=>{
 for(const room of ['distill','warehouse','sales']){
  const access=roomStaffAccess(room,{distill:hired,bottling:hired}),l=layoutScene({room,phase:'ready',staffAvailable:!!access,mapAvailable:true,marketMode:room==='sales',casks:[],products:[]}),a=l.controls.find(c=>c.key==='open-staff-panel');
  if(room==='sales'){assert.equal(a,undefined);continue;}assert(a);const r=projectRect(computeViewport({width,height},1),a);assert(r.x>=0&&r.y>=0&&r.x+r.width<=width+.01&&r.y+r.height<=height+.01);
 }
});
test('warehouse staff label never appends the distiller work status',()=>{
 assert.match(source,/staffBrief:room==='distill'&&\(staff.hired\|\|reservation\)\?staffBrief:''/);
});
