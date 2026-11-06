// Optional actual-browser smoke and storage-failure test. Product source is not
// instrumented on disk: the local server exposes test-only inspection/act hooks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const enabled=!!process.env.AMBER_BROWSER_MODULE;
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const key='sukimastock.ambertime.main.v1';
const hooks=`\nglobalThis.__recallTest={snapshot:()=>({game:structuredClone(game),record:structuredClone(recallRecord),pending:structuredClone(pendingRecall),preview:structuredClone(recallPreview),canSave,runtimeHalted}),step:(name,...args)=>{stopClock();return act(s=>D[name](s,...args));},save:()=>save(),stop:()=>{stopClock();userPaused=true;},prepare:()=>{stopClock();return showGeneration();}};`;
async function serve(){
 const server=createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let filename=path.resolve(root,'.'+pathname);if(pathname.endsWith('/'))filename=path.join(filename,'index.html');
  if(!filename.startsWith(root+path.sep))throw Error('path');
  const type={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(filename)]??'application/octet-stream';
  let body=await readFile(filename);if(filename===path.join(root,'works/ambertime/shop-app.mjs'))body=Buffer.concat([body,Buffer.from(hooks)]);
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return server;
}
test('Chromium v8 boot, observed formal operations, reload and failed write recovery',{skip:!enabled,timeout:120000},async()=>{
 const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);
 // Launch before opening the server, so a restricted Chromium environment fails
 // at the actual browser boundary and is never reported as an application pass.
 const browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});
 let server;
 try{
  server=await serve();const context=await browser.newContext({viewport:{width:390,height:680}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/?debug=1`);
  await page.waitForFunction(()=>globalThis.__recallTest&&document.querySelector('#game').hidden===false);
  await page.evaluate(()=>__recallTest.stop());
  const initial=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(initial.version,8);assert.equal(initial.recallRecord.completed.length,0);
  const step=async(name,...args)=>assert.equal(await page.evaluate(([n,a])=>__recallTest.step(n,...a),[name,args]),true,name);
  await step('startRangeDistillation');
  for(let i=0;i<24;i++)await step('distillStep');
  await step('beginCollection');for(let i=0;i<12;i++)await step('distillStep');await step('stopDistillation');
  await page.locator('[data-action="fill"]').click();
  let snapshot=await page.evaluate(()=>__recallTest.snapshot());assert.equal(snapshot.game.core.casks.length,1);assert(snapshot.record.facts['fill:'+snapshot.game.core.casks[0].id]);
  await step('tickDistillery');
  const saved=await page.evaluate(k=>localStorage.getItem(k),key);await page.reload();
  await page.waitForFunction(()=>globalThis.__recallTest&&document.querySelector('#game').hidden===false);await page.evaluate(()=>__recallTest.stop());
  snapshot=await page.evaluate(()=>__recallTest.snapshot());assert.deepEqual(snapshot.record,JSON.parse(saved).recallRecord);
  const before=JSON.stringify(snapshot.game);
  await page.evaluate(()=>{const original=Storage.prototype.setItem;globalThis.__restoreWrite=()=>{Storage.prototype.setItem=original;};Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});
  assert.equal(await page.evaluate(()=>__recallTest.step('tickDistillery')),false);
  snapshot=await page.evaluate(()=>__recallTest.snapshot());assert.equal(JSON.stringify(snapshot.game),before);assert.equal(snapshot.canSave,false);assert.equal(snapshot.runtimeHalted,true);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),saved);
  await page.evaluate(()=>__restoreWrite());assert.deepEqual(errors,[]);
  await context.close();
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await browser.close();}
});
