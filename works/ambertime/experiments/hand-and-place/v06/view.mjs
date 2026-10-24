// Store bottles identify the delivered release; they never count shop stock.
export function usable(l,mode){return l.stock+(mode==='C'?(l.retail??0):0);}
export function motionsFrom(events){return events.flatMap(e=>e.type==='delivery'?[{kind:'delivery',shopId:e.shopId,lotId:e.lotId}]:e.type==='order'?[{kind:'order',shopId:e.shopId,orderId:e.orderId}]:[]);}
