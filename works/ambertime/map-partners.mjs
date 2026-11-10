// Disposable map presentation. Static geography never grants a trading right.
import {tradingPartner,partnersForMap} from './trading-partners.mjs';
import {regionalOffers,regionalContract} from './regional-partners.mjs';
import {regionalDeliveryPartners,regionalDeliveryRows,regionalDeliveryMode} from './regional-deliveries.mjs';
import {mapShopDetail} from './map-sales-view.mjs?v=bar-v01-1';
import {mapObservationBounds} from './world-map-view.mjs?v=0.28.0-map&map=map-partners-v01';
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const scopeFor=stage=>stage===2||stage===3?{regionId:'town',mapScale:'town'}:stage===4?{regionId:'trial-region',mapScale:'region'}:null;
const nativeOffers=game=>[game?.shop?.offer,...(game?.shop?.pendingOffers??[])].filter(Boolean);
export function mapPartnerDetail(game,id){
 const partner=tradingPartner(id);if(!partner)return null;
 if(partner.mapScale==='town'){
  const detail=mapShopDetail(game,id),relations=(game?.shop?.relations??[]).filter(r=>(r.shopId??'town-liquor')===id&&r.status!=='declined'&&r.startedMonth<=game.core.month);
  const offer=nativeOffers(game).find(o=>(o.shopId??'town-liquor')===id);
  if(!detail&&!relations.length&&!offer)return null;
  return {...(detail??{id,name:partner.name,currentStock:null,totalSold:null,recentSold:null,totalDelivered:0,recentDelivered:0,products:[],remark:''}),shortName:partner.shortName,partnerId:id,offer:offer?{...offer}:null,contracted:!!detail||relations.length>0,canTrade:partner.tradeMethod==='store-shelf'&&relations.length>0,status:detail?.status??(relations.length?'取扱開始':'申し出あり'),tradeMethod:partner.tradeMethod};
 }
 const contract=regionalContract(game,id),offer=regionalOffers(game).find(o=>o.partnerId===id);
 if(!contract&&!offer)return null;
 const enabled=regionalDeliveryMode(game),rows=regionalDeliveryRows(game,id),totals=enabled?game.regionalDeliveries.totalsByPartner[id]:null;
 const recent=enabled?game.regionalDeliveries.recentReceipts.filter(r=>r.partnerId===id):[];
 const recentDelivered=recent.reduce((n,r)=>n+count(r.count),0);
 const latest=recent.at(-1);
 return {id,partnerId:id,name:partner.name,shortName:partner.shortName,regional:true,mode:'regional-delivery',tradeMethod:partner.tradeMethod,regionId:partner.regionId,contract:contract?{...contract}:null,contractId:contract?.id??null,offer:offer?{...offer}:null,contracted:!!contract,canTrade:regionalDeliveryPartners(game).some(p=>p.id===id),status:contract?'取扱中':'申し出あり',pendingCount:rows.reduce((n,r)=>n+r.count,0),totalDelivered:count(totals?.count),recentDelivered,latestMonth:latest?.month??null,latestCount:latest?.count??null,currentStock:null,totalSold:null,recentSold:null,customerSales:null,products:rows.map(r=>({...r})),recent:recent.map(r=>({...r,allocationIds:[...r.allocationIds]})),remark:''};
}
export function mapPartnerProjection(game,stage){
 const scope=scopeFor(stage),bounds=mapObservationBounds(stage),retail=mapShopDetail(game,'retail');
 const partners=scope?partnersForMap({...scope,includeDefinitions:true}).flatMap(p=>{
  const box=bounds[p.id],detail=mapPartnerDetail(game,p.id);if(!box||!detail)return [];
  const delivered=p.mapScale==='region'?detail.totalDelivered:detail.historicalDelivered??(detail.mode==='delivery'?detail.totalDelivered:0);
  const [x,y,w,h]=box,status=detail.contracted?(delivered>0?'delivered':'contract'):'offer';
  return [{...detail,id:p.id,name:p.name,shortName:p.shortName,kind:p.kind,regionId:p.regionId,mapScale:p.mapScale,status,statusLabel:detail.status,canTrade:detail.canTrade,bounds:[...box],x:x+w/2,y:y+h/2,detail,activity:{contractId:detail.contractId??null,cumulativeDelivered:delivered??0,pendingCount:detail.pendingCount??0,recentDelivered:p.mapScale==='region'?(detail.recentDelivered??0):Math.max(0,(detail.recentDelivered??0)-(detail.recentSold??0)),latestMonth:detail.latestMonth??null,recentLimit:p.mapScale==='region'?8:null,recentWindow:p.mapScale==='region'?'retained-receipts':'12-months',customerSales:p.mapScale==='region'?null:detail.totalSold??null}}];
 }):[];
 return {stage,scope,month:count(game?.core?.month),period:retail.period,partners,pins:partners,retail};
}
// The existing market UI still owns order, bottles, quantities and transactions.
export function marketPartnersForMap(game,view,available){
 const pins=mapPartnerProjection(game,view?.stage??3).partners;
 const ids=new Set(pins.filter(p=>p.canTrade&&(!view?.selectedShop||p.id===view.selectedShop)).map(p=>p.id));
 return available.filter(p=>p.id==='retail'||ids.has(p.id));
}
