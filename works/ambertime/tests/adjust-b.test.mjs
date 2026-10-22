import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import * as Lab from '../../ambertime-flavor-lab-v02/model.mjs';
import {previewDistillation} from '../model.mjs';
import {fill as oldFill,advance} from './brands-helpers.mjs';

function steps(s,target){for(let i=0;s.still.distillation.progress<target;i++){assert(i<100);const before=s;s=D.distillStep(s);assert.notEqual(s,before);}return s;}
function fill(s,start,end,fullRange=true){s=fullRange?D.startRangeDistillation(s):D.startDistillation(s);s=D.beginCollection(steps(s,start));return D.fillBarrel(D.stopDistillation(steps(s,end)),'refill');}
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:8*1024*1024}),raw);return D.restoreDistillery(raw);}
const hash=s=>createHash('sha256').update(D.serializeDistillery(s)).digest('hex');

test('three full-range choices map directly to Lab0..1, reuse expense and volume, and cold-replay',()=>{
 const results=[];
 for(const [start,end] of [[0,12],[24,52],[74,99]]){
  let s=D.newConnectedDistillery(20261021),cash=s.core.cash;s=D.startRangeDistillation(s);
  assert.deepEqual(s.operations.at(-1),{key:'start',value:{collectionVersion:2}});assert.equal(s.core.cash,cash-120);
  assert.equal(D.collectionState(s).canStart,true);s=D.beginCollection(steps(s,start));s=steps(s,end);
  assert.equal(s.still.phase,'distilling','reaching chosen end does not confirm collection');
  const before=D.serializeDistillery(s);assert.equal(D.serializeDistillery(cold(s)),before);
  s=D.stopDistillation(s);const choice=s.core.spirit.flavor.choice;
  assert.equal(choice.start,start/99);assert.equal(choice.end,end/99);assert.equal(choice.collectionVersion,2);
  const expected=Lab.distill(choice);for(const [key,value] of Object.entries(expected))assert.equal(s.core.spirit.flavor.spirit[key],Math.round(value*1e12)/1e12);
  assert.equal(s.core.spirit.litres,previewDistillation(69/70*(end/99)).litres);assert.equal(s.core.cash,cash-120);
  assert.deepEqual(s.operations.at(-1),{key:'stop',value:end});
  s=D.fillBarrel(s,'refill');cold(s);results.push(s.core.casks[0].flavor.spirit);
 }
 assert.notDeepEqual(results[0],results[1]);assert.notDeepEqual(results[1],results[2]);
});

test('minimum12steps preserves the unchanged Lab minimum and earliest stop works below old30',()=>{
 let s=D.beginCollection(D.startRangeDistillation(D.newConnectedDistillery(42)));
 s=steps(s,11);assert.equal(D.collectionState(s).canStop,false);assert.throws(()=>D.stopDistillation(s));
 s=D.distillStep(s);assert.equal(D.collectionState(s).canStop,true);s=D.stopDistillation(s);assert.equal(s.still.phase,'filling');assert.equal(s.still.distillation.progress,12);cold(s);
 let last=steps(D.startRangeDistillation(D.newConnectedDistillery(42)),87);assert.equal(D.collectionState(last).canStart,true);last=D.beginCollection(last);last=steps(last,99);assert.equal(D.collectionState(last).canStop,true);assert.equal(D.distillStep(last),last);assert.equal(last.still.phase,'distilling');cold(D.stopDistillation(last));
});

test('missed start holds88 without auto collection; explicit retry preserves paid batch, cash and RNG',()=>{
 let s=steps(D.startRangeDistillation(D.newConnectedDistillery(42)),88),d=D.collectionState(s);
 assert.equal(d.expired,true);assert.equal(d.canStart,false);assert.equal(d.canStop,false);assert.equal(D.distillStep(s),s);assert.throws(()=>D.beginCollection(s));assert.throws(()=>D.stopDistillation(s));
 s=cold(s);const core=JSON.stringify(s.core),batch=JSON.stringify(s.still.batch);s=D.restartRangeDistillation(s);
 assert.equal(JSON.stringify(s.core),core);assert.equal(JSON.stringify(s.still.batch),batch);assert.equal(s.still.distillation.progress,0);assert.equal(s.still.distillation.collectStart,null);assert.equal(D.collectionState(s).canStart,true);
 assert.deepEqual(s.operations.at(-1),{key:'restart-range',value:{progress:88}});s=cold(s);s=D.stopDistillation(steps(D.beginCollection(s),12));cold(s);
 assert.equal(s.operations.filter(o=>o.key==='start').length,1);
 let complete=steps(D.beginCollection(D.startRangeDistillation(D.newConnectedDistillery(42))),99),paid=JSON.stringify(complete.core);
 complete=D.restartRangeDistillation(complete);assert.equal(JSON.stringify(complete.core),paid);cold(complete);
});

