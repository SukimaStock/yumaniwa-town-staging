import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {buildDistilleryHistory} from '../distillery-history.mjs';
import {fill,advance,resolve} from './brands-helpers.mjs';
const fresh=()=>fill(D.newDelegatedDistillery(42),{progress:65,type:'refill'});
const id=s=>s.core.casks.at(-1).id;
const cold=s=>{const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return s;};
const unchanged=(s,fn)=>{const raw=JSON.stringify(s);assert.throws(fn);assert.equal(JSON.stringify(s),raw);};
function sellPortions(){let s=fresh(),cask=id(s);s=advance(s,12);for(let i=0;i<3;i++){s=D.bottleBranded(s,cask,{},14);s=D.listBottles(s,s.result.productId);s=advance(s,2);}return s;}
function acceptOffers(s){while(s.shop.offer){const o=s.shop.offer;s=D.acceptShop(s,o.shopId,o.id);}return s;}

test('new v20 has exactly AmberTime, no wholesale activation and old v19 factory stays old',()=>{
 let s=D.newDelegatedDistillery(42);assert(D.delegationMode(s)&&D.partialMode(s)&&D.staffMode(s));assert.equal(s.brands.length,1);assert.equal(s.brands[0].name,'AmberTime');assert.equal(D.newPartialDistillery(42).version,19);unchanged(s,()=>D.acceptOffer(s));unchanged(s,()=>D.assignCask(s,2,'none'));s=advance(s,3);assert.equal(s.trade.offer,null);assert.deepEqual(s.trade.contracts,[]);cold(s);
});
test('single brand creates independent portions and disallows new brand selection',()=>{
 let s=fresh(),c=id(s);unchanged(s,()=>D.bottleBranded(s,c,{name:'other'},1));s=D.bottleBranded(s,c,{},2);s=D.bottleBranded(s,c,{brandId:1},3);assert.equal(s.brands.length,1);assert.equal(s.releases.length,2);assert(s.releases.every(r=>r.brandId===1&&r.caskId===c));assert.equal(s.core.products.reduce((n,p)=>n+p.stock,0),5);cold(s);
});
test('age automation is one transaction, fixed partial quantity, standard listing and remains aging',()=>{
 let s=fresh(),c=id(s);s=D.reserveBottling(s,c,{mode:'age',age:24,count:10});s=advance(s,24);assert.equal(s.releases.length,1);assert.equal(s.releases[0].age,24);assert.equal(s.releases[0].bottles,10);assert(s.core.casks.find(x=>x.id===c));assert.equal(D.bottlingReservation(s,c).status,'completed');assert(s.productsById[s.result.productId].listed);assert.equal(s.automation.lastBottlings[0].cost,30);assert.equal(s.operations.at(-1).key,'month');assert(!s.operations.some(o=>o.key==='bottle-counted-branded'));s=advance(s,2);assert.equal(s.releases.length,1);assert.equal(s.core.casks[0].age,26);cold(s);
});
test('stock repeat rearms only after stock rises above threshold; never two executions in one month',()=>{
 let s=fresh(),c=id(s);s=D.reserveBottling(s,c,{mode:'stock',threshold:5,count:10});s=advance(s,1);assert.equal(s.releases.length,1);const first=s.core.products[0];s=advance(s,1);assert.equal(s.releases.length,1);assert(first.stock>5);s=advance(s,1);assert.equal(s.releases.length,2);assert.equal(s.automation.lastBottlings.length,1);assert.equal(s.releases[0].bottles,10);assert.equal(s.releases[1].bottles,10);assert.notEqual(s.releases[0].bottledMonth,s.releases[1].bottledMonth);cold(s);
 s=fresh();c=id(s);s=D.reserveBottling(s,c,{mode:'stock',threshold:5,count:1});s=advance(s,8);assert.equal(s.releases.length,1);assert.equal(D.bottlingReservation(s,c).armed,false);cold(s);
});
test('unrelated parent inventory cannot trigger a stock reservation and reference must match parent',()=>{
 let s=fresh(),c=id(s);s=D.bottleBranded(s,c,{},10);const release=s.releases[0];s=advance(s,1);s=fill(s,{progress:65});const other=id(s);unchanged(s,()=>D.reserveBottling(s,other,{mode:'stock',threshold:5,count:10,releaseId:release.id}));s=D.bottleBranded(s,other,{},10);s=D.listBottles(s,s.result.productId);s=D.reserveBottling(s,c,{mode:'stock',threshold:5,count:10});s=advance(s,6);assert.equal(s.releases.filter(r=>r.caskId===c).length,1);assert.equal(s.core.products.find(p=>p.id===release.productId).stock,10);assert.equal(s.core.products.find(p=>p.sourceId===other).stock,0);cold(s);
});
test('pause, resume, cancel and switching to manual preserve quantities and replay',()=>{
 let s=fresh(),c=id(s);s=D.reserveBottling(s,c,{mode:'age',age:2,count:10});s=D.pauseBottling(s,c);s=advance(s,3);assert.equal(s.releases.length,0);assert.equal(D.bottlingReservation(s,c).status,'paused');cold(s);s=D.pauseBottling(s,c,false);s=advance(s,1);assert.equal(s.releases.length,1);s=D.reserveBottling(s,c,{mode:'stock',threshold:5,count:10});s=D.cancelBottling(s,c);assert.equal(D.bottlingReservation(s,c),null);s=D.bottleBranded(s,c,{},1);assert.equal(s.releases.length,2);cold(s);
});
test('insufficient liquid and cash never resize the requested batch or consume it',()=>{
 let s=fresh(),c=id(s);s=D.reserveBottling(s,c,{mode:'age',age:1,count:57});s=advance(s,2);assert.equal(s.releases.length,0);assert.equal(D.bottlingReservation(s,c).lastError,'原酒不足');cold(s);
 const poor=structuredClone(s);poor.core.cash=1;const n=D.tickDistillery(poor);assert.equal(n.releases.length,0);assert.equal(n.core.cash,1);assert(n.decisions.some(d=>d.eventId==='funds'));
});
test('reservation values and saved receipts reject forgery without mutating input',()=>{
 let s=fresh(),c=id(s);for(const o of [{mode:'age',age:1,count:0},{mode:'age',age:-1,count:1},{mode:'stock',threshold:-1,count:1},{mode:'stock',threshold:5,count:1,age:3},{mode:'age',age:3,count:1,extra:1}])unchanged(s,()=>D.reserveBottling(s,c,o));s=D.reserveBottling(s,c,{mode:'age',age:3,count:10});s=advance(s,3);for(const edit of [x=>x.automation.reservations[0].count++,x=>x.automation.lastBottlings[0].count++,x=>x.core.cash++,x=>x.releases[0].brandId=2,x=>x.brands[0].name='Other']){const bad=structuredClone(s);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}cold(s);
});
test('normal shops auto ship shared stock deterministically, log paid receipt and respect age/capacity',()=>{
 let s=acceptOffers(sellPortions());assert(s.shop.relations.some(r=>r.shopId==='town-liquor'));s=fill(s,{progress:65});let c=id(s);s=D.bottleBranded(s,c,{},20);const pid=s.result.productId,before=s.core.cash;s=advance(s,1);const p=s.core.products.find(x=>x.id===pid),ship=s.automation.lastShipments.filter(x=>x.productId===pid);assert.equal(ship.reduce((n,d)=>n+d.count,0),10);assert.equal(p.stock,10);assert.equal(p.sold,10);assert.equal(s.core.cash,before-s.core.lastMonth.upkeep+ship.reduce((n,d)=>n+d.revenue,0));assert.equal(ship[0].shopId,'town-liquor');assert(!ship.some(d=>d.shopId==='supermarket'));assert.equal(s.core.lastMonth.revenue,ship.reduce((n,d)=>n+d.revenue,0));assert.equal(s.releases.find(r=>r.productId===pid).sold,0);const facts=D.nearbyComparisonFacts(s,{productIds:[pid]}).products[0];assert.equal(facts.firstSaleMonth,null);assert.deepEqual(facts.retailPriceTotals,[]);assert(!buildDistilleryHistory(s).events.some(e=>e.kind==='retail-first-sale'&&e.productId===pid));cold(s);const copy=D.restoreDistillery(D.serializeDistillery(s));assert.equal(D.serializeDistillery(advance(s,1)),D.serializeDistillery(advance(copy,1)));
});


