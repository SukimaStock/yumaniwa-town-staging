import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
import {automaticEvents} from '../event-notices.mjs';
export const BASE='8fab526aec22a83b73147225c99e88e48188586e';
export const hash=value=>createHash('sha256').update(value).digest('hex');
// Public operations only. Keep the operation schedule explicit; do not resolve
// unknown prompts or regenerate the fixture when an assertion changes.
export function formalTraces(){
 const traces=[];
 function career(name,initial){let s=initial;const rows=[],raws=[];
  function record(label,before){const raw=D.serializeDistillery(s);raws.push(raw);rows.push({label,sha256:hash(raw),operationCount:s.operations.length,operationsSha256:hash(JSON.stringify(s.operations)),rngState:s.core.rngState,month:s.core.month,cash:s.core.cash,stock:s.core.products.map(p=>({id:p.id,stock:p.stock,sold:p.sold})),phase:s.still.phase,reservation:s.usual?.reservation?.status??null,decisions:s.decisions.map(d=>({id:d.caskId,event:d.eventId})),events:before?automaticEvents(before,s):[]});}
  record('initial');const api={get state(){return s;},step(label,fn){const before=s,raw=D.serializeDistillery(s);s=fn(s);if(D.serializeDistillery(before)!==raw)throw Error(name+' mutated '+label);record(label,before);},finish(){traces.push({name,rows,raws});}};return api;
 }
 const manual=career('manual-cut-seed42',D.selectFlavorCards(D.newMarketRulesDistillery(42),{malt:'plain',ferment:'short'}));
 manual.step('start',D.startRangeDistillation);
 for(let n=1;n<=20;n++)manual.step('distill-before-collection-'+n,D.distillStep);
 manual.step('collection-start',D.beginCollection);
 for(let n=21;n<=35;n++)manual.step('distill-collecting-'+n,D.distillStep);
 manual.step('collection-stop',D.stopDistillation);manual.step('fill-refill',s=>D.fillBarrel(s,'refill'));manual.step('bottle-five',s=>D.bottleBranded(s,s.core.casks.at(-1).id,{},5));manual.finish();
 const staff=career('staff-monthly-seed42',D.newStaffDistillery(42));staff.step('start',D.startDistillation);
 for(let n=1;n<=35;n++)staff.step('manual-step-'+n,D.distillStep);
 staff.step('stop',D.stopDistillation);staff.step('fill',s=>D.fillBarrel(s,'refill'));staff.step('month-before-hire',D.tickDistillery);staff.step('hire',D.hireStaff);staff.step('reserve-once',s=>D.reserveStaff(s,s.core.casks[0].id));staff.step('begin-auto',D.beginUsual);
 for(let n=1;staff.state.usual.reservation;n++){if(n>99)throw Error('staff completion limit');staff.step('auto-step-'+n,D.distillStep);}
 staff.step('month-after-auto',D.tickDistillery);staff.finish();
 const old=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
 const market=career('market-adoption-monthly',D.restoreDistillery(old));market.step('adopt-store',D.enableStoreMarket);market.step('adopt-rules',D.enableMarketRules);const id=market.state.result.productId;
 market.step('retail-one',s=>D.setMarketRetail(s,{productId:id,count:1}));market.step('shop-five',s=>D.assignStoreProduct(s,{productId:id,shopId:'town-liquor',count:5}));
 for(let n=1;n<=4;n++)market.step('month-'+n,D.tickDistillery);market.finish();return traces;
}
