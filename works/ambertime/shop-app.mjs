import {buildCaskLedger} from './cask-ledger.mjs?v=0.64-ledger';
import {buildReleaseLedger} from './ledger-view.mjs?v=0.63-ledger';
import {IDENTITY_BOTTLES,IDENTITY_LABELS,identityDefaults,brandNameError,releasePriceTier} from './brand-identity.mjs?v=0.58-first-brand';
import {extractionMaximum,bottleChoices,defaultBottleCount,releaseLabel} from './ui-details.mjs?v=0.52-ui-details';
import {shopRemark} from './shop-remarks.mjs?v=0.51-shop-remarks';
import {automaticEvents,transientNotices} from './event-notices.mjs?v=0.52-ui-details';
import {CanvasScene} from './canvas-scene.mjs?v=0.62-bottle-shelf-wall';
import * as D from './partner-orders.mjs?v=0.58-first-brand';
import {SHOPS} from './shop-model.mjs?v=0.48-free-aging';
import {caskName as sourceCaskName} from './work-context.mjs?v=0.38-cask-serials';
import {createCaskSerials} from './cask-serials.mjs?v=0.58-first-brand';
import {distillationView,spiritProfile} from './spirit-view.mjs?v=0.14';
import {brandStats,brandReputation} from './brand-reputation.mjs?v=0.15';
import {PARALLEL_PARAMETERS as T,ECONOMY_PARAMETERS as P} from './economy-parameters.mjs?v=0.7';
import {ageLabel,monthLabel} from './model.mjs';
import {barrel} from './cask-glass-art.mjs?v=0.58-first-brand';
import {glass,bottleArt,brandArt,stillArt} from './room-object-art.mjs?v=0.62-bottle-shelf-wall';
import {shortTaste,shortChange} from './tasting-view.mjs?v=0.6';
import {flavorTypeView as sourceFlavorTypeView} from './flavor-types.mjs?v=0.19-flavor';
import {FLAVOR_AXES as sourceFlavorAxes,flavorMeter as sourceFlavorMeter} from './flavor-view.mjs?v=0.18-tasting';
import {nearbyCasks,previousRelease,releasePair,sourceDetails} from './nearby-comparison.mjs?v=0.58-first-brand';
import {uiText,agingEventText} from './ui-text.mjs?v=0.34-aging-1';
// Resolve structured cask IDs only; saved prose and player names stay verbatim.
const caskSerials=createCaskSerials();
const caskName=id=>sourceCaskName(id,caskSerials(game));
const FLAVOR_AXES=sourceFlavorAxes.map(axis=>({...axis,label:uiText(axis.label)}));
const flavorTypeView=profile=>uiText(sourceFlavorTypeView(profile));
const flavorMeter=(...args)=>uiText(sourceFlavorMeter(...args));
export const SAVE_KEY='sukimastock.ambertime.wholesale.v20';
const $=id=>document.getElementById(id),money=n=>'£'+Number(n).toLocaleString('en-GB',{maximumFractionDigits:0}),unit=n=>'£'+Number(n).toFixed(2);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query=new URLSearchParams(location.search),preview=query.get('preview')==='1',chosenSeed=Number(query.get('seed')),seed=preview&&Number.isInteger(chosenSeed)&&chosenSeed>0&&chosenSeed<=4294967295?chosenSeed:20261015;
let game=null,room='distill',selectedCaskId=null,selectedProductId=null,userPaused=false,runtimeHalted=false,modal=null,timer=null,generation=0,elapsed=0,jump=0,canSave=!preview,lastSavedText=null;
const automaticNews=transientNotices({show:text=>{$('automatic-news').textContent=text;$('automatic-news').hidden=false;},hide:()=>{$('automatic-news').hidden=true;$('automatic-news').textContent='';}});
let rackKey='',shelfKey='',barrelKey='',glassKey='';
// Only presentation is remembered here; the saved filling phase owns unfinished work.
let shownFillSpiritId=null;

let shelfPage=0;
let modalReturnFocus=null;
let modalReturnObject=null;
let pointerInteraction=false;
const inputMode=pointer=>{pointerInteraction=pointer;$('action-dialog').dataset.input=pointer?'pointer':'keyboard';};
document.addEventListener('pointerdown',()=>inputMode(true),true);
document.addEventListener('keydown',()=>inputMode(false),true);
// Ephemeral display only; never stored or used by the simulation.
let deliveryNotice='';
let staffMigrationNotice=false;
// History is a read-only projection in an isolated worker, never save data.
let historyWorker=null,historyRequest=0,historyData=null,historyError='',historyLoading=false;
function openHistory(){
 if(!game||(modal&&!['aux-panel','ledger'].includes(modal.kind)))return;const parent=modal?.kind==='ledger'?rememberLedger():null;stopClock();jump=0;modal={kind:'history',year:null,page:0,parent};historyData=null;historyError='';historyLoading=true;const requestId=++historyRequest;
 try{
  if(!historyWorker){historyWorker=new Worker(new URL('./history-worker.mjs?v=0.58-first-brand',import.meta.url),{type:'module'});historyWorker.onmessage=({data})=>{if(data.requestId!==historyRequest||!['history','history-brand','history-shop'].includes(modal?.kind))return;historyLoading=false;historyData=data.history??null;historyError=data.error?'歩みを読めませんでした。':'';render();};historyWorker.onerror=()=>{if(!historyLoading)return;historyLoading=false;historyError='歩みを読めませんでした。';historyWorker?.terminate();historyWorker=null;if(modal?.kind==='history')render();};}
  historyWorker.postMessage({requestId,state:game});
 }catch{historyLoading=false;historyError='歩みを読めませんでした。';}
 render();
}

// All comparison selection and return paths are temporary display state.
const comparisonKinds=['cask-picker','cask-comparison','release-comparison','recipe-source','comparison-brand-record','recipes','ledger-release','ledger-recipe','ledger-cask','ledger-recipe-comparison'];
const comparisonStatus=x=>({'selling':'販売中','sold-out':'完売','stored':'保管中','wholesale':'卸売出荷'}[x?.status]??'状態不明');
const finiteText=(x,format=String)=>Number.isFinite(x)?format(x):'不明';
const caskType=x=>uiText(P.casks[x.type]?.short)??'たる不明';
function openCaskComparison(id){
 if(!game)return;const candidates=nearbyCasks(game).filter(c=>c.caskId!==id);if(!candidates.length)return;
 stopClock();modal={kind:candidates.length===1?'cask-comparison':'cask-picker',baseId:id,otherId:candidates.length===1?candidates[0].caskId:null,parent:modal,returnFocusId:document.activeElement?.id};render();
}
function openReleaseComparison(id){
 if(!previousRelease(game,id))return;stopClock();const parent=rememberLedger();modal={kind:'release-comparison',releaseId:id,parent,pair:null,error:''};render();
 try{modal.pair=releasePair(game,id);}catch{modal.error='販売記録を読めませんでした。';}render();
}
function openRecipes(){if(!game)return;stopClock();modal={kind:'recipes',parent:rememberLedger(),returnFocusId:document.activeElement?.id};render();}
function closeComparison(){const focusId=modal?.returnFocusId;modal=modal?.parent??null;render();schedule();restoreLedger(focusId);}
function comparisonSourceActions(item){
 if(!item||!item.manualSource)return '';const saved=game.recipeBook?.entries.some(r=>r.source.caskId===item.caskId);
 return button(saved?'製法を保存済み':'製法を残す','recipe-save',item.caskId,saved?'disabled':'');
}
function staffArt(item){return item?.brandId!==null&&item?.brandId!==undefined?releaseArt(item.productId,item.profile?.wood??0,item.brandId):barrel(item?.type??'bourbon');}
function staffTitle(item){return (item?.brandName?item.brandName+'\n'+caskName(item.caskId):caskName(item?.caskId))+(item?.productId!=null?'\n'+releaseTag(item.productId):'');}
function openStaffRequest(caskId=null){
 if(!game||!D.staffStatus(game).hired)return;const quote=D.staffQuote(game,caskId===null?undefined:caskId);if(!quote)return;
 const sourceId=caskId??quote.source?.caskId??D.selectedUsualRecipe(game)?.source?.caskId??null;
 stopClock();modal={kind:'staff-request',requestMode:D.operationDefaults(game).requestMode,caskId,sourceId,parent:modal,returnFocusId:document.activeElement?.id};render();
}
// Presentation rows escape values without rewriting user names or stored prose.
const copyFacts=items=>'<span class="copy-facts">'+items.map(([label,value])=>'<span class="copy-fact"><span class="copy-label">'+esc(label)+'</span> <span class="copy-value">'+esc(value)+'</span></span>').join(' ')+'</span>';
const jobName=kind=>kind==='distill'?'蒸留担当者':'ビン詰め担当者';
const jobStatus=kind=>kind==='distill'?D.staffStatus(game):D.bottlingStaffStatus(game);
function showStaffOpportunity(returnModal=null){
 if(!game||game.tastingId!==null||game.decisions.length||(!preview&&!canSave))return false;
 const opportunity=D.staffOpportunities(game)[0];if(!opportunity)return false;
 stopClock();jump=0;const before=game;
 try{game=D.noticeStaffOpportunity(game,opportunity.kind);if(!save()){game=before;return false;}modal={kind:'staff-opportunity',job:opportunity.kind,returnModal};return true;}
 catch(e){game=before;runtimeHalted=true;storageNotice(e.message);return false;}
}
function staffCostView(kind){const status=jobStatus(kind);return '<p>'+copyFacts([['採用費',money(status.hireCost)],['給与',money(status.salary)+(kind==='distill'?'／仕込み':'／回')]])+'</p><p class="quiet">'+(kind==='distill'?'仕込み開始時に支払い':'ビン詰め時に支払い')+'<br>待機中は無料</p>'+(status.canHire||status.hired?'':'<p class="quiet">'+esc(uiText(status.reason))+'</p>');}
function staffManagerView(){return ['distill','bottling'].filter(kind=>jobStatus(kind).unlocked).map(kind=>{const status=jobStatus(kind);return '<section class="staff-job"><h3>'+jobName(kind)+'</h3>'+(status.hired?'<p>採用済み</p><p>給与 '+money(status.salary)+(kind==='distill'?'／仕込み':'／回')+'</p>':staffCostView(kind))+(status.hired?button(kind==='distill'?'依頼・製法':'予約・停止','staff-job-open',kind):button('採用 '+money(status.hireCost),'staff-job-hire',kind,status.canHire?'':'disabled'))+'</section>';}).join('');}
function bottlerManagerView(){
 const status=D.bottlingStaffStatus(game);if(!status.hired)return staffCostView('bottling');
 const policy=D.commonBottlingPolicy(game),editing=modal.editPolicy||!policy;
 const common=editing?bottlingPolicyView():'<p>'+esc(policyLabel(policy))+'</p>'+button('条件を変える','bottling-policy-edit');
 return (modal.policyNotice?'<p role="status">'+esc(modal.policyNotice)+'</p>':'')+'<p>給与 '+money(status.salary)+'／回</p>'+common+'<p class="quiet">新しい予約から適用<br>今の予約はそのまま</p>'+(game.core.casks.length?'<div class="staff-casks">'+game.core.casks.map(c=>{const r=D.bottlingReservation(game,c.id),active=r?.status==='active';return '<div class="staff-cask-row"><p>'+esc(caskName(c.id))+' · '+ageLabel(c.age)+'</p>'+button('<span class="switch-track" aria-hidden="true"></span><span>'+(active?'任せる':'自分で行う')+'</span>','bottling-toggle',c.id,'role="switch" aria-checked="'+active+'" aria-label="'+esc(caskName(c.id))+' ビン詰めを任せる"')+(r&&r.status!=='completed'?'<p class="quiet">'+esc(reservationLabel(c.id))+'</p>'+button('予約取消','bottling-cancel',c.id):'')+'</div>';}).join('')+'</div>':'<p>熟成中のたるはありません</p>');
}
function staffRequestView(){
 const q=D.staffQuote(game,modal.caskId===null?undefined:modal.caskId),status=D.staffStatus(game);if(!q)return '<p>抽出位置・たるが不明です。</p>';
 const item=Number.isInteger(modal.sourceId)?sourceDetails(game,modal.sourceId):null;
 let out='<div class="staff-source-art">'+(item?staffArt(item):barrel(q.type))+'</div><h3 class="staff-source-title">'+esc(item?staffTitle(item):'選んだ製法')+'</h3><p class="staff-spec">'+copyFacts([['抽出',q.stopAt+' / '+extractionMaximum],['たる',uiText(P.casks[q.type].short)]])+'</p>';
 if(item?.commissionedFrom)out+='<p class="quiet">依頼元 '+caskName(item.commissionedFrom.caskId)+' '+button('元の記録','recipe-source',item.commissionedFrom.caskId)+'</p>';
 if(!status.hired&&!(status.legacy&&modal.caskId===null))return out+'<p>'+copyFacts([['採用費',money(status.hireCost)],['給与',money(status.salary)+'／仕込み']])+'</p><p class="quiet">仕込み開始時に支払い<br>待機中は無料</p>'+(status.canHire?'':'<p class="quiet">'+esc(uiText(status.reason))+'</p>');
 if(status.hired)out+='<div class="staff-modes" aria-label="依頼方式">'+[['once','1回だけ'],['three','3回まで'],['continuous','続ける']].map(([mode,label])=>button(label,'staff-mode',mode,'aria-pressed="'+(modal.requestMode===mode)+'"')).join('')+'</div>';
 const salary=status.hired?q.salary:0;
 out+='<p class="staff-cost">'+copyFacts([['給与',money(salary)+'／仕込み']])+'</p>';
 let wait=[];if(game.core.casks.length>=4)wait.push('貯蔵庫が満杯です。');const minimum=q.minimum-(status.hired?0:q.salary);if(game.core.cash<minimum)wait.push('必要資金 '+money(minimum)+'（ビン詰め費を含む）');
 if(wait.length)out+='<p class="quiet">'+wait.map(esc).join('<br>')+'</p>';
 return out;
}
function staffCanRequest(){return game.still.phase==='ready'&&!game.usual.reservation&&generationState()?.phase==='working'&&!game.decisions.length&&!game.trade.offer;}
function caskIdentity(x){return '<span>'+esc(caskType(x))+'</span><small>'+ageLabel(x.age)+'</small>';}
function caskPickerView(){
 const items=nearbyCasks(game),base=items.find(c=>c.caskId===modal.baseId);if(!base)return '';
 return '<div class="nearby-origin"><span>'+barrel(base.type)+'</span><p>このたる<br>'+esc(caskType(base))+'<br>'+ageLabel(base.age)+'</p></div><div class="nearby-picker">'+items.filter(c=>c.caskId!==base.caskId).map(c=>button('<span class="nearby-pick-art">'+barrel(c.type)+'</span><strong>'+caskName(c.caskId)+'</strong><span>'+esc(caskType(c))+'</span><small>'+ageLabel(c.age)+'</small>','compare-cask-select',c.caskId)).join('')+'</div>';
}
function compareFact(label,a,b){return '<section class="nearby-fact"><h3>'+esc(label)+'</h3><div><span>'+a+'</span><span>'+b+'</span></div></section>';}
function caskComparisonView(){
 const items=nearbyCasks(game),pair=[items.find(c=>c.caskId===modal.baseId),items.find(c=>c.caskId===modal.otherId)];if(pair.some(x=>!x)||pair[0].caskId===pair[1].caskId)return '';
 let out='<div class="nearby-pair">'+pair.map((c,i)=>'<article><span class="nearby-art">'+barrel(c.type)+'</span><strong>'+['このたる','比べるたる'][i]+'</strong>'+caskIdentity(c)+'</article>').join('')+'</div>';
 out+=compareFact('風味',...pair.map(c=>flavorTypeView(c.profile)||'記録なし'));
 for(const {label,key} of FLAVOR_AXES)out+=compareFact(label,...pair.map(c=>flavorMeter(c.profile,key)));
 out+='<details class="comparison-supplement"><summary>たるの詳細</summary>'+compareFact('抽出位置',...pair.map(c=>finiteText(c.stopAt,n=>n+' / '+extractionMaximum)))+compareFact('仕込み',...pair.map(c=>finiteText(c.filledMonth,monthLabel)))+compareFact('残量',...pair.map(c=>finiteText(c.litres,n=>n.toFixed(1)+' L')))+'</details>';
 if(items.length>2)out+='<div class="nearby-change">'+button('相手を変える','compare-cask-change')+'</div>';
 return out;
}
function releaseComparisonButton(release){return release&&previousRelease(game,release.id)?button('前と比べる','compare-release',release.id):'';}
function releaseSalesCount(x){return x.retail?x.retail.count+(Number.isInteger(x.retailTargetCount)?' / '+x.retailTargetCount:'')+'本':'本数不明';}
function releasePeriod(x){if(x.status==='stored'&&x.listedMonth===null&&x.retail?.count===0&&x.salesComplete)return '販売前';return Number.isInteger(x.retailActiveMonths)?x.retailActiveMonths+'か月':'期間不明';}
function releasePrice(x){
 const prices=x.retailPriceTotals??[],changes=(x.priceChanges??[]).filter(p=>!p.initial),actual=prices.map(p=>p.price);
 if(!x.salesComplete)return finiteText(x.currentPrice,n=>unit(n)+'<small>現在・最終設定 / 過去不明</small>');
 const range=actual.length?Math.min(...actual)===Math.max(...actual)?unit(actual[0]):unit(Math.min(...actual))+'〜'+unit(Math.max(...actual)):finiteText(x.currentPrice,n=>unit(n)+'<small>設定価格</small>');
 return range+'<small>'+(actual.length?'実売 ':'')+(changes.length?'設定変更 '+changes.length+'回':'設定変更なし')+'</small>'+(actual.length&&Number.isFinite(x.currentPrice)&&actual.at(-1)!==x.currentPrice?'<small>現在・最終設定 '+unit(x.currentPrice)+'</small>':'');
}
function releaseComparisonView(){
 if(modal.error)return '<p role="status">'+esc(modal.error)+'</p>';if(!modal.pair)return '<p role="status">販売記録を読込中</p>';
 const pair=[modal.pair.current,modal.pair.previous];if(pair.some(x=>!x))return '';
 let out='<div class="nearby-pair nearby-releases">'+pair.map((x,i)=>'<article><span class="nearby-art">'+releaseArt(x.productId,x.profile?.wood??0,x.brandId)+'</span><strong>'+['今回','前回'][i]+' '+esc(releaseTag(x.productId))+'</strong><span>'+esc(x.brandName)+'</span><small>'+esc(caskType(x))+'<br>'+finiteText(x.age,ageLabel)+'<br>'+comparisonStatus(x)+'</small></article>').join('')+'</div>';
 out+=compareFact('風味',...pair.map(x=>flavorTypeView(x.profile)||'記録なし'));
 for(const {label,key} of FLAVOR_AXES)out+=compareFact(label,...pair.map(x=>flavorMeter(x.profile,key)));
 out+='<details class="comparison-supplement"><summary>販売結果・元の記録</summary>';
 out+=compareFact('自家販売',...pair.map(releaseSalesCount));out+=compareFact('販売期間',...pair.map(releasePeriod));out+=compareFact('販売価格 / 本',...pair.map(releasePrice));
 const shopCounts=pair.map(x=>(x.shops??[]).reduce((n,d)=>n+d.count,0));if(shopCounts.some(n=>n>0))out+=compareFact('取扱店',...pair.map((x,i)=>x.salesComplete?'店へ'+shopCounts[i]+'本':shopCounts[i]?'確認できた納品 '+shopCounts[i]+'本':'納品記録不明'));
 out+='<div class="nearby-conditions">'+pair.map(x=>'<span>'+finiteText(x.stopAt,n=>'抽出 '+n)+'<br>'+esc(caskType(x))+'<br>ビン詰め '+finiteText(x.age,ageLabel)+'</span>').join('')+'</div>';
 if(pair.some(x=>(x.retailPriceTotals??[]).length>1))out+='<details class="nearby-prices"><summary>販売価格の記録</summary>'+pair.map((x,i)=>'<p>'+['今回','前回'][i]+'<br>'+(x.retailPriceTotals??[]).map(p=>unit(p.price)+'で'+p.count+'本').join(' / ')+'</p>').join('')+'</details>';
 return out+'</details>';
}
function recipeSourceView(){const item=sourceDetails(game,modal.caskId);if(!item)return '<p>元の記録はありません。</p>';return '<div class="nearby-source"><span class="nearby-art">'+(item.kind==='cask'||item.kind==='source'&&item.productId===null?barrel(item.type):releaseArt(item.productId,item.profile?.wood??0,item.brandId))+'</span><h3>'+esc(item.brandName??caskName(item.caskId))+'</h3><p>'+copyFacts([['たる',caskType(item)],['抽出',finiteText(item.stopAt,n=>n+' / '+extractionMaximum)]])+'</p><details><summary>元の記録</summary><p>'+caskName(item.caskId)+'<br>'+finiteText(item.filledMonth,monthLabel)+'仕込み'+(item.productId!=null?'<br>'+releaseTag(item.productId):'')+(item.generationId?'<br>'+generationName(item.generationId):'')+'</p></details>'+comparisonSourceActions(item)+(item.commissionedFrom?'<p>'+button('依頼元の記録','recipe-source',item.commissionedFrom.caskId)+'</p>':'')+'</div>';}
function recipesView(){return ledgerRecipeList();}

