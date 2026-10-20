import {NORMAL_SHOP_DEMAND,normalShopOrders,planShopFulfillment} from './shop-demand.mjs?v=0.45-shop-demand';
import {PARTIAL_BOTTLING,partialMode,DELEGATION,delegationMode} from './partial-bottling.mjs?v=0.41-delegation';
export {PARTIAL_BOTTLING,partialMode,DELEGATION,delegationMode} from './partial-bottling.mjs?v=0.41-delegation';
import {DISTILLER,staffMode} from './distiller.mjs?v=0.41-delegation';
export {DISTILLER,staffMode} from './distiller.mjs?v=0.41-delegation';
import {RECIPE_BOOK,recipesMode,selectedUsualRecipe} from './recipe-book.mjs?v=0.41-delegation';
export {RECIPE_BOOK,recipesMode,selectedUsualRecipe} from './recipe-book.mjs?v=0.41-delegation';
import {GENERATIONS,generationMode,newGeneration,generationStatus,generationNeedsClock,finalBatchProvenance,advanceGeneration,fixGeneration,generationReview} from './generations.mjs?v=0.41-delegation';
export {GENERATIONS,generationMode,generationStatus,generationNeedsClock,finalBatchProvenance} from './generations.mjs?v=0.41-delegation';
import {BOTTLE_STORAGE,bottleStorageMode} from './bottle-storage.mjs?v=0.41-delegation';
export {BOTTLE_STORAGE,bottleStorageMode} from './bottle-storage.mjs?v=0.41-delegation';
// New execution contract. The complete v0.9 reader remains frozen.
import * as V09 from './trade.mjs?v=0.9';
import * as E from './economy.mjs?v=0.44-monthly-timing';
import * as M from './model.mjs?v=0.6-parallel';
import {mixSeed} from './character.mjs?v=0.41-delegation';
import {PARALLEL_PARAMETERS as P,ECONOMY_PARAMETERS as C} from './economy-parameters.mjs';
import {WHOLESALE as W} from './wholesale-parameters.mjs';
import {PARTNER_ORDERS as T,PARTNERS,SPECIAL_ORDER} from './partner-parameters.mjs';
import {AROMA_MODEL,aromaPreview} from './aroma-extraction.mjs?v=0.14';
import {SHOP,STOCKISTS,SHOPS,stockistsMode,shopMode,deliveryTotals,shopEvidence,shopProductCondition} from './shop-model.mjs?v=0.41-delegation';
export {SHOP,STOCKISTS,SHOPS,stockistsMode,shopProductCondition,shopBrandStats,shopEvidence} from './shop-model.mjs?v=0.41-delegation';
import {DEPARTMENT,departmentMode,departmentReleaseEligible,departmentUsedRelease,departmentSource,departmentSelection} from './department-projects.mjs?v=0.44-monthly-timing';
export {DEPARTMENT,departmentMode,departmentInterests,departmentAdoptions,departmentStatus} from './department-projects.mjs?v=0.44-monthly-timing';
import {brandReputation,retailReputationFactors} from './brand-reputation.mjs?v=0.12';
export {SPECIAL_ORDER} from './partner-parameters.mjs';
export {currentCask,upkeep,observation,comparison,quote,salePrices,marketValue,endTasting} from './economy.mjs?v=0.44-monthly-timing';
const clone=x=>structuredClone(x),round=x=>Math.round(x*100)/100;
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const blocked=s=>s.tastingId!==null||s.decisions.length>0||s.trade.offer!==null;
// Completed bottles do not mutate or resolve unrelated cask decisions.
const bottleActionBlocked=s=>bottleStorageMode(s)?s.tastingId!==null||s.trade.offer!==null:blocked(s);
function action(s,key,value){advanceGeneration(s,key,value);s.operations.push({key,...(value===undefined?{}:{value})});assert(s.operations.length<=P.maxOperations,'帳面がいっぱいです。');return s;}
export function newDistillery(seed=20261015){const s=E.newDistillery(seed);return {...s,version:T.version,rules:T.rules,trade:{rng:mixSeed(seed^0x57a1e),nextOfferMonth:6,nextProposalMonth:0,offerSerial:0,bookingSerial:0,offer:null,relationship:null,contracts:[],history:[],lastShipment:null,lastShipments:[],lastObservations:[],order:null,orderSerial:0},origin:null};}
// A recorded execution boundary keeps every pre-fix v6 replay unchanged.
export const PROMISED_CARE=Object.freeze({version:7,rules:'promised-wholesale-care'});
const careMode=s=>s.version===PROMISED_CARE.version&&s.rules===PROMISED_CARE.rules||brandMode(s);
export const RETAIL_BRANDS=Object.freeze({version:8,rules:'retail-brands',maxBrands:128,maxReleases:512});
const brandMode=s=>s.version===RETAIL_BRANDS.version&&s.rules===RETAIL_BRANDS.rules||reputationMode(s);
export const BRAND_REPUTATION=Object.freeze({version:9,rules:'retail-brand-reputation'});
const reputationMode=s=>s.version===BRAND_REPUTATION.version&&s.rules===BRAND_REPUTATION.rules||usualMode(s);
export const USUAL_BATCH=Object.freeze({version:10,rules:'usual-batch'});
const usualMode=s=>s.version===USUAL_BATCH.version&&s.rules===USUAL_BATCH.rules||aromaMode(s);
export const AROMA_DISTILLATION=Object.freeze({version:11,rules:'aroma-distillation'});
const aromaMode=s=>s.version===AROMA_DISTILLATION.version&&s.rules===AROMA_DISTILLATION.rules||shopMode(s);
export const BRAND_BOTTLES=Object.freeze([{id:'round',name:'丸瓶'},{id:'slender',name:'細瓶'}].map(Object.freeze));
export const BRAND_LABELS=Object.freeze([{id:'cream',name:'生成り'},{id:'dark',name:'墨色'}].map(Object.freeze));
export const defaultBrand=s=>({name:'AmberTime '+((s.brands?.length??0)+1),bottle:BRAND_BOTTLES[0].id,label:BRAND_LABELS[0].id});
export function enableBrands(s){
 if(brandMode(s))return s;
 assert(s.operations.length<P.maxOperations,'帳面がいっぱいです。元の保存は以前の版で開けます。');
 let j=enablePromisedCare(s);assert(j.operations.length<P.maxOperations,'帳面がいっぱいです。元の保存は以前の版で開けます。');j=clone(j);
 j.version=RETAIL_BRANDS.version;j.rules=RETAIL_BRANDS.rules;j.brands=[];j.releases=[];return action(j,'enable-brands');
}
export const newBrandedDistillery=seed=>enableBrands(newPromisedDistillery(seed));
export function enableReputation(s){
 if(reputationMode(s))return s;
 const branded=enableBrands(s);
 assert(branded.operations.length<P.maxOperations,'帳面がいっぱいです。元の保存は以前の版で開けます。');
 const j=clone(branded);j.version=BRAND_REPUTATION.version;j.rules=BRAND_REPUTATION.rules;
 return action(j,'enable-brand-reputation');
}
export const newReputationDistillery=seed=>enableReputation(newBrandedDistillery(seed));
// Recipes are observations of successful manual fills, never a second production model.
function latestManualRecipe(s){
 let recipe=s.origin?latestManualRecipe(s.origin):null,stopAt=null;
 for(const op of s.operations){if(op.key==='start')stopAt=null;else if(op.key==='stop')stopAt=op.value;else if(op.key==='fill'&&Number.isInteger(stopAt)&&stopAt>=P.minimumStop&&stopAt<P.distillMax&&C.casks[op.value]){recipe={stopAt,type:op.value};stopAt=null;}}
 return recipe;
}
export function enableUsual(s){
 if(usualMode(s))return s;
 const j=clone(enableReputation(s));j.version=USUAL_BATCH.version;j.rules=USUAL_BATCH.rules;
 j.usual={recipe:latestManualRecipe(s),reservation:null};return action(j,'enable-usual');
}
export const newUsualDistillery=seed=>enableUsual(newReputationDistillery(seed));
export function enableAroma(s){
 if(aromaMode(s))return s;
 const usual=enableUsual(s);
 assert(usual.operations.length<P.maxOperations,'帳面がいっぱいです。元の保存は以前の版で開けます。');
 const j=clone(usual);j.version=AROMA_DISTILLATION.version;j.rules=AROMA_DISTILLATION.rules;
 return action(j,'enable-aroma',{progress:j.still.phase==='distilling'?j.still.distillation.progress:null});
}
export const newAromaDistillery=seed=>enableAroma(newUsualDistillery(seed));
export function enableShop(s){
 if(shopMode(s))return s;
 const aroma=enableAroma(s);
 assert(aroma.operations.length<P.maxOperations,'帳面がいっぱいです。元の保存は以前の版で開けます。');
 const j=clone(aroma);j.version=SHOP.version;j.rules=SHOP.rules;
 j.shop={offer:null,offerSerial:0,nextOfferMonth:j.core.month+SHOP.initialWait,declinedUntil:{},relations:[],deliveries:[]};
 return action(j,'enable-shop',{progress:j.still.phase==='distilling'?j.still.distillation.progress:null});
}
export const newShopDistillery=seed=>enableShop(newAromaDistillery(seed));
// A logged boundary preserves all v12 calculations, including its price floor.
export function enableStockists(s){
 if(stockistsMode(s))return s;
 const old=enableShop(s);assert(old.operations.length<P.maxOperations,'帳面がいっぱいです。元の保存は以前の版で開けます。');
 const j=clone(old);j.version=STOCKISTS.version;j.rules=STOCKISTS.rules;j.shop.pendingOffers=[];
 for(const [brandId,until] of Object.entries(j.shop.declinedUntil))j.shop.declinedUntil[`${SHOP.id}:${brandId}`]=until;
 return action(j,'enable-stockists',{progress:shopProgress(s)});
}
export const newStockistsDistillery=seed=>enableStockists(newShopDistillery(seed));
export function enableDepartment(s){
 if(departmentMode(s))return s;
 const old=enableStockists(s);assert(old.operations.length<P.maxOperations,'帳面がいっぱいです。');
 const j=clone(old);j.version=DEPARTMENT.version;j.rules=DEPARTMENT.rules;j.department={interests:[],adoptions:[],seenSources:[]};
 // Existing continuous offers become finite consultations, without inventing adoptions.
 for(const o of [j.shop.offer,...j.shop.pendingOffers])if(o?.shopId==='department'){
  const source=departmentSource(j,o.brandId);if(source){decorateDepartmentOffer(o,source);j.department.seenSources.push(source.id);}
 }
 // A legacy offer whose qualifying release was already delivered cannot select it again.
 const keep=o=>o?.shopId!=='department'||!!o.selectionId;
 j.shop.pendingOffers=j.shop.pendingOffers.filter(keep);if(j.shop.offer&&!keep(j.shop.offer))nextStockistOffer(j);
 return action(j,'enable-department',{progress:shopProgress(s)});
}
export const newDepartmentDistillery=seed=>enableDepartment(newStockistsDistillery(seed));
export function enableBottleStorage(s){
 if(bottleStorageMode(s))return s;
 const old=enableDepartment(s);assert(old.operations.length<P.maxOperations,'帳面がいっぱいです。');
 const j=clone(old);j.version=BOTTLE_STORAGE.version;j.rules=BOTTLE_STORAGE.rules;
 return action(j,'enable-bottle-storage',{progress:shopProgress(s)});
}
export const newBottleDistillery=seed=>enableBottleStorage(newDepartmentDistillery(seed));
export function enableGenerations(s){
 if(generationMode(s))return s;
 const old=enableBottleStorage(s);assert(old.operations.length<P.maxOperations,'帳面がいっぱいです。');
 const j=clone(old);j.version=GENERATIONS.version;j.rules=GENERATIONS.rules;j.generations={active:newGeneration(1,0),completed:[]};
 return action(j,'enable-generations',{progress:shopProgress(s)});
}
export const newGenerationDistillery=seed=>enableGenerations(newBottleDistillery(seed));
export function enableRecipeBook(s){
 if(recipesMode(s))return s;
 const old=enableGenerations(s);assert(old.operations.length<P.maxOperations,'帳面がいっぱいです。');
 const j=clone(old);j.version=RECIPE_BOOK.version;j.rules=RECIPE_BOOK.rules;j.recipeBook={entries:[],selectedId:null};
 return action(j,'enable-recipe-book',{progress:shopProgress(s)});
}
export const newRecipeDistillery=seed=>enableRecipeBook(newGenerationDistillery(seed));
export function enableStaff(s,{legacy=true}={}){
 if(staffMode(s))return s;
 assert(typeof legacy==='boolean','移行の指定が不正です。');
 const old=enableRecipeBook(s);assert(old.operations.length<P.maxOperations,'帳面がいっぱいです。');
 const j=clone(old);j.version=DISTILLER.version;j.rules=DISTILLER.rules;j.staff={hired:false,legacy,hiredMonth:null};
 return action(j,'enable-staff',{legacy,progress:shopProgress(s)});
}
export const newStaffDistillery=seed=>enableStaff(newRecipeDistillery(seed),{legacy:false});
export function enablePartialBottling(s){
 if(partialMode(s))return s;
 const old=enableStaff(s,{legacy:true});assert(old.operations.length<P.maxOperations,'帳面がいっぱいです。');
 const j=clone(old);j.version=PARTIAL_BOTTLING.version;j.rules=PARTIAL_BOTTLING.rules;
 return action(j,'enable-partial-bottling',{progress:shopProgress(s)});
}
export const newPartialDistillery=seed=>enablePartialBottling(newStaffDistillery(seed));
// v20 is a recorded work-local rules boundary; old saves retain their replay.
export function enableDelegation(s){
 if(delegationMode(s))return s;
 const old=enablePartialBottling(s);
 assert(old.brands.length===0&&old.releases.length===0&&!old.core.casks.length&&!old.trade.relationship&&!old.trade.offer&&!old.trade.contracts.length,'新しい蒸留所で始めます。');
 const j=clone(old);j.version=DELEGATION.version;j.rules=DELEGATION.rules;
 j.brands=[{id:1,name:'AmberTime',bottle:'round',label:'cream',createdMonth:j.core.month}];
 j.automation={reservations:[],lastBottlings:[],lastShipments:[]};
 return action(j,'enable-delegation',{progress:shopProgress(s)});
}
// Existing v20 months replay unchanged; fixes apply only after this recorded boundary.
export const delegationFixesMode=s=>delegationMode(s)&&s.automation?.fixVersion===1;
export function enableDelegationFixes(s){
 assert(delegationMode(s),'任せるに対応した保存で始めます。');if(delegationFixesMode(s))return s;
 const j=clone(s);j.automation.fixVersion=1;
 return action(j,'enable-delegation-fixes',{progress:shopProgress(s)});
}
export const newDelegatedDistillery=seed=>enableDelegationFixes(enableDelegation(newPartialDistillery(seed)));
// Staff discovery is work-local and recorded, so earlier free automation replays unchanged.
export const BOTTLING_STAFF=Object.freeze({hireCost:20,salary:2});
export const staffProgressionMode=s=>delegationFixesMode(s)&&s.staffProgression?.version===1;
export function enableStaffProgression(s){
 if(staffProgressionMode(s))return s;
 const old=enableDelegationFixes(s),j=clone(old),manualFill=old.operations.some(o=>o.key==='fill'),manualBottle=old.operations.some(o=>['bottle','bottle-branded','bottle-counted-branded'].includes(o.key));
 j.staffProgression={version:1,distill:{unlocked:manualFill||old.staff.hired,noticed:old.staff.hired},bottling:{unlocked:manualBottle,noticed:false,hired:false,hiredMonth:null}};
 return action(j,'enable-staff-progression',{progress:shopProgress(s)});
}
export const newStaffProgressionDistillery=seed=>enableStaffProgression(newDelegatedDistillery(seed));
// New sales timing starts at an explicit replay boundary; earlier months stay exact.
export const monthlyTimingMode=s=>staffProgressionMode(s)&&s.monthlyTiming?.version===1;
export function enableMonthlyTiming(s){
 if(monthlyTimingMode(s))return s;const j=clone(enableStaffProgression(s));j.monthlyTiming={version:1};
 for(const p of j.core.products)if(j.productsById[p.id]?.listed)j.productsById[p.id].listedMonth=j.core.month;
 return action(j,'enable-monthly-timing',{progress:shopProgress(s)});
}
export const newMonthlyTimingDistillery=seed=>enableMonthlyTiming(newStaffProgressionDistillery(seed));
// Explicit work-local boundary: historical cap purchases replay unchanged.
export const shopDemandMode=s=>monthlyTimingMode(s)&&s.shopDemand?.version===NORMAL_SHOP_DEMAND.version;
export function enableShopDemand(s,mode='variable'){
 assert(mode==='variable','商店の需要方式が不正です。');
 if(shopDemandMode(s))return s;
 const j=clone(enableMonthlyTiming(s));j.shopDemand={version:NORMAL_SHOP_DEMAND.version,mode,lastOrders:[]};
 return action(j,'enable-shop-demand',{mode,progress:shopProgress(s)});
}
export const newShopDemandDistillery=seed=>enableShopDemand(newMonthlyTimingDistillery(seed));

