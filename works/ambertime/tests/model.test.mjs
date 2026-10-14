import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,previewDistillation,distill,fillCask,advanceMonth,ageCask,bottle,bottleQuote,setPrice,tasting,marketValue,serialize,restore,upkeep} from '../model.mjs';
import {PARAMETERS as P} from '../parameters.mjs';
const filled=(seed=42,cut=0.6,type='bourbon')=>fillCask(distill(newGame(seed),cut),type);
const months=(s,n)=>{for(let i=0;i<n;i++)s=advanceMonth(s);return s;};
test('cut trades volume/roughness against character, deterministic immutable distillation',()=>{
 const low=previewDistillation(0),high=previewDistillation(1);assert(low.litres<high.litres);assert(low.roughness<high.roughness);assert(low.character<high.character);
 const original=newGame(42),s=distill(original,0.6);assert.deepEqual(original,newGame(42));assert.equal(s.cash,original.cash-P.distillationCost);assert.deepEqual(s,distill(newGame(42),0.6));assert.throws(()=>distill(s,0.5));
});
test('same batch can split into different casks; variations are seed-reproducible',()=>{
 let s=distill(newGame(42),0.7),v=s.spirit.litres;s=fillCask(s,'bourbon',v/2);s=fillCask(s,'refill');assert.equal(s.spirit,null);assert.equal(s.casks[0].batchId,s.casks[1].batchId);assert.equal(s.casks[0].litres+s.casks[1].litres,v);
 s=months(s,24);assert(s.casks[0].wood>s.casks[1].wood);assert(s.casks[0].roughness<s.casks[1].roughness);assert(s.casks[0].litres<s.casks[1].litres);
 let t=distill(newGame(42),0.7);t=fillCask(t,'bourbon',v/2);t=fillCask(t,'refill');assert.deepEqual(s,months(t,24));
});
test('same cask type differs slightly and notes change through aging',()=>{
 let s=distill(newGame(123),0.8),v=s.spirit.litres;s=fillCask(s,'bourbon',v/2);s=fillCask(s,'bourbon');const initial=s.casks.map(tasting);s=months(s,30);
 assert.notEqual(s.casks[0].wood,s.casks[1].wood);assert.notEqual(s.casks[0].roughness,s.casks[1].roughness);assert(s.casks.every((c,i)=>tasting(c)!==initial[i]));assert(s.casks.every(c=>c.history.length===11));
});
test('month has one age/evaporation/upkeep transaction independent of UI state',()=>{
 const original=filled(),s=advanceMonth(original);const expected=ageCask(original.casks[0]);assert.deepEqual(s.casks[0],expected);assert.equal(s.casks[0].age,1);assert.equal(s.month,1);assert.equal(s.cash,original.cash-upkeep(original));assert.equal(s.totals.evaporated,original.casks[0].litres-expected.litres);assert.equal(original.month,0);
 // No room/scene field or browser dependency exists in the model.
 assert.deepEqual(advanceMonth(restore(serialize(original))),s);
});
test('maturity has useful development and over-aging reduces value',()=>{
 for(const type of ['bourbon','refill']){
 const initial=filled(42,0.65,type),young=months(initial,6).casks[0],mature=months(initial,36).casks[0],old=months(initial,144).casks[0];
 assert(marketValue(mature)>marketValue(young));assert(marketValue(old)<marketValue(mature));assert(old.litres<mature.litres);assert(old.wood>mature.wood);
 }
});
test('bottling freezes profile, charges cost and sells next month, then reinvests',()=>{
 const s=months(filled(),24),c=s.casks[0],q=bottleQuote(s,c.id),b=bottle(s,c.id);assert.equal(b.casks.length,0);assert.equal(b.products[0].stock,q.count);assert.equal(b.cash,s.cash-q.cost);assert.equal(b.products[0].revenue,0);assert.equal(b.products[0].age,c.age);
 const priced=setPrice(b,b.products[0].id,30),sold=advanceMonth(priced);assert(sold.lastMonth.bottles>0);assert(sold.lastMonth.revenue>0);assert.equal(sold.products[0].age,c.age);assert.equal(sold.cash,priced.cash+sold.lastMonth.revenue-sold.lastMonth.upkeep);assert(distill(sold,0.4).spirit);
});
test('young and characterful newmake have demand; price affects sales pace',()=>{
 for(const cut of [0.1,0.95]){
 const b=bottle(distill(newGame(42),cut)),p=b.products[0];const cheap=advanceMonth(setPrice(b,p.id,12)),expensive=advanceMonth(setPrice(b,p.id,60));assert(cheap.products[0].lastSold>0);assert(cheap.products[0].lastSold>expensive.products[0].lastSold);
 assert.equal(cheap.casks.length,0);assert.equal(cheap.totals.evaporated,0);
 }
});
test('shared monthly customers cannot multiply across products',()=>{
 let s=newGame(42);for(let i=0;i<4;i++){s=bottle(distill(s,1));s=setPrice(s,s.products.at(-1).id,2);s=advanceMonth(s);}assert(s.lastMonth.bottles<=P.monthlyCustomers);
});
test('small bottling preserves remaining spirit and cask; full batch clears slot',()=>{
 let s=filled(),c=s.casks[0];const q=bottleQuote(s,c.id);s=bottle(s,c.id,1);assert.equal(s.casks.length,1);assert(Math.abs(s.casks[0].litres-(c.litres-P.bottleLitres))<1e-9);s=bottle(s,c.id,q.count-1);assert.equal(s.casks.length,0);assert.equal(s.archive.length,1);assert.equal(s.products.reduce((a,p)=>a+p.stock,0),q.count);
 let t=distill(newGame(42),0.6);t=bottle(t,null,1);assert(t.spirit);assert.equal(t.products[0].stock,1);
});
test('failed actions are atomic, bad numbers/cost/capacity have clear errors',()=>{
 const s=filled(),snapshot=serialize(s);for(const f of [()=>distill(s,NaN),()=>fillCask(s,'wrong'),()=>bottle(s,999),()=>bottle(s,s.casks[0].id,-1),()=>setPrice(s,99,NaN),()=>setPrice(s,99,5)])assert.throws(f);assert.equal(serialize(s),snapshot);
 const poor={...newGame(),cash:0};assert.throws(()=>distill(poor,0.5));let full=newGame(7);for(let i=0;i<4;i++){full=fillCask(distill(full,0.5),'bourbon');full=advanceMonth(full);}full=distill(full,0.5);assert.throws(()=>fillCask(full,'bourbon'));
});
test('versioned saves reproduce RNG and all later outcomes at an intermediate month',()=>{
 let s=months(filled(123),17),restored=restore(serialize(s));assert.deepEqual(restored,s);
 for(let n=0;n<18;n++){s=advanceMonth(s);restored=advanceMonth(restored);}assert.deepEqual(restored,s);
 s=distill(s,0.9);restored=distill(restored,0.9);s=fillCask(s,'refill');restored=fillCask(restored,'refill');assert.deepEqual(s,restored);
});
test('reject future/corrupt save safely including missing economic fields and duplicate IDs',()=>{
 assert.throws(()=>restore('broken'));assert.throws(()=>restore('null'));assert.throws(()=>restore(JSON.stringify({...newGame(),version:2})));
 for(const mutate of [s=>{s.cash=null;},s=>{s.rngState=0;},s=>{s.casks[0].variation.wood=9;},s=>{delete s.totals;},s=>{s.month=-1;},s=>{s.journal=[{month:1,message:5}];},s=>{s.casks.push({...s.casks[0]});},s=>{s.casks[0].initialLitres=1;},s=>{s.month=10;s.casks[0].filledMonth=9;s.casks[0].age=9;}]) {const s=filled();mutate(s);assert.throws(()=>restore(JSON.stringify(s)));}
});
test('long runs remain finite and bounded without external events or free money',()=>{
 const s=months(filled(42),600);assert(Number.isFinite(s.cash));assert(s.cash<0);assert(s.casks[0].litres>0);assert(s.casks[0].history.length<=12);assert(s.journal.length<=120);assert.deepEqual(s,restore(serialize(s)));assert.equal(s.totals.revenue,0);
});

