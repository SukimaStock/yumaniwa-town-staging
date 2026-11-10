// The existing offer dialog consumes this projection. No delivery controls or
// game mutations belong here; a registry entry alone never proves a contract.
import {tradingPartner} from './trading-partners.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function regionalOfferView(game,offer){
 const partner=tradingPartner(offer?.partnerId),release=game?.releases?.find(r=>r.id===offer?.releaseId),brand=game?.brands?.find(b=>b.id===offer?.brandId);
 if(!partner||partner.kind!=='regional-desk'||offer.status!=='pending'||offer.regionId!==partner.regionId||!release||release.brandId!==brand?.id)return null;
 return {title:partner.name+'からの申し出',body:'<p>好み：'+esc(partner.preference.label)+'</p><p>'+esc(brand.name)+'のお酒について、取扱いの問い合わせが届きました。</p><p class="quiet">納品は準備中です。</p>'};
}
export function regionalPartnerView(game,partnerId,contract){
 const partner=tradingPartner(partnerId);
 if(!partner||partner.kind!=='regional-desk'||contract?.partnerId!==partnerId||contract.regionId!==partner.regionId)return null;
 return {title:partner.name,body:'<p>好み：'+esc(partner.preference.label)+'</p><p>取扱関係あり</p><p class="quiet">納品は準備中です。</p>'};
}
