import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {brandStats,brandReputation,retailReputationFactors} from '../brand-reputation.mjs';
import {fill,release,advance,exact} from './brands-helpers.mjs';
const round=n=>Math.round(n*100)/100,sha=s=>crypto.createHash('sha256').update(D.serializeDistillery(s)).digest('hex');
const steps=(s,n)=>{for(let i=0;i<n;i++)s=D.distillStep(s);return s;};
const stocked=s=>s.core.products.find(p=>p.stock>=10&&s.productsById[p.id]?.listed);
const withoutOperations=s=>{const {operations,...rest}=s;return rest;};
let cached;
function offered(){
 if(!cached){let s=release(D.newShopDistillery(42),{age:6,progress:65,selection:{name:'川霧'},tier:'low'});s=advance(s,1);s=release(s,{age:6,progress:65,selection:{brandId:1},tier:'low'});for(let i=0;i<40&&!s.shop.offer;i++)s=advance(s,1);assert(s.shop.offer);cached=s;}
 return structuredClone(cached);
}
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return s;}
function identity(s){assert.equal(round(s.core.cash-(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep))||0,0);for(const p of s.core.products)assert.equal(p.sold+p.stock,p.originalStock);}

// Captured independently before this change from the v12 implementation at
// 945174ec09aa38128aa679869551d9a65317ae4e, using only public operations.
test('pre-flow v12 offers, relations, deliveries and partial manual/usual saves remain byte-exact',()=>{
 const s=offered(),accepted=D.acceptShop(s),id=stocked(accepted).id;
 const cases={offered:[s,'28d44076a7756fcc61a79aff44825a6f5958fd3ad67431f57ff0dac33c65dc82'],accepted:[accepted,'f83d4cfb8729b476c3f22e48d7b7c1f68872d096308d725a5e9211bca6b2030b'],delivered:[D.deliverShop(accepted,id,5),'ea374ff9e348f4b44d01de9da483f326b6c893ab3c2bd10d7eef95a388270dff'],manual:[steps(D.startDistillation(advance(s,1)),37),'7ed3171b4182fa7947170b03f8032491e9510623cf54de6ad2b91bc954c82652'],usual:[steps(D.beginUsual(D.reserveUsual(advance(s,1))),37),'040ec40a46528f75e8afc5cef2fce0e2b168feaf195198507567972b8efd6634']};
 for(const [name,[state,hash]] of Object.entries(cases)){assert.equal(sha(state),hash,name);assert.equal(state.version,12);assert.equal(state.rules,'town-shop');if(state.shop.offer)assert(!Object.hasOwn(state.shop.offer,'notified'),'old offers are not silently rewritten');cold(state);assert.deepEqual(exact(state),state);}
});

test('noticing records one replay boundary and changes only the explicit notified flag',()=>{
 const s=offered(),raw=JSON.stringify(s),next=D.noticeShopOffer(s);assert.equal(JSON.stringify(s),raw);assert.deepEqual(next.operations,[...s.operations,{key:'notice-shop',value:{progress:null}}]);assert.deepEqual(next.shop.offer,{...s.shop.offer,notified:true});for(const key of Object.keys(s).filter(k=>!['operations','shop'].includes(k)))assert.deepEqual(next[key],s[key],key);assert.deepEqual(next.shop.relations,s.shop.relations);assert.deepEqual(next.shop.deliveries,s.shop.deliveries);assert.equal(D.noticeShopOffer(next),next);assert.equal(next.operations.length,s.operations.length+1);cold(next);
});

test('noticed offers stay noticed over time without duplicate notices or changed eligibility',()=>{
 let s=D.noticeShopOffer(offered()),offer=structuredClone(s.shop.offer);s=advance(s,5);assert.deepEqual(s.shop.offer,offer);assert.equal(D.noticeShopOffer(s),s);assert.equal(s.operations.filter(o=>o.key==='notice-shop').length,1);cold(s);s=D.declineShop(s);for(let i=0;i<20&&!s.shop.offer;i++)s=advance(s,1);assert(s.shop.offer);assert.equal(Object.hasOwn(s.shop.offer,'notified'),false,'a later opportunity has its own one-time notice');cold(s);
});