// Confirmed operation defaults and common policy are local to this recorded boundary.
export const bottlingPolicyMode=s=>shopDemandMode(s)&&s.workPreferences?.version===1;
const defaultOperationPreferences=()=>({stopAt:null,caskType:null,bottleCount:null,auto:{mode:'age',age:24,threshold:5,count:10},requestMode:'once'});
function rememberAuto(last,options){Object.assign(last.auto,{mode:options.mode,count:options.count,...(options.mode==='age'?{age:options.age}:{threshold:options.threshold})});}
function checkedBottlingPolicy(options){
 assert(options&&typeof options==='object'&&!Array.isArray(options),'条件を選びます。');
 const {mode,count,age,threshold}=options;
 assert(Object.keys(options).every(k=>['mode','count','age','threshold'].includes(k))&&['age','stock'].includes(mode)&&Number.isInteger(count)&&count>=1&&count<=Math.floor((C.baseLitres+C.extraLitres)/C.bottleLitres),'ビン詰めの条件が不正です。');
 assert(mode==='age'?Number.isInteger(age)&&age>=0&&age<=1200&&threshold===undefined:Number.isInteger(threshold)&&threshold>=0&&threshold<=999&&age===undefined,'ビン詰めの条件が不正です。');
 return {mode,count,...(mode==='age'?{age}:{threshold})};
}
export function enableBottlingPolicy(s){
 if(bottlingPolicyMode(s))return s;
 const old=enableShopDemand(s),j=clone(old),last=defaultOperationPreferences();let latestManualBottle=-1;
 for(let i=0;i<old.operations.length;i++){
  const o=old.operations[i];
  if(o.key==='stop')last.stopAt=o.value;
  if(o.key==='fill')last.caskType=o.value;
  if(o.key==='bottle-counted-branded'){last.bottleCount=o.value.count;latestManualBottle=i;}
  if(o.key==='bottle-branded'||o.key==='bottle'){last.bottleCount=null;latestManualBottle=i;}
  if(o.key==='staff-reserve'||o.key==='reserve-usual')last.requestMode='once';
  if(o.key==='staff-repeat-reserve')last.requestMode=o.value.mode;
  if(o.key==='bottling-reserve')rememberAuto(last,o.value.options);
 }
 // The current result is safe to reuse only if no later transaction could replace it.
 if(latestManualBottle>=0&&last.bottleCount===null&&!old.operations.slice(latestManualBottle+1).some(o=>['month','bottle','bottle-branded','bottle-counted-branded'].includes(o.key)))last.bottleCount=old.result?.bottles??null;
 j.workPreferences={version:1,bottlingPolicy:null,policyRevision:0,last};
 return action(j,'enable-bottling-policy',{progress:shopProgress(s)});
}
export const newBottlingPolicyDistillery=seed=>enableBottlingPolicy(newShopDemandDistillery(seed));
export const operationDefaults=s=>clone(bottlingPolicyMode(s)?s.workPreferences.last:defaultOperationPreferences());
export const commonBottlingPolicy=s=>clone(bottlingPolicyMode(s)?s.workPreferences.bottlingPolicy:null);
export function setBottlingPolicy(s,options,displayDefaults={}){
 assert(bottlingPolicyMode(s),'ビン詰め方針に対応した保存で始めます。');
 assert(s.staffProgression.bottling.hired,'ビン詰め担当者を雇うと依頼できます。');
 assert(displayDefaults&&typeof displayDefaults==='object'&&!Array.isArray(displayDefaults)&&Object.keys(displayDefaults).every(k=>k==='age'||k==='threshold'),'ビン詰めの入力値が不正です。');
 for(const [key,value] of Object.entries(displayDefaults))assert(Number.isInteger(value)&&value>=0&&value<=(key==='age'?1200:999),'ビン詰めの入力値が不正です。');
 const policy=checkedBottlingPolicy(options),j=clone(s);assert(j.workPreferences.policyRevision<Number.MAX_SAFE_INTEGER,'ビン詰め方針の記録がいっぱいです。');
 j.workPreferences.bottlingPolicy=policy;j.workPreferences.policyRevision++;Object.assign(j.workPreferences.last.auto,displayDefaults);rememberAuto(j.workPreferences.last,policy);
 return action(j,'bottling-policy-set',{options:clone(policy),displayDefaults:clone(displayDefaults),progress:shopProgress(s)});
}
export function delegateBottling(s,caskId){
 assert(bottlingPolicyMode(s)&&s.staffProgression.bottling.hired,'ビン詰め担当者を雇うと依頼できます。');
 assert(s.workPreferences.bottlingPolicy,'先にビン詰め方針を決めます。');
 assert(E.currentCask(s,caskId)&&s.tastingId===null,'ビン詰めするたるを選びます。');
 const r=s.automation.reservations.find(x=>x.caskId===caskId);
 if(r?.status==='active')return s;
 let j;
 if(r?.status==='paused'){j=pauseBottling(s,caskId,false);j.operations.pop();}
 else{j=reserveBottling(s,caskId,s.workPreferences.bottlingPolicy);j.operations.pop();j.automation.reservations.find(x=>x.caskId===caskId).policyRevision=s.workPreferences.policyRevision;}
 return action(j,'bottling-delegate',{caskId,progress:shopProgress(s)});
}

