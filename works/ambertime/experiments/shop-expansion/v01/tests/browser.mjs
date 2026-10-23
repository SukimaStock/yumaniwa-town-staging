// Targeted Lab controls only; no main game or comprehensive E2E.
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright'),root=path.resolve(new URL('../../../../../../',import.meta.url).pathname),prefix='/yumaniwa-town-staging';
const folder='works/ambertime/experiments/shop-expansion/v01/',output=process.env.AMBERTIME_OUTPUT??path.join(root,folder,'browser-results.json');
const server=createServer(async(req,res)=>{try{let file=new URL(req.url,'http://localhost').pathname.replace(/^\/yumaniwa-town-staging/,'');if(file.endsWith('/'))file+='index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.ttf':'font/ttf','.json':'application/json'})[path.extname(file)]??'text/plain');res.end(await fs.readFile(path.join(root,file)));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=process.env.AMBERTIME_ORIGIN??`http://127.0.0.1:${server.address().port}${prefix}`,errors=[],checks=[],publishedHashes={};
const browser=await chromium.launch({headless:true,executablePath:process.env.AMBERTIME_CHROME??'/tmp/amber-chromium/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:375,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,acceptDownloads:true});const p=await context.newPage();p.setDefaultTimeout(30000);p.setDefaultNavigationTimeout(60000);p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.storageAccesses=0;for(const key of ['localStorage','sessionStorage','indexedDB'])Object.defineProperty(window,key,{get(){window.storageAccesses++;throw Error('Independent Lab storage boundary');}});});
 await p.goto(origin+'/works/ambertime-shop-expansion-lab/');await p.waitForFunction(()=>typeof window.labExport==='function');await p.evaluate(()=>document.fonts.ready);assert.equal(new URL(p.url()).pathname,prefix+'/'+folder);
 const paths=[folder+'index.html',folder+'app.mjs',folder+'style.css',folder+'model.mjs','works/ambertime/experiments/town-simulation/v01/model.mjs','works/ambertime/experiments/reputation/v03/model.mjs','works/ambertime/experiments/reputation/v05/core.mjs','works/ambertime-flavor-lab-v02/model.mjs','works/ambertime-shop-expansion-lab/index.html','lab/index.html'];
 for(const file of paths){const r=await p.request.get(origin+'/'+file+'?verify='+Date.now());assert.equal(r.status(),200,file);const actual=createHash('sha256').update(await r.body()).digest('hex'),expected=createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex');assert.equal(actual,expected,file);publishedHashes[file]=actual;}
 const fit=async()=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
 const settings=async changes=>{await p.locator('#conditions').evaluate(e=>e.open=true);for(const[k,v]of Object.entries(changes))await p.locator('#'+k).selectOption(v);await p.locator('#reset').click();await p.locator('#conditions').evaluate(e=>e.open=false);};
 const jump=async year=>{await p.locator(`[data-year="${year}"]`).click();await p.waitForFunction(m=>window.labSnapshot().month===m,year*12);await p.waitForFunction(()=>!document.getElementById('download').disabled);};
 for(const width of [375,390]){
  await p.setViewportSize({width,height:844});await settings({group:'E',timing:'rotation',access:'open',flavor:'fruit',change:'same'});
  await p.locator('[data-shop="bar"]').tap();assert.match(await p.locator('#handler-comment').innerText(),/まだありません/);await fit();checks.push({width,name:'unshipped shop has no invented reaction'});
  await jump(10);await p.locator('[data-shop="bar"]').tap();const current=await p.evaluate(()=>window.labExport());const row=current.summary.shops.find(x=>x.id==='bar');assert.equal(row.liked,false);assert((await p.locator('#handler-comment').innerText()).includes(row.lastComment));assert(!/好みに合います/.test(row.lastComment));await fit();
  await p.locator('[data-shop="diner"]').tap();assert.match(await p.locator('#handler-comment').innerText(),/好みに合います|紹介してみたい/);await p.screenshot({path:`/tmp/ambertime-026-${width}-fruit.png`,fullPage:true});checks.push({width,name:'same fruit: bar mismatch and diner compatible handler; no score'});
  const promise=p.waitForEvent('download');await p.locator('#download').click();const download=await promise,file=`/tmp/ambertime-026-export-${width}.json`;await download.saveAs(file);const log=JSON.parse(await fs.readFile(file,'utf8'));assert.deepEqual(log,await p.evaluate(()=>JSON.parse(JSON.stringify(window.labExport()))));
  await p.locator('#next-month').click();await p.waitForFunction(()=>window.labSnapshot().month===121);await p.locator('#import-log').setInputFiles(file);await p.waitForFunction(()=>window.labSnapshot().month===120);assert.equal((await p.evaluate(()=>window.labExport())).checksum,log.checksum);checks.push({width,name:'actual JSON download, month advance and exact file replay'});
  await settings({flavor:'smoke'});await jump(10);await p.locator('[data-shop="bar"]').tap();assert.equal((await p.evaluate(()=>window.labExport())).summary.shops.find(x=>x.id==='bar').liked,true);await fit();checks.push({width,name:'changed cut/cards: smoke finds compatible bar under same existing affinity'});
  await settings({flavor:'fruit',access:'discovery',change:'switch'});await jump(30);const final=await p.evaluate(()=>window.labExport());assert(final.validation.ok);assert(final.events.some(x=>x.type==='offer'));assert.equal(final.summary.delivered,720);await p.locator('[data-shop="specialist"]').tap();await fit();checks.push({width,name:'30year event-gated shops, actual receipts and bounded display'});
  const before=await p.evaluate(()=>window.labExport().checksum);await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>window.labExport().checksum),before);assert.equal(await p.evaluate(()=>window.storageAccesses),0);checks.push({width,name:'no idle progress or main storage access'});
 }
 await p.setViewportSize({width:1280,height:900});await fit();await p.screenshot({path:'/tmp/ambertime-026-1280.png',fullPage:true});checks.push({width:1280,name:'desktop no overflow'});
 await p.locator('a[href="../../../../../lab/"]').click();await p.locator('[data-room-link="bench"]').click();await p.locator('a[href="../works/ambertime-shop-expansion-lab/"]').click();await p.waitForFunction(()=>typeof window.labExport==='function');assert.equal(await p.evaluate(()=>window.labSnapshot().month),0);checks.push({name:'LAB Prototype Bench launcher round trip'});
 assert.deepEqual(errors,[]);const result={origin,browser:await browser.version(),physicalIPhone:false,checks,errors,publishedHashes};await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors,output}));await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
