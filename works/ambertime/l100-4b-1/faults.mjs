import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fast,fallback,full,seal,open} from './adapter.mjs';
import {hash} from '../checkpoint-research/prototype.mjs';
const [file,directory]=process.argv.slice(2),text=readFileSync(file,'utf8'),original=JSON.parse(readFileSync(resolve(directory,'checkpoint-12.json'))),expected=full(text),rows=[];
const cases={missing:()=>null,partial:p=>{delete p.checkpoint.state;},version:p=>p.format='wrong',fingerprint:p=>p.codeFingerprint='wrong',prefix:p=>p.prefixDigest='wrong',tailMissing:p=>p.tail.pop(),tailDuplicate:p=>p.tail.push(p.tail[0]),tailReorder:p=>p.tail.reverse(),rng:p=>p.checkpoint.state.seed++,generation:p=>p.generationId++,collector:p=>p.collectorDigest='wrong',mixedGeneration:p=>p.sourceSHA='wrong',context:p=>p.checkpoint.context.manualFills++,revision:p=>p.revision++};
for(const[name,change]of Object.entries(cases)){let p=structuredClone(open(original));const returned=change(p);const cp=name==='missing'?returned:seal(p);await assert.rejects(()=>fast(text,cp));const recovered=await fallback(text,cp);assert.equal(recovered.mode,'formal-fallback');assert.deepEqual(recovered.session,expected);assert.equal(readFileSync(file,'utf8'),text);rows.push({name,rejected:true,formalFallbackEqual:true,sourcePreserved:true});}
const previous=await fallback('{broken',null,[text]);assert.deepEqual(previous.session,expected);rows.push({name:'old-normal-only',formalFallbackEqual:true});await assert.rejects(()=>fallback('{broken',null,['{bad']));rows.push({name:'all-invalid',safeStop:true});
writeFileSync(resolve(directory,'faults.json'),JSON.stringify({sourceSHA:hash(text),rows,scope:'Node copies only. Re-sealed outer metadata tests consistency, not attacker authentication; no persistent storage guarantee.'},null,2));console.log(rows.length+' fault cases passed');
