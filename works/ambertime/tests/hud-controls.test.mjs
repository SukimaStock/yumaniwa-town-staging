import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutScene,noticeLayout} from '../canvas-layout.mjs';
import {SYMBOLS} from '../pixel-symbols.mjs';
test('management controls flow with availability and retain touch area and five pixel shadow gap',()=>{
 for(const room of ['distill','warehouse','sales'])for(const staffAvailable of [false,true]){
  const controls=layoutScene({room,staffAvailable}).controls,buttons=controls.filter(x=>['open-ledger','open-staff-panel','shop-offer','open-aux-menu'].includes(x.key));
  assert.equal(buttons.at(-1).key,'open-aux-menu');
  assert.equal(buttons.some(x=>x.key==='open-staff-panel'),staffAvailable);
  assert.equal(buttons.some(x=>x.key==='shop-offer'),room==='sales');
  buttons.forEach((b,i)=>{assert(b.w>=54&&b.h>=54);assert.equal(582-(b.y+54+3),5);if(i)assert.equal(b.x-buttons[i-1].x,66);});
  assert.equal(controls.find(x=>x.key==='toggle-time').y,51);
 }
});
test('notification fits short content, wraps without dropping text and grows away from controls',()=>{
 const measure=s=>Array.from(s).length*20,short=noticeLayout('5本',measure),longText='ビン詰めが完了しました。続けて取扱店に発送します。'.repeat(4),long=noticeLayout(longText,measure);
 assert(short.w<long.w);assert(long.w<=336);assert(long.lines.length>2);assert.equal(long.lines.join(''),longText);assert(long.lines.every(l=>measure(l)<=318));assert(long.y+long.h+3<520);assert.equal(short.y,460);
});
test('store keeps the native eleven square grid with only outline and windows',()=>{
 assert.equal(SYMBOLS.store.length,11);assert(SYMBOLS.store.every(row=>row.length===11));assert.equal(SYMBOLS.store[0],'00000000000');assert.equal(SYMBOLS.store[1],'01111111110');assert.equal(SYMBOLS.store[9],'01111111110');
});
