import * as D from './parallel.mjs?v=0.6-manual-stop';
import {PARALLEL_PARAMETERS as T} from './parallel-parameters.mjs?v=0.6-playability';
import {PARAMETERS as P} from './parameters.mjs';
import {ageLabel,monthLabel} from './model.mjs';
import {barrel,glass,bottleArt} from './art.mjs?v=0.5';
import {stillArt} from './distillery-art.mjs?v=0.5';
import {shortTaste,shortChange} from './tasting-view.mjs?v=0.6';
export const SAVE_KEY='sukimastock.ambertime.parallel.v1';
const $=id=>document.getElementById(id),money=n=>'£'+Number(n).toLocaleString('en-GB',{maximumFractionDigits:0}),unit=n=>'£'+Number(n).toFixed(2);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query=new URLSearchParams(location.search),preview=query.get('preview')==='1',chosenSeed=Number(query.get('seed')),seed=preview&&Number.isInteger(chosenSeed)&&chosenSeed>0&&chosenSeed<=4294967295?chosenSeed:20261015;
let game=null,room='distill',selectedCaskId=null,selectedProductId=null,userPaused=true,modal=null,timer=null,generation=0,elapsed=0,jump=0,jumpPaused=true,canSave=!preview,lastSavedText=null;
let rackKey='',shelfKey='',barrelKey='',glassKey='',ledgerKey='',recordKey='';
$('still').innerHTML=stillArt();
const message=t=>{$('work-notice').textContent=t;};
function storageNotice(t){$('storage-notice').textContent=t;$('storage-notice').hidden=!t;}
function stopClock(){generation++;if(timer!==null){clearTimeout(timer);timer=null;}}
function save(){
 if(preview){$('save-status').textContent='試遊中 · 保存しません';return true;}
 if(!game||!canSave)return false;
 try{const text=D.serializeDistillery(game);if(localStorage.getItem(SAVE_KEY)!==lastSavedText)throw Error('conflict');localStorage.setItem(SAVE_KEY,text);if(localStorage.getItem(SAVE_KEY)!==text)throw Error('write');lastSavedText=text;$('save-status').textContent='保存しました';return true;}
 catch{canSave=false;userPaused=true;jump=0;stopClock();storageNotice('保存できません。元の記録を残して停止しています。');$('save-status').textContent='未保存';$('retry-save').hidden=false;$('recovery').hidden=false;return false;}
}
const listedStock=()=>game.core.products.reduce((sum,p)=>sum+(game.productsById[p.id]?.listed?p.stock:0),0);
const hasMonthlyWork=()=>game&&(game.core.casks.length>0||listedStock()>0||game.still.phase==='distilling');
const blocked=()=>!game||(!preview&&!canSave)||userPaused||document.hidden||modal!==null||game.tastingId!==null||game.decisions.length>0;
function schedule(){
 stopClock();if(blocked()||!hasMonthlyWork())return;const token=generation,expectedMonth=game.core.month;
 timer=setTimeout(()=>{
  if(token!==generation)return;timer=null;if(blocked())return;
  try{
   const wasDistilling=game.still.phase==='distilling';
   if(wasDistilling){const before=game.still.distillation.progress;game=D.distillStep(game);if(before<T.distillMax-1&&game.still.distillation.progress>=T.distillMax-1)message('抽出の上限です。蒸留室で「抽出を終える」を押してください。');}
   elapsed+=jump?T.monthMs/5:T.distillStepMs;
   if(elapsed>=T.monthMs){const before=game.core.month;game=D.tickDistillery(game,expectedMonth);elapsed=0;if(game.core.month===before){userPaused=true;message('資金を残すため、時間を止めました。');}if(jump>0){jump--;if(jump===0){userPaused=jumpPaused;}}save();}
   else if(wasDistilling&&(game.still.phase!=='distilling'||game.still.distillation.progress%5===0))save();
   if(game.decisions.length){userPaused=true;jump=0;}
   render();schedule();
  }catch(e){userPaused=true;jump=0;storageNotice(e.message);render();}
 },T.distillStepMs);
}
function act(fn,after){stopClock();try{game=fn(game);if(after)after();save();render();schedule();return true;}catch(e){storageNotice(e.message);render();schedule();return false;}}
function endTaste(){if(game?.tastingId!==null)game=D.endTasting(game);}
function selectRoom(next){if(!game||!['distill','warehouse','sales'].includes(next)||modal)return;stopClock();endTaste();room=next;jump=0;save();render();schedule();}
// Display ranks belong to the live rack; stable IDs remain in actions and saves.
const caskName=id=>'樽'+(game.core.casks.findIndex(c=>c.id===id)+1);
const caskLabel=c=>caskName(c.id)+' · '+P.casks[c.type].short;
const button=(text,action,id='',extra='')=>'<button type="button" data-action="'+action+'" data-id="'+id+'" '+extra+'>'+text+'</button>';
function openModal(kind,id=null){if(!game||modal||kind==='fill'&&game.still.phase!=='filling')return;stopClock();jump=0;modal={kind,id};render();}
function closeModal(){if(modal?.kind==='decision')return;modal=null;render();schedule();}
function trial(id){if(!game||!D.currentCask(game,id))return;stopClock();if(game.tastingId!==null&&game.tastingId!==id)endTaste();selectedCaskId=id;room='warehouse';modal=null;act(s=>D.sampleDistillery(s,id));}
function quoteModal(id){if(!D.currentCask(game,id))return;stopClock();modal={kind:'quote',id};jump=0;render();}
function syncModal(){
 const dialog=$('action-dialog');
 if(!modal&&game.tastingId===null&&game.decisions.length){const d=game.decisions[0];modal={kind:'decision',id:d.caskId};selectedCaskId=d.caskId;}
 if(!modal){if(dialog.open)dialog.close();return;}
 const {kind,id}=modal,c=D.currentCask(game,id);let title='',body='',actions='';
 if(kind==='decision'){
  const d=game.decisions[0];if(!d){modal=null;if(dialog.open)dialog.close();return;}
  modal.id=d.caskId;const source=D.currentCask(game,d.caskId),pending=d.pending;
  title=pending.title;body='<p>'+esc(caskLabel(source))+' · '+ageLabel(source.age)+'</p>'+(pending.text?'<p>'+esc(pending.text)+'</p>':'')+button('試飲して考える','trial',d.caskId);
  actions=pending.options.map(o=>button(esc(o.id==='bottle'?'瓶詰めを確かめる':o.label)+(o.hint?'<small>'+esc(o.hint)+'</small>':''),o.id==='bottle'?'quote':'choose',d.caskId,'data-choice="'+esc(o.id)+'" data-event="'+esc(d.eventId)+'"')).join('');
 }else if(kind==='fill'){
  title='原酒を樽に詰める';body='<p>'+game.still.distillation.litres.toFixed(1)+' L</p>';
  actions=['bourbon','refill'].map(type=>button('<span class="fill-art">'+barrel(type)+'</span>'+esc(P.casks[type].short)+' · '+money(P.casks[type].cost),'fill',type)).join('');
 }else if(kind==='quote'&&c){
  const q=D.quote(game,id),sample=game.notesById[id].samples.at(-1);title='この樽を瓶に残す';
  body='<p>'+esc(caskLabel(c))+' · '+ageLabel(c.age)+'</p><p class="quote-numbers">'+q.count+'本 · 費用 '+money(q.cost)+'</p><p>瓶詰め後 '+money(game.core.cash-q.cost)+'</p><p class="quiet">維持費 '+money(game.core.casks.length?T.caskMaintenance:T.idleMaintenance)+'/月 · 残り '+c.litres.toFixed(1)+' L</p><p class="quiet">'+(sample?'試飲 '+ageLabel(sample.age)+' · '+shortTaste(sample).map(esc).join(' · '):'試飲なし')+'</p>';
  actions=button('瓶詰めする','bottle',id,q.count<1||game.core.cash<q.cost?'disabled':'')+button('樽へ戻る','cancel');
 }else if(kind==='product'){
  const p=game.core.products.find(x=>x.id===id),meta=game.productsById[id];if(!p){modal=null;render();return;}
  const prices=D.salePrices(game,id),record=game.records.find(r=>r.productId===id);title=record?.name??'この一本';
  body='<div class="modal-bottle">'+bottleArt(p.wood)+'</div><p>'+ageLabel(p.age)+' · 残り '+p.stock+'本</p><p class="quiet">販売 '+p.sold+'本 · 売上 '+money(p.revenue)+'</p>';
  actions='<div class="price-options">'+['low','standard','high'].map((tier,i)=>button(['低め','標準','高め'][i]+'<span>'+unit(prices[tier])+'/本</span>','price',id,'data-tier="'+tier+'" aria-pressed="'+(meta.selectedPrice===tier)+'"')).join('')+'</div>'+(meta.listed?button('戻る','cancel'):button('この価格で販売する','list',id));
 }else if(kind==='finish'){
  const r=game.records.find(x=>x.productId===id);title=r.name;body='<div class="modal-bottle">'+bottleArt(r.profile.wood)+'</div><p>'+ageLabel(r.age)+' · '+r.bottles+'本</p><p>'+r.taste.map(esc).join(' · ')+'</p>';
  actions=button('販売室へ','to-sales',id)+button('樽を見る','to-warehouse');
 }
 $('dialog-title').textContent=title;$('dialog-body').innerHTML=body;$('dialog-actions').innerHTML=actions;$('close-dialog').hidden=kind==='decision';
 if(!dialog.open)dialog.showModal();
}
function render(){
 if(!game)return;
 if(!D.currentCask(game,selectedCaskId))selectedCaskId=game.core.casks[0]?.id??null;
 if(game.tastingId!==null){selectedCaskId=game.tastingId;room='warehouse';}
 syncModal();
 const phase=game.still.phase,tasting=game.tastingId!==null;
 document.body.dataset.room=room;document.body.dataset.phase=room==='distill'?phase:room==='warehouse'?'watching':'selling';document.body.dataset.time=blocked()||!hasMonthlyWork()?'paused':'running';document.body.classList.toggle('is-tasting',tasting&&!modal);
 document.body.style.setProperty('--month-duration',T.monthMs+'ms');document.body.style.setProperty('--month-progress',room==='distill'&&phase!=='ready'?(game.still.distillation?.progress??0)/T.distillMax:elapsed/T.monthMs);document.body.style.setProperty('--collection',game.still.distillation?.litres/40||0);
 $('game').hidden=false;$('recovery').hidden=canSave||preview;
 $('cash').textContent=money(game.core.cash);$('calendar').textContent=monthLabel(game.core.month);
 for(const name of ['distill','warehouse','sales'])$('room-'+name).hidden=room!==name;
 for(const b of document.querySelectorAll('[data-room]'))b.setAttribute('aria-pressed',String(b.dataset.room===room));
 $('nav-still').textContent=phase==='distilling'?(game.still.distillation.progress>=T.distillMax-1?'抽出停止待ち':'蒸留中'):phase==='filling'?'樽詰め待ち':'待機';$('nav-casks').textContent=game.core.casks.length+'樽';$('nav-stock').textContent=listedStock()+'本';
 $('start-distill').hidden=phase!=='ready';$('stop-distill').hidden=phase!=='distilling';$('open-fill').hidden=phase!=='filling';
 const start=D.canStart(game);$('start-distill').disabled=!start.ok;$('start-distill').textContent='蒸留を始める '+money(P.distillationCost);
 $('stop-distill').disabled=(game.still.distillation?.progress??0)<T.minimumStop;
 $('collection').textContent=game.still.distillation?game.still.distillation.litres.toFixed(1)+' L':'';
 $('distill-caption').textContent=phase==='ready'?(start.ok?'原酒を集め、抽出の終わりを決めます。':start.reason):phase==='filling'?'抽出完了。樽を選んで詰めます。':'原酒を集めています。';
 $('distill-direction').textContent=phase==='distilling'?game.still.distillation.progress>=T.distillMax-1?'抽出の上限です。ここで終えて樽詰めへ。':game.still.distillation.progress<T.minimumStop?'最初の原酒が集まるまで少し待ちます。':game.still.distillation.progress<70?'少量で切り上げるか、もう少し集めるか。':'量と穀物の個性が増してきました。':phase==='ready'&&start.ok?'早めなら少量で穏やかに。続けると量と個性が増えます。':'';
 const rk=JSON.stringify([game.core.casks.map(c=>[c.id,c.age,c.litres]),selectedCaskId]);
 if(rk!==rackKey){$('cask-rack').innerHTML=game.core.casks.map(c=>'<button type="button" data-cask-id="'+c.id+'" aria-pressed="'+(selectedCaskId===c.id)+'"><span aria-hidden="true">'+barrel(c.type)+'</span><strong>'+caskName(c.id)+'</strong><small>'+ageLabel(c.age)+'</small><small>'+c.litres.toFixed(1)+' L</small></button>').join('');rackKey=rk;}
 $('warehouse-empty').hidden=game.core.casks.length>0;$('selected-cask').hidden=selectedCaskId===null;
 if(selectedCaskId!==null){
  const c=D.currentCask(game,selectedCaskId),n=game.notesById[c.id];if(barrelKey!==c.id){$('barrel').innerHTML=barrel(c.type);barrelKey=c.id;}
  $('cask-kind').textContent=caskLabel(c);$('age').textContent=ageLabel(c.age);const gk=c.id+':'+c.wood;if(glassKey!==gk){$('glass').innerHTML=glass(c.wood,{sample:true});glassKey=gk;}$('amount').textContent='残り '+c.litres.toFixed(1)+' L';$('loss').textContent='仕込みから −'+(c.initialLitres-c.litres).toFixed(1)+' L';$('change').textContent=D.observation(game,c.id).change;$('last-taste').textContent=n.samples.length?'最後の試飲 · '+ageLabel(n.samples.at(-1).age):'グラスで、今の味を確かめられます。';
  $('tasting-panel').hidden=!tasting||!!modal;$('free-actions').hidden=tasting||!!modal;
  if(tasting){const comp=D.comparison(game,c.id);$('taste-date').textContent=ageLabel(comp.current.age)+'の試飲';$('taste-current').innerHTML=shortTaste(comp.current).map((t,i)=>'<p><span>'+['口当たり','香り','余韻'][i]+'</span>'+esc(t)+'</p>').join('');$('taste-previous').hidden=false;$('taste-previous').textContent=(comp.previous?'前回 '+ageLabel(comp.previous.age)+'から：':'')+shortChange(comp.current,comp.previous);}
 }
 const sk=JSON.stringify([game.core.products,game.productsById]);if(sk!==shelfKey){$('product-shelf').innerHTML=game.core.products.filter(p=>p.stock>0).map(p=>'<button type="button" data-product-id="'+p.id+'"><span aria-hidden="true">'+bottleArt(p.wood)+'</span><strong>'+esc(game.records.find(r=>r.productId===p.id)?.name??'この一本')+'</strong><small>'+ageLabel(p.age)+' · '+p.stock+'本</small><small>'+unit(p.price)+'/本 · '+(game.productsById[p.id]?.listed?'販売中':'未陳列')+'</small></button>').join('');shelfKey=sk;}
 $('sales-empty').hidden=game.core.products.some(p=>p.stock>0);const last=game.core.lastMonth;$('sales-result').textContent=last?'前月 '+last.bottles+'本 · 売上 '+money(last.revenue):'';
 $('toggle-time').textContent=userPaused?(phase==='distilling'?'蒸留を再開する':'時間を進める'):'時間を止める';$('time-controls').hidden=tasting||!!modal;
 $('toggle-time').disabled=!hasMonthlyWork()||(!preview&&!canSave);$('skip').disabled=!hasMonthlyWork()||phase==='distilling'||jump>0||(!preview&&!canSave);
 $('time-status').textContent=modal?'判断中 · 時間は停止中':tasting?'試飲中 · 時間は停止中':userPaused?'時間は停止中':!hasMonthlyWork()?(phase==='filling'?'抽出完了 · 樽に詰められます':'作業を待っています'):phase==='distilling'?'蒸留中 · 熟成・販売も進みます':room==='distill'&&phase==='filling'?'抽出完了 · 熟成・販売は進行中':jump?'3か月を順に進めています':'自動進行 · 約'+T.monthMs/1000+'秒で1か月';
 $('time-change').textContent=last?'前月 維持費 '+money(last.upkeep)+(last.revenue?' · 売上 '+money(last.revenue):''):'';
 const lk=JSON.stringify([game.core.totals,game.notesById]);if(lk!==ledgerKey){$('ledger-body').innerHTML='<p>売上累計 '+money(game.core.totals.revenue)+' · 維持費累計 '+money(game.core.totals.upkeep)+'</p>'+game.core.casks.map(c=>'<h3>'+esc(caskLabel(c))+'</h3><ol class="sample-history">'+game.notesById[c.id].samples.map((s,i,all)=>'<li><time>'+ageLabel(s.age)+'</time><p>'+s.text.map(esc).join(' · ')+'</p>'+(i?'<p>'+esc(shortChange(s,all[i-1]))+'</p>':'')+'</li>').join('')+'</ol>').join('');ledgerKey=lk;}
 const recordState=JSON.stringify(game.records.map(r=>[r.productId,r.samples,r.choices]));if(recordState!==recordKey){$('records-body').innerHTML=game.records.slice().reverse().map(r=>'<article><h3>'+esc(r.name)+'</h3><p>'+ageLabel(r.age)+' · '+r.bottles+'本</p><p id="record-sale-'+r.productId+'"></p><p>'+r.taste.map(esc).join(' · ')+'</p><details><summary>蒸留・試飲・判断</summary><p>'+esc(r.description)+'</p>'+r.samples.map(s=>'<p>'+ageLabel(s.age)+' · '+s.text.map(esc).join(' · ')+'</p>').join('')+r.choices.map(c=>'<p>'+ageLabel(c.age)+' · '+esc(c.text)+'</p>').join('')+'</details></article>').join('');recordKey=recordState;}$('records').hidden=!game.records.length;for(const r of game.records)$('record-sale-'+r.productId).textContent='販売 '+r.sold+'本 · 売上 '+money(r.revenue);
}
$('room-nav').addEventListener('click',e=>{const b=e.target.closest('[data-room]');if(b)selectRoom(b.dataset.room);});
$('go-distill').addEventListener('click',()=>selectRoom('distill'));
$('cask-rack').addEventListener('click',e=>{const b=e.target.closest('[data-cask-id]');if(!b||modal||!D.currentCask(game,Number(b.dataset.caskId)))return;stopClock();endTaste();selectedCaskId=Number(b.dataset.caskId);save();render();schedule();});
$('product-shelf').addEventListener('click',e=>{const b=e.target.closest('[data-product-id]');if(b){selectedProductId=Number(b.dataset.productId);openModal('product',selectedProductId);}});
$('start-distill').addEventListener('click',()=>{if(!game||!D.canStart(game).ok||modal)return;userPaused=false;message('');act(D.startDistillation);});
$('stop-distill').addEventListener('click',()=>{if(game?.still.phase==='distilling'&&game.still.distillation.progress>=T.minimumStop&&!modal)act(D.stopDistillation);});$('open-fill').addEventListener('click',()=>openModal('fill'));
$('taste-button').addEventListener('click',()=>trial(selectedCaskId));$('glass-button').addEventListener('click',()=>{if(game?.tastingId===null)trial(selectedCaskId);});
$('end-tasting').addEventListener('click',()=>act(D.endTasting));$('open-bottle').addEventListener('click',()=>quoteModal(selectedCaskId));$('taste-bottle').addEventListener('click',()=>quoteModal(selectedCaskId));
$('toggle-time').addEventListener('click',()=>{jump=0;userPaused=!userPaused;save();render();schedule();});
$('skip').addEventListener('click',()=>{if(blocked()&&!userPaused||!hasMonthlyWork()||game.still.phase==='distilling'||jump>0)return;jumpPaused=userPaused;userPaused=false;jump=3;schedule();render();});
$('close-dialog').addEventListener('click',closeModal);$('action-dialog').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
$('dialog-actions').addEventListener('click',e=>handleModal(e));$('dialog-body').addEventListener('click',e=>handleModal(e));
function handleModal(e){
 const b=e.target.closest('[data-action]');if(!b||!modal)return;const a=b.dataset.action,id=Number(b.dataset.id),kind=modal.kind;
 if(a==='cancel'){closeModal();return;}if(a==='trial'){trial(id);return;}if(a==='quote'){quoteModal(id);return;}
 if(a==='choose'){const first=game.decisions[0];if(kind!=='decision'||first?.caskId!==id||first.eventId!==b.dataset.event)return;act(s=>D.chooseDistillery(s,id,b.dataset.choice),()=>{modal=null;userPaused=true;message('');});return;}
 if(a==='fill'){if(kind!=='fill')return;act(s=>D.fillBarrel(s,b.dataset.id),()=>{modal=null;selectedCaskId=game.core.casks.at(-1)?.id??null;room='warehouse';message('');});return;}
 if(a==='price'){if(kind!=='product'||modal.id!==id)return;act(s=>D.setSalePrice(s,b.dataset.tier,id));return;}
 if(a==='list'){if(kind!=='product'||modal.id!==id)return;act(s=>D.listBottles(s,id),()=>{modal=null;message('販売を始めました。売上は次の月から。');});return;}
 if(a==='bottle'){
  if(kind!=='quote'||modal.id!==id)return;const label=caskName(id);
  act(s=>D.bottleNow(D.endTasting(s),id),()=>{message(label+'を'+game.result.bottles+'本に瓶詰めしました。');modal=game.decisions.length?null:{kind:'finish',id:game.result.productId};});return;
 }
 if(a==='to-sales'){modal=null;room='sales';selectedProductId=id;render();schedule();return;}
 if(a==='to-warehouse'){modal=null;room='warehouse';render();schedule();}
}
function suspend(){userPaused=true;jump=0;stopClock();save();if(game)render();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',e=>{if(e.persisted)suspend();});
window.addEventListener('storage',e=>{if(!preview&&e.key===SAVE_KEY){canSave=false;suspend();storageNotice('別の画面で保存が変わりました。再読み込みしてください。');}});
$('reset').addEventListener('click',()=>{if(!confirm('並行版の進行を新しくしますか？一樽版と以前の保存は残ります。'))return;stopClock();try{lastSavedText=preview?null:localStorage.getItem(SAVE_KEY);}catch{storageNotice('保存を確認できないため初期化していません。');return;}game=D.newDistillery(seed);room='distill';selectedCaskId=null;modal=null;userPaused=true;elapsed=0;jump=0;glassKey='';canSave=!preview;storageNotice('');save();render();});
$('retry-save').addEventListener('click',()=>{if(!game){boot();return;}canSave=!preview;if(save()){storageNotice('');$('recovery').hidden=true;}render();});
function boot(){
 if(preview){game=D.newDistillery(seed);save();render();return;}
 try{lastSavedText=localStorage.getItem(SAVE_KEY);game=lastSavedText===null?D.newDistillery(seed):D.restoreDistillery(lastSavedText);selectedCaskId=game.tastingId??game.core.casks[0]?.id??null;room=selectedCaskId!==null?'warehouse':'distill';canSave=true;if(lastSavedText===null)save();render();}
 catch{canSave=false;game=null;stopClock();$('game').hidden=true;$('recovery').hidden=false;storageNotice('この保存は開けません。元の記録を残して停止しています。');}
}
boot();
