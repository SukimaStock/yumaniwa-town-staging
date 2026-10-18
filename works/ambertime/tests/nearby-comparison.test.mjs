import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs?v=0.18-nearby';
import {advance,fill,release} from './brands-helpers.mjs';
import {twoManualRecipes,manualCareer} from './recipe-helpers.mjs';
import {interested,product} from './department-helpers.mjs';
import {nearbyCasks,previousRelease,releasePair,sourceDetails} from '../nearby-comparison.mjs';
const round=n=>Math.round(n*100)/100;
const receipt=(s,id)=>D.nearbyComparisonFacts(s,{productIds:[id]}).products[0];

function coldFacts(s,query){
 const raw=D.serializeDistillery(s),facts=D.nearbyComparisonFacts(s,query);
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs?v=0.18-nearby',import.meta.url).href)};process.stdout.write(JSON.stringify(D.nearbyComparisonFacts(D.restoreDistillery(fs.readFileSync(0,'utf8')),${JSON.stringify(query)})));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),JSON.stringify(facts));
 assert.equal(D.serializeDistillery(s),raw);
 return facts;
}

test('targeted receipts distinguish stored time, retail exposure and first actual sale',()=>{
 let s=fill(D.newRecipeDistillery(42),{progress:65});s=advance(s,12);
 s=D.bottleBranded(s,s.core.casks[0].id,{name:'川霧'});const id=s.result.productId;
 s=advance(s,4);let r=receipt(s,id);
 assert.equal(r.complete,true);assert.equal(r.listed,false);assert.equal(r.listedMonth,null);assert.equal(r.retailActiveMonths,0);assert.equal(r.firstSaleMonth,null);assert.deepEqual(r.retailPriceTotals,[]);
 const listedMonth=s.core.month;s=D.listBottles(s,id);r=receipt(s,id);
 assert.equal(r.listedMonth,listedMonth);assert.equal(r.retailActiveMonths,0);assert.equal(r.firstSaleMonth,null);
 s=advance(s,2);r=receipt(s,id);assert.equal(r.retailActiveMonths,2);assert.equal(r.firstSaleMonth,listedMonth+1);assert.equal(r.lastSaleMonth,listedMonth+2);
 s=advance(s,60);r=coldFacts(s,{productIds:[id]}).products[0];assert.equal(r.stock,0);assert(r.retailActiveMonths<62);assert(r.lastSaleMonth<s.core.month);
});

test('actual receipt prices remain period-specific after subsequent price changes',()=>{
 let s=release(D.newRecipeDistillery(42),{age:12,selection:{name:'川霧'},tier:'low'}),id=s.result.productId;
 const low=s.core.products.find(p=>p.id===id).price;s=advance(s,1);
 s=D.setSalePrice(s,'high',id);const high=s.core.products.find(p=>p.id===id).price;s=advance(s,1);
 const r=coldFacts(s,{productIds:[id]}).products[0],edition=s.releases.find(x=>x.productId===id);
 assert.notEqual(low,high);assert.equal(r.currentPrice,high);
 assert(r.priceChanges.some(p=>p.price===low));assert(r.priceChanges.some(p=>p.price===high&&!p.initial));
 assert.equal(r.retailPriceTotals.reduce((n,p)=>n+p.count,0),edition.sold);
 assert.equal(round(r.retailPriceTotals.reduce((n,p)=>n+p.revenue,0)),edition.revenue);
 assert.notEqual(round(high*edition.sold),edition.revenue);
 const unchanged=D.setSalePrice(s,'high',id);assert.deepEqual(receipt(unchanged,id).priceChanges,r.priceChanges);
});

test('failed or blocked monthly operations do not invent retail exposure',()=>{
 let s=release(D.newRecipeDistillery(42),{age:12,selection:{name:'川霧'}}),id=s.result.productId;
 const before=receipt(s,id),raw=D.serializeDistillery(s);
 assert.throws(()=>D.tickDistillery(s,s.core.month-1));assert.equal(D.serializeDistillery(s),raw);assert.deepEqual(receipt(s,id),before);
 s=fill(s,{progress:65});s=D.sampleDistillery(s,s.core.casks.at(-1).id);
 const month=s.core.month,r=receipt(s,id);const stopped=D.tickDistillery(s);
 assert.equal(stopped.core.month,month);assert.deepEqual(receipt(stopped,id),r);
});

test('targeted facts are detached and forged game data still fails strict replay',()=>{
 const {s,first}=twoManualRecipes(),query={caskIds:[first],includeManualSources:true};
 const raw=D.serializeDistillery(s),facts=coldFacts(s,query);
 assert.equal(facts.casks[0].stopAt,35);assert.equal(facts.casks[0].manual,true);
 facts.casks[0].stopAt=999;facts.manualSources[0].type='forged';
 assert.equal(D.nearbyComparisonFacts(s,query).casks[0].stopAt,35);assert.equal(D.serializeDistillery(s),raw);
 const bad=structuredClone(s);bad.core.casks[0].roughness+=0.01;
 assert.throws(()=>D.nearbyComparisonFacts(bad,query));assert.equal(D.serializeDistillery(s),raw);
});

