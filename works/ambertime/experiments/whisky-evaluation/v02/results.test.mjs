import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {restore,serialize} from './model.mjs';
const d=JSON.parse(fs.readFileSync(new URL('./results.json',import.meta.url)));
test('100-seed full matrix covers native holdouts, physical counts and actual buyer events',()=>{
 assert.equal(d.seeds.length,100);assert.equal(new Set(d.seeds).size,100);assert.equal(d.conditionCount,46800);assert.equal(d.observationRows,140400);assert.equal(d.holdouts.length,8);
 const lines=gunzipSync(fs.readFileSync(new URL('./comparison.csv.gz',import.meta.url))).toString().trim().split('\n'),keys=lines.shift().split(',').map(x=>x.slice(1,-1)),ix=Object.fromEntries(keys.map((k,i)=>[k,i]));assert.equal(lines.length,140400);
 for(const l of lines){const r=l.split(',').map(x=>x.slice(1,-1)),n=k=>Number(r[ix[k]]);assert.equal(n('sold')+n('remaining'),5);assert.equal(n('sold'),n('evaluations'));assert.ok(Math.abs(n('revenue')-n('sold')*n('price'))<.001);assert.ok(n('strongCount')<=n('supportCount'));assert.ok(n('supportCount')+n('missCount')<=n('evaluations'));}
});
test('stored real operation example strictly replays',()=>{const text=fs.readFileSync(new URL('./example-log.json',import.meta.url),'utf8').trim();assert.equal(serialize(restore(text)),text);});
test('retained sales imbalance and niche support are reported rather than equalized',()=>{
 assert.equal(d.perSeedWinners.sold.bar,45628);assert.ok(d.perSeedWinners.sold.diner<d.perSeedWinners.groups);assert.ok(d.perSeedWinners.sold.bar<d.perSeedWinners.groups);
 const get=shop=>d.summaries.find(x=>x.recipe==='deep'&&x.years===20&&x.tier==='standard'&&x.months===3&&x.shop===shop);assert.ok(get('specialist').sold.mean<get('bar').sold.mean);assert.ok(get('specialist').strongCount.mean>get('bar').strongCount.mean);
});
