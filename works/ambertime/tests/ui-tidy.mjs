// Targeted display and cancel checks only; no automated game play or full screen sweep.
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(new URL('../../../',import.meta.url).pathname),out=path.join(root,'works/ambertime/design/ui-tidy'),KEY='sukimastock.ambertime.wholesale.v18';
await fs.mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.ttf':'font/ttf'})[path.extname(p)]??'application/octet-stream');res.end(await fs.readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']}),results=[];
try{
 for(const [width,height]of[[390,844],[1280,900]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/`);
  async function load(kind){await page.evaluate(async({KEY,kind})=>{const{roomFixture}=await import('./tests/room-fixtures.mjs');localStorage.setItem(KEY,await roomFixture(kind));},{KEY,kind});await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');}
  await load('ready');await page.locator('[data-room=distill]').click();
  const header=await page.locator('#scene-root').evaluate(n=>({header:JSON.parse(n.dataset.headerLayout),regions:JSON.parse(n.dataset.hitRegions),scroll:document.documentElement.scrollHeight-innerHeight}));
  assert.equal(header.header.cashY,30);assert(header.header.cashLeft>=header.header.generationRight+9);assert.equal(header.scroll,0);const time=header.regions.find(r=>r.key==='toggle-time');assert(time.y+time.h<108);assert(time.w>=44&&time.h>=44);
  assert.equal(await page.locator('#open-staff-panel').getAttribute('aria-label'),'担当者・製法');
  const before=await page.evaluate(KEY=>localStorage.getItem(KEY),KEY);
  await page.locator('#open-staff-panel').click();assert(!(await page.locator('#close-dialog').evaluate(n=>n.matches(':focus-visible'))));await page.locator('#dialog-title').click();assert(await page.locator('#action-dialog').evaluate(d=>d.open));
  await page.mouse.click(2,2);assert(!(await page.locator('#action-dialog').evaluate(d=>d.open)));
  await page.locator('#open-staff-panel').focus();await page.keyboard.press('Enter');await page.locator('#close-dialog').focus();assert(await page.locator('#close-dialog').evaluate(n=>n.matches(':focus-visible')));await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(KEY=>localStorage.getItem(KEY),KEY),before);
  await page.locator('button[data-room=warehouse]').click();await page.emulateMedia({reducedMotion:'reduce'});
  await page.screenshot({path:path.join(out,`${width}-room.png`),scale:'css'});
  await page.locator('[data-cask-id]').first().click();await page.locator('#taste-button').click();assert(await page.locator('#action-dialog').evaluate(d=>d.open));
  const tasting=await page.locator('#action-dialog').evaluate(d=>({overflow:d.scrollWidth-d.clientWidth,bodyOverflow:document.querySelector('#dialog-body').scrollWidth-document.querySelector('#dialog-body').clientWidth,focus:document.querySelector('#close-dialog').matches(':focus-visible')}));assert.equal(tasting.overflow,0);assert.equal(tasting.bodyOverflow,0);
  await page.screenshot({path:path.join(out,`${width}-tasting.png`),scale:'css'});await page.mouse.click(2,2);
  if(width===390){
   // Compare number prefixes with the actual loaded font, without touching the model.
   await page.evaluate(async()=>{const c=document.createElement('canvas');c.id='number-prefix-probe';c.width=300;c.height=80;Object.assign(c.style,{position:'fixed',top:'0',left:'0',zIndex:'99',background:'#2e3143'});document.body.append(c);const ctx=c.getContext('2d');ctx.font='24px AmberMisaki';ctx.fillStyle='#f0e6c8';ctx.fillText('#12',12,30);ctx.fillText('No.12',150,30);});await page.locator('#number-prefix-probe').screenshot({path:path.join(out,'number-prefix.png')});await page.locator('#number-prefix-probe').evaluate(n=>n.remove());
   // Display-only comment branch and staff icon; no saved data is fabricated.
   await page.locator('[data-room=distill]').click();await page.evaluate(async()=>{const{CanvasScene}=await import('./canvas-scene.mjs?v=0.25-ui-tidy-1');const update=CanvasScene.prototype.update;let scene;CanvasScene.prototype.update=function(v){scene=this;return update.call(this,v);};document.querySelector('button[data-room=warehouse]').click();document.querySelector('[data-room=distill]').click();CanvasScene.prototype.update=update;scene.update({...scene.view,notice:'次の1たるを依頼しました。'});});await page.screenshot({path:path.join(out,'390-comment.png'),scale:'css'});
   await load('fill');await page.locator('#open-fill').click();await page.locator('[data-action=fill]').first().click();assert.equal(await page.locator('#open-bottle').isVisible(),false);await page.locator('#watch-cask').click();assert(!(await page.locator('#action-dialog').evaluate(d=>d.open)));await page.locator('[data-cask-id]').first().click();assert(await page.locator('#open-bottle').isVisible());await page.mouse.click(2,2);
   await load('age-6');await page.locator('button[data-room=warehouse]').click();await page.locator('[data-cask-id]').first().click();await page.locator('#taste-button').click();assert(await page.locator('.flavor-previous').count()>0);const marker=await page.locator('.flavor-previous').first().evaluate(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,clip:getComputedStyle(n).clipPath}));assert(marker.width>2&&marker.clip.startsWith('polygon'));await page.mouse.click(2,2);
   await load('destination');await page.locator('[data-room=sales]').click();await page.locator('[data-product-id]').first().click();
   const prices=await page.locator('.price-options button').evaluateAll(ns=>ns.map(n=>({label:n.childNodes[0].textContent,x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,client:n.clientWidth,scroll:n.scrollWidth})));assert.equal(prices.length,3);assert.equal(new Set(prices.map(n=>n.y)).size,1);for(const n of prices)assert(n.scroll<=n.client,JSON.stringify(n));
   const opts=await page.locator('#sales-destination-choice option').evaluateAll(ns=>ns.map(n=>n.value));const dest=opts.find(x=>x!=='shelf');assert(dest);await page.locator('#sales-destination-choice').selectOption(dest);
   const deliveries=await page.locator('.delivery-options button').evaluateAll(ns=>ns.map(n=>({text:n.textContent,client:n.clientWidth,scroll:n.scrollWidth,y:n.getBoundingClientRect().y})));for(const n of deliveries)assert(n.scroll<=n.client,JSON.stringify(n));
   await page.locator('#dialog-title').click();await page.screenshot({path:path.join(out,'390-sales.png'),scale:'css'});
   results.push({width,height,header,tasting,prices,deliveries,errors});
  }else results.push({width,height,header,tasting,errors});
  assert.deepEqual(errors,[]);await page.close();
 }
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({passed:true,cases:results.length}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
