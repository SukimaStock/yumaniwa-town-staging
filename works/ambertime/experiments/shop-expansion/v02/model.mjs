import {FLAVORS as ORIGINAL_FLAVORS} from '../v01/model.mjs';
import * as F from '../../../../ambertime-flavor-lab-v02/model.mjs';
const choice={malt:'plain',ferment:'long',cask:'refill',start:13/99,end:41/99,collectionVersion:2},barrel=F.advance(F.fill(F.initial(),choice),24).barrels[0],profile=F.profileFor(barrel);
const FLAVORS=[...ORIGINAL_FLAVORS,{id:'fruit-near',name:'果実香・採取13–41',label:barrel.label,recipe:choice,ageMonths:24,profile,product:{roughness:profile.rough,character:Math.max(profile.fruit,profile.grain,profile.smoke,profile.body),wood:Math.max(profile.wood,profile.vanilla),age:24,price:30,aromaFamily:F.summaryFor(barrel)[0].key,label:barrel.label}}];
import {normalShopOrders,planShopFulfillment} from '../../../shop-demand.mjs';
import {SHOPS as MAIN_SHOPS} from '../../../shop-model.mjs';
import * as T from '../../town-simulation/v01/model.mjs';
import * as R from './rumor.mjs';
export {FLAVORS};export const RUMORS=R.RUMORS;
export const BASE='70d618067ee2e79685587998deb391ae52b7c87b',VERSION='ambertime-relationship/2';
export const MODES=[{id:'A',name:'A ブランド単位'},{id:'B',name:'B 発売回を選ぶ'},{id:'C',name:'C 近い味を継続'},{id:'D',name:'混合：酒店・スーパーA／味の店B'},{id:'E',name:'B+ 同じ製法の次回を一度承認'}];
export const SCENARIOS=[{id:'same',name:'同じ製法を継続'},{id:'change',name:'10年後から別の味'},{id:'parallel',name:'複数の味を並行'},{id:'shortage',name:'供給不足と空白'},{id:'inquiry',name:'口コミから新しい店'},{id:'variation',name:'近い採取位置へ変更'}];
export const POLICIES=[{id:'wait',name:'品切れは待つ（代行しない）'},{id:'renew',name:'同じ製法だけ選び直す（代行）'},{id:'propose',name:'同製法の更新＋2年ごとに新発売を提案（代行）'}];
export const STORES=[...MAIN_SHOPS.map(n=>({...n,node:({'town-liquor':'town',supermarket:'super',department:'department'})[n.id],native:true})),...['diner','bar','specialist'].map(id=>({id,node:id,name:T.NODES.find(n=>n.id===id).name,minAge:0,maxRoughness:null,minQuantity:1,monthlyLimit:6,native:false}))];
const f=id=>FLAVORS.find(f=>f.id===id),store=id=>STORES.find(n=>n.id===id),clone=x=>structuredClone(x),assert=(b,m)=>{if(!b)throw Error(m);};
const recipeKey=p=>JSON.stringify([p.recipe.malt,p.recipe.ferment,p.recipe.cask,p.recipe.start,p.recipe.end,p.ageMonths]);
export function near(a,b,limit=.12){if(a.product.aromaFamily!==b.product.aromaFamily)return false;return ['fruit','grain','smoke','body','rough','wood','vanilla','spice'].every(k=>Math.abs(a.profile[k]-b.profile[k])<=limit)&&['roughness','character','wood'].every(k=>Math.abs(a.product[k]-b.product[k])<=limit);}
function mode(s,id){return s.options.mode==='D'?['town-liquor','supermarket'].includes(id)?'A':'B':s.options.mode;}
function fact(s,type,fields){s.events.push({id:'v2-'+(s.events.length+1),month:s.month,type,...fields});}
function decision(s,to,kind,text,fields={}){const d={id:'d'+(s.decisions.length+1),month:s.month,to,kind,text,...fields};s.decisions.push(d);return d;}
function eligible(l,n,month){const p=f(l.flavorId).product;return l.month<month&&p.age>=n.minAge&&(n.maxRoughness===null||p.roughness<=n.maxRoughness);}
function supplyFlavor(s,index){const c=s.options.scenario;if(c==='variation')return index%2?'fruit-near':'fruit';if(c==='same'||c==='shortage'||c==='inquiry')return 'smoke';if(c==='change')return s.month<120?'smoke':'fruit';return ['fruit','smoke','grain','smoke-first','wood','body'][index%6];}
function supply(s){
 if(s.options.scenario==='shortage'&&(s.month>=120&&s.month<180||s.month%24!==0))return;
 const parallel=s.options.scenario==='parallel';for(let part=0;part<(parallel?2:1);part++){const id=s.lots.length+1,flavorId=supplyFlavor(s,id-1),count=s.options.scenario==='shortage'?12:parallel?96:192;
 s.lots.push({id,month:s.month,flavorId,count,stock:count});s.produced+=count;
 R.register(s.reaction,{externalId:id,count,product:f(flavorId).product});fact(s,'release',{releaseId:id,text:`発売#${id} ${f(flavorId).name}・${count}本（準備済み供給）`});}
}
// Shape fixture for read-only ordinary-shop projections, not a complete playable save.
export function nativeState(s,reference=false,allowed=null){const lots=s.lots,products=lots.filter(l=>!allowed||allowed.has(l.id)).map(l=>({id:l.id,stock:reference?l.count:l.stock,age:f(l.flavorId).ageMonths,...f(l.flavorId).product,type:f(l.flavorId).recipe.cask==='first'?'bourbon':'refill',cut:.5,price:30}));return {seed:s.options.seed,core:{month:s.month,products},releases:lots.map(l=>({id:l.id,productId:l.id,brandId:1,listed:true,bottledMonth:l.month,age:f(l.flavorId).ageMonths,profile:{...f(l.flavorId).product,type:f(l.flavorId).recipe.cask==='first'?'bourbon':'refill',cut:.5}})),productsById:Object.fromEntries(lots.map(l=>[l.id,{listed:true,listedMonth:l.month}])),shop:{relations:['town-liquor','supermarket'].map(shopId=>({shopId,brandId:1,startedMonth:reference?0:s.relations[shopId]?.openedMonth??0})),deliveries:s.shipments.map(d=>({shopId:d.to,month:d.month,count:d.count,productId:d.releaseId}))}};}
function target(s,id){const rel=s.relations[id];if(!rel||mode(s,id)==='A')return null;return s.lots.find(l=>l.id===rel.selectedId);}
function approve(s,id,releaseId,kind='select'){
 const n=store(id),l=s.lots.find(l=>l.id===releaseId);assert(l&&eligible(l,n,s.month),'発売翌月から条件を満たす発売回を選びます。');
 const before=s.relations[id];s.relations[id]={anchorId:releaseId,selectedId:releaseId,openedMonth:before?.openedMonth??s.month,lastEmpty:null};decision(s,id,kind,`${n.name}へ発売#${releaseId}を選びました。`,{releaseId});
}
export function selectRelease(s,id,releaseId){assert(store(id)&&id!=='department'&&s.relations[id],'通常店の発売回を選びます。');approve(s,id,releaseId,'manual-select');s.actions.push({month:s.month,to:id,releaseId});return s;}
function openAndRenew(s){
 for(const n of STORES.filter(n=>n.id!=='department')){
  if(!s.relations[n.id]){
   let l;
   if(s.options.scenario==='inquiry'&&!['town-liquor','supermarket'].includes(n.id)){
    const e=s.reaction.town.events.find(e=>e.type==='inquiry'&&e.to===n.node&&!s.usedInquiries.includes(e.id));if(e){s.usedInquiries.push(e.id);l=s.lots.find(l=>l.id===e.releaseId);if(l&&eligible(l,n,s.month)){decision(s,n.id,'accept-inquiry',`${n.name}の発売#${l.id}への問い合わせを受けました。`,{sourceId:e.id,releaseId:l.id});}}
   }else l=s.lots.find(l=>eligible(l,n,s.month)&&(n.id!=='bar'||f(l.flavorId).product.aromaFamily==='smoke'));
   if(l){s.relations[n.id]={anchorId:l.id,selectedId:l.id,openedMonth:s.month,lastEmpty:null};decision(s,n.id,'accept',`${n.name}の取扱いを承認しました。`,{releaseId:l.id});if(['C','E'].includes(mode(s,n.id)))decision(s,n.id,'continuation-consent',mode(s,n.id)==='C'?'基準の近い味も継続することを承認しました。':'同じ製法の次回も継続することを承認しました。',{releaseId:l.id});if(mode(s,n.id)!=='A')decision(s,n.id,'initial-select',`発売#${l.id}を扱ってもらいます。`,{releaseId:l.id});}
   continue;
  }
  if(mode(s,n.id)==='A')continue;const free=l=>l?Math.max(0,l.stock-(s.department?.releaseId===l.id?5:0)):0;const rel=s.relations[n.id],old=target(s,n.id),anchor=f(s.lots[rel.anchorId-1].flavorId);
  if(['C','E'].includes(mode(s,n.id))){
   if(free(old)<n.minQuantity){const l=s.lots.find(l=>free(l)>=n.minQuantity&&eligible(l,n,s.month)&&(mode(s,n.id)==='E'?recipeKey(anchor)===recipeKey(f(l.flavorId)):near(anchor,f(l.flavorId),s.options.threshold))); if(l&&l.id!==rel.selectedId){rel.selectedId=l.id;fact(s,'auto-near',{to:n.id,releaseId:l.id,text:`${n.name}は${mode(s,n.id)==='E'?'同じ製法の':'基準の味に近い'}発売#${l.id}を継続候補として発送します。`});}}
  }else if(s.options.policy!=='wait'&&free(old)<n.minQuantity){const l=s.lots.find(l=>free(l)>=n.minQuantity&&eligible(l,n,s.month)&&recipeKey(f(l.flavorId))===recipeKey(anchor));if(l&&l.id!==rel.selectedId){rel.selectedId=l.id;decision(s,n.id,'renew',`${n.name}へ同じ製法の発売#${l.id}を選び直しました。`,{releaseId:l.id});}}
  if(s.options.policy==='propose'&&s.month%24===1){const l=[...s.lots].reverse().find(l=>l.stock>0&&eligible(l,n,s.month));if(l&&l.id!==rel.selectedId)approve(s,n.id,l.id,'propose');}
 }
}
function send(s,n,l,count,unitPrice=0){
 assert(count>0&&count<=l.stock&&eligible(l,n,s.month),'Invalid experimental shipment');l.stock-=count;
 const rel=s.relations[n.id],anchor=rel&&s.lots[rel.anchorId-1],similar=!anchor||near(f(anchor.flavorId),f(l.flavorId),s.options.threshold),liked=T.affinity(T.NODES.find(x=>x.id===n.node),f(l.flavorId).product,true).fit>=T.MIN_FIT;
 const d={id:'shipment:'+s.shipments.length,month:s.month,to:n.id,node:n.node,releaseId:l.id,flavorId:l.flavorId,count,unitPrice,anchorId:anchor?.id??l.id,similar,liked};s.shipments.push(d);return d;
}
export function create(o={}){const options={seed:o.seed??42,mode:o.mode??'B',scenario:o.scenario??'parallel',policy:o.policy??'renew',rumor:o.rumor??'pooled',threshold:o.threshold??.12};assert(Number.isInteger(options.seed)&&options.seed>=1&&options.seed<=4294967295&&MODES.some(x=>x.id===options.mode)&&SCENARIOS.some(x=>x.id===options.scenario)&&POLICIES.some(x=>x.id===options.policy)&&RUMORS.some(x=>x.id===options.rumor)&&[.06,.12,.18].includes(options.threshold),'実験条件を確認してください。');const s={version:VERSION,options,month:0,produced:0,lots:[],shipments:[],relations:{},decisions:[],orders:[],events:[],actions:[],usedInquiries:[],reaction:R.createReaction(options.seed),department:null,departmentUsed:[]};supply(s);return s;}
export function step(s){if(s.month>=360)return s;s.month++;R.advanceReaction(s.reaction,s.month);openAndRenew(s);
 // Explicit department spot proposal, once for a new eligible release, next-month five held.
 if(!s.department&&s.month%12===1){const n=store('department'),l=[...s.lots].reverse().find(l=>l.stock>=5&&eligible(l,n,s.month)&&!s.departmentUsed.includes(l.id));if(l){s.department={releaseId:l.id,due:s.month+1};s.departmentUsed.push(l.id);decision(s,n.id,'department-spot',`発売#${l.id}を翌月5本届ける案を承認しました。`,{releaseId:l.id});}}
 const start=s.shipments.length;let held=s.department?{[s.department.releaseId]:5}:{};
 if(s.department?.due===s.month){const l=s.lots[s.department.releaseId-1];send(s,store('department'),l,5);s.department=null;held={};}
 const tape=normalShopOrders(nativeState(s,true),s.month);
 for(const n of STORES.filter(n=>n.id!=='department')){
  if(!s.relations[n.id]||s.relations[n.id].openedMonth>=s.month)continue;
  const order=tape.find(o=>o.shopId===n.id)??{shopId:n.id,month:s.month,count:Math.min(3,n.monthlyLimit),profileProductId:s.lots.at(-1).id,reason:'fixed-experimental-request'};
  const rel=s.relations[n.id],selected=target(s,n.id),allow=mode(s,n.id)==='A'?null:new Set(selected?[selected.id]:[]);let lines=[],reason;
  if(n.native){const plan=planShopFulfillment(nativeState(s,false,allow),s.month,order,{heldCounts:held});lines=plan.shipments.map(x=>({l:s.lots[x.productId-1],count:x.count,unitPrice:x.unitPrice}));reason=plan.reason;}
  else{let remaining=Math.min(order.count,n.monthlyLimit);for(const l of s.lots.filter(l=>eligible(l,n,s.month)&&(!allow||allow.has(l.id)))){const q=Math.min(Math.max(0,l.stock-(held[l.id]??0)),remaining);if(q<n.minQuantity)continue;lines.push({l,count:q,unitPrice:0});remaining-=q;}reason=remaining?'target-stock-unavailable':'fulfilled';}
  const q=lines.reduce((sum,l)=>sum+l.count,0);for(const line of lines)send(s,n,line.l,line.count,line.unitPrice);
  const row={month:s.month,to:n.id,requested:order.count,shipped:q,unmet:Math.max(0,order.count-q),referenceId:order.profileProductId,selectedId:rel.selectedId,reason:q===order.count?reason:mode(s,n.id)!=='A'&&!selected?.stock?'selected-stock-empty':reason};s.orders.push(row);
  if(order.count>q&&mode(s,n.id)!=='A'&&rel.lastEmpty!==rel.selectedId){rel.lastEmpty=rel.selectedId;decision(s,n.id,'stock-check',`${n.name}の発売#${rel.selectedId}は発送を見送りました。次の入荷を待つか、選び直せます。`,{releaseId:rel.selectedId});}
 }
 R.receiveBatch(s.reaction,s.shipments.slice(start).map(d=>({...d,to:d.node})),s.options.rumor);R.finishMonth(s.reaction,s.options.rumor);
 // New stock enters after this month's dispatch, never funds an earlier order.
 if(s.month%12===0)supply(s);return s;}
