// Derived shop facts and presentation only. No model imports, state writes or clocks.
export const SHOP_REMARK_TEXT=Object.freeze({
 'town-liquor':Object.freeze({neutral:'いらっしゃいませ。',first:'ウイスキー、届きました。',repeat:'少しずつ届けてもらいましたね。',long:'何度も届けてくれましたね。',gap:'しばらく届いていませんね。'}),
 supermarket:Object.freeze({pre:'いらっしゃいませ。',await:'取扱いを始めました。',received:'ウイスキーを受け取りました。',repeat:'何度か届けてもらいましたね。',gap:'しばらく届いていませんね。'}),
 department:Object.freeze({pre:'いらっしゃいませ。',offer:'この発売回が気になっています。',pending:'5本、お待ちしています。',received:'5本、受け取りました。',reoffer:'こちらの発売回も、気になります。'})
});
const storeId=x=>x.shopId??'town-liquor';
const validMonth=(n,now)=>Number.isInteger(n)&&n>=0&&n<=now;
export function shopRemarkFacts(state,shopId,brandId=1){
 const month=Number.isInteger(state?.core?.month)&&state.core.month>=0?state.core.month:0;
 const relation=(state?.shop?.relations??[]).find(r=>storeId(r)===shopId&&r.brandId===brandId&&validMonth(r.startedMonth,month));
 const deliveries=(state?.shop?.deliveries??[]).filter(d=>storeId(d)===shopId&&d.brandId===brandId&&Number.isInteger(d.count)&&d.count>0&&validMonth(d.month,month));
 const deliveryMonths=[...new Set(deliveries.map(d=>d.month))].sort((a,b)=>a-b),lastDeliveryMonth=deliveryMonths.at(-1)??null;
 const offers=[state?.shop?.offer,...(state?.shop?.pendingOffers??[])].filter(o=>o&&o.shopId===shopId&&o.brandId===brandId);
 const interests=shopId==='department'?(state?.department?.interests??[]).filter(i=>i.brandId===brandId):[];
 const adoptions=shopId==='department'?(state?.department?.adoptions??[]).filter(a=>a.brandId===brandId&&a.count===5&&validMonth(a.month,month)):[];
 return {shopId,brandId,month,related:!!relation,startedMonth:relation?.startedMonth??null,relationshipMonths:relation?month-relation.startedMonth:0,
  deliveryBottles:deliveries.reduce((n,d)=>n+d.count,0),deliveryMonths,deliveryMonthCount:deliveryMonths.length,lastDeliveryMonth,gapMonths:lastDeliveryMonth===null?null:month-lastDeliveryMonth,
  hasCurrentOffer:offers.length>0,hasUnapprovedInterest:interests.some(i=>!i.pendingDelivery),hasPendingFive:interests.some(i=>i.pendingDelivery?.count===5),
  hasReceivedFive:shopId==='department'&&(adoptions.length>0||deliveries.some(d=>d.count===5)),adoptionCount:adoptions.length};
}
export function classifyShopRemark(facts){
 if(facts.shopId==='department'){
  if(facts.hasPendingFive)return 'pending';
  if(facts.hasCurrentOffer||facts.hasUnapprovedInterest)return facts.hasReceivedFive?'reoffer':'offer';
  return facts.hasReceivedFive?'received':'pre';
 }
 if(facts.shopId==='town-liquor'){
  if(!facts.deliveryMonthCount)return 'neutral';
  if(facts.gapMonths>=6)return 'gap';
  if(facts.deliveryMonthCount>=6)return 'long';
  return facts.deliveryMonthCount>=2?'repeat':'first';
 }
 if(facts.shopId==='supermarket'){
  if(!facts.deliveryMonthCount)return facts.related?'await':'pre';
  if(facts.gapMonths>=6)return 'gap';
  return facts.deliveryMonthCount>=2?'repeat':'received';
 }
 return 'neutral';
}
export function shopRemark(state,shopId,brandId=1){
 const facts=shopRemarkFacts(state,shopId,brandId),key=classifyShopRemark(facts);
 return {key,text:SHOP_REMARK_TEXT[shopId]?.[key]??'',facts};
}
