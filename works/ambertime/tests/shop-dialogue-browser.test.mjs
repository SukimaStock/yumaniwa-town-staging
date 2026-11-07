// Isolated native preview + explicitly synthetic memory presentation. No user save.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as D from '../partner-orders.mjs';
import {advance} from './brands-helpers.mjs';
import {shopDialogueHistory} from '../shop-dialogue.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const output=path.join(root,'works/ambertime/design/shop-dialogue-v02-20261107');
const sizes=[[360,568],[375,620],[390,680],[430,740]];
test('dialogue native clock/latest/reload and synthetic memory phone presentation',{skip:!process.env.AMBER_BROWSER_MODULE,timeout:120000},async()=>{
 await mkdir(path.join(output,'screenshots'),{recursive:true});
 const fixture=JSON.parse(await readFile(path.join(root,'works/ambertime/tests/fixtures/placement-established-six.json'),'utf8'));
 const baseState=D.restoreDistillery(fixture.raw),targetMonth=shopDialogueHistory(advance(baseState,120)).find(e=>e.month>baseState.core.month).month;
 const initial=advance(baseState,targetMonth-baseState.core.month-1);
 const server=createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+name);if(name.endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root))throw Error('path');res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]??'text/html');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],checks=[];
 try{
 const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:680},deviceScaleFactor:1,hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/tests/fixtures/placement-established-six.json',r=>r.fulfill({json:{...fixture,raw:D.serializeDistillery(initial)}}));
 const url=`http://127.0.0.1:${server.address().port}/works/ambertime/?preview=1&market-fixture=established`;
 async function load(){await page.goto(url);await page.waitForFunction(m=>window.amberPlacement?.snapshot()?.core?.month===m,targetMonth-1);await page.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');for(let i=0;i<8&&await page.locator('#action-dialog').evaluate(e=>e.open);i++){if(await page.locator('[data-action="map-continue"]').isVisible())await page.locator('[data-action="map-continue"]').click();else await page.locator('#close-dialog').click();}await page.locator('#room-nav [data-room="sales"]').click();}
 const shot=async name=>page.screenshot({path:path.join(output,'screenshots',name+'.png')});
 await load();assert(await page.locator('#shop-dialogue-notice').isHidden());await shot('native-baseline-390x680');
 await page.locator('#toggle-time').click();await page.waitForFunction(m=>window.amberPlacement.snapshot().core.month===m,targetMonth,{timeout:15000});await page.locator('#toggle-time').click();await page.locator('#shop-dialogue-notice').waitFor({state:'visible',timeout:15000});
 const nativeText=await page.locator('#shop-dialogue-notice p').innerText();assert.match(nativeText,/ハイボール/);assert.equal(await page.locator('#shop-dialogue-notice button').count(),0);await shot('native-daily-390x680');
 await page.locator('[data-market-details="town-liquor"]').click();assert(await page.locator('#shop-dialogue-notice').isHidden());assert.equal(await page.locator('#dialog-body .shop-dialogue-line p').innerText(),nativeText);await shot('native-latest-store-modal-390x680');await page.locator('#close-dialog').click();await page.locator('#shop-dialogue-notice').waitFor({state:'visible'});
 await page.waitForTimeout(3000);assert(await page.locator('#shop-dialogue-notice').isVisible());await page.waitForTimeout(3800);assert(await page.locator('#shop-dialogue-notice').isHidden());
 const after=await page.evaluate(()=>window.amberPlacement.snapshot());assert.equal(after.core.month,targetMonth);
 await page.route('**/tests/fixtures/placement-established-six.json',r=>r.fulfill({json:{...fixture,raw:D.serializeDistillery(after)}}));await page.reload();await page.waitForFunction(m=>window.amberPlacement?.snapshot()?.core?.month===m,targetMonth);await page.waitForTimeout(750);assert(await page.locator('#shop-dialogue-notice').isHidden());checks.push({native:true,monthlyTransition:`${targetMonth-1}→${targetMonth}`,modalLatest:true,modalDeferral:true,visibleAfter3000ms:true,hiddenAfter6800ms:true,noReplayOnReload:true});
 // Presentation only: no game mutation or claim of a naturally emitted memory.
 for(let i=0;i<8&&await page.locator('#action-dialog').evaluate(e=>e.open);i++)await page.locator('#close-dialog').click();await page.locator('#room-nav [data-room="sales"]').click();
 for(const kind of ['daily','memory'])for(const [width,height] of sizes){await page.setViewportSize({width,height});await page.evaluate(async kind=>{const {dialogueMarkup}=await import('./shop-dialogue-view.mjs?v=dialogue-v02-1');const s=window.amberPlacement.snapshot(),r=s.releases[0];const entry={id:'synthetic-visual-only',kind,releaseId:r.id,productId:r.productId,brandId:r.brandId,text:kind==='memory'?'何年か前のあれ、今でも好きだって人がいるんですよ。':'うちのお客さん、ハイボール好きが多いんですよ。'};const el=document.querySelector('#shop-dialogue-notice');el.innerHTML=dialogueMarkup(entry,s,{heading:true});el.hidden=false;},kind);await page.waitForTimeout(100);
 const g=await page.locator('#shop-dialogue-notice').evaluate(e=>({r:e.getBoundingClientRect().toJSON(),scroll:e.scrollWidth,client:e.clientWidth,buttons:e.querySelectorAll('button').length,pointer:getComputedStyle(e).pointerEvents,package:e.querySelectorAll('.release-package').length,pageWidth:document.documentElement.scrollWidth}));assert(g.r.left>=0&&g.r.right<=width&&g.r.top>=0&&g.r.bottom<=height);assert(g.scroll<=g.client);assert.equal(g.buttons,0);assert.equal(g.pointer,'none');assert.equal(g.package,kind==='memory'?1:0);assert(g.pageWidth<=width);await shot(`synthetic-${kind}-${width}x${height}`);checks.push({syntheticPresentation:true,kind,width,height,geometry:g});}
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#shop-dialogue-notice').evaluate(e=>getComputedStyle(e).animationName),'none');await shot('synthetic-memory-reduced-motion-430x740');assert.deepEqual(errors,[]);await writeFile(path.join(output,'browser-results.json'),JSON.stringify({passed:true,checks,reducedMotion:true,errors,physicalSafari:false,memoryOpportunity:'Synthetic presentation only; native historical memory trigger not claimed.'},null,2)+'\n');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
