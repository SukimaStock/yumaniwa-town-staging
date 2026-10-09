// Optional executable browser drill. Start repository static server first:
// python3 -m http.server 8765 --bind 127.0.0.1
// LAB_URL=http://127.0.0.1:8765/works/pumpkin-rutabaga-lab/ node works/pumpkin-rutabaga-lab/tests/browser-smoke.cjs
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1180,height:820},{width:390,height:844},{width:844,height:390}]){
   const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto((process.env.LAB_URL||'http://127.0.0.1:8765/works/pumpkin-rutabaga-lab/')+'?dev=1');
   await page.waitForFunction(()=>window.FruitLabProbe?.().time>.1);
   await page.locator('[data-mode="handoff"]').click();
   // Bound keyboard tests real handlers independently of physical key availability on tablets.
   await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>FruitLabProbe().handoffs===1);await page.keyboard.up('ArrowRight');
   assert.equal(await page.evaluate(()=>FruitLabProbe().active),'rutabaga');
   await page.locator('#tune').click();await page.locator('#pumpkin-mass').fill('4');assert.equal(await page.evaluate(()=>FruitLabProbe().settings.pumpkin.mass),4);
   await page.locator('#close-tune').click();await page.locator('[data-mode="pumpkin"]').click();
   const point=await page.evaluate(()=>{const v=SSE.viewport;return{x:v.offsetX+v.scale*750,y:innerHeight-(v.offsetY+v.scale*400)}});
   await page.mouse.move(point.x,point.y);await page.mouse.down();await page.waitForFunction(()=>FruitLabProbe().pumpkin.x>15);await page.mouse.up();
   await page.locator('#reset').click();assert.equal(await page.evaluate(()=>FruitLabProbe().pumpkin.x),0);
   await page.locator('[data-mode="world"]').click();
   await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>FruitLabProbe().phase==='underground');
   for(let i=0;i<18 && await page.evaluate(()=>FruitLabProbe().handoffs<2);i++){await page.keyboard.up('ArrowRight');await page.waitForTimeout(60);await page.keyboard.down('ArrowRight');await page.waitForTimeout(420);}
   await page.keyboard.up('ArrowRight');assert.equal(await page.evaluate(()=>FruitLabProbe().handoffs),2);
   await page.locator('#reset').click();assert.equal(await page.evaluate(()=>FruitLabProbe().phase),'surface');
   for(const [id,count]of [['world2',2],['world4',4]]){
    await page.locator('#world-course').selectOption(id);
    assert.equal(await page.evaluate(()=>FruitLabProbe().course),id);
    await page.keyboard.down('ArrowRight');
    for(let i=0;i<65&&!await page.evaluate(()=>FruitLabProbe().finished);i++){
     if(await page.evaluate(()=>FruitLabProbe().active==='rutabaga')){await page.keyboard.up('ArrowRight');await page.waitForTimeout(50);await page.keyboard.down('ArrowRight');}
     await page.waitForTimeout(400);
    }
    await page.keyboard.up('ArrowRight');assert.equal(await page.evaluate(()=>FruitLabProbe().handoffs),count);
    assert.equal(await page.evaluate(()=>FruitLabProbe().finished),true);
    const metrics=await page.evaluate(()=>FruitLabMeasurements());assert.equal(metrics.current.complete,true);assert.equal(metrics.current.sections.length,count+1);
    await page.locator('#reset').click();assert.equal(await page.evaluate(()=>FruitLabProbe().course),id);assert.equal(await page.evaluate(()=>FruitLabProbe().handoffs),0);
   }
   assert.deepEqual(errors,[]);console.log('PASS browser',viewport);await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
