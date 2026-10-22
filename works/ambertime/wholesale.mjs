import * as V08 from './wholesale-v08.mjs?v=stage4-r2';
import * as E from './economy.mjs?v=stage4-r2';
import * as M from './model.mjs?v=stage4-r2';
import {mixSeed} from './character.mjs?v=stage4-r2';
import {PARALLEL_PARAMETERS as P,ECONOMY_PARAMETERS as C} from './economy-parameters.mjs';
import {WHOLESALE as W} from './wholesale-parameters.mjs';
export {currentCask,upkeep,observation,comparison,quote,salePrices,marketValue,endTasting,setSalePrice,listBottles} from './economy.mjs?v=stage4-r2';
const clone=x=>structuredClone(x),round=x=>Math.round(x*100)/100;
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const blocked=s=>s.tastingId!==null||s.decisions.length>0||s.trade.offer!==null;
function action(s,key,value){s.operations.push({key,...(value===undefined?{}:{value})});assert(s.operations.length<=P.maxOperations,'帳面がいっぱいです。');return s;}
export function newDistillery(seed=20261015){const s=E.newDistillery(seed);return {...s,version:4,rules:'parallel-wholesale-v081',trade:{rng:mixSeed(seed^0x57a1e),nextOfferMonth:6,offerSerial:0,offer:null,contract:null,history:[],lastShipment:null},origin:null};}
function draw(t){t.rng=(Math.imul(t.rng,1664525)+1013904223)>>>0;return t.rng/4294967296;}
function rest(s){s.trade.nextOfferMonth=s.core.month+W.cooldownMin+Math.floor(draw(s.trade)*W.cooldownRange);}
function history(s,item){s.trade.history=[...s.trade.history,{...item,month:s.core.month}].slice(-120);}
export function offerEvidence(s){const records=s.records.filter(r=>r.channel!=='wholesale'&&r.sold>0),sold=records.reduce((n,r)=>n+r.sold,0),young=records.filter(r=>r.age<=12).reduce((n,r)=>n+r.sold,0),recent=records.filter(r=>s.core.month-r.bottledMonth<=36).length;return {sold,young,recent,probability:Math.min(W.maxProbability,W.baseProbability+W.volumeWeight*Math.min(1,sold/120)+W.youngWeight*Math.min(1,young/80)+W.continuityWeight*Math.min(1,recent/3))};}
export function contractCandidates(s,offer=s.trade.offer){return offer?s.core.casks.filter(c=>c.age<=offer.targetAge-3&&M.bottleQuote(s.core,c.id).count>0):[];}
function maybeOffer(s){const t=s.trade;if(t.contract||t.offer||s.decisions.length||s.core.month<t.nextOfferMonth)return;const eligible=W.terms.filter(term=>s.core.casks.some(c=>c.age<=term.age-3));if(!eligible.length||offerEvidence(s).sold===0)return;if(draw(t)>=offerEvidence(s).probability)return;
 const term=eligible[Math.floor(draw(t)*eligible.length)],partner=W.partners[Math.floor(draw(t)*W.partners.length)],price=round(term.price*W.priceFactors[Math.floor(draw(t)*W.priceFactors.length)]);
 t.offer={id:++t.offerSerial,month:s.core.month,partner,targetAge:term.age,unitPrice:price,bottlingFee:C.bottlingCost};history(s,{kind:'offered',...t.offer});}
