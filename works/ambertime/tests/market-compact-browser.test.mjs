// Optional actual Chromium regression. No browser dependency is shipped with the game.
// AMBER_BROWSER_MODULE=/absolute/path/playwright-core/index.mjs
// AMBER_BROWSER_EXECUTABLE=/absolute/path/chromium node --test <this file>
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const enabled=!!process.env.AMBER_BROWSER_MODULE;
const viewports=[[360,568],[375,620],[390,680],[430,740]];
const harnessHTML=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/works/ambertime/shop.css"><link rel="stylesheet" href="/works/ambertime/room-scene.css"><link rel="stylesheet" href="/works/ambertime/font-uniform.css"><link rel="stylesheet" href="/works/ambertime/market.css"></head><body data-room="sales"><div id="scene-root"></div><div id="market-board"></div><script type="module">
import {createMarketUI} from '/works/ambertime/market-ui.mjs';
import {computeViewport} from '/works/ambertime/canvas-layout.mjs';
import {installUniformTypography} from '/works/ambertime/font-uniform.mjs';
import {fontReady} from '/works/ambertime/font-loader.mjs';
import {bottleArt} from '/works/ambertime/room-object-art.mjs';
const names=['fruit','smoke','wood'],labels=['果実香が強い','煙の香り','樽香が豊か'];
let s={core:{month:4,cash:1000,products:Array.from({length:12},(_,i)=>({id:i+1,bottledMonth:i,stock:20,sold:0,wood:(i%6)/6,flavor:{primary:names[i%3],label:labels[i%3]}}))},releases:Array.from({length:12},(_,i)=>({id:i+1,productId:i+1,bottledMonth:i,brandId:1})),brands:[{id:1,name:'表示検証'}],productsById:{},shop:{relations:[{shopId:'town-liquor',brandId:1},{shopId:'supermarket',brandId:1}]},retail:{},assigned:Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,2]))};
const model={storeMarketInventory:(g,id)=>({stock:g.core.products.find(p=>p.id===id).stock,hand:g.core.products.find(p=>p.id===id).stock-(g.retail[id]??0)-(g.assigned[id]??0),retail:g.retail[id]??0,shops:{'town-liquor':g.assigned[id]??0,supermarket:0}}),storeMarketRows:(g,shop)=>shop==='town-liquor'?Object.entries(g.assigned).filter(([,count])=>count>0).map(([id,count])=>({productId:Number(id),count})):[],storeMarketQuote:()=>({ok:true}),assignStoreProduct:(g,{productId,count})=>({...g,assigned:{...g.assigned,[productId]:(g.assigned[productId]??0)+count}}),returnStoreProduct:(g,{productId})=>({...g,assigned:{...g.assigned,[productId]:0}}),setMarketRetail:(g,{productId,count})=>({...g,retail:{...g.retail,[productId]:count}})};
const typography=installUniformTypography('',document.documentElement);
function resize(){const v=computeViewport({width:innerWidth,height:innerHeight,dpr:devicePixelRatio});typography.resize(v);document.querySelector('#scene-root').dataset.viewport=JSON.stringify(v);}
resize();
const ui=createMarketUI({document,model,state:()=>s,art:p=>bottleArt(p.wood),icon:'',act:fn=>{s=fn(s);ui.update({visible:true,notice:''});return true;},openProduct(){},openStockist(){},setEditing(){}});
window.addEventListener('resize',resize);ui.update({visible:true,notice:''});
const flights=[];new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.classList?.contains('market-flight'))flights.push(node.innerHTML);}).observe(document.querySelector('#market-board'),{childList:true,subtree:true});
window.marketHarness={flights,state:()=>structuredClone(s),ui,async sale(){const before=structuredClone(s);s.core.month++;s.core.cash+=24;s.core.lastMonth={month:s.core.month,sales:[{id:1,sold:1,revenue:12,channel:'stockist',shopId:'town-liquor'},{id:12,sold:1,revenue:12,channel:'stockist',shopId:'town-liquor'}]};for(const id of [1,12]){s.assigned[id]--;s.core.products[id-1].stock--;s.core.products[id-1].sold++;}ui.consume(before,s);ui.update({visible:true,notice:''});}};
await fontReady;document.documentElement.dataset.harnessReady='true';
</script></body></html>`;

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
 const errors=[],checks=[];
 try{
  const launch=()=>chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer']});
  const base=`http://127.0.0.1:${server.address().port}`;
  async function geometry(page,width,height){
   await page.setViewportSize({width,height});await page.waitForFunction(()=>{
    const b=document.querySelector('#market-board'),v=JSON.parse(document.querySelector('#scene-root').dataset.viewport||'null');return b&&!b.hidden&&v&&Math.abs(v.width-innerWidth)<1&&Math.abs(v.height-innerHeight)<1&&Math.abs(b.getBoundingClientRect().width-336*v.scale)<1;
   });
   const g=await page.evaluate(()=>{
    const board=document.querySelector('#market-board'),rect=e=>e?e.getBoundingClientRect().toJSON():null;return {width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,board:rect(board),boardClient:board.clientHeight,boardScroll:board.scrollHeight,shops:[...document.querySelectorAll('.market-shop')].map(rect),targets:[...document.querySelectorAll('[data-market-place]')].map(rect),selected:rect(document.querySelector('.market-selected-bottle')),footer:[...document.querySelectorAll('.market-special button')].map(rect),stocks:[...document.querySelectorAll('.market-stock')].map(e=>({bottle:rect(e.querySelector('.market-bottle')),button:rect(e),shelf:rect(e.closest('.market-stock-list'))}))};
   });
   assert(g.pageWidth<=width,JSON.stringify(g));assert(g.pageHeight<=height,JSON.stringify(g));assert(g.boardScroll<=g.boardClient+1,JSON.stringify(g));
   assert(g.board.top>=0&&g.board.bottom<=height+1,JSON.stringify(g));assert.equal(g.shops.length,3);assert(g.shops[0].top<g.shops[1].top&&g.shops[1].top<g.shops[2].top,JSON.stringify(g));
   assert(g.targets.every(r=>r.width>0&&r.height>0&&r.top>=g.board.top&&r.bottom<=g.board.bottom+1),JSON.stringify(g));
   assert(g.stocks.every(x=>x.button.top>=x.shelf.top-1&&x.button.bottom<=x.shelf.bottom+1&&x.bottle.top>=x.shelf.top-1&&x.bottle.bottom<=x.shelf.bottom+1),JSON.stringify(g));
   if(g.selected)assert(g.selected.top>=g.board.top&&g.selected.bottom<=g.board.bottom+1,JSON.stringify(g));assert(g.footer.every(r=>r.bottom<=g.board.bottom+1),JSON.stringify(g));return g;
  }
  async function assertHit(page,selector){
   const hit=await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {visible:r.width>0&&r.height>0,hit:top===e||e.contains(top),rect:r.toJSON()};});assert(hit.visible&&hit.hit,selector+' '+JSON.stringify(hit));
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
   if(process.env.AMBER_HAND_SCREENSHOT&&dpr===3){await geometry(page,390,680);await page.waitForFunction(()=>window.amberPlacement.diagnostics().market.motions===0);await page.screenshot({path:process.env.AMBER_HAND_SCREENSHOT});}
   await page.locator('[data-market-portion="all"]').click();await page.locator('[data-market-place="town-liquor"]').click();s=await state();assert.equal(s.storeMarket.byShop['town-liquor'][id],6);assert.equal(await page.locator('.market-hand-list [data-market-release]').count(),0);assert.match(await page.locator('.market-hand').innerText(),/0本/);assert.doesNotMatch(await page.locator('#market-board').innerText(),/瓶詰めした一本が並びます/);await geometry(page,360,568);
   await assertHit(page,`[data-market-stock="town-liquor:${id}"]`);await page.locator(`[data-market-stock="town-liquor:${id}"]`).click();assert(await page.locator('.market-return').isVisible());await assertHit(page,'[data-market-confirm="return"]');await page.locator('[data-market-confirm="return"]').click();s=await state();assert.equal(s.storeMarket.byShop['town-liquor'][id]??0,0);assert.equal(s.core.cash,before.core.cash);assert.match(await page.locator('.market-hand').innerText(),/6本/);assert.equal(await page.locator('.market-hand-list [data-market-release][aria-pressed="true"]').getAttribute('data-market-release'),String(id));await geometry(page,360,568);
   // Details and original Canvas controls stay reachable around the native board.
   await assertHit(page,'[data-market-details="retail"]');await page.locator('[data-market-details="retail"]').click();assert.equal(await page.locator('#action-dialog').evaluate(e=>e.open),true);await page.locator('#close-dialog').click();
   await page.locator('#shop-offer').click();assert.equal(await page.locator('#action-dialog').evaluate(e=>e.open),true);const department=page.locator('[data-action="stockist-open"][data-id="department"]');if(await department.count()){await department.click();assert.match(await page.locator('#dialog-title').innerText(),/デパート/);}await page.locator('#close-dialog').click();
   for(const selector of ['#open-ledger','#shop-offer','#open-aux-menu','#room-nav [data-room="warehouse"]','#room-nav [data-room="sales"]'])await assertHit(page,selector);
   const oldHits=await page.evaluate(()=>JSON.parse(document.querySelector('#scene-root').dataset.hitRegions).filter(x=>/^(product-|shelf-)|room-feedback/.test(x.key)));assert.deepEqual(oldHits,[]);
   await page.locator('#open-ledger').click();assert.equal(await page.locator('#action-dialog').evaluate(e=>e.open),true);await page.locator('#close-dialog').click();
   await page.locator('#room-nav [data-room="warehouse"]').click();assert(await page.locator('#market-board').isHidden());await page.locator('#room-nav [data-room="sales"]').click();await geometry(page,390,680);
   await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-market-portion="1"]').click();await page.locator('[data-market-place="retail"]').click();assert.equal(await page.locator('.market-flight,.market-delta').count(),0);assert.equal((await state()).core.cash,before.core.cash);
   let actualMonthlySale=null;
   if(dpr===3){
    // The one retail bottle plus the other five assigned to the real shop are
    // sold by the ordinary native clock, not by a UI-only fake receipt.
    await page.locator('[data-market-portion="all"]').click();await page.locator('[data-market-place="town-liquor"]').click();const reserved=await state();assert.equal(reserved.storeMarket.byShop['town-liquor'][id],5);assert.equal(reserved.core.cash,before.core.cash);
    await page.locator('#toggle-time').click();await page.waitForFunction(month=>window.amberPlacement.snapshot().core.month===month+1,reserved.core.month,{timeout:12000});await dismissIntro(page);await page.locator('#toggle-time').click();
    const soldState=await state(),sales=soldState.core.lastMonth.sales.filter(x=>x.id===id),shopSales=sales.filter(x=>x.channel==='stockist'&&x.shopId==='town-liquor');assert(shopSales.some(x=>x.sold>0));
    const shopSold=shopSales.reduce((n,x)=>n+x.sold,0);assert.equal(reserved.storeMarket.byShop['town-liquor'][id]-(soldState.storeMarket.byShop['town-liquor'][id]??0),shopSold);assert.equal(reserved.core.products.find(p=>p.id===id).stock-soldState.core.products.find(p=>p.id===id).stock,sales.reduce((n,x)=>n+x.sold,0));
    const net=soldState.core.totals.revenue-reserved.core.totals.revenue-(soldState.core.totals.costs-reserved.core.totals.costs)-(soldState.core.totals.upkeep-reserved.core.totals.upkeep);assert.equal(Math.round((soldState.core.cash-reserved.core.cash)*100),Math.round(net*100));assert(soldState.shop.deliveries.length>reserved.shop.deliveries.length);await geometry(page,390,680);actualMonthlySale={month:soldState.core.month,shopSold,retailSold:sales.filter(x=>x.channel!=='stockist').reduce((n,x)=>n+x.sold,0)};
   }
   checks.push({native:true,dpr,viewports,originalStock,assignment:5,returnCount:6,actualMonthlySale});
   if(process.env.AMBER_SCREENSHOT&&dpr===3)await page.screenshot({path:process.env.AMBER_SCREENSHOT});await browser.close();browser=null;
  }
  // A display-only harness stresses all release choices, off-screen receipts and
  // swipe cancellation using the real controller, assets, CSS and native font metrics.
  browser=await launch();const context=await browser.newContext({viewport:{width:390,height:680},deviceScaleFactor:3,hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);await page.goto(base+'/__market_harness__/');await page.waitForFunction(()=>document.documentElement.dataset.harnessReady==='true');
  for(const [w,h] of viewports)await geometry(page,w,h);assert.equal(await page.locator('.market-hand-list [data-market-release]').count(),12);assert.equal(await page.locator('#market-shelf-town-liquor [data-market-stock]').count(),12);
  const shelf=page.locator('#market-shelf-town-liquor');await shelf.focus();await page.keyboard.press('End');const last=await shelf.evaluate(e=>e.scrollLeft);assert(last>0);await page.locator('[data-market-release="12"]').click();assert.equal(await shelf.evaluate(e=>e.scrollLeft),last);await page.locator('[data-market-portion="5"]').click();assert.equal(await shelf.evaluate(e=>e.scrollLeft),last);
  const sourceArt=await page.locator('[data-market-release="12"] .market-bottle').innerHTML();await page.locator('[data-market-portion="all"]').click();await page.locator('[data-market-place="town-liquor"]').click();assert.equal(await page.locator('[data-market-release="12"]').count(),0);assert.equal(await page.locator('[data-market-release][aria-pressed="true"]').getAttribute('data-market-release'),'1');assert.equal((await page.evaluate(()=>window.marketHarness.state())).assigned[12],20);await page.waitForFunction(()=>window.marketHarness.flights.length>0);assert.equal(await page.evaluate(()=>window.marketHarness.flights.at(-1)),sourceArt);await geometry(page,360,568);
  await page.locator('[data-market-stock="town-liquor:12"]').evaluate(e=>{e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,clientX:100,clientY:200,isPrimary:true}));e.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,clientX:60,clientY:200,isPrimary:true}));e.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,clientX:60,clientY:200,isPrimary:true}));e.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));});assert.equal(await page.locator('.market-return').count(),0);
  await page.locator('[data-market-stock="town-liquor:12"]').focus();await page.keyboard.press('Enter');assert(await page.locator('.market-return').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('.market-return').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.marketHarness.sale());await page.waitForFunction(()=>document.querySelectorAll('.market-sold').length===2);
  assert(await page.locator('.market-sold').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect(),s=e.closest('.market-stock-list').getBoundingClientRect();return r.top>=s.top-1&&r.bottom<=s.bottom+1;})));
  await geometry(page,360,568);assert.equal(await page.locator('.market-flight').count(),0);assert.equal((await page.evaluate(()=>window.marketHarness.state())).core.cash,1024);
  checks.push({displayHarness:true,releaseCount:12,saleReceipts:2,reducedMotion:true});await browser.close();browser=null;assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks,physicalSafari:false}));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
