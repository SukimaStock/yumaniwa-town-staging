import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as B from '../v01/model.mjs';
import * as N from './model.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url))),d=read('./results.json'),audit=read('./audit-baseline.json');
test('stored full baseline reproduced exactly and source bias counts match',()=>{assert.equal(audit.reproduction.checkedConditions,2160);assert.deepEqual(audit.reproduction.mismatches,[]);assert.deepEqual(audit.reproduction.baselineWins,{support:398,strong:461,both:359});});
test('30 seeds cover full representative matrix and 16 unrelated native recipe holdouts',()=>{
 assert.equal(new Set(d.seeds).size,30);assert.equal(d.conditionCountPerVariant,30*4*6*3*3*2);assert.equal(d.holdout.conditionsPerVariant,30*16*6*3*3*2);assert.equal(d.rows.length,5*432*4);
 assert.ok(d.seedWinRecords.every(x=>x.variants.guarded.both<x.variants.baseline.both));assert.ok(d.wins.guarded.strong.balanced<d.wins.baseline.strong.balanced);assert.equal(d.aggregate.guarded.cappedConditions,0);assert.equal(d.holdout.aggregate.guarded.cappedConditions,0);
 for(const a of [d.ageChecks.guarded,d.holdout.ageChecks.guarded]){assert.equal(a.allUp,0);assert.equal(a.mixed,a.pairs);}
 for(const s of B.SAMPLES)assert.ok(d.wins.guarded.strong[s.id]>0);assert.ok(d.wins.guarded.support.smoke>d.wins.guarded.support.balanced);assert.ok(d.wins.guarded.strong.balanced>d.wins.guarded.strong.smoke);
});
test('all full CSV records retain distribution counts, raw values, and A/C decision equality',()=>{
 const text=gunzipSync(fs.readFileSync(new URL('./all-30-seeds.csv.gz',import.meta.url))).toString('utf8').trimEnd(),lines=text.split('\n'),parse=line=>line.split(',').map(x=>x.slice(1,-1));const header=parse(lines.shift()),ix=Object.fromEntries(header.map((k,i)=>[k,i]));assert.equal(lines.length,12960*4);const prior=new Map();
 for(const line of lines){const row=parse(line),variant=row[ix.variant],key=row.slice(0,6).join(':');assert.equal(row[ix.histogram].split('|').map(Number).reduce((a,b)=>a+b),120);if(variant==='salience')prior.set(key,row);if(variant==='guarded'){const a=prior.get(key);assert.ok(a);for(const k of ['support','strong','rawPeak','rawSupportStrength'])assert.equal(row[ix[k]],a[ix[k]]);assert.equal(Number(row[ix.ceilingRate]),0);}}
 assert.equal(prior.size,12960);
});
test('new evaluation uses physical profile and preferences, never recipe/sample ID rewards',()=>{
 const c=B.DEFAULT,b=B.bottle(c),r=N.evaluate(c,N.ADOPTED,b);for(const id of ['smoke','deep','sweet','unseen-holdout']){const renamed={...b,sample:id,name:id};const x=N.evaluate(c,N.ADOPTED,renamed);assert.deepEqual(x.people.map(p=>p.score),r.people.map(p=>p.score));}
 for(const h of d.holdout.recipes)assert.ok(!B.SAMPLES.some(s=>JSON.stringify(s.recipe)===JSON.stringify(h.recipe)));
});
