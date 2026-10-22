import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import * as D from '../partner-orders.mjs';
import {townAffinity,NODES} from '../town-connection.mjs';
import {buildDistilleryHistory} from '../distillery-history.mjs';
import {buildReleaseLedger} from '../ledger-view.mjs';
import {buildCaskLedger} from '../cask-ledger.mjs';
import {fill as legacyFill,advance as legacyAdvance} from './brands-helpers.mjs';
const clone=x=>structuredClone(x);
function caskLedger(s){const ids=[...s.core.casks,...s.core.archive,...s.records,...s.releases].map(c=>c.caskId??c.id);const facts=D.nearbyComparisonFacts(s,{caskIds:[...new Set(ids)],productIds:[...new Set([...s.releases,...s.records].map(r=>r.productId))],includeManualSources:true});return buildCaskLedger(s,{facts,replay:cb=>D.replayDistilleryOperations(s,cb)});}
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:8*1024*1024}),raw);return D.restoreDistillery(raw);}
function steps(s,n){for(let guard=0;s.still.distillation.progress<n;guard++){assert(guard<100);const previous=s.still.distillation.progress;s=D.distillStep(s);assert(s.still.distillation.progress>previous);}return s;}
function months(s,n){for(let m=0;m<n;m++){assert.equal(s.decisions.length,0);assert.equal(s.trade.offer,null);const before=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,before+1,'actual finance/time gate at '+before);}return s;}
function fill(s,{malt='plain',ferment='long',start=40,end=58,cask='refill'}={}){s=D.selectFlavorCards(s,{malt,ferment});s=D.startDistillation(s);s=D.beginCollection(steps(s,start));return D.fillBarrel(D.stopDistillation(steps(s,end)),cask);}
function complete(s){for(let n=0;s.usual.reservation?.status==='active';n++){assert(n<100);s=D.distillStep(s);}return s;}
function hiredLegacy(){let s=legacyFill(D.newFreeAgingDistillery(42),{progress:65,type:'refill'});s=legacyAdvance(s,1);return D.hireStaff(s);}
function old20(){let s=hiredLegacy();s=D.bottleBranded(s,s.core.casks[0].id,{});return D.enableBrandIdentity(D.enableStaffExperience(s));}
let fundedCache;
function fundedOld20(){if(fundedCache)return clone(fundedCache);let s=old20();s=D.listBottles(D.setSalePrice(s,'low',s.result.productId),s.result.productId);s=legacyAdvance(s,12);for(let i=0;i<7;i++){s=legacyFill(s,{progress:65,type:'refill'});s=legacyAdvance(s,6);s=D.bottleBranded(s,s.core.casks.at(-1).id,{});s=D.listBottles(D.setSalePrice(s,'low',s.result.productId),s.result.productId);s=legacyAdvance(s,6);while(s.shop.offer){const o=s.shop.offer;s=D.declineShop(s,o.shopId,o.id);}}fundedCache=clone(s);return s;}
const cases=[
 {name:'果実・3年リフィル',malt:'plain',ferment:'long',start:40,end:58,cask:'refill',age:36},
 {name:'厚み・3年リフィル',malt:'plain',ferment:'short',start:74,end:94,cask:'refill',age:36},
 {name:'煙・3年リフィル',malt:'peat',ferment:'long',start:37,end:95,cask:'refill',age:36},
 {name:'同じ果実・3年1stフィル',malt:'plain',ferment:'long',start:40,end:58,cask:'bourbon',age:36},
 {name:'同じ果実・8年リフィル',malt:'plain',ferment:'long',start:40,end:58,cask:'refill',age:96}
];
let representativeStates=[];
test('five real finite releases use common24 sold bottles/month96 launch/seed and retain distinct flavor inputs',()=>{
 const results=[];representativeStates=cases.map(spec=>{
  let s=fill(D.newConnectedDistillery(20261021),spec);const caskId=s.core.casks[0].id;s=months(s,spec.age);s=D.bottleBranded(s,caskId,{},24);const productId=s.result.productId,releaseId=s.result.releaseId,sourceSnapshot=clone(s.releases[0].profile.flavor);
  // Bottle the physical remainder separately and keep it unlisted: the comparison
  // has exactly24 actual paid bottles without ongoing cask maintenance differing.
  if(s.core.casks.some(c=>c.id===caskId))s=D.bottleBranded(s,caskId,{});
  s=months(s,96-spec.age);s=D.listBottles(D.setSalePrice(s,'low',productId),productId);s=months(s,48);
  const release=s.releases.find(r=>r.id===releaseId),town=s.labConnection.town,p=s.core.products.find(p=>p.id===productId),shipments=town.shipments.filter(x=>x.parts.some(part=>part.releaseId===town.releases.find(r=>r.externalId===releaseId).id));
  assert.equal(release.bottles,24);assert.equal(release.sold,24);assert.equal(p.stock,0);assert.equal(s.core.month,144);assert.equal(shipments.reduce((n,x)=>n+x.count,0),24);assert(shipments.every(x=>x.month>=97));assert.equal(town.shipments.reduce((n,x)=>n+x.count,0),24);assert.deepEqual(release.profile.flavor,sourceSnapshot);assert.equal(town.releases.length,2);assert.equal(s.brands.length,1);assert.equal(s.records[0].name,'AmberTime');
  const actualFirstSold=shipments.at(-1).month;assert(town.shipments.every(x=>x.month<=actualFirstSold));
  cold(s);const ledger=buildReleaseLedger(s),history=buildDistilleryHistory(s),casks=caskLedger(s);assert(ledger.entries.some(r=>r.productId===productId));assert(history.events.some(e=>e.kind==='bottling'&&e.productId===productId));assert(casks.casks.some(c=>c.caskId===caskId));
  const counts=Object.fromEntries([...new Set(town.events.map(e=>e.type))].map(k=>[k,town.events.filter(e=>e.type===k).length]));
  results.push({name:spec.name,recipe:spec,seed:s.seed,listingMonth:96,observedThroughMonth:144,listedQuantity:24,actuallySold:release.sold,unlistedRemainder:s.releases.filter(r=>r.id!==releaseId).reduce((n,r)=>n+r.bottles,0),cash:s.core.cash,release:{id:releaseId,productId,bottledMonth:release.bottledMonth,age:release.age,name:release.flavorName,profile:release.profile},fit:NODES.map(n=>({id:n.id,name:n.name,...townAffinity(n,release)})),counts,arrivalPlaces:[...new Set(town.arrivals.map(e=>e.to))],interested:NODES.filter(n=>town.nodes[n.id].firstInterest!==null).map(n=>n.id),settled:NODES.filter(n=>town.nodes[n.id].root>=.18&&town.nodes[n.id].interest>=.04).map(n=>n.id),actualMainStockists:s.shop.relations.map(r=>r.shopId),news:D.connectedNews(s).map(e=>({month:e.month,type:e.type,to:e.to,reason:e.reason})),coldReplay:'exact'});
  return s;
 });
 assert.deepEqual(results.slice(0,3).map(r=>r.release.profile.flavor.primary),['fruit','body','smoke']);for(const i of [1,2,3,4])assert.notDeepEqual(results[0].fit.map(x=>x.fit),results[i].fit.map(x=>x.fit));assert.notEqual(results[0].release.profile.wood,results[3].release.profile.wood);assert.notEqual(results[0].release.profile.roughness,results[4].release.profile.roughness);
 if(process.env.STAGE4_WRITE_RESULTS==='1')writeFileSync(new URL('./stage4-results.json',import.meta.url),JSON.stringify({seed:20261021,listingMonth:96,observationMonths:48,quantity:24,runs:results,limits:['All use actual main production, bottling, prices and cash; no mutated finance or synthetic supplies.','Remainder bottles are real inventory and stay unlisted.','Common48month observation is bounded by existing empty-distillery finance reserve for the8year sample; no bypass.','Same arrival or stockist regions are reported without forcing divergence.']},null,2)+'\n');
});

