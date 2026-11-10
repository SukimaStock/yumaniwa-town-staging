import test from 'node:test';import assert from 'node:assert/strict';
import {bottlingScenario,stageOneRegression} from './scenarios.mjs';import {longRun,relationExperiment} from './experiments.mjs';
import {runComparison} from '../model.mjs';
import {readFileSync} from 'node:fs';
test('feasible native bottling trajectories agree with stage1 and compact retail totals',()=>{
 for(const seed of [1,42,20261021])for(const months of [12,60]){const old=runComparison({seed,months});for(const [i,mode]of ['whole','singles','aged'].entries()){const r=bottlingScenario(mode,{seed,months});assert.equal(r.bottled,old.split[i].bottled);assert.equal(r.sold,old.split[i].sold);assert.equal(r.inventory,old.split[i].inventory);assert.ok(r.peak<=8);assert.equal(r.compact.retail.bottles,r.sold);assert.equal(Object.keys(r.compact.identities).length,r.source.releases.length);}}
});
test('54 ID counterfactual is distinct from legal stock path',()=>{
 const r=runComparison();assert.equal(r.splitDiagnostic.cases[0].sold,r.splitDiagnostic.cases[1].sold);assert.notDeepEqual(r.splitDiagnostic.cases[0].unlock,r.splitDiagnostic.cases[1].unlock);assert.equal(bottlingScenario('singles').bottled,53);
});
test('delivery-only, pauses, capacity and candidate weights expose tradeoffs',()=>{
 const p=relationExperiment('procurement');assert.ok(p.delivery.score>0);assert.equal(p.sale.score,0);assert.equal(p.sale.coverage,'partial');
 const b=relationExperiment('bulk');assert.equal(b.delivery.currentStreak,0);assert.ok(b.delivery.historicalMaxStage>0);
 assert.ok(relationExperiment('continuous',{capacity:4}).sale.score>relationExperiment('continuous',{capacity:12}).sale.score);
 assert.ok(relationExperiment('continuous',{weight:1}).sale.score>relationExperiment('continuous',{weight:0}).sale.score);
});
test('12/360/1200 month synthetic reads equal, products capped, JSON preserves',()=>{
 for(const months of [12,360,1200]){const r=longRun(months);assert.ok(r.readEqual);assert.ok(r.peak<=8);assert.deepEqual(JSON.parse(JSON.stringify(r.model)),r.model);assert.equal(r.sold+r.remaining,r.releaseCount*54);}
});
test('36 conditions retain recorded stage1 results without changing native economics',()=>{
 const rows=stageOneRegression();assert.equal(rows.length,36);const raw=JSON.parse(readFileSync(new URL('../results.json',import.meta.url)));for(const r of rows){const prior=raw.matrix.find(x=>['seed','focus','smoke','months'].every(k=>x.config[k]===r[k]));assert.ok(prior);assert.deepEqual(r.sales,prior.strategies.map(s=>s.sold));assert.deepEqual(r.revenues,prior.strategies.map(s=>s.revenue));}
});