test('old stage4 active and completed recordings retain exact baseline bytes and old mapping',()=>{
 let s=steps(D.startDistillation(D.newConnectedDistillery(42)),40);
 assert.equal(hash(s),'b838c1db74f12ca06e6c4b4866745901151552a225e779902c006caf8f641735');cold(s);
 s=steps(D.beginCollection(s),58);assert.equal(hash(s),'8b9478094cd0d4bce8f4d45934ccb93d5a33f7dba72ea0766ab102769db0549b');cold(s);
 s=D.fillBarrel(D.stopDistillation(s),'refill');assert.equal(hash(s),'dd807a4c680e73c90fa66b946778e71146021ad9278ec51cf8fb4ca5a0c3e613');
 assert.equal(s.core.casks[0].flavor.choice.start,10/69);assert.equal(s.core.casks[0].flavor.choice.end,28/69);assert.equal(s.core.casks[0].flavor.choice.collectionVersion,undefined);cold(s);
 const waiting=steps(D.startDistillation(D.newConnectedDistillery(42)),90);assert.equal(D.distillStep(waiting),waiting);assert.equal(D.collectionState(waiting).fullRange,false);
 const old=oldFill(D.newBrandIdentityDistillery(42),{progress:65,type:'refill'});assert.equal(hash(old),'ec269255dd49d469cd26d22bdd7c389b1ae1edf8acf92b1701f62d606d1a0ad9');cold(old);
});

test('range markers and short legal recipe survive manual source, recipe book and repeat staff in both contracts',()=>{
 // Existing pre-experience staff hire, one real released batch funds three repeats.
 let base=oldFill(D.newFreeAgingDistillery(42),{progress:65,type:'refill'});base=advance(base,1);base=D.hireStaff(base);base=D.bottleBranded(base,base.core.casks[0].id,{});base=D.listBottles(D.setSalePrice(base,'low',base.result.productId),base.result.productId);base=D.enableStage4(advance(base,12));
 for(const fullRange of [true,false]){
  const start=fullRange?0:40,end=fullRange?12:58,sourceState=fill(structuredClone(base),start,end,fullRange),source=sourceState.core.casks.at(-1),choice=structuredClone(source.flavor.choice);
  assert.equal(choice.collectionVersion,fullRange?2:undefined);assert.equal(D.staffSource(sourceState,source.id).stopAt,end);
  let saved=D.saveRecipe(sourceState,source.id,'採取の記録');saved=D.selectRecipe(saved,saved.recipeBook.entries.at(-1).id);assert.deepEqual(saved.recipeBook.entries.at(-1).flavorChoice,choice);assert.deepEqual(saved.usual.recipe.flavorChoice,choice);cold(saved);
  for(const mode of ['once','three']){
   let s=D.reserveStaff(structuredClone(saved),source.id,mode);const repetitions=mode==='three'?3:1;
   for(let i=0;i<repetitions;i++){
    if(s.core.lastDistillation===s.core.month)s=advance(s,1);
    s=D.beginUsual(s);assert.equal(s.still.distillation.collectionVersion,fullRange?2:undefined);assert.equal(s.still.distillation.collectStart,start);s=cold(s);
    for(let guard=0;s.usual.reservation?.status==='active';guard++){assert(guard<100);s=D.distillStep(s);}
    const c=s.core.casks.at(-1);assert.deepEqual(c.flavor.choice,choice);assert.deepEqual(c.flavor.spirit,source.flavor.spirit);cold(s);
   }
   assert.equal(s.usual.reservation,null);assert.equal(s.operations.filter(o=>o.key==='complete-usual').length,repetitions);
  }
 }
});
