// Offline fixture verification only. NEVER imported by the game or save reader.
// Reused verified official restore and one new research observer replay, with checkpoints captured
// in that same pass. Display timing excludes restore and research reconstruction.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as D from '../partner-orders.mjs?v=market-rules-r1&touch=1';
import {createGenerationSummary} from '../generation-summary.mjs';
import {initializeHistoryRecord,advanceHistoryRecord,assertHistoryRecord,historyRecordView} from '../history-record.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../../..');
function dependencyManifest(names=['history-record.mjs','generation-record.mjs','partner-orders.mjs','generation-summary.mjs']){const seen=new Map();function visit(file){if(seen.has(file))return;const content=fs.readFileSync(file,'utf8');seen.set(file,sha(content));for(const match of content.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.[^'"]+)['"]/g)){const name=match[1].split('?')[0];if(name.endsWith('.mjs'))visit(path.resolve(path.dirname(file),name));}}for(const name of names){const file=path.resolve(root,'works/ambertime',name);if(fs.existsSync(file))visit(file);}return [...seen].map(([file,sha256])=>({path:path.relative(root,file),sha256})).sort((a,b)=>a.path.localeCompare(b.path));}
const timed=fn=>{const t=performance.now(),value=fn();return {value,ms:performance.now()-t};};
const folder=process.argv[2]??'/tmp/amber-s1-inputs';
const expected=JSON.parse(fs.readFileSync(new URL('../s1/input-status.json',import.meta.url)));
const inputs=[360,720,1080,1200].map(month=>{const name=`local-${month}.json`,raw=fs.readFileSync(path.join(folder,name),'utf8');assert.equal(sha(raw),expected.find(r=>r.name===name).sha256);return {name,raw,sha256:sha(raw),game:JSON.parse(raw)};});
const manifest=dependencyManifest(),started=new Date().toISOString(),final=inputs.at(-1);
const prior=JSON.parse(fs.readFileSync(new URL('../s2/long-save-results.json',import.meta.url))).find(r=>r.input.name===final.name);
assert.equal(prior.input.sha256,final.sha256);const formalDependencies=dependencyManifest(['partner-orders.mjs']);
for(const entry of formalDependencies){const priorPath=path.relative(path.resolve(root,'works/ambertime'),path.resolve(root,entry.path));assert.equal(prior.dependencies.find(e=>e.path===priorPath)?.sha256,entry.sha256,'formal reader dependency changed: '+entry.path);}
const restore={value:final.game};
const reusedFormalRestore={source:'works/ambertime/s2/long-save-results.json',inputSha256:prior.input.sha256,ms:prior.timingMs.coldFormalRestore,sourceDependencyFingerprint:prior.dependencyFingerprint,matchedFormalDependencyCount:formalDependencies.length,formalDependencyFingerprint:sha(JSON.stringify(formalDependencies)),freshS4Timing:false};
const old=createGenerationSummary(restore.value);let history,lastGame;const checkpoints=[],byLength=new Map(inputs.map(i=>[i.game.operations.length,i]));
console.error('S4 research-only observer',new Date().toISOString());
const replay=timed(()=>D.replayDistilleryOperations(restore.value,observation=>{
 const {index,operation,before,after}=observation;
 old.observe(observation);
 const next={...after,origin:null,operations:final.game.operations.slice(0,index+1)};
 if(!operation)history=initializeHistoryRecord(next);
 else history=advanceHistoryRecord(lastGame,next,history);
 lastGame=next;
 const input=byLength.get(index+1);if(!input)return;
 assert.deepEqual(next,input.game,'checkpoint formal state differs from fixed input');
 assertHistoryRecord(next,history);
 global.gc?.();const heapBefore=process.memoryUsage().heapUsed;
 const first=timed(()=>historyRecordView(next,history));const heapAfter=process.memoryUsage().heapUsed;
 const repeats=[];for(let n=0;n<100;n++)repeats.push(timed(()=>historyRecordView(next,history)).ms);
 const oldSummaries=old.finish(next);
 const summaries=first.value.generations;
 const summaryChecks=oldSummaries.map(prior=>{const current=summaries.find(row=>row.id===prior.id);assert(current,'missing generation');const keys=['id','startedMonth','endedMonth','completed','totals','coverage','lastStatus','lastCaskId','lastBatchId','estate','events'];for(const key of keys)assert.deepEqual(current[key],prior[key],`generation ${prior.id} ${key}`);return {id:prior.id,totals:prior.totals,estate:prior.estate,matched:keys};});
 const serialized=JSON.stringify(history);
 checkpoints.push({input:{name:input.name,sha256:input.sha256,operations:next.operations.length,month:next.core.month,utf8Bytes:Buffer.byteLength(input.raw)},eventCount:first.value.events.length,eventKinds:first.value.events.reduce((o,e)=>(o[e.kind]=(o[e.kind]??0)+1,o),{}),generations:summaryChecks,historyUtf8Bytes:Buffer.byteLength(serialized),historyCodeUnits:serialized.length,timingMs:{firstView:first.ms,reopen100Mean:repeats.reduce((a,b)=>a+b,0)/100,reopen100Max:Math.max(...repeats)},memory:{viewHeapDeltaBytes:heapAfter-heapBefore},historySha256:sha(serialized),events:first.value.events,retainedEvidenceIds:history.evidence.map(e=>e.id)});
}));
assert.equal(checkpoints.length,4);
const future=timed(()=>D.tickDistillery(final.game));const nextHistory=advanceHistoryRecord(final.game,future.value,history);const nextView=timed(()=>historyRecordView(future.value,nextHistory));
assert.deepEqual(dependencyManifest(),manifest,'dependencies changed during measurement');
const result={schema:'ambertime-s4-node-performance/1',started,finished:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch,chromium:'UNVERIFIED'},sourceScope:'local policy only, verified S2 formal restore reused by exact input + formal dependency hashes; one new research-only observer replay; not a production migration',dependencyFingerprint:sha(JSON.stringify(manifest)),dependencies:manifest,reusedFormalRestore,researchReconstructionMs:replay.ms,afterMonthViewMs:nextView.ms,memory:{end:process.memoryUsage(),processMaxRssKiB:process.resourceUsage().maxRSS},checkpoints,limitations:['Node view-data generation only; not DOM rendering, first paint, browser memory, startup or interaction latency.','Added bytes are history sidecar JSON only, not measured Safari quota.','Research-only replay supplies old fixture facts; production v7 does not migrate old games.','Old generation totals and estate are compared at all four checkpoints in the same observer pass.']};
fs.writeFileSync(new URL('./performance.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,dependencies:undefined,checkpoints:checkpoints.map(({events,...rest})=>rest)},null,2));
