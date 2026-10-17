import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {brandStats,brandReputation,retailReputationFactors} from '../brand-reputation.mjs';
import {fill,release,advance,resolve,exact} from './brands-helpers.mjs';
const round=n=>Math.round(n*100)/100;
let cached;
function offered(){
 if(!cached){let s=release(D.newShopDistillery(42),{age:6,progress:65,selection:{name:'川霧'},tier:'low'});s=advance(s,1);s=release(s,{age:6,progress:65,selection:{brandId:1},tier:'low'});for(let i=0;i<40&&!s.shop.offer;i++)s=advance(s,1);assert(s.shop.offer,'real retail activity reaches the threshold');cached=s;}
 return structuredClone(cached);
}
function accepted(){return D.acceptShop(offered());}
const stocked=s=>s.core.products.find(p=>p.stock>=10&&s.productsById[p.id]?.listed);
function balances(s){assert.equal(round(s.core.cash-(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep))||0,0);for(const p of s.core.products)assert.equal(p.stock+p.sold,p.originalStock);for(const r of s.releases){const deliveries=s.shop.deliveries.filter(d=>d.releaseId===r.id),count=deliveries.reduce((n,d)=>n+d.count,0),revenue=round(deliveries.reduce((n,d)=>n+d.revenue,0)),p=s.core.products.find(p=>p.id===r.productId);if(p){assert.equal(p.sold,r.sold+count);assert.equal(p.revenue,round(r.revenue+revenue));assert.equal(p.stock,r.bottles-r.sold-count);}}return s;}

test('initial v12 has no relationship or offer; bottling and listing alone never qualify',()=>{
 let s=D.newShopDistillery(42);assert.equal(s.version,12);assert.equal(s.rules,'town-shop');assert.deepEqual(s.shop.relations,[]);assert.deepEqual(s.shop.deliveries,[]);assert.equal(s.shop.offer,null);
 for(let i=0;i<3;i++){if(i)s=advance(s,1);s=fill(s,{progress:65});s=D.bottleBranded(s,s.core.casks.at(-1).id,i?{brandId:1}:{name:'川霧'});}
 for(const r of s.releases)s=D.listBottles(s,r.productId);
 assert.equal(D.shopEvidence(s,1).sold,0);assert.equal(D.shopEvidence(s,1).soldReleases,0);assert.equal(D.shopEvidence(s,1).eligible,false);assert.equal(s.shop.offer,null);assert.deepEqual(exact(s),s);
});

test('one sold release is insufficient; two actual selling releases and forty retail bottles qualify',()=>{
 let s=release(D.newShopDistillery(42),{age:6,progress:65,tier:'low'});s=advance(s,15);assert(D.shopEvidence(s,1).sold>=40);assert.equal(D.shopEvidence(s,1).soldReleases,1);assert.equal(s.shop.offer,null);
 const q=offered(),e=D.shopEvidence(q,1);assert(e.eligible&&e.sold>=40&&e.soldReleases>=2&&e.age>=2);assert.equal(q.shop.offer.brandId,1);assert.equal(q.shop.offer.name,'町の酒店');assert.equal(q.trade.offer,null);assert.deepEqual(exact(q),q);
});

test('a passive shop offer neither pauses distillation nor disappears on later months',()=>{
 const s=offered(),offer=structuredClone(s.shop.offer);let next=advance(s,1);assert.deepEqual(next.shop.offer,offer);next=fill(next,{progress:65});assert.equal(next.core.casks.length,1);assert.deepEqual(next.shop.offer,offer);assert.deepEqual(exact(next),next);
});