test('old20 casks, products and queued old recipes survive enable and remain legacy',()=>{
 let old=old20();old=legacyFill(old,{progress:65,type:'bourbon'});const id=old.core.casks.at(-1).id;old=D.reserveStaff(old,id,'three');old=cold(old);const before=clone(old),s=D.enableStage4(old);
 for(const key of ['core','still','usual','releases','brands','recipeBook','records'])assert.deepEqual(s[key],before[key]);assert.deepEqual(s.operations.slice(0,-1),before.operations);assert.equal(s.operations.at(-1).key,'enable-stage4');assert.equal(s.core.casks[0].flavor,undefined);assert.equal(s.usual.reservation.recipe.flavorChoice,undefined);assert.equal(s.core.products[0].flavor,undefined);assert.deepEqual(old,before);assert.equal(D.serializeDistillery(D.preStage4State(s)),D.serializeDistillery(before));
 let next=months(s,1);next=complete(D.beginUsual(next));assert.equal(next.core.casks.at(-1).flavor,undefined);cold(next);
});

test('old20 active extraction and mid-tasting enable replay without reinterpreting original spirit',()=>{
 let old=old20();old=months(old,1);old=D.startDistillation(old);old=steps(old,37);old=cold(old);let s=cold(D.enableStage4(old));assert.deepEqual(s.still,old.still);assert.deepEqual(s.core.spirit,old.core.spirit);assert.equal(D.serializeDistillery(D.preStage4State(s)),D.serializeDistillery(old));s=D.fillBarrel(D.stopDistillation(steps(s,65)),'refill');assert.equal(s.core.casks[0].flavor,undefined);cold(s);
 let tasting=old20();tasting=legacyFill(tasting,{progress:65,type:'refill'});const id=tasting.core.casks[0].id;tasting=D.sampleDistillery(tasting,id);assert.equal(tasting.tastingId,id);cold(tasting);const upgraded=D.enableStage4(tasting);cold(upgraded);assert.equal(upgraded.tastingId,null);assert.deepEqual(upgraded.core,tasting.core);assert.equal(D.serializeDistillery(D.preStage4State(upgraded)),D.serializeDistillery(tasting));
});

