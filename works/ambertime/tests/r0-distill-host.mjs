import {FormalIdbCommitBoundary} from '../formal-idb-commit-boundary.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../recent-ledger.mjs';
import {createWarehouseRoomController} from '../warehouse-room-controller.mjs';
// Execute current application boundaries. DOM/clock/notice adapters are inert;
// formal operations, serialization, conditional writes and handlers are real.
import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {manualCompletedRuns} from '../distill-learning.mjs';
import {distillToolsView,rangeRestartAvailable} from '../distill-tools-view.mjs';
import {distillationReadout,spiritProfile} from '../spirit-view.mjs';
import {manualCards} from '../brewing-cards.mjs';
import {createDistillRoomController} from '../distill-room-controller.mjs';
import {writeCandidate,serializeSession,readSession,FORMAL_SAVE_KEY} from '../placement-save.mjs';
import {ECONOMY_PARAMETERS as P,PARALLEL_PARAMETERS as NATIVE_TIME} from '../economy-parameters.mjs';
import {barrel} from '../cask-glass-art.mjs';
import {glassColor} from '../flavor-color.mjs';
export const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
export function extract(name){
 const start=source.indexOf('function '+name+'(');assert(start>=0,name);let depth=0,quote=null,escape=false,line=false,block=false;
 for(let i=source.indexOf('{',start);i<source.length;i++){
  const c=source[i],next=source[i+1];
  if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&next==='/'){block=false;i++;}continue;}
  if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}
  if(c==='/'&&next==='/'){line=true;i++;continue;}if(c==='/'&&next==='*'){block=true;i++;continue;}
  if(c==="'"||c==='"'||c==='`'){quote=c;continue;}
  if(c==='{')depth++;else if(c==='}'&&--depth===0){const text=source.slice(source.slice(start-6,start)==='async '?start-6:start,i+1);new vm.Script(text);return text;}
 }throw Error('Unclosed function '+name);
}
export function host({preview=false,state=D.selectFlavorCards(D.newMarketRulesDistillery(42),{malt:'plain',ferment:'short'}),restored=false,scene:scenePort={isDistillCompletion:()=>false,startDistillCompletion:()=>false,cancelDistillCompletion(){}}}={}){
 let raw=JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(state)),userPaused:false,elapsed:0}),writes=0,reads=0,fail=false;
 const storage={getItem(){reads++;return raw;},setItem(key,value){writes++;if(fail)throw Error('storage denied');raw=value;}};
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},hidden:true,textContent:'',innerHTML:'',open:false,classList:{toggle(){}},querySelector(){return {focus(){}};},removeAttribute(){},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const ctx={FormalIdbCommitBoundary,migrateRecentLedger,advanceRecentLedger,WeakMap,initializeCaskSlots,reconcileCaskSlots,scene:scenePort,D,createDistillRoomController,createWarehouseRoomController,manualCompletedRuns,distillToolsView,rangeRestartAvailable,distillationReadout,spiritProfile,manualCards,writeCandidate,serializeSession,SAVE_KEY:FORMAL_SAVE_KEY,P,barrel,glassColor,localStorage:storage,
  offerPresentation:{available:()=>true},regionalPending:()=>[],runtimeStarting:false,installSceneryMotion(){},sessionActive:true,protectedRecordExports(){},observeShadow(){},noteDialogueCommit(){},dialogueNotice:{reset(){}},document:{hidden:false,activeElement:null,querySelectorAll:()=>[]},T:{...NATIVE_TIME,minimumStop:30},$ :node,
  stopClock(){},schedule(){},message(){},noteMapReach(){},automaticNews:{push(){}},automaticEvents:()=>[],soldOutLabel:()=>'',caskName:String,
  placementUI:{reset(){}},showStaffOpportunity(){},showShopOffer(){},showGeneration(){},showInitialMapNotice(){},vaultPanels(){},shopOffers:()=>[],comparisonKinds:[],
  esc:String,uiText:String,displayReason:String,money:n=>'£'+n,button:(text,action,id='',extra='')=>'<button data-action="'+action+'" data-id="'+id+'" '+extra+'>'+text+'</button>',
  queueMicrotask:fn=>fn(),initial:state,initialRaw:raw,initialPreview:preview,restored};
 vm.createContext(ctx);
 vm.runInContext(`let game=initial,room='distill',modal=null,userPaused=false,canSave=!initialPreview,preview=initialPreview,shownFillSpiritId=restored&&game.still.phase==='filling'?game.core.spirit.id:null,lastSavedText=initialRaw,elapsed=0,runtimeHalted=false,selectedCaskId=null,modalReturnFocus=null,modalReturnObject=null,pointerInteraction=false,mapLabelObserver=null,pendingCountdown=null;
 let caskSlots=initializeCaskSlots(game),migrationPending=null,recentLedger=migrateRecentLedger(game,{replay:o=>D.replayDistilleryOperations(game,o)}),historyRecord=null,recallRecord=null,pendingRecall=null,recallPreview=null,legacyRecord=null,lastSaveError=null,debugSkipJob=null,runtimeSaving=false;
 const candidateRecalls=new WeakMap();let committedSession={game,userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord};
 const mainStore={status:{state:'ready'},invalidate(){this.status.state='halted';}};
 const commitBoundary=new FormalIdbCommitBoundary({revision:0,write:async(text,{expectedRevision})=>{writeCandidate(localStorage,SAVE_KEY,lastSavedText,text);return {revision:expectedRevision+1};}});
 const savingBusy=()=>runtimeSaving||commitBoundary.status.busy,actionReady=()=>sessionActive&&(preview||canSave)&&!savingBusy();
 const prepareGame=(fn,before=game)=>fn(before),candidateLedger=next=>advanceRecentLedger(committedSession.game,next,committedSession.recentLedger),candidateHistory=()=>null;

 const warehouseRoom=createWarehouseRoomController();
 const distillRoom=createDistillRoomController();distillRoom.confirm({},game.core.lastDistillation);
 const countdown={active:false,start(fn){this.active=true;pendingCountdown=fn;},cancel(){this.active=false;pendingCountdown=null;}};
 function storageNotice(text){$('storage-notice').textContent=text;$('storage-notice').hidden=!text;}
 function render(){syncModal();}
 ${['rememberCommitted','restoreCommitted','recoveryAccess','recordSaveError','saveFailure','sessionText','publishCandidate','saveCandidate','save','act','prepareDistillation','finishDistillation','currentDistillTools','startFromLever','commitFill','syncModal','closeModal'].map(extract).join('\n')}
 let pendingAction=Promise.resolve();const actualAct=act;act=(...args)=>(pendingAction=actualAct(...args));
 globalThis.api={startFromLever,async finishDistillation(){finishDistillation();await pendingAction;},fill:commitFill,tools:currentDistillTools,game:()=>game,modal:()=>modal,canSave:()=>canSave,room:()=>room,render,
 async runCountdown(){const fn=pendingCountdown;pendingCountdown=null;countdown.active=false;if(fn)await fn();},cancelCountdown(){countdown.cancel();},
 stepTo(n){while(game.still.distillation.progress<n)game=D.distillStep(game);},
 setGame(s){game=s;},closeFill:closeModal,
 prepareNext(){distillRoom.confirm({},game.core.lastDistillation);room='distill';},
 node:id=>$(id)};`,ctx);
 return {api:ctx.api,persisted:()=>raw,writes:()=>writes,reads:()=>reads,failWrites:()=>{fail=true;},conflict:()=>{raw='external-save';}};
}
