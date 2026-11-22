import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
// Inspect the real private cache without introducing a production API.
const source=readFileSync(new URL('../formal-idb-storage.mjs',import.meta.url),'utf8');
const M=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {validationCache,verifyMainEnvelope};').toString('base64'));
const sha=text=>createHash('sha256').update(text).digest('hex');
const record=(text,revision=1)=>({schema:'ambertime-main-bounded-idb/2',revision,text,sha256:sha(text)});
test('large previously validated generations retain bounded digest proofs, never raw text or sessions',async()=>{
 let calls=0;const reader=text=>{calls++;return JSON.parse(text);},db={};
 const cache=M.validationCache(db,reader),options={cache,reader,cryptoApi:webcrypto};
 const texts=[0,1,2].map(id=>JSON.stringify({version:9,id,padding:'x'.repeat(4*1024*1024)}));
 for(const text of texts)await M.verifyMainEnvelope(record(text),options);
 assert.equal(calls,3);
 for(const text of texts)await M.verifyMainEnvelope(record(text),options);
 assert.equal(calls,3,'three large proofs must not evict each other');
 assert.equal(cache.size,3);assert([...cache.keys()].every(key=>key.length<100));
 assert([...cache.values()].every(value=>value===true));
 await M.verifyMainEnvelope(record(texts[2]),options,true);assert.equal(calls,4,'returned head must run reader');
 const corrupt={...record(texts[0]),text:texts[0].replace('xxxx','yyyy')};
 await assert.rejects(M.verifyMainEnvelope(corrupt,options),{code:'idb-integrity'});
 for(let i=3;i<12;i++)await M.verifyMainEnvelope(record(JSON.stringify({version:9,id:i})),options);
 assert.equal(cache.size,8);const before=calls;
 await M.verifyMainEnvelope(record(texts[0]),options);assert.equal(calls,before+1,'evicted proof reruns reader');
});
test('reader failure cannot seed trust and reader/connection identity isolates proofs',async()=>{
 let fail=true,calls=0;const reader=text=>{calls++;if(fail)throw Error('semantic failure');return JSON.parse(text);};
 const db={},cache=M.validationCache(db,reader),options={cache,reader,cryptoApi:webcrypto},r=record('{"version":9}');
 await assert.rejects(M.verifyMainEnvelope(r,options),/semantic failure/);assert.equal(cache.size,0);
 fail=false;await M.verifyMainEnvelope(r,options);assert.equal(calls,2);
 assert.equal(M.validationCache({},reader).size,0);
 assert.equal(M.validationCache(db,()=>{}).size,0);
 await assert.rejects(M.verifyMainEnvelope(record('{ "version":9}'),options),{code:'invalid-session'});
 const wrong=record('{"version":9}');wrong.revision=0;
 await assert.rejects(M.verifyMainEnvelope(wrong,options),{code:'invalid-head'});
});

test('lone-surrogate UTF8 replacement cannot reuse a canonical proof',async()=>{
 const good='{"version":9,"name":"'+String.fromCharCode(0xfffd)+'"}',bad='{"version":9,"name":"'+String.fromCharCode(0xd800)+'"}';
 assert.equal(good.length,bad.length);assert.equal(sha(good),sha(bad));let calls=0;
 const reader=text=>{calls++;return JSON.parse(text);},cache=M.validationCache({},reader),options={cache,reader,cryptoApi:webcrypto};
 await M.verifyMainEnvelope(record(good),options);
 await assert.rejects(M.verifyMainEnvelope(record(bad),options),{code:'invalid-session'});
 assert.equal(calls,1);
});
