import {initializeCaskSlots} from './cask-slots.mjs?v=s1-1';
import {migrateRecentLedger} from './recent-ledger.mjs?v=s3-1';
import {initializeHistoryRecord} from './history-record.mjs?v=s4-1';
import {initializeRecall} from './recall/collector.mjs?v=bar-v01-1';
import {FORMAL_SAVE_KEY,isCurrentSession} from './development-save.mjs?v=bar-v01-1';

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
 async function run(kind,expected){
  if(busy)return {ok:false,duplicate:true};
  busy=true;const own=++token;let writeAttempted=false,store=null,backupKey=null;
  const current=()=>own===token;
  try{
   phase('preparing');await yieldTask();if(!current())return {ok:false,cancelled:true};
   store=storage();assertStartRecord(store,expected);
   const session=kind==='new'?create():read(expected.raw);
   const text=kind==='new'?encode(session):expected.raw;
   await yieldTask();if(!current())return {ok:false,cancelled:true};
   assertStartRecord(store,expected);
   let result;
   if(kind==='new'){
    writing=true;phase('writing');writeAttempted=true;
    // Legacy raw remains at its original durable key and is never removed.
    const protectedStore={getItem:key=>{const raw=store.getItem(key);if(key.startsWith(FORMAL_SAVE_KEY+'.before-market-rules.v1.')&&raw===expected.raw&&raw!==null)backupKey=key;return raw;},setItem:(key,raw)=>store.setItem(key,raw)};
    result=expected.raw===null?write(protectedStore,FORMAL_SAVE_KEY,null,text):replace(protectedStore,FORMAL_SAVE_KEY,expected.raw,text);
   }
   install(session,{fresh:kind==='new',text,backupKey:result?.backupKey});
   return {ok:true};
  }catch(error){
   // Do not roll back an uncertain write over a possibly newer tab's record.
   let formalState='uncertain';try{if(store?.getItem(FORMAL_SAVE_KEY)===expected.raw)formalState='unchanged';}catch{}
   return {ok:false,error,writeAttempted,formalState,backupKey};
  }finally{if(current()){busy=false;writing=false;phase('idle');}}
 }
 return {start:expected=>run('new',expected),continue:expected=>run('continue',expected),cancel,get busy(){return busy;},get writing(){return writing;}};
}
