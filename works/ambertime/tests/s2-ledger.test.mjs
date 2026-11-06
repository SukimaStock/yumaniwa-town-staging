import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {migrateRecentLedger,advanceRecentLedger,recentLedgerView,assertRecentLedger} from '../recent-ledger.mjs';
import {readSession,serializeSession,isCurrentSession,writeCandidate} from '../placement-save.mjs';
import {compactFormalGame} from '../save-codec.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {fill,advance,resolve} from './brands-helpers.mjs';
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const migrate=s=>migrateRecentLedger(s,{replay:o=>D.replayDistilleryOperations(s,o)});
function rangeFill(s){s=D.startRangeDistillation(s);while(s.still.distillation.progress<24)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<36)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),'refill');}
function tracker(initial){let game=initial,ledger=migrate(game),slots=initializeCaskSlots(game);return {get game(){return game;},get ledger(){return ledger;},get slots(){return slots;},step(fn){const before=game,next=fn(before),expected=JSON.stringify(next);ledger=advanceRecentLedger(before,next,ledger);slots=reconcileCaskSlots(next,slots);assert.equal(JSON.stringify(next),expected);game=next;return next;}};}
const fixture=()=>D.restoreDistillery(JSON.parse(readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw);
test('v2/v3/v4 migrate once in memory; v5 keeps exact formal game, slots and bounded notebook across cold restore',()=>{
 const game=fixture(),raw=D.serializeDistillery(game),expected=migrate(game),slots=initializeCaskSlots(game).reverse();
 for(const version of [2,3,4]){
  const value={version,game:version===2?game:compactFormalGame(raw),userPaused:true,elapsed:0,...(version===4?{caskSlots:slots}:{})},text=JSON.stringify(value),loaded=readSession(text,options);
  assert.deepEqual(loaded.recentLedger,expected);assert.equal(D.serializeDistillery(loaded.game),raw);assert.equal(text,JSON.stringify(value));assert.equal(isCurrentSession(text),false);
  const encoded=serializeSession(loaded.game,loaded,options);assert.equal(JSON.parse(encoded).version,5);assert(isCurrentSession(encoded));assert.deepEqual(readSession(encoded,options),loaded);
 }
 const text=serializeSession(game,{userPaused:true,elapsed:0,caskSlots:slots,recentLedger:expected},options);
 const program=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};import {readSession,serializeSession} from ${JSON.stringify(new URL('../placement-save.mjs',import.meta.url).href)};const o={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:${P.monthMs},stepMs:${P.distillStepMs}};const s=readSession(fs.readFileSync(0,'utf8'),o);process.stdout.write(serializeSession(s.game,s,o));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',program],{input:text,encoding:'utf8'}),text);
});
test('manual 1/7/8/9 retention and ended 7/8/9 are independent of saved recipe and formal calculations',()=>{
 const t=tracker(D.newRecipeDistillery(42));let first,reference=t.game;
 const step=fn=>{reference=fn(reference);t.step(fn);assert.equal(JSON.stringify(t.game),JSON.stringify(reference));};
 for(let n=1;n<=9;n++){
  step(s=>fill(s,{progress:65}));const c=t.game.core.casks.at(-1);first??=c.id;
  if(n===1)step(s=>D.saveRecipe(s,c.id,'残した製法'));
  assert.equal(t.ledger.manuals.length,Math.min(n,8));assert.equal(t.ledger.active.length,1);
  step(s=>advance(s,6));step(s=>D.bottleBranded(s,c.id,n===1?{name:'川霧'}:{brandId:1}));assert.equal(t.ledger.ended.length,Math.min(n,8));assert.equal(t.ledger.active.length,0);
  step(s=>D.setSalePrice(s,'low',s.result.productId));step(s=>D.listBottles(s,s.result.productId));
  step(s=>advance(s,6));
 }
 assert.equal(t.ledger.manuals.some(r=>r.source.caskId===first),false);assert.equal(t.ledger.ended.some(r=>r.caskId===first),false);
 const view=recentLedgerView(t.game,t.ledger);assert.equal(view.recipes.recent.length,8);assert.equal(view.recipes.saved.length,1);assert.equal(view.recipes.saved[0].caskId,first);
 step(s=>D.selectRecipe(s,s.recipeBook.entries[0].id));assert.equal(D.selectedUsualRecipe(t.game).stopAt,65);
 assert.equal(JSON.stringify(t.game),JSON.stringify(reference));
 assert.deepEqual(migrate(t.game),t.ledger);
});
test('automatic completion does not count as a manual batch; stored source and future operations remain formal',()=>{
 const t=tracker(D.newUsualDistillery(42));t.step(s=>fill(s,{progress:65}));t.step(s=>advance(s,1));const manual=structuredClone(t.ledger.manuals);
 t.step(D.reserveUsual);t.step(D.beginUsual);while(t.game.usual.reservation?.status==='active')t.step(D.distillStep);
 assert.deepEqual(t.ledger.manuals,manual);assert.equal(t.ledger.active.length,2);assert.equal(t.ledger.active[1].manual,false);
 assert.deepEqual(migrate(t.game),t.ledger);
});
test('four current casks survive old manual pruning; partial bottling does not end a cask; same-month endings use actual end order',()=>{
 const t=tracker(D.newMarketRulesDistillery(42));for(let i=0;i<4;i++){t.step(rangeFill);if(i<3)t.step(s=>advance(s,1));}
 const ids=t.game.core.casks.map(c=>c.id);assert.equal(t.ledger.active.length,4);
 t.step(s=>D.bottleBranded(s,ids[0],{},1));assert.equal(t.ledger.ended.length,0);assert.equal(t.ledger.active.length,4);
 t.step(s=>D.bottleBranded(s,ids[3],{},D.quote(s,ids[3]).count));t.step(s=>D.bottleBranded(s,ids[0],{},D.quote(s,ids[0]).count));
 assert.deepEqual(t.ledger.ended.map(c=>c.caskId),[ids[0],ids[3]]);assert.deepEqual(t.slots,[null,ids[1],ids[2],null]);
 assert.equal(t.ledger.ended[0].caskId,ids[0]);assert.deepEqual(migrate(t.game),t.ledger);
});
test('one manual batch filling two casks is one recipe while both cask identities remain distinct',()=>{
 const before=D.newMarketRulesDistillery(42),ledger=migrate(before),after=rangeFill(before),second=structuredClone(after.core.casks[0]);second.id=second.id+1000;after.core.casks.push(second);after.notesById[second.id]=structuredClone(after.notesById[second.id-1000]);
 const result=advanceRecentLedger(before,after,ledger);assert.equal(result.manuals.length,1);assert.equal(result.active.length,2);assert.equal(result.active[0].batchId,result.active[1].batchId);
});
test('evaporation ending reads final archive facts, frees current slot, and retains useful tasting comparison',()=>{
 const t=tracker(rangeFill(D.newMarketRulesDistillery(42))),before=t.game,id=before.core.casks[0].id,after=structuredClone(before),final={...after.core.casks[0],age:999,litres:0.65,endedMonth:999,endReason:'蒸発'};
 after.core.month=999;after.core.casks=[];after.core.archive.unshift(final);delete after.notesById[id];after.operations.push({key:'month',value:{progress:null}});
 const ledger=advanceRecentLedger(before,after,t.ledger);assert.equal(ledger.active.length,0);assert.equal(ledger.ended[0].age,999);assert.equal(ledger.ended[0].litres,0.65);assert.equal(ledger.ended[0].status,'ended');assert.deepEqual(reconcileCaskSlots(after,t.slots),[null,null,null,null]);
});
test('session rejects malformed, mismatched, future or incomplete notebook metadata without writes',()=>{
 const game=fixture(),text=serializeSession(game,{userPaused:true,elapsed:0,recentLedger:migrate(game)},options);
 for(const mutate of [s=>delete s.recentLedger,s=>s.version=6,s=>s.recentLedger.version=2,s=>s.recentLedger.operationCount--,s=>s.recentLedger.month++,s=>s.recentLedger.extra=true,s=>s.recentLedger.manuals=[],s=>s.recentLedger.active=[],s=>s.recentLedger.active.push(s.recentLedger.active[0]),s=>s.recentLedger.manuals[0].source.filledMonth=9999,s=>s.recentLedger.manuals[0].source.extra=true,s=>s.recentLedger.active[0].initialProfile.roughness='x']){
  const candidate=JSON.parse(text);mutate(candidate);assert.throws(()=>readSession(JSON.stringify(candidate),options));
 }
 assert.throws(()=>readSession(text+'\n',options));
 let saved=text;const storage={getItem:()=>saved,setItem:()=>{throw Error('quota');}};
 const candidate=serializeSession(game,{userPaused:true,elapsed:100,recentLedger:migrate(game)},options);
 assert.throws(()=>writeCandidate(storage,'formal',text,candidate),/quota/);assert.equal(saved,text);
 saved='other tab';assert.throws(()=>writeCandidate(storage,'formal',text,candidate),/別の画面/);assert.equal(saved,'other tab');
});
test('normal view is bounded and performs no migration replay, and rejects a mixed transaction state',()=>{
 const game=fixture(),ledger=migrate(game),raw=JSON.stringify(game),facts=JSON.stringify(ledger);
 for(let i=0;i<3;i++){const view=recentLedgerView(game,ledger);assert.equal(view.coverage.replayed,false);assert(view.casks.length<=12);assert(view.recipes.recent.length<=8);}
 assert.equal(JSON.stringify(game),raw);assert.equal(JSON.stringify(ledger),facts);
 const next=D.tickDistillery(game);assert.throws(()=>assertRecentLedger(next,ledger));
});

test('actual monthly automatic bottling captures ended result and references without changing calculations',()=>{
 let initial=fill(D.newMonthlyTimingDistillery(42),{progress:65}),id=initial.core.casks[0].id;
 initial=D.bottleBranded(initial,id,{},1);initial=D.hireBottlingStaff(initial);initial=D.bottleBranded(initial,id,{},D.quote(initial,id).count-8);initial=D.reserveBottling(initial,id,{mode:'stock',threshold:5,count:10});
 const t=tracker(initial),expected=advance(initial,1);t.step(s=>advance(s,1));assert.equal(JSON.stringify(t.game),JSON.stringify(expected));
 assert.equal(t.ledger.active.length,0);assert.equal(t.ledger.ended[0].caskId,id);assert.equal(t.ledger.ended[0].status,'bottled');assert.equal(t.ledger.ended[0].releaseKeys.length,3);assert.deepEqual(t.slots,[null,null,null,null]);assert.deepEqual(migrate(t.game),t.ledger);
});
