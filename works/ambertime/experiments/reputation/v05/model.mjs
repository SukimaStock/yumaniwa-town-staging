import * as Core from './core.mjs';
import {unit} from '../v03/model.mjs';
export const {NODES,SHOPS,EDGES,STRATEGIES,PRODUCTS,affinity,productAt,productKey,recall,productionCalendar,peakCasks}=Core;
export const VERSION='ambertime-reputation/0.5';
export const SEEDS=[20261021,42,7,137,2026,314159,271828,65537];
export const CONDITIONS=[{id:'A',name:'通常伝播のみ'},{id:'B',name:'低頻度の偶然'},{id:'C',name:'偶然の頻度4倍'},{id:'D',name:'偶然の強さに相性なし'},{id:'E',name:'客層差なし'}];
export const PARAMETERS={recentMonths:6,cooldownMonths:6,globalWindow:12,globalCap:4,maxImpact:.16,maxTargets:2,extraHops:1};
const profiles={
 酒店:{rate:.09,guests:[['regular',.40,['near-local','national-food']],['traveler',.35,['national-food','overseas-food']],['voice',.25,['national-food','overseas-craft']]]},
 スーパー:{rate:.12,guests:[['broad',.55,['near-wide','national-food']],['takehome',.45,['national-food','overseas-food']]]},
 デパート:{rate:.14,guests:[['gift',.4,['national-craft','overseas-craft']],['overseas',.4,['overseas-craft','overseas-food']],['notable',.2,['national-craft','overseas-craft']]]},
 飲食店:{rate:.10,guests:[['chef',.45,['near-local','national-food']],['peer',.35,['near-local','national-food']],['foodvoice',.2,['national-food','overseas-food']]]}
};
const common={rate:.1125,guests:[['regular',.25,['near-local','national-food']],['traveler',.25,['national-food','overseas-food']],['gift',.25,['national-craft','overseas-craft']],['foodvoice',.25,['national-food','overseas-food']]]};
export const GUEST_PROFILES=profiles;
export const KINDS={regular:'常連客の紹介',traveler:'旅行者',voice:'発信者',broad:'幅広い客層',takehome:'地域外への持ち帰り',gift:'贈答のつながり',overseas:'海外客',notable:'著名な客の紹介',chef:'料理人',peer:'同業者',foodvoice:'食の発信者'};
const node=id=>NODES.find(n=>n.id===id),shop=id=>SHOPS.find(n=>n.id===id),draw=(s,key)=>unit(s.seed,'encounter-v05:'+key);
function choose(list,value){let sum=0;for(const x of list){sum+=x[1];if(value<sum)return x;}return list.at(-1);}
export function describeEvent(e){
 const source=shop(e.source)?.name,target=node(e.target)?.name;
 if(!source||!target||!KINDS[e.kind]||!Number.isInteger(e.releaseId))throw Error('Cannot describe unsupported event');
 const intro=`${source}に届いた発売#${e.releaseId}`,actor=({regular:'常連客',notable:'著名な客'})[e.kind]??KINDS[e.kind];
 return `${intro}から、${actor}を通じた${target}への紹介が生まれました。`;
}
export function create(options={}){
 const {condition='B',...base}=options;if(!CONDITIONS.some(c=>c.id===condition))throw Error('Invalid comparison condition');
 return {...Core.create({...base,sns:false,space:false}),version:VERSION,condition,events:[],pendingTrials:[],trialSeen:{},scheduled:{},attempts:[],lastEncounter:{}};
}
export function scheduleTrials(s,receipts){
 if(s.condition==='A')return;
 const groups=new Map();for(const r of receipts){if(!groups.has(r.shipment))groups.set(r.shipment,[]);groups.get(r.shipment).push(r);}
 for(const [shipment,parts]of groups){if(s.scheduled[shipment])continue;s.scheduled[shipment]=true;const total=parts.reduce((a,r)=>a+r.count,0);let pick=draw(s,shipment+':lot')*total,selected=parts.at(-1);for(const r of parts){pick-=r.count;if(pick<0){selected=r;break;}}
  const lag=1+Math.floor(draw(s,shipment+':lag')*PARAMETERS.recentMonths);
  s.pendingTrials.push({id:'trial:'+shipment,shipment,receipt:selected.id,due:selected.month+lag,totalCount:total});
 }
}
export function evaluateEncounters(s){
 const due=s.pendingTrials.filter(t=>t.due<=s.month);s.pendingTrials=s.pendingTrials.filter(t=>t.due>s.month);
 for(const t of due){if(s.trialSeen[t.id])continue;s.trialSeen[t.id]=true;const r=s.receipts.find(r=>r.id===t.receipt),age=r?s.month-r.month:Infinity;
  let skip=!r?'missing-receipt':age<1||age>PARAMETERS.recentMonths?'stale-receipt':s.month-(s.lastEncounter[r.to]??-Infinity)<PARAMETERS.cooldownMonths?'source-cooldown':s.events.filter(e=>s.month-e.month<PARAMETERS.globalWindow).length>=PARAMETERS.globalCap?'global-cap':null;
  if(skip){s.attempts.push({id:t.id,month:s.month,receipt:t.receipt,skip});continue;}
  const n=s.nodes[r.to],guest=s.condition==='E'?common:profiles[shop(r.to).role],fit=affinity(shop(r.to),r.product).fit,recency=(7-age)/6,volume=.5+.5*(1-Math.exp(-t.totalCount/4)),frequency=s.condition==='C'?4:1;
  const probability=Math.min(.5,guest.rate*frequency*(.5+.5*fit)*(.7+.3*n.root)*recency*volume),roll=draw(s,t.shipment+':occurs');
  s.attempts.push({id:t.id,month:s.month,receipt:r.id,probability,roll,fit,recency,root:n.root,totalCount:t.totalCount,skip:null});if(roll>=probability)continue;
  const [kind,,destinations]=choose(guest.guests,draw(s,t.shipment+':guest')),target=destinations[Math.floor(draw(s,t.shipment+':target')*destinations.length)],destinationFit=affinity(node(target),r.product).fit,strengthFit=s.condition==='D'?.5:(fit+destinationFit)/2,impact=.08+.08*strengthFit,delay=1+Math.floor(draw(s,t.shipment+':travel')*6);
  const e={id:'encounter:'+t.shipment,month:s.month,generation:s.generation,source:r.to,receipt:r.id,shipment:t.shipment,releaseId:r.product.release,product:structuredClone(r.product),kind,target,probability,roll,probabilityFit:fit,destinationFit,strengthFit,impact,delay,neutralFit:s.condition==='D',reason:''};e.reason=describeEvent(e);s.events.push(e);s.lastEncounter[r.to]=s.month;
  // Namespace prevents this jump from consuming normal receipt-route evidence.
  // Direct effect <=16% of remaining recognition; one secondary external hop only.
  s.packets.push({receipt:r.id,to:target,path:[r.to,target],due:s.month+delay,strength:impact/.045,channel:'chance:'+kind,eventId:e.id,neutralFit:e.neutralFit,jumpHopsLeft:PARAMETERS.extraHops,sourceRoot:n.root,sourceRecall:r.recall,novelty:1});
 }
 return s;
}
export function step(s,options={}){
 const before=s.receipts.length,eventsBefore=s.events.length,historyBefore=JSON.stringify(s.events);Core.step(s,options);
 if(s.month%360===0){const h=s.handovers.at(-1);h.eventsPreserved=historyBefore===JSON.stringify(s.events);h.eventCount=eventsBefore;h.pendingTrials=s.pendingTrials.length;}
 scheduleTrials(s,s.receipts.slice(before));if(s.condition!=='A')evaluateEncounters(s);return s;
}
export function deliver(s,to,count){const before=s.receipts.length;Core.deliver(s,to,count);scheduleTrials(s,s.receipts.slice(before));return s;}
export function handover(s){const before=JSON.stringify({events:s.events,pendingTrials:s.pendingTrials,scheduled:s.scheduled,trialSeen:s.trialSeen});Core.handover(s);Object.assign(s.handovers.at(-1),{eventsPreserved:before===JSON.stringify({events:s.events,pendingTrials:s.pendingTrials,scheduled:s.scheduled,trialSeen:s.trialSeen}),eventCount:s.events.length,pendingTrials:s.pendingTrials.length});return s;}
export function run(options={},years=60){if(!Number.isFinite(years)||years<0||years>120||Math.abs(years*12-Math.round(years*12))>1e-7)throw Error('Monthly horizon0..120years');const s=create(options);for(let i=0;i<Math.round(years*12);i++)step(s);return s;}
export function summary(s){const v=Core.summary(s),outside=id=>node(id).level!=='町',overseas=id=>node(id).level==='海外',min=x=>x.length?Math.min(...x):null;
 return {...v,eventCount:s.events.length,chanceArrivalCount:s.arrivals.filter(a=>a.eventId).length,normalArrivalCount:s.arrivals.filter(a=>!a.eventId).length,firstRemoteArrival:min(s.arrivals.filter(a=>outside(a.to)).map(a=>a.month)),firstOverseasArrival:min(s.arrivals.filter(a=>overseas(a.to)).map(a=>a.month)),firstOverseasKnown:min(NODES.filter(n=>overseas(n.id)&&s.nodes[n.id].firstKnown!==null).map(n=>s.nodes[n.id].firstKnown)),townInterest:SHOPS.reduce((a,n)=>a+s.nodes[n.id].interest,0)/SHOPS.length,events:structuredClone(s.events)};
}
