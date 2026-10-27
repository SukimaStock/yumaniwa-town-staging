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
 // Only a complete native release sequence proves the per-brand ordinal.
 const ordered=[...releases.values()].sort((a,b)=>a.id-b.id),complete=ordered.length>0&&ordered.every((r,i)=>r.id===i+1&&Number.isInteger(r.brandId));
 const sameBrand=ordered.filter(r=>r.brandId===brandId),ordinal=sameBrand.findIndex(r=>r.id===release?.id)+1;
 if(complete&&ordinal>0)label+=' 第'+ordinal+'回';
 else if(!release||sameBrand.length>1)label+='・'+identity;
 return label;
}
