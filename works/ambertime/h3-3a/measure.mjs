// Offline evidence harness only: replay supplies historical operation boundaries.
// The production collector and completed-recall reader never invoke this file.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import * as D from '../partner-orders.mjs';
import {initializeRecall,advanceRecall,prepareRecall,assertRecall,collectorCounts} from '../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../recent-ledger.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import {serializeSession,readSession} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const stats=xs=>{const s=[...xs].sort((a,b)=>a-b);return {count:s.length,medianMs:s.length?s[Math.floor(s.length/2)]:null,p95Ms:s.length?s[Math.min(s.length-1,Math.floor(s.length*.95))]:null,maxMs:s.length?s.at(-1):null};};
const timed=fn=>{const t=performance.now(),value=fn();return {value,ms:performance.now()-t};};
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const same=isDeepStrictEqual;
function sceneIdentity(p){return {seed:p.seed,scenes:p.scenes,dependencies:p.dependencies,proofs:p.proofs};}
export function measure(policy,{sourceDirectory='/tmp/h32-saves',researchDirectory=new URL('../../../../research/works/ambertime/h3-2/',import.meta.url).pathname,differentialOnly=false}={}){
 const raw=fs.readFileSync(path.join(sourceDirectory,`${policy}-1200.json`),'utf8'),source=JSON.parse(raw);
 const research=JSON.parse(fs.readFileSync(path.join(researchDirectory,'comparison.json'),'utf8'));
 const expected=research.results.find(r=>r.policy===policy&&r.years===100);assert(expected,'missing fixed research result');assert.equal(sha(raw),expected.sourceSha256);
 const checkpoints=new Map([360,720,1080,1200].map(month=>{const text=fs.readFileSync(path.join(sourceDirectory,`${policy}-${month}.json`),'utf8'),game=JSON.parse(text);return [game.operations.length-1,{month,text,game}];}));
 const result={policy,runtime:process.version,sourceSha256:sha(raw),method:'Offline native replay supplies boundaries; current session v8 uses the unchanged official serializer/reader. No browser/Safari measurements.',limitations:['Node timings are indicative shared-host samples, not isolated Safari measurements. Other tests and final local differential may overlap.','serializeAndValidateMs includes the unchanged official model validation and prefix catch-up; officialReadMs immediately follows it and is warm, not cold startup.','recallValidationMs measures only additional recall validation. All JSON timings are single samples.','RSS/heap include offline source fixtures, research baselines, native replay snapshots and GC; they are not collector-only memory or in-game peak memory.'],measurements:[],boundaries:[],checks:{},timings:{},implementation:Object.fromEntries(['collector','observe','selection','operations'].map(n=>[n,sha(fs.readFileSync(new URL(`../recall/${n}.mjs`,import.meta.url)))]))};
 let session=null,lastCompleted='[]';const monthly=[],all=[],prepareTimes=[],commitTimes=[];
 function measureSession(label,s){
  if(differentialOnly)return;
  const heapBefore=process.memoryUsage().heapUsed;
  const encoded=timed(()=>serializeSession(s.game,s,options));
  const decoded=timed(()=>readSession(encoded.value,options));
  assert.deepEqual(decoded.value,s,'official reader changed session');
  const parse=timed(()=>JSON.parse(encoded.value)),stringify=timed(()=>JSON.stringify(parse.value));assert.equal(stringify.value,encoded.value);
  const validation=timed(()=>assertRecall(s.game,s.recallRecord,s.historyRecord));
  const recallText=JSON.stringify(s.recallRecord);
  console.error(policy,label,s.game.core.month,Buffer.byteLength(encoded.value),encoded.value.length);
  result.measurements.push({label,month:s.game.core.month,generation:s.game.generations.active.id,operations:s.game.operations.length,utf8Bytes:Buffer.byteLength(encoded.value),codeUnits:encoded.value.length,collectorBytes:Buffer.byteLength(recallText),collectorCodeUnits:recallText.length,serializeAndValidateMs:encoded.ms,officialReadMs:decoded.ms,jsonStringifyMs:stringify.ms,jsonParseMs:parse.ms,recallValidationMs:validation.ms,heapDeltaBytes:process.memoryUsage().heapUsed-heapBefore,heapUsedBytes:process.memoryUsage().heapUsed,maxRssBytes:process.resourceUsage().maxRSS*1024,collector:collectorCounts(s.recallRecord)});
 }
 const begin=performance.now();
 D.replayDistilleryOperations(source,({index,operation,before,after})=>{
  const attach=(state,count)=>Object.fromEntries(Object.keys(source).filter(k=>k==='operations'||k==='origin'||Object.hasOwn(state,k)).map(k=>[k,k==='operations'?source.operations.slice(0,count):k==='origin'?source.origin:state[k]]));
  const game=attach(after,index+1);
  if(!session){
   if(operation?.key!=='enable-market-rules')return;
   session={game,userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:observer=>D.replayDistilleryOperations(game,observer)}),historyRecord:initializeHistoryRecord(game),recallRecord:initializeRecall(game)};
   measureSession('new',session);return;
  }
  const prior=attach(before,index);
  let prepared;
  if(operation.key==='generation-handover'){
   measureSession('before-handover', {...session,game:prior});
   const prep=timed(()=>prepareRecall(session.recallRecord,prior,index));prepared=prep.value;prepareTimes.push(prep.ms);
   const baseline=expected.boundaries.find(b=>b.generation===prepared.generation)?.small;assert(baseline,'missing research generation');
   const fields=['seed','scenes','dependencies','proofs'].filter(k=>!same(prepared[k],baseline[k]));
   result.boundaries.push({generation:prepared.generation,month:game.core.month,index,sameIds:same(prepared.scenes.map(s=>s.eventId),baseline.scenes.map(s=>s.eventId)),sameScenes:same(prepared.scenes,baseline.scenes),byteIdenticalScenes:JSON.stringify(prepared.scenes)===JSON.stringify(baseline.scenes),differentFields:fields,candidateCount:prepared.candidateCount,researchCandidateCount:baseline.candidateCount,selectedIds:prepared.scenes.map(s=>s.eventId),researchIds:baseline.scenes.map(s=>s.eventId),prepareMs:prep.ms});
  }
  const beforeHash=differentialOnly?null:sha(JSON.stringify(prior)),afterHash=differentialOnly?null:sha(JSON.stringify(game));
  const advance=timed(()=>advanceRecall(prior,game,session.recallRecord,{prepared}));all.push(advance.ms);if(operation.key==='month')monthly.push(advance.ms);if(prepared)commitTimes.push(advance.ms);
  if(!differentialOnly){assert.equal(sha(JSON.stringify(prior)),beforeHash);assert.equal(sha(JSON.stringify(game)),afterHash);}
  const next={game,userPaused:false,elapsed:0,caskSlots:reconcileCaskSlots(game,session.caskSlots),recentLedger:advanceRecentLedger(prior,game,session.recentLedger),historyRecord:advanceHistoryRecord(prior,game,session.historyRecord),recallRecord:advance.value};
  if(prepared){assert.equal(JSON.stringify(next.recallRecord.completed.slice(0,-1)),lastCompleted);lastCompleted=JSON.stringify(next.recallRecord.completed);measureSession('after-handover',next);}else assert.equal(JSON.stringify(next.recallRecord.completed),lastCompleted);
  session=next;
  if(checkpoints.has(index)){
   const expected=checkpoints.get(index);assert.deepEqual(game,expected.game,'checkpoint game/RNG differs');
   measureSession(`${expected.month/12}-year`,session);
   if(!differentialOnly)session=readSession(serializeSession(session.game,session,options),options);
  }
 });
 assert.equal(JSON.stringify(source),raw,'source game mutated');assert.deepEqual(session.game,source);
 result.timings={all:stats(all),month:stats(monthly),prepare:stats(prepareTimes),commit:stats(commitTimes),totalHarnessMs:performance.now()-begin};
 result.implementationAtEnd=Object.fromEntries(['collector','observe','selection','operations'].map(n=>[n,sha(fs.readFileSync(new URL(`../recall/${n}.mjs`,import.meta.url)))]));
 result.checks={sourceUnchanged:true,formalCheckpointsAndRngIdentical:true,officialSessionRoundTrip:differentialOnly?null:true,frozenRecallsUnchanged:true,jsonResumeContinues:differentialOnly?null:true,researchBoundaries:result.boundaries.length,allResearchScenesIdentical:result.boundaries.every(b=>b.differentFields.length===0)};
 return result;
}
if(process.argv[1]===new URL(import.meta.url).pathname){const policy=process.argv[2]??'local',output=process.argv[3]??new URL(`./measure-${policy}.json`,import.meta.url).pathname;const result=measure(policy,{researchDirectory:process.env.AMBER_H32_RESEARCH??new URL('../../../../research/works/ambertime/h3-2/',import.meta.url).pathname,differentialOnly:process.argv.includes('--differential-only')});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({policy,checks:result.checks,measurements:result.measurements.map(x=>({label:x.label,bytes:x.utf8Bytes,chars:x.codeUnits})),timings:result.timings},null,2));}
