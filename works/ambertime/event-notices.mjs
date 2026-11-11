import {selectedTownEvents} from './player-news.mjs?v=adjust-a-r1';
// Presentation only. Events are collected at saved transitions, never at render/reload.
export function automaticEvents(before,after,caskLabel=()=>'',releaseLabel=()=>''){
 const events=selectedTownEvents(before,after);
 if(after.bottlingAssignment?.version===1){
  const old=new Map((before.automation?.reservations??[]).map(r=>[r.caskId,r]));
  const reservations=after.automation?.reservations??[];
  const finished=reservations.filter(r=>r.status==='completed'&&old.get(r.caskId)?.status==='active');
  // Stock waiting and paused reservations are still jobs, not a final completion.
  if(finished.length&&!reservations.some(r=>r.status==='active'||r.status==='paused'))events.push({id:'bottling-finished:'+after.core.month+':'+finished.map(r=>r.caskId).join(','),kind:'bottling-finished',text:'任せたビン詰めがすべて終わりました。'});
 }

 // A reservation is not a delivery. Only new committed formal receipts count;
 // this collector is called after the existing candidate save succeeds.
 const knownDeliveries=new Set((before.shop?.deliveries??[]).map(d=>d.id));
 const department=(after.shop?.deliveries??[]).filter(d=>!knownDeliveries.has(d.id)&&d.shopId==='department'&&d.month===after.core.month&&d.count>0);
 for(const d of department)events.push({id:'department-delivery:'+d.id,kind:'department-delivered',count:d.count,month:d.month,shopId:d.shopId,receiptId:d.id,releaseId:d.releaseId,productId:d.productId,revenue:d.revenue});
 if(before.usual?.reservation?.status==='active'){
  const known=new Set(before.core.casks.map(c=>c.id));
  for(const c of after.core.casks)if(!known.has(c.id))events.push({id:'fill:'+c.id,kind:'filled',count:1});
 }
 if(after.freeAging?.version===1){
  // Completion is a saved transition, including manual work within one month.
  // Ordinary sales and shipments remain in the ledger, never in the toast.
  const known=new Set((before.releases??[]).map(r=>r.productId));
  for(const r of after.releases??[])if(!known.has(r.productId)){
   const b=(after.automation?.lastBottlings??[]).find(b=>b.productId===r.productId);
   events.push({id:'bottle:'+r.productId,kind:'bottled',count:r.bottles,...(b?.mode==='age'?{mode:'age',caskId:b.caskId,caskLabel:caskLabel(b.caskId),remainingLitres:b.remainingLitres}:{})});
  }
  for(const old of before.core.products??[])if(old.stock>0){
   const p=after.core.products?.find(p=>p.id===old.id),r=after.releases?.find(r=>r.productId===old.id);
   // Bottling can prune an older empty product in this same transaction.
   // The release ledger still records its actual sell-out after settlement.
   if((after.productsById?.[old.id]?.listed??r?.listed)&&(p?p.stock===0:r?.status==='sold-out'))events.push({id:'sold-out:'+old.id,kind:'sold-out',releaseId:r?.id,...(releaseLabel(old.id)?{releaseLabel:releaseLabel(old.id)}:{})});
  }
  return events;
 }
 if(after.core.month!==before.core.month){
  for(const b of after.automation?.lastBottlings??[])if(b.month===after.core.month)events.push({id:'bottle:'+b.productId,kind:'bottled',count:b.count,...(after.bottlingRoles?.version===1&&b.mode==='age'?{mode:'age',caskId:b.caskId,caskLabel:caskLabel(b.caskId),remainingLitres:b.remainingLitres}:{})});
  const orders=after.shopDemand?.lastOrders??[];
  const quiet=after.workPreferences?.version===1,shipped=orders.reduce((n,o)=>n+o.shipped,0);
  // Unfilled requests remain in the ledger; a shortage is not a new shipment.
  if(quiet){if(shipped>0)events.push({id:'shipping:'+after.core.month,kind:'shipping',count:shipped});}
  else if(orders.length)events.push({id:'orders:'+after.core.month,kind:'orders',count:orders.reduce((n,o)=>n+o.requested,0),shipped,unmet:orders.reduce((n,o)=>n+o.unmet,0)});
  const sales=after.core.lastMonth;
  // The department's same receipt already has explicit feedback above.
  const count=(sales?.bottles??0)-department.reduce((n,d)=>n+d.count,0),revenue=(sales?.revenue??0)-department.reduce((n,d)=>n+d.revenue,0);
  if(count>0)events.push({id:'sales:'+after.core.month,kind:'sales',count,revenue:Math.max(0,revenue)});
 }
 return events;
}
export function noticeText(events){
 const total=kind=>events.filter(e=>e.kind===kind).reduce((a,e)=>({count:a.count+(e.count??0),revenue:a.revenue+(e.revenue??0),shipped:a.shipped+(e.shipped??0),unmet:a.unmet+(e.unmet??0)}),{count:0,revenue:0,shipped:0,unmet:0}),filled=total('filled'),bottled=total('bottled'),completed=events.filter(e=>e.kind==='bottled'&&e.mode==='age'),completionCount=completed.reduce((n,e)=>n+e.count,0),sales=total('sales'),orders=total('orders'),shipping=total('shipping');
 return [...events.filter(e=>e.kind==='bottling-finished').map(e=>e.text),...events.filter(e=>e.kind==='department-delivered').map(e=>'町のデパートへ'+e.count+'本納品しました。'),filled.count?'仕込み完了 '+filled.count+'たる':'',bottled.count>completionCount?'ビン詰め完了 '+(bottled.count-completionCount)+'本':'',...completed.map(e=>'ビン詰め完了 '+e.count+'本'+(Number.isFinite(e.remainingLitres)?' · '+(e.caskLabel?e.caskLabel+' ':'')+'残り '+e.remainingLitres.toFixed(1)+'L':'')),...events.filter(e=>e.kind==='sold-out').map(e=>(e.releaseLabel?e.releaseLabel+' ':Number.isInteger(e.releaseId)?'発売'+e.releaseId+' ':'')+'完売'),sales.count?'販売 '+sales.count+'本 · 入金 £'+sales.revenue.toLocaleString('en-GB',{maximumFractionDigits:0}):'',shipping.count?'発送 '+shipping.count+'本':'',events.some(e=>e.kind==='orders')?'注文 '+orders.count+'本 · 発送 '+orders.shipped+'本'+(orders.unmet?' · 未発送 '+orders.unmet+'本':''):'',events.filter(e=>e.kind==='message').reduce((best,e)=>(e.priority??0)>=(best?.priority??-1)?e:best,null)?.text??''].filter(Boolean).join(' / ');
}
export function transientNotices({show,hide,setTimer=setTimeout,clearTimer=clearTimeout,duration=3500,onExpire=()=>{}}){
 const seen=new Set();let visible=[],timer=null;
 const clear=()=>{if(timer!==null)clearTimer(timer);timer=null;visible=[];hide();};
 return {push(events,lifetime=duration){const batchIds=new Set(),fresh=events.filter(e=>{if(seen.has(e.id)||batchIds.has(e.id))return false;batchIds.add(e.id);return true;});if(!fresh.length)return;for(const e of fresh){seen.add(e.id);if(seen.size>256)seen.delete(seen.values().next().value);}visible.push(...fresh);if(visible.length>32)visible=visible.slice(-32);if(timer!==null)clearTimer(timer);show(noticeText(visible),visible,lifetime);timer=setTimer(()=>{clear();onExpire();},lifetime);},clear,reset(){clear();seen.clear();}};
}

