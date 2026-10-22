import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {fill as legacyFill,advance as legacyAdvance} from './brands-helpers.mjs';
import {createTown,recordBottle,receiveActual,advanceTown,townNews,townAffinity,NODES} from '../town-connection.mjs';
function bottle(id=1,primary='fruit',bottles=24){return {id,productId:id+10,bottles,age:36,price:30,flavorName:'同じ表示名',profile:{roughness:.3,character:.78,wood:.2,flavor:{version:1,label:'同じ表示名',primary,profile:{fruit:.78,grain:.4,smoke:.2,body:.3,spice:.1,rough:.3,wood:.2,vanilla:.1}}}};}

test('without factual receipts there is no propagation or autonomous supply',()=>{
 const s=createTown(20261021,48);recordBottle(s,bottle());advanceTown(s,1300);
 assert.equal(s.month,1300);assert.equal(s.releases.length,1);assert.equal(s.shipments.length,0);assert.equal(s.arrivals.length,0);assert.deepEqual(s.pending,[]);assert.equal(s.events.filter(e=>e.type==='generation'||e.type==='trade').length,0);assert.equal(Object.hasOwn(s,'inventory'),false);
});
test('small family supplement differs by place, leaves three axes and legacy inputs intact',()=>{
 const fruit=bottle(1,'fruit'),smoke=bottle(2,'smoke'),grain=bottle(3,'grain'),body=bottle(4,'body');
 assert.equal(townAffinity('diner',fruit).fit-townAffinity('diner',smoke).fit,.12);
 assert.equal(townAffinity('bar',smoke).fit-townAffinity('bar',fruit).fit,.12);
 assert.ok(townAffinity('town-liquor',grain).fit>townAffinity('town-liquor',fruit).fit);
 assert.ok(townAffinity('department',body).fit>townAffinity('department',fruit).fit);
 const old=bottle();delete old.profile.flavor;
 assert.equal(townAffinity('town',old).aroma,0);
 assert.deepEqual(fruit.profile,{roughness:.3,character:.78,wood:.2,flavor:bottle().profile.flavor});
});
test('receipt deduplication, factual quantity bounds and frozen bottle copy',()=>{
 const s=createTown(20261021),r=bottle(),before=JSON.stringify(r);recordBottle(s,r);
 const input={receiptId:'actual:1',month:0,releaseId:1,to:'town-liquor',count:12};
 assert.equal(receiveActual(s,input),true);advanceTown(s,12);const after=JSON.stringify(s);
 assert.equal(receiveActual(s,input),false);assert.equal(JSON.stringify(s),after);
 assert.throws(()=>receiveActual(s,{...input,count:11}));
 assert.throws(()=>receiveActual(s,{...input,receiptId:'actual:2',month:12,count:13}));
 assert.equal(JSON.stringify(r),before);r.profile.flavor.profile.fruit=0;assert.equal(s.releases[0].product.flavor.profile.fruit,.78);
 r.price=99;recordBottle(s,{...bottle(),price:99}); // Selling-price changes cannot rewrite frozen taste.
 assert.equal(s.nodes.town.received,12);assert.equal(s.shipments.length,1);assert.equal(s.trades.length,0);assert.equal(s.events.some(e=>e.type==='trade'),false);
});
test('one fixed seed supports distant introductions, causal IDs and finite reproducible receipts',()=>{
 function run(){const s=createTown(20261021);recordBottle(s,bottle(1,'fruit',120));for(let i=0;i<40;i++)receiveActual(s,{receiptId:'actual:'+i,month:i*3,releaseId:1,to:'town-liquor',count:3});advanceTown(s,360);return s;}
 const a=run(),b=run();assert.deepEqual(a,b);const restored=JSON.parse(JSON.stringify(a));advanceTown(restored,1300);advanceTown(a,1300);assert.deepEqual(restored,a);
 assert.ok(a.events.some(e=>e.type==='rumor'&&NODES.find(n=>n.id===e.to).level==='海外'));
 assert.ok(a.arrivals.some(e=>e.fit<.5));assert.equal(a.nodes.town.received,120);assert.equal(a.releases.length,1);assert.equal(a.shipments.reduce((n,x)=>n+x.count,0),120);
 assert.ok(townNews(a).some(e=>e.type==='rumor'));assert.equal(a.events.some(e=>e.type==='trade'),false);
 const ids=new Set();for(const e of a.events){if(e.sourceId)assert.ok(ids.has(e.sourceId));ids.add(e.id);if(e.releaseId){assert.equal(e.mainReleaseId,1);assert.equal(e.productId,11);}}
});

