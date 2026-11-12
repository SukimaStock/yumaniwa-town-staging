// Optional native-browser verification. Test hooks exist only in HTTP responses,
// never in product source. Synthetic saves only; no existing origin is touched.
// Requires an explicitly permitted browser. No fallback or security bypass.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFreshSession} from '../session-entry.mjs';
import * as nativeModel from '../partner-orders.mjs';
const freshSession=()=>createFreshSession(nativeModel,141);
import {encodeSession,options as formalOptions} from './formal-idb-runtime-harness.mjs';
import {FORMAL_SAVE_KEY,readSession} from '../development-save.mjs';
import {MAIN_IDB_NAME,STAGING_IDB_NAME} from '../formal-idb-storage.mjs';
const enabled=!!process.env.AMBER_BROWSER_MODULE&&!!process.env.AMBER_BROWSER_EXECUTABLE;
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const hooks=`
// Served test-only hooks: retain real runtime and real native IDB writer.
globalThis.__idbRuntimeTest={
 ready:()=>!runtimeStarting,
 snapshot:()=>structuredClone({game,userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord}),
 status:()=>({canSave,runtimeHalted,saving:savingBusy(),boundary:commitBoundary?.status}),
 advancePaused:()=>act(s=>s,null,null,{paused:true,time:elapsed+100}),
 nativeFault(mode){
  if(!['abort','readback'].includes(mode))throw Error('Unknown native test fault');
  this.restoreNativeFault?.();
  const actual=mainStore,oldPut=IDBObjectStore.prototype.put,oldTransaction=IDBDatabase.prototype.transaction;
  const observation=this.nativeFaultObservation={mode,called:false,committed:false};
  let armed=true,awaitingReadback=false;
  const mainName=${JSON.stringify(MAIN_IDB_NAME)};
  this.nativeWriterUnchanged=()=>mainStore===actual;
  const restore=()=>{IDBObjectStore.prototype.put=oldPut;IDBDatabase.prototype.transaction=oldTransaction;};
  this.restoreNativeFault=restore;
  if(mode==='abort')IDBObjectStore.prototype.put=function(value,key){
   const request=oldPut.call(this,value,key);
   if(armed&&key==='head'&&this.transaction.db.name===mainName){
    armed=false;this.transaction.abort();observation.called=true;restore();
   }
   return request;
  };
  if(mode==='readback')IDBDatabase.prototype.transaction=function(...args){
   if(this.name===mainName&&awaitingReadback&&(args[1]??'readonly')==='readonly'){
    awaitingReadback=false;observation.called=true;restore();
    throw new DOMException('Injected native postcommit readback failure','UnknownError');
   }
   const tx=oldTransaction.apply(this,args);
   if(armed&&this.name===mainName&&args[1]==='readwrite'){
    armed=false;tx.addEventListener('complete',()=>{observation.committed=true;awaitingReadback=true;});
   }
   return tx;
  };
 },
 gate(){
  const actual=mainStore;let release;const waiting=new Promise(resolve=>{release=resolve;});
  this.nativeCommitted=false;this.release=release;
  connectMainStore({get status(){return actual.status;},invalidate:error=>actual.invalidate(error),
   importRecord:(text,options)=>actual.importRecord(text,options),startNew:(text,options)=>actual.startNew(text,options),
   saveCandidate:async(text,options)=>{const receipt=await actual.saveCandidate(text,options);this.nativeCommitted=true;await waiting;return receipt;}
  },actual.status.revision);
 },
 quota(){
  const actual=mainStore;
  connectMainStore({get status(){return actual.status;},invalidate:error=>actual.invalidate(error),
   importRecord:(text,options)=>actual.importRecord(text,options),startNew:(text,options)=>actual.startNew(text,options),
   saveCandidate:async()=>{throw new DOMException('Injected quota fault','QuotaExceededError');}
  },actual.status.revision);
 }
};`;
async function serve(){
 const server=createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/blank'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Isolated test origin</title>');return;}
  let filename=path.resolve(root,'.'+pathname);if(pathname.endsWith('/'))filename=path.join(filename,'index.html');
  if(!filename.startsWith(root+path.sep))throw Error('path');
  let body=await readFile(filename);if(filename===path.join(root,'works/ambertime/shop-app.mjs'))body=Buffer.concat([body,Buffer.from(hooks)]);
  const type={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(filename)]??'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return server;
}
const readHead=(page)=>page.evaluate(name=>new Promise((resolve,reject)=>{
 const request=indexedDB.open(name,1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{
  const db=request.result,tx=db.transaction('records','readonly'),get=tx.objectStore('records').get('head');let value;
  get.onsuccess=()=>{value=get.result;};tx.oncomplete=()=>{db.close();resolve(value);};tx.onabort=()=>{db.close();reject(tx.error);};
 };
}),MAIN_IDB_NAME);
const readEntries=page=>page.evaluate(name=>new Promise((resolve,reject)=>{
 const request=indexedDB.open(name,1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{
  const db=request.result,tx=db.transaction('records','readonly'),store=tx.objectStore('records'),keys=store.getAllKeys(),values=store.getAll();
  tx.oncomplete=()=>{db.close();resolve(keys.result.map((key,index)=>[key,values.result[index]]));};tx.onabort=()=>{db.close();reject(tx.error);};
 };
}),MAIN_IDB_NAME);
const snapshot=page=>page.evaluate(()=>__idbRuntimeTest.snapshot());
const settled=page=>page.waitForFunction(()=>globalThis.__idbRuntimeTest?.ready());
async function continueTitle(page){await page.locator('#entry-continue').click();await page.waitForFunction(()=>__idbRuntimeTest.snapshot().game!==null&&!__idbRuntimeTest.status().saving);}
test('native IDB runtime migration, delayed publication, conflict and recovery',{
 skip:enabled?false:'Native browser unverified: set AMBER_BROWSER_MODULE and AMBER_BROWSER_EXECUTABLE only in an authorized browser environment.',timeout:180000
},async t=>{
 const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);
 const browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,chromiumSandbox:true});
 let server;
 try{
  server=await serve();const origin=`http://127.0.0.1:${server.address().port}`,url=origin+'/works/ambertime/';
  const legacy=encodeSession({...freshSession(),userPaused:true});
  async function open({seed=legacy}={}){
   const context=await browser.newContext({viewport:{width:390,height:680}}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/blank');
   if(seed!==null)await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:FORMAL_SAVE_KEY,text:seed});
   await page.goto(url);await settled(page);assert.equal((await snapshot(page)).game,null);if(seed!==null)await continueTitle(page);return {context,page,errors};
  }
  await t.test('exact legacy migration and cold reload leave legacy and preflight untouched',async()=>{
   const h=await open();try{
    const before=await snapshot(h.page);assert.equal((await readHead(h.page)).text,legacy);
    assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),FORMAL_SAVE_KEY),legacy);
    // Preflight remains absent. Main boot must not create or adopt that namespace.
    assert.ok(!(await h.page.evaluate(()=>indexedDB.databases())).some(db=>db.name===STAGING_IDB_NAME));
    await h.page.reload();await settled(h.page);assert.equal((await snapshot(h.page)).game,null);await continueTitle(h.page);assert.deepEqual(await snapshot(h.page),before);assert.deepEqual(h.errors,[]);
   }finally{await h.context.close();}
  });
  await t.test('empty origin waits for explicit new start and persists before revealing gameplay',async()=>{
   const h=await open({seed:null});try{
    assert.equal((await snapshot(h.page)).game,null);assert.equal(await h.page.locator('#entry-screen').isVisible(),true);
    await h.page.locator('#entry-new').click();
    await h.page.waitForFunction(()=>__idbRuntimeTest.snapshot().game!==null&&!__idbRuntimeTest.status().saving);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.advancePaused()),true);
    const before=await snapshot(h.page);assert.equal(before.userPaused,true);assert.equal(JSON.parse((await readHead(h.page)).text).version,9); // Approved lossless-v1 writer emits v9; official reader below remains authoritative.
    assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),FORMAL_SAVE_KEY),null);
    await h.page.reload();await settled(h.page);assert.equal((await snapshot(h.page)).game,null);await continueTitle(h.page);assert.deepEqual(await snapshot(h.page),before);assert.deepEqual(h.errors,[]);
   }finally{await h.context.close();}
  });
  await t.test('native commit can finish while publication waits; second input is rejected',async()=>{
   const h=await open();try{
    const before=await snapshot(h.page);await h.page.evaluate(()=>{__idbRuntimeTest.gate();globalThis.pendingAction=__idbRuntimeTest.advancePaused();});
    await h.page.waitForFunction(()=>__idbRuntimeTest.nativeCommitted);assert.deepEqual(await snapshot(h.page),before);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.advancePaused()),false);
    await h.page.evaluate(()=>__idbRuntimeTest.release());assert.equal(await h.page.evaluate(()=>pendingAction),true);
    const after=await snapshot(h.page);assert.equal(after.userPaused,true);assert.equal(after.elapsed,before.elapsed+100);
    await h.page.reload();await settled(h.page);assert.equal((await snapshot(h.page)).game,null);await continueTitle(h.page);assert.deepEqual(await snapshot(h.page),after);assert.deepEqual(h.errors,[]);
   }finally{await h.context.close();}
  });
  await t.test('pagehide during uncertain native completion requires cold reload, without late UI apply',async()=>{
   const h=await open();try{
    const before=await snapshot(h.page);await h.page.evaluate(()=>{__idbRuntimeTest.gate();globalThis.pendingAction=__idbRuntimeTest.advancePaused();});
    await h.page.waitForFunction(()=>__idbRuntimeTest.nativeCommitted);
    await h.page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide'));__idbRuntimeTest.release();});
    assert.equal(await h.page.evaluate(()=>pendingAction),false);assert.deepEqual(await snapshot(h.page),before);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.status().boundary.state),'halted');
    await h.page.reload();await settled(h.page);assert.equal((await snapshot(h.page)).game,null);await continueTitle(h.page);const restored=await snapshot(h.page);assert.equal(restored.userPaused,true);assert.equal(restored.elapsed,before.elapsed+100);assert.deepEqual(h.errors,[]);
   }finally{await h.context.close();}
  });
  for(const mode of ['abort','readback'])await t.test('actual runtime '+mode+' fault preserves all visible game and sidecars until cold reload',async()=>{
   const h=await open();try{
    const before=await snapshot(h.page),storedBefore=await readEntries(h.page),oldHead=new Map(storedBefore).get('head');
    await h.page.evaluate(mode=>__idbRuntimeTest.nativeFault(mode),mode);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.nativeWriterUnchanged()),true);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.advancePaused()),false);
    // Full app action uses its actual adapter/writer. Neither fault substitutes
    // mainStore or the publication coordinator with a simulated implementation.
    assert.deepEqual(await snapshot(h.page),before);
    const status=await h.page.evaluate(()=>__idbRuntimeTest.status());
    assert.equal(status.canSave,false);assert.equal(status.runtimeHalted,true);assert.equal(status.boundary.state,'halted');assert.equal(status.saving,false);
    const observed=await h.page.evaluate(()=>__idbRuntimeTest.nativeFaultObservation);
    assert.equal(observed.called,true,'The native IDB hook must actually execute');assert.equal(observed.committed,mode==='readback');
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.nativeWriterUnchanged()),true);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.advancePaused()),false);
    await h.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.deepEqual(await snapshot(h.page),before,'No late publication after the failed native write/readback');
    assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),FORMAL_SAVE_KEY),legacy);
    const storedAfter=await readEntries(h.page),saved=new Map(storedAfter);
    if(mode==='abort')assert.deepEqual(storedAfter,storedBefore,'Native transaction abort must roll back every entry');
    else{
     assert.equal(saved.get('head').revision,oldHead.revision+1);
     assert.deepEqual(saved.get('previous'),oldHead,'Postcommit failure must retain the exact old normal generation');
     assert.notEqual(saved.get('head').text,oldHead.text);
     assert.deepEqual(saved.get('origin'),new Map(storedBefore).get('origin'));
    }
    await h.page.reload();await settled(h.page);assert.equal((await snapshot(h.page)).game,null);await continueTitle(h.page);
    const restored=await snapshot(h.page);
    if(mode==='abort')assert.deepEqual(restored,before);
    else{
     assert.equal(restored.elapsed,before.elapsed+100);assert.equal(restored.userPaused,true);
     assert.deepEqual(restored,readSession(saved.get('head').text,formalOptions),'Cold reload must restore the exact officially validated committed session');
    }
    assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),FORMAL_SAVE_KEY),legacy);assert.deepEqual(h.errors,[]);
   }finally{await h.context.close();}
  });
  await t.test('two tabs cannot overwrite a newer native revision; injected quota cannot advance',async()=>{
   const h=await open();try{
    const second=await h.context.newPage();await second.goto(url);await settled(second);await continueTitle(second);const before=await snapshot(second);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.advancePaused()),true);const durable=await readHead(h.page);
    assert.equal(await second.evaluate(()=>__idbRuntimeTest.advancePaused()),false);assert.deepEqual(await snapshot(second),before);assert.deepEqual(await readHead(second),durable);
    await h.page.evaluate(()=>__idbRuntimeTest.quota());const firstBefore=await snapshot(h.page);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.advancePaused()),false);assert.deepEqual(await snapshot(h.page),firstBefore);assert.deepEqual(await readHead(h.page),durable);
    assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),FORMAL_SAVE_KEY),legacy);assert.deepEqual(h.errors,[]);
   }finally{await h.context.close();}
  });
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await browser.close();}
});
