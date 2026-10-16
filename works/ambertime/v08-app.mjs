import * as D from './wholesale.mjs?v=0.8';
import {PARALLEL_PARAMETERS as T,ECONOMY_PARAMETERS as P} from './economy-parameters.mjs?v=0.7';
import {ageLabel,monthLabel} from './model.mjs';
import {barrel,glass,bottleArt} from './art.mjs?v=0.5';
import {stillArt} from './distillery-art.mjs?v=0.5';
import {shortTaste,shortChange} from './tasting-view.mjs?v=0.6';
export const SAVE_KEY='sukimastock.ambertime.wholesale.v3';
const $=id=>document.getElementById(id),money=n=>'£'+Number(n).toLocaleString('en-GB',{maximumFractionDigits:0}),unit=n=>'£'+Number(n).toFixed(2);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query=new URLSearchParams(location.search),preview=query.get('preview')==='1',chosenSeed=Number(query.get('seed')),seed=preview&&Number.isInteger(chosenSeed)&&chosenSeed>0&&chosenSeed<=4294967295?chosenSeed:20261015;
let game=null,room='distill',selectedCaskId=null,selectedProductId=null,userPaused=false,runtimeHalted=false,modal=null,timer=null,generation=0,elapsed=0,jump=0,canSave=!preview,lastSavedText=null;
let offerCaskId=null,shipmentKey='';
let rackKey='',shelfKey='',barrelKey='',glassKey='',ledgerKey='',recordKey='';
const pricingQueue=[];
const atExtractionLimit=()=>game?.still.phase==='distilling'&&game.still.distillation.progress>=T.distillMax-1;
$('still').innerHTML=stillArt();
const message=t=>{$('work-notice').textContent=t;};
function storageNotice(t){$('storage-notice').textContent=t;$('storage-notice').hidden=!t;}
function stopClock(){generation++;if(timer!==null){clearTimeout(timer);timer=null;}}
function save(){
 if(preview){$('save-status').textContent='試遊中 · 保存しません';return true;}
 if(!game||!canSave)return false;
 try{const text=JSON.stringify({version:1,game:JSON.parse(D.serializeDistillery(game)),userPaused});if(localStorage.getItem(SAVE_KEY)!==lastSavedText)throw Error('conflict');localStorage.setItem(SAVE_KEY,text);if(localStorage.getItem(SAVE_KEY)!==text)throw Error('write');lastSavedText=text;$('save-status').textContent='保存しました';return true;}
 catch{canSave=false;jump=0;stopClock();storageNotice('保存できません。元の記録を残して停止しています。');$('save-status').textContent='未保存';$('retry-save').hidden=false;$('recovery').hidden=false;return false;}
}
const listedStock=()=>game.core.products.reduce((sum,p)=>sum+(game.productsById[p.id]?.listed?p.stock:0),0);
const hasMonthlyWork=()=>game&&(game.core.casks.length>0||listedStock()>0||game.still.phase==='distilling');
const blocked=()=>!game||(!preview&&!canSave)||(userPaused&&jump===0)||runtimeHalted||document.hidden||modal!==null||game.tastingId!==null||game.decisions.length>0||game.trade.offer!==null;
function schedule(){
 stopClock();if(blocked()||!hasMonthlyWork())return;const token=generation,expectedMonth=game.core.month;
 timer=setTimeout(()=>{
  if(token!==generation)return;timer=null;if(blocked())return;
  try{
   const wasDistilling=game.still.phase==='distilling';
   if(wasDistilling){const before=game.still.distillation.progress;game=D.distillStep(game);if(before<T.distillMax-1&&game.still.distillation.progress>=T.distillMax-1)message('抽出がいっぱいになりました。樽に詰められます。');}
   elapsed+=jump?T.monthMs/5:T.distillStepMs;
   if(elapsed>=T.monthMs){const before=game.core.month;game=D.tickDistillery(game,expectedMonth);elapsed=0;if(game.core.month===before&&!game.decisions.length){runtimeHalted=true;message('資金を残して停止しています。樽詰めや販売を確かめられます。');}if(game.core.month!==before){const ship=game.trade.lastShipment;if(ship&&ship.month===game.core.month&&shipmentKey!==ship.productId){shipmentKey=ship.productId;message('卸売出荷 '+ship.bottles+'本 · 入金 '+money(ship.net));document.body.classList.add('just-shipped');setTimeout(()=>document.body.classList.remove('just-shipped'),1200);}else message('');}if(jump>0)jump--;save();}
   else if(wasDistilling&&(game.still.phase!=='distilling'||game.still.distillation.progress%5===0))save();
   if(game.decisions.length||game.trade.offer)jump=0;
   render();schedule();
  }catch(e){runtimeHalted=true;jump=0;storageNotice(e.message);render();}
 },T.distillStepMs);
}
function act(fn,after){stopClock();try{game=fn(game);runtimeHalted=false;if(after)after();save();render();schedule();return true;}catch(e){storageNotice(e.message);render();schedule();return false;}}
function endTaste(){if(game?.tastingId!==null)game=D.endTasting(game);}
function selectRoom(next){if(!game||!['distill','warehouse','sales'].includes(next)||modal)return;stopClock();endTaste();room=next;jump=0;save();render();schedule();}
// Display ranks belong to the live rack; stable IDs remain in actions and saves.
const caskName=id=>'樽'+(game.core.casks.findIndex(c=>c.id===id)+1);
const caskLabel=c=>caskName(c.id)+' · '+P.casks[c.type].short;
const button=(text,action,id='',extra='')=>'<button type="button" data-action="'+action+'" data-id="'+id+'" '+extra+'>'+text+'</button>';
function openModal(kind,id=null){if(!game||modal||kind==='fill'&&game.still.phase!=='filling')return;stopClock();jump=0;modal={kind,id};render();}
function closeModal(){if(modal?.kind==='decision')return;if(modal?.kind==='offer'){act(D.declineOffer,()=>{modal=null;offerCaskId=null;});return;}modal=null;render();schedule();}
function trial(id){if(!game||!D.currentCask(game,id))return;stopClock();jump=0;if(game.tastingId!==null&&game.tastingId!==id)endTaste();selectedCaskId=id;room='warehouse';modal=null;act(s=>D.sampleDistillery(s,id));}
function quoteModal(id){if(!D.currentCask(game,id))return;if(game.trade.contract?.caskId===id){openModal('contract',id);return;}stopClock();modal={kind:'quote',id};jump=0;render();}
function syncModal(){
 const dialog=$('action-dialog');
 if(!modal&&game.tastingId===null&&game.decisions.length){const d=game.decisions[0];modal={kind:'decision',id:d.caskId};selectedCaskId=d.caskId;}
 if(!modal&&game.tastingId===null&&!game.decisions.length&&pricingQueue.length){const productId=pricingQueue.shift();selectedProductId=productId;room='sales';modal={kind:'product',id:productId};}
 if(!modal&&game.tastingId===null&&!game.decisions.length&&!pricingQueue.length&&game.trade.offer)modal={kind:'offer'};
 if(!modal){if(dialog.open)dialog.close();return;}
 const {kind,id}=modal,c=D.currentCask(game,id);let title='',body='',actions='';
 if(kind==='offer'){
  const offer=game.trade.offer,cs=D.contractCandidates(game);if(!cs.some(c=>c.id===offerCaskId))offerCaskId=cs[0]?.id??null;
  const q=offerCaskId===null?null:D.quote(game,offerCaskId);title=offer.partner+'からの申し出';
  body='<p>以前の出荷を仕入れました。一樽、お取引できませんか。</p><p class="quote-numbers">'+ageLabel(offer.targetAge)+'で自動出荷 · '+unit(offer.unitPrice)+'/本</p><div class="offer-casks">'+cs.map(c=>button('<span class="fill-art">'+barrel(c.type)+'</span>'+esc(caskLabel(c))+' · '+ageLabel(c.age),'offer-cask',c.id,'aria-pressed="'+(offerCaskId===c.id)+'"')).join('')+'</div>'+(q?'<p>現在の残量で '+q.count+'本 · 売上目安 '+money(q.count*offer.unitPrice)+'</p><p>瓶詰め費 '+unit(offer.bottlingFee)+'/本 · 入金目安 '+money(q.count*(offer.unitPrice-offer.bottlingFee))+'</p>':'<p>対象になる樽はありません。</p>')+'<p class="quiet">熟成中に本数は減ります。費用は代金から差引。維持費は通常どおり。出荷前は無料で解除できます。</p>';
  actions=button('契約する','contract',offerCaskId,offerCaskId===null?'disabled':'')+button('今回は断る','decline');
 }else if(kind==='contract'){
  const k=game.trade.contract;if(!k||k.caskId!==id){modal=null;return;}title='この樽の卸売契約';
  body='<p>'+esc(k.partner)+' · '+esc(caskLabel(c))+'</p><p>'+ageLabel(k.targetAge)+'で自動出荷 · '+unit(k.unitPrice)+'/本</p><p>瓶詰め費 '+unit(k.bottlingFee)+'/本を代金から差引</p><p class="quiet">解除は無料。この樽を自分で瓶詰めするなら解除します。</p>';
  actions=button('契約を解除する','cancel-contract',id)+button('戻る','cancel');
 }else if(kind==='decision'){
  const d=game.decisions[0];if(!d){modal=null;if(dialog.open)dialog.close();return;}
  modal.id=d.caskId;const source=D.currentCask(game,d.caskId),pending=d.pending;
  title=pending.title;body='<p>'+esc(caskLabel(source))+' · '+ageLabel(source.age)+'</p>'+(pending.text?'<p>'+esc(pending.text)+'</p>':'')+button('試飲して考える','trial',d.caskId);
  actions=game.trade.contract?.caskId===d.caskId&&d.eventId==='funds'?button('契約を解除して瓶詰めを検討する','cancel-contract',d.caskId):pending.options.map(o=>button(esc(o.id==='bottle'?'瓶詰めを確かめる':o.label)+(o.hint?'<small>'+esc(o.hint)+'</small>':''),o.id==='bottle'?'quote':'choose',d.caskId,'data-choice="'+esc(o.id)+'" data-event="'+esc(d.eventId)+'"')).join('');
 }else if(kind==='fill'){
  title='原酒を樽に詰める';body='<p>'+game.still.distillation.litres.toFixed(1)+' L</p>';
  actions=['bourbon','refill'].map(type=>button('<span class="fill-art">'+barrel(type)+'</span>'+esc(P.casks[type].short)+' · '+money(P.casks[type].cost),'fill',type)).join('');
 }else if(kind==='quote'&&c){
  const q=D.quote(game,id),sample=game.notesById[id].samples.at(-1);title='この樽を瓶に残す';
  body='<p>'+esc(caskLabel(c))+' · '+ageLabel(c.age)+'</p><p class="quote-numbers">'+q.count+'本 · 費用 '+money(q.cost)+'</p><p>瓶詰め後 '+money(game.core.cash-q.cost)+'</p><p class="quiet">維持費 '+money(D.upkeep(game))+'/月 · 残り '+c.litres.toFixed(1)+' L</p><p class="quiet">'+(sample?'試飲 '+ageLabel(sample.age)+' · '+shortTaste(sample).map(esc).join(' · '):'試飲なし')+'</p>';
  actions=button('瓶詰めする','bottle',id,q.count<1||game.core.cash<q.cost?'disabled':'')+button('樽へ戻る','cancel');
 }else if(kind==='product'){
  const p=game.core.products.find(x=>x.id===id),meta=game.productsById[id];if(!p){modal=null;render();return;}
  const prices=D.salePrices(game,id),record=game.records.find(r=>r.productId===id);title=record?.name??'この一本';
  body='<div class="modal-bottle">'+bottleArt(p.wood)+'</div><p>'+ageLabel(p.age)+' · 残り '+p.stock+'本</p><p class="quiet">販売 '+p.sold+'本 · 売上 '+money(p.revenue)+'</p>'+(p.age<6?'<p class="quiet">若い原酒 · 少しずつ販売</p>':'')+(prices.low===prices.standard?'<p class="quiet">最低価格 '+unit(prices.low)+'/本</p>':'');
  actions='<div class="price-options">'+['low','standard','high'].map((tier,i)=>button(['低め','標準','高め'][i]+'<span>'+unit(prices[tier])+'/本</span>','price',id,'data-tier="'+tier+'" aria-pressed="'+(meta.selectedPrice===tier)+'"')).join('')+'</div>'+(meta.listed?button('戻る','cancel'):button('この価格で販売する','list',id));
 }
 $('dialog-title').textContent=title;$('dialog-body').innerHTML=body;$('dialog-actions').innerHTML=actions;$('close-dialog').hidden=kind==='decision';
 if(!dialog.open)dialog.showModal();
}
function render(){
 if(!game)return;
 if(!D.currentCask(game,selectedCaskId))selectedCaskId=game.core.casks[0]?.id??null;
 if(game.tastingId!==null){selectedCaskId=game.tastingId;room='warehouse';}
 syncModal();
 const phase=game.still.phase,tasting=game.tastingId!==null,atLimit=atExtractionLimit();
 document.body.dataset.room=room;document.body.dataset.phase=room==='distill'?(atLimit?'filling':phase):room==='warehouse'?'watching':'selling';document.body.dataset.time=blocked()||!hasMonthlyWork()?'paused':'running';document.body.classList.toggle('is-tasting',tasting&&!modal);
 document.body.style.setProperty('--month-duration',T.monthMs+'ms');document.body.style.setProperty('--month-progress',elapsed/T.monthMs);document.body.style.setProperty('--extraction-progress',(game.still.distillation?.progress??0)/T.distillMax);$('extraction-progress').hidden=phase==='ready';document.body.style.setProperty('--collection',game.still.distillation?.litres/40||0);
 $('game').hidden=false;$('time-flow').hidden=false;$('recovery').hidden=canSave||preview;
 $('cash').textContent=money(game.core.cash);$('calendar').textContent=monthLabel(game.core.month);$('monthly-cost').textContent='維持費 '+money(D.upkeep(game))+'/月';
 for(const name of ['distill','warehouse','sales'])$('room-'+name).hidden=room!==name;
 for(const b of document.querySelectorAll('[data-room]'))b.setAttribute('aria-pressed',String(b.dataset.room===room));
 $('nav-still').textContent=phase==='distilling'?(atLimit?'樽詰め待ち':'蒸留中'):phase==='filling'?'樽詰め待ち':'待機';$('nav-casks').textContent=game.core.casks.length+'樽';$('nav-stock').textContent=listedStock()+'本';
 $('start-distill').hidden=phase!=='ready';$('stop-distill').hidden=phase!=='distilling'||atLimit;$('open-fill').hidden=phase!=='filling'&&!atLimit;
 const start=D.canStart(game);$('start-distill').disabled=!start.ok;$('start-distill').textContent='蒸留を始める '+money(P.distillationCost);
 $('stop-distill').disabled=(game.still.distillation?.progress??0)<T.minimumStop;
 $('collection').textContent=game.still.distillation?game.still.distillation.litres.toFixed(1)+' L':'';
 $('distill-caption').textContent=phase==='ready'?(start.ok?'原酒を集め、抽出の終わりを決めます。':start.reason):phase==='filling'||atLimit?'抽出完了。樽を選んで詰めます。':'原酒を集めています。';
 $('distill-direction').textContent=phase==='distilling'&&!atLimit?game.still.distillation.progress<T.minimumStop?'最初の原酒が集まるまで少し待ちます。':game.still.distillation.progress<70?'少量で切り上げるか、もう少し集めるか。':'量と穀物の個性が増してきました。':phase==='ready'&&start.ok?'早めなら少量で穏やかに。続けると量と個性が増えます。':'';
 const rk=JSON.stringify([game.core.casks.map(c=>[c.id,c.age,c.litres]),selectedCaskId]);
 if(rk!==rackKey){$('cask-rack').innerHTML=game.core.casks.map(c=>'<button type="button" data-cask-id="'+c.id+'" aria-pressed="'+(selectedCaskId===c.id)+'"><span aria-hidden="true">'+barrel(c.type)+'</span><strong>'+caskName(c.id)+'</strong><small>'+ageLabel(c.age)+'</small><small>'+c.litres.toFixed(1)+' L</small></button>').join('');rackKey=rk;}
 const contracted=game.trade.contract?.caskId===selectedCaskId;$('contract-info').hidden=!contracted;$('contract-info').textContent=contracted?'卸売契約 · '+ageLabel(game.trade.contract.targetAge)+'で出荷':'';
 $('open-bottle').textContent=contracted?'卸売契約を確認する':'瓶詰めを考える';$('taste-bottle').textContent=contracted?'卸売契約を確認する':'瓶詰めを考える';
 $('warehouse-empty').hidden=game.core.casks.length>0;$('selected-cask').hidden=selectedCaskId===null;
 if(selectedCaskId!==null){
  const c=D.currentCask(game,selectedCaskId),n=game.notesById[c.id];if(barrelKey!==c.id){$('barrel').innerHTML=barrel(c.type);barrelKey=c.id;}
  $('cask-kind').textContent=caskLabel(c);$('age').textContent=ageLabel(c.age);const gk=c.id+':'+c.wood;if(glassKey!==gk){$('glass').innerHTML=glass(c.wood,{sample:true});glassKey=gk;}$('amount').textContent='残り '+c.litres.toFixed(1)+' L';$('loss').textContent='仕込みから −'+(c.initialLitres-c.litres).toFixed(1)+' L';$('change').textContent=D.observation(game,c.id).change;$('last-taste').textContent=n.samples.length?'最後の試飲 · '+ageLabel(n.samples.at(-1).age):'グラスで、今の味を確かめられます。';
  $('tasting-panel').hidden=!tasting||!!modal;$('free-actions').hidden=tasting||!!modal;
  if(tasting){const comp=D.comparison(game,c.id);$('taste-date').textContent=ageLabel(comp.current.age)+'の試飲';$('taste-current').innerHTML=shortTaste(comp.current).map((t,i)=>'<p><span>'+['口当たり','香り','余韻'][i]+'</span>'+esc(t)+'</p>').join('');$('taste-previous').hidden=false;$('taste-previous').textContent=(comp.previous?'前回 '+ageLabel(comp.previous.age)+'から：':'')+shortChange(comp.current,comp.previous);}
 }
 const sk=JSON.stringify([game.core.products,game.productsById]);if(sk!==shelfKey){$('product-shelf').innerHTML=game.core.products.filter(p=>p.stock>0).map(p=>'<button type="button" data-product-id="'+p.id+'"><span aria-hidden="true">'+bottleArt(p.wood)+'</span><strong>'+esc(game.records.find(r=>r.productId===p.id)?.name??'この一本')+'</strong><small>'+ageLabel(p.age)+' · '+p.stock+'本</small><small>'+unit(p.price)+'/本 · '+(game.productsById[p.id]?.listed?'販売中':'未陳列')+'</small></button>').join('');shelfKey=sk;}
 $('sales-empty').hidden=game.core.products.some(p=>p.stock>0);const last=game.core.lastMonth;$('sales-result').textContent=last?'前月 '+last.bottles+'本 · 売上 '+money(last.revenue):'';
 $('toggle-time').textContent=(!preview&&!canSave)?'保存待ち':(userPaused&&jump===0)||runtimeHalted?(phase==='distilling'&&!atLimit?'蒸留を再開する':'時間を進める'):'時間を止める';$('time-controls').hidden=tasting||!!modal;
 $('toggle-time').disabled=!hasMonthlyWork()||(!preview&&!canSave);$('skip').disabled=!hasMonthlyWork()||phase==='distilling'||jump>0||(!preview&&!canSave);
 $('time-status').textContent=(!preview&&!canSave)?'保存を確認するまで停止中':modal?'判断中 · 時間は停止中':tasting?'試飲中 · 時間は停止中':document.hidden?'画面を離れています':runtimeHalted?'資金を残して停止中':userPaused&&jump===0?'時間は停止中':!hasMonthlyWork()?(phase==='filling'?'抽出完了 · 樽に詰められます':'作業を待っています'):phase==='distilling'?(atLimit?'樽詰め待ち · 熟成・販売は進行中':'蒸留中 · 熟成・販売も進みます'):room==='distill'&&phase==='filling'?'抽出完了 · 熟成・販売は進行中':jump?'3か月を順に進めています':'自動進行 · 約'+T.monthMs/1000+'秒で1か月';
 $('time-change').textContent=last?'前月 維持費 '+money(last.upkeep)+(last.revenue?' · 売上 '+money(last.revenue):''):'';
 const lk=JSON.stringify([game.core.totals,game.notesById,game.trade.history]);if(lk!==ledgerKey){$('ledger-body').innerHTML='<p>売上累計 '+money(game.core.totals.revenue)+' · 維持費累計 '+money(game.core.totals.upkeep)+'</p>'+game.core.casks.map(c=>'<h3>'+esc(caskLabel(c))+'</h3><ol class="sample-history">'+game.notesById[c.id].samples.map((s,i,all)=>'<li><time>'+ageLabel(s.age)+'</time><p>'+s.text.map(esc).join(' · ')+'</p>'+(i?'<p>'+esc(shortChange(s,all[i-1]))+'</p>':'')+'</li>').join('')+'</ol>').join('');$('ledger-body').innerHTML+='<details><summary>取引の記録</summary>'+game.trade.history.filter(x=>x.kind!=='offered').map(x=>'<p>'+monthLabel(x.month)+' · '+esc(({accepted:'卸売契約',declined:'申し出を辞退',cancelled:'契約を解除',shipped:'卸売出荷',ended:'契約終了'})[x.kind])+(x.partner?' · '+esc(x.partner):'')+(x.bottles?' · '+x.bottles+'本':'')+'</p>').join('')+'</details>';ledgerKey=lk;}
 const recordState=JSON.stringify(game.records.map(r=>[r.productId,r.samples,r.choices,r.channel]));if(recordState!==recordKey){$('records-body').innerHTML=game.records.slice().reverse().map(r=>'<article><h3>'+esc(r.name)+'</h3><p>'+ageLabel(r.age)+' · '+r.bottles+'本'+(r.channel==='wholesale'?' · '+esc(r.partner)+'へ出荷':'')+'</p><p id="record-sale-'+r.productId+'"></p><p>'+r.taste.map(esc).join(' · ')+'</p><details><summary>蒸留・試飲・判断</summary><p>'+esc(r.description)+'</p>'+r.samples.map(s=>'<p>'+ageLabel(s.age)+' · '+s.text.map(esc).join(' · ')+'</p>').join('')+r.choices.map(c=>'<p>'+ageLabel(c.age)+' · '+esc(c.text)+'</p>').join('')+'</details></article>').join('');recordKey=recordState;}$('records').hidden=!game.records.length;for(const r of game.records)$('record-sale-'+r.productId).textContent='販売 '+r.sold+'本 · 売上 '+money(r.revenue);
}
$('room-nav').addEventListener('click',e=>{const b=e.target.closest('[data-room]');if(b)selectRoom(b.dataset.room);});
$('go-distill').addEventListener('click',()=>selectRoom('distill'));
$('cask-rack').addEventListener('click',e=>{const b=e.target.closest('[data-cask-id]');if(!b||modal||!D.currentCask(game,Number(b.dataset.caskId)))return;stopClock();endTaste();selectedCaskId=Number(b.dataset.caskId);save();render();schedule();});
$('product-shelf').addEventListener('click',e=>{const b=e.target.closest('[data-product-id]');if(b){selectedProductId=Number(b.dataset.productId);openModal('product',selectedProductId);}});
$('start-distill').addEventListener('click',()=>{if(!game||!D.canStart(game).ok||modal)return;message('');act(D.startDistillation);});
$('stop-distill').addEventListener('click',()=>{if(game?.still.phase==='distilling'&&game.still.distillation.progress>=T.minimumStop&&!modal)act(D.stopDistillation);});$('open-fill').addEventListener('click',()=>{if(atExtractionLimit()&&!modal)act(D.stopDistillation,()=>{modal={kind:'fill'};jump=0;});else openModal('fill');});
$('taste-button').addEventListener('click',()=>trial(selectedCaskId));$('glass-button').addEventListener('click',()=>{if(game?.tastingId===null)trial(selectedCaskId);});
$('end-tasting').addEventListener('click',()=>act(D.endTasting));$('open-bottle').addEventListener('click',()=>quoteModal(selectedCaskId));$('taste-bottle').addEventListener('click',()=>quoteModal(selectedCaskId));
$('contract-info').addEventListener('click',()=>openModal('contract',selectedCaskId));
$('toggle-time').addEventListener('click',()=>{if(jump>0){jump=0;userPaused=true;}else if(runtimeHalted){runtimeHalted=false;}else userPaused=!userPaused;save();render();schedule();});
$('skip').addEventListener('click',()=>{if(!game||(!preview&&!canSave)||document.hidden||modal||game.tastingId!==null||game.decisions.length||runtimeHalted||!hasMonthlyWork()||game.still.phase==='distilling'||jump>0)return;jump=3;schedule();render();});
$('close-dialog').addEventListener('click',closeModal);$('action-dialog').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
$('dialog-actions').addEventListener('click',e=>handleModal(e));$('dialog-body').addEventListener('click',e=>handleModal(e));
function handleModal(e){
 const b=e.target.closest('[data-action]');if(!b||!modal)return;const a=b.dataset.action,id=Number(b.dataset.id),kind=modal.kind;
 if(a==='offer-cask'){if(kind==='offer'){offerCaskId=id;render();}return;}
 if(a==='contract'){if(kind==='offer')act(s=>D.acceptOffer(s,id),()=>{modal=null;selectedCaskId=id;room='warehouse';message('卸売契約を結びました。');});return;}
 if(a==='decline'){if(kind==='offer')act(D.declineOffer,()=>{modal=null;offerCaskId=null;message('今回は見送りました。');});return;}
 if(a==='cancel-contract'){if(game.trade.contract?.caskId===id)act(s=>D.cancelContract(D.endTasting(s)),()=>{modal=null;message('契約を解除しました。');});return;}
 if(a==='cancel'){closeModal();return;}if(a==='trial'){trial(id);return;}if(a==='quote'){quoteModal(id);return;}
 if(a==='choose'){const first=game.decisions[0];if(kind!=='decision'||first?.caskId!==id||first.eventId!==b.dataset.event)return;act(s=>D.chooseDistillery(s,id,b.dataset.choice),()=>{modal=null;message('');});return;}
 if(a==='fill'){if(kind!=='fill')return;act(s=>D.fillBarrel(s,b.dataset.id),()=>{modal=null;selectedCaskId=game.core.casks.at(-1)?.id??null;room='warehouse';message('');});return;}
 if(a==='price'){if(kind!=='product'||modal.id!==id)return;act(s=>D.setSalePrice(s,b.dataset.tier,id));return;}
 if(a==='list'){if(kind!=='product'||modal.id!==id)return;act(s=>D.listBottles(s,id),()=>{modal=null;message('販売を始めました。売上は次の月から。');});return;}
 if(a==='bottle'){
  if(kind!=='quote'||modal.id!==id)return;const label=caskName(id);
  act(s=>D.bottleNow(D.endTasting(s),id),()=>{message(label+'を'+game.result.bottles+'本に瓶詰めしました。');pricingQueue.push(game.result.productId);selectedProductId=game.result.productId;room='sales';modal=null;});return;
 }
}
function suspend(){jump=0;stopClock();save();if(game)render();}
function resume(){if(game){render();schedule();}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else resume();});window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',e=>{if(e.persisted)resume();});
window.addEventListener('storage',e=>{if(!preview&&e.key===SAVE_KEY){canSave=false;suspend();storageNotice('別の画面で保存が変わりました。再読み込みしてください。');}});
$('reset').addEventListener('click',()=>{if(!confirm('0.8の進行を新しくしますか？以前の保存は残ります。'))return;stopClock();try{lastSavedText=preview?null:localStorage.getItem(SAVE_KEY);}catch{storageNotice('保存を確認できないため初期化していません。');return;}game=D.newDistillery(seed);pricingQueue.length=0;room='distill';selectedCaskId=null;modal=null;userPaused=false;runtimeHalted=false;elapsed=0;jump=0;glassKey='';canSave=!preview;storageNotice('');save();render();});
$('retry-save').addEventListener('click',()=>{if(!game){boot();return;}canSave=!preview;if(save()){storageNotice('');$('recovery').hidden=true;}render();schedule();});
function boot(){
 if(preview){game=D.newDistillery(seed);save();render();schedule();return;}
 try{lastSavedText=localStorage.getItem(SAVE_KEY);if(lastSavedText===null){game=D.newDistillery(seed);userPaused=false;}else{const session=JSON.parse(lastSavedText);if(session.version!==1||typeof session.userPaused!=='boolean'||Object.keys(session).length!==3)throw Error('session');game=D.restoreDistillery(JSON.stringify(session.game));userPaused=session.userPaused;}selectedCaskId=game.tastingId??game.core.casks[0]?.id??null;room=selectedCaskId!==null?'warehouse':'distill';canSave=true;if(lastSavedText===null)save();render();schedule();}
 catch{canSave=false;game=null;stopClock();$('game').hidden=true;$('recovery').hidden=false;storageNotice('この保存は開けません。元の記録を残して停止しています。');}
}
boot();
