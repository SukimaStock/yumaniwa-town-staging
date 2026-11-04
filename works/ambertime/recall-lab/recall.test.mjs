import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {buildRecall} from './recall.mjs';

const data = path => JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const histories = Object.fromEntries(data('../history-lab/fixtures.json').map(row => [row.id,row.analysis]));
const connections = data('../memory-lab/connections.json');
const build = (id,horizon) => buildRecall(id,horizon,histories[id],connections[id]);

test('handover stops at operation 481; only the anniversary can show receipt 73', () => {
  const atHandover = build('local','handover');
  assert.deepEqual(atHandover.cutoff,{month:321,operationIndex:481});
  assert.deepEqual(atHandover.frames.map(frame => frame.month),[17,23,321]);
  assert.ok(atHandover.frames.every(frame => frame.ids.receiptId !== 73));
  assert.deepEqual(atHandover.frames.at(-1).evidence.inheritedCaskIds,[41]);

  const after = build('local','anniversary');
  assert.deepEqual(after.cutoff,{month:360,operationIndex:null});
  assert.deepEqual(after.frames.map(frame => frame.month),[17,23,321,356]);
  assert.deepEqual(after.frames.slice(0,3),atHandover.frames);
  for (const frame of after.frames) assert.equal(frame.scene.entity.id,'town-liquor');
  assert.equal(after.frames[1].scene.bottle.name,'石蔵');
  assert.equal(after.frames[1].ids.count,1);
  assert.equal(after.frames[3].ids.count,1);
  assert.equal(after.frames[3].generationId,2);
  assert.equal(after.frames[3].ids.receiptId,73);
});

test('a successor delivery later in the handover month is still out of bounds', () => {
  const modified = structuredClone(connections.local);
  const shop = modified.connections.find(relation => relation.id === 'shop:town-liquor');
  shop.end.month = 321;
  shop.end.operationIndex = 482;
  const before = buildRecall('local','handover',histories.local,modified);
  assert.deepEqual(before.frames.map(frame => frame.operationIndex),[76,90,481]);
  const after = buildRecall('local','anniversary',histories.local,modified);
  assert.equal(after.frames.at(-1).operationIndex,482);
});

test('comparison records preserve event order and keep reputation separate from commerce', () => {
  for (const [id,shop,months] of [
    ['wide','supermarket',[51,74,314,347]],
    ['mixed','town-liquor',[23,207,306,358]],
  ]) {
    const after = build(id,'anniversary');
    assert.deepEqual(after.frames.map(frame => frame.month),months);
    assert.deepEqual(after.frames.map(frame => frame.kind),['delivery','arrival','handover','delivery']);
    const [first,arrival,,last] = after.frames;
    assert.equal(first.scene.entity.id,shop);
    assert.equal(last.scene.entity.id,shop);
    assert.equal(arrival.scene.kind,'reputation');
    assert.equal(arrival.ids.shopId,undefined);
    assert.equal(arrival.evidence.townEventId,arrival.ids.townEventId);
  }
});

test('projection is deterministic, does not mutate inputs, and allows absent facts', () => {
  const h0 = JSON.stringify(histories);
  const h1 = JSON.stringify(connections);
  for (const id of Object.keys(histories)) {
    for (const horizon of ['handover','anniversary']) {
      assert.deepEqual(build(id,horizon),build(id,horizon));
    }
  }
  assert.equal(JSON.stringify(histories),h0);
  assert.equal(JSON.stringify(connections),h1);
  assert.deepEqual(buildRecall('local','handover',{timeline:[]},{connections:[]}),{cutoff:null,frames:[]});
  assert.deepEqual(buildRecall('local','anniversary',{elapsedMonths:360},{connections:[]}).frames,[]);
});
