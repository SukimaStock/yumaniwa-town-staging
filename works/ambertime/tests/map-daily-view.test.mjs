import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../partner-orders.mjs';
import {advance} from './brands-helpers.mjs';
import {mapProgress} from '../world-map-view.mjs';
import {mapSalesProjection,mapShopDetail} from '../map-sales-view.mjs';
import {normalizeMapView,loadMapView,saveMapView,dailyMapProjection} from '../map-daily-view.mjs';

const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
const ready=()=>D.enableStoreMarket(D.restoreDistillery(fixture));
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};

test('first browsing range is town when available; persisted range never follows a new unlock',()=>{
 assert.deepEqual(normalizeMapView(null,6),{stage:3,selectedShop:null});
 assert.equal(normalizeMapView(null,2).stage,2);assert.equal(normalizeMapView(null,1).stage,1);
 assert.equal(normalizeMapView({stage:2},6).stage,2);
 assert.equal(normalizeMapView({stage:5},3).stage,3);
 assert.equal(normalizeMapView({stage:0},6).stage,1);
 assert.equal(normalizeMapView({stage:99},6).stage,6);
 assert.equal(normalizeMapView({stage:'3'},6).stage,3);
 assert.equal(normalizeMapView({},NaN).stage,1);
});

test('selection survives only within a visible local shop projection',()=>{
 const view=freeze({stage:3,selectedShop:'town-liquor'}),visible=['town-liquor'];
 assert.deepEqual(normalizeMapView(view,6,visible),view);
 assert.equal(normalizeMapView(view,6,[]).selectedShop,null);
 assert.equal(normalizeMapView({...view,stage:4},6,visible).selectedShop,null);
 assert.equal(normalizeMapView({...view,stage:1},6,visible).selectedShop,null);
 assert.equal(normalizeMapView(view,6,new Set(visible)).selectedShop,'town-liquor');
 assert.equal(normalizeMapView({...view,selectedShop:'unhandled'},6,visible).selectedShop,null);
});

test('UI storage roundtrip touches one UI key and tolerates unavailable or invalid storage',()=>{
 const formal='sukimastock.ambertime.main.v1',key=formal+'.map-view.v1',map=new Map([[formal,fixture]]);
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 assert.equal(saveMapView(storage,key,{stage:3,selectedShop:'town-liquor'}),true);
 assert.deepEqual(loadMapView(storage,key),{stage:3,selectedShop:'town-liquor'});
 assert.equal(map.get(formal),fixture);assert.equal(map.size,2);
 assert.equal(saveMapView(storage,key,{stage:7}),false);
 for(const value of ['broken','null','[]','{"version":2,"stage":3}','{"version":1,"stage":0}','{"version":1,"stage":3,"selectedShop":{}}']){
  map.set(key,value);assert.equal(loadMapView(storage,key),null);
 }
 assert.equal(loadMapView({getItem(){throw Error('blocked');}},key),null);
 assert.equal(saveMapView({setItem(){throw Error('quota');}},key,{stage:3}),false);
 assert.equal(loadMapView(null,key),null);assert.equal(saveMapView(null,key,{stage:3}),false);
 assert.equal(saveMapView(storage,'',{stage:3}),false);
});

test('native committed stock, actual sales and recall remain identical across daily views and restore',()=>{
 let state=ready(),productId=state.result.productId;
 state=D.assignStoreProduct(state,{productId,shopId:'town-liquor',count:5});
 state=advance(state,1);
 const raw=D.serializeDistillery(state),progress=mapProgress(state),local=mapSalesProjection(state,3),detail=mapShopDetail(state,'town-liquor');
 assert(detail.recentSold>0);
 const frozen=freeze(state),daily=dailyMapProjection(frozen,3);
 assert.deepEqual(daily.pins,local.pins);assert.deepEqual(daily.retail,local.retail);
 assert.equal(daily.summary.shopCount,1);assert.equal(daily.summary.recentSold,detail.recentSold);
 assert.equal(daily.summary.recentDelivered,0);assert.equal(daily.summary.currentStock,detail.currentStock);
 assert.equal(D.serializeDistillery(state),raw);assert.deepEqual(mapProgress(state),progress);
 for(const stage of [1,2,3,4,5,6]){
  const view=dailyMapProjection(frozen,stage);assert.deepEqual(view,dailyMapProjection(frozen,stage));
  assert.deepEqual(view.summary,daily.summary);if(stage>=4)assert.deepEqual(view.pins,[]);
 }
 assert.deepEqual(dailyMapProjection(D.restoreDistillery(raw),3),daily);
 state=D.returnStoreProduct(state,{productId,shopId:'town-liquor'});
 assert.equal(dailyMapProjection(state,3).summary.currentStock,0);
 assert.equal(dailyMapProjection(state,3).summary.recentSold,daily.summary.recentSold);
});

test('legacy, current purchases and department deliveries aggregate separately without double counting',()=>{
 // Display-only boundary fixture: never presented as a replayable native career.
 const state=ready(),month=state.core.month;state.storeMarket.startedMonth=month-1;
 state.shop.relations.push({shopId:'supermarket',brandId:1,startedMonth:0});
 state.shop.deliveries=[
  {shopId:'town-liquor',brandId:1,month:month-1,count:7},
  {shopId:'town-liquor',brandId:1,month,count:3},
  {shopId:'supermarket',brandId:1,month,count:4},
  {shopId:'department',brandId:1,month,count:5},
  {shopId:'town-liquor',brandId:1,month:month+1,count:999}
 ];
 const result=dailyMapProjection(freeze(state),5);
 assert.equal(result.summary.name,'蒸留所のある町');assert.equal(result.summary.shopCount,3);
 assert.equal(result.summary.recentSold,7);assert.equal(result.summary.recentDelivered,12);
 assert.equal(result.summary.currentStock,0);assert.equal(result.summary.unknownStockCount,1);
 assert.deepEqual(result.pins,[]);
 const old=D.restoreDistillery(fixture);old.shop.deliveries.push({brandId:1,month:old.core.month,count:6});
 const legacy=dailyMapProjection(old,4);assert.equal(legacy.summary.recentSold,0);
 assert.equal(legacy.summary.recentDelivered,6);assert.equal(legacy.summary.unknownStockCount,1);
});

test('wide reach reports existing rumor arrival only and never creates regional selling shops',()=>{
 const state=ready();state.labConnection.town.arrivals.push({type:'arrival',to:'national-food',channel:'road'});
 const raw=JSON.stringify(state),view=dailyMapProjection(freeze(state),5);
 assert.equal(view.reach.find(r=>r.id==='national').reached,true);
 assert.equal(view.summary.name,'蒸留所のある町');assert.equal(view.summary.shopCount,1);
 assert.deepEqual(view.pins,[]);assert.equal(JSON.stringify(state),raw);
 const fresh=dailyMapProjection(D.newMarketRulesDistillery(42),3);
 assert.equal(fresh.summary.shopCount,0);assert.equal(fresh.summary.recentSold,0);
 assert.deepEqual(fresh.pins,[]);assert(fresh.reach.every(row=>row.reached===false));
});
