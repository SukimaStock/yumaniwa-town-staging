import assert from 'node:assert/strict';
import test from 'node:test';
import {buildHistoricalChronicle,prepareHistoricalCandidates} from './recall-boundary.mjs';

const event = (id,kind,month,generationId,extra={}) => ({
  id,kind,month,generationId,operationIndex:month,ordinal:0,
  label:id,ids:{},evidence:{record:'synthetic boundary test',sourceId:id},...extra,
});
const arrival = (id,month,generationId,extra={}) => event(id,'arrival',month,generationId,{
  scene:{kind:'reputation',entity:{id:'overseas-food',name:'海外の飲食文化圏'}},
  ids:{regionId:'overseas-food',townEventId:id,townReleaseId:'release-1',channel:'rumor'},
  evidence:{record:'synthetic town events',sourceId:id,sourceChain:[id]},...extra,
});
const inquiry = (id,month,generationId,chain,extra={}) => event(id,'inquiry',month,generationId,{
  scene:{kind:'reputation',entity:{id:'overseas-food',name:'海外の飲食文化圏'}},
  ids:{regionId:'overseas-food',townEventId:id,townReleaseId:'release-1'},
  evidence:{record:'synthetic town events',sourceId:id,sourceChain:chain},...extra,
});
const handover = generation => event('handover:'+generation,'handover',300*generation,generation,{
  ordinal:2,operationKey:'generation-handover',ids:{fromGeneration:generation,toGeneration:generation+1},
});
const career = events => ({factStage:'uncompressed',seed:42,id:'synthetic',elapsedMonths:1200,lastOperationIndex:1200,events});
const first = event('bottling:first','bottling',6,1);
const ids = record => record.events.map(event=>event.id);

const sourceEvents = [first,arrival('arrival:first',10,1),
  ...[1,2,3].flatMap(generation=>[
    event('before:'+generation,'reaction',300*generation,generation,{ordinal:1}),
    handover(generation),
    event('after:'+generation,'reaction',300*generation,generation+1,{ordinal:3}),
    event('bottling:'+generation,'bottling',300*generation+1,generation+1),
  ])];

test('all three handovers use one identity, seed and result for default, ID and legacy selectors',()=>{
  const record = career(sourceEvents);
  const original = structuredClone(record);
  for (const generation of [1,2,3]) {
    const byId = buildHistoricalChronicle(record,'handover',{handoverId:'handover:'+generation});
    const alias = buildHistoricalChronicle(record,'handover',{targetGeneration:generation});
    assert.deepEqual(byId,alias);
    if (generation===1) assert.deepEqual(byId,buildHistoricalChronicle(record,'handover'));
    assert.equal(byId.seedGeneration,generation+1);
    assert.equal(byId.audit.targetGeneration,generation+1);
    assert.equal(byId.frames.at(-1).id,'handover:'+generation);
    assert.deepEqual(byId.audit.requiredIds,['bottling:first',...Array.from({length:generation},(_,i)=>'handover:'+(i+1))]);
    const prepared = prepareHistoricalCandidates(record,'handover',{handoverId:'handover:'+generation});
    assert.ok(ids(prepared.record).includes('before:'+generation));
    assert.ok(!ids(prepared.record).includes('after:'+generation));
    const snapshot = career(sourceEvents.filter(event=>event.operationIndex<300*generation ||
      event.operationIndex===300*generation && event.ordinal<=2));
    snapshot.elapsedMonths = 300*generation;
    snapshot.lastOperationIndex = 300*generation;
    assert.deepEqual(prepareHistoricalCandidates(snapshot,'handover',{targetGeneration:generation}).record.events,prepared.record.events);
    assert.deepEqual(buildHistoricalChronicle(snapshot,'handover',{targetGeneration:generation}),byId);
  }
  assert.deepEqual(record,original);
  assert.throws(()=>buildHistoricalChronicle(record,'handover',{handoverId:'missing'}),/世代交代/);
  assert.throws(()=>buildHistoricalChronicle(record,'handover',{targetGeneration:4}),/世代交代/);
  assert.throws(()=>buildHistoricalChronicle(record,'handover',{handoverId:'handover:2',targetGeneration:1}),/世代交代/);
});

test('future inquiry and visit references never retain an older repeated arrival',()=>{
  const record = career([first,arrival('arrival:first',10,1),arrival('arrival:later',290,1),
    handover(1),inquiry('inquiry:future',310,2,['arrival:later','inquiry:future'])]);
  const before = prepareHistoricalCandidates(record,'handover');
  assert.deepEqual(ids(before.record),['bottling:first','arrival:first','handover:1']);
  const noFuture = {...record,events:record.events.filter(event=>event.month<=300),elapsedMonths:300,lastOperationIndex:300};
  assert.deepEqual(buildHistoricalChronicle(record,'handover'),buildHistoricalChronicle(noFuture,'handover'));
  const withEarlierReference = {...record,events:[...record.events,inquiry('inquiry:earlier',295,1,['arrival:later','inquiry:earlier'])]};
  const prepared = prepareHistoricalCandidates(withEarlierReference,'handover');
  assert.ok(ids(prepared.record).includes('arrival:later'));
  assert.ok(ids(prepared.record).includes('inquiry:earlier'));
  assert.deepEqual(prepared.record.events.find(event=>event.id==='inquiry:earlier').evidence,
    withEarlierReference.events.at(-1).evidence);
});

test('reputation firsts recur by generation and known missing or invalid references add no invented source',()=>{
  const record = career([first,arrival('arrival:first',10,1),handover(1),
    arrival('arrival:next',330,2),arrival('arrival:repeat',340,2),
    inquiry('inquiry:missing',350,2,['not-present']),
    inquiry('inquiry:bad-order',360,2,['arrival:future']),arrival('arrival:future',370,2),
    handover(2)]);
  const result = prepareHistoricalCandidates(record,'handover',{handoverId:'handover:2'});
  assert.ok(ids(result.record).includes('arrival:next'));
  assert.ok(!ids(result.record).includes('arrival:repeat'));
  assert.ok(!ids(result.record).includes('not-present'));
  assert.ok(!ids(result.record).includes('arrival:future'));
  assert.ok(result.issues.some(row=>row.id==='inquiry:bad-order'));
  const malformed = inquiry('inquiry:malformed',400,2,[]);
  delete malformed.evidence.sourceChain;
  const safe = prepareHistoricalCandidates({...record,events:[...record.events,malformed]},'handover',{handoverId:'handover:2'});
  assert.ok(safe.issues.some(row=>row.id==='inquiry:malformed'));
});

test('duplicate records are audited, conflicting facts fail, and raw source objects are preserved',()=>{
  const record = career([first,handover(1),structuredClone(first),{id:'invalid'}]);
  const result = prepareHistoricalCandidates(record,'handover');
  assert.equal(new Set(ids(result.record)).size,result.record.events.length);
  assert.equal(result.record.factStage,'candidates');
  assert.throws(()=>prepareHistoricalCandidates(result.record,'handover'),/事実資料/);
  assert.ok(result.issues.some(row=>row.reason==='同じ事実の重複'));
  assert.ok(result.issues.some(row=>row.id==='invalid'));
  assert.throws(()=>prepareHistoricalCandidates(career([first,{...first,month:7},handover(1)]),'handover'),/異なる事実/);
  assert.throws(()=>prepareHistoricalCandidates({...record,seed:undefined},'handover'),/seed/);
  assert.throws(()=>prepareHistoricalCandidates({...record,factStage:'retained'},'handover'),/事実資料/);
});
