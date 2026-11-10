import test from 'node:test';
import assert from 'node:assert/strict';
import {FormalIdbCommitBoundary} from '../formal-idb-commit-boundary.mjs';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const candidate=(month=154)=>({text:JSON.stringify({version:8,game:{core:{month}}}),snapshot:{month}});
const fail=(code)=>Object.assign(new Error(code),{code});

test('IDB confirmation must finish before a game candidate is published',async()=>{
 const work=deferred(),calls=[],game={month:97};
 const barrier=new FormalIdbCommitBoundary({revision:3,write:(text,token)=>{
  calls.push(['write',text,token.expectedRevision]);return work.promise;
 }});
 const saving=barrier.commit({prepare:()=>candidate(),apply:next=>{game.month=next.snapshot.month;calls.push(['apply']);}});
 assert.equal(game.month,97);
 assert.equal(barrier.status.busy,true);
 assert.equal(barrier.status.revision,3);
 work.resolve({revision:4,sha256:'verified'});
 await saving;
 assert.equal(game.month,154);
 assert.equal(barrier.status.busy,false);
 assert.equal(barrier.status.revision,4);
 assert.deepEqual(calls.map(c=>c[0]),['write','apply']);
});

test('rapid second tap is rejected; first save is not queued or re-prepared',async()=>{
 const work=deferred(),events=[],barrier=new FormalIdbCommitBoundary({
  revision:0,write:()=>work.promise});
 const first=barrier.commit({prepare:()=>{events.push('first');return candidate();},apply:()=>events.push('applied')});
 await assert.rejects(barrier.commit({prepare:()=>{events.push('second');return candidate();},apply:()=>{}}),e=>e.code==='pending-save');
 work.resolve({revision:1});await first;
 assert.deepEqual(events,['first','applied']);
 assert.equal(barrier.status.state,'ready');
});

test('quota / abort / conflict stops gameplay and does not apply candidate',async()=>{
 for(const code of ['QuotaExceededError','AbortError','conflict']){
  let published=false;const errors=[],barrier=new FormalIdbCommitBoundary({
   revision:1,write:async()=>{throw fail(code)},onHalt:e=>errors.push(e.code)});
  await assert.rejects(barrier.commit({prepare:()=>candidate(),apply:()=>published=true}),e=>e.code===code);
  assert.equal(published,false);assert.equal(barrier.status.state,'halted');
  assert.deepEqual(errors,[code]);
  await assert.rejects(barrier.commit({prepare:()=>candidate(),apply:()=>published=true}),e=>e.code==='storage-halted');
 }
});

test('uncertain success (write completed but readback rejected) must never apply or retry',async()=>{
 let count=0,published=false;const barrier=new FormalIdbCommitBoundary({revision:0,
  write:async()=>{count++;throw fail('readback');}});
 await assert.rejects(barrier.commit({prepare:()=>candidate(),apply:()=>published=true}),e=>e.code==='readback');
 assert.equal(published,false);assert.equal(count,1);
 assert.equal(barrier.status.revision,0);
 assert.equal(barrier.status.state,'halted');
});

test('visibility interruption invalidates pending write even when IDB resolves afterwards',async()=>{
 const work=deferred(),game={month:97},events=[],barrier=new FormalIdbCommitBoundary({
  revision:0,write:()=>work.promise,onHalt:e=>events.push(e.code)});
 const saving=barrier.commit({prepare:()=>candidate(),apply:next=>game.month=next.snapshot.month});
 barrier.halt(fail('pagehide'));
 work.resolve({revision:1});
 await assert.rejects(saving,e=>e.code==='interrupted');
 assert.equal(game.month,97);
 assert.equal(barrier.status.state,'halted');
 assert.deepEqual(events,['pagehide']); // not two separate user warnings
});

test('bad receipt, thrown apply, and async apply all require cold read rather than reusing old revision',async()=>{
 for(const mode of ['bad-receipt','throw','async']){
  const barrier=new FormalIdbCommitBoundary({revision:2,write:async()=>({revision:mode==='bad-receipt'?99:3})});
  const apply=mode==='throw'?()=>{throw fail('apply-failed')}:mode==='async'?()=>Promise.resolve():()=>{};
  await assert.rejects(barrier.commit({prepare:()=>candidate(),apply}));
  assert.equal(barrier.status.state,'halted');
  assert.equal(barrier.status.revision,mode==='bad-receipt'?2:3);
 }
});

test('invalid candidates and constructor arguments do not publish game or write anything',async()=>{
 assert.throws(()=>new FormalIdbCommitBoundary({revision:-1,write:()=>{}}),e=>e.code==='invalid-boundary');
 let writes=0;const barrier=new FormalIdbCommitBoundary({revision:0,write:async()=>{writes++;return {revision:1}}});
 await assert.rejects(barrier.commit({prepare:()=>Promise.resolve(candidate()),apply:()=>{}}),e=>e.code==='invalid-candidate');
 assert.equal(writes,0);
 assert.equal(barrier.status.state,'halted');
});

test('pure module has no direct game mutation or browser storage side effects',async()=>{
 const fs=await import('node:fs');
 const code=fs.readFileSync(new URL('../formal-idb-commit-boundary.mjs',import.meta.url),'utf8');
 for(const fragment of ['localStorage','sessionStorage','indexedDB.open','removeItem(','.innerHTML','fetch('])
  assert.ok(!code.includes(fragment),fragment);
});
