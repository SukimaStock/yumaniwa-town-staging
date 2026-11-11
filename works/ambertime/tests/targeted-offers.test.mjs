import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {brandReputation,retailReputationFactors} from '../brand-reputation.mjs';
import {fill,release,advance,exact} from './brands-helpers.mjs';
// This v13 suite exercises the original three retailers; bar requires its later logged boundary.
const legacyShops=D.SHOPS.filter(s=>s.id!=='bar');
const round=n=>Math.round(n*100)/100;
let cache;
function offered(){if(!cache){let s=D.newStockistsDistillery(42);for(let i=0;i<3;i++){s=release(s,{age:6,progress:65,selection:i?{brandId:1}:{name:'川霧'},tier:'low'});s=advance(s,6);}s=release(s,{age:24,progress:65,selection:{brandId:1},tier:'high'});cache=advance(s,1);}return structuredClone(cache);}
function accepted(){let s=offered();while(s.shop.offer){const o=s.shop.offer;s=D.acceptShop(s,o.shopId,o.id);}return s;}
const product=s=>s.releases.at(-1).productId;
function unchanged(s,fn){const raw=JSON.stringify(s);assert.throws(fn);assert.equal(JSON.stringify(s),raw);}
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);}
function identity(s){assert.equal(round(s.core.cash-(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep))||0,0);for(const p of s.core.products)assert.equal(p.sold+p.stock,p.originalStock);}

import {createOfferPresentation} from '../offer-presentation.mjs';

test('targeted selection preserves legacy bytes and exact pending payloads then cold replays',()=>{
 const s=offered(),raw=D.serializeDistillery(s),before=structuredClone(s.shop),o=s.shop.pendingOffers[1];
 const j=D.selectShopOffer(s,o.shopId,o.id);assert.equal(D.serializeDistillery(s),raw);
 assert.deepEqual(j.shop.offer,o);assert.deepEqual(j.shop.pendingOffers,[before.pendingOffers[0],before.offer]);
 assert.deepEqual(j.core,s.core);assert.deepEqual(j.shop.relations,s.shop.relations);assert.equal(j.operations.at(-1).key,'stockist-select');cold(j);
 assert.equal(D.selectShopOffer(j,o.shopId,o.id),j);
 assert.throws(()=>D.acceptShop(s,o.shopId,o.id)); // old opcode stays head-only
 const noticed=D.noticeShopOffer(j,o.shopId,o.id);const town=noticed.shop.pendingOffers.find(x=>x.shopId==='town-liquor');
 const back=D.selectShopOffer(noticed,town.shopId,town.id);assert.equal(back.shop.pendingOffers.find(x=>x.id===o.id).notified,true);cold(back);
});
test('independent decline and accept retain other offers and 12-month cooldown',()=>{
 const s=offered(),o=s.shop.pendingOffers[0],j=D.selectShopOffer(s,o.shopId,o.id),k=D.declineShop(j,o.shopId,o.id);
 assert.equal(k.shop.declinedUntil[`${o.shopId}:${o.brandId}`],s.core.month+12);assert.deepEqual(k.shop.relations,s.shop.relations);assert.deepEqual(k.core,s.core);
 const town=k.shop.offer;const accepted=D.acceptShop(k,town.shopId,town.id);assert(accepted.shop.relations.some(r=>r.shopId===town.shopId));assert.equal(accepted.shop.offer.shopId,'department');cold(accepted);
});
test('stale/mismatched selection rejects immutably; forged operation and state reject',()=>{
 const s=offered(),o=s.shop.pendingOffers[0];for(const [shop,id] of [['wrong',o.id],[o.shopId,999],[o.shopId,String(o.id)]])unchanged(s,()=>D.selectShopOffer(s,shop,id));
 const j=D.selectShopOffer(s,o.shopId,o.id),raw=D.serializeDistillery(j),a=JSON.parse(raw);a.operations.at(-1).value.offerId=999;assert.throws(()=>D.restoreDistillery(JSON.stringify(a)));const b=JSON.parse(raw);b.shop.offer.notified=true;assert.throws(()=>D.restoreDistillery(JSON.stringify(b)));cold(j);
});
test('presentation budget cannot cascade and explicit continuation works without advancing a month',()=>{
 const p=createOfferPresentation();assert(p.available());p.shown();assert(!p.available());
 const s=offered(),j=D.declineShop(s,s.shop.offer.shopId,s.shop.offer.id);assert(j.shop.offer&&!j.shop.offer.notified);assert(!p.available());
 p.continue();assert(p.available());p.shown();assert(!p.available());p.reset();assert(p.available());assert.equal(j.core.month,s.core.month);
});

import {sessionFor,bottleRegionalBatch,months} from './regional-delivery-helpers.mjs';
import {readSession,serializeSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
let modernCache;
function modern(){if(!modernCache){let s=D.newShopDialogueDistillery(42);for(let i=0;i<4;i++){s=bottleRegionalBatch(s,i===3?24:6);const p=s.core.products.find(x=>x.id===s.result.productId);s=D.setMarketRetail(s,{productId:p.id,count:p.stock});s=months(s,i===3?1:12);}modernCache=s;}return structuredClone(modernCache);}
test('formal v8 selection/notice roundtrip and failed persistent write preserve old save',()=>{
 const s=modern(),o=s.shop.pendingOffers[0];assert(o);const old=serializeSession(s,sessionFor(s),options);
 const next=D.noticeShopOffer(D.selectShopOffer(s,o.shopId,o.id),o.shopId,o.id),session=sessionFor(next),raw=serializeSession(next,session,options);
 assert.equal(serializeSession(next,readSession(raw,options),options),raw);
 const store={getItem:()=>old,setItem:()=>{throw Error('quota');}};
 assert.throws(()=>writeCandidate(store,FORMAL_SAVE_KEY,old,raw));assert.equal(store.getItem(FORMAL_SAVE_KEY),old);assert.equal(D.serializeDistillery(s),D.serializeDistillery(readSession(old,options).game));cold(next);
});
test('partial extraction selection replays exact progress and department identity',()=>{
 let s=modern();s=D.startDistillation(s);for(let i=0;i<17;i++)s=D.distillStep(s);
 const o=s.shop.pendingOffers.find(o=>o.shopId==='department')??s.shop.pendingOffers[0],next=D.selectShopOffer(s,o.shopId,o.id);
 assert.deepEqual(next.shop.offer,o);assert.equal(next.operations.at(-1).value.progress,s.still.distillation.progress);cold(next);
});
test('modern department selection retains exact selectionId and accepts queued delivery with formal restore',()=>{
 const s=modern(),o=[s.shop.offer,...s.shop.pendingOffers].find(o=>o.shopId==='department');assert(o,'natural department invitation');assert(o.selectionId);
 let j=D.selectShopOffer(s,o.shopId,o.id);assert.deepEqual(j.shop.offer,o);
 for(const p of j.core.products)if(p.stock)j=D.setMarketRetail(j,{productId:p.id,count:0});
 const product=j.core.products.find(p=>D.shopOfferQuote(j,p.id,'department').ok);assert(product,JSON.stringify(j.core.products.map(p=>({id:p.id,age:p.age,roughness:p.roughness,stock:p.stock,q:D.shopOfferQuote(j,p.id,'department')}))));
 const q=D.shopOfferQuote(j,product.id,'department');assert.equal(q.selectionId,o.selectionId);
 const next=D.acceptShopDelivery(j,product.id,5,'department',o.id);cold(next);
 const formal=sessionFor(next),raw=serializeSession(next,formal,options);assert.equal(serializeSession(next,readSession(raw,options),options),raw);
});