function salesEligible(s,productId,month=s.core.month){
 const p=s.core.products.find(p=>p.id===productId),meta=s.productsById[productId];return !!p&&!!meta?.listed&&(!monthlyTimingMode(s)||p.bottledMonth<month&&meta.listedMonth<month);
}
function pendingDepartmentCount(s){return monthlyTimingMode(s)?s.department.interests.filter(o=>o.pendingDelivery).length:0;}
function heldDepartmentCount(s,productId){return monthlyTimingMode(s)?s.department.interests.reduce((n,o)=>n+(o.pendingDelivery?.productId===productId?o.pendingDelivery.count:0),0):0;}
function queueDepartmentInto(j,productId,count,unitPrice){
 assert(j.shop.deliveries.length+pendingDepartmentCount(j)<SHOP.maxDeliveries,'納品帳がいっぱいです。');
 const r=j.releases.find(r=>r.productId===productId),o=r&&departmentSelection(j,r.brandId);assert(o&&!o.pendingDelivery&&count===5,'今回の5本は承認済みです。');
 o.pendingDelivery={productId,count,unitPrice,approvedMonth:j.core.month,dueMonth:j.core.month+1};
}
function summarizeMonthlySales(j){
 const m=j.core.lastMonth;if(j.core.journal[0]?.month===j.core.month)j.core.journal[0].message=`${M.monthLabel(j.core.month)}：販売${m.bottles}本・収入${m.revenue}、維持費${m.upkeep}。天使の分け前${m.evaporated.toFixed(2)} L。`;
 if(shopDemandMode(j)&&j.shopDemand.lastOrders.length&&j.core.journal[0]?.month===j.core.month){
  const orders=j.shopDemand.lastOrders,requested=orders.reduce((n,o)=>n+o.requested,0),shipped=orders.reduce((n,o)=>n+o.shipped,0),unmet=orders.reduce((n,o)=>n+o.unmet,0);
  j.core.journal[0].message+=` 商店の注文${requested}本・発送${shipped}本・未発送${unmet}本。`;
 }
 return j;
}
function settleDepartmentDeliveries(j){
 for(const o of [...j.department.interests].filter(o=>o.pendingDelivery&&o.pendingDelivery.dueMonth<=j.core.month).sort((a,b)=>a.pendingDelivery.productId-b.pendingDelivery.productId)){
  const d=o.pendingDelivery,p=j.core.products.find(p=>p.id===d.productId);if(!salesEligible(j,d.productId))continue;assert(j.shop.deliveries.length<SHOP.maxDeliveries,'納品帳がいっぱいです。');assert(p&&p.stock>=d.count,'承認した5本の在庫を確認します。');
  deliverShopInto(j,d.productId,d.count,d.unitPrice,'department');const item=clone(j.shop.deliveries.at(-1));j.automation.lastShipments.push(item);
  j.core.lastMonth.revenue=round(j.core.lastMonth.revenue+item.revenue);j.core.lastMonth.bottles+=item.count;j.core.lastMonth.sales.push({id:item.productId,sold:item.count,revenue:item.revenue,channel:'stockist',shopId:'department'});advanceGeneration(j,'stockist-deliver');
 }
 return j;
}
export function bottlingStaffStatus(s){
 const b=staffProgressionMode(s)?s.staffProgression.bottling:null,hireMinimum=BOTTLING_STAFF.hireCost+reserve(s)+BOTTLING_STAFF.salary;
 const reason=!b?'担当者に対応した保存で始めます。':b.hired?'担当者は雇用中です。':!b.unlocked?'自分でビン詰めしてから雇えます。':blocked(s)?'先に今の判断を確認します。':s.core.cash<hireMinimum?`採用とビン詰めに £${hireMinimum} 必要です。`:'';
 return {unlocked:!!b?.unlocked,hired:!!b?.hired,hiredMonth:b?.hiredMonth??null,canHire:!reason,reason,hireCost:BOTTLING_STAFF.hireCost,salary:BOTTLING_STAFF.salary,hireMinimum};
}
export function noticeStaffOpportunity(s,kind){
 assert(staffProgressionMode(s)&&['distill','bottling'].includes(kind),'担当者を選びます。');const notice=s.staffProgression[kind];assert(notice.unlocked,'先に自分で作業します。');if(notice.noticed)return s;
 const j=clone(s);j.staffProgression[kind].noticed=true;return action(j,'staff-opportunity-notice',{kind,progress:shopProgress(s)});
}
export function staffOpportunities(s){
 if(!staffProgressionMode(s))return [];
 return ['distill','bottling'].filter(kind=>s.staffProgression[kind].unlocked&&!s.staffProgression[kind].noticed&&!(kind==='distill'?s.staff.hired:s.staffProgression.bottling.hired)).map(kind=>({kind,...(kind==='distill'?staffStatus(s):bottlingStaffStatus(s))}));
}
export function hireBottlingStaff(s){
 const q=bottlingStaffStatus(s);assert(q.canHire,q.reason);const j=clone(s);Object.assign(j.staffProgression.bottling,{hired:true,hiredMonth:j.core.month,noticed:true});j.core.cash=round(j.core.cash-BOTTLING_STAFF.hireCost);j.core.totals.costs=round(j.core.totals.costs+BOTTLING_STAFF.hireCost);
 return action(j,'bottling-staff-hire',{progress:shopProgress(s)});
}
export const bottlingReservation=(s,caskId)=>delegationMode(s)?clone(s.automation.reservations.find(r=>r.caskId===caskId)??null):null;
function bottlingStock(s,r){
 const ids=new Set(s.releases.filter(x=>x.caskId===r.caskId&&x.brandId===r.brandId).map(x=>x.productId));
 return s.core.products.filter(p=>ids.has(p.id)&&(!delegationFixesMode(s)||s.productsById[p.id]?.listed)).reduce((n,p)=>n+p.stock,0);
}
export function reserveBottling(s,caskId,options){
 assert(!staffProgressionMode(s)||s.staffProgression.bottling.hired,'ビン詰め担当者を雇うと依頼できます。');
 assert(delegationMode(s)&&E.currentCask(s,caskId)&&s.tastingId===null,'ビン詰めするたるを選びます。');
 assert(options&&typeof options==='object'&&!Array.isArray(options),'条件を選びます。');
 const {mode,count,age,threshold}=options;
 assert(Object.keys(options).every(k=>['mode','count','age','threshold'].includes(k))&&['age','stock'].includes(mode)&&Number.isInteger(count)&&count>=1&&count<=Math.floor((C.baseLitres+C.extraLitres)/C.bottleLitres),'ビン詰めの条件が不正です。');
 assert(mode==='age'?Number.isInteger(age)&&age>=0&&age<=1200&&threshold===undefined: Number.isInteger(threshold)&&threshold>=0&&threshold<=999&&age===undefined,'ビン詰めの条件が不正です。');
 const j=clone(s),r={caskId,brandId:1,mode,count,...(mode==='age'?{age}:{threshold}),status:'active',armed:true,lastMonth:null,lastError:null};
 j.automation.reservations=j.automation.reservations.filter(x=>x.caskId!==caskId);j.automation.reservations.push(r);j.automation.reservations.sort((a,b)=>a.caskId-b.caskId);
 observePromisedChanges(j);if(bottlingPolicyMode(j))rememberAuto(j.workPreferences.last,options);
 return action(j,'bottling-reserve',{caskId,options:clone(options),progress:shopProgress(s)});
}
export function pauseBottling(s,caskId,paused=true){
 assert(paused||!staffProgressionMode(s)||s.staffProgression.bottling.hired,'ビン詰め担当者を雇うと依頼できます。');
 assert(delegationMode(s)&&typeof paused==='boolean','予約を選びます。');const r=s.automation.reservations.find(x=>x.caskId===caskId);assert(r&&r.status!=='completed','予約を選びます。');
 const j=clone(s);j.automation.reservations.find(x=>x.caskId===caskId).status=paused?'paused':'active';if(!paused)observePromisedChanges(j);
 return action(j,'bottling-pause',{caskId,paused,progress:shopProgress(s)});
}
export function cancelBottling(s,caskId){
 assert(delegationMode(s)&&s.automation.reservations.some(x=>x.caskId===caskId),'予約を選びます。');const j=clone(s);j.automation.reservations=j.automation.reservations.filter(x=>x.caskId!==caskId);
 return action(j,'bottling-cancel',{caskId,progress:shopProgress(s)});
}
function automaticBottling(s){
 let j=s;j.automation.lastBottlings=[];
 for(const old of [...j.automation.reservations]){
  let r=j.automation.reservations.find(x=>x.caskId===old.caskId);if(r.status!=='active')continue;
  if(staffProgressionMode(j)&&!j.staffProgression.bottling.hired){r.lastError='雇用前';continue;}
  const c=E.currentCask(j,r.caskId);if(!c){r.status='completed';if(delegationFixesMode(j))r.lastError='原酒不足';continue;}
  const stock=bottlingStock(j,r);if(r.mode==='stock'&&stock>r.threshold)r.armed=true;
  const due=r.mode==='age'?c.age>=r.age:r.armed&&stock<=r.threshold;if(!due||r.lastMonth===j.core.month)continue;
  const q=E.quote(j,c.id),count=delegationFixesMode(j)&&r.mode==='stock'?Math.min(r.count,q.count):r.count,cost=count*C.bottlingCost,salary=staffProgressionMode(j)?BOTTLING_STAFF.salary:0;
  if(count<=0||q.count<count){r.lastError='原酒不足';continue;}
  if(j.core.cash<cost+salary){r.lastError='資金不足';continue;}
  if(j.decisions.some(d=>d.caskId!==c.id)){r.lastError='判断待ち';continue;}
  if(j.core.products.filter(p=>p.stock>0).length>=C.maxProducts||j.releases.length>=RETAIL_BRANDS.maxReleases){r.lastError='在庫待ち';continue;}
  if(salary){j=clone(j);j.core.cash=round(j.core.cash-salary);j.core.totals.costs=round(j.core.totals.costs+salary);}
  const manualCount=bottlingPolicyMode(j)?j.workPreferences.last.bottleCount:null;
  j=bottleBranded(j,c.id,{brandId:1},count);j.operations.pop();if(bottlingPolicyMode(j))j.workPreferences.last.bottleCount=manualCount;const productId=j.result.productId;
  j=listBottles(j,productId);j.operations.pop();r=j.automation.reservations.find(x=>x.caskId===c.id);
  r.lastMonth=j.core.month;r.lastError=null;if(r.mode==='age'||!E.currentCask(j,c.id))r.status='completed';else r.armed=bottlingStock(j,r)>r.threshold;
  j.automation.lastBottlings.push({month:j.core.month,caskId:c.id,productId,releaseId:j.result.releaseId,count,cost,...(staffProgressionMode(j)?{salary}:{})});
 }
 return j;
}
function fulfillNormalOrders(j,orders){
 j.shopDemand.lastOrders=[];
 for(const order of orders){
  const heldCounts=Object.fromEntries(j.core.products.map(p=>[p.id,heldDepartmentCount(j,p.id)]));
  const plan=planShopFulfillment(j,j.core.month,order,{heldCounts});let shipped=0,ledgerFull=false;
  for(const line of plan.shipments){
   if(j.shop.deliveries.length+pendingDepartmentCount(j)>=SHOP.maxDeliveries){ledgerFull=true;break;}
   deliverShopInto(j,line.productId,line.count,line.unitPrice,order.shopId);const item=clone(j.shop.deliveries.at(-1));
   j.automation.lastShipments.push(item);shipped+=item.count;advanceGeneration(j,'stockist-deliver');
   j.core.lastMonth.revenue=round(j.core.lastMonth.revenue+item.revenue);j.core.lastMonth.bottles+=item.count;
   j.core.lastMonth.sales.push({id:item.productId,sold:item.count,revenue:item.revenue,channel:'stockist',shopId:order.shopId});
  }
  j.shopDemand.lastOrders.push({...clone(order),requested:order.count,shipped,unmet:Math.max(0,order.count-plan.alreadyShipped-shipped),available:plan.available,belowMinimum:plan.belowMinimum,reason:ledgerFull?'delivery-ledger-full':order.count===0?order.reason:plan.reason});
 }
 return j;
}
function automaticShipping(j,orders){
 if(shopDemandMode(j))return fulfillNormalOrders(j,orders??normalShopOrders(j,j.core.month));
 if(!monthlyTimingMode(j))j.automation.lastShipments=[];
 // Fixed priority: retail (already settled), town liquor, supermarket; oldest lot first.
 for(const shopId of ['town-liquor','supermarket']){
  const store=SHOPS.find(x=>x.id===shopId);let remaining=store.monthlyLimit-j.shop.deliveries.filter(d=>d.shopId===shopId&&d.month===j.core.month).reduce((n,d)=>n+d.count,0);
  for(const p of [...j.core.products].sort((a,b)=>a.id-b.id)){
   if(remaining<=0||j.shop.deliveries.length+pendingDepartmentCount(j)>=SHOP.maxDeliveries)break;
   const r=j.releases.find(r=>r.productId===p.id);if(!r||p.stock<=0||delegationFixesMode(j)&&!j.productsById[p.id]?.listed||monthlyTimingMode(j)&&!salesEligible(j,p.id)||!j.shop.relations.some(x=>x.shopId===shopId&&x.brandId===r.brandId&&(!monthlyTimingMode(j)||x.startedMonth<j.core.month))||shopProductCondition(j,p.id,shopId))continue;
   const count=Math.min(p.stock-heldDepartmentCount(j,p.id),remaining);if(count<=0)continue;const unitPrice=round(E.salePrices(j,p.id).standard*store.rate);
   deliverShopInto(j,p.id,count,unitPrice,shopId);const item=clone(j.shop.deliveries.at(-1));j.automation.lastShipments.push(item);remaining-=count;advanceGeneration(j,'stockist-deliver');
   j.core.lastMonth.revenue=round(j.core.lastMonth.revenue+item.revenue);j.core.lastMonth.bottles+=count;j.core.lastMonth.sales.push({id:p.id,sold:count,revenue:item.revenue,channel:'stockist',shopId});
  }
 }
 return j;
}
function sourceFromContext(s,caskId,context){
 const f=context.nearbyCasks.get(caskId);if(!f||!Number.isInteger(f.stopAt)||f.stopAt<P.minimumStop||f.stopAt>=P.distillMax||!C.casks[f.type])return null;
 return {stopAt:f.stopAt,type:f.type,source:{caskId:f.caskId,batchId:f.batchId,filledMonth:f.filledMonth,...(f.generationId===undefined?{}:{generationId:f.generationId})}};
}
export function staffSource(s,caskId){validateDistillery(s);return sourceFromContext(s,caskId,checkpoint.context);}
function staffHireCheck(s,context){
 const minimum=E.canStart(s).minimum+DISTILLER.hireCost;
 const reason=staffProgressionMode(s)&&!s.staffProgression.distill.unlocked?'自分で蒸留し、たるに詰めてから雇えます。':!staffMode(s)?'担当者に対応した保存で雇います。':s.staff.hired?'担当者は雇用中です。':!context.manualSources.size?'自分で蒸留し、樽に詰めてから雇えます。':s.core.cash<minimum?`採用と次の仕込み・瓶詰めに £${minimum} 必要です。`:'';
 return {ok:!reason,reason,minimum};
}
function hireStaffWithContext(s,context){
 const c=staffHireCheck(s,context);assert(c.ok,c.reason);assert(!blocked(s),'先に試飲・判断を終えます。');
 const j=clone(s);j.staff.hired=true;j.staff.hiredMonth=j.core.month;if(staffProgressionMode(j))j.staffProgression.distill.noticed=true;j.core.cash=round(j.core.cash-DISTILLER.hireCost);j.core.totals.costs=round(j.core.totals.costs+DISTILLER.hireCost);
 return action(j,'staff-hire',{progress:shopProgress(s)});
}
export function hireStaff(s){validateDistillery(s);return hireStaffWithContext(s,checkpoint.context);}
export function staffQuote(s,caskId){
 validateDistillery(s);
 const selected=s.recipeBook?.entries.find(r=>r.id===s.recipeBook.selectedId),latest=[...checkpoint.context.manualSources.values()].at(-1),reservation=s.usual?.reservation;
 const src=caskId===undefined?null:sourceFromContext(s,caskId,checkpoint.context);if(caskId!==undefined&&!src)return null;
 const recipe=src??reservation?.recipe??selectedUsualRecipe(s);if(!recipe)return null;
 const source=src?.source??reservation?.source??(reservation?null:sourceFromContext(s,selected?.source.caskId??latest?.caskId,checkpoint.context)?.source);
 const salary=caskId===undefined&&reservation?reservation.salary??0:DISTILLER.salary;
 return {...clone(recipe),...(source?{source:clone(source)}:{}),distillationCost:C.distillationCost,caskCost:C.casks[recipe.type].cost,salary,cost:C.distillationCost+C.casks[recipe.type].cost+salary,minimum:E.canStart(s).minimum+caskPremium(recipe)+salary};
}
export function staffStatus(s){
 validateDistillery(s);const hire=staffHireCheck(s,checkpoint.context),r=s.usual?.reservation;
 return {...clone(s.staff??{hired:false,legacy:false,hiredMonth:null}),...(staffProgressionMode(s)?{unlocked:s.staffProgression.distill.unlocked}:{}),canHire:hire.ok,reason:hire.reason,hireMinimum:hire.minimum,hireCost:DISTILLER.hireCost,salary:DISTILLER.salary,state:r?.status==='active'?'working':r?'queued':'idle'};
}
function reserveStaffWithContext(s,caskId,context,mode='once'){
 assert(['once','three','continuous'].includes(mode),'依頼方式を選びます。');
 assert(staffMode(s)&&s.staff.hired,'蒸留担当者を雇うと依頼できます。');
 const r=sourceFromContext(s,caskId,context);assert(r,'抽出位置と樽を確認できる仕込みを選びます。');
 assert(!blocked(s)&&s.still.phase==='ready'&&!s.usual.reservation,'今の仕込みを終えてから依頼します。');
 assert(!generationMode(s)||s.generations.active.phase==='working','最後の仕込みは自分で行います。');
 const j=clone(s);j.usual.reservation={status:'queued',recipe:{stopAt:r.stopAt,type:r.type},source:clone(r.source),salary:DISTILLER.salary};
 if(mode!=='once'){j.usual.reservation.mode=mode;if(mode==='three')j.usual.reservation.remaining=3;}
 if(bottlingPolicyMode(j))j.workPreferences.last.requestMode=mode;
 return action(j,mode==='once'?'staff-reserve':'staff-repeat-reserve',{caskId,...(mode==='once'?{}:{mode}),progress:shopProgress(s)});
}
export function reserveStaff(s,caskId,mode='once'){validateDistillery(s);return reserveStaffWithContext(s,caskId,checkpoint.context,mode);}
function saveRecipeFromSource(s,caskId,name,context){
 assert(recipesMode(s),'製法帳に対応した保存で記録します。');
 const source=context.manualSources.get(caskId);assert(source,'手動で樽詰めした製法を選びます。');
 assert(name===undefined||typeof name==='string'&&name.trim().length>0&&name.trim().length<=40&&!/[\u0000-\u001f\u007f]/.test(name),'製法名は1〜40文字で入力します。');
 if(s.recipeBook.entries.some(r=>r.source.caskId===caskId))return s;
 assert(s.recipeBook.entries.length<RECIPE_BOOK.maxEntries,'製法帳がいっぱいです。');
 const j=clone(s),{stopAt,type,...origin}=source;
 j.recipeBook.entries.push({id:`recipe-${caskId}`,name:name===undefined?`製法 ${s.recipeBook.entries.length+1}`:name.trim(),stopAt,type,source:clone(origin)});
 return action(j,'recipe-save',{caskId,...(name===undefined?{}:{name}),progress:shopProgress(s)});
}
export function saveRecipe(s,caskId,name){
 assert(recipesMode(s),'製法帳に対応した保存で記録します。');
 return saveRecipeFromSource(s,caskId,name,manualReplayContext(s));
}
export function selectRecipe(s,id){
 assert(recipesMode(s)&&(id===null||s.recipeBook.entries.some(r=>r.id===id)),'記録した製法を選びます。');
 if(s.recipeBook.selectedId===id)return s;const j=clone(s);j.recipeBook.selectedId=id;
 return action(j,'recipe-select',{id,progress:shopProgress(s)});
}
export function noticeGeneration(s,id){
 assert(generationMode(s)&&s.generations.active.id===id&&!blocked(s),'先に今の判断を確認します。');
 const a=s.generations.active;assert(a.phase!=='working','今は引継ぎ前です。');if(a.noticedPhase===a.phase)return s;
 const j=clone(s);j.generations.active.noticedPhase=a.phase;return action(j,'generation-notice',{id,progress:shopProgress(s)});
}
export function handoverGeneration(s,id){
 assert(generationMode(s),'対応していない引継ぎです。');
 if(s.generations.completed.some(r=>r.id===id))return s;
 const a=s.generations.active;assert(a.id===id&&a.phase==='review'&&!blocked(s),'先に今の判断を確認します。');
 const j=clone(s),{noticedPhase,phase,...record}=j.generations.active;
 j.generations.completed.push({...record,endedMonth:j.core.month});j.generations.active=newGeneration(a.id+1,j.core.month);
 if(j.usual?.reservation?.mode)j.usual.reservation=null;
 return action(j,'generation-handover',{id,progress:shopProgress(s)});
}
function generationStalled(s){
 if(!generationMode(s)||s.generations.active.phase==='review')return s;
 const j=clone(s),a=j.generations.active;
 if(a.phase==='working'&&j.core.month-a.startedMonth>=GENERATIONS.lateMonths)fixGeneration(j,{kind:'funds-stalled',month:j.core.month});
 if(a.phase!=='last-batch')return s;generationReview(j,'funds-stalled');
 return action(j,'generation-stalled',{progress:shopProgress(s)});
}
function decorateDepartmentOffer(o,r){Object.assign(o,{projectId:DEPARTMENT.projectId,projectName:DEPARTMENT.projectName,sourceReleaseId:r.id,selectionId:`department-selection-${o.id}`});}
function acceptDepartmentInto(s){
 const o=s.shop.offer;assert(o?.shopId==='department'&&o.selectionId&&!s.department.interests.some(x=>x.brandId===o.brandId),'この相談は終了しました。');
 s.department.interests.push(clone(o));
 if(!s.shop.relations.some(r=>r.brandId===o.brandId&&r.shopId==='department'))s.shop.relations.push({shopId:'department',name:o.name,brandId:o.brandId,startedMonth:s.core.month});
 nextStockistOffer(s);
}
export function cancelDepartmentInterest(s,selectionId){
 shopReady(s);assert(departmentMode(s)&&s.department.interests.some(x=>x.selectionId===selectionId),'この相談は終了しました。');
 const j=clone(s),o=j.department.interests.find(x=>x.selectionId===selectionId);j.department.interests=j.department.interests.filter(x=>x.selectionId!==selectionId);
 j.shop.declinedUntil[`department:${o.brandId}`]=j.core.month+SHOP.declineGap;
 return action(j,'department-cancel',{selectionId,progress:shopProgress(s)});
}
function stockistOffer(s,shopId,offerId){
 const o=s.shop.offer;
 assert(o&&o.shopId===shopId&&o.id===offerId,'この申し出は変わりました。もう一度確認します。');return o;
}
function nextStockistOffer(s){s.shop.offer=s.shop.pendingOffers.shift()??null;}
function acceptStockistInto(s){
 if(departmentMode(s)&&s.shop.offer?.shopId==='department')return acceptDepartmentInto(s);
 const o=s.shop.offer;assert(!s.shop.relations.some(r=>r.brandId===o.brandId&&r.shopId===o.shopId),'この店ではすでに取扱中です。');
 s.shop.relations.push({shopId:o.shopId,name:o.name,brandId:o.brandId,startedMonth:s.core.month});nextStockistOffer(s);
}
const shopProgress=s=>s.still.phase==='distilling'?s.still.distillation.progress:null;
function shopReady(s){assert(shopMode(s)&&!bottleActionBlocked(s),'先に試飲・樽の判断・卸売の申し出を確認します。');}
function acceptShopInto(s){
 const o=s.shop.offer;s.shop.relations.push({shopId:SHOP.id,name:SHOP.name,brandId:o.brandId,startedMonth:s.core.month});s.shop.offer=null;
}
export function acceptShop(s,shopId,offerId){
 if(stockistsMode(s)){shopReady(s);stockistOffer(s,shopId,offerId);const j=clone(s);acceptStockistInto(j);return action(j,'stockist-accept',{shopId,offerId,progress:shopProgress(s)});}
 shopReady(s);const o=s.shop.offer;assert(o&&!s.shop.relations.some(r=>r.brandId===o.brandId),'今は取扱いを決められません。');
 const j=clone(s);acceptShopInto(j);
 return action(j,'accept-shop',{progress:shopProgress(s)});
}
// Notice is a player-visible UI event, not a change to monthly offer generation.
// Old v12 offers keep their original shape until this explicit replay boundary.
export function noticeShopOffer(s,shopId,offerId){
 if(stockistsMode(s)){shopReady(s);const o=stockistOffer(s,shopId,offerId);if(o.notified===true)return s;const j=clone(s);j.shop.offer.notified=true;return action(j,'stockist-notice',{shopId,offerId,progress:shopProgress(s)});}
 shopReady(s);assert(s.shop.offer,'届いた申し出がありません。');if(s.shop.offer.notified===true)return s;
 const j=clone(s);j.shop.offer.notified=true;return action(j,'notice-shop',{progress:shopProgress(s)});
}
export function declineShop(s,shopId,offerId){
 if(stockistsMode(s)){shopReady(s);const o=stockistOffer(s,shopId,offerId),j=clone(s);j.shop.declinedUntil[`${shopId}:${o.brandId}`]=j.core.month+SHOP.declineGap;nextStockistOffer(j);return action(j,'stockist-decline',{shopId,offerId,progress:shopProgress(s)});}
 shopReady(s);assert(s.shop.offer,'届いた申し出がありません。');const j=clone(s);
 j.shop.declinedUntil[j.shop.offer.brandId]=j.core.month+SHOP.declineGap;j.shop.offer=null;
 return action(j,'decline-shop',{progress:shopProgress(s)});
}
function deliveryQuote(s,productId,offered=false){
 const p=s.core.products.find(p=>p.id===productId),r=s.releases?.find(r=>r.productId===productId);
 const used=(s.shop?.deliveries??[]).filter(d=>d.brandId===r?.brandId&&d.month===s.core.month).reduce((n,d)=>n+d.count,0),remaining=Math.max(0,SHOP.monthlyLimit-used);
 const unitPrice=p?round(SHOP.rate*Math.min(p.price,E.salePrices(s,productId).standard)):0;
 let reason='';
 const accepted=!!r&&s.shop?.relations.some(x=>x.brandId===r.brandId),invited=!!r&&s.shop?.offer?.brandId===r.brandId&&!accepted;
 if(!shopMode(s)||!r||!(offered?invited:accepted))reason='この銘柄はまだ取扱い前です。';
 else if(bottleActionBlocked(s))reason='先に試飲・樽の判断・卸売の申し出を確認します。';
 else if(!p||(!bottleStorageMode(s)&&!s.productsById[productId]?.listed)||p.stock<=0)reason='販売棚の在庫から届けられます。';
 else if(s.shop.deliveries.length+pendingDepartmentCount(s)>=SHOP.maxDeliveries)reason='納品帳がいっぱいです。';
 else if(remaining===0)reason='今月の納品を終えました。';
 const quantities=reason?[]:[...new Set([5,10,Math.min(p.stock,remaining)])].filter(n=>n>0&&n<=p.stock&&n<=remaining).sort((a,b)=>a-b);
 return {ok:!reason,reason,unitPrice,quantities,remaining};
}
export const shopQuote=(s,productId,shopId=SHOP.id)=>stockistsMode(s)?stockistQuote(s,productId,shopId):deliveryQuote(s,productId);
export const shopOfferQuote=(s,productId,shopId=SHOP.id)=>stockistsMode(s)?stockistQuote(s,productId,shopId,true):deliveryQuote(s,productId,true);
function stockistQuote(s,productId,shopId,offered=false){
 if(departmentMode(s)&&shopId==='department')return departmentQuote(s,productId,offered);
 const store=SHOPS.find(x=>x.id===shopId),p=s.core.products.find(p=>p.id===productId),r=s.releases.find(r=>r.productId===productId);
 // Each store shares its monthly receiving capacity across all brands.
 const used=s.shop.deliveries.filter(d=>(d.shopId??SHOP.id)===shopId&&d.month===s.core.month).reduce((n,d)=>n+d.count,0);
 const available=p?Math.max(0,p.stock-heldDepartmentCount(s,p.id)):0,remaining=Math.max(0,(store?.monthlyLimit??0)-used),unitPrice=p&&store?round(E.salePrices(s,productId).standard*store.rate):0;
 const accepted=!!r&&s.shop.relations.some(x=>x.brandId===r.brandId&&x.shopId===shopId),invited=!!r&&s.shop.offer?.shopId===shopId&&s.shop.offer.brandId===r.brandId&&!accepted;
 let reason='';
 if(!store||!r||!(offered?invited:accepted))reason='この銘柄はまだ取扱い前です。';
 else if(shopDemandMode(s))reason='商店へは月ごとに自動発送します。';
 else if(monthlyTimingMode(s)&&(!salesEligible(s,productId)||offered||!s.shop.relations.some(x=>x.brandId===r.brandId&&x.shopId===shopId&&x.startedMonth<s.core.month)))reason='翌月から発送します。';
 else if(bottleActionBlocked(s))reason='先に試飲・樽の判断・卸売の申し出を確認します。';
 else if(!p||(!bottleStorageMode(s)&&!s.productsById[productId]?.listed)||p.stock<=0)reason='販売棚の在庫から届けられます。';
 else if(s.shop.deliveries.length+pendingDepartmentCount(s)>=SHOP.maxDeliveries)reason='納品帳がいっぱいです。';
 else if(remaining<store.minQuantity)reason='今月の納品を終えました。';
 else if(shopProductCondition(s,productId,shopId))reason=shopProductCondition(s,productId,shopId);
 else if(available<store.minQuantity)reason=`${store.minQuantity}本以上必要です。`;
 const candidates=store?.id===SHOP.id?[1,5,10]:store?.id==='supermarket'?[10,20]:[5];
 const quantities=reason?[]:[...new Set([...candidates,Math.min(available,remaining)])].filter(n=>n>=store.minQuantity&&n<=available&&n<=remaining).sort((a,b)=>a-b);
 return {shopId,ok:!reason,reason,unitPrice,quantities,remaining};
}
function departmentQuote(s,productId,offered=false){
 const p=s.core.products.find(x=>x.id===productId),r=s.releases.find(x=>x.productId===productId),o=r?departmentSelection(s,r.brandId,offered):null;
 const unitPrice=p?round(E.salePrices(s,productId).standard*1.4):0;let reason='';
 if(!o)reason=departmentUsedRelease(s,r?.id)?'今回の企画は完了しました。':'限定取扱いの相談を確認します。';
 else if(monthlyTimingMode(s)&&o.pendingDelivery)reason='翌月5本納品';
 else if(monthlyTimingMode(s)&&!s.productsById[productId]?.listed)reason='販売を始めると承認できます。';
 else if(bottleActionBlocked(s))reason='先に試飲・樽の判断・卸売の申し出を確認します。';
 else if(delegationMode(s)&&r?.id!==o.sourceReleaseId)reason='申し出の発売回を選びます。';
 else if(!r||!departmentReleaseEligible(r)||shopProductCondition(s,productId,'department'))reason=shopProductCondition(s,productId,'department')||'対象の発売回を選びます。';
 else if(departmentUsedRelease(s,r.id))reason='今回の企画は完了しました。';
 else if(!p||(!bottleStorageMode(s)&&!s.productsById[productId]?.listed)||p.stock<5)reason='5本以上の在庫が必要です。';
 else if(s.shop.deliveries.length+pendingDepartmentCount(s)>=SHOP.maxDeliveries)reason='納品帳がいっぱいです。';
 return {shopId:'department',ok:!reason,reason,unitPrice,quantities:reason?[]:[5],remaining:reason?0:5,selectionId:o?.selectionId,sourceReleaseId:o?.sourceReleaseId,releaseId:r?.id,projectId:DEPARTMENT.projectId};
}
function deliverShopInto(j,productId,count,unitPrice,shopId){
 const p=j.core.products.find(p=>p.id===productId),r=j.releases.find(r=>r.productId===productId),revenue=round(unitPrice*count);
 const selection=departmentMode(j)&&shopId==='department'?departmentSelection(j,r.brandId):null;
 if(departmentMode(j)&&shopId==='department')assert(selection&&count===5&&!departmentUsedRelease(j,r.id),'この企画は完了しました。');
 const item={id:(j.shop.deliveries.at(-1)?.id??0)+1,month:j.core.month,brandId:r.brandId,releaseId:r.id,productId,count,unitPrice,revenue};
 if(stockistsMode(j))item.shopId=shopId;
 if(selection){Object.assign(item,{projectId:selection.projectId,selectionId:selection.selectionId,sourceReleaseId:selection.sourceReleaseId});j.department.adoptions.push({id:selection.selectionId,selectionId:selection.selectionId,projectId:selection.projectId,projectName:selection.projectName,brandId:r.brandId,sourceReleaseId:selection.sourceReleaseId,releaseId:r.id,month:j.core.month,count,revenue,unitPrice,deliveryId:item.id});j.department.interests=j.department.interests.filter(x=>x.selectionId!==selection.selectionId);}
 j.shop.deliveries.push(item);p.stock-=count;p.sold+=count;p.revenue=round(p.revenue+revenue);
 j.core.cash=round(j.core.cash+revenue);j.core.totals.revenue=round(j.core.totals.revenue+revenue);j.core.totals.bottlesSold+=count;
 syncRecords(j);syncReleases(j);
}
export function deliverShop(s,productId,count,shopId,selectionId){
 if(departmentMode(s)&&shopId==='department')assert(typeof selectionId==='string'&&shopQuote(s,productId,shopId).selectionId===selectionId,'この相談は変わりました。もう一度確認します。');
 if(stockistsMode(s)){
  const q=shopQuote(s,productId,shopId);assert(typeof shopId==='string'&&q.ok&&Number.isInteger(count)&&q.quantities.includes(count),q.reason||'届けられる本数を選びます。');
  const j=clone(s);if(monthlyTimingMode(j)&&shopId==='department')queueDepartmentInto(j,productId,count,q.unitPrice);else deliverShopInto(j,productId,count,q.unitPrice,shopId);return action(j,monthlyTimingMode(j)&&shopId==='department'?'department-queue':'stockist-deliver',{productId,count,shopId,...(departmentMode(s)&&shopId==='department'?{selectionId}:{}),progress:shopProgress(s)});
 }
 const q=shopQuote(s,productId);assert(q.ok&&Number.isInteger(count)&&q.quantities.includes(count),q.reason||'届けられる本数を選びます。');
 const j=clone(s);deliverShopInto(j,productId,count,q.unitPrice);
 return action(j,'deliver-shop',{productId,count,progress:shopProgress(s)});
}
export function acceptShopDelivery(s,productId,count,shopId,offerId){
 assert(!monthlyTimingMode(s)||shopId==='department','取扱いの承認後、翌月から発送します。');
 if(stockistsMode(s)){
  shopReady(s);stockistOffer(s,shopId,offerId);const q=shopOfferQuote(s,productId,shopId);
  assert(q.ok&&Number.isInteger(count)&&q.quantities.includes(count),q.reason||'届けられる本数を選びます。');assert(s.operations.length<P.maxOperations,'帳面がいっぱいです。');
  const j=clone(s);acceptStockistInto(j);if(monthlyTimingMode(j)&&shopId==='department')queueDepartmentInto(j,productId,count,q.unitPrice);else deliverShopInto(j,productId,count,q.unitPrice,shopId);
  return action(j,monthlyTimingMode(j)&&shopId==='department'?'department-accept-queue':'stockist-accept-delivery',{productId,count,shopId,offerId,progress:shopProgress(s)});
 }
 const q=shopOfferQuote(s,productId);assert(q.ok&&Number.isInteger(count)&&q.quantities.includes(count),q.reason||'届けられる本数を選びます。');
 assert(s.operations.length<P.maxOperations,'帳面がいっぱいです。');
 // No intermediate accepted state escapes this transaction. One final action
 // consumes one ledger slot even when the operation budget has just one left.
 const j=clone(s);acceptShopInto(j);deliverShopInto(j,productId,count,q.unitPrice);
 return action(j,'accept-shop-delivery',{productId,count,progress:shopProgress(s)});
}
function maybeShopOffer(s,evidence=s){
 if(stockistsMode(s))return maybeStockistOffers(s,evidence);
 if(!shopMode(s)||s.shop.offer||blocked(s)||s.still.phase!=='ready'||s.core.month<s.shop.nextOfferMonth)return;
 const b=s.brands.find(b=>!s.shop.relations.some(r=>r.brandId===b.id)&&s.core.month>=(s.shop.declinedUntil[b.id]??0)&&shopEvidence(s,b.id).eligible&&brandReputation(s,b.id).bonus>0);
 if(!b)return;
 s.shop.offer={id:++s.shop.offerSerial,shopId:SHOP.id,name:SHOP.name,brandId:b.id,month:s.core.month};s.shop.nextOfferMonth=s.core.month+SHOP.offerGap;
}
function maybeStockistOffers(s,evidence=s){
 if(blocked(s)||s.still.phase!=='ready'||s.core.month<s.shop.nextOfferMonth)return;
 // Queue one opportunity per store. A deferred active offer never discards others.
 for(const store of SHOPS){
  if(departmentMode(s)&&store.id==='department'){maybeDepartmentOffer(s,store,evidence);continue;}
  if([s.shop.offer,...s.shop.pendingOffers].some(o=>o?.shopId===store.id))continue;
  const b=s.brands.find(b=>!s.shop.relations.some(r=>r.brandId===b.id&&r.shopId===store.id)&&s.core.month>=(s.shop.declinedUntil[`${store.id}:${b.id}`]??0)&&shopEvidence(evidence,b.id,store.id).eligible&&brandReputation(evidence,b.id).bonus>0);
  if(!b)continue;
  const offer={id:++s.shop.offerSerial,shopId:store.id,name:store.name,brandId:b.id,month:s.core.month};
  if(!s.shop.offer)s.shop.offer=offer;else s.shop.pendingOffers.push(offer);
  s.shop.nextOfferMonth=s.core.month+SHOP.offerGap;
 }
}
function maybeDepartmentOffer(s,store,evidence=s){
 if([s.shop.offer,...s.shop.pendingOffers].some(o=>o?.shopId==='department'))return;
 const b=s.brands.find(b=>!s.department.interests.some(o=>o.brandId===b.id)&&s.core.month>=(s.shop.declinedUntil[`department:${b.id}`]??0)&&shopEvidence(evidence,b.id,'department').eligible&&brandReputation(evidence,b.id).bonus>0&&departmentSource(evidence,b.id,s));
 if(!b)return;const source=departmentSource(evidence,b.id,s),offer={id:++s.shop.offerSerial,shopId:'department',name:store.name,brandId:b.id,month:s.core.month};decorateDepartmentOffer(offer,source);s.department.seenSources.push(source.id);
 if(!s.shop.offer)s.shop.offer=offer;else s.shop.pendingOffers.push(offer);s.shop.nextOfferMonth=s.core.month+SHOP.offerGap;
}
// The core's sold counter includes every paid bottle to preserve stock+sold.
// Its retail ledgers subtract deliveries once; only these feed reputation and
// wholesale opportunity evidence. Completed records survive product pruning.
function retailMirror(s,p){
 const d=deliveryTotals(s,p.id);return {sold:p.sold-d.bottles,revenue:round(p.revenue-d.revenue),...(d.bottles?{delivered:d.bottles,deliveryRevenue:d.revenue}:{})};
}
function startWithModel(s){
 const j=E.startDistillation(s);if(aromaMode(s))j.still.distillation.model=AROMA_MODEL;return j;
}
function stopWithModel(s){
 const j=E.stopDistillation(s);
 if(s.still.distillation.model===AROMA_MODEL)j.core.spirit.character=Math.min(1,aromaPreview(s.still.distillation.progress).character*s.still.distillation.variation);
 return j;
}
const caskPremium=recipe=>C.casks[recipe.type].cost-Math.min(...Object.values(C.casks).map(c=>c.cost));
export function usualQuote(s){
 const recipe=s.usual?.reservation?.recipe??(recipesMode(s)?selectedUsualRecipe(s):s.usual?.recipe);if(!recipe)return null;
 return {...recipe,distillationCost:C.distillationCost,caskCost:C.casks[recipe.type].cost,cost:C.distillationCost+C.casks[recipe.type].cost};
}
export function reserveUsual(s,mode='once'){
 assert(!staffProgressionMode(s)||s.staff.hired,'蒸留担当者を雇うと依頼できます。');
 assert(['once','three','continuous'].includes(mode),'依頼方式を選びます。');
 assert(mode==='once'||s.staff?.hired,'蒸留担当者を雇うと依頼できます。');
 if(staffMode(s)){
  assert(s.staff.hired||s.staff.legacy,'蒸留担当者を雇うと依頼できます。');
  if(s.staff.hired){validateDistillery(s);const selected=s.recipeBook.entries.find(r=>r.id===s.recipeBook.selectedId),latest=[...checkpoint.context.manualSources.values()].at(-1);return reserveStaffWithContext(s,selected?.source.caskId??latest?.caskId,checkpoint.context,mode);}
 }
 const recipe=recipesMode(s)?selectedUsualRecipe(s):s.usual?.recipe;
 assert(usualMode(s)&&recipe,'自分で蒸留し、樽に詰めると製法が残ります。');
 assert(!blocked(s)&&s.still.phase==='ready'&&!s.usual.reservation,'今の仕込みを終えてから予約します。');
 const j=clone(s);j.usual.reservation={status:'queued',recipe:recipesMode(s)?{stopAt:recipe.stopAt,type:recipe.type}:clone(j.usual.recipe)};return action(j,'reserve-usual');
}
export function cancelUsual(s){
 assert(usualMode(s)&&s.usual.reservation?.status==='queued','実行前の予約だけ取り消せます。');
 const j=clone(s);j.usual.reservation=null;return action(j,'cancel-usual');
}
export function stopStaffRepeat(s){
 const r=s.usual?.reservation;assert(r?.mode&&r.status==='active','仕込み中の依頼を選びます。');if(r.stopAfter)return s;
 const j=clone(s);j.usual.reservation.stopAfter=true;return action(j,'staff-repeat-stop',{progress:shopProgress(s)});
}
const repeatOfferPending=s=>!!(s.usual?.reservation?.mode&&s.shop?.offer&&!s.shop.offer.notified);
export function canBeginUsual(s){
 const check=E.canStart(s),recipe=s.usual?.reservation?.recipe,minimum=check.minimum+(recipe?caskPremium(recipe):0)+(staffMode(s)?s.usual?.reservation?.salary??0:0);
 // Inspect structural blockers with the full recipe budget available, so the
 // displayed funding requirement also includes a more expensive chosen cask.
 let reason=(s.core.cash<minimum?E.canStart({...s,core:{...s.core,cash:minimum}}):check).reason;
 if(staffProgressionMode(s)&&!s.staff.hired)reason='蒸留担当者を雇うと依頼できます。';
 else if(generationMode(s)&&s.generations.active.phase!=='working')reason='引継ぎまでは手動で仕込みます。';
 else if(!usualMode(s)||s.usual.reservation?.status!=='queued')reason='次の一樽を予約できます。';
 else if(s.trade.offer||repeatOfferPending(s))reason='届いた申し出を確認します。';
 else if(!reason&&s.core.cash<minimum)reason=`仕込みと樽・瓶に £${minimum} 必要です。`;
 return {ok:!reason,reason,minimum};
}
// An otherwise empty distillery needs at most one ordinary month to clear the
// existing monthly start limit. Never run empty months waiting for absent money.
export function usualNeedsClock(s){
 if(staffProgressionMode(s)&&!s.staff.hired||repeatOfferPending(s)||s.usual?.reservation?.status!=='queued'||generationMode(s)&&s.generations.active.phase!=='working')return false;
 const c=canBeginUsual(s);return c.ok||(!blocked(s)&&s.still.phase==='ready'&&s.core.lastDistillation===s.core.month&&s.core.casks.length<C.maxCasks&&s.core.products.filter(p=>p.stock>0).length+s.core.casks.length<C.maxProducts&&s.core.cash-E.upkeep(s)>=c.minimum);
}
export function beginUsual(s){
 const c=canBeginUsual(s);assert(c.ok,c.reason);
 let prepared=s;if(staffMode(s)&&s.usual.reservation.salary){prepared=clone(s);prepared.core.cash=round(prepared.core.cash-prepared.usual.reservation.salary);prepared.core.totals.costs=round(prepared.core.totals.costs+prepared.usual.reservation.salary);}
 const j=startWithModel(prepared);j.operations.pop();j.usual.reservation.status='active';return action(j,'start-usual');
}
function completeUsual(s){
 const r=s.usual?.reservation;
 assert(usualMode(s)&&r?.status==='active'&&!blocked(s)&&s.still.phase==='distilling'&&s.still.distillation.progress===r.recipe.stopAt,'いつもの仕込みはまだ抽出中です。');
 let j=stopWithModel(s);j.operations.pop();j=E.fillBarrel(j,r.recipe.type);j.operations.pop();
 for(const n of Object.values(j.notesById))n.observations??=[];
 j.usual.reservation=r.mode&&!r.stopAfter&&(r.mode==='continuous'||r.remaining>1)?{...clone(r),status:'queued',...(r.mode==='three'?{remaining:r.remaining-1}:{})}:null;return action(j,'complete-usual');
}
function syncReleases(s){
 if(!brandMode(s))return s;
 for(const r of s.releases){const p=s.core.products.find(p=>p.id===r.productId);if(p)Object.assign(r,{price:p.price,...(shopMode(s)?retailMirror(s,p):{sold:p.sold,revenue:p.revenue}),status:p.stock===0?'sold-out':'selling',listed:!!s.productsById[p.id]?.listed});}
 return s;
}
export function setSalePrice(s,tier,id){return syncReleases(E.setSalePrice(s,tier,id));}
export function listBottles(s,id){const j=E.listBottles(s,id);if(monthlyTimingMode(j))j.productsById[id].listedMonth=j.core.month;return syncReleases(j);}
export function bottleBranded(s,id,selection={},count=null){
 if(delegationMode(s)){assert(selection&&typeof selection==='object'&&!Array.isArray(selection)&&Object.keys(selection).every(k=>k==='brandId')&&(selection.brandId===undefined||selection.brandId===1),'AmberTimeで発売します。');selection={brandId:1};}
 if(count!==null)assert(partialMode(s)&&Number.isInteger(count)&&count>=1,'ビン詰め本数が不正です。');
 assert(brandMode(s),'銘柄に対応した保存で瓶詰めします。');
 assert(selection&&typeof selection==='object'&&!Array.isArray(selection),'銘柄を選びます。');
 assert(s.releases.length<RETAIL_BRANDS.maxReleases,'発売帳がいっぱいです。保存を残して次の蒸留所を始められます。');
 let brand;
 if(selection.brandId!==undefined){assert(Object.keys(selection).length===1,'既存銘柄の見た目は引き継ぎます。');brand=s.brands.find(b=>b.id===selection.brandId);assert(brand,'銘柄が見つかりません。');}
 else{
  assert(Object.keys(selection).every(k=>['name','bottle','label'].includes(k)),'銘柄の指定が不正です。');
  assert(s.brands.length<RETAIL_BRANDS.maxBrands,'銘柄帳がいっぱいです。既存の銘柄を選べます。');
  const values={...defaultBrand(s),...selection};
  assert(typeof values.name==='string'&&values.name.trim().length>0&&values.name.trim().length<=40&&!/[\u0000-\u001f\u007f]/.test(values.name),'銘柄名は1〜40文字で入力します。');
  assert(BRAND_BOTTLES.some(b=>b.id===values.bottle)&&BRAND_LABELS.some(b=>b.id===values.label),'ボトルとラベルを選びます。');
  brand={id:(s.brands.at(-1)?.id??0)+1,name:values.name.trim(),bottle:values.bottle,label:values.label,createdMonth:s.core.month};
 }
 // The existing transaction checks contracts, decisions, funds and shelf limits.
 // Replace its single opcode only after every brand field has been validated.
 const j=bottleTransaction(s,id,count);if(staffProgressionMode(j))j.staffProgression.bottling.unlocked=true;j.operations.pop();if(selection.brandId===undefined)j.brands.push(clone(brand));
 const r=j.result,p=j.core.products.find(p=>p.id===r.productId),releaseId=(j.releases.at(-1)?.id??0)+1;
 const release={id:releaseId,brandId:brand.id,productId:p.id,caskId:id,batchId:r.batchId,bottledMonth:r.bottledMonth,age:r.age,bottles:r.bottles,price:p.price,sold:0,revenue:0,status:'selling',listed:false,flavorName:r.name,profile:clone(r.profile),type:r.type,cut:r.cut};
 j.releases.push(release);Object.assign(r,{flavorName:r.name,name:brand.name,brandId:brand.id,releaseId});
 if(bottlingPolicyMode(j))j.workPreferences.last.bottleCount=r.bottles;
 return action(j,count===null?'bottle-branded':'bottle-counted-branded',{id,selection:clone(selection),...(count===null?{}:{count})});
}
export function enablePromisedCare(s){
 if(careMode(s))return s;
 assert(s.version===T.version&&s.rules===T.rules,'対応していない熟成の保存です。');
 assert(s.operations.length<P.maxOperations,'帳面がいっぱいです。元の保存は以前の版で開けます。');
 const j=clone(s);j.version=PROMISED_CARE.version;j.rules=PROMISED_CARE.rules;
 j.trade.lastObservations=[];observePromisedChanges(j);return action(j,'enable-promised-care');
}
export const newPromisedDistillery=seed=>enablePromisedCare(newDistillery(seed));
export function canCare(s,id){
 const k=contractFor(s,id),n=s.notesById[id];
 return !!(careMode(s)&&k&&k.kind!=='special'&&n&&!n.cooled&&!n.pending&&!blocked(s)&&n.observations?.some(o=>o.care?.options?.some(x=>x.id==='cool')));
}
export function careForCask(s,id){
 assert(canCare(s,id),'今はこの樽の手入れをできません。');
 const j=clone(s),n=j.notesById[id],source=[...n.observations].reverse().find(o=>o.care?.options?.some(x=>x.id==='cool'));
 // The observed prompt is only a local projection for the existing, explicit
 // intervention. No unresolved global judgment or fictional wait is created.
 n.pending=clone(source.care);n.phase='choice';
 const result=E.chooseDistillery(j,id,'cool');
 assert(result.operations.length===s.operations.length+1&&result.operations.at(-1).key==='choose','手入れの帳面が不正です。');
 result.operations[result.operations.length-1]={key:'care',value:id};return result;
}
function draw(t){t.rng=(Math.imul(t.rng,1664525)+1013904223)>>>0;return t.rng/4294967296;}
function rest(s){s.trade.nextOfferMonth=s.core.month+W.cooldownMin+Math.floor(draw(s.trade)*W.cooldownRange);}
function restProposal(s){s.trade.nextProposalMonth=s.core.month+T.proposalCooldownMin+Math.floor(draw(s.trade)*T.proposalCooldownRange);}
function history(s,item){s.trade.history=[...s.trade.history,{...item,month:s.core.month}].slice(-120);}
export const contractFor=(s,id)=>s.trade.contracts.find(k=>k.caskId===id)??null;
export function offerEvidence(s){const records=s.records.filter(r=>r.sold>0),sold=records.reduce((n,r)=>n+r.sold,0),young=records.filter(r=>r.age<=12).reduce((n,r)=>n+r.sold,0),recent=records.filter(r=>s.core.month-r.bottledMonth<=36).length;return {sold,young,recent,probability:Math.min(W.maxProbability,W.baseProbability+W.volumeWeight*Math.min(1,sold/120)+W.youngWeight*Math.min(1,young/80)+W.continuityWeight*Math.min(1,recent/3))};}
export function contractCandidates(s,term=s.trade.offer?.terms[0]){return term?s.core.casks.filter(c=>!contractFor(s,c.id)&&c.age<=term.targetAge-3&&M.bottleQuote(s.core,c.id).count>0):[];}
export const partnerPreference=partner=>PARTNERS.find(p=>p.name===partner)??null;
const termOf=(id,term,factor)=>({id:`${id}:${term.age}`,targetAge:term.age,unitPrice:round(term.price*factor),bottlingFee:C.bottlingCost});
function maybeOffer(s){
 if(delegationMode(s))return;
 const t=s.trade,r=t.relationship;if(t.offer||s.decisions.length)return;
 if(r){
  const evidence=orderEvidence(s);if(!evidence.eligible||s.core.month<t.nextProposalMonth)return;
  if(draw(t)>=evidence.probability)return;const id=++t.offerSerial;
  const term={id:`special:${id}`,targetAge:SPECIAL_ORDER.targetAge,unitPrice:SPECIAL_ORDER.unitPrice,bottlingFee:C.bottlingCost,criteria:clone(SPECIAL_ORDER.criteria)};
  t.offer={id,kind:'special',month:s.core.month,partner:r.partner,terms:[term],criteria:clone(term.criteria)};
 }else{
  if(s.core.month<t.nextOfferMonth||offerEvidence(s).sold===0)return;
  if(draw(t)>=offerEvidence(s).probability)return;
  const preference=PARTNERS[Math.floor(draw(t)*PARTNERS.length)],partner=preference.name,id=++t.offerSerial;
  t.offer={id,kind:'initial',month:s.core.month,partner,terms:[termOf(id,preference,1)]};
 }
 const primary=t.offer.terms[0];Object.assign(t.offer,{targetAge:primary.targetAge,unitPrice:primary.unitPrice,bottlingFee:primary.bottlingFee}); // Primary condition, independent offer ID.
 history(s,{...clone(t.offer),offerKind:t.offer.kind,kind:'offered'});
}
function readyForTrade(s){assert(!delegationMode(s),'樽の卸売りは終了しました。');assert(s.tastingId===null,'試飲を終えてから取引を決めます。');assert(!s.trade.offer,'届いた申し出を先に確認します。');}
export function canStart(s){const c=E.canStart(s),a=generationMode(s)?s.generations.active:null;if(a?.phase==='review')return {...c,ok:false,reason:'次の世代へ引き継ぎます。'};if(a?.phase==='last-batch'&&a.lastBatchId!==null)return {...c,ok:false,reason:'最後の仕込みを進めます。'};if(usualMode(s)&&s.usual.reservation&&!(a?.phase==='last-batch'&&s.usual.reservation.status==='queued'))return {...c,ok:false,reason:s.usual.reservation.status==='queued'?'予約を取り消すと自分で蒸留できます。':'いつもの仕込みを進めています。'};return s.trade.offer?{...c,ok:false,reason:'届いた申し出を確認します。'}:c;}
export function startDistillation(s){if(generationMode(s)){const q=canStart(s);assert(q.ok,q.reason);}else{assert(!s.trade.offer,'申し出を確認してから仕込みます。');assert(!usualMode(s)||!s.usual.reservation,'予約を取り消してから自分で蒸留します。');}return advanceGeneration(startWithModel(s),'start');}
export function distillStep(s){if(generationMode(s)&&s.generations.active.phase==='review')return s;const j=s.trade.offer?s:E.distillStep(s);return usualMode(j)&&j.usual.reservation?.status==='active'&&!blocked(j)&&j.still.distillation.progress===j.usual.reservation.recipe.stopAt?completeUsual(j):j;}
export function stopDistillation(s){assert(!generationMode(s)||s.generations.active.phase!=='review','次の世代へ引き継ぎます。');assert(!usualMode(s)||s.usual.reservation?.status!=='active','いつもの仕込みは抽出の終了まで任せます。');assert(!s.trade.offer,'申し出を確認します。');const j=stopWithModel(s);if(bottlingPolicyMode(j))j.workPreferences.last.stopAt=s.still.distillation.progress;return j;}
export function fillBarrel(s,type){assert(!generationMode(s)||s.generations.active.phase!=='review','次の世代へ引き継ぎます。');assert(!usualMode(s)||!s.usual.reservation||(generationMode(s)&&s.generations.active.phase==='last-batch'&&s.usual.reservation.status==='queued'),'いつもの仕込みが進行中です。');assert(!s.trade.offer,'申し出を確認します。');const j=E.fillBarrel(s,type);if(staffProgressionMode(j))j.staffProgression.distill.unlocked=true;for(const n of Object.values(j.notesById))n.observations??=[];if(usualMode(j))j.usual.recipe={stopAt:s.still.distillation.progress,type};if(bottlingPolicyMode(j))j.workPreferences.last.caskType=type;return advanceGeneration(j,'fill',type);}
export function sampleDistillery(s,id){assert(!s.trade.offer,'申し出を確認してから試飲します。');return E.sampleDistillery(s,id);}
export function chooseDistillery(s,id,key){assert(!s.trade.offer,'申し出を確認します。');if(s.notesById[id]?.pending?.id==='order-unmet')return resolveUnmet(s,id,key);return E.chooseDistillery(s,id,key);}
function bottleTransaction(s,id,count=null){assert(!(s.trade.order?.status==='unmet'&&s.trade.order.caskId===id),'注文の出荷方法を先に選びます。');assert(!contractFor(s,id),'この樽は卸売出荷の予定があります。解除すると瓶詰めできます。');assert(!s.trade.offer,'申し出を確認します。');const observations=clone(s.notesById[id]?.observations??[]),j=E.bottleNow(s,id,{count});j.result.observations=observations;if(s.notesById[id]?.orderOutcome)j.result.order=clone(s.notesById[id].orderOutcome);return j;}
export function bottleNow(s,id){if(delegationMode(s))return bottleBranded(s,id,{},E.quote(s,id).count);return advanceGeneration(bottleTransaction(s,id),'bottle',id);}
function book(s,id,term){assert(contractCandidates(s,term).some(c=>c.id===id),'指定できる樽を選びます。');const r=s.trade.relationship,k={id:++s.trade.bookingSerial,caskId:id,partner:r.partner,relationshipId:r.id,termId:term.id,targetAge:term.targetAge,unitPrice:term.unitPrice,bottlingFee:term.bottlingFee,acceptedMonth:s.core.month};s.trade.contracts.push(k);history(s,{kind:'assigned',...k});}
export function assignCask(s,id,termId){readyForTrade(s);assert(!s.decisions.length,'先に樽の判断を終えます。');const r=s.trade.relationship;assert(r?.status==='active','取引を再開してから指定できます。');const term=r.terms.find(k=>k.id===termId);assert(term,'現在の取引条件を選びます。');const j=clone(s);book(j,id,term);return action(j,'assign',{id,termId});}
export function acceptOffer(s,id=null,termId=null){
 assert(!delegationMode(s),'樽の卸売りは終了しました。');
 const o=s.trade.offer;assert(o&&s.tastingId===null&&!s.decisions.length,'今は申し出を決められません。');const j=clone(s);
 if(o.kind==='special'){
  assert(j.trade.relationship?.partner===o.partner&&!j.trade.order,'今は特別注文を受けられません。');
  const term=o.terms[0];j.trade.order={id:++j.trade.orderSerial,partner:o.partner,targetAge:term.targetAge,unitPrice:term.unitPrice,bottlingFee:term.bottlingFee,criteria:clone(term.criteria),acceptedMonth:j.core.month,caskId:null,status:'accepted'};
  history(j,{kind:'order-accepted',...clone(j.trade.order)});restProposal(j);
 }else if(o.kind==='terms'){
  const r=j.trade.relationship;assert(r&&r.partner===o.partner,'取引先を確認します。');const term=o.terms[0];r.terms=[...r.terms.filter(k=>k.targetAge!==term.targetAge),clone(term)].sort((a,b)=>a.targetAge-b.targetAge);history(j,{kind:'terms-accepted',partner:r.partner,term:clone(term)});restProposal(j);
 }else{
  assert(!j.trade.relationship,'取引先は一社までです。');const term=o.terms.find(k=>k.id===(termId??o.terms[0].id));assert(term,'提示された条件を選びます。');j.trade.relationship={id:o.id,partner:o.partner,status:'active',terms:clone(o.terms),deliveries:0,bottles:0,startedMonth:j.core.month,completedOrders:0};history(j,{kind:'accepted',partner:o.partner,relationshipId:o.id});restProposal(j);
 }
 j.trade.offer=null;return action(j,'accept',{id,termId});
}
export function declineOffer(s){assert(s.trade.offer&&s.tastingId===null&&!s.decisions.length,'先に樽の判断を終えます。');const j=clone(s),o=j.trade.offer;history(j,{kind:'declined',offerId:o.id,partner:o.partner});j.trade.offer=null;if(o.kind==='terms'||o.kind==='special')restProposal(j);else rest(j);return action(j,'decline');}
export function cancelContract(s,id){readyForTrade(s);const k=contractFor(s,id);assert(k,'解除する樽を選びます。');const j=clone(s);history(j,{kind:'unassigned',...clone(k)});j.trade.contracts=j.trade.contracts.filter(x=>x.caskId!==id);if(k.kind==='special'&&j.trade.order?.id===k.orderId){j.trade.order.status='accepted';j.trade.order.caskId=null;}return action(j,'unassign',id);}
export function pauseTrade(s){readyForTrade(s);assert(s.trade.relationship?.status==='active','取引はすでに休止中です。');const j=clone(s);j.trade.relationship.status='paused';history(j,{kind:'paused',partner:j.trade.relationship.partner});return action(j,'pause-trade');}
export function resumeTrade(s){readyForTrade(s);assert(s.trade.relationship?.status==='paused','取引は休止していません。');const j=clone(s);j.trade.relationship.status='active';history(j,{kind:'resumed',partner:j.trade.relationship.partner});return action(j,'resume-trade');}
export function endTrade(s){readyForTrade(s);assert(s.trade.relationship,'終了する取引がありません。');const j=clone(s);history(j,{kind:'ended',partner:j.trade.relationship.partner,caskIds:j.trade.contracts.map(k=>k.caskId)});clearUnmet(j);if(j.trade.order)history(j,{kind:'order-cancelled',...clone(j.trade.order),reason:'trade-ended'});j.trade.order=null;j.trade.relationship=null;j.trade.contracts=[];rest(j);return action(j,'end-trade');}
// Preserve the old origin reconstruction exactly. Correct proven legacy dates
// only as a new recorded operation, never by rewriting an old replay prefix.
export function reconcileTradeHistory(s){
 const r=s.trade.relationship;if(!r)return s;let start=r.startedMonth;
 const take=n=>{if(Number.isInteger(n)&&n>=0&&n<=s.core.month&&n<start)start=n;};
 for(let old=s;old;old=old.origin){
  for(const h of old.trade?.history??[])if(h.kind==='accepted'&&h.partner===r.partner&&(h.relationshipId===r.id||h.relationshipId===undefined&&h.id===r.id))take(h.acceptedMonth??h.month);
  const k=old.trade?.contract;if(k?.partner===r.partner&&k.id===r.id)take(k.acceptedMonth);
 }
 // Optional metadata repair must not make a valid full ledger unreadable.
 if(start===r.startedMonth||s.operations.length>=P.maxOperations)return s;
 const j=clone(s);j.trade.relationship.startedMonth=start;return action(j,'reconcile-trade-start');
}
function reserve(s){return s.core.casks.reduce((n,c)=>n+M.bottleQuote(s.core,c.id).cost,0)+(s.core.spirit?(usualMode(s)&&s.usual.reservation?.status==='active'?C.casks[s.usual.reservation.recipe.type].cost:Math.min(...Object.values(C.casks).map(c=>c.cost)))+Math.floor((s.still.phase==='distilling'?C.baseLitres+C.extraLitres:s.core.spirit.litres)/C.bottleLitres)*C.bottlingCost:0);}
function rebuild(s){s.decisions=s.core.casks.slice().sort((a,b)=>a.id-b.id).filter(c=>s.notesById[c.id]?.pending).map(c=>({month:s.core.month,caskId:c.id,eventId:s.notesById[c.id].pending.id,pending:clone(s.notesById[c.id].pending)}));}
function syncRecords(s){s.records=s.records.map(r=>{const p=s.core.products.find(p=>p.id===r.productId);return p?{...r,...(shopMode(s)?retailMirror(s,p):{sold:p.sold,revenue:p.revenue})}:r;});if(s.result)s.result=s.records.find(r=>r.productId===s.result.productId)??s.result;}
function requestFunds(s){
 for(const c of s.core.casks){const n=s.notesById[c.id];if(n.pending?.id==='funds'){n.pending=null;n.phase='watching';}}
 const c=s.core.casks.filter(c=>E.quote(s,c.id).cost<=s.core.cash).sort((a,b)=>Number(!!contractFor(s,a.id))-Number(!!contractFor(s,b.id))||a.id-b.id)[0]??s.core.casks[0];if(!c)return;
 const remaining=s.trade.contracts.map(k=>Math.max(0,k.targetAge-E.currentCask(s,k.caskId).age)),nearest=remaining.length?Math.min(...remaining):null;
 const n=s.notesById[c.id];n.phase='choice';n.pending={id:'funds',title:'瓶詰めの費用を残す',text:`所持金 £${round(s.core.cash)} · 瓶詰め予約 £${reserve(s)} · 維持費 £${E.upkeep(s)}/月。`+(nearest!==null?`次の卸売出荷まで${nearest}か月。`:'')+(contractFor(s,c.id)?'この樽の指定を解除した後の瓶詰め費を残して停止しています。':remaining.length?'卸売予定を残し、こちらの樽から回収できます。':'こちらの樽から回収できます。'),options:[{id:'bottle',label:'瓶詰めを確かめる'}]};rebuild(s);
}
// Retain a verified old checkpoint verbatim; only new operations use this model.
function upgraded(input){
 const old=V09.restoreDistillery(JSON.stringify(input)),j={...clone(old),version:T.version,rules:T.rules,operations:[],origin:clone(old)};
 j.trade={...clone(old.trade),lastObservations:[],order:null,orderSerial:0};
 if(j.trade.relationship){const r=j.trade.relationship;r.startedMonth=old.trade.history.find(h=>h.kind==='accepted'&&h.relationshipId===r.id)?.month??old.core.month;r.completedOrders=0;}
 for(const n of Object.values(j.notesById))n.observations??=[];
 observePromisedChanges(j);
 if(j.decisions.some(d=>d.eventId==='funds'))requestFunds(j);
 return j;
}
// These prompts only repeat the already-promised shipment plan. Record an
// observation, never a fictional player choice. In v7 ordinary wholesale,
// optional care is available separately; important decisions remain queued.
function observePromisedChanges(s){
 for(const c of s.core.casks){
  const n=s.notesById[c.id],p=n.pending;
  const k=contractFor(s,c.id),delegated=delegationMode(s)&&(!staffProgressionMode(s)||s.staffProgression.bottling.hired)&&s.automation.reservations.some(r=>r.caskId===c.id&&r.status==='active'),optional=delegated||careMode(s)&&k&&k.kind!=='special';
  if((!k&&!delegated)||!p||!['fruit','rounded','loss','wood','fading','rough','last','bottle-ready'].includes(p.id)||!optional&&p.options.some(o=>o.id==='cool'))continue;
  const note={caskId:c.id,age:c.age,eventId:p.id,title:p.title,text:p.text,month:s.core.month};
  if(optional&&p.options.some(o=>o.id==='cool'))note.care=clone(p);
  n.observations??=[];n.observations.push(note);s.trade.lastObservations.push(clone(note));n.pending=null;n.phase='watching';
 }
 rebuild(s);
}

