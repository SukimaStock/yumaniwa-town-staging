import {migrateRecentLedger,advanceRecentLedger,recentLedgerView} from './recent-ledger.mjs?v=s3-1';
import {ledgerProfile,caskTimeline,recordTimeline,recordText} from './ledger-history-view.mjs?v=refactor-r5-1';
import {fontReady} from './font-loader.mjs?v=0.35-font-1';
import {createWarehouseRoomController} from './warehouse-room-controller.mjs?v=refactor-r4-1';
import {createDistillRoomController} from './distill-room-controller.mjs?v=refactor-r3-1';
import {staffStatusView} from './staff-status-view.mjs?v=status-reactions-r1';
import {manualCompletedRuns} from './distill-learning.mjs?v=game-guide-r1';
import {DistillToolInput} from './distill-tool-input.mjs?v=lever-glass-r1&geometry=r2-1';
import {distillToolsView,rangeRestartAvailable,TOOL_GEOMETRY} from './distill-tools-view.mjs?v=rooms-stage2-r1&geometry=r2-1';
import {glassColor} from './flavor-color.mjs?v=cut-pixel-r1';
import {soldOutLabel,LIVE_MESSAGE} from './message-view.mjs?v=visual14-r1';
import {readSession,serializeSession,isCurrentSession,writeCandidate,FORMAL_SAVE_KEY,DEVELOPMENT_SAVE_VERSION} from './development-save.mjs?v=h3-3a-1';
import {initializeHistoryRecord,advanceHistoryRecord,historyRecordView} from './history-record.mjs?v=s4-1';
import {NODES as HISTORY_REGIONS} from './town-connection.mjs?v=stage4-r2';
import {createMarketUI,commitMarketRulesUpdate} from './market-ui.mjs?v=compact-three-r1&fields=count-linked-r1&rooms=stage2-r1&quantity=a3-1';
import {createPlacementUI} from './placement-ui.mjs?v=visual14-r1&quantity=a3-1';
import {symbolMarkup} from './pixel-symbols.mjs?v=rooms-stage2-r1';
import {createFeedbackComments,commentExcerpt,caskFeedback,warehouseFeedback,warehouseFeedbackPreview} from './flavor-feedback-view.mjs?v=0.25.4&rooms=stage3-r1&status=1&aging=1';
import {shopRelationshipLabel,shopOrderMarkup} from './shop-order-view.mjs?v=formal-copy-r1';
import {RuntimeClock} from './runtime-clock.mjs?v=0.25.1';
import {caskDetailProfile} from './cask-detail-view.mjs?v=formal-copy-r1&rooms=stage3-r1&aging=1';
import {StartCountdown} from './start-countdown.mjs?v=native-timer-r2';
import {mapProgress,mapStep,drawGameMap,newlyUnlocked,mapIntroduction,mapNoticeBaseline,STAGES as MAP_STAGES} from './world-map-view.mjs?v=0.28.0-map';
import {mapSalesProjection} from './map-sales-view.mjs?v=map-stage2-r1';
import {dailyMapProjection,normalizeMapView,loadMapView,saveMapView} from './map-daily-view.mjs?v=map-stage2-r1';
import {BREWING_CARDS,brewingCardsMarkup,renderBrewingIcons,manualCards,chooseManualCard,brewingPanelState} from './brewing-cards.mjs?v=confirmed-brewing-r1';
import {playerMilestones} from './player-news.mjs?v=0.25.4';
import {flavorSummary} from './lab-flavor.mjs?v=stage4-r2';
import {buildShopLedger} from './shop-ledger.mjs?v=0.68-ui-refinements';
import {buildReleaseLedger} from './ledger-view.mjs?v=0.63-ledger';
import {IDENTITY_BOTTLES,IDENTITY_LABELS,identityDefaults,brandNameError,releasePriceTier} from './brand-identity.mjs?v=0.58-first-brand';
import {firstBrandEditor,firstBottleCompletion} from './first-bottle-view.mjs?v=a5-first-bottle-1';
import {extractionMaximum,bottleChoices,defaultBottleCount,releaseLabel} from './ui-details.mjs?v=stage4-r2';
import {shopRemark} from './shop-remarks.mjs?v=0.51-shop-remarks';
import {automaticEvents,transientNotices} from './event-notices.mjs?v=uniform-messages-r1';
import {CanvasScene} from './canvas-scene.mjs?s1=1&tools=rooms-stage3-r1&touch=1&status=1&v=market-rules-r1&daily=1&aging=1&geometry=r2-1&completion=a13-1';
import * as nativeModel from './partner-orders.mjs?v=market-rules-r1&touch=1';
import {createObservedModel} from './recall/operations.mjs?v=h3-3a-1';
import {DEBUG_SKIP_YEARS,monthsForDebugSkip,debugSkipMonth} from './recall/debug-time-skip.mjs?v=debug-years-1';
import {createRecallPlayer as createRecallDebugPreview} from './recall/player.mjs?v=h4-2-1';
import {sceneViews as playbackScenes} from './recall/pixel-scene.mjs?v=h4-2-1';
import {initializeRecall,advanceRecall,prepareRecall,readCompletedRecalls} from './recall/collector.mjs?v=h3-3a-1';
let recallRecord=null,pendingRecall=null,recallPreview=null;
const D=createObservedModel(nativeModel,({before,after,operation})=>{
 if(!pendingRecall)return;
 const prepared=operation.key==='generation-handover'?(recallPreview??prepareRecall(pendingRecall,before,before.operations.length)):undefined;
 pendingRecall=advanceRecall(before,after,pendingRecall,{prepared});
 recallPreview=null;
});
import {SHOPS} from './shop-model.mjs?v=0.48-free-aging';
import {initializeCaskSlots,reconcileCaskSlots,caskSlotMap} from './cask-slots.mjs?v=s1-1';
import {distillationReadout,spiritProfile} from './spirit-view.mjs?v=distill-ui-r1';
import {spiritReadoutView} from './spirit-readout-view.mjs?v=refactor-r1-1';
import {brandStats,brandReputation} from './brand-reputation.mjs?v=0.15';
import {PARALLEL_PARAMETERS as T,ECONOMY_PARAMETERS as P} from './economy-parameters.mjs?v=0.7';
import {ageLabel,monthLabel} from './model.mjs?v=stage4-r2';
import {barrel} from './cask-glass-art.mjs?v=0.58-first-brand';
import {glass,bottleArt,brandArt,stillArt} from './room-object-art.mjs?v=0.62-bottle-shelf-wall';
import {shortTaste,shortChange} from './tasting-view.mjs?v=stage4-r2';
import {flavorTypeView as sourceFlavorTypeView} from './flavor-types.mjs?v=stage4-r2';
import {FLAVOR_AXES as sourceFlavorAxes,flavorMeter as sourceFlavorMeter} from './flavor-view.mjs?v=formal-copy-r1';
import {nearbyCasks,previousRelease,releasePair,sourceDetails} from './nearby-comparison.mjs?v=market-rules-r1';
import {uiText,agingEventText} from './ui-text.mjs?v=stage4-r2&rooms=stage3-r1&aging=1';
// Slots belong only to current inventory; all operations retain the native ID.
let caskSlots=[null,null,null,null];
function pastCaskName(id,facts={}){
 if(Number.isInteger(facts.filledMonth))return monthLabel(facts.filledMonth)+'の仕込み';
 const c=game?.core.casks.find(c=>c.id===id)??game?.core.archive.find(c=>c.id===id),recipe=game?.recipeBook?.entries.find(r=>r.source?.caskId===id);
 const month=facts.filledMonth??c?.filledMonth??recipe?.source?.filledMonth;
 if(Number.isInteger(month))return monthLabel(month)+'の仕込み';
 const r=game?.releases.find(r=>r.caskId===id);return r?'第'+r.id+'回発売の元のたる':'元のたる';
}
const caskName=id=>{const n=caskSlotMap(caskSlots).get(id);return n?'たる'+n:pastCaskName(id);};
const slotCasks=()=>caskSlots.map(id=>game.core.casks.find(c=>c.id===id)??null);
const FLAVOR_AXES=sourceFlavorAxes.map(axis=>({...axis,label:uiText(axis.label)}));
const flavorTypeView=profile=>uiText(sourceFlavorTypeView(profile));
const flavorMeter=(...args)=>uiText(sourceFlavorMeter(...args));
const placementEnabled=true;
export const SAVE_KEY=FORMAL_SAVE_KEY;
if(placementEnabled)document.body.dataset.placement='1';
const $=id=>document.getElementById(id),money=n=>'£'+Number(n).toLocaleString('en-GB',{maximumFractionDigits:0}),unit=n=>'£'+Number(n).toFixed(2);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const displayReason=text=>({'ビン詰めの資金が足りません。':'資金不足','ビン1本分の原酒がありません。':'原酒が1本分足りません','担当者の条件を決めてください':'先に共通設定を保存','貯蔵庫が満杯です。':'貯蔵庫が満杯'}[text]??uiText(text));
const query=new URLSearchParams(location.search),preview=query.get('preview')==='1',chosenSeed=Number(query.get('seed')),seed=preview&&Number.isInteger(chosenSeed)&&chosenSeed>0&&chosenSeed<=4294967295?chosenSeed:20261015;
// The authoring tools are reachable only through an explicit debug URL.
const debugEnabled=query.get('debug')==='1';
$('open-settings').hidden=!debugEnabled;$('recovery-import').hidden=!debugEnabled;
const recallScenePlayer=createRecallDebugPreview({document,window});
const recallSceneDebug=debugEnabled?recallScenePlayer:null;
let game=null,room='distill',selectedProductId=null,userPaused=false,runtimeHalted=false,modal=null,timer=null,generation=0,elapsed=0,playbackRate=1,canSave=!preview,lastSavedText=null;
let committedSession=null,lastSaveError=null,legacyRecord=null;
let debugSkipJob=null,debugSkipFeedback='';
const newNativeGame=()=>D.newMarketRulesDistillery(seed);
let marketEditing=false,marketMessageId=0;
const placementUI=placementEnabled?createPlacementUI({document,model:D,state:()=>game,art:p=>productArt(p),icon:symbolMarkup('store'),commit:commitPlacement,render:()=>{render();schedule();}}):null;
const marketUI=createMarketUI({document,model:D,state:()=>game,art:p=>productArt(p),icon:symbolMarkup('store'),act:actMarket,
 openProduct:id=>{selectedProductId=id;openModal('product',id);},
 openRetailInfo:id=>{selectedProductId=id;openModal('market-retail-info',id);},
 openStockist:shopId=>{if(!game||modal)return;marketUI.cancel();stopClock();modal={kind:'stockist',shopId};render();schedule();},
 announce:text=>{if(text)automaticNews.push([{id:'market-message:'+(++marketMessageId),kind:'message',priority:1,text}]);},
 announceSaved:text=>{const status=$('market-action-status');status.textContent='';queueMicrotask(()=>{status.textContent=text;});},
 setEditing:value=>{if(marketEditing===value)return;marketEditing=value;stopClock();queueMicrotask(()=>{if(game){render();schedule();}});}
});
const distillRoom=createDistillRoomController();
const warehouseRoom=createWarehouseRoomController();
const countdown=new StartCountdown({canRun:()=>!!game&&!document.hidden&&room==='distill'&&!modal&&(preview||canSave)&&D.canStart(game).ok,onChange:value=>{if(value!==null){if(game)render();}else queueMicrotask(()=>{if(game&&!countdown.active)render();});}});
function prepareDistillation(start){
 if(countdown.active||!game||document.hidden||room!=='distill'||!D.canStart(game).ok||modal&&modal.kind!=='flavor-cards')return;
 stopClock();modal=null;countdown.start(()=>act(start,()=>distillRoom.clearPrepared(),null,{paused:false}));
}
const automaticNews=transientNotices({show:text=>{$('automatic-news').textContent=text;$('automatic-news').hidden=false;},hide:()=>{$('automatic-news').hidden=true;$('automatic-news').textContent='';}});
// Keep transient notices above the body-mounted sales board.
document.body.append($('automatic-news'),$('market-action-status'));
const feedbackComments=createFeedbackComments();
let roomFeedback=null;
let rackKey='',shelfKey='',barrelKey='',glassKey='';
// Only presentation is remembered here; the saved filling phase owns unfinished work.
let shownFillSpiritId=null;

