import {roomStaffAccess} from './staff-access-view.mjs?v=staff-access-s3-1';
import {staffEncounterMarkup} from './staff-encounter-view.mjs?v=hiring-s2-1';
import {createDialogueProjection,dialogueShopName} from './shop-dialogue.mjs?v=all-stores-s2-1';
import {dialogueMarkup,createDialogueNotice,installDialogueDismissal} from './shop-dialogue-view.mjs?v=all-stores-s2-1&fix=room-resume';
import {releasePackageArt} from './release-package.mjs?v=package-c1l-1';
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
import {readSession,serializeSession,isCurrentSession,writeCandidate,FORMAL_SAVE_KEY,DEVELOPMENT_SAVE_VERSION} from './development-save.mjs?v=bar-v01-1';
import {initializeHistoryRecord,advanceHistoryRecord,historyRecordView} from './history-record.mjs?v=s4-1';
import {NODES as HISTORY_REGIONS} from './town-connection.mjs?v=stage4-r2';
import {createMarketUI,commitMarketRulesUpdate} from './market-ui.mjs?v=sales-scroll-s1-1';
import {createM0Observation} from './m0-observation.mjs?v=m07-observe-r1';
import {createPlacementUI} from './placement-ui.mjs?v=visual14-r1&quantity=a3-1';
import {symbolMarkup} from './pixel-symbols.mjs?v=rooms-stage2-r1';
import {createFeedbackComments,recentCustomerFeedback,commentExcerpt,caskFeedback,warehouseFeedback,warehouseFeedbackPreview} from './flavor-feedback-view.mjs?v=reactions-s1-1&rooms=stage3-r1&status=1&aging=1';
import {shopRelationshipLabel,shopOrderMarkup} from './shop-order-view.mjs?v=formal-copy-r1';
import {RuntimeClock} from './runtime-clock.mjs?v=0.25.1';
import {caskDetailProfile} from './cask-detail-view.mjs?v=formal-copy-r1&rooms=stage3-r1&aging=1';
import {StartCountdown} from './start-countdown.mjs?v=native-timer-r2';
import {mapProgress,mapStep,drawGameMap,newlyUnlocked,mapIntroduction,mapNoticeBaseline,STAGES as MAP_STAGES} from './world-map-view.mjs?v=0.28.0-map';
import {mapSalesProjection} from './map-sales-view.mjs?v=bar-v01-1';
import {dailyMapProjection,normalizeMapView,loadMapView,saveMapView} from './map-daily-view.mjs?v=bar-v01-1';
import {BREWING_CARDS,brewingCardsMarkup,renderBrewingIcons,manualCards,chooseManualCard,brewingPanelState} from './brewing-cards.mjs?v=confirmed-brewing-r1';
import {playerMilestones} from './player-news.mjs?v=0.25.4';
import {flavorSummary} from './lab-flavor.mjs?v=stage4-r2';
import {buildShopLedger} from './shop-ledger.mjs?v=bar-v01-1';
import {buildReleaseLedger} from './ledger-view.mjs?v=0.63-ledger';
import {IDENTITY_BOTTLES,IDENTITY_LABELS,identityDefaults,brandNameError,releasePriceTier} from './brand-identity.mjs?v=0.58-first-brand';
import {firstBrandEditor,firstBottleCompletion} from './first-bottle-view.mjs?v=package-c1l-1';
import {extractionMaximum,bottleChoices,defaultBottleCount,releaseLabel} from './ui-details.mjs?v=stage4-r2';
import {shopRemark} from './shop-remarks.mjs?v=0.51-shop-remarks';
import {automaticEvents,scopedNotices} from './event-notices.mjs?v=reactions-s1-1';
import {CanvasScene} from './canvas-scene.mjs?a6=1&s1=1&tools=rooms-stage3-r1&touch=1&status=1&v=market-rules-r1&daily=1&aging=1&geometry=r2-1&completion=a13-1';
import * as nativeModel from './partner-orders.mjs?v=all-stores-s2-1';
import {createObservedModel} from './recall/operations.mjs?v=bar-v01-1';
import {DEBUG_SKIP_YEARS,monthsForDebugSkip,debugSkipMonth} from './recall/debug-time-skip.mjs?v=debug-years-1';
import {createRecallPlayer as createRecallDebugPreview} from './recall/player.mjs?v=h4-2-1';
import {sceneViews as playbackScenes} from './recall/pixel-scene.mjs?v=h4-2-1';
import {initializeRecall,advanceRecall,prepareRecall,readCompletedRecalls} from './recall/collector.mjs?v=bar-v01-1';
let recallRecord=null,pendingRecall=null,recallPreview=null;
const D=createObservedModel(nativeModel,({before,after,operation})=>{
 if(!pendingRecall)return;
 const prepared=operation.key==='generation-handover'?(recallPreview??prepareRecall(pendingRecall,before,before.operations.length)):undefined;
 pendingRecall=advanceRecall(before,after,pendingRecall,{prepared});
 recallPreview=null;
});
import {SHOPS} from './shop-model.mjs?v=bar-v01-1';
import {initializeCaskSlots,reconcileCaskSlots,caskSlotMap} from './cask-slots.mjs?v=s1-1';
import {distillationReadout,spiritProfile} from './spirit-view.mjs?v=distill-ui-r1';
import {spiritReadoutView} from './spirit-readout-view.mjs?v=refactor-r1-1&fix=fill-modal-only';
import {brandStats,brandReputation} from './brand-reputation.mjs?v=0.15';
import {PARALLEL_PARAMETERS as T,ECONOMY_PARAMETERS as P} from './economy-parameters.mjs?v=0.7';
import {ageLabel,monthLabel} from './model.mjs?v=stage4-r2';
import {barrel} from './cask-glass-art.mjs?v=0.58-first-brand';
import {glass,bottleArt,brandArt,stillArt} from './room-object-art.mjs?v=0.62-bottle-shelf-wall';
import {shortTaste,shortChange} from './tasting-view.mjs?v=stage4-r2';
import {flavorTypeView as sourceFlavorTypeView} from './flavor-types.mjs?v=stage4-r2';
import {FLAVOR_AXES as sourceFlavorAxes,flavorMeter as sourceFlavorMeter} from './flavor-view.mjs?v=formal-copy-r1';
import {nearbyCasks,previousRelease,releasePair,sourceDetails} from './nearby-comparison.mjs?v=all-stores-s2-1';
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
const newNativeGame=()=>D.newShopDialogueDistillery(seed);
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
const automaticNews=scopedNotices({room:()=>room,safe:()=>!!game&&!modal&&!document.hidden&&!runtimeHalted&&(preview||canSave)&&$('storage-notice').hidden&&$('generation-notice').hidden,show:text=>{$('automatic-news').setAttribute('aria-label',text+' 閉じる');$('automatic-news').textContent=text;$('automatic-news').hidden=false;},hide:()=>{$('automatic-news').hidden=true;$('automatic-news').textContent='';}});
// Keep transient notices above the body-mounted sales board.
document.body.append($('automatic-news'),$('market-action-status'));
const dialogueProjection=createDialogueProjection();
const dialogueElement=document.createElement('aside');dialogueElement.id='shop-dialogue-notice';dialogueElement.hidden=true;dialogueElement.setAttribute('role','button');dialogueElement.tabIndex=0;dialogueElement.setAttribute('aria-label','店主の一言を閉じる');dialogueElement.setAttribute('aria-live','polite');document.body.append(dialogueElement);
const dialogueNotice=createDialogueNotice({
 inRoom:()=>room==='sales',
 show:entry=>{dialogueElement.innerHTML=dialogueMarkup(entry,committedSession?.game??game,{heading:true});dialogueElement.dataset.text=entry.text;dialogueElement.setAttribute('aria-label',`${dialogueShopName(entry.shopId)}。${entry.text} 閉じる`);dialogueElement.hidden=false;scene.positionDialogue();},
 hide:()=>{dialogueElement.hidden=true;dialogueElement.innerHTML='';},
 safe:entry=>!!game&&(preview||canSave)&&!document.hidden&&!modal&&!runtimeHalted&&!marketEditing&&!countdown.active&&game.still.phase==='ready'&&game.tastingId===null&&!game.decisions.length&&generationState()?.phase!=='review'&&generationState()?.phase!=='handover'&&!debugSkipJob&&$('automatic-news').hidden&&$('storage-notice').hidden&&!$('scene-notice').textContent.trim()&&!!scene.dialogueLayout(entry)
});
installDialogueDismissal(dialogueElement,()=>dialogueNotice.dismiss());
$('automatic-news').setAttribute('role','button');$('automatic-news').tabIndex=0;$('automatic-news').setAttribute('aria-label','知らせを閉じる');
installDialogueDismissal($('automatic-news'),()=>automaticNews.clear());
document.addEventListener('visibilitychange',()=>{automaticNews.update();dialogueNotice.update();});
window.addEventListener('resize',()=>requestAnimationFrame(()=>dialogueNotice.update()));
dialogueElement.addEventListener('dialogue-layout-blocked',()=>dialogueNotice.update());
// Some market warnings do not render the game; react to priority DOM changes too.
for(const id of ['automatic-news','storage-notice','scene-notice'])new MutationObserver(()=>dialogueNotice.update()).observe($(id),{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});
function noteDialogueCommit(before,next){if(before&&next.core.month>before.core.month)dialogueNotice.commit(before,next,dialogueProjection.read(next));}
function latestDialogueMarkup(shopId){return room==='sales'?dialogueMarkup(dialogueProjection.read(game,shopId),game):'';}

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
 stopClock();modal={kind:'staff-opportunity',job:opportunity.kind,returnModal,noticePending:true};return true;
}
function acknowledgeStaffOpportunity(){
 const target=modal;
 if(target?.kind!=='staff-opportunity'||!target.noticePending||document.hidden||!$('action-dialog').open)return;
 try{
  const next=D.noticeStaffOpportunity(game,target.job);
  if(!saveCandidate(next))return;
  game=next;target.noticePending=false;
 }catch(e){runtimeHalted=true;storageNotice(e.message);}
}
function openRoomStaff(){
 if(!game||modal||(!preview&&!canSave))return;
 const access=roomStaffAccess(room,{distill:D.staffStatus(game),bottling:D.bottlingStaffStatus(game)});
 if(!access)return;
 countdown.cancel();stopClock();deliveryNotice='';
 modal=access.kind==='staff-opportunity'?{kind:access.kind,job:access.job,source:'room',returnModal:null,noticePending:D.staffOpportunities(game).some(o=>o.kind===access.job)}:{kind:access.kind};
 render();
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
 out+='<details class="comparison-supplement"><summary>詳細</summary>'+compareFact('抽出位置',...pair.map(c=>finiteText(c.stopAt,n=>n+' / '+extractionMaximum)))+compareFact('仕込み',...pair.map(c=>finiteText(c.filledMonth,monthLabel)))+compareFact('残量',...pair.map(c=>finiteText(c.litres,n=>n.toFixed(1)+' L')))+'</details>';
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
 if(modal.error)return '<p role="status">'+esc(modal.error)+'</p>';if(!modal.pair)return '<p role="status">'+LIVE_MESSAGE.salesLoading+'</p>';
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
function recipeSourceView(){const item=sourceDetails(game,modal.caskId);if(!item)return '<p>元の記録はありません。</p>';return '<div class="nearby-source"><span class="nearby-art">'+(item.kind==='cask'||item.kind==='source'&&item.productId===null?barrel(item.type):releaseArt(item.productId,item.profile?.wood??0,item.brandId))+'</span><h3>'+esc(item.brandName??pastCaskName(item.caskId,item))+'</h3><p>'+copyFacts([['たる',caskType(item)],['抽出',finiteText(item.stopAt,n=>n+' / '+extractionMaximum)]])+'</p><details><summary>元の記録</summary><p>'+pastCaskName(item.caskId,item)+'<br>'+finiteText(item.filledMonth,monthLabel)+'仕込み'+(item.productId!=null?'<br>'+releaseTag(item.productId):'')+(item.generationId?'<br>'+generationName(item.generationId):'')+'</p></details>'+comparisonSourceActions(item)+(item.commissionedFrom?'<p>'+button('依頼元の記録','recipe-source',item.commissionedFrom.caskId)+'</p>':'')+'</div>';}
function recipesView(){return ledgerRecipeList();}

function recipeAction(fn){const halted=runtimeHalted;if(act(fn))runtimeHalted=halted;}

const historyYears=()=>[...new Set((historyData?.events??[]).map(e=>monthLabel(e.month).split('年')[0]))];
function historyEventText(e){
 const region=HISTORY_REGIONS.find(r=>r.id===e.regionId)?.name??e.regionId;
 if(e.kind==='generation-start')return '蒸留所を始めた。';
 if(e.kind==='generation-handover')return generationName(e.nextGeneration)+'へ蒸留所を引き継いだ。';
 if(e.kind==='distillation')return '初めての蒸留を終えた。';
 if(e.kind==='bottling')return (e.firstRelease?'初めてのウイスキー':(e.brandName||'ウイスキー'))+'を発売した。'+ageLabel(e.age)+' · '+e.count+'本'+(e.longestAge&&!e.firstRelease?' · 最長熟成':'');
 if(e.kind==='shop-start')return shopName(e.shopId)+'で取扱いが始まった。';
 if(e.kind==='shop-anniversary')return shopName(e.shopId)+'への納品が'+e.years+'年にわたった。';
 if(e.kind==='region-reached')return region+'へ初めて評判が届いた。';
 if(e.kind==='inquiry')return region+'から'+(e.first?'初めて':'久しぶりに')+'問い合わせが届いた。';
 if(e.kind==='visit')return region+'から'+(e.first?'初めて':'久しぶりに')+'訪問があった。';
 if(e.kind==='department-adoption')return (e.projectName??'特選ウイスキー')+'に採用された。';
 if(e.kind==='special-order-fulfilled')return '特別注文の酒を届けた。';
 return '記録';
}
function historyView(){
 const waiting=historyWaiting();if(waiting)return waiting;
 if(!historyData)return '';
 const months=historyData.elapsedMonths,years=historyYears(),selected=modal.year;
 let out='<p class="history-elapsed">'+Math.floor(months/12)+'年'+(months%12)+'か月</p>';
 if(historyData.coverage?.notes?.length)out+='<p class="quiet history-coverage">'+historyData.coverage.notes.map(esc).join('<br>')+'</p>';
 out+=(historyData.generations??[]).filter(g=>g.completed).map(g=>'<p>'+button(generationName(g.id),'history-generation',g.id,'id="history-generation-'+g.id+'"')+(hasCompletedRecall(g.id)?button('回想','history-recall',g.id):'')+'</p>').join('');
 if(!years.length)return out+'<p>記録なし</p>';
 out+='<div class="history-years">'+years.map(y=>'<section class="history-year"><h3>'+button(y+'年','history-year',y,'aria-expanded="'+(selected===y)+'"')+'</h3>'+(selected===y?historyYearEvents(y):'')+'</section>').join('')+'</div>';
 return out;
}
function historyYearEvents(year){
 const events=historyData.events.filter(e=>monthLabel(e.month).split('年')[0]===year);
 return '<ol class="history-events">'+events.map(e=>'<li data-history-event="'+esc(e.id)+'"><time>'+monthLabel(e.month)+' · '+generationName(e.generationNumber)+'</time><p>'+esc(historyEventText(e))+'</p><div class="history-links">'+(e.productId!=null?button('発売','history-release',e.productId):'')+(e.shopId?button('取扱店','history-shop',e.shopId):'')+'</div></li>').join('')+'</ol>';
}
function historyBrandView(brandId){
 const brand=game.brands.find(b=>b.id===brandId);if(!brand)return '<p>ブランドの記録なし</p>';
 return '<div class="brand-history-art">'+brandDisplay(brand)+'</div>'+game.releases.filter(r=>r.brandId===brandId).map(r=>'<p class="package-history-row"><span aria-hidden="true">'+releaseArt(r.productId)+'</span>'+releaseTag(r.productId)+' · '+ageLabel(r.age)+' · '+r.bottles+'本</p>').join('')+(historyData?.events??[]).filter(e=>e.brandId===brandId&&e.kind==='department-adoption').map(e=>'<p>'+monthLabel(e.month)+' · '+esc(e.projectName??'特選ウイスキー')+'に採用'+(e.productId!==undefined?' · '+releaseTag(e.productId):'')+'</p>').join('')+(historyData?.shops??[]).filter(r=>r.brandId===brandId).map(r=>'<p>'+button(shopName(r.shopId)+'の記録','history-shop',r.shopId)+'</p>').join('');
}
function historyShopView(shopId){
 const rows=(historyData?.shops??[]).filter(r=>r.shopId===shopId);
 return rows.length?rows.map(r=>'<article class="history-shop-brand"><h3>'+esc(r.brandName??'ブランド')+'</h3>'+(Number.isInteger(r.startedMonth)?'<p>取扱い開始 '+monthLabel(r.startedMonth)+'</p>':'')+'<p>納品 '+r.deliveries+'回 · '+r.bottles+'本 · '+unit(r.revenue)+'</p>'+(Number.isInteger(r.firstDeliveryMonth)?'<p>初回納品 '+monthLabel(r.firstDeliveryMonth)+'</p>':'')+(Number.isInteger(r.lastDeliveryMonth)?'<p>最終納品 '+monthLabel(r.lastDeliveryMonth)+'</p>':'')+button('記録','history-brand',r.brandId)+'</article>').join(''):'<p>納品なし</p>';
}
const generationName=id=>id===1?'初代':({2:'二代',3:'三代',4:'四代',5:'五代',6:'六代',7:'七代',8:'八代',9:'九代',10:'十代'}[id]??id+'代');
const generationState=()=>game?D.generationStatus(game):null;
const hasCompletedRecall=id=>!!recallRecord?.completed?.some(r=>r.generation===id&&Array.isArray(r.scenes)&&r.scenes.length>0);
function openCompletedRecall(id){
 if(!hasCompletedRecall(id))return false;
 try{
  const edition=readCompletedRecalls(recallRecord,id);
  if(!edition)return false;
  recallScenePlayer.open({scenes:playbackScenes(edition),mode:'history',title:generationName(id)+'の回想'});
  return true;
 }catch(error){storageNotice(error.message);return false;}
}
function openGenerationRecall(){
 const g=generationState();
 if(!game||g?.phase!=='review'||modal?.kind!=='generation-review'||modal.id!==g.id)return false;
 try{
  recallPreview??=prepareRecall(pendingRecall,game,game.operations.length);
  const scenes=playbackScenes(recallPreview);
  if(!scenes.length)return false;
  stopClock();
  recallScenePlayer.open({scenes,mode:'handover',title:generationName(g.id)+'の回想',onComplete:()=>{
   if(generationState()?.phase!=='review'||generationState()?.id!==g.id)return false;
   return act(s=>D.handoverGeneration(s,g.id),()=>{modal=null;runtimeHalted=false;room='distill';message(generationName(generationState().id)+'へ引き継ぎました。');});
  }});
  return true;
 }catch(error){storageNotice(error.message);return false;}
}
function provenanceLabel(caskId){const g=D.finalBatchProvenance(game,caskId);return g?generationName(g.id)+'の最後の仕込み':'';}
const provenanceTag=caskId=>{const label=provenanceLabel(caskId);return label?'<small class="generation-provenance">'+esc(label)+'</small>':'';};
function showGeneration(){
 const g=generationState();if(!g||g.phase==='working'||g.phase==='last-batch'&&!g.needsNotice)return false;
 if(g.phase==='last-batch'&&game.still.phase!=='ready')return false;
 stopClock();const before=game;
 try{if(g.needsNotice){game=D.noticeGeneration(game,g.id);if(!save())return false;}if(g.phase==='review'&&pendingRecall)recallPreview=prepareRecall(pendingRecall,game,game.operations.length);modal={kind:g.phase==='review'?'generation-review':'generation-notice',id:g.id};
  if(g.phase==='review'&&recallPreview?.scenes.length){const expectedGame=game;queueMicrotask(()=>{if(game===expectedGame&&modal?.kind==='generation-review'&&modal.id===g.id&&!recallScenePlayer.isOpen())openGenerationRecall();});}
  return true;}
 catch(e){saveFailure(e,'回想準備');return false;}
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
function generationReview(g){return generationSummaryView(g.id);}
function generationSummaryView(id){
 const waiting=historyWaiting();if(waiting)return waiting;
 const g=historyData?.generations?.find(g=>g.id===id);if(!g)return '<p>記録なし</p>';
 const count=(n,suffix)=>Number.isFinite(n)&&(g.coverage.complete||n>0)?n+suffix+(g.coverage.complete?'':'以上'):'不明';
 let out='<article class="generation-summary"><p>'+esc(known(g.startedMonth,monthLabel))+'〜'+esc(known(g.endedMonth??game.core.month,monthLabel))+'</p>';
 if(!g.coverage.complete)out+='<p class="quiet">記録の残る範囲'+(Number.isFinite(g.coverage.fromMonth)?' · '+esc(monthLabel(g.coverage.fromMonth))+'から':'')+'</p>';
 out+=copyFacts([['仕込み',count(g.totals.filled,'たる')],['ビン詰め',count(g.totals.bottled,'本')],['販売',count(g.totals.sold,'本')]]);
 for(const e of g.events??[]){const label=e.kind==='shop-start'?'取扱開始':e.kind==='department-adoption'?'特別取扱い':'初の長期熟成',detail=e.kind==='mature-bottling'?ageLabel(e.age)+'でビン詰め':shopName(e.shopId??'department');out+='<p>'+esc(known(e.month,monthLabel))+' · '+esc(label)+'<br>'+esc(detail)+'</p>';}
 const last=g.lastStatus==='filled'?((g.lastCaskId!==null?pastCaskName(g.lastCaskId)+' · ':'')+'たる詰め済み'):g.lastStatus==='unfinished'?'未完成の原酒を引きつぎ':g.lastStatus==='not-made'?'見送り':'状態の記録なし';
 out+='<p>最後の仕込み<br>'+esc(last)+'</p>'+copyFacts([['引きつぎ',known(g.estate.casks,n=>n+'たる')],['資金',known(g.estate.cash,unit)]]);
 return out+'</article>';
}
const releaseFor=id=>game.releases.find(r=>r.productId===id);
const releaseTag=id=>{const r=releaseFor(id);if(!r)return '発売日不明';const same=game.releases.filter(x=>x.bottledMonth===r.bottledMonth);return monthLabel(r.bottledMonth)+(same.length>1?' · 第'+r.id+'回':'');};
const releaseSource=id=>{const r=releaseFor(id);return r?pastCaskName(r.caskId)+' · '+ageLabel(r.age):'';};
const brandFor=id=>game.brands.find(b=>b.id===releaseFor(id)?.brandId);
const releaseArt=(id,wood=0,brandId=null,snapshot=null)=>releasePackageArt(game,id,{brandId,snapshot});
const productArt=p=>releaseArt(p.id,p.wood);
const brandDisplay=brand=>{const release=game.releases.findLast(r=>r.brandId===brand.id);return release?brandArt(0,brand,releasePriceTier(game,release.productId)):'';};

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
const ledgerCask=e=>Number.isFinite(e.caskId)?pastCaskName(e.caskId,e):'元のたる 記録なし';
function releaseRow(e){return '<button type="button" class="ledger-release-row" id="ledger-'+esc(e.key)+'" data-action="ledger-release" data-id="'+esc(e.key)+'"><span class="ledger-bottle">'+releaseArt(e.productId,e.profile?.wood??0,e.brandId,e.profile)+'</span><span>'+esc(known(e.date,monthLabel))+(e.releaseId!==null?' · #'+e.releaseId:'')+'<br>'+esc(ledgerCask(e))+' · '+known(e.bottles,n=>n+'本')+'<br>'+esc(comparisonStatus(e))+'</span></button>';}
function brandComparisonRecordView(id){return '<div class="ledger-release-list">'+ledgerData().entries.filter(e=>e.brandId===id).slice().reverse().map(releaseRow).join('')+'</div>';}
function legacyTradeHistory(){
 const rows=game.trade?.history??[];if(!rows.length)return '';
 const labels={offered:'申し出',accepted:'取引開始',declined:'見送り',assigned:'出荷予約',shipped:'卸売出荷',cancelled:'予約取消',completed:'取引完了'};
 return '<details class="ledger-category"><summary>以前の卸取引</summary>'+rows.map(h=>'<p>'+esc(known(h.month,monthLabel))+' '+esc(labels[h.kind]??h.kind)+'<br>'+esc(h.partner??'')+(Number.isFinite(h.caskId)?'<br>'+esc(pastCaskName(h.caskId)):'')+(Number.isFinite(h.bottles)?'<br>'+h.bottles+'本':'')+(Number.isFinite(h.net)?'<br>入金 '+money(h.net):Number.isFinite(h.revenue)?'<br>入金 '+money(h.revenue):'')+'</p>').join('')+'</details>';
}
function connectedProfile(source,showName=true){const rows=flavorSummary(source);if(!rows)return '';const history=source.flavor.history,previous=history.length>1?history.at(-2).label:null;return (showName?flavorTypeView(source):'')+rows.map(({key,label})=>'<section class="tasting-flavor"><h3>'+esc(uiText(label))+'</h3>'+flavorMeter(source,key)+'</section>').join('')+(showName&&previous?'<p class="quiet">前：'+esc(previous)+'</p>':'');}
function connectedTownView(){
 if(!D.stage4Mode(game))return '';
 const events=[...playerMilestones(game),...feedbackComments.read(game)].sort((a,b)=>a.month-b.month).slice(-8);
 return '<details class="town-news"><summary>街での出来事</summary>'+(events.length?events.reverse().map(e=>'<p>'+esc(monthLabel(e.month))+' · '+esc(e.text)+'</p>'+(Number.isInteger(e.releaseId)?button('発売','feedback-release',e.releaseId):'')).join(''):'<p>主な出来事があれば、ここに残ります。</p>')+'</details>';
}
function ledgerView(){
 const section=modal.section,nav='<nav class="ledger-sections" aria-label="帳面の分類">'+[['recipes','仕込み'],['aging','たる'],['releases','発売'],['shops','取扱店']].map(([id,label])=>button(label,'ledger-section',id,'id="ledger-section-'+id+'" aria-pressed="'+(section===id)+'"')).join('')+'</nav>';
 let body='';
 if(section==='recipes')body=ledgerRecipeList()+(D.staffStatus(game).hired?button('任せる','ledger-request'):'');
 else if(section==='aging')body=ledgerCaskList();
 else if(section==='releases'){
 const data=ledgerData();body=data.brands.map(b=>'<div class="brand-readout">'+brandDisplay(b)+'<span>'+esc(b.name)+'<br>'+esc((IDENTITY_BOTTLES.find(x=>x.id===b.bottle)?.name??'丸ビン').replace('ビン',''))+' · '+esc(IDENTITY_LABELS.find(x=>x.id===b.label)?.name??'ホワイト')+'</span></div><details><summary>実績</summary>'+brandSummary(b.id)+'</details>').join('');
 body+=data.entries.length?'<div class="ledger-release-list">'+data.entries.slice().reverse().map(releaseRow).join('')+'</div>':'<p>記録なし</p>';
 }else if(section==='shops'){body=ledgerShopList()+legacyTradeHistory()+connectedTownView();}
 else body='<div class="ledger-totals"><p>売上累計 '+money(game.core.totals.revenue)+'</p><p>維持費累計 '+money(game.core.totals.upkeep)+'</p></div>';
 return nav+body+'<p>'+button('歩み','ledger-history')+'</p>';
}
let shopLedgerSnapshot=null,shopLedgerProjection=null;
function ledgerShops(){if(shopLedgerSnapshot!==game){shopLedgerProjection=buildShopLedger(game);shopLedgerSnapshot=game;}return shopLedgerProjection.filter(s=>s.established);}
const shopStartLabel=s=>s.id==='department'?'関係開始':'取扱開始';
const shopProgress=s=>s.interests.map(i=>i.status==='pending'?'承認・翌月納品待ち':'相談中').join('／');
function ledgerShopList(){if(!ledgerShops().length)return '<p>取扱店なし</p>';return ledgerPaged(ledgerShops(),s=>'<button type="button" class="ledger-release-row" id="ledger-shop-'+esc(s.id)+'" data-action="ledger-shop-open" data-id="'+esc(s.id)+'"><span>'+esc(s.name)+'<br>'+esc(s.related?shopStartLabel(s)+' '+known(s.startedMonth,monthLabel):s.deliveries.length?'開始日不明':'未取扱い')+(s.deliveries.length?'<br>納品 '+esc(known(s.count,n=>n+'本'))+' · 直近 '+esc(known(s.lastMonth,monthLabel)):'')+(shopProgress(s)?'<br>'+esc(shopProgress(s)):'')+'</span></button>');}
function ledgerShopDetail(){
 const s=ledgerShops().find(s=>s.id===modal.shopId);if(!s)return '<p>記録なし</p>';
 let out='<article class="ledger-shop-detail"><h3>'+esc(s.name)+'</h3>'+copyFacts([[shopStartLabel(s),s.related?known(s.startedMonth,monthLabel):s.deliveries.length?'記録なし':'未取扱い'],...(s.deliveries.length?[["納品計",known(s.count,n=>n+'本')],['入金',known(s.revenue,unit)],['初回納品',known(s.firstMonth,monthLabel)],['直近納品',known(s.lastMonth,monthLabel)]]:[])]);
 if(s.id==='department')out+='<p class="quiet">関係開始は相談受付の月。</p>'+s.interests.map(i=>'<p>'+(i.status==='pending'?'承認・翌月納品待ち<br>'+esc(known(i.approvedMonth,monthLabel))+' 承認 · '+esc(known(i.dueMonth,monthLabel))+' 納品予定':'相談中')+'</p>').join('');
 out+=s.deliveries.length?ledgerPaged(s.deliveries,d=>'<details class="shop-history"><summary>'+esc(known(d.month,monthLabel))+' · '+esc(known(d.count,n=>n+'本'))+(d.kind==='adoption'?' · 特選納品':' · 納品')+'</summary><p>'+esc(d.kind==='adoption'?(d.projectName??'特選ウイスキー')+'に採用・納品':'納品')+'<br>入金 '+esc(known(d.revenue,unit))+'</p>'+(d.releaseKey?button('発売'+(d.releaseId!==null?' #'+d.releaseId:''),'ledger-release',d.releaseKey,'id="ledger-delivery-'+esc(d.key)+'"'):'<p class="quiet">発売の記録なし</p>')+'</details>'):'<p>実納品の記録なし</p>';
 return out+'</article>';
}
function ledgerReleaseView(){
 const e=ledgerData().entries.find(e=>e.key===modal.key);if(!e)return '<p>記録なし</p>';const record=e.record,b=game.brands.find(b=>b.id===e.brandId);
 const comments=feedbackComments.read(game).filter(x=>x.releaseId===e.releaseId).slice(-1);
 let out='<article class="ledger-release-detail"><span class="release-bottle">'+releaseArt(e.productId,e.profile?.wood??0,e.brandId,e.profile)+'</span><h3>'+esc(known(e.date,monthLabel))+'</h3><p>'+esc(b?.name??e.name??'記録なし')+'</p>'+copyFacts([['元のたる',ledgerCask(e)],['瓶詰め時',known(e.age,ageLabel)],['瓶詰め',known(e.bottles,n=>n+'本')],['在庫',known(e.stock,n=>n+'本')],['価格',known(e.price,n=>unit(n)+'／本')],['自家販売',known(e.retail.count,n=>n+'本')],['売上',known(e.retail.revenue,money)],[e.deliveryComplete?'取扱店へ納品':'確認できた納品',known(e.deliveries.count,n=>n+'本')],[e.deliveryComplete?'入金':'確認できた入金',known(e.deliveries.revenue,money)]])+'<p>'+esc(comparisonStatus(e))+'</p>'+(e.profile?flavorTypeView(e.profile):'<p>風味 記録なし</p>');
 if(comments.length)out='<section class="release-comments" aria-label="客の感想">'+comments.map(x=>'<p class="quiet">'+esc(monthLabel(x.month))+'</p><p>'+esc(x.text)+'</p>').join('')+'</section>'+out;
 if(e.wholesale)out+='<p>卸売出荷 '+esc(e.wholesale.partner??'')+'</p>'+copyFacts([['出荷',known(e.wholesale.count,n=>n+'本')],['入金',known(e.wholesale.revenue,money)]]);
 if(Number.isFinite(e.caskId)&&caskEntry(e.caskId))out+=button('元のたる','ledger-cask-open',e.caskId);
 const release=game.releases.find(r=>r.id===e.releaseId);out+=releaseComparisonButton(release);
 if(record){out+='<details><summary>試飲・熟成</summary>'+provenanceTag(e.caskId)+recordText(record.description)+(record.taste??[]).filter(text=>!(record.samples??[]).some(s=>s.text?.includes(text))).map(recordText).join('')+recordTimeline(record.samples,record.observations,record.choices)+recordText(({'fulfilled':'特別注文達成','unmet-retail':'特別注文から自分で販売','unmet-wholesale':'特別注文から通常卸売'})[record.order?.outcome])+'</details>';}
 else out+='<p class="quiet">試飲の記録なし</p>';
 return out+'</article>';
}

// Normal ledger views use only bounded committed facts and current inventory.
let recentLedger=null,caskSnapshot=null,caskProjection=null,caskFactsSnapshot=null;
function caskData(){
 if(caskSnapshot!==game||caskFactsSnapshot!==recentLedger){
  caskProjection=recentLedgerView(game,recentLedger);caskSnapshot=game;caskFactsSnapshot=recentLedger;
 }
 return caskProjection;
}
function caskLoadingView(){return null;}

function recipeRows(){
 const recipes=caskData().recipes,rows=new Map();
 for(const r of [...(recipes.recent??recipes.unsaved),...recipes.saved]){if(!Number.isFinite(r.caskId))continue;const existing=rows.get(r.caskId);if(existing){if(r.saved&&!existing.savedRecipes.some(x=>x.id===r.id))existing.savedRecipes.push(r);continue;}rows.set(r.caskId,{...r,savedRecipes:r.saved?[r]:[]});}
 return [...rows.values()].sort((a,b)=>(b.filledMonth??-1)-(a.filledMonth??-1)||b.caskId-a.caskId);
}
const caskEntry=id=>caskData().casks.find(c=>c.caskId===id);
const ledgerType=c=>uiText(P.casks[c?.type]?.short)??'記録なし';
const ledgerBarrel=c=>P.casks[c?.type]?barrel(c.type):'';
const cooledCask=c=>game.notesById[c.caskId]?.cooled===true||(c.choices??[]).some(x=>x.key==='cool')||(c.observations??[]).some(x=>x.eventId==='manual-cool');
const ledgerCaskStatus=c=>c.status==='aging'?'熟成中':c.status==='ended'?'熟成終了':['bottled','bottled-out','finished'].includes(c.status)?'ビン詰め済み':'状態の記録なし';
function ledgerPaged(rows,renderRow){const page=Math.min(modal.listPage??0,Math.max(0,Math.ceil(rows.length/20)-1)),start=page*20;return '<div class="ledger-release-list">'+rows.slice(start,start+20).map(renderRow).join('')+'</div>'+(rows.length>20?'<div class="history-pagination">'+button('前の20件','ledger-list-page',page-1,page===0?'disabled':'')+'<span>'+(start+1)+'–'+Math.min(rows.length,start+20)+' / '+rows.length+'</span>'+button('次の20件','ledger-list-page',page+1,start+20>=rows.length?'disabled':'')+'</div>':'');}
function ledgerRecipeList(){const waiting=caskLoadingView();if(waiting)return waiting;const rows=recipeRows();return rows.length?'<div class="ledger-release-list">'+rows.map(r=>'<button type="button" class="ledger-release-row" id="ledger-recipe-'+r.caskId+'" data-action="ledger-recipe-open" data-id="'+r.caskId+'"><span class="ledger-bottle">'+ledgerBarrel(r)+'</span><span>'+esc(r.savedRecipes.map(x=>x.name).filter(Boolean).join('／')||'手動仕込み')+'<br>'+esc(pastCaskName(r.caskId,r))+' · '+esc(ledgerType(r))+'<br>'+esc(known(r.filledMonth,monthLabel))+'</span></button>').join('')+'</div>':'<p>記録なし</p>';}
function ledgerCaskList(){const waiting=caskLoadingView();if(waiting)return waiting;const rows=caskData().casks.slice().sort((a,b)=>(a.status==='aging'?0:1)-(b.status==='aging'?0:1)||(a.status==='aging'?caskSlotMap(caskSlots).get(a.caskId)-caskSlotMap(caskSlots).get(b.caskId):0));return rows.length?'<div class="ledger-release-list">'+rows.map(c=>'<button type="button" class="ledger-release-row" id="ledger-cask-'+c.caskId+'" data-action="ledger-cask-open" data-id="'+c.caskId+'"><span class="ledger-bottle">'+ledgerBarrel(c)+'</span><span>'+esc(c.status==='aging'?caskName(c.caskId):pastCaskName(c.caskId,c))+' · '+esc(ledgerType(c))+'<br>'+esc(known(c.filledMonth,monthLabel))+'<br>'+esc(ledgerCaskStatus(c))+(cooledCask(c)?' · 冷暗所':'')+' · '+esc(known(c.age,ageLabel))+'</span></button>').join('')+'</div>':'<p>記録なし</p>';}
function openLedgerDetail(kind,caskId,focusId){const parent=rememberLedger();modal={kind,caskId,parent,returnFocusId:focusId};render();$('dialog-body').scrollTop=0;}
const rangeText=(choice,stop)=>choice?(choice.collectionVersion===2?'':'旧製法 ')+Math.round(choice.start*100)+'〜'+Math.round(choice.end*100)+'％':known(stop,n=>n+' / '+extractionMaximum);
function linkedReleases(c){const keys=c.releaseKeys??[];return keys.length?'<details class="ledger-related"><summary>発売 '+keys.length+'回</summary>'+keys.map(key=>button('第'+key.split(':')[1]+'回発売','ledger-release',key)).join('')+'</details>':'';}
function recipeCardFacts(choice){return choice?copyFacts([['malt','麦芽'],['ferment','発酵']].map(([group,label])=>[label,BREWING_CARDS.find(c=>c.group===group&&c.value===choice[group])?.label??'記録なし'])):'<p class="quiet">仕込みカード 記録なし</p>';}
function ledgerRecipeDetail(){
 const waiting=caskLoadingView();if(waiting)return waiting;
 const r=recipeRows().find(r=>r.caskId===modal.caskId);if(!r)return '<p>記録なし</p>';const retained=caskEntry(modal.caskId),c={...r,...retained,initialProfile:r.initialProfile??retained?.initialProfile,manualSource:r.source};
 const latest=caskData().recipes.latestManual?.caskId===r.caskId,selected=game.recipeBook?.selectedId??null;
 let out='<article class="ledger-cask-detail"><span class="release-bottle">'+ledgerBarrel(c)+'</span><h3>'+esc(r.savedRecipes.map(x=>x.name).filter(Boolean).join('／')||'手動仕込み')+'</h3><p>'+esc(c.status==='aging'?caskName(c.caskId):pastCaskName(c.caskId,c))+'</p>'+copyFacts([['仕込み',known(r.filledMonth,monthLabel)],['採取',rangeText(c.initialProfile?.flavor?.choice??c.profile?.flavor?.choice??r.source?.flavorChoice,r.stopAt)],['たる',ledgerType(r)]])+recipeCardFacts(c.initialProfile?.flavor?.choice??c.profile?.flavor?.choice??r.source?.flavorChoice)+'<details><summary>原酒</summary>'+ledgerProfile(c.initialProfile)+'</details>';
 for(const saved of r.savedRecipes)out+=button(selected===saved.id?'保存製法を選択中':'使う','recipe-select',saved.id,'aria-pressed="'+(selected===saved.id)+'"');
 if(latest)out+=button(selected===null?'前回の仕込みを選択中':'前回の仕込みを使う','recipe-select','latest','aria-pressed="'+(selected===null)+'"');
 if(!r.savedRecipes.length&&c.manualSource)out+=button('製法を残す','recipe-save',c.caskId,(game.recipeBook?.entries.length??0)>=64?'disabled':'');
 if(recipeRows().length>1)out+=button('比べる','ledger-source-compare',c.caskId);
 if(D.staffStatus(game).hired&&D.staffQuote(game,c.caskId))out+=button('任せる','ledger-recipe-request',c.caskId);
 if(retained)out+=button('たるの記録','ledger-cask-open',c.caskId)+linkedReleases(c);return out+'</article>';
}
function ledgerRecipeComparison(){
 const waiting=caskLoadingView();if(waiting)return waiting;
 const rows=recipeRows(),a=rows.find(r=>r.caskId===modal.caskId),b=rows.find(r=>r.caskId===modal.otherId);if(!a||!b)return '<p>記録なし</p>';const pair=[a,b];
 return '<label for="ledger-compare-choice">比べる仕込み</label><select id="ledger-compare-choice">'+rows.filter(r=>r.caskId!==a.caskId).map(r=>'<option value="'+r.caskId+'"'+(r.caskId===b.caskId?' selected':'')+'>'+esc(pastCaskName(r.caskId,r)+' '+(r.savedRecipes[0]?.name??ledgerType(r)))+'</option>').join('')+'</select><div class="nearby-pair">'+pair.map(r=>'<article><span class="nearby-art">'+ledgerBarrel(r)+'</span><strong>'+esc(pastCaskName(r.caskId,r))+'</strong></article>').join('')+'</div>'+compareFact('採取',...pair.map(r=>esc(rangeText(r.initialProfile?.flavor?.choice??r.source?.flavorChoice,r.stopAt))))+compareFact('たる',...pair.map(r=>esc(ledgerType(r))))+compareFact('仕込み',...pair.map(r=>esc(known(r.filledMonth,monthLabel))))+FLAVOR_AXES.map(({label,key})=>compareFact(label,...pair.map(r=>flavorMeter(r.initialProfile,key)))).join('');
}
function ledgerCaskDetail(){
 const waiting=caskLoadingView();if(waiting)return waiting;
 const c=caskEntry(modal.caskId);if(!c)return '<p>記録なし</p>';let out='<article class="ledger-cask-detail"><span class="release-bottle">'+ledgerBarrel(c)+'</span><h3>'+esc(c.status==='aging'?caskName(c.caskId):pastCaskName(c.caskId,c))+'</h3>'+copyFacts([['仕込み',known(c.filledMonth,monthLabel)],['たる',ledgerType(c)],['状態',ledgerCaskStatus(c)+(cooledCask(c)?' · 冷暗所':'')],['熟成',known(c.age,ageLabel)],['原酒',known(c.litres,n=>n.toFixed(1)+' L')]])+'';
 if(c.status==='aging'){out+=button('試す','ledger-cask-taste',c.caskId);if(game.core.casks.length>1)out+=button('比べる','ledger-cask-compare',c.caskId);}
 const sourceId=recipeRows().some(r=>r.caskId===c.caskId)?c.caskId:c.commissionedFrom?.caskId;
 if(Number.isFinite(sourceId)&&recipeRows().some(r=>r.caskId===sourceId))out+=button('元の仕込み','ledger-recipe-open',sourceId);
 else if(Number.isFinite(sourceId)&&sourceId!==c.caskId&&caskEntry(sourceId))out+=button('依頼元のたる','ledger-cask-open',sourceId);
 out+=caskTimeline(c)+linkedReleases(c);
 if(!caskData().coverage.complete)out+='<p class="quiet">記録の残る範囲</p>';
 return out+'</article>';
}
function finishLedgerTasting(){const parent=modal?.ledgerParent;if(!parent)return;act(D.endTasting,()=>{modal=parent;},()=>restoreLedger());}
// Ledger formatting reads existing records only; stored prose is never rewritten.

function brandSummary(id){const stats=brandStats(game,id);return '<p>'+esc(brandReputation(game,id).label)+'</p><p class="quiet">発売 '+stats.releases+'回<br>自家販売 '+stats.sold+'本<br>完売 '+stats.soldOut+'回<br>累計売上 '+money(stats.revenue)+'<br>販売中の在庫 '+stats.sellingStock+'本</p>';}
const shopTerms=id=>{if(id==='department')return '24か月以上／シゲキが穏やか／特選5本';const s=SHOPS.find(x=>x.id===id);return s?[(s.minAge?s.minAge+'か月以上':''),(s.maxRoughness!==null?'シゲキが穏やか':''),s.minQuantity+'本から','月'+s.monthlyLimit+'本まで'].filter(Boolean).join('／'):'';};
const shopName=id=>SHOPS.find(s=>s.id===id)?.name??'取扱店';
const offerTarget=o=>'data-shop-id="'+esc(o.shopId)+'" data-offer-id="'+o.id+'"';
const shopOffers=()=>[game.shop.offer,...(game.shop.pendingOffers??[])].filter(Boolean);
function departmentHistory(id,readOnly=false){return D.departmentInterests(game,id).map(i=>'<p>特選ウイスキー<br>'+(i.pendingDelivery?'翌月5本納品':'取扱いの相談')+'</p>'+(readOnly?'':button(i.pendingDelivery?'取消':'相談を終える','department-cancel','', 'data-selection-id="'+esc(i.selectionId)+'"'))).join('')+D.departmentAdoptions(game,id).map(a=>'<p class="department-adoption">'+monthLabel(a.month)+'<br>'+esc(a.projectName??'特選ウイスキー')+'に採用<br>'+releaseTag(game.releases.find(r=>r.id===a.releaseId)?.productId)+'<br>'+a.count+'本<br>'+money(a.revenue)+'</p>').join('');}
function shopHistory(id,readOnly=false){return departmentHistory(id,readOnly)+SHOPS.map(shop=>{const r=D.shopBrandStats(game,id,shop.id);if(!r)return '';return '<p class="shop-relation">'+esc(shop.name)+(shop.id==='department'?'<br>取扱関係あり':'で取扱中')+'</p><details class="shop-history"><summary>累計納品 '+r.bottles+'本<br>'+money(r.revenue)+'</summary><p class="quiet">'+monthLabel(r.startedMonth)+'から</p>'+r.history.map(d=>'<p>'+monthLabel(d.month)+'<br>'+releaseTag(d.productId)+'<br>'+d.count+'本<br>'+money(d.revenue)+'</p>').join('')+'</details>';}).join('');}
const atExtractionLimit=()=>game?.still.phase==='distilling'&&!D.collectionState(game).fullRange&&game.still.distillation.progress>=extractionMaximum;
const heldRange=()=>game?.still.phase==='distilling'&&D.collectionState(game).fullRange&&(D.collectionState(game).expired||game.still.distillation.progress>=extractionMaximum);
const manualDistilling=()=>game?.still.phase==='distilling'&&game.usual?.reservation?.status!=='active';
$('still').innerHTML=stillArt();
const message=t=>{$('work-notice').textContent=t;};
function storageNotice(t){$('storage-notice').textContent=t;$('storage-notice').hidden=!t;automaticNews.update();}
const wallClock=new RuntimeClock(T.distillStepMs);
function stopClock(reset=true){if(reset)wallClock.reset();generation++;if(timer!==null){clearTimeout(timer);timer=null;}}
function rememberCommitted(){committedSession={game,userPaused,elapsed,caskSlots:[...caskSlots],recentLedger,historyRecord,recallRecord};}
function restoreCommitted(){if(committedSession){game=committedSession.game;userPaused=committedSession.userPaused;elapsed=committedSession.elapsed;caskSlots=[...committedSession.caskSlots];recentLedger=committedSession.recentLedger;historyRecord=committedSession.historyRecord;pendingRecall=recallRecord=committedSession.recallRecord;recallPreview=null;}}
function recoveryAccess(){
 modal=null;vaultPanels();const dialog=$('action-dialog');if(dialog.open)dialog.close();$('recovery').hidden=false;
 $('recovery-export').hidden=lastSavedText===null&&legacyRecord===null;
 $('retry-save').hidden=!game||!isCurrentSession(lastSavedText);
}
function recordSaveError(error,phase){lastSaveError={phase,code:error?.code??error?.name??'error',message:error?.message??String(error)};}
function saveFailure(error,phase='保存'){
 if(debugSkipJob){clearTimeout(debugSkipJob.timer);debugSkipJob=null;}
 dialogueNotice.reset();recordSaveError(error,phase);restoreCommitted();canSave=false;runtimeHalted=true;stopClock();recoveryAccess();
 storageNotice(error?.code==='conflict'||error?.message==='conflict'?'別の画面で保存が変わりました。再読み込みしてください。':error?.name==='QuotaExceededError'?'保存容量が足りません。新しい記録も保存できない場合があります。':'保存できません。新しく始めることができます。');$('save-status').textContent='未保存';
}
const initializeLedger=next=>migrateRecentLedger(next,{replay:observer=>D.replayDistilleryOperations(next,observer)});
function candidateLedger(next){return recentLedger&&committedSession&&next.operations.length>=committedSession.game.operations.length?advanceRecentLedger(committedSession.game,next,committedSession.recentLedger):initializeLedger(next);}
function candidateHistory(next){if(preview&&!historyRecord&&committedSession)return null;return historyRecord&&committedSession?advanceHistoryRecord(committedSession.game,next,committedSession.historyRecord):initializeHistoryRecord(next);}
function sessionText(next,paused=userPaused,time=elapsed,slots=reconcileCaskSlots(next,caskSlots),ledger=candidateLedger(next),history=candidateHistory(next),recall=pendingRecall){return serializeSession(next,{userPaused:paused,elapsed:time,caskSlots:slots,recentLedger:ledger,historyRecord:history,recallRecord:recall},{serialize:D.serializeDistillery,restore:D.restoreDistillery,enabled:true,monthMs:T.monthMs,stepMs:T.distillStepMs});}
function saveCandidate(next,paused=userPaused,time=elapsed,writer=writeCandidate,ledgerOverride=null){
 const dialogueBefore=committedSession?.game;
 if(preview){recallRecord=pendingRecall;historyRecord=candidateHistory(next);recentLedger=ledgerOverride??candidateLedger(next);caskSlots=reconcileCaskSlots(next,caskSlots);committedSession={game:next,userPaused:paused,elapsed:time,caskSlots:[...caskSlots],recentLedger,historyRecord,recallRecord};noteDialogueCommit(dialogueBefore,next);return true;}
 if(!canSave)return false;
 let phase='帳面';
 try{const slots=reconcileCaskSlots(next,caskSlots),ledger=ledgerOverride??candidateLedger(next);phase='歩み';const history= candidateHistory(next);phase='保存検証';const text=sessionText(next,paused,time,slots,ledger,history);phase='書込み・読戻し';writer(localStorage,SAVE_KEY,lastSavedText,text);lastSavedText=text;caskSlots=slots;recentLedger=ledger;historyRecord=history;recallRecord=pendingRecall;committedSession={game:next,userPaused:paused,elapsed:time,caskSlots:[...slots],recentLedger,historyRecord,recallRecord};lastSaveError=null;$('save-status').textContent='保存済み';noteDialogueCommit(dialogueBefore,next);return true;}
 catch(error){saveFailure(error,phase);return false;}
}
function save(){
 if(preview){saveCandidate(game);$('save-status').textContent='試遊中 · 保存しません';return true;}
 if(!game)return false;
 if(!canSave){restoreCommitted();return false;}
 return saveCandidate(game);
}
// Debug fast-forward uses the same native month and the same saved session as ordinary play.
// It yields frequently, so a user can interrupt before the next month is committed.
function debugSkipMessage(job,reason){
 const elapsedMonths=Math.max(0,game.core.month-job.startMonth);
 return (Math.floor(elapsedMonths/12)+'年'+elapsedMonths%12+'か月進みました。')+(reason?' '+reason:'');
}
function debugSkipStatus(){
 if(!debugSkipJob)return debugSkipFeedback;
 return '進行中：'+debugSkipMessage(debugSkipJob,'')+' / '+debugSkipJob.years+'年';
}
function writeDebugSkipStatus(){const node=$('dialog-body').querySelector('[data-debug-skip-status]');if(node)node.textContent=debugSkipStatus();}
function finishDebugSkip(reason,{needsAction=false}={}){
 const job=debugSkipJob;if(!job)return;
 clearTimeout(job.timer);debugSkipJob=null;debugSkipFeedback=debugSkipMessage(job,reason);
 if(needsAction){modal=null;message(debugSkipFeedback);}
 if(game)render();
 if(needsAction)schedule();
}
function runDebugSkipChunk(job){
 if(job!==debugSkipJob)return;
 if(document.hidden||modal?.kind!=='settings'){finishDebugSkip('中断しました。');return;}
 try{
  for(let i=0;i<2&&job===debugSkipJob;i++){
   if(game.core.month>=job.targetMonth){finishDebugSkip('指定期間まで進みました。');return;}
   const result=debugSkipMonth(game,D);
   if(result.next!==game){
    if(!saveCandidate(result.next,true,elapsed)){debugSkipJob=null;render();return;}
    game=result.next;userPaused=true;runtimeHalted=false;
   }
   if(result.reason){finishDebugSkip(result.reason,{needsAction:['last-batch','review'].includes(generationState()?.phase)});return;}
   // A new choice or a generation boundary must be shown before another month.
   const status=D.generationStatus(game);
   if(game.decisions.length||game.trade.offer||game.shop.offer||status?.phase!=='working'){
    finishDebugSkip('操作や世代交代の確認が必要です。',{needsAction:true});return;
   }
  }
  writeDebugSkipStatus();
  job.timer=setTimeout(()=>runDebugSkipChunk(job),0);
 }catch(error){debugSkipJob=null;saveFailure(error,'デバッグ年送り');if(game)render();}
}
function startDebugSkip(years){
 if(!debugEnabled||preview||!game||!canSave||modal?.kind!=='settings'||debugSkipJob||!DEBUG_SKIP_YEARS.includes(years))return false;
 if(!confirm(years+'年進めます。現在の記録に毎月保存され、元には戻せません。重要な判断、蒸留、世代交代、資金不足の際には途中で停止します。実行しますか？'))return false;
 stopClock();countdown.cancel();
 debugSkipFeedback='';debugSkipJob={startMonth:game.core.month,targetMonth:game.core.month+monthsForDebugSkip(years),years,timer:null};
 render();debugSkipJob.timer=setTimeout(()=>runDebugSkipChunk(debugSkipJob),0);return true;
}
const displayProductStock=p=>placementEnabled?D.placementInventory(game,p.id).available:p.stock;
function placementReleaseNumber(p){const r=releaseFor(p.id);return game.releases.filter(x=>x.brandId===r?.brandId).findIndex(x=>x.id===r?.id)+1;}
function placementShelfLabel(p){return brandFor(p.id)?.name??'AmberTime';}
function placementShelfRelease(p){const r=releaseFor(p.id);return game.releases.filter(x=>x.brandId===r?.brandId).length>1?'第'+placementReleaseNumber(p)+'回':'';}
const productSaleState=p=>placementEnabled?(D.placementInventory(game,p.id).retail>0?'自家販売 '+D.placementInventory(game,p.id).retail+'本':'手元 '+D.placementInventory(game,p.id).hand+'本'):(game.productsById[p.id]?.listed?'販売中':'保管中');
const bottleStock=()=>game.core.products.reduce((sum,p)=>sum+p.stock,0);
const hasMonthlyWork=()=>game&&(game.core.casks.length>0||game.core.products.some(p=>p.stock>0)||game.still.phase==='distilling'||D.usualNeedsClock(game)||D.generationNeedsClock(game));
const blocked=()=>!game||countdown.active||generationState()?.phase==='review'||(!preview&&!canSave)||userPaused||runtimeHalted||heldRange()||manualDistilling()&&room!=='distill'||document.hidden||scene.isDistillCompletion(game.core.spirit?.id)||marketEditing||modal!==null||game.tastingId!==null||game.decisions.length>0||game.trade.offer!==null;
function schedule(continuing=false){
 stopClock(!continuing);if(blocked()||!hasMonthlyWork())return;const token=generation,expectedMonth=game.core.month;
 timer=setTimeout(()=>{
  if(token!==generation)return;timer=null;if(blocked())return;
  try{
   const beforeStep=game;let saved=true,completionSaved=false;
   if(D.canBeginUsual(game).ok){game=D.beginUsual(game);if(!save())return;}
   const wasAutomatic=game.usual.reservation?.status==='active',wasDistilling=game.still.phase==='distilling';
   if(wasDistilling){game=D.distillStep(game);if(!wasAutomatic&&atExtractionLimit())game=D.stopDistillation(game);if(!wasAutomatic&&heldRange()){save();render();return;}if(game.still.phase!=='distilling'){const completedTime=elapsed+T.distillStepMs<T.monthMs?elapsed+T.distillStepMs:elapsed;if(!saveCandidate(game,userPaused,completedTime)){render();return;}completionSaved=true;}}
   elapsed+=T.distillStepMs;
   const completed=wasAutomatic&&game.usual.reservation?.status!=='active';
   if(elapsed>=T.monthMs){const before=game.core.month,beforeMonth=game,beforeElapsed=elapsed-T.distillStepMs;game=D.tickDistillery(game,expectedMonth);elapsed=0;if(game.core.month===before&&!game.decisions.length&&generationState()?.phase!=='review'){runtimeHalted=true;message('資金を残して停止しています。たる詰めや販売を確かめられます。');}saved=save();if(!saved){restoreCommitted();render();return;}}
   else if(wasDistilling&&!completionSaved&&(game.still.phase!=='distilling'||game.still.distillation.progress%5===0))saved=save();
   if(completed&&saved&&!completionSaved)saved=save();
   if(!saved){restoreCommitted();render();return;}
   if(saved){automaticNews.push(automaticEvents(beforeStep,game,caskName,id=>soldOutLabel(game,id,beforeStep)));noteMapReach();marketUI.consume(beforeStep,game);m0.consume(beforeStep,game);}
   // Pure extraction/clock steps do not change other rooms' content. Keep
   // their time bar live without rebuilding hidden distillation/staff DOM.
   if(!modal&&!blocked()&&beforeStep.operations.length===game.operations.length&&beforeStep.still.phase===game.still.phase&&(room!=='distill'||game.still.phase!=='distilling'))renderProgress();
   else render();
   schedule(true);
  }catch(e){restoreCommitted();runtimeHalted=true;storageNotice(e.message);render();}
 },wallClock.delay(performance.now(),playbackRate,manualDistilling()));
}
function act(fn,after,afterSave,options){
 const paused=options?.paused??userPaused,time=options?.time??elapsed;
 if(!game||!preview&&!canSave)return false;
 countdown.cancel();stopClock();try{const before=game,next=fn(before);if(!saveCandidate(next,paused,time)){render();schedule();return false;}game=next;userPaused=paused;elapsed=time;runtimeHalted=false;if(after)after();automaticNews.push(automaticEvents(before,game,caskName,id=>soldOutLabel(game,id,before)));noteMapReach();if(afterSave)afterSave();render();schedule();return true;}catch(e){restoreCommitted();storageNotice(e.message);render();schedule();return false;}
}
function actMarket(fn){
 if(!game||modal||(!preview&&!canSave))return false;
 countdown.cancel();stopClock();const before=game;
 try{const next=fn(before);if(next===before)return true;if(!saveCandidate(next)){render();schedule();return false;}game=next;runtimeHalted=false;storageNotice('');$('save-status').textContent=preview?'試遊中 · 保存しません':'保存済み';automaticNews.push(automaticEvents(before,game,caskName,id=>soldOutLabel(game,id,before)));noteMapReach();marketUI.consume(before,game);render();schedule();return true;}
 catch(error){storageNotice(error.message);render();schedule();return false;}
}
// Keep the unfinished spirit and its dialog until the existing conditional save succeeds.
function commitFill(type){
 if(!game||modal?.kind!=='fill'||(!preview&&!canSave))return;
 countdown.cancel();stopClock();const before=game;let next;
 try{next=D.fillBarrel(before,type);}
 catch(error){storageNotice(error.message);render();return;}
 if(!saveCandidate(next)){render();return;}
 game=next;runtimeHalted=false;storageNotice('');$('save-status').textContent=preview?'試遊中 · 保存しません':'保存済み';
 automaticNews.push(automaticEvents(before,game,caskName,id=>soldOutLabel(game,id,before)));noteMapReach();
 modal=null;warehouseRoom.select(game.core.casks.at(-1)?.id??null);room='warehouse';message('');render();schedule();
}
function commitPlacement(selection){
 const before=game,old=D.placementInventory(game,selection.productId);let next;
 try{next=D.allocateProduct(game,selection);if(next===game)return {ok:true,changed:false,text:LIVE_MESSAGE.unchanged};}
 catch(e){$('dialog-error').textContent=e.message;$('dialog-error').hidden=false;return {ok:false};}
 if(!saveCandidate(next)){$('dialog-error').textContent=$('storage-notice').textContent;$('dialog-error').hidden=false;return {ok:false};}
 game=next;runtimeHalted=false;$('save-status').textContent=preview?'試遊中 · 保存しません':'保存済み';noteMapReach();const changed=old.retail!==selection.retail;
 const parts=[];if(changed)parts.push(selection.retail>old.retail?'自家販売へ'+(selection.retail-old.retail)+'本回しました':'自家販売から'+(old.retail-selection.retail)+'本戻しました');if(selection.shopCount)parts.push('町の酒店へ'+selection.shopCount+'本届けました');
 return {ok:true,changed:true,text:parts.map((part,i)=>i<parts.length-1?part.replace(/ました$/,'、'):part).join('')+'。'};
}
// Event presentation is transient and created only after the operation is saved.
function finishDistillation(){
 const manual=game?.usual?.reservation?.status!=='active';
 const collection=D.collectionState(game);
 if(collection.expired){act(D.restartRangeDistillation,()=>message(''));return;}
 if(collection.enabled&&!collection.collected){if(collection.canStart)act(D.beginCollection);return;}
 if(game?.still.phase==='distilling'&&!modal&&(collection.enabled?collection.canStop:game.still.distillation.progress>=T.minimumStop))act(D.stopDistillation,null,()=>{message('');const spiritId=game.core.spirit?.id;if(manual)scene.startDistillCompletion(spiritId,id=>{if(game?.still.phase==='filling'&&game.core.spirit?.id===id&&room==='distill'&&!modal&&!document.hidden&&(preview||canSave)){render();schedule();}});});
}
function currentDistillTools(){
 if(!game)return {visible:false};
 return distillToolsView({phase:game.still.phase,collection:{...D.collectionState(game),canStop:D.collectionState(game).enabled?D.collectionState(game).canStop:(game.still.distillation?.progress??0)>=T.minimumStop},litres:distillationReadout(game)?.litres??0,flowLitres:game.still.distillation?.litres??0,prepared:distillRoom.isPreparedFor(game.core.lastDistillation),available:room==='distill'&&!modal&&!document.hidden&&(preview||canSave),canStart:D.canStart(game).ok,countdown:countdown.active,automatic:game.usual?.reservation?.status==='active',completedRuns:manualCompletedRuns(game),canRestart:rangeRestartAvailable(game)});
}
function startFromLever(){
 const tools=currentDistillTools();if(!tools.leverEnabled)return;
 if(D.collectionState(game).expired){act(D.restartRangeDistillation,()=>message(''),null,{paused:false});return;}
 prepareDistillation(x=>{if(!D.stage4Mode(x))return D.startDistillation(x);const cards=manualCards(x);if(cards.ferment!==x.labConnection.cards.ferment)x=D.selectFlavorCards(x,cards);return D.startRangeDistillation(x);});
}
function endTaste(){if(!game||!preview&&!canSave)return false;if(game.tastingId!==null){const next=D.endTasting(game);if(!saveCandidate(next))return false;game=next;}return true;}
function selectRoom(next){if(!game||!preview&&!canSave||!['distill','warehouse','sales'].includes(next)||modal)return;marketUI.cancel();marketEditing=false;countdown.cancel();stopClock();if(manualDistilling())userPaused=true;if(!endTaste()){render();return;}if(next==='distill')shownFillSpiritId=null;room=next;save();render();schedule();}
// The internal identity remains the action target; its display serial is derived.
const caskLabel=c=>caskName(c.id)+' '+uiText(P.casks[c.type].short);
const button=(text,action,id='',extra='')=>'<button type="button" data-action="'+action+'" data-id="'+id+'" '+(text==='閉じる'?'data-close="true" ':text.endsWith('戻る')?'data-return="true" ':'')+extra+'>'+text+'</button>';
function openModal(kind,id=null){if(!game||(modal&&!['inspect','staff-panel','aux-panel'].includes(modal.kind))||kind==='fill'&&game.still.phase!=='filling')return;countdown.cancel();stopClock();deliveryNotice='';modal={kind,id};render();}
// Display the active sales mode; legacy delivery conditions are not shelf conditions.
function shopOfferTerms(shopId){
 if(!D.storeMarketMode(game))return shopTerms(shopId);
 const store=SHOPS.find(s=>s.id===shopId);
 return [store.minAge?store.minAge+'か月以上':'','1本から',D.marketRulesMode(game)?'':'月'+store.monthlyLimit+'本まで'].filter(Boolean).join('／');
}
function shopOfferNext(shopId){
 if(D.storeMarketMode(game))return '手元の瓶を店に置くと、翌月から販売されます。';
 return D.shopDemandMode(game)&&!(placementEnabled&&shopId==='town-liquor')?'取扱開始後は毎月自動で発送':'販売室から商品を届けられます。';
}
function shopStartedText(shopId,brandId){
 const brand=game.brands.find(b=>b.id===brandId);
 return shopName(shopId)+'で「'+(brand?.name??'ウイスキー')+'」の取扱いが始まりました。';
}
function shopStartedMarkup(){
 return modal.greeting&&modal.startedBrandId!==undefined?'<p class="delivery-confirmation" role="status">'+esc(shopStartedText(modal.startedShopId??modal.shopId,modal.startedBrandId))+'</p><p class="quiet">'+esc(shopOfferNext(modal.startedShopId??modal.shopId))+'</p>':'';
}
// A notice is recorded before showing it, so deferring or reloading never
// repeats the automatic interruption. Pause intent belongs to userPaused.
function showShopOffer(productId=null,returnModal=null){
 if(!game?.shop.offer||game.trade.offer||game.tastingId!==null||(!preview&&!canSave))return false;
 stopClock();const before=game;
 try{if(!game.shop.offer.notified){game=D.noticeShopOffer(game,game.shop.offer.shopId,game.shop.offer.id);if(!save())return false;}modal={kind:'shop-offer',productId,returnProductId:productId,shopId:game.shop.offer.shopId,offerId:game.shop.offer.id,selectedCount:null,returnModal};deliveryNotice='';return true;}
 catch(e){game=before;runtimeHalted=true;storageNotice(e.message);return false;}
}
// Both entry directions use the same quote, pending quantity and final operation.
function deliveryCount(p,q){return modal.deliveryProductId===p.id&&modal.deliveryShopId===q.shopId&&q.ok&&q.quantities.includes(modal.deliveryCount)?modal.deliveryCount:null;}
function deliveryConfirm(p,q){const n=deliveryCount(p,q);return button(q.shopId==='department'?'5本を扱う':'納品','shop-deliver',p.id,'data-count="'+(n??'')+'" data-shop-id="'+esc(q.shopId)+'" data-selection-id="'+esc(q.selectionId??'')+'"'+(n===null||!preview&&!canSave?' disabled':''));}
function deliveryButtons(p,q,action){
 if(action==='shop-deliver')return '<div class="delivery-options" role="group" aria-label="納品本数">'+q.quantities.map(n=>button(n+'本<small>'+unit(Math.round(n*q.unitPrice*100)/100)+(q.shopId==='department'?' 入金予定':' 入金')+'</small>','delivery-select',p.id,'data-count="'+n+'" data-shop-id="'+esc(q.shopId)+'" aria-pressed="'+(deliveryCount(p,q)===n)+'"')).join('')+'</div>'+(modal.kind==='stockist-delivery'?'':deliveryConfirm(p,q));
 return '<p class="delivery-label">納品数 '+symbolMarkup('chevronRight')+' 残り／入金</p><div class="delivery-options">'+q.quantities.map(n=>button(n+'本<small>'+(p.stock-n)+'本</small><small>'+unit(Math.round(n*q.unitPrice*100)/100)+'</small>',action,p.id,'aria-label="'+n+'本納品して取扱いを始める 残り '+(p.stock-n)+'本 入金 '+unit(Math.round(n*q.unitPrice*100)/100)+'" data-count="'+n+'" data-shop-id="'+esc(q.shopId??modal.shopId)+'" data-offer-id="'+(modal.offerId??'')+'" data-selection-id="'+esc(q.selectionId??'')+'"')).join('')+'</div>';
}
function knownStockists(){
 const seen=new Set([...shopOffers(),...game.shop.relations,...game.shop.deliveries].map(x=>x.shopId??'town-liquor'));
 for(const key of Object.keys(game.shop.declinedUntil??{})){const id=key.split(':')[0];if(SHOPS.some(s=>s.id===id))seen.add(id);}
 if(D.departmentInterests(game).length||D.departmentAdoptions(game).length)seen.add('department');
 return SHOPS.filter(s=>seen.has(s.id));
}
function stockistProducts(shopId){return game.releases.filter(r=>D.shopBrandStats(game,r.brandId,shopId)||shopId==='department'&&D.departmentInterests(game,r.brandId).length).map(r=>({r,p:game.core.products.find(p=>p.id===r.productId),q:placementEnabled&&shopId==='town-liquor'?D.placementQuote(game,r.productId,{retail:0}):D.shopQuote(game,r.productId,shopId)})).filter(x=>x.p?.stock>0).reverse();}
function stockistStatus(shopId){if(D.storeMarketMode(game)&&shopId!=='department')return game.shop.relations.some(r=>r.shopId===shopId)?'販売枠':shopOffers().some(o=>o.shopId===shopId)?'申し出あり':'取扱前';if(placementEnabled&&shopId==='town-liquor'&&game.shop.relations.some(r=>r.shopId===shopId))return '自分で届ける';if(shopId!=='department')return shopRelationshipLabel(game,shopId);if(shopId==='department'&&D.departmentInterests(game).some(i=>i.pendingDelivery))return '翌月5本納品';if(shopOffers().some(o=>o.shopId===shopId))return '申し出あり';if(stockistProducts(shopId).some(x=>x.q.ok))return '取扱中';return game.shop.relations.some(r=>(r.shopId??'town-liquor')===shopId)||shopId==='department'&&D.departmentInterests(game).length?'現在は納品不可':'取扱前';}
function departmentOfferInventory(offer){
 const r=game.releases.find(r=>r.id===offer.sourceReleaseId),p=game.core.products.find(p=>p.id===r?.productId);modal.productId=p?.id??null;
 if(!p||!r)return '<p>対象の発売回に在庫がありません。</p>';
 const q=D.shopOfferQuote(game,p.id,'department');return '<p>'+releaseTag(p.id)+' '+esc(pastCaskName(r.caskId,r))+' '+ageLabel(r.age)+'<br>在庫 '+p.stock+'本<br>入金予定 '+unit(q.unitPrice*5)+'</p>'+(q.ok?'<p class="quiet">受けると、翌月に5本納品されます。</p>'+button('受ける','shop-accept-deliver',p.id,offerTarget(offer)+' data-count="5" data-selection-id="'+esc(q.selectionId??'')+'"'):'<p class="quiet">'+esc(displayReason(q.reason))+'</p>');
}
function departmentDestination(p,release,invitation){
 const interests=D.departmentInterests(game,release?.brandId),interest=interests[0],adoptions=D.departmentAdoptions(game,release?.brandId),adopted=adoptions.some(a=>a.releaseId===release?.id),q=D.shopQuote(game,p.id,'department');
 let body='<section class="sales-destination shop-delivery" data-destination="department"><h3>'+esc(shopName('department'))+'</h3><p class="quiet">'+esc(shopTerms('department'))+'</p>';
 if(interest){const pending=interest.pendingDelivery;body+=pending?'<p>'+releaseTag(pending.productId)+' · 翌月5本納品</p>':'<p>翌月5本納品</p><p>5本 '+unit(q.unitPrice)+'/本</p>'+(q.ok?deliveryButtons(p,q,'shop-deliver'):'<p class="quiet">'+esc(displayReason(q.reason))+'</p>');body+=button(pending?'取消':'相談を終える','department-cancel',p.id,'data-selection-id="'+esc(interest.selectionId)+'"');}
 else if(invitation)body+=button('相談','shop-open-offer','',invitation===game.shop.offer?'':'disabled')+(invitation===game.shop.offer?'':'<p class="quiet">先の申し出を確認してください。</p>');
 else body+='<p>'+(adopted?'今回の企画は完了':adoptions.length?'過去に採用実績あり':'申し出待ち')+'</p><p>5本 '+unit(q.unitPrice)+'/本</p><p class="quiet">'+esc(displayReason(q.reason)??shopTerms('department'))+'</p>';
 body+=D.departmentAdoptions(game,release?.brandId).length?'<p class="quiet">採用歴は記録へ</p>':'';return body+'</section>';
}
const mapNumber=n=>n>999?'999+':String(n);
// Presentation bounds follow the existing authored sprites only. Native map
// marker positions, projections, unlocks and drawing are unchanged. Department
// has no dedicated sprite, so its existing marker remains the visual target.
function mapVisualBounds(id,p){
 const sprites=worldMapStage===1?{retail:[52,62,32,32]}:worldMapStage===2?{retail:[26,72,24,24],'town-liquor':[90,34,24,24],supermarket:[102,94,24,24]}:worldMapStage===3?{retail:[46,62,16,16],'town-liquor':[86,44,16,16],supermarket:[98,92,16,16]}:{};
 return sprites[id]??(p?[p.x-4,p.y-4,8,8]:null);
}
function mapCursor(bounds,selected=true){if(!bounds)return '';const [x,y,w,h]=bounds;return '<span class="'+(selected?'map-selection-cursor':'map-place-affordance')+'" aria-hidden="true" style="left:'+(x-2)/144*100+'%;top:'+(y-2)/144*100+'%;width:'+(w+4)/144*100+'%;height:'+(h+4)/144*100+'%"></span>';}
// Label layout is presentation-only: the native projection owns every number.
function mapSalesMarkup(data,selected){
 return data.pins.map(p=>{
  const sold=(p.recentSold===null?'納'+mapNumber(p.recentDelivered):'売'+mapNumber(p.recentSold)),stock=p.currentStock===null?'':'残'+mapNumber(p.currentStock),label=sold+(stock?' '+stock:'');
  const bounds=mapVisualBounds(p.id,p),[x,y,w,h]=bounds;
  return '<button type="button" class="map-shop-hit" data-action="map-shop" data-id="'+esc(p.id)+'" style="left:'+(x+w/2)/144*100+'%;top:'+(y+h/2)/144*100+'%" aria-label="'+esc(p.name+' '+label)+'" aria-pressed="'+(selected===p.id)+'"></button><span class="map-shop-label" data-id="'+esc(p.id)+'" data-bounds="'+bounds.join(',')+'" aria-hidden="true"><span>'+esc(sold)+'</span>'+(stock?' <span>'+esc(stock)+'</span>':'')+'</span>'+mapCursor(bounds,selected===p.id);
 }).join('')+mapDistilleryMarkup(selected);
}
function mapDistilleryMarkup(selected){
 const bounds=mapVisualBounds('retail');if(!bounds)return '';
 const [x,y,w,h]=bounds;
 return '<button type="button" class="map-shop-hit" data-action="map-shop" data-id="retail" style="left:'+(x+w/2)/144*100+'%;top:'+(y+h/2)/144*100+'%" aria-label="蒸留所" aria-pressed="'+(!selected)+'"></button>'+mapCursor(bounds,!selected);
}
let mapLabelObserver=null;
function layoutMapLabels(){
 const surface=document.querySelector('.world-map-surface'),labels=[...document.querySelectorAll('.map-shop-label')];if(!surface||!labels.length)return;
 const width=surface.clientWidth,height=surface.clientHeight,selected=document.querySelector('.map-shop-hit[aria-pressed="true"]')?.dataset.id;
 const logical=values=>{const [x,y,w,h]=values;return {left:x/144*width-3,top:y/144*height-3,right:(x+w)/144*width+3,bottom:(y+h)/144*height+3};};
 const obstacles=labels.map(el=>logical(el.dataset.bounds.split(',').map(Number))),retail=mapVisualBounds('retail');if(retail)obstacles.push(logical(retail));
 const occupied=[],overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 labels.sort((a,b)=>Number(b.dataset.id===selected)-Number(a.dataset.id===selected));
 for(const el of labels){
  const [x,y,w,h]=el.dataset.bounds.split(',').map(Number),anchor={x:(x+w/2)/144*width,y:(y+h/2)/144*height};
  el.style.width='max-content';if(el.getBoundingClientRect().height>parseFloat(getComputedStyle(el).lineHeight)*1.5)el.style.width='min-content';
  const rect=el.getBoundingClientRect(),lw=rect.width,lh=rect.height;let best=null;
  for(let top=2;top<=height-lh-2;top+=2)for(let left=2;left<=width-lw-2;left+=2){
   const box={left,top,right:left+lw,bottom:top+lh};
   const collision=occupied.reduce((n,b)=>n+overlap(box,b),0),art=obstacles.reduce((n,b)=>n+overlap(box,b),0);
   const distance=Math.hypot(left+lw/2-anchor.x,top+lh/2-anchor.y),score=collision*100000+art*1000+distance;
   if(!best||score<best.score)best={...box,score};
  }
  if(!best)best={left:2,top:2,right:2+lw,bottom:2+lh};
  el.style.left=best.left+'px';el.style.top=best.top+'px';occupied.push({left:best.left-2,top:best.top-2,right:best.right+2,bottom:best.bottom+2});
 }
}
function observeMapLabels(){
 mapLabelObserver?.disconnect();mapLabelObserver=null;layoutMapLabels();
 if(typeof ResizeObserver==='function'&&document.querySelector('.map-shop-label')){mapLabelObserver=new ResizeObserver(layoutMapLabels);for(const el of document.querySelectorAll('.map-shop-label'))mapLabelObserver.observe(el);}
}
function mapSalesReport(data,id){
 const p=data.pins.find(p=>p.id===id);
 if(worldMapStage>=4){const a=data.summary;return '<section class="map-shop-report map-summary" aria-label="町の取扱店の集計"><h3>町の取扱店：'+a.shopCount+'店</h3><p class="map-sales-period">直近12か月：売'+a.recentSold+'／納'+a.recentDelivered+'</p><p>現在：残'+a.currentStock+(a.unknownStockCount?'（不明'+a.unknownStockCount+'店）':'')+'</p><p>口コミ：'+esc(data.reach.filter(r=>r.reached).map(r=>r.name).join('・')||'記録なし')+'</p></section>';}
 if(worldMapStage===1||!p)return '<section class="map-shop-report" aria-label="蒸留所"><h3>蒸留所</h3><p>自家販売 累計'+data.retail.totalSold+'本</p>'+(worldMapStage===1?'':'<p class="map-sales-period">売・納：直近12か月／残：現在</p>')+'</section>';
 return '<section class="map-shop-report" aria-label="'+esc(p.name)+'の記録"><header><h3>'+button(esc(p.name)+symbolMarkup('chevronRight'),'map-shop-info',p.id,'class="map-place-name" aria-label="'+esc(p.name)+'の店情報"')+'</h3></header><p>直近12か月 '+(p.recentSold===null?'納品'+p.recentDelivered+'本':'販売'+p.recentSold+'本')+'</p><p>'+(p.currentStock===null?'残数の記録なし':'現在 残'+p.currentStock+'本')+'</p><p>「'+esc(p.remark||p.status)+'」</p></section>';
}
function closeModal(){if(debugSkipJob&&modal?.kind==='settings')finishDebugSkip('中止しました。');if(modal?.kind==='first-bottle-complete')return;if(modal?.kind==='flavor-cards'){const confirmed=brewingPanelState(game,distillRoom.confirmation),draft=manualCards(game);distillRoom.cancelEdit(modal.preparedAtOpen,confirmed,draft);}if(modal?.mapParent){modal=modal.mapParent;render();return;}if(modal?.kind==='world-map'&&modal.source==='direct'){rememberMapBrowse();modal=null;render();schedule();$('open-world-map').focus({preventScroll:true});return;}placementUI?.reset();if(modal?.kind==='world-map'){const fromMenu=modal.source==='menu';modal=fromMenu?modal.parent??{kind:'aux-panel'}:null;render();if(fromMenu)$('open-world-map').focus({preventScroll:true});else schedule();return;}if(modal?.kind==='staff-opportunity'){modal=modal.returnModal??null;render();schedule();return;}if(modal?.kind==='inspect'&&modal.ledgerParent){finishLedgerTasting();return;}if(modal?.kind==='inspect'&&game.tastingId!==null){act(D.endTasting,()=>{modal=null;});return;}if(modal?.kind==='staff-request'){closeComparison();return;}if(comparisonKinds.includes(modal?.kind)){closeComparison();return;}if(modal?.kind==='generation-review')return;if(['history','history-brand','history-shop'].includes(modal?.kind)){if(modal.parent){closeComparison();return;}}if(modal?.kind==='decision')return;modal=modal?.kind==='shop-offer'&&modal.returnProductId!==null?{kind:'product',id:modal.returnProductId}:null;render();schedule();}
function trial(id){if(!game||!D.currentCask(game,id))return;stopClock();if(game.tastingId!==null&&game.tastingId!==id&&!endTaste())return;warehouseRoom.select(id);room='warehouse';modal={kind:'inspect',id};act(s=>D.sampleDistillery(s,id));}
function quoteModal(id){if(!D.currentCask(game,id))return;stopClock();if(D.bottlingReservation(game,id)?.status==='active')act(s=>D.pauseBottling(D.endTasting(s),id,true),()=>{modal={kind:'quote',id};});else{modal={kind:'quote',id};render();}}
function reservationLabel(id){
 const r=D.bottlingReservation(game,id);if(!r)return '';
 if(r.status==='completed')return '自分で行う'+(r.mode==='age'?' · 完了':'');
 const state=r.status==='active'&&!D.bottlingStaffStatus(game).hired?'採用待ち':({active:'任せる',paused:'停止'}[r.status]??r.status);
 return state+' · '+policyLabel(r)+(r.lastError?' · '+r.lastError:'');
}
function reservationSymbol(id){const r=D.bottlingReservation(game,id);return r?.status==='paused'||r?.status==='active'&&!D.bottlingStaffStatus(game).hired?'pause':r?.status==='active'?(r.mode==='age'?'clock':'stock'):null;}
function validPlanDraft(d){return !!d&&['age','stock'].includes(d.mode)&&Number.isInteger(d.count)&&d.count>=1&&d.count<=Math.floor((P.baseLitres+P.extraLitres)/P.bottleLitres)&&Number.isInteger(d[d.mode==='age'?'age':'threshold'])&&d[d.mode==='age'?'age':'threshold']>=0&&d[d.mode==='age'?'age':'threshold']<=(d.mode==='age'?1200:999);}
const policyLabel=r=>r.mode==='age'?'熟成'+r.age+'か月以上で一度 · '+r.count+'本':'販売登録済みのビン全体 '+r.threshold+'本以下で'+r.count+'本';
function bottlingPolicyView(){
 const draft=modal.planDraft??(modal.planDraft={...D.operationDefaults(game).auto,...D.commonBottlingPolicy(game)});
 return '<div class="bottling-plan"><label for="bottling-mode">共通設定</label><select id="bottling-mode"><option value="age"'+(draft.mode==='age'?' selected':'')+'>時期指定</option><option value="stock"'+(draft.mode==='stock'?' selected':'')+'>在庫連動</option></select><div class="bottling-plan-fields"><label for="bottling-condition">'+(draft.mode==='age'?'熟成':'販売登録済みのビンが')+'</label><input id="bottling-condition" data-policy-field="'+(draft.mode==='age'?'age':'threshold')+'" type="number" inputmode="numeric" min="0" max="'+(draft.mode==='age'?1200:999)+'" step="1" value="'+(draft.mode==='age'?draft.age:draft.threshold)+'"><span>'+(draft.mode==='age'?'か月以上になったら':'本以下になったら')+'</span></div><div class="bottling-plan-fields bottling-quantity"><label for="bottling-quantity">ビン詰め</label>'+button('−','policy-count-less','','aria-label="ビン詰め本数を減らす"'+(draft.count<=1?' disabled':''))+'<select id="bottling-quantity">'+Array.from({length:Math.floor((P.baseLitres+P.extraLitres)/P.bottleLitres)},(_,i)=>i+1).map(n=>'<option value="'+n+'"'+(n===draft.count?' selected':'')+'>'+n+'本</option>').join('')+'</select>'+button('＋','policy-count-more','','aria-label="ビン詰め本数を増やす"'+(draft.count>=Math.floor((P.baseLitres+P.extraLitres)/P.bottleLitres)?' disabled':''))+'</div><p class="quiet">ふつうの価格でビン詰め。行き先はあとで配分</p>'+button('保存','bottling-policy-save','',validPlanDraft(draft)?'':'disabled')+'</div>';
}
function bottlingChoiceView(id){
 const r=D.bottlingReservation(game,id),policy=D.commonBottlingPolicy(game);
 return '<div class="bottling-modes" role="group" aria-label="ビン詰めの方式">'+button('自分で行う','bottling-manual',id,'aria-pressed="'+(r?.status!=='active')+'"')+button('任せる','bottling-delegate',id,r?.status==='active'?'disabled aria-pressed="true"':'aria-pressed="false"')+'</div>'+(r?'<p class="bottling-reservation" role="status">'+esc(reservationLabel(id))+'</p>':'')+(!policy?'<p>先に共通設定を保存</p>':'');
}
function firstBrandDraft(){return modal.brandDraft??(modal.brandDraft=identityDefaults());}
function brandSetupView(){
 if(!D.needsBrandSetup(game)){const brand=game.brands[0];return '<div class="brand-readout">'+brandArt(0,brand)+'<span>'+esc(brand.name)+'</span></div>';}
 const draft=firstBrandDraft();
 if(modal.brandDraftConfirmed)return '<div class="brand-readout">'+brandArt(0,draft)+'<span>'+esc(draft.name.trim())+'</span>'+button('変更','brand-edit')+'</div>';
 return firstBrandEditor(draft,{art:b=>brandArt(0,b),esc,button,error:brandNameError});
}
function bottleSelection(id){
 const c=D.currentCask(game,id),q=D.quote(game,id),fee=q.count>0?q.cost/q.count:0;
 const affordable=fee>0?Math.min(q.count,Math.max(0,Math.floor((game.core.cash+1e-9)/fee))):0;
 const choices=[...new Set([...bottleChoices(q.count,affordable),...[1,Math.max(1,Math.floor(q.count/2))].filter(n=>n<=affordable)])].sort((a,b)=>a-b);if(modal.bottleCount===undefined){const previous=D.operationDefaults(game).bottleCount;modal.bottleCount=choices.includes(previous)?previous:defaultBottleCount(previous,q.count,affordable);}
 const count=modal.bottleCount,valid=choices.includes(count),cost=valid?count*fee:0;
 const remaining=valid?Math.max(0,c.litres-count*P.bottleLitres):c.litres,retired=valid&&count===q.count;
 const reason=affordable<1?(q.count<1?'ビン1本分の原酒がありません。':'ビン詰めの資金が足りません。'):!valid?'本数を選んでください。':count>affordable?'ビン詰めの資金が足りません。':'';
 return {c,max:q.count,affordable,choices,count,valid,cost,remaining,retired,ok:valid&&count<=affordable&&!modal.committing&&(preview||canSave)&&(!D.needsBrandSetup(game)||!brandNameError(firstBrandDraft().name)),reason};
}
function bottleRemainder(q){return q.retired?'残り '+q.remaining.toFixed(2)+' L（1本未満） · たる終了':'残り '+q.remaining.toFixed(2)+' L';}
function updateBottleSelection(){
 if(modal?.kind!=='quote'||!D.currentCask(game,modal.id))return;
 if(D.needsBrandSetup(game)&&!modal.brandDraftConfirmed){$('action-dialog').querySelector('[data-action=brand-next]').disabled=!!brandNameError(firstBrandDraft().name);return;}
 const q=bottleSelection(modal.id),input=$('bottle-count');
 if(input)input.disabled=q.affordable<1;
 $('bottle-remainder').textContent=bottleRemainder(q);$('bottle-cost').textContent='費用 '+money(q.cost);$('bottle-cash').textContent='ビン詰め後 '+money(game.core.cash-q.cost);$('bottle-count-reason').textContent=displayReason(q.reason)|| (q.affordable<q.max?'今の資金で '+q.affordable+'本まで':'');
 const node=action=>$('action-dialog').querySelector('[data-action="'+action+'"]');
 node('bottle-less').disabled=!Number.isInteger(q.count)||q.choices.indexOf(q.count)<=0;node('bottle-more').disabled=!Number.isInteger(q.count)||q.choices.indexOf(q.count)>=q.choices.length-1;node('bottle-all').disabled=q.max<1||q.affordable<q.max;node('bottle').disabled=!q.ok;
}
// Move the original panels, rather than copying their inputs or event handlers.
function vaultPanels(){for(const id of ['selected-cask','staff-panel','free-actions','tasting-actions','aux-panel']){const n=$(id);if(n.closest('#action-dialog'))$('panel-vault').append(n);}}
function syncModal(){
 const dialog=$('action-dialog'),previousKind=dialog.dataset.kind;
 if(!preview&&!canSave){recoveryAccess();return;}
 if(!dialog.open&&modal){
  modalReturnFocus=document.activeElement;
  const object=modalReturnFocus?.closest('[data-product-id],[data-cask-id]');
  modalReturnObject=object?{attribute:object.hasAttribute('data-product-id')?'data-product-id':'data-cask-id',id:object.dataset.productId??object.dataset.caskId}:null;
 }
 if(!modal&&game.tastingId===null&&game.decisions.length){const d=game.decisions[0];modal={kind:'decision',id:d.caskId};warehouseRoom.select(d.caskId);}
 if(!modal&&game.tastingId===null&&!game.decisions.length&&!document.hidden)showStaffOpportunity();
 if(!modal&&game.tastingId===null&&!game.decisions.length&&game.trade.offer)modal={kind:'offer'};
 if(!modal&&game.shop.offer&&!game.shop.offer.notified&&game.tastingId===null&&!game.decisions.length&&!game.trade.offer&&game.still.phase==='ready'&&!document.hidden&&!runtimeHalted&&(preview||canSave))showShopOffer();
 if(!modal&&game.tastingId===null&&!game.decisions.length&&!game.trade.offer&&(!game.shop.offer||game.shop.offer.notified)&&!document.hidden&&(preview||canSave))showGeneration();
 if(!preview&&!canSave){recoveryAccess();return;}
 if(modal||room!=='distill'||game.still.phase!=='filling'||!scene.isDistillCompletion(game.core.spirit?.id)||document.hidden||(!preview&&!canSave))scene.cancelDistillCompletion();
 if(!modal&&room==='distill'&&game.still.phase==='filling'&&game.usual?.reservation?.status!=='active'&&game.core.spirit&&shownFillSpiritId!==game.core.spirit.id&&(preview||canSave)&&!scene.isDistillCompletion(game.core.spirit.id)){shownFillSpiritId=game.core.spirit.id;modal={kind:'fill'};}
 if(!modal&&!scene.isDistillCompletion(game.core.spirit?.id))showInitialMapNotice();
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
 if(kind==='flavor-cards'){title='仕込み';body=brewingCardsMarkup(game);actions=button('決める','flavor-start')+button('戻る','cancel');
 }else if(kind==='inspect'){title=c?caskLabel(c)+' '+ageLabel(c.age):'たる';
 }else if(kind==='aux-panel'){title='メニュー';
 }else if(kind==='world-map'){
  worldMapStage=Math.max(1,Math.min(worldMapStage,mapViewMax()));const introduction=modal.source==='unlock';
  const data=dailyMapProjection(game,worldMapStage);
  if(!introduction){const normalized=normalizeMapView({stage:worldMapStage,selectedShop:modal.selectedShop},mapViewMax(),data.pins.map(p=>p.id));modal.selectedShop=normalized.selectedShop;}
  const selected=modal.selectedShop;
  const surface='<div class="world-map-surface"><canvas id="world-map-canvas" width="144" height="144" role="img" aria-label="'+esc(MAP_STAGES[worldMapStage-1])+'の地図"></canvas>'+(!introduction?mapSalesMarkup(data,selected):'')+'</div>';
  const controls='<div class="world-map-controls">'+button('−','world-map-out','',worldMapStage>=mapViewMax()?'disabled aria-label="縮小"':'aria-label="縮小"')+'<span role="status">'+esc(MAP_STAGES[worldMapStage-1])+'</span>'+button('＋','world-map-in','',worldMapStage===1?'disabled aria-label="拡大"':'aria-label="拡大"')+'</div>';
  title='地図';body='<div class="world-map-view">'+(introduction?'<p class="map-introduction" role="status">'+esc(mapIntroduction(game,worldMapStage))+'</p>'+surface:'<div class="map-browse-row">'+surface+controls+'</div>'+mapSalesReport(data,selected))+'</div>';
  actions=(!introduction?button('販売室へ','map-sales-room'):'')+button(introduction?'つづける':'戻る',introduction?'map-continue':'map-back');
 }else if(kind==='staff-manager'){title='担当者';body=staffManagerView();actions=button('閉じる','cancel');
 }else if(kind==='staff-opportunity'){title=jobName(modal.job);const status=jobStatus(modal.job);body=staffEncounterMarkup(modal.job)+staffCostView(modal.job);actions=button('採用する','staff-opportunity-hire',modal.job,status.canHire?'':'disabled')+button('見送る','staff-opportunity-later');
 }else if(kind==='bottler-panel'){title='ビン詰め担当者';body=bottlerManagerView();actions=button('閉じる','cancel');
 }else if(kind==='staff-panel'){title='蒸留担当者';actions=button('閉じる','cancel');
 }else if(kind==='ledger'){title='帳面';body=ledgerView();actions=button('閉じる','cancel');
 }else if(kind==='ledger-recipe'||kind==='ledger-cask'||kind==='ledger-recipe-comparison'){title=kind==='ledger-recipe'?'仕込み':kind==='ledger-cask'?'たる':'比べる';body=kind==='ledger-recipe'?ledgerRecipeDetail():kind==='ledger-cask'?ledgerCaskDetail():ledgerRecipeComparison();actions=button('戻る','comparison-back');
 }else if(kind==='ledger-shop'){title='取扱店';body=ledgerShopDetail();actions=button('戻る','comparison-back');
 }else if(kind==='ledger-release'){title='発売';body=ledgerReleaseView();actions=button('戻る','comparison-back');
 }else if(kind==='settings'){
  title='デバッグ';
  const status=preview?'試遊中・保存しません':!canSave?'未保存':lastSavedText===null?'未保存':'保存済み';
  body='<p>'+status+'</p>'+
   (debugSkipJob?'<p class="quiet">年送りを実行中です。</p>'+button('中止','debug-skip-stop'):
    button('回想を試す（サンプル）','debug-recall')+
    '<p class="quiet">年送り：現在の記録を更新します。操作が必要な場面では停止します。</p>'+
    (preview?'<p class="quiet">保存なしの試遊では年送りできません。</p>':DEBUG_SKIP_YEARS.map(years=>button(years+'年進める','debug-skip',years)).join(''))+
    button('記録を書き出す','connected-export')+button('記録を読み込む','connected-import'))+
   '<p role="status" aria-live="polite" data-debug-skip-status>'+esc(debugSkipStatus())+'</p>'+
   (lastSaveError?'<pre>'+esc(JSON.stringify(lastSaveError,null,2))+'</pre>':'');
  actions=button('閉じる','cancel');
 }else if(kind==='staff-request'){
  const status=D.staffStatus(game),mayUse=status.hired||(status.legacy&&modal.caskId===null);title='仕込み';body=staffRequestView();
  actions=mayUse?button('依頼','staff-confirm','',staffCanRequest()?'':'disabled'):button('採用 '+money(status.hireCost),'staff-hire-request','',status.canHire&&!game.decisions.length&&!game.trade.offer?'':'disabled');
  if(!staffCanRequest())body+='<p class="quiet">'+(generationState()?.phase!=='working'?'最後の仕込みは自分で行います。':game.usual.reservation?'依頼済み':'今の作業が終わってから')+'</p>';
  actions+=button('戻る','staff-back');
 }else if(kind==='history-generation'){title=generationName(id);body=generationSummaryView(id);actions=button('歩みへ戻る','comparison-back')+(hasCompletedRecall(id)?button('回想を見る','history-recall',id):'');
 }else if(comparisonKinds.includes(kind)){title=({'cask-picker':'比べるたるを選ぶ','cask-comparison':'たるを比べる','release-comparison':'前と比べる','recipe-source':'元の仕込み','recipes':'製法','comparison-brand-record':'記録'})[kind];body=kind==='cask-picker'?caskPickerView():kind==='cask-comparison'?caskComparisonView():kind==='release-comparison'?releaseComparisonView():kind==='recipe-source'?recipeSourceView():kind==='comparison-brand-record'?brandComparisonRecordView(modal.brandId):recipesView();actions=(kind==='release-comparison'&&modal.pair?button('記録','compare-brand-record',modal.pair.current.brandId):'')+button('戻る','comparison-back');
 }else if(kind==='generation-notice'||kind==='generation-review'){
  const g=generationState();if(!g||g.id!==id||g.phase==='working'){modal=null;return;}title=generationName(g.id)+(kind==='generation-review'?'':'の最後の仕込み');
  body=kind==='generation-review'?generationReview(g):'<p>'+monthLabel(g.fixedMonth)+'<br>'+esc(generationCauseText(g))+'</p><p>たる詰め期限 '+monthLabel(g.fixedMonth+12)+'<br>未完成の原酒も引きつぎ</p>'+(game.usual.reservation?.status==='queued'?'<p class="quiet">'+(game.usual.reservation.mode?'繰り返し依頼は引きつぎ時に終了':'仕込み予約は次の代へ引きつぎ')+'</p>':'');
  actions=kind==='generation-review'?(recallPreview?.scenes.length?button('回想を見る','generation-recall',g.id):button('次の代へ引き継ぐ','generation-handover',g.id))+button('歩み','generation-history',g.id):button('仕込みへ','generation-continue',g.id);
 }else if(kind==='history'||kind==='history-brand'||kind==='history-shop'){
  title=kind==='history'?'歩み':kind==='history-brand'?(game.brands.find(b=>b.id===modal.brandId)?.name??'ブランド'):shopName(modal.shopId)+'の記録';
  body=kind==='history'?historyView():kind==='history-brand'?historyBrandView(modal.brandId):historyShopView(modal.shopId);
  actions=button(modal.parent?.kind==='generation-review'?'振り返りへ戻る':modal.parent?'帳面へ戻る':'閉じる','cancel')+(kind==='history'?'':button('歩みへ戻る','history-back'));
 }else if(kind==='stockists'){
  title='取扱店';const shops=knownStockists();
  body=shops.length?'<div class="stockist-list">'+shops.map(shop=>button(esc(shop.name)+'<small>'+stockistStatus(shop.id)+'</small>','stockist-open',shop.id)).join('')+'</div>':'<p>取扱店なし</p>';
  actions=button('戻る','cancel');
 }else if(kind==='market-retail-info'){
  const p=game.core.products.find(x=>x.id===id),sold=game.releases.reduce((n,r)=>n+r.sold,0),revenue=game.releases.reduce((n,r)=>n+r.revenue,0);
  title='自家販売';body='<p>売れ方：少しずつ直接販売</p><p>累計販売 '+sold+'本 · '+unit(revenue)+'</p>'+(p?button('選んだ瓶の価格・情報','market-retail-product',p.id):'');
  actions=button('閉じる','cancel');
 }else if(kind==='stockist'&&D.storeMarketMode(game)&&modal.shopId!=='department'){
  const store=SHOPS.find(x=>x.id===modal.shopId),offer=game.shop.offer?.shopId===modal.shopId?game.shop.offer:null,relations=game.shop.relations.filter(x=>x.shopId===modal.shopId);
  title=store?.name??'取扱店';const preference=D.marketRulesMode(game)?({'town-liquor':'煙・厚み','supermarket':'麦・果実','bar':'煙・味の厚み'}[modal.shopId]):'麦';body=offer?button('申し出を見る','stockist-offer',offer.id):relations.length?'':'<p>取扱いの申し出を待っています。</p>';
  if(modal.greeting&&modal.startedBrandId!==undefined)body='<p class="shop-remark">「'+esc(modal.shopId==='bar'?'では、何本か置いてみましょう。':LIVE_MESSAGE.shopGreeting)+'」</p>'+shopStartedMarkup()+body;
  body=(modal.greeting?'':latestDialogueMarkup(modal.shopId))+body;
  if(preference)body+='<p>好み：'+preference+'</p>';
  if(relations.length){const history=game.shop.deliveries.filter(x=>x.shopId===modal.shopId);body+='<p>累計販売 '+history.reduce((n,x)=>n+x.count,0)+'本 · '+unit(history.reduce((n,x)=>n+x.revenue,0))+'</p>';}
  actions=button('閉じる','cancel');
 }else if(kind==='stockist'){
  if(!knownStockists().some(s=>s.id===modal.shopId)){modal={kind:'stockists'};render();return;}
  title=shopName(modal.shopId);const offers=shopOffers().filter(o=>o.shopId===modal.shopId),items=modal.shopId==='department'||placementEnabled&&modal.shopId==='town-liquor'?stockistProducts(modal.shopId):[];
  const latestDialogue=modal.greeting?'':latestDialogueMarkup(modal.shopId);
  const remark=modal.greeting&&['town-liquor','supermarket','bar'].includes(modal.shopId)?{key:'approved',text:modal.shopId==='bar'?'では、何本か置いてみましょう。':LIVE_MESSAGE.shopGreeting}:shopRemark(game,modal.shopId);body=(latestDialogue||'<p class="shop-remark" data-remark-key="'+esc(remark.key)+'">「'+esc(remark.text)+'」</p>')+(deliveryNotice?'<p class="delivery-confirmation" role="status">'+esc(deliveryNotice)+'</p>':'')+offers.map(o=>button(o.shopId==='department'?'相談':'申し出','stockist-offer',o.id,offerTarget(o)+(o===game.shop.offer?'':' disabled'))+(o===game.shop.offer?'':'<p class="quiet">先の申し出を確認</p>')).join('');
  body+=shopStartedMarkup();
  body+=modal.shopId!=='department'?'<p>'+(placementEnabled&&modal.shopId==='town-liquor'?'自分で届ける':game.shop.relations.some(r=>(r.shopId??'town-liquor')===modal.shopId)?'自動発送':'取扱開始後は自動発送')+' · 月'+SHOPS.find(s=>s.id===modal.shopId).monthlyLimit+'本まで</p>':(items.length?'<div class="stockist-list">'+items.map(({p,r,q})=>button(esc(brandFor(p.id)?.name??'ウイスキー')+'<small>'+releaseTag(p.id)+' · '+esc(releaseSource(p.id))+'<br>在庫 '+p.stock+'本<br>買取 '+unit(q.unitPrice)+'/本'+(q.ok?'':'<br>'+esc(displayReason(q.reason)))+'</small>','stockist-product',p.id,q.ok?'':'disabled')).join('')+'</div>':'<p>現在は納品不可</p><p class="quiet">'+(modal.shopId==='department'&&!D.departmentInterests(game).length?'限定取扱いの相談が必要':'納品できる在庫なし')+'</p>');
  body+=shopOrderMarkup(game,modal.shopId,{monthLabel,minQuantity:SHOPS.find(s=>s.id===modal.shopId)?.minQuantity});
  if(placementEnabled&&modal.shopId==='town-liquor')body+='<div class="stockist-list">'+items.map(({p,q})=>button(esc(brandFor(p.id)?.name??'ウイスキー')+'<small>'+releaseTag(p.id)+' · '+ageLabel(p.age)+'<br>'+D.placementInventory(game,p.id).available+'本'+(q.ok?'':'<br>'+esc(displayReason(q.reason)))+'</small>','stockist-product',p.id,q.ok?'':'disabled')).join('')+'</div>';
  body+=game.brands.filter(b=>game.shop.relations.some(r=>r.brandId===b.id&&r.shopId===modal.shopId)).map(b=>'<div class="brand-readout">'+brandDisplay(b)+'<span>'+esc(b.name)+'</span></div>').join('');
  actions=button('戻る','stockists-back');
 }else if(kind==='stockist-delivery'){
  const p=game.core.products.find(p=>p.id===modal.id),q=D.shopQuote(game,modal.id,modal.shopId);title=shopName(modal.shopId);
  body=(deliveryNotice?'<p class="delivery-confirmation" role="status">'+esc(deliveryNotice)+'</p>':'')+'<p>'+esc(brandFor(modal.id)?.name??'ウイスキー')+'<br>'+releaseTag(modal.id)+' · '+esc(releaseSource(modal.id))+'</p><p>在庫 '+(p?.stock??0)+'本<br>買取 '+unit(q.unitPrice)+'/本</p>'+(q.ok?deliveryButtons(p,q,'shop-deliver'):'<p class="quiet">'+esc(displayReason(q.reason))+'</p>');
  actions=(q.ok?deliveryConfirm(p,q):'')+button('戻る','stockist-back');
 }else if(kind==='shop-offer'){
  const offer=game.shop.offer,brand=game.brands.find(b=>b.id===offer?.brandId);if(!offer||!brand){modal=null;return;}const department=offer.shopId==='department';title=shopName(offer.shopId)+'からの申し出';
  body=department?'<p class="shop-remark">「特選ウイスキーとして、5本お願いできますか。」</p>'+departmentOfferInventory(offer):'<div class="brand-readout">'+brandDisplay(brand)+'<span>'+esc(brand.name)+'</span></div><p>'+esc(shopOfferTerms(offer.shopId))+'</p><p class="quiet">'+(D.storeMarketMode(game)?'この店にお酒を置けるようになります。<br>販売は翌月から。':esc(shopOfferNext(offer.shopId)))+'</p>';
  if(offer.shopId==='supermarket')body='<p class="shop-remark">「こちらでも扱ってみたいのですが。」</p>'+body;
  if(offer.shopId==='town-liquor')body='<p class="shop-remark">「'+esc(brand.name)+'の噂を聞きました。」</p>'+body;
  actions=(department?'':button('受ける','shop-accept','',offerTarget(offer)))+button('あとで','shop-later','',offerTarget(offer))+button('断る','shop-decline','',offerTarget(offer))+(modal.returnModal?button('戻る','stockist-offer-back'):'');
 }else if(kind==='decision'){
  const d=game.decisions[0];if(!d){modal=null;if(dialog.open)dialog.close();return;}
  modal.id=d.caskId;const source=D.currentCask(game,d.caskId),pending=d.pending,copy=agingEventText(pending,source,game.notesById[d.caskId]);
  title=caskName(d.caskId)+' '+copy.title;body='<p>'+esc(uiText(P.casks[source.type].short))+' '+ageLabel(source.age)+'</p>'+(copy.text?'<p>'+esc(copy.text)+'</p>':'');
  if(d.eventId==='order-unmet'){const fallback=D.orderFallbackTerms(game);body+='<p>通常卸売 '+unit(fallback.unitPrice)+'/本 ビン詰め費 '+unit(fallback.bottlingFee)+'/本</p><p class="quiet">自分で販売する場合、熟成を続けられます。</p>';}
  actions=D.contractFor(game,d.caskId)&&d.eventId==='funds'?button('契約を解除してビン詰め','cancel-contract',d.caskId):pending.options.map(o=>button(esc(o.id==='bottle'?'ビン詰め':uiText(o.label))+(o.hint&&o.id!=='cool'?'<small>'+esc(uiText(o.hint))+'</small>':''),o.id==='bottle'?'quote':'choose',d.caskId,'data-choice="'+esc(o.id)+'" data-event="'+esc(d.eventId)+'"')).join('');
  actions+=button('試す','trial',d.caskId);
 }else if(kind==='fill'){
  modal.fillType??=D.operationDefaults(game).caskType;
  const profile=spiritProfile(game.core.spirit),tint=game.core.spirit?.flavor?.version===1?glassColor(game.core.spirit.flavor.profile).color:null,choices=['bourbon','refill'].map(type=>{let reason='';try{nativeModel.fillBarrel(game,type);}catch(error){reason=displayReason(error.message);}return {type,reason};}),selected=choices.find(x=>x.type===modal.fillType);
  title='蒸留結果';body='<section class="fill-result" aria-label="蒸留結果"><p class="fill-volume">原酒 '+game.core.spirit.litres.toFixed(1)+' L</p>'+(profile?.axes??[]).map(axis=>'<div class="fill-result-axis"><span>'+esc(uiText(axis.label))+'</span><span class="fill-result-meter" role="meter" aria-label="'+esc(uiText(axis.label))+'" aria-valuemin="0" aria-valuemax="1" aria-valuenow="'+axis.value+'"><i style="width:'+axis.ratio*100+'%"></i></span></div>').join('')+(profile?.phrase?'<p class="fill-result-phrase">'+(tint?'<span class="fill-flavor-mark" aria-hidden="true" style="background:'+tint+'"></span>':'')+esc(uiText(profile.phrase))+'</p>':'')+'</section><h3 class="fill-heading">たるを選ぶ</h3><div class="bottling-modes" role="group" aria-label="たるの種類">'+choices.map(({type,reason})=>'<div class="fill-choice">'+button('<span class="fill-art choice-art" aria-hidden="true">'+barrel(type)+'</span><span class="choice-name">'+esc(uiText(P.casks[type].short))+'</span><span class="choice-price">'+money(P.casks[type].cost)+'</span>','fill-select',type,'aria-pressed="'+(modal.fillType===type)+'"'+(reason?' disabled':''))+(reason?'<p class="fill-choice-reason">'+esc(reason)+'</p>':'')+'</div>').join('')+'</div>';
  actions=button('たる詰め','fill',modal.fillType??'',selected&&!selected.reason&&(preview||canSave)?'':'disabled')+button('戻る','cancel');
 }else if(kind==='quote'&&c){
  const q=bottleSelection(id);title=D.needsBrandSetup(game)&&!modal.brandDraftConfirmed?'最初のビン':'ビン詰め';
  if(D.needsBrandSetup(game)&&!modal.brandDraftConfirmed){body=brandSetupView();actions=button('次へ','brand-next',id,brandNameError(firstBrandDraft().name)?'disabled':'')+button('戻る','cancel');}else{
  body=brandSetupView()+'<p>'+esc(caskLabel(c))+' '+ageLabel(c.age)+'<br>'+c.litres.toFixed(2)+' L · '+q.max+'本まで</p><label for="bottle-count">本数</label><div class="bottle-count-controls">'+button('−','bottle-less',id,'aria-label="前の本数を選ぶ"'+(q.choices.indexOf(q.count)<=0?' disabled':''))+'<select id="bottle-count"'+(q.affordable<1?' disabled':'')+'>'+q.choices.map(n=>'<option value="'+n+'"'+(n===q.count?' selected':'')+'>'+n+'本'+(n===Math.floor(q.max/2)&&n>1?'（半分）':'')+'</option>').join('')+'</select>'+button('＋','bottle-more',id,'aria-label="次の本数を選ぶ"'+(q.choices.indexOf(q.count)>=q.choices.length-1?' disabled':''))+button('残り全部','bottle-all',id,q.max<1||q.affordable<q.max?'disabled':'')+'</div><p class="quote-numbers"><span id="bottle-cost">費用 '+money(q.cost)+'</span></p><p id="bottle-remainder">'+bottleRemainder(q)+'</p><p id="bottle-cash">ビン詰め後 '+money(game.core.cash-q.cost)+'</p><p id="bottle-count-reason" class="quiet" role="status">'+esc(displayReason(q.reason)||(q.affordable<q.max?'今の資金で '+q.affordable+'本まで':''))+'</p>';
  body+=D.bottlingReservation(game,id)?'<p class="bottling-reservation" role="status">'+esc(reservationLabel(id))+'</p>':'';
  if(D.needsBrandSetup(game))body+='<p class="first-brand-warning">名前・ビン・ラベルは、あとから変更できません。</p>';
  actions=button('ビン詰め','bottle',id,q.ok?'':'disabled')+button('戻る','cancel');}
 }else if(kind==='first-bottle-complete'){
  const brand=game.brands.find(item=>item.id===modal.brandId);
  if(!brand){modal=null;return;}
  title='最初の一本';body=firstBottleCompletion(brand,modal.productId,releasePriceTier(game,modal.productId),{esc},!!modal.ceremonyStarted,releaseFor(modal.productId)?.profile);
 }else if(kind==='bottling-plan'&&c){
  title='ビン詰め';body='<p>'+esc(caskLabel(c))+' '+ageLabel(c.age)+'</p>'+bottlingChoiceView(id);
  const r=D.bottlingReservation(game,id);actions=(modal.staffContext&&r&&r.status!=='completed'?button(r.status==='paused'?'再開':'停止',r.status==='paused'?'bottling-resume':'bottling-pause',id):'')+(modal.staffContext&&r?button('予約取消','bottling-cancel',id):'')+button('戻る',modal.staffContext?'bottling-staff-back':'cancel');
 }else if(kind==='product'&&D.storeMarketMode(game)){
  const p=game.core.products.find(x=>x.id===id),r=releaseFor(id),meta=game.productsById[id];
  if(!p||!r||!meta){modal=null;return;}
  const prices=D.salePrices(game,id),inv=D.storeMarketInventory(game,id),entry=ledgerData().entries.find(e=>e.releaseId===r.id);
  title=(brandFor(id)?.name??'AmberTime')+' 第'+placementReleaseNumber(p)+'回';
  body='<div class="product-overview"><div class="modal-bottle">'+productArt(p)+'</div><p>'+ageLabel(p.age)+' · 手元 '+inv.hand+'本</p></div>'+flavorTypeView(r.profile)+'<p>価格 '+unit(prices[meta.selectedPrice])+' / 本</p><div class="price-options">'+['low','standard','high'].map((tier,i)=>button(['低め','ふつう','高め'][i]+'<span>'+unit(prices[tier])+'</span>','price',id,'data-tier="'+tier+'" aria-pressed="'+(meta.selectedPrice===tier)+'"')).join('')+'</div>'+(entry?button('元の記録','ledger-release',entry.key):'')+releaseComparisonButton(r);
  const invitation=shopOffers().find(x=>x.brandId===r.brandId&&x.shopId==='department');
  if(D.departmentInterests(game,r.brandId).length||D.departmentAdoptions(game,r.brandId).length||invitation)body+=departmentDestination(p,r,invitation);
  actions=button('閉じる','cancel');
 }else if(kind==='product'){
  const p=game.core.products.find(x=>x.id===id),meta=game.productsById[id];if(!p){modal=null;render();return;}
  const prices=D.salePrices(game,id),record=game.records.find(r=>r.productId===id);title=(brandFor(id)?.name??record?.name??'この一本')+(releaseTag(id)?' '+releaseTag(id):'');
  const release=releaseFor(id),destinations=SHOPS.map(shop=>({shop,stockist:D.shopBrandStats(game,release?.brandId,shop.id),invitation:shopOffers().find(o=>o.brandId===release?.brandId&&o.shopId===shop.id),quote:D.shopQuote(game,id,shop.id)})).filter(x=>x.stockist||x.invitation);
  if(modal.placementLegacy){
   const target=destinations.find(x=>x.shop.id===modal.destination&&x.shop.id!=='town-liquor');
   if(target){
    const {shop,stockist,invitation,quote:q}=target;
    body=shop.id==='department'?departmentDestination(p,release,invitation):'<section class="sales-destination shop-delivery"><h3>'+esc(shop.name)+'</h3><p class="quiet">'+esc(shopTerms(shop.id))+'</p>'+(invitation?button('申し出','shop-open-offer','',invitation===game.shop.offer?'':'disabled'):'')+(stockist?'<p>自動発送 · 月'+shop.monthlyLimit+'本まで</p><p>'+unit(q.unitPrice)+'/本</p>':'')+'</section>';
    actions=button('戻る','placement-return')+button('閉じる','cancel');
   }else modal.placementLegacy=false;
  }
  if(!modal.placementLegacy){
   const priceMarkup='<p class="placement-current-price">価格 '+unit(prices[meta.selectedPrice])+' / 本</p><details><summary>価格</summary><div class="price-options">'+['low','standard','high'].map((tier,i)=>button(['低め','ふつう','高め'][i]+'<span>'+unit(prices[tier])+'</span>','price',id,'data-tier="'+tier+'" aria-pressed="'+(meta.selectedPrice===tier)+'"')).join('')+'</div></details>';
   const otherMarkup=destinations.filter(x=>x.shop.id!=='town-liquor').map(x=>button(x.shop.name,'placement-existing',x.shop.id)).join('')+destinations.filter(x=>x.invitation&&x.shop.id==='town-liquor').map(x=>button('町の酒店の申し出','shop-open-offer')).join('');
   title=(brandFor(id)?.name??'この一本')+' 第'+placementReleaseNumber(p)+'回';
   const entry=ledgerData().entries.find(e=>e.releaseId===release?.id),summary=flavorTypeView(release?.profile).replace(/<small>[\s\S]*?<\/small>/g,'');
   const recordLink=entry?button('元の記録','ledger-release',entry.key):'';
   const v=placementUI.markup(id,{details:summary+recordLink+releaseComparisonButton(release),prices:priceMarkup,other:otherMarkup});body=v.body;actions=v.actions;
  }

 }
 if(kind==='product')body=shopStartedMarkup()+body;
 const activeCask=['decision','quote','contract-bottle'].includes(kind)?modal.id:null,waiting=game.decisions.filter(d=>d.caskId!==activeCask).length+(game.trade.offer&&kind!=='offer'?1:0)+shopOffers().filter(o=>!o.notified&&(kind!=='shop-offer'||o.id!==modal.offerId)).length;$('dialog-context').textContent=waiting?'このあと判断 '+waiting+'件':'';$('dialog-context').hidden=!waiting||kind==='staff-opportunity';
 $('dialog-error').hidden=$('storage-notice').hidden;$('dialog-error').textContent=$('storage-notice').textContent;
 dialog.classList.toggle('daily-map',kind==='world-map'&&modal.source!=='unlock');
 $('dialog-title').textContent=title;
 $('dialog-title').hidden=kind==='world-map'&&modal.source==='unlock';
 const nativePanel=kind==='inspect'?'selected-cask':kind==='staff-panel'?'staff-panel':kind==='aux-panel'?'aux-panel':null;
 if(nativePanel){
  if($(nativePanel).parentElement!==$('dialog-body')){vaultPanels();$('dialog-body').replaceChildren($(nativePanel));$('dialog-actions').replaceChildren();}
  if(kind==='inspect'){for(const id of ['free-actions','tasting-actions'])if($(id).parentElement!==$('dialog-actions'))$('dialog-actions').append($(id));}
  else $('dialog-actions').innerHTML=actions;
 }else{vaultPanels();
  if(kind!=='world-map'||!$('world-map-canvas')||$('dialog-body').dataset.mapMarkup!==body){const previousCanvas=kind==='world-map'?$('world-map-canvas'):null;$('dialog-body').innerHTML=body;delete $('dialog-body').dataset.mapMarkup;if(kind==='world-map'){$('dialog-body').dataset.mapMarkup=body;const fresh=$('world-map-canvas');if(previousCanvas&&fresh){previousCanvas.setAttribute('aria-label',fresh.getAttribute('aria-label'));fresh.replaceWith(previousCanvas);}}}
  $('dialog-actions').innerHTML=actions;
 }
 if(kind==='product'&&placementEnabled&&!D.storeMarketMode(game)&&!modal.placementLegacy)placementUI.update();
 if(kind==='flavor-cards')renderBrewingIcons($('dialog-body'));
 if(kind==='world-map'){const canvas=$('world-map-canvas');if(canvas){const progress=mapProgress(game),key=JSON.stringify([worldMapStage,progress.max,progress.reached,[...progress.activeShops]]);const same=canvas.dataset.paintKey===key;const shown=same?worldMapStage:drawGameMap(canvas,game,worldMapStage);if(!same)canvas.dataset.mapDraws=String(Number(canvas.dataset.mapDraws??0)+1);canvas.dataset.paintKey=key;if(!document.hidden&&shown>mapShown){mapShown=shown;mapNoticeSave();}}}
 if(kind==='first-bottle-complete')modal.ceremonyStarted=true;
 dialog.dataset.kind=kind;$('close-dialog').hidden=kind==='decision'||kind==='generation-review'||kind==='first-bottle-complete'||kind==='world-map'&&modal.source==='unlock';
 if(!dialog.open){$('dialog-title').removeAttribute('tabindex');dialog.showModal();if(pointerInteraction){$('dialog-title').tabIndex=-1;$('dialog-title').focus({preventScroll:true});}}
 else if(previousKind!==kind&&['stockists','stockist','stockist-delivery','staff-opportunity','staff-manager','staff-panel','bottler-panel'].includes(kind)){if(pointerInteraction){$('dialog-title').tabIndex=-1;$('dialog-title').focus({preventScroll:true});}else document.querySelector('#dialog-body button:not(:disabled), #dialog-actions button')?.focus({preventScroll:true});}
 else if(previousKind!==kind&&kind==='first-bottle-complete')$('dialog-body').querySelector('[data-action="first-bottle-proceed"]')?.focus({preventScroll:true});
 acknowledgeStaffOpportunity();
 if(kind==='world-map')observeMapLabels();else{mapLabelObserver?.disconnect();mapLabelObserver=null;}
}
function renderSpirit(){
 const panel=$('spirit-readout');if(!panel)return;
 const view=distillationReadout(game);
 // During a cut the bar and symbolic receiver convey selection, not litres.
 const cutInProgress=game?.still.phase==='distilling'&&!!game.still.distillation?.labChoice;
 const display=spiritReadoutView(view,{cutInProgress,modalKind:modal?.kind,collectionVersion:game?.still?.distillation?.collectionVersion});
 panel.hidden=display.hidden;if(panel.hidden)return;
 $('spirit-kind').textContent=display.kind;
 $('spirit-phrase').textContent=display.phrase;
 $('spirit-gauges').hidden=display.gaugesHidden;
 $('spirit-volume').textContent=display.volume;
 for(const axis of display.axes){const meter=$('spirit-'+axis.id);meter.setAttribute('aria-valuenow',axis.value);meter.setAttribute('aria-valuetext',axis.valueText);meter.style.setProperty('--flavor-fill',axis.ratio);}
}
// Extraction-only steps leave these facts unchanged. This is a presentation
// snapshot, not a validator cache: actions and saves still validate strictly.
// Operation/month/phase/cash/staff/reservation/recipe/capacity changes invalidate
// it; boot and reset discard it even if a legacy save has the same counters.
let staffDisplayKey=null,staffDisplay=null;
function staffDisplayStatus(){
 const key=JSON.stringify([game.seed,game.operations.length,game.operations.at(-1),game.core.month,game.core.cash,game.still.phase,game.staff,game.staffProgression,game.usual,game.recipeBook?.selectedId,game.core.casks.length,game.core.products.length]);
 if(key!==staffDisplayKey){staffDisplay=D.staffStatus(game);staffDisplayKey=key;}
 return staffDisplay;
}
function renderProgress(){
 document.body.style.setProperty('--month-progress',elapsed/T.monthMs);
 scene.updateProgress(elapsed/T.monthMs);
}
function render(){
 if(countdown.active&&(modal||room!=='distill'||document.hidden))countdown.cancel();
 if(!game)return;
 distillRoom.invalidate(game.still.phase,game.core.lastDistillation);
 $('settings-source').hidden=true;
 warehouseRoom.reconcile(game.core.casks,game.tastingId);
 if(game.tastingId!==null){room='warehouse';if(!modal)modal={kind:'inspect',id:warehouseRoom.selectedId};}
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
 $('open-world-map').disabled=!mapProgress(game).bottled&&mapShown===0;$('open-world-map').hidden=$('open-world-map').disabled;
 $('open-m0-map').hidden=true; // The original map control is the single entrance in the sales room.
 $('open-world-map').textContent='地図';
 $('start-distill').hidden=countdown.active||phase!=='ready'||!D.stage4Mode(game);$('stop-distill').hidden=automatic||phase!=='distilling'||atLimit;$('open-fill').hidden=true; // Barrel selection now belongs exclusively to the fill modal.
 const gen=generationState();$('generation-name').textContent=gen?generationName(gen.id):'';const banner=$('generation-notice');banner.hidden=!gen||gen.phase==='working';banner.textContent=gen?.phase==='last-batch'?generationName(gen.id)+'の最後の仕込み · '+monthLabel(gen.fixedMonth+12)+'まで':gen?.phase==='review'?generationName(gen.id)+'の歩みを確認します。':'';
 const start=D.canStart(game);$('start-distill').disabled=countdown.active||!start.ok;const confirmedChoice=D.stage4Mode(game)?brewingPanelState(game,distillRoom.confirmation):null;$('start-distill').textContent='仕込み '+money(P.distillationCost)+(confirmedChoice?'・'+({plain:'ふつう',peat:'ピート'}[confirmedChoice.malt])+'・'+({short:'短め',long:'長め'}[confirmedChoice.ferment]):'');
 const collection=D.collectionState(game);$('stop-distill').hidden=true;const access=$('collection-access');access.hidden=room!=='distill';access.setAttribute('aria-valuenow',String(Math.round(100*Math.max(0,collection.current))));access.setAttribute('aria-valuetext',collection.enabled?'現在 '+Math.round(Math.max(0,collection.current)*100)+'％'+(collection.start===null?' · 採取前':' · 開始 '+Math.round(collection.start*100)+'％')+(collection.end===null?'':' · 終了 '+Math.round(collection.end*100)+'％'):'採取前');$('stop-distill').textContent=collection.expired?'やり直す':collection.enabled&&!collection.collected?'ここから取る':'ここまで取る';$('stop-distill').disabled=collection.expired?false:collection.enabled?(collection.collected?!collection.canStop:!collection.canStart):(game.still.distillation?.progress??0)<T.minimumStop;
 $('collection').hidden=true;
 renderSpirit();
 $('distill-caption').hidden=phase!=='ready'||start.ok;
 $('distill-caption').textContent=phase==='ready'&&!start.ok&&!reservation?displayReason(start.reason):'';
 $('distill-direction').hidden=true;$('distill-direction').textContent='';
 const quote=D.usualQuote(game),reference=D.selectedUsualRecipe(game),recipe=reservation?.recipe??reference,staff=staffDisplayStatus();
 const chosen=game.recipeBook?.entries.find(r=>r.id===game.recipeBook.selectedId);
 const bottler=D.bottlingStaffStatus(game),staffAccess=roomStaffAccess(room,{distill:staff,bottling:bottler});$('staff-panel').hidden=!staff.unlocked;
 $('open-staff-panel').hidden=!staffAccess;$('open-staff-panel').textContent=staffAccess?.label??'担当者';$('open-staff-panel').setAttribute('aria-label',(staffAccess?.label??'担当者')+'を開く');
 $('staff-heading').innerHTML='<span class="staff-person" aria-hidden="true"></span>蒸留担当者';
 $('hire-staff').hidden=!staff.unlocked||staff.hired;$('hire-staff').disabled=!staff.canHire||tasting||(!!modal&&modal.kind!=='staff-panel')||game.decisions.length>0||!!game.trade.offer;
 $('hire-staff').textContent='採用';
 $('staff-terms').innerHTML=copyFacts([...(staff.hired?[]:[['採用費',money(staff.hireCost)]]),['給与',money(reservation?reservation.salary??0:staff.salary)+'／仕込み']]);
 $('staff-legacy').hidden=!staffMigrationNotice||!staff.legacy||staff.hired;$('staff-legacy').textContent='旧予約は継続。新規依頼から給与がかかります。';
 $('staff-hire-reason').textContent=!staff.hired&&!staff.canHire?uiText(staff.reason):'';
 $('manual-reference').hidden=true;$('manual-reference').textContent=chosen?'参照 '+(chosen.name||pastCaskName(chosen.source.caskId,chosen.source)+'の製法')+' · 抽出位置 '+chosen.stopAt+' / '+extractionMaximum+' · '+uiText(P.casks[chosen.type].short):'';
 $('open-recipes').hidden=!!reservation;$('open-recipes').disabled=!!reservation||!!modal&&modal.kind!=='staff-panel';
 $('usual-recipe').innerHTML=recipe?copyFacts([['製法',reservation?.source?pastCaskName(reservation.source.caskId,reservation.source):chosen?(chosen.name||pastCaskName(chosen.source.caskId,chosen.source)+'の製法'):'前回の手動仕込み'],['採取',rangeText(recipe.flavorChoice,recipe.stopAt)],['たる',uiText(P.casks[recipe.type].short)]]):'';
 $('reserve-usual').hidden=!!reservation||!staff.hired;$('reserve-usual').disabled=!recipe||phase!=='ready'||tasting||(!!modal&&modal.kind!=='staff-panel')||gen?.phase!=='working';
 $('cancel-usual').hidden=!reservation||automatic&&(!reservation.mode||reservation.stopAfter);
 $('cancel-usual').textContent=automatic?'今回で終了':'停止';
 const staffView=staffStatusView({hired:staff.hired,reservation,automatic,full:game.core.casks.length>=P.maxCasks||game.core.products.filter(p=>p.stock>0).length+game.core.casks.length>=P.maxProducts,judgment:!!(game.decisions.length||game.trade.offer||game.shop?.offer&&!game.shop.offer.notified||gen?.phase!=='working'),cash:game.core.cash,canBegin:reservation?D.canBeginUsual(game):null});
 const staffBrief=staffView.brief,staffWaitReason=staffView.blockingReason?uiText(staffView.blockingReason===staffBrief?staffBrief:staffBrief+' · '+staffView.blockingReason):'';
 $('usual-status').textContent=uiText(staffView.detail);
 const rk=JSON.stringify([caskSlots,game.core.casks.map(c=>[c.id,c.age,c.litres,game.notesById[c.id]?.cooled,reservationLabel(c.id)]),warehouseRoom.selectedId,game.generations]);
 if(rk!==rackKey){$('cask-rack').innerHTML=slotCasks().map((c,i)=>c?'<button type="button" data-cask-id="'+c.id+'" aria-label="'+esc(caskLabel(c)+' · '+ageLabel(c.age)+' · '+c.litres.toFixed(1)+' L'+(game.notesById[c.id]?.cooled?' · 冷暗所':''))+'" aria-pressed="'+(warehouseRoom.selectedId===c.id)+'"><span class="shelf-art" aria-hidden="true">'+barrel(c.type)+'</span><strong>'+caskName(c.id)+'</strong><small>'+ageLabel(c.age)+'</small></button>':'<span class="shelf-space" aria-label="たる'+(i+1)+' 空き"></span>').join('');rackKey=rk;}
 const contracted=false;$('bottling-status').textContent=warehouseRoom.selectedId!==null?reservationLabel(warehouseRoom.selectedId):'';
 const canCool=D.freeAgingMode(game)&&warehouseRoom.selectedId!==null&&D.canCare(game,warehouseRoom.selectedId);for(const id of ['cool-cask','cool-tasting'])$(id).hidden=!canCool;const hasBottler=D.bottlingStaffStatus(game).hired;$('open-bottle').hidden=hasBottler;$('taste-bottle').hidden=hasBottler;const inlineBottling=$('cask-bottling-modes');inlineBottling.hidden=!hasBottler;inlineBottling.innerHTML=hasBottler&&warehouseRoom.selectedId!==null?'<div class="bottling-modes" role="group" aria-label="ビン詰めの方式">'+button('自分で行う','bottling-manual',warehouseRoom.selectedId,'aria-pressed="'+(D.bottlingReservation(game,warehouseRoom.selectedId)?.status!=='active')+'"')+button('任せる','bottling-delegate',warehouseRoom.selectedId,'aria-pressed="'+(D.bottlingReservation(game,warehouseRoom.selectedId)?.status==='active')+'"'+(D.bottlingReservation(game,warehouseRoom.selectedId)?.status==='active'?' disabled':''))+'</div>':'';
 $('open-bottle').textContent='ビン詰め';$('taste-bottle').textContent=game.trade.order?.status==='unmet'&&game.trade.order.caskId===warehouseRoom.selectedId?'販売方法を選ぶ':'ビン詰め';
 $('warehouse-empty').hidden=game.core.casks.length>0;$('selected-cask').hidden=warehouseRoom.selectedId===null||modal?.kind!=='inspect';$('close-cask-window').hidden=true;
 if(warehouseRoom.selectedId!==null){
  const c=D.currentCask(game,warehouseRoom.selectedId),n=game.notesById[c.id];if(barrelKey!==c.id){$('barrel').innerHTML=barrel(c.type);barrelKey=c.id;}
  $('cask-kind').textContent=caskLabel(c)+(provenanceLabel(c.id)?' · '+provenanceLabel(c.id):'');$('cask-provenance').textContent=provenanceLabel(c.id);$('age').textContent=ageLabel(c.age)+(n.cooled?' · 冷暗所':'');const gk=c.id+':'+c.wood;if(glassKey!==gk){$('glass').innerHTML=glass(c.wood,{sample:true});glassKey=gk;}$('amount').textContent=c.litres.toFixed(1)+' L';$('loss').textContent='蒸発 −'+Math.max(0,c.initialLitres-c.litres-(game.batchesById[c.id]?.withdrawnLitres??0)).toFixed(1)+' L';$('change').textContent=c.flavor?'':uiText(D.observation(game,c.id).change);const cp=$('connected-profile');cp.hidden=!c.flavor||tasting;if(c.flavor)cp.innerHTML=caskDetailProfile(c);$('last-taste').textContent=n.samples.length?'前回 '+ageLabel(n.samples.at(-1).age):'試飲記録なし';const feedback=caskFeedback(game,c);$('cask-feedback').hidden=tasting||!feedback;$('cask-feedback').textContent=feedback?.text??'';
  $('tasting-panel').hidden=!tasting||modal?.kind!=='inspect';$('tasting-actions').hidden=!tasting||modal?.kind!=='inspect';$('free-actions').hidden=tasting||modal?.kind!=='inspect';
  if(tasting){
   const comp=D.comparison(game,c.id),previous=comp.previous?.profile,hasPrevious=FLAVOR_AXES.some(({key})=>Number.isFinite(previous?.[key])&&previous[key]>=0&&previous[key]<=1.35);
   $('taste-date').textContent=ageLabel(comp.current.age)+'の試飲';
   $('taste-current').innerHTML=flavorTypeView(comp.current.profile)+FLAVOR_AXES.map(({label,key})=>'<section class="tasting-flavor"><h3>'+esc(label)+'</h3>'+flavorMeter(comp.current.profile,key,{previousProfile:previous,previousLabel:comp.previous?'前回 '+ageLabel(comp.previous.age):'前回'})+'</section>').join('');
   $('taste-previous').hidden=!comp.previous;$('taste-previous').innerHTML=hasPrevious?symbolMarkup('chevronDown')+'前回 '+ageLabel(comp.previous.age):comp.previous?'前回の味は不明':'';
  }
 }
 for(const id of ['compare-cask','compare-tasting'])$(id).hidden=game.core.casks.length<2;
 const shelfProducts=game.core.products.filter(p=>p.stock>0),shelfPageCount=Math.max(1,Math.ceil(shelfProducts.length/4));shelfPage=Math.min(shelfPage,shelfPageCount-1);const shelfStart=shelfPage*4;
 const sk=JSON.stringify(placementEnabled?[game.core.products,game.productsById,game.brands,selectedProductId,game.generations,shelfPage,game.placement]:[game.core.products,game.productsById,game.brands,selectedProductId,game.generations,shelfPage]);if(sk!==shelfKey){$('product-shelf').innerHTML=shelfProducts.slice(shelfStart,shelfStart+4).map(p=>'<button type="button" data-product-id="'+p.id+'" aria-label="'+esc((brandFor(p.id)?.name??'この一本')+' · '+releaseTag(p.id)+' · '+displayProductStock(p)+'本 · '+productSaleState(p))+'" aria-pressed="'+(selectedProductId===p.id)+'"><span class="shelf-art" aria-hidden="true">'+productArt(p)+'</span><strong>'+esc(brandFor(p.id)?.name??game.records.find(r=>r.productId===p.id)?.name??'この一本')+'</strong>'+provenanceTag(releaseFor(p.id)?.caskId)+'<small>'+releaseTag(p.id)+' · '+ageLabel(p.age)+'</small><small>'+p.stock+'本 · '+productSaleState(p)+'</small></button>').join('')+'<span class="shelf-space" aria-hidden="true"></span>'.repeat(Math.max(0,4-shelfProducts.slice(shelfStart,shelfStart+4).length));shelfKey=sk;}
 $('shelf-pages').hidden=shelfPageCount<=1;const pageButtons=$('shelf-pages').querySelectorAll('button');pageButtons[0].disabled=shelfPage===0;pageButtons[1].disabled=shelfPage+1>=shelfPageCount;$('shelf-pages').querySelector('span').textContent=(shelfPage+1)+' / '+shelfPageCount;

 $('sales-empty').hidden=game.core.products.some(p=>p.stock>0);const last=game.core.lastMonth;$('sales-result').textContent=last?monthLabel(last.month)+' '+last.bottles+'本\n売上 '+money(last.revenue):'';
 $('toggle-time').textContent=(!preview&&!canSave)?'保存待ち':userPaused||runtimeHalted||heldRange()?(phase==='distilling'&&!atLimit?'蒸留を再開する':'時間を進める'):'時間を止める';$('time-controls').hidden=tasting||!!modal;
 $('toggle-time').disabled=countdown.active||heldRange()||!hasMonthlyWork()||(!preview&&!canSave);$('toggle-speed').disabled=countdown.active||!game||(!preview&&!canSave);$('toggle-speed').textContent=playbackRate===2?'1倍':'2倍';$('toggle-speed').setAttribute('aria-pressed',String(playbackRate===2));
 $('time-status').textContent=(!preview&&!canSave)?'保存エラー・停止中':modal||marketEditing?'確認中・停止中':tasting?'試飲中・停止中':document.hidden?'画面を離れて停止中':runtimeHalted?'資金を残して停止中':userPaused||heldRange()?'停止中':!hasMonthlyWork()?'停止中':playbackRate===2?'2倍速で進行中':'進行中';
 $('time-change').textContent=last?monthLabel(last.month)+' 維持費 '+money(last.upkeep)+(last.revenue?' · 売上 '+money(last.revenue):''):'';
 $('records').hidden=true;
 automaticNews.update();
 const comment=room==='sales'?recentCustomerFeedback(game,feedbackComments.read(game)):null,aging=room==='warehouse'?warehouseFeedback(game):null;
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
  cutRange:collection.enabled?collection:D.stage4Mode(game)?{enabled:true,fullRange:true,current:0,start:null,end:null}:{current:0,start:null,end:null},cutCondition:game.still.distillation?.labChoice??game.core.spirit?.flavor?.choice??(D.stage4Mode(game)?manualCards(game):null),staffAvailable:!$('open-staff-panel').hidden,phaseSummary:phase==='distilling'&&collection.enabled&&!collection.fullRange?'以前の蒸留を続けています。':!reservation&&!start.ok&&phase==='ready'?displayReason(start.reason):staffWaitReason,staffBrief:room==='distill'&&(staff.hired||reservation)?staffBrief:'',
  notice:!$('storage-notice').hidden?$('storage-notice').textContent:!banner.hidden?banner.textContent:runtimeHalted?$('work-notice').textContent:'',
  casks:slotCasks().filter(Boolean).map(c=>({id:c.id,slot:caskSlots.indexOf(c.id)+1,type:c.type,wood:c.wood,name:caskName(c.id).replace(/^たる /,''),flavorName:c.flavor?.label??null,age:ageLabel(c.age),reservationIcon:reservationSymbol(c.id),cooled:game.notesById[c.id]?.cooled===true,selected:c.id===warehouseRoom.selectedId})),
  products:shelfProducts.slice(shelfStart,shelfStart+4).map(p=>({id:p.id,releaseId:releaseFor(p.id)?.id??null,wood:p.wood,brand:brandFor(p.id),priceTier:releasePriceTier(game,p.id),name:(brandFor(p.id)?.name??'AmberTime')+'\n'+releaseTag(p.id).replace(' · たる No.',' No.').replace(' · ',' '),state:placementEnabled?displayProductStock(p)+'本':displayProductStock(p)+'本 · '+productSaleState(p),releaseDate:placementEnabled?placementShelfLabel(p):releaseTag(p.id).split(' · ')[0],stock:displayProductStock(p),saleState:placementEnabled?placementShelfRelease(p):productSaleState(p),selected:p.id===selectedProductId})),pageCount:shelfPageCount,pageLabel:(shelfPage+1)+' / '+shelfPageCount});
 $('scene-notice').setAttribute('aria-live',D.storeMarketMode(game)&&room==='sales'&&!modal?'off':'polite');
 marketUI.update({sessionActive:room==='sales',visible:D.storeMarketMode(game)&&room==='sales'&&!modal&&(preview||canSave),preserveEditing:modal?.kind==='world-map'||!!modal?.mapParent,notice:!$('storage-notice').hidden?$('storage-notice').textContent:!banner.hidden?banner.textContent:runtimeHalted?$('work-notice').textContent:''});
 m0.update();
 dialogueNotice.update();
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
$('open-staff-panel').addEventListener('click',openRoomStaff);
$('open-aux-menu').addEventListener('click',()=>openModal('aux-panel'));
$('open-world-map').addEventListener('click',()=>{
 // Ordinary browsing uses the same M0 drawer in all three rooms.
 // The separate first-unlock presentation is still owned by its native event.
 if(!modal&&game&&(preview||canSave)){m0.open();return;}
 openDailyMap();
});

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
$('open-m0-map').addEventListener('click',()=>{if(room==='sales'&&!modal&&game)m0.open();});
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
 if(a==='staff-opportunity-hire'&&kind==='staff-opportunity'&&b.dataset.id===modal.job){const job=modal.job,target=modal.source==='room'?{kind:job==='distill'?'staff-panel':'bottler-panel'}:modal.returnModal??null;act(job==='distill'?D.hireStaff:D.hireBottlingStaff,()=>{modal=target;});return;}
 if(a==='staff-job-hire'&&kind==='staff-manager'&&['distill','bottling'].includes(b.dataset.id)&&jobStatus(b.dataset.id).canHire){modal={kind:'staff-opportunity',job:b.dataset.id,returnModal:modal};render();return;}
 if(a==='staff-job-open'&&kind==='staff-manager'){if(b.dataset.id==='distill'&&D.staffStatus(game).hired){modal={kind:'staff-panel'};render();}else if(b.dataset.id==='bottling'&&D.bottlingStaffStatus(game).hired){modal={kind:'bottler-panel'};render();}return;}
 if(a==='staff-manage-back'&&['staff-panel','bottler-panel'].includes(kind)){closeModal();return;}
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
  try{const next=D.enableShopDialogue(D.enableAlleyBar(D.enableMarketRules(before)));if(!saveCandidate(next,userPaused,elapsed,commitMarketRulesUpdate)){render();return;}game=next;runtimeHalted=false;storageNotice('');marketUI.reset();render();schedule();}catch(error){storageNotice(error.message);render();}return;
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
 if(a==='shop-accept'||a==='shop-decline'){if(kind==='shop-offer'){const target={...modal},startedBrandId=game.shop.offer?.brandId;act(s=>(a==='shop-accept'?D.acceptShop:D.declineShop)(s,target.shopId,target.offerId),()=>{modal=target.returnModal??(target.returnProductId!==null?{kind:'product',id:target.returnProductId}:null);room='sales';if(a==='shop-accept'&&['town-liquor','supermarket','bar'].includes(target.shopId)){if(modal?.kind==='product')deliveryNotice='「'+(target.shopId==='bar'?'では、何本か置いてみましょう。':LIVE_MESSAGE.shopGreeting)+'」';else modal={kind:'stockist',shopId:target.shopId,greeting:true};message('');}else message(a==='shop-accept'?(target.shopId==='department'?'取扱いの相談を残しました。':shopName(target.shopId)+'で取扱いが始まりました。'):'今回は見送りました。');},()=>{if(a==='shop-accept'&&['town-liquor','supermarket','bar'].includes(target.shopId)){if(modal?.kind==='product')Object.assign(modal,{greeting:true,startedShopId:target.shopId,startedBrandId});else if(modal?.kind==='stockist')modal.startedBrandId=startedBrandId;}});}return;}
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
 dialogueNotice.reset();dialogueProjection.reset();
 countdown.cancel();stopClock();game=session.game;caskSlots=session.caskSlots;recentLedger=session.recentLedger;historyRecord=session.historyRecord;pendingRecall=recallRecord=session.recallRecord;recallPreview=null;userPaused=session.userPaused;elapsed=session.elapsed;
 if(manualDistilling())userPaused=true;
 committedSession={...session,caskSlots:[...caskSlots]};canSave=!preview;runtimeHalted=false;lastSaveError=null;
 distillRoom.reset();scene.resetMotion();marketUI.reset();m0.reset();placementUI?.reset();marketEditing=false;feedbackComments.reset();staffDisplayKey=null;staffDisplay=null;
 automaticNews.reset();staffMigrationNotice=false;shownFillSpiritId=null;modal=null;playbackRate=1;glassKey='';shelfPage=0;
 if(fresh){mapShown=0;mapAnnounced=0;mapPending=0;mapBrowse=null;try{mapUIStorage()?.removeItem(MAP_VIEW_KEY);}catch{}mapNoticeSave();}
 else mapNoticeLoad(true);
 warehouseRoom.select(game.tastingId??game.core.casks[0]?.id??null);room=warehouseRoom.selectedId!==null?'warehouse':'distill';
 // Persist the replay boundary before allowing the bar to make future offers.
 let barMigrationFailed=false;
 if(D.marketRulesMode(game)&&!D.alleyBarMode(game)){
  try{const next=D.enableAlleyBar(game);if(saveCandidate(next)){game=next;}else barMigrationFailed=true;}
  catch(error){barMigrationFailed=true;saveFailure(error,'バーの取扱い更新');}
 }
 // Persist the presentation boundary before the new voices become eligible.
 // The current month and all earlier dialogue remain v1, including imported saves.
 if(!barMigrationFailed&&D.marketRulesMode(game)&&!D.shopDialogueMode(game)){
  try{const next=D.enableShopDialogue(game);if(saveCandidate(next)){game=next;}else barMigrationFailed=true;}
  catch(error){barMigrationFailed=true;saveFailure(error,'店舗会話の更新');}
 }
 $('game').hidden=false;if(!barMigrationFailed)$('recovery').hidden=true;if(!barMigrationFailed){storageNotice('');$('save-status').textContent=preview?'試遊中 · 保存しません':'保存済み';}render();schedule();
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
const m0=createM0Observation({document,state:()=>game,model:D,room:()=>room,modal:()=>modal,art:productArt,stage:()=>worldMapStage});
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
