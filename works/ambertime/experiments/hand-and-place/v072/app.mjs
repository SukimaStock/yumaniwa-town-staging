import * as M from './model.mjs';
import {identity,age,flavor,layoutScene,roomBackdrop} from './view.mjs';
import {bottleArt,stillArt} from '../../../room-object-art.mjs';
import {barrel} from '../../../cask-glass-art.mjs';
import {symbolMarkup} from '../../../pixel-symbols.mjs';
import {fontReady} from '../../../font-loader.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session=M.create(),state=session.game,room='sales',view='C',page=0,past=false,modal=null,parents=[],opener=null,playing=false,timer=null;
const cache=new WeakMap(),effects=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)'),stats={renders:0,backgroundWrites:0,objectCreates:0,labelWrites:0,motions:0};
const lot=id=>state.lots.find(l=>l.id===Number(id)),shop=id=>M.STORES.find(s=>s.id===id),wish=id=>state.orders.find(o=>o.id===id),name=l=>{const i=identity(state,l);return `${i.brand}・第${i.number}回 (#${i.id})`;};
const text=(e,t)=>{if(e.textContent!==String(t)){e.textContent=t;stats.labelWrites++;}};
function html(e,h){if(cache.get(e)!==h){e.innerHTML=h;cache.set(e,h);}}
function attr(e,k,v){if(e.getAttribute(k)!==String(v))e.setAttribute(k,String(v));}
function focusKey(){const a=document.activeElement;return {a,id:a?.id,action:a?.dataset.action,key:a?.dataset.id};}
function restore(f){if(!f.a?.isConnected){const n=f.id?$(f.id):f.action?document.querySelector(`[data-action="${CSS.escape(f.action)}"][data-id="${CSS.escape(f.key??'')}"]`):null;n?.focus({preventScroll:true});}}
function message(s){text($('scene-message'),s);}
function act(action){try{const i=state.events.length,r=M.dispatch(session,action);state=session.game;render();eventMotion(state.events.slice(i));return r;}catch(e){text($('dialog-error'),e.message);$('dialog-error').hidden=false;return null;}}
function artFor(l){return bottleArt(l.profile.wood);}
function keyed(parent,items,id,build,update){const old=new Map([...parent.children].map(e=>[e.dataset.key,e]));for(const x of items){const k=String(id(x));let e=old.get(k);if(!e){e=build(x);e.dataset.key=k;parent.append(e);stats.objectCreates++;}old.delete(k);update(e,x);}for(const e of old.values())e.remove();}
function shelfNode(id,markup,kind,index){const e=document.createElement('button');e.className='shelf-item';e.dataset[kind]=id;e.innerHTML=`<span class="object-art">${markup}</span><span class="bottle-count"></span><span class="bottle-name"></span><span class="release-tag"></span><span class="sale-state"></span>`;return e;}
function position(e,index,markup){const p=layoutScene({room:'sales'}).productSlots[index],top=index<2?144:324,bottom=Number(markup.match(/data-content-bottom="(\d+)"/)?.[1]??12),box=markup.match(/viewBox="0 0 (\d+) (\d+)"/),w=Number(box?.[1]??12)*3,h=Number(box?.[2]??12)*3;
 const key=`${index}:${w}:${h}:${bottom}`;if(e.dataset.position===key)return;e.dataset.position=key;
 Object.assign(e.style,{left:p.x+'px',top:top+'px',height:(index<2?180:144)+'px'});for(const [k,v]of Object.entries({'--art-top':p.base-bottom*3-top,'--art-width':w,'--art-height':h,'--label-top':p.base+8-top,'--tag-top':p.base+52-top,'--state-top':p.base+70-top}))e.style.setProperty(k,v+'px');}
