// Targeted PR review regression suite; real browser IndexedDB only.
import * as S from './store.mjs';
import {input,runSuite} from './browser-suite.mjs';
const assert=(value,label)=>{if(!value)throw new Error(label);};
const equal=(a,b,label)=>assert(JSON.stringify(a)===JSON.stringify(b),label);
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function corruptContext(db,id){const tx=db.transaction('parts','readwrite'),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);}),store=tx.objectStore('parts'),req=store.get(id+':context');req.onsuccess=()=>store.put({...req.result,value:{corrupt:true}},id+':context');await done;}
export async function runP2(fixture){
 const base=await runSuite({fixture}),cases=[];
 async function test(label,fn){const start=performance.now();try{const detail=await fn();cases.push({label,status:'pass',ms:performance.now()-start,...detail});}catch(error){cases.push({label,status:'fail',ms:performance.now()-start,error:error.stack??String(error)});}}
 await test('atomic read remains complete while prepared publication and GC queue concurrently',async()=>{
  const db=await S.openResearchDB('ambertime-h1-a4-research-p2-read-'+crypto.randomUUID());let bundle=await S.makeCommit(input(1));
  try{await S.save(db,bundle);for(let i=2;i<=21;i++){
   const next=await S.makeCommit(input(i)),prepared=deferred(),publish=deferred(),head=bundle.id,revision=await S.currentRevision(db);
   const writing=S.save(db,next,{strategy:'C',expectedHead:head,expectedRevision:revision,afterPrepare:async()=>{prepared.resolve();await publish.promise;}});
   await prepared.promise;const reading=S.read(db);publish.resolve();
   const cleaning=writing.then(()=>S.gc(db,{policy:'A',keep:1}));
   const observed=await reading;equal(observed,bundle,'read mixed publication generations or lost its old payload');await cleaning;equal((await S.read(db)).id,next.id,'new head unreadable after GC');bundle=next;
  }return {iterations:20};}finally{S.close(db);}
 });
 await test('retained A/B commits recover older compatible state after latest corruption',async()=>{
  const results=[];for(const strategy of ['A','B']){
   const db=await S.openResearchDB('ambertime-h1-a4-research-p2-retained-'+strategy+'-'+crypto.randomUUID());try{
    const older=await S.makeCommit(input(1)),latest=await S.makeCommit(input(2));await S.save(db,older,{strategy});await S.save(db,latest,{strategy,expectedHead:older.id,expectedRevision:await S.currentRevision(db)});await corruptContext(db,latest.id);
    const recovered=await S.recover(db,{sourceHash:older.manifest.sourceHash,modelFingerprint:older.manifest.modelFingerprint});assert(recovered.bundle,'retained normal commit was not searched');equal(recovered.bundle,older,'wrong retained fallback');assert(recovered.mode!=='full-replay-required','must recover retained compatible commit');results.push({strategy,mode:recovered.mode,recoveredId:recovered.bundle.id});
   }finally{S.close(db);}
  }return {strategies:results};
 });
 return {base,cases,passed:base.passed+cases.filter(c=>c.status==='pass').length,failed:base.failed+cases.filter(c=>c.status==='fail').length,limits:['Targeted post-review protocol regression, no repeated100-cycle maintenance or low-memory performance measurement.','The separate pre-P2 browser-final-4 timings retain their original fingerprint and are not relabelled as current-code benchmarks.']};
}
