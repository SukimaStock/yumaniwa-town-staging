// Daily map presentation only. Native receipts, relationships and save data stay owned
// by the existing model. The optional storage helpers write only the supplied UI key.
import {SHOPS} from './shop-model.mjs?v=0.48-free-aging';
import {mapSalesProjection,mapShopDetail} from './map-sales-view.mjs?v=map-stage2-r1';
import {mapProgress} from './world-map-view.mjs?v=0.28.0-map';

const validStage=n=>Number.isInteger(n)&&n>=1&&n<=6;
const validSelection=id=>id===null||typeof id==='string'&&id.length>0&&id.length<=128;
const safeMaximum=max=>Number.isFinite(max)?Math.max(1,Math.min(6,Math.trunc(max))):1;

export function normalizeMapView(view,max,visibleShopIds=[]){
 const limit=safeMaximum(max),requested=Number.isInteger(view?.stage)?view.stage:Math.min(3,limit);
 const stage=Math.max(1,Math.min(limit,requested));
 const visible=new Set(Array.isArray(visibleShopIds)||visibleShopIds instanceof Set?visibleShopIds:[]);
 const selectedShop=(stage===2||stage===3)&&typeof view?.selectedShop==='string'&&visible.has(view.selectedShop)?view.selectedShop:null;
 return {stage,selectedShop};
}

export function loadMapView(storage,key){
 if(typeof key!=='string'||!key)return null;
 try{
  const value=JSON.parse(storage.getItem(key));
  if(!value||Array.isArray(value)||value.version!==1||!validStage(value.stage)||!validSelection(value.selectedShop??null))return null;
  return {stage:value.stage,selectedShop:value.selectedShop??null};
 }catch{return null;}
}

export function saveMapView(storage,key,view){
 if(typeof key!=='string'||!key||!validStage(view?.stage)||!validSelection(view.selectedShop??null))return false;
 try{storage.setItem(key,JSON.stringify({version:1,stage:view.stage,selectedShop:view.selectedShop??null}));return true;}catch{return false;}
}

export function dailyMapProjection(game,stage){
 const projection=mapSalesProjection(game,stage);
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
 return {month:projection.month,period:projection.period,pins:stage===2||stage===3?projection.pins:[],retail:projection.retail,summary,reach};
}
