import { newGame, previewDistillation, distill, fillCask, bottleQuote, bottle, setPrice, advanceMonth, upkeep, tasting, monthLabel, ageLabel, serialize, restore } from './model.mjs';
import { PARAMETERS as P } from './parameters.mjs';

const SAVE_KEY = 'sukimastock.ambertime.v1';
const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => `£${value.toLocaleString('en-GB', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
const litres = value => `${value.toFixed(1)} L`;
const ui = { room: 'warehouse', cut: 50, type: 'bourbon', fillAmount: null, prices: {}, counts: {}, open: new Set() };
let state = null;
let memoryOnly = false;
let invalidSave = false;
let saveText = '操作ごとに自動保存';

function notify(text, isError = false) {
  const node = $('#message');
  node.textContent = text;
  node.hidden = false;
  node.classList.toggle('storage-notice', isError);
}
function storageWarning(text) {
  $('#storage-notice').textContent = text;
  $('#storage-notice').hidden = false;
}
function save(explicit = false) {
  if (!state || invalidSave) return;
  if (memoryOnly && !explicit) return;
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
    memoryOnly = false;
    $('#storage-notice').hidden = true;
    saveText = 'このブラウザに保存しました';
    if (explicit) notify('現在の帳面を保存しました。');
  } catch {
    memoryOnly = true;
    saveText = '現在は保存されていません';
    storageWarning('このブラウザに保存できません。今はこのページを開いている間だけ遊べます。「保存する」で再試行できます。');
  }
  $('#save-status').textContent = saveText;
}
function change(action, message) {
  if (!state || invalidSave) return false;
  try {
    state = action(state);
    save();
    render();
    if (message) notify(message);
    return true;
  } catch (error) {
    notify(error.message, true);
    return false;
  }
}
function liveProducts() { return state.products.filter(p => p.stock > 0).length; }
function cashNote() {
  if (state.cash < 0) return liveProducts() ? '資金が不足しています。販売中の在庫の売上で回復を待てます。' : '仕込みや瓶詰めに使える資金がありません。帳面を残すか、新しい蒸留所を始められます。';
  return state.cash <= 6 * upkeep(state) ? `売上なしで払える維持費は、あと${Math.floor(state.cash / upkeep(state))}か月分です。` : '';
}
function bottlingForm(sourceId = null) {
  const q = bottleQuote(state, sourceId);
  const key = sourceId === null ? 'newmake' : String(sourceId);
  const affordable = Math.max(0, Math.floor(state.cash / P.bottlingCost));
  const defaultCount = Math.max(1, Math.min(q.count, affordable));
  const count = ui.counts[key] ?? defaultCount;
  const reason = q.count < 1 ? '瓶詰めできる量がありません。' : liveProducts() >= P.maxProducts ? '販売棚が8商品でいっぱいです。在庫が売れてから瓶詰めできます。' : affordable < 1 ? `瓶詰め1本に${money(P.bottlingCost)}必要です。` : '';
  return `<form class="bottle-form" data-source="${key}">
    <div class="form-row"><label for="bottle-${key}">瓶詰め本数</label><input id="bottle-${key}" name="count" type="number" min="1" max="${q.count}" step="1" value="${escape(count)}" required ${reason ? 'disabled' : ''}><span class="subtle">/ ${q.count}本</span><button type="submit" ${reason ? 'disabled' : ''}>${sourceId === null ? '販売用に瓶詰めする' : '瓶詰めする'}</button></div>
    <p class="cost-note" data-bottle-cost="${key}">費用 ${money(count * P.bottlingCost)} · 1本 ${P.bottleLitres} L / ${money(P.bottlingCost)}${affordable < q.count && affordable > 0 ? ` · 今の資金で${affordable}本まで` : ''}</p>
    ${reason ? `<p class="reason">${reason}</p>` : ''}
  </form>`;
}
function warehouse() {
  let html = `<div class="room-heading"><h2>貯蔵庫</h2><span>${state.casks.length} / ${P.maxCasks} 樽</span></div><p class="intro">樽を覗き、香りの変化を確かめます。瓶詰めの時期は、自分で決めてください。</p>`;
  if (!state.spirit && !state.casks.length && !state.products.length) {
    html += `<section class="welcome"><h3>まずは、一仕込み。</h3><p>抽出の幅を決めて蒸留し、原酒を樽に詰めます。月を進めると、香りや口当たりが変わり、原酒の量は少しずつ減っていきます。</p><ol class="steps"><li>蒸留室で原酒を仕込む</li><li>樽に詰め、月を進めて試飲メモを読む</li><li>瓶詰めし、販売室で価格を決める</li></ol><p>早く手放して次を仕込むか、維持費を払いながらもう少し待つか。小さな蒸留所を、自分のペースで続けていきましょう。</p><button type="button" class="primary" data-go="distillery">蒸留室で仕込む →</button></section>`;
  } else if (!state.casks.length) {
    html += `<p class="empty">今、眠っている樽はありません。${state.spirit ? '蒸留室に、樽詰めを待つ原酒があります。' : '蒸留室で次の原酒を仕込めます。'}</p><p class="room-caption"><button type="button" data-go="distillery">蒸留室へ →</button></p>`;
  }
  html += state.casks.map(c => `<article class="card"><div class="card-title"><h3>樽 ${c.id} · ${escape(P.casks[c.type].short)}</h3><span class="amount">${litres(c.litres)}</span></div><p class="card-meta">熟成 ${ageLabel(c.age)} · ${monthLabel(c.filledMonth)} 樽詰め · 仕込み ${c.batchId}</p><p class="tasting">${escape(tasting(c))}</p>${bottlingForm(c.id)}<details data-detail="cask-${c.id}" ${ui.open.has(`cask-${c.id}`) ? 'open' : ''}><summary>この樽の記録</summary><p class="card-meta">${monthLabel(c.batchMonth)} 蒸留 / 抽出 ${Math.round(c.cut * 100)}% / 詰めた量 ${litres(c.initialLitres)}<br>天使の分け前・瓶詰めによる減少 ${litres(Math.max(0, c.initialLitres - c.litres))}</p><ul class="history">${c.history.slice().reverse().map(h => `<li><time>${monthLabel(h.month)}</time>${escape(h.text)}</li>`).join('')}</ul><p class="subtle">試飲メモは3か月ごとに記録します。今の味わいは上のメモで確認できます。</p></details></article>`).join('');
  if (state.casks.length) html += '<p class="room-caption">瓶詰めした分だけ樽の残量が減ります。残量が1本（0.7 L）未満になったら、端数を整理して樽を片づけます。樽は一仕込みごとに購入します。蒸発で瓶1本未満になった樽も片づけます。</p>';
  if (state.spirit) html += `<p class="room-caption">蒸留室に仕込み ${state.spirit.id}の原酒 ${litres(state.spirit.litres)}が残っています。 <button type="button" data-go="distillery">原酒を確認する</button></p>`;
  if (state.archive.length) html += `<details class="section-gap" data-detail="archive" ${ui.open.has('archive') ? 'open' : ''}><summary>手放した樽の記録</summary>${state.archive.slice(0, 8).map(c => `<p class="card-meta">樽 ${c.id} · ${escape(P.casks[c.type].short)} · ${ageLabel(c.age)}で${c.endReason ? escape(c.endReason) : '最後の瓶詰め'}<br>${escape(c.text)}</p>`).join('')}</details>`;
  return html;
}
function distillationPrediction() {
  const p = previewDistillation(ui.cut / 100);
  const tendency = ui.cut < 30 ? '量は控えめ。刺激を抑え、軽い香りを残す抽出です。' : ui.cut < 70 ? '穀物や果実の香りと、原酒らしい角を両方残す抽出です。' : '量は多め。厚い香りと強い刺激を残す抽出です。樽での変化を見守る余地があります。';
  return `<strong>${p.litres.toFixed(1)}</strong> L の原酒<p>${tendency}</p>`;
}
function distillery() {
  const reason = state.spirit ? '先に、手元の原酒を樽詰めするか瓶詰めしてください。' : state.lastDistillation === state.month ? '今月は仕込み済みです。次の月に、また蒸留できます。' : state.cash < P.distillationCost ? `蒸留には${money(P.distillationCost)}必要です。` : '';
  let html = `<div class="room-heading"><h2>蒸留室</h2><span>一月に一仕込み</span></div><p class="intro">抽出の幅が、原酒の量と個性を決めます。広く残した刺激も、時間と樽で変わっていきます。</p><section class="card"><div class="cut-label"><label for="cut">抽出範囲</label><output id="cut-output" for="cut">${ui.cut}%</output></div><input id="cut" name="cut" type="range" min="0" max="100" step="1" value="${ui.cut}"><div class="range-ends"><span>狭く、穏やかに</span><span>広く、個性を残す</span></div><div class="prediction" id="prediction">${distillationPrediction()}</div><button type="button" id="distill" class="primary" ${reason ? 'disabled' : ''}>蒸留する · ${money(P.distillationCost)}</button>${reason ? `<p class="reason">${reason}</p>` : '<p class="cost-note">蒸留はその月に1回。樽代・瓶詰め費用は別にかかります。</p>'}</section>`;
  if (state.spirit) {
    const s = state.spirit;
    const fillReason = state.casks.length >= P.maxCasks ? '4樽が埋まっています。先に樽を瓶詰めしてください。' : s.litres < 1 ? '樽詰めには1 L以上必要です。残りはニューメイクとして瓶詰めできます。' : state.cash < P.casks[ui.type].cost ? `選んだ樽の購入には${money(P.casks[ui.type].cost)}必要です。` : '';
    const amount = ui.fillAmount ?? s.litres;
    html += `<section class="card"><div class="card-title"><h3>手元の原酒 · 仕込み ${s.id}</h3><span class="amount">${litres(s.litres)}</span></div><p class="card-meta">${monthLabel(s.batchMonth)} 蒸留 · 抽出 ${Math.round(s.cut * 100)}%</p><p class="tasting">${escape(tasting(s))}</p><h3 class="section-gap">樽に詰める</h3><p class="split-note">同じ原酒を少しずつ分け、二つの樽で育てることもできます。原酒を手元で待たせても熟成は進みません。樽詰め後に瓶1本（0.7 L）に届かない端数が残る場合は整理します。</p><form id="fill-form"><fieldset class="cask-choice"><legend>使う樽</legend><label><input id="cask-bourbon" type="radio" name="type" value="bourbon" ${ui.type === 'bourbon' ? 'checked' : ''}>バーボン樽 · ${money(P.casks.bourbon.cost)}</label><p>口当たりが整いやすく、バニラや木の香りも早く重なります。</p><label><input id="cask-refill" type="radio" name="type" value="refill" ${ui.type === 'refill' ? 'checked' : ''}>リフィル樽 · ${money(P.casks.refill.cost)}</label><p>変化はゆっくり。原酒の香りを残しながら、木の影響も控えめに育ちます。</p></fieldset><div class="form-row"><label for="fill-amount">詰める量</label><input id="fill-amount" name="litres" type="number" min="1" max="${s.litres}" step="0.01" value="${escape(amount)}" required><span class="subtle">L</span><button type="submit" ${fillReason ? 'disabled' : ''}>樽詰めする · ${money(P.casks[ui.type].cost)}</button></div>${fillReason ? `<p class="reason">${fillReason}</p>` : `<p class="cost-note">貯蔵庫の空き ${P.maxCasks - state.casks.length}樽 · 月の維持費は1樽あたり${money(P.caskUpkeep)}増えます。</p>`}</form><h3 class="section-gap">ニューメイクを販売する</h3><p class="split-note">熟成を待たず、原酒のまま瓶詰めします。売上は、販売室で価格を決めて月を進めたあとに入ります。</p>${bottlingForm()}</section>`;
  }
  return html;
}
function sales() {
  let html = `<div class="room-heading"><h2>販売室</h2><span>${liveProducts()} / ${P.maxProducts} 商品</span></div><p class="intro">瓶詰めした味わいは、そのまま残ります。価格を上げると売れるペースは遅くなります。若い原酒にも、個性の強い香りにも、お客さんがいます。</p>`;
  if (state.lastMonth) html += `<section class="monthly-result"><h3>${monthLabel(state.lastMonth.month)}の販売</h3><p>${state.lastMonth.bottles}本販売 · 売上 ${money(state.lastMonth.revenue)} · 蒸留所の維持費 ${money(state.lastMonth.upkeep)}</p></section>`;
  if (!state.products.length) html += '<p class="empty">まだ商品はありません。原酒や樽を瓶詰めすると、ここに並びます。</p>';
  const products = [...state.products].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || b.id - a.id);
  html += products.map(p => `<article class="card ${p.stock ? '' : 'sold-out'}"><div class="card-title"><h3>商品 ${p.id} · ${p.type === 'newmake' ? 'ニューメイク' : escape(P.casks[p.type].short)}</h3><span class="subtle">${p.stock ? '販売中' : '売り切れ'}</span></div><p class="card-meta">仕込み ${escape(p.batchId)} · ${p.age === 0 ? '未熟成' : `${ageLabel(p.age)}で瓶詰め`} · ${monthLabel(p.bottledMonth)} 製品化</p><p class="tasting">${escape(tasting(p))}</p><p class="stock-line">在庫 <strong>${p.stock}本</strong> / ${p.originalStock}本 · 累計売上 ${money(p.revenue)}</p><p class="card-meta">直近の月：${p.lastSold}本 / ${money(p.lastRevenue)}</p>${p.stock ? `<form class="price-form" data-product="${p.id}"><div class="form-row"><label for="price-${p.id}">1本の価格 £</label><input id="price-${p.id}" name="price" type="number" min="${P.minPrice}" max="${P.maxPrice}" step="0.01" value="${escape(ui.prices[p.id] ?? p.price)}" required><button type="submit">価格を設定する</button></div><p class="cost-note">設定中 ${money(p.price)} / 本 · 次の月送りから、この価格で販売します。</p></form>` : ''}</article>`).join('');
  html += '<p class="room-caption">販売棚は在庫のある8商品まで。お客さんは棚全体で分け合うため、商品を増やすほど各商品の売れ方も変わります。</p>';
  return html;
}
function render() {
  if (!state || invalidSave) return;
  const focused = document.activeElement;
  const focusId = focused?.id;
  const selection = focused && 'selectionStart' in focused ? [focused.selectionStart, focused.selectionEnd] : null;
  $('#game').hidden = false;
  $('#recovery').hidden = true;
  $('#month').textContent = monthLabel(state.month);
  $('#cash').textContent = money(state.cash);
  $('#upkeep').textContent = `今の月次維持費 ${money(upkeep(state))} · 月を進めると熟成・蒸発・販売をまとめて処理します。${cashNote()}`;
  $('#upkeep').classList.toggle('low-cash', state.cash <= 6 * upkeep(state));
  document.querySelectorAll('[data-room]').forEach(button => {
    if (button.dataset.room === ui.room) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $('#room').innerHTML = ui.room === 'warehouse' ? warehouse() : ui.room === 'distillery' ? distillery() : sales();
  $('#journal').innerHTML = state.journal.length ? `<ul class="journal-list">${state.journal.slice(0, 30).map(j => `<li><time>${monthLabel(j.month)}</time><span>${escape(j.message)}</span></li>`).join('')}</ul>` : '<p class="card-meta">最初の仕込みから、ここに記録が残ります。</p>';
  $('#save-status').textContent = memoryOnly ? '現在は保存されていません' : saveText;
  $('#seed').value = state.seed;
  if (focusId) {
    const replacement = document.getElementById(focusId);
    if (replacement && !replacement.disabled) {
      replacement.focus({preventScroll: true});
      if (selection && typeof replacement.setSelectionRange === 'function' && replacement.type === 'text') replacement.setSelectionRange(...selection);
    }
  }
}
function go(room) {
  ui.room = room;
  render();
  $('#room').focus({preventScroll: true});
}
function restart(seed, recovery = false) {
  if (!window.confirm(recovery ? '読み取れない保存データを消し、新しい蒸留所を始めますか？' : '今の帳面を初期化し、新しい蒸留所を始めますか？')) return;
  try { state = newGame(seed); } catch (error) { notify(error.message, true); return; }
  invalidSave = false;
  ui.room = 'warehouse'; ui.cut = 50; ui.fillAmount = null; ui.prices = {}; ui.counts = {}; ui.open.clear();
  save(true); render();
  notify('新しい蒸留所を始めました。蒸留室で、最初の仕込みができます。');
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.room) go(button.dataset.room);
  if (button.dataset.go) go(button.dataset.go);
  if (button.id === 'advance' && change(s => advanceMonth(s), null)) {
    const m = state.lastMonth;
    if (m) notify(`${monthLabel(state.month)}。売上 ${money(m.revenue)}、維持費 ${money(m.upkeep)}。天使の分け前 ${litres(m.evaporated)}。${cashNote()}`);
  }
  if (button.id === 'distill') change(s => distill(s, ui.cut / 100), '蒸留が終わりました。下で樽を選ぶか、ニューメイクとして瓶詰めできます。');
  if (button.id === 'save') save(true);
  if (button.id === 'recover-restart') restart(20261014, true);
});
document.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'cut') {
    ui.cut = Number(input.value);
    $('#cut-output').textContent = `${ui.cut}%`;
    $('#prediction').innerHTML = distillationPrediction();
  }
  if (input.id === 'fill-amount') ui.fillAmount = input.value;
  if (input.closest('.price-form')) ui.prices[input.closest('form').dataset.product] = input.value;
  if (input.closest('.bottle-form')) {
    const key = input.closest('form').dataset.source;
    ui.counts[key] = input.value;
    const cost = Number(input.value) * P.bottlingCost;
    $(`[data-bottle-cost="${key}"]`).textContent = `費用 ${Number.isFinite(cost) ? money(cost) : '—'} · 1本 ${P.bottleLitres} L / ${money(P.bottlingCost)}`;
  }
});
document.addEventListener('change', event => {
  if (event.target.name === 'type') { ui.type = event.target.value; render(); }
});
document.addEventListener('toggle', event => {
  const id = event.target.dataset?.detail;
  if (id) { if (event.target.open) ui.open.add(id); else ui.open.delete(id); }
}, true);
document.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  if (form.id === 'restart-form') { restart(Number(data.get('seed'))); return; }
  if (!state || invalidSave) return;
  if (form.id === 'fill-form') {
    change(s => {
      const next = fillCask(s, data.get('type'), Number(data.get('litres')));
      ui.fillAmount = null;
      return next;
    }, '樽詰めしました。貯蔵庫で試飲メモを確かめられます。');
  }
  if (form.classList.contains('bottle-form')) {
    const key = form.dataset.source;
    change(s => {
      const next = bottle(s, key === 'newmake' ? null : Number(key), Number(data.get('count')));
      delete ui.counts[key];
      if (key === 'newmake') ui.fillAmount = null;
      return next;
    }, '瓶詰めしました。販売室で価格を決め、月を進めると販売が始まります。');
  }
  if (form.classList.contains('price-form')) change(s => {
    const next = setPrice(s, Number(form.dataset.product), Number(data.get('price')));
    delete ui.prices[form.dataset.product];
    return next;
  }, '価格を設定しました。次の月から、この価格で販売します。');
});

try {
  const text = localStorage.getItem(SAVE_KEY);
  if (text === null) state = newGame();
  else {
    try { state = restore(text); saveText = '保存した帳面から再開しました'; }
    catch (error) {
      invalidSave = true;
      $('#recovery').hidden = false;
      $('#recovery').innerHTML = `<section class="card"><h2>保存した帳面を開けません</h2><p class="intro">${escape(error.message)}</p><p>元の保存データはそのまま残しています。対応する版で開くか、初期化して始めてください。</p><div class="recovery-actions"><button type="button" id="recover-restart">保存を初期化して始める</button></div></section>`;
    }
  }
} catch {
  memoryOnly = true;
  state = newGame();
  storageWarning('ブラウザの保存領域にアクセスできません。今はこのページを開いている間だけ遊べます。「保存する」で再試行できます。');
}
render();
