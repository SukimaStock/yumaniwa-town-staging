// Development-only browser check; requires Playwright. Run from repository root.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({headless:true});
 try{for(const viewport of [{width:390,height:844},{width:375,height:667},{width:320,height:568},{width:390,height:600},{width:844,height:390},{width:1280,height:900}]){
  const page=await browser.newPage({viewport,isMobile:viewport.width<900,hasTouch:true});const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.goto(url);
  await page.locator('.city img').evaluate(image=>image.decode());
  assert.equal(await page.locator('[aria-pressed=true]').count(),0);
  assert.equal(await page.locator('button').count(),3);
  const imageBefore=await page.locator('.city img').evaluate(i=>({src:i.getAttribute('src'),bounds:JSON.stringify(i.getBoundingClientRect().toJSON())}));
  const geometry=await page.locator('#shops').evaluate(s=>[...s.querySelectorAll('path')].map(p=>p.getAttribute('d')));
  for(const id of ['cafe','bread','books','cafe']){
   const button=page.locator(`[data-place=${id}]`);await button.tap();assert.equal(await page.locator('[aria-pressed=true]').count(),1);assert.equal(await page.locator('#shops .selected').getAttribute('data-shop'),id);
   assert.deepEqual(await page.locator('#shops').evaluate(s=>[...s.querySelectorAll('path')].map(p=>p.getAttribute('d'))),geometry,'all shop coordinates stay fixed');
   assert.deepEqual(await page.locator('.city img').evaluate(i=>({src:i.getAttribute('src'),bounds:JSON.stringify(i.getBoundingClientRect().toJSON())})),imageBefore,'city and camera stay fixed');
   const b=await button.boundingBox();assert.ok(b.width>=44&&b.height>=44);assert.ok(b.y>=0&&b.y+b.height<=viewport.height,'choice visible without scrolling');
   const hit=await button.evaluate(b=>{const r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b;});assert.ok(hit,'no overlay steals tap');
   await button.tap();assert.equal(await page.locator('#shops .selected').count(),1,'repeated tap is stable');
  }
  await page.locator('[data-place=books]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#shops .selected').getAttribute('data-shop'),'books');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'one screen at target sizes');
  const body=await page.locator('body').innerText();for(const forbidden of ['PROTOTYPE','A/B/C','YOU ↻','真上から','街全体','場所を見る','トレーニング','XP'])assert.ok(!body.includes(forbidden));assert.equal(await page.locator('select').count(),0);
  assert.ok(requests.every(r=>r.startsWith(url)),'no external request');assert.equal(errors.length,0,errors.join('\n'));assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  if(process.env.TOWN_GLANCE_SCREENSHOT_DIR){await page.waitForTimeout(550);await page.locator('body').click({position:{x:5,y:5}});await page.screenshot({path:path.join(process.env.TOWN_GLANCE_SCREENSHOT_DIR,`town02-${viewport.width}-${viewport.height}.png`)});}
  if(viewport.width===390&&viewport.height===844&&process.env.TOWN_GLANCE_SCREENSHOT_DIR){for(const id of ['cafe','bread']){await page.locator(`[data-place=${id}]`).tap();await page.waitForTimeout(550);await page.screenshot({path:path.join(process.env.TOWN_GLANCE_SCREENSHOT_DIR,`town02-${id}.png`)});}}
  await page.reload();assert.equal(await page.locator('#shops .selected').count(),0);assert.equal(await page.locator('[aria-pressed=true]').count(),0);
  if(viewport.width===390&&viewport.height===844){await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-place=bread]').tap();assert.equal(await page.locator('.selected .building').evaluate(b=>getComputedStyle(b).animationName),'none');}
  console.log(`${viewport.width}x${viewport.height}: initial, taps, fixed scene, repeated selection, keyboard, reload, layout, isolation PASS`);await page.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
