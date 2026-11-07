import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as D from '../partner-orders.mjs';
import {fill} from './brands-helpers.mjs';
import {STAFF_ENCOUNTER_TEXT} from '../staff-encounter-text.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),output=path.join(root,'works/ambertime/design/hiring-stage2-20261107');
test('native hiring dialogs, fees, defer/reentry, keyboard and five viewports',{skip:!process.env.AMBER_BROWSER_MODULE,timeout:120000},async()=>{
 const server=createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+name);if(name.endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf'})[path.extname(file)]??'text/html');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,chromiumSandbox:true});
 await mkdir(output,{recursive:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const kind of ['distill','bottling']){
  let s=fill(D.newStaffProgressionDistillery(42),{progress:65});
  if(kind==='bottling'){s=D.noticeStaffOpportunity(s,'distill');s=D.bottleBranded(s,s.core.casks[0].id,{},1);}
  await page.route('**/tests/fixtures/placement-established-six.json',r=>r.fulfill({json:{raw:D.serializeDistillery(s)}}));
  await page.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/?preview=1&market-fixture=established`);
  const portrait=page.locator(`[data-staff-encounter="${kind}"]`);await portrait.waitFor({state:'visible'});await page.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');
  assert.equal(await portrait.locator('p').innerText(),STAFF_ENCOUNTER_TEXT[kind]);assert.equal(await page.locator('[data-action="staff-opportunity-hire"]').innerText(),'採用する');
  for(const [width,height] of [[360,568],[375,620],[390,680],[430,740],[1280,800]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);
   const g=await page.locator('#action-dialog').evaluate(e=>{const r=e.getBoundingClientRect(),body=document.querySelector('#dialog-body'),actions=document.querySelector('#dialog-actions').getBoundingClientRect(),art=e.querySelector('svg.staff-portrait').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,scroll:body.scrollWidth,client:body.clientWidth,actionBottom:actions.bottom,artWidth:art.width,artHeight:art.height};});
   assert(g.x>=0&&g.y>=0&&g.right<=width&&g.bottom<=height);assert(g.scroll<=g.client);assert(g.actionBottom<=height);assert.equal(g.artWidth,48);assert.equal(g.artHeight,72);
   await page.screenshot({path:path.join(output,`${kind}-${width}x${height}.png`)});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(6700);assert(await portrait.isVisible());
  const before=await page.evaluate(()=>window.amberPlacement.snapshot());await page.locator('[data-action="staff-opportunity-later"]').click();assert(await portrait.isHidden());
  for(let i=0;i<5&&await page.locator('#action-dialog').evaluate(e=>e.open);i++)await page.locator('#close-dialog').click();
  await page.locator(`#room-nav [data-room="${kind==='distill'?'distill':'warehouse'}"]`).click();await page.locator('#open-staff-panel').focus();await page.keyboard.press('Enter');await portrait.waitFor({state:'visible'});
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'staff-opportunity-hire');await page.keyboard.press('Enter');
  const after=await page.evaluate(()=>window.amberPlacement.snapshot()),cost=kind==='distill'?D.staffStatus(before).hireCost:D.bottlingStaffStatus(before).hireCost;assert.equal(after.core.cash,before.core.cash-cost);assert(kind==='distill'?D.staffStatus(after).hired:D.bottlingStaffStatus(after).hired);
  assert.equal(D.serializeDistillery(D.restoreDistillery(D.serializeDistillery(after))),D.serializeDistillery(after));await page.unroute('**/tests/fixtures/placement-established-six.json');
 }
 assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
