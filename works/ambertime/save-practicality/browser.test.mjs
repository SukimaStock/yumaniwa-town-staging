import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const result=JSON.parse(read('browser-results.json'));
test('browser evidence binds the executed code and all twelve original H24 saves',()=>{
 const fingerprint=createHash('sha256').update(['browser-run.mjs','browser-suite.mjs','harness.html'].map(read).join('\n')).digest('hex');assert.equal(result.codeFingerprint,fingerprint);
 const hashes=[...read('../chronicle-lab/H24.md').matchAll(/\| (地元密着|広域展開|混合) \| (30|60|90|100) \| (\d+) \|.*?`([a-f0-9]{64})`/g)],labels={local:'地元密着',wide:'広域展開',mixed:'混合'};
 const chromium=result.results.find(r=>r.engine==='chromium');assert.equal(chromium.status,'complete');assert.equal(chromium.conditions.length,12);
 for(const r of chromium.conditions){const source=hashes.find(h=>h[1]===labels[r.id]&&Number(h[2])*12===r.month);assert(source);assert.equal(r.sourceHash,source[4]);assert.equal(r.rawModel.hash,r.sourceHash);assert.equal(r.rawModel.utf8Bytes,Number(source[3]));assert.equal(r.codeUnits,r.rawModel.codeUnits+52);assert.equal(r.utf8Bytes,r.rawModel.utf8Bytes+52);assert(r.reload&&r.cleanProcessReopen);assert(r.idb.success);assert.equal(r.idb.hash,r.sourceHash);assert(Number.isFinite(r.setMs)&&r.setMs>=0);if(!r.success){assert.equal(r.error.name,'QuotaExceededError');assert(r.oldRetained);}}
});
test('native quota rejection preserves a complete prior official session across restart',()=>{
 const c=result.results.find(r=>r.engine==='chromium'),f=c.failedOfficialSequence;assert(f.failureReproduced);assert(f.oldFullSaveRetained);assert.equal(f.readHash,f.beforeHash);assert(f.reload&&f.cleanProcessReopen);assert(c.localNativeQuota.nativeQuotaExceeded);assert(c.localNativeQuota.attempts.some(x=>x.error==='QuotaExceededError'&&x.oldRetained));assert(c.localNativeQuota.largestSuccessCodeUnits<c.localNativeQuota.smallestFailureCodeUnits);
});
test('manual harness wraps game inputs and uses only isolated storage',()=>{
 const source=read('browser-suite.mjs'),html=read('harness.html');assert(source.includes("export const KEY='ambertime-h1-a5-research-local'"));assert(source.includes("const DB='ambertime-h1-a5-research-idb'"));assert(!source.includes('localStorage.clear'));assert(!source.includes('sukimastock.ambertime'));assert(html.includes('parsed.version===20'));assert(html.includes('version:2,game:parsed,userPaused:false,elapsed:0'));assert(!html.includes('shop-app.mjs'));
});
