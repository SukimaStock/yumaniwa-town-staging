import {initializeCaskSlots} from './cask-slots.mjs?v=s1-1';
import {migrateRecentLedger} from './recent-ledger.mjs?v=s3-1';
import {initializeHistoryRecord} from './history-record.mjs?v=s4-1&perf=v06';
import {initializeRecall} from './recall/collector.mjs?v=bar-v01-1&perf=v06';
import {FORMAL_SAVE_KEY,isCurrentSession} from './development-save.mjs?v=bar-v01-1&codec=v03&perf=v06';

export const SESSION_ENTRY_BUILD='entry-diagnostics-20261111-r4';
export const LEGACY_SAVE_KEYS=['sukimastock.ambertime.placement-trial.v1','sukimastock.ambertime.wholesale.v20'];
// Initialization is deliberately outside the current session's observed model.
export function createFreshSession(native,seed){
 const game=native.newConsignmentDistillery(seed);
 return {game,caskSlots:initializeCaskSlots(game),recentLedger:migrateRecentLedger(game,{replay:observer=>native.replayDistilleryOperations(game,observer)}),historyRecord:initializeHistoryRecord(game),recallRecord:initializeRecall(game),userPaused:false,elapsed:0};
}
export function inspectStartRecord(storage){
 const raw=storage.getItem(FORMAL_SAVE_KEY),legacy=LEGACY_SAVE_KEYS.map(key=>({key,raw:storage.getItem(key)})).filter(row=>row.raw!==null);
 return {raw,legacy,kind:raw!==null?(isCurrentSession(raw)?'current':'unreadable'):legacy.length?'legacy':'empty'};
}
const conflict=()=>Object.assign(Error('別の画面で記録が変わりました。記録を再確認してください。'),{code:'conflict'});
export function assertStartRecord(storage,expected){
 const actual=inspectStartRecord(storage);
 if(actual.raw!==expected.raw||JSON.stringify(actual.legacy)!==JSON.stringify(expected.legacy))throw conflict();
 return actual;
}
// Preparation and durable verification may yield. A supplied asynchronous writer
// must resolve only after exact readback; cancellation cannot cross its write boundary.
export function createSessionEntry({storage,create,encode,read,write,install,verifyCurrent=async()=>{},prepare=async()=>{},phase=()=>{},yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0))}){
 let token=0,busy=false,writing=false;
 const cancel=()=>{if(writing)return false;token++;busy=false;return true;};
 async function run(kind,expected,{operation=kind}={}){
  if(busy)return {ok:false,duplicate:true};
  busy=true;const own=++token;
  let stage='preparation-ui',writeAttempted=false,store=null,backupKey=null,backupPresent=false,backupVerified=false,writeVerified=false,restoreValidated=false,candidateText=null,outcome=null;
  const current=()=>own===token;
  function failure(error,failedStage=stage){
   // Byte comparison says nothing about the formal reader accepting this record.
   let formalState='unavailable';try{if(store){const actual=store.getItem(FORMAL_SAVE_KEY);formalState=writeAttempted&&!writeVerified?'uncertain':actual===expected.raw?'unchanged':writeVerified&&actual===candidateText?'candidate-verified':'uncertain';}}catch{}
   return {ok:false,error,operation,stage:failedStage,writeAttempted,formalState,backupKey,backupPresent,backupVerified,writeVerified,restoreValidated,candidateText};
  }
  try{
   phase('preparing');await yieldTask();if(!current())return outcome={ok:false,cancelled:true};
   stage='storage-prepare';await prepare(kind,expected,{current});if(!current())return outcome={ok:false,cancelled:true};
   stage='record-check';store=storage();assertStartRecord(store,expected);
   stage=kind==='new'?'candidate-create':'continue-restore';
   const session=kind==='new'?create():read(expected.raw);
   if(kind!=='new')restoreValidated=true;
   stage=kind==='new'?'candidate-validation':'record-recheck';
   const text=kind==='new'?encode(session):expected.raw;
   if(kind==='new'){candidateText=text;restoreValidated=true;}
   await yieldTask();if(!current())return outcome={ok:false,cancelled:true};
   stage='record-recheck';assertStartRecord(store,expected);
   if(kind==='new'){
    writing=true;stage='writing-ui';phase('writing');writeAttempted=true;
    let formalWritten=false;
    // Normal one-slot replacement deliberately adds no browser backup. The
    // supplied writer compares the exact raw again and confirms durable readback.
    const formalStore={getItem:key=>{
     stage=formalWritten?'formal-readback':'record-recheck';
     const raw=store.getItem(key);
     if(formalWritten&&raw===text)writeVerified=true;
     return raw;
    },setItem:(key,raw)=>{
     stage='formal-write';store.setItem(key,raw);formalWritten=true;
    }};
    // Existing legacy and protected-record keys are not touched.
    stage='formal-write';await write(formalStore,FORMAL_SAVE_KEY,expected.raw,text);writeVerified=true;
   }
   if(kind!=='new'){stage='committed-readback';await verifyCurrent(expected.raw);if(!current())return outcome={ok:false,cancelled:true};}
   stage='session-apply';await install(session,{fresh:kind==='new',text,backupKey:null});
   return outcome={ok:true};
  }catch(error){return outcome=failure(error);}
  finally{
   if(current()){
    busy=false;writing=false;
    try{phase('idle');}catch(error){if(outcome?.ok)Object.assign(outcome,failure(error,'completion-ui'));}
   }
  }
 }
 return {start:(expected,context)=>run('new',expected,context),continue:(expected,context)=>run('continue',expected,context),cancel,get busy(){return busy;},get writing(){return writing;}};
}