function recipeAction(fn){const halted=runtimeHalted;stopClock();try{game=fn(game);save();}catch(e){storageNotice(e.message);}runtimeHalted=halted;render();schedule();}

const historyYears=()=>[...new Set((historyData?.events??[]).map(e=>monthLabel(e.month).split('年')[0]))];
function historyEventText(e){
 if(e.kind==='generation-start')return generationName(e.generationNumber??e.generationId??1)+'が蒸留所を始めた';
 if(e.kind==='generation-handover')return generationName(e.generationNumber??e.generationId)+'から'+generationName(e.nextGeneration??e.nextGenerationNumber??e.nextGenerationId??(e.generationNumber??e.generationId)+1)+'へ引継ぎ';
 if(e.kind==='generation-fixed')return generationName(e.generationNumber??e.generationId)+'の最後の仕込みを決めた'+(e.trigger?.kind==='tenure-limit'?' · 在任期限':e.trigger?.kind==='funds-stalled'?' · 資金の状況':'');
 const brand=e.brandName??(game.brands.find(b=>b.id===e.brandId)?.name),name=brand? '「'+brand+'」':'';
 const release=e.productId!==undefined?' · '+releaseTag(e.productId):'',count=Number.isFinite(e.count)?' · '+e.count+'本':'',age=Number.isFinite(e.age)?' · '+ageLabel(e.age):'';
 const first=historyData?.coverage?.complete&&historyData.events.find(x=>x.kind==='distillation')?.id===e.id;
 const kinds={distillation:first?'初めての蒸留':'蒸留',fill:'たる詰め',bottling:e.rerelease?'再発売のビン詰め':'ビン詰め','retail-first-sale':'自家販売で初めて売れた','shop-start':'取扱い開始','shop-delivery':'納品','department-adoption':(e.projectName??'特選ウイスキー')+'に採用','wholesale-start':'卸売の取引開始','wholesale-shipment':'卸売出荷','special-order-accepted':'特別注文を受注','special-order-fulfilled':'特別注文を出荷','special-order-cancelled':'特別注文を取消','special-order-unmet':'特別注文の風味を確認','special-order-resolved':'特別注文の販売方法を選択'};
 const extraction=Number.isInteger(e.stopAt)?'抽出位置 '+e.stopAt+' / '+extractionMaximum:Number.isFinite(e.cut)?'抽出'+Math.round(e.cut*100)+'%':({early:'早め抽出',middle:'中盤抽出',late:'後半抽出'}[e.cut]??'');
 const type=uiText(P.casks[e.type]?.short),profile=e.kind==='distillation'?spiritProfile({...e.profile,litres:0})?.phrase:null;
 return name+(name?' · ':'')+(Number.isInteger(e.caskId)?caskName(e.caskId)+' · ':'')+(e.kind==='distillation'&&extraction?extraction+' · ':'')+(type?type+' · ':'')+(e.shopId?shopName(e.shopId)+' · ':e.partner?e.partner+' · ':'')+(kinds[e.kind]??'記録')+release+age+count+(Number.isFinite(e.revenue)?' · '+unit(e.revenue):'')+(profile?' · '+profile:'')+(e.generationTrigger?' · '+generationName(e.generationTrigger)+'の最後の仕込みを決めた':'')+(e.finalGeneration?' · '+generationName(typeof e.finalGeneration==='number'?e.finalGeneration:e.finalGeneration.id??e.generationNumber)+'の最後の仕込み':'');
}
function historyView(){
 if(historyLoading)return '<p role="status">読込中</p>';
 if(historyError)return '<p role="status">'+esc(historyError)+'</p>';
 if(!historyData)return '';
 const months=historyData.elapsedMonths,years=historyYears(),selected=modal.year;
 let out='<p class="history-elapsed">'+Math.floor(months/12)+'年'+(months%12)+'か月</p>';
 if(historyData.coverage?.notes?.length)out+='<p class="quiet history-coverage">'+historyData.coverage.notes.map(esc).join('<br>')+'</p>';
 if(!years.length)return out+'<p>記録なし</p>';
 out+='<div class="history-years">'+years.map(y=>'<section class="history-year"><h3>'+button(y+'年','history-year',y,'aria-expanded="'+(selected===y)+'"')+'</h3>'+(selected===y?historyYearEvents(y):'')+'</section>').join('')+'</div>';
 return out;
}
function historyYearEvents(year){
 const events=historyData.events.filter(e=>monthLabel(e.month).split('年')[0]===year),page=modal.page??0,start=page*50;
 return '<ol class="history-events">'+events.slice(start,start+50).map(e=>'<li data-history-event="'+esc(e.id)+'"><time>'+monthLabel(e.month)+'</time><p>'+esc(historyEventText(e))+'</p><div class="history-links">'+(e.brandId!==undefined&&e.brandId!==null?button('ブランドの記録','history-brand',e.brandId):'')+(e.shopId?button('取扱店の記録','history-shop',e.shopId):'')+'</div></li>').join('')+'</ol>'+(events.length>50?'<div class="history-pagination">'+button('前の50件','history-page',page-1,page===0?'disabled':'')+'<span>'+(start+1)+'–'+Math.min(start+50,events.length)+' / '+events.length+'件</span>'+button('次の50件','history-page',page+1,start+50>=events.length?'disabled':'')+'</div>':'');
}
function historyBrandView(brandId){
 const brand=game.brands.find(b=>b.id===brandId);if(!brand)return '<p>ブランドの記録なし</p>';
 return '<div class="brand-history-art">'+brandDisplay(brand)+'</div>'+game.releases.filter(r=>r.brandId===brandId).map(r=>'<p>'+releaseTag(r.productId)+' · '+ageLabel(r.age)+' · '+r.bottles+'本</p>').join('')+(historyData?.events??[]).filter(e=>e.brandId===brandId&&e.kind==='department-adoption').map(e=>'<p>'+monthLabel(e.month)+' · '+esc(e.projectName??'特選ウイスキー')+'に採用'+(e.productId!==undefined?' · '+releaseTag(e.productId):'')+'</p>').join('')+(historyData?.shops??[]).filter(r=>r.brandId===brandId).map(r=>'<p>'+button(shopName(r.shopId)+'の記録','history-shop',r.shopId)+'</p>').join('');
}
function historyShopView(shopId){
 const rows=(historyData?.shops??[]).filter(r=>r.shopId===shopId);
 return rows.length?rows.map(r=>'<article class="history-shop-brand"><h3>'+esc(r.brandName??'ブランド')+'</h3>'+(Number.isInteger(r.startedMonth)?'<p>取扱い開始 '+monthLabel(r.startedMonth)+'</p>':'')+'<p>納品 '+r.deliveries+'回 · '+r.bottles+'本 · '+unit(r.revenue)+'</p>'+(Number.isInteger(r.firstDeliveryMonth)?'<p>初回納品 '+monthLabel(r.firstDeliveryMonth)+'</p>':'')+(Number.isInteger(r.lastDeliveryMonth)?'<p>最終納品 '+monthLabel(r.lastDeliveryMonth)+'</p>':'')+button('記録','history-brand',r.brandId)+'</article>').join(''):'<p>納品なし</p>';
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
 if(t.kind==='brand-rerelease')return (brand?.name??'ブランド')+'を再発売'+(r?' · '+releaseTag(r.productId):'');
 if(t.kind==='mature-bottling'){const age=r?.age??record?.age;return (Number.isFinite(age)?ageLabel(age)+'熟成の原酒を':'熟成した原酒を')+'ビン詰め';}
 if(t.kind==='long-shop-delivery')return shopName(t.shopId)+'へ納品'+(brand?' · '+brand.name:'');
 if(t.kind==='tenure-limit')return '在任期限';
 if(t.kind==='funds-stalled')return '資金の状況';
 return '';
}
function generationReview(g){
 let text='<p>'+monthLabel(g.startedMonth)+'から'+monthLabel(game.core.month)+'まで · '+Math.floor(g.tenureMonths/12)+'年'+g.tenureMonths%12+'か月</p>';
 const cause=generationCauseText(g);if(cause)text+='<p>区切り · '+esc(cause)+' · '+monthLabel(g.fixedMonth)+'</p>';
 text+=g.lastStatus==='filled'&&g.lastCaskId!==null?'<p>'+esc(caskName(g.lastCaskId))+' · '+esc(generationName(g.id))+'の最後の仕込み</p>':g.lastStatus==='unfinished'?'<p>未完成の原酒は次の代へ引き継ぎます。</p>':'<p>最後の仕込みは見送り、次の代へ。</p>';
 const reason={'grace-ended':'仕込みの猶予を終えました。','funds-stalled':'資金を残して、次の代へ引き継ぎます。'};if(reason[g.reason])text+='<p class="quiet">'+esc(reason[g.reason])+'</p>';
 if(g.lastStatus==='not-made'&&game.still.phase!=='ready')text+='<p class="quiet">進行中の蒸留と原酒は引継ぎ</p>';
 return text;
}
const releaseFor=id=>game.releases.find(r=>r.productId===id);
const releaseTag=id=>releaseLabel(game,id,caskSerials(game));
const releaseSource=id=>{const r=releaseFor(id);return r?caskName(r.caskId)+' · '+ageLabel(r.age):'';};
const brandFor=id=>game.brands.find(b=>b.id===releaseFor(id)?.brandId);
const releaseArt=(id,wood=0,brandId=null)=>{const brand=brandId===null?brandFor(id):game.brands.find(b=>b.id===brandId);return brand?brandArt(wood,brand,releasePriceTier(game,id)):bottleArt(wood,releasePriceTier(game,id));};
const productArt=p=>releaseArt(p.id,p.wood);
const brandDisplay=brand=>{const release=game.releases.findLast(r=>r.brandId===brand.id);return brandArt(0,brand,releasePriceTier(game,release?.productId));};

// Cached detached display projection. Replay facts are requested once per game snapshot.
let ledgerSnapshot=null,ledgerProjection=null;
function ledgerData(){
 if(ledgerSnapshot!==game){const productIds=[...new Set([...game.releases,...game.records].map(r=>r.productId).filter(Number.isFinite))],caskIds=[...new Set([...game.releases,...game.records].map(r=>r.caskId).filter(Number.isFinite))];ledgerProjection=buildReleaseLedger(game,{facts:D.nearbyComparisonFacts(game,{productIds,caskIds})});ledgerSnapshot=game;}
 return ledgerProjection;
}
function rememberLedger(){
 if(modal){modal.scrollTop=$('dialog-body').scrollTop;modal.openDetails=[...$('dialog-body').querySelectorAll('details')].map((d,i)=>d.open?i:-1).filter(i=>i>=0);modal.focusId=document.activeElement?.id;modal.focusAction=document.activeElement?.dataset?.action;modal.focusTarget=document.activeElement?.dataset?.id;}
 return modal;
}
function restoreLedger(focusId){if(!modal?.openDetails){if(focusId)queueMicrotask(()=>$(focusId)?.focus({preventScroll:true}));return;}queueMicrotask(()=>{const body=$('dialog-body');body.querySelectorAll('details').forEach((d,i)=>{d.open=modal?.openDetails?.includes(i)??false;});($(focusId||modal?.focusId)??(modal?.focusAction?body.querySelector('[data-action="'+CSS.escape(modal.focusAction)+'"][data-id="'+CSS.escape(modal.focusTarget??'')+'"]'):null))?.focus({preventScroll:true});body.scrollTop=modal?.scrollTop??0;});}
const known=(n,format=String)=>Number.isFinite(n)?format(n):'記録なし';
const ledgerCask=e=>Number.isFinite(e.caskId)?caskName(e.caskId):'元たる 記録なし';
function releaseRow(e){return '<button type="button" class="ledger-release-row" id="ledger-'+esc(e.key)+'" data-action="ledger-release" data-id="'+esc(e.key)+'"><span class="ledger-bottle">'+releaseArt(e.productId,e.profile?.wood??0,e.brandId)+'</span><span>'+esc(known(e.date,monthLabel))+(e.releaseId!==null?' · #'+e.releaseId:'')+'<br>'+esc(ledgerCask(e))+' · '+known(e.bottles,n=>n+'本')+'<br>'+esc(comparisonStatus(e))+'</span></button>';}
function brandComparisonRecordView(id){return '<div class="ledger-release-list">'+ledgerData().entries.filter(e=>e.brandId===id).slice().reverse().map(releaseRow).join('')+'</div>';}
function legacyTradeHistory(){
 const rows=game.trade?.history??[];if(!rows.length)return '';
 const labels={offered:'申し出',accepted:'取引開始',declined:'見送り',assigned:'出荷予約',shipped:'卸売出荷',cancelled:'予約取消',completed:'取引完了'};
 return '<details class="ledger-category"><summary>以前の卸取引</summary>'+rows.map(h=>'<p>'+esc(known(h.month,monthLabel))+' '+esc(labels[h.kind]??h.kind)+'<br>'+esc(h.partner??'')+(Number.isFinite(h.caskId)?'<br>'+esc(caskName(h.caskId)):'')+(Number.isFinite(h.bottles)?'<br>'+h.bottles+'本':'')+(Number.isFinite(h.net)?'<br>入金 '+money(h.net):Number.isFinite(h.revenue)?'<br>入金 '+money(h.revenue):'')+'</p>').join('')+'</details>';
}
function ledgerView(){
 const section=modal.section,nav='<nav class="ledger-sections" aria-label="帳面の分類">'+[['recipes','仕込み'],['aging','樽と熟成'],['releases','発売'],['shops','取扱店']].map(([id,label])=>button(label,'ledger-section',id,'id="ledger-section-'+id+'" aria-pressed="'+(section===id)+'"')).join('')+'</nav>';
 let body='';
 if(section==='recipes')body=ledgerRecipeList()+(D.staffStatus(game).hired?button('選んだ製法で任せる','ledger-request'):'');
 else if(section==='aging')body=ledgerCaskList();
 else if(section==='releases'){
 const data=ledgerData();body=data.brands.map(b=>'<div class="brand-readout">'+brandDisplay(b)+'<span>'+esc(b.name)+'<br>'+esc((IDENTITY_BOTTLES.find(x=>x.id===b.bottle)?.name??'丸ビン').replace('ビン',''))+' · '+esc(IDENTITY_LABELS.find(x=>x.id===b.label)?.name??'ホワイト')+'</span></div><details><summary>ブランドの実績</summary>'+brandSummary(b.id)+'</details>').join('');
 body+=data.entries.length?'<div class="ledger-release-list">'+data.entries.slice().reverse().map(releaseRow).join('')+'</div>':'<p>発売の記録はまだありません。</p>';
 }else if(section==='shops'){body=game.brands.map(b=>shopHistory(b.id,true)).join('')+shopOrderLedger()+legacyTradeHistory();if(!body)body='<p>取扱いの記録はまだありません。</p>';}
 else body='<div class="ledger-totals"><p>売上累計 '+money(game.core.totals.revenue)+'</p><p>維持費累計 '+money(game.core.totals.upkeep)+'</p></div>';
 return nav+body+'<p>'+button('蒸留所の歩み','ledger-history')+'</p>';
}
function ledgerReleaseView(){
 const e=ledgerData().entries.find(e=>e.key===modal.key);if(!e)return '<p>記録なし</p>';const record=e.record,b=game.brands.find(b=>b.id===e.brandId);
 let out='<article class="ledger-release-detail"><span class="release-bottle">'+releaseArt(e.productId,e.profile?.wood??0,e.brandId)+'</span><h3>'+esc(known(e.date,monthLabel))+'</h3><p>'+esc(b?.name??e.name??'記録なし')+'</p>'+copyFacts([['元たる',ledgerCask(e)],['瓶詰め時',known(e.age,ageLabel)],['瓶詰め',known(e.bottles,n=>n+'本')],['在庫',known(e.stock,n=>n+'本')],['販売価格',known(e.price,n=>unit(n)+'／本')],['自家販売',known(e.retail.count,n=>n+'本')],['売上',known(e.retail.revenue,money)],[e.deliveryComplete?'取扱店へ納品':'確認できた納品',known(e.deliveries.count,n=>n+'本')],[e.deliveryComplete?'入金':'確認できた入金',known(e.deliveries.revenue,money)]])+'<p>'+esc(comparisonStatus(e))+'</p>'+(e.profile?flavorTypeView(e.profile):'<p>風味 記録なし</p>');
 if(e.wholesale)out+='<p>卸売出荷 '+esc(e.wholesale.partner??'')+'</p>'+copyFacts([['出荷',known(e.wholesale.count,n=>n+'本')],['入金',known(e.wholesale.revenue,money)]]);
 if(Number.isFinite(e.caskId))out+=button('元たる・仕込みの記録','recipe-source',e.caskId);
 const release=game.releases.find(r=>r.id===e.releaseId);out+=releaseComparisonButton(release);
 if(record){out+='<details><summary>試飲・熟成の記録</summary>'+provenanceTag(e.caskId)+recordText(record.description)+(record.taste??[]).filter(text=>!(record.samples??[]).some(s=>s.text?.includes(text))).map(recordText).join('')+recordTimeline(record.samples,record.observations,record.choices)+recordText(({'fulfilled':'特別注文達成','unmet-retail':'特別注文から自分で販売','unmet-wholesale':'特別注文から通常卸売'})[record.order?.outcome])+'</details>';}
 else out+='<p class="quiet">試飲の記録なし</p>';
 return out+'</article>';
}

