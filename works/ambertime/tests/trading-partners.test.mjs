import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {SHOPS} from '../shop-model.mjs?v=bar-v01-1';
import {VENUES} from '../market-sales.mjs?v=bar-v01-1';
import {STORE_MARKET_SHOPS} from '../store-market.mjs';
import {TRADING_PARTNERS,PARTNER_REGIONS,tradingPartner,partnersForMap,validateTradingPartners} from '../trading-partners.mjs';

test('four native shops derive identity, acceptance and distinct historical/current capacities',()=>{
 assert.deepEqual(TRADING_PARTNERS.filter(p=>p.availability==='existing').map(p=>p.id),SHOPS.map(p=>p.id));
 for(const shop of SHOPS){
  const p=tradingPartner(shop.id);assert.equal(p.shop,shop);assert.equal(p.name,shop.name);
  assert.deepEqual(p.acceptance,{minAge:shop.minAge,maxRoughness:shop.maxRoughness,source:shop.id==='department'?'departmentReleaseEligible':'shopProductCondition'});
  assert.equal(p.price.rate,shop.rate);assert.equal(p.legacyDemand.monthlyLimit,shop.monthlyLimit);assert.equal(p.legacyDemand.minQuantity,shop.minQuantity);
  if(shop.id!=='department'){
   assert.equal(p.preference.venue,VENUES.find(v=>v.id===shop.id));
   assert.equal(p.capacity.monthlyOpportunities,p.preference.venue.opportunities);assert.equal(p.capacity.allocationMinQuantity,1);
  }
 }
 assert.equal(tradingPartner('supermarket').price.referencePaidPrice,20);
 assert.equal(tradingPartner('supermarket').legacyDemand.minQuantity,10);
 assert.equal(tradingPartner('supermarket').capacity.allocationMinQuantity,1);
 assert.deepEqual(['town-liquor','supermarket','bar'].map(id=>tradingPartner(id).capacity.monthlyOpportunities),[8,12,4]);
 assert.equal(tradingPartner('bar').contract.scope,'shop');assert.equal(tradingPartner('town-liquor').contract.scope,'brand');
 assert.equal(tradingPartner('department').tradeMethod,'department-project');assert.equal(tradingPartner('department').capacity.projectQuantity,5);
 assert.equal(tradingPartner('department').capacity.monthlyOpportunities,undefined);
});

test('regional desk has independent small capacity, player quantity, region scope and no native activation',()=>{
 const p=tradingPartner('trial-region-desk');assert.equal(p.kind,'regional-desk');assert.equal(p.availability,'definition-only');
 assert.equal(p.regionId,'trial-region');assert.equal(p.mapScale,'region');assert.equal(p.capacity.quantityChoice,'player');
 assert.equal(p.capacity.allocationMinQuantity,1);assert.equal(p.capacity.monthlyOpportunities,3);assert.equal(p.price.rate,1);
 assert.deepEqual(p.preference.flavorKeys,['grain','vanilla']);assert.equal(p.acceptance.minAge,6);
 assert.equal(p.contract,null);assert.equal(p.shop,undefined);
 assert(!SHOPS.some(x=>x.id===p.id));assert(!STORE_MARKET_SHOPS.some(x=>x.id===p.id));assert(!VENUES.some(x=>x.id===p.id));
 assert.deepEqual(partnersForMap({regionId:p.regionId,mapScale:p.mapScale}),[]);
 assert.deepEqual(partnersForMap({regionId:p.regionId,mapScale:p.mapScale,includeDefinitions:true}),[p]);
 assert.equal(partnersForMap({regionId:'town',mapScale:'town'}).length,4);
 for(const scope of [{regionId:'missing',mapScale:'region',includeDefinitions:true},{regionId:'trial-region',mapScale:'country',includeDefinitions:true},{}])assert.deepEqual(partnersForMap(scope),[]);
 for(const id of ['retail','missing','toString','__proto__',null])assert.equal(tradingPartner(id),null);
});

test('duplicate IDs, invalid region and false native references fail closed; definitions are immutable',()=>{
 assert(validateTradingPartners());
 const p=tradingPartner('trial-region-desk');
 for(const entries of [[...TRADING_PARTNERS,p],[{...p,regionId:'missing'}],[{...p,mapScale:'country'}],[{...p,availability:'existing'}],[{...p,availability:'existing',shop:SHOPS[0]}],[{...p,contract:{}}],[{...p,id:'retail'}]])assert.throws(()=>validateTradingPartners(entries));
 assert.throws(()=>validateTradingPartners(TRADING_PARTNERS,[...PARTNER_REGIONS,PARTNER_REGIONS[0]]));
 assert.throws(()=>{p.capacity.monthlyOpportunities=999;});assert.throws(()=>{p.preference.flavorKeys.push('smoke');});
});

test('loading and reading definitions leaves native save/replay, UI, quotes, plans and ledger byte-identical',()=>{
 const root=new URL('../',import.meta.url).href;
 const script=`
 import fs from 'node:fs';
 import * as D from '${root}partner-orders.mjs';
 import {availableMarketShops} from '${root}market-ui.mjs';
 import {planStoreMarketSales} from '${root}store-market.mjs';
 import {buildShopLedger} from '${root}shop-ledger.mjs';
 const fixture=JSON.parse(fs.readFileSync(new URL('${root}tests/fixtures/placement-established-six.json'))).raw;
 let s=D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(fixture)));
 if(process.argv[1]==='adapter'){
  const m=await import('${root}trading-partners.mjs');
  for(const p of m.TRADING_PARTNERS){m.tradingPartner(p.id);m.partnersForMap({regionId:p.regionId,mapScale:p.mapScale,includeDefinitions:true});}
 }
 const id=s.result.productId;
 s=D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:3});
 const output=[];
 for(let i=0;i<6;i++){
  output.push({raw:D.serializeDistillery(s),ui:availableMarketShops(s),ledger:buildShopLedger(s),plans:planStoreMarketSales(s,s.core.month+1),quote:D.storeMarketQuote(s,id,'town-liquor')});
  s=D.tickDistillery(s);
 }
 output.push(D.serializeDistillery(D.restoreDistillery(D.serializeDistillery(s))));
 process.stdout.write(JSON.stringify(output));`;
 const run=arg=>execFileSync(process.execPath,['--input-type=module','-e',script,arg],{encoding:'utf8',maxBuffer:8e6});
 assert.equal(run('adapter'),run('baseline'));
});
