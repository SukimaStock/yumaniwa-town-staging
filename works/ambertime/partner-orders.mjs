// New execution contract. The complete v0.9 reader remains frozen.
import * as V09 from './trade.mjs?v=0.9';
import * as E from './economy.mjs?v=0.8';
import * as M from './model.mjs?v=0.6-parallel';
import {mixSeed} from './character.mjs?v=0.6';
import {PARALLEL_PARAMETERS as P,ECONOMY_PARAMETERS as C} from './economy-parameters.mjs';
import {WHOLESALE as W} from './wholesale-parameters.mjs';
import {PARTNER_ORDERS as T,PARTNERS,SPECIAL_ORDER} from './partner-parameters.mjs';
export {SPECIAL_ORDER} from './partner-parameters.mjs';
export {currentCask,upkeep,observation,comparison,quote,salePrices,marketValue,endTasting,setSalePrice,listBottles} from './economy.mjs?v=0.8';
const clone=x=>structuredClone(x),round=x=>Math.round(x*100)/100;
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const blocked=s=>s.tastingId!==null||s.decisions.length>0||s.trade.offer!==null;
function action(s,key,value){s.operations.push({key,...(value===undefined?{}:{value})});assert(s.operations.length<=P.maxOperations,'帳面がいっぱいです。');return s;}
export function newDistillery(seed=20261015){const s=E.newDistillery(seed);return {...s,version:T.version,rules:T.rules,trade:{rng:mixSeed(seed^0x57a1e),nextOfferMonth:6,nextProposalMonth:0,offerSerial:0,bookingSerial:0,offer:null,relationship:null,contracts:[],history:[],lastShipment:null,lastShipments:[],lastObservations:[],order:null,orderSerial:0},origin:null};}
function draw(t){t.rng=(Math.imul(t.rng,1664525)+1013904223)>>>0;return t.rng/4294967296;}
function rest(s){s.trade.nextOfferMonth=s.core.month+W.cooldownMin+Math.floor(draw(s.trade)*W.cooldownRange);}
function restProposal(s){s.trade.nextProposalMonth=s.core.month+T.proposalCooldownMin+Math.floor(draw(s.trade)*T.proposalCooldownRange);}
function history(s,item){s.trade.history=[...s.trade.history,{...item,month:s.core.month}].slice(-120);}
export const contractFor=(s,id)=>s.trade.contracts.find(k=>k.caskId===id)??null;
export function offerEvidence(s){const records=s.records.filter(r=>r.sold>0),sold=records.reduce((n,r)=>n+r.sold,0),young=records.filter(r=>r.age<=12).reduce((n,r)=>n+r.sold,0),recent=records.filter(r=>s.core.month-r.bottledMonth<=36).length;return {sold,young,recent,probability:Math.min(W.maxProbability,W.baseProbability+W.volumeWeight*Math.min(1,sold/120)+W.youngWeight*Math.min(1,young/80)+W.continuityWeight*Math.min(1,recent/3))};}
export function contractCandidates(s,term=s.trade.offer?.terms[0]){return term?s.core.casks.filter(c=>!contractFor(s,c.id)&&c.age<=term.targetAge-3&&M.bottleQuote(s.core,c.id).count>0):[];}
export const partnerPreference=partner=>PARTNERS.find(p=>p.name===partner)??null;
const termOf=(id,term,factor)=>({id:`${id}:${term.age}`,targetAge:term.age,unitPrice:round(term.price*factor),bottlingFee:C.bottlingCost});
function maybeOffer(s){
 const t=s.trade,r=t.relationship;if(t.offer||s.decisions.length)return;
 if(r){
  const evidence=orderEvidence(s);if(!evidence.eligible||s.core.month<t.nextProposalMonth)return;
  if(draw(t)>=evidence.probability)return;const id=++t.offerSerial;
  const term={id:`special:${id}`,targetAge:SPECIAL_ORDER.targetAge,unitPrice:SPECIAL_ORDER.unitPrice,bottlingFee:C.bottlingCost,criteria:clone(SPECIAL_ORDER.criteria)};
  t.offer={id,kind:'special',month:s.core.month,partner:r.partner,terms:[term],criteria:clone(term.criteria)};
 }else{
  if(s.core.month<t.nextOfferMonth||offerEvidence(s).sold===0)return;
  if(draw(t)>=offerEvidence(s).probability)return;
  const preference=PARTNERS[Math.floor(draw(t)*PARTNERS.length)],partner=preference.name,id=++t.offerSerial;
  t.offer={id,kind:'initial',month:s.core.month,partner,terms:[termOf(id,preference,1)]};
 }
 const primary=t.offer.terms[0];Object.assign(t.offer,{targetAge:primary.targetAge,unitPrice:primary.unitPrice,bottlingFee:primary.bottlingFee}); // Primary condition, independent offer ID.
 history(s,{...clone(t.offer),offerKind:t.offer.kind,kind:'offered'});
}
function readyForTrade(s){assert(s.tastingId===null,'試飲を終えてから取引を決めます。');assert(!s.trade.offer,'届いた申し出を先に確認します。');}
export function canStart(s){const c=E.canStart(s);return s.trade.offer?{...c,ok:false,reason:'届いた申し出を確認します。'}:c;}
export function startDistillation(s){assert(!s.trade.offer,'申し出を確認してから仕込みます。');return E.startDistillation(s);}
export function distillStep(s){return s.trade.offer?s:E.distillStep(s);}
export function stopDistillation(s){assert(!s.trade.offer,'申し出を確認します。');return E.stopDistillation(s);}
export function fillBarrel(s,type){assert(!s.trade.offer,'申し出を確認します。');const j=E.fillBarrel(s,type);for(const n of Object.values(j.notesById))n.observations??=[];return j;}
export function sampleDistillery(s,id){assert(!s.trade.offer,'申し出を確認してから試飲します。');return E.sampleDistillery(s,id);}
export function chooseDistillery(s,id,key){assert(!s.trade.offer,'申し出を確認します。');if(s.notesById[id]?.pending?.id==='order-unmet')return resolveUnmet(s,id,key);return E.chooseDistillery(s,id,key);}
export function bottleNow(s,id){assert(!(s.trade.order?.status==='unmet'&&s.trade.order.caskId===id),'注文の出荷方法を先に選びます。');assert(!contractFor(s,id),'この樽は卸売出荷の予定があります。解除すると瓶詰めできます。');assert(!s.trade.offer,'申し出を確認します。');const observations=clone(s.notesById[id]?.observations??[]),j=E.bottleNow(s,id);j.result.observations=observations;if(s.notesById[id]?.orderOutcome)j.result.order=clone(s.notesById[id].orderOutcome);return j;}
function book(s,id,term){assert(contractCandidates(s,term).some(c=>c.id===id),'指定できる樽を選びます。');const r=s.trade.relationship,k={id:++s.trade.bookingSerial,caskId:id,partner:r.partner,relationshipId:r.id,termId:term.id,targetAge:term.targetAge,unitPrice:term.unitPrice,bottlingFee:term.bottlingFee,acceptedMonth:s.core.month};s.trade.contracts.push(k);history(s,{kind:'assigned',...k});}
export function assignCask(s,id,termId){readyForTrade(s);assert(!s.decisions.length,'先に樽の判断を終えます。');const r=s.trade.relationship;assert(r?.status==='active','取引を再開してから指定できます。');const term=r.terms.find(k=>k.id===termId);assert(term,'現在の取引条件を選びます。');const j=clone(s);book(j,id,term);return action(j,'assign',{id,termId});}
export function acceptOffer(s,id=null,termId=null){
 const o=s.trade.offer;assert(o&&s.tastingId===null&&!s.decisions.length,'今は申し出を決められません。');const j=clone(s);
 if(o.kind==='special'){
  assert(j.trade.relationship?.partner===o.partner&&!j.trade.order,'今は特別注文を受けられません。');
  const term=o.terms[0];j.trade.order={id:++j.trade.orderSerial,partner:o.partner,targetAge:term.targetAge,unitPrice:term.unitPrice,bottlingFee:term.bottlingFee,criteria:clone(term.criteria),acceptedMonth:j.core.month,caskId:null,status:'accepted'};
  history(j,{kind:'order-accepted',...clone(j.trade.order)});restProposal(j);
 }else if(o.kind==='terms'){
  const r=j.trade.relationship;assert(r&&r.partner===o.partner,'取引先を確認します。');const term=o.terms[0];r.terms=[...r.terms.filter(k=>k.targetAge!==term.targetAge),clone(term)].sort((a,b)=>a.targetAge-b.targetAge);history(j,{kind:'terms-accepted',partner:r.partner,term:clone(term)});restProposal(j);
 }else{
  assert(!j.trade.relationship,'取引先は一社までです。');const term=o.terms.find(k=>k.id===(termId??o.terms[0].id));assert(term,'提示された条件を選びます。');j.trade.relationship={id:o.id,partner:o.partner,status:'active',terms:clone(o.terms),deliveries:0,bottles:0,startedMonth:j.core.month,completedOrders:0};history(j,{kind:'accepted',partner:o.partner,relationshipId:o.id});restProposal(j);
 }
 j.trade.offer=null;return action(j,'accept',{id,termId});
}
export function declineOffer(s){assert(s.trade.offer&&s.tastingId===null&&!s.decisions.length,'先に樽の判断を終えます。');const j=clone(s),o=j.trade.offer;history(j,{kind:'declined',offerId:o.id,partner:o.partner});j.trade.offer=null;if(o.kind==='terms'||o.kind==='special')restProposal(j);else rest(j);return action(j,'decline');}
export function cancelContract(s,id){readyForTrade(s);const k=contractFor(s,id);assert(k,'解除する樽を選びます。');const j=clone(s);history(j,{kind:'unassigned',...clone(k)});j.trade.contracts=j.trade.contracts.filter(x=>x.caskId!==id);if(k.kind==='special'&&j.trade.order?.id===k.orderId){j.trade.order.status='accepted';j.trade.order.caskId=null;}return action(j,'unassign',id);}
export function pauseTrade(s){readyForTrade(s);assert(s.trade.relationship?.status==='active','取引はすでに休止中です。');const j=clone(s);j.trade.relationship.status='paused';history(j,{kind:'paused',partner:j.trade.relationship.partner});return action(j,'pause-trade');}
export function resumeTrade(s){readyForTrade(s);assert(s.trade.relationship?.status==='paused','取引は休止していません。');const j=clone(s);j.trade.relationship.status='active';history(j,{kind:'resumed',partner:j.trade.relationship.partner});return action(j,'resume-trade');}
export function endTrade(s){readyForTrade(s);assert(s.trade.relationship,'終了する取引がありません。');const j=clone(s);history(j,{kind:'ended',partner:j.trade.relationship.partner,caskIds:j.trade.contracts.map(k=>k.caskId)});clearUnmet(j);if(j.trade.order)history(j,{kind:'order-cancelled',...clone(j.trade.order),reason:'trade-ended'});j.trade.order=null;j.trade.relationship=null;j.trade.contracts=[];rest(j);return action(j,'end-trade');}
// Preserve the old origin reconstruction exactly. Correct proven legacy dates
// only as a new recorded operation, never by rewriting an old replay prefix.
export function reconcileTradeHistory(s){
 const r=s.trade.relationship;if(!r)return s;let start=r.startedMonth;
 const take=n=>{if(Number.isInteger(n)&&n>=0&&n<=s.core.month&&n<start)start=n;};
 for(let old=s;old;old=old.origin){
  for(const h of old.trade?.history??[])if(h.kind==='accepted'&&h.partner===r.partner&&(h.relationshipId===r.id||h.relationshipId===undefined&&h.id===r.id))take(h.acceptedMonth??h.month);
  const k=old.trade?.contract;if(k?.partner===r.partner&&k.id===r.id)take(k.acceptedMonth);
 }
 // Optional metadata repair must not make a valid full ledger unreadable.
 if(start===r.startedMonth||s.operations.length>=P.maxOperations)return s;
 const j=clone(s);j.trade.relationship.startedMonth=start;return action(j,'reconcile-trade-start');
}
function reserve(s){return s.core.casks.reduce((n,c)=>n+M.bottleQuote(s.core,c.id).cost,0)+(s.core.spirit?Math.min(...Object.values(C.casks).map(c=>c.cost))+Math.floor((s.still.phase==='distilling'?C.baseLitres+C.extraLitres:s.core.spirit.litres)/C.bottleLitres)*C.bottlingCost:0);}
function rebuild(s){s.decisions=s.core.casks.slice().sort((a,b)=>a.id-b.id).filter(c=>s.notesById[c.id]?.pending).map(c=>({month:s.core.month,caskId:c.id,eventId:s.notesById[c.id].pending.id,pending:clone(s.notesById[c.id].pending)}));}
function syncRecords(s){s.records=s.records.map(r=>{const p=s.core.products.find(p=>p.id===r.productId);return p?{...r,sold:p.sold,revenue:p.revenue}:r;});if(s.result)s.result=s.records.find(r=>r.productId===s.result.productId)??s.result;}
function requestFunds(s){
 for(const c of s.core.casks){const n=s.notesById[c.id];if(n.pending?.id==='funds'){n.pending=null;n.phase='watching';}}
 const c=s.core.casks.filter(c=>E.quote(s,c.id).cost<=s.core.cash).sort((a,b)=>Number(!!contractFor(s,a.id))-Number(!!contractFor(s,b.id))||a.id-b.id)[0]??s.core.casks[0];if(!c)return;
 const remaining=s.trade.contracts.map(k=>Math.max(0,k.targetAge-E.currentCask(s,k.caskId).age)),nearest=remaining.length?Math.min(...remaining):null;
 const n=s.notesById[c.id];n.phase='choice';n.pending={id:'funds',title:'瓶詰めの費用を残す',text:`所持金 £${round(s.core.cash)} · 瓶詰め予約 £${reserve(s)} · 維持費 £${E.upkeep(s)}/月。`+(nearest!==null?`次の卸売出荷まで${nearest}か月。`:'')+(contractFor(s,c.id)?'この樽の指定を解除した後の瓶詰め費を残して停止しています。':remaining.length?'卸売予定を残し、こちらの樽から回収できます。':'こちらの樽から回収できます。'),options:[{id:'bottle',label:'瓶詰めを確かめる'}]};rebuild(s);
}
// Retain a verified old checkpoint verbatim; only new operations use this model.
function upgraded(input){
 const old=V09.restoreDistillery(JSON.stringify(input)),j={...clone(old),version:T.version,rules:T.rules,operations:[],origin:clone(old)};
 j.trade={...clone(old.trade),lastObservations:[],order:null,orderSerial:0};
 if(j.trade.relationship){const r=j.trade.relationship;r.startedMonth=old.trade.history.find(h=>h.kind==='accepted'&&h.relationshipId===r.id)?.month??old.core.month;r.completedOrders=0;}
 for(const n of Object.values(j.notesById))n.observations??=[];
 observePromisedChanges(j);
 if(j.decisions.some(d=>d.eventId==='funds'))requestFunds(j);
 return j;
}
// These prompts only repeat the already-promised shipment plan. Record an
// observation, never a fictional player choice. Real interventions and funds
// protection remain decisions, including old explicit final-bottling plans.
function observePromisedChanges(s){
 for(const c of s.core.casks){
  const n=s.notesById[c.id],p=n.pending;
  if(!contractFor(s,c.id)||!p||!['fruit','rounded','loss','wood','fading','rough'].includes(p.id)||p.options.some(o=>o.id==='cool'))continue;
  const note={caskId:c.id,age:c.age,eventId:p.id,title:p.title,text:p.text,month:s.core.month};
  n.observations??=[];n.observations.push(note);s.trade.lastObservations.push(clone(note));n.pending=null;n.phase='watching';
 }
 rebuild(s);
}

