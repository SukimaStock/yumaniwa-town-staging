const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.DROP_URL||'http://127.0.0.1:8765/works/one-drop/');
 const bulb=page.locator('#bulb');
 const drops=async()=>Number(await bulb.getAttribute('data-drops'));
 const target=async()=>Number(await bulb.getAttribute('aria-valuenow'));
 const zero=()=>page.waitForFunction(()=>document.querySelector('#bulb').getAttribute('aria-valuenow')==='0');
 const pt=()=>page.evaluate(()=>{const m=document.querySelector('#scene').getScreenCTM();const p=new DOMPoint(180,128).matrixTransform(m);return{x:p.x,y:p.y,scale:m.a};});
 let p=await pt();
 const start=async()=>{await page.mouse.move(p.x,p.y);await page.mouse.down();};
 const move=async(n)=>page.mouse.move(p.x,p.y+78*p.scale*n);
 await start();await move(.75);await page.waitForTimeout(250);assert.ok(await target()>=74);assert.equal(await drops(),0);
 await move(.2);await page.waitForTimeout(250);assert.ok(await target()<=21);assert.equal(await drops(),0);await page.mouse.up();
 await start();await move(1);await page.waitForFunction(()=>+document.querySelector('#bulb').dataset.drops===1);
 await page.waitForTimeout(700);assert.equal(await drops(),1);await page.mouse.up();await page.waitForTimeout(250);
 for(let i=2;i<=10;i++){await start();await move(1);await page.waitForFunction(n=>+document.querySelector('#bulb').dataset.drops===n,i);await page.mouse.up();await page.waitForTimeout(550);}
 // Regrasp during return, outside release, blur, and capture loss all reset.
 await start();await move(.4);await page.mouse.up();await start();await move(.2);await page.mouse.move(-20,-20);await page.mouse.up();await zero();assert.equal(await target(),0);
 await start();await move(.4);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await zero();assert.equal(await target(),0);await page.mouse.up();
 console.log('mouse checks passed');
 const cdp=await page.context().newCDPSession(page);
 const touch=async(type,n=0)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchCancel','touchEnd'].includes(type)?[]:[{x:p.x,y:p.y+78*p.scale*n,id:1}]});
 await touch('touchStart');await touch('touchMove',.6);await page.waitForFunction(()=>+document.querySelector('#bulb').getAttribute('aria-valuenow')>=59);assert.ok(await target()>=59);await touch('touchCancel');await zero();assert.equal(await target(),0);
 await touch('touchStart');await touch('touchMove',1);await page.waitForFunction(()=>+document.querySelector('#bulb').dataset.drops===11);await touch('touchEnd');await zero();assert.equal(await target(),0);
 await page.waitForTimeout(250);console.log('touch checks passed');
 await bulb.focus();await page.keyboard.press('End');await page.waitForTimeout(650);assert.equal(await drops(),12);await page.keyboard.press('Home');await page.waitForTimeout(250);
 await page.keyboard.press('ArrowDown');await page.waitForFunction(()=>document.querySelector('#bulb').getAttribute('aria-valuenow')==='8');assert.equal(await target(),8);await page.keyboard.press('ArrowUp');await zero();assert.equal(await target(),0);
 await page.keyboard.down('Space');await page.waitForTimeout(650);assert.equal(await drops(),13);await page.keyboard.up('Space');await zero();assert.equal(await target(),0);
 console.log('keyboard checks passed');
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of [[360,640],[375,667],[390,844],[1100,760],[844,390]]){
  await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const b=await bulb.boundingBox();assert.ok(b.width>=44&&b.height>=44&&b.y>=0&&b.y+b.height<=height,JSON.stringify(b));
  await page.screenshot({path:`/tmp/one-drop-${width}.png`});
 }
 await page.reload();assert.equal(await drops(),0);
 await page.goto(new URL('../../lab/',page.url()).href);assert.equal(await page.locator('a[href="../works/one-drop/"]').count(),1);await page.locator('[data-room-link="bench"]').click();await page.locator('a[href="../works/one-drop/"]').click();await page.waitForURL('**/works/one-drop/');await page.goBack();await page.waitForURL('**/lab/#room-bench');
 assert.deepEqual(errors,[]);
 console.log('PASS: partial/reverse, ten drops, hold latch, regrasp, outside release, blur, CDP touch/cancel/end, keyboard, five layouts >=44px/no overflow, reload, reduced-motion, LAB entry/back, no page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
