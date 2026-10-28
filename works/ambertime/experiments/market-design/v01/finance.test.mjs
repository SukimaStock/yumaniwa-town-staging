import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {assertSourceIdentity} from './native-adapter.mjs';
const read=name=>fs.readFile(new URL(name,import.meta.url),'utf8').then(JSON.parse);
const round=x=>Math.round(x*100)/100;
test('native source identity remains pinned to original audit boundary',async()=>{const source=await assertSourceIdentity();assert(source.runtimeFiles>0);});
test('all packaged financial trajectories retain cash and bottle conservation and snapshots',async()=>{
 const evidence=await read('./economic-results.json'),keys=new Set(),cache=new Map();assert.equal(evidence.complete,true);assert.equal(evidence.runCount,84);assert.equal(evidence.runs.length,84);
 let count=0;
 for(const r of evidence.runs){const key=JSON.stringify([r.seed,r.cap,r.age,r.policy,r.recipe,r.tier,r.warmupMonths??0,r.repositionMonth??36]);assert(!keys.has(key));keys.add(key);if(!cache.has(r.trajectoryFile))cache.set(r.trajectoryFile,await read('./'+r.trajectoryFile));const trace=cache.get(r.trajectoryFile).trajectories[r.trajectoryIndex];assert.equal(trace.monthly.length,r.months);assert.equal(trace.seed,r.seed);assert.equal(trace.policy,r.policy);
  for(const row of trace.monthly){assert.equal(row.cash,round(1600+row.cumulativeRevenue-row.capital.allPaidCosts-row.capital.allPaidUpkeep));const produced=r.bottling.filter(b=>b.month<row.month).reduce((n,b)=>n+b.count,0);assert.equal(row.stock+row.cumulativeSold,produced);assert.equal(row.fundingGap,round(Math.max(0,row.nextMinimum-row.cash)));count++;}
  for(const m of [3,6,12])assert.deepEqual(r.snapshots[m],trace.monthly.find(x=>x.month===m)??null);
 }
 assert.equal(count,5979);assert.equal(evidence.runs.filter(r=>r.months<72).length,6);
});
test('matched destination careers naturally unlock shops before the actual return',async()=>{const e=await read('./economic-results.json'),r=e.runs.filter(r=>r.warmupMonths===36);assert.equal(r.length,3);const best=r.find(x=>x.policy==='best'),worst=r.find(x=>x.policy==='worst'),move=r.find(x=>x.policy==='reposition');assert(best.endCash>worst.endCash);assert(worst.fundingGap>0);assert.equal(move.fundingGap,0);assert.equal(move.returns.reduce((n,r)=>n+r.count,0),160);assert(move.returns.every(r=>r.month===48&&move.unlock[r.to]<r.month));});
