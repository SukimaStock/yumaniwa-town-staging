import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../parallel.mjs';
import * as M from '../model.mjs';
import * as D from '../distillery.mjs';
const copy=s=>structuredClone(s);
function batch(s,stop=65,type='bourbon'){s=P.startDistillation(s);for(let i=0;i<stop;i++)s=P.distillStep(s);if(s.still.phase==='distilling')s=P.stopDistillation(s);return P.fillBarrel(s,type);}
function month(s){if(s.decisions.length){while(s.decisions.length){const d=s.decisions[0],option=d.pending.options.find(o=>o.id==='wait'||o.id==='last');if(option)s=P.chooseDistillery(s,d.caskId,option.id);else{s=P.bottleNow(s,d.caskId);s=P.listBottles(s,s.result.productId);}}}return P.tickDistillery(s);}
function restore(s){assert.deepEqual(P.restoreDistillery(P.serializeDistillery(s)),s);return s;}

test('distillation keeps the 0.5 ritual, cut and chemistry with its own save contract',()=>{
 let old=D.startDistillation(D.newDistillery(17)),s=P.startDistillation(P.newDistillery(17));
 for(let i=0;i<60;i++){old=D.distillStep(old);s=P.distillStep(s);}
 old=D.stopDistillation(old);s=P.stopDistillation(s);
 assert.deepEqual(s.core,old.core);assert.deepEqual(s.still.distillation,old.distillation);
 s=P.fillBarrel(s,'bourbon');old=D.fillBarrel(old,'bourbon');assert.deepEqual(s.core,old.core);restore(s);
 assert.throws(()=>D.restoreDistillery(P.serializeDistillery(s)),/対応/);
 assert.throws(()=>P.restoreDistillery(D.serializeDistillery(old)),/対応/);
});

test('A ages while B is distilled, sampled separately, bottled and sold alongside B',()=>{
 let s=batch(P.newDistillery(42));const a=s.core.casks[0].id;s=month(s);
 s=P.startDistillation(s);for(let i=0;i<42;i++)s=P.distillStep(s);s=P.tickDistillery(s);restore(s);
 assert.equal(s.core.casks[0].age,2);assert.equal(s.still.distillation.progress,42);
 s=P.stopDistillation(s);s=P.fillBarrel(s,'refill');const b=s.core.casks[1].id;
 s=P.sampleDistillery(s,a);assert.equal(P.tickDistillery(s),s);restore(s);s=P.endTasting(s);
 s=P.sampleDistillery(s,b);restore(s);s=P.endTasting(s);restore(s);
 assert.equal(s.notesById[a].samples[0].age,2);assert.equal(s.notesById[b].samples[0].age,0);
 s=P.tickDistillery(s);const cash=s.core.cash;s=P.bottleNow(s,a);const product=s.result.productId;
 assert.equal(s.core.cash,cash-s.result.bottlingCost);assert.deepEqual(s.core.casks.map(c=>c.id),[b]);
 assert.equal(s.notesById[b].samples.length,1);s=P.tickDistillery(s);
 assert.equal(s.core.products[0].sold,0);assert.equal(s.core.casks[0].age,2);
 s=P.listBottles(s,product);const before=s.core.cash;s=P.tickDistillery(s);
 assert.ok(s.core.products[0].sold>0);assert.equal(s.core.casks[0].age,3);
 assert.equal(s.core.cash,Math.round((before+s.core.lastMonth.revenue-12)*100)/100);
 assert.ok(P.canStart(s).ok);s=batch(s,90,'refill');assert.equal(s.core.casks.length,2);restore(s);
});

test('four cask cap, deterministic room-independent updates and duplicate month guard',()=>{
 let s=P.newDistillery(8);for(let i=0;i<4;i++){s=batch(s,40,i%2?'refill':'bourbon');if(i<3)s=month(s);}
 assert.equal(s.core.casks.length,4);assert.equal(P.canStart(s).ok,false);assert.throws(()=>P.startDistillation(s),/4樽/);
 const before=copy(s),next=P.tickDistillery(s,s.core.month);assert.deepEqual(s,before);
 for(const room of ['still','warehouse','sales'])assert.deepEqual(P.tickDistillery({...s,ui:{room}},s.core.month).core,next.core);
 assert.equal(next.core.month,s.core.month+1);assert.ok(next.core.casks.every((c,i)=>c.age===s.core.casks[i].age+1));
 assert.equal(next.core.totals.upkeep-s.core.totals.upkeep,12);
 assert.throws(()=>P.tickDistillery(next,s.core.month),/対象月/);restore(next);
});

