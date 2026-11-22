// Disposable map presentation. Static geography never grants a trading right.
import {tradingPartner,partnersForMap} from './trading-partners.mjs?world=world-network-v01&perf=v06';
import {regionalContacts} from './world-network.mjs';
import {regionalOffers,regionalContract} from './regional-partners.mjs?world=world-network-v01&perf=v06';
import {regionalDeliveryPartners,regionalDeliveryRows,regionalDeliveryMode} from './regional-deliveries.mjs?world=world-network-v01&consignment=night-stage4-v01&perf=v06';
import {mapShopDetail} from './map-sales-view.mjs?v=bar-v01-1&consignment=night-stage4-v01&perf=v06';
import {mapObservationBounds} from './world-map-view.mjs?v=0.28.0-map&map=map-partners-v01&scenery=map-scenery-v01&world=world-network-v01&consignment=night-stage4-v01&perf=v06';
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const scopesFor=(game,stage)=>stage===2||stage===3?[{regionId:'town',mapScale:'town'}]:regionalContacts(game).filter(p=>p.stage===stage).map(({regionId,mapScale})=>({regionId,mapScale}));
const latestRegionalReceipts=new WeakMap();
function latestRegionalReceipt(game,id,recent){
 if(!Array.isArray(game.operations))return recent.at(-1)??null;
 let latest=latestRegionalReceipts.get(game);
 if(!latest){latest=new Map();for(const operation of game.operations){const r=operation.key==='regional-deliver'?operation.value?.receipt:null;if(r&&Number.isSafeInteger(r.month)&&r.month<=game.core.month&&(!latest.has(r.partnerId)||latest.get(r.partnerId).month<=r.month))latest.set(r.partnerId,r);}latestRegionalReceipts.set(game,latest);}
 return latest.get(id)??recent.at(-1)??null;
}
const nativeOffers=game=>[game?.shop?.offer,...(game?.shop?.pendingOffers??[])].filter(Boolean);
export function mapPartnerDetail(game,id){
 const partner=tradingPartner(id);if(!partner)return null;
 if(partner.mapScale==='town'){
  const detail=mapShopDetail(game,id),relations=(game?.shop?.relations??[]).filter(r=>(r.shopId??'town-liquor')===id&&r.status!=='declined'&&r.startedMonth<=game.core.month);
  const offer=nativeOffers(game).find(o=>(o.shopId??'town-liquor')===id);
  if(!detail&&!relations.length&&!offer)return null;
  return {...(detail??{id,name:partner.name,currentStock:null,totalSold:null,recentSold:null,totalDelivered:0,recentDelivered:0,products:[],remark:''}),shortName:partner.shortName,partnerId:id,offer:offer?{...offer}:null,contracted:!!detail||relations.length>0,canTrade:partner.tradeMethod==='store-shelf'&&relations.length>0,status:detail?.status??(relations.length?'取扱開始':'申し出あり'),tradeMethod:partner.tradeMethod};
 }
 if(!regionalContacts(game).some(p=>p.id===id))return null;
 const contract=regionalContract(game,id),offer=regionalOffers(game).find(o=>o.partnerId===id);
 if(!contract&&!offer)return null;
 const enabled=regionalDeliveryMode(game),rows=regionalDeliveryRows(game,id),totals=enabled?game.regionalDeliveries.totalsByPartner[id]:null;
 const recent=enabled?game.regionalDeliveries.recentReceipts.filter(r=>r.partnerId===id):[];
 const recentDelivered=recent.reduce((n,r)=>n+count(r.count),0);
 const latest=latestRegionalReceipt(game,id,recent);
 return {id,partnerId:id,name:partner.name,shortName:partner.shortName,regional:true,mode:'regional-delivery',tradeMethod:partner.tradeMethod,regionId:partner.regionId,contract:contract?{...contract}:null,contractId:contract?.id??null,offer:offer?{...offer}:null,contracted:!!contract,canTrade:regionalDeliveryPartners(game).some(p=>p.id===id),status:contract?'取扱中':'申し出あり',pendingCount:rows.reduce((n,r)=>n+r.count,0),totalDelivered:count(totals?.count),recentDelivered,latestMonth:latest?.month??null,latestCount:latest?.count??null,currentStock:null,totalSold:null,recentSold:null,customerSales:null,products:rows.map(r=>({...r})),recent:recent.map(r=>({...r,allocationIds:[...r.allocationIds]})),remark:''};
}
export function mapPartnerProjection(game,stage){
 const scopes=scopesFor(game,stage),scope=scopes[0]??null,bounds=mapObservationBounds(stage),retail=mapShopDetail(game,'retail');
 const partners=scopes.flatMap(scope=>partnersForMap({...scope,includeDefinitions:true})).flatMap(p=>{
  const box=bounds[p.id],detail=mapPartnerDetail(game,p.id);if(!box||!detail)return [];
  const delivered=detail.regional?detail.totalDelivered:detail.historicalDelivered??(detail.mode==='delivery'?detail.totalDelivered:0);
  const [x,y,w,h]=box,status=detail.contracted?(delivered>0?'delivered':'contract'):'offer';
  return [{...detail,id:p.id,name:p.name,shortName:p.shortName,kind:p.kind,regionId:p.regionId,mapScale:p.mapScale,status,statusLabel:detail.status,canTrade:detail.canTrade,bounds:[...box],x:x+w/2,y:y+h/2,detail,activity:{contractId:detail.contractId??null,cumulativeDelivered:delivered??0,pendingCount:detail.pendingCount??0,recentDelivered:detail.regional?(detail.recentDelivered??0):Math.max(0,(detail.recentDelivered??0)-(detail.recentSold??0)),latestMonth:detail.latestMonth??null,recentLimit:detail.regional?8:null,recentWindow:detail.regional?'retained-receipts':'12-months',customerSales:detail.regional?null:detail.totalSold??null}}];
 });
 return {stage,scope,month:count(game?.core?.month),period:retail.period,partners,pins:partners,retail};
}
// The existing market UI still owns order, bottles, quantities and transactions.
// This is a display scope only: a smaller scope never creates a pin in the
// map being browsed, a contract, or an allocation.
const scopeNames={2:'町',3:'町',4:'地方',5:'全国',6:'海外'};
const partnerStage=id=>({town:3,region:4,prefecture:5,country:6})[tradingPartner(id)?.mapScale]??null;
export function marketPartnerScopeForMap(game,view,available){
 const requestedStage=Number.isInteger(view?.stage)&&view.stage>=1&&view.stage<=6?view.stage:3;
 const retail=available.filter(p=>p.id==='retail');
 const result=(shops,stage=requestedStage)=>({shops,stage,requestedStage,fallback:stage!==requestedStage,label:stage!==requestedStage?scopeNames[stage]+'の取引先':'',selectedShop:shops.some(p=>p.id===view?.selectedShop)?view.selectedShop:null});
 const selected=available.find(p=>p.id===view?.selectedShop&&p.id!=='retail');
 const selectedStage=selected&&mapPartnerDetail(game,selected.id)?.canTrade?(mapPartnerProjection(game,requestedStage).partners.some(p=>p.id===selected.id)?requestedStage:partnerStage(selected.id)):null;
 // Selection changes emphasis, never the set of peers in the same map layer.
 // An explicit eligible target selects its own layer before the existing
 // nearest-contracted-layer fallback is applied.
 for(let stage=selectedStage??requestedStage;stage>=2;stage--){
  const ids=new Set(mapPartnerProjection(game,stage).partners.filter(p=>p.canTrade).map(p=>p.id));
  const shops=available.filter(p=>p.id!=='retail'&&ids.has(p.id));
  if(shops.length)return result([...retail,...shops],stage);
 }
 return result(retail);
}
export function marketPartnersForMap(game,view,available){return marketPartnerScopeForMap(game,view,available).shops;}