export function advance(s,target){assert(Number.isInteger(target)&&target>=s.month&&target<=360,'期間は現在から30年までです。');while(s.month<target)step(s);return s;}
export const reasonText=code=>({'fulfilled':'注文分を発送しました。','zero-demand':'今月は注文なし。','no-eligible-release':'対象の発売回はまだありません。','insufficient-stock':'必要な在庫が足りません。','minimum-lot':'1発売回の最低本数に届きません。','stock-or-capacity':'在庫または受入上限の制約です。','selected-stock-empty':'選んだ発売回の在庫を待っています。','target-stock-unavailable':'選んだ味の在庫が足りません。','no-record':'処理記録はまだありません。'})[code]??code;
export function summary(s){const first=level=>s.reaction.town.arrivals.find(e=>T.NODES.find(n=>n.id===e.to)?.level===level)?.month??null;const meaningful=[0,...s.reaction.town.events.filter(e=>['interest','inquiry','visit','rumor'].includes(e.type)).map(e=>e.month),s.month].sort((a,b)=>a-b),quietMonths=Math.max(...meaningful.slice(1).map((m,i)=>m-meaningful[i]));const counts={};for(const e of s.reaction.town.events)counts[e.type]=(counts[e.type]??0)+1;return {month:s.month,produced:s.produced,delivered:s.shipments.reduce((n,d)=>n+d.count,0),inventory:s.lots.reduce((n,l)=>n+l.stock,0),decisions:s.decisions.filter(d=>d.kind!=='stock-check').length,checks:s.decisions.filter(d=>d.kind==='stock-check').length,mismatch:s.shipments.filter(d=>!d.similar).reduce((n,d)=>n+d.count,0),skipped:s.orders.filter(o=>o.unmet>0).length,firstReach:{near:first('周辺地域'),national:first('全国'),overseas:first('海外')},quietMonths,counts,shops:STORES.map(n=>{const r=s.relations[n.id],ds=s.shipments.filter(d=>d.to===n.id),last=ds.at(-1),a=r&&s.lots[r.anchorId-1],selected=r&&s.lots[r.selectedId-1],node=s.reaction.town.nodes[n.node];return {id:n.id,name:n.name,mode:n.id==='department'?'発売回5本':mode(s,n.id),anchorId:a?.id??null,selectedId:selected?.id??null,anchorFlavor:a?f(a.flavorId).name:null,selectedFlavor:selected?f(selected.flavorId).name:null,received:ds.reduce((n,d)=>n+d.count,0),lastDelivered:last?`発売#${last.releaseId}・${f(last.flavorId).name}`:null,reason:reasonText(s.orders.filter(o=>o.to===n.id).at(-1)?.reason??'no-record'),relationship:node.root>=.18&&node.interest>=.04?'既存の定着条件を満たしています':ds.length?'納品あり':'納品前',history:ds.slice(-8)};}),recent:[...s.decisions.slice(-8).map(d=>({month:d.month,text:d.text})),...s.reaction.town.events.filter(e=>['inquiry','interest','rumor'].includes(e.type)).slice(-8).map(e=>({month:e.month,text:e.reason}))].sort((a,b)=>b.month-a.month).slice(0,12)};}
export function validate(s){const errors=[];for(const l of s.lots)if(l.count!==l.stock+s.shipments.filter(d=>d.releaseId===l.id).reduce((n,d)=>n+d.count,0)||l.stock<0)errors.push('stock');for(const d of s.shipments){const n=store(d.to);if(!eligible(s.lots[d.releaseId-1],n,d.month)||d.count<n.minQuantity)errors.push('eligibility/minimum');if(d.to!=='department'&&mode(s,d.to)==='B'&&d.releaseId!==d.anchorId&& !s.decisions.some(x=>x.to===d.to&&x.releaseId===d.releaseId&&x.month<=d.month))errors.push('unapproved-B');}
 for(const n of STORES)for(let m=1;m<=s.month;m++)if(s.shipments.filter(d=>d.to===n.id&&d.month===m).reduce((n,d)=>n+d.count,0)>n.monthlyLimit)errors.push('cap');return {ok:!errors.length,errors};}
export function checksum(x){let h=2166136261;for(const c of JSON.stringify(x))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h.toString(16);}
export function exportLog(s){const log={schema:VERSION,base:BASE,options:s.options,month:s.month,actions:s.actions,summary:summary(s),lots:s.lots,shipments:s.shipments,orders:s.orders,decisions:s.decisions,events:s.events,townEvents:s.reaction.town.events,exposures:s.reaction.exposures,validation:validate(s)};return {...clone(log),checksum:checksum(log)};}
export function replay(log){assert(log?.schema===VERSION&&log.base===BASE&&Number.isInteger(log.month)&&log.month>=0&&log.month<=360,'このLabの記録を選びます。');const{checksum:hash,...data}=log;assert(checksum(data)===hash,'JSONが変わっています。');const s=create(log.options);for(const a of log.actions){advance(s,a.month);selectRelease(s,a.to,a.releaseId);}advance(s,log.month);assert(exportLog(s).checksum===hash,'再現結果が一致しません。');return s;}
