// Committed research evidence must remain attached to its exact inputs and code.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('play evidence binds 12 complete deterministic month probes to unchanged A1 input and dependencies',()=>{
 const r=JSON.parse(fs.readFileSync(new URL('./play-results.json',import.meta.url)));
 const a=JSON.parse(fs.readFileSync(new URL('../save-audit/results.json',import.meta.url)));
 assert.equal(r.codeSha256,sha(fs.readFileSync(new URL('./play-run.mjs',import.meta.url))));
 assert.equal(r.priorEvidence.resultsSha256,sha(fs.readFileSync(new URL('../save-audit/results.json',import.meta.url))));
 assert.equal(r.rows.length,12);assert.equal(new Set(r.rows.map(x=>x.id+':'+x.month)).size,12);
 for(const d of r.priorEvidence.dependencies)assert.equal(d.sha256,sha(fs.readFileSync(new URL('../../../'+d.path,import.meta.url))),d.path);
 for(const row of r.rows){assert.equal(row.inputSha256,a.results.find(x=>x.id===row.id&&x.month===row.month).hash);assert.equal(row.monthSamples.length,3);assert.equal(new Set(row.monthSamples.map(s=>s.sha256)).size,1);for(const s of row.monthSamples){assert.equal(s.advanced,1);assert.equal(s.operationsAdded,1);assert(Number.isFinite(s.ms)&&s.ms>=0);}assert.equal(row.mapProgressAndSixIntroductionsMs.length,5);assert.equal(row.shopLedgerProjectionMs.length,5);}
});
