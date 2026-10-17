import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import * as E from '../economy.mjs';
import * as V081 from '../wholesale.mjs';
import * as V09 from '../trade.mjs';
import {AROMA_MODEL} from '../aroma-extraction.mjs';
import {distillationView} from '../spirit-view.mjs';
import {fill,advance,exact} from './brands-helpers.mjs';
import {loadFixture} from './wholesale-care-helpers.mjs';
const clone=structuredClone,sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function steps(s,n){for(let i=0;i<n;i++)s=D.distillStep(s);return s;}
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);return s;}
function preserved(old,next){for(const key of Object.keys(old).filter(k=>!['version','rules','operations'].includes(k)))assert.deepEqual(next[key],old[key],key);assert.deepEqual(next.operations.slice(0,-1),old.operations);assert.equal(next.operations.at(-1).key,'enable-aroma');}

// These fingerprints were independently calculated from the pre-change
// partner-orders source at 47a54c47b068df4b7e29218c49473231ced5b01d.
test('old v6-v10 constructors still produce exactly the pre-change save bytes',()=>{
 const expected={newDistillery:'5f1727f5ad4cac2105715e47bcd718721afc7f25fdb6e2835e4c7269e53bc965',newPromisedDistillery:'1b0d192f32beb7eb2510c2fe2ffe533305697d61d0dcaa9fe0f43c9edd6739af',newBrandedDistillery:'4d0de3a625883cf101c46717d70de1ffdc6555ef22c1b9de82017fd318977d42',newReputationDistillery:'3f07a38e405e8f98696246ff7099a5f08b0145ce8519f7e942845b66fbd621b8',newUsualDistillery:'f9b930dfd06c6ad7923b5a2fe7750e6768fbe86e743f3ae0aba605795d06cee2'};
 for(const [ctor,hash] of Object.entries(expected)){let s=fill(D[ctor](42),{progress:65,type:'bourbon'});assert.equal(sha(D.serializeDistillery(s)),hash,ctor);cold(s);}
});

test('legacy archived fixture restores retain exact independently captured pre-change output',()=>{
 const expected={'partners-accepted.json':'4446983eeff1945e59c764c4b28e8e8af0640c45befd656eb4fadbffeb2c2421','partners-due.json':'4d87bb22cea1fbc63a5ae27f8407c29b4b9840eeb9dd2204946faa01c0ed8830','v08-legal-funds.json':'2a2c8f841ca71b6e0d44cf04bead9a1f20ae8bd76ab30db4ca9d73f6c81cfad5','v09-initial.json':'623ce8a27014c4022859bb0449b538eec7103daf58cbdaf7d2cf5cd1407ff435'};
 for(const [name,hash] of Object.entries(expected))assert.equal(sha(D.serializeDistillery(loadFixture(name))),hash,name);
 const text=fs.readFileSync(new URL('../design/reputation/v8-partial-sale.json',import.meta.url),'utf8');assert.equal(D.serializeDistillery(D.restoreDistillery(text)),text.trim());
});

test('new v11 has a recorded model boundary and idempotent activation',()=>{
 const s=D.newAromaDistillery(42);assert.equal(s.version,11);assert.equal(s.rules,'aroma-distillation');assert.deepEqual(D.AROMA_DISTILLATION,{version:11,rules:'aroma-distillation'});assert.deepEqual(s.operations.at(-1),{key:'enable-aroma',value:{progress:null}});assert.equal(D.enableAroma(s),s);cold(s);
});

test('migration records unlogged manual progress, retains old in-flight chemistry, and tags only the next start',()=>{
 for(const position of [0,17,30,45,65,99]){
  const old=steps(D.startDistillation(D.newUsualDistillery(42)),position),raw=D.serializeDistillery(old),next=D.enableAroma(old);preserved(old,next);assert.equal(D.serializeDistillery(old),raw);assert.deepEqual(next.operations.at(-1).value,{progress:position});assert.equal(next.still.distillation.model,undefined);cold(next);
  let before=steps(old,99-position),after=steps(next,99-position);before=D.fillBarrel(D.stopDistillation(before),'bourbon');after=D.fillBarrel(D.stopDistillation(after),'bourbon');assert.deepEqual(after.core,before.core);assert.deepEqual(after.usual,before.usual);cold(after);
  after=D.startDistillation(advance(after,1));assert.equal(after.still.distillation.model,AROMA_MODEL);cold(after);
 }
});

test('legacy filling, tasting and empty ready states migrate without changing the whisky',()=>{
 const filling=D.stopDistillation(steps(D.startDistillation(D.newUsualDistillery(7)),65));let tasting=advance(fill(D.newUsualDistillery(7)),1);tasting=D.sampleDistillery(tasting,tasting.core.casks[0].id);
 for(const old of [D.newUsualDistillery(7),filling,tasting]){const next=D.enableAroma(old);preserved(old,next);cold(next);if(old.still.phase==='filling'){assert.deepEqual(distillationView(next),distillationView(old));const filled=D.fillBarrel(next,'refill');assert.deepEqual(filled.core,D.fillBarrel(old,'refill').core);cold(filled);}}
});

