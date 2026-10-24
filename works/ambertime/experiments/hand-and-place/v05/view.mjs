// Presentation only. No clock, dispatch, storage, or random source.
export const MODES=['A','B','C'];
export function bottles(count){
 const n=Math.max(0,Math.floor(Number(count)||0));
 return {visible:Math.min(n,3),extra:Math.max(0,n-3)};
}
export function changesFrom(events){
 const shops={},hand={},motions=[];
 for(const e of events){
  if(e.type==='delivery'){
   shops[e.shopId]={origin:'hand',text:`受取 +${e.count}本`,eventId:e.id};
   hand[e.lotId]={origin:'hand',text:`渡した −${e.count}本`,eventId:e.id};
   motions.push({kind:'delivery',shopId:e.shopId,lotId:e.lotId,count:e.count});
  }else if(e.type==='use'){
   shops[e.shopId]={origin:'time',text:`時間：${e.remaining+e.count}→${e.remaining}本`,eventId:e.id};
   motions.push({kind:'use',shopId:e.shopId,count:e.count});
  }else if(e.type==='order'){
   const previous=shops[e.shopId]?.text;
   shops[e.shopId]={origin:'time',text:previous?`${previous} · 注文到着`:'注文到着',eventId:e.id};
   motions.push({kind:'order',shopId:e.shopId,orderId:e.orderId});
  }else if(e.type==='bottle'){
   hand[e.lotId]={origin:'hand',text:'瓶詰め +6本',eventId:e.id};
  }
 }
 return {shops,hand,motions};
}
