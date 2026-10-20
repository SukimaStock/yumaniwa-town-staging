import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import * as E from '../economy.mjs';
import * as M from '../model.mjs';
import {advanceGeneration} from '../generations.mjs';
import {advance,fill} from './brands-helpers.mjs';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/partial-legacy.json',import.meta.url))),first=fixtures.cases[0];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const ready=()=>D.enablePartialBottling(D.restoreDistillery(first.input));
const unchanged=(s,fn)=>{const old=JSON.stringify(s);assert.throws(fn);assert.equal(JSON.stringify(s),old);};
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8'}),raw);return raw;}

test('captured v15/v17/v18 saves, legacy full output and later retail stay exact',()=>{
 for(const f of fixtures.cases){const s=D.restoreDistillery(f.input);assert.equal(hash(D.serializeDistillery(s)),f.hashes.input);const b=D.bottleBranded(s,f.id,{name:'Baseline'});assert.equal(hash(D.serializeDistillery(b)),f.hashes.output);const later=advance(D.listBottles(b,b.result.productId),6);assert.equal(hash(D.serializeDistillery(later)),f.hashes.sold);}
});
test('explicit v19 activation preserves old bytes and all progress, including incomplete extraction',()=>{
 let old=D.restoreDistillery(first.input);const raw=D.serializeDistillery(old),n=D.enablePartialBottling(old);assert.equal(D.serializeDistillery(old),raw);assert.equal(n.version,19);assert.equal(n.rules,'partial-bottling');assert(D.staffMode(n)&&D.generationMode(n)&&D.bottleStorageMode(n));for(const k of ['core','still','notesById','batchesById','staff','generations','recipeBook','trade','shop','releases'])assert.deepEqual(n[k],old[k]);assert.equal(D.enablePartialBottling(n),n);assert.equal(D.newStaffDistillery(42).version,18);assert.equal(D.newPartialDistillery(42).version,19);cold(n);
 old=D.startDistillation(old);for(let i=0;i<37;i++)old=D.distillStep(old);const active=D.enablePartialBottling(old);assert.deepEqual(active.still,old.still);assert.equal(active.operations.at(-1).value.progress,37);cold(active);
});
test('counted bottling retains cask identity, taste, variation and notes; exact count/fee/frozen product',()=>{
 const s=ready(),c=structuredClone(s.core.casks[0]),notes=structuredClone(s.notesById[c.id]),b=D.bottleBranded(s,c.id,{name:'川'},5),p=b.core.products.at(-1),r=b.releases.at(-1);
 assert.equal(b.core.cash,s.core.cash-15);assert.equal(b.core.totals.costs,s.core.totals.costs+15);assert.equal(b.core.totals.revenue,s.core.totals.revenue);assert.equal(b.core.casks.length,s.core.casks.length);assert.equal(b.core.casks[0].id,c.id);close(b.core.casks[0].litres,c.litres-3.5);
 for(const k of ['age','roughness','character','wood','variation','history'])assert.deepEqual(b.core.casks[0][k],c[k]);for(const k of ['samples','seen','cooled','observations'])assert.deepEqual(b.notesById[c.id][k],notes[k]);assert.equal(p.stock,5);assert.equal(r.bottles,5);assert.equal(r.productId,p.id);assert.equal(r.caskId,c.id);assert.equal(b.productsById[p.id].listed,false);assert.equal(b.result.litres,3.5);assert.equal(b.result.sourceLitres,c.litres);assert.equal(b.result.remainingLitres,b.core.casks[0].litres);assert.deepEqual(b.operations.at(-1),{key:'bottle-counted-branded',value:{id:c.id,selection:{name:'川'},count:5}});cold(b);
});
test('repeated portions retain one cask and create distinct frozen releases with real later aging',()=>{
 let s=D.bottleBranded(ready(),2,{name:'川'},5);const firstProduct=structuredClone(s.core.products.at(-1)),firstRecord=structuredClone(s.records.at(-1));s=advance(s,12);assert(s.core.casks[0].age>firstProduct.age);s=D.bottleBranded(s,2,{brandId:1},4);const second=s.core.products.at(-1);assert.notEqual(second.id,firstProduct.id);assert.notEqual(second.age,firstProduct.age);assert.equal(s.releases.length,2);assert.equal(new Set(s.releases.map(r=>r.caskId)).size,1);assert.deepEqual(s.core.products.find(p=>p.id===firstProduct.id),firstProduct);assert.deepEqual(s.records.find(r=>r.productId===firstProduct.id),firstRecord);assert.equal(s.core.casks.length,1);cold(s);
 const facts=D.nearbyComparisonFacts(s,{productIds:s.releases.map(r=>r.productId),caskIds:[2],includeManualSources:true});assert.equal(facts.products.length,2);assert(facts.products.every(p=>p.complete));assert.equal(facts.manualSources.length,1);
});
test('mass loss excludes prior withdrawals and upkeep is attributed once across portions and full finish',()=>{
 let s=ready();const original=s.core.casks[0],initial=original.initialLitres,firstEvap=initial-original.litres,firstUpkeep=s.batchesById[2].upkeep;
 s=D.bottleBranded(s,2,{name:'川'},5);close(s.result.evaporated,firstEvap);assert.equal(s.result.upkeep,firstUpkeep);s=D.bottleBranded(s,2,{brandId:1},4);close(s.result.evaporated,firstEvap);assert.equal(s.result.upkeep,0);close(s.batchesById[2].withdrawnLitres,6.3);
 const cashBefore=s.core.cash;s=advance(s,6);const before=s.core.casks[0],expected=initial-before.litres-6.3,quote=D.quote(s,2);s=D.bottleBranded(s,2,{brandId:1});close(s.result.evaporated,expected);assert.equal(s.result.upkeep,72);assert.equal(s.result.bottles,quote.count);close(s.result.sourceLitres,before.litres);assert(s.result.remainingLitres>=0&&s.result.remainingLitres<.7);assert.equal(s.core.casks.length,0);assert.equal(s.notesById[2],undefined);assert.equal(s.batchesById[2],undefined);assert(s.core.archive.some(c=>c.id===2));assert.equal(s.core.cash,cashBefore-72-quote.cost);cold(s);
});
test('automatic direct whole finish after a portion also uses corrected volume and upkeep accounting',()=>{
 const s=D.bottleBranded(ready(),2,{name:'川'},5),before=s.core.casks[0],q=D.quote(s,2),finished=E.bottleNow(s,2,{automatic:true,directSale:true});close(finished.result.evaporated,before.initialLitres-before.litres-3.5);assert.equal(finished.result.upkeep,0);assert.equal(finished.result.bottles,q.count);assert.equal(finished.core.cash,s.core.cash-q.cost);assert.equal(finished.core.casks.length,0);
});
test('selected pending decision resolves but unrelated cask decisions remain exact',()=>{
 let s=fill(ready(),{progress:99,type:'bourbon'});for(let i=0;i<20;i++){if(s.decisions.length)break;s=D.tickDistillery(s);if(s.trade.offer)s=D.declineOffer(s);}assert(s.decisions.length);const selected=s.decisions[0].caskId,other=s.core.casks.find(c=>c.id!==selected).id,otherNotes=structuredClone(s.notesById[other]),otherDecisions=structuredClone(s.decisions.filter(d=>d.caskId!==selected));const n=D.bottleBranded(s,selected,{name:'川'},1);assert.equal(n.notesById[selected].pending,null);assert.equal(n.notesById[selected].phase,'watching');assert.deepEqual(n.notesById[other],otherNotes);assert.deepEqual(n.decisions,otherDecisions);cold(n);
});
test('invalid count, legacy count, insufficient funds, contract, and full product shelf reject atomically',()=>{
 const s=ready();for(const count of [0,-1,1.5,'5',NaN,Infinity,D.quote(s,2).count+1])unchanged(s,()=>D.bottleBranded(s,2,{name:'川'},count));const legacy=D.restoreDistillery(first.input);unchanged(legacy,()=>D.bottleBranded(legacy,2,{name:'川'},1));const poor=structuredClone(s);poor.core.cash=0;unchanged(poor,()=>D.bottleBranded(poor,2,{name:'川'},1));const contracted=structuredClone(s);contracted.trade.contracts.push({caskId:2});unchanged(contracted,()=>D.bottleBranded(contracted,2,{name:'川'},1));
 let shelf=s;for(let i=0;i<8;i++)shelf=D.bottleBranded(shelf,2,i?{brandId:1}:{name:'川'},1);unchanged(shelf,()=>D.bottleBranded(shelf,2,{brandId:1},1));cold(shelf);
});
test('strict cold replay rejects forged quantity, remaining liquid, batch accounting and release receipts',()=>{
 const s=D.bottleBranded(ready(),2,{name:'川'},5);for(const edit of [x=>x.operations.at(-1).value.count++,x=>x.core.casks[0].litres++,x=>x.batchesById[2].withdrawnLitres++,x=>x.batchesById[2].attributedUpkeep++,x=>x.releases[0].bottles++,x=>x.result.remainingLitres++]){const bad=structuredClone(s);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}cold(s);
});
test('counted release has existing generation semantics without new scoring or release exemptions',()=>{
 const s=ready();s.core.month=300;s.generations.active.startedMonth=0;s.result={age:36,productId:90,caskId:2};const counted=advanceGeneration(structuredClone(s),'bottle-counted-branded'),legacy=advanceGeneration(structuredClone(s),'bottle-branded');assert.deepEqual(counted.generations,legacy.generations);assert.equal(counted.generations.active.trigger.kind,'mature-bottling');
});

