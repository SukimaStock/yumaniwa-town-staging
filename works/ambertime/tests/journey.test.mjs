import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newJourney,tick,choose,nextJourney,currentCask,choiceView,observation,serializeJourney,restoreJourney} from '../journey.mjs';
import {newGame,distill,fillCask,advanceMonth,bottle,bottleQuote} from '../model.mjs';
import {PARAMETERS as P} from '../parameters.mjs';
const clone=s=>structuredClone(s);
function decision(j){for(let n=0;j.phase==='watching'&&n<90;n++)j=tick(j);assert.equal(j.phase,'choice');return j;}
function play(seed,direction='soft',stop=4,last='last'){
 let j=newJourney(seed),steps=0;while(j.phase!=='finished'){
  assert(++steps<=95,'all paths must finish without repeated confirmation loops');
  if(j.phase==='watching')j=tick(j);else j=choose(j,j.stage===stop?'bottle':j.pending.id==='direction'?direction:j.pending.id==='last'?last:'wait');
 }return j;
}
const seeds=[...Array.from({length:96},(_,i)=>i+1),20261014,4294967294,4294967295];
test('every offered branch across99 seeds completes within87 months with at most4 decisions',()=>{
 for(const seed of seeds)for(const direction of ['soft','wood'])for(const stop of [1,2,3,4])for(const last of stop===4?['last','bottle']:['bottle']){
  const j=play(seed,direction,stop===4&&last==='last'?99:stop,last),r=j.result;
  assert(r.age<=87);assert(j.core.month===r.age+1);assert(j.choices.length>=1&&j.choices.length<=4);assert(j.core.cash>0);assert(j.core.casks.length===0);assert.equal(j.core.spirit,null);
  assert(r.litres>0&&r.litres<j.core.archive[0].initialLitres);assert(Number.isFinite(r.cash));
 }
});
test('new journey is a paid ordinary batch, unchanged by inspection',()=>{
 for(const seed of seeds){const j=newJourney(seed),c=currentCask(j),snapshot=clone(j);
  assert.deepEqual(j.core,fillCask(distill(newGame(seed),c.cut),c.type));
  assert.equal(j.core.cash,P.startingCash-P.distillationCost-P.casks[c.type].cost);assert.equal(j.core.month,0);
  observation(j);choiceView(j);assert.deepEqual(j,snapshot);
 }
});
test('soft and wood intentions actually change the timing, final profile, volume and expense',()=>{
 let changed=0;for(const seed of seeds){const a=play(seed,'soft',2),b=play(seed,'wood',2);
  if(a.result.age!==b.result.age){changed++;assert.notDeepEqual(a.result.profile,b.result.profile);assert.notEqual(a.result.litres,b.result.litres);assert.notEqual(a.result.upkeep,b.result.upkeep);}
  assert.equal(a.result.choices[0].key,'soft');assert.equal(b.result.choices[0].key,'wood');
 }assert(changed>=90,'intent must have an effect for nearly all ordinary batches');
});
test('waiting preserves the same aging physics, incurs upkeep and evaporation, and can lose aroma',()=>{
 let losses=0;for(const seed of seeds){const early=play(seed,'wood',2),late=play(seed,'wood',99);assert(late.result.age>early.result.age);assert(late.result.litres<early.result.litres);assert(late.result.upkeep>early.result.upkeep);
  let core=newJourney(seed).core;for(let n=0;n<late.result.age;n++)core=advanceMonth(core);
  const c=core.casks[0];assert.deepEqual(late.result.profile,{roughness:c.roughness,character:c.character,wood:c.wood,litres:c.litres});
  if(late.result.profile.character<early.result.profile.character)losses++;
 }assert(losses>0,'late waiting must carry an actual aroma tradeoff for some batches');
});
test('bottling and existing first-month sale obey money and stock conservation',()=>{
 for(const seed of seeds)for(const stop of [1,2,4]){const j=play(seed,'soft',stop),r=j.result,p=j.core.products[0];
  assert.equal(p.originalStock,r.bottles);assert.equal(p.stock+p.sold,r.bottles);assert.equal(r.sold,p.sold);assert.equal(r.revenue,p.price*r.sold);
  assert.equal(j.core.cash,P.startingCash-j.core.totals.costs-j.core.totals.upkeep+j.core.totals.revenue);
  assert.equal(r.upkeep,r.age*(P.baseUpkeep+P.caskUpkeep)+P.baseUpkeep);
  let before=newJourney(seed).core;for(let n=0;n<r.age;n++)before=advanceMonth(before);
  const q=bottleQuote(before,before.casks[0].id);assert.equal(r.bottles,q.count);assert.deepEqual(j.core,advanceMonth(bottle(before,before.casks[0].id,q.count)));
 }
});
test('seed and actions are deterministic and completed history survives repeated rounds',()=>{
 let a=play(42,'wood',99),b=play(42,'wood',99);assert.deepEqual(a,b);
 for(let round=0;round<14;round++){
  const old=a;a=nextJourney(a);assert.equal(a.round,old.round+1);assert.notEqual(a.seed,old.seed);assert.notEqual(currentCask(a).type,old.result.type);assert.notEqual(currentCask(a).cut,old.result.cut);
  assert.equal(a.records.length,Math.min(old.records.length,12));assert.deepEqual(a,restoreJourney(serializeJourney(a)));
  while(a.phase!=='finished')a=a.phase==='watching'?tick(a):choose(a,a.pending.id==='direction'?'soft':'bottle');
 }assert.equal(a.records.length,12);assert.equal(a.round,15);
 assert.equal(nextJourney(play(4294967295)).seed,1);
});
test('save/resume agrees at watching, all four pauses, last3-month wait and finish',()=>{
 for(const seed of [1,2,42,20261014,4294967295]){
  let j=newJourney(seed);const checkpoints=[j,tick(j)];
  for(let stage=1;stage<=4;stage++){
   j=decision(j);checkpoints.push(j);j=choose(j,stage===1?'wood':stage===4?'last':'wait');checkpoints.push(j);
  }
  j=tick(j);checkpoints.push(j);j=tick(j);checkpoints.push(j);j=tick(j);checkpoints.push(j);assert.equal(j.phase,'finished');
  for(const state of checkpoints){const restored=restoreJourney(serializeJourney(state));assert.deepEqual(restored,state);assert.deepEqual(tick(restored),tick(state));if(state.phase==='choice')for(const o of state.pending.options)assert.deepEqual(choose(restored,o.id),choose(state,o.id));}
 }
});
test('choice pause is atomic and rejects absent, repeated or forged actions',()=>{
 const j=decision(newJourney(42)),copy=clone(j);assert.deepEqual(tick(j),j);assert.throws(()=>choose(j,'last'));assert.deepEqual(j,copy);
 const chosen=choose(j,'soft');assert.throws(()=>choose(chosen,'soft'));assert.throws(()=>nextJourney(chosen));assert.deepEqual(j,copy);
});
test('corrupt future states, injected choices and impossible current histories reject',()=>{
 for(const text of ['broken','null','{}','[]','x'.repeat(500001)])assert.throws(()=>restoreJourney(text));
 const j=decision(newJourney(42));
 for(const mutate of [s=>{s.version=2;},s=>{s.pending.options.push({id:'last',label:'forged'});},s=>{s.pending.text='made up';},s=>{s.pending.id='arrival';},s=>{s.stage=3;},s=>{s.core.cash+=100;},s=>{s.core.casks[0].character=.99;},s=>{s.core.casks[0].age++;s.core.month++;},s=>{s.choices=[{age:0,key:'wait',text:'impossible',profile:observation(s)}];}]){
  const s=clone(j);mutate(s);assert.throws(()=>restoreJourney(JSON.stringify(s)));
 }
 const done=play(42);for(const mutate of [s=>{s.result.age++;},s=>{s.records.at(-1).choices[0].key='last';},s=>{s.core.products[0].stock++;},s=>{s.result.name='different';}]){const s=clone(done);mutate(s);assert.throws(()=>restoreJourney(JSON.stringify(s)));}
});
test('choice descriptions never publish a hidden future peak or quality score',()=>{
 for(const seed of [1,2,42,20261014]){let j=newJourney(seed);while(j.phase!=='finished'){
  if(j.phase==='watching')j=tick(j);else {assert(!/(最適|最高品質|ピーク|スコア|品質点|£|\d+年後)/.test(JSON.stringify(choiceView(j))));j=choose(j,j.pending.id==='direction'?'wood':j.pending.id==='last'?'last':'wait');}
 }}
});

test('retained records reject impossible choice order and invalid provenance/profile',()=>{
 const j=nextJourney(play(42,'soft',1));
 for(const mutate of [r=>{r.choices[0].key='last';},r=>{r.seed=-10;},r=>{r.round=0;},r=>{r.profile={wood:999};},r=>{r.choices[0].age++;},r=>{r.revenue+=30;},r=>{r.name='forged flavour';}]){
  const s=clone(j);mutate(s.records[0]);assert.throws(()=>restoreJourney(JSON.stringify(s)));
 }
});
