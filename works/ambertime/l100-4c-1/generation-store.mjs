// Isolated L100-4C-1 research. Never imported by the application.
// Driver atomic(callback) must serialize read/write transactions and rollback throws.
// Production adoption requires an explicit formal validator, not a checksum predicate.
export const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const copy=x=>structuredClone(x);
const require=(v,m)=>{if(!v)throw Error(m);};
const fault=(where,at)=>{if(where===at)throw Error('injected:'+at);};
export const empty=()=>({head:null,revision:0,published:[],records:{}});
function metadata(s){require(s&&Number.isSafeInteger(s.revision)&&s.revision>=0&&Array.isArray(s.published)&&new Set(s.published).size===s.published.length&&s.records&&typeof s.records==='object','invalid metadata');require(s.head===null||s.published.includes(s.head),'unpublished head');for(const id of s.published)require(typeof id==='string'&&/^[a-zA-Z0-9-]+$/.test(id),'invalid published id');}
function tokenCheck(s,t){metadata(s);require(s.head===t.head&&s.revision===t.revision,'stale writer');require(s.revision<Number.MAX_SAFE_INTEGER,'revision overflow');}
export class MemoryDriver {
 constructor(){this.state=empty();this.chain=Promise.resolve();}
 async snapshot(){await this.chain;return copy(this.state);}
 atomic(fn){const p=this.chain.then(()=>{const next=copy(this.state);const result=fn(next);require(!(result instanceof Promise),'atomic callback must be synchronous');this.state=next;return result;});this.chain=p.catch(()=>{});return p;}
}
export class GenerationStore {
 constructor(driver,validate){require(typeof validate==='function','formal validator required');this.driver=driver;this.validate=validate;}
 async token(){const s=await this.driver.snapshot();metadata(s);return {head:s.head,revision:s.revision};}
 async make(bytes,{id=crypto.randomUUID(),model='game20',mode='C',token}={}){
  require(typeof bytes==='string'&&/^[a-zA-Z0-9-]+$/.test(id)&&['C','D'].includes(mode),'invalid candidate');require(token&&Number.isSafeInteger(token.revision),'writer token required');
  await this.validate(bytes);const chunkSize=mode==='C'?Math.max(1,bytes.length):262144,parts=[];
  // Chunks are exact UTF-16 slices, not independent UTF-8 streams: surrogate pairs may straddle boundaries.
  for(let i=0;i<bytes.length;i+=chunkSize){const text=bytes.slice(i,i+chunkSize);parts.push({generation:id,index:parts.length,text,units:text.length,hash:await hash(text)});}
  const manifest={schema:1,saveVersion:8,model,generation:id,expected:copy(token),mode,units:bytes.length,utf8Bytes:new TextEncoder().encode(bytes).length,sourceHash:await hash(bytes),parts:parts.map(p=>({index:p.index,units:p.units,hash:p.hash}))};
  return {manifest,manifestHash:await hash(JSON.stringify(manifest)),parts};
 }
 async verify(bundle,expectedId){
  require(bundle?.manifest&&Array.isArray(bundle.parts),'missing generation');const m=bundle.manifest;require(expectedId===undefined||m.generation===expectedId,'generation key mismatch');require(m.schema===1&&m.saveVersion===8&&m.model==='game20'&&['C','D'].includes(m.mode)&&/^[a-zA-Z0-9-]+$/.test(m.generation),'version/model/generation');require(await hash(JSON.stringify(m))===bundle.manifestHash,'manifest hash');require(Array.isArray(m.parts)&&m.parts.length===bundle.parts.length&&m.parts.length>0,'missing parts');
  const texts=[];for(let i=0;i<m.parts.length;i++){const p=bundle.parts[i],r=m.parts[i];require(p&&p.generation===m.generation&&p.index===i&&r.index===i&&typeof p.text==='string'&&p.units===p.text.length&&r.units===p.units&&p.hash===r.hash&&await hash(p.text)===r.hash,'part integrity');texts.push(p.text);}
  const bytes=texts.join('');require(bytes.length===m.units&&new TextEncoder().encode(bytes).length===m.utf8Bytes&&await hash(bytes)===m.sourceHash,'source integrity');await this.validate(bytes);return bytes;
 }
 async save(bundle,{failAt=null,afterPrepare}={}){
  bundle=copy(bundle);await this.verify(bundle);fault('candidate',failAt);const id=bundle.manifest.generation,token=bundle.manifest.expected;
  // Immutable candidate. Existing published generations untouched, even on quota failure.
  await this.driver.atomic(s=>{metadata(s);require(!Object.hasOwn(s.records,id),'candidate id reused');fault('write-denied',failAt);s.records[id]=copy(bundle);fault('write-interrupted',failAt);fault('quota',failAt);});
  await afterPrepare?.();fault('readback',failAt);
  const snapshot=await this.driver.snapshot(),prepared=snapshot.records[id];await this.verify(prepared,id);require(JSON.stringify(prepared)===JSON.stringify(bundle),'readback differs');fault('before-manifest',failAt);
  const committed=await this.driver.atomic(s=>{tokenCheck(s,token);require(JSON.stringify(s.records[id])===JSON.stringify(prepared),'candidate changed during validation');s.published.push(id);s.head=id;s.revision++;fault('commit-interrupted',failAt);return {head:id,revision:s.revision};});
  // Commit succeeded; failure after this point is uncertain to caller. Inspect token, do not blindly retry.
  fault('after-commit',failAt);return committed;
 }
 async recover({beforeActivate}={}){
  const snapshot=await this.driver.snapshot();metadata(snapshot);const token={head:snapshot.head,revision:snapshot.revision},failures=[];
  // Only published generations; never promote prepared orphans. No auto-new-game.
  const order=[snapshot.head,...snapshot.published.slice().reverse()].filter((id,i,a)=>id!==null&&a.indexOf(id)===i);
  for(const id of order){try{const bundle=snapshot.records[id],bytes=await this.verify(bundle,id);await beforeActivate?.();
    const committed=await this.driver.atomic(s=>{tokenCheck(s,token);require(JSON.stringify(s.records[id])===JSON.stringify(bundle),'recovery candidate changed');if(s.head!==id){s.head=id;s.revision++;}return {head:id,revision:s.revision};});
    return {status:id===snapshot.head?'latest':'fallback',id,bytes,failures,token:committed};
   }catch(e){if(/stale writer|recovery candidate changed|revision overflow/.test(e.message))throw e;failures.push({id,error:e.message});}}
  return {status:'safe-stop',failures,reason:'No verified published save. Origin loss and first visit cannot be distinguished locally.'};
 }
 // No automatic GC in this prototype: retain all known published generations until a separate verified retention policy exists.
}
