import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8'),sha=x=>createHash('sha256').update(x).digest('hex');
test('actual main browser matrix binds all twelve official source saves and current product code',()=>{
 const r=JSON.parse(read('browser-results.json'));
 const names=['shop-app.mjs','index.html','placement-save.mjs','save-codec.mjs','market-ui.mjs','partner-orders.mjs','economy-parameters.mjs'];
 assert.equal(r.status,'complete');assert.equal(r.codeFingerprint,sha(names.map(f=>read('../'+f)).join('\n')));assert.equal(r.runnerFingerprint,sha(read('browser-run.mjs')));assert.equal(r.results.length,12);assert.equal(new Set(r.results.map(x=>x.id+':'+x.month)).size,12);
 const hashes=[...read('../chronicle-lab/H24.md').matchAll(/\| (地元密着|広域展開|混合) \| (30|60|90|100) \| (\d+) \|.*?`([a-f0-9]{64})`/g)],labels={local:'地元密着',wide:'広域展開',mixed:'混合'};
 for(const c of r.results){assert.equal(c.status,'complete');assert.equal(c.codeFingerprint,r.codeFingerprint);assert.equal(c.runnerFingerprint,r.runnerFingerprint);assert.equal(c.sourceHash,hashes.find(x=>x[1]===labels[c.id]&&+x[2]*12===c.month)[4]);const k=c.checks;assert.equal(k.firstCompactWrite.expandedHash,c.sourceHash);assert(k.firstCompactWrite.nativeReceipt);assert(k.startupNotices.exact&&k.settledNotices.exact);assert(k.saved.diagnostics.canSave);assert.equal(k.saved.storedVersion,3);assert.equal(k.expandedOfficialRead.hash,k.saved.gameHash);assert.equal(k.reload.gameHash,k.saved.gameHash);assert.equal(k.reload.storedVersion,3);assert(k.reload.diagnostics.canSave);assert.equal(k.nextMonth.month,c.month+1);assert(k.nextMonth.diagnostics.canSave);assert.equal(k.nextMonth.storedVersion,3);assert.equal(k.nextMonth.diagnostics.clockPending,false);assert.equal(c.pageErrors.length,0);
  if(k.oldNativeSeed.success){assert.equal(k.boot.gameHash,c.sourceHash);assert.equal(k.boot.storedVersion,2);assert.equal(k.boot.diagnostics.canSave,false);assert(k.boot.diagnostics.migrationPending);assert.equal(k.boot.diagnostics.clockPending,false);assert(k.download.exact&&k.download.downloadAloneDoesNotAuthorize);assert(k.migrationReadback.explicitConfirmation);}else{assert.equal(c.id,'wide');assert([1080,1200].includes(c.month));assert.equal(k.oldNativeSeed.error,'QuotaExceededError');assert(k.oldFileRestore.explicitConfirmation);assert(k.oldFileRestore.path.includes('visible'));}
 }
 const wide=r.results.find(x=>x.id==='wide'&&x.month===1200);assert(wide.checks.cleanProcessReopen.diagnostics.canSave);assert.equal(wide.checks.cleanProcessReopen.gameHash,wide.checks.nextMonth.gameHash);assert.equal(wide.checks.cleanProcessReopen.diagnostics.clockPending,false);
});
test('WebKit availability probe is qualified separately from iPhone Safari',()=>{
 const r=JSON.parse(read('browser-webkit.json'));assert.equal(r.runnerFingerprint,sha(read('browser-run.mjs')));assert(['available','unavailable'].includes(r.status));if(r.status==='unavailable')assert(r.error&&r.executable);assert(r.iPhoneSafari.startsWith('unverified'));
});
