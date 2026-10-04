// Development-only smoke test: node works/town-glance/tests/browser.cjs (Playwright required).
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let file=path.join(root,req.url==='/'?'index.html':req.url);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const data=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({headless:true});
 try{
 for(const viewport of [{width:390,height:844},{width:375,height:667},{width:844,height:390},{width:1280,height:900}]){
  const page=await browser.newPage({viewport,isMobile:viewport.width<900,hasTouch:true});const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.goto(url);
  for(const destination of ['cafe','bread','books']){
   await page.selectOption('#destination',destination);
   for(const mode of ['A','B','C']){
    await page.locator(`[data-mode=${mode}]`).click();assert.equal(await page.inputValue('#destination'),destination);
    assert.equal(await page.locator('[data-mode][aria-pressed=true]').count(),1);
    const target=page.locator(`[data-place=${destination}] rect`);
    await target.tap();assert.notEqual(await page.textContent('#place-detail'),'店をタップして、この辺を眺める。');
    await page.locator('#confirm').click();
    const before=await page.locator('#scene').innerHTML();const camera=await page.locator('#camera').getAttribute('transform');
    await page.locator('#turn').click();const after=await page.locator('#scene').innerHTML();
    const normalize=s=>s.replace(/id="you-heading" transform="rotate\(\d+\)"/,'id="you-heading"');
    assert.equal(normalize(before),normalize(after),'turn must change only YOU');assert.equal(await page.locator('#camera').getAttribute('transform'),camera);
   }
  }
  await page.locator('#overhead').click();assert.equal(await page.locator('#overhead').getAttribute('aria-pressed'),'true');
  for(let i=0;i<12;i++)await page.locator('#zoom-in').click();assert.match(await page.locator('#camera').getAttribute('transform'),/scale\(2.4\)/);
  await page.locator('#reset').click();assert.match(await page.locator('#camera').getAttribute('transform'),/scale\(1\)/);
  await page.locator('#map').scrollIntoViewIfNeeded();const box=await page.locator('#map').boundingBox();const dragX=box.x+box.width/2,dragY=(Math.max(0,box.y)+Math.min(viewport.height,box.y+box.height))/2;await page.mouse.move(dragX,dragY);await page.mouse.down();await page.mouse.move(dragX+35,dragY+30,{steps:5});await page.mouse.up();assert.notEqual(await page.locator('#camera').getAttribute('transform'),'translate(300 280) scale(1) translate(-300 -280)');
  await page.locator('#reset').click();
  await page.locator('[data-place=books]').focus();await page.keyboard.press('Enter');assert.match(await page.textContent('#place-detail'),/駅の裏手/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');
  assert.equal(await page.evaluate(()=>localStorage.length),0);assert.equal(await page.evaluate(()=>sessionStorage.length),0);
  assert.equal(errors.length,0,errors.join('\n'));assert.ok(requests.every(r=>r.startsWith(url)),'no external requests');
  if(viewport.width===390){
   await page.locator('#reset').click();await page.selectOption('#destination','cafe');
   for(const mode of ['A','B','C']){await page.locator(`[data-mode=${mode}]`).click();if(mode==='C')await page.locator('#overhead').click();if(process.env.TOWN_GLANCE_SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.TOWN_GLANCE_SCREENSHOT_DIR,`final-${mode}.png`),fullPage:true});}
   const client=await page.context().newCDPSession(page);const b=await page.locator('#map').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
   const touch=(type,d)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:x-d,y,id:0},{x:x+d,y,id:1}]});
   await touch('touchStart',25);await touch('touchMove',55);await touch('touchEnd',0);assert.ok(Math.abs(Number((await page.locator('#camera').getAttribute('transform')).match(/scale\(([^)]+)/)[1])-2.2)<1e-9);
   await page.locator('#reset').click();await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.locator('#zoom-in').click();assert.match(await page.locator('#camera').getAttribute('transform'),/scale\(1.2\)/);
  }
  console.log(`${viewport.width}x${viewport.height}: destinations, views, taps, heading isolation, zoom/pan/reset, keyboard, network PASS`);await page.close();
 }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
