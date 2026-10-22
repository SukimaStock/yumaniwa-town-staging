import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {distill,mature,expression,initial,fill,advance,bottle,validateState,summaryFor} from './model.mjs';
export const cases=[
 ['果実・1stフィル','plain','long','first',.12,.40],
 ['穀物・リフィル','plain','short','refill',.30,.65],
 ['煙・1stフィル','peat','long','first',.10,.90],
 ['厚み・リフィル','plain','short','refill',.63,.89],
 ['同じ果実・リフィル','plain','long','refill',.12,.40]
].map(([name,malt,ferment,cask,start,end])=>({name,choice:{malt,ferment,cask,start,end}}));
const results=cases.map(({name,choice})=>{
 let s=fill(initial(),choice);const born=s.barrels[0];const early=bottle(s,born.id);
 assert.equal(validateState(JSON.parse(JSON.stringify(s))),true);
 for(let m=1;m<=144;m++){
  s=advance(s,1);const b=s.barrels[0],p=mature(b.spirit,m/12,choice.cask);
  assert.ok(Object.values(p).every(x=>Number.isFinite(x)&&x>=0&&x<=1));
  for(const k of ['fruit','grain','smoke','body'])assert.ok(p[k]>=born.spirit[k]*.85);
  assert.equal(summaryFor(b)[0].key,summaryFor(born)[0].key);
  assert.ok(b.history.length<=3);
 }
 const b=s.barrels[0];assert.deepEqual(advance(early,120).bottles,early.bottles);
 assert.equal(b.label,expression(mature(b.spirit,100,choice.cask),b.spirit));
 assert.deepEqual(advance(fill(initial(),choice),120),advance(fill(initial(),choice),120));
 const late=bottle(s,b.id);assert.deepEqual(advance(late,120).bottles,late.bottles);
 return {name,choice,identity:summaryFor(b)[0].key,history:b.history,profileAt0:born.spirit,profileAt12:mature(b.spirit,12,choice.cask)};
});
assert.equal(new Set(results.map(x=>x.identity)).size,4);
assert.equal(results[1].history.length,1); // gentle grain/refill retains its original name
assert.notDeepEqual(results[0].history,results[4].history);
assert.ok(new Set(results.flatMap(x=>x.history.slice(1).map(h=>h.months))).size>=4);
assert.deepEqual(distill(cases[0].choice),distill(cases[4].choice));
assert.throws(()=>distill({...cases[0].choice,end:.15}),/範囲/);
assert.throws(()=>mature(results[0].profileAt0,-1,'first'));
let full=initial();for(let i=0;i<4;i++)full=fill(full,cases[i].choice);
assert.throws(()=>fill(full,cases[4].choice),/4つ/);
assert.equal(bottle(full,1).barrels.length,3);
// Existing v2 saves: no new fields, preserve old labels/history and bottled records.
const legacy=fill(initial(),cases[0].choice);legacy.barrels[0].label='果実香に樽の甘い香り';legacy.barrels[0].months=80;legacy.barrels[0].history=[{months:0,label:'果実香が強い'},{months:74,label:legacy.barrels[0].label}];
assert.equal(validateState(legacy),true);assert.deepEqual(advance(legacy,12).barrels[0].history,legacy.barrels[0].history);
assert.equal(advance(legacy,120).barrels[0].label,legacy.barrels[0].label);
assert.deepEqual(Object.keys(advance(legacy,12).barrels[0]).sort(),Object.keys(legacy.barrels[0]).sort());
if(process.argv.includes('--write'))writeFileSync(new URL('./growth-results.json',import.meta.url),JSON.stringify({recipes:5,months:144,results},null,2)+'\n');
console.log(JSON.stringify(results.map(({name,history})=>({name,history})),null,2));
