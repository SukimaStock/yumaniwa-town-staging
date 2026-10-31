// Lawful native progression only. No projection edits, invented receipts or save patches.
import fs from 'node:fs';
import * as D from '../partner-orders.mjs';
import {advance,resolve} from './brands-helpers.mjs';
export function departmentAuditStates(){
 const raw=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
 let s=D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(raw)));
 const states={before:s};
 s=resolve(s);s=D.startRangeDistillation(s);while(s.still.distillation.progress<40)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<65)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'refill');
 const cid=s.core.casks.at(-1).id;s=advance(s,24);s=D.bottleBranded(s,cid,{},12);const productId=s.result.productId;s=advance(s,1);s=D.setMarketRetail(s,{productId,count:1});
 if(s.shop.offer?.shopId!=='department'||!D.shopOfferQuote(s,productId,'department').ok)throw Error('Expected lawful department offer');
 states.offered=s;s=D.acceptShopDelivery(s,productId,5,'department',s.shop.offer.id);states.pending=s;s=advance(s,1);states.settled=s;s=advance(s,13);states.expired=s;
 return states;
}
