import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {createGenerationSummary,buildGenerationSummaries as summaries} from '../generation-summary.mjs';
import {lateRelease,finishExtraction,advance} from './generation-helpers.mjs';
import {fill,release} from './brands-helpers.mjs';
const era=(id,startedMonth=0,extra={})=>({id,startedMonth,lastStatus:'pending',lastCaskId:null,lastBatchId:null,...extra});
const snapshot=(id=1,extra={})=>({core:{month:0,cash:100,casks:[],products:[],totals:{bottlesSold:0}},generations:{active:era(id),completed:[]},shop:{relations:[],deliveries:[]},...extra});
const run=(c,before,after,key='month')=>c.observe({operation:{key},before,after});
test('new career exact counts and detached save/cold restore',()=>{
 let s=D.newBrandIdentityDistillery(42);s=release(s,{age:6});s=advance(s,2);
 const raw=D.serializeDistillery(s),actual=summaries(s),r=actual[0];assert.equal(r.coverage.complete,true);assert.equal(r.totals.filled,1);assert.equal(r.totals.bottled,s.releases[0].bottles);assert.equal(r.totals.sold,s.core.totals.bottlesSold);assert.equal(D.serializeDistillery(s),raw);
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};import {buildGenerationSummaries} from ${JSON.stringify(new URL('../generation-summary.mjs',import.meta.url).href)};process.stdout.write(JSON.stringify(buildGenerationSummaries(D.restoreDistillery(fs.readFileSync(0,'utf8')))));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),JSON.stringify(actual));
});
test('same-month handover freezes completed totals and estate while successor acts on inherited cask',()=>{
 let s=lateRelease();s=D.startDistillation(s);s=advance(s,1);s=finishExtraction(s);const caskId=s.generations.active.lastCaskId; s=D.handoverGeneration(s,1);
 const frozen=summaries(s)[0],initialCash=s.core.cash;s=D.startDistillation(s);s=finishExtraction(s);let rows=summaries(s);assert.deepEqual(rows[0],frozen);assert.equal(rows[1].totals.filled,1);assert.equal(rows[1].coverage.complete,true);assert.equal(frozen.estate.cash,initialCash);assert.equal(frozen.coverage.complete,false);
 s=advance(s,24);s=D.bottleBranded(s,caskId,{brandId:1});const count=s.releases.at(-1).bottles;rows=summaries(s);assert.deepEqual(rows[0],frozen);assert.equal(rows[1].totals.bottled,count);assert.equal(rows[1].totals.filled,1);
});
test('one transaction includes automatic fills, multiple bottles, all sold channels exactly once',()=>{
 const before=snapshot(),state=snapshot(),c=createGenerationSummary(state);c.observe({operation:null,after:before});
 const after=structuredClone(before);after.core.month=1;after.core.casks=[{id:1}];after.core.products=[{id:11,originalStock:20,age:36},{id:12,originalStock:5,age:48}];after.core.totals.bottlesSold=18;after.core.lastMonth={sales:[{sold:3},{sold:10,channel:'stockist'},{sold:5,channel:'wholesale'}]};after.shop.deliveries=[{id:1,shopId:'department',count:5,month:1,productId:11}];after.department={adoptions:[{deliveryId:1,count:5}]};
 run(c,before,after);run(c,after,structuredClone(after),'price');const r=c.finish(after)[0];assert.deepEqual(r.totals,{filled:1,bottled:25,sold:18});assert.equal(r.events.filter(x=>x.kind==='department-adoption').length,1);assert.equal(r.events.length,2);assert.equal(r.events[1].kind,'mature-bottling');
});
test('no missing era is given fake zero; origin and pre-generation work remain incomplete',()=>{
 const current=snapshot(2,{origin:{core:{month:100}}});current.generations.completed=[era(1,0,{endedMonth:100,lastStatus:'unfinished',lastBatchId:3})];current.generations.active.startedMonth=100;current.core.month=101;
 const c=createGenerationSummary(current);const rows=c.finish();assert.deepEqual(rows[0].totals,{filled:null,bottled:null,sold:null});assert.deepEqual(rows[0].estate,{casks:null,cash:null});assert.equal(rows[0].lastStatus,'unfinished');assert.equal(rows[0].lastCaskId,null);
 const old=snapshot();delete old.generations;const next=structuredClone(old);next.core.products=[{id:1,originalStock:3}];run(c,old,next,'bottle');const enabled=structuredClone(next);enabled.generations={active:era(1),completed:[]};run(c,next,enabled,'enable-generations');assert.equal(c.finish(enabled)[0].coverage.complete,false);assert.deepEqual(c.finish(enabled)[0].totals,{filled:0,bottled:0,sold:0});
});
test('shops are first-by-ID globally; department approval is not adoption',()=>{
 const s=snapshot(),c=createGenerationSummary(s);c.observe({operation:null,after:s});let next=structuredClone(s);next.shop.relations=[{shopId:'town-liquor',brandId:1}];run(c,s,next,'stockist-accept');let old=next;next=structuredClone(old);next.shop.relations.push({shopId:'town-liquor',brandId:2},{shopId:'department',brandId:2});next.department={interests:[{pendingDelivery:{count:5}}],adoptions:[]};run(c,old,next,'department-accept-queue');assert.deepEqual(c.finish(next)[0].events,[{kind:'shop-start',month:0,shopId:'town-liquor'}]);assert.equal(c.finish(next)[0].totals.sold,0);
});

test('lawful delegated fill and automatic bottle count as current-generation work',()=>{
 let s=fill(D.newFreeAgingDistillery(42),{progress:65}),id=s.core.casks[0].id;
 s=D.bottleBranded(s,id,{},1);s=D.hireBottlingStaff(s);s=D.reserveBottling(s,id,{mode:'age',age:1,count:10});s=advance(s,1);assert.equal(s.automation.lastBottlings[0].count,10);
 s=D.hireStaff(s);s=D.reserveStaff(s,id,'once');s=D.beginUsual(s);while(s.still.phase==='distilling')s=D.distillStep(s);
 const raw=D.serializeDistillery(s),r=summaries(s)[0];assert.deepEqual(r.totals,{filled:2,bottled:11,sold:s.core.totals.bottlesSold});assert.equal(r.coverage.complete,true);assert.equal(D.serializeDistillery(s),raw);
});
test('lawful department approval adds no sold bottles and receipt/adoption adds only the authoritative sale delta',async()=>{
 const {shopFixture}=await import('../design/ledger-stage3/fixture.mjs');const fixture=shopFixture();
 const interest=summaries(fixture.interest)[0],pending=summaries(fixture.pending)[0],delivered=summaries(fixture.delivered)[0];
 assert.equal(pending.totals.sold,interest.totals.sold);assert.equal(delivered.totals.sold-pending.totals.sold,fixture.delivered.core.totals.bottlesSold-fixture.pending.core.totals.bottlesSold);assert.equal(delivered.totals.sold,fixture.delivered.core.totals.bottlesSold);assert.equal(fixture.delivered.shop.deliveries.filter(x=>x.shopId==='department').reduce((n,d)=>n+d.count,0),5);
});