// Recipe/cask history is an ephemeral read projection, never part of a saved game.
let caskSnapshot=null,caskProjection=null;
function caskData(){
 if(caskSnapshot!==game){const manual=D.nearbyComparisonFacts(game,{includeManualSources:true}),caskIds=[...new Set([...game.core.casks,...game.core.archive,...game.records,...game.releases,...manual.manualSources,...(game.recipeBook?.entries??[]).map(r=>r.source)].map(c=>c.caskId??c.id).filter(Number.isFinite))];
 const facts=D.nearbyComparisonFacts(game,{caskIds,includeManualSources:true});caskProjection=buildCaskLedger(game,{facts,replay:observer=>D.replayDistilleryOperations(game,observer)});caskSnapshot=game;}
 return caskProjection;
}
function recipeRows(){
 const recipes=caskData().recipes,rows=new Map();
 for(const r of [...recipes.saved,...recipes.unsaved,...(recipes.latestManual?[recipes.latestManual]:[])]){if(!Number.isFinite(r.caskId))continue;const existing=rows.get(r.caskId);if(existing){if(r.saved&&!existing.savedRecipes.some(x=>x.id===r.id))existing.savedRecipes.push(r);continue;}rows.set(r.caskId,{...r,savedRecipes:r.saved?[r]:[]});}
 return [...rows.values()].sort((a,b)=>(b.filledMonth??-1)-(a.filledMonth??-1)||b.caskId-a.caskId);
}
const caskEntry=id=>caskData().casks.find(c=>c.caskId===id);
const ledgerType=c=>uiText(P.casks[c?.type]?.short)??'記録なし';
const ledgerBarrel=c=>P.casks[c?.type]?barrel(c.type):'';
const ledgerCaskStatus=c=>c.status==='aging'?'熟成中':c.status==='ended'?'熟成終了':['bottled','bottled-out','finished'].includes(c.status)?'瓶詰め済み':'状態の記録なし';
function ledgerPaged(rows,renderRow){const page=Math.min(modal.listPage??0,Math.max(0,Math.ceil(rows.length/20)-1)),start=page*20;return '<div class="ledger-release-list">'+rows.slice(start,start+20).map(renderRow).join('')+'</div>'+(rows.length>20?'<div class="history-pagination">'+button('前の20件','ledger-list-page',page-1,page===0?'disabled':'')+'<span>'+(start+1)+'–'+Math.min(rows.length,start+20)+' / '+rows.length+'</span>'+button('次の20件','ledger-list-page',page+1,start+20>=rows.length?'disabled':'')+'</div>':'');}
function ledgerRecipeList(){const rows=recipeRows();return rows.length?ledgerPaged(rows,r=>'<button type="button" class="ledger-release-row" id="ledger-recipe-'+r.caskId+'" data-action="ledger-recipe-open" data-id="'+r.caskId+'"><span class="ledger-bottle">'+ledgerBarrel(r)+'</span><span>'+esc(r.savedRecipes.map(x=>x.name).filter(Boolean).join('／')||'手動仕込み')+'<br>'+esc(caskName(r.caskId))+' · '+esc(ledgerType(r))+'<br>'+esc(known(r.filledMonth,monthLabel))+'</span></button>'):'<p>仕込みの記録なし</p>';}
function ledgerCaskList(){const rows=caskData().casks.slice().sort((a,b)=>(b.filledMonth??-1)-(a.filledMonth??-1)||b.caskId-a.caskId);return rows.length?ledgerPaged(rows,c=>'<button type="button" class="ledger-release-row" id="ledger-cask-'+c.caskId+'" data-action="ledger-cask-open" data-id="'+c.caskId+'"><span class="ledger-bottle">'+ledgerBarrel(c)+'</span><span>'+esc(caskName(c.caskId))+' · '+esc(ledgerType(c))+'<br>'+esc(known(c.filledMonth,monthLabel))+'<br>'+esc(ledgerCaskStatus(c))+' · '+esc(known(c.age,ageLabel))+'</span></button>'):'<p>たるの記録なし</p>';}
function openLedgerDetail(kind,caskId,focusId){const parent=rememberLedger();modal={kind,caskId,parent,returnFocusId:focusId};render();$('dialog-body').scrollTop=0;}
const knownProfile=p=>FLAVOR_AXES.every(({key})=>Number.isFinite(p?.[key]));
function ledgerProfile(profile,previous=null){return profile?(knownProfile(profile)?flavorTypeView(profile):'<p>風味の記録なし</p>')+FLAVOR_AXES.map(({label,key})=>'<section class="tasting-flavor"><h3>'+esc(label)+'</h3>'+flavorMeter(profile,key,{previousProfile:previous})+'</section>').join(''):'<p>原酒の特徴 記録なし</p>';}
function linkedReleases(c){const rows=ledgerData().entries.filter(r=>(c.releaseKeys??[]).includes(r.key));return rows.length?'<details class="ledger-related"><summary>関連する発売 '+rows.length+'回</summary>'+rows.map(releaseRow).join('')+'</details>':'<p class="quiet">関連する発売の記録なし</p>';}
function ledgerRecipeDetail(){
 const r=recipeRows().find(r=>r.caskId===modal.caskId),c=caskEntry(modal.caskId);if(!r||!c)return '<p>記録なし</p>';
 const latest=caskData().recipes.latestManual?.caskId===r.caskId,selected=game.recipeBook?.selectedId??null;
 let out='<article class="ledger-cask-detail"><span class="release-bottle">'+ledgerBarrel(c)+'</span><h3>'+esc(r.savedRecipes.map(x=>x.name).filter(Boolean).join('／')||'手動仕込み')+'</h3><p>'+esc(caskName(c.caskId))+'</p>'+copyFacts([['仕込み',known(r.filledMonth,monthLabel)],['抽出',known(r.stopAt,n=>n+' / '+extractionMaximum)],['たる',ledgerType(r)]])+'<details><summary>仕込み時の原酒</summary>'+ledgerProfile(c.initialProfile)+'</details>';
 for(const saved of r.savedRecipes)out+=button(selected===saved.id?'保存製法を選択中':'この製法を使う','recipe-select',saved.id,'aria-pressed="'+(selected===saved.id)+'"');
 if(latest)out+=button(selected===null?'前回の仕込みを選択中':'前回の仕込みを使う','recipe-select','latest','aria-pressed="'+(selected===null)+'"');
 if(!r.savedRecipes.length&&c.manualSource)out+=button('製法を残す','recipe-save',c.caskId,(game.recipeBook?.entries.length??0)>=64?'disabled':'');
 if(recipeRows().length>1)out+=button('仕込みを比べる','ledger-source-compare',c.caskId);
 if(D.staffStatus(game).hired&&D.staffQuote(game,c.caskId))out+=button('この仕込みで任せる','ledger-recipe-request',c.caskId);
 out+=button('たる・熟成の記録','ledger-cask-open',c.caskId)+linkedReleases(c);return out+'</article>';
}
function ledgerRecipeComparison(){
 const rows=recipeRows(),a=rows.find(r=>r.caskId===modal.caskId),b=rows.find(r=>r.caskId===modal.otherId);if(!a||!b)return '<p>記録なし</p>';const pair=[a,b];
 return '<label for="ledger-compare-choice">比べる仕込み</label><select id="ledger-compare-choice">'+rows.filter(r=>r.caskId!==a.caskId).map(r=>'<option value="'+r.caskId+'"'+(r.caskId===b.caskId?' selected':'')+'>'+esc(caskName(r.caskId)+' '+(r.savedRecipes[0]?.name??ledgerType(r)))+'</option>').join('')+'</select><div class="nearby-pair">'+pair.map(r=>'<article><span class="nearby-art">'+ledgerBarrel(r)+'</span><strong>'+esc(caskName(r.caskId))+'</strong></article>').join('')+'</div>'+compareFact('抽出位置',...pair.map(r=>esc(known(r.stopAt,n=>n+' / '+extractionMaximum))))+compareFact('たる',...pair.map(r=>esc(ledgerType(r))))+compareFact('仕込み',...pair.map(r=>esc(known(r.filledMonth,monthLabel))))+FLAVOR_AXES.map(({label,key})=>compareFact(label,...pair.map(r=>flavorMeter(caskEntry(r.caskId)?.initialProfile,key)))).join('');
}
function ledgerCaskDetail(){
 const c=caskEntry(modal.caskId);if(!c)return '<p>記録なし</p>';let out='<article class="ledger-cask-detail"><span class="release-bottle">'+ledgerBarrel(c)+'</span><h3>'+esc(caskName(c.caskId))+'</h3>'+copyFacts([['仕込み',known(c.filledMonth,monthLabel)],['たる',ledgerType(c)],['状態',ledgerCaskStatus(c)],['熟成記録',known(c.age,ageLabel)],['原酒量',known(c.litres,n=>n.toFixed(1)+' L')]])+'';
 if(c.status==='aging'){out+=button('試す','ledger-cask-taste',c.caskId);if(game.core.casks.length>1)out+=button('比べる','ledger-cask-compare',c.caskId);}
 if(recipeRows().some(r=>r.caskId===c.caskId))out+=button('元の仕込み','ledger-recipe-open',c.caskId);
 out+=caskTimeline(c)+linkedReleases(c);
 if(!caskData().coverage.complete)out+='<p class="quiet">記録の残る範囲</p>';
 return out+'</article>';
}
function caskTimeline(c){
 const groups=new Map(),add=(age,html,text=null)=>{const key=Number.isFinite(age)?age:null;if(!groups.has(key))groups.set(key,{html:'',texts:new Set()});const group=groups.get(key);if(text!==null){if(group.texts.has(text))return;group.texts.add(text);}group.html+=html;};
 const samples=c.samples??[];samples.forEach((sample,i)=>{add(sample.age,'<div class="ledger-taste" data-sample="'+i+'"><h4>試飲</h4>'+ledgerProfile(sample.profile,i?samples[i-1].profile:null)+'</div>');for(const t of sample.text??[])add(sample.age,recordText(t),t);if(i&&knownProfile(sample.profile)&&knownProfile(samples[i-1].profile))add(sample.age,recordText(shortChange(sample,samples[i-1])));});
 for(const h of c.history??[]){const age=Number.isFinite(h.age)?h.age:Number.isFinite(h.month)&&Number.isFinite(c.filledMonth)?h.month-c.filledMonth:null;const sameTasting=samples.some(sample=>sample.age===age&&typeof h.text==='string'&&(sample.text??[]).join('。').replace(/。+$/,'')===h.text.replace(/。+$/,''));if(!sameTasting)add(age,recordText(h.text),h.text);}
 for(const o of c.observations??[])for(const text of [o.title,o.text].filter(Boolean))add(o.age,recordText(text),text);
 for(const choice of c.choices??[])if(!(choice.key==='cool'&&(c.observations??[]).some(o=>o.eventId==='manual-cool'&&o.age===choice.age)))add(choice.age,recordText(choice.text),choice.text);
 const shownVolumes=new Set();for(const v of c.volumeHistory??[]){const key=[v.age,v.month,v.litres].join(':');if(shownVolumes.has(key))continue;shownVolumes.add(key);add(v.age,'<p class="ledger-volume">'+esc(known(v.month,monthLabel))+' · '+esc(known(v.litres,n=>n.toFixed(1)+' L'))+'</p>');}
 if(!groups.size)return '<p>試飲・熟成の記録なし</p>';
 return '<ol class="record-timeline">'+[...groups].sort((a,b)=>(a[0]??Infinity)-(b[0]??Infinity)).map(([age,g])=>'<li data-age="'+(age??'unknown')+'"><time>'+esc(known(age,ageLabel))+'</time>'+g.html+'</li>').join('')+'</ol>';
}
function finishLedgerTasting(){const parent=modal?.ledgerParent;if(!parent)return;act(D.endTasting,()=>{modal=parent;},()=>restoreLedger());}
// Ledger formatting reads existing records only; stored prose is never rewritten.
const recordText=text=>typeof text==='string'&&text.trim()?'<p class="record-text">'+esc(text)+'</p>':'';
function recordTimeline(samples=[],observations=[],choices=[],withChanges=false){
 const ages=new Map(),add=(age,html)=>{if(html)ages.set(age,(ages.get(age)??'')+html);};
 samples.forEach((sample,i)=>{add(sample.age,(sample.text??[]).map(recordText).join(''));if(withChanges&&i)add(sample.age,shortChange(sample,samples[i-1]).split(' · ').map(recordText).join(''));});
 observations.forEach(o=>add(o.age,recordText(o.title)+(o.text!==o.title?recordText(o.text):'')));
 choices.filter(c=>c.key!=='cool'||!observations.some(o=>o.eventId==='manual-cool'&&o.age===c.age)).forEach(c=>add(c.age,recordText(c.text)));
 return ages.size?'<ol class="record-timeline">'+[...ages].sort((a,b)=>a[0]-b[0]).map(([age,html])=>'<li data-age="'+age+'"><time>'+ageLabel(age)+'</time>'+html+'</li>').join('')+'</ol>':'';
}

