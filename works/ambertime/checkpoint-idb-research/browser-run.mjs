// Local HTTP + real browser runner. No signed-in browser or product storage used.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {dependencyFingerprint} from '../checkpoint-persistence/fingerprint.mjs';
import {loadAdapter} from '../checkpoint-research/prototype.mjs';
const directory=fileURLToPath(new URL('.',import.meta.url)),root=fileURLToPath(new URL('../../../',import.meta.url));
const [output]=process.argv.slice(2);assert(output,'browser-run.mjs <scratch-output-directory>');mkdirSync(output,{recursive:true});
const modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;assert(modules,'CODEX_PRIMARY_RUNTIME_NODE_MODULES required');
const require=createRequire(resolve(modules,'playwright/package.json')),{chromium,webkit}=require('playwright');
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const fixtureRaw=process.env.AMBER_IDB_FIXTURE?readFileSync(process.env.AMBER_IDB_FIXTURE,'utf8'):null,fixture=fixtureRaw?JSON.parse(fixtureRaw):null;
const adapter=await loadAdapter();
const fingerprint=()=>hash({dependency:dependencyFingerprint(adapter.fingerprint),harnessHash:hash(readFileSync(resolve(directory,'harness.html'),'utf8')),fixtureHash:fixtureRaw?hash(fixtureRaw):null});
const initialFingerprint=fingerprint();
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),path=resolve(root,'.'+pathname);if(!path.startsWith(root)||pathname.includes('..')){res.writeHead(403);res.end();return;}const data=readFileSync(path);res.writeHead(200,{'Content-Type':({'.mjs':'text/javascript','.html':'text/html','.json':'application/json'})[extname(path)]??'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/works/ambertime/checkpoint-idb-research/harness.html`;
const results=[];
try{
 const engines=(process.env.AMBER_IDB_ENGINES??'chromium,webkit').split(',');
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]].filter(([name])=>engines.includes(name))){
  const executable=engine==='chromium'?(process.env.AMBER_BROWSER_EXECUTABLE??(existsSync('/tmp/amber-h0-browser/chromium')?'/tmp/amber-h0-browser/chromium':undefined)):process.env.AMBER_WEBKIT_EXECUTABLE;
  for(const limited of engine==='chromium'?[false,true]:[false]){
   const id=engine+(limited?'-limited-js-heap':''),profile=resolve(output,'profile-'+id);let context;
   try{
    const args=engine==='chromium'?['--no-sandbox','--disable-gpu','--disable-software-rasterizer',...(limited?['--js-flags=--max-old-space-size=128']:[])]:[];
    context=await type.launchPersistentContext(profile,{headless:true,executablePath:executable,args});
    const version=context.browser()?.version()??engine;let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);await page.waitForFunction(()=>!!window.harness);
    const run=await page.evaluate(async fixture=>window.harness.runSuite({fixture}),limited&&fixture?{shortRaw:fixture.shortRaw}:fixture);
    assert.equal(run.failed,0,JSON.stringify(run.cases.filter(c=>c.status==='fail')));
    const dbName='ambertime-h1-a4-research-multitab-'+crypto.randomUUID(),second=await context.newPage();await second.goto(base);await second.waitForFunction(()=>!!window.harness);
    const firstBundle=await page.evaluate(name=>window.harness.tabPrepare(name),dbName);
    const competing=await Promise.all([page.evaluate(({name,bundle})=>window.harness.tabSave(name,bundle),{name:dbName,bundle:firstBundle}),second.evaluate(({name,bundle})=>window.harness.tabSave(name,bundle),{name:dbName,bundle:firstBundle})]);
    assert.equal(competing.filter(x=>x.status==='fulfilled').length,1,'CAS must choose exactly one concurrent tab');assert.equal(competing.filter(x=>x.status==='rejected').length,1,'stale competing tab must reject');
    const head=await page.evaluate(name=>window.harness.readHead(name),dbName);assert.equal(head,firstBundle.id);
    const stale=await second.evaluate(({name,bundle})=>window.harness.tabSave(name,bundle,null),{name:dbName,bundle:firstBundle});assert.equal(stale.status,'rejected');
    let nativeQuota={status:'not-supported'};
    if(engine==='chromium'){
     const quotaName='ambertime-h1-a4-research-quota-'+crypto.randomUUID(),token=await page.evaluate(name=>window.harness.quotaSeed(name),quotaName),cdp=await context.newCDPSession(page);
     try{const origin=new URL(base).origin;await cdp.send('Storage.overrideQuotaForOrigin',{origin,quotaSize:65536});const quotaObservation=await cdp.send('Storage.getUsageAndQuota',{origin});const q=await page.evaluate(({name,token})=>window.harness.quotaWrite(name,token),{name:quotaName,token});if(q.rejected){assert.equal(q.name,'QuotaExceededError','native quota rejected for unexpected reason');assert.equal(q.head,token.id,'quota failure changed committed head');}nativeQuota={status:q.rejected?'pass':'unverified-override-not-enforced',kind:'Chromium CDP origin quota override with incompressible payload',quotaObservation,...q};await cdp.send('Storage.overrideQuotaForOrigin',{origin});}catch(error){if(error?.code==='ERR_ASSERTION')throw error;nativeQuota={status:'unverified',error:String(error)};try{await cdp.send('Storage.overrideQuotaForOrigin',{origin:new URL(base).origin});}catch{}}
     finally{await cdp.detach();}
    }
    let resourceProbe={status:'not-run'};
    if(limited&&fixture){try{resourceProbe={status:'completed',value:await page.evaluate(fixture=>window.harness.roundTripFixture(fixture),fixture)};}catch(error){resourceProbe={status:'resource-failure',error:String(error),condition:'26MB fixture with V8 heap128MiB'};await context.close().catch(()=>{});context=await type.launchPersistentContext(profile,{headless:true,executablePath:executable,args:args.filter(a=>!a.startsWith('--js-flags='))});page=await context.newPage();await page.goto(base);await page.waitForFunction(()=>!!window.harness);assert.equal(await page.evaluate(name=>window.harness.readHead(name),dbName),head,'committed head lost after renderer crash');resourceProbe.committedHeadRecovered=true;resourceProbe.recoveryHeap='normal';}}
    const maintenance=!limited&&fixture&&process.env.AMBER_IDB_MAINTENANCE==='1'?await page.evaluate(async fixture=>(await import('./benchmark.mjs')).runMaintenance(fixture,{cycles:100}),fixture):null;
    await page.reload();await page.waitForFunction(()=>!!window.harness);assert.equal(await page.evaluate(name=>window.harness.readHead(name),dbName),head);
    await context.close();context=null;
    // New browser process, same research-only profile. Clean shutdown, not power loss.
    context=await type.launchPersistentContext(profile,{headless:true,executablePath:executable,args});const reopened=await context.newPage();await reopened.goto(base);await reopened.waitForFunction(()=>!!window.harness);assert.equal(await reopened.evaluate(name=>window.harness.readHead(name),dbName),head);
    results.push({id,status:'complete',version,executable:executable??'playwright-default',limitedHeap:limited,codeFingerprint:initialFingerprint,fixtureHash:fixtureRaw?hash(fixtureRaw):null,fixturePresent:!!fixture,fullFixtureInMainSuite:!limited,nativeQuota,resourceProbe,maintenance,...run,multiTab:{concurrentCAS:true,staleWriterRejected:true},reload:true,newBrowserProcessCleanShutdown:true,pageErrors:errors});
   }catch(error){results.push({id,status:context?'failed':'unavailable',error:error.stack??String(error),codeFingerprint:initialFingerprint});}
   finally{await context?.close();}
  }
 }
 const finalFingerprint=fingerprint();
 const result={schema:'ambertime-h1-a4-browser-results/1',status:finalFingerprint!==initialFingerprint?'invalidated':results.some(r=>r.status==='failed')?'failed':'complete-with-declared-limits',node:process.version,platform:process.platform,codeFingerprint:initialFingerprint,results,limitations:['Chromium limited-js-heap sets V8 heap128MiB, not iOS process memory pressure.','Fault-suite quota is injected; nativeQuota separately records controlled CDP engine quota when supported. Physical device-disk exhaustion is unverified.','Browser clean close/reopen and reload do not prove OS kill/power-loss durability.','WebKit automation, when available, does not establish iPhone Safari real-device equivalence.']};
 writeFileSync(resolve(output,'browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));assert.equal(finalFingerprint,initialFingerprint,'Browser code changed during measurement; use new output directory');assert(results.some(r=>r.status==='complete'),'At least one actual browser execution required');assert(!results.some(r=>r.status==='failed'),'Browser protocol assertions failed');
}finally{await new Promise(resolve=>server.close(resolve));}
