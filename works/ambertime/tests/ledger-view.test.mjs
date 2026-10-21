import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {fill} from './brands-helpers.mjs';
import {interested,product} from './department-helpers.mjs';
import {buildReleaseLedger} from '../ledger-view.mjs';

const state=()=>({brands:[{id:1,name:'川の一本',bottle:'fancy',label:'cream'},{id:2,name:'以前の銘柄',bottle:'round',label:'dark'}],releases:[],records:[],core:{products:[]},productsById:{},shop:{deliveries:[]}});
const release=(id,values={})=>({id,brandId:1,productId:id+10,caskId:2,batchId:1,bottledMonth:6,age:6,profile:{roughness:.3,character:.6,wood:.2},cut:.5,type:'refill',bottles:10,price:20,sold:0,revenue:0,listed:false,status:'selling',...values});
const complete={coverage:{complete:true,fromMonth:0},products:[],casks:[]};
const factsFor=s=>D.nearbyComparisonFacts(s,{productIds:[...new Set([...(s.releases??[]),...(s.records??[])].map(r=>r.productId).filter(x=>x!=null))],caskIds:[...new Set([...(s.releases??[]),...(s.records??[])].map(r=>r.caskId).filter(x=>x!=null))]});
function coldProjection(raw){
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};import {buildReleaseLedger} from ${JSON.stringify(new URL('../ledger-view.mjs',import.meta.url).href)};const s=D.restoreDistillery(fs.readFileSync(0,'utf8'));const records=[...(s.releases??[]),...(s.records??[])],facts=D.nearbyComparisonFacts(s,{productIds:[...new Set(records.map(r=>r.productId).filter(x=>x!=null))],caskIds:[...new Set(records.map(r=>r.caskId).filter(x=>x!=null))]});process.stdout.write(JSON.stringify(buildReleaseLedger(s,{facts})));`;
 return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:4e6}));
}

test('release identity wins over its record mirror and same-parent portions stay distinct',()=>{
 const s=state(),a=release(1),b=release(2,{age:12,bottledMonth:12});s.releases=[a,b];
 s.records=[{...a,releaseId:1,name:'old copy',sold:999,samples:[{age:3,text:['前の試飲']}]}];
 const view=buildReleaseLedger(s,{facts:{...complete,casks:[{caskId:2,stopAt:65,batchId:1}]}});
 assert.deepEqual(view.entries.map(x=>x.key),['release:1','release:2']);
 assert.deepEqual(view.entries.map(x=>x.caskId),[2,2]);assert.equal(view.entries[0].retail.count,0);
 assert.equal(view.entries[0].record.samples[0].text[0],'前の試飲');assert.equal(view.entries[1].record,null);
 assert.equal(view.entries[0].stopAt,65);assert.equal(view.entries[0].name,'川の一本');assert.equal(view.brands.length,2);
});

test('retail and delivered sales use their own ledgers once, with cent-exact delivery totals',()=>{
 const s=state();s.releases=[release(1,{sold:3,revenue:60})];s.records=[{productId:11,sold:3,revenue:60}];
 s.core.products=[{id:11,stock:2,sold:8,revenue:135,price:24}];s.productsById[11]={listed:true};
 s.shop.deliveries=[{id:1,productId:11,count:2,revenue:30.1},{id:2,productId:11,count:3,revenue:44.9},{id:3,productId:99,count:4,revenue:70}];
 const [entry]=buildReleaseLedger(s,{facts:complete}).entries;
 assert.deepEqual(entry.retail,{count:3,revenue:60});assert.deepEqual(entry.deliveries,{count:5,revenue:75});
 assert.equal(entry.stock,2);assert.equal(entry.price,24);assert.equal(entry.status,'selling');assert.equal(entry.wholesale,null);
});

test('known zero and false remain exact; a pruned product can use a complete receipt',()=>{
 const s=state();s.releases=[release(1,{sold:10,revenue:200,listed:true})];s.core.products=[{id:11,stock:0,price:24}];s.productsById[11]={listed:false};
 let entry=buildReleaseLedger(s,{facts:{...complete,products:[{productId:11,stock:9,currentPrice:30,listed:true,complete:true}]}}).entries[0];
 assert.equal(entry.stock,0);assert.equal(entry.listed,false);assert.equal(entry.status,'sold-out');assert.equal(entry.price,24);
 s.core.products=[];entry=buildReleaseLedger(s,{facts:{...complete,products:[{productId:11,stock:0,currentPrice:24,listed:false,complete:true}]}}).entries[0];
 assert.equal(entry.stock,0);assert.equal(entry.price,24);assert.equal(entry.status,'sold-out');
});

test('remaining stock is derived only with complete coverage and all explicit channel quantities',()=>{
 const s=state();s.releases=[release(1,{sold:3,revenue:60})];s.shop.deliveries=[{productId:11,count:2,revenue:40}];
 assert.equal(buildReleaseLedger(s,{facts:complete}).entries[0].stock,5);
 assert.equal(buildReleaseLedger(s,{facts:{coverage:{complete:false,fromMonth:20}}}).entries[0].stock,null);
 assert.equal(buildReleaseLedger(s,{facts:{coverage:{complete:false,fromMonth:20},products:[{productId:11,complete:true}]}}).entries[0].stock,5);
 delete s.releases[0].sold;assert.equal(buildReleaseLedger(s,{facts:complete}).entries[0].stock,null);
 s.releases[0].sold=30;assert.equal(buildReleaseLedger(s,{facts:complete}).entries[0].stock,null,'inconsistent arithmetic is not clamped into a made-up zero');
});

test('legacy wholesale stays separate, including its partner, taste and special-order outcome',()=>{
 const s=state();s.records=[{recordVersion:4,productId:31,caskId:8,batchId:7,bottledMonth:12,age:12,bottles:5,channel:'wholesale',partner:'以前の卸売商',unitPrice:18,sold:5,revenue:90,profile:{roughness:.2},samples:[{age:6,text:['試飲']}],order:{outcome:'fulfilled'}}];
 const [entry]=buildReleaseLedger(s,{facts:complete}).entries;
 assert.equal(entry.key,'legacy:31');assert.equal(entry.channel,'wholesale');assert.equal(entry.status,'wholesale');
 assert.deepEqual(entry.retail,{count:null,revenue:null});assert.deepEqual(entry.wholesale,{count:5,revenue:90,partner:'以前の卸売商'});
 assert.deepEqual(entry.deliveries,{count:0,revenue:0});assert.equal(entry.price,18);assert.equal(entry.record.order.outcome,'fulfilled');assert.equal(entry.record.samples[0].text[0],'試飲');
});

test('missing history stays nullable while explicit delivery mirrors remain usable without a shop ledger',()=>{
 const s={releases:[{id:1,productId:11}],records:[],core:{products:[]}};
 let view=buildReleaseLedger(s);assert.deepEqual(view.coverage,{complete:false,fromMonth:null});
 const entry=view.entries[0];for(const key of ['date','age','profile','bottles','stock','price','status','listed','caskId','batchId','stopAt'])assert.equal(entry[key],null,key);
 assert.deepEqual(entry.retail,{count:null,revenue:null});assert.deepEqual(entry.deliveries,{count:null,revenue:null});
 s.releases[0]={...release(1),delivered:2,deliveryRevenue:40};view=buildReleaseLedger(s,{facts:complete});
 assert.deepEqual(view.entries[0].deliveries,{count:2,revenue:40});assert.equal(view.entries[0].stock,8);
});

test('an incomplete origin with an empty delivery array neither invents zero nor erases a positive mirror',()=>{
 const s=state();s.releases=[release(1,{bottledMonth:12,sold:3})];const facts={coverage:{complete:false,fromMonth:20},products:[],casks:[]};
 let entry=buildReleaseLedger(s,{facts}).entries[0];
 assert.deepEqual(entry.deliveries,{count:null,revenue:null});assert.equal(entry.deliveryComplete,false);assert.equal(entry.stock,null);
 s.records=[{productId:11,delivered:4,deliveryRevenue:80}];entry=buildReleaseLedger(s,{facts}).entries[0];
 assert.deepEqual(entry.deliveries,{count:4,revenue:80});assert.equal(entry.deliveryComplete,true);assert.equal(entry.stock,null);
 s.shop.deliveries=[{productId:11,count:2,revenue:40}];entry=buildReleaseLedger(s,{facts}).entries[0];
 assert.deepEqual(entry.deliveries,{count:2,revenue:40},'known actual rows stay separate from a larger historic mirror');assert.equal(entry.deliveryComplete,false);assert.equal(entry.stock,null);
});

test('a release born after the known origin or observed in a complete receipt can prove no deliveries',()=>{
 const s=state();s.releases=[release(1,{bottledMonth:21,sold:3})];const facts={coverage:{complete:false,fromMonth:20},products:[],casks:[]};
 let entry=buildReleaseLedger(s,{facts}).entries[0];assert.deepEqual(entry.deliveries,{count:0,revenue:0});assert.equal(entry.deliveryComplete,true);assert.equal(entry.stock,7);
 s.releases[0].bottledMonth=20;entry=buildReleaseLedger(s,{facts}).entries[0];assert.equal(entry.deliveries.count,null,'same month alone cannot establish whether the release preceded origin');assert.equal(entry.stock,null);
 facts.products=[{productId:11,complete:true}];entry=buildReleaseLedger(s,{facts}).entries[0];assert.equal(entry.deliveries.count,0);assert.equal(entry.deliveryComplete,true);assert.equal(entry.stock,7);
});

test('product identities deduplicate legacy copies without dropping distinct ID-less old records',()=>{
 const s=state();s.releases=[{id:1,productId:null}];s.records=[{productId:21,name:'older'},{productId:21,name:'latest'},{name:'no id one'},{productId:null,name:'no id two'}];
 const view=buildReleaseLedger(s);
 assert.deepEqual(view.entries.map(x=>x.key),['release:1','legacy:21','legacy:index:2','legacy:index:3']);
 assert.equal(view.entries[0].record,null);assert.equal(view.entries[1].name,'latest');
 assert.deepEqual(buildReleaseLedger(s),view,'unchanged input gives stable keys and ordering');
});

test('projection detaches records, profiles, brands and coverage without writing any input',()=>{
 const s=state();s.releases=[release(1)];s.records=[{productId:11,samples:[{age:1,text:['記録']}]}];const facts=structuredClone(complete);facts.coverage.notes=['保管範囲'];
 const snapshot=JSON.stringify({s,facts}),view=buildReleaseLedger(s,{facts});
 view.brands[0].name='changed';view.entries[0].profile.wood=9;view.entries[0].record.samples[0].text[0]='changed';view.coverage.notes.push('changed');
 assert.equal(JSON.stringify({s,facts}),snapshot);
});

test('real partial releases agree with validated facts and leave serialized state unchanged',()=>{
 let s=fill(D.newBrandIdentityDistillery(42),{progress:65});const id=s.core.casks[0].id;
 s=D.bottleBranded(s,id,{name:'最初の一本',bottle:'fancy',label:'dark'},5);s=D.bottleBranded(s,id,{},3);
 const raw=D.serializeDistillery(s),facts=D.nearbyComparisonFacts(s,{productIds:s.releases.map(r=>r.productId),caskIds:[id]}),view=buildReleaseLedger(s,{facts});
 assert.equal(view.entries.length,2);assert.deepEqual(view.entries.map(x=>x.bottles),[5,3]);assert.deepEqual(view.entries.map(x=>x.stock),[5,3]);assert(view.entries.every(x=>x.caskId===id&&x.stopAt===65));
 assert.equal(D.serializeDistillery(s),raw);assert.deepEqual(buildReleaseLedger(D.restoreDistillery(raw),{facts}),view);
});

test('real ordinary-shop and department deliveries keep retail separate and survive cold projection',()=>{
 let s=D.enableBottleStorage(interested());const id=product(s),before=new Map(s.releases.map(r=>[r.productId,{count:r.sold,revenue:r.revenue}]));
 s=D.deliverShop(s,id,5,'town-liquor');s=D.deliverShop(s,id,5,'department',D.shopQuote(s,id,'department').selectionId);
 const raw=D.serializeDistillery(s),view=buildReleaseLedger(s,{facts:factsFor(s)});
 for(const r of s.releases){
  const entry=view.entries.find(x=>x.releaseId===r.id),rows=s.shop.deliveries.filter(d=>d.productId===r.productId);
  assert.deepEqual(entry.retail,{count:r.sold,revenue:r.revenue});assert.deepEqual(entry.retail,before.get(r.productId),'store deliveries never become extra retail sales');
  assert.deepEqual(entry.deliveries,{count:rows.reduce((n,d)=>n+d.count,0),revenue:rows.reduce((n,d)=>n+Math.round(d.revenue*100),0)/100});
 }
 const current=view.entries.find(x=>x.productId===id);assert.equal(current.deliveries.count,10);assert.equal(s.department.adoptions.length,1);assert.equal(current.deliveryComplete,true);
 assert.equal(D.serializeDistillery(s),raw);assert.deepEqual(coldProjection(raw),view);
});

test('a real migrated v09 save keeps incomplete source and delivery fields unknown after cold restore',()=>{
 const s=D.restoreDistillery(fs.readFileSync(new URL('./fixtures/v09-due.json',import.meta.url),'utf8')),raw=D.serializeDistillery(s),facts=factsFor(s),view=buildReleaseLedger(s,{facts});
 assert.equal(view.coverage.complete,false);assert.equal(view.coverage.fromMonth,s.origin.core.month);assert.equal(view.entries.length,s.records.length);
 const entry=view.entries[0];assert.equal(entry.kind,'legacy');assert.equal(entry.productId,s.records[0].productId);assert.equal(entry.brandId,null);assert.equal(entry.releaseId,null);assert.equal(entry.stopAt,null,'a cut percentage is not a recorded extraction position');
 assert.deepEqual(entry.deliveries,{count:null,revenue:null});assert.equal(entry.deliveryComplete,false);assert.equal(entry.record.bottledMonth,s.records[0].bottledMonth);
 assert.equal(D.serializeDistillery(s),raw);assert.deepEqual(coldProjection(raw),view);
});
