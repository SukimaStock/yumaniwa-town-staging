// Isolated reference adapter. Source mapping is in REPORT.md; no browser claims.
import * as native from '../../partner-orders.mjs';
import {createObservedModel} from '../../recall/operations.mjs';
import {initializeRecall,advanceRecall,prepareRecall} from '../../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../../history-record.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../../cask-slots.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../../recent-ledger.mjs';
import {readSession,serializeSession} from '../../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../../economy-parameters.mjs';
export const options=Object.freeze({enabled:true,serialize:native.serializeDistillery,restore:native.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs});
export const copy=x=>structuredClone(x);
export function createReference({seed=141,wire=null}={}){
 let state,game,pendingRecall,lastWire=wire;const commits=[];
 if(wire!==null)state=readSession(wire,options);
 else {
  game=native.newShopDialogueDistillery(seed);
  state={game,userPaused:false,elapsed:0,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:o=>native.replayDistilleryOperations(game,o)}),historyRecord:initializeHistoryRecord(game),recallRecord:initializeRecall(game)};
  lastWire=serializeSession(game,state,options);
 }
 game=state.game;pendingRecall=state.recallRecord;
 // Same native operation observer as shop-app 49–53. No collector replay here.
 const model=createObservedModel(native,({before,after,operation})=>{
  const prepared=operation.key==='generation-handover'?prepareRecall(pendingRecall,before,before.operations.length):undefined;
  pendingRecall=advanceRecall(before,after,pendingRecall,{prepared});
 });
 function save(){
  const candidate={game,userPaused:state.userPaused,elapsed:state.elapsed,caskSlots:reconcileCaskSlots(game,state.caskSlots),recentLedger:advanceRecentLedger(state.game,game,state.recentLedger),historyRecord:advanceHistoryRecord(state.game,game,state.historyRecord),recallRecord:pendingRecall};
  const text=serializeSession(game,candidate,options);
  // Isolated file/memory boundary, not localStorage or power-loss emulation.
  const reread=readSession(text,options);lastWire=text;state=reread;game=state.game;pendingRecall=state.recallRecord;
  commits.push({operationCount:game.operations.length,month:game.core.month});return text;
 }
 return {
  get game(){return game;},get state(){return copy(state);},get wire(){return lastWire;},get commits(){return copy(commits);},
  apply(name,args=[],{save:commit=true}={}){if(typeof model[name]!=='function')throw Error('Unknown public operation');game=model[name](game,...args);if(commit)save();return game;},
  save,reload(){state=readSession(lastWire,options);game=state.game;pendingRecall=state.recallRecord;return copy(state);}
 };
}
export function filledReference(){
 const app=createReference();app.apply('startRangeDistillation');
 while(app.game.still.distillation.progress<24)app.apply('distillStep');
 app.apply('beginCollection');while(app.game.still.distillation.progress<36)app.apply('distillStep');
 app.apply('stopDistillation');app.apply('fillBarrel',['bourbon']);return app;
}
export function cadencePair(){
 const filled=filledReference(),per=createReference({wire:filled.wire}),batch=createReference({wire:filled.wire});
 for(const [app,save] of [[per,true],[batch,false]]){
  const id=app.game.core.casks[0].id;app.apply('bottleBranded',[id,{},1],{save});
  const pid=app.game.core.products.at(-1).id;app.apply('setSalePrice',['high',pid],{save});
  if(!save)app.save();
 }
 return {filled,per,batch};
}
