import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../partner-orders.mjs';
import {caskName,releaseNumber,pendingPriceIds} from '../work-context.mjs';
import {fill,advance,exact} from './brands-helpers.mjs';
import {fourCasks,resolveOrdinary} from './wholesale-care-helpers.mjs';

function unlistedFour(){let s=D.newShopDistillery(42);for(let i=0;i<4;i++){if(i)s=advance(s,1);s=fill(s,{progress:65});s=D.bottleBranded(s,s.core.casks.at(-1).id,i?{brandId:1}:{name:'川霧'});}return s;}

test('stable cask captions use durable identity, including naturally skipped batch and bottle IDs',()=>{
 let s=D.newShopDistillery(42);s=fill(s,{progress:65});const first=s.core.casks[0].id;s=advance(s,1);s=fill(s,{progress:65});const second=s.core.casks[1].id;
 assert.equal(caskName(first),'樽 #'+first);assert.equal(caskName(second),'樽 #'+second);assert.notEqual(first,second);const name=caskName(second);
 s=D.bottleBranded(s,first,{name:'川霧'});assert.equal(s.core.casks[0].id,second);assert.equal(caskName(s.core.casks[0].id),name);assert.equal(caskName(s.records.at(-1).caskId),caskName(first));
 s=exact(s);assert.equal(caskName(s.core.casks[0].id),name);assert.equal(caskName(s.records.at(-1).caskId),caskName(first));
 for(const bad of [undefined,null,NaN,0,-1,1.5,'2'])assert.equal(caskName(bad),'樽');
});

test('wholesale automatic removals do not rename surviving casks or archived shipment identities',()=>{
 let s=fourCasks({unbooked:true});const watched=s.core.casks.at(-1).id,names=new Map(s.core.casks.map(c=>[c.id,caskName(c.id)]));let shipped=0;
 for(let i=0;i<19;i++){s=resolveOrdinary(s);if(s.trade.offer)s=D.declineOffer(s);s=D.tickDistillery(s);for(const c of s.core.casks)assert.equal(caskName(c.id),names.get(c.id));for(const r of s.trade.lastShipments){shipped++;assert.equal(caskName(r.caskId),names.get(r.caskId));}}
 assert(shipped>=3);assert(D.currentCask(s,watched));s=exact(s);assert.equal(caskName(watched),names.get(watched));for(const r of s.records)if(names.has(r.caskId))assert.equal(caskName(r.caskId),names.get(r.caskId));
});

test('same-month four-cask shipment receipts retain four distinct captions',()=>{
 // Deliberate shipment boundary projection; not claimed as a replayable save.
 let s=fourCasks();const ids=s.core.casks.map(c=>c.id);for(const c of s.core.casks){const k=D.contractFor(s,c.id);c.age=k.targetAge-1;c.filledMonth=s.core.month-c.age;c.batchMonth=c.filledMonth;}
 s=D.tickDistillery(s);assert.equal(s.trade.lastShipments.length,4);assert.equal(s.core.casks.length,0);assert.deepEqual(new Set(s.trade.lastShipments.map(r=>caskName(r.caskId))),new Set(ids.map(caskName)));assert.equal(new Set(ids.map(caskName)).size,4);
});

test('all unfinished price choices are reconstructed from products rather than only the last result',()=>{
 let s=unlistedFour();const ids=s.releases.map(r=>r.productId),raw=JSON.stringify(s);assert.deepEqual(pendingPriceIds(s),ids);assert.equal(JSON.stringify(s),raw);assert.deepEqual(pendingPriceIds(exact(s)),ids);
 for(const id of ids){assert.equal(pendingPriceIds(s)[0],id);s=D.setSalePrice(s,'standard',id);assert.equal(pendingPriceIds(s)[0],id,'setting price alone is not listing');s=D.listBottles(s,id);assert(!pendingPriceIds(s).includes(id));s=exact(s);}assert.deepEqual(pendingPriceIds(s),[]);
});

test('pending-price selection is pure, sorts tied months by ID, and omits listed or empty bottles',()=>{
 const s=unlistedFour(),ids=s.releases.map(r=>r.productId);s.core.products.reverse();for(const p of s.core.products)p.bottledMonth=7;s.productsById[ids[1]].listed=true;s.core.products.find(p=>p.id===ids[2]).stock=0;
 const before=JSON.stringify(s);assert.deepEqual(pendingPriceIds(s),[ids[0],ids[3]]);assert.equal(JSON.stringify(s),before);assert.deepEqual(pendingPriceIds({core:{products:[]},productsById:{}}),[]);
});

test('per-brand release ordinal survives pruning and is independent of the global release ID',()=>{
 const s=unlistedFour(),ids=s.releases.map(r=>r.productId);const other={...s.releases[0],id:999,brandId:2,productId:9999};s.releases.splice(1,0,other);
 for(let i=0;i<ids.length;i++)assert.equal(releaseNumber(s,ids[i]),i+1);assert.equal(releaseNumber(s,other.productId),1);assert.equal(releaseNumber(s,123456),null);
 s.core.products=[];s.records=[];const raw=JSON.stringify(s);for(let i=0;i<ids.length;i++)assert.equal(releaseNumber(s,ids[i]),i+1);assert.equal(JSON.stringify(s),raw);
});

test('a four-judgment queue does not consume pending prices or permit another cask action first',()=>{
 const s=unlistedFour();const ids=pendingPriceIds(s);
 // Controlled queue projection isolates target checks without inventing a saved
 // four-event RNG history. Price choices must survive every judgment state.
 for(let i=0;i<4;i++){const id=100+i,pending={id:'rough',title:'状態',text:'',options:[{id:'wait',label:'待つ'},{id:'cool',label:'涼しい場所へ'}]};s.core.casks.push({id,age:6,type:'refill'});s.notesById[id]={pending};s.decisions.push({caskId:id,eventId:'rough',pending});}
 const before=JSON.stringify(s);assert.throws(()=>D.chooseDistillery(s,101,'wait'),/先に/);assert.equal(JSON.stringify(s),before);
 while(s.decisions.length){assert.deepEqual(pendingPriceIds(s),ids);assert.equal(caskName(s.decisions[0].caskId),'樽 #'+s.decisions[0].caskId);s.decisions.shift();}assert.deepEqual(pendingPriceIds(s),ids);
});

test('existing unmet special orders and ordinary wholesale histories remain strict replayable while context is read',()=>{
 for(const name of ['partners-unmet.json','partners-due.json','partners-assigned.json']){const raw=fs.readFileSync(new URL('./fixtures/'+name,import.meta.url),'utf8'),s=D.enableShop(D.restoreDistillery(raw)),before=D.serializeDistillery(s);for(const c of s.core.casks)caskName(c.id);for(const r of s.releases)releaseNumber(s,r.productId);pendingPriceIds(s);assert.equal(D.serializeDistillery(s),before);assert.deepEqual(exact(s),s);if(s.decisions.length)assert.equal(D.tickDistillery(s),s);}
});
