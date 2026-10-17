import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../../../partner-orders.mjs';
import * as M from '../../../model.mjs';
import {PARALLEL_PARAMETERS as P} from '../../../economy-parameters.mjs';
import {spiritProfile} from '../../../spirit-view.mjs';
import {MODELS,FAMILY_KEYS,INITIAL,CONTRACT,profileAt,createConditions,fractionAt,collectedLoads,createRecipe,repeatRecipe} from '../models.mjs';
const SEEDS=[1,2,42,891,104729,20261015,2147483647,4294967295];
const close=(a,b,epsilon=1e-12)=>assert(Math.abs(a-b)<=epsilon,`${a} differs from ${b} by more than ${epsilon}`);
function stop(s,position){s=D.startDistillation(s);for(let i=0;i<position;i++)s=D.distillStep(s);return D.stopDistillation(s);}
const fingerprint=p=>JSON.stringify(p);

test('control exactly matches public player extraction for eight seeds and every legal position',()=>{
 for(const seed of SEEDS)for(let position=P.minimumStop;position<100;position++){
  const s=stop(D.newUsualDistillery(seed),position),actual=s.core.spirit,p=profileAt('current',position,seed);
  assert.equal(p.litres,actual.litres);assert.equal(p.cut,actual.cut);assert.equal(p.roughness,actual.roughness);assert.equal(p.character,actual.character);assert.equal(p.wood,actual.wood);assert.equal(p.phrase,spiritProfile(actual).phrase);
  assert.equal(p.phase,'forecast');assert.equal(p.components,null);assert.equal(p.instant,null);
 }
});

test('shared conditions consume the same first batch and three cask draws, then match the second batch',()=>{
 for(const seed of SEEDS){
  const started=D.startDistillation(D.newUsualDistillery(seed)),conditions=createConditions(seed);
  assert.equal(conditions.variation,started.still.distillation.variation);
  let s=D.fillBarrel(stop(D.newUsualDistillery(seed),30),'refill');
  assert.deepEqual(conditions.caskVariation,s.core.casks[0].variation);assert.equal(conditions.rngStateAfterCask,s.core.rngState);
  s=D.tickDistillery(s);assert.equal(s.decisions.length,0);assert.equal(s.trade.offer,null);s=stop(s,73);
  const next=profileAt('current',73,seed,1);assert.equal(next.roughness,s.core.spirit.roughness);assert.equal(next.character,s.core.spirit.character);
  s=D.fillBarrel(s,'bourbon');assert.deepEqual(createConditions(seed,1).caskVariation,s.core.casks[1].variation);assert.equal(createConditions(seed,1).rngStateAfterCask,s.core.rngState);
 }
});

test('all models retain the same collected volume and stimulation; only aroma differs',()=>{
 for(const seed of SEEDS)for(let p=0;p<100;p++){
  const profiles=MODELS.map(m=>profileAt(m.id,p,seed));
  for(const v of profiles){assert.equal(v.litres,profiles[0].litres);assert.equal(v.roughness,profiles[0].roughness);assert(Number.isFinite(v.litres));assert(v.litres>=0&&v.litres<40);}
  if(p>=30)for(const v of profiles){assert(v.character>=0&&v.character<=1);assert(v.roughness>=0&&v.roughness<=1);assert.equal(v.cut,(p-30)/70);}
 }
});

test('before minimumStop no model presents an unavailable stop result or an aroma prediction',()=>{
 for(const id of MODELS.map(m=>m.id))for(let p=0;p<30;p++){
  const v=profileAt(id,p,42);assert.equal(v.phase,'collecting');assert.equal(v.cut,null);assert.equal(v.roughness,null);assert.equal(v.character,null);assert.equal(v.components,null);assert.equal(v.instant,null);assert.equal(v.phrase,'原酒を集めています。');assert.equal(v.litres,Math.round(24*p/30*100)/100);
 }
});

test('mixture accounts for the first 24 L and conserves each nonnegative aroma load',()=>{
 for(const id of ['a','b'])for(let p=30;p<100;p++){
  const shape=collectedLoads(id,p),v=profileAt(id,p,42),variation=createConditions(42).variation;
  for(const key of Object.keys(shape.mass)){assert(shape.mass[key]>=0);close(shape.concentration[key]*shape.litres,shape.mass[key]);close(v.componentMass[key],shape.mass[key]*variation);}
  if(id==='b'){
   close(Object.values(v.composition).reduce((a,b)=>a+b,0),1);close(Object.values(v.components).reduce((a,b)=>a+b,0),v.character);
   for(const key of FAMILY_KEYS){assert(v.components[key]>=0);close(v.components[key]*v.litres,v.componentMass[key]);}
  }
  if(p===30)for(const key of Object.keys(INITIAL[id]))close(shape.mass[key],INITIAL[id][key]*24);
  if(p===99)assert(Object.values(shape.mass).every(n=>n>0));
 }
});

test('each mixture increment equals the actual added litres times its midpoint concentrations',()=>{
 for(const id of ['a','b'])for(let p=30;p<99;p++){
  const before=collectedLoads(id,p),after=collectedLoads(id,p+1),dV=after.litres-before.litres;
  for(const key of Object.keys(before.mass)){
   let added=0;for(let j=0;j<16;j++)added+=fractionAt(id,(p-30+(j+.5)/16)/70)[key]*dV/16;
   close(after.mass[key]-before.mass[key],added,1e-11);
  }
 }
});

