// Finite diagnostics of fictional shop routes; not a human play study or native offer replay.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as L from './model.mjs';
const seeds=[20261020,42],horizon=12,originIds=['town','station','specialist','super'];
const round=n=>Math.round(n*1e6)/1e6,clone=structuredClone;
const modes=L.MODES.map(x=>x.id),recipes=L.RECIPES.map(x=>x.id);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function legalTargets(s){return L.NODES.filter(n=>s.releases.some(r=>L.quote(s,n.id,r.id).ok)).map(n=>n.id);}
function metrics(s,initial){
 const v=L.view(s),offers=s.events.filter(e=>e.kind==='offer'),intro=offers.filter(e=>e.offerKind==='introduction'),repeat=offers.filter(e=>e.offerKind==='repeat');
 const spread=s.events.filter(e=>e.kind==='spread');
 return {month:s.month,totalDelivered:s.deliveries.reduce((n,d)=>n+d.count,0),stock:s.releases.reduce((n,r)=>n+r.stock,0),known:v.nodes.filter(n=>n.known).map(n=>n.id),accepted:v.nodes.filter(n=>n.accepted).map(n=>n.id),handling:v.nodes.filter(n=>n.handling).map(n=>n.id),newAccepted:v.nodes.filter(n=>n.accepted&&!initial.includes(n.id)).map(n=>n.id),reachedEver:[...new Set(spread.map(e=>e.nodeId))],newOffers:intro.map(e=>[e.nodeId,e.month]),firstNewOfferMonth:intro.length?Math.min(...intro.map(e=>e.month)):null,repeatOffers:repeat.map(e=>[e.nodeId,e.month]),fulfilledRepeat:s.events.filter(e=>e.kind==='fulfilled-repeat').length,continuingNow:v.nodes.filter(n=>n.memory.continuing).map(n=>n.id),actualDeliveryMonths:Object.fromEntries(v.nodes.filter(n=>n.received).map(n=>[n.id,n.memory.months])),legalNextTargets:legalTargets(s),remainingPackets:s.packets.length,spreadEvents:spread.length,retailSold:v.baseline.retailSold,retailBonus:v.baseline.bonus};
}
function nativeBrief(x){return {scenario:x.scenario,prepared:x.prepared,retailSold:x.retailSold,bonus:x.bonus,retailFactors:x.retailFactors,shops:x.shops.filter(n=>n.applicable).map(n=>({id:n.id,evidence:n.evidence,productCondition:n.productCondition,departmentEligible:n.departmentEligible})),note:x.note};}
function nextPortionProbe(s){
 const before=legalTargets(s),c=L.view(s).cask;if(!c||c.bottles<10)return {before,bottled:false,reason:'Fewer than10 bottles remain in the actual parent.'};
 const next=L.bottleCurrent(s,10),r=next.releases.at(-1);return {before,bottled:true,after:legalTargets(next),release:{parentSerial:r.parentSerial,age:r.age,profile:r.profile,price:r.price,count:r.originalCount},knownButNotLegal:L.view(next).nodes.filter(n=>n.known&&!legalTargets(next).includes(n.id)).map(n=>({id:n.id,reason:L.quote(next,n.id,r.id).reason}))};
}
function run({seed,mode,recipe,origin='normal',initialAge=12,pattern='concentrate',accept=true,keepTrace=false}={}){
 let s=L.createSession({seed,mode,recipe,origin,initialAge,initialCount:20}),initial=L.view(s).nodes.filter(n=>n.accepted).map(n=>n.id),actions={deliver:0,accept:0,advance:0},everContinuing=new Set(),invalid=null;
 const schedules=pattern==='disperse'?[[0,'town',5],[0,'station',5],[0,'super',10]]:pattern==='splitSameMonth'?Array.from({length:4},()=>[0,'town',5]):pattern==='repeat'?[[0,'town',5],[2,'town',5],[4,'town',10]]:pattern==='lateBulk'?[[4,'town',20]]:[[0,origin==='normal'?'town':origin,20]];
 const initialProfile=clone(s.releases[0]),nativeBefore=nativeBrief(L.baselineEvidence(s)),sample=()=>{for(const n of L.view(s).nodes)if(n.memory.continuing)everContinuing.add(n.id);};
 const acceptPending=()=>{if(!accept)return;for(const n of L.view(s).nodes)if(n.offer){s=L.acceptOffer(s,n.offer.id);actions.accept++;}};
 for(let month=0;month<=horizon;month++){
  for(const [when,node,count] of schedules.filter(x=>x[0]===month)){
   const r=s.releases[0],q=L.quote(s,node,r.id,count);if(!q.ok){invalid={month,node,count,reason:q.reason};break;}
   s=L.deliver(s,node,r.id,count,{reflection:'fixed analysis schedule'});actions.deliver++;sample();
  }
  if(invalid)break;acceptPending();sample();if(month===horizon)break;s=L.advance(s,1);actions.advance++;sample();acceptPending();
 }
 const out={seed,mode,recipe,origin,initialAge,pattern,legal:!invalid,invalid,initialIntroductions:initial,initialProfile:{age:initialProfile.age,profile:initialProfile.profile,price:initialProfile.price,count:initialProfile.originalCount},actions,logicalTasks:actions.deliver+actions.accept+actions.advance,everContinuing:[...everContinuing],...metrics(s,initial),nativeBefore,nativeAfter:nativeBrief(L.baselineEvidence(s)),nextPortion:!invalid?nextPortionProbe(s):null};
 if(!invalid){assert.equal(out.totalDelivered,20);assert.equal(out.stock,0);assert.equal(out.retailSold,0);assert.equal(out.retailBonus,0);}
 if(keepTrace)out.trace=s.events.filter(e=>['delivery','spread','offer','accept','fulfilled-repeat'].includes(e.kind)).map(e=>({month:e.month,kind:e.kind,node:e.nodeId,...(e.offerKind?{offerKind:e.offerKind}:{}),...(e.from?{from:e.from,route:e.route,weight:round(e.weight),deliveryIds:e.deliveryIds,rootId:e.rootId}:{}),...(e.count?{count:e.count}:{}),...(e.reason?{reason:e.reason}:{})}));
 return out;
}
const strategy=[];for(const seed of seeds)for(const mode of modes)for(const recipe of recipes)for(const pattern of ['concentrate','disperse'])strategy.push(run({seed,mode,recipe,pattern,keepTrace:seed===seeds[0]&&recipe==='aroma'&&mode!=='baseline'}));
assert(strategy.every(r=>r.legal),'Controlled12-month20-bottle strategy must remain legal.');
// Four cap>=20 origins, one actual24-month aroma profile legal at all four. Small-cap origins stay excluded.
const origins=[];for(const seed of seeds)for(const mode of modes)for(const origin of originIds)origins.push(run({seed,mode,recipe:'aroma',origin,initialAge:24}));assert(origins.every(r=>r.legal));
const naturalFlavors=[];for(const seed of seeds)for(const mode of modes)for(const r of L.RECIPES)naturalFlavors.push(run({seed,mode,recipe:r.id,initialAge:r.age,keepTrace:seed===seeds[0]&&mode==='spread'}));
const timing=[];for(const seed of seeds)for(const mode of modes)for(const recipe of recipes)for(const pattern of ['concentrate','splitSameMonth','repeat','lateBulk'])timing.push(run({seed,mode,recipe,pattern}));
function comparable(r){return JSON.stringify({newOffers:r.newOffers,repeatOffers:r.repeatOffers,accepted:r.accepted,handling:r.handling,spreadEvents:r.spreadEvents,everContinuing:r.everContinuing,actualDeliveryMonths:r.actualDeliveryMonths,reached:r.reachedEver,known:r.known,next:r.nextPortion?.after});}
const splitInvariance=[];for(const seed of seeds)for(const mode of modes)for(const recipe of recipes){const bulk=timing.find(r=>r.seed===seed&&r.mode===mode&&r.recipe===recipe&&r.pattern==='concentrate'),split=timing.find(r=>r.seed===seed&&r.mode===mode&&r.recipe===recipe&&r.pattern==='splitSameMonth');splitInvariance.push({seed,mode,recipe,equalOutcomes:comparable(bulk)===comparable(split),tasks:[bulk.logicalTasks,split.logicalTasks]});}assert(splitInvariance.every(r=>r.equalOutcomes));
const portions=[];
for(const seed of seeds)for(const mode of modes){
 let s=L.createSession({seed,mode,recipe:'aroma',initialAge:12,initialCount:10}),rows=[],tasks=0;
 for(const age of [12,24,36]){
  if(age>12){s=L.advance(s,12);for(const n of L.view(s).nodes)if(n.offer){s=L.acceptOffer(s,n.offer.id);tasks++;}s=L.bottleCurrent(s,10);tasks++;}
  const r=s.releases.at(-1),candidate=L.NODES.filter(n=>L.quote(s,n.id,r.id,10).ok),node=(candidate.find(n=>n.id==='specialist')??candidate.find(n=>n.id==='bar')??candidate.find(n=>n.id==='town')??candidate.find(n=>n.id==='super')??candidate[0]);
  assert(node,'Actual10-bottle portion must have at least one legal destination');s=L.deliver(s,node.id,r.id,10);tasks++;
  rows.push({month:s.month,age:r.age,parent:r.parentSerial,profile:r.profile,price:r.price,delivered:10,destination:node.id,legalDestinations:candidate.map(n=>n.id),parentLitres:L.view(s).cask?.litres??0});
 }
 assert.equal(new Set(s.releases.map(r=>r.parentSerial)).size,1);assert.equal(s.deliveries.reduce((n,d)=>n+d.count,0),30);
 portions.push({seed,mode,months:24,selection:'Prefer an actually accepted specialist, then bar, then town, then supermarket, otherwise first legal destination; never fabricate introductions.',tasks,releases:rows,events:s.events.filter(e=>['offer','accept','fulfilled-repeat'].includes(e.kind)).map(e=>({month:e.month,kind:e.kind,node:e.nodeId,offerKind:e.offerKind})),frozenFirstProfileUnchanged:JSON.stringify(s.releases[0].profile)===JSON.stringify(rows[0].profile),...metrics(s,L.INITIAL_PARTNERS)});
}
const established=[];for(const recipe of recipes){const s=L.createSession({mode:'baseline',recipe});established.push({recipe,age:s.releases[0].age,zero:nativeBrief(L.baselineEvidence(s)),established:nativeBrief(L.baselineEvidence(s,'established'))});}
const aggs=(rows,keys)=>{const groups=new Map();for(const r of rows){const key=keys.map(k=>r[k]).join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}return [...groups.values()].map(rs=>({...Object.fromEntries(keys.map(k=>[k,rs[0][k]])),runs:rs.length,legal:rs.filter(r=>r.legal).length,meanIntroductionOffers:round(rs.reduce((n,r)=>n+r.newOffers.length,0)/rs.length),meanNewAccepted:round(rs.reduce((n,r)=>n+r.newAccepted.length,0)/rs.length),meanReachedTypes:round(rs.reduce((n,r)=>n+r.reachedEver.length,0)/rs.length),meanLogicalTasks:round(rs.reduce((n,r)=>n+r.logicalTasks,0)/rs.length),repeatOffers:rs.reduce((n,r)=>n+r.repeatOffers.length,0),fulfilledRepeats:rs.reduce((n,r)=>n+r.fulfilledRepeat,0),everContinuing:rs.filter(r=>r.everContinuing.length).length,meanNextTargetsAfterPortion:round(rs.reduce((n,r)=>n+(r.nextPortion?.after.length??0),0)/rs.length)}));};
const results={version:'ambertime-reputation-analysis/0.1',baseline:'229e6050869a1ef445068e7527bb46227aeeef92',modelSha256:hash(fs.readFileSync(new URL('./model.mjs',import.meta.url))),seeds,horizon,conditions:L.MODES,nodes:L.NODES,recipes:L.RECIPES,counts:{strategy:strategy.length,origins:origins.length,naturalFlavors:naturalFlavors.length,timing:timing.length,portions:portions.length},design:{strategy:'Same prepared parent profile at12months,20 frozen bottles, normal3 introductions, same-month20 town versus5town+5station+10super. All legal; age12 differs from natural flavor presets.',origins:'Same24-month aroma profile and20bottles at one of town/station/specialist/super, exactly one initial introduction. Bar max10 and department max5 excluded, never relaxed.',naturalFlavors:'Use each recipe natural6/24/30/24month age; all20to town only, flavor and age are confounded. No illegal supermarket route for6month product.',timing:'Same frozen20bottles: all20at0,4x5same-month0,5at0+5at2+10at4,all20at4; same12month endpoint. Temporal exposure differs, so compare repeats with both early and late bulk controls.',portions:'One real parent,10bottles each at12/24/36,24elapsed months; offers accepted only when generated. Fixed destination preference is a mechanical probe, not human next-choice evidence.',logicalTasks:'Count delivery, explicit offer acceptance, one-month advances; shared setup bottling omitted. API action count is not observed UI click burden.',native:'Default retail sold0; established reference constructs40retail sales across2releases, not full native offers/contracts/replay. Six-store network remains fictional.'},aggregate:{strategy:aggs(strategy,['mode','pattern']),origin:aggs(origins,['mode','origin']),natural:aggs(naturalFlavors,['mode','recipe']),timing:aggs(timing,['mode','pattern'])},strategy,origins,naturalFlavors,timing,splitInvariance,portions,established,limits:['No native six-store offer parity. Native delivery is not retail evidence; zero baseline can legitimately create no offers.','Main20strategy uses common12month age; all prices may be at the16floor and some future shops cannot handle that frozen product.','Natural recipe comparisons change age and profile together; they do not isolate a flavor-axis coefficient.','All20 initial bottles are consumed. New offers do not create stock: existing legal next targets can be zero until another actual parent portion is bottled.','A seeded route is not a guarantee of a new offer; price, age, taste, stock preview and eligibility can prevent it.','Familiarity is conditional and recent; past repeat invitation/fulfillment and current continuing flags are different metrics.','Accept all genuine offers is an analysis policy; the user may decline. No automatic follow-up deliveries are made by the model.','Potential next targets from a new10-bottle portion are a counterfactual inspection, not extra deliveries in the strategy comparison.','No scalar optimum, human enjoyment, real word-of-mouth behavior or spontaneous next-bottling motivation is established.']};
// Outcome checkpoints allow representation-only edits without re-running the finite model grid.
fs.writeFileSync('/tmp/ambertime-reputation-analysis-full.json',JSON.stringify(results));
// Column tables retain per-run outcomes without duplicating labels and native snapshots.
const columns=['seed','mode','recipe','origin','initialAge','pattern','legal','invalid','logicalTasks','actions','everContinuing','newAccepted','reachedEver','newOffers','firstNewOfferMonth','repeatOffers','fulfilledRepeat','continuingNow','actualDeliveryMonths','legalNextTargets','remainingPackets','spreadEvents','nextPortionTargets'];
results.rowColumns=columns;results.rowInvariants={month:12,totalDelivered:20,stock:0,retailSold:0,retailBonus:0,timingConcentrate:'Same rows as strategy concentrate; retained in timing aggregates/counts but not duplicated in table.'};
results.selectedTraces=[];results.preparedProfiles=[];
const seenProfiles=new Set();
for(const name of ['strategy','origins','naturalFlavors','timing']){
 const rows=results[name];
 for(const r of rows){
  if(r.trace&&r.mode==='spread'&&(name==='strategy'||['aroma','balanced'].includes(r.recipe)))results.selectedTraces.push({matrix:name,seed:r.seed,mode:r.mode,recipe:r.recipe,origin:r.origin,pattern:r.pattern,events:r.trace});
  const key=[r.seed,r.recipe,r.initialAge].join('|');if(!seenProfiles.has(key)){seenProfiles.add(key);results.preparedProfiles.push({seed:r.seed,recipe:r.recipe,initialAge:r.initialAge,...r.initialProfile,nextPortion:r.nextPortion});}
 }
 results[name]=rows.filter(r=>name!=='timing'||r.pattern!=='concentrate').map(r=>columns.map(k=>k==='nextPortionTargets'?r.nextPortion?.after??[]:r[k]??null));
}
const text=JSON.stringify(results);assert(Buffer.byteLength(text)<100000,'Output artifact budget exceeded');fs.writeFileSync(new URL('./results.json',import.meta.url),text+String.fromCharCode(10));
console.log(JSON.stringify({counts:results.counts,bytes:Buffer.byteLength(text),aggregate:results.aggregate,splitInvariant:splitInvariance.every(x=>x.equalOutcomes),portionRoutes:portions.map(x=>({seed:x.seed,mode:x.mode,destinations:x.releases.map(r=>r.destination),newOffers:x.newOffers})),nativeEstablished:established.map(x=>({recipe:x.recipe,age:x.age,retailSold:x.established.retailSold,bonus:x.established.bonus,eligible:x.established.shops.filter(n=>n.evidence.eligible).map(n=>n.id)}))},null,2));
