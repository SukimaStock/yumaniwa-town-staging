// Optional native-browser verification. Test hooks exist only in HTTP responses,
// never in product source. Synthetic saves only; no existing origin is touched.
// Requires an explicitly permitted browser. No fallback or security bypass.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {freshSession,encodeSession} from './formal-idb-runtime-harness.mjs';
import {FORMAL_SAVE_KEY} from '../development-save.mjs';
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
const snapshot=page=>page.evaluate(()=>__idbRuntimeTest.snapshot());
const settled=page=>page.waitForFunction(()=>globalThis.__idbRuntimeTest?.ready());
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
   await page.goto(url);await settled(page);return {context,page,errors};
  }
  await t.test('exact legacy migration and cold reload leave legacy and preflight untouched',async()=>{
   const h=await open();try{
    const before=await snapshot(h.page);assert.equal((await readHead(h.page)).text,legacy);
    assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),FORMAL_SAVE_KEY),legacy);
    // Preflight remains absent. Main boot must not create or adopt that namespace.
    assert.ok(!(await h.page.evaluate(()=>indexedDB.databases())).some(db=>db.name===STAGING_IDB_NAME));
    await h.page.reload();await settled(h.page);assert.deepEqual(await snapshot(h.page),before);assert.deepEqual(h.errors,[]);
   }finally{await h.context.close();}
  });
  await t.test('empty origin waits for explicit new start and persists before revealing gameplay',async()=>{
   const h=await open({seed:null});try{
    assert.equal((await snapshot(h.page)).game,null);assert.equal(await h.page.locator('#recovery').isVisible(),true);
    h.page.once('dialog',dialog=>dialog.accept());await h.page.locator('#recovery-new').click();
    await h.page.waitForFunction(()=>__idbRuntimeTest.snapshot().game!==null&&!__idbRuntimeTest.status().saving);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.advancePaused()),true);
    const before=await snapshot(h.page);assert.equal(before.userPaused,true);assert.equal(JSON.parse((await readHead(h.page)).text).version,8);
    assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),FORMAL_SAVE_KEY),null);
    await h.page.reload();await settled(h.page);assert.deepEqual(await snapshot(h.page),before);assert.deepEqual(h.errors,[]);
   }finally{await h.context.close();}
  });
  await t.test('native commit can finish while publication waits; second input is rejected',async()=>{
   const h=await open();try{
    const before=await snapshot(h.page);await h.page.evaluate(()=>{__idbRuntimeTest.gate();globalThis.pendingAction=__idbRuntimeTest.advancePaused();});
    await h.page.waitForFunction(()=>__idbRuntimeTest.nativeCommitted);assert.deepEqual(await snapshot(h.page),before);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.advancePaused()),false);
    await h.page.evaluate(()=>__idbRuntimeTest.release());assert.equal(await h.page.evaluate(()=>pendingAction),true);
    const after=await snapshot(h.page);assert.equal(after.userPaused,true);assert.equal(after.elapsed,before.elapsed+100);
    await h.page.reload();await settled(h.page);assert.deepEqual(await snapshot(h.page),after);assert.deepEqual(h.errors,[]);
   }finally{await h.context.close();}
  });
  await t.test('pagehide during uncertain native completion requires cold reload, without late UI apply',async()=>{
   const h=await open();try{
    const before=await snapshot(h.page);await h.page.evaluate(()=>{__idbRuntimeTest.gate();globalThis.pendingAction=__idbRuntimeTest.advancePaused();});
    await h.page.waitForFunction(()=>__idbRuntimeTest.nativeCommitted);
    await h.page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide'));__idbRuntimeTest.release();});
    assert.equal(await h.page.evaluate(()=>pendingAction),false);assert.deepEqual(await snapshot(h.page),before);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.status().boundary.state),'halted');
    await h.page.reload();await settled(h.page);const restored=await snapshot(h.page);assert.equal(restored.userPaused,true);assert.equal(restored.elapsed,before.elapsed+100);assert.deepEqual(h.errors,[]);
   }finally{await h.context.close();}
  });
  await t.test('two tabs cannot overwrite a newer native revision; injected quota cannot advance',async()=>{
   const h=await open();try{
    const second=await h.context.newPage();await second.goto(url);await settled(second);const before=await snapshot(second);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.advancePaused()),true);const durable=await readHead(h.page);
    assert.equal(await second.evaluate(()=>__idbRuntimeTest.advancePaused()),false);assert.deepEqual(await snapshot(second),before);assert.deepEqual(await readHead(second),durable);
    await h.page.evaluate(()=>__idbRuntimeTest.quota());const firstBefore=await snapshot(h.page);
    assert.equal(await h.page.evaluate(()=>__idbRuntimeTest.advancePaused()),false);assert.deepEqual(await snapshot(h.page),firstBefore);assert.deepEqual(await readHead(h.page),durable);
    assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),FORMAL_SAVE_KEY),legacy);assert.deepEqual(h.errors,[]);
   }finally{await h.context.close();}
  });
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await browser.close();}
});