// Only completed deliveries in the current relationship grow this opportunity.
export function orderEvidence(s){
 const r=s.trade.relationship,duration=r?Math.max(0,s.core.month-r.startedMonth):0,deliveries=r?.deliveries??0,bottles=r?.bottles??0,completedOrders=r?.completedOrders??0;
 const eligible=!!r&&r.status==='active'&&r.partner===SPECIAL_ORDER.partner&&!s.trade.order&&deliveries>=SPECIAL_ORDER.minDeliveries&&bottles>=SPECIAL_ORDER.minBottles&&duration>=SPECIAL_ORDER.minDuration;
 const probability=Math.min(SPECIAL_ORDER.maxProbability,SPECIAL_ORDER.baseProbability+SPECIAL_ORDER.deliveryWeight*Math.min(deliveries,8)+SPECIAL_ORDER.durationWeight*Math.min(duration/12,8)+SPECIAL_ORDER.orderWeight*Math.min(completedOrders,4));
 return {eligible,probability,duration,deliveries,bottles,completedOrders};
}
export function orderCandidates(s){return s.trade.order?.status==='accepted'?contractCandidates(s,s.trade.order):[];}
export function orderFallbackTerms(s){const r=s.trade.relationship,p=r&&partnerPreference(r.partner);if(!p)return null;const k=r.terms.find(t=>t.targetAge===p.age);return k?clone(k):{id:'standard-fallback',targetAge:p.age,unitPrice:p.price,bottlingFee:C.bottlingCost};}
export function assignOrder(s,id){
 readyForTrade(s);assert(!s.decisions.length,'先に樽の判断を終えます。');assert(s.trade.relationship?.status==='active','取引を再開してから指定できます。');
 assert(orderCandidates(s).some(c=>c.id===id),'注文へ指定できる樽を選びます。');const j=clone(s),o=j.trade.order,r=j.trade.relationship;
 const k={id:++j.trade.bookingSerial,kind:'special',orderId:o.id,caskId:id,partner:o.partner,relationshipId:r.id,termId:`order:${o.id}`,targetAge:o.targetAge,unitPrice:o.unitPrice,bottlingFee:o.bottlingFee,criteria:clone(o.criteria),acceptedMonth:o.acceptedMonth};
 j.trade.contracts.push(k);o.caskId=id;o.status='assigned';history(j,{kind:'order-assigned',...clone(k)});return action(j,'order-assign',id);
}
function clearUnmet(s){const o=s.trade.order;if(o?.status!=='unmet')return;const n=s.notesById[o.caskId];if(n?.pending?.id==='order-unmet'){n.pending=clone(o.previousPending??null);n.phase=n.pending?'choice':'watching';}rebuild(s);}
export function cancelOrder(s){
 readyForTrade(s);assert(s.trade.order,'取り消す注文がありません。');const j=clone(s),o=j.trade.order;clearUnmet(j);
 j.trade.contracts=j.trade.contracts.filter(k=>k.orderId!==o.id||k.kind!=='special');history(j,{kind:'order-cancelled',...clone(o)});j.trade.order=null;restProposal(j);return action(j,'order-cancel');
}
const orderMet=(c,k)=>c.roughness<=k.criteria.roughnessMax&&c.character>k.criteria.characterMin&&c.wood<=k.criteria.woodMax;
function orderRecord(o,outcome){return {id:o.id,criteria:clone(o.criteria),targetAge:o.targetAge,unitPrice:o.unitPrice,acceptedMonth:o.acceptedMonth,outcome};}
function fulfill(s,k,order=null){
 order??=s.notesById[k.caskId]?.orderOutcome??null;
 const c=E.currentCask(s,k.caskId),q=E.quote(s,c.id),gross=round(q.count*k.unitPrice),observations=clone(s.notesById[c.id]?.observations??[]);
 assert(k.bottlingFee===C.bottlingCost,'確定した瓶詰め費を確認します。');
 s.core.cash=round(s.core.cash+gross);s.core.totals.revenue=round(s.core.totals.revenue+gross);
 s=E.bottleNow(s,c.id,{automatic:true,directSale:true});s.operations.pop();const p=s.core.products.find(p=>p.id===s.result.productId),r=s.records.at(-1);
 p.price=k.unitPrice;p.sold=p.originalStock;p.stock=0;p.revenue=gross;p.lastSold=p.sold;p.lastRevenue=gross;s.core.totals.bottlesSold+=p.sold;s.productsById[p.id].listed=false;
 Object.assign(r,{observations,channel:'wholesale',partner:k.partner,unitPrice:k.unitPrice,contractAge:k.targetAge,sold:p.sold,revenue:gross,cash:s.core.cash});
 if(order)r.order=clone(order);r.memory.push(`${k.acceptedMonth}か月目に卸売指定。${c.age}か月で出荷。`);s.result=r;
 s.core.lastMonth.revenue=round(s.core.lastMonth.revenue+gross);s.core.lastMonth.bottles+=p.sold;s.core.lastMonth.sales.push({id:p.id,sold:p.sold,revenue:gross,channel:'wholesale',...(order?{orderId:order.id}: {})});
 const shipment={month:s.core.month,caskId:c.id,productId:p.id,partner:k.partner,bottles:p.sold,gross,cost:q.cost,net:round(gross-q.cost),...(order?{orderId:order.id,outcome:order.outcome}: {})};
 history(s,{kind:'shipped',...shipment});s.trade.lastShipment=shipment;s.trade.lastShipments.push(shipment);s.trade.contracts=s.trade.contracts.filter(x=>x.caskId!==c.id);s.trade.relationship.deliveries++;s.trade.relationship.bottles+=p.sold;
 return s;
}
function shipmentJournal(s){if(s.trade.lastShipments.length&&s.core.journal[0]){const ss=s.trade.lastShipments;s.core.journal[0].message=`卸売出荷 ${ss.length}樽・${ss.reduce((n,x)=>n+x.bottles,0)}本 · 売上 £${round(ss.reduce((n,x)=>n+x.gross,0))}。`;}}
function resolveUnmet(s,id,key){
 assert(s.tastingId===null,'試飲を終えてから判断します。');assert(s.decisions[0]?.caskId===id,'先に表示中の樽の判断を終えます。');const o=s.trade.order;
 assert(o?.status==='unmet'&&o.caskId===id&&['order-wholesale','order-retail'].includes(key),'注文の出荷方法を選びます。');let j=clone(s);clearUnmet(j);
 const outcome=orderRecord(o,key==='order-wholesale'?'unmet-wholesale':'unmet-retail');history(j,{kind:'order-resolved',orderId:o.id,caskId:id,outcome:outcome.outcome});j.trade.order=null;
 if(key==='order-wholesale'){
  const t=orderFallbackTerms(j);assert(t,'通常卸売の条件を確認します。');const k={...t,caskId:id,partner:o.partner,targetAge:E.currentCask(j,id).age,acceptedMonth:j.core.month};
  if(j.trade.lastShipments.some(x=>x.month!==j.core.month))j.trade.lastShipments=[];j=fulfill(j,k,outcome);shipmentJournal(j);
 }else j.notesById[id].orderOutcome=outcome;
 restProposal(j);return action(j,'choose',{id,key});
}
function settle(s){
 const due=s.trade.contracts.filter(k=>E.currentCask(s,k.caskId)?.age>=k.targetAge).sort((a,b)=>a.caskId-b.caskId);
 for(const k of due){
  if(k.kind==='special'){
   const o=s.trade.order;assert(o?.id===k.orderId&&o.status==='assigned','注文と樽の指定が一致しません。');
   if(!orderMet(E.currentCask(s,k.caskId),k)){
    const n=s.notesById[k.caskId];o.status='unmet';o.previousPending=clone(n.pending);s.trade.contracts=s.trade.contracts.filter(x=>x.caskId!==k.caskId);
    n.phase='choice';n.pending={id:'order-unmet',title:'注文の風味に届いていません',text:'出荷方法を選べます。',options:[{id:'order-wholesale',label:'通常の卸売価格で出荷する'},{id:'order-retail',label:'自分で販売する'}]};
    history(s,{kind:'order-unmet',orderId:o.id,caskId:k.caskId,criteria:clone(k.criteria),profile:{roughness:E.currentCask(s,k.caskId).roughness,character:E.currentCask(s,k.caskId).character,wood:E.currentCask(s,k.caskId).wood}});rebuild(s);continue;
   }
   const record=orderRecord(o,'fulfilled');s=fulfill(s,k,record);s.trade.relationship.completedOrders++;history(s,{kind:'order-fulfilled',orderId:o.id,caskId:k.caskId});s.trade.order=null;restProposal(s);
  }else s=fulfill(s,k);
 }
 shipmentJournal(s);return s;
}

