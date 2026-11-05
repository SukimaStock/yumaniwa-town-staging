// One condition per process, atomic results; never overwrite original formal saves.
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {hash,loadAdapter,fullReplay,createCheckpoint,encodeContext} from '../checkpoint-research/prototype.mjs';
import {seal,FORMAT,atomicJSON,writeBundle} from './persistence.mjs';
const [source,directory,id]=process.argv.slice(2);assert(source&&directory&&id);
const a2=JSON.parse(readFileSync(new URL('../checkpoint-research/results.json',import.meta.url))),prior=a2.results.find(r=>r.id===id&&r.month===1200);assert(prior);
const raw=readFileSync(source,'utf8');assert.equal(hash(raw),prior.sourceHash);
const codeFingerprint=hash(['persistence.mjs','worker.mjs','long-run.mjs'].map(p=>[p,hash(readFileSync(new URL(p,import.meta.url),'utf8'))]));
mkdirSync(directory,{recursive:true});const resultPath=resolve(directory,'result.json');
if(existsSync(resultPath)){const old=JSON.parse(readFileSync(resultPath));assert.equal(old.status,'complete');assert.equal(old.codeFingerprint,codeFingerprint);assert.equal(old.sourceHash,hash(raw));console.log(JSON.stringify({...old,reused:true}));process.exit(0);}
const adapter=await loadAdapter();assert.equal(adapter.fingerprint,prior.modelFingerprint);
const target=JSON.parse(raw),wanted=new Set(prior.policies.map(p=>p.nextIndex)),captures=new Map();
const replayStart=performance.now();
const full=fullReplay(adapter,raw,{onStep:event=>{if(wanted.has(event.nextIndex)){
 const prefixRaw=JSON.stringify(event.state),start=performance.now(),cp=createCheckpoint(adapter,{...event,sourceRaw:prefixRaw});
 captures.set(event.nextIndex,{cp,prefixRaw,captureMs:performance.now()-start});
}}});const creationFullReplayMs=performance.now()-replayStart;
// Separate unmodified official reader validates target, then its public replay
// compares every persisted boundary, rather than trusting a local receipt flag.
const official=await import('../partner-orders.mjs'),officialStart=performance.now();assert.equal(JSON.stringify(official.restoreDistillery(raw)),raw);const officialRestoreMs=performance.now()-officialStart;
let checked=0;const validationStart=performance.now();
official.replayDistilleryOperations(target,({index,after})=>{const captured=captures.get(index+1);if(!captured)return;const {operations,origin,...view}=captured.cp.state;assert.equal(hash(view),hash(after));checked++;});assert.equal(checked,wanted.size);const boundaryVerificationMs=performance.now()-validationStart;
const worker=new URL('./worker.mjs',import.meta.url).pathname;
function child(mode,dir){const run=spawnSync(process.execPath,['--expose-gc',worker,mode,dir,resolve(source)],{encoding:'utf8',maxBuffer:1024*1024});assert.equal(run.status,0,run.stderr);return JSON.parse(run.stdout);}
const officialCold=child('official',directory),rows=[];
for(const policy of prior.policies){
 const capture=captures.get(policy.nextIndex),cp=capture.cp,dir=resolve(directory,policy.policy);
 const creation={sourceHash:hash(capture.prefixRaw),stateHash:hash(cp.state),contextHash:hash(cp.context),modelFingerprint:adapter.fingerprint,validation:'official-reader-and-independent-full-replay',officialMs:officialRestoreMs,fullMs:creationFullReplayMs,boundaryVerificationMs};
 const envelope=seal({format:FORMAT,checkpoint:cp,projection:null,creation});
 const written=writeBundle(dir,envelope,raw),cold=child('checkpoint',dir);
 assert.equal(cold.mode,'checkpoint');assert.equal(cold.stateHash,hash(raw));assert.equal(cold.contextHash,hash(encodeContext(full.context)));
 const row={policy:policy.policy,checkpointCount:policy.checkpointCount,nextIndex:cp.nextIndex,tailOperations:policy.tailOperations,tailMonths:policy.tailMonths,captureMs:capture.captureMs,writeMs:written.writeMs,bytes:written.bytes,cold};rows.push(row);
 atomicJSON(resolve(directory,policy.policy+'.result.json'),{status:'complete',sourceHash:hash(raw),codeFingerprint,...row});
 console.error(JSON.stringify({id,policy:policy.policy,tailMs:cold.timings.tailMs}));
}
const result={status:'complete',id,sourceHash:hash(raw),codeFingerprint,modelFingerprint:adapter.fingerprint,creationFullReplayMs,officialRestoreMs,boundaryVerificationMs,officialCold,rows,peakRssBytes:process.resourceUsage().maxRSS*1024,policy:'fresh Node per restore, OS cache uncontrolled, one sample, explicit GC before restore; no speedup ratio across trust guarantees'};
atomicJSON(resultPath,result);console.log(JSON.stringify(result));