export function canStart(s){const c=E.canStart(s);return s.trade.offer?{...c,ok:false,reason:'届いた申し出を確認します。'}:c;}
export function startDistillation(s){assert(!s.trade.offer,'申し出を確認してから仕込みます。');return E.startDistillation(s);}
export function distillStep(s){return s.trade.offer?s:E.distillStep(s);}
export function stopDistillation(s){assert(!s.trade.offer,'申し出を確認します。');return E.stopDistillation(s);}
export function fillBarrel(s,type){assert(!s.trade.offer,'申し出を確認します。');return E.fillBarrel(s,type);}
export function sampleDistillery(s,id){assert(!s.trade.offer,'申し出を確認してから試飲します。');return E.sampleDistillery(s,id);}
export function chooseDistillery(s,id,key){assert(!s.trade.offer,'申し出を確認します。');return E.chooseDistillery(s,id,key);}
export function bottleNow(s,id){assert(s.trade.contract?.caskId!==id,'この樽は卸売契約中です。解除すると瓶詰めできます。');assert(!s.trade.offer,'申し出を確認します。');return E.bottleNow(s,id);}
export function declineOffer(s){assert(s.trade.offer&&s.tastingId===null&&!s.decisions.length,'先に樽の判断を終えます。');const j=clone(s);history(j,{kind:'declined',offerId:j.trade.offer.id});j.trade.offer=null;rest(j);return action(j,'decline');}
export function acceptOffer(s,id){assert(s.trade.offer&&!s.trade.contract&&s.tastingId===null&&!s.decisions.length,'今は契約できません。');assert(contractCandidates(s).some(c=>c.id===id),'契約できる樽を選びます。');const j=clone(s);j.trade.contract={...j.trade.offer,caskId:id,acceptedMonth:j.core.month};history(j,{kind:'accepted',...j.trade.contract});j.trade.offer=null;return action(j,'contract',id);}
export function cancelContract(s){assert(s.trade.contract&&s.tastingId===null,'試飲を終えてから契約を解除します。');const j=clone(s);history(j,{kind:'cancelled',...j.trade.contract});j.trade.contract=null;rest(j);return action(j,'cancel-contract');}
function reserve(s){return s.core.casks.reduce((n,c)=>n+M.bottleQuote(s.core,c.id).cost,0)+(s.core.spirit?Math.min(...Object.values(C.casks).map(c=>c.cost))+Math.floor((s.still.phase==='distilling'?C.baseLitres+C.extraLitres:s.core.spirit.litres)/C.bottleLitres)*C.bottlingCost:0);}
function rebuild(s){s.decisions=s.core.casks.slice().sort((a,b)=>a.id-b.id).filter(c=>s.notesById[c.id]?.pending).map(c=>({month:s.core.month,caskId:c.id,eventId:s.notesById[c.id].pending.id,pending:clone(s.notesById[c.id].pending)}));}
function syncRecords(s){s.records=s.records.map(r=>{const p=s.core.products.find(p=>p.id===r.productId);return p?{...r,sold:p.sold,revenue:p.revenue}:r;});if(s.result)s.result=s.records.find(r=>r.productId===s.result.productId)??s.result;}
// A contract delegates sale only. Ordinary maturity judgments stay pending.
function fundsTarget(s){return s.core.casks.filter(c=>E.quote(s,c.id).cost<=s.core.cash).sort((a,b)=>Number(a.id===s.trade.contract?.caskId)-Number(b.id===s.trade.contract?.caskId)||a.id-b.id)[0]??s.core.casks[0];}
function requestFunds(s){
 for(const c of s.core.casks){const n=s.notesById[c.id];if(n.pending?.id==='funds'){n.pending=null;n.phase='watching';}}
 const c=fundsTarget(s);if(!c)return;
 const k=s.trade.contract,remaining=k?Math.max(0,k.targetAge-E.currentCask(s,k.caskId).age):null;
 const n=s.notesById[c.id];n.phase='choice';n.pending={id:'funds',title:'瓶詰めの費用を残す',text:`所持金 £${round(s.core.cash)} · 瓶詰め予約 £${reserve(s)} · 維持費 £${E.upkeep(s)}/月。`+(k?`契約の出荷まで${remaining}か月。`:'')+(c.id===k?.caskId?'解除後の瓶詰め費を残して停止しています。':k?'契約を残し、こちらの樽から回収できます。':'こちらの樽から回収できます。'),options:[{id:'bottle',label:'瓶詰めを確かめる'}]};rebuild(s);
}
function upgraded(origin){const old=V08.restoreDistillery(JSON.stringify(origin)),j={...clone(old),version:4,rules:'parallel-wholesale-v081',operations:[],origin:clone(origin)};if(j.decisions.some(d=>d.eventId==='funds'))requestFunds(j);return j;}
function settle(s){const k=s.trade.contract,c=k&&E.currentCask(s,k.caskId);if(!k)return s;if(!c){history(s,{kind:'ended',...k});s.trade.contract=null;rest(s);return s;}if(c.age<k.targetAge)return s;
 const q=E.quote(s,c.id),gross=round(q.count*k.unitPrice);s.core.cash=round(s.core.cash+gross);s.core.totals.revenue=round(s.core.totals.revenue+gross);
 // One atomic receipt funds bottling. Direct sale skips only the shelf limit;
 // quantity, cash and stable-ID checks remain the ordinary bottling checks.
 s=E.bottleNow(s,c.id,{automatic:true,directSale:true});s.operations.pop();const p=s.core.products.find(p=>p.id===s.result.productId),r=s.records.at(-1);
 p.price=k.unitPrice;p.sold=p.originalStock;p.stock=0;p.revenue=gross;p.lastSold=p.sold;p.lastRevenue=gross;
 s.core.totals.bottlesSold+=p.sold;s.productsById[p.id].listed=false;
 Object.assign(r,{channel:'wholesale',partner:k.partner,unitPrice:k.unitPrice,contractAge:k.targetAge,sold:p.sold,revenue:gross,cash:s.core.cash});r.memory.push(`${k.acceptedMonth}か月目に卸売契約。${k.targetAge}か月で出荷。`);s.result=r;
 s.core.lastMonth.revenue=round(s.core.lastMonth.revenue+gross);s.core.lastMonth.bottles+=p.sold;s.core.lastMonth.sales.push({id:p.id,sold:p.sold,revenue:gross,channel:'wholesale'});
 s.core.journal[0].message=`卸売出荷 ${p.sold}本 · 売上 £${gross} · 瓶詰め費 £${q.cost}。`;
 const shipment={month:s.core.month,caskId:c.id,productId:p.id,partner:k.partner,bottles:p.sold,gross,cost:q.cost,net:round(gross-q.cost)};
 history(s,{kind:'shipped',...shipment});s.trade.lastShipment=shipment;s.trade.contract=null;rest(s);return s;
}
export function tickDistillery(s,expectedMonth=s.core.month){assert(Number.isInteger(expectedMonth)&&expectedMonth===s.core.month,'月次処理の対象月が一致しません。');if(blocked(s))return s;
 const empty=s.still.phase==='ready'&&!s.core.spirit&&!s.core.casks.length&&!s.core.products.some(p=>p.stock>0&&s.productsById[p.id]?.listed);if(empty&&s.core.cash-E.upkeep(s)<canStart(s).minimum)return s;
 let j=E.economicMonthly(s,expectedMonth);
 // Charge this month's occupied casks once, including the cask shipping now.
 const ids=j.core.casks.map(c=>c.id).sort((a,b)=>a-b),cents=Math.round(j.core.lastMonth.upkeep*100),share=ids.length?Math.floor(cents/ids.length):0;
 for(let i=0;i<ids.length;i++)j.batchesById[ids[i]].upkeep=round(j.batchesById[ids[i]].upkeep+(share+(i<cents-share*ids.length?1:0))/100);
 syncRecords(j);j=settle(j);
 if(j.core.cash<reserve(j)){j=clone(s);if(!j.core.casks.length)return s;requestFunds(j);
 }else{for(const id of Object.keys(j.batchesById))if(!j.notesById[id])delete j.batchesById[id];syncRecords(j);maybeOffer(j);}
 return action(j,'month',{progress:s.still.phase==='distilling'?s.still.distillation.progress:null});}
