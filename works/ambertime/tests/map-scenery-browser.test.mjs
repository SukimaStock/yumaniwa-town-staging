// Optional real Chromium component checks. Natural seed3/6 inputs are replayable
// native careers; this harness does not establish iPhone or screen-reader QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import * as D from '../partner-orders.mjs';
import {naturalDeliveryFixture} from './regional-delivery-helpers.mjs';
const enabled=!!process.env.AMBER_BROWSER_MODULE;
const sizes=[[360,568],[375,620],[390,680],[430,740]];
function delivered(seed){
 let s=naturalDeliveryFixture(seed);const partnerId='trial-region-desk',productId=s.result.productId;
 let q=D.regionalDeliveryQuote(s,productId,partnerId);s=D.assignRegionalProduct(s,{partnerId,productId,count:5,contractId:q.contractId,allocationId:q.nextAllocationId});
 q=D.regionalDeliveryQuote(s,productId,partnerId);return D.deliverRegionalProduct(s,{partnerId,productId,contractId:q.contractId,allocationIds:q.allocationIds,deliveryId:q.nextDeliveryId});
}
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/works/ambertime/shop.css"><link rel="stylesheet" href="/works/ambertime/room-scene.css"><link rel="stylesheet" href="/works/ambertime/font-uniform.css"><link rel="stylesheet" href="/works/ambertime/market.css"><link rel="stylesheet" href="/works/ambertime/m0-observation.css"></head><body data-room="sales"><div id="scene-root"></div><div id="market-board"></div><button id="open-world-map">地図</button><script type="module">
import * as D from '/works/ambertime/partner-orders.mjs';
import {createMarketUI,availableMarketShops} from '/works/ambertime/market-ui.mjs';
import {createM0Observation} from '/works/ambertime/m0-observation.mjs';
import {marketPartnersForMap} from '/works/ambertime/map-partners.mjs';
import {mapSceneryProjection} from '/works/ambertime/map-scenery.mjs';
import {dailyMapProjection} from '/works/ambertime/map-daily-view.mjs';
import {computeViewport} from '/works/ambertime/canvas-layout.mjs';
import {installUniformTypography} from '/works/ambertime/font-uniform.mjs';
let s=await (await fetch('/__fixture__?seed='+new URL(location.href).searchParams.get('seed'))).json(),view={stage:4,selectedShop:null},m0;
const typography=installUniformTypography('',document.documentElement);
function resize(){const v=computeViewport({width:innerWidth,height:innerHeight,dpr:devicePixelRatio});typography.resize(v);document.querySelector('#scene-root').dataset.viewport=JSON.stringify(v);}
resize();const ui=createMarketUI({document,model:D,state:()=>s,art:()=>'<svg></svg>',act:()=>false,openProduct(){},openStockist(){},shopsForState:g=>marketPartnersForMap(g,view,availableMarketShops(g))});
function render(){ui.update({visible:true});m0?.update();}
m0=createM0Observation({document,state:()=>s,room:()=> 'sales',modal:()=>null,view:()=>view,onViewChange:next=>{view=next;render();}});
const canvas=document.querySelector('#m0-observation canvas'),ctx=canvas.getContext('2d'),fill=ctx.fillRect.bind(ctx);let draws=0;ctx.fillRect=(...a)=>{draws++;return fill(...a);};
window.addEventListener('resize',()=>{resize();render();});render();m0.open();
window.sceneryHarness={snapshot:()=>structuredClone(s),view:()=>structuredClone(view),scenery:()=>mapSceneryProjection(s,view.stage),daily:()=>dailyMapProjection(s,view.stage).scenery,m0,render,draws:()=>draws};document.documentElement.dataset.harnessReady='true';
</script></body></html>`;

test('actual map scenery: four phones, unchanged geography/selection, cached paint and paused motion',{skip:!enabled,timeout:180000},async()=>{
 const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url))),fixtures=new Map([3,6].map(seed=>[seed,delivered(seed)]));
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/__scenery_harness__'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  if(url.pathname==='/__fixture__'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixtures.get(Number(url.searchParams.get('seed')))));return;}
  const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!filename.startsWith(root+path.sep))throw Error('path');
  res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'})[path.extname(filename)]??'application/octet-stream');res.end(await readFile(filename));
 }catch{res.writeHead(404);res.end();}});
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);
  browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu']});
  for(const seed of [3,6]){
   const context=await browser.newContext({viewport:{width:390,height:680},hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/__scenery_harness__?seed='+seed);await page.waitForFunction(()=>document.documentElement.dataset.harnessReady==='true');
   const initial=await page.evaluate(()=>window.sceneryHarness.snapshot());
   for(const [width,height] of sizes){
    await page.setViewportSize({width,height});
    for(let stage=1;stage<=6;stage++){
     await page.locator('.m0-stage').selectOption(String(stage));
     const g=await page.locator('#m0-observation').evaluate(e=>{const r=e.getBoundingClientRect(),map=e.querySelector('.m0-map-window').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,mapWidth:map.width,mapHeight:map.height,pins:[...e.querySelectorAll('.m0-pin')].map(b=>b.dataset.m0Shop)};});
     assert(g.left>=0&&g.right<=width+1&&g.top>=0&&g.bottom<=height+1,JSON.stringify(g));assert(g.mapWidth>0&&g.mapHeight>0);
     const pair=await page.evaluate(()=>({m0:window.sceneryHarness.scenery(),daily:window.sceneryHarness.daily()}));assert.deepEqual(pair.m0,pair.daily);
     if(stage>=5){assert.deepEqual(g.pins,[]);assert.deepEqual(pair.m0.partners,[]);}
    }
   }
   assert.deepEqual(await page.evaluate(()=>window.sceneryHarness.snapshot()),initial,'viewing scenery never mutates formal facts');
   await page.locator('.m0-stage').selectOption('4');const a=await page.evaluate(()=>window.sceneryHarness.scenery().partners.find(p=>p.id==='trial-region-desk'));
   assert.equal(a.box,true);assert.equal(a.flowerStage,0);assert.equal(a.butterfly,true);assert.equal(a.activity.customerSales,null);
   const before=await page.evaluate(()=>window.sceneryHarness.draws());await page.evaluate(()=>{window.sceneryHarness.render();window.sceneryHarness.render();});assert.equal(await page.evaluate(()=>window.sceneryHarness.draws()),before);
   const butterfly=page.locator('.map-scenery-butterfly[data-scenery-partner="trial-region-desk"]');assert.equal(await butterfly.count(),1);assert.equal(await butterfly.evaluate(e=>getComputedStyle(e.parentElement).pointerEvents),'none');
   await page.locator('.m0-pin[data-m0-shop="trial-region-desk"]').click();assert.equal(await page.evaluate(()=>window.sceneryHarness.draws()),before,'selection does not repaint scenery');
   const anchor=await butterfly.evaluate(e=>[e.style.left,e.style.top]);await page.locator('[data-m0="advance"]').click();await page.locator('[data-m0="zoom-in"]').click();await page.locator('.m0-map-window').focus();await page.keyboard.press('ArrowLeft');assert.deepEqual(await butterfly.evaluate(e=>[e.style.left,e.style.top]),anchor);
   await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await butterfly.locator('.map-scenery-wings').evaluate(e=>getComputedStyle(e).animationName),'none');
   await page.locator('[data-m0="close"]').click();assert.equal(await page.locator('.map-scenery-butterflies').getAttribute('data-active'),'false');await page.evaluate(()=>window.sceneryHarness.m0.open());assert.equal(await page.locator('.m0-stage').inputValue(),'4');assert.equal((await page.evaluate(()=>window.sceneryHarness.view())).selectedShop,'trial-region-desk');
   assert.deepEqual(await page.evaluate(()=>window.sceneryHarness.snapshot()),initial);assert.deepEqual(errors,[]);await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
