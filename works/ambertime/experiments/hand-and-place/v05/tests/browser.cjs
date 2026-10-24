const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const dir=process.env.EVIDENCE_DIR??path.join(__dirname,'browser');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),...(process.env.BROWSER_PROXY?{proxy:{server:process.env.BROWSER_PROXY}}:{}),args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,ignoreHTTPSErrors:!!process.env.BROWSER_PROXY}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});page.on('dialog',d=>d.accept());
 const url=process.env.LAB_URL??'http://127.0.0.1:8765/works/ambertime/experiments/hand-and-place/v05/';
 const snap=()=>page.evaluate(()=>window.handLab.snapshot()),diag=()=>page.evaluate(()=>window.handLab.diagnostics());
 async function reset(scenario='standard'){await page.goto(url);await page.waitForSelector('[data-order="1"]');await page.evaluate(()=>document.fonts.ready);if(scenario!=='standard'){await page.locator('#records').evaluate(e=>e.open=true);await page.selectOption('#scenario',scenario);await page.locator('#records').evaluate(e=>e.open=false);await page.evaluate(()=>scrollTo(0,0));}}
 async function mode(m){await page.locator(`button[data-view="${m}"]`).click();}
 async function send(o,l){await page.locator(`[data-order="${o}"]`).click();await page.locator(`[data-card="${l}"]`).click();await page.locator('#deliver').click();}
 async function shot(n){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(dir,n+'.png')});}
 let baseline;const comparisons=[];
 for(const m of ['A','B','C']){
  await reset();await mode(m);for(const width of [360,375,390]){await page.setViewportSize({width,height:844});assert.ok(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Overflow '+width);assert.ok(await page.locator('#hand').evaluate(e=>e.getBoundingClientRect().bottom<innerHeight),'hand overview '+width);assert.ok(await page.locator('#main-step').evaluate(e=>e.getBoundingClientRect().bottom<innerHeight),'clock overview '+width);}
  await shot(m+'-initial');
  await page.locator('[data-order="1"]').focus();await page.keyboard.press('Enter');assert.ok(await page.locator('[data-order="1"]').evaluate(e=>e===document.activeElement));
  await page.locator('[data-card="1"]').focus();await page.keyboard.press('Enter');assert.ok(await page.locator('[data-card="1"]').evaluate(e=>e===document.activeElement));
  const selected=await snap();await mode(m==='A'?'B':'A');await mode(m);assert.deepEqual(await snap(),selected,'view changed state');
  const metricStart=await diag();await page.locator('#deliver').click();let s=await snap();assert.equal(s.lots[0].stock,4);assert.equal(s.shops.restaurant.stock,2);assert.equal(s.month,0);assert.equal(s.deliveries.length,1);
  assert.ok((await page.locator('#result').innerText()).includes('6→4本'));
  if(m!=='A'){assert.equal(await page.locator('[data-key="restaurant"] .bottle').count(),2);assert.equal(await page.locator('[data-card="1"] .bottle').count(),3);}else assert.equal(await page.locator('.bottle').count(),0);
  if(m==='C')assert.ok((await diag()).motions>0,'C delivery motion missing');else assert.equal((await diag()).motions,0);
  await shot(m+'-delivered');
  // One shop only, no side effect on other shop or hand. Capture stable node identities.
  await page.evaluate(()=>{window.quietShop=document.querySelector('[data-key="liquor"]');window.handNode=document.querySelector('[data-card="1"]');window.handChild=window.handNode.firstElementChild;});
  await page.locator('#main-step').focus();await page.keyboard.press('Enter');s=await snap();assert.equal(s.shops.restaurant.stock,1);assert.equal(s.shops.liquor.stock,0);assert.equal(s.lots[0].stock,4);
  assert.ok(await page.locator('#main-step').evaluate(e=>e===document.activeElement));
  assert.ok(await page.evaluate(()=>quietShop===document.querySelector('[data-key="liquor"]')&&handChild===handNode.firstElementChild),'unaffected region rebuilt');
  await page.locator('#main-step').click();s=await snap();const o=s.orders.find(o=>o.shopId==='restaurant'&&o.status==='open');assert.equal(o.count,3);assert.equal(o.reason.sourceDeliveryId,1);assert.equal(s.shops.restaurant.stock,0);
  const motions=(await diag()).motions;await page.locator('[data-card="2"]').click();await page.evaluate(()=>window.handLab.redraw());assert.equal((await diag()).motions,motions,'selection/redraw repeated event');
  await page.waitForTimeout(450);assert.equal((await diag()).activeMotion,0);assert.equal(await page.locator('.transfer').count(),0);await shot(m+'-reorder');
  const after=await snap();if(baseline)assert.deepEqual(after,baseline,'A/B/C state mismatch');else baseline=after;
  const quietBefore=await diag();await page.waitForTimeout(450);assert.deepEqual(await diag(),quietBefore,'paused recurring work');
  const writes=Object.fromEntries(Object.entries(quietBefore.writes).map(([k,v])=>[k,v-(metricStart.writes[k]??0)]).filter(([,v])=>v));
  comparisons.push({mode:m,renders:quietBefore.renders-metricStart.renders,writes,motions:quietBefore.motions-metricStart.motions,cancelled:quietBefore.cancelled-metricStart.cancelled,pausedRenders:0,pausedWrites:0,activeMotion:quietBefore.activeMotion,clockPending:quietBefore.clockPending});
 }
 // Different usage periods; quiet restaurant must not be rendered or animated.
 await reset();await mode('C');await send(1,2);await send(2,3);await page.waitForTimeout(400);let d=await diag();await page.locator('#main-step').click();let now=await diag();assert.equal(now.writes['shop:restaurant'],d.writes['shop:restaurant']);assert.equal(now.writes['shop:liquor'],d.writes['shop:liquor']+1);assert.equal(now.motions,d.motions+1);assert.equal((await snap()).shops.restaurant.stock,2);await shot('different-periods');
 // Runtime reduced-motion keeps objects/state, suppresses and cancels movement.
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches&&window.handLab.diagnostics().activeMotion===0,{},{timeout:250});assert.equal((await diag()).activeMotion,0);d=await diag();await page.locator('#main-step').click();assert.equal((await diag()).motions,d.motions);assert.equal(await page.locator('[data-key="restaurant"] .bottle').count(),1);await shot('reduced');await page.emulateMedia({reducedMotion:'no-preference'});
 // UI export and replay preserve exact v04 game log, with no motion on replay.
 const before=await snap();await page.locator('#records').evaluate(e=>e.open=true);const dl=page.waitForEvent('download');await page.locator('#export').click();const file=path.join(dir,'ui-log.json');await(await dl).saveAs(file);d=await diag();await page.locator('#import').setInputFiles(file);await page.waitForFunction(()=>document.getElementById('result').textContent.includes('再現しました'));assert.deepEqual(await snap(),before);assert.equal((await diag()).motions,d.motions);assert.equal((await diag()).activeMotion,0);
 // Scarce actual1, soldout history and rebrew/native preparation/bottle entrance.
 await reset('scarce');await mode('C');await send(1,1);assert.equal((await snap()).shops.restaurant.stock,1);assert.equal(await page.locator('[data-card="1"]').count(),0);await page.locator('#archive').check();await page.locator('[data-card="1"]').click();await page.locator('#detail').click();await page.locator('[data-rebrew="1"]').click();assert.equal((await snap()).jobs[1].stage,'preparing');await page.locator('#main-step').click();assert.equal((await snap()).jobs[1].stage,'aging');await page.locator('#production').click();assert.equal(await page.locator('progress').count(),0);assert.equal((await snap()).jobs[0].ageMonths,24);await page.locator('[data-bottle="1"]').click();assert.equal((await snap()).lots[3].stock,6);
 // Actual timer (one3sclock); pause/hidden stop without catch-up or stale effects.
 await page.locator('#main-play').click();assert.ok((await diag()).clockPending);await page.waitForTimeout(3100);await page.locator('#main-play').click();assert.ok(!(await diag()).clockPending);const stopped=await snap();d=await diag();await page.waitForTimeout(3100);assert.deepEqual(await snap(),stopped);assert.deepEqual(await diag(),d);
 await page.locator('#main-play').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.ok(!(await diag()).clockPending);assert.equal((await diag()).activeMotion,0);d=await diag();await page.waitForTimeout(3100);assert.deepEqual(await diag(),d);assert.deepEqual(await snap(),stopped);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 // Offscreen delivery does not start deferred historical motion on returning.
 await reset();await mode('C');await page.evaluate(()=>{document.getElementById('orders').style.marginTop='1000px';});await page.locator('[data-order="1"]').click();await page.locator('[data-card="1"]').click();await page.locator('#deliver').click();await page.waitForTimeout(400);assert.equal((await diag()).activeMotion,0);const prior=(await diag()).motions;await page.evaluate(()=>{document.getElementById('orders').style.marginTop='';scrollTo(0,0);window.handLab.redraw();});assert.equal((await diag()).motions,prior);
 await page.setViewportSize({width:768,height:900});assert.ok(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({ok:true,widths:[360,375,390,768],comparisons,errors,notes:'Actual Chromium; synthetic visibility event; no physicalpower/heat or comprehensiveE2E.'},null,2)+'\n');console.log(JSON.stringify({ok:true,comparisons,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
