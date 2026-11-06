import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {readSession as readLegacy} from '../placement-save.mjs';
import {readSession,serializeSession,isCurrentSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {migrateRecentLedger,advanceRecentLedger,assertRecentLedger} from '../recent-ledger.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const original=readFileSync(new URL('./fixtures/s3-filling-v5.json',import.meta.url),'utf8');
// Historical fixture reconstruction belongs only to regression setup, never the normal reader.
function withHistory(session){let historyRecord;D.replayDistilleryOperations(session.game,({operation,index,before,after})=>{const state=(facts,count)=>({...facts,origin:session.game.origin,operations:session.game.operations.slice(0,count)});historyRecord=operation?advanceHistoryRecord(state(before,index),state(after,index+1),historyRecord):initializeHistoryRecord(state(after,0));});return {...session,historyRecord};}
function fresh(){const game=D.newMarketRulesDistillery(42);return {game,historyRecord:initializeHistoryRecord(game),userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:o=>D.replayDistilleryOperations(game,o)})};}
function transition(s,fn){const game=fn(s.game);return {...s,game,historyRecord:advanceHistoryRecord(s.game,game,s.historyRecord),caskSlots:reconcileCaskSlots(game,s.caskSlots),recentLedger:advanceRecentLedger(s.game,game,s.recentLedger)};}
const encode=s=>serializeSession(s.game,s,options);
function storage(initial){const entries=new Map([[FORMAL_SAVE_KEY,initial],['another-work','untouched']]);return {entries,getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};}
test('original v5 filling fixture is unmodified and both cask choices retain official state through save/restart',()=>{
 assert.equal(createHash('sha256').update(original).digest('hex'),'a23d50ab34e607b9ec6aaaaa5b3c2db92602d525dadb62dddb030986aeac0de5');
 const source=withHistory(readLegacy(original,options));assert.equal(source.game.operations.length,33);assert.equal(source.game.core.casks.length,0);
 for(const type of ['bourbon','refill']){
  const expected=D.fillBarrel(source.game,type),next=transition(source,s=>D.fillBarrel(s,type));
  assert.deepEqual(next.game,expected);assert.deepEqual(next.caskSlots,[expected.core.casks[0].id,null,null,null]);assert.equal(next.recentLedger.manuals[0].source.flavorChoice.cask,type==='bourbon'?'first':'refill');
  const restored=readSession(encode(next),options);assert.deepEqual(restored,next);assert.deepEqual(D.tickDistillery(restored.game),D.tickDistillery(expected));
  const invalid=structuredClone(next.recentLedger);invalid.manuals[0].source.flavorChoice.cask=type==='bourbon'?'refill':'first';assert.throws(()=>assertRecentLedger(next.game,invalid));
 }
});
test('current format cold restore preserves game clock pause slots and ledger exactly',()=>{
 const state=transition(withHistory(readLegacy(original,options)),s=>D.fillBarrel(s,'bourbon'));state.userPaused=true;state.elapsed=P.distillStepMs;
 const text=encode(state);assert.equal(JSON.parse(text).version,7);assert(isCurrentSession(text));assert.deepEqual(readSession(text,options),state);
 const program=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};import {readSession,serializeSession} from ${JSON.stringify(new URL('../development-save.mjs',import.meta.url).href)};const o={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:${P.monthMs},stepMs:${P.distillStepMs}};const s=readSession(fs.readFileSync(0,'utf8'),o);process.stdout.write(serializeSession(s.game,s,o));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',program],{input:text,encoding:'utf8'}),text);
});
test('old formats reject before formal restore and never migrate by normal reader',()=>{
 const current=JSON.parse(encode(fresh()));let calls=0;
 for(const version of [2,3,4,5,6,8]){const text=JSON.stringify({...current,version});assert(!isCurrentSession(text));assert.throws(()=>readSession(text,{...options,restore:()=>{calls++;}}),e=>e.code==='unsupported-version');}
 assert.equal(calls,0);
});
test('current format retains formal replay validation and strict sidecar/clock contracts',()=>{
 const text=encode(fresh());let restores=0;readSession(text,{...options,restore:raw=>{restores++;return D.restoreDistillery(raw);}});assert.equal(restores,1);
 for(const mutate of [s=>delete s.caskSlots,s=>delete s.recentLedger,s=>delete s.historyRecord,s=>s.extra=true,s=>s.elapsed=-1,s=>s.elapsed=P.monthMs,s=>s.userPaused='false',s=>s.caskSlots=[999,null,null,null],s=>s.recentLedger.operationCount++,s=>s.game.core.money++]){const s=JSON.parse(text);mutate(s);assert.throws(()=>readSession(JSON.stringify(s),options));}
 assert.throws(()=>readSession(text+'\n',options));assert.throws(()=>readSession('{',options));assert.throws(()=>encode({...fresh(),recentLedger:undefined}));
});
test('candidate write protects quota failure, stale tab, wrong key and reports failed readback',()=>{
 const old=encode(fresh()),candidate=encode({...fresh(),userPaused:true}),store=storage(old);
 store.setItem=()=>{throw Object.assign(Error('quota'),{name:'QuotaExceededError'});};assert.throws(()=>writeCandidate(store,FORMAL_SAVE_KEY,old,candidate),{name:'QuotaExceededError'});assert.equal(store.getItem(FORMAL_SAVE_KEY),old);
 store.entries.set(FORMAL_SAVE_KEY,'other tab');assert.throws(()=>writeCandidate(store,FORMAL_SAVE_KEY,old,candidate),e=>e.code==='conflict');assert.equal(store.getItem(FORMAL_SAVE_KEY),'other tab');
 assert.throws(()=>writeCandidate(store,'another-work','untouched',candidate),e=>e.code==='invalid-session');assert.equal(store.getItem('another-work'),'untouched');
 const broken=storage(old);broken.setItem=()=>{};assert.throws(()=>writeCandidate(broken,FORMAL_SAVE_KEY,old,candidate),e=>e.code==='readback');assert.equal(broken.getItem(FORMAL_SAVE_KEY),old);
});
test('fresh candidate can replace confirmed broken or old records atomically without old clock casks or notebook',()=>{
 const clean=fresh(),candidate=encode(clean);
 for(const prior of [null,'broken',original,encode(transition(withHistory(readLegacy(original,options)),s=>D.fillBarrel(s,'bourbon'))) ]){
  const store=storage(prior);assert.equal(writeCandidate(store,FORMAL_SAVE_KEY,prior,candidate),candidate);assert.deepEqual(readSession(store.getItem(FORMAL_SAVE_KEY),options),clean);assert.equal(store.getItem('another-work'),'untouched');assert.deepEqual(clean.caskSlots,[null,null,null,null]);assert.equal(clean.recentLedger.manuals.length+clean.recentLedger.active.length+clean.recentLedger.ended.length,0);
 }
});
test('saved recipe partial/full bottling sale and reused slot remain official across each automatic-save transaction',()=>{
 let state=transition(withHistory(readLegacy(original,options)),s=>D.fillBarrel(s,'bourbon')),reference=state.game;
 const step=fn=>{reference=fn(reference);state=readSession(encode(transition(state,fn)),options);assert.deepEqual(state.game,reference);};
 const first=state.game.core.casks[0].id;step(s=>D.saveRecipe(s,first,'春の製法'));step(s=>D.selectRecipe(s,s.recipeBook.entries[0].id));
 step(s=>D.bottleBranded(s,first,{},1));assert.equal(state.recentLedger.ended.length,0);assert.equal(state.caskSlots[0],first);
 step(s=>D.bottleBranded(s,first,{},D.quote(s,first).count));assert.deepEqual(state.caskSlots,[null,null,null,null]);assert.equal(state.recentLedger.ended[0].caskId,first);
 step(s=>D.setSalePrice(s,'low',s.result.productId));step(s=>D.listBottles(s,s.result.productId));step(D.tickDistillery);
 assert.equal(state.game.recipeBook.entries[0].source.caskId,first);
 step(s=>{s=D.startRangeDistillation(s);while(s.still.distillation.progress<24)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<36)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),'refill');});
 assert.notEqual(state.caskSlots[0],first);assert.equal(state.recentLedger.ended[0].caskId,first);assert.equal(state.game.recipeBook.entries[0].source.caskId,first);
});
