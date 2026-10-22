import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {initial,fill,advance,bottle,profileFor} from './model.mjs';
import * as B from './bridge.mjs';
import * as T from '../ambertime/experiments/town-simulation/v01/model.mjs';
const recipes={fruit:{malt:'plain',ferment:'long',cask:'refill',start:.12,end:.40},body:{malt:'plain',ferment:'short',cask:'refill',start:.63,end:.89},smoke:{malt:'peat',ferment:'long',cask:'refill',start:.10,end:.90},grain:{malt:'plain',ferment:'short',cask:'refill',start:.30,end:.65}};
function specimen(choice,months){let s=fill(initial(),choice);for(let remaining=months;remaining>0;remaining-=Math.min(120,remaining))s=advance(s,Math.min(120,remaining));s=bottle(s,1);const before=JSON.stringify(s),snap=B.createSnapshot(s.bottles[0]);assert.equal(JSON.stringify(s),before);assert.deepEqual(snap.profile,profileFor(s.bottles[0]));return snap;}
const cases=[['果実・3年リフィル',recipes.fruit,36],['厚み・3年リフィル',recipes.body,36],['煙・3年リフィル',recipes.smoke,36],['同じ果実・3年1stフィル',{...recipes.fruit,cask:'first'},36],['同じ果実・8年リフィル',recipes.fruit,96]];
const runs=cases.map(([name,recipe,months])=>{
 const snapshot=specimen(recipe,months),product=B.projectSnapshot(snapshot),state=T.advance(T.create({seed:20261021,productSnapshot:snapshot}),360),log=T.exportLog(state);
 assert.equal(T.validate(state).ok,true);assert.equal(log.schema,'ambertime-town-log/1');assert.deepEqual(log.initialConditions.productSnapshot,snapshot);
 assert.deepEqual(T.exportLog(T.replay(log)),log);
 assert.deepEqual(B.decodeSnapshot(B.encodeSnapshot(snapshot)),snapshot);assert.throws(()=>{snapshot.profile.fruit=0},TypeError);
 for(const r of state.releases){for(const key of ['roughness','character','wood','specimenId','label'])assert.equal(r.product[key],product[key]);assert.equal(r.product.age,24);}
 assert.equal(state.produced,480);assert.equal(state.delivered,360);assert.equal(state.inventory,120);
 assert.ok(state.arrivals.some(e=>e.fit<T.MIN_FIT));
 return {name,snapshot,product,state,result:{name,snapshot,projected:product,fit:T.NODES.map(n=>({id:n.id,name:n.name,fit:T.affinity(n,product).fit})),summary:T.summarize(state),liked:T.NODES.filter(n=>state.nodes[n.id].firstInterest!==null).map(n=>n.id),trading:T.summarize(state).trading,news:T.newsEvents(state).length,examples:T.newsEvents(state).filter(e=>['rumor','interest','trade'].includes(e.type)).slice(0,5).map(e=>({month:e.month,type:e.type,reason:e.reason})),validation:T.validate(state)}};
});
// Isolate the intended comparisons instead of mixing cask and age changes.
assert.notEqual(runs[0].product.character,runs[1].product.character);
assert.notEqual(runs[0].product.character,runs[2].product.character);
assert.notEqual(runs[0].product.wood,runs[3].product.wood);
assert.notEqual(runs[0].product.roughness,runs[4].product.roughness);
for(const i of [1,2,3,4])assert.notDeepEqual(runs[0].result.fit.map(x=>x.fit),runs[i].result.fit.map(x=>x.fit));
const grain=specimen(recipes.grain,36);assert.equal(grain.primary,'grain');assert.equal(B.projectSnapshot(grain).character,Math.max(grain.profile.fruit,grain.profile.grain,grain.profile.smoke,grain.profile.body));
const renamed=structuredClone(runs[0].snapshot);renamed.label='別の名前 $& <b>そのまま</b>';
const renamedState=T.advance(T.create({seed:20261021,productSnapshot:renamed}),360);
assert.deepEqual(renamedState.nodes,runs[0].state.nodes);assert.deepEqual(renamedState.attempts,runs[0].state.attempts);assert.deepEqual(T.summarize(renamedState),T.summarize(runs[0].state));assert.ok(renamedState.events[0].reason.includes(renamed.label));
const sameLabel=structuredClone(runs[2].snapshot);sameLabel.label=runs[0].snapshot.label;assert.notDeepEqual(B.projectSnapshot(sameLabel),runs[0].product);
// Loss is intentional and documented: equally strong fruit and grain can project identically.
const profiles=[{fruit:.8,grain:.2},{fruit:.2,grain:.8}].map((p,i)=>({id:i+1,bottledAt:0,months:0,label:'比較',choice:recipes.fruit,spirit:{fruit:0,grain:0,smoke:0,body:.1,spice:.1,rough:.3,wood:0,vanilla:0,...p}}));
const projected=profiles.map(b=>B.projectSnapshot(B.createSnapshot(b)));for(const k of ['roughness','character','wood'])assert.equal(projected[0][k],projected[1][k]);
for(const hash of ['#bottle=%','#bottle='+ 'x'.repeat(12001),'#bottle='+encodeURIComponent('{}')])assert.throws(()=>B.decodeSnapshot(hash));
for(const change of [s=>s.profile.rough=NaN,s=>s.profile.fruit=2,s=>s.quantity=25,s=>s.releaseMonth=1,s=>s.label='x'.repeat(81),s=>s.recipe.cask='bad',s=>s.id='bad']){const s=structuredClone(runs[0].snapshot);change(s);assert.throws(()=>B.validateSnapshot(s));}
const before=JSON.stringify(runs[0].snapshot);const another=fill(initial(),recipes.body);advance(another,120);assert.equal(JSON.stringify(runs[0].snapshot),before);
const changed=T.create({productSnapshot:runs[0].snapshot});assert.ok(Object.isFrozen(changed.initial.productSnapshot));assert.throws(()=>{changed.initial.productSnapshot.profile.wood=1},TypeError);T.advance(changed,24);T.setPolicy(changed,{product:'long'});T.advance(changed,60);T.setPolicy(changed,{product:'bottled'});T.advance(changed,120);assert.deepEqual(T.exportLog(T.replay(T.exportLog(changed))),T.exportLog(changed));
if(process.argv.includes('--write'))writeFileSync(new URL('./stage3-results.json',import.meta.url),JSON.stringify({seed:20261021,months:360,quantity:24,releaseMonth:0,runs:runs.map(x=>x.result),limits:['Fruit/grain/smoke/body identities can collapse under max projection; provenance preserves raw8.','Age is source metadata; recurring preparation24months and24bottles/18months common.']},null,2)+'\n');
console.log(JSON.stringify(runs.map(({result:r})=>({name:r.name,profile:r.projected,liked:r.liked,trading:r.trading,counts:r.summary.counts})),null,2));
console.log('PASS: frozen snapshots, old-save derivation, bounded URI, input checks, isolated5bottles, projection loss, label neutrality, exact custom replay and preset switching');