let shelfPage=0;
let worldMapStage=1;
const MAP_NOTICE_KEY=SAVE_KEY+'.map-reveal.v1';
let mapShown=0,mapAnnounced=0,mapPending=0;
const MAP_VIEW_KEY=SAVE_KEY+'.map-view.v1';
function mapUIStorage(){try{return sessionStorage;}catch{return null;}}
let mapBrowse=preview?null:loadMapView(mapUIStorage(),MAP_VIEW_KEY);
function rememberMapBrowse(){
 const data=dailyMapProjection(game,worldMapStage);mapBrowse=normalizeMapView({stage:worldMapStage,selectedShop:modal?.selectedShop},mapViewMax(),data.pins.map(p=>p.id));
 if(!preview)saveMapView(mapUIStorage(),MAP_VIEW_KEY,mapBrowse);
}
function openDailyMap(){
 if(!game||modal||$('open-world-map').disabled)return;
 countdown.cancel();stopClock();
 const initial=normalizeMapView(mapBrowse,mapViewMax(),[]),data=dailyMapProjection(game,initial.stage);
 mapBrowse=normalizeMapView(mapBrowse,mapViewMax(),data.pins.map(p=>p.id));worldMapStage=mapBrowse.stage;
 modal={kind:'world-map',source:'direct',selectedShop:mapBrowse.selectedShop};rememberMapBrowse();render();
}
function mapNoticeLoad(restored){
 const progress=mapProgress(game);let stored=null;
 if(!preview){try{stored=JSON.parse(localStorage.getItem(MAP_NOTICE_KEY));}catch{}}
 ({shown:mapShown,announced:mapAnnounced}=mapNoticeBaseline(progress,stored,restored));
 mapPending=0;mapNoticeSave();
}
const mapViewMax=()=>mapProgress(game).max;
function mapNoticeSave(){if(preview)return;try{localStorage.setItem(MAP_NOTICE_KEY,JSON.stringify({version:2,shown:mapShown,announced:mapAnnounced}));}catch{}}
function noteMapReach(){if(!game||!preview&&!canSave)return;const progress=mapProgress(game),max=progress.bottled?progress.max:0;if(newlyUnlocked(mapAnnounced,max))mapPending=Math.max(mapPending,max);}
function tryShowMapReveal(){
 if(mapPending<=mapAnnounced||countdown.active||modal||document.hidden||runtimeHalted||!preview&&!canSave||game.tastingId!==null||game.decisions.length||game.trade.offer||game.shop.offer&&!game.shop.offer.notified||game.still.phase!=='ready'||generationState()?.phase!=='working')return false;
 const target=mapProgress(game).max;mapPending=0;
 if(!newlyUnlocked(mapAnnounced,target))return false;
 stopClock();worldMapStage=target;modal={kind:'world-map',source:'unlock'};
 mapAnnounced=Math.max(mapAnnounced,target);mapNoticeSave();return true;
}

function showInitialMapNotice(){
 noteMapReach();
 if(mapShown===0)return tryShowMapReveal();
 // Later unlocks remain available without replacing the daily browsing range.
 if(mapPending>mapAnnounced){mapAnnounced=mapPending;mapPending=0;mapNoticeSave();}
 return false;
}

let modalReturnFocus=null;
let modalReturnObject=null;
let pointerInteraction=false;
const inputMode=pointer=>{pointerInteraction=pointer;$('action-dialog').dataset.input=pointer?'pointer':'keyboard';};
document.addEventListener('pointerdown',()=>inputMode(true),true);
document.addEventListener('keydown',()=>inputMode(false),true);
// Ephemeral display only; never stored or used by the simulation.
let deliveryNotice='';
let staffMigrationNotice=false;
// Display reads committed facts; opening history never replays game operations.
let historyRecord=null,historyData=null,historySnapshot=null,historyFactsSnapshot=null;
function readHistory(){
 if(historySnapshot===game&&historyFactsSnapshot===historyRecord)return;
 historyData=historyRecordView(game,historyRecord);historySnapshot=game;historyFactsSnapshot=historyRecord;
}
function historyWaiting(){if(preview&&!historyRecord)return '<p>この試遊には歩みの記録がありません。</p>';readHistory();return null;}
function openHistory(){
 if(!game||(modal&&!['aux-panel','ledger','generation-review'].includes(modal.kind)))return;
 const parent=['ledger','generation-review'].includes(modal?.kind)?rememberLedger():null;stopClock();modal={kind:'history',year:null,page:0,parent};render();
}