// Only completed deliveries in the current relationship grow this opportunity.
export function orderEvidence(s){
 const r=s.trade.relationship,duration=r?Math.max(0,s.core.month-r.startedMonth):0,deliveries=r?.deliveries??0,bottles=r?.bottles??0,completedOrders=r?.completedOrders??0;
 const eligible=!!r&&r.status==='active'&&r.partner===SPECIAL_ORDER.partner&&!s.trade.order&&deliveries>=SPECIAL_ORDER.minDeliveries&&bottles>=SPECIAL_ORDER.minBottles&&duration>=SPECIAL_ORDER.minDuration;
 const probability=Math.min(SPECIAL_ORDER.maxProbability,SPECIAL_ORDER.baseProbability+SPECIAL_ORDER.deliveryWeight*Math.min(deliveries,8)+SPECIAL_ORDER.durationWeight*Math.min(duration/12,8)+SPECIAL_ORDER.orderWeight*Math.min(completedOrders,4));
 return {eligible,probability,duration,deliveries,bottles,completedOrders};
}
export function orderCandidates(s){return s.trade.order?.status==='accepted'?contractCandidates(s,s.trade.order):[];}
export function orderFallbackTerms(s){const r=s.trade.relationship,p=r&&partnerPreference(r.partner);if(!p)return null;const k=r.terms.find(t=>t.targetAge===p.age);return k?clone(k):{id:'standard-fallback',targetAge:p.age,unitPrice:p.price,bottlingFee:C.bottlingCost};}
export function assignOrder(s,id){
 readyForTrade(s);assert(!s.decisions.length,'先に樽の判断を終えます。');assert(s.trade.relationship?.status==='active','取引を再開してから指定できます。');
 assert(orderCandidates(s).some(c=>c.id===id),'注文へ指定できる樽を選びます。');const j=clone(s),o=j.trade.order,r=j.trade.relationship;
 const k={id:++j.trade.bookingSerial,kind:'special',orderId:o.id,caskId:id,partner:o.partner,relationshipId:r.id,termId:`order:${o.id}`,targetAge:o.targetAge,unitPrice:o.unitPrice,bottlingFee:o.bottlingFee,criteria:clone(o.criteria),acceptedMonth:o.acceptedMonth};
 j.trade.contracts.push(k);o.caskId=id;o.status='assigned';history(j,{kind:'order-assigned',...clone(k)});return action(j,'order-assign',id);
}
function clearUnmet(s){const o=s.trade.order;if(o?.status!=='unmet')return;const n=s.notesById[o.caskId];if(n?.pending?.id==='order-unmet'){n.pending=clone(o.previousPending??null);n.phase=n.pending?'choice':'watching';}rebuild(s);}
export function cancelOrder(s){
 readyForTrade(s);assert(s.trade.order,'取り消す注文がありません。');const j=clone(s),o=j.trade.order;clearUnmet(j);
 j.trade.contracts=j.trade.contracts.filter(k=>k.orderId!==o.id||k.kind!=='special');history(j,{kind:'order-cancelled',...clone(o)});j.trade.order=null;restProposal(j);return action(j,'order-cancel');
}
const orderMet=(c,k)=>c.roughness<=k.criteria.roughnessMax&&c.character>k.criteria.characterMin&&c.wood<=k.criteria.woodMax;
function orderRecord(o,outcome){return {id:o.id,criteria:clone(o.criteria),targetAge:o.targetAge,unitPrice:o.unitPrice,acceptedMonth:o.acceptedMonth,outcome};}
function fulfill(s,k,order=null){
 order??=s.notesById[k.caskId]?.orderOutcome??null;
 const c=E.currentCask(s,k.caskId),q=E.quote(s,c.id),gross=round(q.count*k.unitPrice),observations=clone(s.notesById[c.id]?.observations??[]);
 assert(k.bottlingFee===C.bottlingCost,'確定した瓶詰め費を確認します。');
 s.core.cash=round(s.core.cash+gross);s.core.totals.revenue=round(s.core.totals.revenue+gross);
 s=E.bottleNow(s,c.id,{automatic:true,directSale:true});s.operations.pop();const p=s.core.products.find(p=>p.id===s.result.productId),r=s.records.at(-1);
 p.price=k.unitPrice;p.sold=p.originalStock;p.stock=0;p.revenue=gross;p.lastSold=p.sold;p.lastRevenue=gross;s.core.totals.bottlesSold+=p.sold;s.productsById[p.id].listed=false;
 Object.assign(r,{observations,channel:'wholesale',partner:k.partner,unitPrice:k.unitPrice,contractAge:k.targetAge,sold:p.sold,revenue:gross,cash:s.core.cash});
 if(order)r.order=clone(order);r.memory.push(`${k.acceptedMonth}か月目に卸売指定。${c.age}か月で出荷。`);s.result=r;
 s.core.lastMonth.revenue=round(s.core.lastMonth.revenue+gross);s.core.lastMonth.bottles+=p.sold;s.core.lastMonth.sales.push({id:p.id,sold:p.sold,revenue:gross,channel:'wholesale',...(order?{orderId:order.id}: {})});
 const shipment={month:s.core.month,caskId:c.id,productId:p.id,partner:k.partner,bottles:p.sold,gross,cost:q.cost,net:round(gross-q.cost),...(order?{orderId:order.id,outcome:order.outcome}: {})};
 history(s,{kind:'shipped',...shipment});s.trade.lastShipment=shipment;s.trade.lastShipments.push(shipment);s.trade.contracts=s.trade.contracts.filter(x=>x.caskId!==c.id);s.trade.relationship.deliveries++;s.trade.relationship.bottles+=p.sold;
 return s;
}
function shipmentJournal(s){if(s.trade.lastShipments.length&&s.core.journal[0]){const ss=s.trade.lastShipments;s.core.journal[0].message=`卸売出荷 ${ss.length}樽・${ss.reduce((n,x)=>n+x.bottles,0)}本 · 売上 £${round(ss.reduce((n,x)=>n+x.gross,0))}。`;}}
function resolveUnmet(s,id,key){
 assert(s.tastingId===null,'試飲を終えてから判断します。');assert(s.decisions[0]?.caskId===id,'先に表示中の樽の判断を終えます。');const o=s.trade.order;
 assert(o?.status==='unmet'&&o.caskId===id&&['order-wholesale','order-retail'].includes(key),'注文の出荷方法を選びます。');let j=clone(s);clearUnmet(j);
 const outcome=orderRecord(o,key==='order-wholesale'?'unmet-wholesale':'unmet-retail');history(j,{kind:'order-resolved',orderId:o.id,caskId:id,outcome:outcome.outcome});j.trade.order=null;
 if(key==='order-wholesale'){
  const t=orderFallbackTerms(j);assert(t,'通常卸売の条件を確認します。');const k={...t,caskId:id,partner:o.partner,targetAge:E.currentCask(j,id).age,acceptedMonth:j.core.month};
  if(j.trade.lastShipments.some(x=>x.month!==j.core.month))j.trade.lastShipments=[];j=fulfill(j,k,outcome);shipmentJournal(j);
 }else j.notesById[id].orderOutcome=outcome;
 restProposal(j);return action(j,'choose',{id,key});
}
function settle(s){
 const due=s.trade.contracts.filter(k=>E.currentCask(s,k.caskId)?.age>=k.targetAge).sort((a,b)=>a.caskId-b.caskId);
 for(const k of due){
  if(k.kind==='special'){
   const o=s.trade.order;assert(o?.id===k.orderId&&o.status==='assigned','注文と樽の指定が一致しません。');
   if(!orderMet(E.currentCask(s,k.caskId),k)){
    const n=s.notesById[k.caskId];o.status='unmet';o.previousPending=clone(n.pending);s.trade.contracts=s.trade.contracts.filter(x=>x.caskId!==k.caskId);
    n.phase='choice';n.pending={id:'order-unmet',title:'注文の風味に届いていません',text:'出荷方法を選べます。',options:[{id:'order-wholesale',label:'通常の卸売価格で出荷する'},{id:'order-retail',label:'自分で販売する'}]};
    history(s,{kind:'order-unmet',orderId:o.id,caskId:k.caskId,criteria:clone(k.criteria),profile:{roughness:E.currentCask(s,k.caskId).roughness,character:E.currentCask(s,k.caskId).character,wood:E.currentCask(s,k.caskId).wood}});rebuild(s);continue;
   }
   const record=orderRecord(o,'fulfilled');s=fulfill(s,k,record);s.trade.relationship.completedOrders++;history(s,{kind:'order-fulfilled',orderId:o.id,caskId:k.caskId});s.trade.order=null;restProposal(s);
  }else s=fulfill(s,k);
 }
 shipmentJournal(s);return s;
}

