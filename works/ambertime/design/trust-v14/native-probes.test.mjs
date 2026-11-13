// Audit probes against unchanged formal readers. NOT an alternative checkpoint reader.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import * as D from '../../partner-orders.mjs';
import * as S from '../../development-save.mjs';
import {sessionFor} from '../../tests/regional-delivery-helpers.mjs';
import {PARALLEL_PARAMETERS as P} from '../../economy-parameters.mjs';
const opts={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const original=D.newShopDialogueDistillery(3),next=D.tickDistillery(original);
const raw=D.serializeDistillery(next),sha=s=>createHash('sha256').update(s).digest('hex');
const fresh=async()=>import('../../partner-orders.mjs?trust-v14='+Math.random());
test('valid v8 and v9 remain canonical and cold child restores exactly',()=>{
 for(const encoding of ['legacy-v8','lossless-v1']){
  const text=S.serializeSession(next,sessionFor(next),{...opts,encoding});
  const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../../partner-orders.mjs',import.meta.url).href)};import * as S from ${JSON.stringify(new URL('../../development-save.mjs',import.meta.url).href)};const o={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:${P.monthMs},stepMs:${P.distillStepMs},encoding:${JSON.stringify(encoding)}};const t=fs.readFileSync(0,'utf8'),s=S.readSession(t,o);if(S.serializeSession(s.game,s,o)!==t)throw Error('canonical mismatch');process.stdout.write(JSON.stringify(s.game));`;
  assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:text,encoding:'utf8'}),raw);
 }
});
test('recomputed digest does not make mismatched state or missing history acceptable',async()=>{
 for(const mutate of [s=>s.core.cash++,s=>s.operations.pop(),s=>s.operations.splice(5,1),s=>s.seed=9]){
  const s=JSON.parse(raw);mutate(s);const text=JSON.stringify(s);assert.match(sha(text),/^[a-f0-9]{64}$/);
  const R=await fresh();assert.throws(()=>R.restoreDistillery(text));
 }
});
test('two independently lawful archives both accepted: consistency is not actual-player provenance',async()=>{
 const R=await fresh(),alternate=D.tickDistillery(D.newShopDialogueDistillery(9));
 assert.notEqual(JSON.stringify(alternate),raw);
 assert.equal(JSON.stringify(R.restoreDistillery(raw)),raw);
 assert.equal(JSON.stringify(R.restoreDistillery(D.serializeDistillery(alternate))),JSON.stringify(alternate));
});
test('older complete valid save accepted cold: reader alone has no external freshness root',async()=>{
 const R=await fresh(),older=D.serializeDistillery(original);
 assert(original.core.month<next.core.month);assert.equal(JSON.stringify(R.restoreDistillery(older)),older);
});
test('warm verified prefix does not accept changed final state and failure does not poison retry',async()=>{
 const R=await fresh();R.restoreDistillery(raw);const bad=JSON.parse(raw);bad.core.cash++;
 assert.throws(()=>R.restoreDistillery(JSON.stringify(bad)));assert.equal(JSON.stringify(R.restoreDistillery(raw)),raw);
});
test('input and returned mutable state cannot mutate earlier returned result or later restore',async()=>{
 const R=await fresh(),a=R.restoreDistillery(raw),b=R.restoreDistillery(raw);a.core.cash--;a.operations.push({key:'invalid'});
 assert.equal(JSON.stringify(b),raw);assert.equal(JSON.stringify(R.restoreDistillery(raw)),raw);
});
test('persisted hash and claimed validation evidence never seed private IDB proof cache',async()=>{
 const source=readFileSync(new URL('../../formal-idb-storage.mjs',import.meta.url),'utf8');
 const M=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {validationCache,verifyMainEnvelope};').toString('base64'));
 let calls=0;const reader=text=>{calls++;return S.readSession(text,opts);};
 const text=S.serializeSession(next,sessionFor(next),{...opts,encoding:'lossless-v1'}),record={schema:'ambertime-main-bounded-idb/2',revision:1,text,sha256:sha(text)},db={};
 const options={reader,cryptoApi:webcrypto,cache:M.validationCache(db,reader)};
 await M.verifyMainEnvelope(record,options);assert.equal(calls,1);
 await M.verifyMainEnvelope(record,options);assert.equal(calls,1);
 await M.verifyMainEnvelope(record,{...options,cache:M.validationCache({},reader)});assert.equal(calls,2);
 await M.verifyMainEnvelope(record,options,true);assert.equal(calls,3);
 await assert.rejects(M.verifyMainEnvelope({...record,verified:true},options));
});
