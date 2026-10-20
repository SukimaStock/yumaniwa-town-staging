import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {advance,fill} from './brands-helpers.mjs';
import {legacyAtMonth,finishExtraction} from './generation-helpers.mjs';
import {createCaskSerials} from '../cask-serials.mjs';
const hired=()=>D.hireStaff(advance(fill(D.newStaffDistillery(42),{progress:65,type:'refill'}),1));
function cold(s){const raw=D.serializeDistillery(s);const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return D.restoreDistillery(raw);}
function complete(s){assert.equal(s.usual.reservation.status,'active');for(let n=0;s.usual.reservation?.status==='active';n++){assert(n<99);s=D.distillStep(s);}return s;}
const reserve=(s,mode)=>D.reserveStaff(s,s.core.casks[0].id,mode);

test('three completes once per month, pays only at start and retains frozen source and serials',()=>{
 let s=hired(),cash=s.core.cash;s=reserve(s,'three');const source=structuredClone(s.usual.reservation.source),book=structuredClone(s.recipeBook),q=D.staffQuote(s);assert.equal(s.core.cash,cash);s=cold(s);
 for(let i=0;i<3;i++){
  const before=s.core.cash,cost=s.core.totals.costs;s=D.beginUsual(s);assert.equal(s.core.cash,before-q.distillationCost-q.salary);assert.throws(()=>D.beginUsual(s));
  for(let j=0;j<19;j++)s=D.distillStep(s);s=cold(s);s=complete(s);assert.equal(s.core.cash,before-q.cost);assert.equal(s.core.totals.costs,cost+q.cost);assert.deepEqual(s.recipeBook,book);
  assert.equal(s.core.casks.length,i+2);s=cold(s);
  if(i<2){assert.equal(s.usual.reservation.remaining,2-i);assert.deepEqual(s.usual.reservation.source,source);assert.equal(D.canBeginUsual(s).ok,false);assert.equal(D.usualNeedsClock(s),true);assert.throws(()=>D.beginUsual(s));s=advance(s,1);}
 }
 assert.equal(s.usual.reservation,null);assert.equal(D.usualNeedsClock(s),false);const serials=createCaskSerials(s);assert.deepEqual([...serials(s).values()],[1,2,3,4]);cold(s);
});
test('continuous waits at capacity without charges, resumes through existing bottle action, active stop is final and replayable',()=>{
 let s=reserve(hired(),'continuous');for(let i=0;i<3;i++){s=complete(D.beginUsual(s));if(i<2)s=advance(s,1);}s=advance(s,1);const cash=s.core.cash,count=s.operations.length;assert.equal(s.core.casks.length,4);assert.equal(D.canBeginUsual(s).ok,false);assert.equal(D.usualNeedsClock(s),false);assert.throws(()=>D.beginUsual(s));assert.equal(s.core.cash,cash);assert.equal(s.operations.length,count);s=cold(s);
 s=D.bottleBranded(s,s.core.casks[0].id,{});assert.equal(D.canBeginUsual(s).ok,false);assert.equal(D.usualNeedsClock(s),false);const waitingCash=s.core.cash;s=cold(s);assert.equal(s.core.cash,waitingCash);s=D.listBottles(D.setSalePrice(s,'low',s.result.productId),s.result.productId);s=D.bottleBranded(s,s.core.casks[0].id,{brandId:1});s=D.listBottles(D.setSalePrice(s,'low',s.result.productId),s.result.productId);s=advance(s,14);if(s.shop.offer)s=D.noticeShopOffer(s,s.shop.offer.shopId,s.shop.offer.id);assert.equal(D.canBeginUsual(s).ok,true);s=D.beginUsual(s);for(let i=0;i<21;i++)s=D.distillStep(s);s=D.stopStaffRepeat(s);assert.equal(s.usual.reservation.stopAfter,true);assert.equal(D.stopStaffRepeat(s),s);s=cold(s);s=complete(s);assert.equal(s.usual.reservation,null);assert.equal(D.usualNeedsClock(s),false);s=cold(s);
});
test('queued cancellation restores manual work with no fee; old default remains field-identical',()=>{
 let s=hired(),raw=JSON.stringify(s),cash=s.core.cash;const old=D.reserveStaff(s,s.core.casks[0].id),explicit=D.reserveStaff(s,s.core.casks[0].id,'once');assert.deepEqual(old,explicit);assert.equal(old.usual.reservation.mode,undefined);cold(complete(D.beginUsual(old)));
 s=D.cancelUsual(reserve(s,'three'));assert.equal(s.usual.reservation,null);assert.equal(s.core.cash,cash);assert.equal(D.canStart(s).ok,true);assert.equal(JSON.stringify(hired()),raw);assert.throws(()=>reserve(s,'invalid'));cold(s);
});
test('existing finance, product capacity, judgment and generation guards apply to repeat; UI offer wait cannot bypass month gate',()=>{
 const s=reserve(hired(),'continuous'),cash=s.core.cash;
 for(const edit of [x=>x.core.cash=0,x=>x.core.products=Array.from({length:8},()=>({stock:1})),x=>x.trade.offer={},x=>x.decisions=[{}],x=>x.generations.active.phase='last-batch',x=>x.shop.offer={notified:false}]){const x=structuredClone(s);edit(x);assert.equal(D.canBeginUsual(x).ok,false);assert.equal(D.usualNeedsClock(x),false);assert.throws(()=>D.beginUsual(x));}
 const x=structuredClone(s);x.shop.offer={notified:false};x.core.lastDistillation=x.core.month;assert.equal(D.usualNeedsClock(x),false);x.shop.offer.notified=true;assert.equal(D.usualNeedsClock(x),true);x.core.cash=0;assert.equal(D.usualNeedsClock(x),false);x.core.cash=cash;assert.equal(D.usualNeedsClock(x),true);
 const bad=structuredClone(s);bad.usual.reservation.remaining=2;assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));
});

