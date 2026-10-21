import * as D from '../../partner-orders.mjs';import {fill,advance} from '../../tests/brands-helpers.mjs';import {shopFixture} from '../ledger-stage3/fixture.mjs';
const settle=s=>{for(const o of D.staffOpportunities(s))s=D.noticeStaffOpportunity(s,o.kind);if(s.shop.offer&&!s.shop.offer.notified)s=D.noticeShopOffer(s,s.shop.offer.shopId,s.shop.offer.id);return s;};
export function motionFixture(){
 let s=settle(D.restoreDistillery(JSON.stringify(shopFixture().delivered)));s=fill(s,{progress:65});const first=s.core.casks.at(-1).id;for(let i=0;i<4;i++)s=D.bottleBranded(s,first,{},5);s=settle(advance(s,1));s=fill(s,{progress:65});s=settle(advance(s,1));s=D.startDistillation(s);while(s.still.distillation.progress<65)s=D.distillStep(s);s=settle(s);const manual=JSON.parse(D.serializeDistillery(s));
 let auto=settle(D.restoreDistillery(JSON.stringify(shopFixture().delivered)));auto=D.hireBottlingStaff(auto);auto=fill(auto,{progress:65});auto=settle(advance(auto,1));auto=fill(auto,{progress:65});for(const c of auto.core.casks)auto=D.reserveBottling(auto,c.id,{mode:'age',age:1,count:5});auto=settle(auto);
 const automatic=JSON.parse(D.serializeDistillery(auto));D.restoreDistillery(JSON.stringify(manual));D.restoreDistillery(JSON.stringify(automatic));return {manual,automatic};
}
