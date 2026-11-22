// Isolated entry async ordering, not browser or durability verification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionEntry,inspectStartRecord} from '../session-entry.mjs';
import {FORMAL_SAVE_KEY} from '../development-save.mjs';
const gate=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(extra={}){
 let raw='{"version":8,"value":"old"}';const installed=[],events=[];
 const storage={getItem:key=>key===FORMAL_SAVE_KEY?raw:null};
 const entry=createSessionEntry({storage:()=>storage,create:()=>({version:8,value:'new'}),encode:JSON.stringify,read:JSON.parse,yieldTask:async()=>{},phase:p=>events.push(p),install:session=>installed.push(session),write:async(_s,_k,_old,text)=>{raw=text;},...extra});
 return {entry,installed,events,expected:inspectStartRecord(storage),get raw(){return raw;}};
}
test('entry delayed durable writer prevents install and cannot be cancelled in flight',async()=>{
 const started=gate(),done=gate();const h=fixture({write:async()=>{started.resolve();await done.promise;}});
 const result=h.entry.start(h.expected);await started.promise;
 assert.equal(h.entry.busy,true);assert.equal(h.entry.writing,true);assert.equal(h.entry.cancel(),false);assert.deepEqual(h.installed,[]);
 assert.equal((await h.entry.start(h.expected)).duplicate,true);
 done.resolve();assert.equal((await result).ok,true);assert.equal(h.installed.length,1);assert.equal(h.entry.busy,false);
});
test('entry rejected or uncertain durable writes never install a candidate',async()=>{
 for(const code of ['QuotaExceededError','readback','conflict']){
  const h=fixture({write:async()=>{throw Object.assign(Error(code),{code});}});
  const result=await h.entry.start(h.expected);
  assert.equal(result.ok,false);assert.equal(result.writeAttempted,true);assert.equal(result.writeVerified,false);assert.equal(result.formalState,'uncertain');assert.deepEqual(h.installed,[]);
 }
});
test('entry cancelled continuation cannot install after delayed durable revalidation',async()=>{
 const started=gate(),done=gate(),h=fixture({verifyCurrent:async()=>{started.resolve();await done.promise;}});
 const result=h.entry.continue(h.expected);await started.promise;assert.equal(h.entry.cancel(),true);done.resolve();
 assert.equal((await result).cancelled,true);assert.deepEqual(h.installed,[]);
});
test('entry cancellation during storage preparation cannot publish a late adapter session',async()=>{
 const started=gate(),done=gate(),h=fixture({prepare:async(_kind,_expected,{current})=>{started.resolve();await done.promise;assert.equal(current(),false);}});
 const result=h.entry.start(h.expected);await started.promise;assert.equal(h.entry.cancel(),true);done.resolve();
 assert.equal((await result).cancelled,true);assert.deepEqual(h.installed,[]);assert(!h.events.includes('writing'));
});
test('entry waits for asynchronous installation and marks rejected install as failure',async()=>{
 const started=gate(),done=gate();const h=fixture({install:async()=>{started.resolve();await done.promise;throw Error('UI apply failed');}});
 const result=h.entry.start(h.expected);await started.promise;assert.equal(h.entry.busy,true);assert.equal(h.entry.cancel(),false);done.resolve();
 const outcome=await result;assert.equal(outcome.ok,false);assert.equal(outcome.stage,'session-apply');assert.equal(outcome.writeVerified,true);
});
test('entry failed continue revalidation cannot install apparently valid cached bytes',async()=>{
 const h=fixture({verifyCurrent:async()=>{throw Object.assign(Error('stale'),{code:'conflict'});}});
 const result=await h.entry.continue(h.expected);assert.equal(result.ok,false);assert.equal(result.stage,'committed-readback');assert.deepEqual(h.installed,[]);
});
