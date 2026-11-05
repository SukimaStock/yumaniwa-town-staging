import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {fill,advance} from '../tests/recipe-helpers.mjs';
import {hash} from '../checkpoint-research/prototype.mjs';
import {createPersistent,writeBundle,readBundle,restoreOrFallback,seal,unseal} from './persistence.mjs';
const worker=new URL('./worker.mjs',import.meta.url).pathname;
function cold(dir,raw){const file=join(dir,'source.json');writeFileSync(file,raw);return JSON.parse(execFileSync(process.execPath,['--expose-gc',worker,'checkpoint',dir,file],{encoding:'utf8'}));}
const make=()=>mkdtempSync(join(tmpdir(),'amber-h1-a3-'));

test('creator -> disk -> independent Node process; forked futures remain independent',async()=>{
 const prefix=fill(D.newRecipeDistillery(87),{progress:65}),id=prefix.core.casks[0].id;
 const {envelope}=await createPersistent(D.serializeDistillery(prefix));
 for(const name of ['left','right']){
  const dir=make();try{const target=D.saveRecipe(advance(prefix,2),id,name),raw=D.serializeDistillery(target);writeBundle(dir,envelope,raw);const result=cold(dir,raw);assert.equal(result.mode,'checkpoint');assert.equal(result.stateHash,hash(raw));assert(result.replayed>0);assert.notEqual(result.pid,process.pid);}finally{rmSync(dir,{recursive:true});}
 }
});

test('corrupt/missing/misbound/version/context/interrupted bundles refuse and recover authoritative full source',async()=>{
 const prefix=fill(D.newRecipeDistillery(88),{progress:65}),raw=D.serializeDistillery(advance(prefix,2)),{envelope}=await createPersistent(D.serializeDistillery(prefix));
 const cases={
  'truncated checkpoint':(dir,m)=>writeFileSync(join(dir,m.checkpoint),'{'),
  'missing checkpoint':(dir,m)=>unlinkSync(join(dir,m.checkpoint)),
  'missing tail':(dir,m)=>unlinkSync(join(dir,m.tail)),
  'missing commit':dir=>unlinkSync(join(dir,'commit.json')),
  'changed state':(dir,m)=>{const path=join(dir,m.checkpoint),e=JSON.parse(readFileSync(path));e.checkpoint.state.core.cash++;writeFileSync(path,JSON.stringify(e));},
  'missing context':(dir,m)=>{const path=join(dir,m.checkpoint),e=JSON.parse(readFileSync(path));delete e.checkpoint.context;writeFileSync(path,JSON.stringify(e));},
  'wrong model':(dir,m)=>{const path=join(dir,m.checkpoint),e=JSON.parse(readFileSync(path));e.checkpoint.modelFingerprint='old';writeFileSync(path,JSON.stringify(e));},
  'tail omission':(dir,m)=>{const path=join(dir,m.tail),e=JSON.parse(readFileSync(path));e.operations.pop();writeFileSync(path,JSON.stringify(e));},
  'tail reorder':(dir,m)=>{const path=join(dir,m.tail),e=JSON.parse(readFileSync(path));e.operations.reverse();e.operations[0]={key:'invalid'};writeFileSync(path,JSON.stringify(e));},
  'interrupted first write':dir=>{unlinkSync(join(dir,'commit.json'));writeFileSync(join(dir,'commit.json.tmp'),'partial');},
 };
 for(const [label,edit] of Object.entries(cases)){const dir=make();try{const {manifest}=writeBundle(dir,envelope,raw);edit(dir,manifest);const restored=await restoreOrFallback(dir,raw);assert.equal(restored.mode,'full-fallback',label);assert.equal(hash(restored.state),hash(raw),label);}finally{rmSync(dir,{recursive:true});}}
 const dir=make();try{writeBundle(dir,envelope,raw);const wrongSeed=D.serializeDistillery(advance(fill(D.newRecipeDistillery(89),{progress:65}),2));assert.equal((await restoreOrFallback(dir,wrongSeed)).mode,'full-fallback');const branch=D.serializeDistillery(advance(fill(D.newRecipeDistillery(88),{progress:64}),2));assert.equal((await restoreOrFallback(dir,branch)).mode,'full-fallback');}finally{rmSync(dir,{recursive:true});}
});