test('queued decisions freeze all facilities, resolve by ID and retain the other cask',()=>{
 let s=batch(P.newDistillery(55),100);s=month(s);s=batch(s,100,'refill');
 for(let i=0;i<5;i++)s=P.tickDistillery(s);
 assert.equal(s.decisions.length,1);const first=s.decisions[0].caskId;
 s=P.chooseDistillery(s,first,'wait');s=P.tickDistillery(s);
 assert.equal(s.decisions[0].caskId,s.core.casks[1].id);assert.equal(P.tickDistillery(s),s);
 assert.throws(()=>P.chooseDistillery(s,first,'wait'),/先に/);
 s=P.chooseDistillery(s,s.decisions[0].caskId,'cool');assert.equal(s.decisions.length,0);
 assert.equal(s.notesById[first].cooled,false);assert.equal(s.notesById[s.core.casks[1].id].cooled,true);restore(s);
});

test('same-month events keep both identities and resolve in order without another month',()=>{
 let s=batch(P.newDistillery(2),80);s=P.tickDistillery(s);s=batch(s,65,'refill');
 while(s.core.month<18){while(s.decisions.length){const d=s.decisions[0];s=P.chooseDistillery(s,d.caskId,'wait');}s=P.tickDistillery(s);}
 assert.deepEqual(s.decisions.map(d=>d.eventId),['wood','rounded']);
 const [a,b]=s.core.casks.map(c=>c.id),before=copy(s);restore(s);
 assert.equal(P.tickDistillery(s),s);assert.throws(()=>P.chooseDistillery(s,b,'wait'),/先に/);
 s=P.sampleDistillery(s,a);const again=P.sampleDistillery(s,a);assert.equal(again.operations.length,s.operations.length);
 assert.throws(()=>P.sampleDistillery(s,b),/試飲を終えて/);restore(again);s=P.endTasting(again);
 s=P.bottleNow(s,a);assert.equal(s.core.month,18);assert.deepEqual(s.decisions.map(d=>d.caskId),[b]);
 assert.deepEqual(s.notesById[b],before.notesById[b]);restore(s);
 s=P.chooseDistillery(s,b,'wait');assert.equal(s.decisions.length,0);assert.equal(s.core.month,18);
 assert.throws(()=>P.sampleDistillery(s,a),/樽/);s=P.tickDistillery(s);assert.equal(s.core.month,19);restore(s);
});

test('unlisted products are excluded from demand and cash while legacy default sells all',()=>{
 let core=M.distill(M.newGame(7),0.5);core=M.bottle(core,null);
 const old=M.advanceMonth(core),listed=M.advanceMonth(core,{listedProductIds:[core.products[0].id]}),hidden=M.advanceMonth(core,{listedProductIds:[]});
 assert.deepEqual(old,listed);assert.ok(old.lastMonth.revenue>0);assert.equal(hidden.lastMonth.revenue,0);assert.equal(hidden.products[0].stock,core.products[0].stock);
 assert.throws(()=>M.advanceMonth(core,{listedProductIds:[999]}),/識別/);
});

test('restore rejects altered cash, wrong cask notes and replayed month or progress',()=>{
 let s=batch(P.newDistillery(9));s=P.tickDistillery(s);restore(s);
 for(const alter of [j=>j.core.cash+=1,j=>j.notesById[999]=j.notesById[j.core.casks[0].id],j=>j.operations[0].key='month',j=>j.still.phase='distilling']){const bad=copy(s);alter(bad);assert.throws(()=>P.restoreDistillery(JSON.stringify(bad)));}
 let a=P.startDistillation(P.newDistillery(10));for(let i=0;i<45;i++)a=P.distillStep(a);a=P.tickDistillery(a);for(let i=0;i<5;i++)a=P.distillStep(a);restore(a);a=P.stopDistillation(a);restore(a);
});

test('low funds roll back one whole month and allow bottling/listing to escape',()=>{
 let s=P.newDistillery(91);while(s.core.cash>560)s=P.tickDistillery(s);
 s=batch(s,100,'refill');let previous;
 for(let i=0;i<10&&!s.decisions.length;i++){previous=copy(s);s=P.tickDistillery(s);}
 assert.equal(s.decisions[0]?.eventId,'funds');assert.deepEqual(s.core,previous.core);
 const id=s.core.casks[0].id;assert.ok(s.core.cash>=P.quote(s,id).cost);restore(s);
 s=P.bottleNow(s,id);s=P.listBottles(s,s.result.productId);assert.equal(s.decisions.length,0);
 s=P.tickDistillery(s);assert.ok(s.core.lastMonth.revenue>0);assert.ok(s.core.cash>=0);restore(s);
});

test('waiting with unfilled spirit cannot spend its cask and bottle reserve',()=>{
 let s=P.newDistillery(117);while(s.core.cash>560)s=P.tickDistillery(s);
 s=P.startDistillation(s);for(let i=0;i<100;i++)s=P.distillStep(s);
 assert.equal(s.still.phase,'filling');for(let i=0;i<20;i++)s=P.tickDistillery(s);
 assert.equal(s.still.phase,'filling');assert.equal(P.tickDistillery(s),s);restore(s);
 s=P.fillBarrel(s,'refill');assert.ok(s.core.cash>=P.quote(s,s.core.casks[0].id).cost);restore(s);
});