test('pending delivery quote is pure and matches the established accepted quote exactly',()=>{
 const s=offered(),id=stocked(s).id,raw=JSON.stringify(s),pending=D.shopOfferQuote(s,id),accepted=D.shopQuote(D.acceptShop(s),id);assert.deepEqual(pending,accepted);assert.equal(pending.ok,true);assert.deepEqual(pending.quantities,[5,10]);assert.equal(JSON.stringify(s),raw);assert.equal(D.shopQuote(s,id).ok,false);assert.equal(D.shopOfferQuote(D.acceptShop(s),id).ok,false);assert.equal(D.shopOfferQuote(D.newShopDistillery(42),999).ok,false);
 for(const tier of ['low','standard','high']){const j=D.setSalePrice(s,tier,id),p=j.core.products.find(p=>p.id===id);assert.equal(D.shopOfferQuote(j,id).unitPrice,round(.8*Math.min(p.price,D.salePrices(j,id).standard)));}
});

for(const count of [5,10])test(`atomic acceptance with ${count} bottles equals the old two actions, using a single operation`,()=>{
 const s=offered(),id=stocked(s).id,raw=JSON.stringify(s),quote=D.shopOfferQuote(s,id),old=D.deliverShop(D.acceptShop(s),id,count),next=D.acceptShopDelivery(s,id,count);assert.equal(JSON.stringify(s),raw);assert.deepEqual(withoutOperations(next),withoutOperations(old));assert.deepEqual(next.operations,[...s.operations,{key:'accept-shop-delivery',value:{productId:id,count,progress:null}}]);assert.equal(next.shop.offer,null);assert.equal(next.shop.relations.length,1);assert.equal(next.shop.deliveries.length,1);assert.equal(next.shop.deliveries[0].count,count);assert.equal(next.core.cash,round(s.core.cash+count*quote.unitPrice));assert.deepEqual(brandReputation(next,1),brandReputation(s,1));assert.deepEqual(retailReputationFactors(next),retailReputationFactors(s));assert.deepEqual(D.offerEvidence(next),D.offerEvidence(s));assert.equal(brandStats(next,1).stock,brandStats(s,1).stock-count);identity(next);cold(next);assert.deepEqual(exact(next),next);
});

test('a zero-delivery acceptance keeps the old explicit path and never creates a delivery record',()=>{
 const s=D.noticeShopOffer(offered()),id=stocked(s).id,raw=JSON.stringify(s);assert.throws(()=>D.acceptShopDelivery(s,id,0));assert.equal(JSON.stringify(s),raw);const next=D.acceptShop(s);assert.deepEqual(next.core,s.core);assert.deepEqual(next.releases,s.releases);assert.deepEqual(next.shop.deliveries,[]);assert.equal(next.shop.relations.length,1);assert.equal(next.shop.offer,null);cold(next);
});

test('atomic invalid quantities or products cannot leave a half-accepted relationship',()=>{
 const s=offered(),id=stocked(s).id,raw=JSON.stringify(s);
 for(const [pid,count] of [[id,-1],[id,0],[id,1],[id,6],[id,11],[id,1.5],[id,'5'],[99999,5],[s.releases[0].productId,5]]){assert.throws(()=>D.acceptShopDelivery(s,pid,count));assert.equal(JSON.stringify(s),raw);assert.equal(s.shop.relations.length,0);assert.equal(s.shop.deliveries.length,0);assert(s.shop.offer);}
 const accepted=D.acceptShopDelivery(s,id,5),done=JSON.stringify(accepted);assert.throws(()=>D.acceptShopDelivery(accepted,id,5),'a completed invitation cannot be reused');assert.equal(JSON.stringify(accepted),done);
});

