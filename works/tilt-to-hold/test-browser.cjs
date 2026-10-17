// Run with Playwright available; optional URL argument permits staging verification.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 const page = await context.newPage(); page.setDefaultTimeout(10000); const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const url=process.argv[2] || 'http://127.0.0.1:8765/works/tilt-to-hold/';
 await page.goto(url);const h=page.locator('#handle');
 const y=()=>page.locator('#ring').getAttribute('transform').then(v=>Number(v.match(/164 ([\d.]+)/)[1]));
 const pos=async()=>{let b=await h.boundingBox();return{x:b.x+b.width/2,y:b.y+b.height/2}};
 const angle=()=>h.getAttribute('aria-valuenow').then(Number);
 const start=await y();await page.waitForTimeout(150);assert.equal(await y(),start);
 let p=await pos(); await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x,p.y-36);await page.mouse.up();
 await page.waitForTimeout(500);assert.ok(await y()>start+5,'mouse slides');
 p=await pos();await page.mouse.move(p.x,p.y);await page.mouse.down();const before=await angle();assert.equal(await angle(),before);await page.mouse.move(p.x,p.y+32);await page.mouse.up();
 const stopped=await y();await page.waitForTimeout(250);assert.equal(await y(),stopped,'holds after release');
 for(let i=0;i<4;i++){await h.focus();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(120);for(let k=0;k<8;k++)await page.keyboard.press('ArrowDown');assert.equal(await page.locator('#state').textContent(),'とまる');}
 await page.locator('#reset').click();assert.equal(await y(),85);
 const cdp=await context.newCDPSession(page);p=await pos();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y-36}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);assert.ok(await y()>85,'touch slides');
 p=await pos();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});const cancelled=await y();await page.waitForTimeout(150);assert.equal(await y(),cancelled,'cancel holds');
 p=await pos();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x,0);assert.equal(await angle(),-18);await page.mouse.move(p.x,840);assert.equal(await angle(),18);await page.mouse.up();
 await h.focus();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(7000);assert.equal(await y(),488,'bottom clamped');
 await page.locator('#reset').click();assert.equal(await y(),85);
 await h.focus();await page.keyboard.press('ArrowLeft');await page.setViewportSize({width:844,height:390});let resized=await y();await page.waitForTimeout(150);assert.equal(await y(),resized);assert.equal(await page.locator('#state').textContent(),'とまる');
 p=await pos();assert.ok(p.x>32&&p.x<812&&p.y>32&&p.y<390);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/tilt-mobile.png',fullPage:true});
 await page.getByRole('link',{name:'LABへ'}).click();await page.locator('[data-room-link="bench"]').click();await page.locator('a[href="../works/tilt-to-hold/"]').first().click();await page.waitForURL('**/works/tilt-to-hold/');
 assert.equal(await y(),85);assert.deepEqual(errors,[]);console.log('PASS mouse/touch, stop/slide, regrab, repeat, endpoints, cancel, resize, LAB roundtrip; no page errors');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