function progress(s,value){assert(!s.trade.offer||value===s.still.distillation?.progress,'申し出の確認中は蒸留を進めません。');assert(s.still.phase==='distilling'&&Number.isInteger(value)&&value>=s.still.distillation.progress&&value<P.distillMax,'蒸留の進行が不正です。');let j=s;while(j.still.distillation.progress<value){const next=E.distillStep(j);assert(next!==j,'停止中の蒸留です。');j=next;}return j;}
function apply(s,o){s=E.endTasting(s);switch(o.key){case 'start':return startDistillation(s);case 'stop':assert(Number.isInteger(o.value)&&o.value>=P.minimumStop&&o.value<P.distillMax,'抽出時期が不正です。');return stopDistillation(progress(s,o.value));case 'fill':return fillBarrel(s,o.value);case 'month':if(o.value?.progress!==null)s=progress(s,o.value?.progress);return tickDistillery(s);case 'sample':return sampleDistillery(s,o.value);case 'choose':return chooseDistillery(s,o.value?.id,o.value?.key);case 'bottle':return bottleNow(s,o.value);case 'price':return E.setSalePrice(s,o.value?.tier,o.value?.productId);case 'list':return E.listBottles(s,o.value);case 'decline':return declineOffer(s);case 'contract':return acceptOffer(s,o.value);case 'cancel-contract':return cancelContract(s);default:throw Error('操作の帳面が不正です。');}}
let checkpoint=null;
export function validateDistillery(s){assert(s?.version===4&&s.rules==='parallel-wholesale-v081'&&Number.isInteger(s.seed)&&s.seed>0&&s.seed<=4294967295&&Array.isArray(s.operations)&&s.operations.length<=P.maxOperations,'対応していない0.8.1の保存です。');M.restore(M.serialize(s.core));assert(s.origin===null||s.origin?.version===3&&s.origin?.seed===s.seed,'元の0.8保存が不正です。');const originText=JSON.stringify(s.origin);let j=s.origin===null?newDistillery(s.seed):upgraded(s.origin),start=0;if(checkpoint&&checkpoint.originText===originText&&checkpoint.seed===s.seed&&s.operations.length>=checkpoint.length&&JSON.stringify(s.operations.slice(0,checkpoint.length))===checkpoint.operations){j=clone(checkpoint.state);start=checkpoint.length;}for(let i=start;i<s.operations.length;i++)j=apply(j,s.operations[i]);j=E.endTasting(j);const cache=clone(j);if(s.still?.phase==='distilling')j=progress(j,s.still.distillation?.progress);assert(s.tastingId===null||Number.isInteger(s.tastingId),'試飲する樽が不正です。');if(s.tastingId!==null){assert(j.notesById[s.tastingId]?.samples.at(-1)?.age===E.currentCask(j,s.tastingId)?.age,'試飲の年月が不正です。');j=sampleDistillery(j,s.tastingId);}assert(JSON.stringify(s)===JSON.stringify(j),'蒸留所の状態と操作の帳面が一致しません。');checkpoint={originText,seed:s.seed,length:s.operations.length,operations:JSON.stringify(s.operations),state:cache};return true;}
export function serializeDistillery(s){validateDistillery(s);return JSON.stringify(s);}
export function restoreDistillery(text){assert(typeof text==='string'&&text.length<P.maxSaveBytes*2+4096,'保存が大きすぎます。');let s;try{s=JSON.parse(text);}catch{throw Error('帳面を読み取れません。');}if(s?.version===3)return upgraded(s);validateDistillery(s);return s;}

// Read-only display facts: use this version's frozen execution, including origins.
export function caskCreationIds(s){
 validateDistillery(s);
 const ids=s.origin?V08.caskCreationIds(s.origin):[],initial=s.origin?upgraded(s.origin):newDistillery(s.seed);
 let state=initial;
 for(const operation of s.operations){const before=new Set(state.core.casks.map(c=>c.id));state=apply(state,operation);for(const c of state.core.casks)if(!before.has(c.id))ids.push(c.id);}
 return ids;
}