test('a different brand and an unlisted release cannot use the pending invitation',()=>{
 let s=advance(offered(),1);s=release(s,{age:0,progress:65,selection:{name:'夕凪'},tier:'standard'});let id=s.releases.at(-1).productId,raw=JSON.stringify(s);assert.equal(s.releases.at(-1).brandId,2);assert.equal(D.shopOfferQuote(s,id).ok,false);assert.throws(()=>D.acceptShopDelivery(s,id,5));assert.equal(JSON.stringify(s),raw);
 s=advance(s,1);s=fill(s,{progress:65});s=D.bottleBranded(s,s.core.casks.at(-1).id,{brandId:1});id=s.releases.at(-1).productId;raw=JSON.stringify(s);assert.equal(s.productsById[id].listed,false);assert.deepEqual(D.shopOfferQuote(s,id).quantities,[]);assert.throws(()=>D.acceptShopDelivery(s,id,5));assert.equal(JSON.stringify(s),raw);
});

test('small remaining stock can be accepted and delivered atomically without inventing a five-bottle minimum',()=>{
 let s=advance(offered(),1);s=release(s,{age:0,progress:30,selection:{brandId:1},tier:'low'});const id=s.releases.at(-1).productId;
 for(let i=0;i<40;i++){const p=s.core.products.find(p=>p.id===id);assert(p.stock>0);if(p.stock<5){const n=p.stock,q=D.shopOfferQuote(s,id);assert.deepEqual(q.quantities,[n]);const next=D.acceptShopDelivery(s,id,n);assert.equal(next.shop.deliveries[0].count,n);assert.equal(next.core.products.find(p=>p.id===id).stock,0);assert.equal(next.releases.find(r=>r.productId===id).status,'sold-out');assert.equal(next.core.cash,round(s.core.cash+n*q.unitPrice));identity(next);cold(next);return;}s=advance(s,1);}assert.fail('the legal young release should reach a short remainder');
});

test('sold-out invitations can still be accepted without dispatch, while atomic delivery safely rejects',()=>{
 const s=advance(offered(),60),raw=JSON.stringify(s);assert(s.shop.offer);for(const r of s.releases){assert.equal(D.shopOfferQuote(s,r.productId).ok,false);assert.deepEqual(D.shopOfferQuote(s,r.productId).quantities,[]);assert.throws(()=>D.acceptShopDelivery(s,r.productId,5));}assert.equal(JSON.stringify(s),raw);const next=D.acceptShop(s);assert.deepEqual(next.core,s.core);assert.deepEqual(next.shop.deliveries,[]);assert.equal(next.shop.relations.length,1);cold(next);
});

test('the selected release, rather than an arbitrary bottle of the same brand, is delivered',()=>{
 let s=advance(offered(),1);s=release(s,{age:0,progress:65,selection:{brandId:1},tier:'standard'});const chosen=s.releases.at(-1),other=s.core.products.find(p=>p.stock>0&&p.id!==chosen.productId),before=structuredClone(other);assert(other);const next=D.acceptShopDelivery(s,chosen.productId,5);assert.deepEqual(next.core.products.find(p=>p.id===other.id),before);assert.equal(next.shop.deliveries[0].releaseId,chosen.id);assert.equal(next.shop.deliveries[0].productId,chosen.productId);assert.equal(next.releases.find(r=>r.id===chosen.id).delivered,5);assert.equal(D.shopQuote(next,other.id).remaining,5);assert.deepEqual(D.shopQuote(next,other.id).quantities,[5]);identity(next);cold(next);
});

