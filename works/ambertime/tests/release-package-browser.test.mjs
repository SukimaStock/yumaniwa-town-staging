// Optional real-browser capture. No browser dependencies ship with the work.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as D from '../partner-orders.mjs';
import {makePackageFixture} from '../design/flavor-packages-20261107/fixture.mjs';

test('C1-L real main: phone shelves, details, ledger and reload',{skip:!process.env.AMBER_BROWSER_MODULE,timeout:180000},async()=>{
 const root=fileURLToPath(new URL('../../../',import.meta.url));
 const output=process.env.AMBER_PACKAGE_SCREENSHOTS;
 const {game,ids}=makePackageFixture(),raw=D.serializeDistillery(game);
 if(output)await mkdir(output,{recursive:true});
 const server=createServer(async(req,res)=>{try{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name.endsWith('/tests/fixtures/placement-established-six.json')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({raw}));return;}
  let file=path.resolve(root,'.'+name);if(name.endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root))throw Error('path');
  res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]??'text/html');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);
  browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:390,height:680},deviceScaleFactor:1,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${server.address().port}/works/ambertime/?preview=1&market-fixture=established`;
  const capture=async(name,selector)=>{if(output){const target=selector?page.locator(selector):page;await target.screenshot({path:path.join(output,name+'.png')});}};
  const dismiss=async()=>{for(let n=0;n<8&&await page.locator('#action-dialog').isVisible();n++){const next=page.locator('[data-action="map-continue"]');if(await next.isVisible())await next.click();else await page.locator('#close-dialog').click();}};
  await page.goto(url);await page.waitForFunction(()=>window.amberPlacement?.snapshot()?.storeMarket);await page.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');await dismiss();
  await page.locator('#room-nav [data-room="sales"]').click();
  const before=await page.evaluate(()=>window.amberPlacement.snapshot());
  assert.deepEqual(await page.locator('.market-hand-list [data-package-family]').evaluateAll(es=>es.map(e=>e.dataset.packageFamily)),['fruit','grain','smoke','body','mixed']);
  for(const [width,height]of [[360,568],[375,620],[390,680],[430,740]]){
   await page.setViewportSize({width,height});await page.waitForFunction(()=>JSON.parse(document.querySelector('#scene-root').dataset.viewport).width===innerWidth);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await page.locator('.market-bottle svg').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().width>0)));
   await capture('sales-'+width);
  }
  await page.setViewportSize({width:390,height:680});await capture('hand-shelf','.market-releases');await capture('shop-shelves','.market-shops');
  await page.locator(`[data-market-release="${ids[0]}"]`).click();await page.locator('[data-market-details="retail"]').click();await page.locator('[data-action="market-retail-product"]').click();
  assert.equal(await page.locator('#dialog-body [data-package-family]').first().getAttribute('data-package-family'),'fruit');await capture('product-detail');await page.locator('#close-dialog').click();
  await page.locator('#open-aux-menu').click();await page.locator('#open-ledger').click();await page.locator('[data-action="ledger-section"][data-id="releases"]').click();
  assert(await page.locator('.ledger-bottle [data-package-family]').count()>0);await capture('ledger');await page.locator('#close-dialog').click();
  assert.deepEqual(await page.evaluate(()=>window.amberPlacement.snapshot()),before);
  await page.reload();await page.waitForFunction(()=>window.amberPlacement?.snapshot()?.storeMarket);await dismiss();await page.locator('#room-nav [data-room="sales"]').click();
  assert.deepEqual(await page.evaluate(()=>window.amberPlacement.snapshot()),before);assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
