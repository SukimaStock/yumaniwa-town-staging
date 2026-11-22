// Diagnostic only: actual 100-year texts, real canonical/SHA/cache code,
// deliberately MOCK semantic reader. No IDB, browser, restore-time or heap proof.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash,webcrypto} from 'node:crypto';
import assert from 'node:assert/strict';
const repo=fileURLToPath(new URL('../../../../',import.meta.url));
const fixture=path.resolve(process.argv[2]??path.join(repo,'../fixtures/unpacked/ambertime-v03-capacity/protocol'));
const output=path.resolve(process.argv[3]??fileURLToPath(new URL('results/cache-proof-probe.json',import.meta.url)));
const baseline='c326834feb33306b7e92c5842d19475c2a95734d',sourcePath='works/ambertime/formal-idb-storage.mjs';
const hash=text=>createHash('sha256').update(text).digest('hex');
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const texts=['local.formal9.json','local.next.formal9.json'].map(name=>({name,text:fs.readFileSync(path.join(fixture,name),'utf8')}));
const envelopes=texts.map(({text},i)=>({schema:'ambertime-main-bounded-idb/2',revision:i+1,text,sha256:hash(text)}));
const sources=[{label:'PR929-8Mi-text-cache',commit:baseline,source:execFileSync('git',['-C',repo,'show',baseline+':'+sourcePath],{encoding:'utf8',maxBuffer:32*1024*1024})},
 {label:'candidate-digest-cache',commit:git('rev-parse','HEAD'),source:fs.readFileSync(path.join(repo,sourcePath),'utf8')}];
const results=[];
for(const {label,commit,source} of sources){
 // Add test exports without changing the functions under observation.
 const module=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {validationCache,verifyMainEnvelope};\n').toString('base64'));
 let readerCalls=0;const reader=()=>{readerCalls++;return {mockSemanticReader:true};};
 const db={},cache=module.validationCache(db,reader),options={reader,cache,cryptoApi:webcrypto};
 const snapshot=()=>({readerCalls,retainedKeys:cache.size,retainedKeyCodeUnits:[...cache.keys()].reduce((sum,key)=>sum+key.length,0),largestKeyCodeUnits:Math.max(0,...[...cache.keys()].map(key=>key.length))});
 for(const envelope of envelopes)await module.verifyMainEnvelope(envelope,options);
 const populated=snapshot();
 for(const envelope of envelopes)await module.verifyMainEnvelope(envelope,options);
 const reread=snapshot();
 await module.verifyMainEnvelope(envelopes[1],options,true);
 const forcedHead=snapshot();
 assert.equal(populated.readerCalls,2);assert.equal(forcedHead.readerCalls,reread.readerCalls+1,'forced returned head must invoke reader');
 results.push({label,commit,sourceSHA256:hash(source),sourceGitBlob:git('rev-parse',commit+':'+sourcePath),populated,reread,rereadAdditionalReaderCalls:reread.readerCalls-populated.readerCalls,forcedHead});
}
assert.equal(results[0].rereadAdditionalReaderCalls,2,'actual local texts exceed old combined bound');
assert.equal(results[1].rereadAdditionalReaderCalls,0,'both successful proofs fit bounded digest cache');
const report={schema:'ambertime-cache-proof-probe/1',probeSHA256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),environment:{node:process.version,platform:process.platform,arch:process.arch},
 scope:'MOCK semantic reader. Actual local100-year and next-month wire lengths; real extracted canonical/SHA/cache functions. No native IDB and no history replay.',
 limitations:['Reader call counts demonstrate cache eviction, not measured replay duration.','Retained key code units are NOT total process or browser memory. Texts remain held by the diagnostic input array.','Canonical/SHA corruption rejection is covered by separate tests, not inferred from this probe.','No claim about iPhone Safari, Chromium performance, or all five strategies.'],
 command:'node works/ambertime/design/restore-perf-v06/cache-proof-probe.mjs ../fixtures/unpacked/ambertime-v03-capacity/protocol',
 sources:results,wires:texts.map(({name,text})=>({name,codeUnits:text.length,utf8Bytes:Buffer.byteLength(text),sha256:hash(text)})),combinedCodeUnits:texts.reduce((n,{text})=>n+text.length,0),oldBoundCodeUnits:8*1024*1024};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
