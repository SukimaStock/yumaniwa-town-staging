// Audit-only: existing model functions, no gameplay imports of this file.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as D from '../../partner-orders.mjs';
import * as M from '../../model.mjs';
import * as F from '../../lab-flavor.mjs';
import * as Monthly from '../../monthly.mjs';
import {automaticEvents} from '../../event-notices.mjs';
import {customerComments,playerMilestones} from '../../player-news.mjs';
import {shortChange} from '../../tasting-view.mjs';
import {profile,sampleOf} from '../../character.mjs';
const dir=new URL('./',import.meta.url),seed=42;
function fill(s,{malt='plain',ferment='long',start=12,end=40,cask='refill'}={}){
 s=D.selectFlavorCards(s,{malt,ferment});s=D.startRangeDistillation(s);
 while(s.still.distillation.progress<start)s=D.distillStep(s);s=D.beginCollection(s);
 while(s.still.distillation.progress<end)s=D.distillStep(s);
 return D.fillBarrel(D.stopDistillation(s),cask);
}
const cases=[
 {id:'fruit-first',malt:'plain',ferment:'long',start:12,end:40,cask:'bourbon'},
 {id:'fruit-refill',malt:'plain',ferment:'long',start:12,end:40,cask:'refill'},
 {id:'grain-refill',malt:'plain',ferment:'short',start:30,end:65,cask:'refill'},
 {id:'smoke-first',malt:'peat',ferment:'long',start:10,end:90,cask:'bourbon'},
 {id:'body-refill',malt:'plain',ferment:'short',start:63,end:89,cask:'refill'},
 {id:'early-fruit',malt:'plain',ferment:'long',start:0,end:20,cask:'refill'},
 {id:'middle-fruit',malt:'plain',ferment:'long',start:25,end:55,cask:'refill'},
 {id:'late-fruit',malt:'plain',ferment:'long',start:75,end:99,cask:'refill'}
];
const targets=new Set([0,6,12,24,36,60,84,120,144]),matrix=[];
for(const recipe of cases){
 let s=fill(D.newConnectedDistillery(seed),recipe),c=s.core.casks[0],initial=profile(c),samples=[],nameChanges=[],observerEvents=[],automaticNames=0;
 const row={recipe,seed,initialFamily:c.flavor.primary,profiles:[],nameChanges,observerEvents};
 for(let month=0;month<=144;month++){
  if(month){const old=s;const beforeName=c.flavor.label;s=Monthly.advanceMonthly(s,{expectedMonth:s.core.month,listedProductIds:[]});c=s.core.casks[0];
   if(c.flavor.label!==beforeName){nameChanges.push({month,label:c.flavor.label});const events=automaticEvents(old,s);automaticNames+=events.length;}
   for(const event of s.notesById[c.id].observations??[])if(event.age===month)observerEvents.push({month,id:event.eventId,title:event.title});
  }
  if(targets.has(month)){const sample=sampleOf(c);samples.push(sample);row.profiles.push({month,label:c.flavor.label,projected:{roughness:c.roughness,character:c.character,wood:c.wood},eight:F.flavorProfile(c),litres:c.litres,changeFromLastCheckpoint:samples.length>1?shortChange(sample,samples.at(-2)):null});}
 }
 row.automaticEventsAtNameChanges=automaticNames;row.distinctNames=c.flavor.history.length;matrix.push(row);
}
// Lawful fresh-main career: sell young manual releases until bottler discovery,
// then delegate a newly filled cask without ever sampling it.
let career=D.newConnectedDistillery(seed);const bootstrap=[];
for(let i=0;career.staffExperience.manualBottles<150;i++){
 if(i>12)throw Error('bootstrap did not unlock bottler');
 career=fill(career);const id=career.core.casks.at(-1).id;career=D.bottleBranded(career,id,{});
 career=D.listBottles(D.setSalePrice(career,'low',career.result.productId),career.result.productId);
 bootstrap.push({month:career.core.month,manualBottles:career.staffExperience.manualBottles,cash:career.core.cash});
 const before=career.core.month;career=D.tickDistillery(career);if(career.core.month!==before+1)throw Error('bootstrap clock blocked');
 if(career.trade.offer)career=D.declineOffer(career);
 if(career.shop.offer&&!career.shop.offer.notified)career=D.noticeShopOffer(career,career.shop.offer.shopId,career.shop.offer.id);
}
const funding=[];for(let i=0;career.core.cash<700&&i<36;i++){if(career.trade.offer)career=D.declineOffer(career);if(career.shop.offer&&!career.shop.offer.notified)career=D.noticeShopOffer(career,career.shop.offer.shopId,career.shop.offer.id);const before=career.core.month;career=D.tickDistillery(career);if(career.core.month!==before+1)throw Error('funding clock blocked');funding.push({month:career.core.month,cash:career.core.cash});}
career=D.hireBottlingStaff(career);career=fill(career);const parent=career.core.casks.at(-1),parentId=parent.id;
career=D.reserveBottling(career,parentId,{mode:'age',age:1,count:10});const beforeAuto=career;career=D.tickDistillery(career);const job=career.automation.lastBottlings.find(x=>x.caskId===parentId);if(!job)throw Error('automatic bottle did not execute');
const result=career.records.find(x=>x.productId===job.productId);
const autoBottle={seed,bootstrap,funding,month:career.core.month,parentId,job,age:result.age,sampleCount:result.samples.length,flavorName:result.profile.flavor.label,nameHistory:result.profile.flavor.history,automaticEvents:automaticEvents(beforeAuto,career),strictRoundTrip:D.serializeDistillery(D.restoreDistillery(D.serializeDistillery(career)))===D.serializeDistillery(career)};
// Controlled display projection, NOT simulated commerce: supply factual-format
// monthly retail receipt rows to measure the existing UI sampling/throttle only.
const baseRelease=career.releases.find(r=>r.productId===job.productId),feedback=[];
for(const displaySeed of [1,2,3,7,11,42,99,20261021]){
 const shipments=Array.from({length:360},(_,i)=>({id:'retail:'+i+':'+baseRelease.productId,month:i,count:1,parts:[{releaseId:1,count:1}]}));
 const view={seed:displaySeed,brands:career.brands,releases:[baseRelease],labConnection:{version:1,town:{shipments,releases:[{id:1,externalId:baseRelease.id}],events:[]}}};
 const comments=customerComments(view);feedback.push({seed:displaySeed,monthlyReceiptRows:shipments.length,comments:comments.length,months:comments.map(x=>x.month),meanGap:comments.length>1?(comments.at(-1).month-comments[0].month)/(comments.length-1):null});
}
let careState=fill(D.newConnectedDistillery(seed),{cask:'bourbon'});const careId=careState.core.casks[0].id;const caredState=D.careForCask(careState,careId);let normal=structuredClone(careState.core.casks[0]),cooled=structuredClone(caredState.core.casks[0]);const cooling=[];for(let month=1;month<=144;month++){normal=M.ageCask(normal);cooled=M.ageCask(cooled);if([12,36,60,120,144].includes(month))cooling.push({month,normal:{litres:normal.litres,projected:{roughness:normal.roughness,character:normal.character,wood:normal.wood},name:normal.flavor.label},cooled:{litres:cooled.litres,projected:{roughness:cooled.roughness,character:cooled.character,wood:cooled.wood},name:cooled.flavor.label},sameEight:JSON.stringify(normal.flavor.profile)===JSON.stringify(cooled.flavor.profile),sameNameHistory:JSON.stringify(normal.flavor.history)===JSON.stringify(cooled.flavor.history)});}
const hashes=Object.fromEntries(['lab-flavor.mjs','monthly.mjs','partner-orders.mjs','event-notices.mjs','player-news.mjs','shop-app.mjs','tasting-view.mjs'].map(p=>[p,createHash('sha256').update(fs.readFileSync(new URL('../../'+p,import.meta.url))).digest('hex')]));
const output={runtimeSha:'2a1a172fa67ef7bda3cad82c9070c8946353b3f6',methodology:{matrix:'Main full-range manual fill API at seed42, then unchanged monthly chemistry/free-aging observer directly for144months. No finance progression implied by this component experiment.',autoBottle:'Fresh connected-main public operations only, no direct state mutation. Manual sales unlock bottler then age1 reservation.',feedback:'Display projection contract only: constructed monthly retail receipt rows, no claim they were produced in a playable game. Existing deterministic1/8 filter and12-month gap measured.'},sourceHashes:hashes,matrix,autoBottle,feedback,cooling};
fs.writeFileSync(new URL('taste-results.json',dir),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({cases:matrix.length,names:matrix.map(r=>({id:r.recipe.id,changes:r.nameChanges,observations:r.observerEvents,automaticAtChanges:r.automaticEventsAtNameChanges})),autoBottle,feedback},null,2));
