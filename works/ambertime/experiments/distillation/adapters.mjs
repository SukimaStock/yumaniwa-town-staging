// Experiment-only adapters. No player save or replay accepts these profiles.
import * as M from '../../model.mjs';
import * as E from '../../economy.mjs';
import {ECONOMY_PARAMETERS as C,PARALLEL_PARAMETERS as P} from '../../economy-parameters.mjs';
import {SPECIAL_ORDER} from '../../partner-parameters.mjs';
import {spiritProfile,FLAVOR_AXES} from '../../spirit-view.mjs';
import {createConditions,compositionPhrase,CONTRACT} from './models.mjs';
const round=n=>Math.round(n*100)/100,clone=structuredClone;
export const SIDECAR_HYPOTHESIS='構成比は樽内で選択的に変化せず、瓶詰め後も保持する仮説。現行の熟成・価格・注文計算は構成比を読まない。';
export function ageExperiment(raw,type='bourbon',months=0){
 if(raw?.contract!==CONTRACT||raw.cut===null||!Number.isInteger(months)||months<0||months>120||!Object.hasOwn(C.casks,type))throw Error('停止済みの比較原酒と0〜120か月、樽を選びます。');
 let c={id:2,batchId:1,batchMonth:0,filledMonth:0,type,age:0,cut:raw.cut,initialLitres:raw.litres,litres:raw.litres,roughness:raw.roughness,character:raw.character,wood:0,variation:clone(createConditions(raw.seed,raw.batch).caskVariation),history:[]};
 for(let i=0;i<months;i++)c=M.ageCask(c);
 const composition=raw.composition?clone(raw.composition):null;
 const scalarPhrase=spiritProfile(c).phrase;
 return {...c,contract:CONTRACT,modelId:raw.modelId,seed:raw.seed,batch:raw.batch,progress:raw.progress,composition,phrase:composition?compositionPhrase(composition):scalarPhrase,scalarPhrase,tasting:M.tasting(c),axes:FLAVOR_AXES.map(a=>({...a,value:c[a.id],ratio:c[a.id]/a.maximum})),raw:clone(raw),sidecarHypothesis:composition?SIDECAR_HYPOTHESIS:null};
}
// M.bottle is reused, with the current economy's prices. Sidecar data belongs to
// the experimental release, outside the legacy product and save contracts.
export function bottleExperiment(aged,{id=3,tier='standard',fixedPrice=null}={}){
 if(aged?.contract!==CONTRACT||!Number.isInteger(id)||id<3)throw Error('比較原酒を選びます。');
 let core=M.newGame(aged.seed);core.cash=1000000;core.month=aged.age;core.nextId=id;core.casks=[clone(aged)];core.rngState=createConditions(aged.seed,aged.batch).rngStateAfterCask;
 // Do not put experimental sidecars into a normal core object.
 for(const k of ['contract','modelId','seed','batch','progress','composition','phrase','scalarPhrase','tasting','axes','raw','sidecarHypothesis'])delete core.casks[0][k];
 core=M.bottle(core,2);const game=E.newDistillery(aged.seed);game.core=core;game.productsById[id]={listed:true,selectedPrice:tier};
 const prices=E.salePrices(game,id);if(!Object.hasOwn(prices,tier))throw Error('価格帯を選びます。');
 core=M.setPrice(core,id,fixedPrice??prices[tier]);
 return {contract:CONTRACT,product:core.products.at(-1),composition:clone(aged.composition),sidecarHypothesis:aged.sidecarHypothesis,prices,marketValue:E.marketValue(core.products.at(-1)),core};
}
export function retailExperiment(agedProfiles,{tier='standard',fixedPrice=null,months=24,retailFactors=null}={}){
 if(!Array.isArray(agedProfiles)||!agedProfiles.length||agedProfiles.length>C.maxProducts||!Number.isInteger(months)||months<1||months>120)throw Error('1〜8件の比較原酒と販売期間を選びます。');
 const releases=agedProfiles.map((a,i)=>bottleExperiment(a,{id:3+i,tier,fixedPrice}));
 let s=E.newDistillery(agedProfiles[0].seed);s.core=clone(releases[0].core);s.core.month=Math.max(...agedProfiles.map(a=>a.age));s.core.nextId=3+releases.length;s.core.products=releases.map(r=>clone(r.product));
 for(const p of s.core.products)s.productsById[p.id]={listed:true,selectedPrice:tier};
 const trajectory=[];let soldOutMonth=null;
 // Fixed horizon includes idle months after the shelf sells out. The engine's
 // £4 base maintenance still applies: never claim free post-sale time.
 for(let m=1;m<=months;m++){
  s=E.economicMonthly(s,s.core.month,retailFactors);trajectory.push({month:m,sold:s.core.lastMonth.bottles,revenue:s.core.lastMonth.revenue,stock:s.core.products.reduce((n,p)=>n+p.stock,0),upkeep:s.core.lastMonth.upkeep});
  if(soldOutMonth===null&&!s.core.products.some(p=>p.stock))soldOutMonth=m;
 }
 return {months,soldOutMonth,sold:s.core.totals.bottlesSold,revenue:s.core.totals.revenue,sellingMaintenance:P.baseMaintenance*months,stock:s.core.products.reduce((n,p)=>n+p.stock,0),products:s.core.products,releases:releases.map(({core,...r})=>r),trajectory};
}
export function productionCosts(aged){const bottles=Math.floor((aged.litres+1e-9)/C.bottleLitres);return {distillation:C.distillationCost,cask:C.casks[aged.type].cost,bottling:bottles*C.bottlingCost,distillationMaintenance:Math.floor(aged.progress*P.distillStepMs/P.monthMs)*P.baseMaintenance,agingMaintenance:(P.baseMaintenance+P.perCaskMaintenance)*aged.age,total:C.distillationCost+C.casks[aged.type].cost+bottles*C.bottlingCost+Math.floor(aged.progress*P.distillStepMs/P.monthMs)*P.baseMaintenance+(P.baseMaintenance+P.perCaskMaintenance)*aged.age,bottles};}
export function specialEligible(aged){const c=SPECIAL_ORDER.criteria;return aged.age===SPECIAL_ORDER.targetAge&&aged.roughness<=c.roughnessMax&&aged.character>c.characterMin&&aged.wood<=c.woodMax;}
export const numericDisplay=p=>Object.fromEntries(['roughness','character','wood','litres'].map(k=>[k,round(p[k])]));
