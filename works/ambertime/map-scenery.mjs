// Disposable scenery derived from confirmed facts. Nothing here is saved or replayed.
import {partnersForMap} from './trading-partners.mjs?world=world-network-v01&perf=v06';
import {mapPartnerProjection} from './map-partners.mjs?v=map-partners-v01&world=world-network-v01&repair=ui3-20261111&night=stage1&mapSelection=night-stage3&consignment=night-stage4-v01&perf=v06';
import {regionalDeliveryMode,regionalDeliveryHistory} from './regional-deliveries.mjs?world=world-network-v01&consignment=night-stage4-v01&perf=v06';
import {storeMarketMode} from './placement-mode.mjs?v=bar-v01-1&delivery=regional-delivery-v01&consignment=night-stage4-v01';
export const MAP_SCENERY_RULES=Object.freeze({recentMonths:3,flowers:Object.freeze([
 Object.freeze({quantity:6,months:3,span:6}),Object.freeze({quantity:24,months:6,span:24})
])});
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const validReceipt=(r,now)=>r&&integer(r.month)&&r.month<=now&&Number.isSafeInteger(r.count)&&r.count>0;
// Native transactions produce immutable snapshots. Cache once per snapshot, shared
// by six scales, both maps and selection/camera repaint. Weak keys do not retain saves.
const summaries=new WeakMap();
function chronology(rows){
 const months=[...new Set(rows.map(r=>r.month))].sort((a,b)=>a-b);
 return {tradeMonths:months.length,firstMonth:months[0]??null,lastMonth:months.at(-1)??null,span:months.length?months.at(-1)-months[0]:0};
}
const unknown=()=>({known:false,quantity:null,delivered:null,customerSales:null,tradeMonths:null,firstMonth:null,lastMonth:null,span:null});
function evidence(game){
 let cache=summaries.get(game);if(cache)return cache;
 const now=game.core?.month,byPartner=new Map(),ledger=game.shop?.deliveries;
 if(Array.isArray(ledger)){
  const market=storeMarketMode(game),boundary=game.storeMarket?.startedMonth;
  for(const {id} of partnersForMap({regionId:'town',mapScale:'town'})){
   const rows=ledger.filter(r=>(r?.shopId??'town-liquor')===id);
   if(!integer(now)||!rows.every(r=>validReceipt(r,now))||(market&&id!=='department'&&!integer(boundary))){byPartner.set(id,unknown());continue;}
   const purchases=market&&id!=='department'?rows.filter(r=>r.month>boundary):[];
   const purchased=new Set(purchases),deliveries=rows.filter(r=>!purchased.has(r));
   const sum=items=>items.reduce((n,r)=>n+r.count,0);
   byPartner.set(id,{known:true,quantity:sum(rows),delivered:sum(deliveries),customerSales:market&&id!=='department'?sum(purchases):null,...chronology(rows)});
  }
 }
 cache={byPartner,regions:new Map(),scenes:new Map()};summaries.set(game,cache);return cache;
}
function regionalEvidence(game,pin,cache){
 if(cache.regions.has(pin.id))return cache.regions.get(pin.id);
 let result=unknown();
 if(regionalDeliveryMode(game)){
  const total=game.regionalDeliveries.totalsByPartner?.[pin.id],quantity=total===undefined?0:integer(total.count)?total.count:null;
  const rows=Array.isArray(game.operations)?regionalDeliveryHistory(game,pin.id):null;
  const complete=quantity!==null&&rows!==null&&rows.every(r=>validReceipt(r,game.core.month)&&typeof r.id==='string'&&r.contractId===pin.detail.contractId&&r.customerSales===null)&&new Set(rows.map(r=>r.id)).size===rows.length&&rows.reduce((n,r)=>n+r.count,0)===quantity;
  const latest=integer(pin.activity.latestMonth)&&pin.activity.latestMonth<=game.core.month?pin.activity.latestMonth:null;
  result={...unknown(),quantity,delivered:quantity,customerSales:null,...(complete?{known:true,...chronology(rows)}:{lastMonth:latest})};
 }
 cache.regions.set(pin.id,result);return result;
}
export function mapSceneryProjection(game,stage,projection){
 if(!game||typeof game!=='object'||!integer(game.core?.month))return {stage,month:0,partners:[],staticKey:JSON.stringify([stage,[]]),motionKey:'[]',key:JSON.stringify([stage,[]])};
 const cache=evidence(game);if(cache.scenes.has(stage))return cache.scenes.get(stage);
 const view=projection??mapPartnerProjection(game,stage),now=game.core?.month;
 const partners=(view.partners??view.pins??[]).map(pin=>{
  const activity=pin.regional?regionalEvidence(game,pin,cache):(cache.byPartner.get(pin.id)??unknown());
  let flowerStage=activity.known?0:null;
  if(pin.contracted&&activity.known)MAP_SCENERY_RULES.flowers.forEach((rule,i)=>{if(activity.quantity>=rule.quantity&&activity.tradeMonths>=rule.months&&activity.span>=rule.span)flowerStage=i+1;});
  const active=!!pin.contracted&&integer(now)&&integer(activity.lastMonth)&&now-activity.lastMonth>=0&&now-activity.lastMonth<MAP_SCENERY_RULES.recentMonths;
  return {id:pin.id,bounds:[...pin.bounds],contracted:!!pin.contracted,box:!!pin.contracted,flowerStage:pin.contracted?flowerStage:0,active,butterfly:active,activity:{...activity}};
 });
 const staticKey=JSON.stringify([stage,partners.map(p=>[p.id,p.bounds,p.box,p.flowerStage])]);
 const motionKey=JSON.stringify(partners.map(p=>[p.id,p.butterfly]));
 const result={stage,month:now,partners,staticKey,motionKey,key:JSON.stringify([staticKey,motionKey])};
 cache.scenes.set(stage,result);return result;
}
