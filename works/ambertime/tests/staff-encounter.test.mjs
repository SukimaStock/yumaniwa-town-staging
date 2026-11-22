import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {staffEncounterMarkup,staffPortraitCells} from '../staff-encounter-view.mjs';
import {STAFF_ENCOUNTER_TEXT} from '../staff-encounter-text.mjs';
import {sourcePalette} from '../codea-object-art.mjs';
const source=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const funcs=source.slice(source.indexOf('function showStaffOpportunity('),source.indexOf('function staffCostView('));
for(const kind of ['distill','bottling'])test(`${kind}: native palette/grid, entire author line, deterministic and no game data`,async()=>{
 const html=staffEncounterMarkup(kind);assert(html.includes(STAFF_ENCOUNTER_TEXT[kind]));assert.match(html,/viewBox="0 0 16 24" width="48" height="72"/);assert.match(html,/aria-hidden="true"/);assert.equal(html,staffEncounterMarkup(kind));
 for(const c of staffPortraitCells(kind)){assert(Object.values(sourcePalette).includes(c.color));assert([c.x,c.y,c.w,c.h].every(Number.isInteger));assert(c.x>=0&&c.y>=0&&c.x+c.w<=16&&c.y+c.h<=24);}
 assert.doesNotMatch(html,/button|img|script|onload|animation/);
});
test('jobs share silhouette and differ only in apron color; unknown type renders nothing',()=>{
 const shape=k=>staffPortraitCells(k).map(({color,...c})=>c);assert.deepEqual(shape('distill'),shape('bottling'));assert.notEqual(staffEncounterMarkup('distill'),staffEncounterMarkup('bottling'));assert.equal(staffEncounterMarkup('<invalid>'),'');
});
function harness({hidden=false,open=false,fail=false}={}){
 const before={tastingId:null,decisions:[],noticed:false},dialog={open},calls=[];
 const ctx={game:before,modal:null,preview:false,canSave:true,runtimeHalted:false,document:{hidden},$:()=>dialog,
 D:{staffOpportunities:s=>s.noticed?[]:[{kind:'distill'}],noticeStaffOpportunity:(s,k)=>{calls.push('notice:'+k);return {...s,noticed:true}}},
 stopClock:()=>calls.push('stop'),saveCandidate:next=>{calls.push('save');if(fail){ctx.modal=null;return false;}return true;},storageNotice:msg=>calls.push(msg)};
 ctx.actionReady=()=>true;ctx.prepareGame=fn=>fn(ctx.game);
 vm.createContext(ctx);vm.runInContext(funcs,ctx);return {ctx,dialog,calls,before};
}
test('opportunity is not marked until the actual dialog has opened; repeated renders do not repeat notice',async()=>{
 const h=harness();assert.equal(h.ctx.showStaffOpportunity(),true);assert.deepEqual(h.calls,['stop']);assert.equal(h.ctx.game,h.before);await h.ctx.acknowledgeStaffOpportunity();assert.equal(h.calls.length,1);
 h.dialog.open=true;await h.ctx.acknowledgeStaffOpportunity();assert.deepEqual(h.calls,['stop','notice:distill','save']);assert(h.ctx.game.noticed);await h.ctx.acknowledgeStaffOpportunity();assert.equal(h.calls.length,3);
});
test('hidden document postpones acknowledgement; failed save does not publish candidate state',async()=>{
 const h=harness({hidden:true,open:true});h.ctx.showStaffOpportunity();await h.ctx.acknowledgeStaffOpportunity();assert.equal(h.ctx.game,h.before);h.ctx.document.hidden=false;await h.ctx.acknowledgeStaffOpportunity();assert(h.ctx.game.noticed);
 const f=harness({open:true,fail:true});f.ctx.showStaffOpportunity();await f.ctx.acknowledgeStaffOpportunity();assert.equal(f.ctx.game,f.before);assert.equal(f.ctx.modal,null);
});
test('reentry via manager opens an untimed encounter without hiring; actual hire uses the original model action',()=>{
 const line=source.split('\n').find(s=>s.includes("if(a==='staff-job-hire'"));let rendered=0;
 const ctx={a:'staff-job-hire',kind:'staff-manager',b:{dataset:{id:'bottling'}},modal:{kind:'staff-manager'},jobStatus:()=>({canHire:true}),render:()=>rendered++};vm.createContext(ctx);vm.runInContext('(function(){'+line+'})()',ctx);assert.equal(ctx.modal.kind,'staff-opportunity');assert.equal(ctx.modal.returnModal.kind,'staff-manager');assert.equal(rendered,1);assert(!ctx.modal.noticePending);
 const opportunity=source.split('\n').find(s=>s.includes("if(a==='staff-opportunity-hire'"));let used=null;
 Object.assign(ctx,{a:'staff-opportunity-hire',kind:'staff-opportunity',D:{hireStaff:'distill',hireBottlingStaff:'bottling'},act:(operation,done)=>{used=operation;done();}});vm.runInContext('(function(){'+opportunity+'})()',ctx);assert.equal(used,'bottling');assert.equal(ctx.modal.kind,'staff-manager');
});
test('integration retains cost view, exact two action meanings, and acknowledgement after showModal',()=>{
 assert.match(source,/body=staffEncounterMarkup\(modal.job\)\+staffCostView\(modal.job\)/);assert.match(source,/button\('採用する','staff-opportunity-hire'/);assert.match(source,/button\('見送る','staff-opportunity-later'\)/);
 assert(source.indexOf('acknowledgeStaffOpportunity();',source.indexOf('dialog.showModal()'))>source.indexOf('dialog.showModal()'));
 const view=readFileSync(new URL('../staff-encounter-view.mjs',import.meta.url),'utf8');assert.doesNotMatch(view,/setTimeout|localStorage|Math.random|\.rng/);
});
