// Actual sales room backed by a real inquiry, contract and six-month bottle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as D from '../partner-orders.mjs';
import {naturalDeliveryFixture,sessionFor} from './regional-delivery-helpers.mjs';
import {serializeSession,FORMAL_SAVE_KEY as key} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const enabled=!!process.env.AMBER_BROWSER_MODULE,partnerId='trial-region-desk';
test('regional delivery sales room: bottle,1/5/all, cancel, saved delivery, reload and failed write',{skip:!enabled,timeout:180000},async()=>{
 const game=naturalDeliveryFixture(3),session=sessionFor(game),text=serializeSession(game,session,{enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs}),pid=game.result.productId;
 assert(D.regionalContract(game,partnerId));assert(game.labConnection.town.events.some(e=>e.id===D.regionalContract(game,partnerId).eventId&&e.type==='inquiry'));
 const root=fileURLToPath(new URL('../../../',import.meta.url)),server=createServer(async(req,res)=>{try{
  const pathname=new URL(req.url,'http://localhost').pathname;let file=path.resolve(root,'.'+pathname);if(pathname.endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root))throw Error('path');const data=await readFile(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf'})[path.extname(file)]??'text/html');res.end(data);
 }catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer']});
  const context=await browser.newContext({viewport:{width:390,height:680},hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  const base='http://127.0.0.1:'+server.address().port;await context.addInitScript(({key,text})=>{if(!localStorage.getItem(key))localStorage.setItem(key,text);},{key,text});
  const snapshot=()=>page.evaluate(()=>window.amberPlacement.snapshot());
  async function sales(){
   await page.goto(base+'/works/ambertime/?debug=1');await page.waitForFunction(()=>window.amberPlacement?.snapshot()?.regionalDeliveries);
   for(let i=0;i<20&&await page.locator('#action-dialog').evaluate(d=>d.open);i++){
    const more=page.locator('[data-action="map-continue"]');if(await more.isVisible())await more.click();else await page.locator('#close-dialog').click();
   }
   await page.locator('#room-nav [data-room="sales"]').click();await page.locator('[data-market-shop="trial-region-desk"]').waitFor();
  }
  async function place(choice){
   await page.locator('[data-market-release="'+pid+'"]').click();await page.locator('[data-market-portion="'+choice+'"]').click();
   const target=page.locator('[data-market-place="'+partnerId+'"]'),point=await target.evaluate(el=>{const r=el.getBoundingClientRect();for(const fx of [.96,.9,.75,.5,.25])for(const fy of [.5,.8,.2]){const x=r.width*fx,y=r.height*fy,hit=document.elementFromPoint(r.left+x,r.top+y);if(hit&&(hit===el||el.contains(hit)))return {x,y};}return null;});assert(point,'regional placement surface');await target.click({position:point});
  }
  const pending=()=>page.locator('[data-market-stock="'+partnerId+':'+pid+'"]');
  await sales();
  for(const [width,height] of [[360,568],[375,620],[390,680],[430,740]]){await page.setViewportSize({width,height});const g=await page.locator('#market-board').evaluate(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth};});assert(g.left>=0&&g.right<=g.width+1&&g.top>=0&&g.bottom<=g.height+1&&g.pageWidth<=g.width,JSON.stringify(g));}
  const initial=await snapshot(),stock=initial.core.products.find(p=>p.id===pid).stock;
  await place('1');let reserved=await snapshot();assert.equal(D.regionalDeliveryRows(reserved,partnerId)[0].count,1);assert.equal(reserved.core.cash,initial.core.cash);assert.equal(reserved.core.products.find(p=>p.id===pid).stock,stock);
  await pending().click();assert.match(await page.locator('.market-return').textContent(),/未納品/);await page.locator('[data-market-confirm="return"]').click();assert.equal(D.regionalDeliveryRows(await snapshot(),partnerId).length,0);
  await place('5');reserved=await snapshot();await pending().click();await page.locator('[data-market-cancel]').click();assert.deepEqual((await snapshot()).regionalDeliveries,reserved.regionalDeliveries);
  await pending().click();await page.locator('[data-market-confirm="deliver"]').click();const delivered=await snapshot(),receipt=D.regionalDeliveryHistory(delivered,partnerId)[0];assert.equal(receipt.count,5);assert.equal(receipt.customerSales,null);assert.equal(delivered.core.cash,initial.core.cash+receipt.revenue);assert.equal(delivered.core.products.find(p=>p.id===pid).stock,stock-5);assert.deepEqual(delivered.labConnection,reserved.labConnection);
  await sales();assert.deepEqual((await snapshot()).regionalDeliveries,delivered.regionalDeliveries);
  // Reset to the original lawful fixture for all/cancel and quota failure.
  await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key,text});await sales();await place('all');reserved=await snapshot();assert.equal(D.regionalDeliveryRows(reserved,partnerId)[0].count,stock);await pending().click();await page.locator('[data-market-confirm="return"]').click();assert.equal(D.storeMarketInventory(await snapshot(),pid).hand,stock);
  await place('5');await pending().click();const failedBefore=await snapshot(),oldRaw=await page.evaluate(key=>localStorage.getItem(key),key);
  await page.evaluate(key=>{window.originalRegionalWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('test quota','QuotaExceededError');return window.originalRegionalWrite.call(this,k,v);};},key);
  await page.locator('[data-market-confirm="deliver"]').click();assert.deepEqual((await snapshot()).regionalDeliveries,failedBefore.regionalDeliveries);assert.equal((await snapshot()).core.cash,failedBefore.core.cash);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),oldRaw);
  await page.evaluate(()=>Storage.prototype.setItem=window.originalRegionalWrite);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({seed:3,inquiryId:D.regionalContract(game,partnerId).eventId,checks:['four phone widths','1/5/all','cancel','explicit delivery','reload','failed write'],iPhone:false}));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
