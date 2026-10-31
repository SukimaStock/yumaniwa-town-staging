// Optional actual Chromium regression. No browser dependency is shipped with the game.
// AMBER_BROWSER_MODULE=/absolute/path/playwright-core/index.mjs
// AMBER_BROWSER_EXECUTABLE=/absolute/path/chromium node --test <this file>
import test from 'node:test';
import * as D from '../partner-orders.mjs';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const enabled=!!process.env.AMBER_BROWSER_MODULE;
const viewports=[[360,568],[375,620],[390,680],[430,740]];
import {harnessHTML} from './market-browser-fixture.mjs';

test('native compact market browser: short phones, saved real inventory, many releases and ordinary controls',{skip:!enabled,timeout:180000},async()=>{
 const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
 const server=createServer(async(req,res)=>{try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(name==='/__market_harness__/'){res.setHeader('Content-Type','text/html');res.end(harnessHTML);return;}
  let file=path.resolve(root,'.'+name);if(name.endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep))throw Error('path');
  const data=await readFile(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]??'text/html');res.end(data);
 }catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);let browser;
 const errors=[],checks=[];let expectedShops=2;
 try{
  const launch=()=>chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer']});
  const base=`http://127.0.0.1:${server.address().port}`;
  async function geometry(page,width,height){
   await page.setViewportSize({width,height});await page.waitForFunction(()=>{
    const b=document.querySelector('#market-board'),v=JSON.parse(document.querySelector('#scene-root').dataset.viewport||'null');return b&&!b.hidden&&v&&Math.abs(v.width-innerWidth)<1&&Math.abs(v.height-innerHeight)<1&&Math.abs(b.getBoundingClientRect().width-336*v.scale)<1;
   });
   const g=await page.evaluate(()=>{
    const board=document.querySelector('#market-board'),rect=e=>e?e.getBoundingClientRect().toJSON():null;return {width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,board:rect(board),boardClient:board.clientHeight,boardScroll:board.scrollHeight,boardTop:board.scrollTop,shops:[...document.querySelectorAll('.market-shop')].map(rect),targets:[...document.querySelectorAll('[data-market-place]')].map(e=>({...rect(e),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight})),selected:rect(document.querySelector('.market-selected-bottle')),details:[...document.querySelectorAll('.market-shop-details')].map(e=>({...rect(e),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight})),footer:[...document.querySelectorAll('.market-special button')].map(rect),stocks:[...document.querySelectorAll('.market-stock')].map(e=>({bottle:rect(e.querySelector('.market-bottle')),button:rect(e),shelf:rect(e.closest('.market-stock-list'))}))};
   });
   assert(g.pageWidth<=width,JSON.stringify(g));assert(g.pageHeight<=height,JSON.stringify(g));assert(g.boardClient>0,JSON.stringify(g)); // Variable-height cards may scroll after the explicit wrap request.
   assert(g.board.top>=0&&g.board.bottom<=height+1,JSON.stringify(g));assert.equal(g.shops.length,expectedShops);assert(g.shops.every((r,i)=>i===0||g.shops[i-1].top<r.top),JSON.stringify(g));
   assert(g.details.every(r=>r.scrollWidth<=r.clientWidth+1&&r.scrollHeight<=r.clientHeight+1&&r.left>=g.board.left&&r.right<=g.board.right+1),JSON.stringify(g));assert(g.targets.every(r=>r.width>0&&r.height>0&&r.scrollWidth<=r.clientWidth+1&&r.scrollHeight<=r.clientHeight+1),JSON.stringify(g));
   assert(g.stocks.every(x=>x.button.top>=x.shelf.top-1&&x.button.bottom<=x.shelf.bottom+1&&x.bottle.top>=x.shelf.top-1&&x.bottle.bottom<=x.shelf.bottom+1),JSON.stringify(g));
   if(g.selected&&g.boardTop===0)assert(g.selected.top>=g.board.top&&g.selected.bottom<=g.board.bottom+1,JSON.stringify(g));assert(g.footer.every(r=>r.bottom<=g.board.bottom+1),JSON.stringify(g));assert(g.board.bottom-g.shops.at(-1).bottom<6,JSON.stringify(g));g.targets.forEach((r,i)=>{assert(r.left>g.shops[i].left+g.shops[i].width/2,'placement at right');assert(Math.abs(r.bottom-g.shops[i].bottom)<8,'placement at bottom');});return g;
  }
  async function assertHit(page,selector){
   await page.locator(selector).scrollIntoViewIfNeeded();const hit=await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {visible:r.width>0&&r.height>0,hit:top===e||e.contains(top),rect:r.toJSON()};});assert(hit.visible&&hit.hit,selector+' '+JSON.stringify(hit));
  }
  async function dismissIntro(page){
   for(let i=0;i<8&&await page.locator('#action-dialog').evaluate(e=>e.open);i++){
    const more=page.locator('[data-action="map-continue"]');if(await more.isVisible())await more.click();else await page.locator('#close-dialog').click();
   }
   assert.equal(await page.locator('#action-dialog').evaluate(e=>e.open),false);
  }
  // Run native, lawful six-bottle fixture at both physical glyph scales.
  for(const dpr of [1,3]){
   browser=await launch();const context=await browser.newContext({viewport:{width:390,height:680},deviceScaleFactor:dpr,hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
   await page.goto(base+'/works/ambertime/?preview=1&market-fixture=established');await page.waitForFunction(()=>window.amberPlacement?.snapshot()?.storeMarket);await page.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');await dismissIntro(page);
   await page.locator('#room-nav [data-room="sales"]').click();await page.locator('.market-hand-list [data-market-release]').first().waitFor({state:'visible'});
   for(const [w,h] of viewports)await geometry(page,w,h);
   await geometry(page,375,620);assert.equal(await page.locator('[data-market-portion]').count(),3);
   const state=()=>page.evaluate(()=>window.amberPlacement.snapshot());let before=await state();const id=Number(await page.locator('.market-hand-list [data-market-release][aria-pressed="true"]').getAttribute('data-market-release')),originalStock=before.core.products.find(p=>p.id===id).stock;assert.equal(originalStock,6);assert.equal(await page.locator('#market-release-select, .market-special, .market-locked').count(),0);assert.doesNotMatch(await page.locator('#market-board').innerText(),/取扱前|デパート|#\d+|第\d+回/);assert.match(await page.locator('.market-hand-list').innerText(),/20\d{2}\/\d{1,2}/);
   await page.locator('[data-market-portion="5"]').click();await page.locator('[data-market-place="town-liquor"]').click();let s=await state();assert.equal(s.storeMarket.byShop['town-liquor'][id],5);assert.equal(s.core.cash,before.core.cash);assert.equal(s.shop.deliveries.length,before.shop.deliveries.length);assert.equal(s.core.products.find(p=>p.id===id).stock,6);
   if(process.env.AMBER_PLACEMENT_SCREENSHOT&&dpr===3)await page.screenshot({path:process.env.AMBER_PLACEMENT_SCREENSHOT});
   if(process.env.AMBER_HAND_SCREENSHOT&&dpr===3){await geometry(page,390,680);await page.waitForFunction(()=>window.amberPlacement.diagnostics().market.motions===0);await page.screenshot({path:process.env.AMBER_HAND_SCREENSHOT});}
   await page.locator('[data-market-portion="all"]').click();await page.locator('[data-market-place="town-liquor"]').click();s=await state();assert.equal(s.storeMarket.byShop['town-liquor'][id],6);await page.waitForFunction(()=>document.querySelector('#market-action-status').textContent==='町の酒店に1本置きました。');assert.equal(await page.locator('#automatic-news').isVisible(),false);assert.equal(await page.locator('.market-hand-list [data-market-release]').count(),0);assert.equal(await page.locator('.market-hand').innerText(),'手元');assert.doesNotMatch(await page.locator('#market-board').innerText(),/瓶詰めした一本が並びます/);await geometry(page,360,568);
   await assertHit(page,`[data-market-stock="town-liquor:${id}"]`);await page.locator(`[data-market-stock="town-liquor:${id}"]`).click();assert(await page.locator('.market-return').isVisible());await assertHit(page,'[data-market-confirm="return"]');await page.locator('[data-market-confirm="return"]').click();s=await state();assert.equal(s.storeMarket.byShop['town-liquor'][id]??0,0);assert.equal(s.core.cash,before.core.cash);assert.equal(await page.locator('.market-hand').innerText(),'手元');assert.match(await page.locator('.market-hand-list').innerText(),/6本/);assert.equal(await page.locator('.market-hand-list [data-market-release][aria-pressed="true"]').getAttribute('data-market-release'),String(id));await geometry(page,360,568);
   // Details and original Canvas controls stay reachable around the native board.
   await assertHit(page,'[data-market-details="retail"]');await page.locator('[data-market-details="retail"]').click();assert.equal(await page.locator('#action-dialog').evaluate(e=>e.open),true);assert.equal(await page.locator('#dialog-title').innerText(),'自家販売');assert.match(await page.locator('#dialog-body').innerText(),/売れ方：少しずつ直接販売/);assert.doesNotMatch(await page.locator('#dialog-body').innerText(),/NaN|undefined/);await page.locator('[data-action="market-retail-product"]').click();assert.equal(await page.locator('.price-options button').count(),3);await page.locator('#close-dialog').click();await page.locator('[data-market-details="town-liquor"]').click();assert.match(await page.locator('#dialog-body').innerText(),/好み：煙・厚み/);assert.match(await page.locator('#dialog-body').innerText(),/累計販売/);await page.locator('#close-dialog').click();
   await page.locator('#shop-offer').click();assert.equal(await page.locator('#action-dialog').evaluate(e=>e.open),true);const department=page.locator('[data-action="stockist-open"][data-id="department"]');if(await department.count()){await department.click();assert.match(await page.locator('#dialog-title').innerText(),/デパート/);}await page.locator('#close-dialog').click();
   for(const selector of ['#open-ledger','#shop-offer','#open-aux-menu','#room-nav [data-room="warehouse"]','#room-nav [data-room="sales"]'])await assertHit(page,selector);
   const oldHits=await page.evaluate(()=>JSON.parse(document.querySelector('#scene-root').dataset.hitRegions).filter(x=>/^(product-|shelf-)|room-feedback/.test(x.key)));assert.deepEqual(oldHits,[]);
   await page.locator('#open-ledger').click();assert.equal(await page.locator('#action-dialog').evaluate(e=>e.open),true);await page.locator('#close-dialog').click();
   await page.locator('#room-nav [data-room="warehouse"]').click();assert(await page.locator('#market-board').isHidden());await page.locator('#room-nav [data-room="sales"]').click();await geometry(page,390,680);
   await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-market-portion="1"]').click();await page.locator('[data-market-place="retail"]').click();assert.equal(await page.locator('.market-flight').count(),0);assert.equal(await page.locator('.market-delta').count(),2);assert.equal((await state()).core.cash,before.core.cash);
   let actualMonthlySale=null;
   if(dpr===3){
    // The one retail bottle plus the other five assigned to the real shop are
    // sold by the ordinary native clock, not by a UI-only fake receipt.
    await page.locator('[data-market-portion="all"]').click();await page.locator('[data-market-place="town-liquor"]').click();const reserved=await state();assert.equal(reserved.storeMarket.byShop['town-liquor'][id],5);assert.equal(reserved.core.cash,before.core.cash);
    const observed=[];let totalSold=0;
    for(let attempt=0;attempt<3&&totalSold===0;attempt++){
     const beforeTick=await state();await page.locator('#toggle-time').click();await page.waitForFunction(month=>window.amberPlacement.snapshot().core.month===month+1,beforeTick.core.month,{timeout:12000});await dismissIntro(page);await page.locator('#toggle-time').click();
     const soldState=await state(),expected=D.tickDistillery(beforeTick),sales=soldState.core.lastMonth.sales.filter(x=>x.id===id),shopSales=sales.filter(x=>x.channel==='stockist'&&x.shopId==='town-liquor');assert.deepEqual(sales,expected.core.lastMonth.sales.filter(x=>x.id===id));
     const shopSold=shopSales.reduce((n,x)=>n+x.sold,0),sold=sales.reduce((n,x)=>n+x.sold,0);totalSold+=sold;assert.equal((beforeTick.storeMarket.byShop['town-liquor'][id]??0)-(soldState.storeMarket.byShop['town-liquor'][id]??0),shopSold);assert.equal(beforeTick.core.products.find(p=>p.id===id).stock-soldState.core.products.find(p=>p.id===id).stock,sold);
     const net=soldState.core.totals.revenue-beforeTick.core.totals.revenue-(soldState.core.totals.costs-beforeTick.core.totals.costs)-(soldState.core.totals.upkeep-beforeTick.core.totals.upkeep);assert.equal(Math.round((soldState.core.cash-beforeTick.core.cash)*100),Math.round(net*100));assert.deepEqual(soldState.shop.deliveries,expected.shop.deliveries);await geometry(page,390,680);observed.push({month:soldState.core.month,shopSold,retailSold:sales.filter(x=>x.channel!=='stockist').reduce((n,x)=>n+x.sold,0)});
    }
    assert(totalSold>0,'native monthly clock must demonstrate an actual nonzero sale');actualMonthlySale={observed,totalSold};
   }
   checks.push({native:true,dpr,viewports,originalStock,assignment:5,returnCount:6,actualMonthlySale});
   if(process.env.AMBER_SCREENSHOT&&dpr===3)await page.screenshot({path:process.env.AMBER_SCREENSHOT});await browser.close();browser=null;
  }
  browser=await launch();{const freshContext=await browser.newContext({viewport:{width:360,height:568},deviceScaleFactor:3,hasTouch:true});const fresh=await freshContext.newPage();await fresh.goto(base+'/works/ambertime/?preview=1');await fresh.waitForFunction(()=>window.amberPlacement?.snapshot()?.marketRules);await dismissIntro(fresh);await fresh.locator('#room-nav [data-room="sales"]').click();assert.equal(await fresh.locator('.market-shop').count(),1);const freshGeometry=await fresh.locator('#market-board').evaluate(e=>({height:e.getBoundingClientRect().height,last:e.querySelector('.market-shop').getBoundingClientRect().bottom,bottom:e.getBoundingClientRect().bottom}));assert(freshGeometry.height<280);assert(freshGeometry.bottom-freshGeometry.last<6);await fresh.locator('[data-market-details="retail"]').click();assert.equal(await fresh.locator('#dialog-title').innerText(),'自家販売');assert.equal(await fresh.locator('[data-action="market-retail-product"]').count(),0);await fresh.locator('#close-dialog').click();assert.equal(await fresh.locator('[data-market-shop="town-liquor"],[data-market-shop="supermarket"]').count(),0);await fresh.close();}await browser.close();browser=null;
  expectedShops=3;
  // A display-only harness stresses all release choices, off-screen receipts and
  // swipe cancellation using the real controller, assets, CSS and native font metrics.
  browser=await launch();const context=await browser.newContext({viewport:{width:390,height:680},deviceScaleFactor:3,hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);await page.goto(base+'/__market_harness__/');await page.waitForFunction(()=>document.documentElement.dataset.harnessReady==='true');
  for(const contracts of [0,1,2]){await page.evaluate(n=>window.marketHarness.setContracts(n),contracts);expectedShops=contracts+1;for(const [w,h] of viewports)await geometry(page,w,h);}
  await page.evaluate(()=>window.marketHarness.setContracts(0));expectedShops=1;await page.locator('[data-market-place="retail"]').click();await page.locator('[data-market-stock="retail:1"]').click();await assertHit(page,'[data-market-confirm="return"]');await page.locator('[data-market-confirm="return"]').click();
  await page.evaluate(()=>window.marketHarness.ui.update({visible:true,notice:'資金を残して停止しています。'}));for(const [w,h] of viewports)await geometry(page,w,h);await page.evaluate(()=>window.marketHarness.setContracts(2));expectedShops=3;
  for(const [w,h] of viewports)await geometry(page,w,h);assert.equal(await page.locator('.market-hand-list [data-market-release]').count(),12);assert.equal(await page.locator('#market-shelf-town-liquor [data-market-stock]').count(),12);
  const shelf=page.locator('#market-shelf-town-liquor');await shelf.focus();await page.keyboard.press('End');assert.equal(await page.locator('[data-market-stock="town-liquor:12"]').evaluate(e=>document.activeElement===e),true);const last=await shelf.evaluate(e=>e.scrollLeft);assert.equal(last,0);await page.locator('[data-market-release="12"]').click();assert.equal(await shelf.evaluate(e=>e.scrollLeft),last);await page.locator('[data-market-portion="5"]').click();assert.equal(await shelf.evaluate(e=>e.scrollLeft),last);
  const sourceArt=await page.locator('[data-market-release="12"] .market-bottle').innerHTML();await page.locator('[data-market-portion="all"]').click();await page.locator('[data-market-place="town-liquor"]').click();assert.equal(await page.locator('[data-market-release="12"]').count(),0);assert.equal(await page.locator('[data-market-release][aria-pressed="true"]').getAttribute('data-market-release'),'1');assert.equal((await page.evaluate(()=>window.marketHarness.state())).assigned[12],20);await page.waitForFunction(()=>window.marketHarness.flights.length>0);assert.equal(await page.evaluate(()=>window.marketHarness.flights.at(-1)),sourceArt);await geometry(page,360,568);
  await page.locator('[data-market-stock="town-liquor:12"]').evaluate(e=>{e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,clientX:100,clientY:200,isPrimary:true}));e.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,clientX:60,clientY:200,isPrimary:true}));e.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,clientX:60,clientY:200,isPrimary:true}));e.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));});assert.equal(await page.locator('.market-return').count(),0);
  await page.locator('[data-market-stock="town-liquor:12"]').focus();await page.keyboard.press('Enter');assert(await page.locator('.market-return').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('.market-return').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>window.marketHarness.sale());await page.waitForFunction(()=>window.marketHarness.deltas.filter(x=>x.kind==='sale').length===2);assert(await page.locator('[data-market-stock="town-liquor:12"] .market-count').evaluate(el=>{const r=el.getBoundingClientRect(),s=el.closest('.market-stock-list').getBoundingClientRect();return r.left>=s.left&&r.right<=s.right;}));if(process.env.AMBER_DELTA_SCREENSHOT)await page.screenshot({path:process.env.AMBER_DELTA_SCREENSHOT});assert.equal(await page.locator('.market-sale-notice').count(),0);assert.deepEqual(await page.evaluate(()=>window.marketHarness.deltas.filter(x=>x.kind==='sale').map(x=>[x.text,x.shopId,x.productId])),[['−1','town-liquor','1'],['−1','town-liquor','12']]);
  assert(await page.locator('.market-stock .market-count').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect(),s=e.closest('.market-stock-list').getBoundingClientRect();return r.top>=s.top-1&&r.bottom<=s.bottom+1;})));
  await geometry(page,360,568);assert.equal(await page.locator('.market-flight').count(),0);assert.equal((await page.evaluate(()=>window.marketHarness.state())).core.cash,1024);
  checks.push({displayHarness:true,releaseCount:12,saleReceipts:2,reducedMotion:true});await browser.close();browser=null;assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks,physicalSafari:false}));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
