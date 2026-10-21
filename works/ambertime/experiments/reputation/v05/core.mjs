// v05-local copy of v04 core. Only cohort metadata / bounded encounter hooks differ.
// ConditionA parity is tested against the untouched v04 module.
import {SHOPS as BASE_SHOPS,ROADS,PRODUCTS,affinity,unit} from '../v03/model.mjs';
export {PRODUCTS,affinity};
export const VERSION='ambertime-reputation/0.4';
export const SEEDS=[20261021,42];
export const STRATEGIES=[{id:'local',name:'地元酒店へ継続'},{id:'bulk',name:'大店へ集中'},{id:'distributed',name:'複数店舗へ分散'},{id:'stable',name:'同じ特徴を継続'},{id:'changing',name:'商品を段階的に変更'},{id:'mixed',name:'地元を維持して外へ'}];
const roles={town:'酒店',diner:'飲食店',bar:'飲食店',super:'スーパー',restaurant:'飲食店',specialist:'酒店',department:'デパート',hill:'飲食店'};
export const SHOPS=BASE_SHOPS.map(n=>({...structuredClone(n),role:roles[n.id],level:'町'}));
export const NODES=[...SHOPS,
 {id:'near-local',name:'周辺の食文化圏',level:'周辺地域',region:'周辺',role:'地域集約',taste:[.5,.8,.2],age:24,price:30},
 {id:'near-wide',name:'周辺の流通圏',level:'周辺地域',region:'周辺',role:'地域集約',taste:[.2,.55,.25],age:24,price:25},
 {id:'national-food',name:'全国の飲食のつながり',level:'全国',region:'全国',role:'遠距離集約',taste:[.4,.8,.25],age:24,price:35},
 {id:'national-craft',name:'全国の熟成酒のつながり',level:'全国',region:'全国',role:'遠距離集約',taste:[.1,.55,.7],age:72,price:55},
 {id:'online',name:'SNSの話題',level:'全国',region:'距離なし',role:'話題集約',taste:[.4,.65,.35],age:24,price:35},
 {id:'overseas-food',name:'海外の飲食文化圏',level:'海外',region:'海外A',role:'国・地域集約',taste:[.55,.85,.15],age:12,price:30},
 {id:'overseas-craft',name:'海外の熟成酒文化圏',level:'海外',region:'海外B',role:'国・地域集約',taste:[.05,.6,.8],age:72,price:62},
 {id:'space',name:'宇宙・仮想の到達先',level:'宇宙',region:'仮想',role:'拡張確認',taste:[.15,.65,.7],age:72,price:60}];
const roadEdges=ROADS.flatMap(([a,b,d,r])=>[{from:a,to:b,channel:'road',delay:d*6,weight:r},{from:b,to:a,channel:'road',delay:d*6,weight:r}]);
for(const n of SHOPS){const out=roadEdges.filter(e=>e.from===n.id),sum=out.reduce((a,e)=>a+e.weight,0);for(const e of out)e.weight=e.weight/sum*.24;}
export const EDGES=[...roadEdges,
 {from:'town',to:'near-local',channel:'rooted',delay:18,weight:.32},
 {from:'specialist',to:'near-local',channel:'rooted',delay:24,weight:.32},
 ...['diner','bar','restaurant','hill'].map(from=>({from,to:'near-local',channel:'taste',delay:18,weight:.36})),
 {from:'super',to:'near-wide',channel:'broad',delay:12,weight:.32},{from:'super',to:'near-local',channel:'broad',delay:18,weight:.24},
 {from:'department',to:'national-craft',channel:'curated',delay:30,weight:.52},
 {from:'near-local',to:'national-food',channel:'bridge',delay:30,weight:.55},
 {from:'near-wide',to:'national-food',channel:'bridge',delay:24,weight:.3},{from:'near-wide',to:'national-craft',channel:'bridge',delay:36,weight:.3},
 {from:'national-food',to:'overseas-food',channel:'bridge',delay:60,weight:.52},{from:'national-craft',to:'overseas-craft',channel:'bridge',delay:72,weight:.52},
 ...SHOPS.map(n=>({from:n.id,to:'online',channel:'sns',delay:3,weight:.22})),
 {from:'online',to:'overseas-food',channel:'sns-forward',delay:6,weight:.28},{from:'online',to:'overseas-craft',channel:'sns-forward',delay:6,weight:.28},
 {from:'overseas-food',to:'space',channel:'space',delay:120,weight:.18},{from:'overseas-craft',to:'space',channel:'space',delay:120,weight:.18}];
