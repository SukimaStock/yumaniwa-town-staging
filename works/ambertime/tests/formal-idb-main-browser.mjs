// Actual main adapter and official reader on native Chromium. All monkey patches
// are installed in disposable localhost pages, never in product source.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {createFreshSession} from '../session-entry.mjs';
import * as D from '../partner-orders.mjs';
import {serializeSession} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const output=path.resolve(process.argv[2]??process.env.AMBER_BROWSER_RESULTS??'/tmp/ambertime-native-browser');
await mkdir(output,{recursive:true});
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const session={...createFreshSession(D,141),userPaused:true};
const raw=serializeSession(session.game,session,options);
const next=serializeSession(session.game,{...session,elapsed:P.distillStepMs},{...options,encoding:'lossless-v1'});
const third=serializeSession(session.game,{...session,elapsed:2*P.distillStepMs},{...options,encoding:'lossless-v1'});
assert.equal(JSON.parse(raw).version,8);assert.equal(JSON.parse(next).version,9);
const modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES??process.env.AMBER_BROWSER_MODULES;
const require=modules?createRequire(path.resolve(modules,'playwright/package.json')):createRequire(import.meta.url);
const {chromium}=process.env.AMBER_BROWSER_MODULE?await import(pathToFileURL(process.env.AMBER_BROWSER_MODULE).href):require('playwright');
const server=createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/blank'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Native main save test</title>');return;}
 let f=path.resolve(root,'.'+pathname);if(!f.startsWith(root))throw Error('path');
 const body=await readFile(f);res.writeHead(200,{'Content-Type':({'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.json':'application/json'})[path.extname(f)]??'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end();}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const launch={headless:true,chromiumSandbox:true,...(process.env.AMBER_BROWSER_EXECUTABLE?{executablePath:process.env.AMBER_BROWSER_EXECUTABLE}:{})};
const cases=[],sourceHashes={};for(const f of ['formal-idb-storage.mjs','formal-idb-main.mjs','development-save.mjs','shop-app.mjs'])sourceHashes[f]=createHash('sha256').update(await readFile(path.join(root,'works/ambertime',f))).digest('hex');
let browser;
async function init(page,seed=raw){await page.goto(origin+'/blank');await page.evaluate(async({raw,next,third,seed})=>{
 const M=await import('/works/ambertime/formal-idb-main.mjs'),S=await import('/works/ambertime/formal-idb-storage.mjs'),V=await import('/works/ambertime/development-save.mjs'),D=await import('/works/ambertime/partner-orders.mjs'),{PARALLEL_PARAMETERS:P}=await import('/works/ambertime/economy-parameters.mjs');
 const reader=text=>V.readSession(text,{enabled:true,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs});
 if(seed!==null)localStorage.setItem(V.FORMAL_SAVE_KEY,seed);
 globalThis.h={raw,next,third,M,S,V,reader,boot:()=>M.bootMainIdb({reader}),async entries(){const db=await S.openMainIdb();try{return [...await S.readMainEntries(db)];}finally{db.close();}},async mutate(key){const db=await S.openMainIdb();try{await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),s=tx.objectStore('records'),r=s.get(key);r.onsuccess=()=>s.put({...r.result,text:r.result.text+'x'},key);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});}finally{db.close();}},old:()=>localStorage.getItem(V.FORMAL_SAVE_KEY),async save(text=next){try{return {ok:true,receipt:await this.b.adapter.saveCandidate(text)};}catch(e){return {ok:false,code:e.code??e.name};}},async start(){this.b=await this.boot();return {ok:this.b.ok,reason:this.b.reason,text:this.b.text};},fault(mode){
  const oldPut=IDBObjectStore.prototype.put,oldAdd=IDBObjectStore.prototype.add,oldTx=IDBDatabase.prototype.transaction;let armed=true,afterCommit=false;
  const handle=function(original,value,key){
   if(armed&&this.transaction.db.name===S.MAIN_IDB_NAME){
    if(mode==='quota'){armed=false;throw new DOMException('Injected before write','QuotaExceededError');}
    if(mode==='abort'&&key==='head'){const r=original.call(this,value,key);armed=false;this.transaction.abort();return r;}
    if(mode==='hold'&&key==='head'){const r=original.call(this,value,key),store=this;armed=false;globalThis.h.holding=true;const keep=()=>{try{const q=store.get('head');q.onsuccess=()=>{if(globalThis.h.holding)keep();};}catch{}};keep();return r;}
   }
   return original.call(this,value,key);
  };
  IDBObjectStore.prototype.put=function(v,k){return handle.call(this,oldPut,v,k);};
  IDBObjectStore.prototype.add=function(v,k){return handle.call(this,oldAdd,v,k);};
  IDBDatabase.prototype.transaction=function(...args){
   if(mode==='readback'&&afterCommit&&this.name===S.MAIN_IDB_NAME&&(args[1]??'readonly')==='readonly'){afterCommit=false;throw new DOMException('Injected postcommit readback','UnknownError');}
   const tx=oldTx.apply(this,args);if(mode==='readback'&&armed&&this.name===S.MAIN_IDB_NAME&&args[1]==='readwrite'){armed=false;tx.addEventListener('complete',()=>{afterCommit=true;});}return tx;
  };
  this.unfault=()=>{this.holding=false;IDBObjectStore.prototype.put=oldPut;IDBObjectStore.prototype.add=oldAdd;IDBDatabase.prototype.transaction=oldTx;};
 }};
 },{raw,next,third,seed});}
