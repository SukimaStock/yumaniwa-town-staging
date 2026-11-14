// Main-game boot and explicit replacement bridge. Formal v8 stays authoritative.
// Legacy storage is read-only here, including malformed and historical records.
import {FORMAL_SAVE_KEY} from './development-save.mjs?v=bar-v01-1&codec=v03';
import {MAIN_IDB_NAME,openMainIdb,readMainRecord,writeMainRecord,closeMainIdb,readMainEntries} from './formal-idb-storage.mjs?v=idb-runtime-v03';
export {MAIN_IDB_NAME};
export const LEGACY_SAVE_KEYS=Object.freeze([
 FORMAL_SAVE_KEY,'sukimastock.ambertime.placement-trial.v1','sukimastock.ambertime.wholesale.v20'
]);
const fault=(code,message)=>Object.assign(new Error(message),{code});
function sourceSnapshot(storage){
 try{
  if(storage===undefined)storage=globalThis.localStorage;
  if(typeof storage?.getItem!=='function')throw Error('Storage unavailable');
  return LEGACY_SAVE_KEYS.map(key=>{
   const text=storage.getItem(key);
   if(text!==null&&typeof text!=='string')throw Error('Invalid storage result');
   return {key,text};
  });
 }catch(error){throw Object.assign(fault('legacy-unavailable','以前の保存を確認できません。'),{cause:error});}
}
const sameSources=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&
 a.every((source,index)=>source.key===b[index]?.key&&source.text===b[index]?.text);
function sourceGuard(storage,baseline){
 if(!sameSources(sourceSnapshot(storage),baseline))
  throw fault('legacy-conflict','別の画面で以前の保存が変わりました。両方の記録を残して停止しました。');
}
function makeAdapter({db,storage,reader,cryptoApi,baseline,initial}){
 const sources=structuredClone(baseline);
 let state='ready',busy=false,revision=initial?.revision??0,text=initial?.record.text??null,epoch=0,error=null;
 const invalidate=(reason=fault('interrupted','保存を再確認するため再読み込みしてください。'))=>{
  if(state==='halted')return;
  state='halted';epoch++;
  error=reason instanceof Error?reason:fault(typeof reason==='string'?reason:'interrupted','保存が中断されました。再読み込みしてください。');
 };
 const ensureReady=()=>{if(state!=='ready')throw fault('storage-halted','保存を再確認するため再読み込みしてください。');};
 const write=async(candidate,reason,options={})=>{
  ensureReady();
  if(busy)throw fault('pending-save','保存が完了していません。');
  const expectedRevision=options.expectedRevision??revision;
  // Invalid external files do not damage a currently usable adapter.
  if(reason==='import'||reason==='new-start')reader(candidate);
  busy=true;const operationEpoch=epoch;
  try{
   if(expectedRevision!==revision)throw fault('conflict','保存世代が変わりました。再読み込みしてください。');
   const receipt=await writeMainRecord(db,candidate,{expectedRevision,reader,cryptoApi,sources,reason,
    checkSources:()=>{ensureReady();sourceGuard(storage,sources);}});
   if(state!=='ready'||epoch!==operationEpoch)throw fault('interrupted','保存中に画面が中断されました。再読み込みしてください。');
   revision=receipt.revision;text=receipt.text;
   return {...receipt,ok:true};
  }catch(cause){invalidate(cause);throw cause;}
  finally{busy=false;}
 };
 const adapter=Object.freeze({
  get status(){return Object.freeze({state,busy,revision,fault:error&&Object.freeze({code:error.code??error.name??'error',message:error.message})});},
  get text(){return text;},
  saveCandidate(candidate,options={}){
   const reason=options.reason??'save';
   if(!['save','market-rules'].includes(reason))return Promise.reject(fault('invalid-action','保存の操作を確認できません。'));
   return write(candidate,reason,options);
  },
  importRecord(candidate,options={}){return write(candidate,'import',options);},
  startNew(candidate,options={}){return write(candidate,'new-start',options);},
  async verifyCurrent(expectedText=text){
   ensureReady();if(busy)throw fault('pending-save','保存が完了していません。');
   try{sourceGuard(storage,sources);const current=await readMainRecord(db,{reader,cryptoApi});sourceGuard(storage,sources);ensureReady();
    if(!current||current.revision!==revision||current.record.text!==expectedText)throw fault('conflict','記録が更新されています。再読み込みしてください。');
    return current.session;
   }catch(cause){invalidate(cause);throw cause;}
  },
  invalidate,
  close(){invalidate(fault('closed','保存を閉じました。再読み込みしてください。'));closeMainIdb(db);}
 });
 return {adapter,write};
}