export function tickDistillery(s,expectedMonth=s.core.month){
 assert(Number.isInteger(expectedMonth)&&expectedMonth===s.core.month,'月次処理の対象月が一致しません。');if(blocked(s)||generationMode(s)&&s.generations.active.phase==='review')return s;
 const empty=s.still.phase==='ready'&&!s.core.spirit&&!s.core.casks.length&&!s.core.products.some(p=>p.stock>0&&s.productsById[p.id]?.listed)&&!(monthlyTimingMode(s)&&s.department.interests.some(o=>o.pendingDelivery));if(empty&&s.core.cash-E.upkeep(s)<canStart(s).minimum)return generationStalled(s);
 const timing=monthlyTimingMode(s)?{eligibleProductIds:s.core.products.filter(p=>salesEligible(s,p.id,expectedMonth+1)).map(p=>p.id),heldCounts:Object.fromEntries(s.core.products.map(p=>[p.id,heldDepartmentCount(s,p.id)]))}:undefined;
 const orders=shopDemandMode(s)?normalShopOrders(s,expectedMonth+1,s.shopDemand.mode):undefined;
 let j=E.economicMonthly(s,expectedMonth,reputationMode(s)?retailReputationFactors(s):null,timing);if(monthlyTimingMode(j))j.automation.lastShipments=[];j.trade.lastShipments=[];j.trade.lastObservations=[];observePromisedChanges(j);
 const ids=j.core.casks.map(c=>c.id).sort((a,b)=>a-b),cents=Math.round(j.core.lastMonth.upkeep*100),share=ids.length?Math.floor(cents/ids.length):0;
 for(let i=0;i<ids.length;i++)j.batchesById[ids[i]].upkeep=round(j.batchesById[ids[i]].upkeep+(share+(i<cents-share*ids.length?1:0))/100);
 syncRecords(j);syncReleases(j);j=monthlyTimingMode(j)?automaticBottling(summarizeMonthlySales(automaticShipping(settleDepartmentDeliveries(j),orders))):delegationMode(j)?automaticShipping(automaticBottling(j)):settle(j);
 if(j.core.cash<reserve(j)){if(generationMode(s)&&s.generations.active.phase==='last-batch'||generationMode(s)&&s.core.month-s.generations.active.startedMonth>=GENERATIONS.lateMonths)return generationStalled(s);j=clone(s);if(!j.core.casks.length)return s;requestFunds(j);}
 else{for(const id of Object.keys(j.batchesById))if(!j.notesById[id])delete j.batchesById[id];syncRecords(j);maybeOffer(j);maybeShopOffer(j,monthlyTimingMode(s)?{...s,core:{...s.core,month:j.core.month}}:j);}
 return action(j,'month',{progress:s.still.phase==='distilling'?s.still.distillation.progress:null});
}
function progress(s,value){assert(!s.trade.offer||value===s.still.distillation?.progress,'申し出の確認中は蒸留を進めません。');assert(s.still.phase==='distilling'&&Number.isInteger(value)&&value>=s.still.distillation.progress&&value<P.distillMax,'蒸留の進行が不正です。');let j=s;while(j.still.distillation.progress<value){const next=E.distillStep(j);assert(next!==j,'停止中の蒸留です。');j=next;}return j;}
function applyOperation(s,o,context){s=E.endTasting(s);switch(o.key){case 'enable-bottling-policy':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableBottlingPolicy(s);case 'bottling-policy-set':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return setBottlingPolicy(s,o.value?.options,o.value?.displayDefaults);case 'bottling-delegate':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return delegateBottling(s,o.value?.caskId);case 'enable-shop-demand':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableShopDemand(s,o.value?.mode);case 'department-queue':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return deliverShop(s,o.value?.productId,o.value?.count,o.value?.shopId,o.value?.selectionId);case 'department-accept-queue':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return acceptShopDelivery(s,o.value?.productId,o.value?.count,o.value?.shopId,o.value?.offerId);case 'enable-monthly-timing':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableMonthlyTiming(s);case 'enable-staff-progression':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableStaffProgression(s);case 'staff-opportunity-notice':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return noticeStaffOpportunity(s,o.value?.kind);case 'bottling-staff-hire':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return hireBottlingStaff(s);case 'enable-delegation-fixes':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableDelegationFixes(s);case 'enable-delegation':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableDelegation(s);case 'bottling-reserve':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return reserveBottling(s,o.value?.caskId,o.value?.options);case 'bottling-pause':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return pauseBottling(s,o.value?.caskId,o.value?.paused);case 'bottling-cancel':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return cancelBottling(s,o.value?.caskId);case 'enable-partial-bottling':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enablePartialBottling(s);case 'bottle-counted-branded':return bottleBranded(s,o.value?.id,o.value?.selection,o.value?.count);case 'enable-staff':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableStaff(s,{legacy:o.value?.legacy});case 'staff-hire':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return hireStaffWithContext(s,context);case 'staff-repeat-stop':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return stopStaffRepeat(s);case 'staff-repeat-reserve':if(o.value?.progress!==null)s=progress(s,o.value?.progress);assert(['three','continuous'].includes(o.value?.mode),'依頼方式が不正です。');return reserveStaffWithContext(s,o.value?.caskId,context,o.value.mode);case 'staff-reserve':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return reserveStaffWithContext(s,o.value?.caskId,context);case 'enable-recipe-book':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableRecipeBook(s);case 'recipe-save':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return saveRecipeFromSource(s,o.value?.caskId,o.value?.name,context);case 'recipe-select':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return selectRecipe(s,o.value?.id);case 'enable-generations':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableGenerations(s);case 'generation-notice':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return noticeGeneration(s,o.value?.id);case 'generation-handover':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return handoverGeneration(s,o.value?.id);case 'generation-stalled':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return tickDistillery(s);case 'enable-bottle-storage':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableBottleStorage(s);case 'enable-department':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableDepartment(s);case 'department-cancel':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return cancelDepartmentInterest(s,o.value?.selectionId);case 'enable-stockists':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableStockists(s);case 'stockist-notice':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return noticeShopOffer(s,o.value?.shopId,o.value?.offerId);case 'stockist-accept':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return acceptShop(s,o.value?.shopId,o.value?.offerId);case 'stockist-decline':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return declineShop(s,o.value?.shopId,o.value?.offerId);case 'stockist-deliver':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return deliverShop(s,o.value?.productId,o.value?.count,o.value?.shopId,o.value?.selectionId);case 'stockist-accept-delivery':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return acceptShopDelivery(s,o.value?.productId,o.value?.count,o.value?.shopId,o.value?.offerId);case 'notice-shop':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return noticeShopOffer(s);case 'accept-shop-delivery':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return acceptShopDelivery(s,o.value?.productId,o.value?.count);case 'enable-shop':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableShop(s);case 'accept-shop':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return acceptShop(s);case 'decline-shop':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return declineShop(s);case 'deliver-shop':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return deliverShop(s,o.value?.productId,o.value?.count);case 'enable-aroma':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return enableAroma(s);case 'enable-usual':return enableUsual(s);case 'reserve-usual':return reserveUsual(s);case 'cancel-usual':return cancelUsual(s);case 'start-usual':return beginUsual(s);case 'complete-usual':return completeUsual(progress(s,s.usual?.reservation?.recipe.stopAt));case 'enable-brand-reputation':return enableReputation(s);case 'enable-brands':return enableBrands(s);case 'bottle-branded':return bottleBranded(s,o.value?.id,o.value?.selection);case 'enable-promised-care':return enablePromisedCare(s);case 'care':return careForCask(s,o.value);case 'start':return startDistillation(s);case 'stop':assert(Number.isInteger(o.value)&&o.value>=P.minimumStop&&o.value<P.distillMax,'抽出時期が不正です。');return stopDistillation(progress(s,o.value));case 'fill':return fillBarrel(s,o.value);case 'month':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return tickDistillery(s);case 'sample':return sampleDistillery(s,o.value);case 'choose':return chooseDistillery(s,o.value?.id,o.value?.key);case 'bottle':return bottleNow(s,o.value);case 'price':return setSalePrice(s,o.value?.tier,o.value?.productId);case 'list':return listBottles(s,o.value);case 'decline':return declineOffer(s);case 'accept':return acceptOffer(s,o.value?.id,o.value?.termId);case 'assign':return assignCask(s,o.value?.id,o.value?.termId);case 'unassign':return cancelContract(s,o.value);case 'order-assign':return assignOrder(s,o.value);case 'order-cancel':return cancelOrder(s);case 'pause-trade':return pauseTrade(s);case 'resume-trade':return resumeTrade(s);case 'end-trade':return endTrade(s);case 'reconcile-trade-start':return reconcileTradeHistory(s);default:throw Error('操作の帳面が不正です。');}}
// Derived source context lives only in replay/checkpoint memory, never in saves.
const emptyReplayContext=()=>({manualSources:new Map(),nearbyProducts:new Map(),nearbyCasks:new Map()});
// Comparison receipts are disposable validation context, never saved game state.
function nearbyReceipt(context,p,complete=false){
 let r=context.nearbyProducts.get(p.id);
 if(!r){r={productId:p.id,complete,listedMonth:null,retailActiveMonths:0,firstSaleMonth:null,lastSaleMonth:null,priceChanges:[],retailPriceTotals:[],stock:p.stock,currentPrice:p.price,listed:false};context.nearbyProducts.set(p.id,r);}
 return r;
}
function captureNearby(before,after,o,context){
 if(o.key==='fill'||o.key==='complete-usual')for(const c of after.core.casks)if(!before.core.casks.some(x=>x.id===c.id)){
  const b=after.batchesById[c.id];context.nearbyCasks.set(c.id,{caskId:c.id,batchId:c.batchId,type:c.type,filledMonth:c.filledMonth,distilledMonth:b?.startedMonth??null,stopAt:o.key==='fill'?before.still.distillation.progress:before.usual?.reservation?.recipe.stopAt??null,manual:o.key==='fill',...(staffMode(after)?{generationId:before.generations?.active.id??null,...(o.key==='complete-usual'&&before.usual?.reservation?.source?{commissionedFrom:clone(before.usual.reservation.source)}:{})}:{})});
 }
 // Bottling and monthly wholesale settlement can create products. Initial prices
 // are read from the actual transaction rather than recomputed from flavor.
 if(['bottle','bottle-branded','bottle-counted-branded','month'].includes(o.key))for(const p of after.core.products)if(!before.core.products.some(x=>x.id===p.id)){
  const r=nearbyReceipt(context,p,true);r.priceChanges.push({month:after.core.month,price:p.price,initial:true});r.listed=!!after.productsById[p.id]?.listed;if(r.listed&&r.listedMonth===null)r.listedMonth=after.core.month;
 }
 if(o.key==='list'||o.key==='price'){
  const id=o.key==='list'?o.value:o.value.productId,p=after.core.products.find(x=>x.id===id);
  if(p){const r=nearbyReceipt(context,p);if(o.key==='list'&&r.listedMonth===null)r.listedMonth=after.core.month;
   if(o.key==='price'&&before.core.products.find(x=>x.id===id)?.price!==p.price)r.priceChanges.push({month:after.core.month,price:p.price,initial:false});r.currentPrice=p.price;r.listed=!!after.productsById[id]?.listed;}
 }
 if(after.core.month>before.core.month){
  for(const p of before.core.products)if(p.stock>0&&before.productsById[p.id]?.listed)nearbyReceipt(context,p).retailActiveMonths++;
  for(const t of after.core.lastMonth?.sales??[])if(t.sold>0&&t.channel!=='wholesale'&&t.channel!=='stockist'){
   const p=before.core.products.find(x=>x.id===t.id);if(!p)continue;const r=nearbyReceipt(context,p);r.firstSaleMonth??=after.core.month;r.lastSaleMonth=after.core.month;
   let period=r.retailPriceTotals.find(x=>x.price===p.price);if(!period){period={price:p.price,count:0,revenue:0};r.retailPriceTotals.push(period);}period.count+=t.sold;period.revenue=round(period.revenue+t.revenue);
  }
 }
 if(['bottle','bottle-branded','bottle-counted-branded','month','list','price','stockist-deliver','stockist-accept-delivery','deliver-shop','accept-shop-delivery'].includes(o.key))for(const p of after.core.products){
  const r=nearbyReceipt(context,p);r.stock=p.stock;r.currentPrice=p.price;r.listed=!!after.productsById[p.id]?.listed;if(r.listed&&r.listedMonth===null)r.listedMonth=after.core.month;
 }
}
function apply(s,o,context,index){
 const j=applyOperation(s,o,context);
 captureNearby(s,j,o,context);
 if(o.key==='fill'){
  const c=j.core.casks.find(c=>!s.core.casks.some(old=>old.id===c.id));
  if(c)context.manualSources.set(c.id,{caskId:c.id,batchId:c.batchId,stopAt:s.still.distillation.progress,type:c.type,operationIndex:index,filledMonth:c.filledMonth,generationId:s.generations?.active.id??null});
 }
 return j;
}
const matchingPrefix=(cached,s,originText)=>cached&&cached.originText===originText&&cached.seed===s.seed&&s.operations.length>=cached.length&&JSON.stringify(s.operations.slice(0,cached.length))===cached.operations;
function manualReplayContext(s){
 const originText=JSON.stringify(s.origin);let j,start=0,context=emptyReplayContext();
 if(matchingPrefix(checkpoint,s,originText)){j=clone(checkpoint.state);start=checkpoint.length;context=clone(checkpoint.context);}
 else j=s.origin===null?newDistillery(s.seed):upgraded(s.origin);
 for(let i=start;i<s.operations.length;i++)j=apply(j,s.operations[i],context,i);
 return context;
}
export const manualRecipeSources=s=>[...manualReplayContext(s).manualSources.values()].map(clone);
let checkpoint=null;
export function validateDistillery(s){
 assert(((s?.version===T.version&&s.rules===T.rules)||careMode(s))&&Number.isInteger(s.seed)&&s.seed>0&&s.seed<=4294967295&&Array.isArray(s.operations)&&s.operations.length<=P.maxOperations,'対応していない業者別卸売の保存です。');M.restore(M.serialize(s.core));
 assert(s.origin===null||s.origin?.version===5&&s.origin?.seed===s.seed,'元の0.9保存が不正です。');const originText=JSON.stringify(s.origin);let j=s.origin===null?newDistillery(s.seed):upgraded(s.origin),start=0,context=emptyReplayContext();
 if(matchingPrefix(checkpoint,s,originText)){j=clone(checkpoint.state);start=checkpoint.length;context=clone(checkpoint.context);}
 for(let i=start;i<s.operations.length;i++)j=apply(j,s.operations[i],context,i);j=E.endTasting(j);const cache=clone(j);
 if(usualMode(s)&&s.usual?.reservation?.status==='active')assert(s.still?.phase==='distilling'&&s.still.distillation.progress<s.usual.reservation.recipe.stopAt,'いつもの抽出の進行が不正です。');
 if(s.still?.phase==='distilling')j=progress(j,s.still.distillation?.progress);
 assert(s.tastingId===null||Number.isInteger(s.tastingId),'試飲する樽が不正です。');if(s.tastingId!==null){assert(j.notesById[s.tastingId]?.samples.at(-1)?.age===E.currentCask(j,s.tastingId)?.age,'試飲の年月が不正です。');j=sampleDistillery(j,s.tastingId);}
 assert(JSON.stringify(s)===JSON.stringify(j),'蒸留所の状態と操作の帳面が一致しません。');checkpoint={originText,seed:s.seed,length:s.operations.length,operations:JSON.stringify(s.operations),state:cache,context:clone(context)};return true;
}
// Only the exact validated state may expose cached facts. Missing origin history
// stays incomplete; this accessor never starts a second history reconstruction.
export function nearbyComparisonFacts(s,{productIds=[],caskIds=[],includeManualSources=false}={}){
 validateDistillery(s);const c=checkpoint.context;
 return {products:productIds.map(id=>c.nearbyProducts.get(id)).filter(Boolean).map(clone),casks:caskIds.map(id=>{const f=c.nearbyCasks.get(id);return f?{...clone(f),manualSource:clone(c.manualSources.get(id)??null)}:null;}).filter(Boolean),...(includeManualSources?{manualSources:[...c.manualSources.values()].map(clone)}:{}),coverage:{complete:s.origin===null,fromMonth:s.origin?.core?.month??0}};
}
export function serializeDistillery(s){validateDistillery(s);return JSON.stringify(s);}
export function restoreDistillery(text){assert(typeof text==='string'&&text.length<P.maxSaveBytes*4+16384,'保存が大きすぎます。');let s;try{s=JSON.parse(text);}catch{throw Error('帳面を読み取れません。');}if([3,4,5].includes(s?.version))return upgraded(s);validateDistillery(s);return s;}