test('v6 partner fixtures and v5 imports still restore through their frozen contracts',()=>{
 for(const name of ['partners-offer','partners-accepted','partners-assigned','partners-due','partners-unmet','v09-initial','v09-due','v09-proposal']){const raw=fs.readFileSync(new URL('./fixtures/'+name+'.json',import.meta.url),'utf8'),s=D.restoreDistillery(raw);cold(s);if(name.startsWith('v09'))assert.equal(s.origin.version,5);}
});
test('residual cask and its earlier bottle cross a real generation handover unchanged',async()=>{
 const {legacyAtMonth,finishExtraction}=await import('./generation-helpers.mjs');let s=D.enablePartialBottling(legacyAtMonth(299));s=fill(s,{progress:65});s=advance(s,1);const id=s.core.casks.at(-1).id;s=D.bottleBranded(s,id,{brandId:1},5);assert.equal(D.generationStatus(s).phase,'last-batch');const residual=structuredClone(s.core.casks.find(c=>c.id===id)),oldProduct=structuredClone(s.core.products.at(-1));s=D.startDistillation(s);s=finishExtraction(s);assert.equal(D.generationStatus(s).phase,'review');s=D.handoverGeneration(s,1);assert.deepEqual(s.core.casks.find(c=>c.id===id),residual);assert.deepEqual(s.core.products.find(p=>p.id===oldProduct.id),oldProduct);assert.equal(D.generationStatus(s).id,2);s=advance(s,1);s=D.bottleBranded(s,id,{brandId:1},1);assert(s.core.casks.find(c=>c.id===id));cold(s);
});
test('a partially withdrawn cask can later fulfill wholesale without reselling its earlier bottle',()=>{
 let s=D.enablePartialBottling(D.restoreDistillery(fs.readFileSync(new URL('./fixtures/partners-accepted.json',import.meta.url),'utf8')));s=fill(s,{progress:66,type:'refill'});const id=s.core.casks.at(-1).id;s=D.bottleBranded(s,id,{name:'川'},3);const prior=structuredClone(s.core.products.at(-1));s=D.assignCask(s,id,s.trade.relationship.terms[0].id);s=advance(s,D.contractFor(s,id).targetAge-s.core.casks.find(c=>c.id===id).age);const shipped=s.core.products.find(p=>p.sourceId===id&&p.id!==prior.id);assert(shipped);assert.equal(shipped.stock,0);assert.equal(shipped.sold,shipped.originalStock);assert.deepEqual(s.core.products.find(p=>p.id===prior.id),prior);assert.equal(s.trade.history.filter(h=>h.kind==='shipped'&&h.caskId===id).length,1);assert(!s.core.casks.find(c=>c.id===id));const archived=s.core.archive.find(c=>c.id===id);close(s.records.find(r=>r.productId===shipped.id).evaporated,Math.max(0,archived.initialLitres-prior.originalStock*.7-archived.litres-shipped.originalStock*.7));cold(s);
});
test('one counted mature release shares exact stock across all three shops and retail',async()=>{
 const {interested,product}=await import('./department-helpers.mjs');let s=D.enablePartialBottling(interested());const oldId=product(s),oldQuote=D.shopQuote(s,oldId,'department');s=D.deliverShop(s,oldId,5,'department',oldQuote.selectionId);s=fill(s,{progress:65,type:'bourbon'});s=advance(s,24);const id=s.core.casks.at(-1).id;s=D.bottleBranded(s,id,{brandId:1},35);const pid=s.result.productId;for(let i=0;i<6&&s.shop.offer?.shopId!=='department';i++)s=advance(s,1);if(s.shop.offer?.shopId==='department'){const o=s.shop.offer;s=D.acceptShop(s,o.shopId,o.id);}for(const [shop,count]of[['town-liquor',10],['supermarket',20],['department',5]]){const q=D.shopQuote(s,pid,shop);assert(q.ok,`${shop}: ${q.reason}`);s=D.deliverShop(s,pid,count,shop,q.selectionId);}const p=s.core.products.find(p=>p.id===pid),r=s.releases.find(r=>r.productId===pid);assert.equal(p.stock,0);assert.equal(p.sold,35);assert.equal(r.delivered,35);assert.equal(r.sold,0);assert(s.core.casks.find(c=>c.id===id));unchanged(s,()=>D.deliverShop(s,pid,1,'town-liquor'));cold(s);
});

