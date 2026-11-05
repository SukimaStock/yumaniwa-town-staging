import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {restoreDistillery} from '../partner-orders.mjs';
const read=f=>readFileSync(new URL(f,import.meta.url),'utf8'),sha=x=>createHash('sha256').update(x).digest('hex');
test('memory and performance evidence bind complete inputs and unchanged dependencies',()=>{
 const m=JSON.parse(read('memory-results.json')),p=JSON.parse(read('performance-results.json')),a=JSON.parse(read('../save-audit/results.json'));
 assert.equal(m.codeFingerprint,sha(['memory-run.mjs','memory-worker.mjs'].map(read).join('\n')));
 assert.equal(p.codeFingerprint,sha(read('performance-run.mjs')));assert.equal(p.reuse.sourceSha256,sha(read('../save-audit/results.json')));
 assert.equal(m.results.length,12);assert.equal(p.results.length,12);
 for(const r of m.results){const original=a.results.find(x=>x.id===r.id&&x.month===r.month);assert.equal(r.inputSha256,original.hash);assert.equal(r.utf8Bytes,original.bytes);assert(r.phases.every(x=>x.ms>=0&&x.before.rss>0&&x.after.rss>0));assert(r.observedProcessMaxRssBytes>=r.baseline.rss);}
 for(const d of p.reuse.dependencyManifest)assert.equal(d.sha256,sha(read('../../../'+d.path)));
 for(const r of p.results){assert(r.tick.advanced);assert.equal(r.inputSha256,a.results.find(x=>x.id===r.id&&x.month===r.month).hash);}
 const f=JSON.parse(read('performance-formal.json'));assert.equal(f.inputSha256,a.results.find(x=>x.id==='wide'&&x.month===1200).hash);assert.equal(f.provenance.officialModelSha256,sha(read('../partner-orders.mjs')));assert.equal(f.provenance.formalBranchSha256,sha(read('performance-run.mjs').split("if(mode==='formal'){")[1].split('}else{')[0]));assert.equal(f.monthAfter,f.monthBefore+1);
});
test('current official reader rejects the exact internal boundary before parsing',()=>{
 assert.throws(()=>restoreDistillery(' '.repeat(6016384)),/保存が大きすぎます/);
 assert.throws(()=>restoreDistillery(' '.repeat(6016383)),/帳面を読み取れません/);
});
