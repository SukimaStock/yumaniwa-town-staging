import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {advance,fill,release,exact,resolve} from './brands-helpers.mjs';
import {loadFixture} from './wholesale-care-helpers.mjs';
const identity=s=>assert.equal(Math.round((s.core.cash-1600-s.core.totals.revenue+s.core.totals.costs+s.core.totals.upkeep)*100)||0,0);

test('brands are explicit recorded v8 boundary; v6/v7 saves stay exact',()=>{
 for(const s of [D.newDistillery(1),D.newPromisedDistillery(2),loadFixture('partners-accepted.json')]){
  const raw=JSON.stringify(s),j=D.enableBrands(s);assert.equal(JSON.stringify(s),raw);assert.equal(j.version,8);assert.equal(j.rules,'retail-brands');assert.deepEqual(j.brands,[]);assert.deepEqual(j.releases,[]);assert.deepEqual(exact(j),j);assert.equal(D.enableBrands(j),j);assert.deepEqual(exact(s),s);
 }
});

test('default brand bottles atomically, with durable source and unchanged economics',()=>{
 let s=fill(D.newBrandedDistillery(42));const id=s.core.casks[0].id,old=s;
 const expected=D.bottleNow(s,id),j=D.bottleBranded(s,id);
 assert.deepEqual(j.core,expected.core);assert.deepEqual(s,old);assert.equal(s.core.casks.length,1);
 assert.deepEqual(j.brands,[{id:1,name:'AmberTime 1',bottle:'round',label:'cream',createdMonth:0}]);
 assert.equal(j.releases[0].caskId,id);assert.equal(j.releases[0].price,j.core.products[0].price);assert.equal(j.result.name,'AmberTime 1');assert.equal(j.result.flavorName,expected.result.name);assert.equal(j.result.brandId,1);assert.deepEqual(exact(j),j);identity(j);
});

test('new brand customization is stored once; existing identity is inherited on later release',()=>{
 let s=release(D.newBrandedDistillery(7),{selection:{name:' 川霧 ',bottle:'slender',label:'dark'}});const first=structuredClone(s.releases[0]),brand=structuredClone(s.brands[0]);s=advance(s,12);
 assert.equal(s.releases[0].status,'sold-out');assert.equal(s.releases[0].sold,first.bottles);assert.deepEqual(s.brands[0],brand);
 s=release(s,{selection:{brandId:brand.id},age:12,progress:85,type:'bourbon',tier:'high'});
 assert.equal(s.brands.length,1);assert.equal(s.releases.length,2);assert.equal(s.releases[0].status,'sold-out');assert.equal(s.releases[1].status,'selling');assert.equal(s.releases[1].brandId,brand.id);assert.notEqual(s.releases[0].caskId,s.releases[1].caskId);assert.deepEqual(s.brands[0],brand);assert.deepEqual(exact(s),s);identity(s);
});

test('prices, listing and receipts sync releases exactly; completed releases survive product pruning',()=>{
 let s=release(D.newBrandedDistillery(11),{tier:'low'});s=advance(s,12);const completed=structuredClone(s.releases[0]);assert.equal(completed.status,'sold-out');assert.equal(completed.revenue,s.core.products[0].revenue);assert.equal(completed.sold,completed.bottles);
 s=advance(s,25);s=release(s,{selection:{brandId:1},tier:'high'});assert(!s.core.products.some(p=>p.id===completed.productId));assert.deepEqual(s.releases[0],completed);const second=s.releases[1];assert.equal(second.price,D.salePrices(s,second.productId).high);assert.equal(second.listed,true);s=advance(s,2);assert.equal(s.releases[1].revenue,s.core.products.find(p=>p.id===second.productId).revenue);assert.deepEqual(exact(s),s);identity(s);
});

