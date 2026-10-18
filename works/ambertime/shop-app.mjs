import * as D from './partner-orders.mjs?v=0.17';
import {SHOPS} from './shop-model.mjs?v=0.17';
import {caskName,releaseNumber} from './work-context.mjs?v=0.15.2';
import {distillationView,spiritProfile} from './spirit-view.mjs?v=0.14';
import {latestReleaseBrand,brandStats,brandReputation} from './brand-reputation.mjs?v=0.15';
import {PARALLEL_PARAMETERS as T,ECONOMY_PARAMETERS as P} from './economy-parameters.mjs?v=0.7';
import {ageLabel,monthLabel} from './model.mjs';
import {barrel,glass,bottleArt} from './art.mjs?v=0.5';
import {brandArt} from './brand-art.mjs?v=0.11';
import {stillArt} from './distillery-art.mjs?v=0.5';
import {shortTaste,shortChange} from './tasting-view.mjs?v=0.6';
export const SAVE_KEY='sukimastock.ambertime.wholesale.v16';
const LEGACY_KEYS=['sukimastock.ambertime.wholesale.v15','sukimastock.ambertime.wholesale.v14','sukimastock.ambertime.wholesale.v13','sukimastock.ambertime.wholesale.v12','sukimastock.ambertime.wholesale.v11','sukimastock.ambertime.wholesale.v10','sukimastock.ambertime.wholesale.v9','sukimastock.ambertime.wholesale.v8','sukimastock.ambertime.wholesale.v7','sukimastock.ambertime.wholesale.v6','sukimastock.ambertime.wholesale.v5','sukimastock.ambertime.wholesale.v4','sukimastock.ambertime.wholesale.v3'];
const $=id=>document.getElementById(id),money=n=>'£'+Number(n).toLocaleString('en-GB',{maximumFractionDigits:0}),unit=n=>'£'+Number(n).toFixed(2);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query=new URLSearchParams(location.search),preview=query.get('preview')==='1',chosenSeed=Number(query.get('seed')),seed=preview&&Number.isInteger(chosenSeed)&&chosenSeed>0&&chosenSeed<=4294967295?chosenSeed:20261015;
let game=null,room='distill',selectedCaskId=null,selectedProductId=null,userPaused=false,runtimeHalted=false,modal=null,timer=null,generation=0,elapsed=0,jump=0,canSave=!preview,lastSavedText=null;
let offerCaskId=null,offerTermId=null,assignmentTermId=null,shipmentKey='';
let rackKey='',shelfKey='',barrelKey='',glassKey='',ledgerKey='',recordKey='';

