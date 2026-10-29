import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './model.mjs';
test('deterministic cohort, evaluation, export and replay',()=>{
 const a=M.exportLog(M.DEFAULT);assert.deepEqual(a,M.exportLog(M.DEFAULT));assert.deepEqual(M.replay(JSON.parse(JSON.stringify(a))),a);
 assert.notDeepEqual(M.cohort('bar',42),M.cohort('bar',43));assert.equal(M.cohort('bar',42).length,120);
 assert.match(M.csv(a),/\uFEFF"sample"/);assert.equal(M.csv(a).split('\r\n').length,7);
});
test('comparisons change exactly one condition and retain people',()=>{
 for(const dimension of ['years','sample','shop','model'])for(const r of M.compare(M.DEFAULT,dimension)){
  for(const k of Object.keys(M.DEFAULT))if(k!==dimension)assert.deepEqual(r.conditions[k],M.DEFAULT[k]);
  if(dimension!=='shop')assert.deepEqual(M.cohort(r.conditions.shop,r.conditions.seed),M.cohort(M.DEFAULT.shop,M.DEFAULT.seed));
 }
});
test('fixed flavor and native actual aging stay separate',()=>{
 const rows=M.compare({...M.DEFAULT,aging:'fixed'},'years');for(const r of rows){assert.deepEqual(r.bottle.profile,rows[0].bottle.profile);assert.equal(r.bottle.flavorYears,6);}
 const actual=M.compare(M.DEFAULT,'years');assert.notDeepEqual(actual[0].bottle.profile,actual.at(-1).bottle.profile);
 for(const r of M.compare(M.DEFAULT,'sample'))assert.equal(r.conditions.years,6);
});
test('three maturity curves monotone but distinct on matched conditions',()=>{
 for(const model of Object.keys(M.MODELS)){const values=M.AGES.map(y=>M.ageValue(y,model));assert.ok(values.every((v,i)=>i===0||v>=values[i-1]));assert.equal(values.at(-1),1);}
 const r=M.compare(M.DEFAULT,'model');assert.notEqual(r[0].maturity,r[1].maturity);assert.notEqual(r[1].maturity,r[2].maturity);
});
test('stores and recipes differ; each store includes overlapping individual preferences',()=>{
 assert.equal(new Set(M.compare(M.DEFAULT,'shop').map(x=>x.support)).size,3);
 assert.ok(new Set(M.compare(M.DEFAULT,'sample').map(x=>x.support)).size>=3);
 for(const shop of M.SHOPS){const guests=M.cohort(shop.id);assert.equal(new Set(guests.map(g=>g.type)).size,4);assert.ok(guests.some(g=>g.ageInterest<.35));assert.ok(guests.some(g=>g.ageInterest>.65));}
});
test('long age can deepen support while losing other people, short whisky has fans even at specialist',()=>{
 const young=M.evaluate({...M.DEFAULT,years:1,aging:'fixed'}),old=M.evaluate({...M.DEFAULT,years:20,aging:'fixed'});
 assert.ok(old.people.some((p,i)=>p.score>young.people[i].score));assert.ok(old.people.some((p,i)=>p.score<young.people[i].score));assert.ok(old.peak>young.peak);
 assert.ok(M.evaluate({sample:'balanced',shop:'specialist',years:1}).strong>0);
 assert.ok(M.evaluate({sample:'deep',shop:'diner',years:20}).strong>0);
 const short=M.evaluate({sample:'sweet',shop:'diner',years:3}),long=M.evaluate({sample:'sweet',shop:'diner',years:20});assert.ok(short.support>long.support);
 assert.ok(M.evaluate({sample:'smoke',shop:'specialist',years:20}).strong>M.evaluate({sample:'smoke',shop:'specialist',years:1}).strong);
});
test('age benefit is gated by fit, reactions correspond to each verdict and evidence',()=>{
 for(const sample of M.SAMPLES)for(const shop of M.SHOPS)for(const years of M.AGES){const r=M.evaluate({sample:sample.id,shop:shop.id,years});assert.equal(Object.values(r.counts).reduce((a,b)=>a+b),120);
  for(const p of r.people){assert.ok([p.fit,p.score,p.impression,p.gate].every(x=>x>=0&&x<=1));if(p.gate===0)assert.equal(p.maturity,0);const reaction=M.reaction(p,r.bottle);assert.ok(reaction.reasons.length>=2);if(p.verdict==='miss')assert.match(reaction.text,/合いません/);if(p.verdict==='strong')assert.match(reaction.text,/好きです/);if(p.maturity>=.08)assert.ok(reaction.reasons.some(x=>x.includes('待った時間')));}
 }
});
test('invalid input cannot silently change experiment meaning',()=>{
 for(const bad of [{years:0},{seed:0},{seed:1.5},{sample:'x'},{model:'x'},{aging:'x'},{referenceYears:99}])assert.throws(()=>M.evaluate(bad));
 assert.throws(()=>M.compare({},'invalid'));assert.throws(()=>M.replay({version:'old'}));assert.throws(()=>M.ageValue(-1,'A'));
});
