// Daily map presentation only. Native receipts, relationships and save data stay owned
// by the existing model. The optional storage helpers write only the supplied UI key.
import {SHOPS} from './shop-model.mjs?v=bar-v01-1';
import {mapSalesProjection,mapShopDetail} from './map-sales-view.mjs?v=bar-v01-1&consignment=night-stage4-v01';
import {mapProgress} from './world-map-view.mjs?v=0.28.0-map&map=map-partners-v01&scenery=map-scenery-v01&world=world-network-v01&consignment=night-stage4-v01';
import {tradingPartner} from './trading-partners.mjs?world=world-network-v01';
import {WORLD_CONTACTS} from './world-network.mjs';
import {mapSceneryProjection} from './map-scenery.mjs?v=map-scenery-v01&world=world-network-v01&consignment=night-stage4-v01';
import {mapPartnerProjection} from './map-partners.mjs?v=map-partners-v01&world=world-network-v01&repair=ui3-20261111&night=stage1&mapSelection=night-stage3&consignment=night-stage4-v01';

const validStage=n=>Number.isInteger(n)&&n>=1&&n<=6;
const validSelection=id=>id===null||typeof id==='string'&&id.length>0&&id.length<=128;
const safeMaximum=max=>Number.isFinite(max)?Math.max(1,Math.min(6,Math.trunc(max))):1;

function cameraState(view){
 const transforms={};
 for(const [key,camera] of Object.entries(view?.transforms??{})){
  if(!/^[1-6]$/.test(key)||!camera||![camera.zoom,camera.panX,camera.panY].every(Number.isFinite))continue;
  transforms[key]={zoom:Math.max(1,Math.min(4,camera.zoom)),panX:Math.max(-1000,Math.min(1000,camera.panX)),panY:Math.max(-1000,Math.min(1000,camera.panY))};
 }
 return Object.keys(transforms).length?{transforms}:{};
}
export function normalizeMapView(view,max=6,visibleShopIds=[]){
 const limit=safeMaximum(max),requested=Number.isInteger(view?.stage)?view.stage:Math.min(3,limit);
 const stage=Math.max(1,Math.min(limit,requested));
 const visible=new Set(Array.isArray(visibleShopIds)||visibleShopIds instanceof Set?visibleShopIds:[]);
 const selectedShop=view?.selectedShop==='retail'?'retail':(stage>=2&&stage<=6)&&typeof view?.selectedShop==='string'&&visible.has(view.selectedShop)&&tradingPartner(view.selectedShop)?.mapScale===(stage<=3?'town':WORLD_CONTACTS.find(p=>p.stage===stage)?.mapScale)?view.selectedShop:null;
 return {stage,selectedShop,...cameraState(view)};
}

export function loadMapView(storage,key){
 if(typeof key!=='string'||!key)return null;
 try{
  const value=JSON.parse(storage.getItem(key));
  if(!value||Array.isArray(value)||![1,2].includes(value.version)||!validStage(value.stage)||!validSelection(value.selectedShop??null))return null;
  return {stage:value.stage,selectedShop:value.selectedShop??null,...cameraState(value)};
 }catch{return null;}
}

export function saveMapView(storage,key,view){
 if(typeof key!=='string'||!key||!validStage(view?.stage)||!validSelection(view.selectedShop??null))return false;
 try{storage.setItem(key,JSON.stringify({version:2,stage:view.stage,selectedShop:view.selectedShop??null,...cameraState(view)}));return true;}catch{return false;}
}

export function dailyMapProjection(game,stage){
 const projection=mapPartnerProjection(game,stage);
 const shops=SHOPS.map(shop=>mapShopDetail(game,shop.id)).filter(Boolean);
 const summary={name:'蒸留所のある町',shopCount:shops.length,recentSold:0,recentDelivered:0,currentStock:0,unknownStockCount:0};
 for(const shop of shops){
  const sold=shop.recentSold??0;
  summary.recentSold+=sold;
  // In market mode the same ledger contains actual purchases after its explicit
  // boundary. Subtract those purchases; only old wholesale/department receipts
  // belong to the separate delivery total.
  summary.recentDelivered+=Math.max(0,shop.recentDelivered-sold);
  if(shop.currentStock===null)summary.unknownStockCount++;
  else summary.currentStock+=shop.currentStock;
 }
 const progress=mapProgress(game);
 const reach=[['town','町'],['near','周辺地域'],['national','全国'],['overseas','海外']]
  .map(([id,name])=>({id,name,reached:progress.reached[id]}));
 return {month:projection.month,period:projection.period,pins:projection.pins,retail:projection.retail,summary,reach,scenery:mapSceneryProjection(game,stage,projection)};
}
