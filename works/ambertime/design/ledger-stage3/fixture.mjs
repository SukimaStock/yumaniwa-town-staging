import * as D from '../../partner-orders.mjs';
import {release,advance} from '../../tests/brands-helpers.mjs';
export function shopFixture(){
 let s=D.newBrandIdentityDistillery(42);
 const settle=()=>{for(const o of D.staffOpportunities(s))s=D.noticeStaffOpportunity(s,o.kind);if(s.shop.offer&&!s.shop.offer.notified)s=D.noticeShopOffer(s,s.shop.offer.shopId,s.shop.offer.id);};
 for(let i=0;i<3;i++){s=release(s,{age:6,progress:65,selection:i?{}:{bottle:'fancy',label:'cream'},tier:'low'});s=advance(s,6);settle();}
 s=release(s,{age:24,progress:65,type:'bourbon',tier:'high'});s=advance(s,1);settle();
 for(let guard=0;guard<24&&s.shop.offer?.shopId!=='department';guard++){
  if(s.shop.offer){const o=s.shop.offer;s=D.acceptShop(s,o.shopId,o.id);}else s=advance(s,1);settle();
 }
 if(s.shop.offer?.shopId!=='department')throw Error('department fixture unavailable');
 s=D.acceptShop(s,'department',s.shop.offer.id);settle();const interest=D.serializeDistillery(s),pid=s.releases.at(-1).productId;
 s=D.deliverShop(s,pid,5,'department',D.shopQuote(s,pid,'department').selectionId);settle();const pending=D.serializeDistillery(s);
 s=advance(s,1);settle();const delivered=D.serializeDistillery(s);
 for(const raw of [interest,pending,delivered])D.restoreDistillery(raw);
 return {interest:JSON.parse(interest),pending:JSON.parse(pending),delivered:JSON.parse(delivered)};
}
