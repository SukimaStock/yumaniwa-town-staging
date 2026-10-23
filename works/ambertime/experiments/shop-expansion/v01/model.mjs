// Independent experimental driver. Existing chemistry/affinity/rumor code is read-only.
import * as F from '../../../../ambertime-flavor-lab-v02/model.mjs';
import * as T from '../../town-simulation/v01/model.mjs';
import {unit} from '../../reputation/v03/model.mjs';
export const VERSION='ambertime-shop-expansion/1';
export const BASE='d3776bd9e3af6b376c068f78e4c7a0a7178c69a9';
const clone=x=>structuredClone(x),fail=message=>{throw Error(message);};
const defs=[
 ['fruit','果実の香り','plain','long',12,40,'refill',24],
 ['grain','麦の香り','plain','short',30,65,'refill',24],
 ['smoke','煙の香り','peat','long',10,90,'refill',24],
 ['body','厚みのある原酒','plain','long',75,99,'refill',24],
 ['wood','樽香のある果実香','plain','long',12,40,'first',144],
 ['smoke-first','煙・1stフィル','peat','short',40,58,'first',36],
 ['fruit-old','果実香・長期リフィル','plain','long',12,40,'refill',144]
];
// Integer positions are the main full-range 0..99 controls. Native FlavorLab chemistry
// is adopted by main; a separate test compares these profiles to main public operations.
export const FLAVORS=defs.map(([id,name,malt,ferment,start,end,cask,ageMonths])=>{
 const recipe={malt,ferment,start:start/99,end:end/99,cask,collectionVersion:2};
 let s=F.fill(F.initial(),recipe);for(let m=0;m<ageMonths;m+=120)s=F.advance(s,Math.min(120,ageMonths-m));
 const b=s.barrels[0],profile=F.profileFor(b),primary=F.summaryFor(b)[0].key;
 const product={roughness:profile.rough,character:Math.max(profile.fruit,profile.grain,profile.smoke,profile.body),wood:Math.max(profile.wood,profile.vanilla),age:ageMonths,price:30,aromaFamily:primary,label:b.label};
 return {id,name,label:b.label,recipe,ageMonths,profile,product};
});
export const GROUPS=[
 {id:'A',name:'既存3店',shops:['town','super','department']},
 {id:'B',name:'食堂を追加',shops:['town','super','department','diner']},
 {id:'C',name:'バーを追加',shops:['town','super','department','bar']},
 {id:'D',name:'食堂・バーを追加',shops:['town','super','department','diner','bar']},
 {id:'E',name:'専門酒店も追加',shops:['town','super','department','diner','bar','specialist']}
];
export const TIMINGS=[{id:'rotation',name:'四半期6本・1店ずつ交代'},{id:'split',name:'四半期6本・同月に分割（回数増）'},{id:'frequent',name:'毎月2本・1店ずつ交代（回数増）'}];
export const SHOPS=T.NODES.filter(n=>GROUPS[4].shops.includes(n.id));
const shop=id=>SHOPS.find(n=>n.id===id),flavor=id=>FLAVORS.find(f=>f.id===id);
const newShop=id=>['diner','bar','specialist'].includes(id);
export const date=m=>`${Math.floor(m/12)}年${m%12}か月`;
export function fitDetails(id,f){
 const n=shop(id);if(!n||!f)fail('Unknown shop/flavor');
 const a=T.affinity(n,f.product,true),axes=['roughness','character','wood'];
 return {...a,liked:a.fit>=T.MIN_FIT,gaps:axes.map((key,i)=>({key,actual:f.product[key],target:n.taste[i],distance:Math.abs(f.product[key]-n.taste[i])})).sort((a,b)=>b.distance-a.distance||a.key.localeCompare(b.key))};
}
export function flavorAt(s){
 // Deliberate switch after 10 years, then a fixed rotation. Baseline schedule unchanged.
 if(s.options.change==='switch'&&s.month>=120)return flavor(['smoke','grain','body','wood','fruit'][Math.floor((s.month-120)/24)%5]);
 return flavor(s.options.flavor);
}
function options(o){
 const v={seed:o.seed??42,group:o.group??'E',timing:o.timing??'rotation',access:o.access??'open',flavor:o.flavor??'fruit',change:o.change??'same'};
 if(!Number.isInteger(v.seed)||v.seed<1||v.seed>4294967295||!GROUPS.some(g=>g.id===v.group)||!TIMINGS.some(g=>g.id===v.timing)||!['open','discovery'].includes(v.access)||!flavor(v.flavor)||!['same','switch'].includes(v.change))fail('実験条件を確認してください。');return v;
}
function record(s,type,fields){const e={id:'lab-'+(s.events.length+1),month:s.month,type,...fields};s.events.push(e);return e;}
function produce(s){
 const f=flavorAt(s),id=s.lots.length+1;
 T.registerExternalRelease(s.town,{externalId:id,product:f.product,count:24});
 s.lots.push({id,month:s.month,count:24,stock:24,flavorId:f.id});s.produced+=24;
 record(s,'supply',{releaseId:id,text:`第${id}回・${f.name}を比較用在庫に24本加えました。`});
}
export function create(o={}){
 const v=options(o),s={version:VERSION,base:BASE,options:v,month:0,produced:0,town:T.createExternal({seed:v.seed}),lots:[],shipments:[],events:[],handling:{},processedEvents:0,offers:[]};
 for(const id of GROUPS.find(g=>g.id===v.group).shops)s.handling[id]={availableMonth:v.access==='open'||!newShop(id)?0:null,sourceId:null};
 produce(s);return s;
}
// The speaker is the handler reacting to the supplied profile, NOT a drinking customer.
// Flavor component facts and existing fit control the text. No economic side effects.
export function comment(s,id,f,receiptId){
 const d=fitDetails(id,f),p=f.product,axis=d.gaps[0],roll=unit(s.options.seed,'shop-comment:'+receiptId+':'+id),family=f.product.aromaFamily;
 const feature=family==='smoke'?'煙の香り':family==='fruit'?'果実の香り':family==='grain'?'麦の香り':'厚みのある味';
 let lines;
 if(!d.liked){
  if(axis.key==='roughness')lines=p.roughness>axis.target?['この店では、もう少し穏やかな口当たりを探しています。','うちで扱うなら、シゲキはもう少し控えめがよさそうです。']:['この店では、もう少し力強い口当たりを探しています。','うちで扱うなら、もう少しシゲキのある味がよさそうです。'];
  else if(axis.key==='wood')lines=p.wood>axis.target?['うちで扱うなら、樽の香りはもう少し控えめがよさそうです。']:['この店では、もう少し樽の香りがある味を探しています。'];
  else lines=p.character>axis.target?['この店では、原酒の香りがもう少し控えめな味を探しています。']:['この店では、原酒の個性がもう少しはっきりした味を探しています。'];
 }else{
  const context=id==='diner'?'食事に合わせる候補として、':id==='bar'?'うちで出す候補として、':'うちで扱う候補として、';
  const woody=p.wood>=.45;
  lines=woody?[`${context}この樽の香りは好みに合います。`,'この原酒と樽の香りの組み合わせ、うちに合いそうです。']:[`${context}この${feature}は好みに合います。`,`この${feature}、うちでも紹介してみたいです。`];
 }
 return {text:lines[Math.floor(roll*lines.length)],speaker:'取扱担当者',liked:d.liked,feature:!d.liked?axis.key:p.wood>=.45?'wood':family};
}
function contacts(s){
 const events=s.town.events.slice(s.processedEvents);s.processedEvents=s.town.events.length;
 for(const e of events){
  // Inquiries are actual Town simulation events with earlier interest. No time-only unlock.
  if(e.type!=='inquiry'||!newShop(e.to)||!s.handling[e.to]||s.handling[e.to].availableMonth!==null||s.offers.some(o=>o.to===e.to))continue;
  const offer=record(s,'offer',{to:e.to,sourceId:e.id,releaseId:e.releaseId,text:`${shop(e.to).name}から取扱いの問い合わせがありました。`});
  // Experimental policy: accept an offer next month; main approval/conditions unchanged.
  s.offers.push({to:e.to,due:s.month+1,sourceId:offer.id});
 }
 for(const o of s.offers.filter(o=>o.due===s.month)){
  s.handling[o.to]={availableMonth:s.month,sourceId:o.sourceId};
  record(s,'handling',{to:o.to,sourceId:o.sourceId,text:`${shop(o.to).name}の申し出を受けました。納品は次の配分からです。`});
 }
}
function send(s,to,count,receiptId){
 let remaining=count;const total=s.lots.reduce((n,l)=>n+l.stock,0);if(total<count)fail('Insufficient experimental supply');
 for(const lot of s.lots){if(!remaining)break;if(!lot.stock||lot.month>=s.month)continue;
  const q=Math.min(remaining,lot.stock),f=flavor(lot.flavorId),id=receiptId+(q<count?':lot:'+lot.id:'');
  T.receiveExternal(s.town,{receiptId:id,releaseId:lot.id,to,count:q});lot.stock-=q;remaining-=q;
  const c=comment(s,to,f,id),receipt={id,month:s.month,to,releaseId:lot.id,count:q,flavorId:f.id,comment:c.text,speaker:c.speaker,liked:c.liked,feature:c.feature};s.shipments.push(receipt);
  record(s,'shipment',{to,releaseId:lot.id,receiptId:id,count:q,text:`${shop(to).name}へ第${lot.id}回を${q}本届けました。`});
 }
 if(remaining)fail('Release-month stock cannot ship');
}
function distribute(s){
 const timing=s.options.timing,interval=timing==='frequent'?1:3;if(s.month%interval)return;
 const ids=GROUPS.find(g=>g.id===s.options.group).shops.filter(id=>s.handling[id].availableMonth!==null&&s.handling[id].availableMonth<s.month),slot=s.month/interval-1,total=timing==='frequent'?2:6;
 // Existing stores are initially available, so matched quantity/frequency never waits on discovery.
 if(timing!=='split')send(s,ids[slot%ids.length],total,'receipt:'+slot);
 else {const allocation=new Map();for(let i=0;i<total;i++){const id=ids[(slot+i)%ids.length];allocation.set(id,(allocation.get(id)??0)+1);}let part=0;for(const[id,q]of allocation)send(s,id,q,'receipt:'+slot+':part:'+(part++));}
}
export function step(s){
 if(s.month>=360)return s;s.month++;T.advanceExternal(s.town,s.month);contacts(s);
 if(s.month%12===0)produce(s);distribute(s);return s;
}
export function advance(s,target){if(!Number.isInteger(target)||target<s.month||target>360)fail('期間は現在から30年までです。');while(s.month<target)step(s);return s;}
export function shopView(s,id){
 const n=s.town.nodes[id],h=s.handling[id];if(!h)fail('Shop outside selected condition');
 const ds=s.shipments.filter(x=>x.to===id),last=ds.at(-1),settled=n.root>=.18&&n.interest>=.04;
 let status=h.availableMonth===null?(n.inquiries?'問い合わせあり':n.firstInterest!==null?'関心あり':n.firstArrival!==null?'口コミ到着':'まだ接点なし'):ds.length?settled?'関係が続いている':'納品あり':'納品前';
 return {id,name:shop(id).name,status,received:ds.reduce((n,d)=>n+d.count,0),deliveries:ds.length,firstHandling:h.availableMonth,firstDelivery:ds[0]?.month??null,firstInterest:n.firstInterest,inquiries:n.inquiries,visits:n.visits,lastComment:last?.comment??null,liked:last?.liked??null,settled,history:clone(ds),events:s.events.filter(e=>e.to===id).map(e=>({month:e.month,text:e.text}))};
}
export function summary(s){
 const first=level=>s.town.arrivals.find(e=>T.NODES.find(n=>n.id===e.to)?.level===level)?.month??null;
 const counts={};for(const e of s.town.events)counts[e.type]=(counts[e.type]??0)+1;
 const meaningful=s.town.events.filter(e=>['interest','inquiry','visit','rumor'].includes(e.type)),months=[0,...meaningful.map(e=>e.month).sort((a,b)=>a-b),s.month];
 const quietMonths=Math.max(...months.slice(1).map((m,i)=>m-months[i]));
 return {month:s.month,produced:s.produced,delivered:s.shipments.reduce((n,d)=>n+d.count,0),inventory:s.lots.reduce((n,l)=>n+l.stock,0),receiptCount:s.shipments.length,counts,firstReach:{near:first('周辺地域'),national:first('全国'),overseas:first('海外')},quietMonths,shops:Object.keys(s.handling).map(id=>shopView(s,id)),recentEvents:[...s.events.filter(e=>e.type==='handling'),...T.newsEvents(s.town).filter(e=>['arrival','interest','rumor','inquiry','visit'].includes(e.type)).map(e=>({month:e.month,text:e.reason,sourceId:e.sourceId}))].sort((a,b)=>b.month-a.month).slice(0,12),regions:T.NODES.filter(n=>n.level!=='町').map(n=>({id:n.id,name:n.name,level:n.level,firstArrival:s.town.nodes[n.id].firstArrival,firstInterest:s.town.nodes[n.id].firstInterest,inquiries:s.town.nodes[n.id].inquiries,visits:s.town.nodes[n.id].visits}))};
}
export function validate(s){
 const errors=[],ids=new Set();let sent=0;
 for(const d of s.shipments){if(ids.has(d.id))errors.push('duplicate-receipt');ids.add(d.id);const l=s.lots[d.releaseId-1],h=s.handling[d.to];if(!l||l.month>=d.month||!h||h.availableMonth===null||h.availableMonth>=d.month)errors.push('invalid-shipment');if(d.count<1||!Number.isInteger(d.count)||d.flavorId!==l?.flavorId)errors.push('invalid-profile');sent+=d.count;}
 if(s.produced!==sent+s.lots.reduce((n,l)=>n+l.stock,0)||s.lots.some(l=>l.stock<0))errors.push('conservation');
 for(const l of s.lots)if(l.count!==l.stock+s.shipments.filter(d=>d.releaseId===l.id).reduce((n,d)=>n+d.count,0))errors.push('lot-conservation');
 if(s.town.shipments.length!==s.shipments.length||s.town.shipments.reduce((n,d)=>n+d.count,0)!==sent)errors.push('town-receipt-mismatch');
 for(const id of Object.keys(s.handling)){const h=s.handling[id];if(h.availableMonth&&s.options.access==='discovery'&&newShop(id)){const a=s.events.find(e=>e.id===h.sourceId),p=s.town.events.find(e=>e.id===a?.sourceId);if(a?.type!=='offer'||p?.type!=='inquiry'||p.to!==id||a.month>=h.availableMonth)errors.push('offer-provenance');}}
 return {ok:!errors.length,errors};
}
export function checksum(x){let h=2166136261;for(const c of JSON.stringify(x))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h.toString(16).padStart(8,'0');}
export function exportLog(s){const log={schema:VERSION,base:BASE,options:clone(s.options),month:s.month,assumptions:{supply:'prepared24/year; no finance or cask-capacity simulation',capacity:'equal experimental receipt budget; no main shop minimum/cap/order simulation',sales:'not simulated',handling:'new shops: actual inquiry then automatic experimental consent next month',affinity:'Town external taste+existing aroma; no age/price weighting'},flavors:clone(FLAVORS),summary:summary(s),lots:clone(s.lots),shipments:clone(s.shipments),handling:clone(s.handling),events:clone(s.events),townEvents:clone(s.town.events),arrivals:clone(s.town.arrivals),trials:clone(s.town.attempts),finalNodes:clone(s.town.nodes),validation:validate(s)};log.checksum=checksum(log);return log;}
export function replay(log){if(log?.schema!==VERSION||log.base!==BASE||!Number.isInteger(log.month)||log.month<0||log.month>360)fail('このLabの記録を選んでください。');const {checksum:claimed,...payload}=log;if(checksum(payload)!==claimed)fail('JSONの記録が変わっています。');const s=advance(create(log.options),log.month);if(exportLog(s).checksum!==claimed)fail('記録と再現結果が一致しません。');return s;}