test('old active automatic extraction finishes legacy exactly once; queued recipes start with A',()=>{
 const base=advance(fill(D.newUsualDistillery(891),{progress:80,type:'bourbon'}),1),queued=D.reserveUsual(base),active=steps(D.beginUsual(queued),37);
 let migrated=D.enableAroma(active),legacy=active;preserved(active,migrated);cold(migrated);for(let p=37;p<80;p++){legacy=D.distillStep(legacy);migrated=D.distillStep(migrated);}assert.deepEqual(migrated.core,legacy.core);assert.equal(migrated.usual.reservation,null);cold(migrated);assert.equal(D.distillStep(migrated),migrated);
 const upgraded=D.enableAroma(queued);preserved(queued,upgraded);cold(upgraded);let auto=D.beginUsual(upgraded);assert.equal(auto.still.distillation.model,AROMA_MODEL);auto=steps(auto,80);const manual=fill(D.enableAroma(base),{progress:80,type:'bourbon'});assert.deepEqual(auto.core,manual.core);assert.deepEqual(auto.usual.recipe,{stopAt:80,type:'bourbon'});cold(auto);
});

test('cold/warm replay reconstructs partial A, month boundaries, fillings and automatic completion exactly',()=>{
 let s=advance(fill(D.newAromaDistillery(42),{progress:80,type:'bourbon'}),1);s=D.beginUsual(D.reserveUsual(s));cold(s);s=steps(s,37);cold(s);s=steps(exact(s),23);s=advance(s,1);cold(s);s=steps(exact(s),19);cold(s);s=D.distillStep(s);cold(s);assert.equal(s.usual.reservation,null);assert.equal(s.core.casks.length,2);
 s=advance(s,1);s=steps(D.startDistillation(s),65);cold(s);s=D.stopDistillation(exact(s));cold(s);s=D.fillBarrel(s,'refill');cold(s);
});

test('forged model identifiers, boundaries, chemistry, duplicated activation and automatic completions fail strict replay',()=>{
 const active=steps(D.startDistillation(D.newAromaDistillery(42)),65),done=D.fillBarrel(D.stopDistillation(active),'refill');cold(active);cold(done);
 for(const edit of [x=>delete x.still.distillation.model,x=>x.still.distillation.model='aroma-a/2',x=>x.operations.find(o=>o.key==='enable-aroma').value.progress=30,x=>x.operations.splice(x.operations.findIndex(o=>o.key==='enable-aroma'),1),x=>x.operations.push({key:'enable-aroma',value:{progress:65}}),x=>x.version=10]){const bad=clone(active);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}
 for(const edit of [x=>x.core.casks[0].character+=.01,x=>x.core.rngState++,x=>x.operations.push({key:'complete-usual'}),x=>x.core.totals.costs-=120]){const bad=clone(done);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}cold(done);
 // Low-level progress cannot forge a state at the atomic automatic target.
 let auto=D.beginUsual(D.reserveUsual(advance(done,1)));for(let p=0;p<65;p++)auto=E.distillStep(auto);assert.throws(()=>D.restoreDistillery(JSON.stringify(auto)));
});

test('activation preserves old data when operation capacity is exhausted',()=>{
 const old=D.newUsualDistillery(42);old.operations=Array.from({length:12000},()=>({key:'placeholder'}));const raw=JSON.stringify(old);assert.throws(()=>D.enableAroma(old),/帳面/);assert.equal(JSON.stringify(old),raw);old.operations.pop();const next=D.enableAroma(old);assert.equal(next.operations.length,12000);assert.equal(next.operations.at(-1).key,'enable-aroma');assert.equal(D.enableAroma(next),next);
});


test('direct v3-v5 archives retain their protected origin, raw whisky and partial states through v11 activation',()=>{
 const v3=JSON.parse(fs.readFileSync(new URL('./fixtures/v08-legal-funds.json',import.meta.url),'utf8')),v4=V081.restoreDistillery(JSON.stringify(v3));let partial=V09.startDistillation(V09.newDistillery(42));for(let i=0;i<37;i++)partial=V09.distillStep(partial);
 for(const old of [v3,v4,partial]){const raw=JSON.stringify(old),base=D.restoreDistillery(raw),s=D.enableAroma(base);assert.equal(JSON.stringify(old),raw);assert.deepEqual(s.core,old.core);assert.deepEqual(s.still,old.still);assert.deepEqual(s.origin,base.origin);assert.deepEqual(s.operations.slice(0,base.operations.length),base.operations);cold(s);}
});

test('migrated brands, releases and past whisky continue aging and selling without profile rewrites',()=>{
 const text=fs.readFileSync(new URL('../design/reputation/v8-partial-sale.json',import.meta.url),'utf8');let old=D.enableUsual(D.restoreDistillery(text)),next=D.enableAroma(old);preserved(old,next);
 for(let month=0;month<3;month++){old=advance(old,1);next=advance(next,1);for(const key of ['core','brands','releases','records','notesById','batchesById'])assert.deepEqual(next[key],old[key],key);cold(next);}
});
