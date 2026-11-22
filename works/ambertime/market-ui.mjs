import {regionalDeliveryPartners} from './regional-deliveries.mjs?world=world-network-v01&consignment=night-stage4-v01&perf=v06';
import {SHOPS} from './shop-model.mjs?v=bar-v01-1';
import {symbolMarkup} from './pixel-symbols.mjs?v=rooms-stage2-r1';
import {retailSalePlan as saleFlightPlan,ordinarySaleGroups as saleFlightGroups} from './retail-sale-motion.mjs?v=count-linked-r1';
import {monthLabel} from './model.mjs?v=stage4-r2';
import {flavorType} from './flavor-types.mjs?v=stage4-r2';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const ordinary=[{id:'retail',name:'自家販売'},...SHOPS.filter(shop=>shop.id!=='department').map(shop=>({id:shop.id,name:shop.id==='supermarket'?'スーパー':shop.name}))];
const primaryNames={fruit:'果実',grain:'穀物',smoke:'煙',body:'コク',spice:'スパイス',wood:'樽',vanilla:'バニラ'};
const portionCount=(n,choice)=>choice==='all'?n:Math.min(n,Number(choice)||0);
const releaseFor=(s,id)=>s.releases.find(r=>r.productId===id);
const releaseDate=(s,id)=>{const month=releaseFor(s,id)?.bottledMonth??s.core.products.find(p=>p.id===id)?.bottledMonth;return Number.isInteger(month)&&month>=0?monthLabel(month).replace('年','/').replace('月',''):'発売日不明';};
// Short labels retain the full date in accessible names. Never collapse two
// different centuries onto the same visible release date.
export function compactReleaseDate(s,id){
 const full=releaseDate(s,id),short=full.replace(/^\d{2}(\d{2}\/)/,'$1');
 const collision=s.core.products.some(p=>p.id!==id&&releaseDate(s,p.id)!==full&&releaseDate(s,p.id).replace(/^\d{2}(\d{2}\/)/,'$1')===short);
 return collision?full:short;
}
const brandName=(s,id)=>s.brands.find(b=>b.id===releaseFor(s,id)?.brandId)?.name??'AmberTime';
const tasteLabel=p=>p?.flavor?.label??flavorType(p)?.label??'個性';
// Back up the exact old formal envelope before publishing a future-rules boundary.
// A failed backup or concurrent save never writes the formal destination.
export function commitMarketRulesUpdate(storage,key,expected,text){
 if(typeof expected!=='string'||typeof text!=='string'||storage.getItem(key)!==expected)throw Error('別の画面で保存が変わりました。再読み込みしてください。');
 let hash=2166136261;for(const c of expected)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 const backupKey=key+'.before-market-rules.v1.'+expected.length+'.'+hash.toString(16),prior=storage.getItem(backupKey);
 if(prior!==null&&prior!==expected)throw Error('切替前の保存を確認できません。');
 if(prior===null)storage.setItem(backupKey,expected);
 if(storage.getItem(backupKey)!==expected)throw Error('切替前の保存を残せないため、変更していません。');
 if(storage.getItem(key)!==expected)throw Error('別の画面で保存が変わりました。再読み込みしてください。');
 storage.setItem(key,text);
 if(storage.getItem(key)!==text)throw Error('保存を確認できません。切替前の記録は残っています。');
 return {text,backupKey};
}
export const availableMarketShops=s=>[...ordinary.filter(shop=>shop.id==='retail'||(shop.id!=='bar'||s.alleyBar?.version===1)&&s.shop.relations.some(r=>r.shopId===shop.id)),...regionalDeliveryPartners(s)];
const regionalPartner=(s,id)=>regionalDeliveryPartners(s).find(p=>p.id===id);
// The journal contains both legacy purchases and modern shelf sales. Only
// months strictly after the explicit shelf boundary prove an actual shelf sale.
export function marketShopOrder(s,shops=availableMarketShops(s)){
 const months=new Map(),start=s.storeMarket?.startedMonth;
 if(Number.isInteger(start)&&start>=0)for(const row of s.shop.deliveries??[]){
  if(row.count>0&&Number.isInteger(row.month)&&row.month>start&&row.month<=s.core.month){
   const id=row.shopId??'town-liquor';months.set(id,Math.max(months.get(id)??-1,row.month));
  }
 }
 return shops.map((shop,index)=>({shop,index,month:months.get(shop.id)??-1})).sort((a,b)=>
  (a.shop.id==='retail'?-1:b.shop.id==='retail'?1:0)||b.month-a.month||a.index-b.index
 ).map(x=>x.shop);
}
export function savedMarketSales(before,after){
 if(!before||!after||after.core.month<=before.core.month||after.core.lastMonth?.month!==after.core.month)return [];
 const rows=[];
 for(const sale of after.core.lastMonth.sales??[]){
  if(!Number.isInteger(sale.sold)||sale.sold<=0||![undefined,'retail','stockist','consignment'].includes(sale.channel))continue;
  const shopId=['stockist','consignment'].includes(sale.channel)?sale.shopId:'retail';
  if(!availableMarketShops(after).some(x=>x.id===shopId))continue;
  const prior=rows.find(x=>x.productId===sale.id&&x.shopId===shopId);
  if(prior){prior.count+=sale.sold;prior.revenue+=sale.revenue??0;}else rows.push({productId:sale.id,shopId,count:sale.sold,revenue:sale.revenue??0,month:after.core.month});
 }
 return rows;
}
export function visibleMarketRows(s,model,shopId,feedback=[]){
 const rows=shopId==='retail'?s.core.products.map(p=>({productId:p.id,count:model.storeMarketInventory(s,p.id).retail})).filter(x=>x.count>0):regionalPartner(s,shopId)?model.regionalDeliveryRows(s,shopId):model.storeMarketRows(s,shopId);
 const byId=new Map(rows.map(x=>[x.productId,{...x,pending:x.count,entrusted:0,sold:0}]));
 if(regionalPartner(s,shopId)&&model.consignmentMode?.(s))for(const r of model.consignmentRows(s,shopId)){const row=byId.get(r.productId)??{...r,count:0,pending:0,entrusted:0,sold:0};row.count+=r.count;row.entrusted+=r.count;byId.set(r.productId,row);}
 for(const sale of feedback.filter(x=>x.shopId===shopId)){
  if(!s.core.products.some(p=>p.id===sale.productId))continue;
  const row=byId.get(sale.productId)??{productId:sale.productId,count:0};row.sold=(row.sold??0)+sale.count;byId.set(sale.productId,row);
 }
 return [...byId.values()].sort((a,b)=>a.productId-b.productId);
}
export function createMarketUI({document:doc,model:D,state,art,icon='',act,openProduct,openStockist,openRetailInfo=()=>{},announce=()=>{},announceSaved=()=>{},setEditing=()=>{},shopsForState=availableMarketShops,scopeForState=null}){
 const marketScope=s=>scopeForState?scopeForState(s):{shops:shopsForState(s),label:''};
 const marketShops=s=>marketScope(s).shops;
 const root=doc.getElementById('market-board');doc.body.append(root);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let order=[],sessionActive=false,needsOrder=true,modalFocus=null,anchor=null,scrollTimer=null,scrolling=false,selected=null,portion='1',visible=false,notice='',signature='',editing=null,feedback=[],feedbackTimer=null,epoch=0,lastConsumed=null;
 const motions=new Set(),deltaTimers=new Map(),scrollTasks=new Set(),positions=new Map();
 const query=selector=>root.querySelector(selector),all=selector=>[...root.querySelectorAll(selector)];
 const iconMarkup=id=>typeof icon==='function'?icon('store',id):icon;
 const button=(label,key,value,extra='')=>`<button type="button" data-market-${key}="${esc(value)}" ${extra}>${label}</button>`;
 const product=id=>state().core.products.find(p=>p.id===Number(id));
 const deltaSpace=p=>`--market-delta-space:calc(${String(p.stock).length+2} * var(--uniform-font-size,16px));--market-sale-width:calc(${Math.max(3,String(p.originalStock??p.stock).length+1)/2} * var(--uniform-font-size,16px))`;
 function activeKey(){
  const active=doc.activeElement;if(!active||!root.contains(active))return null;
  for(const key of ['release','portion','place','stock','details','confirm','cancel'])if(active.dataset?.['market'+key[0].toUpperCase()+key.slice(1)])return {key,value:active.dataset['market'+key[0].toUpperCase()+key.slice(1)]};
  return (active.id==='market-partners'||active.id?.startsWith('market-shelf-'))?{id:active.id}:null;
 }
 // Keep the first intersecting shop and its offset, including a tall shop's
 // interior. scrollTop alone cannot survive a reorder above the viewed shop.
 function rememberPosition(){
  const pane=query('.market-partners');if(!pane||!visible)return;
  const top=pane.getBoundingClientRect().top;
  const row=[...pane.querySelectorAll('[data-market-shop]')].find(el=>el.getBoundingClientRect().bottom>top+1);
  anchor={top:pane.scrollTop,id:row?.dataset.marketShop??null,offset:row?row.getBoundingClientRect().top-top:0};
 }
 function restorePosition(){
  const pane=query('.market-partners');if(!pane||!anchor)return;
  pane.scrollTop=anchor.top;
  const row=[...pane.querySelectorAll('[data-market-shop]')].find(el=>el.dataset.marketShop===anchor.id);
  if(row)pane.scrollTop+=row.getBoundingClientRect().top-pane.getBoundingClientRect().top-anchor.offset;
 }
 function shelfTarget(row){
  const shelf=row?.closest('.market-stock-list,.market-hand-list');if(!shelf)return null;
  const pane=row.closest('.market-partners'),target=pane??shelf,axis=pane?'scrollTop':'scrollLeft';
  const r=row.getBoundingClientRect(),v=target.getBoundingClientRect();let value=target[axis];
  const start=pane?'top':'left',end=pane?'bottom':'right';
  if(r[start]<v[start]+2)value+=r[start]-v[start]-2;else if(r[end]>v[end]-2)value+=r[end]-v[end]+2;
  return {shelf:target,axis,value:Math.max(0,Math.min(value,pane?target.scrollHeight-target.clientHeight:target.scrollWidth-target.clientWidth))};
 }
 function align(row){const target=shelfTarget(row);if(target)target.shelf[target.axis]=target.value;}
 function visibleBounds(element){return element?.closest?.('.market-partners')?.getBoundingClientRect()??root.getBoundingClientRect();}
 function restoreFocus(saved){
  if(!saved)return;
  let target=saved.id?doc.getElementById(saved.id):query(`[data-market-${saved.key}="${saved.value}"]`);
  if(!target||target.disabled)target=query(`[data-market-place="${saved.key==='stock'?saved.value.split(':')[0]:'retail'}"]`)??query(`[data-market-release="${selected}"]`);
  if(target&&!target.disabled){target.focus({preventScroll:true});}
 }
 function cancel(){
  epoch++;for(const finish of [...deltaTimers.values()])finish();deltaTimers.clear();for(const stop of [...scrollTasks])stop();for(const a of motions)a.cancel();motions.clear();all('.market-flight,.market-delta').forEach(e=>e.remove());
 }
 function closeEditing({focus=true}={}){const previous=editing;editing=null;signature='';setEditing(false);update({visible,sessionActive});if(focus&&previous)restoreFocus({key:'stock',value:`${previous.shopId}:${previous.productId}`});}
 function reset(){cancel();clearTimeout(feedbackTimer);feedback=[];lastConsumed=null;positions.clear();order=[];sessionActive=false;needsOrder=true;modalFocus=null;anchor=null;clearTimeout(scrollTimer);scrolling=false;selected=null;portion='1';signature='';if(editing){editing=null;setEditing(false);}}
 function geometry(){
  let v;try{v=JSON.parse(doc.getElementById('scene-root')?.dataset.viewport??'null');}catch{}
  const scale=v?.scale??1;
  root.style.setProperty('--market-scale',scale);root.style.setProperty('--market-max-height',(409*scale)+'px');
  Object.assign(root.style,{left:((v?.offsetX??0)+12*scale)+'px',top:((v?.offsetY??0)+99*scale)+'px',width:(336*scale)+'px',height:'auto',maxHeight:(417*scale)+'px'});
 }
 function update(options={}){
  const wasVisible=visible;if(wasVisible)rememberPosition();const priorFocus=wasVisible?activeKey():null;visible=options.visible??visible;
  const active=options.sessionActive??visible,entering=active&&!sessionActive;sessionActive=active;if(entering)needsOrder=true;if(wasVisible&&!visible&&active&&priorFocus)modalFocus=priorFocus;if(!active)modalFocus=null;notice=options.notice??notice;root.hidden=!visible;geometry();
  if(!visible){if(wasVisible){cancel();if(editing&&!options.preserveEditing){editing=null;setEditing(false);}}return;}
  root.style.overflowY='hidden';
  const s=state();if(!s)return;
  const scope=marketScope(s),available=scope.shops,scopeLabel=scope.label??'',mapSelected=scope.selectedShop??null;
  if(editing&&!available.some(shop=>shop.id===editing.shopId)){editing=null;setEditing(false);signature='';}
  if(needsOrder||!order.length){order=marketShopOrder(s,available).map(shop=>shop.id);needsOrder=false;}
  else order=[...order.filter(id=>available.some(shop=>shop.id===id)),...available.filter(shop=>!order.includes(shop.id)).map(shop=>shop.id)];
  if(gesture||scrolling)return;
  const products=s.core.products.filter(p=>p.stock>0);
  const handProducts=products.filter(p=>D.storeMarketInventory(s,p.id).hand>0);
  if(!handProducts.some(p=>p.id===selected))selected=handProducts[0]?.id??products.find(p=>p.id===selected)?.id??products[0]?.id??null;
  const handTotal=handProducts.reduce((n,p)=>n+D.storeMarketInventory(s,p.id).hand,0);
  const p=product(selected),inventory=p?D.storeMarketInventory(s,p.id):{hand:0};
  const shops=order.map(id=>available.find(shop=>shop.id===id)).filter(Boolean),rows=shops.map(shop=>visibleMarketRows(s,D,shop.id,feedback));
  const nextSignature=JSON.stringify([products,s.releases,s.brands,s.productsById,s.shop.relations,s.shop.offer,s.marketRules?.version,selected,portion,order,rows,feedback,handProducts.map(p=>[p.id,D.storeMarketInventory(s,p.id).hand]),editing,notice,scopeLabel,mapSelected]);
  if(nextSignature===signature){if(!wasVisible){restorePosition();restoreFocus(modalFocus);modalFocus=null;}return;}
  const focused=activeKey()??modalFocus;modalFocus=null;
  for(const shelf of all('.market-stock-list,.market-hand-list'))positions.set(shelf.id,shelf.scrollLeft);
  signature=nextSignature;
  const productsMarkup=handProducts.map(item=>{
   const count=D.storeMarketInventory(s,item.id).hand,date=releaseDate(s,item.id);
   return button(`<span class="market-bottle ${item.id===selected?'market-selected-bottle':''}" aria-hidden="true">${art(item)}</span><span class="market-count">${count}本</span><span class="market-date">${esc(date)}</span>`,'release',item.id,`class="market-release" style="${deltaSpace(item)}" aria-pressed="${item.id===selected}" aria-label="${esc(date+' '+tasteLabel(item)+' 手元'+count+'本')}"`);
  }).join('');
  const deliveryQuote=editing?.regional?D.regionalDeliveryQuote(s,editing.productId,editing.shopId):null;
  const returnPane=editing?`<section class="market-return" role="group" aria-label="${editing.regional?(D.consignmentMode?.(s)?'委託する・手元へ戻す':'納品する・手元へ戻す'):'瓶を手元へ戻す'}"><p>${esc(shops.find(x=>x.id===editing.shopId)?.name)} · ${esc(releaseDate(s,editing.productId))} ${esc(tasteLabel(product(editing.productId)))} · ${editing.count}本${editing.regional?(D.consignmentMode?.(s)?' · 未委託 · 実売1本 £':' · 未納品 · £')+(Math.round((D.consignmentMode?.(s)?1:editing.count)*(deliveryQuote?.unitPrice??0)*100)/100).toFixed(2):''}</p>${editing.regional&&deliveryQuote?.deliveryReason?`<p>${esc(deliveryQuote.deliveryReason)}</p>`:''}<div class="market-buttons">${editing.regional?button(D.consignmentMode?.(s)?'委託する':'納品する','confirm','deliver',deliveryQuote?.canDeliver===false?'disabled':''):''}${button('手元へ戻す','confirm','return')}${button('やめる','cancel','return')}</div></section>`:'';
  root.innerHTML=`<div class="market-content" ${editing?'inert':''}>${notice?`<p class="market-notice" role="status" aria-live="polite" tabindex="0">${esc(notice)}</p>`:''}<div class="market-releases" aria-label="手元の瓶"><span class="market-hand">手元</span><div class="market-hand-list" id="market-shelf-hand" role="group" tabindex="0" aria-label="手元の瓶棚。横に送れます">${productsMarkup}</div></div><div class="market-portions" role="group" aria-label="一度に渡す本数">${[['1','1本'],['5','5本'],['all','全部']].map(([value,label])=>button(label,'portion',value,`aria-pressed="${portion===value}" ${handTotal>0?'':'disabled'}`)).join('')}</div><div class="market-shops">${shops.map((shop,index)=>{

   return `${index===1?'<div class="market-partners" id="market-partners" role="region" tabindex="0" aria-label="取扱店一覧">'+(scopeLabel?'<h3 class="market-scope-heading">'+esc(scopeLabel)+'</h3>':''):''}<section class="market-shop${mapSelected===shop.id?' market-map-selected':''}" data-market-shop="${shop.id}" aria-label="${shop.name}"><header class="market-shop-heading">${button(`<span class="market-store-icon" aria-hidden="true">${iconMarkup(shop.id)}</span><span class="market-shop-title">${shop.name}</span><span aria-hidden="true">${symbolMarkup('chevronRight')}</span>`,'details',shop.id,`class="market-shop-name" ${mapSelected===shop.id?'aria-current="true"':''} aria-label="${shop.name}の店情報"`)}</header><div class="market-shelf-body"><div class="market-stock-list" id="market-shelf-${shop.id}" role="group" tabindex="0" aria-label="${shop.name}の商品一覧">${rows[index].map(row=>{
    const item=s.core.products.find(x=>x.id===row.productId);if(!item)return '';
    return `<div class="market-stock-row" data-wide="${shop.tradeMethod==='regional-delivery'||String(row.count).length>2||!/^\d{2}\/\d{1,2}$/.test(compactReleaseDate(s,item.id))}" style="${deltaSpace(item)}" id="market-stock-${shop.id}-${item.id}">${button(`<span class="market-bottle" aria-hidden="true">${art(item)}</span><span class="market-date" title="${esc(releaseDate(s,item.id))}">${esc(compactReleaseDate(s,item.id))}</span><span class="market-count">${row.count}本${shop.tradeMethod==='regional-delivery'?(D.consignmentMode?.(s)?'<small>委託中'+(row.entrusted??0)+'本'+(row.pending?'・未委託'+row.pending+'本':'')+'</small>':'<small>未納品</small>'):''}</span><span class="market-sale-slot" aria-hidden="true"></span>`,'stock',`${shop.id}:${item.id}`,`class="market-stock" ${row.count<1?'disabled':''} aria-label="${esc(brandName(s,item.id)+' '+shop.name+' '+releaseDate(s,item.id)+' '+tasteLabel(item)+' 残り'+row.count+'本'+(row.sold?' '+row.sold+'本売れた':'')+(shop.tradeMethod==='regional-delivery'?(D.consignmentMode?.(s)?(row.pending?'。未委託分を預ける・手元へ戻す':'。委託中の在庫を確認する'):'。納品・手元へ戻す'):'。手元へ戻す'))}"`)}</div>`;
   }).join('')||'<span class="market-empty" aria-label="割り当てなし"></span>'}</div></div>${button(rows[index].length?'':'<span class="market-place-label">ここに置く</span>','place',shop.id,`class="market-target" ${!p||inventory.hand<1?'disabled':''} aria-label="${esc(shop.name+'へ'+(p?releaseDate(s,p.id)+'の瓶':'瓶')+'を渡す')}"`)}</section>`;
  }).join('')}${shops.length>1?'</div>':''}</div></div>${returnPane}`;
  for(const shelf of all('.market-stock-list,.market-hand-list'))shelf.scrollLeft=positions.get(shelf.id)??0;
  root.scrollTop=0;restorePosition();restoreFocus(focused);
 }
 function animate(element,frames,options){
  if(!element?.animate||reduced.matches||doc.hidden||!visible)return Promise.resolve();
  const a=element.animate(frames,options);motions.add(a);return a.finished.catch(()=>{}).finally(()=>motions.delete(a));
 }
 function delta(element,count,{rect,kind='placement',productId,shopId}={}){
  if(doc.hidden||!visible)return;
  const anchor=element?.getBoundingClientRect()??rect;if(!anchor)return;
  const bounds=visibleBounds(element);
  if(anchor.bottom<bounds.top||anchor.top>bounds.bottom||anchor.right<bounds.left||anchor.left>bounds.right)return;
  const el=doc.createElement('span');el.className='market-delta';el.setAttribute('aria-hidden','true');el.textContent=(count>0?'+':'−')+Math.abs(count);
  el.dataset.kind=kind;if(productId!==undefined)el.dataset.productId=String(productId);if(shopId)el.dataset.shopId=shopId;
  const slot=element?.closest?.('.market-stock')?.querySelector('.market-sale-slot');
  if(slot){
   // Both signs share the quantity baseline, to the right of the real remainder.
   slot.append(el);el.classList.add('market-sale-delta');
  }else{
   Object.assign(el.style,{left:(anchor.right+4)+'px',top:anchor.top+'px'});root.append(el);
  }
  if(!reduced.matches)void animate(el,[{opacity:1},{opacity:1,offset:.65},{opacity:0}],{duration:650});
  return new Promise(resolve=>{const finish=()=>{clearTimeout(timer);deltaTimers.delete(timer);el.remove();resolve();},timer=setTimeout(finish,650);deltaTimers.set(timer,finish);});
 }
 async function placed(shopId,count,productId,origin){
  const token=epoch,row=doc.getElementById(`market-stock-${shopId}-${productId}`),target=query(`[data-market-place="${shopId}"]`);if(!row)return;
  delta(row.querySelector('.market-count'),count,{productId,shopId});
  delta(query(`[data-market-release="${productId}"] .market-count`),-count,{rect:origin?.countRect,productId,shopId:'hand'});
  const destination=row.querySelector('.market-bottle');
  if(origin&&destination&&!reduced.matches&&!doc.hidden&&visible){
   const from=origin.rect,to=destination.getBoundingClientRect();const bounds=visibleBounds(destination);if(to.top<bounds.top||to.bottom>bounds.bottom||to.left<bounds.left||to.right>bounds.right)return;const ghost=doc.createElement('span');ghost.className='market-flight';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=origin.art;
   Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});root.append(ghost);
   await animate(ghost,[{transform:'translate(0,0)',opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px)`,opacity:1}],{duration:300,easing:'steps(6,end)',fill:'forwards'});ghost.remove();
  }
  if(token!==epoch||!visible||doc.hidden)return;
  animate(target,[{outline:'3px solid #e4bc66',outlineOffset:0},{outline:'3px solid transparent',outlineOffset:'2px'}],{duration:160});
 }
 async function shopSold(sale,token,origins){
  if(reduced.matches||token!==epoch||doc.hidden||!visible)return;
  const row=doc.getElementById(`market-stock-${sale.shopId}-${sale.productId}`),destination=query(`[data-market-shop="${sale.shopId}"] .market-store-icon`);
  if(!destination)return;
  const source=row?.querySelector('.market-count'),bottle=row?.querySelector('.market-bottle'),prior=origins.get(`${sale.shopId}:${sale.productId}`);
  const sourceRect=source?.getBoundingClientRect()??prior?.sourceRect,sprite=bottle?.getBoundingClientRect()??prior?.sprite,art=bottle?.innerHTML??prior?.art;if(!sourceRect||!sprite||!art)return;
  const bounds=visibleBounds(source);if(sourceRect.top<bounds.top||sourceRect.bottom>bounds.bottom||sourceRect.left<bounds.left||sourceRect.right>bounds.right)return;
  const targetRect=destination.getBoundingClientRect();if(targetRect.top<bounds.top||targetRect.bottom>bounds.bottom)return;
  const from={x:sprite.left+sprite.width/2,y:sprite.top+sprite.height/2},to={x:targetRect.left+targetRect.width/2,y:targetRect.top+targetRect.height/2};
  const scale=parseFloat(root.style.getPropertyValue('--market-scale'))||1,shop=query(`[data-market-shop="${sale.shopId}"]`),railY=shop.getBoundingClientRect().top+8*scale;if(railY<bounds.top||railY>bounds.bottom)return;const plan=saleFlightPlan(1,{from,to,grid:3*scale,railY}).map(flight=>({...flight,units:sale.units,delay:sale.delay}));
  await Promise.all(plan.map(async (flight,index)=>{
   if(token!==epoch||!visible||doc.hidden)return;
   const ghost=doc.createElement('span');ghost.className='market-flight';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=art;
   Object.assign(ghost.dataset,{kind:sale.kind??'sale-flight',shopId:sale.shopId,productId:String(sale.productId),group:String(sale.groupIndex??index),units:String(flight.units),duration:String(flight.duration),delay:String(flight.delay)});
   Object.assign(ghost.style,{left:(from.x-sprite.width/2)+'px',top:(from.y-sprite.height/2)+'px',width:sprite.width+'px',height:sprite.height+'px',opacity:'0',transformOrigin:'center'});root.append(ghost);
   await animate(ghost,flight.frames,{duration:flight.duration,delay:flight.delay,fill:'none'});ghost.remove();
  }));
 }
 async function sold(sales,token,origins){
  if(doc.hidden||!visible)return;
  // Every visible ordinary store shares one bounded, concurrent presentation.
  const groups=saleFlightGroups(sales.map(sale=>({productId:sale.productId,shopId:sale.shopId,units:sale.count})));
  const deltas=sales.map(sale=>{const row=doc.getElementById(`market-stock-${sale.shopId}-${sale.productId}`);return delta(row?.querySelector('.market-count'),-sale.count,{kind:'sale',productId:sale.productId,shopId:sale.shopId});});
  await Promise.all([...groups.map((sale,index)=>shopSold({...sale,groupIndex:index},token,origins)),...deltas]);
 }
 function consume(before,after){
  const sales=savedMarketSales(before,after);if(!sales.length)return;
  const key=JSON.stringify(sales);if(key===lastConsumed)return;lastConsumed=key;
  const origins=new Map();for(const sale of sales){const row=doc.getElementById(`market-stock-${sale.shopId}-${sale.productId}`),source=row?.querySelector('.market-count'),bottle=row?.querySelector('.market-bottle');if(source&&bottle)origins.set(`${sale.shopId}:${sale.productId}`,{sourceRect:source.getBoundingClientRect(),sprite:bottle.getBoundingClientRect(),art:bottle.innerHTML});}
  cancel();clearTimeout(feedbackTimer);feedback=sales;signature='';update({visible,sessionActive});
  const token=epoch;
  announceSaved(sales.map(sale=>`${shopsForState(after).find(shop=>shop.id===sale.shopId)?.name??'取扱店'}で${sale.count}本売れました。`).join(''));
  void sold(sales,token,origins);
  // Hold sold-out rows briefly for this shared presentation, never replay on render.
  feedbackTimer=setTimeout(()=>{cancel();feedback=[];signature='';update({visible,sessionActive});},1300);
 }
 let gesture=null,blockedClick=false,pendingAction=false;
 root.addEventListener('pointerdown',event=>{cancel();clearTimeout(scrollTimer);scrolling=false;blockedClick=false;gesture=event.isPrimary===false?null:{id:event.pointerId,x:event.clientX,y:event.clientY,drag:false};});
 root.addEventListener('wheel',cancel,{passive:true});
 root.addEventListener('scroll',event=>{
  if(!event.target?.classList?.contains('market-partners'))return;
  rememberPosition();scrolling=true;clearTimeout(scrollTimer);
  scrollTimer=setTimeout(()=>{scrolling=false;update({visible,sessionActive});},160);
 },true);
 root.addEventListener('pointermove',event=>{if(gesture?.id===event.pointerId&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)gesture.drag=true;});
 for(const type of ['pointerup','pointercancel']){const end=event=>{if(gesture?.id===event.pointerId){blockedClick=gesture.drag||type==='pointercancel';gesture=null;setTimeout(()=>update({visible,sessionActive}),0);}};root.addEventListener(type,end);doc.addEventListener(type,end);}
 root.addEventListener('click',event=>{if(event.detail&&blockedClick){event.preventDefault();event.stopImmediatePropagation();blockedClick=false;}},true);
 root.addEventListener('click',async event=>{
  if(!visible||pendingAction)return;const b=event.target.closest('button');if(!b||b.disabled||!root.contains(b))return;
  const data=b.dataset;
  if(data.marketRelease&&!editing){const id=Number(data.marketRelease);if(!state().core.products.some(p=>p.id===id)||D.storeMarketInventory(state(),id).hand<1)return;cancel();selected=id;signature='';update({visible,sessionActive});return;}
  if(data.marketPortion){cancel();portion=data.marketPortion;signature='';update({visible,sessionActive});return;}
  if(data.marketCancel){closeEditing();return;}
  if(data.marketConfirm){
   const target=editing;if(!target)return;
   const delivering=target.regional&&data.marketConfirm==='deliver',origins=new Map();
   if(delivering){const row=doc.getElementById(`market-stock-${target.shopId}-${target.productId}`),source=row?.querySelector('.market-count'),bottle=row?.querySelector('.market-bottle');if(source&&bottle)origins.set(`${target.shopId}:${target.productId}`,{sourceRect:source.getBoundingClientRect(),sprite:bottle.getBoundingClientRect(),art:bottle.innerHTML});}
   const ok=await act(s=>{
    if(target.regional){const q=D.regionalDeliveryQuote(s,target.productId,target.shopId),value={partnerId:target.shopId,productId:target.productId,contractId:target.contractId,allocationIds:target.allocationIds};return delivering?(D.consignmentMode?.(s)?D.consignRegionalProduct(s,{...value,consignmentId:D.nextConsignmentId(s)}):D.deliverRegionalProduct(s,{...value,deliveryId:q.nextDeliveryId})):D.returnRegionalProduct(s,value);}
    return target.shopId==='retail'?D.setMarketRetail(s,{productId:target.productId,count:0}):D.returnStoreProduct(s,{productId:target.productId,shopId:target.shopId});
   });
   if(ok){cancel();closeEditing();if(delivering){announceSaved(`${target.count}本を${D.consignmentMode?.(state())?'預けました。売れた分が収入になります。':'納品しました。'}`);if(!D.consignmentMode?.(state()))void shopSold({shopId:target.shopId,productId:target.productId,units:target.count,delay:0,kind:'delivery-flight'},epoch,origins);}else announce(`${target.count}本を手元へ`);}return;
  }
  if(editing)return;
  if(data.marketDetails&&!['product','retail'].includes(data.marketDetails)&&!marketShops(state()).some(x=>x.id===data.marketDetails))return;
  if(data.marketDetails){modalFocus=activeKey();if(data.marketDetails==='product'){if(selected!==null)openProduct(selected);}else if(data.marketDetails==='retail'){openRetailInfo(selected);}else openStockist(data.marketDetails);return;}
  if(data.marketStock){
   cancel();const [shopId,pid]=data.marketStock.split(':'),productId=Number(pid),s=state(),inv=D.storeMarketInventory(s,productId),regional=regionalPartner(s,shopId),row=regional?D.regionalDeliveryRows(s,shopId).find(r=>r.productId===productId):null,count=regional?row?.count:shopId==='retail'?inv.retail:inv.shops[shopId];
   if(regional&&D.consignmentMode?.(s)&&!count){notice='委託中の酒は窓口で販売を続けます。';signature='';update({visible,sessionActive});announce(notice);return;}
   if(count>0){editing={shopId,productId,count,...(regional?{regional:true,contractId:row.contractId,allocationIds:[...row.allocationIds]}:{})};signature='';setEditing(true);update({visible,sessionActive});query('[data-market-confirm]')?.focus({preventScroll:true});}return;
  }
  if(data.marketPlace){
   cancel();const shopId=data.marketPlace,s=state(),p=product(selected);if(!p||!marketShops(s).some(x=>x.id===shopId))return;
   const inv=D.storeMarketInventory(s,p.id),count=portionCount(inv.hand,portion);if(count<1)return;
   const regional=regionalPartner(s,shopId),regionalQuote=regional?D.regionalDeliveryQuote(s,p.id,shopId):null;
   if(regional&&!regionalQuote.ok){notice=regionalQuote.reason;signature='';update({visible,sessionActive});announce(regionalQuote.reason);return;}
   if(shopId!=='retail'&&!regional){
    const quote=D.storeMarketQuote(s,p.id,shopId);if(!quote.ok){const relation=s.shop.relations.some(r=>r.shopId===shopId&&r.brandId===releaseFor(s,p.id)?.brandId);if(!relation)openStockist(shopId);else announce(quote.reason);return;}
   }
   const source=query(`[data-market-release="${p.id}"] .market-bottle`),countSource=query(`[data-market-release="${p.id}"] .market-count`),origin=source?{rect:source.getBoundingClientRect(),art:source.innerHTML,countRect:countSource?.getBoundingClientRect()}:null;
   const ok=await act(before=>regional?D.assignRegionalProduct(before,{partnerId:shopId,productId:p.id,contractId:regionalQuote.contractId,allocationId:regionalQuote.nextAllocationId,count}):shopId==='retail'?D.setMarketRetail(before,{productId:p.id,count:inv.retail+count}):D.assignStoreProduct(before,{productId:p.id,shopId,count}));
   if(ok){notice='';signature='';update({visible,sessionActive});placed(shopId,count,p.id,origin);announceSaved(`${marketShops(state()).find(x=>x.id===shopId).name}に${count}本${regional?'取り置きました。':'置きました。'}`);}
  }
 });
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&editing){event.preventDefault();closeEditing();return;}
  const shelf=event.target.closest('.market-stock-list,.market-hand-list');if(!shelf||event.target!==shelf||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();cancel();if(shelf.classList.contains('market-stock-list')){const buttons=[...shelf.querySelectorAll('button:not(:disabled)')],target=event.key==='End'?buttons.at(-1):buttons[0];target?.focus({preventScroll:true});align(target?.closest('.market-stock-row'));return;}shelf.scrollLeft=event.key==='Home'?0:event.key==='End'?shelf.scrollWidth:shelf.scrollLeft+(event.key==='ArrowLeft'?-84:84);
 });
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)cancel();});window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);reduced.addEventListener('change',cancel);
 // Canvas publishes its final viewport after handling window/visualViewport
 // changes. Observe that publication rather than racing its resize listener.
 const sceneRoot=doc.getElementById('scene-root');
 if(sceneRoot&&typeof MutationObserver==='function')new MutationObserver(()=>{cancel();geometry();}).observe(sceneRoot,{attributes:true,attributeFilter:['data-viewport']});
 return {update,consume,cancel,reset,diagnostics:()=>({visible,selected,portion,order:[...order],anchor:anchor?{...anchor}:null,editing:editing?{...editing}:null,motions:motions.size,scrollTasks:scrollTasks.size,feedback:feedback.map(x=>({...x}))})};
}
