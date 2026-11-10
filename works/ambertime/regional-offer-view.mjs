import {regionalDeliveryMode,regionalDeliveryRows,regionalDeliveryHistory} from './regional-deliveries.mjs?world=world-network-v01';
// The existing offer dialog consumes this projection. No delivery controls or
// game mutations belong here; a registry entry alone never proves a contract.
import {tradingPartner} from './trading-partners.mjs?world=world-network-v01';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function regionalOfferView(game,offer){
 const partner=tradingPartner(offer?.partnerId),release=game?.releases?.find(r=>r.id===offer?.releaseId),brand=game?.brands?.find(b=>b.id===offer?.brandId);
 if(!partner||partner.tradeMethod!=='player-delivery'||offer.status!=='pending'||offer.regionId!==partner.regionId||!release||release.brandId!==brand?.id)return null;
 return {title:partner.name+'からの申し出',body:'<p>好み：'+esc(partner.preference.label)+'</p><p>'+esc(brand.name)+'のお酒について、取扱いの問い合わせが届きました。</p>'+(regionalDeliveryMode(game)?'':'<p class="quiet">納品は準備中です。</p>')};
}
export function regionalPartnerView(game,partnerId,contract){
 const partner=tradingPartner(partnerId);
 if(!partner||partner.tradeMethod!=='player-delivery'||contract?.partnerId!==partnerId||contract.regionId!==partner.regionId)return null;
 const rows=regionalDeliveryMode(game)?regionalDeliveryRows(game,partnerId):[],history=regionalDeliveryMode(game)?regionalDeliveryHistory(game,partnerId):[];
 const count=rows.reduce((n,r)=>n+r.count,0),delivered=history.reduce((n,r)=>n+r.count,0),revenue=history.reduce((n,r)=>n+Math.round(r.revenue*100),0)/100;
 return {title:partner.name,body:'<p>好み：'+esc(partner.preference.label)+'</p><p>取扱関係あり</p>'+(regionalDeliveryMode(game)?'<p>'+partner.acceptance.minAge+'か月以上 · 1本から</p>'+(count?'<p>未納品 '+count+'本</p>':'')+(delivered?'<p>累計納品 '+delivered+'本 · £'+revenue.toFixed(2)+'</p><p class="quiet">地域内の顧客実売は不明です。</p>':''):'<p class="quiet">納品は準備中です。</p>')};
}
