// Display and input regression. Actual sales/save/replay are covered by bar.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const enabled=!!process.env.AMBER_BROWSER_MODULE;
const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/works/ambertime/shop.css"><link rel="stylesheet" href="/works/ambertime/room-scene.css"><link rel="stylesheet" href="/works/ambertime/font-uniform.css"><link rel="stylesheet" href="/works/ambertime/market.css"><body data-room="sales"><div id="scene-root"></div><div id="market-board"></div><script type="module">
import {createMarketUI} from '/works/ambertime/market-ui.mjs';
import {computeViewport} from '/works/ambertime/canvas-layout.mjs';
import {installUniformTypography} from '/works/ambertime/font-uniform.mjs';
import {fontReady} from '/works/ambertime/font-loader.mjs';
import {bottleArt} from '/works/ambertime/room-object-art.mjs';
let state={alleyBar:{version:1},core:{month:4,cash:1000,products:[{id:1,stock:20,wood:.5,flavor:{primary:'smoke',label:'煙'}},{id:2,stock:20,wood:.3,flavor:{primary:'fruit',label:'果実'}}]},releases:[{id:1,productId:1,brandId:1,bottledMonth:1},{id:2,productId:2,brandId:1,bottledMonth:2}],brands:[{id:1,name:'テスト'}],productsById:{},shop:{relations:[{shopId:'town-liquor',brandId:1},{shopId:'supermarket',brandId:1}],offer:{shopId:'bar',brandId:1}},shelves:{retail:{1:2,2:2},'town-liquor':{1:2,2:2},supermarket:{1:2,2:2},bar:{}}};
const model={storeMarketInventory:(s,id)=>({hand:s.core.products.find(p=>p.id===id).stock-Object.values(s.shelves).reduce((n,shelf)=>n+(shelf[id]??0),0),retail:s.shelves.retail[id]??0,shops:Object.fromEntries(Object.entries(s.shelves).map(([key,shelf])=>[key,shelf[id]??0]))}),storeMarketRows:(s,shop)=>Object.entries(s.shelves[shop]).filter(([,count])=>count>0).map(([productId,count])=>({productId:Number(productId),count})),storeMarketQuote:()=>({ok:true}),assignStoreProduct:(s,{productId,shopId,count})=>({...s,shelves:{...s.shelves,[shopId]:{...s.shelves[shopId],[productId]:(s.shelves[shopId][productId]??0)+count}}}),returnStoreProduct:(s,{productId,shopId})=>({...s,shelves:{...s.shelves,[shopId]:{...s.shelves[shopId],[productId]:0}}}),setMarketRetail:(s,{productId,count})=>({...s,shelves:{...s.shelves,retail:{...s.shelves.retail,[productId]:count}}})};
const type=installUniformTypography('',document.documentElement);function resize(){const v=computeViewport({width:innerWidth,height:innerHeight,dpr:devicePixelRatio});type.resize(v);document.querySelector('#scene-root').dataset.viewport=JSON.stringify(v);}resize();
const opened=[];const ui=createMarketUI({document,model,state:()=>state,art:p=>bottleArt(p.wood),act:fn=>{state=fn(state);return true;},openStockist:id=>opened.push(id),openProduct(){}});ui.update({visible:true});window.addEventListener('resize',resize);
window.barHarness={ui,opened,state:()=>structuredClone(state),accept(){state.shop.relations.push({shopId:'bar',brandId:1});state.shop.offer=null;ui.update({visible:true});}};
await fontReady;document.documentElement.dataset.ready='true';</script></body></html>`;

test('bar shelf switch is operable at four phone sizes without adding vertical store rows',{skip:!enabled,timeout:90000},async()=>{
 const root=fileURLToPath(new URL('../../../',import.meta.url));
 const server=createServer(async(req,res)=>{try{
  const pathname=new URL(req.url,'http://local').pathname;if(pathname==='/__bar__'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');
  const data=await readFile(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.json':'application/json'})[path.extname(file)]??'application/octet-stream');res.end(data);
 }catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);
  browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer']});
  const page=await browser.newPage({viewport:{width:360,height:568},hasTouch:true});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/__bar__`);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  assert.equal(await page.locator('[data-market-shop="bar"]').count(),0);assert.equal(await page.locator('.market-switcher').count(),0);
  await page.evaluate(()=>window.barHarness.accept());await page.locator('[data-market-release="2"]').click();await page.locator('[data-market-portion="5"]').click();
  await page.locator('[data-market-switch="next"]').click();await page.locator('[data-market-switch="next"]').click();
  for(const [width,height] of [[360,568],[375,620],[390,680],[430,740]]){
   await page.setViewportSize({width,height});await page.waitForFunction(w=>JSON.parse(document.querySelector('#scene-root').dataset.viewport).width===w,width);
   const g=await page.locator('#market-board').evaluate(board=>{const r=board.getBoundingClientRect();return {scroll:board.scrollHeight,client:board.clientHeight,left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
   assert(g.scroll<=g.client+1,JSON.stringify({width,height,g}));assert(g.left>=0&&g.right<=width+1&&g.top>=0&&g.bottom<=height+1);
   assert.equal(await page.locator('[data-market-shop]').count(),2);assert.equal(await page.locator('[data-market-shop="retail"]').count(),1);assert.equal(await page.locator('[data-market-shop="bar"]').count(),1);
   for(const selector of ['[data-market-switch="previous"]','[data-market-details="bar"]','[data-market-portion="5"]'])assert(await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return hit===el||el.contains(hit);}));
  }
  const before=await page.evaluate(()=>window.barHarness.state());
  const target=page.locator('[data-market-place="bar"]');await target.click({position:{x:(await target.boundingBox()).width-8,y:20}});
  const after=await page.evaluate(()=>window.barHarness.state());assert.equal(after.shelves.bar[2],5);assert.equal(after.core.cash,before.core.cash);assert.deepEqual(after.core.products,before.core.products);
  await page.locator('[data-market-stock="bar:2"]').click();await page.locator('[data-market-confirm="return"]').click();assert.equal(await page.evaluate(()=>window.barHarness.state().shelves.bar[2]),0);
  await page.locator('[data-market-details="bar"]').click();assert.deepEqual(await page.evaluate(()=>window.barHarness.opened),['bar']);assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
