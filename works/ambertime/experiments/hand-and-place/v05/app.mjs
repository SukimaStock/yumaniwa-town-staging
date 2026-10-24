import * as M from '../v04/model.mjs';
import {MODES,bottles,changesFrom} from './view.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=M.create(),past=false,lastResult=null,modalKind=null,playing=false,timer=null,mode='B';
let shopChanges={},handChanges={};
const stats={renders:0,writes:{},motions:0,skipped:0,cancelled:0};
const htmlCache=new WeakMap(),effects=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const lot=id=>state.lots.find(l=>l.id===Number(id)),order=id=>state.orders.find(o=>o.id===Number(id));
const store=id=>M.STORES.find(n=>n.id===id),age=m=>`${Math.floor(m/12)}年${m%12?m%12+'か月':''}`;
const flavor=l=>`${{fruit:'果実香',smoke:'煙の香り',grain:'麦の香り',body:'厚み'}[l.product.aromaFamily]??'原酒香'}・樽香${l.product.wood>.45?'強め':l.product.wood>.15?'あり':'控えめ'}`;
function wrote(region){stats.writes[region]=(stats.writes[region]??0)+1;}
function text(id,value){const e=$(id);if(e&&e.textContent!==String(value)){e.textContent=value;wrote(id);}}
function html(e,value,region){if(htmlCache.get(e)!==value){e.innerHTML=value;htmlCache.set(e,value);wrote(region);}}
function attr(e,key,value,region){value=String(value);if(e.getAttribute(key)!==value){e.setAttribute(key,value);wrote(region);}}
function disabled(id,value){if($(id).disabled!==value){$(id).disabled=value;wrote(id);}}
function focusKey(){const a=document.activeElement;if(a?.id)return {a,selector:'#'+CSS.escape(a.id)};if(!a?.matches('button,input')||!Object.keys(a.dataset).length)return {a};return {a,selector:a.tagName.toLowerCase()+Object.entries(a.dataset).map(([k,v])=>`[data-${k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}="${CSS.escape(v)}"]`).join('')};}
function restore(f){if(f.selector&&!f.a.isConnected)document.querySelector(f.selector)?.focus({preventScroll:true});}
function say(value,outcome=''){text('result',value);attr($('result'),'data-outcome',outcome,'result');}
function objectRow(count,kind=''){
 const b=bottles(count);
 return `<span class="bottles ${kind}" aria-hidden="true">${Array.from({length:b.visible},()=>'<i class="bottle"></i>').join('')}${b.extra?`<small>+${b.extra}</small>`:''}${!count?'<i class="empty-shelf"></i>':''}</span>`;
}
// Keyed nodes preserve card/order focus and leave the unaffected shop untouched.
function keyed(parent,items,key,create,update){
 const nodes=new Map([...parent.children].filter(e=>e.dataset.key).map(e=>[e.dataset.key,e]));
 for(const item of items){const id=String(key(item));let e=nodes.get(id);if(!e){e=create(item);e.dataset.key=id;parent.append(e);wrote(parent.id);}nodes.delete(id);update(e,item);}
 for(const e of nodes.values()){e.remove();wrote(parent.id);}
}
function delta(c){return c?`<span class="change" data-origin="${c.origin}">${esc(c.text)}</span>`:'';}
function render(){
 stats.renders++;const f=focusKey();text('date',age(state.month));text('seed',state.seed);
 if($('scenario').value!==state.initialScenario)$('scenario').value=state.initialScenario;
 keyed($('orders'),M.STORES,n=>n.id,()=>{const e=document.createElement('article');e.className='order-panel';return e;},(e,n)=>{
  const s=state.shops[n.id],o=order(s.orderId),l=lot(s.lotId),d=state.deliveries.find(d=>d.id===(o?.reason.sourceDeliveryId??s.lastDeliveryId));
  const content=`<h3><span class="building" aria-hidden="true"></span>${esc(n.name)}${o?'<span class="order-mark" aria-label="注文あり">注文</span>':''}</h3><div class="shop-stock"><span class="shelf-name">${l?`#${l.id} ${esc(l.label)}`:'まだ受取なし'}</span>${mode!=='A'?objectRow(s.stock,n.id):''}<span class="stock-number">店に残り <b>${s.stock}</b>本</span>${delta(shopChanges[n.id])}</div><div class="order-slot">${o?`<button class="order" data-order="${o.id}" aria-pressed="false"><span class="order-number">注文 #${o.id}・${o.count}本</span>${esc(o.text)}</button>`:`<div class="no-order">${s.stock?'今は注文なし':'次の声かけ待ち'}</div>`}</div><p class="source">${d?`前回 #${d.lotId}を${d.count}本 · 納品${d.id}`:'最初の注文です'}</p>`;
  html(e,content,'shop:'+n.id);const b=e.querySelector('[data-order]');if(b)attr(b,'aria-pressed',state.selectedOrderId===o.id,'selection');
 });
 const visible=state.lots.filter(l=>past||l.stock>0);
 const empty=$('hand').querySelector('.empty-hand');if(empty&&visible.length)empty.remove();
 keyed($('hand'),visible,l=>l.id,()=>{const e=document.createElement('button');e.className='card';return e;},(e,l)=>{
  if(e.dataset.card!==String(l.id))e.dataset.card=l.id;e.classList.toggle('sold',!l.stock);
  html(e,`<span class="card-title">${esc(l.label)}</span><span class="flavor">${esc(flavor(l))}</span><span class="meta">#${l.id}・${age(l.ageMonths)}<br>${l.recipe.cask==='first'?'1stフィル':'リフィル'}</span>${mode!=='A'?objectRow(l.stock,l.product.aromaFamily):''}<span class="stock">残り <b>${l.stock}</b>本</span>${delta(handChanges[l.id])}`,'hand:'+l.id);
  attr(e,'aria-pressed',state.selectedLotId===l.id,'selection');
 });
 if(!visible.length&&!empty){const e=document.createElement('p');e.className='empty-hand';e.textContent='手札は品切れ。過去の一本から再仕込みできます。';$('hand').append(e);wrote('hand');}
 const o=order(state.selectedOrderId),l=lot(state.selectedLotId),isOpen=o?.status==='open',q=isOpen&&l?Math.min(o.count,l.stock):0;
 text('pair',isOpen&&l?`${store(o.shopId).name}へ #${l.id}を${q}本`:isOpen?`${store(o.shopId).name}の注文 #${o.id}を選択中`:l?`#${l.id}を選択中。注文を選ぶ`:'注文と、渡す一本を選ぶ');
 disabled('deliver',!(isOpen&&q>0));text('deliver',q?`${q}本${q<o.count?'だけ':''}渡す`:'渡す');disabled('decline',!isOpen);disabled('detail',!l);text('job-count',state.jobs.length);
 const near=state.jobs.find(j=>j.stage==='aging');text('barrel-hint',near?`樽 #${near.id}：熟成 ${age(near.ageMonths)} ／ 元の一本 ${age(near.targetAge)}`:state.jobs.length?'次の仕込みを進めています。':'仕込みなし');
 text('counts',`操作 ${state.actions.length}件。ログはv04と共通。表示方式は記録しません。`);
 if($('records').open)renderHistory();if(lastResult)resultText(lastResult);
 if($('modal').open&&modalKind==='production')renderProduction();syncPlay();restore(f);
}
function renderHistory(){html($('history'),state.events.slice(-10).reverse().map(e=>`<p>${age(e.month)} ${esc(e.text??e.type)}</p>`).join(''),'history');}
function resultText(r){
 if(['fulfilled','partial'].includes(r.outcome)){const d=state.deliveries.find(d=>d.id===r.deliveryId);say(`渡した：${store(d.shopId).name}へ${d.count}本。手札 ${d.handBefore}→${d.handAfter}本、店 ${d.shopBefore}→${d.shopAfter}本。${r.outcome==='partial'?'渡せた分で完了。':''} 店：「${d.reply}」`,'hand');}
 else if(r.outcome==='time')say(r.text,'time');else say(r.text,r.outcome);
}
function act(action,{feedback=false}={}){
 try{
  const start=state.events.length,source=action.type==='deliver'&&mode==='C'?document.querySelector(`[data-card="${state.selectedLotId}"]`):null,sourceRect=source?.getBoundingClientRect();
  const r=M.dispatch(state,action),events=state.events.slice(start),changes=changesFrom(events);
  Object.assign(shopChanges,changes.shops);Object.assign(handChanges,changes.hand);
  if(feedback)lastResult=r;
  if(action.type==='step'){
   const descriptions=M.STORES.flatMap(n=>changes.shops[n.id]?[`${n.name} ${changes.shops[n.id].text}`]:[]);
   lastResult={outcome:'time',text:`${age(state.month)}：${descriptions.join(' ／ ')||'店の残数はそのまま。'}${descriptions.length?'。':''}`};
  }
  render();animateChanges(changes.motions,sourceRect);return r;
 }catch(e){say(e.message,'error');return null;}
}
function inView(e){if(!e?.isConnected)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
function canMove(e){return mode==='C'&&!reduced.matches&&!document.hidden&&!$('modal').open&&inView(e);}
function cancelMotion(){for(const e of [...effects]){e.animation.cancel();e.node?.remove();effects.delete(e);stats.cancelled++;}}
function runMotion(target,frames,ghost=null){
 if(!canMove(target)){ghost?.remove();stats.skipped++;return;}
 const animation=(ghost??target).animate(frames,{duration:360,easing:'steps(4,end)'}),entry={target,animation,node:ghost};
 effects.add(entry);stats.motions++;
 const done=()=>{effects.delete(entry);ghost?.remove();};animation.onfinish=done;animation.oncancel=done;
}
function animateChanges(motions,sourceRect){
 // New real events replace unfinished effects. Selection/redraw is not an event.
 if(!motions.length)return;cancelMotion();
 for(const m of motions){
  const shop=document.querySelector(`[data-key="${m.shopId}"]`);
  if(m.kind==='delivery'){
   const target=shop?.querySelector('.bottles');
   if(target&&sourceRect&&sourceRect.bottom>0&&sourceRect.top<innerHeight&&canMove(target)){
    const end=target.getBoundingClientRect(),ghost=document.createElement('span');ghost.className='transfer';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=objectRow(m.count);ghost.style.left=`${Math.round(sourceRect.left+sourceRect.width/2-20)}px`;ghost.style.top=`${Math.round(sourceRect.top)}px`;document.body.append(ghost);
    runMotion(target,[{transform:'translate(0,0)',opacity:1},{transform:`translate(${Math.round(end.left+end.width/2-sourceRect.left-sourceRect.width/2)}px,${Math.round(end.top-sourceRect.top)}px)`,opacity:0}],ghost);
   }else stats.skipped++;
  }else if(m.kind==='use')runMotion(shop?.querySelector('.shop-stock'),[{transform:'translateY(0)',opacity:1},{transform:'translateY(-3px)',opacity:.5},{transform:'translateY(0)',opacity:1}]);
  else if(m.kind==='order')runMotion(shop?.querySelector('.order-mark'),[{transform:'translateY(-7px)',opacity:.3},{transform:'translateY(0)',opacity:1}]);
 }
}
function syncPlay(){
 for(const id of ['main-play','play']){const b=$(id);if(b){text(id,playing?'時間を止める':'時間を流す');attr(b,'aria-pressed',playing,'clock');}}
 text('clock-status',`${playing?'進行中':'停止中'} · 1か月＝3秒`);
}
function stop(){playing=false;clearTimeout(timer);timer=null;cancelMotion();syncPlay();}
function tick(){timer=null;if(!playing)return;act({type:'step',months:1});if(state.month>=1200){stop();return;}timer=setTimeout(tick,3000);}
function toggle(){if(playing)stop();else if(!document.hidden&&state.month<1200){playing=true;timer=setTimeout(tick,3000);syncPlay();}}
function setMode(value){if(!MODES.includes(value)||value===mode)return;cancelMotion();mode=value;document.body.dataset.view=mode;for(const b of $('views').children)attr(b,'aria-pressed',b.dataset.view===mode,'views');render();}
function open(kind,value){stop();modalKind=kind;html($('modal-body'),value,'modal');if(!$('modal').open)$('modal').showModal();}
function bars(l){return `<div class="bars">${[['fruit','果実'],['smoke','煙'],['rough','刺激'],['wood','木'],['vanilla','バニラ']].map(([k,n])=>`<div><span>${n}</span><i aria-label="${n} ${Math.round(l.profile[k]*100)}%"><b style="width:${Math.round(l.profile[k]*100)}%"></b></i></div>`).join('')}</div>`;}
function details(){const l=lot(state.selectedLotId);if(!l)return;act({type:'inspect',lotId:l.id});open('detail',`<h2>#${l.id} ${esc(l.label)}</h2><p>${age(l.ageMonths)}・残り${l.stock}本${l.sourceId?`・元の発売回 #${l.sourceId}`:''}</p>${bars(l)}<p>${esc(M.recipeText(l))}</p><button data-rebrew="${l.id}">この製法でもう一度造る</button><p>仕込み1か月、その後に熟成。瓶詰めする時期は自分で選べます。</p>`);}
function renderProduction(){const f=focusKey();html($('modal-body'),`<h2>仕込み・熟成・瓶詰め</h2><p>${age(state.month)} ／ 1か月＝3秒</p><button id="play" aria-pressed="${playing}">${playing?'時間を止める':'時間を流す'}</button><button id="step">1か月進める</button>${state.jobs.map(j=>`<div class="job"><h3>樽 ${j.id} ／ #${j.sourceId}の製法</h3><p>${j.stage==='preparing'?'仕込み中（1か月）':`熟成 ${age(j.ageMonths)} ／ 元の一本 ${age(j.targetAge)}`}</p><button data-bottle="${j.id}" ${j.stage==='aging'&&j.ageMonths>=1?'':'disabled'}>今の味で6本瓶詰め</button></div>`).join('')||'<p>仕込みなし。過去の一本の製法からも造れます。</p>'}<p>最初の樽は試遊用に${state.initialScenario==='scarce'?23:22}か月熟成済みです。新しい再仕込みは0か月から始まります。</p>`,'production');restore(f);}
$('views').onclick=e=>{const b=e.target.closest('[data-view]');if(b)setMode(b.dataset.view);};
$('orders').onclick=e=>{const b=e.target.closest('[data-order]');if(b)act({type:'select-order',orderId:Number(b.dataset.order)});};
$('hand').onclick=e=>{const b=e.target.closest('[data-card]');if(b)act({type:'select-card',lotId:Number(b.dataset.card)});};
$('deliver').onclick=()=>act({type:'deliver'},{feedback:true});$('decline').onclick=()=>act({type:'decline'},{feedback:true});$('detail').onclick=details;
$('archive').onchange=e=>{past=e.target.checked;act({type:'browse',kind:past?'past':'current'});};
$('production').onclick=()=>{act({type:'browse',kind:'production'});open('production','');renderProduction();};
$('main-step').onclick=()=>act({type:'step',months:1});$('main-play').onclick=toggle;
$('modal-body').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.rebrew){const r=act({type:'rebrew',lotId:Number(b.dataset.rebrew)},{feedback:true});if(r)$('modal').close();}if(b.dataset.bottle){const r=act({type:'bottle',jobId:Number(b.dataset.bottle)},{feedback:true});if(r)$('modal').close();}if(b.id==='step')act({type:'step',months:1});if(b.id==='play')toggle();};
$('close').onclick=()=>$('modal').close();$('modal').addEventListener('close',()=>{stop();modalKind=null;});$('modal').addEventListener('cancel',stop);
function clearView(){past=false;lastResult=null;shopChanges={};handChanges={};$('archive').checked=false;say('');}
function fresh(scenario){stop();if(!confirm('最初から始めます。必要なログは先に書き出してください。')){render();return;}state=M.create({seed:42,scenario});clearView();render();}
$('scenario').onchange=e=>fresh(e.target.value);$('reset').onclick=()=>fresh(state.initialScenario);
$('records').addEventListener('toggle',()=>{if($('records').open)renderHistory();});
$('settings').onclick=()=>{$('records').open=!$('records').open;if($('records').open)$('records').scrollIntoView({block:'nearest'});};
$('export').onclick=()=>{stop();const url=URL.createObjectURL(new Blob([JSON.stringify(M.exportLog(state),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`ambertime-hand-v05-${state.scenario}-${state.month}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onchange=async e=>{stop();try{const file=e.target.files[0];if(!file)return;const next=M.replay(JSON.parse(await file.text()));state=next;clearView();render();say('操作ログを再現しました。','replayed');}catch(err){say(err.message,'error');}e.target.value='';};
reduced.addEventListener('change',cancelMotion);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
function cullMotion(){for(const e of [...effects])if(!inView(e.target)){e.animation.cancel();e.node?.remove();effects.delete(e);stats.cancelled++;}}
window.addEventListener('scroll',cullMotion,{passive:true});window.addEventListener('resize',cullMotion);
window.handLab={snapshot:()=>structuredClone(state),stop,diagnostics:()=>structuredClone({...stats,mode,playing,clockPending:timer!==null,activeMotion:effects.size}),redraw:render};
document.body.dataset.view=mode;render();
