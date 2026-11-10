// Lawful careers only: no injected inquiries, money, contracts or stock.
import * as Native from '../partner-orders.mjs';
import {organicCareer} from './regional-delivery-helpers.mjs';
export const WORLD_IDS=Object.freeze({near:'trial-region-desk',national:'national-specialist-desk',overseas:'overseas-import-desk'});
export const enableWorld=(s,D=Native)=>D.enableWorldNetwork(D.enableRegionalDeliveries(D.enableRegionalPartners(s)));
export function resolveWorld(s,D=Native){
 let guard=0;
 while(s.decisions.length){if(++guard>30)throw Error('Decision loop');const d=s.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');if(!o)throw Error('Recovery required');s=D.chooseDistillery(s,d.caskId,o.id);}
 if(s.trade.offer)s=D.declineOffer(s);
 while(s.shop.offer){const o=s.shop.offer;s=(o.shopId==='department'?D.declineShop:D.acceptShop)(s,o.shopId,o.id);}
 return s;
}
export function worldMonths(s,n,{D=Native,onMonth=()=>{}}={}){
 for(let i=0;i<n;i++){s=resolveWorld(s,D);const month=s.core.month;s=D.tickDistillery(s);if(s.core.month!==month+1)throw Error('Month stopped '+month);onMonth(s);}
 return resolveWorld(s,D);
}
export function fillWorldCraft(s,{D=Native,age=60}={}){
 s=resolveWorld(s,D);s=D.selectFlavorCards(s,{malt:'peat',ferment:'short'});s=D.startRangeDistillation(s);
 while(s.still.distillation.progress<25)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<40)s=D.distillStep(s);
 s=D.fillBarrel(D.stopDistillation(s),'bourbon');const id=s.core.casks.at(-1).id;s=worldMonths(s,age,{D});return D.bottleBranded(s,id,{});
}
const crafted=new Map();
export function naturalWorldCraftFixture(seed=27,{D=Native,untilOffer=true,hand=5}={}){
 const key=seed+':'+untilOffer+':'+hand;
 if(D===Native&&crafted.has(key))return structuredClone(crafted.get(key));
 let s=organicCareer(D,seed,{enable:s=>enableWorld(s,D),through:112});s=fillWorldCraft(s,{D});
 const p=s.core.products.at(-1);s=D.setMarketRetail(s,{productId:p.id,count:p.stock-hand});
 if(untilOffer){
  while(s.core.month<300&&!D.regionalOffers(s).some(o=>o.partnerId===WORLD_IDS.overseas))s=worldMonths(s,1,{D});
  if(!D.regionalOffers(s).some(o=>o.partnerId===WORLD_IDS.overseas))throw Error('No organic overseas offer for seed '+seed);
 }
 if(D===Native)crafted.set(key,structuredClone(s));return s;
}
export function naturalWorldNearFixture(seed=3,{D=Native}={}){
 let s=organicCareer(D,seed,{enable:s=>enableWorld(s,D),stopAtInquiry:true});
 const o=D.regionalOffers(s).find(o=>o.partnerId===WORLD_IDS.near);if(!o)throw Error('No organic near offer');
 s=D.acceptRegionalOffer(s,o.partnerId,o.id);return fillWorldCraft(s,{D});
}
export function reserveWorld(s,partnerId,count,productId=s.result.productId,D=Native){
 const q=D.regionalDeliveryQuote(s,productId,partnerId);return D.assignRegionalProduct(s,{partnerId,productId,count,contractId:q.contractId,allocationId:q.nextAllocationId});
}
export function returnWorld(s,partnerId,productId=s.result.productId,D=Native){
 const q=D.regionalDeliveryQuote(s,productId,partnerId);return D.returnRegionalProduct(s,{partnerId,productId,contractId:q.contractId,allocationIds:q.allocationIds});
}
export function deliverWorld(s,partnerId,productId=s.result.productId,D=Native){
 const q=D.regionalDeliveryQuote(s,productId,partnerId);return D.deliverRegionalProduct(s,{partnerId,productId,contractId:q.contractId,allocationIds:q.allocationIds,deliveryId:q.nextDeliveryId});
}
export function coldWorld(s,D=Native){const raw=D.serializeDistillery(s),restored=D.restoreDistillery(raw);if(D.serializeDistillery(restored)!==raw)throw Error('Cold restore bytes changed');return restored;}
export function sourceChain(s,eventId){
 const map=new Map(s.labConnection.town.events.map(e=>[e.id,e])),chain=[],seen=new Set();let e=map.get(eventId);
 while(e){if(seen.has(e.id))throw Error('Causal cycle');seen.add(e.id);chain.push(e);e=e.sourceId?map.get(e.sourceId):null;}
 return chain;
}
const nationalFixtures=new Map();
export function naturalWorldNationalFixture(seed=3,{D=Native,required=true}={}){
 if(D===Native&&nationalFixtures.has(seed))return structuredClone(nationalFixtures.get(seed));
 let s=naturalWorldNearFixture(seed,{D}),productId=s.result.productId;
 // Actual monthly receipts consume30 bottles, preserving at least5 for the next
 // buyer. Existing stochastic paths decide whether a national inquiry occurs.
 for(let i=0;i<15;i++){s=deliverWorld(reserveWorld(s,WORLD_IDS.near,2,productId,D),WORLD_IDS.near,productId,D);s=worldMonths(s,1,{D});}
 while(s.core.month<300&&!D.regionalOffers(s).some(o=>o.partnerId===WORLD_IDS.national))s=worldMonths(s,1,{D});
 if(required&&!D.regionalOffers(s).some(o=>o.partnerId===WORLD_IDS.national))throw Error('No organic national offer for seed '+seed);
 if(D===Native)nationalFixtures.set(seed,structuredClone(s));return s;
}