test('mixture integration converges under refinement and changes smoothly at adjacent stop positions',()=>{
 for(const id of ['a','b'])for(let p=30;p<100;p++){
  const shape=collectedLoads(id,p,16),refined=collectedLoads(id,p,128);
  for(const key of Object.keys(shape.mass))close(shape.concentration[key],refined.concentration[key],1e-6);
  if(p===30)continue;const before=profileAt(id,p-1),after=profileAt(id,p);
  assert(Math.abs(after.character-before.character)<.025);assert(Math.abs(after.roughness-before.roughness)<.011);
  if(id==='b')for(const key of FAMILY_KEYS)assert(Math.abs(after.composition[key]-before.composition[key])<.025);
 }
});

test('A has a collected aroma crest rather than a final-position maximum, while later collection adds volume',()=>{
 for(const seed of SEEDS){
  const a=Array.from({length:70},(_,i)=>profileAt('a',i+30,seed)),peak=a.reduce((best,v)=>v.character>best.character?v:best);
  assert(peak.progress>=55&&peak.progress<=75);assert(peak.character>a[0].character+.30);assert(peak.character>a.at(-1).character+.06);
  assert(a.at(-1).litres>peak.litres+4);assert(a.at(-1).roughness>peak.roughness);assert.notEqual(a[0].phrase,peak.phrase);
 }
});

test('B moves from light to fruit to grain through a cumulative mixture, distinct from current fractions',()=>{
 for(const seed of SEEDS){
  const early=profileAt('b',30,seed),middle=profileAt('b',60,seed),late=profileAt('b',99,seed);
  assert(early.composition.light>.8);assert(middle.composition.fruit>.6);assert(late.composition.grain>late.composition.fruit);assert(late.composition.fruit>.35);
  assert.match(early.phrase,/軽い/);assert.match(middle.phrase,/果実が前/);assert.match(late.phrase,/穀物の厚みが前/);
  assert(middle.composition.light>middle.instant.composition.light+.20);assert(late.composition.fruit>late.instant.composition.fruit+.30);
  assert(late.instant.composition.grain>.99);assert(late.composition.grain<.5);
 }
});

test('recipe replay is versioned, deterministic across retries and independent of selection history',()=>{
 for(const modelId of MODELS.map(m=>m.id)){
  const recipe=createRecipe({modelId,seed:42,stopAt:73,type:'refill'}),raw=JSON.stringify(recipe);
  assert(Object.isFrozen(recipe));assert.equal(recipe.contract,CONTRACT);
  const expected=fingerprint(profileAt(modelId,73,42));
  for(const other of MODELS)for(const p of [30,60,99])profileAt(other.id,p,891);
  assert.equal(fingerprint(repeatRecipe(JSON.parse(raw))),expected);assert.equal(fingerprint(repeatRecipe(recipe)),expected);assert.notEqual(fingerprint(repeatRecipe(recipe,1)),expected);
  assert.throws(()=>repeatRecipe({...recipe,contract:'old-version'}));assert.throws(()=>repeatRecipe({...recipe,modelId:'missing'}));
 }
 const variations=SEEDS.map(seed=>createConditions(seed).variation);assert.equal(new Set(variations).size,SEEDS.length);assert(Math.max(...variations)-Math.min(...variations)>.02);
});

test('invalid experiment inputs fail without accepting an implicit player save',()=>{
 for(const seed of [0,-1,4294967296,1.2,NaN,'42'])assert.throws(()=>createConditions(seed));
 for(const batch of [-1,100,1.2,null])assert.throws(()=>createConditions(42,batch));
 for(const p of [-1,100,30.5,NaN,'60'])assert.throws(()=>profileAt('a',p));
 assert.throws(()=>profileAt('unknown',60));assert.throws(()=>createRecipe({modelId:'a',stopAt:29}));assert.throws(()=>createRecipe({modelId:'a',stopAt:100}));assert.throws(()=>createRecipe({modelId:'a',stopAt:60,type:'missing'}));
 for(const cut of [-.1,1.1,NaN])assert.throws(()=>fractionAt('b',cut));
 for(const steps of [0,1025,1.5])assert.throws(()=>collectedLoads('a',60,steps));
});

test('experiment inspection leaves player state, RNG, operations and save bytes unchanged',()=>{
 const player=stop(D.newUsualDistillery(42),63),raw=D.serializeDistillery(player),rng=player.core.rngState;
 for(const m of MODELS)for(let p=0;p<100;p++)profileAt(m.id,p,player.seed);
 assert.equal(D.serializeDistillery(player),raw);assert.equal(player.core.rngState,rng);assert.deepEqual(D.restoreDistillery(raw),player);
 const root=new URL('../../../',import.meta.url);
 for(const name of fs.readdirSync(root).filter(n=>/\.(mjs|html)$/.test(n))){const content=fs.readFileSync(new URL(name,root),'utf8');assert(!/(?:from\s*['"][^'"]*experiments\/distillation|import\s*\(['"][^'"]*experiments\/distillation|<script[^>]*src=['"][^'"]*experiments\/distillation)/.test(content),`${name} must not import the experimental model into the player runtime`);}
 const source=fs.readFileSync(new URL('../models.mjs',import.meta.url),'utf8');assert(!/localStorage|sessionStorage|Math\.random|setInterval|setTimeout/.test(source));
});
