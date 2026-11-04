import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildEdition,editionVersion,eventDefinitions} from './edition-d.mjs';

const records = JSON.parse(readFileSync(new URL('./facts.json',import.meta.url),'utf8'));
const ids = result => result.frames.map(frame => frame.id);
const anniversary = record => ({month:record.elapsedMonths,operationIndex:null});
const fixture = (kind,id,month,extra={}) => ({
  kind,id,month,operationIndex:month,ordinal:0,label:id,
  generationId:1,ids:{},evidence:{record:'fixture',sourceId:id},...extra,
});
const history = (...events) => ({id:'test',seed:42,lastOperationIndex:400,elapsedMonths:400,events});

test('real records keep first bottling and every observed handover, without later events at the boundary',() => {
  for (const record of Object.values(records)) {
    const handover = record.events.find(event => event.kind === 'handover');
    const firstBottling = record.events.find(event => event.kind === 'bottling');
    const before = buildEdition(record,handover);
    const after = buildEdition(record,anniversary(record));
    assert.equal(before.frames.at(-1).id,handover.id);
    for (const edition of [before,after]) {
      assert.deepEqual(edition.audit.requiredIds,[firstBottling.id,handover.id]);
      assert.ok(ids(edition).includes(firstBottling.id));
      assert.deepEqual(ids(edition),record.events.filter(event => ids(edition).includes(event.id)).map(event => event.id));
      assert.ok(['production','trade','reputation','generation','daily'].every(family => edition.audit.familyCounts[family]>0));
      assert.ok(edition.audit.periodCounts[0]);
      assert.ok(Object.keys(edition.audit.periodCounts).some(month => month >= 240));
    }
    assert.ok(before.frames.every(frame => frame.events[0].operationIndex <= handover.operationIndex));
    assert.ok(after.audit.rounds.every(round => round.score > 0 && round.draw >= 0 && round.draw < 1));
  }
  const local = buildEdition(records.local,anniversary(records.local));
  assert.equal(local.frames.find(frame => frame.id === 'delivery:73').returnOf,'delivery:1');
  assert.equal(local.frames.find(frame => frame.id === 'inquiry:e1164').returnOf,'arrival:e1114');
});

test('same-operation cutoff keeps earlier ordinals, and later facts do not affect scoring or draw',() => {
  const first = fixture('bottling','first',1);
  const firstHandover = fixture('handover','generation-1',10,{ids:{toGeneration:2}});
  const before = fixture('reaction','before',20,{ordinal:1});
  const handover = fixture('handover','generation-2',20,{ordinal:2,ids:{toGeneration:3}});
  const after = fixture('delivery','later',20,{ordinal:3});
  const more = fixture('sale','more',21);
  const record = history(first,firstHandover,before,handover);
  const original = buildEdition(record,handover);
  const extended = buildEdition(history(...record.events,after,more),handover);
  assert.deepEqual(original.frames,extended.frames);
  assert.deepEqual(original.audit,extended.audit);
  assert.deepEqual(extended.audit.requiredIds,['first','generation-1','generation-2']);
  assert.equal(extended.frames.at(-1).id,handover.id);
  assert.ok(extended.omitted.some(row => row.id==='later' && row.reason==='回想時点より後'));
});

test('edition is repeatable and independent of game RNG, and target generation changes the draw',() => {
  const record = structuredClone(records.wide);
  const original = structuredClone(record);
  const cutoff = anniversary(record);
  const first = buildEdition(record,cutoff,{targetGeneration:2});
  const second = buildEdition(record,cutoff,{targetGeneration:3});
  assert.equal(first.audit.version,editionVersion);
  assert.equal(first.audit.operationIndex,record.lastOperationIndex);
  assert.notEqual(first.audit.seed,second.audit.seed);
  assert.notDeepEqual(ids(first),ids(second));
  assert.deepEqual(first,buildEdition(record,cutoff,{targetGeneration:2}));
  assert.deepEqual(record,original);
});

test('missing first bottling evidence and unknown kinds are audited instead of invented',() => {
  const record = history(
    fixture('bottling','unknown-first',1,{evidence:null}),
    fixture('bottling','known-later',4),
    fixture('mystery','unknown-kind',5),
  );
  const result = buildEdition(record,anniversary(record));
  assert.deepEqual(result.audit.requiredIds,[]);
  assert.equal(result.omitted.find(row => row.id==='unknown-first').reason,'表示または根拠の記録不足');
  assert.equal(result.omitted.find(row => row.id==='unknown-kind').reason,'未登録の出来事');
});

test('registered shop changes, mail and festivals use definitions and shared identities',() => {
  const definitions = {
    ...eventDefinitions,
    'shop-owner-change':{family:'trade',weight:9,subject:'shopId',stateChange:true,returns:true},
    'shop-closure':{family:'trade',weight:9,subject:'shopId',stateChange:true,returns:true},
    'overseas-mail':{family:'correspondence',weight:9,subject:'regionId',stateChange:true},
    festival:{family:'town',weight:8,subject:'townId',first:true},
  };
  const record = history(
    fixture('shop-start','start',1,{ids:{shopId:'old-shop'}}),
    fixture('shop-owner-change','owner',72,{ids:{shopId:'old-shop'},generationId:2}),
    fixture('overseas-mail','mail',120,{ids:{regionId:'abroad'}}),
    fixture('festival','festival',180,{ids:{townId:'town'}}),
    fixture('shop-closure','closure',240,{ids:{shopId:'old-shop'},generationId:2}),
  );
  assert.deepEqual(ids(buildEdition(record,anniversary(record))),['start']);
  const result = buildEdition(record,anniversary(record),{definitions});
  assert.deepEqual(ids(result),['start','owner','mail','festival','closure']);
  assert.equal(result.frames.find(frame => frame.id==='owner').returnOf,'start');
  assert.equal(result.frames.find(frame => frame.id==='closure').returnOf,'start');
  assert.ok(result.audit.selected.find(row => row.id==='owner').features.stateChange);
});

test('positive marginal value, rather than a fixed scene quota, sets length',() => {
  const empty = history();
  const dense = history(...Array.from({length:400},(_,i) => fixture('sale','sale-'+i,i)));
  const meaningful = history(...Array.from({length:40},(_,i) =>
    fixture('handover','generation-'+i,i,{ids:{toGeneration:i+2}})));
  assert.equal(buildEdition(empty,anniversary(empty)).frames.length,0);
  assert.ok(buildEdition(dense,anniversary(dense)).frames.length<40);
  assert.equal(buildEdition(meaningful,anniversary(meaningful)).frames.length,40);
});


test('D1.1 keeps the earliest and successor shop deliveries without stacking similar ones',() => {
  const record=records.local;
  const result=buildEdition(record,anniversary(record));
  const deliveries=result.frames.map(frame=>frame.events[0]).filter(event=>event.kind==='delivery' &&
    event.ids.shopId==='town-liquor');
  assert.ok(deliveries.some(event=>event.month===23));
  assert.ok(deliveries.some(event=>event.month===356));
  assert.ok(deliveries.filter(event=>event.generationId===1 && event.ids.brandId===1).length<=2);
  assert.equal(result.frames.find(frame=>frame.id==='delivery:73').returnOf,'delivery:1');
  assert.ok(result.audit.selected.some(row=>row.components?.sameStory<0));
  assert.deepEqual(result,buildEdition(record,anniversary(record)));
});
