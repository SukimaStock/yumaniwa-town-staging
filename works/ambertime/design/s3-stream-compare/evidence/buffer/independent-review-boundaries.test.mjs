// Independent B1 review probes. Deliberately keep findings as normal failures.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {encode,anchor,hash,validateCandidate} from '../../../s3-d1/codec.mjs';
import {compareCandidate as b0} from '../../compare.mjs';
import {compareCandidate as b1} from '../../compare-buffered.mjs';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'amber-b1-review-'));
let serial=0;
const reference=text=>{const p=path.join(temp,`${serial++}.json`);fs.writeFileSync(p,text);return p};
const base=()=>({game:{labConnection:{town:{label:'town',events:[{id:'e1',type:'release',month:1},{id:'e2',type:'arrival',sourceId:'e1',month:2}],attempts:[{sourceId:'e2',month:3}],arrivals:[{id:'e2',type:'arrival',sourceId:'e1',month:2}]}}},userPaused:false,elapsed:0,caskSlots:[],recentLedger:{label:'town'},historyRecord:{},recallRecord:{}});
const deepFreeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))deepFreeze(v);Object.freeze(x)}return x};
const reseal=(c,a)=>{const {integrity,...body}=c;c.integrity=hash(body);a.candidateSha=hash(c)};
function caught(fn){try{fn()}catch(e){return {message:e.message,stage:e.stage,offsetUnits:e.offsetUnits,path:e.path,candidateUnit:e.candidateUnit,referenceUnit:e.referenceUnit}}throw Error('Expected failure');}
function equal(c,a,p,chunkUnits,scope='input'){
 const before=JSON.stringify(c),expected=fs.readFileSync(p,'utf8');
 const r=b1(c,a,{referenceFile:p,chunkUnits,scope});
 assert.equal(r.equal,true);assert.equal(r.units,expected.length);assert.equal(r.bytes,Buffer.byteLength(expected));assert.equal(r.outputSha,hash(expected));assert.equal(r.gameSha,a.gameSha);assert.ok(r.maxChunkUnits<=chunkUnits);assert.equal(JSON.stringify(c),before);return r;
}

for(const [name,attach]of [
 ['direct sidecar town',c=>{c.active.recentLedger=c.active.game.labConnection.town}],
 ['nested sidecar town',c=>{c.active.historyRecord.nested=c.active.game.labConnection.town}],
 ['shared town ancestor',c=>{c.active.recallRecord.copy=c.active.game.labConnection}],
 ['game sibling town',c=>{c.active.game.copy=c.active.game.labConnection.town}],
])test(`accepted alias keeps identical candidate bytes and B0 parity: ${name}`,()=>{
 const x=base();
 if(name==='nested sidecar town')x.historyRecord.nested={label:'town'};
 if(name==='shared town ancestor')x.recallRecord.copy={town:{label:'town'}};
 if(name==='game sibling town')x.game.copy={label:'town'};
 const c=encode(x),a=anchor(x),before=JSON.stringify(c);attach(c);
 assert.equal(JSON.stringify(c),before);assert.equal(hash(c),a.candidateSha);assert.equal(validateCandidate(c,a),true);
 deepFreeze(c);const p=reference(JSON.stringify(x));
 for(const chunkUnits of [1,7,4096,16384]){
  assert.equal(b0(c,a,{referenceFile:p,chunkUnits}).equal,true);
  equal(c,a,p,chunkUnits);
 }
});

for(const capacity of [1,2,7,4096,16384])test(`game boundary hashes across all seven root positions, capacity ${capacity}`,()=>{
 const original=base();original.game.padding='😀é町\\"\ud800';const sides=Object.entries(original).filter(([k])=>k!=='game');
 for(let position=0;position<=sides.length;position++){
  const x=Object.fromEntries([...sides.slice(0,position),['game',original.game],...sides.slice(position)]),c=deepFreeze(encode(x)),a=anchor(x);
  equal(c,a,reference(JSON.stringify(x)),capacity);
  equal(c,a,reference(JSON.stringify(x.game)),capacity,'game');
 }
});

for(const capacity of [4096,16384])for(const delta of [-1,0,1])test(`exact game output length ${capacity} ${delta}`,()=>{
 const x=base();x.game.pad='';const current=JSON.stringify(x.game).length;x.game.pad='x'.repeat(capacity+delta-current-2)+'😀';
 assert.equal(JSON.stringify(x.game).length,capacity+delta);
 const c=deepFreeze(encode(x)),a=anchor(x);equal(c,a,reference(JSON.stringify(x)),capacity);equal(c,a,reference(JSON.stringify(x.game)),capacity,'game');
});

for(const chunkUnits of [1,7,16384])test(`every ASCII content mismatch and truncation offset matches B0, capacity ${chunkUnits}`,()=>{
 const x=base(),c=deepFreeze(encode(x)),original=JSON.stringify(x),a=anchor(x);
 for(let offset=0;offset<original.length;offset++){
  const changed=original.slice(0,offset)+'~'+original.slice(offset+1),p=reference(changed),changedAnchor={...a,inputSha:hash(changed)},options={referenceFile:p,chunkUnits};
  const failure=caught(()=>b1(c,changedAnchor,options));
  assert.equal(failure.offsetUnits,offset);assert.equal(failure.stage,'content');assert.deepEqual(failure,caught(()=>b0(c,changedAnchor,options)));
  const truncated=original.slice(0,offset),q=reference(truncated),truncatedAnchor={...a,inputSha:hash(truncated)},truncatedOptions={referenceFile:q,chunkUnits};
  const eof=caught(()=>b1(c,truncatedAnchor,truncatedOptions));
  assert.equal(eof.offsetUnits,offset);assert.equal(eof.message,'reference ended before candidate');assert.deepEqual(eof,caught(()=>b0(c,truncatedAnchor,truncatedOptions)));
 }
});