test('new manual full recipe repeats three times and survives cold staff/recipe ledger replay',()=>{
 let s=D.enableStage4(fundedOld20());s=fill(s,{malt:'peat',ferment:'long',start:37,end:95,cask:'bourbon'});const source=s.core.casks.at(-1),choice=clone(source.flavor.choice);s=D.saveRecipe(s,source.id,'煙の製法');
 const entry=s.recipeBook.entries.at(-1);assert.deepEqual(entry.flavorChoice,choice);s=D.reserveStaff(s,source.id,'three');assert.deepEqual(s.usual.reservation.recipe.flavorChoice,choice);s=cold(s);
 for(let i=0;i<3;i++){s=months(s,1);s=D.beginUsual(s);s=steps(s,19);s=cold(s);s=complete(s);assert.deepEqual(s.core.casks.at(-1).flavor.choice,choice);assert.deepEqual(s.core.casks.at(-1).flavor.spirit,source.flavor.spirit);s=cold(s);}
 assert.equal(s.usual.reservation,null);assert.equal(s.core.casks.length,4);assert.equal(D.manualRecipeSources(s).at(-1).caskId,source.id);assert(caskLedger(s).recipes.saved.some(r=>r.caskId===source.id));
});


test('new final cask and connected street state survive an actual generation handover',()=>{
 let s=D.enableStage4(fundedOld20());s=months(s,360-s.core.month);assert.equal(D.generationStatus(s).phase,'last-batch');s=fill(s,{malt:'peat',ferment:'long',start:37,end:95,cask:'refill'});assert.equal(D.generationStatus(s).phase,'review');const before=clone(s),id=s.core.casks.at(-1).id;s=cold(s);s=D.handoverGeneration(s,1);assert.equal(D.generationStatus(s).id,2);assert.equal(s.labConnection.town.generation,2);before.labConnection.town.generation=2;assert.deepEqual(s.labConnection,before.labConnection);assert.deepEqual(s.core.casks,before.core.casks);assert.equal(s.core.casks.at(-1).flavor.primary,'smoke');assert.equal(D.finalBatchProvenance(s,id).id,1);cold(s);
});


test('old20 high-wood bottled provenance stays intact after town enable',()=>{
 let s=legacyFill(fundedOld20(),{progress:65,type:'bourbon'});s=legacyAdvance(s,84);const id=s.core.casks.at(-1).id;assert(s.core.casks.at(-1).wood>1);s=D.bottleBranded(s,id,{});const release=clone(s.releases.at(-1));s=D.enableStage4(s);s=D.selectFlavorCards(s,{malt:'plain',ferment:'long'});assert.deepEqual(s.releases.at(-1),release);const registered=s.labConnection.town.releases.find(r=>r.externalId===release.id);assert.equal(registered.product.wood,release.profile.wood);assert.equal(registered.product.aromaFamily,null);cold(s);
});

test('cask ledger retains captured aroma family for original and current profiles without aliasing saves',()=>{
 let s=fill(D.newConnectedDistillery(42),{malt:'peat',ferment:'long',start:37,end:95,cask:'bourbon'});
 const initial=clone(s.core.casks[0].flavor);s=months(s,12);const before=D.serializeDistillery(s),view=caskLedger(s).casks.find(c=>c.caskId===s.core.casks[0].id);
 assert.equal(view.initialProfile.flavor.primary,'smoke');assert.deepEqual(view.initialProfile.flavor,initial);assert.deepEqual(view.profile.flavor,s.core.casks[0].flavor);assert.equal(view.profile.flavor.months,12);
 view.initialProfile.flavor.profile.smoke=0;view.profile.flavor.profile.smoke=0;assert.equal(D.serializeDistillery(s),before);
});
