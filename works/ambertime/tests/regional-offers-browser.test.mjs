// Actual app + native organically generated inquiries. No inquiry/event injection.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as native from '../partner-orders.mjs';
import {createObservedModel} from '../recall/operations.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {initializeRecall,advanceRecall} from '../recall/collector.mjs';
import {initializeCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger} from '../recent-ledger.mjs';
import {serializeSession,FORMAL_SAVE_KEY as key} from '../development-save.mjs';
function organicSession(){
 let history,recall;
 const D=createObservedModel(native,({before,after})=>{history=advanceHistoryRecord(before,after,history);recall=advanceRecall(before,after,recall);});
 let s=D.newShopDialogueDistillery(3);history=initializeHistoryRecord(s);recall=initializeRecall(s);s=D.enableRegionalPartners(s);
 const resolve=()=>{let guard=0;while(s.decisions.length){if(++guard>20)throw Error('decision loop');const d=s.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');s=D.chooseDistillery(s,d.caskId,o.id);}if(s.trade.offer)s=D.declineOffer(s);while(s.shop.offer){const o=s.shop.offer;s=(o.shopId==='department'?D.declineShop:D.acceptShop)(s,o.shopId,o.id);}};
 const month=()=>{resolve();const before=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,before+1);};
 for(let n=0;n<4;n++){
  resolve();s=D.selectFlavorCards(s,{malt:'plain',ferment:'short'});s=D.startDistillation(s);while(s.still.distillation.progress<45)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<65)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'refill');
  const cid=s.core.casks.at(-1).id;for(let i=0;i<12;i++)month();s=D.bottleBranded(s,cid,{});const id=s.result.productId,count=s.core.products.find(p=>p.id===id).stock;s=n===3?D.assignStoreProduct(s,{productId:id,shopId:'supermarket',count}):D.setMarketRetail(s,{productId:id,count});for(let i=0;i<16;i++)month();
 }
 while(!D.regionalOffers(s).length&&s.core.month<180)month();
 assert.equal(s.core.month,126);const offer=D.regionalOffers(s)[0];assert.equal(offer.eventId,'e331');assert(s.labConnection.town.events.some(e=>e.id===offer.eventId&&e.type==='inquiry'&&e.to==='near-wide'));
 const text=serializeSession(s,{userPaused:true,elapsed:0,caskSlots:initializeCaskSlots(s),recentLedger:migrateRecentLedger(s,{replay:observer=>D.replayDistilleryOperations(s,observer)}),historyRecord:history,recallRecord:recall},{enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:6000,stepMs:100});
 return {text,game:s};
}
const enabled=!!process.env.AMBER_BROWSER_MODULE;
test('organic regional offer: same phone dialog, defer, local access, accept/reload, decline and failed save',{skip:!enabled,timeout:180000},async()=>{
 const fixture=organicSession(),root=fileURLToPath(new URL('../../../',import.meta.url));
 const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;let f=path.resolve(root,'.'+pathname);if(pathname.endsWith('/'))f=path.join(f,'index.html');if(!f.startsWith(root))throw Error('path');const b=await readFile(f);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf'})[path.extname(f)]??'text/html');res.end(b);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer','--no-process-singleton']});
  const context=await browser.newContext({viewport:{width:390,height:680},hasTouch:true}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);
  const base='http://127.0.0.1:'+server.address().port;
  await context.addInitScript(({key,text})=>{if(!localStorage.getItem(key))localStorage.setItem(key,text);},{key,text:fixture.text});
  const snapshot=()=>p.evaluate(()=>window.amberPlacement.snapshot());
  async function boot(){await p.goto(base+'/works/ambertime/?debug=1');await p.waitForFunction(()=>window.amberPlacement?.snapshot()?.regionalPartners);}
  async function regionalOffer(){
   for(let i=0;i<20;i++){
    if(await p.locator('[data-action="regional-accept"]').isVisible())return;
    if(await p.locator('#action-dialog').evaluate(d=>d.open)){
     const next=p.locator('[data-action="map-continue"]');if(await next.isVisible())await next.click();else await p.locator('#close-dialog').click();
    }else{await p.locator('#room-nav [data-room="sales"]').click();await p.locator('#shop-offer').click();await p.locator('[data-action="regional-open"]').click();}
   }
   assert.fail('regional offer not reachable');
  }
  await boot();await regionalOffer();
  assert.match(await p.locator('#dialog-title').textContent(),/地域の仕入れ窓口/);assert.match(await p.locator('#dialog-body').textContent(),/麦・穏やかな樽香/);
  assert.deepEqual(await p.locator('#dialog-actions button').allTextContents(),['受ける','あとで','断る']);
  for(const [width,height] of [[360,568],[375,620],[390,680],[430,740]]){
   await p.setViewportSize({width,height});const r=await p.locator('#action-dialog').evaluate(d=>{const r=d.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight};});assert(r.left>=0&&r.right<=r.width+1&&r.top>=0&&r.bottom<=r.height+1,JSON.stringify(r));
  }
  const before=await snapshot();await p.locator('[data-action="regional-later"]').click();const deferred=await snapshot();assert.equal(deferred.regionalPartners.offers[0].deferred,true);assert.equal(deferred.regionalPartners.contracts.length,0);
  // Existing shop information remains accessible while the regional offer waits.
  if(await p.locator('#action-dialog').evaluate(d=>d.open))await p.locator('#close-dialog').click();await p.locator('#room-nav [data-room="sales"]').click();await p.locator('#shop-offer').click();await p.locator('[data-action="stockist-open"][data-id="town-liquor"]').click();assert.match(await p.locator('#dialog-title').textContent(),/酒店/);await p.locator('#close-dialog').click();
  await regionalOffer();const acceptBefore=await snapshot();await p.locator('[data-action="regional-accept"]').click();const accepted=await snapshot();assert.equal(accepted.regionalPartners.contracts.length,1);
  for(const k of ['core','shop','labConnection','releases','storeMarket'])assert.deepEqual(accepted[k],acceptBefore[k]);
  assert.equal(await p.locator('[data-market-shop="trial-region-desk"]').count(),0);
  await p.reload();await p.waitForFunction(()=>window.amberPlacement?.snapshot()?.regionalPartners?.contracts.length===1);assert.deepEqual((await snapshot()).regionalPartners,accepted.regionalPartners);
  // Separate clean branch of the same saved, real inquiry for declining/failure.
  await p.evaluate(({key,text})=>localStorage.setItem(key,text),{key,text:fixture.text});await p.reload();await regionalOffer();await p.locator('[data-action="regional-decline"]').click();assert.equal((await snapshot()).regionalPartners.offers[0].status,'declined');assert.equal((await snapshot()).regionalPartners.contracts.length,0);
  await p.evaluate(({key,text})=>localStorage.setItem(key,text),{key,text:fixture.text});await p.reload();await regionalOffer();const raw=await p.evaluate(key=>localStorage.getItem(key),key),failedBefore=await snapshot();
  await p.evaluate(key=>{window.regionalOriginalWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('test quota','QuotaExceededError');return window.regionalOriginalWrite.call(this,k,v);};},key);
  await p.locator('[data-action="regional-accept"]').click();assert.deepEqual((await snapshot()).regionalPartners,failedBefore.regionalPartners);assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),raw);assert.equal((await snapshot()).regionalPartners.contracts.length,0);
  await p.evaluate(()=>{Storage.prototype.setItem=window.regionalOriginalWrite;});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({seed:3,inquiryMonth:before.core.month,eventId:before.regionalPartners.offers[0].eventId,checks:['four phone sizes','later retains offer','existing shop accessible','accept changes only contract facts','no shelf','reload exact','decline','failed formal write keeps live contract unaccepted'],physicalSafari:false}));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
