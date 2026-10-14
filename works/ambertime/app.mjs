import { previewDistillation, distill, fillCask, bottleQuote, bottle, setPrice, advanceMonth, upkeep, tasting, monthLabel, ageLabel, serialize, restore } from './model.mjs';
import { PARAMETERS as P } from './parameters.mjs';
import { createOpening } from './opening.mjs';
import { barrel, glass, bottleArt, stillArt } from './art.mjs';

const SAVE_KEY = 'sukimastock.ambertime.v1';
const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => `£${value.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
const litres = value => `${value.toFixed(1)} L`;
const preview = new URLSearchParams(location.search).get('preview') === '1';
const ui = {room:'warehouse',selected:null,cut:65,type:'bourbon',fillAmount:null,tray:null,tastes:new Map(),open:new Set(),delta:null,newProduct:null};
let state=null, memoryOnly=preview, invalidSave=false,saveText=preview?'プレビュー · 保存しません':'操作ごとに自動保存';
let pulseTimer, readUnknown=false;

function notify(text,isError=false) {
  const node=$('#message'); node.textContent=text; node.hidden=false;
  node.classList.toggle('storage-notice',isError);
}
function storageWarning(text) {$('#storage-notice').textContent=text;$('#storage-notice').hidden=false;}
function save(explicit=false) {
  if (!state||invalidSave||preview) return;
  if(memoryOnly&&!explicit) return;
  try {
    if(readUnknown) {
      const original=localStorage.getItem(SAVE_KEY);
      if(original!==null&&!window.confirm('保存済みの帳面が見つかりました。今の進行で置き換えますか？')) {
        storageWarning('元の保存は残しています。今の進行はまだ保存されていません。');return;
      }
      readUnknown=false;
    }
    localStorage.setItem(SAVE_KEY,serialize(state));memoryOnly=false;
    $('#storage-notice').hidden=true;saveText='このブラウザに保存しました';
    if(explicit) notify('現在の帳面を保存しました。');
  } catch {
    memoryOnly=true;saveText='現在は保存されていません';
    storageWarning('保存できません。今はこのページを開いている間だけ遊べます。「保存する」で再試行できます。');
  }
  $('#save-status').textContent=saveText;
}
function change(action, after) {
  if(!state||invalidSave)return false;
  try {state=action(state);if(after)after();save();render();return true;}
  catch(error){notify(error.message,true);return false;}
}
function pulse(name='month') {
  document.body.dataset.motion=name;clearTimeout(pulseTimer);
  pulseTimer=setTimeout(()=>delete document.body.dataset.motion,320);
}
const liveProducts=()=>state.products.filter(p=>p.stock>0).length;
function selectedCask() {return state.casks.find(c=>c.id===ui.selected)||state.casks[0];}
function lines(c) {return tasting(c).split('。').filter(Boolean);}
function bottleLimits(source) {
  const q=bottleQuote(state,source),affordable=Math.max(0,Math.floor(state.cash/P.bottlingCost));
  const max=Math.min(q.count,affordable);
  const reason=liveProducts()>=P.maxProducts?'販売棚がいっぱいです。':!q.count?'瓶1本に届く量がありません。':!max?`瓶1本に${money(P.bottlingCost)}必要です。`:'';
  return {q,max,reason};
}
function bottleTray() {
  const {source,count}=ui.tray,{q,max,reason}=bottleLimits(source);
  const c=source===null?state.spirit:state.casks.find(c=>c.id===source);
  return `<section class="bottle-tray" aria-label="瓶詰めの確認"><div class="tray-objects"><div class="tray-barrel">${source===null?glass(0):barrel(c.type)}</div><span aria-hidden="true">→</span><div class="tray-bottle">${bottleArt(c.wood)}</div></div><h3>瓶詰めする量</h3><div class="quantity-choices"><button id="bottle-all" type="button" data-count="${max}" aria-pressed="${count===max}">全部${max<q.count?'（資金の範囲）':''}</button><button id="bottle-half" type="button" data-count="${Math.max(1,Math.floor(max/2))}" aria-pressed="${count===Math.max(1,Math.floor(max/2))}">半分</button></div><p id="bottle-quote" class="quote"><strong>${count}本</strong> · 費用 ${money(count*P.bottlingCost)}<span>瓶詰め後 ${litres(Math.max(0,c.litres-count*P.bottleLitres))}</span></p><details data-detail="bottle-precise" ${ui.open.has('bottle-precise')?'open':''}><summary>本数を指定する</summary><label for="bottle-count">本数</label><input id="bottle-count" type="number" min="1" max="${max}" step="1" value="${count}"></details>${reason?`<p class="reason">${reason}</p>`:''}<div class="decision"><button id="confirm-bottle" type="button" class="primary" ${reason?'disabled':''}>${count}本を瓶詰め</button><button id="cancel-bottle" type="button">戻る</button></div></section>`;
}
function warehouse() {
  const c=selectedCask();if(c)ui.selected=c.id;
  let html=`<div class="room-heading"><h2>貯蔵庫</h2><span>${state.casks.length} / ${P.maxCasks} 樽</span></div><div class="cellar"><div class="cellar-beam" aria-hidden="true"></div><div class="barrel-shelf">`;
  for(let i=0;i<P.maxCasks;i++) {
    const b=state.casks[i],d=ui.delta?.casks.find(d=>d.id===b?.id);
    html+=b?`<button id="barrel-${b.id}" type="button" class="barrel-object ${b.id===ui.selected?'selected':''}" data-cask="${b.id}" aria-pressed="${b.id===ui.selected}" aria-label="樽${b.id} ${P.casks[b.type].short} 熟成${ageLabel(b.age)} 残量${litres(b.litres)}"><span class="barrel-drawing">${barrel(b.type)}</span><span class="barrel-tag">樽 ${b.id}<small>${P.casks[b.type].short}</small></span><span class="barrel-age">${ageLabel(b.age)}</span><span class="barrel-volume">${litres(b.litres)}${d?`<small>−${d.lost.toFixed(2)} L</small>`:''}</span></button>`:`<button id="empty-${i}" type="button" class="empty-slot" data-go="distillery" aria-label="空いた樽置き場。蒸留室で仕込む"><span class="slot-mark" aria-hidden="true"></span><span>空き</span></button>`;
  }
  html+='</div></div>';
  if(ui.tray&&ui.tray.source!==null)return html+bottleTray();
  if(c) {
    const sample=ui.tastes.get(c.id),delta=ui.delta?.casks.find(d=>d.id===c.id);
    html+=`<section class="cask-detail" aria-label="選んだ樽"><div class="detail-top"><div><h3>樽 ${c.id} <span>${P.casks[c.type].short}</span></h3><p>${monthLabel(c.filledMonth)} 樽詰め · 抽出 ${Math.round(c.cut*100)}%</p></div><div class="glass-drawing">${glass(c.wood,c.roughness)}</div></div><div class="taste-area">${sample?`<div class="taste-current"><span class="label">${monthLabel(sample.current.month)} の試飲</span>${sample.current.text.map(t=>`<p>${escape(t)}</p>`).join('')}</div>${sample.previous?`<div class="taste-previous"><span class="label">前の試飲 · ${monthLabel(sample.previous.month)}</span><p>${escape(sample.previous.text.join('。'))}。</p><p class="taste-comparison">${escape(sample.comparison)}</p></div>`:''}${sample.current.month<state.month?'<p class="taste-hint">ひと月が過ぎました。今の味も確かめてみますか。</p>':''}`:'<p class="taste-hint">グラスに少し注いで、今の味を確かめる。</p>'}${delta?`<p class="change-note">${escape(delta.note)}</p>`:''}</div><div class="decision"><button id="taste" type="button" class="taste-button">試飲する</button><button id="wait" type="button">待つ</button><button id="open-bottle" type="button" data-bottle="${c.id}">瓶詰めへ</button></div><details data-detail="cask-${c.id}" ${ui.open.has(`cask-${c.id}`)?'open':''}><summary>樽の記録</summary><p class="record-meta">${monthLabel(c.batchMonth)} 蒸留 · 仕込み ${c.batchId}<br>樽詰め ${litres(c.initialLitres)} → 現在 ${litres(c.litres)}</p><ul class="history">${c.history.slice().reverse().map(h=>`<li><time>${monthLabel(h.month)}</time><span>${escape(h.text)}</span></li>`).join('')}</ul><p class="subtle">残量は蒸発と瓶詰めで減ります。記録は3か月ごと。</p></details></section>`;
  } else html+=`<section class="quiet-empty"><p>次は、どんな原酒を育てよう。</p><button data-go="distillery" type="button">蒸留室で仕込む</button>${state.products.some(p=>p.stock)?'<button data-go="sales" type="button">棚の瓶を見る</button>':''}</section>`;
  if(state.spirit)html+=`<p class="room-note">樽詰めを待つ原酒 ${litres(state.spirit.litres)} <button type="button" data-go="distillery">蒸留室へ</button></p>`;
  if(state.archive.length)html+=`<details data-detail="archive" ${ui.open.has('archive')?'open':''}><summary>手放した樽</summary>${state.archive.slice(0,8).map(b=>`<p class="record-meta">樽 ${b.id} · ${P.casks[b.type].short} · ${ageLabel(b.age)}<br>${escape(b.text)}</p>`).join('')}</details>`;
  return html;
}
function distillationPrediction() {
  const p=previewDistillation(ui.cut/100);
  return `<strong>${litres(p.litres)}</strong><span>${ui.cut<30?'軽い香り · 穏やかな原酒':ui.cut<70?'果実と穀物 · 少し角のある原酒':'厚い香り · 強い刺激を残す原酒'}</span>`;
}
function distillery() {
  let html='<div class="room-heading"><h2>蒸留室</h2><span>ひと月に一仕込み</span></div>';
  if(!state.spirit) {
    const reason=state.lastDistillation===state.month?'今月の仕込みは終わりました。':state.cash<P.distillationCost?`仕込みには${money(P.distillationCost)}必要です。`:'';
    html+=`<section class="distill-workbench"><div id="still-drawing" class="still-drawing">${stillArt(ui.cut/100,previewDistillation(ui.cut/100).litres)}</div><div class="cut-control"><div class="cut-label"><label for="cut">抽出範囲</label><output id="cut-output" for="cut">${ui.cut}%</output></div><div class="cut-strip" aria-hidden="true"><span id="cut-interval" style="left:${40-ui.cut*.32}%;width:${20+ui.cut*.64}%"></span></div><input id="cut" name="cut" type="range" min="0" max="100" step="1" value="${ui.cut}"><div class="range-ends"><span>狭く、穏やかに</span><span>広く、個性を残す</span></div><div id="prediction" class="prediction">${distillationPrediction()}</div><button id="distill" type="button" class="primary" ${reason?'disabled':''}>仕込む · ${money(P.distillationCost)}</button>${reason?`<p class="reason">${reason}</p>`:'<p class="subtle">広く抽出すると、量と香り、刺激が増えます。</p>'}</div></section>`;
  } else {
    const s=state.spirit,fillReason=state.casks.length>=P.maxCasks?'貯蔵庫が4樽で埋まっています。':s.litres<1?'残りはニューメイクとして瓶詰めできます。':state.cash<P.casks[ui.type].cost?'選んだ樽を買う資金が足りません。':'';
    html+=`<section class="new-spirit"><div class="spirit-summary"><div class="glass-drawing">${glass(0)}</div><div><h3>仕込み ${s.id}</h3><strong>${litres(s.litres)}</strong><p>${escape(lines(s)[1])} · 抽出 ${Math.round(s.cut*100)}%</p></div></div>`;
    if(ui.tray&&ui.tray.source===null)html+=bottleTray();
    else html+=`<h3 class="choose-title">どの樽で育てる？</h3><div class="cask-choices">${['bourbon','refill'].map(type=>`<button id="choose-${type}" type="button" data-type="${type}" aria-pressed="${ui.type===type}" class="cask-choice ${ui.type===type?'selected':''}"><span>${barrel(type)}</span><strong>${P.casks[type].short}</strong><span>${money(P.casks[type].cost)}</span><small>${type==='bourbon'?'木の香りが早く重なる':'ゆっくり、原酒の香りを残す'}</small></button>`).join('')}</div><form id="fill-form"><p class="fill-preview" id="fill-preview">${litres(Number(ui.fillAmount??s.litres))}を樽詰め · ${money(P.casks[ui.type].cost)}</p><details data-detail="split" ${ui.open.has('split')?'open':''}><summary>原酒を分けて詰める</summary><button id="fill-half" type="button">半分にする</button><button id="fill-all" type="button">全部にする</button><div class="precise-row"><label for="fill-amount">詰める量 L</label><input id="fill-amount" type="number" name="litres" min="1" max="${s.litres}" step="0.01" value="${ui.fillAmount??s.litres}"></div></details><button id="fill" type="submit" class="primary" ${fillReason?'disabled':''}>この樽に詰める</button>${fillReason?`<p class="reason">${fillReason}</p>`:`<p class="subtle">空き ${P.maxCasks-state.casks.length} 樽 · 月の維持費 +${money(P.caskUpkeep)}</p>`}</form><div class="newmake-choice"><button id="newmake" data-bottle="newmake" type="button">ニューメイクで瓶詰め</button><span>熟成を待たず、原酒のまま販売する。</span></div>`;
    html+='</section>';
  }
  return html;
}
function sales() {
  let html='<div class="room-heading"><h2>販売室</h2><span>小さな商品棚</span></div>';
  if(state.lastMonth?.bottles)html+=`<p class="sales-receipt">${monthLabel(state.lastMonth.month)} · ${state.lastMonth.bottles}本が売れました <strong>+${money(state.lastMonth.revenue)}</strong></p>`;
  const stocked=state.products.filter(p=>p.stock>0),recent=state.products.filter(p=>!p.stock).sort((a,b)=>b.id-a.id);
  if(!state.products.length)html+='<div class="quiet-empty empty-shelf"><span class="shelf-line" aria-hidden="true"></span><p>瓶詰めしたウイスキーが、ここに並びます。</p><button data-go="warehouse" type="button">樽を見る</button></div>';
  for(const p of stocked) {
    const prices=p.age===0?[12,16,22]:[21,30,48],custom=!prices.includes(p.price);
    html+=`<section id="product-${p.id}" class="product ${p.id===ui.newProduct?'fresh-bottles':''}" aria-label="商品${p.id}"><div class="product-heading"><h3>${p.type==='newmake'?'ニューメイク':P.casks[p.type].short}<small>仕込み ${p.batchId} · ${p.age?`${ageLabel(p.age)}で瓶詰め`:'未熟成'}</small></h3><strong>${p.stock}本</strong></div><div class="bottle-shelf">${ui.delta?.sales.some(s=>s.id===p.id&&s.sold>0)?`<span class="departing-bottle" aria-hidden="true">${bottleArt(p.wood)}</span>`:''}${Array.from({length:Math.min(6,p.stock)},()=>`<span class="shelf-bottle">${bottleArt(p.wood)}</span>`).join('')}</div><div class="price-label"><span>1本 ${money(p.price)}</span>${custom?'<span class="subtle">指定価格</span>':''}${p.lastSold?`<span class="sold-note">先月 −${p.lastSold}本 · +${money(p.lastRevenue)}</span>`:''}</div><div class="price-choices">${prices.map((price,i)=>`<button id="price-${p.id}-${i}" type="button" data-product="${p.id}" data-price="${price}" aria-pressed="${p.price===price}">${['低め','標準','高め'][i]}<strong>${money(price)}</strong></button>`).join('')}</div><p class="subtle">価格を上げると、売れるペースは遅くなります。</p><details data-detail="price-${p.id}" ${ui.open.has(`price-${p.id}`)?'open':''}><summary>価格を指定・販売記録</summary><form class="price-form" data-product="${p.id}"><label for="custom-price-${p.id}">1本の価格 £</label><input id="custom-price-${p.id}" name="price" type="number" min="${P.minPrice}" max="${P.maxPrice}" step="0.01" value="${p.price}" required><button type="submit">設定する</button></form><p>${escape(lines(p).join('。'))}。</p><p class="record-meta">${monthLabel(p.bottledMonth)} 瓶詰め · 累計 ${p.sold}本 / ${money(p.revenue)}</p></details></section>`;
  }
  if(recent.length)html+=`<details data-detail="sold-out" ${ui.open.has('sold-out')?'open':''}><summary>売り切れた瓶 · ${recent.length}商品</summary>${recent.slice(0,8).map(p=>`<p class="record-meta">商品 ${p.id} · ${p.type==='newmake'?'ニューメイク':P.casks[p.type].short}<br>${p.sold}本を販売 · ${money(p.revenue)}</p>`).join('')}</details>`;
  if(!stocked.length&&recent.length)html+='<div class="quiet-empty"><p>棚の瓶は、すべて売れました。</p><button data-go="warehouse" type="button">次の樽を見る</button></div>';
  return html;
}
function render() {
  if(!state||invalidSave)return;
  const focusId=document.activeElement?.id;
  $('#game').hidden=false;$('#recovery').hidden=true;
  $('#month').textContent=monthLabel(state.month);$('#cash').textContent=money(state.cash);
  const fee=upkeep(state),tight=state.cash<=fee*6;
  $('#upkeep').textContent=`維持費 ${money(fee)} / 月${tight?state.cash<0?' · 資金不足':` · 売上なしであと${Math.floor(state.cash/fee)}か月`:''}`;
  $('#upkeep').classList.toggle('low-cash',tight);
  document.querySelectorAll('[data-room]').forEach(button=>{if(button.dataset.room===ui.room)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  $('#room').innerHTML=ui.room==='warehouse'?warehouse():ui.room==='distillery'?distillery():sales();
  $('#journal').innerHTML=`<ul class="journal-list">${state.journal.slice(0,30).map(j=>`<li><time>${monthLabel(j.month)}</time><span>${escape(j.message)}</span></li>`).join('')}</ul>`;
  $('#save-status').textContent=preview?'プレビュー · 保存しません':memoryOnly?'現在は保存されていません':saveText;
  $('#seed').value=state.seed;
  const replacement=focusId?document.getElementById(focusId):null;
  if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});
}
function go(room) {ui.room=room;ui.tray=null;render();$('#room').focus({preventScroll:true});}
function month() {
  const before=state;
  if(change(s=>advanceMonth(s),()=>{
    ui.delta={sales:state.lastMonth.sales,casks:state.casks.map(c=>{const old=before.casks.find(b=>b.id===c.id);return {id:c.id,lost:old?old.litres-c.litres:0,note:old?lines(old).join()!==lines(c).join()?'味わいの印象が変わりました。試飲してみる。':`熟成 ${ageLabel(old.age)} → ${ageLabel(c.age)} · 残量 −${(old.litres-c.litres).toFixed(2)} L`:''};})};
    ui.tray=null;
  })) {
    const m=state.lastMonth;
    $('#message').hidden=true;
    $('#month-feedback').textContent=m.bottles?`${m.bottles}本販売 +${money(m.revenue)} · 維持費 −${money(m.upkeep)}`:state.casks.length?`樽でひと月。天使の分け前 ${m.evaporated.toFixed(2)} L`:`ひと月が過ぎました · 維持費 −${money(m.upkeep)}`;
    pulse('month');
  }
}
function sample() {
  const c=selectedCask();if(!c)return;
  const previous=ui.tastes.get(c.id)?.current,current={month:state.month,text:lines(c),roughness:c.roughness,wood:c.wood,character:c.character};
  const comparison=!previous?'':previous.month===current.month?'同じ月の試飲です。':previous.text.join()!==current.text.join()?'前の試飲から、味わいの印象が変わりました。':c.roughness<previous.roughness?'印象は近いまま。口当たりが少しずつ落ち着いています。':'前の試飲と、近い印象です。';
  // Tasting twice in the same month must not erase the earlier useful comparison.
  const existing=ui.tastes.get(c.id);
  if(!existing||existing.current.month!==state.month)ui.tastes.set(c.id,{current,previous,comparison});
  render();pulse('taste');
}
function openBottle(source) {
  try {const limits=bottleLimits(source);ui.tray={source,count:limits.max};render();$('#confirm-bottle')?.focus({preventScroll:true});}
  catch(error){notify(error.message,true);}
}
function restart(seed,recovery=false) {
  if(!window.confirm(recovery?'読み取れない保存データを消し、新しい蒸留所を始めますか？':'今の帳面を初期化し、新しい蒸留所を始めますか？'))return;
  try{state=createOpening(seed);}catch(error){notify(error.message,true);return;}
  invalidSave=false;Object.assign(ui,{room:'warehouse',selected:null,cut:65,type:'bourbon',fillAmount:null,tray:null,delta:null,newProduct:null});ui.tastes.clear();ui.open.clear();save(true);render();$('#month-feedback').textContent='樽を選んで、試飲してみる。';notify('新しい蒸留所を始めました。');
}
document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.room)go(b.dataset.room);
  if(b.dataset.go)go(b.dataset.go);
  if(b.dataset.cask){ui.selected=Number(b.dataset.cask);ui.tray=null;render();}
  if(b.id==='advance'||b.id==='wait')month();
  if(b.id==='taste')sample();
  if(b.id==='distill')change(s=>distill(s,ui.cut/100),()=>{ui.fillAmount=null;ui.delta=null;});
  if(b.dataset.type){ui.type=b.dataset.type;render();}
  if(b.dataset.bottle)openBottle(b.dataset.bottle==='newmake'?null:Number(b.dataset.bottle));
  if(b.dataset.count){ui.tray.count=Number(b.dataset.count);render();}
  if(b.id==='cancel-bottle'){ui.tray=null;render();$('#open-bottle')?.focus({preventScroll:true});}
  if(b.id==='confirm-bottle'){
    const {source,count}=ui.tray;
    if(change(s=>bottle(s,source,count),()=>{ui.tray=null;ui.newProduct=state.products.at(-1).id;ui.room='sales';ui.delta=null;ui.fillAmount=null;})){
      notify(`${count}本が販売棚に並びました。`);pulse('bottle');$(`#price-${ui.newProduct}-1`)?.focus({preventScroll:true});
    }
  }
  if(b.dataset.price)change(s=>setPrice(s,Number(b.dataset.product),Number(b.dataset.price)));
  if(b.id==='fill-half'||b.id==='fill-all'){ui.fillAmount=b.id==='fill-half'?Math.max(1,Math.round(state.spirit.litres*50)/100):state.spirit.litres;render();}
  if(b.id==='save')save(true);
  if(b.id==='recover-restart')restart(20261014,true);
});
document.addEventListener('input',event=>{
  const input=event.target;
  if(input.id==='cut'){
    ui.cut=Number(input.value);$('#cut-output').textContent=`${ui.cut}%`;$('#prediction').innerHTML=distillationPrediction();
    $('#still-drawing').innerHTML=stillArt(ui.cut/100,previewDistillation(ui.cut/100).litres);
    $('#cut-interval').style.left=`${40-ui.cut*.32}%`;$('#cut-interval').style.width=`${20+ui.cut*.64}%`;
  }
  if(input.id==='fill-amount'){ui.fillAmount=input.value;const n=Number(input.value);$('#fill-preview').textContent=`${Number.isFinite(n)?litres(n):'—'}を樽詰め · ${money(P.casks[ui.type].cost)}`;}
  if(input.id==='bottle-count'){
    const count=Number(input.value),max=bottleLimits(ui.tray.source).max;ui.tray.count=count;
    const valid=Number.isInteger(count)&&count>=1&&count<=max&&!bottleLimits(ui.tray.source).reason;
    $('#confirm-bottle').disabled=!valid;$('#confirm-bottle').textContent=valid?`${count}本を瓶詰め`:'本数を確認';
    const source=ui.tray.source===null?state.spirit:state.casks.find(c=>c.id===ui.tray.source);
    $('#bottle-quote').innerHTML=valid?`<strong>${count}本</strong> · 費用 ${money(count*P.bottlingCost)}<span>瓶詰め後 ${litres(Math.max(0,source.litres-count*P.bottleLitres))}</span>`:'1本以上、資金の範囲で指定してください。';
    document.querySelectorAll('[data-count]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.count)===count));
  }
});
document.addEventListener('toggle',event=>{const id=event.target.dataset?.detail;if(id){if(event.target.open)ui.open.add(id);else ui.open.delete(id);}},true);
document.addEventListener('submit',event=>{
  const form=event.target;event.preventDefault();if(!form.reportValidity())return;
  const data=new FormData(form);
  if(form.id==='restart-form'){restart(Number(data.get('seed')));return;}
  if(!state||invalidSave)return;
  if(form.id==='fill-form'){
    const amount=ui.fillAmount===null?state.spirit.litres:Number(ui.fillAmount);
    if(change(s=>fillCask(s,ui.type,amount),()=>{ui.selected=state.casks.at(-1).id;ui.fillAmount=null;ui.room='warehouse';ui.delta=null;})){
      notify('樽に詰めました。ひと月、待ってみましょう。');pulse('fill');$(`#barrel-${ui.selected}`)?.focus({preventScroll:true});
    }
  }
  if(form.classList.contains('price-form'))change(s=>setPrice(s,Number(form.dataset.product),Number(data.get('price'))));
});
if(preview)state=createOpening();
else try {
  const text=localStorage.getItem(SAVE_KEY);
  if(text===null)state=createOpening();
  else try{state=restore(text);saveText='保存した帳面から再開しました';}
  catch(error){invalidSave=true;$('#recovery').hidden=false;$('#recovery').innerHTML=`<section class="recovery-card"><h2>保存した帳面を開けません</h2><p>${escape(error.message)}</p><p>元の保存データは残しています。対応する版で開くか、初期化して始めてください。</p><button id="recover-restart" type="button">保存を初期化して始める</button></section>`;}
} catch {
  memoryOnly=true;readUnknown=true;state=createOpening();storageWarning('保存領域にアクセスできません。今はこのページを開いている間だけ遊べます。「保存する」で再試行できます。');
}
render();
if(state&&!invalidSave)$('#month-feedback').textContent=state.casks.length?'樽を選んで、試飲してみる。':state.spirit?'蒸留室で、原酒を樽に詰める。':state.products.some(p=>p.stock>0)?'販売室で価格を決め、ひと月待つ。':'蒸留室で、最初の原酒を仕込む。';