// Projection continuations are opaque, module-local and detached from validation.
const projectionTokens=new WeakMap();
const projectionSnapshot=state=>{const {operations,origin,...facts}=state;return clone(facts);};
export function createProjectionReplay(s,observer,previousToken){
 assert(typeof observer==='function'&&Array.isArray(s?.operations),'操作の帳面を確認します。');
 const originText=JSON.stringify(s.origin),cached=previousToken&&projectionTokens.get(previousToken);
 const resumed=!!matchingPrefix(cached,s,originText);
 let j=resumed?clone(cached.state):s.origin===null?newDistillery(s.seed):upgraded(s.origin);
 const context=resumed?clone(cached.context):emptyReplayContext(),start=resumed?cached.length:0;
 if(!resumed)observer({index:-1,operation:null,before:null,after:projectionSnapshot(j)});
 for(let index=start;index<s.operations.length;index++){
  const before=projectionSnapshot(j),operation=clone(s.operations[index]);j=apply(j,operation,context,index);
  observer({index,operation,before,after:projectionSnapshot(j)});
 }
 const token=Object.freeze({});projectionTokens.set(token,{originText,seed:s.seed,length:s.operations.length,operations:JSON.stringify(s.operations),state:j,context});
 return {token,resumed,manualSources:[...context.manualSources.values()].map(clone)};
}
// The original two-argument observer always receives the complete cold replay.
export function replayDistilleryOperations(s,observer){return createProjectionReplay(s,observer).manualSources;}
