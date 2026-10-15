// Run with a repository-root HTTP server on port 8000; optional COIN_BASE_URL.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
for(const [width,height] of [[390,844],[820,1180],[844,390],[1280,900]]){
const ctx=await b.newContext({viewport:{width,height},hasTouch:true});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto((process.env.COIN_BASE_URL || 'http://127.0.0.1:8000')+'/works/mawarikiru-coin/');await p.clock.install();
assert.equal(await p.locator('canvas').getAttribute('data-motion'),'rest');
const x=width/2,y=height*.53;await p.mouse.move(x+20,y);await p.mouse.down();await p.mouse.move(x+65,y-5,{steps:4});await p.mouse.up();await p.clock.runFor(500);
assert.equal(await p.locator('canvas').getAttribute('data-motion'),'spinning');await p.screenshot({path:`/tmp/coin-${width}-spin.png`});
await p.clock.runFor(7000);await p.screenshot({path:`/tmp/coin-${width}-tail.png`});await p.clock.runFor(3000);assert.equal(await p.locator('canvas').getAttribute('data-motion'),'rest');await p.screenshot({path:`/tmp/coin-${width}-rest.png`});
const cdp=await ctx.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+18,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+65,y:y-8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.clock.runFor(100);assert.equal(await p.locator('canvas').getAttribute('data-motion'),'spinning');
await p.clock.runFor(10000);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+50,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await p.clock.runFor(100);assert.equal(await p.locator('canvas').getAttribute('data-motion'),'rest');
await p.mouse.move(x,y);await p.mouse.down();await p.setViewportSize({width:height,height:width});await p.mouse.up();await p.clock.runFor(100);assert.equal(await p.locator('canvas').getAttribute('data-motion'),'rest');
await p.locator('canvas').focus();await p.keyboard.press('Enter');await p.clock.runFor(100);assert.equal(await p.locator('canvas').getAttribute('data-motion'),'spinning');await p.clock.runFor(60000);assert.equal(await p.locator('canvas').getAttribute('data-motion'),'rest');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await p.locator('.back').click();await p.locator('a[href="../works/mawarikiru-coin/"]').click();assert.ok(p.url().endsWith('/works/mawarikiru-coin/'));assert.deepEqual(errors,[]);console.log('PASS mouse/touch/cancel/restart/resize/long time/LAB',width,height);await ctx.close();}
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