test('a single remaining operation slot commits acceptance and delivery, while a full ledger mutates nothing',()=>{
 // Controlled boundary projections isolate the capacity check. These deliberately
 // filled operation arrays are never represented as valid saved histories.
 const s=offered(),id=stocked(s).id;s.operations=Array.from({length:11999},()=>({key:'placeholder'}));const raw=JSON.stringify(s),next=D.acceptShopDelivery(s,id,5);assert.equal(JSON.stringify(s),raw);assert.equal(next.operations.length,12000);assert.equal(next.operations.at(-1).key,'accept-shop-delivery');assert.equal(next.shop.relations.length,1);assert.equal(next.shop.deliveries.length,1);identity(next);
 const full=offered();full.operations=Array.from({length:12000},()=>({key:'placeholder'}));const before=JSON.stringify(full);assert.throws(()=>D.acceptShopDelivery(full,stocked(full).id,5),/帳面/);assert.throws(()=>D.noticeShopOffer(full),/帳面/);assert.equal(JSON.stringify(full),before);const alreadyNoticed=D.noticeShopOffer(offered());alreadyNoticed.operations=full.operations;assert.equal(D.noticeShopOffer(alreadyNoticed),alreadyNoticed,'idempotence needs no spare operation slot');
});

for(const automatic of [false,true])test(`${automatic?'usual':'manual'} partial extraction notices and atomic delivery cold-replay with exact progress`,()=>{
 let s=advance(offered(),1);s=automatic?D.beginUsual(D.reserveUsual(s)):D.startDistillation(s);s=steps(s,37);const before=structuredClone(s.still),id=stocked(s).id;s=D.noticeShopOffer(s);assert.deepEqual(s.operations.at(-1),{key:'notice-shop',value:{progress:37}});assert.deepEqual(s.still,before);cold(s);s=steps(s,8);s=D.acceptShopDelivery(s,id,5);assert.deepEqual(s.operations.at(-1),{key:'accept-shop-delivery',value:{productId:id,count:5,progress:45}});assert.equal(s.still.distillation.progress,45);cold(s);
 if(automatic){for(let i=0;i<100&&s.usual.reservation;i++)s=D.distillStep(s);assert.equal(s.usual.reservation,null);assert.equal(s.still.phase,'ready');}else s=D.fillBarrel(D.stopDistillation(s),'refill');assert(s.core.casks.length>0);identity(s);cold(s);
});

test('strict replay rejects forged notice flags, duplicate notifications and altered atomic transactions',()=>{
 const offeredState=offered(),noticed=D.noticeShopOffer(offeredState),id=stocked(noticed).id,done=D.acceptShopDelivery(noticed,id,5);
 for(const [state,edit]of [[offeredState,x=>x.shop.offer.notified=true],[noticed,x=>delete x.shop.offer.notified],[noticed,x=>x.operations.push({key:'notice-shop',value:{progress:null}})],[noticed,x=>x.operations.at(-1).value.progress=45],[done,x=>x.shop.deliveries[0].count++],[done,x=>x.shop.relations=[]],[done,x=>x.operations.at(-1).value.count=10],[done,x=>x.operations.at(-1).value.productId=x.releases[0].productId],[done,x=>x.operations.push(structuredClone(x.operations.at(-1)))],[done,x=>x.core.cash++],[done,x=>x.releases.at(-1).sold+=5]]){const bad=structuredClone(state);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}cold(done);
});

test('a real wholesale offer and a tasting pause still take priority over the new explicit actions',()=>{
 let s=offered();for(let i=0;i<80&&!s.trade.offer;i++)s=D.tickDistillery(s);assert(s.trade.offer);const id=stocked(s)?.id??s.releases.at(-1).productId,raw=JSON.stringify(s);assert.throws(()=>D.noticeShopOffer(s));assert.throws(()=>D.acceptShopDelivery(s,id,5));assert.equal(D.shopOfferQuote(s,id).ok,false);assert.equal(JSON.stringify(s),raw);assert(s.shop.offer);
 s=advance(offered(),1);s=fill(s,{progress:65});s=advance(s,1);s=D.sampleDistillery(s,s.core.casks.at(-1).id);const before=JSON.stringify(s);assert.throws(()=>D.noticeShopOffer(s));assert.throws(()=>D.acceptShopDelivery(s,s.releases.at(-1).productId,5));assert.equal(JSON.stringify(s),before);assert(s.shop.offer);cold(s);
});
