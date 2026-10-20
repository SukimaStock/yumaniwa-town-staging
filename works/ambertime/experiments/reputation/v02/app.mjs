import {DEFAULT_SEED,RECIPES,NODES,METHODS,PRIORITIES,DIRECTIONS,createSession,view,createBrand,selectBrand,startBatch,bottleCurrent,advance,acceptOffer,declineOffer} from './model.mjs?v=0.2';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n).toFixed(2),money=n=>`£${number(n)}`;
const ageName=n=>n<12?`${n}か月`:`${Math.floor(n/12)}年${n%12?`${n%12}か月`:''}`;
const monthName=n=>`実験${Math.floor(n/12)+1}年目${n%12+1}月`;
const nodeName=id=>NODES.find(n=>n.id===id)?.name??id;
const options=rows=>rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
const axes=[['roughness','シゲキ',1],['character','原酒のかおり',1],['wood','木のかおり',1.35]];
let setup={seed:DEFAULT_SEED,method:'current',priority:'ordered',recipe:'aroma',direction:'aroma',initialAge:12,initialCount:20};
let session=createSession(setup),releaseId=null,bottleCount=null,bottleBrandId=null;
$('method').innerHTML=options(METHODS);$('priority').innerHTML=options(PRIORITIES);$('initial-recipe').innerHTML=options(RECIPES);$('next-recipe').innerHTML=options(RECIPES);$('brand-direction').innerHTML=options(DIRECTIONS);$('initial-direction').innerHTML=options(DIRECTIONS);
function syncControls(){for(const [key,id] of [['seed','seed'],['method','method'],['priority','priority'],['recipe','initial-recipe'],['direction','initial-direction'],['initialAge','initial-age'],['initialCount','initial-count']])$(id).value=setup[key]??'';}
syncControls();
function profileHtml(profile){return axes.map(([key,label,max])=>`<div class="axis"><label>${label}</label><meter min="0" max="${max}" value="${profile[key]}" aria-label="${label}">${number(profile[key])}</meter><span>${number(profile[key])}</span></div>`).join('');}
function brandName(v,id){return v.brands.find(b=>b.id===id)?.name??'ブランド';}
function releaseCaption(v,r){const ordinal=v.releases.filter(x=>x.brandId===r.brandId).findIndex(x=>x.id===r.id)+1;return `発売${ordinal} · No.${r.parentSerial} · ${ageName(r.age)}`;}
function releaseName(v,id){const r=v.releases.find(r=>r.id===id);return r?releaseCaption(v,r):'ビン';}
function shipmentHtml(v,r){return `<article class="shipment"><strong>${esc(nodeName(r.nodeId))}へ${r.count}本</strong><small>${monthName(r.month)} · ${esc(brandName(v,r.brandId))}</small><p>${esc(releaseName(v,r.releaseId))} · 入金 ${money(r.revenue)}</p></article>`;}
const orderStatus=o=>o.reason||({shipped:'出荷済み',partial:'一部出荷',unapproved:'承認前','no-demand':'注文なし','out-of-stock':'在庫なし','insufficient-stock':'在庫不足','below-minimum':'最低本数に届かず','unknown-release':'対象のビンなし',unfilled:'未出荷'})[o.status]||o.status;
function render(){
 const v=view(session),brand=v.brands.find(b=>b.id===v.selectedBrandId),releases=v.releases.filter(r=>r.brandId===v.selectedBrandId);
 if(!releases.some(r=>r.id===releaseId))releaseId=releases.at(-1)?.id??null;
 if(!v.brands.some(b=>b.id===bottleBrandId))bottleBrandId=v.selectedBrandId;
 $('month').textContent=monthName(v.month);$('receipts-total').textContent=money(v.cash);
 $('brand').innerHTML=options(v.brands);$('brand').value=v.selectedBrandId;
 $('bottle-brand').innerHTML=options(v.brands);$('bottle-brand').value=bottleBrandId;
 $('release').innerHTML=releases.length?releases.map(r=>`<option value="${r.id}">${esc(releaseCaption(v,r))} · ${r.stock}本</option>`).join(''):'<option value="">ビンなし</option>';$('release').value=releaseId??'';$('release').disabled=!releases.length;
 $('brand-direction-label').hidden=v.method!=='declared';$('initial-direction-label').hidden=v.method!=='declared';
 $('brand-expectation').textContent=v.method==='declared'?`味の方向：${DIRECTIONS.find(d=>d.id===brand?.direction)?.name??'指定なし'}`:v.method==='learned'?(brand?.learned?.count?`出荷した${brand.learned.count}本の味を参照`:'まだ出荷の記録なし'):'自家販売の実績を参照';
 const release=releases.find(r=>r.id===releaseId);$('release-info').textContent=release?`在庫 ${release.stock}本 / ${release.originalCount}本`:'このブランドのビンはまだありません。';$('release-profile').innerHTML=release?profileHtml(release.profile):'';
 $('brand-stock').innerHTML=releases.map(r=>`<p class="stock-row">${esc(releaseCaption(v,r))} · 在庫${r.stock}本<small>1本 ${money(r.price)}</small></p>`).join('');
 $('shops').innerHTML=v.nodes.map(n=>{
  const relation=n.brands.find(b=>b.brandId===v.selectedBrandId),offer=relation?.offer;
  const status=offer?'申し出あり':relation?.handling?'取扱い中':relation?.accepted?'受諾済み':relation?.known?'知られている':'紹介前';
  const detail=offer?.reason??relation?.reason??'';
  return `<article class="shop" data-node="${esc(n.id)}" data-accepted="${!!relation?.accepted}" data-offer="${!!offer}"><h3>${esc(n.name)}</h3><div class="shop-status">${status}</div>${detail?`<p class="note">${esc(detail)}</p>`:''}${offer?`<div class="shop-actions"><button data-action="accept" data-offer-id="${esc(offer.id)}" aria-label="${esc(n.name)}の申し出を受ける">受ける</button><button data-action="decline" data-offer-id="${esc(offer.id)}" aria-label="${esc(n.name)}の申し出を見送る">見送る</button></div>`:''}</article>`;
 }).join('');
 $('recent-shipments').innerHTML=v.receipts.length?[...v.receipts].slice(-3).reverse().map(r=>shipmentHtml(v,r)).join(''):'<p class="note">まだ出荷はありません。</p>';
 const accepted=v.nodes.some(n=>n.brands.some(b=>b.accepted));
 const pending=v.orders.filter(o=>!['no-demand','unapproved'].includes(o.status)&&(o.shipped<o.count||o.status==='unknown-release'||o.shipped===0&&!!o.reason)),reasons=[...new Set(pending.map(orderStatus).filter(Boolean))],shipped=v.receipts.some(r=>r.month===v.month&&r.count>0);
 $('order-status').textContent=!accepted?'取扱いは、申し出を受けてから始まります。':v.month===0?'受諾後も、注文のある月まで出荷しません。':reasons.length?reasons.slice(0,2).join(' / '):shipped?'今月の注文に出荷しました。':'今月の注文はありません。';
 const c=v.cask;$('cask').innerHTML=c?`<p>たる No.${c.serial} · ${ageName(c.age)} · ${c.type==='bourbon'?'バーボン':'リフィル'}<br>${number(c.litres)} L · ${c.bottles}本まで</p><div class="profile">${profileHtml(c)}</div>`:'<p>たるは空いています。</p>';
 if(bottleCount===null)bottleCount=c?Math.min(5,c.bottles):0;
 $('bottle-count').value=bottleCount;$('bottle-count').max=c?.bottles??0;$('bottle-count').disabled=!c;
 updateBottling(v);
 $('start-batch').disabled=!!c;$('next-recipe').disabled=!!c;$('next-cask').disabled=!!c;$('batch-reason').textContent=c?'今のたるを空にしてから仕込みます。':'製法とたるを選んで仕込みます。';
 $('orders').innerHTML=v.orders.length?v.orders.map(o=>`<article class="record">${esc(nodeName(o.nodeId))} · ${esc(brandName(v,o.brandId))}<small>${monthName(o.month)}</small><p>注文 ${o.count}本 · 出荷 ${o.shipped}本<br>${esc(orderStatus(o))}</p></article>`).join(''):'<p class="note">今月の注文なし</p>';
 $('receipts').innerHTML=v.receipts.length?[...v.receipts].reverse().map(r=>shipmentHtml(v,r)).join(''):'<p class="note">出荷なし</p>';
 const routes=v.events.filter(e=>Array.isArray(e.route));$('routes').innerHTML=routes.length?[...routes].reverse().map(e=>`<article class="record">${e.route.map(nodeName).map(esc).join(' → ')}<small>${monthName(e.month)} · ${esc(brandName(v,e.brandId))}</small></article>`).join(''):'<p class="note">紹介の記録なし</p>';
}
function updateBottling(v=view(session)){
 const c=v.cask,valid=!!c&&Number.isInteger(bottleCount)&&bottleCount>=1&&bottleCount<=c.bottles&&v.brands.some(b=>b.id===bottleBrandId);
 $('bottle-quote').textContent=valid?`${bottleCount}本を ${brandName(v,bottleBrandId)} として残す`:'';$('bottle').disabled=!valid;
}
function run(action,message){try{session=action();render();$('message').textContent=message;return true;}catch(error){$('message').textContent=error.message;return false;}}
function reset(){
 const next={seed:Number($('seed').value),method:$('method').value,priority:$('priority').value,recipe:$('initial-recipe').value,direction:$('initial-direction').value,initialAge:$('initial-age').value===''?null:Number($('initial-age').value),initialCount:Number($('initial-count').value)};
 if(run(()=>{const fresh=createSession(next);setup=next;releaseId=null;bottleCount=null;bottleBrandId=null;return fresh;},'同じ条件の初期状態に戻しました。'))for(const id of ['brand-name','note-auto','note-brand','note-next'])$(id).value='';
 syncControls();
}
$('brand').addEventListener('change',()=>run(()=>{releaseId=null;bottleBrandId=Number($('brand').value);return selectBrand(session,bottleBrandId);},''));
$('release').addEventListener('change',()=>{releaseId=Number($('release').value);render();});
$('create-brand').addEventListener('click',()=>{if(run(()=>{const next=createBrand(session,{name:$('brand-name').value,direction:view(session).method==='declared'?$('brand-direction').value:'free'});releaseId=null;bottleBrandId=null;return next;},'ブランドを作りました。'))$('brand-name').value='';});
$('shops').addEventListener('click',event=>{const button=event.target.closest('[data-offer-id]');if(!button)return;const id=button.dataset.offerId;if(button.dataset.action==='accept')run(()=>acceptOffer(session,id),'取扱いを受けました。出荷は注文のある月からです。');if(button.dataset.action==='decline')run(()=>declineOffer(session,id),'今回は見送ります。');});
$('advance1').addEventListener('click',()=>{bottleCount=null;run(()=>advance(session,1),'1か月進めました。');});
$('advance3').addEventListener('click',()=>{bottleCount=null;run(()=>advance(session,3),'3か月進めました。');});
$('bottle-count').addEventListener('input',()=>{bottleCount=Number($('bottle-count').value);updateBottling();});
$('bottle-brand').addEventListener('change',()=>{bottleBrandId=Number($('bottle-brand').value);updateBottling();});
$('bottle').addEventListener('click',()=>run(()=>{const next=selectBrand(bottleCurrent(session,bottleCount,bottleBrandId),bottleBrandId);releaseId=view(next).releases.at(-1)?.id??null;bottleCount=null;return next;},'今の風味をビンに残しました。'));
$('start-batch').addEventListener('click',()=>run(()=>{const next=startBatch(session,{recipe:$('next-recipe').value,type:$('next-cask').value});bottleCount=null;return next;},'次のたるを仕込みました。'));
for(const id of ['method','priority','initial-recipe','initial-direction','seed','initial-age','initial-count'])$(id).addEventListener('change',reset);
$('reset').addEventListener('click',reset);
$('export').addEventListener('click',()=>{const notes=Object.fromEntries(['auto','brand','next'].map(key=>[key,$('note-'+key).value]));const data=JSON.stringify({format:'ambertime-reputation-session/0.2',...session,initialSetup:setup,notes},null,2)+'\n',url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`ambertime-reputation-v02-${setup.seed}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('message').textContent='この実験の記録と感想を書き出しました。';});
render();
