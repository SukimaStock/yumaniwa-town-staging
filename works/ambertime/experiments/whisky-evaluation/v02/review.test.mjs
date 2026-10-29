import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './model.mjs';

const act=(s,...actions)=>actions.reduce((state,a)=>M.transact(state,a),s);
const placed=(seed=42)=>act(M.create({seed}),{type:'place',shopId:'bar',portion:'all'},{type:'confirm'});

test('review: failed sync and async saves preserve the previous complete state',()=>{
 const s=placed(),prior=M.serialize(s),a={type:'advance',months:1};
 for(const save of [()=>false,()=>{throw Error('disk full');},()=>Promise.resolve(true)]){
  assert.throws(()=>M.transact(s,a,save));assert.equal(M.serialize(s),prior);
 }
});
test('review: old shop stock can be recalled while a newer bottle is selected and replayed',()=>{
 let s=act(placed(7),{type:'advance',months:1},{type:'next',sample:'deep',years:20,tier:'high'});
 const old=s.products[0].shops.bar;
 if(old)s=M.transact(s,{type:'recall',productId:1,shopId:'bar',count:old});
 assert.equal(s.selectedId,2);assert.equal(M.freeHand(s),5);assert.equal(s.products[0].shops.bar,0);
 assert.deepEqual(M.restore(M.serialize(s)),s);
 const tamper=JSON.parse(M.serialize(s));tamper.products[0].profile.smoke=1-tamper.products[0].profile.smoke;
 assert.throws(()=>M.restore(JSON.stringify(tamper)));
});
test('review: byte-size rejection is atomic before persistence, including multibyte prose',()=>{
 const s=M.create(),prior=M.serialize(s);let saves=0;
 const a={type:'cancel',note:'瓶'.repeat(Math.ceil(M.MAX_LOG_BYTES/3))};
 assert.throws(()=>M.transact(s,a,()=>{saves++;}));
 assert.equal(saves,0);assert.equal(M.serialize(s),prior);
 assert.throws(()=>M.restore(JSON.stringify({note:a.note})));
});
