import * as M from './model.mjs';
import {SCENARIOS,playScenario} from './scenarios.mjs';
import {codeaBottle} from '../../../codea-object-art.mjs';
import {symbolMarkup} from '../../../pixel-symbols.mjs';

const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'£'+Number(n??0).toFixed(2),percent=n=>Math.round(100*n)+'%',shopName=id=>M.SHOPS.find(x=>x.id===id)?.name??id;
const sampleName=id=>M.SAMPLES.find(x=>x.id===id)?.name??id,tierName={low:'低め',standard:'標準',high:'高め'};
const shape=p=>({sweet:'fancy',smoke:'tall',deep:'square',balanced:'standard'}[p.sample]??'standard');
const art=p=>codeaBottle(shape(p),{label:p.sample==='smoke'?'dark':'cream',priceTier:p.tier});
let session=M.create(),state=session.sales,portion='1',view='allocation',resultShop=M.SHOPS[0].id,lastFocus=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),motions=new Set();
const current=()=>state.products.find(p=>p.id===state.selectedId),staged=()=>Object.values(M.allocation(session)).reduce((a,b)=>a+b,0);
const announce=text=>{$('status').textContent=text;},clearError=()=>{$('error').hidden=true;$('error').textContent='';};
function perform(action,message){
  try{const next=M.transact(session,action);session=next;state=next.sales;clearError();render();if(message)announce(message);return true;}
  catch(error){$('error').textContent=error.message;$('error').hidden=false;return false;}
}
function cancelMotions(){for(const animation of motions)animation.cancel();motions.clear();}
function placed(shopId){
  if(document.hidden||reduced.matches)return;
  const element=document.querySelector(`[data-place="${shopId}"]`);if(!element)return;
  const animation=element.animate([{transform:'translateY(-4px)',borderColor:'#d9b467'},{transform:'translateY(0)',borderColor:'#526663'}],{duration:240,iterations:1});motions.add(animation);animation.onfinish=animation.oncancel=()=>motions.delete(animation);
}
function reactionText(person){return person?.reaction?.text??person?.text??'';}
function quoteSentence(person,tone='representative'){
  const sentences=reactionText(person).split('。').map(s=>s.trim()).filter(Boolean);
  const sentence=tone==='negative'?sentences.find(s=>/強すぎ|ほしい|合いません/.test(s)):tone==='positive'&&person?.maturity>=.08?sentences.find(s=>/熟成を待った価値/.test(s)):null;
  return (sentence??sentences[0]??'')+(sentences.length?'。':'');
}
const firstSentence=person=>quoteSentence(person);
function allEvaluations(summary){return summary?.byShop?.flatMap(row=>Array.isArray(row.evaluations)?row.evaluations:[])??[];}
function renderHand(){
  const p=current();$('month').textContent=`${state.month}か月`;$('price').textContent=p?`${sampleName(p.sample)}・${p.years}年 ${money(p.price)}`:'';
  $('hand').innerHTML=state.products.map(item=>`<button type="button" class="hand-bottle" data-select="${item.id}" aria-pressed="${item.id===state.selectedId}" aria-label="${esc(sampleName(item.sample))}、${item.years}年、手元${M.freeHand(session,item.id)}本、${item.createdMonth}か月目の瓶">${art(item)}<strong>${esc(sampleName(item.sample))}・${item.years}年</strong><span class="count">${M.freeHand(session,item.id)}本</span><span>${item.createdMonth}か月目の瓶</span></button>`).join('');
  for(const button of $('hand').querySelectorAll('[data-select]'))button.addEventListener('click',()=>{if(perform({type:'select',productId:Number(button.dataset.select)},'瓶を選びました。')){$('next-editor').hidden=true;}});
}
function renderShops(){
  const a=M.allocation(session),canPlace=M.freeHand(session,state.selectedId)>0;
  $('shops').innerHTML=M.SHOPS.map(shop=>{
    const stocks=state.products.filter(p=>(p.shops?.[shop.id]??0)>0);
    return `<div class="shop-row"><button type="button" class="place-target" data-place="${shop.id}" ${canPlace?'':'disabled'} aria-label="${esc(shop.name)}に${portion==='all'?'残り全部':portion+'本'}置く">${symbolMarkup('store')}<span>${esc(shop.name)}<span class="place-hint">ここに置く${a[shop.id]?` · 仮置き${a[shop.id]}本`:''}</span></span></button><div class="shop-stock" aria-label="${esc(shop.name)}の店頭在庫">${stocks.length?stocks.map(p=>`<button type="button" class="stock-bottle" data-recall-product="${p.id}" data-recall-shop="${shop.id}" aria-label="${esc(shop.name)}から${esc(sampleName(p.sample))}${p.years}年を${p.shops[shop.id]}本回収">${art(p)}<span>${p.shops[shop.id]}本</span></button>`).join(''):'<span class="empty-stock">店頭 0本</span>'}</div></div>`;
  }).join('');
  for(const button of $('shops').querySelectorAll('[data-place]'))button.addEventListener('click',()=>{const shopId=button.dataset.place;resultShop=shopId;if(perform({type:'place',shopId,portion},`${shopName(shopId)}へ仮置きしました。`))placed(shopId);});
  for(const button of $('shops').querySelectorAll('[data-recall-product]'))button.addEventListener('click',()=>perform({type:'recall',productId:Number(button.dataset.recallProduct),shopId:button.dataset.recallShop},'店頭の瓶を手元に回収しました。'));
  $('confirm').disabled=staged()===0;$('undo').disabled=!(state.draft?.history?.length);$('cancel').disabled=staged()===0;
}
function buyerFor(row){
  if(row?.representative&&typeof row.representative==='object')return row.representative;
  const people=Array.isArray(row?.evaluations)?row.evaluations:[];
  return [...people].sort((a,b)=>a.score-b.score||a.id-b.id)[Math.floor(people.length/2)];
}
function renderResult(){
  const p=current(),summary=M.productSummary(session,p.id);
  $('results').innerHTML=summary.byShop.map(row=>`<button type="button" class="result-row" data-result-shop="${row.shopId}" aria-pressed="${row.shopId===resultShop}"><span>${esc(shopName(row.shopId))}<small>累計 ${row.sold}本売れた · 残り${row.remaining}本</small></span><span>${money(row.revenue)}</span></button>`).join('');
  for(const button of $('results').querySelectorAll('[data-result-shop]'))button.addEventListener('click',()=>{resultShop=button.dataset.resultShop;renderResult();renderMemory();});
  const row=summary.byShop.find(r=>r.shopId===resultShop),people=row?.evaluations??[],n=people.length;
  const positive=row?.favorable??people.find(x=>['strong','like'].includes(x.verdict)),negative=row?.unfavorable??people.find(x=>['miss','neutral'].includes(x.verdict));
  const examples=[positive?`<p class="quote"><span>好意的な客</span>「${esc(quoteSentence(positive,'positive'))}」</p>`:'',negative?`<p class="quote"><span>合わなかった客</span>「${esc(quoteSentence(negative,'negative'))}」</p>`:''].join('');
  $('customer').innerHTML=n?`<p class="speaker">${esc(shopName(resultShop))}の購入者 · ${n}件から</p>${examples||`<p class="quote">「${esc(firstSentence(buyerFor(row)))}」</p>`}`:`<p class="speaker">${esc(shopName(resultShop))}の販売状況</p><p class="store-response">${row?.remaining?'店頭で次のお客を待っています。':'まだ購入者の評価はありません。'}</p>`;
}
function renderDiagnostics(){
  const p=current(),summary=M.productSummary(session,p.id),people=allEvaluations(summary),n=people.length,like=people.filter(x=>x.verdict==='like'||x.verdict==='strong').length,strong=people.filter(x=>x.verdict==='strong').length,miss=people.filter(x=>x.verdict==='miss').length;
  const histogram=Array.from({length:10},(_,i)=>people.filter(x=>Math.min(9,Math.floor(x.score*10))===i).length),peak=Math.max(1,...histogram);
  $('diagnostics').innerHTML=`<p>${esc(M.VERSION)} · seed ${state.seed}</p><p>${esc(p.expression)}／${esc(sampleName(p.sample))}・${p.years}年 ${money(p.price)}（${esc(tierName[p.tier])}）</p><p>実購入の評価 ${n}件。${n?`支持 ${percent(like/n)}、強い支持 ${percent(strong/n)}、好みに合わない ${miss}件。`:'売れていない瓶からは評価しません。'}</p>${n?`<div class="histogram" role="img" aria-label="購入者の評価分布、低い順に${histogram.join('、')}件">${histogram.map(count=>`<span style="height:${count/peak*100}%"></span>`).join('')}</div><div class="distribution-label"><span>低い評価</span><span>高い評価</span></div>`:''}<dl><dt>売上累計（全ての瓶）</dt><dd>${money(state.revenue)}</dd><dt>手元（仮置きを除く）</dt><dd>${M.freeHand(session,p.id)}本</dd><dt>仮置き</dt><dd>${staged()}本</dd><dt>店頭</dt><dd>${Object.values(p.shops).reduce((a,b)=>a+b,0)}本</dd><dt>販売済み</dt><dd>${p.sold}本</dd><dt>回収累計（手元へ含む）</dt><dd>${p.recovered}本</dd></dl>${summary.byShop.map(row=>{const ps=row.evaluations??[],positive=ps.find(x=>['strong','like'].includes(x.verdict)),negative=ps.find(x=>['miss','neutral'].includes(x.verdict));return `<h3>${esc(shopName(row.shopId))}</h3><p>購入者の評価 ${ps.length}件／販売${row.sold}本。${row.remaining?'店頭残あり。':''}</p>${positive?`<p>評価された点：「${esc(reactionText(positive))}」</p>`:''}${negative?`<p>合わなかった点：「${esc(reactionText(negative))}」</p>`:''}`;}).join('')}<details><summary>製法・風味・客ごとの計算値</summary><pre>${esc(JSON.stringify({recipe:p.recipe,profile:p.profile,evaluations:people},null,2))}</pre></details>`;
  $('seed').value=state.seed;
  $('memory-policy').value=session.policy;
}
function renderHistory(){
  $('previous').innerHTML=state.products.slice().reverse().map(p=>{const s=M.productSummary(session,p.id),destinations=s.byShop.filter(r=>r.sold||r.remaining).map(r=>`${shopName(r.shopId)} ${r.sold}本売却`).join('／'),person=s.byShop.map(buyerFor).find(Boolean);return `<div class="previous-record"><button type="button" data-history-select="${p.id}">${esc(sampleName(p.sample))}・${p.years}年／${p.createdMonth}か月目の瓶</button><p>${esc(destinations||'まだ販売していません')} · ${money(s.revenue)}</p>${person?`<p>「${esc(reactionText(person))}」</p>`:''}</div>`;}).join('');
  for(const button of $('previous').querySelectorAll('[data-history-select]'))button.addEventListener('click',()=>{if(perform({type:'select',productId:Number(button.dataset.historySelect)})){view='result';render();$('history').open=false;}});
  const previous=state.products.filter(p=>p.id!==state.selectedId&&p.createdMonth<=current().createdMonth).at(-1);
  $('previous-brief').hidden=!previous;
  if(previous){const s=M.productSummary(session,previous.id),person=s.byShop.map(buyerFor).find(Boolean),destinations=s.byShop.filter(r=>r.sold||r.remaining).map(r=>shopName(r.shopId)).join('・');$('previous-brief').textContent=`前の一本：${sampleName(previous.sample)}・${previous.years}年／${destinations||'未納品'}／${s.sold}本売却${person?'。「'+firstSentence(person)+'」':''}`;}
}

