// F2 isolated NEW formal-v8 input made with current public operations/writer.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import * as Native from '../../partner-orders.mjs';
import {PARALLEL_PARAMETERS as P}from '../../parallel-parameters.mjs';
import {serializeSession,readSession}from '../../development-save.mjs';
import {simulateScenario}from '../market-dialogue-s3/long-run.mjs';
import {continueScenario}from './f-continue.mjs';
import {encode,decode,anchor,hash}from './codec.mjs';
const options={enabled:true,serialize:Native.serializeDistillery,restore:Native.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const out=process.argv[2];assert(out,'output report path required');
const directory=fs.mkdtempSync('/tmp/s3-d1-f-v8-'),originalPath=path.join(directory,'original-v8.json');
let input;simulateScenario('wide',24,{checkpoints:[24],onCheckpoint(game,{records}){input={game,...records}}});assert(input);
const started=performance.now(),{game,...records}=input,wire=serializeSession(game,records,options),writerMs=performance.now()-started;
fs.writeFileSync(originalPath,wire,{flag:'wx'});const originalSha=hash(wire);
const t=performance.now(),original=readSession(wire,options),formalReadMs=performance.now()-t;assert.equal(JSON.stringify(original.game),JSON.stringify(game));
const expected=anchor(original),candidate=encode(original),roundtrip=decode(candidate,expected);assert.equal(JSON.stringify(roundtrip),JSON.stringify(original));
const nextExpected=continueScenario(original,'wide',1),nextActual=continueScenario(roundtrip,'wide',1);assert.equal(JSON.stringify(nextActual),JSON.stringify(nextExpected));assert.equal(nextActual.game.core.month,25);
const cases=[];
function recover(candidatePath,sourcePath){try{return {kind:'candidate',input:decode(JSON.parse(fs.readFileSync(candidatePath,'utf8')),expected)}}catch(error){if(!sourcePath||!fs.existsSync(sourcePath))throw Error('SAFE_STOP: no independently preserved formal original');const before=fs.readFileSync(sourcePath,'utf8');assert.equal(hash(before),originalSha);return {kind:'formal-original',input:readSession(before,options),candidateError:error.message}}}
const faults={events:c=>c.events.rows.pop(),attempts:c=>c.attempts.rows.pop(),schema:c=>c.events.rows[0][1]=999999,integrity:c=>c.integrity='broken',source:c=>{let r=c.events.rows[0],i=c.events.schemas[r[1]].indexOf('sourceId');assert(i>=0);r[i+2]='missing'},version:c=>c.version=99,generation:c=>c.active.recallRecord={wrongGeneration:true}};
for(const [name,mutate]of Object.entries(faults)){
 const c=structuredClone(candidate);mutate(c);if(name!=='integrity'){const {integrity,...body}=c;c.integrity=hash(body)}const p=path.join(directory,name+'.json');fs.writeFileSync(p,JSON.stringify(c));
 const result=recover(p,originalPath);assert.equal(result.kind,'formal-original');assert.equal(JSON.stringify(result.input),JSON.stringify(original));assert.equal(JSON.stringify(continueScenario(result.input,'wide',1)),JSON.stringify(nextExpected));assert.equal(fs.readFileSync(originalPath,'utf8'),wire);assert.throws(()=>recover(p,null),/SAFE_STOP/);cases.push({name,rejected:true,originalBytesUnchanged:true,fallbackFullInputExact:true,nextMonthExact:true,noOriginalSafeStop:true});
}
for(const name of ['candidate-truncated','candidate-creation-interrupted']){
 const p=path.join(directory,name+'.json');fs.writeFileSync(p,JSON.stringify(candidate).slice(0,100));const result=recover(p,originalPath);assert.equal(result.kind,'formal-original');assert.equal(JSON.stringify(result.input),JSON.stringify(original));assert.equal(fs.readFileSync(originalPath,'utf8'),wire);assert.throws(()=>recover(p,null),/SAFE_STOP/);cases.push({name,rejected:true,originalBytesUnchanged:true,fallbackFullInputExact:true,noOriginalSafeStop:true});
}
assert.equal(hash(fs.readFileSync(originalPath,'utf8')),originalSha);
fs.writeFileSync(out,JSON.stringify({status:'complete',provenance:'new isolated v8 from current public-operation 24-month wide seed42 career; NOT rediscovered old 10/30-year wire',directory,originalPath,originalSha,wireBytes:Buffer.byteLength(wire),wireUnits:wire.length,writerMs,formalReadMs,gameSha:hash(game),fullInputSha:hash(original),month:game.core.month,candidateBytes:Buffer.byteLength(JSON.stringify(candidate)),roundtripExact:true,nextMonth:nextActual.game.core.month,cases,scope:'isolated files only; not browser atomicity, power loss or IndexedDB',node:process.version},null,2));
