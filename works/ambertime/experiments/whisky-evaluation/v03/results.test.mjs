import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as M from './model.mjs';
import {makeProduct} from '../v02/model.mjs';
const d=JSON.parse(fs.readFileSync(new URL('./results.json',import.meta.url)));
test('full 100-seed matrix and CSV preserve physical sales and signed memory boundaries',()=>{
 assert.equal(new Set(d.seeds).size,100);assert.equal(d.conditionCount,4500);assert.equal(d.observationRows,22500);assert.deepEqual(d.checks,{salesEqualAcrossPolicies:2400,baseReplayExact:36,archiveSurvivesGap:1500,nonincreasingGapSupport:1500});
 const lines=gunzipSync(fs.readFileSync(new URL('./comparison.csv.gz',import.meta.url))).toString().trim().split('\n'),header=lines.shift().replace(/^\uFEFF/,'').split(',').map(x=>x.slice(1,-1)),ix=Object.fromEntries(header.map((k,i)=>[k,i]));assert.equal(lines.length,22500);
 for(const line of lines){const row=line.split(',').map(x=>x.slice(1,-1)),num=k=>Number(row[ix[k]]);assert.ok(num('sold')>=0&&num('sold')<=5);const p=makeProduct({sample:row[ix.sample],years:num('years')});assert.ok(Math.abs(num('revenue')-p.price*num('sold'))<.001);assert.ok(num('memoryBonus')>=0&&num('memoryBonus')<=.05);if(num('sold')===0)assert.equal(row[ix.intrinsic],'');else assert.ok(num('contextValue')>=num('intrinsic'));}
});
test('stored causal contexts never cite a product without a preceding real positive evaluation',()=>{
 for(const example of d.examples)for(const o of example.observations){const c=o.view.assessment;if(!c)continue;for(const source of c.expectationComponents){const r=o.view.archive.find(r=>r.productId===source.productId);assert.ok(r);assert.notEqual(r.productId,o.productId);assert.ok(r.evaluations.some(e=>e.month<c.month&&['like','strong'].includes(e.verdict)));}if(c.priorProductId!==null){const r=o.view.archive.find(r=>r.productId===c.priorProductId);assert.ok(r.evaluations.some(e=>e.month<c.month));}}
});
test('all empty-shelf gaps retain archived records and reduce current evidence',()=>{
 assert.equal(d.gaps.length,1500);for(const seed of d.seeds)for(const shop of M.SHOPS){const rs=d.gaps.filter(r=>r.seed===seed&&r.shop===shop.id).sort((a,b)=>a.gap-b.gap);assert.deepEqual(rs.map(r=>r.gap),[0,3,12,60,120]);for(let i=1;i<rs.length;i++){assert.equal(rs[i].archiveRecords,rs[0].archiveRecords);assert.equal(rs[i].lastSale,rs[0].lastSale);assert.ok(rs[i].support<=rs[i-1].support+1e-12);assert.ok(rs[i].expectationWeight<=rs[i-1].expectationWeight+1e-12);}}
});
test('complete memory example replays exactly and CSV keeps purchases and archive summaries distinct',()=>{
 const text=fs.readFileSync(new URL('./example-log.json',import.meta.url),'utf8').trim(),s=M.restore(text);assert.equal(M.serialize(s),text);assert.match(M.csv(s),/positiveImpression/);assert.match(M.csvMemory(s),/expectationWeight/);assert.match(M.csvMemory(s),/contextBonus/);
});
