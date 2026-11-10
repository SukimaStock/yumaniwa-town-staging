import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../../../ambertime/partner-orders.mjs';
import {initializeRecall,advanceRecall} from '../../../ambertime/recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../../../ambertime/history-record.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../../../ambertime/cask-slots.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../../../ambertime/recent-ledger.mjs';
import {serializeSession} from '../../../ambertime/development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../../../ambertime/economy-parameters.mjs';
import {bootstrapV8,matchesBootstrapSource} from './bootstrap.mjs';
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
function fresh(){const game=D.newMarketRulesDistillery(141);return {game,userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:o=>D.replayDistilleryOperations(game,o)}),historyRecord:initializeHistoryRecord(game),recallRecord:initializeRecall(game)};}
function next(s,fn){const game=fn(s.game);return {...s,game,caskSlots:reconcileCaskSlots(game,s.caskSlots),recentLedger:advanceRecentLedger(s.game,game,s.recentLedger),historyRecord:advanceHistoryRecord(s.game,game,s.historyRecord),recallRecord:advanceRecall(s.game,game,s.recallRecord)};}
const encode=s=>serializeSession(s.game,s,options);
test('official v8 copy validates, binds exact revision, preserves opaque facts without mutation',()=>{
 const session=next(fresh(),D.tickDistillery),before=JSON.stringify(session),raw=encode(session),result=bootstrapV8(raw,{revision:'native:1'});
 assert.equal(JSON.stringify(session),before);assert.equal(result.source.raw,raw);assert(matchesBootstrapSource(result,raw,'native:1'));assert(!matchesBootstrapSource(result,raw,'native:2'));assert(!matchesBootstrapSource(result,raw+' ','native:1'));
 assert.deepEqual(result.protected.recallRecord,session.recallRecord);assert.deepEqual(result.protected.town,session.game.labConnection);assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
 assert.equal(result.coverage.currentCore,'complete');assert.equal(result.coverage.currentGameProjection,'partial');assert.equal(result.eligibleForRuntime,false);assert.equal(result.transactionCursor,null);assert.equal(result.coverage.consumerSales,'unknown');assert.equal(result.coverage.chosenDialogue,'unknown');assert.equal(result.coverage.actualDisplayedDialogue,'unknown');assert.equal(Object.hasOwn(result.observed,'chosenDialogue'),false);assert.equal(result.coverage.historicalDeliveryTimeline,'partial');
 result.current.core.cash=0;result.protected.recallRecord.completed.push({test:true});assert.equal(JSON.stringify(session),before);
});
test('invalid version, malformed source, missing revision and invalid official recall are rejected',()=>{
 const raw=encode(fresh()),parsed=JSON.parse(raw);
 assert.throws(()=>bootstrapV8(raw),/revision/);assert.throws(()=>bootstrapV8('bad',{revision:'1'}));
 assert.throws(()=>bootstrapV8(JSON.stringify({...parsed,version:7}),{revision:'1'}));
 assert.throws(()=>bootstrapV8(JSON.stringify({...parsed,recallRecord:{}}),{revision:'1'}));
});
test('actual bottled v8 copy keeps release identity, exact stock, old source and conservative coverage',()=>{
 let session=fresh();session=next(session,D.startRangeDistillation);session=next(session,D.beginCollection);
 while(session.game.still.distillation.progress<65)session=next(session,D.distillStep);
 session=next(session,D.stopDistillation);session=next(session,s=>D.fillBarrel(s,'refill'));
 for(let i=0;i<6;i++)session=next(session,D.tickDistillery);
 session=next(session,s=>D.bottleBranded(s,s.core.casks[0].id,{},1));
 const raw=encode(session),result=bootstrapV8(raw,{revision:'bottled:1'}),r=result.current.releases[0];
 assert.equal(r.releaseId,session.game.releases[0].id);assert.equal(r.productId,session.game.releases[0].productId);assert.equal(r.stock,session.game.core.products[0].stock);assert.equal(r.stockCoverage,'complete');assert.deepEqual(r.release,session.game.releases[0]);assert.equal(encode(session),raw);
 assert.equal(result.coverage.provenance,'partial');assert.equal(result.observed.deliveryReceipts.length,session.game.shop.deliveries.length);
});
