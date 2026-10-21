// Independent monthly experiment. Main save, economics and demand are not imported.
import {PRODUCTS, affinity, unit} from '../../reputation/v03/model.mjs';
import {NODES as BASE_NODES, SHOPS, EDGES} from '../../reputation/v05/core.mjs';
import {GUEST_PROFILES, KINDS} from '../../reputation/v05/model.mjs';
export {PRODUCTS, SHOPS};
export const VERSION='town-simulation/0.1';
export const MODEL_VERSION='ambertime-town/0.1.0';
export const MODES=[{id:'normal',name:'通常伝播のみ'},{id:'chance',name:'通常＋偶然'},{id:'responses',name:'偶然＋受け手の反応'},{id:'memory',name:'偶然＋長期記憶'}];
export const POLICIES=[{id:'local',name:'地元へ継続'},{id:'distributed',name:'取扱先へ分散'},{id:'mixed',name:'地元を維持して外へ'}];
export const PRODUCT_OPTIONS=[{id:'changing',name:'発売ごとに変える'},{id:'standard',name:'ふつう'},{id:'young',name:'若い原酒'},{id:'long',name:'長期熟成'}];
export const NODES=BASE_NODES.filter(n=>!['online','space'].includes(n.id));
export const PARAMETERS=Object.freeze({maxBarrels:4,bottlesPerBarrel:24,fillInterval:18,quarterlyRequest:3,memoryLimit:48,memoryMinMonths:24,memoryMaxMonths:600,generationMonths:360,maxMonths:1200});
const config=id=>NODES.find(n=>n.id===id), name=id=>id==='distillery'?'1号店':config(id)?.name??id;
const clamp=n=>Math.max(0,Math.min(1,n)), copy=x=>structuredClone(x);
const draw=(s,key)=>unit(s.seed,'town-v01:'+key);
const hasResponses=s=>['responses','memory'].includes(s.mode);
export const date=month=>`${Math.floor(month/12)}年${month%12}か月`;
function event(s,type,fields={}){const e={id:'e'+(s.events.length+1),type,month:s.month,generation:s.generation,sourceId:null,releaseId:null,from:null,to:null,...fields};e.reason=describeEvent(e);s.events.push(e);return e;}
export function describeEvent(e){
 const at=name(e.to),outlet=config(e.to)?.level==='町'?at:at+'の取扱先',from=name(e.from),release=e.releaseId?`発売#${e.releaseId}`:'AmberTime';
 switch(e.type){
 case'release':return `${release}を${e.count}本、瓶詰めしました。`;
 case'shipment':return `${outlet}へ${release}を${e.count}本届けました。`;
 case'rumor':return `${from}の${e.actor}から、${at}への紹介が生まれました。`;
 case'arrival':return `${at}へ${release}の口コミが届きました。`;
 case'memory':return `${at}で${release}の${e.detail}が記憶に残りました。`;
 case'interest':return `${at}で${release}への関心が生まれました。`;
 case'share':return `${from}から${at}へ、${release}が紹介されました。`;
 case'visit':return `${from}で${release}を知った人が、1号店を訪れました。`;
 case'inquiry':return `${outlet}から${release}の${config(e.to)?.level==='海外'?'輸入方法':'取扱い'}について問い合わせがありました。`;
 case'trade':return `${outlet}との取扱いが始まりました。納品は次の配分からです。`;
 case'resurface':return `${at}で${date(e.age)}前の${release}の記憶が戻りました。`;
 case'generation':return `${e.generation}代目へ、街との関係と記憶を引き継ぎました。`;
 case'policy':return '商品・納品方針を切り替えました。';
 default:throw Error('Unknown event type: '+e.type);
 }
}
function validOptions(o){if(!Number.isInteger(o.seed)||o.seed<1||o.seed>4294967295||!MODES.some(x=>x.id===o.mode)||!POLICIES.some(x=>x.id===o.policy)||!PRODUCT_OPTIONS.some(x=>x.id===o.product))throw Error('Invalid simulation settings');}
export function create(options={}){
 const initial={seed:options.seed??20261021,mode:options.mode??'memory',policy:options.policy??'mixed',product:options.product??'changing'};validOptions(initial);
 const s={version:VERSION,modelVersion:MODEL_VERSION,...initial,initial:copy(initial),settingsHistory:[],month:0,generation:1,managedDistilleries:1,brand:'AmberTime',produced:0,inventory:0,delivered:0,peakBarrels:0,barrels:[],barrelHistory:[],releases:[],shipments:[],arrivals:[],events:[],memories:[],handovers:[],trades:[],pending:[],packets:[],attempts:[],seen:{},lastEncounter:{},nodes:Object.fromEntries(NODES.map(n=>[n.id,{awareness:0,interest:0,root:0,received:0,periods:0,fitSum:0,lastDelivery:null,firstDelivery:null,firstArrival:null,firstInterest:null,discovered:n.id==='town',contact:n.id==='town',trading:n.id==='town',tradingSince:n.id==='town'?0:null,inquiries:0,visits:0}]))};
 release(s,{id:'initial',kind:'standard',product:{...PRODUCTS.standard,brand:'AmberTime'},start:-24,due:0},true);
 fill(s);return s;
}
function fill(s){
 if(s.barrels.length>=PARAMETERS.maxBarrels)return;
 const serial=s.barrelHistory.length+1,kind=s.product==='changing'?['young','standard','long'][(serial-1)%3]:s.product;
 const p={...PRODUCTS[kind],brand:'AmberTime'};
 for(const axis of ['roughness','character','wood'])p[axis]=Number(clamp(p[axis]+(draw(s,`barrel:${serial}:${axis}`)-.5)*.04).toFixed(4));
 const b={id:'b'+serial,kind,product:p,start:s.month,due:s.month+p.age};s.barrels.push(b);s.barrelHistory.push(copy(b));s.peakBarrels=Math.max(s.peakBarrels,s.barrels.length);
}
function release(s,b,initial=false){const r={id:s.releases.length+1,month:s.month,barrelId:b.id,kind:b.kind,product:{...b.product,kind:b.kind,release:s.releases.length+1},count:24,stock:24,initial};s.releases.push(r);s.produced+=24;s.inventory+=24;const e=event(s,'release',{releaseId:r.id,count:24,barrelId:b.id,initial});r.eventId=e.id;}
export function setPolicy(s,changes={}){
 const next={seed:s.seed,mode:s.mode,policy:changes.policy??s.policy,product:changes.product??s.product};validOptions(next);
 if(next.policy===s.policy&&next.product===s.product)return s;
 s.policy=next.policy;s.product=next.product;const e=event(s,'policy',{policy:s.policy,product:s.product});s.settingsHistory.push({month:s.month,policy:s.policy,product:s.product,eventId:e.id});return s;
}
function send(s,to,count){
 if(!s.nodes[to].trading)throw Error('Shipment without handling agreement');
 count=Math.min(count,s.releases.filter(r=>r.month<s.month).reduce((n,r)=>n+r.stock,0));if(!count)return;
 const request=count,shipmentId='s'+(s.shipments.length+1),parts=[];
 for(const r of [...s.releases].reverse()){if(r.month>=s.month)continue;if(count<=0)break;const q=Math.min(count,r.stock);if(!q)continue;r.stock-=q;s.inventory-=q;s.delivered+=q;count-=q;const e=event(s,'shipment',{sourceId:r.eventId,releaseId:r.id,from:'distillery',to,count:q,shipmentId});parts.push({releaseId:r.id,count:q,eventId:e.id});const n=s.nodes[to],fit=affinity(config(to),r.product).fit;
  s.packets.push({sourceId:e.id,releaseId:r.id,to,from:'distillery',due:s.month+1,strength:(1-Math.exp(-request/4))*q/request,path:[to],cohort:shipmentId+':release:'+r.id,channel:'direct',hops:0});n.fitSum+=fit*q;
 }
 const n=s.nodes[to];n.received+=request;n.periods++;n.firstDelivery??=s.month;n.lastDelivery=s.month;n.root=Math.max(n.root,(1-Math.exp(-n.periods/24))*((s.month-n.firstDelivery)/(s.month-n.firstDelivery+48))*Math.sqrt(n.fitSum/n.received));
 const shipment={id:shipmentId,month:s.month,to,count:request,parts};s.shipments.push(shipment);
 if(s.mode!=='normal'&&config(to).level==='町'){
  let choice=draw(s,shipmentId+':lot')*request,part=parts.at(-1);for(const p of parts){choice-=p.count;if(choice<0){part=p;break;}}
  s.pending.push({kind:'encounter',due:s.month+1+Math.floor(draw(s,shipmentId+':lag')*6),sourceId:part.eventId,releaseId:part.releaseId,to,shipmentId,count:request,receivedMonth:s.month});
 }
}
function distribute(s){
 const available=NODES.filter(n=>s.nodes[n.id].trading&&s.nodes[n.id].tradingSince<s.month).map(n=>n.id),other=available.filter(id=>id!=='town'),index=Math.floor(s.month/3)-1;
 if(s.policy==='local'||!other.length)send(s,'town',3);
 else if(s.policy==='mixed'){send(s,'town',1);send(s,other[index%other.length],2);}
 else send(s,available[index%available.length],3);
}
function encounter(s,t){
 const n=s.nodes[t.to],p=s.releases[t.releaseId-1].product,profile=GUEST_PROFILES[config(t.to).role],fit=affinity(config(t.to),p).fit,age=s.month-t.receivedMonth;
 const probability=profile.rate*(.5+.5*fit)*(.7+.3*n.root)*(7-age)/6*(.5+.5*(1-Math.exp(-t.count/4))),roll=draw(s,t.shipmentId+':encounter');
 const skip=s.month-(s.lastEncounter[t.to]??-1000)<6?'cooldown':s.events.filter(e=>e.type==='rumor'&&s.month-e.month<12).length>=4?'annual-cap':null;
 s.attempts.push({type:'encounter',month:s.month,sourceId:t.sourceId,probability,roll,fit,root:n.root,age,skip});if(skip||roll>=probability)return;
 let selection=draw(s,t.shipmentId+':guest'),guest=profile.guests.at(-1);for(const g of profile.guests){selection-=g[1];if(selection<0){guest=g;break;}}
 const [kind,,destinations]=guest,to=destinations[Math.floor(draw(s,t.shipmentId+':target')*destinations.length)],targetFit=affinity(config(to),p).fit;
 const e=event(s,'rumor',{sourceId:t.sourceId,releaseId:t.releaseId,from:t.to,to,actor:KINDS[kind],kind,probability,roll,fit,root:n.root,targetFit});s.lastEncounter[t.to]=s.month;
 s.packets.push({sourceId:e.id,releaseId:t.releaseId,to,from:t.to,due:s.month+1+Math.floor(draw(s,t.shipmentId+':travel')*6),strength:(.08+.08*(fit+targetFit)/2)/.045,path:[t.to,to],cohort:'chance:'+t.shipmentId,channel:'chance',hops:0});
}
function edgeOpen(s,e,packet){
 if(['sns','sns-forward','space'].includes(e.channel))return false;
 if(e.channel==='road')return true;
 const p=s.releases[packet.releaseId-1].product,n=s.nodes[e.from];
 if(config(e.from).level==='町'){
  if(packet.channel!=='direct')return false;
  if(e.channel==='rooted')return n.root>=.12;
  if(e.channel==='curated')return p.age>=36&&affinity(config(e.to),p).fit>=.45;
  if(e.channel==='taste')return affinity(config(e.to),p).fit>=.3;
  return true;
 }
 return n.awareness>=.07;
}
function arrive(s,p){
 const key=p.cohort+':'+p.to;if(s.seen[key])return;s.seen[key]=true;
 const n=s.nodes[p.to],product=s.releases[p.releaseId-1].product,fit=affinity(config(p.to),product).fit;
 n.awareness=clamp(n.awareness+.045*p.strength*(1-n.awareness));n.firstArrival??=s.month;
 const e=event(s,'arrival',{sourceId:p.sourceId,releaseId:p.releaseId,from:p.from,to:p.to,path:p.path,channel:p.channel,strength:p.strength,fit,cohort:p.cohort});s.arrivals.push(e);
 if(hasResponses(s))react(s,e,fit,p.strength);
 let edges=EDGES.filter(x=>x.from===p.to&&!p.path.includes(x.to)&&config(x.to)&&edgeOpen(s,x,p));
 if(p.channel==='chance')edges=p.hops<1?edges.filter(x=>config(x.to).level!=='町').sort((a,b)=>b.weight-a.weight).slice(0,1):[];
 if(p.channel==='shared')edges=[];
 for(const edge of edges){const strength=p.strength*edge.weight*(.95+.1*draw(s,p.cohort+':'+edge.from+':'+edge.to));if(strength<.002)continue;s.packets.push({...p,sourceId:e.id,from:p.to,to:edge.to,path:[...p.path,edge.to],due:s.month+edge.delay,strength,hops:p.hops+1,channel:p.channel==='chance'?'chance':'road'});}
}
function reactionTrial(s,e,kind,probability){const roll=draw(s,`${e.cohort}:${e.to}:${kind}`);s.attempts.push({type:kind,month:s.month,sourceId:e.id,probability,roll,skip:null});return roll<probability;}
function react(s,e,fit,strength){
 const signal=Math.min(1,strength),n=s.nodes[e.to];
 if(reactionTrial(s,e,'memory',signal*(.18+.42*fit))){
  const m=event(s,'memory',{sourceId:e.id,releaseId:e.releaseId,to:e.to,detail:['名前','ビン','風味'][Math.floor(draw(s,e.cohort+':detail:'+e.to)*3)]});
  if(s.mode==='memory'&&s.memories.filter(x=>!x.retired).length<PARAMETERS.memoryLimit){s.memories.push({id:'m'+(s.memories.length+1),sourceId:m.id,releaseId:e.releaseId,to:e.to,createdMonth:s.month,due:s.month+24+Math.floor(draw(s,e.cohort+':memoryDelay:'+e.to)*577),fit,retired:false,resurfaced:false});}
 }
 if(reactionTrial(s,e,'interest',signal*(.12+.5*fit))){const a=event(s,'interest',{sourceId:e.id,releaseId:e.releaseId,to:e.to});const causalKey=e.cohort+':'+e.to;n.interest=clamp(n.interest+.08*fit);n.firstInterest??=s.month;n.discovered=true;
  if(reactionTrial(s,e,'visit',.14+.18*fit))s.pending.push({kind:'visit',causalKey,sourceId:a.id,releaseId:e.releaseId,to:e.to,due:s.month+3+Math.floor(draw(s,e.cohort+':visitDelay:'+e.to)*36)});
  if(reactionTrial(s,e,'inquiry',.2+.3*fit))s.pending.push({kind:'inquiry',causalKey,sourceId:a.id,releaseId:e.releaseId,to:e.to,due:s.month+1+Math.floor(draw(s,e.cohort+':inquiryDelay:'+e.to)*24)});
 }
 if(reactionTrial(s,e,'share',signal*(.08+.2*fit))&&e.channel!=='shared'){
  const targets=EDGES.filter(x=>x.from===e.to&&config(x.to)&&!['sns','sns-forward','space'].includes(x.channel)&&!e.path.includes(x.to));
  if(targets.length){const edge=targets[Math.floor(draw(s,e.cohort+':shareTarget:'+e.to)*targets.length)],a=event(s,'share',{sourceId:e.id,releaseId:e.releaseId,from:e.to,to:edge.to});s.packets.push({sourceId:a.id,releaseId:e.releaseId,from:e.to,to:edge.to,due:s.month+edge.delay,strength:signal*.3,path:[...e.path,edge.to],cohort:e.cohort,channel:'shared',hops:0});}
 }
}
function response(s,t){
 const n=s.nodes[t.to];n.discovered=true;n.contact=true;
 if(t.kind==='visit'){n.visits++;event(s,'visit',{sourceId:t.sourceId,releaseId:t.releaseId,from:t.to,to:'distillery'});return;}
 if(t.kind==='inquiry'){
  n.inquiries++;const e=event(s,'inquiry',{sourceId:t.sourceId,releaseId:t.releaseId,to:t.to});
  s.pending.push({kind:'trade',causalKey:t.causalKey,sourceId:e.id,releaseId:t.releaseId,to:t.to,due:s.month+6+Math.floor(draw(s,t.causalKey+':agreementDelay')*24)});return;
 }
 if(t.kind==='trade'&&!n.trading){
  const p=s.releases[t.releaseId-1].product,fit=affinity(config(t.to),p).fit,probability=.12+.45*fit,roll=draw(s,t.causalKey+':agreement');
  const skip=s.inventory<2?'no-stock':s.policy==='local'?'local-policy':n.interest<.015?'interest-faded':null;
  s.attempts.push({type:'trade',month:s.month,sourceId:t.sourceId,probability,roll,fit,skip});
  if(!skip&&roll<probability){n.trading=true;n.tradingSince=s.month;const e=event(s,'trade',{sourceId:t.sourceId,releaseId:t.releaseId,to:t.to,probability,roll,fit});s.trades.push(e);}
 }
}
function memories(s){for(const m of s.memories){if(m.retired||m.due>s.month)continue;m.retired=true;const memoryKey=m.releaseId+':'+m.to+':'+m.createdMonth,n=s.nodes[m.to],probability=.35+.35*m.fit+.15*Math.min(1,n.awareness),roll=draw(s,memoryKey+':return');s.attempts.push({type:'resurface',month:s.month,sourceId:m.sourceId,probability,roll,skip:null});if(roll>=probability)continue;
 m.resurfaced=true;const e=event(s,'resurface',{sourceId:m.sourceId,releaseId:m.releaseId,to:m.to,memoryId:m.id,age:s.month-m.createdMonth,probability,roll});
 // One later action per seed, at a later month; no recursive memory creation.
 const kind=draw(s,memoryKey+':returnKind')<.5?'visit':'inquiry';s.pending.push({kind,causalKey:'memory:'+memoryKey,sourceId:e.id,releaseId:m.releaseId,to:m.to,due:s.month+1+Math.floor(draw(s,memoryKey+':returnDelay')*12)});
}}
export function step(s){
 if(s.month>=PARAMETERS.maxMonths)return s;s.month++;
 for(const n of Object.values(s.nodes)){n.interest*=.996;if(n.lastDelivery!==null&&s.month-n.lastDelivery>24)n.root*=.9997;}
 for(const b of s.barrels.filter(b=>b.due<=s.month))release(s,b);s.barrels=s.barrels.filter(b=>b.due>s.month);
 if(s.month%18===0)fill(s);
 // Decisions already pending can finish; today's arrivals cannot trade today.
 const due=s.pending.filter(x=>x.due<=s.month);s.pending=s.pending.filter(x=>x.due>s.month);
 for(const t of due)t.kind==='encounter'?encounter(s,t):response(s,t);
 if(s.month%3===0)distribute(s);
 const packets=s.packets.filter(x=>x.due<=s.month);s.packets=s.packets.filter(x=>x.due>s.month);
 packets.sort((a,b)=>a.due-b.due||b.strength-a.strength||a.to.localeCompare(b.to)||a.sourceId.localeCompare(b.sourceId));for(const p of packets)arrive(s,p);
 if(s.mode==='memory')memories(s);
 if(s.month%360===0){s.generation++;const e=event(s,'generation',{preservedMemories:s.memories.length,preservedNodes:NODES.length});s.handovers.push(e);}
 return s;
}
export function advance(s,targetMonth){if(!Number.isInteger(targetMonth)||targetMonth<s.month||targetMonth>1200)throw Error('Target month must be current month..1200');while(s.month<targetMonth)step(s);return s;}
export function summarize(s){
 const counts={};for(const e of s.events)counts[e.type]=(counts[e.type]??0)+1;
 const firstOverseas=s.arrivals.find(e=>config(e.to).level==='海外');
 return {month:s.month,years:s.month/12,generation:s.generation,produced:s.produced,inventory:s.inventory,delivered:s.delivered,barrels:s.barrels.length,peakBarrels:s.peakBarrels,counts,firstOverseas:firstOverseas?.month??null,known:NODES.filter(n=>s.nodes[n.id].awareness>=.1).map(n=>n.id),discovered:NODES.filter(n=>s.nodes[n.id].discovered).map(n=>n.id),trading:NODES.filter(n=>s.nodes[n.id].trading).map(n=>n.id),pendingInterest:NODES.filter(n=>s.nodes[n.id].interest>0&&!s.nodes[n.id].trading).map(n=>n.id),localRoot:s.nodes.town.root,longestMemory:Math.max(0,...s.events.filter(e=>e.type==='resurface').map(e=>e.age))};
}
export function validate(s){
 const errors=[],ids=new Set(),eventMap=new Map(),releases=new Set(s.releases.map(r=>r.id));
 for(const e of s.events){if(ids.has(e.id))errors.push('duplicate-event:'+e.id);if(e.sourceId&&!ids.has(e.sourceId))errors.push('missing-prior-source:'+e.id);if(e.releaseId&&!releases.has(e.releaseId))errors.push('missing-release:'+e.id);if(e.sourceId&&eventMap.has(e.sourceId)){const parent=eventMap.get(e.sourceId);if(parent.month>e.month||e.releaseId&&parent.releaseId!==e.releaseId)errors.push('causal-mismatch:'+e.id);}ids.add(e.id);eventMap.set(e.id,e);}
 const stock=s.releases.reduce((n,r)=>n+r.stock,0),shipped=s.shipments.reduce((n,r)=>n+r.count,0),received=Object.values(s.nodes).reduce((n,r)=>n+r.received,0);
 if(s.produced!==s.inventory+s.delivered||stock!==s.inventory||shipped!==s.delivered||received!==s.delivered)errors.push('conservation');
 for(const r of s.releases){const sent=s.shipments.reduce((n,shipment)=>n+shipment.parts.filter(p=>p.releaseId===r.id).reduce((a,p)=>a+p.count,0),0);if(sent+r.stock!==r.count)errors.push('release-conservation:'+r.id);}
 if(s.inventory<0||s.releases.some(r=>r.stock<0))errors.push('negative-stock');
 if(s.peakBarrels>4||s.barrels.length>4)errors.push('barrel-limit');
 for(const m of s.memories)if(!ids.has(m.sourceId)||s.events.filter(e=>e.memoryId===m.id).length>1)errors.push('memory-reference:'+m.id);
 for(const shipment of s.shipments)for(const part of shipment.parts){const e=eventMap.get(part.eventId);if(e?.type!=='shipment'||e.count!==part.count||e.releaseId!==part.releaseId||e.to!==shipment.to||e.month!==shipment.month)errors.push('shipment-event:'+shipment.id);}
 for(const p of [...s.pending,...s.packets])if(!ids.has(p.sourceId)||!releases.has(p.releaseId))errors.push('pending-reference');
 for(const t of s.trades){const parent=s.events.find(e=>e.id===t.sourceId);if(parent?.type!=='inquiry'||parent.month>=t.month)errors.push('trade-without-earlier-inquiry');}
 return {ok:errors.length===0,errors,monthsProcessed:s.month,conservation:{produced:s.produced,inventory:s.inventory,delivered:s.delivered,lotStock:stock,shipmentTotal:shipped,receivedTotal:received},peakBarrels:s.peakBarrels,eventCount:s.events.length,memorySeeds:s.memories.length,activeMemorySeeds:s.memories.filter(m=>!m.retired).length};
}
export function exportLog(s){const payload={schema:'ambertime-town-log/1',labVersion:VERSION,modelVersion:MODEL_VERSION,seed:s.seed,initialConditions:{...copy(s.initial),parameters:PARAMETERS,initialStock:24,initialStockAge:24,initialTrade:'town',salesModel:'not-simulated',remoteTrade:'one abstract representative outlet per region',generationModel:'automatic handover every 360 months'},nodeDefinitions:copy(NODES),settingsHistory:copy(s.settingsHistory),period:{startMonth:0,endMonth:s.month},summary:summarize(s),releases:copy(s.releases),barrelHistory:copy(s.barrelHistory),shipments:copy(s.shipments),events:copy(s.events),arrivals:copy(s.arrivals),memories:copy(s.memories),tradeHistory:copy(s.trades),generations:copy(s.handovers),finalNodes:copy(s.nodes),pending:copy(s.pending),pendingTransmissions:copy(s.packets),trials:copy(s.attempts),validation:validate(s)};payload.checksum=checksum(JSON.stringify(payload));return payload;}
export function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619)>>>0;return h.toString(16).padStart(8,'0');}
export function replay(log){if(log.modelVersion!==MODEL_VERSION)throw Error('Unsupported model version');const s=create(log.initialConditions);for(const setting of log.settingsHistory){advance(s,setting.month);setPolicy(s,setting);}return advance(s,log.period.endMonth);}
export function report(s){const a=summarize(s),major=s.events.filter(e=>['rumor','visit','inquiry','trade','resurface','generation'].includes(e.type));
 const lines=[`AmberTime 街と口コミ ${VERSION}`,`モデル ${MODEL_VERSION} / シード ${s.seed}`,`${date(s.month)}・${s.generation}代目 / ${MODES.find(x=>x.id===s.mode).name}`,`生産 ${s.produced}本 / 納品 ${s.delivered}本 / 在庫 ${s.inventory}本（消費者への販売は未計算）`,'','主な出来事'];
 const chosen=[...major.slice(0,8),...major.slice(-8)].filter((e,i,all)=>all.findIndex(x=>x.id===e.id)===i);for(const e of chosen)lines.push(`${date(e.month)} [${e.id}] ${e.reason}`);
 const unusual=s.events.filter(e=>e.type==='rumor').slice(0,3);lines.push('','偶然の伝播');for(const e of unusual)lines.push(`${date(e.month)} [${e.id} ← ${e.sourceId}] ${e.reason}`);if(!unusual.length)lines.push('この期間に偶然の紹介はありません。');
 lines.push('','長く残った記憶');const oldest=s.events.filter(e=>e.type==='resurface').sort((x,y)=>y.age-x.age).slice(0,3);for(const e of oldest)lines.push(`${date(e.month)} [${e.id} ← ${e.sourceId}] ${e.reason}`);if(!oldest.length)lines.push('この期間に戻った記憶はありません。');
 lines.push('',`地元：酒店へ${s.nodes.town.received}本、関係 ${Math.round(s.nodes.town.root*100)}。`,`取扱いに至っていない関心：${a.pendingInterest.map(name).join('、')||'なし'}`);
 const unfinished=s.events.filter(e=>e.type==='inquiry'&&!s.trades.some(t=>t.sourceId===e.id));lines.push(`取扱いへ直接つながっていない問い合わせ：${unfinished.length}件。`);
 let longest=0,last=0;for(const e of major){longest=Math.max(longest,e.month-last);last=e.month;}longest=Math.max(longest,s.month-last);lines.push(`主な出来事がない最長期間：${date(longest)}。`,`検証：${validate(s).ok?'保存則・参照整合 OK':'不整合あり'}。完全な履歴と不成立の抽選はJSONに含まれます。`);return lines.join('\n');
}
