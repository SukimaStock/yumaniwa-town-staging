import * as M from './model.mjs';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let state=M.create(42),selectedShop='super',selectedRelease=1;
const lastEvent=(shopId,type)=>[...state.history].reverse().find(e=>e.shopId===shopId&&e.type===type);
function shopDetails(id){
  const t=M.SHOPS.find(t=>t.id===id),h=state.shops[id],last=h.last,receipt=lastEvent(id,'delivery');
  const bottles=Object.entries(h.shelf).filter(([rid,n])=>n>0).map(([rid,n])=>'第'+rid+'回 '+n+'本').join(' / ')||'店頭在庫なし';
  return '<h3>'+esc(t.name)+' · 契約中</h3>'
    +'<p class="comment">「'+esc(M.reaction(state,id))+'」</p>'
    +'<p>今月の希望 '+last.wish+'本 ／ 自動納品 '+last.delivered+'本 ／ 店頭販売 '+last.sold+'本</p>'
    +'<p class="shop-meta">納品累計 '+h.totalDelivered+'本 ／ 販売累計 '+h.totalSold+'本</p>'
    +'<p class="holdings">店頭：'+esc(bottles)+'</p>'
    +'<p class="shop-meta">'+(receipt?'最後の納品：第'+receipt.releaseId+'回 '+M.when(receipt.month)+'':'商品がなくても契約は続きます。')+'</p>';
}
function releaseDetails(id){
  const r=state.releases.find(r=>r.id===id),flavor=M.FLAVORS.find(f=>f.id===r.flavorId);
  const inStores=M.SHOPS.reduce((n,t)=>n+(state.shops[t.id].shelf[id]??0),0);
  const paths=M.SHOPS.map(t=>{
    const sales=state.history.filter(e=>e.type==='sale'&&e.shopId===t.id&&e.releaseId===id).reduce((n,e)=>n+e.count,0);
    return t.name+' '+sales+'本';
  });
  return '<h3>第'+r.id+'回 · '+esc(flavor.name)+'</h3>'
    +'<p>'+esc(flavor.note)+'</p>'
    +'<p>手元 '+r.stock+'本 ／ 店頭 '+inStores+'本 ／ 売れた '+r.sold+'本</p>'
    +'<p class="shop-meta">'+esc(paths.join(' ／ '))+'</p>'
    +'<p class="shop-meta">'+(M.isSoldOut(state,id)?'この発売回は完売。店との契約は継続。':'発売 '+M.when(r.createdMonth))+'</p>';
}
function render(focusSelector=''){
  $('date').textContent=M.when(state.month);
  $('inventory').textContent='手元 '+M.hand(state)+'本 / 店頭 '+(M.totalStored(state)-M.hand(state))+'本';
  $('notice').textContent=state.lastNotice;
  $('month').disabled=state.month>=360;
  $('year').disabled=state.month>348;
  const shops=M.report(state);
  $('shops').innerHTML=shops.map(o=>{
    const t=M.SHOPS.find(x=>x.id===o.shopId);
    return '<button type="button" class="shop" data-shop="'+t.id+'" aria-pressed="'+(selectedShop===t.id)+'">'
      +'<span class="shop-icon" aria-hidden="true"></span><strong>'+esc(t.name)+'</strong>'
      +'<span class="shop-meta">契約中</span>'
      +'<span class="numbers">希望 '+o.last.wish+'本<br>納品 '+o.last.delivered+'本<br>売れた '+o.last.sold+'本</span>'
      +'</button>';
  }).join('');
  $('shop-detail').innerHTML=shopDetails(selectedShop);
  $('releases').innerHTML=state.releases.map(r=>{
    const f=M.FLAVORS.find(f=>f.id===r.flavorId);
    return '<button type="button" class="release" data-release="'+r.id+'" data-flavor="'+f.id+'" aria-pressed="'+(selectedRelease===r.id)+'">'
      +'<span class="bottle" aria-hidden="true"></span><strong>第'+r.id+'回</strong><span>'+esc(f.name)+'</span>'
      +'<span class="minor">'+(M.isSoldOut(state,r.id)?'完売':'手元 '+r.stock+'本')+'</span></button>';
  }).join('');
  $('release-detail').innerHTML=releaseDetails(selectedRelease);
  $('fit-grid').innerHTML=state.releases.slice(-12).map(r=>{
    const f=M.FLAVORS.find(f=>f.id===r.flavorId);
    return '<tr><th scope="row">第'+r.id+'回 '+esc(f.name)+'</th>'+M.SHOPS.map(t=>'<td>'+M.fitLabel(M.fit(t.id,f.id))+'</td>').join('')+'</tr>';
  }).join('');
  $('history').innerHTML=state.history.slice(-24).reverse().map(e=>'<li>'+M.when(e.month)+' '+esc(e.text)+'</li>').join('');
  if(focusSelector)document.querySelector(focusSelector)?.focus({preventScroll:true});
}
$('shops').addEventListener('click',event=>{
  const b=event.target.closest('[data-shop]');if(!b)return;
  selectedShop=b.dataset.shop;render('[data-shop="'+selectedShop+'"]');
});
$('releases').addEventListener('click',event=>{
  const b=event.target.closest('[data-release]');if(!b)return;
  selectedRelease=Number(b.dataset.release);render('[data-release="'+selectedRelease+'"]');
});
$('month').addEventListener('click',()=>{M.advance(state,1);render();});
$('year').addEventListener('click',()=>{M.advance(state,12);render();});
$('reset').addEventListener('click',()=>{
  if(!confirm('このLabの結果を最初から試しますか？'))return;
  state=M.create(42);selectedShop='super';selectedRelease=1;render();
});
document.querySelector('.brew-buttons').addEventListener('click',event=>{
  const b=event.target.closest('[data-brew]');if(!b)return;
  try{M.brew(state,b.dataset.brew);selectedRelease=state.releases.at(-1).id;render();}catch(e){$('notice').textContent=e.message;}
});
$('export').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(M.exportLog(state),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='ambertime-taste-market-'+state.month+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('import').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>1_000_000)throw Error('ログが大きすぎます。');
    const next=M.replay(JSON.parse(await file.text()));
    state=next;selectedShop='super';selectedRelease=1;render();
    $('notice').textContent='ログを再現しました。';
  }catch(e){$('notice').textContent=e.message;}
  event.target.value='';
});
render();
window.tasteMarketLab={snapshot:()=>structuredClone(state),step:count=>{M.advance(state,count);render();}};
