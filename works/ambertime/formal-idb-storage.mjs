// AmberTime #889 phase 1. Staging-only v8 byte store; not wired to game runtime.
// The official development-save reader/serializer remains the authority.
export const STAGING_IDB_NAME='sukimastock-ambertime-staging-v8-preflight';
const STORE='records',SCHEMA='ambertime-v8-idb/1';
const fail=(code,message)=>Object.assign(new Error(message),{code});
const isRevision=n=>Number.isSafeInteger(n)&&n>=0;
const hasText=t=>typeof t==='string'&&t.length>0;
const req=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error??fail('idb-read','IndexedDB request failed'));});
const completion=tx=>new Promise((resolve,reject)=>{
 tx.oncomplete=()=>resolve();
 tx.onabort=()=>reject(tx.error??fail('idb-abort','IndexedDB transaction aborted'));
 tx.onerror=()=>{}; // onabort is the single rejection path
});
function canonical(text){
 if(!hasText(text))throw fail('invalid-session','記録が空です。');
 let parsed;try{parsed=JSON.parse(text);}catch{throw fail('invalid-session','記録を読み込めません。');}
 if(parsed?.version!==8||JSON.stringify(parsed)!==text)throw fail('invalid-session','正式なv8記録ではありません。');
 return text;
}
function readerRequired(reader){if(typeof reader!=='function')throw fail('invalid-reader','正式な保存検証が必要です。');}
function validateSession(reader,text){
 const result=reader(text);
 if(result&&typeof result.then==='function')throw fail('invalid-reader','保存検証は同期的に行ってください。');
}
async function fingerprint(text,cryptoApi=globalThis.crypto){
 if(typeof cryptoApi?.subtle?.digest!=='function')throw fail('crypto-unavailable','記録の照合に必要な暗号APIがありません。');
 const bytes=await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
function validEnvelope(record){
 return record?.schema===SCHEMA&&isRevision(record.revision)&&record.revision>0&&hasText(record.text)
    &&typeof record.sha256==='string'&&/^[0-9a-f]{64}$/.test(record.sha256);
}
async function verifyEnvelope(record,{reader,cryptoApi}){
 if(!validEnvelope(record))throw fail('invalid-record','IndexedDBの記録形式を確認できません。');
 canonical(record.text);
 if(await fingerprint(record.text,cryptoApi)!==record.sha256)throw fail('idb-integrity','IndexedDBの記録が一致しません。');
 // Always invoke the existing full v8 reader, not just a checksum.
 validateSession(reader,record.text);
 return record;
}
export function openStagingIdb({indexedDBApi=globalThis.indexedDB,onBlocked=()=>{}}={}){
 if(typeof indexedDBApi?.open!=='function')return Promise.reject(fail('idb-unavailable','IndexedDBが利用できません。'));
 return new Promise((resolve,reject)=>{
  let settled=false;
  const request=indexedDBApi.open(STAGING_IDB_NAME,1);
  const rejectOnce=error=>{if(!settled){settled=true;reject(error);}};
  request.onblocked=()=>{onBlocked();rejectOnce(fail('idb-blocked','別の画面がデータベースを使用しています。閉じて再試行してください。'));};
  request.onerror=()=>rejectOnce(request.error??fail('idb-open','IndexedDBを開けません。'));
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();
    if(settled){db.close();return;}settled=true;resolve(db);
  };
 });
}
export function closeStagingIdb(db){db?.close();}
export async function readStagingRecord(db,{reader,cryptoApi=globalThis.crypto,allowPrevious=false}={}){
 readerRequired(reader);
 const tx=db.transaction(STORE,'readonly'),done=completion(tx),store=tx.objectStore(STORE);
 const headReq=req(store.get('head')),previousReq=req(store.get('previous'));
 let head,previous;try{[head,previous]=await Promise.all([headReq,previousReq]);await done;}catch(error){await done.catch(()=>{});throw error;}
 if(!head){
  if(previous)throw fail('invalid-head','現行記録がありません。旧世代を自動採用しません。');
  return null;
 }
 try{return {record:await verifyEnvelope(head,{reader,cryptoApi}),source:'head',headRevision:head.revision};}
 catch(error){
  if(!allowPrevious)throw error;
  if(!previous)throw error;
  try{return {record:await verifyEnvelope(previous,{reader,cryptoApi}),source:'previous',headRevision:head.revision,headError:{code:error.code??'invalid-record',message:error.message}};}
  catch{throw error;}
 }
}
export async function writeStagingRecord(db,text,{expectedRevision,reader,cryptoApi=globalThis.crypto}={}){
 readerRequired(reader);
 if(!isRevision(expectedRevision)||expectedRevision===Number.MAX_SAFE_INTEGER)throw fail('invalid-revision','保存世代の指定が不正です。');
 canonical(text);
 validateSession(reader,text); // official reader before any mutation
 // Verify a complete snapshot before entering the synchronous write transaction.
 const readTx=db.transaction(STORE,'readonly'),readDone=completion(readTx),readStore=readTx.objectStore(STORE);
 let headSnapshot,previousSnapshot,headKey,previousKey;
 try{[headSnapshot,previousSnapshot,headKey,previousKey]=await Promise.all([req(readStore.get('head')),req(readStore.get('previous')),req(readStore.getKey('head')),req(readStore.getKey('previous'))]);await readDone;}
 catch(error){await readDone.catch(()=>{});throw error;}
 if(headKey===undefined&&previousKey!==undefined)throw fail('invalid-head','現行記録がありません。旧世代を自動採用しません。');
 if(headKey!==undefined)await verifyEnvelope(headSnapshot,{reader,cryptoApi});
 if(previousKey!==undefined)await verifyEnvelope(previousSnapshot,{reader,cryptoApi});
 if((headSnapshot?.revision??0)!==expectedRevision)throw fail('conflict','別の画面で保存が更新されました。');
 const sha256=await fingerprint(text,cryptoApi);
 const tx=db.transaction(STORE,'readwrite'),done=completion(tx),store=tx.objectStore(STORE);
 let cause=null;
 const prior=store.get('head'),previous=store.get('previous'),priorKey=store.getKey('head'),priorPreviousKey=store.getKey('previous');
 let headReady=false,previousReady=false,headKeyReady=false,previousKeyReady=false;
 const abort=error=>{cause=error;try{tx.abort();}catch{}};
 const publish=()=>{
  if(!headReady||!previousReady||!headKeyReady||!previousKeyReady)return;
  try{
   if(priorKey.result!==headKey||priorPreviousKey.result!==previousKey||JSON.stringify(prior.result)!==JSON.stringify(headSnapshot)||JSON.stringify(previous.result)!==JSON.stringify(previousSnapshot))
    throw fail('conflict','別の画面で保存が更新されました。');
   const next={schema:SCHEMA,revision:expectedRevision+1,text,sha256};
   if(headKey!==undefined)store.put(headSnapshot,'previous');
   store.put(next,'head');
  }catch(error){abort(error);}
 };
 priorKey.onsuccess=()=>{headKeyReady=true;publish();};
 priorPreviousKey.onsuccess=()=>{previousKeyReady=true;publish();};
 priorKey.onerror=()=>abort(priorKey.error??fail('idb-read','保存世代を読めません。'));
 priorPreviousKey.onerror=()=>abort(priorPreviousKey.error??fail('idb-read','保存世代を読めません。'));
 prior.onsuccess=()=>{headReady=true;publish();};
 previous.onsuccess=()=>{previousReady=true;publish();};
 prior.onerror=()=>abort(prior.error??fail('idb-read','保存世代を読めません。'));
 previous.onerror=()=>abort(previous.error??fail('idb-read','保存世代を読めません。'));
 try{await done;}catch(error){throw cause??error;}
 // Confirm the byte string from committed storage, not only request success.
 const checked=await readStagingRecord(db,{reader,cryptoApi});
 if(checked.record.revision!==expectedRevision+1||checked.record.text!==text)
  throw fail('readback','書込み後の記録が一致しません。');
 return {revision:checked.record.revision,sha256};
}