test('checksum re-signing is explicitly not a correctness proof; full oracle detects changed state',async()=>{
 const prefix=fill(D.newRecipeDistillery(90),{progress:65}),raw=D.serializeDistillery(advance(prefix,2)),{envelope}=await createPersistent(D.serializeDistillery(prefix));
 const payload=unseal(envelope);payload.checkpoint.state.core.cash++;const {integrity,...cp}=payload.checkpoint;payload.checkpoint=seal(cp);payload.creation.stateHash=hash(cp.state);
 const forged=seal(payload),dir=make();try{writeBundle(dir,forged,raw);await assert.rejects(readBundle(dir,raw));const result=await restoreOrFallback(dir,raw);assert.equal(result.mode,'full-fallback');assert.equal(hash(result.state),hash(raw));}finally{rmSync(dir,{recursive:true});}
});

test('missing authoritative source/prefix cannot be repaired by its hash',async()=>{
 const dir=make();try{await assert.rejects(restoreOrFallback(dir,'not-json'));}finally{rmSync(dir,{recursive:true});}
});

test('resealed semantic invalidity reaches version, context and prefix gates',async()=>{
 const prefix=fill(D.newRecipeDistillery(92),{progress:65}),raw=D.serializeDistillery(advance(prefix,2)),{envelope}=await createPersistent(D.serializeDistillery(prefix));
 for(const [label,edit,reason] of [
  ['model',cp=>cp.modelFingerprint='obsolete',/expired/],
  ['context',cp=>delete cp.context.manualSources,/context/],
  ['version',cp=>cp.modelVersion=-1,/equal/],
  ['prefix',cp=>cp.prefixHash='different',/prefix/],
 ]){
  const payload=unseal(structuredClone(envelope)),cp=payload.checkpoint;edit(cp);const {integrity,...body}=cp;payload.checkpoint=seal(body);payload.creation.contextHash=hash(body.context);payload.creation.stateHash=hash(body.state);
  const dir=make();try{if(label==='prefix'){assert.throws(()=>writeBundle(dir,seal(payload),raw),reason);continue;}writeBundle(dir,seal(payload),raw);await assert.rejects(readBundle(dir,raw),reason);assert.equal((await restoreOrFallback(dir,raw)).mode,'full-fallback');}finally{rmSync(dir,{recursive:true});}
 }
});

test('resealed tail corruption and old checkpoint/new tail pairing are rejected semantically',async()=>{
 const prefix=fill(D.newRecipeDistillery(93),{progress:65}),raw=D.serializeDistillery(advance(prefix,3)),{envelope}=await createPersistent(D.serializeDistillery(prefix));
 for(const edit of [t=>t.operations.pop(),t=>t.operations[0]={key:'invalid'},t=>t.checkpointHash='wrong',t=>t.nextIndex++]){
  const dir=make();try{const {manifest}=writeBundle(dir,envelope,raw),old=JSON.parse(readFileSync(join(dir,manifest.tail))),tail=unseal(old);edit(tail);const modified=seal(tail),name=modified.integrity+'.tail.json';writeFileSync(join(dir,name),JSON.stringify(modified));const m=unseal(manifest);m.tail=name;m.tailHash=modified.integrity;writeFileSync(join(dir,'commit.json'),JSON.stringify(seal(m)));await assert.rejects(readBundle(dir,raw));assert.equal((await restoreOrFallback(dir,raw)).mode,'full-fallback');}finally{rmSync(dir,{recursive:true});}
 }
});

test('orphan writes before commit retain old readable transaction; observers cannot leak through fallback',async()=>{
 const prefix=fill(D.newRecipeDistillery(94),{progress:65}),raw=D.serializeDistillery(advance(prefix,2)),{envelope}=await createPersistent(D.serializeDistillery(prefix));const dir=make();
 try{writeBundle(dir,envelope,raw);writeFileSync(join(dir,'commit.json.999.tmp'),'{incomplete');writeFileSync(join(dir,'0'.repeat(64)+'.checkpoint.json'),'partial orphan');assert.equal(cold(dir,raw).mode,'checkpoint');let calls=0;await assert.rejects(restoreOrFallback(dir,raw,{observer:()=>calls++}),/transactional/);assert.equal(calls,0);}finally{rmSync(dir,{recursive:true});}
});
