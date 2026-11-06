import {compareBoundary} from './selection.mjs';
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

test('actual C scene links and illustration survive frozen playback with source facts',()=>{
  for(const policy of ['local','wide','mixed']) {
    const input=withRecallSnapshots(long.records[policy],long.recalls[policy]);
    const actual=input.recallSnapshots.map(s=>{
      const result=compareBoundary(input,s.handoverId);
      return {...result,scenes:result.modes.C.scenes};
    });
    const frozen=buildStorage(input,actual).method3.completed;
    assert.ok(actual.some(e=>e.scenes.some(s=>s.links.length>0)));
    for(let i=0;i<actual.length;i++)for(let j=0;j<actual[i].scenes.length;j++) {
      const before=actual[i].scenes[j],after=frozen[i].scenes[j];
      assert.deepEqual(after.links,before.links);
      assert.deepEqual(after.illustration,before.illustration);
      assert.equal(after.sentence,before.sentence);
      for(const link of after.links) {
        const fact=after.sourceFacts.find(f=>f.id===link.sourceId);
        assert.ok(fact);
        assert.equal(fact.month,link.sourceMonth);
        assert.equal(fact.generationId,link.sourceGeneration);
      }
    }
  }
});

test('frozen link rejects absent source and invented causal annotation',()=>{
  const result=compareBoundary(record,record.recallSnapshots[1].handoverId);
  const actual={...result,scenes:result.modes.C.scenes};
  const linked=actual.scenes.find(s=>s.links.some(l=>!l.causal));
  assert.ok(linked);
  const missing=structuredClone(actual);
  missing.scenes.find(s=>s.eventId===linked.eventId).links[0].sourceId='absent';
  assert.throws(()=>buildStorage(record,[missing]),/link source/);
  const invented=structuredClone(actual);
  const link=invented.scenes.find(s=>s.eventId===linked.eventId).links.find(l=>!l.causal);
  link.causal=true;
  assert.throws(()=>buildStorage(record,[invented]),/causal evidence mismatch/);
});

test('all active and anchor causal witnesses retain source bodies at 100 years',()=>{
  for(const policy of ['local','wide','mixed']) {
    const input=withRecallSnapshots(long.records[policy],long.recalls[policy]);
    const actual=input.recallSnapshots.map(s=>{
      const result=compareBoundary(input,s.handoverId);
      return {...result,scenes:result.modes.C.scenes};
    });
    const saved=buildStorage(input,actual).method3;
    const retained=new Map([...saved.active,...saved.anchorFacts,...saved.witnessFacts].map(f=>[f.id,f]));
    assert.equal(new Set(saved.witnessFacts.map(f=>f.id)).size,saved.witnessFacts.length);
    for(const witness of saved.witnesses) {
      const source=retained.get(witness.from),target=retained.get(witness.to);
      assert.ok(source,witness.from);assert.ok(target,witness.to);
      const canonical=input.events.find(e=>e.id===source.id);
      assert.deepEqual(source,smallFact(canonical));
      assert.deepEqual([source.month,source.operationIndex,source.position],witness.sourcePosition);
      assert.equal(source.generationId,canonical.generationId);
      assert.deepEqual(source.scene,canonical.scene);
      assert.deepEqual(causalWitness(target,[source]),witness);
    }
    for(const id of policy==='wide'?['arrival:e4721','arrival:e4808']:policy==='mixed'?['arrival:e3904']:[]) {
      assert.ok(saved.witnessFacts.some(f=>f.id===id),id);
    }
  }
});

test('same-ID altered release or source chain cannot replace frozen evidence',()=>{
  const result=compareBoundary(record,snapshot.handoverId);
  const actual={...result,scenes:result.modes.C.scenes};
  const alteredRelease=structuredClone(actual);
  alteredRelease.scenes[0].event.ids.releaseId='invented';
  assert.throws(()=>buildStorage(record,[alteredRelease]),/semantic fact differs/);
  const alteredChain=structuredClone(actual);
  alteredChain.scenes[0].event.evidence.sourceChain=['invented'];
  assert.throws(()=>buildStorage(record,[alteredChain]),/semantic fact differs/);
});
test('unbottled inherited cask origin survives completed-generation candidate pruning',()=>{
  const fill={id:'fill:stable-cask',kind:'fill',month:10,operationIndex:10,ordinal:0,generationId:1,
    ids:{caskId:41,batchId:9},label:'樽に詰めた。',scene:{kind:'production',entity:{id:41,name:'貯蔵庫'}},
    evidence:{record:'core.casks',sourceId:'41'}};
  const handover={id:'handover:1',kind:'handover',month:20,operationIndex:20,ordinal:0,generationId:1,
    ids:{fromGeneration:1,toGeneration:2},label:'引き継いだ。',scene:{kind:'distillery'},
    evidence:{record:'generations.completed',sourceId:'1'}};
  const input={seed:1,elapsedMonths:30,sourceSha256:'synthetic',events:[fill,handover],
    recallSnapshots:[{handoverId:handover.id,cutoff:{month:20,operationIndex:20,replayOrdinal:0},
      seedGeneration:2,eventIds:[fill.id,handover.id],ordinalOverrides:{}}]};
  const saved=buildStorage(input,[{handoverId:handover.id,scenes:[{event:handover}]}]).method3;
  assert.equal(saved.active.length,0);
  assert.equal(saved.origins.length,0);
  assert.deepEqual(saved.pendingOrigins,[smallFact(fill)]);
});

test('delivery anchors retain separate releases within the same shop and brand',()=>{
  const deliveries=[1,2,3].map((releaseId,index)=>({id:'delivery:'+releaseId,kind:'delivery',month:index+1,
    operationIndex:index+1,ordinal:0,generationId:1,ids:{shopId:'shop',brandId:1,releaseId},
    label:'届いた。',scene:{kind:'shop'},evidence:{record:'deliveries',sourceId:String(releaseId)}}));
  const input={seed:1,elapsedMonths:3,sourceSha256:'synthetic',events:deliveries,recallSnapshots:[]};
  const saved=buildStorage(input).method3;
  const combined=saved.anchors.filter(a=>a.subject.startsWith('shop-brand-release:'));
  assert.equal(combined.length,3);
  assert.deepEqual(combined.map(a=>a.firstId),deliveries.map(e=>e.id));
});
