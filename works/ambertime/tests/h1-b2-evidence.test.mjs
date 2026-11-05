import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),sha=x=>createHash('sha256').update(x).digest('hex');
test('B2 formal connection evidence binds newly executed reader/writer transitions and twelve exact expansions',()=>{
 const e=JSON.parse(read('h1-b2/equivalence-results.json')),prior=JSON.parse(read('reputation-dedup-research/capacity-results.json'));
 assert.equal(e.codeFingerprint,sha(['h1-b2/equivalence-run.mjs','save-codec.mjs','placement-save.mjs'].map(read).join('\n')));assert.equal(e.inputs.length,12);assert.equal(e.cases.length,3);assert.equal(e.cases.reduce((n,c)=>n+c.steps.length,0),357);
 for(const x of e.inputs){assert(x.byteExact);assert.equal(x.inputSha256,x.expandedSha256);assert.equal(x.inputSha256,prior.rows.find(y=>y.id===x.id&&y.month===x.month).sourceHash);}
 for(const x of e.cases){assert(x.formalValidated);assert(x.steps.length>0);assert(x.steps.every(s=>/^[a-f0-9]{64}$/.test(s.stateSha256)&&/^[a-f0-9]{64}$/.test(s.wireSha256)));}
 assert(e.cases.find(x=>x.name==='production-314159').final.sold>0);assert.equal(e.cases.find(x=>x.name==='generation42').final.generation,2);
 const history=JSON.parse(read('reputation-dedup-research/history-results.json'));assert.equal(e.historicalReuse.resultsSha256,sha(read('reputation-dedup-research/history-results.json')));assert.equal(e.historicalReuse.boundaries,9);for(const d of history.reuse.dependencyManifest)assert.equal(d.sha256,sha(readFileSync(new URL('../../../'+d.path,import.meta.url),'utf8')));
});
