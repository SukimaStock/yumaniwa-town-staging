// Runs the actual runtime functions with real unchanged model/codec/sidecars.
// Only browser presentation and the durable writer are replaced. Native browser
// transaction/lifecycle behavior is separately unverified when unavailable.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as nativeModel from '../partner-orders.mjs';
import {createObservedModel} from '../recall/operations.mjs';
import {initializeRecall,advanceRecall,prepareRecall} from '../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../recent-ledger.mjs';
import {readSession,serializeSession} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as T} from '../economy-parameters.mjs';
import {FormalIdbCommitBoundary} from '../formal-idb-commit-boundary.mjs';
import {RuntimeClock} from '../runtime-clock.mjs';
export const runtimeSource=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
export const options={enabled:true,serialize:nativeModel.serializeDistillery,restore:nativeModel.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs};
export function sessionForNewGame(game){return {game,userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:o=>nativeModel.replayDistilleryOperations(game,o)}),historyRecord:initializeHistoryRecord(game),recallRecord:initializeRecall(game)};}
export function freshSession(seed=141){return sessionForNewGame(nativeModel.newShopDialogueDistillery(seed));}
export const encodeSession=session=>serializeSession(session.game,session,options);
export function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
export function extractFunction(name,source=runtimeSource){
 let start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing function '+name);
 if(source.slice(start-6,start)==='async ')start-=6;
 let quote=null,escape=false,line=false,block=false,depth=0,body=false,parens=0;
 for(let i=source.indexOf('(',start);i<source.length;i++){
  const c=source[i],n=source[i+1];
  if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;}
  if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}
  if(c==='/'&&n==='/'){line=true;i++;continue;}if(c==='/'&&n==='*'){block=true;i++;continue;}
  if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
  if(!body){if(c==='(')parens++;else if(c===')')parens--;else if(c==='{'&&parens===0){body=true;depth=1;}continue;}
  if(c==='{')depth++;else if(c==='}'&&--depth===0)return source.slice(start,i+1);
 }
 throw Error('Unclosed function '+name);
}
export function createRuntimeHarness({session=freshSession(),writer,preview=false,functions=[]}={}){
 const log=[],nodes=new Map(),timers=new Map();let timerId=0,stored=encodeSession(session),revision=1;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:'',dataset:{},open:false,disabled:false,close(){this.open=false;},querySelector(){return null;},setAttribute(){}});return nodes.get(id);};
 const context={nativeModel,createObservedModel,initializeRecall,advanceRecall,prepareRecall,initializeHistoryRecord,advanceHistoryRecord,initializeCaskSlots,reconcileCaskSlots,migrateRecentLedger,advanceRecentLedger,readSession,serializeSession,T,FormalIdbCommitBoundary,RuntimeClock,WeakMap,structuredClone,queueMicrotask,performance,
  game:session.game,userPaused:session.userPaused,elapsed:session.elapsed,caskSlots:[...session.caskSlots],recentLedger:session.recentLedger,historyRecord:session.historyRecord,committedSession:{...session,caskSlots:[...session.caskSlots]},initialRecall:session.recallRecord,lastSavedText:stored,lastSaveError:null,legacyRecord:null,canSave:!preview,preview,
  sessionOptions:options,confirm:()=>true,query:new URLSearchParams(),localStorage:{},runtimeHalted:false,modal:null,room:'distill',generation:0,timer:null,playbackRate:1,debugSkipJob:null,debugEnabled:true,document:{hidden:false},$:node,
  countdown:{active:false,cancel(){log.push('countdown-cancel');}},wallClock:new RuntimeClock(T.distillStepMs),
  storageNotice:text=>{node('storage-notice').textContent=text;node('storage-notice').hidden=!text;},
  recoveryAccess:()=>{context.modal=null;log.push('recovery');},dialogueNotice:{reset(){}},
  render:()=>log.push('render'),renderProgress:()=>log.push('progress'),automaticEvents:()=>[],automaticNews:{reset(){},push:()=>log.push('news')},
  noteDialogueCommit:()=>log.push('dialogue'),soldOutLabel:()=>'',caskName:()=>'',noteMapReach:()=>log.push('map'),
  marketUI:{cancel(){},reset(){},consume:()=>log.push('market')},m0:{reset(){},consume:()=>log.push('m0'),mode:'half',setMode(){}},scene:{cancelDistillCompletion(){},isDistillCompletion:()=>false,resetMotion(){}},placementUI:{cancel(){},reset(){}},
  distillRoom:{reset(){}},feedbackComments:{reset(){}},mapUIStorage:()=>null,mapNoticeLoad(){},mapNoticeSave(){},
  warehouseRoom:{select:()=>log.push('warehouse-select'),selectedId:null},message:()=>log.push('message'),dialogueProjection:{read:()=>null,reset(){}},addDailyEvent:events=>events,generationName:()=>'',
  extractionMaximum:100,manualDistilling:()=>context.game.still.phase==='distilling'&&context.game.usual?.reservation?.status!=='active',
  generationState:()=>nativeModel.generationStatus(context.game),heldRange:()=>false,marketEditing:false,shownFillSpiritId:null,LIVE_MESSAGE:{unchanged:'same'},
  setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)
 };
 vm.createContext(context);
 const sidecars=runtimeSource.slice(runtimeSource.indexOf('let recallRecord=null,'),runtimeSource.indexOf("import {SHOPS}"));
 const gates=runtimeSource.slice(runtimeSource.indexOf('let mainStore=null,'),runtimeSource.indexOf('let debugSkipJob='));
 const names=['stopClock','restoreCommitted','recordSaveError','saveFailure','candidateLedger','candidateHistory','sessionText','publishCandidate','connectMainStore','saveCandidate','save','act','actMarket','commitFill','commitPlacement','endTaste','selectRoom','recipeAction','trial','schedule','suspend','resume',...functions];
 vm.runInContext(sidecars+'\n'+gates+'\n'+
  'pendingRecall=recallRecord=initialRecall;runtimeStarting=false;\n'+
  'const initializeLedger=next=>migrateRecentLedger(next,{replay:observer=>D.replayDistilleryOperations(next,observer)});\n'+
  'const blocked=()=>!actionReady()||userPaused||runtimeHalted||document.hidden;\nconst hasMonthlyWork=()=>true;\n'+
  [...new Set(names)].map(name=>extractFunction(name)).join('\n'),context);
 const adapter={state:'ready',get status(){return {state:this.state,revision};},invalidate(error){this.state='halted';this.error=error;},
  async saveCandidate(text,token){log.push(['write',token.reason]);const session=readSession(text,options);const receipt=writer?await writer(text,token,session):{ok:true,revision:token.expectedRevision+1,text,session};if(receipt?.revision===token.expectedRevision+1){stored=text;revision=receipt.revision;}return receipt;},
  importRecord(text,token){return this.saveCandidate(text,token);},startNew(text,token){return this.saveCandidate(text,token);}};
 context.adapter=adapter;vm.runInContext('connectMainStore(adapter,1);',context);
 return {context,log,node,adapter,model:vm.runInContext('D',context),run:code=>vm.runInContext(code,context),get stored(){return stored;},timers,
  snapshot:()=>vm.runInContext('({game,userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord,pendingRecall,recallPreview,lastSavedText,committedSession})',context),
  async tick(){const item=timers.entries().next().value;if(!item)throw Error('No scheduled tick');timers.delete(item[0]);return await item[1].fn();}};
}
