import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {brandReputation} from '../brand-reputation.mjs';
import {fill,release,advance,exact} from './brands-helpers.mjs';
let cached;
function offered(){if(!cached){let s=release(D.newShopDistillery(42),{age:6,progress:65,selection:{name:'川霧'},tier:'low'});s=advance(s,1);s=release(s,{age:6,progress:65,selection:{brandId:1},tier:'low'});for(let i=0;i<40&&!s.shop.offer;i++)s=advance(s,1);assert(s.shop.offer);cached=s;}return structuredClone(cached);}
const round=n=>Math.round(n*100)/100;

test('deferring a noticed offer leaves retail running, including stockout, without reservation or lost invitation',()=>{
 let s=D.noticeShopOffer(offered());const offer=structuredClone(s.shop.offer),stocks=s.core.products.reduce((n,p)=>n+p.stock,0),sold=s.core.totals.bottlesSold;s=advance(s,3);assert(s.core.products.reduce((n,p)=>n+p.stock,0)<stocks);assert(s.core.totals.bottlesSold>sold);assert.deepEqual(s.shop.offer,offer);assert.deepEqual(s.shop.deliveries,[]);s=advance(s,57);assert.equal(s.core.products.reduce((n,p)=>n+p.stock,0),0);assert.deepEqual(s.shop.offer,offer);assert.deepEqual(exact(s),s);
 const before=structuredClone(s.core);s=D.acceptShop(s);assert.deepEqual(s.core,before);assert.equal(s.shop.relations.length,1);assert.deepEqual(s.shop.deliveries,[]);assert.deepEqual(exact(s),s);
});

test('accepted relation survives a no-delivery sellout and next release restores optional delivery',()=>{
 let s=D.acceptShop(offered());const relation=structuredClone(s.shop.relations);s=advance(s,60);assert.equal(s.core.products.reduce((n,p)=>n+p.stock,0),0);assert.deepEqual(s.shop.relations,relation);assert.deepEqual(s.shop.deliveries,[]);assert.equal(s.shop.offer,null);
 s=release(s,{age:0,progress:65,selection:{brandId:1}});const id=s.releases.at(-1).productId,p=s.core.products.find(p=>p.id===id),cash=s.core.cash,rep=brandReputation(s,1),q=D.shopQuote(s,id);assert.deepEqual(q.quantities,[5,10]);s=D.deliverShop(s,id,5);assert.equal(s.core.products.find(p=>p.id===id).stock,p.stock-5);assert.equal(s.core.cash,round(cash+q.unitPrice*5));assert.deepEqual(s.shop.relations,relation);assert.deepEqual(brandReputation(s,1),rep);assert.deepEqual(exact(s),s);
});

test('deferred invitation with stock across releases delivers the exact selected SKU and no duplicate retail credit',()=>{
 let s=advance(D.noticeShopOffer(offered()),1);s=release(s,{age:0,progress:65,selection:{brandId:1},tier:'standard'});const chosen=s.releases.at(-1),other=s.core.products.find(p=>p.stock>0&&p.id!==chosen.productId);assert(other);const before=structuredClone(other),rep=brandReputation(s,1),retail=s.releases.reduce((n,r)=>n+r.sold,0),total=s.core.totals.bottlesSold;
 s=D.acceptShopDelivery(s,chosen.productId,5);assert.deepEqual(s.core.products.find(p=>p.id===other.id),before);assert.equal(s.shop.deliveries.at(-1).productId,chosen.productId);assert.equal(s.shop.deliveries.at(-1).releaseId,chosen.id);assert.equal(s.releases.reduce((n,r)=>n+r.sold,0),retail);assert.equal(s.core.totals.bottlesSold,total+5);assert.deepEqual(brandReputation(s,1),rep);assert.deepEqual(D.shopQuote(s,other.id).quantities,[5]);
 s=advance(s,60);const final=s.releases.find(r=>r.id===chosen.id);assert.equal(final.sold+final.delivered,final.bottles);assert.equal(final.delivered,5);assert.deepEqual(exact(s),s);
});

test('a pending offer follows genuine dwindling stock down through five or fewer without invented inventory',()=>{
 let s=advance(D.noticeShopOffer(offered()),1);s=release(s,{age:0,progress:30,selection:{brandId:1},tier:'low'});const id=s.releases.at(-1).productId;let found=false;
 for(let i=0;i<40;i++){const p=s.core.products.find(p=>p.id===id);if(p.stock<=5&&p.stock>0){found=true;const q=D.shopOfferQuote(s,id),n=p.stock;assert(q.quantities.every(x=>x<=n));assert(q.quantities.includes(n));const next=D.acceptShopDelivery(s,id,n);assert.equal(next.core.products.find(p=>p.id===id).stock,0);assert.equal(next.shop.deliveries.at(-1).count,n);assert.deepEqual(exact(next),next);break;}s=advance(s,1);}assert(found,'the same pending invitation reaches an actual short stock remainder');
});