// Main-game storage is deliberately separate from the disposable preflight DB.
export const MAIN_IDB_NAME='sukimastock-ambertime-staging-main-v8';
const MAIN_SCHEMA='ambertime-main-bounded-idb/2';
function canonicalMain(text){
 if(!hasText(text))throw fail('invalid-session','記録が空です。');
 let parsed;try{parsed=JSON.parse(text);}catch{throw fail('invalid-session','記録を読み込めません。');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||JSON.stringify(parsed)!==text)throw fail('invalid-session','正式な記録ではありません。');
 return text; // accepted formal version is verified by the official reader below
}
const MAIN_REASONS=new Set(['migration','import','new-start','market-rules','save']);
const exactKeys=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
function same(a,b){
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);
 return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]));
}
const digestValid=hash=>typeof hash==='string'&&/^[0-9a-f]{64}$/.test(hash);
const mainFail=(code,message)=>fail(code,message);
function mainEnvelope(record){
 return exactKeys(record,['schema','revision','text','sha256'])&&record.schema===MAIN_SCHEMA&&
 isRevision(record.revision)&&record.revision>0&&hasText(record.text)&&digestValid(record.sha256);
}
// A connection-local bounded cache only skips repeat canonical and semantic
// reads of exact already-validated bytes. Shape and SHA checks always run against
// fresh IDB reads; every returned head is canonically and formally read again.
// The reader identity is part of the cache, so a different validator never
// inherits another reader's trust. No parsed or mutable session is cached.
const validatedByConnection=new WeakMap();
function validationCache(db,reader){
 let readers=validatedByConnection.get(db);
 if(!readers){readers=new WeakMap();validatedByConnection.set(db,readers);}
 let cache=readers.get(reader);if(!cache){cache=new Map();readers.set(reader,cache);}return cache;
}
function rememberValidated(cache,text){
 if(!cache)return;
 cache.delete(text);cache.set(text,true);
 while(cache.size>8||[...cache.keys()].reduce((total,value)=>total+value.length,0)>8*1024*1024){cache.delete(cache.keys().next().value);}
}
async function verifyMainEnvelope(record,options,forceReader=false){
 if(!mainEnvelope(record))throw mainFail('invalid-head','本編の保存形式を確認できません。');
 const alreadyValidated=!forceReader&&options.cache?.has(record.text);
 if(!alreadyValidated)canonicalMain(record.text);
 if(await fingerprint(record.text,options.cryptoApi)!==record.sha256)
  throw mainFail('idb-integrity','本編の保存内容が一致しません。');
 if(alreadyValidated){rememberValidated(options.cache,record.text);return undefined;}
 const session=options.reader(record.text);
 if(session&&typeof session.then==='function')throw fail('invalid-reader','保存検証は同期的に行ってください。');
 rememberValidated(options.cache,record.text);
 return session;
}
function validSources(sources){
 return Array.isArray(sources)&&sources.length>0&&sources.length<=32&&
 sources.every(source=>exactKeys(source,['key','text'])&&hasText(source.key)&&
  (source.text===null||typeof source.text==='string'))&&
 new Set(sources.map(source=>source.key)).size===sources.length;
}
async function signed(payload,cryptoApi){return {...payload,sha256:await fingerprint(JSON.stringify(payload),cryptoApi)};}
async function verifySigned(value,cryptoApi,code){
 const {sha256,...payload}=value;
 if(!digestValid(sha256)||await fingerprint(JSON.stringify(payload),cryptoApi)!==sha256)
  throw fail(code,'保存の管理情報が一致しません。');
}
export function openMainIdb({indexedDBApi=globalThis.indexedDB,onBlocked=()=>{}}={}){
 if(typeof indexedDBApi?.open!=='function')return Promise.reject(fail('idb-unavailable','IndexedDBが利用できません。'));
 return new Promise((resolve,reject)=>{
  let settled=false,request;
  const stop=error=>{if(!settled){settled=true;reject(error);}};
  try{request=indexedDBApi.open(MAIN_IDB_NAME,1);}catch(error){stop(error);return;}
  request.onblocked=()=>{try{onBlocked();}catch{}stop(fail('idb-blocked','別の画面を閉じて再読み込みしてください。'));};
  request.onerror=()=>stop(request.error??fail('idb-open','本編の保存を開けません。'));
  request.onupgradeneeded=()=>{
   try{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);}
   catch(error){try{request.transaction.abort();}catch{}stop(error);}
  };
  request.onsuccess=()=>{
   const db=request.result;db.onversionchange=()=>db.close();
   if(settled){db.close();return;}validatedByConnection.delete(db);settled=true;resolve(db);
  };
 });
}
export function closeMainIdb(db){db?.close();}
export async function readMainEntries(db){
 const tx=db.transaction(STORE,'readonly'),done=completion(tx),store=tx.objectStore(STORE);
 const keys=req(store.getAllKeys()),values=req(store.getAll());
 try{const [allKeys,allValues]=await Promise.all([keys,values,done]);return new Map(allKeys.map((key,i)=>[key,allValues[i]]));}
 catch(error){await done.catch(()=>{});throw error;}
}
async function verifyMainEntries(entries,{reader,cryptoApi,cache,forceHead=true}){
 if(entries.size===0)return null;
 const head=entries.get('head'),hasPrevious=entries.has('previous'),previous=entries.get('previous'),metadata=entries.get('metadata'),origin=entries.get('origin');
 if(!exactKeys(metadata,['schema','revision','originSha256','sha256'])||metadata.schema!==MAIN_SCHEMA||!isRevision(metadata.revision)||metadata.revision<1)
  throw fail('invalid-metadata','保存の管理情報を確認できません。');
 await verifySigned(metadata,cryptoApi,'invalid-metadata');
 if(!exactKeys(origin,['schema','sources','sha256'])||origin.schema!==MAIN_SCHEMA||!validSources(origin.sources))
  throw fail('invalid-origin','移行元の記録を確認できません。');
 await verifySigned(origin,cryptoApi,'invalid-origin');
 if(origin.sha256!==metadata.originSha256)throw fail('invalid-origin','移行元の記録が一致しません。');
 const session=await verifyMainEnvelope(head,{reader,cryptoApi,cache},forceHead);
 if(head.revision!==metadata.revision)throw fail('invalid-metadata','保存世代が一致しません。');
 if(head.revision===1?hasPrevious:!hasPrevious)throw fail('invalid-previous','直前の保存世代を確認できません。');
 if(hasPrevious){
  try{await verifyMainEnvelope(previous,{reader,cryptoApi,cache});if(previous.revision!==head.revision-1)throw Error('revision');}
  catch(error){throw Object.assign(fail('invalid-previous','直前の記録を確認できません。'),{cause:error});}
 }
 const allowed=new Set(['head','metadata','origin',...(hasPrevious?['previous']:[])]);
 if(entries.size!==allowed.size||[...entries.keys()].some(key=>!allowed.has(key)))throw fail('invalid-metadata','不明な保存記録があるため停止しました。');
 return {record:head,previous:hasPrevious?previous:null,metadata,origin,backups:[],session,revision:head.revision};
}
export async function readMainRecord(db,{reader,cryptoApi=globalThis.crypto}={}){
 readerRequired(reader);
 return verifyMainEntries(await readMainEntries(db),{reader,cryptoApi,cache:validationCache(db,reader)});
}

