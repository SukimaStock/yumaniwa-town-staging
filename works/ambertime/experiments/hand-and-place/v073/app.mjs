import * as M from '../v072/model.mjs';
import * as D from './draft.mjs';
import {identity,age,flavor,layoutScene,roomBackdrop} from './view.mjs';
import {bottleArt,stillArt} from '../../../room-object-art.mjs';
import {barrel} from '../../../cask-glass-art.mjs';
import {symbolMarkup} from '../../../pixel-symbols.mjs';
import {fontReady} from '../../../font-loader.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session=M.create(),state=session.game,room='sales',view='C',page=0,past=false,modal=null,parents=[],opener=null,playing=false,timer=null;
const cache=new WeakMap(),effects=new Set(),placementMotions=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)'),stats={renders:0,backgroundWrites:0,objectCreates:0,labelWrites:0,motions:0};
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
function openProduct(id,destination=null){const l=lot(id);if(!l)return;show({kind:'product',id:l.id,destination,draft:D.createDraft(l),portion:'1'});}
function wishShort(id){const o=wish(state.shops[id].orderId);if(!o)return '今の希望はありません';if(o.reason.code==='same')return '前と同じ一本';return ({lighter:'もう少し軽い味',younger:'同じ製法でもう少し若く',other:'前と違う一本'})[o.reason.wish]??(o.reason.code==='initial'?(id==='restaurant'?'食後に出せる一本':'店頭で紹介する一本'):'改めて一本');}
function placementTarget(id,label,l){return `<button class="placement-target ${modal.destination===id?'from-store':''}" data-action="place" data-id="${id}"><span class="target-title"><span class="destination-heading">${symbolMarkup('store')}${label}</span><small>${id==='retail'?'変更できる未販売分':esc(wishShort(id))}</small></span><span class="target-bottle" aria-hidden="true">${artFor(l)}</span><output id="placed-${id}"></output></button>`;}
function renderModal(){if(!modal)return;if(modal.kind==='job'&&!state.jobs.some(j=>j.id===modal.id))return;const f=focusKey(),m=modal;let title='',body='',actions='';
 if(m.kind==='product'){
  const l=lot(m.id);
  title=`${identity(state,l).brand}・第${identity(state,l).number}回`;body=`<div class="product-overview"><div class="modal-bottle">${artFor(l)}</div><p>${age(l.ageMonths)}・使える在庫 ${l.stock+l.retail}本</p></div>`;
  body+=`<div class="portion-buttons" aria-label="一度に置く本数">${[['1','1本'],['2','2本'],['half','半分'],['all','残り全部']].map(([id,t])=>button(t,'portion',id,'aria-pressed="'+(m.portion===id)+'"')).join('')}</div><p class="draft-hand">手元に残す <output id="hand-remainder"></output>本</p><div class="placement-targets">${placementTarget('retail','自家販売',l)}${M.STORES.map(n=>placementTarget(n.id,n.name,l)).join('')}</div><div class="draft-tools">${button('取消','undo','','aria-label="直前の仮置きを取り消す"')}${button('元の配分','draft-reset')}${button('分け直す','redistribute')}</div><p id="allocation-note" hidden></p><p id="allocation-error" role="status" hidden></p>`;
  if(m.receipt)body+=`<p class="receipt" role="status">${esc(m.receipt)}</p>`;
  body+=`<details id="product-details"><summary>個性と仕込み</summary><p>${esc(l.label)}・${esc(flavor(l))}</p><p>${esc(M.recipeText(l))}</p>${button('もう一度造る','rebrew',l.id)}<details id="quantity-detail"><summary>本数と希望を確認</summary>${['retail',...M.STORES.map(n=>n.id)].map(id=>`<label for="allocation-${id}">${id==='retail'?'自家販売の未販売':shop(id).name+'へ今回'}<input id="allocation-${id}" data-allocation="${id}" type="number" min="0" step="1" inputmode="numeric" value="${m.draft.allocation[id]}"></label>`).join('')}${M.STORES.map(n=>{const o=wish(state.shops[n.id].orderId);return o?`<p>${esc(n.name)}：${esc(o.text)}</p>`:'';}).join('')}</details></details>`;
  actions=button('これで決める','confirm',l.id,'data-confirm')+button('戻る','back','','data-return="true"');
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
  title='条件と記録';body=`<p><a href="../v072/" target="_blank" rel="noopener">Lab 0.7.2で操作を比べる</a></p><label><input id="archive" type="checkbox" ${past?'checked':''}> 過去の発売回も棚に表示</label><label for="scenario">初期条件</label><select id="scenario"><option value="standard" ${state.initialScenario==='standard'?'selected':''}>各6本・22か月樽</option><option value="scarce" ${state.initialScenario==='scarce'?'selected':''}>少量・23か月樽</option></select>${button('ログを書き出す','export')}<label class="file">ログを再現<input id="import" type="file" accept="application/json,.json"></label>${button('最初から','reset')}<p>シード ${state.seed}</p><p><a href="REPORT.md" target="_blank">検証レポート</a></p>`;actions=button('戻る','back','','data-return="true"');
 }
 text($('dialog-title'),title);$('action-dialog').dataset.kind=m.kind;html($('dialog-body'),body);html($('dialog-actions'),actions);if(m.kind==='product')updateDraft();restore(f);
}
function clearReceipt(){modal.receipt=null;$('dialog-body').querySelector('.receipt')?.remove();$('dialog-error').hidden=true;}
function updateDraft(syncInputs=true){if(modal?.kind!=='product')return;const l=lot(modal.id),d=modal.draft,a=d.allocation;for(const id of ['retail',...M.STORES.map(n=>n.id)]){text($('placed-'+id),a[id]+'本');const target=$('placed-'+id).closest('button');target.classList.toggle('has-bottle',a[id]>0);attr(target,'aria-label',`${id==='retail'?'自家販売':shop(id).name}、${a[id]}本、${D.portion(d,modal.portion)}本置く`);if(syncInputs)$('allocation-'+id).value=a[id];}
 text($('hand-remainder'),D.remaining(d));for(const b of $('dialog-body').querySelectorAll('[data-action="portion"]'))attr(b,'aria-pressed',b.dataset.id===modal.portion);
 $('dialog-body').querySelector('[data-action="undo"]').disabled=!d.history.length;
 const same=Object.keys(a).every(k=>a[k]===d.initial[k]),zero=Object.values(a).every(v=>v===0);$('dialog-body').querySelector('[data-action="draft-reset"]').disabled=same;$('dialog-body').querySelector('[data-action="redistribute"]').disabled=zero;
 const notes=[];if(a.retail<l.retail)notes.push(`自家販売中の${l.retail-a.retail}本を変更`);if(a.restaurant+a.liquor>0)notes.push('店へ渡した分は戻せません');const note=$('allocation-note');note.hidden=!notes.length;text(note,notes.join('。')+(notes.length?'。':''));
 if(syncInputs){$('allocation-error').hidden=true;$('dialog-actions').querySelector('[data-confirm]').disabled=false;}
}
function draftOperation(type,id){clearReceipt();let result;if(type==='place')result=D.place(modal.draft,id,modal.portion);else result=({undo:D.undo,'draft-reset':D.reset,redistribute:D.redistribute})[type](modal.draft);updateDraft();if(result.changed&&type==='place')placementMotion(id);}
function confirmTransfer(){const m=modal,action=D.makeAction(m.draft,m.id,state.shops),r=act(action);if(!r)return;m.receipt=r.text;m.draft=D.createDraft(lot(m.id));renderModal();}
function placementMotion(id){const e=$('placed-'+id)?.previousElementSibling,old=placementMotions.get(id);if(old){effects.delete(old);placementMotions.delete(id);old.cancel();}if(document.hidden||reduced.matches||!visible(e))return;const a=e.animate([{transform:'translateY(-6px)',opacity:.5},{transform:'translateY(0)',opacity:1}],{duration:240,iterations:1});placementMotions.set(id,a);effects.add(a);stats.motions++;a.onfinish=a.oncancel=()=>{effects.delete(a);if(placementMotions.get(id)===a)placementMotions.delete(id);};}
function syncClock(){text($('time-status'),playing?'進行中':'停止中');attr($('play'),'aria-pressed',playing);attr($('play'),'aria-label',playing?'時間を止める':'時間を流す');html($('play'),symbolMarkup(playing?'pause':'play'));}
function stop(){playing=false;clearTimeout(timer);timer=null;cancelEffects();syncClock();}
function tick(){timer=null;if(!playing)return;act({type:'step',months:1});if(state.month>=1200){stop();return;}timer=setTimeout(tick,3000);}
function toggle(){if(playing)stop();else if(!document.hidden&&!modal&&state.month<1200){playing=true;timer=setTimeout(tick,3000);syncClock();}}
function visible(e){if(!e?.isConnected)return false;const r=e.getBoundingClientRect();const clip=$('dialog-body'),c=clip.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&(!clip.contains(e)||(r.bottom>c.top&&r.top<c.bottom));}
function cancelEffects(){for(const a of effects)a.cancel();effects.clear();placementMotions.clear();}
function pulse(e){if(document.hidden||reduced.matches||!visible(e))return;const a=e.animate([{opacity:.5},{opacity:1}],{duration:360,iterations:1});effects.add(a);stats.motions++;a.onfinish=a.oncancel=()=>effects.delete(a);}
function eventMotion(events){const targets=new Set();for(const e of events){if(e.type==='delivery'||e.type==='allocate')targets.add(modal?$('dialog-actions'):document.querySelector(`[data-release="${e.lotId}"] .object-art`));else if(e.type==='order')targets.add($('shops'));}for(const target of targets)pulse(target);}
function reset(){if(!confirm('最初から始めます。必要なログは先に書き出してください。'))return;const scenario=$('scenario')?.value??state.initialScenario;close();session=M.create({seed:42,scenario});state=session.game;page=0;past=false;message('');render();}
function exportLog(){const url=URL.createObjectURL(new Blob([JSON.stringify(M.exportLog(session),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`ambertime-sales-v073-${state.month}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('room-nav').onclick=e=>{const b=e.target.closest('[data-room]');if(!b)return;cancelEffects();room=b.dataset.room;page=0;render();};
$('product-shelf').onclick=e=>{const b=e.target.closest('[data-release]');if(b)openProduct(Number(b.dataset.release));};
$('cask-rack').onclick=e=>{const b=e.target.closest('[data-job]');if(b)show({kind:'job',id:Number(b.dataset.job)});};
$('recipes').onclick=()=>show({kind:'recipes'});$('shops').onclick=()=>show({kind:'shops'});$('settings').onclick=()=>show({kind:'settings'});$('step').onclick=()=>act({type:'step',months:1});$('play').onclick=toggle;
$('shelf-pages').onclick=e=>{const b=e.target.closest('[data-page]');if(b){page=Math.max(0,page+Number(b.dataset.page));cancelEffects();render();}};
$('close-dialog').onclick=close;$('action-dialog').addEventListener('cancel',e=>{e.preventDefault();close();});
$('action-dialog').onclick=e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const a=b.dataset.action,id=b.dataset.id;
 if(a==='back'){back();}else if(a==='shop')show({kind:'pick',id});else if(a==='pick')show({kind:'pick',id});else if(a==='product')openProduct(Number(id),modal.id);else if(a==='recipe')show({kind:'recipe',id:Number(id)});else if(a==='confirm')confirmTransfer();else if(a==='portion'){modal.portion=id;updateDraft(false);}else if(['place','undo','draft-reset','redistribute'].includes(a)){draftOperation(a,id);}
 else if(a==='rebrew'){const r=act({type:'rebrew',lotId:Number(id)});if(r){close();room='warehouse';render();message(r.text);document.querySelector(`[data-job="${r.jobId}"]`)?.focus({preventScroll:true});}}
 else if(a==='bottle'){const r=act({type:'bottle',jobId:Number(id)});if(r){close();room='sales';page=Math.floor(state.lots.filter(l=>past||l.stock+l.retail>0).findIndex(l=>l.id===r.lotId)/4);render();message(`第${identity(state,lot(r.lotId)).number}回 (#${r.lotId})を6本瓶詰めしました。`);pulse(document.querySelector(`[data-release="${r.lotId}"] .object-art`));document.querySelector(`[data-release="${r.lotId}"]`)?.focus({preventScroll:true});}}
 else if(a==='export')exportLog();else if(a==='reset')reset();
};
$('dialog-body').oninput=e=>{if(!e.target.dataset.allocation)return;clearReceipt();const inputs=[...$('dialog-body').querySelectorAll('[data-allocation]')],values=Object.fromEntries(inputs.map(i=>[i.dataset.allocation,i.value===''?NaN:Number(i.value)])),valid=Object.values(values).every(v=>Number.isInteger(v)&&v>=0)&&Object.values(values).reduce((n,v)=>n+v,0)<=modal.draft.total;if(valid)D.setAllocation(modal.draft,values);updateDraft(false);$('allocation-error').hidden=valid;text($('allocation-error'),'使える在庫の範囲で、0以上の整数を入力してください。');$('dialog-actions').querySelector('[data-confirm]').disabled=!valid;};
$('dialog-body').onchange=async e=>{const id=e.target.id;if(id==='archive'){past=e.target.checked;page=0;render();}
 else if(id==='scenario')reset();
 else if(id==='import'){try{const file=e.target.files[0];if(!file)return;const next=M.replay(JSON.parse(await file.text()));close();session=next;state=session.game;page=0;render();message('操作ログを再現しました。');}catch(err){text($('dialog-error'),err.message);$('dialog-error').hidden=false;}}
};
function resize(){const vv=window.visualViewport,scale=Math.min(innerWidth/360,innerHeight/640),left=(innerWidth-360*scale)/2,top=(innerHeight-640*scale)/2;Object.assign($('room-surface').style,{left:left+'px',top:top+'px',transform:`scale(${scale})`});document.documentElement.style.setProperty('--view-width',(vv?.width??innerWidth)+'px');document.documentElement.style.setProperty('--view-height',(vv?.height??innerHeight)+'px');document.documentElement.style.setProperty('--view-left',(vv?.offsetLeft??0)+'px');document.documentElement.style.setProperty('--view-top',(vv?.offsetTop??0)+'px');cancelEffects();}
$('close-dialog').innerHTML=symbolMarkup('close');$('shops').innerHTML=symbolMarkup('store');$('still-art').innerHTML=stillArt();
window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});reduced.addEventListener('change',cancelEffects);fontReady.then(()=>render());window.addEventListener('scroll',cancelEffects,{passive:true,capture:true});
window.salesLab={snapshot:()=>structuredClone(session),diagnostics:()=>({...stats,playing,clockPending:timer!==null,activeMotion:effects.size,placementMotion:placementMotions.size,room,view}),redraw:render,stop};resize();render();
