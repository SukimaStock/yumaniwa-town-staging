import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildChronicle} from './editor.mjs';

const fact = (kind,month,operationIndex,ids={},ordinal=0,generationId=1) => ({
  kind,month,operationIndex,ordinal,ids,generationId,id:`${kind}-${operationIndex}-${ordinal}`,
});
const liquor = {shopId:'town-liquor'};
const numbers = frames => frames.flatMap(frame => frame.events.map(event => event.month));
const eventIds = frames => frames.flatMap(frame => frame.events.map(event => event.id));

test('cutoff follows operation and ordinal, keeping 16-month rumor before 17-month trade', () => {
  const record = {elapsedMonths:360,events:[
    fact('delivery',356,493,liquor,0,2),
    fact('delivery',23,90,liquor),
    fact('shop-start',17,76,liquor),
    fact('handover',321,481,{toGeneration:2},2),
    fact('delivery',321,482,liquor,0,2),
    fact('arrival',16,75),
    fact('bottling',321,481,{brandId:1},1),
    fact('delivery',321,481,liquor,3,2),
  ]};
  for (const mode of ['a','b','c']) {
    const handover = buildChronicle(record,'handover',mode);
    assert.deepEqual(numbers(handover.frames),[16,17,23,321,321]);
    assert.deepEqual(eventIds(handover.frames).slice(-2),['bottling-481-1','handover-481-2']);
    const thirty = buildChronicle(record,'anniversary',mode);
    assert.deepEqual(numbers(thirty.frames),[16,17,23,321,321,321,321,356]);
    assert.equal(thirty.frames.at(-1).events.at(-1).generationId,2);
  }
});

test('B groups routine facts without crossing a milestone or moving facts', () => {
  const events = [
    fact('delivery',1,1,liquor),fact('delivery',2,2,liquor),
    fact('delivery',3,3,liquor),fact('arrival',4,4),
    fact('delivery',5,5,liquor),fact('delivery',29,6,liquor),
  ];
  const record = {elapsedMonths:30,events};
  const {frames} = buildChronicle(record,'anniversary','b');
  assert.deepEqual(frames.map(frame=>frame.type),['scene','passage','scene','passage','passage']);
  assert.deepEqual(frames[1].events,events.slice(1,3));
  assert.deepEqual(eventIds(frames),events.map(event=>event.id));
});

test('a passage crossing subjects uses a neutral visual with unchanged evidence', () => {
  const shop = {...fact('delivery',1,1,liquor),scene:{kind:'shop',entity:{id:liquor.shopId}}};
  const production = {...fact('bottling',1,2,{brandId:1}),scene:{kind:'production',entity:{id:'bottling'}}};
  const record = {elapsedMonths:60,events:[shop,production,{...shop,id:'later-shop',month:3},
    {...production,id:'later-bottle',month:4}]};
  const {frames} = buildChronicle(record,'anniversary','b');
  assert.deepEqual(frames.at(-1).scene,{kind:'distillery',entity:{name:'蒸留所'}});
  assert.deepEqual(eventIds(frames),record.events.map(event=>event.id));
});

test('C singles out same-store returns after unrelated events, not every repeat', () => {
  const events = [
    fact('shop-start',17,76,liquor),fact('delivery',23,90,liquor),
    fact('delivery',61,112,liquor),fact('arrival',76,140),
    fact('delivery',85,163,liquor),fact('delivery',86,164,liquor),
    fact('handover',321,481,{toGeneration:2}),fact('delivery',356,493,liquor,0,2),
  ];
  const record = {elapsedMonths:360,events};
  const {frames} = buildChronicle(record,'anniversary','c');
  const returns = frames.filter(frame=>frame.returnOf);
  assert.deepEqual(numbers(returns),[85,356]);
  assert.ok(returns.every(frame=>frame.events[0].ids.shopId === liquor.shopId));
  assert.deepEqual(returns.map(frame=>frame.returnOf),[events[1].id,events[4].id]);
  assert.deepEqual(eventIds(frames),events.map(event=>event.id));
});

test('A/B/C retain a variable number of facts with deterministic output and no mutation', () => {
  const events = Array.from({length:38},(_,i)=>fact('delivery',i,i,liquor));
  events.push(events[10],fact('placement',15,99,liquor));
  const record = {elapsedMonths:60,events};
  const original = JSON.stringify(record);
  for (const mode of ['a','b','c']) {
    const result = buildChronicle(record,'anniversary',mode);
    assert.equal(eventIds(result.frames).length,38);
    assert.equal(result.omitted.length,2);
    assert.deepEqual(result,buildChronicle(record,'anniversary',mode));
  }
  assert.equal(JSON.stringify(record),original);
  assert.equal(buildChronicle(record,'anniversary','a').frames.length,38);
  assert.ok(buildChronicle(record,'anniversary','b').frames.length < 38);
});

test('published H0 derivatives keep actual local cutoffs and distinct distribution histories', () => {
  const facts = JSON.parse(readFileSync(new URL('./facts.json',import.meta.url),'utf8'));
  const local = buildChronicle(facts.local,'handover','c');
  const after = buildChronicle(facts.local,'anniversary','c');
  const wide = buildChronicle(facts.wide,'anniversary','c');
  assert.equal(local.cutoff.month,321);
  assert.ok(numbers(local.frames).includes(16));
  assert.ok(numbers(local.frames).includes(17));
  assert.ok(!numbers(local.frames).includes(356));
  assert.ok(after.frames.some(frame => frame.type === 'scene' && frame.events.some(event => event.month === 356 &&
    event.kind === 'delivery' && event.generationId === 2 && event.ids.shopId === liquor.shopId)));
  const returned = local.frames.filter(frame => frame.type === 'scene' &&
    frame.events[0].ids.shopId === liquor.shopId);
  assert.ok(returned.length > 2);
  assert.ok(returned.some(frame => frame.reason === '別の出来事を経た再登場'));
  assert.ok(wide.frames.some(frame => frame.events.some(event => event.ids.shopId === 'supermarket')));
  assert.ok(!after.frames.some(frame => frame.events.some(event => event.ids.shopId === 'supermarket')));
  assert.notDeepEqual(numbers(after.frames),numbers(wide.frames));
});
