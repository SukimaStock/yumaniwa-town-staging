// Native-game inquiry adapter. No RNG, inventory, money, simulation or storage IO.
import {tradingPartner} from './trading-partners.mjs';
import {SHOP} from './shop-model.mjs?v=bar-v01-1';
export const REGIONAL_PARTNERS=Object.freeze({version:1,rules:'regional-inquiry-offers/1',partnerId:'trial-region-desk',regionId:'trial-region',nodeId:'near-wide'});
export const regionalPartnerMode=s=>s?.regionalPartners?.version===REGIONAL_PARTNERS.version&&s.regionalPartners.rules===REGIONAL_PARTNERS.rules;
export const regionalOffers=s=>regionalPartnerMode(s)?s.regionalPartners.offers.filter(o=>o.status==='pending'):[];
export const regionalContract=(s,partnerId=REGIONAL_PARTNERS.partnerId)=>regionalPartnerMode(s)?s.regionalPartners.contracts.find(c=>c.partnerId===partnerId)??null:null;
export function initialRegionalPartners(s){
 return {version:REGIONAL_PARTNERS.version,rules:REGIONAL_PARTNERS.rules,startedMonth:s.core.month,eventStart:s.labConnection.town.events.length,eventCursor:s.labConnection.town.events.length,offers:[],contracts:[],declinedUntil:{}};
}
// Trace the unchanged simulation's sourceId chain to a native paid receipt.
// Synthetic unit fixtures can call this projection; only native replay can
// authenticate a complete saved state. Missing/foreign evidence fails closed.
export function regionalInquiryEvidence(s,eventId,eventMap=new Map((s.labConnection?.town?.events??[]).map(e=>[e.id,e]))){
 const town=s.labConnection?.town,config=REGIONAL_PARTNERS,e=eventMap.get(eventId),p=tradingPartner(config.partnerId);
 if(!town?.external||town.version!=='ambertime-town-main/1'||!p||p.regionId!==config.regionId||e?.type!=='inquiry'||e.to!==config.nodeId||!Number.isSafeInteger(e.month)||e.month>s.core.month)return null;
 const r=s.releases?.find(r=>r.id===e.mainReleaseId),local=town.releases.find(r=>r.id===e.releaseId);
 if(!r||!local||local.externalId!==r.id||local.product.productId!==r.productId||e.productId!==r.productId||!s.brands?.some(b=>b.id===r.brandId))return null;
 const seen=new Set();let current=e,shipment=null;
 while(current){
  if(seen.has(current.id)||current.releaseId!==local.id||current.mainReleaseId!==r.id||current.productId!==r.productId)return null;
  seen.add(current.id);
  if(current.type==='shipment'){
   const receipt=town.shipments.find(x=>x.id===current.shipmentId&&x.month===current.month&&x.to===current.to&&x.count===current.count&&x.parts.some(part=>part.eventId===current.id&&part.releaseId===local.id&&part.count===current.count));
   if(!receipt||current.count<1)return null;
   const actual=s.shop.deliveries.find(d=>'shop:'+d.id===receipt.id&&d.releaseId===r.id&&d.month===receipt.month&&d.count===receipt.count);
   const retail=receipt.id==='retail:'+receipt.month+':'+r.productId&&receipt.to==='town'&&r.sold>=receipt.count;
   if(!actual&&!retail)return null;
   shipment=receipt;
  }
  if(current.type==='release'){
   if(!shipment||current.id!==local.eventId||current.count!==r.bottles||current.sourceId!==null)return null;
   return {partnerId:p.id,regionId:p.regionId,nodeId:config.nodeId,brandId:r.brandId,releaseId:r.id,productId:r.productId,eventId:e.id,inquiryMonth:e.month,sourceReceiptId:shipment.id};
  }
  const parent=eventMap.get(current.sourceId);
  if(!parent||parent.month>current.month)return null;current=parent;
 }
 return null;
}
// Called only after the existing native monthly sync. Pending offers and
// cooldown never consume future inquiry evidence or touch the town queue.
export function refreshRegionalOffers(s){
 if(!regionalPartnerMode(s)||regionalOffers(s).length||regionalContract(s)||s.tastingId!==null||s.decisions.length||s.trade.offer||s.still.phase!=='ready')return;
 const state=s.regionalPartners,id=REGIONAL_PARTNERS.partnerId;
 if(s.core.month<(state.declinedUntil[id]??0))return;
 const events=s.labConnection.town.events,map=new Map(events.map(e=>[e.id,e]));
 for(let i=state.eventCursor;i<events.length;i++){
  state.eventCursor=i+1;const e=events[i];
  if(e.month<state.startedMonth||e.type!=='inquiry'||e.to!==REGIONAL_PARTNERS.nodeId)continue;
  const evidence=regionalInquiryEvidence(s,e.id,map);if(!evidence||state.offers.some(o=>o.eventId===e.id))continue;
  state.offers.push({id:'regional-offer:'+id+':'+e.id,...evidence,month:s.core.month,status:'pending',notified:false,deferred:false});return;
 }
}
export function decideRegionalOffer(s,partnerId,offerId,decision){
 if(!regionalPartnerMode(s)||partnerId!==REGIONAL_PARTNERS.partnerId||!['notice','defer','accept','decline'].includes(decision))throw Error('地域の申し出を確認してください。');
 const offer=s.regionalPartners.offers.find(o=>o.partnerId===partnerId&&o.id===offerId);
 if(offer?.status==='accepted'&&decision==='accept'&&regionalContract(s,partnerId)?.sourceOfferId===offerId)return false;
 if(!offer||offer.status!=='pending')throw Error('この申し出は変わりました。もう一度確認します。');
 if(decision==='notice'||decision==='defer'){
  if(offer.notified&&(decision==='notice'||offer.deferred))return false;
  offer.notified=true;if(decision==='defer')offer.deferred=true;return true;
 }
 offer.notified=true;offer.status=decision==='accept'?'accepted':'declined';offer.decidedMonth=s.core.month;
 if(decision==='decline')s.regionalPartners.declinedUntil[partnerId]=s.core.month+SHOP.declineGap;
 else{
  if(regionalContract(s,partnerId))throw Error('この地域とはすでに取扱いが始まっています。');
  s.regionalPartners.contracts.push({id:'regional-contract:'+partnerId,partnerId,regionId:offer.regionId,brandId:offer.brandId,releaseId:offer.releaseId,eventId:offer.eventId,sourceReceiptId:offer.sourceReceiptId,sourceOfferId:offer.id,startedMonth:s.core.month});
 }
 return true;
}
