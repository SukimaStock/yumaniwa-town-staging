// Node diagnostics only. This is not Chromium display/startup evidence.
// Run sequentially: node --expose-gc works/ambertime/s2/long-save-check.mjs <input.json>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs?v=market-rules-r1&touch=1';
import {migrateRecentLedger,advanceRecentLedger,recentLedgerView} from '../recent-ledger.mjs?v=s2-1';
import {readSession,serializeSession} from '../placement-save.mjs?v=s2-1';
import {initializeCaskSlots} from '../cask-slots.mjs?v=s1-1';
import {compactFormalGame} from '../save-codec.mjs?v=h1-b2-1';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const hash=x=>createHash('sha256').update(x).digest('hex');
function dependencies(){
 const seen=new Map();
 function visit(file){if(seen.has(file))return;const text=fs.readFileSync(file,'utf8');seen.set(file,hash(text));for(const match of text.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.[^'"]+)['"]/g)){const name=match[1].split('?')[0];if(name.endsWith('.mjs'))visit(path.resolve(path.dirname(file),name));}}
 for(const name of ['recent-ledger.mjs','placement-save.mjs','partner-orders.mjs'])visit(path.join(root,name));
 return [...seen].map(([file,sha256])=>({path:path.relative(root,file),sha256})).sort((a,b)=>a.path.localeCompare(b.path));
}
const started=new Date().toISOString(),manifest=dependencies();
const input=path.resolve(process.argv[2]),raw=fs.readFileSync(input,'utf8'),inputSha256=hash(raw);
const expected=JSON.parse(fs.readFileSync(new URL('../s1/input-status.json',import.meta.url),'utf8')).find(x=>x.name===path.basename(input));
assert(expected&&expected.sha256===inputSha256,'S1 input SHA mismatch');
const options={enabled:true,restore:D.restoreDistillery,serialize:D.serializeDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
function timed(fn){const cpu=process.cpuUsage(),start=performance.now(),value=fn();return {value,ms:performance.now()-start,cpuMs:Object.values(process.cpuUsage(cpu)).reduce((a,b)=>a+b,0)/1000};}
console.error(new Date().toISOString(),'formal restore');
const restored=timed(()=>D.restoreDistillery(raw)),game=restored.value;
assert.equal(game.core.month,expected.month);assert.equal(JSON.stringify(game),raw);
console.error(new Date().toISOString(),'ledger migration');
const migrated=timed(()=>migrateRecentLedger(game,{replay:observer=>D.replayDistilleryOperations(game,observer)})),recentLedger=migrated.value;
const manualFacts=D.nearbyComparisonFacts(game,{includeManualSources:true}).manualSources;
const seenBatches=new Set(),expectedManuals=manualFacts.slice().reverse().filter(source=>{if(seenBatches.has(source.batchId))return false;seenBatches.add(source.batchId);return true;}).slice(0,8);
assert.deepEqual(recentLedger.manuals.map(r=>r.source),expectedManuals);
assert.deepEqual(recentLedger.ended.map(r=>r.caskId),game.core.archive.slice(0,8).map(c=>c.id));
const caskSlots=initializeCaskSlots(game),ui={userPaused:true,elapsed:0,caskSlots,recentLedger};
const v4=JSON.stringify({version:4,game:compactFormalGame(raw),userPaused:true,elapsed:0,caskSlots});
console.error(new Date().toISOString(),'v5 encoding');
const encoded=timed(()=>serializeSession(game,ui,options)),v5=encoded.value;
console.error(new Date().toISOString(),'v5 warm read and bounded views');
const loaded=timed(()=>readSession(v5,options));assert.equal(JSON.stringify(loaded.value.game),raw);assert.deepEqual(loaded.value.recentLedger,recentLedger);assert.deepEqual(loaded.value.caskSlots,caskSlots);
const first=timed(()=>recentLedgerView(loaded.value.game,loaded.value.recentLedger));
const views=[];for(let i=0;i<100;i++)views.push(timed(()=>recentLedgerView(loaded.value.game,loaded.value.recentLedger)).ms);
const nextA=timed(()=>D.tickDistillery(game)),nextB=timed(()=>D.tickDistillery(loaded.value.game));assert.deepEqual(nextA.value,nextB.value);
const advanced=advanceRecentLedger(loaded.value.game,nextB.value,loaded.value.recentLedger),afterMonth=timed(()=>recentLedgerView(nextB.value,advanced));
const finalManifest=dependencies();assert.deepEqual(finalManifest,manifest,'Dependency changed during diagnostic; rerun required');
const result={schema:'ambertime-s2-node-diagnostic/1',started,finished:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch,chromium:'UNVERIFIED: OS socket EPERM before launch'},input:{name:path.basename(input),sha256:inputSha256,bytes:Buffer.byteLength(raw),month:game.core.month,operations:game.operations.length},dependencyFingerprint:hash(JSON.stringify(manifest)),dependencies:manifest,timingMs:{coldFormalRestore:restored.ms,oneTimeLedgerMigrationAfterRestore:migrated.ms,v5EncodeAndWarmValidation:encoded.ms,v5WarmRead:loaded.ms,boundedFirstView:first.ms,boundedView100Mean:views.reduce((a,b)=>a+b,0)/views.length,boundedView100Max:Math.max(...views),boundedAfterMonthView:afterMonth.ms},cpuMs:{coldFormalRestore:restored.cpuMs,oneTimeMigration:migrated.cpuMs},size:{v4CodeUnits:v4.length,v5CodeUnits:v5.length,addedCodeUnits:v5.length-v4.length,v4Utf8Bytes:Buffer.byteLength(v4),v5Utf8Bytes:Buffer.byteLength(v5),ledgerUtf8Bytes:Buffer.byteLength(JSON.stringify(recentLedger))},retained:{manuals:recentLedger.manuals.length,active:recentLedger.active.length,ended:recentLedger.ended.length,savedRecipes:game.recipeBook.entries.length},memory:{end:process.memoryUsage(),processMaxRssKiB:process.resourceUsage().maxRSS},checks:{inputShaMatchesS1:true,formalJsonExact:true,manualSourcesMatchFormalContext:true,endedIdsMatchFormalArchive:true,slotsExact:true,ledgerRoundTripExact:true,nextMonthFormalStateAndRngExact:true,afterMonthLedgerValid:true},limitations:['Node timing only; no browser display, first paint, interaction or localStorage capacity evidence.','v5 read is warm in the same process; cold formal reader remains unchanged.','Old session migration is intentionally measured once after formal restore.','Memory is whole process, not isolated browser ledger memory.']};
const destination=new URL('./long-save-results.json',import.meta.url),results=fs.existsSync(destination)?JSON.parse(fs.readFileSync(destination,'utf8')):[];const previous=results.findIndex(x=>x.input.name===result.input.name);if(previous<0)results.push(result);else results[previous]=result;results.sort((a,b)=>a.input.month-b.input.month);fs.writeFileSync(destination,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({...result,dependencies:undefined},null,2));
