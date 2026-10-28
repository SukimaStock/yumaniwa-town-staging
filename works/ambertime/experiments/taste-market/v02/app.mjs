import * as M from './model.mjs';
const $=id=>document.getElementById(id);
const shortFlavor=id=>({fruit:'果実',smoke:'煙',wood:'樽'})[id];
const bottle=id=>`<span class="bottle" style="--bottle:${M.flavor(id).color}" aria-hidden="true"></span>`;
const shopName=id=>M.SHOPS.find(s=>s.id===id).name;
let state=M.create(),selected=1,portion='1',busy=false,feedback=[],feedbackTimer,noticeTimer,returnTo=null;
const shelfOffsets=new Map(),scrollTasks=new Set();let motionEpoch=0;
const motions=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
function cancelMotion(){motionEpoch++;for(const stop of [...scrollTasks])stop();for(const a of motions)a.cancel();motions.clear();document.querySelectorAll('.flight,.delta').forEach(e=>e.remove());}
function clearFeedback(){clearTimeout(feedbackTimer);feedback=[];}
function announce(text){clearTimeout(noticeTimer);$('notice').textContent=text;noticeTimer=setTimeout(()=>{$('notice').textContent='';},2600);}
function animate(el,frames,options){
 if(!el||!el.animate||reduced.matches||document.hidden)return Promise.resolve();
 const a=el.animate(frames,options);motions.add(a);
 return a.finished.catch(()=>{}).finally(()=>motions.delete(a));
}
function focusKey(){
 const a=document.activeElement;
 for(const key of ['release','portion','place','stock','details','brew'])if(a?.dataset?.[key])return {key,value:a.dataset[key]};
 return a?.id==='month'||a?.id?.startsWith('shelf-')?{id:a.id}:null;
}
function focusControl(saved){
 if(!saved)return;
 let e=saved.id?$(saved.id):document.querySelector(`[data-${saved.key}="${saved.value}"]`);
 if(!e||e.disabled){
  const shop=saved.key==='stock'?saved.value.split(':')[0]:saved.key==='place'?saved.value:null;
  e=shop?document.querySelector(`[data-place="${shop}"]`):null;
  if(!e||e.disabled)e=document.querySelector(`[data-release="${selected}"]`);
 }
 if(e&&!e.disabled){e.focus({preventScroll:true});if(e.dataset.stock)alignShelf(e.closest('.stock-row'));}
}
function render({restore=true}={}){
 for(const shelf of document.querySelectorAll('.stock-list'))shelfOffsets.set(shelf.id,shelf.scrollLeft);
 const focused=restore?focusKey():null,r=state.releases.find(x=>x.id===selected);
 $('date').textContent=`${Math.floor(state.month/12)}年${state.month%12}か月`;
 $('cash').textContent=`£${state.cash}`;$('month').disabled=busy;$('hand').textContent=r.hand;
 $('releases').innerHTML=state.releases.map(x=>`<button class="release" data-release="${x.id}" aria-pressed="${x.id===selected}" aria-label="第${x.id}回 ${M.flavor(x.flavorId).name}" ${busy?'disabled':''}>${bottle(x.flavorId)}<span>第${x.id}回</span><span>${shortFlavor(x.flavorId)}</span></button>`).join('');
 $('portions').innerHTML=[['1','1本'],['2','2本'],['5','5本'],['half','半分'],['all','全部']].map(([id,label])=>`<button data-portion="${id}" aria-pressed="${portion===id}" ${busy?'disabled':''}>${label}</button>`).join('');
 $('shops').innerHTML=M.SHOPS.map(shop=>{
  const rows=state.releases.filter(x=>x.assigned[shop.id]>0||feedback.some(e=>e.shopId===shop.id&&e.releaseId===x.id));
  return `<section class="shop" data-shop="${shop.id}" aria-label="${shop.name}"><button class="target" data-place="${shop.id}" aria-label="${shop.name}へ第${r.id}回を割り当てる" ${busy||!r.hand?'disabled':''}><span class="store-icon" aria-hidden="true"></span><strong>${shop.name}</strong></button><button class="shop-details" data-details="${shop.id}" aria-label="${shop.name}の詳細" ${busy?'disabled':''}>…</button><div class="stock-list" id="shelf-${shop.id}" tabindex="0" role="group" aria-label="${shop.name}の瓶棚。横に送れます">${rows.map(x=>{
   const sold=feedback.find(e=>e.shopId===shop.id&&e.releaseId===x.id)?.count??0;
   return `<div class="stock-row" id="stock-${shop.id}-${x.id}"><button class="stock" data-stock="${shop.id}:${x.id}" aria-label="${shop.name} 第${x.id}回 ${M.flavor(x.flavorId).name} 残り${x.assigned[shop.id]}本${sold?' '+sold+'本売れた':''}。手元へ戻す" ${busy||!x.assigned[shop.id]?'disabled':''}>${bottle(x.flavorId)}<span>第${x.id}回</span><span>${x.assigned[shop.id]}本</span></button>${sold?`<span class="sale-result" aria-hidden="true">売れた${sold}本</span>`:''}</div>`;
  }).join('')||'<span class="empty" aria-label="割り当てなし">—</span>'}</div></section>`;
 }).join('');
 $('brew').innerHTML=M.FLAVORS.map(f=>`<button data-brew="${f.id}" ${busy?'disabled':''}>${shortFlavor(f.id)}</button>`).join('');
 $('totals').innerHTML=state.releases.map(x=>`<li>第${x.id}回 ${M.flavor(x.flavorId).name}：${x.sold}本販売</li>`).join('');
 $('history').innerHTML=state.history.slice(-30).reverse().map(e=>`<li>${e.month}か月目 ${shopName(e.shopId)} 第${e.releaseId}回 ${e.count}本 £${e.revenue}</li>`).join('');
 $('reset').disabled=busy;$('import').disabled=busy;$('export').disabled=busy;
 for(const shelf of document.querySelectorAll('.stock-list'))shelf.scrollLeft=shelfOffsets.get(shelf.id)??0;
 if(restore)focusControl(focused);
}
function delta(el,value){
 if(reduced.matches||document.hidden)return;
 const d=document.createElement('span');d.className='delta';d.setAttribute('aria-hidden','true');d.textContent=(value>0?'+':'')+value;el.append(d);
 animate(d,[{opacity:1},{opacity:1,offset:.65},{opacity:0}],{duration:650}).then(()=>d.remove());
}
function placed(shopId,n){
 const row=$(`stock-${shopId}-${selected}`),target=document.querySelector(`[data-place="${shopId}"]`);alignShelf(row);
 animate(row.querySelector('.bottle'),[{transform:'translateY(-6px)'},{transform:'translateY(0)'},{transform:'translateY(-3px)'},{transform:'translateY(0)'}],{duration:210,easing:'steps(3,end)'});
 animate(target,[{outline:'3px solid #e4bc66',outlineOffset:'0px'},{outline:'3px solid transparent',outlineOffset:'2px'}],{duration:160});delta(row,n);delta($('hand'),-n);
}
// Only the shelf scrolls. Neither selection nor sales scroll the document.
function shelfTarget(row){
 const shelf=row.closest('.stock-list'),r=row.getBoundingClientRect(),v=shelf.getBoundingClientRect();
 let left=shelf.scrollLeft;
 if(r.left<v.left+2)left+=r.left-v.left-2;
 else if(r.right>v.right-2)left+=r.right-v.right+2;
 return {shelf,left:Math.max(0,Math.min(left,shelf.scrollWidth-shelf.clientWidth))};
}
function alignShelf(row){const {shelf,left}=shelfTarget(row);shelf.style.scrollSnapType='none';shelf.scrollLeft=left;}
async function revealSale(row,epoch){
 const {shelf,left}=shelfTarget(row),from=shelf.scrollLeft;
 if(Math.abs(left-from)<1)return;
 shelf.style.scrollSnapType='none';
 if(reduced.matches||document.hidden){shelf.scrollLeft=left;return;}
 await new Promise(resolve=>{
  let frame,start,done=false;
  const stop=()=>{if(done)return;done=true;cancelAnimationFrame(frame);scrollTasks.delete(stop);resolve();};
  scrollTasks.add(stop);
  const step=now=>{
   if(done)return;
   if(epoch!==motionEpoch||document.hidden){stop();return;}
   if(reduced.matches){shelf.scrollLeft=left;stop();return;}
   start??=now;const progress=Math.min(1,(now-start)/180);
   shelf.scrollLeft=from+(left-from)*(1-(1-progress)**3);
   if(progress<1)frame=requestAnimationFrame(step);else stop();
  };
  frame=requestAnimationFrame(step);
 });
}
async function fly(events){
 if(reduced.matches||document.hidden)return;
 // Each flight starts at the actual release row, even when another release is selected.
 const epoch=motionEpoch;
 await Promise.all(M.SHOPS.map(async shop=>{
  for(const event of events.filter(e=>e.shopId===shop.id)){
   if(reduced.matches||document.hidden||epoch!==motionEpoch)break;
   const row=$(`stock-${shop.id}-${event.releaseId}`);await revealSale(row,epoch);
   if(epoch!==motionEpoch||reduced.matches||document.hidden)break;
   const source=row.querySelector('.bottle').getBoundingClientRect(),target=document.querySelector(`[data-shop="${shop.id}"] .store-icon`).getBoundingClientRect();
   if(source.bottom<0||source.top>innerHeight||target.bottom<0||target.top>innerHeight)continue;
   const ghost=document.createElement('span');ghost.innerHTML=bottle(state.releases.find(r=>r.id===event.releaseId).flavorId);
   const el=ghost.firstElementChild;el.classList.add('flight');el.style.left=source.left+'px';el.style.top=source.top+'px';document.body.append(el);
   await animate(el,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${target.left+target.width/2-source.left-source.width/2}px,${target.top-source.top}px) scale(.35)`,opacity:0}],{duration:430,easing:'steps(6,end)',fill:'forwards'});el.remove();
  }
 }));
}
function closeDetail(){const target=returnTo;returnTo=null;$('detail').close();focusControl(target);}
function openStock(key){
 const [shopId,id]=key.split(':'),r=state.releases.find(x=>x.id===Number(id));
 returnTo={key:'stock',value:key};$('detail-title').textContent=shopName(shopId);
 $('detail-text').textContent=`第${r.id}回 ${M.flavor(r.flavorId).name} · ${r.assigned[shopId]}本`;
 $('take-back').hidden=false;$('take-back').dataset.shop=shopId;$('take-back').dataset.releaseId=r.id;$('detail').showModal();
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||b.disabled||busy)return;
 if(b.dataset.release){cancelMotion();selected=Number(b.dataset.release);render();return;}
 if(b.dataset.portion){cancelMotion();portion=b.dataset.portion;render();return;}
 if(b.dataset.place){cancelMotion();const n=M.assign(state,selected,b.dataset.place,portion);render();if(n){placed(b.dataset.place,n);announce(`${shopName(b.dataset.place)}に${n}本`);}return;}
 if(b.dataset.stock){cancelMotion();openStock(b.dataset.stock);return;}
 if(b.dataset.details){
  const shop=M.SHOPS.find(x=>x.id===b.dataset.details);returnTo={key:'details',value:shop.id};$('detail-title').textContent=shop.name;$('detail-text').textContent=M.flavor(shop.taste).name+'が人気';$('take-back').hidden=true;$('detail').showModal();return;
 }
 if(b.id==='detail-close'){closeDetail();return;}
 if(b.id==='take-back'){
  const n=M.takeBack(state,Number(b.dataset.releaseId),b.dataset.shop);cancelMotion();render({restore:false});closeDetail();announce(`${n}本を手元へ`);return;
 }
 if(b.dataset.brew){cancelMotion();selected=M.brew(state,b.dataset.brew);render();announce(`第${selected}回を18本ビン詰め`);return;}
 if(b.id==='month'){
  cancelMotion();clearFeedback();busy=true;render({restore:false});
  try{
   const events=M.advance(state);await fly(events);feedback=events;
   const n=events.reduce((sum,x)=>sum+x.count,0);announce(n?`${n}本売れた · £${n*12}`:'今月は売れませんでした');
  }finally{busy=false;render({restore:false});if(document.activeElement===document.body||document.activeElement===$('month'))$('month').focus({preventScroll:true});}
  feedbackTimer=setTimeout(()=>{cancelMotion();feedback=[];render();},2400);return;
 }
 if(b.id==='reset'){
  if(!confirm('このLabを最初から試しますか？'))return;
  cancelMotion();clearFeedback();shelfOffsets.clear();document.querySelectorAll('.stock-list').forEach(e=>e.scrollLeft=0);state=M.create();selected=1;portion='1';render();announce('');
 }
});
document.addEventListener('keydown',e=>{
 const shelf=e.target.closest('.stock-list');if(!shelf||e.target!==shelf||busy)return;
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
 e.preventDefault();cancelMotion();shelf.scrollLeft=e.key==='Home'?0:e.key==='End'?shelf.scrollWidth:shelf.scrollLeft+(e.key==='ArrowLeft'?-84:84);
});
$('detail').addEventListener('cancel',e=>{e.preventDefault();closeDetail();});
$('export').addEventListener('click',()=>{
 if(busy)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(M.exportLog(state),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ambertime-taste-market-v02.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('import').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{if(file.size>1000000)throw Error('ログが大きすぎます');const next=M.replay(JSON.parse(await file.text()));if(busy)return;cancelMotion();clearFeedback();shelfOffsets.clear();document.querySelectorAll('.stock-list').forEach(e=>e.scrollLeft=0);state=next;selected=1;render();announce('ログを再現しました');}
 catch(error){announce(error.message);}finally{e.target.value='';}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelMotion();});window.addEventListener('resize',cancelMotion);window.addEventListener('pagehide',cancelMotion);reduced.addEventListener('change',cancelMotion);
render();window.tasteMarketLab={snapshot:()=>structuredClone(state)};
