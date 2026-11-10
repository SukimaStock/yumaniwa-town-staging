// Static read-only descriptions. Registration is never an offer or a contract.
// Existing transaction modules remain authoritative for every game version.
import {SHOPS} from './shop-model.mjs?v=bar-v01-1';
import {VENUES} from './market-sales.mjs?v=bar-v01-1';
import {NORMAL_SHOP_DEMAND} from './shop-demand.mjs?v=bar-v01-1';
import {DEPARTMENT} from './department-projects.mjs?v=0.44-monthly-timing';
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(freeze);Object.freeze(value);
 }
 return value;
};
// Logical map scopes only; no coordinates, unlocks, or simulation nodes added.
export const PARTNER_REGIONS=freeze([
 {id:'town',mapScale:'town'},
 {id:'trial-region',mapScale:'region'}
]);
const kinds={'town-liquor':'liquor-shop',supermarket:'supermarket',department:'department-store',bar:'bar'};
const shortNames={'town-liquor':'酒屋',supermarket:'スーパー',department:'デパート',bar:'バー'};
const existing=SHOPS.map(shop=>{
 const venue=VENUES.find(v=>v.id===shop.id),project=shop.id==='department';
 return freeze({
  id:shop.id,name:shop.name,shortName:shortNames[shop.id],kind:kinds[shop.id],
  regionId:'town',mapScale:'town',availability:'existing',
  // Preserve the original frozen object instead of copying its numeric rules.
  shop,
  preference:venue?{source:'market-sales',venue}: {source:'department-projects',label:'熟成・穏やかな刺激'},
  acceptance:{minAge:shop.minAge,maxRoughness:shop.maxRoughness,source:project?'departmentReleaseEligible':'shopProductCondition'},
  capacity:project?{projectQuantity:DEPARTMENT.quantity}: {monthlyOpportunities:venue.opportunities,allocationMinQuantity:1,quantityChoice:'player'},
  price:{rate:shop.rate,referencePaidPrice:NORMAL_SHOP_DEMAND.referencePaidPrice[shop.id]??null,source:project?'shopOfferQuote':'normalShopUnitPrice'},
  // Historical receiving limits do not constrain current shelf allocations.
  legacyDemand:{minQuantity:shop.minQuantity,monthlyLimit:shop.monthlyLimit,base:NORMAL_SHOP_DEMAND.base[shop.id]??null},
  tradeMethod:project?'department-project':'store-shelf',
  contract:{source:'shopEvidence',scope:project?'project':shop.id==='bar'?'shop':'brand'}
 });
});
const regional=freeze({
 id:'trial-region-desk',name:'別の地域の仕入れ窓口（仮）',shortName:'地域窓口',kind:'regional-desk',
 regionId:'trial-region',mapScale:'region',availability:'definition-only',
 preference:{source:'provisional',label:'麦・穏やかな樽香',flavorKeys:['grain','vanilla']},
 acceptance:{minAge:6,maxRoughness:null,source:'provisional'},
 capacity:{monthlyOpportunities:3,allocationMinQuantity:1,quantityChoice:'player'},
 price:{rate:1,source:'provisional'},legacyDemand:null,tradeMethod:'player-delivery',contract:null
});
export const TRADING_PARTNERS=Object.freeze([...existing,regional]);

// Validate static references independently of game state. Do not use this as a
// substitute for shopEvidence/quotes or formal save validation.
export function validateTradingPartners(partners=TRADING_PARTNERS,regions=PARTNER_REGIONS){
 if(!Array.isArray(partners)||!Array.isArray(regions))throw Error('Partner definitions must be arrays');
 const scopes=new Map(),ids=new Set();
 for(const region of regions){
  if(!region||typeof region.id!=='string'||!region.id||scopes.has(region.id)||!['town','region','prefecture','country'].includes(region.mapScale))throw Error('Invalid or duplicate partner region');
  scopes.set(region.id,region.mapScale);
 }
 for(const partner of partners){
  if(!partner||typeof partner.id!=='string'||!partner.id||partner.id==='retail'||ids.has(partner.id))throw Error('Invalid or duplicate external partner ID');
  ids.add(partner.id);
  if(!scopes.has(partner.regionId)||scopes.get(partner.regionId)!==partner.mapScale)throw Error('Unknown or mismatched partner region');
  if(!partner.name||!partner.shortName||!partner.kind||!['existing','definition-only'].includes(partner.availability))throw Error('Invalid partner metadata');
  if(partner.availability==='existing'&&(!SHOPS.includes(partner.shop)||partner.shop.id!==partner.id))throw Error('Unknown existing shop reference');
  if(partner.availability==='definition-only'&&(partner.shop||partner.contract))throw Error('Definition-only partner cannot claim a native shop or contract');
 }
 return true;
}
validateTradingPartners();
export const tradingPartner=id=>TRADING_PARTNERS.find(p=>p.id===id)??null;
// This is a definition filter, never a list of accepted/unlocked contracts.
export function partnersForMap({regionId,mapScale,includeDefinitions=false}={}){
 if(!PARTNER_REGIONS.some(r=>r.id===regionId&&r.mapScale===mapScale))return [];
 return TRADING_PARTNERS.filter(p=>p.regionId===regionId&&p.mapScale===mapScale&&(includeDefinitions||p.availability==='existing'));
}
