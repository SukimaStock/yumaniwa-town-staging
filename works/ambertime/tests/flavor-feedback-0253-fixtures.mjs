// Legal public operations only; independent verification environment, never game imports.
import * as D from '../partner-orders.mjs';
import {customerComments} from '../player-news.mjs';
export function feedbackFixtures(){
 const quiet=s=>{for(const o of D.staffOpportunities(s))s=D.noticeStaffOpportunity(s,o.kind);if(s.shop.offer&&!s.shop.offer.notified)s=D.noticeShopOffer(s,s.shop.offer.shopId,s.shop.offer.id);if(s.trade.offer)s=D.declineOffer(s);return s;};
 const tick=(s,n=1)=>{for(let i=0;i<n;i++){const m=s.core.month;s=quiet(D.tickDistillery(s));if(s.core.month!==m+1)throw Error('fixture month blocked');}return s;};
 const fill=(s,i=0)=>{s=D.selectFlavorCards(s,{malt:i%2?'peat':'plain',ferment:'long'});s=D.startRangeDistillation(s);while(s.still.distillation.progress<12)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<(i%2?90:40))s=D.distillStep(s);return quiet(D.fillBarrel(D.stopDistillation(s),i%2?'refill':'bourbon'));};
 let s=quiet(D.newConnectedDistillery(42));const initial=D.serializeDistillery(s);
 for(let i=0;i<10;i++){
  s=fill(s,i);s=D.bottleBranded(s,s.core.casks.at(-1).id,{});const pid=s.result.productId;s=D.listBottles(D.setSalePrice(s,'low',pid),pid);
  for(let n=0;n<36&&s.core.products.some(p=>p.id===pid&&p.stock>0);n++)s=tick(s);
 }
 const comments=customerComments(s);if(!comments.length)throw Error('no factual retail comment');
 const sales=D.serializeDistillery(s);s=quiet(D.hireStaff(s));for(let i=0;i<3;i++){s=fill(s,i);s=tick(s);}
 const liveIds=s.core.casks.map(c=>c.id),early=D.serializeDistillery(tick(s,6));s=tick(s,48);
 const beforeTaste=s;let tasted=D.endTasting(D.sampleDistillery(s,liveIds[0]));tasted=tick(tasted,12);s=tick(beforeTaste,12);
 const aging=D.serializeDistillery(s),previous=D.serializeDistillery(tasted);
 let auto=quiet(D.hireBottlingStaff(s));auto=D.reserveBottling(auto,liveIds[0],{mode:'age',age:auto.core.casks[0].age+1,count:10});auto=tick(auto);const automatic=D.serializeDistillery(auto);
 return {initial,sales,early,aging,previous,automatic,comments,liveIds,seed:42};
}
