// H1-A4 research only. No production storage key or database is accessed.
const PREFIX='ambertime-h1-a4-research-';
const clone=x=>structuredClone(x);
function binding(value){const b=value.boundary;if(typeof value.sourceHash!=='string'||!value.sourceHash||typeof value.modelFingerprint!=='string'||!value.modelFingerprint||typeof b?.branch!=='string'||!b.branch||!Number.isSafeInteger(b.seed)||typeof b.originHash!=='string'||!Number.isSafeInteger(b.nextIndex)||b.nextIndex<0)throw new Error('Missing or invalid commit binding');}
export const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(x=>x.toString(16).padStart(2,'0')).join('');
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const completed=tx=>new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??new DOMException('Transaction aborted','AbortError'));tx.onerror=()=>{};});
export function openResearchDB(name,{version=1,onBlocked=()=>{}}={}){
 if(!name.startsWith(PREFIX))throw new Error('Research database namespace required');
 return new Promise((resolve,reject)=>{const req=indexedDB.open(name,version);req.onblocked=()=>onBlocked();req.onerror=()=>reject(req.error);req.onupgradeneeded=()=>{for(const key of ['parts','commits','meta','history','backups'])if(!req.result.objectStoreNames.contains(key))req.result.createObjectStore(key);};req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>db.close();resolve(db);};});
}
export const close=db=>db.close();
export async function makeCommit(input){
 const {sourceHash,modelFingerprint,boundary,checkpoint,context,tail,collector,history=[],verification={}}=clone(input);
 binding({sourceHash,modelFingerprint,boundary});
 if(checkpoint?.nextIndex!==undefined&&checkpoint.nextIndex!==boundary.nextIndex)throw new Error('Checkpoint boundary mismatch');
 if(collector?.nextOperationIndex!==undefined&&collector.nextOperationIndex!==boundary.nextIndex)throw new Error('Collector boundary mismatch');
 if(tail?.startIndex!==undefined&&tail.startIndex!==boundary.nextIndex)throw new Error('Tail start boundary mismatch');
 const boundaryHash=await digest(boundary),parts={};
 for(const [kind,value] of Object.entries({checkpoint,context,tail,collector})){if(value===undefined)throw new Error('Missing '+kind);parts[kind]={value,hash:await digest(value),boundaryHash};}
 const histories=[];for(const entry of history){if(!entry.id)throw new Error('Missing history ID');histories.push({id:entry.id,payload:entry.payload,hash:await digest(entry.payload)});}
 const manifest={schema:'ambertime-idb-research/1',sourceHash,modelFingerprint,boundary,parts:Object.fromEntries(Object.entries(parts).map(([k,p])=>[k,p.hash])),history:histories.map(h=>({id:h.id,hash:h.hash})),verification};
 return {id:await digest(manifest),manifest,parts,histories};
}
async function validateCommit(bundle,expected={}){
 if(!bundle||bundle.id!==await digest(bundle.manifest))throw new Error('Commit integrity mismatch');
 const m=bundle.manifest;binding(m);const boundaryHash=await digest(m.boundary);if(m.schema!=='ambertime-idb-research/1')throw new Error('Unsupported commit format');
 for(const k of ['sourceHash','modelFingerprint'])if(expected[k]&&m[k]!==expected[k])throw new Error(k+' expired or different source');
 for(const kind of ['checkpoint','context','tail','collector']){const part=bundle.parts?.[kind];if(!part||part.boundaryHash!==boundaryHash||await digest(part.value)!==m.parts[kind]||part.hash!==m.parts[kind])throw new Error('Invalid '+kind);}
 for(const ref of m.history){const h=bundle.histories.find(h=>h.id===ref.id&&h.hash===ref.hash);if(!h||await digest(h.payload)!==ref.hash)throw new Error('Invalid historical boundary');}
 // Flags are receipts, not authentication or an independent replay proof.
 return bundle;
}
const partKey=(id,kind)=>id+':'+kind;
async function headOf(db){const tx=db.transaction('meta','readonly');return (await request(tx.objectStore('meta').get('head')))??null;}
export async function currentHead(db){return headOf(db);}
export async function currentRevision(db){const tx=db.transaction('meta','readonly');return (await request(tx.objectStore('meta').get('revision')))??0;}
function inject(point,failAt){if(point===failAt)throw new DOMException('Injected '+point,point==='quota'?'QuotaExceededError':'AbortError');}
function enqueueParts(tx,bundle,failAt){const parts=tx.objectStore('parts');for(const [kind,part] of Object.entries(bundle.parts)){parts.put(clone(part),partKey(bundle.id,kind));inject(kind,failAt);}for(const h of bundle.histories)tx.objectStore('history').put(clone(h),h.id+':'+h.hash);}
export async function save(db,bundle,{strategy='C',expectedHead=null,expectedRevision=0,failAt=null,afterPrepare}={}){
 if(!['A','B','C'].includes(strategy))throw new Error('Unknown strategy');bundle=clone(bundle);await validateCommit(bundle);inject('before',failAt);
 // B/C prepare invisible immutable candidates in a separate transaction.
 if(strategy!=='A'){
  const prep=db.transaction(['parts','history'],'readwrite'),done=completed(prep);
  try{enqueueParts(prep,bundle,failAt);inject('quota',failAt);}catch(error){prep.abort();await done.catch(()=>{});throw error;}await done;await afterPrepare?.();
 }
 const tx=db.transaction(['parts','history','commits','meta'],'readwrite'),done=completed(tx);
 let cause;
 const action=tx.objectStore('meta').get('head');
 action.onsuccess=()=>{try{
  const old=action.result??null;if(old!==expectedHead)throw new Error('Stale writer: expected head mismatch');
  const revisionReq=tx.objectStore('meta').get('revision');revisionReq.onsuccess=()=>{if((revisionReq.result??0)!==expectedRevision){cause=new Error('Stale writer: revision mismatch');tx.abort();return;}tx.objectStore('meta').put(expectedRevision+1,'revision');};
  const orderReq=tx.objectStore('meta').get('order');orderReq.onsuccess=()=>{tx.objectStore('meta').put([...(orderReq.result??[]).filter(id=>id!==bundle.id),bundle.id],'order');};
  for(const h of bundle.histories){const key='history:'+JSON.stringify([bundle.manifest.boundary.branch,h.id]),req=tx.objectStore('meta').get(key);req.onsuccess=()=>{if(req.result!==undefined&&req.result!==h.hash){cause=new Error('Immutable historical boundary changed');tx.abort();return;}tx.objectStore('meta').put(h.hash,key);};}
  enqueueParts(tx,bundle,strategy==='A'?failAt:null);
  inject('quota',failAt);inject('manifest',failAt);
  tx.objectStore('commits').put(clone(bundle.manifest),bundle.id);
  tx.objectStore('meta').put(bundle.id,'head');
  if(old&&strategy==='C')tx.objectStore('meta').put(old,'previous');
  if(failAt==='abort')tx.abort();
 }catch(error){cause=error;tx.abort();}};
 try{await done;}catch(error){throw cause??error;}
 return {id:bundle.id,strategy,revision:expectedRevision+1};
}
async function loadId(db,id,sharedTx){
 if(!id)throw new Error('No committed generation');const tx=sharedTx??db.transaction(['parts','history','commits'],'readonly'),done=sharedTx?null:completed(tx);
 const manifest=await request(tx.objectStore('commits').get(id));if(!manifest)throw new Error('Missing commit manifest');
 // Requests are queued synchronously within IDB request handlers/microtasks.
 const partRequests=Object.keys(manifest.parts).map(async kind=>[kind,await request(tx.objectStore('parts').get(partKey(id,kind)))]);
 const historyRequests=manifest.history.map(ref=>request(tx.objectStore('history').get(ref.id+':'+ref.hash)));
 const parts=Object.fromEntries(await Promise.all(partRequests)),histories=await Promise.all(historyRequests);await done;
 return {id,manifest,parts,histories};
}
export async function read(db,expected={}){
 const tx=db.transaction(['meta','parts','history','commits'],'readonly'),done=completed(tx);
 try{const id=await request(tx.objectStore('meta').get('head')),bundle=await loadId(db,id,tx);await done;return validateCommit(bundle,expected);}
 catch(error){await done.catch(()=>{});throw error;}
}
export async function recover(db,expected={}){
 const tx=db.transaction('meta','readonly'),head=await request(tx.objectStore('meta').get('head')),previous=await request(tx.objectStore('meta').get('previous')),knownGood=await request(tx.objectStore('meta').get('knownGood')),order=(await request(tx.objectStore('meta').get('order')))??[];
 const failures=[],seen=new Set();for(const [mode,id] of [['latest',head],['previous',previous],['known-good',knownGood],...order.slice().reverse().map(id=>['retained',id])]){if(!id||seen.has(id))continue;seen.add(id);try{return {mode,bundle:await validateCommit(await loadId(db,id),expected),failures};}catch(error){failures.push({mode,id,error:error.message});}}
 return {mode:'full-replay-required',failures,reason:'No valid compatible checkpoint. Retained authoritative save required; never initialize automatically.'};
}
export async function putBackup(db,id,raw){const hash=await digest(raw),tx=db.transaction('backups','readwrite'),done=completed(tx);tx.objectStore('backups').put({raw,hash},id);await done;}
export async function readBackup(db,id){const tx=db.transaction('backups','readonly'),v=await request(tx.objectStore('backups').get(id));if(!v||await digest(v.raw)!==v.hash)throw new Error('Missing/corrupt backup');return v.raw;}
export async function rollback(db,id,{expectedHead,expectedRevision,afterValidate}={}){
 const verified=await validateCommit(await loadId(db,id));await afterValidate?.();
 const tx=db.transaction(['meta','commits','parts','history'],'readwrite'),done=completed(tx);let cause;
 try{
  const manifest=await request(tx.objectStore('commits').get(id));
  if(JSON.stringify(manifest)!==JSON.stringify(verified.manifest))throw new Error('Rollback target disappeared or changed');
  for(const [kind,part] of Object.entries(verified.parts))if(JSON.stringify(await request(tx.objectStore('parts').get(partKey(id,kind))))!==JSON.stringify(part))throw new Error('Rollback part disappeared or changed');
  for(const h of verified.histories)if(JSON.stringify(await request(tx.objectStore('history').get(h.id+':'+h.hash)))!==JSON.stringify(h))throw new Error('Rollback history disappeared or changed');
  const head=await request(tx.objectStore('meta').get('head')),revision=await request(tx.objectStore('meta').get('revision'));
  if((head??null)!==expectedHead||(revision??0)!==expectedRevision)throw new Error('Stale rollback token');
  tx.objectStore('meta').put(expectedRevision+1,'revision');tx.objectStore('meta').put(id,'head');tx.objectStore('meta').put(expectedHead,'previous');
 }catch(error){cause=error;tx.abort();}
 try{await done;}catch(error){throw cause??error;}
}
export async function gc(db,{keep=2,policy='C',failAfter}={}){
 if(!['A','B','C','D'].includes(policy)||!Number.isSafeInteger(keep)||keep<1)throw new Error('Invalid retention policy');
 const tx=db.transaction(['parts','history','commits','meta'],'readwrite'),done=completed(tx);let removed=0,cause;
 // Mark/sweep occurs in one transaction with the current head, serializing writers.
 const stores=Object.fromEntries(['parts','history','commits','meta'].map(k=>[k,tx.objectStore(k)]));
 const all=stores.meta.get('order');
 all.onsuccess=()=>{const headReq=stores.meta.get('head');headReq.onsuccess=()=>{const prevReq=stores.meta.get('previous');prevReq.onsuccess=()=>{const goodReq=stores.meta.get('knownGood');goodReq.onsuccess=()=>{
 try{
  const ids=all.result??[],head=headReq.result,previous=prevReq.result;
  const count=policy==='A'?0:Math.max(0,keep-1);
  const retain=new Set([head,...(count?ids.filter(x=>x!==head).slice(-count):[])]);
  if(policy!=='A'&&previous)retain.add(previous);if(policy==='D'&&goodReq.result)retain.add(goodReq.result);
  // Historical memories and backups are deliberately never swept in this study.
  const cursor=stores.parts.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(!c)return;const id=String(c.key).split(':')[0];if(!retain.has(id)){c.delete();removed++;if(failAfter!==undefined&&removed>=failAfter){cause=new Error('Injected GC interruption');tx.abort();return;}}c.continue();};
  for(const id of ids)if(!retain.has(id))stores.commits.delete(id);
  stores.meta.put(ids.filter(id=>retain.has(id)),'order');
 }catch(error){cause=error;tx.abort();}
 };};};};
 try{await done;}catch(error){throw cause??error;}return {removed,policy,keep};
}
export async function inspect(db){const out={};for(const key of ['parts','history','commits','meta','backups']){const tx=db.transaction(key,'readonly');out[key]=await request(tx.objectStore(key).getAll());}return out;}

export async function markKnownGood(db,id){await validateCommit(await loadId(db,id));const tx=db.transaction(['meta','commits'],'readwrite'),done=completed(tx),req=tx.objectStore('commits').get(id);req.onsuccess=()=>{if(!req.result){tx.abort();return;}tx.objectStore('meta').put(id,'knownGood');};await done;}
