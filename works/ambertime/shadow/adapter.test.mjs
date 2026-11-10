import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {createShadow,advanceShadow,createObserver} from './adapter.mjs';
import {resolve,advance} from '../tests/brands-helpers.mjs';
function fill(s){s=resolve(s);s=D.beginCollection(D.startRangeDistillation(s));while(s.still.distillation.progress<65)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),'refill');}
function run(seed=42){let s=D.newStoreMarketDistillery(seed),shadow=createShadow(s);const commit=fn=>{const next=fn(s);shadow=advanceShadow(shadow,s,next);s=next;return s;};return {commit,get s(){return s;},get shadow(){return shadow;}};}
for(const seed of [1,42,99])test('native distill age split retail '+seed,()=>{const x=run(seed);x.commit(fill);for(let i=0;i<6;i++)x.commit(s=>advance(s,1));const id=x.s.core.casks[0].id;for(let i=0;i<3;i++){x.commit(s=>D.bottleBranded(s,id,{},2));const pid=x.s.result.productId;x.commit(s=>D.setMarketRetail(s,{productId:pid,count:2}));x.commit(s=>advance(s,1));}assert(x.shadow.core.retail.bottles>0);assert(x.shadow.checks.every(c=>c.equal));assert.deepEqual(JSON.parse(JSON.stringify(x.shadow)),x.shadow);});
test('observer refuses old session and isolates shadow errors',()=>{const x=run();x.commit(fill);const o=createObserver();o.start(x.s);assert.equal(o.report().status,'stopped');const s=D.newStoreMarketDistillery(42),bad=createObserver({update(){throw Error('injected');}});bad.start(s);assert.doesNotThrow(()=>bad.observe(s,D.startDistillation(s)));assert.equal(bad.report().error,'injected');});
test('formal writer failures leave observer unchanged; successful retry only',()=>{
 const s=D.newStoreMarketDistillery(42),next=D.startRangeDistillation(s),o=createObserver();o.start(s);
 const old='old',candidate='new';
 for(const mode of ['quota','write','readback','conflict']){
  let value=mode==='conflict'?'external':old;
  const storage={getItem(){return value;},setItem(k,v){if(mode==='quota')throw Object.assign(Error('full'),{name:'QuotaExceededError'});if(mode==='write')throw Error('write failed');if(mode!=='readback')value=v;}};
  assert.throws(()=>{writeCandidate(storage,FORMAL_SAVE_KEY,old,candidate);o.observe(s,next);});
  assert.equal(o.report().state.commits,0);
 }
 let value=old;const storage={getItem(){return value;},setItem(k,v){value=v;}};
 writeCandidate(storage,FORMAL_SAVE_KEY,old,candidate);o.observe(s,next);assert.equal(o.report().state.commits,1);
 const seq=o.report().state.core.cursor.seq;o.observe(next,next);assert.equal(o.report().state.core.cursor.seq,seq);
 o.reset();o.observe(next,D.distillStep(next));assert.equal(o.report().status,'inactive');
});
test('diagnostic time budget stops and cannot commit partial candidate',()=>{let t=0;const s=D.newStoreMarketDistillery(42),o=createObserver({clock:()=>t++*1000});o.start(s);o.observe(s,D.startDistillation(s));assert.equal(o.report().status,'stopped');assert.equal(o.report().state.commits,0);});
test('native town contract, shelf reservation, sale, return and idle months',()=>{
 const x=run(42);x.commit(fill);for(let n=0;n<6;n++)x.commit(s=>advance(s,1));const cid=x.s.core.casks[0].id;for(let k=0;k<2;k++){x.commit(s=>D.bottleBranded(s,cid,{},20));const pid=x.s.result.productId;x.commit(s=>D.setMarketRetail(s,{productId:pid,count:20}));}
 x.commit(s=>D.bottleBranded(s,cid,{},8));const id=x.s.result.productId;
 for(let n=0;!x.s.shop.offer;n++){assert(n<40);x.commit(s=>advance(s,1));}
 assert.equal(x.s.shop.offer.shopId,'town-liquor');x.commit(s=>D.acceptShop(s,'town-liquor',s.shop.offer.id));
 const receipts=x.s.shop.deliveries.length,cash=x.s.core.cash;x.commit(s=>D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:5}));assert.equal(x.s.shop.deliveries.length,receipts);assert.equal(x.s.core.cash,cash);
 x.commit(s=>advance(s,1));assert(x.s.shop.deliveries.length>receipts);assert(x.shadow.checks.every(c=>c.equal));
 x.commit(s=>D.returnStoreProduct(s,{productId:id,shopId:'town-liquor'}));for(let n=0;n<6;n++)x.commit(s=>advance(s,1));assert(x.shadow.checks.every(c=>c.equal));
});
