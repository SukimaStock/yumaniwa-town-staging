// Optional real-browser checks; skipped explicitly when no browser is supplied.
// Run a static server at repository root and set AMBER_H4_URL if not port 8765.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const enabled=!!process.env.AMBER_BROWSER_MODULE;
test('H4 proposal phone layouts, unchanged captions, navigation and reduced motion',{skip:!enabled,timeout:120000},async()=>{
 const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);
 const browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});
 const url=process.env.AMBER_H4_URL??'http://127.0.0.1:8765/works/ambertime/recall-canvas-lab/';
 const screenshots=process.env.AMBER_H4_SCREENSHOTS;
 if(screenshots)await mkdir(screenshots,{recursive:true});
 try{
  for(const [width,height] of [[320,568],[360,568],[375,620],[390,680],[430,740]])for(const motion of ['reduce','no-preference']){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:motion});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);await page.evaluate(()=>document.fonts.ready);
   await page.locator('#width').selectOption(String(width));
   await page.locator('#proposed').tap();
   for(let i=0;i<4;i++){
    const bounds=await page.locator('#player').evaluate(d=>{const r=d.getBoundingClientRect(),p=d.querySelector('#sentence');return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,h:d.clientHeight,scroll:d.scrollHeight,text:p.textContent,ph:p.clientHeight,ps:p.scrollHeight};});
    assert(bounds.top>=0&&bounds.bottom<=height&&bounds.left>=0&&bounds.right<=width,JSON.stringify(bounds));
    assert(bounds.scroll<=bounds.h+1,'dialog scroll '+JSON.stringify(bounds));assert(bounds.ph>=bounds.ps,'caption clipped');assert(bounds.text.length>0);
    const box=await page.locator('#next').boundingBox();assert(box.height>=44&&box.width>=44);
    if(screenshots&&motion==='reduce'&&width===390)await page.screenshot({path:`${screenshots}/proposal-${i+1}-${width}.png`});
    if(i<3)await page.locator('#next').tap();
   }
   assert.equal(await page.locator('#next').innerText(),'閉じる');await page.locator('#next').tap();
   assert.equal(await page.locator('#player').evaluate(d=>d.open),false);
   assert.equal(await page.locator('#proposed').evaluate(b=>b===document.activeElement),true);
   await page.locator('#mode').selectOption('handover');await page.locator('#proposed').tap();
   await page.locator('#next').press('ArrowRight');await page.locator('#next').press('ArrowLeft');
   assert.equal(await page.locator('#counter').innerText(),'1 / 4');
   for(let i=0;i<3;i++)await page.locator('#next').tap();
   assert.equal(await page.locator('#next').innerText(),'次の代へ');await page.locator('#next').tap();
   assert.equal(await page.evaluate(()=>localStorage.length),0);assert.deepEqual(errors,[]);
   await context.close();
  }
 }finally{await browser.close();}
});
