import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {advance} from './brands-helpers.mjs';
const clone=structuredClone;
const legacy=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-legacy-main.json',import.meta.url)));
const old=()=>D.restoreDistillery(legacy.after);
function facts(s){const value=clone(s);delete value.placement;delete value.operations;return value;}
function cold(s){
 const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:4e6}),raw);return D.restoreDistillery(raw);
}
function preserve(before,after,policy){
 assert.deepEqual(facts(after),facts(before),'cash, core, records, IDs, stores, trade, notes, town and generation remain exact');
 assert.deepEqual(after.operations.slice(0,-1),before.operations);assert.equal(after.operations.length,before.operations.length+1);assert.equal(after.operations.at(-1).key,'adopt-placement');assert.equal(after.operations.at(-1).value.policy,policy);
 for(const p of before.core.products){const inv=D.placementInventory(after,p.id);assert.equal(inv.stock,p.stock);assert.equal(inv.retail,policy==='listed'&&before.productsById[p.id]?.listed?inv.available:0);assert.equal(inv.stock,inv.held+inv.retail+inv.hand);}
 cold(after);
}
function fill(s){s=D.beginCollection(D.startRangeDistillation(s));while(s.still.distillation.progress<65)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),'refill');}
function unchanged(s,fn){const text=JSON.stringify(s),operations=s.operations,core=s.core;assert.throws(fn);assert.equal(JSON.stringify(s),text);assert.equal(s.operations,operations);assert.equal(s.core,core);}
test('explicit adoption retains every old fact and operation prefix, including actual store delivery',()=>{
 const s=old(),text=D.serializeDistillery(s);assert(s.shop.relations.length>0);assert(s.shop.deliveries.length>0);
 const j=D.adoptPlacement(s);preserve(s,j,'listed');assert.equal(D.serializeDistillery(s),text);
});
test('listed and hand policies differ only in new allocation, keeping sold/history and unlisted bottles intact',()=>{
 let s=old();s=D.bottleBranded(s,s.core.casks[0].id,{brandId:1},6);const r=s.releases.at(-1);assert.equal(s.productsById[r.productId].listed,false);
 const listed=D.adoptPlacement(s,'listed'),hand=D.adoptPlacement(s,'hand');preserve(s,listed,'listed');preserve(s,hand,'hand');assert.equal(listed.placement.retailByProduct[r.productId],0);assert.equal(hand.placement.retailByProduct[r.productId],0);
});
test('existing placement saves are returned verbatim without reallocation or extra operation',()=>{
 const s=D.restoreDistillery(JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw),raw=D.serializeDistillery(s);
 for(const policy of ['listed','hand']){assert.equal(D.adoptPlacement(s,policy),s);assert.equal(D.serializeDistillery(s),raw);}
});
test('partial distillation progress survives cold replay without advancing the extraction or month',()=>{
 let s=D.startRangeDistillation(D.newConnectedDistillery(37));while(s.still.distillation.progress<27)s=D.distillStep(s);
 const j=D.adoptPlacement(s,'hand');preserve(s,j,'hand');assert.equal(j.still.distillation.progress,27);assert.equal(j.operations.at(-1).value.progress,27);assert.equal(j.core.month,s.core.month);
});
test('an active tasting keeps the exact note, samples and transient view through adoption and cold restore',()=>{
 const base=old(),id=base.core.casks[0].id,s=D.sampleDistillery(base,id),samples=s.notesById[id].samples.length,j=D.adoptPlacement(s,'listed');
 assert.equal(s.tastingId,id);preserve(s,j,'listed');assert.equal(j.tastingId,id);assert.equal(j.notesById[id].view,'tasting');assert.equal(j.notesById[id].samples.length,samples);assert.equal(j.operations.at(-1).value.tastingId,id);
});
let heldSource;
function pendingDepartment(){
 if(heldSource)return clone(heldSource);
 let s=advance(fill(D.newConnectedDistillery(42)),6);
 for(let i=0;i<2;i++){s=D.bottleBranded(s,s.core.casks[0].id,i?{}:{name:'引きつぎ',bottle:'round',label:'cream'},20);const id=s.result.productId;s=D.listBottles(s,id);for(let n=0;s.core.products.find(p=>p.id===id).stock>0;n++){assert(n<12);s=advance(s,1);}}
 s=advance(s,1);assert.equal(s.shop.offer?.shopId,'town-liquor');s=D.acceptShop(s,s.shop.offer.shopId,s.shop.offer.id);
 s=D.startRangeDistillation(s);while(s.still.distillation.progress<40)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<65)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'refill');s=advance(s,24);s=D.bottleBranded(s,s.core.casks.at(-1).id,{},12);s=advance(s,1);const o=s.shop.offer;assert.equal(o?.shopId,'department');const id=s.result.productId;s=D.listBottles(s,id);s=D.acceptShopDelivery(s,id,5,'department',o.id);heldSource=s;return clone(s);
}
test('listed adoption excludes already promised department bottles while preserving the actual pending delivery',()=>{
 const s=pendingDepartment(),id=s.result.productId,j=D.adoptPlacement(s,'listed');preserve(s,j,'listed');assert.deepEqual(D.placementInventory(j,id),{stock:12,held:5,retail:7,hand:0,available:7});
 const after=advance(j,1);assert.equal(after.core.products.find(p=>p.id===id).stock,0);assert.equal(after.placement.retailByProduct[id],0);assert.equal(after.shop.deliveries.at(-1).shopId,'department');assert.equal(after.shop.deliveries.at(-1).count,5);assert.equal(after.automation.lastShipments.filter(d=>d.shopId==='department'&&d.productId===id).length,1);assert(!after.automation.lastShipments.some(d=>d.shopId==='town-liquor'));cold(after);
});
test('adoption never advances an existing generation boundary or rewrites historical facts',()=>{
 let s=advance(fill(D.newConnectedDistillery(13)),6);s=D.bottleBranded(s,s.core.casks[0].id,{});s=D.listBottles(s,s.result.productId);
 for(let n=0;s.core.products.at(-1).stock;n++){assert(n<20);s=advance(s,1);}
 s=advance(s,360-s.core.month);assert.equal(s.generations.active.phase,'last-batch');const j=D.adoptPlacement(s,'hand');preserve(s,j,'hand');assert.deepEqual(j.generations,s.generations);
});
test('invalid policy or corrupted source fails without mutation; tampered migration never passes restore',()=>{
 const s=old();for(const policy of ['unknown','',null,{},1])unchanged(s,()=>D.adoptPlacement(s,policy));
 const bad=clone(s);bad.core.cash++;unchanged(bad,()=>D.adoptPlacement(bad,'hand'));
 const j=D.adoptPlacement(s,'listed'),id=s.core.products.find(p=>p.stock>0).id;
 for(const edit of [x=>{x.placement.retailByProduct[id]++;},x=>{x.operations.at(-1).value.policy='bad';},x=>{x.operations.at(-1).value.tastingId=999;},x=>{x.operations.at(-1).value.extra=true;},x=>{x.operations.pop();}]){const value=clone(j);edit(value);assert.throws(()=>D.restoreDistillery(JSON.stringify(value)));}
});
