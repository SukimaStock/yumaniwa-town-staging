// Research-only atomic envelope. No session-v7 import or production save key.
import {createHash} from 'node:crypto';

export const ENVELOPE_SCHEMA='ambertime-h3-2-research-envelope/1';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const check=(test,code,message)=>{if(!test)fail(code,message);};
const digest=text=>createHash('sha256').update(text).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));
function freeze(value){
 if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
 return value;
}
function assertJSON(value,seen=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){check(Number.isFinite(value),'invalid-json','Non-finite number');return;}
 check(typeof value==='object'&&!seen.has(value),'invalid-json','Only acyclic JSON data is supported');
 check(Array.isArray(value)||Object.getPrototypeOf(value)===Object.prototype,'invalid-json','Only plain JSON objects are supported');
 seen.add(value);
 if(Array.isArray(value)){
  check(Object.keys(value).length===value.length,'invalid-json','Sparse or decorated array');
  for(const child of value)assertJSON(child,seen);
 }else for(const child of Object.values(value))assertJSON(child,seen);
 seen.delete(value);
}
function assertPayload(value,validate){
 assertJSON(value);
 check(value&&typeof value==='object'&&!Array.isArray(value),'invalid-payload','Missing research payload');
 for(const key of ['game','clock','recentLedger','historyRecord','collector'])
  check(value[key]&&typeof value[key]==='object'&&!Array.isArray(value[key]),'invalid-payload',`Missing ${key}`);
 if(validate)validate(value);
}

export function encodeEnvelope(value,{revision=0,parentDigest=null,validate}={}){
 assertPayload(value,validate);
 check(Number.isSafeInteger(revision)&&revision>=0,'invalid-envelope','Invalid revision');
 check(parentDigest===null||/^[0-9a-f]{64}$/.test(parentDigest),'invalid-envelope','Invalid parent digest');
 const body={schema:ENVELOPE_SCHEMA,revision,parentDigest,payload:value};
 const bodyText=JSON.stringify(body);
 return JSON.stringify({...body,digest:digest(bodyText)});
}

export function decodeEnvelope(text,{validate}={}){
 check(typeof text==='string','invalid-envelope','Expected saved JSON text');
 let data;try{data=JSON.parse(text);}catch{fail('invalid-envelope','Malformed saved JSON');}
 const keys=['schema','revision','parentDigest','payload','digest'];
 check(data&&typeof data==='object'&&!Array.isArray(data)&&Object.keys(data).length===keys.length&&keys.every(k=>Object.hasOwn(data,k)), 'invalid-envelope','Envelope fields do not match');
 check(data.schema===ENVELOPE_SCHEMA,'unsupported-version','Unknown research schema');
 check(typeof data.digest==='string'&&/^[0-9a-f]{64}$/.test(data.digest),'invalid-envelope','Missing checksum');
 const regenerated=encodeEnvelope(data.payload,{revision:data.revision,parentDigest:data.parentDigest,validate});
 check(regenerated===text,'corrupt','Checksum or canonical encoding mismatch');
 return {value:freeze(data.payload),revision:data.revision,parentDigest:data.parentDigest,digest:data.digest};
}

// This is a synchronous single-transaction TEST adapter, not localStorage.
// Verification occurs inside the transaction: a thrown write/readback failure
// rolls back the complete string. A browser adapter must provide equivalent
// transactional CAS semantics; getItem()+setItem() alone cannot do so.
export function createMemoryStore(initial=null){
 let durable=initial, fault=null;
 return {
  read:()=>durable,
  inject(stage,value){fault={stage,value};},
  compareExchange(expected,next){
   const injected=fault;fault=null;
   if(injected?.stage==='conflict')durable=injected.value;
   check(durable===expected,'conflict','Another writer changed the saved record');
   if(injected?.stage==='quota')fail('quota','Simulated capacity exhaustion');
   const previous=durable;
   try{
    durable=next;
    if(injected?.stage==='write')fail('write','Simulated write failure');
    const readback=injected?.stage==='readback'?'incomplete write':durable;
    check(readback===next,'readback','Saved value failed readback verification');
    return durable;
   }catch(error){durable=previous;throw error;}
  },
 };
}

export function createAtomicSession(storage,key,{initial,validate,encode=encodeEnvelope}={}){
 check(typeof key==='string'&&key.startsWith('research:h3-2:'),'invalid-key','Research key required');
 check(typeof storage?.read==='function'&&typeof storage?.compareExchange==='function','invalid-store','Transactional store required');
 let text=storage.read(key);
 if(text===null){
  text=encode(initial,{validate});decodeEnvelope(text,{validate});
  storage.compareExchange(null,text,key);
 }
 let committed=decodeEnvelope(text,{validate});
 const preparations=new WeakSet();
 const snapshot=()=>committed.value;
 function prepare(transform){
  check(typeof transform==='function','invalid-candidate','Candidate builder required');
  // Builder can mutate this detached object; committed game/RNG/recalls remain frozen.
  const candidate=transform(clone(committed.value));
  const nextText=encode(candidate,{revision:committed.revision+1,parentDigest:committed.digest,validate});
  const next=decodeEnvelope(nextText,{validate});
  check(next.revision===committed.revision+1&&next.parentDigest===committed.digest,'invalid-candidate','Candidate revision changed');
  const result=freeze({baseText:text,text:nextText,value:next.value});
  preparations.add(result);return result;
 }
 function commit(prepared){
  check(preparations.has(prepared),'invalid-candidate','Unknown prepared candidate');
  check(prepared.baseText===text,'conflict','Prepared from an older committed state');
  const next=decodeEnvelope(prepared.text,{validate});
  const saved=storage.compareExchange(text,prepared.text,key);
  // The adapter guarantees a mismatch throws and rolls back before returning.
  check(saved===prepared.text,'invalid-store','Adapter violated transactional return contract');
  committed=next;text=prepared.text;preparations.delete(prepared);
  return snapshot();
 }
 return {
  snapshot,text:()=>text,prepare,commit,
  transact:transform=>commit(prepare(transform)),
  reload(){const fresh=storage.read(key),next=decodeEnvelope(fresh,{validate});committed=next;text=fresh;return snapshot();},
 };
}
