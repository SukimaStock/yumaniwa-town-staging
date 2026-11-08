// Fresh-process, sequential research measurement. No formal100year replay.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {encode,decode,hash} from '../s3-d1/codec.mjs';import {compareCandidate as B0,hashFile} from './compare.mjs';import {compareCandidate as B1} from './compare-buffered.mjs';
const GAME='b5701cdac0a8277abe9be432cc5dd3ea126fcedc8438a62567bfce9a80d50d55',RAW='ee2849503b2b9113b388a2c8049a1c8b650afc64821719ad7c42703fa9f14cf4',CANDIDATE='77aa72bca3dccf01766a8ffede1f7be2743870c3101010a8428f4a2736d92dc3';
const self=fileURLToPath(import.meta.url),[mode,input,prepared,capacityArg]=process.argv.slice(2),chunkUnits=Number(capacityArg??16384);
const mem=()=>({...process.memoryUsage(),maxRSSKiB:process.resourceUsage().maxRSS});
const environment={node:process.version,flags:process.execArgv,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model};
function originalRead(){const raw=fs.readFileSync(input,'utf8');assert.equal(hash(raw),RAW);return JSON.parse(raw)}
function verifyGame(x){const text=JSON.stringify(x.game);assert.equal(hash(text),GAME);assert.equal(text.length,9808696);assert.equal(Buffer.byteLength(text),10994786);const t=x.game.labConnection.town;assert.deepEqual([t.events.length,t.attempts.length,t.arrivals.length],[10333,26221,8153])}
function save(file,text){fs.writeFileSync(file,text,{flag:'wx'})}
function prepareOld(dir){
 const start=performance.now(),before=mem(),raw=fs.readFileSync(input,'utf8');assert.equal(hash(raw),RAW);const x=JSON.parse(raw),readParseVerifyMs=performance.now()-start,afterRead=mem();
 let t=performance.now();const game=JSON.stringify(x.game);assert.equal(hash(game),GAME);verifyGameCounts(x,game);const gameAnchorMs=performance.now()-t;
 t=performance.now();const c=encode(x),encodeMs=performance.now()-t,afterEncode=mem();
 t=performance.now();const text=JSON.stringify(c),a={gameSha:GAME,inputSha:RAW,candidateSha:hash(text)};assert.equal(a.candidateSha,CANDIDATE);const candidateTextAnchorMs=performance.now()-t;
 t=performance.now();save(path.join(dir,'candidate.json'),text);save(path.join(dir,'expected.json'),JSON.stringify(a));save(path.join(dir,'game-reference.json'),game);const writeMs=performance.now()-t;
 return {kind:'old',readParseVerifyMs,gameAnchorMs,encodeMs,candidateTextAnchorMs,writeMs,totalMs:performance.now()-start,before,afterRead,afterEncode,after:mem(),candidateSha:a.candidateSha,gameReferenceWritten:true};
}
function verifyGameCounts(x,game){assert.equal(game.length,9808696);assert.equal(Buffer.byteLength(game),10994786);const t=x.game.labConnection.town;assert.deepEqual([t.events.length,t.attempts.length,t.arrivals.length],[10333,26221,8153])}
function prepareImproved(dir){
 const start=performance.now(),before=mem();let x=originalRead();const readParseVerifyMs=performance.now()-start,afterRead=mem();
 let t=performance.now();verifyGame(x);const gameAnchorMs=performance.now()-t;
 t=performance.now();const c=encode(x),encodeMs=performance.now()-t,afterEncode=mem();x=null;
 t=performance.now();const text=JSON.stringify(c),a={gameSha:GAME,inputSha:RAW,candidateSha:hash(text)};assert.equal(a.candidateSha,CANDIDATE);const candidateTextAnchorMs=performance.now()-t;
 t=performance.now();save(path.join(dir,'candidate.json'),text);save(path.join(dir,'expected.json'),JSON.stringify(a));const writeMs=performance.now()-t;
 return {kind:'improved',readParseVerifyMs,gameAnchorMs,encodeMs,candidateTextAnchorMs,writeMs,totalMs:performance.now()-start,before,afterRead,afterEncode,after:mem(),candidateSha:a.candidateSha,gameReferenceWritten:false,changes:'Exact raw text hash verified inside read scope; transient native game hash; original released before candidate string; optional game-only file not generated. Codec unchanged. No forced GC.'};
}
function compare(which,dir){
 const start=performance.now(),before=mem(),c=JSON.parse(fs.readFileSync(path.join(dir,'candidate.json'),'utf8')),a=JSON.parse(fs.readFileSync(path.join(dir,'expected.json'),'utf8')),loadMs=performance.now()-start,afterLoad=mem();assert.equal(a.candidateSha,CANDIDATE);let result;
 if(which==='A'){
  let t=performance.now();assert.equal(hashFile(input).sha,a.inputSha);const referenceHashMs=performance.now()-t;
  t=performance.now();const restored=decode(c,a),decodeValidationHydrateAnchorMs=performance.now()-t,afterDecode=mem();
  t=performance.now();const text=JSON.stringify(restored),original=fs.readFileSync(input,'utf8');assert.equal(text,original);assert.equal(hash(original),a.inputSha);const comparisonMs=performance.now()-t;
  result={equal:true,scope:'input',includesSidecars:true,units:text.length,bytes:Buffer.byteLength(text),outputSha:hash(text),gameSha:a.gameSha,referenceHashMs,decodeValidationHydrateAnchorMs,comparisonMs,afterDecode,outputResponsibility:'restored whole state plus direct equality'};
 }else result=(which==='B0'?B0:B1)(c,a,{referenceFile:input,chunkUnits});
 return {which,loadMs,totalMs:performance.now()-start,before,afterLoad,after:mem(),result};
}
if(mode==='run'){
 const groups=[['A','B0','B1'],['old-B0','old-B1','improved-B1']],runs=[];
 for(const group of groups)for(let repeat=0;repeat<3;repeat++)for(let j=0;j<group.length;j++){
  const which=group[(j+repeat)%group.length],output=execFileSync(process.execPath,['--expose-gc','--max-old-space-size=512',self,which,input,prepared,String(chunkUnits)],{encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024}),r=JSON.parse(output);assert.ok(r.comparison.result.equal);assert.ok(r.after.maxRSSKiB<=768*1024);runs.push({order:runs.length+1,repeat:repeat+1,...r});
 }
 console.log(JSON.stringify({runs,note:'Separate fresh processes, rotated balanced sequential order; filesystem cache uncontrolled. end-to-end preparation and compare in SAME process. No forced GC before measured completion; after-GC sample reported separately. No formal100year replay.'}));
}else{
 assert.ok(['A','B0','B1','old-B0','old-B1','improved-B1'].includes(mode));const start=performance.now(),before=mem();let prep=null,dir=prepared;
 if(mode.includes('-')){dir=fs.mkdtempSync(path.join(os.tmpdir(),'amber-buffer-prep-'));prep=mode.startsWith('old-')?prepareOld(dir):prepareImproved(dir)}
 const comparison=compare(mode.split('-').at(-1),dir),totalMs=performance.now()-start,after=mem();if(after.maxRSSKiB>768*1024)throw Error('STOP: process RSS above768MiB');
 // Explicitly outside measured timing and peak. GC is applied equally to every mode.
 global.gc?.();const afterGc=mem();console.log(JSON.stringify({mode,chunkUnits,inputSha:RAW,candidateSha:CANDIDATE,before,preparation:prep,comparison,totalMs,after,afterGc,environment,moduleLoadIncluded:false,formalReplay:false,preparationDirectory:mode.includes('-')?dir:null}));
}
