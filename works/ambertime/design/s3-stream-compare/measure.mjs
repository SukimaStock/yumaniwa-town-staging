// Run sequentially in separate Node processes. Never a formal cold-replay benchmark.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {encode,decode,hash} from '../s3-d1/codec.mjs';import {compareCandidate,hashFile} from './compare.mjs';
const GAME='b5701cdac0a8277abe9be432cc5dd3ea126fcedc8438a62567bfce9a80d50d55',RAW='ee2849503b2b9113b388a2c8049a1c8b650afc64821719ad7c42703fa9f14cf4';
const self=fileURLToPath(import.meta.url),[mode,input,directory]=process.argv.slice(2);
const mem=()=>({...process.memoryUsage(),maxRSSKiB:process.resourceUsage().maxRSS});
const environment={node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model};
function save(file,text){if(fs.existsSync(file)){assert.equal(fs.readFileSync(file,'utf8'),text)}else fs.writeFileSync(file,text,{flag:'wx'})}
if(mode==='prepare'){
 fs.mkdirSync(directory,{recursive:true});const start=performance.now(),before=mem();
 const raw=fs.readFileSync(input,'utf8');assert.equal(hash(raw),RAW);const x=JSON.parse(raw),readParseMs=performance.now()-start,afterRead=mem();
 let t=performance.now();const game=JSON.stringify(x.game);assert.equal(hash(game),GAME);assert.equal(game.length,9808696);assert.equal(Buffer.byteLength(game),10994786);const referencePrepareMs=performance.now()-t;
 const town=x.game.labConnection.town;assert.deepEqual([town.events.length,town.attempts.length,town.arrivals.length],[10333,26221,8153]);
 t=performance.now();const candidate=encode(x),encodeMs=performance.now()-t,afterEncode=mem();
 t=performance.now();const candidateText=JSON.stringify(candidate),expected={gameSha:GAME,inputSha:RAW,candidateSha:hash(candidateText)},anchorAndCandidateStringMs=performance.now()-t;
 assert.equal(candidateText.length,5310769);assert.equal(Buffer.byteLength(candidateText),6018719);
 save(path.join(directory,'candidate.json'),candidateText);save(path.join(directory,'expected.json'),JSON.stringify(expected));save(path.join(directory,'game-reference.json'),game);
 console.log(JSON.stringify({kind:'prepare',input,sourceSha:RAW,sourceBytes:Buffer.byteLength(raw),sourceUnits:raw.length,gameSha:GAME,gameUnits:game.length,gameBytes:Buffer.byteLength(game),counts:{events:10333,attempts:26221,arrivals:8153},candidateBytes:Buffer.byteLength(candidateText),candidateUnits:candidateText.length,candidateSha:expected.candidateSha,readParseMs,referencePrepareMs,encodeMs,anchorAndCandidateStringMs,totalMs:performance.now()-start,before,afterRead,afterEncode,after:mem(),environment,scope:'game and all six sidecars; known research fixture, not formal v8'}));
}else if(mode==='A'||mode==='B'||mode==='game'){
 const start=performance.now(),before=mem();const c=JSON.parse(fs.readFileSync(path.join(directory,'candidate.json'),'utf8')),expected=JSON.parse(fs.readFileSync(path.join(directory,'expected.json'),'utf8')),loadMs=performance.now()-start,afterLoad=mem();let result;
 if(mode==='A'){
  let t=performance.now();const reference=hashFile(input);assert.equal(reference.sha,expected.inputSha);const referenceHashMs=performance.now()-t;
  t=performance.now();const restored=decode(c,expected),decodeValidationHydrateAnchorMs=performance.now()-t,afterDecode=mem();
  t=performance.now();const text=JSON.stringify(restored),original=fs.readFileSync(input,'utf8');assert.equal(text,original);assert.equal(hash(original),expected.inputSha);const comparisonMs=performance.now()-t;
  result={equal:true,scope:'input',includesSidecars:true,units:text.length,bytes:Buffer.byteLength(text),outputSha:hash(text),gameSha:expected.gameSha,referenceHashMs,decodeValidationHydrateAnchorMs,comparisonMs,afterDecode};
 }else result=compareCandidate(c,expected,{referenceFile:mode==='game'?path.join(directory,'game-reference.json'):input,scope:mode==='game'?'game':'input'});
 const after=mem();if(after.maxRSSKiB>768*1024)throw Error('STOP: maxRSS above768MiB');console.log(JSON.stringify({mode,loadMs,totalProcessWorkMs:performance.now()-start,before,afterLoad,after,result,environment,cold:'fresh Node process; filesystem cache uncontrolled; no formal replay'}));
}else if(mode==='run'){
 const runs=[];for(let i=0;i<3;i++)for(const which of ['A','B']){
  const output=execFileSync(process.execPath,['--max-old-space-size=512',self,which,input,directory],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});const r=JSON.parse(output);assert.ok(r.result.equal);assert.ok(r.after.maxRSSKiB<=768*1024);runs.push({repeat:i+1,...r});
 }console.log(JSON.stringify({runs,note:'Three sequential fresh A/B pairs. Process lifetime maxRSS is not phase-isolated; preparation is separate. Both compare game and all sidecars using unchanged candidate validation and independent original. Baseline decode bundles validation, hydrate and anchor checks.'}));
}else throw Error('prepare|A|B|game|run source-file prepared-directory');
