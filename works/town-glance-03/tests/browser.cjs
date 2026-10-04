// Development check: node works/town-glance-03/tests/browser.cjs (Playwright required).
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({headless:true});
 try {for(const viewport of [{width:390,height:844},{width:375,height:667},{width:320,height:568},{width:390,height:600},{width:844,height:390},{width:1280,height:900}]){
  const page=await browser.newPage({viewport,isMobile:viewport.width<900,hasTouch:true});const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.goto(url);
  const screenshot=async suffix=>{if(process.env.TOWN03_SCREENSHOTS){await page.waitForTimeout(300);await page.screenshot({path:path.join(process.env.TOWN03_SCREENSHOTS,`${viewport.width}-${viewport.height}-${suffix}.png`)});}};
  const phase=async()=>page.locator('body').getAttribute('data-phase');
  const origin=async()=>page.locator('#you').evaluate(el=>{const p=document.querySelector('svg').createSVGPoint();p.x=180;p.y=280;const s=p.matrixTransform(el.ownerSVGElement.getScreenCTM());return{x:s.x,y:s.y};});
  const touchSession=await page.context().newCDPSession(page);
  const tap=async locator=>{await locator.scrollIntoViewIfNeeded();const r=await locator.boundingBox();const x=r.x+r.width/2,y=r.y+r.height/2;await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);};
  const drag=async(dx,dy)=>{const c=await origin();await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:c.x,y:c.y}]});await page.waitForTimeout(50);for(let step=1;step<=5;step++){await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:c.x+dx*step/5,y:c.y+dy*step/5}]});await page.waitForTimeout(30);}await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);};
  const mapBounds=await page.locator('#map').evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};});
  const geometry=await page.locator('#map').evaluate(s=>[...s.querySelectorAll('path:not(#guess-path),rect')].map(e=>e.outerHTML));
  assert.equal(await phase(),'ready');assert.equal(await page.locator('.pin').count(),0);await screenshot('initial');
  await tap(page.locator('#action'));assert.equal(await phase(),'predict');assert.equal(await page.locator('.pin').count(),0);await screenshot('predict');
  const c=await origin();await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:c.x,y:c.y}]});await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await phase(),'predict','tap is not a prediction');
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:10,y:100}]});await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await phase(),'predict','unrelated map tap does not guess');
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:c.x,y:c.y}]});await page.waitForTimeout(50);await touchSession.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(100);assert.equal(await phase(),'predict','cancel does not reveal');
  if(viewport.height<440)await page.locator('.map').scrollIntoViewIfNeeded();
  await drag(50,-40);assert.equal(await phase(),'confirmed');assert.equal(await page.locator('.pin').count(),1);assert.ok(await page.locator('#guess-line').isHidden());await screenshot('confirm');
  assert.deepEqual(await page.locator('#map').evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};}),mapBounds,'map viewport stays fixed');
  assert.deepEqual(await page.locator('#map').evaluate(s=>[...s.querySelectorAll('path:not(#guess-path),rect')].map(e=>e.outerHTML)),geometry,'street geometry never rotates or changes');
  await tap(page.locator('#action'));assert.equal(await phase(),'predict');assert.equal(await page.locator('.pin').count(),1,'second answer not in map yet');assert.equal(await page.locator('.previous').count(),1);assert.equal(await page.locator('#name').innerText(),'こもれび書店');
  await tap(page.locator('#skip'));assert.equal(await phase(),'done');assert.equal(await page.locator('.pin').count(),2);assert.equal(await page.locator('button:visible').count(),0,'only two rounds');await screenshot('done');
  assert.deepEqual(await page.locator('#map').evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};}),mapBounds,'map viewport stays fixed');
  assert.deepEqual(await page.locator('#map').evaluate(s=>[...s.querySelectorAll('path:not(#guess-path),rect')].map(e=>e.outerHTML)),geometry);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  if(viewport.height>=568)assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'portrait fits one screen');
  const body=await page.locator('body').innerText();for(const word of ['PROTOTYPE','A/B/C','正解','不正解','XP','誤差','トレーニング','真上から','YOU ↻'])assert.ok(!body.includes(word));
  assert.ok(requests.every(r=>r.startsWith(url)),'no external requests');assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);assert.equal(errors.length,0,errors.join('\n'));
  await page.reload();assert.equal(await phase(),'ready');assert.equal(await page.locator('.pin').count(),0);
  await page.locator('#action').focus();await page.keyboard.press('Enter');assert.equal(await phase(),'predict');await page.keyboard.press('Enter');assert.equal(await phase(),'confirmed','keyboard skip available');
  await page.locator('#action').click();await drag(-45,35);assert.equal(await phase(),'done','second place also supports prediction');
  await page.reload();await page.locator('#action').click();
  for(const id of ['skip']){const b=page.locator('#'+id);const r=await b.boundingBox();assert.ok(r.width>=44&&r.height>=44);await b.scrollIntoViewIfNeeded();assert.ok(await b.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===el;}));}
  // Real two-finger touch cancellation, not synthetic pointer capture.
  if(viewport.height>=568){const center=await origin(), session=touchSession;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:center.x,y:center.y}]});await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:center.x,y:center.y},{id:2,x:center.x+20,y:center.y+20}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:center.x+70,y:center.y},{id:2,x:center.x+50,y:center.y+20}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);assert.equal(await phase(),'predict','two fingers do not submit');}
  await tap(page.locator('#skip'));assert.equal(await phase(),'confirmed');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(`${viewport.width}x${viewport.height}: initial, touch slide, skip, two rounds, keyboard, reload, fixed map, layout and isolation PASS`);await page.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
