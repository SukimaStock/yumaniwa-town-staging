// Isolated research, official cold reader and one identical full-model operation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
import {readSession,serializeSession} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {advanceRecall} from '../recall/collector.mjs';
import {advanceHistoryRecord} from '../history-record.mjs';
import {advanceRecentLedger} from '../recent-ledger.mjs';
import {reconcileCaskSlots} from '../cask-slots.mjs';
import {install,hydrate} from './accessor.mjs';
const [file,out]=process.argv.slice(2);assert(file&&out,'usage: node future.mjs INPUT OUTPUT');
const raw=fs.readFileSync(file,'utf8'),hash=s=>createHash('sha256').update(s).digest('hex');
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const t=performance.now(),session=readSession(raw,options),coldMs=performance.now()-t;
function next(s){const prior=s.game,game=D.tickDistillery(prior);assert.equal(game.core.month,prior.core.month+1,'full-model month must actually advance');assert(JSON.stringify(game).length<6016384);return {...s,game,caskSlots:reconcileCaskSlots(game,s.caskSlots),recentLedger:advanceRecentLedger(prior,game,s.recentLedger),historyRecord:advanceHistoryRecord(prior,game,s.historyRecord),recallRecord:advanceRecall(prior,game,s.recallRecord)};}
const t1=performance.now(),expected=next(session),baselineTickMs=performance.now()-t1,rows=[];
for(const method of ['A','B','C']){const game=method==='A'?structuredClone(session.game):hydrate(install(structuredClone(session.game),method));assert.equal(JSON.stringify(game),JSON.stringify(session.game));const start=performance.now(),actual=next({...session,game});const fullTickMs=performance.now()-start;assert.equal(JSON.stringify(actual),JSON.stringify(expected));rows.push({method,fullSessionExact:true,fullTickMs,gameHash:hash(JSON.stringify(actual.game)),historyHash:hash(JSON.stringify(actual.historyRecord)),recallHash:hash(JSON.stringify(actual.recallRecord)),ledgerHash:hash(JSON.stringify(actual.recentLedger))});}
const t2=performance.now(),saved=serializeSession(expected.game,expected,options);const saveMs=performance.now()-t2;assert.equal(JSON.stringify(readSession(saved,options)),JSON.stringify(expected));assert.equal(fs.readFileSync(file,'utf8'),raw);
fs.writeFileSync(out,JSON.stringify({file,inputSha256:hash(raw),method:'Node official cold readSession; same full-model tick; collectors; exact session equality; official save/re-read. Not browser or compact-runtime continuation.',coldMs,baselineTickMs,saveMs,from:session.game.core.month,to:expected.game.core.month,monthAdvanced:expected.game.core.month===session.game.core.month+1,officialSaveReRead:true,sourceUnchanged:true,rows},null,2));
