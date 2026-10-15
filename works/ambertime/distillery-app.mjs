import {shortTaste,shortChange} from './tasting-view.mjs?v=0.6';
import * as D from './distillery.mjs?v=0.6';
import {PARAMETERS as P} from './parameters.mjs';
import {ageLabel,monthLabel,marketValue} from './model.mjs';
import {barrel,glass,bottleArt} from './art.mjs?v=0.5';
import {stillArt} from './distillery-art.mjs?v=0.5';
const T=D.DISTILLERY_PARAMETERS;
export const SAVE_KEY='sukimastock.ambertime.distillery.v1';
const OLD_KEY='sukimastock.ambertime.journey.v1';
const $=id=>document.getElementById(id),money=n=>'£'+Math.round(n).toLocaleString('en-GB');
const unitMoney=n=>'£'+Number(n).toFixed(2);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query=new URLSearchParams(location.search),preview=query.get('preview')==='1';
const chosenSeed=Number(query.get('seed')),seed=preview&&Number.isInteger(chosenSeed)&&chosenSeed>0&&chosenSeed<=4294967295?chosenSeed:20261015;
let clockGeneration=0;
let game=null,paused=true,timer=null,canSave=!preview,quoteOpen=false,quoteWasPaused=true,tasteWasPaused=true,jump=0,jumpTotal=0,jumpWasPaused=true,animation=null,animating=false,lastPhase='',barrelKey='',recordKey='',fillKey='',shelfKey='',resultKey='',priceKey='';
$('still').innerHTML=stillArt();
function notice(text){$('storage-notice').textContent=text;$('storage-notice').hidden=!text;}
function stopClock(){clockGeneration++;if(timer!==null){clearTimeout(timer);timer=null;}}
function persist(){
 if(preview){$('save-status').textContent='試遊中 · 保存しません';return;}
 if(!canSave||!game)return;
 try{localStorage.setItem(SAVE_KEY,D.serializeDistillery(game));$('save-status').textContent='保存しました';}
 catch{canSave=false;notice('保存できません。元の保存を残し、この画面では続けられます。');$('save-status').textContent='未保存';}
}
const liveStock=()=>game.core.products.reduce((n,p)=>n+p.stock,0);
const monthAllowed=()=>game&&game.view!=='tasting'&&!quoteOpen&&!animating&&(['watching','selling'].includes(game.phase)||game.phase==='ready'&&liveStock()>0);
function schedule(){
 stopClock();if(!game||paused||document.hidden||quoteOpen||animating||game.view==='tasting')return;
 const generation=clockGeneration,expectedMonth=game.core.month;
 const distilling=game.phase==='distilling';if(!distilling&&!monthAllowed())return;
 timer=setTimeout(()=>{
  if(generation!==clockGeneration)return;timer=null;if(paused||document.hidden||quoteOpen||animating||game.view==='tasting')return;
  if(distilling){if(game.phase!=='distilling')return;game=D.distillStep(game);if(game.phase!=='distilling'||game.distillation.progress%5===0)persist();render();}
  else{
   if(!monthAllowed())return;const before=game.core.month;game=D.tickDistillery(game,expectedMonth);if(game.core.month===before&&game.phase!=='choice'){paused=true;notice('維持費を残せないため、時間を止めています。販売価格と帳面を確かめられます。');}persist();render();
   if(jump>0){jump--;if(!monthAllowed()||jump===0){jump=0;paused=jumpWasPaused;render();}}
   if(game.core.month!==before){document.body.dataset.motion='month';}
   if(game.phase==='selling'&&liveStock()===0){paused=true;render();}
  }
  schedule();
 },distilling?T.distillStepMs:jump>0?450:T.monthMs);
}
function act(fn){stopClock();try{game=fn(game);persist();render();}catch(e){notice(e.message);}schedule();}
function sampleText(s){return (s?.text??[]).join(' · ');}
function renderTasting(){
 const c=D.comparison(game);if(!c.current)return;
 $('taste-date').textContent=ageLabel(c.current.age)+'の試飲';
 $('taste-current').innerHTML=shortTaste(c.current).map((t,i)=>'<p><span>'+['口当たり','香り','余韻'][i]+'</span>'+esc(t)+'</p>').join('');
 $('taste-previous').hidden=false;
 $('taste-previous').textContent=(c.previous?'前回 '+ageLabel(c.previous.age)+'から：':'')+shortChange(c.current,c.previous);
}
function recordMarkup(r){
 const direction=r.cut<0.3?'狭めに切り上げた原酒':r.cut>0.7?'広く集めた原酒':'ほどよい範囲で集めた原酒';
 const choices=(r.choices??[]).map(c=>'<li><time>'+esc(ageLabel(c.age))+'</time><span>'+esc(c.text)+'</span></li>').join('');
 const trials=(r.samples??[]).map(s=>'<li><time>'+esc(ageLabel(s.age))+'</time><span>'+esc(sampleText(s))+'</span></li>').join('');
 const memories=Array.isArray(r.memory)?r.memory:r.memory?[r.memory]:[];
 return '<h2>'+esc(r.name??'この樽の一本')+'</h2><p>'+esc(ageLabel(r.age))+' · '+r.bottles+'本</p><p class="finish-taste">'+(r.taste??[]).map(esc).join(' · ')+'</p><p class="record-description">'+esc(direction)+'を、'+(r.type==='refill'?'リフィル樽':'バーボン樽')+'で育てました。</p><ul class="memories">'+memories.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul><details><summary>蒸留・試飲・判断の記録</summary><p>抽出範囲 '+Math.round((r.cut??0)*100)+'% · 蒸発 '+Number(r.evaporated??0).toFixed(1)+' L</p><ul class="sample-history">'+trials+'</ul><ul class="record-choices">'+choices+'</ul></details>';
}
function renderShelf(){
 const current=game.core.products.find(p=>p.id===game.currentProductId),products=game.core.products.filter(p=>(p.stock>0||p.id===game.currentProductId)&&!(game.phase==='bottled'&&p.id===game.currentProductId));
 const key=JSON.stringify([products,game.selectedPrice,game.phase]);
 if(key!==shelfKey){
  $('shelf').innerHTML=products.map(p=>'<div class="shelf-product"><div class="shelf-bottles" aria-hidden="true">'+Array.from({length:Math.min(6,p.stock)},()=>'<span class="shelf-bottle">'+bottleArt(p.wood)+'</span>').join('')+'</div><p>'+esc(ageLabel(p.age))+'の一本 · 残り'+p.stock+'本 · '+unitMoney(p.price)+'/本</p></div>').join('');
  shelfKey=key;
 }
 const pk=JSON.stringify([game.currentProductId,game.selectedPrice]);
 if(current&&priceKey!==pk){const prices=D.salePrices(game);$('price-options').innerHTML=['low','standard','high'].map((tier,i)=>'<button type="button" data-tier="'+tier+'" aria-pressed="'+(game.selectedPrice===tier)+'">'+['低め','標準','高め'][i]+'<span>'+unitMoney(prices[tier])+'/本</span></button>').join('');priceKey=pk;}
 $('price-options').hidden=!current||current.stock===0;
 $('sales-title').textContent=game.phase==='bottled'?'販売棚に並べる':'販売棚';
 $('sales-caption').textContent=game.phase==='bottled'?'瓶の中では熟成を止めます。価格を決めて、販売棚へ。':liveStock()>0?'低めなら早く、高めならゆっくり売れます。':'棚の一本を売り終えました。';
 $('list-bottles').hidden=game.phase!=='bottled';
 const last=game.core.lastMonth;
 $('sales-result').textContent=game.phase==='bottled'?'今回の一本は、まだ販売していません。':last?'前月 '+last.bottles+'本販売 · 売上 '+money(last.revenue)+' · 維持費 '+money(last.upkeep):'次の1か月から販売します。';
 $('next-batch').hidden=game.phase!=='selling';
 const minimum=D.canStart(game).minimum;$('next-batch').disabled=game.core.cash<minimum;$('next-batch').textContent=game.core.cash<minimum?'次の仕込みに '+money(minimum)+' 必要':'次の仕込みへ';
}
function render(){
 if(!game)return;
 const phase=game.phase,c=D.currentCask(game),o=D.observation(game),tasting=game.view==='tasting',aging=['watching','choice'].includes(phase),completed=['bottled','selling'].includes(phase);
 document.body.style.setProperty('--month-duration',(jump>0?450:T.monthMs)+'ms');document.body.dataset.phase=phase;document.body.dataset.time=paused||document.hidden||quoteOpen||tasting||phase==='choice'?'paused':'running';
 document.body.classList.toggle('is-tasting',tasting&&!quoteOpen);$('game').hidden=false;$('recovery').hidden=true;
 $('cash').textContent=money(game.core.cash);$('calendar').textContent=monthLabel(game.core.month);
 $('still').hidden=!['ready','distilling','filling'].includes(phase);
 $('barrel').hidden=!aging;$('glass-button').hidden=!aging;$('bottle-object').hidden=!completed;
 if(c&&barrelKey!==c.id){$('barrel').innerHTML=barrel(c.type);barrelKey=c.id;}
 if(completed)$('bottle-object').innerHTML=bottleArt(game.result?.profile?.wood??game.core.products.find(p=>p.id===game.currentProductId)?.wood??0.4);
 $('distillation-panel').hidden=!['ready','distilling'].includes(phase);$('fill-panel').hidden=phase!=='filling';
 $('start-distill').hidden=phase!=='ready';$('stop-distill').hidden=phase!=='distilling';
 if(phase==='ready'){
  const start=D.canStart(game);$('start-distill').disabled=!start.ok;$('start-distill').textContent='蒸留を始める '+money(P.distillationCost);
  $('distill-caption').textContent=start.ok?'原酒を集めながら、抽出の終わりを決めます。':start.reason;
  $('distill-direction').textContent=start.ok?'早く切り上げると少量で穏やかに。続けると量と個性が増えます。':start.canWait?'棚の商品を売りながら、次の仕込みを待てます。':'帳面と販売価格を確かめられます。';
  $('cask-kind').textContent='蒸留器';$('age').textContent='';$('amount').textContent='';$('loss').textContent='';$('change').textContent='';$('last-taste').textContent='';
  document.body.style.setProperty('--collection',0);
 }
 if(phase==='distilling'||phase==='filling'){
  const d=game.distillation;
  document.body.style.setProperty('--collection',Math.min(1,d.litres/(P.baseLitres+P.extraLitres)));document.body.style.setProperty('--month-progress',d.progress/T.distillMax);
  $('cask-kind').textContent=phase==='distilling'?'蒸留中':'自分で集めた原酒';$('age').textContent='';
  $('amount').textContent=d.litres.toFixed(1)+' L';$('loss').textContent='蒸留費 '+money(P.distillationCost);
  $('change').textContent=d.progress<T.minimumStop?'最初の原酒を集めています。':d.progress<50?'少量で、刺激を抑えた原酒。':d.progress<80?'穀物の香りと、ほどよい強さ。':'量と、強い穀物の香り。';
  $('last-taste').textContent='';$('stop-distill').disabled=d.progress<T.minimumStop;
  $('distill-caption').textContent=d.progress<T.minimumStop?'原酒が集まるまで、少し待ちます。':'ここで終えるか、もう少し集めるか。';
  $('distill-direction').textContent=paused?'蒸留は停止中です。':'';
  if(phase==='filling'&&fillKey!==game.batch.id){
   $('cask-options').innerHTML=['bourbon','refill'].map(type=>'<button type="button" data-cask="'+type+'"><span class="cask-art" aria-hidden="true">'+barrel(type)+'</span><strong>'+esc(P.casks[type].short)+'</strong><span>'+money(P.casks[type].cost)+' · '+(type==='bourbon'?'木の香りが移りやすい':'ゆっくり変わる')+'</span></button>').join('');fillKey=game.batch.id;
  }
 }
 if(o){
  $('cask-kind').textContent=c.type==='refill'?'リフィル・バーボン樽':'バーボン樽';$('age').textContent=ageLabel(o.age);
  $('amount').textContent='残り '+o.litres.toFixed(1)+' L';$('loss').textContent='仕込みから −'+Math.max(0,o.initialLitres-o.litres).toFixed(1)+' L';
  $('glass').innerHTML=glass(o.wood,{sample:true});$('change').textContent=o.wood>0.66?'色が深くなってきました。':o.wood>0.36?'琥珀色が濃くなってきました。':o.wood>0.13?'少し色づいてきました。':'まだ淡い色です。';
  $('last-taste').textContent=game.samples.length?'最後の試飲 · '+ageLabel(game.samples.at(-1).age):'グラスで、今の味を確かめられます。';
 }
 if(completed){$('cask-kind').textContent='仕込み '+game.round+' の一本';$('age').textContent=ageLabel(game.result.age);$('amount').textContent=game.result.bottles+'本';$('loss').textContent='';$('change').textContent='';$('last-taste').textContent='';}
 $('free-actions').hidden=!aging||tasting||quoteOpen||animating;$('tasting-panel').hidden=!tasting||quoteOpen;
 if(tasting)renderTasting();
 $('decision').hidden=phase!=='choice'||tasting||quoteOpen;
 if(phase==='choice'&&!tasting&&!quoteOpen){const pending=game.pending;$('decision').innerHTML='<h2>'+esc(pending.title)+'</h2><p>'+esc(pending.text)+'</p><div class="options">'+pending.options.map(op=>'<button type="button" class="choice" data-choice="'+esc(op.id)+'" data-event="'+esc(pending.id)+'">'+esc(op.id==='bottle'?'今の瓶詰めを確かめる':op.id==='last'?'3か月後、もう一度確かめる':op.label)+(op.hint?'<span>'+esc(op.hint)+'</span>':'')+'</button>').join('')+'</div>';}
 $('bottle-tray').hidden=!quoteOpen;
 if(quoteOpen&&c){const q=D.quote(game),last=game.samples.at(-1);$('bottle-taste').textContent=last?'最後の試飲（'+ageLabel(last.age)+'） '+sampleText(last):'まだ試飲していません。樽へ戻って確かめることもできます。';$('bottle-quote').textContent=q.count+'本 · 費用 '+money(q.cost)+' · 手元に '+money(game.core.cash-q.cost);$('bottle-wait').textContent='今の風味で棚に並べる目安は '+unitMoney(marketValue(c))+'/本。待つ間も維持費は月'+money(T.caskMaintenance)+'。原酒は蒸発し、味も変わります。瓶詰め後は販売資金を次の仕込みに使えます。';$('confirm-bottle').disabled=q.count<1||game.core.cash<q.cost;}
 $('result').hidden=!completed||animating;$('sales-panel').hidden=!completed||animating;
 if(completed){const key=JSON.stringify([game.result.productId,game.result.samples,game.result.choices]);if(key!==resultKey){$('result').innerHTML=recordMarkup(game.result);resultKey=key;}renderShelf();}
 const showClock=phase==='distilling'||monthAllowed()||aging;
 $('time-flow').hidden=!showClock;$('time-controls').hidden=tasting||quoteOpen||phase==='choice'||animating;
 $('skip').hidden=phase==='distilling';$('skip').disabled=jump>0;
 $('toggle-time').textContent=paused?'時間を進める':'時間を止める';
 $('time-status').textContent=quoteOpen?'瓶詰めを考えています · 時間は停止中':tasting?'試飲中 · 時間は停止中':phase==='choice'?'判断を待っています · 時間は停止中':paused?'時間は停止中':phase==='distilling'?'蒸留中 · 自分で抽出を止めます':jump>0?'3か月を順に進めています':['selling','ready'].includes(phase)?'販売中 · 約2秒で1か月':'熟成中 · 約2秒で1か月';
 const last=game.core.lastMonth;$('time-change').textContent=jump>0?(jumpTotal-jump)+' / '+jumpTotal+'か月':last&&aging?'前月の維持費 '+money(last.upkeep)+(last.revenue?' · 棚の売上 '+money(last.revenue):''):'';
 $('ledger-body').innerHTML='<p>蒸留 '+money(P.distillationCost)+' · 維持費累計 '+money(game.core.totals.upkeep)+' · 売上累計 '+money(game.core.totals.revenue)+'</p><p>瓶在庫 '+liveStock()+'本 · 仕込み '+game.round+'回目</p>';
 if(game.samples.length)$('ledger-body').innerHTML+='<h3>この樽の試飲</h3><ol class="sample-history">'+game.samples.map((s,i)=>'<li><time>'+esc(ageLabel(s.age))+'</time><p>'+esc(sampleText(s))+'</p>'+(i?'<p class="quiet">'+esc(shortChange(s,game.samples[i-1]))+'</p>':'')+'</li>').join('')+'</ol>';
 $('records').hidden=!game.records.length;
 const rk=JSON.stringify(game.records.map(r=>[r.productId,r.samples,r.choices]));if(rk!==recordKey){$('records-body').innerHTML=game.records.slice().reverse().map(r=>'<article class="record-history">'+recordMarkup(r)+'<p id="record-sale-'+r.productId+'"></p></article>').join('');recordKey=rk;}
 for(const r of game.records)$('record-sale-'+r.productId).textContent='販売 '+(r.sold??0)+'本 · 売上 '+money(r.revenue??0);
 if(phase!==lastPhase){document.body.dataset.motion=phase;lastPhase=phase;}
}
function taste(){if(!game||game.view==='tasting'||!['watching','choice'].includes(game.phase)||quoteOpen||animating)return;tasteWasPaused=paused;jump=0;act(D.sampleDistillery);document.body.dataset.motion='pour';}
function openQuote(){if(!game||!['watching','choice'].includes(game.phase)||animating)return;quoteWasPaused=paused;jump=0;stopClock();quoteOpen=true;render();}
$('start-distill').addEventListener('click',()=>{if(game?.phase!=='ready')return;paused=false;act(D.startDistillation);});
$('stop-distill').addEventListener('click',()=>{if(game?.phase!=='distilling')return;act(D.stopDistillation);});
$('cask-options').addEventListener('click',e=>{const b=e.target.closest('[data-cask]');if(!b||game?.phase!=='filling')return;paused=false;act(s=>D.fillBarrel(s,b.dataset.cask));});
$('taste-button').addEventListener('click',taste);$('glass-button').addEventListener('click',taste);
$('end-tasting').addEventListener('click',()=>{if(game?.view!=='tasting'||quoteOpen)return;paused=tasteWasPaused;document.body.dataset.motion='';act(D.endTasting);});
$('open-bottle').addEventListener('click',openQuote);$('taste-bottle').addEventListener('click',openQuote);
$('cancel-bottle').addEventListener('click',()=>{quoteOpen=false;paused=quoteWasPaused;render();schedule();});
$('confirm-bottle').addEventListener('click',()=>{
 if(!quoteOpen||!['watching','choice'].includes(game.phase)||animating)return;
 stopClock();try{game=D.bottleNow(game);quoteOpen=false;paused=true;animating=true;persist();document.body.classList.add('is-bottling');render();clearTimeout(animation);animation=setTimeout(()=>{animating=false;document.body.classList.remove('is-bottling');render();},650);}catch(e){notice(e.message);}
});
$('decision').addEventListener('click',e=>{const b=e.target.closest('[data-choice]');if(!b||game?.phase!=='choice'||game.view==='tasting'||quoteOpen||b.dataset.event!==game.pending?.id)return;if(b.dataset.choice==='bottle')openQuote();else{paused=false;act(s=>D.chooseDistillery(s,b.dataset.choice));}});
$('toggle-time').addEventListener('click',()=>{jump=0;paused=!paused;persist();render();schedule();});
$('skip').addEventListener('click',()=>{if(!monthAllowed()||jump>0)return;jumpWasPaused=paused;paused=false;jump=3;jumpTotal=3;render();schedule();});
$('price-options').addEventListener('click',e=>{const b=e.target.closest('[data-tier]');if(b&&['bottled','selling'].includes(game?.phase))act(s=>D.setSalePrice(s,b.dataset.tier));});
$('list-bottles').addEventListener('click',()=>{if(game?.phase!=='bottled'||animating)return;paused=false;act(D.listBottles);});
$('next-batch').addEventListener('click',()=>{if(game?.phase!=='selling')return;paused=true;act(D.nextBatch);});
function suspend(){paused=true;tasteWasPaused=true;quoteWasPaused=true;jump=0;stopClock();persist();if(game)render();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',e=>{if(e.persisted)suspend();});
$('reset').addEventListener('click',()=>{if(!confirm('0.5の進行と記録を新しくしますか？0.4と以前の蒸留所の保存は残ります。'))return;stopClock();clearTimeout(animation);document.body.classList.remove('is-bottling');game=D.newDistillery(seed);paused=true;quoteOpen=false;animating=false;jump=0;canSave=!preview;barrelKey='';fillKey='';recordKey='';notice('');persist();render();});
function boot(){
 if(preview){game=D.newDistillery(seed);persist();render();return;}
 let text;try{text=localStorage.getItem(SAVE_KEY);$('old-progress').hidden=localStorage.getItem(OLD_KEY)===null;}catch{canSave=false;notice('保存を読み取れません。元の記録を保護して止めています。');$('recovery').hidden=false;return;}
 if(text!==null){try{game=D.restoreDistillery(text);paused=true;render();}catch{canSave=false;notice('この保存は開けません。元の記録は残しています。');$('recovery').hidden=false;}return;}
 game=D.newDistillery(seed);persist();render();
}
boot();
