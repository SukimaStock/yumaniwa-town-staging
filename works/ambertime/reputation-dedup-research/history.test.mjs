import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const sha=x=>createHash('sha256').update(x).digest('hex');
const results=JSON.parse(readFileSync(resolve(dir,'history-results.json'),'utf8'));
const prior=JSON.parse(read('works/ambertime/checkpoint-persistence/results.json'));
test('history evidence is complete and bound to unchanged extraction and adapter code',()=>{
 assert.equal(results.status,'complete');
 assert.equal(results.codeFingerprint,sha(['history-run.mjs','adapter.mjs'].map(f=>readFileSync(resolve(dir,f),'utf8')).join('\n')));
 assert.equal(results.reuse.priorResultSha256,sha(read('works/ambertime/checkpoint-persistence/results.json')));
 assert.equal(results.reuse.publishedSha256,sha(read('works/ambertime/chronicle-lab/facts-recalls-long.json')));
 assert.equal(results.reuse.independentBoundaryCount,9);
 assert(results.reuse.dependencyManifest.length>10);
 for(const file of results.reuse.dependencyManifest)assert.equal(sha(read(file.path)),file.sha256,file.path);
 assert.equal(results.rows.length,9);
});
for(const id of ['local','wide','mixed'])test(id+': all three representations preserve the same three historical boundaries',()=>{
 const rows=results.rows.filter(row=>row.id===id),old=prior.materials.find(row=>row.id===id);
 assert.deepEqual(rows.map(row=>row.variant),['A','B','C']);
 assert.equal(old.status,'complete');assert.equal(old.independentRawEqual,true);
 for(const row of rows){
  assert.equal(row.inputSha256,old.sourceHash);assert.equal(row.expandedSha256,old.sourceHash);
  assert.equal(row.fullStateByteEqual,true);assert.equal(row.rawExtractionReuse,true);
  assert.equal(row.boundaries.length,3);assert.deepEqual(row.boundaries,rows[0].boundaries);
  assert.equal(row.townEventsDigest,rows[0].townEventsDigest);assert.equal(row.operationsDigest,rows[0].operationsDigest);
  for(const b of row.boundaries){const before=old.boundaries.find(x=>x.handoverId===b.handoverId);assert(before.immediateEqualsLater&&before.publishedEqual);assert.equal(b.materialDigest,before.materialDigest);assert.equal(b.candidates,before.candidates);assert.equal(b.seed,before.seed);assert.deepEqual(b.selectedIds,before.selectedIds);assert.deepEqual(b.sentences,before.sentences);assert.match(b.rawFactFieldsDigest,/^[0-9a-f]{64}$/);}
 }
});
