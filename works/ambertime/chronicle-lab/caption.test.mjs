import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {firstDeliveryIds,recallSentence} from './caption.mjs';

const records = JSON.parse(readFileSync(new URL('./facts.json',import.meta.url)));
const record = records.local;
const caption = id => recallSentence(record.events.find(event => event.id === id),firstDeliveryIds(record));

test('captions use actual date, brand, quantity, place and event perspective', () => {
  assert.equal(caption('bottling:1'),'2026年7月、6か月熟成の『石蔵』を46本瓶詰めした。');
  assert.equal(caption('delivery:1'),'2027年12月、町の酒店に『石蔵』を初めて1本納品した。');
  assert.equal(caption('delivery:73'),'2055年9月、町の酒店に『石蔵』を1本納品した。');
  assert.equal(caption('handover:1'),'2052年10月、蒸留所を第2世代へ引き継いだ。');
  assert.match(caption('inquiry:e35'),/食堂から問い合わせが届いた。$/u);
  assert.match(caption('reaction:customer:retail:8:5'),/「このウイスキー、果実の香りが豊かですね。」という反応があった。$/u);
  for (const history of Object.values(records)) for (const event of history.events) {
    assert.match(recallSentence(event,firstDeliveryIds(history)),/^\d+年\d+月、.+。$/u);
  }
});

test('unknown and incomplete evidence do not invent identities or firsts', () => {
  assert.equal(recallSentence({kind:'unregistered',month:0,label:'記録された出来事。'}),'2026年1月、記録された出来事。');
  assert.equal(recallSentence({kind:'unregistered',month:0}),'');
  const receipt = record.events.find(event => event.id === 'delivery:1');
  assert.doesNotMatch(recallSentence(receipt,firstDeliveryIds({...record,coverage:{complete:false}})),/初めて/u);
  assert.doesNotMatch(recallSentence({...receipt,scene:null}),/石蔵|酒店/u);
});