function render(){stats.renders++;const f=focusKey();text($('calendar'),age(state.month));text($('room-title'),({sales:'販売室',warehouse:'貯蔵庫',distill:'蒸留室'})[room]);document.body.dataset.room=room;
 if($('backdrop').dataset.room!==room){html($('backdrop'),roomBackdrop(room));$('backdrop').dataset.room=room;stats.backgroundWrites++;}
 for(const b of $('room-nav').children)attr(b,'aria-pressed',b.dataset.room===room);
 const stock=state.lots.filter(l=>past||l.stock+(l.retail??0)>0),pages=Math.max(1,Math.ceil(stock.length/4));page=Math.min(page,pages-1);const visible=stock.slice(page*4,page*4+4);
 $('product-shelf').hidden=room!=='sales';$('cask-rack').hidden=room!=='warehouse';$('still-art').hidden=$('recipes').hidden=room!=='distill';$('shelf-pages').hidden=room!=='sales'||pages<2;text($('page-label'),`${page+1}/${pages}`);
 if(room==='sales')keyed($('product-shelf'),visible,l=>l.id,l=>shelfNode(l.id,artFor(l),'release'),(e,l)=>{const i=visible.indexOf(l),brand=identity(state,l),multiple=state.lots.filter(x=>x.recipeId===l.recipeId).length>1;position(e,i,artFor(l));text(e.querySelector('.bottle-count'),(l.stock+l.retail)+'本');text(e.querySelector('.bottle-name'),brand.brand);text(e.querySelector('.release-tag'),multiple?`第${brand.number}回\n${age(l.ageMonths)}`:'');text(e.querySelector('.sale-state'),'');attr(e,'aria-label',`${name(l)}、${age(l.ageMonths)}、手元${l.stock}本、自家販売未販売${l.retail}本`);});
 if(room==='warehouse')keyed($('cask-rack'),state.jobs,j=>j.id,j=>shelfNode(j.id,barrel(j.recipe.cask==='first'?'bourbon':'refill'),'job'),(e,j)=>{position(e,state.jobs.indexOf(j),barrel(j.recipe.cask==='first'?'bourbon':'refill'));text(e.querySelector('.bottle-name'),`樽 ${j.id}`);text(e.querySelector('.release-tag'),j.stage==='preparing'?'仕込み中':`熟成 ${age(j.ageMonths)}`);attr(e,'aria-label',`樽${j.id}、${j.stage==='preparing'?'仕込み中':age(j.ageMonths)}`);});
 text($('empty-room'),room==='sales'&&!visible.length?'瓶詰めした一本が並びます':room==='warehouse'&&!state.jobs.length?'熟成中の樽はありません':'');
 $('shops').classList.toggle('has-wish',M.STORES.some(n=>state.shops[n.id].orderId));syncClock();if(modal)renderModal();restore(f);
}
function button(label,action,id='',extra=''){return `<button data-action="${action}" data-id="${id}" ${extra}>${label}</button>`;}
function show(next,push=true){stop();if(modal&&push)parents.push({...modal});if(!modal)opener=document.activeElement;modal=next;$('dialog-error').hidden=true;renderModal();if(!$('action-dialog').open){$('action-dialog').showModal();$('close-dialog').focus({preventScroll:true});}}
function close(){stop();modal=null;parents=[];$('action-dialog').close();if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;}
function back(){cancelEffects();if(parents.length){modal=parents.pop();$('dialog-error').hidden=true;renderModal();}else close();}
function openProduct(id,destination=null){const l=lot(id);if(!l)return;show({kind:'product',id:l.id,destination,allocation:{retail:l.retail,restaurant:0,liquor:0}});}
function allocationRow(id,label,value,extra=''){return `<div class="allocation-row ${modal.destination===id?'from-store':''}" data-row="${id}"><label for="allocation-${id}">${label}<small>${id==='retail'?'変更後の未販売':`今回渡す ${extra}`}</small></label><div class="amount-controls">${button('−','adjust',id,'data-delta="-1" aria-label="'+label+'を1本減らす"')}<input id="allocation-${id}" data-allocation="${id}" type="number" min="0" step="1" inputmode="numeric" value="${value}" aria-label="${label}の本数">${button('＋','adjust',id,'data-delta="1" aria-label="'+label+'を1本増やす"')}</div></div>`;}
function renderModal(){if(!modal)return;if(modal.kind==='job'&&!state.jobs.some(j=>j.id===modal.id))return;const f=focusKey(),m=modal;let title='',body='',actions='';
 if(m.kind==='product'){
  const l=lot(m.id),a=m.allocation;
  title=name(l);body=`<div class="product-overview"><div class="modal-bottle">${artFor(l)}</div><p>${age(l.ageMonths)}・使える在庫 ${l.stock+l.retail}本</p></div>`;
  body+=`<div class="allocation-rows">${allocationRow('retail','自家販売',a.retail)}${M.STORES.map(n=>{const o=wish(state.shops[n.id].orderId);return allocationRow(n.id,n.name,a[n.id],o?`<button class="wish-detail" data-action="wish" data-id="${n.id}" aria-label="${n.name}の希望を確認">希望${o.count}本</button>`:'');}).join('')}</div><p class="allocation-hand">手元に残す <output id="hand-remainder"></output>本</p><p id="allocation-note" hidden></p><p id="allocation-error" role="status" hidden></p>`;
  if(m.wishShop){const o=wish(state.shops[m.wishShop].orderId);if(o)body+=`<p class="current-wish">${esc(shop(m.wishShop).name)}：${esc(o.text)}</p>`;}
  if(m.receipt)body+=`<p class="receipt" role="status">${esc(m.receipt)}</p>`;
  body+=`<details><summary>個性と仕込み</summary><p>${esc(l.label)}・${esc(flavor(l))}</p><p>${esc(M.recipeText(l))}</p><p>自家販売は変更後の未販売本数。店の本数は今回渡す分です。</p>${button('もう一度造る','rebrew',l.id)}</details>`;
  actions=button('この内容で決める','confirm',l.id,'data-confirm')+button('戻る','back','','data-return="true"');
 }else if(m.kind==='shops'){
  title='取扱店';body=`<div class="stockist-list">${M.STORES.map(n=>{const sh=state.shops[n.id],o=wish(sh.orderId),l=lot(sh.lotId);return button(`<span class="store-summary">${symbolMarkup('store')}<span>${n.name}</span></span>${l?`<small>${esc(name(l))}</small>`:''}<small>${o?'希望が届いています':sh.stock>0?'届けた一本を扱っています':'次の声かけ待ち'}</small>`,'shop',n.id);}).join('')}</div>`;actions=button('戻る','back','','data-return="true"');
 }else if(m.kind==='shop'){
  const sh=state.shops[m.id],o=wish(sh.orderId),l=lot(sh.lotId),source=o&&lot(o.reason.sourceLotId);title=shop(m.id).name;
  body=`<div class="store-summary">${symbolMarkup('store')}${l?artFor(l):''}</div><p>${l?`${sh.stock>0?'扱っている一本':'前回の一本'}：${esc(name(l))}`:'まだ届けた一本はありません。'}</p>${o?`<p>${esc(o.text)}</p>${source?`<p class="same-origin">前回の納品${o.reason.sourceDeliveryId}：${esc(name(source))}</p>`:''}`:'<p>現在の希望はありません。</p>'}`;
  actions=button('この店へ届ける','pick',m.id)+button('戻る','back','','data-return="true"');
 }else if(m.kind==='pick'||m.kind==='recipes'){
  title=m.kind==='pick'?`${shop(m.id).name}へ届ける一本`:'過去の製法';const lots=state.lots.filter(l=>m.kind==='recipes'||l.stock+l.retail>0);
  const currentWish=m.kind==='pick'?wish(state.shops[m.id].orderId):null;body=`${currentWish?`<p class="current-wish">${esc(currentWish.text)}</p>`:''}<div class="release-list">${lots.map(l=>button(`${artFor(l)}<span>${esc(name(l))}<br>${age(l.ageMonths)}・使える${l.stock+l.retail}本</span>`,m.kind==='recipes'?'recipe':'product',l.id)).join('')||'<p>使える在庫はありません。</p>'}</div>`;actions=button('戻る','back','','data-return="true"');
 }else if(m.kind==='recipe'){
  const l=lot(m.id);title=name(l);body=`<p>${esc(M.recipeText(l))}</p><p>仕込み1か月、その後に熟成します。</p>`;actions=button('この製法で仕込む','rebrew',l.id)+button('戻る','back','','data-return="true"');
 }else if(m.kind==='job'){
  const j=state.jobs.find(j=>j.id===m.id);title=`樽 ${j.id}`;body=`<div class="product-overview"><div class="modal-bottle">${barrel(j.recipe.cask==='first'?'bourbon':'refill')}</div><p>${j.stage==='preparing'?'仕込み中':`熟成 ${age(j.ageMonths)}`}</p></div><p>${esc(M.recipeText(j))}</p><p>元の一本 ${age(j.targetAge)}。瓶詰めする時期は自分で選べます。</p>`;actions=button('今の味で6本瓶詰め','bottle',j.id,j.stage==='aging'&&j.ageMonths>=1?'':'disabled')+button('戻る','back','','data-return="true"');
 }else if(m.kind==='settings'){
  title='条件と記録';body=`<p><a href="../v071/" target="_blank" rel="noopener">Lab 0.7.1で操作を比べる</a></p><label><input id="archive" type="checkbox" ${past?'checked':''}> 過去の発売回も棚に表示</label><label for="scenario">初期条件</label><select id="scenario"><option value="standard" ${state.initialScenario==='standard'?'selected':''}>各6本・22か月樽</option><option value="scarce" ${state.initialScenario==='scarce'?'selected':''}>少量・23か月樽</option></select>${button('ログを書き出す','export')}<label class="file">ログを再現<input id="import" type="file" accept="application/json,.json"></label>${button('最初から','reset')}<p>シード ${state.seed}</p><p><a href="REPORT.md" target="_blank">検証レポート</a></p>`;actions=button('戻る','back','','data-return="true"');
 }
 text($('dialog-title'),title);$('action-dialog').dataset.kind=m.kind;html($('dialog-body'),body);html($('dialog-actions'),actions);if(m.kind==='product')updateAllocation();restore(f);
}
function updateAllocation(){if(modal?.kind!=='product')return;const l=lot(modal.id),a=modal.allocation,inputs=[...$('dialog-body').querySelectorAll('[data-allocation]')],raw=inputs.map(e=>e.value===''?NaN:Number(e.value)),total=raw.reduce((n,v)=>n+v,0),valid=raw.every(v=>Number.isInteger(v)&&v>=0)&&total<=l.stock+l.retail;
 if(valid)for(let i=0;i<inputs.length;i++)a[inputs[i].dataset.allocation]=raw[i];
 const remaining=l.stock+l.retail-Object.values(a).reduce((n,v)=>n+v,0);text($('hand-remainder'),remaining);const error=$('allocation-error');error.hidden=valid;text(error,raw.some(v=>!Number.isInteger(v)||v<0)?'0以上の整数で入力してください。':total>l.stock+l.retail?'使える在庫を超えています。':'');
 const note=$('allocation-note'),notes=[];if(a.retail<l.retail)notes.push(`自家販売中の${l.retail-a.retail}本を変更`);if(a.restaurant+a.liquor>0)notes.push('店へ渡した分は戻せません');note.hidden=!notes.length;text(note,notes.join('。')+(notes.length?'。':''));
 const confirm=$('dialog-actions').querySelector('[data-confirm]');confirm.disabled=!valid;
 for(const b of $('dialog-body').querySelectorAll('[data-action="adjust"]')){const id=b.dataset.id;b.disabled=Number(b.dataset.delta)<0?a[id]<=0:remaining<=0;}
}
function confirmTransfer(){const m=modal,l=lot(m.id),a=m.allocation,action={type:'allocate-all',lotId:l.id,retail:a.retail,deliveries:M.STORES.map(n=>({shopId:n.id,count:a[n.id],orderId:a[n.id]>0?state.shops[n.id].orderId:null}))};const r=act(action);if(!r)return;
 m.receipt=r.text;m.allocation={retail:lot(m.id).retail,restaurant:0,liquor:0};renderModal();
}
function syncClock(){text($('time-status'),playing?'進行中':'停止中');attr($('play'),'aria-pressed',playing);attr($('play'),'aria-label',playing?'時間を止める':'時間を流す');html($('play'),symbolMarkup(playing?'pause':'play'));}
function stop(){playing=false;clearTimeout(timer);timer=null;cancelEffects();syncClock();}
function tick(){timer=null;if(!playing)return;act({type:'step',months:1});if(state.month>=1200){stop();return;}timer=setTimeout(tick,3000);}
function toggle(){if(playing)stop();else if(!document.hidden&&!modal&&state.month<1200){playing=true;timer=setTimeout(tick,3000);syncClock();}}
function visible(e){if(!e?.isConnected)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
function cancelEffects(){for(const a of effects)a.cancel();effects.clear();}
function pulse(e){if(document.hidden||reduced.matches||!visible(e))return;const a=e.animate([{opacity:.5},{opacity:1}],{duration:360,iterations:1});effects.add(a);stats.motions++;a.onfinish=a.oncancel=()=>effects.delete(a);}
function eventMotion(events){const targets=new Set();for(const e of events){if(e.type==='delivery'||e.type==='allocate')targets.add(modal?$('dialog-actions'):document.querySelector(`[data-release="${e.lotId}"] .object-art`));else if(e.type==='order')targets.add($('shops'));}for(const target of targets)pulse(target);}
function reset(){if(!confirm('最初から始めます。必要なログは先に書き出してください。'))return;const scenario=$('scenario')?.value??state.initialScenario;close();session=M.create({seed:42,scenario});state=session.game;page=0;past=false;message('');render();}
function exportLog(){const url=URL.createObjectURL(new Blob([JSON.stringify(M.exportLog(session),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`ambertime-sales-v072-${state.month}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('room-nav').onclick=e=>{const b=e.target.closest('[data-room]');if(!b)return;cancelEffects();room=b.dataset.room;page=0;render();};
$('product-shelf').onclick=e=>{const b=e.target.closest('[data-release]');if(b)openProduct(Number(b.dataset.release));};
$('cask-rack').onclick=e=>{const b=e.target.closest('[data-job]');if(b)show({kind:'job',id:Number(b.dataset.job)});};
$('recipes').onclick=()=>show({kind:'recipes'});$('shops').onclick=()=>show({kind:'shops'});$('settings').onclick=()=>show({kind:'settings'});$('step').onclick=()=>act({type:'step',months:1});$('play').onclick=toggle;
$('shelf-pages').onclick=e=>{const b=e.target.closest('[data-page]');if(b){page=Math.max(0,page+Number(b.dataset.page));cancelEffects();render();}};
$('close-dialog').onclick=close;$('action-dialog').addEventListener('cancel',e=>{e.preventDefault();close();});
$('action-dialog').onclick=e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const a=b.dataset.action,id=b.dataset.id;
 if(a==='back'){back();}else if(a==='shop')show({kind:'pick',id});else if(a==='pick')show({kind:'pick',id});else if(a==='product')openProduct(Number(id),modal.id);else if(a==='recipe')show({kind:'recipe',id:Number(id)});else if(a==='confirm')confirmTransfer();else if(a==='adjust'){const key=id,input=$('allocation-'+key),value=modal.allocation[key]+Number(b.dataset.delta);if(value<0)return;input.value=value;modal.receipt=null;const receipt=$('dialog-body').querySelector('.receipt');if(receipt)receipt.remove();updateAllocation();}else if(a==='wish'){modal.wishShop=modal.wishShop===id?null:id;renderModal();}
 else if(a==='rebrew'){const r=act({type:'rebrew',lotId:Number(id)});if(r){close();room='warehouse';render();message(r.text);document.querySelector(`[data-job="${r.jobId}"]`)?.focus({preventScroll:true});}}
 else if(a==='bottle'){const r=act({type:'bottle',jobId:Number(id)});if(r){close();room='sales';page=Math.floor(state.lots.filter(l=>past||l.stock+l.retail>0).findIndex(l=>l.id===r.lotId)/4);render();message(`第${identity(state,lot(r.lotId)).number}回 (#${r.lotId})を6本瓶詰めしました。`);pulse(document.querySelector(`[data-release="${r.lotId}"] .object-art`));document.querySelector(`[data-release="${r.lotId}"]`)?.focus({preventScroll:true});}}
 else if(a==='export')exportLog();else if(a==='reset')reset();
};
$('dialog-body').oninput=e=>{const key=e.target.dataset.allocation;if(key){modal.receipt=null;const receipt=$('dialog-body').querySelector('.receipt');if(receipt)receipt.remove();updateAllocation();}};
$('dialog-body').onchange=async e=>{const id=e.target.id;if(id==='archive'){past=e.target.checked;page=0;render();}
 else if(id==='scenario')reset();
 else if(id==='import'){try{const file=e.target.files[0];if(!file)return;const next=M.replay(JSON.parse(await file.text()));close();session=next;state=session.game;page=0;render();message('操作ログを再現しました。');}catch(err){text($('dialog-error'),err.message);$('dialog-error').hidden=false;}}
};
function resize(){const vv=window.visualViewport,scale=Math.min(innerWidth/360,innerHeight/640),left=(innerWidth-360*scale)/2,top=(innerHeight-640*scale)/2;Object.assign($('room-surface').style,{left:left+'px',top:top+'px',transform:`scale(${scale})`});document.documentElement.style.setProperty('--view-width',(vv?.width??innerWidth)+'px');document.documentElement.style.setProperty('--view-height',(vv?.height??innerHeight)+'px');document.documentElement.style.setProperty('--view-left',(vv?.offsetLeft??0)+'px');document.documentElement.style.setProperty('--view-top',(vv?.offsetTop??0)+'px');cancelEffects();}
$('close-dialog').innerHTML=symbolMarkup('close');$('shops').innerHTML=symbolMarkup('store');$('still-art').innerHTML=stillArt();
window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});reduced.addEventListener('change',cancelEffects);fontReady.then(()=>render());window.addEventListener('scroll',cancelEffects,{passive:true});
window.salesLab={snapshot:()=>structuredClone(session),diagnostics:()=>({...stats,playing,clockPending:timer!==null,activeMotion:effects.size,room,view}),redraw:render,stop};resize();render();
