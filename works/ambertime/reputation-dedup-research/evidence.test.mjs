import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8'),sha=x=>createHash('sha256').update(x).digest('hex');
const c=JSON.parse(read('capacity-results.json')),b=JSON.parse(read('browser-results.json'));
test('capacity evidence binds all twelve H24 inputs and exact executed codecs',()=>{
 assert.equal(c.codeFingerprint,sha(['capacity-run.mjs','adapter.mjs'].map(read).join('\n')));assert.equal(c.rows.length,12);assert.equal(new Set(c.rows.map(r=>r.id+':'+r.month)).size,12);
 const prior=JSON.parse(read('../save-audit/results.json'));
 for(const r of c.rows){const old=prior.results.find(x=>x.id===r.id&&x.month===r.month);assert.equal(r.sourceHash,old.hash);assert.equal(r.baseline.utf8Bytes,old.bytes);assert.equal(r.baseline.codeUnits,old.codeUnits);assert.deepEqual(r.variants.map(v=>v.variant),['A','B','C']);for(const v of r.variants){assert(v.roundTripExact);assert.equal(v.sessionSize.codeUnits,v.codeUnits+52);assert.equal(v.savedUtf8Bytes,r.baseline.utf8Bytes-v.utf8Bytes);assert.equal(v.savedCodeUnits,r.baseline.codeUnits-v.codeUnits);assert(v.encodeMs>=0&&v.decodeMs>=0);}assert(r.variants[2].codeUnits<r.variants[1].codeUnits);}
});
test('native browser IO evidence includes all A/B/C conditions, actual rejection and clean restart',()=>{
 assert.equal(b.codeFingerprint,sha(['browser-run.mjs','browser-suite.mjs','harness.html'].map(read).join('\n')));assert.equal(b.capacityResultsHash,sha(read('capacity-results.json')));assert.equal(b.rows.length,36);
 for(const r of b.rows){const cap=c.rows.find(x=>x.id===r.id&&x.month===r.month),v=cap.variants.find(x=>x.variant===r.variant);assert.equal(r.hash,v.sessionHash);assert.equal(r.sourceHash,cap.sourceHash);assert.equal(r.wireHash,v.wireHash);assert(r.reload);if(r.success)assert.equal(r.readHash,r.hash);else{assert.equal(r.error.name,'QuotaExceededError');assert.equal(r.id,'wide');assert.equal(r.variant,'A');assert([1080,1200].includes(r.month));}}
 assert.equal(b.rows.filter(x=>!x.success).length,2);assert(b.nativeQuota.nativeQuotaExceeded);assert(b.nativeQuota.largestSuccessCodeUnits<b.nativeQuota.smallestFailureCodeUnits);assert.equal(b.reopen.length,2);assert(b.reopen.every(x=>x.cleanProcessReopen));assert.equal(b.twoCopies.success,false);assert.equal(b.twoCopies.error,'QuotaExceededError');assert(b.twoCopies.firstUnchanged);
 const suite=read('browser-suite.mjs');assert(!suite.includes('sukimastock.ambertime'));assert(!suite.includes('localStorage.clear'));assert(suite.includes('ambertime-h1-b1-research-save'));
});
