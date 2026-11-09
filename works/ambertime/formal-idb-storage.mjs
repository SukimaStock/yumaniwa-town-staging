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
 reader(record.text);
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
 if(!isRevision(expectedRevision))throw fail('invalid-revision','保存世代の指定が不正です。');
 canonical(text);
 reader(text); // official reader before any mutation
 const sha256=await fingerprint(text,cryptoApi);
 const tx=db.transaction(STORE,'readwrite'),done=completion(tx),store=tx.objectStore(STORE);
 let cause=null;
 const prior=store.get('head');
 prior.onsuccess=()=>{
  try{
   const head=prior.result??null,revision=head?.revision??0;
   if((head!==null&&!validEnvelope(head))||revision!==expectedRevision)
    throw fail('conflict','別の画面で保存が更新されました。');
   const next={schema:SCHEMA,revision:revision+1,text,sha256};
   if(head!==null)store.put(head,'previous');
   store.put(next,'head');
  }catch(error){cause=error;try{tx.abort();}catch{}}
 };
 prior.onerror=()=>{cause=prior.error??fail('idb-read','保存世代を読めません。');try{tx.abort();}catch{}};
 try{await done;}catch(error){throw cause??error;}
 // Confirm the byte string from committed storage, not only request success.
 const checked=await readStagingRecord(db,{reader,cryptoApi});
 if(checked.record.revision!==expectedRevision+1||checked.record.text!==text)
  throw fail('readback','書込み後の記録が一致しません。');
 return {revision:checked.record.revision,sha256};
}