function renderMemory(){
  const store=M.shopView(session,resultShop,state.selectedId),text=store.text??'';
  $('store-memory').hidden=!text;
  $('store-memory').innerHTML=text?`<span>店の記憶</span>「${esc(text)}」`:'';
  $('store-memory-details').innerHTML=M.SHOPS.map(shop=>{
    const v=M.shopView(session,shop.id,state.selectedId),archive=v.archive??[],expectations=v.expectations??[];
    const history=archive.map(record=>{const p=state.products.find(p=>p.id===record.productId);if(!p)return '';const result=M.productSummary(session,p.id).byShop.find(r=>r.shopId===shop.id);return `<li>${esc(sampleName(p.sample))}・${p.years}年／${p.createdMonth}か月目の瓶：${result.sold}本売却、支持${result.positive}件・強い支持${result.strong}件</li>`;}).join('');
    const anticipated=expectations.map(record=>{const p=state.products.find(p=>p.id===record.productId);return p?`${sampleName(p.sample)}・${p.years}年`:'';}).filter(Boolean);
    return `<h3>${esc(shop.name)}</h3>${v.text?`<p>「${esc(v.text)}」</p>`:''}<p>${archive.length}件の記録。最後の取引：${v.lastTradeMonth===null||v.lastTradeMonth===undefined?'まだありません':v.lastTradeMonth+'か月目'}。</p>${history?`<ul class="shop-memories">${history}</ul>`:''}${anticipated.length?`<p>好意的な評価から残る期待：${esc(anticipated.join('／'))}</p>`:''}<details><summary>記憶・現在の関係の計算値</summary><dl><dt>認知</dt><dd>${Number(v.recognition??0).toFixed(3)}</dd><dt>現在の支持</dt><dd>${Number(v.support??0).toFixed(3)}</dd><dt>期待の候補</dt><dd>${expectations.length}件</dd></dl><pre>${esc(JSON.stringify(v,null,2))}</pre></details>`;
  }).join('');
}

