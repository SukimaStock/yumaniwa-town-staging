// Presentation only. Events are collected at saved transitions, never at render/reload.
export function automaticEvents(before,after){
 const events=[];
 if(before.usual?.reservation?.status==='active'){
  const known=new Set(before.core.casks.map(c=>c.id));
  for(const c of after.core.casks)if(!known.has(c.id))events.push({id:'fill:'+c.id,kind:'filled',count:1});
 }
 if(after.core.month!==before.core.month){
  for(const b of after.automation?.lastBottlings??[])if(b.month===after.core.month)events.push({id:'bottle:'+b.productId,kind:'bottled',count:b.count});
  const orders=after.shopDemand?.lastOrders??[];
  const quiet=after.workPreferences?.version===1,shipped=orders.reduce((n,o)=>n+o.shipped,0);
  // Unfilled requests remain in the ledger; a shortage is not a new shipment.
  if(quiet){if(shipped>0)events.push({id:'shipping:'+after.core.month,kind:'shipping',count:shipped});}
  else if(orders.length)events.push({id:'orders:'+after.core.month,kind:'orders',count:orders.reduce((n,o)=>n+o.requested,0),shipped,unmet:orders.reduce((n,o)=>n+o.unmet,0)});
  const sales=after.core.lastMonth;
  if(sales?.bottles>0)events.push({id:'sales:'+after.core.month,kind:'sales',count:sales.bottles,revenue:sales.revenue});
 }
 return events;
}
export function noticeText(events){
 const total=kind=>events.filter(e=>e.kind===kind).reduce((a,e)=>({count:a.count+(e.count??0),revenue:a.revenue+(e.revenue??0),shipped:a.shipped+(e.shipped??0),unmet:a.unmet+(e.unmet??0)}),{count:0,revenue:0,shipped:0,unmet:0}),filled=total('filled'),bottled=total('bottled'),sales=total('sales'),orders=total('orders'),shipping=total('shipping');
 return [filled.count?'仕込み完了 '+filled.count+'たる':'',bottled.count?'ビン詰め '+bottled.count+'本':'',sales.count?'販売 '+sales.count+'本 · 入金 £'+sales.revenue.toLocaleString('en-GB',{maximumFractionDigits:0}):'',shipping.count?'発送 '+shipping.count+'本':'',events.some(e=>e.kind==='orders')?'注文 '+orders.count+'本 · 発送 '+orders.shipped+'本'+(orders.unmet?' · 未発送 '+orders.unmet+'本':''):'',events.filter(e=>e.kind==='message').at(-1)?.text??''].filter(Boolean).join(' / ');
}
export function transientNotices({show,hide,setTimer=setTimeout,clearTimer=clearTimeout,duration=3500}){
 const seen=new Set();let visible=[],timer=null;
 const clear=()=>{if(timer!==null)clearTimer(timer);timer=null;visible=[];hide();};
 return {push(events){const batchIds=new Set(),fresh=events.filter(e=>{if(seen.has(e.id)||batchIds.has(e.id))return false;batchIds.add(e.id);return true;});if(!fresh.length)return;for(const e of fresh){seen.add(e.id);if(seen.size>256)seen.delete(seen.values().next().value);}visible.push(...fresh);if(visible.length>32)visible=visible.slice(-32);if(timer!==null)clearTimer(timer);show(noticeText(visible));timer=setTimer(clear,duration);},clear,reset(){clear();seen.clear();}};
}