export function tickDistillery(s,expectedMonth=s.core.month){
 assert(Number.isInteger(expectedMonth)&&expectedMonth===s.core.month,'月次処理の対象月が一致しません。');if(blocked(s))return s;
 const empty=s.still.phase==='ready'&&!s.core.spirit&&!s.core.casks.length&&!s.core.products.some(p=>p.stock>0&&s.productsById[p.id]?.listed);if(empty&&s.core.cash-E.upkeep(s)<canStart(s).minimum)return s;
 let j=E.economicMonthly(s,expectedMonth);j.trade.lastShipments=[];j.trade.lastObservations=[];observePromisedChanges(j);
 const ids=j.core.casks.map(c=>c.id).sort((a,b)=>a-b),cents=Math.round(j.core.lastMonth.upkeep*100),share=ids.length?Math.floor(cents/ids.length):0;
 for(let i=0;i<ids.length;i++)j.batchesById[ids[i]].upkeep=round(j.batchesById[ids[i]].upkeep+(share+(i<cents-share*ids.length?1:0))/100);
 syncRecords(j);j=settle(j);
 if(j.core.cash<reserve(j)){j=clone(s);if(!j.core.casks.length)return s;requestFunds(j);}
 else{for(const id of Object.keys(j.batchesById))if(!j.notesById[id])delete j.batchesById[id];syncRecords(j);maybeOffer(j);}
 return action(j,'month',{progress:s.still.phase==='distilling'?s.still.distillation.progress:null});
}
function progress(s,value){assert(!s.trade.offer||value===s.still.distillation?.progress,'申し出の確認中は蒸留を進めません。');assert(s.still.phase==='distilling'&&Number.isInteger(value)&&value>=s.still.distillation.progress&&value<P.distillMax,'蒸留の進行が不正です。');let j=s;while(j.still.distillation.progress<value){const next=E.distillStep(j);assert(next!==j,'停止中の蒸留です。');j=next;}return j;}
function apply(s,o){s=E.endTasting(s);switch(o.key){case 'start':return startDistillation(s);case 'stop':assert(Number.isInteger(o.value)&&o.value>=P.minimumStop&&o.value<P.distillMax,'抽出時期が不正です。');return stopDistillation(progress(s,o.value));case 'fill':return fillBarrel(s,o.value);case 'month':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return tickDistillery(s);case 'sample':return sampleDistillery(s,o.value);case 'choose':return chooseDistillery(s,o.value?.id,o.value?.key);case 'bottle':return bottleNow(s,o.value);case 'price':return E.setSalePrice(s,o.value?.tier,o.value?.productId);case 'list':return E.listBottles(s,o.value);case 'decline':return declineOffer(s);case 'accept':return acceptOffer(s,o.value?.id,o.value?.termId);case 'assign':return assignCask(s,o.value?.id,o.value?.termId);case 'unassign':return cancelContract(s,o.value);case 'order-assign':return assignOrder(s,o.value);case 'order-cancel':return cancelOrder(s);case 'pause-trade':return pauseTrade(s);case 'resume-trade':return resumeTrade(s);case 'end-trade':return endTrade(s);case 'reconcile-trade-start':return reconcileTradeHistory(s);default:throw Error('操作の帳面が不正です。');}}
let checkpoint=null;
export function validateDistillery(s){
 assert(s?.version===T.version&&s.rules===T.rules&&Number.isInteger(s.seed)&&s.seed>0&&s.seed<=4294967295&&Array.isArray(s.operations)&&s.operations.length<=P.maxOperations,'対応していない業者別卸売の保存です。');M.restore(M.serialize(s.core));
 assert(s.origin===null||s.origin?.version===5&&s.origin?.seed===s.seed,'元の0.9保存が不正です。');const originText=JSON.stringify(s.origin);let j=s.origin===null?newDistillery(s.seed):upgraded(s.origin),start=0;
 if(checkpoint&&checkpoint.originText===originText&&checkpoint.seed===s.seed&&s.operations.length>=checkpoint.length&&JSON.stringify(s.operations.slice(0,checkpoint.length))===checkpoint.operations){j=clone(checkpoint.state);start=checkpoint.length;}
 for(let i=start;i<s.operations.length;i++)j=apply(j,s.operations[i]);j=E.endTasting(j);const cache=clone(j);if(s.still?.phase==='distilling')j=progress(j,s.still.distillation?.progress);
 assert(s.tastingId===null||Number.isInteger(s.tastingId),'試飲する樽が不正です。');if(s.tastingId!==null){assert(j.notesById[s.tastingId]?.samples.at(-1)?.age===E.currentCask(j,s.tastingId)?.age,'試飲の年月が不正です。');j=sampleDistillery(j,s.tastingId);}
 assert(JSON.stringify(s)===JSON.stringify(j),'蒸留所の状態と操作の帳面が一致しません。');checkpoint={originText,seed:s.seed,length:s.operations.length,operations:JSON.stringify(s.operations),state:cache};return true;
}
export function serializeDistillery(s){validateDistillery(s);return JSON.stringify(s);}
export function restoreDistillery(text){assert(typeof text==='string'&&text.length<P.maxSaveBytes*4+16384,'保存が大きすぎます。');let s;try{s=JSON.parse(text);}catch{throw Error('帳面を読み取れません。');}if([3,4,5].includes(s?.version))return upgraded(s);validateDistillery(s);return s;}
