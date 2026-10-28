// Optional actual-browser checks. No browser dependency is added to the game.
// AMBER_BROWSER_MODULE=/absolute/path/to/playwright-core/index.mjs
// AMBER_BROWSER_EXECUTABLE=/absolute/path/to/chromium node --test <this file>
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const enabled=!!process.env.AMBER_BROWSER_MODULE;
test('compact Lab actual browser: one screen, many releases, transfers, returns, sales and swipe safety',{skip:!enabled},async()=>{
 const root=fileURLToPath(new URL('../../../../../../',import.meta.url));
 const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+name);if(!file.startsWith(root))throw Error('path');if(name.endsWith('/'))file=path.join(file,'index.html');const data=await readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(data);}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer']});
  const page=await browser.newPage({viewport:{width:390,height:680},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${server.address().port}/works/ambertime/experiments/taste-market/v03/`;
  await page.goto(url);await page.evaluate(()=>document.fonts.ready);
  const state=()=>page.evaluate(()=>window.tasteMarketLab.snapshot());
  const geometry=async(w,h)=>{await page.setViewportSize({width:w,height:h});const g=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,bottom:document.querySelector('#new-brew').getBoundingClientRect().bottom,shops:[...document.querySelectorAll('.shop')].map(e=>e.getBoundingClientRect().toJSON())}));assert.ok(g.scrollWidth<=w,JSON.stringify(g));assert.ok(g.scrollHeight<=h,JSON.stringify(g));assert.ok(g.bottom<=h,JSON.stringify(g));assert.equal(g.shops.length,3);assert.ok(g.shops.every(s=>s.height>=60));return g;};
  for(const [w,h] of [[360,540],[360,568],[375,620],[390,680],[430,740],[1363,936]])await geometry(w,h);
  await page.setViewportSize({width:390,height:680});assert.equal(await page.locator('[data-portion]').count(),3);
  await page.locator('[data-portion="5"]').click();await page.locator('[data-place="liquor"]').click();let s=await state();assert.equal(s.releases[0].hand,13);assert.equal(s.releases[0].assigned.liquor,5);assert.equal(s.cash,0);
  await page.locator('[data-stock="liquor:1"]').click();assert.equal(await page.locator('#detail').evaluate(e=>e.open),true);await page.locator('#take-back').click();s=await state();assert.equal(s.releases[0].hand,18);assert.equal(s.releases[0].assigned.liquor,0);
  for(const id of ['1','2','3']){await page.selectOption('#releases',id);await page.locator('[data-place="liquor"]').click();}
  assert.equal(await page.locator('#shelf-liquor [data-stock]').count(),3);
  // New releases never make the document or shop taller.
  for(let i=0;i<9;i++){await page.locator('#new-brew').click();await page.locator('[data-brew="fruit"]').click();await page.locator('[data-place="liquor"]').click();}
  await geometry(360,568);assert.equal(await page.locator('#releases option').count(),12);
  const shelf=page.locator('#shelf-liquor');await shelf.focus();await page.keyboard.press('Home');assert.equal(await shelf.evaluate(e=>e.scrollLeft),0);await page.keyboard.press('End');const offset=await shelf.evaluate(e=>e.scrollLeft);assert.ok(offset>0);await page.locator('[data-portion="1"]').click();assert.equal(await shelf.evaluate(e=>e.scrollLeft),offset);
  // A drag must not open the return dialog through a synthesized click.
  await page.locator('[data-stock="liquor:12"]').evaluate(e=>{e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:100,clientY:200}));e.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:125,clientY:200}));e.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));});assert.equal(await page.locator('#detail').evaluate(e=>e.open),false);
  await page.locator('[data-stock="liquor:12"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#detail').evaluate(e=>e.open),true);await page.keyboard.press('Escape');
 const before=await state();await page.locator('#month').click();await page.waitForFunction(()=>!document.querySelector('#month').disabled);s=await state();const sold=s.history.filter(e=>e.month===s.month);assert.ok(sold.length>0);assert.equal(s.cash-before.cash,sold.reduce((n,e)=>n+e.revenue,0));for(const e of sold){assert.equal(await page.locator(`#stock-${e.shopId}-${e.releaseId} .sale-result`).textContent(),`−${e.count}本`);}assert.ok(await page.locator('.shop-income').count());
  assert.equal(await page.locator('.flight').count(),0);await geometry(360,540);assert.ok(await page.locator('.sale-result').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect(),s=e.closest('.stock-list').getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom;})));await geometry(390,680);
  if(process.env.AMBER_SCREENSHOT)await page.screenshot({path:process.env.AMBER_SCREENSHOT});
  // Repeat under reduced motion and retain precise recorded conservation.
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#month').click();await page.waitForFunction(()=>!document.querySelector('#month').disabled);s=await state();for(const r of s.releases)assert.equal(r.hand+r.sold+Object.values(r.assigned).reduce((a,b)=>a+b,0),r.total);assert.equal(await page.locator('.flight').count(),0);
  await page.locator('#options').click();assert.equal(await page.locator('#records').evaluate(e=>e.open),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#records').evaluate(e=>e.open),false);assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