async function fresh(fn,seed=raw){const context=await browser.newContext(),page=await context.newPage();try{await init(page,seed);await fn(page,context);}finally{await context.close();}}
async function test(name,kind,fn){const t=performance.now();try{await fn();cases.push({name,kind,status:'pass',ms:performance.now()-t});}catch(e){cases.push({name,kind,status:'fail',ms:performance.now()-t,error:e.stack??String(e)});}console.log(JSON.stringify(cases.at(-1)));}
const entries=p=>p.evaluate(()=>h.entries());
const boot=p=>p.evaluate(()=>h.start());
const save=p=>p.evaluate(()=>h.save());
try{
 browser=await chromium.launch(launch);
 await test('migration preserves exact v8; real writer accepts official lossless v9','native transactions + official reader',()=>fresh(async p=>{
  assert.equal((await boot(p)).reason,'migrated');assert.equal(await p.evaluate(()=>h.old()),raw);
  assert.equal((await save(p)).ok,true);const e=new Map(await entries(p));assert.equal(e.get('head').text,next);assert.equal(e.get('previous').text,raw);assert.equal(e.get('origin').sources[0].text,raw);
  assert.equal(await p.evaluate(async()=>{h.b.adapter.close();h.b=await h.boot();return h.b.session.elapsed;}),P.distillStepMs);
 }));
 for(const mode of ['quota','abort'])await test(mode+' rejects and keeps all prior bytes','quota injected exception; abort native transaction',()=>fresh(async p=>{
  await boot(p);const before=await entries(p);await p.evaluate(mode=>h.fault(mode),mode);const r=await save(p);assert.equal(r.ok,false);if(mode==='quota')assert.equal(r.code,'QuotaExceededError');else assert.ok(['AbortError','idb-abort'].includes(r.code),r.code);
  await p.evaluate(()=>h.unfault());assert.deepEqual(await entries(p),before);assert.equal(await p.evaluate(()=>h.b.adapter.status.state),'halted');assert.equal(await p.evaluate(()=>h.b.adapter.text),raw);assert.equal(await p.evaluate(()=>h.old()),raw);
 }));
 await test('postcommit readback failure halts; old normal generation survives','injected readback failure after native commit',()=>fresh(async p=>{
  await boot(p);await p.evaluate(()=>h.fault('readback'));assert.equal((await save(p)).ok,false);await p.evaluate(()=>h.unfault());
  assert.equal(await p.evaluate(()=>h.b.adapter.status.state),'halted');assert.equal(await p.evaluate(()=>h.b.adapter.text),raw);
  const e=new Map(await entries(p));assert.equal(e.get('head').text,next);assert.equal(e.get('previous').text,raw);assert.equal(await p.evaluate(()=>h.old()),raw);
  assert.equal(await p.evaluate(async()=>{h.b.adapter.close();h.b=await h.boot();return h.b.text;}),next);
 }));
 for(const key of ['head','previous'])await test('corrupt '+key+' stops rotation without overwriting other generations','injected native DB corruption + official validation',()=>fresh(async p=>{
  await boot(p);assert.equal((await save(p)).ok,true);await p.evaluate(key=>h.mutate(key),key);const before=await entries(p);
  assert.equal((await p.evaluate(()=>h.save(h.third))).ok,false);assert.deepEqual(await entries(p),before);assert.equal(await p.evaluate(()=>h.b.adapter.status.state),'halted');assert.equal(await p.evaluate(()=>h.old()),raw);
  const result=await p.evaluate(async()=>{h.b.adapter.close();return h.boot();});assert.equal(result.ok,false);assert.equal(result.state,'recovery');
 }));
 await test('closing page during native write leaves complete old or new generation','actual page close with active transaction; not OS kill',()=>fresh(async(p,context)=>{
  await boot(p);await p.evaluate(()=>{h.fault('hold');globalThis.pending=h.save();});await p.waitForFunction(()=>h.holding);await p.close();
  const q=await context.newPage();await init(q,null);const r=await boot(q);assert.equal(r.ok,true);assert.ok([raw,next].includes(r.text));assert.equal(await q.evaluate(()=>h.old()),raw);
  const e=new Map(await entries(q));assert.equal(e.get('head').text,r.text);if(r.text===next)assert.equal(e.get('previous').text,raw);
 }));
 await test('two native tabs reject stale CAS and retain winning exact head','actual two pages, native serialized write transactions',()=>fresh(async(p,context)=>{
  await boot(p);const q=await context.newPage();await init(q,null);await boot(q);assert.equal((await save(p)).ok,true);const before=await entries(p);
  const stale=await save(q);assert.equal(stale.ok,false);assert.equal(stale.code,'conflict');assert.deepEqual(await entries(q),before);assert.equal(await q.evaluate(()=>h.b.adapter.status.state),'halted');
 }));
 await test('migration interrupted in native transaction retains exact legacy and empty IDB','native transaction abort during migration',()=>fresh(async p=>{
  await p.evaluate(()=>h.fault('abort'));const r=await boot(p);assert.equal(r.ok,false);await p.evaluate(()=>h.unfault());assert.deepEqual(await entries(p),[]);assert.equal(await p.evaluate(()=>h.old()),raw);
 }));
 await test('overlapping input is rejected while first real save succeeds once','actual adapter busy guard and native writer',()=>fresh(async p=>{
  await boot(p);const results=await p.evaluate(async()=>Promise.all([h.save(),h.save(h.third)]));assert.equal(results[0].ok,true);assert.equal(results[1].ok,false);assert.equal(results[1].code,'pending-save');
  const e=new Map(await entries(p));assert.equal(e.get('head').revision,2);assert.equal(e.get('head').text,next);assert.equal(e.get('previous').text,raw);
 }));
 await test('first save after cold adapter restore fails safely','injected quota on first native write after cold connection',()=>fresh(async p=>{
  await boot(p);assert.equal((await save(p)).ok,true);await p.evaluate(async()=>{h.b.adapter.close();h.b=await h.boot();});const before=await entries(p);
  await p.evaluate(()=>h.fault('quota'));assert.equal((await p.evaluate(()=>h.save(h.third))).ok,false);await p.evaluate(()=>h.unfault());assert.deepEqual(await entries(p),before);assert.equal(await p.evaluate(()=>h.b.adapter.text),next);
 }));
 await test('new browser process restores exact official state','native persistent profile clean close/reopen; not power loss',async()=>{
  const profile=await mkdtemp(path.join(tmpdir(),'ambertime-browser-profile-'));let c=await chromium.launchPersistentContext(profile,launch);
  try{let p=await c.newPage();await init(p);await boot(p);assert.equal((await save(p)).ok,true);await c.close();c=await chromium.launchPersistentContext(profile,launch);p=await c.newPage();await init(p,null);const r=await boot(p);assert.equal(r.ok,true);assert.equal(r.text,next);assert.equal(await p.evaluate(()=>h.b.session.elapsed),P.distillStepMs);assert.equal(await p.evaluate(()=>h.old()),raw);}finally{await c.close();}
 });
 const report={schema:'ambertime-main-native-browser/1',candidateSha:process.env.AMBER_CANDIDATE_SHA??null,browser:await browser.version(),node:process.version,sourceHashes,fixtureHashes:{legacy:createHash('sha256').update(raw).digest('hex'),lossless:createHash('sha256').update(next).digest('hex')},cases,limits:['Actual native Chromium IndexedDB; injected exception quota is not physical disk exhaustion.','Native transaction abort and page closure do not prove OS-kill/power-loss/eviction durability.','Main adapter/official reader tests complement actual runtime UI browser tests; neither is iPhone Safari.','Only synthetic saves in dedicated localhost origin/profiles; no author data.']};
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(cases.filter(x=>x.status==='fail').length,0,'Native main browser safety case failed');console.log(JSON.stringify({status:'complete',cases:cases.length,browser:report.browser}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
