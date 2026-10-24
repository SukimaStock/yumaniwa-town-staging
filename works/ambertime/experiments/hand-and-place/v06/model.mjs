// Independent allocation/manual-delivery experiment. A delegates unchanged v04 rules.
import * as Native from '../v04/model.mjs';
import {checksum} from '../../shop-expansion/v01/model.mjs';
export const {F,STORES,recipeText}=Native;
export const VERSION='ambertime-hand-and-place/0.6';
const clone=x=>structuredClone(x),assert=(ok,text)=>{if(!ok)throw Error(text);};
const lot=(s,id)=>s.lots.find(l=>l.id===id),order=(s,id)=>s.orders.find(o=>o.id===id),store=id=>STORES.find(n=>n.id===id),clamp=n=>Math.max(1,Math.min(3,n));
const record=(s,type,text,fields={})=>s.events.push({id:s.events.length+1,month:s.month,type,text,...fields});
export function create({seed=42,scenario='standard',mode='C'}={}){
 assert(['A','B','C'].includes(mode),'比較方式を選んでください。');const s=Native.create({seed,scenario});s.mode=mode;s.initialMode=mode;
 if(mode!=='A'){for(const l of s.lots)Object.assign(l,{retail:0,retailSold:0,retailSince:null});for(const shop of Object.values(s.shops))shop.lastUsedDeliveryId=null;}
 return s;
}
function planFor(shopId,l,count){const wood=Math.max(l.profile.wood,l.profile.vanilla);let kind='same',wish=null,usageEvery=1,reasonCode='restaurant-ordinary';if(shopId==='restaurant'&&(l.profile.smoke>.45||wood>.45)){kind='different';wish='lighter';usageEvery=2;reasonCode='restaurant-strong';}else if(shopId==='liquor'&&wood>.45&&l.ageMonths>=72){kind='different';wish='younger';reasonCode='liquor-aged-wood';}else if(shopId==='liquor'&&l.profile.smoke>.45)reasonCode='liquor-smoke';else if(shopId==='liquor'){kind='different';wish='other';reasonCode='liquor-other';}return {kind,wish,usageEvery,nextCount:clamp(kind==='same'?count+1:count),reasonCode};}
function request(s,shopId,count,reason){const source=lot(s,reason.sourceLotId),n=store(shopId);let text;
 if(reason.code==='same')text=`前に渡してもらった「${source.label}」を、また${count}本お願いします。`;
 else if(reason.wish==='lighter')text=`次はもう少し軽い味を${count}本、試してみたいです。`;
 else if(reason.wish==='younger')text=`前と同じ製法の、もう少し若い一本を${count}本、試してみたいです。`;
 else if(reason.wish==='other')text=`次は前と違う一本を${count}本、試してみたいです。`;
 else text=`改めて${count}本、お願いできますか。`;
 const o={id:s.orders.length+1,shopId,month:s.month,count,text,reason:clone(reason),status:'open',deliveredCount:0};s.orders.push(o);s.shops[shopId].orderId=o.id;s.shops[shopId].retryAt=null;record(s,'order',`${n.name}：${text}`,{orderId:o.id,shopId,count,reason:clone(reason)});return o;
}
function inventory(s){return {month:s.month,hand:s.lots.map(l=>({id:l.id,stock:l.stock,retail:l.retail??0,retailSold:l.retailSold??0})),shops:Object.fromEntries(STORES.map(n=>[n.id,{stock:s.shops[n.id].stock,batches:s.deliveries.filter(d=>d.shopId===n.id&&(d.remaining??0)>0).map(d=>({deliveryId:d.id,lotId:d.lotId,remaining:d.remaining}))}]))};}
function checkCount(count,available){assert(Number.isInteger(count)&&count>0&&count<=available,'手元にある本数以内の正の整数を指定してください。');}
function step(s){assert(s.month<1200,'試遊は100年までです。');s.month++;
 // One actual self-retail sale in total, oldest currently allocated lot first.
 const retail=s.lots.filter(l=>l.retail>0).sort((a,b)=>a.retailSince-b.retailSince||a.id-b.id)[0];
 if(retail){const before=retail.retail;retail.retail--;retail.retailSold++;if(!retail.retail)retail.retailSince=null;record(s,'retail-sale',`自店で発売#${retail.id}が1本売れました。`,{lotId:retail.id,count:1,retailBefore:before,retailAfter:retail.retail});}
 for(const n of STORES){const shop=s.shops[n.id],front=s.deliveries.find(d=>d.shopId===n.id&&d.remaining>0);
  if(front&&s.month>front.month&&(s.month-front.month)%front.plan.usageEvery===0){front.remaining--;shop.stock--;shop.lastUsedDeliveryId=front.id;record(s,'use',`${n.name}で1本使われました。`,{shopId:n.id,lotId:front.lotId,deliveryId:front.id,count:1,remaining:shop.stock,deliveryRemaining:front.remaining});}
  if(shop.stock>0||s.orders.some(o=>o.shopId===n.id&&o.status==='open'))continue;
  const actual=s.deliveries.find(d=>d.id===shop.lastUsedDeliveryId);
  if(shop.retryAt!==null){if(s.month<shop.retryAt)continue;const previous=[...s.orders].reverse().find(o=>o.shopId===n.id);request(s,n.id,previous?.count??2,{code:'declined',sourceDeliveryId:actual?.id??null,sourceLotId:actual?.lotId??null,...(actual?{wish:actual.plan.wish}:{})});}
  else if(actual)request(s,n.id,actual.plan.nextCount,{code:actual.plan.kind,wish:actual.plan.wish,reasonCode:actual.plan.reasonCode,sourceDeliveryId:actual.id,sourceLotId:actual.lotId});
 }
 // Native one-month preparation and maturation, without importing native distribution.
 for(const j of s.jobs){if(j.stage==='preparing'){j.stage='aging';record(s,'prepared',`仕込み#${j.id}が終わり、熟成を始めました。`,{jobId:j.id});}else if(j.ageMonths<1200){j.flavorState=F.advance(j.flavorState,1);j.ageMonths++;}}
 record(s,'month',`${s.month}か月目になりました。`);
}
export function dispatch(s,action){
 assert(action&&typeof action.type==='string','操作を確認してください。');if(s.mode==='A')return Native.dispatch(s,action);
 const a=clone(action),observed=['allocate','reclaim','deliver','decline','rebrew','bottle'].includes(a.type),before=observed?inventory(s):null,startActions=s.actions.length,startObservations=s.observations.length;let result;
 switch(a.type){
 case 'allocate': {const l=lot(s,a.lotId);assert(l,'発売回を選んでください。');checkCount(a.count,l.stock);l.stock-=a.count;if(!l.retail)l.retailSince=s.month;l.retail+=a.count;result={text:`発売#${l.id}を${a.count}本、自店に配分しました。`,outcome:'allocated',lotId:l.id,count:a.count};record(s,'allocate',result.text,{lotId:l.id,count:a.count,handAfter:l.stock,retailAfter:l.retail});break;}
 case 'reclaim': {assert(s.mode==='C','この比較方式では、自店に配分した在庫を戻せません。');const l=lot(s,a.lotId);assert(l,'発売回を選んでください。');checkCount(a.count,l.retail);l.retail-=a.count;l.stock+=a.count;if(!l.retail)l.retailSince=null;result={text:`発売#${l.id}の未販売分${a.count}本を手元に戻しました。`,outcome:'reclaimed',lotId:l.id,count:a.count};record(s,'reclaim',result.text,{lotId:l.id,count:a.count,handAfter:l.stock,retailAfter:l.retail});break;}
 case 'deliver': {const n=store(a.shopId),l=lot(s,a.lotId);assert(n&&l,'渡す店と一本を選んでください。');checkCount(a.count,l.stock);const shop=s.shops[n.id],orderId=a.orderId??null,o=orderId===null?null:order(s,orderId);assert(orderId===null||(o&&o.shopId===n.id&&o.status==='open'&&shop.orderId===o.id),'この店の未対応の希望を選んでください。');const count=a.count,plan=planFor(n.id,l,count),previous=lot(s,o?.reason.sourceLotId),sameRecipe=previous&&previous.ageMonths===l.ageMonths&&['malt','ferment','start','end','cask'].every(k=>previous.recipe[k]===l.recipe[k]);let reply='ありがとうございます。この一本を受け取ります。';if(o?.reason.code==='same'&&previous?.id!==l.id)reply=sameRecipe?'前と同じ製法・同じ熟成年数の、今回の一本ですね。'+reply:'前とは別の一本ですね。'+reply;
  const d={id:s.deliveries.length+1,month:s.month,orderId,shopId:n.id,lotId:l.id,count,remaining:count,handBefore:l.stock,handAfter:l.stock-count,shopBefore:shop.stock,shopAfter:shop.stock+count,reply,plan};l.stock-=count;shop.stock+=count;shop.lotId=l.id;shop.lastDeliveryId=d.id;shop.usageEvery=plan.usageEvery;if(o){o.deliveredCount=count;o.status=count<o.count?'partial':'fulfilled';shop.orderId=null;shop.retryAt=null;}s.deliveries.push(d);if(s.selectedOrderId===orderId)s.selectedOrderId=null;s.selectedLotId=null;result={text:reply,outcome:o?o.status:'delivered',deliveryId:d.id,orderId,shopId:n.id,lotId:l.id,count};record(s,'delivery',`${n.name}へ発売#${l.id}を${count}本渡しました。`,{deliveryId:d.id,orderId,shopId:n.id,lotId:l.id,count,reply,plan:clone(plan)});break;}
 case 'step': assert(a.months===undefined||a.months===1,'1か月ずつ進めてください。');step(s);result={text:'1か月進めました。',outcome:'step'};break;
 default: {result=Native.dispatch(s,a);if(a.type==='bottle'){const l=lot(s,result.lotId);Object.assign(l,{retail:0,retailSold:0,retailSince:null});}break;}
 }
 if(s.actions.length===startActions)s.actions.push({...a,month:s.month});
 if(observed){s.observations.splice(startObservations);const observedOrderId=Object.hasOwn(result,'orderId')?result.orderId:a.orderId??null,o=order(s,observedOrderId);s.observations.push({actionIndex:startActions,action:a.type,lotId:result.lotId??a.lotId??null,shopId:result.shopId??o?.shopId??null,orderId:observedOrderId,deliveryId:result.deliveryId??null,sourceDeliveryId:o?.reason.sourceDeliveryId??null,sourceLotId:result.sourceLotId??(a.type==='rebrew'?result.lotId:o?.reason.sourceLotId)??null,before,after:inventory(s),outcome:result.outcome,reply:result.text});}
 return result;
}
export function validate(s){if(s.mode==='A')return Native.validate(s);const errors=[];
 for(const l of s.lots){const sent=s.deliveries.filter(d=>d.lotId===l.id).reduce((n,d)=>n+d.count,0),sold=s.events.filter(e=>e.type==='retail-sale'&&e.lotId===l.id).reduce((n,e)=>n+e.count,0);if(![l.stock,l.retail,l.retailSold].every(n=>Number.isInteger(n)&&n>=0)||l.count!==l.stock+l.retail+l.retailSold+sent||sold!==l.retailSold)errors.push('lot-conservation');if(!F.valid(l.recipe)||l.ageMonths<1)errors.push('recipe');if(l.sourceId!==null&&!lot(s,l.sourceId))errors.push('source');}
 for(const n of STORES){const shop=s.shops[n.id],ds=s.deliveries.filter(d=>d.shopId===n.id),used=s.events.filter(e=>e.type==='use'&&e.shopId===n.id).reduce((sum,e)=>sum+e.count,0),received=ds.reduce((sum,d)=>sum+d.count,0),remaining=ds.reduce((sum,d)=>sum+d.remaining,0),open=s.orders.filter(o=>o.shopId===n.id&&o.status==='open');if(!Number.isInteger(shop.stock)||shop.stock<0||shop.stock!==remaining||received!==remaining+used)errors.push('shop-conservation');if(open.length>1||shop.orderId!==(open[0]?.id??null))errors.push('open-wish');}
 for(const d of s.deliveries){const used=s.events.filter(e=>e.type==='use'&&e.deliveryId===d.id).reduce((n,e)=>n+e.count,0),o=d.orderId===null?null:order(s,d.orderId);if(!lot(s,d.lotId)||!store(d.shopId)||!Number.isInteger(d.count)||d.count<1||!Number.isInteger(d.remaining)||d.remaining<0||d.count!==d.remaining+used||d.handBefore-d.handAfter!==d.count||d.shopAfter-d.shopBefore!==d.count)errors.push('delivery');if(d.orderId!==null&&(!o||o.shopId!==d.shopId||o.status!== (d.count<o.count?'partial':'fulfilled')||o.deliveredCount!==d.count))errors.push('answered-wish');}
 const answered=s.deliveries.filter(d=>d.orderId!==null);if(new Set(answered.map(d=>d.orderId)).size!==answered.length)errors.push('duplicate-answer');
 for(const o of s.orders){if(o.reason.sourceDeliveryId!==null){const d=s.deliveries.find(d=>d.id===o.reason.sourceDeliveryId),actual=s.events.find(e=>e.type==='use'&&e.deliveryId===d?.id&&e.month<=o.month);if(!d||d.shopId!==o.shopId||d.lotId!==o.reason.sourceLotId||!actual)errors.push('wish-source');}}
 for(const e of s.events.filter(e=>e.type==='use')){const d=s.deliveries.find(d=>d.id===e.deliveryId);if(!d||d.shopId!==e.shopId||d.lotId!==e.lotId||e.month<=d.month||(e.month-d.month)%d.plan.usageEvery!==0)errors.push('use-source');}
 if(s.jobs.length>4||s.jobs.some(j=>!lot(s,j.sourceId)||j.ageMonths!==j.flavorState.barrels[0].months))errors.push('jobs');return {ok:errors.length===0,errors:[...new Set(errors)]};
}
export function exportLog(s){const observations=s.observations.map(o=>({...clone(o),nextAction:clone(s.actions[o.actionIndex+1]??null)})),state=clone(s);delete state.observations;const data={schema:VERSION,initial:{seed:s.seed,scenario:s.initialScenario,mode:s.initialMode},state,observations,validation:validate(s)};return {...data,checksum:checksum(data)};}
export function replay(log){assert(log?.schema===VERSION,'このLabの操作ログを選んでください。');const {checksum:hash,...data}=log;assert(checksum(data)===hash,'ログが変更されています。');const s=create(log.initial);for(const a of log.state.actions){const {month,...action}=a;dispatch(s,action);assert(s.month===month,'操作の月が一致しません。');}assert(checksum(exportLog(s))===checksum(log),'再現結果が一致しません。');return s;}