test('invalid or over-capacity brand creation never consumes cask or money',()=>{
 const s=fill(D.newBrandedDistillery(42)),raw=JSON.stringify(s),id=s.core.casks[0].id;
 for(const selection of [{name:''},{name:'a'.repeat(41)},{name:'a\nb'},{bottle:'unknown'},{label:'unknown'},{brandId:999},{brandId:1,name:'no'},{extra:true}]){assert.throws(()=>D.bottleBranded(s,id,selection));assert.equal(JSON.stringify(s),raw);}
 const full=structuredClone(s);full.releases=Array(512).fill({});assert.throws(()=>D.bottleBranded(full,id),/発売帳/);assert.equal(full.core.cash,s.core.cash);assert.equal(full.core.casks.length,1);
 const brands=structuredClone(s);brands.brands=Array.from({length:128},(_,i)=>({id:i+1,name:'Brand',bottle:'round',label:'cream',createdMonth:0}));assert.throws(()=>D.bottleBranded(brands,id),/銘柄帳/);assert.doesNotThrow(()=>D.bottleBranded(brands,id,{brandId:1}));
});

test('wholesale remains brand-free, including simultaneous deliveries and exact restore',()=>{
 let s=D.enableBrands(loadFixture('partners-accepted.json'));const original=structuredClone(s);assert.throws(()=>D.bottleBranded(s,s.trade.contracts[0].caskId),/卸売/);assert.deepEqual(s,original);
 let shipments=0;for(let i=0;i<20;i++){s=resolve(s);s=D.tickDistillery(s);shipments+=s.trade.lastShipments.length;}
 assert.equal(shipments,2);assert.deepEqual(s.brands,[]);assert.deepEqual(s.releases,[]);assert(s.records.some(r=>r.channel==='wholesale'));assert.deepEqual(exact(s),s);identity(s);
});

test('branding activation honors operation capacity without mutating previous saves',()=>{
 const s=D.newPromisedDistillery(1);s.operations=Array(12000).fill({key:'x'});const raw=JSON.stringify(s);assert.throws(()=>D.enableBrands(s),/帳面/);assert.equal(JSON.stringify(s),raw);
 const v6=D.newDistillery(1);v6.operations=Array(11999).fill({key:'x'});const before=JSON.stringify(v6);assert.throws(()=>D.enableBrands(v6),/帳面/);assert.equal(JSON.stringify(v6),before);
});

test('multiple seeds retain brand and release identity over consecutive bottling/sales cycles',()=>{
 for(const seed of [1,2,3,4,5,6,7,8,9,10,42,20261017]){
  let s=D.newBrandedDistillery(seed);for(let cycle=0;cycle<3;cycle++){s=release(s,{selection:cycle?{brandId:1}:{},progress:[40,65,90][cycle],type:cycle%2?'bourbon':'refill',age:6,tier:cycle%2?'high':'low'});s=advance(s,12);s=exact(s);identity(s);}
  assert.equal(s.brands.length,1);assert.equal(s.releases.length,3);assert(s.releases.every(r=>r.status==='sold-out'&&r.bottles===r.sold));assert.equal(new Set(s.releases.map(r=>r.productId)).size,3);
 }
});

test('active tasting survives brand activation and same-month sample replay',()=>{
 let old=fill(D.newPromisedDistillery(19));const id=old.core.casks[0].id;old=D.sampleDistillery(old,id);const raw=JSON.stringify(old);let s=D.enableBrands(old);assert.equal(JSON.stringify(old),raw);assert.equal(s.tastingId,id);assert.deepEqual(exact(s),s);s=D.endTasting(s);s=D.bottleBranded(s,id,{name:'<川霧 & malt>'});assert.equal(s.brands[0].name,'<川霧 & malt>');assert.deepEqual(exact(s),s);
});

test('legacy products and records are retained without invented brands on activation',()=>{
 let s=fill(D.newPromisedDistillery(21));s=D.bottleNow(s,s.core.casks[0].id);const record=structuredClone(s.result),core=structuredClone(s.core);s=D.enableBrands(s);assert.deepEqual(s.core,core);assert.deepEqual(s.result,record);assert.deepEqual(s.brands,[]);assert.deepEqual(s.releases,[]);assert.deepEqual(exact(s),s);
});
