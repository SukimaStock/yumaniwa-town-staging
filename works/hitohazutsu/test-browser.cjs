// Local Chromium interaction regression; this is not physical-device evidence.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 const page = await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(process.argv[2] || 'http://127.0.0.1:8765/works/hitohazutsu/');
 const h=page.locator('#handle');
 const y=()=>page.locator('#slider').getAttribute('transform').then(v=>Number(v.match(/180 ([\d.]+)/)[1]));
 const pos=async()=>{const b=await h.boundingBox();assert.ok(b.width>=64&&b.height>=64);return{x:b.x+b.width/2,y:b.y+b.height/2}};
 const scale=()=>page.locator('svg').evaluate(el=>el.getScreenCTM().a);
 async function grab(){const p=await pos();await page.mouse.move(p.x,p.y);await page.mouse.down();return p;}
 async function holds(){const held=await y();await page.waitForTimeout(900);assert.equal(await y(),held);assert.equal(await page.locator('#pull').getAttribute('transform'),'rotate(0)');}
 const initial=await y();let p=await grab();assert.equal(await y(),initial);assert.equal(await page.locator('#pull').getAttribute('transform'),'rotate(-5)');
 const s=await scale();let previous=initial;
 for(let i=1;i<=30;i++){await page.mouse.move(p.x,p.y-i*s);const current=await y();assert.ok(current<previous,'slow monotonic tooth movement');previous=current;}
 await page.mouse.move(p.x,p.y-10*s);assert.ok(await y()>previous,'reverse without release');await page.mouse.up();await holds();
 p=await grab();await page.mouse.move(p.x,-200);assert.equal(await y(),82);await page.mouse.move(p.x,1100);assert.equal(await y(),482);await page.mouse.up();await holds();
 // Endpoint immediately reverses: no accumulated drag debt.
 p=await grab();await page.mouse.move(p.x,p.y-2*s);assert.ok(await y()<482);await page.mouse.up();
 for(let i=0;i<12;i++){p=await grab();await page.mouse.move(p.x,p.y+(i%2?-90:90));await page.mouse.up();}await holds();
 await h.focus();await page.keyboard.press('End');assert.equal(await y(),82);await page.screenshot({path:'/tmp/hitohazutsu-closed.png'});
 await page.keyboard.press('Home');assert.equal(await y(),482);await page.screenshot({path:'/tmp/hitohazutsu-open.png'});
 await page.keyboard.press('ArrowUp');assert.equal(await y(),472);
 await page.keyboard.press('PageUp');assert.equal(await y(),422);
 const cdp=await context.newCDPSession(page);const touch=async args=>{await cdp.send('Input.dispatchTouchEvent',args);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};p=await pos();
 await touch({type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});
 await touch({type:'touchMove',touchPoints:[{x:p.x,y:p.y-120}]});assert.ok(await y()<422);
 await touch({type:'touchEnd',touchPoints:[]});await holds();
 p=await pos();await touch({type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});
 await touch({type:'touchMove',touchPoints:[{x:p.x,y:p.y+30}]});
 await touch({type:'touchCancel',touchPoints:[]});assert.equal(await h.getAttribute('data-held'),null);await holds();
 // Full touch travel and reversal, followed by lost capture.
 p=await pos();await touch({type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});
 await touch({type:'touchMove',touchPoints:[{x:p.x,y:5}]});assert.equal(await y(),82);
 await touch({type:'touchMove',touchPoints:[{x:p.x,y:830}]});assert.equal(await y(),482);
 await touch({type:'touchMove',touchPoints:[{x:p.x,y:800}]});assert.ok(await y()<482);
 await touch({type:'touchEnd',touchPoints:[]});await holds();
 p=await grab();await h.evaluate(el=>el.releasePointerCapture(1));await page.mouse.move(p.x,p.y-2);assert.equal(await h.getAttribute('data-held'),null);await page.mouse.up();await holds();
 p=await grab();await h.dispatchEvent('pointercancel',{pointerId:1});assert.equal(await h.getAttribute('data-held'),null);await page.mouse.up();await holds();
 p=await grab();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await h.getAttribute('data-held'),null);await page.mouse.up();await holds();
 p=await grab();await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>!document.querySelector('#handle').hasAttribute('data-held'));assert.equal(await h.getAttribute('data-held'),null);await page.mouse.up();await holds();p=await pos();assert.ok(p.y>0&&p.y<390);await page.screenshot({path:'/tmp/hitohazutsu-landscape.png'});
 for(const viewport of [{width:768,height:1024},{width:1366,height:768},{width:320,height:568}]){await page.setViewportSize(viewport);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));p=await grab();await page.mouse.move(p.x,p.y-20);await page.mouse.up();assert.ok((await pos()).y<viewport.height);}
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});p=await grab();await page.mouse.move(p.x,p.y-20);await page.mouse.up();await holds();
 await page.screenshot({path:'/tmp/hitohazutsu-mobile.png'});
 await page.getByRole('link',{name:'LABへ'}).click();await page.locator('[data-room-link="bench"]').click();await page.locator('a[href="../works/hitohazutsu/"]').click();await page.waitForURL('**/works/hitohazutsu/');
 assert.equal(await y(),312);assert.deepEqual(errors,[]);
 console.log('PASS: mouse, CDP touch, slow teeth, fast endpoints, reverse, hold, contact response, outside release, repeats, cancel, blur, resize, keyboard, reduced motion, LAB roundtrip. No page errors.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