// All comparison selection and return paths are temporary display state.
const comparisonKinds=['cask-picker','cask-comparison','release-comparison','recipe-source','comparison-brand-record','recipes','history-generation','ledger-release','ledger-shop','ledger-recipe','ledger-cask','ledger-recipe-comparison'];
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
 stopClock();const before=game;
 try{game=D.noticeStaffOpportunity(game,opportunity.kind);if(!save())return false;modal={kind:'staff-opportunity',job:opportunity.kind,returnModal};return true;}
 catch(e){game=before;runtimeHalted=true;storageNotice(e.message);return false;}
}
function staffCostView(kind){const status=jobStatus(kind);return '<p>'+copyFacts([['採用費',money(status.hireCost)],['給与',money(status.salary)+(kind==='distill'?'／仕込み':'／回')]])+'</p><p class="quiet">'+(kind==='distill'?'仕込み開始時に支払い':'ビン詰め時に支払い')+'<br>待機中は無料</p>'+(status.canHire||status.hired?'':'<p class="quiet">'+esc(uiText(status.reason))+'</p>');}
function staffManagerView(){return ['distill','bottling'].filter(kind=>jobStatus(kind).unlocked).map(kind=>{const status=jobStatus(kind);return '<section class="staff-job"><h3>'+jobName(kind)+'</h3>'+(status.hired?'<p>給与 '+money(status.salary)+(kind==='distill'?'／仕込み':'／回')+'</p>':staffCostView(kind))+(status.hired?button(kind==='distill'?'依頼':'設定','staff-job-open',kind):button('採用 '+money(status.hireCost),'staff-job-hire',kind,status.canHire?'':'disabled'))+'</section>';}).join('');}
function bottlerManagerView(){
 const status=D.bottlingStaffStatus(game);if(!status.hired)return staffCostView('bottling');
 const policy=D.commonBottlingPolicy(game),editing=modal.editPolicy||!policy;
 const common=editing?bottlingPolicyView():'<p>'+esc(policyLabel(policy))+'</p>'+button('変更','bottling-policy-edit');
 return '<p>給与 '+money(status.salary)+'／回</p>'+common+'<p class="quiet">次の予約から</p>'+(game.core.casks.length?'<div class="staff-casks">'+game.core.casks.map(c=>{const r=D.bottlingReservation(game,c.id),active=r?.status==='active';return '<div class="staff-cask-row"><p>'+esc(caskName(c.id))+' · '+ageLabel(c.age)+'</p>'+button('<span class="switch-track" aria-hidden="true"></span><span>'+(active?'任せる':'自分で行う')+'</span>','bottling-toggle',c.id,'role="switch" aria-checked="'+active+'" aria-label="'+esc(caskName(c.id))+' ビン詰めを任せる"')+(modal.policyNoticeId===c.id?'<p class="bottling-policy-notice" role="status">先に共通設定を保存してください</p>':'')+(r&&r.status!=='completed'?'<p class="quiet">'+esc(reservationLabel(c.id))+'</p>'+button('予約取消','bottling-cancel',c.id):'')+'</div>';}).join('')+'</div>':'<p>たるなし</p>');
}
function staffRequestView(){
 const q=D.staffQuote(game,modal.caskId===null?undefined:modal.caskId),status=D.staffStatus(game);if(!q)return '<p>抽出位置・たるが不明です。</p>';
 const item=Number.isInteger(modal.sourceId)?sourceDetails(game,modal.sourceId):null;
 let out='<div class="staff-source-art">'+(item?staffArt(item):barrel(q.type))+'</div><h3 class="staff-source-title">'+esc(item?staffTitle(item):'製法')+'</h3><p class="staff-spec">'+copyFacts([['抽出',q.stopAt+' / '+extractionMaximum],['たる',uiText(P.casks[q.type].short)]])+'</p>';
 if(item?.commissionedFrom)out+='<p class="quiet">依頼元 '+pastCaskName(item.commissionedFrom.caskId)+' '+button('元の記録','recipe-source',item.commissionedFrom.caskId)+'</p>';
 if(!status.hired&&!(status.legacy&&modal.caskId===null))return out+'<p>'+copyFacts([['採用費',money(status.hireCost)],['給与',money(status.salary)+'／仕込み']])+'</p><p class="quiet">仕込み開始時に支払い<br>待機中は無料</p>'+(status.canHire?'':'<p class="quiet">'+esc(uiText(status.reason))+'</p>');
 if(status.hired)out+='<div class="staff-modes" aria-label="依頼方式">'+[['once','1回'],['three','3回まで'],['continuous','続ける']].map(([mode,label])=>button(label,'staff-mode',mode,'aria-pressed="'+(modal.requestMode===mode)+'"')).join('')+'</div>';
 const salary=status.hired?q.salary:0;
 out+='<p class="staff-cost">'+copyFacts([['給与',money(salary)+'／仕込み']])+'</p>';
 let wait=[];if(game.core.casks.length>=4)wait.push('貯蔵庫が満杯');const minimum=q.minimum-(status.hired?0:q.salary);if(game.core.cash<minimum)wait.push('必要資金 '+money(minimum)+'（ビン詰め費を含む）');
 if(wait.length)out+='<p class="quiet">'+wait.map(esc).join('<br>')+'</p>';
 return out;
}
function staffCanRequest(){return game.still.phase==='ready'&&!game.usual.reservation&&generationState()?.phase==='working'&&!game.decisions.length&&!game.trade.offer;}
function caskIdentity(x){return '<spa…32716 tokens truncated….products.filter(p=>p.stock>0),shelfPageCount=Math.max(1,Math.ceil(shelfProducts.length/4));shelfPage=Math.min(shelfPage,shelfPageCount-1);const shelfStart=shelfPage*4;
 const sk=JSON.stringify(placementEnabled?[game.core.products,game.productsById,game.brands,selectedProductId,game.generations,shelfPage,game.placement]:[game.core.products,game.productsById,game.brands,selectedProductId,game.generations,shelfPage]);if(sk!==shelfKey){$('product-shelf').innerHTML=shelfProducts.slice(shelfStart,shelfStart+4).map(p=>'<button type="button" data-product-id="'+p.id+'" aria-label="'+esc((brandFor(p.id)?.name??'この一本')+' · '+releaseTag(p.id)+' · '+displayProductStock(p)+'本 · '+productSaleState(p))+'" aria-pressed="'+(selectedProductId===p.id)+'"><span class="shelf-art" aria-hidden="true">'+productArt(p)+'</span><strong>'+esc(brandFor(p.id)?.name??game.records.find(r=>r.productId===p.id)?.name??'この一本')+'</strong>'+provenanceTag(releaseFor(p.id)?.caskId)+'<small>'+releaseTag(p.id)+' · '+ageLabel(p.age)+'</small><small>'+p.stock+'本 · '+productSaleState(p)+'</small></button>').join('')+'<span class="shelf-space" aria-hidden="true"></span>'.repeat(Math.max(0,4-shelfProducts.slice(shelfStart,shelfStart+4).length));shelfKey=sk;}
 $('shelf-pages').hidden=shelfPageCount<=1;const pageButtons=$('shelf-pages').querySelectorAll('button');pageButtons[0].disabled=shelfPage===0;pageButtons[1].disabled=shelfPage+1>=shelfPageCount;$('shelf-pages').querySelector('span').textContent=(shelfPage+1)+' / '+shelfPageCount;

 $('sales-empty').hidden=game.core.products.some(p=>p.stock>0);const last=game.core.lastMonth;$('sales-result').textContent=last?monthLabel(last.month)+' '+last.bottles+'本\n売上 '+money(last.revenue):'';
 $('toggle-time').textContent=(!preview&&!canSave)?'保存待ち':userPaused||runtimeHalted||heldRange()?(phase==='distilling'&&!atLimit?'蒸留を再開する':'時間を進める'):'時間を止める';$('time-controls').hidden=tasting||!!modal;
 $('toggle-time').disabled=countdown.active||heldRange()||!hasMonthlyWork()||(!preview&&!canSave);$('toggle-speed').disabled=countdown.active||!game||(!preview&&!canSave);$('toggle-speed').textContent=playbackRate===2?'1倍':'2倍';$('toggle-speed').setAttribute('aria-pressed',String(playbackRate===2));
 $('time-status').textContent=(!preview&&!canSave)?'保存エラー・停止中':modal||marketEditing?'確認中・停止中':tasting?'試飲中・停止中':document.hidden?'画面を離れて停止中':runtimeHalted?'資金を残して停止中':userPaused||heldRange()?'停止中':!hasMonthlyWork()?'停止中':playbackRate===2?'2倍速で進行中':'進行中';
 $('time-change').textContent=last?monthLabel(last.month)+' 維持費 '+money(last.upkeep)+(last.revenue?' · 売上 '+money(last.revenue):''):'';
 $('records').hidden=true;
 const comment=room==='sales'?feedbackComments.read(game).at(-1):null,aging=room==='warehouse'?warehouseFeedback(game):null;
 roomFeedback=comment?{kind:'comment',releaseId:comment.releaseId,text:commentExcerpt(game,comment)}:aging?{kind:'aging',caskId:aging.caskId,text:caskName(aging.caskId)+' · '+aging.text,previewText:warehouseFeedbackPreview(caskName(aging.caskId),aging)}:null;
 const feedbackButton=$('room-feedback'),feedbackHidden=!roomFeedback||!!modal||!$('automatic-news').hidden||!$('storage-notice').hidden||!banner.hidden||runtimeHalted;
 feedbackButton.hidden=feedbackHidden;feedbackButton.textContent=roomFeedback?.text??'';feedbackButton.disabled=!!modal;
 const spirit=$('spirit-readout').hidden?null:{compact:phase==='distilling',kind:$('spirit-kind').textContent,volume:$('spirit-volume').textContent,phrase:$('spirit-phrase').textContent,axes:$('spirit-gauges').hidden?[]:[['roughness','シゲキ'],['character','かおり']].map(([id,label])=>({label,ratio:Number($('spirit-'+id).style.getPropertyValue('--flavor-fill'))}))};
 const brewing=D.stage4Mode(game)?brewingPanelState(game,distillRoom.confirmation):null;if(brewing&&countdown.active)brewing.editable=false;
 const tools=currentDistillTools();
 // Final native profile only: collecting liquid remains symbolic and neutral.
 if(phase==='filling'&&game.core.spirit?.flavor?.version===1){const tint=glassColor(game.core.spirit.flavor.profile);Object.assign(tools,{liquidColor:tint.color,liquidHighlight:tint.highlight,liquidFamily:tint.family});}
 syncDistillTools(tools);
 scene.update({room,phase,tools,brewing,brewingCost:money(P.distillationCost),mapAvailable:!$('open-world-map').hidden,marketMode:D.storeMarketMode(game)&&room==='sales',countdown:countdown.value,playbackRate,running:!blocked()&&hasMonthlyWork(),motionIds:{caskIds:game.core.casks.map(c=>c.id),releaseIds:game.releases.map(r=>r.id),availableReleaseIds:shelfProducts.map(p=>releaseFor(p.id)?.id).filter(Number.isInteger)},pauseHint:!countdown.active&&userPaused&&!runtimeHalted&&!modal&&!tasting,monthProgress:elapsed/T.monthMs,inspectId:modal?.kind==='inspect'?warehouseRoom.selectedId:null,cash:money(game.core.cash),calendar:monthLabel(game.core.month),generation:$('generation-name').textContent,timeStatus:$('time-status').textContent,
  feedback:feedbackHidden?null:roomFeedback,
  collection:Math.max(0,Math.min(1,game.still.distillation?.litres/40||0)),spirit:countdown.active||modal?.kind==='fill'?null:spirit,
  cutRange:collection.enabled?collection:D.stage4Mode(game)?{enabled:true,fullRange:true,current:0,start:null,end:null}:{current:0,start:null,end:null},cutCondition:game.still.distillation?.labChoice??game.core.spirit?.flavor?.choice??(D.stage4Mode(game)?manualCards(game):null),staffAvailable:!$('open-staff-panel').hidden,phaseSummary:phase==='distilling'&&collection.enabled&&!collection.fullRange?'以前の蒸留を続けています。':!reservation&&!start.ok&&phase==='ready'?displayReason(start.reason):staffWaitReason,staffBrief:staff.hired||reservation?staffBrief:'',
  notice:!$('storage-notice').hidden?$('storage-notice').textContent:!banner.hidden?banner.textContent:runtimeHalted?$('work-notice').textContent:'',
  casks:slotCasks().filter(Boolean).map(c=>({id:c.id,slot:caskSlots.indexOf(c.id)+1,type:c.type,wood:c.wood,name:caskName(c.id).replace(/^たる /,''),flavorName:c.flavor?.label??null,age:ageLabel(c.age),reservationIcon:reservationSymbol(c.id),cooled:game.notesById[c.id]?.cooled===true,selected:c.id===warehouseRoom.selectedId})),
  products:shelfProducts.slice(shelfStart,shelfStart+4).map(p=>({id:p.id,releaseId:releaseFor(p.id)?.id??null,wood:p.wood,brand:brandFor(p.id),priceTier:releasePriceTier(game,p.id),name:(brandFor(p.id)?.name??'AmberTime')+'\n'+releaseTag(p.id).replace(' · たる No.',' No.').replace(' · ',' '),state:placementEnabled?displayProductStock(p)+'本':displayProductStock(p)+'本 · '+productSaleState(p),releaseDate:placementEnabled?placementShelfLabel(p):releaseTag(p.id).split(' · ')[0],stock:displayProductStock(p),saleState:placementEnabled?placementShelfRelease(p):productSaleState(p),selected:p.id===selectedProductId})),pageCount:shelfPageCount,pageLabel:(shelfPage+1)+' / '+shelfPageCount});
 $('scene-notice').setAttribute('aria-live',D.storeMarketMode(game)&&room==='sales'&&!modal?'off':'polite');
 marketUI.update({visible:D.storeMarketMode(game)&&room==='sales'&&!modal&&(preview||canSave),preserveEditing:modal?.kind==='world-map'||!!modal?.mapParent,notice:!$('storage-notice').hidden?$('storage-notice').textContent:!banner.hidden?banner.textContent:runtimeHalted?$('work-notice').textContent:''});
}
function openFeedbackRelease(id){
 const entry=ledgerData().entries.find(x=>x.releaseId===id);if(!entry)return;
 const parent=rememberLedger();stopClock();modal={kind:'ledger-release',key:entry.key,parent,returnFocusId:document.activeElement?.id};render();$('dialog-body').scrollTop=0;
}
$('room-feedback').addEventListener('click',()=>{
 if(!game||modal||!roomFeedback)return;
 if(roomFeedback.kind==='comment')openFeedbackRelease(roomFeedback.releaseId);
 else if(D.currentCask(game,roomFeedback.caskId)){warehouseRoom.select(roomFeedback.caskId);openModal('inspect',warehouseRoom.selectedId);}
});
$('room-nav').addEventListener('click',e=>{const b=e.target.closest('[data-room]');if(b)selectRoom(b.dataset.room);});
$('go-distill').addEventListener('click',()=>selectRoom('distill'));
$('cask-rack').addEventListener('click',e=>{const b=e.target.closest('[data-cask-id]');if(!b||modal||!D.currentCask(game,Number(b.dataset.caskId)))return;stopClock();if(!endTaste()){render();return;}warehouseRoom.select(Number(b.dataset.caskId));modal={kind:'inspect',id:warehouseRoom.selectedId};save();render();schedule();});
$('close-cask-window').addEventListener('click',closeModal);
$('open-staff-panel').addEventListener('click',()=>{if(game&&(D.staffStatus(game).unlocked||D.bottlingStaffStatus(game).unlocked))openModal('staff-manager');});
$('open-aux-menu').addEventListener('click',()=>openModal('aux-panel'));
$('open-world-map').addEventListener('click',openDailyMap);

