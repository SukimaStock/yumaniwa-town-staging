// V02 sidecar. V01 propagation/relationships remain isolated once per brand.
import * as V1 from '../model.mjs';
import * as D from '../../../partner-orders.mjs';
import * as M from '../../../model.mjs';
import * as E from '../../../economy.mjs';
export const {DEFAULT_SEED,NODES,EDGES,RECIPES}=V1;
export const METHODS=Object.freeze([{id:'current',name:'現行の参照'},{id:'declared',name:'決めた方向'},{id:'learned',name:'届いた味から'}]);
export const PRIORITIES=Object.freeze([{id:'ordered',name:'注文の順'},{id:'relationship',name:'取扱いの長さ'},{id:'affinity',name:'この店に合うもの'}]);
// Broad directions are hypotheses in existing r/c/w units, not quality targets.
export const DIRECTIONS=Object.freeze([{id:'free',name:'決めない',profile:null},{id:'young',name:'若く力強い',profile:{roughness:.70,character:.60,wood:.10}},{id:'aroma',name:'原酒のかおり',profile:{roughness:.20,character:.90,wood:.20}},{id:'wood',name:'木のかおり',profile:{roughness:.10,character:.50,wood:.55}},{id:'balanced',name:'原酒と木',profile:{roughness:.15,character:.75,wood:.45}}]);
const clone=structuredClone,round=n=>Math.round(n*100)/100,check=(ok,msg)=>{if(!ok)throw Error(msg);};
const byId=id=>NODES.find(n=>n.id===id),brandOf=(s,id)=>s.brands.find(b=>b.id===id),recipeOf=id=>RECIPES.find(r=>r.id===id);
const profile=c=>({roughness:c.roughness,character:c.character,wood:c.wood});
const distance=(a,b)=>(Math.abs(a.roughness-b.roughness)+Math.abs(a.character-b.character)+Math.abs(a.wood-b.wood)/1.35)/3;
function unit(seed,key){let x=seed>>>0;for(const c of key)x=Math.imul(x^c.charCodeAt(0),16777619)>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;}
const log=(s,kind,data)=>{const e={...data,id:s.events.length+1,month:s.month,kind};s.events.push(e);return e;};
function raw(seed,recipe,type){let g=D.startDistillation(D.newPartialDistillery(seed));while(g.still.distillation.progress<recipe.stop)g=D.distillStep(g);return D.fillBarrel(D.stopDistillation(g),type??recipe.type).core;}
function age(core){core.month++;if(!core.casks.length)return;const c=M.ageCask(core.casks[0]);if(c.litres>=.7)core.casks[0]=c;else{core.casks=[];core.archive.unshift({...c,endedMonth:core.month,endReason:'蒸発により瓶1本未満になった',text:M.tasting(c)});core.archive=core.archive.slice(0,24);}}
function emptyNetwork(s){
 // The V01 shape is transient; all stock comes from the shared V02 ledger.
 return {version:'ambertime-reputation/0.1',seed:s.seed,mode:'familiarity',recipe:'aroma',origin:'normal',initialAge:0,initialCount:0,month:s.month,core:{...clone(s.core),casks:[],products:[],archive:[]},releases:[],nodes:Object.fromEntries(NODES.map(n=>[n.id,{id:n.id,knownAt:V1.INITIAL_PARTNERS.includes(n.id)?s.month:null,introduced:V1.INITIAL_PARTNERS.includes(n.id),accepted:false,received:0,lastDeliveryMonth:null,lastOfferMonth:s.month-6,declinedUntil:0,offer:V1.INITIAL_PARTNERS.includes(n.id)?{id:'starter-'+n.id,nodeId:n.id,month:s.month,kind:'introduction',status:'pending',min:n.min,max:n.max,reason:'起点の取扱い相談'}:null,repeatOrder:null,evidence:{},observations:{}}])),events:[],lastEvent:null,deliveries:[],packets:[],forwarded:[],nextOffer:1,caskSerial:0,nextCaskSerial:1,parents:{},reflections:[]};
}
function projectNetwork(s,brandId){const n=clone(s.networks[brandId]);n.month=s.month;n.core.month=s.core.month;n.core.nextId=s.core.nextId;n.core.products=clone(s.core.products.filter(p=>s.releases.some(r=>r.id===p.id&&r.brandId===brandId)));n.releases=clone(s.releases.filter(r=>r.brandId===brandId));return n;}
function capture(s,bid,n,from){for(const e of n.events.slice(from))log(s,e.kind,{...clone(e),id:s.events.length+1,brandId:bid,networkEventId:e.id});s.networks[bid]=n;}
const offerId=(bid,id)=>`${bid}:${id}`;
export function createBrand(s,{name,direction='free'}={}){
 check(typeof name==='string'&&name.trim().length>0&&name.trim().length<=40&&DIRECTIONS.some(d=>d.id===direction),'銘柄名・方向を確認してください。');const next=clone(s),b={id:next.nextBrand++,name:name.trim(),direction,createdMonth:s.month,learned:null};next.brands.push(b);next.networks[b.id]=emptyNetwork(next);next.relations[b.id]={};next.selectedBrandId=b.id;log(next,'brand',{brandId:b.id,name:b.name,direction});return next;
}
export function createSession({seed=DEFAULT_SEED,method='current',priority='ordered',recipe='aroma',initialAge=12,initialCount=20,direction='free',name='最初の銘柄'}={}){
 if(initialAge===null)initialAge=recipeOf(recipe)?.age;check(Number.isInteger(seed)&&seed>0&&seed<=4294967295&&METHODS.some(x=>x.id===method)&&PRIORITIES.some(x=>x.id===priority)&&recipeOf(recipe)&&Number.isInteger(initialAge)&&initialAge>=0&&initialAge<=120&&Number.isInteger(initialCount)&&initialCount>=0,'実験条件を確認してください。');
 const core=raw(seed,recipeOf(recipe));for(let i=0;i<initialAge;i++)age(core);let s={version:'ambertime-reputation/0.2',seed,method,priority,recipe,month:0,core,brands:[],selectedBrandId:null,nextBrand:1,networks:{},relations:{},releases:[],parents:{[core.casks[0].id]:1},nextSerial:2,batchSerial:1,orders:[],orderHistory:[],receipts:[],cash:0,events:[],reflections:[],nextOrder:1};s=createBrand(s,{name,direction});return initialCount?bottleCurrent(s,initialCount):s;
}
export function selectBrand(s,id){check(brandOf(s,id),'銘柄を選んでください。');const next=clone(s);next.selectedBrandId=id;return next;}
export function setDirection(s,id,direction){check(brandOf(s,id)&&DIRECTIONS.some(d=>d.id===direction),'銘柄の方向を確認してください。');const next=clone(s);brandOf(next,id).direction=direction;log(next,'direction',{brandId:id,direction});return next;}
export function startBatch(s,{recipe='aroma',type=recipeOf(recipe)?.type}={}){
 check(!s.core.casks.length&&recipeOf(recipe)&&['bourbon','refill'].includes(type),'たるを空にして、製法とたるを選んでください。');const next=clone(s),batch=raw((s.seed+Math.imul(++next.batchSerial,104729))>>>0||1,recipeOf(recipe),type),c=batch.casks[0],batchId=next.core.nextId++,id=next.core.nextId++;next.core.casks=[{...c,id,batchId,batchMonth:next.core.month,filledMonth:next.core.month,history:[{month:next.core.month,text:M.tasting(c)}]}];next.parents[id]=next.nextSerial++;next.recipe=recipe;log(next,'start',{parentId:id,parentSerial:next.parents[id],recipe,type});return next;
}
export function bottleCurrent(s,count,brandId=s.selectedBrandId){
 const c=s.core.casks[0];check(c&&brandOf(s,brandId),'たる・銘柄を選んでください。');const chosen=count??M.bottleQuote(s.core,c.id).count;check(Number.isInteger(chosen)&&chosen>=1&&chosen<=M.bottleQuote(s.core,c.id).count,'ビン詰め本数を確認してください。');const next=clone(s),beforeCash=next.core.cash,beforeCost=next.core.totals.costs,live=clone(next.core.products.filter(p=>p.stock>0));next.core=M.bottle({...next.core,cash:Math.max(beforeCash,chosen*3)},c.id,chosen);next.core.cash=beforeCash;next.core.totals.costs=beforeCost;
 const missing=live.filter(p=>!next.core.products.some(q=>q.id===p.id));if(missing.length){const all=[...missing,...next.core.products],active=all.filter(p=>p.stock>0),empty=all.filter(p=>p.stock===0);next.core.products=[...active,...empty.slice(-(32-active.length))].sort((a,b)=>a.id-b.id);}
 const p=next.core.products.at(-1),price=Math.max(16,Math.min(160,round(E.marketValue(c))));p.price=price;const r={id:p.id,brandId,parentId:c.id,parentSerial:s.parents[c.id],age:c.age,bottledMonth:s.month,profile:profile(c),type:c.type,price,stock:p.stock,originalCount:p.originalStock,label:`No.${s.parents[c.id]}・${c.age}か月`};next.releases.push(r);log(next,'bottle',{brandId,releaseId:r.id,parentId:c.id,parentSerial:r.parentSerial,age:r.age,count:chosen});return next;
}
function tasteReason(n,r){if(r.price<n.price[0]||r.price>n.price[1])return '価格帯が合わない';if(r.age<n.minAge)return `${n.minAge}か月から`;if(n.roughnessMax!==undefined&&r.profile.roughness>n.roughnessMax)return 'シゲキが強め';if(n.characterMin!==undefined&&r.profile.character<n.characterMin)return '原酒のかおりを待っている';if(n.boldOrWood&&r.profile.roughness<.3&&r.profile.wood<.25)return 'シゲキか木のかおりを待っている';return '';}
// A uses only the native retail-ledger reference: lab deliveries are not retail.
// B is a declared broad expectation, factor .88..1.12. C uses actual shipped
// volume with count/(count+20) confidence; same .88..1.12 exploration floor.
// No release count, offers, diffusion or acceptance can train the expectation.
export function expectation(s,bid,p){const b=brandOf(s,bid);check(b,'銘柄を確認してください。');if(s.method==='current')return 1;const target=s.method==='declared'?DIRECTIONS.find(d=>d.id===b.direction)?.profile:b.learned?.profile;if(!target)return 1;const confidence=s.method==='learned'?b.learned.count/(b.learned.count+20):1;return 1+.12*confidence*(1-2*Math.min(1,distance(p,target)));}
function factors(s,n,b,r){const network=s.networks[b.id].nodes[n.id],affinity=V1.propagationFit(n.id,r.profile),priceFactor=1-.1*Math.min(1,Math.abs(r.price-(n.price[0]+n.price[1])/2)/((n.price[1]-n.price[0])/2)),recordFactor=1+.05*network.received/(network.received+20),brandFactor=expectation(s,b.id,r.profile);return {affinity,priceFactor,recordFactor,brandFactor,fit:affinity*priceFactor*recordFactor*brandFactor};}
function ranked(s,n,b,stockOnly=false){return s.releases.filter(r=>r.brandId===b.id&&!tasteReason(n,r)&&(!stockOnly||r.stock>=n.min)).map(r=>({r,f:factors(s,n,b,r)})).sort((a,b)=>b.f.fit-a.f.fit||a.r.bottledMonth-b.r.bottledMonth||a.r.id-b.r.id);}
// Fixed monthly request bases. Rounding and store minima/caps stay explicit;
// department is always exactly5, supermarket requests/shipping are never <10.
const BASE={town:8,station:6,specialist:6,super:20,bar:5,department:5};
export function demandFor(s,nodeId=null,brandId=null){
 const rows=[];for(const n of NODES.filter(n=>nodeId===null||n.id===nodeId))for(const b of s.brands.filter(b=>brandId===null||b.id===brandId)){
  const accepted=s.networks[b.id].nodes[n.id].accepted,all=s.releases.filter(r=>r.brandId===b.id),matches=ranked(s,n,b),stocked=ranked(s,n,b,true),chosen=stocked[0]??matches[0];let status='pending',reason='';if(!accepted){status='unapproved';reason='取扱いの承認前';}else if(!all.length){status='unknown-release';reason='この銘柄のビンがまだない';}else if(!matches.length){status='no-demand';reason=all.map(r=>tasteReason(n,r)).find(Boolean)??'条件に合うビンなし';}
  const count=status==='pending'?(n.id==='department'?5:Math.max(n.min,Math.min(n.max,Math.round(BASE[n.id]*chosen.f.fit)))):0,availability=!chosen?'unknown':chosen.r.stock===0?'out-of-stock':chosen.r.stock<n.min?'below-minimum':'in-stock';rows.push({month:s.month,nodeId:n.id,brandId:b.id,releaseId:chosen?.r.id??null,count,shipped:0,unfilled:count,status,reason,availability,factors:chosen?clone(chosen.f):null});
 }return rows;
}
function compareOrders(s,a,b){
 let diff=0;if(s.priority==='relationship'){const ar=s.networks[a.brandId].nodes[a.nodeId].received,br=s.networks[b.brandId].nodes[b.nodeId].received;diff=br-ar||(s.relations[a.brandId][a.nodeId]?.acceptedMonth??s.month)-(s.relations[b.brandId][b.nodeId]?.acceptedMonth??s.month);}else if(s.priority==='affinity')diff=(b.factors?.fit??0)-(a.factors?.fit??0);
 // Same-month order ties are seeded per shop+brand, never array position.
 return diff||unit(s.seed,`${s.month}|${a.nodeId}|${a.brandId}`)-unit(s.seed,`${s.month}|${b.nodeId}|${b.brandId}`)||a.brandId-b.brandId;
}
function learn(b,p,count){const old=b.learned,total=(old?.count??0)+count,out={};for(const k of ['roughness','character','wood'])out[k]=!old||old.profile[k]===p[k]?p[k]:(old.profile[k]*old.count+p[k]*count)/total;b.learned={count:total,profile:out};}
function fulfillInto(s,order,count=null,manual=false){
 check(order&&order.month===s.month&&order.status==='pending','現在の未処理の注文を選んでください。');const n=byId(order.nodeId),b=brandOf(s,order.brandId),used=s.receipts.filter(r=>r.month===s.month&&r.nodeId===n.id).reduce((a,r)=>a+r.count,0),remaining=Math.max(0,n.max-used),r=s.releases.find(r=>r.id===order.releaseId&&r.brandId===order.brandId),max=Math.min(order.count,r?.stock??0,remaining),actual=count===null?(max>=n.min?max:0):count;
 if(count!==null)check(Number.isInteger(count)&&count>=n.min&&count<=max&&(n.id!=='department'||count===5),'出荷できる本数を確認してください。');
 if(!r||actual<n.min){order.status='unfilled';order.reason=!r?'条件に合うビンなし':remaining<n.min?'店の今月の上限':r.stock===0?'在庫なし':'最低本数に届かない';order.unfilled=order.count;log(s,manual?'manual-attempt':'unfilled',{orderId:order.id,nodeId:n.id,brandId:b.id,reason:order.reason});return;}
 const network=projectNetwork(s,b.id),before=network.events.length,delivered=V1.deliver(network,n.id,r.id,actual);capture(s,b.id,delivered,before);const global=s.releases.find(x=>x.id===r.id),p=s.core.products.find(x=>x.id===r.id);global.stock-=actual;p.stock-=actual;p.sold+=actual;const unitPrice=round(r.price*(n.id==='town'?.8:n.id==='department'?1.4:1)),revenue=round(unitPrice*actual);p.revenue=round(p.revenue+revenue);s.cash=round(s.cash+revenue);learn(b,r.profile,actual);order.releaseId=r.id;order.shipped=actual;order.unfilled=order.count-actual;order.status=actual===order.count?'shipped':'partial';order.reason=order.unfilled?'在庫または店の上限':'';const receipt={id:s.receipts.length+1,month:s.month,orderId:order.id,brandId:b.id,nodeId:n.id,releaseId:r.id,parentId:r.parentId,parentSerial:r.parentSerial,age:r.age,profile:clone(r.profile),count:actual,unitPrice,revenue,manual};s.receipts.push(receipt);log(s,manual?'manual-shipment':'shipment',{...clone(receipt),receiptId:receipt.id});
}
export function manualFulfill(s,orderId,count=null){const next=clone(s),order=next.orders.find(o=>o.id===orderId);fulfillInto(next,order,count,true);const old=next.orderHistory.find(o=>o.id===orderId);if(old)Object.assign(old,clone(order));return next;}
export function advance(s,months=1,{fulfill=true}={}){
 check(Number.isInteger(months)&&months>=1&&months<=120&&typeof fulfill==='boolean','進める月数を確認してください。');check(!s.core.casks[0]||s.core.casks[0].age+months<=120,'熟成の比較は120か月までです。');const next=clone(s);
 for(let i=0;i<months;i++){
  for(const old of next.orderHistory)if(old.status==='pending'){old.status='expired';old.reason='その月に出荷しなかった';}
  next.month++;age(next.core);for(const b of next.brands){const network=projectNetwork(next,b.id),before=network.events.length;let advanced=V1.advance({...network,month:next.month-1,core:{...network.core,month:next.core.month-1}},1);for(const node of Object.values(advanced.nodes))if(node.accepted&&node.offer?.kind==='repeat'){advanced=V1.acceptOffer(advanced,node.offer.id);advanced.events.at(-1).automatic=true;}capture(next,b.id,advanced,before);}
  const rows=demandFor(next);for(const o of rows)o.id=`order-${next.nextOrder++}`;rows.sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)||compareOrders(next,a,b)||a.nodeId.localeCompare(b.nodeId)||a.brandId-b.brandId);next.orders=rows;
  if(fulfill)for(const o of next.orders)if(o.status==='pending')fulfillInto(next,o);
  next.orderHistory.push(...clone(next.orders));log(next,'month',{orders:next.orders.filter(o=>o.count>0).length,shipments:next.receipts.filter(r=>r.month===next.month).length});
 }return next;
}
export function acceptOffer(s,id){const next=clone(s);let found=false;for(const b of next.brands)for(const n of Object.values(next.networks[b.id].nodes))if(n.offer&&offerId(b.id,n.offer.id)===id){const network=projectNetwork(next,b.id),before=network.events.length;capture(next,b.id,V1.acceptOffer(network,n.offer.id),before);next.relations[b.id][n.id]??={acceptedMonth:s.month};found=true;break;}check(found,'この申し出は終了しています。');return next;}
export function declineOffer(s,id){const next=clone(s);let found=false;for(const b of next.brands)for(const n of Object.values(next.networks[b.id].nodes))if(n.offer&&offerId(b.id,n.offer.id)===id){const network=projectNetwork(next,b.id),before=network.events.length;capture(next,b.id,V1.declineOffer(network,n.offer.id),before);found=true;break;}check(found,'この申し出は終了しています。');return next;}
export function view(s){
 const offers=[],nodeViews=Object.fromEntries(s.brands.map(b=>[b.id,V1.view(projectNetwork(s,b.id))]));const nodes=NODES.map(n=>({...clone(n),brands:s.brands.map(b=>{const v=nodeViews[b.id].nodes.find(x=>x.id===n.id),offer=v.offer?{...clone(v.offer),nativeId:v.offer.id,id:offerId(b.id,v.offer.id),brandId:b.id}:null;if(offer)offers.push(offer);return {brandId:b.id,known:v.known,accepted:v.accepted,handling:v.handling,received:v.received,offerId:offer?.id??null,offer,repeatOrder:v.repeatOrder,memory:v.memory,reason:v.reason};})}));const c=s.core.casks[0];
 return {month:s.month,cash:s.cash,method:s.method,priority:s.priority,selectedBrandId:s.selectedBrandId,brands:clone(s.brands),cask:c?{...clone(c),serial:s.parents[c.id],bottles:M.bottleQuote(s.core,c.id).count}:null,releases:clone(s.releases),nodes,offers,orders:clone(s.orders),receipts:clone(s.receipts),events:clone(s.events),reflections:clone(s.reflections),baseline:s.brands.map(b=>({brandId:b.id,...V1.baselineEvidence(projectNetwork(s,b.id))}))};
}
