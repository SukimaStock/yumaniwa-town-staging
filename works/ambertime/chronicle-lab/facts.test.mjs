import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {compactFacts} from './facts-compact.mjs';

const read = path => JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const facts = read('./facts.json');
const histories = read('../history-lab/fixtures.json');
const links = read('../memory-lab/connections.json');

test('compact facts reconcile to H0 delivery and sales totals in every comparison', () => {
  for (const {id,analysis} of histories) {
    const {events,sourceSha256,coverage} = facts[id];
    assert.equal(sourceSha256,links[id].sourceSha256);
    assert.deepEqual(coverage,analysis.coverage);
    const deliveries = events.filter(event=>event.kind==='delivery');
    const sales = events.filter(event=>event.kind==='sale');
    for (const shop of analysis.shops) {
      const rows=deliveries.filter(event=>event.ids.shopId===shop.id);
      assert.deepEqual(rows.map(event=>event.ids.receiptId),shop.receiptIds);
      assert.equal(rows.reduce((n,event)=>n+event.ids.count,0),shop.bottles);
    }
    assert.equal([...sales,...deliveries].reduce((n,event)=>n+event.ids.count,0),analysis.totals.sold);
    assert.equal(new Set(events.map(event=>event.id)).size,events.length);
  }
});

test('fixture orders operation evidence and reactions stay attached to actual self-sales', () => {
  for (const {events} of Object.values(facts)) {
    let prior;
    const byId = new Map(events.map(event=>[event.id,event]));
    for (const event of events) {
      if (prior) {
        assert.ok(event.month>=prior.month);
        assert.ok(event.operationIndex>=prior.operationIndex);
        if (event.operationIndex===prior.operationIndex) assert.equal(event.ordinal,prior.ordinal+1);
        else assert.equal(event.ordinal,0);
      }
      if (event.kind==='reaction') {
        const sale=byId.get(`sale:${event.evidence.saleReceiptId}`);
        assert.ok(sale);
        assert.equal(event.month,sale.month);
        assert.equal(event.operationIndex,sale.operationIndex);
        assert.equal(event.ids.releaseId,sale.ids.releaseId);
        assert.equal(event.ids.shopId,undefined);
      }
      prior=event;
    }
  }
});

test('compact town fixture preserves prior linked arrivals and counts redundant town rows', () => {
  const arrival = (id,month) => ({
    id:`arrival:${id}`,kind:'arrival',month,operationIndex:month,ids:{regionId:'overseas-food',townEventId:id},
  });
  const inquiry = (id,sourceId,month) => ({
    id:`inquiry:${id}`,kind:'inquiry',month,operationIndex:month,ids:{regionId:'overseas-food',townEventId:id},
    evidence:{sourceChain:[sourceId,id]},
  });
  const sample=[arrival('first',1),arrival('linked',2),arrival('redundant',3),
    inquiry('ask','linked',4),inquiry('repeat','redundant',5)];
  const {events,omitted}=compactFacts(sample,[{type:'arrival',channel:'direct'},{type:'share'}]);
  assert.deepEqual(events.map(event=>event.id),['arrival:first','arrival:linked','inquiry:ask']);
  assert.equal(omitted.directArrivals,1);
  assert.equal(omitted.repeatedArrivals,1);
  assert.equal(omitted.repeatedInquiries,1);
  assert.equal(omitted.internalTownEvents,1);
  const local = facts.local.events;
  const firstNational=local.find(event=>event.kind==='arrival' && event.ids.level==='全国');
  const firstTrade=local.find(event=>event.kind==='shop-start');
  assert.equal(firstNational.month,16);
  assert.equal(firstTrade.month,17);
  const overseas=local.find(event=>event.kind==='inquiry' && event.ids.level==='海外');
  const antecedent=local.find(event=>event.kind==='arrival' && event.month===160);
  assert.equal(overseas.month,171);
  assert.ok(overseas.evidence.sourceChain.includes(antecedent.ids.townEventId));
});