test('department remains a manual exact-release five-bottle offer with age/flavor and paid stock receipt',()=>{
 let s=acceptOffers(sellPortions());s=D.bottleBranded(s,2,{},D.quote(s,2).count);s=D.listBottles(s,s.result.productId);s=advance(s,2);s=fill(s,{progress:65,type:'bourbon'});s=advance(s,24);const c=id(s);s=D.bottleBranded(s,c,{},20);const target=s.result.productId;s=advance(s,1);const o=s.shop.offer;assert.equal(o.shopId,'department');assert.equal(s.releases.find(r=>r.productId===target).id,o.sourceReleaseId);assert(!s.automation.lastShipments.some(d=>d.shopId==='department'));s=D.acceptShop(s,o.shopId,o.id);s=D.bottleBranded(s,c,{},5);const other=s.result.productId;assert.equal(D.shopQuote(s,other,'department').ok,false);const q=D.shopQuote(s,target,'department');assert(q.ok);assert.deepEqual(q.quantities,[5]);const before=s.core.cash,stock=s.core.products.find(p=>p.id===target).stock;s=D.deliverShop(s,target,5,'department',q.selectionId);assert.equal(s.core.products.find(p=>p.id===target).stock,stock-5);assert.equal(s.core.cash,Math.round((before+q.unitPrice*5)*100)/100);assert.equal(s.department.adoptions.at(-1).releaseId,o.sourceReleaseId);assert.equal(D.shopQuote(s,target,'department').ok,false);cold(s);
});