test('during-read raw hash rejects bytes changed to identical decoded Unicode',()=>{
 const x=base();x.recallRecord.text='�';const c=deepFreeze(encode(x)),a=anchor(x),text=JSON.stringify(x),raw=Buffer.from(text),index=raw.indexOf(Buffer.from('�')),changed=Buffer.concat([raw.subarray(0,index),Buffer.from([0xff]),raw.subarray(index+3)]);
 const p=reference(raw),nativeOpen=fs.openSync;let opened=0;
 fs.openSync=function(name,...args){if(name===p&&args[0]==='r'&&++opened===2)fs.writeFileSync(p,changed);return nativeOpen(name,...args)};
 try{assert.throws(()=>b1(c,a,{referenceFile:p,chunkUnits:7}),e=>e.stage==='independent-reference'&&e.message==='reference changed during comparison')}finally{fs.openSync=nativeOpen}
 assert.equal(opened,2);
});

test('EOF verification reads beyond an exact 64KiB reference block',()=>{
 const x=base();x.recallRecord.pad='';const remaining=65536-Buffer.byteLength(JSON.stringify(x));x.recallRecord.pad='x'.repeat(remaining);
 const text=JSON.stringify(x);assert.equal(Buffer.byteLength(text),65536);
 const c=deepFreeze(encode(x)),a=anchor(x);const r=equal(c,a,reference(text),16384);assert.equal(r.readCalls,2);
 const extra=text+' ',adjusted={...a,inputSha:hash(extra)};
 assert.throws(()=>b1(c,adjusted,{referenceFile:reference(extra),chunkUnits:16384}),e=>e.message==='reference has trailing content'&&e.offsetUnits===text.length&&e.path==='$<EOF>');
});

test('comparison hash feeds stay bounded independent of scalar size and Unicode byte width',()=>{
 const x=base();x.recallRecord.text=('😀町\ud800\\"\n').repeat(10000);const c=deepFreeze(encode(x)),a=anchor(x),p=reference(JSON.stringify(x));
 const prototype=Object.getPrototypeOf(createHash('sha256')),native=prototype.update;let max=0,calls=0;
 prototype.update=function(data,...args){
  const stack=new Error().stack;
  if(typeof data==='string'&&stack.includes('compare-buffered.mjs')&&stack.includes('Object.update')){max=Math.max(max,data.length);calls++;}
  return native.call(this,data,...args);
 };
 try{const result=equal(c,a,p,4096);assert.ok(calls>0);assert.ok(max<=4097,`actual text hash input ${max}`);assert.ok(result.chunks<result.pieces);assert.equal(result.schemaCacheEntries,2);assert.equal(result.diagnosticSpanEntries,0)}finally{prototype.update=native}
});

test('alternating row layouts and integer-index keys preserve all values and arrivals',()=>{
 const x=base(),town=x.game.labConnection.town;town.events=[];town.attempts=[];
 for(let i=0;i<200;i++){
  const entries=i%2?[['tail',null],['2',i],['0',-i],['id',`e${i+1}`],['type','arrival'],['month',i],['sourceId',i?`e${i}`:null]]:[['id',`e${i+1}`],['type','arrival'],['sourceId',i?`e${i}`:null],['month',i],['2',i],['0',-i],['tail',null]];
  // Do not produce -0, which the unchanged codec properly rejects.
  const row=Object.fromEntries(entries);row['0']=i?-i:0;town.events.push(row);
  town.attempts.push(i%2?{marker:'a',sourceId:`e${i+1}`,month:i}:{sourceId:`e${i+1}`,month:i,marker:'a'});
 }
 town.arrivals=town.events.slice();const c=deepFreeze(encode(x)),a=anchor(x);
 for(const cap of [1,4096,16384])equal(c,a,reference(JSON.stringify(x)),cap);
});

for(const [name,mutate]of [
 ['negative zero',c=>{c.active.elapsed=-0}],['NaN',c=>{c.active.elapsed=NaN}],['Infinity',c=>{c.active.elapsed=Infinity}],
 ['sparse array',c=>{c.active.caskSlots.length=1}],['array extra key',c=>{c.active.caskSlots.extra=true}],
 ['accessor',c=>Object.defineProperty(c.active,'elapsed',{enumerable:true,get(){return 0}})],
 ['symbol',c=>{c.active[Symbol('x')]=1}],['function',c=>{c.active.elapsed=()=>0}],
])test(`unchanged strict JSON-domain rejection before reference read: ${name}`,()=>{
 const x=base(),c=encode(x),a=anchor(x);mutate(c);
 assert.throws(()=>b1(c,a,{referenceFile:path.join(temp,'nonexistent')}),e=>e.stage==='structure'&&e.code!=='ENOENT');
});

test('independent anchors, immutable arrays and logical content survive a fresh round-trip',()=>{
 const x=base(),original=JSON.stringify(x),c=JSON.parse(JSON.stringify(encode(x))),a=anchor(x),bytes=JSON.stringify(c);deepFreeze(c);
 const r=equal(c,a,reference(original),4096);assert.equal(r.outputSha,a.inputSha);assert.equal(hash(c),a.candidateSha);assert.equal(JSON.stringify(c),bytes);assert.equal(r.includesSidecars,true);assert.equal(r.provenance,false);
});

test.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
