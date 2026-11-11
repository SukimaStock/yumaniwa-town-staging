import {initializeCaskSlots} from './cask-slots.mjs?v=s1-1';
import {migrateRecentLedger} from './recent-ledger.mjs?v=s3-1';
import {initializeHistoryRecord} from './history-record.mjs?v=s4-1';
import {initializeRecall} from './recall/collector.mjs?v=bar-v01-1';
import {FORMAL_SAVE_KEY,isCurrentSession} from './development-save.mjs?v=bar-v01-1';

export const SESSION_ENTRY_BUILD='entry-diagnostics-20261111-r1';
export const LEGACY_SAVE_KEYS=['sukimastock.ambertime.placement-trial.v1','sukimastock.ambertime.wholesale.v20'];
// Initialization is deliberately outside the current session's observed model.
export function createFreshSession(native,seed){
 const game=native.newWorldNetworkDistillery(seed);
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
// Only preparation yields. The final compare/backup/compare/write/readback uses
// the existing synchronous writers; cancellation never crosses that boundary.
export function createSessionEntry({storage,create,encode,read,write,replace,install,phase=()=>{},yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0))}){
 let token=0,busy=false,writing=false;
 const cancel=()=>{if(writing)return false;token++;busy=false;return true;};
 async function run(kind,expected,{operation=kind}={}){
  if(busy)return {ok:false,duplicate:true};
  busy=true;const own=++token;
  let stage='preparation-ui',writeAttempted=false,store=null,backupKey=null,backupPresent=false,backupVerified=false,writeVerified=false,restoreValidated=false,candidateText=null,outcome=null;
  const current=()=>own===token;
  function failure(error,failedStage=stage){
   // Byte comparison says nothing about the formal reader accepting this record.
   let formalState='unavailable';try{if(store)formalState=store.getItem(FORMAL_SAVE_KEY)===expected.raw?'unchanged':'uncertain';}catch{}
   return {ok:false,error,operation,stage:failedStage,writeAttempted,formalState,backupKey,backupPresent,backupVerified,writeVerified,restoreValidated,candidateText};
  }
  try{
   phase('preparing');await yieldTask();if(!current())return outcome={ok:false,cancelled:true};
   stage='record-check';store=storage();assertStartRecord(store,expected);
   stage=kind==='new'?'candidate-create':'continue-restore';
   const session=kind==='new'?create():read(expected.raw);
   if(kind!=='new')restoreValidated=true;
   stage=kind==='new'?'candidate-validation':'record-recheck';
   const text=kind==='new'?encode(session):expected.raw;
   if(kind==='new'){candidateText=text;restoreValidated=true;}
   await yieldTask();if(!current())return outcome={ok:false,cancelled:true};
   stage='record-recheck';assertStartRecord(store,expected);
   let result;
   if(kind==='new'){
    writing=true;stage='writing-ui';phase('writing');writeAttempted=true;
    let formalWritten=false;const backupReads=new Map();
    // Observe the existing synchronous writer's actual storage calls. No new
    // writer, deleted data, bypassed compare or inferred exception stage.
    const protectedStore={getItem:key=>{
     const backup=key.startsWith(FORMAL_SAVE_KEY+'.before-market-rules.v1.');
     const reads=backup?(backupReads.get(key)??0):0;
     stage=backup?(reads?'backup-readback':'backup-check'):(formalWritten?'formal-readback':'record-recheck');
     const raw=store.getItem(key);
     if(backup){backupReads.set(key,reads+1);if(raw!==null)backupPresent=true;if(reads&&raw===expected.raw&&raw!==null){backupKey=key;backupVerified=true;}}
     if(!backup&&formalWritten&&raw===text)writeVerified=true;
     return raw;
    },setItem:(key,raw)=>{
     stage=key===FORMAL_SAVE_KEY?'formal-write':'backup-write';
     store.setItem(key,raw);if(key===FORMAL_SAVE_KEY)formalWritten=true;
    }};
    // Legacy raw remains at its original durable key and is never removed.
    result=expected.raw===null?write(protectedStore,FORMAL_SAVE_KEY,null,text):replace(protectedStore,FORMAL_SAVE_KEY,expected.raw,text);
   }
   stage='session-apply';install(session,{fresh:kind==='new',text,backupKey:result?.backupKey});
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
