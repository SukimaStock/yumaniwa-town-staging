import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {aromaPreview,previewForDistillation,AROMA_MODEL} from '../aroma-extraction.mjs';
import {distillationView} from '../spirit-view.mjs';
import {profileAt,collectedLoads} from '../experiments/distillation/models.mjs';
import {fill,advance,exact,release} from './brands-helpers.mjs';
import {cashIdentity} from './wholesale-care-helpers.mjs';
const SEEDS=[1,2,42,891,104729,20261015,2147483647,4294967295];
function extract(state,position){let s=D.startDistillation(state);for(let i=0;i<position;i++)s=D.distillStep(s);return D.stopDistillation(s);}
function runAuto(s){s=D.beginUsual(D.reserveUsual(s));let count=0;while(s.usual.reservation){assert(++count<=99);s=D.distillStep(s);}return {s,count};}

test('all 560 public A extractions exactly match the frozen experiment, with unchanged roughness, yield and RNG',()=>{
 for(const seed of SEEDS)for(let position=30;position<100;position++){
  const actual=extract(D.newAromaDistillery(seed),position),legacy=extract(D.newUsualDistillery(seed),position),oracle=profileAt('a',position,seed);
  assert.equal(actual.core.spirit.character,oracle.character,`seed ${seed} position ${position}`);
  for(const key of ['roughness','litres','cut','wood'])assert.equal(actual.core.spirit[key],legacy.core.spirit[key],key);
  assert.equal(actual.core.rngState,legacy.core.rngState);assert.equal(actual.core.cash,legacy.core.cash);
  assert.equal(aromaPreview(position).character,collectedLoads('a',position).concentration.aroma);
 }
});

test('A forecast is the same collected mixture as the confirmed raw spirit without mutation or draws',()=>{
 for(const seed of SEEDS){let s=D.startDistillation(D.newAromaDistillery(seed));assert.equal(s.still.distillation.model,AROMA_MODEL);
  for(let p=0;p<100;p++){
   const before=JSON.stringify(s),view=distillationView(s);assert.equal(JSON.stringify(s),before);
   if(p<30){assert.equal(view.phase,'collecting');assert.deepEqual(view.axes,[]);assert.throws(()=>D.stopDistillation(s));}
   else {const final=D.stopDistillation(s),confirmed=distillationView(final),oracle=profileAt('a',p,seed);assert.equal(view.phase,'forecast');assert.equal(confirmed.phase,'confirmed');for(const k of ['roughness','character','litres','phrase']){assert.equal(view[k],confirmed[k]);assert.equal(view[k],oracle[k]);}assert.deepEqual(view.axes,confirmed.axes);assert.deepEqual(previewForDistillation(s.still.distillation),aromaPreview(p));}
   if(p<99)s=D.distillStep(s);
  }
  assert.equal(D.distillStep(s).still.distillation.progress,99);assert.equal(s.still.phase,'distilling');
 }
});

test('collected aroma rises to a middle crest then settles smoothly, while stimulation and litres increase',()=>{
 for(const seed of SEEDS){const rows=Array.from({length:70},(_,i)=>profileAt('a',i+30,seed)),peak=rows.reduce((a,b)=>a.character>b.character?a:b);
  assert(peak.progress>=55&&peak.progress<=75);assert(peak.character>rows.at(-1).character+.06);assert(peak.character>rows[0].character+.3);
  for(let i=1;i<rows.length;i++){assert(rows[i].roughness>rows[i-1].roughness);assert(rows[i].litres>rows[i-1].litres);assert(Math.abs(rows[i].character-rows[i-1].character)<.025);}
  assert.notEqual(rows[0].phrase,peak.phrase);assert.notEqual(peak.phrase,rows.at(-1).phrase);
 }
 for(const p of [-1,0,29,100,30.5,NaN])assert.throws(()=>aromaPreview(p));
});

test('manual and one-shot automatic A use identical RNG, raw spirit and cask chemistry at each recipe boundary',()=>{
 for(const seed of SEEDS)for(const type of ['bourbon','refill'])for(const position of [30,65,99]){
  const start=advance(fill(D.newAromaDistillery(seed),{progress:position,type}),1),manual=fill(start,{progress:position,type}),{s:auto,count}=runAuto(start);
  assert.equal(count,position);for(const key of ['core','still','batchesById','notesById','usual'])assert.deepEqual(auto[key],manual[key],key);
  assert.equal(auto.usual.reservation,null);assert.equal(D.distillStep(auto),auto);assert.throws(()=>D.beginUsual(auto));assert.equal(cashIdentity(auto),0);assert.deepEqual(exact(auto),auto);
 }
});

test('A distillation preserves parallel aging, retail and monthly upkeep in manual and automatic histories',()=>{
 let s=advance(release(D.newAromaDistillery(42),{progress:80,type:'bourbon'}),1);s=advance(fill(s,{progress:80,type:'bourbon'}),1);
 let manual=D.startDistillation(s),auto=D.beginUsual(D.reserveUsual(s));
 for(let tick=1;tick<=80;tick++){manual=D.distillStep(manual);auto=D.distillStep(auto);if(tick===60){manual=advance(manual,1);auto=advance(auto,1);assert.deepEqual(auto.core,manual.core);}}
 manual=D.fillBarrel(D.stopDistillation(manual),'bourbon');assert.deepEqual(auto.core,manual.core);assert.deepEqual(auto.releases,manual.releases);assert(auto.releases[0].sold>s.releases[0].sold);assert.equal(auto.core.casks[0].age,s.core.casks[0].age+1);assert.equal(auto.core.month,s.core.month+1);assert.equal(cashIdentity(auto),0);assert.deepEqual(exact(auto),auto);
});