test('save rejects inconsistent product provenance and stock accounting',()=>{
 for(const mutate of [s=>{s.products[0].sourceId=-1;},s=>{delete s.products[0].batchId;},s=>{const p=s.products[0];p.originalStock=100000;p.sold=100000-p.stock;},s=>{s.products[0].lastSold=999;},s=>{s.products[0].age=12;}]){const s=bottle(distill(newGame(42),.5));mutate(s);assert.throws(()=>restore(JSON.stringify(s)));}
});
test('young wide extraction is riskier at the same price; aging can make its character valuable',()=>{
 const narrow=months(filled(42,.35,'refill'),6).casks[0],wide=months(filled(42,1,'refill'),6).casks[0];assert(marketValue(narrow)>marketValue(wide));
 const oldNarrow=months(filled(42,.35,'refill'),36).casks[0],oldWide=months(filled(42,1,'refill'),36).casks[0];assert(marketValue(oldWide)>marketValue(oldNarrow));
});

test('sub-bottle spirit remainder is recorded and cannot block next distillation',()=>{
 let s=distill(newGame(42),.5);s=fillCask(s,'bourbon',31.5);assert.equal(s.spirit,null);assert(s.journal.some(n=>n.message.includes('端数0.50')));s=advanceMonth(s);assert(distill(s,.5).spirit);
});
test('evaporation below one bottle archives cask and releases slot',()=>{
 let s=fillCask(distill(newGame(42),.5),'bourbon',1);s=months(s,180);assert.equal(s.casks.length,0);assert.equal(s.archive.length,1);assert(s.archive[0].endReason);assert.deepEqual(s,restore(serialize(s)));
});