// Recovery can expose an adapter only when the IDB is genuinely empty and the
// exact old bytes are still readable. Such an adapter permits explicit import /
// new start, never a normal save. Damaged or competing IDB sources stay locked.
export async function bootMainIdb({storage,reader,
 indexedDBApi=globalThis.indexedDB,cryptoApi=globalThis.crypto,onBlocked,deferLegacyMigration=false,expectedSources}={}){
 let db=null,baseline=null,legacyRecord=null;
 const recovery=(error,extra={})=>({ok:false,state:'recovery',reason:error.code??error.name??'storage-error',
  text:null,session:null,revision:0,adapter:null,legacyRecord,error,...extra});
 try{
  if(typeof reader!=='function')throw fault('invalid-reader','正式な保存検証が必要です。');
  baseline=sourceSnapshot(storage);
  if(expectedSources&&!sameSources(expectedSources,baseline))throw fault('legacy-conflict','以前の保存が更新されています。再確認してください。');
  const source=baseline.find(entry=>entry.text!==null);
  if(source)legacyRecord={key:source.key,raw:source.text};
  db=await openMainIdb({indexedDBApi,onBlocked});
  const current=await readMainRecord(db,{reader,cryptoApi});
  sourceGuard(storage,baseline);
  if(current){
   if(!sameSources(current.origin.sources,baseline))throw fault('legacy-conflict','以前の保存も更新されています。両方の記録を残して停止しました。');
   const {adapter}=makeAdapter({db,storage,reader,cryptoApi,baseline,initial:current});
   return {ok:true,state:'ready',reason:'idb',text:current.record.text,session:current.session,
    revision:current.revision,adapter,legacyRecord,error:null};
  }
  const {adapter,write}=makeAdapter({db,storage,reader,cryptoApi,baseline,initial:null});
  const formal=baseline[0].text;
  if(deferLegacyMigration)return {ok:true,state:'empty',reason:'explicit-new-start',text:null,session:null,revision:0,adapter,legacyRecord,error:null};
  if(formal!==null){
   try{reader(formal);}catch(error){return recovery(error,{adapter});}
   const receipt=await write(formal,'migration');
   return {ok:true,state:'ready',reason:'migrated',text:receipt.text,session:receipt.session,
    revision:receipt.revision,adapter,legacyRecord,error:null};
  }
  if(legacyRecord)return recovery(fault('unsupported-version','以前の開発版の記録があります。元の記録を残して停止しました。'),{adapter});
  return {ok:true,state:'empty',reason:'no-record',text:null,session:null,revision:0,adapter,legacyRecord:null,error:null};
 }catch(error){closeMainIdb(db);return recovery(error);}
}

// Title inspection never invokes the official reader or treats bytes as restored.
// Any existing main DB takes precedence even when damaged; never revive legacy.
export async function inspectMainIdb({storage,indexedDBApi=globalThis.indexedDB,onBlocked}={}){
 let db;
 try{
  const sources=sourceSnapshot(storage);db=await openMainIdb({indexedDBApi,onBlocked});
  const entries=await readMainEntries(db);sourceGuard(storage,sources);
  if(entries.size){const head=entries.get('head');return {sources,present:true,source:'idb',text:typeof head?.text==='string'?head.text:null,unreadable:typeof head?.text!=='string'};}
  return {sources,present:false,source:'legacy',text:sources[0].text,unreadable:false};
 }finally{closeMainIdb(db);}
}
