import * as D from '../../wholesale.mjs';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
const round=x=>Math.round(x*100)/100;
export function run(seed,policy='accept',months=240){let s=D.newDistillery(seed),elapsed=0,offers=0,declines=0,contracts=0,cancelled=0,blocked=0,minCash=1600,maxCasks=0,maxOfferQueue=0;const offered=[],shipped=[],snapshots=[];let started=0;
 for(let frame=0;s.core.month<months&&frame<months*120+10000;frame++){
  while(s.decisions.length){const d=s.decisions[0];if(d.eventId==='funds'&&s.trade.contract?.caskId===d.caskId){s=D.cancelContract(s);cancelled++;}const o=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');if(d.eventId!=='funds'&&o)s=D.chooseDistillery(s,d.caskId,o.id);else{s=D.bottleNow(s,d.caskId);s=D.listBottles(s,s.result.productId);}}
  if(s.trade.offer){offers++;offered.push({...s.trade.offer});const candidates=D.contractCandidates(s);maxOfferQueue=Math.max(maxOfferQueue,1);if(policy==='accept'&&candidates.length){s=D.acceptOffer(s,candidates[0].id);contracts++;s=D.endTasting(D.sampleDistillery(s,candidates[0].id));}else{s=D.declineOffer(s);declines++;}}
  for(const c of [...s.core.casks]){if(s.trade.contract?.caskId!==c.id&&c.age>=(policy==='expand'?18:12)){s=D.bottleNow(s,c.id);s=D.listBottles(s,s.result.productId);}}
  if(s.still.phase==='ready'&&s.core.casks.length<(policy==='expand'?4:2)&&D.canStart(s).ok){s=D.startDistillation(s);started++;}
  s=D.distillStep(s);
  if(s.still.phase==='distilling'&&s.still.distillation.progress>=70){s=D.stopDistillation(s);try{s=D.fillBarrel(s,started%2?'refill':'bourbon');}catch(e){s=D.fillBarrel(s,'refill');}}
  maxCasks=Math.max(maxCasks,s.core.casks.length);minCash=Math.min(minCash,s.core.cash);elapsed++;
  if(elapsed>=60){elapsed=0;const before=s.core.month;s=D.tickDistillery(s);if(s.core.month===before&&!s.decisions.length){blocked++;break;}if(s.trade.lastShipment?.month===s.core.month)shipped.push({...s.trade.lastShipment});if([12,36,60,120,240].includes(s.core.month))snapshots.push({month:s.core.month,cash:s.core.cash,revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep});}
 }
 const difference=round(s.core.cash-(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep));if(difference!==0)throw Error('cash mismatch '+difference);
 const text=D.serializeDistillery(s);if(D.serializeDistillery(D.restoreDistillery(text))!==text)throw Error('replay mismatch');
 return {seed,policy,month:s.core.month,cash:s.core.cash,revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep,minCash,maxCasks,started,offers,declines,contracts,cancelled,shipped,offered,blocked,maxOfferQueue,snapshots,save:s};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const rows=[];for(const policy of ['accept','decline','expand'])for(const seed of [1,2,3,4,5,6,7,8,9,10,42,20261016]){const r=run(seed,policy);delete r.save;rows.push(r);console.log(policy,seed,r.month,r.cash,r.offers,r.shipped.length);fs.writeFileSync(new URL('./simulation-results.json',import.meta.url),JSON.stringify(rows,null,2));}fs.writeFileSync(new URL('./simulation-results.json',import.meta.url),JSON.stringify(rows,null,2));}
