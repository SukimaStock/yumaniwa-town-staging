import test from 'node:test';
import assert from 'node:assert/strict';
import {SEEDS,SPECIAL,simulateRecipe,matches} from '../design/partners/feasibility.mjs';
import {ECONOMY_PARAMETERS as C,PARALLEL_PARAMETERS as E} from '../economy-parameters.mjs';

test('pilot flavour order has two cask recipes in every sampled seed',()=>{
 for(const seed of SEEDS)for(const type of ['bourbon','refill']){
  const [row]=simulateRecipe(seed,65,type,'wait',[24]);assert.ok(matches(row),`${seed}/${type}`);
  assert.ok(SPECIAL.price>row.standard);assert.equal(row.upkeep,288);
 }
});
test('tasting boundaries distinguish aroma failures from roughness failures',()=>{
 const [light]=simulateRecipe(42,48,'bourbon','wait',[24]);
 const [rough]=simulateRecipe(42,99,'refill','wait',[24]);
 assert.ok(light.character<=SPECIAL.characterMinExclusive);assert.equal(matches(light),false);
 assert.ok(rough.roughness>SPECIAL.roughnessMax);assert.equal(matches(rough),false);
 assert.deepEqual(simulateRecipe(42,65,'refill','wait',[24]),simulateRecipe(42,65,'refill','wait',[24]));
});
test('fixed special price exceeds the standard-price upper bound at the agreed age',()=>{
 // balance<=1, character<=1; wood and harshness penalties cannot add value.
 const raw=(14+C.maturePremium*(1-Math.exp(-SPECIAL.age/16))+5)*E.marketMultiplier;
 const standardUpper=Math.max(C.minPrice,Math.min(C.maxPrice,Math.round(raw*100)/100));
 assert.ok(SPECIAL.price>standardUpper);assert.equal(standardUpper,26.03);
});
