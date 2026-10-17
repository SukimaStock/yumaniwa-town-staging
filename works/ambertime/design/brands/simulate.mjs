// Deterministic public-action continuation, not a future-aware strategy search.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as D from '../../partner-orders.mjs';
import {advance,release,exact} from '../../tests/brands-helpers.mjs';
const runs=[];
for(const seed of [1,2,3,4,5,6,7,8,9,10,42,20261017]){
 let s=D.newBrandedDistillery(seed);const cycles=[];
 for(let cycle=0;cycle<3;cycle++){
  s=release(s,{selection:cycle?{brandId:1}:{name:'川霧',bottle:'slender',label:'dark'},progress:[40,65,90][cycle],type:cycle%2?'bourbon':'refill',age:6,tier:cycle%2?'high':'low'});
  s=exact(advance(s,12));
  const error=Math.round((s.core.cash-1600-s.core.totals.revenue+s.core.totals.costs+s.core.totals.upkeep)*100);
  assert.equal(error,0);assert.equal(s.brands.length,1);assert.equal(s.releases.length,cycle+1);assert(s.releases.every(r=>r.status==='sold-out'&&r.sold===r.bottles));
  cycles.push({month:s.core.month,cash:s.core.cash,revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep,release:structuredClone(s.releases.at(-1)),strictRestore:true,cashErrorCents:error});
 }
 runs.push({seed,cycles});
}
const sources=Object.fromEntries(['partner-orders.mjs','economy.mjs','economy-parameters.mjs'].map(p=>[p,createHash('sha256').update(fs.readFileSync(new URL('../../'+p,import.meta.url))).digest('hex')]));
const result={scope:'12 seeds x 3 successive retail releases, same brand; no economy parameter changes',sources,runs};
fs.writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({runs:runs.length,releases:runs.length*3,restore:'all exact',cashIdentity:'all zero cents',finalCash:[Math.min(...runs.map(r=>r.cycles.at(-1).cash)),Math.max(...runs.map(r=>r.cycles.at(-1).cash))]}));
