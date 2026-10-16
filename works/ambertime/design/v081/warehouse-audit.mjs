// Audit only: run `node works/ambertime/design/v081/warehouse-audit.mjs`.
// Uses current public actions; no state edits, hidden chemistry or future values.
import * as W from '../../wholesale.mjs';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const seeds=[1,2,3,4,5,6,7,8,9,10,42,20261016], rows=[],monthly=[];
const round=x=>Math.round(x*100)/100;
function run(seed,policy){
 let s=W.newDistillery(seed),frame=0,guard=0,fullRun=0,maxFull=0,blockedRun=0,maxBlocked=0;
 const stats={seed,policy,status:'ok',starts:0,stops:0,fills:0,tastings:0,tastingEnds:0,decisions:0,funds:0,choices:0,bottlings:0,prices:0,listings:0,offers:0,accepted:0,declined:0,cancelledForFunds:0,contractTastings:0,contractJudgments:0,maximumDecisionQueue:0,startMonths:[],fullMonths:0,maxFullMonths:0,maxStartBlockedMonths:0,blockedReasons:{},fullDecisionMonths:[],fullTastingMonths:[],fullRetailBottleMonths:[],shipments:[],firstFullMonth:null,minimumCash:s.core.cash};
 const list=()=>{for(const p of s.core.products.filter(p=>p.stock>0&&!s.productsById[p.id]?.listed)){s=W.setSalePrice(s,'standard',p.id);stats.prices++;s=W.listBottles(s,p.id);stats.listings++;}};
 const taste=id=>{if(s.trade.contract?.caskId===id)stats.contractTastings++;s=W.sampleDistillery(s,id);stats.tastings++;if(s.core.casks.length===4)stats.fullTastingMonths.push(s.core.month);s=W.endTasting(s);stats.tastingEnds++;};
 const bottle=id=>{if(s.trade.contract?.caskId===id)throw Error('Policy cannot manually bottle its contract.');if(s.core.casks.length===4)stats.fullRetailBottleMonths.push(s.core.month);s=W.bottleNow(s,id);stats.bottlings++;list();};
 try{while(s.core.month<120&&guard++<20000){
   stats.minimumCash=Math.min(stats.minimumCash,s.core.cash);
   // Resolve the FIFO judgment queue. Contracts keep ordinary wait choices.
   if(s.decisions.length){stats.maximumDecisionQueue=Math.max(stats.maximumDecisionQueue,s.decisions.length);const d=s.decisions[0];stats.decisions++;if(d.caskId===s.trade.contract?.caskId)stats.contractJudgments++;if(s.core.casks.length===4)stats.fullDecisionMonths.push(s.core.month);taste(d.caskId);
     const ids=d.pending.options.map(o=>o.id);
     if(d.eventId==='funds'){stats.funds++;let id=d.caskId;if(id===s.trade.contract?.caskId){s=W.cancelContract(s);stats.cancelledForFunds++;}bottle(id);}
     else if(ids.includes('wait')){s=W.chooseDistillery(s,d.caskId,'wait');stats.choices++;}
     else if(ids.includes('last')){s=W.chooseDistillery(s,d.caskId,'last');stats.choices++;}
     else{if(d.caskId===s.trade.contract?.caskId)s=W.cancelContract(s);bottle(d.caskId);}
     continue;
   }
   if(s.trade.offer){stats.offers++;const candidates=W.contractCandidates(s);if(policy==='accept'&&candidates.length){s=W.acceptOffer(s,candidates[0].id);stats.accepted++;}else{s=W.declineOffer(s);stats.declined++;}continue;}
   list();
   // Two early retail lots build lawful working capital and visible trade evidence.
   // Afterwards, keep non-contract casks for 36 months unless funds force release.
   const target=stats.bottlings<2?6:36;
   const due=s.core.casks.find(c=>c.id!==s.trade.contract?.caskId&&c.age>=target);
   if(due){taste(due.id);bottle(due.id);continue;}
   for(const c of s.core.casks)if(c.age>0&&c.age%6===0&&s.notesById[c.id].samples.at(-1)?.age!==c.age) taste(c.id);
   if(s.still.phase==='ready'&&W.canStart(s).ok){s=W.startDistillation(s);stats.startMonths.push(s.core.month);stats.starts++;continue;}
   if(s.still.phase==='distilling'&&s.still.distillation.progress>=99){s=W.stopDistillation(s);stats.stops++;continue;}
   if(s.still.phase==='filling'){s=W.fillBarrel(s,stats.fills%2?'refill':'bourbon');stats.fills++;continue;}
   // Six seconds/one month, 100ms extraction ticks. Every facility advances once.
   if(s.still.phase==='distilling')s=W.distillStep(s);
   if(++frame<60)continue;frame=0;
   const previous=s.core.month,next=W.tickDistillery(s);s=next;
   if(s.core.month===previous){if(s.decisions.length)continue;throw Error('Month stalled with no resolvable judgment.');}
   const full=s.core.casks.length===4,check=W.canStart(s);
   if(full){stats.fullMonths++;fullRun++;stats.firstFullMonth??=s.core.month;}else fullRun=0;maxFull=Math.max(maxFull,fullRun);
   // A ready still makes these direct current-player start denials, not projections.
   const blocked=s.still.phase==='ready'&&!check.ok;
   if(blocked){stats.blockedReasons[check.reason]=(stats.blockedReasons[check.reason]??0)+1;blockedRun++;}else blockedRun=0;maxBlocked=Math.max(maxBlocked,blockedRun);
   stats.minimumCash=Math.min(stats.minimumCash,s.core.cash);
   const totals=s.core.totals,delta=s.core.cash-(1600+totals.revenue-totals.costs-totals.upkeep);
   if(Math.abs(delta)>0.021)throw Error('Cash ledger mismatch '+delta);
   monthly.push({seed,policy,month:s.core.month,cash:s.core.cash,casks:s.core.casks.length,full,blocked,blockedReason:blocked?check.reason:'',contractCaskId:s.trade.contract?.caskId??'',revenue:totals.revenue,costs:totals.costs,upkeep:totals.upkeep,stock:s.core.products.reduce((n,p)=>n+p.stock,0)});
 }
 if(s.core.month!==120)throw Error('Guard reached');
 const text=W.serializeDistillery(s),restored=W.restoreDistillery(text);stats.replayExact=JSON.stringify(restored)===text;if(!stats.replayExact)throw Error('Save replay mismatch');
 }catch(e){stats.status='failed';stats.error=e.message;stats.replayExact=false;}
 stats.month=s.core.month;stats.cash=round(s.core.cash);stats.maxFullMonths=maxFull;stats.maxStartBlockedMonths=maxBlocked;stats.casks=s.core.casks.length;stats.shipments=s.trade.history.filter(h=>h.kind==='shipped');stats.revenue=s.core.totals.revenue;stats.costs=s.core.totals.costs;stats.upkeep=s.core.totals.upkeep;stats.maximumStartGap=Math.max(0,...stats.startMonths.slice(1).map((m,i)=>m-stats.startMonths[i]));stats.cashIdentityDelta=round(s.core.cash-(1600+stats.revenue-stats.costs-stats.upkeep));stats.manualActions=stats.starts+stats.stops+stats.fills+stats.tastings+stats.tastingEnds+stats.choices+stats.bottlings+stats.prices+stats.listings+stats.accepted+stats.declined;stats.activeSeconds=s.core.month*6;return stats;
}
const sources={};for(const name of ['wholesale.mjs','wholesale-parameters.mjs','economy.mjs','economy-parameters.mjs','character.mjs','monthly.mjs'])sources[name]=createHash('sha256').update(await readFile(new URL('../../'+name,import.meta.url))).digest('hex');
for(const policy of ['accept','decline'])for(const seed of seeds){const r=run(seed,policy);rows.push(r);console.log(JSON.stringify({seed,policy,status:r.status,cash:r.cash,full:r.fullMonths,maxFull:r.maxFullMonths,contracts:r.accepted,shipments:r.shipments.length,error:r.error}));}
await writeFile(new URL('warehouse-results.json',import.meta.url),JSON.stringify({method:{seeds,months:120,initialCash:1600,policies:['accept','decline'],extractStop:99,casks:'alternating bourbon/refill',retail:'first two manual bottles at age 6, afterwards age 36; standard price; funds emergencies may bottle earlier',decisions:'sample then wait; last option if offered; funds bottle selected eligible cask, cancel only if no non-contract recovery option',time:'100ms extraction frame, 60 frames per shared month; decisions/tasting zero simulation time, not a human duration claim',samples:'each 6 months and before decisions/bottling',sourceSha256:sources},runs:rows},null,2)+'\n');
const keys=Object.keys(monthly[0]),csv=[keys.join(','),...monthly.map(r=>keys.map(k=>JSON.stringify(r[k])).join(','))].join('\n');await writeFile(new URL('warehouse-results.csv',import.meta.url),'\ufeff'+csv+'\n');
if(rows.some(r=>r.status!=='ok'||!r.replayExact||r.cashIdentityDelta!==0))process.exitCode=1;