function brandSummary(id){const stats=brandStats(game,id);return '<p>'+esc(brandReputation(game,id).label)+'</p><p class="quiet">発売 '+stats.releases+'回<br>自家販売 '+stats.sold+'本<br>完売 '+stats.soldOut+'回<br>累計売上 '+money(stats.revenue)+'<br>販売中の在庫 '+stats.sellingStock+'本</p>';}
const shopTerms=id=>{if(id==='department')return '24か月以上／シゲキが穏やか／特選5本';const s=SHOPS.find(x=>x.id===id);return s?[(s.minAge?s.minAge+'か月以上':''),(s.maxRoughness!==null?'シゲキが穏やか':''),s.minQuantity+'本から','月'+s.monthlyLimit+'本まで'].filter(Boolean).join('／'):'';};
const shopName=id=>SHOPS.find(s=>s.id===id)?.name??'取扱店';
const offerTarget=o=>'data-shop-id="'+esc(o.shopId)+'" data-offer-id="'+o.id+'"';
const shopOffers=()=>[game.shop.offer,...(game.shop.pendingOffers??[])].filter(Boolean);
function departmentHistory(id,readOnly=false){return D.departmentInterests(game,id).map(i=>'<p>特選ウイスキー<br>'+(i.pendingDelivery?'翌月5本納品':'取扱いの相談')+'</p>'+(readOnly?'':button(i.pendingDelivery?'取消':'相談を終える','department-cancel','', 'data-selection-id="'+esc(i.selectionId)+'"'))).join('')+D.departmentAdoptions(game,id).map(a=>'<p class="department-adoption">'+monthLabel(a.month)+'<br>'+esc(a.projectName??'特選ウイスキー')+'に採用<br>'+releaseTag(game.releases.find(r=>r.id===a.releaseId)?.productId)+'<br>'+a.count+'本<br>'+money(a.revenue)+'</p>').join('');}
function shopHistory(id,readOnly=false){return departmentHistory(id,readOnly)+SHOPS.map(shop=>{const r=D.shopBrandStats(game,id,shop.id);if(!r)return '';return '<p class="shop-relation">'+esc(shop.name)+(shop.id==='department'?'<br>取扱関係あり':'で取扱中')+'</p><details class="shop-history"><summary>累計納品 '+r.bottles+'本<br>'+money(r.revenue)+'</summary><p class="quiet">'+monthLabel(r.startedMonth)+'から</p>'+r.history.map(d=>'<p>'+monthLabel(d.month)+'<br>'+releaseTag(d.productId)+'<br>'+d.count+'本<br>'+money(d.revenue)+'</p>').join('')+'</details>';}).join('');}
const atExtractionLimit=()=>game?.still.phase==='distilling'&&game.still.distillation.progress>=extractionMaximum;
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
   const beforeStep=game;let saved=true;
   if(D.canBeginUsual(game).ok){jump=0;game=D.beginUsual(game);if(!save())return;}
   const wasAutomatic=game.usual.reservation?.status==='active',wasDistilling=game.still.phase==='distilling';
   if(wasDistilling){game=D.distillStep(game);if(!wasAutomatic&&atExtractionLimit())game=D.stopDistillation(game);}
   elapsed+=jump?T.monthMs/5:T.distillStepMs;
   const completed=wasAutomatic&&game.usual.reservation?.status!=='active';
   if(elapsed>=T.monthMs){const before=game.core.month;game=D.tickDistillery(game,expectedMonth);elapsed=0;if(game.core.month===before&&!game.decisions.length&&generationState()?.phase!=='review'){runtimeHalted=true;message('資金を残して停止しています。たる詰めや販売を確かめられます。');}if(jump>0)jump--;saved=save();}
   else if(wasDistilling&&(game.still.phase!=='distilling'||game.still.distillation.progress%5===0))saved=save();
   if(completed)saved=save();
   if(saved)automaticNews.push(automaticEvents(beforeStep,game,caskName,releaseTag));
   if(game.decisions.length||game.trade.offer||!hasMonthlyWork())jump=0;
   render();schedule();
  }catch(e){runtimeHalted=true;jump=0;storageNotice(e.message);render();}
 },T.distillStepMs);
}
function act(fn,after,afterSave){stopClock();try{const before=game;game=fn(game);runtimeHalted=false;if(after)after();const saved=save();if(saved){automaticNews.push(automaticEvents(before,game,caskName,releaseTag));if(afterSave)afterSave();}render();schedule();return true;}catch(e){storageNotice(e.message);render();schedule();return false;}}
// Event presentation is transient and created only after the operation is saved.
function finishDistillation(){if(game?.still.phase==='distilling'&&game.still.distillation.progress>=T.minimumStop&&!modal)act(D.stopDistillation,null,()=>{if(room==='distill'){shownFillSpiritId=game.core.spirit.id;modal={kind:'fill'};}jump=0;message('');});}
function endTaste(){if(game?.tastingId!==null)game=D.endTasting(game);}
function selectRoom(next){if(!game||!['distill','warehouse','sales'].includes(next)||modal)return;stopClock();endTaste();room=next;jump=0;save();render();schedule();}
// The internal identity remains the action target; its display serial is derived.
const caskLabel=c=>caskName(c.id)+' '+uiText(P.casks[c.type].short);
const button=(text,action,id='',extra='')=>'<button type="button" data-action="'+action+'" data-id="'+id+'" '+(text==='閉じる'?'data-close="true" ':text.endsWith('戻る')?'data-return="true" ':'')+extra+'>'+text+'</button>';
function openModal(kind,id=null){if(!game||(modal&&!['inspect','staff-panel','aux-panel'].includes(modal.kind))||kind==='fill'&&game.still.phase!=='filling')return;stopClock();jump=0;deliveryNotice='';modal={kind,id};render();}
// A notice is recorded before showing it, so deferring or reloading never
// repeats the automatic interruption. Pause intent belongs to userPaused.
function showShopOffer(productId=null,returnModal=null){
 if(!game?.shop.offer||game.trade.offer||game.tastingId!==null||(!preview&&!canSave))return false;
 stopClock();jump=0;const before=game;
 try{if(!game.shop.offer.notified){game=D.noticeShopOffer(game,game.shop.offer.shopId,game.shop.offer.id);if(!save()){game=before;return false;}}modal={kind:'shop-offer',productId,returnProductId:productId,shopId:game.shop.offer.shopId,offerId:game.shop.offer.id,selectedCount:null,returnModal};deliveryNotice='';return true;}
 catch(e){game=before;runtimeHalted=true;storageNotice(e.message);return false;}
}
// Both entry directions use the same quote, pending quantity and final operation.
function deliveryCount(p,q){return modal.deliveryProductId===p.id&&modal.deliveryShopId===q.shopId&&q.ok&&q.quantities.includes(modal.deliveryCount)?modal.deliveryCount:null;}
function deliveryConfirm(p,q){const n=deliveryCount(p,q);return button(q.shopId==='department'?'5本を扱う':'納品','shop-deliver',p.id,'data-count="'+(n??'')+'" data-shop-id="'+esc(q.shopId)+'" data-selection-id="'+esc(q.selectionId??'')+'"'+(n===null||!preview&&!canSave?' disabled':''));}
function deliveryButtons(p,q,action){
 if(action==='shop-deliver')return '<div class="delivery-options" role="group" aria-label="納品本数">'+q.quantities.map(n=>button(n+'本<small>'+unit(Math.round(n*q.unitPrice*100)/100)+(q.shopId==='department'?' 入金予定':' 入金')+'</small>','delivery-select',p.id,'data-count="'+n+'" data-shop-id="'+esc(q.shopId)+'" aria-pressed="'+(deliveryCount(p,q)===n)+'"')).join('')+'</div>'+(modal.kind==='stockist-delivery'?'':deliveryConfirm(p,q));
 return '<p class="delivery-label">納品数 → 残り／入金</p><div class="delivery-options">'+q.quantities.map(n=>button(n+'本<small>'+(p.stock-n)+'本</small><small>'+unit(Math.round(n*q.unitPrice*100)/100)+'</small>',action,p.id,'aria-label="'+n+'本納品して取扱いを始める 残り '+(p.stock-n)+'本 入金 '+unit(Math.round(n*q.unitPrice*100)/100)+'" data-count="'+n+'" data-shop-id="'+esc(q.shopId??modal.shopId)+'" data-offer-id="'+(modal.offerId??'')+'" data-selection-id="'+esc(q.selectionId??'')+'"')).join('')+'</div>';
}
function knownStockists(){
 const seen=new Set([...shopOffers(),...game.shop.relations,...game.shop.deliveries].map(x=>x.shopId??'town-liquor'));
 for(const key of Object.keys(game.shop.declinedUntil??{})){const id=key.split(':')[0];if(SHOPS.some(s=>s.id===id))seen.add(id);}
 if(D.departmentInterests(game).length||D.departmentAdoptions(game).length)seen.add('department');
 return SHOPS.filter(s=>seen.has(s.id));
}
function stockistProducts(shopId){return game.releases.filter(r=>D.shopBrandStats(game,r.brandId,shopId)||shopId==='department'&&D.departmentInterests(game,r.brandId).length).map(r=>({r,p:game.core.products.find(p=>p.id===r.productId),q:D.shopQuote(game,r.productId,shopId)})).filter(x=>x.p?.stock>0).reverse();}
function stockistStatus(shopId){if(shopId==='department'&&D.departmentInterests(game).some(i=>i.pendingDelivery))return '翌月5本納品';if(shopOffers().some(o=>o.shopId===shopId))return '申し出あり';if(stockistProducts(shopId).some(x=>x.q.ok))return '取扱中';return game.shop.relations.some(r=>(r.shopId??'town-liquor')===shopId)||shopId==='department'&&D.departmentInterests(game).length?'現在は納品不可':'取扱前';}
function departmentOfferInventory(offer){
 const r=game.releases.find(r=>r.id===offer.sourceReleaseId),p=game.core.products.find(p=>p.id===r?.productId);modal.productId=p?.id??null;
 if(!p||!r)return '<p>対象の発売回に在庫がありません。</p>';
 const q=D.shopOfferQuote(game,p.id,'department');return '<p>'+releaseTag(p.id)+' '+esc(caskName(r.caskId))+' '+ageLabel(r.age)+'<br>在庫 '+p.stock+'本<br>翌月5本納品<br>入金予定 '+unit(q.unitPrice*5)+'</p>'+(q.ok?button('5本を扱う','shop-accept-deliver',p.id,offerTarget(offer)+' data-count="5" data-selection-id="'+esc(q.selectionId??'')+'"'):'<p class="quiet">'+esc(uiText(q.reason))+'</p>');
}
function departmentDestination(p,release,invitation){
 const interests=D.departmentInterests(game,release?.brandId),interest=interests[0],adoptions=D.departmentAdoptions(game,release?.brandId),adopted=adoptions.some(a=>a.releaseId===release?.id),q=D.shopQuote(game,p.id,'department');
 let body='<section class="sales-destination shop-delivery" data-destination="department"><h3>'+esc(shopName('department'))+'</h3><p class="quiet">'+esc(shopTerms('department'))+'</p>';
 if(interest){const pending=interest.pendingDelivery;body+=pending?'<p>'+releaseTag(pending.productId)+' · 翌月5本納品</p>':'<p>翌月5本納品</p><p>5本 '+unit(q.unitPrice)+'/本</p>'+(q.ok?deliveryButtons(p,q,'shop-deliver'):'<p class="quiet">'+esc(uiText(q.reason))+'</p>');body+=button(pending?'取消':'相談を終える','department-cancel',p.id,'data-selection-id="'+esc(interest.selectionId)+'"');}
 else if(invitation)body+=button('相談を見る','shop-open-offer','',invitation===game.shop.offer?'':'disabled')+(invitation===game.shop.offer?'':'<p class="quiet">先の申し出を確認してください。</p>');
 else body+='<p>'+(adopted?'今回の企画は完了':adoptions.length?'過去に採用実績あり':'申し出待ち')+'</p><p>5本 '+unit(q.unitPrice)+'/本</p><p class="quiet">'+esc(uiText(q.reason)??shopTerms('department'))+'</p>';
 body+=D.departmentAdoptions(game,release?.brandId).length?'<p class="quiet">採用歴は記録へ</p>':'';return body+'</section>';
}
function closeModal(){if(modal?.kind==='staff-opportunity'){modal=modal.returnModal??null;render();schedule();return;}if(modal?.kind==='inspect'&&modal.ledgerParent){finishLedgerTasting();return;}if(modal?.kind==='inspect'&&game.tastingId!==null){act(D.endTasting,()=>{modal=null;});return;}if(modal?.kind==='staff-request'){closeComparison();return;}if(comparisonKinds.includes(modal?.kind)){closeComparison();return;}if(modal?.kind==='generation-review')return;if(['history','history-brand','history-shop'].includes(modal?.kind)){historyRequest++;if(historyLoading){historyWorker?.terminate();historyWorker=null;historyLoading=false;}if(modal.parent){closeComparison();return;}}if(modal?.kind==='decision')return;modal=modal?.kind==='shop-offer'&&modal.returnProductId!==null?{kind:'product',id:modal.returnProductId}:null;render();schedule();}
function trial(id){if(!game||!D.currentCask(game,id))return;stopClock();jump=0;if(game.tastingId!==null&&game.tastingId!==id)endTaste();selectedCaskId=id;room='warehouse';modal={kind:'inspect',id};act(s=>D.sampleDistillery(s,id));}
function quoteModal(id){if(!D.currentCask(game,id))return;stopClock();jump=0;if(D.bottlingReservation(game,id)?.status==='active')act(s=>D.pauseBottling(D.endTasting(s),id,true),()=>{modal={kind:'quote',id};});else{modal={kind:'quote',id};render();}}
function reservationLabel(id){
 const r=D.bottlingReservation(game,id);if(!r)return '';
 if(r.status==='completed')return '自分で行う'+(r.mode==='age'?' · 完了':'');
 const state=r.status==='active'&&!D.bottlingStaffStatus(game).hired?'採用待ち':({active:'任せる',paused:'停止'}[r.status]??r.status);
 return state+' · '+policyLabel(r)+(r.lastError?' · '+r.lastError:'');
}
function reservationSymbol(id){const r=D.bottlingReservation(game,id);return r?.status==='paused'||r?.status==='active'&&!D.bottlingStaffStatus(game).hired?'pause':r?.status==='active'?(r.mode==='age'?'clock':'stock'):null;}
function validPlanDraft(d){return !!d&&['age','stock'].includes(d.mode)&&Number.isInteger(d.count)&&d.count>=1&&d.count<=Math.floor((P.baseLitres+P.extraLitres)/P.bottleLitres)&&Number.isInteger(d[d.mode==='age'?'age':'threshold'])&&d[d.mode==='age'?'age':'threshold']>=0&&d[d.mode==='age'?'age':'threshold']<=(d.mode==='age'?1200:999);}
const policyLabel=r=>r.mode==='age'?r.age+'か月で一度だけ · '+r.count+'本':'販売中在庫全体 '+r.threshold+'本以下で'+r.count+'本';
function bottlingPolicyView(){
 const draft=modal.planDraft??(modal.planDraft={...D.operationDefaults(game).auto,...D.commonBottlingPolicy(game)});
 return '<div class="bottling-plan"><label for="bottling-mode">共通の条件</label><select id="bottling-mode"><option value="age"'+(draft.mode==='age'?' selected':'')+'>時期指定</option><option value="stock"'+(draft.mode==='stock'?' selected':'')+'>在庫連動</option></select><div class="bottling-plan-fields"><label for="bottling-condition">'+(draft.mode==='age'?(draft.age??'')+'か月で一度だけ':'販売中在庫全体（本以下）')+'</label><input id="bottling-condition" data-policy-field="'+(draft.mode==='age'?'age':'threshold')+'" type="number" inputmode="numeric" min="0" max="'+(draft.mode==='age'?1200:999)+'" step="1" value="'+(draft.mode==='age'?draft.age:draft.threshold)+'"><label for="bottling-quantity">ビン詰めする本数</label><input id="bottling-quantity" type="number" inputmode="numeric" min="1" max="'+Math.floor((P.baseLitres+P.extraLitres)/P.bottleLitres)+'" step="1" value="'+draft.count+'"></div><p class="quiet">ふつうの価格で販売開始</p>'+button('条件を保存','bottling-policy-save','',validPlanDraft(draft)?'':'disabled')+'</div>';
}
function bottlingChoiceView(id){
 const r=D.bottlingReservation(game,id),policy=D.commonBottlingPolicy(game);
 return '<div class="bottling-modes" role="group" aria-label="ビン詰めの方式">'+button('自分で行う','bottling-manual',id,'aria-pressed="'+(r?.status!=='active')+'"')+button('任せる','bottling-delegate',id,r?.status==='active'?'disabled aria-pressed="true"':'aria-pressed="false"')+'</div>'+(r?'<p class="bottling-reservation" role="status">'+esc(reservationLabel(id))+'</p>':'')+(!policy?'<p>担当者の条件を決めてください</p>':'');
}
function firstBrandDraft(){return modal.brandDraft??(modal.brandDraft=identityDefaults());}
function brandSetupView(){
 if(!D.needsBrandSetup(game)){const brand=game.brands[0];return '<div class="brand-readout">'+brandArt(0,brand)+'<span>'+esc(brand.name)+'</span></div>';}
 const draft=firstBrandDraft();if(modal.brandDraftConfirmed)return '<div class="brand-readout">'+brandArt(0,draft)+'<span>'+esc(draft.name.trim())+'</span>'+button('設定を直す','brand-edit')+'</div>';
 return '<div class="first-brand"><label for="brand-name">ブランド名</label><input id="brand-name" type="text" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-describedby="brand-name-error" value="'+esc(draft.name)+'"><p id="brand-name-error" role="status">'+esc(brandNameError(draft.name))+'</p><fieldset><legend>ビン</legend><div class="brand-bottles">'+IDENTITY_BOTTLES.map(b=>button(brandArt(0,{...draft,bottle:b.id})+'<span>'+esc(b.name.replace(/ビン$/,''))+'</span>','brand-bottle',b.id,'aria-pressed="'+(draft.bottle===b.id)+'"')).join('')+'</div></fieldset><fieldset><legend>ラベル</legend><div class="brand-labels">'+IDENTITY_LABELS.map(l=>button(brandArt(0,{...draft,label:l.id})+'<span>'+esc(l.name)+'</span>','brand-label',l.id,'aria-pressed="'+(draft.label===l.id)+'"')).join('')+'</div></fieldset></div>';
}
function bottleSelection(id){
 const c=D.currentCask(game,id),q=D.quote(game,id),fee=q.count>0?q.cost/q.count:0;
 const affordable=fee>0?Math.min(q.count,Math.max(0,Math.floor((game.core.cash+1e-9)/fee))):0;
 const choices=bottleChoices(q.count,affordable);if(modal.bottleCount===undefined)modal.bottleCount=defaultBottleCount(D.operationDefaults(game).bottleCount,q.count,affordable);
 const count=modal.bottleCount,valid=choices.includes(count),cost=valid?count*fee:0;
 const remaining=valid?Math.max(0,c.litres-count*P.bottleLitres):c.litres,retired=valid&&count===q.count;
 const reason=affordable<1?(q.count<1?'ビン1本分の原酒がありません。':'ビン詰めの資金が足りません。'):!valid?'本数を選んでください。':count>affordable?'ビン詰めの資金が足りません。':'';
 return {c,max:q.count,affordable,choices,count,valid,cost,remaining,retired,ok:valid&&count<=affordable&&!modal.committing&&(preview||canSave)&&(!D.needsBrandSetup(game)||!brandNameError(firstBrandDraft().name)),reason};
}
function bottleRemainder(q){return q.retired?'残り '+q.remaining.toFixed(2)+' L（1本未満） · たる終了':'たるに残す '+q.remaining.toFixed(2)+' L';}
function updateBottleSelection(){
 if(modal?.kind!=='quote'||!D.currentCask(game,modal.id))return;
 if(D.needsBrandSetup(game)&&!modal.brandDraftConfirmed){$('action-dialog').querySelector('[data-action=brand-next]').disabled=!!brandNameError(firstBrandDraft().name);return;}
 const q=bottleSelection(modal.id),input=$('bottle-count');
 if(input)input.disabled=q.affordable<1;
 $('bottle-selected').textContent=q.valid?q.count+'本':'';$('bottle-remainder').textContent=bottleRemainder(q);$('bottle-cost').textContent='費用 '+money(q.cost);$('bottle-cash').textContent='ビン詰め後の資金 '+money(game.core.cash-q.cost);$('bottle-count-reason').textContent=q.reason|| (q.affordable<q.max?'今の資金で '+q.affordable+'本まで':'');
 const node=action=>$('action-dialog').querySelector('[data-action="'+action+'"]');
 node('bottle-less').disabled=!Number.isInteger(q.count)||q.choices.indexOf(q.count)<=0;node('bottle-more').disabled=!Number.isInteger(q.count)||q.choices.indexOf(q.count)>=q.choices.length-1;node('bottle-all').disabled=q.max<1||q.affordable<q.max;node('bottle').disabled=!q.ok;
}
// Move the original panels, rather than copying their inputs or event handlers.
function vaultPanels(){for(const id of ['selected-cask','staff-panel','free-actions','tasting-actions','aux-panel']){const n=$(id);if(n.closest('#action-dialog'))$('panel-vault').append(n);}}
function syncModal(){
 const dialog=$('action-dialog'),previousKind=dialog.dataset.kind;
 if(!dialog.open&&modal){
  modalReturnFocus=document.activeElement;
  const object=modalReturnFocus?.closest('[data-product-id],[data-cask-id]');
  modalReturnObject=object?{attribute:object.hasAttribute('data-product-id')?'data-product-id':'data-cask-id',id:object.dataset.productId??object.dataset.caskId}:null;
 }
 if(!modal&&game.tastingId===null&&game.decisions.length){const d=game.decisions[0];modal={kind:'decision',id:d.caskId};selectedCaskId=d.caskId;}
 if(!modal&&game.tastingId===null&&!game.decisions.length&&!document.hidden)showStaffOpportunity();
 if(!modal&&game.tastingId===null&&!game.decisions.length&&game.trade.offer)modal={kind:'offer'};
 if(!modal&&game.shop.offer&&!game.shop.offer.notified&&game.tastingId===null&&!game.decisions.length&&!game.trade.offer&&game.still.phase==='ready'&&!document.hidden&&!runtimeHalted&&(preview||canSave))showShopOffer();
 if(!modal&&game.tastingId===null&&!game.decisions.length&&!game.trade.offer&&(!game.shop.offer||game.shop.offer.notified)&&!document.hidden&&(preview||canSave))showGeneration();
 if(!modal&&room==='distill'&&game.still.phase==='filling'&&game.core.spirit&&shownFillSpiritId!==game.core.spirit.id&&(preview||canSave)){shownFillSpiritId=game.core.spirit.id;modal={kind:'fill'};jump=0;}
 if(!modal){vaultPanels();if(dialog.open){
  const origin=modalReturnFocus,reference=modalReturnObject;dialog.close();
  // Room switches and shelf rerenders finish before choosing a visible focus target.
  queueMicrotask(()=>{if(dialog.open)return;
   const object=reference?document.querySelector('['+reference.attribute+'="'+CSS.escape(reference.id)+'"]'):null;
   const available=n=>n?.isConnected&&n.getClientRects().length&&!n.disabled;
   const target=available(origin)?origin:available(object)?object:$('room-nav').querySelector('[aria-pressed="true"]');target?.focus({preventScroll:true});
  });
 }return;}
 const {kind,id}=modal,c=D.currentCask(game,id);let title='',body='',actions='';
 if(kind==='inspect'){title=c?caskLabel(c)+' '+ageLabel(c.age):'たる';
 }else if(kind==='aux-panel'){title='メニュー';
 }else if(kind==='staff-manager'){title='担当者';body=staffManagerView();actions=button('閉じる','cancel');
 }else if(kind==='staff-opportunity'){title=jobName(modal.job);const status=jobStatus(modal.job);body='<p>'+(modal.job==='distill'?'仕込みを任せられます':'ビン詰めを任せられます')+'</p>'+staffCostView(modal.job);actions=button('採用','staff-opportunity-hire',modal.job,status.canHire?'':'disabled')+button('見送る','staff-opportunity-later');
 }else if(kind==='bottler-panel'){title='ビン詰め担当者';body=bottlerManagerView();actions=button('担当者へ戻る','staff-manage-back');
 }else if(kind==='staff-panel'){title='蒸留担当者';actions=button('担当者へ戻る','staff-manage-back');
 }else if(kind==='ledger'){title='帳面';body=ledgerView();actions=button('閉じる','cancel');
 }else if(kind==='ledger-recipe'||kind==='ledger-cask'||kind==='ledger-recipe-comparison'){title=kind==='ledger-recipe'?'仕込みの記録':kind==='ledger-cask'?'たると熟成':'仕込みを比べる';body=kind==='ledger-recipe'?ledgerRecipeDetail():kind==='ledger-cask'?ledgerCaskDetail():ledgerRecipeComparison();actions=button('戻る','comparison-back');
 }else if(kind==='ledger-release'){title='発売の記録';body=ledgerReleaseView();actions=button('戻る','comparison-back');
 }else if(kind==='settings'){title='保存・設定';body='<p>維持費 '+money(D.upkeep(game))+'／月</p>'+$('settings-source').innerHTML.replace('id="reset"','data-action="settings-reset"').replace('id="save-status"','data-save-status="true"');actions=button('閉じる','cancel');
 }else if(kind==='staff-request'){
  const status=D.staffStatus(game),mayUse=status.hired||(status.legacy&&modal.caskId===null);title='仕込みを任せる';body=staffRequestView();
  actions=mayUse?button('依頼','staff-confirm','',staffCanRequest()?'':'disabled'):button('採用 '+money(status.hireCost),'staff-hire-request','',status.canHire&&!game.decisions.length&&!game.trade.offer?'':'disabled');
  if(!staffCanRequest())body+='<p class="quiet">'+(generationState()?.phase!=='working'?'最後の仕込みは自分で行います。':game.usual.reservation?'依頼済み':'今の仕込み・判断を終えてから依頼')+'</p>';
  actions+=button('戻る','staff-back');
 }else if(comparisonKinds.includes(kind)){title=({'cask-picker':'比べるたるを選ぶ','cask-comparison':'たるを比べる','release-comparison':'前と比べる','recipe-source':'元の仕込み','recipes':'製法','comparison-brand-record':'記録'})[kind];body=kind==='cask-picker'?caskPickerView():kind==='cask-comparison'?caskComparisonView():kind==='release-comparison'?releaseComparisonView():kind==='recipe-source'?recipeSourceView():kind==='comparison-brand-record'?brandComparisonRecordView(modal.brandId):recipesView();actions=(kind==='release-comparison'&&modal.pair?button('記録','compare-brand-record',modal.pair.current.brandId):'')+button('戻る','comparison-back');
 }else if(kind==='generation-notice'||kind==='generation-review'){
  const g=generationState();if(!g||g.id!==id||g.phase==='working'){modal=null;return;}title=generationName(g.id)+(kind==='generation-review'?'の歩み':'の最後の仕込み');
  body=kind==='generation-review'?generationReview(g):'<p>'+monthLabel(g.fixedMonth)+'<br>'+esc(generationCauseText(g))+'</p><p>たる詰め期限 '+monthLabel(g.fixedMonth+12)+'<br>未完成の原酒も引継ぎ</p>'+(game.usual.reservation?.status==='queued'?'<p class="quiet">'+(game.usual.reservation.mode?'繰り返し依頼は引継ぎ時に終了':'仕込み予約は次の代へ引継ぎ')+'</p>':'');
  actions=kind==='generation-review'?button('次の代へ引き継ぐ','generation-handover',g.id)+button('蒸留所の歩み','generation-history',g.id):button('仕込みへ','generation-continue',g.id);
 }else if(kind==='history'||kind==='history-brand'||kind==='history-shop'){
  title=kind==='history'?'蒸留所の歩み':kind==='history-brand'?(game.brands.find(b=>b.id===modal.brandId)?.name??'ブランドの記録'):shopName(modal.shopId)+'の記録';
  body=kind==='history'?historyView():kind==='history-brand'?historyBrandView(modal.brandId):historyShopView(modal.shopId);
  actions=button(modal.parent?'帳面へ戻る':'閉じる','cancel')+(kind==='history'?'':button('歩みへ戻る','history-back'));
 }else if(kind==='stockists'){
  title='取扱店';const shops=knownStockists();
  body=shops.length?'<div class="stockist-list">'+shops.map(shop=>button(esc(shop.name)+'<small>'+stockistStatus(shop.id)+'</small>','stockist-open',shop.id)).join('')+'</div>':'<p>取扱店はまだありません</p>';
  actions=button('戻る','cancel');
 }else if(kind==='stockist'){
  if(!knownStockists().some(s=>s.id===modal.shopId)){modal={kind:'stockists'};render();return;}
  title=shopName(modal.shopId);const offers=shopOffers().filter(o=>o.shopId===modal.shopId),items=stockistProducts(modal.shopId);
  const remark=modal.greeting&&modal.shopId==='town-liquor'?{key:'approved',text:'これからよろしくお願いします。'}:shopRemark(game,modal.shopId);body='<p class="shop-remark" data-remark-key="'+esc(remark.key)+'">「'+esc(remark.text)+'」</p>'+(deliveryNotice?'<p class="delivery-confirmation" role="status">'+esc(deliveryNotice)+'</p>':'')+offers.map(o=>button(o.shopId==='department'?'相談を見る':'申し出を見る','stockist-offer',o.id,offerTarget(o)+(o===game.shop.offer?'':' disabled'))+(o===game.shop.offer?'':'<p class="quiet">先の申し出を確認</p>')).join('');
  body+=modal.shopId!=='department'?'<p>自動発送 · 月'+SHOPS.find(s=>s.id===modal.shopId).monthlyLimit+'本まで</p>':(items.length?'<div class="stockist-list">'+items.map(({p,r,q})=>button(esc(brandFor(p.id)?.name??'ウイスキー')+'<small>'+releaseTag(p.id)+' · '+esc(releaseSource(p.id))+'<br>在庫 '+p.stock+'本<br>買取 '+unit(q.unitPrice)+'/本'+(q.ok?'':'<br>'+esc(uiText(q.reason)))+'</small>','stockist-product',p.id,q.ok?'':'disabled')).join('')+'</div>':'<p>現在は納品不可</p><p class="quiet">'+(modal.shopId==='department'&&!D.departmentInterests(game).length?'限定取扱いの相談が必要':'納品できる在庫なし')+'</p>');
  body+=game.brands.filter(b=>game.shop.relations.some(r=>r.brandId===b.id&&r.shopId===modal.shopId)).map(b=>'<div class="brand-readout">'+brandDisplay(b)+'<span>'+esc(b.name)+'</span></div>').join('');
  actions=button('戻る','stockists-back');
 }else if(kind==='stockist-delivery'){
  const p=game.core.products.find(p=>p.id===modal.id),q=D.shopQuote(game,modal.id,modal.shopId);title=shopName(modal.shopId);
  body=(deliveryNotice?'<p class="delivery-confirmation" role="status">'+esc(deliveryNotice)+'</p>':'')+'<p>'+esc(brandFor(modal.id)?.name??'ウイスキー')+'<br>'+releaseTag(modal.id)+' · '+esc(releaseSource(modal.id))+'</p><p>在庫 '+(p?.stock??0)+'本<br>買取 '+unit(q.unitPrice)+'/本</p>'+(q.ok?deliveryButtons(p,q,'shop-deliver'):'<p class="quiet">'+esc(uiText(q.reason))+'</p>');
  actions=(q.ok?deliveryConfirm(p,q):'')+button('戻る','stockist-back');
 }else if(kind==='shop-offer'){
  const offer=game.shop.offer,brand=game.brands.find(b=>b.id===offer?.brandId);if(!offer||!brand){modal=null;return;}const department=offer.shopId==='department';title=department?'デパートの申し出':shopName(offer.shopId);
  body=department?'<p>特選ウイスキー · 限定5本</p>'+departmentOfferInventory(offer):'<div class="brand-readout">'+brandDisplay(brand)+'<span>'+esc(brand.name)+'</span></div><p>'+esc(shopTerms(offer.shopId))+'</p><p class="quiet">取扱開始後は毎月自動で発送</p>';
  if(offer.shopId==='town-liquor')body='<p class="shop-remark">「'+esc(brand.name)+'の名前を聞きました。」</p>'+body;
  actions=(department?'':button('取扱開始','shop-accept','',offerTarget(offer)))+button('あとで','shop-later','',offerTarget(offer))+button('やめる','shop-decline','',offerTarget(offer))+(modal.returnModal?button('戻る','stockist-offer-back'):'');
 }else if(kind==='decision'){
  const d=game.decisions[0];if(!d){modal=null;if(dialog.open)dialog.close();return;}
  modal.id=d.caskId;const source=D.currentCask(game,d.caskId),pending=d.pending,copy=agingEventText(pending,source,game.notesById[d.caskId]);
  title=caskName(d.caskId)+' '+copy.title;body='<p>'+esc(uiText(P.casks[source.type].short))+' '+ageLabel(source.age)+'</p>'+(copy.text?'<p>'+esc(copy.text)+'</p>':'');
  if(d.eventId==='order-unmet'){const fallback=D.orderFallbackTerms(game);body+='<p>通常卸売 '+unit(fallback.unitPrice)+'/本 ビン詰め費 '+unit(fallback.bottlingFee)+'/本</p><p class="quiet">自分で販売する場合、熟成を続けられます。</p>';}
  actions=D.contractFor(game,d.caskId)&&d.eventId==='funds'?button('契約を解除してビン詰め','cancel-contract',d.caskId):pending.options.map(o=>button(esc(o.id==='bottle'?'ビン詰め':uiText(o.label))+(o.hint&&o.id!=='cool'?'<small>'+esc(uiText(o.hint))+'</small>':''),o.id==='bottle'?'quote':'choose',d.caskId,'data-choice="'+esc(o.id)+'" data-event="'+esc(d.eventId)+'"')).join('');
  actions+=button('試す','trial',d.caskId);
 }else if(kind==='fill'){
  modal.fillType??=D.operationDefaults(game).caskType;title='たるを選ぶ';body='<p class="fill-volume">'+game.still.distillation.litres.toFixed(1)+' L</p><div class="bottling-modes" role="group" aria-label="たるの種類">'+['bourbon','refill'].map(type=>button('<span class="fill-art choice-art" aria-hidden="true">'+barrel(type)+'</span><span class="choice-name">'+esc(uiText(P.casks[type].short))+'</span><span class="choice-price">'+money(P.casks[type].cost)+'</span>','fill-select',type,'aria-pressed="'+(modal.fillType===type)+'"')).join('')+'</div>';
  actions=button('たる詰め','fill',modal.fillType??'',P.casks[modal.fillType]?'':'disabled')+button('戻る','cancel');
 }else if(kind==='quote'&&c){
  const q=bottleSelection(id);title='ビン詰め';
  if(D.needsBrandSetup(game)&&!modal.brandDraftConfirmed){body=brandSetupView();actions=button('次へ','brand-next',id,brandNameError(firstBrandDraft().name)?'disabled':'')+button('戻る','cancel');}else{
  body=brandSetupView()+'<p>'+esc(caskLabel(c))+' '+ageLabel(c.age)+'<br>'+c.litres.toFixed(2)+' L · '+q.max+'本まで</p><label for="bottle-count">本数</label><div class="bottle-count-controls">'+button('−','bottle-less',id,'aria-label="前の本数を選ぶ"'+(q.choices.indexOf(q.count)<=0?' disabled':''))+'<select id="bottle-count"'+(q.affordable<1?' disabled':'')+'>'+q.choices.map(n=>'<option value="'+n+'"'+(n===q.count?' selected':'')+'>'+n+'本</option>').join('')+'</select>'+button('＋','bottle-more',id,'aria-label="次の本数を選ぶ"'+(q.choices.indexOf(q.count)>=q.choices.length-1?' disabled':''))+button('残り全部','bottle-all',id,q.max<1||q.affordable<q.max?'disabled':'')+'</div><p class="quote-numbers"><span id="bottle-selected">'+(q.valid?q.count+'本':'')+'</span> <span id="bottle-cost">費用 '+money(q.cost)+'</span></p><p id="bottle-remainder">'+bottleRemainder(q)+'</p><p id="bottle-cash">ビン詰め後の資金 '+money(game.core.cash-q.cost)+'</p><p id="bottle-count-reason" class="quiet" role="status">'+esc(q.reason||(q.affordable<q.max?'今の資金で '+q.affordable+'本まで':''))+'</p>';
  body+=D.bottlingReservation(game,id)?'<p class="bottling-reservation" role="status">'+esc(reservationLabel(id))+'</p>':'';
  actions=button('ビン詰め','bottle',id,q.ok?'':'disabled')+button('戻る','cancel');}
 }else if(kind==='bottling-plan'&&c){
  title='ビン詰め';body='<p>'+esc(caskLabel(c))+' '+ageLabel(c.age)+'</p>'+bottlingChoiceView(id);
  const r=D.bottlingReservation(game,id);actions=(modal.staffContext&&r&&r.status!=='completed'?button(r.status==='paused'?'再開':'停止',r.status==='paused'?'bottling-resume':'bottling-pause',id):'')+(modal.staffContext&&r?button('予約取消','bottling-cancel',id):'')+button('戻る',modal.staffContext?'bottling-staff-back':'cancel');
 }else if(kind==='product'){
  const p=game.core.products.find(x=>x.id===id),meta=game.productsById[id];if(!p){modal=null;render();return;}
  const prices=D.salePrices(game,id),record=game.records.find(r=>r.productId===id);title=(brandFor(id)?.name??record?.name??'この一本')+(releaseTag(id)?' '+releaseTag(id):'');
  const release=releaseFor(id),destinations=SHOPS.map(shop=>({shop,stockist:D.shopBrandStats(game,release?.brandId,shop.id),invitation:shopOffers().find(o=>o.brandId===release?.brandId&&o.shopId===shop.id),quote:D.shopQuote(game,id,shop.id)})).filter(x=>x.stockist||x.invitation);
  const destination=destinations.some(x=>x.shop.id===modal.destination)?modal.destination:'shelf';
  body='<div class="product-overview"><div class="modal-bottle">'+productArt(p)+'</div><p>'+esc(releaseSource(id))+'<br>在庫 '+p.stock+'本<span class="product-state">'+(p.stock===0?'完売':meta.listed?'販売中':'保管中')+'</span></p></div>'+(deliveryNotice?'<p class="delivery-confirmation" role="status">'+esc(deliveryNotice)+'</p>':'')+flavorTypeView(release?.profile);
  body+='<details class="bottle-taste-details"><summary>味の詳細</summary><div class="bottle-flavor">'+FLAVOR_AXES.map(({label,key})=>'<section><h3>'+esc(label)+'</h3>'+flavorMeter(release?.profile,key)+'</section>').join('')+'</div></details>';
  const offers=destinations.filter(x=>x.invitation).length,deliverable=destinations.filter(x=>x.quote.ok).length;
  body+='<label for="sales-destination-choice">販売先</label><select id="sales-destination-choice"><option value="shelf"'+(destination==='shelf'?' selected':'')+'>自家販売</option>'+destinations.map(({shop,invitation,quote})=>'<option value="'+esc(shop.id)+'"'+(destination===shop.id?' selected':'')+'>'+esc(shop.name)+(invitation?' 申し出あり':quote.ok?' 納品可能':'')+'</option>').join('')+'</select>'+(offers||deliverable?'<p class="destination-notice">'+(offers?'申し出 '+offers+'件':'')+(offers&&deliverable?' ':'')+(deliverable?'納品可能 '+deliverable+'店':'')+'</p>':'');
  if(destination==='shelf')body+='<section class="sales-destination" data-destination="shelf"><p>1本 '+unit(p.price)+'</p><div class="price-options">'+['low','standard','high'].map((tier,i)=>button(['低め','ふつう','高め'][i]+'<span>'+unit(prices[tier])+'</span>','price',id,'data-tier="'+tier+'" aria-pressed="'+(meta.selectedPrice===tier)+'"')).join('')+'</div>'+(meta.listed?'':button('販売開始','list',id,p.stock>0?'':'disabled'))+'<p class="quiet">自家販売 '+(release?.sold??p.sold)+'本 売上 '+money(release?.revenue??p.revenue)+'</p></section>';
  else{
   const {shop,stockist,invitation,quote:q}=destinations.find(x=>x.shop.id===destination);
   if(shop.id==='department')body+=departmentDestination(p,release,invitation);
   else{
    body+='<section class="sales-destination shop-delivery" data-destination="'+esc(shop.id)+'"><h3>'+esc(shop.name)+'</h3><p class="quiet">'+esc(shopTerms(shop.id))+'</p>';
    if(invitation)body+=button('申し出を確認','shop-open-offer','',invitation===game.shop.offer?'':'disabled')+(invitation===game.shop.offer?'':'<p class="quiet">先の申し出を確認してください。</p>');
    if(stockist)body+='<p>自動発送 · 月'+SHOPS.find(s=>s.id===shop.id).monthlyLimit+'本まで</p><p>'+unit(q.unitPrice)+'/本</p>';
    body+='</section>';
   }
  }
  body+='<div class="comparison-entry">'+releaseComparisonButton(release)+'</div><details><summary>元の記録</summary><p>'+provenanceTag(release?.caskId)+'</p></details>';
  actions=button('閉じる','cancel');

 }
 const activeCask=['decision','quote','contract-bottle'].includes(kind)?modal.id:null,waiting=game.decisions.filter(d=>d.caskId!==activeCask).length+(game.trade.offer&&kind!=='offer'?1:0)+shopOffers().filter(o=>!o.notified&&(kind!=='shop-offer'||o.id!==modal.offerId)).length;$('dialog-context').textContent=waiting?'このあと判断 '+waiting+'件':'';$('dialog-context').hidden=!waiting;
 $('dialog-error').hidden=$('storage-notice').hidden;$('dialog-error').textContent=$('storage-notice').textContent;
 $('dialog-title').textContent=title;
 const nativePanel=kind==='inspect'?'selected-cask':kind==='staff-panel'?'staff-panel':kind==='aux-panel'?'aux-panel':null;
 if(nativePanel){
  if($(nativePanel).parentElement!==$('dialog-body')){vaultPanels();$('dialog-body').replaceChildren($(nativePanel));$('dialog-actions').replaceChildren();}
  if(kind==='inspect'){for(const id of ['free-actions','tasting-actions'])if($(id).parentElement!==$('dialog-actions'))$('dialog-actions').append($(id));}
  else $('dialog-actions').innerHTML=actions;
 }else{vaultPanels();
  const destination=$('sales-destination-choice');
  if(kind==='product'&&modal.keepDestination&&destination?.parentElement===$('dialog-body')){
   // Keep the native picker and its focus alive; replace only the content below it.
   const template=document.createElement('template');template.innerHTML=body;
   const updated=template.content.querySelector('#sales-destination-choice'),tail=[];
   for(let node=updated.nextSibling;node;node=node.nextSibling)tail.push(node);
   while(destination.nextSibling)destination.nextSibling.remove();
   destination.after(...tail);
  }else $('dialog-body').innerHTML=body;
  $('dialog-actions').innerHTML=actions;
 }
 dialog.dataset.kind=kind;$('close-dialog').hidden=kind==='decision'||kind==='generation-review';
 if(!dialog.open){$('dialog-title').removeAttribute('tabindex');dialog.showModal();if(pointerInteraction){$('dialog-title').tabIndex=-1;$('dialog-title').focus({preventScroll:true});}}
 else if(previousKind!==kind&&['stockists','stockist','stockist-delivery'].includes(kind)){if(pointerInteraction){$('dialog-title').tabIndex=-1;$('dialog-title').focus({preventScroll:true});}else document.querySelector('#dialog-body button:not(:disabled), #dialog-actions button')?.focus({preventScroll:true});}
}
function renderSpirit(){
 const panel=$('spirit-readout');if(!panel)return;
 const view=distillationView(game);
 panel.hidden=!view;if(!view)return;
 const gathering=view.phase==='collecting';
 $('spirit-kind').textContent=gathering?'採取待ち':view.phase==='forecast'?(game.usual.reservation?.status==='active'?'抽出見込み':'抽出見込み'):view.phase==='filled'?'たる詰め済み':'できた原酒';
 $('spirit-phrase').textContent=gathering?'':uiText(view.phrase);
 $('spirit-gauges').hidden=gathering;
 $('spirit-volume').textContent=view.litres.toFixed(1)+' L';
 for(const axis of view.axes??[]){const meter=$('spirit-'+axis.id);meter.setAttribute('aria-valuenow',String(axis.value));meter.setAttribute('aria-valuetext',axis.value.toFixed(2)+' / '+axis.maximum+' · 特徴の強さ');meter.style.setProperty('--flavor-fill',axis.ratio);}
}
function render(){
 if(!game)return;
 $('settings-source').hidden=true;
 if(!D.currentCask(game,selectedCaskId))selectedCaskId=game.core.casks[0]?.id??null;
 if(game.tastingId!==null){selectedCaskId=game.tastingId;room='warehouse';if(!modal)modal={kind:'inspect',id:selectedCaskId};}
 syncModal();
 const phase=game.still.phase,tasting=game.tastingId!==null,atLimit=atExtractionLimit(),reservation=game.usual.reservation,automatic=reservation?.status==='active';
 document.body.dataset.room=room;document.body.dataset.phase=room==='distill'?(atLimit?'filling':phase):room==='warehouse'?'watching':'selling';document.body.dataset.time=blocked()||!hasMonthlyWork()?'paused':'running';document.body.classList.toggle('is-tasting',tasting&&modal?.kind==='inspect');
 document.body.style.setProperty('--month-duration',T.monthMs+'ms');document.body.style.setProperty('--month-progress',elapsed/T.monthMs);document.body.style.setProperty('--extraction-progress',(game.still.distillation?.progress??0)/extractionMaximum);$('extraction-progress').hidden=phase==='ready';document.body.style.setProperty('--collection',game.still.distillation?.litres/40||0);
 $('game').hidden=false;$('time-flow').hidden=false;$('recovery').hidden=canSave||preview;
 $('cash').textContent=money(game.core.cash);$('calendar').textContent=monthLabel(game.core.month);$('monthly-cost').textContent='維持費 '+money(D.upkeep(game))+'/月';
 for(const name of ['distill','warehouse','sales'])$('room-'+name).hidden=room!==name;
 for(const b of $('room-nav').querySelectorAll('[data-room]'))b.setAttribute('aria-pressed',String(b.dataset.room===room));
 $('nav-still').textContent=phase==='distilling'?(atLimit?'たる詰め待ち':'蒸留中'):phase==='filling'?'たる詰め待ち':'待機';$('nav-casks').textContent=game.core.casks.length+'たる';$('nav-stock').textContent=bottleStock()+'本'+(game.shop.offer?' · 申し出':'');
 const invitation=$('shop-offer'),invited=game.brands.find(b=>b.id===game.shop.offer?.brandId);invitation.hidden=false;invitation.disabled=tasting||!!modal||game.decisions.length>0;invitation.textContent='取扱店';
 $('start-distill').hidden=phase!=='ready';$('stop-distill').hidden=automatic||phase!=='distilling'||atLimit;$('open-fill').hidden=automatic||(phase!=='filling'&&!atLimit);
 const gen=generationState();$('generation-name').textContent=gen?generationName(gen.id):'';const banner=$('generation-notice');banner.hidden=!gen||gen.phase==='working';banner.textContent=gen?.phase==='last-batch'?generationName(gen.id)+'の最後の仕込み · '+monthLabel(gen.fixedMonth+12)+'まで':gen?.phase==='review'?generationName(gen.id)+'の歩みを確認します。':'';
 const start=D.canStart(game);$('start-distill').disabled=!start.ok;$('start-distill').textContent='蒸留 '+money(P.distillationCost);
 $('stop-distill').disabled=(game.still.distillation?.progress??0)<T.minimumStop;
 $('collection').hidden=true;
 renderSpirit();
 $('distill-caption').hidden=phase!=='ready'||start.ok;
 $('distill-caption').textContent=phase==='ready'&&!start.ok&&!reservation?uiText(start.reason):'';
 $('distill-direction').hidden=phase!=='distilling'||atLimit||game.still.distillation.progress>=T.minimumStop;$('distill-direction').textContent='採取待ち';
 const quote=D.usualQuote(game),reference=D.selectedUsualRecipe(game),recipe=reservation?.recipe??reference,staff=D.staffStatus(game);
 const chosen=game.recipeBook?.entries.find(r=>r.id===game.recipeBook.selectedId);
 const bottler=D.bottlingStaffStatus(game);$('staff-panel').hidden=!staff.unlocked;$('open-staff-panel').hidden=!staff.unlocked&&!bottler.unlocked;
 $('staff-heading').innerHTML='<span class="staff-person" aria-hidden="true"></span>蒸留担当者';
 $('hire-staff').hidden=!staff.unlocked||staff.hired;$('hire-staff').disabled=!staff.canHire||tasting||(!!modal&&modal.kind!=='staff-panel')||game.decisions.length>0||!!game.trade.offer;
 $('hire-staff').textContent='採用';
 $('staff-terms').innerHTML=copyFacts([...(staff.hired?[]:[['採用費',money(staff.hireCost)]]),['給与',money(reservation?reservation.salary??0:staff.salary)+'／仕込み']]);
 $('staff-legacy').hidden=!staffMigrationNotice||!staff.legacy||staff.hired;$('staff-legacy').textContent='旧予約は継続。新規依頼から給与がかかります。';
 $('staff-hire-reason').textContent=!staff.hired&&!staff.canHire?uiText(staff.reason):'';
 $('manual-reference').hidden=true;$('manual-reference').textContent=chosen?'参照 '+(chosen.name||caskName(chosen.source.caskId)+'の製法')+' · 抽出位置 '+chosen.stopAt+' / '+extractionMaximum+' · '+uiText(P.casks[chosen.type].short):'';
 $('open-recipes').hidden=!!reservation;$('open-recipes').disabled=!!reservation||!!modal&&modal.kind!=='staff-panel';
 $('usual-recipe').innerHTML=recipe?copyFacts([['製法',reservation?.source?caskName(reservation.source.caskId):chosen?(chosen.name||caskName(chosen.source.caskId)+'の製法'):'前回の手動仕込み'],['抽出',recipe.stopAt+' / '+extractionMaximum],['たる',uiText(P.casks[recipe.type].short)]]):'';
 $('reserve-usual').hidden=!!reservation||!staff.hired;$('reserve-usual').disabled=!recipe||phase!=='ready'||tasting||(!!modal&&modal.kind!=='staff-panel')||gen?.phase!=='working';
 $('cancel-usual').hidden=!reservation||automatic&&(!reservation.mode||reservation.stopAfter);
 $('cancel-usual').textContent=automatic?'今回で終了':'停止';
 let staffState='指示待ち',staffBrief='指示待ち';
 if(reservation){const check=D.canBeginUsual(game);staffState=automatic?'仕込み中':game.core.casks.length>=P.maxCasks||game.core.products.filter(p=>p.stock>0).length+game.core.casks.length>=P.maxProducts?'空き待ち':game.decisions.length||game.trade.offer||game.shop?.offer&&!game.shop.offer.notified||gen?.phase!=='working'?'判断待ち':game.core.cash<check.minimum?'資金待ち':'依頼済み';
  staffBrief=staffState;staffState=(reservation.mode==='three'?'3回まで\n残り'+reservation.remaining+'回':reservation.mode==='continuous'?'続ける':'1回だけ')+'\n'+staffState+(reservation.stopAfter?'\n今回で終了':'');
 }
 $('usual-status').textContent=staff.hired||reservation?staffState:'';
 const rk=JSON.stringify([game.core.casks.map(c=>[c.id,c.age,c.litres,reservationLabel(c.id)]),selectedCaskId,game.generations]);
 if(rk!==rackKey){$('cask-rack').innerHTML=game.core.casks.map(c=>'<button type="button" data-cask-id="'+c.id+'" aria-label="'+esc(caskLabel(c)+' · '+ageLabel(c.age)+' · '+c.litres.toFixed(1)+' L')+'" aria-pressed="'+(selectedCaskId===c.id)+'"><span class="shelf-art" aria-hidden="true">'+barrel(c.type)+'</span><strong>'+caskName(c.id)+'</strong><small>'+ageLabel(c.age)+'</small></button>').join('')+'<span class="shelf-space" aria-hidden="true"></span>'.repeat(Math.max(0,4-game.core.casks.length));rackKey=rk;}
 const contracted=false;$('bottling-status').textContent=selectedCaskId!==null?reservationLabel(selectedCaskId):'';
 const canCool=D.freeAgingMode(game)&&selectedCaskId!==null&&D.canCare(game,selectedCaskId);for(const id of ['cool-cask','cool-tasting'])$(id).hidden=!canCool;const hasBottler=D.bottlingStaffStatus(game).hired;$('open-bottle').hidden=hasBottler;$('taste-bottle').hidden=hasBottler;const inlineBottling=$('cask-bottling-modes');inlineBottling.hidden=!hasBottler;inlineBottling.innerHTML=hasBottler&&selectedCaskId!==null?'<div class="bottling-modes" role="group" aria-label="ビン詰めの方式">'+button('自分で行う','bottling-manual',selectedCaskId,'aria-pressed="'+(D.bottlingReservation(game,selectedCaskId)?.status!=='active')+'"')+button('任せる','bottling-delegate',selectedCaskId,'aria-pressed="'+(D.bottlingReservation(game,selectedCaskId)?.status==='active')+'"'+(D.bottlingReservation(game,selectedCaskId)?.status==='active'?' disabled':''))+'</div>':'';
 $('open-bottle').textContent='ビン詰め';$('taste-bottle').textContent=game.trade.order?.status==='unmet'&&game.trade.order.caskId===selectedCaskId?'販売方法を選ぶ':'ビン詰め';
 $('warehouse-empty').hidden=game.core.casks.length>0;$('selected-cask').hidden=selectedCaskId===null||modal?.kind!=='inspect';$('close-cask-window').hidden=true;
 if(selectedCaskId!==null){
  const c=D.currentCask(game,selectedCaskId),n=game.notesById[c.id];if(barrelKey!==c.id){$('barrel').innerHTML=barrel(c.type);barrelKey=c.id;}
  $('cask-kind').textContent=caskLabel(c)+(provenanceLabel(c.id)?' · '+provenanceLabel(c.id):'');$('cask-provenance').textContent=provenanceLabel(c.id);$('age').textContent=ageLabel(c.age)+(n.cooled?' · 冷暗所':'');const gk=c.id+':'+c.wood;if(glassKey!==gk){$('glass').innerHTML=glass(c.wood,{sample:true});glassKey=gk;}$('amount').textContent='残り '+c.litres.toFixed(1)+' L';$('loss').textContent='蒸発 −'+Math.max(0,c.initialLitres-c.litres-(game.batchesById[c.id]?.withdrawnLitres??0)).toFixed(1)+' L';$('change').textContent=uiText(D.observation(game,c.id).change);$('last-taste').textContent=n.samples.length?'前回 '+ageLabel(n.samples.at(-1).age):'試飲記録なし';
  $('tasting-panel').hidden=!tasting||modal?.kind!=='inspect';$('tasting-actions').hidden=!tasting||modal?.kind!=='inspect';$('free-actions').hidden=tasting||modal?.kind!=='inspect';
  if(tasting){
   const comp=D.comparison(game,c.id),previous=comp.previous?.profile,hasPrevious=FLAVOR_AXES.some(({key})=>Number.isFinite(previous?.[key])&&previous[key]>=0&&previous[key]<=1.35);
   $('taste-date').textContent=ageLabel(comp.current.age)+'の試飲';
   $('taste-current').innerHTML=flavorTypeView(comp.current.profile)+FLAVOR_AXES.map(({label,key})=>'<section class="tasting-flavor"><h3>'+esc(label)+'</h3>'+flavorMeter(comp.current.profile,key,{previousProfile:previous,previousLabel:comp.previous?'前回 '+ageLabel(comp.previous.age):'前回'})+'</section>').join('');
   $('taste-previous').hidden=!comp.previous;$('taste-previous').textContent=hasPrevious?'▼ 前回 '+ageLabel(comp.previous.age):comp.previous?'前回の風味は記録なし':'';
  }
 }
 for(const id of ['compare-cask','compare-tasting'])$(id).hidden=game.core.casks.length<2;
 const shelfProducts=game.core.products.filter(p=>p.stock>0),shelfPageCount=Math.max(1,Math.ceil(shelfProducts.length/4));shelfPage=Math.min(shelfPage,shelfPageCount-1);const shelfStart=shelfPage*4;
 const sk=JSON.stringify([game.core.products,game.productsById,game.brands,selectedProductId,game.generations,shelfPage]);if(sk!==shelfKey){$('product-shelf').innerHTML=shelfProducts.slice(shelfStart,shelfStart+4).map(p=>'<button type="button" data-product-id="'+p.id+'" aria-label="'+esc((brandFor(p.id)?.name??'この一本')+' · '+releaseTag(p.id)+' · '+p.stock+'本 · '+(game.productsById[p.id]?.listed?'販売中':'保管中'))+'" aria-pressed="'+(selectedProductId===p.id)+'"><span class="shelf-art" aria-hidden="true">'+productArt(p)+'</span><strong>'+esc(brandFor(p.id)?.name??game.records.find(r=>r.productId===p.id)?.name??'この一本')+'</strong>'+provenanceTag(releaseFor(p.id)?.caskId)+'<small>'+releaseTag(p.id)+' · '+ageLabel(p.age)+'</small><small>'+p.stock+'本 · '+(game.productsById[p.id]?.listed?'販売中':'保管中')+'</small></button>').join('')+'<span class="shelf-space" aria-hidden="true"></span>'.repeat(Math.max(0,4-shelfProducts.slice(shelfStart,shelfStart+4).length));shelfKey=sk;}
 $('shelf-pages').hidden=shelfPageCount<=1;const pageButtons=$('shelf-pages').querySelectorAll('button');pageButtons[0].disabled=shelfPage===0;pageButtons[1].disabled=shelfPage+1>=shelfPageCount;$('shelf-pages').querySelector('span').textContent=(shelfPage+1)+' / '+shelfPageCount;

 $('sales-empty').hidden=game.core.products.some(p=>p.stock>0);const last=game.core.lastMonth;$('sales-result').textContent=last?monthLabel(last.month)+' '+last.bottles+'本\n売上 '+money(last.revenue):'';
 $('toggle-time').textContent=(!preview&&!canSave)?'保存待ち':(userPaused&&jump===0)||runtimeHalted?(phase==='distilling'&&!atLimit?'蒸留を再開する':'時間を進める'):'時間を止める';$('time-controls').hidden=tasting||!!modal;
 $('toggle-time').disabled=!hasMonthlyWork()||(!preview&&!canSave);$('skip').disabled=!hasMonthlyWork()||!!reservation||phase==='distilling'||jump>0||(!preview&&!canSave);
 $('time-status').textContent=(!preview&&!canSave)?'保存エラー・停止中':modal?'確認中・停止中':tasting?'試飲中・停止中':document.hidden?'画面を離れて停止中':runtimeHalted?'資金を残して停止中':userPaused&&jump===0?'停止中':!hasMonthlyWork()?'停止中':jump?'3か月を進行中':'進行中';
 $('time-change').textContent=last?monthLabel(last.month)+' 維持費 '+money(last.upkeep)+(last.revenue?' · 売上 '+money(last.revenue):''):'';
 $('records').hidden=true;
 const spirit=$('spirit-readout').hidden?null:{kind:$('spirit-kind').textContent,volume:$('spirit-volume').textContent,phrase:$('spirit-phrase').textContent,axes:$('spirit-gauges').hidden?[]:[['roughness','シゲキ'],['character','かおり']].map(([id,label])=>({label,ratio:Number($('spirit-'+id).style.getPropertyValue('--flavor-fill'))}))};
 scene.update({room,phase,pauseHint:userPaused&&jump===0&&!runtimeHalted&&!modal&&!tasting,monthProgress:elapsed/T.monthMs,inspectId:modal?.kind==='inspect'?selectedCaskId:null,cash:money(game.core.cash),calendar:monthLabel(game.core.month),generation:$('generation-name').textContent,timeStatus:$('time-status').textContent,
  collection:Math.max(0,Math.min(1,game.still.distillation?.litres/40||0)),spirit,
  staffAvailable:!$('open-staff-panel').hidden,phaseSummary:phase==='distilling'&&!automatic?'抽出位置 '+game.still.distillation.progress+' / '+extractionMaximum:!reservation&&!start.ok&&phase==='ready'?uiText(start.reason):!automatic&&['ready','distilling'].includes(phase)&&D.operationDefaults(game).stopAt!==null?'前の抽出 '+D.operationDefaults(game).stopAt+' / '+extractionMaximum:'',staffBrief:staff.hired||reservation?staffBrief:'',
  notice:!$('storage-notice').hidden?$('storage-notice').textContent:!banner.hidden?banner.textContent:runtimeHalted?$('work-notice').textContent:'',
  casks:game.core.casks.map(c=>({id:c.id,type:c.type,wood:c.wood,name:caskName(c.id),age:ageLabel(c.age),reservationIcon:reservationSymbol(c.id),selected:c.id===selectedCaskId})),
  products:shelfProducts.slice(shelfStart,shelfStart+4).map(p=>({id:p.id,wood:p.wood,brand:brandFor(p.id),priceTier:releasePriceTier(game,p.id),name:(brandFor(p.id)?.name??'AmberTime')+'\n'+releaseTag(p.id).replace(' · たる No.',' No.').replace(' · ',' '),state:p.stock+'本 · '+(game.productsById[p.id]?.listed?'販売中':'保管中'),releaseDate:releaseTag(p.id).split(' · ')[0],stock:p.stock,saleState:game.productsById[p.id]?.listed?'販売中':'保管中',selected:p.id===selectedProductId})),pageCount:shelfPageCount,pageLabel:(shelfPage+1)+' / '+shelfPageCount});
}
$('room-nav').addEventListener('click',e=>{const b=e.target.closest('[data-room]');if(b)selectRoom(b.dataset.room);});
$('go-distill').addEventListener('click',()=>selectRoom('distill'));
$('cask-rack').addEventListener('click',e=>{const b=e.target.closest('[data-cask-id]');if(!b||modal||!D.currentCask(game,Number(b.dataset.caskId)))return;stopClock();endTaste();selectedCaskId=Number(b.dataset.caskId);modal={kind:'inspect',id:selectedCaskId};save();render();schedule();});
$('close-cask-window').addEventListener('click',closeModal);
$('open-staff-panel').addEventListener('click',()=>{if(game&&(D.staffStatus(game).unlocked||D.bottlingStaffStatus(game).unlocked))openModal('staff-manager');});
$('open-aux-menu').addEventListener('click',()=>openModal('aux-panel'));
$('open-history').addEventListener('click',openHistory);
$('open-ledger').addEventListener('click',()=>openModal('ledger'));$('open-settings').addEventListener('click',()=>{if(!game){$('settings-source').hidden=!$('settings-source').hidden;return;}openModal('settings');});
$('shelf-pages').addEventListener('click',e=>{const b=e.target.closest('button[data-page-step]');if(b&&!b.disabled){shelfPage=Math.max(0,shelfPage+Number(b.dataset.pageStep));render();if(b.disabled)$('shelf-pages').querySelector('button:not(:disabled)')?.focus({preventScroll:true});}});
$('shop-offer').addEventListener('click',()=>{if(modal||!game)return;stopClock();jump=0;deliveryNotice='';modal={kind:'stockists'};render();schedule();});
$('product-shelf').addEventListener('click',e=>{const b=e.target.closest('[data-product-id]');if(b){selectedProductId=Number(b.dataset.productId);openModal('product',selectedProductId);}});
$('open-recipes').addEventListener('click',()=>{if(!modal||modal.kind==='staff-panel')openRecipes();});
for(const id of ['compare-cask','compare-tasting'])$(id).addEventListener('click',()=>{if(selectedCaskId!==null&&(!modal||modal.kind==='inspect'))openCaskComparison(selectedCaskId);});
$('ledger-body').addEventListener('click',e=>{const b=e.target.closest('[data-action="compare-release"]');if(b&&!modal)openReleaseComparison(Number(b.dataset.id));});
$('records-body').addEventListener('click',e=>{const b=e.target.closest('[data-action="compare-release"]');if(b&&!modal)openReleaseComparison(Number(b.dataset.id));});
$('reserve-usual').addEventListener('click',()=>{if(!game||(modal&&modal.kind!=='staff-panel'))return;openStaffRequest();});
$('hire-staff').addEventListener('click',()=>{if(!game||(modal&&modal.kind!=='staff-panel'))return;act(D.hireStaff,()=>message('担当者を採用しました。'));});
$('cancel-usual').addEventListener('click',()=>{if(!game||(modal&&modal.kind!=='staff-panel'))return;act(game.usual.reservation?.status==='active'?D.stopStaffRepeat:D.cancelUsual,()=>message(game.usual.reservation?'今回で終了':'依頼を停止しました。'));});
$('start-distill').addEventListener('click',()=>{if(!game||!D.canStart(game).ok||modal)return;message('');act(D.startDistillation);});
$('stop-distill').addEventListener('click',finishDistillation);$('open-fill').addEventListener('click',()=>{if(atExtractionLimit()&&!modal)finishDistillation();else openModal('fill');});
$('taste-button').addEventListener('click',()=>trial(selectedCaskId));$('glass-button').addEventListener('click',()=>{if(game?.tastingId===null)trial(selectedCaskId);});
for(const id of ['cool-cask','cool-tasting'])$(id).addEventListener('click',()=>{if(!game||modal?.kind!=='inspect'||!D.freeAgingMode(game)||!D.canCare(game,selectedCaskId))return;act(s=>D.careForCask(s,selectedCaskId));});
$('end-tasting').addEventListener('click',()=>modal?.ledgerParent?finishLedgerTasting():act(D.endTasting));$('open-bottle').addEventListener('click',()=>quoteModal(selectedCaskId));$('taste-bottle').addEventListener('click',()=>quoteModal(selectedCaskId));
$('toggle-time').addEventListener('click',()=>{if(jump>0){jump=0;userPaused=true;}else if(runtimeHalted){runtimeHalted=false;}else userPaused=!userPaused;save();render();schedule();});
$('skip').addEventListener('click',()=>{if(!game||(!preview&&!canSave)||document.hidden||(modal&&modal.kind!=='aux-panel')||game.tastingId!==null||game.decisions.length||runtimeHalted||!hasMonthlyWork()||game.usual.reservation||game.still.phase==='distilling'||jump>0)return;if(modal?.kind==='aux-panel')modal=null;jump=3;schedule();render();});
$('close-dialog').addEventListener('click',closeModal);$('action-dialog').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
// A backdrop tap must start and end outside the dialog; drags never dismiss it.
let backdropPress=null;
const outsideDialog=e=>{const r=$('action-dialog').getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
$('action-dialog').addEventListener('pointerdown',e=>{backdropPress=e.target===$('action-dialog')&&outsideDialog(e)?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;});
$('action-dialog').addEventListener('pointermove',e=>{if(backdropPress&&backdropPress.id===e.pointerId&&Math.hypot(e.clientX-backdropPress.x,e.clientY-backdropPress.y)>=8)backdropPress=null;});
$('action-dialog').addEventListener('pointerup',e=>{const start=backdropPress;backdropPress=null;if(start&&start.id===e.pointerId&&e.target===$('action-dialog')&&outsideDialog(e)&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<8)closeModal();});
$('action-dialog').addEventListener('pointercancel',()=>{backdropPress=null;});
$('ledger-body').addEventListener('click',e=>{const b=e.target.closest?.('[data-action="department-cancel"]');if(!b||modal||!D.departmentInterests(game).some(i=>i.selectionId===b.dataset.selectionId))return;act(s=>D.cancelDepartmentInterest(s,b.dataset.selectionId),()=>message('相談を終えました。'));});
$('dialog-actions').addEventListener('click',e=>handleModal(e));$('dialog-body').addEventListener('click',e=>handleModal(e));
function updateBottleDraft(e){
 if(modal?.kind==='bottler-panel'&&modal.planDraft){
  const draft=modal.planDraft;
  if(e.target.id==='bottling-mode'){draft.mode=e.target.value;render();}
  if(e.target.id==='bottling-condition'&&['age','threshold'].includes(e.target.dataset.policyField))draft[e.target.dataset.policyField]=e.target.value===''?null:Number(e.target.value);
  if(e.target.id==='bottling-condition'&&draft.mode==='age')$('dialog-body').querySelector('label[for="bottling-condition"]').textContent=(draft.age??'')+'か月で一度だけ';
  if(e.target.id==='bottling-quantity')draft.count=e.target.value===''?null:Number(e.target.value);
  const reserve=$('action-dialog').querySelector('[data-action="bottling-policy-save"]');if(reserve)reserve.disabled=!validPlanDraft(draft);
  return;
 }
 if(modal?.kind==='product'&&e.target.id==='sales-destination-choice'){modal.destination=e.target.value;render();return;}
 if(modal?.kind==='quote'&&e.target.id==='brand-name'&&D.needsBrandSetup(game)){firstBrandDraft().name=e.target.value;if(!e.isComposing){const error=brandNameError(e.target.value);$('brand-name-error').textContent=error;e.target.setAttribute('aria-invalid',String(!!error));updateBottleSelection();}return;}
 if(modal?.kind==='quote'&&e.target.id==='bottle-count'){modal.bottleCount=e.target.value===''?null:Number(e.target.value);updateBottleSelection();}
}
$('dialog-body').addEventListener('change',e=>{if(e.target.id==='ledger-compare-choice'&&modal?.kind==='ledger-recipe-comparison'&&recipeRows().some(r=>r.caskId===Number(e.target.value)&&r.caskId!==modal.caskId)){modal.otherId=Number(e.target.value);render();$('ledger-compare-choice')?.focus({preventScroll:true});}});
$('dialog-body').addEventListener('compositionend',updateBottleDraft);$('dialog-body').addEventListener('input',updateBottleDraft);$('dialog-body').addEventListener('change',updateBottleDraft);
function handleModal(e){
 const b=e.target.closest('[data-action]');if(!b||b.disabled||!modal)return;const a=b.dataset.action,id=Number(b.dataset.id),kind=modal.kind;
 if(kind==='quote'&&D.needsBrandSetup(game)&&a==='brand-next'){if(!brandNameError(firstBrandDraft().name)){modal.brandDraftConfirmed=true;render();}return;}
 if(kind==='quote'&&D.needsBrandSetup(game)&&a==='brand-edit'){modal.brandDraftConfirmed=false;render();return;}
 if(kind==='quote'&&D.needsBrandSetup(game)&&['brand-bottle','brand-label'].includes(a)){const field=a==='brand-bottle'?'bottle':'label',choices=field==='bottle'?IDENTITY_BOTTLES:IDENTITY_LABELS;if(choices.some(x=>x.id===b.dataset.id)){firstBrandDraft()[field]=b.dataset.id;render();}return;}
 if(a==='staff-opportunity-later'&&kind==='staff-opportunity'){closeModal();return;}
 if(a==='staff-opportunity-hire'&&kind==='staff-opportunity'&&b.dataset.id===modal.job){const target=modal.returnModal??null,job=modal.job;act(job==='distill'?D.hireStaff:D.hireBottlingStaff,()=>{modal=target;});return;}
 if(a==='staff-job-hire'&&kind==='staff-manager'&&['distill','bottling'].includes(b.dataset.id)){act(b.dataset.id==='distill'?D.hireStaff:D.hireBottlingStaff);return;}
 if(a==='staff-job-open'&&kind==='staff-manager'){if(b.dataset.id==='distill'&&D.staffStatus(game).hired){modal={kind:'staff-panel'};render();}else if(b.dataset.id==='bottling'&&D.bottlingStaffStatus(game).hired){modal={kind:'bottler-panel'};render();}return;}
 if(a==='staff-manage-back'&&['staff-panel','bottler-panel'].includes(kind)){modal={kind:'staff-manager'};render();return;}
 if(a==='bottling-toggle'&&kind==='bottler-panel'&&D.bottlingStaffStatus(game).hired&&D.currentCask(game,id)){
  const r=D.bottlingReservation(game,id);if((!r||r.status==='completed')&&!D.commonBottlingPolicy(game)){modal.policyNotice='共通の条件を保存してください。';render();return;}
  act(s=>r?.status==='active'?D.pauseBottling(D.endTasting(s),id,true):r?.status==='paused'?D.pauseBottling(D.endTasting(s),id,false):D.delegateBottling(D.endTasting(s),id),()=>{modal.policyNotice='';});return;
 }
 if(a==='bottling-cancel'&&kind==='bottler-panel'&&D.bottlingStaffStatus(game).hired&&D.bottlingReservation(game,id)){act(s=>D.cancelBottling(D.endTasting(s),id));return;}
 if(a==='staff-bottle-plan'&&kind==='bottler-panel'&&D.bottlingStaffStatus(game).hired&&D.currentCask(game,id)){modal={kind:'bottling-plan',id,staffContext:true};render();return;}
 if(a==='bottling-manual'&&['inspect','bottling-plan'].includes(kind)&&D.currentCask(game,id)){quoteModal(id);return;}
 if(a==='bottling-policy-edit'&&kind==='bottler-panel'){modal.editPolicy=true;render();return;}
 if(a==='bottling-staff-back'&&kind==='bottling-plan'){modal={kind:'bottler-panel'};render();return;}
 if(a==='bottling-policy-save'&&kind==='bottler-panel'){
  if(!validPlanDraft(modal.planDraft))return;const draft={...modal.planDraft},returnCaskId=modal.returnCaskId,displayDefaults=Object.fromEntries(['age','threshold'].filter(key=>Number.isInteger(draft[key])&&draft[key]>=0&&draft[key]<=(key==='age'?1200:999)).map(key=>[key,draft[key]])),plan=draft.mode==='age'?{mode:'age',age:draft.age,count:draft.count}:{mode:'stock',threshold:draft.threshold,count:draft.count};
  act(s=>D.setBottlingPolicy(s,plan,displayDefaults),()=>{modal=returnCaskId?{kind:'inspect',id:returnCaskId}:{kind:'bottler-panel'};message('条件を保存しました。');});return;
 }
 if(a==='bottling-delegate'&&['inspect','bottling-plan'].includes(kind)&&D.bottlingStaffStatus(game).hired&&D.currentCask(game,id)){
  if(!D.commonBottlingPolicy(game)){modal={kind:'bottler-panel',returnCaskId:id};render();return;}
  const staffContext=modal.staffContext;act(s=>D.delegateBottling(D.endTasting(s),id),()=>{selectedCaskId=id;modal=staffContext?{kind:'bottler-panel'}:{kind:'inspect',id};message('ビン詰めを任せました。');});return;
 }
 if(['bottling-pause','bottling-resume','bottling-cancel'].includes(a)&&kind==='bottling-plan'&&modal.staffContext){act(s=>a==='bottling-cancel'?D.cancelBottling(D.endTasting(s),id):D.pauseBottling(D.endTasting(s),id,a==='bottling-pause'),()=>{modal={kind:'bottler-panel'};message(a==='bottling-cancel'?'予約を取り消しました。':a==='bottling-pause'?'予約を停止しました。':'予約を再開しました。');});return;}
 if(a==='stockist-open'&&kind==='stockists'&&knownStockists().some(s=>s.id===b.dataset.id)){deliveryNotice='';modal={kind:'stockist',shopId:b.dataset.id};render();return;}
 if(a==='stockists-back'&&kind==='stockist'){modal={kind:'stockists'};deliveryNotice='';render();return;}
 if(a==='stockist-back'&&kind==='stockist-delivery'){modal={kind:'stockist',shopId:modal.shopId};deliveryNotice='';render();return;}
 if(a==='stockist-product'&&kind==='stockist'&&stockistProducts(modal.shopId).some(x=>x.p.id===id&&x.q.ok)){modal={kind:'stockist-delivery',shopId:modal.shopId,id};deliveryNotice='';render();return;}
 if(a==='stockist-offer'&&kind==='stockist'&&game.shop.offer?.id===id&&game.shop.offer.shopId===modal.shopId){showShopOffer(null,{...modal});render();return;}
 if(a==='stockist-offer-back'&&kind==='shop-offer'&&modal.returnModal){modal=modal.returnModal;render();return;}
 if(a==='delivery-select'){
  const shopId=b.dataset.shopId;if(!['product','stockist-delivery'].includes(kind)||modal.id!==id||(kind==='product'?modal.destination!==shopId:modal.shopId!==shopId))return;
  const q=D.shopQuote(game,id,shopId),n=Number(b.dataset.count);if(!q.ok||!q.quantities.includes(n))return;
  modal.deliveryProductId=id;modal.deliveryShopId=shopId;modal.deliveryCount=n;deliveryNotice='';render();
  if(!pointerInteraction)queueMicrotask(()=>document.querySelector('[data-action="delivery-select"][data-count="'+n+'"]')?.focus({preventScroll:true}));return;
 }
 if(a==='settings-reset'&&kind==='settings'){$('reset').click();return;}
 if(a==='staff-back'&&kind==='staff-request'){closeComparison();return;}
 if(a==='staff-hire-request'&&kind==='staff-request'){act(s=>D.hireStaff(D.endTasting(s)),()=>message('担当者を採用しました。'));return;}
 if(a==='staff-mode'&&kind==='staff-request'&&['once','three','continuous'].includes(b.dataset.id)&&game.staff.hired){modal.requestMode=b.dataset.id;render();return;}
 if(a==='staff-confirm'&&kind==='staff-request'&&staffCanRequest()){const sourceId=modal.caskId,mode=modal.requestMode;act(s=>sourceId===null?D.reserveUsual(D.endTasting(s),mode):D.reserveStaff(D.endTasting(s),sourceId,mode),()=>{modal=null;room='distill';message('仕込みを依頼しました。');});return;}

 if(a==='ledger-recipe-open'&&['ledger','recipes','ledger-cask'].includes(kind)&&recipeRows().some(r=>r.caskId===id)){openLedgerDetail('ledger-recipe',id,b.id);return;}
 if(a==='ledger-cask-open'&&['ledger','ledger-recipe'].includes(kind)&&caskData().casks.some(c=>c.caskId===id)){openLedgerDetail('ledger-cask',id,b.id);return;}
 if(a==='ledger-list-page'&&(kind==='recipes'||kind==='ledger'&&['recipes','aging'].includes(modal.section))&&Number.isInteger(id)&&id>=0){modal.listPage=id;render();$('dialog-body').scrollTop=0;return;}
 if(a==='ledger-source-compare'&&kind==='ledger-recipe'){const other=recipeRows().find(r=>r.caskId!==modal.caskId);if(other){const parent=rememberLedger();modal={kind:'ledger-recipe-comparison',caskId:parent.caskId,otherId:other.caskId,parent,returnFocusId:b.id};render();$('dialog-body').scrollTop=0;}return;}
 if(a==='ledger-recipe-request'&&kind==='ledger-recipe'){rememberLedger();openStaffRequest(modal.caskId);return;}
 if(a==='ledger-cask-taste'&&kind==='ledger-cask'&&D.currentCask(game,id)){const parent=rememberLedger();stopClock();jump=0;selectedCaskId=id;room='warehouse';act(s=>D.sampleDistillery(s,id),()=>{modal={kind:'inspect',id,ledgerParent:parent};});return;}
 if(a==='ledger-cask-compare'&&kind==='ledger-cask'&&D.currentCask(game,id)){rememberLedger();openCaskComparison(id);return;}
 if(a==='ledger-section'&&kind==='ledger'&&['recipes','aging','releases','shops'].includes(b.dataset.id)){modal.section=b.dataset.id;modal.listPage=0;modal.scrollTop=0;modal.openDetails=[];render();$('dialog-body').scrollTop=0;return;}
 if(a==='ledger-release'&&['ledger','comparison-brand-record','ledger-recipe','ledger-cask'].includes(kind)){const entry=ledgerData().entries.find(x=>x.key===b.dataset.id);if(entry){modal={kind:'ledger-release',key:entry.key,parent:rememberLedger(),returnFocusId:b.id};render();$('dialog-body').scrollTop=0;}return;}
 if(a==='ledger-cask-compare'&&kind==='ledger'&&modal.section==='aging'){rememberLedger();openCaskComparison(id);return;}
 if(a==='ledger-history'&&kind==='ledger'){openHistory();return;}
 if(a==='ledger-request'&&kind==='ledger'&&modal.section==='recipes'){rememberLedger();openStaffRequest();return;}
 if(a==='compare-release'){openReleaseComparison(id);return;}
 if(a==='compare-cask-select'&&kind==='cask-picker'&&id!==modal.baseId&&D.currentCask(game,id)){modal.kind='cask-comparison';modal.otherId=id;render();return;}
 if(a==='compare-cask-change'&&kind==='cask-comparison'){modal.kind='cask-picker';render();return;}
 if(a==='recipe-source'&&['recipes','staff-request','recipe-source','ledger','ledger-release'].includes(kind)){modal={kind:'recipe-source',caskId:id,parent:rememberLedger(),returnFocusId:document.activeElement?.id};render();return;}
 if(a==='compare-brand-record'&&kind==='release-comparison'){modal={kind:'comparison-brand-record',brandId:id,parent:modal,returnFocusId:document.activeElement?.id};render();return;}
 if(a==='comparison-back'&&comparisonKinds.includes(kind)){closeComparison();return;}
 if(a==='recipe-source-page'&&(kind==='recipes'||kind==='ledger'&&modal.section==='recipes')&&id>=0){modal.sourcePage=id;modal.sourcesOpen=true;render();return;}
 if(a==='recipe-select'&&(kind==='recipes'||kind==='ledger-recipe'||kind==='ledger'&&modal.section==='recipes')){recipeAction(s=>D.selectRecipe(s,b.dataset.id==='latest'?null:b.dataset.id));return;}
 if(a==='recipe-save'&&(comparisonKinds.includes(kind)||kind==='ledger'&&modal.section==='recipes')){recipeAction(s=>D.saveRecipe(s,id));return;}
 if(a==='generation-history'&&kind==='generation-review'&&generationState()?.id===id){modal=null;openHistory();return;}
 if(a==='generation-continue'&&kind==='generation-notice'&&generationState()?.id===id){modal=null;room='distill';render();schedule();return;}
 if(a==='generation-handover'&&kind==='generation-review'&&generationState()?.id===id){act(s=>D.handoverGeneration(s,id),()=>{modal=null;runtimeHalted=false;room='distill';message(generationName(generationState().id)+'へ引き継ぎました。');});return;}
 if(a==='history-year'&&kind==='history'){modal.year=modal.year===b.dataset.id?null:b.dataset.id;modal.page=0;render();return;}
 if(a==='history-page'&&kind==='history'&&Number.isInteger(id)&&id>=0){modal.page=id;render();return;}
 if(a==='history-brand'&&['history','history-shop'].includes(kind)){modal={kind:'history-brand',brandId:id,year:modal.year??null,page:modal.page??0,parent:modal.parent};render();return;}
 if(a==='history-shop'&&['history','history-brand'].includes(kind)){modal={kind:'history-shop',shopId:b.dataset.id,year:modal.year??null,page:modal.page??0,parent:modal.parent};render();return;}
 if(a==='history-back'&&['history-brand','history-shop'].includes(kind)){modal={kind:'history',year:modal.year??null,page:modal.page??0,parent:modal.parent};render();return;}

 if(['shop-accept','shop-decline','shop-later','shop-accept-deliver','shop-select-count'].includes(a)&&(kind!=='shop-offer'||modal.shopId!==b.dataset.shopId||modal.offerId!==Number(b.dataset.offerId)))return;
 if(a==='shop-accept'&&modal.shopId==='department')return;
 if(a==='shop-later'){if(kind==='shop-offer'){if(modal.returnModal){modal=modal.returnModal;render();}else closeModal();}return;}
 if(a==='shop-open-offer'){if(kind==='product'){showShopOffer(modal.id);render();schedule();}return;}
 if(a==='shop-accept'||a==='shop-decline'){if(kind==='shop-offer'){const target={...modal};act(s=>(a==='shop-accept'?D.acceptShop:D.declineShop)(s,target.shopId,target.offerId),()=>{modal=target.returnModal??(target.returnProductId!==null?{kind:'product',id:target.returnProductId}:null);room='sales';if(a==='shop-accept'&&target.shopId==='town-liquor'){if(modal?.kind==='product')deliveryNotice='「これからよろしくお願いします。」';else modal={kind:'stockist',shopId:target.shopId,greeting:true};message('');}else message(a==='shop-accept'?(target.shopId==='department'?'取扱いの相談を残しました。':shopName(target.shopId)+'で取扱いが始まりました。'):'今回は見送りました。');});}return;}
 if(a==='shop-accept-deliver'){if(kind==='shop-offer'&&modal.productId===id&&modal.shopId===b.dataset.shopId&&modal.offerId===Number(b.dataset.offerId)&& (preview||canSave)){const n=Number(b.dataset.count);if(modal.shopId!=='department')return;const target={...modal};act(s=>D.acceptShopDelivery(s,id,n,target.shopId,target.offerId),()=>{modal=target.returnModal??(target.returnProductId!==null?{kind:'product',id:target.returnProductId}:null);room='sales';},()=>{deliveryNotice='翌月5本納品';message(target.returnModal||target.returnProductId!==null?'':deliveryNotice);});}return;}
 if(a==='department-cancel'){if((kind==='product'&&modal.id===id||kind==='ledger')&&D.departmentInterests(game,releaseFor(id)?.brandId).some(x=>x.selectionId===b.dataset.selectionId))act(s=>D.cancelDepartmentInterest(s,b.dataset.selectionId),()=>{deliveryNotice='相談を終えました。';});return;}
 if(a==='shop-deliver'){
  const shopId=b.dataset.shopId;if(!['product','stockist-delivery'].includes(kind)||modal.id!==id||(kind==='product'?modal.destination!==shopId:modal.shopId!==shopId)||!preview&&!canSave)return;
  const p=game.core.products.find(p=>p.id===id),q=D.shopQuote(game,id,shopId),n=Number(b.dataset.count);if(!p||deliveryCount(p,q)!==n||shopId==='department'&&b.dataset.selectionId!==q.selectionId)return;
  modal.deliveryCount=null;deliveryNotice='';
  act(s=>D.deliverShop(s,id,n,shopId,shopId==='department'?q.selectionId:undefined),null,()=>{if(shopId==='department')deliveryNotice='翌月5本納品';else{const receipt=game.shop.deliveries.at(-1);deliveryNotice=receipt.count+'本納品\n'+unit(receipt.revenue)+' 入金';}message('');});return;
 }
 if(a==='store'||a==='product-later'){if(kind==='product')closeModal();return;}if(a==='cancel'){closeModal();return;}if(a==='trial'){trial(id);return;}if(a==='quote'){quoteModal(id);return;}
 if(a==='choose'){const first=game.decisions[0];if(kind!=='decision'||first?.caskId!==id||first.eventId!==b.dataset.event)return;act(s=>D.chooseDistillery(s,id,b.dataset.choice),()=>{modal=null;message('');});return;}
 if(a==='fill-select'&&kind==='fill'&&P.casks[b.dataset.id]){modal.fillType=b.dataset.id;render();return;}
 if(a==='fill'){if(kind!=='fill'||modal.fillType!==b.dataset.id||!P.casks[modal.fillType])return;act(s=>D.fillBarrel(s,modal.fillType),()=>{modal=null;selectedCaskId=game.core.casks.at(-1)?.id??null;room='warehouse';message('');});return;}
 if(a==='price'){if(kind!=='product'||modal.id!==id)return;act(s=>D.setSalePrice(s,b.dataset.tier,id));return;}
 if(a==='list'){if(kind!=='product'||modal.id!==id||game.productsById[id]?.listed)return;act(s=>D.listBottles(s,id),()=>{room='sales';selectedProductId=id;modal=null;message('');});return;}
 if(['bottle-less','bottle-more','bottle-all'].includes(a)){
  if(kind!=='quote'||modal.id!==id||modal.committing)return;const q=bottleSelection(id);
  if(a==='bottle-all'){if(q.max<1||q.affordable<q.max)return;modal.bottleCount=q.max;}
  else {const count=q.choices[q.choices.indexOf(q.count)+(a==='bottle-less'?-1:1)];if(count===undefined)return;modal.bottleCount=count;}
  $('bottle-count').value=modal.bottleCount;updateBottleSelection();return;
 }
 if(a==='bottle'){
  if(kind!=='quote'||modal.id!==id||modal.committing||D.needsBrandSetup(game)&&!modal.brandDraftConfirmed)return;const q=bottleSelection(id);if(!q.ok)return;const count=q.count,quoteState=modal;
  const selection=D.needsBrandSetup(game)?{...firstBrandDraft()}:{brandId:1};
  quoteState.committing=true;updateBottleSelection();
  const ok=act(s=>D.bottleBranded(D.endTasting(s),id,selection,count),()=>{selectedProductId=game.result.productId;room='sales';modal=null;deliveryNotice='';message('');},()=>{modal={kind:'product',id:selectedProductId};});
  if(!ok&&modal===quoteState){quoteState.committing=false;updateBottleSelection();}return;
 }
}
function suspend(){jump=0;stopClock();save();if(game)render();}
function resume(){if(game){render();schedule();}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else resume();});window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',e=>{if(e.persisted)resume();});
window.addEventListener('storage',e=>{if(!preview&&e.key===SAVE_KEY){canSave=false;suspend();storageNotice('別の画面で保存が変わりました。再読み込みしてください。');}});
$('reset').addEventListener('click',()=>{if(!confirm('0.21の進行を新しくしますか？以前の保存は残ります。'))return;stopClock();try{lastSavedText=preview?null:localStorage.getItem(SAVE_KEY);}catch{storageNotice('保存を確認できないため初期化していません。');return;}game=D.newBrandIdentityDistillery(seed);automaticNews.reset();staffMigrationNotice=false;shownFillSpiritId=null;room='distill';selectedCaskId=null;modal=null;userPaused=false;runtimeHalted=false;elapsed=0;jump=0;glassKey='';canSave=!preview;storageNotice('');save();render();});
$('retry-save').addEventListener('click',()=>{if(!game){boot();return;}canSave=!preview;if(save()){storageNotice('');$('recovery').hidden=true;}render();schedule();});
function shopOrderLedger(){
 const rows=game.shopDemand?.lastOrders??[];if(!rows.length)return '';
 return '<details class="ledger-category"><summary>'+esc(monthLabel(game.core.month))+' 商店</summary>'+rows.map(o=>'<p>'+esc(SHOPS.find(x=>x.id===o.shopId)?.name??o.shopId)+'：注文 '+o.requested+'本 · 発送 '+o.shipped+'本'+(o.unmet?' · 未発送 '+o.unmet+'本':'')+'</p>').join('')+'</details>';
}
function boot(){
 if(preview){game=D.newBrandIdentityDistillery(seed);save();render();schedule();return;}
 try{
  lastSavedText=localStorage.getItem(SAVE_KEY);
  if(lastSavedText===null){game=D.newBrandIdentityDistillery(seed);userPaused=false;elapsed=0;}
  else{const session=JSON.parse(lastSavedText);if(session.version!==2||typeof session.userPaused!=='boolean'||Object.keys(session).length!==4||session.game?.version!==20||!Number.isInteger(session.elapsed)||session.elapsed<0||session.elapsed>=T.monthMs||session.elapsed%T.distillStepMs!==0)throw Error('session');game=D.restoreDistillery(JSON.stringify(session.game));userPaused=session.userPaused;elapsed=session.elapsed;}
  const restoredGame=game;game=D.enableBrandIdentity(D.enableStaffExperience(game));const corrected=game!==restoredGame||lastSavedText!==null&&JSON.stringify(game)!==JSON.stringify(JSON.parse(lastSavedText).game);
  selectedCaskId=game.tastingId??game.core.casks[0]?.id??null;room=selectedCaskId!==null?'warehouse':'distill';canSave=true;if(lastSavedText===null||corrected)save();render();schedule();
 }catch{canSave=false;game=null;stopClock();$('settings-source').hidden=false;$('recovery').append($('settings-source'));$('game').hidden=true;$('recovery').hidden=false;storageNotice('この保存は開けません。元の記録を残して停止しています。');}
}
const scene=new CanvasScene();
boot();