const node=id=>NODES.find(n=>n.id===id),clamp=n=>Math.max(0,Math.min(1,n));
export const productKey=p=>[p.age,p.roughness,p.character,p.wood,p.price].join(':');
export function productFor(strategy,release){const key=strategy==='stable'?'standard':strategy==='changing'||strategy==='mixed'?(release<=12?'young':release<=24?'standard':'long'):'standard';return {...PRODUCTS[key],brand:'AmberTime',kind:key,release};}
export function productAt(s){return productFor(s.strategy,Math.floor(s.month/18)+1);}
export function create({seed=SEEDS[0],strategy='distributed',sns=false,space=false,rootedness=true,memory=true,bridges=true,supply=24,quantityScale=1}={}){
 if(!Number.isInteger(seed)||seed<1||seed>4294967295||!STRATEGIES.some(x=>x.id===strategy)||!Number.isInteger(supply)||supply<0||supply>24||!Number.isFinite(quantityScale)||quantityScale<0||quantityScale>4)throw Error('Invalid experiment conditions');
 return {version:VERSION,seed,strategy,sns,space,rootedness,memory,bridges,supply,quantityScale,month:0,generation:1,managedDistilleries:1,produced:supply,inventory:supply,delivered:0,lots:[{stock:supply,product:productAt({strategy,month:0})}],receipts:[],arrivals:[],packets:[],seen:{},handovers:[],responses:[],nodes:Object.fromEntries(NODES.map(n=>[n.id,{awareness:0,interest:0,firstKnown:null,firstInterest:null,firstCandidate:null,root:0,received:0,periods:0,lastDelivery:null,accepted:n.id==='town',memories:[],history:[]}]))};
}
export function recall(n,p){const m=n.memories.find(x=>x.key===productKey(p));return m?m.likedContacts/(m.likedContacts+6):0;}
export function candidate(n){return n.awareness>=.14&&n.interest>=.008;}
export function updateRelationship(s,id,p,count){
 const n=s.nodes[id],fit=affinity(node(id),p).fit,key=productKey(p),beforeRecall=s.memory?recall(n,p):0;
 const same=n.history.find(x=>x.month===s.month&&x.key===key);if(same)same.count+=count;else n.history.push({month:s.month,key,fit,count});
 n.periods=new Set(n.history.map(x=>Math.floor(x.month/3))).size;n.lastDelivery=s.month;
 if(s.memory){let m=n.memories.find(x=>x.key===key);if(!m){m={key,product:structuredClone(p),contacts:0,likedContacts:0,fit,firstMonth:s.month,lastMonth:s.month};n.memories.push(m);}if(!same){m.contacts++;m.likedContacts+=fit;}m.lastMonth=s.month;}
 // Relationship growth requires receipts in distinct periods AND elapsed span
 // between actual receipts; no monthly/root bonus or raw cumulative volume.
 if(s.rootedness){const periods=1-Math.exp(-n.periods/24),span=s.month-n.history[0].month,spanFactor=span/(span+48),avgFit=n.history.reduce((a,x)=>a+x.fit,0)/n.history.length;
 const contacts=n.memories.reduce((a,x)=>a+x.likedContacts,0),anchor=s.memory&&contacts?Math.max(...n.memories.map(x=>x.likedContacts))/contacts:0;
 const depth=periods*spanFactor*Math.sqrt(avgFit)*(.65+.35*anchor);n.root=Math.max(n.root,clamp(depth));}
 return {fit,recall:beforeRecall};
}
export function deliver(s,to,count){
 if(!SHOPS.some(x=>x.id===to)||!Number.isInteger(count)||count<0)throw Error('Only finite deliveries to experimental shops');
 count=Math.min(count,s.inventory);if(!count)return;
 // One scheduled receipt can contain frozen lots. Rumor is allocated in proportion
 // to actual counts, so splitting lots cannot manufacture additional fuel.
 const shipment='shipment-'+s.month+'-'+to+'-'+s.receipts.length,total=count,base=1-Math.exp(-total/4);const source=s.nodes[to];
 const beforeMemories=structuredClone(source.memories),beforeNode={memories:beforeMemories};
 for(const lot of [...s.lots].reverse()){
  if(count<=0)break;const q=Math.min(count,lot.stock);if(!q)continue;const p=structuredClone(lot.product),reaction=updateRelationship(s,to,p,q),id=s.receipts.length;
  reaction.recall=s.memory?recall(beforeNode,p):0;
  const r={id,shipment,month:s.month,to,count:q,product:p,fit:reaction.fit,recall:reaction.recall};s.receipts.push(r);s.responses.push({receipt:id,month:s.month,to,release:p.release,kind:p.kind,...reaction});
  source.received+=q;s.inventory-=q;s.delivered+=q;lot.stock-=q;count-=q;
  const remembered=beforeMemories.find(m=>m.key===productKey(p)),novelty=1/(1+((remembered?.contacts??0)+1)/8);
  s.packets.push({receipt:id,to,path:[to],due:s.month,strength:base*q/total,channel:'direct',sourceRoot:source.root,sourceRecall:reaction.recall,novelty});
 }
}
function allocations(s){
 const accepted=SHOPS.filter(n=>s.nodes[n.id].accepted).map(n=>n.id),big=['department','super','restaurant'].find(id=>accepted.includes(id))??'town';
 if(s.month<=12)return [['town',3]];
 if(s.strategy==='local')return [['town',3]];
 if(s.strategy==='bulk')return s.month%12===0?[[big,12]]:[];
 if(s.strategy==='mixed')return [['town',1],[big==='town'?'bar':big,2]].map(([id,q])=>[accepted.includes(id)?id:'town',q]);
 // stable/changing share exactly the same rotation policy; different reach is a result.
 const id=accepted[(Math.floor(s.month/3)-1)%accepted.length];return [[id,3]];
}
function edgeOpen(s,e,packet){
 const r=s.receipts[packet.receipt],p=r.product,n=s.nodes[e.from],target=node(e.to);
 if(e.channel==='road')return true;
 if(!s.bridges)return false;
 if(e.channel==='sns')return s.sns&&packet.path.length===1;
 if(e.channel==='sns-forward')return s.sns&&n.awareness>=.07;
 if(e.channel==='space')return s.space&&n.awareness>=.12&&n.interest>=.012;
 if(SHOPS.some(x=>x.id===e.from)){
  if(packet.path.length!==1)return false; // heard-about shops cannot mint direct trade evidence
  if(e.channel==='rooted')return packet.sourceRoot>=.12;
  if(e.channel==='curated')return p.age>=36&&affinity(target,p).fit>=.45;
  if(e.channel==='taste')return affinity(target,p).fit>=.30;
  return true;
 }
 return n.awareness>=.07&&n.interest>=.012;
}
export function handover(s){const before=JSON.stringify({nodes:s.nodes,packets:s.packets,lots:s.lots,seen:s.seen});s.generation++;s.handovers.push({month:s.month,generation:s.generation,preserved:before===JSON.stringify({nodes:s.nodes,packets:s.packets,lots:s.lots,seen:s.seen})});return s;}
export function step(s,{ship=true}={}){
 s.month++;if(s.month%18===0){s.lots.push({stock:s.supply,product:productAt(s)});s.produced+=s.supply;s.inventory+=s.supply;}
 for(const n of Object.values(s.nodes)){n.interest*=.996;if(n.lastDelivery!==null&&s.month-n.lastDelivery>24)n.root*=.9997;if(candidate(n)){n.accepted=true;n.firstCandidate??=s.month;}}
 if(ship&&s.month%3===0){const combined=new Map();for(const[id,q]of allocations(s))combined.set(id,(combined.get(id)??0)+q);for(const[id,q]of combined)deliver(s,id,Math.floor(q*s.quantityScale));}
 const due=s.packets.filter(x=>x.due<=s.month);s.packets=s.packets.filter(x=>x.due>s.month);
 due.sort((a,b)=>a.due-b.due||b.strength-a.strength||a.receipt-b.receipt||a.to.localeCompare(b.to));
 for(const packet of due){const seen=(packet.eventId??packet.receipt)+':'+packet.to;if(s.seen[seen])continue;s.seen[seen]=true;
  const n=s.nodes[packet.to],config=node(packet.to),r=s.receipts[packet.receipt],fit=packet.eventId&&packet.neutralFit?.5:affinity(config,r.product).fit,isShop=config.level==='町';
  const familiarity=s.memory&&isShop?(packet.channel==='direct'?packet.sourceRecall:recall(n,r.product)):0;
  n.awareness=clamp(n.awareness+.045*packet.strength*(1-n.awareness));n.interest=clamp(n.interest+.035*packet.strength*fit*(.7+.3*familiarity)*(1-n.interest));
  if(n.awareness>=.10)n.firstKnown??=s.month;if(n.interest>=.008)n.firstInterest??=s.month;
  s.arrivals.push({receipt:packet.receipt,month:s.month,to:packet.to,path:packet.path,strength:packet.strength,fit,channel:packet.channel,...(packet.eventId?{eventId:packet.eventId}:{} )});
  let edges=EDGES.filter(e=>e.from===packet.to&&!packet.path.includes(e.to)&&edgeOpen(s,e,packet));
  if(packet.eventId)edges=packet.jumpHopsLeft>0?edges.filter(e=>node(e.to).level!=='町').sort((a,b)=>b.weight-a.weight||a.to.localeCompare(b.to)).slice(0,1):[];
  for(const e of edges){
   // SNS is a substitute share of the same finite communication budget. No free
   // additional bottles or global sales. Physical paths retain70% when enabled.
   let weight=e.weight;if(e.channel==='sns')weight*=packet.novelty;else if(s.sns&&packet.path.length===1)weight*=.7;
   const strength=packet.strength*weight*(.95+.1*unit(s.seed,packet.receipt+':'+e.from+':'+e.to));if(strength<.0005)continue;
   s.packets.push({...packet,to:e.to,path:[...packet.path,e.to],due:s.month+e.delay,strength,channel:packet.eventId?'chance:'+e.channel:e.channel,...(packet.eventId?{jumpHopsLeft:packet.jumpHopsLeft-1}:{} )});
  }
 }
 if(s.month%360===0)handover(s);return s;
}
export function run(options={},years=60){if(!Number.isFinite(years)||years<0||years>120||Math.abs(years*12-Math.round(years*12))>1e-7)throw Error('Use monthly horizon0..120years');const s=create(options);for(let m=0;m<Math.round(years*12);m++)step(s);return s;}
export function summary(s){const remote=NODES.filter(n=>n.level!=='町'&&(n.id!=='space'||s.space)),old=SHOPS.filter(n=>n.region==='旧市街'),mean=(nodes,key)=>nodes.reduce((a,n)=>a+s.nodes[n.id][key],0)/nodes.length;
 return {month:s.month,years:s.month/12,generation:s.generation,produced:s.produced,delivered:s.delivered,inventory:s.inventory,known:NODES.filter(n=>s.nodes[n.id].awareness>=.10).map(n=>n.id),remoteKnown:remote.filter(n=>s.nodes[n.id].awareness>=.10).map(n=>n.id),interested:NODES.filter(n=>s.nodes[n.id].interest>=.008).map(n=>n.id),trading:SHOPS.filter(n=>s.nodes[n.id].received>0).map(n=>n.id),rooted:SHOPS.filter(n=>s.nodes[n.id].root>=.18).map(n=>n.id),localRoot:mean(old,'root'),localAwareness:mean(SHOPS,'awareness'),remoteAwareness:mean(remote,'awareness'),remoteInterest:mean(remote,'interest'),nodes:structuredClone(s.nodes),handovers:structuredClone(s.handovers)};}
// Prehistory is explicit. Native refill32L at72months yields39 bottles on both
// fixed seeds in v03 audit. Reserve24 per18-month bottling; staggered starts
// may interleave at product changes, with occupancy checked against four slots.
export function productionCalendar(strategy,years=90){return Array.from({length:Math.floor(years*12/18)+1},(_,i)=>{const harvest=i*18,p=productFor(strategy,i+1);return {release:i+1,start:harvest-p.age,harvest,age:p.age,bottles:24};});}
export function peakCasks(calendar){let peak=0;for(let m=-72;m<=Math.max(...calendar.map(x=>x.harvest));m++)peak=Math.max(peak,calendar.filter(x=>x.start<=m&&m<x.harvest).length);return peak;}
