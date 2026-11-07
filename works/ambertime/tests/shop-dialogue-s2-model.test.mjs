import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {advance} from './brands-helpers.mjs';
import {createObservedModel} from '../recall/operations.mjs';
import {initializeRecall,advanceRecall,assertRecall} from '../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../recent-ledger.mjs';
import {readSession,serializeSession,writeCandidate,FORMAL_SAVE_KEY,DEVELOPMENT_SAVE_VERSION} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
const source=()=>D.enableAlleyBar(D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(fixture))));
const withoutBoundary=s=>({...s,operations:s.operations.filter(o=>o.key!=='enable-shop-dialogue')});
function cold(s){const raw=D.serializeDistillery(s);assert.equal(execFileSync(process.execPath,['--input-type=module','-e',`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`],{input:raw,encoding:'utf8',maxBuffer:16e6}),raw);}
test('dialogue boundary leaves old save bytes and every non-operation field unchanged, including tasting and partial extraction',()=>{
 assert.equal(D.serializeDistillery(D.restoreDistillery(fixture)),fixture);
 for(const prepare of [s=>s,s=>D.sampleDistillery(s,s.core.casks[0].id),s=>{s=D.beginCollection(D.startRangeDistillation(s));while(s.still.distillation.progress<20)s=D.distillStep(s);return s;}]){
  const before=prepare(source()),raw=D.serializeDistillery(before),after=D.enableShopDialogue(before);
  assert.deepEqual(Object.keys(after),Object.keys(before));assert.deepEqual(withoutBoundary(after),before);
  assert.equal(D.serializeDistillery(before),raw);assert.equal(D.shopDialogueMode(before),false);assert.equal(D.shopDialogueMode(after),true);assert.equal(D.enableShopDialogue(after),after);
  assert.deepEqual(after.operations.at(-1),{key:'enable-shop-dialogue',value:{version:2,boundaryMonth:before.core.month,progress:before.still.phase==='distilling'?before.still.distillation.progress:null,tastingId:before.tastingId}});cold(after);
 }
});
test('malformed or duplicate dialogue boundaries cannot be restored',()=>{
 const after=D.enableShopDialogue(source()),index=after.operations.length-1;
 for(const mutate of [s=>s.operations[index].value.version=3,s=>s.operations[index].value.boundaryMonth++,s=>s.operations[index].value.extra=true,s=>delete s.operations[index].value.progress,s=>s.operations.push(structuredClone(s.operations[index]))]){
  const bad=structuredClone(after);mutate(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));
 }
 assert.throws(()=>D.enableShopDialogue(D.newDistillery(42)));
});
test('future months and real sales are identical with and without the dialogue operation',()=>{
 let before=source(),after=D.enableShopDialogue(before);
 for(let i=0;i<18;i++){before=advance(before,1);after=advance(after,1);assert.deepEqual(withoutBoundary(after),before);}
 cold(after);assert.equal(after.core.month,before.core.month);assert.deepEqual(after.core.lastMonth,before.core.lastMonth);assert.deepEqual(after.shop.deliveries,before.shop.deliveries);
});
test('new factory enables next-month dialogue without changing existing factory or startup observer',()=>{
 const before=D.newAlleyBarDistillery(141),after=D.newShopDialogueDistillery(141);assert.equal(D.shopDialogueMode(before),false);assert.deepEqual(withoutBoundary(after),before);assert.equal(after.operations.at(-1).value.boundaryMonth,0);
 const transitions=[],observed=createObservedModel(D,x=>transitions.push(x));const fresh=observed.newShopDialogueDistillery(142);assert(D.shopDialogueMode(fresh));assert.equal(transitions.length,0);
 let recall=initializeRecall(before),count=0;const live=createObservedModel(D,({before,after})=>{recall=advanceRecall(before,after,recall);count++;});const enabled=live.enableShopDialogue(before);assert.equal(count,1);assertRecall(enabled,recall);assert.equal(live.enableShopDialogue(enabled),enabled);assert.equal(count,1);
});
test('boundary uses the same v8 session and atomic write; quota or conflict preserves old progress and UI records',()=>{
 const game=D.newAlleyBarDistillery(143),before={game,userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:o=>D.replayDistilleryOperations(game,o)}),historyRecord:initializeHistoryRecord(game),recallRecord:initializeRecall(game)},next=D.enableShopDialogue(game);
 const after={...before,game:next,caskSlots:reconcileCaskSlots(next,before.caskSlots),recentLedger:advanceRecentLedger(game,next,before.recentLedger),historyRecord:advanceHistoryRecord(game,next,before.historyRecord),recallRecord:advanceRecall(game,next,before.recallRecord)};
 const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs},encode=s=>serializeSession(s.game,s,options),oldRaw=encode(before),newRaw=encode(after);
 assert.equal(DEVELOPMENT_SAVE_VERSION,8);assert.deepEqual(Object.keys(JSON.parse(oldRaw)),Object.keys(JSON.parse(newRaw)));assert.deepEqual(readSession(newRaw,options),after);
 const saved=new Map([[FORMAL_SAVE_KEY,oldRaw]]),storage={getItem:k=>saved.get(k)??null,setItem(){throw Object.assign(Error('full'),{name:'QuotaExceededError'});}};
 assert.throws(()=>writeCandidate(storage,FORMAL_SAVE_KEY,oldRaw,newRaw),{name:'QuotaExceededError'});assert.equal(saved.get(FORMAL_SAVE_KEY),oldRaw);assert.deepEqual(readSession(oldRaw,options),before);
 storage.setItem=(k,v)=>saved.set(k,v);saved.set(FORMAL_SAVE_KEY,'another tab');assert.throws(()=>writeCandidate(storage,FORMAL_SAVE_KEY,oldRaw,newRaw),e=>e.code==='conflict');assert.equal(saved.get(FORMAL_SAVE_KEY),'another tab');
 saved.set(FORMAL_SAVE_KEY,oldRaw);writeCandidate(storage,FORMAL_SAVE_KEY,oldRaw,newRaw);assert.deepEqual(readSession(saved.get(FORMAL_SAVE_KEY),options),after);
});
