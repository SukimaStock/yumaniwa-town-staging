// Isolated new-game probe: distinguish module initialization from replay requests.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve,extname} from 'node:path';
const output=process.argv[2];assert(output,'worker-init.mjs <result-json>');
const root=resolve(import.meta.dirname,'../../..'),fingerprint=files=>createHash('sha256').update(files.map(name=>readFileSync(resolve(root,'works/ambertime',name),'utf8')).join('\n')).digest('hex');
const workers=['history-worker.mjs','cask-ledger-worker.mjs'],result={status:'incomplete',scope:'New game; init and no initial snapshot. Not a 100-year Worker replay measurement.',codeFingerprint:fingerprint(['index.html','shop-app.mjs',...workers]),runnerFingerprint:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),workers:[],pageErrors:[]};
const server=createServer((req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+path+(path.endsWith('/')?'index.html':''));assert(file.startsWith(root+'/'));let bytes=readFileSync(file);if(workers.some(name=>path===`/works/ambertime/${name}`))bytes=Buffer.concat([bytes,Buffer.from("\nself.postMessage({__amberH1InitReady:true,path:new URL(import.meta.url).pathname,epoch:performance.timeOrigin+performance.now()});\n")]);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf'})[extname(file)]??'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const require=createRequire(resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/package.json')),{chromium}=require('playwright');let browser;
try{
 browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE??'/tmp/h1-b1-browser/runtime/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});result.browser=browser.version();const page=await browser.newPage({viewport:{width:390,height:740}});
 page.on('pageerror',e=>result.pageErrors.push(e.message));
 await page.addInitScript(()=>{const Native=Worker;window.__workerInit={created:[],ready:[],posted:0};window.Worker=class extends Native{constructor(url,options){super(url,options);this.addEventListener('message',e=>{if(e.data?.__amberH1InitReady){e.stopImmediatePropagation();window.__workerInit.ready.push(e.data);}});window.__workerInit.created.push({url:String(url),time:performance.now()});}postMessage(...args){window.__workerInit.posted++;return super.postMessage(...args);}};});
 await page.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/`);await page.waitForFunction(()=>window.__workerInit?.ready.length===2&&!!window.amberPlacement,{},{timeout:10000});
 await page.locator('#room-nav [data-room="warehouse"]').click({timeout:10000});await page.waitForFunction(()=>document.body.dataset.room==='warehouse');
 const before=await page.evaluate(()=>({timeOrigin:performance.timeOrigin,...window.__workerInit,saveVersion:JSON.parse(localStorage.getItem('sukimastock.ambertime.main.v1')).version,month:window.amberPlacement.snapshot().core.month}));assert.equal(before.saveVersion,3);assert.equal(before.month,0);assert.equal(before.posted,0);
 result.newGame=before;result.workers=before.ready;result.workerModuleReady=result.workers.map(w=>({...w,relativeToNavigationMs:w.epoch-before.timeOrigin}));assert.equal(result.pageErrors.length,0);result.status='complete';
}catch(error){result.error=String(error.stack??error);process.exitCode=1;}finally{writeFileSync(output,JSON.stringify(result,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
