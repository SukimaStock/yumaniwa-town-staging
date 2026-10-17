// Repository HTTP server at :8000; system Chromium. No network services required.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
for(const [width,height] of [[390,844],[820,1180],[844,390],[1280,900],[320,568]]) {
 const context=await b.newContext({viewport:{width,height},hasTouch:true});const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:8000/works/shizumete-ukasu/');await page.clock.install({time:new Date('2026-10-16T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-16T00:00:01Z'));
 const canvas=page.locator('canvas'),scale=Math.min(width/390,height/650,1.35),x=width/2,surface=height*.43;
 const state=()=>canvas.getAttribute('data-motion'), y=async()=>Number(await canvas.getAttribute('data-y'));
 assert.equal(await state(),'rest');console.log('START',width,height);
 // Start off-center: capture must preserve the exact position, even after regrab.
 await page.mouse.move(x+8*scale,surface+7*scale);await page.mouse.down();await page.clock.runFor(16);assert.equal(await y(),0);
 await page.mouse.move(x,surface+37*scale);await page.clock.runFor(16);assert.ok(Math.abs(await y()-30)<.01);await page.mouse.up();
 await page.clock.runFor(650);const shallow=await y();assert.ok(shallow<0);await page.clock.runFor(15000);assert.equal(await state(),'rest');
 const cdp=await context.newCDPSession(page);
 const touch=async(type,yy)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:yy===undefined?[]:[{x,y:yy}]});
 await touch('touchStart',surface);await touch('touchMove',surface+180*scale);await page.clock.runFor(16);assert.equal(await y(),180);
 await touch('touchEnd');await page.clock.runFor(650);const deep=await y();assert.ok(deep<shallow*4);

 await touch('touchStart',surface+deep*scale);await page.clock.runFor(16);assert.equal(await y(),deep);assert.equal(await state(),'held');
 await touch('touchMove',surface+70*scale);await page.clock.runFor(16);await touch('touchCancel');await page.clock.runFor(15000);assert.equal(await state(),'rest');
 console.log('PASS depth/regrab/cancel',width);
 for(let i=0;i<20;i++) {await page.mouse.move(x,surface);await page.mouse.down();await page.mouse.move(x,surface+(20+i*7)*scale);await page.mouse.up();await page.clock.runFor(15000);assert.equal(await state(),'rest');}
 await page.mouse.move(x,surface);await page.mouse.down();await page.mouse.move(x,surface+120*scale);await page.clock.runFor(16);
 await page.setViewportSize({width:height,height:width});await page.mouse.up();await page.clock.runFor(15000);assert.equal(await state(),'rest');
 await canvas.focus();await page.keyboard.down('ArrowDown');await page.clock.runFor(1500);assert.ok(await y()>100);await page.keyboard.up('ArrowDown');await page.clock.runFor(60000);assert.equal(await state(),'rest');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);

 await page.locator('.back').click();await page.locator('a[href="../works/shizumete-ukasu/"]').click();assert.ok(page.url().endsWith('/works/shizumete-ukasu/'));
 console.log('PASS mouse/touch shallow/deep release/regrab/cancel/20 repeats/resize/keyboard/60s/LAB',width,height);await context.close();
}
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