test('counted withdrawals do not spend narrative decision budget or trigger a false evaporation event',async()=>{
 const {observeCharacterMonth}=await import('../character.mjs');let s=ready();for(let i=0;i<3;i++)s=D.bottleBranded(s,2,i?{brandId:1}:{name:'川'},1);assert.equal(s.notesById[2].withdrawnLitres,3*.7);s=advance(s,12);const n=s.notesById[2];assert(!n.seen.includes('last'));assert.equal(n.choices.filter(c=>c.key==='bottle').length,3);const withoutCounter={...structuredClone(n),core:structuredClone(s.core)};delete withoutCounter.withdrawnLitres;assert.equal(observeCharacterMonth(withoutCounter).pending.id,'last');cold(s);
 let liquid=D.bottleBranded(ready(),2,{name:'川'},5);liquid=advance(liquid,6);assert(!liquid.notesById[2].seen.includes('loss'));const oldNotes={...structuredClone(liquid.notesById[2]),core:structuredClone(liquid.core)};delete oldNotes.withdrawnLitres;assert.equal(observeCharacterMonth(oldNotes).pending.id,'loss');cold(liquid);
});
test('actual evaporation alone still triggers loss after counted bottling, without a false last choice',async()=>{
 const {observeCharacterMonth}=await import('../character.mjs');let s=D.bottleBranded(ready(),2,{name:'川'},1);s=advance(s,48);const c=s.core.casks[0];assert((c.litres+s.notesById[2].withdrawnLitres)/c.initialLitres<=.9);assert(s.notesById[2].seen.includes('loss'));assert(!s.notesById[2].seen.includes('last'));cold(s);
});