test('selected recipes, reservation, tasting and existing decisions are unchanged by repeated reads',()=>{
 let {s,first}=twoManualRecipes();s=advance(s,1);s=D.selectRecipe(s,'recipe-'+first);s=D.reserveUsual(s);s=D.sampleDistillery(s,first);
 const raw=D.serializeDistillery(s),query={caskIds:s.core.casks.map(c=>c.id),includeManualSources:true};
 for(let i=0;i<4;i++)D.nearbyComparisonFacts(s,query);
 assert.equal(D.serializeDistillery(s),raw);assert.equal(s.tastingId,first);assert.equal(s.usual.reservation.status,'queued');assert.equal(s.recipeBook.selectedId,'recipe-'+first);
});

test('shop receipts never enter retail price totals',()=>{
 let s=D.enableRecipeBook(interested()),id=product(s),before=receipt(s,id);
 s=D.deliverShop(s,id,5,'town-liquor');s=D.deliverShop(s,id,5,'department',D.shopQuote(s,id,'department').selectionId);
 const after=coldFacts(s,{productIds:[id]}).products[0];
 assert.deepEqual(after.retailPriceTotals,before.retailPriceTotals);assert.equal(after.retailActiveMonths,before.retailActiveMonths);assert.equal(after.stock,before.stock-10);
});

test('missing pre-origin source history is incomplete rather than inferred from flavor',()=>{
 const s=D.restoreDistillery(fs.readFileSync(new URL('./fixtures/v09-due.json',import.meta.url),'utf8'));
 const facts=coldFacts(s,{productIds:s.core.products.map(p=>p.id),caskIds:s.core.casks.map(c=>c.id),includeManualSources:true});
 assert.equal(facts.coverage.complete,false);assert.equal(facts.coverage.fromMonth,s.origin.core.month);assert.deepEqual(facts.manualSources,[]);
 assert.deepEqual(facts.casks,[]);assert(facts.products.every(r=>!r.complete));
});

test('nearby casks retain physical order, independent profiles and exact observed extraction',()=>{
 let {s,first,second}=twoManualRecipes();const raw=D.serializeDistillery(s),a=nearbyCasks(s);
 assert.equal(a.length,2);assert.deepEqual(a.map(c=>c.caskId),[first,second]);assert.deepEqual(a.map(c=>c.position),[1,2]);
 assert.deepEqual(a.map(c=>c.stopAt),[35,85]);assert.deepEqual(a.map(c=>c.type),['refill','bourbon']);
 for(const c of a){const actual=s.core.casks.find(x=>x.id===c.caskId);assert.deepEqual(c.profile,{roughness:actual.roughness,character:actual.character,wood:actual.wood});assert.equal(c.litres,actual.litres);assert.equal(c.manualSource.caskId,c.caskId);assert.equal(c.status,'aging');}
 a[0].profile.wood=999;assert.notEqual(nearbyCasks(s)[0].profile.wood,999);assert.equal(D.serializeDistillery(s),raw);
});

test('the previous release is the immediate same-brand release even when another brand intervenes',()=>{
 let s=release(D.newRecipeDistillery(42),{age:6,selection:{name:'川霧'},progress:35});const first=structuredClone(s.releases.at(-1));
 assert.equal(previousRelease(s,first.id),null);assert.equal(releasePair(s,first.id),null);assert.equal(releasePair(s,999999),null);
 s=release(s,{age:6,selection:{name:'夕凪'},progress:85});const other=structuredClone(s.releases.at(-1));
 s=release(s,{age:6,selection:{brandId:first.brandId},progress:65});const current=structuredClone(s.releases.at(-1));
 const raw=D.serializeDistillery(s),pair=releasePair(s,current.id);
 assert.equal(previousRelease(s,current.id).id,first.id);assert.equal(pair.current.releaseId,current.id);assert.equal(pair.previous.releaseId,first.id);assert.notEqual(pair.previous.releaseId,other.id);
 assert.equal(pair.current.brandId,pair.previous.brandId);assert.equal(pair.current.releaseNumber,2);assert.equal(pair.previous.releaseNumber,1);assert.notEqual(pair.current.productId,pair.previous.productId);
 assert.equal(pair.current.stopAt,65);assert.equal(pair.previous.stopAt,35);assert.equal(pair.previous.status,'sold-out');
 pair.current.brand.name='forged';pair.previous.profile.wood=999;assert.equal(D.serializeDistillery(s),raw);assert.equal(releasePair(s,current.id).current.brandName,'川霧');
});

