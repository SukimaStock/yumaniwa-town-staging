import * as D from '../../partner-orders.mjs';
import {fill,advance,resolve} from '../../tests/brands-helpers.mjs';
export function makeFixtures(){
const quiet=s=>{for(let i=0;i<4&&D.staffOpportunities(s).length;i++)s=D.noticeStaffOpportunity(s,D.staffOpportunities(s)[0].kind);if(s.shop.offer&&!s.shop.offer.notified)s=D.noticeShopOffer(s,s.shop.offer.shopId,s.shop.offer.id);return s;};
function newCask(){let s=D.startRangeDistillation(D.newConnectedDistillery(42));for(let i=0;i<35;i++)s=D.distillStep(s);s=D.beginCollection(s);for(let i=0;i<30;i++)s=D.distillStep(s);return quiet(D.fillBarrel(D.stopDistillation(s),'refill'));}
let normal=quiet(advance(newCask(),1));
let manual=D.startRangeDistillation(normal);
let legacy=fill(D.newFreeAgingDistillery(42),{progress:65,type:'refill'});legacy=advance(legacy,1);legacy=D.hireStaff(legacy);
let automatic=quiet(D.enableStage4(D.beginUsual(D.reserveStaff(legacy,legacy.core.casks[0].id,'once'))));
let funded=fill(D.newFreeAgingDistillery(42),{progress:65,type:'refill'});funded=advance(funded,1);funded=D.hireStaff(funded);funded=D.enableBrandIdentity(D.enableStaffExperience(D.bottleBranded(funded,funded.core.casks[0].id,{})));
funded=D.listBottles(D.setSalePrice(funded,'low',funded.result.productId),funded.result.productId);funded=advance(funded,12);
for(let i=0;i<7;i++){funded=fill(funded,{progress:65,type:'refill'});funded=advance(funded,6);funded=D.bottleBranded(funded,funded.core.casks.at(-1).id,{});funded=D.listBottles(D.setSalePrice(funded,'low',funded.result.productId),funded.result.productId);funded=advance(funded,6);while(funded.shop.offer){const o=funded.shop.offer;funded=D.declineShop(funded,o.shopId,o.id);}}
let late=quiet(D.enableStage4(funded));
for(let i=0;i<3;i++){late=D.startRangeDistillation(late);for(let n=0;n<35;n++)late=D.distillStep(late);late=D.beginCollection(late);for(let n=0;n<30;n++)late=D.distillStep(late);late=D.fillBarrel(D.stopDistillation(late),'refill');late=advance(late,1);late=quiet(late);}
let longHistory=quiet(D.enableStage4(funded));for(let i=0;i<180;i++){longHistory=resolve(longHistory);if(longHistory.shop.offer){const o=longHistory.shop.offer;longHistory=D.declineShop(longHistory,o.shopId,o.id);}const before=longHistory.core.month;longHistory=D.tickDistillery(longHistory);if(longHistory.core.month!==before+1)break;longHistory=quiet(longHistory);}
let lateAutomatic=quiet(advance(late,1));lateAutomatic=D.beginUsual(D.reserveStaff(lateAutomatic,lateAutomatic.core.casks.at(-1).id,'once'));
let filling=D.startRangeDistillation(normal);for(let n=0;n<35;n++)filling=D.distillStep(filling);filling=D.beginCollection(filling);for(let n=0;n<30;n++)filling=D.distillStep(filling);filling=D.stopDistillation(filling);
return Object.fromEntries(Object.entries({normal,manual,automatic,filling,late,lateAutomatic,longHistory}).map(([key,s])=>[key,{raw:D.serializeDistillery(s),month:s.core.month,cash:s.core.cash,operations:s.operations.length,casks:s.core.casks.length,products:s.core.products.length}]));
}
