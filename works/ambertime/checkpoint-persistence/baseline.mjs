import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {hash,loadAdapter} from '../checkpoint-research/prototype.mjs';
import {atomicJSON} from './persistence.mjs';
const [saves,output]=process.argv.slice(2);assert(saves&&output);
const a2raw=readFileSync(new URL('../checkpoint-research/results.json',import.meta.url),'utf8'),a2=JSON.parse(a2raw);
const a1=JSON.parse(readFileSync(new URL('../save-audit/results.json',import.meta.url),'utf8'));
assert.equal(a2.complete,true);assert.equal(a2.results.length,12);
const adapter=await loadAdapter(),rows=[];
for(const row of a2.results){
 assert.equal(row.status,'complete');assert.equal(row.modelFingerprint,adapter.fingerprint);assert.equal(row.codeFingerprint,'4b291acbfe0bfd7c5dadb8b79e145e11288aaddf7e245cf9874028d53f515a34');
 const previous=a1.results.find(x=>x.id===row.id&&x.month===row.month);assert.equal(previous.hash,row.sourceHash);assert.equal(previous.bytes,row.sourceBytes);
 assert.equal(row.policies.length,5);for(const p of row.policies)for(const flag of ['stateEqual','contextEqual','projectionEqual','recallEqual'])assert.equal(p[flag],true);
 const file=resolve(saves,`${row.id}-${row.month}.json`);assert(existsSync(file),'Missing source '+file);const raw=readFileSync(file,'utf8');assert.equal(hash(raw),row.sourceHash);assert.equal(Buffer.byteLength(raw),row.sourceBytes);
 rows.push({id:row.id,month:row.month,sourceHash:row.sourceHash,sourceBytes:row.sourceBytes,policies:5,existingResultsReused:true});
}
atomicJSON(output,{schema:'ambertime-h1-a3-baseline/1',status:'complete',a2ResultsHash:hash(a2raw),modelFingerprint:adapter.fingerprint,a2CodeFingerprint:a2.results[0].codeFingerprint,conditions:rows,tailCases:60,note:'Published H1-A2 validated outputs are reused, not rerun or relabelled as cold. Scratch source saves reproduced using unchanged public H24 generator because prior session scratch is unavailable; all bytes/hash match existing H1-A1/H1-A2.'});
console.log('12 input hashes/bytes and 60 published comparisons verified');