function render(){
  renderHand();renderShops();renderResult();renderDiagnostics();renderHistory();renderMemory();
  $('allocation-view').hidden=view!=='allocation';$('result-view').hidden=view!=='result';
  $('workbench').classList.toggle('result-mode',view==='result');
  const pending=staged()>0;$('advance-one').disabled=pending;$('advance-three').disabled=pending;$('advance-year').disabled=pending;
  $('open-next').hidden=state.month<=Math.max(...state.products.map(p=>p.createdMonth));
  for(const button of $('portions').querySelectorAll('[data-portion]'))button.setAttribute('aria-pressed',String(button.dataset.portion===portion));
}
function advance(months){
  if(perform({type:'advance',months},`${months}か月進めました。販売と購入者の評価を表示します。`)){const rows=M.productSummary(session).byShop;if(!rows.find(r=>r.shopId===resultShop)?.evaluations.length)resultShop=rows.find(r=>r.evaluations.length)?.shopId??resultShop;view='result';$('next-editor').hidden=true;render();}
}
function download(data,name,type){
  const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
for(const button of $('portions').querySelectorAll('[data-portion]'))button.addEventListener('click',()=>{portion=button.dataset.portion;render();});
$('undo').addEventListener('click',()=>perform({type:'undo'},'直前の仮置きを戻しました。'));
$('cancel').addEventListener('click',()=>perform({type:'cancel'},'確定前の配分を戻しました。'));
$('confirm').addEventListener('click',()=>perform({type:'confirm'},'配分を確定しました。'));
$('advance-one').addEventListener('click',()=>advance(1));$('advance-three').addEventListener('click',()=>advance(3));
$('advance-year').addEventListener('click',()=>advance(12));
$('back-to-allocation').addEventListener('click',()=>{view='allocation';render();});
$('open-next').addEventListener('click',()=>{const p=current();$('next-sample').value=p.sample;$('next-years').value=p.years;$('next-tier').value=p.tier;$('next-editor').hidden=false;lastFocus=$('open-next');$('next-sample').focus();});
$('close-next').addEventListener('click',()=>{$('next-editor').hidden=true;lastFocus?.focus();});
$('next-form').addEventListener('submit',event=>{event.preventDefault();if(perform({type:'next',sample:$('next-sample').value,years:Number($('next-years').value),tier:$('next-tier').value},'次の比較用の瓶を用意しました。')){$('next-editor').hidden=true;view='allocation';portion='1';render();$('hand').querySelector('[aria-pressed="true"]')?.focus();}});
$('export-json').addEventListener('click',()=>download(M.serialize(session),`ambertime-reputation-v03-${state.seed}-${state.month}.json`,'application/json'));
$('export-csv').addEventListener('click',()=>download(M.csv(session),`ambertime-reputation-v03-${state.seed}-${state.month}.csv`,'text/csv;charset=utf-8'));
$('export-memory-csv').addEventListener('click',()=>download(M.csvMemory(session),`ambertime-shop-memory-v03-${state.seed}-${state.month}.csv`,'text/csv;charset=utf-8'));
$('import-json').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>M.MAX_LOG_BYTES)throw Error('ログが大きすぎます。');const next=M.restore(await file.text());session=next;state=next.sales;view=state.month?'result':'allocation';portion='1';$('next-editor').hidden=true;clearError();render();announce('同じシードと操作記録から再現しました。');}catch(error){$('error').textContent=error.message;$('error').hidden=false;}finally{event.target.value='';}});
$('restart-form').addEventListener('submit',event=>{event.preventDefault();try{const next=M.create({seed:Number($('seed').value),policy:$('memory-policy').value});session=next;state=next.sales;view='allocation';portion='1';$('next-editor').hidden=true;clearError();render();announce('初期状態に戻しました。');}catch(error){$('error').textContent=error.message;$('error').hidden=false;}});
$('next-sample').innerHTML=M.SAMPLES.map(sample=>`<option value="${sample.id}">${esc(sample.name)}</option>`).join('');
$('next-years').innerHTML=M.AGES.map(years=>`<option value="${years}">${years}年</option>`).join('');
$('next-tier').innerHTML=Object.keys(M.PRICE_TIERS).map(tier=>`<option value="${tier}">${esc(tierName[tier])}</option>`).join('');
$('store-description').innerHTML='<p>店の記憶は過去の実売と評価から作ります。現在の期待・支持は時間で変わり、過去の記録は残ります。客自身の味の評価と、記憶を踏まえた店の受け止め方は別です。</p><p>町の食堂：飲みやすさを好む客が多め。町のバー：香りや飲み比べへの関心がさまざま。専門酒店：熟成や個性への関心が比較的高め。どの店にも異なる好みの客がいます。</p><p>販売には本編の販路を対応させています。食堂はスーパー、バーは直販売、専門酒店は町の酒店の計算です。この対応と全店同じ価格はLab専用の仮説です。バーの販売計算は幅広い購入機会を持ち、味への好みは購入後の評価に表れます。</p><p>右の店頭の瓶を押すと手元へ回収できます。入金と評価は販売時だけ発生します。次の試作は熟成済みの比較用5本を追加します。仕込み費用と熟成を待つ経営は扱いません。</p>';

$('scenario-choice').innerHTML=SCENARIOS.map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('');
$('scenario-shop').innerHTML=M.SHOPS.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');$('scenario-shop').value='specialist';
$('memory-policy').innerHTML=Object.entries(M.POLICIES).map(([id,label])=>`<option value="${id}">${esc(label)}</option>`).join('');
$('scenario-form').addEventListener('submit',event=>{event.preventDefault();try{const next=playScenario({seed:Number($('seed').value),shopId:$('scenario-shop').value,scenario:$('scenario-choice').value,policy:$('memory-policy').value});session=next;state=next.sales;view='result';resultShop=$('scenario-shop').value;portion='1';$('next-editor').hidden=true;clearError();render();announce('同じ初期条件から5回の経過を再現しました。');}catch(error){$('error').textContent=error.message;$('error').hidden=false;}});

document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelMotions();});
render();
