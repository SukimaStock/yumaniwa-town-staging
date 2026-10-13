// Browser regression: node tests/collection-scheduling.cjs <base URL> <count> <output JSON>
// Uses real clicks/keyboard while deliberately expensive previews are still pending.
const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
const [url,countArg,out]=process.argv.slice(2),count=Number(countArg);
if(!url||!Number.isInteger(count)||!out)throw Error('URL, expected count, output JSON required');
const result={url,count,samples:[]};
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const mobile of [false,true])for(const broken of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:900,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  // Routing is solely a deterministic responsiveness regression, not a cache/performance benchmark.
  await page.route('**/preview.js?*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace(/export function (previewSvg|previewRaster)\(([^)]*)\)\s*\{/g,match=>`${match}const regressionStart=performance.now();while(performance.now()-regressionStart<18){}`);await route.fulfill({response,body});});
  if(broken)await page.route('**/objects/stone.json?*',route=>route.fulfill({status:503,body:'deliberate test failure'}));
  await page.goto(url,{waitUntil:'commit'});
  await page.waitForSelector('.specimen-card:enabled');
  const early=await page.locator('.specimen-card').count();assert.ok(early<count,'first cards must be available before completion');
  const first=page.locator('.specimen-card:enabled').first();if(mobile)await first.tap();else await first.click();
  await page.waitForFunction(()=>window.touchLab?.renderer);
  const atSelect=await page.locator('.specimen-card').count();assert.ok(atSelect<count,'actual selection occurs before all previews finish');
  const before=await page.evaluate(()=>Array.from(touchLab.body.pose()));
  await page.locator('#solid').press('ArrowRight');
  const after=await page.evaluate(()=>Array.from(touchLab.body.pose()));assert.notDeepEqual(after,before,'input remains usable during loading');
  await page.locator('#next').click();await page.locator('#previous').click();await page.locator('#back').click();
  await page.waitForFunction(n=>document.querySelectorAll('.specimen-card').length===n,count,{timeout:60000});
  await page.waitForFunction(b=>b?document.querySelector('#collection-status').textContent.includes('一部'):document.querySelector('#collection-status').hidden,broken);
  const final=await page.evaluate(()=>({cards:[...document.querySelectorAll('.specimen-card')].map(c=>({number:c.querySelector('.card-number').textContent,disabled:c.disabled,preview:!!c.querySelector('svg,canvas')})),canvas:[...document.querySelectorAll('.thumbnail canvas')].every(c=>c.width===200&&c.height===200)}));
  assert.equal(final.cards.filter(c=>c.disabled).length,broken?1:0);assert.ok(final.cards.every(c=>c.disabled||c.preview));assert.ok(final.canvas);assert.deepEqual(final.cards.map(c=>c.number),Array.from({length:count},(_,i)=>String(i<16?i:i+1).padStart(2,'0')));assert.equal(errors.length,0);
  result.samples.push({mobile,broken,early,atSelect,complete:final.cards.length,pass:true});await context.close();
 }
 result.complete=true;
}finally{fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