$('open-ledger').addEventListener('click',()=>openModal('ledger'));$('open-settings').addEventListener('click',()=>{if(!game){$('settings-source').hidden=!$('settings-source').hidden;return;}openModal('settings');});
$('shelf-pages').addEventListener('click',e=>{const b=e.target.closest('button[data-page-step]');if(b&&!b.disabled){shelfPage=Math.max(0,shelfPage+Number(b.dataset.pageStep));render();if(b.disabled)$('shelf-pages').querySelector('button:not(:disabled)')?.focus({preventScroll:true});}});
$('shop-offer').addEventListener('click',()=>{if(modal||!game)return;stopClock();deliveryNotice='';modal={kind:'stockists'};render();schedule();});
$('product-shelf').addEventListener('click',e=>{const b=e.target.closest('[data-product-id]');if(b){selectedProductId=Number(b.dataset.productId);openModal('product',selectedProductId);}});
$('open-recipes').addEventListener('click',()=>{if(!modal||modal.kind==='staff-panel')openRecipes();});
for(const id of ['compare-cask','compare-tasting'])$(id).addEventListener('click',()=>{if(warehouseRoom.selectedId!==null&&(!modal||modal.kind==='inspect'))openCaskComparison(warehouseRoom.selectedId);});
$('ledger-body').addEventListener('click',e=>{const b=e.target.closest('[data-action="compare-release"]');if(b&&!modal)openReleaseComparison(Number(b.dataset.id));});
$('records-body').addEventListener('click',e=>{const b=e.target.closest('[data-action="compare-release"]');if(b&&!modal)openReleaseComparison(Number(b.dataset.id));});
$('reserve-usual').addEventListener('click',()=>{if(!game||(modal&&modal.kind!=='staff-panel'))return;openStaffRequest();});
$('hire-staff').addEventListener('click',()=>{if(!game||(modal&&modal.kind!=='staff-panel'))return;act(D.hireStaff,()=>message('採用しました'));});
$('cancel-usual').addEventListener('click',()=>{if(!game||(modal&&modal.kind!=='staff-panel'))return;act(game.usual.reservation?.status==='active'?D.stopStaffRepeat:D.cancelUsual,()=>message(game.usual.reservation?'今回で終了':'依頼を停止しました。'));});
$('start-distill').addEventListener('click',()=>{if(!game||countdown.active||!D.canStart(game).ok||modal)return;message('');if(D.stage4Mode(game)){const preparedAtOpen=distillRoom.beginEdit();openModal('flavor-cards');if(modal?.kind==='flavor-cards')modal.preparedAtOpen=preparedAtOpen;}});
$('stop-distill').addEventListener('click',finishDistillation);$('open-fill').addEventListener('click',()=>{if(atExtractionLimit()&&!modal)finishDistillation();else openModal('fill');});
$('taste-button').addEventListener('click',()=>trial(warehouseRoom.selectedId));$('glass-button').addEventListener('click',()=>{if(game?.tastingId===null)trial(warehouseRoom.selectedId);});
for(const id of ['cool-cask','cool-tasting'])$(id).addEventListener('click',()=>{if(!game||modal?.kind!=='inspect'||!D.freeAgingMode(game)||!D.canCare(game,warehouseRoom.selectedId))return;act(s=>D.careForCask(s,warehouseRoom.selectedId));});
$('end-tasting').addEventListener('click',()=>modal?.ledgerParent?finishLedgerTasting():act(D.endTasting));$('open-bottle').addEventListener('click',()=>quoteModal(warehouseRoom.selectedId));$('taste-bottle').addEventListener('click',()=>quoteModal(warehouseRoom.selectedId));
$('toggle-time').addEventListener('click',()=>{if(!preview&&!canSave)return;placementUI?.cancel();if(countdown.active)return;if(runtimeHalted){runtimeHalted=false;}else userPaused=!userPaused;save();render();schedule();});
$('toggle-speed').addEventListener('click',()=>{if(!game||(!preview&&!canSave)||document.hidden||modal?.kind!=='aux-panel')return;stopClock();playbackRate=playbackRate===1?2:1;modal=null;render();schedule();});
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
  if(e.target.id==='bottling-quantity'){draft.count=e.target.value===''?null:Number(e.target.value);const max=Math.floor((P.baseLitres+P.extraLitres)/P.bottleLitres);$('dialog-body').querySelector('[data-action=policy-count-less]').disabled=draft.count<=1;$('dialog-body').querySelector('[data-action=policy-count-more]').disabled=draft.count>=max;}
  const reserve=$('action-dialog').querySelector('[data-action="bottling-policy-save"]');if(reserve)reserve.disabled=!validPlanDraft(draft);
  return;
 }
 if(modal?.kind==='product'&&e.target.id==='sales-destination-choice'){modal.destination=e.target.value;if(placementEnabled&&e.target.value==='shelf')modal.placementLegacy=false;render();return;}
 if(modal?.kind==='quote'&&e.target.id==='brand-name'&&D.needsBrandSetup(game)){firstBrandDraft().name=e.target.value;const label=$('first-brand-preview-name');if(label)label.textContent=e.target.value.trim();if(!e.isComposing){const error=brandNameError(e.target.value);$('brand-name-error').textContent=error;e.target.setAttribute('aria-invalid',String(!!error));updateBottleSelection();}return;}
 if(modal?.kind==='quote'&&e.target.id==='bottle-count'){modal.bottleCount=e.target.value===''?null:Number(e.target.value);updateBottleSelection();}
}
$('dialog-body').addEventListener('change',e=>{if(e.target.id==='ledger-compare-choice'&&modal?.kind==='ledger-recipe-comparison'&&recipeRows().some(r=>r.caskId===Number(e.target.value)&&r.caskId!==modal.caskId)){modal.otherId=Number(e.target.value);render();$('ledger-compare-choice')?.focus({preventScroll:true});}});
$('dialog-body').addEventListener('compositionend',updateBottleDraft);$('dialog-body').addEventListener('input',updateBottleDraft);$('dialog-body').addEventListener('change',updateBottleDraft);
function handleModal(e){
 const b=e.target.closest('[data-action]');if(!b||b.disabled||!modal)return;const a=b.dataset.action,id=Number(b.dataset.id),kind=modal.kind;
 if(placementEnabled&&kind==='product'&&a.startsWith('placement-')){
  if(a==='placement-close'){closeModal();return;}
  if(a==='placement-existing'){modal.placementLegacy=true;modal.destination=b.dataset.id;render();return;}
  if(a==='placement-return'){modal.placementLegacy=false;render();return;}
  if(placementUI.handle(e))return;
 }
 if(kind==='quote'&&D.needsBrandSetup(game)&&a==='brand-next'){if(!brandNameError(firstBrandDraft().name)){modal.brandDraftConfirmed=true;render();}return;}
 if(kind==='quote'&&D.needsBrandSetup(game)&&a==='brand-edit'){modal.brandDraftConfirmed=false;render();return;}
 if(kind==='quote'&&D.needsBrandSetup(game)&&['brand-bottle','brand-label'].includes(a)){const field=a==='brand-bottle'?'bottle':'label',choices=field==='bottle'?IDENTITY_BOTTLES:IDENTITY_LABELS;if(choices.some(x=>x.id===b.dataset.id)){firstBrandDraft()[field]=b.dataset.id;render();}return;}
 if(kind==='world-map'&&['menu','direct'].includes(modal.source)&&a==='map-shop'){
  const id=b.dataset.id,isRetail=id==='retail'&&!!mapVisualBounds('retail');if(isRetail||mapSalesProjection(game,worldMapStage).pins.some(p=>p.id===id)){const next=isRetail?null:id,changed=modal.selectedShop!==next;modal.selectedShop=next;rememberMapBrowse();render();if(changed&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelector('.map-selection-cursor')?.animate([{opacity:.45},{opacity:1}],{duration:180,iterations:1});}}return;
 }
 if(kind==='world-map'&&['menu','direct'].includes(modal.source)&&a==='map-shop-info'){
  if(mapSalesProjection(game,worldMapStage).pins.some(p=>p.id===b.dataset.id)){modal={kind:'stockist',shopId:b.dataset.id,mapParent:modal};render();}return;
 }
 if(kind==='stockist'&&modal.mapParent&&a==='stockists-back'){closeModal();return;}
 if(kind==='world-map'&&['menu','direct'].includes(modal.source)&&a==='map-sales-room'){rememberMapBrowse();modal=null;room='sales';render();schedule();return;}
 if(kind==='world-map'&&['map-continue','map-back'].includes(a)){closeModal();return;}
 if(kind==='world-map'&&['menu','direct'].includes(modal.source)&&['world-map-in','world-map-out'].includes(a)){worldMapStage=mapStep(worldMapStage,a==='world-map-out'?'out':'in',mapViewMax());modal.selectedShop=null;rememberMapBrowse();render();return;}
  if(a==='staff-opportunity-later'&&kind==='staff-opportunity'){closeModal();return;}
 if(a==='staff-opportunity-hire'&&kind==='staff-opportunity'&&b.dataset.id===modal.job){const target=modal.returnModal??null,job=modal.job;act(job==='distill'?D.hireStaff:D.hireBottlingStaff,()=>{modal=target;});return;}
 if(a==='staff-job-hire'&&kind==='staff-manager'&&['distill','bottling'].includes(b.dataset.id)){act(b.dataset.id==='distill'?D.hireStaff:D.hireBottlingStaff);return;}
 if(a==='staff-job-open'&&kind==='staff-manager'){if(b.dataset.id==='distill'&&D.staffStatus(game).hired){modal={kind:'staff-panel'};render();}else if(b.dataset.id==='bottling'&&D.bottlingStaffStatus(game).hired){modal={kind:'bottler-panel'};render();}return;}
 if(a==='staff-manage-back'&&['staff-panel','bottler-panel'].includes(kind)){modal={kind:'staff-manager'};render();return;}
 if(['policy-count-less','policy-count-more'].includes(a)&&kind==='bottler-panel'&&modal.planDraft){const max=Math.floor((P.baseLitres+P.extraLitres)/P.bottleLitres);modal.planDraft.count=Math.max(1,Math.min(max,(modal.planDraft.count??1)+(a==='policy-count-more'?1:-1)));render();return;}
 if(a==='bottling-toggle'&&kind==='bottler-panel'&&D.bottlingStaffStatus(game).hired&&D.currentCask(game,id)){
  const r=D.bottlingReservation(game,id);if((!r||r.status==='completed')&&!D.commonBottlingPolicy(game)){modal.policyNoticeId=id;render();$('action-dialog').querySelector('.bottling-policy-notice')?.scrollIntoView({block:'nearest'});return;}
  act(s=>r?.status==='active'?D.pauseBottling(D.endTasting(s),id,true):r?.status==='paused'?D.pauseBottling(D.endTasting(s),id,false):D.delegateBottling(D.endTasting(s),id),()=>{modal.policyNoticeId=null;});return;
 }
 if(a==='bottling-cancel'&&kind==='bottler-panel'&&D.bottlingStaffStatus(game).hired&&D.bottlingReservation(game,id)){act(s=>D.cancelBottling(D.endTasting(s),id));return;}
 if(a==='staff-bottle-plan'&&kind==='bottler-panel'&&D.bottlingStaffStatus(game).hired&&D.currentCask(game,id)){modal={kind:'bottling-plan',id,staffContext:true};render();return;}
 if(a==='bottling-manual'&&['inspect','bottling-plan'].includes(kind)&&D.currentCask(game,id)){quoteModal(id);return;}
 if(a==='bottling-policy-edit'&&kind==='bottler-panel'){modal.editPolicy=true;render();return;}
 if(a==='bottling-staff-back'&&kind==='bottling-plan'){modal={kind:'bottler-panel'};render();return;}
 if(a==='bottling-policy-save'&&kind==='bottler-panel'){
  if(!validPlanDraft(modal.planDraft))return;const draft={...modal.planDraft},returnCaskId=modal.returnCaskId,displayDefaults=Object.fromEntries(['age','threshold'].filter(key=>Number.isInteger(draft[key])&&draft[key]>=0&&draft[key]<=(key==='age'?1200:999)).map(key=>[key,draft[key]])),plan=draft.mode==='age'?{mode:'age',age:draft.age,count:draft.count}:{mode:'stock',threshold:draft.threshold,count:draft.count};
  act(s=>D.setBottlingPolicy(s,plan,displayDefaults),()=>{modal=returnCaskId?{kind:'inspect',id:returnCaskId}:{kind:'bottler-panel'};message('保存しました');});return;
 }
 if(a==='bottling-delegate'&&['inspect','bottling-plan'].includes(kind)&&D.bottlingStaffStatus(game).hired&&D.currentCask(game,id)){
  if(!D.commonBottlingPolicy(game)){modal={kind:'bottler-panel',returnCaskId:id};render();return;}
  const staffContext=modal.staffContext;act(s=>D.delegateBottling(D.endTasting(s),id),()=>{warehouseRoom.select(id);modal=staffContext?{kind:'bottler-panel'}:{kind:'inspect',id};message('任せました');});return;
 }
 if(['bottling-pause','bottling-resume','bottling-cancel'].includes(a)&&kind==='bottling-plan'&&modal.staffContext){act(s=>a==='bottling-cancel'?D.cancelBottling(D.endTasting(s),id):D.pauseBottling(D.endTasting(s),id,a==='bottling-pause'),()=>{modal={kind:'bottler-panel'};message(a==='bottling-cancel'?LIVE_MESSAGE.reservationCancelled:a==='bottling-pause'?LIVE_MESSAGE.reservationPaused:LIVE_MESSAGE.reservationResumed);});return;}
 if(a==='stockist-open'&&kind==='stockists'&&knownStockists().some(s=>s.id===b.dataset.id)){deliveryNotice='';modal={kind:'stockist',shopId:b.dataset.id};render();return;}
 if(a==='stockists-back'&&kind==='stockist'){modal={kind:'stockists'};deliveryNotice='';render();return;}
 if(a==='stockist-back'&&kind==='stockist-delivery'){modal={kind:'stockist',shopId:modal.shopId};deliveryNotice='';render();return;}
 if(a==='stockist-product'&&kind==='stockist'&&stockistProducts(modal.shopId).some(x=>x.p.id===id&&x.q.ok)){modal=placementEnabled&&modal.shopId==='town-liquor'?{kind:'product',id}:{kind:'stockist-delivery',shopId:modal.shopId,id};deliveryNotice='';render();return;}
 if(a==='stockist-offer'&&kind==='stockist'&&game.shop.offer?.id===id&&game.shop.offer.shopId===modal.shopId){showShopOffer(null,{...modal});render();return;}
 if(a==='stockist-offer-back'&&kind==='shop-offer'&&modal.returnModal){modal=modal.returnModal;render();return;}
 if(a==='delivery-select'){
  const shopId=b.dataset.shopId;if(!['product','stockist-delivery'].includes(kind)||modal.id!==id||(kind==='product'?modal.destination!==shopId:modal.shopId!==shopId))return;
  const q=D.shopQuote(game,id,shopId),n=Number(b.dataset.count);if(!q.ok||!q.quantities.includes(n))return;
  modal.deliveryProductId=id;modal.deliveryShopId=shopId;modal.deliveryCount=n;deliveryNotice='';render();
  if(!pointerInteraction)queueMicrotask(()=>document.querySelector('[data-action="delivery-select"][data-count="'+n+'"]')?.focus({preventScroll:true}));return;
 }
 if(a==='market-retail-product'&&kind==='market-retail-info'&&game.core.products.some(p=>p.id===id)){selectedProductId=id;modal={kind:'product',id};render();return;}
 if(a==='settings-reset'&&['settings','aux-panel'].includes(kind)){$('reset').click();return;}
 if(a==='staff-back'&&kind==='staff-request'){closeComparison();return;}
 if(a==='staff-hire-request'&&kind==='staff-request'){act(s=>D.hireStaff(D.endTasting(s)),()=>message('採用しました'));return;}
 if(a==='staff-mode'&&kind==='staff-request'&&['once','three','continuous'].includes(b.dataset.id)&&game.staff.hired){modal.requestMode=b.dataset.id;render();return;}
 if(a==='staff-confirm'&&kind==='staff-request'&&staffCanRequest()){const sourceId=modal.caskId,mode=modal.requestMode;act(s=>sourceId===null?D.reserveUsual(D.endTasting(s),mode):D.reserveStaff(D.endTasting(s),sourceId,mode),()=>{modal=null;room='distill';message('依頼しました');});return;}

 if(a==='ledger-recipe-open'&&['ledger','recipes','ledger-cask'].includes(kind)&&recipeRows().some(r=>r.caskId===id)){openLedgerDetail('ledger-recipe',id,b.id);return;}
 if(a==='ledger-cask-open'&&(['ledger','ledger-recipe','ledger-cask','ledger-release'].includes(kind)&&caskData().casks.some(c=>c.caskId===id))){openLedgerDetail('ledger-cask',id,b.id);return;}
 if(a==='ledger-list-page'&&(kind==='ledger-shop'||kind==='ledger'&&modal.section==='shops')&&Number.isInteger(id)&&id>=0){modal.listPage=id;modal.openDetails=[];modal.scrollTop=0;render();$('dialog-body').scrollTop=0;return;}
 if(a==='ledger-source-compare'&&kind==='ledger-recipe'){const other=recipeRows().find(r=>r.caskId!==modal.caskId);if(other){const parent=rememberLedger();modal={kind:'ledger-recipe-comparison',caskId:parent.caskId,otherId:other.caskId,parent,returnFocusId:b.id};render();$('dialog-body').scrollTop=0;}return;}
 if(a==='ledger-recipe-request'&&kind==='ledger-recipe'){rememberLedger();openStaffRequest(modal.caskId);return;}
 if(a==='flavor-card'&&kind==='flavor-cards'){const cards=chooseManualCard(game,b.dataset.group,b.dataset.id);if(cards)act(x=>D.selectFlavorCards(x,cards));return;}
 if(a==='flavor-start'&&kind==='flavor-cards'){distillRoom.confirm(manualCards(game),game.core.lastDistillation);modal=null;render();schedule();return;}
 if(a==='market-rules-adopt'&&kind==='settings'){
  if(!preview&&!canSave)return;countdown.cancel();stopClock();const before=game;
  try{const next=D.enableMarketRules(before);if(!saveCandidate(next,userPaused,elapsed,commitMarketRulesUpdate)){render();return;}game=next;runtimeHalted=false;storageNotice('');marketUI.reset();render();schedule();}catch(error){storageNotice(error.message);render();}return;
 }
 if(a==='market-rules-export-before'&&kind==='settings'){const snapshot=D.preMarketRulesState(game);exportRaw(JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(snapshot)),userPaused:true,elapsed:0}),'ambertime-before-market-rules.json');return;}
 if(a==='market-export-before'&&kind==='settings'){const snapshot=D.preStoreMarketState(game);exportRaw(JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(snapshot)),userPaused:true,elapsed:0}),'ambertime-before-store-market.json');return;}
 if(a==='debug-skip'&&debugEnabled&&kind==='settings'){startDebugSkip(Number(b.dataset.id));return;}
 if(a==='debug-skip-stop'&&debugEnabled&&kind==='settings'){finishDebugSkip('中止しました。');return;}
 if(a==='debug-recall'&&debugEnabled&&kind==='settings'){recallSceneDebug?.open();return;}
 if(a==='connected-import'&&debugEnabled&&kind==='settings'){if(preview)return;$('restore-file').click();return;}
 if(a==='connected-export'&&debugEnabled&&kind==='settings'){exportRaw(lastSavedText??sessionText(game));return;}
 if(a==='ledger-cask-taste'&&kind==='ledger-cask'&&D.currentCask(game,id)){const parent=rememberLedger();stopClock();warehouseRoom.select(id);room='warehouse';act(s=>D.sampleDistillery(s,id),()=>{modal={kind:'inspect',id,ledgerParent:parent};});return;}
 if(a==='ledger-cask-compare'&&kind==='ledger-cask'&&D.currentCask(game,id)){rememberLedger();openCaskComparison(id);return;}
 if(a==='ledger-section'&&kind==='ledger'&&['recipes','aging','releases','shops'].includes(b.dataset.id)){modal.section=b.dataset.id;modal.listPage=0;modal.scrollTop=0;modal.openDetails=[];render();$('dialog-body').scrollTop=0;return;}
 if(a==='ledger-shop-open'&&kind==='ledger'&&modal.section==='shops'&&ledgerShops().some(s=>s.id===b.dataset.id)){modal={kind:'ledger-shop',shopId:b.dataset.id,listPage:0,parent:rememberLedger(),returnFocusId:b.id};render();$('dialog-body').scrollTop=0;return;}
 if(a==='feedback-release'&&kind==='ledger'){openFeedbackRelease(id);return;}
 if(a==='ledger-release'&&['product','ledger','comparison-brand-record','ledger-recipe','ledger-cask','ledger-shop'].includes(kind)){const entry=ledgerData().entries.find(x=>x.key===b.dataset.id);if(entry){modal={kind:'ledger-release',key:entry.key,parent:rememberLedger(),returnFocusId:b.id};render();$('dialog-body').scrollTop=0;}return;}
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
 if(a==='generation-recall'&&kind==='generation-review'&&generationState()?.id===id){openGenerationRecall();return;}
 if(a==='history-recall'&&['history','history-generation'].includes(kind)&&hasCompletedRecall(id)){openCompletedRecall(id);return;}
 if(a==='generation-history'&&kind==='generation-review'&&generationState()?.id===id){openHistory();return;}
 if(a==='history-release'&&kind==='history'&&game.releases.some(r=>r.productId===id)){modal={kind:'ledger-release',key:'release:'+game.releases.find(r=>r.productId===id).id,parent:rememberLedger(),returnFocusId:b.id};render();return;}
 if(a==='history-generation'&&kind==='history'&&historyData?.generations?.some(g=>g.id===id)){modal={kind:'history-generation',id,parent:rememberLedger(),returnFocusId:b.id};render();$('dialog-body').scrollTop=0;return;}
 if(a==='generation-continue'&&kind==='generation-notice'&&generationState()?.id===id){modal=null;room='distill';render();schedule();return;}
 if(a==='generation-handover'&&kind==='generation-review'&&generationState()?.id===id&&!recallPreview?.scenes.length){act(s=>D.handoverGeneration(s,id),()=>{modal=null;runtimeHalted=false;room='distill';message(generationName(generationState().id)+'へ引き継ぎました。');});return;}
 if(a==='history-year'&&kind==='history'){modal.year=modal.year===b.dataset.id?null:b.dataset.id;modal.page=0;render();return;}
 if(a==='history-brand'&&['history','history-shop'].includes(kind)){modal={kind:'history-brand',brandId:id,year:modal.year??null,page:modal.page??0,parent:modal.parent};render();return;}
 if(a==='history-shop'&&['history','history-brand'].includes(kind)){modal={kind:'history-shop',shopId:b.dataset.id,year:modal.year??null,page:modal.page??0,parent:modal.parent};render();return;}
 if(a==='history-back'&&['history-brand','history-shop'].includes(kind)){modal={kind:'history',year:modal.year??null,page:modal.page??0,parent:modal.parent};render();return;}

 if(['shop-accept','shop-decline','shop-later','shop-accept-deliver','shop-select-count'].includes(a)&&(kind!=='shop-offer'||modal.shopId!==b.dataset.shopId||modal.offerId!==Number(b.dataset.offerId)))return;
 if(a==='shop-accept'&&modal.shopId==='department')return;
 if(a==='shop-later'){if(kind==='shop-offer'){if(modal.returnModal){modal=modal.returnModal;render();}else closeModal();}return;}
 if(a==='shop-open-offer'){if(kind==='product'){showShopOffer(modal.id);render();schedule();}return;}
 if(a==='shop-accept'||a==='shop-decline'){if(kind==='shop-offer'){const target={...modal},startedBrandId=game.shop.offer?.brandId;act(s=>(a==='shop-accept'?D.acceptShop:D.declineShop)(s,target.shopId,target.offerId),()=>{modal=target.returnModal??(target.returnProductId!==null?{kind:'product',id:target.returnProductId}:null);room='sales';if(a==='shop-accept'&&['town-liquor','supermarket'].includes(target.shopId)){if(modal?.kind==='product')deliveryNotice='「'+LIVE_MESSAGE.shopGreeting+'」';else modal={kind:'stockist',shopId:target.shopId,greeting:true};message('');}else message(a==='shop-accept'?(target.shopId==='department'?'取扱いの相談を残しました。':shopName(target.shopId)+'で取扱いが始まりました。'):'今回は見送りました。');},()=>{if(a==='shop-accept'&&['town-liquor','supermarket'].includes(target.shopId)){if(modal?.kind==='product')Object.assign(modal,{greeting:true,startedShopId:target.shopId,startedBrandId});else if(modal?.kind==='stockist')modal.startedBrandId=startedBrandId;}});}return;}
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
 if(a==='fill'){if(kind!=='fill'||modal.fillType!==b.dataset.id||!P.casks[modal.fillType])return;commitFill(modal.fillType);return;}
 if(a==='price'){if(kind!=='product'||modal.id!==id)return;act(s=>D.setSalePrice(s,b.dataset.tier,id));return;}
 if(a==='list'){if(kind!=='product'||modal.id!==id||game.productsById[id]?.listed)return;act(s=>D.listBottles(s,id),()=>{room='sales';selectedProductId=id;modal=null;message('');});return;}
 if(['bottle-less','bottle-more','bottle-all'].includes(a)){
  if(kind!=='quote'||modal.id!==id||modal.committing)return;const q=bottleSelection(id);
  if(a==='bottle-all'){if(q.max<1||q.affordable<q.max)return;modal.bottleCount=q.max;}
  else {const count=q.choices[q.choices.indexOf(q.count)+(a==='bottle-less'?-1:1)];if(count===undefined)return;modal.bottleCount=count;}
  $('bottle-count').value=modal.bottleCount;updateBottleSelection();return;
 }
 if(a==='first-bottle-proceed'&&kind==='first-bottle-complete'){
  if(modal.productId!==id||room!=='sales')return;
  modal=null;render();schedule();return;
 }
 if(a==='bottle'){
  if(kind!=='quote'||modal.id!==id||modal.committing||D.needsBrandSetup(game)&&!modal.brandDraftConfirmed)return;const q=bottleSelection(id);if(!q.ok)return;const count=q.count,quoteState=modal;
  const firstBottle=D.needsBrandSetup(game),selection=firstBottle?{...firstBrandDraft()}:{brandId:1};
  quoteState.committing=true;updateBottleSelection();
  const ok=act(s=>D.bottleBranded(D.endTasting(s),id,selection,count),()=>{selectedProductId=game.result.productId;room='sales';modal=null;deliveryNotice='';message('');},()=>{
   if(firstBottle)modal={kind:'first-bottle-complete',brandId:game.brands[0].id,productId:selectedProductId};
   else if(!placementEnabled)modal={kind:'product',id:selectedProductId};
  });
  if(!ok&&modal===quoteState){quoteState.committing=false;updateBottleSelection();}return;
 }
}
function suspend(){scene.cancelDistillCompletion();marketUI.cancel();placementUI?.cancel();countdown.cancel();stopClock();if(manualDistilling())userPaused=true;save();if(game)render();}
function resume(){if(game){render();schedule();}}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(debugSkipJob)finishDebugSkip('タブが非表示になったため中断しました。');suspend();}else resume();});window.addEventListener('pagehide',()=>{if(debugSkipJob)finishDebugSkip('ページを離れたため中断しました。');suspend();});window.addEventListener('pageshow',e=>{if(e.persisted)resume();});
window.addEventListener('storage',e=>{if(!preview&&e.key===SAVE_KEY){saveFailure(Object.assign(Error('別の画面で保存が変わりました。'),{code:'conflict'}),'別タブ');if(game)render();}});
const sessionOptions={restore:D.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs};
function exportRaw(text,name='ambertime-save.json'){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function installSession(session,{fresh=false}={}){
 countdown.cancel();stopClock();game=session.game;caskSlots=session.caskSlots;recentLedger=session.recentLedger;historyRecord=session.historyRecord;pendingRecall=recallRecord=session.recallRecord;recallPreview=null;userPaused=session.userPaused;elapsed=session.elapsed;
 if(manualDistilling())userPaused=true;
 committedSession={...session,caskSlots:[...caskSlots]};canSave=!preview;runtimeHalted=false;lastSaveError=null;
 distillRoom.reset();scene.resetMotion();marketUI.reset();placementUI?.reset();marketEditing=false;feedbackComments.reset();staffDisplayKey=null;staffDisplay=null;
 automaticNews.reset();staffMigrationNotice=false;shownFillSpiritId=!fresh&&game.still.phase==='filling'?game.core.spirit?.id??null:null;modal=null;playbackRate=1;glassKey='';shelfPage=0;
 if(fresh){mapShown=0;mapAnnounced=0;mapPending=0;mapBrowse=null;try{mapUIStorage()?.removeItem(MAP_VIEW_KEY);}catch{}mapNoticeSave();}
 else mapNoticeLoad(true);
 warehouseRoom.select(game.tastingId??game.core.casks[0]?.id??null);room=warehouseRoom.selectedId!==null?'warehouse':'distill';
 $('game').hidden=false;$('recovery').hidden=true;storageNotice('');$('save-status').textContent=preview?'試遊中 · 保存しません':'保存済み';render();schedule();
}
function startNew(){
 if(!confirm(preview?'試遊を最初からやり直しますか？':'新しく始めますか？現在の記録は置き換わります。'))return false;
 try{
  const next=newNativeGame(),session={game:next,userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(next),recentLedger:initializeLedger(next),historyRecord:initializeHistoryRecord(next),recallRecord:initializeRecall(next)};
  const text=sessionText(next,false,0,session.caskSlots,session.recentLedger,session.historyRecord,session.recallRecord);
  if(!preview){if(legacyRecord&&localStorage.getItem(legacyRecord.key)!==legacyRecord.raw)throw Object.assign(Error('別の画面で保存が変わりました。'),{code:'conflict'});writeCandidate(localStorage,SAVE_KEY,lastSavedText,text);lastSavedText=text;legacyRecord=null;}
  installSession(session,{fresh:true});return true;
 }catch(error){saveFailure(error,'新規開始');return false;}
}
$('reset').addEventListener('click',startNew);
$('recovery-new').addEventListener('click',startNew);
$('recovery-export').addEventListener('click',()=>{const raw=lastSavedText??legacyRecord?.raw;if(raw!=null)exportRaw(raw);});
$('retry-save').addEventListener('click',()=>{if(!game||!isCurrentSession(lastSavedText)){boot();return;}canSave=true;if(save()){runtimeHalted=false;storageNotice('');$('recovery').hidden=true;}if(game){render();schedule();}});
$('recovery-import').addEventListener('click',()=>{if(debugEnabled)$('restore-file').click();});
async function importRecord(file){
 if(!file||preview||!debugEnabled)return false;const expected=lastSavedText;
 let session,text;
 try{session=readSession(await file.text(),{...sessionOptions,enabled:true});text=sessionText(session.game,session.userPaused,session.elapsed,session.caskSlots,session.recentLedger,session.historyRecord,session.recallRecord);}
 catch(error){recordSaveError(error,'ファイル検証');storageNotice('このファイルは読み込めません。現在の進行は変更していません。');return false;}
 if(!confirm('この記録を読み込みますか？現在の記録は置き換わります。'))return false;
 try{writeCandidate(localStorage,SAVE_KEY,expected,text);lastSavedText=text;installSession(session,{fresh:true});return true;}
 catch(error){saveFailure(error,'ファイル保存');return false;}
}
$('restore-file').addEventListener('change',async event=>{const file=event.target.files?.[0];event.target.value='';await importRecord(file);});
async function boot(){
 recallRecord=null;pendingRecall=null;recallPreview=null;historyRecord=null;historyData=null;historySnapshot=null;historyFactsSnapshot=null;recentLedger=null;committedSession=null;caskSlots=[null,null,null,null];distillRoom.reset();shownFillSpiritId=null;
 staffDisplayKey=null;staffDisplay=null;playbackRate=1;scene.resetMotion();
 if(preview){
  try{
   let next;if(query.get('market-fixture')==='established'){
    const response=await fetch('./tests/fixtures/placement-established-six.json');if(!response.ok)throw Error('試遊用の記録を開けません。');
    const fixture=await response.json();next=nativeModel.enableMarketRules(nativeModel.enableStoreMarket(nativeModel.enableStage4(nativeModel.restoreDistillery(fixture.raw))));
   }else next=newNativeGame();
   installSession({game:next,userPaused:query.get('market-fixture')==='established',elapsed:0,caskSlots:initializeCaskSlots(next),recentLedger:initializeLedger(next),historyRecord:query.get('market-fixture')==='established'?null:initializeHistoryRecord(next),recallRecord:query.get('market-fixture')==='established'?null:initializeRecall(next)},{fresh:true});
  }catch(error){game=null;saveFailure(error,'試遊開始');$('game').hidden=true;}return;
 }
 try{
  legacyRecord=null;lastSavedText=localStorage.getItem(SAVE_KEY);
  if(lastSavedText!==null){installSession(readSession(lastSavedText,{...sessionOptions,enabled:true}));return;}
  for(const key of ['sukimastock.ambertime.placement-trial.v1','sukimastock.ambertime.wholesale.v20']){const raw=localStorage.getItem(key);if(raw!==null){legacyRecord={key,raw};throw Object.assign(Error('以前の開発版の記録です。'),{code:'unsupported-version'});}}
  const next=newNativeGame(),session={game:next,userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(next),recentLedger:initializeLedger(next),historyRecord:initializeHistoryRecord(next),recallRecord:initializeRecall(next)};
  const text=sessionText(next,false,0,session.caskSlots,session.recentLedger,session.historyRecord,session.recallRecord);writeCandidate(localStorage,SAVE_KEY,null,text);lastSavedText=text;installSession(session,{fresh:true});
 }catch(error){
  game=null;recordSaveError(error,'起動');canSave=false;runtimeHalted=true;stopClock();$('game').hidden=true;recoveryAccess();$('save-status').textContent='未保存';
  storageNotice(error?.code==='unsupported-version'?'以前の開発版の記録です。新しく始めてください。':'この記録は開けません。新しく始めることができます。');
 }
}

window.amberPlacement={snapshot:()=>structuredClone(game),diagnostics:()=>({placement:true,saveKey:SAVE_KEY,clockPending:timer!==null,playbackRate,canSave,lastSaveError:debugEnabled?lastSaveError:null,caskSlots:[...caskSlots],saveVersion:isCurrentSession(lastSavedText)?DEVELOPMENT_SAVE_VERSION:null,ui:placementUI.diagnostics(),market:marketUI.diagnostics()} )};
const scene=new CanvasScene();
for(const [id,label] of [['distill-lever','レバーを下に引く'],['distill-glass','グラス']]){const node=document.createElement('button');node.type='button';node.id=id;node.className='distill-tool-hit';node.setAttribute('aria-label',label);node.setAttribute('aria-describedby','distill-tool-guide');scene.controlRoot.append(node);}
const guide=document.createElement('span');guide.id='distill-tool-guide';guide.className='sr-only';$('scene-access').append(guide);
const toolInput=new DistillToolInput({root:scene.root,lever:$('distill-lever'),glass:$('distill-glass'),read:()=>({...currentDistillTools(),glassTravel:TOOL_GEOMETRY.travel*scene.viewport.scale}),onChange:value=>scene.setToolGesture(value),onAction:kind=>{if(kind==='lever')startFromLever();else if(currentDistillTools().glassEnabled)finishDistillation();}});
function syncDistillTools(tools){
 toolInput.update(tools);const lever=$('distill-lever'),glass=$('distill-glass');
 lever.hidden=glass.hidden=room!=='distill';lever.disabled=!tools.leverEnabled;glass.disabled=!tools.glassEnabled;
 lever.setAttribute('aria-label',tools.leverDown?'レバー：下げた状態':'レバーを下に引く（キーボードは下キー2回、Enter）');
 glass.setAttribute('aria-label',tools.glassMode==='start'?'グラスで受ける':tools.glassMode==='stop'?'グラスを戻して採取を終える':'グラス');guide.textContent=tools.hint??'';
}
// Warm only after the settled scene has painted; ledger demand never waits for this.
boot();
if(debugEnabled&&query.get('recall-preview')==='1')queueMicrotask(()=>{if(game&&!modal)openModal('settings');recallSceneDebug?.open();});
