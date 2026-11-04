import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sourceChain} from './connections.mjs';

const data = JSON.parse(readFileSync(new URL('./connections.json',import.meta.url),'utf8'));
const h0 = JSON.parse(readFileSync(new URL('../history-lab/fixtures.json',import.meta.url),'utf8'));

test('all three H0 histories retain coverage and distinct, ordered relations', () => {
  assert.deepEqual(Object.keys(data),h0.map(row=>row.id));
  for (const {id,analysis} of h0) {
    const {coverage,connections} = data[id];
    assert.deepEqual(coverage,analysis.coverage);
    assert.deepEqual(new Set(connections.map(row=>row.kind)),new Set(['shop','generation','brand','cask','reputation']));
    for (const relation of connections) {
      assert.equal(relation.elapsedMonths,relation.end.month-relation.start.month);
      assert.deepEqual(relation.coverage,coverage);
      const events = [relation.start,...relation.bridge,relation.end];
      for (const [i,event] of events.entries()) {
        assert.ok(event.month<=analysis.elapsedMonths);
        assert.ok(Number.isInteger(event.operationIndex));
        if (i) assert.ok(events[i-1].operationIndex<=event.operationIndex);
      }
    }
    for (const {start,end,entity} of connections.filter(row=>row.kind==='shop')) {
      const shop=analysis.shops.find(row=>row.id===entity.id);
      assert.equal(start.month,shop.startedMonth);
      assert.equal(end.month,shop.lastMonth);
      assert.ok(shop.receiptIds.includes(end.ids.receiptId));
    }
    const linked=connections.find(row=>row.id==='reputation:linked');
    assert.equal(linked.end.ids.townEventId,analysis.firstOverseasInquiry.evidence.townEventId);
    assert.equal(linked.end.operationIndex,analysis.firstOverseasInquiry.operationIndex);
    let previous=linked.start;
    for(const event of [...linked.bridge,linked.end]){
      assert.equal(event.ids.sourceId,previous.ids.townEventId);
      previous=event;
    }
  }
});

test('local manual acceptance, automatic delivery and same-shop return stay separate', () => {
  const shop = data.local.connections.find(row=>row.id==='shop:town-liquor');
  assert.equal(shop.start.month,17);
  assert.equal(shop.start.agency,'manual');
  assert.equal(shop.start.generationId,1);
  assert.equal(shop.bridge.find(row=>row.kind==='handover').month,321);
  const firstReceipt=shop.bridge.find(row=>row.kind==='delivery');
  assert.equal(firstReceipt.month,23);
  assert.equal(firstReceipt.agency,'automatic');
  assert.notEqual(firstReceipt.ids.receiptId,shop.end.ids.receiptId);
  assert.ok(!shop.bridge.some(row=>row.kind==='placement'));
  assert.equal(shop.end.month,356);
  assert.equal(shop.end.generationId,2);
  assert.equal(shop.end.agency,'automatic');
  assert.deepEqual(shop.metrics.map(row=>row.value),['73本','27年9か月','10か月']);
  assert.equal(data.local.contacts.delegated,0);
});

test('first overseas reach is not the source of the first overseas inquiry', () => {
  const linked = data.local.connections.find(row=>row.id==='reputation:linked');
  const chronological = data.local.connections.find(row=>row.id==='reputation:earliest');
  assert.equal(chronological.certainty,'chronological');
  assert.equal(chronological.start.month,76);
  assert.equal(linked.certainty,'source-linked');
  assert.equal(linked.start.month,160);
  assert.equal(linked.end.month,171);
});

test('source chain refuses missing, cyclic, future or cross-release references', () => {
  const town = (townEventId,sourceId,month=0,townReleaseId=1)=>({month,ids:{townEventId,sourceId,townReleaseId}});
  const end=town('end','start',4);
  assert.deepEqual(sourceChain(end,new Map()),[]);
  for (const start of [town('start','end',4),town('start',null,5),town('start',null,0,2)]) {
    assert.deepEqual(sourceChain(end,new Map([['start',start],['end',end]])),[]);
  }
  const start=town('start',null);
  assert.deepEqual(sourceChain(end,new Map([['start',start]])),[start,end]);
});