test('release summaries separate retail denominator and shop deliveries from stock consumption',()=>{
 let s=D.enableRecipeBook(interested()),id=product(s);s=D.deliverShop(s,id,5,'town-liquor');s=D.deliverShop(s,id,5,'department',D.shopQuote(s,id,'department').selectionId);
 const r=s.releases.find(x=>x.productId===id),raw=D.serializeDistillery(s),pair=releasePair(s,r.id),v=pair.current;
 assert.equal(v.retail.count,r.sold);assert.equal(v.retail.revenue,r.revenue);assert.equal(v.shopCount,10);assert.equal(v.retailTargetCount,r.bottles-10);
 assert.equal(v.shops.reduce((n,x)=>n+x.count,0),10);assert.equal(v.retail.count+v.stock+v.shopCount,r.bottles);assert.equal(D.serializeDistillery(s),raw);
});

test('a stored new edition has zero real retail months while its sold-out predecessor keeps its period',()=>{
 let s=release(D.newRecipeDistillery(42),{age:6,selection:{name:'川霧'},tier:'low'});const first=s.releases[0];s=advance(s,6);
 s=fill(s,{progress:65});s=advance(s,6);s=D.bottleBranded(s,s.core.casks[0].id,{brandId:first.brandId});const current=s.releases.at(-1);s=advance(s,3);
 const pair=releasePair(s,current.id);assert.equal(pair.current.status,'stored');assert.equal(pair.current.retail.count,0);assert.equal(pair.current.retailActiveMonths,0);assert.equal(pair.current.listedMonth,null);assert.equal(pair.current.firstSaleMonth,null);
 assert.equal(pair.previous.status,'sold-out');assert(pair.previous.retailActiveMonths>0);assert(pair.previous.retailActiveMonths<s.core.month-first.bottledMonth);assert.equal(pair.current.retailTargetCount,current.bottles);
 s=D.listBottles(s,current.productId);assert.equal(releasePair(s,current.id).current.status,'selling');assert.equal(releasePair(s,current.id).current.retailActiveMonths,0);
});

test('a pruned sold-out edition is still the exact previous release with its source facts',()=>{
 const {s,first}=manualCareer(25),r=s.releases.find(x=>x.caskId===first.caskId),next=s.releases.find(x=>x.brandId===r.brandId&&x.id>r.id);
 assert(!s.records.some(x=>x.caskId===first.caskId));assert(!s.core.archive.some(x=>x.id===first.caskId));
 const raw=D.serializeDistillery(s),pair=releasePair(s,next.id),v=pair.previous;
 assert.equal(v.releaseId,r.id);assert.equal(v.status,'sold-out');assert.equal(v.stock,0);assert.equal(v.stopAt,65);assert.equal(v.manualSource.caskId,first.caskId);assert.equal(v.retail.count,r.sold);assert.equal(v.retailTargetCount,r.bottles);assert(v.retailActiveMonths>0);
 assert.equal(sourceDetails(s,first.caskId).releaseId,r.id);assert.equal(D.serializeDistillery(s),raw);
});

test('new releases after an old origin have exact periods and denominators without repairing older history',()=>{
 let s=D.enableRecipeBook(D.restoreDistillery(fs.readFileSync(new URL('./fixtures/v09-due.json',import.meta.url),'utf8')));
 const oldId=s.core.casks[0].id,oldSource=sourceDetails(s,oldId);assert.equal(oldSource.stopAt,null);assert.equal(oldSource.manualSource,null);
 s=release(s,{age:6,selection:{name:'川霧'},tier:'low'});const first=s.releases.at(-1);s=advance(s,3);
 s=fill(s,{progress:35});const id=s.core.casks.at(-1).id;s=advance(s,6);s=D.bottleBranded(s,id,{brandId:first.brandId});const current=s.releases.at(-1);
 const raw=D.serializeDistillery(s),pair=releasePair(s,current.id);
 assert.equal(pair.current.coverage.complete,false);assert.equal(pair.current.salesComplete,true);assert.equal(pair.current.retailTargetCount,current.bottles);assert.equal(pair.previous.retailTargetCount,first.bottles);assert.equal(pair.current.retailActiveMonths,0);assert(pair.previous.retailActiveMonths>0);
 assert.equal(sourceDetails(s,oldId).stopAt,null);
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs?v=0.18-nearby',import.meta.url).href)};import {releasePair} from ${JSON.stringify(new URL('../nearby-comparison.mjs',import.meta.url).href)};process.stdout.write(JSON.stringify(releasePair(D.restoreDistillery(fs.readFileSync(0,'utf8')),${current.id})));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),JSON.stringify(pair));assert.equal(D.serializeDistillery(s),raw);
 const previous=previousRelease(s,current.id);previous.profile.wood=999;assert.notEqual(previousRelease(s,current.id).profile.wood,999);
});
