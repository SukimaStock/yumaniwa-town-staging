import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createOpening} from '../opening.mjs';import {PARAMETERS as P} from '../parameters.mjs';import {advanceMonth,restore,serialize,bottle,distill} from '../model.mjs';
test('opening cask is paid, aged by eight ordinary monthly transactions, and has no free money',()=>{
 const s=createOpening(42);assert.equal(s.cash,3364);assert.equal(s.month,8);assert.equal(s.casks.length,1);assert.equal(s.casks[0].age,8);assert.equal(s.casks[0].filledMonth,0);assert.equal(s.casks[0].batchMonth,0);assert.equal(s.totals.costs,P.distillationCost+P.casks.bourbon.cost);assert.equal(s.totals.upkeep,8*(P.baseUpkeep+P.caskUpkeep));assert.equal(s.totals.revenue,0);assert(s.casks[0].litres<34.4);assert.deepEqual(s,restore(serialize(s)));assert.deepEqual(s,createOpening(42));
});
test('first month exposes a real volume, cash and wood change without scene logic',()=>{
 const before=createOpening(),after=advanceMonth(before);assert.equal(after.month,before.month+1);assert.equal(after.cash,before.cash-27);assert(after.casks[0].litres<before.casks[0].litres);assert(after.casks[0].wood>before.casks[0].wood);assert(after.casks[0].roughness<before.casks[0].roughness);assert.notEqual(after.casks[0].litres.toFixed(1),before.casks[0].litres.toFixed(1));
});
test('opening leaves money for bottling or a second production batch',()=>{
 const s=createOpening();assert(bottle(s,s.casks[0].id).products.length===1);assert(distill(s,.35).spirit);let later=s;for(let i=0;i<28;i++)later=advanceMonth(later);assert.equal(later.casks[0].age,36);assert(later.cash>0);assert(bottle(later,later.casks[0].id).products.length===1);
});
test('0.1 save fixtures retain empty games, partial casks, custom prices, IDs and seed exactly',()=>{
 for(const name of ['v01-game.json','v01-empty.json']){const text=readFileSync(new URL('./fixtures/'+name,import.meta.url),'utf8');const s=restore(text);assert.equal(serialize(s),text.trim());const again=restore(serialize(advanceMonth(s)));assert.equal(again.month,s.month+1);}
 const game=restore(readFileSync(new URL('./fixtures/v01-game.json',import.meta.url),'utf8'));assert.equal(game.products[0].price,37.5);assert(game.casks.length===1&&game.products.length===1);assert.equal(game.seed,42);
});

test('paid opening supports early/long/balanced ten-year policies without breaking accounts',async()=>{
 const {compareOpening}=await import('../opening-balance.mjs');const rs=compareOpening();assert.equal(rs.runs.length,24);
 for(const r of rs.runs){assert(r.after.minCash>0);assert(r.after.liveCasks<=4);assert(r.after.revenue>0);assert.equal(r.after.endMonth-r.after.startMonth,120);assert.equal(Math.round(r.after.cash*100),Math.round((P.startingCash+r.after.revenue-r.after.costs-r.after.upkeep)*100));}
});
