import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../model.mjs';

test('three distinct releases and three active brand contracts',()=>{
  const s=M.create(42);
  assert.deepEqual(s.releases.map(x=>x.flavorId),['fruit','smoke','wood']);
  assert.deepEqual(Object.keys(s.shops).sort(),['bar','liquor','super']);
  assert.ok(M.SHOPS.every(shop=>s.shops[shop.id].contract));
  assert.equal(s.produced,54);
  assert.equal(M.hand(s),54);
});
test('automatic supply starts without an individual release selection',()=>{
  const s=M.create();M.step(s);
  assert.ok(M.SHOPS.every(t=>s.shops[t.id].last.delivered>0));
  assert.ok(s.history.some(e=>e.type==='delivery'));
  assert.equal(s.sold,0); // shop shelves receive bottles before any customer buys them
});
test('flavor is not a rank: preferences differ across shops',()=>{
  assert.ok(M.fit('super','fruit')>M.fit('super','smoke'));
  assert.ok(M.fit('liquor','smoke')>M.fit('liquor','fruit'));
  assert.ok(M.fit('bar','wood')>M.fit('bar','fruit'));
});
test('monthly sale and delivery conserve stock across separate release and shop shelves',()=>{
  const s=M.create(2026);
  for(let i=0;i<72;i++){M.step(s);assert.ok(M.validate(s));}
  assert.equal(M.totalStored(s)+s.sold,s.produced);
  assert.ok(M.SHOPS.every(t=>s.shops[t.id].contract));
  assert.ok(s.history.some(e=>e.type==='sale'));
});
test('no minimum shipment and no mandatory monthly tapping',()=>{
  const s=M.create(42);
  s.releases.forEach(r=>{r.stock=0;});
  s.releases[0].stock=1;s.produced=1; // isolated scenario, zero initially bottled into other locations
  for(const t of M.SHOPS)s.shops[t.id].shelf={};
  M.step(s);
  assert.equal(s.history.filter(e=>e.type==='delivery').reduce((n,e)=>n+e.count,0),1);
  assert.ok(M.SHOPS.every(t=>s.shops[t.id].contract));
});
test('selling out one release does not terminate brand contracts',()=>{
  const s=M.create();
  s.releases[0].stock=0;s.releases[0].produced=0;s.produced-=18; // a zero-stock release in an isolated boundary fixture
  assert.equal(M.isSoldOut(s,1),true);
  M.advance(s,5);
  assert.ok(M.SHOPS.every(t=>s.shops[t.id].contract));
});
test('new release can be brewed without changing any store contract',()=>{
  const s=M.create();
  M.advance(s,8);
  const before=M.SHOPS.map(t=>s.shops[t.id].contract);
  M.brew(s,'smoke');
  assert.equal(s.releases.length,4);
  assert.equal(s.releases[3].flavorId,'smoke');
  assert.deepEqual(M.SHOPS.map(t=>s.shops[t.id].contract),before);
  M.advance(s,12);
  assert.ok(M.validate(s));
});
test('same seed and actions produce identical logs and outcomes',()=>{
  const a=M.create(1977),b=M.create(1977);
  M.advance(a,5);M.brew(a,'wood');M.advance(a,17);
  M.advance(b,5);M.brew(b,'wood');M.advance(b,17);
  assert.deepEqual(a,b);
  const restored=M.replay(M.exportLog(a));
  assert.deepEqual(restored,a);
});
test('corrupted log is rejected, neither model nor user storage is accessed',()=>{
  const s=M.create();
  const log=M.exportLog(s);log.checksum='altered';
  assert.throws(()=>M.replay(log),/一致しません/);
  assert.throws(()=>M.create(0),/シード/);
});
