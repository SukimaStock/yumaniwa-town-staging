// Isolated fault-injection tests. These do not simulate physical storage durability.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as D from '../partner-orders.mjs';
import {initializeRecall} from '../recall/collector.mjs';
import {initializeHistoryRecord} from '../history-record.mjs';
import {initializeCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger} from '../recent-ledger.mjs';
import {readSession,serializeSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const source=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const start=source.indexOf('async function boot(){'),end=source.indexOf('\nwindow.amberPlacement=',start);
assert(start>=0&&end>start);
function bootHarness(value,{readError=null,writeError=null}={}){
 const values=new Map(value===null?[]:[[FORMAL_SAVE_KEY,value]]),writes=[],nodes=new Map();
 let installed=null,writeAttempts=0;
 const context=vm.createContext({preview:false,localStorage:{getItem:k=>{if(readError)throw readError;return values.get(k)??null;},setItem:(k,v)=>{writeAttempts++;if(writeError)throw writeError;values.set(k,v);writes.push([k,v]);}},SAVE_KEY:FORMAL_SAVE_KEY,sessionOptions:options,readSession,writeCandidate,
  distillRoom:{reset(){}},scene:{resetMotion(){}},stopClock(){},recoveryAccess(){},recordSaveError(e,phase){context.lastSaveError={code:e.code??e.name,phase};},storageNotice(t){context.notice=t;},$:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},
  newNativeGame:()=>D.newMarketRulesDistillery(141),initializeCaskSlots,initializeLedger:g=>migrateRecentLedger(g,{replay:o=>D.replayDistilleryOperations(g,o)}),initializeHistoryRecord,initializeRecall,
  sessionText:(g,userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord)=>serializeSession(g,{userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord},options),installSession:s=>{installed=s;},
 });
 vm.runInContext(source.slice(start,end),context);
 return {context,values,writes,get writeAttempts(){return writeAttempts;},get installed(){return installed;},run:()=>vm.runInContext('boot()',context)};
}
for(const [label,raw] of [['corrupt JSON','{broken'],['missing required record',JSON.stringify({version:8})],['old v5',JSON.stringify({version:5})]]){
 test(`actual boot seam stops on ${label}, preserves bytes, and never creates a new save`,async()=>{
  const h=bootHarness(raw);await h.run();assert.equal(h.values.get(FORMAL_SAVE_KEY),raw);assert.equal(h.writes.length,0);assert.equal(h.writeAttempts,0);assert.equal(h.installed,null);assert.equal(h.context.game,null);assert.equal(h.context.canSave,false);assert.equal(h.context.runtimeHalted,true);assert.equal(h.context.lastSaveError.phase,'起動');
 });
}
test('actual boot seam stops when storage read is denied without trying to write',async()=>{
 const h=bootHarness('preserve',{readError:Object.assign(Error('denied'),{name:'SecurityError'})});await h.run();assert.equal(h.writes.length,0);assert.equal(h.writeAttempts,0);assert.equal(h.values.get(FORMAL_SAVE_KEY),'preserve');assert.equal(h.context.runtimeHalted,true);assert.equal(h.context.lastSaveError.code,'SecurityError');
});
test('missing current key with a legacy record stops, preserving the legacy record',async()=>{
 const h=bootHarness(null);h.values.set('sukimastock.ambertime.wholesale.v20','legacy');await h.run();assert.equal(h.writes.length,0);assert.equal(h.writeAttempts,0);assert.equal(h.values.get('sukimastock.ambertime.wholesale.v20'),'legacy');assert.equal(h.context.runtimeHalted,true);
});
test('missing all save keys is treated as fresh install, not recovery of lost data',async()=>{
 const h=bootHarness(null);await h.run();assert.equal(h.writes.length,1);assert.equal(h.writeAttempts,1);assert.equal(h.installed.game.core.month,0);assert.equal(readSession(h.values.get(FORMAL_SAVE_KEY),options).game.core.month,0);
 // This behavior cannot distinguish a genuine first visit from external key loss.
});
test('first-boot quota exception halts without a successful installation',async()=>{
 const h=bootHarness(null,{writeError:Object.assign(Error('full'),{name:'QuotaExceededError'})});await h.run();assert.equal(h.writes.length,0);assert.equal(h.writeAttempts,1);assert.equal(h.values.has(FORMAL_SAVE_KEY),false);assert.equal(h.installed,null);assert.equal(h.context.runtimeHalted,true);
});
test('write followed by corrupt readback stops; single-key storage cannot recover prior persistent bytes',()=>{
 let value='last valid save';const store={getItem:()=>value,setItem:()=>{value='{corrupt';}};
 assert.throws(()=>writeCandidate(store,FORMAL_SAVE_KEY,'last valid save','candidate'),e=>e.code==='readback');assert.equal(value,'{corrupt');
 assert.throws(()=>writeCandidate(store,FORMAL_SAVE_KEY,'last valid save','candidate'),e=>e.code==='conflict');assert.equal(value,'{corrupt');
 // Deliberately nonconforming storage fault, not a claim that localStorage writes partially.
});
