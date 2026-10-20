import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as L from '../model.mjs';
import * as S from '../seasonal.mjs';
const original=JSON.parse(fs.readFileSync(new URL('../results.json',import.meta.url)));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');

test('0.1 model, analysis, results, report and tests remain exact baseline bytes;216-score parity',()=>{
 for(const file of ['model.mjs','analyze.mjs','results.json','REPORT.md','tests/model.test.mjs','tests/browser.mjs']){
  const path=`works/ambertime/experiments/contest/${file}`;
  assert.equal(hash(fs.readFileSync(new URL('../'+file,import.meta.url))),hash(execFileSync('git',['show',`fc32dc96199bf47397a28d7743a3884fb63adb99:${path}`])));
 }
 assert.equal(original.population.length,216);
 for(const c of original.population){assert.deepEqual(S.evaluate(c,L.JUDGES),L.judge(c));assert.deepEqual(S.evaluate(c,L.JUDGES),{judges:c.judges,total:c.total});}
});
test('seeded annual pool has three distinct known judges; fixed remains original three; reproducible across years',()=>{
 const combinations=new Set();
 for(const seed of original.grid.seeds)for(let year=1;year<=6;year++){
  const panel=S.panelFor(seed,year);assert.deepEqual(panel,S.panelFor(seed,year));assert.equal(panel.length,3);assert.equal(new Set(panel.map(j=>j.id)).size,3);assert(panel.every(j=>S.JUDGE_POOL.some(p=>p.id===j.id)));combinations.add(panel.map(j=>j.id).sort().join('/'));
  assert.deepEqual(S.panelFor(seed,year,'fixed'),L.JUDGES);
 }
 assert(combinations.size>1);assert.equal(S.JUDGE_POOL.length,5);
 assert.throws(()=>S.panelFor(0,1));assert.throws(()=>S.panelFor(42,0));assert.throws(()=>S.createSeason({aggregation:'best'}));
});
test('first annual boundary announces then opens, entry exactly once, time continues without entry',()=>{
 const initial=S.createSeason(),originalCopy=structuredClone(initial);assert.equal(S.fairStatus(initial).status,'upcoming');assert.equal(S.fairStatus(initial).opensAt,12);assert.throws(()=>S.enterFair(initial,1));assert.throws(()=>S.skipFair(initial));
 let s=S.annualAdvance(initial,11);assert.equal(S.fairStatus(s).status,'upcoming');s=S.annualAdvance(s,1);assert.equal(S.fairStatus(s).year,1);assert.equal(S.fairStatus(s).status,'open');
 const entered=S.enterFair(s,1);assert.equal(S.fairStatus(entered).status,'submitted');assert.throws(()=>S.enterFair(entered,2));assert.throws(()=>S.skipFair(entered));assert.equal(S.annualAdvance(entered,1).month,13);
 const unentered=S.annualAdvance(s,12);assert.equal(unentered.month,24);assert.deepEqual(unentered.history,[{kind:'skip',year:1,month:24,reason:'次の年を迎えたため見送り'}]);assert.equal(S.fairStatus(unentered).status,'open');assert.equal(S.fairStatus(unentered).year,2);assert.deepEqual(initial,originalCopy);
});
test('manual skip and multi-boundary advance never duplicate history or stop aging',()=>{
 const s=S.skipFair(S.nextFair(S.createSeason())),old=structuredClone(s);assert.equal(S.fairStatus(s).status,'skipped');assert.throws(()=>S.enterFair(s,1));
 const next=S.annualAdvance(s,36);assert.equal(next.month,48);assert.deepEqual(next.history.map(h=>h.year),[1,2,3]);assert(next.history.every(h=>h.kind==='skip'));assert.equal(S.fairStatus(next).year,4);assert.deepEqual(s,old);
 const at0=S.createSeason();assert.equal(S.nextFair(at0).month,12);assert.equal(S.nextFair(S.nextFair(at0)).month,24);
});
test('real same barrel can return next year, score ages, sample loss exact and history frozen',()=>{
 for(const consumption of ['none','small']){
  let s=S.nextFair(S.createSeason({consumption}));const before=structuredClone(s),c=s.casks[1];s=S.enterFair(s,c.id);const first=structuredClone(s.history[0]),used=L.CONDITIONS.consumption[consumption];
  assert.equal(s.casks[1].litres,c.litres-used);assert.equal(first.profile.litres,c.litres);assert.equal(first.consumed,used);assert.equal(first.fieldSize,4);assert.deepEqual(before.history,[]);
  s=S.nextFair(s);const afterAge=structuredClone(s.casks[1]);assert.equal(afterAge.age,c.age+12);s=S.enterFair(s,c.id);assert.equal(s.history[1].year,2);assert.equal(s.history[1].caskId,c.id);assert.notDeepEqual(first.evaluation,s.history[1].evaluation);assert.deepEqual(s.history[0],first);assert.equal(s.casks[1].litres,afterAge.litres-used);
 }
});
test('competition rank handles ties; recommendations must beat all rivals and reach80',()=>{
 const panel=L.JUDGES,field=S.rivals().map(c=>S.evaluate(c,panel));
 for(const rival of S.rivals()){
  let s=S.nextFair(S.createSeason({panelMode:'fixed'}));s.casks[0]={...rival,id:1,sampled:0};const entered=S.enterFair(s,1),entry=entered.history[0],evaluation=S.evaluate(rival,panel);
  assert.equal(entry.rank,1+field.filter(r=>r.total>evaluation.total).length);
  for(const [i,j] of evaluation.judges.entries())assert(!entry.recommendations.includes(j.name));
 }
 let positive=0;
 for(const c of original.population){
  let s=S.nextFair(S.createSeason({panelMode:'rotating',seed:7181}));s.casks[0]={...c,id:1,sampled:0};const entry=S.enterFair(s,1).history[0],scores=entry.rivals;
  for(let i=0;i<3;i++){const j=entry.evaluation.judges[i],eligible=j.score>=80&&scores.every(r=>j.score>r.judges[i].score);assert.equal(entry.recommendations.includes(j.name),eligible);if(eligible)positive++;}
 }
 assert(positive>0);
});
test('recommendations switch never changes scores/ranks; median is actual middle score; no taste changes',()=>{
 const a=S.nextFair(S.createSeason()),b=S.nextFair(S.createSeason({recommendations:false})),ea=S.enterFair(a,2),eb=S.enterFair(b,2);
 assert.deepEqual(ea.history[0].evaluation,eb.history[0].evaluation);assert.equal(ea.history[0].rank,eb.history[0].rank);assert.deepEqual(eb.history[0].recommendations,[]);
 for(const c of original.population){const result=S.evaluate(c,L.JUDGES,{aggregation:'median'});assert.equal(result.total,[...L.judge(c).judges.map(j=>j.score)].sort((a,b)=>a-b)[1]);}
 assert.deepEqual(a.casks,b.casks);
});
test('sell then next batch keeps seasonal options/history/four slots; bounded aging remains transactional',()=>{
 const s=S.enterFair(S.nextFair(S.createSeason()),1),copy=structuredClone(s),next=S.seasonalReplace(s,1,{stop:30,type:'bourbon'});
 assert.equal(next.version,'ambertime-contest/0.2');assert.deepEqual(next.options,s.options);assert.deepEqual(next.history,s.history);assert.equal(next.casks.length,4);assert.equal(next.casks[0].age,0);assert.equal(next.casks[0].id,5);assert.deepEqual(next.casks.slice(1),s.casks.slice(1));assert.equal(next.sold.length,1);assert.deepEqual(s,copy);assert.throws(()=>S.annualAdvance(s,60));assert.deepEqual(s,copy);
 const poor=S.nextFair(S.createSeason());poor.casks[0].litres=.01;const before=structuredClone(poor);assert.throws(()=>S.enterFair(poor,1));assert.deepEqual(poor,before);
});
