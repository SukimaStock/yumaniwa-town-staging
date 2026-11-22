// Native Chromium, synthetic frozen 100-year data, actual adapter and publication
// boundary. This is not the shop UI suite, iPhone, physical quota or power loss.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const output=path.resolve(process.argv[2]??'/tmp/ambertime-large-browser');
await mkdir(output,{recursive:true});
const fixtureDir=path.join(root,'works/ambertime/design/restore-perf-v06/browser-fixture');
const manifest=JSON.parse(await readFile(path.join(fixtureDir,'manifest.json'),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const fixtures={};
for(const [key,meta] of Object.entries(manifest.files)){
 const compressed=await readFile(path.join(fixtureDir,meta.file));assert.equal(hash(compressed),meta.gzipSha256);
 const bytes=gunzipSync(compressed);assert.equal(hash(bytes),meta.sha256);assert.equal(bytes.length,meta.utf8Bytes);fixtures[key]=bytes;
}
const require=createRequire(import.meta.url);
const {chromium}=process.env.AMBER_BROWSER_MODULE?await import(pathToFileURL(process.env.AMBER_BROWSER_MODULE).href):require('playwright');
const server=createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/blank'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>100 year save verification</title>');return;}
 if(pathname.startsWith('/fixture/')){const value=fixtures[pathname.slice(9)];if(!value)throw Error('fixture');res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(value);return;}
 const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');
 const bytes=await readFile(file);res.writeHead(200,{'Content-Type':/\.[cm]?js$/.test(file)?'text/javascript':'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end();}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const launch={headless:true,chromiumSandbox:true,...(process.env.AMBER_BROWSER_EXECUTABLE?{executablePath:process.env.AMBER_BROWSER_EXECUTABLE}:{})};
const report={schema:'ambertime-large-native-browser/1',candidateSha:process.env.AMBER_CANDIDATE_SHA??null,node:process.version,manifest,cases:[],sourceHashes:{},limits:[
 'Native Chromium adapter and real publication boundary on localhost; existing separate suite covers actual shop UI. Not iPhone Safari.',
 'Frozen independent original session hashes cover complete game and every sidecar; oracle objects are not held during restore.',
 'Linux descendant process RSS is sampled every 100 ms; it is an observed high-water sample, not an exact allocation peak. Includes browser/renderer processes, excludes Node oracle process. CDP JS heap values are boundary samples only.',
 'QuotaExceededError is exception injection, not physical disk exhaustion. Clean browser process restart is not OS kill, eviction or power loss.'
]};
for(const f of ['formal-idb-storage.mjs','formal-idb-main.mjs','formal-idb-commit-boundary.mjs','development-save.mjs','partner-orders.mjs','clone-data.mjs'])report.sourceHashes[f]=hash(await readFile(path.join(root,'works/ambertime',f)));
// Each launch has a dedicated profile. All Node descendants are Chromium here.
function rssSample(){
 try{const processes=[];for(const id of readdirSync('/proc').filter(x=>/^\d+$/.test(x))){try{const s=readFileSync('/proc/'+id+'/status','utf8');processes.push({pid:Number(id),ppid:Number(s.match(/^PPid:\s+(\d+)/m)?.[1]),rss:Number(s.match(/^VmRSS:\s+(\d+)/m)?.[1]??0)});}catch{}}
 const ids=new Set([process.pid]);let added=true;while(added){added=false;for(const p of processes)if(ids.has(p.ppid)&&!ids.has(p.pid)){ids.add(p.pid);added=true;}}
 return processes.filter(p=>p.pid!==process.pid&&ids.has(p.pid)).reduce((n,p)=>n+p.rss,0);
 }catch{return null;}
}
let context,page,cdp,interval,peakRssKiB=0,samples=0;
async function launchProfile(profile){context=await chromium.launchPersistentContext(profile,launch);page=await context.newPage();await page.goto(origin+'/blank');cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');report.browser=(await cdp.send('Browser.getVersion')).product;
 await page.evaluate(async()=>{
 const base='/works/ambertime/',D=await import(base+'partner-orders.mjs'),V=await import(base+'development-save.mjs'),M=await import(base+'formal-idb-main.mjs'),S=await import(base+'formal-idb-storage.mjs'),B=await import(base+'formal-idb-commit-boundary.mjs');
 const P=(await import(base+'economy-parameters.mjs')).PARALLEL_PARAMETERS,C=await import(base+'cask-slots.mjs'),L=await import(base+'recent-ledger.mjs'),H=await import(base+'history-record.mjs'),R=await import(base+'recall/collector.mjs'),O=await import(base+'recall/operations.mjs');
 const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs,encoding:'lossless-v1'};
 const check=(value,message)=>{if(!value)throw Error(message);};
 const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
 const h=globalThis.h={D,V,M,S,B,options,check,digest,readerCalls:[],reader(text){const t=performance.now();try{return V.readSession(text,options);}finally{h.readerCalls.push({ms:performance.now()-t,units:text.length});}},async fixture(name){return (await fetch('/fixture/'+name)).text();},async entries(){const db=await S.openMainIdb();try{return [...await S.readMainEntries(db)];}finally{db.close();}},async snapshot(){return digest(JSON.stringify(await this.entries()));},async boot(){this.readerCalls=[];const b=await M.bootMainIdb({reader:this.reader});check(b.ok,'boot failed '+b.reason);this.b=b;this.live=b.session;return {state:b.state,revision:b.revision,calls:this.readerCalls};},async whole(expected){check(await digest(JSON.stringify(this.live))===expected,'whole independent session mismatch');},boundary(){return new B.FormalIdbCommitBoundary({revision:this.b.adapter.status.revision,write:(text,o)=>this.b.adapter.saveCandidate(text,o)});},advance(s){let recall=s.recallRecord;const model=O.createObservedModel(D,({before,after})=>{recall=R.advanceRecall(before,after,recall);});let g=s.game,guard=0;
 while(g.decisions.length){check(++guard<100,'decision guard');const d=g.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');check(o,'decision');g=model.chooseDistillery(g,d.caskId,o.id);}
 if(g.trade.offer)g=model.declineOffer(g);while(g.shop.offer){check(++guard<100,'shop guard');const o=g.shop.offer;g=(o.shopId==='department'?model.declineShop:model.acceptShop)(g,o.shopId,o.id);}
 for(const o of model.regionalOffers(g))g=model.acceptRegionalOffer(g,o.partnerId,o.id);if(g.generations.active.phase==='review')g=model.handoverGeneration(g,g.generations.active.id);
 g=model.tickDistillery(g);check(g.core.month===s.game.core.month+1,'month');return {game:g,userPaused:s.userPaused,elapsed:s.elapsed,caskSlots:C.reconcileCaskSlots(g,s.caskSlots),recentLedger:L.advanceRecentLedger(s.game,g,s.recentLedger),historyRecord:H.advanceHistoryRecord(s.game,g,s.historyRecord),recallRecord:recall};}};
 });
}
async function heap(){const {metrics}=await cdp.send('Performance.getMetrics');return Object.fromEntries(metrics.filter(x=>['JSHeapUsedSize','JSHeapTotalSize'].includes(x.name)).map(x=>[x.name,x.value]));}
async function run(name,fn){peakRssKiB=0;samples=0;const before=await heap(),start=performance.now();const sample=()=>{const n=rssSample();if(n!==null){samples++;peakRssKiB=Math.max(peakRssKiB,n);}};sample();interval=setInterval(sample,100);let result;try{result=await fn();sample();report.cases.push({name,status:'pass',ms:performance.now()-start,beforeHeap:before,afterHeap:await heap(),sampledBrowserTreePeakRssKiB:peakRssKiB,rssSamples:samples,result});}catch(error){report.cases.push({name,status:'fail',ms:performance.now()-start,sampledBrowserTreePeakRssKiB:peakRssKiB,rssSamples:samples,error:error.stack??String(error)});throw error;}finally{clearInterval(interval);console.log(JSON.stringify(report.cases.at(-1)));await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}}
const profile=await mkdtemp(path.join(tmpdir(),'ambertime-large-profile-'));
try{
 await launchProfile(profile);
 await run('initial huge write and formal readback',()=>page.evaluate(async expected=>{await h.boot();h.check(h.b.state==='empty','expected empty DB');const raw=await h.fixture('initial'),t=performance.now(),receipt=await h.b.adapter.startNew(raw);h.live=receipt.session;await h.whole(expected);const entries=new Map(await h.entries());h.check(entries.get('head').text===raw&&!entries.has('previous'),'initial exact write');return {writeAndReadbackMs:performance.now()-t,wireUnits:raw.length,revision:receipt.revision,wholeSessionEqual:true,readerCalls:h.readerCalls};},manifest.initialExpected.sha256));
 await context.close();context=null;await launchProfile(profile);
 await run('new browser process cold restore',()=>page.evaluate(async expected=>{const t=performance.now(),boot=await h.boot(),restoreMs=performance.now()-t;await h.whole(expected);return {...boot,restoreMs,wholeSessionEqual:true};},manifest.initialExpected.sha256));
 await run('next month and huge re-save retains old normal generation',()=>page.evaluate(async expected=>{const prior=h.live,candidate=h.advance(prior);h.check(await h.digest(JSON.stringify(candidate))===expected,'next whole oracle differs');const raw=h.V.serializeSession(candidate.game,candidate,h.options),original=await h.fixture('initial'),expectedWire=await h.fixture('next');h.check(raw===expectedWire,'next canonical wire differs');let applied=0;const boundary=h.boundary(),start=performance.now();await boundary.commit({prepare:()=>({text:raw,session:candidate}),apply:({session})=>{applied++;h.live=session;}});h.check(applied===1&&boundary.status.state==='ready','publication');await h.whole(expected);const e=new Map(await h.entries());h.check(e.get('head').text===raw&&e.get('previous').text===original,'two exact generations');return {nativeSaveAndPublicationMs:performance.now()-start,wholeSessionEqual:true,canonicalWireEqual:true,oldGenerationPreserved:true};},manifest.nextExpected.sha256));
 await context.close();context=null;await launchProfile(profile);
 await run('two generations cold restore in new browser process',()=>page.evaluate(async expected=>{const t=performance.now(),boot=await h.boot(),restoreMs=performance.now()-t;await h.whole(expected);const raw=h.V.serializeSession(h.live.game,h.live,h.options);h.check(raw===await h.fixture('next'),'canonical resave');h.check(boot.calls.length===2,'both formal readers required on cold connection');return {...boot,restoreMs,wholeSessionEqual:true,canonicalResaveEqual:true};},manifest.nextExpected.sha256));
 await run('large save quota injection halts without publication or rotation',()=>page.evaluate(async()=>{const before=await h.snapshot(),live=await h.digest(JSON.stringify(h.live)),raw=await h.fixture('next'),boundary=h.boundary(),oldPut=IDBObjectStore.prototype.put;let injected=false,applied=false,caught=null;IDBObjectStore.prototype.put=function(...args){if(!injected&&this.transaction.db.name===h.S.MAIN_IDB_NAME){injected=true;throw new DOMException('Injected physical-write position','QuotaExceededError');}return oldPut.apply(this,args);};try{await boundary.commit({prepare:()=>({text:raw}),apply:()=>{applied=true;}});}catch(e){caught=e.name;}finally{IDBObjectStore.prototype.put=oldPut;}h.check(injected&&caught==='QuotaExceededError'&&!applied,'quota injection/publication');h.check(boundary.status.state==='halted'&&h.b.adapter.status.state==='halted','safe halt');h.check(await h.snapshot()===before&&await h.digest(JSON.stringify(h.live))===live,'old bytes and full state preserved');return {injected:true,physicalExhaustion:false,oldEntriesUnchanged:true,fullLiveSessionUnchanged:true};}));
 // Reconnect without changing the failed writer's persisted data.
 await page.evaluate(async()=>{h.b.adapter.close();await h.boot();});
 await run('corrupt new head never overwrites old normal generation',()=>page.evaluate(async()=>{const db=await h.S.openMainIdb();try{await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),r=store.get('head');r.onsuccess=()=>store.put({...r.result,text:r.result.text+'x'},'head');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});}finally{db.close();}const before=await h.snapshot(),old=(new Map(await h.entries())).get('previous').text,live=await h.digest(JSON.stringify(h.live)),raw=await h.fixture('next'),boundary=h.boundary();let rejected=false,applied=false;try{await boundary.commit({prepare:()=>({text:raw}),apply:()=>{applied=true;}});}catch{rejected=true;}h.check(rejected&&!applied&&boundary.status.state==='halted','corruption halt');h.check(await h.snapshot()===before,'no write after corruption');h.check(old===await h.fixture('initial'),'old normal exact');h.check(await h.digest(JSON.stringify(h.live))===live,'full live unchanged');h.b.adapter.close();const boot=await h.M.bootMainIdb({reader:h.reader});h.check(!boot.ok&&boot.state==='recovery','corruption cold refusal');return {rejected:true,oldGenerationPreserved:true,noPublication:true,noWrites:true,coldRefused:true};}));
 report.complete=true;report.passed=report.cases.length;await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'complete',cases:report.cases.length,browser:report.browser}));
}finally{clearInterval(interval);await context?.close();await new Promise(resolve=>server.close(resolve));}
