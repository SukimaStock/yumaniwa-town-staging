'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.SUCTION_BASE||'http://127.0.0.1:8765';
  await page.goto(base+'/works/suction-peel/');
  const handle=page.locator('#handle');
  const state=()=>handle.getAttribute('data-state');
  const drag=()=>handle.getAttribute('data-dragging');
  const settle=()=>page.waitForTimeout(450);
  const point=()=>handle.evaluate(e=>{const p=new DOMPoint(0,0).matrixTransform(e.getScreenCTM());return{x:p.x,y:p.y,scale:document.querySelector('#scene').getScreenCTM().a};});
  const down=async()=>{const p=await point();await page.mouse.move(p.x,p.y);await page.mouse.down();return p;};
  const move=async(p,x,y)=>{await page.mouse.move(p.x+x*p.scale,p.y+y*p.scale,{steps:10});await settle();};
  const original=await page.locator('#rim').getAttribute('d');
  let p=await down();await move(p,30,40);assert.equal(await state(),'attached');assert.notEqual(await page.locator('#rim').getAttribute('d'),original);
  await page.screenshot({path:'/tmp/suction-peel-peeling.png'});
  await move(p,0,0);await page.mouse.up();await settle();assert.equal(await state(),'attached');assert.equal(await page.locator('#rim').getAttribute('d'),original);
  // Ten full peel/return cycles, including a release and a fresh grasp while detached.
  for(let i=0;i<10;i++){
   p=await down();await move(p,75,100);assert.equal(await state(),'detached');await page.mouse.up();await settle();assert.equal(await state(),'detached');assert.equal(await drag(),'false');
   if(i===0)await page.screenshot({path:'/tmp/suction-peel-detached.png'});
   p=await down();await move(p,-75,-100);await page.mouse.up();await settle();assert.equal(await state(),'attached');
  }
  // Real Chromium touch input, cancellation before and after separation.
  const cdp=await page.context().newCDPSession(page);
  const touch=async(type,p,x=0,y=0)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x:p.x+x*p.scale,y:p.y+y*p.scale,id:1}]});
  p=await point();await touch('touchStart',p);await touch('touchMove',p,25,35);await settle();await touch('touchCancel',p);await settle();assert.equal(await drag(),'false');assert.equal(await state(),'attached');
  p=await point();await touch('touchStart',p);await touch('touchMove',p,75,100);await settle();assert.equal(await state(),'detached');await touch('touchCancel',p);await page.waitForFunction(()=>document.querySelector('#handle').dataset.dragging==='false');assert.equal(await drag(),'false');assert.equal(await state(),'detached');
  await handle.focus();await page.keyboard.press('Home');await settle();
  for(let i=0;i<7;i++)await page.keyboard.press('ArrowRight');await settle();assert.equal(await state(),'detached');
  for(let i=0;i<7;i++)await page.keyboard.press('ArrowLeft');await settle();assert.equal(await state(),'attached');
  p=await down();await move(p,30,30);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();await settle();assert.equal(await drag(),'false');assert.equal(await state(),'attached');
  p=await down();await page.mouse.move(-100,-100);await page.mouse.up();await settle();assert.equal(await drag(),'false');
  await page.keyboard.press('Home');await settle();
  p=await down();await page.setViewportSize({width:844,height:390});await page.mouse.up();await settle();assert.equal(await drag(),'false');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [width,height]of [[390,844],[820,1180],[1100,760],[844,390],[568,320]]){
   await page.setViewportSize({width,height});await settle();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const b=await handle.boundingBox();assert.ok(b.width>=44&&b.height>=44,JSON.stringify(b));
   assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=width&&b.y+b.height<=height);
   await page.screenshot({path:`/tmp/suction-peel-${width}.png`});
  }
  await page.reload();assert.equal(await state(),'attached');
  await page.goto(base+'/lab/#room-bench');const link=page.locator('a[href="../works/suction-peel/"]');assert.equal(await link.count(),1);await link.click();await page.waitForURL('**/works/suction-peel/');assert.equal(await state(),'attached');await page.goBack();assert.ok(page.url().endsWith('/lab/#room-bench'));
  assert.deepEqual(errors,[]);
  console.log('PASS: deformation, reversal, 10 detach/regrasp/reattach cycles, CDP touch/cancel both states, keyboard, blur, outside release, resize, reload, reduced-motion, 5 layouts/44px/no overflow, LAB/back, no page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
