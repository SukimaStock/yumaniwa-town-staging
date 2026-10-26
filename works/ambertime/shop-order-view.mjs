// Read-only presentation of ordinary-store relations and completed monthly facts.
// No model imports, validation, demand projection, state copies or timers.
const ordinary=id=>id==='town-liquor'||id==='supermarket';
const storeId=x=>x.shopId??'town-liquor';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function shopRelationshipLabel(state,shopId){
 if(!ordinary(shopId))return null;
 if([state?.shop?.offer,...(state?.shop?.pendingOffers??[])].some(o=>o?.shopId===shopId))return '申し出あり';
 return state?.shop?.relations?.some(r=>storeId(r)===shopId)?'取扱中':'取扱前';
}
export function latestShopOrder(state,shopId){
 if(!ordinary(shopId))return null;
 let latest=null;
 for(const row of state?.shopDemand?.lastOrders??[]){
  if(row.shopId!==shopId||!Number.isInteger(row.month)||row.month<0||row.month>state.core.month)continue;
  if(!['requested','shipped','unmet'].every(key=>Number.isInteger(row[key])&&row[key]>=0))continue;
  if(!latest||row.month>=latest.month)latest=row;
 }
 // Return only the stored facts the view needs. profileProductId is a demand
 // reference, not an order for that product/flavor, and is never presented.
 return latest?{month:latest.month,requested:latest.requested,shipped:latest.shipped,unmet:latest.unmet,reason:latest.reason}:null;
}
export function shopOrderReason(order,minQuantity){
 if(order.reason==='no-eligible-release')return '発送条件に合う発売回がありませんでした。';
 if(order.unmet===0)return '';
 switch(order.reason){
  case 'insufficient-stock':return '在庫不足';
  case 'minimum-lot':return Number.isInteger(minQuantity)&&minQuantity>0?'未発送分は、発売回ごとの最低'+minQuantity+'本に届きませんでした。':'未発送分は最低納品本数に届きませんでした。';
  case 'stock-or-capacity':return '在庫または月の受入上限による制約がありました。';
  case 'delivery-ledger-full':return '納品記録の上限に達し、未発送分を送れませんでした。';
  default:return '未発送の詳しい理由は表示できません。';
 }
}
export function shopOrderMarkup(state,shopId,{monthLabel,minQuantity}={}){
 if(!ordinary(shopId)||(shopId==='town-liquor'&&state?.placement?.version===1))return '';
 const order=latestShopOrder(state,shopId);
 if(!order)return '<section class="shop-order-result" aria-label="直近の発送結果"><p class="quiet">注文記録なし</p></section>';
 const date=typeof monthLabel==='function'?monthLabel(order.month):order.month+'か月目';
 const empty=order.requested===0&&order.shipped===0&&order.unmet===0;
 const shipment=order.unmet===0?'発送 '+order.shipped+'本':(order.shipped?'発送 '+order.shipped+'本':'発送なし')+'・'+order.unmet+'本未発送';
 const reason=shopOrderReason(order,minQuantity);
 return '<section class="shop-order-result" aria-label="直近の発送結果" data-order-month="'+order.month+'"><p class="quiet">'+esc(date)+'</p><p>'+(empty?'注文なし':'注文 '+order.requested+'本<br>'+shipment)+'</p>'+(reason?'<p class="quiet">'+esc(reason)+'</p>':'')+'</section>';
}
