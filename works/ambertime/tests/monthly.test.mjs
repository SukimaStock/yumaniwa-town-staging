import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../model.mjs';
import {advanceMonthly,advanceCoreMonth,createCaskNotes} from '../monthly.mjs';
import {createCharacter,tickCharacter,observeCharacterMonth} from '../character.mjs';

function setup(age=0) {
  let core=M.distill(M.newGame(42),1);
  core=M.fillCask(core,'bourbon',10);core=M.fillCask(core,'refill',10);
  for(let n=0;n<age;n++)core=M.advanceMonth(core);
  core=M.bottle(core,null);
  return {core,notesById:Object.fromEntries(core.casks.map(c=>[c.id,createCaskNotes(c)]))};
}

test('shared month ages two barrels and sells inventory in one immutable transaction',()=>{
  const state=setup(),original=structuredClone(state),next=advanceMonthly(state,{expectedMonth:0});
  assert.deepEqual(state,original);assert.deepEqual(next.core,M.advanceMonth(state.core));
  assert.equal(next.core.month,1);assert.ok(next.core.casks.every(c=>c.age===1));
  assert.ok(next.core.products[0].sold>0);
  assert.equal(next.core.cash,Math.round((state.core.cash+next.core.lastMonth.revenue-next.core.lastMonth.upkeep)*100)/100);
  assert.equal(next.core.totals.upkeep-state.core.totals.upkeep,M.upkeep(state.core));
  assert.deepEqual(M.restore(M.serialize(next.core)),next.core);
  assert.deepEqual(next.decisions,[]);
});

test('visible room cannot change a shared transaction or request another copy of it',()=>{
  const state=setup();
  const outputs=['distilling','warehouse','sales'].map(room=>advanceMonthly({...state,ui:{room}},{expectedMonth:0}));
  assert.deepEqual(outputs[0].core,outputs[1].core);assert.deepEqual(outputs[1].core,outputs[2].core);
  assert.deepEqual(outputs[0].notesById,outputs[2].notesById);
  const before=structuredClone(outputs[0]);
  assert.throws(()=>advanceMonthly(outputs[0],{expectedMonth:0}),/対象月/);
  assert.deepEqual(outputs[0],before);
  assert.throws(()=>advanceCoreMonth(state.core,1),/対象月/);
  assert.throws(()=>advanceMonthly(state),/対象月/);
});

test('a free tasting or unresolved decision in either barrel pauses the whole distillery',()=>{
  const state=setup();assert.equal(advanceMonthly(state,{expectedMonth:0,paused:true}),state);
  state.notesById[state.core.casks[1].id].view='tasting';
  assert.equal(advanceMonthly(state,{expectedMonth:0}),state);
  state.notesById[state.core.casks[1].id].view='watching';
  state.notesById[state.core.casks[0].id].phase='choice';
  state.notesById[state.core.casks[0].id].pending={id:'rough'};
  assert.equal(advanceMonthly(state,{expectedMonth:0}),state);
});

test('simultaneous barrel decisions retain both identities without bottling or another month',()=>{
  const state=setup(5),next=advanceMonthly(state,{expectedMonth:5});
  assert.equal(next.core.month,6);assert.equal(next.core.casks.length,2);
  assert.equal(next.core.products.length,1);assert.equal(next.decisions.length,2);
  assert.deepEqual(next.decisions.map(d=>d.caskId),state.core.casks.map(c=>c.id));
  assert.ok(next.decisions.every(d=>d.eventId==='rough'&&d.month===6));
  assert.equal(advanceMonthly(next,{expectedMonth:6}),next);
  assert.deepEqual(M.restore(M.serialize(next.core)),next.core);
});

test('different filling dates preserve independent ages, memories and event identity',()=>{
  let core=M.fillCask(M.distill(M.newGame(17),1),'bourbon',10);
  for(let n=0;n<5;n++)core=M.advanceMonth(core);
  core=M.fillCask(core,'refill',10);core=M.bottle(core,null);
  const state={core,notesById:Object.fromEntries(core.casks.map(c=>[c.id,createCaskNotes(c)]))};
  const [older,younger]=core.casks;
  state.notesById[younger.id].seen=['fruit'];
  const next=advanceMonthly(state,{expectedMonth:5});
  assert.deepEqual(next.core.casks.map(c=>c.age),[6,1]);
  assert.deepEqual(next.decisions.map(d=>d.caskId),[older.id]);
  assert.deepEqual(next.notesById[younger.id].seen,['fruit']);
  assert.equal(next.notesById[younger.id].pending,null);
});

test('a reached target becomes a decision, never the legacy automatic bottle and sale',()=>{
  const state=setup();for(const c of state.core.casks)state.notesById[c.id].targetAge=1;
  const next=advanceMonthly(state,{expectedMonth:0});
  assert.equal(next.core.month,1);assert.equal(next.core.casks.length,2);
  assert.ok(next.decisions.every(d=>d.eventId==='bottle-ready'));
  assert.equal(next.core.products.length,1);
});

test('mismatched note IDs and malformed pause state fail before changing finances',()=>{
  const state=setup(),before=structuredClone(state);
  for(const mutate of [s=>delete s.notesById[s.core.casks[0].id],s=>s.notesById[999]=createCaskNotes(s.core.casks[0]),s=>s.notesById[s.core.casks[0].id].phase='choice']){
    const bad=structuredClone(state);mutate(bad);assert.throws(()=>advanceMonthly(bad,{expectedMonth:0}));
  }
  assert.deepEqual(state,before);
});

test('already-aged character observation adds no month or economic calculation',()=>{
  const state=createCharacter(42),aged={...state,core:M.advanceMonth(state.core)};
  const observed=observeCharacterMonth(aged);
  assert.deepEqual(observed,tickCharacter(state));
  assert.deepEqual(observed.core,aged.core);assert.equal(observed.core.month,1);
});
