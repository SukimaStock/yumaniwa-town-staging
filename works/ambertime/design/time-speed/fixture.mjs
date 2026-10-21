import * as D from '../../partner-orders.mjs';
import {fill,advance} from '../../tests/brands-helpers.mjs';
import {shopFixture} from '../ledger-stage3/fixture.mjs';
const upgrade=s=>D.enableBrandIdentity(D.enableStaffExperience(s));
const settle=s=>{for(const o of D.staffOpportunities(s))s=D.noticeStaffOpportunity(s,o.kind);if(s.shop.offer&&!s.shop.offer.notified)s=D.noticeShopOffer(s,s.shop.offer.shopId,s.shop.offer.id);const g=D.generationStatus(s);if(g.needsNotice)s=D.noticeGeneration(s,g.id);return s;};
export function speedFixture(){
 let s=fill(D.newFreeAgingDistillery(42),{progress:65}),id=s.core.casks[0].id;
 s=D.bottleBranded(s,id,{},1);s=D.hireBottlingStaff(s);s=D.reserveBottling(s,id,{mode:'age',age:1,count:10});s=advance(s,1);s=D.hireStaff(s);s=D.reserveStaff(s,id,'once');s=D.reserveBottling(s,id,{mode:'age',age:2,count:10});s=settle(upgrade(s));const automatic=s;
 let funds=fill(D.newBottlingRolesDistillery(42),{progress:65});id=funds.core.casks[0].id;funds=D.bottleBranded(funds,id,{},1);funds=D.hireBottlingStaff(funds);funds=D.reserveBottling(funds,id,{mode:'age',age:1200,count:1});let found=false;
 for(let i=0;i<130;i++){const next=D.tickDistillery(funds);if(next.decisions.some(d=>d.eventId==='funds')){found=true;break;}funds=next;}if(!found)throw Error('funds fixture');funds=settle(upgrade(funds));
 let generation=settle(D.restoreDistillery(JSON.stringify(shopFixture().delivered)));generation=settle(advance(generation,299-generation.core.month));generation=fill(generation,{progress:65});generation=settle(advance(generation,1));generation=D.bottleBranded(generation,generation.core.casks.at(-1).id,{},5);generation=settle(generation);generation=settle(advance(generation,11));
 const states={automatic,pending:settle(shopFixture().pending),funds,generation};
 for(const [key,state]of Object.entries(states)){states[key]=JSON.parse(D.serializeDistillery(state));D.restoreDistillery(JSON.stringify(states[key]));}return states;
}
