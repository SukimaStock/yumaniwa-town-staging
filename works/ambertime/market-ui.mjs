import {monthLabel} from './model.mjs?v=stage4-r2';
import {flavorType} from './flavor-types.mjs?v=stage4-r2';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const ordinary=[{id:'retail',name:'自家販売'},{id:'town-liquor',name:'町の酒店'},{id:'supermarket',name:'スーパー'}];
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
export const availableMarketShops=s=>ordinary.filter(shop=>shop.id==='retail'||s.shop.relations.some(r=>r.shopId===shop.id));
export function savedMarketSales(before,after){
 if(!before||!after||after.core.month<=before.core.month||after.core.lastMonth?.month!==after.core.month)return [];
 const rows=[];
 for(const sale of after.core.lastMonth.sales??[]){
  if(!Number.isInteger(sale.sold)||sale.sold<=0)continue;
  const shopId=sale.channel==='stockist'?sale.shopId:'retail';
  if(!ordinary.some(x=>x.id===shopId))continue;
  const prior=rows.find(x=>x.productId===sale.id&&x.shopId===shopId);
  if(prior){prior.count+=sale.sold;prior.revenue+=sale.revenue??0;}else rows.push({productId:sale.id,shopId,count:sale.sold,revenue:sale.revenue??0,month:after.core.month});
 }
 return rows;
}
export function visibleMarketRows(s,model,shopId,feedback=[]){
 const rows=shopId==='retail'?s.core.products.map(p=>({productId:p.id,count:model.storeMarketInventory(s,p.id).retail})).filter(x=>x.count>0):model.storeMarketRows(s,shopId);
 const byId=new Map(rows.map(x=>[x.productId,{...x,sold:0}]));
 for(const sale of feedback.filter(x=>x.shopId===shopId)){
  if(!s.core.products.some(p=>p.id===sale.productId))continue;
  const row=byId.get(sale.productId)??{productId:sale.productId,count:0};row.sold=(row.sold??0)+sale.count;byId.set(sale.productId,row);
 }
 return [...byId.values()].sort((a,b)=>a.productId-b.productId);
}
export function createMarketUI({document:doc,model:D,state,art,icon='',act,openProduct,openStockist,openRetailInfo=()=>{},announce=()=>{},announceSaved=()=>{},setEditing=()=>{}}){
 const root=doc.getElementById('market-board');doc.body.append(root);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let selected=null,portion='1',visible=false,notice='',signature='',editing=null,feedback=[],feedbackTimer=null,epoch=0,lastConsumed=null;
 const motions=new Set(),deltaTimers=new Map(),scrollTasks=new Set(),positions=new Map();
 const query=selector=>root.querySelector(selector),all=selector=>[...root.querySelectorAll(selector)];
 const iconMarkup=id=>typeof icon==='function'?icon('store',id):icon;
 const button=(label,key,value,extra='')=>`<button type="button" data-market-${key}="${esc(value)}" ${extra}>${label}</button>`;
 const product=id=>state().core.products.find(p=>p.id===Number(id));
 const deltaSpace=p=>`--market-delta-space:calc(${String(p.stock).length+2} * var(--uniform-font-size,16px))`;
 function activeKey(){
  const active=doc.activeElement;if(!active||!root.contains(active))return null;
  for(const key of ['release','portion','place','stock','details','confirm','cancel'])if(active.dataset?.['market'+key[0].toUpperCase()+key.slice(1)])return {key,value:active.dataset['market'+key[0].toUpperCase()+key.slice(1)]};
  return active.id?.startsWith('market-shelf-')?{id:active.id}:null;
 }
 function shelfTarget(row){
  const shelf=row?.closest('.market-stock-list,.market-hand-list');if(!shelf)return null;
  const r=row.getBoundingClientRect();
  if(shelf.classList?.contains('market-stock-list')){
   const v=root.getBoundingClientRect();let top=root.scrollTop;
   if(r.top<v.top+8)top+=r.top-v.top-8;else if(r.bottom>v.bottom-8)top+=r.bottom-v.bottom+8;
   return {shelf:root,axis:'scrollTop',value:Math.max(0,Math.min(top,root.scrollHeight-root.clientHeight))};
  }
  const v=shelf.getBoundingClientRect();let left=shelf.scrollLeft;
  if(r.width>v.width||r.left<v.left+2)left+=r.left-v.left-2;else if(r.right>v.right-2)left+=r.right-v.right+2;
  return {shelf,axis:'scrollLeft',value:Math.max(0,Math.min(left,shelf.scrollWidth-shelf.clientWidth))};
 }
 function align(row){const target=shelfTarget(row);if(target)target.shelf[target.axis]=target.value;}
 function restoreFocus(saved){
  if(!saved)return;
  let target=saved.id?doc.getElementById(saved.id):query(`[data-market-${saved.key}="${saved.value}"]`);
  if(!target||target.disabled)target=query(`[data-market-place="${saved.key==='stock'?saved.value.split(':')[0]:'retail'}"]`)??query(`[data-market-release="${selected}"]`);
  if(target&&!target.disabled){target.focus({preventScroll:true});if(saved.key==='stock')align(target.closest('.market-stock-row'));else if(saved.key==='release')align(target);}
 }
 function cancel(){
  epoch++;for(const finish of [...deltaTimers.values()])finish();deltaTimers.clear();for(const stop of [...scrollTasks])stop();for(const a of motions)a.cancel();motions.clear();all('.market-flight,.market-delta').forEach(e=>e.remove());
 }
 function closeEditing({focus=true}={}){const previous=editing;editing=null;signature='';setEditing(false);update({visible});if(focus&&previous)restoreFocus({key:'stock',value:`${previous.shopId}:${previous.productId}`});}
 function reset(){cancel();clearTimeout(feedbackTimer);feedback=[];lastConsumed=null;positions.clear();selected=null;portion='1';signature='';if(editing){editing=null;setEditing(false);}}
 function geometry(){
  let v;try{v=JSON.parse(doc.getElementById('scene-root')?.dataset.viewport??'null');}catch{}
  const scale=v?.scale??1;
  root.style.setProperty('--market-scale',scale);
  Object.assign(root.style,{left:((v?.offsetX??0)+12*scale)+'px',top:((v?.offsetY??0)+99*scale)+'px',width:(336*scale)+'px',height:'auto',maxHeight:(417*scale)+'px'});
 }
 function update(options={}){
  const wasVisible=visible;visible=options.visible??visible;notice=options.notice??notice;root.hidden=!visible;geometry();
  if(!visible){if(wasVisible){cancel();if(editing&&!options.preserveEditing){editing=null;setEditing(false);}}return;}
  root.style.overflowY=editing?'hidden':'auto';
  const s=state();if(!s)return;
  const products=s.core.products.filter(p=>p.stock>0);
  const handProducts=products.filter(p=>D.storeMarketInventory(s,p.id).hand>0);
  if(!handProducts.some(p=>p.id===selected))selected=handProducts[0]?.id??products.find(p=>p.id===selected)?.id??products[0]?.id??null;
  const handTotal=handProducts.reduce((n,p)=>n+D.storeMarketInventory(s,p.id).hand,0);
  const p=product(selected),inventory=p?D.storeMarketInventory(s,p.id):{hand:0};
  const shops=availableMarketShops(s),rows=shops.map(shop=>visibleMarketRows(s,D,shop.id,feedback));
  const nextSignature=JSON.stringify([products,s.releases,s.brands,s.productsById,s.shop.relations,s.shop.offer,s.marketRules?.version,selected,portion,rows,feedback,handProducts.map(p=>[p.id,D.storeMarketInventory(s,p.id).hand]),editing,notice]);
  if(nextSignature===signature)return;
  const focused=activeKey(),top=root.scrollTop;
  for(const shelf of all('.market-stock-list,.market-hand-list'))positions.set(shelf.id,shelf.scrollLeft);
  signature=nextSignature;
  const productsMarkup=handProducts.map(item=>{
   const count=D.storeMarketInventory(s,item.id).hand,date=releaseDate(s,item.id);
   return button(`<span class="market-bottle ${item.id===selected?'market-selected-bottle':''}" aria-hidden="true">${art(item)}</span><span class="market-count">${count}本</span><span class="market-date">${esc(date)}</span>`,'release',item.id,`class="market-release" style="${deltaSpace(item)}" aria-pressed="${item.id===selected}" aria-label="${esc(date+' '+tasteLabel(item)+' 手元'+count+'本')}"`);
  }).join('');
  const returnPane=editing?`<section class="market-return" role="group" aria-label="瓶を手元へ戻す"><p>${esc(ordinary.find(x=>x.id===editing.shopId)?.name)} · ${esc(releaseDate(s,editing.productId))} ${esc(tasteLabel(product(editing.productId)))} · ${editing.count}本</p><div class="market-buttons">${button('手元へ戻す','confirm','return')}${button('やめる','cancel','return')}</div></section>`:'';
  root.innerHTML=`<div class="market-content" ${editing?'inert':''}>${notice?`<p class="market-notice" role="status" aria-live="polite" tabindex="0">${esc(notice)}</p>`:''}<div class="market-releases" aria-label="手元の瓶"><span class="market-hand">手元</span><div class="market-hand-list" id="market-shelf-hand" role="group" tabindex="0" aria-label="手元の瓶棚。横に送れます">${productsMarkup}</div></div><div class="market-portions" role="group" aria-label="一度に渡す本数">${[['1','1本'],['5','5本'],['all','全部']].map(([value,label])=>button(label,'portion',value,`aria-pressed="${portion===value}" ${handTotal>0?'':'disabled'}`)).join('')}</div><div class="market-shops">${shops.map((shop,index)=>{

   return `<section class="market-shop" data-market-shop="${shop.id}" aria-label="${shop.name}"><header class="market-shop-heading">${button(`<span class="market-store-icon" aria-hidden="true">${iconMarkup(shop.id)}</span><span class="market-shop-title">${shop.name}</span><span aria-hidden="true">›</span>`,'details',shop.id,`class="market-shop-name" aria-label="${shop.name}の店情報"`)}</header><div class="market-shelf-body"><div class="market-stock-list" id="market-shelf-${shop.id}" role="group" tabindex="0" aria-label="${shop.name}の商品一覧">${rows[index].map(row=>{
    const item=s.core.products.find(x=>x.id===row.productId);if(!item)return '';
    return `<div class="market-stock-row" data-wide="${String(row.count).length>2||!/^\d{2}\/\d{1,2}$/.test(compactReleaseDate(s,item.id))}" style="${deltaSpace(item)}" id="market-stock-${shop.id}-${item.id}">${button(`<span class="market-bottle" aria-hidden="true">${art(item)}</span><span class="market-date" title="${esc(releaseDate(s,item.id))}">${esc(compactReleaseDate(s,item.id))}</span><span class="market-count">${row.count}本</span>`,'stock',`${shop.id}:${item.id}`,`class="market-stock" ${row.count<1?'disabled':''} aria-label="${esc(brandName(s,item.id)+' '+shop.name+' '+releaseDate(s,item.id)+' '+tasteLabel(item)+' 残り'+row.count+'本'+(row.sold?' '+row.sold+'本売れた':'')+'。手元へ戻す')}"`)}</div>`;
   }).join('')||'<span class="market-empty" aria-label="割り当てなし"></span>'}</div></div>${button(rows[index].length?'':'<span class="market-place-label">ここに置く</span>','place',shop.id,`class="market-target" ${!p||inventory.hand<1?'disabled':''} aria-label="${esc(shop.name+'へ'+(p?releaseDate(s,p.id)+'の瓶':'瓶')+'を渡す')}"`)}</section>`;
  }).join('')}</div></div>${returnPane}`;
  for(const shelf of all('.market-stock-list,.market-hand-list'))shelf.scrollLeft=positions.get(shelf.id)??0;
  root.scrollTop=top;if(editing){const pane=query('.market-return');if(pane)pane.style.top=(root.scrollTop+12)+'px';}restoreFocus(focused);
 }
 function animate(element,frames,options){
  if(!element?.animate||reduced.matches||doc.hidden||!visible)return Promise.resolve();
  const a=element.animate(frames,options);motions.add(a);return a.finished.catch(()=>{}).finally(()=>motions.delete(a));
 }
 function delta(element,count,{rect,kind='placement',productId,shopId}={}){
  if(doc.hidden||!visible)return;
  const anchor=element?.getBoundingClientRect()??rect;if(!anchor)return;
  const bounds=root.getBoundingClientRect();
  if(anchor.bottom<bounds.top||anchor.top>bounds.bottom||anchor.right<bounds.left||anchor.left>bounds.right)return;
  const el=doc.createElement('span');el.className='market-delta';el.setAttribute('aria-hidden','true');el.textContent=(count>0?'+':'−')+Math.abs(count);
  el.dataset.kind=kind;if(productId!==undefined)el.dataset.productId=String(productId);if(shopId)el.dataset.shopId=shopId;
  Object.assign(el.style,{left:(anchor.right+4)+'px',top:anchor.top+'px'});root.append(el);
  const size=el.getBoundingClientRect(),fitsRight=anchor.right+4+size.width<=bounds.right-2;
  el.style.left=Math.max(bounds.left+2,Math.min(fitsRight?anchor.right+4:anchor.left,bounds.right-size.width-2))+'px';
  if(!fitsRight)el.style.top=Math.max(bounds.top+2,anchor.top-size.height-2)+'px';
  if(!reduced.matches)void animate(el,[{transform:'translateY(0)',opacity:1},{transform:'translateY(-4px)',opacity:1,offset:.65},{transform:'translateY(-6px)',opacity:0}],{duration:650,easing:'steps(4,end)'});
  return new Promise(resolve=>{const finish=()=>{clearTimeout(timer);deltaTimers.delete(timer);el.remove();resolve();},timer=setTimeout(finish,650);deltaTimers.set(timer,finish);});
 }
 async function placed(shopId,count,productId,origin){
  const token=epoch,row=doc.getElementById(`market-stock-${shopId}-${productId}`),target=query(`[data-market-place="${shopId}"]`);if(!row)return;
  align(row);
  delta(row.querySelector('.market-count'),count,{productId,shopId});
  delta(query(`[data-market-release="${productId}"] .market-count`),-count,{rect:origin?.countRect,productId,shopId:'hand'});
  const destination=row.querySelector('.market-bottle');
  if(origin&&destination&&!reduced.matches&&!doc.hidden&&visible){
   const from=origin.rect,to=destination.getBoundingClientRect(),ghost=doc.createElement('span');ghost.className='market-flight';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=origin.art;
   Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});root.append(ghost);
   await animate(ghost,[{transform:'translate(0,0)',opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px)`,opacity:1}],{duration:300,easing:'steps(6,end)',fill:'forwards'});ghost.remove();
  }
  if(token!==epoch||!visible||doc.hidden)return;
  animate(target,[{outline:'3px solid #e4bc66',outlineOffset:0},{outline:'3px solid transparent',outlineOffset:'2px'}],{duration:160});
 }
 async function reveal(row,token){
  const target=shelfTarget(row);if(!target)return;
  const {shelf,axis,value}=target,from=shelf[axis];if(Math.abs(value-from)<1)return;
  if(reduced.matches||doc.hidden){shelf[axis]=value;return;}
  await new Promise(resolve=>{
   let frame,start,done=false;
   const stop=()=>{if(done)return;done=true;cancelAnimationFrame(frame);scrollTasks.delete(stop);resolve();};scrollTasks.add(stop);
   const step=now=>{if(done)return;if(token!==epoch||doc.hidden||!visible){stop();return;}if(reduced.matches){shelf[axis]=value;stop();return;}start??=now;const progress=Math.min(1,(now-start)/180);shelf[axis]=from+(value-from)*(1-(1-progress)**3);if(progress<1)frame=requestAnimationFrame(step);else stop();};frame=requestAnimationFrame(step);
  });
 }
 async function sold(sales,token){
  if(doc.hidden||!visible)return;
  for(const shop of ordinary){
   for(const sale of sales.filter(x=>x.shopId===shop.id)){
    if(token!==epoch||!visible||doc.hidden)break;
    const row=doc.getElementById(`market-stock-${shop.id}-${sale.productId}`);if(!row)continue;
    await reveal(row,token);if(token!==epoch||doc.hidden||!visible)break;
    await delta(row.querySelector('.market-count'),-sale.count,{kind:'sale',productId:sale.productId,shopId:shop.id});
   }
  }
 }
 function consume(before,after){
  const sales=savedMarketSales(before,after);if(!sales.length)return;
  const key=JSON.stringify(sales);if(key===lastConsumed)return;lastConsumed=key;
  cancel();clearTimeout(feedbackTimer);feedback=sales;signature='';update({visible});
  const token=epoch;
  announceSaved(sales.map(sale=>`${ordinary.find(shop=>shop.id===sale.shopId).name}で${sale.count}本売れました。`).join(''));
  void sold(sales,token);
  // Store cards share one vertical scroller: reveal one sale at a time.
  // Keep sold-out rows only for this
  // bounded presentation; rerenders never schedule another sale effect.
  const count=sales.length;
  feedbackTimer=setTimeout(()=>{cancel();feedback=[];signature='';update({visible});},count*850+650);
 }
 let gesture=null,blockedClick=false;
 root.addEventListener('pointerdown',event=>{cancel();blockedClick=false;gesture=event.isPrimary===false?null:{id:event.pointerId,x:event.clientX,y:event.clientY,drag:false};});
 root.addEventListener('wheel',cancel,{passive:true});
 root.addEventListener('pointermove',event=>{if(gesture?.id===event.pointerId&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)gesture.drag=true;});
 for(const type of ['pointerup','pointercancel'])root.addEventListener(type,event=>{if(gesture?.id===event.pointerId){blockedClick=gesture.drag;gesture=null;}});
 root.addEventListener('click',event=>{if(event.detail&&blockedClick){event.preventDefault();event.stopImmediatePropagation();blockedClick=false;}},true);
 root.addEventListener('click',event=>{
  if(!visible)return;const b=event.target.closest('button');if(!b||b.disabled||!root.contains(b))return;
  const data=b.dataset;
  if(data.marketRelease&&!editing){const id=Number(data.marketRelease);if(!state().core.products.some(p=>p.id===id)||D.storeMarketInventory(state(),id).hand<1)return;cancel();selected=id;signature='';update({visible});return;}
  if(data.marketPortion){cancel();portion=data.marketPortion;signature='';update({visible});return;}
  if(data.marketCancel){closeEditing();return;}
  if(data.marketConfirm){
   const target=editing;if(!target)return;
   const ok=act(s=>target.shopId==='retail'?D.setMarketRetail(s,{productId:target.productId,count:0}):D.returnStoreProduct(s,{productId:target.productId,shopId:target.shopId}));
   if(ok){cancel();closeEditing();announce(`${target.count}本を手元へ`);}return;
  }
  if(editing)return;
  if(data.marketDetails&&!['product','retail'].includes(data.marketDetails)&&!availableMarketShops(state()).some(x=>x.id===data.marketDetails))return;
  if(data.marketDetails){if(data.marketDetails==='product'){if(selected!==null)openProduct(selected);}else if(data.marketDetails==='retail'){openRetailInfo(selected);}else openStockist(data.marketDetails);return;}
  if(data.marketStock){
   cancel();const [shopId,pid]=data.marketStock.split(':'),productId=Number(pid),s=state(),inv=D.storeMarketInventory(s,productId),count=shopId==='retail'?inv.retail:inv.shops[shopId];
   if(count>0){editing={shopId,productId,count};signature='';setEditing(true);update({visible});query('[data-market-confirm]')?.focus({preventScroll:true});}return;
  }
  if(data.marketPlace){
   cancel();const shopId=data.marketPlace,s=state(),p=product(selected);if(!p||!availableMarketShops(s).some(x=>x.id===shopId))return;
   const inv=D.storeMarketInventory(s,p.id),count=portionCount(inv.hand,portion);if(count<1)return;
   if(shopId!=='retail'){
    const quote=D.storeMarketQuote(s,p.id,shopId);if(!quote.ok){const relation=s.shop.relations.some(r=>r.shopId===shopId&&r.brandId===releaseFor(s,p.id)?.brandId);if(!relation)openStockist(shopId);else announce(quote.reason);return;}
   }
   const source=query(`[data-market-release="${p.id}"] .market-bottle`),countSource=query(`[data-market-release="${p.id}"] .market-count`),origin=source?{rect:source.getBoundingClientRect(),art:source.innerHTML,countRect:countSource?.getBoundingClientRect()}:null;
   const ok=act(before=>shopId==='retail'?D.setMarketRetail(before,{productId:p.id,count:inv.retail+count}):D.assignStoreProduct(before,{productId:p.id,shopId,count}));
   if(ok){signature='';update({visible});placed(shopId,count,p.id,origin);announceSaved(`${ordinary.find(x=>x.id===shopId).name}に${count}本置きました。`);}
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
 return {update,consume,cancel,reset,diagnostics:()=>({visible,selected,portion,editing:editing?{...editing}:null,motions:motions.size,scrollTasks:scrollTasks.size,feedback:feedback.map(x=>({...x}))})};
}
