import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareRecallArchive,readRecallArchive} from './research-h25.mjs';
import {buildHistoricalChronicle} from './recall-boundary.mjs';

test('prepared archive shares facts and reproduces the strict edition without raw facts or game replay',()=>{
  const fact = (id,kind,month,generationId,extra={})=>({
    id,kind,month,generationId,operationIndex:month,ordinal:0,label:id,
    ids:{},evidence:{record:'synthetic',sourceId:id},...extra,
  });
  const raw = {id:'synthetic',seed:42,factStage:'uncompressed',elapsedMonths:1000,lastOperationIndex:1000,events:[
    fact('first','bottling',6,1),
    ...[1,2,3].map(generation=>fact('handover:'+generation,'handover',300*generation,generation,
      {ids:{fromGeneration:generation,toGeneration:generation+1}})),
  ]};
  const archive = JSON.parse(JSON.stringify(prepareRecallArchive(raw)));
  assert.equal(archive.events.length,4);
  assert.equal(archive.metadata.factStage,'candidates');
  for(const id of [null,'handover:1','handover:2','handover:3']){
    const {result} = readRecallArchive(archive,id);
    const expected = buildHistoricalChronicle(raw,id?'handover':'anniversary',id?{handoverId:id}:{});
    assert.deepEqual(result.frames,expected.frames);
    assert.deepEqual(result.audit,expected.audit);
  }
  assert.throws(()=>readRecallArchive(archive,'missing'));
  const broken = structuredClone(archive);
  broken.events.pop();
  assert.throws(()=>readRecallArchive(broken));
  const duplicate = structuredClone(archive);
  duplicate.snapshots[0].eventIds.push(duplicate.snapshots[0].eventIds[0]);
  assert.throws(()=>readRecallArchive(duplicate));
});
