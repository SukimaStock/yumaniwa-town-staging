// Long-play audit using public actions only; no edits to state or future values.
import * as D from '../../partner-orders.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
export const SEEDS=[1,2,3,4,5,6,7,8,9,10,42,20261015];
export const POLICIES=['retail','wholesale','special-mixed'];
const round=n=>Math.round(n*100)/100;
export function run(seed,policy,months=240){
 let s=D.newDistillery(seed),frame=0,guard=0;
 const knownProducts=new Set(),lots=new Map(),samples=[];
 const x={seed,policy,status:'ok',starts:0,fills:0,manualBottlings:0,tastings:0,ordinaryDecisions:0,contractDecisions:0,fundsDecisions:0,cancelledForFunds:0,offers:0,initialAccepted:0,declines:0,assignments:0,shipments:0,retailRevenue:0,wholesaleRevenue:0,specialRevenue:0,retailBottles:0,wholesaleBottles:0,specialBottles:0,orderOffers:0,orderAccepted:0,orderPassed:0,orderFailed:0,minimumCash:1600,minimumCashMonth:0,maxCasks:0,fullMonths:0,maxFullMonths:0,monthly:[],replayExact:false};
 let fullRun=0;
 const contract=id=>D.contractFor(s,id)!==null;
 const check=()=>{if(s.core.cash<x.minimumCash){x.minimumCash=s.core.cash;x.minimumCashMonth=s.core.month;}const t=s.core.totals;if(round(s.core.cash-(1600+t.revenue-t.costs-t.upkeep))!==0)throw Error('Cash identity mismatch');};
 const collect=()=>{for(const p of s.core.products)if(!knownProducts.has(p.id)){knownProducts.add(p.id);if(!s.records.some(r=>r.productId===p.id))throw Error('Missing completed record');}};
 const list=()=>{for(const p of s.core.products.filter(p=>p.stock>0&&!s.productsById[p.id]?.listed)){s=D.setSalePrice(s,'standard',p.id);s=D.listBottles(s,p.id);}};
 const taste=id=>{s=D.sampleDistillery(s,id);x.tastings++;s=D.endTasting(s);};
 const bottle=id=>{s=D.bottleNow(s,id);x.manualBottlings++;collect();list();check();};
 const wanted=c=>policy==='wholesale'||policy==='special-mixed'&&(lots.get(c.id)??0)%2===1;
 try{while(s.core.month<months&&guard++<100000){
  check();collect();
  if(s.decisions.length){const d=s.decisions[0];taste(d.caskId);
   if(d.eventId==='order-unmet'){x.orderFailed++;s=D.chooseDistillery(s,d.caskId,'order-retail');}
   else if(d.eventId==='funds'){x.fundsDecisions++;if(contract(d.caskId)){s=D.cancelContract(s,d.caskId);x.cancelledForFunds++;}bottle(d.caskId);}
   else{x.ordinaryDecisions++;if(contract(d.caskId))x.contractDecisions++;const option=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');if(option)s=D.chooseDistillery(s,d.caskId,option.id);else{if(contract(d.caskId)){s=D.cancelContract(s,d.caskId);x.cancelledForFunds++;}bottle(d.caskId);}}
   continue;
  }
  if(s.trade.offer){x.offers++;const o=s.trade.offer;
   if(o.kind==='initial'){if(policy==='retail'||x.manualBottlings<2){s=D.declineOffer(s);x.declines++;}else{s=D.acceptOffer(s);x.initialAccepted++;}}
   else if(o.kind==='special'){x.orderOffers++;if(policy==='special-mixed'){s=D.acceptOffer(s);x.orderAccepted++;}else{s=D.declineOffer(s);x.declines++;}}
   else {s=D.declineOffer(s);x.declines++;}
   continue;
  }
  list();
  if(policy==='special-mixed'&&s.trade.order?.status==='accepted'&&s.trade.order.caskId===null){const candidates=D.orderCandidates(s);if(candidates.length){s=D.assignOrder(s,candidates[0].id);continue;}}
  const bootstrap=x.manualBottlings<2;
  const due=s.core.casks.find(c=>!contract(c.id)&&c.age>=(bootstrap?6:(lots.get(c.id)%2?18:24)));
  if(due){taste(due.id);bottle(due.id);continue;}
  if(!bootstrap&&s.trade.relationship?.status==='active'){
   const terms=s.trade.relationship.terms;
   const valid=terms.flatMap(t=>D.contractCandidates(s,t).filter(wanted).map(c=>({t,c})));
   if(valid.length){const {t,c}=valid[0];s=D.assignCask(s,c.id,t.id);x.assignments++;continue;}
  }
  for(const c of s.core.casks)if(c.age>0&&c.age%6===0&&s.notesById[c.id].samples.at(-1)?.age!==c.age)taste(c.id);
  if(s.still.phase==='ready'&&s.core.casks.length<(bootstrap?1:4)&&D.canStart(s).ok){s=D.startDistillation(s);x.starts++;check();continue;}
  if(s.still.phase==='distilling'&&s.still.distillation.progress>=65){s=D.stopDistillation(s);continue;}
  if(s.still.phase==='filling'){s=D.fillBarrel(s,x.fills%2?'bourbon':'refill');x.fills++;lots.set(s.core.casks.at(-1).id,x.fills);x.maxCasks=Math.max(x.maxCasks,s.core.casks.length);check();continue;}
  if(s.still.phase==='distilling')s=D.distillStep(s);
  if(++frame<60)continue;frame=0;
  const before=s.core.month;s=D.tickDistillery(s);
  if(s.core.month===before){if(s.decisions.length)continue;throw Error('Month stalled without a decision');}
  check();collect();
  for(const sale of s.core.lastMonth.sales){const record=s.records.find(r=>r.productId===sale.id),special=sale.channel==='special'||record?.order?.outcome==='fulfilled';const category=special?'special':sale.channel==='wholesale'?'wholesale':'retail';if(special)x.orderPassed++; x[category+'Revenue']=round(x[category+'Revenue']+sale.revenue);x[category+'Bottles']+=sale.sold;}
  const shipped=s.trade.lastShipments;x.shipments+=shipped.length;
  if(shipped.length&&samples.length<6)samples.push({month:s.core.month,shipments:structuredClone(shipped),relationshipRemains:!!s.trade.relationship});
  if(s.core.casks.length===4){x.fullMonths++;fullRun++;}else fullRun=0;x.maxFullMonths=Math.max(x.maxFullMonths,fullRun);
  const t=s.core.totals;if(s.core.month%12===0)x.monthly.push({month:s.core.month,cash:s.core.cash,revenue:t.revenue,costs:t.costs,upkeep:t.upkeep,casks:s.core.casks.length,contracts:s.trade.contracts.length,shipments:x.shipments,funds:x.fundsDecisions});
 }
 if(s.core.month!==months)throw Error('Simulation guard reached');
 const text=D.serializeDistillery(s);x.replayExact=JSON.stringify(D.restoreDistillery(text))===text;if(!x.replayExact)throw Error('Replay mismatch');
 }catch(e){x.status='failed';x.error=e.stack;}
 const t=s.core.totals;Object.assign(x,{month:s.core.month,cash:s.core.cash,revenue:t.revenue,costs:t.costs,upkeep:t.upkeep,profit:round(t.revenue-t.costs-t.upkeep),stock:s.core.products.reduce((n,p)=>n+p.stock,0),stockAskingValue:round(s.core.products.reduce((n,p)=>n+p.stock*p.price,0)),partner:s.trade.relationship?.partner??null,cashIdentityDelta:round(s.core.cash-(1600+t.revenue-t.costs-t.upkeep)),revenueChannelDelta:round(t.revenue-x.retailRevenue-x.wholesaleRevenue-x.specialRevenue),recordedOperations:s.operations.length,shipmentExamples:samples});return x;
}
if(!isMainThread){const runs=SEEDS.map(seed=>{const r=run(seed,workerData.policy);console.log(JSON.stringify({policy:workerData.policy,seed,status:r.status,month:r.month,cash:r.cash,partner:r.partner,shipments:r.shipments,orders:r.orderAccepted,error:r.error?.split('\n')[0]}));return r;});parentPort.postMessage(runs);}
else if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const hashes={};for(const file of ['partner-orders.mjs','partner-parameters.mjs','economy.mjs','economy-parameters.mjs','model.mjs','monthly.mjs','character.mjs'])hashes[file]=createHash('sha256').update(await readFile(new URL('../../'+file,import.meta.url))).digest('hex');
 const runs=(await Promise.all(POLICIES.map(policy=>new Promise((resolve,reject)=>{const worker=new Worker(new URL(import.meta.url),{workerData:{policy}});worker.once('message',resolve);worker.once('error',reject);} )))).flat();
 const result={method:{seeds:SEEDS,months:240,initialCash:1600,extractionStopProgress:65,extractionFramesPerMonth:60,bootstrap:'Two sequential age6 retail batches',retail:'Standard prices; unassigned odd lot age18/even lot age24',wholesale:'Accept first relationship after bootstrap; explicitly assign eligible casks',specialMixed:'Odd lots wholesale; even lots retail; accept optional orders when naturally offered',judgments:'Sample, wait/last; funds chosen cask explicitly unassigned then bottled',information:'Current age, fixed offered terms and actual tasting only; no future chemistry/price or optimum used',humanExperience:'No human enjoyment/touch claim; frame count is not measured human playtime',sourceSha256:hashes},runs};
 await writeFile(new URL('simulation-results.json',import.meta.url),JSON.stringify(result)+'\n');
 if(runs.some(r=>r.status!=='ok'||!r.replayExact||r.cashIdentityDelta!==0||r.revenueChannelDelta!==0))process.exitCode=1;
}
