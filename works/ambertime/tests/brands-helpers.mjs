import * as D from '../partner-orders.mjs';
export function resolve(s){let limit=0;while(s.decisions.length){if(++limit>20)throw Error('decision loop');const d=s.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');if(!o)throw Error('Recovery required: '+d.eventId);s=D.chooseDistillery(s,d.caskId,o.id);}if(s.trade.offer)s=D.declineOffer(s);return s;}
export function advance(s,months){for(let i=0;i<months;i++){s=resolve(s);const before=s.core.month;s=D.tickDistillery(s);if(s.core.month!==before+1)throw Error('Month did not advance');}return resolve(s);}
export function fill(s,{progress=60,type='refill'}={}){s=resolve(s);s=D.startDistillation(s);while(s.still.distillation.progress<progress)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),type);}
export function release(s,{age=6,selection={},tier='standard',progress=60,type='refill'}={}){s=fill(s,{progress,type});const id=s.core.casks.at(-1).id;s=advance(s,age);s=D.bottleBranded(s,id,selection);const productId=s.result.productId;s=D.setSalePrice(s,tier,productId);return D.listBottles(s,productId);}
export const exact=s=>D.restoreDistillery(D.serializeDistillery(s));
