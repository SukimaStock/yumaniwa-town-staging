// Daily presentation parity: same native operations, optional frozen map reads only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as D from '../../partner-orders.mjs';
import {dailyMapProjection as mapSalesProjection} from '../../map-daily-view.mjs';
import {mapProgress} from '../../world-map-view.mjs';
import {runCareer} from '../../experiments/market-design/v01/run.mjs';
const observed=['tickDistillery','assignStoreProduct','returnStoreProduct','setMarketRetail','bottleBranded','acceptShop','declineShop'];
const hash=text=>createHash('sha256').update(text).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
export function compareCareer(seed,{horizon=36,policy='mixed',age=12,onFinal}={}){
 const config={seed,cap:2,age,policy,horizon},baseline=[],timings=[],observations={points:0,pins:0,multiProduct:0,multipleStores:0,sales:0,maxRecentSold:0};let index=0,last=null;
 function engine(project){
  const out={...D,newStoreMarketDistillery:D.newMarketRulesDistillery};
  for(const key of observed)out[key]=(...args)=>{
   const state=D[key](...args),raw=JSON.stringify(state),tag=[key,state.core.month,state.operations.length];last=state;
   if(!project)baseline.push({tag,raw});
   else{
    assert.deepEqual(tag,baseline[index]?.tag);assert.equal(raw,baseline[index]?.raw,'same native operation state');
    const progress=mapProgress(state),start=performance.now();
    for(const stage of [1,2,3,4,5,6]){
     const p=mapSalesProjection(freeze(state),stage);observations.pins+=p.pins.length;
     if(p.pins.length>1)observations.multipleStores++;
     for(const pin of p.pins){
      if(pin.products.length>1)observations.multiProduct++;
      if(pin.totalSold>0)observations.sales++;
      observations.maxRecentSold=Math.max(observations.maxRecentSold,pin.recentSold??0);
      assert.equal(pin.currentStock,state.storeMarket.byShop[pin.id]?Object.values(state.storeMarket.byShop[pin.id]).reduce((n,v)=>n+v,0):null);
      assert(pin.latestMonth===null||pin.latestMonth<=state.core.month);
     }
     assert.deepEqual(p,mapSalesProjection(state,stage),'deterministic view');
    }
    timings.push(performance.now()-start);assert.equal(JSON.stringify(state),raw,'map cannot change save data');assert.deepEqual(mapProgress(state),progress);observations.points++;index++;
   }
   return state;
  };
  return out;
 }
 const expected=runCareer(engine(false),config),actual=runCareer(engine(true),config);
 assert.deepEqual(actual,expected);assert.equal(index,baseline.length);
 const raw=D.serializeDistillery(last),restored=D.restoreDistillery(raw);assert.equal(D.serializeDistillery(restored),raw);assert.deepEqual(mapSalesProjection(restored,3),mapSalesProjection(last,3));if(onFinal)onFinal(raw);
 timings.sort((a,b)=>a-b);
 return {seed,config,months:actual.months,stopReason:actual.reason,points:index,...observations,finalSaveSha256:hash(raw),finalMapSha256:hash(JSON.stringify(mapSalesProjection(last,3))),nativeResultsMatch:true,exactStateAtEveryPoint:true,restoreExact:true,timingMs:{median:timings[Math.floor(timings.length/2)]??0,max:timings.at(-1)??0},unlockedStores:Object.keys(actual.unlock),releaseCount:last.releases.length};
}
export function syntheticLongTerm(){
 const s={core:{month:360,products:[]},shop:{relations:[{shopId:'town-liquor',brandId:1,startedMonth:0},{shopId:'supermarket',brandId:2,startedMonth:0}],deliveries:[]},placement:{version:1,retailByProduct:{}},storeMarket:{version:1,startedMonth:0,byShop:{'town-liquor':{},supermarket:{}}},releases:[],brands:[]};
 for(let month=1;month<=360;month++)for(const [id,brandId] of [['town-liquor',1],['supermarket',2]])s.shop.deliveries.push({id:s.shop.deliveries.length+1,shopId:id,brandId,month,count:id==='town-liquor'?10:20});
 const before=JSON.stringify(s),p=mapSalesProjection(freeze(s),3);assert.equal(JSON.stringify(s),before);assert.deepEqual(p.pins.map(x=>x.totalSold),[3600,7200]);assert.deepEqual(p.pins.map(x=>x.recentSold),[120,240]);
 const future=structuredClone(s);future.shop.deliveries.push({shopId:'town-liquor',brandId:1,month:361,count:999});assert.deepEqual(mapSalesProjection(future,3),p);
 return {kind:'synthetic-display-only-not-native-career',months:360,receiptCount:s.shop.deliveries.length,windowMonths:12,totals:p.pins.map(x=>({id:x.id,total:x.totalSold,recent:x.recentSold})),frozenReadOnly:true,futureExcluded:true};
}
export function legacyRoundtrip(){
 const raw=JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/placement-established-six.json',import.meta.url))).raw,s=D.restoreDistillery(raw);
 assert.equal(D.serializeDistillery(s),raw);mapSalesProjection(freeze(s),2);mapSalesProjection(s,3);assert.equal(D.serializeDistillery(s),raw);
 const enabled=D.enableStoreMarket(s),enabledRaw=D.serializeDistillery(enabled),p=mapSalesProjection(enabled,3);assert(p.pins.every(x=>x.totalSold===0));assert.equal(D.serializeDistillery(D.restoreDistillery(enabledRaw)),enabledRaw);
 return {fixture:'placement-established-six.json',legacySha256:hash(raw),legacyExact:true,explicitBoundaryPreserved:true,historicalDeliveryNotReclassified:true};
}
export async function main({seedCount=100,horizon=36,out=new URL('./results.json',import.meta.url)}={}){
 const start=performance.now(),runs=[];for(let seed=1;seed<=seedCount;seed++){runs.push(compareCareer(seed,{horizon}));if(seed%10===0)process.stderr.write(`Map parity ${seed}/${seedCount}\n`);}
 const sourceSha256=Object.fromEntries(['partner-orders.mjs','store-market.mjs','market-sales.mjs','economy.mjs','map-sales-view.mjs','map-daily-view.mjs'].map(name=>[name,hash(fs.readFileSync(new URL('../../'+name,import.meta.url)))]));
 const result={schema:'ambertime-map-daily-parity/1',sourceSha256,method:'Same native public-operation careers twice; second branch adds frozen read-only map reads. Exact JSON at tick, assignment, return, retail allocation, bottling and relationship boundaries. No altered saves.',nativeRules:'newMarketRulesDistillery',seeds:{first:1,last:seedCount,count:seedCount},horizon,aggregate:{runs:runs.length,months:runs.reduce((n,r)=>n+r.months,0),points:runs.reduce((n,r)=>n+r.points,0),multipleStores:runs.reduce((n,r)=>n+r.multipleStores,0),multiProduct:runs.reduce((n,r)=>n+r.multiProduct,0),salesObservations:runs.reduce((n,r)=>n+r.sales,0)},legacy:legacyRoundtrip(),syntheticLongTerm:syntheticLongTerm(),elapsedMs:performance.now()-start,runs};
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');return result;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){const count=Number(process.argv.find(x=>x.startsWith('--seeds='))?.slice(8)??100),horizon=Number(process.argv.find(x=>x.startsWith('--months='))?.slice(9)??36);await main({seedCount:count,horizon});}
