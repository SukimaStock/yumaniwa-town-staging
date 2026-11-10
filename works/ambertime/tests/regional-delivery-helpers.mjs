import * as D from '../partner-orders.mjs';
import {initializeRecall,advanceRecall} from '../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {initializeCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger} from '../recent-ledger.mjs';
// Lawful reproducible integration career: every inquiry is emitted by unchanged native simulation.
// No injected state/events/cash. Pass the native model namespace as D.
export function organicCareer(D,seed,{enable=s=>s,through=180,onMonth=()=>{},restoreAt=[120],stopAtInquiry=false}={}){
 let s=enable(D.newShopDialogueDistillery(seed));
 function resolve(){let guard=0;
  while(s.decisions.length){if(++guard>20)throw Error('decision loop');const d=s.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');if(!o)throw Error('Recovery required '+d.eventId);s=D.chooseDistillery(s,d.caskId,o.id);}
  if(s.trade.offer)s=D.declineOffer(s);
  while(s.shop.offer){const o=s.shop.offer;s=(o.shopId==='department'?D.declineShop:D.acceptShop)(s,o.shopId,o.id);}
 }
 function month(){resolve();const before=s.core.month;s=D.tickDistillery(s);if(s.core.month!==before+1)throw Error('Month stopped '+before);
  if(restoreAt.includes(s.core.month))s=D.restoreDistillery(D.serializeDistillery(s));
  onMonth(s);
 }
 function fill(){resolve();s=D.selectFlavorCards(s,{malt:'plain',ferment:'short'});s=D.startDistillation(s);while(s.still.distillation.progress<45)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<65)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'refill');}
 for(let n=0;n<4;n++){
  fill();const cid=s.core.casks.at(-1).id;for(let i=0;i<12;i++)month();s=D.bottleBranded(s,cid,{});
  const id=s.result.productId,p=s.core.products.find(p=>p.id===id);
  s=n===3?D.assignStoreProduct(s,{productId:id,shopId:'supermarket',count:p.stock}):D.setMarketRetail(s,{productId:id,count:p.stock});
  for(let i=0;i<16;i++)month();
 }
 while(s.core.month<through){month();if(stopAtInquiry&&s.labConnection.town.events.some(e=>e.type==='inquiry'&&e.to==='near-wide'))break;}
 return s;
}
export function resolveRegionalCareer(s){
 while(s.decisions.length){const d=s.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');if(!o)throw Error('Recovery required');s=D.chooseDistillery(s,d.caskId,o.id);}
 if(s.trade.offer)s=D.declineOffer(s);
 return s;
}
export function months(s,n){for(let i=0;i<n;i++){s=resolveRegionalCareer(s);const month=s.core.month;s=D.tickDistillery(s);if(s.core.month!==month+1)throw Error('Month stopped '+month);}return resolveRegionalCareer(s);}
export function fillRegionalBatch(s){
 s=resolveRegionalCareer(s);s=D.selectFlavorCards(s,{malt:'plain',ferment:'short'});s=D.startDistillation(s);while(s.still.distillation.progress<45)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<65)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),'refill');
}
export function bottleRegionalBatch(s,age=6){s=fillRegionalBatch(s);const cid=s.core.casks.at(-1).id;s=months(s,age);return D.bottleBranded(s,cid,{});}
const fixtures=new Map();
export function naturalDeliveryFixture(seed=3){
 if(!fixtures.has(seed)){
  let s=organicCareer(D,seed,{enable:s=>D.enableRegionalDeliveries(D.enableRegionalPartners(s)),stopAtInquiry:true});
  const o=D.regionalOffers(s)[0];if(!o)throw Error('Expected an organic regional inquiry');
  s=D.acceptRegionalOffer(s,o.partnerId,o.id);s=bottleRegionalBatch(s,6);fixtures.set(seed,s);
 }
 return structuredClone(fixtures.get(seed));
}
export function sessionFor(game){
 let historyRecord,recallRecord;
 D.replayDistilleryOperations(game,({operation,index,before,after})=>{
  const state=(facts,count)=>({...facts,origin:game.origin,operations:game.operations.slice(0,count)}),next=state(after,index+1);
  historyRecord=operation?advanceHistoryRecord(state(before,index),next,historyRecord):initializeHistoryRecord(state(after,0));
  if(operation?.key==='enable-market-rules')recallRecord=initializeRecall(next);
  else if(recallRecord)recallRecord=advanceRecall(state(before,index),next,recallRecord);
 });
 return {game,userPaused:true,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:o=>D.replayDistilleryOperations(game,o)}),historyRecord,recallRecord};
}
