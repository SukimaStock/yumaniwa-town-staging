import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {withRecallSnapshots} from '../chronicle-lab/recall-snapshots.mjs';
import {buildStorage,causalWitness,smallFact,encodeEnvelope,decodeEnvelope,transact,compareStorage} from './storage.mjs';
const long=JSON.parse(readFileSync(new URL('../chronicle-lab/facts-recalls-long.json',import.meta.url)));
const record=withRecallSnapshots(long.records.local,long.recalls.local);
const snapshot=record.recallSnapshots[0];
const event=record.events.find(e=>snapshot.eventIds.includes(e.id) && e.kind==='delivery');
const editions=[{handoverId:snapshot.handoverId,scenes:[{event,sentence:'保存済みの一文。'}],seed:1951059788}];

test('all three representations round trip without mutating published sources',()=>{
  const before=JSON.stringify(record),result=buildStorage(record,editions);
  assert.equal(JSON.stringify(record),before);
  for(const data of Object.values(result))assert.deepEqual(JSON.parse(JSON.stringify(data)),data);
  assert.equal(result.method3.completed[0].scenes[0].sentence,'保存済みの一文。');
  assert.equal(result.method3.completed[0].seed,1951059788);
  assert.equal(result.method3.active.some(e=>e.id===event.id),false);
});

test('frozen scenes are unchanged by later candidate additions',()=>{
  const original=buildStorage(record,editions).method3.completed;
  const future={...record.events.at(-1),id:'future',month:1300,operationIndex:9999};
  const after=buildStorage({...record,events:[...record.events,future]},editions).method3.completed;
  assert.deepEqual(after,original);
});

test('unknown or future scene cannot enter frozen recall',()=>{
  const future=record.events.find(e=>!snapshot.eventIds.includes(e.id));
  assert.throws(()=>buildStorage(record,[{handoverId:snapshot.handoverId,scenes:[{event:future}]}]),/boundary/);
  assert.throws(()=>buildStorage(record,[{handoverId:'missing',scenes:[]}]),/Unknown/);
});

test('only an earlier arrival of the same release in the recorded chain is causal',()=>{
  const source={id:'arrival:a',kind:'arrival',month:1,operationIndex:1,ordinal:0,ids:{townEventId:'a',townReleaseId:2,regionId:'north'}};
  const target={id:'visit:b',kind:'visit',month:2,operationIndex:2,ordinal:0,ids:{townReleaseId:2,regionId:'north'},evidence:{sourceChain:['a','b']}};
  assert.equal(causalWitness(target,[source]).from,'arrival:a');
  assert.equal(causalWitness({...target,evidence:{sourceChain:['other']}},[source]),null);
  assert.equal(causalWitness({...target,ids:{townReleaseId:3}},[source]),null);
  assert.equal(causalWitness(target,[{...source,month:3}]),null);
  assert.equal(causalWitness({...target,month:1,operationIndex:1,ordinal:0},[{...source,ordinal:1}]),null);
});

test('same brand does not merge separate releases and cask origin remains stable',()=>{
  const result=buildStorage(record,editions).method3;
  const first=result.origins.find(e=>e.releaseId===1),second=result.origins.find(e=>e.releaseId===2);
  assert.equal(first.brandId,second.brandId);
  assert.notEqual(first.caskId,second.caskId);
  assert.notEqual(first.productId,second.productId);
  assert.equal(first.origin.eventId,'fill:2');
  const original=record.events.find(e=>e.id==='bottling:1');
  assert.deepEqual(smallFact(original).ids,original.ids);
});

test('failure keeps previous generation and recall together; successful retry commits both',()=>{
  const old=encodeEnvelope({generation:1},{completed:[]});
  const failed=transact(old,{generation:2},{completed:['one']},()=>{throw new Error('quota');});
  assert.equal(failed.committed,false);
  assert.equal(failed.text,old);
  assert.equal(failed.value.game.generation,1);
  assert.deepEqual(failed.value.recall.completed,[]);
  let persisted;
  const success=transact(old,{generation:2},{completed:['one']},text=>{persisted=text;});
  assert.equal(success.committed,true);
  assert.deepEqual(decodeEnvelope(persisted),{game:{generation:2},recall:{completed:['one']}});
});

test('corrupt envelope is rejected, with known-good prior envelope still readable',()=>{
  const old=encodeEnvelope({generation:1},{completed:[]});
  assert.throws(()=>decodeEnvelope(old.replace('generation":1','generation":2')),/Invalid/);
  assert.throws(()=>decodeEnvelope(old.slice(0,-10)));
  assert.equal(decodeEnvelope(old).game.generation,1);
});

test('measurements count UTF-8 bytes and identify retained-input limitation',()=>{
  const measured=compareStorage(record,editions);
  assert.equal(measured.methods.length,3);
  assert.ok(measured.methods.every(x=>x.bytes>0 && x.serializeMedianMs>=0 && x.parseMedianMs>=0));
  assert.ok(measured.limitations[0].includes('retained C-3'));
});
