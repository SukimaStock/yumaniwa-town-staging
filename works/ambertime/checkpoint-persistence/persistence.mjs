// H1-A3 offline only: these files are never imported by the product reader.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,openSync,closeSync,fsyncSync,renameSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {loadAdapter,fullReplay,createCheckpoint,verifyCheckpoint,replayTail,hash,encodeContext} from '../checkpoint-research/prototype.mjs';

export const FORMAT='ambertime-persistent-research/1';
export const seal=payload=>({...payload,integrity:hash(payload)});
export function unseal(value){assert(value&&typeof value==='object','Missing envelope');const {integrity,...payload}=value;assert.equal(hash(payload),integrity,'Envelope integrity mismatch');return payload;}
export function atomicJSON(file,value){
 mkdirSync(dirname(file),{recursive:true});
 // Exclusive temporary path: an interrupted writer cannot overwrite a live writer.
 const temporary=file+'.'+process.pid+'.tmp';const fd=openSync(temporary,'wx');
 try{writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
 renameSync(temporary,file);const directory=openSync(dirname(file),'r');try{fsyncSync(directory);}finally{closeSync(directory);}
}
export async function createPersistent(boundaryRaw,{projection=null}={}){
 const adapter=await loadAdapter();
 // Fresh official module cache is not used as the context oracle: fullReplay has
 // a separate empty context and the unmodified reader independently validates state.
 const official=await import('../partner-orders.mjs');
 const start=performance.now(),native=official.restoreDistillery(boundaryRaw),officialMs=performance.now()-start;
 assert.equal(JSON.stringify(native),boundaryRaw);
 const replayStart=performance.now(),full=fullReplay(adapter,boundaryRaw),fullMs=performance.now()-replayStart;
 const capture=performance.now(),checkpoint=createCheckpoint(adapter,{...full,sourceRaw:boundaryRaw});
 assert.equal(JSON.stringify(checkpoint.state),boundaryRaw,'Only finalized operation boundaries can be persisted');
 const payload={format:FORMAT,checkpoint,projection,creation:{sourceHash:hash(boundaryRaw),stateHash:hash(full.state),contextHash:hash(encodeContext(full.context)),modelFingerprint:adapter.fingerprint,validation:'official-reader-and-independent-full-replay',officialMs,fullMs}};
 return {envelope:seal(payload),timings:{officialMs,fullMs,captureMs:performance.now()-capture}};
}
export function writeBundle(directory,envelope,targetRaw){
 const start=performance.now(),payload=unseal(envelope),target=JSON.parse(targetRaw),cp=payload.checkpoint;
 assert.equal(hash(target.operations.slice(0,cp.nextIndex)),cp.prefixHash,'Different prefix branch');
 const tail=seal({format:FORMAT+'/tail',checkpointHash:envelope.integrity,seed:target.seed,originHash:hash(target.origin),nextIndex:cp.nextIndex,operations:target.operations.slice(cp.nextIndex),targetHash:hash(targetRaw),operationsHash:hash(target.operations)});
 // Immutable content-addressed data first; commit pointer last. A .tmp is never read.
 const cpName=envelope.integrity+'.checkpoint.json',tailName=tail.integrity+'.tail.json';
 atomicJSON(resolve(directory,cpName),envelope);atomicJSON(resolve(directory,tailName),tail);
 const manifest=seal({format:FORMAT+'/commit',checkpoint:cpName,tail:tailName,checkpointHash:envelope.integrity,tailHash:tail.integrity,targetHash:hash(targetRaw)});
 atomicJSON(resolve(directory,'commit.json'),manifest);
 return {manifest,writeMs:performance.now()-start,bytes:Buffer.byteLength(JSON.stringify(envelope))+Buffer.byteLength(JSON.stringify(tail))+Buffer.byteLength(JSON.stringify(manifest))};
}
function localName(name){assert.equal(typeof name,'string');assert(/^[a-f0-9]{64}\.(checkpoint|tail)\.json$/.test(name),'Invalid bundle filename');return name;}
export async function readBundle(directory,targetRaw,{observer}={}){
 const times={},readStart=performance.now();
 const manifestRaw=readFileSync(resolve(directory,'commit.json'),'utf8');
 const parseStart=performance.now(),manifest=unseal(JSON.parse(manifestRaw));times.manifestReadMs=parseStart-readStart;
 assert.equal(manifest.format,FORMAT+'/commit');
 const read=performance.now(),cpRaw=readFileSync(resolve(directory,localName(manifest.checkpoint)),'utf8'),tailRaw=readFileSync(resolve(directory,localName(manifest.tail)),'utf8');times.fileReadMs=performance.now()-read;
 const parse=performance.now(),envelope=JSON.parse(cpRaw),tailEnvelope=JSON.parse(tailRaw);times.parseMs=performance.now()-parse;
 const importStart=performance.now(),adapter=await loadAdapter();times.adapterImportMs=performance.now()-importStart;
 const verify=performance.now(),payload=unseal(envelope),tail=unseal(tailEnvelope),target=JSON.parse(targetRaw),cp=payload.checkpoint;
 assert.equal(payload.format,FORMAT);assert.equal(tail.format,FORMAT+'/tail');
 assert.equal(envelope.integrity,manifest.checkpointHash);assert.equal(tailEnvelope.integrity,manifest.tailHash);assert.equal(tail.checkpointHash,envelope.integrity);
 assert.equal(manifest.checkpoint,envelope.integrity+'.checkpoint.json');assert.equal(manifest.tail,tailEnvelope.integrity+'.tail.json');
 assert.equal(manifest.targetHash,hash(targetRaw));assert.equal(tail.targetHash,hash(targetRaw));assert.equal(tail.seed,target.seed);assert.equal(tail.originHash,hash(target.origin));
 assert.equal(tail.nextIndex,cp.nextIndex);assert.equal(tail.operationsHash,hash(target.operations));assert.deepEqual(tail.operations,target.operations.slice(cp.nextIndex),'Tail missing, reordered or modified');
 assert.equal(payload.creation.sourceHash,cp.sourceHash);assert.equal(payload.creation.stateHash,hash(cp.state));assert.equal(payload.creation.contextHash,hash(cp.context));assert.equal(payload.creation.modelFingerprint,adapter.fingerprint);
 // Validation receipt is local evidence, not an authentication signature.
 assert.equal(payload.creation.validation,'official-reader-and-independent-full-replay');
 const checked=verifyCheckpoint(adapter,cp,targetRaw,{binding:'prefix-branch'});times.localVerifyMs=performance.now()-verify;
 const replay=replayTail(adapter,cp,targetRaw,{binding:'prefix-branch',observer});
 return {...replay,projection:payload.projection,envelope,contextHydrateAndVerifyMs:checked.verifyMs,timings:{...times,tailMs:replay.tailMs,finalizeMs:replay.finalizeMs,compareMs:replay.compareMs},guarantee:'local integrity plus creator trust; independent full verification NOT performed on this load'};
}
export async function restoreOrFallback(directory,targetRaw,options={}){
 // Partial observers can mutate external collectors before a late failure.
 // This convenience fallback is state-only; material callers stage/discard their
 // own detached collector with readBundle and rebuild it on fallback.
 assert.equal(options.observer,undefined,'Fallback API requires transactional detached collectors; direct observer forbidden');
 try{return {mode:'checkpoint',result:await readBundle(directory,targetRaw)};}
 catch(error){
  // A failed partial state is never returned. Authoritative source stays external.
  const official=await import('../partner-orders.mjs'),start=performance.now(),state=official.restoreDistillery(targetRaw);
  assert.equal(JSON.stringify(state),targetRaw);
  return {mode:'full-fallback',reason:error.message,state,fullRestoreMs:performance.now()-start};
 }
}