// One presentation lane, bounded UI-only slots. Saved events and eligibility are
// owned by the model; this controller never mutates them or serializes history.
export function scopedNotices({room,safe,show,hide,setTimer=setTimeout,clearTimer=clearTimeout,now=()=>performance.now(),eligible=()=>true}){
 let current=null,timer=null,serial=0,epoch=0;
 const pending=new Map(),seen=new Set();
 const stats={received:0,displayed:0,discarded:0,interrupted:0};
 const priority={operation:0,world:1,shop:2,ambient:3};
 const key=n=>n.kind==='operation'?'operation:'+n.room:n.kind;
 const allowed=n=>safe()&&(n.startedOnce||(n.kind==='world'||n.kind==='shop'?room()==='sales':room()===n.room))&&eligible(n);
 function stop(){if(timer!==null)clearTimer(timer);timer=null;current=null;hide();}
 function retain(n){const k=key(n),old=pending.get(k);if(old){if(old.serial>n.serial){stats.discarded++;return;}stats.discarded++;}pending.set(k,n);}
 function update(){
  if(current&&!allowed(current)){
   const old=current,visible=now()-old.started;stop();stats.interrupted++;
   // A displayed fact follows the player. Occlusion pauses its remaining
   // lifetime; it never starts a second full reading interval.
   old.remaining=Math.max(0,(old.remaining??old.duration)-visible);old.resuming=true;
   if(old.remaining>0)retain(old);else stats.discarded++;
  }
  if(current)return;
  const next=[...pending.values()].filter(allowed).sort((a,b)=>priority[a.kind]-priority[b.kind]||a.serial-b.serial)[0];
  if(!next)return;
  pending.delete(key(next));current=next;next.started=now();next.startedOnce=true;if(!next.resuming)stats.displayed++;
  const entries=next.kind==='world'?[{...next.events[0],id:'world-display:'+next.serial}]:next.kind==='ambient'?[{...next.events[0],kind:'message',id:'daily-display:'+next.serial}]:next.events;
  const remaining=next.remaining??next.duration;show(noticeText(entries),entries,remaining,next.kind);
  timer=setTimer(()=>{stop();update();},remaining);
 }
 function push(events){
  // Register this transition before choosing the next slot on becoming visible.
  const fresh=[];
  for(const e of events){if(seen.has(e.id))continue;seen.add(e.id);if(seen.size>256)seen.delete(seen.values().next().value);fresh.push(e);stats.received++;}
  const groups={operation:[],world:[],shop:[],ambient:[]};
  for(const e of fresh)groups[e.kind==='shop'?'shop':e.kind==='ambient'?'ambient':e.id.startsWith('town:')?'world':'operation'].push(e);
  for(const kind of ['operation','world','shop'])if(groups[kind].length){
   const entries=kind==='operation'?groups[kind]:[groups[kind].at(-1)];
   stats.discarded+=groups[kind].length-entries.length;
   const length=noticeText(entries).length;
   retain({kind,events:entries,room:room(),serial:++serial,duration:kind==='operation'?3500:kind==='world'?Math.max(6500,length*90):6500});
  }
  update();
  // No ambient backlog, even behind results from this same saved transition.
  if(groups.ambient.length){
   const n={kind:'ambient',events:[groups.ambient.at(-1)],room:room(),serial:++serial,duration:6000};
   if(!current&&pending.size===0&&allowed(n)){retain(n);update();stats.discarded+=groups.ambient.length-1;}
   else stats.discarded+=groups.ambient.length;
  }
 }
 return {push,update,clear(){stop();update();},reset(){epoch++;stop();pending.clear();seen.clear();for(const k of Object.keys(stats))stats[k]=0;},
  get events(){return current?.events??[];},
  get epoch(){return epoch;},
  get active(){return current?.kind??null;},
  get worldPending(){return current?.kind==='world'||pending.has('world');},
  inspect(){return {active:current?.kind??null,pending:[...pending.values()].map(n=>({kind:n.kind,room:n.room})),seen:seen.size,...stats};}
 };
}
