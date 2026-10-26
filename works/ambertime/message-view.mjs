// Live presentation only. Never rewrite stored prose, names, events or receipts.
export const LIVE_MESSAGE=Object.freeze({
 unchanged:'変更なし',
 salesLoading:'販売記録を読んでいます…',
 reservationCancelled:'予約取消',
 reservationPaused:'予約停止',
 reservationResumed:'予約再開',
 shopGreeting:'これからよろしくお願いします。'
});

// Product/release IDs are facts; dates and legacy record.name can be ambiguous.
// The latter may be a taste description, so it is never guessed to be a brand.
export function soldOutLabel(after,productId,before={}){
 const releases=new Map((before.releases??[]).map(r=>[r.id,r]));
 for(const r of after.releases??[])releases.set(r.id,r);
 const release=[...releases.values()].find(r=>r.productId===productId);
 const record=after.records?.find(r=>r.productId===productId)??before.records?.find(r=>r.productId===productId);
 const brandId=release?.brandId??record?.brandId;
 const brands=new Map((before.brands??[]).map(b=>[b.id,b]));
 for(const b of after.brands??[])brands.set(b.id,b);
 const brand=brands.get(brandId),releaseId=release?.id??record?.releaseId;
 const identity=Number.isInteger(releaseId)?'発売 #'+releaseId:'商品 #'+productId;
 if(!brand?.name)return 'ウイスキー（'+identity+'）';
 let label=brand.name;
 if([...brands.values()].some(b=>b.id!==brandId&&b.name===brand.name))label+='（ブランド #'+brandId+'）';
 // Use the recorded release ID, not a reconstructed ordinal for sparse old ledgers.
 if(!release||[...releases.values()].filter(r=>r.brandId===brandId).length>1)label+='・'+identity;
 return label;
}
