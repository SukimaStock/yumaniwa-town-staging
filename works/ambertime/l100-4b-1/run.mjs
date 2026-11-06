import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadAdapter,fullReplay,createCheckpoint,hash,encodeContext} from '../checkpoint-research/prototype.mjs';
import {dependencyFingerprint} from '../checkpoint-persistence/fingerprint.mjs';
import * as D from '../partner-orders.mjs';
import {full,target,seal,sidecars,fast,advance,wire} from './adapter.mjs';
const [mode,file,out,intervalArg]=process.argv.slice(2);mkdirSync(out,{recursive:true});
const text=readFileSync(file,'utf8'),{game,raw,wire:w}=target(text);let count=0,cloneMs=0;const native=globalThis.structuredClone;globalThis.structuredClone=(...args)=>{const t=performance.now();try{return native(...args);}finally{count++;cloneMs+=performance.now()-t;}};
const save=(name,x)=>writeFileSync(resolve(out,name),JSON.stringify(x,null,2));
const mem=()=>{globalThis.gc?.();return {...process.memoryUsage(),peakRSS:process.resourceUsage().maxRSS*1024};};
if(mode==='create'){
 const adapter=await loadAdapter(),fingerprint=dependencyFingerprint(adapter.fingerprint),intervals=intervalArg?intervalArg.split(',').map(Number):[6,12,24,60],captures=new Map(),start=performance.now();
 const replay=fullReplay(adapter,raw,{onStep:event=>{for(const interval of intervals){if(!captures.has(interval)&&event.state.core.month>=game.core.month-interval){const t=performance.now();captures.set(interval,{checkpoint:createCheckpoint(adapter,{...event,sourceRaw:raw}),captureMs:performance.now()-t});}}}});
 const creationMs=performance.now()-start,officialStart=performance.now(),session=full(text),officialMs=performance.now()-officialStart;assert.deepEqual(session.game,replay.state);
 const rows=[];
 for(const [interval,c]of captures){const p={format:'ambertime-l100-4b-1/1',sourceSHA:hash(text),targetSHA:hash(raw),codeFingerprint:fingerprint,validation:'independent-full-replay-and-official-session',generationId:c.checkpoint.state.generations?.active.id??null,revision:c.checkpoint.nextIndex,prefixLength:c.checkpoint.nextIndex,prefixDigest:c.checkpoint.prefixHash,collectorMode:'endpoint-v8-not-prefix',collectorDigest:hash(sidecars(w)),tail:game.operations.slice(c.checkpoint.nextIndex),checkpoint:c.checkpoint};const envelope=seal(p),name=`checkpoint-${interval}.json`;save(name,envelope);const f=await fast(text,envelope);assert.deepEqual(f.session,session);assert.deepEqual(f.context,encodeContext(replay.context));rows.push({interval,file:name,tailOperations:f.replayed,checkpointMonth:c.checkpoint.month,captureMs:c.captureMs,checkpointBytes:Buffer.byteLength(JSON.stringify(envelope)),tailBytes:Buffer.byteLength(JSON.stringify(p.tail)),warmFastMs:f.timings.totalMs,fullSessionEqual:true,contextEqual:true});}
 assert.equal(dependencyFingerprint(adapter.fingerprint),fingerprint);
 save('create.json',{source:file,sourceSHA:hash(text),formalCodeUnits:raw.length,v8Bytes:Buffer.byteLength(text),node:process.version,modelFingerprint:adapter.fingerprint,codeFingerprint:fingerprint,creationMs,officialMs,cloneCount:count,cloneMs,rows,memory:mem(),status:'complete'});
 console.log(JSON.stringify({mode,file,creationMs,officialMs,rows:rows.length}));
}else if(mode==='cold'){
 const envelope=intervalArg==='A'?null:JSON.parse(readFileSync(resolve(out,`checkpoint-${intervalArg}.json`),'utf8'));globalThis.gc?.();count=0;cloneMs=0;const start=performance.now();const result=intervalArg==='A'?{session:full(text)}:await fast(text,envelope);const ms=performance.now()-start;
 console.log(JSON.stringify({method:intervalArg==='A'?'A':'B',interval:intervalArg,pid:process.pid,node:process.version,sourceSHA:hash(text),sessionSHA:hash(result.session),ms,cloneCount:count,cloneMs,timings:result.timings,memory:mem(),scope:'Fresh process/module cache; OS file cache uncontrolled; input file IO excluded; JSON parse/checkpoint IO excluded, source decode/fingerprint/session validation included'}));
}else if(mode==='future'){
 const cp=JSON.parse(readFileSync(resolve(out,'checkpoint-12.json'))),a=full(text),b=(await fast(text,cp)).session;let x=a,y=b;const rows=[];for(let n=1;n<=12;n++){x=advance(x);y=advance(y);assert.deepEqual(x,y);assert.equal(x.game.core.month,a.game.core.month+n);const encoded=wire(y);assert.deepEqual(full(encoded),y);rows.push({month:x.game.core.month,sessionSHA:hash(x),equal:true,roundtrip:true,formalCodeUnits:JSON.stringify(x.game).length});}save('future.json',{rows,sourceSHA:hash(text),status:'complete'});console.log('future complete');
}else if(mode==='boundary'){
 const cp=JSON.parse(readFileSync(resolve(out,'checkpoint-12.json')));let a=full(text),b=(await fast(text,cp)).session;const id=a.game.generations.active.id;assert.equal(a.game.generations.active.phase,'review');const rows=[];
 for(const [label,operation] of [['handover',s=>D.handoverGeneration(s,id)],['next-month',s=>D.tickDistillery(s)]]){a=advance(a,operation);b=advance(b,operation);assert.deepEqual(a,b);assert.equal(b.game.generations.active.id,id+1);const encoded=wire(b);assert.deepEqual(full(encoded),b);rows.push({label,sessionSHA:hash(b),recallSHA:hash(b.recallRecord),equal:true,roundtrip:true,generation:id+1});}
 save('boundary.json',{sourceSHA:hash(text),rows,status:'complete'});console.log('boundary complete');
}else throw Error('Unknown mode');
