// Audit only. Public actions, current age/price/quote and actual tasting; no state edits.
import * as D from '../../trade.mjs';
import * as OLD from '../../wholesale.mjs';
import {createHash} from 'node:crypto';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {readFile,writeFile} from 'node:fs/promises';
const seeds=[1,2,3,4,5,6,7,8,9,10,42,20261016],policies=['retail','mixed','wholesale','v081-single'];
const months=240,round=n=>Math.round(n*100)/100,monthly=[];
export function run(seed,policy){
 const api=policy==='v081-single'?OLD:D,old=api===OLD;
 let s=api.newDistillery(seed),frame=0,guard=0,fullRun=0,blockedRun=0;
 const lots=new Map(),knownProducts=new Set(),knownCasks=new Set();
 const x={seed,policy,status:'ok',starts:0,fills:0,manualBottlings:0,tastings:0,contractTastings:0,ordinaryDecisions:0,contractDecisions:0,fundsDecisions:0,contractCancelledForFunds:0,offers:0,initialAccepted:0,proposals:0,termsAccepted:0,declines:0,assignments:0,shipments:0,wholesaleBottles:0,retailBottles:0,retailRevenue:0,wholesaleRevenue:0,bottledBottles:0,ageBottleMonths:0,fullMonths:0,maxFullMonths:0,maxStartBlockedMonths:0,maxCasks:0,minimumCash:1600,minimumCashMonth:0,slotsFreedByShipment:0,replayExact:false,snapshots:[],shipmentExamples:[],contractJudgmentExamples:[],fundsExamples:[]};
 const contract=id=>old?s.trade.contract?.caskId===id:D.contractFor(s,id)!==null;
 const minimum=()=>{if(s.core.cash<x.minimumCash){x.minimumCash=s.core.cash;x.minimumCashMonth=s.core.month;}};
 const checkLedger=()=>{minimum();const t=s.core.totals,delta=round(s.core.cash-(1600+t.revenue-t.costs-t.upkeep));if(delta!==0)throw Error('Cash identity '+delta);};
 const collectProducts=()=>{for(const p of s.core.products){if(knownProducts.has(p.id))continue;knownProducts.add(p.id);const r=s.records.find(r=>r.productId===p.id);if(!r)throw Error('Missing completion record');x.bottledBottles+=r.bottles;x.ageBottleMonths+=r.age*r.bottles;}};
 const list=()=>{for(const p of s.core.products.filter(p=>p.stock>0&&!s.productsById[p.id]?.listed)){s=api.setSalePrice(s,'standard',p.id);s=api.listBottles(s,p.id);}};
 const taste=id=>{if(contract(id))x.contractTastings++;s=api.sampleDistillery(s,id);x.tastings++;s=api.endTasting(s);};
 const bottle=id=>{if(contract(id))throw Error('Manual bottle without explicit unassignment');s=api.bottleNow(s,id);x.manualBottlings++;collectProducts();list();checkLedger();};
 // Policy chooses an offered age nearest 18/24 months, never a forecast price or chemistry.
 const pickTerm=terms=>terms.slice().sort((a,b)=>Math.abs(a.targetAge-(x.assignments%2?24:18))-Math.abs(b.targetAge-(x.assignments%2?24:18))||a.targetAge-b.targetAge)[0];
 const wholesaleWanted=c=>policy==='wholesale'||policy==='v081-single'||policy==='mixed'&&(lots.get(c.id)??0)%2===1;
 try{while(s.core.month<months&&guard++<100000){
  checkLedger();collectProducts();
  if(s.decisions.length){const d=s.decisions[0];taste(d.caskId);
   if(d.eventId==='funds'){x.fundsDecisions++;if(x.fundsExamples.length<3)x.fundsExamples.push({month:s.core.month,caskId:d.caskId,contract:contract(d.caskId),cash:s.core.cash});if(contract(d.caskId)){s=old?api.cancelContract(s):api.cancelContract(s,d.caskId);x.contractCancelledForFunds++;}bottle(d.caskId);}
   else{x.ordinaryDecisions++;if(contract(d.caskId)){x.contractDecisions++;if(x.contractJudgmentExamples.length<3)x.contractJudgmentExamples.push({month:s.core.month,id:d.caskId,event:d.eventId});}const option=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');if(option)s=api.chooseDistillery(s,d.caskId,option.id);else{if(contract(d.caskId)){s=old?api.cancelContract(s):api.cancelContract(s,d.caskId);x.contractCancelledForFunds++;}bottle(d.caskId);}}
   continue;
  }
  if(s.trade.offer){x.offers++;const o=s.trade.offer;
   if(!old&&o.kind==='terms'){x.proposals++;if(policy!=='retail'&&x.proposals%2===1){s=D.acceptOffer(s);x.termsAccepted++;}else{s=api.declineOffer(s);x.declines++;}}
   else if(policy==='retail'||x.manualBottlings<2){s=api.declineOffer(s);x.declines++;}
   else{const terms=old?[o]:o.terms,valid=terms.flatMap(t=>api.contractCandidates(s,t).filter(wholesaleWanted).map(c=>({t,c}))),chosen=valid.find(v=>v.t===pickTerm(valid.map(v=>v.t)));
    if(chosen){s=old?api.acceptOffer(s,chosen.c.id):api.acceptOffer(s,chosen.c.id,chosen.t.id);x.initialAccepted++;x.assignments++;}else{s=api.declineOffer(s);x.declines++;}}
   continue;
  }
  list();
  // First two batches are deliberately retail, one at a time, at age 6.
  const bootstrap=x.manualBottlings<2;
  const due=s.core.casks.find(c=>!contract(c.id)&&c.age>=(bootstrap?6:(lots.get(c.id)%2?18:24)));
  if(due){taste(due.id);bottle(due.id);continue;}
  if(!old&&!bootstrap&&s.trade.relationship?.status==='active'){
   const terms=s.trade.relationship.terms,valid=terms.flatMap(t=>D.contractCandidates(s,t).filter(wholesaleWanted).map(c=>({t,c}))),chosen=valid.find(v=>v.t===pickTerm(valid.map(v=>v.t)));
   if(chosen){s=D.assignCask(s,chosen.c.id,chosen.t.id);x.assignments++;continue;}
  }
  for(const c of s.core.casks)if(c.age>0&&c.age%6===0&&s.notesById[c.id].samples.at(-1)?.age!==c.age)taste(c.id);
  if(s.still.phase==='ready'&&s.core.casks.length<(bootstrap?1:4)&&api.canStart(s).ok){s=api.startDistillation(s);x.starts++;minimum();continue;}
  if(s.still.phase==='distilling'&&s.still.distillation.progress>=80){s=api.stopDistillation(s);continue;}
  if(s.still.phase==='filling'){s=api.fillBarrel(s,x.fills%2?'bourbon':'refill');x.fills++;const c=s.core.casks.at(-1);if(knownCasks.has(c.id))throw Error('Repeated cask ID');knownCasks.add(c.id);lots.set(c.id,x.fills);x.maxCasks=Math.max(x.maxCasks,s.core.casks.length);checkLedger();continue;}
  if(s.still.phase==='distilling')s=api.distillStep(s);
  if(++frame<60)continue;frame=0;
  const before=s.core.month,previousCasks=s.core.casks.length;s=api.tickDistillery(s);
  if(s.core.month===before){if(s.decisions.length)continue;throw Error('Month stalled without recoverable decision');}
  checkLedger();collectProducts();
  for(const sale of s.core.lastMonth.sales){const p=s.core.products.find(p=>p.id===sale.id),wholesale=sale.channel==='wholesale';if(wholesale){x.wholesaleRevenue=round(x.wholesaleRevenue+sale.revenue);x.wholesaleBottles+=sale.sold;}else{x.retailRevenue=round(x.retailRevenue+sale.revenue);x.retailBottles+=sale.sold;}if(!p)throw Error('Missing sold product');}
  const shipped=old?(s.trade.lastShipment?.month===s.core.month?[s.trade.lastShipment]:[]):s.trade.lastShipments;
  x.shipments+=shipped.length;x.slotsFreedByShipment+=shipped.length;
  if(shipped.length&&x.shipmentExamples.length<4)x.shipmentExamples.push({month:s.core.month,previousCasks,shipments:structuredClone(shipped),relationshipRemains:old?false:s.trade.relationship!==null});
  const full=s.core.casks.length===4,check=api.canStart(s),blocked=s.still.phase==='ready'&&!check.ok;
  if(full){x.fullMonths++;fullRun++;}else fullRun=0;x.maxFullMonths=Math.max(x.maxFullMonths,fullRun);
  if(blocked)blockedRun++;else blockedRun=0;x.maxStartBlockedMonths=Math.max(x.maxStartBlockedMonths,blockedRun);
  const t=s.core.totals,stock=s.core.products.filter(p=>p.stock>0),row={seed,policy,month:s.core.month,cash:s.core.cash,revenue:t.revenue,retailRevenue:x.retailRevenue,wholesaleRevenue:x.wholesaleRevenue,costs:t.costs,upkeep:t.upkeep,profit:round(t.revenue-t.costs-t.upkeep),casks:s.core.casks.length,contracts:old?Number(!!s.trade.contract):s.trade.contracts.length,litres:round(s.core.casks.reduce((n,c)=>n+c.litres,0)),retailStock:stock.reduce((n,p)=>n+p.stock,0),retailAskingValue:round(stock.reduce((n,p)=>n+p.stock*p.price,0)),deliveries:x.shipments,starts:x.starts,decisions:x.ordinaryDecisions,funds:x.fundsDecisions};
  monthly.push(row);if([12,36,60,120,240].includes(s.core.month))x.snapshots.push(row);
 }
 if(s.core.month!==months)throw Error('Simulation guard reached');
 const text=api.serializeDistillery(s);x.replayExact=JSON.stringify(api.restoreDistillery(text))===text;if(!x.replayExact)throw Error('Replay mismatch');
 }catch(e){x.status='failed';x.error=e.stack;}
 const t=s.core.totals;x.month=s.core.month;x.cash=s.core.cash;x.revenue=t.revenue;x.costs=t.costs;x.upkeep=t.upkeep;x.expenses=round(t.costs+t.upkeep);x.profit=round(t.revenue-x.expenses);x.stock=s.core.products.reduce((n,p)=>n+p.stock,0);x.stockAskingValue=round(s.core.products.reduce((n,p)=>n+p.stock*p.price,0));x.remainingLitres=round(s.core.casks.reduce((n,c)=>n+c.litres,0));x.averageBottledAge=x.bottledBottles?round(x.ageBottleMonths/x.bottledBottles):0;x.averageSoldPrice=(x.wholesaleBottles+x.retailBottles)?round(t.revenue/(x.wholesaleBottles+x.retailBottles)):0;x.cashIdentityDelta=round(s.core.cash-(1600+t.revenue-t.costs-t.upkeep));x.revenueChannelDelta=round(t.revenue-x.retailRevenue-x.wholesaleRevenue);x.recordedOperations=s.operations.length;return x;
}
if(!isMainThread){const runs=[];for(const seed of seeds){const r=run(seed,workerData.policy);runs.push(r);console.log(JSON.stringify({policy:workerData.policy,seed,status:r.status,month:r.month,cash:r.cash,shipments:r.shipments,funds:r.fundsDecisions,replay:r.replayExact,error:r.error?.split('\n')[0]}));}parentPort.postMessage({runs,monthly});}
else {
const hashes={};for(const file of ['trade.mjs','trade-parameters.mjs','wholesale.mjs','wholesale-parameters.mjs','economy.mjs','economy-parameters.mjs','model.mjs','monthly.mjs','character.mjs'])hashes[file]=createHash('sha256').update(await readFile(new URL('../../'+file,import.meta.url))).digest('hex');
const results=await Promise.all(policies.map(policy=>new Promise((resolve,reject)=>{const worker=new Worker(new URL(import.meta.url),{workerData:{policy}});worker.once('message',resolve);worker.once('error',reject);})));const runs=results.flatMap(r=>r.runs);monthly.push(...results.flatMap(r=>r.monthly));
await writeFile(new URL('balance-results.json',import.meta.url),JSON.stringify({method:{seeds,months,initialCash:1600,extractStop:80,framesPerMonth:60,retailPrice:'standard',bootstrap:'Two sequential age-6 retail batches',afterBootstrap:'Four slots where affordable; alternating refill/bourbon; unassigned odd lot age18/even lot24',assignment:'retail: none; mixed: odd lot only; wholesale: any explicitly assigned; v081-single: accept a fresh one-cask offer when available',terms:'Nearest offered age to alternating18/24 goal, lower age tie-break; accept alternating repeat proposals, decline others',judgments:'Taste, end, wait/last; funds bottle its selected unassigned cask; cancel assigned target only as last recourse',sampling:'Six-month intervals and all ordinary judgments/manual bottlings',information:'Current public age, quoted cost, offered fixed terms, price tier, tasting; no future chemistry, optimum or hidden quality used',time:'60 extraction frames/shared month, not instant completed distillation; zero-time choices are not a human play duration estimate',sourceSha256:hashes},runs},null,2)+'\n');
const columns=Object.keys(monthly[0]);await writeFile(new URL('balance-results.csv',import.meta.url),columns.join(',')+'\n'+monthly.map(r=>columns.map(k=>JSON.stringify(r[k])).join(',')).join('\n')+'\n');
if(runs.some(r=>r.status!=='ok'||!r.replayExact||r.cashIdentityDelta!==0||r.revenueChannelDelta!==0))process.exitCode=1;

}