// All expensive reader/digest work precedes the native write transaction. Its
// synchronous CAS compares every byte we validated, including previous/backups.
// checkSources reads the independent legacy store before/inside/after the commit;
// the two stores cannot be atomic, so any discrepancy means an uncertain halt.
export async function writeMainRecord(db,text,{expectedRevision,reader,cryptoApi=globalThis.crypto,
 sources,reason='save',checkSources=()=>{}}={}){
 readerRequired(reader);
 if(!isRevision(expectedRevision)||expectedRevision===Number.MAX_SAFE_INTEGER)
  throw fail('invalid-revision','保存世代の指定が不正です。');
 if(!MAIN_REASONS.has(reason)||typeof checkSources!=='function')throw fail('invalid-action','保存の操作が不正です。');
 canonicalMain(text);const candidateSession=reader(text);
 if(candidateSession&&typeof candidateSession.then==='function')throw fail('invalid-reader','保存検証は同期的に行ってください。');
 const cache=validationCache(db,reader);rememberValidated(cache,text);
 checkSources();
 const entries=await readMainEntries(db),prior=await verifyMainEntries(entries,{reader,cryptoApi,cache,forceHead:false});
 if((prior?.revision??0)!==expectedRevision)throw fail('conflict','別の画面で保存が更新されました。');
 if(!prior&&(reason==='save'||reason==='market-rules'))throw fail('uninitialized','新規開始または読み込みが必要です。');
 if(prior&&reason==='migration')throw fail('conflict','移行先にすでに記録があります。');
 if(!prior&&!validSources(sources))throw fail('invalid-origin','移行元の保存情報が必要です。');
 const revision=expectedRevision+1;
 const next={schema:MAIN_SCHEMA,revision,text,sha256:await fingerprint(text,cryptoApi)};
 const origin=prior?.origin??await signed({schema:MAIN_SCHEMA,sources:structuredClone(sources)},cryptoApi);
 const metadata=await signed({schema:MAIN_SCHEMA,revision,originSha256:origin.sha256},cryptoApi);
 checkSources();
 const tx=db.transaction(STORE,'readwrite'),done=completion(tx),store=tx.objectStore(STORE);
 let cause=null,keys,values;
 const abort=error=>{cause=error;try{tx.abort();}catch{}};
 const compareAndWrite=()=>{
  if(!keys||!values)return;
  try{
   const current=new Map(keys.map((key,i)=>[key,values[i]]));
   if(current.size!==entries.size||[...entries].some(([key,value])=>!current.has(key)||!same(value,current.get(key))))
    throw fail('conflict','別の画面で保存が更新されました。');
   checkSources();
   if(!prior)store.add(origin,'origin');
   if(prior)store.put(prior.record,'previous');
   store.put(next,'head');store.put(metadata,'metadata');
  }catch(error){abort(error);}
 };
 try{
  const keyRequest=store.getAllKeys(),valueRequest=store.getAll();
  keyRequest.onsuccess=()=>{keys=keyRequest.result;compareAndWrite();};
  valueRequest.onsuccess=()=>{values=valueRequest.result;compareAndWrite();};
  keyRequest.onerror=()=>abort(keyRequest.error??fail('idb-read','保存世代を読めません。'));
  valueRequest.onerror=()=>abort(valueRequest.error??fail('idb-read','保存世代を読めません。'));
 }catch(error){abort(error);}
 try{await done;}catch(error){throw cause??error;}
 checkSources();
 const checked=await readMainRecord(db,{reader,cryptoApi});
 checkSources();
 if(!checked||!same(checked.record,next)||!same(checked.metadata,metadata)||!same(checked.origin,origin))
  throw fail('readback','書込み後の記録が一致しません。');
 return {revision,sha256:next.sha256,text,session:checked.session,backupKey:null};
}