let brandDraft=null;
// Ephemeral display only; never stored or used by the simulation.
let completedSpirit=null;
let deliveryNotice='';
// History is a read-only projection in an isolated worker, never save data.
let historyWorker=null,historyRequest=0,historyData=null,historyError='',historyLoading=false;
function openHistory(){
 if(!game||modal)return;stopClock();jump=0;modal={kind:'history',year:null,page:0};historyData=null;historyError='';historyLoading=true;const requestId=++historyRequest;
 try{
  if(!historyWorker){historyWorker=new Worker(new URL('./history-worker.mjs?v=0.16.4',import.meta.url),{type:'module'});historyWorker.onmessage=({data})=>{if(data.requestId!==historyRequest||!['history','history-brand','history-shop'].includes(modal?.kind))return;historyLoading=false;historyData=data.history??null;historyError=data.error?'歩みを読み込めませんでした。':'';render();};historyWorker.onerror=()=>{if(!historyLoading)return;historyLoading=false;historyError='歩みを読み込めませんでした。';historyWorker?.terminate();historyWorker=null;if(modal?.kind==='history')render();};}
  historyWorker.postMessage({requestId,state:game});
 }catch{historyLoading=false;historyError='歩みを読み込めませんでした。';}
 render();
}
const historyYears=()=>[...new Set((historyData?.events??[]).map(e=>monthLabel(e.month).split('年')[0]))];
function historyEventText(e){
 if(e.kind==='generation-start')return generationName(e.generationNumber??e.generationId??1)+'が蒸留所を始めた';
 if(e.kind==='generation-handover')return generationName(e.generationNumber??e.generationId)+'から'+generationName(e.nextGeneration??e.nextGenerationNumber??e.nextGenerationId??(e.generationNumber??e.generationId)+1)+'へ引継ぎ';
 if(e.kind==='generation-fixed')return generationName(e.generationNumber??e.generationId)+'の最後の仕込みを決めた'+(e.trigger?.kind==='tenure-limit'?' · 在任期限':e.trigger?.kind==='funds-stalled'?' · 資金の状況':'');
 const brand=e.brandName??(game.brands.find(b=>b.id===e.brandId)?.name),name=brand? '「'+brand+'」':'';
 const number=e.releaseNumber??(e.productId!==undefined?releaseNumber(game,e.productId):null),release=number?' · 発売'+number:'',count=Number.isFinite(e.count)?' · '+e.count+'本':'',age=Number.isFinite(e.age)?' · '+ageLabel(e.age):'';
 const first=historyData?.coverage?.complete&&historyData.events.find(x=>x.kind==='distillation')?.id===e.id;
 const kinds={distillation:first?'初めての蒸留':'蒸留',fill:'樽詰め',bottling:e.rerelease?'再発売の瓶詰め':'瓶詰め','retail-first-sale':'自家販売で初めて売れた','shop-start':'取扱い開始','shop-delivery':'納品','department-adoption':(e.projectName??'特選ウイスキー')+'に採用','wholesale-start':'卸売の取引開始','wholesale-shipment':'卸売出荷','special-order-accepted':'特別注文を受注','special-order-fulfilled':'特別注文を出荷','special-order-cancelled':'特別注文を取消','special-order-unmet':'特別注文の風味を確認','special-order-resolved':'特別注文の販売方法を選択'};
 const extraction=Number.isInteger(e.stopAt)?'抽出位置 '+e.stopAt+' / '+T.distillMax:Number.isFinite(e.cut)?'抽出'+Math.round(e.cut*100)+'%':({early:'早め抽出',middle:'中盤抽出',late:'後半抽出'}[e.cut]??'');
 const type=P.casks[e.type]?.short,profile=e.kind==='distillation'?spiritProfile({...e.profile,litres:0})?.phrase:null;
 return name+(name?' · ':'')+(Number.isInteger(e.caskId)?caskName(e.caskId)+' · ':'')+(e.kind==='distillation'&&extraction?extraction+' · ':'')+(type?type+' · ':'')+(e.shopId?shopName(e.shopId)+' · ':e.partner?e.partner+' · ':'')+(kinds[e.kind]??'記録')+release+age+count+(Number.isFinite(e.revenue)?' · '+unit(e.revenue):'')+(profile?' · '+profile:'')+(e.generationTrigger?' · '+generationName(e.generationTrigger)+'の最後の仕込みを決めた':'')+(e.finalGeneration?' · '+generationName(typeof e.finalGeneration==='number'?e.finalGeneration:e.finalGeneration.id??e.generationNumber)+'の最後の仕込み':'');
}
function historyView(){
 if(historyLoading)return '<p role="status">読込中</p>';
 if(historyError)return '<p role="status">'+esc(historyError)+'</p>';
 if(!historyData)return '';
 const months=historyData.elapsedMonths,years=historyYears(),selected=modal.year;
 let out='<p class="history-elapsed">'+Math.floor(months/12)+'年'+(months%12)+'か月</p>';
 if(historyData.coverage?.notes?.length)out+='<p class="quiet history-coverage">'+historyData.coverage.notes.map(esc).join('<br>')+'</p>';
 if(!years.length)return out+'<p>まだ歩みの記録はありません。</p>';
 out+='<div class="history-years">'+years.map(y=>'<section class="history-year"><h3>'+button(y+'年','history-year',y,'aria-expanded="'+(selected===y)+'"')+'</h3>'+(selected===y?historyYearEvents(y):'')+'</section>').join('')+'</div>';
 return out;
}
function historyYearEvents(year){
 const events=historyData.events.filter(e=>monthLabel(e.month).split('年')[0]===year),page=modal.page??0,start=page*50;
 return '<ol class="history-events">'+events.slice(start,start+50).map(e=>'<li data-history-event="'+esc(e.id)+'"><time>'+monthLabel(e.month)+'</time><p>'+esc(historyEventText(e))+'</p><div class="history-links">'+(e.brandId!==undefined&&e.brandId!==null?button('銘柄の記録','history-brand',e.brandId):'')+(e.shopId?button('取扱店の記録','history-shop',e.shopId):'')+'</div></li>').join('')+'</ol>'+(events.length>50?'<div class="history-pagination">'+button('前の50件','history-page',page-1,page===0?'disabled':'')+'<span>'+(start+1)+'–'+Math.min(start+50,events.length)+' / '+events.length+'件</span>'+button('次の50件','history-page',page+1,start+50>=events.length?'disabled':'')+'</div>':'');
}
function historyBrandView(brandId){
 const brand=game.brands.find(b=>b.id===brandId);if(!brand)return '<p>この銘柄の記録はありません。</p>';
 return '<div class="brand-history-art">'+brandArt(0,brand)+'</div>'+game.releases.filter(r=>r.brandId===brandId).map(r=>'<p>'+releaseTag(r.productId)+' · '+monthLabel(r.bottledMonth)+' · '+ageLabel(r.age)+' · '+r.bottles+'本</p>').join('')+(historyData?.events??[]).filter(e=>e.brandId===brandId&&e.kind==='department-adoption').map(e=>'<p>'+monthLabel(e.month)+' · '+esc(e.projectName??'特選ウイスキー')+'に採用'+(e.releaseNumber?' · 発売'+e.releaseNumber:e.productId!==undefined?' · '+releaseTag(e.productId):'')+'</p>').join('')+(historyData?.shops??[]).filter(r=>r.brandId===brandId).map(r=>'<p>'+button(shopName(r.shopId)+'の記録','history-shop',r.shopId)+'</p>').join('');
}
function historyShopView(shopId){
 const rows=(historyData?.shops??[]).filter(r=>r.shopId===shopId);
 return rows.length?rows.map(r=>'<article class="history-shop-brand"><h3>'+esc(r.brandName??'銘柄')+'</h3>'+(Number.isInteger(r.startedMonth)?'<p>取扱い開始 '+monthLabel(r.startedMonth)+'</p>':'')+'<p>納品 '+r.deliveries+'回 · '+r.bottles+'本 · '+unit(r.revenue)+'</p>'+(Number.isInteger(r.firstDeliveryMonth)?'<p>初回納品 '+monthLabel(r.firstDeliveryMonth)+'</p>':'')+(Number.isInteger(r.lastDeliveryMonth)?'<p>最終納品 '+monthLabel(r.lastDeliveryMonth)+'</p>':'')+button('銘柄の記録','history-brand',r.brandId)+'</article>').join(''):'<p>まだ納品の記録はありません。</p>';
}
const generationName=id=>id===1?'初代':({2:'二代',3:'三代',4:'四代',5:'五代',6:'六代',7:'七代',8:'八代',9:'九代',10:'十代'}[id]??id+'代');
const generationState=()=>game?D.generationStatus(game):null;
function provenanceLabel(caskId){const g=D.finalBatchProvenance(game,caskId);return g?generationName(g.id)+'の最後の仕込み':'';}
const provenanceTag=caskId=>{const label=provenanceLabel(caskId);return label?'<small class="generation-provenance">'+esc(label)+'</small>':'';};
function showGeneration(){
 const g=generationState();if(!g||g.phase==='working'||g.phase==='last-batch'&&!g.needsNotice)return false;
 if(g.phase==='last-batch'&&game.still.phase!=='ready')return false;
 stopClock();jump=0;const before=game;
 try{if(g.needsNotice){game=D.noticeGeneration(game,g.id);if(!save()){game=before;return false;}}modal={kind:g.phase==='review'?'generation-review':'generation-notice',id:g.id};return true;}
 catch(e){game=before;storageNotice(e.message);return false;}
}
function generationCauseText(g){
 const t=g.trigger;if(!t)return '';
 const r=game.releases.find(r=>r.id===t.releaseId||r.productId===t.productId),brand=game.brands.find(b=>b.id===(t.brandId??r?.brandId)),record=game.records.find(r=>r.productId===t.productId);
 if(t.kind==='brand-rerelease')return (brand?.name??'銘柄')+'を再発売'+(r?' · '+releaseTag(r.productId):'');
 if(t.kind==='mature-bottling'){const age=r?.age??record?.age;return (Number.isFinite(age)?ageLabel(age)+'熟成の原酒を':'熟成した原酒を')+'瓶詰め';}
 if(t.kind==='long-shop-delivery')return shopName(t.shopId)+'へ納品'+(brand?' · '+brand.name:'');
 if(t.kind==='tenure-limit')return '在任期限';
 if(t.kind==='funds-stalled')return '資金の状況';
 return '';
}
function generationReview(g){
 let text='<p>'+monthLabel(g.startedMonth)+'から'+monthLabel(game.core.month)+'まで · '+Math.floor(g.tenureMonths/12)+'年'+g.tenureMonths%12+'か月</p>';
 const cause=generationCauseText(g);if(cause)text+='<p>区切り · '+esc(cause)+' · '+monthLabel(g.fixedMonth)+'</p>';
 text+=g.lastStatus==='filled'&&g.lastCaskId!==null?'<p>'+esc(caskName(g.lastCaskId))+' · '+esc(generationName(g.id))+'の最後の仕込み</p>':g.lastStatus==='unfinished'?'<p>最後の仕込みは、樽詰め前のまま次の代へ引き継ぎます。</p>':'<p>最後の一樽を仕込まず、次の代へ引き継ぎます。</p>';
 const reason={'grace-ended':'仕込みの猶予を終えました。','funds-stalled':'資金を残して、次の代へ引き継ぎます。'};if(reason[g.reason])text+='<p class="quiet">'+esc(reason[g.reason])+'</p>';
 if(g.lastStatus==='not-made'&&game.still.phase!=='ready')text+='<p class="quiet">進行中の蒸留・原酒は、そのまま引き継ぎます。</p>';
 return text;
}
const releaseFor=id=>game.releases.find(r=>r.productId===id);
const releaseTag=id=>{const n=releaseNumber(game,id);return n===null?'':'発売'+n;};
const brandFor=id=>game.brands.find(b=>b.id===releaseFor(id)?.brandId);
const productArt=p=>brandFor(p.id)?brandArt(p.wood,brandFor(p.id)):bottleArt(p.wood);
function draftFor(id){if(!brandDraft||brandDraft.caskId!==id)brandDraft={caskId:id,brandId:latestReleaseBrand(game)?.id??null,...D.defaultBrand(game)};return brandDraft;}
function brandFields(id){const draft=draftFor(id),existing=game.brands.find(b=>b.id===draft.brandId);return '<div class="brand-form"><label for="brand-choice">銘柄</label><select id="brand-choice"><option value="new"'+(!existing?' selected':'')+'>新しい銘柄を作る</option>'+game.brands.map(b=>'<option value="'+b.id+'"'+(existing?.id===b.id?' selected':'')+'>'+esc(b.name)+'として出す</option>').join('')+'</select>'+(existing?'<div class="brand-preview">'+brandArt(0,existing)+'<strong>'+esc(existing.name)+'</strong></div>':'<label for="brand-name">銘柄名</label><input id="brand-name" maxlength="40" value="'+esc(draft.name)+'"><details class="brand-appearance"><summary>ボトル・ラベルを選ぶ</summary><div class="brand-preview">'+brandArt(0,draft)+'</div><label for="brand-bottle">ボトル</label><select id="brand-bottle">'+D.BRAND_BOTTLES.map(b=>'<option value="'+b.id+'"'+(b.id===draft.bottle?' selected':'')+'>'+esc(b.name)+'</option>').join('')+'</select><label for="brand-label">ラベル</label><select id="brand-label">'+D.BRAND_LABELS.map(b=>'<option value="'+b.id+'"'+(b.id===draft.label?' selected':'')+'>'+esc(b.name)+'</option>').join('')+'</select></details>')+'</div>';}
function brandHistory(){return game.brands.length?'<details class="brand-history"><summary>銘柄と発売の記録 · '+game.brands.length+'銘柄</summary>'+game.brands.map(b=>'<article><h3>'+esc(b.name)+'</h3><div class="brand-history-art">'+brandArt(0,b)+'</div>'+brandSummary(b.id)+shopHistory(b.id)+game.releases.filter(r=>r.brandId===b.id).map((r,i)=>'<p>'+provenanceTag(r.caskId)+'発売'+(i+1)+' · '+caskName(r.caskId)+' · '+monthLabel(r.bottledMonth)+' · '+ageLabel(r.age)+' · '+r.bottles+'本</p><p class="quiet">'+(r.status==='sold-out'?'完売':r.listed?'販売中':'保管中')+' · 販売 '+r.sold+'本 / '+r.bottles+'本 · '+unit(r.price)+'/本 · 売上 '+money(r.revenue)+'</p>').join('')+'</article>').join('')+'</details>':'';}
function brandSummary(id){const stats=brandStats(game,id);return '<p>'+esc(brandReputation(game,id).label)+'</p><p class="quiet">発売 '+stats.releases+'回 · 自家販売 '+stats.sold+'本 · 完売 '+stats.soldOut+'回<br>累計売上 '+money(stats.revenue)+' · 販売中の在庫 '+stats.sellingStock+'本</p>';}
const shopTerms=id=>{if(id==='department')return '24か月以上 · 刺激が穏やか · 特選ウイスキー 5本';const s=SHOPS.find(x=>x.id===id);return s?(s.minAge?s.minAge+'か月以上 · ':'')+(s.maxRoughness!==null?'刺激が穏やか · ':'')+s.minQuantity+'本から · 月'+s.monthlyLimit+'本まで':'';};
const shopName=id=>SHOPS.find(s=>s.id===id)?.name??'取扱店';
const offerTarget=o=>'data-shop-id="'+esc(o.shopId)+'" data-offer-id="'+o.id+'"';
const shopOffers=()=>[game.shop.offer,...(game.shop.pendingOffers??[])].filter(Boolean);
function departmentHistory(id){return D.departmentInterests(game,id).map(i=>'<p>特選ウイスキー · 取扱いの相談</p>'+button('相談を終える','department-cancel','', 'data-selection-id="'+esc(i.selectionId)+'"')).join('')+D.departmentAdoptions(game,id).map(a=>'<p class="department-adoption">'+monthLabel(a.month)+' · '+esc(a.projectName??'特選ウイスキー')+'に採用 · '+releaseTag(game.releases.find(r=>r.id===a.releaseId)?.productId)+' · '+a.count+'本 · '+money(a.revenue)+'</p>').join('');}
function shopHistory(id){return departmentHistory(id)+SHOPS.map(shop=>{const r=D.shopBrandStats(game,id,shop.id);if(!r)return '';return '<p class="shop-relation">'+esc(shop.name)+(shop.id==='department'?' · 取扱関係あり':'で取扱中')+'</p><details class="shop-history"><summary>累計納品 '+r.bottles+'本 · '+money(r.revenue)+'</summary><p class="quiet">'+monthLabel(r.startedMonth)+'から</p>'+r.history.map(d=>'<p>'+monthLabel(d.month)+' · '+releaseTag(d.productId)+' · '+d.count+'本 · '+money(d.revenue)+'</p>').join('')+'</details>';}).join('');}
const atExtractionLimit=()=>game?.still.phase==='distilling'&&game.still.distillation.progress>=T.distillMax-1;
$('still').innerHTML=stillArt();
const message=t=>{$('work-notice').textContent=t;};
function storageNotice(t){$('storage-notice').textContent=t;$('storage-notice').hidden=!t;}
function stopClock(){generation++;if(timer!==null){clearTimeout(timer);timer=null;}}
function save(){
 if(preview){$('save-status').textContent='試遊中 · 保存しません';return true;}
 if(!game||!canSave)return false;
 try{const text=JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(game)),userPaused,elapsed});if(localStorage.getItem(SAVE_KEY)!==lastSavedText)throw Error('conflict');localStorage.setItem(SAVE_KEY,text);if(localStorage.getItem(SAVE_KEY)!==text)throw Error('write');lastSavedText=text;$('save-status').textContent='保存しました';return true;}
 catch{canSave=false;jump=0;stopClock();storageNotice('保存できません。元の記録を残して停止しています。');$('save-status').textContent='未保存';$('retry-save').hidden=false;$('recovery').hidden=false;return false;}
}
const bottleStock=()=>game.core.products.reduce((sum,p)=>sum+p.stock,0);
const hasMonthlyWork=()=>game&&(game.core.casks.length>0||game.core.products.some(p=>p.stock>0)||game.still.phase==='distilling'||D.usualNeedsClock(game)||D.generationNeedsClock(game));
const blocked=()=>!game||generationState()?.phase==='review'||(!preview&&!canSave)||(userPaused&&jump===0)||runtimeHalted||document.hidden||modal!==null||game.tastingId!==null||game.decisions.length>0||game.trade.offer!==null;
function schedule(){
 stopClock();if(blocked()||!hasMonthlyWork())return;const token=generation,expectedMonth=game.core.month;
 timer=setTimeout(()=>{
  if(token!==generation)return;timer=null;if(blocked())return;
  try{
   if(D.canBeginUsual(game).ok){jump=0;game=D.beginUsual(game);completedSpirit=null;if(!save())return;message('いつもの仕込みを始めました。');}
   const wasAutomatic=game.usual.reservation?.status==='active',wasDistilling=game.still.phase==='distilling';
   if(wasDistilling){const before=game.still.distillation.progress,batchId=game.core.spirit?.id;game=D.distillStep(game);if(wasAutomatic&&!game.usual.reservation){const newborn=game.core.casks.find(c=>c.batchId===batchId);completedSpirit=spiritProfile(newborn);}if(!wasAutomatic&&before<T.distillMax-1&&game.still.distillation.progress>=T.distillMax-1)message('抽出がいっぱいになりました。樽に詰められます。');}
   elapsed+=jump?T.monthMs/5:T.distillStepMs;
   const completed=wasAutomatic&&!game.usual.reservation;
   if(elapsed>=T.monthMs){const before=game.core.month;game=D.tickDistillery(game,expectedMonth);elapsed=0;if(game.core.month===before&&!game.decisions.length&&generationState()?.phase!=='review'){runtimeHalted=true;message('資金を残して停止しています。樽詰めや販売を確かめられます。');}if(game.core.month!==before){const ships=game.trade.lastShipments.filter(x=>x.month===game.core.month),key=game.core.month+':'+ships.map(x=>x.productId).join(',');if(ships.length&&shipmentKey!==key){shipmentKey=key;message('卸売出荷 '+ships.reduce((n,x)=>n+x.bottles,0)+'本 · 入金 '+money(ships.reduce((n,x)=>n+x.net,0)));document.body.classList.add('just-shipped');setTimeout(()=>document.body.classList.remove('just-shipped'),1200);}else {const obs=game.trade.lastObservations??[];message(obs.map(x=>caskName(x.caskId)+' · '+(x.title??x.text??'熟成が変化しました')).join(' / '));}}if(jump>0)jump--;save();}
   else if(wasDistilling&&(game.still.phase!=='distilling'||game.still.distillation.progress%5===0))save();
   if(completed){message('いつもの仕込みを一樽、樽に詰めました。');save();}
   if(game.decisions.length||game.trade.offer||!hasMonthlyWork())jump=0;
   render();schedule();
  }catch(e){runtimeHalted=true;jump=0;storageNotice(e.message);render();}
 },T.distillStepMs);
}
function act(fn,after){stopClock();try{const previous=distillationView(game);game=fn(game);if(game.still.phase==='distilling')completedSpirit=null;else if(previous?.phase==='confirmed'&&game.still.phase==='ready')completedSpirit=previous;runtimeHalted=false;if(after)after();save();render();schedule();return true;}catch(e){storageNotice(e.message);render();schedule();return false;}}
function endTaste(){if(game?.tastingId!==null)game=D.endTasting(game);}
function selectRoom(next){if(!game||!['distill','warehouse','sales'].includes(next)||modal)return;stopClock();endTaste();room=next;jump=0;save();render();schedule();}
// The visible serial is the immutable identity, including after shipment.
const caskLabel=c=>caskName(c.id)+' · '+P.casks[c.type].short;
const button=(text,action,id='',extra='')=>'<button type="button" data-action="'+action+'" data-id="'+id+'" '+extra+'>'+text+'</button>';
function openModal(kind,id=null){if(!game||modal||kind==='fill'&&game.still.phase!=='filling')return;stopClock();jump=0;deliveryNotice='';modal={kind,id};render();}
// A notice is recorded before showing it, so deferring or reloading never
// repeats the automatic interruption. Pause intent belongs to userPaused.
function showShopOffer(productId=null){
 if(!game?.shop.offer||game.trade.offer||game.tastingId!==null||(!preview&&!canSave))return false;
 stopClock();jump=0;const before=game;
 try{if(!game.shop.offer.notified){game=D.noticeShopOffer(game,game.shop.offer.shopId,game.shop.offer.id);if(!save()){game=before;return false;}}modal={kind:'shop-offer',productId,returnProductId:productId,shopId:game.shop.offer.shopId,offerId:game.shop.offer.id};deliveryNotice='';return true;}
 catch(e){game=before;runtimeHalted=true;storageNotice(e.message);return false;}
}
function deliveryButtons(p,q,action){return '<div class="delivery-options">'+q.quantities.map(n=>button(n+(action==='shop-accept-deliver'?(q.shopId==='department'?'本届ける':'本届けて始める'):'本届ける')+'<small>残り '+(p.stock-n)+'本 · 入金 '+unit(Math.round(n*q.unitPrice*100)/100)+'</small>',action,p.id,'data-count="'+n+'" data-shop-id="'+esc(q.shopId??modal.shopId)+'" data-offer-id="'+(modal.offerId??'')+'" data-selection-id="'+esc(q.selectionId??'')+'"')).join('')+'</div>';}
function offerInventory(){
 const offer=game.shop.offer; if(offer.shopId==='department')return departmentOfferInventory(offer);
 const items=game.releases.filter(r=>r.brandId===offer.brandId).map((r,i)=>({r,index:i+1,p:game.core.products.find(p=>p.id===r.productId)})).filter(x=>x.p?.stock>0).reverse();
 if(!items.length)return '<p class="quiet">在庫はありません。取扱いだけ始め、次の発売から届けられます。</p>';
 let item=items.find(x=>x.p.id===modal.productId)??items[0];modal.productId=item.p.id;
 const {p,r,index}=item,q=D.shopOfferQuote(game,p.id,offer.shopId);
 return (items.length>1?'<label for="shop-release">届ける発売回</label><select id="shop-release">'+items.map(x=>'<option value="'+x.p.id+'"'+(p.id===x.p.id?' selected':'')+'>発売'+x.index+' · '+ageLabel(x.p.age)+' · 在庫'+x.p.stock+'本</option>').join('')+'</select>':'<p>発売'+index+' · '+ageLabel(r.age)+' · 在庫 '+p.stock+'本</p>')+(q.ok?'<p>買取 '+unit(q.unitPrice)+'/本</p>'+deliveryButtons(p,q,'shop-accept-deliver'):'<p class="quiet">'+esc(q.reason)+'</p>');
}
function departmentOfferInventory(offer){
 const releases=game.releases.filter(r=>r.brandId===offer.brandId),items=releases.map((r,i)=>({r,index:i+1,p:game.core.products.find(p=>p.id===r.productId)})).filter(x=>x.p?.stock>0).reverse();
 const source=releases.find(r=>r.id===offer.sourceReleaseId),item=items.find(x=>x.p.id===modal.productId)??items.find(x=>D.shopOfferQuote(game,x.p.id,offer.shopId).ok)??items[0];
 if(!item){modal.productId=null;return (source?'<p>対象 発売'+(releases.indexOf(source)+1)+' · '+ageLabel(source.age)+'</p>':'')+'<p>取扱本数 5本 · 在庫 0本</p><p>買取 標準価格の140%</p><p class="quiet">次の発売で、改めて納品を選べます。</p>';}
 const {p,r,index}=item,q=D.shopOfferQuote(game,p.id,offer.shopId);modal.productId=p.id;
 return (items.length>1?'<label for="shop-release">届ける発売回</label><select id="shop-release">'+items.map(x=>'<option value="'+x.p.id+'"'+(p.id===x.p.id?' selected':'')+'>発売'+x.index+' · '+ageLabel(x.r.age)+' · 在庫'+x.p.stock+'本</option>').join('')+'</select>':'<p>対象 発売'+index+' · '+ageLabel(r.age)+'</p>')+'<p>取扱本数 5本 · 買取 '+unit(q.unitPrice)+'/本</p>'+(p.stock>=5?'<p>納品後の在庫 '+(p.stock-5)+'本</p>':'<p>在庫 '+p.stock+'本</p>')+(q.ok?deliveryButtons(p,q,'shop-accept-deliver'):'<p class="quiet">'+esc(q.reason)+'</p>');
}
function departmentDestination(p,release,invitation){
 const interests=D.departmentInterests(game,release?.brandId),interest=interests[0],adoptions=D.departmentAdoptions(game,release?.brandId),adopted=adoptions.some(a=>a.releaseId===release?.id),q=D.shopQuote(game,p.id,'department');
 let body='<section class="sales-destination shop-delivery" data-destination="department"><h3>'+esc(shopName('department'))+'</h3><p class="quiet">'+esc(shopTerms('department'))+'</p>';
 if(interest){body+='<p>'+ (q.ok?'限定企画への納品可能':'取扱いの相談')+' · 特選ウイスキー</p><p>5本 · '+unit(q.unitPrice)+'/本</p>'+(q.ok?deliveryButtons(p,q,'shop-deliver'):'<p class="quiet">'+esc(q.reason)+'</p>')+button('相談を終える','department-cancel',p.id,'data-selection-id="'+esc(interest.selectionId)+'"');}
 else if(invitation)body+=button('限定取扱いの相談を確認する','shop-open-offer','',invitation===game.shop.offer?'':'disabled')+(invitation===game.shop.offer?'':'<p class="quiet">先の申し出から順に確認できます。</p>');
 else body+='<p>'+(adopted?'今回の企画は完了':adoptions.length?'過去に採用実績あり':'申し出待ち')+'</p><p>5本 · '+unit(q.unitPrice)+'/本</p><p class="quiet">'+esc(q.reason??shopTerms('department'))+'</p>';
 body+=D.departmentAdoptions(game,release?.brandId).length?'<p class="quiet">過去に採用実績あり · 銘柄の記録で確認できます。</p>':'';return body+'</section>';
}
function closeModal(){if(modal?.kind==='generation-review')return;if(['history','history-brand','history-shop'].includes(modal?.kind)){historyRequest++;if(historyLoading){historyWorker?.terminate();historyWorker=null;historyLoading=false;}}if(modal?.kind==='decision')return;if(modal?.kind==='offer'){act(D.declineOffer,()=>{modal=null;offerCaskId=null;});return;}modal=modal?.kind==='shop-offer'&&modal.returnProductId!==null?{kind:'product',id:modal.returnProductId}:null;render();schedule();}
function trial(id){if(!game||!D.currentCask(game,id))return;stopClock();jump=0;if(game.tastingId!==null&&game.tastingId!==id)endTaste();selectedCaskId=id;room='warehouse';modal=null;act(s=>D.sampleDistillery(s,id));}
function quoteModal(id){if(!D.currentCask(game,id))return;if(game.trade.order?.status==='unmet'&&game.trade.order.caskId===id){act(D.endTasting,()=>{modal=null;message('先に、この樽の販売方法を選びます。');});return;}if(D.contractFor(game,id)){stopClock();modal={kind:'contract-bottle',id};jump=0;render();return;}stopClock();modal={kind:'quote',id};jump=0;render();}
function termButtons(terms,selected,action){return '<div class="trade-terms">'+terms.map(t=>button(ageLabel(t.targetAge)+'<small>'+unit(t.unitPrice)+'/本 · 費用 '+unit(t.bottlingFee)+'/本</small>',action,t.id,'aria-pressed="'+(t.id===selected)+'"')).join('')+'</div>';}
function termEstimate(id,term){
 if(!term)return '';const q=id===null?null:D.quote(game,id);
 return (q?'<p>'+q.count+'本なら 売上 '+money(q.count*term.unitPrice)+' · 入金 '+money(q.count*(term.unitPrice-term.bottlingFee))+'</p>':'')+'<p class="quiet">'+ageLabel(term.targetAge)+'で自動出荷。本数は蒸発で減ります。瓶詰め費は代金から差引。維持費は通常どおり。出荷前は無料で解除できます。</p>';
}
function orderDescription(order){
 return '<div class="order-brief"><strong>特別注文 · 1樽</strong><p>'+ageLabel(order.targetAge)+' · '+unit(order.unitPrice)+'/本 · 瓶詰め費 '+unit(order.bottlingFee)+'/本</p><p>'+D.SPECIAL_ORDER.taste.map(esc).join('<br>')+'</p><p class="quiet">条件が合えば自動出荷。合わなければ、通常卸売か自分で販売するか選べます。</p></div>';
}
function orderStatus(order){return order.status==='accepted'?'樽は未指定':order.status==='unmet'?'風味を確認 · 販売方法を選択':caskName(order.caskId)+' · 出荷予定';}
function syncModal(){
 const dialog=$('action-dialog');
 if(!modal&&game.tastingId===null&&game.decisions.length){const d=game.decisions[0];modal={kind:'decision',id:d.caskId};selectedCaskId=d.caskId;}
 if(!modal&&game.tastingId===null&&!game.decisions.length&&game.trade.offer)modal={kind:'offer'};
 if(!modal&&game.shop.offer&&!game.shop.offer.notified&&game.tastingId===null&&!game.decisions.length&&!game.trade.offer&&game.still.phase==='ready'&&!document.hidden&&!runtimeHalted&&(preview||canSave))showShopOffer();
 if(!modal&&game.tastingId===null&&!game.decisions.length&&!game.trade.offer&&(!game.shop.offer||game.shop.offer.notified)&&!document.hidden&&(preview||canSave))showGeneration();
 if(!modal){if(dialog.open)dialog.close();return;}
 const {kind,id}=modal,c=D.currentCask(game,id);let title='',body='',actions='';
 if(kind==='generation-notice'||kind==='generation-review'){
  const g=generationState();if(!g||g.id!==id||g.phase==='working'){modal=null;return;}title=generationName(g.id)+(kind==='generation-review'?'の歩み':'の最後の仕込み');
  body=kind==='generation-review'?generationReview(g):'<p>'+monthLabel(g.fixedMonth)+' · '+esc(generationCauseText(g))+'</p><p>樽詰め期限 '+monthLabel(g.fixedMonth+12)+'。難しい場合は今ある原酒を引き継ぎます。</p>'+(game.usual.reservation?.status==='queued'?'<p class="quiet">いつもの仕込みの予約は、次の代へ引き継ぎます。</p>':'');
  actions=kind==='generation-review'?button('次の代へ引き継ぐ','generation-handover',g.id)+button('蒸留所の歩み','generation-history',g.id):button('仕込みへ','generation-continue',g.id);
 }else if(kind==='history'||kind==='history-brand'||kind==='history-shop'){
  title=kind==='history'?'蒸留所の歩み':kind==='history-brand'?(game.brands.find(b=>b.id===modal.brandId)?.name??'銘柄の記録'):shopName(modal.shopId)+'の記録';
  body=kind==='history'?historyView():kind==='history-brand'?historyBrandView(modal.brandId):historyShopView(modal.shopId);
  actions=(kind==='history'?'':button('歩みへ戻る','history-back'))+button('閉じる','cancel');
 }else if(kind==='shop-offer'){
  const offer=game.shop.offer,brand=game.brands.find(b=>b.id===offer?.brandId);if(!offer||!brand){modal=null;return;}const department=offer.shopId==='department';title=shopName(offer.shopId)+(department?'からの相談':'から');body='<p class="quiet">'+esc(shopTerms(offer.shopId))+'</p><p>「'+esc(brand.name)+'」を、'+(department?'今回の特選ウイスキーとして5本扱わせていただけませんか？':'うちの店でも扱ってみませんか？')+'</p>'+offerInventory()+'<p class="quiet shop-deferral">'+(department?'相談を残しても、納品の義務はありません。':'後回しの間も、自分の棚での販売は続きます。')+'</p>';actions=button(department?'相談を残す':'取扱いだけ始める · 納品はあとで','shop-accept','',offerTarget(offer))+button('あとで考える','shop-later','',offerTarget(offer))+button('今回は断る','shop-decline','',offerTarget(offer));
 }else if(kind==='offer'){
  const offer=game.trade.offer;if(!offer){modal=null;return;}
  const terms=offer.terms;if(!terms.some(t=>t.id===offerTermId))offerTermId=terms[0]?.id;
  const term=terms.find(t=>t.id===offerTermId);
  title=offer.partner+'からの申し出';
  if(offer.kind==='special'){
   body='<p>熟した果実の香りが豊かな一本を、1樽お願いできませんか。</p>'+orderDescription(offer)+'<p class="quiet">樽は、受注後に選べます。辞退しても通常の取引は続きます。</p>';
   actions=button('注文を受ける','contract')+button('今回は断る','decline');
  }else{
   body='<p>'+(offer.kind==='terms'?'次の納品に、新しい条件はいかがでしょう。':'出荷されたウイスキーを仕入れました。継続してお取引できませんか。')+'</p>'+termButtons(terms,offerTermId,'offer-term');
   if(offer.kind!=='terms')body+=termEstimate(null,term)+'<p class="quiet">樽は、取引開始後に選べます。</p>';
   else body+='<p class="quiet">指定済みの樽の条件は変わりません。</p>';
   actions=button(offer.kind==='terms'?'新しい条件で続ける':'取引を始める','contract')+button('今回は断る','decline');
  }
 }else if(kind==='assign'){
  const relation=game.trade.relationship;if(!c||!relation||relation.status!=='active'){modal=null;return;}
  const terms=relation.terms;if(!terms.some(t=>t.id===assignmentTermId))assignmentTermId=terms[0]?.id;
  const term=terms.find(t=>t.id===assignmentTermId),eligible=D.contractCandidates(game,term).some(x=>x.id===id);
  title=caskLabel(c)+'を卸売へ';body='<p>'+esc(relation.partner)+'</p>'+termButtons(terms,assignmentTermId,'assign-term')+termEstimate(id,term)+(eligible?'':'<p>出荷まで3か月以上ある樽を指定できます。</p>');
  actions=button('通常卸売へ指定する','assign',id,eligible?'':'disabled');
  const order=game.trade.order;if(order?.status==='accepted'){const ready=D.orderCandidates(game).some(x=>x.id===id);body+=orderDescription(order);actions+=button('この樽を特別注文へ指定する','assign-order',id,ready?'':'disabled');}
  actions+=button('樽へ戻る','cancel');
 }else if(kind==='trade'||kind==='end-trade'){
  const relation=game.trade.relationship;if(!relation){modal=null;return;}
  title=kind==='end-trade'?'取引を終了する':'現在の取引先';
  body='<p>'+esc(relation.partner)+' · '+(relation.status==='paused'?'新しい指定を休止中':'取引中')+'</p>'+relation.terms.map(t=>'<p>'+ageLabel(t.targetAge)+' · '+unit(t.unitPrice)+'/本 · 瓶詰め費 '+unit(t.bottlingFee)+'/本</p>').join('')+'<p>出荷済み '+relation.deliveries+'樽 · '+relation.bottles+'本</p><p>指定中 '+game.trade.contracts.length+'樽</p>';
  if(kind==='end-trade'){body+='<p>指定中の樽と特別注文も解除します。熟成は続きます。</p>';actions=button('取引と出荷予定を終了する','end-trade')+button('戻る','trade-back');}
  else{const order=game.trade.order;if(order)body+=orderDescription(order)+'<p>'+esc(orderStatus(order))+'</p>';body+='<p class="quiet">休止中も、指定済みの樽は約束どおり出荷します。</p>';actions=(order?button('特別注文の取消を確認する','cancel-order-confirm'):'')+button(relation.status==='paused'?'新しい指定を再開する':'新しい指定を休止する',relation.status==='paused'?'resume-trade':'pause-trade')+button('取引の終了を確認する','end-trade-confirm')+button('戻る','cancel');}
 }else if(kind==='cancel-order'){
  const order=game.trade.order;if(!order){modal=null;return;}title='特別注文を取り消す';body=orderDescription(order)+'<p>違約金はありません。通常の取引と樽の熟成は続きます。</p>';actions=button('特別注文を取り消す','cancel-order')+button('戻る','trade-back');
 }else if(kind==='contract'||kind==='contract-bottle'){
  const k=D.contractFor(game,id);if(!k||k.caskId!==id){modal=null;return;}title=k.kind==='special'?'この樽の特別注文':'この樽の卸売契約';
  body='<p>'+esc(k.partner)+' · '+esc(caskLabel(c))+'</p><p>'+ageLabel(k.targetAge)+'で自動出荷 · '+unit(k.unitPrice)+'/本</p><p>瓶詰め費 '+unit(k.bottlingFee)+'/本を代金から差引</p><p class="quiet">解除は無料。この樽を自分で瓶詰めするなら解除します。</p>';
  if(k.kind==='special')body+=orderDescription(k)+'<p class="quiet">樽の指定を外しても、注文は未指定で残ります。</p>';
  actions=kind==='contract-bottle'?button(k.kind==='special'?'樽の指定を外して瓶詰めを確認する':'契約を解除して瓶詰めを確認する','cancel-for-bottle',id)+button('樽へ戻る','cancel'):button(k.kind==='special'?'この樽の指定を外す':'契約を解除する','cancel-contract',id)+button('樽へ戻る','cancel');
  if(kind==='contract'&&D.canCare(game,id)){body+='<p class="quiet">木の移りと蒸発を抑え、口当たりの変化をゆっくり待てます。</p>';actions=button('涼しい棚へ移す','care',id)+actions;}
 }else if(kind==='decision'){
  const d=game.decisions[0];if(!d){modal=null;if(dialog.open)dialog.close();return;}
  modal.id=d.caskId;const source=D.currentCask(game,d.caskId),pending=d.pending;
  title=caskName(d.caskId)+' · '+pending.title;body='<p>'+esc(P.casks[source.type].short)+' · '+ageLabel(source.age)+'</p>'+(pending.text?'<p>'+esc(pending.text)+'</p>':'')+button('試飲して考える','trial',d.caskId);
  if(d.eventId==='order-unmet'){const fallback=D.orderFallbackTerms(game);body+='<p>通常卸売 '+unit(fallback.unitPrice)+'/本 · 瓶詰め費 '+unit(fallback.bottlingFee)+'/本</p><p class="quiet">特別価格では出荷しません。自分で販売する場合、樽の熟成は続けられます。</p>';}
  actions=D.contractFor(game,d.caskId)&&d.eventId==='funds'?button('契約を解除して瓶詰めを検討する','cancel-contract',d.caskId):pending.options.map(o=>button(esc(o.id==='bottle'?'瓶詰めを確かめる':o.label)+(o.hint?'<small>'+esc(o.hint)+'</small>':''),o.id==='bottle'?'quote':'choose',d.caskId,'data-choice="'+esc(o.id)+'" data-event="'+esc(d.eventId)+'"')).join('');
 }else if(kind==='fill'){
  title='原酒を樽に詰める';body='<p>'+game.still.distillation.litres.toFixed(1)+' L</p>';
  actions=['bourbon','refill'].map(type=>button('<span class="fill-art">'+barrel(type)+'</span>'+esc(P.casks[type].short)+' · '+money(P.casks[type].cost),'fill',type)).join('');
 }else if(kind==='quote'&&c){
  const q=D.quote(game,id),sample=game.notesById[id].samples.at(-1);title='この樽を瓶に残す';
  body='<p>'+esc(caskLabel(c))+' · '+ageLabel(c.age)+'</p><p class="quote-numbers">'+q.count+'本 · 費用 '+money(q.cost)+'</p><p>瓶詰め後 '+money(game.core.cash-q.cost)+'</p><p class="quiet">維持費 '+money(D.upkeep(game))+'/月 · 残り '+c.litres.toFixed(1)+' L</p><p class="quiet">'+(sample?'試飲 '+ageLabel(sample.age)+' · '+shortTaste(sample).map(esc).join(' · '):'試飲なし')+'</p>';
  body+=brandFields(id);
  actions=button('瓶詰めする','bottle',id,q.count<1||game.core.cash<q.cost?'disabled':'')+button('樽へ戻る','cancel');
 }else if(kind==='product'){
  const p=game.core.products.find(x=>x.id===id),meta=game.productsById[id];if(!p){modal=null;render();return;}
  const prices=D.salePrices(game,id),record=game.records.find(r=>r.productId===id);title=(brandFor(id)?.name??record?.name??'この一本')+(releaseTag(id)?' · '+releaseTag(id):'');
  const release=releaseFor(id);
  body='<div class="product-overview"><div class="modal-bottle">'+productArt(p)+'</div><p>'+ageLabel(p.age)+' · 在庫 '+p.stock+'本<br>'+provenanceTag(release?.caskId)+'<span class="product-state">'+(p.stock===0?'完売':meta.listed?'販売中':'保管中')+'</span></p></div>'+(deliveryNotice?'<p class="delivery-confirmation" role="status">'+esc(deliveryNotice)+'</p>':'');
  body+='<section class="sales-destination" data-destination="shelf"><h3>自家販売</h3><p>'+unit(p.price)+'/本 · '+(p.stock===0?'完売':meta.listed?'販売中':'保管中')+'</p><div class="price-options">'+['low','standard','high'].map((tier,i)=>button(['低め','標準','高め'][i]+'<span>'+unit(prices[tier])+'/本</span>','price',id,'data-tier="'+tier+'" aria-pressed="'+(meta.selectedPrice===tier)+'"')).join('')+'</div>'+(meta.listed?'':button('自家販売を始める','list',id,p.stock>0?'':'disabled'))+'<p class="quiet">自家販売 '+(release?.sold??p.sold)+'本 · 売上 '+money(release?.revenue??p.revenue)+'</p></section>';
  for(const shop of SHOPS){
   const stockist=D.shopBrandStats(game,release?.brandId,shop.id),invitation=shopOffers().find(o=>o.brandId===release?.brandId&&o.shopId===shop.id);
   if(!stockist)continue;
   if(shop.id==='department'){body+=departmentDestination(p,release,invitation);continue;}
   body+='<section class="sales-destination shop-delivery" data-destination="'+esc(shop.id)+'"><h3>'+esc(shop.name)+'</h3><p class="quiet">'+esc(shopTerms(shop.id))+'</p>';
   const q=D.shopQuote(game,id,shop.id);body+='<p class="quiet">取扱中 · 納品時に買取</p><p>'+unit(q.unitPrice)+'/本 · 今月あと'+q.remaining+'本</p>'+(q.ok?deliveryButtons(p,q,'shop-deliver'):'<p class="quiet">'+esc(q.reason)+'</p>');
   body+='</section>';
  }
  actions=(meta.listed||p.stock===0?button('閉じる','cancel'):button('手元に保管する','store')+button('あとで決める','product-later'));
 }
 const activeCask=['decision','quote','contract-bottle'].includes(kind)?modal.id:null,waiting=game.decisions.filter(d=>d.caskId!==activeCask).length+(game.trade.offer&&kind!=='offer'?1:0)+shopOffers().filter(o=>!o.notified&&(kind!=='shop-offer'||o.id!==modal.offerId)).length;$('dialog-context').textContent=waiting?'このあと判断 '+waiting+'件':'';$('dialog-context').hidden=!waiting;
 $('dialog-title').textContent=title;$('dialog-body').innerHTML=body;$('dialog-actions').innerHTML=actions;$('close-dialog').hidden=kind==='decision'||kind==='generation-review';
 if(!dialog.open)dialog.showModal();
}
function renderSpirit(){
 const panel=$('spirit-readout');if(!panel)return;
 const current=distillationView(game),view=current??(completedSpirit?{...completedSpirit,phase:'filled'}:null);
 panel.hidden=!view;if(!view)return;
 const gathering=view.phase==='collecting';
 $('spirit-kind').textContent=gathering?'採取中':view.phase==='forecast'?(game.usual.reservation?.status==='active'?'抽出中の見込み':'今止めた場合の見込み'):view.phase==='filled'?'樽詰めした原酒':'できた原酒';
 $('spirit-phrase').textContent=view.phrase;
 $('spirit-gauges').hidden=gathering;
 $('spirit-volume').textContent=view.litres.toFixed(1)+' L';
 for(const axis of view.axes??[]){const meter=$('spirit-'+axis.id);meter.setAttribute('aria-valuenow',String(axis.value));meter.setAttribute('aria-valuetext',axis.value.toFixed(2)+' / '+axis.maximum+' · 特徴の強さ');meter.style.setProperty('--flavor-fill',axis.ratio);}
}
function render(){
 if(!game)return;
 if(!D.currentCask(game,selectedCaskId))selectedCaskId=game.core.casks[0]?.id??null;
 if(game.tastingId!==null){selectedCaskId=game.tastingId;room='warehouse';}
 syncModal();
 const phase=game.still.phase,tasting=game.tastingId!==null,atLimit=atExtractionLimit(),reservation=game.usual.reservation,automatic=reservation?.status==='active';
 document.body.dataset.room=room;document.body.dataset.phase=room==='distill'?(atLimit?'filling':phase):room==='warehouse'?'watching':'selling';document.body.dataset.time=blocked()||!hasMonthlyWork()?'paused':'running';document.body.classList.toggle('is-tasting',tasting&&!modal);
 document.body.style.setProperty('--month-duration',T.monthMs+'ms');document.body.style.setProperty('--month-progress',elapsed/T.monthMs);document.body.style.setProperty('--extraction-progress',(game.still.distillation?.progress??0)/T.distillMax);$('extraction-progress').hidden=phase==='ready';document.body.style.setProperty('--collection',game.still.distillation?.litres/40||0);
 $('game').hidden=false;$('time-flow').hidden=false;$('recovery').hidden=canSave||preview;
 $('cash').textContent=money(game.core.cash);$('calendar').textContent=monthLabel(game.core.month);$('monthly-cost').textContent='維持費 '+money(D.upkeep(game))+'/月';
 for(const name of ['distill','warehouse','sales'])$('room-'+name).hidden=room!==name;
 for(const b of document.querySelectorAll('[data-room]'))b.setAttribute('aria-pressed',String(b.dataset.room===room));
 $('nav-still').textContent=phase==='distilling'?(atLimit?'樽詰め待ち':'蒸留中'):phase==='filling'?'樽詰め待ち':'待機';$('nav-casks').textContent=game.core.casks.length+'樽';$('nav-stock').textContent=bottleStock()+'本'+(game.shop.offer?' · 申し出':'');
 const invitation=$('shop-offer'),invited=game.brands.find(b=>b.id===game.shop.offer?.brandId);invitation.hidden=!invited||!!game.trade.offer;invitation.disabled=tasting||!!modal||game.decisions.length>0;invitation.textContent=invited?shopName(game.shop.offer.shopId)+'から · 「'+invited.name+'」'+(shopOffers().length>1?' · ほか'+(shopOffers().length-1)+'件':''):'';
 $('start-distill').hidden=phase!=='ready';$('stop-distill').hidden=automatic||phase!=='distilling'||atLimit;$('open-fill').hidden=automatic||(phase!=='filling'&&!atLimit);
 const gen=generationState();$('generation-name').textContent=gen?generationName(gen.id):'';const banner=$('generation-notice');banner.hidden=!gen||gen.phase==='working';banner.textContent=gen?.phase==='last-batch'?generationName(gen.id)+'の最後の仕込み · '+monthLabel(gen.fixedMonth+12)+'まで':gen?.phase==='review'?generationName(gen.id)+'の歩みを確認します。':'';
 const start=D.canStart(game);$('start-distill').disabled=!start.ok;$('start-distill').textContent='自分で蒸留する '+money(P.distillationCost);
 $('stop-distill').disabled=(game.still.distillation?.progress??0)<T.minimumStop;
 $('collection').textContent=game.still.distillation?game.still.distillation.litres.toFixed(1)+' L':'';
 renderSpirit();
 $('distill-caption').hidden=phase!=='ready';
 $('distill-caption').textContent=automatic?'いつもの抽出条件で、原酒を集めています。':phase==='ready'?(start.ok?'原酒を集め、抽出の終わりを決めます。':start.reason):phase==='filling'||atLimit?'抽出完了。樽を選んで詰めます。':'原酒を集めています。';
 $('distill-direction').textContent=phase==='distilling'&&!atLimit?game.still.distillation.progress<T.minimumStop?'最初の原酒が集まるまで少し待ちます。':game.still.distillation.progress<70?'少量で切り上げるか、もう少し集めるか。':'量と穀物の個性が増してきました。':phase==='ready'&&start.ok?'早めなら少量で穏やかに。続けると量と個性が増えます。':'';
 const recipe=D.usualQuote(game);
 $('usual-recipe').textContent=recipe?'抽出位置 '+recipe.stopAt+' / '+T.distillMax+' · '+P.casks[recipe.type].short+' · 蒸留 '+money(recipe.distillationCost)+' ＋ 樽 '+money(recipe.caskCost):'自分で蒸留し、樽に詰めると、その製法を次に使えます。';
 $('reserve-usual').hidden=!!reservation;$('reserve-usual').disabled=!recipe||phase!=='ready'||tasting||!!modal||gen?.phase!=='working';
 $('cancel-usual').hidden=reservation?.status!=='queued';
 $('usual-status').textContent=gen?.phase==='last-batch'&&!automatic?(reservation?'予約は次の代へ引き継ぎます。最後の仕込みは自分で行います。':'最後の仕込みは、自分で蒸留します。'):automatic?'仕込み中 · この一樽で終了します。':reservation?(userPaused?'予約中 · 時間を進めると、条件が整い次第始めます。':D.canBeginUsual(game).ok?'予約中 · 次の一樽を仕込みます。':'予約中 · '+D.canBeginUsual(game).reason):'次の一樽だけ。空きと資金を待ち、抽出から樽詰めまで任せます。';
 const rk=JSON.stringify([game.core.casks.map(c=>[c.id,c.age,c.litres]),selectedCaskId,game.generations]);
 if(rk!==rackKey){$('cask-rack').innerHTML=game.core.casks.map(c=>'<button type="button" data-cask-id="'+c.id+'" aria-pressed="'+(selectedCaskId===c.id)+'"><span aria-hidden="true">'+barrel(c.type)+'</span><strong>'+caskName(c.id)+'</strong><small>'+ageLabel(c.age)+'</small>'+provenanceTag(c.id)+'<small>'+c.litres.toFixed(1)+' L</small></button>').join('');rackKey=rk;}
 const selectedContract=D.contractFor(game,selectedCaskId),contracted=!!selectedContract;$('contract-info').hidden=!contracted;$('contract-info').textContent=contracted?(selectedContract.kind==='special'?'特別注文':'卸売契約')+' · '+ageLabel(selectedContract.targetAge)+'で出荷':'';
 $('open-bottle').textContent='瓶詰めを考える';$('taste-bottle').textContent=game.trade.order?.status==='unmet'&&game.trade.order.caskId===selectedCaskId?'販売方法を選ぶ':'瓶詰めを考える';$('assign-wholesale').hidden=contracted||!game.trade.relationship||game.trade.relationship.status!=='active'||selectedCaskId===null||tasting||!!modal;
 $('warehouse-empty').hidden=game.core.casks.length>0;$('selected-cask').hidden=selectedCaskId===null;
 if(selectedCaskId!==null){
  const c=D.currentCask(game,selectedCaskId),n=game.notesById[c.id];if(barrelKey!==c.id){$('barrel').innerHTML=barrel(c.type);barrelKey=c.id;}
  $('cask-kind').textContent=caskLabel(c)+(provenanceLabel(c.id)?' · '+provenanceLabel(c.id):'');$('age').textContent=ageLabel(c.age);const gk=c.id+':'+c.wood;if(glassKey!==gk){$('glass').innerHTML=glass(c.wood,{sample:true});glassKey=gk;}$('amount').textContent='残り '+c.litres.toFixed(1)+' L';$('loss').textContent='仕込みから −'+(c.initialLitres-c.litres).toFixed(1)+' L';$('change').textContent=D.observation(game,c.id).change;$('last-taste').textContent=n.samples.length?'最後の試飲 · '+ageLabel(n.samples.at(-1).age):'グラスで、今の味を確かめられます。';
  $('tasting-panel').hidden=!tasting||!!modal;$('free-actions').hidden=tasting||!!modal;
  if(tasting){const comp=D.comparison(game,c.id);$('taste-date').textContent=ageLabel(comp.current.age)+'の試飲';$('taste-current').innerHTML=shortTaste(comp.current).map((t,i)=>'<p><span>'+['口当たり','香り','余韻'][i]+'</span>'+esc(t)+'</p>').join('');$('taste-previous').hidden=false;$('taste-previous').textContent=(comp.previous?'前回 '+ageLabel(comp.previous.age)+'から：':'')+shortChange(comp.current,comp.previous);}
 }
 const sk=JSON.stringify([game.core.products,game.productsById,game.brands,selectedProductId,game.generations]);if(sk!==shelfKey){$('product-shelf').innerHTML=game.core.products.filter(p=>p.stock>0).map(p=>'<button type="button" data-product-id="'+p.id+'" aria-label="'+esc((brandFor(p.id)?.name??'この一本')+' · '+releaseTag(p.id)+' · '+p.stock+'本 · '+(game.productsById[p.id]?.listed?'販売中':'保管中'))+'" aria-pressed="'+(selectedProductId===p.id)+'"><span aria-hidden="true">'+productArt(p)+'</span><strong>'+esc(brandFor(p.id)?.name??game.records.find(r=>r.productId===p.id)?.name??'この一本')+'</strong>'+provenanceTag(releaseFor(p.id)?.caskId)+'<small>'+releaseTag(p.id)+' · '+ageLabel(p.age)+'</small><small>'+p.stock+'本 · '+(game.productsById[p.id]?.listed?'販売中':'保管中')+'</small></button>').join('');shelfKey=sk;}
 const relation=game.trade.relationship;$('trade-info').hidden=!relation;$('trade-info').textContent=relation?relation.partner+' · '+(relation.status==='paused'?'指定休止中':'取引中')+' · 出荷予定 '+game.trade.contracts.length+'樽'+(game.trade.order?' · 特別注文':''):'';
 $('sales-empty').hidden=game.core.products.some(p=>p.stock>0);const last=game.core.lastMonth;$('sales-result').textContent=last?'前月 '+last.bottles+'本 · 売上 '+money(last.revenue):'';
 $('toggle-time').textContent=(!preview&&!canSave)?'保存待ち':(userPaused&&jump===0)||runtimeHalted?(phase==='distilling'&&!atLimit?'蒸留を再開する':'時間を進める'):'時間を止める';$('time-controls').hidden=tasting||!!modal;
 $('toggle-time').disabled=!hasMonthlyWork()||(!preview&&!canSave);$('skip').disabled=!hasMonthlyWork()||!!reservation||phase==='distilling'||jump>0||(!preview&&!canSave);
 $('time-status').textContent=(!preview&&!canSave)?'保存を確認するまで停止中':modal?'判断中 · 時間は停止中':tasting?'試飲中 · 時間は停止中':document.hidden?'画面を離れています':runtimeHalted?'資金を残して停止中':userPaused&&jump===0?'時間は停止中':!hasMonthlyWork()?(phase==='filling'?'抽出完了 · 樽に詰められます':'作業を待っています'):phase==='distilling'?(atLimit?'樽詰め待ち · 熟成・販売は進行中':'蒸留中 · 熟成・販売も進みます'):room==='distill'&&phase==='filling'?'抽出完了 · 熟成・販売は進行中':jump?'3か月を順に進めています':'自動進行 · 約'+T.monthMs/1000+'秒で1か月';
 $('time-change').textContent=last?'前月 維持費 '+money(last.upkeep)+(last.revenue?' · 売上 '+money(last.revenue):''):'';
 const lk=JSON.stringify([game.core.totals,game.notesById,game.trade.history,game.brands,game.releases,game.shop,game.department,game.generations]);if(lk!==ledgerKey){$('ledger-body').innerHTML='<p>売上累計 '+money(game.core.totals.revenue)+' · 維持費累計 '+money(game.core.totals.upkeep)+'</p>'+game.core.casks.map(c=>'<h3>'+esc(caskLabel(c))+'</h3><ol class="sample-history">'+game.notesById[c.id].samples.map((s,i,all)=>'<li><time>'+ageLabel(s.age)+'</time><p>'+s.text.map(esc).join(' · ')+'</p>'+(i?'<p>'+esc(shortChange(s,all[i-1]))+'</p>':'')+'</li>').join('')+'</ol>'+((game.notesById[c.id].observations??[]).length?'<details><summary>熟成の変化</summary>'+game.notesById[c.id].observations.map(o=>'<p>'+ageLabel(o.age)+' · '+esc(o.title??o.text??'熟成の変化')+'</p>').join('')+'</details>':'')).join('');$('ledger-body').innerHTML+='<details><summary>取引の記録</summary>'+game.trade.history.filter(x=>x.kind!=='offered').map(x=>'<p>'+monthLabel(x.month)+' · '+esc(({accepted:'取引開始',assigned:'卸売へ指定',unassigned:'出荷予定を解除',declined:'申し出を辞退',cancelled:'契約を解除',shipped:'卸売出荷',paused:'新しい指定を休止',resumed:'指定を再開',ended:'取引終了','terms-accepted':'取引条件を更新','order-offered':'特別注文の申し出','order-accepted':'特別注文を受注','order-declined':'特別注文を辞退','order-assigned':'特別注文へ指定','order-unassigned':'特別注文の樽指定を解除','order-cancelled':'特別注文を取消','order-unmet':'特別注文の風味を確認','order-retail':'特別注文から自分で販売','order-wholesale':'通常卸売を選択','order-fulfilled':'特別注文を出荷','order-resolved':'特別注文の販売方法を選択'})[x.kind]??x.kind)+(x.partner?' · '+esc(x.partner):'')+(x.caskId?' · '+caskName(x.caskId):'')+(x.bottles?' · '+x.bottles+'本':'')+'</p>').join('')+'</details>';$('ledger-body').innerHTML+=brandHistory();ledgerKey=lk;}
 const recordState=JSON.stringify([game.generations,game.records.map(r=>[r.productId,r.samples,r.choices,r.channel,r.observations,r.order])]);if(recordState!==recordKey){$('records-body').innerHTML=game.records.slice().reverse().map(r=>'<article>'+provenanceTag(r.caskId)+'<h3>'+esc(r.name)+(releaseTag(r.productId)?' · '+releaseTag(r.productId):'')+'</h3><p>'+caskName(r.caskId)+' · '+(P.casks[r.type]?.short??'')+' · '+ageLabel(r.age)+' · '+r.bottles+'本'+(['wholesale','special-order'].includes(r.channel)?' · '+esc(r.partner)+'へ出荷':'')+(r.order?.outcome==='fulfilled'?' · 特別注文達成':r.order?.outcome==='unmet-retail'?' · 特別注文から自分で販売':r.order?.outcome==='unmet-wholesale'?' · 特別注文から通常卸売':'')+'</p><p id="record-sale-'+r.productId+'"></p><p>'+r.taste.map(esc).join(' · ')+'</p><details><summary>蒸留・試飲・判断</summary><p>'+esc(r.description)+'</p>'+r.samples.map(s=>'<p>'+ageLabel(s.age)+' · '+s.text.map(esc).join(' · ')+'</p>').join('')+r.choices.map(c=>'<p>'+ageLabel(c.age)+' · '+esc(c.text)+'</p>').join('')+(r.observations??[]).map(o=>'<p>'+ageLabel(o.age)+' · '+esc(o.title??o.text??'熟成の変化')+'</p>').join('')+'</details></article>').join('');recordKey=recordState;}$('records').hidden=!game.records.length;for(const r of game.records)$('record-sale-'+r.productId).textContent='販売 '+r.sold+'本 · 売上 '+money(r.revenue)+(r.delivered?' / 取扱店へ '+r.delivered+'本 · '+money(r.deliveryRevenue):'');
}
$('room-nav').addEventListener('click',e=>{const b=e.target.closest('[data-room]');if(b)selectRoom(b.dataset.room);});
$('go-distill').addEventListener('click',()=>selectRoom('distill'));
$('cask-rack').addEventListener('click',e=>{const b=e.target.closest('[data-cask-id]');if(!b||modal||!D.currentCask(game,Number(b.dataset.caskId)))return;stopClock();endTaste();selectedCaskId=Number(b.dataset.caskId);save();render();schedule();});
$('open-history').addEventListener('click',openHistory);
$('shop-offer').addEventListener('click',()=>{if(modal)return;showShopOffer();render();schedule();});
$('product-shelf').addEventListener('click',e=>{const b=e.target.closest('[data-product-id]');if(b){selectedProductId=Number(b.dataset.productId);openModal('product',selectedProductId);}});
$('reserve-usual').addEventListener('click',()=>{if(!game||modal)return;jump=0;act(D.reserveUsual,()=>message(''));});
$('cancel-usual').addEventListener('click',()=>{if(!game||modal)return;act(D.cancelUsual,()=>message('仕込みの予約を取り消しました。'));});
$('start-distill').addEventListener('click',()=>{if(!game||!D.canStart(game).ok||modal)return;message('');act(D.startDistillation);});
$('stop-distill').addEventListener('click',()=>{if(game?.still.phase==='distilling'&&game.still.distillation.progress>=T.minimumStop&&!modal)act(D.stopDistillation);});$('open-fill').addEventListener('click',()=>{if(atExtractionLimit()&&!modal)act(D.stopDistillation,()=>{modal={kind:'fill'};jump=0;});else openModal('fill');});
$('taste-button').addEventListener('click',()=>trial(selectedCaskId));$('glass-button').addEventListener('click',()=>{if(game?.tastingId===null)trial(selectedCaskId);});
$('end-tasting').addEventListener('click',()=>act(D.endTasting));$('open-bottle').addEventListener('click',()=>quoteModal(selectedCaskId));$('taste-bottle').addEventListener('click',()=>quoteModal(selectedCaskId));
$('assign-wholesale').addEventListener('click',()=>{assignmentTermId=null;openModal('assign',selectedCaskId);});
$('trade-info').addEventListener('click',()=>openModal('trade'));
$('contract-info').addEventListener('click',()=>openModal('contract',selectedCaskId));
$('toggle-time').addEventListener('click',()=>{if(jump>0){jump=0;userPaused=true;}else if(runtimeHalted){runtimeHalted=false;}else userPaused=!userPaused;save();render();schedule();});
$('skip').addEventListener('click',()=>{if(!game||(!preview&&!canSave)||document.hidden||modal||game.tastingId!==null||game.decisions.length||runtimeHalted||!hasMonthlyWork()||game.usual.reservation||game.still.phase==='distilling'||jump>0)return;jump=3;schedule();render();});
$('close-dialog').addEventListener('click',closeModal);$('action-dialog').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
$('ledger-body').addEventListener('click',e=>{const b=e.target.closest?.('[data-action="department-cancel"]');if(!b||modal||!D.departmentInterests(game).some(i=>i.selectionId===b.dataset.selectionId))return;act(s=>D.cancelDepartmentInterest(s,b.dataset.selectionId),()=>message('相談を終えました。'));});
$('dialog-actions').addEventListener('click',e=>handleModal(e));$('dialog-body').addEventListener('click',e=>handleModal(e));
function updateBrandDraft(e){
 if(modal?.kind==='shop-offer'&&e.target.id==='shop-release'){modal.productId=Number(e.target.value);render();return;}
 if(modal?.kind!=='quote'||!brandDraft)return;
 const id=e.target.id,value=e.target.value;
 if(id==='brand-name')brandDraft.name=value;
 if(id==='brand-choice'){brandDraft.brandId=value==='new'?null:game.brands.find(b=>String(b.id)===value)?.id??null;render();}
 if(id==='brand-bottle'&&D.BRAND_BOTTLES.some(b=>b.id===value))brandDraft.bottle=value;
 if(id==='brand-label'&&D.BRAND_LABELS.some(b=>b.id===value))brandDraft.label=value;
 if(id==='brand-bottle'||id==='brand-label'){const preview=$('dialog-body').querySelector?.('.brand-appearance .brand-preview');if(preview)preview.innerHTML=brandArt(0,brandDraft);}
}
$('dialog-body').addEventListener('input',updateBrandDraft);$('dialog-body').addEventListener('change',updateBrandDraft);
function handleModal(e){
 const b=e.target.closest('[data-action]');if(!b||!modal)return;const a=b.dataset.action,id=Number(b.dataset.id),kind=modal.kind;
 if(a==='generation-history'&&kind==='generation-review'&&generationState()?.id===id){modal=null;openHistory();return;}
 if(a==='generation-continue'&&kind==='generation-notice'&&generationState()?.id===id){modal=null;room='distill';render();schedule();return;}
 if(a==='generation-handover'&&kind==='generation-review'&&generationState()?.id===id){act(s=>D.handoverGeneration(s,id),()=>{modal=null;runtimeHalted=false;room='distill';message(generationName(generationState().id)+'へ引き継ぎました。');});return;}
 if(a==='history-year'&&kind==='history'){modal.year=modal.year===b.dataset.id?null:b.dataset.id;modal.page=0;render();return;}
 if(a==='history-page'&&kind==='history'&&Number.isInteger(id)&&id>=0){modal.page=id;render();return;}
 if(a==='history-brand'&&['history','history-shop'].includes(kind)){modal={kind:'history-brand',brandId:id,year:modal.year??null,page:modal.page??0};render();return;}
 if(a==='history-shop'&&['history','history-brand'].includes(kind)){modal={kind:'history-shop',shopId:b.dataset.id,year:modal.year??null,page:modal.page??0};render();return;}
 if(a==='history-back'&&['history-brand','history-shop'].includes(kind)){modal={kind:'history',year:modal.year??null,page:modal.page??0};render();return;}

 if(['shop-accept','shop-decline','shop-later','shop-accept-deliver'].includes(a)&&(kind!=='shop-offer'||modal.shopId!==b.dataset.shopId||modal.offerId!==Number(b.dataset.offerId)))return;
 if(a==='shop-later'){if(kind==='shop-offer')closeModal();return;}
 if(a==='shop-open-offer'){if(kind==='product'){showShopOffer(modal.id);render();schedule();}return;}
 if(a==='shop-accept'||a==='shop-decline'){if(kind==='shop-offer'){const target={...modal};act(s=>(a==='shop-accept'?D.acceptShop:D.declineShop)(s,target.shopId,target.offerId),()=>{modal=target.returnProductId!==null?{kind:'product',id:target.returnProductId}:null;room='sales';message(a==='shop-accept'?(target.shopId==='department'?'取扱いの相談を残しました。':shopName(target.shopId)+'で取扱いが始まりました。'):'今回は見送りました。');});}return;}
 if(a==='shop-accept-deliver'){if(kind==='shop-offer'&&modal.productId===id&&modal.shopId===b.dataset.shopId&&modal.offerId===Number(b.dataset.offerId)){const n=Number(b.dataset.count),name=brandFor(id)?.name??'ウイスキー',target={...modal},payment=Math.round(D.shopOfferQuote(game,id,target.shopId).unitPrice*n*100)/100;act(s=>D.acceptShopDelivery(s,id,n,target.shopId,target.offerId),()=>{modal=target.returnProductId!==null?{kind:'product',id:target.returnProductId}:null;room='sales';deliveryNotice=name+'を'+shopName(target.shopId)+'へ'+n+'本 · 入金 '+unit(payment);message(name+'を'+shopName(target.shopId)+'へ'+n+'本届けました。');});}return;}
 if(a==='department-cancel'){if(kind==='product'&&modal.id===id&&D.departmentInterests(game,releaseFor(id)?.brandId).some(x=>x.selectionId===b.dataset.selectionId))act(s=>D.cancelDepartmentInterest(s,b.dataset.selectionId),()=>{deliveryNotice='相談を終えました。';});return;}
 if(a==='shop-deliver'){if(kind==='product'&&modal.id===id&&SHOPS.some(s=>s.id===b.dataset.shopId)){const n=Number(b.dataset.count),shopId=b.dataset.shopId,payment=Math.round(D.shopQuote(game,id,shopId).unitPrice*n*100)/100;act(s=>D.deliverShop(s,id,n,shopId,shopId==='department'?b.dataset.selectionId:undefined),()=>{deliveryNotice=(brandFor(id)?.name??'ウイスキー')+'を'+shopName(shopId)+'へ'+n+'本 · 入金 '+unit(payment);message(deliveryNotice);});}return;}
 if(a==='offer-term'){if(kind==='offer'){offerTermId=game.trade.offer.terms.find(t=>String(t.id)===b.dataset.id)?.id;render();}return;}
 if(a==='assign-term'){if(kind==='assign'){assignmentTermId=game.trade.relationship.terms.find(t=>String(t.id)===b.dataset.id)?.id;render();}return;}
 if(a==='assign-order'){if(kind==='assign')act(s=>D.assignOrder(s,id),()=>{modal=null;message('この樽を特別注文へ指定しました。');});return;}
 if(a==='cancel-order-confirm'){if(kind==='trade'){modal={kind:'cancel-order'};render();}return;}
 if(a==='cancel-order'){if(kind==='cancel-order')act(D.cancelOrder,()=>{modal=null;message('特別注文を取り消しました。通常の取引は続きます。');});return;}
 if(a==='assign'){if(kind==='assign')act(s=>D.assignCask(s,id,assignmentTermId),()=>{modal=null;message('この樽を卸売へ指定しました。');});return;}
 if(a==='pause-trade'||a==='resume-trade'){if(kind==='trade')act(a==='pause-trade'?D.pauseTrade:D.resumeTrade,()=>{modal=null;});return;}
 if(a==='end-trade-confirm'){if(kind==='trade'){modal={kind:'end-trade'};render();}return;}
 if(a==='trade-back'){if(kind==='end-trade'||kind==='cancel-order'){modal={kind:'trade'};render();}return;}
 if(a==='end-trade'){if(kind==='end-trade')act(D.endTrade,()=>{modal=null;message('取引を終了しました。');});return;}
 if(a==='offer-cask'){if(kind==='offer'){offerCaskId=id;render();}return;}
 if(a==='contract'){if(kind==='offer'){const special=game.trade.offer.kind==='special',initial=game.trade.offer.kind!=='terms';act(s=>D.acceptOffer(s,undefined,offerTermId),()=>{modal=null;message(special?'注文を受けました。樽を選んで指定できます。':initial?'取引を始めました。卸売に回す樽を選べます。':'次の納品から条件を更新しました。');});}return;}
 if(a==='decline'){if(kind==='offer')act(D.declineOffer,()=>{modal=null;offerCaskId=null;message('今回は見送りました。');});return;}
 if(a==='care'){if(kind==='contract'&&modal.id===id&&D.canCare(game,id))act(s=>D.careForCask(s,id),()=>{modal=null;message('涼しい棚へ移しました。出荷予定は変わりません。');});return;}
 if(a==='cancel-for-bottle'){if(kind==='contract-bottle'&&D.contractFor(game,id))act(s=>D.cancelContract(D.endTasting(s),id),()=>{modal={kind:'quote',id};message('契約を解除しました。');});return;}
 if(a==='cancel-contract'){if(D.contractFor(game,id))act(s=>D.cancelContract(D.endTasting(s),id),()=>{modal=null;message('契約を解除しました。');});return;}
 if(a==='store'||a==='product-later'){if(kind==='product')closeModal();return;}if(a==='cancel'){closeModal();return;}if(a==='trial'){trial(id);return;}if(a==='quote'){quoteModal(id);return;}
 if(a==='choose'){const first=game.decisions[0];if(kind!=='decision'||first?.caskId!==id||first.eventId!==b.dataset.event)return;act(s=>D.chooseDistillery(s,id,b.dataset.choice),()=>{modal=null;if(b.dataset.choice==='order-wholesale'){const shipment=game.trade.lastShipments.find(x=>x.caskId===id);message(shipment?'通常卸売で '+shipment.bottles+'本出荷 · 入金 '+money(shipment.net):'');}else if(b.dataset.choice==='order-retail')message('この樽を自分で販売します。熟成も続けられます。');else message('');});return;}
 if(a==='fill'){if(kind!=='fill')return;act(s=>D.fillBarrel(s,b.dataset.id),()=>{modal=null;selectedCaskId=game.core.casks.at(-1)?.id??null;room='warehouse';message('');});return;}
 if(a==='price'){if(kind!=='product'||modal.id!==id)return;act(s=>D.setSalePrice(s,b.dataset.tier,id));return;}
 if(a==='list'){if(kind!=='product'||modal.id!==id)return;act(s=>D.listBottles(s,id),()=>{deliveryNotice='自家販売を始めました。';message('販売を始めました。売上は次の月から。');});return;}
 if(a==='bottle'){
  if(kind!=='quote'||modal.id!==id)return;const label=caskName(id);
  const draft=draftFor(id),selection=draft.brandId!==null?{brandId:draft.brandId}:{name:draft.name,bottle:draft.bottle,label:draft.label};
  act(s=>D.bottleBranded(D.endTasting(s),id,selection),()=>{brandDraft=null;message(label+'を'+game.result.bottles+'本に瓶詰めしました。');selectedProductId=game.result.productId;room='sales';modal={kind:'product',id:selectedProductId};deliveryNotice='';});return;
 }
}
function suspend(){jump=0;stopClock();save();if(game)render();}
function resume(){if(game){render();schedule();}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else resume();});window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',e=>{if(e.persisted)resume();});
window.addEventListener('storage',e=>{if(!preview&&e.key===SAVE_KEY){canSave=false;suspend();storageNotice('別の画面で保存が変わりました。再読み込みしてください。');}});
$('reset').addEventListener('click',()=>{if(!confirm('0.17の進行を新しくしますか？以前の保存は残ります。'))return;stopClock();try{lastSavedText=preview?null:localStorage.getItem(SAVE_KEY);}catch{storageNotice('保存を確認できないため初期化していません。');return;}game=D.newGenerationDistillery(seed);completedSpirit=null;brandDraft=null;room='distill';selectedCaskId=null;modal=null;userPaused=false;runtimeHalted=false;elapsed=0;jump=0;glassKey='';canSave=!preview;storageNotice('');save();render();});
$('retry-save').addEventListener('click',()=>{if(!game){boot();return;}canSave=!preview;if(save()){storageNotice('');$('recovery').hidden=true;}render();schedule();});
function boot(){
 if(preview){game=D.newGenerationDistillery(seed);save();render();schedule();return;}
 try{lastSavedText=localStorage.getItem(SAVE_KEY);if(lastSavedText===null){let oldText=null;for(const key of LEGACY_KEYS){oldText=localStorage.getItem(key);if(oldText!==null)break;}if(oldText===null){game=D.newGenerationDistillery(seed);userPaused=false;}else{const old=JSON.parse(oldText);if(typeof old.userPaused!=='boolean')throw Error('legacy');if(old.version===2){if(Object.keys(old).length!==4||![10,11,12,13,14,15].includes(old.game?.version)||!Number.isInteger(old.elapsed)||old.elapsed<0||old.elapsed>=T.monthMs||old.elapsed%T.distillStepMs!==0)throw Error('legacy');elapsed=old.elapsed;}else if(old.version!==1||Object.keys(old).length!==3||![3,4,5,6,7,8,9].includes(old.game?.version))throw Error('legacy');game=D.restoreDistillery(JSON.stringify(old.game));userPaused=old.userPaused;}}else{const session=JSON.parse(lastSavedText);if(session.version!==2||typeof session.userPaused!=='boolean'||Object.keys(session).length!==4||session.game?.version!==16||!Number.isInteger(session.elapsed)||session.elapsed<0||session.elapsed>=T.monthMs||session.elapsed%T.distillStepMs!==0)throw Error('session');game=D.restoreDistillery(JSON.stringify(session.game));userPaused=session.userPaused;elapsed=session.elapsed;}const beforeCorrection=game;game=D.enableGenerations(game);game=D.reconcileTradeHistory(game);const corrected=game!==beforeCorrection;selectedCaskId=game.tastingId??game.core.casks[0]?.id??null;room=selectedCaskId!==null?'warehouse':'distill';canSave=true;if(lastSavedText===null||corrected)save();render();schedule();}
 catch{canSave=false;game=null;stopClock();$('game').hidden=true;$('recovery').hidden=false;storageNotice('この保存は開けません。元の記録を残して停止しています。');}
}
boot();
