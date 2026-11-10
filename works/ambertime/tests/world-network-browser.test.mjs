// Real-browser attempt; genuine saved careers, no injected inquiry/contract/stock.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import * as D from '../partner-orders.mjs';
import {naturalWorldCraftFixture,WORLD_IDS} from './world-network-helpers.mjs';
const enabled=!!process.env.AMBER_BROWSER_MODULE;
const sizes=[[360,568],[375,620],[390,680],[430,740]];
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/works/ambertime/shop.css"><link rel="stylesheet" href="/works/ambertime/room-scene.css"><link rel="stylesheet" href="/works/ambertime/font-uniform.css"><link rel="stylesheet" href="/works/ambertime/market.css"><link rel="stylesheet" href="/works/ambertime/m0-observation.css"></head><body data-room="sales"><div id="scene-root"></div><div id="market-board"></div><button id="open-world-map">地図</button><script type="module">
import * as D from '/works/ambertime/partner-orders.mjs?world=world-network-v01';
import {createMarketUI,availableMarketShops} from '/works/ambertime/market-ui.mjs?world=world-network-v01';
import {createM0Observation} from '/works/ambertime/m0-observation.mjs?world=world-network-v01';
import {marketPartnersForMap} from '/works/ambertime/map-partners.mjs?v=map-partners-v01&world=world-network-v01';
import {computeViewport} from '/works/ambertime/canvas-layout.mjs';
import {installUniformTypography} from '/works/ambertime/font-uniform.mjs';
import {bottleArt} from '/works/ambertime/room-object-art.mjs';
let s=await(await fetch('/__fixture__?seed='+new URL(location.href).searchParams.get('seed'))).json(),view={stage:6,selectedShop:'overseas-import-desk'},failSave=false,m0;
const typography=installUniformTypography('',document.documentElement);
function resize(){const v=computeViewport({width:innerWidth,height:innerHeight,dpr:devicePixelRatio});typography.resize(v);document.querySelector('#scene-root').dataset.viewport=JSON.stringify(v);}
resize();
const ui=createMarketUI({document,model:D,state:()=>s,art:p=>bottleArt(p.wood),act:fn=>{try{const next=fn(s);if(failSave)throw Error('試験用保存失敗');s=D.restoreDistillery(D.serializeDistillery(next));render();return true;}catch{return false;}},openProduct(){},openStockist(){},shopsForState:g=>marketPartnersForMap(g,view,availableMarketShops(g))});
function render(){ui.update({visible:true,notice:''});m0?.update();}
m0=createM0Observation({document,state:()=>s,room:()=> 'sales',modal:()=>null,view:()=>view,onViewChange:next=>{view=next;render();},onTrade:()=>render()});
window.addEventListener('resize',()=>{resize();render();});render();m0.open();
window.worldHarness={snapshot:()=>structuredClone(s),view:()=>structuredClone(view),failSave:value=>failSave=value,open:()=>m0.open()};document.documentElement.dataset.harnessReady='true';
</script></body></html>`;

test('actual overseas map selection, familiar quantities, cancellation and delivery across four phones',{skip:!enabled,timeout:180000},async()=>{
 const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url))),fixtures=new Map();
 for(const seed of [27,39]){let s=naturalWorldCraftFixture(seed),o=D.regionalOffers(s).find(o=>o.partnerId===WORLD_IDS.overseas);s=D.acceptRegionalOffer(s,o.partnerId,o.id);fixtures.set(seed,s);}
 const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/__world__'){res.setHeader('Content-Type','text/html');res.end(html);return;}if(url.pathname==='/__fixture__'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixtures.get(Number(url.searchParams.get('seed')))));return;}const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!filename.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'})[path.extname(filename)]??'application/octet-stream');res.end(await readFile(filename));}catch{res.writeHead(404);res.end();}});
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu']});
  for(const seed of [27,39]){const context=await browser.newContext({viewport:{width:390,height:680},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/__world__?seed='+seed);await page.waitForFunction(()=>document.documentElement.dataset.harnessReady==='true');
   const initial=await page.evaluate(()=>window.worldHarness.snapshot());
   for(const [width,height]of sizes){await page.setViewportSize({width,height});for(let stage=1;stage<=6;stage++){await page.locator('.m0-stage').selectOption(String(stage));const r=await page.locator('#m0-observation').evaluate(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});assert(r.left>=0&&r.right<=width+1&&r.top>=0&&r.bottom<=height+1);assert.equal(await page.locator('.m0-rows button').count(),0);}}
   assert.deepEqual(await page.evaluate(()=>window.worldHarness.snapshot()),initial);await page.locator('.m0-stage').selectOption('6');await page.locator('.m0-pin[data-m0-shop="overseas-import-desk"]').click();assert.match(await page.locator('.m0-report').innerText(),/海外の輸入窓口/);await page.locator('[data-m0="trade"]').click();
   const id=initial.result.productId;await page.locator('[data-market-release="'+id+'"]').click();for(const choice of ['1','5','all']){await page.locator('[data-market-portion="'+choice+'"]').click();await page.locator('[data-market-place="overseas-import-desk"]').click();await page.locator('[data-market-stock="overseas-import-desk:'+id+'"]').click();await page.locator('[data-market-confirm="return"]').click();}
   await page.locator('[data-market-portion="5"]').click();await page.locator('[data-market-place="overseas-import-desk"]').click();await page.locator('[data-market-stock="overseas-import-desk:'+id+'"]').click();const reserved=await page.evaluate(()=>window.worldHarness.snapshot());await page.evaluate(()=>window.worldHarness.failSave(true));await page.locator('[data-market-confirm="deliver"]').click();assert.deepEqual(await page.evaluate(()=>window.worldHarness.snapshot()),reserved);await page.evaluate(()=>window.worldHarness.failSave(false));await page.locator('[data-market-confirm="deliver"]').click();const paid=await page.evaluate(()=>window.worldHarness.snapshot()),receipt=paid.regionalDeliveries.recentReceipts.at(-1);assert.equal(receipt.count,5);assert.equal(receipt.customerSales,null);assert(paid.labConnection.town.shipments.some(r=>r.id===receipt.id));
   await page.evaluate(()=>window.worldHarness.open());assert.equal(await page.locator('.m0-stage').inputValue(),'6');assert.equal(await page.locator('.map-scenery-butterfly').count(),1);assert.equal(await page.locator('.map-scenery-drift').evaluate(el=>getComputedStyle(el).animationName),'none');assert.deepEqual(errors,[]);await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
