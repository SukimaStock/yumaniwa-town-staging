import * as D from '../../partner-orders.mjs';
import {release,advance,fill} from '../../tests/brands-helpers.mjs';
import {shopFixture} from '../ledger-stage3/fixture.mjs';
export function uiFixture(){
 let s=D.newBrandIdentityDistillery(42);
 const settle=()=>{for(const o of D.staffOpportunities(s))s=D.noticeStaffOpportunity(s,o.kind);if(s.shop.offer&&!s.shop.offer.notified)s=D.noticeShopOffer(s,s.shop.offer.shopId,s.shop.offer.id);};
 for(let i=0;i<3;i++){s=release(s,{age:6,progress:65,selection:i?{}:{bottle:'fancy',label:'cream'},tier:'low'});s=advance(s,6);settle();}
 s=release(s,{age:24,progress:65,type:'bourbon',tier:'high'});s=advance(s,1);settle();
 for(let i=0;i<24&&s.shop.offer?.shopId!=='supermarket';i++){if(s.shop.offer)s=D.acceptShop(s,s.shop.offer.shopId,s.shop.offer.id);else s=advance(s,1);settle();}
 if(s.shop.offer?.shopId!=='supermarket')throw Error('supermarket offer fixture unavailable');
 const offer=JSON.parse(D.serializeDistillery(s));s=D.acceptShop(s,'supermarket',s.shop.offer.id);settle();const approved=JSON.parse(D.serializeDistillery(s));
 let c=D.restoreDistillery(JSON.stringify(shopFixture().delivered));c=D.hireBottlingStaff(c);c=fill(c,{progress:65});const id=c.core.casks.at(-1).id;c=advance(c,1);c=D.reserveBottling(c,id,{mode:'age',age:120,count:5});for(const o of D.staffOpportunities(c))c=D.noticeStaffOpportunity(c,o.kind);if(c.shop.offer&&!c.shop.offer.notified)c=D.noticeShopOffer(c,c.shop.offer.shopId,c.shop.offer.id);
 const storage=JSON.parse(D.serializeDistillery(c));const cooled=JSON.parse(D.serializeDistillery(D.careForCask(c,id)));
 const empty=JSON.parse(D.serializeDistillery(D.newBrandIdentityDistillery(42)));
 const states={empty,offer,approved,storage,cooled,...shopFixture()};for(const state of Object.values(states))D.restoreDistillery(JSON.stringify(state));return {...states,caskId:id};
}