test('native release IDs and original bottle months survive lazy legacy registration',()=>{
 const s=createTown(20261021,24),r={...bottle(77),bottledMonth:12};recordBottle(s,r);
 assert.equal(s.events[0].month,12);assert.equal(s.events[0].mainReleaseId,77);assert.ok(s.events[0].reason.includes('#77'));
 recordBottle(s,{...bottle(78),bottledMonth:25});assert.equal(s.month,25);
 receiveActual(s,{receiptId:'old-stock',month:25,releaseId:77,to:'supermarket',count:10});assert.equal(s.nodes.super.received,10);
});

test('valid legacy wood above one and pruned live products remain receiptable',()=>{
 const s=createTown(20261021),old=bottle();delete old.profile.flavor;old.profile.wood=1.2;
 let liveProducts=[old];recordBottle(s,liveProducts[0]);receiveActual(s,{receiptId:'before-prune',month:0,releaseId:1,to:'town-liquor',count:12});
 liveProducts=[];receiveActual(s,{receiptId:'after-prune',month:1,releaseId:1,to:'town-liquor',count:12});
 assert.equal(liveProducts.length,0);assert.equal(s.nodes.town.received,24);assert.equal(s.releases[0].product.wood,1.2);assert.equal(s.releases[0].product.aromaFamily,null);
 assert.throws(()=>recordBottle(s,{...bottle(2),profile:{roughness:.3,character:.7,wood:1.36}}));
});


test('main auto-dispatch consumes real stock once and cold-replays its town receipts',()=>{
 const list=(s,id)=>D.listBottles(D.setSalePrice(s,'low',id),id);
 let s=legacyAdvance(legacyFill(D.newShopDemandDistillery(42),{progress:65}),12),caskId=s.core.casks[0].id;
 // Existing public scenario: three real partial releases qualify the actual shop.
 for(let i=0;i<3;i++){s=D.bottleBranded(s,caskId,{},14);s=list(s,s.result.productId);s=legacyAdvance(s,1);}
 s=legacyAdvance(s,1);assert.equal(s.shop.offer?.shopId,'town-liquor');
 const oldRetail=s.releases.reduce((n,r)=>n+r.sold,0),oldDeliveries=s.shop.deliveries.reduce((n,d)=>n+d.count,0),offer=s.shop.offer;
 // The qualification cask has little left. A second actual batch provides enough
 // young listed stock for both existing retail demand and automatic dispatch.
 s=legacyFill(s,{progress:90});caskId=s.core.casks.at(-1).id;
 s=D.enableStage4(s);s=D.acceptShop(s,offer.shopId,offer.id);
 s=D.bottleBranded(s,caskId,{});const productId=s.result.productId;s=list(s,productId);
 const beforeStock=s.core.products.reduce((n,p)=>n+p.stock,0),listedMonth=s.core.month;
 assert.equal(s.labConnection.town.shipments.length,0,'migration and approval add no retrospective receipts');
 let shipped=0;
 for(let guard=0;s.core.products.some(p=>p.stock>0);guard++){
  assert(guard<12,'finite listed inventory should run out in the bounded scenario');
  s=legacyAdvance(s,1);shipped+=s.automation.lastShipments.reduce((n,d)=>n+d.count,0);
  const nativeNew=s.shop.deliveries.filter(d=>d.month>listedMonth),townShop=s.labConnection.town.shipments.filter(d=>d.id.startsWith('shop:'));
  assert.equal(townShop.reduce((n,d)=>n+d.count,0),nativeNew.reduce((n,d)=>n+d.count,0));
  for(const d of nativeNew){const rows=townShop.filter(t=>t.id==='shop:'+d.id);assert.equal(rows.length,1);assert.equal(rows[0].count,d.count);assert.equal(rows[0].to,'town');}
 }
 assert(shipped>0,'the existing automatic dispatcher actually delivered bottles');
 const retail=s.releases.reduce((n,r)=>n+r.sold,0)-oldRetail,deliveries=s.shop.deliveries.reduce((n,d)=>n+d.count,0)-oldDeliveries,town=s.labConnection.town;
 assert.equal(town.shipments.reduce((n,t)=>n+t.count,0),retail+deliveries);
 assert.equal(retail+deliveries,beforeStock);
 const receipts=town.shipments.length,receiptQuantity=town.shipments.reduce((n,t)=>n+t.count,0);
 s=legacyAdvance(s,3);assert.equal(s.labConnection.town.shipments.length,receipts);assert.equal(s.labConnection.town.shipments.reduce((n,t)=>n+t.count,0),receiptQuantity);
 const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:8*1024*1024}),raw);
});
