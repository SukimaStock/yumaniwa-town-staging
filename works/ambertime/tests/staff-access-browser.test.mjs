import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as D from '../partner-orders.mjs';
import {fill} from './brands-helpers.mjs';
import {STAFF_ENCOUNTER_TEXT} from '../staff-encounter-text.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),output=path.join(root,'works/ambertime/design/staff-access-stage3-20261107');
test('direct room access, sales absence, active work preservation and five viewports',{skip:!process.env.AMBER_BROWSER_MODULE,timeout:120000},async()=>{
 const server=createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+name);if(name.endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf'})[path.extname(file)]??'text/html');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,chromiumSandbox:true});
 await mkdir(output,{recursive:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let state=fill(D.newStaffProgressionDistillery(42),{progress:65});state=D.bottleBranded(state,state.core.casks[0].id,{},1);state=D.hireBottlingStaff(D.hireStaff(state));
 state=D.reserveBottling(state,state.core.casks[0].id,{mode:'age',age:6,count:2});state=D.beginUsual(D.reserveStaff(state,state.core.casks[0].id));for(let i=0;i<10;i++)state=D.distillStep(state);
 await page.route('**/tests/fixtures/placement-established-six.json',r=>r.fulfill({json:{raw:D.serializeDistillery(state)}}));
 await page.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/?preview=1&market-fixture=established`);await page.waitForFunction(()=>!!window.amberPlacement?.snapshot());await page.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');
 for(let i=0;i<5&&await page.locator('#action-dialog').evaluate(e=>e.open);i++)await page.locator('#close-dialog').click();
 const before=await page.evaluate(()=>window.amberPlacement.snapshot());
 for(const [width,height] of [[360,568],[375,620],[390,680],[430,740],[1280,800]]){
  await page.setViewportSize({width,height});
  for(const room of ['distill','warehouse','sales']){
   await page.locator(`#room-nav [data-room="${room}"]`).click();const icon=page.locator('#open-staff-panel');
   if(room==='sales'){assert(await icon.isHidden());continue;}
   await icon.waitFor({state:'visible'});const label=await icon.getAttribute('aria-label');assert(label.includes(room==='distill'?'蒸留担当者':'ビン詰め担当者'));if(room==='warehouse')assert(!label.includes('仕込み'));
   await icon.click();assert.equal(await page.locator('#action-dialog').getAttribute('data-kind'),room==='distill'?'staff-panel':'bottler-panel');
   const g=await page.locator('#action-dialog').evaluate(e=>e.getBoundingClientRect().toJSON());assert(g.x>=0&&g.y>=0&&g.right<=width&&g.bottom<=height);
   assert.equal(await page.locator('[data-action="staff-manage-back"]').count(),0);await page.screenshot({path:path.join(output,`${room}-${width}x${height}.png`)});
   await page.locator('#dialog-actions [data-action="cancel"]').click();assert(!(await page.locator('#action-dialog').evaluate(e=>e.open)));
  }
 }
 const after=await page.evaluate(()=>window.amberPlacement.snapshot());assert.equal(D.serializeDistillery(after),D.serializeDistillery(before));assert(before.usual.reservation);assert(before.automation.reservations.length);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#room-nav [data-room="distill"]').click();await page.locator('#open-staff-panel').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#action-dialog').getAttribute('data-kind'),'staff-panel');await page.keyboard.press('Escape');assert(!(await page.locator('#action-dialog').evaluate(e=>e.open)));
 assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