test('repeat yields last batch to manual work and ends at handover; legacy single still carries',()=>{
 const base=fill(D.hireStaff(D.enableStaff(D.enableRecipeBook(D.enableGenerations(legacyAtMonth(299))))),{progress:65,type:'refill'});
 const id=D.manualRecipeSources(base).at(-1).caskId;
 for(const mode of ['three','continuous','once']){
  let s=D.reserveStaff(base,id,mode);s=advance(s,1);s=D.bottleBranded(s,s.core.casks.at(-1).id,{brandId:1});assert.equal(s.generations.active.phase,'last-batch');assert.equal(D.canBeginUsual(s).ok,false);assert.equal(D.usualNeedsClock(s),false);assert.throws(()=>D.beginUsual(s));s=cold(s);
  s=D.startDistillation(s);s=finishExtraction(s);assert.equal(s.generations.active.phase,'review');assert.equal(s.usual.reservation.status,'queued');s=cold(s);s=D.handoverGeneration(s,1);assert.equal(s.generations.active.id,2);assert.equal(!!s.usual.reservation,mode==='once');assert.equal(D.usualNeedsClock(s),mode==='once');cold(s);
 }
});

// Captured with unmodified main 4e1e1b48 before implementing repeat modes.
// Hashes fix the complete historical serialized bytes, not just selected fields.
test('original baseline one-shot save bytes stay identical at every lifecycle boundary',async()=>{
 const {createHash}=await import('node:crypto');const expected=['ef0fded19578bb9dc029d268c5b8c6a13d48db527d8bc59dfb04fe960fed243a','8fe9dee62fc66f533d4641a69170720731d17df636b8182d95d2ac80a50955d1','a16a411ea3ccbcc63e18c44920555c12695ce2cb1b98ae66c10f1c243568ed20','278ec17cb1b7f6fab9f9adcacb4f5c00898291111834bc5ea53b4aa498431b80'];
 let s=hired();for(let i=0;i<4;i++){assert.equal(createHash('sha256').update(D.serializeDistillery(s)).digest('hex'),expected[i]);cold(s);if(i===0)s=D.reserveStaff(s,s.core.casks[0].id);if(i===1){s=D.beginUsual(s);for(let n=0;n<31;n++)s=D.distillStep(s);}if(i===2)s=complete(s);}
});