test('retail, town shop and supermarket consume one shared stock in fixed order including short supply',()=>{
 let s=sellPortions();s=D.bottleBranded(s,2,{},D.quote(s,2).count);s=D.listBottles(s,s.result.productId);s=advance(s,2);s=fill(s,{progress:65});s=advance(s,12);let c=id(s);s=D.bottleBranded(s,c,{},D.quote(s,c).count);s=D.listBottles(s,s.result.productId);s=advance(s,6);s=acceptOffers(s);assert(s.shop.relations.some(r=>r.shopId==='supermarket'));s=fill(s,{progress:65,type:'bourbon'});s=advance(s,24);c=id(s);s=D.bottleBranded(s,c,{},34);const pid=s.result.productId;s=D.listBottles(s,pid);const before=structuredClone(s),cash=s.core.cash;s=advance(s,1);const retail=s.core.lastMonth.sales.filter(x=>!x.channel).reduce((n,d)=>n+d.sold,0),ships=s.automation.lastShipments.filter(x=>x.productId===pid);assert.deepEqual(ships.map(x=>x.shopId),['town-liquor','supermarket']);assert.equal(ships[0].count,10);assert.equal(ships[1].count,34-retail-10);assert(ships[1].count<10&&ships[1].count>0);assert.equal(s.core.products.find(p=>p.id===pid).stock,0);assert.equal(s.core.products.find(p=>p.id===pid).sold,34);assert.equal(s.core.lastMonth.bottles,34);assert.equal(s.core.cash,Math.round((cash+s.core.lastMonth.revenue-s.core.lastMonth.upkeep)*100)/100);assert(!ships.some(x=>x.shopId==='department'));assert(![s.shop.offer,...s.shop.pendingOffers].some(o=>o?.shopId==='department'));assert.equal(D.serializeDistillery(advance(before,1)),D.serializeDistillery(s));cold(s);
});


test('comparison receipts retain first listing date across later months and price edits',()=>{
 let s=fresh();s=D.bottleBranded(s,id(s),{},10);const p=s.result.productId,month=s.core.month;s=D.listBottles(s,p);s=advance(s,1);s=D.setSalePrice(s,'high',p);s=advance(s,1);const f=D.nearbyComparisonFacts(s,{productIds:[p]}).products[0];assert.equal(f.listedMonth,month);assert.equal(f.firstSaleMonth,month+1);cold(s);
});