test('acceptance persists the relationship without exchanging bottles, cash or reputation',()=>{
 const s=offered(),before=JSON.stringify(s),next=D.acceptShop(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(next.core,s.core);assert.deepEqual(next.releases,s.releases);assert.deepEqual(next.records,s.records);assert.deepEqual(brandReputation(next,1),brandReputation(s,1));assert.equal(next.shop.offer,null);assert.equal(next.shop.relations.length,1);assert.equal(next.shop.relations[0].brandId,1);assert.equal(next.shop.relations[0].startedMonth,s.core.month);assert.throws(()=>D.acceptShop(next));assert.deepEqual(exact(next),next);
});

test('declining is harmless and the same brand can receive another opportunity after twelve months',()=>{
 const s=offered(),next=D.declineShop(s);assert.deepEqual(next.core,s.core);assert.deepEqual(brandReputation(next,1),brandReputation(s,1));assert.equal(next.shop.relations.length,0);assert.equal(next.shop.offer,null);assert.equal(next.shop.declinedUntil[1],s.core.month+12);let later=advance(next,11);assert.equal(later.shop.offer,null);for(let i=0;i<4&&!later.shop.offer;i++)later=advance(later,1);assert(later.core.month>=s.core.month+12);assert.equal(later.shop.offer?.brandId,1);assert.equal(later.shop.offer.id,s.shop.offer.id+1);assert.deepEqual(exact(later),later);
});

for(const count of [5,10])test(`${count}-bottle delivery transfers exactly one paid inventory allocation and preserves retail reputation`,()=>{
 const s=accepted(),p=stocked(s),q=D.shopQuote(s,p.id),before=JSON.stringify(s),rep=brandReputation(s,1),factors=retailReputationFactors(s),evidence=D.offerEvidence(s),next=D.deliverShop(s,p.id,count),a=next.core.products.find(x=>x.id===p.id),r=s.releases.find(x=>x.productId===p.id),nr=next.releases.find(x=>x.id===r.id);
 assert.equal(JSON.stringify(s),before);assert.equal(a.stock,p.stock-count);assert.equal(a.sold,p.sold+count);assert.equal(a.revenue,round(p.revenue+q.unitPrice*count));assert.equal(next.core.cash,round(s.core.cash+q.unitPrice*count));assert.equal(next.core.totals.revenue,round(s.core.totals.revenue+q.unitPrice*count));assert.equal(next.core.totals.bottlesSold,s.core.totals.bottlesSold+count);
 assert.equal(nr.sold,r.sold);assert.equal(nr.revenue,r.revenue);assert.equal(nr.delivered,count);assert.equal(nr.deliveryRevenue,round(count*q.unitPrice));assert.deepEqual(brandReputation(next,1),rep);assert.deepEqual(retailReputationFactors(next),factors);assert.deepEqual(D.offerEvidence(next),evidence);assert.equal(D.shopBrandStats(next,1).bottles,count);assert.equal(D.shopBrandStats(next,1).revenue,round(count*q.unitPrice));assert.equal(brandStats(next,1).stock,brandStats(s,1).stock-count);balances(next);assert.deepEqual(exact(next),next);
});

test('buyout pays eighty percent of the lower of current and standard retail price',()=>{
 const base=accepted(),id=stocked(base).id;
 for(const tier of ['low','standard','high']){const s=D.setSalePrice(base,tier,id),p=s.core.products.find(p=>p.id===id),prices=D.salePrices(s,id),q=D.shopQuote(s,id);assert.equal(q.unitPrice,round(.8*Math.min(p.price,prices.standard)));assert(q.unitPrice<p.price);assert(q.quantities.includes(5));}
 const high=D.shopQuote(D.setSalePrice(base,'high',id),id),standard=D.shopQuote(D.setSalePrice(base,'standard',id),id);assert.equal(high.unitPrice,standard.unitPrice,'raising a shelf price cannot inflate the buyout');
});

test('monthly ten-bottle cap spans every release of the same brand and resets only with the month',()=>{
 let s=accepted();s=advance(s,1);s=release(s,{age:0,progress:65,selection:{brandId:1},tier:'low'});const ids=s.core.products.filter(p=>p.stock>=10&&s.productsById[p.id]?.listed).map(p=>p.id);assert(ids.length>=2);
 s=D.deliverShop(s,ids[0],5);assert.deepEqual(D.shopQuote(s,ids[1]).quantities,[5]);s=D.deliverShop(s,ids[1],5);for(const id of ids)assert.equal(D.shopQuote(s,id).ok,false);assert.throws(()=>D.deliverShop(s,ids[0],5));assert.equal(D.shopBrandStats(s,1).bottles,10);s=advance(s,1);assert.equal(D.shopQuote(s,ids[1]).remaining,10);assert(D.shopQuote(s,ids[1]).quantities.includes(10));balances(s);assert.deepEqual(exact(s),s);
});

test('invalid, fractional, stale and unhandled products never deduct stock or generate money',()=>{
 const s=accepted(),p=stocked(s),raw=JSON.stringify(s);
 for(const [id,count] of [[p.id,0],[p.id,-1],[p.id,1],[p.id,6],[p.id,11],[p.id,1.5],[p.id,'5'],[99999,5]])assert.throws(()=>D.deliverShop(s,id,count));assert.equal(JSON.stringify(s),raw);const done=D.deliverShop(s,p.id,10),doneRaw=JSON.stringify(done);assert.throws(()=>D.deliverShop(done,p.id,10));assert.equal(JSON.stringify(done),doneRaw);
 const without=offered();assert.equal(D.shopQuote(without,p.id).ok,false);assert.throws(()=>D.deliverShop(without,p.id,5));
});

test('only a genuine short remainder is offered when fewer than five bottles remain',()=>{
 let s=advance(accepted(),1);s=release(s,{age:0,progress:30,selection:{brandId:1},tier:'low'});const id=s.releases.at(-1).productId;for(let i=0;i<40;i++){const p=s.core.products.find(p=>p.id===id);assert(p&&p.stock>0);if(p.stock<5){const q=D.shopQuote(s,id);assert.deepEqual(q.quantities,[p.stock]);const n=p.stock;s=D.deliverShop(s,id,n);assert.equal(s.core.products.find(x=>x.id===id).stock,0);assert.throws(()=>D.deliverShop(s,id,5));balances(s);assert.deepEqual(exact(s),s);return;}s=advance(s,1);}assert.fail('legal retail sales should reach a small remainder');
});

test('delivered bottles never sell a second time and completed relationships survive shelf pruning and reissue',()=>{
 let s=accepted(),p=stocked(s),id=p.id;s=D.deliverShop(s,id,10);const relation=structuredClone(s.shop.relations),history=structuredClone(s.shop.deliveries),bottles=p.originalStock;
 s=advance(s,60);const r=s.releases.find(r=>r.productId===id);assert.equal(r.sold+r.delivered,bottles);assert.equal(r.status,'sold-out');assert.equal(D.shopBrandStats(s,1).bottles,10);assert.deepEqual(s.shop.relations,relation);assert.deepEqual(s.shop.deliveries,history);const paid=s.core.totals.revenue;s=advance(s,2);assert.equal(s.core.totals.revenue,paid,'empty shelves cannot replay a delivery');
 s=release(s,{age:0,progress:65,selection:{brandId:1},tier:'standard'});assert(!s.core.products.some(p=>p.id===id),'old mirror is pruned');assert.deepEqual(s.shop.relations,relation);assert.deepEqual(s.shop.deliveries,history);assert.equal(s.shop.offer,null);const newer=s.releases.at(-1);assert.equal(newer.brandId,1);assert(D.shopQuote(s,newer.productId).ok);s=D.deliverShop(s,newer.productId,5);assert.equal(D.shopBrandStats(s,1).bottles,15);assert.equal(s.releases.find(r=>r.productId===id).sold,r.sold);balances(s);assert.deepEqual(exact(s),s);
});

test('a newly released second brand cannot inherit the first brand shop or sales evidence',()=>{
 let s=accepted();s=advance(s,1);s=release(s,{age:0,progress:65,selection:{name:'夕凪'},tier:'standard'});const r=s.releases.at(-1);assert.equal(r.brandId,2);assert.equal(D.shopBrandStats(s,2),null);assert.equal(D.shopEvidence(s,2).sold,0);assert.equal(D.shopEvidence(s,2).eligible,false);assert.equal(D.shopQuote(s,r.productId).ok,false);assert.throws(()=>D.deliverShop(s,r.productId,5));assert.equal(D.shopBrandStats(s,1).brandId,1);assert.deepEqual(exact(s),s);
});

test('accepting and delivering during manual extraction records unlogged progress for deterministic replay',()=>{
 let s=offered();s=advance(s,1);s=D.startDistillation(s);for(let i=0;i<37;i++)s=D.distillStep(s);s=D.acceptShop(s);assert.deepEqual(s.operations.at(-1),{key:'accept-shop',value:{progress:37}});assert.deepEqual(exact(s),s);for(let i=0;i<8;i++)s=D.distillStep(s);const id=stocked(s).id;s=D.deliverShop(s,id,5);assert.equal(s.operations.at(-1).value.progress,45);assert.deepEqual(exact(s),s);s=D.fillBarrel(D.stopDistillation(s),'refill');balances(s);assert.deepEqual(exact(s),s);
});

test('one-shot usual brewing continues in parallel with retail sales and a passive shop offer',()=>{
 let s=advance(offered(),1);const before=s.core.casks.length;s=D.beginUsual(D.reserveUsual(s));for(let i=0;i<30;i++)s=D.distillStep(s);s=D.acceptShop(s);const id=stocked(s).id;s=D.deliverShop(s,id,5);assert.deepEqual(exact(s),s);const sold=s.releases.reduce((n,r)=>n+r.sold,0);s=advance(s,1);assert(s.releases.reduce((n,r)=>n+r.sold,0)>sold);while(s.usual.reservation)s=D.distillStep(s);assert.equal(s.core.casks.length,before+1);assert.equal(s.still.phase,'ready');assert.equal(s.usual.reservation,null);const after=s.core.totals.costs;for(let i=0;i<100;i++)s=D.distillStep(s);assert.equal(s.core.totals.costs,after);assert.deepEqual(exact(s),s);
});

test('two independently earned brand relationships keep their own history and delivery allowance',()=>{
 let s=advance(accepted(),1);s=release(s,{age:6,progress:65,selection:{name:'夕凪'},tier:'low'});s=advance(s,1);s=release(s,{age:6,progress:65,selection:{brandId:2},tier:'low'});for(let i=0;i<30&&!s.shop.offer;i++)s=advance(s,1);assert.equal(s.shop.offer?.brandId,2);const first=structuredClone(D.shopBrandStats(s,1));s=D.acceptShop(s);assert.equal(s.shop.relations.length,2);assert.deepEqual(D.shopBrandStats(s,1),first);const secondId=s.releases.filter(r=>r.brandId===2).at(-1).productId;s=D.deliverShop(s,secondId,10);assert.equal(D.shopBrandStats(s,2).bottles,10);assert.deepEqual(D.shopBrandStats(s,1),first);
 s=advance(s,1);s=release(s,{age:0,progress:65,selection:{brandId:1},tier:'standard'});const firstId=s.releases.at(-1).productId;s=D.deliverShop(s,firstId,10);assert.equal(D.shopBrandStats(s,1).bottles,10);assert.equal(D.shopBrandStats(s,2).bottles,10);assert.equal(s.shop.deliveries[0].brandId,2);assert.equal(s.shop.deliveries[1].brandId,1);balances(s);assert.deepEqual(exact(s),s);
});

test('tasting has priority over shop decisions and deliveries without losing the relationship or offer',()=>{
 let offeredState=advance(offered(),1);offeredState=fill(offeredState,{progress:65});offeredState=advance(offeredState,1);offeredState=D.sampleDistillery(offeredState,offeredState.core.casks.at(-1).id);const offer=structuredClone(offeredState.shop.offer),raw=JSON.stringify(offeredState);assert.throws(()=>D.acceptShop(offeredState));assert.throws(()=>D.declineShop(offeredState));assert.deepEqual(offeredState.shop.offer,offer);assert.equal(D.tickDistillery(offeredState),offeredState);assert.equal(JSON.stringify(offeredState),raw);
 const s=D.acceptShop(D.endTasting(offeredState)),id=s.core.products.find(p=>p.stock>0).id,tasting=D.sampleDistillery(s,s.core.casks.at(-1).id);assert.equal(D.shopQuote(tasting,id).ok,false);assert.deepEqual(D.shopQuote(tasting,id).quantities,[]);assert.throws(()=>D.deliverShop(tasting,id,5));assert.deepEqual(exact(tasting),tasting);
});
